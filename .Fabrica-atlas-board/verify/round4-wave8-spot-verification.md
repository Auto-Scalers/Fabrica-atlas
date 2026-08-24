# Round 4 Wave 8 — Spot Verification of fa-mobile-companion.md (R4-2.10)

> Task: ATLAS R4-2.10 · task task_d8c42658e912 · dispatch ctx_26df318fea8f
> Target report: `.Fabrica-atlas-board/discovery/round4/fa-mobile-companion.md` (402 lines)
> Sources verified against: `Fabrica-app/mobile/**` and `Fabrica-app/src/**` (READ-ONLY; nothing outside `.Fabrica-atlas-board/` was written)
> Date: 2026-08-23
> Focus per dispatch: QR pairing v2 + :6768 transport claims; ≥12 file:line cites; coverage statement.

---

## Verdict

**PASS** — 0 FAILED, 3 MINOR (all cosmetic line-drifts; every substantive claim correct).

The report's two headline claim families are independently reproduced exact:

- **QR pairing v2**: `src/shared/mobile-relay-pairing-offer.ts:9` contains `export const PAIRING_OFFER_VERSION = 2`; the offer schema fields (`endpoint`, `deviceToken`, `publicKeyB64`, optional `pairedDeviceId`/`scope`/`relay`) sit at `:70-81`; the relay sub-block (`v: z.literal(1)`, canonical-HTTPS `directorUrl`/`cellUrl`, `assignmentEpoch`, 16-char `relayHostId`, 43-char `inviteToken`, 10-min TTL + 30 s skew at `:13`/`:17`, `e2eeFraming: z.literal(2)` at `:67`) sits at `:47-68`; relay-on-runtime rejection ("relay v1 is mobile-only") + canonical-32-byte-key requirement at `:82-101`. All match the report's §4.1 cites exactly.
- **:6768 transport**: `src/main/runtime/runtime-rpc.ts:56` = `const DEFAULT_WS_PORT = 6768` (exact); `mobile/README.md:7` says the desktop "hosts the mobile WebSocket RPC server on port `6768`" and `:60` "Confirm the mobile host endpoint is `ws://<desktop-ip>:6768`" — both quoted accurately in report §5.1; `windows-mobile-firewall.test.ts:56` asserts the script contains `'6768'` (exact).

## Sampled citations (32 checked)

| # | Report cite | Claim | Actual source | Verdict |
|---|---|---|---|---|
| 1 | `runtime-rpc.ts:56` | DEFAULT_WS_PORT = 6768 | `Line 56: const DEFAULT_WS_PORT = 6768` | EXACT |
| 2 | `runtime-rpc.ts:502-505` | deviceRegistry / tlsFingerprint fields | `:502 deviceRegistry`, `:503 e2eeKeypair`, `:505 tlsFingerprint` | EXACT |
| 3 | `runtime-rpc.ts:1094-1117` | deviceRegistry + e2eeKeypair init | `initializePairingIdentity()` spans 1093-1118 | EXACT |
| 4 | `runtime-rpc.ts:731`, `:751-767` | createMobilePairingOffer w/ generation serialization | fn at `:731`; generation serial/queue at `:750-769` | EXACT |
| 5 | `ipc/mobile.ts:106-118` | pending-token coalescing; rotate:true mints fresh credential | comment `:106-112` + call `:113-118` | EXACT |
| 6 | `ipc/mobile.ts:89-92` | address override for overlay nets (Tailscale/ZeroTier) | comment+code `:89-92` | EXACT |
| 7 | `ipc/mobile.ts:93-104` | local-only fails closed w/ guidance | `:93-104` incl. `invalid_advertised_endpoint` | EXACT |
| 8 | `device-registry.ts:54` | class DeviceRegistry | `Line 54: export class DeviceRegistry {` | EXACT |
| 9 | `device-registry.ts:66` | scope default 'mobile' | `Line 66: scope: DeviceScope = 'mobile',` | EXACT |
| 10 | `device-registry.ts:102-113` | rotatePendingDevice | lines 100-114 = `getOrCreatePendingDevice` body (the pending-reuse logic); `rotatePendingDevice` actually starts `:134` | **MINOR** (name exists; cite points at sibling coalescing fn; content correct) |
| 11 | `mobile-relay-pairing-offer.ts:9` | PAIRING_OFFER_VERSION = 2 | `Line 9: export const PAIRING_OFFER_VERSION = 2` | EXACT |
| 12 | `mobile-relay-pairing-offer.ts:10` | scope enum 'mobile'\|'runtime' | `Line 10` | EXACT |
| 13 | `mobile-relay-pairing-offer.ts:13`, `:47-68` | relay sub-block v1, HTTPS-canonical URLs, 16-char hostId, 43-char invite token, 10-min TTL (+30 s skew), e2eeFraming literal(2) | all present at cited lines (`MAX_INVITE_TTL_MS` `:13`, skew `:17`) | EXACT |
| 14 | `mobile-relay-pairing-offer.ts:70-101` | offer fields + publicKey pinned by offer | `:70-81` object + `:82-101` superRefine | EXACT |
| 15 | `mobile-relay-pairing-offer.ts:82-100` | relay invalid on runtime scope; canonical 32-byte keys | messages at `:89`, `:98` | EXACT |
| 16 | `pairing.ts:14-27` | base64url JSON as `FABRICA://pair?code=`; query-param-over-fragment rationale; size cap | `encodePairingOffer` `:14-27`, rationale comment `:24-25` | EXACT |
| 17 | `pairing.ts:65-81` | parse accepts deep-link URL or bare pasted base64 | `parsePairingCode` `:65-81` | EXACT |
| 18 | `mobile/src/transport/pairing.ts:3-6` | mirror-of-desktop keep-in-sync note (Metro/Hermes lacks Buffer) | comment `:3-6` | EXACT |
| 19 | `mobile/src/transport/pairing.ts:70-76` | unpadded-base64 padding restored before decode | `decodePairingBase64` `:70-76` (+`padBase64` `:78`) | EXACT |
| 20 | `mobile-pairing-connection-mode.ts:1`, `:10-14`, `:20-41` | 'automatic'\|'local-only'; saved wins→automatic default; canMint gating vs silent degrade | all three fns at cited lines | EXACT |
| 21 | `remote-server-updater.ts:18,38-57` | 'unsupported-headless-serve' install mode; updater surface | `:18` exact; configure/check/download/install `:38-57` | EXACT |
| 22 | `desktop-relay-service.ts:50-70`, liveness `:48` | DesktopRelayService: coordinator/revoke-outbox/demand-ledger/liveness timer | class `:50`, fields `:51-56`, `RELAY_LIVENESS_INTERVAL_MS` `:48` | EXACT |
| 23 | `mobile-notification-replay.ts:1-17` | header rationale: monotonic seq, getMissedSince(lastSeenSeq), #8129 | header `:4-16` covers all three | EXACT |
| 24 | `rpc/e2ee-channel.ts:38` | scope: 'mobile' \| 'runtime' | `Line 38: scope: 'mobile' \| 'runtime'` | EXACT |
| 25 | `worktrees.ts:737-753` | mobile-scope denial toast, deduped stable id, Share-this-server copy | rationale `:737`, toast id `:738`, copy `:753` | EXACT |
| 26 | `mobile-notifications.ts:30-35` | epoch field distinguishes counter lifetimes (#8591) | `:30-35` exact incl. `#8591` | EXACT |
| 27 | `mobile-notifications.ts:38` | subscribeToDesktopNotifications(client, hostId) | `Line 38` exact | EXACT |
| 28 | `mobile-notifications.ts:47-78` | per-host queue dedups by notificationId | `queueDelivery` `:56-78`, dedup rationale `:47-55` | EXACT |
| 29 | `mobile-rpc-allowlist.test.ts:9-11` / `:12-13` / `:22-39` / `:6-13` / `:72-80` | accounts.select* ; terminal.createAgentSession/ensureAgentSession ; github PR-lifecycle methods ; dynamic allowlist vs ALL_RPC_METHODS ; mobile-source scan fn | `:9-11`, `:12-13`, github methods `:22-39` (mergePR `:28`, setPRAutoMerge `:29`, requestPRReviewers `:30`, rerunPRChecks `:32`, updatePRTitle `:33`, addIssueComment `:35`), ALL_RPC_METHODS import `:4`, scan fn `:72-80`. Note: gitlab.updateIssue/updateMR named in report sit at `:16-17`, just above the cited range | EXACT (gitlab pair = cosmetic range nit, not counted as failure) |
| 30 | `mobile-pairing-qr.ts:5-13` | data-url QR, EC level M, margin 2, width 256, dynamic qrcode import | `:5-13` exact | EXACT |
| 31 | `src/main/index.ts:1845-1852` | terminal QR for CLI users | `renderTerminalPairingQr` `:1844-1854` | EXACT |
| 32 | `mobile/app/pair-scan.tsx:12`, `:33`, `:61-72`, coordinator import `:17-19` | expo-camera CameraView; hard 25 s timeout; disposal-safe attempt tracking; pre-profile pairing coordinator | CameraView `:12`; `PAIRING_OVERALL_TIMEOUT_MS = 25_000` `:33`; attempt-ref dispose `:61-72`; import `:15-19` | EXACT |

### Additional existence/quote spot-checks (supporting claims)

- `mobile/app.json:5` `"version": "0.0.43"` — EXACT. Bundle-id claim cites `app.json:3-14` but `com.autoscalers.fabrica.mobile` is at `:18` — **MINOR** (cosmetic; value correct).
- `mobile/package.json` name `fabrica-mobile` (`:2`) + entry `expo-router/entry` (`:5`) — report cites `package.json:1-3`; entry line actually `:5` — **MINOR** (cosmetic).
- `mobile/vitest.config.ts` exists on disk — TRUE.
- `mobile/packages/expo-two-way-audio/{android,ios}` directories exist — TRUE.
- `mobile/README.md:7/:60` port-6768 quotes verbatim — TRUE.

## Totals

| Metric | Count |
|---|---|
| file:line citations sampled | 32 (+5 supporting existence/quote checks) |
| EXACT | 29 |
| MINOR (cosmetic line/range drift only; substance correct) | 3 |
| FAILED | 0 |
| Reports verdict | fa-mobile-companion.md **PASS** |

## Findings register (for hygiene, non-blocking)

1. `discovery/round4/fa-mobile-companion.md` §3 table, device-registry row: cite `:102-113` labeled `rotatePendingDevice` actually lands in `getOrCreatePendingDevice`; `rotatePendingDevice` begins at `src/main/runtime/device-registry.ts:134`. Cosmetic.
2. §2.2: bundle id `com.autoscalers.fabrica.mobile` is at `mobile/app.json:18`, outside the cited `:3-14` window. Cosmetic.
3. §2.1: entry `expo-router/entry` is at `mobile/package.json:5`, just outside cited `:1-3`. Cosmetic.

No factual corrections required; recommend leaving the report as-is (drifts are within tolerance established by waves 2–5 passes).

## Coverage statement check

Report §10 (Scan-Coverage Statement) is present and specific: Scanned list enumerates read files/line-ranges (mobile manifests, route tree, src listings, pairing-offer/connection-mode/pairing files full-read, targeted greps); Skipped list explicitly declares ~1,100 `mobile/src` module bodies unread beyond structure enumeration (consistent with an inventory-grade task), node_modules/dist/fastlane internals, `_sources/*`, `Fabrica-app/tests/`. The negative claim "no APNs/FCM push" documents its search method. Coverage statement judged ACCURATE for the task's inventory scope.

## Scan coverage of THIS verification pass

- Read fully: `fa-mobile-companion.md` (402 lines); `mobile-relay-pairing-offer.ts`; `shared/pairing.ts`; `mobile-pairing-connection-mode.ts`; `mobile/src/transport/pairing.ts`; `mobile-pairing-qr.ts`.
- Read at cited ranges: runtime-rpc.ts (:498-509, :725-769, :1092-1119), ipc/mobile.ts (:45-169), device-registry.ts (:50-114), remote-server-updater.ts (:14-58), desktop-relay-service.ts (:42-73), mobile-notification-replay.ts (:1-18, :30-49), e2ee-channel.ts (:32-43), worktrees.ts (:735-756), mobile-notifications.ts (:28-79), mobile-rpc-allowlist.test.ts (:1-85), index.ts (:1841-1854), app.json (:1-20), package.json (head), pair-scan.tsx (:1-72), README.md (pattern hits).
- Skipped: remaining ~1,100 `mobile/src` bodies, `_sources/*` (out of scope), rest of runtime-rpc.ts/index.ts/worktrees.ts.
- Nothing under `_sources/` or `Fabrica-app/` was modified (read-only pass).
