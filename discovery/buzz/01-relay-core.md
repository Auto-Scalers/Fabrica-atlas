# Buzz — Relay Core (buzz-core + buzz-relay)

> Source: `_sources/buzz/crates/buzz-core/`, `_sources/buzz/crates/buzz-relay/`
> Commit: `8868787`

## Overview

The relay core is the heart of Buzz — a Nostr-protocol WebSocket server that orchestrates all subsystems. `buzz-core` is the zero-I/O foundation; `buzz-relay` is the Axum-based server that ties everything together.

## buzz-core (Zero-I/O Foundation)

**Location:** `crates/buzz-core/src/` (19 files)

### Purpose
Provides shared types, event verification, filter matching, and kind registry used by all other crates. Contains NO I/O — pure logic and data structures.

### Key Files

| File | Purpose |
|------|---------|
| `kind.rs` | Event kind registry — 127 distinct Nostr event kinds defined |
| `event.rs` | Core Nostr event structure, signing, serialization |
| `filter.rs` | NIP-01 filter matching (subscription REQ filters) |
| `verification.rs` | Schnorr signature verification, event ID computation |
| `channel.rs` | Channel-related types and helpers |
| `nip10.rs` | NIP-10 reply threading (e, p tag handling) |
| `tenant.rs` | Multi-tenant community binding (host → community resolution) |
| `network.rs` | SSRF protection — enumerated-deny IP policy for outbound requests |

### Architecture Pattern
- Pure data + pure functions
- All service crates depend on `buzz-core` for type definitions
- `buzz-relay` is the only crate allowed to orchestrate I/O

## buzz-relay (WebSocket Server)

**Location:** `crates/buzz-relay/src/` (30 files)

### Purpose
The main entry point. Axum-based WebSocket server that:
- Accepts client WebSocket connections (NIP-01 EVENT/REQ/CLOSE/NIP-42 AUTH)
- Routes events to appropriate subsystems
- Manages subscriptions, presence, typing indicators
- Orchestrates push notifications, mesh transport, audio/tunnel features

### Key Files

| File | Purpose |
|------|---------|
| `main.rs` | Server entry point, config loading, subsystem startup |
| `lib.rs` | Public re-exports for integration testing |
| `router.rs` | Axum router — HTTP + WebSocket routes |
| `state.rs` | Shared application state (DB pools, Redis, config) |
| `connection.rs` | Per-connection state machine (open → auth → subscribe → close) |
| `subscription.rs` | REQ filter matching + event fan-out |
| `config.rs` | Runtime config (loaded from env) |
| `admission.rs` | Event admission control (rate limits, signature checks) |
| `push_runtime.rs` | Push notification dispatch logic |
| `workflow_sink.rs` | Sink events into workflow execution engine |
| `handlers/` | WebSocket message handlers (EVENT, REQ, CLOSE, AUTH) |
| `api/` | HTTP API routes (admin, media, auth) |
| `audio/` | Voice huddle audio relay (Opus packets) |
| `tunnel/` | Tunnel/mesh transport endpoint |

### Connection Lifecycle

```
TCP connect → WebSocket upgrade → NIP-42 AUTH challenge → signed AUTH → open
  ↓
Client sends REQ → subscription created → matching events streamed
Client sends EVENT → admission control → signature verify → store → fan-out
  ↓
Close frame → connection cleanup → subscriptions dropped
```

### Event Pipeline

1. **Receive** — raw WebSocket frame
2. **Parse** — JSON → Nostr event (kind.rs enum)
3. **Verify** — Schnorr signature + event ID hash
4. **Auth check** — NIP-42 challenge response + scope check
5. **Admission** — rate limit, host/community binding
6. **Store** — Postgres insert (partitioned by month)
7. **Fan-out** — Redis pub/sub + per-connection subscription match
8. **Index** — FTS update + mention index update
9. **Push** — NIP-PL push notification if applicable
10. **Audit** — append to hash-chained audit log

### WebSocket Protocol
- NIP-01: EVENT, REQ, CLOSE, NOTICE, EOSE
- NIP-42: AUTH challenge-response
- Custom kinds: 9xxxxx range for Buzz-specific events (huddle, canvas, workflow)

### Security
- NIP-42 challenge-response per connection
- All events signed (Schnorr)
- Rate limiting per pubkey + per IP
- SSRF protection on outbound URLs
- Hash-chained audit log (SHA-256)
- Enumerated-deny IP policy (no private/loopback in outbound)

### Metrics
Prometheus metrics on `/metrics` endpoint — connection count, events/sec, subscription count, p50/p99 latency.

## Scan Coverage

- `crates/buzz-core/src/` — all 19 files enumerated, key files inspected
- `crates/buzz-relay/src/` — all 30 files enumerated, key files inspected
- `crates/buzz-relay/src/handlers/`, `api/`, `audio/`, `tunnel/` — subdirs enumerated
- `Cargo.toml` workspace member list verified
- **Not deeply read:** individual handler implementations, internal state machine details
