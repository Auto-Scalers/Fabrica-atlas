# Round 4 Wave-2 Spot Verification (R4-2.4)

> Task: R4-2.4 · Worker session ctx_84dfd75b71ba (task_94862deb89c7) · Date: 2026-08-23
> Method: 5 parallel read-only verifier passes, one per report. Each sampled ≥10 file:line citations spread across sections, re-opened the cited source files at those lines, compared quoted content, checked scan-coverage statements, and spot-checked structural claims.
> READ-ONLY on `_sources/` and `../Fabrica-app/` — no source files touched.

## Verdict Summary

| Report | Cites Sampled | Exact | Minor | Failed | Coverage Stmt | Verdict |
|---|---|---|---|---|---|---|
| `discovery/round4/mc-workflow-engine.md` | 24 | 23 | 1 | 0 | Present | **PASS** (1 factual nit) |
| `discovery/round4/mc-ai-providers.md` | 20 | 19 | 1 | 0 | Present | **PASS** |
| `discovery/round4/mc-service-catalog.md` | 19 | 18–19* | 0 | 0 | Present | **PASS** |
| `discovery/round4/fa-window-tray-notifications.md` | 51 | 49 | 2 | 0 | Present (+accurate) | **PASS** |
| `discovery/round4/bz-ops-deploy-admin.md` | 32 | 31 | 1 | 0 | Present | **PASS** |
| **Totals** | **146** | **140** | **5** | **0** | **5/5** | **ALL PASS** |

\* All 19 sampled rows in the service-catalog check were individually marked EXACT; the verifier's own summary line said 18/19 (arithmetic slip inside the verification pass, not a citation failure). No failed or minor cites for this report either way.

---

## 1. mc-workflow-engine.md (R4-1.6)

Sampled 24 citations across daemon types/config, health, run-task gates, field-ops FSM, prompt-builder, scheduler, dispatcher, execute/route.

- Representative EXACT hits: `scripts/daemon/types.ts:9-40` DaemonConfig fields all present; `config.ts:11-41` DEFAULT_CONFIG values verbatim (5-min poll, 3 agents, crons, 25 turns/30 min/1 retry); six validation gates land precisely at `run-task.ts:789-834`; terminal classification at `run-task.ts:962-1004`; `field-ops-security.ts:73-82` VALID_TRANSITIONS matches entry-for-entry incl. "iron claw" comment :53-58; `prompt-builder.ts:299/:312` quoted strings verbatim; `dispatcher.ts:17-18` retry queue file + MAX_RETRY_DELAY_MINUTES=60; `execute/route.ts:87` ETH ~$2000 heuristic.
- **MINOR/factual:** report claims "17 named mutexes" at `data.ts:176-195` — actual registry (`data.ts:177-196`) contains **20** entries. Identifiers and anchor otherwise correct. Recommend a one-line correction.
- Structural checks: 4 distinct run engines ✅, 8-state FieldTaskStatus FSM ✅ (`src/lib/types.ts:420`), 4 named schedules w/ exact crons ✅.
- Coverage statement: present (three tiers — 18 files read line-by-line w/ counts, targeted reads, explicit skipped list).

## 2. mc-ai-providers.md (R4-1.9)

Sampled 20 citations across security, runner, vault crypto/session, spend-tracker, catalog entries, find-auth-env.

- Representative EXACT hits: `security.ts:97` ALLOWED_BINARIES verbatim; `runner.ts:44` `.cmd` shim regex verbatim; `runner.ts:233` shell-injection comment + args array; `vault-crypto.ts:24-39` scrypt params (N=16384/r=8/p=1, ~100ms, 96-bit IV); `spend-tracker.ts:82-176` layered limits + 31-day prune; `service-catalog.json:387-412` dalle-imagegen entry verbatim incl. "$0.040/image"; `find-auth-env.js:29/40/58`.
- **MINOR:** `config.ts:65-68` clamp cited one line long (actual 65-67). Cosmetic.
- Structural checks: single provider = Claude Code CLI binary confirmed by repo-wide negative greps (zero HTTP/SDK/streaming matches); two OpenAI catalog entries metadata-only; batch-only output confirmed.
- Coverage statement: present and thorough (per-file line counts — every spot-checked count matched reality).

## 3. mc-service-catalog.md (R4-1.8)

Sampled 19 citations across loader, adapter registry, all 6 native adapters, execute/test routes, JSON anchors, type/validation defs, catalog API routes.

- Representative EXACT hits: `service-catalog.json` = exactly 1,849 lines; `data.ts:635-642` loader + fallback verbatim; adapter serviceId lines for twitter/linkedin/gmail/stripe/reddit/ethereum-wallet all exact; `execute/route.ts:215-217` dual lookup; manual-fallback strings verbatim at :239/:245-246; 13 sampled JSON `"id"` anchor lines all landed exactly; `freshdeck-mcp` typo at :1018 is genuine upstream data, correctly flagged.
- Headline numbers independently reproduced: **64 services** (parsed full JSON; zero duplicate ids), **6 native adapters** (exactly 6 `*-adapter.ts` files registering into the catalog), auth split 42 api-key / 21 oauth2 / 1 none, risk split 20 high / 40 medium / 4 low — all matching the report digit-for-digit. Confirms report's correction of the earlier "~66" figure.
- Coverage statement: present (§8).
- Failures: none.

## 4. fa-window-tray-notifications.md (R4-1.11)

Sampled 51 citations across single-instance lock, macOS activation, window close decision, focus handling, main window creation, system tray, attention icon, notifications IPC, menu, serve-mode activation, quit policy, dock badge, mobile replay, index.ts lifecycle.

- Representative EXACT hits: `single-instance-lock.ts:40-49/:51-65/:67-74` all three branches verbatim incl. exit-code-3/#11935 rationale; `createMainWindow.ts:65` 10s ack timeout constant; tray-guard-first close intercept `index.ts` region :1019-1057; `system-tray.ts:208-210` fatal-throw comment; `tray-attention-icon.ts:3-8` #f59e0b dot; `ipc/notifications.ts:397-403` tray-before-gates comment verbatim; `fabrica-runtime.ts:12685-12740` dispatch fan-out deep inside a 37k-line file — line-exact.
- **MINOR ×2:** `index.ts:1493-1495` show/restore listeners actually at 1494-1495 (one-line drift); `register-app-menu.ts:75-89` range loose — pop-out delegation lives in `dashboard-popout-window.ts:74-81`, which itself verifies EXACT. Claim substance holds in both cases.
- Structural checks: no globalShortcut/deep-links/login-item confirmed by zero-hit grep; tray menu composition confirmed; Electron Notification + bundled helper architecture confirmed.
- Coverage statement: present and unusually strong — all 17 claimed per-file line counts matched real files byte-for-byte.

## 5. bz-ops-deploy-admin.md (R4-1.10)

Sampled 32 citations across compose.yml, run.sh, .env.example, Helm chart (Chart.yaml/values.yaml/migration-job.yaml), Dockerfile, migrations, buzz-admin, admin-web auth, k8s backend.

- Representative EXACT hits: `deploy/compose/compose.yml:5` image default verbatim; `:?set` hard-fail interpolation :12-19; `/dev/tcp` readiness probe :36-46; MinIO pin + console port :88-100; `run.sh:32` secret-stability quote verbatim; `Chart.yaml:10` v0.1.7; `Dockerfile:119` dual pnpm build; ports/entrypoint :154-163; `migration.rs:14` sqlx::migrate! verbatim; `main.rs:188-198` BUZZ_AUTO_MIGRATE gate + skip log verbatim; `config.rs:938` clean-authority check; admin auth cross-origin tests.
- **MINOR ×1:** `migration.rs:625-631` version-assert span cited to :835 overshoots by ~5 lines (actual asserts end ≈L830); the len==31 assert sits at L628 within the cited range. Content accurate.
- Structural checks: compose topology (5 services/4 volumes/ordering) ✅; three migration delivery models (embedded auto-migrate, admin subcommand, Helm hook job w/ `--migrate-only`) ✅; **exactly 31 migration .sql files** counted on disk ✅.
- Coverage statement: present (explicit full-read lists, NOT-line-read list, skipped list incl. desktop/web/mobile/.github, no-modification attestation).

---

## Findings Register

| # | Severity | Report | Finding | Suggested action |
|---|---|---|---|---|
| F1 | Minor-factual | mc-workflow-engine.md §11/§12 | "17 named mutexes" vs actual 20 (`_sources/mission-control/.../daemon/data.ts:177-196`) | One-line correction |
| F2 | Cosmetic | mc-ai-providers.md | config.ts:65-68 cite one line long | Optional tighten |
| F3 | Cosmetic | fa-window-tray-notifications.md | index.ts:1493-1495 off-by-one; register-app-menu.ts:75-89 loose range (substance verified elsewhere) | Optional tighten |
| F4 | Cosmetic | bz-ops-deploy-admin.md | migration.rs test-span upper bound ~5 lines over | Optional tighten |

No FAILED citations. No hallucinated paths, fabricated quotes, or invented identifiers detected in any sample.

## Scan Coverage of This Verification

- Read in full: all 5 target reports (~164KB combined).
- Sources opened: `_sources/mission-control` (daemon/, lib/adapters/, execute/test/catalog/financials routes, security/vault/spend modules, service-catalog.json) and `_sources/buzz` (deploy/compose, deploy/charts/buzz, Dockerfile, run.sh, .env.example, crates/buzz-db, crates/buzz-relay, buzz-admin, k8s backend, admin-web) plus `../Fabrica-app` main-process window/tray/notification/index modules — at every sampled citation site.
- Not read: everything outside the sampled citation neighborhoods and structural-check targets (consistent with a spot pass, not a full re-scan).
- Nothing under `_sources/` or `../Fabrica-app/` modified (read/grep only).
