# R4-1.7 - Fabrica-app PTY/Terminal Subsystem Deep Dive (READ-ONLY)

**Task:** ATLAS R4-1.7 (Group 1, Round 4). Task ID `task_93a477f07ef6`, dispatch `ctx_c2eab3411d38`.
**Date:** 2026-08-23. Target: `../Fabrica-app` (read-only; all paths below relative to `Fabrica-app/`).

---

## 1. Architecture Overview

The terminal stack is a three-plane system:

1. **Main-process local plane** - `LocalPtyProvider` wraps node-pty directly in the Electron main
   process (`src/main/providers/local-pty-provider.ts`, class :523, `spawn()` :540).
2. **Relay plane (remote/SSH)** - a standalone Node subprocess ("relay") on the remote host owns
   its own node-pty instances via `PtyHandler` (`src/relay/pty-handler.ts:358`; handler `spawn()`
   :1261, native `pty.spawn` call :1494-1504). It survives disconnects via a grace timer
   (`startGraceTimer`, pty-handler.ts:2067-2076).
3. **Renderer plane** - xterm.js panes consume one push channel through a singleton dispatcher
   (`src/renderer/src/components/terminal-pane/pty-dispatcher.ts:85-97`) with credit-based flow
   control back to main.

Central broker: `registerPtyHandlers()` in `src/main/ipc/pty.ts:2370` - a deliberately monolithic
7,745-line module ("PTY IPC is centralized in one main-process module so spawn env scoping,
lifecycle cleanup, process inspection, and renderer IPC stay behind one audited boundary",
ipc/pty.ts:1). Provider contract `IPtyProvider` from `src/main/providers/types.ts`
(imported ipc/pty.ts:73). Local-vs-SSH routing: `sshProviders` keyed by connectionId
(ipc/pty.ts:237), `ptyOwnership` id-to-connectionId map (:256), resolvers `getProviderForPty`
(:927), `tryGetProviderForPty` (:978).

Incarnation identity: every spawn mints `incarnationId = randomUUID()`
(local-pty-provider.ts:556; relay pty-handler.ts:1528), tracked in `ptyIncarnationById`
(ipc/pty.ts:257); stale exits from reused ids are rejected via `isCurrentPtyExit()` (:259).

## 2. Session Lifecycle

### 2.1 Spawn (renderer-initiated)

`ipcMain.handle('pty:spawn')` at ipc/pty.ts:5786-5825; args carry cols/rows/cwd/env/command/
launchAgent/resumeProviderSession/connectionId/worktreeId/tabId/leafId/initiallyHidden plus
telemetry (:5790-5825). Pre-spawn logic:

- Pane-key reservation and dedup: concurrent spawns for the same `(worktreeId, connectionId,
  paneKey)` share one promise via `reservePaneSpawn` (:544-561) / `makePaneSpawnReservationKey`
  (:563); a duplicate request returns `{...result, isReattach: true}` (:5963-5967).
- Cwd fallback: fresh local spawns may fall back to the worktree root when the saved cwd was
  deleted (#7239), via `cwdFallback: 'worktree'` (:5794-5795); WSL-owned POSIX cwds get existence
  probes first (:5899-5938). Reattach/remote never falls back ("reattach needs exact cwd",
  :5865-5867).
- Startup barrier: local spawns await daemon/provider startup during cold start (:2394-2409,
  awaited :5861-5864) because "the daemon provider swap overlaps first paint".
- Client-disconnect guard: `assertClientStillConnected()` throws `client_disconnected` if the
  caller aborted before physical spawn (:4929-4933); relay mirror at pty-handler.ts:1484-1487
  ("cancellation remains side-effect-free until the exact native spawn seam").
- Agent-session ownership: `args.agentSessionEnsure` routes through a claimed-owner registry
  (`agentSessionOwners = new ClaimedAgentPtyOwnerRegistry()`, :340) reconciled against
  authoritative listings (:386, :4934-4996) - spawning can adopt a live agent PTY instead of
  creating one.
- Stable-pane adoption: `spawnForStablePane()` (:890, invoked :5000-5019) rebinds a persisted
  pane-to-pty binding when the old owner is live, else spawns fresh; persistence fencing via
  `persistAdmittedStablePaneBinding` (:795).
- Registration sequencing: `runtime.beginPtyRegistration(expectedPtyId)` runs BEFORE
  `provider.spawn` (:4913-4918) so the runtime knows the expected ptyId before bytes arrive.

Physical spawn in `LocalPtyProvider.spawn()`:

- Shell selection: WSL uses `wsl.exe` (:591); Windows resolves settings shell override with
  PowerShell implementation probing, Git Bash detection and a pwsh Store-stub workaround
  (:596-664, comment :637); POSIX uses `$SHELL` or `/bin/zsh` login shell (:665-670).
- Env baseline: `TERM=xterm-256color`, `COLORTERM=truecolor`, `TERM_PROGRAM=Fabrica`,
  `FORCE_HYPERLINK=1` (:675-684). App-level env hooks injected via the `buildSpawnEnv` callback
  configured in registerPtyHandlers (:2449-2506): Codex-home scoping, agent attribution env,
  `FABRICA_TERMINAL_HANDLE` pre-allocation (:2485-2496), WSL interop env.
- Worktree-scoped HISTFILE injection (:826-839) calls `injectHistoryEnv` (see section 5.2).
- Launch through `spawnShellWithFallback({ ..., ptySpawn: pty.spawn ... })` (:850-865); registry
  updates follow: `ptyProcesses.set(id, proc)` (:889), metadata maps (agent ids :895-897, shell
  name :898, terminal handle :899-901, worktreeId :902-904, incarnation :910), then
  `this.opts.onSpawned?.(id, incarnationId)` (:911).

### 2.2 Resize

- Renderer-to-main is fire-and-forget `ipcMain.on('pty:resize')` - "halves IPC traffic by skipping
  the empty acknowledgement reply" (ipc/pty.ts:7155-7157). Guards: global resize suppression during
  desktop-fit override (:7158-7161); mobile-presence-lock - "while a phone or remote-desktop viewer
  drives the width, host-side resizes must not reach the PTY or its alt-screen grid garbles"
  (:7162-7170). Hidden-PTY resize output is flagged (`pendingHiddenRendererResizeOutputPtys`,
  :7175-7183) so hidden alt-screen repaints cannot masquerade as live output later. Applied size
  cached in `ptySizes` (:264, set at :7192).
- Local provider reattach resizes defensively ("Existing PTY may reject resize during teardown",
  local-pty-provider.ts:399-401).
- Relay clamps dims to 1..500 before `pty.resize` (pty-handler.ts:1705-1712) and reports ground
  truth via `pty.getSize` (:1715-1723); applied-grid readback is e2e-tested ("reports the PTY grid
  actually applied by node-pty", src/relay/pty-handler.test.ts:2010).
- Measurement-only sibling `pty:reportGeometry` refreshes the restore-target cache without resizing
  (ipc/pty.ts:7196-7200; mobile-fit-hold doc referenced inline).

### 2.3 Kill / shutdown

- `ipcMain.handle('pty:kill')` ipc/pty.ts:7436-7482. Guard: ids starting `remote:` rejected because
  "runtime terminal handles belong to terminal.close; unowned PTY routing could target the local
  provider" (:7437-7440). Missing-provider SSH case tombstones instead of falling back local
  (:7450-7459). Shutdown path `shutdownProviderAndDetectExit(..., { immediate: true, keepHistory })`
  (:7463-7466); if no provider exit event fires, main synthesizes a `code: -1` exit plus
  synthetic-kill memory (:7477-7481).
- Local kill escalation ladder: graceful `proc.kill()`, then SIGTERM, then POSIX process-group
  SIGKILL sweep - `killLocalPtyProcess` (local-pty-provider.ts:284-293), backed by
  `forceKillPosixPtyProcessGroups` (`src/main/pty/posix-pty-process-groups.ts`) and
  `killWithDescendantSweep` (`src/main/pty-descendant-termination.ts`, imported :59);
  deadline-forced kill after the graceful window (:312-315).
- PID-recycle defense on teardown: `proc.kill` is neutralized before `destroy()` because "node-pty
  SIGHUPs on socket 'close', which can race here and signal a reaped/recycled pid"
  (local-pty-provider.ts:1024-1026; also :446).
- Windows tree-kill classification: `classifyWindowsTreeKillTarget` walks ancestry into
  own/absent/foreign/unknown before any `taskkill /T /F`
  (`src/main/windows-pty-root-identity.ts:18-27`, ancestor hop cap :22); documented limitation at
  :33-35 (a recycled PID landing on another FABRICA descendant still reads `own`).
- App quit: `killAllPty()` exported from ipc/pty.ts:7741.
- Close UX gates on child processes: `pty:hasChildProcesses` handle (ipc/pty.ts:7588-7596) feeds
  `RunningTerminalCloseDialog.tsx` / `CloseTerminalDialog.tsx`.

### 2.4 Exit delivery ordering

Exit flushes pending batched output BEFORE notifying the renderer: "the renderer tears down the
terminal on pty:exit, so any batched output not yet flushed would be silently lost"
(ipc/pty.ts:3633-3662). `finalizePtyExitForRenderer` releases producer credit, clears per-pty
accounting "so a reused id restarts aligned at zero on both sides" (:3679-3689), then sends
`pty:exit` (:3699-3702). The renderer mirrors this by clearing cumulative char totals on exit
(pty-dispatcher.ts:191-193).

## 3. Data Stream Plumbing (main to renderer)

### 3.1 Producer side (provider to main)

node-pty `onData` flows through the startup-ingress pipeline into two consumers:

- Runtime/headless consumer: the provider's configured `onData` feeds the runtime tail buffer -
  required because "daemon providers lack configure().onData, so feed the runtime here or their tail
  buffer (terminal.read, agent-detection, mobile stream) stays empty" (ipc/pty.ts:4020-4023,
  wiring at local-pty-provider.ts configure call ipc/pty.ts:2517-2519).
- Renderer consumer: bounded batching queue `PtyPendingDataDrainQueue` - "bounded batch windows
  amortize renderer IPC; keystroke echo/redraws bypass them" (ipc/pty.ts:2532-2549). Per-pty lane
  decision: `active` vs `background` vs `blocked` (:2534-2547); hidden-gate drops happen even when
  renderer credit is exhausted (:2536-2538).

Sequence metadata rides on payloads: `seq`, `rawLength`, `transformed`, `background`,
`droppedOutput` (:2522-2530); `acceptPtyDataForRenderer` computes `startSeq = outputSeq -
rawLength` (:3735-3737).

### 3.2 Push channel + credit-based flow control

- Send point: `sendPtyDataToRenderer` keeps per-pty byte accounting (`sentChars`/`ackedChars`),
  tracks global in-flight chars, then calls `mainWindow.webContents.send('pty:data', payload)`
  (ipc/pty.ts:3105-3153). On send failure it rolls back accounting and marks the pty in
  `rendererDeliveryRestoreNeededPtys` (:3128-3152).
- ACK loop: the renderer reports cumulative `processedChars` via `pty:ackData`
  (ipc/pty.ts:7211-7229; preload/index.ts:1023). Main applies cumulative ACKs
  (`applyCumulativeAck`, :2990-2999), credits the provider via
  `acknowledgeDataEvent(id, acknowledged)` (:7226), and reactivates blocked lanes (:7227,
  `schedulePendingDataAfterCreditReport` :3002-3009). Legacy per-chunk delta payloads are tolerated
  for dev hot-reload pairs (:7221-7224).
- Delivery-health self-healing: when a gated PTY signals delivery may be stuck on lost ACKs, main
  probes with `pty:requestDeliveryResync` (ipc/pty.ts:3019-3043) and reconciles from the renderer's
  authoritative totals via `pty:deliveryResyncResponse` (:7231-7256) or the invoke-based
  `pty:reportRendererDeliveryState` heal lane - "the field wedge (v1.4.121-rc.0) kills every
  main-to-renderer push channel while invoke survives, so the resync rides here plus a write-off
  lane" (:7258-7285). Bytes confirmed lost after a wedge are written off with restore markers so
  panes repaint from snapshots instead of hanging (`writeOffLostRendererDelivery`, :3046-3103).
- Handshake gate: sends are held until the renderer proves its listener is live via
  `pty:rendererDispatcherReady`; "until then sends are held so boot-window bytes cannot drop into a
  listener-less page and pin the gate" (:7301-7317). A watchdog force-opens the gate if no handshake
  lands (:2387-2392 clearRendererDispatcherReadyWatchdog wiring; :7313 cancel on real handshake).
- Active/visible/hidden scheduling hints from the renderer: `pty:setActiveRendererPty`
  ("active panes just get first chance at the bounded output reserve", :7319-7329),
  `pty:setRendererPtyVisible`, `pty:setHiddenRendererPty`, `pty:setPtyDeliveryInterest`,
  `pty:terminalViewAttributes` (:7337-7419).

### 3.3 Consumer side (renderer)

- One global IPC listener per channel routed by ptyId "avoids the N-listener
  MaxListenersExceededWarning with many panes" (pty-dispatcher.ts:49-50). Primary data handler plus
  sidecars: sidecars run AFTER the primary "so a side-effect-only watcher can't delay xterm
  rendering" (:61).
- Deferred ACKs: "main budgets by bytes PARSED not received; ACK fires when xterm consumes"
  - `deliverPtyDataWithDeferredAck` (pty-dispatcher.ts:166-167), implemented with the ack gate in
  `terminal-pty-ack-gate.ts`.
- Pre-handler buffer: chunks arriving before a pane attaches are buffered per-pty
  (`bufferPreHandlerPtyData`, pty-dispatcher.ts:150-155) and drained on registration (:327-335).
- Eager buffer for restart reconnection: `registerEagerPtyBuffer` caps pre-attach output at
  `TERMINAL_SCROLLBACK_SESSION_BUFFER_BYTE_LIMIT` = 512 KiB
  (pty-dispatcher.ts:248-259; limit defined in `src/shared/terminal-scrollback-limits.ts:1`),
  using head-index trimming to avoid quadratic shifts (:266-285) and identity-guarded handler
  removal against the detach/attach race #7894 (:288-295, :313-321).
- Watchdog: `startTerminalDeliveryWatchdog` detects blackholed push delivery and can detach and
  re-subscribe all push listeners (`reattachPtyDispatcherPushListeners`, pty-dispatcher.ts:72-97);
  the e2e wedge simulation hook is `isPtyPushDeliveryBlackholed` (:104-107).

## 4. Terminal Multiplexing / Tabs / Panes

- Pane identity is a composite key: `makePaneKey(tabId, leafId)` built during spawn validation
  (ipc/pty.ts:5829-5838, :5942-5950); reverse maps `ptyPaneKey`/`paneKeyPtyId` (:278-280) with
  teardown listeners (:305-307).
- Stable-pane ownership persists across reloads: `resolveStablePaneOwner` (:679),
  `attachStablePaneOwner` (:825), retirement path `retirePersistedStablePaneOwner` (:735); spawn
  adopts a live owner rather than spawning duplicates (:5000-5019).
- Renderer tab model lives in the zustand store: `createTabsSlice`
  (`src/renderer/src/store/slices/tabs.ts:829`) with split directions left/right/up/down
  (:48), close-to-right/left (:1439-1467), tab-group layout nodes (`TabGroupLayoutNode`, :351);
  terminal-specific state in `terminals.ts` slice (4,291 lines, same dir).
- Layout serialization for session restore: `serializeTerminalLayout` /
  `replayTerminalLayout` / `restoreScrollbackBuffers`
  (`src/renderer/src/components/terminal-pane/layout-serialization.ts:119-241`), invoked by
  `TerminalPane.tsx` (:887).
- Hidden/background parking instead of killing: cold parking of inactive tabs
  (`use-terminal-tab-cold-parking.ts`, `terminal-hidden-view-parking.ts`,
  `parked-terminal-*` files in terminal-pane/) keeps sessions alive while withholding delivery.

## 5. Persistence / Scrollback

### 5.1 Session scrollback snapshots (main-owned)

- `src/main/terminal-scrollback-snapshots.ts`: buffers are stored as per-leaf `.bin` files under
  `terminal-scrollback/` next to the profile data file (:21-38), referenced from session state by
  `v1-<sha256(tabId, leafId)[0:32]>` refs (:41-51). Writes are atomic (tmp file + rename,
  :114-127 sync / :152-170 async), capped at `TERMINAL_SCROLLBACK_STORE_BYTE_LIMIT` = 5 MiB on
  write and replayed at `TERMINAL_SCROLLBACK_REPLAY_BYTE_LIMIT` = 512 KiB
  (`src/shared/terminal-scrollback-limits.ts:2-3`; trailing-byte UTF-8 safety :67-97).
- Legacy in-session `buffersByLeafId` blobs are migrated to refs via
  `migrateWorkspaceSessionTerminalScrollbackSnapshots` (:219-266).
- Deletion/GC: `terminal-history-deletion.ts`, `terminal-history-gc.ts`,
  `terminal-history-tombstone-retry.test.ts`, plus tombstone retry paths in main
  (`src/main/terminal-history*.ts` files).
- Main-side authoritative buffer snapshot for restore: `pty:getMainBufferSnapshot` returns
  serialized hidden-output recovery buffer or provider snapshot with `pendingDeliveryStartSeq`
  dedupe bound (ipc/pty.ts:5708-5768); capability probe `pty:getAuthoritativeBufferSnapshotCapabilities`
  (:7516-7562).

### 5.2 Shell history persistence

- `src/main/terminal-history.ts`: worktree-scoped HISTFILE injection - history dir per hashed
  worktree (`hashWorktreeId`, :121; dirs created 0o700, :57-69), shell detection by basename
  prefix (:13-34), zsh/bash only in phase 1, check-before-set HISTFILE following "Ghostty, Kitty,
  and VS Code" practice (:92-119), WSL distro-keyed roots with `/mnt/...` path conversion
  (:123-138), fallback-shell HISTFILE swap (:147-167). Wired into spawn at
  local-pty-provider.ts:825-839.

### 5.3 Renderer-side serialization

- xterm SerializeAddon snapshots are exposed to main through a global registry keyed by ptyId:
  `registerPtySerializer` / `onSerializeBufferRequest` handler
  (`src/renderer/src/components/terminal-pane/pty-buffer-serializer.ts:45-68, 118-166`) with owner
  symbols preventing StrictMode remount clobbering (:29-33) and title capture because "xterm's
  SerializeAddon does NOT round-trip OSC 0/1/2 title sequences" (:74-75).
- Main requests renderer serialization via push `pty:serializeBuffer:request` and receives
  `pty:serializeBuffer:response` (preload/index.ts:1239-1260; ipc/pty.ts:4144 send site); serializer
  generation tokens guard paneKey reuse races (ipc/pty.ts:312 comment + :449-451).

### 5.4 Replay buffers (relay plane)

- Each relay PTY keeps a `RecentPtyOutputBuffer` replay ring (`REPLAY_BUFFER_MAX`) attached at
  spawn (pty-handler.ts:1530-1534) and serves it on attach: "return replay during spawn before
  renderer handlers register ... retain replay buffers so later restarts receive full history"
  (:1661-1677, notify channel `pty.replay` :1676). Renderer consumes a dedicated `pty:replay`
  channel engaging the replay guard that suppresses xterm auto-replies
  (pty-dispatcher.ts:177-184; preload/index.ts:1183-1188; `replay-guard.ts` in terminal-pane/).
- Relay state survives relay restarts via serialize/revive: `pty.serialize` / `pty.revive`
  dispatcher methods (pty-handler.ts:796-797); revive re-spawns only when the original pid is still
  alive (`process.kill(entry.pid, 0)` probe, :1962-1988) and rebuilds pane identity env from the
  serialized entry (:1990-2059).

### 5.5 Restore markers and desync defense

- When bytes were lost or dropped (`droppedOutput` sentinel entries, ipc/pty.ts:3637-3647;
  overflow marking in the drain queue), main sends `pty:modelRestoreNeeded` so the renderer repaints
  from snapshot instead of stitching a broken stream (send sites :3167-3169, :3217; preload
  index.ts:1188-1193 note that restore is deliberately NOT signaled on pty:data because an in-band
  marker is ambiguous after OSC-9999 cleaning).
- Render-desync evidence collection exists main-side
  (`src/main/ipc/terminal-render-desync-evidence.ts`) with renderer sentinel/frame counterparts
  (`terminal-render-desync-sentinel.ts`, `terminal-render-desync-frame.ts`).

## 6. Shell Integration

- OSC 133 prompt/command segmentation for PowerShell: injected PSReadLine wrapper emits
  133;A/B/C/D sequences (`src/main/powershell-osc133-bootstrap.ts:4-66`, getter :67); Windows CLM
  safety is tested (`powershell-osc133-bootstrap-windows-clm.test.ts`). The renderer swallows
  OSC 133 so markers never paint and derives command lifecycle events from them:
  "OSC 133;C - the shell exec'd a command; the pane's foreground changed"
  (`terminal-pane/terminal-command-lifecycle.ts:2-29`).
- Shell-ready gating for startup commands: marker `\x1b]777;FABRICA-shell-ready`
  (`src/main/shell-ready-marker-scanner.ts:1`); POSIX shells get rcfile wrappers that hold startup
  commands until user startup files finish (`getShellReadyLaunchConfig` selection logic
  local-pty-provider.ts:779-817; scan-and-hold in proc.onData :1006-1016; timeout fallback
  STARTUP_COMMAND_READY_MAX_WAIT_MS :981-990). Relay mirrors this with
  `emitReadyMarker`/`waitForShellReady` (pty-handler.ts:1480-1482, :1554-1558) and forces
  `FABRICA_SHELL_READY_MARKER=0` into relay shells unless requested (:1503, :2036).
- OSC 7 cwd tracking: renderer parser extracts `file://host/path` payloads to track live cwd
  ("report current working directory", `terminal-pane/parse-osc7.ts:1-30`).
- Capability query replies: terminal color scheme queries answered main-side
  (`src/main/ipc/terminal-startup-color-query-replies.ts`; Mode 2031 reply scanning imported at
  ipc/pty.ts:28-32) and renderer-side (`terminal-capability-replies.ts`,
  `terminal-mode-2031-replies.ts`).
- Env-wrapper toolkit under `src/main/pty/`: oh-my-posh wrapper detection/enrichment
  (`omp-shell-wrapper.ts`), OMP sqlite overlay, prime-agent shell wrappers, shell-startup-env,
  terminal-color-env, appimage/build-mode env scrubbing, codex-home-wsl-env, wsl-fabrica-env,
  windows PATH registry refresh (`windows-environment-path.ts`),
  `node-pty-pts-name.ts` (slave-path read used for echo probes, cf.
  local-pty-provider.ts:934), posix process-group helpers (:posix-pty-process-groups.ts,
  posix-pty-foreground-group.ts).

## 7. IPC Channel Inventory (pty namespace)

Preload surface (`src/preload/index.ts:940-1260`, `pty` object) mapping to main handlers in
`src/main/ipc/pty.ts`:

| Channel | Kind | Main site |
|---|---|---|
| pty:spawn | invoke | :5786 |
| pty:write / pty:writeAccepted / pty:writeUnavailable | on/invoke/push | :7107-7118, :3992, :6959 |
| pty:resize / pty:reportGeometry / pty:claimViewport | on | :7157, :7198, :7129 |
| pty:signal / pty:clearBuffer | on | :7421, :7428 |
| pty:ackData / pty:requestDeliveryResync / pty:deliveryResyncResponse / pty:reportRendererDeliveryState | mixed | :7211, :3043, :7231, :7259 |
| pty:rendererDispatcherReady | on | :7303 |
| pty:setActiveRendererPty / setRendererPtyVisible / setHiddenRendererPty / setPtyDeliveryInterest / terminalViewAttributes | on | :7320-7419 |
| pty:data (push) | push | send site :3127 |
| pty:exit / pty:spawned | push | :3699, :3721 |
| pty:replay / pty:modelRestoreNeeded / pty:sideEffect | push | relay :1676; :3217; :5771 handle for snapshot |
| pty:kill / pty:listSessions / pty:hasPty / pty:getCwd / pty:getSize | invoke | :7436, :7484, :7564, :7625+ |
| pty:hasChildProcesses / getForegroundProcess / inspectProcess / confirmForegroundProcess | invoke | :7588-7624 |
| pty:getMainBufferSnapshot / sideEffectSnapshot / serializer readiness handles | invoke | :5708, :5771 |
| pty:serializeBuffer:request/response, clearBuffer:request | push pair | :4144, :5638 |

Re-registration safety: every handler is explicitly removed before re-register so window
recreation does not double-bind (ipc/pty.ts:2411-2437). Sender-scoped cancellation exists
(`src/main/ipc/sender-scoped-request-cancellation.ts`).

## 8. Remote/SSH Plane Specifics

- The desktop app registers per-connection SSH providers: `registerSshPtyProvider`
  (ipc/pty.ts:1987) and routes app ids like `<connId>:pty-N` via `parseAppSshPtyId` (:89 import,
  used :7442).
- Relay-side credit-based publication: `RelayPtySourcePublication` opens/rotates deliveries per
  client with counters and capacity callbacks (`src/relay/relay-pty-source-publication.ts:33-58`);
  legacy-owner vs subscriber delivery modes (:72-86); exit sealing via
  `sealAndPublishTrackedPtySourceExit` (:14-23 import).
- Credit ledger/scheduler files: `pty-source-credit-ledger.ts`, `pty-source-credit-scheduler.ts`,
  `ssh-pty-source-credit-adapter.ts`, `relay-pty-source-send-scheduler.ts` - output admission is
  credit-based end-to-end (provider -> main -> renderer mirrors relay -> desktop).
- Backpressure echo integration tests prove the fs/git streams and PTY share admission machinery
  (`fs-stream-pty-echo-backpressure.integration.test.ts`, `git-response-pty-echo-backpressure.integration.test.ts`).

## 9. Relevance to the CLI-Agent-Management Direction

1. **Agent sessions are first-class PTY citizens.** Spawns carry `launchAgent`, agent-kind schemas,
   session-resume metadata (`resumeProviderSession`, ipc/pty.ts:5800-5803), and an owner registry
   that can ADOPT a running agent CLI instead of spawning a new one (:4934-4996). Any "manage CLI
   agents" feature can reuse this claim/ensure/liveness layer rather than inventing process
   supervision.
2. **Structured lifecycle signals already exist.** OSC 133 command start/finish scanning feeds pane
   foreground-agent tracking and completion coordination
   (`terminal-command-lifecycle.ts:18-29`, `agent-completion-coordinator.ts`,
   `pane-foreground-agent-tracker.ts`) - i.e., the substrate for detecting "agent finished /
   asking question" without polling. Related inference helpers:
   `agent-interrupt-inference.ts`, `agent-question-answered-inference.ts`.
3. **Env-based identity injection** (`FABRICA_TERMINAL_HANDLE` pre-allocation, ipc/pty.ts:2485-2496;
   `FABRICA_PANE_KEY/TAB_ID/WORKTREE_ID` relay env, pty-handler.ts:1516-1521, revive :1996-2008)
   lets any spawned CLI self-identify to the orchestration layer at startup.
4. **Headless/mobile consumers of the same stream**: runtime tail buffers + renderer serializer
   registry mean an external manager could read agent output through
   `pty:getMainBufferSnapshot`/sideEffect snapshots without owning the xterm pane
   (ipc/pty.ts:4020-4023, 5708-5776).
5. **Robust kill semantics matter for agent restarts**: descendant sweep + Windows ancestry
   classification + incarnation ids give safe "restart this agent pane" primitives
   (local-pty-provider.ts:284-315; windows-pty-root-identity.ts:18-35; ipc/pty.ts:259).
6. **Detach/reattach continuity**: grace timers, serialize/revive, replay buffers, stable-pane
   adoption = agents keep running across UI/restarts, which is exactly the durability requirement
   for long-running CLI agent sessions (pty-handler.ts:2067-2076, 1962-2059; ipc/pty.ts:890-903).
7. **Gap worth noting**: agent status hooks are opt-in settings-gated
   (`isAgentStatusHooksEnabled`, ipc/pty.ts:2482) and hook servers exist
   (`src/main/agent-hooks/server.ts`); a management plane would consolidate these scattered
   signals into one authority.

## 10. Scan-Coverage Statement

Read substantially (non-test source): src/main/ipc/pty.ts (selected regions: imports/state maps
1-470, handler registration 2370-2569, ACK/accounting 2990-3300, exit path 3620-3739, spawn
prelude 4900-5030, snapshot/spawn handles 5708-5968, resize/kill/list/inspect 7107-7599);
src/main/providers/local-pty-provider.ts (284-480, 540-1050 + structure greps over full file);
src/relay/pty-handler.ts (1480-1730, 1962-2085 + dispatcher registration greps 778-800);
src/relay/relay-pty-source-publication.ts (1-100); src/renderer/.../terminal-pane/pty-dispatcher.ts
(full); pty-buffer-serializer.ts (full); parse-osc7.ts (head); terminal-command-lifecycle.ts
(head); layout-serialization.ts (exports grep); store slices tabs.ts (structure grep);
src/preload/index.ts (pty section grep 940-1260); terminal-scrollback-snapshots.ts (full);
terminal-history.ts (full); shell-ready-marker-scanner.ts (head); powershell-osc133-bootstrap.ts
(grep); windows-pty-root-identity.ts (head); shared/terminal-scrollback-limits.ts (full);
directory listings of src/main/pty, src/main/ipc, src/relay, providers, terminal-pane.

Grepped but not deep-read: ssh-pty-* family in main/ipc (~30 files), pty-source-credit-*
family in relay (~15 files), TerminalPane.tsx internals (3,134 lines - only serializer call sites),
terminals.ts store slice (4,291 lines), daemon provider paths (src/main/daemon/*), mobile runtime
streaming, xterm addons config in TerminalPane, WSL bridge details.

Skipped entirely: all *.test.* files except where cited as evidence; node_modules, out/, dist;
native/; mobile/ app code; docs/*.md referenced inline but not opened.

Line counts cited against working tree as of 2026-08-23 (git repo, unverified clean state assumed
read-only throughout; no file under Fabrica-app or _sources was modified).
