# R4-1.24 — Mission-Control Field-Ops Execute-Route Guard Stack: Line-Level Deep Dive

**Task:** R4-1.24 (Group 1, Round 4) · **Date:** 2026-08-23 · **Dispatch:** ctx_55beaaf1ae88 · **Task ID:** task_4382e199774a
**Scope:** every middleware/guard layer between HTTP request arrival and adapter invocation for Field Ops execution — auth, validation, risk classification, approval requirements, bypass detection, rate limiting, spend enforcement, failure modes, config surface.
**Convention:** paths relative to `_sources/mission-control/mission-control/` unless prefixed otherwise. This report goes DEEPER on guards only; adapter internals and the 18-step pipeline overview live in `discovery/round4/mc-adapters-linelevel.md` §2–§3 (do not duplicate there — this report cites it once and moves on).

---

## 0. Executive Summary

The execute path is defended by **13 ordered layers**: one global Next.js edge middleware (bearer-token auth + CSRF origin check), then twelve in-route gates inside `POST /api/field-ops/execute` (`src/app/api/field-ops/execute/route.ts`, 641L): Zod body validation → task existence → approved-status gate → FSM transition gate → service-connected gate → per-service execution rate limit → spend-limit enforcement (with mission auto-pause) → adapter-presence/manual fallback → signing-mode redirect → adapter payload validation → dry-run short-circuit → staleness re-validation → vault credential gate (password verify + AES-GCM decrypt). Four more guards fire **after** execution: rate-limiter recording, credential zeroization, sanitized logging, circuit breaker.

Two structural facts shape everything:

1. **There is no per-request user identity.** The only global auth is an *optional* shared bearer token (`src/middleware.ts:52-55` — unset token = fully open API, the default local-dev posture). Inside the execute route, `actor` is a free-form string supplied by the caller (`route.ts:106-107`) and is **never authenticated** — it is attribution metadata only.
2. **The real security anchor is the approval state machine upstream** (`src/app/api/field-ops/tasks/route.ts`), which computes `approvalRequired` server-side from a risk table, enforces transition legality, detects draft→approved bypass attempts, and gates approve/reject behind an owner check (`requireOwner`). The execute route then trusts the resulting `"approved"` status as its core precondition (`route.ts:120-125`).

---

## 1. Layer 0 — Global Middleware: Bearer Auth + CSRF Origin Check

File: `src/middleware.ts` (86L). Applies to ALL `/api/*` routes via matcher (`middleware.ts:84-86`). This runs BEFORE any route handler, so it is the outermost guard of the execute stack.

### 1.1 CSRF origin check (evaluated FIRST)

- On `POST | PUT | DELETE | PATCH` (`middleware.ts:28-29`), reads `Origin` and `Host` headers (`middleware.ts:30-31`).
- If BOTH present and origins mismatch → 403 `Cross-origin request blocked` (`middleware.ts:37-42`).
- Unparseable `Origin` header → 403 `Invalid Origin header` (`middleware.ts:43-48`).
- **Failure mode (deliberate):** requests with NO `Origin` header pass — explicitly allowed for "server-to-server, CLI tools like curl" (`middleware.ts:32-33`). Non-browser attackers are therefore unaffected by this layer; it defends browser-based CSRF only.

### 1.2 Bearer-token auth (optional, env-gated)

- Token source: `process.env.MC_API_TOKEN` (`middleware.ts:52`).
- **If unset → open access** with `NextResponse.next()` — documented as "backwards compatible for local-only development with zero configuration" (`middleware.ts:54-55`). This is the DEFAULT posture; `.env.example` ships both variables commented out (`.env.example:14-15`).
- If set: missing `Authorization` header → 401 (`middleware.ts:57-63`); format must be exactly `Bearer <token>` (two parts) → else 401 (`middleware.ts:66-72`); comparison via hand-rolled XOR constant-time compare `timingSafeEqual` (`middleware.ts:8-15`, used `:74-79`) to prevent timing side channels.
- **Config pairing:** `.env.example:11-12` documents that `MC_API_TOKEN` (server/middleware) and `NEXT_PUBLIC_MC_API_TOKEN` (browser fetch calls) must match. The public half being in the client bundle means this token is an automation gate, not a secret from the user running the app.

### 1.3 What middleware does NOT do

No per-route scoping, no roles, no rate limiting, no logging. A request that passes Layer 0 reaches ANY `/api/*` handler with identical privileges, including `execute`, `vault/*`, and `safety-limits`.

---

## 2. Layer 1 — Request Body Validation (`validateBody` + `executeTaskSchema`)

- Helper: `validateBody(request, schema)` at `src/lib/validations.ts:538-571`. Parses JSON; invalid JSON → 400 `Invalid JSON body` (`validations.ts:543-553`). Zod `safeParse`; failure → 400 with per-field `{path, message}` details array (`validations.ts:555-567`).
- Execute schema `executeTaskSchema` (`validations.ts:492-497`):
  - `taskId`: required non-empty string.
  - `masterPassword`: optional, ≤500 chars — **the vault password travels in the request body**, not a header.
  - `actor`: optional free string ≤50 chars — unauthenticated attribution label.
  - `dryRun`: optional boolean.
- Failure mode: pure 400 rejection, no state change, no activity event logged for malformed bodies (only later guards write audit events).
- Note: schema-level caps exist elsewhere too — every field-ops payload/config Zod schema independently enforces a 10KB JSON-size cap via `.refine(JSON.stringify(val).length <= 10240)` (`validations.ts:402-405` create-payload, `:422-425` update-payload, `:444-447` service config), duplicating the exported constant `PAYLOAD_MAX_SIZE = 10240` (`src/lib/field-ops-security.ts:277-278`).

---

## 3. Layers 2–3 — Task Existence + Approved-Status Gate + FSM Transition Gate

All citations `execute/route.ts` unless noted.

### 3.1 Task must exist (Layer 2)

- Loads full tasks file, linear scan by id; miss → 404 `Task not found` (`route.ts:109-114`).

### 3.2 Status must be exactly `approved` (Layer 3a)

- `task.status !== "approved"` → 400 naming current status (`route.ts:119-125`). This single check is the load-bearing wall of the whole design: everything upstream (risk table, approvals, bypass detection — §11) exists to make this status trustworthy.
- Failure modes of this trust: see §14 gap analysis (creation-path hole, direct JSON file edits, wallet-route synthetic tasks).

### 3.3 FSM transition re-check (Layer 3b)

- `isValidTransition("approved", "executing")` → 400 `Invalid state transition` (`route.ts:127-132`).
- The machine itself lives in `src/lib/field-ops-security.ts:73-82`: `approved → [executing, awaiting-signature]`; `completed` terminal; `failed/rejected → draft` retry loop. Implementation `isValidTransition` (`field-ops-security.ts:85-90`), human-readable error builder `getTransitionError` (`:93-102`).
- **Observation:** in the execute route this check is *constant* (always the same pair), so it can only fail if the table changes — it is defense-in-depth against future edits, not a runtime variable gate.

---

## 4. Layers 4–5 — Service Resolution + Connected Gate

- Service resolved from `task.serviceId` against services file (`route.ts:134-138`); declared-but-missing serviceId → 400 (`route.ts:140-145`).
- **Connected gate:** `service.status !== "connected"` → 400 with serviceId + actual status embedded (`route.ts:147-157`). Message wording adapts to dryRun ("testing" vs "executing"). Valid service statuses: `"saved" | "connected" | "disconnected" | "error"` (`src/lib/types.ts:424`).
- Failure mode: a paused/expired integration blocks execution even though the task is approved — connection health is a *runtime* guard independent of approval time.

---

## 5. Layer 6 — Per-Service Execution Rate Limiter

- Class `ExecutionRateLimiter` (`src/lib/field-ops-security.ts:242-270`): sliding window, `WINDOW_MS = 5 min`, `MAX_PER_SERVICE = 10` (`:245-246`).
- Check: `checkLimit(service.id)` prunes expired timestamps, compares count vs cap, computes precise `retryAfterMs` from oldest in-window timestamp (`:249-262`).
- Route wiring: skip entirely if no service (`route.ts:160`); denial → **HTTP 429 with `Retry-After` header** in seconds (`route.ts:162-168`), message hardcodes the "Max 10 executions per 5 minutes" policy.
- Recording asymmetry: `recordExecution(service.id)` fires **after** the adapter returns (`route.ts:427-430`), not at admission. Consequences:
  - A slow/hanging adapter execution does not hold a slot while running (good for long calls).
  - N concurrent requests admitted simultaneously all pass `checkLimit` before any records → effective burst ceiling is 10 *in-flight* + 10 *recorded* per window under concurrency (check-then-act race; harmless locally, relevant if ported to multi-process Fabrica).
- **Statefulness:** module-level singleton (`field-ops-security.ts:272-273`), in-memory only — resets on server restart; per-process, so a multi-instance deployment silently multiplies the budget.

---

## 6. Layer 7 — Spend-Limit Enforcement (financial kill-switch stack)

Skipped entirely when `dryRun` (`route.ts:172` conjunction `!dryRun`) — dry runs cost nothing and are allowed past budgets.

### 6.1 USD estimation heuristic

`estimateTransactionUsd` (`route.ts:78-97`): `send-eth` → amount × **hardcoded $2000/ETH** (`:87`); `send-usdc` → 1:1 (`:88`); `payment|refund` → amount as USD (`:91`); any operation on a `riskLevel === "high"` service with positive amount → assume USD (`:94`); else 0 = unchecked (`:96`). Docstring admits "best-effort heuristic — adapters should provide accurate amounts" (`:79`).

### 6.2 The seven-step limit ladder

`checkSpendLimits(safetyLimits, serviceId, proposedUsd, operation)` in `src/lib/spend-tracker.ts:82-132`. Documented check order (`spend-tracker.ts:70-81`):

1. **Global kill switch:** `global.enabled === false` → return null = ALL spending blocked (`spend-tracker.ts:90-91`). (Inverted flag: enabled=true means limits active.)
2. **Per-service disable:** `services[id].enabled === false` → block with message (`:93-99`).
3. **Per-tx cap:** proposed > `maxPerTxUsd` → block, message includes operation name (`:101-104`).
4. **Service daily limit:** sum of today's entries for the service + proposed > `dailyLimitUsd` → block (`:106-111`; sum via `getServiceSpend` `:41-54`).
5. **Global daily budget** (`:113-117`), 6. **weekly** (`:119-123`, Monday-start week math `:19-28`), 7. **monthly** (`:125-129`; calendar month `:30-36`).

Every denial returns a human-readable string embedding spent/proposed/limit figures (`:103`,`:109`,`:116`,`:122`,`:128`).

### 6.3 Breach handling in the route

- Activity event `field_task_failed` with `metadata.estimatedUsd` written BEFORE the response (`route.ts:179-188`).
- **pauseOnBreach escalation:** if `safetyLimits.global.pauseOnBreach` is set, EVERY `active` mission in missions.json is flipped to `paused` in one mutexed mutation (`route.ts:190-200`) — a fleet-wide emergency brake triggered by a single over-budget transaction.
- Response: 403 `Spend limit exceeded: <reason>` (`route.ts:202-205`).
- **Post-execution bookkeeping:** successful executions append `{serviceId, amountUsd, operation, taskId, timestamp}` to `spendLog`, then prune entries older than 31 days (`route.ts:462-477`; `pruneSpendLog` `spend-tracker.ts:137-144`).

### 6.4 Config surface & defaults

- Types: `GlobalBudget {enabled, dailyBudgetUsd, weeklyBudgetUsd, monthlyBudgetUsd, pauseOnBreach}` and `ServiceSpendLimit {maxPerTxUsd, dailyLimitUsd, approvedRecipients[], enabled}` (`src/lib/types.ts:587-600`); `SpendLogEntry` (`types.ts:602-608`); container `SafetyLimitsFile` (`types.ts:610-616`).
- Defaults (file missing/corrupt): enabled=true, **$100/day / $500/week / $2000/month, pauseOnBreach=true**, no per-service entries (`src/lib/data.ts:680-686`). Read via mutexed `getSafetyLimits`/`mutateSafetyLimits` (`data.ts:688-710`).
- Admin surface: `PUT /api/field-ops/safety-limits` requires owner (`safety-limits/route.ts:36-37`); partial-merge semantics for `global` and `services` (`:40-46`); GET is unauthenticated by design ("Read safety limits ... no auth required", `safety-limits/route.ts:4`).
- **Dormant field:** `approvedRecipients[]` exists in `ServiceSpendLimit` (`types.ts:598`) and is surfaced in the safety-limits PUT merge, but the execute route NEVER consults it — recipient whitelisting lives only inside the ethereum adapter's own config reading (`ethereum-adapter.ts:551-563`, per `mc-adapters-linelevel.md` §2.1). Two different whitelist mechanisms, one wired, one inert at the boundary level.

---

## 7. Layer 8 — Adapter Presence → Manual-Execution Fallback

- Lookup by `service.id` then `service.catalogId` (`route.ts:210-219`).
- No adapter registered → **fail-soft, not fail-closed:** task moved to `executing` with explanatory activity event ("manual execution — no adapter"), response `mode: "manual"` (`route.ts:221-248`). Rationale: ~61 of 66 catalog services have no native adapter (`mc-adapters-linelevel.md` §4); blocking them would freeze the pipeline. Security-relevant consequence: an irreversible external action can enter `executing` with zero technical enforcement of any downstream guard — the human is assumed to inherit the guard duty manually.

---

## 8. Layer 9 — Signing-Mode Redirect (wallet-mode split brain)

- `signingMode` read from `service.config.signingMode ?? "vault"` (`route.ts:250-251`).
- `wallet` mode + real execution (not dryRun) → **400** pointing at `POST /api/field-ops/execute/prepare`, echoing `signingMode` and `prepareUrl` (`route.ts:252-259`). Server refuses to hold private keys when the operator chose browser-wallet signing; the prepare flow builds an unsigned tx for MetaMask (`mc-adapters-linelevel.md` §3.4).
- Dry-run in wallet mode is allowed past this gate (`!dryRun` condition, `route.ts:252`) and exits at the dry-run short-circuit instead.

---

## 9. Layer 10 — Adapter Payload Validation + Layer 11 Dry-Run Short-Circuit

- `resolvedAdapter.validatePayload(task.payload)` → failure = 400 `Payload validation failed` with adapter-supplied `details[]` (`route.ts:261-271`). Contract: fail-fast before credential decryption (`src/lib/adapters/types.ts:43-46`, docstring `:110-114`).
- **Dry-run short-circuit:** after validation passes, dry runs return immediately — activity event logged ("credentials and API call skipped"), response `status: "approved"` (task UNCHANGED), `dryRun: true`, adapter name, `payloadValid: true` (`route.ts:273-293`). Task is reusable for a later real execution.
- Guard-order subtlety: rate limiting (§5) applies to dry runs; spend limits (§6) do not. A dry-run flood can exhaust a service's 10-per-5-min budget without ever touching money.

## 10. Layer 12 — Staleness Re-Validation

- Window: `THREE_DAYS_MS = 3 * 24h` (`route.ts:296`). Trigger: service never used OR `lastUsed` older than window (`route.ts:299-303`).
- Action: re-run the SAME `validatePayload` ("idempotent", comment `:305`) → failure = 400 with `staleness: true` marker and joined error strings (`route.ts:306-316`); success logs an audit event recording last-used timestamp and sets `stalenessCheck = true` echoed in final response (`route.ts:317-327`, `:639`).
- Purpose: stale credentials/endpoints are re-probed cheaply before secrets are decrypted. Note it validates payload shape only — no live healthCheck call is made here.

## 11. Layer 13 — Vault Credential Gate (authentication inside the execute route)

The ONLY identity-flavored check in the route. Fires when `service.credentialId` is set (`route.ts:333`):

1. **Password resolution order:** `vaultSession.getPassword() ?? masterPassword ?? null` — process-memory session cache first, request body second (`route.ts:334-335`). Neither present → **401** "Vault is locked" (`route.ts:336-341`).
2. Vault initialized check: missing `masterKeyHash` → 400 "Vault not initialized" (`route.ts:345-351`).
3. **Always verify password — even with an active session:** explicit comment `route.ts:345`; scrypt verify against stored hash → invalid = **403** `Invalid master password` (`route.ts:352-358`). This means a stolen unlocked session alone cannot execute paid actions without the password ALSO being in memory (session cache holds it) — but see §14 gap 4.
4. Credential record lookup by id → miss = 400 (`route.ts:360-366`); missing salt = 500 (`route.ts:368-373`).
5. **AES-256-GCM decrypt** via `decryptCredential(encryptedData, iv, authTag, password, salt)` wrapped in try/catch → any failure = generic 403 "Failed to decrypt credentials" (`route.ts:375-396`). Crypto details: scrypt N=16384/r=8/p=1 key derivation (~100ms, memory-hard), GCM auth-tag tamper detection thrown by `decipher.final()` (`src/lib/vault-crypto.ts:29-39`, `:146-168`); legacy SHA-256 hash migration path with timing-safe compare (`vault-crypto.ts:81-107`).
6. Plaintext JSON.parse, fallback `{raw: plaintext}` wrapper (`route.ts:385-390`).

### 11.1 The vault session cache itself

`src/lib/vault-session.ts`: module-level `cachedPassword` string, **30-min TTL** via self-clearing `setTimeout` (`vault-session.ts:19`, `:33-46`); `clear()` wipes string + timer (`:59-66`); header states password is never persisted or sent to client and warns the design breaks under serverless (single long-lived process assumption) (`:2-13`). Session status endpoint leaks only `active/remainingMs/ttlMs` (`:89-99`).

### 11.2 Credential merge into AdapterContext

Final credentials passed to the adapter: `{ ...service.config, ...credentials }` — **vault plaintext overrides config** (`route.ts:420-425`). Merge direction matters: anything sensitive stored in plaintext config is shadowed when a vault credential exists.

### 11.3 Post-execution zeroization

String values blanked in place, then object reference dropped (`route.ts:432-438`). Best-effort JS hygiene — copies made during spread/JSON ops are NOT reachable for zeroization (acknowledged limitation of the pattern).

### 11.4 What this layer does NOT check (vs the dedicated decrypt endpoint)

- **Credential expiry ignored:** `FieldOpsCredential.expiresAt` (`types.ts:525`) is enforced in `/api/field-ops/vault/decrypt` (410 Gone on expiry, `vault/decrypt/route.ts:98-115`) but the execute route's decrypt block has NO expiry check (`route.ts:375-396`) — expired credentials still power real executions.
- **No brute-force limiter on this path:** `vaultRateLimiter` guards the session and decrypt endpoints (§12.2), NOT the execute route — wrong-password retries through `execute` are uncounted.

---

## 12. Supporting Guard Primitives (shared infrastructure)

### 12.1 Risk classification table — `field-ops-security.ts`

Header declares intent: "Risk classification, state machine enforcement, and approval logic based on OWASP Top 10 for Agentic Applications 2026" (`field-ops-security.ts:1-8`).

- `TASK_TYPE_RISK` base table (`:22-31`): `payment: high`, `ad-campaign: high`, `crypto-transfer: high` ("financial — always requires approval"), `custom: medium` ("always requires approval regardless"), `email-campaign|social-post|publish: medium`, `design: low`.
- `computeTaskRisk` (`:34-43`): combines task-type risk with the service's `riskLevel` — **service risk can elevate but never lower** (early returns at `:38-40`).
- `requiresApproval(taskType, serviceRiskLevel, autonomyLevel)` (`:46-68`):
  - HIGH risk → ALWAYS approval, even full-autonomy — inline-named the "**iron claw**" (`:53-55`).
  - `custom` type → always approved-required, cited as ASI05 unexpected-code-execution defense (`:57-58`).
  - Then autonomy switch (`:60-67`): `approve-all` → everything; `approve-high-risk` → medium+; `full-autonomy` → low-risk only.

### 12.2 Rate limiters

- `VaultRateLimiter` (`field-ops-security.ts:181-237`): sliding-window failure counter; constants `WINDOW_MS=5min`, `SOFT_LIMIT=3`, `HARD_LIMIT=10`, `LOCKOUT_MS=15min`, `DELAY_PER_ATTEMPT_MS=5000` (`:185-189`). Hard-limit breach arms `lockedUntil` lockout returned as `retryAfterMs` (`:210-213`); success resets everything (`:223-227`); singleton export `:236-237`.
  - **Dead config finding:** `SOFT_LIMIT` and `DELAY_PER_ATTEMPT_MS` are declared but never referenced anywhere in the class or codebase (grep across `src/`: only definition sites match) — the intended progressive-delay behavior was never implemented; protection jumps straight from "allowed" to hard lockout at 10 failures.
  - Consumers: vault unlock `POST /api/field-ops/vault/session` checks BEFORE body parse (`vault/session/route.ts:17-28`), records failure on bad password with `failureCount` echoed in the 403 (`:56-64`), records success + caches password on unlock (`:68-69`). Decrypt endpoint additionally writes `credential_access_denied` audit events for rate-limit, bad-password (with attempt counter), not-found, and expired denials (`vault/decrypt/route.ts:16-36`, `:54-72`, `:79-96`, `:99-115`) and treats GCM auth-tag failure as tampering = 403 "integrity check failed" (`:190-207`).
- `ExecutionRateLimiter`: §5 above.

### 12.3 Bypass detection + secret scanning helpers

- `isApprovalBypassAttempt(currentStatus, newStatus, approvalRequired)`: true iff `draft → approved && approvalRequired` (`field-ops-security.ts:104-121`); paired error text `getApprovalBypassError()` (`:123-126`).
- `isPayloadTooLarge` / `PAYLOAD_MAX_SIZE=10240` (`:277-287`) — exported helper duplicating Zod refines (§2); grep shows NO consumer outside its own file (the Zod `.refine`s at `validations.ts:402-405,422-425,444-447` carry the actual enforcement).
- `detectSecretsInConfig(config)` (`:289-323`): regex battery over string values >4 chars matching `^sk_` (Stripe), `^pk_live_`, `^ghp_|^gho_|^github_pat_` (GitHub), `^xoxb-|^xoxp-` (Slack), `^AKIA` (AWS), `^glpat-` (GitLab), `^bearer\s`/`^token\s` (`:292-304`). Consumer: service creation warns via `credential_access_denied`-typed audit event "possible API key in service config ... Use the Credential Vault instead" (`services/route.ts:78-90`) — **advisory only**, the service is still created.

### 12.4 Owner guard — `requireOwner(body)` 

`src/lib/owner-guard.ts` (64L). The human-vs-agent boundary for *privileged mutations*:

1. `actor` supplied AND ≠ `"me"` → immediate 403 "Agents are not permitted" (`owner-guard.ts:23-30`) — agent-role names like `researcher`/`developer` are structurally locked out.
2. Active vault session → authorized (`:32-33`).
3. Else `masterPassword` required → 401 if absent (`:35-45`); vault-uninitialized → 400 (`:47-53`); verify vs scrypt hash → invalid = 403 (`:55-61`).

Enforcement points: approve/reject transitions (`tasks/route.ts:175-179`), ALL batch actions including submit-for-approval (`batch/route.ts:39-41`), task creation INTO an active mission (`tasks/route.ts:76-82`), approval-config changes (`approval-config/route.ts:19-20`), safety-limits changes (`safety-limits/route.ts:36-37`). **Not used by:** the execute route itself (§11 substitutes the vault-password gate), wallet balance, financials, services/test.

### 12.5 Circuit breaker — `shouldTripCircuitBreaker(statuses, threshold=3)`

Counts consecutive `failed` statuses backward through the mission's task list, resets on any `completed`, trips at 3 (`field-ops-security.ts:158-176`, cited as ASI08 defense `:160`). Two enforcement points:

- **Pre-execution (task PUT):** transitioning any task to `executing` while its mission shows 3+ consecutive failures auto-pauses the mission AND rejects with 409 "Circuit breaker tripped: 3+ consecutive task failures" (`tasks/route.ts:222-255`).
- **Post-execution (execute route):** after a failed adapter run, mission tasks are re-read and evaluated; trip → mission paused + `circuit_breaker_tripped` audit event with failure count in details (`route.ts:507-532`).

Note the pre-check excludes the current task from the count (`tasks/route.ts:226`), the post-check includes everything (`route.ts:510`).

### 12.6 Sanitized result logging

`sanitizeForLog` (`execute/route.ts:58-76`): recursive redaction of 13 sensitive key names — `password, masterPassword, token, accessToken, refreshToken, apiKey, apiSecret, secret, privateKey, accessTokenSecret, clientSecret, encryptedData, authTag` (`:60-64`) — applied to adapter result data before both the field-ops activity log (`:499`, truncated to 1000 chars) and the regular-inbox notification bridge (`:542-548`, truncated to 300 chars).

---

## 13. Upstream Stack — How Tasks Become Trustworthy `approved` (creation & approval guards)

The execute route's core precondition (§3.2) is manufactured upstream with its own guard set:

### 13.1 Server-side approval computation at creation

`POST /api/field-ops/tasks` ignores any client claim about approval need: it resolves the service's `riskLevel` (defaulting to **medium** when service unknown — fail-safe default, `tasks/route.ts:85-91`) and computes `serverApprovalRequired = requiresApproval(type, riskLevel, approvalConfig.mode)` — comment: "never trust client input" (`:84-96`). The persisted task stores THIS value, overwriting the schema default `approvalRequired: true` (`validations.ts:401`) with computed truth (`tasks/route.ts:110`).

Config source: `getApprovalConfig()` reads `field-ops/approval-config.json`, corrupt/missing file falls back to **`{mode: "approve-all", overrides: {}}`** (`data.ts:671-678`) — most restrictive default mode. Type: `ApprovalConfig {mode: AutonomyLevel, overrides: Record<string, AutonomyLevel>}` (`types.ts:576-579`); enum `"approve-all" | "approve-high-risk" | "full-autonomy"` (`types.ts:418`). Per-mission `autonomyLevel` also exists on `FieldMission` (`types.ts:431`) but the tasks-route computation uses the GLOBAL config mode only — the per-mission field and the `overrides` map are not consulted anywhere in the enforcement path (grep: `overrides` referenced only in approval-config GET/PUT merging).

Admin surface: `PUT /api/field-ops/approval-config` owner-gated (`approval-config/route.ts:19-20`), partial merge preserving existing overrides (`:22-37`), emits `autonomy_changed` audit event on mode change (`:42-51`).

### 13.2 Transition legality + bypass detection on update

Every `PUT` status change passes three gates in order (`tasks/route.ts:181-256`):

1. `isValidTransition` — illegal attempts are logged as security events (`field_task_failed` type with previousStatus/attemptedStatus metadata, `:187-201`) then rejected 400 with the valid-transition list.
2. `isApprovalBypassAttempt` — draft→approved while `approvalRequired` → security event tagged `attemptedBypass: "draft→approved"` (`:204-220`), rejection **403** (stronger than the transition 400).
3. Circuit-breaker pre-check for `→ executing` (§12.5, `:222-255`).

Approve/reject additionally demand `requireOwner` BEFORE any gate (`:175-179`). Approval attribution recorded: `approvedBy`/`rejectedBy` set to the (unauthenticated!) actor string (`:290-291`).

### 13.3 Batch path

All batch actions owner-gated up front (`batch/route.ts:39-41`); per-task transition validation inside one atomic mutexed mutation, failures collected per-id without aborting the batch (`:54-92`). **Gap:** batch does NOT re-run bypass detection or circuit breaker — but since all three target statuses come from `pending-approval`/terminal states, draft→approved remains unreachable through it (transition table forbids `draft → approved`... actually the table ALLOWS `draft: ["pending-approval", "approved"]`, `field-ops-security.ts:74` — so batch `approve` on a draft task WOULD pass `isValidTransition` and skip `isApprovalBypassAttempt`, executing the exact bypass the single-task PUT blocks. Owner-gating is the only remaining defense on that path.)

---

## 14. Observed Weaknesses / Failure Modes Register (for FA-T2 porting)

| # | Finding | Evidence |
|---|---|---|
| 1 | **Execute route has no owner/agent check.** Any caller (any `actor`, incl. agents) can trigger an approved task; only credential decryption requires the master password. Services WITHOUT `credentialId` (authType none/api-key-in-config) execute with zero authentication beyond middleware. | `route.ts:101-208` contain no requireOwner; contrast `owner-guard.ts:20-63` usage list |
| 2 | **Creation-path approval hole.** `fieldTaskCreateSchema.status` accepts ANY valid status incl. `approved` (default `draft`) (`validations.ts:400`); POST persists it verbatim (`tasks/route.ts:109`). A task can be BORN approved, skipping pending-approval entirely; `isApprovalBypassAttempt` fires only on PUT transitions (`field-ops-security.ts:111-121`). Mitigated only by active-mission owner requirement (`tasks/route.ts:76-82`) which doesn't apply to inactive missions. |
| 3 | **Batch approve bypasses bypass-detection** (draft→approved allowed by transition table `field-ops-security.ts:74`, batch lacks the `isApprovalBypassAttempt` gate). | §13.3 |
| 4 | **Session-cache satisfies password gate.** Once vault unlocked, ANY execute request for 30 min uses the cached password (`route.ts:335`) — combined with #1, one unlock + open API = automated spending until TTL/budgets intervene. |
| 5 | **Expired credentials still execute** (expiry checked only in standalone decrypt endpoint). | §11.4 |
| 6 | **Unlimited wrong-password retries via execute route** (no `vaultRateLimiter` there); scrypt cost is the only throttle (~100ms/attempt). | §11.4, `vault-crypto.ts:30` |
| 7 | **Spend estimation is heuristic** ($2000/ETH hardcoded; non-financial high-risk ops with amount treated as USD; amountless operations = $0 = unchecked). | `route.ts:80-97` |
| 8 | **In-memory guards evaporate on restart**: both rate limiters, vault session, and staleness baseline reset; multi-process deployment multiplies budgets. | `field-ops-security.ts:236-237,272-273`; `vault-session.ts:8-11` |
| 9 | **Dead safety config**: `SOFT_LIMIT`/`DELAY_PER_ATTEMPT_MS` unused; `approvedRecipients` at limits level unwired; `ApprovalConfig.overrides` + per-mission `autonomyLevel` unenforced. | §12.2, §6.4, §13.1 |
| 10 | **Manual fallback executes with zero technical guards** for the ~61/66 catalog services lacking adapters. | §7, `mc-adapters-linelevel.md` §4 |
| 11 | **Ad-hoc adapter invocation outside the stack**: `/wallet` synthesizes an approved crypto-transfer task and calls `adapter.execute` directly — bypassing approval FSM, rate limit, spend ladder, circuit breaker (only vault gating retained). | `mc-adapters-linelevel.md` §3.5, `wallet/route.ts:115-142` |
| 12 | **Attribution spoofable everywhere**: `actor`, `approvedBy`, `rejectedBy` are caller-supplied strings; the audit trail records them uncritically. | `route.ts:106-107`; `tasks/route.ts:260,290-291` |

---

## 15. FA-T2 Porting Map — What Fabrica's IPC Boundary Should Adopt

Per digest recommendation FA-T2 ("one guard stack at the boundary, not per-feature"; enforcement point `register-core-handlers.ts:109-234` — `analysis/round4-findings-digest.md` §3a):

**Port as-is (proven patterns):**
1. **Server-side risk table + iron claw** — `TASK_TYPE_RISK`/`computeTaskRisk`/`requiresApproval` (`field-ops-security.ts:22-68`) generalize cleanly to destructive-agent-action taxonomy (file-delete, deploy, payment, git-push). Compute `approvalRequired` at action-CREATION time server-side; never trust renderer-supplied flags (#2 lesson).
2. **Bypass detection as named, audited predicate** — `isApprovalBypassAttempt` + dedicated audit event type (`field-ops-security.ts:104-126`; `tasks/route.ts:204-220`). In Fabrica terms: a guarded-transition helper invoked INSIDE every IPC handler that mutates action state, each violation emitting a structured security log entry.
3. **FSM-enforced status enums** — `VALID_TRANSITIONS` closed-world table (`field-ops-security.ts:73-90`) maps directly onto typed Rust enums in the FA IPC layer; reject-at-boundary beats validate-at-feature.
4. **Sliding-window rate limiters per resource** (`ExecutionRateLimiter` shape) — but implement check-and-record atomically (fixes §5 race) and persist counters in SQLite so restarts/multi-window don't reset budgets (#8 lesson).
5. **Spend ladder + pauseOnBreach fleet brake** — the 7-step `checkSpendLimits` order (`spend-tracker.ts:70-132`) plus global mission-pause (`route.ts:190-200`) is exactly the runaway-cost control FA-T7's ledger needs; replace JSON spendLog with SQL entries.
6. **Circuit breaker dual placement** — pre-dispatch 409 + post-failure auto-pause (`tasks/route.ts:222-255`; `route.ts:507-532`) belongs around every FA agent-run dispatch loop (pairs with FA-T4 health monitor).
7. **Decrypt-at-use, verify-always, zeroize-after, sanitized logging** (`route.ts:334-358,432-438,58-76`) — port wholesale into FA AI Vault handling (per `mc-adapters-linelevel.md` §5 row 5), keeping the always-verify-even-with-session rule.
8. **Owner guard as structural role check** (`owner-guard.ts:23-30`) — FA equivalent: IPC handlers tagged owner-only reject any agent-originated call before touching state.

**Fix-before-port (MC defects, do not replicate):** gaps #1, #2, #3, #5, #6, #9, #11 above. Concretely: (a) put the owner/agent check ON the execute-equivalent handler, not just the credential gate; (b) forbid creating actions already past their approval gate (whitelist creation statuses to `draft`/`pending-approval`); (c) apply identical transition+bypass gates to every mutation path incl. bulk; (d) enforce credential expiry at point of use; (e) wire rate limiting onto the password path; (f) delete or implement dead config; (g) allow ad-hoc capability probes (wallet-balance analog) ONLY in read-only/dry-run form.

**Architecture lesson:** MC's split (middleware auth → per-route Zod → hand-inlined guard sequence repeated with variations across routes) produced the inconsistencies in §14. FA-T2's stated goal — ONE guard stack at the IPC boundary composed of ordered, individually-testable layers returning typed rejections — is the correct generalization; MC's execute route is the reference sequence for that stack's layer ORDER (§16), not its implementation style.

---

## 16. Canonical Order-of-Evaluation Table (execute route)

| # | Guard | File:Line | Failure HTTP | Audit written? |
|---|---|---|---|---|
| 0a | CSRF origin match (state-changing methods) | middleware.ts:27-50 | 403 | no |
| 0b | Optional bearer token | middleware.ts:52-81 | 401 | no |
| 1 | Body JSON + Zod schema | validations.ts:538-571 | 400 | no |
| 2 | Task exists | route.ts:109-114 | 404 | no |
| 3a | Status == approved | route.ts:119-125 | 400 | no |
| 3b | FSM approved→executing legal | route.ts:127-132 (+security.ts:73-90) | 400 | no |
| 4 | Service exists (if declared) | route.ts:134-145 | 400 | no |
| 5 | Service connected | route.ts:147-157 | 400 | no |
| 6 | Per-service rate limit (10/5min) | route.ts:159-169 (+security.ts:242-270) | 429 + Retry-After | no |
| 7 | Spend ladder ×7 + pauseOnBreach | route.ts:171-208 (+spend-tracker.ts:82-132) | 403 | YES (field_task_failed) |
| 8 | Adapter registered else manual fallback | route.ts:210-248 | 200 (mode:manual) | YES (field_task_executing) |
| 9 | Wallet signing-mode redirect | route.ts:250-259 | 400 | no |
| 10 | Adapter validatePayload | route.ts:261-271 | 400 | no |
| 11 | Dry-run short-circuit | route.ts:273-293 | 200 (unchanged task) | YES |
| 12 | Staleness re-validation (>3d) | route.ts:295-328 | 400 (staleness:true) | YES on pass |
| 13 | Vault password resolve+verify+AES-GCM decrypt | route.ts:330-397 | 401/400/403/500 | no |
| — | Transition to executing | route.ts:399-417 | — | YES |
| — | Adapter execute | route.ts:419-425 | — (result-based) | — |
| P1 | Record rate-limit slot | route.ts:427-430 | — | — |
| P2 | Zeroize credentials | route.ts:432-438 | — | — |
| P3 | Result persisted completed/failed | route.ts:440-460 | — | — |
| P4 | Spend log append + prune | route.ts:462-477 | — | — |
| P5 | lastUsed refresh (resets staleness clock) | route.ts:479-487 | — | — |
| P6 | Sanitized result audit | route.ts:489-505 | — | YES (redacted) |
| P7 | Circuit breaker post-failure | route.ts:507-532 | — (mission paused) | YES (circuit_breaker_tripped) |
| P8 | Inbox/activity notification bridge | route.ts:534-560 | — | YES (redacted, 300ch) |
| P9 | Dependency unblocking (field + regular tasks) | route.ts:562-629 | — | YES |

---

## Scan Coverage Statement

**Read in full, line-by-line (this session):** `src/middleware.ts` (86L, 100%); `src/lib/field-ops-security.ts` (323L, 100%); `src/lib/spend-tracker.ts` (176L, 100%); `src/lib/vault-crypto.ts` (211L, 100%); `src/lib/vault-session.ts` (99L, 100%); `src/lib/owner-guard.ts` (64L, 100%); `src/app/api/field-ops/execute/route.ts` (641L, 100%); `src/app/api/field-ops/tasks/route.ts` (402L, 100%); `src/app/api/field-ops/batch/route.ts` (147L, 100%); `src/app/api/field-ops/approval-config/route.ts` (54L, 100%); `src/app/api/field-ops/safety-limits/route.ts` (64L, 100%); `src/app/api/field-ops/vault/session/route.ts` (79L, 100%); `src/app/api/field-ops/vault/decrypt/route.ts` (208L, 100%); `src/lib/validations.ts` lines 385-571 (all field-ops schemas + validateBody); `src/lib/types.ts` lines 400-639 (all Field Ops types); `src/lib/data.ts` lines 655-714 (approval-config + safety-limits defaults/loaders). **Targeted greps (context read):** `detectSecretsInConfig` consumers (services/route.ts context ±8 lines); `SOFT_LIMIT`/`DELAY_PER_ATTEMPT_MS`/`isPayloadTooLarge` cross-codebase usage (definition-only confirmed); `overrides`/`autonomyLevel` enforcement-path usage; `MC_API_TOKEN` in `.env.example` + `next.config.ts`. **Skipped as out of scope (covered elsewhere or non-guard):** adapter internals (`mc-adapters-linelevel.md` §2 owns these); prepare/submit-signature/wallet/financials/services-test route bodies beyond what §3 of that report documents; emergency-stop route (adjacent kill-switch, separate subsystem); daemon-side guards (`scripts/daemon/security.ts` — binary whitelist domain, covered by digest FA-T1 sources); frontend components; `data.ts` general file-store internals beyond the cited defaults. **No source files modified** — scan was read-only throughout.

