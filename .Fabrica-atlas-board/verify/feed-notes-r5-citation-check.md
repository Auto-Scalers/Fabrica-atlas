# R5-2.14 — Citation-Trail Verification of `analysis/cross-project-notes-r5.md` (FA-N11..N17)

**Task:** ATLAS R5-2.14 (Group 2, Round 5) · hand-prompted worker session
**Target of verification:** `.Fabrica-atlas-board/analysis/cross-project-notes-r5.md` — the Round-5 feed notes destined for the Fabrica-app board
**Method:** every file:line anchor in each paste-ready note body was re-opened directly against the underlying `_sources/mission-control/mission-control/` source files (not just against the discovery reports). READ-ONLY on sources throughout.
**Date:** 2026-08-23

---

## Why this pass exists

FA-N11..N17 will be pasted into the Fabrica-app board **without** the source reports attached, so their embedded citations must stand on their own. This pass therefore skipped the intermediate layer where possible and verified each anchor against raw source code.

---

## Per-Note Verdicts

### FA-N11 — File-ledger relay-chain architecture — ✅ PASS (0 FAILED, 0 MINOR)

| Claim in note | Source check | Result |
|---|---|---|
| POST `/api/projects/[id]/run` creates mission, persists BEFORE spawning (`:189-190`), detached spawn block (`:197-221`), route span `:76-232` | `src/app/api/projects/[id]/run/route.ts:76-232` — push+writeJSON at :189-190, spawn loop :197-221 | EXACT |
| Chain handoff `handleProjectRunContinuation` RUNTASK:550-729; success path :1038-1051; catch path :1069-1081 ("chain advances even when runner threw") | `scripts/daemon/run-task.ts` — function :550-729; call in try block :1039-1051; call in catch :1069-1081 | EXACT |
| missions.json = durable ledger, ProjectRun schema TYPES:142-160; status enum running/completed/stopped/stalled | `scripts/daemon/types.ts` region + MissionEntry shape confirmed via api/missions/route.ts:12-33 (identical field set) | RESOLVED |
| active-runs.json = ephemeral registry, ActiveRunEntry RUNTASK:41-56 (pid/status/exitCode/costUsd/continuationIndex); written before spawn with pid:0; patched via onSpawned (:853, :940-950) | run-task.ts:41-56 interface; :853 `pid: 0 // Will be updated after spawn via onSpawned`; :940-950 onSpawned callback patches PID | EXACT |
| Continuations reuse parent runId `_c{N}` (:866-887) | run-task.ts:866 `` `${runId}_c${continuationIndex}` `` ; :887 activeRunId | EXACT |
| Stop semantics: kill trees w/ process.kill fallback (:47-66), revert in-progress to not-started (:123-135), stop route span PROJECT-STOP:70-142 | `src/app/api/projects/[id]/stop/route.ts` — killProcess tree-kill+fallback :47-66; revert loop :123-135; POST :70-142 | EXACT |
| Triple-duplicated predicate (run-task.ts:643-655 / api/missions/route.ts:155-168 / dispatcher.ts:398-413) already drifting; stalled-revival absent from API reconciler | All three filter blocks read; stalled→running revival present in run-task :566-569 and dispatcher :420-424, ABSENT in api/missions/route.ts | EXACT |
| Dep-wait ALL-vs-SOME (api/missions/route.ts:186-195 vs run-task.ts:699-704) | api/missions uses `.every(...)` :189; run-task uses `.some(depId => remainingIds.has(depId))` :703 | EXACT |
| Non-atomic chain-critical writes (plain writeFileSync run-task.ts:72-74, :103-105) vs daemon tmp+rename (dispatcher.ts:69-77; health.ts:252-261) | writeActiveRuns/writeProjectRuns plain writeFileSync; saveRetryQueue tmp+renameSync :69-77; HealthMonitor.flush tmp+rename :252-261 (comment at :250) | EXACT (comment line 250, cosmetic) |

### FA-N12 — Dual-trigger poll-based reconciler — ✅ PASS (0 FAILED, 0 MINOR)

| Claim | Source check | Result |
|---|---|---|
| Frontend-poll reconciler `reconcileStuckMissions` GET /api/missions (route.ts:86-211); "heartbeat safety net … picks up the slack on the next frontend poll" quoted verbatim (:82-85) | `src/app/api/missions/route.ts` — function :86-211; comment block :81-85 contains the sentence verbatim (lines 83-84) | EXACT |
| Daemon copy `Dispatcher.pollProjectRuns()` (:331-461), wired at tail of every cycle (:171-175); revives stalled before spawning (:420-424) | dispatcher.ts:331-461; call at :172 inside `pollAndDispatch`; revive :420-424 | EXACT |
| Algorithm steps (route.ts:114-207): liveness probe signal-0 (:67-75), GRACE_PERIOD_MS = 30_000 (:79, skip at :125-129), completion recomputes completedTasks from tasks.json (:137-145, recompute at :141), global live-slot budget (:110-112 totalLiveProcesses; :172 slotsAvailable), stalled + causes (:203-207) | All verified line-exact in api/missions/route.ts | EXACT |
| Signal-0-only liveness + pid<=0 treated ALIVE ("just started, assume alive") at projects/[id]/run/route.ts:65 and api/missions/route.ts:68 | Both sites confirmed verbatim (`if (pid <= 0) return true; // PID 0 = just started, assume alive`) | EXACT |
| Zombie running rows never finalized: pruneOldRuns keeps running rows (run-task.ts:84); only stop route writes stopped (PROJECT-STOP:109-113) | run-task.ts:84 `if (run.status === "running") return true;`; stop route sets `stopped` :110-112 | EXACT |
| Queued-but-unpersisted overflow (PROJECT-RUN:167-170 computed, returned in response :224-231, persisted nowhere) | route.ts:168-170 slice into `queued`; response includes `queued:` ids :228; no persistence of queued list anywhere in file | EXACT |
| HealthMonitor.cleanStaleSessions() covers ONLY daemon-spawned sessions; runs every 60s per index.ts:192-196; run-task chain invisible to it | health.ts:196-206 iterates `activeSessions` (daemon-tracked only); index.ts:192-196 setInterval 60_000 calling it; run-task spawns never register with HealthMonitor | EXACT |

### FA-N13 — Two-tier retry ladder + restart-context injection — ✅ PASS (1 MINOR cosmetic)

| Claim | Source check | Result |
|---|---|---|
| Session continuation budget: `maxTaskContinuations ?? 2` (run-task.ts:839); `shouldContinue` gate (:963-965) | run-task.ts:839 and :963-965 exact | EXACT |
| appendTaskProgress :310-332; continuation spawned detached `--continuation N --run-id <id>` (:338-370); CONTINUATION SESSION resume-without-redo header (:912-927); validation deliberately skipped for continuations (:808-834) | All four regions verified line-exact | EXACT |
| Escalation: last-5 error history (:498-502); decision at >=3 attempts with Retry/Skip/Stop trio (:505-538); dedup guard pending-only (:512-516) | run-task.ts:494-502 (cap 5), :505 threshold, options :526-530, dedup :512-516 | EXACT |
| Restart-context injection: buildRestartContext renders taskHistory, "avoid duplicating work already done", prompt-builder.ts:217-262 wired :471/:491-499 | buildRestartContext :217-262 (phrase at :255 reads "avoid duplicating work that was already done"); buildTaskPrompt declared :471; restart wiring :491-495; retry wiring :497-499 | EXACT (quote paraphrase, substantively correct) |
| No priority sort inside chains; parallel launch up to slots (run-task.ts:**657-661**); Eisenhower ordering only in daemon polls (dispatcher.ts:104) | :657-661 is the **slot-calculation** block (`slotsAvailable`, `toSpawn`); the actual parallel spawn loop is :666-693. Substantive claim correct (no priority sort anywhere in :643-693); getPendingTasks Eisenhower sort confirmed behind dispatcher call at :104 | MINOR (line-range points at slot calc, not the spawn loop; conclusion unaffected) |
| Three independent attempt counters don't consult each other: health.getRetryCount (health.ts:169-172) gating dispatcher.ts:140-145 | health.ts:169-172 counts failed history entries; dispatcher.ts:141-144 retry-limit check | EXACT |
| Daemon retry backoff exponential `retryDelayMinutes * 2^(attempt-1)` capped 60 min (dispatcher.ts:83-86, :286-312) | getRetryDelayMinutes :83-86 (MAX_RETRY_DELAY_MINUTES=60 at :18); handleFailure :286-323 persists retryAt ISO timestamps | EXACT |

### FA-N14 — Dual task domains + FieldTask FSM — ✅ PASS (0 FAILED, 0 MINOR)

| Claim | Source check | Result |
|---|---|---|
| Task types.ts:159-185 (assignedTo :168, collaborators :169, fieldTaskIds :176); FieldTask types.ts:451-474 (assignedTo-only :458, linkedTaskId :464, blockedBy :465, scheduledFor :469) | `src/lib/types.ts` — both interfaces verified line-exact | EXACT |
| Storage split data/tasks.json (data.ts:203) vs data/field-ops/tasks.json (data.ts:628) | getTasks :203 `filePath("tasks.json")`; getFieldTasks :628 `fieldOpsPath("tasks.json")` | EXACT |
| KanbanStatus 3 states types.ts:3; free transitions — dnd direct update (status-board/page.tsx:74-82); PUT blind merge (api/tasks/route.ts:312-333) | types.ts:3; handleDragEnd `updateTask(task.id, { kanban: targetStatus })` :74-82; PUT spread-merge :325-327 | EXACT |
| FSM diagram draft/pending-approval/approved/executing/awaiting-signature/completed/failed/rejected (field-ops-security.ts:73-82); helpers isValidTransition :85-90, getTransitionError :93-102 | VALID_TRANSITIONS map reproduced verbatim in source :73-82; helpers exact | EXACT |
| Risk map TASK_TYPE_RISK payment/ad-campaign/crypto-transfer high, email/social/publish medium, design low (:22-31); service elevates never lowers (:34-43); requiresApproval HIGH always true "iron claw" (:46-68, esp. :53-55) | field-ops-security.ts all verified; iron-claw comment at :53-54, high-return :55 | EXACT |
| Server-side approval enforcement on create, never trust client input (api/field-ops/tasks/route.ts:84-96); stored at :110 | Comment verbatim at :84; serverApprovalRequired written :110 | EXACT |
| Bypass detector: draft→approved w/ approvalRequired=true rejected 403 (:204-220; detector security.ts:111-126) | Route :204-220 returns 403; isApprovalBypassAttempt :111-121 (+error helper to :126) | EXACT |
| Circuit breaker: >=3 consecutive failed siblings auto-pauses mission, transition refused 409 (:222-255; shouldTripCircuitBreaker :161-176, resets on any completed) | Route :222-255 (auto-pause :230-237, 409 :250-253); security.ts:161-176 with completed-reset :171-172 | EXACT |
| Owner-only approvals requireOwner (owner-guard.ts:20-63): rejects actor !== "me" (:23-30), vault session or masterPassword scrypt path | owner-guard.ts verified; vault-session check :33, password verify :47-61 | EXACT |
| AutonomyLevel feeds requiresApproval at creation (types.ts:576-583 ApprovalConfig); autonomy/status changes owner-gated (api/field-ops/missions/route.ts:100-104) | types.ts:576-583; missions route owner gate :101-104 | EXACT |
| Bridge: linkedTaskId→Task.id, reverse fieldTaskIds[] auto-maintained best-effort (route :147-165); results/approvals flow back via notify helpers (field-ops-notify.ts:22-85, :90-147; wired route :347-366) | Cross-link try/catch block :147-165; notifyFieldTaskCompleted :22 / Failed :55 / Approved :90 / Rejected :120 / logFieldOpsActivity :155; bridge calls :347-366 | EXACT |

### FA-N15 — Fix-before-port register (9 gaps) — ❌ FAIL on item 9 (F-1); items 1-8 PASS

| Item | Source check | Result |
|---|---|---|
| 1. AgentRole accepts any string 1..50, no FK validation (validations.ts:12-13); runtime resolution binary delegated-vs-mine (api/tasks/[id]/run/route.ts:53-58); only capability gate FieldOpsService.allowedAgents (types.ts:507) | agentRoleEnum `z.string().min(1).max(50)` :13; run-route refusal :53-58; allowedAgents :507 | EXACT |
| 2. Kanban any-to-any, zero validation (PUT blind merge :312-333; dnd :74-82) | Verified (see FA-N14) | EXACT |
| 3. FieldTask.blockedBy never enforced (types.ts:465, max 50 validations.ts:407); contrast regular-task dep check api/tasks/[id]/run/route.ts:83-94 | blockedBy field + MAX_BLOCKED_BY cap; run route dependency check :83-94 re-reads tasks.json; grep of field routes shows no equivalent gate | EXACT |
| 4. scheduledFor dead: declared types.ts:469, schema validations.ts:408/:430, create write route :119 | All cites exact; repo-wide consumer absence consistent with mc-fieldtask-kanban §8.4 finding (dispatcher.ts:498-500 respects scheduledFor only for approved field tasks pre-execution — not a scheduler for the field itself; does not rescue the "dead scheduler" framing) | EXACT |
| 5. Enum drift: zod create/update enum omits awaiting-signature (validations.ts:365 = 7 states) vs types.ts:420 = 8 states | fieldTaskStatusEnum :365 lacks awaiting-signature; FieldTaskStatus :420 includes it | EXACT |
| 6. No numeric priority/queue fields | Consistent with types.ts (no such fields on Task/FieldTask) | RESOLVED |
| 7. Approver single-owner: requireOwner hardcodes actor === "me" (owner-guard.ts:23-30) | Exact | EXACT |
| 8. Two activity logs + two inboxes bridged ad hoc by field-ops-notify.ts | field-ops-notify.ts bridges into inbox/activity-log; separate fieldOpsActivityLog mutex data.ts:193 confirms dual logs | EXACT |
| **9. "UUID IDS: generateId uses Date.now() (collision risk under burst writes)"** | **FALSE.** `src/lib/utils.ts:10-12`: `generateId(prefix)` returns `` `${prefix}_${nanoid(12)}` `` (nanoid imported utils.ts:3). Only ONE definition of generateId exists in src/. Date.now()-based ids exist only in DAEMON scripts (e.g. `mission_${Date.now()}` projects/[id]/run/route.ts:173; `dec_${Date.now()}` run-task.ts:522; `msg_`/`evt_` run-task.ts:177/:203) — not in generateId. | **FAILED (F-1)** |

Items in KEEP-AS-IS and DELEGATION LOOP blocks: data.ts mutex registry :176-197, mutateTasks lock-re-read-mutate-write :463-471, lock-free GETs :199-208, archive tier :210-217/:317-321, bulk-in-one-transaction api/tasks/bulk/route.ts:6-31 (completedAt stamping :22-24 — matching the wave-7 F1 correction), batch caps 1..50 validations.ts:525-530, handleDelegation :39-59 / handleCompletion :104-128 / handleUnblocking :130-162 — **all verified EXACT**.

### FA-N16 — Decision-queue interaction pattern — ✅ PASS (0 FAILED, 0 MINOR)

| Claim | Source check | Result |
|---|---|---|
| DecisionItem schema types.ts:303-318; DecisionStatus union types.ts:301; zod limits question<=500 / answer<=500 / options<=20 / context<=5000 (validations.ts:47-62, create schema :235-243) | All exact | EXACT |
| SIX enforcement points: manual run API 400 w/ full pending item (:96-124); dispatcher silent skip (dispatcher.ts:134-138); run-task hard exit (:828-834); chain-dispatch filter (run-task.ts:643-655, decision check :650); venture launch pre-validation (api/ventures/[id]/run/route.ts:118-139, comment "fixes toast count bug" at :118); reconciler exclusion (api/missions/route.ts:91-99 set-build, :164 check); taskId:null never blocks | Every point verified line-exact, including the ventures toast-count comment verbatim | EXACT |
| Intercept-and-rerun: use-active-runs.ts intercept :125-131 within runTask :116-144; re-invoke original run call :146-155 | Hook verified: stores pendingDecision + taskId ref, opens dialog; handleDecisionAnswered re-invokes runTask | EXACT |
| Ambient awareness: use-sidebar.ts:15 10s poll; api/sidebar counts pending :17, response field :22; page.tsx attention row :145 + widget card :617-621; awaiting-decision derivation page.tsx:100-127, impeded counts :113-115; activity chips activity/page.tsx:38-39/:56-57 | All verified (POLL_INTERVAL=10_000 at :15; yellow decisions row :145; Decisions Widget :617-621; withDecisions/impededCount :113-115; yellow/emerald chips :56-57) | EXACT |
| Structured escalation trio ["Retry with a different approach","Skip this task and continue mission","Stop the entire mission"] with forensics in context (run-task.ts:485-544; options :526-530; forensics :518-519/:531) | Verbatim strings at :527-529; lastError :518-519; context embedding :531 | EXACT |
| Answers-as-prompt-context: buildRetryContext (prompt-builder.ts:264-321), fenced do-not-repeat section :298-316, unconditionally wired :497-499; negative evidence: no other reader of answer | Section rendered :298-316 ("You MUST take a DIFFERENT approach…" :312-314); unconditional call :498; negative-evidence claim consistent with decision-gates report §10 scan | EXACT |
| Audit trail: append-mostly record, Answered history /decisions page :177-206; events decision_requested :65-76 and decision_answered w/ answer in summary :111-124 | decisions/page.tsx Answered section :177-206; route event blocks exact | EXACT |

### FA-N17 — Fix-before-port register W1-W11 — ✅ PASS (0 FAILED, 0 MINOR)

| Weakness | Source check | Result |
|---|---|---|
| W2: API serializes via async-mutex (data.ts:184 decisions mutex; saveDecisions :353-356; **mutateDecisions :528-535 is the real read-modify-write**; NOTE F2: withDecisions :430-433 legacy read-only-in-lock, NOT write-back) | data.ts verified: withDecisions returns `fn(data)` with NO write-back :430-435 — the F2 caveat carried into the note is **accurate**; mutateDecisions re-reads + writes :528-535; daemon raw writeFileSync run-task.ts:538 | EXACT |
| W4/W5: only latest answered injected (prompt-builder.ts:297 `answered[0]`); re-injects forever, no consumed flag (:497-499) | Exact | EXACT |
| W6: no unblock event; fixed 300ms delay before auto re-run (decision-dialog.tsx:77-78) | `setTimeout(() => onAnswered(), 300)` with "let the write complete" comment :77-78 | EXACT |
| W8/W9: fix-stuck-tasks.js writes status:"dismissed" existing in NO schema (script :26-34 vs types.ts:301, validations.ts:17); pending blocks indefinitely (no TTL) | Script :26-34 verbatim `d.status = 'dismissed'`; DecisionStatus pending|answered only; hasPendingDecision keys off status==="pending" (prompt-builder.ts:579) | EXACT |
| W3: DELETE removes record, no ActivityEvent (api/decisions/route.ts:129-141) | DELETE :129-141 filters array, zero logging | EXACT |
| W7: dedupe checks pending only (run-task.ts:512-516) | `d.status === "pending"` guard :513-514 | EXACT |
| W1: no auth on any decisions endpoint (route.ts:7-141) | Full file read: GET/POST/PUT/DELETE contain no auth middleware or owner check | EXACT |
| W11: answers may be any free string regardless of options (validations.ts:248) | `answer: z.string().max(LIMITS.ANSWER).nullable().optional()` — no option-membership constraint | EXACT |
| Architecture note: two operator-intervention tiers, keep both, share one UI | Analytical recommendation, consistent with decision-gates §10 relationship note and fieldtask evidence | SUPPORTED |

---

## Header/Metadata Claims in the Notes File

| Claim | Check | Result |
|---|---|---|
| Verification-status table: chainedispatch VERIFIED-PASS via round5-wave3 (47 clusters, F-1 = phantom PID-liveness cite, corrected) | F-1 correction note present in mc-chainedispatch-reconciler.md §7.3 (:160); corrected text states run-task.ts has zero `process.kill` occurrences — independently confirmed by reading run-task.ts in full (only child-spawn logging, no kill probes) | ACCURATE |
| Carry-forward caveats 1-3 (don't cite run-task as liveness-probe site; cite bulk/route.ts:22-24 for completedAt; withDecisions legacy read-only / mutateDecisions real RMW) | Each independently reproduced against source during THIS pass | ACCURATE |
| fieldtask + decision-gates VERIFIED-PASS via round4-wave7 | Consistent with task-table status and the wave-7 findings summarized (bulk-route F1, withDecisions F2, off-by-one F3) | CONSISTENT |

---

## Findings Register

| ID | Severity | Location | Finding | Disposition |
|---|---|---|---|---|
| **F-1** | **FAILED — factual, conclusion-affecting for one register item** | cross-project-notes-r5.md **FA-N15 item 9** ("UUID IDS: generateId uses Date.now()…") | `generateId` uses **nanoid(12)**, not Date.now() (`src/lib/utils.ts:10-12`, nanoid import :3; sole definition in src/). The collision-risk concern IS valid but attaches to the *daemon-side* `Date.now()` ids (`mission_` projects/[id]/run/route.ts:173, `dec_` run-task.ts:522, `msg_`/`evt_` run-task.ts:177/:203), which are outside generateId. Defect originates in `mc-fieldtask-kanban.md` §10 gap 9 and was inherited verbatim. | Fix wording in FA-N15 item 9 (and optionally upstream report) to target daemon-side timestamp IDs instead of generateId. Mechanical correction recommended before/at feed time. |
| M-1 | MINOR — cosmetic line-range | FA-N13 mechanism 4, cite run-task.ts:657-661 for "all dispatchable tasks launch in parallel up to slots" | Lines 657-661 compute `slotsAvailable`/`toSpawn`; the actual parallel detached-spawn loop is :666-693. Claim correct, pointer imprecise. | Optional cite widening to :657-693. |
| M-2 | MINOR — cosmetic quote offset | FA-N11 anti-pattern 3 / report §2.3, health.ts "prevents corruption…" comment cited as :252-261 | Comment sits at :250; the atomic flush body is :252-261. Quote content verbatim-accurate. | None needed. |

---

## Totals

- **Citation clusters / anchors sampled: ~90 groups (~135 individual file:line anchors)** across 7 notes + header caveats
- **EXACT: 86** · **MINOR (cosmetic, conclusion unaffected): 2** (M-1, M-2) · **FAILED: 1** (F-1)
- **Note verdicts: FA-N11 PASS · FA-N12 PASS · FA-N13 PASS · FA-N14 PASS · FA-N15 FAIL (item 9 only; items 1-8 PASS) · FA-N16 PASS · FA-N17 PASS**
- All three carry-forward caveats in the notes header independently reproduced as accurate.

---

## Scan Coverage Statement

**Read in full:** `analysis/cross-project-notes-r5.md` (446 lines); `discovery/round4/mc-chainedispatch-reconciler.md` (219); `mc-fieldtask-kanban.md` (292); `mc-decision-gates.md` (289); `_sources/mission-control/mission-control/scripts/daemon/run-task.ts` (1090); `scripts/daemon/dispatcher.ts` (621); `src/app/api/missions/route.ts` (336); `src/app/api/projects/[id]/stop/route.ts` (142); `src/app/api/projects/[id]/run/route.ts` (232); `src/app/api/tasks/[id]/run/route.ts` (167); `src/app/api/decisions/route.ts` (141); `src/lib/owner-guard.ts` (64).

**Read in targeted regions:** scripts/daemon/health.ts (:150-269 + :189-198 index.ts), prompt-builder.ts (:205-329, :456-580), types.ts (:1-35, :158-187, :300-319, :410-479, :500-584), validations.ts (:1-70, :158-217, :230-264, :355-439, :522-533), data.ts (grep-verified structure + :198-222, :426-437), field-ops-security.ts (:1-130, :155-179), api/tasks/route.ts (:30-164, :260-329), api/tasks/bulk/route.ts (:1-55), api/field-ops/tasks/route.ts (:80-269, :340-369), decision-dialog.tsx (:58-87), use-active-runs.ts (:110-164), use-sidebar.ts (:1-40), status-board/page.tsx (:68-87), page.tsx (:96-145, :613-624), activity/page.tsx (:35-59), decisions/page.tsx (:175-209), fix-stuck-tasks.js (:20-44), utils.ts (:1-12).

**Grep-verified:** index.ts cleanStaleSessions cadence; data.ts mutex/save/mutate function map; field-ops-notify.ts export surface; ventures/[id]/run route decision pre-validation + toast-bug comment; api/sidebar route; generateId uniqueness sweep (single definition in src/).

**Not read (deliberately):** remaining daemon files (runner.ts, config.ts, logger.ts, types.ts full), remaining API/UI surfaces not cited by FA-N11..N17, buzz/Fabrica-app sources (out of scope — these notes cite MC only), other discovery/verify reports beyond the three named inputs.

**Not modified:** no files under `_sources/` or `Fabrica-app/`; output written only to `.Fabrica-atlas-board/verify/feed-notes-r5-citation-check.md` (+ Checkpoint/task-row update in `Fabrica-atlas-tasks.md`).
