# R4-1.1 — Fabrica-app IPC Surface + File Watchers (Line-Level Deep Dive)

> Task: ATLAS R4-1.1 (Group 1 Round 4 deep dive). Read-only scan of `../Fabrica-app/src` (Electron app; code-internal brand "FABRICA"). Every claim carries a file:line citation. Paths are relative to `Fabrica-app/` unless prefixed.
>
> Method: exhaustive `rg` sweeps for `ipcMain.handle(`, `ipcMain.on(`, `ipcRenderer.invoke(`, watcher primitives (`fs.watch`, `@parcel/watcher`, `chokidar`), plus full reads of the watcher subsystems and the registration hub. Two parallel deep-scan passes (watchers; renderer entry points + cross-repo overlap) merged into this document.

---

## 1. Executive Summary

- The main process registers **344 literal-string `ipcMain.handle` invocations covering 342 unique channels across 65 files**, plus **33 literal `ipcMain.on` fire-and-forget channels** and a handful of constant-named and template-literal registrations (§3).
- All renderer traffic funnels through ONE preload bridge file: `src/preload/index.ts` contains **656 `ipcRenderer.invoke` call sites** spread over **76 bridge namespaces**, exposed to the renderer as `window.api` and `window.electron` via `contextBridge.exposeInMainWorld` at `src/preload/index.ts:4914-4915`. The renderer never touches `ipcRenderer` directly (verified, §6.3).
- Channel naming convention is uniformly `<namespace>:<action>` (e.g. `pty:write`, `git:status`, `fs:watchWorktree`), with the namespace matching the preload API group 1:1.
- File watching is a **four-tier architecture**: (1) an Explorer worktree watcher (`filesystem-watcher.ts`) with local @parcel/watcher roots, WSL in-distro pollers, and SSH remote watchers; (2) a **crash-isolated forked child process** that owns the native `watcher.node` handle (`parcel-watcher-*`, ~30 files); (3) a **runtime watcher process pool** for headless/remote serve contexts (`runtime-watcher-*`); (4) purpose-built secondary watchers (worktree base dirs, git-common dirs, native-chat transcripts, plugin dev). All share one batching window: trailing 150 ms / max-wait 500 ms / overflow cap 5,000 events (`shared/filesystem-watch-batch-window.ts:4-5`, `src/main/ipc/filesystem-watcher-event-batch.ts:3`).
- Overlap mapping: buzz's Tauri command registry is the closest structural cousin (324 `#[tauri::command]` handlers vs Fabrica's 344 IPC handlers); mission-control has no push transport at all (HTTP polling only). **Neither reference repo has any filesystem-watcher capability** — that layer is net-new Fabrica engineering (§7).

---

## 2. Architecture: How a Renderer Call Reaches Main

### 2.1 The three hops

1. **Renderer → preload**: renderer code calls plain property chains on the global `window.api.<namespace>.<method>` (no wrapper module). Examples: `window.api.ui.isMaximized()` at `src/renderer/src/App.tsx:276`; `window.api.pty.write(...)` at `src/renderer/src/runtime/runtime-terminal-inspection.ts:160`.
2. **Preload → main**: each bridge method maps 1:1 to `ipcRenderer.invoke('<namespace>:<action>', args)` or `.send()` inside `src/preload/index.ts`. Examples: `worktrees:create` at `preload/index.ts:798`, `settings:set` at `:2035`, `skills:discover` at `:2498`, `dashboard:requestSnapshot` at `:2376`, `git:status` at `:3313`, `runtimeEnvironments:call` at `:4411`, `automations:list` at `:4632`, `nativeChat:readSession` at `:4261`.
3. **Main**: handler modules register `ipcMain.handle(channel, fn)`; they are aggregated by a single hub.

### 2.2 Registration hub — `src/main/ipc/register-core-handlers.ts`

- Single entry point `registerCoreHandlers(...)` at `register-core-handlers.ts:109-234`; imports ~50 `register*Handlers` functions (lines 1–72).
- **Register-once guard**: module-level `registered = false` flag (`:97`); re-invocation returns early because `ipcMain.handle` throws on duplicate channel registration (macOS activate cycle) — comment `:129-140`.
- Per-window trusted-renderer webContents IDs are refreshed on every call before the guard: `setTrustedBrowserRendererWebContentsId`, `setTrustedClipboardRendererWebContentsId`, `setTrustedUIRendererWebContentsId` (`:133-135`) — several handler families enforce sender identity against these (see `browser.ts` imports `:35-39`, `clipboard-ipc-handlers.ts:70-72`, `ui.ts:53`).
- Conditional families: automations (`:181-183`), keybindings (`:184-188`), plugins/marketplaces (`:189-191`), crash reporting (`:160-162`), commit-message agent env for filesystem (`:209-213`), AI Vault runtime hooks wired from lifecycle options (`:218-229`).
- Diagnostics/telemetry isolation note: `ipc/diagnostics.ts` imports only from `src/main/observability/`, never `telemetry/` (comment `:172-175`).

### 2.3 Handlers registered OUTSIDE the hub

Not everything lives in `register-core-handlers.ts`:

| Handler family | Registered where | Evidence |
|---|---|---|
| Window chrome (min/max/close/menu, traffic lights, focus relays) | `src/main/window/createMainWindow.ts` | `ipcMain.on('ui:window-revealed')` :144; focus channels :510/:519/:533/:542/:551; traffic lights :1077; min/max/close/popup :1119-1126; `isMaximizedChannel` handle :1123 |
| Clipboard | `src/main/window/clipboard-ipc-handlers.ts` | `clipboard:readText` :89, write family :160/:164/:168/:175 |
| Updater + pending-open consume + file-drop relay | `src/main/window/attach-main-window-services.ts` | `updater:getStatus/getVersion/check/download/quitAndInstall/dismissNudge/dismissAvailableUpdate` :547-556; linux package :559-567; `app:reload` :296; popout consume/acknowledge/release/dismiss handles :255-268; `terminal:tabCreateReply` :406; file drop relay :528 |
| Tab-create/tab-close replies (runtime + window) | `src/main/runtime/fabrica-runtime.ts:25788,26169`, `fabrica-runtime-browser.ts:1420,1661,1755`, `window/terminal-tab-close-request-relay.ts:39`, `window/mobile-markdown-request-relay.ts:51` | `ipcMain.on('terminal:tabCreateReply')`, `browser:tabCreateReply/tabCloseReply/tabSetProfileReply`, `ui:terminalTabCloseResponse`, `ui:mobileMarkdownResponse` |
| Star-nag | `src/main/star-nag/service.ts:78-87` | 10 `star-nag:*` handles |
| Worktree base-dir watcher sync | hooked at `src/main/window/attach-main-window-services.ts:118` (not IPC itself) | see §5.5 |

---

## 3. Channel Inventory (Ground-Truth Counts)

Sweep method: `rg -o "ipcMain\.handle\(\s*['\"\`]([name])"` and the `.on` equivalent across all of `Fabrica-app/src` (excludes nothing else; node_modules not under src).

| Metric | Count | Notes |
|---|---|---|
| Literal `ipcMain.handle` registrations | 344 | unique channels 342 (2 dupes: `awaitFirstWindowStartupServices` region, `starFABRICA`) |
| Files containing literal handle registrations | 65 | concentrated in `src/main/ipc/` |
| Literal `ipcMain.on` registrations | 33 | listed fully in §3.2 |
| Constant-named handles | 5+ | `isMaximizedChannel` (createMainWindow.ts:1123), `consumeChannel/acknowledgeChannel/releaseChannel/dismissChannel` (attach-main-window-services.ts:255-268), `RETRY_CONNECTIONS_NOW_CHANNEL`, `releaseChannel` etc. |
| Template-literal channel families | 1 family ×5 channels | `${prefix}:getScanState/setEnabled/refresh/getSummary/getDaily` — `src/main/ipc/usage-provider-handlers.ts:34-57`, registered once per usage provider (claude/codex/opencode) via `registerUsageProviderHandlers(stores)` `:64` |
| Preload `ipcRenderer.invoke` call sites | 656 | all in `src/preload/index.ts` |
| Preload namespaces | 76 | census below |

### 3.1 Handle-channel counts by namespace (main-side literals)

`gh` 28 · `plugins` 18 · `ssh` 17 · `app` 15 · `jira` 14 · `agentHooks` 14 · `rateLimits` 10 · `mobile` 10 · `pty` 10 · `star-nag` 10 · `repos` 9 · `browser` 9 · `speech` 9 · `updater` 9 · `shell` 8 · `codexAccounts` 7 · `gitlab` 7 · `automations` 6 · `linear` 6 · `projectGroups` 6 · `clipboard` 5 · `settings` 5 · `keybindings` 5 · `claudeAccounts` 5 · `dashboardPopout` 5 · `worktrees` 4 · `diagnostics` 4 · `telemetry` 4 · `notifications` 4 · `aiVault` 4 · `crashReports` 4 · `skills` 4 · `ui` 4 · `session` 4 · `agentStatus` 3 · `cli` 3 · `dashboard` 3 · `folderWorkspaces` 3 · `fs` 3 · `minimaxCredentials` 3 · plus 30 single-channel namespaces (runtimeEnvironments, ephemeralVm, pet, emulator, wsl, projects, workspaceSpace, workspaceCleanup, remoteWorkspace, cache, hostedReview, preflight, sparsePresets, runtime, onboarding, terminalPreview, supabaseAuth, stats, grokAccounts, memory, git, feedback, nativeChat, projectHostSetups, codexConfigSync, developerPermissions, gitBash, pwsh, …).

Note the asymmetry vs preload: e.g. `git` has 37 preload invoke sites but only 1 literal main-side handle match because most `git:*` handlers are registered through multi-line/wrapped `ipcMain.handle(\n  'git:…'` calls (the sweep regex catches same-line strings only; e.g. `worktrees.ts` registers ~24 handles of which many span lines — visible as bare `ipcMain.handle(` at `src/main/ipc/worktrees.ts:1961,2024,2066,2164,2171,2186,2256,2332,2359,2989,3083,3154,3184,3190,3222,3232,3286,3304,3368,3435` with string on next line; named ones cited inline: `worktrees:listAll` :1837, `worktrees:list` :1900, `worktrees:listLineage` :3176, `worktrees:persistSortOrder` :3207).

### 3.2 All literal `ipcMain.on` channels (fire-and-forget, renderer→main)

| Channel | File:Line |
|---|---|
| `agentStatus:drop`, `agentStatus:dropByTabPrefix` | `src/main/ipc/agent-hooks.ts` |
| `agentStatus:retirePaneAuthority`, `agentStatus:transferPaneAuthority` | `src/main/ipc/agent-pane-authority-ipc.ts` |
| `nativeChat:subscribe`, `nativeChat:unsubscribe` | `src/main/ipc/native-chat.ts:294-297` |
| `pty:ackColdRestore`, `pty:claimViewport`, `pty:clearBuffer`, `pty:rendererDispatcherReady`, `pty:reportGeometry`, `pty:resize`, `pty:setActiveRendererPty`, `pty:setHiddenRendererPty`, `pty:setPtyDeliveryInterest`, `pty:setRendererPtyVisible`, `pty:signal`, `pty:terminalViewAttributes`, `pty:write` (13 total) | `src/main/ipc/pty.ts` |
| `app:stage-before-unload-sync` | `src/main/ipc/renderer-shutdown-checkpoint.ts` |
| `session:set-sync` | `src/main/ipc/session.ts` |
| `settings:get-sync` | `src/main/ipc/settings.ts` |
| `ui:performNativePaste`, `ui:performNativeSelectionAction` | `src/main/ipc/ui.ts` |
| `terminal:tabCreateReply` (×2 sites + window copy) | `fabrica-runtime.ts:25788,26169`; `attach-main-window-services.ts:406` |
| `browser:tabCloseReply`, `browser:tabCreateReply`, `browser:tabSetProfileReply` | `fabrica-runtime-browser.ts:1661,1755,1420` |
| `ui:window-revealed` | `createMainWindow.ts:144` |
| `ui:mobileMarkdownResponse` | `mobile-markdown-request-relay.ts:51` |
| `ui:terminalTabCloseResponse` | `terminal-tab-close-request-relay.ts:39` |

### 3.3 Preload invoke-site census by namespace (renderer-facing surface)

`gh` 56 · `git` 37 · `fs` 30 · `pty` 26 · `linear` 24 · `repos` 23 · `browser` 23 · `jira` 23 · `ssh` 22 · `plugins` 20 · `worktrees` 19 · `FABRICAProfiles` 16 · `app` 15 · `automations` 15 · `agentHooks` 14 · `mobile` 13 · `shell` 13 · `ephemeralVm` 11 · `runtimeEnvironments` 10 · `updater` 10 · `speech` 10 · `rateLimits` 10 · `star-nag` 10 · `runtime` 8 · `clipboard` 8 · `codexAccounts` 8 · `projectGroups` 8 · `settings` 7 · `aiVault` 7 · `claudeAccounts` 6 · `keybindings` 6 · `skills` 6 · `cli` 6 · `crashReports` 6 · `diagnostics` 6 · `folderWorkspaces` 5 · `dashboardPopout` 5 · `workspaceCleanup` 5 · `terminalPreview` 5 · `hooks` 5 · `notifications` 5 · `projectHostSetups` 5 · `remoteWorkspace` 5 · `preflight` 5 · `ui` 4 · `agentStatus` 4 · `pet` 4 · `session` 4 · `emulator` 4 · `telemetry` 4 · `macosTccPrompts` 4 · `developerPermissions` 4 · `hostedReview` 3 · `supabaseAuth` 3 · `minimaxCredentials` 3 · `sparsePresets` 3 · `dashboard` 3 · `computerUsePermissions` 3 · remaining ≤2 each: `cache`, `onboarding`, `wsl`, `projects`, `workspacePorts`, `workspaceSpace`, `gitBash`, `pwsh`, `agentAwake`, `terminal`, `export`, `grokAccounts`, `codexConfigSync`, `localhostWorktreeLabels`, `agentTrust`, `notebook`, `window`, `nativeChat`, `feedback`, `stats`, `memory`.

(All counts from `rg -o "invoke\(['\"]([ns]):"` over `src/preload/index.ts`.)

---

## 4. Key Channel Families — Handlers, Payloads, Renderer Entry Points

> Payload shapes below are taken from the preload bridge type annotations (the contract the renderer compiles against) and handler signatures. Representative, highest-traffic families first.

### 4.1 PTY / terminal (`pty:*`) — `src/main/ipc/pty.ts`

- Fire-and-forget control plane (`.on`, §3.2): `pty:write` (stdin), `pty:resize`, `pty:signal`, `pty:reportGeometry`, viewport/buffer management (`pty:claimViewport`, `pty:clearBuffer`), delivery-interest toggles (`pty:setPtyDeliveryInterest`, `pty:setActiveRendererPty`, `pty:setHiddenRendererPty`, `pty:setRendererPtyVisible`), lifecycle sync (`pty:rendererDispatcherReady`, `pty:ackColdRestore`, `pty:terminalViewAttributes`) — all in `src/main/ipc/pty.ts`.
- Invoke handles (10 literal): spawn/kill/lifecycle + diagnostics. Bridge methods: `window.api.pty.spawn` → `pty:spawn` (`preload/index.ts:983`), `.writeAccepted` → `pty:writeAccepted` (`:989`), `.kill` → `pty:kill` (`:1072`); renderer call sites: spawn at `src/renderer/src/lib/launch-worktree-background-terminals.ts:141`, kill at `src/renderer/src/store/slices/terminals.ts:1611`, write/writeAccepted at `runtime-terminal-inspection.ts:160,198`.
- Supporting machinery (same folder): producer flow control `pty-producer-flow-control.ts`; pending-data drain queue/scheduler (`pty-pending-data-drain-queue.ts`, `-scheduler*`); hidden-delivery gate `pty-hidden-delivery-gate.ts`; startup ingress negotiation `pty-startup-ingress.ts` (+ `pty-startup-reply-delivery.ts`); pane-serializer handshake handles `reportRendererSerializerReady/declarePendingPaneSerializer/settlePaneSerializer/clearPendingPaneSerializer`; delivery-health debug handles `getRendererDeliveryDebugSnapshot/resetRendererDeliveryDebug`; buffer snapshot capability handle `getAuthoritativeBufferSnapshotCapabilities`.
- Push events main→renderer: data/exit/spawned exposed as `onSpawned/onExit/onData` preload listeners; session inventory consumed at `src/renderer/src/components/status-bar/use-resource-session-inventory.ts:59,172,181`.

### 4.2 Filesystem editor API (`fs:*`) — `src/main/ipc/filesystem.ts`

- Read: `fs:readFile` — args `{ filePath: string; connectionId?: string; includeLocalLogMetadata?: boolean }` → `{ content, isBinary, isImage?, mimeType?, … }` (preload contract `preload/index.ts:3103-3111`); renderer caller `src/renderer/src/runtime/runtime-file-client.ts:252`. The optional `connectionId` makes the SAME channel serve local and SSH-remote files (remote routed through the SSH filesystem provider).
- Write: `fs:writeFile` (`preload/index.ts:3166-3172`); renderer caller `runtime-file-client.ts:488`.
- Tree/search/mutations: `fs:listFiles` + `fs:cancelListFiles` (git-aware listing with fallback chain — `filesystem-list-files-git-fallback*.ts`, install-detection helper); `fs:search` (rg-backed — `filesystem-search-git.ts`, timeout guard tested in `filesystem-search-rg-timeout.test.ts`); mutations `rename/createDir/deletePath/copy/copyFile/stat/pathExists/ensureFile/createFile` (`filesystem.ts` + `filesystem-mutations.ts`); chunked download protocol `startDownloadedFile/appendDownloadedFileChunk/saveDownloadedFile/finishDownloadedFile/cancelDownloadedFile/downloadFolder/downloadFile` (`filesystem-download-folder.ts`).
- SSH import safety: `filesystem-import-ssh.ts` + dedicated path-safety module (`filesystem-import-ssh-path-safety…ts`).
- Auth gate for paths outside workspace roots: `authorizeExternalPath` — `filesystem-auth.ts`.

### 4.3 File watching channels

- `ipcMain.handle('fs:watchWorktree')` — `src/main/ipc/filesystem-watcher.ts:1596-1627`. Args `{ worktreePath, connectionId? }`: with `connectionId` installs a remote SSH watcher (:1599-1621), else a local @parcel/watcher root (:1624-1625). Registered by `registerFilesystemWatcherHandlers()` (:1588) from `register-core-handlers.ts:214`.
- `ipcMain.handle('fs:unwatchWorktree')` — `filesystem-watcher.ts:1629-1663`.
- Preload: `window.api.fs.watchWorktree/unwatchWorktree` (`preload/index.ts:3292-3295`); push subscription `onFsChanged` → channel `fs:changed` (`preload/index.ts:3296-3300`). Renderer consumer: `hooks/useEditorExternalWatch.ts:359` (subscribe path) and `:290` (unwatch).
- Full mechanics in §5.

### 4.4 Git / source control (`git:*`)

- `git:status` — args carry cache-control flags `{ bypassEffectiveUpstreamNegativeCache?, reuseLineStats?, branchLineTotalMergeBase?, requestToken? }` → status projection (`preload/index.ts:3309-3313`); renderer client `runtime-git-client.ts:233`.
- History/diff: `history`, `diff`, `commitDiff`, `branchDiff`, `commitCompare`, `branchCompare`, `forBranch` (renderer `runtime-git-client.ts:300,372`).
- Mutations: `commit`, `stage/bulkStage/unstage/bulkUnstage/discard/bulkDiscard`, `push/pull/fetch/fastForward/syncFork/rebaseFromBase/abortRebase/abortMerge/conflictOperation`.
- Upstream ref watch binding: `git:setStatusUpstreamRefWatch` — `src/main/ipc/filesystem.ts:1208-1212` → `applyGitStatusUpstreamRefWatchRequest` (`git-status-upstream-ref-watch-request.ts:28-78`); details §5.6.
- Repo metadata: `isGitAvailable/getGitUsername/getBaseRefDefault/appendGitignore/checkIgnored/submoduleStatus/findHugeFoldersToIgnore`.
- AI generation: `generateCommitMessage/cancelGenerateCommitMessage/discoverCommitMessageModels/generatePullRequestFields/cancelGeneratePullRequestFields` — wired through `commitMessageAgentEnv` resolvers (`register-core-handlers.ts:209-213`).

### 4.5 Worktrees & repos

- `worktrees:listAll/list/listLineage/persistSortOrder` — `worktrees.ts:1837,1900,3176,3207`; ~20 further wrapped registrations :1961-3435 (create/remove/updateMeta/updateLineage/reorder(+ForHost)/listForExecutionHost/forgetLocal/forceDeletePreservedBranch/getBranchRenameFailureOutput/getAuthoritativeBufferSnapshotCapabilities…). Renderer: create `store/slices/worktrees.ts:3980`, updateMeta :1680, remove :4246.
- Repos: `repos.list/add/cloneRemote/cloneAbort/pickFolder(s)/pickDirectory/setupExistingFolder/moveProject/getDefaultCreateProjectParent/scanNested/importNested/cancelNestedScan/getPathStatus` — renderer slice `store/slices/repos.ts:1164,2970,3274,3326`. Sparse presets via `sparsePresets:*` (`sparse-checkout-directories.ts`).

### 4.6 Browser pane (`browser:*`) — `src/main/ipc/browser.ts`

- Session/tab/profile management, grab-mode capture, cookie persistence; 23 preload invoke sites. Representative renderer calls: `reclaimBrowserForDesktop` `components/browser-pane/BrowserPane.tsx:805`; popup/download events :2872/:2965; grab mode `useGrabMode.ts:105`.
- Reply channels are `.on`: `browser:tabCreateReply/tabCloseReply/tabSetProfileReply` (`fabrica-runtime-browser.ts:1420,1661,1755`).
- Trusted-renderer enforcement via `setTrustedBrowserRendererWebContentsId` (`register-core-handlers.ts:133`).

### 4.7 Native chat (`nativeChat:*`) — `src/main/ipc/native-chat.ts`

- Subscribe/unsubscribe `.on` channels (:294-297); read invoke `nativeChat:readSession` args `{ agent, sessionId, limit, transcriptPath }` (`preload/index.ts:4261`); push deliveries `sender.send('nativeChat:appended', payload)` (:200-264). Renderer transport `components/native-chat/native-chat-session-transport.ts:47-48`.
- Transcript watch engine details §5.7.

### 4.8 Runtime environments & generic RPC

- `runtimeEnvironments:list` (`preload/index.ts:4372`), `getStatus` (:4401), generic dispatcher `runtimeEnvironments:call` (:4411) routing typed RPC envelopes into `src/main/runtime/rpc/methods/*` (e.g. `files.watch/files.unwatch` at `runtime/rpc/methods/files.ts:465-481`; native-chat RPC reuse `runtime/rpc/methods/native-chat.ts:316`).
- Preload guards first-frame-before-handler races on streaming RPCs (`src/preload/runtime-environment-subscriptions.ts:132` comment).
- Renderer clients: `App.tsx:241` (list), `runtime-rpc-client.ts:117,250` (call), `runtime-client-events.ts:24` (subscriptions), `store/slices/runtime-status-refresh.ts:12` (status).
- Connection layer: ~14 modules under `src/main/ipc/runtime-environment-*.ts` (call queue, connectivity, pairing verification, revision gates, recovery handler, status diag, tailscale hint, transports ×3).

### 4.9 Settings / session sync

- `settings:set` (`preload/index.ts:2035`); `settings:get-sync` is `.on` (`settings.ts`); live updates pushed and consumed at `hooks/useIpcEvents.ts:1217` (`onChanged`); popout boot sync `popout.tsx:38` (`getSync`). Active runtime preference `settings:set-active-runtime-environment-preference` (:2040).
- `session:set-sync` (`.on`, `session.ts`) mirrors per-session UI state.

### 4.10 Dashboard popout

- `dashboard:requestSnapshot` (`preload/index.ts:2376`); popout consume/acknowledge/release/dismiss handles `attach-main-window-services.ts:255-268`; publish family registered via `registerDashboardPopoutHandlers` (`register-core-handlers.ts:169`). Renderer loop `components/dashboard-popout/useDashboardSnapshot.ts:66,131,159`; kanban actions `AgentKanbanBoard.tsx:40-59`.

### 4.11 Integrations: GitHub/GitLab/Jira/Linear/Azure DevOps (`gh:*`, `gitlab:*`, `jira:*`, `linear:*`)

- `gh` is the largest namespace (28 main-side channels): PR lifecycle (`mergePR/updatePRTitle/updatePRState/requestPRReviewers/removePRReviewers/setPRAutoMerge/setPRFileViewed/rerunPRChecks/prChecks/prCheckDetails/prComments/addPRReviewComment(+Reply)/resolveReviewThread/setPRCommentReaction`), work items (`listWorkItems/countWorkItems/workItem/workItemDetails/workItemByOwnerRepo/projectWorkItemDetailsBySlug/updateProjectItemField/clearProjectItemField/notifyWorkItemMutated`), projects (`listAccessibleProjects/listProjectViews/getProjectViewTable/resolveProjectRef/listAssignableUsers(BySlug)/listLabels(BySlug)/listIssueTypes(BySlug)/addIssueComment(BySlug)/updateIssue*(BySlug)/deleteIssueCommentBySlug/teamStates/teamLabels/teamMembers/listCustomView*/rateLimit/diagnoseAuth`). Renderer: `store/slices/github.ts:387,409`; PR refresh events via `useIpcEvents.ts:1151`.
- Cancellation pattern: long lookups get paired cancel channels (`jira-cancellable-requests.ts`: `jira:lookupIssueSummary/cancelIssueSummary`, `searchIssues/cancelSearchIssues`, `listFiles/cancelListFiles` style sender-scoped cancellation — generic helper `sender-scoped-request-cancellation*.ts`).
- GitLab 7 channels (`mr`, checks, pipelines); Jira ~14 (issues/projects/fields/types/priorities/comments); Linear 6+24 preload sites (`linear.ts`, custom views, teams, issue types).
- Azure DevOps handlers live in `src/main/ipc/` sibling files referenced by `github-work-item-args.ts` (workItemDetails/workItem families share arg validation).

### 4.12 Accounts & agent-status family (`agentHooks:*`, `*Accounts:*`, usage providers)

- Per-agent status probes: `agentHooks:{claude,codex,copilot,gemini,droid,devin,grok,kimi,minimax,hermes,cursor,amp,antigravity,openClaude,commandCode}Status` — `src/main/ipc/agent-hooks.ts` (14 channels) + trust gate `agent-trust.ts` (`markTrusted`).
- Pane authority lifecycle: `agentStatus:retirePaneAuthority/transferPaneAuthority` (`.on`) + ownership module `agent-pane-authority-ownership.ts`; boundary type contract `agent-status-ipc-boundary.ts`.
- Account management: codex (7 channels incl. `fetchInactiveCodexAccounts/consumeCodexResetCredit/reauthenticate`), claude (5), grok, minimax credentials; config sync `codexConfigSync:*`.
- Usage providers (template-literal family): `${prefix}:getScanState|setEnabled|refresh|getSummary|getDaily` per provider — `usage-provider-handlers.ts:34-57`, hub call :145. Args for summary/daily: `UsageRangeArgs<Scope,Range>` (:46,:49).
- Rate limits: `rateLimits` namespace ×10 (`rate-limits.ts`).

### 4.13 Shell, app lifecycle, updater, misc desktop

- Shell: `shell:openUrl/openPath/openFile/openFilePath/openFileUri/revealFile/openInFileManager/openInExternalEditor/showOpenDialog(pick*)` (`shell.ts`, 8 main-side channels; renderer census `shell` ×143 uses).
- App: `app:awaitFirstWindowStartupServices/startupDiagnostic/recoverLegacyWorkerTerminalsForRendererStartup/relaunch/stage-before-unload-sync(.on)/await-before-unload-checkpoint` (`app.ts`, `main/index.ts`, `renderer-shutdown-checkpoint.ts`) — the startup barrier is asserted by test `desktop-startup-ordering.test.ts:62-89`.
- Updater: 9 channels `updater:getStatus/getVersion/check/download/quitAndInstall/dismissNudge/dismissAvailableUpdate/getLinuxPackageInstallInstructions/showLinuxPackage` (`attach-main-window-services.ts:547-567`); push events defined in `shared/updater-renderer-events.ts`.
- Clipboard: `clipboard:readText/readSelectionText/writeText/writeTerminalText/writeSelectionText/writeImage/saveImageAsTempFile/html-to-pdf` (`clipboard-ipc-handlers.ts:89-175`).
- Window/UI: focus relays (markdown editor, terminal input, floating, shortcut recorder, rich-markdown context menu) `createMainWindow.ts:510-551`; traffic-light sync :1077; min/max/close/popup/isMaximized :1119-1126.
- Star-nag: 10 channels `star-nag:*` (`star-nag/service.ts:78-87`).
- Telemetry: `telemetry:track/consent/setOptIn/getConsentState` (+ recordFeatureInteraction under ui/app namespaces).
- Crash reporting & diagnostics: `crashReports:recordRendererError/getLatestReport/getLatestPending/copyLatestDiagnostics` (`crash-reporting.ts`); `diagnostics:getLogs/doctor` lanes kept isolated from telemetry (`register-core-handlers.ts:172-175`).

### 4.14 Remaining families (one-liners with anchors)

| Family | Channels / notes | Anchor |
|---|---|---|
| Mobile relay | `mobile:*` ×10 — device pairing, push, firewall repair (`getPairingQR/verifyAndAddFromPairingCode/revokeDevice/listDevices/getRelayStatus/isWebSocketReady/repairWindowsFirewall/openWindowsNetworkSettings/consumePendingUnpairedDeviceAuthFailure/listNetworkInterfaces`) | `src/main/ipc/mobile.ts` |
| AI Vault | `aiVault:*` ×7 + runtime-scan/resume/subagent helpers (`ai-vault.ts` hub; scan coalescing `ai-vault-runtime-scan.ts`; host discovery `ai-vault-host-discovery.ts`) | `src/main/ipc/ai-vault.ts` |
| Ephemeral VM | `ephemeralVm:*` ×11 (`provision/cancelProvision/attachWorkspace/suspendWorkspace/resumeWorkspace/cleanup/listRuntimes…`) | `ephemeral-vm.ts`, `ephemeral-vm-runtime-handlers.ts`, recipe context `ephemeral-vm-recipe-context.ts` |
| SSH targets | `ssh:addTarget/updateTarget/removeTarget/listTargets/listRemovedTargetLabels/connect/disconnect/getState/testConnection/terminateSessions/needsPassphrasePrompt/submitCredential/resolveConfigHost/listConfigHosts/importConfig/browseDir/addPortForward/updatePortForward/removePortForward/listPortForwards/listDetectedPorts(+cancelListDetected)` | `ssh.ts`, `ssh-browse.ts`, `ssh-passphrase.ts` |
| Speech/dictation | `speech:startDictation/stopDictation/loadSound/pickAudio/pickAttachment…` ×9-10 | `speech.ts` |
| Emulator streams | `emulator:frameStreamStart/frameStreamStop/videoStreamStart/videoStreamStop` (chunked frame streaming) | `emulator-frame-stream.ts`, `emulator-video-stream.ts` |
| Plugins/marketplaces | `plugins:*` ×18 + marketplace family (`listMarketplaces/addMarketplace/removeMarketplace/refreshMarketplaces/installMarketplacePlugin/previewMarketplacePlugin/previewMarketplaceUpdate/rollbackMarketplacePlugin/listMarketplacePlugins`) | `plugins.ts`, `plugin-marketplaces.ts` |
| Skills | `skills:discover/startUpdateRun/getUpdateRun/cancelUpdateRun/acknowledgeUpdateRun/freshnessInventory/import` | `skills.ts` |
| Automations | `automations:list/create/runNow/delete/update/listExternalManagers/listRuns/listExternalRuns/runExternalAction/markDispatchResult` | `automations.ts` |
| Notifications | `notifications:dispatch/getPermissionStatus/probeDelivery/playSound? (loadSound under speech)` | `notifications.ts`, `notification-options.ts`, `notification-authorization-state*.ts` |
| Pet/easter eggs | `pet:*` ×4, bundles import/export | `pet.ts`, `pet-bundle.ts` |
| Workspace space/cleanup/ports | `workspaceSpace:analyze/cancel`; `workspaceCleanup:{request,dismiss,clearDismissals,…}`; `workspacePorts:{listDetected,listPortForwards,…}` | `workspace-space.ts:25,95`; `workspace-cleanup.ts:33-63`; `workspace-ports.ts:43,68` |
| Folder workspaces / floating pickers | `folderWorkspaces:*` ×3; `app:pickFloatingWorkspaceDirectory/pickFloatingMarkdownDocument/getFloatingTerminalCwd/getFloatingMarkdownDirectory` | `floating-workspace-directory.ts`, `app.ts` |
| Hosted review / supabase / profiles | `hostedReview:*` ×2-3; `supabaseAuth:*` ×3; `FABRICAProfiles:*` ×16 preload (auth/org members/invite) | `hosted-review.ts`, `supabase-auth.ts`, `fabrica-profiles.ts` (+ auth/org-member handler files) |
| Keybindings | capture/recorder channels + focus relay | `keybindings.ts` |
| Terminal preview / desync evidence | `terminalPreview:*` ×5; `writeRenderDesyncEvidence` | `terminal-preview.ts:1-…`, `terminal-render-desync-evidence.ts` |
| Preflight | agent detection, command exec, WSL/windows variants ×5+ | `preflight.ts` + 8 sibling modules |
| Notebook/export/memory/cache | single-channel families | `notebook.ts`, `export.ts`, `memory.ts`, cache ns |
| Computer-use / developer permissions | consent + permission gates ×3-4 each | `computer-use-permissions.ts`, `developer-permissions.ts` |
| macOS TCC prompt watch | `macosTccPrompts:*` ×4 (log-stream watcher, §5.8) | `macos-tcc-prompt-watch.ts` |

---

## 5. File Watchers — Extreme Depth

### 5.0 Shared constants

| Constant | Value | Location |
|---|---|---|
| `WATCH_BATCH_TRAILING_MS` | 150 | `src/shared/filesystem-watch-batch-window.ts:4` |
| `WATCH_BATCH_MAX_WAIT_MS` | 500 | `shared/filesystem-watch-batch-window.ts:5` |
| `MAX_BATCHED_WATCHER_EVENTS` | 5,000 | `src/main/ipc/filesystem-watcher-event-batch.ts:3` |
| `RUNTIME_FILE_WATCH_CRAWL_TIMEOUT_MS` | 60,000 | `src/shared/runtime-file-watch-limits.ts:1` |
| `RUNTIME_FILE_WATCH_CANCEL_TIMEOUT_MS` | 60,000 | `shared/runtime-file-watch-limits.ts:2` |
| `RUNTIME_FILE_WATCH_EXIT_DEADLINE_MS` | 10,000 | `shared/runtime-file-watch-limits.ts:3` |
| `RUNTIME_FILE_WATCH_MAX_SETUP_ATTEMPTS` | 2 | `shared/runtime-file-watch-limits.ts:4` |

The comment at `shared/filesystem-watch-batch-window.ts:1-2` states the main-process batcher and the renderer's Explorer refresh scheduler deliberately share one flush window "so local and remote latency can't drift."

### 5.1 Explorer worktree watcher — `filesystem-watcher.ts` (1,961 lines)

**Channels**: `fs:watchWorktree` (:1596-1627), `fs:unwatchWorktree` (:1629-1663) — see §4.3. Delivery `webContents.send('fs:changed', { worktreePath, events })` where each event is `{ kind: 'create'|'update'|'delete'|'overflow', absolutePath, isDirectory? }` (:335-344).

**Targets**: exact worktree path passed by the renderer; recursive native watch. Roots normalized (Windows drive letter upper-cased) at :198-207; map keys case-folded via `normalizeRuntimePathForComparison` (:209-216). State in `watchedRoots: Map<string, WatchedRoot>` (:48); type shared with WSL variant at `filesystem-watcher-wsl.ts:28-35`. Windows pins Parcel's backend `{ backend: 'windows' }` to avoid Watchman probing (:391). Ignore options built by `buildParcelWatcherIgnoreOptions(WATCHER_IGNORE_DIRS)` (:388-392).

**Ignore rules** — `filesystem-watcher-ignore.ts`: `WATCHER_IGNORE_DIRS` = `.git, node_modules, dist, build, .next, .cache, target, .venv, __pycache__` (:5-15), described as mirroring VS Code recursive-watch excludes (:1-4). macOS cap `MACOS_FSEVENTS_EXCLUSION_PATH_LIMIT = 8` (:24): FSEvents fails closed above 8 daemon exclusion paths → first 8 dirs get daemon exclusion, rest become globs (:58-63). Non-macOS builds a component-aware nested regex instead of leading-`**` globs because Parcel 2.5.6 lookahead regexes measured 10–17× slower in native std::regex (:52-56); regex built :37-44.

**Batching/coalescing**: events queued via `queueWatcherEvents` (:421); flush scheduling `scheduleBatchFlush` :347-368 (trailing-edge 150 ms reset-per-event debounce; hard flush at 500 ms). Overflow: >5,000 events or latched interruption (:394-397,428-429) sends one conservative `overflow` payload via `emitOverflowPayload` (:290-301). Coalescing `coalesceEvents` :229-274: keep last event per path; delete→create emits both; create→delete dropped as net no-op. Per-event `stat()` for `isDirectory` (:278-286,325).

**Lifecycle/supervision (local roots)**:
- Teardown grace: last subscriber leaving defers native teardown 30 s (`WATCHER_TEARDOWN_GRACE_MS = 30_000`, :71, timer :790-802) so rapid worktree switches reuse the expensive Windows watcher.
- Per-sender cleanup: `sender.once('destroyed')` removes that renderer's listeners from every root (`registerSenderCleanup` :521-531, `cleanupLocalWatchersForSender` :450-476).
- In-flight install sharing/cancellation: concurrent same-root installs join one token (:98-101,652-671); abort via AbortController when last listener leaves (:762-770) or during deletion (:835-841).
- Capacity retry: `WatcherChildCapacityError` schedules event-driven retry on next child-capacity release (:149-194, consumed :717-719).
- Unwatchable-root LRU cache capped `UNWATCHABLE_ROOT_CACHE_MAX = 256` (:51-65, consulted :572-575); capacity failures bypass it (:716-720).
- Removal fence/drain (worktree delete path): identity-token install fences `beginWatcherInstall` (`watcher-removal-gate.ts:52-58`), path-overlap aware (:76-85); gate returns ready-drain promise + `abandonPendingInstalls()` (:97-153); error classes :32-48. Drain budget `WATCHER_REMOVAL_DRAIN_BUDGET_MS = 60_000` with 10 s final reserve (`watcher-removal-drain.ts:5-8`); timed-out waits abandoned so late failures don't fail-close later deletes (`filesystem-watcher.ts:502-507`, comment :84-87); physical-failure retention until child exit (:509-519, rethrown :882-884).
- Failed-removal restore: re-subscribes suspended listeners + immediate overflow resync (:908-939); snapshot forgotten :941-943.

**Persistence**: no disk persistence — main-process module state only. Renderer reload destroys WebContents → listeners removed (:526-531); local root survives 30 s for reuse but new renderer must re-issue `fs:watchWorktree`. App shutdown: `closeAllWatchers()` (:1886-1960) latches both subsystems shut with generation bumps (:1921-1925), cancels in-flight installs, awaits unsubscribes, kills forked watcher child via `disposeWatcherProcess()` (:1949); invoked from `shutdownWatchersOnce()` (`src/main/index.ts:1760-1782`). A later `fs:watchWorktree` reopens the latch (:1600-1601,:1623-1624).

**WSL variant** — `filesystem-watcher-wsl.ts`: rationale in header (:1-7) — polling `\\wsl.localhost` keeps waking the distro after `wsl --shutdown`, so the snapshot loop runs INSIDE the distro. Spawns `wsl.exe -d <distro> -- sh -s -- <linuxPath>` (:248-251) fed a script that every `POLL_INTERVAL_SECONDS = 2` s (:43) runs `find "$root" -mindepth 1 -maxdepth 2 <prunes> -printf '%y\t%T@\t%p\0'` framed by `\x1e/\x1f` markers (:75-89); prunes reuse `WATCHER_IGNORE_DIRS` (:67-73). Snapshots diffed into parcel-shaped events (`diffSnapshots` :116-142); depth cap 2. Startup timeout 10 s (:44, timer :267-270); stream buffer cap 10 MB (:46) latches overflow (:229-233). Exit ownership `createWslWatcherProcessExit` (`wsl-watcher-process-exit.ts:38-90`) with physical-exit timeout 8 s (:5); failure surfaces as `WatcherProcessFailure('process_unavailable', physicalExit)` (:104-106). Reserves a slot in the global physical-child registry (:243-246).

**Remote (SSH) half** (same file): key `JSON.stringify([connectionId, foldedPath])` (:1666-1668); install `installRemoteWatcher` :1192-1287 → provider.watch (:1334-1344); concurrent same-key installs share one promise (:1233-1263). Batching: dedicated remote batch, same 150/500 windows and 5,000 cap (:1300-1305), guarded against stale install generations (:1306-1331). Retry ladder: fast retries 1 s within 60 s window (`REMOTE_WATCH_RETRY_MS/_TIMEOUT_MS` :1005-1006); on give-up an overflow forces manual refresh (:1515-1536); resync coalesce 5 s (:1008, logic :1458-1487); dormant re-arm starts 60 s doubling to 30 min max (:1011-1012, `nextDormantDelayMs` :1784-1786). **Intent survives transport loss**: desired watchers recorded before install (:1670-1687, recorded in handler :1605); provider re-registration reinstalls all desired watchers for that connection and sends resync overflows (`reinstallRemoteWatchersForConnection` :1796-1883, subscribed :1591-1594). Terminal errors tear down and enter the ladder (:1383-1405).

### 5.2 Crash-isolated watcher child — `parcel-watcher-*` (~30 files)

**Why** (header `parcel-watcher-process-entry.ts:1-6`): `watcher.node` has native teardown races that fail-fast the hosting process (issue #7547, `0xc0000409` on Windows), so subscriptions run in a **forked `ELECTRON_RUN_AS_NODE=1` child**; a fault becomes a contained child crash the host recovers from.

**Topology/host API**: `subscribeViaWatcherProcess` uses desktop singleton `WatcherProcessSupervisor` (`parcel-watcher-process.ts:23,32-39`); `subscribeViaRuntimeWatcherProcess` routes to `RuntimeWatcherProcessPool` (:26,41-48). Wire protocol `HostToWatcherMessage/WatcherToHostMessage`: `subscribe{id,dir,opts,delivery}` / `unsubscribe` / `cancel-subscribe`; replies `subscribe-started|subscribed|subscribe-failed|events|overflow|watch-error|cancel-requires-restart|unsubscribe-failed|unsubscribed` (`parcel-watcher-process-protocol.ts:18-38`).

**Child entry behaviors**: serializes native subscribe/unsubscribe on one tail queue mirroring Parcel's mutex ordering (:161-168); keeps subscribe PROMISES so an unsubscribe racing a still-crawling subscribe awaits it instead of leaking a native handle that locks the dir on Windows (:140-143); backpressure-aware event send (:120-138); cancel during an active native crawl is unsafe → asks host to kill+respawn via `cancel-requires-restart` (:262-277); host death ⇒ `process.on('disconnect', () => process.exit(0))` (:306-311) — process death releases all native handles without napi teardown.

**Canary deadlock detector** (`parcel-watcher-canary-directory.ts` + entry): host creates temp canary dir `mkdtemp('FABRICA-watcher-canary-')` (:5-14), passes via `FABRICA_WATCHER_CANARY_DIR` env (`child-launch.ts:37`), removes on teardown (:16-26; supervisor sites :147,201,219,255,292,309). Child self-check: subscribes to the canary dir, writes `canary.txt` every 10 s (`CANARY_INTERVAL_MS` entry :33); event SLA 5 s (:34); after 2 consecutive misses (`CANARY_MAX_MISSES` :35) concludes the shared debounce thread is deadlocked (lock-order inversion documented :27-32) and exits code 2 (:105) → host respawns. Misses invalidated during initial tree crawls or mid-probe root starts (:74-99) since Parcel holds its backend mutex through crawls legitimately.

**Launch/global capacity**: fork with `ELECTRON_RUN_AS_NODE=1`, stderr piped, `windowsHide` (`child-launch.ts:32-40`); entry path prefers `app.asar.unpacked` when packaged, avoids double-appending `out/main` in dev (`parcel-watcher-entry-path.ts:14-59`); missing entry fails CLOSED (`supervisor-subscribe.ts:104-112`, supervisor :129-131). Process-wide hard cap `MAX_PHYSICAL_WATCHER_CHILDREN = 8` (`child-registry.ts:3`); reservation released exactly once on physical exit (`child-launch.ts:61-81`); wake-up semantics prevent lost notifications/thundering herd (`child-registry.ts:34-78`). Test-only fault-injection pid file support (:47-56).

**Supervisor & crash fuse** (`parcel-watcher-process-supervisor.ts`): one reusable child; subscribes queue behind terminations wrapped in capacity-wait retry (:64-91; wait class `parcel-watcher-supervisor-capacity-wait.ts:15-103`). **Crash fuse**: `MAX_CRASHES_PER_WINDOW = 3` crashes within `CRASH_WINDOW_MS = 120_000` opens the fuse permanently (`parcel-watcher-crash-fuse.ts:1-2`); open fuse blocks new children (supervisor :126-128). Recovery: records crash, marks subscriptions interrupted, spawns replacement and re-sends every `subscribe` (`parcel-watcher-child-recovery.ts:17-62`); without replacement all subscriptions fail `supervisor_crash_fuse` and watching disables (:42-55). Disconnect begins recovery early (`child-launch.ts:71-74`); unavailable-child termination queued serially (`terminateUnavailableChild` supervisor :208-241; queue class `child-termination.ts:27-54`). Idle reap when last record unsubscribes (:243-265). Termination policy SIGTERM→SIGKILL after 5 s (`child-termination.ts:9,79-86`); overall exit deadline 10 s (:10) else `WatcherProcessFailure(process_unavailable, physicalExit)` (:97-117). Message routing arms pending/interrupted timeouts on `subscribe-started`, pre-ready `watch-error` cancels crawl, `unsubscribe-failed` terminates the child (`parcel-watcher-supervisor-message.ts:34-104`). Subscribe flow :61-154 of `parcel-watcher-supervisor-subscribe.ts` (optional hooks.subscribeTimeoutMs per `pending-subscribe.ts:28-73`); wedged cancels bounded at 60 s escalating to child restart (`parcel-watcher-cancellation-tracker.ts:13`, restart `cancellation-restart.ts:56-86`). Disposal rejects everything `supervisor_disposed` (`supervisor-disposal.ts:15-32`). Host unsubscribe deadline 60 s (`parcel-watcher-host-subscriptions.ts:16`), timeout escalates to terminate (:163-171).

**In-child delivery** (`parcel-watcher-event-delivery.ts`): batches over `delivery.maxEventsPerBatch` dropped → overflow; optional `isDirectory` stats under concurrency 8 (:9,37-44,80-93); queue keeps ≤1 active + ≤1 bounded pending batch per subscription (:96-160). Desktop explorer passes `maxEventsPerBatch: 5000` without directory metadata (`filesystem-watcher.ts:426`); runtime host passes `includeDirectoryMetadata: true` limit 200 (§5.4).

**In-process fallback** (`parcel-watcher-in-process-fallback.ts:11-124`): only under Vitest (guard `supervisor-subscribe.ts:99-103`); production fails closed.

### 5.3 Runtime watcher pool — `runtime-watcher-*`

Purpose: healthy runtime roots share ONE child; only fault quarantine scales out (≤4 extra children worst-case) (`parcel-watcher-process.ts:24-26`).
- Pool sizing: `DEFAULT_MAX_SHARED_SUPERVISORS = 1`, `DEFAULT_MAX_QUARANTINE_SUPERVISORS = 4` (`runtime-watcher-process-pool.ts:23-25`); slot/assignment types `runtime-watcher-pool-state.ts:5-22`.
- Assignment `assignmentForRoot` (pool :158-210): reuse live → join pending → least-loaded healthy shared slot → quarantine slot for isolated roots; pending fan-out with waiter abort/timeout (`runtime-watcher-pending-assignment.ts:23-39`; default quarantine wait 60 s :5).
- Quarantine queue FIFO bounded by capacity; over-capacity rejects `process_unavailable` (`runtime-watcher-quarantine-queue.ts:18-27`); drained when slots free (pool :308-316).
- Lifecycle/fuse: first failure moves root to quarantine; second failure inside quarantine permanently fuses that root with `supervisor_crash_fuse` (`runtime-watcher-pool-lifecycle.ts:22-30`; enforced pool :163-169).
- Failure routing (`runtime-watcher-subscription-failure.ts:6-20`): supervisor-scope failures retire the whole slot; `subscribe_timeout` additionally quarantines/fuses the root.
- Slot retirement retains predecessor barriers until the dead child's `physicalExit` resolves so replacements can't double-watch a still-open native root on Windows (pool `retireSlot` :258-280; barriers `runtime-watcher-predecessor-barriers.ts:4-35`).
- Lease bookkeeping: `releaseRoot` frees empty isolated slots immediately (:282-306); `forgetRoot` clears fault history after setup gives up (:148-156).
- Consumers: runtime file-explorer host (§5.4) and relay remote pool (`relay/relay-watcher-process-pool.ts:12-27` — shared supervisors 1, entry `relay-watcher.js`).

### 5.4 Headless serve file watch — `runtime/file-watcher-host.ts`

Root-shared subscriptions: paired clients on one worktree share one native root (`runtimeRootWatches` :45-47); subscribe via runtime pool with `includeDirectoryMetadata: true`, `maxEventsPerBatch = 200` (:26,133-138); crawl/subscribe timeout 60 s also bounding crash-resubscribes (:141-145); ≤2 setup attempts (:156-175); terminal error ⇒ overflow then automatic recovery, terminating only if recovery fails (`recoverRuntimeRootWatch` :177-195). RPC surface `files.watch/files.unwatch` (`runtime/rpc/methods/files.ts:465-481`); stream lifecycle emits `{type:'starting'|'ready'|'changed'|'error'|'end'}` (`file-watch-stream-lifecycle.ts:116,130,37,54,87`); WS-side batching mirrors local windows (150/500/5,000 — `file-watch-event-batcher.ts:50,66-80`); failed-child cleanup deferred until `physicalExit` (lifecycle :76-83).

### 5.5 Worktree base-directory + git-common watchers (main-process service, NOT IPC-driven)

- Synced against store: `syncWorktreeBaseDirectoryWatchers(store, mainWindow)` (`worktree-base-directory-watcher.ts:242-271`), debounced 100 ms (:289-303), hooked at `attach-main-window-services.ts:118`, disposed at shutdown (`index.ts:49,1768`).
- Targets (`worktree-base-directory-watch-targets.ts`): per repo two kinds — `'base'` (workspace/worktree parent root, added :156) and `'git-common'` (resolved common git dir, :174-175); canonicalized via realpath/provider realpath (:38-58); WSL UNC roots deliberately skipped (:131-140).
- Local strategy is POLLING, not FSEvents: rationale :164-167 + `poller.ts:74-82` — a recursive watcher forced fseventsd to deliver entire workspace/.git churn. Poll interval `WORKTREE_BASE_POLL_INTERVAL_MS = 2_000` (`poller.ts:82`), mtime-gated scans + ungated backstop every 15 ticks (:87), hidden-window parking (:106-124).
- git-common specifics (`worktree-git-common-watch.ts:14-27`): watches only `<common>/.git/worktrees` + shallow stat of primary branch/index files. macOS: narrow native stream hosted in the crash-isolated child (`subscribeViaWatcherProcess(worktreesDir,…)` :168-216) + polling for few files (:264-287); existence poll upgrades to native when `worktrees/` appears (:102-137); crash-fuse degrades to pure polling (`shouldUsePollingFallback` :52-54); root deletion tears down and re-arms (:154-199). Other platforms: dir-listing polling only (:289-297) — an open dir handle on Windows could block `git worktree prune` (:22-23).
- Event handling: local `handleLocalWatchEvents` (`watcher.ts:62-88`), remote `handleRemoteWatchEvents` (:90-113; overflow ⇒ full structural refresh :105-109); watcher-error refreshes rate-limited by 60 s cooldown (`worktree-watcher-failure-refresh-cooldown.ts:1`).
- Delivery to renderer: notification debounce 250 ms (`worktree-base-directory-notifications.ts:20`, flush :50-77); channels emitted in `worktree-remote.ts`: `worktrees:changed` (:1444-1449), `worktrees:gitStatusMetadataChanged` (:1452-1459), `worktrees:headIdentitiesChanged` (:1461-1470); head-identity baseline taken eagerly at subscribe (`watcher.ts:191-196`).

### 5.6 Git-status upstream ref watch

- Channel `git:setStatusUpstreamRefWatch` (`filesystem.ts:1208-1212`) → `applyGitStatusUpstreamRefWatchRequest` (`git-status-upstream-ref-watch-request.ts:28-78`); upstream ref resolution bounded 15 s (:22-26).
- It creates NO own watcher: binds the resolved upstream ref (e.g. `refs/remotes/origin/main`) onto existing git-common watch targets so those paths participate in change filtering — `applyActiveGitStatusRefBinding` adds the ref path to matching watches' `gitStatusRefPaths` (`worktree-git-status-ref-watch.ts:70-75`; match requires kind `git-common` + same connection + repo membership :48-57).
- One active binding/resolution per process (:45-46); dedupe key executionHost/connection/providerGeneration/worktree/branch/upstream (:96-106); failed resolutions retry after 5 min (:43, set :157). Invalidation when a git-common event touches the repo's `config` (:177-192) or the watch errors (:164-175); cleared at teardown (:194-198). Safety filter `isSafeGitStatusUpstreamRef` (:144-152).

### 5.7 Other filesystem-adjacent watchers

- **Native-chat transcript watch** (`native-chat/transcript-watch*.ts`): channels §4.7; headless reuse via RPC (`runtime/rpc/methods/native-chat.ts:316`). Resolve-poll loop for not-yet-flushed session files (#8401): initial poll 500 ms doubling to 5 s cap, fallback probes 5 s cadence (`transcript-watch.ts:43-50,65-178`). Engine: incremental offset reads, rotation retry 25 ms exponential-capped 2 s (`transcript-watch-engine.ts:22-23,82-93`), shrink⇒offset reset (doc `transcript-watch.ts:183-186`). Acceleration: plain Node `fs.watch` on the PARENT DIRECTORY (survives file replacement on macOS), best-effort never authoritative (`transcript-native-watcher.ts:13-21,44-54`); WSL guest paths lazily translated to UNC twins (`transcript-watch.ts:75-127`).
- **Plugin dev watcher** (`plugins/plugin-dev-watcher.ts`): subscribes each dev-plugin path through the crash-isolated child (:12-21); 300 ms refresh debounce (:106-114); interruption ⇒ full projection refresh since gap events were lost (:64-71); generation-guarded disposal (:88-97).
- **macOS TCC prompt watch** (`macos-tcc-prompt-watch.ts`): spawns `/usr/bin/log stream --predicate …AUTHREQ_PROMPTING…` (:91-99); parses TCC dialogs naming FABRICA (:56-81); exactly one recovery attempt after 1 s (:141-149); explicit SIGTERM stop (:160-171). Log-stream, not fs.
- **Non-fs look-alikes** (disambiguation): `ports/advertised-url-watcher.ts` scans PTY output for HTTP(S URLs (:1-4 header); `runtime/runtime-metadata-ownership-watch.ts` 10 s timer poll of `FABRICA-runtime.json` (:17, rationale :5-15); update-install exit watchdog, relay control-silence watchdog, renderer remote-terminal stream watchdog — process/stream watchdogs, not fs watching.

**Remote batch primitive**: `remote-watcher-event-batch.ts` is the generic batching primitive for SSH watcher streams — options `{rootPath, deliver, trailingMs, maxWaitMs, maxEvents}` (:7-13); same trailing/max-wait scheduling (:105-118); overflow latching on cap exceed or embedded overflow events (:126-139); `close()` prevents post-teardown timer fires (:143-152). Coalescing differs from local (:20-68): POSIX identity preserves byte-distinct names with trailing-slash folding only (`posixEventIdentity` :22-25); Windows folds separators+casing (:40-42); recreate keeps the delete so cached dirs purge; `delete→create→delete` stays a net delete because the path predates the window; unknown kinds like `rename` pass through untouched (:34-38).

---

## 6. Renderer Entry Points

### 6.1 Access layer

The bridge is a single contextBridge-exposed global accessed as plain property chains `window.api.<namespace>.<method>`; there is NO wrapper module:

| Layer | Evidence |
|---|---|
| Bridge creation | `contextBridge.exposeInMainWorld('electron', electronAPI)` + `exposeInMainWorld('api', api)` — `src/preload/index.ts:4914-4915`; non-isolated fallback attaches globals :4921-4923 |
| Access pattern examples | `window.api.ui.isMaximized()` — `src/renderer/src/App.tsx:276`; `window.api.pty.write(...)` — `runtime-terminal-inspection.ts:160` |
| Usage census (non-test renderer files) | `ui` ×323, `shell` ×143, `gh` ×129, `pty` ×104, `ssh` ×64, `fs` ×63, `browser` ×54, `cli` ×46, `runtimeEnvironments` ×42, `git` ×38, `plugins`/`worktrees`/`repos` ×30 each … (~78 namespaces) |
| Web-build shim | `installWebPreloadApi()` installs a proxy-fake `window.api` via `createFallbackProxy` for the pure-web build — `src/renderer/src/web/web-preload-api.ts:509-514` |

### 6.2 Representative feature → bridge → channel map

| # | Feature | Renderer call site | Bridge method | Channel |
|---|---|---|---|---|
| 1 | PTY write | `runtime-terminal-inspection.ts:198` (writeAccepted), :160 (write) | `pty.writeAccepted` | `pty:writeAccepted` (`preload/index.ts:989`) |
| 2 | PTY spawn/kill | `lib/launch-worktree-background-terminals.ts:141`; `store/slices/terminals.ts:1611` | `pty.spawn/.kill` | `pty:spawn` :983 / `pty:kill` :1072 |
| 3 | PTY session events | `components/status-bar/use-resource-session-inventory.ts:59,172,181` | `pty.listSessions/onSpawned/onExit` | invoke + event listeners |
| 4 | FS editor open | `runtime/runtime-file-client.ts:252` | `fs.readFile` | `fs:readFile` :3113 |
| 5 | FS editor save | `runtime-file-client.ts:488` | `fs.writeFile` | `fs:writeFile` :3172 |
| 6 | File watching | `hooks/useEditorExternalWatch.ts:359` (`onFsChanged`), :290 (`unwatchWorktree`) | `fs.onFsChanged` | `fs:changed` push (:3296-3300) |
| 7 | Worktrees CRUD | `store/slices/worktrees.ts:3980` create, :1680 updateMeta, :4246 remove | `worktrees.*` | `worktrees:create` :798 etc. |
| 8 | Git status/diff/history/upstream watch | `runtime/runtime-git-client.ts:233`, :300, :372, :199 (`setStatusUpstreamRefWatch`) | `git.*` | `git:status` :3313 etc. |
| 9 | Repos | `store/slices/repos.ts:1164,2970,3274,3326` | `repos.*` | repos channels |
| 10 | Browser pane | `BrowserPane.tsx:805,2872,2965`; `useGrabMode.ts:105` | `browser.*`, `runtime.*` | browser channels |
| 11 | Native chat | `native-chat-session-transport.ts:47-48` | `nativeChat.readSession/subscribe` | `nativeChat:readSession` :4261 |
| 12 | Settings | `store/slices/settings.ts:131,171,211`; live `useIpcEvents.ts:1217`; popout boot `popout.tsx:38` | `settings.*` | `settings:set` :2035 |
| 13 | Dashboard popout | `useDashboardSnapshot.ts:66,131,159`; `AgentKanbanBoard.tsx:40-59` | `dashboard.*` | `dashboard:requestSnapshot` :2376 |
| 14 | Runtime environments | `App.tsx:241`; `runtime-rpc-client.ts:117,250`; `runtime-client-events.ts:24`; `runtime-status-refresh.ts:12` | `runtimeEnvironments.*` | list/call/getStatus :4372/:4411/:4401 |
| 15 | Automations | `automation-host-client.ts:99,129,164,176`; page `AutomationsPage.tsx:756,1315-1319,1637` | `automations.*` | `automations:list/create/listExternalManagers` :4632/:4646/:4636 |
| 16 | Skills | `runtime-skills-client.ts:25`; `skill-update-run-store.ts:72-73,101,109,117` | `skills.*` | `skills:discover` :2498 |
| 17 | Usage/stats | `store/slices/stats.ts:15`; `usage-provider-slices.ts:275-297` | `stats.getSummary`, usage providers | `stats:summary` :4221; `${prefix}:*` family |
| 18 | Notifications | `desktop-notification-sound.ts:10`; `mac-notification-permission-card.tsx:80,91,175` | `notifications.*` | dispatch/probe/getPermissionStatus :2238/:2245/:2243 |
| 19 | SSH targets | `App.tsx:1026,1051,1080` | `ssh.*` | ssh channels |
| 20 | GitHub work items | `store/slices/github.ts:387,409`; PR refresh `useIpcEvents.ts:1151` | `gh.*` | `gh:listWorkItems` :1443 |

### 6.3 Sandbox verification

No direct `window.electron`/`ipcRenderer` usage in production renderer code. Grep across `src/renderer` matched only: the web fallback proxy assignment `web-preload-api.ts:513`; a test double `web-preload-api.test.ts:4332`; and comments about Electron error-wrapping behavior (`lib/ipc-error.ts:2`, `lib/rename-file.ts:12`, `right-sidebar/useFileDuplicate.ts:9`, `settings/VoiceSpeechModelSection.tsx:21`, `terminal-pane/pty-connection.ts:5290`). All real `ipcRenderer` traffic lives exclusively in `src/preload/index.ts`.

---

## 7. Overlap Mapping vs buzz & mission-control

### 7.1 Reference-repo transport facts (spot-checked against actual sources)

**buzz desktop (Tauri 2)**:
- **324 `#[tauri::command]` functions** under `_sources/buzz/desktop/src-tauri/src` (counted via rg).
- Handler registration: `tauri::generate_handler![…]` at `desktop/src-tauri/src/lib.rs:602` (incl. `terminal_runtime::terminal_attach` :603, `terminal_input` :606).
- Terminal backend: `#[tauri::command] pub(crate) fn terminal_attach(request, on_frame: Channel<TerminalMessage>, state)` — frame streaming over a Tauri `Channel` — `terminal_runtime.rs:371`. Frontend client `invoke("terminal_attach")` at `desktop/src/features/terminal/terminalClient.ts:83`; input :93, resize :102, scroll :128, focus :132, detach :136, close :143, ack :147.
- Git/projects wrappers: `shared/api/projectGit.ts:157,167,187,271,314,388,413,434` → backend `commands/project_git.rs` (`get_project_repo_snapshot` :709, `push_project_local_repository` :916, `pull_project_local_repository` :948).
- Workspace: `commands/workspace.rs:126` (`validate_repos_dir`), :153 (`apply_workspace`).
- Relay WS transport (renderer side): `shared/api/relayClientSession.ts:1` (imports Tauri Channel/invoke), WS connect `invoke<number>("plugin:websocket|connect")` :549, send :654; message frames are NIP-01 Nostr arrays.
- Notifications: `commands/notifications.rs:60-80` (notify_rust, D-Bus).
- **No filesystem watcher anywhere in src-tauri** (rg for notify/watcher/RecommendedWatcher crates: no FS-watch usage).

**mission-control**:
- Adapter registry method-dispatch: `registerAdapter/getAdapter/listAdapters/listFinancialAdapters` — `src/lib/adapters/registry.ts:18,23,33,43`.
- Dispatch site: `getAdapter(service.id)` with catalogId fallback at `src/app/api/field-ops/execute/route.ts:215-217`; payload validation :262; execute :420.
- Agent execution = detached spawn: `spawn(process.execPath, args, {detached…})` — `src/app/api/tasks/[id]/run/route.ts:147`.
- Frontend data access: `apiFetch('/api/${endpoint}')` polling loop — `src/hooks/use-data.ts:25,44`; auth/retry wrapper `src/lib/api-client.ts:29-33`.
- **Zero WebSocket hits** across mission-control/src (verified by grep) — HTTP REST + visibility-gated polling + "JSON-as-IPC" shared files only.

### 7.2 Overlap table

| Capability | Fabrica-app | buzz equivalent | mission-control equivalent | Note |
|---|---|---|---|---|
| Command/handler registry | 344 `ipcMain.handle` channels aggregated by one hub (`register-core-handlers.ts:109`) | `generate_handler!` registry `lib.rs:602` + 324 commands | Adapter registry `registry.ts:18-43` dispatched `execute/route.ts:215-420` | Structural triplet: one audited dispatch seam; MC's ServiceAdapter contract (validate→execute→healthCheck, never throw) closest design cousin of Fabrica's provider contracts |
| Terminal/PTY | `pty:spawn/writeAccepted/kill` `preload/index.ts:983,989,1072` | `terminal_attach/input/resize/close` `terminal_runtime.rs:371,601,621,668`; `terminalClient.ts:83-147` | None (headless `claude -p` children only) | Fabrica≈buzz nearly 1:1 (spawn/write/resize/exit); buzz streams frames via Tauri Channel, Fabrica via ipcRenderer events; buzz's damage-encoded snapshot + `terminal_ack` flow (`terminalClient.ts:147`) is direct prior art for Fabrica's buffer-snapshot capability system |
| Filesystem open/save API to UI | `fs:readFile/writeFile` `preload/index.ts:3113,3172` | None (files touched via agent MCP tools) | None (JSON data dir via routes) | Fabrica unique in exposing editor-grade fs API to its UI layer |
| **File watching** | Full pipeline (§5) | **Absent** | **Absent** | Net-new engineering in both references' terms — no implementation to copy; only conceptual kin is MC's JSON-file polling |
| Git ops/source control | `git:status` :3313 + mutation family | `projectGit.ts:167,187,314,388,413` → `project_git.rs:709-948`; relay smart-HTTP git | None | Strong Fabrica≈buzz overlap; buzz adds nostr-signed commits + CAS object store, Fabrica uses local/SSH providers |
| Repos/workspaces | `repos.*`, `worktrees.create` | `workspace.rs:126,153`; project/repo binding kinds 30617/30621 | Projects CRUD `/api/projects` | Buzz groups repos under Nostr projects; Fabrica worktree fan-out has NO reference equivalent; MC projects are task containers, not checkouts |
| Chat/agent messaging | `nativeChat:*` push+pull IPC | Stream messages kind:9/40002 over relay WS (`relayClientSession.ts:549,654`) | Inbox threads + auto-respond runs (polling) | All three model agent conversations; carriers differ: typed IPC vs signed Nostr events vs JSON+polling |
| Runtime environments/remote hosts | `runtimeEnvironments:*` + RPC methods | Managed agents lifecycle (start/stop/restart/reconcile) + K8s remote bodies | Daemon dispatch + PID-liveness reconciliation | Shared idea: orchestrating out-of-process agents; Fabrica=browser of hosts, buzz=relay-owned identity, MC=file-coordinated daemon |
| Automations/scheduling | `automations:list/create/runNow…` | Workflow engine kinds 30620/46001-46007 + cron | node-cron scheduler `daemon/scheduler.ts` | Conceptual triplet trigger→actions; buzz/MC add approval gates Fabrica lacks at this layer |
| Skills | `skills:discover` + update runs | Persona packs `.persona.md` + skills dirs | `skills-library.json` + generated SKILL.md (`sync-commands.ts`) | All treat skills as data; MC regenerates CLI integration files like Fabrica's hook-service installs |
| Usage/stats | `${prefix}:getSummary/getDaily` family | Agent turn metrics kind 44200 | Cost/token counters in daemon-status.json | Same goal (per-agent cost accounting); different carriers |
| Notifications | OS notification center via `notifications:*` | OS-native notify_rust `notifications.rs:60-80` | Inbox-as-notification channel | Buzz/Fabrica both wrap OS centers; MC routes through inbox abstraction |
| Frontend access layer | Global `window.api` bridge (`preload/index.ts:4914-4915`) | Typed Tauri wrappers `invokeTauri` (`projectGit.ts:14`) + RelayClient singleton | `apiFetch` wrapper `api-client.ts:29-33` + polling hooks | One access layer each; Fabrica sync-shaped RPC, buzz event-stream-first, MC poll-first REST |
| Push/event streaming to UI | ipcRenderer `.on` listeners (`pty:*` events, `fs:changed`, `nativeChat:appended`, `worktrees:changed`) | Tauri Channels + relay WS frames (`terminal_runtime.rs:371` on_frame) | **None — polling only** (zero WS hits verified) | MC is the outlier; synthesis needing realtime can borrow buzz's Channel/backpressure patterns, never MC's polling |

---

## 8. Takeaways for the Transformation Plan

1. **Fabrica ≈ buzz at the desktop-shell layer**: hardened command registry (Electron `ipcMain.handle` hub vs Tauri `generate_handler!`), PTY terminals pushed over a dedicated channel, git/project command families. The most portable buzz pattern is the terminal ack/snapshot flow.
2. **Mission-control contributes contracts, not transports**: its ServiceAdapter contract (validate→execute→healthCheck, never-throw, dry-run) maps onto Fabrica's automation/plugin seams; its polling-only transport should NOT be carried where Fabrica already has push IPC.
3. **The watcher stack is Fabrica-exclusive** among the three repos and is the highest-risk subsystem to preserve verbatim during any rebrand/framework change: crash isolation (forked child + canary + fuse), WSL in-distro polling, remote intent persistence, and removal fencing are all load-bearing behaviors documented at line level in §5.
4. Any "After-Rebrand" architecture that renames namespaces must treat `<namespace>:<action>` strings as a PUBLIC CONTRACT: they appear simultaneously in main handlers (65 files), the preload bridge (656 invoke sites), and ~78 renderer namespace usages.

---

## 9. Scan-Coverage Statement

**Swept exhaustively (rg, whole `src/` tree excl. nothing under src)**: all `ipcMain.handle(`/`ipcMain.on(` registrations (literal + constant-named + template-literal identified separately); all `ipcRenderer.invoke(` sites in `src/preload/index.ts` (656 counted, namespaced census produced); watcher-primitive sweep (`fs.watch`, `@parcel/watcher`, `chokidar`) across `src/main`.

**Read in full (non-test)**: `register-core-handlers.ts` (234 lines); `filesystem-watcher.ts` (all 1,961 lines); `filesystem-watcher-ignore.ts`; `filesystem-watcher-event-batch.ts`; `filesystem-watcher-wsl.ts`; `wsl-watcher-process-exit.ts`; `remote-watcher-event-batch.ts`; `watcher-removal-gate.ts`; `watcher-removal-drain.ts`; all 27 non-test `parcel-watcher-*` files; all 9 non-test `runtime-watcher-*` files; `shared/filesystem-watch-batch-window.ts`; `shared/runtime-file-watch-limits.ts`; `git-status-upstream-ref-watch-request.ts`; `worktree-git-status-ref-watch.ts`; `worktree-base-directory-watcher.ts` (+targets); `worktree-git-common-watch.ts`; `worktree-base-directory-notifications.ts`; `worktree-watcher-failure-refresh-cooldown.ts`; `plugins/plugin-dev-watcher.ts`; `macos-tcc-prompt-watch.ts`; `runtime/file-watcher-host.ts`; `runtime/rpc/methods/file-watch-event-batcher.ts`; `file-watch-stream-lifecycle.ts`; `native-chat/transcript-watch.ts`; `transcript-native-watcher.ts`.

**Read partially / skimmed**: `worktree-base-directory-poller.ts` (lines 50–170 of 380); `providers/ssh-filesystem-provider-watch.ts` (first 100 of 262); `runtime/rpc/methods/files.ts` (grep-level around `files.watch`); `transcript-watch-engine.ts` (first 120 of 325); relay watcher registry/pool/capacity/emitter/notifier (targeted greps); `main/ipc/filesystem.ts` (handler region 1190–1229 + channel inventory); `main/index.ts` shutdown region 1750–1789; `preload/index.ts` exposure block + cited channel regions; `usage-provider-handlers.ts` (registration region).

**Skipped (explicit)**: all `*.test.ts` files; `parcel-watcher-process-test-child.ts` (test harness); worktree base-dir collector/filter/head-refresh/polling detail files referenced but not opened (`worktree-base-directory-change-collector.ts`, `-event-filter.ts`, `worktree-head-identity-refresh.ts`, `worktree-git-common-polling.ts`, `-primary-polling.ts`, `worktree-common-git-directory.ts`); remaining deep `relay-watcher-*` detail files; full line-by-line reads of the ~5,800-file renderer tree (census was rg-based, 20 representative features read at call-site level); handler BODIES for low-risk single-channel families listed in §4.14 (channel names + registration anchors captured; payload shapes inferred from preload type contracts rather than handler internals); `_sources/buzz` beyond spot-checked files (relay crate internals covered by existing Round-2 doc `discovery/buzz-discovery.md`); mission-control daemon bodies (covered by Round-1 doc). Renderer mobile/ and cli/ trees not read.

**Ground-truth counts produced this session**: 344 literal handle registrations / 342 unique channels / 65 files; 33 literal `.on` channels (all enumerated §3.2); 656 preload invoke sites / 76 namespaces; 324 buzz tauri commands; zero WebSocket hits in mission-control/src; zero fs-watcher crates in buzz src-tauri.

No file outside `.Fabrica-atlas-board/` was created or modified during this task.

