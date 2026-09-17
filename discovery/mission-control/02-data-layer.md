# Mission Control — Data Layer (JSON-as-IPC)

> Source: `_sources/mission-control/mission-control/src/lib/`
> Commit: `2b8c402`

## Overview

Mission Control's data layer is a JSON-as-IPC pattern: all state lives in plain JSON files on disk, with mutex-protected atomic mutations. This is the core of how humans (UI) and agents (Claude Code) share state without a database.

## Core File: `src/lib/data.ts` (855 lines)

The **core IPC engine**. All writes go through this file.

### Architecture
- Per-file `async-mutex` (L176-197) — separate mutex for every data file
- Three write patterns:
  1. **`get*()`** (L201-307) — Read-only, no locking
  2. **`save*()`** (L311-375) — Mutex-protected write of entire file
  3. **`mutate*()`** (L463-606) — Lock→read→callback→auto-write→unlock atomic operation
  4. **`with*()`** (L381-456) — Legacy read-only-inside-lock (does not write back)

### Data Files Managed

**Core:**
- `tasks.json` — Main task list (Eisenhower + Kanban + agent assignment)
- `tasks-archive.json` — Archived (soft-deleted) tasks
- `goals.json` — Long-term goals + medium-term milestones
- `projects.json` — Project list with teamMembers, color, tags
- `brain-dump.json` — Captured ideas awaiting triage
- `activity-log.json` — Event log
- `inbox.json` — Agent↔human messages
- `decisions.json` — Pending/answered decision items
- `agents.json` — Agent registry
- `skills-library.json` — Reusable skill markdown
- `active-runs.json` — Live task execution
- `daemon-config.json` — Daemon settings

**Field Ops (`data/field-ops/`):**
- `missions.json` — Field missions
- `tasks.json` — Field tasks
- `services.json` — User's connected services
- `service-catalog.json` — 64 pre-configured services
- `templates.json` — Reusable task templates
- `safety-limits.json` — Spend limits
- `approval-config.json` — Autonomy levels
- `activity-log.json` — Field Ops audit trail
- `.credentials.json` — Encrypted vault

**Checkpoints:**
- `data/checkpoints/*.json` — Workspace snapshots
- Helpers: `getAllCoreData()`, `loadCoreData()`, `saveCheckpoint()`

### Log Rotation
`mutateFieldActivityLog()` rotates to date-stamped archive files when count exceeds 500 (L774-816).

## Types: `src/lib/types.ts` (675 lines)

Comprehensive TypeScript definitions for the entire system:

- `Task` — Eisenhower quadrant, Kanban column, agent assignment, dependencies
- `Goal` — title, type (long/medium), parent, milestones, progress
- `Project` — teamMembers, color, tags
- `BrainDumpEntry` — captured ideas
- `AgentDefinition` — agent registry entry
- `SkillDefinition` — reusable skill markdown
- `InboxMessage` — agent↔human messages
- `DecisionItem` — pending/answered decisions
- `FieldTask` — Field Ops task with approval FSM
- `FieldMission` — Field Ops mission with autonomy level
- `FieldOpsService` — connected service
- `FieldOpsCredential` — encrypted vault entry
- `ActivityEvent` — event log entry
- `FieldOpsActivityEvent` — Field Ops audit event
- Eisenhower quadrant helpers (L393-414)
- `SKILLS` constant (slash command registry, L68-129)
- Field Ops types (L416-674)
- `LIMITS` constants

## Validation: `src/lib/validations.ts` (571 lines)

All **Zod schemas** for request validation:
- `taskCreateSchema` / `taskUpdateSchema`
- Goal schemas
- Project schemas
- Brain-dump schemas
- Inbox schemas
- Decision schemas
- Activity schemas
- `agentCreateSchema` / `agentUpdateSchema`
- `skillCreateSchema` / `skillUpdateSchema`
- `daemonConfigUpdateSchema` (L325-359 — strictly validates polling/concurrency/schedule/execution/inbox/fieldOps blocks)
- Field Ops schemas
- `vaultStoreSchema`, `vaultDecryptSchema`
- `executeTaskSchema`
- `fieldTemplateCreateSchema`
- `fieldBatchSchema`

### `validateBody<T>()` Helper (L538-571)
Returns `{success, data}` or `{success, error}` with field-level errors.

### LIMITS Export (L41-64)
- `TITLE=200`
- `DESCRIPTION=5000`
- Other field limits
- `DEFAULT_LIMIT=200` for pagination

## Vault Cryptography: `src/lib/vault-crypto.ts` (211 lines)

**AES-256-GCM with scrypt key derivation** (server-only).

### Key Derivation
- scrypt with N=16384, r=8, p=1, 32-byte output, 32-byte salt (L24-37)

### Functions
- `hashMasterPassword()` (L66-70) — Returns self-describing `"scrypt:<saltHex>:<hashHex>"`
- `verifyMasterPassword()` (L81-107) — Supports legacy SHA-256 hashes + timing-safe comparison
- `encryptCredential()` / `decryptCredential()` (L119-168) — AES-256-GCM with 12-byte IV, returns hex-encoded ciphertext + IV + 16-byte authTag
- `migrateLegacyCredential()` (L201-211) — Upgrades legacy base64-only credentials to real crypto

### Storage Format
`data/field-ops/.credentials.json`:
```json
{
  "masterKeyHash": "scrypt:...",
  "masterKeySalt": "...",
  "credentials": [
    {
      "id": "...",
      "serviceId": "...",
      "encryptedData": "...",
      "iv": "...",
      "authTag": "...",
      "expiresAt": "..."
    }
  ]
}
```

## Vault Session: `src/lib/vault-session.ts`

In-memory master password cache with TTL (avoids re-prompting per request).

## Owner Guard: `src/lib/owner-guard.ts` (64 lines)

`requireOwner(body)` rejects if `actor !== "me"` (blocks agents); checks vault session OR `masterPassword` in request body. Used by:
- `/api/agents`
- Vault mutation endpoints

## Field Ops Domain Logic

| File | Purpose |
|------|---------|
| `field-ops-security.ts` | State-machine validators (`isValidTransition`), circuit-breaker (`shouldTripCircuitBreaker`), `executionRateLimiter` (10 executions / 5 min per service) |
| `field-ops-notify.ts` | Cross-system notifications: `notifyFieldTaskCompleted`, `notifyFieldTaskFailed`, `logFieldOpsActivity` — bridges Field Ops → regular inbox + activity log |
| `field-ops-activity.ts` | `addFieldActivityEvent()` — appends events to `data/field-ops/activity-log.json` |
| `spend-tracker.ts` | `checkSpendLimits()`, `pruneSpendLog()` — enforces per-service and global budget caps |
| `service-categories.ts` | Service category constants (16 categories per CLAUDE.md) |
| `sync-commands.ts` (143 lines) | **Agent↔Skill bidirectional sync**: `syncAgentCommand()` generates `.claude/commands/<agent.id>/user.md` from `agents.json` + `skills-library.json` (resolved bidirectionally via `resolveLinkedSkills()`, L63-80); `syncSkillFile()` generates `skills/<skill.id>/SKILL.md` from skill definition. Called from `/api/agents` POST/PUT |
| `password-strength.ts` | Password strength scoring |
| `api-client.ts` (66 lines) | `apiFetch()` — fetch wrapper with Bearer auth + retry (2 retries on 5xx/network, 0 on mutations) |

## Service Adapters (`src/lib/adapters/`)

### `adapters/types.ts` (144 lines)
`ServiceAdapter` interface contract:
- `serviceId`, `name`, `supportedOperations`
- `validatePayload(payload)` — fail-fast on bad input
- `execute(ctx)` — returns `AdapterResult` with `{success, data, error?, apiResponseCode?, executionMs?}`
- `healthCheck()` — lightweight read-only connection test
- Optional `getFinancials()` — returns `FinancialSnapshot` for Financial Overview Card

### `adapters/registry.ts` (47 lines)
Self-registration pattern via `Map<string, ServiceAdapter>`:
- `registerAdapter()`, `getAdapter()`, `hasAdapter()`, `listAdapters()`, `listFinancialAdapters()`

### Adapter Implementations

| Adapter | serviceId | Operations | Notes |
|---------|-----------|-----------|-------|
| `ethereum-adapter.ts` (747 lines) | `ethereum-wallet` | `read-balance`, `send-eth`, `send-usdc` | Uses ethers v6; supports Ethereum mainnet, Base L2, Sepolia; **recipient whitelist** + per-tx amount limits; server-side `execute()` and `prepareTransaction()` for browser/MetaMask signing |
| `twitter-adapter.ts` | `twitter` | post, etc. | |
| `reddit-adapter.ts` | `reddit` | `submit-post` (subreddit+title+text) | |
| `linkedin-adapter.ts` | `linkedin` | social post | |
| `stripe-adapter.ts` | `stripe` | payment operations | |
| `gmail-adapter.ts` | `gmail` | email-campaign | |
| (planned) | `discord`, `slack`, `github`, etc. | — | Per README roadmap |

## Scan Coverage

- `src/lib/data.ts` (855 lines) read
- `src/lib/types.ts` (675 lines) read
- `src/lib/validations.ts` (571 lines) read
- `src/lib/vault-crypto.ts` (211 lines) read
- `src/lib/owner-guard.ts`, `sync-commands.ts`, `api-client.ts` read
- `src/lib/adapters/types.ts` (144 lines), `registry.ts`, `ethereum-adapter.ts` (747 lines) read
- Remaining lib files enumerated
- **Not deeply read:** individual adapter implementations, all field-ops helper functions
