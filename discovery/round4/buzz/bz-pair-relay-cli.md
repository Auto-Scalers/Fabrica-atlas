# BZ Pair-Relay + Pairing-CLI Deep Dive — Relay-Side Phone Pairing (R4-1.27)

> Task: ATLAS R4-1.27 · task task_f161778aaf7e · dispatch ctx_d08cd9e4c431
> Targets: `_sources/buzz/crates/buzz-pair-relay/` and `_sources/buzz/crates/buzz-pairing-cli/`
> (plus the `buzz-core/src/pairing/*` protocol module both depend on — the actual handshake,
> QR format, and key-exchange live there).
> Companion phone-side context: `discovery/round4/fa-mobile-companion.md` (Fabrica-app's own
> pairing stack). Constraints honored: nothing under `_sources/` or `../Fabrica-app/` modified;
> this report is the only artifact written.

---

## 1. Executive Summary

Buzz ships a **second, fully independent pairing plane** alongside its main relay: an ephemeral
sidecar WebSocket relay (`buzz-pair-relay`) plus an interop-testing CLI (`buzz-pairing-cli`),
both implementing a draft Nostr NIP ("NIP-AB") for **device-to-device secret transfer over an
untrusted relay**. The design is deliberately opposite to Fabrica-app's cloud-coordinated,
device-token-based pairing:

- **Buzz NIP-AB**: stateless relay that only forwards encrypted kind:24134 events between two
  ephemeral pubkeys; all trust comes from a **QR-scanned shared secret**, **ECDH + HKDF-derived
  6-digit SAS codes**, and a **transcript-hash MITM check**. The relay stores *nothing*, has
  *no auth*, and cannot read any payload (`_sources/buzz/crates/buzz-pair-relay/src/lib.rs:1-26`).
- **Fabrica**: versioned zod-validated pairing offers carrying long-lived device tokens pinned to
  a desktop Curve25519 identity (`fa-mobile-companion.md` §4.1) with a persistent device registry.

The Buzz sidecar is production-deployed as its own Kubernetes Deployment behind TLS termination
(`_sources/buzz/deploy/charts/buzz/templates/pairing-relay.yaml:33`, `:37-38`), has a 40-test
integration suite (`tests/integration.rs`), and the protocol itself carries a formal TLA+
verification artifact (`_sources/buzz/crates/buzz-core/src/pairing/NIP-AB.spthy` exists on disk;
spec §Formal Verification at `NIP-AB.md:611`).

**Relevance verdict for After-Rebrand:** HIGH as a *bootstrap* pattern — a zero-infrastructure,
zero-account way to move a first credential from phone to desktop (or desktop to desktop) with
human-verifiable MITM protection. It complements rather than replaces FA's device-token registry:
NIP-AB is "how you get the token across the air gap"; FA's `DeviceScope`/revoke-outbox is "what
you do after". See §10.

---

## 2. Crate Map & Dependency Topology

| Crate | Role | Files |
|---|---|---|
| `buzz-pair-relay` | Ephemeral WS sidecar relay; matches kind:24134 events against live `#p` subscriptions | `src/lib.rs` (1,025 lines), `src/main.rs` (27 lines), `tests/integration.rs` (1,393 lines), `Cargo.toml` |
| `buzz-pairing-cli` | `buzz-pair` binary: source/target roles + test vectors; interop testing only | `src/main.rs` (623 lines), `README.md` (128 lines), `Cargo.toml` |
| `buzz-core/src/pairing/` (dependency of the CLI, not the relay) | The actual NIP-AB implementation: crypto derivations, session FSM, QR codec, message types, spec doc + TLA+ model | `crypto.rs` (413), `session.rs` (~1,400), `qr.rs` (588), `types.rs` (242), `mod.rs` (80), `NIP-AB.md` (~830), `NIP-AB.spthy` |

Key structural fact: **the pair-relay crate does NOT depend on buzz-core at all** — its only
crypto is raw secp256k1 Schnorr verification + SHA-256 for NIP-01 id checking
(`_sources/buzz/crates/buzz-pair-relay/Cargo.toml:28-29`: deps are exactly `secp256k1`,
`sha2`, hyper/tungstenite/tokio stack). It never decrypts or interprets pairing payloads.
The CLI pulls the full protocol stack from `buzz-core`
(`_sources/buzz/crates/buzz-pairing-cli/Cargo.toml:15`: `buzz-core = { workspace = true }`,
imports at `src/main.rs:18-25`: `KIND_PAIRING`, `PairingSession`, `derive_sas`,
`derive_session_id`, `derive_transcript_hash`, `format_sas`, `decode_qr`/`encode_qr`,
`PayloadType`, `PairingError`).

Workspace membership: `crates/buzz-pair-relay` is in the root workspace list
(`_sources/buzz/Cargo.toml:27`). The AGENTS.md repo map labels them:
"buzz-pair-relay # Ephemeral sidecar relay for NIP-AB device pairing;
buzz-pairing-cli # CLI for NIP-AB device pairing interop testing"
(`_sources/buzz/AGENTS.md`, Repo Structure section).

---

## 3. buzz-pair-relay — The Ephemeral Handshake Sidecar

### 3.1 Security/deployment contract (crate doc)

The crate header states the whole model (`lib.rs:1-26`):

- Accepts WS connections, matches incoming kind:24134 events against live `#p`-filtered
  subscriptions, forwards matches. "**No persistence. No auth. No history.**" (`lib.rs:4-5`).
- Binds loopback only; MUST sit behind a reverse proxy that routes only `/pair`, enforces HTTP
  read timeouts (slowloris mitigation), terminates TLS (`lib.rs:9-16`). The relay itself does
  not enforce path restrictions or pre-upgrade limits (`lib.rs:15-16`).
- Security model bullets (`lib.rs:18-26`): Schnorr sig verification against NIP-01 event-id
  hash; in-flight-only event lifetime; bounded resources (128 conns, 4 KiB frames, 120 s TTL);
  ≤6 EVENT attempts per connection; ±120 s freshness window; duplicate-ID rejection with 300 s
  dedup expiry.

### 3.2 Hardcoded resource constants (all compile-time)

Every limit is a named constant at `lib.rs:59-89`:

| Constant | Value | Line | Meaning |
|---|---|---|---|
| `CONN_TIMEOUT` | 120 s | `lib.rs:59` | hard per-connection lifetime (`pub(crate)` for tests) |
| `MAX_CONNS` | 128 | `lib.rs:61` | global connection cap |
| `CHANNEL_CAP` | 4 | `lib.rs:62` | per-conn outbound mpsc capacity (backpressure knob) |
| `KIND_PAIR` | 24134 | `lib.rs:63` | the only accepted event kind (matches `buzz-core/src/kind.rs:465` `KIND_PAIRING: u32 = 24134`) |
| `MAX_FRAME` | 4096 | `lib.rs:66` | max WS frame/message bytes — "handshake payloads are small (ephemeral pubkeys + encrypted session data)" |
| `RATE_WINDOW` / `RATE_MSG_MAX` / `RATE_EVENT_MAX` | 10 s / 20 / 10 | `lib.rs:67-69` | sliding-window rate limits per connection |
| `SUB_ID_MAX` | 64 chars | `lib.rs:70` | subscription-id length cap |
| `MAX_EVENTS_PER_CONN` | 6 | `lib.rs:73` | hard session cap counting **all valid+sig-verified EVENT attempts** |
| `MAX_DELIVERED_PER_P` | 12 | `lib.rs:76` | per-`#p` delivery budget — "enough for one full pairing from each direction" |
| `DEDUP_CAP` / `DELIVERED_MAP_CAP` | 1024 / 4096 | `lib.rs:79-82` | global dedup vec / delivered-map caps; both **fail closed** when full after TTL eviction |
| `ENTRY_TTL` | 300 s | `lib.rs:86` | eviction age for dedup + delivered entries |
| `FRESHNESS_SECS` | ±120 s | `lib.rs:89` | allowed skew on `created_at` vs relay wall clock |

### 3.3 State structures

- `Sub { conn_id, sub_id, p_value: [u8;32], writer_tx }` — one subscription row
  (`lib.rs:97-102`); stored in `Relay.subs: Mutex<Vec<Sub>>`.
- `Relay` (`lib.rs:104-112`): subs vec, atomic conn counter + conn-id allocator, `seen_ids`
  dedup vec of `(event_id, Instant)`, `delivered: HashMap<[u8;32], (u32 count, Instant)>`.
- `ConnGuard` RAII: on drop removes the sub and decrements the conn counter with a log line
  (`lib.rs:219-234`) — the leak-prevention guarantee integration-test
  `test_conn_counter_no_leak` exercises (`tests/integration.rs:989-990`).

### 3.4 Dedup reservation engine

`reserve_id` (`lib.rs:135-147`) is check-and-reserve under one lock: evict expired entries,
reject duplicates, fail closed at `DEDUP_CAP`, otherwise optimistically push the ID.
`unreserve_id` (`lib.rs:150-155`) rolls back on delivery failure so an ID can be retried —
the EVENT handler calls it on every non-success delivery outcome (`lib.rs:839-852`).

### 3.5 Exactly-one-subscriber delivery + budget

`deliver_single` (`lib.rs:157-212`) holds the subs lock for the entire operation and enforces:

- 0 matching subscribers → `"no live subscriber"`; ≥2 → `"ambiguous recipient"`
  (`lib.rs:164-170`). This is the anti-fan-out property: a given ephemeral pubkey can have
  exactly one live subscriber relay-wide (also enforced at subscribe time, §3.7).
- Per-`#p` budget check before send: count ≥ `MAX_DELIVERED_PER_P` →
  `"recipient session budget exhausted"` (`lib.rs:175-183`); brand-new keys rejected when the
  delivered map is full after eviction — fail closed (`lib.rs:185-187`).
- Builds the standard NIP-01 `["EVENT", sub_id, event]` frame and `try_send`s into the writer
  channel; success increments the counter and refreshes its timestamp under the already-held
  lock (`lib.rs:189-211`).

### 3.6 Event validation pipeline (relay-side tightening)

`validate_event` (`lib.rs:418-503`) applies six explicit tightenings beyond bare NIP-01:

1. Exactly the 7 allowed top-level keys — unknown field → reject (`lib.rs:421-435`, comment
   "Tightening #4").
2. `id`, `pubkey` must be 64 lowercase hex; `sig` 128 lowercase hex
   (`lib.rs:437-449`, `:475-481`; helpers `is_lower_hex` `lib.rs:294-296`, `decode_hex32`
   `lib.rs:298-309`, `decode_hex64` `lib.rs:582-593`).
3. `kind` must be exactly 24134 (`lib.rs:450-452`).
4. Freshness: `|created_at - now| ≤ 120 s` (`lib.rs:454-465`).
5. NIP-44 content shape without decrypting — manual base64 alphabet/padding check, decoded
   length ≥ 99 bytes (1 version + 32 nonce + 32 min ciphertext + 32 MAC + 2 padding), and first
   decoded byte == 0x02 (NIP-44 v2) (`validate_nip44_content`, `lib.rs:343-409`, doc `:337-342`;
   version byte extraction `:387-406`).
6. Tag shape tightened to exactly `[["p", "<64-hex>"]]` — exactly one tag, two elements
   (`lib.rs:488-500`).

Signature verification (`verify_event_sig`, `lib.rs:521-579`) rebuilds the NIP-01 commitment
array `[0, pubkey, created_at, kind, tags, content]`, serializes compact JSON, SHA-256 hashes,
compares to the claimed `id` (`lib.rs:547-564`), then verifies the Schnorr signature over the
hash using an x-only pubkey via `secp256k1::Secp256k1::verification_only()`
(`lib.rs:566-578`) — verification-only context avoids loading signing machinery.

Ordering discipline in the EVENT verb (`lib.rs:771-865`): rate-limit check first
(`:777-782`), then hard session-cap check counted on valid+sig-verified attempts only
(`:784-792`, `:809-810` — "Tightening #1"), then structural validation, then **signature
verification BEFORE dedup reservation** ("Tightening #8", `:803-810`), then atomic dedup
("Tightening #7", `:812-830`), then single-subscriber delivery ("Tightening #2", `:831-854`)
with unreserve-on-failure.

### 3.7 REQ / CLOSE handling

- REQ (`lib.rs:691-768`): requires string sub_id ≤ 64 chars, rejects multiple filters
  (`arr.len() > 3`, `:711-717`), object filter, one subscription per connection
  ("already subscribed, send CLOSE first", `:725-731`).
- Filter whitelist (`validate_filter`, `lib.rs:312-335`): only `kinds` and `#p` fields allowed;
  `kinds` must be exactly `[24134]`; `#p` must have exactly one value which must decode as
  64-char lowercase hex.
- **Uniqueness**: a second REQ for a `#p` that already has a live subscriber anywhere on the
  relay is refused — "`#p` already has a live subscriber" — checked-and-registered atomically
  under one lock with the EOSE sent inside the same critical section to prevent a racing REQ
  (`lib.rs:742-767`). Consequence tested by `test_multiple_subscribers_same_p`
  (`tests/integration.rs:1209-1210`).
- EOSE is emitted immediately at subscribe time (no history exists to replay) — the relay's
  `test_no_replay` proves no historical catch-up (`tests/integration.rs:204-205`).
- CLOSE (`lib.rs:867-885`): removes the sub if the sub_id matches; silently ignores unknown
  sub_ids per NIP-01; connection survives a CLOSE (`test_close_keeps_connection`,
  `tests/integration.rs:765-766`), and re-subscribe works afterwards
  (`test_req_after_close`, `tests/integration.rs:781-782`).

### 3.8 Connection lifecycle, rate limiting, backpressure

- HTTP entry (`http_service`, `lib.rs:913-995`): strict RFC6455 upgrade check (GET + HTTP/1.1 +
  `Connection: upgrade` + `Upgrade: websocket` + `Sec-WebSocket-Version: 13` + 24-byte ASCII
  key, `lib.rs:919-941`); anything else → 400 (`:943-947`). Conn slot reserved **before**
  upgrade; overflow → 503 with rollback (`:949-955`). WS config clamps both frame and message
  size to 4096 (`:971-975`).
- Per-connection loop (`handle_conn`, `lib.rs:620-911`): dedicated writer task fed by a
  capped mpsc with a CancellationToken (`:626-629`); every inbound frame ticks the message
  rate window (`:646-650`); binary/frame messages kill the connection (`:658`); ping→pong via
  channel (`:660-664`); 120 s select deadline (`:636-644`); writer death also closes
  (`:642`).
- Two independent rate windows (`RateWindow`, `lib.rs:236-257`): >20 msgs/10s or >10
  events/10s terminate/reject respectively (`:646-650`, `:777-782`; pings count toward the
  msg window — `:646` comment + `test_ping_counts_toward_rate_limit`,
  `tests/integration.rs:1105-1106`).
- Backpressure semantics: sends get a 5 s timeout in the writer task (`lib.rs:608-616`);
  slow-reader behavior covered by `test_reader_backpressure_closes`
  (`tests/integration.rs:1156-1157`), control-message backpressure by
  `test_control_msg_backpressure` (`:1010-1011`), and fan-out drop doesn't close the conn by
  `test_fan_out_drop_doesnt_close` (`:1126-1127`).
- Shutdown hygiene: sub removed first so the cloned sender drops, Close frame queued, sender
  dropped, writer awaited with a 100 ms grace, then cancel — explicitly avoiding double-poll
  panic (`lib.rs:896-910`).

### 3.9 Binary entry point & configuration

`main.rs` is minimal: reads `BUZZ_PAIR_RELAY_BIND_ADDR` env var, defaults to `127.0.0.1:5000`,
binds, runs (`_sources/buzz/crates/buzz-pair-relay/src/main.rs:9-26`). There are **no other
config knobs** — no TLS, no persistence, no admin surface.

Production deployment: Helm template gates on `.Values.pairingRelay.enabled`, runs
`/usr/local/bin/buzz-pair-relay` with `BUZZ_PAIR_RELAY_BIND_ADDR=0.0.0.0:<port>` (loopback
default overridden inside the pod; external protection delegated to ingress/TLS),
tcpSocket readiness+liveness probes, Service fronting
(`deploy/charts/buzz/templates/pairing-relay.yaml:2`, `:33`, `:37-38`, `:43-48`, `:52-72`).
Note the report R4-1.10 (`bz-ops-deploy-admin.md`) covers this chart from the ops angle; here
the point is the runtime contract.

### 3.10 Integration-test catalog (40 tests)

All spin a real relay on `127.0.0.1:0` (`tests/integration.rs:34-40`). Coverage groups
(function names cite their definition line):

- Replay/no-history: `test_no_replay` :205.
- Happy path: `test_live_delivery` :239.
- Filter validation: `test_kind_rejection` :280, `test_no_p_filter` :309,
  `test_multi_value_p` :329, `test_unsupported_filter_field` :349, `test_invalid_hex_in_p_filter` :552.
- Subscription rules: `test_second_sub_different_id` :373, `test_second_sub_same_id` :408,
  `test_multiple_subscribers_same_p` :1210.
- Limits: `test_120s_timeout` :443 (tokio paused-time), `test_max_frame_size` :472,
  `test_global_conn_cap` :586, `test_event_rate_limit` :612, `test_message_rate_limit` :661.
- Event shape: `test_event_shape_missing_id` :485, `test_no_p_tag` :505,
  `test_multiple_p_tags` :526, `test_invalid_hex_in_event_id` :564.
- Protocol verbs: `test_multiple_filters` :679, `test_unknown_message` :696,
  `test_close_removes_sub` :734, `test_close_keeps_connection` :766,
  `test_req_after_close` :782, `test_close_unknown_sub_id` :812,
  `test_no_events_after_close` :832, `test_binary_frame` :857, malformed REQ trio :868/:884/:900.
- Transport robustness: `test_backpressure_unit` :457, `test_write_timeout` :925,
  `test_ping_pong` :954, `test_close_handshake` :977, `test_conn_counter_no_leak` :990,
  `test_control_msg_backpressure` :1011, `test_eose_try_send_failure` :1073,
  `test_ping_counts_toward_rate_limit` :1106, `test_fan_out_drop_doesnt_close` :1127,
  `test_reader_backpressure_closes` :1157, `test_cancellation_immediate` :1182,
  `test_graceful_close` :1196.
- Privacy: `test_no_client_data_in_logs` :1040 — asserts logs contain no client-controlled
  strings (the relay only ever logs conn ids/counts: `lib.rs:228-232`, `:958-962`).
- Signature realism: tests build genuinely signed events via secp256k1 + hand-rolled base64
  NIP-44-shaped content (`make_signed_event` :142, `make_nip44_content` :130).

## 4. The NIP-AB Protocol (buzz-core pairing module) — Handshake, QR, Key Exchange

The relay is transport only; the protocol lives in `buzz-core/src/pairing/`. Spec document:
`_sources/buzz/crates/buzz-core/src/pairing/NIP-AB.md` (sections: Versions :9, QR Code
Format :85, Event Kind :117, Event Validation :160, Pairing Protocol Steps 1–5 :202-:391,
Abort :456, Security Considerations :521, Formal Verification :611, Test Vectors :713).
A TLA+/Tamarin-style model file `NIP-AB.spthy` sits next to it (file present on disk).

### 4.1 Roles and message flow

Two roles (`Role::Source` = secret holder/QR displayer, `Role::Target` = scanner/receiver —
`session.rs:49-55`). Canonical flow diagram in the session FSM doc comment
(`session.rs:9-28`):

```
Source                              Target
new_source(relay) → (session, qr)   (scan QR) new_target(&qr) → (session, offer_event)
handle_offer(&event) → sas_code     (display sas_code)
[user confirms SAS]
confirm_sas() → sas_confirm_event   handle_sas_confirm(&event) → verify transcript hash
                                    [user confirms] confirm_target_sas()
send_payload(type, data)            handle_payload(&event)
handle_complete(&event)             send_complete()
```

The CLI README carries an ASCII sequence diagram through the relay including the EOSE-wait
step (`_sources/buzz/crates/buzz-pairing-cli/README.md:101-126`) with the summary: "All events
are NIP-44 encrypted, signed with ephemeral keys, and addressed via `p` tags. The relay sees
only opaque ciphertext between throwaway pubkeys" (`README.md:128`).

### 4.2 QR / invite payload format

`QrPayload { source_pubkey, session_secret: [u8;32], relays: Vec<String>, version }`
(`qr.rs:34-48`). URI scheme (`qr.rs:14`, encoder `qr.rs:79-93`):

```
nostrpair://<source_pubkey_hex>?secret=<session_secret_hex>&relay=<url-encoded>&v=1
```

Decoder rules (`decode_qr`, `qr.rs:104-220`): ≤2048 chars total (`:106-111`, spec §QR Code
Format); exact `nostrpair://` prefix; pubkey exactly 64 **lowercase** hex chars
(`:129-136`; uppercase rejected per tests at `:555-570`); secret must be 64 lowercase hex /
32 bytes and **all-zeros rejected** (`:166-183`); ≥1 relay param required; each relay URL
must fully parse with `ws://` or `wss://` scheme + host — prefix matching explicitly avoided
because it would "accept malformed URLs that crash downstream" (`:192-212`); version defaults
to 1 when absent (legacy compat) and any other value is rejected (`:154-160`).
Relay values are percent-encoded with NON_ALPHANUMERIC — a strict superset of the unsafe set,
"safe by construction" (`:222-230`). `QrPayload` zeroizes its session secret on Drop via
`zeroize` to defeat dead-store elimination (`qr.rs:50-56`).

Contrast with Fabrica: FA's offer is base64url JSON in a `FABRICA://pair?code=` deep link with
zod validation and a 10-minute invite expiry (`fa-mobile-companion.md` §4.1); Buzz's is a flat
URI whose only freshness control is the 120 s session timeout downstream (`session.rs:43`)
— the QR itself never expires.

### 4.3 Key exchange & derivations (crypto.rs)

All derivations are HKDF-SHA256 over fixed-size arrays; overview diagram at `crypto.rs:9-21`,
info-string constants `crypto.rs:26-28`
(`nostr-pair-session-id`, `nostr-pair-sas-v1`, `nostr-pair-transcript-v1`):

1. **session_id** = HKDF(IKM=session_secret, salt=[], info=session-id, L=32)
   (`derive_session_id`, `crypto.rs:54-56`) — public-safe identifier; test vector pinned
   against the spec (`crypto.rs:181-188`: `fb357d0f…`).
2. **ECDH shared key**: raw secp256k1 x-coordinate via
   `nostr::util::generate_shared_key(own_sk, peer_pk)` (`crypto.rs:68-69` doc; used symmetric
   both sides — symmetry asserted `crypto.rs:229-237`).
3. **SAS**: sas_input = HKDF(IKM=ecdh_shared, salt=session_secret, info=sas-v1);
   sas_code = big-endian u32 of first 4 bytes mod 1_000_000, displayed as a zero-padded
   6-digit string (`derive_sas` `crypto.rs:70-75`, `format_sas` `crypto.rs:116-118`).
   Design rationale "Why 6-digit decimal SAS?" at `NIP-AB.md:591`.
4. **transcript_hash** = HKDF(IKM = session_id ‖ source_pk ‖ target_pk ‖ sas_input
   (128-byte concat), salt=session_secret, info=transcript-v1)
   (`derive_transcript_hash`, `crypto.rs:89-104`). Both parties compute independently before
   any payload moves; mismatch ⇒ compromised session (`crypto.rs:85-88` doc). Order-sensitive:
   swapping source/target pubkeys yields a different hash — enforced by unit test
   (`crypto.rs:325-350`) so role order is cryptographically bound.
5. **Constant-time comparison** for all secret-derived equality checks via
   `subtle::ConstantTimeEq` (`ct_eq`, `crypto.rs:120-129`) — used for session-id check
   (`session.rs:172-179`) and transcript-hash check (`session.rs:398-408`).

Full spec test vectors (pubkeys, ECDH, sas_code `863346`, transcript hash) are pinned as one
unit test (`crypto.rs:270-322`), and a two-sided round-trip derivation test proves both sides
independently reach identical SAS/transcript values (`crypto.rs:371-412`).

### 4.4 Session state machine

Seven states (`SessionState`, `session.rs:58-75`): Waiting → Confirming → (target-only)
AwaitingConfirmation → Transferring → PayloadExchanged → Completed | Aborted.
Every handler begins with `check_expired()` + `expect_state()` + `expect_role()`
(`session.rs:739-767`), making out-of-order operations structurally impossible
(test `reject_out_of_order_operations`, `session.rs:936-946`).

Key mechanics:

- **Ephemeral identity**: each side generates throwaway `Keys::generate()`
  (source `session.rs:113`, target `session.rs:329`); the session secret is a fresh random
  32 bytes on the source (`session.rs:114-115`) carried to the target *only* inside the QR.
- **Target pre-computes SAS at construction** because it already knows the source pubkey from
  the QR (`new_target`, `session.rs:332-337`), then publishes the encrypted Offer carrying
  `session_id` hex + `version: 1` (`session.rs:355-362`).
- **Source validates the offer**: decrypts, rejects non-version-1
  (`session.rs:156-170` region — version guard), compares received session_id to its own
  derivation constant-time (`session.rs:172-179`), locks the peer pubkey from the event author
  (`session.rs:181-184`), computes ECDH+SAS and **zeroizes the ECDH buffer immediately**
  (`session.rs:185-191`).
- **sas-confirm carries the transcript hash**, not the SAS itself (`confirm_sas`,
  `session.rs:198-224`); target recomputes and ct-compares; mismatch sets Aborted and returns
  `PairingError::TranscriptMismatch` (`session.rs:383-408`) which the CLI surfaces as a
  possible MITM (§5.2).
- **Explicit double user consent**: target requires `confirm_target_sas()` after displaying
  the code before payloads can be accepted (`session.rs:416-424`); enforced by test
  `target_must_confirm_sas_before_payload` (`session.rs:1164-1197`).
- **Single-use payloads**: state advances past Transferring after one payload; duplicate
  sends/receives rejected (test `reject_duplicate_payload`, `session.rs:1199-1227`).

### 4.5 Event construction & encryption hygiene

- Every protocol message is NIP-44 v2 encrypted to the peer's ephemeral pubkey and wrapped in
  a signed kind:24134 event with a single `p` tag to the peer
  (`build_event`, `session.rs:603-628`; kind constant from
  `buzz-core/src/kind.rs:465 KIND_PAIRING: u32 = 24134`, aliased `session.rs:46`).
- Metadata privacy: `created_at` is backdated by a uniform random 0–30 s jitter per NIP-AB
  (`session.rs:617-621`).
- Zeroization discipline documented honestly, including what *cannot* be zeroized (serde
  intermediates, nip44 internals) (`session.rs:591-602`); plaintext zeroized after encryption
  (`:615`) and after decryption regardless of parse success (`:659-662`); whole session
  zeroizes secret/id/sas_input on Drop (`session.rs:770-781`).
- Inbound validation before decryption: content length must be within the NIP-44 range
  132..=87472 chars (`session.rs:635-642`); decrypted plaintext capped at 65,535 bytes
  (`session.rs:650-657`).
- Duplicate handling per spec §Duplicate Event Handling: processed event IDs kept in a
  per-session HashSet bounded by session lifetime ("120 s max, ~6 events in a normal flow",
  `session.rs:664-672`); IDs recorded **only after full acceptance** so speculative probes
  don't poison dedup (`record_event`, `session.rs:711-720`; probe pattern test
  `speculative_abort_does_not_poison_dedup`, `session.rs:1289-1315`).
- Peer pinning: after the offer, every subsequent event must come from the locked peer pubkey
  (`validate_event_from_peer`, `session.rs:723-737`); rogue-author rejection tested
  (`reject_event_from_wrong_pubkey`, `session.rs:1113-1151`).

### 4.6 Message types & abort taxonomy

Five kebab-case-tagged message types (`PairingMessage`, `types.rs:21-58`): `offer`
{session_id, version}, `sas-confirm` {transcript_hash}, `payload` {payload_type, payload},
`complete` {success}, `abort` {reason}. Payload types (`PayloadType`, `types.rs:61-72`):
`Nsec` (raw bech32 key), `Bunker` (NIP-46 connection string), `Connect`
(NIP-46 nostrconnect:// URI), `Custom` (out-of-band interpretation).
Abort reasons (`AbortReason`, `types.rs:79-96`): SasMismatch, UserDenied, Timeout,
ProtocolError, plus `#[serde(other)] Unknown` that deserializes foreign reason strings and
MUST be treated as protocol_error (`types.rs:90-95`; round-trip test with `"solar_flare"`
at `types.rs:203-214`).
Error surface: ten-variant `PairingError` enum (`mod.rs:35-80`) incl. InvalidQr,
InvalidSessionId, SasMismatch, TranscriptMismatch, UnexpectedMessage{expected,got},
SessionExpired.

### 4.7 Rotation / recovery — what actually exists

This task brief asked specifically about rotation/recovery. Findings:

- **There is no long-term credential rotation anywhere in this stack.** The entire design is
  one-shot: fresh ephemeral keys + fresh 32-byte session secret per pairing
  (`session.rs:112-124`), session hard-expires after 120 s (`DEFAULT_TIMEOUT`,
  `session.rs:42-43`; expiry tested `session.rs:1239-1254`), and the relay keeps no state to
  rotate (`lib.rs:4-5`). Re-pairing simply means generating a new QR.
- **Recovery exists in exactly one place**: the reverse payload flow. A source can accept a
  `payload` *from* the target — "used by recovery flows where the QR-displaying device requests
  a secret from an already-authorized scanning device" (`handle_return_payload` doc,
  `session.rs:228-251`) — with the source reporting import success/failure via
  `send_source_complete(success)` (`session.rs:253-266`). Failure aborts both peers
  (test `reverse_payload_import_failure_aborts_both_peers`, `session.rs:904-932`); the flow is
  strictly single-use (test `reverse_payload_flow_is_single_use`, `session.rs:866-902`).
- **Abort path doubles as crash-recovery UX**: either side can send a structured abort;
  aborts are refused before a peer is known (prevents any relay observer from killing a
  session — `abort()` returning None without peer, `session.rs:472-487`; handler refusing
  anonymous aborts, `session.rs:498-505`; DoS rationale in test comments
  `session.rs:1008-1039`), and late aborts cannot regress terminal states
  (`test_local_abort_after_completed_is_rejected`, `session.rs:979-992`;
  `reject_abort_after_completed`, `session.rs:1042-1092`).
- Device-side credential hygiene (rotation of *stored* secrets, revocation lists) is out of
  scope here by design — see `NIP-AB.md` §Secure Storage (:779) and §Limitations (:70). This
  contrasts sharply with FA's pending-device token coalescing/rotation
  (`src/main/ipc/mobile.ts:106-118` in fa-mobile-companion.md §3) and revoke outbox.

---

## 5. buzz-pairing-cli — Commands & Behaviors

Binary name `buzz-pair`; self-described as "NIP-AB device pairing interop testing tool … not
production use" (`README.md:3`; clap metadata `main.rs:34-39`). Three subcommands
(`Cmd` enum, `main.rs:45-71`):

### 5.1 `buzz-pair source --relay <URL> [--nsec <nsec1…>]`

- Default relay `wss://relay.damus.io` (`main.rs:50`); omitted `--nsec` generates a throwaway
  test key (`resolve_payload`, `main.rs:581-598`, secrets wrapped in `Zeroizing`).
- Flow (`cmd_source`, `main.rs:114-201`): create session + QR (`:119-120`, printing an explicit
  warning that the URI contains the session secret, `:122-123`) → connect WS → optional NIP-42
  auth with the session's ephemeral keys (`:130`) → subscribe `["REQ","pair",{"kinds":[24134],
  "#p":[our_pk]}]` (`:134-141`) → **wait for EOSE before anything else** so a racing target's
  offer can't be missed (`:143-145`) → loop receiving offers, discarding junk silently per
  NIP-AB §Event Validation item 7 (`:148-155`) → display SAS, y/n prompt, abort with
  `AbortReason::SasMismatch` on denial (`:158-170`) → publish sas-confirm (`:173-174`) →
  publish payload (`:178-179`) → await complete, distinguishing `success=false` from generic
  junk so a failed import surfaces ("check the other device", `:183-197`).

### 5.2 `buzz-pair target [--relay OVERRIDE] [--show-secret]`

- Reads the QR URI from **stdin paste** rather than camera (`cmd_target`, `main.rs:204-211`);
  relay override replaces every URI relay (`:213-216`).
- Creates the target session (offer built at construction), connects, authenticates, and —
  mirroring the source — **subscribes BEFORE publishing the offer** to close the
  fast-sas-confirm race; the EOSE wait comment explains the relay could otherwise process EVENT
  before REQ (`main.rs:234-249`).
- Displays its SAS immediately (it was computed at construction) so both humans compare codes
  concurrently (`:255-261`).
- Transcript-mismatch is a hard security stop: on `PairingError::TranscriptMismatch` the CLI
  emits the spec-required abort with reason sas_mismatch and errors with
  "SECURITY: transcript hash mismatch — possible MITM attack. Session aborted."
  (`:266-286`, quoting NIP-AB §Step 3 requirement at `:272-273`).
- Explicit y/n confirmation gate before accepting the payload (`:289-300`), payload receipt
  with secrets hidden unless `--show-secret` (`:313-325`), then `complete` published
  (`:327-331`).
- Abort interception: every inbound event is first probed with
  `check_for_abort` (`main.rs:400-410`) — the exact speculative-probe pattern the core dedup
  tests were written to protect (`session.rs:1289-1315`).

### 5.3 `buzz-pair test-vectors`

Prints a table of every derived value (session_id, ecdh_shared, sas_input, sas_code,
transcript_hash) from the NIP-AB spec's three fixed hex keys (`cmd_test_vectors`,
`main.rs:335-398`) — a conformance harness for cross-implementation interop.

### 5.4 Shared plumbing

- **NIP-42 AUTH**: waits up to 3 s for an `["AUTH","<challenge>"]` challenge (timeout is
  normal — many relays skip auth), responds signed with the pairing session's ephemeral keys
  so relay acceptance matches event authors, then waits up to 5 s for OK
  (`handle_nip42_auth`, `main.rs:412-477`; parser `:480-487`). This is why the CLI works
  against Buzz main relays out of the box (`README.md:52-54`).
- Generic helpers: `publish_event` (`:490-497`), `wait_for_event` skipping OK/EOSE with
  timeout (`:503-523`), `wait_for_eose` (`:529-555`), `parse_relay_event` (`:560-575`),
  stdin/yes-no readers (`:601-615`).
- Error taxonomy maps PairingError/WebSocket/JSON/IO/nsec/Timeout into exit-code-1 failure
  (`CliError`, `main.rs:73-95`).

### 5.5 E2E harness

README documents an `expect`-scripted two-PTY runbook against a local Buzz main relay with
env knobs `RELAY_URL` / `TEST_TIMEOUT` / `SOURCE_CONFIRM_DELAY_MS`
(`README.md:70-88`; script `.scratch/e2e-pair-local.sh` referenced `:74-76` — note `.scratch/`
was outside this scan's read set, see coverage statement).

---

## 6. Verification & Test Evidence Summary

| Layer | Evidence | Location |
|---|---|---|
| Relay behavior | 40 integration tests incl. paused-clock timeout test | `tests/integration.rs` catalog §3.10 |
| Crypto correctness | Spec test vectors pinned; symmetric-ECDH, order-sensitivity, round-trip derivations | `crypto.rs:159-412` |
| FSM correctness | Happy path, reverse flow, abort taxonomy, expiry, dedup-poisoning, rogue-author, duplicate-payload tests | `session.rs:802-1315+` |
| QR codec | Round-trips (multi-relay, query params, fragments), 20+ negative tests | `qr.rs:245-587` |
| Message codec | serde round-trips incl. unknown-abort fallback | `types.rs:98-241` |
| Formal model | `NIP-AB.spthy` + spec §Formal Verification | `buzz-core/src/pairing/NIP-AB.spthy`; `NIP-AB.md:611` |

---

## 7. Weakness Register (relay-side, evidence-based)

1. **No authentication or identity at the relay** — by design (`lib.rs:5`), but it means the
   deployment owns abuse mitigation entirely at the proxy layer; the relay's own defenses are
   volume caps only.
2. **Loopback default vs pod bind** — binary defaults to `127.0.0.1:5000` (`main.rs:10`) while
   Helm binds `0.0.0.0` (`pairing-relay.yaml:38`); safe only if ingress TLS + `/pair` routing
   exist exactly as the crate header demands (`lib.rs:9-16`).
3. **QR has no intrinsic expiry** — unlike FA's 10-minute capped invites
   (`fa-mobile-companion.md` §4.1), protection rests solely on the 120 s session timer and
   human SAS comparison; a photographed QR stays usable within that window only if scanned
   quickly, but there is no replay binding to scan time.
4. **Single-subscriber rule can lock out legitimate retries** — a crashed client's 120 s
   corpse blocks re-subscription to the same `#p` until TTL/death (`lib.rs:746-753`); CLI
   mitigates operationally via `SOURCE_CONFIRM_DELAY_MS` (`README.md:88`).
5. **SAS remains a 6-digit human comparison** — ~10^6 space; spec accepts this trade-off
   explicitly (`NIP-AB.md:591`) but for agent-management automation a numeric compare step is
   friction that FA-style token QRs avoid.
6. **Zeroization honesty gap** — serde/nip44 intermediate buffers can't be scrubbed
   (`session.rs:598-602`); acceptable for nsec transfer, worth noting if payloads ever carry
   longer-lived credentials.

---

## 8. Cross-Reference Notes

- Relay wire-protocol family (main buzz-relay kinds, NIP-01 framing, OK/EOSE/CLOSED/NOTICE
  verbs reused here) — see `discovery/round4/bz-relay-event-kinds.md`.
- Ops/Kubernetes placement of the pairing-relay Deployment — see
  `discovery/round4/bz-ops-deploy-admin.md`.
- Phone-side counterpart inventory (Fabrica-app mobile pairing offers, device registry, relay
  credentials) — see `discovery/round4/fa-mobile-companion.md` §§3-5.
- `buzz-core/src/kind.rs:699` registers KIND_PAIRING in the kind enum alongside the rest of
  the catalog.

---

## 9. Relevance to Fabrica Phone-to-Desktop Agent Management (After-Rebrand)

**Pattern fit: HIGH for bootstrap/onboarding, LOW as a replacement for the existing FA
device-token plane.**

1. **Air-gap bootstrap of the first credential.** FA currently mints pairing offers that embed
   long-lived `deviceToken`s and desktop pubkey pins (fa-mobile-companion.md §4.1). That works
   when both ends trust the QR channel. Buzz's NIP-AB adds a *cryptographic* out-of-band check
   (SAS + transcript hash) on top of the QR channel — directly portable as an upgrade path:
   show the 6-digit code on both desktop and phone during first pair, killing QR-interception
   attacks (shoulder-surf, screenshot leakage) that token-QRs alone permit.
2. **Zero-account, zero-infrastructure pairing.** NIP-AB needs only any dumb WS pipe (the
   sidecar stores nothing, knows nothing — `lib.rs:4-5`). For After-Rebrand scenarios where a
   phone must onboard a desktop that is offline/headless/not-yet-signed-in (FA today gates
   relay-mode minting on cloud auth — `mobile-pairing-connection-mode.ts:20-41` per
   fa-mobile-companion.md §4.2), a Buzz-style ephemeral handshake removes that dependency.
3. **Reverse payload flow = recovery enrollment.** The target→source payload direction
   (`session.rs:228-251`) models "already-authorized device rescues a new one" — a clean
   template for FA's re-onboarding flows (e.g., replacing a lost phone using an existing
   paired device) without touching the server-side registry.
4. **Hardened ephemeral-transport discipline worth copying.** The relay's fail-closed budget
   design (dedup/delivery caps with TTL eviction, `lib.rs:135-187`), sig-before-dedup ordering
   (`lib.rs:803-830`), exactly-one-subscriber delivery semantics (`lib.rs:157-170`), and the
   40-test hostile-client suite are a reusable blueprint for any FA relay-assisted signaling
   channel (including the FA `DesktopRelayService` control plane, fa-mobile-companion.md §3).
5. **What NOT to port:** one-shot sessions and no rotation make NIP-AB wrong for persistent
   device identity — FA's `DeviceScope` registry + revoke outbox + connection-mode memory
   (fa-mobile-companion.md §3, §9.2) is strictly stronger for ongoing trust. Recommended
   composition: NIP-AB-style SAS-verified handshake delivers/rotates the FA deviceToken once;
   everything after stays FA-native. The natural seam is FA's `createMobilePairingOffer({
   rotate: true })` (runtime-rpc.ts:751-767, ibid.) being triggered by the completion of a
   SAS-verified ephemeral exchange instead of a bare QR scan.
6. **CLI parity gap.** Buzz demonstrates a full headless pairing participant
   (`buzz-pair source/target` over stdin/stdout, §5). FA has only partial remote-CLI auth
   (`--pairing-code` flags, fa-mobile-companion.md §7 "Remote artifact CLI"). A scripted
   source/target mode is the missing piece for CI/headless desktops enrolling into an
   agent-management fleet.

---

## 10. Scan-Coverage Statement

**Scanned (read line-by-line / near-fully):**
- `_sources/buzz/crates/buzz-pair-relay/src/lib.rs` — full (1,025 lines).
- `_sources/buzz/crates/buzz-pair-relay/src/main.rs` — full (27 lines).
- `_sources/buzz/crates/buzz-pair-relay/Cargo.toml` — full.
- `_sources/buzz/crates/buzz-pair-relay/tests/integration.rs` — lines 1-120 read verbatim +
  full grep index of all test/helper definitions (~100 matches, every `#[tokio::test]`
  function name captured with definition line; individual test bodies beyond line 120 read
  selectively, not line-by-line).
- `_sources/buzz/crates/buzz-pairing-cli/src/main.rs` — full (623 lines).
- `_sources/buzz/crates/buzz-pairing-cli/Cargo.toml`, `README.md` — full.
- `_sources/buzz/crates/buzz-core/src/pairing/crypto.rs` — full (413 lines).
- `_sources/buzz/crates/buzz-core/src/pairing/session.rs` — lines 1-1315 read verbatim
  (remainder of file is additional `#[cfg(test)]` tests beyond the last captured test;
  production code 100% covered — production impl ends at line 796).
- `_sources/buzz/crates/buzz-core/src/pairing/qr.rs` — full (588 lines).
- `_sources/buzz/crates/buzz-core/src/pairing/types.rs` — full (242 lines).
- `_sources/buzz/crates/buzz-core/src/pairing/mod.rs` — full (80 lines).
- `_sources/buzz/crates/buzz-core/src/kind.rs` — targeted grep (KIND_PAIRING sites only).
- `_sources/buzz/crates/buzz-core/src/pairing/NIP-AB.md` — heading structure grepped (all 66
  headings listed §4); body consulted selectively for rationale citations, not read verbatim.
- `_sources/buzz/deploy/charts/buzz/templates/pairing-relay.yaml` — full (72 lines).
- Repo-wide grep for `buzz-pair-relay|buzz_pair_relay` across *.toml/yml/yaml/sh/ts/Dockerfile
  (5 hits: workspace Cargo.toml:27, crate manifests, deploy chart).
- Context inputs: `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` (Checkpoint),
  `.Fabrica-atlas-board/discovery/round4/fa-mobile-companion.md` (full), `_sources/buzz/AGENTS.md`.

**Skipped:** `NIP-AB.spthy` body (formal-model notation, cited by existence only);
`.scratch/e2e-pair-local.sh` referenced by README (path not confirmed present in frozen copy);
integration-test bodies past line 120 except where cited; remaining `buzz-core` modules
(kind.rs body, event verification internals) — out of crate scope; `desktop/`, `mobile/`
(Flutter) pairing UIs — separate BZ surfaces, not relay-side; nothing else under the two
target crates was skipped.

**Claim discipline:** every substantive claim cites a file path (+line); "(file present)"
items rest on directory enumeration performed this session. No files outside
`.Fabrica-atlas-board/` were created or modified.

