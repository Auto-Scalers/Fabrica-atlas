> **PATH MIGRATION NOTICE (2026-08-21):** This project moved from the environment root into `Fabrica-atlas/`. All `_sources/...` paths in this document now resolve to `Fabrica-atlas/_sources/...`. `Fabrica-app/` remains at the environment root.
# Discovery Report — Mission-Control Frontend + Buzz Mobile/Web Clients

Task: task_b1957c7492d3 / dispatch ctx_df87c62c67ff — READ-ONLY discovery.
All paths relative to `C:\Users\BAB AL SAFA\Desktop\Fabrica-development_environment\_sources\`.

---

## AREA 1 — mission-control frontend (`mission-control/mission-control/src`)

Next.js 15 App Router, TypeScript strict, Tailwind v4, shadcn/ui. All field-ops pages are `"use client"` pages under `app/field-ops/`, backed by JSON-file API routes under `app/api/field-ops/`. Data layer is two generic React hook factories.

### 1.1 Hook factories

**`hooks/use-data.ts` — `useDataResource<T>(endpoint, dataKey, label, pollInterval?)`**
Generic CRUD factory (lines 10–217):
- State: `items: T[]`, `loading` (spinner only on first fetch via `initialLoadDone` ref), `error`.
- `refetch()`: GET `/api/{endpoint}`; accepts both `{data:[...]}` envelope and legacy `{[dataKey]:[...]}`.
- Polling: optional interval; polls only when `document.visibilityState === "visible"`; immediate refetch on tab re-visible (lines 40–58).
- `create`: POST, appends to state, success toast.
- `update`: **optimistic update**, revert via refetch on failure (lines 81–105).
- `remove`: optimistic delete + **undo toast with 5s window** that PUTs `{id, deletedAt:null}` to restore soft-deleted item (lines 107–148).
- `bulkUpdate`/`bulkRemove`: for endpoint `tasks` uses single atomic `/api/tasks/bulk` PUT/DELETE; other entities fall back to parallel individual calls (lines 150–214).
- Exported hooks: `useTasks` (15s poll), `useGoals`, `useProjects` (note: hits `/api/ventures`), `useBrainDump`, `useActivityLog` (30s), `useInbox` (10s), `useDecisions` (10s), `useAgents`, `useSkills`.

**`hooks/use-field-ops.ts` — mirrors the same pattern (`useFieldOpsResource`, lines 10–128)** minus bulk ops and undo:
- `useFieldMissions` → `/api/field-ops/missions`, 15s poll.
- `useFieldTasks` → `/api/field-ops/tasks`, 10s poll.
- `useFieldServices` → `/api/field-ops/services`, no poll.

**Client-side password cache (module-level singleton, lines 130–163):**
- `_cachedPw` + 30-min TTL timer (`PW_TTL_MS = 30*60*1000`, matches server TTL). Volatile memory only; never persisted. Survives server restarts/HMR so execute requests always have a password available. Exposed via `getCachedVaultPassword()`.

**`useVaultSession()` (lines 173–250):**
- State `{active, remainingMs, ttlMs}`; polls GET `/api/field-ops/vault/session` every 60s (visibility-gated).
- `unlock(password)`: POST session; on success caches password client-side via `cachePw`.
- `lock()`: DELETE session + `clearPw()`.

**`useExecuteTask()` (lines 254–326):**
- POST `/api/field-ops/execute` with `{taskId, masterPassword, actor:"me", dryRun}`.
- Tracks `executingTaskId` / `dryRunTaskId` separately.
- Success branches: dry-run passed; `status==="completed"` (with optional `stalenessCheck` note "stale service pre-checked"); `mode==="manual"` ("manual execution"); else failure toast. Returns `{success, isDryRun?, stalenessCheck?, error?, result?}`.

### 1.2 `app/field-ops/page.tsx` — dashboard

- Loads 5 endpoints in parallel on mount: missions, tasks, services, activity(?limit=10), approval-config (lines 206–245). Errors swallowed silently (empty-state rendering).
- **Autonomy modes** (`AUTONOMY_MODES`, lines 61–83): `approve-all` (Manual Approval, emerald), `approve-high-risk` (Supervised, amber), `full-autonomy` (Full Autonomy, red + `animate-pulse` when active).
- **Autonomy change flow**: click mode → `pendingMode` set → master-password dialog opens (lines 251–299). Confirm sends PUT `/api/field-ops/approval-config` with `{mode, masterPassword}`, `retries:0`. Full-autonomy shows a red warning banner about financial transactions. On success refreshes activity feed. Dialog cancel resets all pending state.
- Stats row: Active Missions, Pending Approvals (clickable link to approvals page, amber ring + pulse dot when >0), Services connected (+saved count), Completed This Week (computed client-side from `completedAt` within 7 days).
- FinancialOverviewCard (`variant="detailed"`), GettingStartedCard (storageKey `mc-fieldops-dashboard-intro`), active-mission cards with per-mission progress bar and pending-count badge, recent activity list with full event-type label/color maps (21 event types, lines 87–135).

### 1.3 `app/field-ops/approvals/page.tsx` — batch approval UX

- Loads only `tasks?status=pending-approval` + services + missions in parallel (lines 47–72).
- **Risk classification client-side** (`getTaskRisk`, lines 80–86): high = payment/crypto-transfer/ad-campaign; medium = email-campaign/social-post/publish; else low. Three clickable stat cards act as risk filters (`riskFilter` toggle).
- **Selection model**: `selectedIds: Set<string>`; per-task checkbox + select-all (scoped to filtered set).
- **Batch approve**: POST `/api/field-ops/batch` `{action:"approve", taskIds, actor:"me"}`; reports `succeeded.length` and `failed.length` in toast (lines 173–200).
- **Batch reject**: same batch endpoint with `rejectionFeedback`; triggered through `RejectTaskDialog` using a sentinel task `{id:"__batch__"}` so one dialog handles single + batch (lines 426, 498–515).
- Individual actions: PUT `/api/field-ops/tasks` with status + `approvedBy:"me"` or `rejectedBy/rejectionFeedback`.
- Empty states: GettingStartedCard + "All Clear" card; filtered-empty card when filter yields nothing.

### 1.4 `app/field-ops/vault/page.tsx` — vault management

- Fetches credentials list + health (`GET /vault` and `GET /vault?health=true`) in parallel (lines 291–310). UI only ever sees **metadata** (`CredentialMeta{id, serviceId, createdAt, expiresAt}`) — secrets never returned by API.
- **Health-driven rendering**:
  - `masterKeyFormat === "none"` → `VaultSetupWizard` (initial setup).
  - `legacyCredentials > 0` → yellow "Migration Required" banner (storing a new credential auto-upgrades all to AES-256-GCM).
  - Healthy → green "AES-256-GCM Encryption Active" banner.
- **VaultSessionCard** (lines 165–274): unlock form when locked; when active shows green card with countdown (local 10s decrement of `remainingMs` from `useVaultSession`) and "Lock Now". Unlocking "caches your password in memory for 30 minutes."
- Add credential inline form: serviceId + apiKey + masterPassword → POST `/api/field-ops/vault` `{serviceId, data, masterPassword}`.
- Revoke: DELETE `/api/field-ops/vault?id=...`.
- **Reset vault**: destructive dialog requiring typed `RESET` confirmation → POST `/api/field-ops/vault/reset` `{confirm:"RESET_VAULT"}` (lines 641–699).

### 1.5 Vault-unlock gating across pages

Central pattern: sensitive operations check `vaultSession.active || getCachedPassword()` before proceeding; if neither, stash a *pending action* and open `VaultUnlockDialog`; after successful unlock, replay the pending action.

**Mission detail page** (`app/field-ops/missions/[id]/page.tsx`, 843 lines):
- Pending-action state: `pendingExecuteTask`, `pendingDryRun`, `pendingAction {taskId,status,feedback?}` (lines 308–311).
- `handleStatusChange` (line 404): approving requires vault auth — if not active, defer into `pendingAction` + open dialog.
- `handleRejectTask` (line 418): same deferral for rejection-with-feedback.
- `handleExecute` (line 439): failed tasks are auto-reset to `approved` (skips resubmit dance); tries cached password first; if server says "Vault is locked", reopens unlock dialog (auto-retry loop).
- `handleDryRun` (line 508): identical flow with `dryRun:true`.
- `handleVaultUnlock` (line 469): on success executes pending task (100ms setTimeout to let dialog close) and/or applies pending approve/reject.
- **Circuit breaker (ASI08)**: `shouldTripCircuitBreaker(taskStatuses)` from `lib/field-ops-security.ts` — ≥3 consecutive failures trips a red warning card with "Pause Mission" button (lines 337–338, 693–716).
- Collapsible `MissionActivitySection` fetching `/api/field-ops/activity?missionId=...&limit=10` with expandable rows showing details + metadata grid (labeled keys like approvedBy/durationMs).

### 1.6 Other field-ops pages

**`activity/page.tsx`** (441 lines): full audit feed. URL param `missionId` filter support; category filters (prefix-based: field_task_, mission_, service_, credential_, circuit_breaker_, autonomy_); PAGE_SIZE=20 pagination; expandable EventRow with details + metadata table (~28 labeled metadata keys); relative-time formatting ladder.

**`missions/page.tsx`** (281 lines): status filter chips (all/active/paused/completed with counts), mission cards with autonomy + status badges, create via `MissionFormDialog` (`{...data, status:"active", tasks:[]}`).

**`services/page.tsx`** (924 lines): Tabs layout (installed services vs catalog library). Status badges: saved (bookmark)/connected/disconnected/error; risk badges high/medium/low. Catalog cards → save-from-catalog or activate flows (`ActivateServiceDialog`, `SetupGuideDialog`); test connection button; search + `SERVICE_CATEGORIES` grouping. API routes: `/services/save-from-catalog`, `/services/activate`, `/services/test`.

**`safety/page.tsx`** (841 lines): financial safety controls. Global budget (daily/weekly/monthly USD limits + enabled + autoPauseOnBreach) with color-coded SpendBars (>80% red, >50% amber). Per-service limits (maxPerTransaction, dailyLimit, approvedRecipients add/remove) in collapsible sections for high-risk services only. Spend log (last 20 entries) + summary. **Save requires master password dialog** → PUT `/api/field-ops/safety-limits` with transformed shape (`dailyBudgetUsd` etc., services as Record). Owner-only banner: agents cannot change safety limits.

### 1.7 Supporting libs (context)

- `lib/vault-crypto.ts`, `lib/vault-session.ts` — server-side AES-256-GCM + scrypt vault and 30-min in-memory session (mirrored by the client cache above).
- `lib/field-ops-security.ts` — circuit breaker + TASK_STATUS_STYLES.
- `lib/spend-tracker.ts`, `lib/owner-guard.ts`, `lib/field-ops-notify.ts`, `lib/field-ops-activity.ts` — spend accounting, owner-only enforcement, notifications, activity logging.
- Components under `components/field-ops/`: FieldTaskCard, FieldTaskFormDialog, RejectTaskDialog, VaultUnlockDialog, SignTransactionButton (execute/submit-signature flow), WalletConnectButton/WalletBalanceCard, ExecutionResultPanel, MissionFormDialog, CatalogServiceCard, ActivateServiceDialog, SetupGuideDialog, GettingStartedCard, FinancialOverviewCard.

---

## AREA 2 — Buzz mobile relay transport (`buzz/mobile/lib`)

Flutter + Riverpod + hooks. Relay stack lives in `shared/relay/`, features in `features/`.

### 2.1 `shared/relay/relay_socket.dart` — low-level WebSocket + NIP-42

- `SocketState {disconnected, connecting, authenticating, connected}`.
- `connect()`: IOWebSocketChannel with 30s ping interval; awaits `channel.ready`; then waits for NIP-42 auth completion with an **8s auth timeout** (Timer + Completer).
- AUTH challenge handling (`_handleAuthChallenge`, lines 195–231): decodes bech32 nsec → hex privkey, builds kind:22242 event with tags `[relay, wsUrl]` + `[challenge, ...]`, sends `["AUTH", event]`, tracks `_pendingAuthEventId`.
- OK frames matching the pending auth id complete/fail the auth completer; rejection messages classified by `classifyRelayAuthFailure` (`error:` prefix → generic Exception, else `RelayAuthRejectedException`). All other frames (EVENT/EOSE/NOTICE/OK) forwarded upstream. Binary frames and malformed JSON ignored.
- No reconnection logic here — explicitly delegated to `RelaySessionNotifier`.

### 2.2 `shared/relay/relay_session.dart` — session manager (Riverpod Notifier)

`RelaySessionNotifier extends Notifier<SessionState>` (state = status + reconnectAttempt). Auto-connects via microtask when authenticated AND config has nsec (build(), lines 146–164).

Key internals:
- **Reconnect**: exponential backoff 1s→30s max (`_baseReconnectDelayMs=1000`, `_maxReconnectDelayMs=30000`). Connection generations (`_connectionGeneration`) invalidate stale callbacks.
- **Live subscription replay**: on reconnect, REQs re-sent with `since: lastSeenCreatedAt - 5s` skew (`_reconnectReplaySkewSeconds`), batched 8 at a time with 50ms inter-batch delay; visible channel (registered via `registerVisibleChannel`, owner-scoped release callback) is prioritized in replay ordering (lines 512–532).
- **Event batching**: live events buffered and flushed every 16ms (`_eventBatchMs`); dedup via `${subId}:${eventId}` delivery keys capped at 5000 entries (cleared wholesale at cap).
- **History queries**: `fetchHistory(filter)` — one-shot REQ until EOSE, 8s timeout, CLOSE sent afterwards.
- **Publish**: `publish(event)` registers `_PendingEvent` keyed by event id, resolves on OK (accepted → minimal placeholder NostrEvent whose `content` carries the OK message, e.g. `response:{...}` for command kinds like 41010/30620/46020; rejected → error). 8s ack timeout.
- **CLOSED handling** (`_handleClosed`, lines 666–747): classifies via `relay_closed_policy.dart` (`classifyRelayClosed` → terminal vs rateLimited). Terminal → fail ready-completer + remove sub. Rate-limited → activates rate-limit gate and retries with backoff (attempt-capped exponential, floor of gate remaining time). Retries go through `_pendingClosedRetries` + microtask-scheduled replay.
- **Lifecycle**: `onAppPaused` starts a 5s grace timer then pauses (disconnect, cancel history/pending); `onAppResumed` reconnects immediately (cancels backoff) if backgrounded ≥ grace period or not connected.
- **HTTP bridge query**: `queryRelay(filters)` → POST `/query` with NIP-98 Authorization header built by local `buildNip98AuthHeader` (kind:27235 event, tags u/method/payload(SHA-256 hex of body)/nonce(uuid), base64-encoded, lines 949–979). Non-2xx triggers rate-limit-gate activation from error body.

### 2.3 `shared/relay/relay_rate_limit_gate.dart`

Session-owned back-pressure gate: `activate(retrySeconds)` clamps hint to [default 10s, max 300s], never shrinks an existing window; `wait()` returns a future completed when window expires; `remainingMs()`; `reset()` releases waiters. Consulted before fetchHistory, replay batches, and closed-retry resubscribes.

### 2.4 `shared/relay/signed_event_relay.dart`

Thin signing facade over the session: derives hex pubkey from nsec (`nostr.Nip19.decode` + `nostr.Keys`); `submit({kind, content, tags, createdAt?, onSigned?})` builds+sings event locally (`verify:false`), invokes `onSigned` (used for optimistic local echo), then `session.publish()` awaiting relay OK.

### 2.5 Media upload (`shared/relay/media_upload.dart`, 999 lines)

Blossom-style upload to relay media endpoints (`/upload`, legacy `/media/upload`):
- Allowed types: images jpeg/png/gif/webp; video mp4 only; 100MB caps for both.
- Auth: BUD-01 style kind:**24242** event with tags `t=upload`, `x=<sha256>`, `expiration=now+300s`, optional `server=<authority>`; header `Nostr <base64url(no padding)>` plus `X-SHA-256` (lines 573–620). Download-side auth in `media_auth.dart` (kind 24242, `t=get`).
- Preparation pipeline: magic-byte MIME detection; HEIC brand detection → transcode to JPEG; animated GIF/PNG/WebP sanitized via `animated_image_sanitizer.dart`; video transcoded to MP4 (fast-start via `mp4_fast_start.dart`) and poster frame generated — heavy work bridged through platform channel `buzz/media_upload` (native methods sanitizeImageForUpload/transcodeVideoToMp4/generateVideoPoster/transcodeImageToJpeg/readClipboardImage etc.).
- Streaming multipart upload with `UploadCancellationToken` (per-upload cancel without killing shared HTTP client); `UploadCancelledException`; `MediaPolicyUploadException` for policy-blocked prep failures. Returns `BlobDescriptor{url, sha256, size, type, uploaded, dim?, blurhash?, thumb?, duration?, image?, filename?}`.

### 2.6 Channels feature structure (`features/channels/`)

Large feature module (~120 files), organized as page + sibling `part` folders per repo convention (one public widget per file, ≤1000 lines/file):
- **List**: `channels_page.dart` + `channels_page/` (body, channel_tile, badges, community, quick_actions(+launcher), sections, sheets, skeleton).
- **Detail**: `channel_detail_page.dart` + `channel_detail_page/` (app_bar, banners, message_bubble, message_list, system_rows); timeline pieces: `timeline_message`, `day_divider`, `sticky_date_header`, `jump_to_latest_button`, `latest_message_button`, `laid_out_viewport`, `initial_thread_tail_settle`, `channel_window`.
- **Providers/state**: `channels_provider.dart` (936 lines — syncs desired live subscriptions per channel against `relaySessionProvider.subscribe` with `kinds: EventKind.channelEventKinds, '#h': [channelId]`; versioned subscriptions, relay-base-url change teardown, periodic backstop refresh timer, unread catch-up via HTTP query), `channel_messages_provider`, `send_message_provider`, `pending_local_messages_provider`, `thread_replies_provider`, `channel_typing_provider`, `channel_management_provider`.
- **Per-channel prefs managers** (manager/provider/storage triplets): `channel_mutes/`, `channel_sections/`, `channel_sort/`, `channel_stars/`; `thread_follows/`; `unread_badge/` (is_high_priority_event, should_notify_for_event, observed_unread_event, provider).
- **Compose**: `compose_bar/` (widget, dock, attachments, camera_preview, iOS photo picker/popover, markdown_editing_controller, formatting_toolbar, suggestions, send_button, upload_progress_pill, draft_lifecycle), `emoji_picker/` (+ iOS native picker), `mentions/` (candidates/provider/ranking), `recent_emoji_provider`.
- **Messages**: `message_content/` (link_normalizer, media_carousel, token_pill, video_preview), `message_actions/` (popover, reaction tray, quick reactions), `reaction_row`, `message_media`, `message_mention_pubkeys`.
- **Threads**: `thread_detail_page/` (avatar, nested_thread_summary_row, tail_alignment, thread_message), `thread_detail_helpers`.
- **Media viewing**: `media_viewer_page/` (image_controls, video_controls, video_viewer, route_transition), `media_viewer_hero`, `photo_library`.
- **Agent activity**: `agent_activity/` (agent_activity_sheet, observer_models, observer_subscription, transcript_builder, transcript_item_widget, working_bots_provider).
- Platform quirks helpers: `android_ime_lift`, `ime_metrics_settle_observer`, `camera_capture_cleanup`, `deep_link_dispatcher`, `channel_link_navigation`, `ephemeral_channel_display`, `dm_channel_labels`.

**Send path** (`send_message_provider.dart`): resolves @mentions against channel members (DM recipients resolved from authoritative membership snapshot, falling back to metadata p-tags), normalizes mentions (lowercase/dedupe/exclude self), builds tags `['h', channelId]` + reply tags (root/reply markers matching desktop `buildReplyTags`) + `p` mention tags + media imeta/NIP-30 emoji tags; signs kind streamMessage via `SignedEventRelay.submit` with `onSigned` optimistic local echo → complete on OK, remove local message on failure.

### 2.7 Pairing crypto flow (`features/pairing/`)

NIP-AB device pairing (phone ↔ desktop identity transfer):
- **`pairing_crypto.dart`**: pure KDF helpers —
  - `session_id = HKDF-SHA256(IKM=session_secret, salt="", info="nostr-pair-session-id", L=32)`
  - `sas_input = HKDF-SHA256(IKM=ECDH_shared(ephemeral, sourcePubkey), salt=session_secret, info="nostr-pair-sas-v1", L=32)`; `sas_code = be_u32(sas_input[0..4]) % 1_000_000` displayed as 6-digit zero-padded SAS.
  - `transcript_hash = HKDF-SHA256(IKM=session_id||source_pubkey||target_pubkey||sas_input (128B), salt=session_secret, info="nostr-pair-transcript-v1", L=32)`.
  - `parseNostrpairUri`: strict `nostrpair://<64-hex-pubkey>?secret=<64-hex>&relay=<wss url>&v=1` parser (2048-char cap, lowercase-hex validation, all-zeros secret rejected, wss/ws-only relays, version must be 1).
- **`pairing_provider.dart`** (969 lines, `PairingNotifier`): statuses idle→connecting→confirmingSas→transferring→storing→success/error.
  - Flow (`_pairNipAb`): parse QR → generate ephemeral keypair → derive sessionId+SAS immediately → precompute NIP-44 conversation key (`shared/crypto/nip44.dart`) → connect `PairingSocket` (ephemeral key) → subscribe kind:**24134** tagged to ephemeral pubkey → publish encrypted `offer {version, session_id}` → show SAS code → 120s session timeout.
  - Source sends `sas-confirm` carrying transcript hash; target verifies with constant-time compare; mismatch → abort `sas_mismatch` ("possible attack").
  - Payload gated on BOTH transcript verification AND user SAS confirmation (buffered as `_pendingPayload` otherwise). Identity export mode (`mode=recover`) requires fresh device-auth authorization (TTL 2 min, `identityExportAuthorizationTtl`) via `sensitive_action_authorizer`; nsec sent encrypted (NIP-44) as kind:24134 `payload{nsec}`. Import path validates payload relayUrl against SSRF (private-address check) and validates credentials via NIP-42 WS handshake before storing; aborts on community switch mid-flight (`identity_changed`).
  - Optional `protectSensitiveActions` enrolls biometric protection after import (requires biometric confirm to proceed).
- Files: `pairing_page.dart` (+ welcome view/onboarding background parts), `pairing_qr_scanner/` (scanner_camera, dynamic_island_portal, fallback_scanner), `pairing_socket.dart` (dedicated WS with ephemeral-key auth).

---

## AREA 3 — Buzz web client (`buzz/web/src`)

Vite + React + TanStack Router/Query + Tailwind. Served by the relay itself (same-origin). Feature areas: invite join + git repo browser.

### 3.1 Isomorphic-git browser client

**`features/repos/git-client.ts`** (456 lines):
- Installs feross `Buffer` on globalThis before any git import (pack-file parsing needs it).
- Persistence: per-repo `LightningFS` instance named `buzz-git-${owner}-${repoName}` (IndexedDB-backed); working dir `/${owner}/${repoName}`.
- Remote: `${relayHttpBaseUrl()}/git/${owner}/${repoName}.git` (relay's smart-HTTP git transport). NIP-98 `u` tag intentionally includes `.git` suffix to match what relay `transport.rs` expects after stripping `/info/refs`, `/git-upload-pack`, `/git-receive-pack`.
- `ensureClone(owner, repo, ref)`: stat `.git` in virtual FS → existing ? shallow `fetch` (depth 1, singleBranch; failures tolerated) : shallow `clone` (depth 1, singleBranch, noTags). Returns `{fs, dir}` consumed by all hooks.
- `readTreeEntries` (tree listing), `readFileContent` (binary detect via NUL scan of first 512 bytes), `readBlobView` → discriminated `BlobView`: image (raster ext map incl. avif; SVG deliberately excluded for active-content safety) capped at 10 MiB; binary (NUL sniff OR fatal UTF-8 decode failure); markdown/html/text capped at 1 MiB; `too-large` carries which limit was hit. Display caps only — IndexedDB clone holds full bytes. Object URLs deliberately NOT created inside React Query cache (viewer owns createObjectURL lifecycle).
- `resolveHtmlAssets`: for HTML preview "Run" — inlines only same-repo *relative* script/link/img refs as `data:` URLs (external/absolute/fragment refs untouched; `..` cannot escape repo root); result rendered in sandboxed iframe.
- `getCommitLog` (depth 20 default), `findReadme` (readme.md/readme/readme.rst/readme.txt priority).

**`features/repos/use-git-browse.ts`** (143 lines): TanStack Query hooks all depending on `useGitClone` (queryKey `["git-clone", owner, repo, ref]`, staleTime 5 min, retry false, enabled-guarded): `useGitTree` (dirs-first sort), `useGitLog`, `useGitReadme`, `useGitBlob`, `useGitHtmlDoc` (lazy — `enabled` caller-gated so asset inlining only happens on user "Run").

UI consumers: `ui/RepoDetailPage.tsx`, `RepoTreeSection`, `RepoCommitsSection`, `RepoReadmeSection`, `RepoRefsSection`, `RepoBlobViewer`, `repos.$repoId.blob.$.tsx` route; refs via `use-repo-refs.ts`, listing via `use-repos.ts`/`mock-repos.ts`, org sidebar + pubkey avatar components.

### 3.2 NIP-98 signer

**`shared/lib/nostr-signer.ts`** (106 lines):
- Signs via NIP-07 (`window.nostr`) when present, with integrity checks: returned pubkey must match `getPublicKey()`, and signed event must be byte-identical to the unsigned template (kind/created_at/content/tags compare) — else "extension returned an invalid signed event".
- Fallback: page-lifetime ephemeral secret key (module singleton, `generateSecretKey()` once) preserving anonymous browsing; durable-membership flows pass `requireNip07` to throw `Nip07UnavailableError` instead (so a reload can't orphan a relay membership row).

**`shared/lib/nip98.ts`** (48 lines): `makeNip98AuthHeader(url, method, {body?, requireNip07?})` — kind:27235 event, tags `u`, `method`, plus `payload` (SHA-256 hex of body, required by invite endpoints) and `nonce` (crypto.randomUUID()) when body present; base64(JSON) → `Nostr <b64>` header.

**`shared/lib/nostr-client.ts`** (175 lines): one-shot `queryEvents(wsUrl, filter)` — opens WS, waits up to 100ms for an AUTH challenge before sending REQ (Buzz relays always challenge; others may not); NIP-42 response via `makeAuthEvent` (nostr-tools/nip42) + signer; OK-for-auth-event gates REQ; collects EVENTs until EOSE; CLOSED → reject; 10s overall timeout; resolves partial events on clean close.

### 3.3 Same-origin relay serving

**`shared/lib/relay-url.ts`** (24 lines): `VITE_RELAY_URL` env override; otherwise derive from `window.location` (https→wss, http→ws) — i.e., the web bundle expects to be served BY the relay host, making WS + HTTP (git smart transport, `/query`, Blossom media) same-origin by default. `relayHttpBaseUrl()` converts WS→HTTP scheme.

Other shared lib: `pubkey.ts` (npub/hex helpers), `relative-time.ts`, `buzz-download.ts` (app download links), invite feature (`invite-api.ts` + InvitePage/JoinPolicyNotice) using NIP-98-signed POSTs.

---

## Cross-cutting observations

1. **Three parallel NIP-98 implementations** exist: mobile Dart (`relay_session.dart buildNip98AuthHeader` — SHA-256 payload tag always), web TS (`nip98.ts` — payload+nonce only when body present), and desktop (not inspected here). Tag-shape differences could matter for relay-side verification strictness.
2. **Auth kind conventions**: NIP-42 = kind 22242 (socket auth), NIP-98 = kind 27235 (HTTP), Blossom BUD-01 = kind 24242 with `t=upload|get` + expiration, pairing = kind 24134.
3. **Rate-limit back-pressure** is mobile-session-scoped (gate consulted before history/replay/retry); web client has no equivalent gate (one-shot queries only).
4. **Vault security posture** (mission-control): password never persisted anywhere; scrypt verification hash + AES-256-GCM credential encryption at rest; 30-min TTL mirrored client/server; master-password re-entry required for autonomy changes and safety-limit saves; typed-confirmation for vault reset.
5. **Optimistic-UI consistency**: both hook factories use optimistic updates with refetch-revert; mobile send path uses optimistic local echo with removal on relay rejection.

## Scan Coverage Statement

Scanned: `_sources/mission-control/mission-control/src` (field-ops pages under `app/field-ops/`, API routes under `app/api/field-ops/`, hook factories `hooks/use-data.ts` + `hooks/use-field-ops.ts`, vault/safety/services/missions/activity pages, `components/field-ops/`, `lib/vault-crypto.ts`) and `_sources/buzz/mobile/lib` (`features/channels/`, `features/pairing/`, relay/session/media-upload providers) and `_sources/buzz/web/src` (`shared/relay/*` incl. relay-url.ts, git-client.ts, use-git-browse.ts, nostr-signer.ts, nip98.ts, nostr-client.ts). Skipped: mission-control non-field-ops app areas, buzz mobile UI widget internals beyond the cited files, web page components outside shared lib. Sources unmodified (read-only pass).

