# Buzz — Services (buzz-db, buzz-auth, buzz-pubsub, buzz-search, buzz-audit, buzz-workflow, buzz-media, buzz-deletion, buzz-conformance)

> Source: `_sources/buzz/crates/`
> Commit: `8868787`

## Overview

The service crates provide the relay's persistence, auth, real-time fan-out, search, audit, and automation layers. All are isolated — only `buzz-relay` orchestrates them.

---

## buzz-db (Postgres Event Store)

**Location:** `crates/buzz-db/src/` (5 sub-dirs)

### Purpose
Postgres-backed event store with channel/membership/workflow/audit tables. Owns the canonical SQLx queries for all event persistence.

### Key Files

| File | Purpose |
|------|---------|
| `lib.rs` | Crate entry, connection pool init |
| `store/` | Event, channel, member, workflow, audit insert/select operations |
| `runtime/` | Connection management, transaction helpers |
| `error.rs` | `DbError` enum, error → HTTP status mapping |

### Tables Owned
- `events` (monthly range-partitioned, `community_id` scoped)
- `channels`, `channel_members`
- `workflows`, `workflow_runs`, `workflow_approvals`
- `push_leases`, `push_endpoints`
- `delivery_log` (partitioned)
- `event_mentions` (normalized mention index)

### Patterns
- All queries are SQLx compile-time-checked
- Monthly range-partitioning for `events` table (auto-create)
- Per-community scoping enforced in WHERE clauses

---

## buzz-auth (NIP-42 / NIP-98 Auth)

**Location:** `crates/buzz-auth/src/` (9 files)

### Purpose
Schnorr signature-based authentication for WebSocket (NIP-42) and HTTP (NIP-98) endpoints. Includes rate limiting and scope checks.

### Key Files

| File | Purpose |
|------|---------|
| `nip42.rs` | NIP-42 challenge-response for WebSocket |
| `nip98.rs` | NIP-98 HTTP auth header verification |
| `scope.rs` | Scope/permission constants and checks |
| `rate_limit.rs` | Per-pubkey + per-IP rate limiting |
| `access.rs` | Access control helpers |
| `nip_fi/` | NIP-FI federated identity |
| `nip98_replay.rs` | NIP-98 replay protection (timestamp window) |

### Features
- NIP-42: WebSocket challenge → signed AUTH event
- NIP-98: HTTP `Authorization: Nostr <base64-event>` header
- Scope-based authorization (read/write/admin)
- Replay protection (timestamp + signature uniqueness)
- Federated identity via NIP-FI

---

## buzz-pubsub (Redis Fan-Out)

**Location:** `crates/buzz-pubsub/`

### Purpose
Redis-based pub/sub for multi-node fan-out. Also manages presence and typing indicators.

### Features
- Redis PUBLISH/PSUBSCRIBE for cross-node event delivery
- Presence: Redis SET with EX (expiry) for online status
- Typing: Redis ZADD/ZRANGE for typing indicators
- Per-community channel isolation

### Why Redis
Multi-node relay deployments need shared pub/sub — Postgres LISTEN/NOTIFY is per-database, Redis is the standard for this scale.

---

## buzz-search (Postgres FTS)

**Location:** `crates/buzz-search/`

### Purpose
Full-text search over events using Postgres' built-in FTS. No external search engine.

### Implementation
- `search_tsv` generated column on `events` table (tsvector)
- GIN index on `search_tsv`
- Privacy-aware: excludes DMs by default, opt-in
- Multilingual via `simple` config

### Query API
- `search_events(q, filters)` — returns matching events
- Supports NIP-50 search extension (kind, since, until, author filters)

---

## buzz-audit (Hash-Chain Log)

**Location:** `crates/buzz-audit/`

### Purpose
Tamper-evident append-only audit log using SHA-256 hash chaining.

### Features
- 10 distinct audit action types (event_publish, channel_create, vault_unlock, etc.)
- Each entry: `(prev_hash, action, actor, target, metadata, hash)`
- `pg_advisory_lock` to serialize writes
- Per-community chain (each community has its own chain head)

### Why Hash Chain
Any tampering invalidates the chain — admin can detect modifications by re-computing from the genesis entry.

---

## buzz-workflow (YAML Automation Engine)

**Location:** `crates/buzz-workflow/src/` (5 files)

### Purpose
YAML-as-code automation engine. Users define workflows that trigger on events and execute actions.

### Key Files

| File | Purpose |
|------|---------|
| `schema.rs` | YAML schema definitions (triggers, actions, conditions) |
| `executor.rs` | Workflow execution engine (state machine) |
| `action_sink.rs` | Action execution (send message, react, call webhook, etc.) |
| `lib.rs` | Crate entry |
| `error.rs` | Error types |

### Triggers
- message, reaction, schedule (cron), webhook, join, leave

### Actions (7 types)
- send_message, add_reaction, call_webhook, dispatch_agent, schedule, delay, approve_request

### Approval Gates
Workflows can pause for human approval via `workflow_approvals` table (SHA-256 hashed token URLs).

---

## buzz-media (Blossom / S3 Storage)

**Location:** `crates/buzz-media/src/` (11 files)

### Purpose
Media storage abstraction over Blossom (NIP-B7) and S3-compatible backends (MinIO, R2).

### Key Files

| File | Purpose |
|------|---------|
| `storage.rs` | Storage backend trait + S3/Blossom impls |
| `upload.rs` | Upload handling, chunked uploads |
| `thumbnail.rs` | Thumbnail generation (image, video) |
| `validation.rs` | MIME type, file size, hash validation |
| `config.rs` | Storage config (S3 endpoint, bucket, credentials) |

### Features
- S3-compatible backend (works with MinIO, R2, AWS S3)
- Blossom protocol (Nostr-signed media URLs)
- Thumbnail generation
- Content-addressed (SHA-256 of file = URL)
- Per-community bucket isolation

---

## buzz-deletion

**Location:** `crates/buzz-deletion/src/` (1 file)

### Purpose
Event and channel deletion logic (soft + hard delete, GDPR-style).

### Features
- Soft delete (event remains but hidden)
- Hard delete (event row removed)
- Channel-level delete (cascade events)
- Tombstone events for transparency (no silent enforcement)

---

## buzz-conformance (Multi-Tenant Testing)

**Location:** `crates/buzz-conformance/`

### Purpose
Multi-tenant conformance testing — replay checker + golden fixtures to verify cross-tenant isolation.

### Key Files

| File | Purpose |
|------|---------|
| `src/` | Test runner, replay checker |
| `tests/` | Multi-tenant scenario tests |
| `TRACE_SCHEMA.md` | Test trace format spec |
| `LIMITS.md` | Conformance limits (event size, etc.) |

### Why It Matters
Multi-tenant relays must never leak data across communities. Conformance tests verify isolation by replaying events from tenant A into tenant B and checking rejection.

---

## Scan Coverage

- All 9 service crates enumerated
- `Cargo.toml` workspace member list verified
- Key files in each crate inspected
- `buzz-db/` 5 sub-dirs enumerated
- `buzz-auth/` 9 files enumerated
- `buzz-workflow/` 5 files enumerated
- `buzz-media/` 11 files enumerated
- **Not deeply read:** individual SQL queries, internal state machine details, all handler implementations
