# R4-1.6 — mission-control Workflow Engine + Approvals State Machine (Line-Level Deep Dive)

**Task:** R4-1.6 (Group 1, Round 4) · task_b137d44b2617 / ctx_f12fc1fdd5ad
**Scope:** `_sources/mission-control/mission-control` — workflow definitions, run lifecycle state machines (all run types), approval gates, scheduled fires, concurrency/auto-dispatch, loop/failure handling, executor functions, persistence.
**Rule honored:** READ-ONLY — no file outside `.Fabrica-atlas-board/` touched. All paths below are relative to `mission-control/` (i.e. `_sources/mission-control/mission-control/`).

---

## 1. Executive Summary

mission-control has **four distinct workflow/run engines** layered on top of a shared JSON-file data store:

1. **Agent task runs** (`scripts/daemon/run-task.ts`) — one Claude Code CLI session per task, with continuation chains and mission (project-run) chaining.
2. **Project runs / "missions"** (`missions.json`, driven by `run-task.ts` continuation + `dispatcher.pollProjectRuns()`) — DAG-style batch execution of a project's tasks with loop detection and stall handling.
3. **Inbox auto-respond chains** (`scripts/daemon/run-inbox-respond.ts` + `respond-runs.json`) — self-continuing agent sessions answering one inbox message.
4. **Field-Ops execution state machine** (`src/app/api/field-ops/execute/route.ts` + `src/lib/field-ops-security.ts`) — an 8-state approval-gated pipeline for real-world actions (posts, emails, payments, crypto transfers).

There is no generic "workflow definition" DSL; workflows are *implicit*: cron schedules in `daemon-config.json`, dependency edges via task `blockedBy`, approval gates via `decisions.json` (agent tasks) and a hard-coded transition table (field ops). The daemon process itself (`scripts/daemon/index.ts`) is a PID-file-managed Node background process that owns polling, scheduling, concurrency, and health reconciliation.

---

## 2. Component Map

| Component | File | Role |
|---|---|---|
| Daemon entry | `scripts/daemon/index.ts` | start/stop/status CLI, PID file, graceful shutdown |
| Config | `scripts/daemon/config.ts` | load/validate/persist `data/daemon-config.json` |
| Scheduler | `scripts/daemon/scheduler.ts` | node-cron jobs: poll loop + named schedules |
| Dispatcher | `scripts/daemon/dispatcher.ts` | poll→filter→spawn; retry queue; project-run safety net; field-ops auto-execute |
| Runner | `scripts/daemon/runner.ts` | spawn Claude Code binary, timeout/kill, output parsing |
| Health monitor | `scripts/daemon/health.ts` | session registry, stats, stale-PID cleanup, status persistence |
| Prompt builder | `scripts/daemon/prompt-builder.ts` | persona+task+SOP prompts; pending-task query; gates |
| Task executor | `scripts/daemon/run-task.ts` | standalone per-task runner with continuations & mission chaining |
| Inbox responder | `scripts/daemon/run-inbox-respond.ts` | standalone auto-respond chain runner |
| Respond-run store | `scripts/daemon/respond-runs.ts` | CRUD for `data/respond-runs.json` |
| Security helpers | `scripts/daemon/security.ts` | credential scrubbing, prompt fencing, binary whitelist, safe env |
| Field-Ops security | `src/lib/field-ops-security.ts` | risk model, transition table, rate limiters, circuit breaker |
| Field-Ops executor API | `src/app/api/field-ops/execute/route.ts` | full execution lifecycle for field tasks |
| Batch approvals API | `src/app/api/field-ops/batch/route.ts` | submit/approve/reject in bulk under owner auth |
| Run APIs | `src/app/api/tasks/[id]/run`, `/stop`, `src/app/api/runs`, `src/app/api/projects/[id]/run`, `/stop` | manual triggers, stop, liveness reconciliation |

---

## 3. Configuration = Workflow Definition

The entire workflow behavior is defined by `DaemonConfig` (`scripts/daemon/types.ts:9-40`):

- `polling.enabled` + `polling.intervalMinutes` (types.ts:10-13) — how often pending tasks are polled.
- `concurrency.maxParallelAgents` (types.ts:14-16) — global cap on simultaneous agent sessions.
- `schedule: Record<string, ScheduleEntry>` where each entry is `{ enabled, cron, command }` (types.ts:3-7, 17).
- `execution`: `maxTurns`, `timeoutMinutes`, `retries`, `retryDelayMinutes`, `skipPermissions`, `allowedTools`, `agentTeams`, `claudeBinaryPath`, `maxTaskContinuations` (types.ts:18-28).
- `inbox`: `maxContinuations`, `maxTurnsPerSession`, `timeoutPerSessionMinutes` (types.ts:29-33).
- `fieldOps?`: `autoExecute`, `pollIntervalMinutes`, `maxConcurrentExecutions`, `requireVaultSession` (types.ts:34-39).

Defaults (config.ts:11-41): poll every 5 min, max 3 parallel agents, four named schedules (`dailyPlan` cron `0 7 * * *`, `standup` `0 9 * * 1-5`, `brainDumpTriage` disabled `0 12 * * *`, `weeklyReview` `0 17 * * 5`), execution of 25 turns / 30-min timeout / 1 retry / 5-min retry delay / `skipPermissions:false` / `allowedTools:["Edit","Write"]` / `maxTaskContinuations:2`, inbox of 2 continuations × 25 turns × 15 min.

Config validation clamps every numeric field into a bounded range (config.ts:45-135): e.g. `maxParallelAgents` 1–10 (config.ts:65), `maxTurns` 1–100 (:86), `retries` 0–5 (:92), `retryDelayMinutes` 1–30 (:95), continuations 0–5 (:115, :123). Loading warns at `[SECURITY]` level if `skipPermissions` is enabled (config.ts:152-156); missing/corrupt config falls back to defaults (config.ts:159-163).

---

## 4. Run Lifecycle State Machines (per engine)

### 4a. Agent session status (in-daemon tracking)

`SessionStatus = "running" | "completed" | "failed" | "timeout"` (types.ts:44), carried by `AgentSession { id, agentId, taskId, command, pid, startedAt, status, retryCount }` (types.ts:46-55).

Transitions are computed in `HealthMonitor.endSession()` (health.ts:78-139): terminal status derives as `timedOut ? "timeout" : (exitCode === 0 ? "completed" : "failed")` (health.ts:99). The session moves from the active map to `history` (capped at `MAX_HISTORY=50`, health.ts:9, 113-116) and cost/token stats accumulate (health.ts:119-127).

### 4b. Active task-run status (`data/active-runs.json`)

`ActiveRunEntry.status: "running" | "completed" | "failed" | "timeout" | "stopped"` with fields `{ id, taskId, agentId, projectId, missionId, pid, startedAt, completedAt, exitCode, error, costUsd, numTurns, continuationIndex }` (run-task.ts:41-56).

Full lifecycle inside one `run-task.ts` process:

1. **Validation gate (pre-running):** task exists (run-task.ts:789-793); has non-human `assignedTo` (:796-799); not already done (:802-805); not already running in active-runs (:808-817, skipped for continuations); unblocked by dependencies (:820-826); no pending decision (:829-834). Any failure → `process.exit(1)` before any state is written.
2. **running:** a new entry with `status:"running"` and `pid:0` is pushed (non-continuation: run-task.ts:846-863; continuation gets id `<runId>_c<N>`: 864-884), then pruned+written (:885). The parent task's kanban is flipped to `in-progress` by the system, not the agent (:891-906).
3. **PID backfill:** `onSpawned` callback writes the real child PID into the run entry immediately after spawn (:940-950).
4. **Terminal classification:** after the Claude session exits, `meta.subtype` from parsed JSON output drives three-way logic (run-task.ts:962-1004):
   - `hitMaxTurns = subtype === "error_max_turns"`; `hitTimeout = result.timedOut || subtype === "error_timeout"` (:963-964).
   - If exhausted-but-continuable (`shouldContinue`, :965) → this session recorded `"completed"` with note "continuing" (:972-978).
   - Else if timed out → `"timeout"` (:979-983); exitCode 0 → `"completed"` (:984-986); otherwise `"failed"` with error extracted from stderr or JSON stdout (:987-1004).
5. **stopped** is only set externally by the stop API (see §10).

Pruning: finished entries older than 1 hour are dropped on every write (`pruneOldRuns`, run-task.ts:79-90).

### 4c. Project run ("mission") status

`ProjectRunStatus = "running" | "completed" | "stopped" | "stalled"` (types.ts:124). The `ProjectRun` record holds counters (`totalTasks/completedTasks/failedTasks/skippedTasks`), a `taskHistory[]` of `ProjectRunTaskEntry` (each with per-task `status:"completed"|"failed"|"timeout"|"stopped"` and `attempt` number, types.ts:126-135), and `LoopDetectionState { taskAttempts, taskErrors }` (types.ts:137-140, embedded at types.ts:155).

Creation: `POST /api/projects/[id]/run` rejects if a mission for the project is already `running` (projects/[id]/run/route.ts:83-93), selects eligible tasks (`kanban !== "done" && assignedTo && assignedTo !== "me" && !deletedAt`, :102-109), pre-filters dispatchable ones against blockedBy and pending decisions (:118-139), checks live PIDs rather than trusting status strings (:141-156), respects the concurrency limit when choosing the launch batch (:158-170), then writes the mission record (`status:"running"`, `missionId = mission_<ts>`, empty history + fresh loopDetection, projects/[id]/run/route.ts:172-190) before spawning detached `run-task.ts --source project-run --mission <id>` children (:192-221).

Progression happens in `handleProjectRunContinuation()` (run-task.ts:550-729), invoked after every task terminal state:
- Stalled missions are revived `stalled → running` when any task finishes (run-task.ts:566-569).
- Counters/history updated; failed results feed loop detection (:571-604).
- All-project-tasks-done → `status:"completed"` + inbox report (:627-635).
- Nothing running AND nothing dispatchable AND remaining deps resolvable → stay waiting for the reconciler (:706-711); otherwise → `status:"stalled"` with skipped count + stalled report (:712-727).
- `stopped` is set only by the project stop route (user action).

### 4d. Inbox respond-run status

`RespondRunStatus = "running" | "completed" | "failed" | "stopped"` with a `stopped: boolean` flag that acts as the cooperative kill signal ("stop signal — prevents next continuation", types.ts:184-202). Stored in `data/respond-runs.json` (respond-runs.ts:16-35). The chain checks `isRunStopped(runId)` before each session and marks the run `stopped` when flagged (run-inbox-respond.ts:528-546); the continuation condition additionally requires `!isRunStopped(runId)` (run-inbox-respond.ts:595). Cost/turns accumulate across sessions via `accumulateRunCost` (respond-runs.ts:93-120); pruning keeps finished runs 1 hour (respond-runs.ts:125-135). Trigger: `POST /api/inbox/respond` spawns the runner detached for a message addressed to an agent (inbox/respond/route.ts:61 refusal for humans, :76-104 spawn).

### 4e. Field-task approval state machine (the explicit FSM)

`FieldTaskStatus = "draft" | "pending-approval" | "approved" | "executing" | "awaiting-signature" | "completed" | "failed" | "rejected"` (src/lib/types.ts:420).

The canonical transition table (`VALID_TRANSITIONS`, src/lib/field-ops-security.ts:73-82):

```
draft               → pending-approval | approved   (approved direct only if no approval required)
pending-approval    → approved | rejected
approved            → executing | awaiting-signature
awaiting-signature  → completed | failed             (browser-wallet signing path)
executing           → completed | failed
completed           → (terminal)
failed              → draft                          (retry by resubmitting)
rejected            → draft                          (resubmit after feedback)
```

Enforced by `isValidTransition(from,to)` (field-ops-security.ts:85-90) with a human-readable `getTransitionError` including terminal-state messaging (:93-102). Every mutating API re-validates transitions — e.g. execute refuses anything not exactly `approved` (execute/route.ts:120-125) then double-checks `isValidTransition("approved","executing")` (:127-132); batch operations validate per-task inside the atomic mutation (batch/route.ts:66-72).

---

## 5. Approval Gates

### 5a. Risk-based approval requirement (field ops)

Approval is computed server-side at task creation, not trusted from the client: `requiresApproval(taskType, serviceRiskLevel, autonomyMode)` (field-ops-security.ts:46-68), applied as `serverApprovalRequired` and stamped onto the new task's `approvalRequired` flag (field-ops/tasks/route.ts:92-96 and :110). The risk model:

- Base risk per type (`TASK_TYPE_RISK`, field-ops-security.ts:22-31): `payment`, `ad-campaign`, `crypto-transfer` = high; `email-campaign`, `social-post`, `publish` = medium; `design` = low; `custom` = medium ("always requires approval regardless").
- Service risk can elevate but never lower (`computeTaskRisk`, :34-43).
- **"Iron claw" rule:** high-risk tasks require approval even under full autonomy; `custom` always requires approval (ASI05 unexpected-code-execution defense) (:53-58). Autonomy levels `approve-all` / `approve-high-risk` / `full-autonomy` then modulate medium/low risk (:60-67).

Autonomy mode is runtime-configurable via `PUT /api/field-ops/approval-config` with merge-not-replace semantics (approval-config/route.ts:22-37) and an `autonomy_changed` activity event on mode change (:42-51), gated by owner auth (`requireOwner`, :19-20).

**Bypass detection:** a draft task with `approvalRequired:true` transitioning directly to `approved` is flagged by `isApprovalBypassAttempt` (field-ops-security.ts:111-121) with error "Must go through pending-approval..." (:124-126); enforced in the tasks API (field-ops/tasks/route.ts:205).

**Approve/reject:** batch endpoint maps actions to target states — `submit-for-approval→pending-approval`, `approve→approved`, `reject→rejected` (batch/route.ts:28-32) — requires owner auth (:40-41), validates each transition atomically inside one `mutateFieldTasks` call (:54-92), stamps `approvedBy`/`rejectedBy` + optional `rejectionFeedback` (:78-85), then logs `field_task_approved/rejected` events and notifies agents per task (:95-137).

### 5b. Decision gate (agent-task workflow)

A second approval mechanism blocks *dispatch* of agent tasks: any decision in `decisions.json` with `status:"pending"` and matching `taskId` freezes that task. Checked at three layers:

- Dispatcher filter: `hasPendingDecision(task.id)` → skip (dispatcher.ts:135-138; impl prompt-builder.ts:577-580).
- Standalone runner validation: exits if a pending decision exists (run-task.ts:829-834).
- Manual run API: 400 with the pending decision embedded for the UI (tasks/[id]/run/route.ts:96-124).

Decisions are created *by the system* when loop detection trips (§9c) and answered by the human in the UI. The answer feeds back into execution: `buildRetryContext()` injects the latest answered decision into the retry prompt as "Retry Instructions — Read Carefully ... You MUST take a DIFFERENT approach" (prompt-builder.ts:269-321), wired into every built prompt (prompt-builder.ts:497-499).

### 5c. Vault / signature gates

Field execution additionally requires credential decryption: master password from vault session cache or request body, always re-verified against `masterKeyHash` even with an active session; decryption failure → 403 (execute/route.ts:330-397). Wallet-signing services never execute server-side — they are redirected to the `/execute/prepare` browser-signing flow, producing the separate `awaiting-signature` state (execute/route.ts:250-259). Daemon auto-execution checks vault unlock first when `requireVaultSession` is set (dispatcher.ts:506-522).

---

## 6. Scheduled Fires

`scheduler.ts` registers two classes of node-cron jobs in `start()` (scheduler.ts:27-72):

1. **Poll job:** cron `*/N * * * *` derived from `polling.intervalMinutes`; fires `dispatcher.pollAndDispatch()` (:31-41).
2. **Named command schedules:** each enabled entry validated with `cron.validate` before registration; fires `dispatcher.runScheduledCommand(command)` (:44-66); invalid expressions logged and skipped (:50-53).

Next-fire estimates for the dashboard are approximated manually since node-cron lacks a next-run query — supports `*/N minutes` and exact `min hour` patterns only (scheduler.ts:108-143). `reload(newConfig)` stops all jobs, updates dispatcher config, restarts (scheduler.ts:97-103).

A scheduled command runs only if not already running (`isCommandRunning`, dispatcher.ts:580-583) and only if a concurrency slot is free (:585-589); its prompt comes from `.claude/commands/<command>/user.md` or a generic fallback (prompt-builder.ts:511-522). Session lifecycle mirrors task dispatch including cost parsing (:595-619).

Additionally, field tasks support future-dating via `scheduledFor`: auto-execution defers any approved task whose `scheduledFor` is in the future (dispatcher.ts:499).

---

## 7. Concurrency & Auto-Dispatch

**Global concurrency:** `pollAndDispatch()` (dispatcher.ts:95-176) computes `availableSlots = maxParallelAgents - health.activeCount()` (:156-158) and dispatches up to that many tasks (:162-166). The same slot math guards scheduled commands (:585) and project-run re-dispatch (:416), plus due retries which are processed first with priority over fresh tasks (:100-101, :181-215; deferred when no slots, :212-214).

**Dispatchable filter chain** (:114-148): skip if already running per health monitor (:116-119); skip if already queued in retry queue (:122-125); skip if dependency-blocked via `isTaskUnblocked` (:128-132; impl prompt-builder.ts:564-572 — every blockedBy task must be `kanban==="done"`); skip if pending decision (:135-138); skip if retry attempts exhausted — `retryCount >= retries + 1` where retryCount derives from failed history entries (:141-145; health.ts:169-172).

**Priority ordering:** pending tasks = `kanban==="not-started"` with non-human assignee, sorted Eisenhower DO→SCHEDULE→DELEGATE→ELIMINATE via an importance×urgency map (prompt-builder.ts:535-559).

**Auto-dispatch of approved field tasks:** `pollFieldOps()` (dispatcher.ts:474-540) is opt-in via `fieldOps.autoExecute` (:475-476). It selects `status==="approved"` tasks not already in-flight, honoring future-dated `scheduledFor` (:493-501, "Phase 5d"), optionally verifies vault session over HTTP (:506-522), caps by `maxConcurrentExecutions` minus in-flight set (:525-529), then POSTs each to `http://localhost:3000/api/field-ops/execute` with `actor:"daemon"` (:552-556). In-flight tracking is an in-memory `Set<string>` (:39, :547, :570) — failures are logged only, never retried.

**Project-run safety net:** `pollProjectRuns()` (dispatcher.ts:331-461) runs every poll cycle: for missions `running|stalled` with no live child processes (liveness probe `process.kill(pid,0)`, :358-369, :378-381), it recomputes dispatchable tasks against dependencies, decisions, and loop-attempt cap (:398-413), revives stalled→running (:421-424), re-spawns detached runners `--source project-run-chain` (:426-450), marks mission completed when nothing remains (:391-396), and persists changes (:455-457).

**Daemon-level stale cleanup:** `HealthMonitor.cleanStaleSessions()` marks dead-PID sessions failed every minute (health.ts:196-206; timer index.ts:192-196); the runs GET API performs the same reconciliation lazily for UI consumers (runs/route.ts:18-41).

---

## 8. Executor Functions

**Binary resolution & spawn** (runner.ts): `findClaudeBinary()` resolves the CLI in order — config override `claudeBinaryPath` (:69-80), platform-specific candidate paths for npm/pnpm/user-local installs on win32/Unix (:83-109), PATH lookup via `where`/`which` (:134-160), final fallback `"claude"` letting spawn fail descriptively (:162-165). Windows `.cmd` shims cannot be spawned with `shell:false`, so `resolveJsFromCmd()` extracts the underlying JS entry point from the shim and spawns it via `node.exe` with prefix args (:40-63, :115-127). Result cached module-level (:33, :66).

**Spawn hardening:** argument array construction instead of string interpolation ("prevents shell injection", runner.ts:233-240); binary validated against whitelist `["claude","claude.cmd","claude.exe"]` before spawn (:229-231; list security.ts:97-103); `--dangerously-skip-permissions` only when explicitly configured, logged `[SECURITY]` (:242-244), else `--allowedTools` passed through (:245-248); child env built by `buildSafeEnv` (runner.ts:250; impl security.ts:114) so secrets do not leak into the process.

**Session execution:** stdout/stderr captured with a 10 MB cap each (`MAX_STDOUT_SIZE`, runner.ts:13, :273-285); timeout enforced by `setTimeout` → `treeKill(pid,"SIGTERM")` of the whole process tree with SIGKILL fallback (:287-301); exit handler resolves `{ pid, exitCode, stdout, stderr, timedOut }` with credential scrubbing applied to captured output and failure diagnostics (:304-329); spawn errors (ENOENT) clear the binary cache so detection retries next time (:332-354). `killSession(pid)` exposes tree-kill for stop/shutdown paths (:361-372).

**Output parsing:** `parseClaudeOutput()` maps Claude Code's `--output-format json` stdout into `ClaudeOutputMeta { totalCostUsd, numTurns, subtype("success"|"error_max_turns"|"error_timeout"), sessionId, isError, usage }` (types.ts:173-180), null-safe for every field and tolerant of non-JSON output (runner.ts:173-211).

**Prompt assembly:** `buildTaskPrompt()` = agent persona + linked skills + optional Field-Ops live context (only for agents holding `skill_field_ops`) + optional mission restart context + retry-context decision guidance + `<task-context>`-fenced task data (`fenceTaskData`, escapeFenceContent at security.ts:71-86) + SOP that forbids the agent from doing its own bookkeeping (prompt-builder.ts:167-209, :471-505). Total prompt capped by `enforcePromptLimit` (security.ts:88).

---

## 9. Loop / Failure Handling

### 9a. Daemon retry queue (dispatcher path)

Failures from dispatcher-dispatched tasks enter a **persistent retry queue** (`data/daemon-retry-queue.json`, dispatcher.ts:17) instead of `setTimeout` (comment at :284-285). Entries carry `{ taskId, agentId, retryAt, attempt(1-based), failedAt, error }` (:23-30). Delay is exponential: `retryDelayMinutes * 2^(attempt-1)` capped at 60 min (`MAX_RETRY_DELAY_MINUTES`, :18, :83-86). Queue is atomically persisted via tmp+rename (:69-77) and reloaded on daemon start (:54-67). `handleFailure` schedules a retry while under budget or declares permanent failure after exhaustion, cleaning stale entries either way (:286-323).

### 9b. Continuation chains (run-task / inbox-respond paths)

Timeouts and max-turns exhaustion do not fail the task while continuations remain: `shouldContinue = (hitMaxTurns || hitTimeout) && continuationIndex < maxTaskContinuations` (run-task.ts:963-965, default cap 2 at config.ts:34). The next session is spawned as a detached child re-entering run-task.ts with `--continuation N --run-id <id>` (`spawnContinuation`, run-task.ts:338-370; invoked :1017-1026). Progress continuity: `extractSummary()` takes the JSON `result` field or last 10 lines truncated to 500 chars (:114-130), appended to the task's notes as "Session N: ..." (:310-332), and the continuation prompt is prefixed with a CONTINUATION SESSION header instructing the agent to check notes/subtasks and not redo work (:912-927). Only after all continuations exhaust does `handleTaskFailure` log `task_failed` and post a failure report to inbox (:236-304). The inbox responder implements the same pattern with per-message runs and a cooperative stop flag (run-inbox-respond.ts:494-546, :595-600).

### 9c. Mission loop detection → human decision escalation

Per-mission counters track attempts and last-5 error messages per task (`LoopDetectionState`, types.ts:137-140; updated run-task.ts:492-501, :580-581). After `MAX_LOOP_ATTEMPTS = 3` failures ("After this many failures, create a decision point", run-task.ts:374), `checkLoopAndEscalate` creates a pending decision with options Retry-different-approach / Skip-and-continue / Stop-mission, deduplicated against existing pending decisions (:485-544). Because pending decisions block dispatch (§5b), this halts the loop until a human answers; the answer then steers the retry prompt (§5b). Dispatchable filters also hard-exclude tasks at the attempt cap (run-task.ts:651-653; dispatcher.ts:409-411).

### 9d. Circuit breakers & safety limits (field ops)

- **Consecutive-failure breaker:** `shouldTripCircuitBreaker(statuses, threshold=3)` scans mission tasks backward, tripping after 3 consecutive failures, resetting on any success (field-ops-security.ts:161-176). On trip, execute pauses the whole mission (`active→paused`) and logs `circuit_breaker_tripped` (execute/route.ts:507-532).
- **Spend limits:** pre-execution USD estimate (`estimateTransactionUsd`: ETH×$2000 heuristic, USDC 1:1, payment amounts as-is; :78-97) checked against configured limits (`checkSpendLimits`, execute/route.ts:171-208); breach can pause all active missions when `pauseOnBreach` is set (:190-200); successful spends are written to a pruned spend log (:462-477).
- **Rate limiting:** per-service execution throttle of 10 per 5 minutes returning HTTP 429 + Retry-After (:160-169; limiter class field-ops-security.ts:242-270); separate vault brute-force limiter (soft limit 3 with delays, hard 10 → 15-min lockout, :181-234).
- **Staleness pre-check:** services unused for 3+ days get an idempotent payload re-validation before real execution (:295-328).
- **Credential hygiene:** sensitive result fields redacted before logging (:59-76) and decrypted credentials zeroized post-execution (:432-438).

### 9e. Stop paths

- Task stop API kills the run's process tree, marks the entry `stopped`/"Stopped by user", resets kanban `in-progress→not-started` (tasks/[id]/stop/route.ts:59-105; tree-kill helper :38-55).
- Inbox respond chains honor the cooperative `stopped` flag between sessions (respond-runs.ts:40-44; run-inbox-respond.ts:528-546) plus an explicit stop endpoint.
- Daemon shutdown stops the scheduler first, kills all active session PIDs, writes a `stopped` status file, removes the PID file (index.ts:153-187; stopped-status writer health.ts:267-286).

---

## 10. Post-Completion Side Effects (agent tasks)

On success (`finalStatus==="completed" && exitCode===0`, run-task.ts:1029-1031), `handleTaskCompletion` performs four independent best-effort steps (:136-230): (1) mark task done idempotently in tasks.json (:141-154); (2) post an inbox report from agent→"me" with subject "Completed: <title>" and the extracted summary body (:157-193); (3) append a `task_completed` activity event (:196-216); (4) regenerate `ai-context.md` via `npx tsx scripts/generate-context.ts` with 30 s timeout (:219-229). Field execution mirrors this with agent-notification bridging to the regular inbox + activity log for both success and failure (execute/route.ts:534-560) and **cross-domain dependency unblocking**: completed field tasks remove themselves from other field tasks' `blockedBy` (:562-585) and from regular tasks' `blockedBy`, notifying the assigned agent when its last blocker clears (:587-629).

---

## 11. Persistence Model

| File | Written by | Notes |
|---|---|---|
| `data/daemon-config.json` | config.ts:166-168 | plain write; validated on load |
| `data/daemon-status.json` | health.ts:252-261, :267-286 | **atomic** tmp+rename |
| `data/daemon-retry-queue.json` | dispatcher.ts:69-77 | **atomic** tmp+rename |
| `data/active-runs.json` | run-task.ts:72-74; stop route:87; runs API via mutex | pruned 1 h (run-task.ts:79-90) |
| `data/missions.json` (ProjectRunsFile) | run-task.ts:103-105; project run API:190; dispatcher.ts:456 | saved *before* spawning next batch to prevent races (run-task.ts:663-664 comment, :664) |
| `data/respond-runs.json` | respond-runs.ts:33-35 | pruned 1 h (:125-135) |
| field-ops JSON set | `src/lib/data.ts` mutate helpers | guarded by per-file `async-mutex` Mutex instances — 17 named mutexes incl. `fieldTasks`, `activeRuns`, `decisions` (data.ts:176-195) |

Consistency strategy is PID-liveness reconciliation rather than transactions: any consumer of active-runs treats a `running` entry whose PID is dead as failed (runs/route.ts:21-38; projects/[id]/run/route.ts:64-72, :141-156; dispatcher.ts:356-369; health.ts:14-21). Daemon single-instance enforcement via PID file with stale-file cleanup (index.ts:17-48, :100-108).

Security posture of persistence/logging: all captured process output and error strings pass through `scrubCredentials` before storage (runner.ts:325-326; health.ts:106; security.ts:40), and prompt content is fence-escaped against `<task-context>` breakout injection (security.ts:68-86).

---

## 12. Relevance to Fabrica's CLI-Agent-Management Direction

Fabrica-app is being transformed into a desktop CLI-agent management & operations platform. mission-control is effectively a working prototype of exactly that domain, and this engine is its most transferable subsystem:

1. **Direct architectural precedent for agent run management.** The ActiveRunEntry model (run-task.ts:41-56) — detached child spawn, PID backfill via callback, terminal classification from CLI JSON output, cost/token capture (parseClaudeOutput runner.ts:173-211) — maps almost 1:1 onto managing arbitrary CLI agents in Fabrica; swap the Claude binary resolver (runner.ts:65-165) for an adapter registry per agent CLI.
2. **Approval-gated autonomy is the differentiating pattern.** The risk-tiered FSM (§4e/§5a) with server-side `requiresApproval`, bypass detection, owner-only approve/reject, wallet-signature state, spend limits, rate limiting and circuit breakers is a mature answer to "how much can an agent do without asking" — directly reusable for Fabrica's business-builder audience where agents touch real services.
3. **Human-in-the-loop escalation via decisions.json** (§9c) converts runaway loops into structured questions with retry-guidance feedback into prompts (prompt-builder.ts:298-315) — a strong UX pattern for Fabrica's operations dashboard.
4. **Concurrency + queue semantics** (slot math §7, persistent exponential-backoff retry queue §9a, Eisenhower priority ordering) are production-tested primitives for a multi-agent fleet manager.
5. **Known weaknesses to redesign, not port blindly:** file-based JSON persistence with PID probing works locally but has no multi-window safety beyond mutexes within one process (data.ts:176-195); direct-write paths bypass the mutexes (stop route uses raw writeJSON, tasks/[id]/stop/route.ts:16-18); in-memory state (health sessions, fieldOpsInFlight, rate limiters) resets on restart; `estimateTransactionUsd` hardcodes ETH≈$2000 (execute/route.ts:87); the daemon polls over HTTP to localhost APIs rather than sharing code (dispatcher.ts:508, :552). Fabrica's Electron/Rust layer can replace these with real IPC + SQLite.

---

## Scan-Coverage Statement

**Read in full (line-by-line):** `scripts/daemon/types.ts` (210 lines), `config.ts` (172), `scheduler.ts` (144), `dispatcher.ts` (621), `runner.ts` (373), `run-task.ts` (1090), `prompt-builder.ts` (580), `health.ts` (287), `index.ts` (228), `respond-runs.ts` (135), `src/lib/field-ops-security.ts` (323), `src/app/api/field-ops/execute/route.ts` (641), `src/app/api/field-ops/batch/route.ts` (147), `src/app/api/field-ops/approval-config/route.ts` (54), `src/app/api/tasks/[id]/run/route.ts` (167), `src/app/api/tasks/[id]/stop/route.ts` (106), `src/app/api/runs/route.ts` (42), `src/app/api/projects/[id]/run/route.ts` (232).

**Targeted grep/partial reads:** `src/lib/data.ts` (mutex registry :176-195, write sites), `src/lib/types.ts` (:279 MessageType, :420 FieldTaskStatus, :459-460), `src/app/api/field-ops/tasks/route.ts` (:92-127 approval stamping, :205 bypass check), `src/app/api/inbox/respond/route.ts` (:61-104 trigger flow), `scripts/daemon/run-inbox-respond.ts` (continuation/stop logic :494-600), `scripts/daemon/security.ts` (function signatures + line numbers only).

**Skipped (out of scope for this task, covered elsewhere):** adapters under `src/lib/adapters/*` (R4-1.3 line-level scan exists: `.Fabrica-atlas-board/discovery/round4/mc-adapters-linelevel.md`); vault crypto internals (`vault-crypto.ts`, `vault-session.ts` — cited only at their call sites); UI components incl. `field-task-form-dialog.tsx` and `use-active-runs.ts`; `logger.ts` (trivial formatting wrapper); `run-brain-dump-triage.ts` (triage workflow, not run-lifecycle); `__tests__/**`; data files themselves.

**Citation convention:** bare `file:line` references resolve relative to `_sources/mission-control/mission-control/`. All line numbers verified against the frozen sources during this session (2026-08-23).

