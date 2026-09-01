> **PATH MIGRATION NOTICE (2026-08-21):** This project moved from the environment root into `Fabrica-atlas/`. All `_sources/...` paths in this document now resolve to `Fabrica-atlas/_sources/...`. `Fabrica-app/` remains at the environment root.
# Discovery — Mission Control (`_sources/mission-control/`)

> Task 1.1 — Group 1 (Discovery & Analysis), Roadmap 02, Round 1.
> Scan-only. No source files modified.
> Source: `_sources/mission-control/` — 492 files total excluding `.git`; ~180 real source files (rest is node_modules).
> Repo: github.com/MeisnerDan/mission-control · v0.9–0.10 · AGPL-3.0.

---

## 1. What Mission Control Is

An open-source, local-first **command center for solo entrepreneurs who delegate work to AI agents** ("Tame the swarm. Ship what matters."). It is an agent-first alternative to Linear/Asana/Notion: AI agents do the work, humans make decisions. Core loop:

```
Human captures idea → tasks created & prioritized (Eisenhower) → agents execute
(Claude Code sessions) → reports land in inbox → human answers questions/approves
actions → Field Ops executes real-world actions with safety controls
```

Key positioning facts:
- Runs 100% locally. No database, no cloud. All data = plain JSON files in `mission-control/data/`.
- "JSON as IPC" — humans (web UI) and agents (file reads + REST API) share the same source of truth.
- BYOAI — any file-aware agent works (Claude Code, Cursor, Windsurf, custom scripts).
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

CI (`.github/workflows/ci.yml`): on push/PR to main — pnpm install frozen, typecheck, lint, build (tests in verify flow).

---

## 3. Repository Structure

Next.js 15 App Router app under `mission-control/`. ~180 real source files: src/app (30 pages + 59 API routes), src/components (45 app + 20 ui), src/hooks (11), src/lib (18 + 8 adapters), scripts/daemon (14 files ~4,100 lines). Data = JSON files under `data/`. Full structure mapped in `discovery/mission-control/mc-ui-frontend.md` §2.

---

## 4. Data Model (all state = JSON files in `data/`)

Core workspace: tasks.json (Eisenhower + kanban), goals.json, projects.json, agents.json, skills-library.json, brain-dump.json, inbox.json, decisions.json, activity-log.json. Runtime: active-runs.json, missions.json, daemon-config.json, daemon-status.json. Field Ops: field-ops/tasks.json (8 types, approval state machine), field-ops/services.json (64-service catalog), field-ops/.credentials.json (AES-256-GCM vault), field-ops/safety-limits.json. ID conventions: task_, goal_, proj_, etc. + timestamp-based. Full field-level detail in `discovery/mission-control/mc-fieldtask-kanban.md`.

---

## 5. Architectural Patterns (cross-cutting)

1. **Local-first JSON storage** — no DB; every collection is a JSON file; reads lock-free, writes mutexed.
2. **Per-file async-mutex write locking** — `mutate<X>()` helpers implement lock→read→callback→auto-write→unlock with implicit rollback on throw. Legacy `with<X>()` read-inside-lock helpers documented as deadlock-prone if written inside (non-reentrant mutex).
3. **JSON-as-IPC** — agents and UI share files; API adds validation + side effects; direct file reads encouraged for speed, writes should use API.
4. **Token-optimized API** — filters (assignedTo, kanban, quadrant, projectId), sparse field selection (`fields=`), pagination (`limit/offset` + meta), batched endpoints (/api/dashboard, /api/sidebar). Claimed ~92% context compression.
5. **Detached-process execution model** — API routes spawn detached `node --import tsx scripts/daemon/run-task.ts <id>` children (stdio ignored, unref'd) so HTTP requests return instantly; state lands in active-runs.json/missions.json; PID liveness checks (`process.kill(pid,0)`) reconcile dead processes everywhere.
6. **Self-continuation chains** — run-task.ts and run-inbox-respond.ts re-spawn themselves detached on timeout/max-turns, passing `--continuation N --run-id <id>`; progress persisted into task notes / inbox messages between sessions; bounded by maxTaskContinuations/maxContinuations.
7. **Defense in depth security** (Field Ops): encrypted vault (AES-256-GCM + scrypt N=16384/r=8/p=1), owner-guard (actor≠"me" rejected; vault session or masterPassword required), approval state machine with bypass detection, circuit breaker (3 consecutive failures → pause mission), rate limiters (vault brute-force: soft 3/hard 10 per 5 min w/ 15-min lockout; execution: 10/service/5 min), spend limits (per-tx/daily/weekly/monthly, global kill switch), secret detection in plaintext configs, emergency stop kill switch.
8. **Daemon hardening**: credential scrubbing (~14 regex patterns incl. AWS/GitHub/Slack/Stripe/Anthropic tokens, PEM keys, connection strings), prompt fencing (`<task-context>` delimiters w/ escape), prompt cap 100KB, binary whitelist (only claude/claude.cmd/claude.exe), safe env (PATH/HOME/TEMP only + SystemRoot on Windows + CLAUDE_CODE_OAUTH_TOKEN passthrough), args-array spawning (no shell injection), log rotation (1MB × 3).
9. **Dual activity logging + notification bridge** — field events logged to field-ops/activity-log AND mirrored into regular inbox/activity-log so agents see outcomes.
10. **Auto-generated agent integration files** — saving an agent/skill via API regenerates `.claude/commands/<id>/user.md` and `skills/<id>/SKILL.md` (sync-commands.ts), keeping Claude Code slash commands in sync with the registry.
11. **Optimistic UI** — hooks apply optimistic updates with revert-on-failure + undo toast (5s window restoring soft-deleted items).
12. **Visibility-gated polling** — all pollers pause when tab hidden; fast-poll accelerators while tasks run (3–5s vs 10–30s idle).

---

## 6. Frontend (src/app, src/components, src/hooks)

### Pages (App Router)
30 routes covering dashboard, priority-matrix (Eisenhower), status-board (Kanban), projects/ventures, goals/objectives, crew (agent registry), tasks, inbox (threaded), decisions, brain-dump, autopilot (daemon control), field-ops (hub, approvals, missions, services, vault, safety, activity), skills, checkpoints, guide, settings, activity. Full route-by-route detail in `discovery/mission-control/mc-ui-frontend.md` §3.

### Components (45 app + 20 ui)
Navigation/shell (sidebar, command bar, search dialog, keyboard shortcuts, onboarding), board infra (shared ColumnConfig/DraggableTaskCard/BoardColumn), task UI (card, detail panel, form, bulk action bar, run button), CRUD dialogs, dashboard widgets, field-ops components (14: service management, vault, wallet, financial overview, execution results), system (theme, vault-setup-wizard). Full component inventory in `discovery/mission-control/mc-ui-frontend.md` §4.

### Hooks (11) & Provider
use-data (generic CRUD factory + 9 hooks, optimistic updates), use-active-runs (run tracking, decision dialog interception), use-dashboard-data, use-daemon, use-fast-task-poll, use-field-ops (missions/tasks/services CRUD + vault session), use-processing-entries, use-sidebar, use-connection, use-wallet (MetaMask EIP-1193). Full detail in `discovery/mission-control/mc-ui-frontend.md` §5. Also `discovery/mission-control/mc-frontend-buzz-clients.md` for field-ops page internals.

---

## 7. Backend

### Middleware
CSRF (POST/PUT/DELETE/PATCH require Origin == Host) + bearer-token auth (MC_API_TOKEN, constant-time XOR comparison; unset = open local).

### API Routes (59 route.ts files)
Core workspace CRUD (tasks, goals, projects, agents, skills, brain-dump, inbox, decisions, activity-log) with filters, sparse fields, pagination, batched endpoints (/api/dashboard, /api/sidebar). Task run/stop with detached process spawning. Mission launcher with dependency-aware auto-dispatch, concurrency slots, loop detection. Field Ops: approval state machine enforcement, circuit breaker, execution engine with adapter resolution, wallet-signing two-step flow, spend-limit enforcement, vault crypto. Daemon: start/stop with PID liveness checks, config updates. Full route-by-route detail in `discovery/mission-control/mc-execute-guards.md` §2 (API guards) and `discovery/mission-control/mc-workflow-engine.md` §2 (daemon interaction).

### Lib Modules (18)
types.ts (~675 lines, all domain types/enums), validations.ts (~571 lines, ~35 Zod schemas), data.ts (857 lines, persistence layer with 20 per-file mutexes), api-client.ts (fetch wrapper with retry), field-ops-security.ts (~323 lines, risk classification, state machine, vault rate limiter, execution rate limiter, secret detection), spend-tracker.ts (time boundary helpers, limit checks), vault-session.ts (in-memory master-password cache, 30-min TTL), vault-crypto.ts (scrypt + AES-256-GCM), owner-guard.ts, field-ops-notify.ts (notification bridge), sync-commands.ts (auto-generates Claude Code slash-command files). Full detail in `discovery/mission-control/mc-execute-guards.md` §3.

---

## 8. Autonomous Daemon (`scripts/daemon/`, 14 files ~4,100 lines)

Background Node.js process. Lifecycle: config → HealthMonitor + AgentRunner + Dispatcher + Scheduler → PID file → cron → poll loop. Core files: index.ts (CLI start/stop/status), config.ts (validation + defaults), runner.ts (binary resolution, args-array spawn, stdout/stderr caps), run-task.ts (~1090 lines, single-task execution engine with self-continuation chains, mission chain logic, loop detection), dispatcher.ts (~621 lines, persistent retry queue, exponential backoff, project-run safety net, field-ops autoExecute), prompt-builder.ts (~580 lines, assembles persona + Field Ops context + task data + SOP), scheduler.ts (node-cron wrapper). Security: credential scrubbing (~14 regex patterns), binary whitelist (claude only), safe env (PATH/HOME/TEMP only), prompt fencing + 100KB cap. Full file-by-file detail in `discovery/mission-control/mc-workflow-engine.md` §3.

---

## 9. Service Adapters (`src/lib/adapters/`, 8 files ~2,400 lines)

Common interface: `ServiceAdapter { validatePayload, execute, healthCheck, getFinancials? }`. Execute NEVER throws; validatePayload runs before credential decryption; healthCheck = real auth-verifying call. 6 adapters: twitter (OAuth 1.0a, post/reply/delete tweet), reddit (OAuth2 script-app, post/comment/delete), ethereum-wallet (ethers v6, read-balance/send-eth/send-usdc, MetaMask signing flow), gmail (OAuth2, send-email), linkedin (OAuth2 bearer, create-post), stripe (Basic auth, healthCheck only, no execution yet). Full line-level contract analysis in `discovery/mission-control/mc-adapters-linelevel.md`.

---

## 10. Feature Inventory (categorized)

**Task & work management:** task CRUD w/ 20+ fields; Eisenhower matrix (drag-drop quadrants); Kanban board; goal hierarchy (long-term → milestones → tasks) w/ computed progress; projects/ventures w/ teams + lifecycle; brain dump capture + AI triage; subtasks, daily actions, acceptance criteria, dependencies (blockedBy), estimates vs actuals, tags, notes, comments, due dates; bulk operations; archive; soft delete + undo; checkpoints (save/load/export/import/new); demo seeding.

**Agent system:** dynamic agent registry (5 built-in: me/researcher/developer/marketer/business-analyst + unlimited custom); persona = instructions + capabilities + injected skills; skills library w/ bidirectional linking; multi-agent tasks (lead + collaborators w/ per-collaborator delegation); auto-generated slash-command files; team profile pages; workload status pills.

**Execution engine:** one-click task run (spawn claude -p); continuous missions (whole-project runs w/ dependency-aware auto-dispatch + concurrency slots); autonomous daemon (polling, cron schedules, retries w/ exponential backoff, hot config reload); session resilience (self-continuation chains bounded per task/inbox); loop detection (3 strikes → human decision w/ Retry/Skip/Stop); stall detection + reconciliation safety nets (PID liveness everywhere); stop buttons at task/project/inbox-chain level; emergency stop kill switch; cost + token tracking per session/run/chain (4 token counters); PM2 always-on mode.

**Communication:** inbox threads (delegation/report/question/update/approval); AI auto-respond chains w/ composing indicator + stop; decisions queue (options + custom answer, blocks dependent execution until answered); activity log (15 event types); notification bridge from Field Ops to agent inbox.

**Field Ops (real-world actions):** 64-service catalog in 16 categories w/ setup guides; service install/connect/test (latency + identity); encrypted credential vault (AES-256-GCM/scrypt, 30-min sessions, brute-force lockout, legacy migration, reset w/ confirmation); field tasks w/ 8 types + payload schemas + templates ({{variable}} instantiation); approval workflow (risk classification, autonomy levels approve-all/approve-high-risk/full-autonomy, batch approve/reject ≤50, rejection feedback ≥10 chars); execution engine (dry-run, staleness checks, manual-execution fallback, wallet-signing two-step flow); financial safety (global + per-service budgets day/week/month, per-tx caps, approved recipients, spend log + summary, pauseOnBreach); circuit breaker (3 consecutive failures → mission pause); missions (grouping, progress, pause/resume); field audit log (22 event types, rotation + archives); financial dashboards (wallet balances, aggregated snapshots, available-integration suggestions).

**Platform/security:** bearer-token API auth (constant-time) + CSRF origin checks; owner-guard on destructive ops; Zod validation everywhere; per-file mutexes; rate limiters (vault + execution); secret detection; credential scrubbing in logs; prompt fencing + caps; binary whitelist; safe child env; error boundaries + global error handler; keyboard shortcuts; Cmd+K search; dark/light themes; onboarding wizard; connection monitor; PM2/terminal status display.

**Testing:** 193 Vitest tests — Validation (90: 17 Zod schemas), Daemon (42: security/config/prompt/types), Data layer (19: I/O, mutex, archive), Agent flow (17: end-to-end communication), Security (25: auth, rate limiting, tokens, CSRF).

---

## 11. Deep-Dive Reports (subfolder)

Detailed line-level analysis of specific subsystems. Each report covers file:line citations for all claims.

| Report | Coverage |
|---|---|
| `discovery/mission-control/mc-notifications-alerting.md` | 4 in-app notification channels (toast, bell, sidebar badges, email-configured); pull-only architecture; zero outbound delivery (no OS notifications, no email, no webhooks); notification bridge from Field Ops |
| `discovery/mission-control/mc-decision-gates.md` | Decision queue as first-class blocking primitive; 6 enforcement points (manual API, daemon dispatcher, run-task guard, mission chain, launch API, reconciler); retry-prompt injection; intercept-and-rerun loop |
| `discovery/mission-control/mc-chainedispatch-reconciler.md` | Chain-dispatch relay model (relay-race between detached processes); dual reconciler loops; zombie/orphan lifecycle; PID liveness checks |
| `discovery/mission-control/mc-ai-providers.md` | ZERO LLM API integration (CLI-as-provider only via `claude -p`); prompt construction anatomy; batch-only/streaming-absent design |
| `discovery/mission-control/mc-service-catalog.md` | 64 pre-configured services across 16 categories; adapter coverage gap (only 6/64 have adapters = 9.4%); MCP metadata-only |
| `discovery/mission-control/mc-execute-guards.md` | API guard stack; approval state machine; rate limiters; circuit breaker; spend-limit enforcement |
| `discovery/mission-control/mc-workflow-engine.md` | Daemon internals; prompt builder; mission chain logic; self-continuation model |
| `discovery/mission-control/mc-ui-frontend.md` | Full page, component, and hook inventory |
| `discovery/mission-control/mc-frontend-buzz-clients.md` | Field-ops page internals; buzz mobile/web client relay transport |
| `discovery/mission-control/mc-fieldtask-kanban.md` | Field task data model; approval state machine; service catalog structure |
| `discovery/mission-control/mc-adapters-linelevel.md` | Per-adapter contract analysis; execute pipeline lifecycle; wallet-signing flow |

---

## 11. Concepts Worth Carrying Into Fabrica's Transformation

Directly relevant to "desktop CLI agent management and operations platform":
1. **JSON-as-IPC / shared-file source of truth** between humans, UI, and agents.
2. **Agent personas as data** (instructions + capabilities + skills) with auto-generated CLI integration files.
3. **Spawn-and-track child process model** with PID liveness reconciliation, detached self-continuation chains, and cost/token accounting per session.
4. **Continuous missions**: dependency-aware auto-dispatch under concurrency limits, with loop detection escalating to human decisions.
5. **Decision queue as first-class blocking primitive** (execution halts until human answers).
6. **Approval state machine + autonomy levels + circuit breaker + spend limits** — the safety stack for letting agents act in the real world.
7. **Encrypted local vault** with session-based unlock and owner-guard.
8. **Service adapter interface** (validate → execute → healthCheck → financials, dry-run everywhere, never-throw contract).
9. **Token-optimized APIs** (filters, sparse fields, batching) because agents are the API consumers.
10. **Dual audit trails** (domain log + unified log) and notification bridges closing feedback loops.

---

## ROUND 3 ADDENDUM — orchestrated deep-dive wave

| Report | Coverage |
|---|---|
| `discovery/mission-control/mc-frontend-buzz-clients.md` | Field-ops pages component-by-component; buzz mobile relay transport internals |

---


---

## ROUND 2 DEEP DIVE — Test contracts, context generator, scripts

Behavioral-contract depth from 193 tests: helpers (backupDataFiles/restoreDataFiles), daemon tests (scrubCredentials, validatePathWithinWorkspace, fenceTaskData, enforcePromptLimit, validateBinary, buildSafeEnv), data tests (read/write round-trips, mutex), security tests (daemonConfigUpdateSchema strictness, escapeFenceContent), validation tests (per-schema accept-minimal/accept-full/reject-bad triples), integration tests (10-step lifecycle, decision flow, blocked-dependency flow). Context generator (437 lines): token-optimized workspace snapshot. Utility scripts: fix-stuck-tasks, verify-ifa, test-restricted-auth. Full detail in subfolder reports listed in §11.

---
*Round-1 coverage preserved below; Round 2 added behavioral-contract depth (tests pin the guarantees). Scan coverage: directory tree fully enumerated; README.md, CLAUDE.md, package.json, ci.yml, middleware.ts, data.ts, vault-crypto.ts read in full; frontend (30 routes, 65 components, 11 hooks), all 59 API routes, 12 lib modules, 14 daemon files, 8 adapter files covered via structured deep-scan. Remaining unread: CONTRIBUTING.md (guidelines only), individual ui/ primitive implementations (shadcn boilerplate).*

