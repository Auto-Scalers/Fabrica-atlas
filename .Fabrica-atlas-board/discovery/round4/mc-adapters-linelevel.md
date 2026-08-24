# R4-1.3 — Mission-Control Adapters Layer: Line-Level Scan

**Task:** R4-1.3 (Group 1, Round 4) · **Status:** complete · **Date:** 2026-08-23
**Scope:** `_sources/mission-control/mission-control/src/lib/adapters/` (8 files) + every wiring point in `src/app/api/field-ops/*` + UI callers + service catalog relationship.
**Convention:** all paths below relative to `_sources/mission-control/` unless prefixed otherwise.

---

## 1. Adapter Layer Architecture

The adapters layer is mission-control's outbound integration system for the **Field Ops** module: it executes real-world actions (posts, emails, crypto transfers) against external SaaS/blockchain APIs on behalf of approved "field tasks".

### 1.1 The contract — `src/lib/adapters/types.ts`

Every integration implements one interface. Key types:

| Type | Lines | Purpose |
|---|---|---|
| `AdapterContext` | `src/lib/adapters/types.ts:14-23` | Everything an adapter needs: `task` (FieldTask), `service` (FieldOpsService config), `credentials` (decrypted JSON from vault), `dryRun?` flag (:22 — "validate everything but skip the actual external API call") |
| `AdapterResult` | `src/lib/adapters/types.ts:28-39` | Standardized result: `success`, `data`, optional `error` / `apiResponseCode` / `executionMs` |
| `PayloadValidation` | `src/lib/adapters/types.ts:43-46` | `{ valid, errors[] }` fail-fast check before credential decryption (:110-114 docstring) |
| `HealthCheckResult` | `src/lib/adapters/types.ts:51-62` | Read-only connectivity test result: `ok`, `latencyMs`, `message`, `details`, `apiResponseCode`; contract says ≤5s and no side effects (:125-128) |
| `FinancialMetric` / `FinancialSnapshot` | `src/lib/adapters/types.ts:67-78` / `:81-98` | Optional per-service financial reporting (balance/revenue/spend/credit categories :75) |
| `ServiceAdapter` | `src/lib/adapters/types.ts:102-144` | The interface: readonly `serviceId` (:104), `name` (:106), `supportedOperations` (:108); required methods `validatePayload` (:114), `execute` (:121 — "Must not throw — return AdapterResult with success=false on error"), `healthCheck` (:129-132); optional `getFinancials` (:140-143) |

Design rules stated in the header comment (`types.ts:1-7`): adapters are **stateless**, receive everything via context, return standardized results.

### 1.2 The registry — `src/lib/adapters/registry.ts`

- Module-level `Map<string, ServiceAdapter>` store (`registry.ts:13`).
- `registerAdapter()` overwrites by `serviceId` (`registry.ts:18-20`).
- Lookup API: `getAdapter()` (:23-25), `hasAdapter()` (:28-30), `listAdapters()` (:33-35), `adapterCount()` (:38-40), `listFinancialAdapters()` filters adapters implementing `getFinancials` (:43-47).
- Registration is by **self-register on import**: each adapter file ends with `registerAdapter(<adapter>)` and consumers use side-effect imports (see §3). Header comment states this explicitly (`registry.ts:4-6`).

---

## 2. The Six Adapters

Only 6 of ~67 catalog services have native code adapters; everything else is catalog metadata pointing at MCP packages (see §4).

### 2.1 Ethereum / Base Wallet — `src/lib/adapters/ethereum-adapter.ts`

- **External system:** Ethereum mainnet, Base L2, Sepolia testnet via JSON-RPC (ethers.js v6, imported at `ethereum-adapter.ts:30`). Server-side only per header (:5).
- **serviceId:** `"ethereum-wallet"` (:500); ops `["read-balance", "send-eth", "send-usdc"]` (:502).
- **Inputs:**
  - Vault credentials `{ privateKey?, address? }` (format documented :7-11; parser `parseCredentials` :477-482; address derivation from key :484-495).
  - Service config: `network` ("ethereum"|"base"|"sepolia"), optional custom `rpcUrl` (:18-22, read at :538-539), plus safety config `approvedRecipients[]`, `maxAmountEth` (default 0.1), `maxAmountUsdc` (default 100) (:542-544).
  - Task payload: `{ operation, to, amount }`.
- **Outputs:** `read-balance` → ETH+USDC balances (:88-138, USDC contract addresses :37-41); sends → `txHash`, `from`, `to`, blockNumber, gasUsed, explorerUrl (explorer base map :53-57; result assembly :211-225 ETH, :317-331 USDC). Waits 1 confirmation (`tx.wait(1)` :208, :314).
- **Safety/error handling (richest in the layer):**
  - Pre-send balance+gas sufficiency check with detailed error data (:154-180 ETH; USDC balance check :262-277; zero-gas-balance check for USDC :280-291).
  - **Recipient whitelist** enforcement (:551-563) and **per-tx amount caps** (:565-574), both configurable via service.config.
  - `dryRun` returns simulated success after validation without broadcasting (:183-199, :294-310).
  - All errors returned as `AdapterResult.success=false`, never thrown (:130-137, :226-233, :332-339).
  - Address validation via `ethers.getAddress` throw-catch (:77-84).
- **healthCheck:** `provider.getBalance(address)` read-only (:635-674).
- **getFinancials:** ETH + USDC balance metrics, testnet annotation (:676-740).
- **Extra export:** `prepareTransaction()` (:356-468) builds *unsigned* tx params (`to`, `value`/ERC-20 `data` calldata, hex `chainId` from CHAIN_IDS map :344-348, optional gas estimate) for client-side MetaMask signing — used by the wallet-signing flow (§3.4).

### 2.2 Gmail — `src/lib/adapters/gmail-adapter.ts`

- **External system:** Gmail API v1 + Google OAuth2 token endpoint (constants :30-31). Zero external deps (header :5).
- **serviceId:** `"gmail"` (:190); ops `["send-email"]` (:192).
- **Credentials:** `{ clientId, clientSecret, refreshToken }` (:7-12, :35-39); resolution merges vault credentials over service.config (`resolveCredentials` :54-61).
- **Inputs:** payload `{ to, subject, body }`; validation requires all three, regex email check (:194-215, email regex :200).
- **Outputs:** OAuth refresh-token exchange → access token (`getAccessToken` :65-94), RFC-2822 message built and base64url-encoded (`buildRawEmail` :99-115), POST to `/users/me/messages/send` (:131-138); success data `{ messageId, threadId, to, subject }` (:156-167).
- **Error handling:** non-OK responses surface Gmail error message + `apiResponseCode` (:143-153); catch path tags failure phase as `oauth-token-exchange` vs `api-call` and reports which credential fields were present (without leaking values — clientId prefix only) (:168-184). Dry run validates credentials by exchanging a token but not sending (:238-258).
- **healthCheck:** token exchange then GET `/users/me/profile` with a hard 5s AbortController timeout (:263-326, fetch :286-290); AbortError mapped to friendly "timed out" message (:321-324).

### 2.3 Twitter / X — `src/lib/adapters/twitter-adapter.ts`

- **External system:** Twitter API v2 (`https://api.twitter.com/2`, :28) with **hand-rolled OAuth 1.0a HMAC-SHA1 signing** using only node `crypto` (:21, signing implementation `generateOAuthHeader` :48-98 incl. RFC 3986 percent-encode :40-45).
- **serviceId:** `"twitter"` (:230); ops `["post-tweet", "reply-tweet", "delete-tweet"]` (:232).
- **Credentials:** `{ apiKey, apiSecret, accessToken, accessTokenSecret }` (:6-13, parser :216-227); execute merges service.config over vault credentials (:338-339).
- **Inputs:** payload `{ text ≤280 chars (:254-255), replyToId?, tweetId?, operation }`; full validation :234-266.
- **Outputs:** POST `/tweets` (:108-126) → `{ tweetId, text, url (x.com/i/web/status/<id> :147), replyToId }`; DELETE `/tweets/:id` (:164-212) → `{ deleted }`.
- **Error handling:** non-OK surfaces `detail||title` from Twitter error JSON + status code (:131-139, :184-192); network catch returns failed AdapterResult (:154-161). Dry run simulates without API call (:357-378). healthCheck = GET `/users/me` with 5s timeout (:283-334).
- No financials implemented.

### 2.4 LinkedIn — `src/lib/adapters/linkedin-adapter.ts`

- **External system:** LinkedIn Community Management API v2 + OpenID Connect `/v2/userinfo` (:4-6, endpoints at :54 and :98).
- **serviceId:** `"linkedin"` (:153); ops `["create-post"]` (:155).
- **Credentials:** `{ accessToken }` OAuth2 bearer (:7-10, parser :32-38, resolve-with-config-fallback :41-48).
- **Inputs:** payload `{ text ≤3000 chars }` (validation :157-168, limit :163-165).
- **Outputs:** two-step execution — resolve person URN via userinfo (:53-72), then POST `/rest/posts` with URN author, PUBLIC visibility, MAIN_FEED distribution, version headers `LinkedIn-Version: 202401`, `X-Restli-Protocol-Version: 2.0.0` (:86-107). Post URN recovered from `x-restli-id` response header (:127).
- **Error handling:** 401 specifically flagged as "token expired — re-authenticate" (:60-62, mirrored in healthCheck :246-250); dry run validates via userinfo only (:187-207); healthCheck = userinfo with 5s timeout (:212-275).

### 2.5 Reddit — `src/lib/adapters/reddit-adapter.ts`

- **External system:** Reddit OAuth2 ("script app" password grant) + `oauth.reddit.com` API (endpoints :30-31).
- **serviceId:** `"reddit"` (:356); ops `["post-text", "post-link", "comment", "delete"]` (:358).
- **Credentials:** `{ clientId, clientSecret, username, password, userAgent }` (:8-15, parser :341-353). Note: execute reads creds **only** from vault credentials, not merged config (:510).
- **Statefulness exception:** module-level **token cache** with ≥60s-lifetime reuse (`tokenCache` :43-48, `acquireToken` :51-99) — the only adapter holding process state, technically deviating from the "stateless" contract in `types.ts:6`.
- **Inputs:** payloads per op; strict validation (:360-441): subreddit no `r/` prefix + charset (:376-380), title ≤300 (:388-390), URL parse for link posts (:406-411), `thingId` must start `t3_`/`t1_` (:419-421, :435-437).
- **Outputs:** submit → `{ postId, postName, url, subreddit, kind }` (:173-186); comment → `{ commentId, commentName, parentId }` (:258-268); delete → `{ deleted: true }` (:319-328).
- **Error handling:** Reddit's wrapped `json.errors` array checked even on HTTP 200 (:155-166, :239-250); OAuth failure surfaced with code+description (:75-82); **bot-disclosure footer** optionally appended to text content from `credentials.botDisclosure` (:527-537, applied :578, :594) — a platform-policy compliance feature. Dry run simulates all four ops (:540-570). healthCheck = GET `/api/v1/me` with karma details (:443-507).

### 2.6 Stripe — `src/lib/adapters/stripe-adapter.ts`

- **External system:** Stripe REST API v1 (`https://api.stripe.com/v1/balance`, :99).
- **serviceId:** `"stripe"` (:45); **ops: none** — `supportedOperations: []` (:47), `validatePayload` always invalid (:49-51), `execute` stub always fails (:53-59). Health-check-only by design (header :13).
- **Credentials:** `{ secretKey, mode: "test"|"live" }` (:8-11, parser :33-40 defaulting to test).
- **healthCheck:** enforces `sk_test_`/`sk_live_` key-prefix convention (:81-90); Basic auth with secret-as-username (:97); parses livemode + available balances into a summary (:122-142); 5s timeout (:93-95).
- Included in `listFinancialAdapters`? No — it does not implement `getFinancials`, so it never appears in financial aggregation (filter logic `registry.ts:43-47`).

---

## 3. Where Adapters Are Wired Into the App

Registration is lazy: each route that needs adapters uses side-effect imports. Full import matrix:

| Route file | Side-effect imports (registration) |
|---|---|
| `src/app/api/field-ops/execute/route.ts:51-56` | twitter, ethereum, reddit, linkedin, stripe, **gmail** (all six) |
| `src/app/api/field-ops/services/test/route.ts:24-28` | twitter, ethereum, reddit, linkedin, stripe |
| `src/app/api/field-ops/execute/prepare/route.ts:31-35` | twitter, ethereum, reddit, linkedin, stripe |
| `src/app/api/field-ops/financials/route.ts:19-21` | ethereum, linkedin, stripe |
| `src/app/api/field-ops/wallet/route.ts:18` | ethereum only |

### 3.1 Execution pipeline — POST `/api/field-ops/execute` (`execute/route.ts`)

The single orchestration point where an adapter actually runs. Lifecycle (header :6-14):

1. Zod body validation (`executeTaskSchema`, :103-104).
2. Load task; must exist (:110-114) and be status `approved` (:120-125) with valid transition (:127-132).
3. Resolve service by `task.serviceId` (:135-145); must be `connected` (:148-157).
4. Per-service rate limit — max 10 executions / 5 minutes via `executionRateLimiter` from `src/lib/field-ops-security.ts` (:160-169, recorded post-exec :428-430).
5. Spend-limit pre-check with rough USD heuristic (`estimateTransactionUsd`: send-eth ≈ $2000/ETH :87, usdc 1:1 :88) — breach can pause ALL active missions when `pauseOnBreach` set (:172-208).
6. **Adapter resolution:** `getAdapter(service.id)` else `getAdapter(service.catalogId)` (:211-219). If none registered → graceful **manual-execution fallback**: task moved to `executing` with explanatory activity event, no external call (:221-248).
7. Wallet-signing redirect: if `config.signingMode === "wallet"` and not dry-run → 400 pointing at `/api/field-ops/execute/prepare` (:251-259).
8. `adapter.validatePayload(task.payload)` gate (:262-271).
9. Dry-run short-circuit after validation (:274-293).
10. Staleness re-validation if service unused >3 days (:296-328).
11. Credential decryption: session password or request masterPassword (:335-341), password always verified against `masterKeyHash` even with active session (:345-358), AES decrypt via `src/lib/vault-crypto.ts` `decryptCredential` (:375-396), JSON-parse plaintext (:386-390).
12. Status → `executing` (:400-407); **adapter invocation** `resolvedAdapter.execute({ task, service, credentials: {...config, ...credentials}, dryRun })` (:420-425).
13. **Credential zeroization** — string fields blanked then object cleared (:432-438).
14. Result written to task (`completed`/`failed` + result.data/error/apiResponseCode) (:443-460); spend logged (:463-477); `lastUsed` updated (:480-487); sanitized activity event logged with sensitive-key redaction (`sanitizeForLog` :59-76, used :499) (:490-505).
15. **Circuit breaker:** consecutive failures in a mission pause it automatically via `shouldTripCircuitBreaker` (:508-532).
16. Notification bridge into regular inbox + activity log (:534-560, handlers from `src/lib/field-ops-notify.ts` imported :40-45).
17. Dependency unblocking: downstream field tasks (:563-585) AND regular tasks with inbox notification to assignee (:588-629).
18. Final JSON response with result/error/executionMs/apiResponseCode (:632-640).

### 3.2 Connection testing — POST `/api/field-ops/services/test` (`services/test/route.ts`)

- Resolves adapter same way (id then catalogId, :66-68); no adapter → soft-success "saved, no automated adapter" (:70-79).
- Requires stored `credentialId` (:82-90) and unlocked vault (session password or provided, :93-112).
- Decrypts credential (:127-153; decryption failure returned as HTTP 200 with `valid:false` :142-153).
- Calls `adapter.healthCheck(service, { ...service.config, ...credentials })` (:156-172) and logs pass/fail as activity events (:161, `logTest` :188-207, logging failure is non-fatal :204-206).

### 3.3 Financial overview — GET `/api/field-ops/financials` (`financials/route.ts`)

- Enumerates `listFinancialAdapters()` (:38-39), matches configured services by id or catalogId (:41-43).
- Lists unconfigured financial integrations from catalog (category `ecommerce-payments` set :26-28, diff :52-64).
- Vault-locked → placeholder snapshots with Lock icon (:76-89).
- Parallel fan-out with `Promise.allSettled`; per-service decrypt then `adapter.getFinancials(service, creds)` (:94-151); rejected promises become error snapshots (:154-163).

### 3.4 Wallet-signing flow — POST `/api/field-ops/execute/prepare` + `/submit-signature`

- `prepare/route.ts`: requires `signingMode === "wallet"` (:86-92), resolves adapter (:95-105), validates payload (:107-113), calls exported `prepareTransaction(operation, payload, network, rpcUrl)` from the ethereum adapter (:116-120), transitions task to `awaiting-signature` (:132-138), returns unsigned `txParams` (:152-156).
- Client side: `src/components/field-ops/sign-transaction-button.tsx:32` calls prepare, then MetaMask signs (per design comment `ethereum-adapter.ts:13-16`).
- `submit-signature/route.ts` completes the flow: validates `awaiting-signature` status and transitions to `completed` (`submit-signature/route.ts:81-90`) — note this route does NOT touch the adapter layer directly.

### 3.5 Wallet balance card — GET `/api/field-ops/wallet` (`wallet/route.ts`)

- Finds services where id/catalogId == `ethereum-wallet` (:25-27); locked-vault branch returns metadata only (:37-51).
- Decrypts credentials, then **synthesizes a minimal FieldTask** (`{ operation: "read-balance", type: "crypto-transfer", status: "approved" }`, :115-139) and calls `adapter.execute()` directly (:116-142) — an example of ad-hoc adapter invocation outside the approval pipeline.
- UI caller: `src/components/field-ops/wallet-balance-card.tsx:47`.

### 3.6 Type-level wiring

- `FinancialMetric`/`FinancialSnapshot` re-exported publicly from `src/lib/types.ts:675`.
- Frontend consumes those types in `src/components/field-ops/financial-overview-card.tsx:24` and fetches `/api/field-ops/financials` at `:76`.
- Tests: **no adapter unit/integration tests exist** — `__tests__/` contains only daemon/data/security/validations/agent-flow tests (file listing verified; no filename mentions adapters).

---

## 4. Relationship to the Service Catalog

`data/field-ops/service-catalog.json` (~102KB, 66 catalog entries enumerated during scan) defines the full intended integration surface across 16 categories (social-media, ecommerce-payments, cloud-hosting, ai-automation, etc.), each entry carrying `authType` and an `mcpPackage` name (e.g. `github → github-mcp`, `openai → openai-mcp`). Only these catalog ids have native TS adapters: `twitter`, `reddit`, `gmail`, `stripe` (health-only), `linkedin` (catalog id `linkedin`; adapter self-registers under it), `ethereum-wallet`. Everything else relies on the MCP-package indirection or the manual-execution fallback (`execute/route.ts:221-248`). This means the native adapter layer covers roughly 9% of the declared catalog; the architecture anticipates MCP servers as the scale-out mechanism rather than more hand-written adapters.

---

## 5. Relevance Flags for Fabrica (Desktop CLI-Agent-Management Platform)

| Element | Relevance | Why |
|---|---|---|
| `ServiceAdapter` interface (validate→execute→healthCheck→optional financials) | **HIGH** | Directly transplantable pattern for Fabrica's agent action-connectors: every outbound capability gets validate/dry-run/health-check semantics for free; matches the desktop platform's need for managed, auditable external actions by CLI agents. |
| Registry + self-registration (`registry.ts`) | **HIGH** | Trivially portable plugin mechanism; aligns with Fabrica-app's existing plugin architecture (see round3 plugins report). |
| Ethereum safety rails: recipient whitelist, per-tx caps, dry-run-before-send, gas/balance pre-checks | **HIGH** | Best-in-repo model for ANY irreversible agent action (file deletion, deployments, payments). Fabrica should generalize whitelist+caps+dry-run into its agent permissioning layer. |
| Execute-route guard stack (rate limit → spend cap → circuit breaker → staleness revalidation → manual fallback) | **HIGH** | Exactly the autonomy-guardrails a CLI-agent operations platform needs; the circuit-breaker auto-pause and manual-fallback patterns map 1:1 onto agent fleet management. |
| Vault credential flow (decrypt-at-use, merge config+vault, zeroize after, sanitized logging `execute/route.ts:59-76,432-438`) | **HIGH** | Security posture worth porting wholesale to Fabrica's AI Vault / agent credential handling. |
| healthCheck contract (≤5s, no side effects, latency reported) | **MEDIUM-HIGH** | Ideal basis for Fabrica's service/connection status UI across managed agents. |
| Gmail/Twitter/LinkedIn/Reddit adapters as code | **MEDIUM** | Domain-specific marketing integrations — useful as OAuth/signing reference templates (esp. hand-rolled OAuth1.0a `twitter-adapter.ts:48-98`) but not core to CLI-agent management. |
| Stripe adapter stub | **LOW** | Placeholder only; shows the intended extension seam (health-first, execute later). |
| Reddit token cache (`reddit-adapter.ts:43-48`) | **LOW-MEDIUM** | Only stateful adapter; a deliberate contract deviation worth avoiding or formalizing in Fabrica's adapter design. |
| Catalog-vs-adapters gap (66 catalog entries vs 6 adapters, MCP as filler) | **MEDIUM** | Architectural lesson: declare a wide integration catalog, implement deeply only where risk demands native code, defer to protocol-level (MCP) integration otherwise. |

---

## Scan Coverage Statement

**Read in full (line-by-line):** all 8 files in `src/lib/adapters/` (types.ts 144L, registry.ts 47L, ethereum-adapter.ts 747L, gmail-adapter.ts 333L, twitter-adapter.ts 408L, linkedin-adapter.ts 282L, reddit-adapter.ts 618L, stripe-adapter.ts 159L — 100% of the adapters directory). **Read in full (wiring):** `api/field-ops/execute/route.ts` (641L), `services/test/route.ts` (207L), `financials/route.ts` (176L), `wallet/route.ts` (180L), `execute/prepare/route.ts` (157L). **Read partially:** `execute/submit-signature/route.ts` (grep-verified lines 4-90 for adapter relevance — confirmed no direct adapter usage); `data/field-ops/service-catalog.json` (parsed programmatically, all 66 service entries enumerated; raw JSON not line-read). **Verified via targeted grep:** UI callers (`financial-overview-card.tsx`, `sign-transaction-button.tsx`, `wallet-balance-card.tsx`), `src/lib/types.ts:675` re-export, absence of adapter imports anywhere else in `src/`, absence of adapter tests in `__tests__/` (directory listing: daemon.test.ts, data.test.ts, helpers.ts, security.test.ts, validations.test.ts, integration/agent-flow.test.ts). **Skipped (out of scope, covered by other tasks):** daemon scripts, frontend components beyond callers listed, `lib/vault-crypto.ts`/`spend-tracker.ts`/`field-ops-security.ts` internals (cited only at their call sites), legacy-fabrica. **No source files modified** — scan was read-only.
