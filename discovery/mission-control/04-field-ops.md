# Mission Control — Field Ops (Service Catalog, Adapters, Vault, Safety)

> Source: `_sources/mission-control/mission-control/src/lib/` + `src/app/api/field-ops/` + `src/components/field-ops/`
> Commit: `2b8c402`

## Overview

Field Ops is Mission Control's real-world service execution layer. It allows users to:
1. Connect to 64 pre-configured services (social, email, payments, publishing, ads, CRM, analytics)
2. Define field missions (autonomous task batches)
3. Execute field tasks with risk-based approval
4. Track spend with hard limits
5. Encrypt credentials in a vault
6. Get financial snapshots across all connected services

## Architecture

```
User creates Field Mission
  ↓
Mission contains Field Tasks (type: social-post, email-campaign, etc.)
  ↓
Each Task targets a Service (twitter, gmail, stripe, etc.)
  ↓
Service has an Adapter (implements ServiceAdapter interface)
  ↓
Execution goes through pipeline:
  validate → rate-limit → spend-limit → adapter lookup →
  payload validation → credential decrypt → execute → record →
  circuit breaker → notify → unblock → zeroize
```

## Service Catalog

**64 pre-configured services** across **16 categories**.

### Categories (per CLAUDE.md)
- social
- email
- payments
- publishing
- ads
- crm
- analytics
- ... (16 total)

### Service Lifecycle
1. **Browse** — `api/field-ops/catalog/route.ts` returns all 64 services
2. **Activate** — `api/field-ops/services/activate/route.ts` creates user service from catalog entry
3. **Configure** — User adds credentials (encrypted in vault)
4. **Test** — `api/field-ops/services/test/route.ts` calls `adapter.healthCheck()`
5. **Use** — Tasks reference the service by ID

## Adapters (`src/lib/adapters/`)

### Interface (`adapters/types.ts`, 144 lines)

```typescript
interface ServiceAdapter {
  serviceId: string;
  name: string;
  supportedOperations: string[];
  
  validatePayload(payload: unknown): ValidationResult;
  execute(ctx: ExecutionContext): Promise<AdapterResult>;
  healthCheck(): Promise<HealthCheckResult>;
  
  getFinancials?(): Promise<FinancialSnapshot>;
}
```

### Self-Registration Pattern (`adapters/registry.ts`, 47 lines)

```typescript
const adapters = new Map<string, ServiceAdapter>();

export function registerAdapter(adapter: ServiceAdapter) {
  adapters.set(adapter.serviceId, adapter);
}

export function getAdapter(serviceId: string) {
  return adapters.get(serviceId);
}
```

`api/field-ops/execute/route.ts` (L51-57) imports all adapter modules to trigger self-registration before `getAdapter()` lookup.

### Implemented Adapters

| Adapter | serviceId | Operations | Key Features |
|---------|-----------|-----------|--------------|
| `ethereum-adapter.ts` (747 lines) | `ethereum-wallet` | `read-balance`, `send-eth`, `send-usdc` | Uses ethers v6; supports Ethereum mainnet, Base L2, Sepolia; **recipient whitelist** + per-tx amount limits (`maxAmountEth`, `maxAmountUsdc`); both server-side `execute()` and `prepareTransaction()` for browser/MetaMask signing flow |
| `twitter-adapter.ts` | `twitter` | post, etc. | |
| `reddit-adapter.ts` | `reddit` | `submit-post` (subreddit+title+text) | |
| `linkedin-adapter.ts` | `linkedin` | social post | |
| `stripe-adapter.ts` | `stripe` | payment operations | |
| `gmail-adapter.ts` | `gmail` | email-campaign | |

### Planned Adapters (per README)
- discord, slack, github, etc.

## Vault (`src/lib/vault-crypto.ts`)

**AES-256-GCM with scrypt key derivation** (server-only).

### Key Derivation
- scrypt with N=16384, r=8, p=1, 32-byte output, 32-byte salt

### Functions
- `hashMasterPassword()` — Returns `"scrypt:<saltHex>:<hashHex>"`
- `verifyMasterPassword()` — Supports legacy SHA-256 hashes + timing-safe comparison
- `encryptCredential()` / `decryptCredential()` — AES-256-GCM with 12-byte IV
- `migrateLegacyCredential()` — Upgrades legacy base64-only credentials

### Vault Session (`src/lib/vault-session.ts`)
In-memory master password cache with TTL — avoids re-prompting per request.

### Vault API Endpoints
- `vault/setup` — Initialize (creates masterKeyHash + masterKeySalt)
- `vault/session` — Check if session active
- `vault` — Get status
- `vault/reset` — Reset (requires master password)
- `vault/decrypt` — Decrypt specific credential (requires master password)

## Spend Tracking

### `src/lib/spend-tracker.ts`
- `checkSpendLimits()` — enforces per-service and global budget caps
- `pruneSpendLog()` — cleanup old entries

### USD Estimation (in execute route)
- ETH × $2000
- USDC = 1:1
- Payment = amount

### Safety Limits (`data/field-ops/safety-limits.json`)
- Per-service spend limits
- Global budget (daily/weekly/monthly)

## Approval & Autonomy

### Autonomy Levels (`data/field-ops/approval-config.json`)
- `approve-all` — every task requires approval
- `approve-high-risk` — only high-risk tasks require approval
- `full-autonomy` — no approval needed (within spend limits)

### Risk Classification
Per task type — e.g., `crypto-transfer` is high-risk, `social-post` is medium, `email-campaign` is low.

### Approval Flow
1. Task created → status: `draft`
2. Submit for approval → status: `pending-approval`
3. User approves → status: `approved`
4. Daemon or manual trigger → status: `executing`
5. Execution completes → status: `completed` or `failed`

## Circuit Breaker

### `src/lib/field-ops-security.ts`
- `shouldTripCircuitBreaker()` — checks consecutive failures
- 3 consecutive failures → auto-pause mission + escalation

## Rate Limiting

### `executionRateLimiter` (`src/lib/field-ops-security.ts`)
- 10 executions / 5 min per service
- Prevents runaway automation

## Security: `owner-guard.ts` (64 lines)

`requireOwner(body)` rejects if `actor !== "me"` (blocks agents); checks vault session OR `masterPassword` in request body.

**Used by:**
- `/api/agents` (POST/PUT/DELETE)
- Vault mutation endpoints
- Safety limits, autonomy levels, daemon launch

## Components (`src/components/field-ops/`)

17 components:

| Component | Purpose |
|-----------|---------|
| `wallet-connect-button.tsx` | Wallet connection |
| `wallet-balance-card.tsx` | Wallet balance display |
| `vault-unlock-dialog.tsx` | Vault password prompt |
| `setup-guide-dialog.tsx` | Service setup walkthrough |
| `sign-transaction-button.tsx` | Trigger wallet signing |
| `mission-form-dialog.tsx` | Create field mission |
| `field-task-form-dialog.tsx` | Create field task |
| `field-task-card.tsx` | Field task display |
| `execution-result-panel.tsx` | Show execution result |
| `catalog-service-card.tsx` | Browse 64-service catalog |
| `activate-service-dialog.tsx` | Activate service from catalog |
| `getting-started-card.tsx` | Field Ops onboarding |
| `financial-overview-card.tsx` | Aggregated FinancialSnapshots from all adapters |
| `reject-task-dialog.tsx` | Reject field task with feedback |

## State Machine

```
draft → pending-approval → approved → executing → completed
                                              ↘ failed
```

## Security Model

### Defense-in-Depth
1. Optional Bearer token auth (timing-safe)
2. CSRF protection via Origin/Host check
3. Field Ops `owner-guard.ts` blocks agents
4. Vault encryption (AES-256-GCM + scrypt)
5. Master-password-protected: safety limits, autonomy, daemon launch
6. Per-service + global spend limits
7. Circuit breaker (auto-pause on consecutive failures)
8. Rate limiters (10/5min per service)
9. 3-day staleness pre-check
10. Dry-run mode
11. Wallet-signing redirect to MetaMask

## Scan Coverage

- `src/lib/adapters/types.ts` (144 lines), `registry.ts`, `ethereum-adapter.ts` (747 lines) read
- `src/lib/vault-crypto.ts` (211 lines) read
- `src/lib/field-ops-security.ts`, `field-ops-notify.ts`, `field-ops-activity.ts` enumerated
- `src/lib/spend-tracker.ts`, `service-categories.ts`, `owner-guard.ts` enumerated
- All 17 field-ops components enumerated
- `api/field-ops/execute/route.ts` (641 lines) read
- **Not deeply read:** all other field-ops route implementations
