> **PATH MIGRATION NOTICE (2026-08-21):** This project moved from the environment root into `Fabrica-atlas/`. All `_sources/...` paths in this document now resolve to `Fabrica-atlas/_sources/...`. `Fabrica-app/` remains at the environment root.
# Discovery — Fabrica-app (`Fabrica-app/`)

> Task 1.3 — Group 1 (Discovery & Analysis), Roadmap 02, Round 1.
> Scan-only. No source files modified.
> Source: `Fabrica-app/` — 15,563 files excl. node_modules/.git (incl. ~2,347 build output in out/): src 10,903 (main 3,414 · renderer 5,847 · shared 1,222 · cli 165 · relay 232 · preload 21) · mobile 1,220 · tests 473 · config 342.
> Identity: Electron desktop app "Fabrica" v1.4.178-rc.2 — "Next-gen IDE for parallel agentic development", forked from Orca; App ID ai.autoscalers.fabrica; deep link fabrica://; MIT.

---

## 1. What Fabrica-app Is

An Electron IDE that **orchestrates AI coding agents (Claude Code, Codex, OpenCode, Pi, and ~15 more) running side-by-side in isolated git worktrees**, with Ghostty-class terminals, SSH remote workspaces, an embedded browser with Design Mode, iOS/Android emulator control, GitHub/GitLab/Jira/Linear/Azure DevOps/Bitbucket/Gitea integrations, a plugin system with marketplace, orchestration primitives (runs/tasks/workers), a full CLI (`fabrica`), and an E2EE mobile companion app (Expo/React Native) connected via a relay.

Key product features (README): Mobile Companion · Parallel Worktrees (fan one prompt across N agents) · Terminal Splits (WebGL xterm, scrollback surviving restarts) · Design Mode (click UI elements → HTML/CSS/screenshot into agent prompt) · GitHub & Linear native · SSH Worktrees · AI diff annotation.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 43 (Chromium 138+), electron-vite (rolldown-vite) |
| UI | React 19, Zustand (single composed store, ~45 slices), Tailwind 4, shadcn/radix, TipTap, Monaco, xterm.js (+headless/serialize for persistence), sonner |
| Language | TypeScript (TS 7), oxlint/oxfmt, knip dead-code audit |
| Agents | TUI CLIs spawned in PTYs (node-pty patched); status hooks installed into each agent's config |
| Remote | ssh2 + system ssh; FABRICA Relay daemon over SSH stdio; WSL bridges |
| Mobile link | WebSocket RPC + tweetnacl E2EE (Curve25519/XSalsa20-Poly1305), pairing offers via QR |
| Storage | JSON files in userData, SQLite (Node DatabaseSync wrapper), keychain/keyring secrets |
| Telemetry | PostHog (compile-time-gated write keys), opt-in; crash reporting w/ breadcrumbs |
| Speech | sherpa-onnx offline STT workers; optional OpenAI transcription |
| Testing | Vitest 4 (unit/integration), Playwright Electron E2E (headless/headful projects), perf benchmarks w/ artifact comparison |
| Packaging | electron-builder (mac/win/linux), Homebrew casks, electron-updater, NSIS |

---

## 3. Repository Structure

```
Fabrica-app/
├── src/
│   ├── main/        # Electron main process (~80 domain folders, §4)
│   ├── renderer/    # React UI (~5,800 files, §5)
│   ├── shared/      # Cross-boundary types/contracts (~1,222 files, §6)
│   ├── relay/       # Remote-host relay daemon (232 files, §7)
│   ├── cli/         # fabrica CLI (165 files, §8)
│   └── preload/     # Audited IPC bridge (21 files, §9)
├── mobile/          # Expo/RN companion app (§10)
├── tests/           # e2e (305 Playwright specs) + tools/benchmarks (§11)
├── skills/ + skill-guides/ + skill-stubs/   # 8 bundled skills (§12)
├── config/          # Build/lint/test infra + ~50 operational scripts
├── native/          # Platform helpers: computer-use-macos (Swift), -linux, -windows,
│                    #   notification-status-macos, windows-cli-launcher
├── resources/       # Icons, tray assets, sounds, bundled plugins/skills, integration logos
├── Casks/           # fabrica.rb + fabrica@rc.rb Homebrew casks
├── docs/            # STYLEGUIDE, ai-vault isolation plan, mobile relay UX findings, assets
├── .github/workflows/  # 28 workflows (PR, e2e, releases, platform builds, mobile CI)
└── package.json / electron.vite.config.ts / fabrica.yaml / tsconfig / pnpm-workspace
```

package.json: bins `fabrica` → out/cli/index.js; scripts dev/build/build:{desktop,mac,win,linux,cli}/test:e2e:*/bench:*/audit:* (oxlint type-aware, react-doctor, knip)/localization verify-sync/verify:skill-bundle-manifest. Key deps: ws, tweetnacl, zod, yaml, ssh2, node-pty (patched), @parcel/watcher, electron-updater, i18next, posthog-node, @supabase/supabase-js, @linear/sdk, sherpa-onnx, qrcode, serve-sim, agent-browser, @stablyai/playwright-test (residual branding). Compile-time constants gated to official CI builds only: FABRICA_BUILD_IDENTITY ('stable'|'rc'), FABRICA_POSTHOG_WRITE_KEY, FABRICA_DIAGNOSTICS_TOKEN_URL — everything else folds to null so telemetry can't be spoofed via env.

fabrica.yaml: repo-level automation hook file (scripts.setup recipe executed by Fabrica's workspace setup policy).

---

## 4. Main Process (`src/main/`, ~80 domain folders)

### Entry & startup (index.ts ~2,000+ lines + startup/)
Deliberately monolithic entry owning app lifecycle/service wiring/window creation/hook-daemon startup. Order: pre-lock CLI redirects (packaged/AppImage, --serve headless mode w/ stdout readiness signaling) → process config (error guards, FABRICA_APP_VERSION, PATH hydration from login shells, GPU fallback switches, virtual display headless Linux) → single-instance lock (dev bypass) → data init (persistence, session parse cache, profile paths, usage stores, crash report store) → singleton services (Store, StatsCollector, usage stores, CodexAccountService/CodexRuntimeHomeService, ClaudeAccountService/ClaudeRuntimeAuthService, FABRICARuntimeService, RateLimitService, RuntimeRpcServer, DesktopRelayService, AutomationService, PluginService + marketplace/kill-list/bootstrap, KeybindingService, StarNagService, AgentAwakeService, browser manager, emulator bridge) → first-window services (daemon PTY provider init, agent-hook loopback server, WSL CLI reconciliation barrier) → window/tray/menu/updater/i18n. GPU crash fallback auto-restarts without GPU; quit teardown deadline gate; webContents-scoped reload flags prevent orphan-PTY sweeps killing live sessions.

### runtime/ (~256 files) — THE CORE SERVICE
- `fabrica-runtime.ts` = **37,549 lines** — the mutable "live graph": worktrees, PTY handles, waiters, mobile layout state, agent status aggregation, terminal side-effect facts, worktree create/remove orchestration, clone targets, agent-session authority (ensureAgentSession/createAgentSession with signed ephemeral claims).
- `runtime/orchestration/` — multi-agent orchestration engine: runs, tasks, workers, dispatch preambles, worker transcripts/output archives/cursors, federation sync/control messages, coordinator authority, lifecycle reconciliation, legacy storage migration. Backs the orchestration CLI commands (run-create/task-create/worker-start).
- `runtime/rpc/` — RPC layer serving CLI + static web client + mobile: transports (Unix socket, WebSocket, relay), E2EE crypto for mobile v2 (key schedule, admission, memory budgets), terminal multiplexing/streaming, ~120 method modules under rpc/methods/ (worktree, git, github/gitlab/jira/linear, orchestration-workers, browser, emulator, computer, speech, plugins, ai-vault, native-chat, session-tabs, pairing…). runtime-rpc.ts documented as "the single security boundary for the bundled CLI."
- `runtime/relay/` — phone↔desktop relay broker: auth context/coordinator, control protocol/client, demand ledger, origin pool, revoke outbox, host proof, Supabase session, drain retry schedule.
- Also: claude-agent-teams-* (agent teams w/ tmux dispatcher), mobile pairing QR/E2EE, file watcher host, terminal orphan topology, remote-server updater, TLS certificates, Windows firewall guidance.

### ipc/ (~257 files) — Renderer IPC boundary
All ipcMain.handle registrations, aggregated once by register-core-handlers.ts (~50 handler groups). Channel convention `namespace:action`; top namespaces: gh: (28), plugins: (18), ssh: (17), app: (15), jira: (14), mobile: (10), pty: (10). Clusters: PTY management (centralized spawn env scoping, provider registry local/SSH/daemon), filesystem (parcel-watcher child-process supervisor family ~30 files w/ crash fuse/quarantine; runtime-watcher pools), worktrees (creation w/ base prefetch + APFS clone + include-file budget; removal safety/authority/fencing; git-common-dir polling), SSH PTY output pipeline (~40 files source-range/obligation-ledger/admission model guaranteeing exactly-once delivery across reattaches), workspace cleanup, preflight checks (WSL, remote Windows), ai-vault, notifications, telemetry opt-out.

### daemon/ (~110 files) — Persistent Terminal Daemon
Separate forked process owning ALL PTYs so terminals survive app restarts. NDJSON socket server w/ token auth, pid/nonce files, endpoint ownership publication. On daemon failure the app degrades gracefully to local non-persistent PTYs (logged + telemetrized). Terminal history/scrollback persistence: checkpoint serializer, cold restore, seed transfer protocol, corrupt-history quarantine, ANSI buffer snapshots, mode/mouse-state rehydration. Platform care: Windows ConPTY warmup, macOS login-session death watch, WSL cold-restore CWD, OSC-7 CWD/title scanning.

### providers/ — Execution Provider Contracts
Three interfaces: pty-provider-contract, filesystem-provider-contract, git-provider-contract. Implementations: Local (shell-ready detection, foreground-process inspection macOS/Windows ConPTY membership) and SSH (ssh2 SFTP, session reattach, spawn env, delivery ledgers). Every workspace op is host-agnostic above this layer; execution-host resolution picks provider per worktree.

### Agent integrations (each = hook-service install + accounts + usage)
- **codex/** (~68 files) + codex-accounts + codex-cli + codex-usage: largest integration. Managed vs system CODEX_HOME routing, per-pane account registry, TOML-editing hook service installing status hooks into config.toml w/ trust grants (ledger/host grant/telemetry/rollback), app-server client + capability cache, session backfill/heal jobs, multi-account lifecycle (login via spawned CLI, per-account self-contained CODEX_HOMEs), binary location + home process lock, token usage scanner/store per worktree.
- **claude/** + claude-accounts + claude-usage: status hooks into Claude settings + statusline script; managed account service ("one audited owner for login, credential capture, Keychain storage, selection, rate-limit refresh"), OAuth refresh, duplicate detection, live-pty-gate pinning live Claude PTYs across restarts, per-turn billing records.
- **One-line integrations** (hook-service install each): opencode, pi (extension sources injected at runtime), gemini, grok (+accounts), kimi (TOML hooks), minimax (session-cookie store), mimo, cursor, copilot, devin (JSON hook-config), droid, hermes, antigravity (+ai-vault parsers), amp, openclaude.
- **rate-limits/** (~33 files): central RateLimitService polling per-provider limits → renderer push. Fetchers: Claude (OAuth usage + hidden-PTY fallback parser), Codex, Gemini (CLI OAuth extraction), Grok, Kimi, MiniMax, OpenCode Go (page scraper). Timezone wall-clock windows, stale-data handling.

### plugins/ (~67 files) — Plugin Platform
Discovery, manifest parsing, consent/enablement gating, event bus w/ delivery, out-of-process host (worker manager/slot pool/restart-loop detection), panel controllers (plugin-owned UI panels), command registry/invocation, secrets store, storage store, language packs, dev watcher, audit log, VM recipes. Marketplace: fetch/projection/installer/staging w/ provenance + content integrity hashes; trust model enforces official autoscalers.fabrica-* identities for bundled/reserved plugins (identity + org checks + kill list, no cryptographic signing); plugin-kill-list-service remotely disables misbehaving plugins.

### git/ (~38 files) — Git Engine
runner.ts (spawn/exec, non-interactive env, WSL distro override), status.ts w/ read leases + cache invalidation, worktree create/remove invariants, branch rename, fork sync, fetch-error classification, gh rate-limit circuit breaker, remote URL probing/caches, clone-path claiming, porcelain v1 parsing, huge-folder ignores, WSL-linked-worktree routing.

### browser/ (~42 files) — Embedded & Agent Browser
(1) Embedded browser pane on Electron webContents guests — browser-manager.ts "single privileged facade for guest registration, authorization, lifecycle cleanup"; certificate trust controller, cookie import policy, permission policies, WebAuthn access, media access, anti-detection/UA modes, popup origin bar. (2) Agent browser control — headless Chromium via bundled CDP WS proxy: screenshots, print-to-PDF, text insertion, full-page grabs; offscreen backend for headless serve + screencast streaming to mobile.

### emulator/ (~46 files) — iOS/Android Emulator Control
Backend abstraction (ios|android; MJPEG vs H.264 codecs). iOS: simctl inventory, serve-sim detached sessions, accessibility-tree normalization, MJPEG streams. Android: SDK/AVD discovery, adb runner, scrcpy deploy/download + H.264 streams, uiautomator dumps, input/gesture mapping, logcat, permissions. Serves screencasts + gestures to panes and mobile clients.

### github/ (~32 files) — gh CLI wrapper client
PRs (stacks, async merge, head-tracking refs, refresh coordination w/ backoff), issues, review comment lines, conflict summaries, reactions, Enterprise support, repo identity/SSH host-alias resolution, rate-limit accounting. Backs star-nag.

### computer/ (~27 files) — Computer Use
Desktop automation providers for agents: macOS native provider (socket transport, TCC permission status; methods listApps/listWindows/getAppState/click/scroll/drag/typeText/pressKey/hotkey/pasteText/setValue) + desktop-script provider w/ accessibility snapshot caching; action/paste validation layers; sidecar process selection. Native helpers in native/computer-use-{macos,linux,windows}.

### ssh/ (~115 top-level files) — Remote Workspaces
Config parsing (includes, pickers, path expansion), connection manager/store/generations, reconnect ladder + error classification, control sockets, proxy commands, security-key identities, VS Code remote authority compat. Channel multiplexer w/ lane scheduling, port forwards. **Relay-on-remote-hosts**: versioned install/deploy pipeline (install locks, markers, GC tombstones, upload staging incl. Windows variants, version-mismatch repair, native deps toolchain). Remote CLIs: node resolution guidance, orchestration send/check/post, remote Linear read/write CLI, PowerShell support, platform detection.

### ai-vault/ (~102 files) — Agent Session History Vault
Cross-agent session index/resume vault. Parsers for Codex, Claude (+subagents), Grok, Kimi, Gemini, Copilot, Cursor, Devin, Droid, Hermes, OpenCode (SQLite via spawned worker), Antigravity, OMP — incremental parse caches, background scanner service processes, title resolution, first-user-prompt capture, deletion, resume preparation. Backs the AI Vault UI of all historical agent sessions.

### agent-hooks/ (~42 files) — Agent Status Hooks Plane
Loopback HTTP server receiving status pings from hooks installed into each agent CLI; persists last-status per pane (TTL, atomic writes); feeds sidebar/tabs status, crash breadcrumbs, automations (first-work branch auto-rename, folder rename). Managed-hook installer machinery (locks, owner identity, script refresh, remote installers) + WSL hook relay (guest install/link/reattach/recovery).

### native-chat/ (~24 files) — Native Chat Transcripts
Reads/watches raw agent transcript files (Claude/Codex/Grok/OMP line decoders) for native chat views: incremental readers, tail reads, turn lifecycle/markers, watch engine/scheduler, WSL path translation gates.

### fabrica-profiles/ (~30 files) — Profiles & Cloud Auth
Local profile index (multiple isolated profiles w/ own userData paths), cloud auth: PKCE OAuth flow, session exchange/refresh/mutation, org membership/selection, capability refresh, dev-mode auth service, project session state transfer between machines, worktree identity across profiles.

### Other main subsystems
window/ (main window, dashboard popout, bounds validation, clipboard IPC family incl. remote file copy, publication throttling) · linear/ (SDK client, keychain tokens, issue context fanout, relations, MCP issue list) · skills/ (SKILL.md discovery across repos/plugins incl. WSL, freshness inventory/update convergence, install topology) · speech/ (offline STT worker threads, model catalog/download, warm worker reuse; optional OpenAI API) · source-control/ (forge-provider abstraction: hosted-review creation w/ backoff/pacing, branch caches, PR templates, linked issues) · ports/ (workspace port scanning local+SSH, ownership attribution, advertised-URL watchers) · automations/ (scheduled/triggered dispatch of agent tasks, headless dispatch w/ output snapshot buffers) · telemetry/ (opt-in consent, cohort classifiers, burst caps) · crash-reporting/ (store, breadcrumbs coalesced+durable, GPU-crash fallback decisions, renderer-recovery circuit breaker) · observability/ (diagnostic bundles w/ redaction, tracer, upload endpoint) · startup/ (23 testable boot units) · hang-watchdog/ (worker-thread heartbeat watchdog) · star-nag/ (GitHub star prompts gated by stats) · memory/ (app metrics bucketing, per-worktree PTY attribution) · project-groups/ (nested-repo discovery/import) · usage/ (provider-agnostic usage record contract, plugin-contributable) · stats/ (local collector, PRs created, 10k event cap) · text-generation/ (commit-message generation via Codex/Claude, PR context building) · local-builds/ (compat checks, build switching, local update feed HTTP server) · sqlite/ (typed DatabaseSync wrapper) · attribution/ (git/gh wrapper scripts injecting commit trailers) · artifacts/ (cloud publish/list/share w/ hashing + sharing gates) · command-code/ (managed hook scripts shared across agents) · diagnostics/ (main-thread churn probe) · cli/ (installing `fabrica` shell command cross-platform, WSL reconciliation) · server/ (headless `fabrica serve` readiness publishing) · pty/ (spawn-env shaping: shell wrappers, sqlite overlay mirroring, POSIX process groups, Windows PATH registry, color env, powerlevel10k wizard env) · WSL suite (~15 files) · updater suite (~20 files: prerelease feeds, mac install, Linux package recovery, exit watchdogs) · worktree root modules (base prefetch, lineage pruning, removal safety, trash sweep) · ephemeral VM recipes (suspend/resume/cleanup over SSH) · synthetic title spinner (fake activity titles while agents work) · ghostty/ + warp-themes/ (theme importers).

### Forge integrations
jira/ (REST client, ADF→markdown, attachment caching) · azure-devops/ (PR/status mapping, PR creation) · bitbucket/ (PR mapping, build status) · gitlab/ (glab-based MR/issue/work-item client, known-host probes) · gitea/ (PR mapping/creation, commit-status).

---

## 5. Renderer (`src/renderer/src/`, ~5,800 files)

Stack: React 19 + Zustand single composed store (~45 slices) + Tailwind-style utilities + shadcn/radix + xterm.js + Monaco + sonner. App.tsx ~2,000+ line shell. Store exposed on window.__store in dev/E2E.

### Layout structure
Custom window chrome (Windows/Linux) vs native (macOS) · Left sidebar (repos → project groups → worktrees/"workspaces" tree w/ filters: sleeping, default-branch, automation-generated, CLI-created, detached-head; sort/group) · Main view switcher (activeView: landing | terminal workbench | task page | automations | activity | settings | skills | artifacts | workspace-space | mobile — lazy-loaded) · Terminal workbench = tab bar (terminals/browser panes/editor files/AI-vault sessions) over split-pane grid (lib/pane-manager/, 137 files: dividers, focus-follows-mouse, fit sync, mobile driver) · Right sidebar inspector (files/search/source-control/checks) · Status bar (usage bars, ports popover, caffeinate, pet, daemon sessions) · Floating terminal/workspace overlay · Worktree nav history back/forward · Lazy-warm modals · Popout windows (dashboard-popout agent board/map canvas).

### Feature directories (components/)
sidebar (558) · right-sidebar (462) · terminal-pane (530 — core surface: xterm panes, agent completion coordination, detached-pane restart, shutdown buffer captures, OSC52 clipboard) · editor (454 — Monaco, changes mode, check-run details) · settings (534 — ~40 panes: General/Appearance/Terminal/Git/Accounts/Integrations/Agents/Shortcuts/Voice/Mobile/Browser Use/Computer Use/Orchestration/Ephemeral VMs/Runtime Environments/SSH/Privacy/Notifications/Quick Commands/Experimental…) · native-chat (173 — transcript rendering, composer, attachments, model switching) · browser-pane (109) · feature-wall (76 — upsell cards) · tab-bar (116) + tab-group (30 dnd) · dashboard (49) + dashboard-popout (92) · automations (81) · github (40) + github-project (29 board table) · onboarding (39) · emulator-pane (54) · mobile (36 pairing page) · stats (27 usage charts per provider) · contextual-tours (23) · pet (22 experimental desktop pet driven by agent state) · skills (22) · cmd-j (32 — main command palette w/ fuzzy match, host badges, live status) · dictation (15) · workspace-cleanup (34) · artifacts (19) · activity (18 timeline) · floating-terminal (24) · terminal-quick-commands (14) · setup-guide (11) · crash-report (7) · agent-session-continuation (continue/fork dialog) · diff-comments (inline comment cards) · new-workspace (composer parts) · worktree-creation · repo · sparse · plugin-catalog · fabrica-profiles · ui/ (35 shadcn primitives) · misc small (star-nag, ports, network, icons, notifications, shared, workspace-emoji, workspace-space).

### State (Zustand ~45 slices)
repos/project-groups/folder-workspace · worktrees/worktree-nav-history/worktree-catalog-* · terminals/tabs/tab-group-state/recently-closed-tabs/pinned-tab-close-confirm · ui (sidebars, modals, activeView, zoom) · settings/keybindings · github/hosted-review/linear/jira/pull-request-generation/commit-message-generation · editor/diffComments · agent-status/detected-agents/runtime-detected-agents/pane-foreground-agent · ssh/runtime-environment-ssh/runtime-status/remote-server-updates · browser/dictation/memory/stats/rate-limits · claude/codex/opencode usage · fabrica-profiles/preflight/sparse-presets/workspace-space/workspace-cleanup/task-creation-drafts/new-issue-draft/terminal-quick-command-hosts. Plus plugin-panels store. Cross-window/mobile sync via runtime/sync-runtime-graph.ts.

### Theming/i18n/shortcuts/palettes
Light/dark + rich terminal theme system (classic/popular variants applied to xterm) · custom lightweight i18n (translate() hashed keys; locales en/es/ja/ko/zh + pseudo-localization testing) · keybindings slice w/ editable shortcuts, platform-aware modifiers, modifier double-tap detection · palettes: Cmd-J (commands/worktrees/actions), QuickOpen (ripgrep file search), WorktreeJumpPalette, plus contextual palettes (browser page, simulator, workspace-tab search).

---

## 6. Shared Contracts (`src/shared/`, ~1,222 files)
~1,130 flat contract/type modules + plugins/ (manifest, marketplace, consent, capabilities, panel bridge/shell, host API/protocol, kill-list, path safety), agent-icons/ (30), new-workspace/ (13), network/ (pairing-url, manual-address, server-share-address). Key: types.ts (aggregate), runtime-types.ts, pairing.ts (QR pairing offers), mobile-pairing-*/mobile-relay-pairing-offer, runtime-bootstrap (transport discovery), runtime-rpc-envelope, orchestration-rpc-contract, ssh-types, protocol-version (contract version/capability gates), bounded-secure-json-file. Pattern: every cross-boundary interaction gets its own <feature>-types/-contract module; retained-payload admission validators sanitize payloads crossing authority boundaries.

## 7. Relay (`src/relay/`, 232 files) — Remote-Host Daemon
"FABRICA Relay — lightweight daemon deployed to remote hosts over SCP, launched via SSH exec channel." Lets desktop drive remote workspaces (PTY/filesystem/git/agent exec/plugins). Transport: stdin/stdout of SSH exec channel, framed binary protocol (13-byte header: type/id/ack/length; Regular=1, Handshake=2, KeepAlive=9; size caps) carrying JSON-RPC 2.0; sentinel "FABRICA-RELAY v0.1.0 READY". Grace period on disconnect keeping PTYs alive on Unix domain socket relay.sock; reconnect via --connect bridging w/ version handshake refusal on mismatch; tunable graces (FABRICA_RELAY_IDLE_GRACE_MS default 15 min). Handlers: PtyHandler, FsHandler (ripgrep install/fallbacks, streaming), GitHandler (status/staging/worktree ops/submodules/diffs/push-target), PreflightHandler, PortScanHandler, AgentExecHandler, WorkspaceSessionHandler, ExternalAutomationsHandler, AiVaultHandler (+spawned service), RelayAgentHookServer, PluginOverlayManager, managed hook installer, plugin host-call handlers. Flow control: credit-based PTY backpressure (credit-ledger/scheduler/settlement), fs stream ack windows (4 chunks), bulk-lane git response streaming (>256 KB chunked), watcher process pool, dispatcher writer lanes/admission/backpressure. WSL bridges: agent-hook-relay, hook-fs-bridge, install-plugins-handler. (Encryption comes from the SSH channel itself; mobile E2EE is separate.)

## 8. CLI (`src/cli/`, ~165 files) — `fabrica`
Entry index.ts (#/usr/bin/env node), args/dispatch/flags/help/format + per-domain formatters. handlers/ one module per domain: core (open/serve/status/claude-teams), account, artifacts, automations, browser-basic (click/fill/type/goto/snapshot/screenshot/wait/eval…), browser-advanced (tabs/profiles/cookies/storage/intercept/capture/console/network/viewport/geolocation/pdf/full-screenshot/drag/upload…), computer (capabilities/list-apps/list-windows/get-app-state/click/scroll/drag/type-text/press-key/hotkey/paste-text/set-value…), repo, worktree (list/show/current/create/set/rm/ps), terminal (list/show/read/send/wait/stop/create/switch/close/rename/split), diagnostics/memory, emulator (iOS+Android: list/devices/attach/tap/type/gesture/button/rotate/exec/install/launch/permissions/ax/logcat), environment (add/list/show/rm), file (open/diff/open-changed), agent-context, agent-hooks (on/off/status), linear (issue/search/team/project/relation/comment/attach/create/status/assignee/priority/estimate/due-date/label mutations), orchestration (runs/tasks/workers start-read-stop-release/dispatch/ask/gate/check/send/inbox/coordinator-start…), skills (list/get/install/update), vm recipe doctor. Connection: RuntimeClient reads runtime metadata from userData → Unix socket/named pipe JSON-RPC locally; remote via pairing-code WebSocket (FABRICA_PAIRING_CODE/FABRICA_ENVIRONMENT); spawns the Electron app if not running. Global --json flag everywhere; human formatters per domain.

## 9. Preload (`src/preload/`, 21 files)
Audited renderer↔Electron IPC contract exposed via contextBridge (electron + api globals). ~1,200 invoke call sites across namespaced channels: app:, FABRICAProfiles:, wsl:, pwsh:, gitBash:, plugins:, repos:, plus terminal/git/worktree/notification/SSH/runtime/skills/updater. Extras: e2e-config injection, glApi (GitLab), subscription helpers, restart wiring, heap stats, usage provider API, SSH authority forwarding.

## 10. Mobile Companion (`mobile/`, ~1,220 files)
Expo / React Native 0.83 (SDK 55, expo-router), React 19, zustand, TypeScript; vitest + oxlint; local package packages/expo-two-way-audio (custom native audio); Fastlane builds; custom WebView engines built at postinstall (terminal webview, mermaid webview).
Screens (expo-router app/): index, pair/pair-scan/pair-confirm (QR pairing), settings, notifications, voice-settings, terminal-settings, connection-log, troubleshoot, onboarding; per-host h/[hostId]/…: tasks, accounts, edit, session/[worktreeId] (terminal), source-control, files (+preview), pr, review, history, agent-history/[worktreeId].
src/ (~24 domains): transport/ largest (~130 files) — WebSocket RPC client stack (terminal binary frames, subscriptions, reconnect), mobile-relay-* family (physical client, RPC session/stream, credential bundle/hash/rotation, direct-upgrade controller + journal, resume director, reconnect controller, invite director, pairing journal/recovery, endpoint supervisor w/ hysteresis), e2ee.ts + mobile-e2ee-v2-* (client session, key schedule, physical channel, legacy fixtures), host-store, pairing-keychain, browser-screencast-protocol, terminal-stream-protocol. Other domains: terminal (xterm in WebView/WebGL), session, tasks, worktree, source-control, files, browser, agent-history, notifications, dictation, onboarding, accounts, theme, navigation, layout, storage, stats, diagnostics, cache, platform.
E2EE: tweetnacl Curve25519 ECDH + XSalsa20-Poly1305; JSON-RPC over WS as base64([24-byte nonce][ciphertext]); terminal frames raw bytes; PRNG bridged to expo-crypto (Hermes lacks getRandomValues). Connects to desktop's mobile WebSocket RPC server (port 6768) directly on LAN or through relay; supports credential rotation, lease rotation, direct↔relay upgrade/downgrade, revival, protocol-compat probing.
Features: live worktree monitoring, interactive terminal, file browsing/preview, source control & PR review, task board, agent history, browser screencast, voice/dictation, push notifications, two-way audio, mermaid rendering.

## 11. Tests (`tests/`, 473 files)
tests/e2e/ (305 Playwright specs + helpers; projects electron-headless/electron-headful) + tests/tools/ (benchmarks, repro scripts). Vitest 4 unit/integration (config/vitest.config.ts: node env, happy-dom, --expose-gc, src/**/*.test.tsx co-located, 30s timeouts, Windows max 4 workers). Coverage: agent session lifecycle/resume, menus, automations, embedded browser (guest crash recovery, certificates), AI vault, source control scale, SSH/Docker remote sessions, terminal rendering goldens, typing latency/perf budgets, IME, Windows update/crash-survival e2e, restart restore. Benchmarks: startup time, daemon coldstart, idle CPU, main-thread jank, hang-watchdog memory, WSL hook relay, worktree churn, Zustand selector fan-out, multi-workspace typing — with artifact comparison (bench:compare).

## 12. Skills (8 bundled)
orchestration (multi-agent coordination: threaded messages, ask/reply, task dispatch, worker_done waits, DAGs, decision gates) · fabrica-cli (worktrees, terminals, repos, automations, artifacts, embedded browser) · computer-use (desktop windows via accessibility trees/screenshots/safe actions) · fabrica-emulator (iOS simulator stream control) · fabrica-emulator-android (AVD/device control) · fabrica-linear / linear-tickets (Linear CLI workflows) · fabrica-per-workspace-env (per-workspace environment recipes: disposable cloud/VM/local runtimes). Each ships as skills/<n>/SKILL.md + skill-guides/*.md (generated guides, verified by verify:bundled-skill-guides) + skill-stubs/*.md.

---

## 13. Cross-Cutting Patterns

1. **Dual IPC surfaces**: Electron ipcMain.handle channels (`namespace:action`) for the renderer + versioned RPC layer (Unix socket/WebSocket/relay transports) for CLI/web/mobile — same domain decomposition, different transports; runtime-rpc.ts is the declared security boundary for the CLI.
2. **Provider abstraction**: PTY/filesystem/git contracts with Local/SSH/Daemon implementations — execution host is invisible above the layer.
3. **Agents are PTY processes, not API calls**: spawn = resolve account/runtime home → install status hooks → scoped env → spawn via provider → bind pane↔PTY↔worktree; signed ephemeral claims for session identity; liveness sweeps reap dead subagents.
4. **Hooks as the observability plane**: uniform hook-install service per agent reports status to a loopback server → sidebar status, automations, breadcrumbs, synthetic titles.
5. **Worktrees as the unit of work**: managed root, creation pipelines (prefetch/APFS clone/include-files), safety-fenced removal into trash sweep, lineage pruning, emoji/creature naming w/ first-work auto-rename.
6. **Daemon durability**: forked PTY-owning daemon survives restarts; graceful degradation to local PTYs; scrollback checkpoint/quarantine.
7. **Everything has a contract module**: shared/<domain>-types.ts + admission validators at authority boundaries; protocol-version capability gating.
8. **Defensive engineering**: "Why:" comments citing issue numbers, graceful degradation everywhere (GPU fallback, watcher fallback, daemon→local), atomic durable writes w/ rollback, worker threads/sidecars for isolation (STT, parsers, scanners, watchers, watchdog, computer-use).
9. **Compile-time telemetry gating**: PostHog keys fold to null outside official CI builds.
10. **Rebrand status**: mostly complete (FABRICA_* env vars, channels, sentinels); residuals: mobile/README.md "Orca Mobile", @stablyai/playwright-test dep, some opencode references.

---

## 14. Concepts Worth Carrying Into Fabrica's Transformation

Directly relevant to "desktop CLI agent management and operations platform":
1. **Worktrees-as-workspaces** — parallel isolated agent execution with compare-and-merge UX.
2. **Multi-agent orchestration engine** (runs/tasks/workers/dispatch preambles/gates/coordinator authority) already inside the app's runtime.
3. **Agent-agnostic integration pattern**: hook-service + account service + usage scanner + rate-limit fetcher per provider — adding a new agent is a repeatable recipe.
4. **AI Vault**: unified cross-agent session history with resume — agent-agnostic memory surface.
5. **Execution provider abstraction** (local/SSH/daemon) — same operations anywhere.
6. **Persistent terminal daemon** w/ scrollback survival — operational continuity.
7. **Plugin platform**: out-of-process hosts, consent gating, marketplace w/ integrity hashes + kill list.
8. **Mobile companion w/ E2EE pairing** — monitor/steer agents from anywhere.
9. **Computer use + emulator control + embedded browser w/ Design Mode** — agents acting beyond code.
10. **CLI-first automation surface** (`fabrica`) mirroring the GUI over one RPC layer.
11. **Automations** (scheduled/triggered agent task dispatch) — existing cron-like primitive.
12. **Usage/rate-limit tracking per provider/account** — cost observability already built.

---

## ROUND 3 ADDENDUM — orchestrated deep-dive wave (reports in `discovery/round3/`)

Round 3 dispatched 7 opencode worker sessions via orca orchestration (run_ebde8b42551c). Fabrica-app reports captured:

| Report | Coverage |
|---|---|
| `round3/fabrica-app-plugins.md` (29KB) | Full plugin platform: manifest schema w/ all contributes + artifact caps; capability model v0 + consent fingerprinting (canonicalizeCapabilitySet, sha256 over capabilities+trusted-tier+instructional-content identity); discovery (pointer-file layout, immutable hash-named dirs); install pipeline (git/marketplace/bundled sources, staging tree-hash fabrica-plugin-tree-v1, provenance files, atomic pointer swap w/ rollback, lockfile self-heal); worker lifecycle (fork compiled entry, allowlist env, zod both directions, ready 10s/invoke 30s/event 5min/shutdown-grace 2s timeouts, slot pool cap 5, supervisor backoff [500,2000,5000]ms max 3 restarts, idle reap 5min); panel bridge (CSP-first shell srcdoc, opaque sessions randomBytes(32), 64KB/30msg-per-10s budgets, navigation guard blocking all frame navigation); host-call chokepoint (audit-intent-before-handler); secrets (electron safeStorage, no plaintext fallback) + storage (per-plugin own file, 256KB/5MB/1024 keys); marketplace (official auto-scalers owner pinning, preview-commit===install-commit TOCTOU guard, host-derived official bit); kill list (24h future-skew guard, revocation at approval/content-pack/install/listing layers); content packs + instructional integrity re-verified at every read; audit JSONL rotation; trust model invariants |
| `round3/ai-vault-browser.md` (33KB) | AI Vault: scanner service, 17 per-agent session parsers w/ source paths/formats, incremental parse cache persistence, forked scanner process, title resolution, first-user-prompt capture, deletion, resume prep, SSH/remote scanning. Browser: browser-manager guest lifecycle, permission policies, certificate trust controller, cookie import, anti-detection/UA modes, agent-browser CDP WS proxy (screenshot/PDF/text), offscreen headless-serve backend, mobile screencast |
| `round3/fabrica-app-main-subsystems.md` (74KB) | Codex (~130 files): 4-lane CODEX_HOME routing (WSL per-distro / self-contained account home / real ~/.codex / shared mirror), pane account registry JSON, byte-preserving TOML trust editing replicating codex-rs trusted_hash, app-server NDJSON client via forked bridge, backfill/heal jobs (hardlink session bridges incl. WSL, sqlite index heal). Git: runner env pins + taskkill tree-kill, status read leases, worktree CAS update-ref invariants, gh circuit breaker (70s/5min by bucket), porcelain v1 -z/v2 parsers, WSL routing modes. SSH (210 files): attempt-identity pools, connectGeneration guards, 13-byte multiplexer frames w/ anti-starvation lanes, reconnect ladder 9-entry backoff, relay deploy pipeline (.FABRICA-remote versioned dirs, READY-sentinel handshake, exit-42 mismatch typing). Daemon: hello-token auth chmod-600-before-publish, kill tombstones + agent-session generations, OCKL framed scrollback log + checkpoint.json w/ binary-search degradation, corrupt-history quarantine, ConPTY warmup ~2.7s saved, macOS PAM login-death oracle, WSL CWD restore ladder |
| `round3/fabrica-app-renderer.md` (73KB) | Renderer UI deep dive: terminal-pane (~530 files — xterm integration, agent completion coordination, detached-pane restart, shutdown buffer captures, OSC52), pane-manager (137 files — split-grid model, dividers, focus-follows-mouse, fit sync, mobile driver), sidebar/right-sidebar/tab-bar/tab-group/status-bar internals, full settings pane inventory w/ per-pane configuration detail, native-chat transcript pipeline, cmd-j palette matching, complete Zustand slice anatomy + persistence + cross-window sync via sync-runtime-graph |

Cross-cutting finding (main subsystems report): every execution subsystem is built on generation counters, fail-closed liveness proofs, atomic claim-rename-restore file protocols, and single-flight marker-gated background jobs.

---

## ROUND 2 DEEP DIVE — Orchestration Engine & RPC Surface (function level)

### R2.1 Orchestration (`src/main/runtime/orchestration/`, 60 files)
Durable **SQLite-backed** Run/Task/Dispatch/Message store (`db.ts` 6,495 ln), polling coordinator (`coordinator.ts` 555 ln), dispatch preambles (`preamble.ts`), authority-checked lifecycle reconciliation, federation sync to remote environments, worker terminal/output archival.

**Data structures**: RunRow {id, objective, home_database, coordinator_handle, coordinator_pane_key, consumer_generation, legacy} · TaskRow {id, run_id, parent_id, created_by_*, task_title, display_name, spec, status(pending|ready|dispatched|completed|failed|blocked), deps(JSON), result} · DispatchContextRow {id, run_id, task_id, contract_version, launch_token_hash, assignee_handle/pane_key, capability_hash, process_incarnation, status(pending|dispatched|completed|failed|circuit_broken), failure_count, last_heartbeat_at} · MessageRow (type: status|dispatch|worker_done|merge_ready|escalation|handoff|decision_gate|question|heartbeat; priority normal|high|urgent) · DecisionGateRow · QuestionRow · WorkerDispatchRow (state: starting→ready→succeeded/failed/stopping/stopped/start_unknown/stop_unknown/abandoned) · FederatedDispatchRow + RemoteDispatchAttachmentRow + FederationRelayItemRow · MutationReceiptRow (idempotency ledger ≤10k rows) · LegacyCompatibility* rows for migration · WorkerTerminalResourceRow (ownership_state owned|transferred|user_owned|external|released; release_state machine).

**Flows**:
- *run-create*: BEGIN IMMEDIATE tx → unbind other runs on same pane → insert run_<hex>, generation=1; bindRun supports legacy-authority proof path.
- *task-create*: validates same-run parentId/deps → status pending if deps else ready.
- *worker-start* (explicit): mutation-receipt dedupe by (callerFingerprint, requestId); retry requires prior dispatch failed/stopped/abandoned; inserts dispatch_contexts(pending) + worker_dispatches(starting); setup completion detected via `__FABRICA_SETUP_COMPLETE__:<token>:<exitCode>` output marker.
- *coordinator auto-dispatch*: tick (default 2000ms): processMessages → decision-gate invariant → stale-dispatch warnings (10-min heartbeat threshold) → dispatchReadyTasks (slots = maxConcurrent − dispatched, default max 4; worktree drift probe: >20 commits behind refuses unless `allow-stale-base` in spec) → convergence check. Dispatch = createDispatchContext (handle AND pane-key locks; circuit-breaker budget carried from prior failures) → preamble sent via sendTerminalAgentPrompt; failures increment failure_count → circuit_broken at threshold.
- *worker_done settlement* (lifecycle-reconciliation.ts): authority check — only the assigned pane key (leaf-id equivalence) may settle; payload knowledge alone is never authority. settleWorkerReport: idempotent duplicate detection, staleness checks (must be latest dispatch for task), atomic task+dispatch update, question cleanup, dependency promotion on success. Heartbeats only extend liveness of active dispatches; wrong-sender heartbeats become persisted rejections (_FABRICALifecycleRejection).
- *decision gates*: created via gateCreate or decision_gate messages; humans resolve via gateResolve (coordinator never auto-resolves); resolved-gate context injected into later preambles ("--- DECISION GATE RESOLVED ---").
- *federation sync*: pull contiguous relay items (orchestration.federationPull, sequence must be cursor+1), parse+import w/ lifecycle effects, ack through checkpoints; push pending to_worker items when dispatch ready; peer-fingerprint change → peer_changed error.

**Preamble contents** (preamble.ts): header ("You are a dispatched worker…") → CLI COMMANDS block (fabrica CLI: `send --type worker_done` exactly once w/ 3-sentence executive summary + files-modified; `heartbeat` every 5 min w/ phase investigating|implementing|reviewing|waiting; `ask` for durable blocking questions (AskUserQuestion forbidden); escalation; `check --terminal`) → after-worker_done behavior by workerKind (bare-shell exits; prompt-returning agents idle for possible re-dispatch) → BASE DRIFT section → TASK block + resolved-gate context.

**Storage**: single SQLite file; hardened file perms (0o600/wal/shm); PRAGMA user_version migrations w/ version-skew defense; tables: runs, messages, deliveries, question_threads, tasks, dispatch_contexts, decision_gates, coordinator_runs, worker_dispatches, worker_terminal_resources/archives, federated_dispatches, remote_dispatch_attachments, federation_relay_items, remote_questions, mutation_receipts(+ledger trigger), legacy_* compat tables. IDs: run_/task_/ctx_ + hex; owr1_ output cursors; dcap_ dispatch capabilities (32 random bytes stored hashed). 30 colocated test files (~7,000 lines) pin all contracts.

### R2.2 RPC surface (`src/main/runtime/rpc/`)
Registration: `defineMethod()/defineStreamingMethod()` → per-module `*_METHODS` arrays → flat ALL_RPC_METHODS manifest; duplicates rejected at startup. ~350 methods across ~45 modules. Domains & highlights:
- status/stats/diagnostics/preflight/host-capabilities (env probes incl. WSL/PwSh/GitBash)
- accounts (Claude/Codex select/add/remove/consume-reset-credit + subscriptions) · aiVault (listSessions/resolveSessionTitles/prepareSessionResume)
- repo/project/folderWorkspace/worktree (full CRUD, clone, sparse presets, prefetchCreateBase, sleep/activate, lineage, PR/MR base resolution, forceDeleteBranch)
- terminal (~35 methods: list/create/split/send/read/wait/multiplex/subscribe streaming/adoptOrphans/ensureAgentSession/createAgentSession + agentTeams tmux-compat) · session.tabs (layout state, markdown tabs, capability-gated close)
- files (~28: CRUD, chunked uploads, watch streaming, search)
- git (~35: status/history/diff/stage/commit/pull/push/rebase/forkSync + AI commit-message & PR-field generation) · github (~50 incl. project.* board ops) · gitlab (~20) · hostedReview
- linear (human surface ~25 + separate agent-access surface ~15 with own ACL: agentSearchIssues/issueContext/issueSetState/…) · jira (~20)
- orchestration (~35: send/check/reply/inbox/task*/dispatch*/ask/reset/runCreate/runUse/gateCreate/gateResolve/workerStart/Show/Read/Stop/Release/Abandon/federationAttachStart/federationPull/Ack/Import/Show/Read/Stop)
- browser (~55 Playwright-style: snapshot/click/fill/tabs/profiles/cookies/intercept/screencast streaming/pdf/drag/upload/console/network) · computer (~15 accessibility-driven GUI control) · emulator (~20 iOS+Android)
- nativeChat (read/subscribe streaming, mobile-aware truncation) · speech (models + dictation streaming) · client-ui/client-events (settings, UI state, runtime event push)
- artifacts · automations (list/show/create/update/delete/runNow/runs) · clipboard chunked uploads · notifications streaming w/ catch-up · plugins (consent/panels/commands) · skills.discover · ssh state/connect/targets · workspacePorts scan/kill · pairing getEndpoints/provisionRelay · updater lifecycle.

**Plumbing**: envelope {id, authToken, method, params?, orchestrationCapability?, orchestrationContractVersion?, orchestrationRequestId?} → {ok:true,result,_meta:{runtimeId}} | {ok:false,error{code,message,data}}; keepalive frames; zod .strip() union schema in shared/runtime-rpc-envelope.ts (clients/runtimes evolve independently). Contract fence before every orchestration mutation: missing/mismatched contract version or retired method → orchestration_migration_required, zero effects. Streaming methods flagged streaming:true. Caller classes: local CLI/desktop (Unix socket chmod 0600 / named pipe; fingerprint = SHA-256(authToken||deviceToken||'authenticated_transport')), paired mobile (E2EE handshake awaiting_hello→awaiting_auth→ready, device registry, scope mobile|runtime, ≥3 auth failures/60s → re-pair prompt instead of 4001 loops), static web client (allow-listed assets + authenticated WS). Capabilities negotiated at auth and bound to socket (never request-asserted), e.g. SESSION_TAB_CLOSE_INTENT_RUNTIME_CAPABILITY. Orchestration capability "rides in the authenticated envelope, never user payloads"; durable mutations idempotent per (callerFingerprint, orchestrationRequestId) w/ canonicalized payload SHA-256. Transports: Unix socket/named pipe (1MB msg cap, 32 conns, idle timeout + keepalive) · LAN WS(S) direct (128 conns, pinned fallback port for pairing survival, ping/pong reap) · cloud relay (desktop dials OUT to /v1/host/data/<connId> w/ invite/resume credentials) · MobileSocketWiring wraps direct|relay behind one interface owning E2EE channels + revocation fan-out.

---
*Round-1 scan coverage preserved below; Round 2 added function-level depth on orchestration + RPC (the two most transformation-relevant subsystems). Remaining unread: fabrica-runtime.ts body (37K lines), renderer component bodies.*

*Scan coverage: README/AGENTS.md read; directory trees enumerated (all ~80 main folders, all renderer feature dirs, cli handlers/specs, relay, shared, preload, mobile, tests, skills, config, workflows); deep-scan reports cover main-process subsystems, renderer features/state, CLI command surface, relay architecture, mobile transport/E2EE, tests, skills, packaging. Not read line-by-line: fabrica-runtime.ts internals (37K lines — structure captured), individual component implementations, full handler bodies.*

