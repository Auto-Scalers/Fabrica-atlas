> **PATH MIGRATION NOTICE (2026-08-21):** This project moved from the environment root into `Fabrica-atlas/`. All `_sources/...` paths in this document now resolve to `Fabrica-atlas/_sources/...`. `Fabrica-app/` remains at the environment root.
# Discovery Report â€” Fabrica-app: AI Vault (`src/main/ai-vault`) + Browser (`src/main/browser`)

Worker: task_d3bcae3d8a71 / dispatch ctx_9b70a1d1626d. Read-only discovery. All paths relative to `Fabrica-app/src/main/`.

---

## AREA 1 â€” AI VAULT (`src/main/ai-vault`, ~160 files)

### 1.1 Scanner service architecture (top-level flow)

**Entry point â€” `session-scanner.ts`**
- `scanAiVaultSessions(options)` (session-scanner.ts:57) is the single unified scan. Wrapped in a `withSpan('aiVault.scan')` observability trace so CPU cost of scanning is visible in trace files.
- Flow: clamp `limit` (default from shared `DEFAULT_AI_VAULT_SCAN_LIMIT`) â†’ load persisted parse cache (`ensureSessionParseCacheLoaded()`, must happen before any parse or cold scan gains nothing, #9210) â†’ `discoverAiVaultSessionSources()` (session-scanner-source-discovery.ts) â†’ build `SessionFileCandidate[]`, sorted by mtime DESC, Codex rollout hardlink aliases deduped (`dedupeCodexRolloutFileAliases`, codex-session-root-dedup.ts) â†’ parse in batches of `SESSION_PARSE_CONCURRENCY = 8`, candidates capped at `limit * 2` â†’ early-stop when the next candidate's mtime is older than the current visible cutoff (`canStopParsingSessions`) â†’ dedupe Codex sessions by sessionId â†’ sort by `sessionSortTime` DESC, slice to limit.
- **Scope sessions**: `scanInScopeSessions()` re-parses Claude files matching `scopePaths` (project paths) regardless of recency cap via `discoverInScopeClaudeFiles` (session-scanner-scope-discovery.ts); results merged + deduped by session id (`mergeSessions`).
- Antigravity sessions get workspace enrichment via `createAntigravityWorkspaceResolver` (session-scanner-antigravity-history.ts) reading `<cliRoot>/history.jsonl`.
- Every parsed session is stamped with an execution host id (`withSessionExecutionHost`): non-local ids rewrite `id` to `${executionHostId}:${agent}:${sessionId}:${filePath}`.
- Cancellation: `throwIfAiVaultScanCancelled(options.signal)` (ai-vault-scan-cancellation.ts) is checked at every phase boundary and inside batch loops; an aborted scan never caches or returns partial results as complete.

**Result-list cache â€” `cached-session-list.ts`**
- One module-level 60s TTL cache (`AI_VAULT_CACHE_TTL_MS`) shared by desktop IPC handler AND runtime RPC ("serve" mode), keyed by scopePaths; supports "depth" truncation (`aiVaultSessionDepthCovers`). A generation counter (`cacheGeneration`) disarms scans started before an invalidation so a delete can't be undone by an in-flight scan writing stale results. `invalidateAiVaultSessionListCache()` after deletes. Scan dedup/coalescing by `AiVaultScanCoordinator` (ai-vault-scan-coordinator.ts). WSL home dirs sourced via `getAiVaultWslHomeDirs()` (Windows only).

### 1.2 Per-agent sources & parsers

**Source table â€” `session-scanner-agent-sources.ts`** (`AI_VAULT_AGENT_SOURCES`)
Single table drives BOTH discovery and delete validation ("deletable" cannot drift from "discoverable"; `isDiscoverableSessionFile()` at :244 is the delete validator's accept rule). Each entry: lazy `rootDirs(options, wslHomeDirs)` (local host + one root per WSL distro), allowed extensions, optional file/directory predicates, optional `mergeRootDiscoveries`.

| Agent | Root (default) | Files matched | Parser |
|---|---|---|---|
| claude | `~/.claude/projects` (+ WSL homes) | `.jsonl`; prunes `subagents/` subdir | `parseClaudeSessionFile` (primary-parsers) |
| codex | `$CODEX_HOME/sessions` (default `~/.codex`) + WSL `~/.codex/sessions` + WSL Fabrica runtime home `~/.local/share/fabrica/codex-runtime-home/home/sessions` + extras | `.jsonl` | `parseCodexSessionFile` |
| gemini | `~/.gemini/tmp` | `.json`+`.jsonl` | `parseGeminiSessionFile` |
| copilot | `$COPILOT_HOME/session-state` (~/.copilot) | `.jsonl` | `parseCopilotSessionFile` |
| cursor | `~/.cursor/projects` | `.jsonl` under `agent-transcripts/` | `parseCursorSessionFile` |
| grok | `resolveGrokSessionsDir()` (~/.grok/sessions) | `summary.json` only | `parseGrokSessionFile` |
| devin | `$DEVIN_HOME/transcripts` (~/.local/share/devin/cli) | `.json` | `parseDevinSessionFile` |
| hermes | `~/.hermes/sessions` | `session_*.json` | `parseHermesSessionFile` |
| rovo | `~/.rovodev/sessions` | `metadata.json` | `parseRovoSessionFile` (graph parser) |
| pi | `$PI_CODING_AGENT_DIR` (~/.pi/agent/sessions) | `.jsonl` | `parseMessageGraphSessionFile('pi')` |
| omp | `$OMP_CODING_AGENT_DIR` (~/.omp/agent/sessions) | `.jsonl`; prunes artifact subdirs matching `OMP_SESSION_ARTIFACT_DIR_PATTERN` (#9330) | graph parser 'omp' |
| prime-agent | Prime env vars (~/.prime/agent/sessions shape) | `.jsonl` | graph parser 'prime-agent' |
| openclaw | `$OPENCLAW_STATE_DIR`(~/.openclaw)/agents + legacy `~/.clawdbot`/agents + WSL; roots merged | `.jsonl` under `sessions` | graph parser 'openclaw' |
| droid | `~/.factory/sessions` + `~/.factory/projects` | `.jsonl` | `parseDroidSessionFile` |
| kimi | `resolveKimiSessionsDir` (~/.kimi-code/sessions) | `wd_*/session_*/state.json` only (excludes wire.jsonl) | `parseKimiSessionFile` |
| opencode / antigravity | NOT in this table â€” discovered by shape-specific scanners | OpenCode: SQLite db + legacy JSON; antigravity: brain dirs under `~/.gemini/antigravity-cli/brain` with fixed child path `.system_generated/logs/transcript.jsonl` | see below |

**Parser router â€” `session-scanner-agent-parser.ts`** (`parseAgentSessionFile`): switch on `candidate.agent`; OpenCode synthetic `<dbPath>#<sessionId>` candidates route to SQLite worker parsing instead of the legacy JSON parser.

**Claude parser â€” `session-scanner-primary-parsers.ts`**
- Streaming line reader over JSONL. Resumable state machine: `consumeClaudeSessionLine` handles record types `custom-title`, `ai-title`, `agent-name`, `queue-operation` (net enqueue/dequeue count for recoverable-content badge), `last-prompt`, `user` (meta/injected turns gated via `isKnownHarnessInjectedUserTurnText` seed metaTitle vs firstUserTitle), `assistant` (model + usage tokens).
- Title precedence on finalize: custom title > generated ai-title > first user title > meta title.
- Counts sibling subagent transcripts (`countSubagentTranscripts`) only when the host owns the transcript disk (skipped for SSH-parsed content).
- Remote variant `parseClaudeSessionContent(file, content, ...)` parses fetched text with cancellation.

**Message-graph family â€” `session-scanner-graph-parsers.ts`**: one parameterized parser/resumable-state factory shared by openclaw/pi/omp/prime-agent (+rovo whole-doc).

**OpenCode SQLite â€” `session-scanner-opencode-sqlite*.ts`**
- OpenCode 1.17.x moved storage to single SQLite DB at `~/.local/share/opencode/opencode.db` (paths module honors XDG_DATA_HOME / OPENCODE_DB). Parsed read-only (`PRAGMA query_only = ON`, SyncDatabase) with schema-tolerant SELECTs (`columnExists`/`tableExists`).
- Preview: joins newest-100 messages Ã— parts, returns newest 5 preview messages with truncation flag (#8864 bounds giant tool outputs). Model extraction accepts both `{id}` and `{modelID}` shapes. Tokens/cost/message-count from session row columns.
- Heavy parsing runs in a **forked worker** (`session-scanner-opencode-sqlite-worker-{spawn,entry,protocol,client}.ts`) to keep native sqlite off the main/service process.
- Discovery (`-discovery.ts`/`-list.ts`) lists sessions and emits synthetic candidates.

**Codex specifics** â€” `session-scanner-codex-parser.ts` (+ `-message-records.ts`, `-title-index.ts`, `-cached-title.ts`, `codex-session-root-dedup.ts`): JSONL rollout parsing, dual-root dedup by sessionId and hardlink identity, cached title index refresh on reuse.

**Kimi index cache** (`session-scanner-kimi-index-cache.ts`), **grok user-text** (`session-scanner-grok-user-text.ts`), **devin ATIF**, **antigravity** (brain dirs + history.jsonl enrichment, `session-scanner-antigravity-{parser,history,paths,sources}.ts`), **gemini** dual format (`.json` whole-doc vs `.jsonl` resumable), **cursor/copilot/droid/hermes/devin/grok** individual parsers.

### 1.3 Incremental parse cache

**`session-scanner-parse-cache.ts`**
- In-memory LRU Map, `MAX_CACHE_ENTRIES = 4096` (sized past default 1000 cap + 2000 in-scope cap). Entry key = transcript path; validity = platform+mtimeMs(+sizeBytes).
- Unchanged â†’ reuse (`stats.reused++`); zero-turn sessions get their sibling-subagent count refreshed on reuse (mtime key can't see subagent dir growth); Codex entries get `refreshCachedCodexTitle`.
- **Incremental append parsing**: for append-only JSONL formats only â€” Claude, Codex, Cursor, Copilot, Droid, OpenClaw/Pi/OMP/Prime-Agent (message-graph), Gemini-JSONL. Whole-document agents (grok/rovo/devin/hermes/kimi/opencode/gemini-json) always full-parse on change (`resumableStateFactoryFor` returns null).
- Resume mechanics: stores last consumed byte offset just past the last `\n`-terminated line; resume validated by `endsWithNewlineAt(path, offset)` byte check; clone-before-consume so failed reads don't corrupt cached state; trailing unterminated line shown but not folded into resume state. Byte-accurate reader `consumeCompleteJsonlLines` (piece-list join avoids O(nÂ²) on huge records).
- This is what makes ~5s forced rescans not re-read gigabytes (STA-1278/STA-1417).

**Persistence â€” `session-parse-cache-persistence.ts`**
- Persists reusable subset (no live parser state; seeded entries have `resume:null` so post-restart changed files pay ONE full parse) to one JSON file in userData. Schema version 1 + appVersion gate; corrupt/foreign file discarded whole; debounced writes (1500ms), temp-write + atomic rename, 0700/0600 modes, orphan `.tmp` sweep at launch, `flushSessionParseCachePersist` before exit. Failures degrade silently to cold scan (#9210: previously 6.7 GB / 109 s cold scans).

### 1.4 Background scanner processes

**Dispatcher â€” `session-scanner-background.ts`**
- `shouldUseAiVaultServiceProcess()`: `FABRICA_AI_VAULT_SERVICE_PROCESS=1/0` override, else true when `NODE_ENV !== 'test'`. Routes scan/titles/subagents/firstPrompt between:
  - **Dedicated service process** (`session-scanner-service-spawn.ts` + `-entry.ts` + `-client.ts` + `-client-state.ts` + `-restart-policy.ts` + `-env.ts` + `-priority.ts` + `-protocol.ts` + `-entry-path.ts`):
    - Forked child (`fork(entryPath)`) with heap cap `--max-old-space-size=384`, hidden window on win32, OS priority lowered (`lowerAiVaultServicePriority`), `child.unref()`.
    - Protocol-versioned init handshake (`AI_VAULT_SERVICE_PROTOCOL_VERSION`); child replies `ready`.
    - Child (`session-scanner-service-entry.ts`): two serialized lanes â€” `interactive` (titles/subagents/firstPrompt) and `cache` (scan); pending queue bound 16; cancel messages map to AbortControllers; `invalidate` evicts parse-cache entries and clears title index (re-applied for overlapping reads, capped 4096 paths); shutdown aborts all, flushes parse-cache persistence, disconnects.
    - Client (`AiVaultScannerServiceClient`): per-lane active slots + queue, ready timeout, scan timeout vs interactive timeout, idle retirement of the child, restart policy with bounded respawn, invalidation generations with deadline, cancellation forwarded to child with a 2000 ms cancel deadline that faults the child if missed.
    - Env allowlist (`buildAiVaultServiceEnv`): NEVER spreads process.env â€” allowlists runtime vars (PATH/HOME/SYSTEMROOT/etc.) plus agent-root vars (CODEX_HOME, COPILOT_HOME, DEVIN_HOME, GROK_HOME, KIMI_CODE_HOME, OMP_CODING_AGENT_DIR, OPENCLAW_STATE_DIR, OPENCODE_DB, PI_CODING_AGENT_DIR, PRIME_AGENT_* , XDG_DATA_HOME); sets `ELECTRON_RUN_AS_NODE=1`. Separate minimal `buildRelayAiVaultServiceEnv` for relay sidecar.
  - **In-process worker fallback** (`session-scanner-worker-spawn.ts`, `-worker-entry.ts`, `-worker-protocol.ts`, `-worker-client.ts`) used in tests/no-service mode.

### 1.5 Title resolution

- IPC front door `session-title-resolver.ts` (`resolveLocalAiVaultSessionTitles`): normalizes requests (sessionId â‰¤512 chars, no unsafe chars; transcriptPath must be `.jsonl` and â‰¤32,768 chars), dedupes by agent+sessionId preferring entries WITH transcriptPath, caps at `AI_VAULT_SESSION_TITLE_REQUEST_MAX_COUNT`, then dispatches to background (service or worker).
- Service-side path resolution `session-title-request-paths.ts` maps renderer-supplied paths through `toHostReadableTranscriptPath` (native-chat) so WSL UNC paths become host-readable.
- `session-title-file-reader.ts` (`readAiVaultSessionTitlesFromFiles`): concurrency 4, per-request lstat then `parseAgentSessionFileCached` (reuses the scan parse cache); validates returned agent+sessionId match request; caches results in a title index (service keeps a `titleIndex` Map also fed from every successful scan's claude/codex titles).
- In-parser titles: Claude custom-title/ai-title/first-user/meta precedence; OpenCode uses DB title or user summary title/body; Codex has its own persisted title index (`session-scanner-codex-title-index.ts`, remote variant `remote-session-scanner-codex-index.ts`).

### 1.6 First-user-prompt capture

- Capture mode is an AsyncLocalStorage switch (`session-scanner-first-user-prompt-capture.ts`): `'none'` during list scans (keeps list payloads small across up to 500 sessions) vs `'full'` for on-demand copy/reuse. Normalization helpers + gating in `session-scanner-first-user-prompt.ts`.
- On-demand reader `session-first-user-prompt-read.ts` (`readAiVaultFirstUserPrompt`): rejects non-local hosts (remote rows fall back to preview text in UI); OpenCode SQLite re-parsed in-process under full capture (earliest user message with text parts, part limit 512); other agents re-parse the transcript through `parseAgentSessionFile` under `withFullFirstUserPromptCapture`. Errors resolve to `{prompt:null}` rather than rejecting IPC.
- Handler shim `session-first-user-prompt-handler.ts`; background routing via `readAiVaultFirstUserPromptInBackground`.

### 1.7 Deletion

- Validator `session-delete-target.ts` (`validateAiVaultSessionDeleteTarget`): pure, filesystem-free, never throws. Rejects: empty/invalid path, unsupported agent, non-local execution host, synthetic paths (opencode `db#id`), path outside resolved known roots, path failing the scanner's own discoverability rule (`isDiscoverableSessionFile`), degenerate stems.
- Removal planning (`sessionDeleteRemovals`):
  - Directory-shaped agents **rovo, grok**: trash the whole session directory (companions like chat_history.jsonl belong to it).
  - **claude**: ordered plan = session dir `<enc>/<uuid>/` (derived from `subagentTranscriptsDirFor`, taking the parent stops empty dirs) â†’ `session-env/<uuid>/` companion under the matched root â†’ the transcript file last. Deliberately does NOT touch `file-history/<uuid>/` (rewind buffer for user files).
  - Others: just the scanned file.
- Executor `session-delete.ts` (`deleteAiVaultSessionFile`): trashes companions first (partial failure leaves the row retryable); WSL UNC paths deleted inside the distro (`tryDeleteWslUncPath`, no Recycle Bin on 9P); lstat kind check; realpath anti-symlink-escape check comparing against realpath'd roots; Electron `shell.trashItem`; ENOENT treated as idempotent success; all outcomes are discriminated results (`rejected`/`failed`/`deleted`), never thrown.
- List-result cache invalidation after delete via `invalidateAiVaultSessionListCache()` plus background service cache invalidation (`invalidateAiVaultBackgroundCache(paths)`).

### 1.8 Resume preparation

- Runtime hosts: `runtime-session-scanner.ts` exposes `prepareRuntimeAiVaultSessionResume(userDataPath, environmentId, args)` â†’ RPC `aiVault.prepareSessionResume`; result zod-validated `{useRealCodexHome, substituteCodexHome?}` (repin-home handling so resumes land under the right account's home). Same module also proxies `aiVault.listSessions` and `aiVault.resolveSessionTitles` to paired runtime environments, restamping executionHostIds (`runtime:<id>`) and rebuilding session composite ids â€” "never trust returned host ids across the boundary".
- Local resume commands are built inside each parser's `finalizeSession(platform)` (per-agent resume command generation; Claude/Codex include cwd/model metadata via accumulator).

### 1.9 Remote / SSH scanning

- `ssh-session-list.ts` (`scanSshAiVaultSessions(targetId, args, budget)`): two-leg strategy per host â€”
  1. **Relay leg**: `requestActiveSshAiVaultSessionList` (relay round-trip, bounded by relayTimeoutMs; â‰¥10 s counts as a "meaningful attempt" whose timeout becomes a host issue rather than falling back).
  2. **Legacy crawl fallback**: `getSshFilesystemProvider(targetId)` + `getActiveSshAiVaultHostInfo` â†’ `scanRemoteAiVaultSessions` under the remaining budget (`remainingScanBudgetMs`); a timed-out crawl resolves null â†’ host-issue result; a recovered-empty fallback still surfaces the relay error so a broken relay isn't presented as an empty host. Scope-path truncation notice mirrors the relay leg.
- `remote-session-scanner.ts`: same shape as local scanner over a `RemoteSessionFilesystemProvider` (readFile/stat/walk), one concurrency ceiling wrapping all provider calls (`limitRemoteScanFilesystemConcurrency`, 8), mtime-sorted candidates, limitÃ—2 parse window with early stop, Codex alias dedup, remote scope backfill with its own 1000-candidate ceiling (scope membership only known after reading transcripts), issues recorded per file/host.
- `remote-session-scanner-sources.ts`: per-agent remote source table mirroring local roots under the remote home (codex Ã—2 incl. fabrica runtime home; claude with subagent partitioning; antigravity brain; gemini; copilot; cursor; hermes; devin; pi/omp/prime-agent/openclaw graph parsers; droid Ã—2). Content-based parsers (`*SessionContent`) since files arrive as strings; remote walks supply sibling subagent counts because parsers cannot readdir the remote disk.
- Support modules: `remote-session-scan-batching.ts` (batch mapper with cancellation), `remote-session-scan-concurrency.ts`, `remote-session-scan-issues.ts`, `remote-session-content-lines.ts` (cancellable line iterator), `remote-session-file-stat.ts`, `remote-session-scanner-types.ts`.
- Result validation at trust boundaries: `session-list-result-validation.ts` (`parseAiVaultListResult`) and `session-title-result-validation.ts`; restamping helpers in `session-list-results.ts`.
- Subagents: local listing `session-subagent-reader.ts` validates paths against the same WSL-aware Claude/OMP roots as discovery (`session-scanner-roots.ts`, `claudeProjectsRootDirs`/`ompSessionsRootDirs` reject arbitrary paths); Claude subagent transcripts under `<session>/subagents/` and OMP artifact-dir transcripts are pruned from top-level rows and surfaced on demand under parents (`session-scanner-claude-subagents.ts`, `session-scanner-omp-subagent-{listing,transcripts}.ts`, `session-scanner-subagent-transcripts.ts`).

---

## AREA 2 â€” BROWSER (`src/main/browser`, ~42 source files)

### 2.1 browser-manager.ts (guest registration / authorization / lifecycle)
Single privileged facade (2,244 lines, deliberately one file to keep the security boundary together).

- **Registration â€” `registerGuest({browserPageId, workspaceId, worktreeId, sessionProfileId, userAgentMode, webContentsId, rendererWebContentsId})`** (:1129): requires a tab id; requires guest type `'webview'`; requires prior attach-time policy install (`policyAttachedGuestIds`) so a compromised renderer can't point main at arbitrary WebContents; retires stale guest ids on renderer-process swap; populates reverse maps (`webContentsIdByTabId`, `tabIdByWebContentsId`, workspace/profile/UA/worktree maps); flushes queued load-failure/permission/popup/download events; wires context menu, grab shortcut, shortcut forwarding, mouse-wheel zoom.
- **Policy attach â€” `attachGuestPolicies(guest, inheritedOwnerContext?)`** (:627): installs per-guest listeners once: anti-detection injection (CDP `Page.addScriptToEvaluateOnNewDocument`, auto re-attach 500 ms after debugger detach), `setBackgroundThrottling(false)` (screenshots need frames), clicked-link routing (isolated-world scripts tagging real anchor clicks, main frame + iframes) so new-tab clicks open Fabrica tabs, popup handling via `setWindowOpenHandler` (clicked links â†’ Fabrica tab; OAuth children â†’ sandboxed SAFE_POPUP_WINDOW_OPTIONS hosted in an origin-bar popup window (`popup-origin-bar-window.ts`); external URLs â†’ `shell.openExternal` with Kagi token redaction; else blocked + origin-only event), navigation guard (allow http(s)+non-opaque blob:, block later `file:` navs and URLs failing the allowlist), pending-navigation tracking (getURL() lags until commit; UA writers resolve through `resolveTabNavigationUrl`), load-error bookkeeping with ERR_ABORTED(-3) stash/restore, certificate controller notifications, destroyed cleanup.
- **Authorization â€” `getAuthorizedGuest`** (:1743) and `getManagedBrowserGuestContext` (:1354): only policy-attached webview guests or offscreen guests qualify; popup descendants inherit owner context but never replace primary registration and lose authorization when the owner retires.
- **Lifecycle cleanup â€” `unregisterGuest`** (:1198) cancels grabs, runs all listener cleanups, cancels in-flight downloads, drops viewport-op chains; `unregisterAll` (:1292) tears down everything at shutdown; `cleanupGuestPolicyAttachment` (:1095) removes cert-controller state, pending events, downloads, and popup inheritance.
- Other responsibilities: downloads (`handleGuestWillDownload`, progress/start/finish events, destination reservations via `browser-download-destination.ts`), grab mode (element-grab overlay via `grab-guest-script.ts` `buildGuestOverlayScript`, selection screenshots, hover payload extraction, `BrowserGrabSessionController`), DevTools opening, viewport overrides (serialized per-tab CDP ops), annotation viewport bridge.

### 2.2 Permission policies
- `browser-session-permission-policy.ts`: deny-by-default with a small auto-grant set: `fullscreen`, `clipboard-read`, `clipboard-sanitized-write` (CDP agent-browser commands need them without gestures), `notifications`, `persistent-storage` (chatgpt.com), `pointerLock`.
- Wiring lives in `browser-session-registry.ts` `setupSessionPolicies(profile)` (:489) per partition: `setPermissionRequestHandler` defers `media` to OS TCC (`browser-media-access.ts`: macOS system checks/prompts; denial reported to UI), otherwise auto-grant check with denial notification; `setPermissionCheckHandler` consults media/WebAuthn/auto-grant; `setDisplayMediaRequestHandler` denies (video/audio undefined); `will-download` routed to BrowserManager. WebAuthn: `browser-webauthn-access.ts` allowlisting handlers installed/cleared per session.

### 2.3 Certificate trust controller
- `browser-certificate-trust-controller.ts`: intercepts `certificate-error` (`handleCertificateError` :53). Only offers an approval challenge when: managed guest context exists, https main frame, error normalizes to the one supported code, hostname is an eligible LOCAL host (`isEligibleLocalCertificateHost`), and the guard allows offering. Identity pinned by `{secureEndpoint, leafCertificateSha256, error}`; challenges TTL-bounded (`CERTIFICATE_CHALLENGE_TTL_MS`), bounded count (`MAX_PENDING_CERTIFICATE_CHALLENGES`), invalidated by navigation-sequence changes. `proceed(browserPageId, challengeId)` re-validates identity/navigation/expiry, grants via the request guard, reloads the URL. Fail-closed everywhere (callback(false) on any throw).
- `browser-certificate-request-guard.ts`: per-session guard deciding `shouldTrustCertificate` / `canOfferCertificate` / `grant`, with revocation on committed navigations and guest retirement; blocks first so the controller records a pending challenge mapped back to a page id via BrowserManager context resolution. Supporting: `browser-certificate-challenge.ts` (identity matching/TTL/bounds), `browser-certificate-identity.ts` (leaf SHA-256, supported error normalization).

### 2.4 Cookie import policy
- `browser-cookie-import.ts` (~60 KB): detects installed browsers (`detectInstalledBrowsers`), selects source profile, reads Chrome/Chromium-family cookie SQLite DBs (incl. Comet and Helium variants per tests), decrypts values, builds insert params, stages a snapshot DB (`chromium-cookie-snapshot.ts`, `chromium-cookie-path.ts` resolves modern/legacy Cookies paths), imports from file (`pickCookieFile`/`importCookiesFromFile`), error summarization.
- `browser-cookie-import-policy.ts`: domain validation (`normalizeCookieDomain`, `normalizeCookieImportDomain` with psl public-suffix awareness); Google source-bound cookie set (`SIDCC`, `__Secure-1PSIDCC`, `__Secure-3PSIDCC`, `__Secure-STRP`, `AEC` on google.com) excluded from replacement; two import modes `merge` | `replace-imported-domains` where `replaceCookiesForImportedDomains` computes exact/ancestor/descendant scopes, removes overlapping cookies with rollback-on-failure (`restoreImportedDomainCookies`).
- Replay timing: `browser-session-registry.ts applyPendingCookieImport` (:201) copies staged DBs over partition Cookies files (clearing WAL/SHM sidecars) BEFORE any `session.fromPartition` so CookieMonster reads staged cookies; per-partition pending map persisted atomically in `browser-session-meta.json` (write-temp-rename); retries failures, validates partitions against the derived allowlist.

### 2.5 Anti-detection / UA modes
- `anti-detection.ts`: pre-page-load script masking automation signals: `navigator.webdriver=false`, fake plugins array, `window.chrome` + `csi()`/`loadTimes()` stubs, Permissions.query returning 'prompt'/'granted' states for probed permissions, Notification.permission normalization, languages fallback. Injected both by BrowserManager (every managed guest) and by CdpWsProxy on attach.
- `browser-session-ua.ts`: `cleanElectronUserAgent` strips `Electron/x.y.z` and app-name tokens (Turnstile trip-wires); `setupClientHintsOverride` rewrites sec-ch-ua / sec-ch-ua-full-version-list headers to match the Chrome-shaped UA (Edge-aware brand), and installs the Google-auth Firefox switch (see below).
- UA modes (`BrowserSessionUserAgentMode` = 'clean' | 'native') tracked per session via WeakMap (`browser-session-user-agent-mode.ts`); 'native' opts out of ALL clean-UA machinery.
- `browser-google-auth-ua.ts`: Firefox UA presented ONLY on Google sign-in hosts (`isGoogleAuthUrl`) so Google issues self-refreshing device-bound cookies; header-level switch in `setupClientHintsOverride` + navigator-level switch per navigation in BrowserManager `applyGoogleAuthUserAgent` (:951) keeping the two layers consistent; sec-ch-ua stripped on auth hosts.
- `browser-viewport-user-agent.ts`: mobile emulation presets install a CDP `Emulation.setUserAgentOverride` which would otherwise outrank setUserAgent and disagree with the header UA on auth hosts; BrowserManager re-issues it per navigation against the in-flight target URL.

### 2.6 Agent-browser bridge (CDP WS proxy)
- `agent-browser-bridge.ts` (~2,770 lines): wraps the bundled `agent-browser-<platform>-<arch>` binary (resolved from resourcesPath â†’ node_modules â†’ PATH). One named session per tab (`FABRICA-tab-<pageId>`); command queue per session with global screenshot serialization; exec timeouts 90 s (above agent-browser internals) with consecutive-timeout kill; worktree-scoped active-tab targeting (text-mutating commands refuse ambiguous/global fallback); automation-visibility lease around commands (`acquireAutomationVisibility` makes hidden panes paintable); session lifecycle hardened against creation/destruction races (`pendingSessionCreation/Destruction` locks, queued-command rejection, intercept-pattern restore across restarts). Full command surface: snapshot/click/goto/fill/type/select/scroll/get/is/keyboardInsertText/mouse{Move,Down,Click,Up,Wheel}/find/setDevice/setOffline/setHeaders/setCredentials/setMedia/clipboard/dialog/storage/download/back/forward/reload/screenshot/fullPageScreenshot/evaluate/hover/drag/upload/wait/check/focus/clear/selectAll/keypress/pdf/cookies/viewport/geolocation/intercept/console/networkLog/capture. Rich-text editors use `document.execCommand('insertText')`; plain inputs use native setter JS; mobile-touch click-point resolution with radius search; text insertion chunking via `browser-text-insertion.ts` (64 KB chunks through CDP).
- `cdp-ws-proxy.ts` (`CdpWsProxy`): per-tab localhost WS server bridging CDP over WebSocket to Electron's `webContents.debugger` (lease-based via `electron-debugger-lease.ts` â€” refcounted attach/detach so DevTools coexist). HTTP endpoints `/json/version` + `/json/list` masquerade as generic `Chrome/<bundled version>` (never leak FABRICA/embedded automation identity). Synthetic Target session management (`Target.attachToTarget`/`attachToBrowserTarget` â†’ `FABRICA-proxy-session*` ids) so Playwright/agent-browser filtering works. Special-cased methods: `Page.captureScreenshot` (debugger path hangs on webviews â†’ `cdp-screenshot.ts` with capturePage fallback + clip math + HiDPI cssContentSize preference; full-page via layout metrics), `Page.printToPDF` (webview-unsupported â†’ native `webContents.printToPDF` via `cdp-print-to-pdf.ts` `buildPrintToPdfOptions` + `CdpPdfStreamStore` for ReturnAsStream IO.read/IO.close streaming), `DOM.focus`â†’`Input.insertText` focus replay (counters native focus stealing), `Page.bringToFront`, `Page.navigate`/`Page.reload` lifecycle priming (Network.enable/Page.enable/lifecycle events within 1 s so network-idle detection works; reload routed through webContents.reload to survive cross-process swaps, #7031). Anti-detection script injected at attach.
- `cdp-bridge.ts` (`CdpBridge`, 61 KB): lower-level direct CDP bridge + `BrowserError` taxonomy used by snapshot engine and screencast.

### 2.7 Offscreen backend (headless serve)
- `offscreen-browser-backend.ts` implements `BrowserBackend` (interface in `browser-backend.ts`): for headless `FABRICA serve` (no renderer/webview), each tab is a never-shown main-process `BrowserWindow` (1280Ã—800 default) with guest-aligned webPreferences (sandbox, contextIsolation, no node), partitioned per session profile so cookies/storage persist in the same SQLite DBs as desktop. Registers via `browserManager.registerOffscreenGuest` (main owns load-failure lifecycle; skips webview-only setup); createTab returns immediately and loads asynchronously (30 s load timeout treats about:blank/slow-page timeout and ERR_ABORTED as usable); destroyed windows unregister cleanly. Requires Xvfb on headless Linux (documented constraint).

### 2.8 Screencast streaming to mobile
- `browser-screencast-stream.ts` (`startBrowserScreencast`): CDP `Page.startScreencast` over a leased debugger with per-command 8 s timeouts. Frame pipeline: base64 frames decoded, PNG/JPEG size sniffed (`browser-screencast-image-size.ts`), stale/host-surface frames dropped against client-authoritative viewport expectations (CSS px, device px, or scaled), metadata enriched (deviceWidth/Height forced to requested CSS viewport; image dims added), custom binary framing via shared protocol (`encodeBrowserScreencastFrame`, opcode+seq+format+metadata). Throttling: minFrameIntervalMs keeps newest throttled frame and flushes later; back-pressure via delaying `Page.screencastFrameAck` (50 ms retries) so Chromium doesn't pile up base64 work. Navigation/load triggers a 250 ms snapshot fallback (`capturePage` preferred under mobile emulation, else clipped `Page.captureScreenshot`) because static pages emit no live frames. Device-metrics override applied/reapplied (BFCache/cross-process navs drop emulation) and cleared on stop. Dialog events (`javascriptDialogOpening/Closed`) surfaced as stream events for remote clients.
- Consumer: relay/mobile clients drive remote browser view; image-size/scaling covered by tests (`browser-screencast-stream.test.ts`, `browser-screencast-snapshot-scaling.test.ts`).

### 2.9 Session registry (profiles/partitions)
- `browser-session-registry.ts`: profiles ('default' + UUID-scoped isolated/imported) map deterministically to Electron partitions (`getFABRICAProfileBrowserSessionPartition`); partition allowlist feeds will-attach-webview; persisted metadata validated on load (tampered JSON can't inject partitions). Installs per-partition policies once (permissions, cert guard, clean UA/client hints unless 'native', WebAuthn handlers, display-media deny, download routing). Profile deletion clears storage/cache and policies. Cookie import staging/replay owned here (see 2.4).

### 2.10 Misc
- `snapshot-engine.ts` `buildSnapshot`: accessibility-tree/Aria snapshot builder used by agent-browser snapshots.
- `popup-origin-bar-window.ts`: child popup windows hosted with a fixed 34 px origin bar (label + insecure indicator) so destinations are verifiable.
- `browser-clicked-link-routing.ts`: isolated-world click-tagging scripts (main + iframe worlds) powering new-tab link routing.
- `browser-download-destination.ts`: collision-safe save-path reservations for downloads.

---

## Cross-cutting observations
- Both subsystems share a pattern: a strict source-of-truth table (agent sources / session profiles) driving both capability and security decisions, deny-by-default boundaries, and heavy investment in incremental reuse (parse cache â†” debugger leases) to keep the main process responsive.
- Naming note: source still contains many internal `FABRICA_*` identifiers mixed with legacy comments referencing Orca-era issue numbers (e.g., #9210, #9330, STA-1278) â€” cosmetic only; no functional Orca/stably references observed in these folders beyond history-comment IDs.

