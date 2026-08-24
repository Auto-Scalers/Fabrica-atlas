# R4-1.10 — buzz Ops/Deploy Infrastructure + admin-web (Deep Dive, READ-ONLY)

> Task: ATLAS R4-1.10. Scope: `_sources/buzz/deploy/**`, `crates/buzz-backend-kubernetes`,
> migrations tooling (`migrations/`, `crates/buzz-db/src/migration.rs`, `crates/buzz-admin`),
> `admin-web/**`, Docker/compose files, and the relay's config/env surface.
> All paths relative to `_sources/buzz/` unless prefixed. Every claim carries a file:line cite.
> Worker: ctx_78b8f27a3035 / task_ef9b3351c37a. Date: 2026-08-23.

---

## 0. Executive summary

Buzz ships **three complete deployment paths for its relay** plus a **Kubernetes
compute provider** for remote agents:

1. **Docker Compose single-node/VPS bundle** (`deploy/compose/`) — relay + Postgres +
   Redis + MinIO + optional Caddy TLS edge, bootstrapped by `run.sh` with a strict
   `.env` contract (`deploy/compose/compose.yml:4-142`, `deploy/compose/run.sh:53-133`).
2. **Helm chart** (`deploy/charts/buzz`) — two tiers: eval quickstart (bundled
   in-cluster Postgres/Redis/MinIO) and GitOps-safe production (external services,
   `secrets.existingSecret`), published as `oci://ghcr.io/block/buzz/charts/buzz`
   v0.1.7 (`deploy/charts/buzz/values.yaml:1-17`, `deploy/charts/buzz/Chart.yaml:10`,
   `deploy/charts/buzz/README.md:15-23`).
3. **Local k8s testbed** (`deploy/local/build-and-deploy.sh`) — docker-desktop
   cluster, locally built image, quickstart-HA 3-replica baseline used by mesh work
   (`deploy/local/build-and-deploy.sh:2-6`).

The relay image itself is a multi-stage build producing one binary set
(`buzz-relay` entrypoint, plus `buzz-admin` and `buzz-pair-relay` sidecar binaries)
and two static frontends (`web`, `admin-web`) baked into the same image
(`Dockerfile:70-72`, `Dockerfile:119`, `Dockerfile:145-152`, `Dockerfile:163`).

Migrations are **embedded SQLx migrations** compiled into the relay/admin binaries,
applied at startup only when `BUZZ_AUTO_MIGRATE=true` (opt-in), or on demand via
`buzz-admin migrate`, or via a Helm pre-install Job for the push-gateway chart
(`crates/buzz-db/src/migration.rs:14`, `crates/buzz-relay/src/main.rs:188-198`,
`crates/buzz-admin/src/main.rs:79-80,151-156`,
`deploy/charts/buzz-push-gateway/templates/migration-job.yaml:7-9,26`).

`admin-web` is a tiny React SPA for deployment-wide moderation (reports) and product
feedback triage; it has **no auth of its own** — authorization is host-based: the API
is only served when the request Host matches the configured `BUZZ_ADMIN_HOST`
(`admin-web/package.json:2`, `crates/buzz-relay/src/api/admin/auth.rs:6-33`,
`crates/buzz-relay/src/config.rs:931-957`).

`buzz-backend-kubernetes` is not part of hosting the relay; it is a stdin/stdout JSON
"backend provider" that the desktop calls to launch *agent harness pods* into a user
cluster — relevant to Fabrica as a template for "deploy an agent to Kubernetes"
functionality (`crates/buzz-backend-kubernetes/Cargo.toml:7`,
`crates/buzz-backend-kubernetes/src/main.rs:1-9`).

---

## 1. The relay image (`Dockerfile`, root)

- Published publicly as `ghcr.io/block/buzz:<tag>`; header comment says so explicitly
  (`Dockerfile:3`). Multi-arch via native amd64+arm64 runners running the same
  platform-agnostic Dockerfile (`Dockerfile:10-12`).
- Toolchain pinned by build args: Rust 1.95, Node 24, debian bookworm
  (`Dockerfile:14-16`).
- Corporate-network accommodations are opt-in build args: `EXTRA_CA_CERTS` (TLS-
  intercepting proxy CAs installed into the trust store + `CARGO_HTTP_CAINFO`) and
  `NPM_REGISTRY` mirror (with corepack integrity keys relaxed only on the mirror path)
  (`Dockerfile:18-28`, `Dockerfile:32-40`, `Dockerfile:100-110`).
- Rust stage uses cargo-chef (recipe cached dependency cook), then builds three
  binaries in one invocation: `buzz-relay`, `buzz-admin`, `buzz-pair-relay`
  (`Dockerfile:30-42`, `Dockerfile:66-72`). Stripped variants derived from the same
  ELF files to prevent drift (`Dockerfile:76-79`); debug-info variant published under
  `debug-*` tags (`Dockerfile:165-171`).
- Web stage builds BOTH frontends through pnpm filters: `pnpm -C web build && pnpm -C
  admin-web build` (`Dockerfile:112-119`) — admin-web is compiled into every relay image.
- Runtime: debian-slim with ca-certificates, curl, git, openssl; dedicated system user
  `buzz` uid/gid 1000 (`Dockerfile:134-143`). git is required because the relay shells
  out to git for repo hydrate/receive-pack/upload-pack (`Dockerfile:5-8`).
- Static bundles copied to `/srv/buzz/web` and `/srv/buzz/admin-web`; env defaults set
  so the web UI always serves and the admin bundle is **inert until BUZZ_ADMIN_HOST is
  configured**: `ENV BUZZ_WEB_DIR=/srv/buzz/web BUZZ_ADMIN_WEB_DIR=/srv/buzz/admin-web`
  (`Dockerfile:145-152`).
- Ports exposed: `3000` app (WS+REST), `8080` health (`/_liveness`, `/_readiness`),
  `9102` metrics (`Dockerfile:154-155`).
- `/data/git` pre-created and chowned so the compose volume inherits buzz:buzz
  ownership (`Dockerfile:157-158`); runs as non-root `USER buzz:buzz`; entrypoint is
  the relay binary (`Dockerfile:160-163`).
- Sibling images exist for other components: `Dockerfile.push-gateway` (1.5KB) and
  `Dockerfile.sprig` (the all-in-one agent harness image) (root dir listing;
  `Dockerfile.push-gateway`, `Dockerfile.sprig` present at repo root).
- Production image pipeline lives outside this repo: `squareup/sprout-oss` CI builds
  the relay Docker image and pushes to internal ECR; `squareup/block-coder-tf-stacks`
  deploys via Terraform + ArgoCD to the staging cluster (`AGENTS.md` §Ecosystem table
  and diagram — internal repos referenced from `_sources/buzz/AGENTS.md`).

---

## 2. Compose path — single-node/VPS production bundle (`deploy/compose/`)

### 2.1 Topology (`compose.yml`)

Five services + four named volumes + one bridge network labeled `com.buzz.network:
production` (`deploy/compose/compose.yml:124-142`):

| Service | Image | Key config | Cite |
|---|---|---|---|
| `relay` | `${BUZZ_IMAGE:-ghcr.io/block/buzz:main}` | bind `0.0.0.0:3000`, health 8080, metrics 9102 | compose.yml:5, :9-11 |
| `postgres` | postgres:17-alpine | PGDATA subdirectory; pg_isready healthcheck | :52, :57, :60-65 |
| `redis` | redis:7-alpine | `--appendonly yes --requirepass $REDIS_PASSWORD` | :71-72 |
| `minio` | pinned `RELEASE.2025-09-07T16-13-09Z` | console on 9001; curl live probe | :88-92, :96-100 |
| `minio-init` | minio/mc pinned | creates bucket, sets `anonymous set none` (private) | :105-120 |

- Relay env composition: `DATABASE_URL` built from POSTGRES_* vars with hard-fail
  `:?set ...` placeholders; `REDIS_URL` likewise; S3 endpoint fixed to
  `http://minio:9000` with `BUZZ_S3_ADDRESSING_STYLE=path` because Docker DNS cannot
  resolve `<bucket>.minio` virtual hosts (`compose.yml:12-19`, comment :15-16).
- State mounts: `BUZZ_GIT_REPO_PATH=/data/git` backed by volume `buzz-git-data`
  (`compose.yml:20,26,134-136`).
- Ordering: relay waits for postgres+redis+minio healthy AND `minio-init` completed
  successfully (`compose.yml:27-35`).
- Healthcheck trick: the runtime image has bash but no curl/wget/socat, so readiness
  probes `/dev/tcp/127.0.0.1/8080` with a raw `GET /_readiness` and grep for 200
  (`compose.yml:36-46`).
- `BUZZ_AUTO_MIGRATE` defaults **false** in base compose (`compose.yml:21`), while the
  `.env.example` production template sets it true (:19 of .env.example below) — i.e.
  migration-on-start is an explicit operator choice.

### 2.2 Env contract (`.env.example`)

- Image pinning guidance: track `:main` for testing, pin `:sha-<7>` or semver for prod
  (`.env.example:5-6`).
- Domain-derived settings consumed by Caddy and URL settings: `BUZZ_DOMAIN`,
  `RELAY_URL` (wss), `BUZZ_MEDIA_BASE_URL`, `BUZZ_MEDIA_SERVER_DOMAIN`,
  `BUZZ_CORS_ORIGINS` (`.env.example:8-13`).
- Closed-relay posture defaults: `BUZZ_REQUIRE_AUTH_TOKEN=true`,
  `BUZZ_REQUIRE_RELAY_MEMBERSHIP=true`, `BUZZ_ALLOW_NIP_OA_AUTH=true`,
  `BUZZ_AUTO_MIGRATE=true`, `BUZZ_GIT_CONFORMANCE_PROBE=true`, RUST_LOG targets
  (`.env.example:16-21`).
- Identity/secrets that must be generated once and kept stable:
  `RELAY_OWNER_PUBKEY` (64-hex, deliberately NOT `BUZZ_`-prefixed),
  `BUZZ_RELAY_PRIVATE_KEY`, `BUZZ_GIT_HOOK_HMAC_SECRET`, Postgres/Redis passwords,
  S3 keys (`.env.example:23-35`; prefix rationale confirmed in
  `deploy/compose/README.md:33-34`).
- Port surface: `BUZZ_HTTP_PORT=3000` direct; Caddy 80/443; dev-only ports for
  postgres/redis/minio/adminer/prometheus (`.env.example:39-52`).

### 2.3 TLS override (`compose.caddy.yml`)

- Uses Compose `!reset` tag to REMOVE the relay's host port when Caddy fronts it
  (`compose.caddy.yml:3`); requires Compose >= 2.24.4 per README
  (`deploy/compose/README.md:28-29`).
- Caddy serves 80/443, mounts `./Caddyfile` read-only plus persistent data/config
  volumes; waits for relay healthy; domain injected via env
  (`compose.caddy.yml:5-29`). The Caddyfile itself is minimal (66 bytes — proxy pass
  to relay; `deploy/compose/Caddyfile`).

### 2.4 Dev overlay (`compose.dev.yml`)

Adds host port mappings for postgres/redis/minio(+console), an Adminer container on
8082, and Prometheus scraping via a mounted root `prometheus.yml` with
`host.docker.internal` gateway (`compose.dev.yml:1-41`). Selected with
`BUZZ_COMPOSE_DEV=true` (`run.sh:11-13`, help text :125).

### 2.5 Operator CLI (`run.sh`)

- File-overrides assembly: base + optional caddy (TLS) + optional dev
  (`run.sh:7-13`).
- Guardrail: refuses to start when `.env` is missing OR still contains any
  `CHANGE_ME` placeholder — "Generate stable secrets first; these values must not
  rotate on restart" (`run.sh:19-36`).
- Commands: `start` = `up -d --wait`; `restart` force-recreates only relay;
  `upgrade` = pull + up --wait + backup hints; `logs/status/config`;
  `backup-hint` checklist (`run.sh:53-88`).
- Member administration shells into the running container:
  `docker compose exec relay /usr/local/bin/buzz-admin add-member/remove-member/
  list-members` (`run.sh:89-97`) — proving buzz-admin ships inside the relay image
  and talks to the same DB/Redis.
- Same-second domination guard documented: serial adds only, `sleep 1` between loop
  iterations, never `xargs -P` (`run.sh:119-121`; rationale also in
  `crates/buzz-admin/src/main.rs:16-22`).
- Backup checklist names every durable thing: `.env` secrets, owner key, Postgres
  dump/snapshot, MinIO contents (media + git objects), `buzz-git-data` volume, Caddy
  volumes (`run.sh:38-51`).
- Fresh-install validation flow documented in README: `run.sh config && start`, then
  `curl -fsS http://127.0.0.1:$PORT/_liveness` and `run.sh status`
  (`deploy/compose/README.md:49-61`).

### 2.6 Compose-path limitations (stated by the repo)

- External S3 providers needing `virtual` addressing are NOT configurable through
  `.env` in the bundled stack — use Helm or custom compose
  (`deploy/compose/README.md:40-45`).
- Auto-migration requires an image containing embedded SQLx migrations
  (`deploy/compose/README.md:35-38` — true for official images, see §4).

---

## 3. Helm chart path (`deploy/charts/buzz`, version 0.1.7)

### 3.1 Chart identity & dependencies

- Chart metadata: name `buzz`, description "single relay binary serving WebSocket +
  REST + web UI, backed by PostgreSQL and Redis", version 0.1.7, appVersion 0.1.0,
  Apache-2.0 (`Chart.yaml:1-11,28`).
- Optional eval-only subcharts from CloudPirates OCI: postgres 0.19.x (alias
  `postgresql`, condition `postgresql.enabled`) and redis 0.30.x
  (`Chart.yaml:33-42`).

### 3.2 Two tiers (`values.yaml`)

- PRODUCTION default: external Postgres/Redis/S3, `existingSecret` refs everywhere,
  no chart-side autogen, GitOps-safe, HA-ready (replicaCount>=2 requires Redis; git
  state object-store-backed so no ReadWriteMany needed)
  (`values.yaml:5-9`).
- QUICKSTART: bundles everything in-cluster, autogen secrets via `lookup` pattern,
  single replica, eval only (`values.yaml:10-14`); `quickstart: true` is an intent
  marker surfaced in NOTES.txt and does NOT itself enable anything
  (`values.yaml:19-22`).

### 3.3 Secrets model

- Existing-Secret key schema: `BUZZ_RELAY_PRIVATE_KEY` (rotation = identity change),
  `BUZZ_GIT_HOOK_HMAC_SECRET` (required >1 replica), `DATABASE_URL`, optional
  `READ_DATABASE_URL`, `REDIS_URL`, `BUZZ_S3_ACCESS_KEY/SECRET_KEY`
  (`values.yaml:83-100`).
- Chart-managed Secret (only when no existingSecret): persists across upgrades via
  `lookup`; annotated `helm.sh/resource-policy: keep`; autogens the private key
  (`randAlphaNum 64 | sha256sum`), HMAC, composes DATABASE_URL for in-cluster
  postgres, REDIS_URL for in-cluster redis, autogens S3 creds for bundled MinIO
  (`templates/secret-chart.yaml:11-104`).
- GitOps constraint: ArgoCD/Flux render with `helm template` where `lookup` returns
  empty, so randAlphaNum would regenerate every sync — production MUST use
  existingSecret; chart-managed Secret is helm-install-only
  (`README.md:32-36`, `examples/argocd-app.yaml:7-10`,
  `examples/flux-helmrelease.yaml:3-6`).
- Canonical GitOps examples ship in-tree: ArgoCD Application, Flux HelmRelease,
  secret-sample schema (`examples/argocd-app.yaml`, `examples/flux-helmrelease.yaml`,
  `examples/secret-sample.yaml`).

### 3.4 Required inputs & validation

- Required inputs table: `relayUrl` always; `ownerPubkey` when membership enforcement
  on (default); `secrets.existingSecret` for production/GitOps; external service URLs
  when bundled services disabled (`README.md:44-51`).
- The chart fails at install/template time with clear messages via
  `templates/_validate.tpl` (`README.md:53`); every template begins with
  `{{- include "buzz.validate" . -}}` (e.g. `templates/deployment.yaml:1`,
  `templates/secret-chart.yaml:1`).

### 3.5 Deployment shape (`templates/deployment.yaml`)

- RollingUpdate maxSurge 1 / maxUnavailable 0 (`deployment.yaml:12-16`); pods roll
  when the chart Secret changes via checksum annotation (`deployment.yaml:27-29`).
- Ports: app 3000, health `.Values.service.healthPort` (default 8080), metrics 9102
  (`deployment.yaml:112-115`; defaults `values.yaml:233-237`).
- Env wiring (non-secret): BUZZ_BIND_ADDR, BUZZ_HEALTH_PORT, BUZZ_METRICS_PORT,
  RELAY_URL, BUZZ_PAIRING_RELAY_URL (when configured), BUZZ_MEDIA_BASE_URL,
  capacity knobs (MAX_CONNECTIONS 10000, MAX_CONCURRENT_HANDLERS 1024, SEND_BUFFER
  1000), DRAIN_JITTER_MS, auth flags (REQUIRE_AUTH_TOKEN/REQUIRE_RELAY_MEMBERSHIP/
  ALLOW_NIP_OA_AUTH/PUBKEY_ALLOWLIST), CORS, ephemeral TTL override, upload records
  IP-header options, RELAY_OWNER_PUBKEY, BUZZ_AUTO_MIGRATE, six GIT_* limits,
  S3 endpoint/bucket/region/addressing style
  (`deployment.yaml:116-174`; knob defaults `values.yaml:103-139,366-373`).
- Secret wiring: all credentials come from secretKeyRef on the chart/existing secret;
  most marked optional; REDIS_URL becomes optional only for single-replica without
  bundled/external redis (`deployment.yaml:176-217`, esp. :205).
- Huddle audio guard: safe only single-pod until an SFU exists; null renders false
  automatically when replicas>1 (`values.yaml:123-127`; rendered `deployment.yaml:219-220`).
- Probes: liveness `/_liveness`, readiness `/_readiness` on health port, startupProbe
  failureThreshold 60 x period 2s = up to ~120s boot budget
  (`values.yaml:141-162`; rendered `deployment.yaml:230-235`).
- Resources default request 500m/512Mi, limit 2cpu/2Gi (`values.yaml:164-170`);
  securityContext runAsNonRoot uid/gid 65532, seccomp RuntimeDefault, drop ALL caps,
  readOnlyRootFilesystem false ONLY because git writes need a writable repo path
  (`values.yaml:178-190`).
- Volumes: git-repos PVC-or-emptyDir (scratch semantics — reads/writes hydrate
  ephemeral repos from object storage; uniqueness lives in Postgres) plus a per-pod
  emptyDir pack cache bounded 7Gi (`values.yaml:266-287`; `deployment.yaml:240-258`).
- Quickstart MinIO gating: init container `wait-for-bucket` blocks relay start until
  bucket exists because the relay's A3 S3 conformance probe is startup-FATAL —
  otherwise CrashLoopBackOff until the concurrent bucket Job finishes
  (`deployment.yaml:58-93`).
- Extras: PDB enabled minAvailable 1 (`values.yaml:245-248`), ingress XOR httproute
  (`values.yaml:250-264`), ServiceMonitor (`values.yaml:386-391`), HPA with CPU 65%
  and optional WebSocket gauge `buzz_ws_connections_active` target 5000 connections
  with scale-down stabilization 600s (`values.yaml:43-68`), extraInitContainers/
  extraVolumes/extraManifests extension points (`values.yaml:203-208,393-394`;
  Chart.yaml annotation :27).

### 3.6 Pairing relay sub-deployment

Optional stateless NIP-AB sidecar deployment reusing the SAME image but running
`/usr/local/bin/buzz-pair-relay` on port 5000 with tcpSocket probes; main relay
advertises its URL in NIP-11 when `pairingRelay.enabled`
(`values.yaml:210-230`; `templates/pairing-relay.yaml:2,31-48`).

### 3.7 Migrations in the chart

- Default ON: `migrate.autoMigrate: true` — relay runs sqlx migrations at startup
  (`values.yaml:375-378`).
- Opt-in pre-upgrade Job hook (`migrate.preUpgradeJob`, disabled by default, with
  resources/backoffLimit/activeDeadlineSeconds knobs) (`values.yaml:379-383`).

### 3.8 S3 addressing & region

- One URL style governs both media and Git/CAS requests; `path` default for MinIO,
  `virtual` for AWS/Railway; invalid values fail rendering AND relay startup; region
  defaults us-east-1 to keep bundled MinIO + in-pod `buzz-admin deletions` operable
  (`README.md:55-76`; `values.yaml:342-353`).
- Storage-metrics sweep needs extra `s3:ListBucket` permission or hourly sweep fails
  AccessDenied (metric-only impact); disable with `BUZZ_STORAGE_METRICS=off`
  (`values.yaml:329-341`).

---

## 4. Migrations tooling (end-to-end)

### 4.1 Migration files

- 31 sequential SQL files `0001_initial_schema.sql` …
  `0031_workflow_run_error_codes.sql` in `migrations/` (dir listing; count asserted
  by unit test `assert_eq!(migrations.len(), 31)` in
  `crates/buzz-db/src/migration.rs:625-631` region — test module asserts versions
  1..15 individually at `migration.rs:629-835`).
- Coverage spans initial schema, git repo names, moderation, NIP-RS retention/guards,
  push leases/match queue, archival, join policies, TTL refresh, relay invites,
  replica heartbeat, community deletion + recovery, workflow run error codes
  (filenames above).

### 4.2 Embedded runner (`crates/buzz-db/src/migration.rs`)

- `static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("../../migrations")` —
  SQL embedded at compile time ("Fresh deployments apply the checked-in SQL files";
  legacy cutover is operator script, not startup state) (`migration.rs:1-14`).
- `run_migrations` wraps `MIGRATOR.run` in an EXCLUSIVE `SCHEMA_DESTRUCTION_LOCK_KEY`
  advisory lock serializing against destructive deletion transactions; every statement
  runs on the connection that owns the session lock; a source lint enforces this
  wrapper has no bypass call-site (`migration.rs:16-33,49-83`).
- Pre-flight fail-closed check rejects legacy (<0007) databases holding ambiguous
  NIP-RS duplicate-tag rows before 0007 would irreversibly purge them
  (`migration.rs:85-111` region, fn at :89).
- Post-run floor-guard verification: commit-time created_at fence must exist on events
  parent + every partition, else migration fails closed (`migration.rs:38-47`).
- Public entrypoint on Db: `Db::migrate()` → `migration::run_migrations(&self.pool)`
  (`crates/buzz-db/src/lib.rs:1046-1049`; doc "Embedded database migrations" :32).

### 4.3 Startup application (relay)

- `Config::from_env()` first; then `BUZZ_AUTO_MIGRATE` gate: if truthy →
  `db.migrate().await` (fatal on error), else explicit skip log
  (`crates/buzz-relay/src/main.rs:142-145,188-198`).
- Post-migration startup sequence depends on migrated schema: future-partition
  ensure(3), deletion serving-fence validation (fatal), replica freshness fence probe
  which verifies the 0021 floor guard and stays closed (writer-only cursor pages) if
  verification fails — deliberately AFTER the migration decision so AUTO_MIGRATE-off
  + unapplied 0021 can't open the fence unsafely
  (`main.rs:200-228`).
- Membership-mode preconditions enforced before DB mutations: RELAY_OWNER_PUBKEY
  required when `BUZZ_REQUIRE_RELAY_MEMBERSHIP=true`, and a STABLE
  `BUZZ_RELAY_PRIVATE_KEY` too (ephemeral-signed NIP-43 events become unverifiable
  after restart) (`main.rs:230-252`).
- Boot then seeds the deployment's own community scoped to the normalized relay-url
  authority before membership backfill/owner bootstrap (`main.rs:254-259`).

### 4.4 Manual application (`buzz-admin migrate`)

- Subcommand `Migrate` connects via `connect_db()` (DATABASE_URL env) and runs
  `db.migrate()`; exit code 5 on error (`crates/buzz-admin/src/main.rs:79-80,
  151-156,132-139`; `connect_db` at :433).
- Other ops-relevant subcommands: `generate-key` (bootstrap keypair printing
  "Set BUZZ_PRIVATE_KEY…"), add/remove/list members (NIP-43 roster publish via Redis),
  `product-feedback list` (JSON export feeding admin-web's data), `deletions`
  control plane, `reconcile-channels` (re-emits kind:39000/39001/39002 discovery;
  falls back to BUZZ_RELAY_PRIVATE_KEY or ephemeral key)
  (`main.rs:43-108,144-168`).
- Compose operators invoke these inside the relay container (see §2.5 run.sh:89-97).

### 4.5 Push-gateway chart migrations (pattern contrast)

- Separate chart `deploy/charts/buzz-push-gateway` runs migrations as a Helm hook Job
  BEFORE install/upgrade (`helm.sh/hook: pre-install,pre-upgrade`, weight -5,
  delete-before-creation-and-after-success), invoking the gateway binary with
  `--migrate-only`, using a least-privilege runtime role
  (`templates/migration-job.yaml:7-9,26,29-32`), wrapped by NetworkPolicies
  (`templates/migration-networkpolicy.yaml`).
- Lesson for Fabrica: buzz has TWO migration delivery models — embed-and-run-at-boot
  (relay) vs dedicated pre-install Job with least-privilege role (push gateway).

---

## 5. Config/env surface of the relay (what an operator must supply)

Consolidated from `.env.example` (dev), `deploy/compose/.env.example` (prod compose),
and `deploy/charts/buzz/templates/deployment.yaml` (k8s):

| Group | Variables | Cites |
|---|---|---|
| Core network | `BUZZ_BIND_ADDR`, `RELAY_URL`, `BUZZ_HEALTH_PORT`, `BUZZ_METRICS_PORT`, `BUZZ_CORS_ORIGINS` | .env.example:51-53; deployment.yaml:118-125 |
| Datastores | `DATABASE_URL`, optional `READ_DATABASE_URL`, `REDIS_URL`, pool sizes `BUZZ_DB_POOL_SIZE`/`BUZZ_REDIS_POOL_SIZE` | .env.example:21-23,33-39; deployment.yaml:189-205 |
| Object storage | `BUZZ_S3_ENDPOINT/ACCESS_KEY/SECRET_KEY/BUCKET/REGION/ADDRESSING_STYLE`, media concurrency caps | .env.example:91-96,101-104; deployment.yaml:167-174 |
| Auth/membership | `BUZZ_REQUIRE_AUTH_TOKEN`, `BUZZ_REQUIRE_RELAY_MEMBERSHIP`, `BUZZ_ALLOW_NIP_OA_AUTH`, `BUZZ_PUBKEY_ALLOWLIST`, `RELAY_OWNER_PUBKEY`, `BUZZ_RELAY_PRIVATE_KEY` | deploy/compose/.env.example:15-27; deployment.yaml:132-135,153,177-182 |
| Capacity/behavior | `BUZZ_MAX_CONNECTIONS/HANDLERS/SEND_BUFFER`, `BUZZ_DRAIN_JITTER_MS`, `BUZZ_EPHEMERAL_TTL_OVERRIDE`, rate-limit family `BUZZ_RATE_LIMIT_*` | deployment.yaml:128-141; .env.example:62-70,113-119 |
| Git server | `BUZZ_GIT_REPO_PATH`, `BUZZ_GIT_MAX_PACK_BYTES`, pack-cache trio, `BUZZ_GIT_MAX_REPOS_PER_PUBKEY`, `BUZZ_GIT_MAX_CONCURRENT_OPS`, `BUZZ_GIT_CONFORMANCE_PROBE`, `BUZZ_GIT_HOOK_HMAC_SECRET` | deployment.yaml:158-165; deploy/compose/.env.example:20,28; .env.example:74-83 |
| Web/admin serving | `BUZZ_WEB_DIR`, `BUZZ_SERVE_GIT_WEB_GUI`, `BUZZ_ADMIN_HOST`, `BUZZ_ADMIN_WEB_DIR` | config.rs:930-977; Dockerfile:148-152 |
| Join policy | `BUZZ_TERMS_OF_SERVICE_MARKDOWN`, `BUZZ_PRIVACY_POLICY_MARKDOWN`, `BUZZ_AGE_ATTESTATION_REQUIRED` (any one enables policy acceptance; version = sha256 of docs) | config.rs:891-928; .env.example:247-252 |
| Media compliance | `BUZZ_MEDIA_UPLOAD_RECORDS` + `BUZZ_MEDIA_UPLOAD_IP_HEADER/PORT_HEADER` (off by default; Buzz collects IPs only if operator opts in) | values.yaml:129-139; deployment.yaml:142-150 |
| Observability | `RUST_LOG`, `BUZZ_OTEL_FILTER`, `OTEL_EXPORTER_OTLP_ENDPOINT`, ServiceMonitor/`BUZZ_STORAGE_METRICS`, `BUZZ_USAGE_METRICS_INTERVAL_SECS` | .env.example:122-130; values.yaml:329-341 |
| Migrations | `BUZZ_AUTO_MIGRATE` | main.rs:188-198 |

Secret-length validation: config rejects explicitly-configured secrets that are too
short (comment introducing checks at `config.rs:979`).

---

## 6. admin-web — purpose, auth, screens

### 6.1 Purpose

A private, read-only deployment-moderation SPA: review abuse reports and product
feedback across every community hosted on the relay
(`crates/buzz-relay/src/api/admin/mod.rs:1` "Private, read-only deployment moderation
API"; `admin-web/src/App.tsx:95-98` "Review reports across every Buzz community").

### 6.2 Build & serving integration

- Package `buzz-admin-web`: React 19 + Vite 8 + TS 6, biome lint, vitest + Playwright
  (`admin-web/package.json:2,16-31`); dev server port 4174 (`vite.config.ts:6`).
- Built during relay image build (`Dockerfile:119`), copied to `/srv/buzz/admin-web`,
  and wired via `BUZZ_ADMIN_WEB_DIR=/srv/buzz/admin-web` but INERT until
  `BUZZ_ADMIN_HOST` is set (`Dockerfile:146-152`).
- Relay config: admin surface exists only when `BUZZ_ADMIN_HOST` is a clean authority
  (no `/ \ @` chars); `BUZZ_ADMIN_WEB_DIR` must contain index.html else startup error
  (`config.rs:930-957`). Static web UI serving analog for the public web client:
  `BUZZ_WEB_DIR` with identical index.html check (`config.rs:959-977`).

### 6.3 Authorization model — host-based, no tokens/passwords

- `authorize()`: request Host header must EXACTLY equal configured admin host, else
  403; Origin header (if present) must match `https://<host>`/`http://<host>` exactly,
  else 403 (`api/admin/auth.rs:16-40`).
- Tests pin the threat model: cross-origin attacker origins rejected, `null` origin
  rejected (`auth.rs:42-62`).
- Implication: isolation relies on DNS/edge routing — the admin hostname must resolve
  privately (e.g. internal ingress or VPN). No second factor, no session layer.
- Per-route defense-in-depth: every handler calls `authorize(&state,&headers)?`
  (e.g. `api/admin/mod.rs:93-98` reports handler).

### 6.4 API surface (all GET, read-only)

Router: `/api/admin/v1` prefix added client-side (`admin-web/src/api.ts:1`); relay
routes `/reports`, `/reports/{id}`, `/feedback`, `/feedback/{id}`,
`/feedback/{id}/attachments/{sha256}` (`api/admin/mod.rs:28-41`).
- Query validation: status enum open/resolved/dismissed/escalated; targetKind
  event/pubkey/blob; `limit` clamped 1..=200 default 50; unknown filter values →
  400 (`mod.rs:63-108`).
- Hardening middleware: Cache-Control no-store, nosniff, X-Frame-Options DENY,
  Referrer-Policy no-referrer, CSP `default-src 'none'; frame-ancestors 'none'`,
  RequestBodyLimitLayer 1024 bytes (`mod.rs:38-60`).
- Feedback attachments proxied through the relay under the admin API rather than raw
  media URLs (`mod.rs:34-37`); data comes from `state.db.admin_list_reports` /
  feedback queries against buzz-db (`mod.rs:109-120`).
- CLI counterpart exporting the same feedback data as JSON: `buzz-admin
  product-feedback list` (`crates/buzz-admin/src/main.rs:81-85,111-118,266`).

### 6.5 Screens (App.tsx routes)

Client routing is hand-rolled History-API (popstate + pushState), no router dep
(`App.tsx:18-30`); route table: `/reports` (default), `/reports/:id`, `/feedback`,
`/feedback/:id` (`App.tsx:800-813`).
1. **Open reports list** — cards of report type tag, communityHost, target
   kind/target id, submitted date; fetches `/reports?status=open&limit=100`
   (`App.tsx:88-136`).
2. **Report detail** — status, reporter pubkey, target; if event-target, renders the
   reported message content with author/date and Deleted marker, handles expired/
   removed content gracefully (`App.tsx:138-211`).
3. **Feedback list** — search box, community/time-range/status filters (pending =
   needs action vs acted-on), live result counter, per-item "Acted on" checkbox
   persisted in localStorage key `buzz-admin-feedback-status` (`App.tsx:213-241,
   256-345,503-520`).
4. **Feedback detail** — full body, category tag (bug/praise/needs-work icons,
   `App.tsx:726-745`), imeta attachment parsing from tags with strict safety: URL
   accepted only if http(s), host == communityHost, path starts `/media/`; downloads
   routed through the admin attachment endpoint; markdown link-stripping for known
   attachments (`App.tsx:422-489,532-596`).
- Error UX: 403 renders "Access denied"; retry button (`App.tsx:72-85`).
- Fetch layer: `credentials: "same-origin"`, JSON accept, ApiFailure envelope parsing
  (`api.ts:12-25`). Types mirror the relay DTOs (`types.ts:1-47`).
- E2E coverage exists: `admin-web/tests/routes.spec.ts` (Playwright, 10.5KB) and
  unit vitest run (`package.json:13-14`).

---

## 7. `buzz-backend-kubernetes` — K8s backend provider for remote agents

> NOTE: this does NOT host the relay. It is how Buzz's desktop launches *agent
> workspaces* as pods in an arbitrary cluster (docs/remote-agents.md spec).

### 7.1 Process contract

- Binary purpose string: "Kubernetes backend provider for Buzz remote agents"
  (`Cargo.toml:7`).
- Protocol: one process per operation — read exactly ONE JSON request from stdin,
  write ONE JSON response to stdout, exit; exit code carries one bit (0 = response
  produced) (`src/main.rs:1-9`).
- Two ops: `info` (pure self-description incl. protocol_version + config_schema, no
  cluster contact — desktop renders the config form from it) and `deploy`
  (`src/wire.rs:11,21-26,131-140`).
- rustls ring CryptoProvider installed explicitly at startup due to feature
  unification panic risk (`Cargo.toml:27-33`; `main.rs:35-39`).

### 7.2 Deploy inputs

- `DeployRequest { agent: AgentPayload, provider_config }` where AgentPayload carries
  relay_url, private_key_nsec, auth_tag, respond_to (+allowlist), merged env_vars,
  and desktop-resolved `launch` block (command/args/env/policy_env/owner_pubkey);
  fields like display name/model/provider deliberately untyped to forbid provider-side
  remapping (`wire.rs:28-86`).
- `provider_config` v1: nine fields, ALL optional except `image`; NO credential field
  by design I2 — cluster auth comes from ambient kubeconfig resolution only
  (`config.rs:1-8`); kubeconfig context/namespace/image/resources/inactivity_seconds/
  service_account struct (`config.rs:64-74`).
- Defaults: resources 1cpu/2Gi reqs → 2cpu/4Gi limits; DEFAULT_INACTIVITY_SECONDS
  7200 (auto-stop opt-in); DEFAULT_IMAGE prefills published sprig image WITH digest
  pinning (tag-only refs rejected); RUN_AS_UID/GID 10001; workspace `/home/agent`;
  terminationGracePeriodSeconds 60; RESTART_POLICY "Never" (OnFailure double-gated
  and refused) (`config.rs:22-63`).
- Cluster connect honors exec-plugin credential plugins and prepends home paths
  (`client.rs:24-106`).

### 7.3 Pod environment (three-tier precedence)

- Tier order resolved IN the provider (K8s Secret is flat, no precedence): tier 1
  policy_env defaults ← tier 2 user env (NOT re-merged) ← tier 3 authoritative keys
  which CLEAR-then-write: BUZZ_RELAY_URL, BUZZ_PRIVATE_KEY, NOSTR_PRIVATE_KEY,
  BUZZ_AUTH_TAG, BUZZ_ACP_AGENT_OWNER/COMMAND/ARGS, RESPOND_TO(+ALLOWLIST),
  MCP_COMMAND, EXIT_AFTER_INACTIVITY, START_NONCE (`env.rs:1-9,23-47,161-180`).
- Guards: `BUZZ_ACP_NO_PRESENCE` forbidden (presence is the only remote liveness
  signal); 1 MiB Secret size cap enforced early; POSIX env-key validation (fail-closed
  across kubelet-version behavior change KEP-4369); respond_to gate validated against
  the harness's four modes with allowlist entries forced to 64-hex pubkeys
  (`env.rs:44-149`).
- Refusal backstop: agents configured `provider: "relay-mesh"` are refused even with
  whitespace padding — they run on shared relay compute, deploying them as pods would
  double-consume the agent identity (`main.rs:28-32,97-113` + tests :149-181).

### 7.4 Reconcile state machine

- Flow: parse config → identity from nsec BEFORE cluster contact → build env →
  connect → `reconcile::deploy` (`main.rs:115-135`).
- Deploy loop: ensure namespace → preflight GC (collect terminated pods + orphaned
  secrets older than gate) → compute create-intent fingerprint → classify observed
  pod → act (`reconcile.rs:353-360`; gc constants OPERATION_DEADLINE_SECS 600 and
  ORPHAN_SECRET_MIN_AGE_SECS 2×deadline at `gc.rs:18-27`).
- Success = harness container Running (`Action::NoOp`); self-healing Observe states
  never delete; unrecoverable image pulls report in-band immediately; Delete actions
  use a precondition fence and wait for disappearance
  (`reconcile.rs:386-444`; Action enum `classify.rs:85-107`).
- Anti-thrash rule learned from a live incident: once THIS call created the pod, a
  replace-classification returns an error instead of hot delete/create cycling (which
  minted 107 Secrets in 600s in measurement) (`reconcile.rs:363-373,406-428`).
- Create path mints generation per attempt, restamps START_NONCE, creates Secret
  FIRST (pod spec references exact name → atomic boundary), then pod; AlreadyExists
  adopts winner (`reconcile.rs:446-485`).
- Deadline error text surfaces latest pod condition: "startup not confirmed within
  600s…" (`reconcile.rs:376-383`).
- Observability helpers decode startup markers/annotations, verify pod identity
  (labels `app.kubernetes.io/managed-by=buzz-backend-kubernetes`, binding-version,
  agent-pubkey label + full-pubkey annotation + create-intent + image annotations
  under `buzz.block.xyz/*`), and classify pull failures
  (`observe.rs:22-263`; `naming.rs:10-42`).
- Wire fixtures golden-tested against the desktop contract
  (`tests/fixtures/provider-wire/*.json`, README `tests/fixtures/provider-wire/README.md`).

---

## 8. What running a Buzz relay deployment requires END-TO-END (synthesis)

Minimal viable public deployment (either path):

1. **Image**: `ghcr.io/block/buzz:<tag>` (or ECR mirror via sprout-oss pipeline);
   contains relay + admin + pair-relay + both web bundles (`Dockerfile:3,70-72,119,
   145-152`).
2. **Postgres 17** with DATABASE_URL (writer; optional read replica URL) — schema via
   auto-migrate or buzz-admin migrate (`compose.yml:52-68`; `main.rs:166-198`;
   `.env.example:21-23`).
3. **Redis 7 with auth** — REQUIRED for multi-replica (pubsub fan-out), optional for
   single node (`values.yaml:32-37`; `deployment.yaml:200-205`).
4. **S3-compatible object store** with bucket pre-created/private (MinIO bundled or
   external), path/virtual addressing decided; s3:ListBucket if storage metrics wanted
   (`compose.yml:87-120`; `values.yaml:322-363`; README.md:55-76, values.yaml:329-341).
5. **Identity secrets, stable across restarts**: relay private key (identity),
   git-hook HMAC (required >1 replica), DB/Redis/S3 creds (`values.yaml:83-100`;
   run.sh:29-35).
6. **Owner pubkey** (64-hex) whenever closed membership mode on — the production
   default (`deploy/compose/.env.example:15-24`; `main.rs:234-242`).
7. **Public wss:// URL** driving RELAY_URL, media base URL, ingress hosts
   (`values.yaml:70-76`); TLS via Caddy (compose) or ingress/httproute (chart).
8. **Ports**: 3000 app, 8080 health probes, 9102 metrics (`Dockerfile:154-155`;
   `values.yaml:233-237`).
9. **Health gates**: startupProbe budget ~120s; readiness `/_readiness`; quickstart
   additionally gated on bucket existence (`values.yaml:157-162`; `deployment.yaml:58-93`).
10. **Migration decision**: AUTO_MIGRATE true/false + who runs it (startup vs
    pre-upgrade Job vs manual CLI) (§4).
11. **Ops tooling**: run.sh lifecycle + backup schedule, buzz-admin member/feedback
    operations, ServiceMonitor scraping (§2.5, §4.4, `values.yaml:386-391`).
12. **Optional admin console**: set `BUZZ_ADMIN_HOST` (+ private DNS) and the baked
    admin-web lights up with host-based auth (§6).

HA specifics (production tier): replicas ≥2 need Redis + git-hook HMAC; huddle audio
must be off; each replica gets own RWO scratch; drain jitter smooths reconnect
stampede; PDB keeps minAvailable 1; HPA scales on CPU and WS-connection gauge
(`values.yaml:5-9,108-127,245-248,43-68`; `deployment.yaml` strategy :12-16).

Local k8s testbed recipe: docker-desktop context guard → docker build (proxy CA/npm
mirror aware) → helm dep build → `helm upgrade --install` WITHOUT --wait (S3-probe
crashloop race) → rollout status 3/3 → per-pod curl /_readiness expecting
`"status":"ready"` with evidence directory (`build-and-deploy.sh:36-141`).

---

## 9. Relevance to hosting a future Fabrica relay

1. **Directly reusable deployment skeleton.** The compose bundle is a near-perfect
   template for "Fabrica relay on a VPS": one app container + postgres + redis +
   object store + optional Caddy TLS + bootstrap script with CHANGE_ME guards
   (`deploy/compose/*` cited throughout §2). The Helm chart provides the k8s/GitOps
   upgrade path with the existingSecret discipline worth copying verbatim (§3.3).
2. **Embedded-migrations + explicit opt-in flag** (`BUZZ_AUTO_MIGRATE`) is the safest
   pattern found: schema changes compile into the binary, run under an exclusive
   advisory lock serialized against destructive ops, with fail-closed pre-checks
   (`migration.rs:14-47`). Fabrica should adopt: embedded sqlx-style migrations +
   advisory-lock wrapper + explicit operator gate + manual CLI escape hatch
   (§4.2-4.4).
3. **Three-port separation** (app/health/metrics) with bash-free /_liveness //
   /_readiness probes is directly liftable (`Dockerfile:154-155`, `compose.yml:36-46`).
4. **Admin-web pattern**: an ultra-small (≈900-line SPA) read-only operator console
   served BY the relay binary, gated purely by private-hostname + Origin matching,
   with strict CSP/no-store headers and body-size limits — a strong minimal starting
   point for a Fabrica ops console, though Fabrica should add real authentication
   (token/session) since host-based gating presumes network-level privacy
   (§6.2-6.4).
5. **Config surface discipline**: every knob env-var-driven, validated at startup
   with fatal errors for unsafe combos (membership-without-owner, membership-without-
   stable-key), CHANGE_ME refusal at bootstrap — adopt the same fail-fast validation
   posture (`config.rs:930-957`, `main.rs:230-252`, `run.sh:19-36`).
6. **Agent-to-Kubernetes provider** (`buzz-backend-kubernetes`) is the best available
   blueprint for Fabrica's likely "deploy a coding agent into a cluster" feature:
   stdin/stdout JSON provider protocol with golden fixtures, intent fingerprinting +
   classify/reconcile loop, three-tier env precedence over flat Secrets, orphan-GC
   age gates, and anti-hot-loop guards learned from incidents (§7). Its
   `relay-mesh` refusal also documents Buzz's split between "shared relay compute"
   and "dedicated pods" — a distinction Fabrica's relay design will face too.
7. **Operational maturity signals to replicate**: evidence-directory deploy script,
   per-pod readiness probing, backup checklist enumerating every durable volume,
   checksum-triggered pod rolls on secret change, PDB/HPA defaults
   (`build-and-deploy.sh:29,117-141`; `run.sh:38-51`; `deployment.yaml:27-29`;
   `values.yaml:43-68,245-248`).
8. **Gap to mind**: buzz's admin auth (hostname equality) and its reliance on a
   stable relay signing key mean key loss = identity loss (`values.yaml:89`) —
   a Fabrica relay should plan key rotation/backup UX from day one.

---

## Scan coverage statement

**Read in full (every line):**
- `deploy/compose/`: `compose.yml` (142 L), `.env.example` (52), `README.md` (61),
  `compose.caddy.yml` (29), `compose.dev.yml` (46), `Caddyfile` (listed, 66b),
  `run.sh` (133).
- `deploy/charts/buzz/`: `Chart.yaml` (42), `values.yaml` (394),
  `templates/deployment.yaml` (261), `templates/secret-chart.yaml` (105),
  `templates/pairing-relay.yaml` (72), `README.md` lines 1-82 + heading map for rest,
  `examples/argocd-app.yaml` + `flux-helmrelease.yaml` headers (grep-read),
  `ci/quickstart-values.yaml` (grep-read). NOT line-read: remaining templates
  (`_helpers.tpl`, `_validate.tpl`, `hpa.yaml`, `httproute.yaml`, `ingress.yaml`,
  `pdb.yaml`, `pvc-git.yaml`, `quickstart-minio*.yaml`, `service*.yaml`,
  `servicemonitor.yaml`, `extramanifests.yaml`, `NOTES.txt`), all `tests/*.yaml`
  fixtures, `Chart.lock`.
- `deploy/charts/buzz-push-gateway/`: `templates/migration-job.yaml` (33 L) full;
  others (deployment/networkpolicy/prometheusrule/tests) listed only.
- `deploy/local/`: `build-and-deploy.sh` (144 L) full; `quickstart-ha-values.yaml`
  listed only.
- Root: `Dockerfile` (178 L) full; `docker-compose.yml`, `docker-compose.harness.yml`,
  `Dockerfile.push-gateway`, `Dockerfile.sprig` LISTED ONLY (not line-read — dev
  infra, lower priority; root compose confirmed as dev-only via
  `deploy/compose/README.md:3-4`).
- `.env.example` (root, 252 L) full.
- `migrations/`: all 31 filenames enumerated; SQL bodies not line-read (schema detail
  already covered by R4-1.2 bz-db-schema.md).
- `crates/buzz-db/src/migration.rs` lines 1-110 full + grep-map of remainder;
  `lib.rs` targeted lines.
- `crates/buzz-relay/src/main.rs` lines 140-260 full (startup/migration section);
  `config.rs` lines 880-979 full (admin/web/join-policy section).
- `crates/buzz-relay/src/api/admin/`: `auth.rs` (62 L) full, `mod.rs` lines 1-120
  full (remainder: handler bodies for feedback/attachment), `error.rs` listed only.
- `crates/buzz-admin/src/main.rs` lines 1-170 full + function map via grep.
- `admin-web/`: ALL source files full — `App.tsx` (836), `api.ts` (25), `types.ts`
  (47), `package.json`, `vite.config.ts`, `tsconfig.json`/`index.html`/
  `playwright.config.ts`/`styles.css`/`useResource.ts`/`main.tsx` listed with sizes;
  `tests/routes.spec.ts` listed only.
- `crates/buzz-backend-kubernetes/`: `Cargo.toml` (36), `src/main.rs` (199),
  `src/wire.rs` lines 1-150, `src/config.rs` lines 1-120, `src/env.rs` lines 1-180,
  `src/reconcile.rs` lines 340-519 + full function map, function maps of
  pod/gc/naming/classify/observe/intent/cluster/image/client via grep signatures;
  fixture filenames enumerated. NOT line-read: deep bodies of pod.rs/classify.rs/
  observe.rs/gc.rs/cluster.rs, tests/wire_fixtures.rs, reconcile.rs test module.
- `_sources/buzz/AGENTS.md` §Ecosystem (loaded automatically) for the internal
  release/deploy pipeline mapping.

**Explicitly skipped:** desktop/, web/, mobile/, remaining buzz crates' internals,
`.github/workflows/*` (CI pipelines — candidate for a follow-up task), benchmarks/,
docs/ (except references embedded in code comments).

No files were modified outside `.Fabrica-atlas-board/`.
