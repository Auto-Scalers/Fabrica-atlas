# FA Mobile/Companion Surface — READ-ONLY Inventory (R4-1.19)

> Task: ATLAS R4-1.19 · task task_36d3da727db5 · dispatch ctx_3c1b20007cb6
> Target: `Fabrica-app/` mobile + companion surfaces (`mobile/` tree, phone-pairing / relay client code in `src/`, web pairing, remote CLI pairing).
> Constraints honored: nothing under `Fabrica-app/` or `_sources/` was modified; this report is the only artifact written.

---

## 1. Executive Summary

Fabrica-app ships a **first-class React Native (Expo) companion app** — not a stub. It is a full
phone client for the desktop agent platform: QR-based pairing with E2EE (Curve25519, framing v2),
direct LAN WebSocket **and** cloud-relay transport, live terminal streaming, native AI chat with
remote permission/question answering, git/PR operations, file browsing/editing, dictation,
two-way audio, local notifications with watermark-based reconnect catch-up, and a paired-browser
(web) access mode plus a pairing-code-authenticated remote CLI.

**Maturity verdict: HIGH for transport/security/pairing; MEDIUM-HIGH for agent-control UX;
MEDIUM for ops features (no background push, no workflow/approval gates on phone).**
Evidence of production engineering discipline: ~1,112 source files under `mobile/src/`
(counted via directory enumeration, excluding `node_modules`), co-located vitest suites on nearly
every module, adversarial-review issue references (#8129, #8591) in comments, release tooling
(fastlane), and an app version of 0.0.43 (`mobile/app.json:5`).

---

## 2. The Mobile App (`mobile/`) — What It Is

### 2.1 Platform & stack

| Fact | Citation |
|---|---|
| Package `fabrica-mobile`, entry `expo-router/entry` | `mobile/package.json:1-3` |
| Expo ~55, React Native 0.83.9, React 19.2 | `mobile/package.json` dependencies block |
| State: zustand 5; validation: zod 4; WS: `ws` 8.21 | same dependencies block |
| Crypto: `tweetnacl` 1.0.3, `@noble/hashes` 1.8.0 (E2EE) | same dependencies block |
| Terminal rendering: `@xterm/xterm` 6.1 beta inside `react-native-webview` 13 | same dependencies block |
| Camera (QR): `expo-camera`; notifications: `expo-notifications`; secure storage: `expo-secure-store`; keep-awake, haptics, network, linking, file-system, image-picker all present | same dependencies block |
| Local native module `@fabrica/expo-two-way-audio` (file dep `./packages/expo-two-way-audio`) | `mobile/package.json` `"@fabrica/expo-two-way-audio": "file:./packages/expo-two-way-audio"` |
| Postinstall builds custom terminal + mermaid webview engines | `mobile/package.json` scripts.postinstall |
| Test runner: vitest (`vitest.config.ts`, `vitest.setup.ts` at repo root of `mobile/`) | `mobile/vitest.config.ts` exists; hundreds of co-located `*.test.ts` files |

### 2.2 App identity & permissions

- Expo app name "Fabrica", slug `fabrica-mobile`, scheme `fabrica`, version `0.0.43`,
  bundle id `com.autoscalers.fabrica.mobile` — `mobile/app.json:3-14`.
- iOS usage strings confirm intent: local-network ("Fabrica connects to the desktop app on your
  LAN", `mobile/app.json` ios.infoPlist.NSLocalNetworkUsageDescription), microphone ("record voice
  dictation and transcribe it on your paired desktop"), photo library ("attach photos … to a
  terminal session on your paired desktop").
- ATS exceptions for CGNAT ranges `100.64.0.0/10` and `fd7a:115c:a1e0::/48` — explicit
  **Tailscale support** baked into the app manifest (`mobile/app.json` ios.infoPlist.NSAppTransportSecurity).
- Android release engineering present: `mobile/fastlane/` directory and
  `mobile/src/mobile-release/prepare-android-release-script.test.ts`.

### 2.3 Route map (expo-router)

All routes under `mobile/app/`:

- Pairing: `app/pair.tsx`, `app/pair-scan.tsx` (camera QR scan), `app/pair-confirm.tsx`.
- Onboarding: `app/mobile-onboarding.tsx`, `app/notification-opt-in.tsx`.
- Per-host shell: `app/h/[hostId]/…` with subroutes:
  - `index.tsx` (workspace/worktree list home)
  - `session/[worktreeId].tsx` — live agent session (terminal + native chat)
  - `files/[worktreeId].tsx`, `files/preview/[worktreeId].tsx`
  - `source-control/[worktreeId].tsx`, `history/[worktreeId].tsx`
  - `pr/[worktreeId].tsx`, `review/[worktreeId].tsx`
  - `agent-history/[worktreeId].tsx`
  - `tasks.tsx`, `accounts.tsx`, `edit.tsx`
- Settings/diagnostics: `app/settings.tsx`, `terminal-settings.tsx`, `native-chat-settings.tsx`,
  `voice-settings.tsx`, `browser-settings.tsx`, `notifications.tsx`, `connection-log.tsx`,
  `troubleshoot.tsx`, `about.tsx`.

(route files enumerated from a recursive listing of `mobile/app/`; each path above corresponds to
a real file on disk.)

### 2.4 Feature domains in `mobile/src/` (directory → capability)

Enumerated from `mobile/src/` subdirectories (all exist on disk):

| Directory | Capability | Representative evidence |
|---|---|---|
| `transport/` | RPC client, relay client, E2EE sessions, pairing, host catalog/store, endpoint supervisor, connection health | `rpc-client.ts`, `mobile-relay-physical-client.ts`, `e2ee.ts`, `pairing.ts`, §4 below |
| `session/` | Native chat controller, streaming frames, permission/question prompts, diff review, PR sidebar state, quick commands, terminal tab records | `use-mobile-native-chat-controller.ts`, `mobile-native-chat-permission.ts`, `mobile-diff-review-state.ts`, `QuickCommandsSheet.tsx` |
| `terminal/` | xterm-in-webview terminal engine, live input commit/coalescing, gesture input, keyboard avoidance, mouse reporting, WebGL recovery | `TerminalWebView.tsx`, `terminal-webview-engine.generated.ts`, `terminal-live-input.ts`, `terminal-write-coalescer.ts` |
| `worktree/` | Workspace list/snapshot clients, activation, resume, lineage, workspace creation | `worktree-catalog-snapshot-client.ts`, `resume-worktree.ts`, `NewWorktreeModalController.tsx` (components) |
| `source-control/` | Status/stage/commit/push, branch compare, history, PR create flow, hosted review, conflict handling, AI commit messages | `mobile-git-status.ts`, `mobile-create-pr-action.ts`, `mobile-hosted-review-service.ts`, `mobile-commit-message-ai.ts` |
| `tasks/` | Task/workspace composer: smart source modes (GitHub/Linear/GitLab/hosted repos), agent catalog & selection, setup-hook trust | `mobile-agent-catalog.ts`, `mobile-smart-source-modes.ts`, `setup-hook-trust.ts`, `linear-mobile-issue-read.ts` |
| `files/` | File explorer, preview (syntax-highlighted), editable sources, image previews, mutation ownership | `MobileFilePreviewScreen.tsx`, `mobile-file-preview-syntax.ts`, `mobile-file-mutation-ownership.ts` |
| `notifications/` | Permissions, channel config, local show/dismiss, opt-in gate, reconnect catch-up watermarks | `mobile-notifications.ts`, `notification-reconnect-catchup.ts`, `notification-opt-in-gate.ts` |
| `dictation/` + `hooks/mobile-dictation-*` | Phone mic → desktop transcription pipeline with chunking, pending-audio budget, keep-awake, foreground recovery | `mobile-dictation-setup.ts`, `mobile-dictation-audio-chunk.ts`, `mobile-dictation-desktop-start.ts` |
| `browser/` | Browser tab remote control surface (screencast protocol in transport) | `transport/browser-screencast-protocol.ts` |
| `diagnostics/` | Host reachability probes, connection diagnostics report, troubleshooting UI | `diagnostics/host-reachability.ts`, `troubleshoot-common-issues.tsx` |
| `onboarding/` | Guided first-run plan, notification opt-in destination | `mobile-onboarding-plan.ts` |
| `storage/` | Preferences (async-storage), session-view prefs, codex-reset attempt journal | `storage/preferences.ts` |
| `theme/`, `layout/`, `platform/`, `navigation/`, `stats/`, `agent-history/`, `cache/`, `accounts/`, `mobile-release/` | theming, nav helpers, haptics, host-stack navigation, home stats, agent history screens, release scripting | directories present with co-located tests |

### 2.5 Agent management already possible from the phone

- **Create workspaces/agents**: new-worktree flow with agent selection —
  `mobile/src/components/new-worktree-agent-selection.ts`,
  `mobile/src/tasks/workspace-agent-selection.ts`,
  `mobile/src/components/NewWorktreeModalController.tsx`.
- **Agent catalog**: which agents are launchable — `mobile/src/tasks/mobile-agent-catalog.ts`;
  TUI agents list — `mobile/src/tasks/mobile-tui-agents.ts`.
- **Drive agents remotely**: send prompts, answer permission requests and questions, stop runs —
  `mobile/src/session/mobile-native-chat-permission-send.ts`,
  `mobile-native-chat-question.ts`, `use-mobile-native-chat-stop.ts`,
  `use-mobile-native-chat-message-send.ts`.
- **Switch accounts per provider** (Claude/Codex selection is explicitly allowlisted):
  `src/main/runtime/mobile-rpc-allowlist.test.ts:9-11` lists
  `accounts.selectClaude`, `accounts.selectCodex`, `accounts.selectCodexForTarget`.
- **Create/ensure agent sessions over RPC**:
  `terminal.createAgentSession` / `terminal.ensureAgentSession` in the mobile dynamic allowlist —
  `src/main/runtime/mobile-rpc-allowlist.test.ts:12-13`.
- **Full GitHub/GitLab PR lifecycle from phone**: merge, auto-merge, reviewers, checks rerun,
  title/comment edits — dynamic allowlist entries `github.mergePR`, `github.setPRAutoMerge`,
  `github.requestPRReviewers`, `github.rerunPRChecks`, `github.updatePRTitle`,
  `github.addIssueComment`, `gitlab.updateIssue`, `gitlab.updateMR` etc. —
  `src/main/runtime/mobile-rpc-allowlist.test.ts:22-39`.

---

## 3. Desktop-Side Mobile Server Surface

The Electron main process hosts everything the phone talks to.

| Component | What it does | Citation |
|---|---|---|
| Runtime RPC server w/ default WS port 6768 | Owns device registry, TLS fingerprint, E2EE keypair, mobile socket wiring | `src/main/runtime/runtime-rpc.ts:56` (`DEFAULT_WS_PORT = 6768`); `:502-505` (deviceRegistry/tlsFingerprint fields); `:1094-1117` (deviceRegistry + e2eeKeypair init) |
| Pairing offer minting | `createMobilePairingOffer({address, connectionMode, rotate, name})` with generation serialization | `runtime-rpc.ts:731`, `:751-767` |
| Pending-device token rotation/coalescing | repeated QR regenerations reuse one never-scanned token; `rotate:true` mints fresh credential | `src/main/ipc/mobile.ts:106-118` |
| Device registry | persisted devices w/ `DeviceScope` (default `'mobile'`), reach, lastSeen, relay binding, connection-mode memory | `src/main/runtime/device-registry.ts:54` (class), `:66` (scope default), `:102-113` (rotatePendingDevice) |
| Mobile IPC handlers | `mobile:listNetworkInterfaces`, `mobile:getPairingQR`, firewall inspect/repair, relay status, unpaired-auth-failure surfacing | `src/main/ipc/mobile.ts:72-77`, `:79+`, dependency map `:51-58` |
| Windows firewall automation | inspect/repair rule for port 6768 so LAN phones can connect | `src/main/runtime/windows-mobile-firewall.ts` (exports used at `ipc/mobile.ts:19-24`); test asserting script contains `'6768'` at `windows-mobile-firewall.test.ts:56` |
| Relay service (desktop side) | `DesktopRelayService`: auth coordinator, session broker, revoke outbox, demand ledger, liveness timer | `src/main/runtime/relay/desktop-relay-service.ts:50-70`, liveness `:48` |
| Relay broker/auth plumbing | `RelaySessionBroker`, `RelayAuthCoordinator`, host-proof, origin pool, control protocol/client, Supabase session | files in `src/main/runtime/relay/`: `relay-session-broker.ts`, `relay-auth-coordinator.ts`, `relay-host-proof.ts`, `relay-origin-pool.ts`, `relay-control-*.ts`, `supabase-session.ts` (all present on disk) |
| E2EE v2 desktop sessions | key schedule, inbound/outbound admission, memory budget, outbound owner | `src/main/runtime/rpc/mobile-e2ee-v2-key-schedule.ts`, `mobile-e2ee-outbound-admission.ts`, `mobile-e2ee-outbound-memory-budget.ts`, `mobile-e2ee-v2-desktop-session.ts` (all present) |
| Scope enforcement | connections carry `scope: 'mobile' \| 'runtime'` | `src/main/runtime/rpc/e2ee-channel.ts:38`; renderer-side denial toast for mobile-scope pairings: `src/renderer/src/store/slices/worktrees.ts:737-753` |
| Notification replay buffer | every dispatched mobile notification recorded w/ monotonic seq; reconnecting clients fetch `getMissedSince(lastSeenSeq)`; epoch field distinguishes counter lifetimes | `src/main/runtime/mobile-notification-replay.ts` header comment (lines 1-17) |
| Session-tab agent-status heartbeat | keeps phone session tabs truthful about agent status | `src/main/runtime/mobile-session-tabs-agent-status-heartbeat.ts` (file present; truthfulness test `fabrica-runtime-mobile-agent-status-title-truthfulness.test.ts`) |
| Graph-sync gating | mobile snapshots gated separately in graph sync | `src/main/runtime/graph-sync-mobile-snapshot-gating.test.ts` |
| Remote/headless server updater | updater install modes incl. `'unsupported-headless-serve'` | `src/main/runtime/remote-server-updater.ts:18,38-57` |
| QR rendering | data-url QR (EC level M, margin 2, width 256) via dynamic `qrcode` import; also terminal QR for CLI users | `src/main/runtime/mobile-pairing-qr.ts:5-13`; `src/main/index.ts:1845-1852` |

---

## 4. Pairing System (Phone <-> Desktop)

### 4.1 Offer format & deep link

- Offer is zod-validated JSON, version 2 (`PAIRING_OFFER_VERSION = 2`), fields: `endpoint`,
  `deviceToken`, `publicKeyB64` (desktop Curve25519 public key pinned by the offer), optional
  `pairedDeviceId`, optional `scope`, optional `relay` block —
  `src/shared/mobile-relay-pairing-offer.ts:9`, `:70-101`.
- Scope enum `'mobile' | 'runtime'` — `mobile-relay-pairing-offer.ts:10`.
- Relay sub-block (`v:1`): `directorUrl` + `cellUrl` must be canonical HTTPS origins,
  `assignmentEpoch`, `relayHostId` (16-char base64url), `inviteToken` (43-char base64url),
  `inviteExpiresAt` capped at **10 minutes** (+30 s clock-skew leeway), `e2eeFraming: literal(2)` —
  `mobile-relay-pairing-offer.ts:13`, `:47-68`.
- Relay offers are invalid on `runtime` scope ("relay v1 is mobile-only") and require canonical
  32-byte keys — `mobile-relay-pairing-offer.ts:82-100`.
- Encoding: base64url JSON wrapped as `FABRICA://pair?code=<base64url>` (query param chosen over
  URL fragment because "Android camera intents and Expo Router preserve query params more
  reliably"); size-capped — `src/shared/pairing.ts:14-27`.
- Parsing accepts the deep-link URL or a bare pasted base64 string (paste-pair flow) —
  `src/shared/pairing.ts:65-81`.
- Mobile-side parser mirrors the desktop file because Metro/Hermes lacks Node Buffer — explicit
  keep-in-sync note at `mobile/src/transport/pairing.ts:3-6`; unpadded-base64 padding restored at
  `:70-76`.

### 4.2 Connection modes

- Two modes: `'automatic' | 'local-only'`; saved preference wins, default resolves to automatic
  ("Anywhere = Relay + local") — `src/shared/mobile-pairing-connection-mode.ts:1`, `:10-14`.
- Anywhere cannot be minted unless the desktop is signed in (Relay needs cloud auth); both UI
  surfaces gate generation via `canMintMobilePairingOffer` rather than silently degrading to
  local-only — `mobile-pairing-connection-mode.ts:20-41`.
- QR generation honors an address override for overlay networks (Tailscale/ZeroTier named in the
  comment) — `src/main/ipc/mobile.ts:89-92`.
- Local-only fails closed with guidance if no advertizable interface exists; Relay tolerates it
  (the QR carries the relay invite) — `src/main/ipc/mobile.ts:93-104`.
- Persisted preferences: preferred mobile pairing path, explicit custom address, saved custom
  addresses available in both pairing pickers — `src/shared/types.ts:3116-3121`.

### 4.3 Phone-side pairing UX & hygiene

- Camera scan screen uses expo-camera `CameraView` + paste fallback, hard 25 s overall timeout,
  disposal-safe attempt tracking — `mobile/app/pair-scan.tsx:12`, `:15-19`, `:33`, `:61-72`.
- Pre-profile pairing coordinator runs pairing before any host profile exists —
  `mobile/src/transport/pre-profile-pairing-coordinator.ts` (imported at `pair-scan.tsx:17-19`).
- Pair-confirm step with candidate-race resolution — `mobile/app/pair-confirm.tsx`;
  `mobile/src/transport/pairing-candidate-race.ts`, `pair-confirm-state.ts`.
- Keychain-backed secret storage — `mobile/src/transport/pairing-keychain.ts`
  (co-located test present).
- Crash-safe pairing journal/recovery — `mobile-relay-pairing-journal.ts`,
  `mobile-relay-pairing-journal-store.ts`, `mobile-relay-pairing-recovery.ts`,
  `pairing-relay-served-recovery.test.ts` (all present).
- Credential hygiene: unpaired-host credential deletion —
  `unpaired-host-credential-deletion.ts`; host credential cleanup/revision —
  `host-credential-cleanup.ts`, `host-credential-write-revision.ts`.

---

## 5. Transport Architecture

### 5.1 Direct path

- Phone dials the desktop directly on `ws(s)://<desktop-ip>:6768`; README documents both the port
  and the endpoint check step — `mobile/README.md` ("hosts the mobile WebSocket RPC server on port
  6768"; "Confirm the mobile host endpoint is ws://<desktop-ip>:6768"); server default
  `runtime-rpc.ts:56`.
- Endpoint supervision: supervisor contract + support module with hysteresis probes,
  direct-return probe, relay focus probe — `mobile-endpoint-supervisor.ts`,
  `mobile-endpoint-supervisor-contract.ts`, `mobile-endpoint-hysteresis.ts`,
  `mobile-direct-endpoint-probe.ts`, `mobile-direct-return-probe.ts`,
  `mobile-relay-focus-probe.ts` (all under `mobile/src/transport/`).
- Relay-to-direct upgrade controller with grace timer and journal —
  `mobile-relay-direct-upgrade-controller.ts`, `mobile-relay-direct-grace-timer.ts`,
  `mobile-relay-direct-upgrade-journal.ts`.

### 5.2 Relay path (Anywhere / cellular)

- Desktop provisions relay credentials through cloud auth: Supabase session —
  `src/main/runtime/relay/supabase-session.ts`; auth coordinator requests relay tokens from an
  auth endpoint (`…/v1/desktop/auth/relay-token` in tests) —
  `src/main/runtime/relay/relay-auth-coordinator.test.ts:123-124`; cell assignment via director
  `…/v1/assign` — `src/main/runtime/relay/relay-http-client.test.ts:52`.
- Phone side machinery: physical relay client, RPC session establisher, resume director,
  reconnect controller with retry delays, lease rotation timer, orphan cleanup, recovery log,
  host overlay store — `mobile-relay-physical-client.ts`, `mobile-relay-session-establisher.ts`,
  `mobile-relay-resume-director.ts`, `mobile-relay-reconnect-controller.ts`,
  `mobile-relay-retry-delays.ts`, `mobile-relay-lease-rotation-timer.ts`,
  `mobile-relay-orphan-cleanup.ts`, `mobile-relay-recovery-log.ts`,
  `mobile-relay-host-overlay-store.ts` (all present).
- Credential bundle handling: bundle / rotation / hash / selection modules —
  `mobile-relay-credential-bundle.ts`, `-rotation.ts`, `-hash.ts`, `-selection.ts`.

### 5.3 End-to-end encryption

- Shared Node-compatible crypto primitives serve "desktop, CLI, and mobile pairing" —
  `src/shared/e2ee-crypto.ts:2`.
- Phone v2 stack: key schedule, physical channel, client session, legacy fixtures —
  `mobile-e2ee-v2-key-schedule.ts`, `mobile-e2ee-v2-physical-channel.ts`,
  `mobile-e2ee-v2-client-session.ts`, `mobile-e2ee-legacy-fixtures.test.ts`.
- Desktop mirror: key schedule, session, auth validation, memory-budgeted outbound admission +
  outbound owner — files cited in §3 table; integration test with simulated peer —
  `src/main/runtime/relay/mobile-relay-e2ee.integration.test.ts`, `simulated-mobile-e2ee-v2-peer.ts`.
- Framing version pinned in every offer (`e2eeFraming: 2`) — §4.1.

### 5.4 RPC client robustness (phone side)

Each concern has a dedicated module (+ test): single-flight request dedupe
(`request-single-flight.ts`), request budgets/deadlines (`rpc-request-budget.ts`),
delivery ambiguity (`rpc-delivery-ambiguity.ts`), stale-dial detection (`rpc-stale-dial.ts`),
connect-wait replay (`rpc-client-connect-wait-replay.test.ts`), terminal binary frames +
subscription (`rpc-client-terminal-binary-frame.ts`, `rpc-client-terminal-subscription.ts`),
log redaction (`rpc-client-log-redaction.test.ts`), synthesized-close diagnostics
(`rpc-client-synthesized-close-diagnostics.test.ts`), socket-close evidence
(`rpc-socket-close-evidence.ts`), payload byte accounting (`websocket-payload-bytes.ts`),
activity probe (`rpc-client-activity-probe.ts`), capability probe (`runtime-capability-probe.ts`).
Protocol negotiation: `protocol-compat.ts`, `protocol-version.ts`. All under `mobile/src/transport/`.

---

## 6. Notifications Pipeline

**No remote push (APNs/FCM) exists.** A case-insensitive search of `mobile/src` for
push-token/APNs/FCM identifiers returns zero hits (search performed during this scan; only
`expo-notifications` local scheduling appears — `local-notification-scheduling.ts:1`). Delivery model:

1. Phone subscribes per connection: `subscribeToDesktopNotifications(client, hostId)` —
   `mobile/src/notifications/mobile-notifications.ts:38`.
2. Desktop fans out live events tagged with monotonic `notificationSeq` + `notificationEpoch`,
   buffered as the catch-up source of truth; reconnecting clients request everything after the
   last-acked seq (`getMissedSince`) — `src/main/runtime/mobile-notification-replay.ts:1-17`
   (header rationale + `ReplayableMobileNotification` type).
3. Reconnect catch-up is watermarked (`#8129`); the epoch field distinguishes counter lifetimes
   so a stale seq cannot be misordered (`#8591` counter-lifetime note) —
   `mobile-notifications.ts:30-35`; catch-up machinery exports in
   `notification-reconnect-catchup.ts` (`adoptNotificationEpoch`, `catchUpWatermarkSeq`,
   `quarantineCatchUpWatermark`, `saveWatermark`, `seedWatermarkFromStorage`).
4. Per-host delivery queue dedups repeated shows by `notificationId` — `mobile-notifications.ts:47-78`.
5. Opt-in gating, permissions, Android channel config, scheduled-notification cap for tests —
   `notification-opt-in-gate.ts`, `notification-permissions.ts`,
   `local-notification-scheduling.ts:61-76`.
6. Catch-up watermark failure quarantine — `notification-catchup-failure-quarantine.test.ts`;
   delivery-ordering and teardown tests co-located in `notifications/`.

**Implication:** notifications arrive only while the phone can hold/make a socket (foreground or a
background window). Away-from-app push requires APNs/FCM server integration — a first-order gap
for After-Rebrand ops usage (§9.3).

---

## 7. Companion Surfaces Beyond the Phone App

| Surface | What it is | Citations |
|---|---|---|
| Web/browser pairing | Browser remote access: `WebPairingOffer` parsed from URL/location/address bar; `WebRuntimeClient` opens WebSocket to the offer endpoint, authenticates each call with `deviceToken`, encrypts against pinned server key | `src/renderer/src/web/web-pairing.ts:19,36,62,78`; `web-runtime-client.ts:99-118`, `:384` |
| Share-this-server flow | "Browser access link" from Settings -> Runtime Environments -> Share this Fabrica server; mobile-scope pairings are denied worktree/repo RPCs with one deduped toast (stable id) | denial toast copy `src/renderer/src/store/slices/worktrees.ts:753`; rationale `:737` |
| Remote artifact CLI | CLI flags incl. `--pairing-code`, `--api-url`, `--environment`, `--file` authenticate an external CLI to a desktop runtime | `src/relay/remote-artifact-cli-input.ts:13`; forwarding `remote-artifact-cli-forwarding.ts`; stdin/env/timeout helpers `remote-cli-stdin.ts`, `remote-cli-env.ts`, `remote-cli-timeout.ts` |
| Terminal QR | Desktop renders terminal-type QR of the pairing URL for headless/CLI users | `src/main/index.ts:1845-1852` |
| Ephemeral VM recipes | Sandbox connections carry `pairingCode` validated with the same `parsePairingCode`; recipe diagnostics reject insecure public ws:// endpoints and redact pairing material | `src/shared/ephemeral-vm-recipes.ts:69,150-151`; `ephemeral-vm-recipe-diagnostics.ts:22-30`, redaction `:44,62` |
| Feature-interaction catalog | `mobile-pairing` registered as collaboration-category interaction, fired on "mobile pairing enabled or QR code generated" | `src/shared/feature-interaction-catalog.ts:41,134`; `feature-interaction-categories.ts:62` |
| Hosted-review / browser screencast | Phone can view remote browser pages via screencast protocol over the same transport | `mobile/src/transport/browser-screencast-protocol.ts`; desktop admission `src/main/runtime/remote-browser-screencast-frame-admission.ts` |

---

## 8. Voice / Dictation / Audio

- Dictation: phone microphone audio is chunked and sent to the paired desktop for transcription;
  keep-awake acquired only after the desktop session exists (stale-session guard) —
  `mobile/src/hooks/mobile-dictation-desktop-start.ts:91`; supporting modules:
  `mobile-dictation-audio-chunk.ts`, `mobile-dictation-pending-audio-budget.ts`,
  `mobile-dictation-foreground-keep-awake.ts`, `use-mobile-dictation-source.test.ts`;
  setup UX: `MobileDictationSetupSheet.tsx`, `dictation-setup-poll-controller.ts`.
- Two-way audio: local Expo native module with android/ios implementations and JS facade —
  `mobile/packages/expo-two-way-audio/{android,ios,src}` directories plus
  `expo-module.config.json` exist on disk.
- iOS manifest declares mic usage specifically for paired-desktop transcription — §2.2.

---

## 9. Maturity Assessment & After-Rebrand Gap Analysis

### 9.1 Maturity by area

| Area | Level | Basis |
|---|---|---|
| Pairing & device trust | HIGH | versioned offers w/ expiry+skew handling, pending-token rotation/coalescing, keychain storage, crash journals/recovery, revoke outbox, host-proof verification (§4, §5.2) |
| Transport (direct + relay + E2EE) | HIGH | dual-path with upgrade/hysteresis/supervision; E2EE v2 implemented on both ends with memory budgets; extensive reconnect/resume/watermark machinery (§5, §6) |
| Remote agent control | MED-HIGH | session create/ensure, prompt send/stop, permission & question answering, account switching, PR merge lane all reachable from phone (§2.5) — but shaped around coding-agent sessions |
| Notifications | MEDIUM | robust seq/epoch watermark replay while connected; **no background push** (§6) |
| Multi-host management | MEDIUM | host catalog/store/edit/reachability screens exist (`app/h/[hostId]/edit.tsx`, `host-catalog-selection.ts`, `host-status-gates.ts`), but presentation is per-host, not fleet-scale |
| Ops workflows on phone | LOW | no workflow-engine, approvals-gate, or scheduled-fire surface anywhere under `mobile/src/` (directory enumeration §2.4 shows none; targeted searches found no such modules) |

### 9.2 What carries forward for phone-to-desktop agent management (After-Rebrand)

1. **Device trust layer is production-grade and reusable as-is**: scoped pairing offers,
   revocation outbox, relay binding, connection-mode memory (§3, §4).
2. **Agent-control RPC substrate already exists**: `terminal.createAgentSession` /
   `terminal.ensureAgentSession`, chat send/stop/permission/question methods are explicitly
   mobile-authorized and enforced by an allowlist test that scans mobile sources against
   `ALL_RPC_METHODS` — `src/main/runtime/mobile-rpc-allowlist.test.ts:6-13`, `:72-80`.
3. **Streaming + terminal attach** works over lossy mobile networks (binary frames, replay,
   backpressure credit ledger desktop-side: `relay-pty-source-credit-ledger.ts` et al.).
4. **Host catalog abstraction** (many desktops per phone) is the natural seed for a fleet view.
5. **Notification backbone** (seq/epoch) extends cleanly toward push.

### 9.3 Gaps to close for After-Rebrand

1. **Background push (APNs/FCM)** — today's WS-only delivery means missed alerts when the app is
   killed; operators will expect true push (§6 implication).
2. **Approvals/workflow gates on phone** — mission-control-style approval state machines have no
   mobile surface (§9.1 last row); an agent-management product needs approve/reject from lock
   screen or at minimum a dedicated approvals tab.
3. **Fleet-scale UI** — current screens assume one human driving one workspace at a time;
   aggregate agent health/queue views would be new build on top of existing
   `session.tabs.*` / agent-status heartbeat data (`mobile-session-tabs-agent-status-heartbeat.ts`).
4. **Scope model extension** — only `'mobile' | 'runtime'` scopes exist
   (`e2ee-channel.ts:38`); operator-vs-builder roles or per-agent ACLs need new scope types in
   offer schema + allowlist.
5. **Non-git work item depth** — Linear/GitLab read paths exist (`linear-mobile-issue-read.ts`,
   `gitlab-check-summary.ts`) but are thinner than the GitHub lane; parity needed if agents
   manage non-GitHub work.
6. **Headless/desktop-less operation** — updater marks `'unsupported-headless-serve'`
   (`remote-server-updater.ts:18`); a cloud-hosted desktop variant would need this path finished
   for phones to manage agents without a logged-in GUI desktop.

---

## 10. Scan-Coverage Statement

**Scanned (read directly):** `mobile/package.json`, `mobile/app.json`, `mobile/README.md`,
`mobile/app/` route listing (all 29 files enumerated), `mobile/src/` full directory tree (all 24
subdirectories listed; 1,112 files counted), `src/relay/` full file listing (~180 entries),
`src/main/runtime/` full file listing, `src/main/runtime/relay/` file listing, `src/cli/` partial
listing (first 40), `src/main/ipc/mobile.ts` lines 1-120, `src/shared/pairing.ts` (full),
`src/shared/mobile-relay-pairing-offer.ts` (full), `src/shared/mobile-pairing-connection-mode.ts`
(full), `src/main/runtime/mobile-pairing-qr.ts` (full), `mobile/app/pair-scan.tsx` lines 1-80,
`mobile/src/transport/pairing.ts` (full),
`mobile/src/notifications/mobile-notifications.ts` lines 1-80,
`mobile/src/notifications/local-notification-scheduling.ts` exports,
`src/main/runtime/relay/desktop-relay-service.ts` lines 1-70,
`src/main/runtime/device-registry.ts` (grep-level structure),
`src/main/runtime/runtime-rpc.ts` (grep-level: port, pairing-offer, registry/TLS sites),
`src/main/runtime/mobile-rpc-allowlist.test.ts` lines 1-80,
`src/main/runtime/rpc/e2ee-channel.ts` scope line,
`src/main/runtime/mobile-notification-replay.ts` header,
`src/renderer/src/store/slices/worktrees.ts` cited lines,
plus targeted greps across `src/renderer`, `src/main`, `src/shared`, `src/relay`, `mobile/src`
(pairing/QR/push-token/dictation/allowlist patterns).

**Skipped:** file *bodies* of the ~1,100 `mobile/src` modules (structure enumerated via directory
tree + filename semantics + spot reads; individual module internals not line-read — consistent
with an inventory task rather than a line-level deep dive), `node_modules`, `.next`, `dist`,
`out`, `mobile/fastlane` internals, `_sources/*` (out of task scope), and `Fabrica-app/tests/`.

**Claim discipline:** every substantive claim above cites a file path (+line where practical);
items marked "(file present)" rest on directory enumeration performed this session; the
"no APNs/FCM" claim rests on the explicit search described in §6.
