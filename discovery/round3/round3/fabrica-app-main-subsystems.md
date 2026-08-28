> **PATH MIGRATION NOTICE (2026-08-21):** This project moved from the environment root into `Fabrica-atlas/`. All `_sources/...` paths in this document now resolve to `Fabrica-atlas/_sources/...`. `Fabrica-app/` remains at the environment root.
# Fabrica-app Main-Process Execution Subsystems — Discovery Report

Scope: `Fabrica-app/src/main/{codex, codex-accounts, codex-usage, git, ssh, daemon}`. Read-only survey; all paths relative to `Fabrica-app/src/main/` unless noted. Roughly half of all files are co-located `*.test.ts` suites.

---

# 1. Codex Integration (`codex/`, `codex-accounts/`, `codex-usage/`)

## 1.1 Managed vs System CODEX_HOME Routing

**Core path resolution — `codex/codex-home-paths.ts`**
- `getSystemCodexHomePath()` → `<homedir>/.codex` (user's real home; never mutated except by explicit real-home lanes).
- `resolveFABRICAManagedCodexHomePath()` / `getFABRICAManagedCodexHomePath()` → `<userData>/codex-runtime-home/home` (shared managed mirror). Getter mkdirs; resolver is read-only.
- `getFABRICAUserDataPath()` honors `FABRICA_USER_DATA_PATH`, else platform defaults. Fallback exists because CLI hook commands import this module outside Electron.
- `syncSystemCodexResourcesIntoManagedHome()` links system resources (skills, hooks, plugins, plugin-state, profile-v2, themes, prompts, AGENTS.md) into managed homes via symlinks (Windows junctions), copy fallback when symlinks unavailable, ownership markers so Fabrica never touches user-created resources. `syncCodexGlobalInstructionsIntoManagedHome()` copies AGENTS.md across the WSL UNC boundary.

**Custom-CODEX_HOME detection — `codex/codex-real-home-path.ts`**
- `hasCustomCodexHomeOverride()` compares `CODEX_HOME` against `FABRICA_CODEX_HOME` and `~/.codex`; a custom home suppresses all managed mutation.
- `getCustomCodexHomeOverrideForLaunch(launchEnv)` distinguishes `'environment'` vs `'shell-startup'` overrides (rc-file probing via `readShellStartupEnvVar` from `../pty/shell-startup-env`). Equality helpers let the pane registry recheck stale overrides after restart.

**The routing decision — `codex-accounts/runtime-home-service.ts` (class `CodexRuntimeHomeService`, ~2,258 lines)**
`prepareForCodexLaunch(target, launchEnv)` decides which CODEX_HOME a pane gets:
1. **WSL target** → per-distro runtime home `<wslHome>/.local/share/fabrica/codex-runtime-home/home`, seeded from account/distro config, global instructions copied in.
2. **Host managed account** → self-contained per-account home `codex-accounts/<id>/home`, validated by `assertOwnedHostCodexManagedHomePath`.
3. **Host system-default** → returns `null` so the PTY layer injects no CODEX_HOME — Codex runs against real `~/.codex`. Gated on: no selected account, shell-startup probe supported, no custom override, and `realHomeLaneGate()` passing (flipped off when trust grants are impossible).
4. Otherwise → shared runtime mirror with resource sync + config mirror + background session bridge.

Supporting: `getSelectedHostCodexHomeRoute()` (`'account-home' | 'real-home' | 'shared-home'`), `prepareForRateLimitFetch()`, `getMirroredHostHomePathForStatus()`, `getHostCodexHomePathsForSessionDiscovery()`.

**Env vars**: `FABRICA_USER_DATA_PATH`, `CODEX_HOME` / `FABRICA_CODEX_HOME`, `HOME`/`SHELL`, `OPENAI_API_KEY`, `FABRICA_DISABLE_CODEX_TRUST_RPC` (kill-switch for RPC trust grants).

**Path-safety gate — `codex-accounts/host-codex-managed-home-ownership.ts`**: `assertOwnedHostCodexManagedHomePath()` proves candidate homes are inside the canonical `codex-accounts` root, match their `.fabrica-managed-home` marker/account ID, and do not resolve inside real `~/.codex` (realpath containment).

**Resource-copy markers — `codex/codex-managed-home-resource-copy-marker.ts`**: records fallback-copy provenance under `.fabrica-resource-copies/<entry>.json`.

**Account home discovery — `codex/codex-account-home-discovery.ts`**: disk-enumerates owned per-account homes for usage/session scanners.

## 1.2 Per-Pane Account Registry & Credential Storage

**Pane registry — `codex/codex-pane-account-registry.ts`**: persists `{version:2, panes:{ptyId:{selectionKey, accountId, homeRoute, shellStartupHomeOverride?, environmentHomeOverride?}}}` to `<userData>/codex-pane-accounts.json` (atomic write, mode 0600, cap 2000 panes). Because CODEX_HOME is baked into PTY env at spawn, this survives restarts. Functions: `recordCodexPaneAccount`, `getCodexPaneAccount`, `listRecordedCodexPaneLanes`, `hasRecordedLegacySharedCodexPane`, `reconcileCodexPaneAccountsWithLivePtys`.

- `codex/codex-pane-launch-account.ts` — `resolveCodexPaneLaunchAccount()` names the account a PTY launched under (resume can pin CODEX_HOME to the session's owning home); resolves home route (`real-home/shared-home/account-home/custom-home/wsl-home`).
- `codex/codex-stale-pane-accounts.ts` — `listStaleCodexPanes()` diffs recorded launch accounts vs current selection ("restart these panes" prompt; reasons: `account-change`, `home-route-change`).
- `codex-accounts/runtime-selection.ts` — selection model `{host: accountId|null, wsl: {distroKey: accountId|null}}` in settings (`activeCodexManagedAccountId` + per-runtime map); normalize/get/set/prune helpers.

**Account lifecycle — `codex-accounts/service.ts` (class `CodexAccountService`, ~1,913 lines)**
- Storage: settings store `codexManagedAccounts[]` (id, email, providerAccountId, workspaceLabel/Id, managedHomePath, managedHomeRuntime host|wsl, wslDistro, timestamps). Mutations serialized through a promise-chain queue (`serializeMutation`).
- Managed homes: `createManagedHome()` → `<userData>/codex-accounts/<uuid>/home` with `.fabrica-managed-home` marker; WSL homes via `wsl.exe bash -lc`; `assertManagedHomePath()` re-validates ownership before every use; `safeRemoveManagedHome()` refuses untrusted paths.
- Login: `runCodexLogin(managedHomePath)` spawns `codex login` with `CODEX_HOME=<managed home>` (`cmd.exe /c` on Windows to avoid DEP0190; `wsl.exe` + `buildWslCodexLoginArgs` for WSL). 120 s timeout; Windows polls auth.json for changed bytes then force-kills the lingering process tree after a 5 s post-auth grace (open handles otherwise make cleanup fail ENOTEMPTY). Forced kill after auth.json appeared = success.
- Headless import: `addAccountFromHome(sourceHome)` imports an authenticated auth.json via `importCodexAuthFromHome` (atomic write, mode 0600).
- Identity parsing: `readIdentityFromHome` → `loadOAuthCredentials` → `parseJwtPayload` decodes id_token JWT claims under `https://api.openai.com/auth` / `/profile` (email, chatgpt_account_id, workspace ids). Corrupt JSON fails loudly without echoing credential bytes.
- Add/re-auth: `doAddAccount`/`doReauthenticateAccount` recreate only at the exact expected path (`recreateExpectedHostManagedHomeForReauthentication`); roll back settings on post-write failure. `assertOAuthAccountAddAllowed` refuses OAuth adds while `~/.codex/config.toml` pins a non-OpenAI top-level `model_provider` (`codex/codex-model-provider-config.ts::readCodexTopLevelModelProvider`).
- Remove/select: `doRemoveAccount` clears selection, re-syncs runtime home, deletes managed home, evicts cached usage. `doSelectAccount` validates runtime lane, persists selection, syncs config+auth, fires `onHostSystemDefaultSelected`, triggers background quota refresh (`RateLimitService.refreshForCodexAccountChange`).
- System-default identity: `resolveSystemDefaultIdentity()` reads real `~/.codex/auth.json` read-only; classifies `'oauth' | 'api-key' | 'none'`.
- Rate-limit reset credits: durable idempotency ledger, scope validation (`validateResetCreditScope`), states `fresh → providerPending → settled`, fail-closed on corrupt ledger.

**Runtime-home credential hot-swap — `runtime-home-service.ts`**
- `syncForCurrentSelection()` state machine: self-contained accounts short-circuit; leaving a managed account restores the system-default snapshot (`restoreSystemDefaultSnapshot`); unmanaged sessions seed once from `~/.codex/auth.json`; logout markers (`system-default-runtime-logout.json`) distinguish local logout from external login.
- Token read-back: `readBackRefreshedTokensFromPath()` diffs runtime auth vs `lastWrittenAuthJson`, positively identifies the owning managed account (`findManagedAccountForRuntimeAuth` using `codexAuthMatchesManagedAccount` from `codex-accounts/codex-auth-identity.ts`), requires monotonic freshness, rejects ambiguous matches, atomically persists into the owning account's auth.json. `clearLastWrittenAuthJson(accountId)` skips next read-back after deliberate re-auth.
- Provenance ledger: `shared-runtime-auth-provenance.json` records whether mirror auth bytes are owned by system-default or a managed account; two-phase `{owner:'pending', ...}` makes crash recovery exact (`resolveSharedRuntimeAuthProvenanceStatus` commits pending only if bytes still match, else `'fenced'`).
- Snapshots: `system-default-auth.json` (mode 0600) captures `~/.codex/auth.json` before takeover; legacy raw snapshots upgraded transparently. All writes via `writeRuntimeAuth` (atomic, mode 0600, optional CAS via `writeFileAtomicallyIfUnchanged`).
- WSL lane: per-distro baselines, same-id-fresher detection copies refreshed tokens back over UNC; legacy active-home pointer migration via atomic `ln -s` + `mv -Tf` inside distro.
- Legacy migrations (constructor-time, failure-isolated): `legacy-shared-auth-migration.ts` (per-account auth + MCP creds behind generation markers), `safeMigrateLegacyManagedState` (conflicts preserved as `<name>.fabrica-legacy-<accountId>` + JSONL diagnostics), active-home pointer repointing.
- Retained-pane compatibility: `syncLegacySharedSystemDefaultAuthForRetainedPanes()` + `codex-accounts/legacy-shared-config-compatibility.ts` keep the retired shared mirror coherent for pre-rollout PTYs (strictly one-way).
- Credential-absence grace: `codex-accounts/codex-credential-absence-grace.ts` — missing/unreadable auth.json is usually codex rotating it in place; 5 s grace window prevents transient races from deselecting/logging out.
- Auth readiness: `codex-accounts/managed-codex-auth-readiness.ts` classifies stored auth and polls up to 1.5 s for readiness before dependent operations.

## 1.3 TOML Hook-Service Editing + Trust Grants

**TOML engine — `codex/config-toml-trust.ts` (~1,007 lines)**. Codex ≥0.129 gates every hook on `[hooks.state."<key>"]` blocks containing `enabled` + `trusted_hash`:
- Hash replication: `computeTrustedHash(entry)` reproduces codex-rs `command_hook_hash` — canonical JSON (recursively sorted keys) of `{event_name, matcher?, hooks:[{type:'command', command, timeout, async, statusMessage?}]}`, sha256-prefixed. `matcherPatternForEvent` drops matchers on `user_prompt_submit`/`stop` exactly as Codex does.
- Trust keys: `computeTrustKey(entry)` = `<normalized sourcePath>:<eventLabel>:<groupIndex>:<handlerIndex>`; `parseTrustKey` anchors on last three colons (Windows drive letters contain colons); `normalizeHookTrustKeyForLookup` folds separator/case drift at the Map edge.
- Byte-preserving edits: `upsertHookTrustEntries` / `removeHookTrustEntries` regex-edit rather than parse+reserialize, preserving comments/key order/inline-table style. Stateful line scanner (`config-toml-line-scan.ts`) ignores headers inside multi-line strings. Windows keys written in both slash variants (`getTrustKeyWriteVariants`) because Codex 0.140 accepts either depending on startup cwd; duplicate disabled blocks win.
- Project trust: `upsertProjectTrustLevel` writes `[projects."<realpath>"] trust_level = "trusted"|"untrusted"` — the trusted-projects grant mechanism.
- Atomicity: `writeConfigAtomically` — random-suffix tmp file, rolling `.bak` backup, mode preservation, symlink resolution first (dangling link fails closed), Windows-retry rename. Documented limitation: no cross-process lock against Codex's own `/hooks` writer; idempotent install repairs lost updates.
- Supporting parsers: `escapeTomlString`, string parsers, `findNextTableHeader` byte-walkers, `ensureHooksStateParentTable`. Shared infra: `config-toml-line-scan.ts`, `config-toml-key-path.ts`, `config-toml-runtime-owned-sections.ts` (sections Fabrica owns in mirrors; `stripRuntimeOwnedTomlSections`), `config-toml-deprecated-hook-flag.ts`.

**Hook service — `codex/hook-service.ts` (class `CodexHookService`, ~1,622 lines)**
Installs Fabrica's agent-status hook into a CODEX_HOME:
- Events: SessionStart, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, SubagentStart, SubagentStop, Stop.
- Managed script: cmd.exe batch / POSIX sh POSTing hook payload (form-encoded: paneKey, tabId, launchToken, worktreeId, env, version, payload@stdin) to `http://127.0.0.1:$FABRICA_AGENT_HOOK_PORT/hook/codex` with token auth; sources a live endpoint file so surviving PTYs follow app restarts; curl.exe fallback in WSL. Written to shared managed-script path (`../agent-hooks/installer-utils`).
- `install(runtimeHomePath)`: promotes in-Fabrica approvals first, rebuilds hooks.json (mirrored user hooks + managed definition prepended per event), mirrors trusted user-hook trust entries (group indices shifted past the managed hook), then grants trust (RPC lane or self-computed-hash fallback lane); stale trust cleanup; provenance snapshot; legacy sweeps clean `~/.codex/hooks.json` and ancient profile block.
- Status verification: checks each event's definition position (last-match-wins) and trust hash against three authorities (self-computed, grant-ledger, recent-RPC-grant); reports `installed | partial | not_installed | error`.
- WSL lane: `installForRuntimeHome` + `codex-wsl-hook-install-plan.ts`; readable-guard shell wrapper since exec bits are unreliable over UNC; generation counter reconciles when distro canonical path settles later.
- Remote SSH lane: `installRemote(sftp, ...)` edits remote hooks.json/config.toml over SFTP with atomic remote writes.
- remove()/refreshRuntimeUserHooks(): sweep managed entries + trust blocks while keeping user hooks; `retained-codex-hook-state.ts::reconcileRetainedCodexHookHomes` replays across retained homes.

**Trust-grant orchestration — `codex/codex-hook-trust-grant.ts`**: `grantManagedCodexHookTrust(plan)` never throws; returns `{lane:'rpc', entries}` or `{lane:'fallback', reason}`:
1. Env kill-switch → fallback `'disabled'`.
2. Ledger hit (signature + Codex hash present, binary stamp unchanged) → skip RPC.
3. Pending Codex sqlite backfill → fallback `'retry-cached'` (RPC could refresh an abandoned backfill lease).
4. Capability cache unsupported / 5-min per-host cooldown after errors → fallback.
5. Otherwise: snapshot config.toml, remove self-computed trust for owned keys, run synchronous grant session; any failure restores exact pre-session bytes (`restoreCodexTrustConfig`). Verify-failure taxonomy feeds telemetry.
6. Success: entries carry Codex's verbatim hashes; persisted to ledger keyed by normalized home path.

Supporting modules: `codex-trust-grant-ledger.ts` (`trust-grant-ledger.json`; native/WSL binary stamps), `codex-trust-grant-host.ts` (how to run codex for a grant; ~10 s native timeout), `codex-trust-grant-telemetry.ts` (closed taxonomies), `codex-trust-config-rollback.ts` (crash-safe snapshot/restore), `codex-managed-trust-reconciliation.ts` (ownership-verified removal by expected hash OR ledger hash), `hook-trust-promotion.ts` (writes TUI-made approvals back to `~/.codex/config.toml`), `codex-user-hook-trust-rebase(-client).ts` (rebases user trust through app-server `hooks/list` + `config/batchWrite` when positions shift), `codex-hook-identity.ts` (event-label maps kept in one module so install/status/promotion cannot drift).

**Real-home hook lane — `codex/codex-real-home-hook-install.ts`**: `ensureRealHomeCodexHookState({hooksEnabled})` mutates the user's own files with heavy safety: generation guard (`assertHooksJsonGeneration` compares exact pre-parse bytes), refusal on unknown root keys, one-time pristine backup (`hooks.json.pre-Fabrica`), entry appended LAST so user trust positions don't shift, user-trust rebase, RPC grant with `useDefaultCodexHome: true`, full rollback of both files if grant fails (host stays on managed lane). Sweep mode removes entries on opt-out.

**Config mirror & settings promotion**
- `codex/codex-config-mirror.ts` — `syncSystemConfigIntoManagedCodexHome`: promotes runtime-made changes (`/model`, `/approvals`) back to `~/.codex` first (`promoteCodexRuntimeSettingsToSystem`), then mirrors system→runtime section-wise; runtime-owned sections survive unless the user explicitly revoked project trust; blank source is never authoritative-empty; baselines advance only after successful mirrors.
- `codex/config-settings-promotion.ts` (diff engine), `config-settings-baseline.ts` (`.fabrica-config-settings-baseline.json` v1/v2), `config-settings-conflict-resolution.ts` (closed decision set `aligned|preserve|promote-runtime|use-system`), `codex-config-settings-upsert/-removal/-preservation.ts` (structured TOML value editing; `[tui]` namespacing).
- `codex/codex-config-path-reference-rewrite.ts` — rewrites relative path-valued settings (`log_dir`, `model_instructions_file`, `skills.config.path`, …) to absolute against the defining config dir, since codex-rs resolves them against `CODEX_HOME`; WSL mirrors anchor to Linux-side paths.
- `codex/config-sync-stall.ts` — health report explaining why managed config stopped tracking `~/.codex` (downed distro, unhydrated cloud-synced home); latched reporting.

## 1.4 App-Server Client

Fabrica drives `codex app-server` — the sanctioned JSON-RPC surface the Codex TUI uses — rather than replicating sqlite schemas/hash algorithms beyond the compatibility shim. Three consumers share one transport: hook-trust grants, user-hook trust rebase, session index heal.

**Transport & lifecycle — `codex/codex-app-server-session.ts`**: `runCodexAppServerSession(invocation, body)` runs one short-lived session: spawn → `initialize` → notify `initialized` → caller body → stdin EOF/reap.
- Spawn: stdio pipes, `windowsHide: true`; env overlay applied then `envToDelete` stripped (so default-home grants can strip inherited managed `CODEX_HOME`).
- Framing/correlation: NDJSON over stdout; monotonic numeric request ids; `pending` Map correlates responses. Multibyte-safe decoding. 1 MB stdout cap kills process tree and fails pending requests.
- Error taxonomy: `CodexAppServerUnsupportedError` only when the RPC surface itself is absent (JSON-RPC `-32601`, or stderr naming `app-server` argv-parse failure via `codex-app-server-capability-signal.ts`); unrelated stderr stays transient. `CodexAppServerTimeoutError` from whole-session deadline (SIGKILL).
- Reaping: stdin close → 1.5 s exit wait (`codex-process-exit-deadline.ts`) → guaranteed tree kill (`taskkill /pid <pid> /t /f` on Windows). EPIPE/spawn errors reject all pending waiters.

**Trust-grant client — `codex/codex-app-server-client.ts`**: `runCodexHookTrustGrantSession(request)` implements the exact TUI wire flow: `hooks/list {cwds:[cwd]}` → filter to managed entries → one `config/batchWrite` upsert of `trusted_hash` values using Codex-computed hashes → re-run `hooks/list` to verify trusted. Exists because replicated hashes drifted across Codex releases (#7896/#7110/#8699).

**Synchronous bridge — `codex-app-server-grant-bridge.ts` + `-grant-entry.ts` + `-grant-envelope.ts`**: hook install is synchronous launch prep but the JSONL RPC needs an event loop; solution forks a child (`ELECTRON_RUN_AS_NODE`) running `codex-app-server-entry.ts`, request JSON via stdin, exactly one result-envelope line on stdout, hard-exit 2 s before parent timeout. Entry never imports electron.

**Capability cache — `codex/codex-app-server-capability-cache.ts`**: suppresses known-missing RPC surfaces per host key (`native` | `wsl:<distro>`), 30-min retry interval so codex upgrades self-heal.

Other RPC consumers: session index heal (`thread/read` per backfilled rollout); state-db backfill recovery spawns `codex -s read-only -a untrusted app-server` as claimant; WSL invocations route through `codex-accounts/wsl-codex-command.ts`.

## 1.5 Session Backfill / Heal Jobs

All single-flight, incremental, non-destructive, marker-gated.

**Orchestration — `codex/codex-session-migration-scheduler.ts`**: sequences backfill → index-heal per pass. Launch lifecycle hooks: `beginLaunch(leaseId)` schedules date-bounded run (15 s delay); `finishLaunch` schedules scan of every UTC date the pane spanned; ignored-launches/recent-exits bookkeeping (`codex-session-migration-ignored-launches.ts`, `-recent-exits.ts`) prevents non-shared reattach exits masquerading as exit-before-begin races. Generations + pending scan-date accumulation ensure correctness across overlapping passes; completion-marker publication gated on zero active launches.

**Bridge (system → managed) — `codex/codex-session-bridge.ts`**: mirrors real sessions into the shared runtime mirror so `/resume` finds them. Hardlinks preferred (`codex-session-link.ts` — codex resume ignores symlinked JSONL); migrates legacy symlink/full-copy bridges; incremental listing (`codex-session-file-listing.ts`, batch 64 dirs / 10 ms yield). Per-account variant `codex-account-session-bridge.ts` hardlinks rollouts from all visible homes into self-contained account homes. WSL variant `wsl-codex-session-bridge.ts` hardlinks *inside* the distro (30 s bounded bash script). History-source override: `codex-session-source-home.ts`.

**Backfill (managed → system) — `codex/codex-session-backfill.ts`**: once-per-host publication of managed rollouts into real `~/.codex/sessions`. Skip-existing always, delete nothing; hardlink first, cross-volume skipped as unsupported; symlinks skipped; sequential async mutations; opt-out bounds writes to ≤1 in-flight file. Helpers: `-types.ts`, `-date.ts` (UTC date keys, rollout-path shape check), `-copy.ts` (staged temp-file copy then same-volume hardlink — no truncated rollout can occupy a target name), `-marker.ts` (versioned v3 marker bound to target root + nonzero scan count; generation counter blocks stale passes; invalidation on new managed-lane rollouts).

**Audit ledger — `codex-session-backfill-audit.ts` + `-audit-pass.ts`**: every outcome appended to `audit.jsonl` with crash safety (leading-newline quarantine of torn tails, UUID recordIds, deterministic event IDs hashed from file identity so retries dedupe; one retry on transient append failure — the ledger is the heal job's work queue; persistent failure counts as `failedHealAuditRecords` and blocks the completion marker).

**Index heal — `codex-session-index-heal.ts` + `-heal-state.ts`**: Codex's sqlite metadata backfill is one-shot, so later-hardlinked rollouts never reach its DB. Heal drives sanctioned `thread/read` for every audited-but-unprocessed thread, newest first. Batching: 50 reads/session, concurrency 2, 500 ms inter-batch delay, timeout 15 s + 2 s/read; invocation pins CODEX_HOME explicitly. Outcomes in `index-heal-ledger.jsonl` (v3): healed/missing/failed; SQLITE_BUSY aborts pass leaving ids unrecorded; unsupported CLI marks 24 h re-probe. Steady state = two stat calls.

**State-db backfill recovery — `codex-state-db-backfill-recovery.ts` + `codex-state-db.ts`**: read-only inspection of newest `state_N.sqlite` `backfill_state` (pending also requires ≥100 session files when untracked); supervises sanctioned claimant process polling every 5 s; caps 5 spawns / 1 h / 5 coordinator failures; cross-process arbitration via crash-safe hard-link claim lock keyed by sha256 of normalized home path.

**Resume provenance (launch-time repair)**: `codex-session-resume-home.ts` verifies persisted transcripts belong to trusted homes; deterministic home ranking (selected account > real home > shared mirror > rest) so the winning home names the intended account; unverifiable provenance yields explicit `'fresh'` (resume argv dropped) rather than resuming under whatever account is now selected (#10793). Plus `codex-session-resume-preparation.ts`, `codex-unverified-resume-launch.ts`, `codex-legacy-session-resume.ts`.

## 1.6 codex-usage (Usage Analytics)

- `types.ts` — processed-file tracking, per-location/per-model token breakdowns (input/cached-input/output/reasoning, `hasInferredPricing`), sessions, daily aggregates.
- `codex-usage-provider.ts` — provider adapter (`id:'codex'`, schema v5; v5 key ownership on raw token_count identity without session id so forked/resumed sessions don't double-count, #8006).
- `scanner.ts` (~747 lines) — enumerates session roots (managed mirror + real `~/.codex` + disk-discovered account homes), incrementally parses rollout JSONL (delta resolution against cumulative token_count totals), attributes events to worktrees/repos, aggregates per session/day, yields every 10 files / 100 discovery entries.
- `store.ts` (~787 lines) — persistence keyed by schema version + presentation: embedded model pricing table (gpt-5.x family incl. tiered long-context pricing at 272k tokens), range/scope filtering, automation-run attribution within 5-minute window, daily local-time aggregation.

Note: live quota fetching lives in `../rate-limits/service.ts`, driven through `CodexAccountService.consumeRateLimitResetCredit` / `prepareForRateLimitFetch`; `codex-usage` covers historical analytics only.

---

# 2. Git Layer (`git/`)

97 files: 48 implementation modules + 49 co-located test suites.

## 2.1 runner.ts — Spawn Mechanics, Environment, Timeouts

`runner.ts` (~1,838 lines; central git/gh/glab runner with transparent WSL support):
- `execFileCapture(command, args, options)` (~line 515) — promise wrapper over execFile; enriches rejections with `.stdout`/`.stderr`; supports stdin write, AbortSignal, own deadline timer.
- `spawnCommandCapture` (~635) — spawn-based capture for Windows `.cmd` shims and retry paths; per-stream maxBuffer; tree-kills on timeout/abort/maxBuffer.
- `gitExecFileAsync(args, options)` (~962) — main async git entrypoint; wrapped in `withGitSpan` observability; resolves WSL routing via `resolveGitCommand`; applies SSH policy or non-interactive env; falls back from failed direct-WSL-git to login-shell mode.
- `commandExecFileAsync` (~1018) — generic runner; handles Windows batch scripts; retries ENOENT with `.cmd` shim (`shouldRetryWindowsCommandShim`).
- `gitStreamStdout(args, options)` (~1104) — incremental stdout streaming with StringDecoder; caller's `onStdout(chunk)` may return true to stop early (tree-kill, resolves `{stoppedEarly:true}`). Exists because buffering huge status output can overflow V8 max string.
- `gitExecFileSync` (~1277) — hard default timeout `GIT_EXEC_SYNC_TIMEOUT_MS = 15_000` (dead network drives can hang sync git for minutes).
- `killSpawnedCommandTree(child)` (~444) — win32 `taskkill /pid <pid> /t /f` with 2 s wait so wsl.exe/shim descendants die too.

**Environment variables injected**:
- `DEFAULT_GIT_MAX_BUFFER` = 10 MiB.
- `gitOptionalLocksDisabledEnv` — `GIT_OPTIONAL_LOCKS=0` so status-poll reads don't race terminal git on index.lock.
- `untranslatedGitOutputEnv` — locale pins (`LC_ALL`/`LANG` from `shared/git-output-locale`) so stderr parsers work under any locale (#7808).
- `nonInteractiveGitEnv` (~782) — prompt guard + `GIT_TERMINAL_PROMPT=0`, empties `GIT_ASKPASS`/`SSH_ASKPASS` when unset, `GIT_SSH_COMMAND='ssh -o BatchMode=yes'` if unset (forwarded into WSL via WSLENV keys on win32).
- `appendGitConfigEnv` — `GIT_CONFIG_COUNT`/`GIT_CONFIG_KEY_n`/`GIT_CONFIG_VALUE_n` protocol (git ≥ 2.31).
- gh: `nonInteractiveGhEnv` sets `GH_PROMPT_DISABLED=1`.
- WSL boundary note (~line 242): env set on wsl.exe stays Windows-side; for shell-mode routing locale vars ride the command string; direct-git mode passes them as `/usr/bin/env KEY=VALUE` args.

**SSH policy** — `buildNetworkSshPolicyEnv` (~911): explicit-env / configured-openssh (tokenized safely, BatchMode appended) / fallback modes; core.sshCommand probe timeout 2.5 s.

**Timeouts**: enforced by the runner itself ("Node's timeout waits forever on signal-ignoring CLIs"). Domain timeouts: worktree add 180 s, removal preflight 30 s, gh default 30 s (overridable `FABRICA_GH_EXEC_TIMEOUT_MS`), sync git 15 s.

## 2.2 status.ts Read Leases

Lease owner class `GitStatusReadLeaseOwner<T>` lives at `src/shared/git-status-read-lease-owner.ts` (moved there so the relay host can coalesce identical reads).
- State per key: `{controller: AbortController, promise, liveLeases, settled}`.
- `lease(key, signal, load)` — first caller creates entry and runs the shared read on the shared controller's signal; later callers join the in-flight promise (`liveLeases += 1`).
- When a caller's own signal aborts, that lease releases; if it was the last live lease and the shared read hasn't settled, the shared controller aborts with that reason.
- Entries removed as soon as the shared promise settles — dedupe applies only to concurrent reads.
- Module singleton in `status.ts` (line 103); cache key via `getStatusReadKey` (line 239): `stableInFlightKey([worktreePath, wslDistro, includeIgnored, reuseLineStats, branchLineTotalMergeBase, bypassEffectiveUpstreamNegativeCache, limit, sharedLinkPaths])` — every option that changes output shape gets its own slot.
- Invalidation: `invalidateGitReadCaches()` (line 107) clears diff dedupe, status lease owner, branch-line-total in-flight, line-stats cache, submodule paths, upstream name caches; `runWithGitReadCacheInvalidation(run)` invalidates both before and after mutations.
- Inside the leased body (`runGetStatus`, line 289): streams `git status --porcelain=v2 --branch --untracked-files=all` (+ `-c core.quotePath=false`, optional `--ignored=matching`) through `gitStreamStdout` with `preferWslDirectGit: true` and `gitOptionalLocksDisabledEnv()`, feeding `StatusPorcelainParser.update(chunk, limit)`; deferred unmerged records resolved post-stream in output order; upstream probing uses cooperating caches (negative effective-upstream TTL 5 min/max 512, resolved-upstream-name 60 s, in-flight probe maps with "retired" probes); line stats keyed by `${wslDistro ?? 'native'}\0${worktreePath}`.
- Related dedupe: `getDiff` uses `InFlightPromiseDedupe`; hosted probes use `coalesced-probe.ts::runCoalescedProbe` (60 s staleness window, ownership tokens).

## 2.3 Worktree Create/Remove Invariants (`worktree.ts`, ~1,639 lines)

**Creation** (`addWorktree` line 912):
- Wrapped in `runWithGitReadCacheInvalidation`; `bumpWorktreeScanGeneration(repoPath)` in finally prevents listings joining pre-mutation scans.
- New branches use `--no-track -b <branch> <path> [<base>]` — avoids inheriting base upstream so status won't misreport "behind by N".
- Base ref resolution peels refs to commits (`resolveWorktreeAddBaseRef`).
- Optional local base-ref refresh (line 837) heavily guarded: rev-list left/right count must prove fast-forward-only; OIDs verified; ancestry proven; owner worktrees must be clean before reset --hard; unowned refs updated with CAS `update-ref <ref> <newOid> <expectedOldOid>`; all failures degrade to `skipped_*` statuses.
- Post-create side effects best-effort: persists `branch.<branch>.base` config (unset on failure); sets `push.autoSetupRemote=true` locally only if unset anywhere.
- `WORKTREE_ADD_TIMEOUT_MS = 180_000` bounds OneDrive cloud-placeholder stalls (STA-1292).
- Sparse variant `addSparseWorktree` (line 1033): `--no-checkout` add → sparse-checkout init/set → checkout; full rollback on failure (`cleanupFailed` annotation if rollback fails too).
- `moveWorktree` insists on `git worktree move` — never fs.rename (corrupts .git file/gitdir back-pointer).

**Listing** — `parseWorktreeList(output, {nulDelimited})` (line 479): porcelain blocks (worktree/HEAD/branch/bare/sparse/locked/prunable); first block always main worktree. Capability-gated `-z` parsing (git ≥ 2.36) with line-mode fallback; `annotatePrunableByExistence` stats linked paths for old git (< 2.31 emits no prunable); locked worktrees never probed ("a lock shields a missing dir"). Scans shared per repo/distro/timeout/generation key; signal-bearing callers get unshared scans.

**Removal** (`removeWorktree` line 1112) — invariants in order:
1. Lock contract: `assertWorktreeUnlockedForRemoval` refuses locked worktrees.
2. Cleanliness: `assertWorktreeCleanForRemoval` (line 1435) — porcelain status with 30 s preflight timeout; NUL-delimited output so tolerated untracked shared links can be excluded without leaking control bytes.
3. Deferred deletion fast path (line 1187): skipped for WSL-owned checkouts ("Node on Windows must not rename them"); renames checkout to trash, deregisters via `git worktree remove --force` or prune verified by strict re-list (`listWorktreeStrict` — "an unreadable repo must not read as proof that the row is gone"), restores from trash if deregistration fails; multi-GB deletes run async (`scheduleWorktreeTrashDeletion`).
4. Submodule refusal: git refuses clean non-force removal with initialized submodules; code re-proves cleanliness then escalates to --force.
5. Branch preservation: branch deleted with `-d` (never `-D` unless creation rollback) so unmerged commits survive; squash-merge-aware fallback; worst case returns `{preservedBranch}` — "deleting a worktree must never silently discard commits".
6. `forceDeleteLocalBranch` (line 1375): CAS `update-ref -d refs/heads/<b> <expectedHead>` so stale toast actions can't delete a moved branch; restores ref if concurrent checkout races.

## 2.4 gh Rate-Limit Circuit Breaker (`gh-rate-limit-breaker.ts`, 237 lines, zero imports by design)

- Buckets: `core | search | graphql`; `classifyGhRateLimitBucket(args)` (line 102) — `gh search` → search; `gh api` endpoint inspection (`findGhApiEndpoint`, skipping value-taking flags) → search/graphql/core; other commands → core.
- Scope keys: `"${runtime}:${host}"` where runtime is `native` or `wsl:<distro>`; host precedence: argv `--hostname` → options.host → hostname embedded in `HOST/OWNER/REPO` → `GH_HOST` env → `'github.com'`. Prevents github.com/GHES/WSL quotas blocking each other.
- State: module map `blockedUntilMsByScopeAndBucket` (max 1024 entries, LRU-refreshed). Closed (no/expired entry; lazy eviction + hot-entry refresh on read) / Open (entered by `notifyGhPrimaryRateLimit`, records now + fallback block, fires registered reset probe) / Half-open refinement (only `gh api rate_limit` probes exempt via `isGhRateLimitProbe`, refining the window via `recordGhPrimaryRateLimit` with GitHub's real reset time).
- Detection: `isGhPrimaryRateLimitStderr` (line 138) — contains "api rate limit exceeded" AND NOT "secondary rate limit". Secondary limits carry Retry-After and go through transient-retry logic instead.
- Reset timing: `FALLBACK_BLOCK_MS = {search: 70_000, core: 300_000, graphql: 300_000}` — primary 403 carries no reset time; search resets each minute; blocking core/graphql a full hour "would be too punishing", so 5-min fallback refined by probe.
- Blocked error worded deliberately without "HTTP 403" so downstream classification maps to `rate_limited` not `permission_denied`.
- Runner integration (`ghExecFileAsync`, runner.ts ~1622): idempotency auto-detection (`argsLookIdempotent` — write verbs/method flags/mutation GraphQL; non-idempotent calls never retried); host qualification (`applyGhHostToArgs` rewrites bare OWNER/REPO shorthand); pre-spawn `assertGhRateLimitScopeAvailable` fails fast while open (re-checked after WSL↔host fallback switches); retry loop ≤3 attempts (`GH_RETRY_DELAYS_MS=[250,1000]`), honors parsed Retry-After capped at 30 s; fallbacks between host/WSL gh binaries when either is missing.

## 2.5 Porcelain Parsing

**v1 — `porcelain-v1-records.ts`**: `parsePorcelainV1Records(stdout)` parses `git status --porcelain -z` (NUL termination avoids quoting/escaping of spaces/quotes/non-ASCII). Skips fields shorter than 4 chars; rename/copy records consume the following NUL-separated origin field (`index++`) — treating origins as records would invent statuses out of path bytes. Used where entries must match configured paths byte-exactly (discard safety, submodule path cache, pathspec literals, WSL pathspecs).

**v2 — `StatusPorcelainParser` (`src/shared/git-status-porcelain-parser.ts`)** used by the main status pipeline because only v2 carries branch metadata, submodule fields, and unmerged records. Edge cases:
- Partial lines carried across chunks (`this.carry`); CRLF `\r` stripped; `finish()` flushes unterminated final line.
- Type-2 rename/copy records: new path = everything after 9 space-delimited fields pre-tab (joined with spaces so paths with spaces survive); old path = post-tab tail; both c-quote decoded; emits separate staged/unstaged rows when XY has non-`.` halves.
- Untracked/ignored raw paths c-quote decoded; ignored go to `ignoredPaths` not entries.
- Unmerged (`u`): counted toward limit immediately (conflict-heavy merges can't bypass cap) but deferred; `status.ts::parseUnmergedEntry` (~line 949) maps UU/AA/DD/AU/UA/DU/UD to conflict kinds, skips submodule conflicts (mode 160000), omits oldPath (v2 u records lack rename-origin), resolves display status via filesystem checks for added_by_*/deleted_by_* variants, defaults to 'modified' on fs errors.
- Branch metadata: `(detached)`/empty head → `branch: undefined`; `# branch.ab +N -M` → ahead/behind.
- Limit semantics: `update(chunk, limit)` returns true once exceeded, signaling early tree-kill; `statusLength` reports true total observed past cap.

## 2.6 WSL Routing

Decision in `resolveCommand(...)` (runner.ts ~217): non-win32 never routed; routes when cwd is a WSL UNC path (`\\wsl.localhost\<distro>\...` / `\\wsl$\...` via `parseWslPath`) or explicit distro override exists (global cwd-less gh callers on WSL-only installs).
- Path translation: `translateArgForWsl` (~89) — UNC args → Linux paths; drive paths → `/mnt/c/...`. Output direction: `translateWslOutputPaths` (~1820) rewrites absolute Linux paths in structured output back to Windows UNC so Node fs can read them.
- Shell construction: `bash -c "cd <linuxCwd> && git …"` instead of `wsl.exe --cd` (--cd can fail ERROR_PATH_NOT_FOUND under Node spawn); args POSIX-shell-escaped.
- Three modes (`ResolvedCommand.wslMode`):
  1. **direct-git** fast path: `resolveGitCommand` (~338) when win32 + `preferWslDirectGit` + no network SSH policy + no differing GIT_* env overrides + known distro. Spawn form: `wsl.exe -d <distro> --exec /usr/bin/env PATH=<...> HOME=<...> [locale] [GIT_OPTIONAL_LOCKS=0] <gitPath> [-C <cwd>] <args>` — bypasses shell entirely. Environment discovered by `wsl-git-read-environment.ts` login-shell probe (marker `FABRICA_WSL_GIT_READ_ENV_V1`, 10 s timeout; refuses XDG_CONFIG_HOME/LD_LIBRARY_PATH/GIT_* environments; exit 78 rejected config, 127 no git, others transient with 30 s retry backoff). Exit 127 "not found" invalidates cached env and retries once in login-shell mode; permanent disablement only after a successful login retry.
  2. **login-shell**: `wsl.exe -d <distro> -- sh -lc <escaped command>` for network SSH ops and gh/glab in WSL.
  3. **non-login-shell** default: `wsl.exe -d <distro> -- bash -c "cd <linuxCwd> && <localePrefix> git <args>"`, Node-side cwd undefined.
- Linked-worktree exception: `wsl-linked-worktree-git-routing.ts` — Windows drive path with a distro that is actually a Windows-authored linked worktree (.git file pointing at a drive path) must use host git (WSL git would misresolve the pointer). Cached 30 s TTL, probe-bounded (5 s, max 2/cwd, 32 total), exponential-backoff retries.

## 2.7 Remaining File Inventory (highlights)

- Branch/upstream/push: `branch-rename.ts`, `upstream.ts`, `status-upstream-ref.ts`, `push-target-validation.ts`.
- Remote/forge: `remote.ts` (pull w/ divergence fallback), `remote-url-probe.ts`, `remote-ref-probe-cache.ts` (512-entry coalesced cache, provider-generation aware), `hosted-remote-url.ts` (local hosted-git-info fork), `fetch-error-classification.ts`, `compare-base-ref-fetch.ts`, `fork-sync.ts`, `git-username.ts`.
- Repo/history: `repo.ts`, `repo-clone-path.ts`, `history.ts`, `commit-object-ref.ts`, `checkout.ts`, `check-ignored-paths.ts` (batched stdin check-ignore), `huge-folder-ignore.ts`.
- Worktree support: `worktree-base-ref-probe.ts`, `worktree-include-file.ts` (`.worktreeinclude`), `worktree-shared-directories.ts` (`FABRICA.yaml`, 30 s cache), `worktree-symlink-detection.ts`.
- Infra: `exec-error.ts` (`extractExecError`, `parseRetryAfterMs`), `max-buffer-overflow.ts`, `git-capability-state.ts` (per-repo git-version capability cache wrapping WSL routing), `git-runtime-options.ts`, `coalesced-probe.ts`.

---

# 3. SSH Subsystem (`ssh/`)

Completely flat: 210 files, zero subfolders. Domain-prefixed naming (`ssh-*`, `relay-*`, `system-ssh*`, `sftp-*`), colocated tests for nearly every module.

## 3.1 Connection Manager / Store / Generations

**`ssh-connection-manager.ts`** — class `SshConnectionManager` owns all live connections:
- `connections: Map<string, SshConnection>` by target id; `connectingTargets: Map<string, symbol>` attempt-identity tokens (each connect mints `Symbol(target.id)`; finally-block removes only if still the registered attempt).
- `connect(target)` returns existing connection, throws "already in progress" on concurrent connects, disconnects stale connections first, deletes pool entry on failed connect only if identity matches (late-cancelled attempts can't evict newer connections).
- `disconnectConnection(targetId, conn)` closes one specific object (used when a cancelled connect's transport opened late).

**`ssh-connection.ts`** (~1,450 lines) — class `SshConnection`:
- Dual transport: bundled ssh2 client vs spawned system OpenSSH (`useSystemSshTransport`); state machine via `setState(status)`: disconnected/connecting/connected/reconnecting/auth-failed/error/reconnection-failed.
- `connectGeneration` counter guards every async continuation with `isCurrentConnectAttempt(gen)`; superseded attempts throw `createCancelledConnectAttemptError()` (`ssh-connect-attempt-cancellation.ts` — matched by error name, not message).
- Disconnect handlers identity-guarded (`this.client !== client` bails) so late events from old clients can't null out reconnects.
- Transport selection: ssh2 first; system ssh fallback for GSSAPI-only hosts (`isGssapiSystemSshFallbackCandidate`) or unreachable-host errors (`EHOSTUNREACH`/`ENETUNREACH`). `connectViaSystemSsh()` resolves config with `ssh -G`, spawns with ControlMaster retry.
- Credential caching (`cachedPassphrase`/`cachedPassword`) lets IPC skip redundant prompts during reconnects.

**`ssh-connection-store.ts`** — persisted target registry: manual targets never clobbered by config sync; removal writes tombstones (`buildRemovedSshTargetTombstone`) + deleted-alias suppression so passive `~/.ssh/config` sync can't resurrect them; `reclaimAlias()` lifts tombstones on re-add; `importFromSshConfig({reAdopt})` reconciles by normalized alias; runtime-owned ephemeral targets hidden from lists; orphaned workspace re-adoption (`ssh-target-readoption.ts`).

**`ssh-connection-generation.ts`** — session-scoped generation counters discarding stale async results app-wide:
- 13-bit per-target stride (8192) in 53-bit space; random 40-bit session scope so restarted processes never reuse tokens. Stride exhaustion rolls the whole scope forward, revoking all targets' tokens.
- `assertSshMutationExpectation(connectionId, expectedTargetId, expectedGeneration, expectedExecutionHostId?)` throws "SSH connection changed; refresh and try again"; called by IPC mutation paths (`src/main/ipc/filesystem.ts`, `filesystem-mutations.ts` ×7, `runtime/fabrica-runtime-files.ts`) so writes staged against a since-reconnected session are rejected.

**`ssh-provider-authority.ts`** — authority tokens `{targetId, providerEpoch, connectionGeneration}`; cached authority valid only while generation matches; rotation aborts registered AbortControllers (all targets on scope roll, else just that target's).

## 3.2 Reconnect Ladder + Error Classification

**Backoff table — `ssh-connection-utils.ts`**: `INITIAL_RETRY_ATTEMPTS = 5`, `INITIAL_RETRY_DELAY_MS = 2000`, `RECONNECT_BACKOFF_MS = [1000,2000,5000,5000,10000,10000,10000,30000,30000]`, `CONNECT_TIMEOUT_MS = 30_000`.

**`ssh-reconnect-ladder.ts`** — class `SshReconnectLadder`, two independent counters:
- `delayIndex` advances on every scheduled retry (flaps included); `consecutiveFailedAttempts` advances only on failed handshakes; reaching table length → `{kind:'give-up'}` → terminal `reconnection-failed` state.
- Stability reset: `STABLE_CONNECTION_MS = 60_000` — connection held ≥60 s restarts ladder at 0 on next drop (consumed exactly once, never rolling mid-outage).
- Flap cap: `FLAP_DELAY_CAP_MS` computed at load as largest table entry fitting under relay grace period minus connect timeout minus 20 s relay-reestablish budget — after a flap the remote relay burns its grace period; retrying later would kill every remote PTY. Cap applies only when handshakes aren't failing (relay alive); dead hosts keep the full table.

**Error classification — `ssh-reconnect-error-classification.ts`**, two deliberate classifiers:
- `isTransientReconnectError(err)`: auth/passphrase errors → permanent (never retried; surface as `auth-failed`); errno transience (`ETIMEDOUT, ECONNREFUSED, ECONNRESET, EHOSTUNREACH, ENETUNREACH, EAI_AGAIN`); fallback prose matching against ~20 OpenSSH message fragments ("kex_exchange_identification", "lost connection", "remote end closed", …) because system-SSH reports network failures as prose, not errno. Deliberately excludes bare "connection closed by" (server-side rejections like MaxStartups must stay permanent).
- `isDefiniteSystemSshHostFailure(err)`: unrecoverable-without-ControlMaster failures checked before generic transience.
- Rationale for two classifiers: widening initial-connect transience turns one 30 s timeout into ~160 s silence plus repeated security-key touch prompts; the reconnect ladder can afford broader recovery.

**Wiring in `ssh-connection.ts`**: drop detection funnels into `scheduleReconnect()`; give-up publishes `reconnection-failed`; auth/passphrase failures publish `auth-failed` and stop; non-transient publish `error` and stop; transient calls `markAttemptFailed()` + reschedule. Owner-admission interplay: `ssh-owner-admission-blocked-error.ts` + `ssh-owner-recovery-retry.ts` report "blocked" instead of feeding unexplained failures into classification.

## 3.3 Channel Multiplexer Lane Scheduling

**Wire format — `relay-protocol.ts`**: 13-byte frame header mirroring VS Code `PersistentProtocol`: [TYPE(1), ID u32BE, ACK u32BE, LENGTH u32BE]; Regular=1, KeepAlive=9. `KEEPALIVE_SEND_MS = 5_000`, `TIMEOUT_MS = 20_000`, ready sentinel `FABRICA-RELAY v0.1.0 READY\n`, `RELAY_REMOTE_DIR = '.fabrica-remote'`, streaming markers, `STREAM_CHUNK_SIZE = 256 KiB`. Frame decoding/backpressure in `src/shared/relay-frame-decoder.ts`.

**Multiplexer core — `ssh-channel-multiplexer.ts`**: JSON-RPC over framed transport.
- Requests: 30 s default timeout; timeouts/aborts send `rpc.cancel` notification so the relay stops long-running remote work; timeout errors carry typed codes (`SSH_MUX_REQUEST_TIMEOUT_CODE`).
- Sequence/ACK bookkeeping: outgoing seq counter, highest-received seq echoed as ACK (clamped to min(frame.ack, nextOutgoingSeq−1) — untrusted uint32); unacked timestamps bounded at 4095.
- Health timer (one 5 s interval): dead link declared only when BOTH no data for 20 s AND oldest unacked older than 20 s. Sleep/App-Nap protection: tick gap > 3× keepalive rebases health clocks instead of killing healthy links (#7773).
- `probeLiveness(timeoutMs)` post-resume probe; disposal rejects pending requests with typed reasons (`CONNECTION_LOST` vs `DISPOSED` — renderer distinguishes reconnection overlay from permanent toast).

**Lane scheduler — `ssh-multiplexer-writer-lane-scheduler.ts`**: three FIFO lanes with strict priority plus anti-starvation: liveness always first; control only if ordinary empty OR fewer than 4 control writes since last ordinary write; then ordinary. Head-index arrays for amortized-O(1) shift.

**Transport writer — `ssh-multiplexer-transport-writer.ts`**: single writer pump.
- Bounded admission: ordinary lane ≤ 2 MiB / 2048 frames; control lane reserve ≤ MAX_MESSAGE_SIZE / 512 frames; over-limit enqueues settle with error and fail the writer — backpressure at admission, not unbounded buffering.
- Liveness single-flight; saturated writer bypasses queue for liveness frames directly.
- Saturation/flow control: `transport.write === false` pauses pump; drain resumes and settles parked entries; write settlement exactly-once.
- Lane assignment (`messageLane()` in ssh-channel-multiplexer.ts): `pty.data` frames → ordinary lane; everything else → control — bulk terminal output can never starve protocol control traffic; keepalives preempt both. Read-side: FrameDecoder backpressure drives pause/resume reads with health-clock rebase.

## 3.4 Port Forwards

**`ssh-port-forward.ts`** — class `SshPortForwardManager`: forwards Map with ids `pf-N`; provider chain `[Ssh2PortForwardProvider, SystemSshPortForwardProvider]` selected via `canHandle(conn)`.
- Local binds `127.0.0.1:localPort` → remote; unexpected-close guard deletes map entry only if identity matches (stale-close race guard).
- `updateForward` does async remove-then-re-add preserving the original id (renderer references stay valid); rollback to old endpoints on rebinding failure; async removal needed because server.close()/process exit are async — without waiting, same-port edits hit EADDRINUSE.
- Providers: ssh2 (`net.Server` + `client.forwardOut` + bidirectional pipe, tracked sockets); system-ssh (`system-ssh-forward-process.ts` spawns `ssh -N -o ExitOnForwardFailure=yes -L ...`, ControlMaster suppressed; startup polled via TCP probe every 50 ms with 750 ms grace; SIGTERM→SIGKILL escalation after 2 s, resolve ≤500 ms after SIGKILL so callers never rebind a port owned by a stubborn child; 64 KiB stderr tail attached for unexpected-exit details).
- Coverage note: only local (-L) forwarding implemented; no remote (-R) or dynamic/SOCKS (-D). Adjacent: `ssh-port-scanner.ts` detects remote listening ports via mux RPC `ports.detect` with adaptive cadence (12 s doubling to 30 s cap), window-visibility parking, initialPorts exclusion.

## 3.5 Relay-on-Remote-Host Install/Deploy Pipeline

**Orchestrator — `ssh-relay-deploy.ts`** (~1,956 lines): `deployAndLaunchRelay(conn, onProgress?, graceTimeSeconds?, relayInstanceId?)` → `{transport, serverBuildId, platform, hostPlatform, remoteHome, remoteRelayDir, nodePath, sockPath, credentialFile}`. Top-level Promise.race enforces `RELAY_DEPLOY_TIMEOUT_MS` with AbortController teardown plus secondary teardown-timeout race annotating confirmation flags. Loops on `RelayDirectoryGcConflictError`.

Pipeline steps:
1. Detection: `detectRemoteHostPlatform` (linux/darwin/win32 × x64/arm64); local bundle located via `FABRICA_RELAY_PATH` env / resourcesPath candidates.
2. Versioning: content-hashed `.version` (e.g. `0.1.0+0a5fe134d020`) doubles as wire-handshake version; remote dir `${home}/.fabrica-remote/relay-<fullVersion>` (validated segments, CR/LF rejected).
3. Bootstrap probes: install-check concurrent with Node-path resolution; sequential fallback on server session limits (`isSshSessionLimitError`).
4. Already installed → repair native deps under lock; GC conflict → outer-loop retry; degraded launch allowed on contention.
5. Fresh install: reserve upload-stage slot → SFTP directory upload (+ `.version` via SFTP, chmod bundled node) → acquire install lock → re-probe under lock → atomically promote stage slot (ownership confirmed via authenticated output prefix) → `installNativeDeps` (npm install pinned node-pty@1.1.0 + @parcel/watcher@2.5.6 with script allowlist; toolchain probe; graceful node-pty-less degradation) → finalize with `.install-complete` sentinel.
6. Launch: POSIX probes existing socket → attach with `--connect` (preserves PTY state/scrollback through grace periods) or fresh detached `nohup node relay.js --detached --grace-time N ... &` with readiness polled every 200 ms up to 10 s via net.connect probe (proves accept, not inode existence); Windows uses named pipes + marker files + WMI `Win32_Process.Create` for detached start (sshd kills exec channel trees) + icacls credential hardening.
7. Fence release: locks/claims released only after launch liveness observable; fire-and-forget stale-stage recovery + `gcOldRelayVersions`.

**Versioning & GC — `ssh-relay-versioned-install.ts`**: immutable per-version dirs (VS Code `~/.vscode-server/bin/<commit>` style). GC verifies lock state, sentinel, socket liveness (inconclusive probes never authorize deletion); acquires sibling GC claim, re-verifies, renames to `<dir>.gc-tombstone.<pid>.<ts>` before deletion (isolating fresh installs at original path).

**Locking primitives**: `ssh-relay-install-lock.ts` (per-version `.install-lock` directory via host-native atomic create; poll 1 s; stale threshold 20 min measured with remote clock; steal checked every 60 s); `ssh-relay-gc-claim.ts` (owner-token `.gc-owner` pid-timestamp-uuid; stale after 10 min; conditional release removing only our own token generation); `ssh-relay-repair-lock.ts` (one-shot, classified acquired/busy/gc/error).

**Upload staging — `ssh-relay-upload-stage-{commands,windows-commands,contract}.ts`**: fixed pool slot-0..slot-7 with parallel claim/delete dirs; owner identity is the unguessable SFTP namespace marker name (`.sftp-namespace-<32hex>`); reservation/promotion outputs owner-authenticated so spoofed lines can't hijack slots; stale slots recovered one-per-deploy.

**Namespace integrity — `ssh-relay-install-namespace.ts`, `sftp-namespace-resolution.ts`**: on POSIX hosts over ssh2, shell and SFTP can see different homes ("split namespace"); a random marker created inside the held install lock proves SFTP resolves to the same directory the shell wrote; marker tokens redacted from errors.

**Handshake — `ssh-relay-deploy-helpers.ts`**: `waitForSentinel(channel, signal)` buffers pre-sentinel stdout (64 KiB caps), scans for READY sentinel, converts remote exit 42 into typed `RelayVersionMismatchError` (skip backoff for that terminal condition), returns MultiplexerTransport adapter with write settlement/drain/pause-resume. `ssh-relay-exec-command.ts`: 30 s default timeout, 1 MiB output cap, unconfirmed-termination flagging (deploy code keeps locks/stages for stale recovery rather than cleaning blindly).

**Consumer — `ssh-relay-session.ts`** (~3,041 lines): single authority for relay lifecycle per target; deploys/launches relay, wraps transport in multiplexer, registers filesystem/git/PTY providers, handles relay loss/version mismatch/incarnation recovery/agent hooks/port-scanner wiring.

## 3.6 Remaining File Inventory (groups)

- Config/auth: `ssh-config-parser/loader/include-expander/resolver/host-picker/path-expansion`, `ssh-g-config-resolution`, `ssh-auth-resolution`, `ssh-private-key-authentication`, `ssh-agent-identity-filter`, `ssh-security-key-identity` (FIDO2).
- System transport: `system-ssh-args/binary/command`, `ssh-system-fallback`, `system-ssh-operation-lifecycle`, `ssh-transport-selection`, `ssh-proxy-command`, `ssh-control-socket`, `vscode-ssh-authority`, `ssh-session-limit-error` (MaxSessions detection).
- File transfer: `sftp-upload.ts`, `ssh-file-stream-inactivity-deadline.ts`, `ssh-file-transfer-abort.ts`, `ssh-filesystem-stream-reader.ts`, `ssh-git-response-stream-reader.ts`.
- PTY: `ssh-pty-consumer-session/recovery`, `ssh-pty-frame-rejection`, `ssh-pty-recovery-retention-budget`, `ssh-pty-retired-source-deliveries`, `ssh-pty-targeted-reattach-queue`.
- Remote CLI/orchestration: `ssh-remote-cli-*`, `ssh-remote-fabrica-cli.ts`, `ssh-remote-commands.ts`, `ssh-remote-linear-*`, `ssh-remote-orchestration-{ask,check,post,send}-output.ts`, `ssh-remote-node-*`, `ssh-remote-powershell.ts`.
- Timing: `ssh-relay-deploy-timing.ts`.

---

# 4. Daemon Subsystem (`daemon/`)

Flat folder, ~211 TypeScript files (roughly half production, half co-located tests) plus `fixtures/ratatui-tui.py`. `daemon/AGENTS.md` documents endpoint-ownership invariants ("link → prove dead → rename" protocol and historical defect record).

## 4.1 NDJSON Socket Server Auth

**Protocol layer — `daemon/ndjson.ts`**: `encodeNdjson` + incremental parser; `NDJSON_MAX_LINE_BYTES = 16 MiB`; overflow enters discard mode until next newline (peers that never send newlines can't grow buffers unboundedly).

**Server — `daemon/daemon-server.ts`** (class `DaemonServer`):
- `start()` binds a private name first (POSIX private bind path / Windows named pipe directly), `chmodSync(bindPath, 0o600)` BEFORE publishing "so the endpoint is never briefly reachable with default permissions".
- `publishAndArm(bindPath)`: publish endpoint → publish PID/nonce ownership record (must exist before token makes listener adoptable) → write token file (mode 0600). Token = per-process `randomUUID()`.
- Handshake (`handleFirstMessage`): validation order type → protocol version → **token** (the auth check) → success replies hello with `daemonIdentity {pid, startedAtMs, launchNonce, entryPath?, appVersion?, spawnerExecPath?}`.
- Two roles: `'control'` (RPC) and `'stream'` (PTY output events); fully authenticated only when both sockets said hello (`authenticatedPairEstablished`); RPCs refuse control-only clients.
- Lifecycle safety: initial-adoption timeout (2 min), idle shutdown, endpoint-ownership watchdog (30 s poll, 2 consecutive losses → drain-and-retire).

**Client — `daemon/client.ts`** (class `DaemonClient`): reads token from disk, connects control then stream, sends hello on each, requires `sameDaemonIdentity(controlIdentity, streamIdentity)` or throws "Daemon identity changed during connection". Generation counters (`connectionGeneration`, `connectionAttemptGeneration`) ignore stale close events from old generations.

**PID/nonce/token files — `daemon/daemon-spawner.ts`**:
- Versioned paths: Windows named pipe `\\?\pipe\FABRICA-terminal-host-v<ver>-<sha256(runtimeDir)[:12]>`; POSIX `<runtimeDir>/daemon-v<ver>.sock`; token `daemon-v<ver>.token`; PID `daemon-v<ver>.pid`.
- `DaemonPidFile = {pid, startedAtMs, entryPath?, appVersion?, launchNonce?, linuxStartTicks?, bootId?, spawnerExecPath?}`; published with `{mode:0o600, flag:'wx'}` exclusive create.
- `DaemonSpawner.ensureRunning()` generates a fresh launch nonce per launch so a detached daemon can never delete a replacement's PID file.
- Ownership-checked deletion: `unlinkOwnedDaemonPidFile(pidPath, expectedPid, expectedLaunchNonce)` removes only if pid+nonce match; all deletions go through `claimAndUnlinkOwnedFile()`: **rename to unique `.hold-<pid>-<uuid>` claim name first, inspect, delete-or-restore** — a replacement installed at the canonical path can never be unlinked. Restores use COPYFILE_EXCL so they never clobber newer replacements.

**Endpoint ownership — `daemon/daemon-endpoint-ownership.ts`** (documented in daemon/AGENTS.md):
- Private `.p<hex(10)>` bind name (renamed from `.b` because released builds sweep the old pattern on age alone).
- `publishDaemonEndpoint(boundPath, canonicalPath, probe)`: `linkSync(bound→canonical)`; on EEXIST → `replaceProvenDeadEndpoint()`: capture dev+ino identity, probe once, require proven death (only refused/missing count; timeout/EPERM inconclusive), re-check entry hasn't changed hands, probe again, single atomic rename; post-publish re-stat verification. Outcomes: published | occupied | lost | inconclusive; `DAEMON_EXIT_ENDPOINT_OCCUPIED = 20` tells launcher to adopt rather than fork.
- Watchdog state machine (owned | lost | indeterminate); only positive evidence retires a daemon.

Related: `daemon-endpoint-probe.ts`, `daemon-errors.ts`, `daemon-protocol-version.ts`, `types.ts` (`PROTOCOL_VERSION`, `CLEAN_DISCONNECT_PROTOCOL_VERSION`, `NOTIFY_PREFIX`), `daemon-entry.ts` (CLI: `--socket --token --pid-record --launch-nonce --entry-path --app-version --spawner-exec-path --login-session-watch`; pid-record and nonce must be supplied together), `daemon-ready-identity.ts` (Linux start-ticks + boot-id incarnation markers).

## 4.2 Terminal-Host Sessions / Tombstones / Generations

**Core — `daemon/terminal-host.ts`** (class `TerminalHost`): owns `sessions: Map<string, Session>`; `createOrAttach/write/resize/signal/kill/getSnapshot/takePendingOutput/listSessions/dispose`; `reapSession` disposes dead sessions' emulators "so exited terminals don't pin ~5000 rows of scrollback for the daemon's life"; `DEFAULT_MAX_TOMBSTONES = 1000`.

**Session create — `terminal-host-session-create.ts`**: attach-to-live fast path; refuses sessions mid-teardown ("replacing a SIGKILLed-but-unreaped child could hide two live generations behind the same public session id"); `attachOnly` never spawns; disposes dead predecessors; clears tombstone; resolves WSL context; wires lifecycle callbacks. Supporting: `terminal-host-create-contract.ts`, `terminal-host-options.ts`, `terminal-host-session-listing.ts`, `terminal-host-session-shutdown.ts`, `terminal-host-session-cwd.ts`, `terminal-session-teardown.ts`, `session.ts`.

**Tombstones — `terminal-host-tombstones.ts`**: bounded LRU-ish `Map<sessionId, timestamp>`; kill() records after teardown; `isKilled()` consults; creation clears. Purpose: reject reattach attempts to user-killed sessions. Main-process adapter keeps parallel tombstone map (`daemon-pty-adapter.ts`, refreshed in `shutdownWithHistoryLock()` unless keepHistory — sleep legitimately reattaches on wake).

Disk tombstoning distinct: `terminal-history-session-tombstone.ts` — `removeTerminalHistorySessionTrees()` renames history dirs under `.pending-delete/<uuid>` and drains deletions off critical path (retries 30 s/120 s, startup rescan).

**Agent-session generations — `terminal-host-agent-session-generations.ts`**: `Map<ptyId, generation>`; `isCurrent(owner, isPtyLive)` true only if PTY live AND remembered generation matches claim's — stale claims from previous incarnations of a reused ptyId are discarded. Claim flow in `terminal-host-agent-session-claim.ts` via `ClaimedAgentPtyOwnerRegistry.ensure({claim, surface, spawn, isLive})`; adopted claims attach-only ("an adopted claim must never turn an exit race into permission to spawn an unclaimed shell").

**Incarnations**: each Session exposes `incarnationId`; echoed in create/attach results and exit events so renderers discard output belonging to previous incarnations of reused session IDs. Evidence types in `daemon-incarnation-evidence*.ts`.

## 4.3 Scrollback Checkpoint Serializer + Cold Restore + Corrupt-History Quarantine

**On-disk layout — `history-paths.ts`**: per-session dir `<basePath>/<encodeURIComponent(sessionId)>/` containing `meta.json` (SessionMeta {cwd, cols, rows, startedAt, endedAt, exitCode} — `endedAt === null` is the unclean-shutdown predicate gating cold restore), `checkpoint.json` (full snapshot with monotonically increasing generation), `output.log` (incremental framed log). Byte caps in `terminal-history-file-limits.ts`: meta 64 KiB, log 5 MiB, checkpoint 200 MB, legacy scrollback 16 MiB.

**Incremental log format — `terminal-history-log.ts`**: header magic `'OCKL'` + version + u32le generation; frames = kind + u32le length + payload; kinds: batch (u32le seq), output (utf8), resize (u16le cols+rows), clear. Length prefixes make torn final appends detectable ("reading a corrupt checkpoint is worse than reading a slightly stale one"); non-contiguous seqs make whole log unreadable.

**Writer — `terminal-history-session-writer.ts`**: `appendIncrements` until 5 MiB then returns 'needs-checkpoint'; `checkpoint(snapshot)` serializes within limit, writes tmp + atomic rename, resets log with generation+1, clears recovery protection.

**Checkpoint serializer — `terminal-checkpoint-serializer.ts`**:
- `checkpointFile(snapshot, metadata)` builds TerminalCheckpointFile: snapshotAnsi, scrollbackAnsi, oscLinks, rehydrateSequences, optional pendingEscapeTailAnsi, cwd, cols/rows, modes, scrollbackLines, lastTitle, generation, checkpointedAt.
- `serializeTerminalCheckpointWithinLimit`: (1) hand-rolled bounded JSON writer aborting the moment byte budget would be exceeded (avoids building multi-hundred-MB strings); (2) over budget → replay snapshot into scratch HeadlessEmulator and binary-search largest scrollbackRows count that fits, guaranteeing at least visible-screen-only output.
- Replay pump `cold-restore-replay-writer.ts`: cooperative 64 K chars / 1024 ops per turn with setImmediate yields; never slices between UTF-16 surrogate pairs.

**Reader/validation — `terminal-history-checkpoint-reader.ts`**: full structural validation (ANSI string fields, valid dims, terminal modes incl. bracketedPaste/mouseTracking/applicationCursor/alternateScreen + mouse modes, SGR/kitty flags, OSC-link ranges). Byte-bounded readers in `terminal-history-file-reader.ts` (sync + off-main-thread async).

**Checkpoint triggers** (`daemon-pty-adapter.ts`): periodic ~5 s tick appends increments; full checkpoints rare — clean disconnect, pending-buffer overflow, log cap, sleep teardown (`runExclusiveCheckpoint(..., {final:true, teardown:true})`), guarded serialization + cooldown; forced re-anchor after recovery/warm-reattach.

**Cold restore — `history-reader.ts`** (class `HistoryReader`):
- `probeRestorableHistory(sessionId)` — cheap meta-only predicate.
- `detectColdRestoreState(sessionId, {ignoreCleanEnd?, wslDistro?})`: (1) recovery-protection marker → 'unreadable'; (2) meta endedAt !== null && !ignoreCleanEnd → 'none' (covers probe→create race); (3) prefer **log replay** (byte-exact up to ~5 s before crash vs possibly stale checkpoint) requiring `log.generation === checkpoint.generation` — mismatch discards log; scratch emulator replays under global `PrioritySemaphore(1)` so parallel pane mounts don't multiply replay slices; truncatedTail sets hasUnreadableRecovery; (4) checkpoint alone; (5) legacy `scrollback.bin` fallback; nothing recoverable but files existed → 'unreadable'.
- `listRestorable()` skips quarantine (`.recovery-quarantine`) and pending-delete (`.pending-delete`) entries; newest-N retention (`terminal-history-restorable-retention.ts`).

**Seed delivery — `terminal-history-seed-segments.ts`**: builds ANSI seed for revived emulator — alt-screen: normal buffer + mode reset; normal: [rehydrateSequences, snapshotAnsi, MODE_RESET, pendingEscapeTailAnsi]. Mode reset lives in seed so downstream re-serializers don't inherit a dead TUI's mouse/alt-screen modes. Oversized seeds chunked via out-of-band transfer protocol (`terminal-history-seed-transfer-protocol/registry.ts`). Adapter caches payloads in `cold-restore-payload-cache.ts` (LRU-by-bytes, 16 MiB aggregate) with ack-based eviction (StrictMode double-mount safety). Sleep/wake uses same machinery: final checkpoint → detect → cache → suspendSession.

**Corrupt-history quarantine — `terminal-history-recovery-quarantine.ts`**:
- `fingerprintTerminalHistorySession(basePath, sessionId)` — SHA-256 over sorted dir entries' dev:ino:mode:size:mtimes — generation fingerprint of the history tree.
- Freeze captures fingerprint after quiescing mutations (`TerminalHistoryMutationTracker.wait`); later operations verify unchanged (else `terminal_history_recovery_generation_changed`).
- `quarantineTerminalHistorySession(...)`: re-verify fingerprint → write `.unreadable-recovery` protection marker (fail-closed: blocked rename means later adapters must not attach writers to the unreadable generation) → rename session dir to `<basePath>/.recovery-quarantine/<sha256(sessionId)>/<uuid>`.
- Trigger points: adapter invokes openSession with `quarantineUnreadableRecovery: true` when detection returned 'unreadable'; otherwise openSession throws `terminal_history_recovery_protected` if a marker exists, disabling the session rather than writing onto unreadable data. Marker cleared on next successful checkpoint commit.

## 4.4 Windows ConPTY Warmup

**`windows-conpty-warmup.ts`** — `warmWindowsConptyOnce(spawnPty)`:
- No-op off win32; defers via setImmediate "so the ready/handshake path stays ahead of the warm-up".
- Spawns throwaway `cmd.exe /c exit` (2×1 cells) with `useConptyDll: true` — matching real terminal spawns so the bundled conpty.dll + OpenConsole.exe are warmed, not legacy system ConPTY.
- Pays one-time first-spawn cost at daemon boot instead of user's first terminal: native module load, bundled-binary first launch, Defender scans (~2.7 s first spawn vs ~70 ms after).
- Best-effort: 10 s kill timer cleans stuck shells; all errors swallowed. Wired once at end of `main()` in `daemon-entry.ts` (line 327).

## 4.5 macOS Login-Session Watch

**`macos-login-session-death-watch.ts`** — purpose (#7936): detect that the GUI login session the daemon was born into died (full logout / WindowServer teardown) and retire the daemon so next app start cold-starts a replacement inside the live session. Rationale: in a dead session PAM context can't host login(1) spawns ("Login incorrect" zombies) and Mach bootstrap namespace loses system DNS resolver — every terminal has no egress; retirement is the only converging heal.
- Oracle: existing TCC login-shell PAM probe (`probeMacosLoginSessionAlive` from `../providers/macos-tcc-login-shell`); conclusively accepts while session valid, rejects once destroyed. Retirement additionally requires in-process system resolver explicitly 'unhealthy' (`readResolverHealth`) — inconclusive probe alone can never kill a healthy daemon.
- Arming: flips true only after one conclusive accept ("retire only a daemon that once proved its session could host login(1)").
- Triggers: startup probe, debounced PTY-exit notifications (mass PTY-exit burst looks like logout's SIGHUP sweep), client activity, periodic backstop.
- Decision: single-flight probes; rejection window rebased after sleep/App-Nap timer gaps; requires 3 consecutive conclusive rejects spanning minimum span; then retire only if resolver unhealthy. Probe machinery absent disables watch entirely.
- Timing constants in `login-session-watch-timing.ts` (periodic 120 s, recheck 10 s, min span 120 s, pty-exit debounce 2 s, client-activity gap 30 s, min probe gap 5 s); injectable clock seam.
- Wiring: constructed only when `--login-session-watch` passed AND darwin (GUI-spawned daemons only; headless serve/SSH daemons must survive session loss). Retirement logs `login-session-dead-retire` and `process.exit(1)` — deliberately crash-style, no PTY teardown, so session meta stays unclean and the replacement cold-restores scrollback (ties into §4.3). E2E seam: verdict file replaces PAM oracle.

## 4.6 WSL Cold-Restore CWD

**`wsl-cold-restore-cwd.ts`** — `normalizeWslColdRestoreCwd({recoveredCwd, requestedCwd?, wslDistro?, platform?, hostname?})`. Only active on win32 with a distro. Decision ladder for cwd recovered from disk:
1. Drive path → keep.
2. `\\wsl$\<distro>\...` UNC → keep if distro matches session's (case-insensitive); else fall back to requestedCwd (foreign distro's path would fail).
3. POSIX absolute path → convert via `toWindowsWslPath(path, distro)`.
4. Legacy `\\<hostname>\<share>\...` UNC matching this machine → rewrite to Linux path and convert.
5. Anything unrecognized → requestedCwd.
- Call sites (both in `daemon-pty-adapter.ts`): inside `detectColdRestore()` (~line 444) and sleep-teardown path (~1088).
- Distro resolution: `wsl-session-context.ts` — `resolveWslSessionContext({cwd, sessionId, shellOverride, terminalWindowsWslDistro})`: distro from cwd UNC prefix, else session ID's embedded worktree path (`parsePtySessionId` + `parseWslPath`), else WSL shell name → preferred/default distro. Flows into Session/HeadlessEmulator and cold-restore detection.

## 4.7 Remaining File Inventory (groups)

- Bootstrap/lifecycle: `daemon-main.ts` (`startDaemon` composition root), `daemon-init.ts`, `degraded-daemon-*` (fallback shutdown/fresh-spawn routing/owner recovery/PTY provider/session routing for degraded no-daemon mode), `daemon-health.ts`, `daemon-host-relocation.ts`, `daemon-process-inspection.ts`, `daemon-session-owner-resolution.ts`, `post-ready-flush-gate.ts`.
- Protocol/transport plumbing: `daemon-stream-data-batcher.ts` (per-client ordered batching with droppability + interactive fast-flush), `daemon-stream-data-entry/split/events`, `daemon-stream-droppable-membership.ts` + `daemon-stream-keep-tail-drop.ts` (which queued stream data may be dropped for backgrounded sessions and what tail bytes kept), `daemon-stream-backlog-probe.ts`, `daemon-background-transient-facts.ts` (scans backgrounded output for transient facts — OSC queries, mode 2031 — even when chunks dropped).
- PTY subprocess layer: `pty-subprocess.ts` (node-pty wrapper + foreground-process scanning), `session.ts`, `daemon-pty-router.ts`, `daemon-pty-adapter.ts` (~2.5 k-line main-process facade: spawn/attach/kill/sleep-wake, checkpoint scheduling, cold-restore caching, tombstones, WSL tracking), `daemon-pty-size.ts`, `shell-ready.ts`, `startup-device-attributes-responder.ts`, `xterm-env-polyfill.ts`, `osc7-file-uri.ts` + `osc7-uri-extraction.ts` + `terminal-osc-cwd-title-scanner.ts` (OSC-7 cwd tracking), `terminal-modes.ts` + `terminal-mouse-mode-mirror.ts` + `terminal-mode-rehydrate-sequences.ts` + `terminal-frame-restore-sequences.ts`, `terminal-snapshot.ts` + `terminal-snapshot-ansi-buffers.ts`, `headless-emulator.ts` (+ fidelity/fuzz/bench tests).

## 4.8 Cross-Cutting Invariants Worth Citing in Review

1. **Endpoint ownership** (`daemon-endpoint-ownership.ts` + AGENTS.md): bind private name → exclusive link → prove incumbent dead by connecting → continuity re-check → single atomic rename → post-publish verification. Never unlink canonical endpoint on shutdown.
2. **Owned-artifact deletion** (`daemon-spawner.ts`): rename-to-unique-claim before inspect/delete; exclusive-copy restore; PID records matched on pid+launchNonce.
3. **Fail-closed liveness reasoning**: timeouts/EACCES are never proof of death — endpoint probes, ownership watchdogs, macOS PAM watch alike.
4. **Corrupt > stale is worse**: torn log tails truncate at last complete frame; generation mismatches discard logs; unreadable generations quarantined behind protection markers, never overwritten.

---

# Summary Counts

| Subsystem | Files surveyed | Key themes |
|---|---|---|
| codex + codex-accounts + codex-usage | ~130 (≈60 impl + ≈45 test) | Managed/system CODEX_HOME lanes, per-pane account registry, byte-preserving TOML trust editing, app-server JSON-RPC client, single-flight backfill/heal jobs |
| git | 97 (48 impl + 49 test) | Hardened runner (env/timeouts/tree-kill), concurrent-status read leases, worktree CAS invariants, gh rate-limit circuit breaker, porcelain v1/v2 parsing, 3-mode WSL routing |
| ssh | 210 flat | Generation-guarded connections, flap-aware reconnect ladder, 3-lane multiplexer, local port forwards, versioned relay deploy pipeline with locks/GC/staging |
| daemon | ~211 flat | NDJSON socket auth (pid/nonce/token files), tombstones + agent-session generations, checkpoint serializer + cold restore + quarantine, ConPTY warmup, macOS login-session watch, WSL CWD normalization |

