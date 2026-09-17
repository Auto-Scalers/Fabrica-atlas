# Buzz — Mesh, Networking, Push, Backend (buzz-relay-mesh, buzz-ws-client, buzz-push-gateway, buzz-backend-kubernetes)

> Source: `_sources/buzz/crates/`
> Commit: `8868787`

## Overview

These crates provide inter-relay transport (mesh), shared WebSocket client logic, mobile push notifications, and Kubernetes compute backends.

---

## buzz-relay-mesh (Inter-Relay Transport)

**Location:** `crates/buzz-relay-mesh/src/` (9 files)

### Purpose
Inter-relay mesh transport built on iroh (P2P networking). Enables relays to discover each other and synchronize events without a central hub.

### Key Files

| File | Purpose |
|------|---------|
| `lib.rs` | Crate entry, mesh client init |
| `endpoint.rs` | iroh endpoint wrapper (QUIC-based P2P) |
| `gossip.rs` | Gossip protocol for event propagation |
| `membership.rs` | Mesh membership management (join/leave) |
| `peer.rs` | Per-peer state, connection tracking |
| `registry.rs` | Peer registry (known relays) |
| `runtime.rs` | Async runtime, task spawning |
| `status.rs` | Mesh health/status reporting |
| `wire.rs` | Wire format for mesh messages |

### Architecture

```
Relay A ◄──── iroh QUIC ────► Relay B
   │                              │
   ├─ gossip events ─────────────►│
   │◄──── gossip events ──────────┤
   │                              │
   ├─ membership sync ───────────►│
```

### Use Cases
- **Sovereign deployments:** multiple relays in different orgs can sync events
- **Geographic distribution:** events propagate to nearest relay
- **Resilience:** if one relay goes down, others continue serving
- **Mesh compute:** shared compute resources across relays (see `buzz-voice` integration)

### Why iroh
- QUIC-based (modern transport with built-in encryption)
- NAT traversal (relays behind firewalls can connect)
- Mobile-friendly (works on iOS/Android)

---

## buzz-ws-client (Shared WebSocket Client)

**Location:** `crates/buzz-ws-client/src/` (4 files)

### Purpose
Shared NIP-42 WebSocket client used by other crates (agents, CLI, tools). Avoids duplicating WebSocket + NIP-42 auth logic.

### Key Files

| File | Purpose |
|------|---------|
| `lib.rs` | Client API (connect, subscribe, publish) |
| `connection.rs` | WebSocket connection management |
| `message.rs` | NIP-01 message parsing |
| `error.rs` | Error types |

### Features
- Auto-reconnect with backoff
- NIP-42 auth on connect
- Subscription multiplexing
- Ping/pong keepalive

### Used By
- `buzz-acp` (agent harness)
- `buzz-cli` (CLI)
- `buzz-test-client` (integration tests)

---

## buzz-push-gateway (NIP-PL Mobile Push)

**Location:** `crates/buzz-push-gateway/src/` (13 files)

### Purpose
NIP-PL (Push Lease) mobile push notification gateway. Sends APNS (iOS) and FCM (Android) push notifications when events occur.

### Key Files

| File | Purpose |
|------|---------|
| `main.rs` | Gateway entry point |
| `apns.rs` | Apple Push Notification service client |
| `app_attest.rs` | App Attest (device attestation, anti-spoofing) |
| `authority.rs` | Authority signing (proves gateway is legit) |
| `config.rs` | APNS/FCM config, signing keys |
| `grant.rs` | Push grant management (who can push to whom) |
| `http.rs` | HTTP API for push registration |
| `postgres.rs` | Push lease/endpoint persistence |
| `token.rs` | APNS/FCM token management |

### Architecture

```
Relay event → buzz-push-gateway → APNS/FCM → device
                                      ↓
                              App Attest verification
```

### Security
- **App Attest** (iOS): cryptographic proof the request comes from a legitimate install of the app
- **Push grants:** user must explicitly grant push permission per device
- **Authority signing:** gateway signs every push request so the device can verify the relay is authorized
- **Lease-based:** push subscriptions expire and must be renewed

### Tables (in main relay DB)
- `push_leases` — active push subscriptions
- `push_endpoints` — APNS/FCM tokens per device
- `nip_fi_identities` / `nip_fi_authorizations` — federated identity for cross-relay push

---

## buzz-backend-kubernetes (K8s Compute Backend)

**Location:** `crates/buzz-backend-kubernetes/src/` (14 files)

### Purpose
Kubernetes backend provider — spins up compute pods for agent execution. Buzz's "cloud compute" layer.

### Key Files

| File | Purpose |
|------|---------|
| `main.rs` | Backend entry point |
| `client.rs` | Kubernetes API client wrapper |
| `cluster.rs` | Cluster connection + auth |
| `config.rs` | K8s config (namespace, image, resources) |
| `gc.rs` | Garbage collection for stale pods |
| `pod.rs` | Pod spec generation |
| `reconcile.rs` | Reconciliation loop (desired vs actual state) |
| `naming.rs` | Pod naming convention |
| `wire.rs` | Wire format for backend API |

### Use Case
When an agent needs to execute code in a sandboxed environment, the relay spins up a Kubernetes pod running the agent. The pod has:
- Isolated filesystem
- Network policies (egress restricted)
- Resource limits (CPU/memory)
- TTL (auto-cleanup after N minutes)

### Naming Convention
Pods are named with a hash of the task + community ID, so they're traceable but not guessable.

---

## buzz-voice (Voice/Audio Processing)

**Location:** `crates/buzz-voice/src/` (5 files)

### Purpose
Voice huddle audio processing — Opus codec, NetEQ jitter buffer, Pocket April integration for speech enhancement.

### Key Files

| File | Purpose |
|------|---------|
| `lib.rs` | Voice pipeline entry |
| `pocket.rs` | Pocket April (speech enhancement) |
| `pocket_models.rs` | ML model loading |
| `pocket_april.rs` | April ASR integration |
| `imported.rs` | Vendored third-party code |

### Features
- Real-time Opus encode/decode
- NetEQ for jitter buffer + packet loss concealment
- Pocket April (ML-based speech enhancement)
- sherpa-onnx for on-device ASR

### Where It Runs
- **Desktop:** Tauri backend (in-process)
- **Mobile:** Flutter native plugin
- **Relay:** buzz-voice crate processes audio frames before fan-out

---

## buzz-datastore-tracing

**Location:** `crates/buzz-datastore-tracing/src/` (1 file)

### Purpose
Datastore tracing/observability — wraps SQLx queries with structured tracing spans for OpenTelemetry export.

---

## Scan Coverage

- All 6 crates enumerated
- Key files in each crate inspected
- `Cargo.toml` workspace member list verified
- **Not deeply read:** exact iroh configuration, K8s pod specs, push gateway signing details
