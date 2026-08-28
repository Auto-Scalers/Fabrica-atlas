# R4-1.17 — buzz `buzz-search` + `buzz-pubsub` Deep Dive (Round 4)

> Task: ATLAS R4-1.17 · READ-ONLY deep dive of the buzz search and pub/sub crates plus related index/storage code.
> Sources: `_sources/buzz/crates/buzz-search/`, `_sources/buzz/crates/buzz-pubsub/`, related code in `migrations/`, `crates/buzz-relay/src/`, `crates/buzz-cli/src/`, `crates/buzz-core/src/kind.rs`, `schema/schema.sql`, `ARCHITECTURE.md`.
> All paths relative to `_sources/buzz/` unless noted. Every claim carries a file:line citation.

---

## 1. Executive Summary

- **Search** (`buzz-search`) is not a search engine at all — it is a thin query layer over **Postgres full-text search** on the `events` table. The index is a `GENERATED ALWAYS ... STORED` tsvector column (`search_tsv`) with a single-column GIN index; "indexing" happens as a side effect of every row insert (crates/buzz-search/src/lib.rs:3-15).
- **Pub/sub** (`buzz-pubsub`) is a thin, community-scoped layer over **Redis pub/sub**: dynamic per-topic SUBSCRIBE on one dedicated connection, fan-out to local WebSocket receivers via tokio broadcast channels, plus Redis-backed presence, rate limiting, NIP-98 replay protection, cross-pod cache invalidation, and cross-pod connection control (crates/buzz-pubsub/src/lib.rs:3-44).
- Both crates are deliberately *not* security boundaries: search returns candidate hits that the relay re-authorizes per hit (crates/buzz-search/src/query.rs:1-9); pub/sub topics are "a routing/performance boundary, not an authorization boundary" (crates/buzz-pubsub/src/topic.rs:1-5).
- Storage engines: **PostgreSQL 17** for events + FTS (ARCHITECTURE.md:776), **Redis** (deadpool pool + dedicated async pub/sub connection) for fan-out/state (crates/buzz-pubsub/src/lib.rs:7-22).

---

## 2. `buzz-search` — Crate Anatomy

Files (all scanned in full):

| File | Size | Role |
|---|---|---|
| crates/buzz-search/Cargo.toml | 19 lines | deps: buzz-core, buzz-datastore-tracing, sqlx, uuid, thiserror, tracing (Cargo.toml:10-16) |
| crates/buzz-search/src/lib.rs | 54 lines | `SearchService` handle over `PgPool` (lib.rs:39-53) |
| crates/buzz-search/src/error.rs | 9 lines | single `SearchError::Db(sqlx::Error)` variant (error.rs:5-8) |
| crates/buzz-search/src/query.rs | 369 lines | entire query surface (query.rs) |
| crates/buzz-search/tests/fts_integration.rs | ~43KB | integration/regression suite (scanned via targeted greps; see coverage §10) |

### 2.1 The index: Postgres FTS via generated column

The crate doc states the design invariant outright:

- Index lives in the `events` table: `search_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED`, with `GIN (search_tsv)` as the access path (crates/buzz-search/src/lib.rs:4-7).
- Because the column is `GENERATED ALWAYS`, "every row write *is* the index update — there is no separate indexer, no mpsc queue, no reindex job, no consistency window"; a client cannot forge a tsvector out of sync with the content it signed (lib.rs:7-10).
- This crate is only the **query** side; indexing is owned by `buzz-db`'s row inserts (lib.rs:12-13).

Schema definition (initial migration):

- Column declared at migrations/0001_initial_schema.sql:222-226 — `CASE WHEN kind IN (1059, 30300, 30622, 44100, 44101) THEN NULL::tsvector ELSE to_tsvector('simple', content) END STORED`.
- Rationale documented inline: no sidecar indexer to keep coherent ("Quinn option A"), `'simple'` config = no stemming/stopwords, tenant scoping via community-leading btree filters BitmapAnd-ed with the GIN probe so the GIN stays single-column (0001_initial_schema.sql:198-205).
- GIN index: `CREATE INDEX idx_events_search_tsv ON events USING GIN (search_tsv);` (0001_initial_schema.sql:278).
- The `events` table is range-partitioned by `created_at` with PK `(community_id, created_at, id)` (0001_initial_schema.sql:234-252); supporting hot-path indexes are all community-leading (0001_initial_schema.sql:257-273), which is what makes the tenant fence cheap (BitmapAnd with the GIN probe).

### 2.2 Index-expression evolution (privacy allowlist drift)

The generated expression changed three times after 0001; Postgres cannot ALTER a generated expression in place, so each change DROPs and re-ADDs the column:

1. **0005_agent_turn_metric_fts.sql** — adds kind 44200 (NIP-AM Agent Turn Metrics, NIP-44 ciphertext content; spec forbids indexing it) to the exclusion list → exclusions `(1059, 30300, 30622, 44100, 44101, 44200)` (migrations/0005_agent_turn_metric_fts.sql:1-30). Pattern note: additive migration, frozen-SQL files can't import Rust constants, regression tests required in `fts_integration.rs` (0005:6-20).
2. **0008_fresh_install_search_allowlist.sql** — flips populated-database *exclusion lists* into a fresh-install **positive allowlist**: only kinds `0, 9, 40002, 45001, 45003` get a tsvector; applied only when the events table is empty (LOCK TABLE + emptiness check) so brownfield DBs keep their prior expression until an operator runs `scripts/maintenance/nip_rs_search_allowlist.sql` (migrations/0008_fresh_install_search_allowlist.sql:1-23; maintenance script at scripts/maintenance/nip_rs_search_allowlist.sql:11-18).
3. **0014_push_lease_fts.sql** — wraps whatever expression currently exists with `CASE WHEN kind = 30350 THEN NULL ELSE (<existing>) END`, preserving both the fresh-install allowlist and operator-managed expressions; captures the live expression via `pg_get_expr` before replacing (migrations/0014_push_lease_fts.sql:11-33).

Net current semantics: **positive allowlist `{0, 9, 40002, 45001, 45003}` on fresh installs**, minus push-lease kind 30350 everywhere; NULL tsvector never matches `@@`, making excluded rows storage-level unsearchable (0005:22-23; bridge.rs:1840-1845 confirms the allowlist set).

### 2.3 Privacy coupling between kind registry and storage

- `P_GATED_KINDS` in buzz-core documents that for stored p-gated kinds "the storage layer additionally writes a NULL `search_tsv` so the event is unsearchable through NIP-50 FTS", with drift caught by the test `p_gated_persistent_kinds_have_storage_null_tsvector` (crates/buzz-core/src/kind.rs:144-154).
- Ephemeral kinds 20000–29999 are filter-gated but never stored, so the storage defense doesn't apply (kind.rs:156-158).

### 2.4 Query surface

Public API re-exports (lib.rs:29-31): `CommunityId`, `SearchError`, and from query.rs: `search`, `ChannelScope`, `SearchHit`, `SearchMode`, `SearchQuery`, `SearchResult`.

**`ChannelScope` enum** (crates/buzz-search/src/query.rs:43-55) — four variants replacing the legacy Typesense-era `(accessible_channels: &[Uuid], include_global: bool)` 2×2 matrix:

| accessible | include_global | variant |
|---|---|---|
| non-empty | true | `ChannelsOrChannelLess(accessible)` |
| non-empty | false | `Channels(accessible)` |
| empty | true | `ChannelLessOnly` |
| empty | false | don't call — caller short-circuits to EOSE (query.rs:29) |

`ChannelLessOnly` exists because the old shape could not unambiguously express "empty accessible channels + include global" without silently broadening to all community channels; the enum closes that hole at the type level (query.rs:31-36). Empty-vec edge cases are deliberate: `Channels(vec![])` emits `channel_id = ANY('{}')` which is false-for-all-rows (zero hits) (query.rs:38-42).

**`SearchMode` enum** (query.rs:58-68):
- `FullText` — standard NIP-50-ish word search via `websearch_to_tsquery('simple', $text)` (query.rs:60, 144-148).
- `Prefix` — prefix-matches only the trailing token (`pro` matches `project`), intended for bounded typeahead surfaces such as the desktop topbar; changes only the candidate tsquery, never the access boundary (query.rs:62-67, 149-178). Prefix construction normalizes each whitespace token through Postgres' `simple` parser (matching the column) and uses `quote_literal` to prevent tsquery syntax injection from punctuation in raw input (query.rs:150-156).

**`SearchQuery` struct** (query.rs:75-101):
- `community: CommunityId` — REQUIRED at the type level; no construction path omits it; server-resolved tenant, never client input ("conformance row zero") (query.rs:72-78).
- `q: String` — empty string rejected early, no SQL roundtrip (query.rs:79-81; normalization at query.rs:181-198: trim, NUL→space, hard cap `SEARCH_TEXT_MAX_CHARS = 4096` chars, query.rs:136).
- `channel_scope` (query.rs:82-86), optional NIP-01 filters `kinds` / `authors` / `since` / `until` (query.rs:87-94).
- Pagination: `page` (1-indexed), `per_page` clamped at `PER_PAGE_MAX = 500`, default 100 when 0 (query.rs:95-98, 131-132); page clamped at `PAGE_MAX = 1000` to keep untrusted input away from trillion-row OFFSETs (query.rs:137-140).

**`SearchHit`** (query.rs:106-120): `event_id [u8;32]`, `kind i32`, `pubkey [u8;32]`, `channel_id Option<Uuid>` (None = channel-less), `created_at i64` (unix secs), `rank f32` (`ts_rank_cd` relevance). Deliberately minimal — just enough to drive the relay's refetch while preserving relevance order (query.rs:103-105).

**SQL shape** — documented verbatim at query.rs:203-214:

```sql
SELECT id, kind, pubkey, channel_id, EXTRACT(EPOCH FROM created_at)::bigint AS created_at_s,
       ts_rank_cd(search_tsv, query) AS rank
FROM events, <mode-specific tsquery> AS query
WHERE community_id = $ctx
  AND deleted_at IS NULL
  AND search_tsv @@ query
  [+ channel scope, kinds, authors, since, until]
ORDER BY rank DESC, created_at DESC, id
LIMIT $per_page OFFSET (($page - 1) * $per_page)
```

`community_id = $ctx` is always the first predicate and non-negotiable — "no code path through this function that omits it" (query.rs:216-217; bind at query.rs:251-253). Soft-deleted rows excluded via `deleted_at IS NULL` (query.rs:253). Ordering is relevance-first, then recency, then id (deterministic tiebreak) (query.rs:311).

One special-cased caller shape: profile typeahead (`mode == Prefix && kinds == [0] && ≤2 chars`) puts exact-lexeme rows first so short queries on busy communities don't push an exact display name off page 1 (query.rs:235-242, 306-312).

Execution is instrumented with `#[datastore_span(name = "search", system = "postgresql")]` (query.rs:218) using `buzz-datastore-tracing` (query.rs:15).

**Errors** (error.rs:4-9): a single `SearchError::Db(#[from] sqlx::Error)` — the crate has no domain logic to fail.

**`SearchService`** (lib.rs:39-53): `Debug + Clone` wrapper around `PgPool`; exists purely as "a stable injection point for the relay's `AppState`" (lib.rs:35-38). Wired into relay state at crates/buzz-relay/src/state.rs:28, :644 (`pub search: Arc<SearchService>`), constructed at main.rs:18/:416.

---

## 3. Relay Integration — How Queries Reach the Index

Two consumer surfaces route NIP-50 `search` filters to `buzz-search` (repo AGENTS.md documents this policy for `POST /query`: "_sources/buzz/AGENTS.md" — NIP-50 search filters routed to buzz-search automatically):

### 3.1 WebSocket path (`handlers/req.rs`)

- `handle_search_req` — "Handle a NIP-50 search REQ: query Postgres FTS, fetch full events, deliver results, EOSE. Search subscriptions are one-shot — no persistent subscription" (crates/buzz-relay/src/handlers/req.rs:581-583).
- Page budget: `SEARCH_PAGE_SIZE = 100` candidates per FTS page (req.rs:482-486); `MAX_SEARCH_PAGES = DEFAULT_MAX_PAGE_LIMIT.div_ceil(SEARCH_PAGE_SIZE)` derived from the advertised page ceiling — bounds candidates *scanned*, not events *emitted*, since post-filtering can discard any share (req.rs:488-499).
- Channel scope mapping: legacy pair → `ChannelScope` via `build_search_channel_scope_filter`, with `None` meaning "don't call search at all → EOSE" (req.rs:547-579). A `#h` tag on the filter narrows scope to those channels intersected with the accessible set; if all are inaccessible the filter matches nothing rather than broadening (req.rs:624-646).
- Pushdown philosophy: "Push as many NIP-01 constraints into the FTS query as possible so post-filtering is a correction step, not the primary filter" (req.rs:624-625).
- Paginated scan loop pages 1..=MAX_SEARCH_PAGES until `limit` emitted or result set exhausted (short page = last page) (req.rs:665-701, :799-801).
- Hydration + re-authorization per hit: batch fetch canonical `StoredEvent`s through `state.db.get_events_by_ids_routed("req_search_hydrate", …)` scoped by community (req.rs:702-717), then per hit: NIP-01 filter match (req.rs:773-776) → channel membership check against the request-local repaired access vector (req.rs:777-781; vector built/repaired via `resolve_request_local_access`, req.rs:501-545) → `event_visible_to_reader` result-level gate covering author-only, persona shared-gate, and result-gated kinds (req.rs:782-786) → dedup AFTER acceptance to preserve NIP-01 OR semantics (req.rs:787-791).

### 3.2 HTTP bridge path (`api/bridge.rs`, `POST /query`)

- Bridge-only extensions parsed from raw JSON: `search_mode` / `searchMode` (`"prefix"` → `SearchMode::Prefix`, anything else FullText) at api/bridge.rs:337-346; `page` / `search_page` / `searchPage` (1-indexed, default 1) at bridge.rs:348-356.
- `handle_bridge_search` always includes channel-less global events (include_global=true), short-circuits to empty when there's no access at all (bridge.rs:1728-1738); limit defaults 100, capped 500 (bridge.rs:1751).
- Per-hit gate `search_hit_accepted(filter, stored, accessible_channels, reader_pubkey_hex)` (bridge.rs:1698-1716): full NIP-01 match + channel-scope membership + `reader_authorized_for_event`. Its doc explains the threat: without it an authorized engram search like `{"kinds":[30174],"#p":[self]}` would leak text-matching envelopes whose `#p` belongs to another owner — the read gate would be bypassed for `/query` (bridge.rs:1686-1694).
- Defense-in-depth second gate `event_visible_to_reader` runs even though kind:30175 isn't in the FTS allowlist today, "so a future FTS allowlist change cannot silently reopen the bypass" (bridge.rs:1839-1848).
- Mixed filters (some with search, some without) are handled separately via `has_mixed_search_filters` (bridge.rs:1682-1684).

### 3.3 CLI surface (`buzz-cli`) — agent-facing search

- `buzz messages search --query … --author … --since … --limit …` — full-text search across messages (crates/buzz-cli/src/lib.rs:498-500). Implementation `cmd_search` requires at least one of query/author, caps limit at 100, resolves `--author` display names via NIP-50 profile search, and pins kinds `[9, 40002, 45001, 45003]` — exactly the FTS positive allowlist minus profiles (crates/buzz-cli/src/commands/messages.rs:430-463; repo gotcha #3 says do NOT add `--kinds` here — _sources/buzz/AGENTS.md "Common Gotchas").
- Author-only queries sort newest-first since relevance ordering doesn't apply (messages.rs:465-471).
- `buzz channels search --query … [--exact] [--include-archived]` also exists (lib.rs:552; commands/channels.rs:119).
- Display-name resolution across commands (`users`, `notes`, dms) reuses NIP-50 search on kind:0 (commands/users.rs:14-28, :285-330; commands/notes.rs:202-215).

### 3.4 Conformance posture

Multi-tenant conformance row 50 codifies the model: searchable rows expose id/content/kind/pubkey/channel_id/created_at/tag terms; the query carries `req.community`; refetch is by `(community_id, event_id)`; "ChannelLessOnly means channel-less within the community, not platform global" (docs/multi-tenant-conformance.md:50). ARCHITECTURE.md summarizes: no separate search service or out-of-band indexer; permission filtering is the caller's responsibility; buzz-search neither enforces access nor writes events (ARCHITECTURE.md:464-489).

---

## 4. `buzz-pubsub` — Crate Anatomy

Files (all read in full): Cargo.toml (deps include redis, deadpool-redis, buzz-core, buzz-auth, nostr — Cargo.toml:10-23), lib.rs (629 lines), topic.rs, publisher.rs, subscriber.rs, presence.rs, rate_limiter.rs, nip98_replay.rs, cache_invalidation.rs, conn_control.rs, error.rs.

### 4.1 Architecture & connection topology

Module doc diagram (crates/buzz-pubsub/src/lib.rs:5-15):

```
buzz-relay process
  ├── deadpool-redis pool → PUBLISH, SET, ZADD, etc.
  └── dedicated redis::aio::PubSub connection (NOT from pool)
        └── dynamic SUBSCRIBE buzz:{community}:channel:{id} / buzz:{community}:global
              └── run_subscriber() → broadcast::channel(4096) → N WS receivers
```

- The dedicated pub/sub connection is stateful and cannot be pooled; pool connections handle everything else (lib.rs:19-21).
- Subscriber reconnects automatically with exponential backoff 1s → 2s → 4s → … → 30s max (lib.rs:16-18; constants BACKOFF_INITIAL_SECS=1, BACKOFF_MAX_SECS=30 at subscriber.rs:14-17; loop doubling at subscriber.rs:43-70, reset to 1s on clean disconnect at subscriber.rs:54-59).
- Lagged broadcast receivers get `RecvError::Lagged` — slow consumers self-report rather than block (lib.rs:22; error mapping error.rs:31-38 `BroadcastLagged` / `SubscriberStopped`).

### 4.2 Topic model (`topic.rs`)

- `EventTopic` enum: `Channel(Uuid)` or `Global` — tenant-local routing scopes (topic.rs:16-22).
- `EventTopicKey { community_id, topic }` fully qualifies with the server-resolved community (topic.rs:24-40).
- Redis channel names: `buzz:{community}:channel:{uuid}` and `buzz:{community}:global` (topic.rs:42-50; `BUZZ_PREFIX = "buzz"` at topic.rs:13).
- Strict channel-name parser rejects wrong prefix, bad UUID, extra segments, and even `presence:`-style channels (topic.rs:52-99; negative tests topic.rs:180-196).
- Security stance stated at the top: topics are routing/performance boundary, NOT authorization; tenant identity comes from `TenantContext` and the relay re-checks access before local fan-out (topic.rs:1-5).
- Same channel UUID in two communities yields distinct keys — tested (topic.rs:139-148) and behaviorally tested end-to-end in lib.rs:512-590.

### 4.3 `PubSubManager` internals (lib.rs)

- Fields (lib.rs:100-113): deadpool pool, redis URL (kept for reconnect), unsubscribe debounce, `desired_topics` refcount map (source of truth across reconnects), mpsc command sender (cap 4096), and three broadcast senders (events / cache-invalidation / conn-control), each capacity 4096 (lib.rs:126-129).
- `retain_topic(ctx, topic)` — first retain triggers a `Subscribe` command; further retains only bump the local refcount (lib.rs:192-208).
- `release_topic` — last release schedules `UnsubscribeIfIdle` after a debounce delay (default 500ms, `DEFAULT_UNSUBSCRIBE_DEBOUNCE`, lib.rs:80-96); a retain during the window makes the pending unsubscribe a no-op (lib.rs:210-245). This kills subscribe/unsubscribe churn on rapid channel switches.
- `run_subscriber(self: Arc<Self>)` — starts the fan-out loop exactly once (second call errors out via `Option::take` on the receiver) (lib.rs:144-161).
- `publish_event` delegates to publisher (lib.rs:322-329) with an important routing note: author-private reminders (kind:30300) are NOT protected by Redis routing because every node must receive them anyway; the real delivery boundary is `filter_fanout_by_access` in the relay running on BOTH in-process and Redis cross-node paths; Redis carries events only inside the relay trust domain, and reminder payloads are NIP-44-encrypted regardless (lib.rs:308-321).
- Presence API: `set_presence` (call on connect + every 60s heartbeat), `clear_presence` (clean disconnect), `get_presence`, `get_presence_bulk` (lib.rs:331-366).

### 4.4 Publisher / Subscriber flow

- **publisher.rs** — single `publish_event(pool, ctx, topic, event)`: gets a pooled connection, computes `EventTopicKey.redis_channel()`, serializes the Nostr event with `as_json()`, `PUBLISH`es, returns subscriber count (publisher.rs:22-37). Thin key helpers `channel_key` / `global_key` re-exported (publisher.rs:11-19).
- **subscriber.rs** — `run_subscriber` owns the reconnect loop (subscriber.rs:37-71). Each `connect_and_subscribe`: opens a dedicated async pub/sub connection (subscriber.rs:81-83), snapshots desired topics with count > 0 and subscribes to them BEFORE processing messages — the refcount map is the source of truth across reconnects (subscriber.rs:33-36, 86-98) — then `tokio::select!` loops over subscription commands (Subscribe inserts once; UnsubscribeIfIdle unsubscribes only if refcount still 0) and message stream (subscriber.rs:105-171). Incoming payloads are parsed back into `nostr::Event` and wrapped in `ChannelEvent { community_id, topic, event }` decoded from the channel name (subscriber.rs:139-164); messages on unexpected channels or undecodable payloads are logged and skipped, never panic (subscriber.rs:131-154).

### 4.5 Presence (`presence.rs`)

- Key format `buzz:{community}:presence:{pubkey_hex}`, value = status string, `SET ... EX 180` (presence.rs:19-25, 28-44).
- TTL constant `PRESENCE_TTL_SECS = 180` — "3× the 60s heartbeat — single missed heartbeat won't cause presence flap" (presence.rs:15-16, unit-tested at presence.rs:112-116).
- `clear_presence` DELs on clean disconnect (presence.rs:47-59); bulk reads use one `MGET` (presence.rs:74-94). Per-community isolation tested (presence.rs:131-140).

### 4.6 Rate limiter (`rate_limiter.rs`)

- Implements `buzz-auth`'s `RateLimiter` trait (rate_limiter.rs:12-15, 99-121).
- Atomic Lua script: `INCR`, `EXPIRE` only on count==1, return `{count, ttl}` — eliminates the crash window where a key exists without TTL (rate_limiter.rs:24-31).
- Self-healing: a negative TTL (broken state) triggers a warning + fresh EXPIRE repair (rate_limiter.rs:56-72).
- Key scoping: pubkey keys community-scoped `buzz:{community}:ratelimit:{pubkey_hex}:{suffix}`; IP keys remain operator-global `buzz:ratelimit:ip:{ip}:conn` (rate_limiter.rs:81-88).
- Honest limitation documented: fixed windows allow up to 2× burst at boundaries; sliding-window/token-bucket would be needed for strict limiting (rate_limiter.rs:7-8).

### 4.7 NIP-98 replay guard (`nip98_replay.rs`)

- Implements `Nip98ReplayGuard` from buzz-auth using `SET buzz:{community}:nip98:{event_id_hex} 1 NX EX <ttl>` — atomic set-if-absent; first claim returns OK, replays within TTL get nil → `Ok(false)` (nip98_replay.rs:1-22, 63-96).
- TTL contract: clamp to `[DEFAULT_REPLAY_TTL_SECS, MAX_REPLAY_TTL_SECS]` — sub-floor lifted, above-ceiling pushed down so a buggy caller cannot send a Redis-incompatible EX arg (nip98_replay.rs:43-48).
- Failure mode is fail-closed: pool/SET errors log "caller MUST fail closed" and return Err (nip98_replay.rs:50-59, 74-81). Per-community seen-set isolation tested (nip98_replay.rs:146-162).

### 4.8 Cross-pod cache invalidation (`cache_invalidation.rs`)

- Problem solved: each pod keeps in-memory (moka) membership / accessible-channels / visibility caches; a write invalidates only the writer pod's entries, other pods would wait out a 10s TTL — this module carries identical key drops to every pod immediately (cache_invalidation.rs:1-13).
- Message is "a pure cache-key drop — never an 'evict these subscriptions' payload"; the per-event access gate remains the universal enforcement point, next read re-fetches authoritative DB state (cache_invalidation.rs:9-13).
- Channel `buzz:{community}:cache-invalidate`, subscribed via PSUBSCRIBE pattern `buzz:*:cache-invalidate` (cache_invalidation.rs:23-35, 135).
- `CacheInvalidation` serde-tagged enum mirrors the relay's local invalidate ops exactly (cache_invalidation.rs:53-79): `Membership{channel_id,pubkey}`, `AccessibleAll`, `Visibility{channel_id}`, `ChannelDeleted`. Wrapped in `ScopedCacheInvalidation` carrying the community (cache_invalidation.rs:81-88).
- Same exponential-backoff reconnect loop pattern as the event subscriber (cache_invalidation.rs:90-126). Fire-and-forget publish is safe: local drop already synchronous, REQ denial-path DB confirmation backstops a dropped publish (lib.rs:268-285).

### 4.9 Cross-pod connection control (`conn_control.rs`)

- Purpose: under horizontal scaling a banned member's socket may live on another pod; a ban taken on one pod must disconnect it there too (conn_control.rs:1-8).
- Deliberately a SEPARATE channel from cache invalidation: a cache drop is a pure idempotent hint; a disconnect is imperative and non-idempotent on a live socket — folding them together would break the cache module's invariant (conn_control.rs:10-15).
- `ConnControl` enum (conn_control.rs:53-71): `DisconnectCommunity`; `DisconnectPubkey{pubkey, event_id, reason}` — event_id + reason reproduce the same NIP-01 OK frame the origin pod sent so the member learns why on any pod.
- Durable backstop: the DB ban row refuses the next auth attempt even if the publish drops (conn_control.rs:14-15; publish wrapper lib.rs:287-305). Unknown future ops are rejected without affecting later messages (conn_control.rs:210-217).
- Live ban enforcement wired in relay state: `state.rs:1187` publishes conn-control; subscribers consume via `subscribe_conn_control()` (lib.rs:263-266; main.rs:937).

### 4.10 Errors (`error.rs`)

`PubSubError`: Redis, Pool, Serialization, BroadcastLagged(n), SubscriberStopped, InvalidChannelKey (error.rs:4-29) — with the RecvError conversion above (error.rs:31-38).

---

## 5. Event Flow: Relay ↔ Search ↔ Pub/Sub

The two subsystems are intentionally decoupled — they share only the `events` row:

1. **Write path (ingest)**: relay accepts a signed Nostr event → `buzz-db` INSERTs the row into Postgres `events`. The insert itself materializes `search_tsv` (generated column) and updates the GIN index — **there is no indexer daemon and no message between write and searchability** (crates/buzz-search/src/lib.rs:7-10; 0001_initial_schema.sql:198-205). Search freshness therefore equals DB commit freshness; conformance test notes confirm "Let FTS write-path settle… `search_tsv` is a generated column" (crates/buzz-test-client/tests/conformance_multitenant.rs:2182).
2. **Fan-out path (delivery)**: post-commit, `dispatch_persistent_event_inner` picks `EventTopic::Channel(ch)` or `Global` from the stored `channel_id`, marks the local-event cache, then `state.pubsub.publish_event(...)` PUBLISHes to Redis (handlers/event.rs:395-427). It then matches local subscriptions (`fan_out_scoped`) and passes them through `filter_fanout_by_access` (event.rs:429-440) — the chokepoint enforcing tenant label, author-only kinds, shared-gated kinds, private-channel membership, failing closed on visibility errors (event.rs:115-222). Other pods receive the same event via their dedicated subscriber connection → broadcast → WS receivers (subscriber.rs:125-165).
3. **Read/search path**: WS REQ or HTTP `/query` with a `search` filter → `state.search.search(SearchQuery)` → candidate hits ranked by `ts_rank_cd` → batch hydration via buzz-db scoped fetcher → per-hit re-authorization (`filters_match` + channel membership + `event_visible_to_reader` / `search_hit_accepted`) → EVENT frames → EOSE (req.rs:581-806; bridge.rs:1720-1859). Search never widens visibility (query.rs:1-9).
4. **Control planes riding the same Redis**: membership/visibility writes also publish cache-key drops (lib.rs:272-285); moderation bans publish conn-control disconnects (state.rs:1187); both consumed per-pod via dedicated PSUBSCRIBE loops (cache_invalidation.rs:100-176; conn_control.rs:90-162).
5. **Subscription lifecycle on the WS side**: REQ registration retains topics (req.rs:301-307), CLOSE/unsubscribe releases them (close.rs:21-27; req.rs:1142-1147; connection.rs:292-298 on teardown).

---

## 6. Relevance to Fabrica CLI-Agent Management

Fabrica's direction (task-file High-Level Goals) is a desktop CLI-agent management & operations platform. Mapping:

**Directly transferable patterns**

1. **Searchable agent-output archives — HIGH relevance.** Buzz's entire searchable corpus IS agent output: kind 40002 agent messages and kind 9 are in the FTS allowlist, and the CLI exposes them via `messages search` pinned to kinds `[9, 40002, 45001, 45003]` (commands/messages.rs:450-453). The architecture — index-as-generated-column, zero consistency window, cryptographically unforgeable tsvectors, per-hit re-auth — is precisely what a Fabrica "searchable agent output archive" wants: agent stdout/results land in Postgres, become FTS-searchable at commit time, and a CLI verb (`agent output search --query --agent --since`) maps 1:1 onto buzz's `messages search`. The `Prefix` mode (query.rs:62-67) is a ready-made pattern for Fabrica's palette/typeahead over agent names or past runs.
2. **Storage-level privacy exclusion list.** Buzz excludes encrypted/p-gated kinds from the tsvector at the STORAGE level, with a Rust-constant↔SQL drift test (kind.rs:144-154). Fabrica agents will produce secrets-bearing output (tokens, env dumps); the same pattern (allowlist what's searchable, NULL everything else, regression-test the drift) is directly reusable.
3. **Tenant-scoped-by-construction queries.** `SearchQuery.community` being type-level mandatory (query.rs:72-78) is a template for workspace/project-scoped search in Fabrica — make the workspace id a required struct field so no query path can omit it.
4. **Refcount + debounce subscription manager.** `PubSubManager.retain_topic/release_topic` with 500ms unsubscribe debounce and reconnect-safe desired-state snapshotting (lib.rs:192-245; subscriber.rs:86-98) is a clean blueprint for Fabrica-app live-tailing agent streams (subscribe to the agent channels the UI is actually viewing; survive reconnects without resubscribe storms).
5. **Cross-pod control planes.** Cache-invalidation (pure hint) vs conn-control (imperative action) separation (conn_control.rs:10-15) maps to Fabrica's needs: "config changed, drop cached agent registry" vs "kill agent session X now". The durable-backstop principle (DB row wins even if the message drops, conn_control.rs:14-15) applies to any kill/stop signal for managed agents.
6. **Presence with heartbeat-scaled TTL** (180s = 3× 60s heartbeat, presence.rs:15-16) — directly reusable for agent online/offline status indicators.

**Not relevant / low relevance**

- Community/multi-tenant fencing specifics (CommunityId everywhere, cutover tooling) — Fabrica is single-user desktop; the *pattern* (server-resolved scope) transfers, the machinery doesn't.
- NIP-98 replay guard and IP rate limiting (nip98_replay.rs, rate_limiter.rs:84-88) — relay-hardening concerns; a local Fabrica daemon rarely needs distributed replay protection, though the atomic Lua INCR+EXPIRE script is a nice snippet if Fabrica ever ships a shared relay.
- Typesense→Postgres migration history (query.rs:20-29 references the legacy Typesense relay) — historical context only.
- The 4096-capacity broadcast lagged-receiver semantics matter mainly at multi-hundred-WS-connection scale.

**Gap flagged for synthesis:** buzz has NO stored full transcript of agent *tool calls*/turn metrics searchable by content — kind 44200 turn metrics are deliberately unsearchable ciphertext (0005_agent_turn_metric_fts.sql:1-4). If Fabrica wants full-text over agent reasoning/tool traces, it must decide plaintext-at-rest storage (with the 0008-style allowlist discipline) rather than copying buzz's encrypt-and-exclude approach for that data class.

---

## 7. Scan-Coverage Statement

**Fully read, line-by-line (every file):**
- `_sources/buzz/crates/buzz-search/`: Cargo.toml, src/lib.rs, src/error.rs, src/query.rs (4/5 files; 100% of src)
- `_sources/buzz/crates/buzz-pubsub/`: Cargo.toml, src/lib.rs, src/error.rs, src/topic.rs, src/publisher.rs, src/subscriber.rs, src/presence.rs, src/rate_limiter.rs, src/nip98_replay.rs, src/cache_invalidation.rs, src/conn_control.rs (11/11 files — complete crate)
- `_sources/buzz/migrations/`: 0001_initial_schema.sql (lines 195-289 region incl. full events-table/index block), 0005, 0008, 0014 (complete)
- Targeted regions: crates/buzz-relay/src/handlers/req.rs (480-829), api/bridge.rs (330-359, 1660-1859), handlers/event.rs (100-229, 390-459), state.rs (grep-level: fields/wiring lines), main.rs (grep-level wiring)
- crates/buzz-core/src/kind.rs (135-165), ARCHITECTURE.md (455-505), docs/multi-tenant-conformance.md:50, crates/buzz-cli/src/commands/messages.rs (425-474), cli lib.rs + commands grep surface

**Scanned via ripgrep/grep only (matches reviewed in context, files not fully read):**
- buzz-search/tests/fts_integration.rs (43KB — structure and privacy-regression test names reviewed via grep hits at :1147-1148, :1302, :1319, :1404)
- crates/buzz-test-client/tests/conformance_multitenant.rs (:2072, :2182), e2e_nostr_interop.rs (:968-1045)
- crates/buzz-cli/src/commands/{channels,users,notes}.rs (search-command surfaces via grep)
- scripts/maintenance/nip_rs_search_allowlist.sql, scripts/cutover/* (grep context)
- Remaining relay call-sites of `SearchService::new` in tests (admin/mod.rs, invites.rs, media.rs, operator.rs, git/*.rs, identity_archive.rs, relay_admin.rs, workflow_sink.rs — all test-fixture wiring, pattern-identical)

**Skipped (justified):**
- migrations 0002-0004, 0006-0007, 0009-0013, 0015-0031 — outside search/pubsub scope except where greps showed search_tsv involvement (none did beyond those read)
- buzz-db crate internals (covered by R4-1.2 bz-db-schema.md; only its migration.rs assertions were grep-sampled here)
- web/, desktop/, mobile/ clients' search UI — client-side, covered by other tasks
- _sources/buzz root docs other than those cited

**No file under `_sources/` or `../Fabrica-app/` was modified** (read-only honored); output written only to `.Fabrica-atlas-board/discovery/round4/`.
