# MC Deep Dive — Notifications & Alerting Channels (R4-1.18)

> Task ATLAS R4-1.18 · Round 4 discovery wave (`run_43e01c767919`) · task `task_24cfdd7e2b30` / dispatch `ctx_55be86b70ac1`
>
> Question answered: **how are operators notified of agent events (completion / failure / approval-needed)?** Covers desktop notifications, sound, email/webhooks, notification preferences, quiet hours, aggregation.
>
> All citations are relative to `_sources/mission-control/mission-control/`. Read-only scan; nothing outside `.Fabrica-atlas-board/` was modified.

---

## 1. Executive Summary

Mission-control has **NO outbound notification infrastructure whatsoever**: no OS/desktop notifications, no sound, no email, no webhooks, no push, no Slack/Discord/Telegram/SMTP providers anywhere in `src/` or `scripts/` (verified by negative searches — see §8). Every alert lives inside the web UI and is delivered through exactly four in-app channels:

| # | Channel | Transport | Latency | Persisted? |
|---|---------|-----------|---------|------------|
| 1 | **Inbox messages** (`data/inbox.json`) | JSON file → polled UI | ≤10 s (sidebar) / manual (inbox page) | Yes |
| 2 | **Activity log events** (`data/activity-log.json`) | JSON file → `/activity` timeline | Manual visit only | Yes |
| 3 | **Sonner toasts** | In-page React state | ~3 s (run-poll diff) | No — transient |
| 4 | **Badge counters + approval modal** | Polled sidebar API / intercepted POST response | ≤10 s / immediate on action | Counters derived live; dialog ephemeral |

Consequence: the operator must be **looking at the browser tab** to learn anything. There is no notification-preferences screen, no quiet hours, no digest scheduler, and no per-event-type opt-in/opt-out. Aggregation exists only in two weak forms: inbox *thread grouping* (src/app/inbox/page.tsx:380-396) and mission-level *rollup messages* (scripts/daemon/run-task.ts:376-443).

---

## 2. Channel 1 — Inbox Messages (primary persistent channel)

### 2.1 Data model

- `InboxMessage`: `{ id, from, to, type, taskId, subject, body, status, createdAt, readAt }` — src/lib/types.ts:282-293.
- `MessageType = "delegation" | "report" | "question" | "update" | "approval"` — src/lib/types.ts:279.
- `MessageStatus = "unread" | "read" | "archived"` — src/lib/types.ts:280.
- Storage: local JSON file `data/inbox.json`, mutated through per-file mutex helpers (`mutateInbox`, imported at src/lib/field-ops-notify.ts:11).

### 2.2 Producer A — daemon task completion (agent → operator)

On every successful daemon task run (scripts/daemon/run-task.ts):

1. Task marked done (:150).
2. **Completion report pushed to inbox** — `from: agentId, to: "me", type: "report", subject: "Completed: <taskTitle>", status: "unread"` — :156-193 (message literal :176-187; human title resolved from tasks.json :163-174).
3. **`task_completed` activity event** appended — :195-216 (event literal :202-210).

### 2.3 Producer B — daemon task failure

`handleTaskFailure()` fires when all continuation attempts are exhausted (:232-304):

1. **`task_failed` activity event** first — details carry agent id, session count, error truncated to 300 chars — :255-263.
2. **Failure report to inbox** — `subject: "Failed: <title>"`, sessions count + error truncated to 500 chars, `to: "me", status: "unread"` — :286-297.

Both completions and failures land silently in JSON files; neither pings the operator out-of-band. The asymmetry is zero — failures get exactly the same treatment as successes.

### 2.4 Producer C — mission-level rollup reports (the aggregation point)

After each dispatch cycle, `postProjectRunReport(mission)` posts ONE consolidated inbox message per mission (:376-443):

- Subject branches on status: `"Mission complete: X/Y tasks done"` vs `"Mission stalled: X/Y tasks done, Z remaining"` — :386-389.
- Body aggregates: completion line (:393-397), failed-count line (:399-401), completed-task list with up-to-3 extracted output file paths each (:403-417), failed list with status+attempt (:419-426), and for stalls a nudge: `"Please check the Status Board… Some may need your input on the Decisions page."` (:428-430).
- Pushed `from: "system", to: "me", type: "report", status: "unread"` (:432-443).
- The Next.js API path duplicates this rollup for manually-triggered project runs — src/app/api/missions/route.ts:269-297.

This is the closest thing to **notification aggregation** in the codebase: one summary per mission cycle instead of N per-task messages. It is batching-by-scope, not rate-limiting or digest scheduling.

### 2.5 Producer D — Field-Ops → inbox bridge

A dedicated bridge maps Field Ops lifecycle events into the same inbox + activity log (src/lib/field-ops-notify.ts; header intent comment :1-9):

| Function | Trigger | Message shape | Lines |
|---|---|---|---|
| `notifyFieldTaskCompleted` | field task executed OK | `from:"system"`, `type:"report"`, result JSON truncated to 500 chars | :22-50 |
| `notifyFieldTaskFailed` | execution error | error string surfaced + retry suggestion appended | :55-85 |
| `notifyFieldTaskApproved` | human approval granted | `type:"update"` | :90-115 |
| `notifyFieldTaskRejected` | human rejection | rejection feedback + resubmit guidance | :120-147 |
| `logFieldOpsActivity` | all of the above | generic `ActivityEvent` writer | :151-174 |

Call sites: approve/reject — src/app/api/field-ops/tasks/route.ts:349-359; batch approve/reject — src/app/api/field-ops/batch/route.ts:119-129; execution success/failure — src/app/api/field-ops/execute/route.ts:541-551; signature-flow completion — src/app/api/field-ops/execute/submit-signature/route.ts:163-164.

Recipient is always `task.assignedTo || "me"` (field-ops-notify.ts:23, :56, :91, :121) — the assigned agent gets a copy and the human operator ("me") is the fallback owner.

### 2.6 Inbox consumption UX

- Threaded view grouped by participants + normalized subject; unread threads visually highlighted (`border-primary/30 bg-primary/5`) and bolded — src/app/inbox/page.tsx:380-417.
- **Mark-as-read is implicit on expand** — opening a collapsed thread marks the whole thread read in the same click handler — page.tsx:393-396.
- Per-thread unread count badges (`variant="destructive"`) — page.tsx:435-440; status filter All/Unread/Read/Archived — page.tsx:370-375.
- Live `"agent composing…"` indicator with inline STOP button during inbox auto-responder sessions — page.tsx:441-449 (backed by `/api/inbox/respond/status` + `/respond/stop` routes).
- The inbox page itself has no auto-refetch interval visible; freshness comes from navigation plus the sidebar poll (§5.1).

### 2.7 Agent-side inbox (bidirectionality)

Agents consume the same channel by reading `data/inbox.json`; the daemon's `run-inbox-respond.ts` builds prompts from unread messages and instructs the agent to append replies to inbox.json (scripts/daemon/run-inbox-respond.ts:245-263). The channel is bidirectional agent↔operator messaging with **no push semantics in either direction**.

---

## 3. Channel 2 — Activity Log Events (audit timeline)

- `EventType` union is the full agent-event vocabulary: `task_created | task_updated | task_completed | task_delegated | task_failed | message_sent | decision_requested | decision_answered | brain_dump_triaged | milestone_completed | agent_checkin | field_task_completed | field_task_failed | field_task_approved | field_task_rejected` — src/lib/types.ts:246-261.
- Event shape `{ id, actor, taskId, summary, details, timestamp }` — types.ts:263-271; storage `data/activity-log.json`.
- Producers: daemon run-task.ts:202-210 (completion) and :255-263 (failure); field-ops bridge field-ops-notify.ts:151-174; plus API-side delegation/decision events.
- Surfacing: dedicated `/activity` timeline page and a compact "Recent Activity" card on the dashboard — src/app/page.tsx:674-684 region. Purely retrospective: a `task_failed` event carries no more visual weight than `task_updated`; there are no severity levels, filters-by-severity, or alert hooks on any event type.

---

## 4. Channel 3 — Toasts (the only near-real-time alert)

### 4.1 Infrastructure

- Library: `sonner ^2.0.7` — package.json:50.
- Single global mount in root layout: `<Toaster theme="system" position="bottom-right">` with only a className override — src/app/layout.tsx:21-27.
- Thin wrapper module `showSuccess` / `showError` / `showInfo` — src/lib/toast.ts:3-13. No custom durations, stacking caps, or sounds configured anywhere in the repo — sonner defaults only.

### 4.2 Run-event toasts via diff-polling (the core alerting loop)

`useActiveRuns()` (src/hooks/use-active-runs.ts) is the app's real-time event detector:

- Polls `/api/runs` + `/api/missions` every **3000 ms** (`POLL_INTERVAL`, :8; effect :77-81).
- Keeps a `seenRunIds` ref to diff successive polls (:14); the FIRST fetch seeds the set without toasting so pre-existing/historical failures never spam (:16, :36-39).
- **Completion toast**: run newly observed as `status === "completed"` → `showSuccess("Task completed by ${run.agentId}")` (:41-45).
- **Failure toast**: run newly observed as `"failed" | "timeout"` → `showError(run.error ?? "Task execution failed")` (:47-54).
- Poll errors swallowed silently (:72-74) — a dead backend produces NO operator signal at all.
- Mounted app-wide via `ActiveRunsProvider` wrapping every page (src/providers/active-runs-provider.tsx:11-25).

Action-feedback toasts also fire from this hook: task start success/failure (:133-141), project-run start with launched/queued counts (:173-181), stop confirmations with terminated-task counts (:190-229). The same wrapper pattern is used across layout-shell.tsx:13, decision-dialog.tsx:14, sign-transaction-button.tsx:8, and field-ops pages.

### 4.3 Limits of the toast channel

Toasts are transient, client-only, single-tab, and unconfigured (layout.tsx:21-27). If the tab is closed or backgrounded long enough for browser timer throttling, completion/failure awareness degrades entirely to the persisted inbox/activity channels — which nobody is pushed toward.

---

## 5. Channel 4 — Badges, Attention Items, and the Approval Modal

### 5.1 Sidebar badge counters (persistent ambient signals)

- Backend aggregation endpoint `GET /api/sidebar` computes in one pass: `unreadInbox` (inbox messages with status "unread"), `pendingDecisions` (decisions with status "pending"), `pendingFieldApprovals` (field tasks with status "pending-approval") — src/app/api/sidebar/route.ts:15-19; served with `Cache-Control: private, max-age=2, stale-while-revalidate=5` (:23).
- Client hook `useSidebar()` polls every **10 s** (`POLL_INTERVAL`, src/hooks/use-sidebar.ts:15), but ONLY while `document.visibilityState === "visible"` (:48-50), re-syncing on tab focus via visibilitychange (:52-55). Poll failures are silent by design ("sidebar badges are non-critical") (:38-40).
- Rendering: Inbox and Decisions nav items map `badgeKey` → count (src/components/app-sidebar.tsx:63-65 nav config; props :97; `badges` map :99) shown as red destructive badges (:235-237 desktop; :487-489 mobile).
- Field-Ops gets its own emerald pending-approvals badge when `pendingFieldApprovals > 0` — :184/:199-202 (desktop), :408/:425-428 + "(N pending)" text :441/:448 (mobile).

### 5.2 Dashboard attention items (curated nudge list)

The dashboard builds an action list that includes agent-report review items: `${unreadReports.length} agent report(s) to review` linking to /inbox — src/app/page.tsx:138-146 (unreadReports filtered from messages at :138). Plus: unread-inbox widget with top-3 message preview + "+N more" (:583-608) and a pending-decisions widget with count badge (:630-650 region).

### 5.3 Approval-needed surfacing — two distinct mechanisms

**(a) Decision dialog (task-level, blocking).** When an operator clicks Run on a task whose dispatch requires human input, the API response carries `pendingDecision`; the client intercepts it BEFORE showing an error toast and opens a modal instead — use-active-runs.ts:116-131 (`if (data.pendingDecision)` → `setPendingDecision` + `setShowDecisionDialog(true)`, :126-130). The modal renders question/options/context from `DecisionItem` and submits the answer (src/components/decision-dialog.tsx:35-60+); on answer, the same task auto-reruns (`handleDecisionAnswered`, use-active-runs.ts:147-155). The provider mounts this dialog globally (active-runs-provider.tsx:17-22), so approval requests can surface on ANY page — but only while an operator actively triggers a run.

**(b) Daemon loop escalation (autonomous failure → decision queue).** After `MAX_LOOP_ATTEMPTS = 3` failures on the same mission task, `checkLoopAndEscalate()` writes a pending `decisions.json` entry asking how to proceed, with options Retry/Skip/Stop-mission — run-task.ts:374, :485-543 (dedupe against existing pending decisions for the same task :512-516; decision literal :521-536). This surfaces ONLY through the Decisions badge (§5.1) and the /decisions page — no toast, no inbox message is attached to escalation itself.

**(c) Field-Ops approvals queue.** `/field-ops/approvals` polls `GET /api/field-ops/tasks?status=pending-approval` and lists tasks awaiting human approve/reject with risk-level filtering and batch actions — src/app/field-ops/approvals/page.tsx:46-49 (loadData poll), risk filter type :34-36, batch selection state :43-45. Entry points: sidebar badge (§5.1) or manual navigation. High-risk crypto/payment approvals additionally pause at an `awaiting-signature` state handled via execute/prepare → submit-signature routes (route files present under src/app/api/field-ops/execute/).

### 5.4 Poll-cadence summary

| Poll | Interval | Gated on visibility? | Failure mode |
|---|---|---|---|
| useActiveRuns (/api/runs, /api/missions) | 3 s (use-active-runs.ts:8) | No | silent catch (:72-74) |
| useSidebar (/api/sidebar) | 10 s (use-sidebar.ts:15) | Yes (:49) | silent catch (:38-40) |
| Inbox page content | none (navigation-driven) | — | error states |
| Field-ops approvals list | none visible in loadData | — | try/catch |

---

## 6. Explicit Absences (verified negatives)

Each absence below was verified by exhaustive regex search over `src/` + `scripts/` (node_modules excluded) returning ZERO hits:

1. **No OS/desktop notifications** — no `new Notification(`, no `Notification.requestPermission`, no service worker registration anywhere (search §8a). Mission-control is a pure Next.js web app; there is no Electron/Tauri shell.
2. **No sound/audio alerts** — no Audio/AudioContext/play/beep usage tied to alerts (§8b).
3. **No email/webhook/push providers** — zero hits for nodemailer/smtp/sendgrid/mailgun/postmark/resend/twilio; zero external-URL `fetch("https://…")` calls in src/ or scripts/ — ALL network I/O is relative-path API calls (§8c). The word "email" appears only as a *task payload type* (`email-campaign` field-task content fields, src/components/field-ops/field-task-form-dialog.tsx:88-122) and as credential-scrub patterns in daemon/security.ts:16 — neither sends anything.
4. **No notification preferences UI** — the route tree contains no settings/preferences page (src/app/ has: activity, autopilot, brain-dump, checkpoints, crew, decisions, field-ops, guide, inbox, objectives, priority-matrix, projects, skills, status-board, team, ventures). Nothing persists per-user alert choices.
5. **No quiet hours / do-not-disturb** — no time-window gating of any notification producer; the only visibility gate found is `document.visibilityState` polling throttle for badges (use-sidebar.ts:49) which REDUCES freshness when hidden rather than silencing alerts.
6. **No aggregation engine** — aggregation = mission rollup messages (§2.4) + thread grouping (§2.6) + badge counts (§5.1). No dedup windowing, rate limiting, severity tiers, or digest scheduling exists.
7. **No unread-persistence for toasts** — missed toasts are unrecoverable; recovery depends on the operator noticing inbox/decisions/activity artifacts unprompted.


---

## 7. Relevance to Fabrica Fleet-Supervision UX

Fabrica's target direction (desktop CLI-agent management & operations) makes "operators must notice blocked agents" a first-class requirement. Mission-control offers both a proven baseline and explicit gaps to design past:

### 7.1 What to keep/port (proven patterns with citations)

1. **Diff-polling run detector → toast** — `seenRunIds` diffing with initial-fetch suppression (use-active-runs.ts:14-16, :36-56) is a clean 3-second completion/failure detector; port the pattern into Fabrica's Electron main process where it can ALSO drive OS notifications.
2. **Mission-level rollup reports** (run-task.ts:376-443) — one consolidated per-mission summary beats N per-task pings under fleet scale; adopt as the model for per-fleet/per-worktree digests.
3. **Loop-detection escalation into a decision queue** (run-task.ts:374, :485-543) — after N repeated failures, stop retrying and create a human decision with concrete options (Retry/Skip/Stop). This is exactly the blocked-agent contract Fabrica needs.
4. **Three-counter ambient state** — unread inbox / pending decisions / pending field approvals as always-visible badges (api/sidebar/route.ts:15-19) generalizes naturally to: blocked agents / awaiting approval / failed runs.
5. **Approval interception on action** (use-active-runs.ts:125-131) — surfacing a pending decision modal at the exact moment an operator tries to advance work is good UX worth keeping.
6. **Implicit mark-as-read on inspect** (inbox page.tsx:393-396) and **inline stop of autonomous responders** (:442-449) — low-friction acknowledgement and kill-switch patterns.

### 7.2 Gaps mission-control leaves open (Fabrica must close)

| Gap in MC | Evidence | Fabrica implication |
|---|---|---|
| No out-of-app delivery at all | §6.1-6.3 negatives | An operator running headless agents will not see ANY alert; Electron gives Fabrica `Notification` API + tray badges + sounds natively (cf. FA window/tray report: discovery/round4/fa-window-tray-notifications.md). Blocked/blocked-for-approval events should escalate to OS notifications. |
| Failures are visually equal to successes | activity log has no severity tiers (types.ts:246-261) | Introduce severity levels (info/warn/critical) with distinct toast/notification styling and retention. |
| Silent poll failure | use-active-runs.ts:72-74; use-sidebar.ts:38-40 | A dead backend is indistinguishable from quiet. Fleet supervision needs a visible connection/staleness indicator. |
| Visibility-gated polling slows alerts when hidden | use-sidebar.ts:49 | In a desktop app, backgrounded ≠ away; background channels must stay hot. |
| Toasts unconfigured & unrecoverable | layout.tsx:21-27 | Add notification center / history so missed transient alerts are reviewable. |
| No preferences or quiet hours | §6.4-6.5 | Operator-configurable channels per event class (e.g., always notify for approval-needed, digest for completions), plus quiet hours for non-critical classes. |
| Approval-needed surfaces only via badge or on-action modal | §5.3a-c | "Agent blocked >N minutes awaiting approval" should be its own proactive alert class — MC never times or escalates a pending decision/field-approval by age. |
| Mark-read-on-open can silently clear alerts | page.tsx:393-396 | Separate "seen" from "acknowledged" for critical items. |

### 7.3 Bottom line

Mission-control's notification story is **pull-only, in-tab, and flat**: four channels (§1 table), zero outbound transports, zero preference surface. It proves the data layer (events, decisions, rollups, badges) but delegates the entire "make the human look" problem to chance. Fabrica's fleet-supervision UX should reuse MC's event/decision/rollup schema wholesale and replace its delivery layer with tiered desktop notifications + persistent alert history + aging escalations.

---

## 8. Scan-Coverage Statement

**Method:** full recursive file inventory of `src/` (all .ts/.tsx incl. app/, components/, hooks/, lib/, providers/) and `scripts/` (incl. daemon/) from directory listing; then targeted exhaustive regex sweeps (`rg`, node_modules excluded) for notification-relevant terms across all ~180 source files; then full reads of the files below.

**Files fully read:** src/lib/field-ops-notify.ts (174 lines); src/hooks/use-active-runs.ts (255); src/hooks/use-sidebar.ts (63); src/app/api/sidebar/route.ts (25); src/providers/active-runs-provider.tsx (33); src/lib/toast.ts (13); src/app/layout.tsx (32); src/components/decision-dialog.tsx (:1-60); src/lib/types.ts (:243-292 EventType/InboxMessage region); scripts/daemon/run-task.ts (:150-309, :370-443, :475-544); src/app/inbox/page.tsx (:370-449); src/app/field-ops/approvals/page.tsx (:1-60).

**Files partially read via grep/context:** src/app/page.tsx, src/components/app-sidebar.tsx, scripts/daemon/run-inbox-respond.ts, src/app/api/missions/route.ts, src/app/api/field-ops/{tasks,batch,execute,execute/submit-signature}/route.ts, src/lib/data.ts (via imports), package.json, layout-shell.tsx (import line).

**Negative searches performed (all zero-hit over src/ + scripts/, node_modules excluded):** (a) `Notification` API / requestPermission / serviceWorker / push; (b) sound terms (audio/beep/sound/AudioContext); (c) providers (nodemailer/smtp/sendgrid/mailgun/postmark/resend/twilio/slack/discord/telegram/webhook) AND external-URL fetches `fetch("https?://…")`; (d) quiet/do-not-disturb/mute/digest/aggregation scheduling. One earlier broad grep included the term `push`, matching JS `lines.push` noise — discarded; the refined searches above are authoritative.

**Skipped as out-of-scope:** node_modules, __tests__/integration fixtures, seed scripts' content bodies, UI styling internals of unrelated pages, and `_sources/mission-control` root docs outside mission-control/ (CLAUDE.md was used only for protocol context already covered by prior rounds). The `/decisions` page body was not read line-by-line; its behavior is documented via types.ts DecisionItem usage, api/sidebar/route.ts:17, use-active-runs.ts decision flow, and dashboard widget cites — flagging as minor residual for a future verify pass if desired.

*Report end — R4-1.18.*
