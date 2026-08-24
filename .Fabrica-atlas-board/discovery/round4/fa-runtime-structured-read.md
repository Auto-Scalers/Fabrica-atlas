# FA-RUNTIME STRUCTURED READ — `fabrica-runtime.ts` (R6-T2)

> Task: ATLAS R6-T2 (convergence-memo authorized targeted task). READ-ONLY structured map of the last big unknown in Fabrica-app.
> Target resolved: **`Fabrica-app/src/main/runtime/fabrica-runtime.ts`** (task brief said `src/main/fabrica-runtime.ts`; actual location is one level deeper under `runtime/`, confirmed by glob).
> File facts: **37,549 lines** (rg/Read line count; PowerShell 5.1 `Measure-Object -Line` reports 35,848 due to its encoding handling of this file — all citations below use rg/Read numbering), **1,464,520 bytes** on disk.
> Method: full-file structural extraction (rg over every top-level declaration, every class method signature at indent level 2, all `export`s), plus targeted reads of ~15 representative regions. Not a line-by-line prose read; it is the structured map the task asked for.

---

## 1. Top-level shape (four zones)

| Zone | Line range | Content |
|---|---|---|
| Z1 | 1–1049 | Lint waivers + imports. Line 1 carries an explicit `eslint-disable max-lines` waiver whose comment says: *"FABRICARuntimeService still owns the mutable live graph, PTY handles, waiters, mobile floor/layout state, and managed-worktree reconciliation... the remaining split points need state-owner extraction before enforcing max-lines"* — i.e., the codebase itself documents this file as an acknowledged not-yet-split god object (`fabrica-runtime.ts:1`). Imports span agent-detection, OSC title/OSC7 parsing, agent-session host authority, git runner, OrchestrationDb, workspace rollback (`fabrica-runtime.ts:4-120`, continuing to ~1049). |
| Z2 | 1050–2669 | Module-level types, constants, error classes, pure helpers: e.g. `RuntimeStore` shape (1088), agent-session op limits `AGENT_SESSION_OPERATION_PER_CLIENT_LIMIT = 512` / global `4_096` (1412–1413), bracketed-paste byte markers (1795–1799), `AGENT_HOOK_RUNTIME_ENV_KEYS` = `FABRICA_AGENT_HOOK_PORT/_TOKEN/_ENV/_VERSION/_ENDPOINT` (2418–2424), `RuntimeLineageError` / `WorktreeIdRequiresFullPathError` classes (2527, 2538). |
| Z3 | 2670–35292 | The single exported class **`FABRICARuntimeService`** (`fabrica-runtime.ts:2670`) — ~32,600 lines, ~700+ methods (1,057 indent-2 call-signature matches, of which the large majority are methods; see §3/§4). |
| Z4 | 35295–37549 | Module-scope terminal-text engine: constants (35295–35342), bounded-map/util helpers (35394–35443), preview builder `buildPreview` (35444), restored-tail seeds (35473–35572), tail wait-state computation (35573–35661), ANSI-tail buffers incl. redraw-window logic (35662–36012), retained-row finalization + CSI/ANSI control-sequence parser (36240–36301), transcript append + snapshot matching (36327–36407). These are the pure functions the class calls from its PTY data hot path. |

---

## 2. Exported symbol inventory (complete list, all `^export` hits)

**Class:** `FABRICARuntimeService` — `fabrica-runtime.ts:2670`

**Types (18):** `RemoteFetchResult` (1061), `RemoteTrackingBase` (1063), `AccountsSnapshot` (1070), `CodexRateLimitResetRpcResult` (1076), `RuntimeAutomationCreateInput` (1191), `RuntimeAutomationUpdateInput` (1201), `RuntimeTerminalAgentStatusEvent` (1510), `RuntimePtyDataAdmission` (1571), `RuntimeTerminalDataMeta` (1576), `OrchestrationCompatibilityTerminalAuthority` (1970), `LegacyWorkerTerminalRecoveryResult` (1984), `OrchestrationCompatibilityCallerAuthority` (1996), `MessageWaitResult` (2036 — union `'notified' | 'timed_out' | 'cancelled' | 'waiter_exists'`), `MobileNotificationDispatchEvent` (2566), `RuntimeWorktreeLifecycleEvent` (2577), `MobileNotificationDismissEvent` (2581), `MobileNotificationEvent` (2588), `DriverState` (2601), `PtyLayoutTarget` (2608), `PtyLayoutState` (2616), `ApplyLayoutResult` (2625), `TerminalTailWaitState` (35582).

**Values/functions (7):** `AUTHORITATIVE_TERMINAL_SNAPSHOT_TIMEOUT_MS = 8_000` (35307), `resolveWorktreeScanCacheTtlMs` (35332), `buildPreview` (35444), `buildRestoredTerminalTailSeed` (35501), `computeTerminalTailWaitState` (35590), `tailGainedNewerBlockedReason` (35644), `appendNormalizedToTailBuffer` (35662), `appendNormalizedToMultilineTailBufferUnwindowed` (35860).

Everything else in the file is module-private — the class surface itself is the API (§6).

---

## 3. `FABRICARuntimeService`: constructor + injected dependencies

Constructor at `fabrica-runtime.ts:3264`. Production instantiation is exactly one site: **`src/main/index.ts:2486`** — `new FABRICARuntimeService(store, stats, { ... })` with:

- `agentSessionClaimSigner` loaded from profile userData dir (`index.ts:2487-2490`)
- Lazy PTY providers: `getLocalProvider: () => getLocalPtyProvider()` and `getSshProvider(connectionId)` — comment: *"a daemon swap happens later, so an eager reference would freeze the pre-daemon provider"* (`index.ts:2491-2494`)
- `onPtyStopped: clearProviderPtyState` (`index.ts:2495`)
- `onTerminalAgentStatus: (event) => agentHookServer.ingestTerminalStatus(event)` — runtime→agent-hooks feed (`index.ts:2496-2498`)
- `onTerminalSideEffects` → `mainWindow.webContents.send('pty:sideEffect', batch)` — runtime→renderer push (`index.ts:2500-2504`)
- `getAgentStatusSnapshot` / `getAgentProviderSessionSnapshot` / `getAgentProviderSessionRowsForPane` sourced live from `agentHookServer.getStatusSnapshot()` (`index.ts:2506-2514`)

Stored dependency slots on the class: `getLocalProviderFn`/`getSshProviderFn`/`onPtyStopped`/`onTerminalAgentStatus`/`onTerminalSideEffects`/`getAgentStatusSnapshotFn`/`attestAgentHookCompatibilityAuthorityFn`/`retireAgentHookCompatibilityAuthorityFn`/`canRecoverPersistentLocalPtysFn`/`buildAgentHookPtyEnv`/`getDesktopWindowStatusFn`/`prepareAiVaultSessionResumeFn`/`agentSessionClaimSigner` (`fabrica-runtime.ts:3195-3222`). Late-set services: `setAccountServices` (12746), `setAutomationService` (4523), `setArtifactService` (4527), `setPtyController` (4906), `setNotifier` (4913), `setOrchestrationDb` (3813), bridges `setAgentBrowserBridge` (5351) / `setOffscreenBrowserBackend` (5359) / `setEmulatorBridge` (5367).

Core mutable state clusters (fields, 2670–3263): synced tab graph `tabs` (2688), mobile session-tab snapshots per worktree (2689–2704), idempotency maps `mobileTerminalCreateByMutationId` (2708) and `worktreeCreateByMutationId` (2732, *"retried with the same clientMutationId returns the in-flight operation instead of a duplicate worktree"*), sleep-phase FSM records (2716–2726), leaf/handle indexes `leaves`/`leavesByPtyId`/`handles`/`handleByLeafKey`/`handleByPtyId` (2781–2787), waiter sets (2793, 2826), PTY record map `ptysById` (2878), provider-generation state (2883–2897), driver/layout state (3036–3160), fetch caches (3180–3194), agent-session ops (3223), legacy-worker-recovery queue (3229–3240), PTY-controller inventory generations (3245–3247).

---

## 4. Major section map inside the class (line ranges)

| # | Lines | Section | Anchor evidence |
|---|---|---|---|
| S1 | 2670–3263 | Field/state declarations | §3 above |
| S2 | 3264–3366 | Constructor | `fabrica-runtime.ts:3264` |
| S3 | 3367–3800 | Core accessors, UI state, client settings, quick commands, **automations CRUD/run-now** | `getUIState` 3416, `updateClientSettings` 3514, `listAutomations` 3612…`runAutomationNow` 3742 |
| S4 | 3804–3985 | **Orchestration**: DB accessor, legacy-worker terminal recovery plan/queue | `getOrchestrationDb` 3804, `prepareLegacyWorkerTerminalRecovery` 3831, `reconcileLegacyWorkerTerminals` 3912 |
| S5 | 3985–4530 | Legacy-worker recovery engine (persist batch, reconcile missing, rollback, retry arm/cancel) | 4011–4221; retry maps 3230–3240 |
| S6 | 4531–4728 | Artifacts cloud surface + runtime identity + **orchestration federation** (worker-server calls, relay timers) | `shareArtifact` 4541; `syncOrchestrationFederation` 4637; federation timer maps 2677–2682 |
| S7 | 4729–4940 | Workspace-session host mapping, `getStatus` 4835, AI-vault session resume prep 4898, controller/notifier setters | — |
| S8 | 4942–5375 | Client events, native-chat launch-draft tombstones/fences, worktree lifecycle events, SSH state notifications | `emitClientEvent` 5002, `onWorktreeLifecycle` 5180, `notifySshRelayReady` 5213 |
| S9 | 5375–7050 | **Window graph sync + mobile session-tab snapshots**: attachWindow, syncWindowGraph, headless hydration from workspace sessions, serve/SSH-owned PTY binding classification, retirement fences | `attachWindow` 5375, `syncWindowGraph` 5458, `listMobileSessionTabs` 5699, retirement fences 6680–6850 |
| S10 | 7060–9130 | Headless/mobile session tab groups: materialization, distribution across groups, activation, move/split, markdown tabs | `activateMobileSessionTab` 7364, `closeMobileSessionTab` 7730, `moveMobileSessionTab` 8142, `readMobileMarkdownTab` 8702 |
| S11 | 9160–11100 | **PTY registration & data plane**: pre-allocated handles, registration fences, `registerPty` 9328, execution-context prep 9463, `acceptPtyDataBounded` 9523, `onPtyData` 9549, wait-blocked scheduling 9802–9899, agent-status OSC processing 9900–10633, output sequence/lifecycle generation 10680–10790, remote source-range consumer hooks 10797–10945, subscriptions | — |
| S12 | 11062–12135 | Buffer serialization authority: main/renderer/headless serializers, alternate-screen query 11183, headless emulator seeding/hydration 11202–11630 | `serializeAuthoritativeTerminalBuffer` 11069, `serializeRendererTerminalBuffer` 11630 |
| S13 | 12135–12386 | **Orchestration compatibility authority**: caller verification/freeze, host-scope equality, dispatch authority, launch-authority retire | `verifyOrchestrationCompatibilityCaller` 12157, `getOrchestrationDispatchAuthority` 12322 |
| S14 | 12387–12666 | Terminal cwd/file-uri provenance (OSC7), context resolution, subscription cleanup registry | `resolveTerminalCwd` 12387, `cleanupSubscriptionsForConnection` 12644 |
| S15 | 12667–12859 | Notifications: mobile dispatch/replay/dismiss + plugin notification delivery | `dispatchMobileNotification` 12685, `getMissedNotificationsSince` 12704, `dispatchPluginNotification` 12721 |
| S16 | 12746–13205 | Accounts (Claude/Codex select/add/remove, rate-limit reset credits) + **speech/dictation** model mgmt + streaming dictation sessions | `selectClaudeAccount` 13108, `addCodexAccountFromHome` 13178, `startMobileDictation` 12860 |
| S17 | 13206–15316 | **Resize / layout floor**: fit overrides, driver transitions, remote-desktop viewer/host claims, mobile input floor, viewport negotiation, layout queue, external resize | `beginMobileInputFloor` 14070, `claimRemoteDesktopHost` 13931, `enqueueLayout` 14539, `handleMobileSubscribe` 14777 |
| S18 | 15317–18120 | **Terminal query/mutation API**: list/orphan adoption/visual layouts, active-terminal resolution, pane recovery, show/read/send, agent prompt injection, agent status reads, `waitForTerminal`, setup-terminal completion, `getWorktreePs`, agent-row attachment | `listTerminals` 15355, `adoptTerminalOrphans` 15516, `sendTerminalAgentPrompt` 16675, `waitForTerminal` 17293, `getWorktreePs` 17562 |
| S19 | 18122–19355 | Repos/projects CRUD: host setups, clone flows, folder workspaces, groups, nested repo import, sparse presets, ref search | `cloneRepo` 18862, `importNestedRepos` 18524, `searchRepoRefs` 19170 |
| S20 | 19356–20831 | **GitHub + GitLab hosted-review & issue surfaces** (~1,475 lines): PR/MR checks/comments/reviews/merge/projects/todos/job trace | `createRepoIssue` 20344, `mergeGitLabRepoMR` 19930, `listGitHubProjects` 20434 |
| S21 | 20832–21050 | Managed-worktree inventory: list/detected scan/teardown-missing, port scan/kill | `listManagedWorktrees` 20832, `scanWorkspacePorts` 21023 |
| S22 | 21051–23134 | Managed-worktree activation + **creation pipeline** incl. agent startup draft paste/followup machinery and lineage recording | `activateManagedWorktree` 21060, `pasteStartupDraftWhenReady` 21419, `waitForStartupDraftReady` 21610, `createManagedWorktree` 21683 (**~1,450 lines**) |
| S23 | 23135–24098 | Remote fetch cache/single-flight, tracking-base refresh, drift probes, meta updates, PR/MR base resolution, sort order | `fetchRemoteWithCache` 23312, `probeWorktreeDrift` 23539, `resolveManagedPrBase` 23717 |
| S24 | 24099–24893 | Worktree removal engine: metadata/history removal, browser-page teardown, preserved-branch cleanup targets, force-delete | `removeManagedWorktree` 24263, `forceDeletePreservedBranch` 24175 |
| S25 | 24894–25389 | Terminal rename; **agent-session host authority**: namespace resolution, options mapping, ensure/createAgentSession | `ensureAgentSession` 25079, `createAgentSession` 25165 |
| S26 | 25390–27400 | **Terminal creation & lifecycle**: createTerminal, dedupe, agent-launch terminal, mobile-session terminal + surface waits, renderer mount requests, focus/close/tab-close/split, Claude agent-teams leader prep + tmux-compat | `createTerminal` 25390, `launchAgentTerminal` 25941, `createMobileSessionTerminal` 25999, `splitTerminal` 27177, `prepareClaudeAgentTeamsLeader` 27330 |
| S27 | 27406–28045 | Worktree terminal stop/sleep/exact-stop + spawn semaphore | `stopTerminalsForWorktree` 27406, `sleepTerminalsForWorktree` 27496, `acquireWorktreeTerminalSpawn` 27516, `stopExactTerminalsForWorktree` 27853 |
| S28 | 28046–28671 | Graph-readiness epochs, folder-workspace resolution/env build, selector validation, lineage validation | `markGraphReady` 28065, `assertStableReadyGraph` 28106, `validateLineageParent` 28353 |
| S29 | 28672–29130 | OrchestrationDb hydration, **worktree-lineage inference/listing**, cache invalidation trio, branch/folder rename notifications | `hydrateInferredWorktreeLineage` 28680, `invalidateResolvedWorktreeCache` 29082 |
| S30 | 29131–30600 | PTY↔worktree records, pane-key minting, disconnected-transcript pruning, leaf rebuild, summaries, mobile-session tab sync/publication pipeline | `recordPtyWorktree` 29131, `makeRuntimePaneKey` 29272, `pruneDisconnectedPtyRecords` 29638, `toMobileSessionTabsResult` 30335 |
| S31 | 30602–31308 | Mobile agent status from PTY title truthfulness, hook live-row projection, orchestration-by-pane index, management-title gate | `renewMobileAgentStatusFromPtyTitle` 30602, `buildAgentOrchestrationByPaneKey` 31036 |
| S32 | 31309–32350 | Agent-running detection, **message waiters**, wait-for-terminal resolution, TUI-idle fallback polls, handle issuance/liveness | `isTerminalRunningAgent` 31309, `waitForMessage` 31547, `startTuiIdleFallbackPoll` 31962 |
| S33 | 32414–34597 | **Linear integration** (~2,200 lines): connect/status/search/issues/teams/states/labels/projects/custom views, MCP issue-list, save-issue intent matching + retry tokens + write-failure mapping | `linearConnect` 32420, `linearSaveIssue` 32894, `linearResolveCurrentIssue` 32639, intent matchers 33321/33534/33842 |
| S34 | 34598–34868 | **Jira integration** (~470 lines): connect/sites/search/create/update/comments/transitions/priorities | `jiraConnect` 34692, `jiraGetProjectStatusOrder` 34805 |
| S35 | 34869–35292 | Browser screencast + authoritative-window accessors | `browserScreencast` 34869, `getAuthoritativeWindow` 35275 |
| S36 | 35295–37549 | Module-scope terminal-text engine (Z4, detailed in §1) | — |

---

## 5. State machines (explicit, with anchors)

1. **PTY incarnation/registration fence.** Fields `earlyExitedPtyIncarnations` (2757) + `pendingPtyRegistrationIncarnations` (2758) guard that *"provider exit can beat surface registration; that exact dead incarnation must never publish"*. Methods: `assertPtyRegistrationAllowed` (9389), `releaseRejectedPtyRegistrationFence` (9394), `beginPtyRegistration` (9413), `acceptPtyIncarnationForExit` (9417), `cancelPendingPtyRegistration` (9425), `assertPtyDidNotExitBeforeRegistration` enforced first thing in `registerPty` (9340, def 9445). Lifecycle generation counter advances per incarnation (10684–10707).
2. **Terminal sleep FSM.** Per-worktree record `{ phase: 'stopping' | 'partial' | 'sleeping', generation, ptyIds, handles }` (2716–2726); shared physical teardown promise so concurrent clients coalesce (2713–2715); mutation tail serialization per worktree (2715); committed via `commitWorktreeTerminalSleepPtys` (27998); bounded by `WORKTREE_TERMINAL_SLEEP_TIMEOUT_MS = 12_000` (35339) and `waitForWorktreeTerminalMutation` (35341). Intentional handleless stops recorded so wake can still happen (2759–2761).
3. **Renderer graph-ready epochs.** `rendererGraphEpoch` (2683) + `graphStatus: 'unavailable' | ...` (2684); `markRendererReloading` (28046), `markGraphReady` (28065), `markGraphUnavailable` (28074), guarded mutations via `assertGraphReady` (28095), `captureReadyGraphEpoch` (28101) + `assertStableReadyGraph(expected)` (28106) — optimistic-concurrency fence against mid-flight graph changes.
4. **Driver / input-floor FSM.** `currentDriver` map of `DriverState` (3036; exported type 2601). Mobile writes acquire a floor claim `{ base, generation, committedGeneration, pending }` via `beginMobileInputFloor` returning `{commit, rollback}` (14070–14109); soft-leave grace admitted via `pendingSoftLeavers` (3074, consumed at 14077–14079); stale generations may not overwrite newer baselines (14102–14107).
5. **Layout queue.** Per-pty `LayoutQueueEntry` (2629, queue map 3153); `coalescesWith` decides merge vs replace (14524); `enqueueLayout` awaits apply result (14539); fresh-subscribe guard set (3160, check 14490).
6. **Waiter FSMs (two families).** Terminal waiters `TerminalWaiter` (2018) in `waitersByHandle` (2793) with TUI-idle fallback polling loops (31962, 32047, adopted-explicit idle status 32113); message waiters (2826) resolving to exported union `MessageWaitResult = 'notified' | 'timed_out' | 'cancelled' | 'waiter_exists'` (2036), single live waiter per type check (2041), cancel on handle close (31601). Wait-blocked detection uses keyword pattern + carry chars + 50ms min interval (35297–35299) and per-pty state (2912).
7. **Agent-session operation ledger.** In-flight ops capped per-client 512 / global 4096 (1412–1413), deterministic UUID seeding (1415), unknown-outcome tolerance helper (1403), stored at 3223; consumed by `ensureAgentSession`/`createAgentSession` (25079/25165).
8. **Worktree scan/resolved caches with generation counters.** `resolvedWorktreeGeneration` + `worktreeScanGenerations` + TTL'd caches/in-flight dedupes (2814–2819); TTLs `RESOLVED_WORKTREE_CACHE_TTL_MS = 1000` (35324), `WORKTREE_SCAN_CACHE_TTL_MS = 30_000` (35325), agent-scratch 5min (35329); triple invalidation on branch rename / folder rename / SSH target change (29082–29130).
9. **Legacy-worker terminal recovery retry loop.** Serialized promise queue + retry budget maps + receipt epochs (3229–3240); plan produced by imported `planLegacyWorkerTerminalRecovery` (118–120); engine S5 (4011–4221) with arm/cancel retry timers (4181/4189).
10. **Headless hydration gate.** `headlessHydrationState: Map<string,'pending'|'done'>` (2954) gating `maybeHydrateHeadlessFromRenderer` (11286).
11. **Native-chat launch-draft resolution tombstones.** Bounded ring of 200 tombstones (2641) with fence application + retirement (5121/5101/5147).

---

## 6. Public API surface (grouped; all public-class methods)

Roughly 700+ public/private methods. Public-method domain groups (first anchor each):

- **Terminal ops:** `listTerminals` 15355, `resolveActiveTerminal` 16227, `showTerminal` 16486, `readTerminal` 16524, `sendTerminal` 16617, `sendTerminalAgentPrompt` 16675, `waitForTerminal` 17293, `renameTerminal` 24894, `focusTerminal` 26953, `closeTerminal` 27111, `closeTerminalTab` 27157, `splitTerminal` 27177, `resizeForClient` 13206, `inspectTerminalProcess` 19139, `getTerminalAgentStatus` 16709, `isTerminalRunningAgent` 31309.
- **Terminal creation/sessions:** `createTerminal` 25390, `dedupeTerminalCreate` 25824, `launchAgentTerminal` 25941, `createMobileSessionTerminal` 25999, `ensureAgentSession` 25079, `createAgentSession` 25165, Claude teams leader prep 27330/27344, tmux-compat 27317.
- **PTY/provider callbacks (called BY the PTY layer):** `registerPreAllocatedHandleForPty` 9174, `registerPty` 9328, `onPtySpawned` 9303, `onPtyData` 9549, `acceptPtyDataBounded` 9523, `onPtyExit` 13540, `onClientDisconnected` 13373, `setPtyController` 4906.
- **Repos/projects/workspaces:** `addRepo` 18671, `createRepo` 18740, `cloneRepo` 18862, `showRepo` 19031, `updateRepo` 19052, `removeProject` 19112, `setupProjectClone` 18186, folder workspaces 18293–18477, groups 18289–18342, `scanNestedRepos` 18478, `importNestedRepos` 18524, sparse presets 18639–18670.
- **Worktrees:** `listManagedWorktrees` 20832, `activateManagedWorktree` 21060, `sleepManagedWorktree` 21051, `createManagedWorktree` 21683, `removeManagedWorktree` 24263, drift/base reconcile 23384–23601, ports 21023/21027, `getWorktreePs` 17562, lineage 28680/28725.
- **Git remotes:** `getCanonicalFetchKey` 23135, `getOrStartRemoteFetch` 23197, `fetchRemoteWithCache` 23312, `resolveRemoteTrackingBase` 23320, `hasRemoteTrackingRef` 23358.
- **GitHub:** hosted review 19547–19678, issues/PRs 19422–20523, projects V2 20434–20517. **GitLab:** 19679–20058. **Linear:** 32420–34691. **Jira:** 34692–34867.
- **Automations/artifacts:** 3612–3760 and 4531–4570.
- **Accounts/speech:** 13108–13204, dictation 12764–13067.
- **Mobile sessions:** `listMobileSessionTabs` 5699, `activateMobileSessionTab` 7364, `moveMobileSessionTab` 8142, `updateMobileSessionPaneLayout` 8193, markdown tabs 8702/8713, subscribe/unsubscribe 14777/14955, display modes 14728/15102ff, notifications 12667–12745, missed-notification replay 12704.
- **Plugins:** `dispatchPluginNotification` 12721 (the only plugin-specific runtime method; the rest of plugin access goes through a narrowed delegate — §7).
- **Browser/emulator:** `browserScreencast` 34869, bridge setters 5351–5373.
- **Orchestration:** `callOrchestrationWorkerServer` 4586, federation sync/relay 4637–4723, legacy recovery 3831/3912, compatibility authority 12135–12385.

---

## 7. Integration points with other subsystems

| Subsystem | Direction | Evidence |
|---|---|---|
| **App bootstrap** | instantiated once | `src/main/index.ts:2486` sole production construction site; deps wired inline (2487–2514). |
| **IPC handlers** | handlers receive the service | `ipc/runtime.ts:23` `registerRuntimeHandlers(runtime: FABRICARuntimeService)`; `ipc/pty.ts:2370` `registerPtyHandlers(...)` (daemon routing note at 2018); `ipc/worktrees.ts:1804`; plus `ipc/repos.ts`, `ipc/plugins.ts`, `ipc/notifications.ts`, `ipc/worktree-remote.ts`, `ipc/ssh.ts`, `ipc/terminal-preview.ts`, `ipc/workspace-cleanup.ts`, `ipc/agent-status-ipc-boundary.ts` (all reference the type; consumer list verified by repo-wide grep). |
| **Runtime RPC (daemon/mobile/CLI)** | wrapped | `runtime-rpc.ts:64` declares `runtime: FABRICARuntimeService`; `FABRICARuntimeRpcServer` holds it at `runtime-rpc.ts:478-479`; method modules live in `runtime/rpc/methods/*` (terminal, repo, worktree, orchestration, linear, jira, github, gitlab, files, speech, session-tabs, pairing, ai-vault, diagnostics, clipboard, browser, automations — directory listing verified). |
| **Plugin host** | narrowed facade | `plugins/plugin-host-service-bindings.ts:7` — *"Structural subset of FABRICARuntimeService exposed to plugin facade bindings"*; delegate exposes only `resolveActiveWorktreeContext`, `listTerminals` (capped by `PLUGIN_WORKSPACE_TERMINAL_LIMIT`), `sendTerminal`, `dispatchPluginNotification` (8–29). |
| **PTY plane** | bidirectional | Provider injection via constructor (3195–3196, wired lazily at `index.ts:2492-2494`); controller interface `RuntimePtyController` (1625) set at 4906; data enters through `onPtyData`/`acceptPtyDataBounded` (9549/9523); exits through `onPtyExit` (13540). |
| **Agent-hooks server** | runtime→hooks | `onTerminalAgentStatus` callback feeds `agentHookServer.ingestTerminalStatus` (`index.ts:2496-2498`); hook env keys injected into spawned agents (2418–2424); hook attestation authority fns on the class (3207–3215); hook live rows projected into mobile status (30825–30917). |
| **SSH relay / remote** | consumed by + notifies | Consumers `ssh/ssh-relay-session.ts`, `ssh/ssh-remote-fabrica-cli.ts` reference the type; runtime emits `notifySshStateChanged` (5204) and `notifySshRelayReady` (5213); SSH attachment authority registered 12139–12156; SSH-owned PTY classification 6136/6201. |
| **Orchestration** | owns DB handle + federation | `OrchestrationDb` imported (113), `getOrchestrationDb`/`setOrchestrationDb` (3804/3813); worker-terminal release reconciliation imported (114); federation timers/syncs/warnings fields (2677–2682); worker-server invocation 4586. |
| **Window / renderer graph-sync** | pushes graphs | `attachWindow` 5375, `syncWindowGraph` 5458, publication throttle (2687), side-effect batches pushed to `mainWindow.webContents.send('pty:sideEffect')` (`index.ts:2500-2504`); authoritative window accessors 35275–35293. |
| **Daemon headless mode** | supported throughout | headless terminal emulation + seeding 11202–11630, subscriber-driven provider attach 10924, orphan adoption 15516, restore-tail seeds 35473ff. |

---

## 8. Which Atlas capabilities this file ENABLES or BLOCKS

### Enables

1. **Desktop CLI-agent operations platform (the After-Rebrand core).** The runtime already models agents-as-terminals end-to-end: agent status detection from titles/OSC (`detectAgentStatusFromTitle` import 4–11; OSC processor 81–84; status renewal from PTY titles 30602–30687), foreground-agent wrapper retries (1793–1794), agent prompt injection with bracketed paste (91–96, applied at 16675), and the `FABRICA_AGENT_HOOK_*` env contract (2418–2424) that lets external CLI agents report back. This directly substantiates digest item FA-T1 (agent-hooks substrate).
2. **Multi-agent orchestration.** Worker terminals, legacy-worker recovery, federation relays, dispatch authority, mail/message waiters (31547) — the entire orchestration RPC method family sits on this service (§7 RPC row; S4/S5/S6/S13).
3. **Remote/mobile control plane.** Session-tab snapshots, missed-notification replay with epochs (12704–12720), input-floor arbitration (14070), remote-desktop viewer/host claims (13913/13931), speech dictation (12860ff) — a complete second-client surface beyond the desktop renderer.
4. **Headless/server operation.** Headless emulators, orphan adoption, restore tails mean the runtime works without a visible renderer — prerequisite for the CLI-agent-management product operating daemon-first.
5. **Non-coding builder surface.** Automations (3612ff), artifact sharing (4531ff), Linear/Jira/GitHub Projects integrations (S20/S33/S34), nested-folder workspaces (18293ff) — existing material for the "business builders" audience named in the roadmap.

### Blocks / risks

1. **God-object refactor risk.** A 32.6K-line class holding live graph + PTY handles + waiters + floor state + worktree reconciliation simultaneously (self-described at `fabrica-runtime.ts:1`). Any rebrand that touches lifecycle semantics risks regressions across all five domains at once; the waiver text explicitly says split points still need "state-owner extraction."
2. **Connector sprawl blocks clean extraction.** ~4,900 lines of GitHub/GitLab/Linear/Jira logic are inlined as class methods (S20+S33+S34) instead of adapter modules — unlike mission-control's adapter layer (see `.Fabrica-atlas-board/discovery/round4/mc-adapters-linelevel.md`). Porting "ops platform" features to other backends means carving these out first.
3. **Electron coupling in the hot path.** `BrowserWindow` accessed for authoritative-window decisions (35275–35293) and renderer push (`index.ts:2502`) inside the same object that also serves headless clients — complicates any daemon-only packaging.
4. **Concurrency fences are bespoke.** Eleven ad-hoc FSM/fence systems (§5) with no shared framework; verification burden concentrates here. Mitigating fact: the companion test file `fabrica-runtime.test.ts` is itself >48K lines with hundreds of direct constructions (repo-wide grep shows ~300 `new FABRICARuntimeService(` occurrences in tests alone), so behavior lock-in exists.
5. **Single-instance coupling.** Construction requires a store + stats + signer triplet (`index.ts:2486`) and profile-scoped userData paths (2488–2490), consistent with the multi-instance/dev-identity findings in `discovery/round4/fa-multi-instance.md` — a rebrand changing identity rules must thread through this constructor.

---

## Scan-coverage statement

**Read fully:** none (file is 37,549 lines; task scope was a structured read, not a line-by-line prose read).
**Read structurally (100% of file touched):**
- All 295 top-level declaration lines (`^(import|export) `) — enumerated.
- All 30 exported symbols — enumerated verbatim with line numbers (§2).
- All indent-2 method/call signatures (1,057 matches, covering every method in the class) — used to build §4's section boundaries; no gap larger than the ranges shown.
- Field-declaration block 2800–3263 read line-by-line (state inventory §3/§5).
- Targeted full reads of ~18 regions: 1–120 (imports head), 2418–2457, 2670–2799 (fields head), 9328–9372 (registerPty), 14070–14109 (input floor), plus spot confirmation reads in index.ts (2475–2514), plugin-host-service-bindings.ts (1–60), runtime-rpc.ts (grep anchors 64/478–479), ipc/{runtime,pty,worktrees,repos}.ts (registration-function anchors).
**Skipped:** bodies of individual methods between the anchors listed in §4 (i.e., the internal algorithmic detail of ~700 methods was not line-read); bodies of the ~230 test files that construct the service; deep bodies of rpc/methods/*.ts consumers (their existence and wiring verified by grep only).
**Cross-check performed:** line-count discrepancy between tools documented in header; production-instantiation uniqueness verified by grep (`new FABRICARuntimeService` appears outside tests only at `src/main/index.ts:2468-region` — exactly one hit).
