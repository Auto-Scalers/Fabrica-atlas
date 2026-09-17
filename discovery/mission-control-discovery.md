# Mission Control — Discovery Overview

> Full discovery scan of `_sources/mission-control/` regenerated from fresh sources.
> **Source commit:** `2b8c402bb4ab04f6c2a3291f832e25a7482ab472` (2026-09-03)
> **License:** AGPL-3.0
> **Forked from:** `MeisnerDan/mission-control`

---

## What Is Mission Control?

**Mission Control** is an open-source command center for solo entrepreneurs who delegate work to AI agents (primarily Claude Code). It provides:

- **Eisenhower Matrix** for prioritization (Do/Schedule/Delegate/Eliminate)
- **Kanban Board** with 3 columns
- **Goal Hierarchy** with milestones
- **Brain Dump** for capturing ideas
- **Agent Crew** for managing AI agents
- **Autonomous Daemon** for 24/7 background task processing
- **Field Ops** for real-world service execution (64-service catalog)
- **Encrypted Vault** for credentials
- **Spend Tracking** with hard limits
- **Approval Workflows** with risk classification

### Tagline
> "Tame the swarm. Ship what matters."

### Core Insight
Humans supervise AI agents through one legible surface: priorities, activity, decisions, spend, and history. Agents are first-class actors with persistent identity, audit trails, and scoped permissions.

---

## Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js 15 Web App (React 19)                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Pages: Dashboard, Eisenhower, Kanban, Goals, Field   │    │
│  │       Ops, Skills, Checkpoints, Daemon               │    │
│  └──────────────────────────────────────────────────────┘    │
│  Components ↕ Hooks ↕ Providers                             │
└────────────┬─────────────────────────────────────────────────┘
             │ REST API (47 routes)
             ▼
┌──────────────────────────────────────────────────────────────┐
│  API Layer (Next.js Route Handlers)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Tasks    │ │ Agents   │ │ Field    │ │ Daemon   │        │
│  │ CRUD     │ │ Registry │ │ Ops      │ │ Control  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│         │           │            │            │              │
│         └───────────┴────────────┴────────────┘              │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Data Layer (JSON-as-IPC, mutex-protected)            │    │
│  │ • tasks.json, goals.json, projects.json              │    │
│  │ • agents.json, skills-library.json                   │    │
│  │ • inbox.json, decisions.json, activity-log.json     │    │
│  │ • field-ops/*.json (services, missions, vault)      │    │
│  └──────────────────────────────────────────────────────┘    │
└────────────┬─────────────────────────────────────────────────┘
             │ File system
             ▼
┌──────────────────────────────────────────────────────────────┐
│  Daemon (Background Node.js Process)                         │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Dispatcher (polls tasks.json, spawns agents)         │    │
│  │ Runner (spawns Claude Code subprocesses)             │    │
│  │ Scheduler (node-cron: daily-plan, standup, etc.)     │    │
│  │ HealthMonitor (session tracking, cleanup)            │    │
│  └──────────────────────────────────────────────────────┘    │
│         │                                                    │
│         ▼                                                    │
│  Claude Code (`claude -p`) — AI agent subprocesses           │
└──────────────────────────────────────────────────────────────┘
```

---

## Codebase Statistics

| Metric | Value |
|--------|-------|
| **Lines of code** | ~15,000+ (src/) |
| **API routes** | 47 |
| **Pages** | 30+ |
| **Components** | 40+ (17 UI primitives + 17 Field Ops + core) |
| **Hooks** | 11 |
| **Daemon files** | 12 |
| **Tests** | 193 (across 5 files) |
| **Built-in agents** | 5 (me, researcher, developer, marketer, business-analyst) |
| **Service catalog** | 64 services across 16 categories |
| **Implemented adapters** | 6 (ethereum, twitter, reddit, linkedin, stripe, gmail) |
| **Commands** | 14 (.claude/commands) + 11 (commands/) |
| **Skills** | 3 (agentic-company, eisenhower-triage, task-management) |
| **CI workflows** | 1 (ci.yml) |

---

## Subsystem Reports

| # | Report | What's Inside |
|---|--------|---------------|
| 1 | [mission-control/01-app-architecture.md](mission-control/01-app-architecture.md) | Next.js 15 app shell, routing, layout, tech stack |
| 2 | [mission-control/02-data-layer.md](mission-control/02-data-layer.md) | JSON-as-IPC, mutex-protected data layer, types, validations |
| 3 | [mission-control/03-api-routes.md](mission-control/03-api-routes.md) | 47 API routes (core + Field Ops) |
| 4 | [mission-control/04-field-ops.md](mission-control/04-field-ops.md) | Service catalog, adapters, vault, spend limits, approvals |
| 5 | [mission-control/05-daemon.md](mission-control/05-daemon.md) | Background daemon, dispatcher, runner, scheduler |
| 6 | [mission-control/06-ui-pages.md](mission-control/06-ui-pages.md) | Pages, components, hooks, providers |
| 7 | [mission-control/07-skills-commands.md](mission-control/07-skills-commands.md) | Skills library, commands, agent↔skill sync |
| 8 | [mission-control/08-security-testing.md](mission-control/08-security-testing.md) | Security model, middleware, tests, CI/CD |

---

## Key Architectural Patterns

### 1. JSON-as-IPC
All data lives in `mission-control/data/*.json` — humans (UI) and agents (Claude Code reading files or calling API) share the same source of truth. No sync layer, no database, no cloud.

### 2. Mutex-Protected Atomic Mutations
Per-file `async-mutex` ensures concurrent writes from multiple agents queue safely. Three patterns: `get*()` (read), `save*()` (write), `mutate*()` (atomic read-modify-write).

### 3. Self-Registering Adapters
Each adapter calls `registerAdapter()` on import; the execute route triggers all adapter imports so they self-register before lookup.

### 4. Schema-First Validation
Zod schemas in `validations.ts` are the single source of truth for all API request shapes. Frontend mirrors schemas (e.g., `LIMITS` constants).

### 5. Defense-in-Depth Security
11 layers: API auth, CSRF, owner guard, vault encryption, schema validation, rate limit, spend limit, circuit breaker, staleness check, dry run, wallet signing.

### 6. Background Daemon
Polls `tasks.json` every N minutes, spawns Claude Code subprocesses with concurrency limits, retries with exponential backoff persisted to disk, scheduled commands via `node-cron`.

### 7. Continuous Missions
Project "Run" button dispatches all tasks, respects dependency chains, auto-dispatches next batch as each completes, has loop detection (3 failures → escalate to user).

### 8. Bidirectional Agent↔Skill Sync
`sync-commands.ts` regenerates `.claude/commands/<id>/user.md` from `agents.json` (with skills resolved from `agent.skillIds` ∪ `skill.agentIds`).

### 9. Multi-Channel Sourcing
The same repo ships both plugin commands (`commands/`) for Claude Cowork AND Claude Code commands (`.claude/commands/`). Some are duplicates, some are unique (orchestrate, pick-up-work, report, tester).

### 10. Local-First
No database, no cloud, no API keys leaked — data lives in plain JSON on the user's machine.

---

## Notable Features

### Management Plane
- **Eisenhower Matrix** with `@dnd-kit` drag-and-drop
- **Kanban Board** with 3 columns
- **Goal Hierarchy** with milestones + linked tasks
- **Brain Dump** triage
- **Agent Crew** (6 built-in + unlimited custom agents)
- **Skills Library** with bidirectional injection into prompts
- **Multi-Agent Tasks** (lead `assignedTo` + `collaborators[]`)
- **Orchestrator** (`/orchestrate` slash command + `scripts/run-team.sh` tmux launcher)

### Operations Plane
- **Autonomous Daemon** (24/7 background, 5-min polling, scheduled cron jobs)
- **One-Click Task Execution** ("Launch" button → Claude Code session)
- **Session Resilience** (auto-continuation on timeout/max-turns)
- **Cost & Usage Tracking** (input/output/cache tokens + USD)
- **Failure Logging** (`task_failed` activity events)
- **Inbox Stop Button** (kills process tree + prevents continuation chains)
- **Continuous Missions** (run entire project with one click)
- **Loop Detection** (3 attempts → escalate to user decision)

### Field Ops
- **64-Service Catalog** across 16 categories
- **Encrypted Vault** (AES-256-GCM + scrypt)
- **Financial Safety Controls** (per-service + global spend limits + circuit breaker)
- **3 Autonomy Levels** (approve-all / approve-high-risk / full-autonomy)
- **Approval Workflows** with risk classification
- **Dry Run Testing** with auto-staleness checks
- **Mission System** with progress tracking
- **Emergency Stop** kill switch

### Platform
- **Token-Optimized API** (sparse fields, quadrant filters, `~50 tokens vs ~5,400`)
- **Cmd+K Search** (cmdk-based)
- **Error Boundaries** (per-page + global)
- **API Pagination** with `meta` object
- **193 Automated Tests**
- **PM2 Support** (always-on auto-restart)

---

## Technologies

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15.3.3 (App Router), React 19.1 |
| **Language** | TypeScript 5.8 strict mode |
| **Styling** | Tailwind CSS v3.4 + CSS variables, shadcn/ui (Radix UI primitives) |
| **Drag & Drop** | @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities |
| **Search** | cmdk (Cmd+K) |
| **Validation** | zod v4.3 |
| **Crypto** | Node.js built-in crypto (AES-256-GCM, scrypt) |
| **Web3** | ethers v6.16 (Ethereum/Base/USDC adapter) |
| **Scheduling** | node-cron (daemon cron jobs) |
| **State** | Local JSON files + async-mutex for concurrent write safety |
| **UI icons** | lucide-react |
| **Themes** | next-themes |
| **Toasts** | sonner |
| **ID generation** | nanoid v5 |
| **Testing** | vitest v4 (193 tests) |
| **Process manager** | PM2 (via ecosystem.config.js) |

---

## What Fabrica Could Adopt

Based on the discovery scan, here are the patterns and features from Mission Control that could inform Fabrica's transformation:

### High-Value Adoptions
- **JSON-as-IPC pattern** — simpler than a full database for solo/small-team use
- **Mutex-protected atomic mutations** — safe concurrent writes
- **Self-registering adapters** — extensible integration layer
- **Schema-first validation** — Zod as single source of truth
- **Defense-in-depth security** — 11 layers, including owner-guard for agents
- **Encrypted vault** — AES-256-GCM + scrypt for credentials
- **Service catalog pattern** — 64 pre-configured services with risk levels
- **Approval workflows** — risk-based autonomy levels
- **Continuous missions** — run entire project with one click
- **Loop detection** — 3 failures → escalate to user

### Medium-Value Adoptions
- **Eisenhower matrix** — importance × urgency quadrants
- **Brain dump** — one-key capture with auto-triage
- **Decision inbox** — every blocked-on-human question lands here
- **Bidirectional agent↔skill sync** — keeps registry and files in sync
- **Multi-agent tasks** — lead + collaborators
- **Parallel tmux orchestrator** — spawn one pane per agent

### Low-Value / Out of Scope
- **AGPL-3.0 license** — incompatible with Fabrica's Apache 2.0
- **Next.js web app** — Fabrica is Electron desktop
- **Local JSON storage** — Fabrica already has its own persistence
- **Claude Code subprocess** — Fabrica uses its own agent system
- **PM2 process manager** — Electron app has its own lifecycle

### Already in Fabrica
- **Task management** (different model)
- **Agent registry** (different architecture)
- **Plugin system** (different model)
- **Worktree management** (Fabrica-specific)

---

## Scan Coverage

- **Root files:** `README.md`, `CLAUDE.md`, `LICENSE`, `CONTRIBUTING.md`, `.gitignore` read
- **`mission-control/` (Next.js app):** all config files read
- **`src/lib/`:** `types.ts` (675), `validations.ts` (571), `data.ts` (855), `vault-crypto.ts` (211), `owner-guard.ts`, `sync-commands.ts`, `api-client.ts` read
- **`src/lib/adapters/`:** `types.ts` (144), `registry.ts`, `ethereum-adapter.ts` (747) read
- **`src/app/`:** layout, home page (868 lines), all 30+ pages enumerated
- **`src/app/api/`:** all 47 routes enumerated; key ones read
- **`src/components/`:** all core + Field Ops components enumerated
- **`src/hooks/`:** all 11 hooks enumerated
- **`scripts/daemon/`:** 12 files; `index.ts` (228), `config.ts` (172), `dispatcher.ts` (621), `runner.ts` (373), `security.ts` (159) read
- **`__tests__/`:** all 5 test files enumerated (193 tests)
- **`skills/`, `commands/`, `.claude/commands/`:** all enumerated
- **`.github/workflows/ci.yml`** (42 lines) read

**Not deeply read:** individual page implementations beyond home dashboard, all adapter implementations beyond ethereum, individual test cases, command SKILL.md contents.

---

*Generated: 2026-09-03 — Source commit: `2b8c402`*
