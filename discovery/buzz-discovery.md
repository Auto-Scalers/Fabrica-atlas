> **PATH MIGRATION NOTICE (2026-08-21):** This project moved from the environment root into `Fabrica-atlas/`. All `_sources/...` paths in this document now resolve to `Fabrica-atlas/_sources/...`. `Fabrica-app/` remains at the environment root.
# Discovery — Buzz (`_sources/buzz/`)

> Task 1.2 — Group 1 (Discovery & Analysis), Roadmap 02, Round 1.
> Scan-only. No source files modified.
> Source: `_sources/buzz/` — 4,121 source files (excl. .git/node_modules): desktop 2,672 · mobile 547 · crates 424 · web 65 · deploy 64 · docs 54 · bin 46 · benchmarks 40 · migrations 31.
> Repo: github.com/block/buzz · Apache 2.0 · Block, Inc.

---

## 1. What Buzz Is

A **self-hostable team workspace where humans and AI agents are first-class equals**, built on the Nostr protocol. Tagline: "A workspace where humans and agents build together, on a relay you own." The core bet: "The relay is the workspace" — one community = one domain = one event log replacing chat + forge + CI dashboard + bots + search + glue code.

Key facts:
- Every action (message, reaction, workflow step, review approval, git event) is a **cryptographically signed Nostr event** (NIP-01 wire format, secp256k1/Schnorr). Agents and humans sign with the same kind of key — agents are members with their own keypairs, not bots.
- The **relay is the single source of truth**: auth, signature verification, persistence, fan-out, search indexing, automation triggering. No P2P, no gossip.
- A **community** is the tenant: the URL/host is authoritative for the workspace. Multi-community deployments scope every row/cache/document by host-derived community; unknown hosts fail closed.
- New feature = new event `kind` integer = zero breaking changes for existing clients.
- Ecosystem: Rust monorepo backend (relay), Tauri 2 desktop app, Flutter mobile app, browser repo-browser web client served by the relay, agent CLI/harness surface, git hosting on the same domain.
- Naming history: previously "Sprout" (legacy traces: sprig harness, sprout-cli skill, ~/.sprout → ~/.buzz migration in desktop).

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Backend | Rust workspace (~30 crates), Axum WebSocket server (`buzz-relay`) |
| Protocol | Nostr NIP-01 over WebSocket + narrow HTTP bridge; NIP-42/NIP-98 Schnorr auth |
| Storage | Postgres 17 (events w/ monthly partitioning, FTS via generated tsvector + GIN), Redis 7 (pub/sub, presence SET EX, typing ZADD), S3/MinIO (Blossom media) |
| Desktop | Tauri 2 + React 19 + Vite 8 + Tailwind CSS 4 + TanStack Query/Router + Radix + TipTap + Biome |
| Mobile | Flutter (Riverpod + flutter_hooks, no StatefulWidget allowed), Catppuccin theme |
| Web | React 19 + TanStack Router/Query + isomorphic-git (in-browser git) |
| Agents | ACP (Agent Client Protocol, JSON-RPC over stdio) harness; MCP tools; supports goose/codex/Claude Code |
| Git | Smart HTTP hosting on relay; nostr-signed commits/tags (NIP-GS); NIP-98 credential helper |
| Infra | Docker Compose (dev + prod bundle w/ Caddy TLS), Helm charts (+ push-gateway chart), Prometheus metrics |
| Toolchain | Hermit-pinned: Rust 1.88+, Node 24, pnpm 10/11, Flutter 3.41, Just, lefthook, biome, cargo-deny |
| Formal methods | TLA+ specs (MultiTenantRelay, GitOnObjectStore) + Tamarin (MultiTenantAuth) with mutation-testing harnesses |

Quality gates: `just ci` (fmt+clippy+tests+builds), pre-commit auto-fix hooks, pre-push differential file-size gate (1000 lines/file hard ceiling across desktop/web/mobile), DCO sign-off required, no `unsafe`, no new unwrap/expect in production paths.

---

## 3. Repository Structure

Rust monorepo: ~30 crates (`crates/`), Tauri 2 desktop (`desktop/`), Flutter mobile (`mobile/`), browser repo-browser (`web/`), operator dashboard (`admin-web/`), 31 SQL migrations, Docker/Helm deploy, TLA+/Tamarin specs. Crate dependency principle: `buzz-core` (zero I/O) ← db/auth/pubsub/search/audit/workflow ← buzz-relay (the only orchestrator; subsystems never call each other). Full crate inventory with file/line counts in `discovery/buzz/bz-db-schema.md` §1.

---

## 4. Vision Documents (product direction)

| Doc | Core idea |
|---|---|
| VISION.md | Flagship: relay-as-workspace. One domain hosts repos (`git clone repoa.myproject.com`), chat, agents. Seven surfaces: Home feed, Stream (real-time chat), Forum (async threads), DMs (≤9), Agents directory/job board, Workflows, Cmd+K Search — three lenses over one event log. Zero-notification defaults. Scale target: 10K humans + 50K agents (~600K events/day). Server-managed encryption (eDiscovery-friendly). Voice huddles with agent peers. Mesh GPU compute. Greenfield build via AI agent swarms w/ crossfire review. |
| VISION_SOVEREIGN.md | "Your Project, Your Domain": content negotiation serves HTML to browsers AND git protocol at the same URL — the repo IS the website. Identity = npub everywhere; portable reputation via signed contribution history; web-of-trust vouches (incl. for agents). Honest costs listed (key loss = identity loss, nostr onboarding friction). |
| VISION_PROJECTS.md | Nostr-native forge: NIP-34 repo announcements extended w/ `buzz-` tags (channel binding, visibility, branch protections enforced at git transport layer); branches are channels (patches kind:1617, CI results, reviews, merge decisions live together; merge archives the channel as permanent record); NIP-OA owner attestation gives agents maintainer access instantly; NIP-MP groups cross-owner repos into projects without granting authority. Issues = forum-rendered events; releases = agent-drafted changelogs approved by maintainers. |
| VISION_AGENT.md | buzz-agent + buzz-dev-mcp philosophy: small enough to hold in your head, ten-instances-parallel, auditable in an afternoon. Two binaries, two protocols (ACP stdio + MCP), no coupling. Minimal/hardened/protocol-native/honest ("the agent is just a loop that stops when it cannot proceed"). Up to 8 concurrent sessions per agent process, each with own MCP servers/history/context; self-summarizes history when context fills. |
| VISION_MESH.md | Community GPU pooling: opted-in member GPUs become shared OpenAI-compatible inference behind the membership gate (same gate as channel access). Peer-to-peer request routing; relay never sees tokens. Large models split across machines. Explicit consent framing. |
| VISION_ACTIVITY.md | Agent Activity Feed design: every item answers Comprehension/Confidence/Control. Each item = one sentence (verb, object, outcome). Twelve render classes (spine: message/relay-op/file-edit/shell/turn-lifecycle; context: thought/plan/permission/error; ambient: generic/raw/suppressed). Outcome-first, mutate-in-place, never go dark, honesty over guessing. |
| VISION_MODERATION.md | Moderation as human workflow: private report queue → owner/admin decision → signed enforcement commands (ban/timeout) biting at authentication. No shadow bans; tombstones with sanitized reasons; tamper-evident audit rows. Platform safety (illegal content) never delegated to communities. Reports never stored in public event log. |
| VISION_REMOTE_AGENTS.md | Same agent, new body: identity/history live on relay so compute is replaceable. One-way launch handoff through swappable provider binary (Kubernetes first); afterwards ALL control flows over the relay (mention it to steer, tell it to stop). Agents self-reap via inactivity timers. Provider conformance suite pins the contract. |

---

## 5. Protocol & Event Model

### Wire protocol (NIP-01)
Client→relay: `["EVENT", e]`, `["REQ", sub_id, filter…]`, `["CLOSE", sub_id]`, `["AUTH", e]`.
Relay→client: `["EVENT", sub_id, e]`, `["EOSE"]`, `["OK", id, bool, msg]`, `["CLOSED"]`, `["NOTICE"]`, `["AUTH", challenge]`.
Limits: max frame 65,536 B; 1024 subscriptions/connection; 500 historical results/filter; handler semaphore 1024 concurrent EVENT/REQ.

### Kind ranges
0–9999 standard Nostr · 10000–19999 replaceable · 20000–29999 ephemeral (not stored/audited/searched) · 30000–39999 parameterized replaceable · 40000–49999 Buzz custom.

### Custom-kind registry (~150 kinds)
150+ custom kinds across profiles/social, messaging, DMs, presence/typing, channels/groups (NIP-29), forum, agents/jobs, workflows/approvals, git/projects (NIP-34 ext), huddles, moderation, membership/identity, and misc. Channel scoping rule: events inside channels use `h` tags; REQ filters must include explicit `kinds` (else p-gate 403). Full registry with file:line citations in `discovery/buzz/bz-relay-event-kinds.md` §G.

---

## 6. Relay Backend (crates)

### buzz-relay (79 files / 64,090 lines)
Connection lifecycle: community binding → auth (NIP-42) → three loops (recv/send/heartbeat) + graceful shutdown. Event pipeline: 12-step ordered flow (auth → verify → channel check → DB insert → Redis publish → fan-out → search index → audit → workflow trigger). HTTP surface: WS upgrade, NIP-05, health, media (Blossom), smart HTTP git hosting. Full handler-level analysis in `discovery/buzz/bz-db-schema.md` §2 and `discovery/buzz/bz-ops-deploy-admin.md`.

### buzz-core (zero I/O)
StoredEvent, filters_match, verify_event, is_private_ip (SSRF blocklist), ALL_KINDS registry, pairing module. Full detail in `discovery/buzz/bz-db-schema.md` §3.

### buzz-auth
NIP-42 + NIP-98 verification, 14 scopes, AuthContext. RateLimiter trait exists but NO production implementation. Full detail in `discovery/buzz/bz-db-schema.md` §3.

### buzz-db (Postgres, sqlx)
Event insert, channel CRUD with TOCTOU-safe role enforcement, feed queries, workflow/approval CRUD, monthly range partitioning. Full schema + migration chain in `discovery/buzz/bz-db-schema.md`.

### buzz-pubsub (Redis)
Dedicated PubSub connection, PSUBSCRIBE loop, multi-node local-echo dedup. Presence (SET EX 180), typing (ZADD window 5s). Full detail in `discovery/buzz/bz-search-pubsub.md`.

### buzz-search (Postgres FTS)
Generated tsvector + GIN index, privacy-sensitive kinds yield NULL tsv = unsearchable. ChannelScope enum (Any/ChannelLessOnly/Channels/ChannelsOrChannelLess). Full detail in `discovery/buzz/bz-search-pubsub.md`.

### buzz-audit
SHA-256 hash-chain append-only log, pg_advisory_lock single-writer, 10 action types. Per-community chains in multi-community mode. Full detail in `discovery/buzz/bz-db-schema.md` §4.

### buzz-workflow (YAML-as-code engine)
7 actions (send_message, add_reaction, call_webhook, request_approval, delay, etc.), evalexpr conditions, cron scheduler, approval suspension with UUID tokens. Full detail in `discovery/buzz/bz-db-schema.md` §5.

### Other crates
buzz-media (Blossom/S3 blob storage), buzz-push-gateway (NIP-PL push), buzz-relay-mesh (QUIC inter-relay mesh), buzz-deletion (durable community deletion), buzz-conformance (TLA+ trace replay checker), buzz-voice (local voice primitives). Full detail in `discovery/buzz/bz-voice-media.md`. Security model: every event Schnorr-verified, SSRF blocklist, constant-time webhook secrets, CSPRNG approval tokens. Known limitations: no rate-limit implementation, no typing REST endpoint, huddle recording unbuilt, approval gates not wired end-to-end.

---

## 7. Agent Surface

The heart of Buzz's agent story. Full crate-level analysis in `discovery/buzz/buzz-agent-crates.md`.

- **buzz-acp** (14 files/40,631 lines): ACP harness. @mention → per-channel queue → batched prompt → ACP subprocess pool (1–32) w/ crash respawn, heartbeats, turn timeouts, respond-to allowlists, effort levels. Env vars injected: BUZZ_RELAY_URL, BUZZ_PRIVATE_KEY, BUZZ_AUTH_TAG.
- **buzz-agent** (21 files/27,579 lines): Minimal ACP agent. LLM-loop + MCP tools, multi-session (up to 8), history self-summarization, provider-swappable via env (Anthropic, OpenRouter, Databricks OAuth PKCE, etc.).
- **buzz-cli** (29 files/17,772 lines): Agent-first CLI. JSON in/out, sig-stripped compact output, meaningful exit codes, deep-link resolution. 15+ command groups covering agents, messages, channels, workflows, repos, projects, patches, PRs, issues, media, memory, moderation.
- **buzz-dev-mcp** (11 files/5,202 lines): Developer MCP server — shell, read_file, str_replace, view_image, todo, rg, tree.
- **buzz-persona** (9 files/4,612 lines): `.persona.md` format (YAML frontmatter + markdown body = system prompt). Example pack: examples/meadow-core.
- **sprig** (50 lines): Single binary bundling acp + agent + dev-mcp.
- **Git integration**: git-sign-nostr (NIP-GS, BIP-340 Schnorr commit/tag signing), git-credential-nostr (NIP-98 credential helper).
- **Pairing**: buzz-pair-relay (ephemeral sidecar relay for NIP-AB device pairing), buzz-pairing-cli (source/target subcommands, nostrpair:// QR URIs, 6-digit SAS verification). Full detail in `discovery/buzz/bz-pair-relay-cli.md`.
- **Remote agents**: buzz-backend-kubernetes (15 files/6,118 lines) — Kubernetes provider per provider contract. Bundled in desktop.
- **Shared libraries**: buzz-sdk (typed Nostr event builders), buzz-ws-client (NIP-42 WebSocket client).

---

## 8. buzz-admin (operator CLI)
add-member (--pubkey npub/hex, --role; publishes kind:13534 roster) · remove-member · list-members · generate-key · reconcile-channels (emits kind:39000/39002 discovery events idempotently). Shipped inside relay Docker image at /usr/local/bin/buzz-admin.

---

## 9. Desktop App (Tauri 2 + React 19, 2,672 files)

29 feature modules covering agents, channels, messages, forum, huddle (voice with STT/TTS), projects/git, workflows, search, moderation, notifications, settings, and more. ~250 Tauri invoke commands across terminal, deep links, identity/keys, projects/git, relay, channels, media, agents, workflows, huddle, pairing, and workspace. Resilient RelayClient singleton with reconnect/replay, rate-limit gate, stall watchdog, and React Query invalidation bridge. Full line-level analysis in `discovery/buzz/buzz-desktop.md`.

---

## 10. Mobile App (Flutter, 547 files)
Riverpod + flutter_hooks (StatefulWidget banned). Catppuccin Latte/Macchiato matching desktop. Features under lib/features/: channels (largest — list/detail/thread/compose/emoji picker/message actions/media viewer/unread badges/typing/mentions/deep links + agent_activity submodule w/ transcript builder), forum, home, activity/inbox, pulse (social notes feed), search, profile, invites, pairing (QR scanner + crypto + SAS), settings (theme/accent/community/connection). Shared: relay/ (WebSocket-first connectivity; HTTP only for Blossom media upload; nostr_models.dart kept in sync with desktop kinds.ts; rate-limit gate; signed-event relay; mp4 fast-start), auth, crypto, deeplink (buzz://), emoji/custom_emoji, mentions, read_state, reminders, security (biometric lock via local_auth; secure keypair storage), theme, widgets. Badges via app_badge_plus; rich rendering gpt_markdown + highlight.

## 11. Web Clients
- **web/** (buzz-web): React 19 + TanStack Router/Query + isomorphic-git in-browser. Routes: /, /repos, /repos/$repoId (+blob viewer w/ syntax highlighting), /invite/$code. Repo browsing: tree, README, refs, commits, clone URLs, "Connect on Buzz". Served statically BY THE RELAY (BUZZ_WEB_DIR / BUZZ_SERVE_GIT_WEB_GUI=true) — same-origin WS derivation. Custom CI guards: file sizes, pubkey truncation.
- **admin-web/** (buzz-admin-web): operator dashboard — moderation report queue (grouped reports, detail, act/dismiss, 403 handling) + product feedback browsing (migration 0017). Tiny: api.ts/types.ts/useResource.ts/App.tsx (836 ln custom routing).

## 12. Infrastructure & Ops
- Dev: docker-compose.yml (Postgres 17, Redis 7, Adminer, MinIO, Prometheus) w/ health checks + resource limits; just setup/dev/relay/build/check/test-unit/test/ci/reset.
- Prod: deploy/compose (single-node VPS bundle + Caddy TLS via !reset override + run.sh bootstrap w/ secret generation) and deploy/charts/buzz (full Helm: Deployment/Ingress+HTTPRoute/HPA/PDB/PVC git data/ServiceMonitor/pairing-relay sidecar/bundled MinIO init/ArgoCD+Flux examples/values.schema.json + render tests) and charts/buzz-push-gateway.
- Migrations: 31 SQL files auto-applied on startup (BUZZ_AUTO_MIGRATE). Arc: base schema → git → moderation → push gateway evolution → community archival/deletion/recovery → product feedback → mesh status → join policies → TTL fencing/locking → invites → replica heartbeat → indexes → workflow error codes.
- Release lanes (RELEASING.md): desktop (candidate PR → squash merge = human authorization → auto-tag verifies provenance → immutable desktop-v tag → multi-platform builds → updater manifest last), relay (docker.yml → ghcr.io stable + debug- + :main/:sha tags), mobile (RC tags cut by GitHub App bot; Buildkite internal builds). Canary workflows per OS. 18 GitHub workflow files total.
- Benchmarks: harbor-buzz-orchestra (Python uv package) orchestrating multi-agent runs against a Buzz testbed compose stack w/ manifests, personas, relay forwarder, leaderboard. perf/: relay bus scaling measurements.
- Formal methods: TLA+ MultiTenantRelay + GitOnObjectStore, Tamarin MultiTenantAuth, mutation-testing harnesses, buzz-conformance replay checker.

---

## 13. Architectural Patterns Worth Carrying Into Fabrica's Transformation

Directly relevant to "desktop CLI agent management and operations platform":
1. **Agents as first-class members with their own cryptographic identities** — same affordances as humans, same audit trail, different keypair. Scoped by identity, not permission flags.
2. **One signed event log as universal substrate** — chat, patches, approvals, workflow steps, git events all one shape → unified search, unified audit.
3. **Kind-integer extensibility** — features are new event kinds; old clients never break.
4. **Agent harness pattern** (buzz-acp): @mention → per-channel queue → batched prompt → ACP subprocess pool (1–32) w/ crash respawn, heartbeats, turn timeouts, liveness checks, respond-to allowlists, effort levels.
5. **Agent-first CLI** (buzz-cli): JSON in/out, sig-stripped compact output, meaningful exit codes, deep-link resolution — built for LLM tool-call consumption.
6. **Minimal agent runtime** (buzz-agent): LLM-loop + MCP tools, multi-session, history self-summarization, provider-swappable via env.
7. **Managed agents** (desktop): spawn/start/stop/restart/reconcile lifecycle, nest directories, persona/team projections as relay events, orphan sweeps, turn metrics (kind 44200), observer frames (kind 24200).
8. **Remote agents**: identity/history on relay, body replaceable, one-way launch handoff, control exclusively via relay messages, self-reaping inactivity timers, provider conformance contract.
9. **Persona packs** (.persona.md YAML frontmatter + markdown system prompt) and teams as first-class shareable artifacts.
10. **Agent memory (engrams)** as addressable events (kind 30174) with CLI mem subcommands (ls/get/hash/set/patch/rm).
11. **Activity feed UX theory** (VISION_ACTIVITY): sentence-per-item, outcome-first, mutate-in-place, twelve render classes, deliberate suppression.
12. **Approval gates** on workflows (request_approval suspension + grant/deny events 46010–46012/46030/46031).
13. **Branches-as-channels**: git lifecycle mapped onto rooms; merge archives the room as permanent record.
14. **Multi-tenant isolation done formally** (host-derived TenantContext before any handler; TLA+/Tamarin verification; conformance replay checker).
15. **Tamper-evident audit** (hash chain) and honest tombstones for deletions/moderation.
16. **Community-scoped everything** including caches, pub/sub keys, search documents, audit chains.

---

## ROUND 3 ADDENDUM — orchestrated deep-dive wave

| Report | Coverage |
|---|---|
| `discovery/buzz/buzz-desktop.md` | Agents, managed agents, projects/git, huddle audio, RelayClient stack |
| `discovery/buzz/buzz-agent-crates.md` | buzz-acp, buzz-agent, buzz-cli, buzz-dev-mcp, buzz-workflow internals |
| `discovery/buzz/bz-pair-relay-cli.md` | Pairing protocol, NIP-AB, QR format, SAS verification |

---

## ROUND 2 DEEP DIVE — buzz-relay internals

Function-level analysis of buzz-relay handlers, git hosting, multi-tenancy, and connection management. Covers: handler event pipeline (ingest.rs, req.rs, auth.rs, command_executor.rs, side_effects.rs, moderation), git hosting on object storage (CAS pointer-swap, policy hooks), multi-tenancy (host-derived TenantContext, row-zero binding), connection management (admission control, WS lifecycle, slow-client handling, health endpoints). Full detail in `discovery/buzz/bz-db-schema.md` §2 and `discovery/buzz/bz-ops-deploy-admin.md` §3.

---
*Round-1 coverage preserved below; Round 2 added function-level depth on buzz-relay. Scan coverage: README/AGENTS/ARCHITECTURE read in full; all 8 VISION docs summarized; full kind.rs registry extracted; CLI command surface extracted; desktop (29 features, ~250 Tauri commands), mobile, web, admin-web, deploy, migrations, docs, tooling covered. Not read line-by-line: buzz-relay handler internals (covered by Round 2 deep dive), individual desktop component files.*

