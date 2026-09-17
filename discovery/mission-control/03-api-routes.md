# Mission Control — API Routes (47 endpoints)

> Source: `_sources/mission-control/mission-control/src/app/api/`
> Commit: `2b8c402`

## Overview

Mission Control has **47 API route files** following Next.js App Router conventions. All validate via Zod schemas from `validations.ts`. All mutations use `mutate*()` for mutex safety + side-effects (delegation messages, activity log, completion notifications).

## Pattern
Each route file exports `GET`/`POST`/`PUT`/`DELETE` handlers that:
1. Parse request (params, query, body)
2. Validate via Zod schema
3. Acquire mutex (for mutations)
4. Read current state
5. Apply callback
6. Write back
7. Fire side-effects (delegation, notifications, activity log)

## Core API Routes

| Route | File | Purpose |
|-------|------|---------|
| `api/tasks/route.ts` (398 lines) | Tasks CRUD | **GET** with filters: `id`, `assignedTo`, `kanban`, `projectId`, `quadrant` (do/schedule/delegate/eliminate), sparse `fields=id,title,kanban`, pagination (`limit`/`offset` → `meta`), `include=archived`, `includeDeleted`. **POST** validates via `taskCreateSchema`, creates + fires delegation message if `assignedTo !== "me"`. **PUT** updates + triggers `handleDelegation`, `handleCollaboratorChanges`, `handleCompletion`, `handleUnblocking` (notifications when `blockedBy` dependencies complete). **DELETE** soft/hard (`hard=true` removes + cleans up goal references) |
| `api/tasks/[id]/run/route.ts` | Run task | Spawn Claude Code session for one task |
| `api/tasks/[id]/stop/route.ts` | Stop task | Kill running task by PID |
| `api/tasks/bulk/route.ts` | Bulk operations | Archive multiple tasks |
| `api/tasks/archive/route.ts` | Archive | Soft-delete task |
| `api/agents/route.ts` (202 lines) | Agents CRUD | **GET** with pagination. **POST/PUT/DELETE** require `requireOwner()` — agents cannot create/delete agents. Creates auto-sync command file via `syncAgentCommand()`. Built-in agents (`me`, `researcher`, `developer`, `marketer`, `business-analyst`) only soft-delete (status: "inactive"); non-builtin agents hard-delete + cascade-clean tasks/skills |
| `api/goals/route.ts` | Goals CRUD | Goal create/read/update/delete |
| `api/projects/route.ts` | Projects CRUD | Project create/read/update/delete |
| `api/ventures/[id]/run/route.ts` | Run project | Run all tasks in project (continuous mission) |
| `api/ventures/[id]/stop/route.ts` | Stop project | Stop mission |
| `api/ventures/route.ts` | Ventures list/create | Project list/create (alias for projects) |
| `api/decisions/route.ts` | Decisions CRUD | Pending/answered decision items |
| `api/inbox/route.ts` | Inbox CRUD | Agent↔human messages |
| `api/inbox/respond/route.ts` | Auto-respond | Trigger auto-respond session |
| `api/inbox/respond/status/route.ts` | Respond status | Poll status |
| `api/inbox/respond/stop/route.ts` | Stop chain | Stop respond chain |
| `api/brain-dump/route.ts` | Brain dump CRUD | Captured ideas |
| `api/brain-dump/automate/route.ts` | Auto-triage | Convert brain dump to structured tasks |
| `api/skills/route.ts` | Skills CRUD | Skill library |
| `api/dashboard/route.ts` (86 lines) | Dashboard aggregation | **Batched aggregation endpoint** — reads all 7 core files in parallel via `Promise.all`, returns stats + attention items + Eisenhower counts + 5 most recent unread messages / pending decisions / activity events |
| `api/activity-log/route.ts` | Activity log | Read event log |
| `api/runs/route.ts` | Live runs | Live task execution tracking |
| `api/missions/route.ts` | Mission status | Continuous mission status |
| `api/checkpoints/route.ts` | Checkpoints list | List workspace snapshots |
| `api/checkpoints/new/route.ts` | New checkpoint | Save new snapshot |
| `api/checkpoints/load/route.ts` | Load checkpoint | Restore from snapshot |
| `api/checkpoints/export/route.ts` | Export checkpoint | Download snapshot |
| `api/checkpoints/import/route.ts` | Import checkpoint | Upload snapshot |
| `api/daemon/route.ts` | Daemon control | Start/stop/status via HTTP |
| `api/emergency-stop/route.ts` | Emergency stop | Kill switch |
| `api/server-status/route.ts` | Server status | Health check |
| `api/seed-demo/route.ts` | Seed demo | Load demo data |
| `api/sync/route.ts` | Sync | Sync endpoint |
| `api/sidebar/route.ts` | Sidebar | Sidebar data |

## Field Ops API Routes

| Route | File | Purpose |
|-------|------|---------|
| `api/field-ops/execute/route.ts` (641 lines) | **The Field Ops orchestrator** | Orchestrates: 1) Zod-validate body, 2) load task, 3) check `status === "approved"`, 4) resolve service + check `status === "connected"`, 5) rate-limit check (10/5min), 6) spend-limit enforcement (USD estimated from payload: ETH×$2000, USDC=1:1, payment=amount), 7) find adapter from registry, 8) check signing mode (`vault` vs `wallet`), 9) `validatePayload`, 10) dry-run or staleness re-validate (3-day rule), 11) decrypt credentials from vault, 12) transition to `executing`, 13) `adapter.execute()`, 14) record result, log spend, update `service.lastUsed`, 15) check circuit breaker (mission auto-pause on consecutive failures), 16) notify regular inbox + activity log, 17) unblock downstream field tasks, 18) unblock regular tasks blocked on field task ID, 19) zeroize credentials in memory (L433-438) |
| `api/field-ops/execute/prepare/route.ts` | Prepare unsigned tx | For MetaMask/wallet signing (returns `txParams`) |
| `api/field-ops/execute/submit-signature/route.ts` | Submit signed tx | From wallet |
| `api/field-ops/vault/setup/route.ts` | Vault setup | Initialize vault (creates masterKeyHash + masterKeySalt) |
| `api/field-ops/vault/session/route.ts` | Vault session | Check if vault session active |
| `api/field-ops/vault/route.ts` | Vault status | Get vault status |
| `api/field-ops/vault/reset/route.ts` | Vault reset | Reset vault (requires master password) |
| `api/field-ops/vault/decrypt/route.ts` | Decrypt credential | Decrypt specific credential (requires master password) |
| `api/field-ops/wallet/route.ts` | Wallet info | Get wallet info |
| `api/field-ops/catalog/route.ts` | Service catalog | Browse 64-service catalog |
| `api/field-ops/services/route.ts` | Services list | List/create/update user's services |
| `api/field-ops/services/activate/route.ts` | Activate service | Activate from catalog |
| `api/field-ops/services/save-from-catalog/route.ts` | Save from catalog | Save catalog entry |
| `api/field-ops/services/test/route.ts` | Test service | Test connection (healthCheck) |
| `api/field-ops/templates/route.ts` | Templates CRUD | Reusable task templates |
| `api/field-ops/templates/instantiate/route.ts` | Instantiate template | With `{{variable}}` substitution |
| `api/field-ops/tasks/route.ts` | Field tasks CRUD | Field task create/read/update/delete |
| `api/field-ops/missions/route.ts` | Field missions CRUD | Field mission create/read/update/delete |
| `api/field-ops/approval-config/route.ts` | Approval config | Autonomy levels + overrides |
| `api/field-ops/safety-limits/route.ts` | Safety limits | Per-service + global spend limits |
| `api/field-ops/batch/route.ts` | Batch operations | Bulk approve/reject (up to 50 tasks) |
| `api/field-ops/activity/route.ts` | Field Ops activity | Field Ops activity log |
| `api/field-ops/financials/route.ts` | Financials | Aggregated financial snapshot from all `getFinancials()` adapters |

## Middleware: `src/middleware.ts` (86 lines)

API auth middleware matching `/api/:path*`:
- Optional `MC_API_TOKEN` Bearer auth with timing-safe XOR comparison (L8-15)
- CSRF protection on state-changing methods (POST/PUT/DELETE/PATCH) via Origin/Host validation (L28-50)
- When `MC_API_TOKEN` is unset, allows open access for local dev (L55)

## Notable API Patterns

### Task Delegation Flow
When a task is created/updated with `assignedTo !== "me"`:
1. `handleDelegation()` fires
2. Writes a message to `inbox.json` addressed to the assigned agent
3. If the daemon is running, it picks up the message and dispatches the task

### Continuous Mission Flow
When "Run" is clicked on a project:
1. `api/ventures/[id]/run/route.ts` dispatches all tasks
2. `pollProjectRuns()` in daemon tracks chain state
3. As each task completes, the next batch is dispatched
4. Loop detection: 3 failures → escalate to user decision

### Dashboard Aggregation
`api/dashboard/route.ts` reads 7 files in parallel via `Promise.all`:
- tasks, goals, projects, inbox, decisions, activity, brain-dump
- Returns: stats, attention items, Eisenhower counts, top 5 unread/decisions/activity

### Field Ops Execution Pipeline
The execute route is a 19-step pipeline (see above) that handles:
- Validation → state checks → rate limits → spend limits
- Adapter lookup → payload validation → credential decryption
- Execution → result recording → circuit breaker check
- Notifications → unblocking → memory zeroization

## Scan Coverage

- All 47 API route files enumerated
- `api/tasks/route.ts` (398 lines) read
- `api/agents/route.ts` (202 lines) read
- `api/dashboard/route.ts` (86 lines) read
- `api/field-ops/execute/route.ts` (641 lines) read
- `src/middleware.ts` (86 lines) read
- **Not deeply read:** individual route implementations beyond the key ones above
