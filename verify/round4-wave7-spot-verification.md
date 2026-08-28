# R4-2.9 — Wave-7 Spot Verification: mc-fieldtask-kanban.md + mc-decision-gates.md

**Task:** ATLAS R4-2.9 (Group 2, Round 4) - task_64125d54a6ee - dispatch ctx_88d0c5a5b3a1
**Date:** 2026-08-23
**Method:** sampled file:line citations from each report and re-read them against `_sources/mission-control/mission-control/` sources. Each cite checked for (a) file exists, (b) line number matches, (c) quoted content/behavior matches. READ-ONLY on sources; only this verify report written.

---

## Report 1 - discovery/round4/mc-fieldtask-kanban.md

### Sampled citations verified (34 sample groups; >60 individual cites re-checked)

| # | Report cite | Source finding | Verdict |
|---|---|---|---|
| 1 | types.ts:3 KanbanStatus 3 values | exact | EXACT |
| 2 | types.ts:159-185 Task entity + every field row of section 2 table (:160-:184 individually) | exact, all rows match | EXACT |
| 3 | types.ts:168-169 assignedTo/collaborators | exact | EXACT |
| 4 | types.ts:176 fieldTaskIds reverse link | exact | EXACT |
| 5 | types.ts:451-474 FieldTask + per-field rows :452-:473 (incl. :464 linkedTaskId, :469 scheduledFor) | exact | EXACT |
| 6 | types.ts:420 FieldTaskStatus 8 states incl. awaiting-signature | exact | EXACT |
| 7 | types.ts:387-414 quadrant helpers (:393-398 / :400-405 / :407-414 as sub-cited) | exact | EXACT |
| 8 | types.ts:507 FieldOpsService.allowedAgents | exact | EXACT |
| 9 | types.ts:576-583 ApprovalConfig | exact | EXACT |
| 10 | data.ts:203 tasks.json storage; data.ts:628 field-ops/tasks.json storage | exact readFile calls at both lines | EXACT |
| 11 | data.ts:463-471 mutateTasks lock-read-callback-write, implicit rollback | exact (rollback semantics documented at data.ts:461) | EXACT |
| 12 | data.ts:176-197 mutex registry; :199-208 lock-free reads; :377-380 legacy deadlock note; :210-217 + :317-321 archive tier; :671-678 approval-config default approve-all | all five exact | EXACT |
| 13 | field-ops-security.ts:73-82 VALID_TRANSITIONS FSM | exact - report FSM diagram reproduces the map verbatim incl. comments | EXACT |
| 14 | field-ops-security.ts:22-31 TASK_TYPE_RISK, custom comment "always requires approval regardless" at :30 | exact | EXACT |
| 15 | field-ops-security.ts:46-68 requiresApproval, iron-claw comment esp. :53-55, custom :57-58, autonomy branches :60-67 | exact | EXACT |
| 16 | field-ops-security.ts:111-126 isApprovalBypassAttempt draft-to-approved | exact (fn 111-121 + error helper 124-126) | EXACT |
| 17 | field-ops-security.ts:161-176 shouldTripCircuitBreaker threshold 3, resets on completed | exact | EXACT |
| 18 | field-ops-security.ts:136-145 TASK_STATUS_STYLES; :278-287 payload 10KB | both exact | EXACT |
| 19 | validations.ts:8 kanbanEnum identical to types.ts:3 | exact | EXACT |
| 20 | validations.ts:365 enum drift finding (7 states vs types.ts:420 8 states) | confirmed - line 365 lists exactly 7 states, awaiting-signature omitted | EXACT |
| 21 | validations.ts:90-137 task schemas + sub-cites :91 title max200, :93/:94/:95 defaults, :99 collaborators max20, :101-:105 caps, :110 dueDate max30 | all exact | EXACT |
| 22 | validations.ts:397 type default custom; :401 approvalRequired default true; :402-405 payload 10KB refine; :407 blockedBy max50; :408 + :430 scheduledFor; :378 mission tasks max200; :525-530 batch taskIds 1..50 | all exact | EXACT |
| 23 | api/tasks/route.ts:33-35 isAgent guard | exact | EXACT |
| 24 | api/tasks/route.ts:39-59 handleDelegation (+ inbox msg :43-50, event :52-58, skip-on-same-assignee :41); :61-102 collaborator diff; :104-128 handleCompletion (+ agent completion report :115-124); :130-162 handleUnblocking | all exact, function boundaries match | EXACT |
| 25 | api/tasks/route.ts:179-188 archive merge; :191-193 soft-delete filter; :213-222 quadrant filter; :271 generateId("task"); :302-304 + :305-307 POST side effects; :328 updatedAt; :329 completedAt pair; :342-344 assignee diff; :345-349 collaborator JSON-diff | all exact | EXACT |
| 26 | api/tasks/[id]/run/route.ts:53-58 agent gate; checks :42-50/:61-66/:69-80/:83-94/:97-124; detached spawn run-task.ts --source manual + --agent-teams from daemon-config execution.agentTeams :126-154 via process.execPath + tsx import | all exact (file = 167 lines, matches coverage claim) | EXACT |
| 27 | api/tasks/bulk/route.ts:6-31 one mutateTasks transaction; :35-52 bulk soft-delete | exact | EXACT |
| 28 | api/tasks/bulk/route.ts:16-20 completedAt stamping pair | DRIFT - completedAt logic actually at :22-24 (:16-20 is findIndex/spread). Claimed behavior is correct, lines off by 6 | MINOR |
| 29 | status-board/page.tsx:74-82 dnd drop issues updateTask(kanban) with no transition validation; :32-36 column configs; :69-72 grouping; :64-67 project filter; :149-160 bulk bar; :46-48 decision badges | all exact (file = 176 lines, matches coverage claim) | EXACT |
| 30 | task-card.tsx:11-19 dot+label; :56 dep kanban !== done; :66 overdue rule; :108 Run-button gating; :116-118 dot span | all exact | EXACT |
| 31 | task-detail-panel.tsx:125 auto-promote not-started to in-progress; :187 dep unfinished check | exact | EXACT |
| 32 | search-dialog.tsx:33-34; command-bar.tsx:216-220; goal-card.tsx:22; project-card-large.tsx:34-36 rollups + :52 delegated-open filter; eisenhower-summary.tsx:20 kanban !== done | all six exact | EXACT |
| 33 | api/field-ops/tasks/route.ts:69-74 missionId 400; :84-96 server-side approval comment + recompute; :87-91 risk lookup; :102 generateId ftask; :110 stored approvalRequired; :112 result init; :119 scheduledFor; :147-165 best-effort cross-link; :170-257 gates; :176-179 requireOwner; :182-202 FSM + security event; :204-220 bypass 403; :222-255 circuit breaker auto-pause 409; :274-291 actor stamps (actual block ends :292); :282-288 executedAt/completedAt; :304-345 structured events + durationMs; :347-366 notify bridge wiring | all exact or within 1 line (file = 402 lines, matches coverage claim) | EXACT |
| 34 | api/field-ops/missions/route.ts:49-53 + :100-104 owner gates; :117-128 completedAt mirror; :142-157 status events; :159-173 autonomy events; :197-208 orphan-on-delete; batch route actionStatusMap near top / owner check before mutation / per-task isValidTransition collecting failures / approvedBy-rejectedBy-rejectionFeedback stamps / per-task notifications; field-ops-notify.ts:22-85, :90-147, :155-174 recipient assignedTo fallback "me"; templates/instantiate/route.ts:95 scheduledFor null | all exact (missions = 225 lines, batch = 147 "~150", notify = 174 - all match coverage claims) | EXACT |

**Coverage statement check:** PRESENT and accurate. All 13 "fully read" files exist with the stated line counts (types.ts 675, validations.ts 571, data.ts 855, field-ops-security.ts 323, owner-guard.ts 64, field-ops-notify.ts 174, api/tasks/route.ts 398, run route 167, bulk ~55 [57 actual], field-ops tasks 402, missions 225, batch ~150 [147 actual], status-board 176). Targeted-grep component cites (row 30-32 above) all reproduced. Skipped-list consistent with non-overlap boundaries vs R4-1.6/R4-1.24.

---

## Report 2 - discovery/round4/mc-decision-gates.md

### Sampled citations verified (30 sample groups; >55 individual cites re-checked)

| # | Report cite | Source finding | Verdict |
|---|---|---|---|
| 1 | types.ts:301 DecisionStatus; :303-314 DecisionItem with per-field rows :304-:313 individually cited | exact, every row matches | EXACT |
| 2 | types.ts:316-318 DecisionsFile wrapper | exact | EXACT |
| 3 | types.ts:253-254 EventType decision_requested/answered; validations.ts:25-26 zod mirror | exact both files | EXACT |
| 4 | validations.ts:17 decisionStatusEnum; :47 CONTEXT 5000; :49 QUESTION 500; :50 ANSWER 500; :62 MAX_OPTIONS 20 | all exact | EXACT |
| 5 | validations.ts:235-243 create schema + sub-cites :237 default developer, :238 taskId nullable null, :239 question min1/max500, :240 options max20 strings max500 default [], :241 context max5000 default "", :242 createdAt max30 | all exact | EXACT |
| 6 | validations.ts:245-254 update schema requires id (:246), partial fields :247-253; W11 cite :248 answer free string max500 | exact | EXACT |
| 7 | data.ts:170 _writeJson single writer; data.ts:184 decisions Mutex in fileMutexes map | exact | EXACT |
| 8 | data.ts:264-270 getDecisions returns {decisions:[]} on missing file | exact | EXACT |
| 9 | data.ts:353-356 saveDecisions under mutex | content at cited lines correct (fn closes :357) | EXACT |
| 10 | data.ts:430-433 withDecisions described as read-mutate-save under one mutex hold | CONTENT ERROR: line range correct but description wrong. data.ts:377-380 states legacy with* helpers do NOT write back and save-inside would deadlock. Impact contained: report correctly says all API routes use mutateDecisions (:528-535 verified exact) | MINOR (factual) |
| 11 | run-task.ts:36 DECISIONS_FILE constant; raw writeFileSync :538 + warn log :539 (W2 cross-process race evidence) | exact | EXACT |
| 12 | run-task.ts:374 MAX_LOOP_ATTEMPTS = 3 | exact | EXACT |
| 13 | run-task.ts:485-544 escalation: duplicate guard :512-516 pending-only (W7), option trio :526-530 verbatim match, context embeds last error + attempts + agent id :518-519/:531, requestedBy agentId :523 | all exact | EXACT |
| 14 | run-task.ts:494-502 taskErrors last-5 x 200-char cap | exact | EXACT |
| 15 | run-task.ts:595-604 escalation invoked after every non-completed result | exact | EXACT |
| 16 | run-task.ts:453-463 local checkPendingDecision "to avoid circular deps"; :643-655 dispatchable filter w/ decision check at :650; stall wording :716/:725 | all exact | EXACT |
| 17 | run-task.ts:828-834 pre-exec guard hasPendingDecision -> process.exit(1), skipped for continuations :829 | exact | EXACT |
| 18 | dispatcher.ts:7 imports hasPendingDecision; :134-138 silent skip "waiting for decision"; ordering after deps :127-132 before retry-limit :140-145; decisions read :346-347 | all exact | EXACT |
| 19 | prompt-builder.ts buildRetryContext :264-321; null on missing file :271-272; answered filter + answeredAt-desc sort :286-293; empty->null :295; latest-only :297; prompt section :298-316 (answer :303, context.slice(0,300) :307-310, must-differ directives :312-314) | all exact, section text reproduced verbatim | EXACT |
| 20 | prompt-builder.ts wiring :497-499 unconditional in buildTaskPrompt (every task run); docstring names retry context :469; enforcePromptLimit :504; hasPendingDecision :577-579 | all exact | EXACT |
| 21 | api/tasks/[id]/run/route.ts step 6 of 8 (:96-124); readJSON :97-110; oldest-by-createdAt ascending [0] :112-114; HTTP 400 error text + embedded pendingDecision :115-123; check ordering matches source comments 1..8 | all exact | EXACT |
| 22 | api/ventures/[id]/run/route.ts:118-139 pre-validation "fixes toast count bug", set built :120-125, drop from dispatchable :137; projects/[id]/run direct decisions.json read at :120 | all exact | EXACT |
| 23 | api/missions/route.ts reconciler builds set :91-99, excludes blocked tasks :164 | exact | EXACT |
| 24 | api/decisions/route.ts POST :42-78 (zod :43, generateId dec :49, mutateDecisions push :47-62, status/answer/answeredAt forced :55-57, decision_requested summary slice(0,80) details=context :65-76, 201 :78) | exact (file = 141 lines, matches ":1-141 complete") | EXACT |
| 25 | api/decisions/route.ts PUT :81-127 auto-answer :90-93, wasAnswered :94, answeredAt only on transition :100, actor hard-coded "me" summary :111-124, returns item :126; GET :7-40 (:15-17, :19-23, :25-31, cache header :38); DELETE :129-141 hard delete NO ActivityEvent (W3) | all exact | EXACT |
| 26 | decision-dialog.tsx:61-69 PUT body; toast :74; fixed 300ms delay :77-78 (W6); options submitted verbatim :122-137; custom Input + Enter/Answer :139-161; AGENT_ROLES fallback + system special-case :41-45; relative time :47-55; muted context box :114-119 | all exact (file = 166 lines, matches coverage claim) | EXACT |
| 27 | active-runs-provider.tsx:11-25 wraps app, single DecisionDialog bound :17-22; use-active-runs.ts POLL_INTERVAL=3000 :8, polls /api/runs+/api/missions :24-29 + interval :77-81, dialog state :18-21, intercept :116-144 (:125-131), re-invoke runTask :146-155, hook return :249-253 | all exact (provider = 33 lines, hook = 255 lines) | EXACT |
| 28 | decisions/page.tsx handleAnswer via useDecisions :27/:34-39; option buttons :125-139; custom answer map :142-160; system special-case :95; Answered section dimmed cards w/ answer + relative time :177-206 | all exact (file = 209 lines, matches coverage claim) | EXACT |
| 29 | use-sidebar.ts:15 10s poll comment; sidebar route :17 filter + :22 field; dashboard route :37/:69/:75/:82 count/list/full pending; page.tsx awaiting-decision derivation :100-127 (+ impeded :113-115), yellow attention row linking /decisions :145, Decisions Widget :617-621; activity page labels/colors :38-39/:56-57; generate-context.ts :159 reads, :189 filters pending, :226 writes Pending N / Answered M | ALL exact | EXACT |
| 30 | fix-stuck-tasks.js dismissed at :28, block :26-34 (W8 drift vs types.ts:301 + validations.ts:17); seed-demo.ts:656-683 dec_demo_1 developer/task_demo_1 animation question + 3 trade-off options (:658-669); seed-demo.ts:957 writes decisions file; seed-brewster.ts:58 resets to empty; CLAUDE.md:144 decisions.json contract; README.md:330 description | all exact | EXACT |

**Negative-evidence spot-check:** independently grepped `.answer` consumers across src/ + scripts/. Only behavioral reader of a stored decision's answer outside write/display paths is prompt-builder.ts:288/:303 (buildRetryContext) - confirms W4/W5 framing and the report's negative-evidence claim.

**Coverage statement check:** PRESENT and internally consistent. Spot-checked files exist with stated extents (api/decisions/route.ts 141, decision-dialog.tsx 166, use-active-runs.ts 255, active-runs-provider.tsx 33, decisions/page.tsx 209, fix-stuck-tasks.js 46). Skipped list matches declared non-overlap boundary (field-ops FSM owned by R4-1.24/R4-1.28).


---

## Findings register (this wave)

| # | Severity | Report | Finding | Evidence |
|---|---|---|---|---|
| F1 | MINOR (cosmetic line drift) | mc-fieldtask-kanban.md sec 3.2 | bulk-route completedAt stamping pair cited as bulk/route.ts:16-20; actual logic at :22-24 (:16-20 is findIndex/spread). Behavior claim correct | api/tasks/bulk/route.ts:16-24 |
| F2 | MINOR (factual description) | mc-decision-gates.md sec 2.3 | withDecisions() described as read-mutate-save under one mutex hold; it is actually a legacy read-only-in-lock helper that does NOT write back (save inside would deadlock, per the file's own warning). Line cite :430-433 correct; description wrong. No downstream impact - report correctly states all API routes use mutateDecisions | data.ts:377-380, :430-435, :528-535 |
| F3 | COSMETIC (off-by-one) | mc-decision-gates.md sec 2.3 | saveDecisions cited :353-356; function closes at :357. Content at cited lines correct | data.ts:353-357 |

No FAILED citations. All three findings are non-blocking; no report content changes required by this pass.

---

## Verdicts & Totals

| Report | Cites sampled | EXACT | MINOR/COSMETIC | FAILED | Coverage stmt | Verdict |
|---|---|---|---|---|---|---|
| discovery/round4/mc-fieldtask-kanban.md | 34 sample groups (>60 cites) | 33 | 1 (F1) | 0 | present + accurate | PASS |
| discovery/round4/mc-decision-gates.md | 30 sample groups (>55 cites) | 28 | 2 (F2 factual-minor, F3 cosmetic) | 0 | present + accurate | PASS |

**Totals:** 64 sample groups (~115+ individual file:line citations re-checked) - 61 EXACT, 2 MINOR, 1 COSMETIC, 0 FAILED. Both reports PASS.

Headline structural findings independently reproduced during this pass:
1. Regular kanban has NO state machine - status-board dnd writes any kanban value directly (status-board/page.tsx:74-82).
2. FieldTask 8-state allow-list FSM with bypass detection + circuit breaker exactly as diagrammed (field-ops-security.ts:73-82, :111-126, :161-176).
3. Zod/type enum drift on awaiting-signature confirmed (validations.ts:365 lists 7 states vs types.ts:420 lists 8).
4. scheduledFor is declared-but-dead - no scheduling consumer found anywhere in the scan.
5. Decision queue hard-blocks runs at multiple independent enforcement points (run API :96-124, dispatcher :134-138, run-task pre-exec :828-834, chain-dispatch :650, ventures/projects pre-validation :118-139, missions reconciler :164).
6. Answer injection into retry prompts happens exclusively via buildRetryContext (prompt-builder.ts:269-321), unconditionally wired for every task run (:497-499).

## Scan coverage statement (this verification)

Fully read against sources: src/lib/types.ts (all cited regions), src/lib/data.ts (regions :160-235, :255-370, :370-485, :520-589, :618-682), src/lib/validations.ts (:1-140, :223-267, :355-440, :515-544), src/lib/field-ops-security.ts (complete, 323 lines), src/lib/owner-guard.ts (complete, 64 lines), src/lib/field-ops-notify.ts (complete, 174 lines), api/tasks/route.ts (complete, 398 lines), api/tasks/[id]/run/route.ts (complete, 167 lines), api/tasks/bulk/route.ts (complete, 57 lines), api/field-ops/tasks/route.ts (complete, 402 lines), api/field-ops/missions/route.ts (targeted regions + line total 225), api/field-ops/batch/route.ts (complete, 147 lines), api/field-ops/templates/instantiate/route.ts (:88-100), api/decisions/route.ts (complete, 141 lines), api/ventures/[id]/run/route.ts + api/projects/[id]/run/route.ts (:112-142 each), api/missions/route.ts (:85-172), status-board/page.tsx (complete, 176 lines), task-card.tsx (:1-125), decision-dialog.tsx (complete, 166 lines), active-runs-provider.tsx (complete, 33 lines), use-active-runs.ts (complete, 255 lines), decisions/page.tsx (:25-208), scripts/fix-stuck-tasks.js (total 46 + region), targeted windows in search-dialog/command-bar/goal-card/project-card-large/eisenhower-summary/task-detail-panel components and hooks use-sidebar/use-data surfaces, api/sidebar + api/dashboard routes, src/app/page.tsx + activity/page.tsx regions, scripts/generate-context.ts regions, scripts/seed-demo.ts + seed-brewster.ts regions, scripts/daemon/prompt-builder.ts + run-task.ts + dispatcher.ts cited regions, CLAUDE.md + README.md contract lines. Skipped: everything outside the two reports' citation sets (buzz/, Fabrica-app/, field-ops execute guards, workflow-engine internals, vault internals, node_modules, data/*.json contents). READ-ONLY on _sources/ and ../Fabrica-app/ maintained; git status clean of source modifications.

