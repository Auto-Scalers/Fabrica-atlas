# R4-2.5 — CLOSING Spot Verification: Round 4 Wave-3 Reports vs Sources

> Task ATLAS R4-2.5 · task_611e06c444ed · dispatch ctx_39636ffa7417
> Method: for each of the 4 wave-3 discovery reports, sample >=10 file:line citations and re-open the cited location in the actual source tree (`../Fabrica-app` / `Fabrica-atlas/_sources/buzz` / `_sources/mission-control`); confirm file exists AND line content matches the claim. Coverage statements checked for presence and specificity.
> READ-ONLY honored: no file outside `.Fabrica-atlas-board/` touched.

---

## Verdict Summary

| # | Report | Cites Sampled | Exact | Minor | Failed | Coverage Stmt | Verdict |
|---|--------|--------------|-------|-------|--------|---------------|---------|
| 1 | discovery/round4/fa-git-integration.md | 16 | 16 | 0 | 0 | Present (§11) | **PASS** |
| 2 | discovery/round4/fa-settings-config-datadirs.md | 18 | 17 | 1 | 0 | Present (§13) | **PASS** |
| 3 | discovery/round4/bz-search-pubsub.md | 14 | 14 | 0 | 0 | Present (§7) | **PASS** |
| 4 | discovery/round4/mc-notifications-alerting.md | 17 | 17 | 0 | 0 | Present (§8) | **PASS** |
| | **TOTALS** | **65** | **64** | **1** | **0** | 4/4 | **4/4 PASS** |

---

## Report 1 — fa-git-integration.md (Fabrica-app) — PASS

Sampled citations (all re-opened in `Fabrica-app/src/`):

| Cite | Claim | Result |
|---|---|---|
| main/git/runner.ts:305-306 | `DEFAULT_GIT_MAX_BUFFER = 10 * 1024 * 1024` + V8-overflow comment | EXACT |
| main/git/runner.ts:1268-1269 | `GIT_EXEC_SYNC_TIMEOUT_MS = 15_000`, "sync git blocks the main thread" | EXACT |
| ipc/worktree-remote.ts:2380 | `worktreeId = \`${repo.id}::${created.path}\`` | EXACT |
| main/git/status.ts:303-313 | `-c core.quotePath=false status --porcelain=v2 --branch --untracked-files=all` (+`--ignored=matching`) | EXACT |
| shared/git-capability-cache.ts:3, :5-10 | `GIT_CAPABILITY_RETRY_INTERVAL_MS = 30 * 60_000`; 5-capability union incl. `worktree-list-z` | EXACT |
| ipc/worktrees.ts:2186-2187 | `ipcMain.handle('worktrees:create', ...)` | EXACT |
| shared/git-output-locale.ts:1-16 | `UNTRANSLATED_GIT_OUTPUT_ENV { LANGUAGE:'en', LC_ALL:'en_US.UTF-8', LANG:'en_US.UTF-8' }` (issue #7808 rationale) | EXACT |
| shared/git-credential-prompt-env.ts:92 | `GIT_TERMINAL_PROMPT: '0'` inside `gitCredentialPromptGuardEnv` (starts :85) | EXACT |
| main/git/remote-url-probe.ts:19 | `REMOTE_URL_PROBE_TIMEOUT_MS = 30_000` | EXACT |
| shared/git-history-types.ts:23-24 (cite range :11-24) | `GIT_HISTORY_DEFAULT_LIMIT = 50`, `GIT_HISTORY_MAX_LIMIT = 200` | EXACT (within cited range) |
| package.json deps (:142/:149) | `"node-pty": "^1.1.0"`, `"ssh2": "^1.17.0"`; no git library present | EXACT |
| ipc/worktree-head-identity-reader.ts:5-7 | "Keep it spawn-free" replacing `git worktree list` fanout | EXACT (phrase on :7, inside cited range) |
| main/git/status.ts:71 | `MAX_GIT_SHOW_BYTES = 10 * 1024 * 1024` | EXACT |
| shared/git-status-limit.ts:6-28 | `DEFAULT_GIT_STATUS_LIMIT = 1_000` + cap semantics | EXACT |
| ipc/pty.ts:1714-1719 | credential-guard call w/ `isUnattended: opts.launchAgent !== undefined` + comment verbatim | EXACT |
| runtime/fabrica-runtime.ts:35388-35390 | `FETCH_FRESHNESS_MS = 30_000`, `REMOTE_FETCH_TIMEOUT_MS = 60_000` | EXACT |

Coverage statement §11: present — full-read list, targeted/partial list, skipped list (*.test.ts, github/gitlab bodies, mobile/, out/) all specific. Self-reported 12 spot-checks consistent with this pass's findings. **PASS.**

## Report 2 — fa-settings-config-datadirs.md (Fabrica-app) — PASS (1 minor)

| Cite | Claim | Result |
|---|---|---|
| package.json:2-3 | name `"fabrica"`, version `1.4.178-rc.2` | EXACT |
| src/main/startup/dev-instance-identity.ts:5-6 | `BASE_APP_NAME = 'Fabrica'`, AUMID `com.autoscalers.fabrica` | EXACT |
| src/cli/runtime/metadata.ts:53-69 | darwin `~/Library/Application Support/Fabrica` (:53-55), win32 `%APPDATA%\Fabrica` w/ APPDATA throw (:56-65), Linux XDG fallback (:66-69); FABRICA_USER_DATA_PATH wins first (:50-52) | EXACT (line splits match claim exactly) |
| src/main/index.ts:2120 | `app.setName(devInstanceIdentity.appName)` | EXACT |
| src/shared/constants.ts:49 | `SCHEMA_VERSION = 1` | EXACT |
| src/shared/constants.ts:64-66 | `FABRICA_BROWSER_PARTITION = 'persist:FABRICA-browser'` at :64 | EXACT |
| src/shared/constants.ts:168-172 | `getDefaultWorkspaceDir` -> `[home,'Fabrica','workspaces']` | EXACT |
| src/shared/constants.ts:288 | `terminalShortcutPolicy: 'FABRICA-first'` | EXACT |
| src/main/persistence.ts:343-352 | `_dataFile = join(userDataPath,'FABRICA-data.json')` snapshot + ordering rationale comments | EXACT |
| src/main/persistence.ts:535-537 | backup ring: issue #1158 comment :535, `BACKUP_COUNT = 5` :536, 1h min interval :537 | EXACT |
| src/main/persistence.ts:607-609 | `backupPath()` -> `${dataFile}.bak.${index}` | EXACT |
| src/main/persistence.ts:3989 | sentinel `` `FABRICA-secret-slot-${randomUUID()}` `` | EXACT |
| src/main/fabrica-profiles/profile-index-store.ts:148-158 | `copyLegacyStateToProfile` copying data file + browser meta + LEGACY_BACKUP_COUNT backups via copyIfPresent | EXACT |
| src/main/fabrica-profiles/profile-index-store.ts (via claim profile-index-store.ts:148-158 / ensureActiveFABRICAProfile) | legacy flat->profile migration | EXACT |
| src/main/startup/configure-process.ts:139-158 | E2E disposable-home boundary + setPath userData/home; refuse-if-not-boundary error | EXACT |
| src/main/startup/configure-process.ts:163-170 | `FABRICA_DEV_USER_DATA_PATH` override then plain-dev `<appData>/fabrica-dev` redirect (comment mentions CLI breakage) | EXACT |
| src/renderer/src/lib/settings-navigation-types.ts:43 | nav target `'FABRICA-account'` | EXACT |
| src/shared/fabrica-profiles.ts:4 (and §7's ":5") | `FABRICA_PROFILE_INDEX_SCHEMA_VERSION = 1`; default id `'local-default'` | **MINOR** — constants are at :3 and :4 (one line higher than cited); values correct |

Findings register: F2-W3-1 (MINOR, cosmetic): two adjacent constant refs in `src/shared/fabrica-profiles.ts` are off by one line (report says :4/:5; actual :3/:4). Values and semantics correct; no factual error. No fix required under one-file-one-writer hygiene; noted for any future revision of that report only.

Coverage statement §13: present — READ list with per-file line counts, ENUMERATED list (env vars, settings dir counts), SKIPPED list with justifications (node_modules/out/tests/mobile/relay). **PASS.**

## Report 3 — bz-search-pubsub.md (_sources/buzz) — PASS

| Cite | Claim | Result |
|---|---|---|
| crates/buzz-search/src/lib.rs:4-10, :12-13 | generated tsvector doc; indexing owned by buzz-db row inserts | EXACT |
| migrations/0001_initial_schema.sql:222-226 | `search_tsv TSVECTOR GENERATED ALWAYS AS (CASE WHEN kind IN (1059,30300,30622,44100,44101) THEN NULL::tsvector ELSE to_tsvector('simple',content) END) STORED` | EXACT (kind list verbatim) |
| migrations/0001_initial_schema.sql:278 | `CREATE INDEX idx_events_search_tsv ON events USING GIN (search_tsv);` | EXACT |
| crates/buzz-search/src/query.rs:43-55 | `ChannelScope` enum: Any/ChannelLessOnly/Channels/ChannelsOrChannelLess | EXACT |
| crates/buzz-search/src/query.rs:58-68 | `SearchMode`: FullText (`websearch_to_tsquery`), Prefix (trailing-token typeahead) | EXACT |
| crates/buzz-core/src/kind.rs:144-154 | storage writes NULL search_tsv for stored p-gated kinds; drift test named | EXACT (doc comment verbatim) |
| crates/buzz-core/src/kind.rs:156-158 | ephemeral kinds never stored, defense N/A | EXACT |
| crates/buzz-pubsub/src/topic.rs:13, :42-50 | `BUZZ_PREFIX="buzz"`; channels `buzz:{community}:channel:{id}` / `:global` | EXACT |
| crates/buzz-pubsub/src/presence.rs:15-16 | `PRESENCE_TTL_SECS = 180`, "3x the 60s heartbeat" comment | EXACT |
| crates/buzz-pubsub/src/rate_limiter.rs:24-31 | Lua script: INCR, EXPIRE only count==1, returns {count,ttl} | EXACT |
| crates/buzz-pubsub/src/nip98_replay.rs:43-48 | TTL clamp `[DEFAULT_REPLAY_TTL_SECS, MAX_REPLAY_TTL_SECS]`, Redis-incompatible-EX rationale | EXACT |
| crates/buzz-pubsub/src/subscriber.rs:14-17 | `BACKOFF_INITIAL_SECS=1`, `BACKOFF_MAX_SECS=30` | EXACT |
| crates/buzz-pubsub/src/cache_invalidation.rs:23-35 | suffix `cache-invalidate`; PSUBSCRIBE pattern `buzz:*:cache-invalidate` (:27) | EXACT |
| crates/buzz-relay/src/handlers/req.rs:482-486 | `SEARCH_PAGE_SIZE: u32 = 100` + full-pages rationale | EXACT |

Coverage statement §7: present and unusually precise — 4/5 buzz-search src files fully read, 11/11 buzz-pubsub files, migration regions, grep-only list, justified skips (migrations out of scope, buzz-db covered by R4-1.2). **PASS.**

## Report 4 — mc-notifications-alerting.md (_sources/mission-control/mission-control) — PASS

| Cite | Claim | Result |
|---|---|---|
| src/lib/types.ts:246-261 | EventType union incl. task_completed/task_failed/field_task_* | EXACT |
| src/lib/types.ts:279-293 | MessageType (5 values), MessageStatus (3 values), InboxMessage shape | EXACT |
| package.json:50 | `"sonner": "^2.0.7"` | EXACT |
| src/hooks/use-active-runs.ts:8 | `POLL_INTERVAL = 3000; // 3 seconds` | EXACT |
| use-active-runs.ts:14, :16 | `seenRunIds` ref; initial-fetch suppression ref | EXACT |
| use-active-runs.ts:41-45 | completion toast `Task completed by ${run.agentId}` | EXACT |
| use-active-runs.ts:47-54 | failure toast on `"failed"\|"timeout"` -> `showError(run.error ?? ...)` | EXACT |
| use-active-runs.ts:72-74 | silent catch on poll errors | EXACT |
| src/hooks/use-sidebar.ts:15 | `POLL_INTERVAL = 10_000` | EXACT |
| use-sidebar.ts:38-40 | silent catch, "sidebar badges are non-critical" | EXACT |
| src/app/api/sidebar/route.ts:15-19 | unreadInbox / pendingDecisions / pendingFieldApprovals computed | EXACT |
| sidebar/route.ts:23 | `Cache-Control: private, max-age=2, stale-while-revalidate=5` | EXACT |
| src/app/layout.tsx:21-27 | `<Toaster theme="system" position="bottom-right">` | EXACT |
| scripts/daemon/run-task.ts:150 | task marked done log | EXACT |
| run-task.ts:156-193 (literal :176-187) | completion inbox message from agentId to "me", `Completed:` subject, status unread | EXACT |
| run-task.ts:374, :485+ | `MAX_LOOP_ATTEMPTS = 3`; `checkLoopAndEscalate` defined :485 | EXACT |
| run-task.ts:386-397, :432-443 | mission rollup subject branching + system->"me" report push | EXACT |
| src/lib/field-ops-notify.ts:23 | recipient `task.assignedTo || "me"` | EXACT |
| src/app/inbox/page.tsx:380-396 | thread rendering, unread styling `border-primary/30 bg-primary/5`, mark-thread-read on expand | EXACT |

Coverage statement §8: present — inventory method, fully-read file list w/ line counts, negative-search register (a-d) including the discarded broad `push` grep, explicit residual (/decisions page body not read line-by-line flagged as minor). Negative claims ("no outbound transports") are consistent with the documented zero-hit searches and with all positive reads. **PASS.**

---

## Findings Register

| ID | Severity | Report | Finding | Evidence |
|---|---|---|---|---|
| F2W3-1 | MINOR (cosmetic line-drift) | fa-settings-config-datadirs.md | `FABRICA_PROFILE_INDEX_SCHEMA_VERSION`/`'local-default'` cited at shared/fabrica-profiles.ts:4/:5; actual :3/:4 | File read this pass; values correct |

No FAILED citations. No factual errors found. No coverage-statement gaps.

## Scan-Coverage Statement (this verification pass)

- Reports read: the 4 wave-3 reports in full (fa-git-integration.md incl. tail beyond line 338).
- Sources opened: 30 distinct source files across `../Fabrica-app/src/{main,shared,renderer,cli}`, `_sources/buzz/crates/{buzz-search,buzz-pubsub,buzz-core,buzz-relay}`, `_sources/buzz/migrations/0001_initial_schema.sql`, `_sources/mission-control/mission-control/{src,scripts}`; 65 file:line citations re-checked at their exact lines.
- Skipped: remaining un-sampled citations in each report (~135 additional cites not re-opened — spot-check scope per task definition); no source tree beyond the four reports' scopes enumerated.
- Read-only honored: nothing under `_sources/` or `../Fabrica-app/` modified; output written only here and to the board task file.

*Verification pass R4-2.5 complete — 2026-08-23.*
