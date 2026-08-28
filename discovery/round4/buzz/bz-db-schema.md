# R4-1.2 — buzz database schema deep dive (line-level)

Task: ATLAS R4-1.2 · dispatch ctx_5ef264813ea8 · task_dce90a9478fd · Round 4 Group 1
Scope: `_sources/buzz/` (READ-ONLY). Every claim cites `file:line` relative to `_sources/buzz/`.

buzz has **four distinct persistence layers**:

| # | Layer | Engine | Schema source | Runner |
|---|---|---|---|---|
| A | Relay core DB | PostgreSQL (sqlx) | `migrations/0001_initial_schema.sql` … `0031_workflow_run_error_codes.sql` + consolidated desired-state `schema/schema.sql` | `crates/buzz-db/src/migration.rs:27` (`run_migrations`) |
| B | Push gateway DB | PostgreSQL (separate deployment-global authority DB) | `crates/buzz-push-gateway/migrations/0001_push_gateway_authority.sql` | gateway's own runner; runtime guards in `crates/buzz-push-gateway/src/postgres.rs:472+` |
| C | Desktop archive DB | SQLite (rusqlite 0.37 bundled, WAL) | DDL constant in `desktop/src-tauri/src/archive/store.rs:20-141` | name-ledger migrations `desktop/src-tauri/src/archive/store_migrations.rs:21-25` |
| D | Desktop retention DBs | SQLite, **one per (relay_url, owner_pubkey)** scope | DDL inline `desktop/src-tauri/src/managed_agents/retention.rs:133-145` | legacy→scoped migration `desktop/src-tauri/src/managed_agents/retention/legacy_migration.rs:54-109` |

No Prisma, no Drizzle, no Zod schema models exist anywhere in buzz. All Rust row structs are hand-mapped (tuple `query_as` or manual `PgRow` mappers); there are no `#[derive(FromRow)]` structs (verified across `crates/buzz-db/src/*.rs`). Desktop "task/workitem" state lives in JSON files (`managed-agents.json`, `teams.json`), not SQLite — see §E.

---

## A. Relay core DB (PostgreSQL)

### A.0 Governing contract

- Multi-tenant invariant ("row zero"): a request's community is resolved from the connection host by the server, never supplied by the client; every scoped row carries immutable `community_id` (`migrations/0001_initial_schema.sql:10-14`).
- Migration-lint obligations: every tenant-scoped table has `community_id NOT NULL`; every PK/UNIQUE/FK leads with `community_id`; `channels.community_id` is immutable via trigger; operator-global tables must be explicitly allowlisted (`migrations/0001_initial_schema.sql:16-22`). The lint harness itself lives at `crates/buzz-db/src/migration.rs:170` (`ConstraintLint`).
- Operator-global tables are registered as rows in `_operator_global_tables` (`migrations/0001_initial_schema.sql:628-636`) — seed rows for `communities`, `rate_limit_violations`, and the registry itself.

### A.1 Custom enum types (`migrations/0001_initial_schema.sql:28-37`)

| Type | Values | Line |
|---|---|---|
| `channel_type` | stream, forum, dm, workflow | :28 |
| `channel_visibility` | open, private | :29 |
| `member_role` | owner, admin, member, guest, bot | :30 |
| `workflow_status` | active, disabled, archived | :31 |
| `run_status` | pending, running, waiting_approval, completed, failed, cancelled | :32 |
| `approval_status` | pending, granted, denied, expired | :33 |
| `delivery_method` | webhook, websocket | :34 |
| `subscription_status` | active, paused, deleted | :35 |
| `pause_reason` | user, system, rate_limit | :36 |
| `channel_add_policy` | anyone, owner_only, nobody | :37 |

### A.2 Core tables from migration 0001 (full column/index detail)

**`communities`** — operator-global tenant registry (`migrations/0001_initial_schema.sql:53-61`)
- Columns: `id UUID PK DEFAULT gen_random_uuid()`, `host VARCHAR(255) NOT NULL`, `signing_key BYTEA`, `created_at TIMESTAMPTZ DEFAULT NOW()` (:54-57); CHECK `id <> nil uuid` (:58)
- Index: `idx_communities_host UNIQUE ON (lower(host))` (:61)
- Later ALTERs: `icon TEXT` (0003, `migrations/0003_community_icon.sql:12`), `archived_at TIMESTAMPTZ` (0016, `migrations/0016_community_archival.sql:3`), deletion columns `deletion_state TEXT NOT NULL DEFAULT 'active' CHECK IN ('active','quiescing','fenced','tombstone')`, `deletion_fence_generation BIGINT NOT NULL DEFAULT 0`, `deleted_at TIMESTAMPTZ` (0029, `migrations/0029_community_deletion.sql:12-17`).

**`channels`** (`migrations/0001_initial_schema.sql:72-110`)
- PK `(community_id, id)` — same UUID may exist in two communities by design (:65-70, :97)
- Columns: `id UUID`, `community_id UUID FK communities`, `name VARCHAR(255)`, `channel_type channel_type DEFAULT 'stream'`, `visibility channel_visibility DEFAULT 'open'`, `description TEXT`, `canvas TEXT`, `created_by BYTEA`, `created_at/updated_at TIMESTAMPTZ`, `archived_at/deleted_at TIMESTAMPTZ`, `nip29_group_id VARCHAR(255)`, `topic_required BOOLEAN`, `max_members INT`, `topic TEXT`, `topic_set_by BYTEA`, `topic_set_at TIMESTAMPTZ`, `purpose TEXT`, `purpose_set_by BYTEA`, `purpose_set_at TIMESTAMPTZ`, `participant_hash BYTEA`, `ttl_seconds INT`, `ttl_deadline TIMESTAMPTZ` (:73-96)
- Indexes: `idx_channels_nip29_group UNIQUE (community_id, nip29_group_id) WHERE nip29_group_id IS NOT NULL` (:102-103); `idx_channels_dm_hash UNIQUE (community_id, participant_hash) WHERE participant_hash IS NOT NULL` (:104-105); `idx_channels_community_type` (:106); `idx_channels_community_visibility` (:107); `idx_channels_created_by` (:108); `idx_channels_ttl_expiry ON (ttl_deadline) WHERE ttl_seconds IS NOT NULL AND archived_at IS NULL AND deleted_at IS NULL` (:109-110); `idx_channels_id_live ON (id) INCLUDE (community_id) WHERE deleted_at IS NULL` added by 0027 to cover tenant-independent id→community lookups (`migrations/0027_channels_id_lookup_index.sql:56-58`, rationale :11-25)
- Trigger `channels_community_id_immutable` blocks re-tenanting (:115-127)

**`channel_members`** (`migrations/0001_initial_schema.sql:132-148`)
- Columns: `community_id`, `channel_id`, `pubkey BYTEA`, `role member_role DEFAULT 'member'`, `joined_at`, `invited_by BYTEA`, `removed_at`, `removed_by BYTEA`, `hidden_at` (:133-141)
- PK `(community_id, channel_id, pubkey)`; FK → channels composite ON DELETE CASCADE (:142-144); index `idx_channel_members_pubkey (community_id, pubkey) WHERE removed_at IS NULL` (:147-148)

**`users`** (`migrations/0001_initial_schema.sql:154-181`)
- PK `(community_id, pubkey)`; CHECK pubkey length = 32 (:170-171)
- Columns: `community_id`, `pubkey BYTEA`, `nip05_handle VARCHAR(255)`, `display_name VARCHAR(255)`, `avatar_url TEXT`, `about TEXT`, `agent_type VARCHAR(255)`, `capabilities JSONB`, `okta_user_id VARCHAR(255)`, `created_at`, `updated_at`, `deactivated_at TIMESTAMPTZ`, `metadata_event_id BYTEA`, **`agent_owner_pubkey BYTEA`** (self-FK to users in same community, ON DELETE SET NULL — the agent-to-owner binding), **`channel_add_policy channel_add_policy NOT NULL DEFAULT 'anyone'`** (:155-169, agent FK :172-174)
- Indexes: `idx_users_nip05 UNIQUE (community_id, lower(nip05_handle)) WHERE nip05_handle IS NOT NULL` (:178-179); `idx_users_okta UNIQUE (community_id, okta_user_id) WHERE okta_user_id IS NOT NULL` (:180-181)

**`events`** — partitioned monthly by `created_at` (`migrations/0001_initial_schema.sql:190-278`)
- PK `(community_id, created_at, id)`; `PARTITION BY RANGE (created_at)` (:234-235)
- Columns: `community_id`, `id BYTEA`, `pubkey BYTEA`, `created_at TIMESTAMPTZ`, `kind INT`, `tags JSONB`, `content TEXT`, `search_tsv TSVECTOR GENERATED ALWAYS AS (...) STORED` with privacy-kind exclusion (NULL tsvector makes rows storage-level unsearchable) initially excluding kinds 1059/30300/30622/44100/44101 (:222-226, rationale :198-221), `sig BYTEA`, `received_at TIMESTAMPTZ`, `channel_id UUID`, `deleted_at TIMESTAMPTZ`, `d_tag TEXT`, `not_before BIGINT`, `delivered_at BIGINT` (:191-233)
- Partitions seeded: `events_p_past`, `events_p2026_01..06`, `events_p_future` (:237-252); runtime partition manager creates future months on startup/cron (`crates/buzz-db/src/partition.rs:12-56`, DDL template :126)
- Indexes: `idx_events_community_id (community_id, id, created_at DESC)` — direct id lookup because PK can't serve `WHERE id=$1` (:254-257); `idx_events_community_channel_created` (:259-260); `idx_events_community_pubkey_kind_created` (:261-262); `idx_events_community_kind_created` (:263-264); `idx_events_community_deleted` (:265); addressable/replaceable lookup `idx_events_addressable` (:267-268); parameterized NIP-33 `idx_events_parameterized ... WHERE d_tag IS NOT NULL AND deleted_at IS NULL` (:269-271); delayed-delivery `idx_events_not_before` (:272-273); FTS `idx_events_search_tsv USING GIN (search_tsv)` (:278)
- Later index/column changes: tags GIN `idx_events_tags_gin USING GIN (tags jsonb_path_ops)` for e-tag containment fan-out (0004, `migrations/0004_events_tags_gin.sql:21`, perf rationale :1-17); search_tsv rebuilt to also exclude kind 44200 NIP-AM encrypted agent turn metrics (0005, `migrations/0005_agent_turn_metric_fts.sql:25-30`); fresh-install positive allowlist kinds 0/9/40002/45001/45003 (0008, `migrations/0008_fresh_install_search_allowlist.sql:13-22`); kind 30350 push lease ciphertext excluded by capturing + wrapping existing expression (0014, `migrations/0014_push_lease_fts.sql:11-33`)

**`event_mentions`** (`migrations/0001_initial_schema.sql:286-299`)
- Columns: `community_id`, `pubkey_hex VARCHAR(64)`, `event_id BYTEA`, `event_created_at TIMESTAMPTZ`, `channel_id UUID`, `event_kind INT`; PK `(community_id, pubkey_hex, event_id)` (:287-293). Joins to events MUST carry community tuple or mentions leak cross-community (:280-284)
- Indexes: `idx_event_mentions_pubkey_created` (:296-297); `idx_event_mentions_pubkey_kind_created` (:298-299); defensive cleanup `idx_event_mentions_community_event` (0007, `migrations/0007_nip_rs_retention.sql:26-27`)

**`subscriptions`** (`migrations/0001_initial_schema.sql:304-323`)
- Columns: `community_id`, `id VARCHAR(255)`, `owner_pubkey BYTEA`, filter JSONB columns `filter_kinds/filter_authors/filter_channel_ids`, `filter_since/filter_until TIMESTAMPTZ`, `delivery_method delivery_method DEFAULT 'webhook'`, `delivery_url TEXT`, `status subscription_status DEFAULT 'active'`, `pause_reason pause_reason`, counters `delivered_count/error_count BIGINT`, timestamps (:305-320); PK `(community_id, id)`; FK to users (:321-322)
- NOTE: no application INSERT/SELECT exists against this table in current code — subscriptions actually run in-memory in `crates/buzz-relay/src/subscription.rs:15-92`; the table survives only as a write-fence target in 0029 (`migrations/0029_community_deletion.sql:570`)

**`delivery_log`** — partitioned monthly by `delivered_at` (`migrations/0001_initial_schema.sql:329-356`)
- Columns: `community_id`, `id BIGINT IDENTITY`, `subscription_id VARCHAR(255)`, `event_id BYTEA`, `method delivery_method`, `delivered_at TIMESTAMPTZ`, `success BOOLEAN`, `http_status INT`, `error_message TEXT`, `attempt_number INT DEFAULT 1`; PK `(delivered_at, id)` (:330-340)
- Partitions `delivery_log_p_past/p2026_03..06/future` (:343-354); index `idx_delivery_log_community_sub` (:356). No application writes found (audit-only surface; see §B coverage note).

### A.3 Workflow tables — AGENT/TASK-CRITICAL

**`workflows`** (`migrations/0001_initial_schema.sql:362-382`)
- Columns: `community_id`, `id UUID`, `name VARCHAR(255)`, `owner_pubkey BYTEA`, `channel_id UUID`, `definition JSONB NOT NULL` (YAML-as-code definition document), `definition_hash BYTEA`, `status workflow_status DEFAULT 'active'`, `enabled BOOLEAN DEFAULT TRUE`, `created_at`, `updated_at` (:363-373); PK `(community_id, id)`; FKs to users and channels composite (:374-376)
- Indexes: `idx_workflows_channel_active (community_id, channel_id, status, enabled)` (:379); scheduler scan `idx_workflows_enabled (enabled, status) WHERE enabled` (:380-382)

**`workflow_runs`** (`migrations/0001_initial_schema.sql:386-405`)
- Columns: `community_id`, `id UUID`, `workflow_id UUID`, `status run_status DEFAULT 'pending'`, `trigger_event_id BYTEA`, `current_step INT DEFAULT 0`, `execution_trace JSONB NOT NULL DEFAULT '[]'`, `trigger_context JSONB` (serialized TriggerContext for post-approval resume), `started_at`, `completed_at`, `error_message TEXT`, `created_at`; later adds `error_code TEXT` (0031, `migrations/0031_workflow_run_error_codes.sql:5`, backfill `'legacy_unclassified'` for failed/cancelled :7-10)
- PK `(community_id, id)`; FK → workflows ON DELETE CASCADE (:399-401); indexes `idx_workflow_runs_workflow`, `idx_workflow_runs_status` (:404-405)

**`workflow_approvals`** (`migrations/0001_initial_schema.sql:411-435`)
- Columns: `community_id`, `token BYTEA` (stored SHA-256 hashed — `crates/buzz-db/src/workflow.rs:33`), `workflow_id UUID`, `run_id UUID`, `step_id VARCHAR(64)`, `step_index INT`, `approver_spec TEXT`, `status approval_status DEFAULT 'pending'`, `approver_pubkey BYTEA`, `note TEXT`, `granted_at/denied_at TIMESTAMPTZ`, `expires_at TIMESTAMPTZ NOT NULL`, `created_at`
- PK `(community_id, token)` — token-hash lookups scoped so an approval token cannot act cross-community (:408-426); both FKs CASCADE (:427-430); indexes on workflow/run/status (:433-435)

**`scheduled_workflow_fires`** (`migrations/0001_initial_schema.sql:451-466`)
- At-most-once cron claim: PK `(community_id, workflow_id, scheduled_for)`; only the pod winning the claim INSERT creates the run (:437-445). Columns: `community_id`, `workflow_id UUID`, `scheduled_for TIMESTAMPTZ`, `claimed_at TIMESTAMPTZ DEFAULT NOW()`, `workflow_run_id UUID` (FK NO ACTION — SET NULL unimplementable under composite NOT NULL key, guardrail comment :446-449); janitor prune index `(claimed_at)` (:466)

### A.4 Remaining relay tables from 0001

**`api_tokens`** (`migrations/0001_initial_schema.sql:472-491`): `community_id`, `id UUID`, `token_hash BYTEA` (CHECK len=32 :488), `owner_pubkey`, `name`, `scopes JSONB`, `channel_ids JSONB`, `created_at`, `expires_at`, `last_used_at`, `revoked_at`, `revoked_by`, `created_by_self_mint BOOLEAN DEFAULT FALSE` (self-mint quota flag :485); PK `(community_id, id)`; UNIQUE `(community_id, token_hash)` (:491)

**`rate_limit_violations`** (`migrations/0001_initial_schema.sql:498-507`): operator-global abuse table; `id BIGINT IDENTITY PK`, nullable `community_id/pubkey` attribution only, `violation_at`, `limit_type VARCHAR(64)`, `limit_value/actual_value INT`, `action_taken VARCHAR(64)`

**`thread_metadata`** (`migrations/0001_initial_schema.sql:512-534`): materialized thread tree — `community_id`, `event_created_at TIMESTAMPTZ`, `event_id BYTEA`, `channel_id UUID`, `parent_event_id/parent_event_created_at`, `root_event_id/root_event_created_at`, `depth INT`, `reply_count INT`, `descendant_count INT`, `last_reply_at`, `broadcast BOOLEAN`; PK `(community_id, event_created_at, event_id)`; indexes parent (:530), root (:531), `(community_id, channel_id, depth, event_created_at)` (:532-533), event_id (:534)

**`reactions`** (`migrations/0001_initial_schema.sql:539-555`): `community_id`, `event_created_at`, `event_id`, `pubkey`, `emoji VARCHAR(64)` → widened to `VARCHAR(66)` for wrapped custom-emoji shortcodes (0028, `migrations/0028_long_reaction_payloads.sql:2`), `created_at`, `removed_at`, `reaction_event_id BYTEA`; PK `(community_id, event_created_at, event_id, pubkey, emoji)`; indexes event (:551), pubkey (:552), UNIQUE source-event partial (:554-555)

**`pubkey_allowlist`** (`migrations/0001_initial_schema.sql:561-568`): `community_id`, `pubkey BYTEA`, `added_by`, `added_at`, `note`; PK `(community_id, pubkey)`

**`relay_members`** (NIP-43, `migrations/0001_initial_schema.sql:574-584`): `community_id`, `pubkey TEXT` (hex wire form), `role TEXT CHECK ('owner','admin','member')`, `added_by TEXT`, `created_at/updated_at`; PK `(community_id, pubkey)`; index role (:584)

**`archived_identities`** (NIP-IA, `migrations/0001_initial_schema.sql:589-599`): `community_id`, `pubkey TEXT`, `consent_path TEXT CHECK ('self','owner','admin')`, `actor TEXT`, `reason TEXT`, `replaced_by TEXT`, `request_event_id TEXT`, `archived_at`; PK `(community_id, pubkey)`

**`audit_log`** (`migrations/0001_initial_schema.sql:606-619`): per-community hash chain — `community_id`, `seq BIGINT`, `hash BYTEA`, `prev_hash BYTEA`, `action VARCHAR(64)`, `actor_pubkey BYTEA`, `object_id TEXT`, `detail JSONB`, `created_at`; PK `(community_id, seq)`; UNIQUE hash (:619)

**`_operator_global_tables`** (`migrations/0001_initial_schema.sql:628-636`): lint registry `table_name TEXT PK`, `reason TEXT NOT NULL`; grows across migrations (0015 six rows :68-74; 0026 replica_heartbeat :37-39; 0029 seven rows :263-270)

### A.5 Migration chain 0002–0031 (order + effect)

Applied in filename order by sqlx on relay startup (`migrations/` directory listing; runner mechanics below). Checksums are frozen — brownfield DBs abort startup with sqlx VersionMismatch if any applied file changes (`migrations/0002_git_repo_names.sql:9-12`, echoed `crates/buzz-db/src/migration.rs:654-655`).

| # | File | Effect |
|---|---|---|
| 0001 | `0001_initial_schema.sql` | Full multi-tenant rewrite: all §A.2–A.4 tables, enums, partitions, triggers |
| 0002 | `0002_git_repo_names.sql:20-29` | `git_repo_names (community_id, repo_id TEXT, owner_pubkey TEXT, created_at)`; PK `(community_id, repo_id)` enforces per-community repo-name uniqueness atomically (stateless-relay design :1-18); quota index `(community_id, owner_pubkey)` :29 |
| 0003 | `0003_community_icon.sql:12` | `communities.icon TEXT` (NIP-11 icon via kind:9033) |
| 0004 | `0004_events_tags_gin.sql:21` | GIN `(tags jsonb_path_ops)` on events — e-tag containment hops ~900ms→indexed |
| 0005 | `0005_agent_turn_metric_fts.sql:25-30` | Rebuild search_tsv excluding kind 44200 (NIP-AM encrypted agent metrics) |
| 0006 | `0006_moderation.sql:15-130` | `moderation_reports` (:15-50, one-row-per-kind:1984 report, exactly-one-target-class CHECK :42-46, status open/resolved/dismissed/escalated :32-33, indexes :53-64), `community_bans` (:72-87, ban vs timeout columns banned/ban_expires_at/ban_reason/muted_until/mute_reason), `moderation_actions` (:94-124, action enum list :98-102, public/private reason split :106-111, matched_principal :114); FK reports.action_id→actions (:128-130) |
| 0007 | `0007_nip_rs_retention.sql:14-22` | `parameterized_event_watermarks (community_id, kind INT, pubkey BYTEA, d_tag TEXT, created_at, event_id)` PK `(community_id, kind, pubkey, d_tag)`; seeds high-water marks then purges superseded kind:30078 read-state payload history (:69-140); mention cleanup index :26-27 |
| 0008 | `0008_fresh_install_search_allowlist.sql:13-22` | Empty DBs get positive FTS allowlist (kinds 0,9,40002,45001,45003) |
| 0009 | `0009_nip_rs_database_guards.sql:70-135` | Triggers: watermark advance-or-reject on NIP-RS inserts (:70-72), physical purge of soft-deleted NIP-RS (:104-106), mention-live guard (:133-135) |
| 0010 | `0010_nip_rs_exact_replay_guard.sql:4-55` | Replaces watermark trigger fn: exact replay = durable coordinate-level no-op |
| 0011 | `0011_nip_rs_exact_tag_cardinality.sql:62-121` | Exact d-tag cardinality matching in guards; polluted-watermark cleanup :7-38; hard-delete opt-in guard :45-60 |
| 0012 | `0012_push_leases.sql:3-52` | `push_leases (community_id, author BYTEA, installation_id TEXT, source_event_id, source_created_at BIGINT, generation BIGINT, active BOOLEAN, app_profile, endpoint_hash, endpoint_grant, max_class CHECK silent/default/time_sensitive/urgent, subscriptions JSONB, expires_at BIGINT, updated_at)` PK `(community_id, author, installation_id)`, active-state XOR CHECK :20-21, endpoint uniqueness partial idx :23-25, expiry idx :26; `push_wake_outbox (community_id, id UUID, author, installation_id, lease_generation, endpoint_hash, event_id, class, expires_at, state pending/sending/delivered/failed, attempts, next_attempt_at, lease_until, claim_id)` PK `(community_id,id)`, UNIQUE `(community_id, endpoint_hash, event_id)` :47, due/recovery partial indexes :49-52 |
| 0013 | `0013_push_endpoint_state.sql:3-4` | `push_leases.endpoint_enabled BOOLEAN NOT NULL DEFAULT true` (generation-scoped transport invalidation) |
| 0014 | `0014_push_lease_fts.sql:28-33` | Exclude kind 30350 lease ciphertext from search_tsv preserving prior expression |
| 0015 | `0015_push_gateway_authority.sql:4-74` | Six deployment-global gateway tables (mirror of push-gateway crate migration; see §C) |
| 0016 | `0016_community_archival.sql:3` | `communities.archived_at TIMESTAMPTZ` |
| 0017 | `0017_product_feedback.sql:5-24` | `product_feedback (id UUID PK, community_id, event_id BYTEA UNIQUE, submitter_pubkey, category CHECK bug/praise/needs-work, body TEXT nonempty, tags JSONB array, event_created_at, received_at)` + received/community-received indexes; operator-global provenance-only :23-24 |
| 0018 | `0018_push_match_queue.sql:5-38` | `push_match_queue (community_id, event_id BYTEA, state pending/matching, attempts, next_attempt_at, lease_until, claim_id, created_at)` PK `(community_id, event_id)`; due/recovery partial indexes :16-19; events AFTER INSERT trigger enqueues kinds (7, 9, 1059, 40007, 46010) :21-38 |
| 0019 | `0019_mesh_status_retention.sql:15-43` | Purge superseded kind:30003 mesh-status history + soft-delete purge trigger :41-43 |
| 0020 | `0020_join_policy_acceptances.sql:4-12` | `join_policy_acceptances (community_id, pubkey TEXT, policy_version TEXT len=64, accepted_at)` PK triple; FK → relay_members ON DELETE CASCADE |
| 0021 | `0021_created_at_fence_floor.sql:44-74` | Constraint trigger `events_created_at_floor`: replica-fence floor via `buzz.created_at_floor` GUC; deferrable, cloned onto partitions (:38-42); channel_id-NULL rows exempt :19-22 |
| 0022 | `0022_event_ttl_refresh.sql:6-40` | Deferred constraint trigger refreshes `channels.ttl_deadline` on durable channel-scoped event insert |
| 0023 | `0023_push_match_gate.sql:22-43` | Push-gate skip: enqueue only when an active enabled unexpired push lease exists; shared/exclusive advisory-lock protocol closes lost-wake race (:9-21) |
| 0024 | `0024_event_ttl_refresh_shared_lock.sql:25-58` | Replaces 0022 FOR UPDATE serialization with per-channel advisory shared lock (hot-path fix, live measurement :1-6) |
| 0025 | `0025_relay_invites.sql:18-33` | `relay_invites (community_id, id UUID, token_hash BYTEA len32, role TEXT pinned 'member', max_uses INT 1..10000 nullable=unlimited, use_count, expires_at, created_by, created_at)` PK `(community_id,id)`, UNIQUE `(community_id,token_hash)`, use-limit CHECK :30; expiry index :33 |
| 0026 | `0026_replica_heartbeat.sql:29-39` | Single-row `replica_heartbeat (id smallint CHECK id=1, epoch uuid, token bigint)` — Aurora-portable read-side freshness token; registered operator-global :37-39 |
| 0027 | `0027_channels_id_lookup_index.sql:56-58` | Covering `idx_channels_id_live` (see A.2 channels) |
| 0028 | `0028_long_reaction_payloads.sql:2` | `reactions.emoji VARCHAR(64)` → `VARCHAR(66)` |
| 0029 | `0029_community_deletion.sql` | Whole-community deletion control plane: communities deletion columns :12-17; `community_deletion_requests` :19-66 (stage machine submitted→…→retention_pending :23-27, leases/generations/attempts/retry :37-47, runnable+lease partial indexes :59-66); `community_deletion_approvals` :68-78 bound to frozen inventory digest; immutability triggers retargeting/approval-removal :83-133; `community_deletion_checkpoints` :135-151; `community_deletion_manifest_keys` chunked frozen destructive key lists :159-220; `storage_taxonomy_sweeps` :225-236; `community_serving_write_leases` :238-251; `community_deletion_executor_heartbeats` :253-261; universal write fence `enforce_community_write_fence` attached to every community_id table :520-575; `community_write_allowed()` admission fn :299-320 |
| 0030 | `0030_community_deletion_recovery.sql:7-48` | Adds aborted stage + abort columns to requests (:15-22); partial unique one-active-request-per-community index :27-29; product_feedback community_id nullable ON DELETE SET NULL (:31-34); product_feedback/rate_limit_violations excluded from fence :38-48 |
| 0031 | `0031_workflow_run_error_codes.sql:5-10` | `workflow_runs.error_code TEXT` + backfill `'legacy_unclassified'` |

### A.6 Desired-state schema + runner mechanics

- `schema/schema.sql` is the consolidated desired-state schema used for fresh installs and asserted by tests (`schema/schema.sql:1-22` header identical contract; test asserts `include_str!("../../../schema/schema.sql")` contains each later table — `crates/buzz-db/src/migration.rs:967`, join_policy :969, idx_channels_id_live :994, emoji VARCHAR(66) :1002, retry_stage CHECK :1032). It carries the same CREATE TABLE sequence with additions folded in (e.g. `join_policy_acceptances` :593, `relay_invites` :608, `product_feedback` :822, `push_leases` :842, `push_wake_outbox` :868, `push_match_queue` :897, gateway tables :1038+).
- Runner: `run_migrations(pool)` at `crates/buzz-db/src/migration.rs:27`; serialized cluster-wide via `pg_advisory_lock($1)` / unlock wrapper (:70, :75); post-run lints assert every migration's content (`ConstraintLint` :170; per-table assertions at :634, :639, :643, :647, :661, :696, :700, :704, :722, :802, :806, :834, :858, :873, :898, :953, :981, :1007-1011); checksum immutability rule documented :654-655, :758.
- Partition manager allowlist prevents DDL injection: `PARTITIONED_TABLES = ["events", "delivery_log"]` (`crates/buzz-db/src/partition.rs:11-12`); `ensure_future_partitions` pre-creates months ahead (:15-56); partition DDL emitted at :126.

---

## B. Main queries per relay table (file:line)

Primary DAL is `crates/buzz-db/src/` — one module per domain; callers live in `crates/buzz-relay/src/`, `crates/buzz-workflow/src/`. All paths relative to `_sources/buzz/`.

### B.1 workflows / workflow_runs / workflow_approvals / scheduled_workflow_fires (AGENT/TASK-CRITICAL)

DAL: `crates/buzz-db/src/workflow.rs` (production 1–1268).

workflows:
- `workflow.rs:292` INSERT full row (`create_workflow`, starts 'active'/enabled TRUE)
- `workflow.rs:328-376` upsert `ON CONFLICT (community_id, id) DO UPDATE ... WHERE workflows.owner_pubkey = EXCLUDED.owner_pubkey ... RETURNING id` — NIP-33 LWW + owner/channel overwrite guard (`upsert_workflow`, the event-ingest creation path)
- `workflow.rs:373-376` get by `(community_id, id)` returning definition + status::text + enabled
- `workflow.rs:404-409` list channel workflows newest-first, LIMIT/OFFSET
- `workflow.rs:435-443` `list_enabled_channel_workflows` — trigger-matching path
- `workflow.rs:463-472` global cron scan joins communities, filters `w.definition->'trigger'->>'on' = 'schedule'`, excludes archived/deleted communities (`list_all_enabled_workflows`)
- `workflow.rs:634/:666/:696` update name/definition/hash | status | enabled
- `workflow.rs:729` `disable_workflows_for_owner_in_channel` — SEC-006 auto-disable on membership loss
- `workflow.rs:750/:779` delete (+ owner-guarded variant RETURNING channel_id used by deletion events)
- `workflow.rs:1250-1254` find_by_owner_and_name
- usage stats: `crates/buzz-db/src/usage.rs:182-185` GROUP BY community/status counts

Callers: `crates/buzz-relay/src/handlers/command_executor.rs:769` (get), `:844` (upsert from ingested workflow-definition event), `:911` (pre-manual-run); `crates/buzz-relay/src/handlers/side_effects.rs:74` (disable on removal), `:2118/:2137` (owner-guarded delete on kind-deletion events); `crates/buzz-workflow/src/executor.rs:565`; HTTP `crates/buzz-relay/src/api/workflows.rs:84`; bridge `crates/buzz-relay/src/api/bridge.rs:1901`.

workflow_runs:
- `workflow.rs:812` create as 'pending' with execution_trace '[]' + serialized trigger_context
- `workflow.rs:836-839` get by composite key (full column list incl. error_code after 0031)
- `workflow.rs:868-878` keyset-paged list `(created_at,id) < ($3,$4)` ORDER created_at DESC
- `workflow.rs:932-942` status-transition UPDATE with CASE-guarded started_at/completed_at stamps
- Callers: `command_executor.rs:988` (create on trigger), `:1013` (immediate failure), `:1313/:1384` (approval resume/cancel); API paging `api/workflows.rs:136`; manual runs via `api/bridge.rs:1990/:2005`; scheduler+executor `buzz-workflow/src/lib.rs:407/:669`, `executor.rs:1024/:1086`.

workflow_approvals:
- `workflow.rs:1005` create pending approval (token stored hashed; hash fn at `workflow.rs:33`)
- `workflow.rs:1052-1055` lookup by stored token hash (scoped to community)
- `workflow.rs:1076-1080` all approvals for a run ORDER BY step_index, created_at
- `workflow.rs:1142-1148` TOCTOU-safe grant/deny UPDATE guarded `AND status='pending'`
- Callers: `command_executor.rs:1115/:1156` (approve webhook), `:1226/:1267` (deny); `api/workflows.rs:190`.

scheduled_workflow_fires:
- `workflow.rs:507-512` claim INSERT ... ON CONFLICT DO NOTHING RETURNING — pod-leader election for cron fires
- `workflow.rs:547-549` MAX(scheduled_for) interval anchor (DB-authoritative)
- `workflow.rs:575-580` attach run id post-creation
- `workflow.rs:606-608` retention prune gated by `community_write_allowed(community_id)`
- Callers: scheduler loop `crates/buzz-workflow/src/lib.rs:563/:626/:696`.

Row structs (manual PgRow mappers, no FromRow derive anywhere): `WorkflowRecord` :165, `WorkflowRunRecord` :192, `ScheduledWorkflowFireClaim` :234, `ApprovalRecord` :247; Rust enums mirroring PG enums WorkflowStatus :42 / RunStatus :78 / ApprovalStatus :124.

### B.2 events (+ partitions) and derived tables

- Canonical ingest insert ON CONFLICT DO NOTHING: `crates/buzz-db/src/event.rs:303` and tx-path duplicate `event.rs:1163` (columns community_id, id, pubkey, created_at, kind, tags, content, sig, received_at, channel_id, d_tag, not_before)
- Feed reads with shared column-list const EVENT_COLS at `crates/buzz-db/src/feed.rs:48-53`, queries at feed.rs:96/:181
- NIP-50 FTS: `crates/buzz-search/src/query.rs:244-253` CROSS JOIN LATERAL websearch tsquery over search_tsv, community-scoped, deleted_at IS NULL (shape doc :203-214)
- NIP-09 soft delete: `event.rs:799/:849/:879` UPDATE events SET deleted_at = NOW()
- Counts: `event.rs:658/:670` (QueryBuilder with channel visibility)
- Replay guard under advisory lock in command path: `crates/buzz-relay/src/handlers/command_executor.rs:176-177` SELECT created_at,id; soft-delete :216; tx insert :231
- TTL sweep reads/refresh: `event.rs:1626-1732`; usage stats `usage.rs:117/:273/:315`
- e-tag containment fan-out served by 0004 GIN: perf rationale `migrations/0004_events_tags_gin.sql:2-8`

event_mentions: insert during ingest `crates/buzz-db/src/lib.rs:176`; cleanup on supersede lib.rs:5296; maintenance lib.rs:5901; count use `feed.rs:913`.

thread_metadata: DAL `crates/buzz-db/src/thread.rs` — reply/root inserts ON CONFLICT DO NOTHING (:133-140/:165/:187); counter materialization updates reply_count/descendant_count/last_reply_at (:208-:315; ingest-path twins in event.rs:891/:902/:1191-:1280); thread replies join events carrying community tuple (:400-424); ThreadSummary counters read (:520-523, struct :47); distinct participants (:543-555); recent-threads window ROW_NUMBER() OVER root partition (:754-765); struct ThreadMetadataRecord :84.

reactions: tri-state add/reactivate ADD_REACTION_SQL `crates/buzz-db/src/reaction.rs:66-72` (used :91, tx variant :115); grouped fetch :208; bulk emoji summaries :295-298 (ReactionSummary :49); existence check :384.

subscriptions table: **no application queries** — in-memory registry `crates/buzz-relay/src/subscription.rs:15-92` (SubEntry/SubscriptionScope/SubscriptionRegistry). delivery_log/rate_limit_violations: no application writes found in scanned crates (audit/operator surfaces only; fence attachments only at `migrations/0029_community_deletion.sql:552/:565`).

### B.3 Identity / membership

users (DAL `crates/buzz-db/src/user.rs`, production <401):
- ensure_user INSERT ON CONFLICT DO NOTHING → creation metric :45-47
- profile tuple query_as → UserProfile struct :10 (query :63-77)
- kind:0 absolute-state dynamic UPDATE :144
- NIP-05 exact lookup :176-191; user search LIKE on display/nip05/pubkey-prefix :240-247 (UserSearchProfile :25)
- AGENT ownership: `set_agent_owner` UPDATE guarded `AND agent_owner_pubkey IS NULL` :300; duplicate-set variant :311; policy read `channel_add_policy::text, agent_owner_pubkey` :336; owner assertion :361; set policy enum-cast :386

relay_members (`crates/buzz-db/src/relay_members.rs`, production <609): inserts :132/:158; role gate :290; promote/demote :321/:368/:546; kick/leave DELETE :229/:276; member list :99; allowlist interplay :598.
pubkey_allowlist (`crates/buzz-db/src/lib.rs`): insert :4262, delete :4282, list :4294, checks :4230/:4244.
join_policy_acceptances: acceptance record on join `relay_members.rs:172`; gate SELECT 1 :194; invite-path inserts `relay_invite.rs:273/:330`.
relay_invites (`crates/buzz-db/src/relay_invite.rs`, production <383): mint insert :123; revoke/delete :175-177; redemption lookup by token hash FOR UPDATE :223; use_count increment :357; reaper `reap_expired_relay_invites` :173.
archived_identities (`crates/buzz-db/src/archived_identities.rs`, <127): exists :36, archive insert :61, unarchive :85, list :101; handler probes `crates/buzz-relay/src/handlers/identity_archive.rs:520/:617/:710`.

### B.4 Communities / channels

communities (`crates/buzz-db/src/lib.rs`): provisioning upsert RETURNING xmax=0-created flag :1456-1461; liveness gate EXISTS archived_at IS NULL AND deleted_at IS NULL AND deletion_state='active' :1296; host→community resolve :1313; settings :1432; icon/state updates :1585/:1620; listing/detail :1269/:1339/:1408. Deletion state machine transitions quiescing/fenced/tombstone/restore with FOR UPDATE fencing: `crates/buzz-db/src/deletion.rs:1148/:1212/:1619/:1933`.
channels / channel_members (`crates/buzz-db/src/channel.rs`, production <1533): insert + creator auto-join :115/:133; LWW upsert :208; canvas read/write :304/:322; member ops :508/:527/:842/:1018/:1431/:1454; dynamic update :1219; topic :1279; purpose :1303; archive/unarchive :1349/:1389; soft delete :1414; TTL/archival join :1505. DMs reuse both tables: `dm.rs:168/:185` insert pair, lookups :78/:139, membership checks :311/:462. Channel TTL refresh triggers: `migrations/0022_event_ttl_refresh.sql:6-40`, replaced by advisory-lock version `0024_event_ttl_refresh_shared_lock.sql:25-58`.

### B.5 Ops / infra

api_tokens (`crates/buzz-db/src/api_token.rs`, <327): insert :40-42; race-free self-mint quota insert :96-105; auth lookups by token hash :153/:217; mirrored checks `lib.rs:3660/:3721`.
audit_log (`crates/buzz-audit/src/service.rs`, <271): chain head :100; append next link :137; verify/list traversal :179/:235.
git_repo_names (`crates/buzz-db/src/git_repo.rs`, <182): claim :92; ownership checks :53/:110; quota count :148; release/delete :171.
parameterized_event_watermarks: advance-upsert on NIP-RS ingest `lib.rs:5342` + DB trigger guard `migrations/0011_nip_rs_exact_tag_cardinality.sql:62-121`; replay check `lib.rs:5234`.
replica_heartbeat: fence-token bump `UPDATE replica_heartbeat SET token = token + 1 WHERE id = 1 RETURNING token, epoch` `crates/buzz-db/src/replica_fence.rs:621`; epoch rotation :675; reads :744/:749.
push pipeline (`crates/buzz-db/src/push.rs`, production <1264): match queue enqueue-from-event :54; SKIP LOCKED-style claim loop :851-870; retry-cap cleanup :909/:936; ack delete :982; leases lookup/generation check/disable/multi-install/create/candidate-scan/kill-switch :249/:265/:291/:302/:313/:369/:484/:539/:642/:1207; wake outbox insert :708, claim :743, APNs dispatch batch :1034-1098, state transitions :1141/:1162/:1183, orphan purge :1231-1236.
moderation (`crates/buzz-db/src/moderation.rs`, production <630): report insert RETURNING id :185-192 (NewReport :37, ReportRecord :54); open-report lists :250/:273; status update :297; ban/mute upserts :324-332/:381-389; unban/unmute :355/:411; enforcement reads :451/:481/:501 (RestrictionState :432, BanRecord :83); action insert :525-529; audit list :558 (ActionRecord :145).
product_feedback (`crates/buzz-db/src/product_feedback.rs`, <120): insert :66; list :94; event-derived delete :170/:177.

---

## C. Push gateway DB (deployment-global PostgreSQL)

Separate database from the relay core (installations delegate to relay signing keys and may authorize multiple relay deployments — `crates/buzz-push-gateway/migrations/0001_push_gateway_authority.sql:1-3`). The relay-side mirror migration `migrations/0015_push_gateway_authority.sql` creates identical tables in the relay DB; all six are registered operator-global (`0015:68-74`).

Tables (DDL `crates/buzz-push-gateway/migrations/0001_push_gateway_authority.sql`; relay copy `migrations/0015_...sql`):
- `push_gateway_challenges` (:4-10 / 0015:4-10): id UUID PK, challenge_hash BYTEA len32, expires_at, created_at; expiry index.
- `push_gateway_installations` (:12-27): id UUID PK, app_attest_key_id BYTEA UNIQUE, app_attest_public_key BYTEA, assertion_counter BIGINT 0..u32max, app_profile CHECK ('buzz-ios-production','buzz-ios-sandbox'), token_ciphertext BYTEA ≤2048, token_fingerprint BYTEA len32, endpoint_epoch BIGINT >0, expires_at, revoked_at, created_at/updated_at; UNIQUE (app_profile, token_fingerprint); partial expiry index WHERE revoked_at IS NULL.
- `push_gateway_delegations` (:29-42): installation FK → installations, relay_pubkey BYTEA len32, endpoint_epoch, generation BIGINT >0, not_before < expires_at CHECK, UNIQUE (installation_id, relay_pubkey).
- `push_gateway_endpoint_quotas` (:44-50): token_fingerprint PK, window_started_at, admitted BIGINT ≥0, updated_at.
- `push_gateway_delivery_auth_replays` (:52-58): replay admission keyed (relay_pubkey, auth_event_id).
- `push_gateway_delivery_request_replays` (:60-66): keyed (relay_pubkey, request_id UUID).

Runtime guards: forbidden-DDL probe and table-presence checks in `crates/buzz-push-gateway/src/postgres.rs:472`, :523-532, :627-665. Gateway query call-sites: challenges :123; installations/delegations :148/:181/:200/:219; quotas + replay guards :326-333.

---

## D. Desktop SQLite stores (rusqlite)

Driver: rusqlite 0.37 bundled (`desktop/src-tauri/Cargo.toml:140`). All DBs use WAL + busy_timeout 5000.

### D.1 Archive DB `<nest>/archive/archive.db`

Opened via `store::open_archive_db` (`desktop/src-tauri/src/archive/mod.rs:45-49`); schema constant at `archive/store.rs:20-141`; init :150-169 (WAL retry loop :171-182).

**archived_events** (`store.rs:21-31`) — canonical raw-event store
- Columns: identity_pubkey TEXT NOT NULL, relay_url TEXT NOT NULL, id TEXT NOT NULL, kind INTEGER NOT NULL, pubkey TEXT NOT NULL, created_at INTEGER NOT NULL, raw_json TEXT NOT NULL, archived_at INTEGER NOT NULL; PK (identity_pubkey, relay_url, id)
- Partial index `idx_archived_events_agent_metric ... WHERE kind = 44200` (backfill anti-join source) `store.rs:124-126`
- Writes: upsert ON CONFLICT DO NOTHING (`store.rs:514-544`); GC anti-join delete `store.rs:854-882`
- Reads: keyset-paged scoped read joining scopes (`store.rs:598-689`); unindexed observer rows :729-767

**archived_event_scopes** (`store.rs:33-41`) — N-scope membership per event
- Columns: identity/relay/id + scope_type TEXT + scope_value TEXT + archived_at; PK five-column composite
- Scope types enum { channel_h, owner_p, referenced_e } (`archive/mod.rs:81-99`)
- Writes `store.rs:550-575`; joined reads inside read paths `store.rs:643-657/:736-751`

**save_subscriptions** (`store.rs:43-51`) — which scopes the user archives
- Columns: identity/relay + scope_type/scope_value + kinds TEXT (JSON int array) + created_at; PK (identity, relay, scope_type, scope_value)
- Atomic kind-union under BEGIN IMMEDIATE `store.rs:329-392`; atomic kind-removal with row deletion on empty `store.rs:408-479`; CRUD :210-268/:272-290/:294-313/:483-503

**observer_channel_index** (`store.rs:64-73`) — kind-24200 processing status
- Columns: identity/relay/id + nullable channel_id (NULL = examined-but-unattributable, design comment :53-63) + created_at
- Index idx_observer_channel (…, channel_id, created_at DESC, id DESC) :72-73; INSERT OR IGNORE write :703-719; joined read :776-840

**agent_metric_index** (`store.rs:81-140`) — AGENT-CRITICAL: parsed NIP-AM kind-44200 agent turn metrics
- Columns: key/context (identity_pubkey, relay_url, id, agent_pubkey, event_created_at, archived_at); session (reported_at, session_id, turn_seq as 20-digit zero-padded sortable TEXT because SQLite INTEGER is signed i64, harness, model, delta_reliable); turn tokens/cost (turn_input/output/total_tokens TEXT, turn_cost_usd REAL, turn_cache_read/write_tokens TEXT); cumulative mirrors; pricing identity (pricing_authority/model/cache_class); parse_status CHECK IN ('valid','invalid')
- Indexes: session probe `(…, agent_pubkey, session_id, turn_seq, id)` :130-131; reported-window :134-135; created+parse_status :139-140
- Parser/codec: AgentMetricIndexRow.from_payload `archive/metric_store.rs:75-105/:125-181`; u64 sortable codec :28-40
- Writes: 28-param insert ON CONFLICT DO NOTHING `metric_store.rs:293-360` (only when archived row newly inserted, doc :287-289); restartable chunked backfill 500/tx :374-438; GC cascade :446-465 (called from store.rs:877); read-time orphan repair :472-478
- Reads consumed by usage accounting: load_window_valid_rows :485-509; count_invalid_rows_in_window :515-532; exact-key probes :544-596; evidence probe :602-619

**archive_migrations** (`store.rs:76-79`) — name-ledger migrations (name TEXT PK, applied_at). Runner order M2→M3→M1 (`archive/store_migrations.rs:21-25`): M1 add_harness_to_metric_index (PRAGMA check :62-72, ALTER ADD COLUMN harness :74, full DELETE+rebuild of metric index from raw_json :97-108); M2 cache-read token columns :222-243; M3 cache-write + pricing columns :295-319.

### D.2 Retention DBs — one per (relay_url, owner_pubkey): AGENT/PERSONA-CRITICAL

Path derivation hashes normalized relay URL + lowercased owner pubkey (`managed_agents/retention.rs:59-67`); scope resolution :73-89/:98-107; open :126-148.

**persona_events** (`retention.rs:133-145`) — durable store for ALL NIP-33 replaceable definitions: personas (kind 30175), teams (30176), managed agents (kind 30177), deletions (kind 5 tombstones), NIP-IA archive requests.
- Columns: kind INTEGER, pubkey TEXT (owner), d_tag TEXT (coordinate), content TEXT, created_at INTEGER, raw_event TEXT (full signed JSON), pending_sync INTEGER DEFAULT 0; **PK (kind, pubkey, d_tag) = the NIP-33 coordinate itself**, no secondary indexes
- Tombstone keying folds target kind into d_tag ("\<target_kind\>:\<d_tag\>") so cross-kind slug collisions occupy distinct rows (`retention.rs:183-185`)
- Writes: retain_event LWW-guarded upsert `WHERE excluded.created_at >= persona_events.created_at` :210-233; strictly-newer inbound apply that clears pending_sync :283-316 (preflight :269-281); compare-and-clear mark_synced :394-411; coordinate delete :419-433
- Reads: pending flush ordered tombstones-first oldest-first `ORDER BY (kind != 5), created_at ASC` :359-385; single lookup :447-472; deferral predicate :197-205
- Callers: publish loop `managed_agents/persona_events.rs:242-352` (re-read before publish :296-305, mark synced :339-347); boot reconcile `managed_agents/reconcile.rs:35/:69/:125-166` (monotonic created_at bump :141-143); legacy personas/teams→events migration `event_sync.rs:76/:103/:156` and `:234/:261/:296`; agent tombstone path `commands/agents_pending.rs:73-95` (delete live row then retain kind:5 tombstone pending_sync=true)

**retention_migrations** (`managed_agents/retention/legacy_migration.rs:156-164`): name TEXT PK + scope_id TEXT; one-time legacy global `retention.db` → per-scope DB migration claim/copy (:54-109; legacy path :43-45; claim INSERT OR IGNORE :190-209; transactional copy ON CONFLICT DO NOTHING + marker :78-106).

### D.3 Legacy WebKit localStorage (read-only)

`ItemTable` is WebKit's schema, not buzz's — opened READ_ONLY (`commands/legacy_storage.rs:100-104`; reference schema recreated in test :252: key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB). Reads sprout-workspaces keys for workspace seeding (:11-13 constants, query :106-118, UTF-16LE decode :78-97, discovery walk :63-76).

### D.4 Boot-time JSON migrations (NOT SQLite)

`desktop/src-tauri/src/migration/*.rs` migrate JSON record stores under AppData/agents/ — no rusqlite import anywhere in the module (verified by grep): backfill standalone-agent definitions (backfill.rs:34-51), materialize runtime from persona (materialize.rs:24-64), fold personas.json into managed-agents.json (fold.rs:22-57), Pollen rename (pollen.rs:11-70), team membership repair (team_membership.rs:48-56), pack instructions detach (detach.rs:32-60), team-suffix strip (team_suffix.rs:39-60); orchestrator also reconciles command names/provider MCP/Databricks v1→v2 (migration.rs:1188/:1218/:1317).

Complete rusqlite production inventory (every importing file): `archive/store.rs:13`, `archive/store_migrations.rs:10`, `archive/metric_store.rs:14`, `archive/mod.rs:29`, `archive/pipeline.rs:13`, `managed_agents/retention.rs:11`, `managed_agents/retention/legacy_migration.rs:35`, `commands/legacy_storage.rs:3`, plus connection consumers `managed_agents/reconcile.rs:126`, `persona_events.rs:258`, `event_sync.rs:156/:296`, `agents_pending.rs:34/:79`. No sqlx, no other embedded DBs in desktop.

---

## E. Tables backing agent / task / workitem concepts (Fabrica CLI-agent-management relevance)

Fabrica's direction is a desktop CLI-agent management & operations platform. The buzz schema surfaces that map onto it:

1. **`users.agent_owner_pubkey` + `users.agent_type`/`capabilities`/`channel_add_policy`** — the relay-side model of "an agent user owned by a human in the same community": self-referencing FK ON DELETE SET NULL (`migrations/0001_initial_schema.sql:172-174`); claim-once owner binding guarded `AND agent_owner_pubkey IS NULL` (`crates/buzz-db/src/user.rs:300`); policy enum read/write :336/:386. This is the closest buzz analog to Fabrica's agent-registry concept.
2. **`workflows` / `workflow_runs` / `workflow_approvals` / `scheduled_workflow_fires`** — the only true task-execution tables in buzz. Full lifecycle: definition JSONB + hash (LWW upsert from signed events), runs with step pointer + execution_trace + resumable trigger_context, hashed-token approvals with TOCTOU-safe grant/deny, at-most-once cron claims via unique insert-election. All cited in §A.3/§B.1. Direct template for Fabrica "task/workitem" persistence: status enums (§A.1 :31-33) already read like a work-item state machine.
3. **Desktop `persona_events` SQLite store** (§D.2) — durable per-(relay,owner) NIP-33 coordinate store for persona/team/**managed-agent definitions with pending_sync outbox semantics** (tombstones-first flush ordering). This is the strongest existing pattern for Fabrica's local-first agent registry with sync.
4. **Desktop `agent_metric_index`** (§D.1) — per-agent-turn usage/cost ledger (session_id, turn_seq, token counts, cost, pricing identity, parse_status). Direct precedent for Fabrica agent-usage accounting/billing views.
5. **Thread/task-like state NOT in SQL**: managed-agent runtime state and team/task records live in JSON files (`managed-agents.json`, `teams.json`) migrated by `desktop/src-tauri/src/migration/*.rs`; sessions exist only as `session_id`/`turn_seq` columns in agent_metric_index (§D.4 note; confirmed by rusqlite inventory). Any Fabrica "sessions/tasks" table would be net-new.
6. **Operational-control patterns worth porting**: universal community write fence with advisory-lock admission (`0029_community_deletion.sql:276-575`), lease/claim queues with SKIP LOCKED-style claiming and partial recovery indexes (`0012_push_leases.sql:49-52`, `0018_push_match_queue.sql:16-19`, `crates/buzz-db/src/push.rs:851-870`), replica fence single-row heartbeat (`0026_replica_heartbeat.sql:29-39`), hash-chained audit log (`0001_initial_schema.sql:606-619`).

---

## Scan coverage statement

**Read directly by this worker (full or targeted):**
- `migrations/0001_initial_schema.sql` — full 636 lines
- `migrations/0002…0031/*.sql` — all files dumped with line numbers and reviewed (0002–0031 complete; 0021 seen from line ~14 onward in dump, header comment lines 1–13 not individually quoted)
- `schema/schema.sql` — header (lines 1–60) verified identical contract to 0001; folded-table line positions grepped (:53–1046)
- `crates/buzz-push-gateway/migrations/0001_push_gateway_authority.sql` — first 30 lines read directly, remainder cross-checked against the byte-equivalent relay mirror `migrations/0015_push_gateway_authority.sql` (read in full)
- `crates/buzz-db/src/partition.rs` — lines 1–60
- `crates/buzz-db/src/migration.rs` — grep-swept for runner/lint/checksum structure (run_migrations :27, advisory lock :70/:75, lint asserts), body not fully re-read line-by-line

**Delegated deep scans (subagents, results merged above with their own file:line verification against `_sources/buzz`):**
- Relay query call-sites across `crates/buzz-db/src/` (25 files), `buzz-relay/src`, `buzz-workflow/src`, `buzz-search/src`, `buzz-push-gateway/src`, `buzz-audit/src`
- Desktop SQLite stores: `archive/store.rs` (891 lines full), `archive/store_migrations.rs` (full), `archive/metric_store.rs` (full), `managed_agents/retention.rs` (976 lines full), `retention/legacy_migration.rs` (full), `commands/legacy_storage.rs` (full), plus headers/key sections of all seven `migration/*.rs` modules

**Skipped / out of scope:**
- Client-facing crates that don't write these DBs: `buzz-cli`, `buzz-admin`, `buzz-sdk`, `buzz-acp`, `buzz-agent`, `buzz-dev-mcp`, `buzz-persona`, `buzz-pair-*`, `buzz-media`, `buzz-voice`, `buzz-mesh`, `sprig`, `buzz-test-client`, `git-*-nostr`
- Frontends: `desktop/src` (React), `web/`, `mobile/` (Flutter) — no SQL
- Test files (`*_tests.rs`, tests under `#[cfg(test)]`, `benchmarks/harbor-buzz-orchestra/testbed/sql/benchmark_schema.sql` benchmark trial/spans/receipts tables — testbed-only)
- `scripts/attach-schema-partitions.sql` (operator partition tooling, referenced via partition.rs)
- Full bodies of very large DAL files beyond statement-level citation: `buzz-db/src/lib.rs` (~6k+ lines), `deletion.rs`, `push.rs`

**Verification hooks for R4-2.x:** every table name in §A can be checked with one grep against `migrations/`+`schema/schema.sql`; every workflow claim in §B.1 against `crates/buzz-db/src/workflow.rs`; desktop claims in §D against the four fully-read store files listed above.

*Report end — ATLAS R4-1.2.*
