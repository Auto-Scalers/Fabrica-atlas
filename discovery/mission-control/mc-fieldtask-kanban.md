# MC Deep Dive — Field-Task & Kanban Core Task Domain Model

**Task:** R4-1.28 (Group 1, Round 4) · task_85f03bd4c295 · ctx_40eda75836c5
**Scope:** mission-control's CORE TASK DOMAIN — the regular `Task` entity + kanban board model, the `FieldTask` entity + its state machine, delegation model, approval checkpoints inside normal task runs, task-to-agent assignment resolution, priority/scheduling fields.
**Non-overlap:** R4-1.6 (`mc-workflow-engine.md`) owns the workflow/run engines (daemon internals, ActiveRun lifecycle, project-run loop detection, scheduled cron fires); R4-1.24 (`mc-execute-guards.md`) owns the execute-route guard stack detail. This report covers the *task domain data model and its state machines* only; run/stop endpoints are cited where they gate on task-domain fields, but their execution internals are NOT re-documented.
**Path convention:** all source cites are relative to `_sources/mission-control/mission-control/` unless prefixed otherwise.

---

## 1. Overview: TWO parallel task domains, not one

Mission-control contains **two independent task entities** that never merge into a single table:

| Aspect | Regular Task | Field Task |
|---|---|---|
| Type | `Task` (src/lib/types.ts:159-185) | `FieldTask` (src/lib/types.ts:451-474) |
| Storage | `data/tasks.json` (src/lib/data.ts:203) | `data/field-ops/tasks.json` (src/lib/data.ts:628) |
| Status enum | `KanbanStatus` = "not-started" / "in-progress" / "done" (src/lib/types.ts:3) | `FieldTaskStatus` = 8 states incl. approval/signature (src/lib/types.ts:420) |
| State machine | NONE — free transitions | STRICT allow-list FSM (src/lib/field-ops-security.ts:73-82) |
| Assignment | `assignedTo` + `collaborators[]` (src/lib/types.ts:168-169) | `assignedTo` only (src/lib/types.ts:458) |
| Execution | Claude Code subprocess spawn (src/app/api/tasks/[id]/run/route.ts:147-154) | Service adapter invocation (execute route; see R4-1.24) |
| Approval model | none — pending decisions block runs instead | risk-tiered approval gates baked into creation + transitions |

Cross-links between domains: `FieldTask.linkedTaskId -> Task.id` (src/lib/types.ts:464) and reverse reference `Task.fieldTaskIds: string[]` (src/lib/types.ts:176), auto-maintained on field-task creation (see §8.3).

---

## 2. Regular Task entity — complete field map

Source of truth: src/lib/types.ts:159-185. Zod mirror: `taskCreateSchema` / `taskUpdateSchema` (src/lib/validations.ts:90-137). CLAUDE.md documents the same schema for agent writers (_sources/mission-control/CLAUDE.md, tasks.json section).

| Field | Type | Line | Notes |
|---|---|---|---|
| id | string | types.ts:160 | generated as `generateId("task")` (api/tasks/route.ts:271) |
| title / description | string | :161-162 | title required, max 200 chars (validations.ts:91-92); description max 5000 |
| importance | "important" or "not-important" | :163 | Eisenhower Y-axis; default "not-important" (validations.ts:93) |
| urgency | "urgent" or "not-urgent" | :164 | Eisenhower X-axis; default "not-urgent" (validations.ts:94) |
| kanban | KanbanStatus | :165 | default "not-started" (validations.ts:95) |
| projectId / milestoneId | string or null | :166-167 | FKs to projects.json / goals.json |
| assignedTo | AgentRole or null | :168 | string-typed role — see §6 |
| collaborators | string[] | :169 | max 20 (validations.ts:99); multi-agent support |
| dailyActions | DailyAction[] {id,title,done,date} | :170 | dated sub-steps (types.ts:133-138) |
| subtasks | Subtask[] {id,title,done} | :171 | max 100 (validations.ts:101) |
| blockedBy | string[] | :172 | task-ID dependency list, max 50 (validations.ts:102) |
| estimatedMinutes / actualMinutes | number or null | :173-174 | range 0..99999 (validations.ts:103-104) |
| acceptanceCriteria | string[] | :175 | max 50 (validations.ts:105) — definition-of-done checklist |
| fieldTaskIds? | string[] (optional) | :176 | reverse links into field-ops domain |
| comments | TaskComment[] {id,author,content,createdAt} | :177 | author is AgentRole or "system" (types.ts:150-155) |
| tags / notes | string[] / string | :178-179 | max 50 tags of 100 chars; notes max 5000 |
| dueDate | string or null | :180 | free-form date string, max 30 chars (validations.ts:110) |
| createdAt / updatedAt | ISO string | :181-182 | updatedAt stamped on every PUT (api/tasks/route.ts:328) |
| completedAt | string or null | :183 | set when kanban becomes done; nulled when moved off done (api/tasks/route.ts:329) |
| deletedAt | string or null | :184 | soft delete; filtered from GET unless includeDeleted=true (api/tasks/route.ts:191-193) |

**Storage engine:** plain JSON file under `data/`, guarded by per-file async-mutex. Mutations go through `mutateTasks()` = lock -> re-read from disk -> apply callback -> write back, with implicit rollback if the callback throws (src/lib/data.ts:463-471; mutex registry at data.ts:176-197; legacy read-only-in-lock helpers documented as deadlock-if-mutated at data.ts:377-380). GET reads are lock-free by design (data.ts:199-208).

**Archive tier:** separate `tasks-archive.json` with its own mutex (data.ts:210-217, 317-321); GET merges archive only when `include=archived` (api/tasks/route.ts:179-188).

## 3. Kanban board model — states, transitions, UI

### 3.1 States

Exactly three: "not-started" / "in-progress" / "done" (src/lib/types.ts:3; identical zod enum `kanbanEnum` at src/lib/validations.ts:8).

### 3.2 Transition semantics: NO state machine

Unlike FieldTask, any kanban value can be set from any other at any time:

- The status board implements drag-and-drop via @dnd-kit/core and directly issues `updateTask(task.id, { kanban: targetStatus })` on drop — no transition validation whatsoever (src/app/status-board/page.tsx:74-82; column configs at :32-36).
- The PUT handler merges an optional `kanban` blindly into the stored task (api/tasks/route.ts:312-333).
- The ONLY derived rule is the `completedAt` stamping pair: entering done stamps completedAt (preserving an existing value), leaving done nulls it (api/tasks/route.ts:329). Same logic in bulk update (api/tasks/bulk/route.ts:16-20).
- Bulk update applies N updates inside ONE mutateTasks transaction (api/tasks/bulk/route.ts:6-31); bulk soft-delete sets deletedAt per id (:35-52).

### 3.3 Board UI surface

- `/status-board` page: 3 columns grouped client-side (`grouped[task.kanban]`, status-board/page.tsx:69-72), project filter (:64-67), multi-select bulk bar with Mark-Done / Delete wired to bulk endpoints (:149-160), pending-decision badges injected from the decisions store (:46-48).
- Task cards render a kanban dot + label ("Todo"/"Active") and expose a Run button only when `assignedTo !== "me"` and not done (src/components/task-card.tsx:11-19, 108, 116-118).
- Overdue = `dueDate < now && kanban !== "done"` (task-card.tsx:66).
- Blocker awareness in card/panel: a dependency counts as unfinished when `dep.kanban !== "done"` (task-card.tsx:56; src/components/task-detail-panel.tsx:187).
- Detail panel auto-promotes a not-started task to in-progress when the user starts interacting (task-detail-panel.tsx:125).
- Kanban labels reused in search results (src/components/search-dialog.tsx:33-34) and command bar (src/components/command-bar.tsx:216-220); goal-card computes progress from linked tasks' kanban (src/components/goal-card.tsx:22); project-card-large rolls up not-started/in-progress/done counts per project (src/components/project-card-large.tsx:34-36).

---

## 4. Priority / scheduling model

### 4.1 Eisenhower matrix IS the priority system

There is no numeric priority. Priority = the (importance, urgency) pair:

- Quadrant helpers with full mapping tables live in src/lib/types.ts:387-414: `getQuadrant(task)` (:393-398), `quadrantFromValues()` (:400-405), `valuesFromQuadrant()` (:407-414). Quadrants: do / schedule / delegate / eliminate.
- GET endpoint supports server-side quadrant filtering by re-deriving importance/urgency comparisons (api/tasks/route.ts:213-222).
- The delegate quadrant is explicitly the "hand to an AI agent" quadrant per workspace doctrine (_sources/mission-control/CLAUDE.md, Eisenhower Matrix section).
- UI: priority-matrix page exists at src/app/priority-matrix/page.tsx; eisenhower-summary filters active tasks via `kanban !== "done"` (src/components/eisenhower-summary.tsx:20).

### 4.2 Time fields

- `dueDate` (types.ts:180): free string; only consumed as overdue flag in task-card.tsx:66. Not used for scheduling execution.
- `estimatedMinutes` / `actualMinutes` (types.ts:173-174): tracking only.
- `dailyActions[].date` (types.ts:133-138): dated sub-steps for day planning.

Conclusion: regular tasks have NO scheduler. Execution happens on-demand (Run button -> spawn) or via daemon polling — scheduling belongs to the workflow engine (R4-1.6 territory), not the task entity.

## 5. Delegation model (regular tasks: who assigns what to whom)

### 5.1 Assignment fields

- `assignedTo` = single lead agent role; `collaborators[]` = additional team members (types.ts:168-169). Both are plain strings validated only as 1..50 chars (validations.ts:13, 98-99) — the "AgentRole is now a string validated against the agent registry at runtime" note is explicit at types.ts:7-10.

### 5.2 Delegation side effects (the actual mechanism)

Delegation in MC = an inbox message, nothing more. In api/tasks/route.ts:

- `isAgent()` guard: a role counts as an agent iff non-null and not "me" (:33-35).
- `handleDelegation(task, previousAssignee)` fires on create and on assignee change (:39-59): posts an InboxMessage of type "delegation" from "system" to the new lead including collaborators list (:43-50), then logs a `task_delegated` ActivityEvent (:52-58). Skipped when assignee unchanged (:41).
- `handleCollaboratorChanges()` diffs old/new collaborators and messages each added collaborator (delegation) and removed one (update), plus one aggregated task_updated event (:61-102).
- POST triggers delegation after the atomic write for agent-assigned tasks (:302-304) and collaborator messaging (:305-307); PUT triggers on assignee diff (:342-344) and collaborator JSON-diff (:345-349).

### 5.3 Completion + unblocking loop

- `handleCompletion()`: when kanban flips to done, logs `task_completed` with actor = assigned agent if any (:104-128) and — if an agent owns it — auto-posts a completion report message from that agent to "me" (:115-124). This is how agents "report back" without direct file writes.
- `handleUnblocking()`: scans all tasks whose blockedBy includes the completed id; if every blocker is now done AND the dependent has an agent lead, posts an "Unblocked" inbox update + task_updated event (:130-162).

### 5.4 Human-in-the-loop alternative: decisions

Instead of approvals, regular tasks use the decisions store: an agent posts a DecisionItem (types.ts:303-314: requestedBy, taskId, question, options, context, pending/answered). The run gate checks this (§7).

---

## 6. Task-to-agent assignment resolution

How a string role becomes an executing agent:

1. **Registry source**: agents live in data/agents.json as AgentDefinition {id slug, name, instructions (full system prompt), capabilities, skillIds, status} (types.ts:25-36). Five built-ins seeded ("me", researcher, developer, marketer, business-analyst — types.ts:13-19) but the registry is dynamic via /crew UI and api routes.
2. **Validation at write time**: zod accepts ANY string 1..50 chars (validations.ts:12-13) — no FK check against agents.json on task create/update. A typo'd assignee is silently accepted. (Weakness noted in §10.)
3. **Resolution at run time**: POST /api/tasks/[id]/run refuses execution unless assignedTo exists and is not "me" (api/tasks/[id]/run/route.ts:53-58) — i.e., resolution is binary "is it delegated or mine", not capability-based.
4. **Spawn**: run route spawns detached `scripts/daemon/run-task.ts <taskId> --source manual` (+ --agent-teams flag from daemon-config execution.agentTeams, :126-144) via child_process spawn of process.execPath with tsx import (:146-154). The script loads the agent's instructions/skills by id (daemon internals = R4-1.6 scope).
5. **Service-side allow-list (field domain)**: FieldOpsService.allowedAgents[] restricts which agents may use a service (types.ts:507) — the only capability-style gating anywhere in assignment.
6. **UI affordances**: task-card Run button gated identically (task-card.tsx:108); project-card-large counts delegated open tasks (`assignedTo && assignedTo !== "me"` at :52).

---

## 7. Approval checkpoints inside NORMAL task runs

Two distinct mechanisms:

### 7.1 Regular task runs: decision-gate, not approval

POST /api/tasks/[id]/run performs 7 ordered pre-flight checks before spawning (api/tasks/[id]/run/route.ts):

1. task exists (:42-50)
2. has AI agent assigned (:53-58)
3. not already kanban-done (:61-66)
4. no ActiveRun already running for the taskId (:69-80)
5. no unfinished blockedBy dependencies (:83-94) — dependency check re-reads tasks.json
6. **no pending DecisionItem for this taskId** — returns 400 embedding the oldest pending decision (:97-124). This is the human-checkpoint inside normal runs: work halts until "me" answers.
7. daemon config read + detached spawn (:127-154)

Stop path: DELETE-equivalent stop route kills the ActiveRun (api/tasks/[id]/stop/route.ts — lifecycle detail under R4-1.6).

### 7.2 FieldTask runs: risk-tiered approval baked into the state machine

This IS the "approval checkpoint inside a normal task run":

- **Risk classification** (src/lib/field-ops-security.ts):
  - Base per-type risk map TASK_TYPE_RISK: payment/ad-campaign/crypto-transfer high; email-campaign/social-post/publish medium; design low; custom medium-with-comment "always requires approval regardless" (:22-31).
  - `computeTaskRisk(type, serviceRiskLevel)` — service risk can elevate but never lower (:34-43).
  - `requiresApproval(type, serviceRisk, autonomy)`: HIGH always true — commented "iron claw — financial and high-impact actions never auto-approve" (:46-68, esp. :53-55); custom always true (:57-58); approve-all -> true; approve-high-risk -> only medium; full-autonomy -> false (:60-67).
- **Creation-time enforcement**: field-task POST recomputes approval server-side — never trusts client `approvalRequired` (comment "Server-side approval enforcement — never trust client input", api/field-ops/tasks/route.ts:84-96; stored value written at :110 despite schema default true at validations.ts:401).
- **Transition gates** on PUT (api/field-ops/tasks/route.ts:170-257):
  - owner-only approve/reject via requireOwner (:176-179);
  - FSM validity check with security-event logging on violation (:182-202);
  - bypass detector: draft -> approved while approvalRequired=true is rejected 403 (isApprovalBypassAttempt, field-ops-security.ts:111-126; enforced at :204-220);
  - circuit breaker before entering executing: if the mission has >=3 consecutive failed siblings, mission auto-pauses and the transition is refused 409 (:222-255; shouldTripCircuitBreaker logic field-ops-security.ts:161-176 — resets on any completed).
- **Who approves**: requireOwner (src/lib/owner-guard.ts:20-63) rejects any actor !== "me" immediately (:23-30), then accepts either an active vault session (:33) or masterPassword verified against scrypt hash (:36-61). Agents structurally cannot approve.
- **Batch approvals**: POST /api/field-ops/batch applies submit-for-approval/approve/reject to up to 50 ids atomically in ONE mutateFieldTasks call, per-task isValidTransition check collecting failures instead of aborting, stamps approvedBy/rejectedBy + rejectionFeedback, then emits per-task notifications (api/field-ops/batch/route.ts: actionStatusMap near top; owner check before any mutation; loop body; result logging). Schema caps taskIds at 1..50 (validations.ts:525-530).
- **Approval bookkeeping on the entity**: approvedBy / rejectedBy / rejectionFeedback stamped during PUT (api/field-ops/tasks/route.ts:274-291); executedAt stamped entering executing, completedAt entering completed and nulled otherwise (:282-288); structured activity events with durationMs computed from executedAt->completedAt (:304-345).
- **Autonomy config**: ApprovalConfig {mode: AutonomyLevel, overrides per-service} persisted in field-ops/approval-config.json, default mode approve-all (types.ts:576-583; data.ts:671-678); changing autonomy level or activating a mission requires owner auth (api/field-ops/missions/route.ts:100-104).

## 8. FieldTask entity + state machine detail

### 8.1 FieldTask fields (types.ts:451-474)

| Field | Line | Notes |
|---|---|---|
| id | :452 | `ftask_{ts}` via generateId (api/field-ops/tasks/route.ts:102) |
| missionId | :453 | REQUIRED at creation — POST rejects missing missionId with 400 (:69-74) |
| title / description | :454-455 | same limits as Task |
| type | :456 | 8-value FieldTaskType enum (types.ts:421): social-post, email-campaign, ad-campaign, payment, publish, design, crypto-transfer, custom; default "custom" (validations.ts:397); CLAUDE.md warns agents not to invent types |
| serviceId | :457 | FK to field-ops/services.json; drives risk lookup (:87-91 of route) |
| assignedTo | :458 | single agent role, no collaborators concept |
| status | :459 | 8-state FSM below |
| approvalRequired | :460 | server-computed on create (§7.2) |
| payload | :461 | Record<string,unknown>, max 10KB JSON enforced by zod refine (validations.ts:402-405) and isPayloadTooLarge (field-ops-security.ts:278-287) |
| result | :462 | populated post-execution; initialized {} (:112) |
| attachments | :463 | FieldTaskAttachment[] {id,filename,path,mimeType,size} (types.ts:443-449) |
| linkedTaskId | :464 | bridge to regular task |
| blockedBy | :465 | field-task dependency ids (max 50, validations.ts:407) — note: NOT enforced by any run gate found in this scan (contrast §7.1 check 5 for regular tasks) |
| rejectionFeedback | :466 | free-text why rejected |
| approvedBy / rejectedBy | :467-468 | actor stamps |
| scheduledFor? | :469 | optional string or null — SEE §8.4 dead-field finding |
| createdAt/updatedAt/executedAt/completedAt | :470-473 | lifecycle stamps per §7.2 |

### 8.2 The FSM (field-ops-security.ts:73-82)

```
draft -> [pending-approval, approved]        (approved only if no approval required)
pending-approval -> [approved, rejected]
approved -> [executing, awaiting-signature]   (signature branch = wallet-mode tasks)
awaiting-signature -> [completed, failed]
executing -> [completed, failed]
completed -> []                               terminal
failed -> [draft]                             retry by resubmitting
rejected -> [draft]                           resubmit after feedback
```

Helpers: `isValidTransition` (:85-90), `getTransitionError` with distinct terminal-state message (:93-102). UI labels/badges for all 8 states in TASK_STATUS_STYLES (:136-145). Zod mirror NOTE: the create/update enum OMITS "awaiting-signature" (validations.ts:365 lists 7 states vs 8 in types.ts:420) — signature state is entered by internal execution flow, not client writes.

### 8.3 Cross-domain bridge

- Creating a field task with linkedTaskId auto-appends its id to the regular task's fieldTaskIds inside mutateTasks (api/field-ops/tasks/route.ts:147-165), best-effort.
- Approval/rejection notifications flow BACK into the regular inbox via notifyFieldTaskApproved/Rejected targeting `task.assignedTo || "me"` plus logFieldOpsActivity entries into the unified activity log (src/lib/field-ops-notify.ts:90-147, 155-174; wired at api/field-ops/tasks/route.ts:347-366). Same pattern for completed/failed results (:22-85).
- Mission deletion does NOT delete tasks — it orphans them by nulling missionId and reports the count (api/field-ops/missions/route.ts:197-208).

### 8.4 Scheduling fields — finding

`scheduledFor` exists on the entity (types.ts:469), schema (validations.ts:408, 430), creation write (api/field-ops/tasks/route.ts:119) and template instantiation (api/field-ops/templates/instantiate/route.ts:95 sets null). A repo-wide grep finds NO consumer that schedules off it — no scheduler reads it. It is a declared-but-dead field as of this snapshot; actual timed firing belongs to the workflow engine's scheduler (R4-1.6).

---

## 9. Mission container (FieldMission, types.ts:426-441)

- Fields: status active/paused/completed (:419, 430), **autonomyLevel** approve-all/approve-high-risk/full-autonomy (:418, 431), linkedProjectId, tasks: string[] (id list, max 200 validations.ts:378), lifecycle stamps.
- AutonomyLevel feeds requiresApproval at task creation (§7.2) — this is how "how much do I supervise this batch" is expressed.
- Owner gates: creating active mission (:49-53), activating or changing autonomy (:100-104); autonomy changes emit `autonomy_changed` activity events (:159-173); status changes emit `mission_status_changed` (:142-157); completedAt stamping mirrors task logic (:117-128).
- Circuit breaker couples missions to their tasks' statuses (§7.2).

---

## 10. Fit assessment as Fabrica core task model

### Strengths (keep)

1. Clean dual abstraction: human-planning task (kanban + Eisenhower) vs machine-executed action (FieldTask + FSM + payload/result). Maps directly onto Fabrica's "user gives goals, agents execute operations" shape.
2. The 8-state FieldTask FSM with allow-list transitions, bypass detection, owner-only approvals, and circuit breaker is production-grade safety scaffolding — directly portable to Fabrica agent-action approval.
3. Delegation-as-inbox-message + completion-report loop is a working agent coordination protocol requiring zero transport infra (JSON files), proven by MC's own daemon usage.
4. blockedBy dependency lists + unblock notification loop are simple and sufficient for DAG-ish flows.
5. Per-file mutex + lock-read-mutate-write pattern (data.ts:458-471) is a sound minimal persistence discipline.

### Gaps / weaknesses (fix before porting)

1. **No assignment integrity**: AgentRole accepts any string; no FK validation against agents.json anywhere in task routes (validations.ts:13). Fabrica should resolve+validate assignee against its agent registry at write time.
2. **Kanban has no guardrails**: any-to-any transitions incl. done -> in-progress silently reopens (route PUT merge). Fine for humans; risky if agents ever write kanban directly.
3. **FieldTask.blockedBy never enforced**: no run-gate checks it (contrast run route check 5). Dead semantics unless Fabrica adds the dependency check into its action executor.
4. **scheduledFor is dead** (§8.4): either wire a scheduler or drop it in the ported model.
5. **Zod/type enum drift** on awaiting-signature (validations.ts:365 vs types.ts:420) — port must have ONE source of truth for status enums.
6. **No numeric priority or due-date enforcement on field side**: missions/tasks rely on creation order + circuit breaker only; Fabrica likely needs priority/queue fields for multi-agent scheduling.
7. **Approval identity is single-owner**: requireOwner hardcodes actor === "me" (owner-guard.ts:23-30) — no delegation-of-approval, no roles. Fabrica business-builder audience may need approver roles.
8. **Two activity logs + two inboxes** (regular vs field-ops, bridged ad hoc by field-ops-notify.ts) — consolidate in Fabrica rather than re-porting the bridge.
9. **ID generation via Date.now()** (generateId) risks collision under burst writes; use uuid/cuid in Fabrica.

### Verdict

HIGH fit as the *skeleton* of Fabrica's core task model: keep Task/KanbanStatus + Eisenhower priority for the human planning surface, adopt FieldTask's FSM + risk-tiered approval + owner-guard as the agent-action execution contract, replace string-role assignment with registry-resolved agent references, and add the missing enforcement (blockedBy gate, scheduler, priority queue).

---

## Scan coverage statement

**Fully read (line-by-line):**
- src/lib/types.ts (675 lines, complete)
- src/lib/validations.ts (571 lines, complete)
- src/lib/data.ts (855 lines, complete)
- src/lib/field-ops-security.ts (323 lines, complete)
- src/lib/owner-guard.ts (64 lines, complete)
- src/lib/field-ops-notify.ts (174 lines, complete)
- src/app/api/tasks/route.ts (398 lines, complete)
- src/app/api/tasks/[id]/run/route.ts (167 lines, complete)
- src/app/api/tasks/bulk/route.ts (~55 lines, complete)
- src/app/api/field-ops/tasks/route.ts (402 lines, complete)
- src/app/api/field-ops/missions/route.ts (225 lines, complete)
- src/app/api/field-ops/batch/route.ts (~150 lines, complete)
- src/app/status-board/page.tsx (176 lines, complete)

**Targeted grep/read:** src/components/task-card.tsx, task-detail-panel.tsx, search-dialog.tsx, command-bar.tsx, goal-card.tsx, project-card-large.tsx, eisenhower-summary.tsx, skeletons.tsx, edit-goal-dialog.tsx, onboarding-dialog.tsx (kanban/status/priority usage lines cited); scheduledFor repo-wide grep (5 hits, all cited in §8.4); api/tasks/archive/route.ts + api/tasks/[id]/stop/route.ts listed but only skimmed structurally (lifecycle internals deferred to R4-1.6).

**Deliberately skipped (out of scope / owned by other reports):** scripts/daemon/* internals (R4-1.6), api/field-ops/execute/* guard stack (R4-1.24), adapters layer (R4-1.3), vault-crypto/vault-session internals beyond the requireOwner call path, node_modules, data/*.json contents (live data, not model), UI pages other than those cited (priority-matrix/page.tsx opened for inventory only), __tests__.

**Citation count:** ~120 file:line citations across 20 source files.



