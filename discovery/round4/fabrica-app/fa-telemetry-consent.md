# R4-1.20 — Fabrica-app Telemetry / Analytics / Consent Surface (READ-ONLY inventory)

> Task ATLAS R4-1.20 (task_1d97971fb248 / dispatch ctx_ef5fd5c25406). All paths relative to
> `Fabrica-app/` unless prefixed. Every claim cites file:line. Scan-coverage statement at end.
> No source files modified.

---

## 0. Executive summary

Fabrica-app has a **two-lane, deliberately isolated observability stack** plus a third,
user-initiated feedback/crash lane:

| Lane | SDK / transport | Endpoint | Consent gate | Identity |
|---|---|---|---|---|
| Product telemetry (PostHog) | `posthog-node` (package.json:143), main-process only | `https://us.i.posthog.com` (src/main/telemetry/client.ts:104) | Opt-in/out + env kill switches (§4) | Anonymous `install_id` UUID v4 (§5) |
| Error-tracking / diagnostics ("Mode 3") | Custom NDJSON local sink + 2-step token upload | CI-injected `FABRICA_DIAGNOSTICS_TOKEN_URL` (§7) | Env-gated; upload is user-initiated with native confirm (§7.4) | Random per-bundle ID — never `install_id` (§7.3) |
| Feedback / crash reports | `electron.net.fetch`, JSON or multipart | `https://www.onfabrica.dev/v1/feedback` (src/main/ipc/feedback.ts:17) | User-initiated dialog only (not PostHog-consent gated) (§8.3) | Optional GitHub login/email unless anonymous (§8.2) |

- **No Electron `crashReporter`** is used anywhere (`crashReporter|minidump|submitURL|uploadToServer`
  grep over `src/` returns zero hits); crash capture is a fully custom store + IPC lane (§8).
- **No other analytics SDKs**: no Sentry/Mixpanel/Amplitude/Firebase/Crashlytics anywhere in
  `src/` or `mobile/src` (grep evidence in §10).
- The renderer bundles **no PostHog SDK** — the sole client lives in main
  (src/renderer/src/lib/telemetry.ts:1-2).

---

## 1. Architecture: two isolated lanes

The composition root of the error-tracking lane states the invariant explicitly:

> "nothing in `src/main/telemetry/` imports from this directory and vice versa — the two lanes
> never share a code path" — src/main/observability/index.ts:6-11

- Lane A (product telemetry): `src/main/telemetry/*` — client.ts, consent.ts, install-id.ts,
  burst-cap.ts, validator.ts, cohort-classifier.ts, onboarding-cohort-classifier.ts,
  classify-error.ts (+ tests). Wired at startup in src/main/index.ts:2305 ("telemetry must init
  before any IPC handler/renderer can call track()") and flushed before quit at
  src/main/index.ts:3237-3265 (bounded 2 s flush via `shutdownTelemetry`, client.ts:298-312).
- Lane B (error tracking): `src/main/observability/*` — index.ts, tracer.ts, local-file-sink.ts,
  redactor.ts, bundle.ts, diagnostic-bundle-upload.ts, diagnostic-upload-http.ts,
  diagnostic-upload-endpoint.ts, logs-directory.ts. Init/shutdown called from main at
  src/main/index.ts:2330-2331.
- Both IPC surfaces are registered together but kept separate:
  src/main/ipc/register-core-handlers.ts:49 (telemetry) and :172-174 (diagnostics, with comment
  that handlers are wired alongside telemetry yet stay independent).

---

## 2. SDK & transport inventory

- **Only analytics dependency**: `"posthog-node": "^5.33.3"` — package.json:143.
- One client singleton: `let posthog: PostHog | null = null` — client.ts:39; instantiated once per
  session at client.ts:103-111 with:
  - `host: 'https://us.i.posthog.com'` (client.ts:104)
  - `flushAt: 20`, `flushInterval: 10_000` (client.ts:105-106)
  - `disableGeoip: true` — strips SDK-auto GeoIP/client-IP enrichment (client.ts:107-108)
  - `maxQueueSize: 5000` for long-offline sessions (client.ts:109-110)
- Per-capture `$process_person_profile: false` prevents PostHog person-profile creation per
  install_id (client.ts:5-6 and client.ts:194-203).
- **Renderer/web never transmit**: web preload stubs all four telemetry bridges as no-ops
  (src/renderer/src/web/web-preload-api.ts:931-935).

## 2b. Build-time transmission gates

Transmission requires BOTH compile-time constants; there is no runtime env-var override:

- `const TELEMETRY_ENABLED = true` — client.ts:21 (with comment that
  config/scripts/verify-telemetry-constants.mjs greps this exact shape, client.ts:20).
- `FABRICA_BUILD_IDENTITY` (`'stable'|'rc'|null`) + `FABRICA_POSTHOG_WRITE_KEY` substituted by
  electron-vite `define`; any build without them folds to literal `null` so
  `IS_OFFICIAL_BUILD === false` and `track()` short-circuits to console-mirror —
  client.ts:25-36, electron.vite.config.ts:31-59 and define block :274-282,
  ambient declarations in src/types/build-constants.d.ts:1-13.
- CI-only injection via GitHub Actions secrets (electron.vite.config.ts:40-44);
  release gate script verifies constants actually landed in the packed app.asar BEFORE the draft
  release publishes — config/scripts/verify-telemetry-constants.mjs:1-27 (header comment),
  patterns imported from telemetry-bundle-constant-patterns.mjs (:52-53).
- Dev escape hatch exists ONLY for diagnostics (see §7.4), not for PostHog.

---

## 3. Event catalog (what can be emitted)

Single source of truth: src/shared/telemetry-events.ts — Zod-first `eventSchemas` registry
(:1425-1519), `.strict()` on every object schema so extra keys drop the event (:4), free-form
strings carry explicit `.max(N)` caps (:4). ~80 event names including:

- Lifecycle/funnel: `app_opened` (:1426), `repo_added` (:1431), `workspace_created` (:1438),
  `agent_started`/`agent_prompt_sent`/`agent_error` (:1443-1445), onboarding family
  (:1483-1502), feature-wall family (:1475-1481), contextual tours/setup guide (:1504-1509).
- Consent events themselves: `telemetry_opted_in` / `telemetry_opted_out` (:1466-1467), payload
  `{ via: 'first_launch_banner' | 'settings' }` (:236-237, :539-540).
- Reliability: `daemon_start_failed` (:1449), `main_thread_hang_detected` (:1450, raw
  `unresponsive_ms` + boolean only, :398-403), `daemon_lifecycle` (:1451), `daemon_audit_eligibility`
  (:1452), `runtime_rpc_start_failed` (:1453), `codex_trust_grant` (:1455), `direct_ssh_reconnect_operation`
  (:1514, counts/durations only).
- Brand-named events: `app_starred_FABRICA` (:1427), `FABRICA_cli_feature_tip_shown/_setup_clicked/_setup_result`
  (:1469-1471) — see §11 rebrand register.
- Privacy discipline on payloads: enum-only error classes block raw stderr/messages
  (:367-374 "`.strict()` blocks `error_message`/`error_stack`, keeping raw user/path content off
  the wire"; same rationale :388, :661-668). Sole exception: `agent_hook_install_failed.error_message`
  capped at 200 chars (:773-778).
- Common props attached to every event: `app_version, platform, arch, os_release, install_id,
  session_id, FABRICA_channel` — built in client.ts:53-64, schema (`.strict()`, each string
  `.max(64)`) at telemetry-events.ts:1638-1650.
- Cohort injection: `nth_repo_added` (repo count at emit time) injected into cohort-declaring
  events by the IPC layer (ipc/telemetry.ts:69-76) using cohort-classifier.ts:36-48;
  onboarding events additionally get `cohort: 'fresh_install' | 'upgrade_backfill'`
  (telemetry-events.ts:894-895; onboarding-cohort-classifier.ts:26 reads
  `settings.telemetry.existedBeforeTelemetryRelease`).

## 3b. Emission sites (sampled)

Main-owned emissions bypass renderer IPC and are blocked if a renderer tries them:
`MAIN_OWNED_TELEMETRY_EVENTS = { app_starred_FABRICA, daemon_audit_eligibility, star_nag_outcome,
feature_interaction_usage_bucket_reached }` — ipc/telemetry.ts:25-30, enforced at :65-68.
Sampled call sites: persistence.ts:281-282 (imports track/cohort), ipc/github.ts:112-113 +
:1211 (star event), ipc/worktrees.ts:130-132 + :2197/:2230 (workspace_created; branch name
explicitly never sent), ipc/pty.ts:115-117 + :5819-5825 + :6879-6880 (agent_started/error with
main-side safeParse of renderer-threaded launch metadata), hang-watchdog marker
(main-thread-hang-watchdog-entry.ts:32).

---

## 4. Consent model & opt-outs (product-telemetry lane)

Pure resolver used by every call site — src/main/telemetry/consent.ts:76-109. Precedence:

1. `DO_NOT_TRACK` truthy → disabled, reason `do_not_track` (consent.ts:78-80) — community kill switch.
2. `FABRICA_TELEMETRY_DISABLED` truthy → disabled, reason `FABRICA_disabled` (consent.ts:82-84).
3. Any of 8 CI env vars present non-empty (`CI, GITHUB_ACTIONS, GITLAB_CI, CIRCLECI, TRAVIS,
   BUILDKITE, JENKINS_URL, TEAMCITY_VERSION`) → disabled, reason `ci` (consent.ts:26-35, 88-90).
4. Stored setting `telemetry.optedIn`: `true`→enabled; `false`→`user_opt_out`;
   `null`→`pending_banner` (existing user awaiting banner decision) (consent.ts:101-109).
   Missing telemetry block fails CLOSED to `pending_banner` (consent.ts:97-99).
- Env-var/CI paths are runtime-only and never mutate stored prefs (consent.ts:5-7).
- Only `1`/`true` (case-insensitive) counts as truthy; anything else warns once to stderr and is
  treated as unset (consent.ts:57-68) — prevents `DO_NOT_TRACK=yes` silently no-oping.
- Shared union type crossing IPC: src/shared/telemetry-consent-types.ts:11-17.

### 4b. Enforcement pipeline in `track()`

Order is load-bearing (client.ts:1-4): shutdown gate → burst cap → consent resolve → Zod
validate → capture (client.ts:164-204). Consent is re-read from live settings every call so it
cannot drift (client.ts:182-186). Burst caps (burst-cap.ts:1-16): 30/min per event
(20/min for `agent_error`), 1,000/session ceiling, ≤5 consent mutations/session; unknown event
names rejected via `Object.hasOwn(eventSchemas, name)` (burst-cap.ts:59-64).

### 4c. Opt-in / opt-out UX flow

- First-launch banner (existing users): `TelemetryFirstLaunchSurface` mounts at App root only when
  `existedBeforeTelemetryRelease === true && optedIn === null`
  (src/renderer/src/App.tsx:2674-2681; components/TelemetryFirstLaunchSurface.tsx:46-58).
  New users get NO first-launch surface (default-on; rationale comment at
  TelemetryFirstLaunchSurface.tsx:1-5). No events transmit until banner resolves
  (client.ts:50-52; `trackAppOpenedOnce` fires only after resolution, client.ts:289-296).
- ✕ on banner = silent persisted opt-IN without emitting an opt-in event
  (`persistBannerAcknowledgeWithoutEmitting`, client.ts:267-287; IPC channel
  `telemetry:acknowledgeBanner`, ipc/telemetry.ts:108-123, valid only while pending, :113-117).
- Explicit toggle emits `telemetry_opted_in`/`telemetry_opted_out`; the opt-out capture is sent
  DIRECTLY (not through `track()`) and awaited-before-`optOut()` so the one opt-out signal still
  lands (client.ts:232-264; lifecycle tests client-lifecycle.test.ts:36-37,129).
- `via` discriminator derived main-side from pre-mutation state, never trusted from renderer
  (ipc/telemetry.ts:32-50).
- Settings UI: `PrivacyPane` (src/renderer/src/components/settings/PrivacyPane.tsx:8 imports
  `PRIVACY_URL, getConsentState, setOptIn`; opens privacy doc at :108). Settings search exposes
  keywords "analytics"/"posthog"/telemetry strings (privacy-search.ts:19,23; en.json locale keys
  "Privacy & Telemetry" en.json:7205, env-var explainer en.json:8954-8955, disabled-reason strings
  en.json:6759-6760). Same strings localized in zh/ja/ko/es locales
  (e.g. zh.json:8569, ja.json:8594, ko.json:8557, es.json:8572).
- Web build: all four telemetry bridges stubbed to resolve-noop (web-preload-api.ts:931-935).

## 5. Identifiers and account linkage

- `install_id`: anonymous UUID v4 (`randomUUID`), generated once by the one-shot Store.load()
  migration and stable across launches — install-id.ts:10-12 (generator), :19-21 (sole read path),
  migration at src/main/persistence.ts:3843-3897 ("One-shot telemetry cohort migration: seeds
  existedBeforeTelemetryRelease, optedIn, and installId"). Persisted shape documented at
  src/shared/types.ts:3163-3172 ("Anonymous UUID v4 … not surfaced in the UI").
- Used as PostHog `distinctId` (client.ts:196) and validated `.min(1)` so empty ids can't collapse
  users (telemetry-events.ts:1645; fail-closed init guard client.ts:94-101).
- `session_id`: fresh random UUID per launch (client.ts:86).
- **No account linkage**: common props carry no account/email/token fields (client.ts:53-64);
  `$process_person_profile:false` means PostHog creates no person profile keyed to the install
  (client.ts:5-6,194). Diagnostic bundles strip identity keys server-side
  (`install_id/distinct_id` blocklist, redactor.ts:65-71) and bundle submission IDs are random
  128-bit values, join-incompatible with the PostHog lane (bundle.ts:31-33 comment, :177-185).
- The only place a GitHub identity can leave the machine is the *user-initiated* feedback/crash
  form (`githubLogin`/`githubEmail`, nulled when `submitAnonymously`) — feedback.ts:82-104,
  crash-reporting.ts:508-513/561-566. Relay auth (Supabase JWT baked at
  electron.vite.config.ts:61-70) is a separate product lane (relay/mobile), not telemetry.
- Multi-profile installs: each Fabrica profile seeds its own telemetry consent block copied from
  the creating profile's settings (fabrica-profiles/profile-index-store.ts:160-178; call sites
  ipc/fabrica-profiles.ts:189,287) — so install_id/consent replicate per profile data dir.

---

## 6. What leaves the machine (product-telemetry lane)

Exactly: common props (§3) ∪ strict validated event props ∪ cohort props, POSTed to
us.i.posthog.com, only when ALL hold: official CI build (§2b) AND effective consent `enabled`
(§4) AND burst-cap budget remains (§4b) AND schema validation passes. Dev/contributor builds
console-mirror only (client.ts:163-166 comment). GeoIP/IP enrichment disabled at SDK level
(client.ts:107-108).

---

## 7. Error-tracking / diagnostics lane (Mode 3)

### 7.1 Local NDJSON trace sink
- Tracer writes spans to rotated local files (`local-file-sink.ts`; 10 MB/file family cap noted at
  bundle.ts:106); path resolved by logs-directory.ts; daemon lifecycle log merged into bundle
  collection (index.ts:214-218).
- Local writes NEVER leave the machine and are treated as outside "tracking": DNT keeps the local
  file but disables the share button (index.ts:114-122, comment "Local file writes never leave the
  machine").

### 7.2 Consent boundaries (lane B)
Documented at index.ts:13-29 and implemented in `resolveObservabilityConsent` (index.ts:92-128):
CI disables everything (:100-106); `FABRICA_DIAGNOSTICS_DISABLED=1` disables even local writes
(:107-113); `DO_NOT_TRACK` / `FABRICA_TELEMETRY_DISABLED` disable bundle creation/upload but keep
local logs (:114-122). Disabled reason enum includes `'FABRICA_telemetry_disabled'`
(index.ts:72) — surfaced to renderer via `diagnostics:getStatus` (index.ts:172-191) and i18n
(en.json:8951-8955, api-types.ts:797).

### 7.3 Bundle collection & de-identification
- `collectBundle` gathers last-N-minutes (default 30, bundle.ts:15) of spans newest-first across
  the rotated trace family + daemon log under a 4 MiB cap (bundle.ts:73-173; cap check :156-158;
  MAX_BUNDLE_BYTES import :11).
- Header carries app_version/platform/arch/os_release/FABRICA_channel/collected_at/schema_version
  — NO install_id (bundle.ts:42-51,84-87; explicit warning "NEVER pass install_id here"
  index.ts:193-197).
- Triple redaction (sink-write, collection, server-ingest defense-in-depth): redactor.ts:1-11;
  rules = labeled KV secrets (:13-14), provider key fingerprints incl. `sk-ant-`, OpenAI, GitHub
  tokens, AWS, JWT, Slack, PEM blocks (:17-36), URL userinfo (:39), .env lines (:42); attribute
  blocklist (:45-63); server mode additionally drops `install_id/installid/distinct_id/distinctid`
  (:65-71). Collection uses mode `'server'` (bundle.ts:149-150).
- Submission ID: per-bundle random 128-bit base64url, unguessable, NOT persisted
  (bundle.ts:177-185; security-review Issue 8 rationale bundle.ts:3-4, test assertion
  bundle.test.ts:219-240 "payload does not contain posthog-install-id").

### 7.4 Upload path & endpoint pinning
- Endpoint = compile-time `FABRICA_DIAGNOSTICS_TOKEN_URL` (build-constants.d.ts:15-22;
  electron.vite.config.ts:55-59, defined :279). Official builds are PINNED to the CI value —
  user env cannot redirect ("uploads that the UI labels as going to FABRICA support",
  diagnostic-upload-endpoint.ts:22-34). Non-official builds may point at staging via the
  `FABRICA_DIAGNOSTICS_TOKEN_URL` env var (:29-33).
- Two-step upload: POST `{bundle_submission_id, bytes}` to token endpoint (10 s timeout, edge rate
  limit 10/hour/IP) → receive `{token, expires_at, upload_url, max_bytes}` → Bearer POST NDJSON
  payload to `upload_url` (30 s timeout) → `{ticket_id}` (diagnostic-bundle-upload.ts:37-96).
- Anti-exfiltration: `validateUploadUrl` requires https-when-token-endpoint-https and SAME-HOST
  as token endpoint (:103-135); response bodies capped at 1 MiB and infra detail stripped from
  errors crossing IPC (diagnostic-upload-http.ts:79-88,100-112).
- Deletion: `POST {tokenEndpoint}/diagnostics/delete/{ticketId}` with ticket-id format validation
  (diagnostic-bundle-upload.ts:98-148).
- User controls (six IPC channels): getStatus / collectBundle / openBundlePreview /
  discardBundlePreview / uploadBundle / deleteBundle — ipc/diagnostics.ts:1-19; collect+upload are
  main-side consent-gated (renderer button-hide is UX only) :215-222, :249-264; upload requires
  preview-opened then re-uploads ONLY main-retained redacted bytes (never renderer-supplied)
  :118-124; native Send/Cancel confirmation dialog :192-205; pending previews TTL 15 min, max 8,
  written 0600 to `%TEMP%/FABRICA-diagnostic-bundle-previews` :42-43,160-176.

---

## 8. Crash reporting (custom, no Electron crashReporter)

- Grep proof: zero matches for `crashReporter|startCrashReporter|minidump|submitURL|uploadToServer`
  across `src/`.
- **Local capture**: `CrashReportStore.fromUserData` persists JSON at
  `<userData>/crash-reports.json` (crash-report-store.ts:87-88). Native/GPU/renderer process-exit
  events recorded via process-gone-recorder.ts (ProcessGoneCrashEvent type :31-36; dedupe +
  durable breadcrumbs imports :22-34).
- **Renderer errors**: React error boundaries report through `crashReports:recordRendererError`
  (crash-reporting.ts:489-497) with allow-listed surfaces (:47-59), length-capped fields
  (:84-122), 10-minute dedupe (:42-44,176-179). Breadcrumbs stream via
  `crashReports:recordBreadcrumb` (:427-463) sanitized (:274-288) and storm-coalesced
  (:325-349,351-406); breadcrumb traces also mirror into the observability sink for durable
  pre-crash context (:290-304).
- **Submission**: `crashReports:submit` → `submitFeedback({submissionType:'crash', ...})`
  (crash-reporting.ts:499-632) → POST to hardcoded `FEEDBACK_API_URL =
  'https://www.onfabrica.dev/v1/feedback'` (feedback.ts:17) as JSON or multipart when a diagnostic
  bundle attaches (feedback.ts:142-182). Body = feedback text, submissionType, optional GitHub
  identity, appVersion/platform/osRelease/arch (allow-list built main-side, feedback.ts:82-104);
  bundle rides as `diagnosticBundleFile` NDJSON named `FABRICA-diagnostics-<id>.ndjson`
  (:159-176); content-shaped failures retry without the attachment (:23,235-252); 5xx retries the
  primary endpoint (:332-340).
- **Consent status**: this lane is NOT gated by the PostHog opt-in — it is inherently
  user-initiated (native confirm dialog, crash-reporting.ts:192-205 within
  diagnostics.ts confirmBundleUpload; crash submit dialog args includeDiagnosticLogs/
  submitAnonymously flags, crash-reporting.ts:505-513). Help > Report Crash can submit without any
  stored report (:262-272).
- Renderer crash prompts surface latest pending report via `crashReports:getLatestPending`
  (:409-413).

---

## 9. Related-but-adjacent surfaces (scoped out, pointers)

- Auto-update network traffic (update feed endpoints) — covered by R4-1.4
  (`discovery/round4/fa-autoupdate-build.md`); updater-changelog/nudge use the same
  main-process-net pattern as feedback (feedback.ts:12-16 comment).
- Usage analytics panes ("Enable Claude/Codex/OpenCode usage analytics", StatsPane.tsx:157-174)
  are LOCAL scans of on-disk CLI databases (usage-worktree-metadata.ts:37 "usage scans are
  background/opt-in analytics"), not outbound telemetry.
- Startup diagnostics banner (`FABRICA_STARTUP_DIAGNOSTICS`) writes LOCAL stderr/file only
  (electron.vite.config.ts:72-183).
- Mobile companion (`mobile/`): no telemetry/analytics/crash SDKs found (§10).

---

## 10. Negative findings (searched, absent)

- No `crashReporter` / minidump usage (grep over src/, zero hits — §8).
- No Sentry / Mixpanel / Amplitude / Segment / Firebase / Crashlytics anywhere: repo-wide greps for
  these names return hits only in unrelated contexts (test fixtures like
  rate-limits/minimax-fetcher.test.ts:279 `_ga=analytics` cookie fixture; worktree-name fixtures
  `wt-analytics` in http-link-routing.test.ts:291-337).
- `mobile/src`: word-boundary grep for `\bposthog\b|\bsentry\b|\btelemetry\b|\bcrashlytics\b|\bfirebase\b|\bmixpanel\b|\bamplitude\b`
  returns ZERO hits (an initial loose `-i` grep produced false positives matching `StatusEntry`
  against `sentry`; word-boundary re-run is clean).
- Renderer bundles no PostHog SDK (lib/telemetry.ts:1-2 security invariant).
- No runtime env-var override can enable PostHog transmission (build-constants.d.ts:8-10;
  client.ts:23).

---

## 11. After-Rebrand implications (renamed brand must not leak old identity)

| # | Item | Evidence | Rebrand action |
|---|---|---|---|
| 1 | Hardcoded feedback endpoint `https://www.onfabrica.dev/v1/feedback` | feedback.ts:17 | Highest leak risk: crash/feedback would POST to old brand domain. Move to new domain or server-side redirect; also comment at feedback.ts:332-333 references sibling host `api.onfabrica.dev`. |
| 2 | Privacy doc URL `https://www.onfabrica.dev/docs/telemetry` | lib/telemetry.ts:11 (single source of truth consumed by FirstLaunchBanner + PrivacyPane, PrivacyPane.tsx:8,108) | Update constant; legal/privacy disclosure must describe the new brand. |
| 3 | Brand-prefixed event names: `app_starred_FABRICA`, `FABRICA_cli_feature_tip_*` | telemetry-events.ts:1427,1469-1471 (+ roster :1556,1573-1575; main-owned set ipc/telemetry.ts:25-30) | Renaming breaks historical PostHog funnels. Registry's own versioning rule: breaking changes need NEW event names (telemetry-events.ts:1424). Decide continuity vs clean cutover. |
| 4 | Common prop `FABRICA_channel` + schema enum | client.ts:62; telemetry-events.ts:1647; bundle header field `FABRICA_channel` bundle.ts:48,84 | Wire-visible brand string on EVERY event and bundle; rename ripples into dashboards + validator. |
| 5 | Compile-time constant names `FABRICA_BUILD_IDENTITY`, `FABRICA_POSTHOG_WRITE_KEY`, `FABRICA_DIAGNOSTICS_TOKEN_URL` + CI secret names + ambient decls | electron.vite.config.ts:45-59,274-282; build-constants.d.ts:12-22; verify script config/scripts/verify-telemetry-constants.mjs:1-27 | Renames must sync: vite define, d.ts, GH Actions secrets, verify-script regexes (client.ts:20 warns the script greps source shape). |
| 6 | Env kill switches `FABRICA_TELEMETRY_DISABLED`, `FABRICA_DIAGNOSTICS_DISABLED`, dev override `FABRICA_DIAGNOSTICS_TOKEN_URL` | consent.ts:82-84; index.ts:18-21,96-97; diagnostic-upload-endpoint.ts:29-32 | Rename cascades into docs, settings search strings, and i18n locale strings listing the var names (en.json:8951-8955; zh.json:8557,9387; ja.json:8594,9387; ko.json:8557,9387; es.json:8572,9387). Keep `DO_NOT_TRACK` untouched (community standard, consent.ts:77-80). |
| 7 | Consent reason literals crossing IPC: `'FABRICA_disabled'`, `'FABRICA_telemetry_disabled'` | telemetry-consent-types.ts:15; index.ts:72; api-types.ts:797; renderer validation lib/telemetry.ts:24 | String enum rename must be atomic across shared type, main producers, renderer validators, i18n keys, and tests. |
| 8 | On-disk artifacts: `%TEMP%/FABRICA-diagnostic-bundle-previews` dir; `FABRICA-diagnostics-*.ndjson` upload filename | diagnostics.ts:167,173; feedback.ts:174 | Cosmetic but visible to users/support; include in path-migration inventory (cf. R4-1.15 report's 13-item rebrand impact register). |
| 9 | PostHog project continuity | WRITE_KEY is project-scoped secret (electron.vite.config.ts:41; client.ts:29-36) | New brand likely wants new PostHog project → historical funnel loss; alternatively keep project and accept old-brand project name internally (invisible to users). `install_id` stability decides whether cohort history joins across cutover (install-id.ts:4-8; persistence.ts:3843-3897). |
| 10 | Locale search keyword "posthog" exposed in settings search | en.json:8968 (+ ja/es equivalents :8611,:8589; privacy-search.ts:23) | Users can literally search "posthog" in Settings — decide whether third-party SDK name stays accurate post-rebrand. |
| 11 | Diagnostics support framing "going to FABRICA support" comments + confirm dialog text | diagnostic-upload-endpoint.ts:24-25; diagnostics.ts:198-202 | Dialog copy says "Send this file to support?" — update copy to new brand. |

Cross-reference: R4-1.15 (fa-settings-config-datadirs.md) already tracks the broader
`FABRICA_*` env-var and data-dir rebrand surface; items 5-8 above should be merged into its
register during synthesis.

---

## Scan coverage statement

**Read in full (file-level):** src/main/telemetry/{client.ts, consent.ts, install-id.ts,
burst-cap.ts, cohort-classifier.ts}; src/main/observability/{index.ts, bundle.ts,
diagnostic-bundle-upload.ts, diagnostic-upload-http.ts, diagnostic-upload-endpoint.ts,
redactor.ts (lines 1-120 of 236; remainder is recursive-redaction plumbing cited via its
callers)}; src/main/ipc/{telemetry.ts, diagnostics.ts, crash-reporting.ts, feedback.ts};
src/shared/{telemetry-events.ts (all 1650 lines), telemetry-consent-types.ts}; 
src/types/build-constants.d.ts; src/renderer/src/lib/telemetry.ts;
components/TelemetryFirstLaunchSurface.tsx; electron.vite.config.ts; package.json (SDK lines);
config/scripts/verify-telemetry-constants.mjs (lines 1-60 header/logic); 
crash-report-store.ts + process-gone-recorder.ts (targeted excerpts); shared/types.ts
(telemetry settings block :3163-3172); persistence.ts (migration region :3843-3897 + deep-merge
:5950-5983 via grep).

**Scanned by grep/pattern (not full reads):** track()/telemetry call sites across src/main/ipc/*
(sampled pty.ts, worktrees.ts, github.ts, persistence.ts, register-core-handlers.ts,
fabrica-profiles.ts); renderer telemetry surfaces (App.tsx, web-preload-api.ts, privacy-search.ts,
Settings.tsx excerpt, locales en/zh/ja/ko/es targeted lines); mobile/src (word-boundary SDK grep,
zero hits); crash-reporting/ directory structure.

**Skipped / out of scope:** node_modules/, dist/, out/, .next (per task spec); updater/update-feed
endpoints (owned by R4-1.4 fa-autoupdate-build.md); relay/Supabase transport internals (separate
product lane, R4-1.5/buzz relay reports); _sources/* (mission-control/buzz — different repos);
exhaustive enumeration of every individual `track('...')` call site (~200 across the repo —
cataloged instead at the schema-registry level, which the validator makes authoritative per
validator.ts:3 "src/shared/telemetry-events.ts IS the validator"); docs/onboarding-funnel-cohort-addendum.md
and telemetry-plan.md / telemetry-error-tracking.md plan documents were NOT found in the repo tree
(only referenced by comments — they appear to live outside Fabrica-app or were pruned; their
in-file summaries quoted here come from code comments alone).

**Source integrity:** read-only session; no files under `Fabrica-app/` or `_sources/` modified
(auditable via git status).
