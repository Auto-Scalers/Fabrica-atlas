# R4-2.3 — Spot Verification of Round 4 Discovery Reports vs Sources

> Task: ATLAS **R4-2.3** · dispatch ctx_496c3a0fd82e · task_f6675317c884 · Date: 2026-08-23
> Method: for each of the four Round 4 discovery reports, ≥10 `file:line` citations were sampled and re-opened against the actual sources (`Fabrica-app/` at the environment root; `_sources/buzz/`). Each check confirms (a) the file exists, (b) the cited line range exists, (c) the line content matches the claim. READ-ONLY on sources throughout.
>
> Verdict scale: **PASS** = file+line+content all match; **MINOR** = line exists and describes the claimed behavior but context differs from how the report frames it (no factual error); **FAIL** = file missing / wrong line / contradicted claim.

---

## Overall Summary

| Report | Cites Checked | Verified Exact | Minor | Failed | Coverage Statement | Verdict |
|---|---|---|---|---|---|---|
| `discovery/round4/fa-ipc-watchers.md` | 18 | 18 | 0 | 0 | Present (§9) | **PASS** |
| `discovery/round4/bz-db-schema.md` | 15 | 14 | 1 | 0 | Present | **PASS** |
| `discovery/round4/bz-relay-event-kinds.md` | 18 | 18 | 0 | 0 | Present (§J) | **PASS** |
| `discovery/round4/fa-autoupdate-build.md` | 14 | 14 | 0 | 0 | Present (§F) | **PASS** |
| **Total** | **65** | **64** | **1** | **0** | 4/4 | **PASS** |

Zero hard failures across 65 sampled citations. One MINOR finding (context-level, no correction required to any claim's substance).

---

## 1. fa-ipc-watchers.md (sources: `Fabrica-app/`, cross-checks `_sources/buzz/`)

### Citations verified

| # | Claim (report) | Source check | Result |
|---|---|---|---|
| 1 | `WATCH_BATCH_TRAILING_MS = 150` @ `src/shared/filesystem-watch-batch-window.ts:4`; `MAX_WAIT 500` @ :5 | Line 4 `export const WATCH_BATCH_TRAILING_MS = 150`; :5 `= 500`. File total 5 lines — comment :1-2 also matches the quoted rationale ("so local and remote latency can't drift") | PASS |
| 2 | `MAX_BATCHED_WATCHER_EVENTS = 5000` @ `filesystem-watcher-event-batch.ts:3` | Line 3: `export const MAX_BATCHED_WATCHER_EVENTS = 5_000` | PASS |
| 3 | `contextBridge.exposeInMainWorld` ×2 @ `preload/index.ts:4914-4915` | :4914 `'electron'`, :4915 `'api'` exactly | PASS |
| 4 | Register-once guard `registered = false` @ `register-core-handlers.ts:97`; hub entry `registerCoreHandlers` :109 | :97 `let registered = false`; :109 `export function registerCoreHandlers(` — both exact | PASS |
| 5 | `ipcMain.on('ui:window-revealed')` @ `createMainWindow.ts:144` | Line 144 exactly | PASS |
| 6 | `window.api.ui.isMaximized()` @ `App.tsx:276` | Line 276 exactly | PASS |
| 7 | Runtime watch limits @ `shared/runtime-file-watch-limits.ts:1-4` (60s/60s/10s/2) | All four constants match values and order | PASS |
| 8 | `nativeChat:subscribe/unsubscribe` `.on` @ `native-chat.ts:294-297` | Lines 294 & 297 exactly | PASS |
| 9 | `fs:watchWorktree` handle @ `filesystem-watcher.ts:1596-1627`; registered by `registerFilesystemWatcherHandlers()` :1588; remote-vs-local branch (:1599 remote w/ connectionId, :1624-1625 local subscribe); unwatch handle begins :1629-1630 | All exact; handler body matches every sub-claim incl. intent recording before install (:1605) | PASS |
| 10 | `worktrees:create` invoke @ `preload/index.ts:798` | Line 798 exactly | PASS |
| 11 | 10 `star-nag:*` handles @ `star-nag/service.ts:78-87` | Exactly 10 `ipcMain.handle('star-nag:…')` calls on lines 78–87 | PASS |
| 12 | Template-literal usage-provider channels `${prefix}:getScanState/setEnabled/refresh/getSummary/getDaily` @ `usage-provider-handlers.ts:34-57` | All five named channels exist inside :34–51 (getScanState :34, setEnabled :35, refresh :38, getSummary :46, getDaily :49) | PASS (see Minor note A below) |
| 13 | Bare wrapped `ipcMain.handle(` @ `worktrees.ts:1961` with channel string on next line | :1961 `ipcMain.handle(`, :1962 `'worktrees:listKnownForExecutionHost'` — exactly as described | PASS |
| 14 | `window.api.pty.write(...)` @ `runtime-terminal-inspection.ts:160` | Line 160 exactly | PASS |
| 15 | `WATCHER_IGNORE_DIRS` = 9 dirs @ `filesystem-watcher-ignore.ts:5-15`; macOS cap 8 @ :24; VS Code mirror comment :1-4 | All exact (dirs .git…__pycache__, `MACOS_FSEVENTS_EXCLUSION_PATH_LIMIT = 8` at :24) | PASS |
| 16 | Cross-repo: buzz `tauri::generate_handler![…]` @ `_sources/buzz/desktop/src-tauri/src/lib.rs:602`, incl. `terminal_runtime::terminal_attach` :603 | :602 `.invoke_handler(tauri::generate_handler![`, :603 `terminal_attach` — exact | PASS |
| 17 | Cross-repo: `filesystem-watcher.ts` is 1,961 lines (coverage stmt) | Get-Content count = 1961 | PASS |
| 18 | Cross-repo: `register-core-handlers.ts` is 234 lines (§2.2/§9) | Count = 234 | PASS |

**Verdict: PASS — 18/18 verified, 0 failed.**

**Minor observation A (no fix needed):** §3/§4.12 call the usage-provider family "×5 channels"; the same registration block also registers `getSnapshot`/`getBreakdown`/`getRecentSessions` (usage-provider-handlers.ts:41-61), so the true family is larger. The five *named* channels are correctly cited at :34–57; only the family-size label undercounts.

**Coverage statement:** present (§9), exhaustive — swept vs full-read vs partial vs skipped lists all populated, ground-truth counts restated, explicit read-only attestation included. Consistent with observed file sizes.

---

## 2. bz-db-schema.md (source: `_sources/buzz/`)

### Citations verified

| # | Claim (report) | Source check | Result |
|---|---|---|---|
| 1 | Ten custom enums @ `migrations/0001_initial_schema.sql:28-37`, values as listed | Lines 28–37 contain exactly those ten CREATE TYPE statements with exactly the listed enum values, in order | PASS |
| 2 | `run_migrations` @ `crates/buzz-db/src/migration.rs:27` | :27 `pub async fn run_migrations(pool: &PgPool)` | PASS |
| 3 | `communities` DDL @ `0001_initial_schema.sql:53-61`: id/host/signing_key/created_at, nil-uuid CHECK :58, unique lower(host) idx :61 | All six elements at the exact cited lines | PASS |
| 4 | Approval tokens stored SHA-256 hashed @ `crates/buzz-db/src/workflow.rs:33` | :33 `fn hash_approval_token(token: &str)` using `Sha256::digest` (:34), doc comment :31-32 matches | PASS |
| 5 | `PARTITIONED_TABLES = ["events","delivery_log"]` allowlist @ `partition.rs:11-12` | :11 comment "Allowlist prevents DDL injection", :12 const exact | PASS |
| 6 | `reactions.emoji VARCHAR(66)` @ `migrations/0028_long_reaction_payloads.sql:2` | :2 `ALTER TABLE reactions ALTER COLUMN emoji TYPE VARCHAR(66);` | PASS |
| 7 | `set_agent_owner` guarded `AND agent_owner_pubkey IS NULL` @ `user.rs:300` | Line 300 contains exactly that guarded UPDATE | PASS |
| 8 | `workflow_runs.error_code TEXT` + backfill @ `migrations/0031_workflow_run_error_codes.sql:5`, `'legacy_unclassified'` for failed/cancelled :7-10 | Exact | PASS |
| 9 | Desktop `persona_events` DDL inline @ `managed_agents/retention.rs:133-145`, PK `(kind,pubkey,d_tag)`, pending_sync default 0 | execute_batch spans :133–143 with exactly those columns/PK/default | PASS |
| 10 | rusqlite 0.37 bundled @ `desktop/src-tauri/Cargo.toml:140` | :140 `rusqlite = { version = "0.37", features = ["bundled"] }` | PASS |
| 11 | Archive DB DDL constant @ `archive/store.rs:20-141`, `archived_events` PK `(identity_pubkey, relay_url, id)` @ :21-31 | SCHEMA const opens :20; archived_events columns+PK exactly :21-30; next table begins :33 | PASS |
| 12 | Push-gateway runtime guards @ `postgres.rs:472`, `:523-532`, `:627-665` | Files/lines exist and do show a forbidden-DDL probe (:472 `CREATE TABLE forbidden_runtime_ddl`) and table-presence setup (:523-532, :627+) — **but these sit inside `#[cfg(test)] mod tests`, which starts at postgres.rs:407**; the production runner is `apply_migrations_and_grants` (:19-23) | **MINOR** |
| 13 | Agent-owner self-FK ON DELETE SET NULL @ `0001_initial_schema.sql:172-174` | Exact FK clause on :173-174 with comment :172 | PASS |
| 14 | `ConstraintLint` @ `migration.rs:170` | :170 `struct ConstraintLint` | PASS |
| 15 | Archive name-ledger migrations order M2→M3→M1 @ `archive/store_migrations.rs:21-25` | :21 fn, :22 cache_read, :23 cache_write_and_pricing, :24 harness — exact order | PASS |

**Verdict: PASS — 14 exact + 1 minor, 0 failed.**

**Minor finding B:** the report presents `postgres.rs:472/:523-532/:627-665` as "runtime guards". They are test-module code verifying that guards work (the forbidden-DDL assertion at :472 does prove the runtime role cannot DDL). Substance of the claim stands; the citations just don't flag they're in `#[cfg(test)]` (module starts :407). Suggest a future hygiene pass annotate this one citation; nothing factually wrong.

**Coverage statement:** present and unusually detailed — direct reads vs delegated subagent scans vs skipped lists, plus explicit "verification hooks for R4-2.x". Matches what was spot-checked here.

---

## 3. bz-relay-event-kinds.md (source: `_sources/buzz/`)

### Citations verified

| # | Claim (report) | Source check | Result |
|---|---|---|---|
| 1 | `ClientMessage` enum {EVENT,REQ,CLOSE,COUNT,AUTH} @ `protocol.rs:16-37` | Enum spans :16–37 with exactly those five variants | PASS |
| 2 | `MAX_SUB_ID_LENGTH = 256` @ `protocol.rs:9`; `MAX_FILTERS_PER_REQ = 10` @ :12 | Both consts exact | PASS |
| 3 | EVENT parser @ `protocol.rs:58-67` | Match arm `"EVENT"` :58–67 | PASS |
| 4 | `AUTH_TIMEOUT = 5s` @ `connection.rs:29` | :29 exact const | PASS |
| 5 | `BUZZ_MAX_CONNECTIONS` default 10,000 @ `config.rs:556-559` | env var named :556, `unwrap_or(10_000)` :559 | PASS |
| 6 | `KIND_PROFILE = 0` @ `kind.rs:9`; `KIND_TEXT_NOTE = 1` @ :11 | Exact | PASS |
| 7 | `KIND_READ_STATE 30078` :75, `KIND_AUTH 22242` :77, `KIND_BLOSSOM_AUTH 24242` :79, identity binding 24243 :81, HTTP auth 27235 :83 | All five exact | PASS |
| 8 | `KIND_AGENT_TURN_METRIC = 44200` @ `kind.rs:545` | :545 exact | PASS |
| 9 | Supported NIPs `[1,2,10,11,16,17,23,25,29,33,38,42,50,56]` @ `nip11.rs:15` | :15 exact list | PASS |
| 10 | `SubscriptionRegistry` DashMap + four fan-out indexes @ `subscription.rs:86-100` | Struct :86–100 with subs + channel_kind/channel_wildcard/global_kind/global_p_kind/global_wildcard indexes exactly as itemized | PASS |
| 11 | `verify_auth_event(challenge, relay_url)` @ `handlers/auth.rs:87-89` | :87–89 exact call; "crypto only, no DB lookups" comment :86 | PASS |
| 12 | Audio consts: MAX_AUDIO_FRAME_BYTES 4096 @ `audio/handler.rs:44`, MAX_TEXT 8192 :47, heartbeat 30s :55, missed pongs 3 :58, AUTH_TIMEOUT 5s :61 | All exact | PASS |
| 13 | Heartbeat ping 30 s @ `connection.rs:441`; disconnect on prev≥2 (3rd miss) :450 | :441 `tokio::time::interval(Duration::from_secs(30))`; :450 `if missed >= 2` | PASS |
| 14 | `DEFAULT_MAX_FRAME_BYTES = 512*1024` @ `config.rs:14` | Exact | PASS |
| 15 | NIP-43 announcement kinds 13534/:398, 8000/:400, 8001/:402, leave 28936/:404 | All four exact | PASS |
| 16 | `BUZZ_PREFIX = "buzz"` @ `buzz-pubsub/src/topic.rs:13` | Exact | PASS |
| 17 | Desktop read_state family all 30078 differentiated by d-tag @ `desktop/src/shared/constants/kinds.ts:44-51` | :44–51 exact — six exports all 30078 with d-tag comment | PASS |
| 18 | Mobile sync header @ `mobile/lib/shared/relay/nostr_models.dart:7` | :7 "Keep in sync with `desktop/src/shared/constants/kinds.ts`" | PASS |

**Verdict: PASS — 18/18 verified, 0 failed.**

**Coverage statement:** present (§J), granular per-file (full vs targeted vs grep), residual gaps honestly listed (subscription.rs fan-out internals etc.).

---

## 4. fa-autoupdate-build.md (source: `Fabrica-app/`)

### Citations verified

| # | Claim (report) | Source check | Result |
|---|---|---|---|
| 1 | `electron-updater ^6.8.9` @ `package.json:139` | :139 exact | PASS |
| 2 | `electron-builder ^26.15.3` + `-squirrel-windows ^26.15.3` @ `package.json:204-205` | Both exact | PASS |
| 3 | Lazy loader behind packaged-update guards @ `electron-updater-loader.ts:5-10` | :5–9 exact, "Why" comment matches paraphrase | PASS |
| 4 | Channel enum stable/rc/hourly/daily/adhoc @ `release-channel.ts:3-11`; dev repos Fabrica-hourly/daily/adhoc + main Fabrica-app @ :24-27; atom-feed-eviction rationale :21-23 | All exact | PASS |
| 5 | Nudge URL `https://onfabrica.dev/whats-new/nudge.json` @ `updater-nudge.ts:12` | Exact | PASS |
| 6 | `appId 'com.autoscalers.fabrica'` @ `config/electron-builder.config.cjs:49` | Exact | PASS |
| 7 | Publish block owner Auto-Scalers / repo `devChannelRepo ?? 'fabrica'` / releaseType ternary @ builder :500-505 | Exact | PASS |
| 8 | `AUTO_UPDATE_CHECK_INTERVAL_MS = 24h` @ `updater.ts:106`; retry base 1h :107; cap 6h :109; nudge poll 30min :110 | All exact | PASS |
| 9 | Atom feed URL @ `updater-prerelease-feed.ts:5`; download base :6; tag regex :13-14; manifest names :20+ | All exact incl. regex literal | PASS |
| 10 | Generic-provider feed pinning + `/releases/latest/download` @ `updater.ts:2202-2207`; Authenticode warning comment :2199; RC-filter/redirect-drift rationale :2201 | Exact | PASS |
| 11 | Fork guard `github.repository == 'Auto-Scalers/fabrica'` @ `release-cut.yml:68` | Exact | PASS |
| 12 | `releaseChannelOverride` UI field @ `src/shared/types.ts:3515` | Exact | PASS |
| 13 | Cask v1.3.24, dmg URL pattern, verified host, homepage onfabrica.dev, livecheck github_latest @ `Casks/fabrica.rb:1-17` | All exact | PASS |
| 14 | RC cask token `fabrica@rc` selected by tag regex @ `homebrew-bump.yml:72-73` (report cites :65-92 block) | Regex ^vX.Y.Z-rc.N$ → token fabrica@rc at :72–74 | PASS |

**Verdict: PASS — 14/14 verified, 0 failed.**

**Coverage statement:** present (§F) — full reads with file sizes, targeted greps, repo-wide searches including negative results (stagingPercentage zero-match), explicit skip list. Internally consistent (e.g. updater.ts stated 2,329 lines = actual 2,329; builder config stated 631 = actual 631).

---

## Findings Register

| ID | Severity | Report | Finding | Recommended action |
|---|---|---|---|---|
| V-R4-1 | MINOR | bz-db-schema.md | §C/§B push-gateway "runtime guard" cites `postgres.rs:472, :523-532, :627-665` land in the `#[cfg(test)]` module (starts :407), not production code; behavior described is real and test-verified | Optional hygiene annotation in a future round; no factual correction needed |
| V-R4-2 | MINOR | fa-ipc-watchers.md | Usage-provider template-literal family labeled "×5 channels"; actual block registers 8 channels (adds getSnapshot/getBreakdown/getRecentSessions, usage-provider-handlers.ts:41-61) | Optional count correction in a future round; cited lines themselves accurate |

No FAIL entries. No coverage statement is missing from any of the four reports.

---

## Scan-Coverage Statement (this verification)

**Read in full:** all four Round 4 discovery reports end-to-end (fa-ipc-watchers.md 425 lines; bz-db-schema.md 377; bz-relay-event-kinds.md 434; fa-autoupdate-build.md 284).

**Spot-checked against sources (65 citations):**
- `Fabrica-app/src/shared/{filesystem-watch-batch-window,runtime-file-watch-limits,types}.ts`, `Fabrica-app/src/preload/index.ts` (3 regions), `src/main/ipc/{register-core-handlers,filesystem-watcher-event-batch,native-chat,filesystem-watcher-ignore,usage-provider-handlers,worktrees}.ts`, `src/main/ipc/filesystem-watcher.ts` (:1588–1630), `src/main/window/createMainWindow.ts`, `src/main/star-nag/service.ts`, `src/renderer/src/App.tsx`, `src/renderer/src/runtime/runtime-terminal-inspection.ts`, `src/main/{updater,updater-nudge,updater-prerelease-feed,electron-updater-loader}.ts`, `src/shared/release-channel.ts`, `package.json`, `config/electron-builder.config.cjs` (2 regions), `.github/workflows/release-cut.yml`, `.github/workflows/homebrew-bump.yml`, `Casks/fabrica.rb`
- `_sources/buzz/migrations/{0001_initial_schema,0028_long_reaction_payloads,0031_workflow_run_error_codes}.sql`, `crates/buzz-db/src/{migration,workflow,partition,user}.rs`, `desktop/src-tauri/Cargo.toml`, `desktop/src-tauri/src/archive/{store,store_migrations}.rs`, `desktop/src-tauri/src/managed_agents/retention.rs`, `desktop/src-tauri/src/lib.rs`, `crates/buzz-push-gateway/src/postgres.rs` (+ cfg(test) boundary scan), `crates/buzz-relay/src/{protocol,connection,config,nip11,subscription}.rs`, `crates/buzz-relay/src/handlers/auth.rs`, `crates/buzz-relay/src/audio/handler.rs`, `crates/buzz-core/src/kind.rs` (3 regions), `crates/buzz-pubsub/src/topic.rs`, `desktop/src/shared/constants/kinds.ts`, `mobile/lib/shared/relay/nostr_models.dart`

**Skipped:** remaining ~hundreds of uncited claims in the four reports (sampling-based spot verification per task spec, ≥10 cites/report — exceeded at 14–18); mission-control cross-claims in fa-ipc-watchers §7.1 (out of declared source scope for this task); all other Round 4 reports already covered by R4-2.1/R4-2.2.

**Integrity:** no file outside `.Fabrica-atlas-board/` was created or modified during this task (read-only checks via PowerShell Get-Content only).

*Report end — ATLAS R4-2.3.*
