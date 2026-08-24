# FA Settings / Config / Preferences + Data-Dir Layout — Line-Level Deep Dive (R4-1.15)

> Task R4-1.15 - Group 1 discovery - worker session term_7bd632bb / task_c9b49f1c4174 / ctx_5012ddb06a29.
> Target: `../Fabrica-app` (READ-ONLY). Citations relative to the Fabrica-app repo root.
> Purpose: map the complete settings/config storage subsystem, on-disk layout per OS, env identity, and migration logic to plan the After-Rebrand data migration.

---

## 1. Executive Summary

Fabrica-app has ONE canonical persisted-state store: a single JSON document (`FABRICA-data.json`) inside the Electron `userData` directory, managed by one `Store` class in `src/main/persistence.ts` (7,679 lines; header comment: "persistence keeps schema defaults, migration, and load/save/flush in one file so the storage contract reviews as a unit" — src/main/persistence.ts:1). Around that core sit:

- A profiles layer (`src/main/fabrica-profiles/`) partitioning state per profile under `userData/profiles/<id>/FABRICA-data.json`, with one-time copy-forward migration from the legacy flat file (src/main/fabrica-profiles/profile-index-store.ts:148-158).
- Sidecar files kept out of the main blob for performance: GitHub cache (`FABRICA-github-cache.json`, persistence.ts:364-368), active-view preference (`active-view.json`, src/main/active-view-preference.ts:7), terminal scrollback snapshots (`terminal-scrollback/` dir, src/main/terminal-scrollback-snapshots.ts:21,33-35), stats and usage JSONs, crash reports, mobile pairing credentials, AI-vault parse cache.
- A runtime pointer for the bundled CLI (`FABRICA-runtime.json`) shared between app and CLI via mirrored per-OS default-path logic (src/shared/runtime-bootstrap.ts:45-49; src/cli/runtime/metadata.ts:42-70).
- Load-time migration machinery: NOT schema-version-driven; instead guard-stamped one-shot migrations evaluated on every load (see section 8).

Every identity string in this subsystem is currently the literal FABRICA/Fabrica; section 12 itemizes what breaks or silently forks data under a rename.

---

## 2. App Identity and Where userData Resolves Per OS

### 2.1 Product identity sources

| Artifact | Value | Cite |
|---|---|---|
| npm package name | `"fabrica"` | package.json:2 |
| Version | `1.4.178-rc.2` | package.json:3 |
| Base app name constant | `BASE_APP_NAME = 'Fabrica'` | src/main/startup/dev-instance-identity.ts:5 |
| Windows AUMID | `com.autoscalers.fabrica` (`BASE_APP_USER_MODEL_ID`) | src/main/startup/dev-instance-identity.ts:6 |
| Packaged app name applied at ready | `app.setName(devInstanceIdentity.appName)` -> 'Fabrica' | src/main/index.ts:2120; dev-instance-identity.ts:56-66 (non-dev returns name 'Fabrica') |
| Dev instance AUMID | `com.autoscalers.fabrica.dev.<sha1[:10]>` hashed from repo root | dev-instance-identity.ts:43-49 |
| Dev appName (Keychain key driver) | `'Fabrica Dev'` — stable across branches so all dev instances share one `<appName> Safe Storage` Keychain item | dev-instance-identity.ts:11-15, 80-83 |

### 2.2 userData resolution chain (startup order)

1. `configureDevUserDataPath(is.dev)` runs first (src/main/index.ts:656). Behavior:
   - E2E: uses `FABRICA_E2E_USER_DATA_DIR`, forces an isolated disposable Node home via `FABRICA_E2E_HOME_DIR` (default `<e2eDir>/home`), calls `app.setPath('home', ...)` then `app.setPath('userData', e2eConfig.userDataDir)`; refuses to start if homedir is not the disposable boundary (src/main/startup/configure-process.ts:139-158).
   - Dev with override: honors `FABRICA_DEV_USER_DATA_PATH` (configure-process.ts:163-168).
   - Plain dev: redirects userData to `<appData>/fabrica-dev` so `pnpm dev` cannot clobber the packaged profile or the CLI's runtime pointer (configure-process.ts:169-170).
   - Packaged: no change; Electron default applies.
2. `configureFABRICAUserDataPathEnv()` canonicalizes `process.env.FABRICA_USER_DATA_PATH = app.getPath('userData')` immediately after, because relaunches can inherit a stale value and CLI-shared modules build runtime-home paths from it (configure-process.ts:181-184; called at index.ts:657).
3. Single-instance lock is acquired AFTER step 1 because Electron derives lock identity from userData, separating dev/packaged lock namespaces (index.ts:783-801).
4. `initDataPath()` runs after configureDevUserDataPath but BEFORE `app.setName('Fabrica')` at whenReady, which would otherwise change the resolved path on case-sensitive filesystems (index.ts:823-824). It snapshots `_dataFile = join(userDataPath, 'FABRICA-data.json')` and `_userDataDir` once (persistence.ts:343-352).
5. Same timing for: `initSessionParseCachePersistence` (`<userData>/ai-vault/session-parse-cache.json`, index.ts:826-829), `initFABRICAProfilePaths()` (index.ts:830), `initStatsPath()` / usage stores (index.ts:832-835), `CrashReportStore.fromUserData()` (index.ts:836).
6. Late-resolving `app.getPath('userData')` after setName can resolve differently; consumers must use `getCanonicalUserDataPath()` instead (persistence.ts:492-503).
7. Mobile pairing credentials are copied from any pre-rename legacy userData into the canonical dir at startup: `migrateMobilePairingDataToCanonicalUserDataPath(app.getPath('userData'))` (index.ts:2939; implementation persistence.ts:510-533).

### 2.3 Effective per-OS data directories

Packaged defaults mirror Electron's userData convention keyed off the app name 'Fabrica'; the CLI re-implements the same resolution independently (src/cli/runtime/metadata.ts:42-70):

| Platform | Directory | Cite |
|---|---|---|
| macOS | `~/Library/Application Support/Fabrica` | cli/runtime/metadata.ts:53-55 |
| Windows | `%APPDATA%\Fabrica` (throws runtime_unavailable if APPDATA unset) | cli/runtime/metadata.ts:56-65 |
| Linux | `$XDG_CONFIG_HOME/Fabrica` else `~/.config/Fabrica` | cli/runtime/metadata.ts:66-69 |
| Dev (all OS) | `<appData>/fabrica-dev` unless overridden | configure-process.ts:160-170 |
| E2E | `$FABRICA_E2E_USER_DATA_DIR` (+ disposable home) | configure-process.ts:139-158; src/preload/e2e-config.ts:23; src/main/e2e-config.ts:5-6 |
| Any instance | `$FABRICA_USER_DATA_PATH` wins first in CLI resolution | cli/runtime/metadata.ts:50-52 |

---

## 3. On-Disk Layout Inventory (userData)

All names verified against source:

| File / dir | Owner module | Purpose | Cite |
|---|---|---|---|
| `FABRICA-data.json` | persistence Store | THE state blob: settings + ui + repos + sessions etc. | persistence.ts:348-352 |
| `FABRICA-data.json.bak.0..4` | persistence | rolling backup ring, 5 slots, min 1h spacing | persistence.ts:535-537, 607-609 |
| `FABRICA-data.json.*.tmp` | durable-file-write | fsync-before-rename temp payloads | persistence.ts:4065-4084; stale temps GCd after 24h (persistence.ts:373) |
| `FABRICA-github-cache.json` | persistence sidecar | PR/issue cache snapshotted at quit; memory-only during session to avoid rewriting multi-MB blob each poll | persistence.ts:364-368, comment 6283; read 474-490 |
| `active-view.json` | ActiveViewPreference sidecar | top-level active view ('terminal' etc.), 100ms debounce; split out so navigation never serializes the recovery store | active-view-preference.ts:7-8; persistence.ts:2843-2845 |
| `terminal-scrollback/` | scrollback snapshot store | `v1-<sha256[:32]>.bin` per pane replay buffer; root is sibling of the ACTIVE profile dataFile with fallback to legacy userData root | terminal-scrollback-snapshots.ts:21,29-38; wiring persistence.ts:2834-2839 |
| `FABRICA-runtime.json` | runtime RPC bootstrap | runtimeId, pid, transports (unix/named-pipe/websocket), authToken, startedAt; CLI entrypoint; reclaimed if publisher pid dead | runtime-bootstrap.ts:17-23,45-48; src/main/runtime/runtime-rpc.ts:1233; single-instance-lock.ts:24 |
| `FABRICA-stats.json` | stats collector | aggregate usage stats | src/main/stats/collector.ts:24,30 |
| `FABRICA-claude-usage.json` | claude-usage store | Claude usage samples | src/main/claude-usage/store.ts:145,150 |
| Codex/OpenCode usage files | codex-usage / opencode-usage stores | same pattern (init functions called index.ts:833-835) | src/main/codex-usage/store.ts; src/main/opencode-usage/store.ts |
| `crash-reports.json` | CrashReportStore | durable crash breadcrumbs | src/main/crash-reporting/crash-report-store.ts:87-88 |
| `FABRICA-profile-index.json` (+ `.bak`) | fabrica-profiles | profile registry: schemaVersion 1, activeProfileId, summaries | profile-storage-paths.ts:6; src/shared/fabrica-profiles.ts:4 |
| `profiles/<id>/FABRICA-data.json` | fabrica-profiles | per-profile state copy | profile-storage-paths.ts:7,34-46 |
| `profiles/<id>/browser-session-meta.json` | fabrica-profiles | per-profile browser session meta | profile-storage-paths.ts:5,8,48-56 |
| `profiles/<id>/terminal-scrollback/` | scrollback store | per-profile snapshot root (derived from profile dataFile path) | terminal-scrollback-snapshots.ts:33-35 |
| `FABRICA-devices.json`, `FABRICA-e2ee-keypair.json` | mobile pairing | device registry + E2EE keypair; permission-hardened copies | src/main/runtime/mobile-pairing-files.ts:1-8; persistence.ts:527-531 |
| `ai-vault/session-parse-cache.json` | AI vault | versioned parse cache | index.ts:826-829 |

Outside userData:
- Default workspaces root: `~/Fabrica/workspaces` built platform-aware from homedir (`getDefaultWorkspaceDir`, shared/constants.ts:168-172; consumed by default setting `workspaceDir`, constants.ts:176).

---

## 4. Settings Schema and Defaults

### 4.1 PersistedState top-level shape

`PersistedState` (src/shared/types.ts:3687-3710+): `schemaVersion: number` (types.ts:3688), repos, projects, projectHostSetups, projectGroups, folderWorkspaces, sparsePresetsByRepo, mobileClientTabSelectionsByDeviceId, worktreeMeta, worktreeLineageById, workspaceLineageByChildKey, `settings: GlobalSettings` (types.ts:3701), `ui: PersistedUIState` (3702), githubCache sidecar shape (3703-3706), `workspaceSession` legacy local-host partition (3707-3708), `workspaceSessionsByHostId` per-execution-host partitions (3709-3710). Plus automations, automationRuns, onboarding, sshTargets, deletedSshConfigAliases tombstones, sshRemotePtyLeases, sshPtyConsumerRecoveries, claudeLivePtySessionIds, migrationUnsupportedPtyEntries, legacyPaneKeyAliasEntries, featureInteractionTelemetryBuckets, codexResetCreditAttemptLedger (defaults assembled at constants.ts:425-455).

`SCHEMA_VERSION = 1` (shared/constants.ts:49) — note this has never been bumped; migration strategy does not branch on it (section 8).

### 4.2 GlobalSettings

Defined as one large type at src/shared/types.ts:2778. Defaults live in `getDefaultSettings(homedir)` (constants.ts:174-396), deliberately kept "in one schema-shaped object so migrations and tests compare against one source of truth" (constants.ts:1). Representative groups (all constants.ts line cites):

- Workspace layout: workspaceDir `~/Fabrica/workspaces` (:176), nestWorkspaces (:177), workspaceDirHistory (:178).
- Branch/attribution: autoRenameBranchFromWork (:181), branchPrefix 'git-username' (:183), enableGitHubAttribution false (:185).
- Appearance: theme 'system' (:186), left sidebar tint (:187-189), uiLanguage system (:190), appIcon (:191), appFontFamily 'Inter' (:50,192).
- Terminal (largest block): font family per-platform defaults win32 'Cascadia Mono', linux 'DejaVu Sans Mono', darwin 'SF Mono' (:85-94), size 14 (:206), GPU accel 'auto' (:215), ligatures 'auto' (:217), cursor block (:218), dark/light themes (:221-226), Windows shell 'powershell.exe' (:234), WSL distro null (:235), right-click paste defaulted true only on win32 (:100-102,232-233), mac Option-as-alt 'auto' (:349), scrollback rows (:260), OSC52 clipboard allow (:250-257).
- Runtime/host selection: localAccountRuntime 'auto' (:236), localWindowsRuntimeDefault windows-host (:239), PowerShell implementation 'auto' (:241), activeRuntimeEnvironmentId null (:373).
- Window/tray: windowBackgroundBlur false (:246), minimizeToTrayOnClose false (:247), showMenuBarIcon true (:249).
- Network: httpProxyUrl '' (:261), httpProxyBypassRules (:262), electronHttp1CompatibilityMode false (:263) — this flag is read synchronously at process start from disk before app ready (configure-process.ts:33-57).
- Shortcuts: terminalShortcutPolicy value literal `'FABRICA-first'` (:288) — REBRAND-SURFACE (persisted enum value).
- Floating terminal: enabled true (:289), cwd '~' (:291), trustedCwds [] (:292).
- Notifications nested object (:295; defaults :133-143).
- Tasks: defaultTaskSource 'github' (:330), visibleTaskProviders (:331).
- Agents: agentCmdOverrides/agentDefaultArgs/agentDefaultEnv maps (:340-342), disabledTuiAgents (:318), claudeAgentTeamsMode 'off' (:258).
- Experimental kill switches: C1 series default-on with `!== false` reads so older persisted objects keep behavior (comment :309-316), experimentalMobile (:352), experimentalPet (:363), experimentalActivity (:364), experimentalAgentHibernation (:367) etc.
- Managed accounts: codexManagedAccounts (:302), claudeManagedAccounts (:305).
- Secrets-bearing settings: opencodeSessionCookie '' (:335), httpProxyUrl (above), browserKagiSessionLink in UI state — encrypted at rest (section 6).
- Nested feature configs: githubProjects (:375-380), commitMessageAi (:382-392), sourceControlAi (:393), voice (:394; defaults :398-411).

### 4.3 PersistedUIState

`getDefaultUIState()` (constants.ts:457-521+): lastActiveRepoId/WorktreeId, activeView 'terminal', sidebarWidth 280, right sidebar geometry, groupBy/sortBy/projectOrderBy, host scoping (workspaceHostScope/all, visibleWorkspaceHostIds, workspaceHostOrder), hide/show filters, worktreeCardProperties, workspaceStatuses with four migration guard stamps (_workspaceStatusesDefaultOrderMigrated etc., :497-500), statusBarItems, dismissedUpdateVersion, trustedFABRICAHooks map (:507), one-time notice flags (trayMinimizeNoticeShown :514, osc52ClipboardDefaultOnNoticePending :516, projectOrderManualDefaultNoticeDismissed :520).



---

## 5. Persistence Engine (Store class)

### 5.1 Construction and load

- `export class Store` (persistence.ts:2786). Constructor takes `options.dataFile` so profile switching can instantiate a Store against a different path; default `getDataFile()` (persistence.ts:2824-2826, comment at 2825: "profile switching yields multiple state paths; capture per Store so late async writes can't follow a global path").
- Constructor flow: stale-temp cleanup (2827-2833), scrollback snapshot storage resolution with legacy fallback (2834-2839), `this.load()` (2840), pane-identity normalization (2841), ActiveViewPreference sidecar init seeded from loaded ui.activeView (2845), legacy alias/unsupported-PTY registration (2847-2860), and `scheduleSave()` if any load-time migration mutated state (`loadNeedsSave` / normalized.changed / adaptedProjectGroups, 2861-2864).

### 5.2 Load path and recovery

- `load(allowBackupRecovery = true)` (persistence.ts:3053): reads dataFile sync (3065), JSON.parse (3071), decrypts protected secrets at the boundary — opencodeSessionCookie (3075-3081), httpProxyUrl with STA-3442 fail-closed semantics clearing undecryptable garbage (3082-3106), browserKagiSessionLink (3107-3113), SSH PTY owner leases per-target-slot (3114-3138).
- Defaults merge: `getDefaultPersistedState(homedir())` merged under parsed payload so new fields appear automatically ("Merge with defaults in case new fields were added", 3140-3142; final spread `...defaults, ...parsed` at 3398-3400).
- Backup recovery: on unusable primary, `restoreFromBackup` walks `.bak.0..4`, JSON-validates each slot, rewrites the primary from the first parseable copy (3033-3051).
- Corrupt host session partitions drop to defaults independently without poisoning others (parseWorkspaceSessionsByHostId, 569-605).

### 5.3 Write path

- `scheduleSave()` (3908-3928): debounce SAVE_DEBOUNCE_MS with SAVE_MAX_WAIT_MS cap; refuses to schedule after quit flush started (3912-3914).
- `enqueueWrite()` serializes writes behind the previous pending write + snapshot file work (3930-3947).
- Payload build `buildStateToSave()` (3961-4048): clones durable state (githubCache omitted as memory-only, 3954-3958), encrypts secret slots via sentinel substitution (`FABRICA-secret-slot-<uuid>`) to keep position-exact replacement safe from user-controlled lookalike values (3966-3992), single JSON.stringify compacted for ~20% fewer bytes (4029-4031), sha1 guard hash computed with degraded-safeStorage salt prefix (4043-4046).
- Async write `writeToDiskAsync()` (4051-4118): skips byte-identical writes by hash (4057-4061); tmp file -> fsync -> renameDurable (fsync dir) via durable-file-write module (4070-4084); generation guards prevent an older async write overwriting fresher state (4079-4081, 4096-4104); backup rotation only after successful rename (4113-4117).
- Sync twin `writeToDiskSync()` (4121-4163) used by `flushOrThrow()` (4165-4193) at shutdown where the process may exit before async completion; bumps writeGeneration to invalidate in-flight async renames (4176).
- Backup ring rotation: async (2968-3002) and sync (3004-3031) variants; 5 slots (BACKUP_COUNT, 536), min interval 1h measured on .bak.0 mtime (2947-2965) "so a corrupt/empty write leaves an earlier copy recoverable" (#1158, 535).
- Quit path: `flushAsync()` (7475) marks quitFlushStarted so it is the final write by construction (2801-2803, 3909-3914); active-view sidecar flushed alongside (flushActiveViewPreferenceOrThrow 4195-4197).

### 5.4 Mutation boundaries

- `updateSettings(updates, options)` (5808-5996): strips legacy scrollback-bytes key (5812), drops retained blobs when secrets cleared (5813-5818), strict boolean coercion for tray/menu/artifact-sharing keys (5819-5829), normalizes ~20 specialized keys through shared normalizers (5830-5942), maintains workspaceDirHistory on layout change via buildWorkspaceDirHistoryForUpdate (5943-5949; impl 619-647), deep-merges telemetry block so partial updates do not clobber installId (5950-5954), projects sourceControlAi <-> legacy commitMessageAi bidirectionally (5955-5974), then shallow-merges settings, schedules save (5985), computes changed-keys diff, notifies listeners only when notifyListeners===true (5986-5995).
- Listener registration: `onSettingsChanged` (5768-5779) and `onUIChanged` (5791-5796); UI notifications keep desktop/mobile bi-directional sync (comment 5790).

### 5.5 Maintenance built into persistence

- worktreeMeta GC: removes local-host entries whose worktree path vanished after a 30-day idle grace; SSH/WSL paths exempt because existsSync cannot probe them truthfully (370-429).
- Stale durable-write temps removed at construction after 24h (373; constructor 2827-2833).
- Automation run pruning/backfilling via shared retention helpers (imports 162-165).

---

## 6. Secrets Protection Layer

- `ProtectedSecretPersistence` wraps Electron `safeStorage` (src/main/protected-secret-persistence.ts:1,33): encrypt(slot, plaintext) returns base64 blob of `safeStorage.encryptString` when available (57-90); sealed-slot bookkeeping prevents double encryption and enables no-op hash equality.
- Slots today: opencodeSessionCookie, httpProxyUrl, browserKagiSessionLink, per-target sshPtyOwnerLease slots (PROTECTED_SECRET_SLOT usage persistence.ts:284-289, encrypt sites 4003-4027, decrypt sites 3075-3138).
- Keychain/credential-vault item name follows app name: "<appName> Safe Storage" — dev keeps 'Fabrica Dev' stable across branches deliberately (dev-instance-identity.ts:11-15,80-83).
- File permission hardening for credential copies: `hardenExistingSecureFile` re-asserts current-user-only ACLs after copyFileSync drops Windows ACLs (persistence.ts:527-531); general hardening utilities in src/shared/secure-file.ts (hardenSecurePathOnce, secure-file.ts:64; caching layer secure-file.ts:43-56).

---

## 7. Profiles Subsystem (fabrica-profiles)

- Path constants: legacy flat names vs per-profile names are identical basenames (`FABRICA-data.json`, `browser-session-meta.json`) distinguished by directory; index `FABRICA-profile-index.json`; dir `profiles/` (profile-storage-paths.ts:4-9). Path builders :26-46; legacy-path helpers :58-72; LEGACY_BACKUP_COUNT=5 (:11).
- Index schema v1 (`FABRICA_PROFILE_INDEX_SCHEMA_VERSION = 1`, shared/fabrica-profiles.ts:4); default profile id literal `'local-default'` (fabrica-profiles.ts:5).
- Profile summary validation is strict: id must match `/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/` BECAUSE ids become filesystem path segments — tampered index must not escape profiles dir (profile-index-store.ts:63-67).
- Corrupt-index resilience: `readProfileIndex` falls back to `<index>.bak`, since silently resetting to one default profile would orphan every other profile's data dir (114-118). Write path backs up only still-parseable indexes then tmp+rename (120-134).
- Legacy migration: `ensureActiveFABRICAProfile` creates initial index if absent, mkdirs the profile dir, and for the default profile calls `copyLegacyStateToProfile` which copies FABRICA-data.json, browser-session-meta.json AND all 5 legacy backups forward via tmp+rename copyIfPresent (148-158, 210-244). Guards make it idempotent (copyIfPresent skips when target exists, 136-146).
- New-profile telemetry consent seeding copies the active profile consent block so extra profiles do not reset opt-out or mint a second installId (160-180).
- Profile switching freezes Store writes during transfer so a late flush of stale in-memory state cannot resurrect moved projects (writesFrozen flag, persistence.ts:2799-2800).
- Per-project transfer machinery lives in profile-project-transfer*.ts / profile-project-state-file.ts (dir listing src/main/fabrica-profiles/, 48 files incl. tests).

---

## 8. Migration Logic Catalog (load-time, guard-stamped)

No version-keyed migration table exists; instead each migration is a one-shot guarded transform inside `Store.load()`, setting `this.loadNeedsSave` so the rewritten canonical form persists once. Inventory (all in persistence.ts unless noted):

| Migration | Guard stamp | Lines |
|---|---|---|
| Terminal scrollback bytes->rows | presence of terminalScrollbackRows key | 654-689 |
| TUI scroll sensitivity default flip (3->1) | terminalTuiScrollSensitivityDefaultedToOne | 691-713 area |
| Agent YOLO args/env defaults | agentYoloDefaultsMigrated | 718+ ; check 3310-3317 |
| SourceControlAi from legacy commitMessageAi (both directions) | absence of settings.sourceControlAi / .actions | 3153-3168 |
| Mac Option-as-alt 'true'->'auto' | terminalMacOptionAsAltMigrated | 3169-3176 |
| Floating terminal enable default-on | floatingTerminalDefaultedForAllUsers | 3177-3182 |
| OSC52 clipboard default-on | terminalAllowOsc52ClipboardDefaultedOnForAllUsers | 3183-3190 |
| Floating cwd -> app workspace + trusted-cwd grant | floatingTerminalCwdMigratedToAppWorkspace | 3191-3233 |
| Experimental Activity default-off | experimentalActivityDefaultedOffForAllUsers | 3234-3239 |
| Auto-rename-branch default-on | autoRenameBranchFromWorkDefaultedOn | 3240-3248 |
| Cursor style default-block | terminalCursorStyleDefaultedToBlock | 3246-3253 |
| Right-click paste platform default | terminalRightClickToPasteDefaultedForPlatform | 3257-3261 |
| Jira provider add-on rollout | visibleTaskProvidersDefaultedForJira | 3272-3301 |
| Primary-selection middle-click platform defaults | ...DefaultedForLinux / ...DefaultedForTerminalDefaults | 3283-3298 |
| Claude agent teams disabled-by-default | claudeAgentTeamsDefaultDisabledMigrated | 3302-3323 |
| Windows runtime default derivation (WSL-aware #9537) | localWindowsRuntimeDefault presence; localAccountRuntimeDefaultedToAutoForAllUsers | 3324-3345 |
| Onboarding lastCompletedStep remap + normalization | normalizeLoadedOnboardingState; ONBOARDING_FLOW_VERSION 4 (constants.ts:62) | 3349-3355; 1242+ |
| Sidekick->Pet experiment rename | readLegacySidekickFlag | 3423-3425; 1397 |
| Compact cards graduation (experimental flag dropped) | explicit undefined write 3452 | 3357-3360 |
| UI sortBy 'recent'->smart sort | _sortBySmartMigrated | 3504-3508 |
| Workspace statuses workflow/visual/order repairs | four _workspaceStatuses*Migrated stamps | 3518-3544 |
| Inline-agents card property default | _inlineAgentsDefaultedForAllUsers | 3546-3560 |
| Pane identity remap (legacy numeric pane keys -> stable leaf ids) with unsupported-entry quarantine | normalizePersistedPaneIdentityState + legacyPaneKeyAliasEntries | 2160-2272; registration 2847-2852 |
| Folder-scan flat groups -> nested sparse scopes | adaptFlatFolderScanProjectGroups (constructor) | 2867-2944 |
| SSH target id migration (ui + workspace sessions) | migrateUiHostScopeSshTargetId etc. (imports 144-147) | ssh/ssh-target-id-migration.ts |
| Scrollback snapshots into per-profile root | migrateWorkspaceSessionTerminalScrollbackSnapshots (+async variant imports 270-280) | terminal-scrollback-snapshots.ts |
| Mobile pairing credentials to canonical userData (post-rename-safe pattern already present!) | copy-if-absent pair copy | persistence.ts:510-533; call site index.ts:2939 |
| Legacy flat data file -> profiles/<local-default>/ | ensureActiveFABRICAProfile copyLegacyStateToProfile | profile-index-store.ts:148-158,230-232 |

Cross-version compatibility patterns worth copying in rebrand migration: `!== false` reads for old kill switches (constants.ts:309-316 comment), one-time flips that preserve later opt-outs (e.g. 3179-3182 comment "early builds persisted the old off default; flip only unmigrated profiles so a later opt-out survives reload"), and rollback-compat projection commitMessageAi refreshed from sourceControlAi for older builds (3494-3498).

---

## 9. Preference UI Plumbing

### 9.1 Main-process IPC surface (src/main/ipc/settings.ts, registerSettingsHandlers :68-318)

- `settings:get` (94-96), sync variant `settings:get-sync` sendSync so PTY transport creation before async hydration reads persisted authority synchronously (111-118), `settings:set` (120-279), `settings:set-active-runtime-environment-preference` (281-296), `settings:listFonts` (298-300), Ghostty/Warp theme import previews (302-309), github cache get/set (311-317), PR bot author override (98-109), agentAwake status (72-82).
- Renderer-write sanitization: pluginConsents and disabledPlugins deleted from renderer payloads — main-owned authority via dedicated reviewed-fingerprint handlers (46-55); activeRuntimeEnvironmentId and floatingTerminalTrustedCwds likewise stripped (122-127).
- `settings:set` side effects: nativeTheme.themeSource on theme (184-186), agent-status managed hook reconciliation (204-225), i18n + app menu rebuild on language change (226-229), worktree-root preparation + watcher resync on workspaceDir/nestWorkspaces change (230-236), appearance menu rebuild (237-239), Electron proxy application (240-246), appIcon application (247-249), whitelisted `settings_changed` telemetry events with value_kind bool only (251-276; whitelist import :10, Set :37-40).
- Cross-window fanout: store.onSettingsChanged listener sends `settings:changed` to every window EXCEPT the origin webContents (84-92).

### 9.2 Preload bridge (src/preload/index.ts)

settings API: get (:2029), getSync (:2032), set (:2035), setActiveRuntimeEnvironmentPreference (:2040), updatePrBotAuthorOverride (:2043), listFonts (:2045), ghostty/warp preview (:2048,:2051), onChanged subscription to `settings:changed` (:2058-2059).

### 9.3 Renderer store slice (src/renderer/src/store/slices/settings.ts, 237 lines)

- SettingsSlice shape (32-38); fetchSettings hydrates via window.api.settings.get and refreshes runtime environment status coverage (169-188); updateSettings/updateSettingsOrThrow persist through api.settings.set after client-side normalization mirroring main's normalizers (58-124,126-137); setActiveRuntimeEnvironmentPreference probes reachability (15s timeout status RPC, 150-163) then switches and refetches repos/worktrees/browser profiles (202-236).
- Optimistic-free model: renderer never mutates settings locally except from server echo (131-136) or `settings:changed` pushes.

### 9.4 Settings UI structure

- 534 files in src/renderer/src/components/settings/ (file count measured this scan), plus navigation taxonomy in src/renderer/src/lib/settings-navigation-types.ts: 35 nav targets ('general','integrations','accounts','browser','git','tasks','appearance','input','floating-workspace','terminal','quick-commands','notifications','computer-use','developer-permissions','privacy','advanced','dev','voice','shortcuts','stats','ssh','experimental','plugins','agents','orchestration','artifacts','automations','FABRICA-account','linear','setup-guide','servers','mobile','mobile-emulator','repo') and 3 intents (settings-navigation-types.ts:15-56).
- Search subsystem: settings-search.ts + settings-search-keywords.ts + per-domain search modules (automations-settings-search.ts, artifacts-settings-search.ts, fabrica-account-settings-search.ts, mobile-settings-search.ts) feeding createSettingsSearchState in the store slice (store/slices/settings-search-state.ts).
- Hydration interplay with onboarding wizard: components/onboarding/onboarding-settings-hydration.ts.

---

## 10. Environment Identity (env vars)

~130 distinct `process.env.FABRICA_*` variables referenced across src (rg enumeration this scan). Groups:

- Data-dir identity: FABRICA_USER_DATA_PATH (canonicalized configure-process.ts:181-184; consumed cli/runtime/metadata.ts:50-52), FABRICA_DEV_USER_DATA_PATH (configure-process.ts:163-168), FABRICA_E2E_USER_DATA_DIR / FABRICA_E2E_HOME_DIR / FABRICA_E2E_HEADLESS (main/e2e-config.ts:5-6; preload/e2e-config.ts:23).
- Dev instance identity: FABRICA_DEV_REPO_ROOT / _BRANCH / _WORKTREE_NAME / _INSTANCE_LABEL / _DOCK_TITLE / _STABLE_NAME / _MACOS_BUNDLE_ID (consumed dev-instance-identity.ts:69-76).
- Runtime/process wiring: FABRICA_APP_VERSION (set index.ts:640), FABRICA_AGENT_HOOK_{ENDPOINT,ENV,PORT,TOKEN,VERSION}, FABRICA_AGENT_LAUNCH_TOKEN, FABRICA_CLI_COMMAND/_CWD/_INSTALL_PATH, FABRICA_RELAY_PATH, FABRICA_PANE_KEY/_TAB_ID/_TERMINAL_HANDLE/_WORKTREE_ID/_WORKSPACE_ID/_WORKSPACE_NAME (agent-hook env injection).
- Network compat: FABRICA_DISABLE_HTTP2 env override beats persisted setting, parsed with 1/true/yes/on vs 0/false/no/off vocabularies (configure-process.ts:9-31,49-57).
- Provider homes: FABRICA_CODEX_HOME, FABRICA_OPENCODE_CONFIG_DIR, FABRICA_MIMOCODE_HOME, FABRICA_PI_CODING_AGENT_DIR, FABRICA_OMP_CODING_AGENT_DIR and matching *_SOURCE_* mirrors.
- Feature gates/diagnostics: FABRICA_STARTUP_DIAGNOSTICS, FABRICA_DIAGNOSTICS_DISABLED/_TOKEN_URL, FABRICA_TELEMETRY_DISABLED, FABRICA_MULTI_PROFILE_UI, FABRICA_FEATURE_REMOTE_AGENT_HOOKS, FABRICA_HANG_WATCHDOG_*, FABRICA_DAEMON_*.
- Cloud/auth: FABRICA_CLOUD_AUTH_TOKEN, FABRICA_CLOUD_DEV_{DISPLAY_NAME,EMAIL,USER_ID}, FABRICA_HOST_ONLY_SECRET, FABRICA_PAIRING_CODE, FABRICA_REMOTE_ACCESS_PAIRING_INPUT.
- Browser partition identity: `persist:FABRICA-browser` constant shared main/renderer (constants.ts:64-66) — persisted Chromium partition name, REBRAND-SURFACE (renaming forks existing browser profile data).

---

## 11. CLI/App Shared Data Dir Contract

- The bundled CLI locates the running desktop runtime by reading `FABRICA-runtime.json` from the SAME userData dir the app uses, resolved by getDefaultUserDataPath mirroring Electron per-OS defaults with the literal 'Fabrica' (cli/runtime/metadata.ts:42-70, esp. comments 66-68: "the CLI must find the same metadata file Electron writes... mirrors Electron's default userData base").
- Metadata content: runtimeId/pid/transports/authToken/startedAt (runtime-bootstrap.ts:17-23); unix socket or named pipe endpoint required (cli/runtime/metadata.ts:15); legacy singular `transport` field supported (runtime-bootstrap.ts:25-43).
- Ownership watchdog: FABRICA-runtime.json is "the CLI's only pointer at a live runtime" and is reclaimed from dead publishers (src/main/runtime/runtime-metadata-ownership-watch.ts:5; runtime-rpc.ts:1233).
- CLI handlers also read/write FABRICA-data.json directly for offline commands (e.g. agent hooks off: cli/handlers/agent-hooks.ts:14,29,38,85 using getDefaultPersistedState).
- Single-instance lock file lives under userData too; lock acquired AFTER userData redirection (index.ts:783-801; startup/single-instance-lock.ts:24).

---

## 12. Rebrand Impact Analysis (Fabrica -> new brand)

Ranked by blast radius. Every row is a concrete code site that must change OR be handled by a data-forwarding migration.

### 12.1 Hard breaks (data fork or feature loss if unhandled)

1. userData directory NAME derives from app name 'Fabrica': packaged macOS `%AppSupport%/Fabrica`, win32 `%APPDATA%\Fabrica`, Linux `$XDG_CONFIG_HOME/Fabrica` (metadata.ts:53-69) and Electron resolves userData from the app/product name (setName 'Fabrica', index.ts:2120; BASE_APP_NAME dev-instance-identity.ts:5). A rename WITHOUT `app.setPath('userData', <old Fabrica dir>)` forwarding forks every user's state. Mitigation precedent already in-tree: mobile pairing credential copy-forward (persistence.ts:510-533) shows the intended pattern (copy-if-absent both members of a pair, ACL-harden).
2. OS keychain/credential vault item '<appName> Safe Storage' changes with appName -> ALL safeStorage ciphertext becomes undecryptable. Fail-closed handling exists for httpProxyUrl (clears, persistence.ts:3082-3106) but opencodeSessionCookie/Kagi/SSH leases would decrypt-fail similarly; users lose stored secrets once. Dev branch history proves the coupling (dev-instance-identity.ts:11-15).
3. Persisted enum value `'FABRICA-first'` for terminalShortcutPolicy (constants.ts:288; normalizer normalizeTerminalShortcutPolicy imported persistence.ts:186) — renaming the value strands existing profiles unless the loader maps old->new (guard-stamp pattern available).
4. Browser partition string `persist:FABRICA-browser` (constants.ts:64) renames => Chromium cookies/storage/localStorage for the embedded browser orphan on disk.
5. All `FABRICA-*` filenames (section 3 inventory) embed the brand. Renaming them requires either keeping filenames stable (recommended: they are user-invisible) or a full-directory migration including backup rings (.bak.N), profile dirs, and the CLI contract below.

### 12.2 Cross-component contracts that must move together

6. CLI/app shared pointer: FABRICA-runtime.json name + mirrored per-OS path logic duplicated between app (runtime-bootstrap.ts:45-48) and CLI (metadata.ts:42-70). Any rename must land BOTH sides simultaneously or the bundled CLI loses the running app; note the CLI also ships to users who may mix versions during rollout.
7. Env-var namespace: ~130 FABRICA_* variables (section 10) are consumed by hooks, spawned agents, wrapper scripts, and CI. Renaming the prefix breaks third-party scripts and mixed-version agent hooks; recommend aliasing old names indefinitely rather than cutover.
8. AUMID / bundle id com.autoscalers.fabrica (dev-instance-identity.ts:6) and dev hashing scheme (43-49) — affects Windows taskbar grouping, notifications identity, deep-link registration handled elsewhere.
9. Default workspaces root ~/Fabrica/workspaces (constants.ts:168-172) — user-visible folder; renaming leaves existing worktrees stranded unless workspaceDir setting migrates and old roots stay valid.
10. Hook bundles named 'FABRICA-status' installed into agent config homes (antigravity/hook-service.ts:36; same family across claude/codex/grok/devin hook services) — uninstall/reinstall cycle needed per agent on rename.

### 12.3 Cosmetic-but-pervasive

11. Settings nav target id 'FABRICA-account' (settings-navigation-types.ts:43) and component fabrica-account-settings-search.ts — internal ids, low risk, but deep links may persist in docs/automation.
12. Sentinel token `FABRICA-secret-slot-<uuid>` (persistence.ts:3989) is transient per-write, safe to rename freely.
13. Error strings/log tags mentioning FABRICA runtime metadata (metadata.ts:18,28) — user-facing CLI messages.

### 12.4 Recommended rebrand migration sequence (from evidence)

a. Keep on-disk filenames and partition strings unchanged (opaque identifiers); change only display surfaces. This avoids items 1,3,4,5,6 entirely.
b. If userData dir must change: early-startup forwarding shim — resolve NEW dir; if empty and OLD 'Fabrica' dir exists, move/copy the tree (including profiles/, backups, pairing credentials) using the migrateMobilePairingDataToCanonicalUserDataPath copy-if-absent + harden pattern generalized (persistence.ts:510-533), then setPath BEFORE initDataPath (ordering constraints index.ts:823-831 apply identically).
c. Secrets: pre-rename export/re-encrypt is impossible cross-keychain-item; plan a graceful re-auth UX for opencode cookie/proxy/Kagi/SSH lease holders, leveraging the existing fail-closed clear paths (persistence.ts:3082-3106) rather than fighting safeStorage.
d. Enum value migrations ('FABRICA-first' etc.) ride the established guard-stamp one-shot mechanism (section 8 pattern) with a new stamp field.
e. Env aliases: introduce new-prefix names reading old fallback (single helper), deprecate loudly, never hard-remove within LTS horizon.

---

## 13. Scan Coverage Statement

READ (full or substantial):
- package.json (identity lines)
- src/main/startup/configure-process.ts (FULL, 310 lines)
- src/main/startup/dev-instance-identity.ts (FULL, 92 lines)
- src/shared/constants.ts (FULL, 548 lines)
- src/main/fabrica-profiles/profile-storage-paths.ts (FULL, 72 lines)
- src/main/fabrica-profiles/profile-index-store.ts (FULL, 327 lines)
- src/shared/runtime-bootstrap.ts (FULL, 49 lines)
- src/cli/runtime/metadata.ts (FULL, 70 lines)
- src/main/ipc/settings.ts (FULL, 318 lines)
- src/renderer/src/store/slices/settings.ts (FULL, 237 lines)
- src/renderer/src/lib/settings-navigation-types.ts (FULL, 105 lines)
- src/main/persistence.ts (targeted regions: header/imports 1-290; data-path & GC & backups 291-689; Store ctor/write machinery 2790-4207; settings mutation 5760-6059; plus function index via rg over all 7,679 lines)
- Targeted greps/reads: shared/types.ts (PersistedState 3670-3710, GlobalSettings anchor 2778), main/index.ts (600-860, identity/migration call sites 2118-2120, 2939), protected-secret-persistence.ts (structure grep), terminal-scrollback-snapshots.ts (1-60), stats/collector.ts + claude-usage/store.ts (path-init lines), crash-report-store.ts (87-88), runtime/mobile-pairing-files.ts (FULL, short), shared/fabrica-profiles.ts (constants), shared/secure-file.ts (hardening anchors), preload/index.ts (settings API region 2029-2059), preload/e2e-config.ts + main/e2e-config.ts (anchors), fabrica.yaml (root, 3 lines), cli/handlers/agent-hooks.ts (data-file anchors).

ENUMERATED (not line-read): full FABRICA_* env var catalog (rg -o unique list, ~130 entries, section 10); components/settings file inventory (count only, 534 files; individual UI panes NOT read — out of scope for storage focus); fabrica-profiles remaining 40 modules (transfer/cloud/session files listed, not read; index-store + storage-paths cover the on-disk contract).

SKIPPED (justified): node_modules/, out/, dist build outputs; tests/*.test.ts beyond cite targets; mobile/ and relay/ trees (separate subsystems, covered by R4 tasks R4-1.x siblings); agent hook-service implementations for claude/codex/grok/devin beyond the FABRICA-status naming cite; runtime environments store internals (resolveEnvironment) beyond its IPC boundary cite.

Claim audit trail: every file:line above was read directly in this session against ../Fabrica-app working tree at version 1.4.178-rc.2 (package.json:3).
