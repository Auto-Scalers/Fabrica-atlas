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
| Branches as Channels | Feature branches auto-create channels; CI, reviews, merge decisions live there |
| Multi-Repo Projects | Named grouping of repositories via kind:30621 |
| Merge Flow | Push → CI → review in branch channel → approval → merge |
| Pull Requests | NIP-34 PR events with review and approval |
| Issues | NIP-34 issue events through forum surface |

---

## 10. Media

| Feature | What It Does |
|---------|-------------|
| Blossom Media Storage | SHA-256 content-addressed on S3/MinIO; 50MB limit; server thumbnails |
| Media Upload/Download | Paste/drop/attach; REST endpoints |

---

## 11. Moderation

| Feature | What It Does |
|---------|-------------|
| Community Moderation | Report/decide/enforce/audit; private reports, signed commands, tombstones, timeouts |
| Identity Archival | Archive/unarchive identities with relay-signed deltas |

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
| Device Pairing (NIP-AB) | Ephemeral device pairing |
| Relay Membership (NIP-43) | Add/remove/change-role with relay-signed announcements |

---

## 15. Desktop Client (Tauri 2 + React 19)

| Feature | What It Does |
|---------|-------------|
| App Shell | Tauri 2, React 19, Vite, Tailwind; community key-based remounting |
| 29 Feature Modules | agent-memory, agents, channel-templates, channels, chat, communities, community-members, custom-emoji, forum, home, huddle, identity-archive, local-archive, mesh-compute, messages, moderation, notifications, onboarding, presence, profile, projects, pulse, reminders, search, settings, sidebar, terminal, user-status, workflows |
| Community Switching | Multi-community with singleton reset |
| Deep Links | buzz:// URL scheme |
| Text Sizing & Zoom | Cmd+/- zoom via root html font-size |

---

## 16. Infrastructure

| Feature | What It Does |
|---------|-------------|
| buzz-relay | Axum WebSocket server; AppState with all service arcs |
| buzz-db | Postgres with monthly range partitioning, channel CRUD, membership, workflow CRUD, feed queries |
| buzz-pubsub | Redis pub/sub for fan-out, presence, typing; community-scoped |
| buzz-ws-client | NIP-42 WebSocket client |
| buzz-sdk | Typed Nostr event builders |
| buzz-conformance | Provider conformance checker |
| Push Notifications | APNS gateway with app attestation |
| sprig | All-in-one harness: ACP + agent + dev MCP |
