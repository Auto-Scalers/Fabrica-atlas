# R4-1.5 — Buzz Relay Wire Protocol & Event-Kind Catalog (Line-Level Deep Dive)

> Task: ATLAS **R4-1.5** (claimed IN_PROGRESS in `Fabrica-atlas-tasks.md` Group 1 table; worker dispatch ctx_83cd7cbe5dbf, task_726da0c0b09d).
> Scope: READ-ONLY scan of `_sources/buzz/crates/buzz-relay`, `buzz-ws-client`, `buzz-pubsub`, plus the kind registry in `buzz-core/src/kind.rs` and the desktop/mobile client kind tables.
>
> **Path convention:** every citation below is relative to `_sources/buzz/` (e.g. `crates/buzz-relay/src/protocol.rs` = `_sources/buzz/crates/buzz-relay/src/protocol.rs`). All line numbers are exact as of this frozen snapshot.

---

## A. Wire Protocol — Frame Format (NIP-01 JSON Arrays)

The relay speaks NIP-01: every WebSocket data frame is a UTF-8 JSON array whose first element is a string message type (`crates/buzz-relay/src/protocol.rs:1`, parse entry `crates/buzz-relay/src/protocol.rs:41-56`). Non-array payloads, empty arrays, or a non-string first element are rejected with `RelayError::InvalidMessage` (`crates/buzz-relay/src/protocol.rs:45-55`).

### A.1 Client → Relay messages (`ClientMessage` enum, `crates/buzz-relay/src/protocol.rs:16-37`)

| Message | Shape | Parser | Notes |
|---|---|---|---|
| `EVENT` | `["EVENT", <signed event object>]` | `protocol.rs:58-67` | Submits a signed Nostr event |
| `REQ` | `["REQ", <sub_id>, <filter>…]` | `protocol.rs:68-107` | Opens a subscription; 1..10 filters |
| `COUNT` | `["COUNT", <sub_id>, <filter>…]` | `protocol.rs:108-145` | NIP-45 aggregate counts |
| `CLOSE` | `["CLOSE", <sub_id>]` | `protocol.rs:146-159` | Cancels an active subscription |
| `AUTH` | `["AUTH", <signed auth event>]` | `protocol.rs:160-169` | NIP-42 challenge response |

Any other message type is rejected: `"unknown message type: …"` (`crates/buzz-relay/src/protocol.rs:170-173`). Parse failures surface to the client as `["NOTICE","invalid message: …"]` (`crates/buzz-relay/src/connection.rs:548-554`).

**Per-message validation limits (parse-time):**
- `REQ` sub_id must be a non-empty string (`protocol.rs:74-84`) and ≤ **256 bytes** — `MAX_SUB_ID_LENGTH` const at `protocol.rs:9`, enforced at `protocol.rs:85-90`.
- `REQ` accepts at most **10 filters** — `MAX_FILTERS_PER_REQ` const at `protocol.rs:12`, enforced at `protocol.rs:92-98`; exactly 10 is accepted (test `parse_req_exactly_max_filters_is_accepted`, `protocol.rs:357-372`).
- `COUNT` enforces the identical two limits (`protocol.rs:125-136`).
- `CLOSE` requires a string sub_id but does NOT enforce length/non-empty (`protocol.rs:152-158`).

### A.2 Relay → Client messages (`RelayMessage` formatter struct, `crates/buzz-relay/src/protocol.rs:178-217`)

| Message | Shape | Formatter | Purpose |
|---|---|---|---|
| `AUTH` | `["AUTH", <challenge>]` | `protocol.rs:182-184` | NIP-42 handshake challenge |
| `EVENT` | `["EVENT", <sub_id>, <event>]` | `protocol.rs:187-191` | Delivers an event to a subscriber |
| `NOTICE` | `["NOTICE", <text>]` | `protocol.rs:194-196` | Human-readable error/info |
| `EOSE` | `["EOSE", <sub_id>]` | `protocol.rs:199-201` | End-of-stored-events sentinel |
| `OK` | `["OK", <event_id>, <bool>, <msg>]` | `protocol.rs:204-206` | Ack of an EVENT submission |
| `CLOSED` | `["CLOSED", <sub_id>, <msg>]` | `protocol.rs:209-211` | Relay terminated a subscription |
| `COUNT` | `["COUNT", <sub_id>, {"count": n}]` | `protocol.rs:214-216` | NIP-45 count response |

The ws-client crate mirrors these seven shapes in its typed `RelayMessage` enum (`crates/buzz-ws-client/src/message.rs:8-47`) and parser (`message.rs:62-167`), rejecting unknown types (`message.rs:163-166`).

### A.3 Binary frames

NIP-01 is text-only, but the relay accepts binary frames that decode as UTF-8 and processes them as text — documented as a common relay extension (`crates/buzz-relay/src/connection.rs:496-518`). Oversized binary frames get the same treatment as oversized text (see §E).

---

## B. Handshake & Sentinels

### B.1 Connection lifecycle (`handle_connection`, `crates/buzz-relay/src/connection.rs:121-147`)

Sequence for every new socket:

1. **Connection semaphore permit** — if exhausted, the socket is dropped with only a log (`connection.rs:159-165`). Default cap `BUZZ_MAX_CONNECTIONS` = **10,000** (`crates/buzz-relay/src/config.rs:556-559`).
2. **Community binding at row zero** — the tenant/community is resolved from the connection HOST header before any frame is read and can never be overridden by client input (`connection.rs:63-66`; `ConnectionState.tenant`, `connection.rs:66`).
3. **Challenge generation** — `generate_challenge()` from buzz-auth (`connection.rs:167`).
4. **Channel setup** — data channel sized by config `send_buffer_size` (default **1,000**, `config.rs:566-569`), priority control channel capacity **8** (`connection.rs:170-172`), restart-close channel capacity 1 (`connection.rs:174-177`).
5. **Initial auth state = `Pending{challenge}`** (`connection.rs:182-195`; enum `AuthState::{Pending, Authenticated(AuthContext), Failed}` at `connection.rs:43-54`).
6. **AUTH challenge sent immediately, unprompted** — `RelayMessage::auth_challenge` pushed as the very first outbound frame (`connection.rs:204-212`). This is the handshake sentinel: clients learn the relay requires NIP-42 from receiving `["AUTH", <challenge>]`.
7. **Registration + loops spawn**: send loop, heartbeat loop, and a 5-second auth-timeout watchdog (`connection.rs:231-272`).

### B.2 Auth timeout sentinel

`AUTH_TIMEOUT` = **5 seconds** (`crates/buzz-relay/src/connection.rs:29`). If the connection has not reached `Authenticated` when it fires, the socket is cancelled and metric `buzz_ws_auth_timeouts_total` incremented (`connection.rs:251-272`).

### B.3 EOSE sentinel

The REQ contract is "register the subscription, deliver historical events, then send EOSE" (`crates/buzz-relay/src/handlers/req.rs:1`, handler doc `req.rs:50-51`). EOSE marks the transition from historical replay to live fan-out and is sent on every terminal path, including empty result sets and access-denied scopes (`req.rs:385`, `req.rs:472`, `req.rs:602`).

### B.4 Server-initiated close codes

- **Restart close**: close code **1012 (RESTART)** with reason `"relay restarting"`, sent through a dedicated prioritized channel with flush acknowledgement (`connection.rs:34-37` struct, biased select at `connection.rs:365-379`).
- **Policy close**: community deletion produces close code **1008 (POLICY)** reason `"community deleted"` (`connection.rs:392-395` mapping `CommunityDisconnectReason`; verified by test `send_loop_sends_policy_close_when_community_is_deleted`, `connection.rs:1012-1039`).
- **Ordinary cancellation**: bare `Close(None)` after draining queued control frames so a ban-reason frame always precedes the close (`connection.rs:380-396`; test `connection.rs:1064-1110`).

---

## C. Auth Challenge Flow (NIP-42 + NIP-OA)

### C.1 Full flow

```
client ──ws connect──► relay
relay  ──["AUTH", challenge]──► client            (connection.rs:204-212)
client ──["AUTH", signed event kind 22242]──►     (protocol.rs:160-169)
relay   verify_auth_event(challenge, relay_url)   (handlers/auth.rs:87-89)
        ├─ ban gate (+NIP-OA owner cascade)       (auth.rs:106-184)
        ├─ pubkey allowlist gate                  (auth.rs:187-214)
        ├─ relay-membership gate                  (auth.rs:217-238)
        └─ success: AuthState::Authenticated      (auth.rs:277-282)
relay  ──["OK", <auth_event_id>, true, ""]──► client
```

### C.2 Handler details (`crates/buzz-relay/src/handlers/auth.rs`)

- Pure crypto verification — "no API tokens, no JWT, no DB token lookups" (`auth.rs:38-42`).
- Re-entry rules: AUTH while already authenticated → `OK false "auth-required: already authenticated"` (`auth.rs:49-57`); after a failed attempt → `OK false "auth-required: authentication already failed"` (`auth.rs:58-66`).
- **NIP-OA auth-tag extraction**: exactly one `["auth", …]` tag is accepted; more than one ⇒ treated as no valid tag (spec-mandated fail-closed) (`auth.rs:26-36`). The tag rides inside the signed AUTH event so its integrity is protected by the Schnorr signature (`auth.rs:75-78`).
- Expected relay URL is derived per-tenant by `bridge::nip42_expected_relay_url` (`auth.rs:80-82`).
- **Ban gate**: DB lookup `moderation_restriction_state`; DB errors deny fail-closed but distinguish `DbError` from `Banned` (`auth.rs:106-131`). NIP-OA cascade — a ban on the cryptographically proven owner blocks the agent; agent bans are agent-only (`auth.rs:133-155`). Banned ⇒ `OK false "blocked: you are banned from this community"`, state pinned `Failed`, reason frame routed on the priority control channel, socket cancelled immediately (`auth.rs:157-183`).
- **Allowlist gate** (only when `BUZZ_PUBKEY_ALLOWLIST` enabled, `config.rs:586-588`): pubkey-only NIP-42 auth must appear in the community allowlist; DB errors deny fail-closed (`auth.rs:187-214`).
- **Membership gate**: shared helper `enforce_relay_membership` with NIP-OA owner-delegation fallback on closed relays; failure ⇒ `OK false "restricted: not a relay member"` (`auth.rs:216-238`). On open relays a present NIP-OA tag still triggers owner extraction/backfill for observer-frame authorization (`auth.rs:240-275`).
- Verification failure ⇒ state `Failed` + `OK false "auth-required: verification failed"` (`auth.rs:284-293`).

### C.3 Enforcement points requiring auth

REQ, EVENT, and COUNT unconditionally reject unauthenticated connections with `auth-required:` reasons — `handlers/req.rs:85-89`, `handlers/event.rs:649`, `handlers/count.rs:34`. The NIP-11 document advertises `auth_required: true` permanently (`crates/buzz-relay/src/nip11.rs:97-100,114`).

### C.4 Client-side flow (`buzz-ws-client`)

- Timeouts: `AUTH_CHALLENGE_TIMEOUT_SECS = 20` (`crates/buzz-ws-client/src/connection.rs:17`), `AUTH_OK_TIMEOUT_SECS = 20` (`connection.rs:20`), `PUBLISH_OK_TIMEOUT_SECS = 30` (`connection.rs:23`); floor-tested by const asserts (`connection.rs:300-313`).
- Challenge hygiene: a challenge longer than **1024 bytes** aborts auth (`connection.rs:198-202`).
- AUTH event construction: `EventBuilder::auth(challenge, relay_url)` + optional extra NIP-OA authorization tag (`crates/buzz-ws-client/src/message.rs:174-190`).
- Interleaving safety: non-matching frames received while waiting for a specific OK are buffered and replayed; stray challenges stashed as pending (`connection.rs:157-215, 217-269`).
- One-shot helper `publish_event`: connect → authenticate → send → await OK → disconnect, all bounded by one timeout (`connection.rs:277-294`).

---

## D. Ping / Keepalive Timing Constants

### D.1 Main relay WebSocket

| Constant | Value | Citation |
|---|---|---|
| Heartbeat ping interval | **30 s** (`tokio::time::interval`) | `crates/buzz-relay/src/connection.rs:441` |
| Missed-pong threshold | **3 missed pongs → disconnect** (fetch_add fires when previous value ≥ 2) | `connection.rs:431` (doc), `444-459` |
| Pong reset | Any client `Pong` resets the counter to 0 | `connection.rs:519-521` |
| Client Ping handling | Relay replies Pong via priority control channel; full control channel = terminal stall | `connection.rs:522-531` |
| Server Ping transport | Sent through ctrl channel with `try_send`; full channel ⇒ close | `connection.rs:433-459` |
| Auth completion window | **5 s** (`AUTH_TIMEOUT`) | `connection.rs:29` |
| Outbound batch size | up to **64** data frames per flush — `MAX_WS_SEND_BATCH` | `connection.rs:40`, batching loop `403-425` |

Client side: `buzz-ws-client` answers any server `Ping` with an immediate `Pong` inside its receive loops (`crates/buzz-ws-client/src/connection.rs:148-150, 208-210, 262-264`). The client itself sends no application-level keepalive.

### D.2 Huddle audio WebSocket (separate sub-protocol, same crate)

| Constant | Value | Citation |
|---|---|---|
| `MAX_AUDIO_FRAME_BYTES` | 4096 | `crates/buzz-relay/src/audio/handler.rs:44` |
| `MAX_TEXT_FRAME_BYTES` | 8192 (= `MAX_WEBSOCKET_MESSAGE_BYTES`) | `handler.rs:47,52` |
| `HEARTBEAT_INTERVAL` | 30 s | `handler.rs:55` |
| `MAX_MISSED_PONGS` | 3 | `handler.rs:58` |
| Audio `AUTH_TIMEOUT` | 5 s | `handler.rs:61` |
| Socket max frame size | wired to `MAX_WEBSOCKET_MESSAGE_BYTES` | `handler.rs:118` |
| Audio wire header | `V2_HEADER_LEN = 8` bytes, `FLAG_DTX = 0x01` | `audio/wire.rs:30,33` |

---

## E. Message Size & Resource Limits

### E.1 Frame limits

- Default frame cap: `DEFAULT_MAX_FRAME_BYTES = 512 * 1024` (**512 KiB**) — `crates/buzz-relay/src/config.rs:14`.
- Overridable via env `BUZZ_MAX_FRAME_BYTES` (must be > 0) — `config.rs:571-575`.
- Enforcement in recv loop for BOTH text and binary frames: oversize ⇒ `["NOTICE","error: frame too large (N bytes, limit M)"]` then disconnect (`connection.rs:477-494` text, `496-511` binary).

### E.2 Backpressure & concurrency

| Knob | Default | Citation |
|---|---|---|
| Per-conn send buffer (`BUZZ_SEND_BUFFER`) | 1,000 messages | `config.rs:566-569` |
| Slow-client grace limit (`BUZZ_SLOW_CLIENT_GRACE_LIMIT`) | 15 consecutive buffer-full events before cancel | `config.rs:577-580`; enforcement `connection.rs:95-118` |
| Max connections (`BUZZ_MAX_CONNECTIONS`) | 10,000 | `config.rs:556-559` |
| Max concurrent handlers (`BUZZ_MAX_CONCURRENT_HANDLERS`) | 1,024 (semaphore per EVENT/REQ/COUNT) | `config.rs:561-564`; acquisition `connection.rs:571-607,618-637` |

Successful sends reset the backpressure counter to zero (`connection.rs:97-100`); sustained backpressure cancels the connection and increments `buzz_ws_backpressure_disconnects_total` (`connection.rs:102-111`).

### E.3 NIP-11 advertised limitations (`relay_limitation`, `crates/buzz-relay/src/nip11.rs:101-120`)

| Field | Advertised value | Citation |
|---|---|---|
| `max_message_length` | configured `max_frame_bytes` | `nip11.rs:108` |
| `max_subscriptions` | 1024 | `nip11.rs:109` |
| `max_filters` | 10 | `nip11.rs:110` |
| `max_limit` | `buzz_db::DEFAULT_MAX_PAGE_LIMIT` (same constant REQ clamps to — advertised/enforced cannot drift) | `nip11.rs:92-96,111` |
| `max_subid_length` | 256 | `nip11.rs:112` |
| `min_pow_difficulty` | none | `nip11.rs:113` |
| `auth_required` | true (always) | `nip11.rs:97-100,114` |
| `payment_required` | false | `nip11.rs:115` |
| `restricted_writes` | true | `nip11.rs:116` |
| `due_delivery_mode` (NIP-ER) | `"push"` | `nip11.rs:117` |
| `max_not_before_delta` | env `SPROUT_MAX_NOT_BEFORE_DELTA`, default 31,536,000 s (1 yr) | `nip11.rs:102-105,118` |

Supported NIPs advertised: `[1, 2, 10, 11, 16, 17, 23, 25, 29, 33, 38, 42, 50, 56]` (`nip11.rs:15`), plus NIP-43 conditionally when membership is enforced AND a stable signing key exists (`nip11.rs:17-21,153-156,306-311`). Extensions: `nip-er` always (`nip11.rs:165`); `nip-pl` appended when push delivery is configured (`nip11.rs:265-268`).

Push-descriptor lease limits (advertised when push gateway configured): max_lease_ttl 2,592,000 s; ≤16 leases/pubkey; ≤16 subscriptions/lease; ≤16 kinds; ≤20 authors; ≤50 h tags; content ≤65,536 B; plaintext ≤32,768 B; endpoint ≤4,096 B (`nip11.rs:217-230`).

### E.4 Rate-limit admission (WS + HTTP shared limiter)

- WS burst window: `WS_BURST_WINDOW_SECS = 5` (`crates/buzz-relay/src/admission.rs:9`); budget = per-second human WS limit × 5 via `ws_admission_budget` (`admission.rs:40-45`; rationale comment `admission.rs:5-8`).
- Applied to REQ/COUNT/EVENT after auth: WS-events bucket first, then a separate per-minute Messages bucket for EVENT only — agent-authored events use `agent_standard_messages_per_min`, humans use `human_messages_per_min` (`connection.rs:652-711`).
- Rejections: `CLOSED <sub_id> "rate-limited: quota exceeded; retry in Ns"` (sub-scoped) or `NOTICE` otherwise; limiter unavailability also denies (`connection.rs:713-737`; rejection-shape helper `connection.rs:645-650`).

---

## F. Subscription Model

### F.1 REQ semantics

REQ = register subscription + historical replay + EOSE (`handlers/req.rs:1,50-51`). Auth required before subscribing (`req.rs:85-89`). Filter `limit` values are clamped to `buzz_db::DEFAULT_MAX_PAGE_LIMIT` on both the search path and the main path (`req.rs:617-618, 959-960`; conformance test that advertised == enforced at `req.rs:1598`). NIP-50 `search` filters route to Postgres FTS with paged retrieval bounded by `MAX_SEARCH_PAGES` (`req.rs:244, 499`).

### F.2 Registry & fan-out indexes (`crates/buzz-relay/src/subscription.rs`)

`SubscriptionRegistry` (`subscription.rs:86-100`) stores `conn_id → sub_id → (Vec<Filter>, CommunityId, SubscriptionScope)` in a DashMap plus four O(1) fan-out indexes:

- `channel_kind_index` — `(community, channel_id, kind)` → subscribers (`subscription.rs:91`)
- `channel_wildcard_index` — `(community, channel_id)` for subs without a kind filter (`subscription.rs:92-93`)
- `global_kind_index` — `(community, kind)` (`subscription.rs:94-95`)
- `global_p_kind_index` — `(community, kind, #p recipient)` for p-gated delivery (`subscription.rs:96-97`)
- `global_wildcard_index` — community-wide (`subscription.rs:98-99`)

Scope resolution: a subscription whose filters resolve to a single authorized channel gets `SubscriptionScope::Channels([id])`; otherwise community-`Global` (`subscription.rs:19-48`; resolution at register time `subscription.rs:108-120`). Re-registering an existing sub_id replaces it (NIP-01 behavior, `subscription.rs:108-116`). Channel revocation prunes live scopes incrementally and removes subscriptions left with zero authorized channels (`subscription.rs:75-82`).

### F.3 Redis fan-out topics (`crates/buzz-pubsub/src/topic.rs`)

- Prefix `BUZZ_PREFIX = "buzz"` (`topic.rs:13`).
- Channel-scoped topic key: `buzz:{community_id}:channel:{channel_uuid}`; global: `buzz:{community_id}:global` (`topic.rs:43-50`).
- Topics are a routing/performance boundary only — authorization is re-checked by the relay before local fan-out (`topic.rs:1-5`).
- Reverse parser validates exact segment shapes (`topic.rs:53-99`).
- On disconnect, every released scope decrements its Redis topic retention (`crates/buzz-relay/src/connection.rs:288-301`), and presence for a pubkey is cleared when its last connection in the community drops (`connection.rs:303-314`).

---

## G. Event-Kind Catalog (authoritative registry)

**Single source of truth:** `crates/buzz-core/src/kind.rs` ("Buzz V2 kind number registry… the authoritative source for Buzz kind numbers", `kind.rs:1-5`). All constants are `u32`. `ALL_KINDS` (`kind.rs:635-766`) is guarded by a duplicate-value unit test (`kind.rs:902-908`). Kind classification helpers: `is_ephemeral` 20000–29999 (`kind.rs:769-771`), `is_replaceable` 0|3|41|10000–19999 (`kind.rs:776-778`), `is_parameterized_replaceable` 30000–39999 (`kind.rs:783-785`), range bounds `kind.rs:452-459`.

### G.1 Standard NIP kinds

| Const | Value | Line | Purpose |
|---|---|---|---|
| `KIND_PROFILE` | 0 | `kind.rs:9` | NIP-01 profile metadata |
| `KIND_TEXT_NOTE` | 1 | `kind.rs:11` | NIP-01 short text note |
| `KIND_CONTACT_LIST` | 3 | `kind.rs:13` | NIP-02 follow list |
| `KIND_MUTE_LIST` | 10000 | `kind.rs:17` | NIP-51 mute list (replaceable) |
| `KIND_PIN_LIST` | 10001 | `kind.rs:22` | NIP-51 pin list |
| `KIND_NIP65_RELAY_LIST_METADATA` | 10002 | `kind.rs:27` | NIP-65 relay list |
| `KIND_BOOKMARK_LIST` | 10003 | `kind.rs:32` | NIP-51 bookmark list |
| `KIND_EMOJI_LIST` | 10030 | `kind.rs:34` | NIP-51 emoji list |
| `KIND_FOLLOW_SET` | 30000 | `kind.rs:39` | NIP-51 follow set (param-replaceable) |
| `KIND_BOOKMARK_SET` | 30003 | `kind.rs:43` | NIP-51 bookmark set |
| `KIND_EMOJI_SET` | 30030 | `kind.rs:52` | NIP-51/NIP-30 emoji set |
| `KIND_CHANNEL_METADATA` | 41 | `kind.rs:54` | NIP-01 channel metadata — "not used by Buzz today" |
| `KIND_DELETION` | 5 | `kind.rs:56` | NIP-09 deletion request |
| `KIND_REACTION` | 7 | `kind.rs:58` | NIP-25 reaction |
| `KIND_GIFT_WRAP` | 1059 | `kind.rs:60` | NIP-17 DM outer envelope |
| `KIND_FILE_METADATA` | 1063 | `kind.rs:62` | NIP-94 file metadata |
| `KIND_LONG_FORM` | 30023 | `kind.rs:66` | NIP-23 long-form (global, not channel-scoped) |
| `KIND_USER_STATUS` | 30315 | `kind.rs:70` | NIP-38 user status |
| `KIND_READ_STATE` | 30078 | `kind.rs:75` | NIP-78 per-client read-state blob, NIP-44 encrypted |
| `KIND_AUTH` | 22242 | `kind.rs:77` | NIP-42 auth event — never stored |
| `KIND_BLOSSOM_AUTH` | 24242 | `kind.rs:79` | BUD-01 upload auth — not stored |
| `KIND_NOSTR_IDENTITY_BINDING` | 24243 | `kind.rs:81` | Buzz one-time identity binding proof — ephemeral, not stored |
| `KIND_HTTP_AUTH` | 27235 | `kind.rs:83` | NIP-98 HTTP auth — not stored |

### G.2 Agent & persona kinds

| Const | Value | Line | Purpose |
|---|---|---|---|
| `KIND_AGENT_PROFILE` | 10100 | `kind.rs:87` | Agent metadata + owner ref (replaceable) |
| `KIND_AGENT_ENGRAM` | 30174 | `kind.rs:94` | NIP-AE encrypted agent memory (HMAC d-tag) |
| `KIND_EVENT_REMINDER` | 30300 | `kind.rs:102` | NIP-ER encrypted author-only reminder |
| `KIND_PUSH_LEASE` | 30350 | `kind.rs:109` | NIP-PL encrypted push lease |
| `KIND_PRIVATE_MANAGED_AGENT` | 30179 | `kind.rs:118` | NIP-PMA owner-encrypted managed-agent aggregate |
| `KIND_PERSONA` | 30175 | `kind.rs:196` | NIP-AP persona (shared-tag gated) |
| `KIND_TEAM` | 30176 | `kind.rs:282` | NIP-AP team definition (owner-private; deliberately NOT shared-gated — `kind.rs:212-214`) |
| `KIND_MANAGED_AGENT` | 30177 | `kind.rs:291` | Managed-agent public opt-IN projection |
| `KIND_TEAM_CATALOG` | 30178 | `kind.rs:319` | Team catalog with embedded member projections (shared-gated) |
| `KIND_AGENT_TURN_METRIC` | 44200 | `kind.rs:545` | NIP-AM per-turn token usage (agent-authored, p-gated) |

### G.3 Messaging / channel content kinds

| Const | Value | Line | Purpose |
|---|---|---|---|
| `KIND_STREAM_MESSAGE` | 9 | `kind.rs:479` | Group chat message v1 (+ `!shutdown` convention via kind:9 + `#p`, `kind.rs:475-478`) |
| `KIND_STREAM_MESSAGE_V2` | 40002 | `kind.rs:481` | Chat message v2 (V1's 10002 was in replaceable range — wrong) |
| `KIND_STREAM_MESSAGE_EDIT` | 40003 | `kind.rs:483` | Message edit (V1's 10004 collided with NIP-51) |
| `KIND_STREAM_MESSAGE_PINNED` | 40004 | `kind.rs:485` | Pinned message |
| `KIND_STREAM_MESSAGE_BOOKMARKED` | 40005 | `kind.rs:487` | Bookmarked message |
| `KIND_STREAM_MESSAGE_SCHEDULED` | 40006 | `kind.rs:489` | Scheduled message |
| `KIND_STREAM_REMINDER` | 40007 | `kind.rs:491` | Reminder on a message/time |
| `KIND_STREAM_MESSAGE_DIFF` | 40008 | `kind.rs:493` | Unified-diff message |
| `KIND_CANVAS` | 40100 | `kind.rs:495` | Channel canvas (shared doc) |
| `KIND_SYSTEM_MESSAGE` | 40099 | `kind.rs:497` | System rows: join/leave/rename/etc. |
| `KIND_FORUM_POST` | 45001 | `kind.rs:550` | Forum thread root |
| `KIND_FORUM_VOTE` | 45002 | `kind.rs:552` | Forum vote |
| `KIND_FORUM_COMMENT` | 45003 | `kind.rs:554` | Forum reply |

### G.4 Ephemeral kinds (20000–29999 — Redis pub/sub only, never stored, `kind.rs:461-472`)

| Const | Value | Line | Purpose |
|---|---|---|---|
| `KIND_PRESENCE_UPDATE` | 20001 | `kind.rs:463` | Presence online/away/offline |
| `KIND_TYPING_INDICATOR` | 20002 | `kind.rs:467` | Typing indicator |
| `KIND_PAIRING` | 24134 | `kind.rs:465` | NIP-AB device pairing (relay may discard after delivery) |
| `KIND_AGENT_OBSERVER_FRAME` | 24200 | `kind.rs:469` | Owner-scoped encrypted agent observer telemetry/control (±5-minute freshness window enforced at `handlers/event.rs:985-988`) |
| `KIND_HUDDLE_REACTION` | 24810 | `kind.rs:472` | Huddle emoji reaction burst (`h`-tag scoped, never in timeline) |

Ephemeral handling at ingest: requires MessagesWrite scope (`handlers/event.rs:694-704`), dispatched WS-only through `handle_ephemeral_event` (`handlers/event.rs:794-810`); presence is global/channel-less and other ephemerals require channel membership unless channel-less like pairing (`handlers/event.rs:844-893`).

### G.5 NIP-29 group admin commands (validated + executed, never stored as events, `kind.rs:333-351`)

| Const | Value | Line |
|---|---|---|
| `KIND_NIP29_PUT_USER` | 9000 | `kind.rs:335` |
| `KIND_NIP29_REMOVE_USER` | 9001 | `kind.rs:337` |
| `KIND_NIP29_EDIT_METADATA` | 9002 | `kind.rs:339` |
| `KIND_NIP29_DELETE_EVENT` | 9005 | `kind.rs:341` |
| `KIND_NIP29_CREATE_GROUP` | 9007 | `kind.rs:343` |
| `KIND_NIP29_DELETE_GROUP` | 9008 | `kind.rs:345` |
| `KIND_NIP29_CREATE_INVITE` | 9009 | `kind.rs:347` |
| `KIND_NIP29_JOIN_REQUEST` | 9021 | `kind.rs:349` |
| `KIND_NIP29_LEAVE_REQUEST` | 9022 | `kind.rs:351` |

### G.6 Moderation & relay-admin command kinds

Moderation commands 9040–9044 (mod-signed, executed directly, every accepted command writes a `moderation_actions` audit row — `kind.rs:353-370`):

| Const | Value | Line |
|---|---|---|
| `KIND_MODERATION_BAN` | 9040 | `kind.rs:358` |
| `KIND_MODERATION_UNBAN` | 9041 | `kind.rs:360` |
| `KIND_MODERATION_TIMEOUT` | 9042 | `kind.rs:363` |
| `KIND_MODERATION_UNTIMEOUT` | 9043 | `kind.rs:365` |
| `KIND_MODERATION_RESOLVE_REPORT` | 9044 | `kind.rs:370` |
| route check `is_moderation_command_kind` | 9040–9044 | `kind.rs:376-385` |

NIP-43 relay membership admin (`kind.rs:387-395`): `RELAY_ADMIN_ADD_MEMBER` 9030 (`kind.rs:389`), `RELAY_ADMIN_REMOVE_MEMBER` 9031 (`kind.rs:391`), `RELAY_ADMIN_CHANGE_ROLE` 9032 (`kind.rs:393`), `RELAY_ADMIN_SET_WORKSPACE_PROFILE` 9033 (`kind.rs:395`; sets workspace icon served in NIP-11, `nip11.rs:30-33`). Route check `is_relay_admin_kind` `kind.rs:795-803`.

NIP-43 announcements (relay-signed, `kind.rs:396-404`): `KIND_NIP43_MEMBERSHIP_LIST` **13534** (`kind.rs:398`), `KIND_NIP43_MEMBER_ADDED` **8000** (`kind.rs:400`), `KIND_NIP43_MEMBER_REMOVED` **8001** (`kind.rs:402`), user-signed ephemeral leave `KIND_NIP43_LEAVE_REQUEST` **28936** (`kind.rs:404`).

NIP-IA identity archival (`kind.rs:406-418`): user-signed requests `KIND_IA_ARCHIVE_REQUEST` 9035 / `KIND_IA_UNARCHIVE_REQUEST` 9036 (`kind.rs:408,410`; route check `kind.rs:810-812`); relay-signed deltas `KIND_IA_ARCHIVED` 8002 / `KIND_IA_UNARCHIVED` 8003 (`kind.rs:414,416`); snapshot list `KIND_IA_ARCHIVED_LIST` 13535 (`kind.rs:418`).

### G.7 NIP-29 group state & overlays (addressable 39000–39006)

| Const | Value | Line | Notes |
|---|---|---|---|
| `KIND_NIP29_GROUP_METADATA` | 39000 | `kind.rs:422` | Channel id carried in `d` tag (see AGENTS.md "Channel scoping") |
| `KIND_NIP29_GROUP_ADMINS` | 39001 | `kind.rs:424` | |
| `KIND_NIP29_GROUP_MEMBERS` | 39002 | `kind.rs:426` | Membership resolved from users' own 39002 `d` tags |
| `KIND_NIP29_GROUP_ROLES` | 39003 | `kind.rs:428` | |
| `KIND_THREAD_SUMMARY` | 39005 | `kind.rs:435` | Relay-synthesized overlay, never stored (`kind.rs:430-432`) |
| `KIND_WINDOW_BOUNDS` | 39006 | `kind.rs:439` | Pagination authority — clients must NOT infer `has_more` from row counts |

### G.8 Workflow / job / DM / misc ranges

Workflow engine 46000-range (`kind.rs:556-582`): `KIND_WORKFLOW_DEF` 30620 (`kind.rs:442`), `KIND_WORKFLOW_TRIGGER` 46020, `KIND_APPROVAL_GRANT` 46030, `KIND_APPROVAL_DENY` 46031, execution events `KIND_WORKFLOW_TRIGGERED` 46001 … `KIND_WORKFLOW_APPROVAL_DENIED` 46012 (`kind.rs:558-582`; loop-guard range check `is_workflow_execution_kind` `kind.rs:789-791`).

Agent job protocol 43000-range (`kind.rs:515-528`): `KIND_JOB_REQUEST` 43001, `KIND_JOB_ACCEPTED` 43002, `KIND_JOB_PROGRESS` 43003, `KIND_JOB_RESULT` 43004, `KIND_JOB_CANCEL` 43005, `KIND_JOB_ERROR` 43006.

DMs 41000-range (`kind.rs:505-513`): `KIND_DM_OPEN` 41010, `KIND_DM_ADD_MEMBER` 41011, `KIND_DM_HIDE` 41012, `KIND_DM_CREATED` 41001; plus relay-signed `KIND_DM_VISIBILITY` 30622 (`kind.rs:449`).

Relay-only sidecars (`kind.rs:499-503`): `KIND_CHANNEL_SUMMARY` 40901, `KIND_PRESENCE_SNAPSHOT` 40902. Notifications: `KIND_MEMBER_ADDED_NOTIFICATION` 44100 / `KIND_MEMBER_REMOVED_NOTIFICATION` 44101 (`kind.rs:532,536`).

Other: `KIND_REPORT` 1984 (`kind.rs:327`, persisted to moderation queue, never fanned out), `KIND_PRODUCT_FEEDBACK` 42000 (`kind.rs:331`, sidecar only, never stored), `KIND_AUDIT_ENTRY` 48001 (`kind.rs:588`), huddles 48100/48101/48102/48103/48106 (`kind.rs:590-598`), `KIND_MEDIA_UPLOAD` 49001 internal-only (`kind.rs:602`), git/NIP-34 block 1617–1633 + 30617/30618 (`kind.rs:604-623`), `KIND_PROJECT` 30621 NIP-MP (`kind.rs:632`).

Transactional command set (`is_command_kind`, `kind.rs:815-826`): 30620, 41010, 41011, 41012, 46020, 46030, 46031.

### G.9 Privacy/access-control kind sets

| Set | Members (values) | Citation |
|---|---|---|
| `AUTHOR_ONLY_KINDS` (existence hidden from everyone but author) | 30300, 30350, 30179 | `kind.rs:129-133` |
| `RESULT_GATED_KINDS` (even ids-filters must match `#p`) | 30622, 44200 | `kind.rs:142` |
| `P_GATED_KINDS` (filter layer closed unless filter `#p` == reader) | 24200, 44100, 44101, 1059, 30622, 44200 | `kind.rs:159-169` |
| `SHARED_GATED_KINDS` (author-only unless exactly one `["shared","true"]` tag) | 30175, 30178 | `kind.rs:215`; tag predicate `event_is_shared` `kind.rs:258-273`; per-event gate `kind.rs:232-243` |
| `is_relay_only_kind` (client submission rejected) | 13534, 40901, 40902, 30622, 39005, 39006 | `kind.rs:830-840` |

---

## H. Client Cross-Reference — Which Kinds Desktop/Mobile Consume

### H.1 Desktop (`desktop/src/shared/constants/kinds.ts`)

Full exported table (`kinds.ts:1-76`): deletion 5, reaction 7, text_note 1, stream_message 9, nip29_delete_event 9005, report 1984, product_feedback 42000, ia_archive_request 9035, moderation ban/unban/timeout/untimeout/resolve 9040–9044, stream_message_v2 40002, edit 40003, thread_summary 39005, window_bounds 39006, diff 40008, reminder 40007, system 40099, jobs 43001–43006, forum post/comment 45001/45003, approval_request 46010, member_added/removed 44100/44101, typing 20002, presence 20001, huddle_reaction 24810, huddle lifecycle 48100–48103, read_state family all 30078 differentiated by d-tag (`kinds.ts:44-51`), persona/team/managed-agent 30175/30176/30177 (`kinds.ts:52-57`), user_status 30315, agent_observer_frame 24200, agent_turn_metric 44200, event_reminder 30300, repo announcement/state 30617/30618, project 30621, git patch/PR/update/issue/statuses 1617–1633 (`kinds.ts:66-73`), dm_visibility 30622 (`kinds.ts:74-76`).

Desktop subscription groupings:

- `CHANNEL_MESSAGE_EVENT_KINDS` = [9, 40002, 45001, 45003] — unread trigger set; reactions/edits/diffs/deletions/system deliberately excluded to avoid phantom unreads (`kinds.ts:83-88`).
- `CHANNEL_EVENT_KINDS` = [5, 7, 9005, messages…, **40001 legacy**, 40003, 40008, 40099, 48100–48103] (`kinds.ts:93-106`).
- `CHANNEL_AUX_EVENT_KINDS` = [5, 7, 9005, 40003] — fetched by `#e` reference over loaded ids, not time window (`kinds.ts:117-122`).
- `CHANNEL_TIMELINE_CONTENT_KINDS` = [9, 40002, 40008, 40099, 43001–43006, 48100] (`kinds.ts:130-142`).
- `NON_CONVERSATIONAL_UNREAD_KINDS` = [40099, 43001–43006, 48100–48103] with `isConversationalUnreadKind` treating undefined kinds as conversational (`kinds.ts:149-168`).

### H.2 Mobile (Flutter, `mobile/lib/shared/relay/nostr_models.dart`)

Header mandates sync with desktop: "Keep in sync with `desktop/src/shared/constants/kinds.ts`" (`nostr_models.dart:7`). Exported constants (`nostr_models.dart:9-47`): note 1, contactList 3, deletion 5, reaction 7, relayAdminAddMember 9030, relayMembership 13534, streamMessage 9, nip29DeleteEvent 9005, presenceUpdate 20001, typingIndicator 20002, auth 22242, agentObserverFrame 24200, huddleReaction 24810, readState 30078, eventReminder 30300, userStatus 30315, dmVisibility 30622, streamMessageV2 40002, channelThreadSummary 39005, channelWindowBounds 39006, streamMessageEdit 40003, streamMessageDiff 40008, systemMessage 40099, jobs 43001–43006, forumPost 45001, forumComment 45003, huddle lifecycle 48100–48103.

Mobile groupings mirror desktop exactly: `channelMessageEventKinds` [9, 40002, 45001, 45003] (`nostr_models.dart:50-55`), `channelEventKinds` incl. legacy **40001** (`nostr_models.dart:59-72`), `channelAuxEventKinds` [5, 7, 9005, 40003] (`nostr_models.dart:75-80`). Mobile filters additionally query kinds [30622] for DM visibility (`mobile/lib/shared/relay/nostr_filters.dart:88`), [13534] for membership snapshot (`nostr_filters.dart:206`), and send the NIP-42 AUTH event from `relay_socket.dart:220`.

**Drift check:** mobile defines a strict subset of desktop's exports (desktop adds 1984/42000/9035/9040-9044/40007/46010/30175-30177/30300/44200/1617-1633/30617-30622 etc.). No numeric conflicts found between the three registries for the overlapping constants; the legacy 40001 appears in both client grouping arrays but is intentionally absent from the Rust registry (`ALL_KINDS`, `kind.rs:635-766`).

---

## I. Fabrica-Relevance Notes (for synthesis feed)

1. The entire surface is standard NIP-01/NIP-42 Nostr over one WebSocket — a Fabrica CLI-agent-management app can reuse this transport unchanged for agent channels (job kinds 43001–43006 and observer frames 24200 are already the agent-control plane).
2. The p-gated/shared-gated/author-only kind sets (`kind.rs:129-169,215`) are a ready-made privacy model for agent↔owner telemetry if rebranded.
3. Client keepalive is server-driven (30 s ping / 3 strikes) with no client-side heartbeat requirement — simplifies any ported client.

---

## J. Scan-Coverage Statement

**Read in full (line-by-line):**
- `crates/buzz-core/src/kind.rs` (1,085 lines — complete; every kind constant, gate set, and classifier cited)
- `crates/buzz-relay/src/protocol.rs` (458 lines — complete)
- `crates/buzz-relay/src/connection.rs` (1,111 lines — complete incl. tests)
- `crates/buzz-relay/src/nip11.rs` (528 lines — complete)
- `crates/buzz-relay/src/handlers/auth.rs` (lines 1–300 of 350; remainder is tests for `extract_auth_tag_json`)
- `crates/buzz-ws-client/src/connection.rs` (314 lines — complete)
- `crates/buzz-ws-client/src/message.rs` (190 lines — complete)
- `crates/buzz-pubsub/src/topic.rs` (lines 1–150 of 197; remainder is channel-key unit tests)
- `crates/buzz-relay/src/subscription.rs` (lines 1–120 of 1,966 — registry structure, scope model, index keys; the remaining ~1,850 lines are fan-out matching internals + extensive tests)
- `crates/buzz-relay/src/admission.rs` (158 lines — complete)
- `crates/buzz-relay/src/config.rs` (targeted: constants at :14/:51, fields :111–115, env defaults :556–588; not a full read)
- `crates/buzz-relay/src/audio/handler.rs` + `audio/wire.rs` (targeted constant lines only)
- `crates/buzz-relay/src/handlers/{req.rs,event.rs,count.rs}` (grep-targeted: auth gates, EOSE paths, ephemeral handling, OK responses)
- `desktop/src/shared/constants/kinds.ts` (168 lines — complete)
- `mobile/lib/shared/relay/nostr_models.dart` (lines 1–80 of 413) + grep of `nostr_filters.dart`, `relay_socket.dart`
- `_sources/buzz/AGENTS.md` (repo conventions, kind-registry policy, channel-scoping rules)

**Skipped (out of scope for this task):** relay HTTP API bodies (`api/*.rs` beyond cited lines), tunnel/mesh/audio room logic, buzz-db query layer, buzz-auth rate-limit implementation details, migrations/, desktop/mobile UI feature code beyond the kind tables, `buzz-pair-relay` (separate pairing sidecar), test-client E2E suites. Redis topic naming was covered via `topic.rs`; publisher/subscriber loop internals (`buzz-pubsub/publisher.rs`, `subscriber.rs`, `presence.rs`) were not read line-by-line.

**Known residual gaps for future rounds:** exact fan-out matching algorithm in `subscription.rs:121-1966`; NIP-11 conformance fence interplay with multi-tenant hosts (`nip11.rs:313-341` documented above at summary level); push-lease handler internals (`handlers/push_lease.rs` — only its advertised limits via `nip11.rs:213-214` are covered).

---

_Report ends. All claims carry file:line citations; coverage stated above per board conventions._

