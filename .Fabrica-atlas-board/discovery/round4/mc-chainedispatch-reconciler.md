# R5-1.2 — mission-control Mission Chain-Dispatch + Reconciler Loop (Deep Dive)

**Scope guard:** Covers ONLY chain-dispatch and reconciler mechanics. Workflow FSM/approvals belong to R4-1.6 (`mc-workflow-engine.md`); decision gates to R4-1.29 — excluded here except where the chain loop reads decisions.json as a dispatch blocker.

**Path shorthands** (all under `_sources/mission-control/mission-control/`):

| Short | Full path |
|---|---|
| `DISPATCHER` | `scripts/daemon/dispatcher.ts` |
| `RUNTASK` | `scripts/daemon/run-task.ts` |
| `HEALTH` | `scripts/daemon/health.ts` |
| `INDEX` | `scripts/daemon/index.ts` |
| `TYPES` | `scripts/daemon/types.ts` |
| `PROMPTBUILDER` | `scripts/daemon/prompt-builder.ts` |
| `RUNNER` | `scripts/daemon/runner.ts` |
| `MISSIONS-API` | `src/app/api/missions/route.ts` |
| `PROJECT-RUN` | `src/app/api/projects/[id]/run/route.ts` |
| `PROJECT-STOP` | `src/app/api/projects/[id]/stop/route.ts` |
| `VENTURE-RUN` | `src/app/api/ventures/[id]/run/route.ts` |

---

## 1. The Big Picture

A "mission" (type `ProjectRun`) is a **file-persisted batch execution context over one project's tasks**. There is NO central orchestrator process owning the chain. Three independent actors cooperate through shared JSON files (`data/missions.json`, `data/active-runs.json`, `data/tasks.json`, `data/decisions.json`):

1. **Chain starter** — API route `POST /api/projects/[id]/run` (PROJECT-RUN:76-232) creates the mission record and spawns the first wave of detached `run-task.ts` processes.
2. **Chain handoff** — each `run-task.ts` process, when its own task settles, itself computes and spawns the next wave (`handleProjectRunContinuation`, RUNTASK:550-729). The chain is a **relay race between detached child processes**, not a supervisor loop.
3. **Reconciler safety nets** — two independent re-dispatch loops catch silent handoff failures: a frontend-poll-triggered reconciler inside `GET /api/missions` (`reconcileStuckMissions`, MISSIONS-API:86-211) and a daemon-side copy in `Dispatcher.pollProjectRuns()` (DISPATCHER:331-461).

All actors apply the **same dispatchability predicate** (not done, has non-human assignee, unblocked deps, no pending decision, under loop limit) — reimplemented in RUNTASK:643-655, MISSIONS-API:155-168, DISPATCHER:398-413, PROJECT-RUN:127-139. Redundancy-by-reimplementation is the core reliability strategy.

## 2. Chain State Persistence Model

### 2.1 missions.json — the chain ledger

Schema: `ProjectRun` (TYPES:142-156) inside `{ missions: ProjectRun[] }` (TYPES:158-160). Key fields:

| Field | Purpose | Cited |
|---|---|---|
| `id` | `mission_{Date.now()}` | PROJECT-RUN:173 |
| `projectId` | Scope key — a mission covers ALL eligible tasks of one project | PROJECT-RUN:176 |
| `status` | `"running" \| "completed" \| "stopped" \| "stalled"` (TYPES:124) | TYPES:145 |
| `lastTaskCompletedAt` | Grace-period marker written on every task finish so reconcilers wait before intervening (RUNTASK:572) | MISSIONS-API:79,126-129 |
| counters | `totalTasks/completedTasks/failedTasks/skippedTasks` mutated by whichever actor touches the mission next | RUNTASK:573-577 |
| `taskHistory[]` | Append-only `{taskId, taskTitle, agentId, status, summary(<=500ch), attempt}` (TYPES:126-135); feeds restart-context prompts and inbox reports | RUNTASK:584-593 |
| `loopDetection.taskAttempts` | Per-task attempt counter map — the mission-level retry budget | RUNTASK:580-581 |

### 2.2 active-runs.json — the live-process registry

`ActiveRunEntry` (RUNTASK:41-56): `{id, taskId, agentId, projectId, missionId, pid, status: running|completed|failed|timeout|stopped, startedAt, completedAt, exitCode, error, costUsd, numTurns, continuationIndex}`.

- Written **before spawn** with `pid: 0`; real PID patched in via runner's `onSpawned` callback right after spawn (RUNTASK:853, 940-950).
- Finished entries pruned after 1 hour (`pruneOldRuns`, RUNTASK:79-90), but **`running` rows are never age-pruned** (RUNTASK:84 keeps all running) — crash-orphaned rows persist indefinitely until some writer finalizes them (see §6.1).
- Continuations reuse the parent runId suffixed `_c{N}` (RUNTASK:866-887), making one logical execution's session chain traceable.

### 2.3 Write-safety asymmetry

- Atomic tmp+rename writes exist only in daemon-owned paths: `saveRetryQueue` (DISPATCHER:69-77) and `HealthMonitor.flush` (HEALTH:252-261, "prevents corruption if the daemon is killed mid-write").
- `run-task.ts` uses plain `writeFileSync` for missions.json and active-runs.json (RUNTASK:72-74,103-105) — no atomicity for precisely the chain-critical files. Readers tolerate corruption via try/catch returning empty data (RUNTASK:62-70,94-101), which silently *loses* chain state rather than crashing.

## 3. Chain Start (mission creation)

PROJECT-RUN POST sequence:

1. **Single-flight guard**: HTTP 409 if any mission for the project is already `running` (PROJECT-RUN:83-93). A `stalled` mission does NOT block creating a new one — new mission gets a fresh id, so stale stalled records accumulate.
2. **Eligibility**: project tasks where `kanban !== "done" && assignedTo && assignedTo !== "me" && !deletedAt` (PROJECT-RUN:102-109). Human-assigned ("me") tasks are structurally outside agent chains.
3. **Pre-validation**: dispatchable-vs-skipped counts from blockedBy + pending-decision checks (PROJECT-RUN:118-139).
4. **Liveness-filtered dedup**: taskIds already in a `running` active-run entry with a live PID are skipped, not double-launched (PROJECT-RUN:141-156).
5. **Concurrency clamp**: `slotsAvailable = maxParallel - liveRunningCount`; overflow returned as `queued` in the response but **not persisted as queued work anywhere** (PROJECT-RUN:167-170,224-231) — those tasks rely entirely on later handoff/reconciler passes.
6. **Persist mission BEFORE spawning** children (PROJECT-RUN:189-190), then one detached `run-task.ts <taskId> --source project-run --mission <missionId>` per task with `child.unref()` (PROJECT-RUN:197-221) — children outlive the Next.js request/process.

`VENTURE-RUN` is a near-identical duplicate (mission schema incl. `loopDetection` init VENTURE-RUN:53,173-188; same spawn block :203). The venture/project split is UI-level; the mechanism is one implementation copied twice.

---
## 4. Chain Handoff (the relay)

After its task settles, every `run-task.ts` calls `handleProjectRunContinuation(missionId, taskId, result)` (RUNTASK:1038-1051 success path; RUNTASK:1069-1081 in the catch path too — the chain advances even when the runner threw).

Step-by-step (RUNTASK:550-729):

1. **Terminal-status guard**: skip if mission `completed`/`stopped` (RUNTASK:564). A user-stop permanently halts the chain even if stragglers later finish.
2. **Stall revival**: `stalled -> running` on any task completion (RUNTASK:566-569).
3. **Stats + grace marker**: bump counters, set `lastTaskCompletedAt = now` (RUNTASK:572-577).
4. **Loop counter increment**: `loopDetection.taskAttempts[taskId]++` unconditionally per finished execution (RUNTASK:580-581); failures additionally feed error history.
5. **History append** with summary truncated to 500 chars (RUNTASK:584-593).
6. **Failure escalation**: `checkLoopAndEscalate` (RUNTASK:485-544) keeps last 5 error messages per task (:498-502); at >= 3 attempts creates a **decision** in decisions.json offering Retry-different-approach / Skip-task / Stop-mission (:505-538), dedup-guarded against duplicate pending decisions (:512-516). This is the mission-level circuit breaker — attempts>=3 excludes the task from dispatch until a human answers.
7. **Completion check**: no remaining eligible tasks -> `status="completed"` + inbox report via `postProjectRunReport` (RUNTASK:606-635, :379-450).
8. **Next-wave selection** (RUNTASK:643-655): remaining minus (currently-running-in-active-runs, blockedBy-not-all-done, pending-decision, attempts>=3). **Ordering is dependency-driven only** — no priority sort, no sequencing beyond `blockedBy`; all dispatchable tasks launch in parallel up to slots (RUNTASK:657-661). Eisenhower priority ordering applies only to the daemon's *non-mission* poll (`getPendingTasks`, DISPATCHER:104), never inside chains.
9. **Save-before-spawn**: mission mutations written BEFORE spawning children, comment claims it "prevents race conditions" (RUNTASK:663-664) — only partially true (§7).
10. **Spawn next wave**: detached, `--source mission-chain` (RUNTASK:667-693).
11. **Stall determination** (RUNTASK:695-728): if nothing spawned AND nothing running anywhere:
    - If remaining tasks' blockers include other remaining project tasks -> keep `running`, "let the reconciler re-dispatch when dependencies complete" (:706-711).
    - Else -> `stalled`, record `skippedTasks`, post stalled inbox report naming causes (blocked/decisions/loop-limit) (:712-727).

### 4.1 Intra-task continuations (distinct from chain dispatch)

Timeout/max-turns exhaustion spawns a **continuation session for the SAME task** instead of failing it: `shouldContinue = (hitMaxTurns || hitTimeout) && continuationIndex < maxTaskContinuations` (RUNTASK:963-965; default `maxTaskContinuations ?? 2` at :839).

- Progress notes appended to task `notes` between sessions (`appendTaskProgress`, RUNTASK:310-332) so the next session knows prior state.
- Continuation spawned detached with `--continuation N --run-id <runId>` (RUNTASK:338-370); run entry id becomes `{runId}_c{N}` (:866).
- Prompt gets a "CONTINUATION SESSION" header instructing resume-without-redo (:912-927).
- Validation steps (already-running / blocked / pending-decision) are deliberately skipped for continuations (:808-834) because the previous session's run row was just finalized.

Resulting **two-tier retry ladder**: session continuations (budget reset, <=2 extra) -> mission-level re-execution (<=3 attempts) -> human decision gate.

### 4.2 Handoff context injection

When spawning any mission task, `buildTaskPrompt(agentId, task, missionId)` injects restart context from missions.json `taskHistory`: completed vs failed lists and run progress ("avoid duplicating work already done", PROMPTBUILDER:217-262, wired at :469-493). Retry-after-decision additionally injects the user's answered guidance (`buildRetryContext`, PROMPTBUILDER:269+). So chain state is not just machine bookkeeping — it is fed back into each agent's prompt.

## 5. Reconciler Loop #1 — frontend-poll reconciler (GET /api/missions)

`reconcileStuckMissions` (MISSIONS-API:86-211) runs on EVERY GET of missions data — i.e., every UI poll (hook `src/hooks/use-active-runs.ts:66` filters on `running||stalled`). Stated purpose: "heartbeat safety net — if chain dispatch from run-task.ts fails silently, the reconciler picks up the slack on the next frontend poll" (MISSIONS-API:82-85).

Per `running` mission:

1. Liveness: if ANY of the mission's `running` run PIDs is alive (`process.kill(pid,0)` probe, MISSIONS-API:67-75) -> skip, legitimately running (:114-123).
2. **Grace period**: if `lastTaskCompletedAt` within `GRACE_PERIOD_MS = 30_000` -> skip; handoff may be in flight (:79,125-129).
3. No remaining eligible tasks -> mark `completed`, backfill `completedTasks`, inbox report (:137-145).
4. Dispatchable predicate identical to handoff; attempts>=3 hardcoded (:155-168).
5. Dispatchable > 0 -> **RE-DISPATCH**: clamped by a GLOBAL live-slot budget across ALL missions (`totalLiveProcesses`, :110-112,172), spawn via `spawnMissionTasks` (detached, best-effort per task try/catch, :216-248); mission stays `running` (:170-181).
6. Not dispatchable but every unmet dep is a same-project still-remaining task -> keep waiting (:184-201).
7. Otherwise -> `stalled` + inbox report (:203-207).

missions.json rewritten only when changed, inside the GET handler (MISSIONS-API:326-330).

---
## 6. Reconciler Loop #2 — daemon-side safety net

`Dispatcher.pollProjectRuns()` (DISPATCHER:331-461) runs at the tail of every `pollAndDispatch()` cycle (DISPATCHER:171-175). Third copy of the same algorithm with deltas:

- Scans `running || stalled` missions (DISPATCHER:336-338); MISSIONS-API only processes `running`.
- **Revives stalled missions** to `running` before spawning (DISPATCHER:420-424).
- Same PID liveness probe per run (DISPATCHER:358-369); global live-count slot accounting (:416).
- Spawns with `--source project-run-chain` (:426-434) — a third distinct source tag alongside `project-run` and `mission-chain`.
- Marks mission `completed` when no remaining tasks (:391-396).
- Writes missions.json only if changed (:455-457).

Recovery is therefore **dual-triggered**: a UI poll OR a daemon tick, whichever fires first. There is no explicit startup-adoption hook — but since recovery is poll-triggered, a freshly restarted daemon heals pre-crash chains within one polling interval automatically. If BOTH the app and the daemon are down, nothing recovers until one starts.

### 6.1 Zombie / orphan lifecycle (crash semantics)

- **Child crashes mid-task**: its active-runs row stays `running` with a dead PID. Reconcilers treat it as not-live (probe fails), so the task becomes re-dispatchable; however NO writer ever flips that stale row to `failed` — only the stop route writes `stopped` (PROJECT-STOP:109-113). Stale `running` rows never age-prune (RUNTASK:84). They linger until a manual stop or forever.
- **Daemon crash/restart**:
  - PID-file protocol: start refuses while another live daemon exists; stale PID file cleaned on both start and status (INDEX:100-108, 70, 84-88). Liveness by signal-0 (INDEX:41-48).
  - Retry queue reloaded from disk on construction (`loadRetryQueue`, DISPATCHER:54-67; corrupt file -> fresh empty queue :63-66).
  - Cumulative stats + session history carried over from daemon-status.json (`loadPersistedStats`, HEALTH:210-232).
  - Graceful shutdown (SIGINT/SIGTERM): stops scheduler, kills each active child's process tree via tree-kill (`runner.killSession`, RUNNER:361-372; shutdown loop INDEX:164-174), writes `stopped` status atomically (HEALTH:267-286).
  - Hard kill (no signal handling): children are detached+unref'd, so they SURVIVE and keep running/chain-dispatching — mission state stays consistent because it lives in files, and the reconcilers re-adopt on next poll.
- **In-daemon zombie cleanup**: `HealthMonitor.cleanStaleSessions()` runs every 60s (INDEX:192-196): any tracked daemon session whose PID is dead is marked failed "Process died unexpectedly (detected by health check)" freeing its concurrency slot (HEALTH:196-206). PID<=0 sessions are skipped (not yet spawned) (:199). NOTE: this covers only sessions the *daemon* spawned via Dispatcher — run-task.ts chain processes are invisible to HealthMonitor; their orphan cleanup is exclusively via the two mission reconcilers.

### 6.2 Stop path (zombie kill)

`POST /api/projects/[id]/stop` (PROJECT-STOP:70-142): finds running/stalled mission for the project (:84-86), collects running runs matching projectId OR missionId (:97-101), kills each PID via tree-kill with process.kill fallback (:47-66), writes run rows to `stopped` (:109-113), sets mission `stopped`+stoppedAt (:119-121), and **reverts in-progress tasks to `not-started`** for clean restart (:123-135). The venture twin is VENTURE-STOP (same shape, filter at VENTURE-STOP:85-101).

## 7. Concurrency & Correctness Analysis

1. **Read-modify-write races across processes**: three actors (run-task handoff, MISSIONS-API reconciler, DISPATCHER reconciler) do load->mutate->store on missions.json with no lock. API-side per-file mutexes exist only inside normal API write routes (per repo CLAUDE.md), not in these routes or scripts. RUNTASK:663-664 saves before spawn which narrows (not closes) one window. Two simultaneous finalizers can drop one side's counter/history updates (lost update), and a reconciler can overwrite a just-written status.
2. **Double-dispatch defenses are TOCTOU-weak**: run-task validates "already running" by reading active-runs.json then writing its own row non-atomically (RUNTASK:808-817, 843-885). Two concurrent dispatchers can both pass the check. Mitigating factor: the window is small and all dispatchers share liveness-filtered dedup first.
3. **PID reuse risk**: liveness = `process.kill(pid, 0)` at four sites (MISSIONS-API:67-75, DISPATCHER:358-369 and :380, INDEX:41-48, HEALTH:14-21); run-task.ts never probes (zero `process.kill` occurrences — its :360-363 is the `spawnContinuation` spawn-options object, RUNTASK:359-364). On Windows, PIDs recycle quickly; a dead agent's PID reused by an unrelated process makes the reconciler believe the task still runs, stalling the chain until that PID dies again. _(F-1 correction 2026-08-23: removed phantom "RUNTASK:360-363 equivalent" cite flagged by verify/round5-wave3-spot-verification.md; probe sites re-verified against source.)_
4. **pid<=0 treated as alive forever** in PROJECT-RUN:65 ("just started, assume alive") and MISSIONS-API:68 — a crashed-between-write-and-spawn run would block its task from re-dispatch indefinitely (only the stop route could clear it). DISPATCHER:359 has the same `run.pid <= 0 -> alive` rule.
5. **30s grace period vs multi-second spawns**: handoff writes `lastTaskCompletedAt` then spawns synchronously-fast (spawn returns immediately) so 30s is generous; safe.
6. **Non-atomic chain-critical writes** (§2.3): crash mid-write to missions.json/active-runs.json silently resets state to empty on next read — missions would appear to vanish (status list empty -> nothing reconciled) rather than corrupt.
7. **Counter drift**: `completedTasks` etc. are incremented incrementally by whichever actor finalizes; the MISSIONS-API completion path recomputes completedTasks from tasks.json (:141) but other paths don't, so counters can drift from ground truth; UI progress uses them.
8. **Duplicate implementations drift**: three copies of the dispatchable predicate and stall logic already differ subtly (attempts>=3 hardcoded vs constant `MAX_LOOP_ATTEMPTS=3` at RUNTASK:374; stalled-revival present in DISPATCHER+RUNTASK but absent in MISSIONS-API; dep-wait condition differs: MISSIONS-API requires ALL unmet deps be same-project remaining (:186-195) vs RUNTASK requiring SOME (:699-704)).

## 8. Mission-level retry/backoff summary

| Layer | Trigger | Budget | Backoff | Cited |
|---|---|---|---|---|
| Session continuation | timeout / max-turns | `maxTaskContinuations` (default 2) | none (immediate respawn) | RUNTASK:963-965, 839 |
| Daemon task retry queue | nonzero exit / spawn error of daemon-dispatched tasks | `config.execution.retries` (+1 total attempts incl. first) | exponential `retryDelayMinutes * 2^(attempt-1)` capped 60 min, persisted to daemon-retry-queue.json with retryAt ISO timestamps | DISPATCHER:23-30, 83-86, 286-312 |
| Mission chain re-execution | failure of chained task; reconciler re-dispatch | `MAX_LOOP_ATTEMPTS = 3` attempts/task | none (next wave immediate; reconciler on poll cadence) | RUNTASK:374, 505; MISSIONS-API:166 |
| Human decision gate | attempts >= 3 | n/a | blocks dispatch until answered | RUNTASK:505-538 |

Note the daemon retry queue is a SEPARATE mechanism from chains: it retries daemon-polled tasks (`dispatchTask`), while chain tasks rely on loopDetection + reconciler re-dispatch. `HealthMonitor.getRetryCount` counts failed history entries per taskId (HEALTH:169-172) and gates daemon dispatch (DISPATCHER:140-145) — a third, independent attempt-counter that does not consult loopDetection.

## 9. Fit Assessment for Fabrica Multi-Agent Fleet Orchestration

**Directly adoptable patterns:**

1. **File-ledger relay chain** (missions.json + active-runs.json split: durable plan-state vs ephemeral process registry). Clean separation; maps well to Fabrica fleet "wave" execution where workers outlive supervisors. (TYPES:142-160; RUNTASK:41-56)
2. **Dual-trigger reconciler with grace period** — poll-based self-healing without startup hooks is operationally simple and proven here; `lastTaskCompletedAt` grace marker is a cheap, effective anti-thrash device. (MISSIONS-API:79,125-129)
3. **Two-tier retry ladder** (continuation-with-context -> bounded re-execution -> human gate) with error-history capture feeding the escalation prompt. (RUNTASK:963-965; 498-502; 505-538)
4. **Restart-context injection into prompts** so re-executed agents know what prior waves did. (PROMPTBUILDER:217-262)
5. **Stop semantics**: kill process trees, revert in-flight work to clean pre-state rather than marking failed. (PROJECT-STOP:103-135)

**Patterns NOT to copy:**

1. **Triple-duplicated predicate/logic** — already drifting (§7.8). Fabrica should extract ONE shared scheduler module used by starter, handoff, and reconciler.
2. **Unlocked read-modify-write JSON across processes** — needs single-writer discipline, file locks, or an append-only event log with derived state. (§7.1)
3. **Signal-0-only liveness with pid<=0=alive** — needs PID+start-time identity or supervisor-held child handles; pid reuse and the pid-0 edge case both cause stuck chains. (§7.3-7.4)
4. **Non-atomic writes on chain-critical files** — tmp+rename everywhere (daemon already shows the pattern). (§2.3)
5. **Zombie `running` rows never finalized** — add a reaper that flips dead-PID rows to `failed/orphaned` instead of leaving them forever. (§6.1)
6. **Queued-but-unpersisted overflow** at mission start (§3.5) — persisted queue or explicit wave records needed.

**Net:** the architecture (durable ledger + relay handoff + poll-driven reconcilers + layered retries) is a strong skeleton for Fabrica's fleet orchestration; the implementation weaknesses are all fixable engineering details rather than design flaws. Biggest structural upgrade for Fabrica: centralize the dispatch predicate and make state transitions event-sourced so the three roles become views over one log.

---

## Scan Coverage Statement

**Files read in full (line-by-line):**
- `_sources/mission-control/mission-control/scripts/daemon/dispatcher.ts` (621 lines)
- `scripts/daemon/run-task.ts` (1090 lines)
- `scripts/daemon/health.ts` (287 lines)
- `scripts/daemon/index.ts` (228 lines)
- `scripts/daemon/types.ts` (210 lines)
- `scripts/daemon/prompt-builder.ts` lines 210-274 + targeted greps (restart/retry context sections)
- `scripts/daemon/runner.ts` lines 350-373 (killSession) + grep
- `src/app/api/missions/route.ts` (336 lines)
- `src/app/api/projects/[id]/run/route.ts` (232 lines)
- `src/app/api/projects/[id]/stop/route.ts` (142 lines)

**Files scanned via targeted grep (partial):** `scripts/daemon/config.ts`, `run-inbox-respond.ts`, `run-brain-dump-triage.ts`, `scheduler.ts` (names only), `src/app/api/ventures/[id]/run/route.ts` + `[id]/stop/route.ts` (key line regions), `src/hooks/use-active-runs.ts` (line 66 region), `src/components/mission-progress.tsx` (stalled UX messaging).

**Skipped (out of scope per task guard):** workflow engine FSM/approvals (R4-1.6 territory), decisions API/UI internals beyond the blocker checks (R4-1.29), field-ops execute pipeline internals (dispatcher.ts:463-572 read but documented as adjacent, not deep-dived), respond-runs chain (`run-inbox-respond.ts` — separate inbox mechanism, noted only).

**Not modified:** no files under `_sources/` or `Fabrica-app/`; output written only to `.Fabrica-atlas-board/discovery/round4/mc-chainedispatch-reconciler.md`.
