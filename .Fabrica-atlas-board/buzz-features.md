# Buzz — Complete Feature Catalog

> _Source: `Fabrica-atlas/_sources/buzz/`_
> _127 Nostr event kinds, 30 Rust crates, 29 desktop feature modules, 7 surfaces_

---

## 1. Agent Management

| Feature | What It Does |
|---------|-------------|
| Agent Identity (secp256k1) | Every agent gets a cryptographic identity (Nostr keypair) with NIP-05 handle |
| Agent Personas | Model + system prompt + config; publishable as kind:30175 events |
| Agent Teams | Named groupings of personas deployed as a unit |
| Managed Agents | Owner-defined agent definitions with allowlist projections |
| Agent Engrams / Memory | Encrypted memory records — core identity + hierarchical slug memories with [[ref]] cross-linking |
| ACP Agent Harness | Bridges relay events to AI agents via JSON-RPC; 1-32 agent subprocess pool with crash recovery |
| Agent CLI | Agent-first CLI mirroring MCP surface for scripting without GUI |
| buzz-agent | Standalone ACP agent binary — speaks ACP, calls LLMs, uses MCP tools; 8 concurrent sessions |
| buzz-dev-mcp | MCP server: shell, str_replace, read_file, rg, tree, todo, view_image |
| Agent Activity Feed | Supervisory feed: verb-object-outcome sentences, 12 render classes (Message, File-edit, Shell, Thought, Plan, Permission, Error, etc.) |
| Agent Observer / Telemetry | Owner-scoped encrypted telemetry frames + per-turn token-usage metrics |
| Remote Agents | Agent identity on relay; deploy to remote infrastructure (Kubernetes) via provider binaries |
| Agent Lifecycle Management | spawn/start/stop/restart/reconcile, nest directories, persona/team projections, orphan sweeps |
| Agent Card Minting | mint_agent_card via OpenAI-key-backed minting |
| Agent Turn Metrics | kind:44200 durable per-turn token-usage metrics |
| Agent Observer Frames | kind:24200 ephemeral encrypted telemetry frames |
| LLM Provider Abstraction | incl. Databricks OAuth PKCE, provider-swappable via env |
| Session Handoff Self-Summarization | history self-summarization on session handoff |
| MCP Env Sandboxing | sandboxed environment for MCP tool execution |
| Persona Packs | .persona.md YAML frontmatter + markdown system prompt |
| BUZZ_* Env Injection Chain | environment variable injection for agent processes |

---

## 2. Event System

| Feature | What It Does |
|---------|-------------|
| Nostr Protocol Core | Every action is a signed event with 6 fields; kind integer dispatch |
| Event Pipeline (12-step) | auth → pubkey match → ephemeral route → verify → membership → DB insert → Redis publish → fan-out → search index → audit → workflow trigger |
| Subscription & Fan-out | Three-tier: channel+kind index O(1), channel wildcard, global scan; DashMap-backed |
| Authentication (NIP-42/NIP-98) | WebSocket auth via signed challenges; HTTP auth via signed events; 14 scopes |
| Event Verification | Schnorr signature + SHA-256 ID hash validation |
| Hash-Chain Audit Log | Tamper-evident append-only log; SHA-256 hash chaining; 10 action types; single-writer guarantee |
| Ephemeral Events | Events bypassing DB, audit, search — presence, typing, pairing, huddle reactions |
| Per-Subscriber Pre-Encoded Frame Cache | serialize once for N subs; bounded Prometheus kind labels |
| Viewer-Private Kinds | DM visibility (30622), agent turns (44200) strip p-tags for non-recipients |
| Timestamp Freshness Check | ±15 min freshness validation on ingest |
| Per-Kind Envelope Validators | edits 40003 ownership, votes 45002 targets, diffs 40008, engrams 30174, personas 30175, team catalogs 30178, projects 30621, repo state 30618, turn metrics 44200, reminders 30300 |
| Scope Authorization Per Kind | 14 scopes enforced per event kind |
| Reaction Atomic Dedup | kind:7 reactions atomic upsert pre-storage |
| Deletion Channel Derivation | deletions derive channel from target |
| TLA+ Conformance Traces | traces at accept/reject boundaries |
| Subscription Limits | MAX_SUBSCRIPTIONS 1024/conn, FILTER_QUERY_CONCURRENCY 4, MAX_EXPLICIT_CHANNEL_VALUES 128 |
| Visibility Gating | p-gated kinds 403 without kinds, author-only, result-gated, DM event_visible_to_reader |
| NIP-50 Search | search filters routed to Postgres FTS |

---

## 3. Workflows

| Feature | What It Does |
|---------|-------------|
| YAML-as-Code Workflow Engine | Channel-scoped automation; 4 triggers, 7 actions, template variables, evalexpr conditions (100ms timeout) |
| Workflow Approvals | Suspend for human approval with UUID tokens |
| Workflow Traces | Every step emits signed event: start/completion/failure |
| Webhook Triggers | External systems trigger via POST /hooks/{id} with constant-time secret |
| Cron Scheduler | Loop ticks every 60s, evaluates cron with window matching |

**Triggers:** message_posted, reaction_added, schedule (cron), webhook
**Actions:** send_message, send_dm, set_channel_topic, add_reaction, call_webhook, request_approval, delay

---

## 4. Channels & Messaging

| Feature | What It Does |
|---------|-------------|
| Stream Channels (NIP-29) | Topic-based real-time chat: Stream, Forum, Dm, Workflow; roles: Owner, Admin, Member, Guest, Bot |
| Forum Threads | Async long-form threads with root posts and flat replies |
| Direct Messages (NIP-17) | 1:1 and group DMs (up to 9); gift-wrapped for sender privacy |
| Message Editing & Deletion | Edit history; soft-delete with tombstones; NIP-09 deletion |
| Message Threading (NIP-10) | Thread tracking with reply_count and descendant_count |
| Reactions (NIP-25) | Emoji reactions on messages |
| Pinned / Bookmarked / Scheduled Messages | Pin, bookmark, schedule future delivery |
| Diff/Patch Messages | Unified diff showing file changes |
| Canvas (Shared Documents) | Shared document per channel |
| System Messages | Channel state changes (join, leave, rename) |
| Channel Templates | Pre-configured channel setups |
| Typing Indicators | Real-time via Redis sorted sets (5s window, 60s TTL) |
| Channel Create-Group Compensations | compensates (deletes channel) on later failure |
| User Eviction on Kick | evicts kicked users' live subscriptions by pubkey-in-community walk |
| Thread Summary Materialization | reply_count and descendant_count materialized on root events |
| Group Discovery Events | 39000-39002 for channel state changes |
| Member Notifications | NIP-43 lists, archival events |
| Diff/Patch Messages | unified diff format showing file changes |
| Scheduled Messages | messages scheduled for future delivery |
| Bookmarked Messages | user-level message bookmarking |
| Pinned Messages | pin messages in channels |

---

## 5. Communities & Multi-Tenancy

| Feature | What It Does |
|---------|-------------|
| Community System | Tenant boundary — one workspace, one URL, isolated world |
| Multi-Community Isolation | Shared infra with proven isolation |
| Community Switching | React key-based remounting without reload |

---

## 6. Presence & Collaboration

| Feature | What It Does |
|---------|-------------|
| Presence Tracking | Online/Away/Offline via Redis SET with 180s TTL |
| Huddle Audio | Real-time voice via WebSocket Opus frames; room state, admission guard, 25 peer cap |
| Huddle NetEq Jitter Buffer | playout buffer for smooth audio |
| Huddle Parakeet STT | sherpa-onnx Parakeet speech-to-text |
| Huddle Pocket TTS | 12 voices text-to-speech |
| Huddle 4-Path Barge-in | interrupt detection |
| Huddle Push-to-Talk | generation counters for voice activity |
| Home Feed | Personalized: @mentions, action items, channel activity, agent updates |
| Notifications | Zero-notification default; opt-in per channel; URGENT-only for DMs |
| Read State Sync | Per-client read position across devices; encrypted |

---

## 7. Search

| Feature | What It Does |
|---------|-------------|
| Full-Text Search | Postgres FTS via tsvector + GIN index; privacy-sensitive kinds excluded; community-scoped |

---

## 8. Voice

| Feature | What It Does |
|---------|-------------|
| buzz-voice | Voice processing with Pocket integration for STT/TTS |
| Voice Frame Protocol | 8-byte header + Opus payload |

---

## 9. Code & Projects

| Feature | What It Does |
|---------|-------------|
| Git Hosting (Smart HTTP) | Standard clone/push over Smart HTTP; npub signs pushes |
| Git Hosting on Object Storage | content-addressed create-only pack writes (SHA-256 keys), CAS pointer swap via ETag If-Match |
| Git Hydrate | materializes ephemeral bare repos into scratch for read/write with LRU pack cache |
| Git Policy Hooks | bash pre-receive hook, HMAC-SHA256 over length-prefixed payload + 30s TTL, fail-closed |
| Git Branch Protections | push-allowed, require-approval, no-force-push via buzz-protect tags |
| Branches as Channels | Feature branches auto-create channels; CI, reviews, merge decisions live there |
| Multi-Repo Projects | Named grouping of repositories via kind:30621 |
| Merge Flow | Push → CI → review in branch channel → approval → merge |
| Pull Requests | NIP-34 PR events with review and approval |
| Issues | NIP-34 issue events through forum surface |
| Git Sign Nostr | sign git objects with a Nostr key |
| Git Credential Nostr | git credential helper for Nostr-authenticated push/fetch |

---

## 10. Media

| Feature | What It Does |
|---------|-------------|
| Blossom Media Storage | SHA-256 content-addressed on S3/MinIO; 50MB limit; server thumbnails |
| Media Upload/Download | Paste/drop/attach; REST endpoints |
| imeta Validation | shared module for media metadata validation |
| Storage Sweep | hourly S3 usage sweep |

---

## 11. Moderation

| Feature | What It Does |
|---------|-------------|
| Community Moderation | Report/decide/enforce/audit; private reports, signed commands, tombstones, timeouts |
| Moderation Commands | 9040-9044 community-global, fresh timestamp required, channel-scoped tokens rejected |
| Moderation Authz | single capability seam; roles only from tenant-scoped tables; v1 grid |
| Moderation Notices | relay-signed notice DMs via moderation key; never names reporters |
| Report Handling | "signals, never triggers"; e-targets resolved in-tenant only |
| Identity Archival | Archive/unarchive identities with relay-signed deltas |
| Product Feedback | category enum, ≤32KB body, imeta verified vs media sidecar |

---

## 12. Mesh Compute

| Feature | What It Does |
|---------|-------------|
| Buzz Mesh | Community members pool idle GPU; agents consume via local OpenAI-compatible endpoint |
| Model Splitting | Models split across machines |

---

## 13. Profiles & Social

| Feature | What It Does |
|---------|-------------|
| User Profiles | NIP-01 metadata with NIP-05 handles |
| User Status | NIP-38 status (general, music, custom) |
| Long-Form Content | Articles, blog posts, RFCs via NIP-23 |
| Emoji System | Custom emoji sets per member |
| Reminders | Encrypted author-only reminders with not_before |

---

## 14. Identity & Access

| Feature | What It Does |
|---------|-------------|
| NIP-05 Identity | DNS-like identity verification |
| NIP-42 Authentication | WebSocket signed challenge/response |
| NIP-98 HTTP Auth | HTTP auth via signed events |
| NIP-OA (Owner Attestation) | Proves which human authorized which agent |
| Device Pairing (NIP-AB) | Ephemeral device pairing via buzz-pair-relay sidecar |
| Relay Membership (NIP-43) | Add/remove/change-role with relay-signed announcements |
| Owner Attestation Tag | NIP-OA backfill, agent auth tag extraction |
| Conformance Replay Checker | TLA+/Tamarin verified multi-tenant isolation |

---

## 15. Desktop Client (Tauri 2 + React 19)

| Feature | What It Does |
|---------|-------------|
| App Shell | Tauri 2, React 19, Vite, Tailwind; community key-based remounting |
| 29 Feature Modules | agent-memory, agents, channel-templates, channels, chat, communities, community-members, custom-emoji, forum, home, huddle, identity-archive, local-archive, mesh-compute, messages, moderation, notifications, onboarding, presence, profile, projects, pulse, reminders, search, settings, sidebar, terminal, user-status, workflows |
| Community Switching | Multi-community with singleton reset |
| Deep Links | buzz:// URL scheme |
| Text Sizing & Zoom | Cmd+/- zoom via root html font-size |
| RelayClient Stack | ~1,084 LOC: reconnect/replay prioritizing visible channel, rate-limit gate w/ parsed hints, passive stall watchdog, React Query invalidation bridge |
| Mobile Relay Transport | relay_socket/relay_session/rate-limit gate/signed-event relay/media upload |
| Web Isomorphic-git Client | browser client + NIP-98 signer |
| CI Guard | check-px-text.mjs prevents px-based text |

---

## 16. Infrastructure

| Feature | What It Does |
|---------|-------------|
| buzz-relay | Axum WebSocket server; AppState with all service arcs |
| buzz-relay main.rs | 2,136 LOC: config, pools, migrations, background tasks, graceful shutdown |
| buzz-relay router.rs | 561 LOC: all HTTP routes, CORS, body limits, SPA fallback |
| buzz-relay state.rs | 2,198 LOC: AppState, connection manager, community connection control |
| buzz-relay config.rs | 1,558 LOC: env-driven with validation |
| buzz-relay connection.rs | 1,025 LOC: WS lifecycle |
| buzz-relay subscription.rs | 1,764 LOC: (channel,kind) fan-out index |
| buzz-relay admission.rs | 138 LOC: rate-limit seam |
| buzz-relay tenant.rs | 304 LOC: row-zero host binding |
| buzz-relay protocol.rs | 424 LOC: NIP-01 parsing |
| buzz-relay push_runtime.rs | 665 LOC: durable NIP-PL matcher + gateway worker |
| buzz-relay storage_sweep.rs | 1,008 LOC: hourly S3 usage sweep |
| buzz-relay workflow_sink.rs | 648 LOC: relay-side ActionSink emitting kind:9 |
| buzz-relay mesh_boot.rs | 700 LOC: inter-relay mesh |
| buzz-relay handlers/ | 18 handler modules |
| buzz-relay api/ | bridge 3,523 LOC, media 1,257 LOC, invites 1,673 LOC, operator 1,160 LOC, workflows, nip05, admin/ |
| buzz-relay api/git/ | 10 files for git hosting |
| buzz-relay audio/ | handler 1,404 LOC, join 2,837 LOC, room 728 LOC |
| buzz-relay tunnel/ | mesh tunnel sessions: Redis fenced lease 923 LOC, reliable-stream routing 866 LOC |
| buzz-relay conformance/ | TLA+ trace emission at ingest/read boundary |
| buzz-relay event.rs | 2,301 LOC: verify → route ephemeral → encrypted observer frames → gift wraps → ingest pipeline |
| buzz-relay ingest.rs | 4,848 LOC: "two doors, one room" — WS EVENT and POST /events share ingest_event |
| buzz-relay req.rs | 2,171 LOC: subscription limits, visibility gating, NIP-50 search |
| buzz-relay auth.rs | 324 LOC: pure challenge verification; NIP-OA agent auth tag |
| buzz-relay command_executor.rs | 1,486 LOC: transactional command kinds (DM ops, workflow defs, triggers, approvals) |
| buzz-relay side_effects.rs | 3,330 LOC: group discovery, member notifications, NIP-43 lists, archival, thread summaries, eviction |
| buzz-relay relay_admin.rs | 817 LOC: NIP-43 kinds 9030-9033 processed directly, role changes owner-only |
| buzz-relay moderation_commands.rs | 697 LOC: 9040-9044 community-global, fresh timestamp required, ban = upsert + audit + live disconnect |
| buzz-relay moderation_authz.rs | 313 LOC: single capability seam; roles only from tenant-scoped tables |
| buzz-relay moderation_notices.rs | 368 LOC: relay-signed notice DMs via moderation key |
| buzz-relay report.rs | 298 LOC: reports are "signals, never triggers"; e-targets resolved in-tenant only |
| buzz-relay identity_archive.rs | 702 LOC: consent paths SelfSigned/Owner/Admin; live kind:0 profile attestation |
| buzz-relay push_lease.rs | 720 LOC: strict serde deny_unknown_fields envelope validation |
| buzz-relay product_feedback | category enum, ≤32KB body, imeta verified vs media sidecar |
| buzz-relay imeta validation | shared module for media metadata validation |
| buzz-relay community_provisioning | operator allowlist above tenants |
| buzz-db | Postgres with monthly range partitioning, channel CRUD, membership, workflow CRUD, feed queries |
| buzz-pubsub | Redis pub/sub for fan-out, presence, typing; community-scoped |
| buzz-ws-client | NIP-42 WebSocket client |
| buzz-sdk | Typed Nostr event builders |
| buzz-conformance | Provider conformance checker |
| Connection Admission | check_principal over Redis-backed RateLimiter; fail-closed on Redis down |
| Connection Rate Limiting | per-type limits: human_messages_per_min, human_api_calls_per_min, human_ws_events_per_sec |
| Connection Health | /_liveness, /_readiness (Postgres ping + Redis pool + deletion fences, 2s timeout), /_status, /_mesh |
| Graceful Shutdown | readiness 503 + shutting_down; drain closes live conns w/ close code 1012 after jittered delay (≤20s) |
| Frame Limits | 512KB at parser level + app-level defense in depth |
| Slow Client Handling | try_send backpressure counter, grace_limit cancellations metricized |
| Push Notifications | APNS gateway with app attestation |
| Push Lease Validation | strict serde deny_unknown_fields, push kinds [7, 9, 1059, 40007, 46010] |
| sprig | All-in-one harness: ACP + agent + dev MCP |
