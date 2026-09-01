# Findings & Recommendations — Consolidated Verification, Verdicts, and Priorities

> This document consolidates verification status, recommendation verdicts, contradictions, and residual debt from the Round 4 digest (`round4-findings-digest.md`) and its v2 refresh (`digest-v2-refresh.md`). It is the single reference for what is verified, what each recommendation's current verdict is, what contradictions exist, and what verification work remains.

---

## From `round4-findings-digest.md` — §4: Verified vs Unverified Findings

### 4a. VERIFIED (R4-2.3 spot verification)

Method: ≥10 file:line citations sampled per report and re-opened against sources; total **65 cites checked — 64 exact + 1 minor, 0 failed**; verdict line 20 verbatim: "Zero hard failures across 65 sampled citations."

| Report | Cites checked | Result |
|---|---|---|
| `fa-ipc-watchers.md` | 18 | PASS — 18 exact, 0 failed |
| `bz-db-schema.md` | 15 | PASS — 14 exact + 1 minor, 0 failed |
| `bz-relay-event-kinds.md` | 18 | PASS — 18 exact, 0 failed |
| `fa-autoupdate-build.md` | 14 | PASS — 14 exact, 0 failed |

Findings from this digest resting primarily on those four reports are therefore VERIFIED: C1-C10 capabilities (C1-C9 rest on fa-ipc-watchers/fa-pty-terminal/fa-autoupdate-build — see caveat below for fa-pty-terminal), G8/G10 buzz patterns, FA-T9/T10/T11.

Two MINOR caveats registered by R4-2.3:
- **V-R4-1** (R4 spot verification lines 74,81,149): bz-db-schema's push-gateway "runtime guards" cites (`postgres.rs:472,:523-532,:627-665`) sit inside `#[cfg(test)] mod tests` (starts `postgres.rs:407`), not production code; production runner is `apply_migrations_and_grants` (:19-23). Substance stands; treat those specific cites as test-module evidence.
- **V-R4-2** (lines 51,150): fa-ipc-watchers' usage-provider template-literal family labeled "×5 channels" (`usage-provider-handlers.ts:34-57`) actually registers 8 channels (`getSnapshot/getBreakdown/getRecentSessions` also present, :41-61); the five named channels were correctly cited — only the family-size label undercounts.

### 4b. UNVERIFIED at Round-4 level (no spot verification pass has sampled their cites)

| Report | Status |
|---|---|
| `mc-adapters-linelevel.md` (basis of G5, G6, parts of G7, FA-T2, FA-T5) | UNVERIFIED — self-reports full-file reads + coverage statement (lines 201-203); no independent cite check found |
| `mc-workflow-engine.md` (basis of G2, G3, G4, FA-T2, FA-T3, FA-T4) | UNVERIFIED — self-report states "All line numbers verified against the frozen sources during this session (2026-08-23)" (coverage lines 267-275) but no cross-worker pass |
| `mc-service-catalog.md` (basis of G7, N2, N3) | UNVERIFIED — structural claims self-checked via JSON parse (§7-§8); no independent pass |
| `mc-ai-providers.md` (basis of G1, G9, FA-T1, FA-T7) | UNVERIFIED — negative-result greps documented but no cross-worker cite check (coverage lines 213-245) |
| `fa-pty-terminal.md` (basis of C1-C5, C8, FA-T3 detection substrate) | UNVERIFIED — checkpoint shows R4-1.7 "awaiting orchestrator verification" (`Fabrica-atlas-tasks.md` Checkpoint, Current Task cell) |

Discrepancy warning: R4 spot verification line 164 asserts "all other Round 4 reports already covered by R4-2.1/R4-2.2" — but R4-2.1 verified the ROUND 3 reports (`Fabrica-atlas-tasks.md` row R4-2.1: "Spot verification of all 7 discovery reports") and R4-2.2 was hygiene fixes. No round-4-level pass covers these five reports. Until one exists, downstream consumers should label their claims "unverified (self-reported coverage)".

### 4c. Verification lineage summary

- Verified this round: fa-ipc-watchers, bz-db-schema, bz-relay-event-kinds, fa-autoupdate-build (R4-2.3, 0 failed).
- Verified prior rounds only: all seven round3 reports (R4-2.1: 164 cites, 1 error found and fixed via R4-2.2).
- Never independently verified: the five reports listed in §4b.

---

## From `round4-findings-digest.md` — Round 4 Closure Addendum

> ATLAS R4-3.3 · task_ce0b894a93cc · dispatch ctx_f587d4eff648 · Group 3 closure synthesis · 2026-08-23
>
> APPEND-ONLY addendum: integrates Round 4 wave-2/wave-3 material published after the digest body (§1–§5 unchanged above this line). Sources read in full this session: R4 wave-2/3 verification passes; discovery reports `fa-window-tray-notifications.md`, `bz-ops-deploy-admin.md`, `fa-git-integration.md`, `fa-settings-config-datadirs.md`, `bz-search-pubsub.md`, `mc-notifications-alerting.md` (via full-read research passes returning verbatim citations). Citation conventions as in the digest header.

### A1. Verification status of wave-2/3 findings (now VERIFIED)

The digest's §4b unverified list is now substantially retired:

| Report | Wave | Result |
|---|---|---|
| `mc-workflow-engine.md` | W2 (`round4-wave2-spot-verification.md` §1) | PASS — 24 cites: 23 exact + 1 factual nit |
| `mc-ai-providers.md` | W2 (§2) | PASS — 20 cites: 19 exact + 1 cosmetic |
| `mc-service-catalog.md` | W2 (§3) | PASS — 19 cites exact; headline numbers reproduced digit-for-digit (64 services / 6 adapters / auth 42-21-1 / risk 20-40-4) |
| `fa-window-tray-notifications.md` | W2 (§4) | PASS — 51 cites: 49 exact + 2 cosmetic |
| `bz-ops-deploy-admin.md` | W2 (§5) | PASS — 32 cites: 31 exact + 1 cosmetic; exactly 31 migration .sql files counted |
| `fa-git-integration.md` | W3 (`round4-wave3-spot-verification.md` §Report 1) | PASS — 16/16 exact |
| `fa-settings-config-datadirs.md` | W3 (§Report 2) | PASS — 17 exact + 1 cosmetic off-by-one (`shared/fabrica-profiles.ts:4/:5` → actual :3/:4) |
| `bz-search-pubsub.md` | W3 (§Report 3) | PASS — 14/14 exact |
| `mc-notifications-alerting.md` | W3 (§Report 4) | PASS — 17/17 exact |

Wave totals: W2 = 146 cites → 140 exact / 5 minor / **0 failed**; W3 = 65 cites → 64 exact / 1 minor / **0 failed**. One factual correction was applied by W2 and supersedes the digest where relevant:

- **Correction CA-1 (mutex registry size):** `mc-workflow-engine.md` claimed "17 named mutexes" at `_sources/mission-control/.../daemon/data.ts:176-195`; actual registry (`data.ts:177-196`) contains **20** entries (`round4-wave2-spot-verification.md` Findings Register F1). Downstream consumers of G4/FA-T4 should use 20.

Per the board no-content-rewrite rule, corrections to the digest body itself are recorded here rather than edited in place. Two further register items recommended by later waves for adoption at closure (from R4 master index §D3 items 4–5):

- **Correction CA-2 (C7 refinement):** W6 verified `fa-agent-hooks-probes.md` and found the digest's C7 "15+ CLIs / 14 channels" picture should read **14 managed hook targets vs 18 live `/hook/*` pathnames** (`round4-wave6-spot-verification.md`; independently reproduced). C7's substrate claim stands.
- **Note CA-3 (stale self-reference):** the digest body cites `discovery/fabrica-app/ai-vault-browser.md`; actual path is `discovery/fabrica-app/ai-vault-browser.md` (flagged by `round4-consistency-audit.md`, left per no-rewrite rule).

### A2. Wave-2/3 findings integrated (post-digest discoveries)

#### Fabrica-app

- **Single-instance lock IS the CLI↔desktop contract.** Lock key = userData profile; discovery files `FABRICA-runtime.json` (RPC endpoint + authToken) and `agent-hooks/endpoint.env` are how bundled CLIs find the running app (`src/main/startup/single-instance-lock.ts:22-33`, call order `src/main/index.ts:656/:801`); stable exit code 3 = "another process owns this profile", usable by systemd `RestartPreventExitStatus=` (`single-instance-lock.ts:5-12`, `index.ts:809-814`). Headless serve mode keeps the app alive through window churn with desktop promotion gated on daemon-backed persistent PTYs ("fail-closed `'persistent PTY provider unavailable'`", `startup/serve-desktop-activation.ts:12-28`) — substrate for supervising agents without visible UI (`fa-window-tray-notifications.md` §3/§5; verified W2 §4).
- **Complete attention-signaling pipeline ready for agent alerts:** tray amber dot lit before cooldown/focus gates and cleared on reveal (`ipc/notifications.ts:397-403`; `index.ts:1497-1498`); 5 s burst dedupe keyed by worktree, LRU cap 50 (`ipc/notifications.ts:33-34,445-452`); click-to-navigate targets the exact pane leafId (`ipc/notifications.ts:511-546`); agent-state copy normalized across 13 agent types with `blocked|waiting → "needs input"` (`notification-options.ts:7-21,:60-65`); macOS permission machinery via bundled helper `FABRICA-notification-status` because Electron exposes no authorization API (`ipc/notification-authorization-status.ts:12-43`). Mobile mirror replays missed events to reconnecting clients from a monotonic-seq buffer (`runtime/fabrica-runtime.ts:12685-12740`; `runtime/mobile-notification-replay.ts:8-19`) (`fa-window-tray-notifications.md` §4-§7).
- **Negative findings (net-new surface):** `globalShortcut` never imported in src/main (nothing works system-wide when unfocused); no deep links (`setAsDefaultProtocolClient` zero hits); **no Linux tray** (`system-tray.ts:225-228`); no `setLoginItemSettings` anywhere (`fa-window-tray-notifications.md` §6 item 7, §2.7; greps confirmed W2 §4).
- **Git plane = raw child_process, fully centralized, zero git libraries** — "All git execution is raw `node:child_process` centralized in `main/git/runner.ts` (~1838 lines)" with a 10 MB default buffer (`DEFAULT_GIT_MAX_BUFFER`, `runner.ts:305-306`) and 15 s sync timeout (`runner.ts:1268-1269`) (`fa-git-integration.md:13`; verified W3 Report 1). **Worktree-per-agent is already the product substrate:** "`worktrees:create` mints `worktreeId = ${repo.id}::${created.path}` (`ipc/worktree-remote.ts:2380`) and PTY panes, runtime state, and terminal tabs are all keyed by it"; removal fences agent processes first (`fa-git-integration.md:15,:186`).
- **Agent-aware selective credential guard (unique finding):** applies only to recognized agent processes — `isUnattended: opts.launchAgent !== undefined` (`ipc/pty.ts:1714-1719`) — so "**User terminals keep normal Git behavior**" while "unattended agents must fail instead of looping on OS credential prompts" (`shared/terminal-git-credential-guard.ts:10-54`; `fa-git-integration.md:272-273`). No token injection exists anywhere (no `http.extraHeader`/embedded-token rewriting; defense = redaction + non-interactivity env `GIT_TERMINAL_PROMPT=0`, `shared/git-credential-prompt-env.ts:92`) (`fa-git-integration.md:278-279`).
- **Spawn-free freshness pattern:** `.git` metadata watched/polled directly with tiered classification, debounced 250 ms — "Keep it spawn-free" replacing `git worktree list` fanout (`ipc/worktree-head-identity-reader.ts:5-7`; `fa-git-integration.md:16,:339`); behavioral capability probing with 30-min negative-result memory keyed `'local'` vs `'wsl:<distro>'` (`shared/git-capability-cache.ts:3,:5-10`; `fa-git-integration.md:78`).
- **One canonical config store + the CLI/app runtime pointer:** single JSON document `FABRICA-data.json` managed by one `Store` class in `src/main/persistence.ts` (7,679 lines) with tmp→fsync→rename writes, hash-skip identical writes, corrupt-recovery backup ring `BACKUP_COUNT = 5` / 1 h spacing (`persistence.ts:343-352,:535-537`; `fa-settings-config-datadirs.md:11,:140-152`); bundled CLI finds the desktop runtime via `FABRICA-runtime.json` containing "runtimeId, pid, transports (unix/named-pipe/websocket), authToken, startedAt … reclaimed if publisher pid dead" (`src/cli/runtime/metadata.ts:53-69` region; `fa-settings-config-datadirs.md:15,:271-276`). Persistence is guard-stamped one-shot migrations (~28 catalogued), NOT schema-version-driven (`SCHEMA_VERSION = 1` never bumped, `shared/constants.ts:49`) (`fa-settings-config-datadirs.md:16,:190-223`).
- **Rebrand hard-break register (extends FA-T9):** renaming "'<appName> Safe Storage'" makes ALL safeStorage ciphertext undecryptable; persisted enum literal `'FABRICA-first'` (`shared/constants.ts:288`); Chromium partition `persist:FABRICA-browser` orphans browser data; ~130 `FABRICA_*` env vars recommend aliasing old names indefinitely; hook bundles named 'FABRICA-status' across claude/codex/grok/devin agent homes (`fa-settings-config-datadirs.md:286-298`). Recommended strategy: "**a. Keep on-disk filenames and partition strings unchanged (opaque identifiers); change only display surfaces**" (`fa-settings-config-datadirs.md:308-309`).

#### buzz

- **Search = Postgres FTS via generated column — index-as-side-effect-of-insert, zero consistency window:** "every row write *is* the index update — there is no separate indexer, no mpsc queue, no reindex job, no consistency window" (`crates/buzz-search/src/lib.rs:7-10`); `search_tsv TSVECTOR GENERATED ALWAYS AS (...) STORED` + GIN index (`migrations/0001_initial_schema.sql:222-226,:278`) — direct template for a searchable agent-output archive (`bz-search-pubsub.md` §2-§3; verified W3 Report 3).
- **Storage-level privacy allowlist:** fresh-install allowlist of kinds `{0, 9, 40002, 45001, 45003}` get a tsvector (`migrations/0008_fresh_install_search_allowlist.sql:1-23`); p-gated kinds stored with NULL `search_tsv` plus a Rust↔SQL drift regression test (`crates/buzz-core/src/kind.rs:144-154`); search "returns candidate hits that the relay re-authorizes per hit" (`crates/buzz-search/src/query.rs:1-9`; gate chain `crates/buzz-relay/src/handlers/req.rs:773-786`) — reusable for secrets-bearing agent output (`bz-search-pubsub.md` §4-§5).
- **Refcount + debounce pub/sub (live-tailing blueprint):** `retain_topic`/`release_topic` refcount map with 500 ms unsubscribe debounce (`crates/buzz-pubsub/src/lib.rs:192-245`, default `lib.rs:80-96`); reconnect-safe desired-state snapshotting (`subscriber.rs:86-98`); backoff 1 s→30 s (`subscriber.rs:14-17`); presence with heartbeat-scaled TTL `PRESENCE_TTL_SECS = 180` = "3× the 60s heartbeat" (`presence.rs:15-16`) — directly reusable for agent online/offline status (`bz-search-pubsub.md` §6-§8).
- **K8s agent-deployment blueprint (bz-ops-deploy-admin):** agent-to-Kubernetes provider protocol reads ONE JSON request from stdin, writes ONE response to stdout, exit code carries one bit (`src/main.rs:1-9`), with self-describing `protocol_version` + `config_schema` so UI renders config forms without cluster contact (`src/wire.rs:11,21-26,131-140`) and golden wire fixtures (`tests/fixtures/provider-wire/*.json`); intent-fingerprint reconcile loop with an anti-hot-loop guard — once THIS call created the pod, replace-classification errors out instead of hot delete/create cycling "which minted 107 Secrets in 600s in measurement" (`reconcile.rs:363-373,406-428`) (`bz-ops-deploy-admin.md` §§k8s; verified W2 §5).
- **Fail-fast operator posture:** CHANGE_ME-placeholder refusal before start ("Generate stable secrets first", `run.sh:19-36`); fatal unsafe combos like membership-without-owner (`main.rs:230-252`); admin web SPA served by the relay binary is gated purely by Host-header equality + Origin match with strict CSP/no-store (`api/admin/auth.rs:16-40`; `mod.rs:38-60`) — report flags real auth must be added on top (`bz-ops-deploy-admin.md` §admin).

#### mission-control

- **Diff-polling run detector with first-fetch suppression:** `seenRunIds` ref diffs successive 3 s polls; "the FIRST fetch seeds the set without toasting so pre-existing/historical failures never spam" (`use-active-runs.ts:14-16,:36-39`; completion toast :41-45, failure toast :47-54) — port into Electron main to drive OS notifications (`mc-notifications-alerting.md` §3; verified W3 Report 4).
- **Loop-detection escalation into a decision queue:** after `MAX_LOOP_ATTEMPTS = 3` failures, a pending decisions entry is written with options Retry/Skip/Stop-mission (`run-task.ts:374,:485-543`; dedupe :512-516); mission-level rollup reports aggregate one inbox message per cycle with subject branching `"Mission complete: X/Y tasks done"` vs `"Mission stalled: ..."` (`run-task.ts:376-443`, subject branches :386-389) (`mc-notifications-alerting.md` §3-§4).
- **Three-counter ambient-state endpoint:** one-pass `/api/sidebar` computing `unreadInbox`, `pendingDecisions`, `pendingFieldApprovals` (`src/app/api/sidebar/route.ts:15-19`) — generalizes to blocked-agents / awaiting-approval / failed-runs badges (`mc-notifications-alerting.md` §5).
- **Anti-patterns to design past (negative findings):** pull-only delivery — poll failures swallowed silently so "a dead backend produces NO operator signal at all" (`use-active-runs.ts:72-74`); visibility-gated polling slows alerts when hidden (`use-sidebar.ts:48-50`); mark-as-read implicit on thread expand can silently clear alerts (`inbox/page.tsx:393-396`); **no aging escalation exists** — pending approvals never time out (`mc-notifications-alerting.md` §§5.3a-c, 7.2). Headline negatives: exactly 4 in-app channels, **zero outbound transports**, no quiet hours/severity tiers (~90 cites + zero-hit negative searches).

### A3. Round 4 items still UNVERIFIED at closure

Per R4 master index §A legend and §D3 item 3 (as of 2026-08-23):

| Report | Status | Consequence |
|---|---|---|
| `mc-adapters-linelevel.md` (basis of G5, G6, parts of G7, FA-T2, FA-T5) | HYG only (encoding/coverage check, R4-4.2) — content NOT factually re-checked | Digest claims from it remain "unverified (self-reported coverage)" |
| `fa-pty-terminal.md` (basis of C1-C5, C8, FA-T3 detection substrate) | HYG only (BOM stripped R4-4.2) | Same caveat |
| `fa-wsl-remote-execution.md` (WSL/remote plane; ~120 cites + risk register) | HYG(4.3) only — no factual spot pass | Same caveat |
| `bz-pair-relay-cli.md` (pair-relay + pairing-cli; ~120 cites) | NONE — neither factual nor hygiene pass (written after both sweeps) | Treat all claims as unverified |

Also still open at closure (master-index §D2): three assigned discovery reports never landed — `fa-auth-onboarding.md` (R4-1.13), `bz-voice-media.md` (R4-1.14), `mc-ui-frontend.md` (R4-1.22) — any Round 5 plan should re-dispatch or formally drop them. Aggregate spot-verification record across waves W0/W2–W8: ~500+ citations sampled, **0 FAILED** anywhere (`round4-master-index.md` §B aggregate line).

### A4. New actionable recommendations (task-ready, wave-2/3 sourced)

Fabrica-app notes (extend §3a numbering):

- **FA-T12 (CLI↔desktop contract, from fa-window-tray-notifications + fa-settings-config-datadirs)** — Formalize the existing single-instance lock + discovery-file pair as THE agent-management control channel: lock keyed by userData profile with stable exit code 3 (`single-instance-lock.ts:5-12,:22-33`), `FABRICA-runtime.json` carrying runtimeId/pid/transports/authToken and pid-liveness reclaim (`fa-settings-config-datadirs.md:271-276`), headless serve mode with persistent-PTY-gated desktop promotion (`serve-desktop-activation.ts:12-28`). Do not invent a second discovery mechanism alongside these.
- **FA-T13 (operator alerting, from fa-window-tray-notifications × mc-notifications-alerting)** — Reuse FA's complete attention pipeline (tray pre-gate lighting `notifications.ts:397-403`, burst dedupe :445-452, click-to-pane :511-546, 13-agent-type copy normalization `notification-options.ts:7-21`) and port MC's diff-poll first-fetch suppression (`use-active-runs.ts:36-39`) into main-process-driven OS notifications. Fill the four gaps MC proves matter: dead-backend signal (MC swallows poll errors, `use-active-runs.ts:72-74`), explicit seen-vs-acknowledged separation (implicit mark-read `inbox/page.tsx:393-396`), aging escalation for approvals pending >N minutes (absent in MC, §7.2), and outbound transports beyond in-app channels (MC has zero).
- **FA-T14 (rebrand strategy upgrade, from fa-settings-config-datadirs §rebrand)** — Amend FA-T9/T11 with the cheaper alternative: "keep on-disk filenames and partition strings unchanged (opaque identifiers); change only display surfaces" (`fa-settings-config-datadirs.md:308-309`) — avoids the safeStorage-undecryptable break, the `persist:FABRICA-browser` orphaning, the `'FABRICA-first'` literal, and the dual-side path-mirroring hazard (:286-298) entirely.
- **FA-T15 (searchable agent archive, from bz-search-pubsub)** — For any future agent-transcript search feature, adopt the generated-tsvector pattern (index update IS the row write, `crates/buzz-search/src/lib.rs:7-10`) together with its privacy discipline: positive kind allowlist (`migrations/0008_fresh_install_search_allowlist.sql:1-23`), NULL-tsv for p-gated kinds with drift test (`kind.rs:144-154`), and mandatory per-hit re-authorization (`query.rs:1-9`). Note buzz's own flagged gap: turn-metrics ciphertext is deliberately unsearchable, so plaintext-over-agent-reasoning requires the same allowlist discipline (`migrations/0005_agent_turn_metric_fts.sql:1-4`).
- **FA-T16 (fleet live-status plumbing, from bz-search-pubsub)** — Port the refcount+debounce topic manager for pane/tab event subscriptions (`lib.rs:192-245`, 500 ms debounce) and heartbeat-scaled presence TTL (TTL = 3× heartbeat, `presence.rs:15-16`) for agent online/offline indicators; separate pure cache-invalidation hints from imperative control actions on distinct channels (`cache_invalidation.rs:9-13`; `conn_control.rs:10-15`) with DB-row backstop so a ban/disconnect survives publish loss (`conn_control.rs:14-15`).
- **FA-T17 (deploy-agents-to-cluster blueprint, from bz-ops-deploy-admin)** — If cluster deployment is scoped, start from buzz's k8s provider: stdin/stdout single-JSON wire protocol with golden fixtures (`main.rs:1-9`; `wire.rs:11,21-26`), intent-fingerprint reconcile with anti-hot-loop guard (`reconcile.rs:363-373,406-428`), ambient-kubeconfig-only auth (no credentials in provider_config, `config.rs:1-8`), and fail-fast config validation (`run.sh:19-36`).
- **FA-T18 (git-plane reuse, from fa-git-integration)** — Treat `main/git/runner.ts` as the general CLI-tool-runner precedent for FA-T1: raw execFile centralization, behavioral capability probes with negative caching (`git-capability-cache.ts:3,:5-10`), locale pinning env, and the selective agent credential guard (`pty.ts:1714-1719`) as the template for ANY unattended-vs-interactive behavior split.

Notes for other boards (extend §3b):

- **Note N4 (MC alerting gaps are upstream-fixable):** mc-notifications-alerting documents zero outbound transports, silent poll-error swallowing, implicit mark-as-read, and no approval aging escalation — worth filing upstream if MC remains maintained (`mc-notifications-alerting.md` §§5-7).
- **Note N5 (buzz admin-web needs real auth before any external exposure):** Host-header-equality gating only (`api/admin/auth.rs:16-40`); fine for localhost compose, not for shared deployments (`bz-ops-deploy-admin.md` §admin).

---

## From `digest-v2-refresh.md` — §1: Verification-status refresh

> The digest's §4b unverified list and Closure Addendum §A3 are both substantially stale after Rounds 4 waves 4-8 and Round 5. Current truth:

| Report backing digest items | Status at R4-3.2 time | Status NOW | Evidence |
|---|---|---|---|
| fa-ipc-watchers.md | VERIFIED (R4-2.3, 18 exact / 0 failed) | VERIFIED | R4-2.3 |
| bz-db-schema.md | VERIFIED (15 cites, V-R4-1 caveat) | VERIFIED | same |
| bz-relay-event-kinds.md | VERIFIED (18 exact) | VERIFIED | same |
| fa-autoupdate-build.md | VERIFIED (14 exact) | VERIFIED | same |
| mc-workflow-engine.md | UNVERIFIED | **VERIFIED-PASS** (24 cites: 23 exact + 1 factual nit -> CA-1 fix) | R4 W2 |
| mc-ai-providers.md | UNVERIFIED | **VERIFIED-PASS** (20 cites: 19 exact + 1 cosmetic) | same |
| mc-service-catalog.md | UNVERIFIED | **VERIFIED-PASS** (19 exact; headline numbers digit-for-digit) | same |
| fa-window-tray-notifications.md | n/a | VERIFIED-PASS (51 cites) | same |
| bz-ops-deploy-admin.md | n/a | VERIFIED-PASS (32 cites) | same |
| fa-git-integration.md | n/a | VERIFIED-PASS (16/16) | R4 W3 |
| fa-settings-config-datadirs.md | n/a | VERIFIED-PASS (17 exact + 1 cosmetic) | same |
| bz-search-pubsub.md | n/a | VERIFIED-PASS (14/14) | same |
| mc-notifications-alerting.md | n/a | VERIFIED-PASS (17/17) | same |
| fa-telemetry-consent.md | n/a | VERIFIED-PASS (wave-4 pair: 36 exact / 1 minor) | R4 W4 |
| fa-command-palette-search.md | n/a | VERIFIED-PASS (same pass) | same |
| mc-execute-guards.md | n/a | VERIFIED-PASS (~75 cites: 73 exact / 2 cosmetic / 0 failed) | R4 W5 |
| fa-plugin-runtime.md | n/a | VERIFIED-PASS (same pass) | same |
| fa-agent-hooks-probes.md | n/a | VERIFIED-PASS (44 cites: 41 exact / 3 minor / 0 failed; 14/18 counts reproduced from source) | R4 W6 |
| mc-fieldtask-kanban.md | n/a | VERIFIED-PASS (~115+ cites: 0 failed) | R4 W7 |
| mc-decision-gates.md | n/a | VERIFIED-PASS (same pass; finding F3 noted below) | same |
| fa-mobile-companion.md | n/a | VERIFIED-PASS (wave-8: 29 exact / 3 cosmetic / 0 failed) | R4 W8 |
| **mc-adapters-linelevel.md** | UNVERIFIED | **STILL HYG-ONLY** (encoding/coverage only; content never factually re-checked) | round4-consistency-audit.md; master-index A3 |
| **fa-pty-terminal.md** | UNVERIFIED | **STILL HYG-ONLY** (BOM stripped only) | same |
| **fa-wsl-remote-execution.md** | HYG only | **STILL HYG-ONLY** (no factual spot pass ever ran; planned wave-8 slot went to fa-mobile-companion instead) | cross-project-notes-r4 status table; tracker |
| bz-pair-relay-cli.md | NONE | **VERIFIED-PASS** (R5 wave1-b: 33 exact / 1 minor cosmetic / 0 failed) | R5 W1-b |

Also resolved since the Addendum: the three "never landed" reports listed in A3 (`fa-auth-onboarding.md`, `bz-voice-media.md`, `mc-ui-frontend.md`) ALL landed and were spot-verified PASS in Round 5 wave 1 (R5 W1-a and W1-b). The A3 re-dispatch-or-drop question is closed: landed + verified.

Aggregate citation record across all passes W0/W2-W8 + R5 waves: ~850+ cites sampled, **0 conclusion-affecting failures anywhere** (per r5-convergence-memo.md and the tracker rows above).

---

## From `digest-v2-refresh.md` — §2a: Verdicts for FA-T1..T11

| ID | Recommendation (one-line) | Verdict | Basis |
|---|---|---|---|
| **FA-T1** | Provider-neutral runner abstraction over PTY seeded with MC's Spawn trio | **CONFIRMED - STRENGTHENED** | Core donor report mc-ai-providers.md now VERIFIED-PASS (W2). Substrate side upgraded decisively: fa-agent-hooks-probes.md VERIFIED-PASS (W6) calls TuiAgentConfig "a SpawnSpec-in-waiting" with HIGH fit / LOW parallel-machinery risk, and names the concrete deliverables (cross-project-notes-r4.md FA-N1: derive SpawnSpec from `src/shared/tui-agent-config.ts:20-47`; collapse 14 copy-paste `agentHooks:<agent>Status` channels `src/main/ipc/agent-hooks.ts:142-323`; extract per-provider parsing from server.ts). fa-git-integration.md (W3 PASS) adds main/git/runner.ts raw-execFile centralization as a second in-repo precedent (digest FA-T18). Only revision: fleet-count figure inside C7 (see contradiction K1). |
| **FA-T2** | Approval-gated autonomy layer for irreversible actions; one guard stack at the IPC boundary | **CONFIRMED - STRENGTHENED** | mc-execute-guards.md (W5 VERIFIED-PASS, ~120 cites) independently mapped the full 13-layer ordered guard stack and produced the 12-item weakness register + 8-item port map that became notes-r4 FA-N7's 7-item FIX-BEFORE-PORT list (creation-path approval hole, batch bypass, no owner check on execute route, dead SOFT_LIMIT config - negative claim independently reproduced during verification). Enforcement point register-core-handlers.ts:109-234 unchanged (fa-ipc-watchers.md, R4-2.3 PASS). Residual caveat: G5/G6 halves resting on mc-adapters-linelevel.md remain factually unverified (HYG-only), but every load-bearing pattern of FA-T2 is double-covered by the verified execute-guards report. |
| **FA-T3** | Decision-gate escalation: runaway loops freeze dispatch into structured questions | **CONFIRMED** | mc-decision-gates.md now VERIFIED-PASS (W7): DecisionItem schema, Zod limits (QUESTION 500 / ANSWER 500 / CONTEXT 5000 / MAX_OPTIONS 20), six independent run-blocking enforcement points, answer injection via buildRetryContext latest-answer-only - all reproduced by verifiers. Wave-7 finding F3 (report sec 2.3 mischaracterizes `withDecisions` as write-back; it is a read-only-in-lock helper) does NOT touch any mechanic FA-T3 relies on. Fix-before-port items carried forward intact into FA-N8 (no consumption marker, mutex-vs-raw-fs race, no auth on endpoints, unbounded duplicate churn, no TTL). Caveat: the detection-substrate half citing fa-pty-terminal.md (OSC-133 / inference helpers) rests on a report that is STILL HYG-ONLY - see residual debt D2. |
| **FA-T4** | Fleet supervision: persistent retry queue, continuation chains, global slot math; replace MC JSON+mutex persistence with real IPC+SQLite | **CONFIRMED - ONE FIGURE REVISED** | mc-workflow-engine.md now VERIFIED-PASS (W2); mc-ai-providers.md VERIFIED-PASS (W2). Correction CA-1 applies everywhere downstream: the per-file mutex registry holds **20** entries, not 17 - independently reproduced THIS SESSION at `src/lib/data.ts:177-196`. The persistence-redesign recommendation itself ("direct-write paths bypass the mutexes... Fabrica's Electron/Rust layer can replace these with real IPC + SQLite", mc-workflow-engine.md sec 12 item 5) is unaffected and remains CONFIRMED. |
| **FA-T5** | Adapter registry (ServiceAdapter contract) + catalog-as-data with honest manual fallback; reconcile vocabularies | **CONFIRMED (split evidence quality)** | Catalog half fully verified: mc-service-catalog.md W2 PASS with headline numbers reproduced digit-for-digit (64 services / 6 native adapters / auth 42-21-1 / risk 20-40-4; 64 re-confirmed by JSON parse this session). Adapter-contract half (types.ts:102-144, registry.ts:13-47) still rests on mc-adapters-linelevel.md which is HYG-ONLY - keep the "unverified (self-reported coverage)" label on those specific cites until a pass runs (residual debt D1). |
| **FA-T6** | Durable SQL-backed task/run/approval persistence on buzz's workflow quartet | **CONFIRMED** | bz-db-schema.md VERIFIED (R4-2.3, 14 exact + 1 minor). Minor caveat V-R4-1 (push-gateway cites sit inside `#[cfg(test)] mod tests`) touches the push-lease/queue portion only; the workflow quartet cites (0001_initial_schema.sql:362-466, workflow.rs:328-376 etc.) were verified exact. Net-new-table note (bz-db-schema.md sec E) unchanged. |
| **FA-T7** | Usage/cost ledger from agent_metric_index shape + budget enforcement MC lacks | **CONFIRMED** | Both donors now verified: bz-db-schema.md (R4-2.3 PASS) and mc-ai-providers.md (W2 PASS, including the "daemon LLM spend has no budget cap - only observability" NOTE). Stale-path nit CA-3: the reconciliation reference should read `discovery/fabrica-app/ai-vault-browser.md` (double round3 dir), flagged by consistency audit; path only, content unaffected. |
| **FA-T8** | Adopt buzz transport as-is if multi-host agent channels planned; do NOT carry MC polling where push IPC exists | **CONFIRMED** | bz-relay-event-kinds.md VERIFIED (18/18 exact, R4-2.3). The anti-recommendation (polling-over-HTTP rejection, fa-ipc-watchers.md:406) sits on an R4-2.3-PASS report. Post-digest reinforcement: notes-r5 (cross-project-notes-r5.md) adds chain-dispatch/reconciler patterns on top without contradicting anything here. |
| **FA-T9** | Rebrand guardrails: audit feed URLs, appId decision, publisher/SignPath strings, userData migration | **REVISED - STRATEGY SUPERSEDED BY FA-T14** | Baseline facts all VERIFIED (fa-autoupdate-build.md, 14/14 exact, R4-2.3). But the Closure Addendum's FA-T14 (from fa-settings-config-datadirs.md, W3 PASS) supersedes the expensive parts of the strategy: "keep on-disk filenames and partition strings unchanged (opaque identifiers); change only display surfaces" (`fa-settings-config-datadirs.md:308-309`) avoids the safeStorage-undecryptable break ('<appName> Safe Storage' rename), the `persist:FABRICA-browser` orphaning, the `'FABRICA-first'` literal, and ~130 FABRICA_* env-var mirroring (:286-298) entirely. Treat FA-T9 as the audit checklist; FA-T14 as the chosen strategy. |
| **FA-T10** | Staged rollout greenfield (cohort-based latest*.yml routing) | **CONFIRMED** | fa-autoupdate-build.md VERIFIED (R4-2.3): stagingPercentage zero-match negative claim stands; generic-feed architecture makes server-side percentage routing straightforward (report sec E). |
| **FA-T11** | Watcher stack preservation + `<namespace>:<action>` channel strings as three-layer public contract | **CONFIRMED** | fa-ipc-watchers.md VERIFIED (18/18 exact incl. canary/fuse/quarantine cites; "highest-risk subsystem to preserve verbatim" warning at :407). Minor label fix V-R4-2 (usage-provider family is 8 channels, not 5) does not affect the contract claim; if anything a LARGER preload surface strengthens it. |

---

## From `digest-v2-refresh.md` — §2b: Verdicts for FA-T12..T18

| ID | Recommendation | Verdict | Basis |
|---|---|---|---|
| **FA-T12** | Formalize single-instance lock + discovery files as THE CLI<->desktop control channel | **CONFIRMED - STRENGTHENED** | Both source reports VERIFIED-PASS (fa-window-tray-notifications W2 51 cites; fa-settings-config-datadirs W3 17+1). Since the Addendum, R5 deep dive fa-multi-instance.md (discovery/fabrica-app/fa-multi-instance.md, 36.5KB, ~90 cites: lock key = userData profile, exit-code-3 supervisor contract, FABRICA_USER_DATA_PATH targeting, hook receiver port-0 loopback + endpointNamespace seam, L1-L10 leak register) maps exactly this surface in greater depth. Its own factual spot pass is assigned but IN_PROGRESS (R5-2.12) - treat its extra detail as strong-pending. Nothing contradicts the recommendation; "do not invent a second discovery mechanism" stands. |
| **FA-T13** | Operator alerting: reuse FA attention pipeline + port MC diff-poll first-fetch suppression; fill 4 proven gaps | **CONFIRMED** | fa-window-tray-notifications.md W2 PASS (tray pre-gate :397-403, burst dedupe, click-to-pane, 13-type copy normalization) + mc-notifications-alerting.md W3 PASS (first-fetch suppression use-active-runs.ts:36-39; zero outbound transports; silent poll-error swallowing; implicit mark-read; no aging escalation). All four gap-fills remain valid. |
| **FA-T14** | Rebrand strategy upgrade: opaque on-disk identifiers, change display surfaces only | **CONFIRMED - now the governing strategy** | fa-settings-config-datadirs.md W3 PASS (:308-309 quote verified region). Supersedes the strategy portions of FA-T9/T11 as described in verdict FA-T9. Also adopted by downstream syntheses: atlas-risk-register.md P0/P1 rows and atlas-executive-summary.md adoptions already assume it - consistent, no conflict. |
| **FA-T15** | Searchable agent archive via generated-tsvector + privacy allowlist discipline | **CONFIRMED** | bz-search-pubsub.md W3 PASS 14/14 exact (index-update-is-the-row-write lib.rs:7-10; fresh-install allowlist migrations/0008; NULL-tsv p-gating + drift test kind.rs:144-154; per-hit re-auth query.rs:1-9). |
| **FA-T16** | Fleet live-status plumbing: refcount+debounce topics, heartbeat-scaled presence TTL | **CONFIRMED** | Same W3 PASS report (lib.rs:192-245, presence.rs:15-16, conn_control/cache_invalidation channel split). |
| **FA-T17** | Deploy-agents-to-cluster blueprint from buzz k8s provider wire protocol | **CONFIRMED** | bz-ops-deploy-admin.md W2 PASS 31/32 exact (stdin/stdout single-JSON wire.rs; anti-hot-loop reconcile.rs:363-373,406-428 incl. the 107-Secrets-in-600s measurement; fail-fast run.sh:19-36). |
| **FA-T18** | Git plane as general CLI-tool-runner precedent feeding FA-T1 | **CONFIRMED** | fa-git-integration.md W3 PASS 16/16 exact (runner.ts centralization, git-capability-cache negative caching, selective agent credential guard pty.ts:1714-1719 "user terminals keep normal Git behavior"). |

---

## From `digest-v2-refresh.md` — §2c: Verdicts for Notes N1-N5

| ID | Note | Verdict | Basis |
|---|---|---|---|
| **N1** | Verification debt: five reports lack verification before feeding external tasks | **SUPERSEDED (3 of 5) / PARTIALLY OPEN (2 of 5)** | mc-workflow-engine, mc-service-catalog, mc-ai-providers: all VERIFIED-PASS in wave-2 (see sec 1). Remaining open: mc-adapters-linelevel.md and fa-pty-terminal.md (both HYG-only). The note's intent is absorbed by residual-debt items D1/D2 in sec 4. |
| **N2** | Use 64 services (not ~66/~67); 6 native adapters = 9.4% coverage | **CONFIRMED - REPRODUCED** | JSON-parse count = 64 again this session. Upstream mc-adapters-linelevel.md still carries "~66" at its lines 39/:180 per the no-content-rewrite rule - downstream consumers MUST keep using 64. No contradiction with W2's digit-for-digit service-catalog reproduction. |
| **N3** | `freshdeck-mcp` likely upstream typo worth checking before copying catalog data | **CONFIRMED - STILL OPEN** | String present today at `service-catalog.json:1018` (digest said :1014 - cosmetic drift, same entry). Never resolved upstream; flag survives into any catalog-as-data port (FA-T5). |
| **N4** | MC alerting gaps upstream-fixable (zero outbound transports etc.) | **CONFIRMED** | All four negatives stand on mc-notifications-alerting.md W3 PASS + negative-search evidence; unchanged since. |
| **N5** | buzz admin-web needs real auth before external exposure | **CONFIRMED** | Host-header-equality-only gating (bz-ops-deploy-admin.md W2 PASS); carried as P1 row into atlas-risk-register.md - consistent. |

---

## From `digest-v2-refresh.md` — §2d: Verdicts for FA-N1..FA-N10

| ID | Note | Verdict | Basis |
|---|---|---|---|
| **FA-N1** | Promote TuiAgentConfig into provider-neutral runner contract; collapse 14 IPC channels | **CONFIRMED - REPRODUCED** | Counts re-derived from source THIS SESSION: 14 managed targets (agent-hook-types.ts AGENT_HOOK_TARGETS), 18 live `/hook/*` pathnames (agent-hook-listener.ts unique match enumeration). Wave-6 spot verification PASS. Delta explanation (opencode, mimo-code, pi, omp, prime-agent live via plugins not installers) consistent with the 18-name list. |
| **FA-N2** | Keep zero-polling event-push status architecture; preserve loopback hardening; accept token-in-env trade-off consciously | **CONFIRMED** | Source report fa-agent-hooks-probes.md W6 PASS; hardening cites (per-start UUID token, slowloris guard, fail-open 204, launch-token gate, listen(0,'127.0.0.1')) verified within that pass; trade-off framing unchanged. |
| **FA-N3** | Plugin host runtime = substrate for agent-capability packages; close 4 gaps first | **CONFIRMED** | fa-plugin-runtime.md W5 PASS (~110 cites). Gap list a-d (raw Node power post-activate, no exec/spawn/fs host method, no agent-domain events, literal pluginApi pin) unchanged; nothing in later rounds contradicts or resolves them. |
| **FA-N4** | Add "Agents" section to Cmd+J palette; plumbing verified present | **CONFIRMED** | fa-command-palette-search.md W4 PASS (sole drift: shouldFilter :2492->:2480, content correct). Verified-gap framing (palette imports neither searchTerminalQuickCommands nor the ~30-agent catalog) untouched by later rounds. |
| **FA-N5** | WSL mandatory-helper guardrails + risk-register traps | **CONFIRMED CONTENT / STATUS UNCHANGED: HYGIENE-ONLY** | No factual spot pass ever ran on fa-wsl-remote-execution.md (the planned wave-8 slot went to fa-mobile-companion). The note itself already says "treat numbers as strong-but-unverified" - that caveat must stay attached. Elevated importance: atlas-risk-register.md carries the unrestricted in-guest `rm -rf` w/o approvedRoots trap as P0. Recommend the missing spot pass as residual debt D3 rather than re-litigating content. |
| **FA-N6** | Telemetry posture keep-as-is; clear the 11-item rebrand leak register | **CONFIRMED** | fa-telemetry-consent.md W4 PASS. Leak item 1 (hardcoded https://www.onfabrica.dev/v1/feedback endpoint) is now ALSO a P0 row in atlas-risk-register.md - highest-priority single leak surface. Items 5-8 merge note into the FABRICA_* env/data-dir register unchanged. |
| **FA-N7** | Port execute-guard stack as ONE ordered boundary layer; fix 7 defects while porting | **CONFIRMED** | mc-execute-guards.md W5 PASS (~120 cites; dead-SOFT_LIMIT negative claim independently reproduced during verification). All 7 FIX-BEFORE-PORT defects map to the report's weakness register; enforcement-point guidance matches FA-T2. |
| **FA-N8** | Adopt decision-queue interaction pattern; fix W1/W2/W5-class defects in port | **CONFIRMED** | mc-decision-gates.md W7 PASS. Wave-7 finding F3 (withDecisions is read-only-in-lock, not write-back) explicitly does NOT affect the five ported mechanics (block-with-payload responses, intercept-and-rerun, ambient badges, escalation trio, answers-as-context). Schema + Zod limits cited correctly. Design note (ONE UI surface for both intervention tiers) stands. |
| **FA-N9** | Dual task domain (human kanban + agent-action FSM) as core task model skeleton | **CONFIRMED** | mc-fieldtask-kanban.md W7 PASS (~115+ cites; headline findings kanban-no-FSM, awaiting-signature enum drift validations.ts:365 vs types.ts:420, dead scheduledFor all independently reproduced by verifiers). All 9 fix-before-port items stand. |
| **FA-N10** | Sequencing: task model -> guard stack -> decision queue | **CONFIRMED** | Synthesis judgment over three now-VERIFIED-PASS reports; later syntheses (atlas-phased-roadmap.md phases, agent-platform-integration-map.md composition picture) adopted the same ordering - no contradiction anywhere in the evidence base. |

---

## From `digest-v2-refresh.md` — §3: Contradictions & corrections register

Every known inconsistency between digest v1 (+Addendum), notes-r4, and the current evidence base:

| # | Contradiction / correction | Resolution for downstream consumers |
|---|---|---|
| K1 | Digest C7 says "15+ CLIs / 14 channels"; W6 verified 14 managed hook targets vs 18 live `/hook/*` pathnames (CA-2) | Use 14 managed / 18 live everywhere. Reproduced from source this session (sec 0 item 3). Older "15 named CLIs" figures are wrong. |
| K2 | Digest G4/FA-T4 inherits "17 named mutexes" from mc-workflow-engine; actual registry has 20 (CA-1) | Use 20 (`src/lib/data.ts:177-196`). Reproduced from source this session. |
| K3 | "~66"/"~67" services in mc-adapters-linelevel.md (:39/:180) vs 64 verified in service-catalog | Always 64 (JSON parse reproduced twice: W2 + this session). Upstream report left uncorrected per no-rewrite rule. |
| K4 | Wave-7 F3: mc-decision-gates.md sec 2.3 mischaracterizes `withDecisions` as write-back | It is a read-only-in-lock helper. No effect on FA-T3/FA-N8 mechanics; do not cite sec 2.3 for write semantics. |
| K5 | V-R4-1: bz-db-schema push-gateway "runtime guards" cites sit inside `#[cfg(test)] mod tests` | Substance stands; treat those specific cites as test-module evidence, production runner is apply_migrations_and_grants (:19-23). |
| K6 | V-R4-2: usage-provider template-literal family labeled x5 actually registers 8 channels | Label undercount only; strengthens FA-T11's public-contract claim if corrected upward. |
| K7 | CA-3: digest cites `discovery/fabrica-app/ai-vault-browser.md`; real path is `discovery/fabrica-app/ai-vault-browser.md` | Path-only fix for consumers; no content impact. |
| K8 | R4 spot verification:164 claims all other Round 4 reports covered by R4-2.1/R4-2.2 | False at the time (R4-2.1 covered ROUND 3 reports; R4-2.2 was hygiene). Mooted by later waves W2-W8 which did cover them; retained here so the false assurance is never reused. |
| K9 | Addendum A3 lists fa-auth-onboarding / bz-voice-media / mc-ui-frontend as "never landed" | SUPERSEDED: all three landed and passed spot verification in R5 wave 1 (R5 W1-a, W1-b). |
| K10 | Addendum A3 says treat bz-pair-relay-cli claims as unverified | SUPERSEDED: VERIFIED-PASS via R5 wave1-b (33 exact / 1 cosmetic / 0 failed). Its SAS-verified-bootstrap input to the deviceToken recommendation (digest FA-N-lineage in bz-pair-relay-cli.md relevance section) is now citable as verified. |
| K11 | N3 cite drift: freshdeck-mcp at catalog :1014 (digest) vs :1018 (current file) | Cosmetic line drift; entry exists, flag stays open. |
| K12 | F-1 phantom liveness-probe cite in mc-chainedispatch-reconciler.md sec 7.3 | Fixed in place by R5-4.3 (real probe sites substituted; RUNTASK:360-363 was a spawn-options object). Post-digest report, affects cross-project-notes-r5 consumers only - recorded here for register completeness. |

No CONTRADICTING RECOMMENDATION was found: no FA-T or FA-N item is invalidated by any other part of the evidence base; the only supersession is strategic (FA-T9/T11 rebrand handling -> FA-T14), which the Addendum itself introduced.

---

## From `digest-v2-refresh.md` — §4: Residual verification debt

- **D1:** mc-adapters-linelevel.md - content never factually spot-checked (HYG-only). Affects G5/G6/FA-T5 adapter-half cites only; guard-stack overlap is independently verified via mc-execute-guards.md.
- **D2:** fa-pty-terminal.md - content never factually spot-checked (HYG-only). Underpins C1-C5/C8 capability claims and FA-T3's detection-substrate half.
- **D3:** fa-wsl-remote-execution.md - content never factually spot-checked (HYG-only). Gate on FA-N5 numbers; P0 risk row (WSL rm -rf trap) deserves the pass most.
- **D4:** fa-multi-instance.md + fa-search-indexing.md - spot verification assigned (R5-2.12) but IN_PROGRESS at writing.

Everything else in the Round 4/5 evidence base is citation-verified with 0 failed cites.

---

## From `digest-v2-refresh.md` — §5: Consolidated priority-ordered recommendation list

Merged from validated FA-T1..T18 + FA-N1..N10, aligned with atlas-risk-register.md priorities and atlas-phased-roadmap.md phases. Every entry carries a validated verdict from §2 above.

### P0 — safety / irreversibility / rebrand hard-breaks

1. **Rebrand strategy: opaque identifiers, display-surface-only changes** (FA-T14 governing; FA-T9 as audit checklist; FA-T11 contract caution). First concrete act: kill/redirect the old-brand feedback endpoint leak (FA-N6 item 1; risk-register P0).
2. **Approval-gated autonomy + single ordered guard stack at the IPC boundary** (FA-T2 via FA-N7), WITH the 7 fix-before-port defects - never port MC's creation-path approval hole or batch bypass.
3. **WSL destructive-op containment preserved** (FA-N5 items 3/1; risk-register P0): approvedRoots required, TOCTOU re-verification intact - pending only the D3 spot pass for line-number citations.

### P1 — core architecture spine (build order per FA-N10)

4. **Dual task-domain model skeleton** (FA-N9): two domains, ONE enum source of truth, registry-resolved assignment, no dead fields.
5. **Provider-neutral runner abstraction** (FA-T1 via FA-N1): SpawnSpec from TuiAgentConfig, collapse 14 channels to one parameterized dispatcher, extract per-provider parsing; keep zero-polling architecture (FA-N2) and loopback hardening non-negotiable.
6. **Decision queue / operator intervention** (FA-T3 via FA-N8): block-with-payload IPC, intercept-and-rerun, consumption markers on answers, transactional store replacing mutex+raw-fs.
7. **CLI<->desktop contract formalization** (FA-T12): lock-key=profile + exit code 3 + FABRICA-runtime.json as THE discovery mechanism; no second mechanism.

### P2 — capability completion

8. **Operator alerting gaps** (FA-T13): dead-backend signal, seen-vs-acknowledged split, approval aging escalation, outbound transports.
9. **Usage/cost ledger with budgets** (FA-T7): harvest-from-CLI + budget-on-runs; spend ladder pairs with guard stack (FA-N7 item 5).
10. **Durable SQL-backed task/run/approval persistence** (FA-T6) and **adapter registry + honest catalog** (FA-T5, vocabulary reconciliation mandatory, 64-services figure per K3, freshdeck-mcp checked per N3).
11. **Fleet live-status plumbing** (FA-T16) and **searchable agent archive** (FA-T15) when transcript search / online-offline indicators scope in.
12. **Distribution greenfield** (FA-T10 staged rollout) and **cluster deploy blueprint** (FA-T17) when multi-host scopes in.

### Standing constraints (apply to ALL of the above)

- Preserve watcher stack verbatim (FA-T11); treat channel strings as public contract.
- Git-plane patterns for any new tool-runner (FA-T18); credential guard split unattended-vs-interactive.
- Plugin-runtime four gaps closed before promising third-party agent packages (FA-N3); palette Agents section is cheap once runner lands (FA-N4).
- Upstream-fixable notes for MC/buzz boards via orchestrator only (N4, N5).

### Recommended follow-up tasks (for the orchestrator, targeted-only per convergence memo)

- Spot-verify D1/D2/D3 (mc-adapters-linelevel, fa-pty-terminal, fa-wsl-remote-execution) - closes all residual debt.
- Await/settle R5-2.12 (D4).
- Relay final feed notes into Fabrica-app board (already drafted: cross-project-notes-r4.md + r5.md, all verdicts above CONFIRMED).
