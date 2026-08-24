# FA R4-1.11 — Fabrica-app Window / Tray / Notification Subsystems (Line-Level Deep Dive)

> Task: ATLAS R4-1.11 · Group 1 Round 4 · READ-ONLY scan of `Fabrica-app/src/main` (window, tray, menu, dock, notifications, global shortcuts, deep links, app lifecycle).
> All paths relative to `Fabrica-app/` unless noted. Every claim carries a `file:line` citation. Scan-coverage statement at the end.

---

## 1. App Lifecycle

### 1.1 Single-instance lock

- Central helper: `acquireSingleInstanceLock()` calls `app.requestSingleInstanceLock()`, registers `app.on('second-instance')`, returns boolean (`src/main/startup/single-instance-lock.ts:40-49`).
- **Lock identity is the `userData` path** — callers must invoke after `configureDevUserDataPath(is.dev)` so dev (`FABRICA-dev`) and packaged (`FABRICA`) runs lock in separate namespaces instead of serialising against each other (`single-instance-lock.ts:35-38`; call order at `src/main/index.ts:656` then `index.ts:801`).
- Dev instances skip the lock by default so parallel `pnpm dev` from multiple worktrees doesn't silently exit; E2E can force it via env `FABRICA_E2E_ENFORCE_SINGLE_INSTANCE_LOCK=1` (`single-instance-lock.ts:67-74`).
- macOS packaged builds have a diagnostic bypass env `FABRICA_BYPASS_SINGLE_INSTANCE_LOCK=1` for a known Electron false lock-loss before any app logs exist (`single-instance-lock.ts:51-65`; bypass log call at `index.ts:793-796`).
- Failure path: if the lock is not acquired, the launch logs a diagnostic line and calls `app.exit(3)` — exit code 3 is a stable "another process owns this profile" contract that a systemd unit keys off via `RestartPreventExitStatus=`; deferring to `app.exit` avoids a Linux display-init SIGSEGV on pre-ready graceful quits (#11935) (`single-instance-lock.ts:5-12`, `index.ts:809-814`).
- **Why the lock exists at all**: Fabrica writes two canonical discovery files into `<userData>/` — `FABRICA-runtime.json` (RPC endpoint + authToken for the bundled CLI) and `agent-hooks/endpoint.env` (hook port + token for cursor-agent/claude/codex scripts). A second instance would clobber both, and when the newest instance quits, metadata points at a dead pid so `FABRICA status` reports `stale_bootstrap` while the original process still runs (`single-instance-lock.ts:22-33`). This is the core reason the desktop app and its CLI are one-process-per-profile.

### 1.2 Second-instance handling = the de-facto external invocation surface

- On second-instance, `requestDesktopActivation(argv)` first checks `shouldActivateDesktopForSecondInstance(argv)` which is true unless argv requests serve mode — a duplicate `FABRICA serve` (supervisor artifact) must not drag a headless server into opening a desktop window (#11935); note they match the whole serve argv shape, not just `--serve`, because the systemd unit runs `<binary> serve --port …` with unrewritten CLI-form argv (#12677) (`index.ts:687-693`, `single-instance-lock.ts:14-20`).
- Activation goes through `desktopActivationGate` (`startup/serve-desktop-activation.ts:30-74`): state machine `initializing → ready | blocked`. Promotion to desktop UI only fires when the serve process owns daemon-backed (persistent) PTYs so the renderer reattaches surviving sessions instead of cold-restoring; otherwise fail closed with reason `'persistent PTY provider unavailable'` (`serve-desktop-activation.ts:12-28`). Pending activations during `initializing` replay on `markReady`; blocked ones surface `onBlocked` (`serve-desktop-activation.ts:41-72`).
- macOS dock re-activation uses `createMacAppActivationHandler`: only requests activation when there is no live window, because re-focusing an existing macOS window can race its scene-backed Space transition (`window/macos-app-activation.ts:3-13`; wiring `index.ts:2986`).
- The actual focus/open of an existing-or-new window is shared by both paths via `focusExistingMainWindow` (`index.ts:678-685`) — see §2.4.

### 1.3 Startup ordering relevant to windows/tray

- `app.whenReady()` (`index.ts:2090`): hang watchdog install, certificate-error controller, `setAppUserModelId(devInstanceIdentity.appUserModelId)` (Windows toast identity), `app.setName(devInstanceIdentity.appName)` — name pinned to a *stable* appName because it drives the macOS safeStorage Keychain item name, so per-branch dev names would re-prompt Keychain access (`index.ts:2118-2120`).
- Store settings mutation hook re-syncs native surfaces live: `showMenuBarIcon` changes call `syncMacMenuBarIcon(...)` to create/destroy the macOS status item immediately (`index.ts:2195-2198`).
- First-launch macOS notification registration is deferred until the main window's first `show` (so the permission dialog isn't hidden behind the maximized window) and gated on onboarding completion (`index.ts:3116-3126`).

### 1.4 Quit behavior — a two-phase, deadline-bounded teardown

- Module-level latch `isQuitting` distinguishes user quit from window-close-as-hide; set by tray quit, updater relaunch, GPU fallback relaunch, recovery prompt, and `before-quit` itself (`index.ts:339-340, 1213-1215, 1430, 1641, 1735, 3138`).
- `before-quit` (`index.ts:3132-3147`): allows update-installs explicitly, sets `isQuitting = true`, fences+closes the mobile relay, disposes agent awake service, stops rate limits. PTY cleanup is deliberately deferred to `will-quit` so the renderer captures scrollback before PTY-exit events unmount TerminalPane (`index.ts:3145-3146`).
- `will-quit` (`index.ts:3149-3271`) fires twice (first pass preventDefaults and tears down; second pass exits) guarded by a `daemonDisconnectDone` latch and a `quitTeardownStartGate.tryStart(e)` that preventDefaults *before any work* so teardown awaits never block synchronously (a stalled network profile mount otherwise parks the main thread uninterruptibly, #9447) (`index.ts:3150-3165`).
  - Committed-path-only actions: `destroySystemTray()` (only remove the Windows tray icon once quit cannot be vetoed by renderer beforeunload) (`index.ts:3178-3179`).
  - Ordered flushes: stats.flushAsync precedes killAllPty so still-running agents emit synthetic agent_stop events (`index.ts:3180-3208`); plugin hosts dispose with SIGKILL escalation joined into the barrier (`index.ts:3183-3191`); SSH shutdown marks every lease detached synchronously *immediately* before store.flushAsync persists it (`index.ts:3205-3207`).
  - Ten teardown promises join an `allSettled` barrier bounded by `settleTeardownWithinDeadline` (daemon, runtime-rpc, watchers, emulator, ssh, plugin-hosts, codex-backfill-recovery, usage-cache, stats, state) — fail-open: a rejection still quits; overdue items log `'Quit teardown deadline reached'` (`index.ts:3236-3261`), then telemetry→observability shutdown and a final `app.quit()` (`index.ts:3262-3270`).
- `window-all-closed` (`index.ts:3273-3284`): quits unless policy says stay alive. Policy fn `shouldQuitWhenAllWindowsClosed`: serve mode keeps the app alive (runtime RPC must survive disposable/offscreen window churn) and macOS stays alive unless a quit is already in progress; non-darwin always quits (`startup/window-all-closed-quit-policy.ts:1-10`).
- Hard-exit paths that skip Electron quit events destroy the tray manually: GPU-fallback relaunch does `app.exit(0)` after `destroySystemTray()` to avoid a stale Windows tray icon (`index.ts:1735-1739`); `process.once('exit', stopTccPromptNotice)` keeps a log child from surviving forced exits (`index.ts:3129-3130`).
- Serve supervisor: `installServeSupervisorDisconnectQuit(isServeMode)` couples app lifetime to supervisor disconnect in headless mode (`index.ts:658`); dev-parent coupling (dev only) installs disconnect/watchdog/signal quits (`index.ts:817-822`).

---

## 2. Window Creation & Management

### 2.1 Main window construction (`src/main/window/createMainWindow.ts`, 1167 lines)

- Bounds restore with validation: persisted `windowBounds` rejected when ≤ min size or not visible on any display (titlebar reachability after display changes), logging the discard; default bounds fill the primary work area (fallback 1200×800) (`createMainWindow.ts:228-252`; validator `window/window-bounds-validation.ts`, cited from `:57`).
- BrowserWindow options (`createMainWindow.ts:265-303`): min 600×400; `show:false` (reveal on ready-to-show); `acceptFirstMouse:true` (macOS swallows the activating click otherwise); `autoHideMenuBar:true` on Win/Linux (Alt reveals); background color follows native theme; `titleBarStyle:'hiddenInset'` on macOS (native traffic lights inside custom titlebar) vs `'hidden'` on Windows vs `frame:false` on Linux (Linux ignores 'hidden'); traffic-light position constant `x:16, y:12` derived from an 18 CSS px titlebar center (`createMainWindow.ts:172-175, 279-295`); Windows-only optional acrylic `backgroundMaterial` behind a restart-required setting (`createMainWindow.ts:259-263`); webPreferences: sandboxed preload, `webviewTag:true` (`createMainWindow.ts:298-302`).
- Trusted renderer pinning: the created webContents id becomes the trusted UI renderer (`createMainWindow.ts:304-306`), cleared on close (`:1157`).
- Zoom sync: dom-ready applies persisted `uiZoomLevel` and repositions traffic lights by zoom factor `1.2^level` since native buttons don't scale with CSS zoom (`createMainWindow.ts:330-337`; live sync channel `ui:sync-traffic-lights` at `:1073-1077`).
- Reveal: one-shot ready-to-show guard against macOS+Electron 41 re-emission (#591) plus a 10s fallback timer on Win/Linux so GPU failures can't leave the only window hidden forever (#8421); E2E headless keeps it hidden (`createMainWindow.ts:339-379`).
- Bounds persistence: debounced 500ms save on resize/move; freezes during close/teardown; skips near-minimum bounds and full-screen; persists `windowMaximized`+`windowBounds` atomically as a matched pair (`createMainWindow.ts:381-411`); also latched on `before-quit` because the auto-updater calls `removeAllListeners('close')` (`:413-421`); maximize/unmaximize mirror the same guards and push `window:maximize-changed` to the renderer-drawn chrome (`:423-443`).
- Renderer-crash resilience: `render-process-gone` resets all focus-mirror carve-outs (default-deny so a dead renderer can't disable app shortcuts in a later lifecycle), classifies via crash recorder, schedules a 250ms auto-recovery reload through a rolling-window circuit breaker; breaker exhaustion hands off to a main-process dialog prompt (Reload/Quit) because a blank window leaves no other retry surface (`createMainWindow.ts:584-668`; prompt `index.ts:1619-1644`).
- Wake/repaint hardening (macOS 26): `installMacosVisibilityRepaint` forces invalidation + a size-jiggle repaint after show/restore/resume (skipped entirely on Tahoe+ where scene-backed windows deadlock on frame mutation), plus an IPC relay `ui:window-revealed` for occlusion reveals that fire no native event (`createMainWindow.ts:63-158`); powerMonitor `resume` also pushes `system:resumed` to the renderer (`:320-328`).
- webview guest containment: `will-attach-webview` fails closed on unregistered src/partition, strips inherited preload/preloadURL, forces nodeIntegration off / contextIsolation+sandbox on / webSecurity on, and injects a dedicated close-preload (`createMainWindow.ts:458-487`); popup/nav policies attach at `did-attach-webview` creation time to beat target=_blank races (`:489-492`); privileged navigation policy + plugin panel guard installed at creation (`:453-456`).

### 2.2 Close flow — renderer-owned confirmation with quit watchdogs

- Close decision extracted & pure: `resolveWindowCloseAction` returns `allow-confirmed` (renderer replied), `bypass-gone` (renderer truly gone/crashed), or `request-confirmation` — a hung-but-alive renderer must still be asked (bypassing it silently destroyed other sessions in #5787) (`window/window-close-decision.ts:12-34`; used at `createMainWindow.ts:1025-1045`).
- Native `close` intercept (`createMainWindow.ts:1019-1057`): minimize-to-tray guard runs even for Alt+F4/programmatic closes; otherwise confirmation is requested from the renderer over `window:close-requested {isQuitting, requestId}`.
- **Quit ack timeout**: when quitting, a 10s timer (`WINDOW_QUIT_RENDERER_ACK_TIMEOUT_MS`, `createMainWindow.ts:65`) destroys an unresponsive-but-alive window so Force Quit isn't the only escape (`createMainWindow.ts:963-981`); the renderer's `window:close-request-received` ack clears it (`:982-986`); confirmed reply re-enters `close()` via `window:confirm-close` (`:1066-1072`).
- A prevented `beforeunload` cancels the quit: releases the bounds freeze, clears the ack timer, notifies host (`onQuitAborted` resets `isQuitting`), and tells the renderer via `window:unload-prevented` (`createMainWindow.ts:1058-1064`; `index.ts:1310-1313`).
- Windows/Linux renderer-drawn titlebar channels: `window:minimize`, `window:maximize`, `window:request-close` (routes the same hide-to-tray guard), `menu:popup` (replicates Alt-reveal for the auto-hidden menu bar), `window:isMaximized` handle for late-mounting controls (`createMainWindow.ts:1079-1123`). IPC close handler quirk: calling `mainWindow.close()` from an IPC handler on Windows can misfire 'close', hence direct send (`:1097-1098`).
- Full listener/handler teardown on `closed` including powerMonitor resume relay removal (app-global leak guard) and skipping webContents access because updater shutdown can fire 'closed' post-destroy (`createMainWindow.ts:1127-1160`).

### 2.3 Minimize-to-tray (Windows)

- `hideToTrayIfEnabled()` hides instead of closing when setting `minimizeToTrayOnClose` is true; suppressed when the renderer is gone/crashed or quitting; fires a one-time-ever "still running in the system tray" Notification (persisted flag `trayMinimizeNoticeShown`) (`createMainWindow.ts:988-1017`).

### 2.4 Focus-existing / reopen semantics (`window/focus-existing-window.ts`)

- Shared activation routine: `app.focus({steal:true})` with plain-focus fallback, restore-if-minimized + show + focus, and win32-specific reinforcement: `moveTop()`, a 250ms always-on-top pulse, and a 100ms focus retry (`focus-existing-window.ts:16-86`).
- If no window exists: opens one, but returns `'pending'` when app not ready; reopen retries up to 3 attempts @300ms and *adopts* an existing live window between attempts because `openWindow` is not idempotent (constructing duplicates would orphan one) (`focus-existing-window.ts:88-146`).
- Tray open, second-instance activation, and macOS activate all funnel through this single implementation (`index.ts:678-685`, `1180-1192`).

### 2.5 Dashboard pop-out window (`window/dashboard-popout-window.ts`)

- Singleton companion window ("Fabrica Agent Dashboard") rendering `popout.html?view=…` with the same preload but a separate in-memory partition so zoom stays window-local; `webviewTag:false`; deny-all permission request/check handlers because isolated sessions don't inherit the main session's deny-by-default policy (`dashboard-popout-window.ts:22-31, 139-189`).
- Focus-aware zoom routing: menu zoom acts on whichever window is focused (`:74-81`); own before-input-event resolves only zoom chords (`:218-240`); bounds persistence mirrors main-window debounce/freeze/near-min guards (`:248-280`).
- Lifecycle coupling: closed automatically when the main window closes so it never orphans (macOS app-alive-after-last-window case) (`:295-302`; called from `createMainWindow.ts:1127-1131`); agent status events are mirrored into the popout alongside the main window (`index.ts:1561-1564, 1577-1583`).

### 2.6 Keyboard shortcuts (no globalShortcut module)

- **Finding: `globalShortcut` is never imported anywhere in `src/main`** (repo-wide grep hits only renderer App.tsx local refs). All app-level chords are handled in-window via `before-input-event` (`createMainWindow.ts:810-920`) — meaning nothing works system-wide when Fabrica is unfocused.
- Mechanism details worth preserving: allowlist-based action resolution so readline control chords reach the PTY untouched (`createMainWindow.ts:901-907`); focus mirrors for markdown editor / terminal input / floating panel / shortcut recorder set via strict-sender-checked IPC (`:494-551`) with default-deny reset on renderer death/navigation (`:569-583, :657-664`); modifier double-tap detector on bare modifiers only (they emit no terminal bytes) (`:845-877`); held-key repeat containment for index jumps (`:749-755`); FABRICA-first terminal policy capture forwarding (`:763-769, :800-804`); blur resets double-tap arming (`:922-923`).
- Menu items deliberately use display-only shortcut hints (no real accelerators) to avoid stealing chords from renderer overlay logic (`menu/register-app-menu.ts:224-230, 299-305`).

### 2.7 Deep links / protocol handlers

- **Finding: none.** There is no `setAsDefaultProtocolClient`, no `open-url` handler, no custom scheme registration in `src/main` (grep across all non-test files returned zero matches). External invocation is instead: (a) second-instance argv (§1.2), (b) the bundled CLI redirect (`startup/packaged-cli-entry-redirect.ts`, `startup/appimage-cli-redirect.ts` exist in startup dir listing), and (c) the runtime RPC discovery file (`single-instance-lock.ts:22-29`). Any future deep-link feature would be net-new surface.

### 2.8 Window visibility as a process-global signal

- `notifyMainWindowBecameVisible` / `onMainWindowBecameVisible`: long-lived services subscribe to this instead of a specific window instance because BrowserWindows are recreated on macOS dock re-activation; index.ts re-wires each new window's show/restore into it (`window/main-window-visibility.ts:1-26`; wired at `index.ts:1493-1495`).
- `isMainWindowVisible` treats destroyed/null as invisible and requires `isVisible && !isMinimized` (`main-window-visibility.ts:28-38`) — consumed by the notification dispatch gate (§4.2).

---

## 3. Tray Subsystem

### 3.1 Core (`tray/system-tray.ts`, 337 lines)

- Platform scope: creates the Windows notification-area icon or macOS menu-bar status item; **no-op on Linux** (`system-tray.ts:225-228`). Idempotent — repeated calls return the existing tray (`:229-231`).
- GC protection: the `Tray` and base image are held at module scope for app lifetime; comment documents Electron Tray icon vanishing without a live reference (`system-tray.ts:27-33`).
- Icon sourcing: macOS loads dedicated template PNGs (`fabrica-menu-barTemplate.png` + `@2x` guaranteed-packaged via explicit representation add) (`system-tray.ts:2-3, 128-158`); Windows resizes the configured app icon to 16px because the notification area expects 16px and larger icons crop/blur (`system-tray.ts:55-57, 243-248`; image builder `app-icon.ts:createAppIconImage` referenced at `:5`).
- Menu: dev instances get a disabled header tying the tray to its worktree/branch label; items Open Fabrica / Settings + Check-for-Updates (macOS only, reusing app-menu labels so entry points never drift) / Quit; every click callback wrapped in `safeMenuAction` because Menu/Tray clicks are plain listeners where an uncaught throw kills the main process (`system-tray.ts:208-219, 254-284`).
- Click gestures: win32 left-click restores the window (conventional minimized-to-tray gesture); macOS opens the menu instead and watches `nativeTheme.updated` for attention repaints (`system-tray.ts:285-295`).
- Multi-instance support: several dev instances (one per worktree) run trays side by side distinguished by tooltip `Fabrica DEV (<branch>)` (`system-tray.ts:46-53, 255-262`).
- macOS visibility pref: `setMacMenuBarIconVisible(false)` destroys the tray entirely; true recreates it (`system-tray.ts:300-309`), driven live by the store setting toggle (`index.ts:2195-2198`).

### 3.2 Attention dot (agent/terminal needs-attention indicator)

- Public API `setTrayAttention(active:boolean)` with a synchronous dedup latch; documented contract: call `true` when a **terminal bell or agent completion** fires while minimized/hidden, `false` when shown again; safe pre-tray or on Linux (`system-tray.ts:311-325`).
- Rendering composites an amber dot (#f59e0b, matching renderer launcher dot/tab-unread bell color) + white halo ring directly into the BGRA bitmap top-right corner — Electron has no image-compositing API (`tray/tray-attention-icon.ts:3-8, 46-82`).
- macOS specifics: attention disables template tinting, so the glyph pixels get literal RGB chosen per menu-bar theme (light glyph under dark colors), with premultiplied-alpha-correct writes; Retina @2x rebuilt separately because toBitmap reads only 1x pixels (`system-tray.ts:66-99`; `tray-attention-icon.ts:24-37`).
- Repaint scheduling: `scheduleTrayImage` collapses bursts into one repaint via `deferAppKitSceneMutation` because `tray.setImage/setToolTip` inside an AppKit callout deadlocks the main thread (NSStatusItem scene update) (`system-tray.ts:111-126`); appearance-change listener repaints while active (`:187-206`).
- Wiring: `notifications:dispatch` lights the dot *before* cooldown/focus/enabled gates so they can't hold it back (`ipc/notifications.ts:397-403`); cleared on main-window `show`/`restore` (`index.ts:1497-1498`); attention state survives the macOS hide/show toggle intentionally (destroy/recreate keeps desired state) (`system-tray.ts:35-42, 335-337`).

### 3.3 Dev badge (`tray/tray-dev-badge.ts`)

- Pixel-font "DEV" stamped into the template left of the glyph so dev instances are distinguishable from the installed app; stamping (vs `tray.setTitle`) keeps the exact production width; badge pixels are template black so both themes tint them and the attention path inherits them; includes a 1px clear margin so antialiased tail pixels don't make DEV read as DEU (`tray-dev-badge.ts:3-11, 20-65`).

### 3.4 Tray creation timing

- Deferred past first paint: Windows `Tray` construction blocks synchronously on Shell_NotifyIcon, so creation waits for `ready-to-show` (+setImmediate) with a 12s fallback timer covering the 10s reveal fallback (`index.ts:660-661, 1356-1380`).
- macOS routes through `syncMacMenuBarIcon` so startup and the live settings toggle share one serve-mode/visibility policy (`index.ts:1363-1368, 1243-1249`); tray options assembled from store settings incl. dev identity (`index.ts:1224-1241`).
- Tray quit path makes a hidden window visible first because a hidden session may veto shutdown with a save/discard prompt, then sets `isQuitting` before `app.quit()` so close tears down instead of re-hiding (`index.ts:1208-1216`).

---

## 4. Native Notifications

### 4.1 Surface inventory

- Main-process notification IPC module: `ipc/notifications.ts` (715 lines) registering (idempotently, with removeHandler-first pattern): `notifications:openSystemSettings`, `getPermissionStatus`, `probeDelivery`, `dismiss`, `dispatch`, `resolveSoundPath`, `loadSound` (`ipc/notifications.ts:310-628`).
- Nine built-in sounds shipped as assets (two-tone, bong, thump, blip, sonar, blop, ding, clack, beep) (`ipc/notifications.ts:5-13, 49-59`); custom sound files validated by absolute path + extension allowlist + 10MB cap (`:41-48, 207-230, 615-624`); `resolveSoundPath` exists so the preload's path-keyed cache can skip the 10MB IPC round-trip on repeat dispatches (`:581-598`).
- Notification sources (from dispatch gating): `agent-task-complete`, `terminal-bell`, `test`, plus plugin-originated mobile events (`runtime/fabrica-runtime.ts:12740`).

### 4.2 Dispatch pipeline gates (in order) (`ipc/notifications.ts:390-579`)

1. **Tray attention first**: for agent-task-complete / terminal-bell when the main window isn't visible — deliberately before all gates (`:397-403`).
2. Master enable switch (`settings.enabled`) → reason `'disabled'` (`:405-408`).
3. Per-source switches (`agentTaskComplete`, `terminalBell`) → `'source-disabled'` (`:410-415`).
4. **Mobile mirror**: paired phone gets the alert even when this desktop is focused ("desktop focus only means this computer sees the worktree"), with its own dedupe map (`:418-432`).
5. Focus suppression: `suppressWhenFocused && isActiveWorktree && window focused` → `'suppressed-focus'` (`:434-443`).
6. Desktop burst dedupe: 5s cooldown keyed by **worktree**, not source, because "agent-finish and terminal-bell often fire in one chunk"; LRU cap 50 keys (`:33-34, 445-452, 275-308`); Settings test button bypasses dedupe as an explicit repeated user action (`:446-447`).
7. Platform support check → `'not-supported'` (`:454-456`).
8. macOS pre-flight: authorization read before showing because macOS silently swallows notifications while denied/undecided (verified macOS 26) → `'blocked-by-system'` (`:570-577`).
- Delivery result includes display confirmation: `requireDisplayConfirmation` awaits `show`/`failed` within 2.5s else `'not-displayed'` (`:232-267, 548-561`).
- GC protection: strong refs in `activeNotifications` Set + by-id registry with release-on-close and a 5-minute unref'd fallback timer (`:62-98, 476-500`); same-notification-id replaces the previous instance (`:468-474`).

### 4.3 Click-to-navigate (notification → workspace)

- When `worktreeId` contains the `"repoId::worktreePath"` separator, clicking focuses/steals the app, restores/shows/focuses the window, sends `ui:activateWorktree {repoId, worktreeId}`, and — for split panes — `ui:focusTerminal` targeting the exact pane leafId with flash + scroll-to-bottom (`:511-546`). This is the deep-link analog: OS notification click as a routable navigation event into a specific agent session pane.

### 4.4 Rich body composition (`ipc/notification-options.ts`)

- Agent labels normalized across 13 agent types (claude, codex, gemini, opencode, cursor, aider, pi, omp, droid, grok, hermes, …) (`notification-options.ts:7-21`).
- Status text mapping: `blocked|waiting → "needs input"`, `done+interrupted → "stopped"`, else "finished" (`:60-65`).
- Body priority: last assistant message (180 chars) > tool usage line (`Using <tool>: <input>`) > tool name > tool input > generic fallback; truncation is UTF-16 surrogate-safe (`:100-125, 151-161`); multi-repo titles compose `repo / worktree` context (`:73-86`). Bell source renders `Bell in <worktree>` / "Attention requested" (`:29-34`).

### 4.5 macOS permission machinery (the deepest part of the subsystem)

- **Bundled helper binary**: `FABRICA-notification-status` lives in Contents/MacOS next to the Electron executable (NSBundle walks up from executable path; macOS 26 aborts UNUserNotificationCenter for executables run from Contents/Resources, #7929). It calls UNUserNotificationCenter.getNotificationSettings and prints JSON; Electron exposes no API for authorization ("scheduling silently succeeds even while macOS is suppressing display") (`ipc/notification-authorization-status.ts:12-43`).
- Helper results map authorized/provisional/ephemeral→authorized; concurrent reads share one in-flight exec (simultaneous agent completions across worktrees each consult it); 4s timeout; failure returns null so callers fall back to weaker evidence (`notification-authorization-status.ts:46-92`).
- Probe fallback (`probeNotificationDelivery`): schedules a silent notification and watches show/failed; only 'failed' is definitive (macOS swallows accepted requests while undecided/toggled-off — verified macOS 26); one probe per session because instantiating the presenter pops the permission dialog; probe banner doubles as user-facing confirmation lingering 4s (`ipc/notifications.ts:100-188`).
- Permission status IPC exposes only what's observable: supported, platform, whether we've prompted (`:325-332`); probe flow prefers the helper (authoritative), triggers exactly one dialog-popping probe when not-determined, caches last outcome session-scoped (`:333-370`).
- Startup registration `triggerStartupNotificationRegistration`: fire-once-per-install welcome notification whose click opens macOS Notification Settings (body reads like an "Allow…" prompt); handles Electron 42 requiring code-signed apps for UNNotification delivery; fallback cleanup timers 8s/10s (`:631-715`); deferred to first window show + onboarding completion (`index.ts:3116-3126`).
- Deep-link to System Settings: macOS `x-apple.systempreferences:com.apple.Notifications-Settings.extension?id=com.autoscalers.fabrica` (dev bundle-id override via env) and Windows `ms-settings:notifications` (`:38-40, 190-201`).

### 4.6 Mobile notification mirror & replay (paired-phone supervision)

- `dispatchMobileNotification` / `dismissMobileNotification` on the runtime service fan out to paired clients with monotonic seq; a reconnecting client replays missed events from a buffer (`runtime/fabrica-runtime.ts:12685-12740`; `runtime/mobile-notification-replay.ts:8-19`); dismissals propagate both ways (`ipc/notifications.ts:372-388`).
- Dock unread badge (macOS): `app:setUnreadDockBadgeCount` IPC caps at "99+" (`dock/unread-badge.ts:5-22`; `ipc/app.ts:304-306`); reset to 0 on quit teardown (`index.ts:3194`).

### 4.7 Related keep-awake surface (supervision adjacency)

- Agent awake service wraps `powerSaveBlocker` plus platform-specific assertions (macOS system sleep assertion, Linux lid-sleep assertion) with reconcile on mode change — keeping the machine awake so background agents finish (`agent-awake-service.ts:62-66, 223-311`); disposed in before-quit (`index.ts:3141-3144`); powerMonitor resume hooks exist for relay rehydration (`index.ts:3105-3107`) and window repaint (`createMainWindow.ts:320-328`).

---

## 5. Application Menu (`menu/register-app-menu.ts`)

- Platform split: mandatory macOS app-menu owns about/services/hide/quit roles; Windows/Linux omit it (would render redundant) and put Settings/Exit under File (`register-app-menu.ts:136-168, 335-342`).
- Paste override routes to FABRICA's paste ownership because focused terminal/native-chat panes aren't native editables, with a macOS first-responder fallback for native panels (`register-app-menu.ts:186-204`).
- Appearance submenu mirrors VS Code's View>Appearance with checkbox rebuild-on-change (Electron menus don't reactively update; `rebuildAppMenu()` re-applies last options) (`register-app-menu.ts:213-270, 347-362`).
- Hidden power-user affordances: modifier-click on Check for Updates selects prerelease/perf/local-build feeds (`register-app-menu.ts:91-109`).
- Non-mac undo/redo registered without accelerator so Ctrl+Z/Y reach the focused terminal (`register-app-menu.ts:170-178`); zoom/reset and reload act on the focused window, delegating to the pop-out when it has focus (`:75-89`; popout branch `dashboard-popout-window.ts:74-81`).

---

## 6. What Matters for Desktop CLI-Agent Management (Background Agent Supervision UX)

1. **The single-instance lock IS the CLI↔desktop contract.** Lock key = userData profile; discovery files (`FABRICA-runtime.json`, `agent-hooks/endpoint.env`) are how CLIs find the running app (`single-instance-lock.ts:22-33`). A multi-agent management product must preserve one-owner-per-profile with a machine-readable "already running" exit code (3) and stale-bootstrap detection.
2. **Headless/desktop duality is first-class.** Serve mode survives window closure, gates desktop promotion on persistent-PTY availability, and refuses second-instance window pops (`window-all-closed-quit-policy.ts:6-8`, `serve-desktop-activation.ts:12-28`, `single-instance-lock.ts:14-20`). This is the substrate for supervising agents without a visible UI.
3. **Attention signaling pipeline is complete and reusable**: agent-state/bell hook events → tray amber dot (pre-gate, cleared on reveal) → OS notification with worktree-keyed dedupe/cooldown → click-through navigation to exact repo/worktree/pane (`notifications.ts:397-403`, `:511-546`, `index.ts:1497-1498`). Any "N agents running, M need input" supervision UI should reuse this chain rather than invent another.
4. **Rich agent-state notification copy already encodes supervision semantics**: needs-input/stopped/finished classification, last assistant message preview, tool-in-progress lines, per-agent-type labels across 13 CLIs (`notification-options.ts:7-21, 60-65, 100-141`) — evidence the app already models "agent blocked waiting on human".
5. **Mobile mirror + replay buffer** extends supervision beyond the desk (`fabrica-runtime.ts:12685-12740`, `mobile-notification-replay.ts:8-19`) — paired-device alerts with seq-based catch-up.
6. **Quit safety engineering is extensive and load-bearing**: renderer-owned close confirmation with hung-vs-gone discrimination (#5787), 10s force-destroy ack, preventDefault-first teardown with deadline-bounded allSettled barrier, stats-before-PTY-kill ordering for synthetic agent_stop events (`createMainWindow.ts:963-1057`, `window-close-decision.ts:12-34`, `index.ts:3150-3270`). Killing the manager must never orphan agents or lose their final state — these mechanisms encode hard-won rules to carry forward verbatim.
7. **Gaps / net-new surface**: no global shortcuts (nothing fires when unfocused — relevant if hotkey-to-summon-agent-dashboard is wanted), no deep links/protocol handlers (click-through currently only via notification payloads and second-instance argv), no Linux tray despite Linux being supported for windows (`system-tray.ts:226-228`), and no login-item/launch-on-startup integration anywhere in main (`setLoginItemSettings` grep: zero hits) — all obvious extensions for an always-on agent-supervision appliance.
8. **Multi-instance dev ergonomics** (per-worktree trays with branch tooltips and DEV badges, separate lock namespaces) demonstrate the pattern needed when users supervise agents across many parallel sessions/worktrees (`system-tray.ts:46-53, 160-165`, `single-instance-lock.ts:35-38`).

---

## 7. Scan-Coverage Statement

**Read in full (line-by-line):**
- `src/main/startup/single-instance-lock.ts` (82/82 lines)
- `src/main/window/focus-existing-window.ts` (148/148)
- `src/main/window/createMainWindow.ts` (1167/1167)
- `src/main/window/main-window-visibility.ts` (38/38)
- `src/main/window/window-close-decision.ts` (34/34)
- `src/main/window/macos-app-activation.ts` (14/14)
- `src/main/window/dashboard-popout-window.ts` (302/302)
- `src/main/tray/system-tray.ts` (337/337)
- `src/main/tray/tray-attention-icon.ts` (82/82)
- `src/main/tray/tray-dev-badge.ts` (66/66)
- `src/main/ipc/notifications.ts` (715/715)
- `src/main/ipc/notification-options.ts` (161/161)
- `src/main/ipc/notification-authorization-status.ts` (92/92)
- `src/main/menu/register-app-menu.ts` (362/362)
- `src/main/dock/unread-badge.ts` (22/22)
- `src/main/startup/window-all-closed-quit-policy.ts` (10/10)
- `src/main/startup/serve-desktop-activation.ts` (74/74)

**Read in targeted sections (grep-guided ranges):**
- `src/main/index.ts` — lines 640-839 (lock acquisition, data init), 1180-1668 (tray wiring, openMainWindow, activation handlers, recovery prompt, GPU fallback), 2090-2209 (whenReady start, settings hooks), 3095-3285 (relay resume, startup notification trigger, before-quit/will-quit/window-all-closed). Total ≈ 1,000 of 3,285 lines; remaining index.ts content (IPC handler registration bodies, agent-hook payload internals, spinner/title logic) belongs to sibling reports R4-1.1/R4-1.7.

**Verified absent via repo-wide grep (non-test files in src/main):** `globalShortcut` (zero main-process hits), `setAsDefaultProtocolClient`/`open-url`/custom-scheme registration (zero), `setLoginItemSettings`/`openAtLogin` (zero).

**Skipped (adjacent, owned by other tasks or out of scope):** `window/clipboard-*` and `attach-main-window-services.ts` (IPC/service wiring — R4-1.1 territory), `editable-context-menu.ts` internals, `app-icon.ts` full body (only its tray-facing export read), `agent-awake-service.ts` full body (skimmed exports/powerSaveBlocker lines only), `star-nag/`, `runtime/mobile-*` full bodies (skimmed class/exports), `menu/gpu-acceleration-about-panel.ts` body, all `*.test.ts` files (used only as corroboration signals, never as claim sources).
