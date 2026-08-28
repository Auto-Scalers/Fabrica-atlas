# Mission Control — Complete Feature Catalog

> _Source: `Fabrica-atlas/_sources/mission-control/`_
> _75+ distinct features across 20 functional groups, 20+ API routes, 34+ React components, 6 service adapters_

---

## 1. Layout & Shell

| Feature | What It Does |
|---------|-------------|
| App Sidebar | Collapsible sidebar with badge counts (unread inbox, pending decisions, field ops approvals); sections: Main, Tasks, Communications, Field Ops, Crew, Settings |
| Layout Shell | Root wrapper: sidebar toggle, command bar, search dialog, keyboard shortcuts, onboarding, connection-loss banner, ActiveRuns provider |
| Command Bar | Quick-action bar (brain dump capture, navigation, task creation) |
| Search Dialog | Global search across tasks, projects, goals |
| Keyboard Shortcuts | Global keyboard shortcut handler |
| Onboarding Dialog | First-run experience / setup wizard |
| Breadcrumb Nav | Hierarchical page navigation |
| Theme Toggle / Provider | Dark/light mode |
| Bulk Action Bar | Multi-select operations |
| Confirm Dialog | Reusable confirmation modal |
| Empty State / Error State | Placeholders |
| Sidebar Footer | Theme toggle, connection status |

---

## 2. Dashboard / Command Center

| Feature | What It Does |
|---------|-------------|
| Dashboard Page | Home page with stats bar, attention-required alerts, field ops summary, financial overview, inbox widget, decisions widget, activity feed, agent crew status, ventures, objectives, Eisenhower summary, brain dump widget |
| Stats Bar | Four stat cards: total tasks, goals, active ventures, brain dump unprocessed |
| Attention Required | Alert banner: pending approvals, pending decisions, unread reports, DO-quadrant tasks, recent completions |
| Welcome Screen | Empty-state onboarding: create venture, add task, deploy agents, load demo |
| Dashboard Data Hook | Batched `/api/dashboard` fetcher — all data in one call |
| Fast Task Poll | Rapid re-polling during active runs |
| Active Runs Provider | Context for tracking running task executions |

---

## 3. Task Management

| Feature | What It Does |
|---------|-------------|
| Priority Matrix (Eisenhower) | 4-quadrant view: DO, SCHEDULE, DELEGATE, ELIMINATE; drag-and-drop |
| Eisenhower Summary | Compact dashboard widget with task counts per quadrant |
| Status Board (Kanban) | Three-column Kanban: Not Started, In Progress, Done |
| Task Card | Task with importance/urgency badge, subtask progress, assignment, tags |
| Task Detail Panel | Slide-over: description, subtasks, daily actions, comments, criteria, dependencies, time tracking |
| Task Form | Create/edit: importance, urgency, project, milestone, agent, collaborators, subtasks, tags, criteria, time |
| Mission Progress | Progress tracker for multi-step missions |

**Data Model:** id, title, description, importance, urgency, kanban, projectId, milestoneId, assignedTo, collaborators[], dailyActions[], subtasks[], blockedBy[], comments[], estimatedMinutes, actualMinutes, acceptanceCriteria[], tags[], dueDate

---

## 4. Objectives & Goals

| Feature | What It Does |
|---------|-------------|
| Objectives Page | Lists long-term goals and milestones; create/edit |
| Goal Card | Goal with linked tasks, milestone progress bar, status |
| Create/Edit Goal Dialog | Create/edit goals, link to projects and parent goals |

**Data Model:** id, title, type (long-term/medium-term), timeframe, parentGoalId, projectId, status, milestones[], tasks[]

---

## 5. Ventures (Projects)

| Feature | What It Does |
|---------|-------------|
| Ventures Page | Grid of project cards with status, task counts, team; mission controls |
| Project Card Large | Card with stats, task progress, run/stop mission button |
| Create/Edit Project Dialog | Create/edit projects (name, description, color, tags, team) |

**Data Model:** id, name, description, status (active/paused/completed/archived), color, teamMembers[], tags[]

---

## 6. Brain Dump

| Feature | What It Does |
|---------|-------------|
| Brain Dump Page | Capture raw ideas/notes; triage into tasks or archive |

**Data Model:** id, content, capturedAt, processed, convertedTo, tags[]

---

## 7. Communications (Inbox, Decisions, Activity)

| Feature | What It Does |
|---------|-------------|
| Inbox | Agent-to-human messages: delegation, reports, questions, updates, approvals; mark read/archive |
| Decisions | Pending decision queue: agents ask humans with options and context |
| Decision Dialog | Answer pending decision with option selection or free text |
| Activity Log | Chronological feed: task created/completed/delegated, messages, decisions, brain dump, agent check-ins, field ops |

**Data Models:** InboxMessage (from, to, type, subject, body, status), DecisionItem (requestedBy, question, options[], context, status, answer), ActivityEvent (type, actor, taskId, summary, details, timestamp)

---

## 8. AI Agents (Crew)

| Feature | What It Does |
|---------|-------------|
| Crew Page | Browse all agents (5 built-in + custom); view assignments, status; create agents |
| Team Page | Per-agent detail: assigned tasks, workload, status |

**Data Model:** id, name, icon, description, instructions, capabilities[], skillIds[], status
**Built-in:** me, researcher, developer, marketer, business-analyst

---

## 9. Skills Library

| Feature | What It Does |
|---------|-------------|
| Skills Page | Browse skills with tags, agent assignments; built-in slash commands (/standup, /daily-plan, /weekly-review, /brainstorm, /research, /plan-feature, /ship-feature, /pick-up-work, /report, /orchestrate) |

**Data Model:** id, name, description, content (markdown), agentIds[], tags[]

---

## 10. Field Ops (External Service Execution)

### 10a. Field Ops Dashboard
| Feature | What It Does |
|---------|-------------|
| Field Ops Dashboard | Overview: missions, services, pending approvals, executing tasks, autonomy mode, activity, financials |
| Autonomy Mode Selector | Manual Approval / Supervised / Full Autonomy |

### 10b. Missions
| Feature | What It Does |
|---------|-------------|
| Missions Page | List missions with status, autonomy level, linked project |
| Mission Detail | Individual mission: tasks, progress, execution history |
| Mission Form Dialog | Create/edit missions |

### 10c. Field Tasks
| Feature | What It Does |
|---------|-------------|
| Field Task Card | Card: task type, status, service, approval state |
| Field Task Form | Create/edit: type, payload, service assignment |
| Execution Result Panel | Adapter execution output, success/failure, timing |
| Reject Task Dialog | Reject with feedback |
| Sign Transaction Button | Crypto transaction signing |

### 10d. Services (External Integrations)
| Feature | What It Does |
|---------|-------------|
| Services Page | Browse catalog; activate, configure, disconnect |
| Catalog Service Card | Browse installable services |
| Activate Service Dialog | Configure and activate |
| Setup Guide Dialog | Step-by-step setup instructions |

### 10e. Vault (Credential Encryption)
| Feature | What It Does |
|---------|-------------|
| Vault Page | Manage encrypted credentials; unlock/lock |
| Vault Setup Wizard | First-time initialization (set master password) |
| Vault Unlock Dialog | Enter master password |

**Crypto:** AES-256-GCM + scrypt key derivation, legacy SHA-256 migration, timing-safe comparison

### 10f. Safety & Spend Controls
| Feature | What It Does |
|---------|-------------|
| Safety Page | Global budgets (daily/weekly/monthly), per-service limits, approved recipients, pause-on-breach |

**Spend Tracker:** 7-layer limit check cascade, 31-day auto-pruning

### 10g. Approvals
| Feature | What It Does |
|---------|-------------|
| Approvals Page | Queue of tasks pending human approval; approve/reject with feedback |

### 10h. Field Ops Activity
| Feature | What It Does |
|---------|-------------|
| Field Ops Activity | Dedicated feed: 21 event types, log rotation (max 500 per file) |

### 10i. Financial Overview
| Feature | What It Does |
|---------|-------------|
| Financial Overview Card | Aggregated metrics from adapters (balances, revenue, spend) |
| Wallet Balance Card | Crypto wallet balance |
| Wallet Connect Button | Connect Ethereum wallet |

### 10j. Field Task Templates
| Feature | What It Does |
|---------|-------------|
| Templates | Reusable templates with `{{variable}}` slots |

---

## 11. Service Adapters

| Adapter | What It Does |
|---------|-------------|
| Twitter/X | Post tweets via API v2, OAuth 1.0a; post/reply/delete |
| Reddit | Post via OAuth2; submit, comment, vote |
| LinkedIn | Post via OAuth2 |
| Gmail | Send emails via Gmail API |
| Stripe | Payment processing; financial metrics |
| Ethereum | Crypto transfers (USDC/ETH); wallet ops; transaction signing |

**Interface:** validatePayload → execute(ctx) → healthCheck → getFinancials?

---

## 12. Autopilot (Daemon)

| Feature | What It Does |
|---------|-------------|
| Autopilot Page | Dashboard: start/stop, session history, cron config, execution settings, concurrency limits |
| Daemon Hook | Client hook for daemon status polling (5s) |
| Security Model | No network listener, credential scrubbing, prompt fencing, binary whitelist |

---

## 13. Active Runs

| Feature | What It Does |
|---------|-------------|
| Active Runs Tracking | Task execution sessions with status, cost, turns, PID |
| Project Runs (Missions) | Continuous execution: multi-task runs, loop detection, completion stats |
| Run Button | Triggers task execution via daemon |

---

## 14. Checkpoints

| Feature | What It Does |
|---------|-------------|
| Checkpoints Page | Save/restore/export/import full workspace snapshots; version tracking |

---

## 15. Emergency Stop

| Feature | What It Does |
|---------|-------------|
| Emergency Stop | Kills all running daemon sessions and active task executions immediately |

---

## 16. Data Layer

| Feature | What It Does |
|---------|-------------|
| JSON File Storage | All data in `data/` and `data/field-ops/` |
| Per-File Mutexes | async-mutex per-file locking (18 mutexes) |
| Mutate Helpers | Atomic read-modify-write with rollback |
| Data Files | 20+ JSON files for all domains |
