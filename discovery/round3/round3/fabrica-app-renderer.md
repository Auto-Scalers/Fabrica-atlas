> **PATH MIGRATION NOTICE (2026-08-21):** This project moved from the environment root into `Fabrica-atlas/`. All `_sources/...` paths in this document now resolve to `Fabrica-atlas/_sources/...`. `Fabrica-app/` remains at the environment root.
# Fabrica-app Renderer UI — Discovery Report (Round 3)

Scope: `Fabrica-app/src/renderer/src` — terminal-pane, pane-manager, sidebar/tab/status components, settings, native-chat, cmd-j, store, and cross-window sync. All findings from direct reads of actual source files. Read-only discovery; no source files were modified.

---

## 1. Terminal Pane (`components/terminal-pane/`, ~530 files)

### 1.1 xterm Integration

**Instance creation & addons.** The xterm `Terminal` is created inside `PaneManager` (`lib/pane-manager/pane-dom-creation.ts`), which attaches `FitAddon`, `SearchAddon`, `SerializeAddon`, `Unicode11Addon`, and `WebLinksAddon` per pane; the WebGL addon is managed separately in `pane-manager/pane-webgl-renderer.ts` (`new WebglAddon()`, per-pane `webglAttachFailedSinceRecovery` latching, DPR-mismatch repair via `terminal-canvas-dpr-repair.ts`). Each pane exposes these as `ManagedPane` fields (`pane.fitAddon`, `pane.searchAddon`, `pane.serializeAddon`) used throughout terminal-pane code (e.g., `TerminalPane.tsx:691` uses `pane.serializeAddon.serialize({ scrollback: 0 })` for chat screen reads).

**Renderer policy (WebGL vs DOM).** `terminal-renderer-policy.ts` exports `resolvePaneRendererPolicy({ rawTitle, ownerAgentType, userGpuMode, webglUnavailable, inContextLossContainment })` returning `{ gpuEnabled, reason, confidence }`. Precedence: user setting `off` → DOM-gated; context-loss containment → DOM (`reason: 'context-loss'`); WebGL unavailable → DOM (`'capability'`); explicit `on` → GPU regardless; `auto` applies a **Gemini compatibility fallback** that forces DOM when the pane title matches `isGeminiTerminalTitle()` unless an authoritative non-Gemini owner agent type vetoes it. Downstream, `PaneManager.setPaneGpuRendering()` consumes the gate; attach failures latch per pane and retry only at recovery boundaries.

**PTY→xterm data flow.** `pty-dispatcher.ts` installs **one global IPC listener per channel** (`ensurePtyDispatcher()`, `window.api.pty.onData`) to avoid N-listener MaxListeners warnings; data is routed by PTY id into maps exported from `pty-shutdown-data-suspension.ts`: `ptyDataHandlers`, `ptyReplayHandlers`, `ptyExitHandlers`, `ptyDataSidecars`, `ptyWriteUnavailableHandlers`. It also arms the delivery watchdog (`startTerminalDeliveryWatchdog`) that can reattach push listeners on a wedged stream. Per-pane handlers are registered by `createIpcPtyTransport` in `pty-transport.ts` (`registerPtyDataHandler`), whose `createPtyOutputProcessor` is the parse stage: it strips Fabrica's OSC 9999 agent-status stream *before* xterm (`processAgentStatusChunk`), scans OSC titles via `extractAllOscTitles`, detects BELs (`createBellDetector`), and defers title/status/bell side effects into a bounded queue (`MAX_PENDING_PTY_SIDE_EFFECTS = 512`, drained at <=64/tick via `drainPtySideEffects`) so background-timer throttling can't grow the queue unboundedly. Cursor-native titles are suppressed via `removeSuppressedCursorNativeTitles`; stale "working" titles are cleared after `STALE_TITLE_TIMEOUT = 3000ms`.

**Input path (xterm→PTY).** xterm `onData` goes through `createPtyInputWriteQueue` (`pty-input-write-queue.ts`) → `window.api.pty.write(id, data)`; large inputs are chunked by `iterateTerminalInputChunks` with ack'd writes via `window.api.pty.writeAccepted`. `sendInputImmediate` enqueues query replies so they jump ahead of queued paste.

**Connect/reattach.** `connectPanePty` in `pty-connection.ts` (~5k lines) builds the binding: spawn or reattach through `window.api.pty.spawn({ ..., sessionId })`, handling `isReattach`, `coldRestore`, `sessionExpired`, snapshot fields (`snapshot`, `snapshotPrefixAnsi`, `snapshotFrameAnsi`, `pendingEscapeTailAnsi`), eager-buffer replay with attention suppression, replay-guard routing (`replayIntoTerminalAsync` — replayed bytes block xterm auto-replies from leaking to stdin), hidden-output restore scheduling (`scheduleHiddenOutputRestore` with flood suppression windows like `HIDDEN_OUTPUT_RESTORE_FLOOD_SUPPRESS_MS = 2000`), synchronized-output (DEC 2026) foreground coalescing, mode-2031 theme queries, size reconcile/reassertion (`pty-size-reconcile.ts`, `pty-size-reassertion.ts`), and dead-session reconciliation (`terminal-dead-session-reconcile.ts`).

**Fit sync / font zoom / atlas recovery.** `use-terminal-container-fit-sync.ts` listens for `SYNC_FIT_PANES_EVENT` (sidebar toggles fit synchronously pre-paint) and debounces container ResizeObserver fits at 150ms (a Windows reflow of 10k scrollback lines can block 500ms–2s). `useTerminalFontZoom.ts` subscribes to `window.api.ui.onTerminalZoom`; zoom clamps 8–32px step 1, stores per-pane sizes in `paneFontSizesRef`, calls `overridePendingPaneMetricOptions` + `safeFit`, then dispatches `dispatchZoomLevelChanged('terminal', percent)`. `terminal-webgl-atlas-recovery.ts` schedules shared-glyph-atlas resets + full repaints at [next frame, 120ms, 500ms] after image paste and tab reveal.

**Overlay components.** `TerminalPaneOverlayLayer.tsx` maps each mounted terminal tab to a `TerminalOverlaySlot`, computing visibility/active from group assignments and consulting `useTerminalTabColdParking` for parked tabs. `TerminalPaneHeaderOverlay.tsx` renders floating per-pane title bars positioned from measured rects (`pane-title-overlay-rects.ts`) with split/close/chat-toggle buttons, IME-safe rename input, and workspace-file drag-drop targets routed to `handleInternalTerminalFileDrop`. Dialogs: `CloseTerminalDialog`, `RunningTerminalCloseDialog`, `PinnedTabCloseDialog`, `TerminalSessionStateSaveFailureDialog`, `TerminalSshReconnectOverlay`, `TerminalLinkActionPopover`, `TerminalContextMenu`, `TerminalAgentSessionForkDialog`, `SessionRestoredBanner`.

### 1.2 Agent Completion Coordination

Core detector: `agent-completion-coordinator.ts` — `createAgentCompletionCoordinator(options)` fuses **three evidence sources**, dispatched via `dispatchCompletion(source, title, meta)` where source ∈ `'hook' | 'title' | 'process-exit'`:

- **Hook status** (`observeHookStatus(payload)`): payloads are `AgentCompletionStatusSnapshot` (= `ParsedAgentStatusPayload & { stateStartedAt? }`). States: `'working'` starts a new turn (`currentTurn += 1`, cancels pending completions); `'waiting'/'blocked'` are attention states (dispatch `dispatchAttention`); `'done'` completes the turn — but Pi-compatible agents and any working-status-observed pane route done through a quiet window (`HOOK_DONE_QUIET_MS = 1500ms`, `scheduleHookDoneCompletion`) so milestone-fake dones get cancelled by resumed work.
- **Title transitions** (`observeTitle`): uses `detectAgentStatusFromTitle`; a working→idle transition dispatches a title completion, but generic titles are held provisional (`holdTitleCompletionPending`) until one process inspection proves agent ownership.
- **Process exit**: cadence polls call `options.inspectProcess` (queued globally by `agent-process-inspection-queue.ts`, max 4 concurrent inspections); `recognizeAgentProcess(...)` establishes identity, and two consecutive idle samples with `hasChildProcesses === false` confirm completion.

Poll cadence tiers: active 750ms, idle 2000ms, hidden 3000ms, no-evidence 15000ms, with error backoff and ±10% jitter. Deduplication uses completion tokens plus a module-scoped `lastCompletionIdentityByPaneKey` map keyed by hook identity `state:agentType:stateStartedAt`, surviving worktree-switch remounts. Codex-specific attention notifications are debounced `CODEX_ATTENTION_QUIET_MS = 1500ms` ("Approve for me" self-resolve guard).

Supporting pieces:
- `agent-completion-snapshot-staleness.ts` — drops delayed quiet-window completions when the store already holds a newer turn (`isSupersededAgentCompletionSnapshot`).
- `agent-hook-terminal-lifecycle.ts` — per-paneKey handler registry so global IPC hook events reach mounted panes' effects.
- `agent-task-complete-policy.ts` — shared predicates: notification grace `AGENT_TASK_COMPLETE_NOTIFICATION_GRACE_MS = 250ms` (BEL waits so richer completion wins), max wait 1500ms, detail max age 10s, gated off settings `notifications.agentTaskComplete` / `experimentalTerminalAttention`.
- `pane-foreground-agent-tracker.ts` — publishes process-table identity at OSC 133 command boundaries; retries at [1200ms, 6000ms].
- `renderer-owned-agent-status-registry.ts` — arbitration between renderer-derived OSC status and mirrored host snapshots for remote panes (`registerRendererOwnedAgentStatusPane`, `isClientAuthoritativeAgentStatusPane`), preventing flap between "working" and "done".
- Inference helpers: `agent-interrupt-inference.ts` (classifies Ctrl+C/plain-Escape against fresh agent status; opencode/copilot need double-Escape, droid ignores Ctrl+C) and `agent-question-answered-inference.ts` (submit keystroke into a Claude AskUserQuestion waiting pane infers question-answered immediately).

### 1.3 Detached-Pane Restart

**(a) Codex account-switch restarts executed while unmounted.** `codex-detached-pane-restart.ts` — historically restarts only ran inside mounted `TerminalPane`s, stranding unmounted panes behind blocked keyboards. `sweepUnclaimedCodexPaneRestarts()` iterates `pendingCodexPaneRestartIds`; skips foreign-machine (remote) PTYs and any PTY with a live primary handler in `ptyDataHandlers` (a mounted owner will claim it). It locates the owning pane (`locateCodexPane` scanning `tabsByWorktree` + `ptyIdsByTabId` + layout `ptyIdsByLeafId`), claims via `consumePendingCodexPaneRestart`, spawns a replacement PTY with `CODEX_ACCOUNT_RESTART_STARTUP` and pane-identity env (`FABRICA_PANE_KEY`, `FABRICA_TAB_ID`, …) as `initiallyHidden: true`, rebinds the layout leaf (`replaceTerminalLayoutPanePtyId`), migrates/clears `codexRestartNoticeByPtyId`, kills the replaced PTY, disposes parked watchers first, and checks staleness (`isLocatedCodexPaneCurrent`) before killing. `codex-detached-pane-restart-scheduler.ts` installs a one-time Zustand subscriber (`installCodexDetachedPaneRestartExecutor`) watching additions to `pendingCodexPaneRestartIds` and microtask-queuing sweeps.

**(b) Pane→tab detach (drag-out).** `terminal-layout-leaf-detach.ts` — `detachTerminalLayoutLeaf(snapshot, leafId)` removes a leaf from the layout tree producing `{ sourceLayout, detachedLayout, ptyId }`. `terminal-pane-tab-detach.ts` turns this into a UI flow: resolves tab-strip drop targets (`resolveTerminalTabStripDropTarget`, insertion markers from `[data-tab-id]` element rects); `detachTerminalPaneToTab` creates a new tab via store actions (`createTab`, `setActiveTab`, `syncPaneDetachPtyOwnership`) so the PTY survives without respawn.

### 1.4 Shutdown Buffer Captures

- `shutdown-buffer-captures.ts` — zero-import leaf registry `shutdownBufferCaptures: Map<tabId, capture callback>` registered by each mounted `TerminalPane` (separate module breaks the slice→TerminalPane→store import cycle). `captureTerminalShutdownBuffersBestEffort(tabIds, { includeLocalBuffers })` returns coverage `{requested, captured}`; consumed by App.tsx's beforeunload handler and by sleep so SSH scrollback is captured before relay SIGKILL.
- `terminal-shutdown-layout-capture.ts` — `captureTerminalShutdownLayout(...)`: flushes throttled output (`flushTerminalOutput`), serializes each pane with `serializeWithAbsoluteCursor` (SerializeAddon's relative cursor restore lands one column short after wrap-pending rows), caps buffers at `TERMINAL_SCROLLBACK_SESSION_BUFFER_BYTE_LIMIT`, and finds the largest fitting tail via <=4 secant-interpolation probes (`serializeWithinSessionScrollbackByteLimit`).
- `force-park-buffer-capture.ts` — serializes remote/SSH worktree panes before eviction unmounts them; partial coverage leaves the episode unmarked for retry.
- `pty-shutdown-output-queue.ts` — `PtyShutdownOutputQueue`: chunked (64-event) FIFO of `{kind:'data'|'replay'}` events with byte accounting, evicting oldest beyond the session buffer limit.
- `pty-shutdown-data-suspension.ts` — owns dispatcher handler maps plus `bufferPtyShutdownData`/`bufferPtyShutdownReplayData`, per-PTY teardown handlers, and shutdown lifecycle hooks `{ pause, rollback, commit }`.
- `pty-shutdown-exit-deferral.ts` — defers PTY exits during sleep: settlement types `'committed'|'rolled-back'`, 30s committed-exit grace guards, host sleep dispositions rolling back suspended data if host never confirms within `HOST_SLEEP_DISPOSITION_GRACE_MS`.
- `pty-shutdown-host-generation.ts` — tracks sleep phase/generation per PTY (`shouldApplyHostSleepPhase`) with 60s grace so delayed frames can't resurrect settled sleeps.
- Restore side: captured strings land in layout `buffersByLeafId` / `scrollbackRefsByLeafId` (hydrated via `window.api.session.readTerminalScrollback({ ref })` in `hydrateTerminalScrollbackRefs`) and replay into fresh xterms via `restoreScrollbackBuffers` (layout-serialization.ts). `pty-buffer-serializer.ts` maintains a global ptyId→serialize-function registry so main can request exact screen state for mobile streaming.

### 1.5 Theme Publishing

- `composeActiveTerminalTheme(baseTheme, settings)` in `terminal-appearance.ts`: overlays scrollbar defaults, merges Ghostty-style `terminalColorOverrides`, converts hex background/cursor to rgba honoring `terminalBackgroundOpacity` / `terminalCursorOpacity`.
- `applyTerminalAppearance(manager, settings, systemPrefersDark, ...)`: resolves effective appearance via `resolveEffectiveTerminalAppearance(settings, systemPrefersDark)` from `@/lib/terminal-theme`, publishes composed attributes to main's hidden-PTY OSC 10/11 query responder via `publishTerminalViewAttributes` (deduped; also at app start so hidden-at-launch PTYs can query before any pane mounts). Writes `pane.terminal.options.theme` **value-gated** by `composedTerminalThemesEqual` so TUI OSC 4/10/11 mutations aren't discarded; sets `minimumContrastRatio`, `allowTransparency`, cursor style/blink, font metrics via `applyOrDeferPaneMetricOptions`, ligatures via `manager.setPaneLigaturesEnabled`, pushes mode-2031 dark/light flips (`maybePushMode2031Flip`), then refits/resizes transports. Split/divider styling goes through `manager.setPaneStyleOptions`.
- `use-system-prefers-dark.ts` — a shared `(prefers-color-scheme: dark)` media-query subscription (one listener for hundreds of panes) via `useSyncExternalStore`; changes re-run `applyAppearance` live.

### 1.6 OSC 52 Clipboard

OSC 52 is the "Manipulate Selection Data" escape letting TUIs (Zellij, tmux, Neovim, fzf — especially over SSH) write the host clipboard; xterm.js doesn't implement it, so the app registers a handler. In `osc52-clipboard.ts`:
- `parseOsc52(data)` splits `Pc;Pd`, normalizes empty Pc to `'c'`, treats payload `'?'` as a **query that is deliberately ignored** (clipboard-exfiltration guard), caps base64 at 128×1024 chars, rejects empty decoded payloads, tolerates whitespace-wrapped base64.
- `resolveOsc52ClipboardGate({settingEnabled, replaying})` allows writes only when `settings.terminalAllowOsc52Clipboard === true` (default on) and not during PTY replay; blocked-write toasts surface only post-hydration.
- `createOsc52OscHandler` coalesces floods to ~one clipboard write per parse yield via microtask, writing via `window.api.ui.writeClipboardText`.
- Wiring lives in `use-terminal-pane-lifecycle.ts` `onPaneCreated`: `pane.terminal.parser.registerOscHandler(52, guardParserHandler('osc-52-clipboard', ...))` so throwing handlers can't kill xterm parsing.
- `osc52-clipboard-toast.ts` — latched-once sonner toasts (blocked/failed) with an "Open Setting" action deep-linking via `openSettingsTarget({ sectionId })`.
- `osc52-clipboard-setting-anchor.ts` — stable settings-section id `'terminal-osc52-clipboard'`.
- `osc52-clipboard-default-on-notice.ts` — one-time migration notice telling users TUI clipboard writes flipped default-on, cleared on toast close/dismiss, 15s duration.

### 1.7 Other Major Clusters (map)

- **Parking/cold-park system**: `use-terminal-tab-cold-parking.ts` (per-tab hidden-view parking policy, hiddenSince + recheck timers, verdict loop), `terminal-hidden-view-parking.ts`, watcher infrastructure in `terminal-parked-watcher-registry.ts`, `terminal-parked-tab-watchers.ts`, `parked-terminal-byte-watcher.ts`, `parked-terminal-command-status.ts`, `parked-terminal-mode2031-responder.ts`, `force-park-buffer-capture.ts`.
- **Paste coordinator pipeline**: `terminal-paste-coordinator.ts` (planning with yields, `planTerminalPasteWithYield`/`executeTerminalPastePlan`), limits/chunking/multiline policy, bracketed paste writer (`terminal-bracketed-paste.ts`, `terminal-pty-paste-writer.ts`), runtime/SSH platform resolution, diagnostics/errors/target-state files.
- **IME handling**: composition tracker + Linux candidate state + macOS native-text forwarder (`terminal-ime-composition-tracker.ts`, `terminal-ime-linux-candidate-state.ts`, `terminal-ime-native-text-forwarder.ts`, etc.), installed inside `attachCustomKeyEventHandler`; extensive adversarial tests (Korean/Hangul, JIS yen, kitty CSI-u dedup).
- **Keyboard/xterm-bypass**: `xterm-bypass-policy.ts` (which keys bypass xterm's kitty encoder), `keyboard-handlers.ts` (ordered shortcut precedence: shell input, pane commands, search, split), `terminal-shortcut-policy.ts`, `terminal-ctrl-enter.ts`, interrupt handling injecting ETX and resetting kitty flags.
- **Link handling/activation**: file-path link provider (`terminal-link-handlers.ts`), OSC 8 hyperlink routing (`terminal-osc-link-routing.ts`), wrapped/hard-wrapped URL extraction, click gestures/popover (`terminal-link-pointer-gesture.ts`, `TerminalLinkActionPopover.tsx`), open-hints and in-app-vs-system routing.
- **Drop handling**: `terminal-drop-handler.ts` entry point, internal vs native paths, path/image/worktree writers, upload reporting and failure messaging.
- **Remote runtime recovery**: `remote-runtime-pty-transport.ts` (RPC/binary-stream transport), recovery state machine (`remote-runtime-pty-recovery-state.ts`), UI surfaces `TerminalRemoteRuntimeReconnectBanner.tsx` + `terminal-remote-runtime-recovery-ui-state.ts`, viewport claims (`remote-desktop-viewport-claim.ts`), layout push.
- **Session restore banners**: `SessionRestoredBanner.tsx` ("--- session restored ---" / "--- previous session unavailable, started fresh ---"), pane-state bookkeeping, dismissal hook, portal rendering.
- **Recovery/diagnostics**: `terminal-pane-recovery.ts`, `terminal-delivery-watchdog.ts`, `terminal-freeze-report.ts`/breadcrumbs, `stale-document-visibility.ts`, render-desync sentinel/frame, error accumulation.
- **Codex-specific**: restart chip/notices (`blocksCodexPaneInput`), `codex-auto-approval-notification-suppression.ts`, `codex-backfill-error-detector.ts`, stale-account sweep.

---

## 2. Pane Manager (`lib/pane-manager/`, ~137 files)

### 2.1 File Inventory (grouped, non-test)

- **Core manager & types**: `pane-manager.ts` (PaneManager class), `pane-manager-types.ts`, `pane-manager-registry.ts`, `pane-public-view.ts` (`toPublicPane`), `pane-key-resolution.ts`, `pane-identity-registry.ts`, `mint-stable-pane-id.ts`
- **Lifecycle/DOM**: `pane-lifecycle.ts`, `pane-dom-creation.ts`, `pane-dom-focus-class-sync.ts`, `pane-pointer-focus.ts`
- **Split tree / drag-reorder**: `pane-tree-ops.ts`, `pane-split-close.ts`, `pane-subtree-split.ts`, `pane-drag-reorder.ts`, `pane-drag-pointer.ts`, `pane-split-scroll.ts`
- **Dividers**: `pane-divider.ts`, `pane-divider-drag.ts`
- **Fit system**: `pane-fit.ts`, `pane-fit-resize-observer.ts`, `pane-fit-measurability.ts`, `pane-fit-client-size.ts`, `pane-fit-webgl-attach-signal.ts`, fit-continuation family, `pane-reveal-fit.ts`, `pane-pty-resize-hold.ts`, `pane-metric-options-deferral.ts`, `pane-display-visibility.ts`, `pane-rendering-control.ts`
- **I/O & scrolling**: `pane-terminal-output-scheduler.ts` (54KB scheduler) with credit-based delivery (`terminal-delivery-credit.ts`, `pane-terminal-output-ack-credit.ts`), pipeline health (`terminal-write-pipeline-health.ts`, `xterm-write-callback-guard.ts`), scroll-intent family, `terminal-reflow-scroll-anchor.ts`, `terminal-live-scrollback-restore.ts`, `terminal-scroll-buffer-snapshot.ts`, `terminal-structural-replay-coordinator.ts`
- **Input/interaction**: `pane-terminal-mouse-wheel.ts`, TUI wheel reports, `terminal-keyboard-protocol.ts`, Windows Ctrl+Alt chord classification, IME anchors, `windows-pty-compatibility.ts`
- **Text shaping/rendering**: `terminal-arabic-shaping-joiner.ts`, `terminal-complex-script.ts`, `terminal-canvas-dpr-repair.ts`, GPU acceleration (`pane-terminal-gpu-acceleration.ts`), `pane-terminal-options.ts`
- **WebGL**: `pane-webgl-renderer.ts`, `pane-webgl-reattach.ts`, `terminal-webgl-auto-policy.ts`, ligatures addon
- **Mobile driver state**: `mobile-driver-state.ts`, `browser-mobile-driver-state.ts`, `mobile-fit-overrides.ts`

### 2.2 PaneManager Class & Pane Lifecycle

`PaneManager` lives in `pane-manager.ts:66`. Private state: `root: HTMLElement`, `panes: Map<number, ManagedPaneInternal>`, `activePaneId`, `nextPaneId`, `options`, `styleOptions: PaneStyleOptions`, `identities = new PaneIdentityRegistry()`, and `dragState`. Constructor calls `registerLivePaneManager(this)`.

**Creation path**: `createInitialPane()` and `splitPane()` funnel through `createPaneInternal(leafIdHint?)` (`pane-manager.ts:424`), which increments `nextPaneId`, claims a durable leaf UUID via `PaneIdentityRegistry.claimLeafId()`, then delegates to `createPaneDOM(...)` (`pane-dom-creation.ts:22`), building: a `div.pane` with `data-pane-id`/`data-leafId`, inner `div.xterm-container`, hidden link tooltip, `div.pane-drag-handle` wired via `attachPaneDrag`, a `Terminal` with options from `buildDefaultTerminalOptions()` merged over `options.terminalOptions(id)`, and addons instantiated up front (Fit/Search/Serialize/Unicode11/WebLinks). `publishPaneCreated` marks identity published and invokes `onPaneCreated(pane, spawnHints)` where PTY wiring happens (`PaneSpawnHints` carries one-shot cwd/ptyId).

**ManagedPane public fields** (`pane-manager-types.ts:96`): `id`, `leafId: TerminalLeafId` (+ legacy alias `stablePaneId`), `terminal: Terminal`, `container` (.pane), `linkTooltip`, `fitAddon`, `searchAddon`, `serializeAddon`. Internal adds webgl/ligatures addons, GPU diagnostic flags, `fitResizeObserver`, listener cleanups, split-scroll restore state.

**Open**: `openTerminal(pane)` (`pane-lifecycle.ts:30`) calls `terminal.open(xtermContainer)`, loads all addons, attaches wheel multiplier, scroll-intent tracking, linkifier hover resets, FABRICA unicode provider, Arabic joiner, IME anchor, focus-class sync, conditional WebGL, and the fit ResizeObserver, then schedules initial fit on rAF.

**Dispose**: `disposePane(pane, panes)` (`pane-lifecycle.ts:172`) cancels rafs, disconnects ResizeObserver, removes listeners, runs stored cleanups, disposes addons and terminal. Manager-level `destroy()` unregisters from live registry, cancels drags/reparent frames, disposes every pane, clears identities, wipes dividers/root innerHTML. Close/split paths delegate to `pane-split-close.ts`. Registry (`pane-manager-registry.ts`) is a module-global Set of live managers enabling cross-manager operations (shared WebGL atlas resets, pane census, diagnostics, bulk refits) because xterm keeps module-global shared atlas state.

**GPU/WebGL management**: `shouldUseTerminalWebgl(pane)` honors per-pane mode plus a session-global `suggestedRendererType='dom'` latch after any failed attach in auto mode; Linux gate `getTerminalWebglAutoDecision()` (cached reasons: linux-wayland, linux-webgl2-unavailable, software-renderer, etc.). `attachWebgl()` enforces single-addon invariant, registers `addon.onContextLoss()`, dispose reaches into `_renderer._gl` to call `WEBGL_lose_context.loseContext()` and zero the canvas so Chromium's context budget isn't exhausted. Suspend/resume rendering gates `webglAttachmentDeferred` per pane. Ligatures opt-in via `setPaneLigaturesEnabled` wraps `@xterm/addon-ligatures` with an LRU `LigatureRangeCache` (100k char / 2048-entry budgets); toggling forces a WebGL dispose/re-attach since ligated glyphs bake into the atlas.

**Style options & theme entry points**: `setPaneStyleOptions(opts)` (`PaneStyleOptions`: splitBackground, paneBackground, inactivePaneOpacity, activePaneOpacity, opacityTransitionMs, dividerThicknessPx, focusFollowsMouse, paddingX/Y) applies pane opacity, divider styles, and root background immediately. Runtime metric changes go through deferred metric options (`flushDeferredPaneMetricOptions` before each fit).

### 2.3 Split-Grid Model

There is **no abstract layout-tree type**. The tree *is the DOM*: panes are `div.pane`, interior nodes are `div.pane-split.is-vertical|is-horizontal` wrappers, dividers are `div.pane-divider` siblings between children. Direction comes from CSS classes; ratio state lives in `element.style.flex` (e.g., `"0.7 1 0%"`).

Key functions in `pane-tree-ops.ts`: `wrapInSplit(existing, new, isVertical, divider, {ratio})` creates a flex wrapper inheriting the existing element's flex slot and applies `applyPaneFlexStyle`; `insertPaneNextTo(source, target, zone)` driven by DropZone ('top'|'bottom'|'left'|'right'); `detachPaneFromTree(pane)` removes pane + sibling dividers then `promoteSibling` replaces the parent split; `equalizePaneSplitSizes(root)` recursive equalization with pane-count weighting; `refitPanesUnder(el, panes)` refits descendants. Splitting coordinates WebGL (dispose before reparenting, reattach in rAF via `requestPaneReparentFrame`). Root structure: `root > .pane-split* > (.pane | .pane-split | .pane-divider)+`.

### 2.4 Dividers

`createDivider` (`pane-divider.ts:16`) builds `div.pane-divider.is-vertical|is-horizontal` sized to visible thickness (`dividerThicknessPx ?? 4`) + 3px invisible padding per side; visual line is a CSS ::after using `--divider-thickness`/`--divider-extension` custom properties.

Drag handling (`pane-divider-drag.ts`, `attachDividerDrag`): pointerdown captures prev/next siblings, measures rects, sets pointer capture, adds capture-phase window listeners, snapshots initial flex strings, and starts `holdPtyResizesForPaneSubtrees` so only the final size reaches the PTY on drop. pointermove computes delta, clamps to `[effectiveMinPaneSize, totalSize − effectiveMinPaneSize]` with `MIN_PANE_SIZE = 50`, derives next-side size, writes via `createDividerFlexFrameScheduler` — one rAF-coalesced flex write per frame. Finish flushes/cancels the scheduler (cancel restores initial flex), refits both sides, fires `onLayoutChanged`. Double-click resets siblings to equal flex. WSLg quirk handled: foreign primary non-touch pointer can take over a drag.

### 2.5 Focus-Follows-Mouse

`focusFollowsMouse?: boolean` declared on `PaneStyleOptions` (`pane-manager-types.ts:91`). Pure decision logic in `focus-follows-mouse.ts`: `shouldFollowMouseFocus({...})` returns true only if enabled, manager alive, hovered ≠ active, `event.buttons === 0` (no selection/drag in progress), and `document.hasFocus()`. Implementation: `mouseenter` listener per pane container → `PaneManager.handlePaneMouseEnter` (`pane-manager.ts:460`) → `setActivePane(paneId, { focus: true })` updating opacity styling and calling `terminal.focus()`. Regular focus ownership: pointerdown routes through `shouldFocusTerminalFromPanePointerDown` (suppresses focus when clicking the drag handle).

### 2.6 Fit Sync

Per-pane: `attachPaneFitResizeObserver` (`pane-fit-resize-observer.ts:141`) observes `pane.xtermContainer`; callback is `requestStablePaneFit` — a **stability loop** polling `fitAddon.proposeDimensions()` across rAF frames until proposed grid matches current grid twice identically, gives up after `MAX_STABILITY_FRAMES = 8`, then runs `safeFitAndThen`. This avoids SIGWINCH vibration from one-column scrollbar wobble and keeps fit off the divider-drag hot path. Bulk paths: `fitAllPanes()`, `fitAllRevealedPanes()` (avoids transient cell-metric grids), registry-level `refitAndRefreshAllTerminalPanes()` after bulk desktop restore. `safeFit` honors mobile/remote fit overrides (`getFitOverrideForPty`), measurability checks, scroll-state capture/restore, continuation registries for hidden panes. `setPaneFitWebglAttachHook` lets WebGL reattach recovery run on successful fit without circular imports.

### 2.7 Mobile Driver State

Three module-global stores:

- **`mobile-driver-state.ts`** — presence lock keyed by ptyId holding `DriverState = { kind: 'idle' } | { kind: 'desktop' } | { kind: 'mobile'; clientId }`. API: `setDriverForPty`, `replaceDriverPtyId`, `getDriverForPty`, `isPtyLocked(ptyId)`, `getAllDrivers`, `onDriverChange`, `hydrateDrivers`; updated via IPC (`onTerminalDriverChanged`). While locked, consumers drop `xterm.onData` input and `onResize` and show the lock banner. `components/terminal-pane/MobileDriverOverlay.tsx` consumes this plus collapse state (`mobile-driver-overlay-collapse.ts`, keyed by driverClientId) and visibility gating (`shouldShowMobileDriverOverlay(driverKind, fitMode)`); `pty-connection.ts` gates writes/resizes on `isPtyLocked`.
- **`browser-mobile-driver-state.ts`** — identical pattern for browser pages with React bindings `useBrowserMobileDriverForAny` / `useBrowserMobileDrivenPageIds` via `useSyncExternalStore`.
- **`mobile-fit-overrides.ts`** — fit parking so a phone/remote-desktop owner's authoritative grid wins: `overridesByPtyId: Map<string, FitOverride>` where `FitOverride = { mode: 'mobile-fit' | 'remote-desktop-fit', cols, rows }`, bound via `bindPanePtyId`, with hydration and change notifications. `safeFit` reads these so passive panes never start a resize war.

---

## 3. Sidebar, Right Sidebar, Tab Bar, Tab Groups, Status Bar

State flows through a single Zustand `useAppStore` (`@/store`).

### 3.1 sidebar/ (~558 files)

**Composition** — `index.tsx` renders SidebarHeader → SidebarNav → SetupScriptPromptCard → WorktreeList → SidebarToolbar, plus WorkspaceKanbanDrawer and lazy dialogs (WorktreeMetaDialog, RemoveFolderDialog, WorktreeVisibilityDialog, FabricaYamlTrustDialog, ForgetSshWorkspaceDialog, AgentDashboardSidebarHost). Width resizable via straddling handle class WORKTREE_SIDEBAR_RESIZE_HANDLE_CLASS_NAME (min 220px, max 500px).

**Nav rail** — `SidebarNav.tsx` holds global nav buttons gated by settings flags: Artifacts (`showArtifactsButton`), Automations (`shouldShowAutomationsButton`), Activity (`experimentalActivity`), Mobile (`showMobileButton`), Agent Dashboard (`experimentalAgentDashboardPopout`), plus SidebarTaskNavButton and SetupGuideSidebarEntry.

**Tree model** — hierarchy is **host sections → project/repo groups → worktree rows**:
- `host-section-rows.ts`: HostHeaderRow wraps row lists per execution host; ordering in `host-section-order.ts`.
- `worktree-list-groups.ts`: Row union includes GroupHeaderRow, WorktreeRow, ImportedWorktreesCardRow, NewExternalWorktreesInboxRow, PendingCreationRow, FolderWorkspaceRow. Grouping modes: WorktreeGroupBy = 'none' | 'workspace-status' | 'repo' | 'pr-status', with PR groups done/in-review/in-progress/closed, special groups PINNED_GROUP_KEY='pinned', ALL_GROUP_KEY='all', lineage children under 'lineage:' prefix. buildRows() assembles everything; WorktreeList renders virtualized rows with indentation and manual-order ranks.

**Filters** — central pipeline in `visible-worktrees.ts`:
- computeVisibleWorktreeIds filters: archived; other-device workspaces; default branch (`isDefaultBranchWorkspace` = isMainWorktree && branch !== ''); automation-generated (`automationProvenance?.kind === 'created-by-automation'`); CLI-created (`cliProvenance?.kind === 'created-by-cli'`); detached HEAD; host scope (visibleWorkspaceHostIds/workspaceHostScope); repo filter; and the **sleeping sweep**: when showSleepingWorkspaces === false (default true) rows are dropped unless exempt via isSleepingSweepExemptWorkspace (main worktrees when alwaysShowDefaultBranchWorkspace !== false) or active per isInactiveWorkspace(...). Lineage ancestors re-injected so children never orphan. Published order cached module-level so Cmd+1–9 matches rendered order.
- sidebarHasActiveFilters + computeClearFilterActions implement the pure "Clear Filters" logic.
- UI: `SidebarFilter.tsx` dropdown with badge count and FilterToggleRows ("Hide sleeping", "Except default branch", "Hide default branch", "Hide automation-created", "Hide CLI-created", "Hide detached HEAD") plus a searchable multi-select Projects section. Duplicate surfaces: SidebarRepositoryFilterSection, SidebarWorkspaceFilterSection.
- Sorting: smart-sort.ts / smart-attention.ts; kanban board in WorkspaceKanban* family (lanes by workspace status, pointer-drag, shift-wheel scroll).

**Note:** the file explorer/search/source-control/checks tabs do NOT live in the left sidebar — they are right-sidebar activity-bar tabs (§3.2).

### 3.2 right-sidebar/ (~462 files)

**Routing model** — `store/right-sidebar-route.ts` defines RightSidebarRoute = { rightSidebarTab, rightSidebarExplorerView: 'files' | 'search' }. Valid tabs: explorer | vault | workspaces | pr-checks | source-control | checks | ports plus plugin keys validated by isPluginPanelTabKey. Legacy persisted 'search' migrates to {tab:'explorer', view:'search'}; uninstalled-plugin tabs reset to Explorer.

**Shell** — index.tsx builds ActivityBarItem[] with visibility flags (gitOnly/folderOnly/sshOnly/statusIndicator); filtering via getVisibleRightSidebarActivityItems(items, {isFolder, isFolderWorkspace, isSshRepo}). Effective tab resolution resolveRightSidebarEffectiveTab(...) — hidden tabs render a fallback without overwriting the stored route; folder workspaces keep a session-local remembered-tab map. Layout modes top/side via ActivityBarButton / TopActivityOverflowMenu; width clamped by right-sidebar-width helpers.

**Panel mapping** — `right-sidebar-panel-content.tsx` lazily mounts per effective tab:
- explorer → FileExplorer (internal Files/Search switch). Tree state in useFileExplorerTree, watch via useFileExplorerWatch/scheduler, selection/keyboard/dnd hooks, undo/redo, virtualization via @tanstack/react-virtual. Search mode uses useFileSearchPanel + SearchQueryRow/SearchFilters/SearchResultsPane.
- vault → AiVaultPanel (agent session history; sessions list/detail/subagents, resume/continuation actions).
- workspaces → FolderWorkspaceWorktreesPanel (attached worktrees for folder-mode projects).
- pr-checks → FolderWorkspacePrChecksPanel.
- source-control → SourceControl: pulls gitStatusByWorktree[activeWorktreeId] and gitStatusHeadByWorktree from the store; refresh orchestration git-status-refresh*/useGitStatusPolling; commit area with drafts and AI commit-message generation (store/slices/commit-message-generation); hosted-review caches (GitHub/GitLab); virtual file list; discard dialogs; submodule expansion; diff comments selector.
- checks → ChecksPanel: PR checks projection (parent-pr-checks-projection-selector), polling, terminal-worktree binding, hosted-review click routing.
- ports → PortsPanel (SSH port forwarding).
- plugin keys → PluginPanel (sandboxed iframe keyed by tabKey; bridge host, watchdog, theme revision).

Also: GitHistoryPanel (graph SVG, commit files/menu), create-PR dialog fields, hosted-review actions, AI source-control recovery hooks.

### 3.3 tab-bar/ (~80 files)

TabBar.tsx composes useTabBarRuntimeModel (groupId, unified tabs, Windows shell menu, agent launch options), useTabBarCreateMenuController ("+" menu: terminal/browser/simulator/markdown/shell variants), and useTabBarItemProjection, then delegates rendering to renderTabBarSurface (tab-bar-surface.tsx).

**Item model** — tab-bar-item-model.ts: discriminated TabBarItem union (terminal/browser/editor+simulator) each carrying isPinned. Pinned behavior in SortableTab.tsx: pin indicator rendered, close button hidden while pinned, rename suppressed. Pin toggling mirrors to host for remote-server tabs.

**Drag & drop** — dnd-kit. tab-bar-surface.tsx wraps items in SortableContext; each SortableTab calls useSortable. Cross-pane semantics live in tab-group: reorder within a strip vs split-out resolved by useTabDragSplit inside a single window-level DndContext. reconcile-order.ts merges desired order with existing ids after drops; insertion preview math in tab-insertion.ts.

**Strip mechanics** — overflow navigation with edge-fade scroll buttons, pointer gesture activation (distinguishes click vs drag start), ResizeObserver-driven layout, tab-width-rules.ts.

**Other** — Create-entry classifier chain resolves typed input into URL/path/file launches; context menu (custom title/color, pin, close others/right/left, duplicate browser tab); recent-tab switching (RecentTabSwitcher, Ctrl-Tab style); quick commands button; Windows shell launch options; agent types per tab; move-to-pane-column helper.

### 3.4 tab-group/ (27 files)

**Group model** — groups are per-worktree: groupsByWorktree[worktreeId]: TabGroup[] with group.activeTabId and canonical left-to-right group.tabOrder; all tabs are unified records unifiedTabsByWorktree[worktreeId] with contentType ∈ terminal | browser | simulator | editor | diff | conflict-review | check-details pointing at an entityId. useTabGroupWorkspaceModel.ts (669 lines) builds per-group models merging shell identity/colors/generated titles from tabsByWorktree via resolveUnifiedTabLabel; exposes commands (activate/close/closeOthers/closeToRight/closeToLeft/createEmptySplitGroup/new*/duplicateBrowserTab/togglePaneExpand/setTabColor/setTabCustomTitle/makePreviewFilePermanent/pinFile).

**Close guards** — pinned tabs refuse close; terminals route through closeTerminalTab behind pinned/running-process confirmation dialogs (empty-check runs on actual close, never cancel); dirty editors go through requestEditorFileClose save/discard queue; bulk closes skip running-process prompts but still host-close remote-owned browsers; closing last tab deselects the worktree.

**UI** — TabGroupPanel.tsx renders the TabBar plus a lazy EditorPanel; registers a useDroppable pane-body target (getTabPaneBodyDroppableId(groupId)); assigns a CSS anchor name per group (tabGroupBodyAnchorName) so moving tabs between groups re-targets anchors instead of remounting xterm/webviews.

**Split layout** — TabGroupSplitLayout.tsx: recursive binary TabGroupLayoutNode tree (leaf | split with direction/ratio, nodePath like first.second); ResizeHandle does direct DOM flex writes during drag (avoids 60–120 store updates/s) committing setTabGroupSplitRatio(worktreeId, nodePath, ratio) clamped 0.15–0.85. One DndContext driven entirely by useTabDragSplit; DragOverlay renders ghost previews while the source tab stays anchored.

**DnD semantics** — custom pointer sensor (tab-drag-pointer-sensor.ts); center zone (inner 10%/10% band) = insert/reorder into that strip; outer thirds resolve to left/right or up/down = VS Code-style pane splits via createEmptySplitGroup; resolvePaneColumnEdgeZone adds a 20%-wide edge band on split panels. AiVaultSessionDropLayer allows dropping vault sessions as new terminal tabs.

### 3.5 status-bar/ (86 files)

StatusBar.tsx (2546 lines, memoized): 24px bar (h-6 border-t) with left cluster, spacer, right cluster, plus cursor-anchored hidden-trigger visibility context menu.

**Left cluster — usage roster pill:** consolidated trigger showing one ProviderSegment per visible provider (claude/codex/gemini/antigravity/opencode-go/kimi/minimax/grok), opening UsageRosterPanel popover with per-row drill-in: Claude/Codex get account switcher menus across host/WSL runtime groups (buildClaudeStatusSwitchGroups/buildCodexStatusSwitchGroups, AccountRuntimeToggle radio, Codex restart-credits flow, stale-session restart prompt), inline usage bars/sign-in CTAs; other providers get generic ProviderDetailsMenu. Segment states: idle/fetching pulse, unavailable "--", error + stale data, verbose windows (session/weekly/monthly buckets) with MiniBar; percentage display normalized via usagePercentageDisplay setting; compact <900px, icon-only <500px (letter badges C/G/O/K/A/M/R/X). Empty usage shows StatusBarUsageEmptyCta.

**Right cluster segments (order):** CaffeinateStatusSegment → RemoteServerUpdateStatusSegment → SkillUpdateStatusSegment → UpdateStatusSegment → Suspense-wrapped lazy PetStatusSegment (gated petEnabled), ResourceUsageStatusSegment (CPU/memory/space via resource-session inventory, kill confirmations), PortsStatusSegment (workspace-scoped forwarded ports popover), SshStatusSegment (remote host connection status rows SshTargetStatusRow/RuntimeHostStatusRow) → floating-terminal toggle button dispatching TOGGLE_FLOATING_TERMINAL_EVENT wrapped in FloatingTerminalIconContextMenu with amber unread dot fed by selectFloatingWorkspaceHasUnread.

**Toggles** — right-click context menu exposes DropdownMenuCheckboxItems bound to statusBarItems/toggleStatusBarItem for each provider + ssh ("Remote Hosts") + resource-usage + ports, gated by isStatusBarItemAvailable(id, detectedAgentIds) (CLI-installed detection; hook use-available-status-bar-toggles). Usage mode verbose/compact controlled via statusBarUsageMode.

---

## 4. Settings (`components/settings/`, ~534 files)

### 4.1 Settings Shell Architecture

Entry point Settings.tsx (~1900 lines) is a full-page view rendering SettingsSidebar plus a scrollable column of SettingsSection wrappers. Owns Escape-to-close (double-press confirm inside Shortcuts), unsaved-draft close guard (Git AI Author drafts), deep-link handling via settingsNavigationTarget, Ghostty/Warp theme import state, font suggestion loading, and lazy section mounting (settings-load-performance.ts mounts off-screen panes only after idle).

**Navigation registry:** hooks/useSettingsNavigationMetadata.ts is the single source of truth — each entry has id, title, description, icon, searchEntries, and a group (capabilities, setup, workflows, interface, remote, security, advanced, experimental). Entries conditionally included (Linear only when connected; desktop-only sections like voice/computer-use/mobile excluded from web client). Per-project panes render one collapsed repo-<id> section each (built by settings-project-list.ts). Every visited pane stays mounted once visited; search hides non-matching sections rather than unmounting. Deep links scroll to sub-section anchors (data-settings-section) and carry intents such as add-quick-command or add-ssh-host.

### 4.2 All Settings Panes (37 panes, tests excluded)

| Pane | Configures |
|------|-----------|
| AccountsPane.tsx (2049 ln) | Per-provider AI accounts (Claude, Codex, Gemini, OpenCode Go, MiniMax, Grok): add/select/reauthenticate/remove, rate-limit states, host-scoped visibility |
| AdvancedPane.tsx | HTTP/1.1 compatibility toggle for Electron networking behind proxies (with relaunch flow) + proxy configuration |
| AgentsPane.tsx (1078 ln) | Agent catalog: enable/disable TUI agents, default agent, per-agent launch args/env vars, permission modes, awake setting, cache timer, runtime location, generated tab titles/status hooks |
| AppearancePane.tsx | Theme, language, UI zoom, IDE font, app icon, sidebar layout, status-bar toggles, menu-bar/tray presence; Interface/Terminal/Window sections incl. Ghostty/Warp theme import |
| ArtifactsSettingsPane.tsx | Artifact publishing toggle (shared HTML/Markdown), Fabrica-account gated |
| AutomationsSettingsPane.tsx | "Show Automations Button" sidebar toggle + scheduled-runs walkthrough |
| BrowserPane.tsx | Embedded browser: home page, search engine, default zoom, link routing (modifier keys, terminal link actions), localhost worktree labels, session cookie profiles |
| BrowserUsePane.tsx | Setup checklist for agent-driven browsing: skill install, Fabrica CLI prerequisite check, cookie-import from real browser profiles, example prompts |
| CommitMessageAiPane.tsx | "Git AI Author": which agent/model writes commit messages and branch names per host, custom prompts with draft guards, hosted-review creation defaults |
| ComputerUsePane.tsx | macOS-only computer-use: Accessibility/Screenshots OS permission requests with status pills + skill setup panel |
| DeveloperPermissionsPane.tsx | macOS developer permissions (mic, camera, Bluetooth, USB, network, full disk, accessibility, screen recording) + local network test |
| DevToolsPane.tsx | Dev-only pane (lazy, DEV builds): buttons firing test toasts/dialogs/store states for layout QA |
| EphemeralVmsPane.tsx | Per-workspace ephemeral VM environments: recipe catalog + installs ephemeral-VMs agent skill |
| ExperimentalPane.tsx | Feature flags: Pet, agents view, agent dashboard, native chat, terminal attention, new worktree card style, agent hibernation (idle-minutes field); hidden group unlocks via Shift-click on sidebar entry |
| FabricaAccountSettingsPane.tsx | Cloud account sign in/out powering Artifacts sharing and Fabrica Relay mobile access, reconnect handling |
| FloatingWorkspacePane.tsx | Floating terminal/workspace: working directory picker, trigger location, enable toggles |
| GeneralPane.tsx | Workspace defaults, editor settings, Windows default project runtime (WSL distro), CLI registration, app updates incl. remote-server updates, recent-tab ordering, navigation ("Open In" menu), support |
| GitPane.tsx | Global Git behavior: author identity display, branch prefix, auto-rename branch from work, compare-against-upstream, keep-local-main-up-to-date fast-forward, source-control group order |
| GitProviderApiBudgetPane.tsx | Read-only API budget panels: GitHub REST/Search/GraphQL + GitLab CLI rate limits |
| InputPane.tsx | Middle-click paste from primary selection (X11/macOS-style selection clipboard) |
| IntegrationsPane.tsx | Connection cards for review providers (GitHub, GitLab, Bitbucket, Azure DevOps, Gitea) and task providers (Jira, Linear) with periodic status refresh |
| LinearAgentSkillPane.tsx | Linear-specific setup: connect Linear, install/update its agent skills, task visibility control; only rendered when Linear connected |
| MobileEmulatorSettingsPane.tsx | iOS Simulator / Android Emulator availability checks (simctl, Android SDK), device auto-select dropdowns, per-agent emulator control rows |
| MobilePane.tsx (463 ln) | Phone pairing: QR generation, connection mode (relay vs LAN), network interface preference, paired-device management, auto-restore-fit timing |
| MobileSettingsPane.tsx | App Store/APK install links, beta notice, "Show Mobile button" toggle, embeds MobilePane |
| NotificationsPane.tsx | Notification enable/toggles per event, macOS permission card, sound selection/volume, test-notification sender |
| OrchestrationPane.tsx | Installs orchestration agent skill with coverage list and usage examples |
| PrivacyPane.tsx | Telemetry consent opt-in/out, blocked-telemetry detection (DO_NOT_TRACK etc.), diagnostic bundle controls |
| QuickCommandsPane.tsx | Saved terminal commands CRUD, scoped globally/per-project/per-execution-host, scope filter |
| RepositoryPane.tsx (395 ln) | Per-project settings (one instance per repo): icon/emoji, hooks inspection, MCP config, worktree symlinks, sparse-checkout presets, fork sync, per-host setup, Windows runtime, worktree defaults, repo-level Source Control AI |
| RuntimeEnvironmentsPane.tsx (1561 ln) | Remote server/runtime environment management: active server selection, protocol-compatibility verdicts, saved server CRUD, runtime access grants/pairing URLs, ephemeral VM runtimes, cloud VM setup guide |
| SettingsSetupGuidePane.tsx | Onboarding checklist embedding FeatureWallSetupChecklist; auto-follows first incomplete step |
| ShortcutsPane.tsx (431 ln) | Keyboard shortcuts: full keybinding catalog grouped by filter rail, inline recorders, conflict detection, multi-binding lists, plugin command keybindings, terminal shortcut policy, raw keybindings file actions |
| SshPane.tsx (442 ln) | SSH target CRUD: add/edit/test/remove hosts, connection states from store, passphrase/destructive-action dialogs, workspace-aware host removal |
| TasksPane.tsx | Task source providers (GitHub, GitLab, Jira, Linear): connect each provider, install Linear skill, choose providers appearing in Tasks view |
| TerminalPane.tsx | Terminal subsections: Windows shell choice, rendering, interaction (right-click paste, scrollback presets), sessions management, Mac Option-key/Yen behaviors, setup scripts, advanced platform settings |
| VoicePane.tsx | Local speech-to-text dictation: toggle/microphone, on-device speech model download states, optional cloud transcription via OpenAI API key |

(StatsPane also mounts in Settings but lives at ../stats/StatsPane.)

### 4.3 Search System

Two layers:
1. **Scoring engine** (`settings-search.ts`): SettingsSearchEntry {title, description?, keywords?, cmdJKeywords?, targetSectionId?}; tiered scorer — exact/prefix/substring matches score highest on pane titles (900/850/800), then row titles (700-tier), descriptions, keywords. Empty queries return neutral match; oversized queries (>2KB) rejected.
2. **Per-pane indexes**: nearly every pane has a sibling *-search.ts file exporting localized SettingsSearchEntry[] catalogs built with createLocalizedCatalog + translateSearchKeyword (appearance-search.ts, advanced-search.ts, agents-search.ts, terminal-search.ts split into theme/clipboard/typography/windows modules, repository-search.ts, mobile-pane-search.ts, etc.). Panes call matchesSettingsSearch(query, entries) to decide whether to render each row; SearchableSetting.tsx wraps individual rows so they self-hide under search. Nav registry searchEntries feed both the Cmd+J palette and sidebar filtering (rankSettingsSearchItems ranks results).

### 4.4 Notable Sub-sections & Components

1. AgentSkillSetupPanel.tsx (413 ln) — reusable install/update card for agent skills used by Orchestration/Browser Use/Ephemeral VMs/Linear panes: freshness pill, inline install terminal, Fabrica CLI prerequisite verification.
2. AdvancedNetworkSettingsSection.tsx — collapsible HTTP proxy config (URL + bypass rules); auto-opens when searched or configured.
3. PluginsSettingsSection + PluginMarketplaceBrowser — marketplace browsing, install/consent dialogs (keybinding and VM-recipe consent previews), rollback/remove dialogs, dev-mode plugin section.
4. CliSkillRuntimeSetup / CliSection / WslCliRegistration — registers the fabrica CLI into user shells including WSL distros.
5. ShortcutRecorderButton / ShortcutRowsList / shortcut-definition-catalog — press-to-record capture, binding mutations, conflict detection, filter rail.
6. McpConfigSection / McpMissingConfigList / mcp-config-inspection — per-project MCP server config inspection inside RepositoryPane.
7. GhosttyImportModal / WarpThemeImportModal / YamlThemeImportButton — theme imports (state hoisted to Settings.tsx so modals survive remounts).
8. SparsePresetSettingsSection — sparse-checkout preset editor with date-based presets and directory preview.
9. RuntimePairingUrlGenerator / RuntimeHostAccessForm — pairing URLs and runtime host access grants inside RuntimeEnvironmentsPane.
10. host-scoped-setting-scope.ts / setting-ownership.ts / ProviderHostScopeControl — infrastructure for host-scoped settings (local vs per-remote-execution-host values).

Cross-cutting conventions: every row follows the SearchableSetting + SettingsFormControls pattern with i18n keys; panes receive settings/updateSettings from the Zustand useAppStore; write serialization exists for source-control-AI settings (queued promise chain in Settings.tsx).

---

## 5. Native Chat (`components/native-chat/`)

### 5.1 Architecture Overview

native-chat/ implements the GUI chat surface for agent sessions (Claude, Codex, etc.). Root component NativeChatView.tsx resolves a terminal tab into a session via NativeChatSessionGate, then renders NativeChatMessageList + NativeChatComposer. All state flows through the Zustand app store plus per-pane React hooks.

### 5.2 Transcript Loading and Streaming

- **use-native-chat-live-session.ts** (useNativeChatLiveSession) is the core streaming hook. Takes paneKey, agent, sessionId, transcriptPath, runtimeEnvironmentId and:
  1. Selects a transport via getNativeChatSessionTransport(runtimeEnvironmentId) from native-chat-session-transport.ts — remote (runtime-owned) hosts get a different transport than local/SSH IPC.
  2. Performs an initial windowed seed read: transport.readSession(agent, sessionId, limit, transcriptPath).
  3. Opens a live tail via openNativeChatTranscriptStream(...). Frames come as snapshot/replacement (authoritative generations bump transcriptEpochRef so stale pagination cannot repaint them) or append frames. Appends accumulate in separate state backed by an id-dedup merger bounded to the read window.
  4. Retries "not found" reads for 60s (NOTFOUND_RETRY_WINDOW_MS) because new transcripts can take minutes to flush to disk; retry backoff in native-chat-read-retry-timer.ts.
- **Pagination** (native-chat-pagination.ts): initial limit 300 turns; each loadEarlier() grows by NATIVE_CHAT_PAGE = 200; loadEarlier re-reads a larger window and replaces the base list; results fenced by epoch + transport identity + session id so an owner flip or session swap discards stale resolves.
- **Turn lifecycle**: use-native-chat-transcript-lifecycle.ts holds a revision-counter-guarded NativeChatTurnLifecycle with replace/append/revision()/replaceFromPagination — pagination only overwrites if no live write won the race.

### 5.3 Incremental Readers / Assembly

- native-chat-session-assembler.ts defines canonical merge: sources {transcript, hook, scrape} with priority transcript > hook > scrape. Dedup keying turnKey() uses explicit turnId else role + normalized text + digest of non-text blocks so cross-source duplicates collapse while same-source identical prompts stay distinct. compareMessages() sorts by tier rank first (streaming preview rank 1, pending echoes rank 2), then timestamp (null to front), then id.
- native-chat-incremental-assembler.ts is the hot-path optimizer (full rebuilds are O(n log n) per batch, quadratic per turn on streaming): createIncrementalAssembler() -> {byId, byTurn, messages}; reset(assembler, base) full rebuild; applyAppends splices at tail when every message is new and sorts at/after the tail (isTailAppend), falling back to full re-sort otherwise. Correctness invariant: output deep-equals a full rebuild, locked by oracle differential test.
- use-native-chat-assembled-messages.ts wraps it in React: caches committed assembly state, detects suffix extensions (sharesPrefix), clones the assembler before mutation so a discarded render cannot mutate committed state, runs prepareNativeChatLiveMessages.
- mergeNativeChatLiveSession (native-chat-live-status.ts) combines messages, hookState, transcript lifecycle, working-suppression, error/loading into the returned NativeChatLiveSession.
- Rendering helpers: message grouping, tool-call folding (native-chat-tool-fold.ts / NativeChatToolRun.tsx), autoscroll, diff views (NativeChatDiffView), terminal-scrape fallback source, interactive/question/approval cards.

### 5.4 Composer

NativeChatComposer.tsx (454 lines) sends prompts "through the same verified runtime path as typed input":
- Sending via native-chat-runtime-send.ts: sendNativeChatMessage, sendNativeChatTypedCommand, sendNativeChatMessageWithImageAttachments, submitNativeChatPrompt. Enter sends; Shift+Enter newline; multi-line bracketed-paste wrapped; ESC writes a raw ESC byte as interrupt.
- Draft persistence: use-native-chat-draft.ts + native-chat-draft-cache.ts scoped by paneKey so drafts survive TUI/GUI toggles and PTY replacement; launch drafts adopted via use-native-chat-launch-draft-adoption.ts.
- Autocomplete: slash commands (verified commands per agent) and @file mentions via picker-state hooks; dispatch through use-native-chat-picker-command-dispatch.ts; typed insertion hook; keydown handling hook; paste handling with image persistence to temp files.
- **Attachments**: use-native-chat-composer-attachments.ts manages image/file chips cached per scope key; images deferred to submit. SSH-aware resolution in native-chat-attachment-upload.ts: resolveNativeChatAttachmentOwner returns 'local' | 'ssh' | 'runtime' | 'not-ready', uploading local paths to the remote host before attaching. External file drops handled by use-native-chat-external-attachments.ts.
- **Model switching**: NativeChatSessionOptionPickers.tsx renders dropdown pills fed by SessionOptionDescriptor[] snapshots from use-native-chat-session-options.ts. That hook merges a static catalog, live discovery probes (discoverNativeChatCatalogModels with enrichment + useSyncExternalStore subscription), and Claude-specific terminal-screen parsing (claude-terminal-session-options.ts). Settings writes serialize on a single promise chain (enqueueSessionOptionSettingsWrite); persisted model defaults missing from discovery are retired. Applying a switch writes PTY input and confirms via claude-model-switch-confirmation.ts watching PTY data for compacted markers (switchmodel?, setmodelto<label>, keptmodelto rejection, one-time-consent strings), classifying outcomes applied | rejected | interaction-required | unknown within a 5s / 64KB observation budget.

---

## 6. Cmd-J Palette (`components/cmd-j/`)

The palette shell is components/WorktreeJumpPalette.tsx; cmd-j/ holds extracted pure logic modules with colocated tests.

### 6.1 Fuzzy Matching

No classic subsequence matcher — ranking is token-based:
- palette-query-tokens.ts: normalizeCmdJPaletteQuery lowercases/collapses Unicode whitespace (surrogate-pair aware); tokenizeCmdJPaletteQuery splits on non-letter/number boundaries using \p{L}\p{N} regex so CJK/accented words survive. cmdJPaletteTokenScore scores each query token against candidate tokens: exact = 3, startsWith = 2, includes = 1. Filler tokens ("the", "open", "go", "to", ...) excluded from the coverage rule; if meaningful tokens covered <=50%, score returns 0.
- palette-results.ts ranks via six ordered rules: (1) action verb exact match, (2) settings config-keyword exact match, (3) "verb + settings" head/tail compound, (4) action verb prefix not ending in settings keyword, (5) settings keyword prefix match, (6) fallback token score. Sorting rule asc -> score desc -> settings-before-action -> order -> id. Queries under 2 chars or over CMD_J_PALETTE_QUERY_MAX_BYTES (2 KiB, anti private-data scanning of pasted blobs) return nothing. Settings keywords built by buildCmdJSettingsResults from SETTINGS_ALIASES plus section titles/searchEntries.
- palette-project-results.ts applies the same pattern to project/repo/group candidates with its own five-rule ladder.
- Render caps: PALETTE_SECTION_RENDER_CAP = 50 rows per section plus softSplitPaletteSection (typed-query leading preview 6, trailing floor 3 for interleaved sections) with overflow hints instead of unbounded rows.

### 6.2 Command/Action Registry

- quick-actions.ts: getCmdJQuickActions is a localized catalog of CmdJQuickAction objects — id, title, description, lucide icon, verbKeywords, isAvailable(ctx), run(ctx) returning {status:'ok'|'unavailable', reason}. Built-ins: new-browser-tab, new-markdown-file, new-terminal-tab, create-workspace, delete-workspace, quick-command creation. Context-heavy setup flows deliberately stay in Settings.
- plugin-quick-actions.ts: converts active plugin commands into palette actions (id plugin:<pluginKey>/<commandId>), gated on worktree context, executed via executePluginCommand(command, 'plugin-palette').
- quick-action-context.ts builds CmdJQuickActionContext (active view/worktree/group, SSH status, runtime mode, runner callbacks) with availability reasons loading | no-active-workspace | ssh-disconnected | no-active-workspace-group; captureCmdJActiveGroupSnapshot freezes group selection so actions resolve consistently after close.
- Worktree/tab rows come from worktree-palette-cache-inputs.ts (memo inputs), worktree-checks-review-index.ts (CI checks/review indexing per row), filtering via palette-filter.ts.

### 6.3 Host Badges

- palette-host-badge.ts: getPaletteHostBadge(repo, hostOptions, alwaysShowHostLabel=false) returns {hostId, label} or null. Badge appears only when there is an actively reachable non-local host (hasActiveRemoteHost requires host.id !== LOCAL_EXECUTION_HOST_ID and health !== 'disconnected') — unlike the sidebar which lists disconnected hosts. With alwaysShowHostLabel (used when a host filter is applied) the badge shows even when remotes are down since it explains which rows survived filtering.
- Related live-status badges in palette-live-status.tsx: PaletteLiveStatusProvider concentrates the hottest store subscriptions (agent status per pane, unread tabs, completion panes, browser tabs, agentStatusEpoch) into one context so only status dots re-render on churn.
- Filter plumbing: palette-filter.ts maintains sorted-array hostIds/projectKeys selections (500-per-field cap, reference-stable no-ops to keep memos warm), reconcilePaletteFilter prunes vanished hosts/projects, buildPaletteFilterPredicate yields row predicates (worktree host wins over repo fallback).

---

## 7. Store (`store/`, 268 files) & Cross-Window Sync

Roughly two-thirds of store/slices files are co-located tests; ~90 non-test files, of which 41 are true Zustand slices and the rest helper/coordinator modules extracted from oversized slice files.

### 7.1 Composition Pattern (store/index.ts, types.ts)

One single Zustand store built with vanilla slice composition — **no middleware**:
- store/index.ts:57 creates the store with create<AppState>()((...a) => ({ ...createRepoSlice(...a), ...createSparsePresetsSlice(...a), ... })) — spread-composition where every slice factory receives the full (set, get, api) tuple and returns partial state merged into one flat store.
- Every slice typed StateCreator<AppState, [], [], XxxSlice> — empty middleware slots confirm **no persist, no devtools, no subscribeWithSelector** anywhere in the chain.
- store/types.ts defines AppState as a plain intersection of all 41 slice types, mirroring index.ts exactly. Slices freely cross-reference each other through shared AppState.
- Extras wired at creation: installStoreListenerCensus patches the inner api to count live subscribers (typing-latency census); memory-profile contributors register fattest collections for OOM breadcrumbs; registerHttpLinkStoreAccessor exposes state to HTTP link routing; dev/E2E builds expose window.__store.

Auxiliary stores outside AppState (plain create(), unpersisted): plugin panels (plugin-panels.ts), plugin language packs (plugin-language-packs.ts), running-terminal close confirmation (running-terminal-close-confirm.ts).

### 7.2 Persistence Mechanism

No zustand persist middleware and no localStorage use by the main store. Three custom channels:
1. **Persisted UI**: App.tsx calls window.api.ui.get() and passes the result into hydratePersistedUI(ui, 'startup') which bulk-merges persisted UI fields into UISlice and flips persistedUIReady. Writes go back via window.api.ui.set({...}). Structural equality enforced with persistedUIValuesEqual so unchanged rewrites are dropped.
2. **Workspace session**: terminals slice owns hydrateWorkspaceSession(session, options) rehydrating tabs, terminal rows, browser workspaces, editor files etc. from on-disk FABRICA-data.json. A debounced session writer (lib/session-write-subscriber.ts + workspace-session-host-persistence.ts) subscribes to the store, gates on relevant mutations, splits patches by owning execution host, writes via window.api.session. A hydrationSucceeded flag prevents an early-startup crash from overwriting good data.
3. **Settings**: SettingsSlice.fetchSettings/updateSettings round-trip through window.api.settings.get/set; settings never held locally as source of truth.

### 7.3 The 41 Composed Slices

**Workspace/catalog layer**
- repos.ts (~144KB): repos, projects, projectHostSetups, projectGroups, folderWorkspaces, activeRepoId, fetch-generation guards; fetch/add/clone/nested-repo import/project-group CRUD/folder-workspace CRUD/reorder actions.
- worktrees.ts + worktree-helpers.ts (~250KB): worktreesByRepo, detectedWorktreesByRepo, lineage maps, activeWorktreeId/activeWorkspaceKey/host id, pending creations, delete states, sortEpoch; fetch/create/remove/lineage/activation actions.
- sparse-presets.ts: per-repo sparse-checkout presets with lazy fetch/save/remove/prune.
- runtime-status.ts (+hydration/refresh/equality/disconnect-toast helpers): saved remote Fabrica servers, per-environment probed status, revision-guarded refresh, disconnect toasts.
- workspace-space.ts: disk-space analysis scan with refresh/cancel/removal reconciliation.
- workspace-cleanup.ts: stale-worktree cleanup scanning, policy classification, dismissals, batch removal with concurrency limiting.

**Terminal layer**
- terminals.ts (~186KB, largest): tabsByWorktree legacy rows, activeTabId(ByWorktree), ptyIdsByTabId, pane titles, unread bell/completion maps, PTY shutdown/pending-exit guards, Codex restart notices, direct-SSH retry ledgers, terminalLayoutsByTabId, native chat launch prompts/drafts, pending startup commands/env, tab-bar order, hydrateWorkspaceSession, reconnect/snapshot/cold-restore state, createTab.
- agent-status.ts (+pane-authority, freshness-scheduler): live agent status keyed by tabId:leafId pairs, retained done snapshots, sleeping-agent sessions captured on sleep for one-click resume, freshness epoch timer, pane-authority aliases/transfers.
- pane-foreground-agent.ts: process-table agent identity per pane (OSC 133 evidence) used for input-byte routing.
- terminal-quick-command-hosts.ts: quick commands per execution host with capability-gated CRUD.
- terminal-tab-retirement.ts (+helpers): pure modules computing retirement plans (which PTYs to kill vs cleanup-only), orphan detection, hydration-time row dedup against unified tabs, spawn-suppression counts.
- Direct-SSH cluster: recovery types, authority ledger (equality/pruning), binding invalidation on reconnect, automatic pane respawn after reconnect (max 2 attempts), workspace scoping per SSH target.

**Tabs/editor/browser UI layer**
- tabs.ts (~78KB): canonical unified tab model — unifiedTabsByWorktree, groupsByWorktree, activeGroupIdByWorktree, layoutByWorktree split trees; create/close/activate/reorder/pin/rename/color tabs, group focus, close-others/left/right, view-mode toggles (terminal/native chat).
- editor.ts (~207KB): openFiles, activeFileId(ByWorktree), unsaved drafts in-store, markdown/editor view modes, right sidebar route/width/explorer view, git operations exposed through actions (commit drafts, branch compare, conflict resolution states, push/pull targets).
- ui.ts (~107KB): top-level view routing (activeView, per-view return locations), sidebar chrome, status bar items, task page data/resume state, changelog/update status, acknowledged agents, feature tips, pet overlay config, manual repo order, persistedUIReady/hydratePersistedUI.
- settings.ts: settings GlobalSettings mirror with fetchSettings/updateSettings writing to main.
- keybindings.ts: keybinding overrides + file snapshot; ensure/set/reset/disable/reload/open-file actions via window.api.keybindings.
- browser.ts (+webview-cleanup): embedded browser workspaces per worktree, pages per workspace, certificate failures, page annotations, session profiles, recently-closed browser tabs/pages, remote page handles.
- recently-closed-tabs.ts (+position): cross-type closed-tab stacks (terminal/browser/editor, caps 10/30) capturing enough state to reopen a fresh shell at same position.
- pinned-tab-close-confirm.ts: queued confirmation dialog state for closing pinned tabs.
- dictation.ts: speech dictation state, partial transcript, active model, per-model download states.

**Integrations layer**
- github.ts (~172KB): TTL caches keyed by repo+host scope — prCache, issueCache, checksCache, commentsCache, workItemsCache; PR/issue/check/comment fetching, reactions, thread resolution.
- github-checks.ts / github-cache-key.ts / github-project-row-owner.ts / github-repo-lookup-index.ts: PR-check syncing, host-scoped cache keys, owner routing, repo lookup indexes.
- hosted-review.ts: hosted review info cache per scope::repo::branch across GitHub/GitLab/Bitbucket/Azure/Gitea.
- linear.ts (~77KB) and jira.ts: connection status, workspace selection, issue caches with TTL+eviction, connect/disconnect/test flows via runtime RPC clients.
- preflight.ts: cached environment preflight/integration-check status with context-keyed dedup.
- rate-limits.ts: provider rate-limit snapshots (Claude, Codex, Gemini, Grok, Kimi, MiniMax...) with main-push ingestion.
- usage-provider-slices.ts: three structurally identical usage slices (Claude/Codex/OpenCode) holding scan state and breakdowns.
- detected-agents.ts / runtime-detected-agents.ts: TUI-agent PATH detection scoped by SSH connection or runtime environment.
- diffComments.ts: diff line comments per worktree with rollback-safe persistence through runtime RPC.
- new-issue-draft.ts / task-creation-drafts.ts: session-only composer drafts surviving accidental dismissal.
- fabrica-profiles.ts + auth-actions: cloud/local profile list, active profile, auth status, switch/connect/sign-out actions.
- remote-server-updates.ts: remote server self-update coordination with max-2-concurrent batching.
- pull-request-generation.ts / commit-message-generation.ts: AI-generated PR/commit-message records keyed per worktree with request sequencing.
- stats.ts / memory.ts: one-shot summaries and memory-daemon snapshots with in-flight dedup.

**Cross-slice helper modules (no own state)**: repo-host-identity (composite host+repo identity keys), repo-identity-reconcile (structural reuse to kill render churn), repo-reorder-host-split, superseded/readopted SSH row reconciliation, stale-runtime-host-rows, folder-workspace-update-coordinator (generation-ticket guard against out-of-order updates), detected-worktree-refresh-leases, active-tab-owner-worktree arbitration, worktree-by-id-index, worktree-nav-history (back/forward stack), plus test harnesses.

### 7.4 Selectors

- getAllWorktreesFromState / getWorktreeMapFromState / getRepoMapFromState / getHasAnyWorktreesFromState: identity-stable projections backed by WeakMap caches in worktree-repo-index.ts — critical because Zustand reruns selectors on every write.
- selectRepoByIdForActiveWorkspace: host-aware repo resolution — when the active workspace runs on SSH it falls back to paired hub-owned repos.
- useProjectHostSetupProjection -> project-host-setup-selector.ts: multi-level WeakMap memoization deriving project/host setup projections.
- selectFloatingVisibleTabCount: memoized count of visible floating-workspace items across tab types.
- selectFloatingWorkspaceHasUnread: primitive boolean driving the launcher attention dot; clears exactly on user interaction.
- Hook wrappers (useActiveWorktree, useWorktreeById, useAllWorktrees...) route through getKnownWorktreeById and the active-workspace execution host id.

### 7.5 Cross-Window Sync via runtime/sync-runtime-graph.ts (2063 lines)

This module publishes renderer state to the Electron **main process over IPC** — not BroadcastChannel, not inter-window events:
- **Mechanism**: runRuntimeGraphSync() assembles a RuntimeSyncWindowGraph (per-tab terminal layout roots + per-leaf records carrying tabId, worktreeId, leafId, paneRuntimeId, live ptyId, resolved titles) and awaits window.api.runtime.syncWindowGraph(graph). Main acknowledges and returns mobileSessionResyncWorktrees and agentOrchestrationByPaneKey which are written back into the store. Coalescing is aggressive: a 16ms timer collapses bursts, an in-flight flag defers overlapping syncs to one trailing run, setRuntimeGraphSyncEnabled gates the pipeline. TerminalPane mount/unmount triggers registration/unregistration which schedules syncs.
- **What is synced** (two payloads share the pipeline): (1) the terminal graph above — unmounted automation tabs publish leaf+PTY from the persisted layout only when an eager PTY buffer proves the transport alive (10s grace suppresses false anomalies); (2) **mobile session snapshots** projecting per worktree: unified tabs, tab groups/layout/order, active file/tab ids, browser workspaces/pages, open files, editor draft hashes, native-chat launch drafts, folder workspaces, agent status history, resolved terminal theme.
- **Participating slices**: terminals (terminalLayoutsByTabId, runtimePaneTitlesByTabId, tabsByWorktree), tabs (unifiedTabsByWorktree, groupsByWorktree, layout trees, tab-bar order), editor (openFiles, drafts), browser (browserTabsByWorktree, pages, active ids), agent-status (agentStatusByPaneKey, epoch), settings (generated titles toggle, theme), native-chat launch drafts.
- **Change detection / conflict resolution**: RuntimeMobileSessionSyncKey compares slice references; expensive slices get pre-serialized projection strings with per-entry caching (agent-status projection with 30-second updatedAt bucketing) so timestamp-only churn does not reserialize everything. Per-worktree snapshot caching keyed on structural JSON-content equality means unchanged worktrees are withheld entirely; main gates mobile fanout on (publicationEpoch, snapshotVersion). Delivery is ack-based: only after main acknowledges is a snapshot recorded; a throw leaves the memo behind so next sync resends in full. If main reports dropped worktrees (mobileSessionResyncWorktrees), renderer deletes those memos and schedules immediate full republish — last-writer-wins at whole-worktree-snapshot granularity, renderer authoritative, main consumer/fanout point.

---

## Appendix: Top-Level Renderer Entry Points

- main.tsx / App.tsx — root mount, persisted-UI hydration, beforeunload shutdown-buffer capture, runtime graph sync startup.
- popout.tsx — popout-window entry (dashboard popouts share the renderer bundle).
- lazy-modal-mount-state.ts — deferred modal mounting helper with tests.
- Other top-level dirs not covered in depth here: assets, constants, hooks, i18n, runtime, ssh, startup, web.

*End of report.*

