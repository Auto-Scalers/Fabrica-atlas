> **PATH MIGRATION NOTICE (2026-08-21):** This project moved from the environment root into `Fabrica-atlas/`. All `_sources/...` paths in this document now resolve to `Fabrica-atlas/_sources/...`. `Fabrica-app/` remains at the environment root.
# Discovery â€” Mission Control (`_sources/mission-control/`)

> Task 1.1 â€” Group 1 (Discovery & Analysis), Roadmap 02, Round 1.
> Scan-only. No source files modified.
> Source: `_sources/mission-control/` â€” 492 files total excluding `.git`; ~180 real source files (rest is node_modules).
> Repo: github.com/MeisnerDan/mission-control Â· v0.9â€“0.10 Â· AGPL-3.0.

---

## 1. What Mission Control Is

An open-source, local-first **command center for solo entrepreneurs who delegate work to AI agents** ("Tame the swarm. Ship what matters."). It is an agent-first alternative to Linear/Asana/Notion: AI agents do the work, humans make decisions. Core loop:

```
Human captures idea â†’ tasks created & prioritized (Eisenhower) â†’ agents execute
(Claude Code sessions) â†’ reports land in inbox â†’ human answers questions/approves
actions â†’ Field Ops executes real-world actions with safety controls
```

Key positioning facts:
- Runs 100% locally. No database, no cloud. All data = plain JSON files in `mission-control/data/`.
- "JSON as IPC" â€” humans (web UI) and agents (file reads + REST API) share the same source of truth.
- BYOAI â€” any file-aware agent works (Claude Code, Cursor, Windsurf, custom scripts).
- Agents are spawned via the Claude Code CLI (`claude -p ... --output-format json`) as child processes; no Anthropic API calls, no Agent SDK.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript strict mode, no `any` |
| Styling | Tailwind CSS v3/v4, shadcn/ui + Radix UI primitives |
| Drag & drop | @dnd-kit (core/sortable/utilities) |
| Validation | Zod v4 (all API writes) |
| Search palette | cmdk |
| Concurrency | async-mutex (per-file write locks) |
| Process control | tree-kill (process-tree kill), node child_process (detached spawns) |
| Scheduling | node-cron v4 |
| Crypto | Node built-in `crypto` only (scrypt + AES-256-GCM); ethers.js v6 for Ethereum |
| Testing | Vitest (193 tests across 5 suites) |
| Storage | Local JSON files under `data/` |
| Runtime | Node 20+, pnpm 9+; PM2 optional for always-on |

package.json scripts: dev / build / start / lint / test / check (tsc+lint) / verify (check+build+test) / gen:context / seed:demo / daemon:start|stop|status.

CI (`.github/workflows/ci.yml`): on push/PR to main â€” pnpm install frozen, typecheck, lint, build (tests in verify flow).

---

## 3. Repository Structure (complete)

```
_sources/mission-control/
â”œâ”€â”€ README.md                  # Full product doc (features, API, architecture)
â”œâ”€â”€ CLAUDE.md                  # Agent operations manual (schemas, protocols, workflows)
â”œâ”€â”€ CONTRIBUTING.md            # Contribution guidelines
â”œâ”€â”€ LICENSE                    # AGPL-3.0
â”œâ”€â”€ .gitignore
â”œâ”€â”€ .claude/commands/<cmd>/user.md     # 14 auto-generated slash-command files
â”‚       (brainstorm, business-analyst, daily-plan, marketer, orchestrate,
â”‚        pick-up-work, plan-feature, report, research, researcher,
â”‚        ship-feature, standup, tester, weekly-review)
â”œâ”€â”€ .claude-plugin/plugin.json         # Cowork plugin manifest ("workspace" v0.2.0)
â”œâ”€â”€ .github/                           # PR template, issue templates, ci.yml
â”œâ”€â”€ commands/<cmd>/SKILL.md            # 10 plugin command skills (disable-model-invocation)
â”œâ”€â”€ skills/<skill>/SKILL.md            # 3 knowledge skills (agentic-company,
â”‚       eisenhower-triage, task-management)
â”œâ”€â”€ scripts/                           # Workspace-level scripts
â”‚   â”œâ”€â”€ run-team.sh                    # tmux: spawn all active agents in parallel panes
â”‚   â”œâ”€â”€ run-task-team.sh               # tmux: one pane per team member for a task
â”‚   â”œâ”€â”€ check-domains.mjs              # DNS/HTTP availability checker (~22 domains)
â”‚   â”œâ”€â”€ start-mc-test2.js              # dev-server wrapper (machine-specific)
â”‚   â””â”€â”€ sync-public.sh                 # publish privateâ†’public repo via whitelist overlay
â””â”€â”€ mission-control/                   # THE Next.js app
    â”œâ”€â”€ package.json / tsconfig.json / tailwind.config.ts / postcss.config.mjs /
    â”‚   vitest.config.ts / pnpm-workspace.yaml / next.config.ts / eslint.config.mjs /
    â”‚   next-env.d.ts / .env.example / ecosystem.config.js (PM2: next start, port 3000,
    â”‚   autorestart, max_memory_restart 512M)
    â”œâ”€â”€ start-mission-control.bat|.sh / stop-mission-control.bat|.sh
    â”œâ”€â”€ data/                          # JSON source of truth (see Â§5)
    â”œâ”€â”€ __tests__/                     # 6 files: daemon / data / security / validations /
    â”‚                                  #   helpers / integration/agent-flow (193 tests, 5 suites)
    â”œâ”€â”€ docs/                          # media only: demo.gif, rocket.svg, 6 screenshots
    â”œâ”€â”€ scripts/
    â”‚   â”œâ”€â”€ generate-context.ts        # builds data/ai-context.md (~650-token snapshot)
    â”‚   â”œâ”€â”€ seed-demo.ts + seed-brewster/dads-day-out/infant-feeding/vte-project  # demo generators
    â”‚   â”œâ”€â”€ create-launch-project.js   # launch-project scaffolder
    â”‚   â”œâ”€â”€ fix-stuck-tasks.js / find-auth-env.js / test-restricted-auth.js / verify-ifa.js
    â”‚   â””â”€â”€ daemon/                    # Autonomous agent daemon (14 files, Â§8)
    â””â”€â”€ src/
        â”œâ”€â”€ middleware.ts              # API auth + CSRF (Â§7.1)
        â”œâ”€â”€ app/                       # Pages (Â§6.1) + API routes (Â§7.2)
        â”œâ”€â”€ components/                # ~45 app components + 20 ui primitives (Â§6.2)
        â”œâ”€â”€ hooks/                     # 11 client hooks (Â§6.3)
        â”œâ”€â”€ providers/active-runs-provider.tsx
        â””â”€â”€ lib/                       # Core logic modules (Â§7.3, Â§9)
```

File counts by area: src/app pages â‰ˆ 30 route files; API routes = 59 route.ts files; components = 45 app + 20 ui; hooks = 11; lib = 18 (+8 adapters); daemon = 14 files (~4,100 lines).

---

## 4. Data Model (all state = JSON files in `data/`)

### Core workspace files
| File | Shape | Purpose |
|---|---|---|
| `tasks.json` | `{tasks: Task[]}` | Tasks: importanceÃ—urgency (Eisenhower), kanban status, projectId, milestoneId, assignedTo (lead agent), collaborators[], dailyActions[], subtasks[], blockedBy[] (dependency chain), estimatedMinutes/actualMinutes, acceptanceCriteria[], tags[], notes, comments[], dueDate, fieldTaskIds?, deletedAt (soft delete), timestamps |
| `tasks-archive.json` | `{tasks: Task[]}` | Archive of completed tasks |
| `goals.json` | `{goals: Goal[]}` | long-term/medium-term goals; milestones point at parentGoalId; linked project + task IDs |
| `projects.json` | `{projects: Project[]}` | Ventures: status lifecycle (active/paused/completed/archived), color, teamMembers[] (agent IDs), tags |
| `agents.json` | `{agents: AgentDefinition[]}` | id slug, name, lucide icon, description, instructions (= system prompt), capabilities[], skillIds[], status active/inactive |
| `skills-library.json` | `{skills: SkillDefinition[]}` | Reusable markdown knowledge injected into agent prompts; bidirectional agentâ†”skill links |
| `brain-dump.json` | `{entries: BrainDumpEntry[]}` | Raw idea capture; processed flag; convertedTo taskId |
| `inbox.json` | `{messages: InboxMessage[]}` | from/to/type(delegation|report|question|update|approval)/taskId/subject/body/status(unread|read|archived) |
| `decisions.json` | `{decisions: DecisionItem[]}` | requestedBy/question/options[]/context/status(pending|answered)/answer |
| `activity-log.json` | `{events: ActivityEvent[]}` | 15 event types (task_createdâ€¦agent_checkin + field_task_* bridges) |
| `ai-context.md` | generated | ~650-token workspace snapshot for agent situational awareness (`pnpm gen:context`) |

### Runtime/orchestration files
| File | Purpose |
|---|---|
| `active-runs.json` | Live task executions: id, taskId, agentId, projectId/missionId, pid, status(running/completed/failed/timeout/stopped), costUsd, numTurns, continuationIndex |
| `missions.json` | Continuous project runs: counters, per-task history w/ attempts, LoopDetectionState {taskAttempts, taskErrors}, status running/completed/stopped/stalled |
| `respond-runs.json` | Inbox auto-respond chains: messageId, threadSubject, pid, continuationIndex, stopped flag, cost/tokens totals |
| `daemon-config.json` | polling{enabled,intervalMinutes}, concurrency{maxParallelAgents}, schedule{nameâ†’{enabled,cron,command}}, execution{maxTurns,timeoutMinutes,retries,retryDelayMinutes,skipPermissions,allowedTools[],agentTeams,claudeBinaryPath,maxTaskContinuations}, inbox{maxContinuations,maxTurnsPerSession,timeoutPerSessionMinutes}, fieldOps{autoExecute,pollIntervalMinutes,maxConcurrentExecutions,requireVaultSession} |
| `daemon-status.json` | Uptime, activeSessions[], history[] (cap 50), stats (dispatched/completed/failed, totalCostUsd, 4 token counters), lastPollAt, nextScheduledRuns |
| `daemon-retry-queue.json` | Persistent retry entries {taskId, agentId, retryAt, attempt, failedAt, error} |
| `data/checkpoints/*.json` | Full workspace snapshots (8 core collections) with metadata + stats |

### Field Ops files (`data/field-ops/`)
| File | Purpose |
|---|---|
| `tasks.json` | FieldTask: type(social-post/email-campaign/ad-campaign/payment/publish/design/crypto-transfer/custom), serviceId, assignedTo, status state machine (draftâ†’pending-approvalâ†’approvedâ†’executingâ†’awaiting-signatureâ†’completed/failed/rejected), payload (â‰¤10KB), result, attachments, linkedTaskId, blockedBy, approvalRequired, approvedBy/rejectedBy/rejectionFeedback, scheduledFor |
| `missions.json` | FieldMission: autonomyLevel(approve-all/approve-high-risk/full-autonomy), linkedProjectId, task IDs |
| `services.json` | Connected services: mcpPackage, status(saved/connected/disconnected/error), authType(oauth2/api-key/none), credentialIdâ†’vault, riskLevel(high/medium/low), capabilities, allowedAgents, config, catalogId, lastUsed |
| `service-catalog.json` | 64 pre-configured services across 16 categories with setup guides + configFields (type=password marks secrets) |
| `.credentials.json` | Vault: masterKeyHash ("scrypt:<salt>:<hash>" or legacy SHA-256), masterKeySalt, credentials[{encryptedData hex, iv, authTag, expiresAt}] |
| `safety-limits.json` | Global budget (daily $100/weekly $500/monthly $2000 defaults, pauseOnBreach), per-service limits (maxPerTxUsd, dailyLimitUsd, approvedRecipients), spendLog (pruned >31 days) |
| `approval-config.json` | Global autonomy mode + per-mission overrides |
| `templates.json` | Reusable field-task templates with {{variable}} payload slots, usageCount |
| `activity-log.json` | 22 typed field events; rotation cap 500 events w/ date-stamped archive files |

ID conventions: `task_`, `goal_`, `mile_`, `proj_`, `bd_`, `msg_`, `dec_`, `evt_`, `snap_`, `ftask_`, `fmission_`, `fevt_`, `ftpl_`, `rr_`, `session_`, `run_` + `run_<ts>_c<N>` continuations â€” all timestamp-based.

---

## 5. Architectural Patterns (cross-cutting)

1. **Local-first JSON storage** â€” no DB; every collection is a JSON file; reads lock-free, writes mutexed.
2. **Per-file async-mutex write locking** â€” `mutate<X>()` helpers implement lockâ†’readâ†’callbackâ†’auto-writeâ†’unlock with implicit rollback on throw. Legacy `with<X>()` read-inside-lock helpers documented as deadlock-prone if written inside (non-reentrant mutex).
3. **JSON-as-IPC** â€” agents and UI share files; API adds validation + side effects; direct file reads encouraged for speed, writes should use API.
4. **Token-optimized API** â€” filters (assignedTo, kanban, quadrant, projectId), sparse field selection (`fields=`), pagination (`limit/offset` + meta), batched endpoints (/api/dashboard, /api/sidebar). Claimed ~92% context compression.
5. **Detached-process execution model** â€” API routes spawn detached `node --import tsx scripts/daemon/run-task.ts <id>` children (stdio ignored, unref'd) so HTTP requests return instantly; state lands in active-runs.json/missions.json; PID liveness checks (`process.kill(pid,0)`) reconcile dead processes everywhere.
6. **Self-continuation chains** â€” run-task.ts and run-inbox-respond.ts re-spawn themselves detached on timeout/max-turns, passing `--continuation N --run-id <id>`; progress persisted into task notes / inbox messages between sessions; bounded by maxTaskContinuations/maxContinuations.
7. **Defense in depth security** (Field Ops): encrypted vault (AES-256-GCM + scrypt N=16384/r=8/p=1), owner-guard (actorâ‰ "me" rejected; vault session or masterPassword required), approval state machine with bypass detection, circuit breaker (3 consecutive failures â†’ pause mission), rate limiters (vault brute-force: soft 3/hard 10 per 5 min w/ 15-min lockout; execution: 10/service/5 min), spend limits (per-tx/daily/weekly/monthly, global kill switch), secret detection in plaintext configs, emergency stop kill switch.
8. **Daemon hardening**: credential scrubbing (~14 regex patterns incl. AWS/GitHub/Slack/Stripe/Anthropic tokens, PEM keys, connection strings), prompt fencing (`<task-context>` delimiters w/ escape), prompt cap 100KB, binary whitelist (only claude/claude.cmd/claude.exe), safe env (PATH/HOME/TEMP only + SystemRoot on Windows + CLAUDE_CODE_OAUTH_TOKEN passthrough), args-array spawning (no shell injection), log rotation (1MB Ã— 3).
9. **Dual activity logging + notification bridge** â€” field events logged to field-ops/activity-log AND mirrored into regular inbox/activity-log so agents see outcomes.
10. **Auto-generated agent integration files** â€” saving an agent/skill via API regenerates `.claude/commands/<id>/user.md` and `skills/<id>/SKILL.md` (sync-commands.ts), keeping Claude Code slash commands in sync with the registry.
11. **Optimistic UI** â€” hooks apply optimistic updates with revert-on-failure + undo toast (5s window restoring soft-deleted items).
12. **Visibility-gated polling** â€” all pollers pause when tab hidden; fast-poll accelerators while tasks run (3â€“5s vs 10â€“30s idle).

---

## 6. Frontend (src/app, src/components, src/hooks)

### 6.1 Pages (App Router)
| Route | Purpose / key features |
|---|---|
| `/` (layout.tsx) | ThemeProvider (dark default), LayoutShell (sidebar + command bar + ActiveRunsProvider), Sonner toaster |
| `/` dashboard | Onboarding when empty; Autopilot status card (Launch/Stop daemon); 4 stat cards; "Attention Required" panel (pending approvals, decisions, unread reports, DO-quadrant, completions); Field Ops summary; FinancialOverviewCard; Inbox/Decisions widgets; Recent Activity; Crew Status workload list w/ per-agent pills (idle/on-track/dependencies/awaiting-decision/overloaded); venture grid; objectives grid; EisenhowerSummary; brain-dump preview; create dialogs. Data: batched /api/dashboard (15s) |
| `/activity` | Activity timeline; event-type filter; grouped by date; 30s poll |
| `/autopilot` | Daemon control panel: Running/Stopped badge + PID; master-password-gated launch; 5 stat cards (uptime, completed/dispatched + success rate, active vs max parallel, failures + last poll, spend $ + tokens); active sessions; editable cron schedule table (add/edit/remove, ON/OFF, presets, next-run); editable config (parallelism, turns, timeout, retries, interval) + read-only warnings (skipPermissions, allowedTools); recent history (last 20 w/ cost). 5s poll |
| `/brain-dump` | Capture textarea (Enter saves); Auto-Process All + per-entry Zap â†’ /api/brain-dump/automate; convert-to-task dialog (prefilled CreateTaskDialog); archive/delete; processing pulse highlight; 5s refetch while processing |
| `/checkpoints` | Save/load/delete/export/import workspace snapshots; per-checkpoint stats |
| `/crew` | Agent registry cards; filter tabs; capability badges; active-task + skill counts |
| `/crew/new` | Custom agent creator: nameâ†’auto slug, icon picker (14 Lucide), instructions textarea (system prompt), capabilities tag input, active switch, live preview |
| `/decisions` | Pending queue (option buttons + custom answer) + answered history; 10s poll |
| `/field-ops` | Hub: autonomy selector (master-password gated; red warning for full autonomy); getting-started; stats row; FinancialOverviewCard(detailed); active missions w/ progress; recent field activity feed |
| `/field-ops/activity` | Audit log: category filters, expandable rows w/ metadata grid, pagination (20/page) |
| `/field-ops/approvals` | Approval queue: risk classification (high=payment/crypto/ad-campaign; medium=email/social/publish; else low), risk tabs, multi-select batch approve/reject (â‰¤50), reject requires â‰¥10-char feedback |
| `/field-ops/missions` | Mission list: status tabs w/ counts, progress bars, pending-approval badges; create dialog; 15s poll |
| `/field-ops/missions/[id]` | Mission detail: badges + dropdown (edit/pause-resume/complete/delete); security summary bar; progress w/ per-status counts; circuit-breaker warning card; pending approvals; task list (approve/reject/execute/dry-run/resubmit); collapsible mission activity; vault-unlock-gated actions w/ auto-retry after unlock; failed tasks auto-reset to approved |
| `/field-ops/safety` | Global budgets form; per-service limits (per-tx, daily, approved recipients); spend bars colored by % of limit; spend log table |
| `/field-ops/services` | Two tabs: My Services (status/risk badges, add/edit custom service, test connection w/ latency, activate/update credentials, disconnect/delete) + Library (search, 16-category chips, catalog cards, save-from-catalog, setup guide dialog) |
| `/field-ops/vault` | Health badge (Empty/Healthy/Migration Needed); security banner; session card w/ 30-min countdown; add-credential form; credential table (revoke); setup wizard; reset requiring typing "RESET" |
| `/guide` | Static docs page: architecture, task management, projects/goals, brain dump, agents, field ops, vault security (scrypt params, rate limits), data management, keyboard shortcuts |
| `/inbox` | Thread grouping by normalized subject (strips "Re:"); unread counts; reply; archive/archive-all; "Ask to respond" (server-side agent auto-reply, 3s status poll w/ stop button); compose dialog; filters; 10s poll |
| `/objectives` | Goal hierarchy: objective cards w/ computed progress from linked tasks; nested milestone cards w/ checkable task lists; create/edit/delete |
| `/priority-matrix` | Eisenhower board: dnd between DO/SCHEDULE/DELEGATE/ELIMINATE updates importance/urgency; project+assignee filters; bulk action bar; fast poll while running |
| `/projects` + `/ventures` | Identical pages: venture card grid (progress, quadrant mini-counts, Run/Stop buttons), archived toggle, CRUD dialogs |
| `/projects/[id]` + `/ventures/[id]` | Identical detail pages: header w/ RunButton (run whole project / stop), live ProjectRunProgress panel, team management inline, tabs: Priority Matrix / Status Board (Kanban) / Milestones; custom dnd-kit context w/ 8px drag activation constraint |
| `/skills` | Skills library cards + "AI Commands" reference table w/ copy buttons |
| `/skills/new`, `/skills/[id]` | Skill editor: name/description/markdown content, tags, agent assignment toggles, dirty-state warning |
| `/status-board` | Kanban (Not Started/In Progress/Done): dnd updates kanban; project filter; bulk bar |
| `/team/[role]` | Agent profile: inline-editable description + instructions; capabilities & skills editors; task sections (in-progress/todo/completed) w/ run buttons; recent messages/activity |
| error boundaries | error.tsx, global-error.tsx, not-found.tsx, loading.tsx skeletons throughout |

### 6.2 Components (app-level, 45)
- Navigation/shell: app-sidebar (route + dynamic agent links, badge counters for inbox/decisions/field approvals, theme toggle, collapsible tooltips), sidebar-nav (legacy simpler nav), sidebar-footer (server status via /api/server-status: pm2 vs terminal, uptime, PID; emergency-stop kill dialog; theme toggle), layout-shell, breadcrumb-nav, command-bar (slash-command autocomplete via `/`, task search, quick brain-dump capture), search-dialog (Cmd+K palette over tasks/goals/projects/brain-dump), keyboard-shortcuts (`?` help, `N` new task, `G`+letter navigation chords), onboarding-dialog (multi-step wizard incl. vault setup step; localStorage `mc-onboarded`).
- Board infra: board-view.tsx exports ColumnConfig, DraggableTaskCard, BoardColumn, BoardDndWrapper, BoardPanels, useTaskHandlers, useSelection (shared by Kanban + Eisenhower pages).
- Task UI: task-card (kanban dot, assignee + collaborator avatars max 3 + overflow, dependency/subtask/due/estimate indicators, pending-decision warning, RunButton), task-detail-panel (slide-in editor: form + comments/messages + activity + delegation send + related field tasks), task-form (canonical form enforcing LIMITS), bulk-action-bar (mark done/delete/clear), run-button (rocket â†” red stop morph).
- CRUD dialogs: create/edit task/project/goal, decision-dialog (also used globally by ActiveRunsProvider to unblock runs), confirm-dialog.
- Dashboard widgets: eisenhower-summary, goal-card, project-card-large, mission-progress (ProjectRunProgress live panel), skeletons (11 shimmer variants), empty-state, error-state.
- System: theme-provider/theme-toggle, vault-setup-wizard (password strength meter + crypto explainer).

Field-ops components (14): activate-service-dialog (updateMode for credential rotation), catalog-service-card, execution-result-panel (renders tweetId/txHash/url/latency w/ copy buttons), field-task-card (computed risk badge, dropdown actions, wallet indicator), field-task-form-dialog (per-type payload fields, approval warning), financial-overview-card (summary/detailed variants, vaultLocked handling), getting-started-card (dismissible, localStorage), mission-form-dialog, reject-task-dialog (â‰¥10 chars), setup-guide-dialog, sign-transaction-button (MetaMask connect â†’ prepare â†’ eth_sendTransaction â†’ submit-signature), vault-unlock-dialog (context-aware, returns password to caller), wallet-balance-card, wallet-connect-button (EIP-1193, chain names, truncated address).

UI primitives (20 shadcn-style): badge, button, card, checkbox, collapsible, command, dialog, dropdown-menu, input, label, popover, scroll-area, select, separator, skeleton, switch, tabs, textarea, tip, tooltip.

### 6.3 Hooks (11) & Provider
| Hook | Purpose | Polling |
|---|---|---|
| use-data.ts (factory `useDataResource` + 9 hooks) | Generic CRUD against /api/*: optimistic update/delete w/ revert + undo toast; bulk ops via /api/tasks/bulk; useProjects maps to ventures endpoint | tasks 15s, activity 30s, inbox 10s, decisions 10s; refetch on tab visible |
| use-active-runs.ts | Run tracking + runTask/runProject/stop*; toasts on completion/failure; intercepts pendingDecision â†’ opens DecisionDialog â†’ auto-relaunches task after answer | 3s |
| use-dashboard-data.ts | Single batched /api/dashboard fetch | 15s + visibility |
| use-dashboard.ts | Older non-polling variant | none |
| use-daemon.ts | Status/config; start(masterPassword?)/stop/updateConfig | 5s |
| use-fast-task-poll.ts | Accelerates refresh during executions | 5s while running |
| use-field-ops.ts | Factory CRUD (missions/tasks/services) + useVaultSession (unlock/lock, caches password in-memory 30 min, 60s session check) + useExecuteTask (dry-run support) + module-level getCachedVaultPassword | missions 15s, field tasks 10s |
| use-processing-entries.ts | Tracks brain-dump auto-processing transitions; 10-min stuck timeout | drives 5s refetch |
| use-sidebar.ts | Badge counts from batched /api/sidebar | 10s |
| use-connection.ts | navigator.onLine + HEAD health ping | 30s |
| use-wallet.ts | MetaMask EIP-1193: connect/disconnect, account/chain change listeners, switchChain, sendTransaction | event-driven |
| providers/active-runs-provider.tsx | Context wrapper around useActiveRuns + global DecisionDialog for decision-interrupted launches | â€” |

---

## 7. Backend

### 7.1 Middleware (`src/middleware.ts`)
- CSRF: POST/PUT/DELETE/PATCH require Origin host == Host header (no-origin allowed for CLI/server-to-server).
- Auth: if `MC_API_TOKEN` env set â†’ all /api/* require `Authorization: Bearer <token>` compared with constant-time XOR comparison; unset = open local access. Client counterpart `NEXT_PUBLIC_MC_API_TOKEN` (both from .env.example; future placeholders GITHUB_TOKEN/DATABASE_URL).

### 7.2 API Routes (59 route.ts files, grouped)

**Core workspace CRUD**
- `/api/tasks`: GET (filters id/assignedTo/kanban/projectId/quadrant/includeDeleted/include=archived, sparse `fields=`, pagination+meta); POST (create + auto-delegation inbox messages to assignee AND collaborators + task_delegated event); PUT (update; re-delegation on assignee change; collaborator notifications; completion â†’ report message to "me" + handleUnblocking notifies agents whose blockedBy deps are now done); DELETE (soft delete via deletedAt, or ?hard=true removes + cleans blockedBy refs and goal task refs).
- `/api/tasks/bulk`: PUT atomic multi-update in one mutex transaction; DELETE bulk soft-delete.
- `/api/tasks/archive`: GET archived; POST moves ALL completed tasks to archive atomically.
- `/api/tasks/[id]/run`: POST validations (exists, AI-assigned â‰  me, not done, not already running, deps unblocked, no pending decision â€” returns the decision object); spawns detached run-task.ts (--source manual, optional --agent-teams).
- `/api/tasks/[id]/stop`: kills PID (tree-kill â†’ fallback process.kill), marks run stopped, resets task to not-started.
- `/api/goals`, `/api/projects`, `/api/ventures` (duplicate of projects): standard CRUD + soft delete; hard delete cleans references.
- `/api/projects/[id]/run` + `/api/ventures/[id]/run`: continuous mission launcher â€” 409 if already running; eligible = project tasks not-done + AI-assigned; pre-validates dispatchable (deps, decisions); skips live-running (PID checks); concurrency slots (overflow â†’ queued); creates missions.json entry w/ loopDetection state; spawns run-task.ts children (--source project-run --mission <id>). Returns {missionId, launched, skipped, queued, total, dispatchable}.
- `/api/projects/[id]/stop` + ventures twin: kills all PIDs, stops mission, reverts in-progress tasks to not-started.
- `/api/missions`: GET w/ reconciliation on every poll â€” detects running missions with no live processes past a 30s grace period; completes them (posts report), re-dispatches eligible tasks (blockers, decisions, â‰¤3 attempts, concurrency), waits if dependencies could resolve internally, else marks stalled + posts stalled report.
- `/api/runs`: GET active-runs w/ PID liveness; dead "running" marked failed.
- `/api/goals|projects|brain-dump|inbox|decisions|activity-log|agents|skills`: full CRUD w/ Zod schemas, filters, pagination.
- `/api/agents`: owner-guarded mutations; duplicate-ID 409; regenerates .claude/commands/<id>/user.md on save; built-in roles always soft-delete; hard-delete cleans assignedTo/collaborators/skill.agentIds refs.
- `/api/skills`: writes skills/<id>/SKILL.md + resyncs linked agents' command files on every mutation.
- `/api/dashboard`: parallel read of 7 files; computes stats, attention items, eisenhowerCounts, curated lists.
- `/api/sidebar`: batched badge counts (incl. pendingFieldApprovals).
- `/api/server-status`: PM2 detection via process.env.pm_id; {mode, uptimeSeconds, pid}.
- `/api/sync`: regenerate all agent command + skill files.
- `/api/seed-demo`: overwrite core data with demo content (3 projects, 4 goals, 7 tasks, 4 entries, 4 messages, 7 events, 1 decision, 3 disconnected services, 1 demo field mission w/ 6 social-post tasks).
- `/api/checkpoints` (+export/import/load/new): snapshot save/list/delete (ID regex `/^snap_(\d+|demo)$/` path-traversal guard), download attachment, import validation (8 required data keys), load replaces all core data + background gen:context, new wipes workspace but restores 5 built-in agents.
- `/api/brain-dump/automate`: spawns run-brain-dump-triage.ts for selected/all unprocessed entries.
- `/api/inbox/respond`: validates recipient is an existing AI agent; spawns run-inbox-respond.ts detached; `/status` returns running respond-runs (client polls 3s); `/stop` sets cooperative stopped flag + kills current PID.
- `/api/daemon`: GET status w/ PID-liveness self-correction; POST start (409 if running; detached spawn w/ Windows .cmd workaround) / stop (SIGTERM via PID file); PUT config update (owner-guarded; enabling skipPermissions via API rejected 403 â€” manual edit only).
- `/api/emergency-stop`: 4 tolerant steps â€” stop daemon, pause all active field missions, clear vault session, log both activity logs.

**Field Ops**
- `/api/field-ops/tasks`: server-side approval enforcement â€” computes approvalRequired via requiresApproval(type, serviceRisk, mode), never trusts client; state machine enforced (invalid transitions logged as security events); approval-bypass detection (draftâ†’approved) 403; circuit-breaker pre-execution check (3+ consecutive failures â†’ pause mission, 409); typed transition events w/ duration; cross-links into linked regular task's fieldTaskIds.
- `/api/field-ops/batch`: bulk submit/approve/reject â‰¤50, owner-guarded, single atomic mutate pass, notifications per task.
- `/api/field-ops/missions`: owner-guard on activate/autonomy changes; cascade orphaning of member tasks on delete.
- `/api/field-ops/services`: install (secret-detection scan of plaintext config w/ warnings), update (owner-guard on riskLevel/allowedAgents changes), delete; `/save-from-catalog` creates saved-but-disconnected service; `/activate` splits config fields safe-vs-sensitive using catalog configFields, requires master password for sensitive fields, initializes/verifies vault, AES-encrypts and stores credential, strips sensitive keys from plaintext config; `/test` resolves adapter, decrypts credential (session password or body), runs healthCheck, logs pass/fail.
- `/api/field-ops/execute` (core engine, 641 lines): full lifecycle â€” task must be exactly `approved`; service connected; per-service rate limit (10/5min â†’ 429 + Retry-After); spend-limit enforcement w/ USD estimation heuristics (ETHÃ—$2000, USDC 1:1, face value payments; breach â†’ 403 + optional pauseOnBreach pauses all missions); adapter resolution (fallback = "manual execution" mode); wallet-signing redirect to /prepare; payload validation; dry-run exits before side effects; staleness re-validation if service unused â‰¥3 days; credential decryption (always verifies password even with active session); transition to executing; adapter.execute; result recording; spendLog entry; sanitized result logging (recursive sensitive-key redaction); circuit breaker; notification bridge to inbox/activity; dependency unblocking (field tasks AND regular tasks, notifying assigned agents).
- `/api/field-ops/execute/prepare` + `/submit-signature`: two-step MetaMask wallet-signing flow â€” prepareTransaction builds unsigned tx params (task â†’ awaiting-signature); submit-signature validates txHash regex `^0x[0-9a-fA-F]{64}$`, records result w/ signingMode:"wallet", logs estimated spend.
- `/api/field-ops/financials`: aggregates getFinancials() across configured financial adapters (parallel, Promise.allSettled); lists available-but-unconfigured integrations; vaultLocked â†’ placeholder snapshots.
- `/api/field-ops/wallet`: ETH/USDC balances per ethereum-wallet service (vault-locked aware).
- `/api/field-ops/safety-limits`: GET w/ computed spend summary; PUT owner-guarded, prunes spend log >31 days.
- `/api/field-ops/vault`: GET metadata only (never secrets) + health mode (legacy/encrypted counts, masterKeyFormat); POST store w/ automatic legacy migration (SHA-256 hash â†’ scrypt; base64 credentials â†’ AES-256-GCM, logged vault_migrated); DELETE revoke.
- `/api/field-ops/vault/setup|session|reset|decrypt`: init (min 8 chars, confirm match, starts session); unlock (rate-limited brute-force protection) / lock / status ({active, remainingMs, ttlMs}); reset requires literal `{confirm:"RESET_VAULT"}`; decrypt (rate-limited, expiration check 410, legacy opportunistic migration, auth-tag failure â†’ 403 tampering, access logged).

### 7.3 Lib Modules (src/lib)
| Module | Contents |
|---|---|
| types.ts (~675 lines) | All domain types/enums (Importance, Urgency, KanbanStatus, AgentRole, EventType(15), MessageType, RunStatus, ProjectRunStatus(+stalled), AutonomyLevel, FieldTaskStatus(8), FieldTaskType(8), ServiceRiskLevel, FieldOpsEventType(22)); AGENT_ROLES legacy array; SKILLS (10 slash-command descriptors); full entity interfaces; Eisenhower helpers getQuadrant/quadrantFromValues/valuesFromQuadrant; field-ops types incl. SafetyLimits, CatalogService, ServiceCategory(16) |
| validations.ts (~571 lines) | ~35 Zod schemas (create/update pairs for every entity + daemonConfigUpdateSchema strict w/ range clamps + execute/vault/batch/template schemas); LIMITS constants (TITLE 200, DESCRIPTION 5000, SUBJECT 500, TAG 100, MAX_SUBTASKS 100, MAX_BLOCKED_BY 50, MAX_OPTIONS 20â€¦); validateBody helper returning field-level errors |
| data.ts (857 lines) | The entire persistence layer â€” see Â§5 pattern 2; 20 per-file mutexes; checkpoint CRUD; field-ops readers/mutators; field activity log rotation (cap 500 â†’ date-stamped archives); DEFAULT_SAFETY_LIMITS ($100/$500/$2000) |
| api-client.ts | apiFetch wrapper: injects Bearer token from NEXT_PUBLIC_MC_API_TOKEN; retries GET/HEAD Ã—2 (mutations opt-in) on network errors/5xx only, exponential backoff 500ms |
| middleware.ts | (see Â§7.1) |
| field-ops-security.ts (~323 lines) | TASK_TYPE_RISK map; computeTaskRisk (service can elevate, never lower); requiresApproval (HIGH always needs approval â€” "iron claw"; custom always; then autonomy decides); VALID_TRANSITIONS state machine + isValidTransition/getTransitionError; isApprovalBypassAttempt; shouldTripCircuitBreaker (3 consecutive backward scan, success resets); VaultRateLimiter (soft 3 / hard 10 per 5 min â†’ 15-min lockout); ExecutionRateLimiter (10/service/5 min); PAYLOAD_MAX_SIZE 10240; SECRET_PATTERNS + detectSecretsInConfig. Based on OWASP Top 10 for Agentic Applications 2026 |
| spend-tracker.ts (~176 lines) | Time boundary helpers (day/week-Monday/month); getServiceSpend/getGlobalSpend; checkSpendLimits ordered checks (global kill switch â†’ service enabled â†’ per-tx â†’ service daily â†’ global daily/weekly/monthly); pruneSpendLog (>31 days); getSpendSummary |
| vault-session.ts (~99 lines) | Server-only in-memory master-password cache; 30-min TTL singleton w/ setTimeout expiry; getPassword/setPassword/clear/isActive/getRemainingMs/getSessionInfo (never exposes password) |
| vault-crypto.ts (211 lines) | Server-only crypto: deriveKey (scrypt N=16384 r=8 p=1, 32-byte key); hashMasterPassword ("scrypt:<salt>:<hash>"); verifyMasterPassword (timing-safe, supports legacy SHA-256 migration); encryptCredential/decryptCredential (AES-256-GCM, hex-encoded data/iv/authTag, throws on tag failure); generateEncryptionSalt; migrateLegacyCredential (base64 â†’ AES-GCM) |
| owner-guard.ts (~64 lines) | requireOwner(body): actorâ‰ "me" â†’ 403; active vault session â†’ authorized; else masterPassword required â†’ verified against scrypt hash |
| field-ops-notify.ts (~174 lines) | Notification bridge: notifyFieldTaskCompleted/Failed (report messages), Approved/Rejected (update messages) to task.assignee || "me"; logFieldOpsActivity mirrors field events into unified activity log |
| field-ops-activity.ts (~39 lines) | addFieldActivityEvent â€” fevt_* ids via mutex |
| sync-commands.ts (~143 lines) | Regenerates .claude/commands/<agent>/user.md (persona + instructions + capabilities + injected skills + SOP) and skills/<id>/SKILL.md (YAML frontmatter + content); bidirectional skill resolution (agent.skillIds âˆª skill.agentIds), deduped |
| password-strength.ts (~121 lines) | Client-safe evaluator: top-50 common-password blocklist; length/class scoring; repetition & sequence penalties; score 0â€“4 + labels + colors + up to 3 suggestions |
| service-categories.ts (~50 lines) | 16 categories w/ label/icon/color (social-media â€¦ ai-automation) |
| agent-icons.ts, toast.ts, utils.ts | Icon mapping, sonner wrapper, cn() helper |

---

## 8. Autonomous Daemon (`scripts/daemon/`, 14 files ~4,100 lines)

Background Node.js process (tsx). Lifecycle: `index.ts start` â†’ config load â†’ HealthMonitor + AgentRunner + Dispatcher + Scheduler wired â†’ PID file â†’ cron jobs â†’ immediate poll â†’ [every N min: retries â†’ dispatch â†’ project-run safety net â†’ field-ops poll] + [every 60s: stale-session sweep, uptime, flush] â†’ SIGTERM drains (stop scheduler â†’ kill all sessions â†’ writeStoppedStatus â†’ remove PID).

| File | Role |
|---|---|
| index.ts (228) | CLI start/stop/status; single-instance via PID file + signal-0 probe; graceful shutdown; stale PID cleanup |
| config.ts (172) | load/save/validate daemon-config.json; deep-merge over defaults w/ strict clamping (interval 1â€“60, parallel 1â€“10, turns 1â€“100, timeout 1â€“120, retries 0â€“5, continuations 0â€“5, inbox turn/timeout bounds); SECURITY warning on skipPermissions; never throws (falls back to defaults). Defaults: poll 5 min, 3 parallel, daily-plan 07:00, standup 09:00 Monâ€“Fri, weekly-review Fri 17:00, maxTurns 25, timeout 30 min, retries 1, allowedTools [Edit, Write], maxTaskContinuations 2 |
| types.ts (210) | DaemonConfig, AgentSession, SessionHistoryEntry, DaemonStats (4 token counters), SpawnOptions/Result, ProjectRun + LoopDetectionState, ClaudeUsage/ClaudeOutputMeta (total_cost_usd, num_turns, subtype success/error_max_turns/error_timeout, sessionId, usage), RespondRunEntry, LogLevel |
| security.ts (159) | scrubCredentials (~14 regexes: sk-/Bearer/base64â‰¥40/AKIA/password=/email:pass/ghp_/npm/xox[bpas]/sk_live/sk-ant/PEM/DB conn strings/token=); validatePathWithinWorkspace (traversal guard); fenceTaskData (<task-context> w/ escape); enforcePromptLimit (100KB); validateBinary (claude|claude.cmd|claude.exe only); buildSafeEnv (PATH/HOME/TEMP + Windows SystemRoot/COMSPEC/PATHEXT + CLAUDE_CODE_OAUTH_TOKEN passthrough + CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS) |
| logger.ts (104) | Singleton leveled logger (DEBUG/INFO/WARN/ERROR/SECURITY); every line scrubbed; console ANSI + daemon.log plain; 1MB rotation Ã—3 |
| health.ts (287) | HealthMonitor class: startSession/endSession (duration, status derivation, cost/token accumulation, history cap 50, atomic tmp+rename flush); isTaskRunning/isCommandRunning dedup guards; getRetryCount from history; cleanStaleSessions (signal-0 sweep every minute); persists across restarts via daemon-status.json |
| runner.ts (373) | AgentRunner.spawnAgent: binary resolution (config override â†’ platform paths â†’ .cmd shim parsing â†’ rewrite to `node cli.js` â†’ where/which â†’ bare fallback); args-array spawn (no shell); --dangerously-skip-permissions xor --allowedTools; onSpawned(pid) callback; 10MB stdout/stderr caps; timeout â†’ treeKill SIGTERM â†’ SIGKILL fallback; parseClaudeOutput extracts cost/turns/subtype/sessionId/usage (never throws); killSession |
| run-task.ts (~1090) | Single-task execution engine (CLI, also its own continuation mechanism). Validates eligibility; creates active-runs entry; marks task in-progress; builds prompt; spawns; parses cost; continuation decision (error_max_turns/timeout && index < max â†’ append progress notes to task.notes, spawn self detached `<runId>_c<N>`, exit); exit 0 â†’ handleTaskCompletion (mark done + inbox report + activity event + regen ai-context, each step independently try/caught); failure â†’ handleTaskFailure (task_failed event + Failed: report w/ session count); mission chain: handleProjectRunContinuation â€” updates mission counters/history, loop detection (â‰¥3 attempts â†’ deduplicated decision w/ options Retry differently/Skip/Stop mission), computes remaining, filters dispatchable (not running/deps done/no decision/attempts<3), slots = maxParallel âˆ’ running, saves missions BEFORE spawning, stall detection (nothing runnable & nothing running â†’ stalled + skippedTasks + report); postProjectRunReport extracts file paths from summaries via regex |
| dispatcher.ts (~621) | Dispatcher class â€” polling brain: persistent retry queue (daemon-retry-queue.json, exponential backoff retryDelayÃ—2^(attemptâˆ’1) capped 60 min, survives restarts); pollAndDispatch cycle = processDueRetries â†’ dispatch pending tasks (Eisenhower-sorted, filtered: not running/not queued/unblocked/no decision/retry-count guard) â†’ pollProjectRuns (crash safety net: PID liveness, complete/re-dispatch/revive stalled) â†’ pollFieldOps (opt-in autoExecute: approved field tasks past scheduledFor, optional requireVaultSession check via HTTP, maxConcurrentExecutions, POSTs /api/field-ops/execute as actor "daemon"); runScheduledCommand w/ dedup |
| prompt-builder.ts (~580) | buildTaskPrompt assembly order: persona (instructions + capabilities + bidirectionally-linked skills) â†’ Field Ops context (only if agent has skill_field_ops: services/missions/approvals/own tasks/linked results/recent executions) â†’ restart context (âœ…/âŒ mission history so agents don't redo work) â†’ retry context (most recent answered decision injected as "take a DIFFERENT approach" mandate) â†’ task data fenced in <task-context> â†’ SOP (read ai-context.md, check inbox, work, write summary; bookkeeping forbidden; subtask-progress-update rules) â†’ 100KB cap. Also buildScheduledPrompt (reads .claude/commands/<cmd>/user.md), getPendingTasks (Eisenhower sort), isTaskUnblocked, hasPendingDecision |
| scheduler.ts (144) | node-cron wrapper: poll job */N, named schedule jobs w/ cron validation, hot reload (stopâ†’swapâ†’start), next-run approximation for display |
| respond-runs.ts (135) | respond-runs.json CRUD: isRunStopped (cooperative stop flag), findRunningByMessage (dedup), accumulateRunCost (adds each continuation's cost/turns/tokens), prune finished >1h |
| run-inbox-respond.ts (~659) | Self-continuing inbox auto-responder: loads message + recipient agent; inbox-scoped limits (min of global/inbox settings); stop-flag check posts "stopped by user" reply; [composing] ack; prompt = persona + conversation thread (subject-normalized OR taskId match, last 20) + target message + exact inbox.json write instructions ("partial update beats no reply"); continuation chains w/ [progress] messages; ensureReplyPosted fallback (scans inbox for agent reply newer than original; friendly first-person summaries for max-turns/timeout/error subtypes; rejects raw JSON blobs); message_sent activity event |
| run-brain-dump-triage.ts (246) | Batch triage: prompt contains workspace context (projects w/ IDs, goals, agents) + entries; instructs Claude to categorize on Eisenhower, create fully-specified tasks (best-fit agent or "me"), mark entries processed + convertedTo; guardrails (read-before-write, never delete existing); caps min(maxTurns,20)/min(timeout,10); fire-and-forget |

---

## 9. Service Adapters (`src/lib/adapters/`, 8 files ~2,400 lines)

Common interface (`types.ts`): stateless `ServiceAdapter { serviceId, name, supportedOperations[], validatePayload(ctx-less), execute(AdapterContext) â†’ AdapterResult, healthCheck(service, creds) â†’ HealthCheckResult, getFinancials?(â€¦) }`. Contract: execute NEVER throws (errors are results); validatePayload runs before credential decryption; healthCheck = real auth-verifying call, zero side effects, â‰¤5s. Registry: module-level Map, adapters self-register at import time; execute route imports all adapters then resolves by service.id â†’ catalogId.

| Adapter | Operations | Auth | Notable behavior |
|---|---|---|---|
| twitter (408 ln) | post-tweet, reply-tweet, delete-tweet | OAuth 1.0a HMAC-SHA1 hand-implemented (RFC3986 encoding, nonce, sorted params) | Dry-run echoes text/charCount; live POST/DELETE /2/tweets; healthCheck GET /2/users/me ("Connected as @user") |
| reddit (618 ln) | post-text, post-link, comment, delete | OAuth2 script-app password grant; module-level token cache (reuse while >60s left) | Strict subreddit/title/URL/thing-id validation; botDisclosure footer appended; checks json.errors even on HTTP 200; healthCheck /api/v1/me w/ karma |
| ethereum-wallet (747 ln) | read-balance, send-eth, send-usdc (+ prepareTransaction export) | Private key (server) or MetaMask signing (client); ethers v6 | Networks ethereum/base/sepolia w/ USDC addresses + RPCs + explorers; safety rails: approvedRecipients whitelist (case-insensitive), maxAmountEth default 0.1, maxAmountUsdc default 100; pre-flight balance incl. gas; dry-run returns simulation; waits 1 confirmation; prepareTransaction builds UNSIGNED tx params (ABI-encoded transfer calldata) for eth_sendTransaction â€” private key never seen in wallet flow; getFinancials â†’ ETH+USDC snapshot |
| gmail (333 ln) | send-email | OAuth2 refresh-token exchange | Dry-run actually validates credentials (real token exchange, no send); RFC 2822 MIME builder base64url; rich errors w/ phase classification (oauth-token-exchange vs api-call) + credentialCheck presence flags (12-char clientId prefix only) |
| linkedin (282 ln) | create-post | Static OAuth2 bearer | Two-step: /v2/userinfo â†’ person URN, then POST /rest/posts (LinkedIn-Version header, x-restli-id response); dry-run validates token; 3000-char cap |
| stripe (159 ln) | [] deliberately none | Basic auth (secretKey) | Connectable/testable but NOT executable ("does not support task execution yet"); healthCheck validates sk_test_/sk_live_ prefix then GET /v1/balance w/ per-currency balances |
| types.ts (126) | AdapterContext/AdapterResult/PayloadValidation/HealthCheckResult/FinancialMetric/FinancialSnapshot/ServiceAdapter | | |
| registry.ts (37) | registerAdapter/getAdapter/hasAdapter/listAdapters/adapterCount/listFinancialAdapters | | |

Cross-cutting: failures carry upstream message + apiResponseCode + executionMs; no adapter-layer rate limiting (HTTP 429 surfaces as failure); spend visibility lives at daemon/API layer, not adapters; only Ethereum implements getFinancials today.

---

## 10. Feature Inventory (categorized)

**Task & work management:** task CRUD w/ 20+ fields; Eisenhower matrix (drag-drop quadrants); Kanban board; goal hierarchy (long-term â†’ milestones â†’ tasks) w/ computed progress; projects/ventures w/ teams + lifecycle; brain dump capture + AI triage; subtasks, daily actions, acceptance criteria, dependencies (blockedBy), estimates vs actuals, tags, notes, comments, due dates; bulk operations; archive; soft delete + undo; checkpoints (save/load/export/import/new); demo seeding.

**Agent system:** dynamic agent registry (5 built-in: me/researcher/developer/marketer/business-analyst + unlimited custom); persona = instructions + capabilities + injected skills; skills library w/ bidirectional linking; multi-agent tasks (lead + collaborators w/ per-collaborator delegation); auto-generated slash-command files; team profile pages; workload status pills.

**Execution engine:** one-click task run (spawn claude -p); continuous missions (whole-project runs w/ dependency-aware auto-dispatch + concurrency slots); autonomous daemon (polling, cron schedules, retries w/ exponential backoff, hot config reload); session resilience (self-continuation chains bounded per task/inbox); loop detection (3 strikes â†’ human decision w/ Retry/Skip/Stop); stall detection + reconciliation safety nets (PID liveness everywhere); stop buttons at task/project/inbox-chain level; emergency stop kill switch; cost + token tracking per session/run/chain (4 token counters); PM2 always-on mode.

**Communication:** inbox threads (delegation/report/question/update/approval); AI auto-respond chains w/ composing indicator + stop; decisions queue (options + custom answer, blocks dependent execution until answered); activity log (15 event types); notification bridge from Field Ops to agent inbox.

**Field Ops (real-world actions):** 64-service catalog in 16 categories w/ setup guides; service install/connect/test (latency + identity); encrypted credential vault (AES-256-GCM/scrypt, 30-min sessions, brute-force lockout, legacy migration, reset w/ confirmation); field tasks w/ 8 types + payload schemas + templates ({{variable}} instantiation); approval workflow (risk classification, autonomy levels approve-all/approve-high-risk/full-autonomy, batch approve/reject â‰¤50, rejection feedback â‰¥10 chars); execution engine (dry-run, staleness checks, manual-execution fallback, wallet-signing two-step flow); financial safety (global + per-service budgets day/week/month, per-tx caps, approved recipients, spend log + summary, pauseOnBreach); circuit breaker (3 consecutive failures â†’ mission pause); missions (grouping, progress, pause/resume); field audit log (22 event types, rotation + archives); financial dashboards (wallet balances, aggregated snapshots, available-integration suggestions).

**Platform/security:** bearer-token API auth (constant-time) + CSRF origin checks; owner-guard on destructive ops; Zod validation everywhere; per-file mutexes; rate limiters (vault + execution); secret detection; credential scrubbing in logs; prompt fencing + caps; binary whitelist; safe child env; error boundaries + global error handler; keyboard shortcuts; Cmd+K search; dark/light themes; onboarding wizard; connection monitor; PM2/terminal status display.

**Testing:** 193 Vitest tests â€” Validation (90: 17 Zod schemas), Daemon (42: security/config/prompt/types), Data layer (19: I/O, mutex, archive), Agent flow (17: end-to-end communication), Security (25: auth, rate limiting, tokens, CSRF).

---

## 11. Concepts Worth Carrying Into Fabrica's Transformation

Directly relevant to "desktop CLI agent management and operations platform":
1. **JSON-as-IPC / shared-file source of truth** between humans, UI, and agents.
2. **Agent personas as data** (instructions + capabilities + skills) with auto-generated CLI integration files.
3. **Spawn-and-track child process model** with PID liveness reconciliation, detached self-continuation chains, and cost/token accounting per session.
4. **Continuous missions**: dependency-aware auto-dispatch under concurrency limits, with loop detection escalating to human decisions.
5. **Decision queue as first-class blocking primitive** (execution halts until human answers).
6. **Approval state machine + autonomy levels + circuit breaker + spend limits** â€” the safety stack for letting agents act in the real world.
7. **Encrypted local vault** with session-based unlock and owner-guard.
8. **Service adapter interface** (validate â†’ execute â†’ healthCheck â†’ financials, dry-run everywhere, never-throw contract).
9. **Token-optimized APIs** (filters, sparse fields, batching) because agents are the API consumers.
10. **Dual audit trails** (domain log + unified log) and notification bridges closing feedback loops.

---

## ROUND 3 ADDENDUM â€” orchestrated deep-dive wave (reports in `discovery/round3/`)

| Report | Coverage |
|---|---|
| `round3/mc-frontend-buzz-clients.md` (26KB) | Mission-control field-ops pages component-by-component: hub page autonomy selector + stats, activity audit log w/ metadata grid, approvals risk tabs + batch flows, missions list/detail incl. circuit-breaker card + vault-unlock gating with auto-retry, safety budgets/spend bars, services two-tab manager, vault health/session/credential management; hooks/use-field-ops.ts factory internals (optimistic updates, error passthrough) and use-data.ts generic CRUD factory (undo toasts, bulk atomic ops, visibility-gated polling) |

---


---

## ROUND 2 DEEP DIVE â€” Test contracts, context generator, scripts, app shell

### R2.1 Test contracts (what the 193 tests pin)
- **helpers.ts**: backupDataFiles/restoreDataFiles (in-memory JSON snapshots for isolation); factories createTestTask/createTestGoal/createTestProject with full valid defaults.
- **daemon.test.ts (~41)**: scrubCredentials (8 patterns incl. sk-/Bearer/GitHub/npm/password/AWS; normal text untouched); validatePathWithinWorkspace (accepts root/nested, rejects ../ and outside-absolute); fenceTaskData delimiters; enforcePromptLimit (100KB boundary exact); validateBinary (claude|claude.cmd|claude.exe only, basename extraction); buildSafeEnv (only safe keys); loadConfig defaults (polling/concurrency/execution/schedule shape); getPendingTasks (not-started + agent-assigned + Eisenhower sort); isTaskUnblocked; hasPendingDecision; type-shape checks.
- **data.test.ts (~20)**: read/save round-trips preserving 2-space formatting; graceful empty returns for missing files incl. archive; withTasks mutex prevents concurrent-write corruption.
- **security.test.ts (~22)**: daemonConfigUpdateSchema strictness (range rejections, unknown fields rejected, integer enforcement, incomplete execution section); escapeFenceContent case-insensitive </task-context> escaping + integration; extended scrubbing (xoxb-/xoxp-, Stripe live/test, sk-ant-, SSH PEM markers, postgres/mongo connection strings).
- **validations.test.ts (~90)**: per-schema accept-minimal/accept-full/reject-bad triples across all ~17 schemas; boundary caps (title max, subtask/tag counts, content 50k); slug ID regex rejections.
- **integration/agent-flow.test.ts (17)**: 10-step end-to-end lifecycle (create+assign â†’ delegation message â†’ task_created event â†’ in-progress+subtasks â†’ task_updated â†’ complete â†’ report to inbox â†’ task_completed event â†’ full activity-log verification â†’ inbox holds delegation+report); decision request flow (4 steps incl. answered event); blocked-dependency flow (completing blocker unblocks dependent + notification).
- Config: vitest node env, fileParallelism false (shared real data/ dir), 15s timeouts.

### R2.2 Context generator (scripts/generate-context.ts, 437 lines)
Writes data/ai-context.md sections in order: header+timestamp Â· Active Projects (counts + milestone ratios) Â· Inbox (unread/total + first 5 unread) Â· Pending Decisions (ids/questions/requesters) Â· Recent Activity (last 10) Â· Eisenhower Matrix (quadrant counts + bare task-ID lists) Â· Kanban pipeline counts Â· In-Progress Tasks expanded (id/title/assignee/project/milestone/subtask progress/BLOCKED-by) Â· Goal Progress w/ nested milestones Â· Unprocessed Brain Dump Â· Agent Workload sorted desc Â· Field Ops Status only when data exists (services, mission counts, approval queue listing every pending-approval task, last 5 executions w/ âœ…/âŒ + â‰¤2 result fields, last 5 events) Â· Quick Stats one-liner. Token economy: counts over records, hard caps (5/10/5), only in-progress expanded, quadrant IDs not titles, field-ops section omitted when empty.

### R2.3 Utility scripts
- fix-stuck-tasks.js: recovery â€” resets IFA tasks to not-started + zeroes attempts, dismisses pending decisions ("Auto-dismissed: stale auth errors cleared"), filters failed runs from active-runs.json. Bypasses API mutexes (direct file mutation).
- verify-ifa.js: read-only demo-data audit â€” project/team/goals/tasks listing, brain-dump conversion check, dependency integrity ("BROKEN DEP" flags for blockedBy refs outside project task set).
- test-restricted-auth.js: reproduces buildSafeEnv allowlist Windows-aware (PATH/HOME/APPDATA/LOCALAPPDATA/TEMP/SystemRoot/COMSPEC/PATHEXT) and runs `claude auth status` under it to diagnose whether sanitized env breaks Claude CLI auth.

### R2.4 App shell provider chain
html > body > ThemeProvider(next-themes, class strategy, dark default, system enabled) > [ LayoutShell(TooltipProvider(radix, 300ms) > sidebar + main > ActiveRunsProvider > page), Toaster(sonner, bottom-right) ]. Every page consumes live run status via ActiveRunsProvider context.

### R2.5 Configs
vitest.config.ts: node env, globals true, __tests__/**/*.test.ts only, fileParallelism false, 15s timeout, @â†’src alias. eslint.config.mjs: FlatCompat next/core-web-vitals + next/typescript, no custom rules. next.config.ts: allowedDevOrigins localhost variants, devIndicators false, optimizePackageImports [lucide-react].

---
*Round-1 coverage preserved below; Round 2 added behavioral-contract depth (tests pin the guarantees).*

*Scan coverage: directory tree fully enumerated (492 files excl. .git; ~180 source files); README.md, CLAUDE.md, package.json, ci.yml, middleware.ts, data.ts, vault-crypto.ts read in full; frontend (30 routes, 65 components, 11 hooks, provider), all 59 API routes, 12 lib modules, 14 daemon files, 8 adapter files covered via structured deep-scan. Remaining unread: CONTRIBUTING.md (guidelines only), individual ui/ primitive implementations (shadcn boilerplate).*

