# Cross-Project Feed Notes v3 — Chain-Dispatch/Reconciler · Dual-Task-Domain · Decision-Queue

> **Task:** ATLAS R5-3.6 (Group 3, Round 5) · task_8a072682604a · dispatch ctx_f698a6130cf6
> **Purpose:** Paste-ready task notes distilled from the FINAL Round 4/5 deep-dive reports, formatted so an orchestrator can drop each note directly into a target project's board WITHOUT reading the source reports. Every note is self-contained: context, the ask, citations, evidence status.
> **Successor to:** `cross-project-notes-r4.md` (v2, notes FA-N1…FA-N10). This file continues the numbering at **FA-N11** so both feeds can coexist in target boards without collision.
> **Primary target:** `Fabrica-app/` (the After-Rebrand codebase). `_sources/mission-control` appears only as donor pattern.
> **Path notice:** citation paths are relative to `_sources/mission-control/mission-control/` unless prefixed otherwise. Pre-2026-08-21 docs omit the `Fabrica-atlas/` prefix (see AGENTS.md path-migration notice).

---

## Verification Status Legend & Summary

| Status | Meaning |
|---|---|
| VERIFIED-PASS | Dedicated spot-verification pass vs sources found 0 conclusion-affecting citation failures |

| Source report | Verify pass | Status |
|---|---|---|
| `discovery/round4/mc-chainedispatch-reconciler.md` | `verify/round5-wave3-spot-verification.md` | VERIFIED-PASS — 47 citation clusters sampled: 44 exact, 2 substantively-correct-with-minor-line-drift, **1 citation failure (F-1)** that does NOT affect any conclusion (report §7.3 claims run-task.ts probes PID liveness at :360-363; it does not — probes confirmed only in MISSIONS-API/DISPATCHER/INDEX/HEALTH). Coverage-statement line counts 8/8 exact |
| `discovery/round4/mc-fieldtask-kanban.md` | `verify/round4-wave7-spot-verification.md` | VERIFIED-PASS — 34 sample groups (>60 cites): 33 EXACT, 1 MINOR (bulk-route completedAt stamping actually at bulk/route.ts:22-24, cited :16-20 — behavior claim correct), 0 FAILED. Headline findings independently reproduced incl. kanban no-FSM, awaiting-signature enum drift (validations.ts:365 vs types.ts:420), dead `scheduledFor` |
| `discovery/round4/mc-decision-gates.md` | `verify/round4-wave7-spot-verification.md` | VERIFIED-PASS — 30 sample groups (>55 cites): 28 EXACT, 2 MINOR (F2 factual: report §2.3 mischaracterizes `withDecisions` as read-mutate-save — actually a legacy read-only-in-lock helper per data.ts:377-380; does NOT affect blocking/injection mechanics used below. F3 cosmetic off-by-one), 0 FAILED. Negative-evidence claim independently reproduced: only behavioral reader of a decision's answer is buildRetryContext |

**Carry-forward caveats when citing these reports downstream:**

1. chainedispatch §7.3 — do NOT cite run-task.ts as a PID-liveness probe site (F-1).
2. fieldtask-kanban §3.2 — cite bulk/route.ts:22-24 for completedAt stamping (F1).
3. decision-gates §2.3 — `mutateDecisions` (data.ts:528-535) is the real read-modify-write path; `withDecisions` is legacy read-only (F2).

---

## How To Use These Notes

Each note has: **Target board**, **Source** (with verification status), and a **paste-ready body** in a fenced block an orchestrator can copy verbatim into a target board task or note. Citations are already embedded inside the bodies.

All three source repos are READ-ONLY donors; every note targets `Fabrica-app`.

---

# SECTION A — Fleet Orchestration (chain-dispatch + reconciler patterns)

## FA-N11 — Adopt the file-ledger relay-chain architecture for fleet wave execution

**Target board:** Fabrica-app
**Source:** `discovery/round4/mc-chainedispatch-reconciler.md` — VERIFIED-PASS (R5-2.9)

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

EVIDENCE: discovery/round4/mc-chainedispatch-reconciler.md sections 1-4, 7, 9 (spot verification
PASS: verify/round5-wave3-spot-verification.md - 47 clusters, 0 conclusion-affecting failures).
STATUS: verified finding.
```

## FA-N12 — Dual-trigger poll-based reconciler with grace period as fleet self-healing

**Target board:** Fabrica-app
**Source:** `discovery/round4/mc-chainedispatch-reconciler.md` — VERIFIED-PASS (R5-2.9)

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

EVIDENCE: discovery/round4/mc-chainedispatch-reconciler.md sections 5-7, section 9 items 2/5/6
(verify/round5-wave3-spot-verification.md PASS).
STATUS: verified finding.
```

## FA-N13 — Two-tier retry ladder + restart-context injection into agent prompts

**Target board:** Fabrica-app
**Source:** `discovery/round4/mc-chainedispatch-reconciler.md` — VERIFIED-PASS (R5-2.9)

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

EVIDENCE: discovery/round4/mc-chainedispatch-reconciler.md sections 4.1-4.2, 8, 9 items 3-4
(verify/round5-wave3-spot-verification.md PASS).
STATUS: verified finding.
```

# SECTION B — Fabrica Core Task Model (dual-task-domain)

## FA-N14 — Two parallel task domains: human planning tasks vs machine-executed agent actions

**Target board:** Fabrica-app
**Source:** `discovery/round4/mc-fieldtask-kanban.md` — VERIFIED-PASS (R4-2.9)

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

EVIDENCE: discovery/round4/mc-fieldtask-kanban.md sections 1, 7.2, 8, 9, 10-strengths
(verify/round4-wave7-spot-verification.md PASS - FSM diagram reproduced verbatim from source,
bypass/circuit-breaker cites exact).
STATUS: verified finding.
```

## FA-N15 — Dual-domain fix-before-port register (9 verified gaps to close in Fabrica's port)

**Target board:** Fabrica-app
**Source:** `discovery/round4/mc-fieldtask-kanban.md` — VERIFIED-PASS (R4-2.9) · full citation re-check R5-2.14 (`verify/feed-notes-r5-citation-check.md`): items 1-8 EXACT, item 9 FAILED as originally written (F-1) and corrected in the body below

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
9. DAEMON TIMESTAMP IDS (corrected per F-1, verify/feed-notes-r5-citation-check.md): generateId
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

EVIDENCE: discovery/round4/mc-fieldtask-kanban.md sections 2-5, 8.4, 10
(verify/round4-wave7-spot-verification.md PASS; re-check verify/feed-notes-r5-citation-check.md:
items 1-8 EXACT, item 9 corrected per F-1).
STATUS: verified finding (items 1-8); item 9 corrected against source.
```

# SECTION C — Operator UX (decision-queue interaction pattern)

## FA-N16 — Decision-queue interaction pattern for operator intervention during autonomous runs

**Target board:** Fabrica-app
**Source:** `discovery/round4/mc-decision-gates.md` — VERIFIED-PASS (R4-2.9)

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

EVIDENCE: discovery/round4/mc-decision-gates.md sections 1-8, 10-patterns
(verify/round4-wave7-spot-verification.md PASS; six-block enforcement points and
buildRetryContext text reproduced verbatim from source).
STATUS: verified finding.
```

## FA-N17 — Decision-queue fix-before-port register (verified weaknesses W1-W11, subset blocking port)

**Target board:** Fabrica-app
**Source:** `discovery/round4/mc-decision-gates.md` — VERIFIED-PASS (R4-2.9)

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

EVIDENCE: discovery/round4/mc-decision-gates.md sections 2.3, 4.8, 9, 10-fix-list
(verify/round4-wave7-spot-verification.md PASS; F2 caveat recorded above).
STATUS: verified finding.
```

---

## Scan Coverage Statement

**Inputs read in full for this synthesis:**
- `AGENTS.md` (board instructions, in-context)
- `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` (Checkpoint + Group 3 table + verification tracker; lines 1-456 shown of larger file - remainder is Session Ledger continuation, not needed for this task)
- `discovery/round4/mc-chainedispatch-reconciler.md` (complete, 219 lines)
- `discovery/round4/mc-fieldtask-kanban.md` (complete, 292 lines)
- `discovery/round4/mc-decision-gates.md` (complete, 289 lines)
- `verify/round5-wave3-spot-verification.md` (complete, 179 lines)
- `verify/round4-wave7-spot-verification.md` (complete, 130 lines)
- `analysis/cross-project-notes-r4.md` (first 80 lines - format/numbering conventions only)

**Not read (deliberately):** all other discovery/verify reports (their findings enter only via the two verification reports' verdicts); source repos (`_sources/`, `../Fabrica-app/`) were NOT re-scanned - all citations are inherited from the three VERIFIED-PASS source reports and their verify passes, with each note marked accordingly.

**Write zone honored:** output written ONLY to `.Fabrica-atlas-board/analysis/cross-project-notes-r5.md` (+ Checkpoint/task-table update in `Fabrica-atlas-tasks.md`). No file under `_sources/` or `Fabrica-app/` touched.



