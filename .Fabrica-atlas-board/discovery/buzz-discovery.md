> **PATH MIGRATION NOTICE (2026-08-21):** This project moved from the environment root into `Fabrica-atlas/`. All `_sources/...` paths in this document now resolve to `Fabrica-atlas/_sources/...`. `Fabrica-app/` remains at the environment root.
# Discovery â€” Buzz (`_sources/buzz/`)

> Task 1.2 â€” Group 1 (Discovery & Analysis), Roadmap 02, Round 1.
> Scan-only. No source files modified.
> Source: `_sources/buzz/` â€” 4,121 source files (excl. .git/node_modules): desktop 2,672 Â· mobile 547 Â· crates 424 Â· web 65 Â· deploy 64 Â· docs 54 Â· bin 46 Â· benchmarks 40 Â· migrations 31.
> Repo: github.com/block/buzz Â· Apache 2.0 Â· Block, Inc.

---

## 1. What Buzz Is

A **self-hostable team workspace where humans and AI agents are first-class equals**, built on the Nostr protocol. Tagline: "A workspace where humans and agents build together, on a relay you own." The core bet: "The relay is the workspace" â€” one community = one domain = one event log replacing chat + forge + CI dashboard + bots + search + glue code.

Key facts:
- Every action (message, reaction, workflow step, review approval, git event) is a **cryptographically signed Nostr event** (NIP-01 wire format, secp256k1/Schnorr). Agents and humans sign with the same kind of key â€” agents are members with their own keypairs, not bots.
- The **relay is the single source of truth**: auth, signature verification, persistence, fan-out, search indexing, automation triggering. No P2P, no gossip.
- A **community** is the tenant: the URL/host is authoritative for the workspace. Multi-community deployments scope every row/cache/document by host-derived community; unknown hosts fail closed.
- New feature = new event `kind` integer = zero breaking changes for existing clients.
- Ecosystem: Rust monorepo backend (relay), Tauri 2 desktop app, Flutter mobile app, browser repo-browser web client served by the relay, agent CLI/harness surface, git hosting on the same domain.
- Naming history: previously "Sprout" (legacy traces: sprig harness, sprout-cli skill, ~/.sprout â†’ ~/.buzz migration in desktop).

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

```
_sources/buzz/
â”œâ”€â”€ ARCHITECTURE.md          # System design, kind ranges, subsystem boundaries (827 lines)
â”œâ”€â”€ AGENTS.md                # Agent contributor guide (conventions, gotchas)
â”œâ”€â”€ README.md / CONTRIBUTING.md / TESTING.md / RELEASING.md / NOSTR.md /
â”‚   GOVERNANCE.md / SECURITY.md / CHANGELOG.md
â”œâ”€â”€ VISION*.md               # 8 vision docs (see Â§4)
â”œâ”€â”€ preview-features.json    # Feature-flag registry (workflows, projects, pulse, forum,
â”‚                            #   agentManagedProfiles â€” desktop-only previews)
â”œâ”€â”€ .agents/.codex/.goose/skills/   # identical agent-tool skill pairs: desktop-screenshot,
â”‚                            #   sprout-cli (legacy Sprout name â†’ nest_skill.md)
â”œâ”€â”€ Cargo.toml / rust-toolchain.toml / Justfile / lefthook.yml / biome.json
â”œâ”€â”€ docker-compose.yml (dev) / Dockerfile (relay) / Dockerfile.push-gateway / Dockerfile.sprig
â”œâ”€â”€ prometheus.yml / ct.yaml / deny.toml / renovate.json
â”œâ”€â”€ crates/                  # ~30 Rust crates (Â§5â€“Â§8)
â”œâ”€â”€ desktop/                 # Tauri 2 + React 19 app (Â§9)
â”œâ”€â”€ mobile/                  # Flutter app (Â§10)
â”œâ”€â”€ web/                     # Browser repo-browser client (Â§11)
â”œâ”€â”€ admin-web/               # Operator dashboard: moderation queue + feedback (Â§11)
â”œâ”€â”€ migrations/              # 31 SQL migrations (auto-applied on relay startup)
â”œâ”€â”€ schema/schema.sql        # Consolidated current schema snapshot
â”œâ”€â”€ deploy/                  # compose bundles (prod/VPS + Caddy TLS), Helm charts
â”‚                            #   (buzz + buzz-push-gateway), local cluster scripts
â”œâ”€â”€ docs/                    # Design docs, TLA+/Tamarin specs, custom NIP extensions
â”‚                            #   (NIP-AA/AE/AM/AO/AP/CW/DV/ER/GS/IA/MP/OA/PL/PMA/RS/WP),
â”‚                            #   screenshots
â”œâ”€â”€ benchmarks/harbor-buzz-orchestra/  # Python multi-agent benchmark harness
â”œâ”€â”€ perf/                    # Relay bus scaling measurements
â”œâ”€â”€ examples/                # countdown-bot (standalone Nostr bot), meadow-core (persona pack)
â”œâ”€â”€ patches/                 # isomorphic-git.patch, virtua patch
â”œâ”€â”€ scripts/                 # ~60 release/dev/E2E/gate scripts
â””â”€â”€ bin/                     # Hermit pinned toolchain
```

Rust crate inventory (files / lines):
buzz-relay 79/64,090 Â· buzz-acp 14/40,631 Â· buzz-db 24/34,789 Â· buzz-agent 21/27,579 Â· buzz-cli 29/17,772 Â· buzz-test-client 23/16,197 Â· buzz-core 22/8,590 Â· buzz-media 12/6,166 Â· buzz-backend-kubernetes 15/6,118 Â· buzz-sdk 5/5,853 Â· buzz-dev-mcp 11/5,202 Â· buzz-workflow 5/4,427 Â· buzz-persona 9/4,612 Â· buzz-push-gateway 13/3,917 Â· buzz-relay-mesh 9/2,838 Â· buzz-voice 6/2,981 Â· buzz-pair-relay 3/2,171 Â· git-sign-nostr 2/2,277 Â· buzz-deletion 1/1,958 Â· buzz-pubsub 10/1,861 Â· buzz-search 4/1,777 Â· buzz-auth 8/1,696 Â· buzz-conformance 5/1,644 Â· buzz-audit 6/1,014 Â· buzz-admin 2/579 Â· git-credential-nostr 3/556 Â· buzz-pairing-cli 1/548 Â· buzz-ws-client 4/502 Â· buzz-datastore-tracing 2/226 Â· sprig 1/50.

Crate dependency principle: `buzz-core` (zero I/O) â† db/auth/pubsub/search/audit/workflow â† buzz-relay (the only orchestrator; subsystems never call each other).

---

## 4. Vision Documents (product direction)

| Doc | Core idea |
|---|---|
| VISION.md | Flagship: relay-as-workspace. One domain hosts repos (`git clone repoa.myproject.com`), chat, agents. Seven surfaces: Home feed, Stream (real-time chat), Forum (async threads), DMs (â‰¤9), Agents directory/job board, Workflows, Cmd+K Search â€” three lenses over one event log. Zero-notification defaults. Scale target: 10K humans + 50K agents (~600K events/day). Server-managed encryption (eDiscovery-friendly). Voice huddles with agent peers. Mesh GPU compute. Greenfield build via AI agent swarms w/ crossfire review. |
| VISION_SOVEREIGN.md | "Your Project, Your Domain": content negotiation serves HTML to browsers AND git protocol at the same URL â€” the repo IS the website. Identity = npub everywhere; portable reputation via signed contribution history; web-of-trust vouches (incl. for agents). Honest costs listed (key loss = identity loss, nostr onboarding friction). |
| VISION_PROJECTS.md | Nostr-native forge: NIP-34 repo announcements extended w/ `buzz-` tags (channel binding, visibility, branch protections enforced at git transport layer); branches are channels (patches kind:1617, CI results, reviews, merge decisions live together; merge archives the channel as permanent record); NIP-OA owner attestation gives agents maintainer access instantly; NIP-MP groups cross-owner repos into projects without granting authority. Issues = forum-rendered events; releases = agent-drafted changelogs approved by maintainers. |
| VISION_AGENT.md | buzz-agent + buzz-dev-mcp philosophy: small enough to hold in your head, ten-instances-parallel, auditable in an afternoon. Two binaries, two protocols (ACP stdio + MCP), no coupling. Minimal/hardened/protocol-native/honest ("the agent is just a loop that stops when it cannot proceed"). Up to 8 concurrent sessions per agent process, each with own MCP servers/history/context; self-summarizes history when context fills. |
| VISION_MESH.md | Community GPU pooling: opted-in member GPUs become shared OpenAI-compatible inference behind the membership gate (same gate as channel access). Peer-to-peer request routing; relay never sees tokens. Large models split across machines. Explicit consent framing. |
| VISION_ACTIVITY.md | Agent Activity Feed design: every item answers Comprehension/Confidence/Control. Each item = one sentence (verb, object, outcome). Twelve render classes (spine: message/relay-op/file-edit/shell/turn-lifecycle; context: thought/plan/permission/error; ambient: generic/raw/suppressed). Outcome-first, mutate-in-place, never go dark, honesty over guessing. |
| VISION_MODERATION.md | Moderation as human workflow: private report queue â†’ owner/admin decision â†’ signed enforcement commands (ban/timeout) biting at authentication. No shadow bans; tombstones with sanitized reasons; tamper-evident audit rows. Platform safety (illegal content) never delegated to communities. Reports never stored in public event log. |
| VISION_REMOTE_AGENTS.md | Same agent, new body: identity/history live on relay so compute is replaceable. One-way launch handoff through swappable provider binary (Kubernetes first); afterwards ALL control flows over the relay (mention it to steer, tell it to stop). Agents self-reap via inactivity timers. Provider conformance suite pins the contract. |

---

## 5. Protocol & Event Model

### Wire protocol (NIP-01)
Clientâ†’relay: `["EVENT", e]`, `["REQ", sub_id, filterâ€¦]`, `["CLOSE", sub_id]`, `["AUTH", e]`.
Relayâ†’client: `["EVENT", sub_id, e]`, `["EOSE"]`, `["OK", id, bool, msg]`, `["CLOSED"]`, `["NOTICE"]`, `["AUTH", challenge]`.
Limits: max frame 65,536 B; 1024 subscriptions/connection; 500 historical results/filter; handler semaphore 1024 concurrent EVENT/REQ.

### Kind ranges
0â€“9999 standard Nostr Â· 10000â€“19999 replaceable Â· 20000â€“29999 ephemeral (not stored/audited/searched) Â· 30000â€“39999 parameterized replaceable Â· 40000â€“49999 Buzz custom.

### Full custom-kind registry (buzz-core/src/kind.rs, ~150 constants)
- **Profiles/social**: 0 profile, 1 text note, 3 contact list, 10000 mute list, 10001 pin list, 10002 relay list, 10003 bookmark list, 10030 emoji list, 30000 follow set, 30003 bookmark set, 30030 emoji set, 30023 long-form, 30315 user status, 30078 read state (NIP-78 app data).
- **Messaging**: 9 stream message (NIP-29), 40002 stream message v2, 40003 edit, 40004 pinned, 40005 bookmarked, 40006 scheduled, 40007 stream reminder, 40008 diff message, 40099 system message, 40901 channel summary, 5 deletion, 7 reaction, 1059 gift wrap (NIP-17 DMs), 1063 file metadata.
- **DMs**: 41001 created, 41010 open, 41011 add member, 41012 hide, 30622 DM visibility.
- **Presence/typing**: 20001 presence update (ephemeral), 20002 typing indicator (ephemeral), 40902 presence snapshot.
- **Channels/groups (NIP-29)**: 9000â€“9022 group admin events (put/remove user, edit metadata, delete event, create/delete group, invite, join/leave request), 39000 group metadata, 39001 admins, 39002 members, 39003 roles, 39005 thread summary, 39006 window bounds, 41 channel metadata (unused legacy).
- **Forum**: 45001 post, 45002 vote, 45003 comment.
- **Agents/jobs**: 10100 agent profile, 43001 job request, 43002 accepted, 43003 progress, 43004 result, 43005 cancel, 43006 error, 44200 agent turn metric, 24200 agent observer frame, 30174 agent engram (memory), 30175 persona, 30176 team, 30177 managed agent, 30178 team catalog, 30179 private managed agent.
- **Workflows/approvals**: 30620 workflow def, 46001â€“46007 lifecycle (triggered/step started/completed/failed/completed/failed/cancelled), 46010 approval requested, 46011 granted, 46012 denied, 46020 trigger, 46030 approval grant, 46031 approval deny.
- **Git/projects (NIP-34 ext)**: 30617 repo announcement, 30618 repo state, 1617 patch, 1618 PR, 1619 PR update, 1621 issue, 1630 open/1631 merged/1632 closed/1633 draft status, 30621 project (multi-repo grouping).
- **Huddles**: 48100 started, 48101 participant joined, 48102 left, 48103 ended, 48106 guidelines, 24810 huddle reaction.
- **Moderation**: 1984 report, 9040 ban, 9041 unban, 9042 timeout, 9043 untimeout, 9044 resolve report.
- **Membership/identity**: 22242 auth (never stored), 24242 blossom auth, 24243 nostr identity binding, 27235 HTTP auth (NIP-98), 13534 NIP-43 membership list, 8000/8001 member added/removed, 28936 leave request, 44100/44101 member notifications (relay-signed only), 24134 pairing.
- **Misc**: 30300 event reminder, 30350 push lease, 42000 product feedback, 48001 audit entry, 49001 media upload, 9035/9036/8002/8003/13535 identity archive.

Channel scoping rule: events inside channels use `h` tags; addressable channel-description events carry id in `d` tag. REQ filters must include explicit `kinds` (else p-gate 403).

---

## 6. Relay Backend (crates)

### Connection lifecycle (buzz-relay)
Step 0 community binding (hostâ†’TenantContext before any handler; unknown host fails closed) â†’ Step 1 connection semaphore acquire â†’ Step 2 NIP-42 challenge sent immediately â†’ Step 3 auth (Pendingâ†’Authenticated(AuthContext)/Failed) â†’ Step 4 three loops (recv inline, send spawned via mpsc, heartbeat ping/30s w/ 3-miss disconnect) + CancellationToken shutdown + slow-client grace (3 consecutive full send buffers â†’ cancel) â†’ Step 5 cleanup (cancel, await tasks, remove subscriptions, deregister, drop permit).

### Event pipeline (per EVENT message, ordered)
1 AUTH check (MessagesWrite scope) â†’ 2 pubkey match â†’ 3 KIND_AUTH reject â†’ 4 ephemeral route (20000â€“29999 bypass DB/audit/search) â†’ 5 verify_event (spawn_blocking; Schnorr + SHA-256 ID) â†’ 6 channel membership check â†’ 7 DB insert (ON CONFLICT DO NOTHING) â†’ 8 Redis publish (if channel-scoped) â†’ 9 fan-out (three-tier registry; global subs excluded from private-channel events â€” security boundary) â†’ 10 search index (bounded queue cap 1000) â†’ 11 audit log (spawned) â†’ 12 workflow trigger (spawned; excludes kinds 46001â€“46012, relay-signed `buzz:workflow` messages, gift wraps). Steps 10â€“12 fire-and-forget; OK frame after full pipeline.

### SubscriptionRegistry
DashMap-backed three-tier fan-out: tier 1 `(channel_id, kind)` index O(1); tier 2 channel wildcard (no kinds constraint); tier 3 global linear scan (non-channel-scoped events only). `kinds: []` matches nothing; absent kinds = match all. REQ handler checks channel access BEFORE registering subscription (no race window for private-channel leaks). Historical query up to 500/filter then EOSE.

### HTTP surface (Axum)
GET `/` (WS upgrade or NIP-11 info), `/info`, `/.well-known/nostr.json` (NIP-05), `/health`, `/_liveness`, `/_readiness`; POST `/events` (same ingest path as WS), `/query` (NIP-01 filters; NIP-50 search routed to FTS), `/count` (NIP-45), `/hooks/{id}` (workflow webhook, secret-authenticated constant-time compare); PUT `/media/upload` (Blossom, 50 MB), GET `/media/{sha256}`; GET `/git/{owner}/{repo}/info/refs`, POST `/git/.../git-upload-pack` + `/git-receive-pack` (smart HTTP); POST `/internal/git/policy`.

### buzz-core (zero I/O)
StoredEvent, filters_match (OR across filters, AND within; NIP-01 prefix matching on IDs), verify_event (CPU-bound), is_private_ip (comprehensive SSRF blocklist IPv4+IPv6+mapped), ALL_KINDS registry, pairing module (NIP-AB spec doc embedded).

### buzz-auth
NIP-42 verify_auth_event (Â±60s timestamp tolerance; grants all 14 scopes), NIP-98 validate_nip98_auth (kind:27235 w/ URL+method tags). AuthContext {pubkey, scopes, method}. Scopes: MessagesRead/Write, ChannelsRead/Write, AdminChannels, UsersRead/Write, AdminUsers, JobsRead/Write, SubscriptionsRead/Write, FilesRead/Write. RateLimiter trait exists but NO production implementation (known limitation #2); RateLimitConfig defines 4 tiers (human, agent-standard, agent-elevated, agent-platform) as design target. Dev-only key derivation SHA-256("buzz-test-key:{username}") feature-gated.

### buzz-db (Postgres, sqlx runtime queries)
Modules: event.rs (insert ON CONFLICT DO NOTHING returning was_inserted; query_events via QueryBuilder), channel.rs (CRUD, transactional TOCTOU-safe role enforcement; types Stream/Forum/Dm/Workflow; roles Owner/Admin/Member/Guest/Bot; soft-delete members via removed_at), feed.rs (query_mentions INNER JOIN normalized event_mentions table; query_needs_action; query_activity; FEED_MAX_LIMIT=100), workflow.rs (workflow/run/approval CRUD; approval tokens stored SHA-256-hashed, single-use via `AND status='pending'`), partition.rs (monthly range partitioning events + delivery_log; DDL injection protection via allowlist), dm.rs, reaction.rs, thread.rs (reply_count/descendant_count materialized counters), user.rs. Run statuses: Pending/Running/WaitingApproval/Completed/Failed/Cancelled.

### buzz-pubsub (Redis)
Dedicated PubSub connection (pool connections can't PSUBSCRIBE); PUBLISH buzz:channel:{uuid} â†’ PSUBSCRIBE loop â†’ broadcast::channel(4096) â†’ consumer fans out locally; multi-node wired w/ local-echo dedup (moka cache of locally-published IDs). Reconnect backoff 1sâ†’30s doubling. Presence: SET EX 180 (3Ã— heartbeat). Typing: ZADD window 5s, EXPIRE 60s. Multi-community keys prefixed buzz:{community}:â€¦.

### buzz-search (Postgres FTS)
search_tsv generated tsvector column populated on insert (to_tsvector('simple', content)), GIN-indexed; privacy-sensitive kinds (1059 gift wrap, 30300 reminders, 30622 DM visibility) yield NULL tsv = storage-level unsearchable. ChannelScope enum (Any/ChannelLessOnly/Channels/ChannelsOrChannelLess). Every query carries community_id (BitmapAnd with btree filters). Returns candidates only â€” relay re-authorizes each hit.

### buzz-audit
SHA-256 hash-chain append-only log; hash covers seq/timestamp/event_id/kind/actor/action/channel/metadata(BTreeMap canonical)/prev_hash; genesis = 64 zeros; pg_advisory_lock single-writer (panic-safe catch_unwind); verify_chain() walks. 10 actions (EventCreatedâ€¦RateLimitExceeded). Refuses KIND_AUTH and ephemeral events. Per-community chains in multi-community mode.

### buzz-workflow (YAML-as-code engine)
Definition: name, trigger{on: message_posted|reaction_added|schedule|webhook, filter evalexpr}, steps[] {id, action, if, params}. 7 actions: send_message, send_dm (stubbed NotImplemented), set_channel_topic (stubbed), add_reaction, call_webhook (SSRF-guarded, redirects disabled, 1 MiB cap), request_approval (Suspended w/ UUID token â€” not yet persisted/resumed end-to-end ðŸš§WF-08), delay (max 300s). Templates {{trigger.text}}/{{trigger.author}}/{{steps.ID.output.FIELD}} single-pass. evalexpr conditions w/ str_* helpers, dotâ†’underscore conversion, 100ms eval timeout. Concurrency Arc<Semaphore> 100 permits, try_acquire â†’ CapacityExceeded (no queuing). Cron scheduler ticks 60s. Run statuses incl. WaitingApproval.

### Huddle audio (inside buzz-relay src/audio/)
WS endpoint /huddle/{channel}/audio; NIP-42 auth + membership check per participant; in-memory rooms; forwards opaque Opus frames; frame protocol v2 (8-byte BE header: seq u16, 48kHz timestamp u32, level dBov i8, flags u8 â€” invalid levels clamped not dropped); soft cap 25 peers (hard 255 u8 index); bounded per-peer channels (drop-on-full audio, never-drop control); lifecycle Nostr events (joined/left/ended; last peer leaves â†’ room ends + channel archives atomically). Recording/tracks reserved but unbuilt.

### Other backend crates
- buzz-media: Blossom/S3 blob storage (upload/download, sha256-addressed).
- buzz-push-gateway: blind capability-gated NIP-PL push gateway for mobile (leases, match queue/gate per migrations).
- buzz-relay-mesh: inter-relay QUIC mesh transport + membership + fenced wire contract.
- buzz-deletion: durable whole-community deletion engine.
- buzz-conformance: runtime trace schema + replay checker for the MultiTenantRelay TLA+ spec.
- buzz-voice: reusable local voice primitives (Opus/NetEQ/STT/TTS used by desktop huddles).
- buzz-datastore-tracing: tracing utilities.

### Security model (relay)
Every event Schnorr-verified pre-storage; ID hash verified independently; frame-size cap; hex validation before URL construction; alphanumeric-only workflow step IDs (evalexpr injection guard); partition-name allowlist (DDL injection); SSRF blocklist on outbound webhooks; webhook secrets compared constant-time; approval tokens CSPRNG UUID stored hashed single-use; membership = the only access gate, checked pre-subscription; TOCTOU-safe transactional membership ops; AUTH events never stored/audited.

### Known limitations (documented, verified)
No sqlx compile-time query cache Â· no rate-limit implementation (trait only) Â· no typing REST endpoint Â· huddle recording/tracks unbuilt Â· approval gates not wired end-to-end (runs hit gates â†’ marked Failed) Â· send_dm/set_channel_topic workflow actions stubbed.

---

## 7. Agent Surface (the heart of Buzz's agent story)

### buzz-acp (ACP harness, 14 files/40,631 lines)
```
Buzz Relay â”€â”€WSâ”€â”€â†’ buzz-acp â”€â”€stdio (ACP/JSON-RPC)â”€â”€â†’ Agent (goose/codex/claude-code)
                                   â””â”€ agent replies via buzz-cli
```
- Listens for @mentions on the relay; queues events per channel; at most ONE prompt in-flight per channel; queued mentions batched into a single session/prompt.
- Pool of 1â€“32 agent subprocesses with claim/return lifecycle; crash detection + respawn.
- Config (CliArgs): relay_url, private_key, agent_owner (NIP-OA), agent_command+args, mcp_command, idle_timeout, max_turn_duration, turn_timeout, system_prompt(+file), agents count, heartbeat_interval + heartbeat_prompt, turn_liveness_secs, initial_message, subscribe mode + kinds + channels filters, no_mention_filter, dedup mode, multiple_event_handling, no_ignore_self, context_message_limit, max_turns_per_session, presence/typing toggles, memory toggles, base_prompt_file, model, effort_level, session_title, permission_mode, respond_to + allowlists, team_instructions, relay_observer, exit_after_inactivity, lazy_pool, idle_pool_sleep.
- Modules: relay.rs (3,143 ln WS+REST+NIP-42), queue.rs (2,565 per-channel batching/dedup), main.rs (2,457 event loop/pool orchestration/heartbeat), pool.rs (2,253 claim/return), config.rs (1,903), acp.rs (1,785 stdio JSON-RPC/timeouts), filter.rs (814 evalexpr subscription rules).
- Auth env vars injected into managed agent subprocesses: BUZZ_RELAY_URL, BUZZ_PRIVATE_KEY, BUZZ_AUTH_TAG.
- Discovers channels via GET /api/channels?member=true; auto-subscribes on membership notifications.

### buzz-cli (agent-first CLI, 29 files/17,772 lines)
JSON in / JSON out, designed for LLM tool calls. Reads return sig-stripped JSON arrays; writes return {event_id, accepted, message}. Exit codes: 0 ok, 1 input, 2 network/relay, 3 auth, 4 other, 5 write conflict (NIP-33 LWW). Global flags: --format compact|json, scoping. Deep links: `buzz://message?channel=<uuid>&id=<hex>` â†’ `messages thread --channel --event`.

Command groups & subcommands (from lib.rs enums):
- **agents** (1,169 ln): draft-create, draft-update, archive, unarchive, archived (+ agent management module).
- **messages** (1,265 ln): send, send-diff, edit, delete, get, thread, search, vote.
- **channels** (1,602 ln): list, get, search, create, update, topic, purpose, join, leave, archive, unarchive, delete, members, add-member, remove-member, set-add-policy.
- **canvas**: get, set. **reactions**: add, remove, get.
- **emoji**: list, set, rm, export, import. **dms**: list, open, add-member, hide.
- **users**: get, set-profile, presence, set-presence, set-status.
- **workflows**: list, get, create, update, delete, trigger, runs, approve.
- **feed**: get. **social**: publish-note, set-contact-list, get-event, get-user-notes, get-contact-list, set-list, get-list.
- **notes** (mem-style key-value notes): set, get, ls, rm.
- **repos**: create, get, list, bind, protect (+ protect list/set/remove).
- **projects**: create, get, list, add-repo, remove-repo, update, delete.
- **patches**: send, get, list, status. **pr**: open, update, get, list, status.
- **issues**: create, get, list, status, assign, unassign.
- **upload**: file. **media**: get. **mem** (agent memory/engrams, 970 ln): ls, get, hash, set, patch, rm.
- **pack**: validate, inspect (persona packs). **moderation**: reports, resolve, ban, unban, timeout, untimeout, restricted, audit.
Plus client.rs (2,299 ln REST/WS wiring), validate.rs (438), links.rs, agent_management.rs (257).

### buzz-agent (minimal ACP agent, 21 files/27,579 lines)
"Stdio in, tool calls out. Non-streaming. No persistence. No cleverness." Loop: LLM call â†’ tool calls â†’ run via MCP â†’ feed results â†’ repeat; terminates when LLM stops, round cap hit, or client cancels. Output IS its tool calls; text forwarded as agent_message_chunk. Providers: Anthropic Messages API, OpenRouter, any OpenAI-compatible (vLLM, llama.cpp, Ollama, Databricks OAuth PKCE, Block Gateway) via BUZZ_AGENT_PROVIDER env. Up to 8 concurrent sessions each with own MCP servers/history/context; self-summarizes history on context overflow. Files: llm.rs (7,488), config.rs (2,119), agent.rs (1,514), auth.rs (1,214), lib.rs (998), types.rs (1,052), mcp.rs (1,126), catalog.rs (659), handoff.rs (595), hints.rs (649), builtin.rs (529), wire.rs (499), model_capabilities.rs (840).

### buzz-dev-mcp (developer MCP server, 11 files/5,202 lines)
Tools: **shell** (bash; Windows resolves Git Bash or BUZZ_SHELL; ephemeral processes, process-group kill on every exit path, bounded output), **read_file**, **view_image** (1,076 ln), **str_replace** (file editing), **todo** (task tracking, 512 ln), plus internal _Stop/_PostCompact hooks; rg.rs (ripgrep integration, 453 ln), tree.rs, paths.rs, shim.rs.

### buzz-persona (persona packs, 9 files/4,612 lines)
`.persona.md` format = YAML frontmatter (name, display_name, description; caps 1 MiB frontmatter/256 KiB body) + markdown body = system prompt. Modules: manifest, merge, pack, resolve, validate. Example pack: examples/meadow-core (personas bana/lev/skip + github-research skill + instructions.md).

### sprig (all-in-one harness, 50 lines)
Single binary bundling buzz-acp + buzz-agent + buzz-dev-mcp (own Dockerfile; CI workflows sprig.yml/sprig-image.yml).

### Git integration
- **git-sign-nostr** (NIP-GS): signs commits/tags with BIP-340 Schnorr; plugs in as gpg.x509.program; keys from NOSTR_PRIVATE_KEY > BUZZ_PRIVATE_KEY > git config nostr.keyfile (hex or nsec); optional NIP-OA owner attestation via BUZZ_AUTH_TAG.
- **git-credential-nostr** (NIP-98): credential helper; on 401 + WWW-Authenticate: Nostr, builds signed kind:27235 event over URL+method, base64 â†’ Authorization: Nostr <token>. git 2.46+ required; CI-friendly via env var.

### Pairing
- **buzz-pair-relay**: ephemeral sidecar relay for NIP-AB device pairing handshakes.
- **buzz-pairing-cli** (buzz-pair): source/target/test-vectors subcommands; nostrpair:// QR URIs; 6-digit SAS verification; secret transfer over any Nostr relay; NIP-42 compatible.

### Remote agents
- **buzz-backend-kubernetes** (15 files/6,118 ln): Kubernetes substrate provider per docs/remote-agents.md provider contract (preserve identity, fail closed with key, converge to single live instance, presence-as-availability, bounded lifetime, secrets out of config). Bundled into desktop app.

### Shared libraries
- **buzz-sdk**: typed Nostr event builders (used by acp + cli).
- **buzz-ws-client**: shared NIP-42 WebSocket client (connect/auth/publish).

---

## 8. buzz-admin (operator CLI)
add-member (--pubkey npub/hex, --role; publishes kind:13534 roster) Â· remove-member Â· list-members Â· generate-key Â· reconcile-channels (emits kind:39000/39002 discovery events idempotently). Shipped inside relay Docker image at /usr/local/bin/buzz-admin.

---

## 9. Desktop App (Tauri 2 + React 19, 2,672 files)

Stack: React 19, TanStack Query v5 + Router v1 (file-based routes), Radix UI, TipTap composer, dnd-kit, emoji-mart, motion, sonner, jdenticon, qrcode, zod v4, mediapipe tasks-vision. All signing/crypto in Rust (nostr-tools is devDep only). Zoom = root font-size scaling; rem-only text enforced by CI guard (check:px-text); virtual typography rem token system; HSL CSS-variable theming w/ sidebar palette + git status colors.

### 29 feature modules (src/features/)
agents (largest: creation/edit events, managed-agent runtime reconciliation, active-turn store per community, working signal, card minting, observer relay ingestion kind 24200, prevent-sleep, snapshot import/export, owner-only gating) Â· agent-memory (engrams UI) Â· channel-templates (apply/create/duplicate) Â· channels (unread tracking, read-state sync NIP-78 kind 30078 d-tagged docs, live updates, welcome-agent channel) Â· chat (header) Â· communities (multi-community storage/navigation; useCommunityInit.resetCommunityState() tears down ALL community-scoped singletons; React key remount boundary) Â· community-members Â· custom-emoji Â· forum (45001/45003) Â· home (unified inbox/feed) Â· huddle (voice state machine, PTT mic controls, add-agent dialog, transcription, companion windows; ~40 Rust commands) Â· identity-archive Â· local-archive (SQLite event archive, sync manager) Â· mesh-compute (share-compute toggle; mesh_start/stop/status/model_catalog behind mesh-llm feature) Â· messages (typing broadcast/receive, paginated history, threads + panel, missing-ancestor loading, drafts, optimistic sends, background media uploads, link previews) Â· moderation (reports 1984 + mod commands 9040â€“9044) Â· notifications (feed-driven + macOS native UNUserNotificationCenter) Â· onboarding (machine/community/welcome-kickoff/invite/key-backup flows) Â· presence (kind 20001) Â· profile (kind 0, avatar upload, NIP-05) Â· projects (git: repos/branches/commits/diffs/PRs/issues/work items; ~25 project_git* commands) Â· pulse (activity feed) Â· reminders (40007/30300) Â· search (NIP-50 scoped) Â· settings (updater, ncryptsec encrypted backups, feedback) Â· sidebar (channels, DM metadata, relay connection card) Â· terminal (embedded PTY via portable-pty: attach/detach/input/resize/scroll/focus) Â· user-status (30315) Â· workflows (runs, approvals grant/deny, triggers).

### Tauri backend (~250 invoke commands)
Groups: terminal (9), deep links (buzz:// scheme; pending queues for community/entity/navigation; single-instance forwarding), builderlab hosted communities (login/create/archive/transfer), identity & keys (get/import/sign_out, ncryptsec backup create/verify/save, sign_event, create_auth_event, NIP-44 encrypt/decrypt, observer frames), profile/users, projects/git (snapshot/diff/clone/branch/push/pull/merge PR/signed issues), relay (URLs, membership CRUD, admission probe, reconnect hook), channels/messages (full CRUD, reactions, forum, canvas, feed, search, history-before, channel window), media (upload/download/transcode/gif/snapshot, clipboard, media proxy port), agents (ACP discovery/install/connect, managed agents CRUD/start/stop/restart/reconcile, logs, model discovery OpenRouter/Databricks/env, personas CRUD/shared, teams CRUD, snapshots export/import, card minting, backend providers probe), workflows, social (notes timeline/reactions), huddle (~45: start/join/leave/end, PCM audio push, STT pipeline sherpa-onnx, TTS voices, agent voice routing, PTT shortcut, model downloads), pairing (start/confirm SAS/cancel), workspace (apply_workspace, repos dir validation, join policy), archive (save-subscriptions, backfill, usage series), misc (OS idle, prevent sleep, vibrancy, link previews incl. YouTube, updater support).

Boot sequence: sentinel wipe â†’ migrations â†’ identity resolution (fatal if lost) â†’ recovery gates â†’ persona backfill â†’ harness registry warm â†’ mesh coordinator â†’ media proxy spawn â†’ nest ensure (~/.buzz dirs) â†’ CLI symlink â†’ orphaned-agent sweep (60s loop) â†’ persona-event flush (30s loop).

Secrets: OS keyring (system-keyring feature) falling back to 0o600 files; ncryptsec encrypted backups. Plugins: deep-link, opener, single-instance, window-state, dialog, updater (release builds only), process, global-shortcut, notification. Bundles external binaries: buzz-acp, buzz-agent, buzz-backend-kubernetes, buzz-dev-mcp, git-credential-nostr, buzz CLI.

### Shared frontend infra
RelayClient singleton (~970 ln) over NATIVE Rust WebSocket (Tauri Channels) â€” resilience stack: reconnect controller/policy/replay prioritizing visible channel, rate-limit gate w/ parsed hints, stall watchdog, closed-connection policy, first-event-gated history, query-invalidation bridging relay events into React Query, read-only + observer clients. kinds.ts mirrors kind.rs (plus curated kind sets for unread/timeline/aux fetches). Typed Tauri wrappers per domain (~20 modules). Feature-flag store over preview-features.json. E2E mock bridge (fake __TAURI_INTERNALS__ compiled only with --mode e2e).

Testing: node test runner unit tests colocated; Playwright smoke (~170 spec files) + relay-backed integration + perf configs (typing latency, scroll smoothness); helpers w/ real Nostr test identities, seed builders, mandatory waitForAnimations, dual-relay harness, fake ACP agent fixture.

---

## 10. Mobile App (Flutter, 547 files)
Riverpod + flutter_hooks (StatefulWidget banned). Catppuccin Latte/Macchiato matching desktop. Features under lib/features/: channels (largest â€” list/detail/thread/compose/emoji picker/message actions/media viewer/unread badges/typing/mentions/deep links + agent_activity submodule w/ transcript builder), forum, home, activity/inbox, pulse (social notes feed), search, profile, invites, pairing (QR scanner + crypto + SAS), settings (theme/accent/community/connection). Shared: relay/ (WebSocket-first connectivity; HTTP only for Blossom media upload; nostr_models.dart kept in sync with desktop kinds.ts; rate-limit gate; signed-event relay; mp4 fast-start), auth, crypto, deeplink (buzz://), emoji/custom_emoji, mentions, read_state, reminders, security (biometric lock via local_auth; secure keypair storage), theme, widgets. Badges via app_badge_plus; rich rendering gpt_markdown + highlight.

## 11. Web Clients
- **web/** (buzz-web): React 19 + TanStack Router/Query + isomorphic-git in-browser. Routes: /, /repos, /repos/$repoId (+blob viewer w/ syntax highlighting), /invite/$code. Repo browsing: tree, README, refs, commits, clone URLs, "Connect on Buzz". Served statically BY THE RELAY (BUZZ_WEB_DIR / BUZZ_SERVE_GIT_WEB_GUI=true) â€” same-origin WS derivation. Custom CI guards: file sizes, pubkey truncation.
- **admin-web/** (buzz-admin-web): operator dashboard â€” moderation report queue (grouped reports, detail, act/dismiss, 403 handling) + product feedback browsing (migration 0017). Tiny: api.ts/types.ts/useResource.ts/App.tsx (836 ln custom routing).

## 12. Infrastructure & Ops
- Dev: docker-compose.yml (Postgres 17, Redis 7, Adminer, MinIO, Prometheus) w/ health checks + resource limits; just setup/dev/relay/build/check/test-unit/test/ci/reset.
- Prod: deploy/compose (single-node VPS bundle + Caddy TLS via !reset override + run.sh bootstrap w/ secret generation) and deploy/charts/buzz (full Helm: Deployment/Ingress+HTTPRoute/HPA/PDB/PVC git data/ServiceMonitor/pairing-relay sidecar/bundled MinIO init/ArgoCD+Flux examples/values.schema.json + render tests) and charts/buzz-push-gateway.
- Migrations: 31 SQL files auto-applied on startup (BUZZ_AUTO_MIGRATE). Arc: base schema â†’ git â†’ moderation â†’ push gateway evolution â†’ community archival/deletion/recovery â†’ product feedback â†’ mesh status â†’ join policies â†’ TTL fencing/locking â†’ invites â†’ replica heartbeat â†’ indexes â†’ workflow error codes.
- Release lanes (RELEASING.md): desktop (candidate PR â†’ squash merge = human authorization â†’ auto-tag verifies provenance â†’ immutable desktop-v tag â†’ multi-platform builds â†’ updater manifest last), relay (docker.yml â†’ ghcr.io stable + debug- + :main/:sha tags), mobile (RC tags cut by GitHub App bot; Buildkite internal builds). Canary workflows per OS. 18 GitHub workflow files total.
- Benchmarks: harbor-buzz-orchestra (Python uv package) orchestrating multi-agent runs against a Buzz testbed compose stack w/ manifests, personas, relay forwarder, leaderboard. perf/: relay bus scaling measurements.
- Formal methods: TLA+ MultiTenantRelay + GitOnObjectStore, Tamarin MultiTenantAuth, mutation-testing harnesses, buzz-conformance replay checker.

---

## 13. Architectural Patterns Worth Carrying Into Fabrica's Transformation

Directly relevant to "desktop CLI agent management and operations platform":
1. **Agents as first-class members with their own cryptographic identities** â€” same affordances as humans, same audit trail, different keypair. Scoped by identity, not permission flags.
2. **One signed event log as universal substrate** â€” chat, patches, approvals, workflow steps, git events all one shape â†’ unified search, unified audit.
3. **Kind-integer extensibility** â€” features are new event kinds; old clients never break.
4. **Agent harness pattern** (buzz-acp): @mention â†’ per-channel queue â†’ batched prompt â†’ ACP subprocess pool (1â€“32) w/ crash respawn, heartbeats, turn timeouts, liveness checks, respond-to allowlists, effort levels.
5. **Agent-first CLI** (buzz-cli): JSON in/out, sig-stripped compact output, meaningful exit codes, deep-link resolution â€” built for LLM tool-call consumption.
6. **Minimal agent runtime** (buzz-agent): LLM-loop + MCP tools, multi-session, history self-summarization, provider-swappable via env.
7. **Managed agents** (desktop): spawn/start/stop/restart/reconcile lifecycle, nest directories, persona/team projections as relay events, orphan sweeps, turn metrics (kind 44200), observer frames (kind 24200).
8. **Remote agents**: identity/history on relay, body replaceable, one-way launch handoff, control exclusively via relay messages, self-reaping inactivity timers, provider conformance contract.
9. **Persona packs** (.persona.md YAML frontmatter + markdown system prompt) and teams as first-class shareable artifacts.
10. **Agent memory (engrams)** as addressable events (kind 30174) with CLI mem subcommands (ls/get/hash/set/patch/rm).
11. **Activity feed UX theory** (VISION_ACTIVITY): sentence-per-item, outcome-first, mutate-in-place, twelve render classes, deliberate suppression.
12. **Approval gates** on workflows (request_approval suspension + grant/deny events 46010â€“46012/46030/46031).
13. **Branches-as-channels**: git lifecycle mapped onto rooms; merge archives the room as permanent record.
14. **Multi-tenant isolation done formally** (host-derived TenantContext before any handler; TLA+/Tamarin verification; conformance replay checker).
15. **Tamper-evident audit** (hash chain) and honest tombstones for deletions/moderation.
16. **Community-scoped everything** including caches, pub/sub keys, search documents, audit chains.

---

## ROUND 3 ADDENDUM â€” orchestrated deep-dive wave (reports in `discovery/round3/`)

| Report | Coverage |
|---|---|
| `round3/buzz-desktop.md` (68KB, file:line cited) | Agents feature + managed_agents runtime: kind 24200 observer-frame ingestion, runtime reconciliation plans, per-community active-turn store save/restore, card minting via OpenAI-key-backed mint_agent_card, ~/.buzz nest dirs, spawn/readiness/supervision/retention lifecycle. Projects + project_git* commands: CLI-shelled git ops, NIP-34-style signed PR/issue events (kinds 1618â€“1633), CAS-safe merge flow with conflict recovery. Huddle audio: Opus 32kbps WS transport, NetEq jitter buffer + playout, sherpa-onnx Parakeet STT, Pocket TTS 12 voices, 4-path barge-in, push-to-talk w/ generation counters. RelayClient stack (~1,084 lines): reconnect/replay prioritizing visible channel, rate-limit gate w/ parsed hints, passive stall watchdog, React Query invalidation bridge |
| `round3/buzz-agent-crates.md` (31KB) | buzz-acp: NIP-42 connect/auth handshake, per-channel batching/dedup queue, pool claim/return lifecycle, stdio JSON-RPC ACP client w/ idle+hard timeouts, evalexpr subscription filters, heartbeat event loop, BUZZ_* env injection chain. buzz-agent: LLM provider abstraction incl. Databricks OAuth PKCE, session loop w/ handoff self-summarization, MCP env sandboxing. buzz-cli: REST/retry/media patterns, 64KiB content limits. buzz-workflow: trigger evaluation, cron scheduling, approval-suspension internals â€” all file:line cited |
| `round3/mc-frontend-buzz-clients.md` (26KB) | Also covers buzz mobile relay transport internals (relay_socket/relay_session/rate-limit gate/signed-event relay/media upload), channels feature structure, pairing crypto; web isomorphic-git browser client + NIP-98 signer |

---

## ROUND 2 DEEP DIVE â€” buzz-relay internals (handlers, git hosting, tenancy, connections)

### R2.1 Layout (src/, ~79 files)
main.rs (2,136: config, pools, migrations, background tasks, graceful shutdown) Â· router.rs (561: all HTTP routes, CORS, body limits, SPA fallback) Â· state.rs (2,198: AppState, connection manager, community connection control) Â· config.rs (1,558 env-driven w/ validation) Â· connection.rs (1,025 WS lifecycle) Â· subscription.rs (1,764 (channel,kind) fan-out index) Â· admission.rs (138 rate-limit seam) Â· tenant.rs (304 row-zero host binding) Â· protocol.rs (424 NIP-01 parsing) Â· metrics/telemetry/nip11 Â· invite_token.rs (HMAC) / webhook_secret.rs Â· push_runtime.rs (665 durable NIP-PL matcher + gateway worker) Â· storage_sweep.rs (1,008 hourly S3 usage sweep) Â· workflow_sink.rs (648 relay-side ActionSink emitting kind:9) Â· mesh_boot.rs (700 inter-relay mesh) Â· conformance/ (TLA+ trace emission at ingest/read boundary). Dirs: handlers/ (18), api/ (bridge 3,523; media 1,257; invites 1,673; operator 1,160; workflows; nip05; admin/) + api/git/ (10 files), audio/ (huddle voice: handler 1,404, join 2,837, room 728), tunnel/ (mesh tunnel sessions: Redis fenced lease directory 923, reliable-stream routing 866).

### R2.2 Handlers (key logic)
- **event.rs** (2,301): verify â†’ route ephemeral 20000â€“29999 (WS-only; presence special-case kind 20001), encrypted observer frames 24200, gift wraps, else ingest pipeline. Per-subscriber pre-encoded frame cache (serialize once for N subs); bounded Prometheus kind labels; viewer-private kinds (30622 DM visibility, 44200 agent turns) strip p-tags for non-recipients.
- **ingest.rs** (4,848): "two doors, one room" â€” WS EVENT and POST /events share ingest_event: signature verify (spawn_blocking) â†’ timestamp freshness Â±15 min â†’ tenant/channel scoping â†’ per-kind envelope validators (edits 40003 ownership, votes 45002 targets, diffs 40008, engrams 30174, personas 30175, team catalogs 30178, projects 30621, repo state 30618, turn metrics 44200, reminders 30300â€¦) â†’ scope authorization per kind â†’ storage â†’ command-kind routing. Reactions (kind 7) atomic dedup upsert pre-storage; deletions derive channel from target; create-group compensates (deletes channel) on later failure. TLA+ conformance traces at accept/reject.
- **req.rs** (2,171): MAX_SUBSCRIPTIONS 1024/conn, FILTER_QUERY_CONCURRENCY 4, MAX_EXPLICIT_CHANNEL_VALUES 128 #h values; visibility gating (p-gated kinds 403 without kinds, author-only, result-gated, DM event_visible_to_reader); NIP-50 search â†’ FTS.
- **auth.rs** (324): pure challenge verification; extracts NIP-OA agent auth tag for owner-delegation membership.
- **command_executor.rs** (1,486): transactional command kinds (41010â€“41012 DM ops, 30620 workflow defs, 46020 triggers, 46030â€“46031 approvals): validate â†’ tx insert â†’ mutations â†’ commit; webhook secret generation (SHA-256).
- **side_effects.rs** (3,330): group discovery events 39000â€“39002, member notifications, NIP-43 lists, archival events, thread summaries; evicts kicked users' live subscriptions by pubkey-in-community walk.
- **relay_admin.rs** (817): NIP-43 kinds 9030â€“9033 processed directly, never stored; role changes owner-only.
- **moderation_commands.rs** (697): 9040â€“9044 community-global, fresh timestamp required, channel-scoped tokens rejected; ban = upsert + audit + live disconnect + notice DM.
- **moderation_authz.rs** (313): single capability seam; roles only from tenant-scoped tables; v1 grid (owner/admin all; channel owner/admin DeleteMessage/Kick in-channel).
- **moderation_notices.rs** (368): relay-signed notice DMs via moderation key; never names reporters or quotes report notes.
- **report.rs** (298): reports are "signals, never triggers"; e-targets resolved in-tenant only (never cross-tenant search); x-targets = (community_id, sha256).
- **identity_archive.rs** (702): consent paths SelfSigned/Owner/Admin; live kind:0 profile must attest requester; mutates archived_identities + emits relay-signed deltas before storing request.
- **push_lease.rs** (720): strict serde deny_unknown_fields envelope validation; push kinds [7, 9, 1059, 40007, 46010]; tenant from TenantContext never decrypted origin.
- Also: product_feedback (category enum, â‰¤32KB body, imeta verified vs media sidecar), imeta validation shared module, community_provisioning (operator allowlist above tenants).

### R2.3 Git hosting on object storage
Routes: GET info/refs (120s), POST git-upload-pack (300s, 64MB decoded gzip-bomb cap), POST git-receive-pack â€” all NIP-98 auth via GitAuth extractor; reads require active membership in the repo's bound channel (no public repos v1). **Repos are not on disk**: content-addressed create-only pack writes (SHA-256 keys, If-None-Match: *), single pointer object per repo swapped via ETag If-Match CAS (412 = semantic LostRace outcome), manifest validation (safe refnames/OIDs/pack keys), startup conformance probe (32-way race Ã— 3 rounds) as fail-closed deployment gate; hydrate.rs materializes ephemeral bare repos into scratch for read/write with LRU pack cache. Push flow: no per-repo lock â€” writer serialization IS the pointer CAS (loser's work discarded, accepted v1 tradeoff); cas_publish (packâ†’idxâ†’manifestâ†’pointer CAS) completes before any 2xx. Policy hooks: injected bash pre-receive hook reads old/new/ref lines, FF-detects via merge-base against quarantine dirs, POSTs to loopback-only /internal/git/policy (HMAC-SHA256 over length-prefixed payload + 30s TTL, fail-closed); policy resolves kind:30617 protections, grants owner authority to repo key or verified managed-agent owner (NIP-OA), maps Botâ†’Member role, evaluates push perms per-ref.

### R2.4 Multi-tenancy (row-zero)
bind_community normalizes host (lowercase, strip trailing dot/default ports, keep IPv6 brackets) â†’ HostResolver queries communities table UNIQUE(lower(host)); empty host fails closed BEFORE lookup with byte-identical UnmappedHost error (no probing). No default/fallback tenant. WS door binds before upgrade (no frames read unbound; generic 404 never echoes host). Every HTTP surface repeats row zero independently (bridge/media/invites/operator/workflows/nip05/git/audio). Server-internal paths use bind_deployment_community over the deployment's own relay_url authority (not a fallback). community_id enforced in: every DB query, membership checks ("admitting a pubkey to community A never admits it to B"), NIP-OA backfill, git pointer keys + BUZZ_COMMUNITY_ID in HMAC-bound hook callback, subscription SubEntry carries CommunityId, Redis topics namespaced, moderation roles tenant-scoped, deletion serving fences validated at boot (refuses unsafe start).

### R2.5 Connection management
Admission: check_principal over Redis-backed RateLimiter trait; Exceeded â†’ rejection w/ retry hint; Redis down â†’ fail-closed (separate metric reason=unavailable). WS budget = fixed-window 5s burst (per-sec Ã— 5) so desktop startup bursts don't trip averages. Per-type limits from config: human_messages_per_min / human_api_calls_per_min / human_ws_events_per_sec; invite claims process-local 10/pubkey/60s bounded 10k pubkeys. Lifecycle: global conn semaphore try_acquire (no queuing) â†’ row-zero binding â†’ challenge â†’ 5s AUTH_TIMEOUT cancels slot-holders â†’ send_loop (batches â‰¤64 frames, control-frame priority) + heartbeat + recv loops; handler_semaphore caps concurrent handlers. Slow clients: try_send backpressure counter, grace_limit cancellations metricized, success resets. Frame limits set at parser level (default 512KB) + app-level defense in depth. Shutdown: readiness 503 + shutting_down; drain closes live conns w/ close code 1012 (Service Restart) after jittered delay (â‰¤20s); exactly one 1012 flush guaranteed (unit-tested). Health router separate port no-auth: /_liveness, /_readiness (Postgres ping + Redis pool + deletion fences, 2s timeout), /_status, /_mesh. Audio: tighter caps (4KB Opus frames, 30s heartbeat, 25 peers/room), try_send everywhere (drops tolerated, never queued), cross-pod joins arbitrated by Redis fenced CAS leases validating {session_id, generation, owner_runtime_id}.

---
*Round-1 coverage preserved below; Round 2 added function-level depth on buzz-relay (the largest unread area).*

*Scan coverage: README/AGENTS/ARCHITECTURE read in full; all 8 VISION docs + NOSTR/TESTING/RELEASING/GOVERNANCE + preview-features summarized; full kind.rs registry extracted; CLI command surface extracted from lib.rs enums; acp config fields, dev-mcp tool list, persona format, agent crate structure, git/pairing crate READMEs captured; desktop (29 features, ~250 Tauri commands, shared infra, testing), mobile, web, admin-web, deploy, migrations, docs, tooling covered via structured deep-scan. Not read line-by-line: buzz-relay handler internals (covered by ARCHITECTURE.md + Round-2 deep dive), buzz-db query bodies, buzz-acp/buzz-agent full implementations (structure + config captured), individual desktop component files.*

