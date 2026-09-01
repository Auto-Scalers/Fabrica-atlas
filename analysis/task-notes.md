# Cross-Project Feed Notes — Consolidated

> Paste-ready task notes for the Fabrica-app board. Each note is self-contained: context, ask, citations, verification status.
> **Primary target:** `Fabrica-app/` (the After-Rebrand codebase). `_sources/mission-control` and `_sources/buzz` appear only as donor patterns.
> **Path notice:** citation paths are relative to the repo named in each note's Source line.

---

## Verification Status Legend

| Status | Meaning |
|---|---|
| VERIFIED-PASS | Dedicated spot-verification pass vs sources found 0 conclusion-affecting citation failures |

| Source report | Verify pass | Status |
|---|---|---|
| `discovery/mission-control/mc-chainedispatch-reconciler.md` | R5 wave-3 | VERIFIED-PASS |
| `discovery/mission-control/mc-fieldtask-kanban.md` | R4 wave-7 | VERIFIED-PASS |
| `discovery/mission-control/mc-decision-gates.md` | R4 wave-7 | VERIFIED-PASS |
| `discovery/fabrica-app/fa-agent-hooks-probes.md` | R4 wave-6 | VERIFIED-PASS |
| `discovery/fabrica-app/fa-plugin-runtime.md` | R4 wave-5 | VERIFIED-PASS |
| `discovery/fabrica-app/fa-command-palette-search.md` | R4 wave-4 | VERIFIED-PASS |
| `discovery/fabrica-app/fa-telemetry-consent.md` | R4 wave-4 | VERIFIED-PASS |
| `discovery/mission-control/mc-execute-guards.md` | R4 wave-5 | VERIFIED-PASS |
| `discovery/fabrica-app/fa-wsl-remote-execution.md` | none | HYGIENE-ONLY |

---

# SECTION A — Fleet Orchestration (chain-dispatch + reconciler patterns)

## FA-N11 — Adopt the file-ledger relay-chain architecture for fleet wave execution

**Target board:** Fabrica-app
**Source:** `discovery/mission-control/mc-chainedispatch-reconciler.md` — VERIFIED-PASS (R5-2.9)

```
TASK: Build Fabrica multi-agent fleet orchestration on MC's proven skeleton: durable mission
ledger + ephemeral process registry + relay-race handoff between detached workers - but
centralize the dispatch predicate into ONE shared module (do not copy MC's triple duplication).

CONTEXT (donor _sources/mission-control/mission-control/): A MC "mission" is a file-persisted
batch execution over one project's tasks. There is NO central orchestrator owning the chain;
three independent actors cooperate through shared JSON files:
  - Chain starter: POST /api/projects/[id]/run creates the mission record and spawns the first
    wave of detached run-task.ts processes, persisting the mission BEFORE spawning children,
    each child detached with child.unref() so it outlives the server (route :76-232;
    persist-before-spawn :189-190; spawn block :197-221).
  - Chain handoff: each run-task.ts process, when its task settles, itself computes and spawns
    the next wave (handleProjectRunContinuation, scripts/daemon/run-task.ts:550-729). The chain
    advances even when the runner threw - continuation is invoked on the catch path too
    (run-task.ts:1038-1051 success; :1069-1081 catch).
  - Reconciler safety nets catch silent handoff failures (see FA-N12).

KEY DESIGN SPLIT TO ADOPT:
  - missions.json = DURABLE PLAN LEDGER (schema ProjectRun, types.ts:142-160): status
    running/completed/stopped/stalled; lastTaskCompletedAt grace marker; counters;
    append-only taskHistory[] {taskId,title,agentId,status,summary<=500ch,attempt} feeding
    restart prompts; loopDetection.taskAttempts as the mission-level retry budget.
  - active-runs.json = EPHEMERAL PROCESS REGISTRY (ActiveRunEntry, run-task.ts:41-56):
    id/taskId/agentId/pid/status/exitCode/costUsd/continuationIndex. Written before spawn with
    pid:0; real PID patched via runner onSpawned callback right after spawn (:853, :940-950).
    Continuations reuse parent runId suffixed _c{N} (:866-887) making a logical session chain
    traceable end to end.

ADOPT (report §9 fit assessment):
  1. Ledger/registry separation maps directly onto Fabrica fleet "wave" execution where worker
     processes outlive supervisors.
  2. Save-plan-before-spawn discipline.
  3. Stop semantics: kill process trees, revert in-flight work to clean pre-state rather than
     marking failed (stop route PROJECT-STOP:70-142; tree-kill with process.kill fallback :47-66;
     in-progress tasks reverted to not-started for clean restart :123-135).

DO NOT COPY (report §9 anti-patterns, all verified against source):
  - Triple-duplicated dispatchability predicate (run-task.ts:643-655 vs api/missions/route.ts:
    155-168 vs dispatcher.ts:398-413) already drifting subtly: stalled-revival present in
    daemon+handoff but absent in API reconciler; dep-wait ALL-vs-SOME semantics differ
    (api/missions/route.ts:186-195 vs run-task.ts:699-704). Extract ONE shared scheduler module.
  - Unlocked read-modify-write JSON across processes (no lock anywhere in these paths) - use
    single-writer discipline or an append-only event log with derived state.
  - Non-atomic writes on chain-critical files (plain writeFileSync, run-task.ts:72-74/:103-105)
    while daemon-owned paths DO show the correct tmp+rename pattern (dispatcher.ts:69-77;
    health.ts:252-261 "prevents corruption if the daemon is killed mid-write") - make atomic
    writes mandatory everywhere.

EVIDENCE: discovery/mission-control/mc-chainedispatch-reconciler.md sections 1-4, 7, 9 (spot verification
PASS: R5 wave-3 - 47 clusters, 0 conclusion-affecting failures).
STATUS: verified finding.
```

## FA-N12 — Dual-trigger poll-based reconciler with grace period as fleet self-healing

**Target board:** Fabrica-app
**Source:** `discovery/mission-control/mc-chainedispatch-reconciler.md` — VERIFIED-PASS (R5-2.9)

```
TASK: Implement fleet crash recovery as a dual-trigger reconciler: ANY poll of mission state
(UI refresh OR daemon tick) runs the same heal pass. No startup-adoption hooks needed.

CONTEXT (donor): MC recovery is triggered by whichever fires first -
  - Frontend-poll reconciler inside GET /api/missions (reconcileStuckMissions,
    src/app/api/missions/route.ts:86-211), described in-source as a "heartbeat safety net - if
    chain dispatch from run-task.ts fails silently, the reconciler picks up the slack on the
    next frontend poll" (route.ts:82-85 verbatim).
  - Daemon-side copy Dispatcher.pollProjectRuns() at the tail of every poll cycle
    (scripts/daemon/dispatcher.ts:331-461, wired :171-175); additionally revives stalled
    missions to running before spawning (:420-424).

ALGORITHM PER RUNNING MISSION (api/missions/route.ts:114-207):
  1. Liveness: if ANY of the mission's running PIDs is alive -> skip, legitimately running
     (signal-0 probe :67-75).
  2. GRACE PERIOD: if lastTaskCompletedAt within GRACE_PERIOD_MS = 30_000 -> skip; handoff may
     be in flight (:79, :125-129). Cheap, effective anti-thrash device - adopt as-is.
  3. No remaining eligible tasks -> mark completed; completion path recomputes completedTasks
     from ground-truth tasks.json (:137-145) - do this everywhere to prevent counter drift.
  4. Dispatchable > 0 -> re-dispatch clamped by a GLOBAL live-slot budget across ALL missions
     (:110-112, :172), best-effort per-task try/catch.
  5. Not dispatchable but every unmet dep is a same-project still-remaining task -> keep waiting.
  6. Otherwise -> stalled + operator-facing report naming causes (blocked / decisions /
     loop-limit).

WHY POLL-BASED WORKS: because state lives in files, a freshly restarted daemon heals pre-crash
chains within one polling interval automatically. If BOTH app and daemon are down, nothing
recovers until one starts (acceptable for a desktop app).

FIX BEFORE PORTING (verified weaknesses):
  - Signal-0-only liveness breaks under Windows PID recycling; and pid<=0 is treated as ALIVE
    ("just started, assume alive", projects/[id]/run/route.ts:65; api/missions/route.ts:68)
    which can stall a task indefinitely. Use PID+start-time identity or supervisor-held child
    handles.
  - Zombie running rows are never finalized: dead-PID active-run rows linger forever
    (pruneOldRuns keeps all running rows, run-task.ts:84; only the stop route writes stopped,
    PROJECT-STOP:109-113). Add a reaper that flips dead-PID rows to failed/orphaned.
  - Queued-but-unpersisted overflow at mission start: tasks beyond the concurrency clamp are
    returned as "queued" in the HTTP response but persisted nowhere (PROJECT-RUN:167-170,
    :224-231) - they rely entirely on later handoff/reconciler passes. Persist explicit wave
    records instead.
  - In-daemon HealthMonitor.cleanStaleSessions() (health.ts:196-206, every 60s per index.ts:
    192-196) covers ONLY daemon-spawned sessions; run-task chain processes were invisible to it.
    One unified liveness/reaping surface in Fabrica.

EVIDENCE: discovery/mission-control/mc-chainedispatch-reconciler.md sections 5-7, section 9 items 2/5/6
(R5 wave-3 PASS).
STATUS: verified finding.
```

## FA-N13 — Two-tier retry ladder + restart-context injection into agent prompts

**Target board:** Fabrica-app
**Source:** `discovery/mission-control/mc-chainedispatch-reconciler.md` — VERIFIED-PASS (R5-2.9)

```
TASK: Give every fleet-executed task a layered retry ladder ending in a human gate, and feed
chain history back into each agent prompt so re-executed agents never redo prior work.

CONTEXT (donor): MC resolves failures through FOUR independent layers (report section 8 table):

| Layer | Trigger | Budget | Backoff | Cited |
|---|---|---|---|---|
| Session continuation (same task, new session) | timeout / max-turns exhaustion | maxTaskContinuations default 2 (run-task.ts:839; shouldContinue :963-965) | none (immediate respawn) |
| Daemon task retry queue | nonzero exit / spawn error of daemon-dispatched tasks | config.execution.retries | exponential retryDelayMinutes * 2^(attempt-1) capped 60 min, persisted with retryAt ISO timestamps (dispatcher.ts:83-86, :286-312) |
| Mission chain re-execution | chained task failure / reconciler re-dispatch | MAX_LOOP_ATTEMPTS = 3 per task (run-task.ts:374) | next wave immediate |
| Human decision gate | attempts >= 3 | n/a | blocks dispatch until answered (run-task.ts:505-538) |

KEY MECHANISMS TO PORT:
  1. Continuations carry context forward: progress notes appended to task notes between
     sessions (appendTaskProgress, run-task.ts:310-332); spawned detached with --continuation N
     --run-id <runId> (:338-370); prompt gets a "CONTINUATION SESSION" header instructing
     resume-without-redo (:912-927); continuation validation checks deliberately skipped
     because the previous run row was just finalized (:808-834).
  2. Failure escalation captures forensics: checkLoopAndEscalate keeps last 5 error messages
     per task (:498-502); at threshold creates a decision offering Retry-different-approach /
     Skip-task / Stop-mission with error history embedded (:505-538), dedup-guarded against
     duplicate pending decisions (:512-516).
  3. Restart-context injection: buildRestartContext renders mission taskHistory into the next
     prompt ("avoid duplicating work already done", prompt-builder.ts:217-262, wired :471/
     :491-499 - note minor line-drift correction from verification N-2). Chain state is not
     just bookkeeping; it is fed into each agent's instructions.
  4. Dependency-driven wave ordering only: no priority sort inside chains - all dispatchable
     tasks launch in parallel up to slots (run-task.ts:657-661); Eisenhower ordering applies
     only to non-mission daemon polls (dispatcher.ts:104).

CAVEAT: the daemon retry queue and the chain loopDetection are SEPARATE mechanisms that do not
consult each other; HealthMonitor.getRetryCount (health.ts:169-172, gating dispatcher.ts:140-145)
is a third independent attempt counter. Consolidate into ONE attempt ledger in Fabrica.

EVIDENCE: discovery/mission-control/mc-chainedispatch-reconciler.md sections 4.1-4.2, 8, 9 items 3-4
(R5 wave-3 PASS).
STATUS: verified finding.
```

---

# SECTION B — Fabrica Core Task Model (dual-task-domain)

## FA-N14 — Two parallel task domains: human planning tasks vs machine-executed agent actions

**Target board:** Fabrica-app
**Source:** `discovery/mission-control/mc-fieldtask-kanban.md` — VERIFIED-PASS (R4-2.9)

```
TASK: Structure the Fabrica core data model as TWO task domains that never merge into one
table, exactly as MC does - and keep them bridged.

CONTEXT (donor): MC contains two independent task entities (report section 1 comparison table):

| Aspect | Regular Task | Field Task |
|---|---|---|
| Type | Task (src/lib/types.ts:159-185) | FieldTask (src/lib/types.ts:451-474) |
| Storage | data/tasks.json (src/lib/data.ts:203) | data/field-ops/tasks.json (src/lib/data.ts:628) |
| Status | KanbanStatus = not-started/in-progress/done (types.ts:3) | 8-state FSM incl. approval/signature (types.ts:420) |
| State machine | NONE - free transitions (dnd writes any value directly, status-board/page.tsx:74-82) | STRICT allow-list FSM (src/lib/field-ops-security.ts:73-82) |
| Assignment | assignedTo + collaborators[] (types.ts:168-169) | assignedTo only (types.ts:458) |
| Approval model | none - pending decisions block runs instead | risk-tiered approval gates baked into creation + transitions |

WHY IT MAPS TO FABRICA: human-planning surface (kanban + Eisenhower priority, importance/
urgency pairs with quadrant helpers types.ts:387-414; "delegate" quadrant is explicitly the
hand-to-an-AI-agent quadrant per workspace doctrine) vs machine-executed action contract.

THE FIELD-FSM IS THE GEM - port it for agent-action execution:
  draft -> [pending-approval, approved]; pending-approval -> [approved, rejected];
  approved -> [executing, awaiting-signature] (signature branch = wallet-mode);
  awaiting-signature -> [completed, failed]; executing -> [completed, failed];
  completed -> [] terminal; failed -> [draft] retry; rejected -> [draft]
(field-ops-security.ts:73-82; helpers isValidTransition :85-90, getTransitionError :93-102).
Safety scaffolding around it (all verified):
  - Risk classification: TASK_TYPE_RISK base map (payment/ad-campaign/crypto-transfer high;
    email-campaign/social-post/publish medium; design low), service risk can elevate but never
    lower (:22-31, :34-43); requiresApproval: HIGH always true ("iron claw - financial and
    high-impact actions never auto-approve", :46-68 esp. :53-55).
  - Server-side approval enforcement on create - never trust client input
    (api/field-ops/tasks/route.ts:84-96).
  - Bypass detector: draft->approved while approvalRequired=true rejected 403
    (:204-220; detector field-ops-security.ts:111-126).
  - Circuit breaker: >=3 consecutive failed siblings auto-pauses the mission; transition
    refused 409 (:222-255; shouldTripCircuitBreaker :161-176, resets on any completed).
  - Owner-only approvals via requireOwner (src/lib/owner-guard.ts:20-63): vault session or
    masterPassword vs scrypt hash; agents structurally cannot approve.
  - Mission container carries autonomyLevel approve-all/approve-high-risk/full-autonomy that
    feeds requiresApproval at creation (types.ts:576-583; missions route owner-gated :100-104).

BRIDGING PATTERN: FieldTask.linkedTaskId -> Task.id (types.ts:464) with reverse
Task.fieldTaskIds[] (types.ts:176) auto-maintained on creation (api/field-ops/tasks/route.ts:
147-165, best-effort); field results/approvals flow BACK into the regular inbox + unified
activity log via notify helpers (src/lib/field-ops-notify.ts:22-85, :90-147, wired :347-366).

EVIDENCE: discovery/mission-control/mc-fieldtask-kanban.md sections 1, 7.2, 8, 9, 10-strengths
(R4 wave-7 PASS - FSM diagram reproduced verbatim from source,
bypass/circuit-breaker cites exact).
STATUS: verified finding.
```

## FA-N15 — Dual-domain fix-before-port register (9 verified gaps to close in Fabrica's port)

**Target board:** Fabrica-app
**Source:** `discovery/mission-control/mc-fieldtask-kanban.md` — VERIFIED-PASS (R4-2.9) · full citation re-check R5-2.14 (R5 citation re-check): items 1-8 EXACT, item 9 FAILED as originally written (F-1) and corrected in the body below

```
CONSTRAINTS FOR ANY PORT of the MC dual-task-domain into Fabrica core (each gap independently
verified in R4-2.9; item 9 corrected against source per F-1):

1. ASSIGNMENT INTEGRITY: AgentRole accepts any string 1..50 chars with NO FK validation against
   agents.json anywhere in task routes (validations.ts:12-13; report section 10 gap 1). Resolve+
   validate assignee against Fabrica's agent registry at write time; run-time resolution in MC
   is binary delegated-vs-mine only (run route refuses unless assignedTo exists and != "me",
   api/tasks/[id]/run/route.ts:53-58). Only capability-style gate anywhere:
   FieldOpsService.allowedAgents[] (types.ts:507) - generalize it.
2. KANBAN GUARDRAILS IF AGENTS WRITE: kanban is any-to-any transitions with zero validation
   (PUT blind merge, api/tasks/route.ts:312-333; dnd direct update status-board/page.tsx:74-82).
   Fine for humans only; if agents ever write kanban directly, add a transition guard.
3. ENFORCE blockedBy ON FIELD SIDE: FieldTask.blockedBy exists (types.ts:465, max 50) but NO run
   gate checks it - dead semantics (contrast regular-task run route check 5 which re-reads
   dependencies, api/tasks/[id]/run/route.ts:83-94). Wire it into the action executor or drop it.
4. scheduledFor IS DEAD: declared on entity/schema/create-write/template-instantiate but NO
   scheduler consumer exists repo-wide (types.ts:469; validations.ts:408/:430; create :119;
   instantiate :95). Either wire a scheduler or drop it in the ported model.
5. ONE ENUM SOURCE OF TRUTH: zod create/update enum lists 7 states omitting awaiting-signature
   vs 8 in types.ts:420 (validations.ts:365 vs types.ts:420) - signature state entered by
   internal flow only. Port must have a single enum definition.
6. ADD NUMERIC PRIORITY / QUEUE FIELDS for multi-agent scheduling: MC relies on creation order +
   circuit breaker only (report section 10 gap 6).
7. APPROVER ROLES BEYOND SINGLE OWNER: requireOwner hardcodes actor === "me"
   (owner-guard.ts:23-30) - no delegation-of-approval. Business-builder audience needs approver
   roles.
8. CONSOLIDATE OBSERVABILITY: two activity logs + two inboxes (regular vs field-ops) bridged ad
   hoc by field-ops-notify.ts - consolidate rather than re-porting the bridge.
9. DAEMON TIMESTAMP IDS (corrected per F-1, R5 citation re-check): generateId
   itself is collision-proof - src/lib/utils.ts:10-12 returns `${prefix}_${nanoid(12)}`
   (nanoid import utils.ts:3; sole definition of generateId in src/). The real collision risk
   under burst writes is the DAEMON-side Date.now() ids: `mission_${Date.now()}`
   (api/projects/[id]/run/route.ts:173), `dec_${Date.now()}` (run-task.ts:522),
   `msg_`/`evt_` ids (run-task.ts:177/:203) - use uuid/cuid for those.

KEEP AS-IS (proven minimal disciplines): per-file async-mutex with lock -> re-read from disk ->
mutate -> write back and implicit rollback on throw (data.ts:463-471, mutex registry :176-197);
lock-free GET reads by design (:199-208); archive tier with own mutex (:210-217, :317-321);
bulk updates applied inside ONE mutate transaction collecting per-item failures instead of
aborting (api/tasks/bulk/route.ts:6-31; field-ops batch route same pattern, schema caps 1..50
validations.ts:525-530).

DELEGATION LOOP TO KEEP: delegation = inbox message + activity event fired on assignee change
(handleDelegation api/tasks/route.ts:39-59); agent completion auto-posts a report to "me"
(handleCompletion :104-128); completing a task scans blockedBy dependents and posts Unblocked
updates (handleUnblocking :130-162). Working agent-coordination protocol requiring zero
transport infra.

EVIDENCE: discovery/mission-control/mc-fieldtask-kanban.md sections 2-5, 8.4, 10
(R4 wave-7 PASS; re-check R5 citation re-check:
items 1-8 EXACT, item 9 corrected per F-1).
STATUS: verified finding (items 1-8); item 9 corrected against source.
```

---

# SECTION C — Operator UX (decision-queue interaction pattern)

## FA-N16 — Decision-queue interaction pattern for operator intervention during autonomous runs

**Target board:** Fabrica-app
**Source:** `discovery/mission-control/mc-decision-gates.md` — VERIFIED-PASS (R4-2.9)

```
TASK: Implement Fabrica's operator-intervention UX as a file/store-backed decision queue with
block-with-payload responses, an intercept-and-rerun loop, and ambient awareness surfaces.

CONTEXT (donor): decisions.json is a file-based human-decision queue. Any agent appends a
DecisionItem {id, requestedBy: AgentRole|"system", taskId|null, question, options[], context,
status pending|answered, answer, answeredAt, createdAt} (types.ts:303-318; zod limits: question
<=500, answer <=500, options <=20, context <=5000 - validations.ts:47-62, :235-243). While a
task-bound decision is pending, that task is hard-blocked at SIX independent enforcement
points: manual run API (returns HTTP 400 with the full pending item embedded,
api/tasks/[id]/run/route.ts:96-124), daemon dispatcher poll silent skip
(scripts/daemon/dispatcher.ts:134-138), run-task pre-execution hard exit (:828-834),
mission chain-dispatch filter (run-task.ts:643-655, check at :650), project/venture launch
pre-validation (api/ventures/[id]/run/route.ts:118-139 - "fixes toast count bug"), and mission
reconciler exclusion (api/missions/route.ts:91-99, :164). taskId:null decisions never block -
pure ask-the-owner inbox items.

PATTERN 1 - BLOCK-WITH-PAYLOAD ERROR RESPONSE: returning the whole DecisionItem inside the 400
body lets the global modal render with zero extra fetches. Maps 1:1 to Fabrica IPC: renderer
asks main to start an agent run; main replies { blockedByDecision } with the intervention
object attached.

PATTERN 2 - INTERCEPT-AND-RERUN LOOP (use-active-runs.ts): on run-click failure, if the error
body carries pendingDecision, store it + remember taskId in a ref and open the modal instead of
showing an error toast (:116-144, intercept :125-131); on answer, close dialog and RE-INVOKE
the original run call (:146-155). Cheap, robust, no scheduler needed for the manual path.

PATTERN 3 - AMBIENT AWARENESS: sidebar badge count via 10s poll (use-sidebar.ts:15; api/sidebar
route counts pending :17/:22); dashboard widget + yellow attention row linking to /decisions
(src/app/page.tsx:145, :617-621); derived "awaiting-decision" agent status by mapping pending
decision taskIds onto assigned tasks (page.tsx:100-127) plus impeded-task counts (:113-115);
activity-feed color chips for decision_requested/answered (activity/page.tsx:38-39/:56-57).
The derive-state-from-set-of-blocked-ids trick is fully portable to Fabrica's operator console.

PATTERN 4 - STRUCTURED ESCALATION VOCABULARY: daemon auto-escalation after MAX_LOOP_ATTEMPTS=3
failures creates a decision with fixed option trio ["Retry with a different approach",
"Skip this task and continue mission", "Stop the entire mission"], context embedding last error
+ attempt history + failing agent id (run-task.ts:485-544; option trio :526-530; forensics
:518-519/:531). Strong default vocabulary for autonomous-run interventions.

PATTERN 5 - ANSWERS-AS-PROMPT-CONTEXT: the operator's words are injected verbatim into the next
attempt prompt inside imperative do-not-repeat fencing ("You MUST take a DIFFERENT approach...",
buildRetryContext prompt-builder.ts:264-321, section text :298-316; unconditionally wired into
every buildTaskPrompt :497-499). Verified negative evidence: NO other reader of decision.answer
exists - answers steer agents exclusively through this injection. This is the correct minimal
mechanism for steering CLI agents post-failure.

AUDIT TRAIL TO KEEP: items never removed on answer (append-mostly Q&A record rendered in the
Answered history section, /decisions page :177-206); activity events decision_requested on
create and decision_answered with chosen answer embedded in summary
(api/decisions/route.ts:65-76, :111-124); loop-detection error history rides along in the
question context.

EVIDENCE: discovery/mission-control/mc-decision-gates.md sections 1-8, 10-patterns
(R4 wave-7 PASS; six-block enforcement points and
buildRetryContext text reproduced verbatim from source).
STATUS: verified finding.
```

## FA-N17 — Decision-queue fix-before-port register (verified weaknesses W1-W11, subset blocking port)

**Target board:** Fabrica-app
**Source:** `discovery/mission-control/mc-decision-gates.md` — VERIFIED-PASS (R4-2.9)

```
CONSTRAINTS FOR ANY PORT of the MC decision queue into Fabrica (weaknesses verified against
source in report section 9):

1. TRANSACTIONAL STORE, NOT FILE+MUTEX ACROSS PROCESSES (W2): Next.js API writes serialize via
   async-mutex (data.ts:184, :353-356; mutateDecisions :528-535 is the real read-modify-write
   path - NOTE report F2: withDecisions at :430-433 is legacy read-only-in-lock, not write-back)
   but the daemon writes with raw writeFileSync (run-task.ts:538) - cross-process races lose
   records. Fabrica main-process should own the store single-writer.
2. CONSUMPTION SEMANTICS (W4/W5): only the LATEST answered decision is injected
   (prompt-builder.ts:297) and answered decisions re-inject into EVERY future run forever (no
   consumed flag; unconditional wiring :497-499) - stale guidance can poison unrelated retries.
   Mark applied after first injection or scope injection to the immediately-next attempt;
   inject the full ordered answer chain.
3. EVENT-DRIVEN UNBLOCK, NOT POLL+DELAY (W6/section 4.8): MC has no unblock event - resumption
   relies on UI re-run, dispatcher poll, or reconciler reaching it; the dialog waits a fixed
   300 ms before auto re-run "to let the write complete" (decision-dialog.tsx:77-78). Fabrica
   already has push channels - answering should emit an unblock event to the runner.
4. REAL STATUS ENUM INCLUDING dismissed/expired (W8/W9): out-of-band script fix-stuck-tasks.js
   writes status:"dismissed" which exists in NO schema (script :26-34 vs types.ts:301,
   validations.ts:17); such rows vanish from every view. Pending tasks also block indefinitely
   (no TTL). Enumerate the statuses properly.
5. AUDIT DELETES (W3): DELETE removes the record with no ActivityEvent
   (api/decisions/route.ts:129-141).
6. DEDUPE ESCALATIONS ACROSS FULL HISTORY (W7): duplicate-guard checks pending only
   (run-task.ts:512-16) so persistent failure churns unbounded new decisions after each answer.
7. AUTH ON DECISIONS ENDPOINTS (W1): none today - any local HTTP caller can list/create/answer/
   delete. Non-negotiable to fix in a desktop agent platform.
8. OPTIONS NOT ENFORCED (W11): answers may be any free string regardless of offered options -
   acceptable UX, but downstream consumers cannot switch on enumerated choices; decide
   deliberately.

ARCHITECTURE NOTE FOR SYNTHESIS: MC now has TWO operator-intervention systems - the generic
decision queue (task-progress level, freeform questions) and field-ops approvals (execution
level, risk-tiered FSM per FA-N14). Fabrica should keep BOTH TIERS but share ONE UI surface
(MC splits them across /decisions and field-ops approval UIs, fragmenting operator attention).

EVIDENCE: discovery/mission-control/mc-decision-gates.md sections 2.3, 4.8, 9, 10-fix-list
(R4 wave-7 PASS; F2 caveat recorded above).
STATUS: verified finding.
```

---

# SECTION D — Provider-Neutral Runner & Agent Hooks

## FA-N1 — Promote `TuiAgentConfig` into the provider-neutral runner contract

**Target board:** Fabrica-app
**Source:** `discovery/fabrica-app/fa-agent-hooks-probes.md` — VERIFIED-PASS

```
TASK: Provider-neutral agent runner — promote TuiAgentConfig to SpawnSpec, collapse 14 IPC channels, extract per-provider parsing.

CONTEXT: Fabrica-app already contains a ~31-agent launcher catalog (`src/shared/tui-agent-config.ts:20-47`, table body :49-331`) that carries detectCmd / aliases / required commands / unsupported runtimes / launchCmd with per-platform overrides / prompt-injection modes / trust presets / binary-name mappings (e.g. antigravity→`agy` :165-170, cursor→`cursor-agent` :243-250, continue detects `cn` because `continue` is a shell builtin :236-242). The agent-hooks report calls it "a SpawnSpec-in-waiting" and assesses FA-T1 fit as HIGH with LOW risk of parallel machinery: MC's provider trio adds nothing beyond naming.

DELIVERABLES:
1. Define an explicit `SpawnSpec` contract derived from `TuiAgentConfig` fields (do not invent new shapes).
2. Replace the 14 copy-paste `agentHooks:<agent>Status` IPC handlers (`src/main/ipc/agent-hooks.ts:142-323`; channel list :55-68) with one dispatcher registered behind a single parameterized channel; mirror in preload (`src/preload/index.ts:2159-2185`) and web stub (`web-preload-api.ts:2986+`) — this avoids the three-layer rename migration risk flagged as FA-T11 friction.
3. Move per-provider status parsing + interrupt-inference quirks out of `src/main/agent-hooks/server.ts` (2,907 L single-file concentration risk) into profile-owned modules. Quirk examples to relocate verbatim: Droid Ctrl+C exits CLI (:799-801); opencode/copilot need double-Escape (:803-810); Claude AskUserQuestion Escape routes to inferQuestionAnswered (:811-818).

COUNT CORRECTION (adopt everywhere): 14 managed install targets (`src/shared/agent-hook-types.ts:6-21`) vs **18** live `/hook/<source>` pathnames (`src/shared/agent-hook-listener.ts:4418-4437`). Delta = opencode, mimo-code, pi, omp, prime-agent (live via plugins, not managed installers). Older "15 named CLIs" figures are wrong.

EVIDENCE: discovery/fabrica-app/fa-agent-hooks-probes.md §3, §9, §10 (44-cite spot verification PASS, R4 wave-6).
STATUS: verified finding.
```

## FA-N2 — Keep the zero-polling agent-status event-push architecture

**Target board:** Fabrica-app
**Source:** `discovery/fabrica-app/fa-agent-hooks-probes.md` — VERIFIED-PASS

```
NOTE (constraint for any runner/status refactor): Fabrica-app's live agent-status refresh is fully event-push with NO polling anywhere: accepted hook POST → `webContents.send('agentStatus:set')` (`src/main/index.ts:1546-1564`); startup replay via one-shot `agentStatus:getSnapshot` pull (`src/main/ipc/agent-hooks.ts:112-119`); freshness is passive 30-min TTL evaluated lazily (`AGENT_STATUS_STALE_AFTER_MS`, src/shared/agent-status-types.ts:268).

Loopback receiver hardening to preserve in any rewrite: per-start random UUID token checked on every POST (`server.ts:2101, :2116-2120`); slowloris guard destroying stalled sockets (:2122-2125); fail-open 204 for malformed bodies so a broken hook never blocks an agent CLI (:2168-2172); launch-token disposition gate as anti-spoofing layer (:2149-2159); loopback bind `listen(0,'127.0.0.1')` (:2197-2198).

KNOWN TRADE-OFF: `FABRICA_AGENT_HOOK_TOKEN` sits in child env, readable by any pane-spawned process (`server.ts:2547-2552`) — inherent to the loopback-token model, mitigated by 127.0.0.1 bind only. Accept or redesign consciously; do not accidentally widen it.

EVIDENCE: discovery/fabrica-app/fa-agent-hooks-probes.md §5-§7.
STATUS: verified finding.
```

## FA-N3 — Plugin host runtime as agent-capability package base; four gaps must close first

**Target board:** Fabrica-app
**Source:** `discovery/fabrica-app/fa-plugin-runtime.md` — VERIFIED-PASS

```
TASK: Adopt the plugin host runtime as the substrate for installable agent-capability packages; close the four gaps below before promising third-party agent packages.

WHAT ALREADY EXISTS (reuse, don't rebuild):
- One forked Node child per plugin w/ `main` field, stdio ['ignore','pipe','pipe','ipc'] + serialization 'advanced' + execArgv [] flag-scrub (`src/main/plugins/plugin-host-process.ts:88-99`).
- Minimal SDK surface — exactly five members: commands.register, events.on, host.call, grantedCapabilities (advisory), log (8192-char cap) (`src/main/plugins/plugin-host-runtime.ts:18-36`).
- Zod-walled wire protocol both directions (`src/shared/plugins/plugin-host-protocol.ts:5-9, :95-102`); constants READY_TIMEOUT 10s / INVOKE_TIMEOUT 30s / IDLE_REAP 5min / MAX_ACTIVE_DEFAULT 5 (:108-114).
- Capability gate with indistinguishable denial codes (unknown_method → panel_forbidden → consent_required → capability_denied) preventing consent-state oracles (`src/shared/plugins/plugin-capability-gate.ts:34-63, :46-54`); audit-intent-before-handler, audit outage blocks writes (`plugin-host-methods.ts:72-91`).
- Supervision FSM: startup-fail SIGKILL (:151-154), invoke-timeout rejects only that call (:269-272), event flood kill (:281-292), shutdown grace 2s→SIGKILL (:306-319), restart backoff [500,2000,5000] maxRestarts 3 (`plugin-supervisor.ts:31-34, :84-92`).
- Slot pool cap 5 FIFO fairness — template for bounding concurrent agent sandboxes per machine (`plugin-worker-slot-pool.ts:36-39`).
- Three load-compat gates: engine range (`plugin-manifest.ts:175-194`), pluginApi literal pin (:96), exact manifestRevision equality for worker reuse (`plugin-worker-spawn-spec.ts:12-21`).

GAPS TO CLOSE (from report S12.5):
a. Post-activate() plugin code has RAW Node power inside its own process (OS-process isolation only) — needs a restricted runtime mode (interpreter/injection SDK or per-plugin OS sandbox profiles) before autonomous agents get this surface (`plugin-host-runtime.ts:20-36` context).
b. Host API has NO exec/spawn/fs method today; agent packages will demand one — design an audited execution primitive deliberately, don't let `terminal.sendText` become the de-facto one.
c. Closed event set lacks agent-domain events (run started/finished/token spend); closed-enum + payload-schema pattern extends cleanly (`plugin-manifest.ts:63-70`).
d. No version negotiation beyond literal pluginApi pin — add a real handshake in the init message (`plugin-host-protocol.ts:11-20`).

EVIDENCE: discovery/fabrica-app/fa-plugin-runtime.md §1-§12 (~110 cites; wave-5 spot verification PASS).
STATUS: verified finding.
```

## FA-N4 — Add "Agents" section to the Cmd+J palette

**Target board:** Fabrica-app
**Source:** `discovery/fabrica-app/fa-command-palette-search.md` — VERIFIED-PASS

```
TASK (cheap, high-value): surface agent operations in the Cmd+J WorktreeJumpPalette.

CONTEXT: The palette already merges seven result families into one ranked list (`WorktreeJumpPalette.tsx:258-266`; section build :917-1052, :1337-1424) but imports NEITHER searchTerminalQuickCommands NOR the ~30-agent catalog — quick commands can launch any catalogued TUI CLI agent with a preloaded prompt via `launchAgentInNewTab({agent, prompt, launchSource:'quick_command', ...})` (`lib/run-quick-command-in-new-tab.ts:55-77`; `launch-agent-in-new-tab.ts:135-140`), yet are invisible in Cmd+J today. Verified gap, not speculation.

WHY IT IS CHEAP:
- Palette action layer is tiny and extensible: 6 built-ins + plugin entries (`quick-actions.ts:59-182`) — natural insertion point.
- Telemetry is palette-ready with zero schema migration: 'command_palette' / 'workspace_jump_palette' already exist in launchSourceSchema (`shared/telemetry-events.ts:183, :189`, consumed by agentStartedSchema/agentPromptSentSchema :350-365); 'command_palette' is first WORKSPACE_SOURCE_VALUES entry (`shared/workspace-source.ts:2`).
- Free rebindable hotkey per agent: `tab.newAgent.<agent>` chord family exists unbound by default (`keybindings.ts:26, :1105-1127`).
- Define agent ops once as first-class actions → palette + keybindings + plugins all dispatch them (`lib/plugin-command-execution.ts:8-12`, `app-command-dispatch.ts:20-24`).
- Availability model global-vs-worktree-scoped with reason codes maps onto ops needing an active workspace/session vs app-level (`plugin-quick-actions.ts:25-28`; `quick-action-context.ts:92-126`).

SCOPE SUGGESTION: launch / resume / send prompt / switch account as the first four actions; keep matching hand-rolled (no fuzzy lib exists in-tree — two matcher families live in `lib/agent-picker-search.ts:94-123` and `components/quick-open-search.ts:75-108`; preserve the uniform 2 KiB DoS query guard `shared/clipboard-text.ts:70-75`).

EVIDENCE: discovery/fabrica-app/fa-command-palette-search.md §6-§9.
STATUS: verified finding.
```

## FA-N5 — WSL plane: mandatory-helper guardrails + risk register items

**Target board:** Fabrica-app
**Source:** `discovery/fabrica-app/fa-wsl-remote-execution.md` — HYGIENE-ONLY (no content spot-verification yet)

```
NOTE (guardrails for all WSL-touching work; several are regression traps):
1. NEVER hand-build `wsl.exe ... bash -c ...` strings. Two escaping layers defend `$`-preprocessing by wsl.exe argv (base64 wrap; backslash escaping) — "Any After-Rebrand code that builds its own wsl.exe bash -c strings without these helpers will break on paths/commands containing $" (`wsl-bash-command.ts:6-11`; `shared/wsl-login-shell-command.ts:5-18`). Use the helpers or extend them.
2. New FABRICA_* guest env vars MUST be registered in the WSLENV allowlist (`pty/wsl-fabrica-env.ts:76-99`) or they silently arrive empty inside WSL. Per-variable flags matter: `/u` cross-untranslated vs `/p` path-translated; e.g. OpenCode overlay dirs cross only as guest-side POSIX to avoid config-root hijack (:68-74).
3. WSL deletes are true in-guest `rm` (shell.trashItem cannot recycle WSL UNC items, #6415): omitting approvedRoots yields unrestricted in-guest rm -rf — keep containment mode's stat device:inode TOCTOU re-verification intact (`wsl-unc-delete.ts:43-61`; `wsl-contained-delete.ts:4-120`, exit code 65 FABRICA_WSL_DELETE_REJECT:<reason>).
4. Treat 9P (`\\wsl.localhost`) as hostile for stat/watch — plain Win32 calls "lie or stall"; fallbacks exist (`wsl.ts:72-102`; ipc/filesystem-watcher-wsl.ts). Do not add direct Win32 stat over UNC paths.
5. Avoid sync wsl.exe probes on the main thread (up-to-5s stalls each; async twin w/ staggered negative caching exists: retryable 45s / definitive 10min / backoff cap 30min — `wsl-availability.ts:13-17, :31-36, :95-98, :140-170`).
6. Auth state is per-runtime AND per-distro: deleting/reinstalling a distro silently invalidates Claude/Codex accounts (`claude-accounts/service.ts:927-998`) — surface this in UI before destructive distro ops.
7. Worktrees inside distro fs (`~/FABRICA/workspaces`) are invisible to backup tools scanning C:\ (`ipc/worktree-logic.ts:90-128`) — document or relocate consciously.
8. Execution-host identity model `local | ssh:<targetId> | runtime:<environmentId>` with worktree hostId precedence over repo inference is the join key between local/WSL and SSH/VM worlds (`shared/execution-host.ts:3-14, :51-57, :142-164`) — reuse it as THE host identifier in new features instead of inventing parallel enums. Ephemeral VMs ride reserved `runtime-ssh-` ids and must be filtered by enumerating tooling (:59-67).

EVIDENCE: discovery/fabrica-app/fa-wsl-remote-execution.md §12 risk register (items renumbered above), §0/§11.
STATUS: hygiene-passed only (R4-4.3); recommend a wave-8 spot verification before hard commitments cite line numbers.
```

## FA-N6 — Telemetry/diagnostics: privacy posture is keep-as-is; clear the 11-item rebrand leak register

**Target board:** Fabrica-app
**Source:** `discovery/fabrica-app/fa-telemetry-consent.md` — VERIFIED-PASS

```
TASK: During After-Rebrand, treat telemetry as a naming/migration problem, NOT an architecture problem — then clear every leak surface below.

KEEP (posture is already strong; do not redesign):
- Two isolated lanes ("nothing in src/main/telemetry/ imports from src/main/observability/ and vice versa" — observability/index.ts:6-11; wired at index.ts:2305, :2330-2331).
- Transmission requires BOTH compile-time constants (TELEMETRY_ENABLED true literal — client.ts:20-21; CI-injected FABRICA_BUILD_IDENTITY + FABRICA_POSTHOG_WRITE_KEY — electron.vite.config.ts:31-59, :274-282); no runtime env override can enable it; packed-app verify script config/scripts/verify-telemetry-constants.mjs:1-27.
- Consent resolver precedence incl. DO_NOT_TRACK, fail-closed pending_banner (`telemetry/consent.ts:76-109`; missing block fails closed :97-99). Keep DO_NOT_TRACK untouched during rename (consent.ts:77-80).
- Zod `.strict()` event schemas (~80 events) blocking raw error_message/error_stack off the wire (`shared/telemetry-events.ts:4, :367-374`; sole exception capped at 200 chars :773-778); burst caps 30/min per event (20/min agent_error), 1,000/session (`burst-cap.ts:1-16`).
- Diagnostics triple redaction + server-side install_id dropping + join-incompatible random submission IDs (`redactor.ts:17-42, :65-71`; bundle.ts:177-185; index.ts:193-197).
- Crash reporting fully custom, zero crashReporter usage, user-initiated only (`feedback.ts:17`; crash-reporting.ts:192-205).

CLEAR (11 leak surfaces — highest risk first):
1. Hardcoded endpoint https://www.onfabrica.dev/v1/feedback (feedback.ts:17)
2. Privacy doc URL https://www.onfabrica.dev/docs/telemetry (renderer lib/telemetry.ts:11)
3. Brand-prefixed event names app_starred_FABRICA etc. — renaming breaks PostHog funnels; use NEW event names per breaking-change convention (telemetry-events.ts:1424, :1427, :1469-1471)
4. Common prop FABRICA_channel on EVERY event+bundle (client.ts:62; telemetry-events.ts:1647; bundle.ts:48, :84)
5. Build-constant names + CI secrets + verify-script regexes must sync atomically (electron.vite.config.ts:45-59, :274-282; build-constants.d.ts:12-22; verify-telemetry-constants.mjs:1-27)
6. Env kill-switch renames cascade into docs/settings search/i18n across ≥5 locales (consent.ts:82-84; diagnostics.ts paths; en.json:8951-8955)
7. Consent reason literals crossing IPC ('FABRICA_disabled') need atomic rename main/renderer/i18n/tests (telemetry-consent-types.ts:15; api-types.ts:797; renderer lib/telemetry.ts:24)
8. On-disk artifacts %TEMP%/FABRICA-diagnostic-bundle-previews, FABRICA-diagnostics-*.ndjson (diagnostics.ts:167, :173; feedback.ts:174)
9. PostHog project continuity vs new project → historical funnel loss decision (electron.vite.config.ts:41; client.ts:29-36)
10. Locale search keyword "posthog" exposed in Settings search (en.json:8968; privacy-search.ts:23)
11. Diagnostics dialog copy "going to FABRICA support" (diagnostic-upload-endpoint.ts:24-25)

Items 5-8 merge into R4-1.15's broader FABRICA_* env-var/data-dir register (per report lines 345-347).

EVIDENCE: discovery/fabrica-app/fa-telemetry-consent.md §3-§11 (~60 cites; wave-4 spot verification PASS).
STATUS: verified finding.
```

---

# SECTION E — Execute Guard Stack & Task Model Sequencing

## FA-N7 — Port the MC execute-guard stack as ONE ordered boundary layer

**Target board:** Fabrica-app
**Source:** `discovery/mission-control/mc-execute-guards.md` — VERIFIED-PASS

```
TASK: Implement the single composed guard stack at the IPC boundary (digest FA-T2, enforcement point register-core-handlers.ts:109-234) using mission-control's execute route as the reference for LAYER ORDER, not implementation style.

PORT AS-IS (patterns with donor cites):
1. Server-side risk table + "iron claw" — HIGH risk always requires approval even at full autonomy; `custom` always requires approval (`field-ops-security.ts:22-68`, esp. :53-55). Generalize to a destructive-agent-action taxonomy computed server-side at action-creation time.
2. Bypass detection as a named audited predicate invoked inside EVERY state-mutating handler (`field-ops-security.ts:104-126`; tasks/route.ts:204-220).
3. FSM-enforced status enums — map to typed Rust enums where applicable (`field-ops-security.ts:73-90`).
4. Sliding-window rate limiters made ATOMIC and persisted to SQLite (MC's is in-memory w/ check-then-act race — fix while porting) (`field-ops-security.ts` §5 of report).
5. Spend-limit ladder + pauseOnBreach fleet-wide brake as runaway-cost control (FA-T7 pairing) (`spend-tracker.ts:70-132`; breach pauses EVERY active mission in one mutexed mutation — execute/route.ts:190-200).
6. Circuit breaker dual placement (pre-check 409 + post-failure re-eval; trip = 3 consecutive failures, reset on any completed) around every agent-run dispatch loop (`tasks/route.ts:222-255`; execute/route.ts:507-532; field-ops-security.ts:158-176).
7. Decrypt-at-use / verify-always / zeroize-after / sanitized logging into the FA AI Vault (`route.ts:334-358, :375-396, :432-438`; vault-crypto.ts:29-39, :146-168).
8. Owner guard as structural role check rejecting agent-originated calls (`owner-guard.ts:23-30`).

FIX-BEFORE-PORT (do NOT replicate these MC defects):
a. Execute route has NO owner/agent check — services without credentialId run with zero auth beyond middleware (route.ts:101-208 vs owner-guard.ts:20-63). Put the owner check ON the execute-equivalent handler.
b. Creation-path approval hole: tasks can be BORN approved via POST accepting status verbatim (validations.ts:400; tasks/route.ts:109). Forbid creating actions already past their approval gate.
c. Batch approve bypasses bypass-detection (field-ops-security.ts:74) — identical transition+bypass gates on every mutation path incl. bulk.
d. Expired credentials still execute — enforce expiry at point of use.
e. Unlimited wrong-password retries on the password path (no rate limiter; scrypt ~100ms is the only throttle, vault-crypto.ts:30) — wire rate limiting onto it.
f. Dead config SOFT_LIMIT / DELAY_PER_ATTEMPT_MS declared but never referenced (independently reproduced during verification) — delete or implement dead config; don't ship decorative knobs.
g. Ad-hoc adapter invocation outside the guard stack (/wallet synthesizes an approved task and calls adapter.execute directly — wallet/route.ts:115-142): restrict ad-hoc capability probes to read-only/dry-run.

EVIDENCE: discovery/mission-control/mc-execute-guards.md §14 weakness register, §15 port map (~120 cites; wave-5 spot verification PASS).
STATUS: verified finding.
```

## FA-N8 — Adopt decision-queue interaction pattern; fix defects in port

**Target board:** Fabrica-app
**Source:** `discovery/mission-control/mc-decision-gates.md` — VERIFIED-PASS

```
TASK: Build Fabrica's operator-intervention layer on mission-control's decision-queue SHAPE — verdict from source report: "HIGH fit as the interaction pattern."

PORT THESE PATTERNS:
1. Block-with-payload error responses: MC's manual-run API returns 400 embedding the FULL oldest pending DecisionItem so the UI modal renders without an extra fetch (`api/tasks/[id]/run/route.ts:96-124`). IPC equivalent: main replies { blockedByDecision } with the whole intervention object attached.
2. Intercept-and-rerun loop: failed run w/ pendingDecision payload opens dialog instead of error toast; on answer, dialog closes and re-invokes run automatically (`use-active-runs.ts:116-144, :146-155`; decision-dialog.tsx:77-78). Maps 1:1 onto Fabrica's run-start button flow.
3. Multi-surface ambient awareness without new infra: sidebar badge (10s poll), dashboard widget, derived "awaiting-decision" agent-status (`page.tsx:100-127`) — portable trick: derive state from the set of blocked ids.
4. Structured escalation questions with fixed option trio (Retry-with-different-approach / Skip-task / Stop-mission) + error forensics injected into context, auto-created after MAX_LOOP_ATTEMPTS=3 daemon loop failures (`scripts/daemon/run-task.ts:485-544`, constant :374).
5. Answers-as-prompt-context: operator answer injected verbatim into every future prompt of that task wrapped in imperative do-not-repeat fencing ("Retry Instructions - Read Carefully") (`prompt-builder.ts:264-321`; appended :497-499).

SCHEMA REFERENCE: DecisionItem = id/requestedBy/taskId/question/options/context/status(pending|answered)/answer/answeredAt/createdAt (`types.ts:304-318`); Zod limits CONTEXT 5000 / QUESTION 500 / ANSWER 500 / MAX_OPTIONS 20 (`validations.ts:47-62`).

FIX-BEFORE-PORT:
a. No consumption marker exists — answered decisions re-inject FOREVER and only the LATEST answer is used (W4/W5, prompt-builder.ts:287-297, :497-499). Add applied-after-first-injection semantics + inject the full ordered answer chain.
b. File+mutex storage races cross-process with raw fs daemon writes (W2, run-task.ts:538 vs data.ts:353-356/:184) — use a transactional store keeping the JSON schema shape; make resumption event-driven, not 300ms-delay + polling (W6).
c. No auth on decisions endpoints (W1), silent unaudited DELETE (W3, route.ts:129-141), duplicate-guard checks pending-only so failures churn unbounded duplicates (W7, run-task.ts:512-516), no TTL on pending decisions (W9), script drift writes invalid status:"dismissed" that vanishes from all views (W8, fix-stuck-tasks.js:26-34) — enumerate real dismissed/expired statuses, audit deletes, dedupe across full history.
d. Design note: keep BOTH intervention tiers sharing ONE UI surface — generic decision queue (task-progress level, freeform) vs risk-tiered execution approvals (FA-N7); MC splits them across two UIs, fragmenting operator attention.

EVIDENCE: discovery/mission-control/mc-decision-gates.md §4-§10 (six blocking enforcement points mapped; wave-7 spot verification PASS).
STATUS: verified finding.
```

## FA-N9 — Use MC's dual task domain as the skeleton of Fabrica's core task model

**Target board:** Fabrica-app
**Source:** `discovery/mission-control/mc-fieldtask-kanban.md` — VERIFIED-PASS

```
TASK: Adopt mission-control's two-domain task split as the skeleton of Fabrica's core task model — verdict from source report: "HIGH fit as the SKELETON of Fabrica's core task model."

MODEL TO ADOPT:
- Domain 1 — human planning: regular Task + kanban (exactly three states, free any-to-any dnd, no FSM; only derived rule = completedAt stamping) + Eisenhower priority quadrants (`status-board/page.tsx:74-82`; `api/tasks/route.ts:329`; quadrant helpers types.ts:387-414). This is the "user gives goals" surface.
- Domain 2 — machine execution: FieldTask with an 8-state allow-list FSM (draft/pending-approval/approved/executing/awaiting-signature/completed/failed/rejected; transitions field-ops-security.ts:73-82) + risk-tiered approvals + owner-only approve/reject + bypass detector (draft→approved = 403) + circuit-breaker pre-check (`api/field-ops/tasks/route.ts:170-257`). This is the agent-action execution contract.
- Bridge between domains: FieldTask.linkedTaskId → Task.id (`types.ts:464`) and reverse Task.fieldTaskIds (`types.ts:176`), auto-maintained on creation (`api/field-ops/tasks/route.ts:147-165`).
- Coordination without transport infra: delegation-as-inbox-message — assignment side effect posts a "delegation" InboxMessage + ActivityEvent; completion triggers an agent completion-report message back to "me"; dependency-unblock notifications close the loop (`api/tasks/route.ts:39-59, :302-307, :104-128, :130-162`). blockedBy lists + unblock notification are sufficient for DAG-ish flows.
- Persistence pattern worth keeping: per-file mutex lock-read-mutate-write (`data.ts:458-471`).
- Pre-flight gating precedent: regular-task run route performs 7 ordered checks incl. "no pending DecisionItem for this taskId", returning 400 with the oldest pending decision embedded (`api/tasks/[id]/run/route.ts:97-124`) — pairs with FA-N8.

FIX-BEFORE-PORT:
1. No assignment integrity — AgentRole accepts any string, no FK validation against agents.json (validations.ts:13); typo'd assignee silently accepted. Replace string-role assignment with registry-resolved agent references (Fabrica has the registry: TUI agent catalog, see FA-N1).
2. Kanban has no guardrails — risky if agents ever write kanban directly; decide agent-write policy explicitly.
3. FieldTask.blockedBy never enforced by any run gate — add the gate if porting blockedBy.
4. scheduledFor is dead (declared, zero consumers repo-wide) — wire a scheduler or drop it; do not port dead fields.
5. Zod/type enum drift on awaiting-signature: create/update schema omits it (validations.ts:365 vs types.ts:420 — independently reproduced during verification). Have ONE source of truth for state enums.
6. No numeric priority or due-date enforcement on the field side — Fabrica's multi-agent scheduling likely needs priority/queue fields; add them deliberately.
7. Approval identity hardcodes actor === "me" (`owner-guard.ts:23-30`) — no delegation-of-approval or approver roles; design multi-operator approval consciously.
8. Two activity logs + two inboxes bridged ad hoc by field-ops-notify.ts — consolidate rather than re-port the bridge.
9. ID generation via Date.now() risks collision under burst writes — use uuid/cuid.

EVIDENCE: discovery/mission-control/mc-fieldtask-kanban.md §10 (~120 cites across 20 files; wave-7 spot verification PASS).
STATUS: verified finding.
```

## FA-N10 — Sequencing note tying guard stack + decision queue + task model together

**Target board:** Fabrica-app
**Sources:** `discovery/mission-control/mc-execute-guards.md`, `mc-decision-gates.md`, `mc-fieldtask-kanban.md` — all VERIFIED-PASS

```
NOTE (for whoever sequences the MC-pattern ports): the three donor systems interlock and should land in a deliberate order:

1. Task model first (FA-N9): define the two-domain skeleton + ONE source of truth for state enums. Everything else hangs off these states.
2. Guard stack second (FA-N7): the ordered boundary layers operate ON the FieldTask-style FSM states (transitions, approvals, bypass detection, circuit breaker). Porting guards before the FSM exists invites hand-inlined per-route guard copies — exactly the MC implementation flaw the report warns against ("MC's middleware→per-route→hand-inlined split produced the §14 inconsistencies; use it as reference for layer ORDER not style").
3. Decision queue third (FA-N8): its blocking enforcement points hook into run entry points that only exist once the task/run model lands; its escalation option trio and answer-injection feed the same prompts the runner (FA-N1) executes.

Cross-cutting acceptance criteria: every state-mutating handler carries the named bypass predicate; no action can be created past its approval gate; one enum definition per state machine; operator answers have consumption semantics; rate limiters atomic+persisted.

EVIDENCE: synthesis of the three wave-5/7 reports above.
STATUS: verified findings, sequencing judgment by Atlas R4-3.4.
```
