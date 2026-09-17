# Buzz — Discovery Overview

> Full discovery scan of `_sources/buzz/` regenerated from fresh sources.
> **Source commit:** `88687876f7808a2fd742b7eb2e4b9f87d999ad8d` (2026-09-03)
> **License:** Apache 2.0
> **Maintainer:** Block, Inc.

---

## What Is Buzz?

**Buzz** is a self-hostable team communication platform built on the Nostr protocol (NIP-01 wire format), where **AI agents and humans are first-class equals**. Every action (chat, reaction, workflow step, canvas update, huddle event) is a cryptographically signed Nostr event.

Built by Block, Inc. as an open-source alternative to Slack/Discord/Teams — but with agents as native participants, not bolted-on bots.

### Tagline
> "The relay is the workspace."

### Core Insight
Agents are not bots. They have the same identity model (Nostr keypair), the same event system (signed events), the same scopes/permissions, and appear in UIs as members. This makes agent integration first-class, not an afterthought.

---

## Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────┐
│  Clients (all talk Nostr WebSocket)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Desktop  │ │ Mobile   │ │ Web      │ │ Admin    │         │
│  │ (Tauri)  │ │ (Flutter)│ │ (React)  │ │ (React)  │         │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘         │
└───────┼────────────┼───────────┼────────────┼────────────────┘
        │            │           │            │
        └────────────┴───────────┴────────────┘
                         │ Nostr WebSocket (NIP-01 + NIP-42)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  buzz-relay (Axum WebSocket server)                          │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Connection lifecycle, event admission, fan-out       │    │
│  └──────────────────────────────────────────────────────┘    │
│         │           │            │            │              │
│         ▼           ▼            ▼            ▼              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ buzz-db  │ │ buzz-    │ │ buzz-    │ │ buzz-    │        │
│  │ (events) │ │ pubsub   │ │ search   │ │ audit    │        │
│  │ Postgres │ │ Redis    │ │ Postgres │ │ Hash-    │        │
│  │          │ │          │ │ FTS      │ │ chain    │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│         │           │            │            │              │
│         ▼           ▼            ▼            ▼              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ buzz-    │ │ buzz-    │ │ buzz-    │ │ buzz-    │        │
│  │ workflow │ │ media    │ │ auth     │ │ conform  │        │
│  │ (YAML)   │ │ (S3)     │ │ (NIP-42) │ │ (tests)  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  Agent Surface                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ buzz-acp │ │ buzz-    │ │ buzz-cli │ │ buzz-    │        │
│  │ (harness)│ │ agent    │ │ (JSON)   │ │ dev-mcp  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│         │                                                     │
│         ▼                                                     │
│  External agents: Goose, Codex, Claude Code, ...             │
└──────────────────────────────────────────────────────────────┘
```

---

## Codebase Statistics

| Metric | Value |
|--------|-------|
| **Rust crates** | 30 |
| **Desktop app** | Tauri 2 + React 19 (78 Tauri src files) |
| **Mobile app** | Flutter (10 feature modules) |
| **Web client** | React 19 (2 features) |
| **Admin** | React 19 (minimal) |
| **Migrations** | 44 SQL files |
| **Schema** | 1,895 lines (declarative via pgschema) |
| **CI workflows** | 26 |
| **Scripts** | 82 |
| **Hermit tools** | 18 |
| **Total Rust deps** | 70+ (desktop), 30+ crates in workspace |

---

## Subsystem Reports

| # | Report | What's Inside |
|---|--------|---------------|
| 1 | [buzz/01-relay-core.md](buzz/01-relay-core.md) | buzz-core (zero-I/O foundation) + buzz-relay (WebSocket server) |
| 2 | [buzz/02-services.md](buzz/02-services.md) | buzz-db, buzz-auth, buzz-pubsub, buzz-search, buzz-audit, buzz-workflow, buzz-media, buzz-deletion, buzz-conformance |
| 3 | [buzz/03-agent-surface.md](buzz/03-agent-surface.md) | buzz-acp, buzz-agent, buzz-cli, buzz-dev-mcp, buzz-persona, sprig |
| 4 | [buzz/04-git-pairing.md](buzz/04-git-pairing.md) | git-sign-nostr, git-credential-nostr, buzz-pair-relay, buzz-pairing-cli |
| 5 | [buzz/05-mesh-networking.md](buzz/05-mesh-networking.md) | buzz-relay-mesh, buzz-ws-client, buzz-push-gateway, buzz-backend-kubernetes, buzz-voice |
| 6 | [buzz/06-desktop.md](buzz/06-desktop.md) | Tauri 2 + React 19 desktop app (30 features) |
| 7 | [buzz/07-mobile-web.md](buzz/07-mobile-web.md) | Flutter mobile, React web, React admin-web |
| 8 | [buzz/08-infra.md](buzz/08-infra.md) | Schema, migrations, deploy, scripts, CI/CD |

---

## Key Architectural Patterns

### 1. Nostr as Universal Protocol
Every action is a signed Nostr event. New features = new kind numbers. This gives Buzz:
- **Interoperability** — any Nostr client can talk to a Buzz relay
- **Auditability** — every action is cryptographically signed
- **Portability** — users own their identity and can move between relays

### 2. Agent-as-First-Class-Member
Agents have the same identity model as humans:
- Same keypair format (secp256k1 Schnorr)
- Same event system (signed events with kinds)
- Same scopes/permissions
- Same UI presence (appear as members in channels)
- Same audit trail (all actions logged)

This is the core innovation — agents are not bots.

### 3. Crate Isolation
- `buzz-core` is zero-I/O (pure types + logic)
- Service crates are isolated from each other
- Only `buzz-relay` orchestrates subsystems
- Cross-subsystem coordination only through the relay

### 4. Multi-Tenant via Host Binding
- `req.community = resolve_host(connection.host)`
- `community_id` on every tenant-scoped row
- Unknown hosts fail closed
- NIP-98 stamps must agree with host-derived community

### 5. Hash-Chained Audit
Every admin action is logged with SHA-256 hash chaining. Any tampering invalidates the chain.

### 6. YAML-as-Code Workflows
Automation is defined in YAML, stored in `workflows` table, executed by `buzz-workflow` engine. Supports message/reaction/schedule/webhook triggers and 7 action types.

### 7. Self-Hostable
Single binary relay, Docker Compose for dev, Helm charts for production K8s. No vendor lock-in.

---

## Notable Features

1. **Voice huddles** — real-time Opus audio, no external SFU
2. **Git hosting** — NIP-34 patches, git smart HTTP, repo announcements
3. **Full-text search** — Postgres FTS with GIN index, privacy-aware
4. **Push notifications** — NIP-PL mobile push with App Attest
5. **Media** — Blossom/S3 with thumbnails
6. **Mesh compute** — iroh-based inter-relay transport
7. **Device pairing** — NIP-AB relay pairing with QR + ECDH
8. **Multi-tenant conformance** — replay checker verifies isolation
9. **Admin dashboard** — moderation surface with NIP-98 auth
10. **Cross-platform** — Desktop (macOS/Linux/Windows), Mobile (iOS/Android), Web

---

## Technologies

| Layer | Technology |
|-------|-----------|
| **Runtime** | Tokio (Rust async) |
| **HTTP/WS** | Axum 0.8, Tower |
| **Database** | SQLx 0.9 (Postgres), Redis |
| **Nostr** | nostr 0.44 (NIP-01, NIP-42, NIP-44, NIP-98) |
| **Desktop** | Tauri 2, React 19, Vite 8, TanStack Query/Router, Radix UI, Tailwind 4 |
| **Mobile** | Flutter 3.41, Riverpod, flutter_hooks |
| **Web** | React 19, isomorphic-git, nostr-tools |
| **Audio** | Opus codec, NetEQ, sherpa-onnx |
| **Mesh** | iroh (P2P) |
| **Schema** | pgschema (declarative) |
| **Toolchain** | Hermit (pinned versions) |
| **CI/CD** | GitHub Actions (26 workflows) |
| **Container** | Docker multi-stage, Docker Compose, Kubernetes Helm |

---

## What Fabrica Could Adopt

Based on the discovery scan, here are the patterns and features from Buzz that could inform Fabrica's transformation:

### High-Value Adoptions
- **Agent-as-first-class-member** — agents with same identity, scope, audit as humans
- **Signed event protocol** — every action cryptographically attributable
- **Hash-chained audit log** — tamper-evident operation history
- **YAML workflows** — automation as data, not code
- **Multi-tenant host binding** — community isolation by default
- **Service catalog pattern** — curated catalog of integrations (64 in mission-control, similar concept here)

### Medium-Value Adoptions
- **Self-hostable single binary** — reduce deployment complexity
- **Mesh transport** — P2P sync between instances
- **ACP harness** — standardized agent communication protocol
- **Device pairing with QR** — secure initial key exchange

### Low-Value / Out of Scope
- **Nostr protocol** — Buzz-specific; Fabrica uses its own protocol
- **Voice huddles** — Fabrica-app doesn't need voice chat
- **Git hosting** — different domain
- **Blossom media** — Fabrica-app has its own media handling

### Already in Fabrica
- **Worktree management** (more advanced in Fabrica)
- **Terminal/PTY** (Fabrica's is more capable)
- **IPC** (Electron IPC is different from Nostr events)
- **Plugin system** (different architecture)

---

## Scan Coverage

- **Root files:** all 60+ top-level files read
- **`crates/`:** all 30 crates explored
- **`desktop/`:** package.json, main.tsx, all features enumerated, Tauri src enumerated
- **`mobile/`:** pubspec.yaml, main.dart, all features enumerated
- **`web/`, `admin-web/`:** package.json, entry points read
- **`schema/`:** schema.sql (1,895 lines) fully read
- **`migrations/`:** 44 files enumerated
- **`scripts/`:** 82 files enumerated by category
- **`bin/`:** 18 tools enumerated
- **`docs/`:** 24 doc files enumerated
- **`.github/`:** 26 workflows enumerated
- **`deploy/`:** compose + Helm charts enumerated

**Not deeply read:** individual handler implementations, SQL query bodies, Helm chart templates, workflow YAML internals.

---

*Generated: 2026-09-03 — Source commit: `8868787`*
