# Round 5 Wave 1 — Spot Verification B (R5-2.2)

> Task: ATLAS R5-2.2 · task task_fe4d604e2c15
> Targets: `discovery/round4/mc-ui-frontend.md` (source `_sources/mission-control/mission-control/src`) and `discovery/round4/bz-pair-relay-cli.md` (sources `_sources/buzz/crates/buzz-pair-relay`, `buzz-pairing-cli`, `buzz-core/src/pairing/*`)
> Method: sample file:line citations from each report, re-read the cited source regions, compare content + line numbers. READ-ONLY on all source trees.
> Date: 2026-08-23

---

## Verdict Summary

| Report | Cites Sampled | Exact | Minor | Failed | Coverage Statement | Verdict |
|---|---|---|---|---|---|---|
| `discovery/round4/mc-ui-frontend.md` | 16 | 15 | 1 | 0 | Present (§Scan Coverage Statement) | **PASS** |
| `discovery/round4/bz-pair-relay-cli.md` | 18 | 18 | 0 | 0 | Present (§10 Scan-Coverage Statement) | **PASS** |

Totals: **34 cites sampled — 33 exact, 1 minor (naming-level, content otherwise correct), 0 failed.**

---

## 1. mc-ui-frontend.md — Citation Verification

Base path: `_sources/mission-control/mission-control/src/`

| # | Report cite | Claim | Source evidence | Result |
|---|---|---|---|---|
| M1 | `components/layout-shell.tsx:67-121` | Full mount order (TooltipProvider→…→ActiveRunsProvider) | Verified line-by-line: TooltipProvider :68, skip-link :70, KeyboardShortcuts :71, OnboardingDialog :72, SearchDialog :73, CommandBar :74-84, backdrop :87-92, AppSidebar :94-102, offline banner :110-115, ActiveRunsProvider :116-118 — all exact; file is 123 lines as stated | EXACT |
| M2 | `layout-shell.tsx:23, 31-40` | `useState(true)` + mobile detection `<768` auto-close | :23 `useState(true)`; :31-40 effect with `window.innerWidth < 768` | EXACT |
| M3 | `layout-shell.tsx:47-65` | `handleCapture` POSTs `/api/brain-dump` w/ `{content, capturedAt, processed:false, convertedTo:null, tags:[]}` | :47-65 verbatim match incl. all five body fields | EXACT |
| M4 | `layout-shell.tsx:110-115` | Offline banner text "Connection lost — changes may not save…" | :110-115 exact text + pulsing dot | EXACT |
| M5 | `lib/api-client.ts:30-34` | Bearer token injection from `NEXT_PUBLIC_MC_API_TOKEN` | :30-34 exact (`headers.set("Authorization", \`Bearer ${token}\`)`); file is 66 lines as stated | EXACT |
| M6 | `api-client.ts:36-39, 43-62` + `:14-20` | GET/HEAD retry ≤2 on network/5xx only; mutations 0; base delay 500ms doubling | :37 `isMutation = method !== "GET" && method !== "HEAD"`, :38 `init?.retries ?? (isMutation ? 0 : 2)`, :39 `?? 500`, retry loop :43-62 with 4xx never retried (:47-48); ApiFetchInit :14-20 | EXACT |
| M7 | `hooks/use-data.ts:220,225,230,235,240,245,250,255,260` | Nine-hook factory table (useTasks 15s … useSkills none) | All nine definition lines exact: tasks 15_000 @:220, goals @:225, ventures @:230, brain-dump @:235, activity-log 30_000 @:240, inbox 10_000 @:245, decisions 10_000 @:250, agents @:255, skills @:260; file is 262 lines | EXACT |
| M8 | `use-data.ts:81-105` / `:107-148` | Optimistic PUT w/ revert; delete w/ 5s undo toast restoring `deletedAt:null` | :83 comment "Optimistic update", :94 revert-on-failure; undo block :122-140 with `deletedAt: null` @:130 and `duration: 5000` @:139 | EXACT |
| M9 | `hooks/use-sidebar.ts:15, 38-39, 63` | 10s poll; silent failure ("non-critical"); return shape | :15 `POLL_INTERVAL = 10_000`; :38-39 catch-comment verbatim "Silently fail on polls — sidebar badges are non-critical"; :63 return matches; 64 lines | EXACT |
| M10 | `hooks/use-active-runs.ts:8, 26-29, 116-155` | 3s poll of /api/runs + /api/missions via Promise.all; pendingDecision intercept → DecisionDialog → auto-resume | :8 `POLL_INTERVAL = 3000`; :26-29 Promise.all; intercept :126-131 sets `pendingTaskIdRef` + opens dialog; `handleDecisionAnswered` :147-155 re-invokes runTask; fetchRuns after actions at :138/:182/:203/:223; 255 lines | EXACT |
| M11 | `hooks/use-fast-task-poll.ts:5, 7-11, 16-24` | 5s accelerated re-poll while running, visibility-gated | :5 `FAST_POLL_INTERVAL = 5_000`; doc :7-11 states "Normal task polling is 15s"; effect :16-24 gated on `document.visibilityState === "visible"`; 25 lines | EXACT |
| M12 | `providers/active-runs-provider.tsx:7, 17-22, 27-32` | Context over ReturnType<typeof useActiveRuns>; mounts global DecisionDialog; consumer hook throws outside provider | :7 exact type alias; DecisionDialog props :17-22 wired to showDecisionDialog/pendingDecision/handleDecisionAnswered; throw guard :27-32; 33 lines | EXACT |
| M13 | `hooks/use-dashboard-data.ts:31-44, 46, 70-86` | DashboardData shape; POLL_INTERVAL = 15_000; visibility-gated effect | Interface :31-44 field-for-field; :46 exact constant; effect :70-86; 89 lines | EXACT |
| M14 | `hooks/use-daemon.ts:38-47, 49-69, 83` | DaemonStatus/DaemonConfig shapes; 5s poll | :38-47 DaemonStatus fields exact; :49-69 DaemonConfig incl. execution{maxTurns…maxTaskContinuations} + inbox; :83 `POLL_INTERVAL = 5000`; 183 lines | EXACT |
| M15 | `components/decision-dialog.tsx:28-35, 61-69, 74-79` | Props; direct apiFetch PUT /api/decisions `{id,status:"answered",answer}` bypassing use-data; setTimeout(onAnswered,300) | Props :28-33 (report's ":28-35" includes fn sig :35); PUT body :61-69 exact; :74-78 success→close→`setTimeout(() => onAnswered(), 300)`; 166 lines | EXACT |
| M16 | `components/mission-progress.tsx:36, 37` + §3.1 composition `app/page.tsx:67-74` | Progress counts failures: `(completedTasks + failedTasks)/totalTasks×100`; isActive ∈ {running,stalled}; page composes useDashboardData/useDaemon/useActiveRunsContext + field hooks + useFastTaskPoll | Formula :36 and isActive :37 EXACT; 147 lines. Composition :67-74 correct EXCEPT page calls `useActiveRuns()` directly (:70), not `useActiveRunsContext()` (import is `@/hooks/use-active-runs`) | MINOR |

### Negative claim reproduced

- §2.1/§4.1 "zero WebSocket/SSE usage anywhere in src" — independently re-grepped `EventSource\|WebSocket\|socket\.io` across `_sources/mission-control/mission-control/src`: **0 matches**. Confirmed.

### mc-ui-frontend.md findings register

1. **MINOR (M16)** — §3.1 says CommandCenterPage composes "`useActiveRunsContext`"; actual code at `app/page.tsx:70` invokes `useActiveRuns()` directly (the underlying hook), not the context accessor. Behavior identical (same state object); naming-level drift only. No correction required to conclusions.

---

## 2. bz-pair-relay-cli.md — Citation Verification

| # | Report cite | Claim | Source evidence | Result |
|---|---|---|---|---|
| B1 | `buzz-pair-relay/src/lib.rs:1-26`, `:4-5` | Crate doc contract; "No persistence. No auth. No history." | :5 exact sentence; full header matches deployment/security-model bullets (loopback-only + reverse-proxy MUST :9-16, security bullets :18-26) | EXACT |
| B2 | `lib.rs:59-89` constants table | CONN_TIMEOUT=120s :59, MAX_CONNS=128 :61, CHANNEL_CAP=4 :62, KIND_PAIR=24134 :63, MAX_FRAME=4096 :66, RATE_WINDOW/MSG/EVENT=10s/20/10 :67-69, SUB_ID_MAX=64 :70, MAX_EVENTS_PER_CONN=6 :73, MAX_DELIVERED_PER_P=12 :76, DEDUP_CAP=1024 / DELIVERED_MAP_CAP=4096 :79-82, ENTRY_TTL=300s :86, FRESHNESS_SECS=±120 :89 | Every name/value/line verified verbatim, including `pub(crate)` on CONN_TIMEOUT and both fail-closed comments | EXACT |
| B3 | `buzz-pair-relay/Cargo.toml:28-29` | Only crypto deps are secp256k1 + sha2 | :28 `secp256k1 = { version = "0.31" … }`, :29 `sha2 = "0.11"`; remaining deps are tokio/tungstenite/hyper stack as described; no buzz-core dep anywhere | EXACT |
| B4 | `buzz-pair-relay/src/main.rs:9-26` (+§3.9, §7.2) | Reads `BUZZ_PAIR_RELAY_BIND_ADDR`, default `127.0.0.1:5000`, no other knobs | :9-10 env var + `"127.0.0.1:5000"` fallback; bind + run through :26; file 27 lines | EXACT |
| B5 | `tests/integration.rs` test-definition lines | `test_no_replay` :205, `test_live_delivery` :239, `test_close_keeps_connection` :766, `test_req_after_close` :782, `test_conn_counter_no_leak` :990, `test_control_msg_backpressure` :1011, `test_ping_counts_toward_rate_limit` :1106, `test_fan_out_drop_doesnt_close` :1127, `test_reader_backpressure_closes` :1157, `test_multiple_subscribers_same_p` :1210 | Grep of `async fn test_*` confirms all ten definition lines exact | EXACT |
| B6 | `buzz-pairing-cli/Cargo.toml:15` | CLI pulls protocol from buzz-core workspace | :15 `buzz-core = { workspace = true }` | EXACT |
| B7 | `buzz-pairing-cli/src/main.rs:18-25` | Imports KIND_PAIRING, PairingSession, derive_sas/derive_session_id/derive_transcript_hash/format_sas, decode_qr/encode_qr, PayloadType, PairingError | :18-25 verbatim — every named symbol present in exactly that order | EXACT |
| B8 | `main.rs:45-71` Cmd enum + `:50` default relay + `:34-39` clap metadata | Three subcommands source/target/test-vectors; default `wss://relay.damus.io`; "interop testing tool" about-text | Cmd enum :45-71 with all three variants; :50 `default_value = "wss://relay.damus.io"`; clap attrs :34-39; CliError enum starts :73 (report §5.4 ":73-95") | EXACT |
| B9 | `buzz-pairing-cli/README.md:101-126` diagram, `:128` quote | Sequence diagram incl. EOSE-wait; "relay sees only opaque ciphertext between throwaway pubkeys" | Diagram block spans :103-126 under heading :101; :128 sentence verbatim | EXACT |
| B10 | `buzz-core/src/kind.rs:465` (+§8 `:699`) | `KIND_PAIRING: u32 = 24134`; registered in kind enum | :465 exact constant; :699 enum member | EXACT |
| B11 | `pairing/crypto.rs:26-28, 54-56, 70-75, 116-118` (+ overview :9-21) | Info strings `nostr-pair-{session-id,sas-v1,transcript-v1}`; derive_session_id HKDF salt=[]; derive_sas be_u32 mod 1_000_000; format_sas zero-pad 6 | :26-28 three info constants verbatim; :54-56 `hkdf32(b"", …)`; :72-73 `% 1_000_000` big-endian first 4 bytes; :116-118 `format!("{code:06}")`; overview diagram :9-21; ct_eq subtle::ConstantTimeEq :120-129; file 413 lines | EXACT |
| B12 | `pairing/session.rs:42-43, 46, 49-55, 58-75` (+flow :9-28) | DEFAULT_TIMEOUT=120s; kind alias; Role::Source/Target; seven-state SessionState | :42-43 exact; :46 `as u16` alias; Role :49-55; SessionState :58-75 with exactly Waiting/Confirming/AwaitingConfirmation/Transferring/PayloadExchanged/Completed/Aborted; FSM flow diagram :9-28 matches report's rendering; file 1,425 lines (~1,400 claimed) | EXACT |
| B13 | `pairing/types.rs:21-58, 61-72, 79-96` | Five kebab-case message types; PayloadType Nsec/Bunker/Connect/Custom; AbortReason w/ `#[serde(other)] Unknown` treated as protocol_error | PairingMessage enum :21-58 (offer/sas-confirm/payload/complete/abort, kebab-case tag :20); PayloadType :61-72 four variants; AbortReason :79-96 with `#[serde(other)] Unknown` :94-95 and "Treat as ProtocolError" guidance; 242 lines | EXACT |
| B14 | `pairing/mod.rs:35-80` | Ten-variant PairingError incl. InvalidQr, InvalidSessionId, SasMismatch, TranscriptMismatch, UnexpectedMessage{expected,got}, SessionExpired | Enum :35-80, exactly 10 variants, all six named ones present; 80 lines | EXACT |
| B15 | `deploy/charts/buzz/templates/pairing-relay.yaml:33, 37-38` (+§3.9 :43-48, :52-72) | Helm runs `/usr/local/bin/buzz-pair-relay` with `BUZZ_PAIR_RELAY_BIND_ADDR=0.0.0.0:<port>`; tcpSocket probes; Service | :33 command exact; :37-38 env `0.0.0.0:` + port; readiness/liveness tcpSocket :43-48; Service doc :52-72; file 72 lines as claimed | EXACT |
| B16 | `NIP-AB.md:611` Formal Verification (+§4 headings) | TLA+/formal section exists; spec structure Versions :9, QR Format :85, Event Kind :117, Event Validation :160, Security Considerations :521, Test Vectors :713 | Heading grep: `## Formal Verification` at :611; Versions :9; QR Code Format :85; Event Kind :117; Event Validation :160; Security Considerations :521; Test Vectors :713 — all exact | EXACT |
| B17 | `pairing/qr.rs:14, 34-48, 50-56, 79-93` | `nostrpair://` scheme; QrPayload fields; Drop-zeroize defeating dead-store elimination; encoder builds URI + v=1 | :14 URI format string verbatim; QrPayload :34-48 (source_pubkey/session_secret:[u8;32]/relays/version); Drop impl :50-56 with the dead-store comment; encode_qr :79-93 ending `&v=1`; 588 lines | EXACT |
| B18 | §2 workspace membership `Cargo.toml:27` + AGENTS.md labels | buzz-pair-relay in root workspace list; AGENTS.md repo-map descriptions | Root `_sources/buzz/Cargo.toml` lists `crates/buzz-pair-relay`; `_sources/buzz/AGENTS.md` Repo Structure carries the two quoted one-line labels ("Ephemeral sidecar relay for NIP-AB device pairing" / "CLI for NIP-AB device pairing interop testing") | EXACT |

### bz-pair-relay-cli.md findings register

No failures, no minors. Headline structural claim independently reproduced: the relay crate has **no buzz-core dependency** (B3) while the CLI does (B6).

---

## 3. Coverage-Statement Check

- **mc-ui-frontend.md** — explicit Scan Coverage Statement present (read-in-full list, sub-agent list, grepped-only list, skipped list incl. `app/api/**`, `app/field-ops/**`, vault crypto, tests). Consistent with the de-dup note vs round3. Line-count claims spot-checked matched actuals (layout-shell 123, provider 33, api-client 66, use-data 262, sidebar 64, active-runs 255, fast-poll 25, dashboard-data 89, daemon 183, decision-dialog 166, mission-progress 147, page.tsx 868).
- **bz-pair-relay-cli.md** — §10 Scan-Coverage Statement present and honest (declares integration-test bodies past line 120 read selectively, NIP-AB.md consulted selectively, `.scratch/e2e-pair-local.sh` unconfirmed, spthy existence-only). Declared line totals consistent with observed files (lib.rs 1,025; main.rs 27; cli main.rs 623; crypto.rs 413; qr.rs 588; types.rs 242; mod.rs 80; pairing yaml 72; session.rs ~1,400 vs actual 1,425).

## 4. Scan Coverage of This Verification Pass

- **Read fully:** layout-shell.tsx, api-client.ts, use-fast-task-poll.ts, active-runs-provider.tsx, use-sidebar.ts, use-active-runs.ts, use-data.ts, use-daemon.ts (lines 1-90 + total count), decision-dialog.tsx (:24-83 + total), mission-progress.tsx (:1-45 + total), app/page.tsx (:1-32, :60-79), pair-relay lib.rs (:1-120 + total), pair-relay Cargo.toml, pair-relay main.rs, pairing-cli main.rs (:1-80 + total), pairing-cli Cargo.toml, README.md (:95-128), crypto.rs (:1-130 + total), session.rs (:1-80 + total), types.rs (:1-100 + total), mod.rs (full), qr.rs (:1-95 + total), pairing-relay.yaml (:28-72 + total).
- **Grepped:** integration.rs test definitions (10 names); kind.rs KIND_PAIRING sites; NIP-AB.md headings; WebSocket/SSE sweep of MC src.
- **Not checked:** uncited regions of the two reports (autopilot/status-board/inbox page internals, lib.rs handlers :120-1025 bodies beyond constants, session.rs production body :80-796) — out of spot-verification scope per task brief.

## 5. Conclusion

Both reports **PASS** R5-2.2 spot verification. 34 citations sampled across the two documents: 33 line-exact, 1 cosmetic naming drift (mc-ui-frontend §3.1 `useActiveRunsContext` vs actual `useActiveRuns()` call — behaviorally equivalent), 0 failed claims. Both carry complete scan-coverage statements whose declared scope matched audited reality. No source files were modified during this pass.
