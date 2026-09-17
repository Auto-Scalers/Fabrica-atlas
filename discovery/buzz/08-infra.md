# Buzz — Infrastructure (Schema, Migrations, Deploy, Scripts, CI/CD)

> Source: `_sources/buzz/schema/`, `migrations/`, `deploy/`, `scripts/`, `bin/`, `.github/`
> Commit: `8868787`

## Overview

Buzz's infrastructure layer: database schema, migrations, deployment (Docker Compose + Helm), dev tooling scripts, and CI/CD pipelines.

---

## schema/ — Database Schema

**Location:** `schema/schema.sql` (1895 lines)

The canonical schema definition, managed by `pgschema` (declarative schema management). Migrations are generated from diffs against this file.

### Key Tables

| Table | Purpose |
|-------|---------|
| `communities` | Tenant registry (host binding, signing key, icon, archival, deletion) |
| `channels` | Channel records (type, visibility, canvas, topic, community-scoped) |
| `channel_members` | Membership with roles (soft-delete via `removed_at`) |
| `events` | All Nostr events (monthly range-partitioned, `search_tsv` GIN) |
| `workflows` | Workflow definitions (YAML as canonical JSON) |
| `workflow_runs` | Execution records with trigger context |
| `workflow_approvals` | Approval gates (SHA-256 hashed tokens) |
| `audit_log` | Hash-chain audit entries (per-community chain) |
| `delivery_log` | Delivery tracking (partitioned) |
| `event_mentions` | Normalized mention index |
| `relay_operators` | Operator/Moderator roster |
| `relay_admin_actions` | Admin action log |
| `push_leases` | Push notification leases |
| `push_endpoints` | Push endpoint state |
| `nip_fi_identities` | NIP-FI federated identity |
| `nip_fi_authorizations` | NIP-FI authorization grants |

### Custom Types

```sql
channel_type:       stream | forum | dm | workflow
channel_visibility: open | private
member_role:        owner | admin | member | guest | bot
workflow_status:    active | disabled | archived
run_status:         pending | running | waiting_approval | completed | failed | cancelled
approval_status:    pending | granted | denied | expired
```

### Partitioning
- `events` table: monthly range-partitioned
- `delivery_log`: monthly range-partitioned
- Auto-create partitions via cron or `buzz-admin migrate`

---

## migrations/ — Database Migrations

**Location:** `migrations/`

44 migration files (0001-0044), auto-applied on relay startup via `buzz-admin migrate`.

### Key Migrations

| Migration | Purpose |
|-----------|---------|
| `0001_initial_schema.sql` | Base schema |
| `0002_git_repo_names.sql` | Git repo naming |
| `0004_events_tags_gin.sql` | GIN index on event tags |
| `0006_moderation.sql` | Moderation tables |
| `0012-0015` | Push lease/endpoint/gateway system |
| `0016_community_archival.sql` | Community archival |
| `0025_relay_invites.sql` | Invite system |
| `0026_replica_heartbeat.sql` | Replica health |
| `0029-0030` | Community deletion/recovery |
| `0035-0039` | Relay operators, admin actions, leases, audit |
| `0040_push_message_kinds.sql` | Push message types |
| `0041-0042` | NIP-FI identity + authorization foundation |
| `0043_push_gateway_dogfood_profile.sql` | Push gateway profiles |
| `0044_drop_nip_fi_ledger.sql` | Drop NIP-FI ledger |

### Tool
`pgschema` (in `bin/`) — declarative schema management. The `schema.sql` is the source of truth; migrations are generated from diffs.

---

## deploy/ — Deployment

**Location:** `deploy/`

### `deploy/compose/` — Production Docker Compose

| File | Purpose |
|------|---------|
| `compose.yml` | Production: relay + Postgres + Redis + MinIO |
| `compose.caddy.yml` | Caddy reverse proxy + TLS |
| `compose.dev.yml` | Dev overrides |
| `Caddyfile` | Caddy config |
| `.env.example` | Production env template |
| `run.sh` | Production entrypoint |
| `README.md` | Deployment guide |

### `deploy/charts/` — Helm Charts (Kubernetes)

| Chart | Purpose |
|-------|---------|
| `buzz/` | Main relay Helm chart |
| `buzz-push-gateway/` | Push gateway Helm chart |

### Docker Images

| File | Purpose |
|------|---------|
| `Dockerfile` (186 lines) | Multi-stage: cargo-chef, Rust binary, web bundle, debian-slim |
| `Dockerfile.sprig` | Sprig all-in-one harness image |
| `Dockerfile.push-gateway` | Push gateway image |

### Dev Stack (`docker-compose.yml`, 191 lines)
- Postgres 17
- Redis 7
- Adminer (DB UI)
- Keycloak (auth)
- MinIO (S3-compatible storage)
- Prometheus (metrics)

---

## scripts/ — Tooling (82 files)

### Dev Setup
- `dev-setup.sh` — initial dev environment
- `dev-reset.sh` — nuke and recreate
- `seed-local-community.sh` — seed a test community
- `ensure-local-relay-key.sh` — generate dev relay key

### Testing
- `run-tests.sh` — run all tests
- `start-relay-for-tests.sh` — start relay in test mode
- `postgres-test-*.sh` — Postgres-specific tests
- `e2e-*.sh` — end-to-end tests

### Release
- `desktop_release.py` — desktop release automation
- `prepare-desktop-release.sh` — prep release artifacts
- `mobile-release.sh` — mobile release
- `promote-oss-desktop-release.sh` — promote to OSS release
- `publish-mobile-release-candidate.sh` — mobile RC

### CI/CD Gates
- `check-branch-skew.sh` — branch skew detection
- `check-file-sizes-core.mjs` — file size limits
- `check-px-text-core.mjs` — pixel text size
- `check-pubkey-truncation-core.mjs` — pubkey display

### Screenshots
- `post-screenshots.sh` — upload PR screenshots
- `check-pr-image-urls.sh` — validate image URLs

### Schema
- `reconcile-schema-after-pgschema.sql` — post-pgschema reconciliation
- `backfill-d-tag.sql` — backfill d-tags

### Mobile
- `mobile-worktree-overrides.sh` — worktree-aware mobile builds
- `mobile-worktree-clean.sh` — cleanup

### Sprig
- `build-sprig.sh`, `sprig-entrypoint.sh`, `bundle-sidecars.sh`

### Mesh
- `ci-mesh-lifecycle-smoke.sh` — mesh smoke test

---

## bin/ — Hermit-Managed Toolchain

Hermit manages pinned tool versions. Tools auto-download on first use.

| Tool | Version | Purpose |
|------|---------|---------|
| `cargo` | 1.28.2 | Rust build system |
| `rustc` | 1.28.2 | Rust compiler |
| `clippy-driver` | — | Rust linter |
| `rustfmt` | — | Rust formatter |
| `rust-analyzer` | — | Rust IDE support |
| `node` | 24.15.0 | JavaScript runtime |
| `pnpm` | 11.4.0 | Package manager |
| `flutter` | 3.41.7 | Flutter SDK |
| `dart` | — | Dart SDK |
| `just` | 1.46.0 | Task runner |
| `lefthook` | 2.1.3 | Git hooks |
| `biome` | 2.4.7 | JS/TS linter |
| `cmake` | 4.3.1 | Native deps build |
| `pgschema` | 1.7.4 | Postgres schema management |
| `actionlint` | 1.7.12 | GitHub Actions linter |
| `cargo-deny` | 0.19.0 | Dependency auditing |
| `cargo-miri` | — | Rust interpreter |
| `hermit` | — | Toolchain manager |

---

## .github/ — CI/CD (26 workflows)

| Workflow | Purpose |
|----------|---------|
| `ci.yml` | Main CI pipeline |
| `_ci-relay.yml` | Relay CI |
| `_ci-desktop.yml` | Desktop CI |
| `_ci-desktop-macos.yml` | macOS desktop CI |
| `_ci-rust.yml` | Rust CI |
| `_ci-clients.yml` | Client CI |
| `_ci-security.yml` | Security CI |
| `docker.yml` | Docker image build |
| `helm-chart.yml` | Helm chart publish |
| `release.yml` | Release automation |
| `desktop-release-candidate.yml` | Desktop RC |
| `mobile-release-candidate.yml` | Mobile RC |
| `sprig.yml` | Sprig build |
| `sprig-image.yml` | Sprig image |
| `mesh-lifecycle.yml` | Mesh lifecycle tests |
| `codex-security-review.yml` | Codex security review |
| `benchmark-harbor.yml` | Benchmark harbor |
| `promote-oss-desktop-release.yml` | OSS desktop promotion |
| `signed-macos-canary.yml` | Signed macOS canary |
| `linux-canary.yml` | Linux canary |
| `macos-intel-canary.yml` | macOS Intel canary |
| `windows-canary.yml` | Windows canary |
| `push-gateway-helm-chart.yml` | Push gateway Helm |
| `desktop-release-cache-proof.yml` | Desktop release cache proof |
| `auto-tag-on-release-pr-merge.yml` | Auto-tag on merge |
| `staging-dev-relay-image.yml` | Staging/dev relay image |

---

## Scan Coverage

- `schema/schema.sql` (1895 lines) read
- `migrations/` 44 files enumerated, key ones read
- `deploy/compose/` all files enumerated
- `deploy/charts/` 2 charts enumerated
- 3 Dockerfiles read
- `scripts/` 82 files enumerated by category
- `bin/` 18 tools enumerated
- `.github/workflows/` 26 files enumerated
- **Not deeply read:** individual migration SQL bodies, Helm chart templates, workflow YAML internals
