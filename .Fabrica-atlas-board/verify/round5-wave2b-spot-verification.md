# R5-2.12 — Spot Verification: fa-multi-instance.md + fa-search-indexing.md vs Sources

**Task:** ATLAS R5-2.12 (Group 2, Round 5 wave 2b). Retry of dead ctx_d2c190b4dee7; this session ctx_913c0b1528dc / task_11f4312513c6.
**Method:** sampled file:line citations from each report and re-opened the cited source files under `Fabrica-app/` (READ-ONLY) to confirm quote/content accuracy and line-anchor placement. Coverage statements checked against actual file line counts.
**Date:** 2026-08-23
**Verifier:** R5-2.12 worker (hand-prompted orchestration retry)

---

## 1. fa-multi-instance.md (`discovery/round4/fa-multi-instance.md`)

**Citations sampled & verified: 28** (target ≥12)

| # | Report cite | Verified vs source | Verdict |
|---|---|---|---|
| 1 | single-instance-lock.ts:36-38 lock identity derived from userData | :35-38 docblock exact ("Electron derives the lock identity from the current `userData` path... AFTER `configureDevUserDataPath`") | PASS |
| 2 | single-instance-lock.ts:5-6 FAILURE_MESSAGE | exact, incl. "for this userData profile" | PASS |
| 3 | single-instance-lock.ts:7 / :8 env-var names | exact | PASS |
| 4 | single-instance-lock.ts:11-12 exit code 3 + "#11935 systemd" comment | exact | PASS |
| 5 | single-instance-lock.ts:14-20 shouldActivateDesktopForSecondInstance | exact (fn :18-20, rationale comment :14-17 incl. #12677) | PASS |
| 6 | single-instance-lock.ts:40-49 acquireSingleInstanceLock body | exact | PASS |
| 7 | single-instance-lock.ts:23-29 clobber / stale_bootstrap motivation | exact | PASS |
| 8 | single-instance-lock.ts:67-74 skip rule (`isDev && !isServeMode && E2E !== '1'`) | exact (:73) | PASS |
| 9 | single-instance-lock.ts:51-65 darwin+packaged bypass | exact | PASS |
| 10 | dev-instance-identity.ts:9-16 type + appName/safeStorage coupling comment | exact ("drives app.setName → ... `<appName> Safe Storage`") | PASS |
| 11 | dev-instance-identity.ts:55-67 packaged branch collapses to base identity | exact | PASS |
| 12 | dev-instance-identity.ts:5/:6 BASE_APP_NAME 'Fabrica' / AUMID 'com.autoscalers.fabrica' | exact | PASS |
| 13 | dev-instance-identity.ts:69-91 dev branch env fields | exact (:69 repoRoot, :70 branch, :71-73 worktree, :74 label, :75-76 dock title) | PASS |
| 14 | dev-instance-identity.ts:83 appName `'Fabrica Dev'` | exact | PASS |
| 15 | dev-instance-identity.ts:43-49 sha1(repoRoot)[:10] `.dev.<hash>` AUMID | exact | PASS |
| 16 | dev-instance-identity.ts:18-26 cleanEnvValue trim/cap; :7 MAX_LABEL_LENGTH=80 | exact | PASS |
| 17 | configure-process.ts:139-171 redirection tree; :170 `<appData>/fabrica-dev`; :163-168 override | exact (fn spans :139-171) | PASS |
| 18 | configure-process.ts:146/:149-151/:154-156 E2E home boundary + setPath | exact ("Refusing to start E2E outside its disposable home boundary" :150) | PASS |
| 19 | configure-process.ts:181-184 canonicalise FABRICA_USER_DATA_PATH | exact | PASS |
| 20 | cli/runtime/metadata.ts:46-52 env-first resolution + quoted comment | verbatim quote matches :46-49; code :50-52 | PASS |
| 21 | index.ts:631-634 devInstanceIdentity / devAgentHookEndpointNamespace | exact | PASS |
| 22 | index.ts:656-657 configureDevUserDataPath then configureFABRICAUserDataPathEnv | exact | PASS |
| 23 | index.ts:784 parallel `pnpm dev` second-launch-exits rationale | exact | PASS |
| 24 | index.ts:785-814 lock gate wiring; :797-814 exit-code path; :812-813 SIGSEGV #11935 comment | exact | PASS |
| 25 | index.ts:816-850 guarded side-effects inside `hasSingleInstanceLock`; :826-829 parse cache init; :830 profile paths; :836 crash reports | exact | PASS |
| 26 | index.ts:2929 dev WS pin 6769 (STA-1511 comment); :2940-2943 canonical-path "drops paired devices"; :2948-2956 preferPinnedWsPort #8535 | exact | PASS |
| 27 | runtime-rpc.ts:1786-1804 transport naming; pipe `\\.\pipe\FABRICA-<pid>-<suffix>` :1797; posix `o-<pid>-<suffix>.sock` :1802; suffix sanitise + 'rt' fallback :1792; win32-hardening comment :1796 | exact | PASS |
| 28 | runtime-rpc.ts:1747-1784 orphan sweep; regex :1748; ESRCH-only death probe :1772-1775; :1125-1128 win32 skip; :1093-1117 pairing/E2EE keyed on userDataPath; :1197-1201 WS degrade; :1209-1217 "invisible to the CLI" metadata-write failure closes transports | all exact | PASS |

Additional spot-checks that also PASSED (not counted above): runtime-metadata-ownership-watch.ts full-file claims (:17 poll 10s, :13-15 ping-pong limitation, :35-53 predicate, :47-51 own-pid-foreign-runtimeId, :81-83 unref, :90-101 unreadable→reclaimable, :103-114 EPERM-as-running, :5-15 macOS $TMPDIR purge) — file is exactly 114 lines as coverage statement claims; server.ts:2093-2100 endpoint-dir namespace + :2094 "dev builds share one userData path" comment, :2101 randomUUID token, :2116-2120 403 auth, :2122-2125 slowloris, :2190-2193 address().port, :2198 listen(0,'127.0.0.1'), :2202-2221 no-unlink stop + :2220 TOCTOU comment — all exact; index.ts:964 "hooks source this endpoint file at invocation time… dev namespaces it (worktrees share `FABRICA-dev`)" — verbatim; runtime-bootstrap.ts:17-23 RuntimeMetadata shape, :25-43 legacy singular `transport`, :45-48 FABRICA-runtime.json — all exact.

**Coverage statement check:** present (§10). Line counts independently confirmed where checkable: single-instance-lock.ts 82/82 ✓, dev-instance-identity.ts 92/92 ✓, runtime-bootstrap.ts 49/49 ✓, runtime-metadata-ownership-watch.ts 114/114 ✓, configure-process.ts 310 total ✓ (file shows 310 lines), cli/runtime/metadata.ts 70/70 ✓. Read-full vs targeted-region split is consistent with what was spot-checked. Skips (tests, fixtures, daemon internals beyond cites) are explicit.

### Verdict: **PASS** — 0 FAILED, 0 MINOR of 28+ sampled citations.

---

## 2. fa-search-indexing.md (`discovery/round4/fa-search-indexing.md`)

**Citations sampled & verified: 24** (target ≥12)

| # | Report cite | Verified vs source | Verdict |
|---|---|---|---|
| 1 | text-search.ts:55 MAX_MATCHES_PER_FILE=100 | exact | PASS |
| 2 | text-search.ts:56 DEFAULT_SEARCH_MAX_RESULTS=2000 | exact | PASS |
| 3 | text-search.ts:57 SEARCH_TIMEOUT_MS=15_000 | exact | PASS |
| 4 | text-search.ts:58-61 JSON structure limits (32k tokens / depth 16) | exact | PASS |
| 5 | text-search.ts:63-64 5 MB cap + "keep search cheaper than opening a file" | verbatim | PASS |
| 6 | text-search.ts:66-67 relay MAX_MESSAGE_SIZE line-clamp rationale | exact | PASS |
| 7 | text-search.ts:25-27 createAccumulator fresh Map | exact | PASS |
| 8 | text-search.ts:188-220 buildRgArgs baseline flags `--json --hidden --glob !.git --max-count --max-filesize` | exact (:189-198) | PASS |
| 9 | text-search.ts:237-239 early-stop at maxResults | exact | PASS |
| 10 | filesystem.ts:970-1109 fs:search handler chain (SSH forward :973-976, clamp :983-986, key `${sender.id}:${rootPath}` :987, WSL→git-grep :991-993, prior-child kill "large-repo freeze" :998-1002, wslAwareSpawn :1049-1053, ingest :1042-1047, isRipgrepUnavailableExit retry :1068-1091, 15 s timeout→truncated :1099-1106, listener detach :1025-1035) | all exact | PASS |
| 11 | rg-availability.ts:3-17 5 s timeout + deliberate no-cache rationale | exact (:11-15 both-directions footgun comment) | PASS |
| 12 | quick-open-listing-limits.ts:3 = 20,001 paths; :4-6 = 100k/32MB/64KB fail-closed budgets | exact; file is 142 lines as claimed | PASS |
| 13 | sync-database.ts:18-19 STATEMENT_CACHE_LIMIT=256; :59-65 DDL-driven cache invalidation | exact; file 111 lines as claimed | PASS |
| 14 | session-parse-cache-persistence.ts:1-5 #9210 "6.7 GB / 109 s cold scans" motivation | verbatim | PASS |
| 15 | session-parse-cache-persistence.ts:15-16 SCHEMA_VERSION=1 mismatch discarded whole | exact | PASS |
| 16 | session-parse-cache-persistence.ts:17-18 debounce 1500 ms | exact | PASS |
| 17 | session-parse-cache-persistence.ts:19-22 mode 0o700/0o600 + Windows ACL-inert note | exact | PASS |
| 18 | session-parse-cache-persistence.ts:34-37 disabled until composition-root init | exact | PASS |
| 19 | session-scanner.ts:45-46 concurrency 8 / multiplier 2 | exact | PASS |
| 20 | session-scanner.ts:48-56 unified-session docstring; :57 scanAiVaultSessions; :103 mtime DESC sort; :113 slice(limit*multiplier); :330 canStopParsingSessions | all exact; file 346 lines as claimed | PASS |
| 21 | filesystem-watcher.ts:48 watchedRoots map; send sites :292,:335,:926,:1083,:1320,:1444,:1531; :70-72 30 s teardown grace (WATCHER_TEARDOWN_GRACE_MS=30_000) | all exact (independently grepped) | PASS |
| 22 | runtime-file-client.ts:930-975 files.search/files.listAll with 15 s timeouts; :982 cancelRuntimeFileList | exact (:947, :968, :982) | PASS |
| 23 | codex-session-backfill-marker.ts:5-8 BACKFILL_MARKER_VERSION=3 + skip-existing comment | content exact; constant at :8, comment :6-7 (cite range covers it) | PASS |
| 24 | codex-title-index.ts:7-13 lazy thread naming + LRU cap 64; :76-97 `${size}:${mtimeMs}` signature; :120-132 cap enforcement | exact (:10, :12-13, :81, :126) | PASS |

### MINOR findings (3 — cosmetic line-anchor drift, content correct):

| # | Report cite | Actual location | Evidence |
|---|---|---|---|
| M-1 | §4.3: heal two-stat no-op comment cited "`:7-8`" | comment is at codex-session-index-heal-state.ts:11-12 | file read: lines 9-12 contain the ledger/marker comment block ending "...steady-state startups a two-stat no-op." |
| M-2 | §0.2/§4.3: `CODEX_SESSION_INDEX_HEAL_VERSION = 3` cited "`:12-15`" | constant is at codex-session-index-heal-state.ts:16 ("Bump to re-drive..." comment :14-15) | file read line 16 |
| M-3 | §3.5/§6: cached-session-list.ts TTL/"ONE module owns the cache" cited "`:13-15`" | comments + `AI_VAULT_CACHE_TTL_MS = 60_000` are at cached-session-list.ts:17-20; generation counter :40-44 (report's ":40-45" fine) | file read lines 17-20, 37-44 |

None of these change any claim's substance; all three are within ±5 lines of the cited anchor and every quoted string was found verbatim nearby.

**Coverage statement check:** present (§11) with explicit full-read list (line counts for 9 files match reality where checkable: text-search.ts 463 ✓, quick-open-listing-limits.ts 142 ✓, sync-database.ts 111 ✓, session-scanner.ts 346 ✓), targeted-section list, grep-level verification list, and skipped-with-reason list. Negative-result claim structure (§8 embeddings) is internally consistent with its stated grep method.

### Verdict: **PASS** — 24 PASS, 3 MINOR cosmetic drift, 0 FAILED.

---

## 3. Totals

| Report | Cites sampled | Exact PASS | MINOR | FAILED | Coverage stmt | Verdict |
|---|---|---|---|---|---|---|
| fa-multi-instance.md | 28 (+15 additional spot-checks) | 28 | 0 | 0 | present + accurate | **PASS** |
| fa-search-indexing.md | 24 | 24 | 3 | 0 | present + accurate | **PASS** |
| **Total** | **52 core samples** | **52** | **3** | **0** | 2/2 | **2× PASS** |

Both reports clear the ≥12-citation sampling bar with margin. The 3 MINOR findings are cosmetic line-anchor drifts in fa-search-indexing.md (M-1..M-3 above); no factual errors, no phantom citations, no fabricated quotes. No fixes required to pass; M-1..M-3 may be batched into a future hygiene sweep if desired.

## Scan Coverage Statement

Read fully: both target reports; Fabrica-app src/main/startup/single-instance-lock.ts (82/82); dev-instance-identity.ts (92/92); src/shared/runtime-bootstrap.ts (49/49); src/main/runtime/runtime-metadata-ownership-watch.ts (114/114); plus targeted regions of configure-process.ts, index.ts, runtime-rpc.ts, agent-hooks/server.ts, cli/runtime/metadata.ts, text-search.ts, filesystem.ts, rg-availability.ts, quick-open-listing-limits.ts, sync-database.ts, session-parse-cache-persistence.ts, cached-session-list.ts, session-scanner.ts, codex-session-index-heal-state.ts, codex-session-backfill-marker.ts, session-scanner-codex-title-index.ts, filesystem-watcher.ts (grep), runtime-file-client.ts (grep). Skipped: all test files, non-cited subsystems, `_sources/` repos (out of scope). No source file modified anywhere (read-only honored).

*Report ends.*
