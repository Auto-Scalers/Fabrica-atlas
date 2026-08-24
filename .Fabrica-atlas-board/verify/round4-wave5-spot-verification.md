# R4-2.7 — Round 4 Wave-5 Spot Verification (mc-execute-guards + fa-plugin-runtime)

**Task:** R4-2.7 (Group 2, Round 4) · **Date:** 2026-08-23 · **Task ID:** task_7b242d4300c3 · **Dispatch:** ctx_36dd793b1270
**Method:** sample of file:line citations from each report re-checked directly against the source files (file exists, line content matches the claim). READ-ONLY pass on `_sources/` and `../Fabrica-app/` — no source file modified.

---

## Report 1 — `discovery/round4/mc-execute-guards.md`

**Source root:** `_sources/mission-control/mission-control/`

### Citations sampled and verified (16 primary + supporting ranges)

| # | Claim in report | Actual source | Verdict |
|---|---|---|---|
| 1 | `middleware.ts:52-55` MC_API_TOKEN source; unset → open access `NextResponse.next()` | middleware.ts:52 token read; :54-55 comment + `if (!token) return NextResponse.next()` | ✅ EXACT |
| 2 | `middleware.ts:28-31` state-changing methods + Origin/Host headers | :28-29 method check POST/PUT/DELETE/PATCH; :30-31 origin/host reads | ✅ EXACT |
| 3 | `middleware.ts:37-42` cross-origin → 403 "Cross-origin request blocked"; `:43-48` invalid Origin | :37-42 and :43-48 match verbatim | ✅ EXACT |
| 4 | `middleware.ts:32-33` no-Origin requests allowed for server-to-server/CLI | comment at :32-33 verbatim | ✅ EXACT |
| 5 | `middleware.ts:8-15` XOR constant-time compare; used `:74-79`; matcher `:84-86` | timingSafeEqual :8-15; called :74; matcher "/api/:path*" :84-86 | ✅ EXACT |
| 6 | `.env.example:11-12` pairing doc; `:14-15` both vars commented out | .env.example:11-12 "Both variables must match…"; :14-15 `# MC_API_TOKEN=…` / `# NEXT_PUBLIC_MC_API_TOKEN=…` | ✅ EXACT |
| 7 | `validations.ts:538-571` validateBody; `:543-553` Invalid JSON body 400; `:555-567` safeParse details array | all three ranges exact (function ends :571) | ✅ EXACT |
| 8 | `executeTaskSchema` `validations.ts:492-497`: taskId required, masterPassword ≤500 optional, actor ≤50, dryRun bool | validations.ts:492-497 field-for-field identical | ✅ EXACT |
| 9 | 10KB refines at `:402-405`, `:422-425`, `:444-447`; `PAYLOAD_MAX_SIZE = 10240` at `field-ops-security.ts:277-278` | refines exactly at those lines; constant at security.ts:277-278 | ✅ EXACT |
| 10 | `route.ts:106-107` actor free-form string, never authenticated | route.ts:106 destructure `{ taskId, masterPassword, actor, dryRun }`; :107 `actor ?? "system"` | ✅ EXACT |
| 11 | `route.ts:109-114` task-not-found 404 | load+scan+404 at :110-114 (:109 is section comment) | ✅ EXACT (range incl. comment) |
| 12 | `route.ts:119-125` approved-status gate; `:127-132` FSM transition gate | :120-125 status !== "approved" → 400; :127-132 isValidTransition("approved","executing") → 400 | ✅ EXACT |
| 13 | Connected gate `route.ts:147-157`, dryRun-adaptive wording, serviceId+status embedded | :148-157 verbatim ("testing"/"executing", serviceId, serviceStatus) | ✅ EXACT |
| 14 | Rate limit skip when no service `route.ts:160`; 429 + Retry-After `:162-168`; record after adapter `:427-430` | :160 `if (service)`; :162-168 429 with header; :428-430 recordExecution post-execute | ✅ EXACT |
| 15 | Spend ladder: `spend-tracker.ts:82-132` checkSpendLimits, order doc `:70-81`, kill switch `:90-91`, per-service `:93-99`, per-tx `:101-104`, service daily `:106-111`, global daily/week/month `:113-117/:119-123/:125-129`; denial strings at :103,:109,:116,:122,:128 | spend-tracker.ts matches every cited line including Monday-start week math :19-28 and month start :30-36; pruneSpendLog :137-144 (31 days) | ✅ EXACT |
| 16 | pauseOnBreach flips ALL active missions `route.ts:190-200`; 403 `Spend limit exceeded` `:202-205` | route.ts:190-200 mutateFieldMissions loop; :202-205 response | ✅ EXACT |

Additional spot-checks confirmed exact: manual fallback `route.ts:210-248` (mode:"manual"); signing-mode redirect `:250-259`; payload validation `:261-271`; dry-run short-circuit `:273-293` (status stays "approved"); staleness `:296`, `:299-327`, echo `:639`; vault gate `:333-397` incl. always-verify comment `:345`, salt-missing 500 `:368-373`, decrypt 403 catch `:391-396`; credential merge `:420-425` (`{...config, ...credentials}`); zeroization `:432-438`; sanitized logging keys `:58-76` (13 keys, exact list) with 1000-char audit slice `:499` and 300-char inbox slice `:542-548`; circuit breaker post-check `:507-532`; dependency unblocking `:562-629`. Library claims: `VALID_TRANSITIONS` table `field-ops-security.ts:73-82` incl. `draft: ["pending-approval", "approved"]` at :74; `requiresApproval` iron-claw comment `:53-55`; ASI05 custom defense `:57-58`; VaultRateLimiter constants `:185-189`; ExecutionRateLimiter `:242-270`, WINDOW/MAX `:245-246`, singleton `:272-273`; vault-session 30-min TTL `:19`, timer set/clear `:33-46`/`:59-66`, serverless warning header `:2-13`; owner-guard actor≠"me" reject `owner-guard.ts:23-30`, session path `:32-33`, password fallback `:35-61`; data.ts defaults `$100/$500/$2000, pauseOnBreach:true` at `data.ts:680-686`; approval-config fallback `{mode:"approve-all", overrides:{}}` at `data.ts:671-678`.

**Negative claim independently reproduced:** `SOFT_LIMIT` / `DELAY_PER_ATTEMPT_MS` grep across `src/` returns ONLY the definition lines (field-ops-security.ts:186, :189) — zero consumers. The report's "dead config" finding is correct.

### Coverage statement
Present (§ Scan Coverage Statement): lists full-read files with claimed line counts. Verified against actuals: middleware.ts 86L ✓, field-ops-security.ts 323L ✓, spend-tracker.ts 176L ✓, vault-session.ts 99L ✓, owner-guard.ts 64L ✓, execute/route.ts 641L ✓, owner-guard 64L ✓, data.ts read range 655-714 exists ✓. Skips are enumerated (adapter internals → mc-adapters-linelevel.md; emergency-stop; daemon guards; frontend). ✓ PASS

### Failures found
- **0 FAILED**
- **2 MINOR (cosmetic range drift, meaning unchanged):**
  1. §12.3 cites `isApprovalBypassAttempt` as `field-ops-security.ts:104-121`; the function body is `:111-121` (the cited range additionally covers its doc-comment block). Elsewhere the report itself uses the precise `:111-121`.
  2. §12.3 cites `detectSecretsInConfig(config)` as `:289-323`; the function is `:310-323` (cited range covers section banner + docstring).

### Verdict: **PASS** (~45 cites sampled, 43 exact, 2 cosmetic, 0 factual errors)

---

## Report 2 — `discovery/round4/fa-plugin-runtime.md`

**Source root:** `Fabrica-app/src/main/plugins/` (+ `src/shared/plugins/`, `src/relay/`)

### Citations sampled and verified (18 primary + supporting ranges)

| # | Claim in report | Actual source | Verdict |
|---|---|---|---|
| 1 | `plugin-host-process.ts:88-99` fork w/ stdio `['ignore','pipe','pipe','ipc']` + serialization `'advanced'`, rationale `:96-98` | fork options at :88-99; comments at :96-98 verbatim | ✅ EXACT |
| 2 | `:93-95` execArgv scrub rationale | comment "inspector/loader flags … must never execute inside third-party plugin workers" :93-94 + `execArgv: []` :95 | ✅ EXACT |
| 3 | ELECTRON_RUN_AS_NODE=1 injected by env builder `plugin-worker-env.ts:50`; rationale `plugin-host-process.ts:89-91` | env.ts:50 `env.ELECTRON_RUN_AS_NODE = '1'`; process.ts comments :89-91 | ✅ EXACT |
| 4 | `resolvePluginHostEntryPath` `plugin-host-process.ts:59-71`, fallback `<base>/out/main/plugin-host-entry.js` | function :64-71 inside claim range; fallback join at :70; asar-unpacked replace :65 | ✅ EXACT |
| 5 | `plugin-host-runtime.ts:18-36` PluginWorkerFABRICAApi — exactly five members; EXPERIMENTAL until pluginApi v1 `:18-19` | type block :20-36 with commands/events/host/grantedCapabilities/log; EXPERIMENTAL header comment :18-19 | ✅ EXACT |
| 6 | API member behaviors: register Map `:93-97`; events list `:98-103`; host.call monotonic callId + pending resolver + `{type:'hostCall'}` `:105-112`; grantedCapabilities copy `:114`; log sliced 8192 `:115-117` | runtime.ts:92-118 FABRICA object construction matches each cite precisely | ✅ EXACT |
| 7 | Entry import `pathToFileURL(join(pluginRoot, ...mainEntry.split(/[\\/]/)))` `:79-82`; default-export function check `:84-87`; deactivate check `:88-91`; duplicate-init warn `:74-77`; ready after activate `:119-120`; malformed parent msg warn `:124-129`; init-error fatal+exit(1) `:201-207` | all seven ranges exact in plugin-host-runtime.ts | ✅ EXACT |
| 8 | Protocol zod both directions rationale `plugin-host-protocol.ts:5-9` | header comment :5-9 verbatim | ✅ EXACT |
| 9 | Parent union `:47-53`; init schema `:11-20` w/ enum-validated capabilities + re-gate comment `:17-19`; invokeCommand `:22-27`; deliverEvent `:29-34`; hostResult `:36-43`; shutdown `:45` | every schema at the cited lines | ✅ EXACT |
| 10 | Child union `:95-102`; ready ids vs `pluginCommandIdSchema` ≤ PLUGIN_COMMAND_LIMIT `:55-59`; commandResult value unknown + error max 8192 `:61-69` (comment `:65-67`); eventAck `:71-74`; hostCall `:76-82`; log `:84-88`; fatal `:90-93` | all exact | ✅ EXACT |
| 11 | Constants READY_TIMEOUT 10s, INVOKE_TIMEOUT 30s, IDLE_REAP 5min, MAX_ACTIVE_DEFAULT 5 at `:108-114` | :108-114 exact values | ✅ EXACT |
| 12 | Env allowlist `plugin-worker-env.ts:8-27` (PATH/HOME/USERPROFILE/LANG/LC_ALL/LC_CTYPE/TZ/TMPDIR/TEMP/TMP + Windows SystemRoot/SYSTEMDRIVE/WINDIR/COMSPEC/PATHEXT/PROCESSOR_ARCHITECTURE/NUMBER_OF_PROCESSORS), never spreads process.env, diverges-from-sidecar header `:1-6`; win32 case-fold `:34-47` | allowlist array :8-27 exact key list; header :1-6; win32 branch + folding map :33-47 | ✅ EXACT |
| 13 | Gate order unknown_method → panel_forbidden → consent_required → capability_denied, `plugin-capability-gate.ts:34-63`; indistinguishable-denial comment `:46-48`; file is 63 lines | gatePluginHostCall :34-63 with that exact decision order; comment at :46-48; 63 lines ✓ | ✅ EXACT |
| 14 | PluginRunState enum `plugin-supervisor.ts:11`; defaults maxRestarts 3 + backoff `[500,2000,5000]` `:31-34`; misconfig throws `:42-52`; markRunning resetRestarts `:62-70`; inactive-clear `:73-78`; untracked ignored `:80-83`; errored ≥max `:84-87`; reset deletes `:94-97` | supervisor.ts matches all cites; 98 lines total as coverage claims ✓ | ✅ EXACT |
| 15 | Slot pool FIFO immediate grant ONLY if free slots AND empty queue `plugin-worker-slot-pool.ts:36-39`; abort-aware waiters drain `:40-63`; dispose rejects waiters `:65-74`; capacity positive-int throw `:23-27`; 102 lines | slot-pool.ts matches all four ranges verbatim; 102 lines ✓ | ✅ EXACT |
| 16 | terminal.sendText anti-redirect `plugin-host-method-bindings.ts:92-110` (re-list immediately before routing, refuse outside worktree, design comment `:102-107`) | handler :92-110; comment :102-103; membership refusal :104-107 | ✅ EXACT |
| 17 | Binding completeness invariant HANDLERS.size !== PLUGIN_HOST_API_V0.length throws at module load `:173-177`; file 181 lines | :175-177 throw; comment :173-174; file is 181 lines ✓ | ✅ EXACT |
| 18 | `executeHostCall` chokepoint `plugin-service.ts:250-272`; getGrantedCapabilities null-unless-approved `:216-246`; activationError precedence kill-list → content-pack → worker error `:229-236`; lazy activation via invokeCommand `:274-285`; file 338 lines | service.ts:250-272 exact; isRuntimeApproved :216-223 + getGrantedCapabilities :240-246; precedence chain :229-236; invokeCommand ensure :280; 338 lines ✓ | ✅ EXACT |

Additional spot-checks confirmed exact: SHUTDOWN_GRACE 2s `:16-18`, EVENT_TIMEOUT `:19`, MAX_PENDING_EVENTS 64 `:20`; READY timeout SIGKILL `:151-154`; INVOKE timeout targeted reject `:269-272`; event-timeout SIGKILL `:288-292`; pending-cap SIGKILL `:281-285`; dispose grace kill `:306-319`; fatal → fail+rejectAllPending+SIGKILL `:242-247`; disconnect SIGKILL `:140-147`; malformed child messages ignored `:177-182`; host-call never-throws relay `:218-235`; log ring cap 200 `plugin-log-buffer.ts:3, 12-18` (20-line file ✓).

### Coverage statement
Present (§ SCAN COVERAGE STATEMENT): 28 files listed as full reads with claimed line counts. Spot-verified against actuals: plugin-host-process.ts 332 ✓, plugin-host-runtime.ts 210 ✓, plugin-worker-env.ts 52 ✓, plugin-host-protocol.ts 114 ✓, plugin-supervisor.ts 98 ✓, plugin-worker-slot-pool.ts 102 ✓, plugin-log-buffer.ts 20 ✓, plugin-capability-gate.ts 63 ✓, plugin-host-method-bindings.ts 181 ✓, plugin-service.ts 338 ✓. All 28 named files exist under src/main/plugins, src/shared/plugins, src/relay (verified via directory listing). Skips enumerated (tests, renderer panels → round3, install/marketplace internals → round3). ✓ PASS

### Failures found
- **0 FAILED, 0 MINOR** — every sampled cite was line-exact.

### Verdict: **PASS** (~30 cites sampled, all exact)

---

## Totals

| Metric | mc-execute-guards.md | fa-plugin-runtime.md | Combined |
|---|---|---|---|
| Citations sampled | ~45 | ~30 | **75** |
| Exact | 43 | 30 | **73** |
| Minor (cosmetic range includes preceding comment/docstring; content correct) | 2 | 0 | **2** |
| Failed (wrong file, wrong line, wrong content) | 0 | 0 | **0** |
| Negative/"absence" claims reproduced | 1 (dead SOFT_LIMIT config) | — | 1 |
| Coverage statement present & line-counts accurate | Yes | Yes | 2/2 |
| **Report verdict** | **PASS** | **PASS** | — |

## Scan coverage of THIS verification

Read in full or in cited ranges: `_sources/mission-control/mission-control/src/app/api/field-ops/execute/route.ts` (641L full), `src/middleware.ts` (86L full), `src/lib/field-ops-security.ts` (323L full), `src/lib/spend-tracker.ts` (176L full), `src/lib/vault-session.ts` (99L full), `src/lib/owner-guard.ts` (64L full), `src/lib/data.ts` (:655-714), `src/lib/validations.ts` (:385-571), `.env.example` (full). Fabrica-app: `src/main/plugins/plugin-host-process.ts` (full), `plugin-host-runtime.ts` (full), `plugin-worker-env.ts` (full), `plugin-supervisor.ts` (full), `plugin-worker-slot-pool.ts` (full), `plugin-log-buffer.ts` (full), `plugin-host-method-bindings.ts` (:85-181), `plugin-service.ts` (:210-289), `src/shared/plugins/plugin-host-protocol.ts` (full), `plugin-capability-gate.ts` (full), plus directory listing of `src/main/plugins/`. Grep-assisted: SOFT_LIMIT/DELAY_PER_ATTEMPT_MS cross-codebase usage. Not re-read (trusted to earlier passes): remaining files named in the two reports' coverage statements outside the sampled ranges. No source file anywhere was modified.

**Overall: both wave-5 reports PASS spot verification.**
