# Discovery Report R4-2.x — Mission-Control UI Frontend Architecture Deep Dive

**Scope:** `mission-control/mission-control/src` — component tree, state-management layer, agent-run monitoring views, and real-time update architecture. Line-level scan with `file:line` citations for every claim.
**De-dup note vs round3:** `discovery/round3/round3/mc-frontend-buzz-clients.md` already covered (a) the hook-factory pattern at survey level, (b) `app/field-ops/*` pages (dashboard, approvals, vault, gating), and (c) buzz clients. This report deliberately does NOT re-cover field-ops page internals or vault crypto; it covers the **app shell, global state wiring, run-monitoring surfaces outside field-ops, and the polling/realtime fabric** that round3 only touched in passing. Where overlap was unavoidable (e.g. `use-active-runs.ts`), this report goes line-level where round3 stayed summary-level.

All paths relative to `mission-control/mission-control/` unless prefixed.

---

## 1. Application Shell & Component Tree

### 1.1 Root layout (`app/layout.tsx`, 32 lines)

- Server component root: `<html>` → `<body class="inter antialiased">` wrapping `ThemeProvider` → `LayoutShell` → children, plus a global `Toaster` from `sonner` positioned bottom-right themed to system (`app/layout.tsx:15-31`).
- Toast styling is forced onto the design-system tokens via `toastOptions.className = "border-border bg-card text-card-foreground"` (`app/layout.tsx:24-26`).
- Metadata self-describes the product: "The command center for humans supervising AI agents — Eisenhower matrix, Kanban, objectives, and agent deployment" (`app/layout.tsx:10-13`). Note: ThemeProvider is the ONLY provider mounted here — all other providers are mounted deeper (see 1.3).
- Error boundaries exist at both levels: `app/error.tsx` (3,292 B, route-segment reset UI) and `app/global-error.tsx` (3,287 B); plus `app/loading.tsx` (302 B) and `app/not-found.tsx` (788 B).

### 1.2 LayoutShell — the persistent chrome (`components/layout-shell.tsx`, 123 lines)

Full mount order inside LayoutShell (`components/layout-shell.tsx:67-121`):

```
TooltipProvider (delayDuration=300)                          :68
└─ div.min-h-screen.bg-background
   ├─ <a href="#main-content"> skip-to-content link          :70
   ├─ KeyboardShortcuts        (global hotkeys)              :71
   ├─ OnboardingDialog                                       :72
   ├─ SearchDialog            (Ctrl+K palette)               :73
   ├─ CommandBar              (top quick-capture bar)        :74-84
   ├─ [mobile backdrop when sidebarOpen && isMobile]         :87-92
   ├─ AppSidebar              (nav + badges)                 :94-102
   └─ main#main-content
      ├─ [offline banner when !online]                       :110-115
      └─ ActiveRunsProvider → {children}                     :116-118
```

- Sidebar state is local `useState(true)`; mobile detection via `window.innerWidth < 768` resize listener that auto-closes the sidebar (`layout-shell.tsx:23, 31-40`), and navigation also auto-closes it on mobile (`:43-45`).
- Main content margin shifts between `ml-56` (open) and `ml-14` (collapsed rail) on desktop, `ml-0` on mobile (`:103-108`).
- CommandBar receives `tasks` from `useSidebar()` and its task-click handler routes to `/status-board` rather than deep-linking the task (`:79-83`).
- Brain-dump capture lives at chrome level: `handleCapture` POSTs `/api/brain-dump` with `{content, capturedAt, processed:false, convertedTo:null, tags:[]}` (`:47-65`) — i.e., capture-from-anywhere is a first-class shell feature.
- Offline banner: when `useConnection().online` is false, a destructive-tinted strip reads "Connection lost — changes may not save. Retrying automatically..." with pulsing dot (`:28, 110-115`).

### 1.3 ActiveRunsProvider — the global run-state singleton (`providers/active-runs-provider.tsx`, 33 lines)

- Thin React Context over `useActiveRuns()`: `ActiveRunsContextValue = ReturnType<typeof useActiveRuns>` (`active-runs-provider.tsx:7`); consumer hook `useActiveRunsContext()` throws if used outside the provider (`:27-32`).
- Critically, the provider ALSO mounts the global `DecisionDialog`, driven by `activeRuns.showDecisionDialog / pendingDecision / handleDecisionAnswered` (`:17-22`). This means every route inside `main` can pop the decision gate modal without any per-page wiring.
- Mount point is inside LayoutShell's `<main>` (`layout-shell.tsx:116-118`) — NOT the root layout, so consumers must be page content (confirmed consumers: `app/page.tsx:34`, `app/status-board/page.tsx:26`, `app/team/[role]/page.tsx:19`).

### 1.4 Navigation surface (`components/app-sidebar.tsx`, 631 lines)

- Five static link tables define the IA: mainLinks (Command Center `/`, Objectives, Ventures, Brain Dump, Checkpoints, Autopilot, Guide) `:47-55`; taskLinks (Priority Matrix, Status Board) `:57-60`; commsLinks (Inbox, Activity, Decisions) `:62-66`; fieldOpsLinks (Dashboard/Missions/Services/Vault/Safety/Activity) `:68-75`; crew section rendered dynamically per active agent (`:251-301` desktop, mirrored `:527-622`).
- Badge counts (`unreadInbox`, `pendingDecisions`, `pendingFieldApprovals`) arrive as PROPS, not fetches (`:87-97`) — they are fed by `useSidebar()` in layout-shell (`layout-shell.tsx:27, 94-102`), which polls `/api/sidebar` (see §4.2). Destructive badges appear on Comms items when >0 (`:217-241`, desktop `:467-515`); emerald badge for pending Field-Ops approvals on the dashboard item (`:184-204`, collapsed-dot variant `:435-452`).
- Agent icons resolve Lucide names through an `iconMap` with `Bot` fallback (`:78-85`); only `status === "active"` agents get nav entries (`:101`).
- Responsive modes: desktop collapses to a w-14 icon rail vs w-56 full (`:315-319`) with tooltips; mobile renders an overlay drawer (`:104-110`).

---

## 2. State Management Architecture

### 2.1 Stack facts

- **No external client state library**: `package.json` dependencies contain no redux/zustand/jotai/react-query/swr — state is React hooks + Context only (`package.json` dependencies block: next ^15.3.3, react ^19.1.0, radix-ui set, dnd-kit, cmdk, sonner, ethers, zod v4, async-mutex).
- Styling: Tailwind + shadcn/ui primitives under `src/components/ui/` (button, card, dialog, tabs, select, popover, tooltip, command, etc. — directory listing of `components/ui/`).
- Data transport is uniformly `apiFetch` (below); there is **zero WebSocket/SSE usage anywhere in src** (grep for `EventSource|WebSocket|socket.io` across `src`: 0 matches).

### 2.2 Transport layer: `lib/api-client.ts` (66 lines)

- `apiFetch(url, init?)` injects `Authorization: Bearer ${process.env.NEXT_PUBLIC_MC_API_TOKEN}` when the env var exists (`api-client.ts:30-34`).
- Retry policy: GET/HEAD retry up to 2× on network errors and 5xx only (never 4xx); mutations default to 0 retries; exponential backoff base 500 ms doubling per attempt (`:36-39, 43-62`). Callers can override via `retries`/`retryDelay` on `ApiFetchInit` (`:14-20`).
- Exhausted retries throw the last error (`:65`) — every consuming hook wraps this in try/catch and degrades to silent failure or error state.

### 2.3 The generic CRUD factory: `hooks/use-data.ts` (262 lines)

One factory powers nine resource hooks:

| Hook | Endpoint | Poll | Cite |
|---|---|---|---|
| `useTasks` | GET `/api/tasks` | 15 s | `use-data.ts:220` |
| `useGoals` | `/api/goals` | none | `:225` |
| `useProjects` | `/api/ventures` | none | `:230` |
| `useBrainDump` | `/api/brain-dump` | none | `:235` |
| `useActivityLog` | `/api/activity-log` | 30 s | `:240` |
| `useInbox` | `/api/inbox` | 10 s | `:245` |
| `useDecisions` | `/api/decisions` | 10 s | `:250` |
| `useAgents` | `/api/agents` | none | `:255` |
| `useSkills` | `/api/skills` | none | `:260` |

Factory semantics (`use-data.ts`):
- `useDataResource<T>(endpoint, dataKey, label, pollInterval?)` — refetch does `GET /api/${endpoint}` (`:21-37`); optional interval poll gated on `document.visibilityState === "visible"` plus immediate refetch on tab re-focus via `visibilitychange` (`:40-58`).
- Create: plain POST returning the created record (`:60-79`).
- Update: **optimistic** PUT with revert-on-failure (`:81-105`).
- Remove: optimistic DELETE with a 5-second **undo toast** that restores via `PUT {..., deletedAt:null}` (`:107-148`).
- Bulk ops: atomic `/api/tasks/bulk` PUT/DELETE for tasks; parallel individual calls otherwise (`:150-214`).
- First load keeps a skeleton visible; subsequent polls don't flash loading (`initialLoadDone` pattern, same as `use-sidebar.ts:24,28`).

### 2.4 Specialized data hooks

- `useDashboardData` (`hooks/use-dashboard-data.ts`, 89 lines): single batched `GET /api/dashboard` returning `{stats, attention, eisenhowerCounts, unreadMessages, pendingDecisionsList, recentActivity, tasks, goals, projects, entries, messages, decisions}` typed at `:31-44`; polls 15 s visibility-gated (`POLL_INTERVAL = 15_000` at `:46`, effect `:70-86`). This is the Command Center's one-call data source.
- `useDashboard` (`hooks/use-dashboard.ts`, 71 lines): legacy one-shot variant of the same endpoint with **no polling** (`use-dashboard.ts:66-68`) — superseded by useDashboardData but still exported.
- `useSidebar` (`hooks/use-sidebar.ts`, 64 lines): polls `/api/sidebar` every 10 s (`POLL_INTERVAL = 10_000` at `:15`), returns `{tasks, agents, unreadInbox, pendingDecisions, pendingFieldApprovals, loading, refetch}` (`:63`); visibility-gated + refetch-on-refocus (`:45-61`); failures silently swallowed ("sidebar badges are non-critical", `:38-39`).
- `useConnection` (`hooks/use-connection.ts`, 77 lines): liveness = browser `navigator.onLine` events AND a HEAD ping to `/api/dashboard` every 30 s with 5 s AbortController timeout (`PING_INTERVAL/PING_TIMEOUT :5-6`, check logic `:21-52`, listener setup `:54-74`). A non-5xx response counts as online (`res.ok || res.status < 500`, `:44`).
- `useDaemon` (`hooks/use-daemon.ts`, 183 lines): 5-second poll of `GET /api/daemon` (`POLL_INTERVAL = 5000` at `:83`; effect `:124-128`) into rich types: `DaemonStatus {status, pid, startedAt, activeSessions[], history[], stats{tasksDispatched, tasksCompleted, tasksFailed, uptimeMinutes, totalCostUsd, total*Tokens}, lastPollAt, nextScheduledRuns}` (`:38-47`) and `DaemonConfig {polling, concurrency, schedule, execution{maxTurns, timeoutMinutes, retries, skipPermissions, allowedTools, agentTeams, claudeBinaryPath, maxTaskContinuations}, inbox}` (`:49-69`). Actions: `start(masterPassword?)` POSTs `{action:"start", masterPassword}` (`:130-149`), `stop` (`:151-166`), `updateConfig` PUT (`:168-180`), each followed by a delayed 2 s refetch (`:144,162`).

### 2.5 Run-state engine: `hooks/use-active-runs.ts` (255 lines)

The heart of run monitoring (context-provided via §1.3):

- Polls `GET /api/runs` and `GET /api/missions` in parallel every **3 s** (`POLL_INTERVAL = 3000` at `use-active-runs.ts:8`; `Promise.all` at `:26-29`; interval at `:77-81`). No visibility gating on this one — it always runs.
- **Toast diffing:** keeps `seenRunIds` ref; first fetch seeds the set silently (existing failures are historical, `:14-16, 36-38`); afterwards newly-completed runs fire `showSuccess("Task completed by ${run.agentId}")` (`:41-45`) and new failed/timeout runs fire `showError(run.error)` (`:47-54`). Set refreshed each cycle (`:55`).
- Project-run rollup: missions with status `"running"` or `"stalled"` indexed by projectId into `activeProjectRuns` (`:62-71`).
- Derived selectors: `runningTaskIds` Set of running-run taskIds (`:84-87`), `runningProjectIds` (`:89-97`), predicates `isTaskRunning` / `isProjectRunning` / `isProjectRunActive` (`:100-113`), `getProjectRun` (`:231-234`).
- Actions: `runTask(taskId)` POST `/api/tasks/{id}/run`; **if the response body carries `pendingDecision`, the hook opens the DecisionDialog instead of erroring** (`:116-144`, intercept at `:126-131`), storing the blocked taskId in `pendingTaskIdRef`; after the user answers, `handleDecisionAnswered` closes the dialog and re-invokes `runTask` on the stored id (`:147-155`). This is the human-gate → auto-resume loop.
- `runProject(projectId)` POST `/api/ventures/{id}/run` and reports "N tasks running, M queued" from `{launched, total}` (`:157-188`); `stopProject` reports `tasksStopped` count (`:190-209`); `stopTask` POST `/api/tasks/{id}/stop` (`:211-229`). Every action ends with an immediate `fetchRuns()` for instant UI feedback (`:138,182,203,223`).

### 2.6 Accelerated refresh: `hooks/use-fast-task-poll.ts` (25 lines)

- When `hasRunningTasks` is true, adds a second 5 s interval calling `refetchTasks`, gated on `document.visibilityState === "visible"` (`FAST_POLL_INTERVAL = 5_000` at `use-fast-task-poll.ts:5`; effect `:16-24`). Doc comment states intent: normal task polling is 15 s; this makes subtask progress feel live during execution (`:7-11`).
- Consumers stack it ON TOP of the base 15 s `useTasks` poll: dashboard `app/page.tsx:74`, status-board `app/status-board/page.tsx:44`, team/[role] `app/team/[role]/page.tsx:47`.

---

## 3. Agent-Run Monitoring Views

### 3.1 Command Center (`app/page.tsx`, 868 lines) — mission-control dashboard

Composition of `CommandCenterPage` (`app/page.tsx:67-74`): five concurrent data hooks — `useDashboardData`, `useDaemon`, `useActiveRunsContext`, plus the three field-ops resource hooks — and `useFastTaskPoll(runningTaskIds.size > 0, refetch)` to accelerate refresh while runs are live (`:68-74`).

Section stack, top to bottom:

1. **Autopilot banner card** (`:368-430`): Link-wrapped card to `/autopilot` showing pulsing green dot + "N crew active · M completed · Last sweep Xm ago" when daemon is running, or "Autonomous task execution is disabled" when stopped (`:384-398`). Inline Launch/Stop buttons POST via `startDaemon/stopDaemon` with `e.preventDefault()` so the Link doesn't navigate (`:402-424`).
2. **Stats bar** (4 cards; `:432-501`): tasks (total/active/done), objectives (+milestone fraction), active ventures, unprocessed brain-dump — all preferring server-computed `stats.*` over client fallbacks (`:441-443, 459-461, 477-480, 495`).
3. **Attention Required** (`:134-149, 503-526`): derived triage list combining field approvals, pending decisions, unread agent reports, unstarted DO-quadrant tasks assigned to me, and completions in the last 7 days needing review (`recentCompletions` window at `:139-142`); each row deep-links to its queue page.
4. **Field Ops summary** (`:529-567`) — cross-links to `/field-ops`; counts derived from field hooks (`:77-80`). (Details belong to round3's coverage.)
5. **FinancialOverviewCard** variant="summary" (`:570`).
6. **Comms widgets** — Inbox (top-3 unread w/ type badge + sender, `:573-615`) and Decisions (top-3 pending w/ option counts, `:617-659`).
7. **Activity feed** widget rendering `data.recentActivity` rows (`:662-693`).
8. **Crew Status** (`:99-132, 695-763`): per-agent workload computed CLIENT-SIDE over the full task list: for each non-me role it filters non-done tasks, counts blocked-by-incomplete dependencies and pending linked decisions, picks `currentTask = inProgress[0]`, and classifies a 5-state status machine `idle | overloaded(≥5 tasks) | awaiting-decision | dependencies | on-track` (`:103-132`). Rendered as colored status dots + labels + "Working on:" line (`:705-759`).
9. **Ventures grid**: active projects as `ProjectCardLarge` receiving `isRunning={isProjectRunning(id)} isProjectRunActive={isProjectRunActive(id)} onRun={runProject} onStop={stopProject}` straight from the runs context (`:766-789`).
10. Objectives grid, EisenhowerSummary, Brain Dump preview (`:791-844`), and three lazy create dialogs dynamically imported with `ssr:false` (`:19-30`).

Empty-state: if no tasks AND no projects, a welcome screen replaces everything with create-venture / add-task / deploy-agents cards plus a demo seeder that POSTs `/api/seed-demo` raw (no apiFetch) then hard-reloads after 500 ms (`:260-362`, handler `:225-240`).

### 3.2 Autopilot page (`app/autopilot/page.tsx`, ~822 lines) — daemon control panel

The deepest run-monitoring surface:

- Data: single `useDaemon()` (`app/autopilot/page.tsx:72`); polling cadence lives in the hook (5 s, §2.4). Completion rate computed client-side from stats (`:214-216`).
- Start is password-gated: "Launch Autopilot" opens a master-password dialog (`:244-249`, markup `:722-819`) whose confirmation calls `start(startPassword)`; a "Forgot your password?" link routes to `/field-ops/vault` reset (`:784`) — i.e., the daemon shares the vault master password. Stop ("Disengage") is immediate destructive (`:237`).
- Sections: status bar with Running/Stopped badge + PID (`:223-256`); five stat cards — Uptime, Tasks Completed + rate, Active Sessions vs maxParallelAgents, Failures + last-poll relative time, Total Spend with cost-per-task and token totals (`:264-343`); **Active Sessions card** listing per-session task/command, agentId, PID, pulse dot, started-at (`:345-378`); **Schedule editor** with cron presets (`FREQUENCY_PRESETS :45-58`), per-entry ON/OFF badges, add/edit/delete flow (`:146-189`, render `:381-513`); **Config editor** with inline numeric inputs (maxParallelAgents 1-10, maxTurns 1-100, timeoutMinutes 1-120, retries 0-5, polling interval 1-60) saved through `updateConfig` → `PUT /api/daemon` (`:100-133, 515-631`); read-only warnings when `skipPermissions` is enabled or `allowedTools` broadened (`:632-670`); **Recent History** = last 20 session entries with status icon, duration, cost, error snippet (`:674-720`, slice at `:683`).

### 3.3 Status Board (`app/status-board/page.tsx`, 176 lines)

- Three-column kanban from static column config (`:32-36`), grouping tasks by `task.kanban` into a Record (`:69-72`); project filter `<Select>` (`:45,64-67,110-120`).
- Run awareness per card: passes `runningTaskIds`, `onRunTask={runTask}` (from runs context, `:26,43`) and `pendingDecisionTaskIds` (decisions whose taskId links to a task, `:46-48`) into each `BoardColumn` (`:131-144`) — cards show spinners/blocked-decision markers.
- DnD via dnd-kit wrapper persists kanban moves with `updateTask(task.id, {kanban})` (optimistic PUT, §2.3) (`:74-82,129`); bulk mark-done/delete via atomic `/api/tasks/bulk` (`:149-160`); detail/create panels delegated to shared `BoardPanels` (`:162-173`).

### 3.4 Per-agent detail (`app/team/[role]/page.tsx`, 455 lines)

- Route param role resolved via `useParams().role` (`:36-37`); agent found among `useAgents()` (`:43,61`) with not-found branch (`:85-92`).
- Tasks fetched wholesale via `useTasks()` then filtered client-side to `assignedTo === agent.id || collaborators?.includes(agent.id)` (`:95`), split into inProgress/todo/completed (`:96-98`).
- Profile is editable inline: description (`:176-199`, save `:131-139`), full system-prompt textarea (`:225-267`, save `:121-129` → `PUT /api/agents`), capability chips add/remove (`:141-149, 269-302`), skill assign/remove (`:151-158`).
- Workload context: 3 stat cards (`:204-223`), last-5 inbox messages involving the agent (`:99,396-421`), last-5 activity events by that actor (`:100,423-439`), linked skills (`:101,304-342`).
- Runs wired through TaskCard props `isRunning={isTaskRunning(task.id)} onRun={runTask}` from the runs context (`:46,353,367,381`) plus fast-poll while running (`:47`).

### 3.5 Run progress components

- `ProjectRunProgress` (`components/mission-progress.tsx`, 147 lines): props `{projectRun, runs, onStop}` (`:11-27`). Progress formula **counts failures as progress**: `round((completedTasks + failedTasks)/totalTasks × 100)` (`:36`); `isActive = status ∈ {running, stalled}` (`:37`); matches currently executing agents by filtering `runs` where `r.missionId === projectRun.id && r.status === "running"` (`:31-34`) and renders one spinning badge per running agentId (`:120-132`); done/failed/blocked counters (`:96-117`); stalled state shows a warning pointing users at the Decisions page (`:135-143`); elapsed-time formatter from `startedAt` (`:17-25`).
- `ProjectCardLarge` (`components/project-card-large.tsx`, 195 lines): progress bar = round(done/total×100) over project tasks (`:33-38,131-143`); todo/active/done counts (`:146-156`); Eisenhower mini heat-grid using `getQuadrant` (`:16,41-44,158-172`); whole card is a Link to `/ventures/{id}` (`:56`) with green ring highlight while running (`:57-61`). RunButton shown only when `hasEligibleTasks` (non-done task assigned to an agent ≠ "me", `:51-53,69-78`); dropdown Edit/Archive/Delete (`:83-123`).
- `RunButton` (`components/run-button.tsx`, 91 lines): three visual states — stop mode (red Square calling `onStop`) when `(isRunning || isProjectRunActive) && onStop` (`:33-58`), running spinner (disabled green Loader2) when running without stop handler (`:68-72,83-84`), idle Rocket (`:75-81,86`). Clicks stop propagation so parent Links don't fire (`:47-51,74-77`).

### 3.6 Decision gate dialog (`components/decision-dialog.tsx`, 166 lines)

- Props `{open, onOpenChange, decision, onAnswered}` (`:28-35`); answers via direct `apiFetch("PUT /api/decisions", {id, status:"answered", answer})` — deliberately bypassing the use-data hook (`:61-69`).
- After success: toast, close, then `setTimeout(() => onAnswered(), 300)` so the write lands before the blocked task auto-relaunches (`:74-79`). UI: option buttons + custom-answer input with Enter-to-submit (`:122-137,140-161`); header instructs "Answer this question before the task can be launched." (`:94-96`). Mounted globally by ActiveRunsProvider (§1.3).

### 3.7 Supporting monitoring surfaces

- Activity feed page (`app/activity/page.tsx`, 207 lines): `useActivityLog()` 30 s poll; dual local filters for actor and event type applied/sorted client-side (`:87-97`); events bucketed into Today/Yesterday/date groups (`groupByDate :67-83`); color/icon maps include field-task event types (`:22-65`).
- Inbox (`app/inbox/page.tsx`, 646 lines): base 10 s poll (`:127`) PLUS a dedicated effect polling `GET /api/inbox/respond/status` every **3 s but only while `respondingThreads.size > 0`** (`:145-177`, interval at `:175`) — conditional high-frequency polling mirroring useFastTaskPoll's philosophy. Respond flow: `POST /api/inbox/respond {messageId}` returns `{runId}` tracked per-thread (`triggerAutoRespond :223-247`); status sync updates liveness + continuationIndex ("session N", `:149-172`); `POST /api/inbox/respond/stop {runId}` kills a composing response via a small red square button (`handleStopRespond :249-269`, UI `:442-461`). Threads built by stripping `Re:` prefixes (`normalizeSubject :65-67`, `groupIntoThreads :76-122`); composing a message to an agent auto-triggers respond after send (`:271-294`, trigger at `:289-293`).
- Decisions page (`app/decisions/page.tsx`, 209 lines): 10 s poll; answering is optimistic PUT (`:34-39`); Pending/Answered split with instant option-button answers and free-text input (`:127-160`). Note this page does NOT use DecisionDialog — the modal is reserved for the run-blocked flow.
- Crew registry (`app/crew/page.tsx` 209 lines; `app/crew/new/page.tsx` 316 lines): list+workload (`crew/page.tsx:119-131`); creation form saves `{id(slug), name, icon(one of 14 Lucide names, ICON_OPTIONS :35-50), description, instructions(system prompt w/ char counter :213-227), capabilities[], skillIds: [] always empty at creation (:113), status Switch}` via POST `/api/agents` (`crew/new/page.tsx:106-117`); auto-slug from name (`:70-78`); duplicate-id error path (`:120`); live preview card (`:288-301`).

---

## 4. Real-Time Update Architecture

### 4.1 Transport verdict

**Pure HTTP polling everywhere; zero WebSocket/SSE** — grep for `EventSource|WebSocket|socket.io` across all of `src`: 0 matches. Every "live" view is `setInterval(fetch)` + visibility gating. Full interval catalog:

| Stream | Endpoint(s) | Interval | Gating | Cite |
|---|---|---|---|---|
| Active runs + missions | `/api/runs`, `/api/missions` | **3 s**, unconditional | none | `use-active-runs.ts:8,77-81` |
| Daemon status/config | `/api/daemon` | 5 s | none | `use-daemon.ts:83,124-128` |
| Inbox respond-status | `/api/inbox/respond/status` | 3 s | only while threads responding | `app/inbox/page.tsx:145-177` |
| Fast task re-poll | (re-calls refetchTasks) | 5 s | running tasks exist + tab visible | `use-fast-task-poll.ts:5,16-24` |
| Sidebar badges | `/api/sidebar` | 10 s | visible + refocus | `use-sidebar.ts:15,45-61` |
| Tasks | `/api/tasks` | 15 s | visible + refocus | `use-data.ts:220` |
| Dashboard aggregate | `/api/dashboard` | 15 s | visible + refocus | `use-dashboard-data.ts:46,70-86` |
| Field missions | `/api/field-ops/missions` | 15 s | factory-gated | `hooks/use-field-ops.ts:330-338` |
| Field tasks | `/api/field-ops/tasks` | 10 s | factory-gated | `hooks/use-field-ops.ts:340-348` |
| Vault session | `/api/field-ops/vault/session` | 60 s | — | `hooks/use-field-ops.ts:181-200` |
| Activity log | `/api/activity-log` | 30 s | visible + refocus | `use-data.ts:240` |
| Connection ping | HEAD `/api/dashboard` | 30 s (5 s timeout) | none | `use-connection.ts:5-6,54-74` |
| Goals/Ventures/BrainDump/Agents/Skills/Services | various | never (fetch-once) | — | `use-data.ts:225-260`, `use-field-ops.ts:350-357` |

### 4.2 Freshness strategies observed

1. **Tiered intervals by criticality** — decision/run state at 3 s, money/agent sessions at 5 s, comms at 10 s, history at 30 s (table above).
2. **Conditional acceleration** — two independent mechanisms speed up only during activity: `useFastTaskPoll` (5 s task re-poll while any run is active) and inbox respond-status (3 s while AI replies are composing). Both check `document.visibilityState === "visible"`.
3. **Visibility gating + refocus refresh** — the generic factories pause polling on hidden tabs and refetch immediately on return (`use-data.ts:40-58`, `use-sidebar.ts:48-60`, `use-dashboard-data.ts:73-85`); notably `use-active-runs` and `use-daemon` do NOT gate, keeping global toasts accurate even in background tabs.
4. **Post-action immediate refetch** — every mutating action in the runs engine ends with `await fetchRuns()` (`use-active-runs.ts:138,182,203,223`) and daemon start/stop schedule a 2 s delayed refetch (`use-daemon.ts:144,162`).
5. **Optimistic writes with rollback** — updates apply locally first and revert on failure (`use-data.ts:81-105`); deletes offer a 5 s undo restoring `deletedAt:null` (`:107-148`).
6. **Diff-based notification** — completion/failure toasts are generated by comparing polled run IDs against a seen-set rather than any push channel (`use-active-runs.ts:13-55`), with a deliberate first-fetch suppression of historical failure noise (`:14-16,36-38`).
7. **Degradation UX** — offline detection swaps in a persistent banner (`layout-shell.tsx:110-115`); sidebar polls swallow errors by design (`use-sidebar.ts:38-39`).

### 4.3 Cross-cutting observations (transformation-relevant)

- **State is intentionally boring**: Context + polling hooks, no query cache library — every page refetches independently, so the same task list may be fetched simultaneously by sidebar, dashboard, status board, and team pages (each with own timers). A post-rebrand consolidation point.
- **The runs engine is the app's spine**: `use-active-runs` + ActiveRunsProvider + DecisionDialog implement human-in-the-loop gating (block → ask → answer → auto-resume) entirely client-side over three REST endpoints (`use-active-runs.ts:116-155`, `active-runs-provider.tsx:11-24`).
- **Daemon observability is complete but read-polling**: cost/tokens/session history render from a 5 s snapshot (`use-daemon.ts:26-47`); streaming session output does NOT reach the UI anywhere.
- **Client-side analytics duplication**: crew status classification (`app/page.tsx:103-132`) and ProjectRun progress math (`mission-progress.tsx:36`) recompute what `/api/dashboard` and `/api/missions` could serve precomputed.

---

## Scan Coverage Statement

**Read in full (primary evidence):** `app/layout.tsx`, `app/page.tsx`, `components/layout-shell.tsx`, `providers/active-runs-provider.tsx`, `hooks/use-active-runs.ts`, `hooks/use-fast-task-poll.ts`, `hooks/use-connection.ts`, `hooks/use-api-client (lib/api-client.ts)`, `hooks/use-sidebar.ts`, `hooks/use-daemon.ts`, `hooks/use-dashboard-data.ts`, `package.json`.

**Read in full via sub-agent scan (line citations verified against source):** `app/autopilot/page.tsx`, `app/status-board/page.tsx`, `app/activity/page.tsx`, `app/team/[role]/page.tsx`, `app/inbox/page.tsx`, `app/decisions/page.tsx`, `app/crew/page.tsx`, `app/crew/new/page.tsx`, `components/mission-progress.tsx`, `components/project-card-large.tsx`, `components/run-button.tsx`, `components/decision-dialog.tsx`, `components/keyboard-shortcuts.tsx`, `components/search-dialog.tsx`, `components/command-bar.tsx`, `components/app-sidebar.tsx`, `hooks/use-data.ts`, `hooks/use-dashboard.ts`, `hooks/use-field-ops.ts` (summary depth), `lib/types.ts` (run-type section).

**Grepped, not fully read:** WebSocket/SSE sweep across `src` (0 matches); directory listings of `app/**` (all route files enumerated in §coverage above) and `components/ui/*`.

**Skipped (out of scope / covered elsewhere):** all API route bodies under `app/api/**` (covered by R4 mc-workflow-engine / mc-service-catalog / main discovery), `app/field-ops/**` pages and components (round3 mc-frontend-buzz-clients.md §1.2–1.6 + R4 mc-fieldtask-kanban.md), vault crypto libs (round3 §1.5 + ai-vault-browser.md), test files, `globals.css`, `scripts/daemon/**` internals (R4 mc-workflow-engine.md adjacent), buzz repos.

**No files modified** — read-only scan; report written only inside `.Fabrica-atlas-board/discovery/round4/`.
