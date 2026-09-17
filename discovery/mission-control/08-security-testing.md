# Mission Control — Security, Testing, CI/CD

> Source: `_sources/mission-control/mission-control/src/middleware.ts`, `__tests__/`, `.github/`, `mission-control/scripts/daemon/security.ts`
> Commit: `2b8c402`

## Overview

Mission Control's security model is defense-in-depth: multiple layers protect against unauthorized access, injection, and credential leakage. Testing is comprehensive (193 tests across 5 files). CI/CD is a single GitHub Actions workflow.

## Security Model

### Layer 1: API Authentication (`src/middleware.ts`, 86 lines)

Optional `MC_API_TOKEN` Bearer auth with timing-safe XOR comparison (L8-15).

```typescript
// Timing-safe comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

When `MC_API_TOKEN` is unset, allows open access for local dev (L55).

### Layer 2: CSRF Protection

Origin/Host validation on state-changing methods (POST/PUT/DELETE/PATCH) (L28-50).

```typescript
// Reject if Origin doesn't match Host
if (request.method !== "GET" && request.method !== "HEAD") {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && !origin.includes(host)) {
    return new Response("CSRF validation failed", { status: 403 });
  }
}
```

### Layer 3: Owner Guard (`src/lib/owner-guard.ts`, 64 lines)

`requireOwner(body)` rejects if `actor !== "me"` (blocks agents); checks vault session OR `masterPassword` in request body.

**Used by:**
- `/api/agents` (POST/PUT/DELETE)
- Vault mutation endpoints
- Safety limits, autonomy levels, daemon launch

### Layer 4: Vault Encryption (`src/lib/vault-crypto.ts`)

AES-256-GCM with scrypt key derivation (server-only):
- scrypt with N=16384, r=8, p=1, 32-byte output, 32-byte salt
- 12-byte IV, 16-byte authTag
- Master password never stored — only hash + salt

### Layer 5: Daemon Security (`scripts/daemon/security.ts`, 159 lines)

#### `scrubCredentials()` — 15 Regex Patterns
- `sk-` (Anthropic, OpenAI)
- `Bearer`
- `AKIA` (AWS)
- `gh[pousr]_` (GitHub tokens)
- npm tokens
- `xox[bpsa]-` (Slack)
- `sk_(live|test)_` (Stripe)
- `sk-ant-` (Anthropic)
- SSH private keys
- Database URLs

#### `validatePathWithinWorkspace()`
Path traversal guard — rejects paths outside workspace.

#### `fenceTaskData()`
Wraps user data in `<task-context>` XML tags with escape to prevent fence-breakout injection.

#### `enforcePromptLimit()`
Truncates to 100KB.

#### `validateBinary()`
Whitelists only `claude`/`claude.cmd`/`claude.exe`.

#### `buildSafeEnv()`
Strips all env vars except:
- PATH, HOME, USERPROFILE, APPDATA, TEMP
- Windows system vars (SystemRoot required for node.exe)
- `CLAUDE_CODE_OAUTH_TOKEN` (Claude Code v2.1.71+ auth token)

### Layer 6: Spend Limits

Per-service + global budget caps (daily/weekly/monthly):
- `spend-tracker.ts` — `checkSpendLimits()`, `pruneSpendLog()`
- USD estimation: ETH × $2000, USDC = 1:1, payment = amount

### Layer 7: Circuit Breaker

3 consecutive failures → auto-pause mission + escalation to user.

### Layer 8: Rate Limiting

`executionRateLimiter` — 10 executions / 5 min per service.

### Layer 9: Staleness Check

3-day pre-check before execution — forces re-validation of old approvals.

### Layer 10: Dry Run Mode

For testing without side effects.

### Layer 11: Wallet Signing

High-value crypto operations redirect to MetaMask (server never holds keys).

## Testing (`__tests__/`)

**193 automated tests** across 5 files. Uses Vitest. Tests run against actual JSON files (with backup/restore helpers).

| File | Tests | Purpose |
|------|-------|---------|
| `validations.test.ts` | **90** | All Zod schemas — field defaults, constraints, edge cases |
| `security.test.ts` (427 lines) | **25** | `scrubCredentials` patterns, `validatePathWithinWorkspace`, `fenceTaskData`, `validateBinary`, `buildSafeEnv` |
| `daemon.test.ts` | **42** | Config loading, prompt builder, types, security |
| `data.test.ts` | **19** | Read/write operations, file I/O, mutex safety, archive |
| `integration/agent-flow.test.ts` (497 lines) | **17** | End-to-end: task creation → delegation → inbox → decisions → activity log; decision request flow; blocked task dependency unblock |
| `helpers.ts` | — | `backupDataFiles()`, `restoreDataFiles()` |

### Test Coverage
- **Schema validation:** 90 tests cover all Zod schemas
- **Security primitives:** 25 tests cover credential scrubbing, path validation, fence escaping, binary whitelisting, env building
- **Daemon config:** 42 tests cover config loading, prompt building, types
- **Data layer:** 19 tests cover read/write, file I/O, mutex safety, archive
- **Integration:** 17 tests cover end-to-end flows

## CI/CD (`.github/`)

| File | Purpose |
|------|---------|
| `workflows/ci.yml` (42 lines) | **GitHub Actions** — runs on push/PR to main; uses `pnpm@10`, Node 22; jobs: `pnpm install --frozen-lockfile`, `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build`, `pnpm test` (working dir: `mission-control/`) |
| `pull_request_template.md` | PR template |
| `ISSUE_TEMPLATE/feature_request.md`, `bug_report.md` | Issue templates |

### CI Pipeline
1. `pnpm install --frozen-lockfile`
2. `pnpm tsc --noEmit` (typecheck)
3. `pnpm lint` (ESLint)
4. `pnpm build` (Next.js build)
5. `pnpm test` (Vitest)

## Defense-in-Depth Summary

```
User Request
  ↓
[1] API Auth (Bearer token, timing-safe)
  ↓
[2] CSRF (Origin/Host check)
  ↓
[3] Owner Guard (actor === "me")
  ↓
[4] Vault Unlock (master password + AES-256-GCM)
  ↓
[5] Schema Validation (Zod)
  ↓
[6] Rate Limit (10/5min per service)
  ↓
[7] Spend Limit (per-service + global)
  ↓
[8] Circuit Breaker (3 failures → pause)
  ↓
[9] Staleness Check (3-day rule)
  ↓
[10] Dry Run / Real Execute
  ↓
[11] Credential Decrypt → Execute → Zeroize
  ↓
[12] Result Recording + Activity Log
```

## Key Security Properties

- **No network listener** in daemon (pure local process)
- **Credential scrubbing** before logging
- **Prompt fencing** with `<task-context>` delimiters
- **Binary whitelist** (`claude` only)
- **Safe env** (only essential vars)
- **`skipPermissions` defaults `false`** — `[SECURITY]` warning when enabled
- **Timing-safe comparison** for password/auth checks
- **AES-256-GCM** with scrypt for credential encryption
- **Master password never stored** — only hash + salt
- **Legacy SHA-256** hashes auto-migrated to scrypt

## Scan Coverage

- `src/middleware.ts` (86 lines) read
- `src/lib/owner-guard.ts` read
- `src/lib/vault-crypto.ts` (211 lines) read
- `scripts/daemon/security.ts` (159 lines) read
- All 5 test files enumerated
- `.github/workflows/ci.yml` (42 lines) read
- **Not deeply read:** individual test cases, all test internals
