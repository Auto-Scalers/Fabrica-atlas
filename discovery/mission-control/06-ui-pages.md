# Mission Control — UI, Pages, Components, Hooks

> Source: `_sources/mission-control/mission-control/src/app/`, `src/components/`, `src/hooks/`, `src/providers/`
> Commit: `2b8c402`

## Overview

Mission Control's UI is built with Next.js 15 App Router + React 19 + Tailwind CSS + shadcn/ui. It provides:
- Command Center dashboard
- Eisenhower matrix (drag-and-drop)
- Kanban board
- Goal hierarchy view
- Brain dump + triage
- Inbox + decisions
- Agent crew management
- Field Ops (services, missions, vault, safety)
- Skills library
- Checkpoints (workspace snapshots)
- Daemon runtime dashboard
- In-app reference guide

## Pages (`src/app/`)

### Top-level Pages

| Path | File | Purpose |
|------|------|---------|
| `/` | `page.tsx` (868 lines) | **Command Center dashboard** — autopilot card, 4-card stats bar, attention required (decisions, unread reports, DO-quadrant tasks, recent completions), Field Ops summary, FinancialOverviewCard, inbox + decisions widgets, activity + agent workload crew status, ventures section, long-term objectives, Eisenhower summary + brain dump. Welcome/empty state with "Load demo data" button |
| `/autopilot` | `autopilot/page.tsx` | Daemon runtime dashboard with active sessions, cost tracking, schedule |
| `/guide` | `guide/page.tsx` | In-app reference guide |
| `/activity` | `activity/page.tsx` | Full activity log feed |
| `/brain-dump` | `brain-dump/page.tsx` | Brain dump entries + triage UI |
| `/inbox` | `inbox/page.tsx` | Full inbox with message threads |
| `/decisions` | `decisions/page.tsx` | Pending decisions queue |
| `/crew` | `crew/page.tsx` | Agent registry management UI |
| `/crew/new` | `crew/new/page.tsx` | Create custom agent |
| `/team/[role]` | `team/[role]/page.tsx` | Single-agent workspace view |
| `/projects` | `projects/page.tsx` | All projects |
| `/projects/[id]` | `projects/[id]/page.tsx` | Project detail |
| `/ventures` | `ventures/page.tsx` | Ventures (alias for projects) |
| `/ventures/[id]` | `ventures/[id]/page.tsx` | Venture detail |
| `/objectives` | `objectives/page.tsx` | Long-term goals + milestones |
| `/status-board` | `status-board/page.tsx` | Kanban board view |
| `/priority-matrix` | `priority-matrix/page.tsx` | Eisenhower matrix with drag-and-drop |
| `/skills` | `skills/page.tsx` | Skills library |
| `/skills/new` | `skills/new/page.tsx` | Create skill |
| `/skills/[id]` | `skills/[id]/page.tsx` | Skill detail |
| `/checkpoints` | `checkpoints/page.tsx` | Save/load workspace snapshots |
| `/field-ops` | `field-ops/page.tsx` | Field Ops overview |
| `/field-ops/services` | `field-ops/services/page.tsx` | Service configuration |
| `/field-ops/missions` | `field-ops/missions/page.tsx` | Mission management |
| `/field-ops/missions/[id]` | `field-ops/missions/[id]/page.tsx` | Mission detail |
| `/field-ops/vault` | `field-ops/vault/page.tsx` | Vault unlock/setup UI |
| `/field-ops/safety` | `field-ops/safety/page.tsx` | Spend limits + circuit breaker |
| `/field-ops/approvals` | `field-ops/approvals/page.tsx` | Approval queue |
| `/field-ops/activity` | `field-ops/activity/page.tsx` | Field Ops activity log |
| `not-found.tsx`, `error.tsx`, `global-error.tsx` | — | Error boundaries with retry buttons |
| `loading.tsx` | — | Loading skeletons for each page |

## Layout (`src/app/layout.tsx`)

- Inter font
- ThemeProvider (next-themes)
- LayoutShell (sidebar + main)
- Sonner Toaster (bottom-right)
- `suppressHydrationWarning`

## Components (`src/components/`)

### UI Primitives (`src/components/ui/`)

17 shadcn/ui components:
- `tooltip`, `tip` (custom tooltip wrapper)
- `textarea`, `tabs`, `switch`, `skeleton`, `separator`
- `select`, `scroll-area`, `popover`, `label`, `input`
- `dropdown-menu`, `dialog`, `command` (cmdk wrapper)
- `collapsible`, `checkbox`, `card`, `button`, `badge`

### Core Components

| Component | Purpose |
|-----------|---------|
| `layout-shell.tsx` | App sidebar + main content wrapper |
| `app-sidebar.tsx` | Navigation sidebar |
| `sidebar-nav.tsx`, `sidebar-footer.tsx` | Sidebar parts |
| `breadcrumb-nav.tsx` | Breadcrumb trail |
| `theme-provider.tsx`, `theme-toggle.tsx` | Dark/light mode |
| `command-bar.tsx` | Cmd+K global search (cmdk) |
| `search-dialog.tsx` | Search dialog |
| `keyboard-shortcuts.tsx` | Keyboard shortcuts |
| `mission-progress.tsx` | Mission progress bar |
| `task-card.tsx` | Single task card |
| `task-detail-panel.tsx` | Slide-out task detail editor |
| `task-form.tsx` | Reusable task form |
| `create-task-dialog.tsx`, `edit-project-dialog.tsx`, `edit-goal-dialog.tsx` | CRUD dialogs |
| `create-project-dialog.tsx`, `create-goal-dialog.tsx` | Creation dialogs |
| `board-view.tsx` | Kanban board |
| `project-card-large.tsx` | Project card with run/stop button |
| `goal-card.tsx` | Goal card with progress |
| `eisenhower-summary.tsx` | Eisenhower quadrant counts |
| `bulk-action-bar.tsx` | Bulk select actions |
| `run-button.tsx` | "Launch" task button (spawns Claude Code session) |
| `onboarding-dialog.tsx` | First-run onboarding |
| `confirm-dialog.tsx`, `decision-dialog.tsx` | Generic confirm + decision prompts |
| `error-state.tsx`, `empty-state.tsx`, `skeletons.tsx` | UI states |
| `vault-setup-wizard.tsx` | Vault initialization wizard |

### Field Ops Components (`src/components/field-ops/`)

17 components — see [04-field-ops.md](04-field-ops.md) for full list.

## Hooks (`src/hooks/`)

11 custom React hooks, most using `apiFetch` for SWR-style polling:

| Hook | Purpose |
|------|---------|
| `use-data.ts` | Generic data fetcher |
| `use-dashboard.ts`, `use-dashboard-data.ts` | Dashboard aggregation (15s poll, `visibilitychange` aware) |
| `use-active-runs.ts` | Live active run state (used by ActiveRunsProvider for "stop" + "decision" dialogs) |
| `use-daemon.ts` | Daemon status polling (5s interval per CLAUDE.md L438) |
| `use-field-ops.ts` | Field Ops data (missions, tasks, services, financials) |
| `use-wallet.ts` | Wallet connection state |
| `use-sidebar.ts` | Sidebar collapse state |
| `use-fast-task-poll.ts` | Fast polling when active runs exist |
| `use-processing-entries.ts` | Brain dump processing |
| `use-connection.ts` | Connection status |

## Providers (`src/providers/`)

| File | Purpose |
|------|---------|
| `active-runs-provider.tsx` (33 lines) | Wraps `useActiveRuns()` in a React Context; mounts `DecisionDialog` for inline loop-detection decisions |

## State Management Patterns

### Data Fetching
- `useDashboardData()` — 15s polling, pauses when tab hidden (visibilitychange)
- `useDaemon()` — 5s polling for daemon status
- `useActiveRuns()` — fast polling when runs exist

### Mutations
- `apiFetch()` wrapper with Bearer auth + retry (2 retries on 5xx/network, 0 on mutations)
- All mutations fire side-effects (delegation messages, activity log, notifications)

### Real-time Updates
- `ActiveRunsProvider` mounts `DecisionDialog` for inline loop-detection
- Dashboard polls every 15s for fresh data
- Daemon status polls every 5s

## Key UI Flows

### Task Launch
1. User clicks "Run" on a task
2. `run-button.tsx` calls `api/tasks/[id]/run`
3. Backend spawns Claude Code subprocess via daemon
4. Task status → `in_progress`
5. `useActiveRuns()` polls and shows live status
6. On completion → status update + activity log

### Approval Flow
1. User creates field task → status: `draft`
2. Submit for approval → status: `pending-approval`
3. `/field-ops/approvals` shows pending tasks
4. User approves → status: `approved`
5. If `fieldOps.autoExecute` enabled, daemon auto-executes
6. Otherwise, user clicks "Execute" → status: `executing` → `completed`/`failed`

### Eisenhower Drag-and-Drop
1. User drags task between quadrants on `/priority-matrix`
2. `@dnd-kit` handlers fire
3. API call to update task quadrant
4. Activity log entry created
5. Dashboard re-polls

## Scan Coverage

- `src/app/layout.tsx` read
- `src/app/page.tsx` (868 lines) read
- All 30+ page files enumerated
- All core components enumerated
- All Field Ops components enumerated
- All 11 hooks enumerated
- `src/providers/active-runs-provider.tsx` (33 lines) read
- **Not deeply read:** individual page implementations beyond the home dashboard
