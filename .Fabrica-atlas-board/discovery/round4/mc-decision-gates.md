# R4-1.29 — mission-control Human Decision Layer (decisions.json decision gates) — line-level deep dive

**Task:** ATLAS R4-1.29 (Group 1, Round 4) · task_96b59131639d · dispatch ctx_c72cd2bd1e98
**Scope boundary:** This report covers the HUMAN DECISION layer only (`decisions.json` schema, run-blocking mechanics, answer capture, retry-prompt injection, decision history/audit, UI wiring). The field-ops approval FSM (`pending-approval → approved → …`, iron-claw risk tiers) is covered by R4-1.6 (`mc-workflow-engine.md`) and R4-1.28 (`mc-fieldtask-kanban.md`) and is intentionally NOT re-documented here except where the two systems touch.

All paths relative to `_sources/mission-control/mission-control/` unless prefixed. Line numbers from this scan (2026-08-23).

---

## 1. What the decision layer IS

mission-control implements a **file-based human-decision queue**: any agent (daemon-run Claude Code session, API caller, or human following the agent protocol) can append a `DecisionItem` to `data/decisions.json`; while a decision tied to a task is `pending`, that task is **hard-blocked at every execution entry point** (manual run API, daemon dispatcher, mission chain-dispatch, mission reconciler). When the human answers through the UI, the answer text is (a) logged as an audit event and (b) injected verbatim into the **next prompt** built for that task as "Retry Instructions". This is mission-control's primary operator-intervention mechanism for unattended runs — distinct from field-ops approvals, which gate individual *executions* rather than *task progress*.

The canonical data-file contract is documented in the repo's own ops manual: `CLAUDE.md:144` ("decisions.json — `{ \"decisions\": DecisionItem[] }`") and `README.md:330` ("decisions.json — Pending decisions requiring human judgment").

---

## 2. Storage & schema

### 2.1 TypeScript schema

Defined once in `src/lib/types.ts`:

| Field | Type | Cite |
|---|---|---|
| `id` | `string` (`dec_{timestamp}`) | types.ts:304 |
| `requestedBy` | `AgentRole \| "system"` | types.ts:305 |
| `taskId` | `string \| null` — null decisions are informational only (never block; see §4.8) | types.ts:306 |
| `question` | `string` — what needs deciding | types.ts:307 |
| `options` | `string[]` — pre-defined choices (may be empty) | types.ts:308 |
| `context` | `string` — background for the decider | types.ts:309 |
| `status` | `"pending" \| "answered"` (full union at types.ts:301) | types.ts:310 |
| `answer` | `string \| null` | types.ts:311 |
| `answeredAt` | `string \| null` | types.ts:312 |
| `createdAt` | `string` | types.ts:313 |

File wrapper: `DecisionsFile { decisions: DecisionItem[] }` — types.ts:316-318.

**Note on `"dismissed"`:** the operational script `scripts/fix-stuck-tasks.js:28` sets `d.status = 'dismissed'` when force-clearing stale decisions — a value that exists in **no** type or Zod schema (`DecisionStatus` is only `pending|answered`, types.ts:301; `decisionStatusEnum` z.enum `["pending","answered"]`, validations.ts:17). This is an out-of-band escape hatch that writes schema-invalid data by design (see §9, W8).

### 2.2 Validation limits (Zod)

`src/lib/validations.ts`:

- `LIMITS.CONTEXT = 5000` (:47), `LIMITS.QUESTION = 500` (:49), `LIMITS.ANSWER = 500` (:50), `LIMITS.MAX_OPTIONS = 20` (:62).
- **Create** schema `decisionCreateSchema` (:235-243): `question` required, min 1 / max 500 (:239); `options` optional array of ≤20 strings each ≤500 chars, defaults `[]` (:240); `context` optional ≤5000, defaults `""` (:241); `requestedBy` optional defaulting `"developer"` (:237); `taskId` nullable optional defaulting `null` (:238); client-supplied `createdAt` accepted but capped at 30 chars (:242).
- **Update** schema `decisionUpdateSchema` (:245-254): requires `id` (:246); allows partial edits of `status`, `answer`, `question`, `options`, `context`, `requestedBy`, `taskId` (:247-253).

There is no `min(options)` — a decision with zero options renders as free-text-only in all UI surfaces (see §7).

### 2.3 Persistence engine

All app-side access funnels through `src/lib/data.ts`:

- **Read:** `getDecisions()` reads `decisions.json` and parses it; on missing/unreadable file returns `{ decisions: [] }` (data.ts:264-270).
- **Write:** `saveDecisions()` wraps `_writeJson("decisions.json", data)` inside the per-file mutex (data.ts:353-356); mutexes are declared per file in a `fileMutexes` map including `decisions: new Mutex()` (data.ts:184), using `async-mutex` `runExclusive`.
- **Read-modify-write:** `withDecisions()` (read → mutate fn → save under one mutex hold, data.ts:430-433) and `mutateDecisions()` (fresh read inside the mutex → mutate → write back, data.ts:528-535). All API routes use `mutateDecisions`, so concurrent API writes serialize instead of clobbering (matches CLAUDE.md concurrency guidance).
- `_writeJson()` is the single centralized writer (declared data.ts:170).

**Cross-process caveat:** the daemon scripts do NOT use this mutex — `run-task.ts` and `dispatcher.ts` read/write `decisions.json` with plain synchronous `fs` calls (`run-task.ts:36` `DECISIONS_FILE` constant; direct `writeFileSync` at run-task.ts:538; dispatcher reads at dispatcher.ts:346-347). Mutex protection is therefore intra-process (Next.js server) only; a daemon write can race an API write (see §9, W2). CLAUDE.md itself warns "direct file writes bypass the mutex".

### 2.4 Example record (seeded demo)

`scripts/seed-demo.ts:656-683` seeds two pending decisions, e.g. `dec_demo_1`: `requestedBy: "developer"`, `taskId: "task_demo_1"`, question "Which animation library should we use for the hero section?" with 3 concrete options carrying trade-off annotations and a multi-sentence `context` (seed-demo.ts:658-669). This shows the intended shape: options are full sentences with pros/cons, not single words.

---

## 3. Creation paths (who can open a decision gate)

Four distinct producers exist:

1. **API POST `/api/decisions`** (`src/app/api/decisions/route.ts:42-78`) — Zod-validated (`decisionCreateSchema`, route.ts:43), id generated via `generateId("dec")` (route.ts:49), pushed under `mutateDecisions` (route.ts:47-62), status forced `"pending"`, `answer`/`answeredAt` forced `null` (route.ts:55-57). Side effect: immediately logs a `decision_requested` ActivityEvent with summary truncated to 80 chars and `details = context` (route.ts:65-76). Returns 201 with the created item (route.ts:78).
2. **Daemon loop-escalation** — `checkLoopAndEscalate()` in `scripts/daemon/run-task.ts:485-544`. After `MAX_LOOP_ATTEMPTS = 3` failures of the same task within a mission (constant at run-task.ts:374), the daemon auto-creates a decision:
   - duplicate guard: skips if a pending decision for the same taskId already exists (run-task.ts:512-516);
   - fixed option trio: `["Retry with a different approach", "Skip this task and continue mission", "Stop the entire mission"]` (run-task.ts:526-530);
   - `context` embeds last error message + attempt history + failing agent id (run-task.ts:518-519, :531);
   - `requestedBy` = the failing **agentId** (run-task.ts:523);
   - written with raw `writeFileSync` (no app mutex), then warn-logged (run-task.ts:538-539).
   Invocation site: after every non-completed task result during mission continuation (run-task.ts:595-604).
   ⚠️ The daemon never acts on the chosen option mechanically — "Skip"/"Stop the entire mission" answers only influence the next prompt via retry-context text (§6); there is no code path that stops a mission because of an answer (verified: no reader of `answer` besides `buildRetryContext`, §10 negative-evidence).
3. **Agent protocol (file convention)** — `CLAUDE.md` §"How to Request a Decision" instructs agents to hand-edit `decisions.json` (append with `status:"pending", answer:null, answeredAt:null`) and log a `decision_requested` activity event (CLAUDE.md:323-337 region; exact steps enumerated at CLAUDE.md lines under that heading). Also referenced by slash-command docs: `.claude/commands/daily-plan/user.md:6`, `.claude/commands/standup/user.md:7`, `.claude/commands/pick-up-work/user.md:11`.
4. **Seed scripts** — `seed-demo.ts:957` writes the demo decisions file; `seed-brewster.ts:58` resets it to `{ decisions: [] }`.

---

## 4. Blocking mechanics — how a pending decision stops a run

A pending decision blocks **by taskId match** (`d.taskId === taskId && d.status === "pending"`). There are **six independent enforcement points**; a run cannot start through any of them while blocked:

### 4.1 Manual single-task run API — returns the decision to the UI
`POST /api/tasks/[id]/run` (`src/app/api/tasks/[id]/run/route.ts`), step 6 of 8 pre-checks (:96-124):
- reads `decisions.json` directly via `readJSON` (route.ts:97-110);
- filters pending decisions for this task and picks the **oldest** by `createdAt` (sort ascending, `[0]`, route.ts:112-114);
- if found, returns HTTP **400** with body `{ error: "Task has a pending decision that must be answered first", pendingDecision }` (route.ts:115-123) — the full DecisionItem is embedded so the client can render the dialog without a second fetch. This payload shape is the hook the whole modal flow (§7) hangs on.

Ordering of checks: task exists (:42-50) → agent assigned & not `"me"` (:53-58) → not done (:61-66) → not already running (:69-80) → dependencies unblocked (:83-94) → **pending decision** (:96-124) → only then spawn detached `run-task.ts` process (:132-154).

### 4.2 Daemon dispatcher poll — silent skip
`scripts/daemon/dispatcher.ts:134-138`: during each dispatch pass, tasks with `hasPendingDecision(task.id)` are filtered out with debug log `"Skipping {id} — waiting for decision"`. `hasPendingDecision` is exported from prompt-builder (see §4.7). The check runs after dependency check (:127-132) and before retry-limit check (:140-145).

### 4.3 run-task.ts pre-execution guard — hard exit
`scripts/daemon/run-task.ts:828-834`: before spawning any Claude Code session, step 6 re-checks `hasPendingDecision(taskId)` and calls `process.exit(1)` with error log `"Task {id} has a pending decision — cannot execute"`. Skipped for mission continuations (`isContinuation`, :829) because a continuation is the *result* of a just-finished session, not a fresh start. This is defense-in-depth: even if §4.1 were bypassed (e.g. direct script invocation), execution still refuses.

### 4.4 Mission chain-dispatch inside run-task.ts
When one task in a mission finishes, `handleProjectRunContinuation()` picks next tasks; its dispatchable filter excludes tasks where `checkPendingDecision(tid)` is true (run-task.ts:643-655, decision check at :650; local re-implementation of the check "to avoid circular deps" at :453-463). If nothing is dispatchable because of decisions, the stall report names it: `"Mission {id}: STALLED — N tasks remain but none dispatchable (blocked: …, decisions: …)"` (run-task.ts:716, :725).

### 4.5 Project-run launch API — pre-validation before mission creation
`POST /api/ventures/[id]/run` (`src/app/api/ventures/[id]/run/route.ts:118-139`) builds `pendingDecisionTaskIds` from all pending task-bound decisions (:120-125) and drops those tasks from `dispatchable` (:137) **before** creating the mission record — comment notes this "fixes toast count bug", i.e. previously decision-blocked tasks were counted as launched. Same pattern in `POST /api/projects/[id]/run` (direct read of `decisions.json` at route.ts:120).

### 4.6 Mission reconciler (frontend-poll safety net)
`src/app/api/missions/route.ts` `reconcileStuckMissions()`: builds the same `pendingDecisionTaskIds` set (:91-99) and excludes those tasks when deciding whether a dead mission should re-dispatch, stay running, or be marked stalled (:164). A mission whose only remaining work is decision-blocked therefore settles into `stalled` rather than spamming re-spawns (stall classification follows the dispatchable-empty branch, :170-199+).

### 4.7 Shared predicate
`hasPendingDecision(taskId)` in `scripts/daemon/prompt-builder.ts:577-579` — `.some(d => d.taskId === taskId && d.status === "pending")`. Used by dispatcher (:135) and run-task (:830).

### 4.8 Unblocking semantics
There is **no unblock event** — unblocking is implicit: once no pending decision matches the taskId (because it was answered or deleted), every enforcement point simply passes on the next evaluation. Answering alone does NOT auto-resume daemon-side work; resumption happens only when (a) the user's own re-run call fires (UI flow, §7.2), (b) the dispatcher's next poll finds the task eligible, or (c) a live mission's continuation/reconciler loop reaches it.

### 4.9 Decisions with `taskId: null`
Never block anything (every filter requires a taskId match) — they function as pure "ask the owner" inbox items visible only in the queue UI/dashboard counts.

---

## 5. Answer capture (the human side)

### 5.1 API contract — PUT /api/decisions
`src/app/api/decisions/route.ts:81-127`:
- Zod-validated against `decisionUpdateSchema` (:82-84);
- located by id inside `mutateDecisions`; if absent → 404 (:86-88, :106-108);
- **auto-answer semantics:** providing an `answer` on a pending item flips status to `"answered"` automatically (:90-93: `effectiveStatus = body.answer && status==="pending" ? "answered" : (body.status ?? current)`); `wasAnswered` records that a pending→answered transition occurred (:94);
- `answeredAt` stamped **only** on that transition (:100) — later edits preserve the original timestamp;
- audit side effect: on transition, appends a `decision_answered` ActivityEvent with `actor: "me"` (hard-coded human attribution), summary `Answered: {question.slice(0,60)} → "{answer}"` (:111-124);
- response is the updated DecisionItem (:126).

### 5.2 GET (queue reads)
`GET /api/decisions` (:7-40): optional `status` filter (:15-17); sort = pending-first then newest-first (:19-23); limit/offset pagination (:25-31); cache header `private, max-age=2, stale-while-revalidate=5` (:38) tuned for the UI's short polling cycles.

### 5.3 DELETE — hard delete, no audit
`DELETE /api/decisions?id=` removes the item from the array entirely (:129-141) with **no ActivityEvent logged** — deletions leave no trace in the history trail (§9, W3).

### 5.4 UI capture surfaces
Two independent answer paths, both hitting the same PUT:
1. **Modal** (`src/components/decision-dialog.tsx`): option buttons submit that option verbatim (:122-137); free-text Input + Enter key or "Answer" button submits custom text (:139-161); submission does `apiFetch("/api/decisions", { method:"PUT", body:{ id, status:"answered", answer } })` (:61-69); success toast echoes the answer (:74); closes dialog and waits a **fixed 300 ms** before invoking `onAnswered()` "to let the write complete" (:77-78).
2. **Queue page** (`src/app/decisions/page.tsx`): per-card option buttons (:125-139) and per-card custom answer state map (:142-160) calling `handleAnswer` → `updateDecision(id, {status:"answered", answer})` through the generic `useDecisions` data hook (:27, :34-39).

Both surfaces show identical card anatomy: requestor icon+label resolved via `AGENT_ROLES` with fallback to raw id and `"system"` special-case (dialog :41-45; page :95), relative timestamp formatter (:47-55 dialog; :41-50 page), question as heading, context in muted box (:114-119 dialog; :114-116 page).

---

## 6. Answer → retry-prompt injection (the loop-closer)

`scripts/daemon/prompt-builder.ts` `buildRetryContext(taskId)` (:264-321):

- Reads `decisions.json`; returns null if file missing (:271-272);
- collects decisions where `d.taskId === taskId && d.status === "answered" && d.answer`, sorted by `answeredAt` **descending** (most recent first) (:286-293); empty → null (:295);
- takes only the **latest** answered decision (:297) and renders a fenced prompt section:

```
## Retry Instructions - Read Carefully (injected into next prompt)

**This task has been attempted before and failed.** The user has reviewed the situation and provided guidance:

**User's decision:** {answer}

**Previous failure context:** {context.slice(0, 300)}

You MUST take a DIFFERENT approach than what was tried before.
Do NOT repeat the same steps that led to failure.
If the user said to try a different approach, think creatively about alternative solutions.
```
(:298-316; answer at :303; 300-char context slice :307-310; must-differ directives :312-314)

- wiring: `buildTaskPrompt()` appends this section (when non-null) between mission restart context and the task instructions for **every** task run — not only mission runs (`prompt-builder.ts:497-499`; docstring at :469 explicitly names "retry context (user decisions)"). The whole assembled prompt then passes through `enforcePromptLimit` (:504).

Consequence: an answered decision is **permanent prompt context** — every future run/retry of that task re-injects the guidance until the decision record is deleted. There is no "consumed" flag or one-shot semantics.

---

## 7. UI wiring for the decision modal (end-to-end flow)

### 7.1 Global modal mount
`src/providers/active-runs-provider.tsx:11-25`: `ActiveRunsProvider` wraps the whole app, instantiates `useActiveRuns()`, and renders exactly one `<DecisionDialog>` bound to `{ open: showDecisionDialog, decision: pendingDecision, onAnswered: handleDecisionAnswered }` (:17-22). Any component in the tree can therefore trigger the modal through context.

### 7.2 Intercept-and-rerun loop
`src/hooks/use-active-runs.ts`:
- state: `pendingDecision: DecisionItem | null` + `showDecisionDialog: boolean` + `pendingTaskIdRef` (:18-21);
- polls `/api/runs` and `/api/missions` every **3 s** (`POLL_INTERVAL = 3000`, :8, :24-29, :77-81);
- when the user clicks "run" on a task, `runTask()` POSTs `/api/tasks/{id}/run`; on failure it checks the error body and, if `data.pendingDecision` is present, stores it, remembers the taskId in the ref, and opens the dialog instead of showing an error toast (:116-144, intercept at :125-131);
- `handleDecisionAnswered()` closes the dialog, clears state, and **re-invokes `runTask(savedTaskId)`** (:146-155) — closing the human-decision loop automatically: answer → PUT → 300 ms delay → POST run again → gate now passes → detached execution spawns.
- all dialog state exposed via hook return (:249-253).

### 7.3 Ambient indicators (decision awareness outside the modal)
- **Sidebar badge:** `src/hooks/use-sidebar.ts` polls every 10 s ("matches inbox/decisions frequency", use-sidebar.ts:15) hitting `/api/sidebar`, whose route counts pending decisions server-side (`src/app/api/sidebar/route.ts:17` filter + :22 response field). Badge count drives nav attention.
- **Dashboard widget:** home page lists pending decisions as an attention row with yellow border linking to `/decisions` (`src/app/page.tsx:145`), plus a dedicated Decisions Widget card (:617-621).
- **Dashboard aggregation API:** `/api/dashboard` computes `pendingDecisions` count, top-5 `pendingDecisionsList`, and full pending list (`src/app/api/dashboard/route.ts:37, :69, :75, :82`). Home page additionally derives "awaiting-decision" agent-status by mapping pending decision taskIds onto assigned tasks (`src/app/page.tsx:100-127`) and computes impeded-task counts from the same set (:113-115).
- **Activity feed labels:** `decision_requested` / `decision_answered` have display names and yellow/emerald color chips in `src/app/activity/page.tsx:38-39, :56-57`.
- **Dedicated queue page:** `/decisions` (§5.4) with skeleton loading, error state, pending section ("Needs Your Input") and collapsed answered history (:52-71, :85-167, :177-206).
- **AI context snapshot:** `scripts/generate-context.ts:159` reads decisions; line 189 filters pending; line 226 writes `Pending: N | Answered: M` into the regenerated `ai-context.md` so CLI-side agents see queue pressure.

---

## 8. History & audit trail

Three layers:

1. **The decisions array itself is append-mostly history:** items are never removed on answer; `status/answer/answeredAt` turn them into a permanent Q&A record rendered in the "Answered" section of `/decisions` (page.tsx:177-206, shows answer text + relative time, dimmed cards). Only explicit DELETE removes records (§5.3).
2. **Activity log events:** `decision_requested` on create (route.ts:65-76) and `decision_answered` on transition with the chosen answer embedded in the summary (route.ts:111-124). EventType union includes both values (types.ts:253-254); Zod enum mirrors them (validations.ts:25-26). These flow into the activity feed and `generate-context.ts` stats.
3. **Loop-detection error history feeding decisions:** `mission.loopDetection.taskErrors[taskId]` keeps the last 5 error strings per task (200-char capped, run-task.ts:494-502) and the most recent one is embedded into auto-created decision context (run-task.ts:518-519) — i.e. failure forensics ride along with the question.

Gaps: DELETE unaudited (W3); direct-file edits per CLAUDE.md protocol bypass activity logging unless the agent remembers step 4 of the protocol; no correlation id links the ActivityEvent back to the decision beyond `taskId` + summary truncation.

---

## 9. Weakness register (observed, cited)

| # | Finding | Evidence |
|---|---|---|
| W1 | **No auth/authorization on any decisions endpoint** — any local HTTP caller can list/create/answer/delete decisions | route.ts:7-141 has no auth middleware |
| W2 | **Cross-process write race**: daemon writes decisions.json with raw `writeFileSync` while Next.js API uses `async-mutex`; two writers can interleave read-modify-write cycles and lose records | run-task.ts:538 vs data.ts:353-356/:184; CLAUDE.md "direct file writes bypass the mutex" |
| W3 | **DELETE is silent** — hard delete with no ActivityEvent, breaking audit continuity | route.ts:129-141 |
| W4 | **Only latest answer injected** on retry — earlier answered decisions for same task are ignored | prompt-builder.ts:287-297 |
| W5 | **No consumption marker** — answered decisions re-inject into every future run of the task forever; stale guidance can poison unrelated retries | prompt-builder.ts:497-499 unconditional call; no state change on injection |
| W6 | **Fixed 300 ms delay** between answer-write and automatic re-run; slow disk could re-run before gate clears (benign: run would just 400 again, but the UX promise "re-run after answering" can silently fail) | decision-dialog.tsx:77-78; use-active-runs.ts:147-155 |
| W7 | **Duplicate-guard only checks `pending`** — after each answer, another 3 failures create a *new* decision; unbounded decision churn under persistent failure | run-task.ts:512-516 + :504-505 |
| W8 | **Schema drift in escape hatch**: fix-stuck-tasks.js writes `status:"dismissed"`, invalid per types/Zod; such rows are invisible to both filters (not `pending` → don't block; not `answered` → excluded from retry-context AND from "Answered" UI section) — records vanish from all views | fix-stuck-tasks.js:26-34 vs types.ts:301, validations.ts:17 |
| W9 | **No TTL/aging** on pending decisions — tasks block indefinitely; recovery requires manual UI action or script | all enforcement points key off `status==="pending"` only (e.g. prompt-builder.ts:579) |
| W10 | **`taskId:null` decisions are dead-end data** — visible in queue but consumed by nothing | §4.8-4.9 |
| W11 | **Options not enforced** — answer may be any free string ≤500 chars regardless of offered options; fine for UX but means downstream consumers cannot switch on enumerated choices | validations.ts:248 |

---

## 10. Fit assessment for Fabrica operator-intervention UX

**Verdict: HIGH fit as the interaction pattern; port the shape, fix W1/W2/W5-class issues before porting.**

Directly reusable patterns for Fabrica (desktop CLI-agent-management app):

1. **Block-with-payload error responses** (§4.1): returning the full pending item inside the 400 body let the global modal render with zero extra fetches — ideal for Fabrica's IPC surface (renderer asks main to start an agent run; main replies `{ blockedByDecision }` with the whole intervention object attached).
2. **Intercept-and-rerun loop** (§7.2) maps 1:1 onto Fabrica's run-start button flow: remember intent, show modal, on answer re-dispatch. Cheap, robust, no scheduler needed for the manual path.
3. **Multi-surface ambient awareness** (§7.3): badge count + dashboard widget + per-entity status derivation ("awaiting-decision" agent states, page.tsx:100-127) is exactly the visibility model an operator console needs; the derived-state-from-set-of-blocked-ids trick is portable.
4. **Structured escalation questions with fixed option trios + forensic context** (§3.2 daemon escalation): "retry differently / skip / stop" + last-error embedding is a strong default vocabulary for autonomous-run interventions in Fabrica.
5. **Answers-as-prompt-context** (§6): injecting the operator's words verbatim into the next attempt prompt, wrapped in imperative do-not-repeat fencing, is the correct minimal mechanism for steering CLI agents post-failure.

Fix-before-port list (mapped to weaknesses):

- Replace file+mutex storage with transactional store (W2); keep the JSON schema shape.
- Add consumption semantics: mark decision `applied` after first injection, or scope injection to the immediately-next attempt (W5) and inject full ordered answer chain (W4).
- Make resumption event-driven rather than poll/discovery-based: answering should emit an unblock event to the runner (Fabrica already has push channels; MC's 300 ms delay + 3-10 s polling would be regressions) (W6, §4.8).
- Enumerate statuses including a real `dismissed/expired` value with defined semantics instead of out-of-band script drift (W8, W9).
- Audit deletes (W3) and dedupe escalations across the full history, not just pending set (W7).

Relationship note for synthesis: MC now has TWO operator-intervention systems — this generic decision queue (task-progress level, freeform questions) and field-ops approvals (execution level, risk-tiered FSM, R4-1.6/R4-1.28). Fabrica's production architecture should likely keep both tiers: risk-tiered hard gates for dangerous operations + freeform decision gates for ambiguity during autonomous runs, sharing one UI surface (MC splits them across `/decisions` and field-ops approval UIs, which fragments operator attention).

---

## Scan coverage statement

**Read fully (line-by-line):**
- `src/lib/types.ts` :290-329 (decisions block; grep-swept entire file for Decision*)
- `src/lib/validations.ts` :17, :47-62, :225-266 (LIMITS + decision schemas + neighbors)
- `src/lib/data.ts` :170, :184, :264-270, :353-356, :430-433, :528-589 (persistence engine)
- `src/app/api/decisions/route.ts` :1-141 (complete)
- `src/app/api/tasks/[id]/run/route.ts` :1-167 (complete)
- `src/app/api/ventures/[id]/run/route.ts` :100-179 (pre-validation region)
- `src/app/api/projects/[id]/run/route.ts` — grep-level only (:120 decisions read confirmed, pattern identical to ventures)
- `src/app/api/missions/route.ts` :60-199 (reconciler incl. decision filtering)
- `src/app/api/dashboard/route.ts`, `src/app/api/sidebar/route.ts` — grep hits only (:37/:69/:75/:82; :17/:22)
- `src/components/decision-dialog.tsx` :1-166 (complete)
- `src/app/decisions/page.tsx` :1-209 (complete)
- `src/hooks/use-active-runs.ts` :1-255 (complete)
- `src/hooks/use-data.ts` :249-251, `src/hooks/use-sidebar.ts` :10-15/:21/:63, `src/hooks/use-dashboard*.ts` :19/:36/:43 — grep hits
- `src/providers/active-runs-provider.tsx` :1-33 (complete)
- `src/app/page.tsx` :92-145, :572-621 (dashboard derivation + widget); `src/app/activity/page.tsx` :38-39/:56-57 — targeted reads/greps
- `scripts/daemon/prompt-builder.ts` :250-321 (buildRetryContext), :460-580 (buildTaskPrompt wiring + hasPendingDecision); rest of file scanned for decision references via grep (68-hit sweep)
- `scripts/daemon/run-task.ts` :374, :440-669 (escalation + continuation), :800-849 (pre-exec guards); remaining regions grep-swept
- `scripts/daemon/dispatcher.ts` :120-159, :330-419; import surface :7, :15
- `scripts/fix-stuck-tasks.js` :1-46 (complete)
- `scripts/generate-context.ts` :150-179 (+grep sweep for decision usage)
- `scripts/seed-demo.ts` :656-695 (decision seed); `scripts/seed-brewster.ts` :58 — grep hit
- Repo-level contract docs: `CLAUDE.md` decisions schema + request protocol sections; `README.md:330`; `.claude/commands/{daily-plan,standup,pick-up-work}/user.md` lines 6/7/11; `.gitignore:51`; `scripts/sync-public.sh:52,:71` (decisions.json reset-to-empty on public sync)
- `__tests__/data.test.ts` :210 region noted ("reads decisions.json…") — test file NOT fully read

**Deliberately skipped (out of scope per task boundary):** field-ops approval FSM files (`field-ops*`, owner-guard, spend-tracker, execute-route guards) — covered by R4-1.6/R4-1.24/R4-1.28; workflow-engine internals beyond the decision touchpoints; UI component library internals (`ui/dialog.tsx` etc.).

**Negative evidence recorded:** repo-wide grep found NO reader of `decision.answer` other than `buildRetryContext` (prompt-builder.ts:287-310) — confirming answers influence behavior exclusively through prompt injection; no scheduled/expiry logic touches decisions.json anywhere (only `.gitignore`, sync script, seeds, daemon, API, UI hit the file — full 28-match grep inventory in scan notes).

*Report size ~30KB · written in 3 chunks · verified on disk after final chunk.*


