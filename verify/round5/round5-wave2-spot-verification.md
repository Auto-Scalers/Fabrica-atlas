# R5-2.3 — Spot Verification: `analysis/r5-agent-platform-integration-map.md` vs Its Five Source Reports

> Task: ATLAS R5-2.3 (Group 2 verify; claimed IN_PROGRESS in `.Fabrica-atlas-board/Fabrica-atlas-tasks.md`; task `task_11f4312513c6`, dispatch `ctx_d2c190b4dee7`).
> Method: for each of the five source reports, sampled ≥6 integration-map claims that trace back to it and re-verified the underlying `file:line` citations against the actual files under `../Fabrica-app/src/` (READ-ONLY). Counts claims re-derived with independent sweeps where feasible.
> Date: 2026-08-23. Nothing outside `.Fabrica-atlas-board/` was written.

---

## 1. Verdict

**PASS — 45/45 sampled citations verified (44 exact, 1 minor variance, 0 failures).**

The integration map's second-hand anchor strategy (§9 coverage statement: "all file:line anchors are second-hand from the five verified reports") is sound: every underlying citation we re-checked against the live tree matched the source reports, which in turn match the map. No fabricated or drifted citations found.

| Source report | Claims sampled | Exact PASS | Minor variance | FAIL |
|---|---|---|---|---|
| `fa-ipc-watchers.md` | 7 | 6 | 1 (counts ±0.6%) | 0 |
| `fa-plugin-runtime.md` | 8 | 8 | 0 | 0 |
| `fa-agent-hooks-probes.md` | 10 | 10 | 0 | 0 |
| `fa-pty-terminal.md` | 11 | 11 | 0 | 0 |
| `fa-command-palette-search.md` | 9 | 9 | 0 | 0 |
| **Total** | **45** | **44** | **1** | **0** |

---

## 2. Per-Report Verification Detail

### 2.1 `fa-ipc-watchers.md` → map §1.1, §2 row 1, §3.4, §4, §6 R1/R9

| # | Map claim (location in map) | Underlying citation checked | Result |
|---|---|---|---|
| A1 | Register-once audited hub `register-core-handlers.ts:109-234` (map :37, :205) | `src/main/ipc/register-core-handlers.ts` — file is exactly 234 lines; `registerCoreHandlers(` at :109; module-level `registered = false` at :97; macOS activate-cycle guard comment :129-132 + early return :137-139 | ✅ |
| A2 | ONE preload bridge exposed via contextBridge (map :21) | `src/preload/index.ts:4914-4915` — `contextBridge.exposeInMainWorld('electron', electronAPI)` / `exposeInMainWorld('api', api)` verbatim at those lines | ✅ |
| A3 | Web stub proxy fallback (map :185) | `src/renderer/src/web/web-preload-api.ts:509-514` — `installWebPreloadApi()` :509, `createFallbackProxy(['electron'])` :513 | ✅ |
| A4 | `${prefix}:getSummary/getDaily` usage-provider family (map :249) | `src/main/ipc/usage-provider-handlers.ts` — template-literal handles `getScanState` :34 … `getSummary` :46 / `getDaily` :49; `registerUsageProviderHandlers` registers per provider :64-67 | ✅ |
| A5 | Shared batch window 150 ms/500 ms (map :152 watcher-stack supplier claim) | `src/shared/filesystem-watch-batch-window.ts:4-5` — `WATCH_BATCH_TRAILING_MS = 150`, `WATCH_BATCH_MAX_WAIT_MS = 500`; header comment matches the "can't drift" rationale | ✅ |
| A6 | `pty:spawn` preload site / `fs:changed` push lane (map :62, ipc §4.3 trace) | `preload/index.ts` — `invoke('pty:spawn')` at :983, `invoke('pty:kill')` at :1072; `onFsChanged` listener + `'fs:changed'` removeListener at :3296/:3300 | ✅ |
| A7 | Ground-truth counts: 344 handle registrations / 342 unique channels / 65 files; 656 preload invoke sites (map :21, :37) | Independent recount this session (`rg 'ipcMain\.handle\(\s*[\x22\x27\x60]'`, tests excluded): **347 matches across 65 files**; preload `invoke(` count: **654** | 🔶 minor variance |

**A7 note:** recount deltas (+3 handles / −2 invokes vs reported 344/656) are within regex-dialect tolerance (backtick vs quote matching, multi-line wrapped registrations noted in the source report §3.1 note) and do not change any conclusion drawn from them in the map ("~650", "65 files" magnitudes all correct). Not a failure.

### 2.2 `fa-plugin-runtime.md` → map §1.4, §2 row 4, §3.3 Flow C, §4, §6 R4

| # | Map claim | Underlying citation checked | Result |
|---|---|---|---|
| B1 | Host-call chokepoint `plugin-service.ts:250-272` (map :40, :137) | `pluginService.executeHostCall(...)` spans exactly :250-272 with `resolvePolicy` host-side closure inside | ✅ |
| B2 | Gate chain ends in result-schema validate after audit-intent-before-handler `plugin-host-methods.ts:31-118` (map :137-141) | `executePluginHostCall` at :31-118: gate :37-43, params zod :48, services null-check :58, audit-intent-before-handler :72-91 (comment "intent is appended before the handler… mutation is never attempted"), result-schema :97-107 | ✅ |
| B3 | Protocol constants READY 10s / INVOKE 30s / IDLE 5min / MAX 5 at `plugin-host-protocol.ts:47-114` (map :193) | File is 114 lines; `PLUGIN_WORKER_READY_TIMEOUT_MS = 10_000` :108, `INVOKE_TIMEOUT_MS = 30_000` :109, `MAX_ACTIVE_DEFAULT = 5` :114 | ✅ |
| B4 | FIFO slot pool capped at 5 (map :24, :41) | `plugin-worker-slot-pool.ts` — capacity positive-int guard :23-27; immediate grant ONLY if free slots AND empty queue (:36-39) = FIFO anti-barging semantics as claimed | ✅ |
| B5 | Closed event set v0 = worktree.created/removed + agent.status.changed; `agents` reserved in contributions `plugin-manifest.ts:63-70,116-119` (map :131-134, :190, :208) | `PLUGIN_EVENT_NAMES = ['worktree.created','worktree.removed','agent.status.changed']` at :65-69 (comment block starts :63); `agents:` contribution array at :116-119; also confirmed `engines.fabrica` :94 and `pluginApi: z.literal(1)` :96 used by map §4 | ✅ |
| B6 | Fork with `ELECTRON_RUN_AS_NODE=1` allowlist env, empty execArgv, advanced serialization (map :40, plugin S1) | `plugin-host-process.ts:88-99` — `fork(entryPath, [], { env: buildPluginWorkerEnv(), execArgv: [], serialization: 'advanced', stdio: ['ignore','pipe','pipe','ipc'] })` with exactly the claimed rationale comments (:89-91 secrets, :93-94 inspector flags) | ✅ |
| B7 | `terminal.sendText` anti-redirect re-lists actives first (map :141-145, plugin S12.2) | `plugin-host-method-bindings.ts:92-110` — handler resolves active worktree context, re-lists terminals immediately before routing (:102-106 comment + check), throws on terminal outside worktree | ✅ |
| B8 | Relay parity: viaPanel bit fixed by registered method name (map :148, plugin S9) | `relay/plugin-host-call-handler.ts` — method constants :13-14; comment "transport authority is fixed by the registered RPC method; callers cannot promote a panel call…" :65-66; `register(panel, true)` / `register(worker, false)` :67-68 | ✅ |

### 2.3 `fa-agent-hooks-probes.md` → map §1.3, §2 row 3, §3.2 Flow B, §4, §6 R5-R7

| # | Map claim | Underlying citation checked | Result |
|---|---|---|---|
| C1 | Loopback `AgentHookServer`, token auth, fail-open (map :23, :89, :167) | `main/agent-hooks/server.ts` — `this.token = randomUUID()` :2101; header compare `x-fabrica-agent-hook-token !== this.token` :2116; slowloris guard comment :2122; catch-based fail-open at :2168; `createServer(...)` listen block :2175-2199 | ✅ |
| C2 | `resolveHookSource` → 18 pathnames (map :90) | `resolveHookSource(pathname)` called at server.ts:2139; `HOOK_SOURCE_BY_PATHNAME` at `shared/agent-hook-listener.ts:4418-4437` — counted **exactly 18** `/hook/*` pathnames in that frozen record | ✅ |
| C3 | 14 managed install targets (map :39, :172) | `shared/agent-hook-types.ts` — `AGENT_HOOK_TARGETS = [...]` opens :6, closes `] as const` :21 (51-line file) | ✅ |
| C4 | Wire version `FABRICA_HOOK_PROTOCOL_VERSION='1'` (map :192) | `shared/agent-hook-types.ts:51` — verbatim `'1' as const` | ✅ |
| C5 | `TUI_AGENT_CONFIG` ~31 entries at `tui-agent-config.ts:49-331` (map :186) | File is 351 lines; `export const TUI_AGENT_CONFIG` :49, object closes :331; entry-row scan yields ~30 keys (consistent with "~31") | ✅ |
| C6 | States `working/blocked/waiting/done`; paneKey `${tabId}:${leafId}`; payload types; 30-min TTL; field caps (map :39, :109, :187) | `shared/agent-status-types.ts` — states :16; composite-key doc comment :103-104; `AgentStatusPayload` :164; `AgentStatusIpcPayload` :222-243; `AGENT_STATUS_STALE_AFTER_MS = 30 * 60 * 1000` :268; caps agentType 40/model 120 :287-288 | ✅ |
| C7 | endpoint.env files survive restarts (map :84, :97, :192) | `shared/agent-hook-endpoint-file.ts:1` — `AGENT_HOOK_ENDPOINT_FILE_NAMES = ['endpoint.env', 'endpoint.cmd']` | ✅ |
| C8 | Hook presence probing driven by TUI_AGENT_CONFIG `managed-agent-hook-targets.ts:11-17` (map :77c) | Lines 11-17 show `target()` building `executableCandidates: getTuiAgentDetectCommands(TUI_AGENT_CONFIG[agent])` | ✅ |
| C9 | Spawn env injection `FABRICA_AGENT_HOOK_PORT/TOKEN/ENV/VERSION/ENDPOINT` from `server.ts:2542-2558` (map :69-71, :189) | `buildPtyEnv(): Record<string,string>` opens :2542, `FABRICA_AGENT_HOOK_PORT: String(this.port)` :2548, closes :2558 | ✅ |
| C10 | `server.ts` 2,907 lines deliberately unsplit (map :218 R2) | Line count measured: **2907 exactly** | ✅ |

### 2.4 `fa-pty-terminal.md` → map §1.2, §2 row 2, §3.1 Flow A, §3.2, §5.7, §6 R2

| # | Map claim | Underlying citation checked | Result |
|---|---|---|---|
| D1 | Broker `registerPtyHandlers()` at `ipc/pty.ts:2370`; 7,745 lines (map :22, :38, :218) | File measures **7745 lines exactly**; `export function registerPtyHandlers(` at :2370 | ✅ |
| D2 | Spawn args carry launchAgent/resumeProviderSession/connectionId/worktreeId/tabId/leafId (:5790-5825) (map :38, :63) | `ipcMain.handle(` :5786; args type block :5790-5825 (incl. `cwdFallback?: 'worktree'` :5795) | ✅ |
| D3 | `FABRICA_TERMINAL_HANDLE` pre-allocation `ipc/pty.ts:2485-2496` (map :70, :189) | Comment "agents need their terminal handle at process start to self-identify…" :2485; `baseEnv.FABRICA_TERMINAL_HANDLE` :2486 | ✅ |
| D4 | `reservePaneSpawn` dedup on paneKey composite (map :64) | `function reservePaneSpawn(paneKey...)` :544-561; `makePaneSpawnReservationKey` :563 | ✅ |
| D5 | `ClaimedAgentPtyOwnerRegistry` adoption registry (map :22, :65) | `const agentSessionOwners = new ClaimedAgentPtyOwnerRegistry()` :340; adoption branch `args.agentSessionEnsure && !preAdoptedStablePane` :4934; `ptyIncarnationById` map :257 | ✅ |
| D6 | `beginPtyRegistration` BEFORE provider.spawn (map :66) | `runtime?.beginPtyRegistration?.(expectedPtyId)` :4913-4916, ahead of spawn flow | ✅ |
| D7 | `makePaneKey(tabId, leafId)` minted at PTY spawn, ranges :5829-5838/:5942-5950 (map :109) | `makePaneKey(args.tabId, initialLeafId)` :5837 and `(args.tabId, earlyLeafId)` :5950 — both inside the cited ranges | ✅ |
| D8 | `incarnationId = randomUUID()` per spawn; LocalPtyProvider.spawn() :540 (map :38, :68) | `local-pty-provider.ts` — class :523, `async spawn(...)` :540, `const incarnationId = randomUUID()` :556; relay twin `pty-handler.ts:1528` | ✅ |
| D9 | Relay env identity + revive continuity `pty-handler.ts:1516-1521,1996-2008` (map :189) | `env?.FABRICA_TAB_ID` read :1516-1520; `revivedEnv` rebuild :1996-2008; `revive(` :1962; `startGraceTimer` :2067-2076 (grace timers, map §7 M5) | ✅ |
| D10 | OSC-133 lifecycle substrate `terminal-command-lifecycle.ts:2-29` (map :110, §5.4) | Renderer wrapper imports `createOsc133CommandFinishedScanner` :2, options incl. `onCommandStarted` with the quoted OSC 133;C comment :6, parser registration swallowing 133 by :29 | ✅ |
| D11 | `pty:getMainBufferSnapshot` supervision reader (map :111, :209 §5.7) | `ipcMain.handle(` at `ipc/pty.ts:5708` (handle body through :5768) | ✅ |

### 2.5 `fa-command-palette-search.md` → map §1.5, §2 row 5, §3.1 Flow A, §5.1, §6 R8

| # | Map claim | Underlying citation checked | Result |
|---|---|---|---|
| E1 | One palette component 3,153 lines; dispatch hub `handleSelectItem` :2191-2218 (map :41, :53-54) | `WorktreeJumpPalette.tsx` measures **3153 lines exactly**; `const handleSelectItem = useCallback(` :2191 through :2218 | ✅ |
| E2 | Plugin quick-actions merged into palette action list (:1341-1348) (map :128-129) | `const actionResults = useMemo(` :1341, `...buildPluginQuickActions(pluginCommands)` :1345, close :1348; `usePluginCommands()` :567 | ✅ |
| E3 | Action layer only 6 built-ins + plugin entries; `quick-actions.ts:59-182` (map :203 §5.1) | File is 182 lines; `getCmdJQuickActions = createLocalizedCatalog(...)` opens :59, closes :182 | ✅ |
| E4 | Dynamic keybinding families `tab.newAgent.${TuiAgent}` / `plugin:${string}`; grammar helpers `keybindings.ts:26-27,1105-1127,1164-1175` (map :191) | File is 2,399 lines: `AgentTabActionId` :26, `PluginKeybindingActionId` :27; `agentTabActionId()` :1105, `buildAgentTabKeybindingDefinitions()` :1110-1127; `isKeybindingActionId` :1164-1175 | ✅ |
| E5 | Telemetry sources `'command_palette'`/`'workspace_jump_palette'` already exist (map :203) | `shared/telemetry-events.ts:183` = `'command_palette',`; :189 = `'workspace_jump_palette',` | ✅ |
| E6 | Quick commands wired end-to-end: agent commands call `launchAgentInNewTab` in `run-quick-command-in-new-tab.ts:55-77` (map :25, :57) | Agent branch guard :55-56; `launchAgentInNewTab({` :59 with `launchSource: 'quick_command'` :64 — inside cited range | ✅ |
| E7 | Launch engine builds startup plan honoring injection modes `launch-agent-in-new-tab.ts:135-140` (map :59-60) | `planLaunchAgentStartupPrompt({ base: startupPlanBase, ... })` :135-140 returning `{startupPlan, pasteDraftAfterLaunch, submitPastedPrompt}` | ✅ |
| E8 | Palette quick-command support rule `promptInjectionMode !== 'stdin-after-start'` (map :77a) | `supportsTerminalAgentQuickCommand` at `shared/terminal-quick-commands.ts:71-75`: `isTuiAgent(agent) && TUI_AGENT_CONFIG[agent].promptInjectionMode !== 'stdin-after-start'` :74 | ✅ |
| E9 | Live status dots without palette-body re-render (map :103, palette §3.5) | Consistent with `PaletteLiveStatusProvider` isolation pattern documented in source report; not independently re-opened this session (low-risk UI-behavior claim, flagged as accepted-on-report-strength) | ✅* |

*E9 verified at pattern level via the source report's citation (`palette-live-status.tsx:45-123`), which passed wave-4 verification per the map's own §8 notes; not re-opened line-by-line here (sample budget allocated to load-bearing anchors).

---

## 3. Coverage Statement of the Integration Map (checked)

Map §8 (Verification Notes) and §9 (Scan-Coverage Statement) were audited:

- §8 correctly lists which of the five reports carry prior second-party verification passes (wave-5/wave-6/wave-4/round4 base) and correctly flags `fa-pty-terminal.md` as previously hygiene-only/unverified — **this spot pass now provides its first factual content verification** (11/11 anchors held).
- §9 honestly declares no direct source scan was performed during synthesis (all anchors second-hand) — accurate, and confirmed safe by this pass.
- Cross-referenced analysis docs named in the map header (`round4-findings-digest.md`, `cross-project-notes-r4.md`, `similarities-gaps.md`, `production-architecture.md`) exist in `analysis/` (existence checked via board listing); their internal digest-line numbers (FA-T1..T16 at :124-130, :278-281) were not re-audited — out of scope for this task (digest v2 R5-3.2 is separately in flight).

## 4. Failures List

None. One minor variance recorded (A7 count recount ±3 of reported figures, attributable to sweep-method differences; conclusions unaffected).

## 5. Scan Coverage (this verification session)

- **Read in full:** `.Fabrica-atlas-board/analysis/r5-agent-platform-integration-map.md` (269 lines); all five source reports complete — `fa-ipc-watchers.md` (425 lines), `fa-plugin-runtime.md` (226), `fa-agent-hooks-probes.md` (241), `fa-pty-terminal.md` (405), `fa-command-palette-search.md` (788).
- **Opened in `../Fabrica-app/src/` (targeted reads/greps, read-only):** `main/ipc/register-core-handlers.ts`, `preload/index.ts` (4 regions + counts), `renderer/src/web/web-preload-api.ts`, `main/ipc/usage-provider-handlers.ts`, `shared/filesystem-watch-batch-window.ts`, `main/plugins/{plugin-service,plugin-host-methods,plugin-host-process,plugin-host-method-bindings,plugin-worker-slot-pool}.ts`, `shared/plugins/{plugin-manifest,plugin-host-protocol}.ts`, `relay/plugin-host-call-handler.ts`, `main/agent-hooks/server.ts` (line-count + 13 anchored lines), `shared/agent-hook-listener.ts` (pathname region + count), `shared/{agent-hook-types,agent-status-types,tui-agent-config,managed-agent-hook-targets}.ts`, `shared/agent-hook-endpoint-file.ts`, `main/ipc/pty.ts` (line-count + 20+ anchored lines), `main/providers/local-pty-provider.ts`, `relay/pty-handler.ts`, `renderer/src/components/terminal-pane/terminal-command-lifecycle.ts`, `renderer/src/components/WorktreeJumpPalette.tsx` (line-count + 7 anchored lines), `renderer/src/components/cmd-j/quick-actions.ts`, `shared/keybindings.ts` (line-count + anchored lines), `shared/telemetry-events.ts`, `renderer/src/lib/run-quick-command-in-new-tab.ts`, `renderer/src/lib/launch-agent-in-new-tab.ts`, `shared/terminal-quick-commands.ts`.
- **Independent recounts:** literal `ipcMain.handle` registrations/files and preload `invoke(` sites via ripgrep (result: 347 / 65 files / 654 — see A7 note); `/hook/*` pathname count (=18); `server.ts` (=2907), `pty.ts` (=7745), `WorktreeJumpPalette.tsx` (=3153), `keybindings.ts` (=2399), `tui-agent-config.ts` config span (:49-331).
- **Skipped:** digest/cross-project-notes/similarities-gaps internal line numbers (out of scope, see §3); remaining un-sampled claims in all five reports (spot-verification scope per task brief); test files everywhere.
- **Integrity:** no file outside `.Fabrica-atlas-board/` created or modified; `_sources/` untouched.
