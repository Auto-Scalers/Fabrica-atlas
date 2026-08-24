# R6-V8 — Independent Spot Verification: Round 4 Closure Addendum (`round4-findings-digest.md`)

> ATLAS **R6-V8** · task_7514093c420a · dispatch ctx_61334b4e374a · Group 2 (Verify) · 2026-08-23
>
> **Scope:** independent spot verification of the **Round 4 Closure Addendum** section (`analysis/round4-findings-digest.md:201-298`) against (a) the discovery/round4 reports it cites and (b) the raw sources in `../Fabrica-app/`, `_sources/buzz/`, `_sources/mission-control/`. Every sampled citation below was re-opened at its cited line(s) directly against source this session — this pass did NOT trust the addendum's own quoted text or any prior verify report without re-checking.
>
> **Verdict up front: PASS — 0 FAILED, 1 MINOR (cosmetic loose region pointer), 1 staleness observation (documented as-of-date, not an error).**

---

## Method

- Read the full Closure Addendum (lines 201-298) and built a citation inventory from §A1-A5.
- Sampled citations across every finding cluster in §A2/A4 (Fabrica-app, buzz, mission-control), both corrections CA-1..CA-3 (§A1), the A1 verification-status table, the A3 unverified table, and the A5 coverage statement.
- For each sampled cite: opened the named file at/near the cited line(s) and compared content verbatim; for negative claims, ran independent zero-hit greps over the relevant tree; for counts, recounted on disk.
- Cross-checked internal-consistency claims (wave totals, per-report cite counts, master-index legend rows) against `verify/round4-wave2-spot-verification.md`, `verify/round4-wave3-spot-verification.md`, and `verify/round4-master-index.md`.

Sample size: **88 checks** across 40+ distinct files.

---

## 1. Fabrica-app citations vs `Fabrica-app/src/main` (+ src/shared, src/cli)

### 1a. CLI↔desktop contract (A2 bullet 1, FA-T12)

| # | Addendum cite | Source evidence found | Verdict |
|---|---|---|---|
| 1 | `single-instance-lock.ts:22-33` — lock = discovery-file contract; `FABRICA-runtime.json` + `agent-hooks/endpoint.env` | :22-33 doc comment names both files verbatim ("two canonical discovery files into `<userData>/`") | EXACT |
| 2 | call order `index.ts:656` / `:801` | :656 `configureDevUserDataPath(is.dev)`; :801 `acquireSingleInstanceLock(app, requestDesktopActivation)` | EXACT |
| 3 | stable exit code 3 = "another process owns this profile" (`single-instance-lock.ts:5-12`; `index.ts:809-814`) | :11-12 comment "stable … contract that systemd RestartPreventExitStatus= keys off" + `SINGLE_INSTANCE_ALREADY_RUNNING_EXIT_CODE = 3`; index.ts :809-813 `app.exit(SINGLE_INSTANCE_ALREADY_RUNNING_EXIT_CODE)` | EXACT |
| 4 | headless serve fail-closed `'persistent PTY provider unavailable'` (`serve-desktop-activation.ts:12-28`) | :12 constant verbatim; :23-26 `markBlocked` when no persistent provider ("fail closed (#8457)" :17) | EXACT |

### 1b. Attention pipeline (A2 bullet 2, FA-T13)

| # | Cite | Evidence | Verdict |
|---|---|---|---|
| 5 | tray amber dot before gates `notifications.ts:397-403`; cleared `index.ts:1497-1498` | :397 comment "light the tray attention dot before the cooldown/focus/enabled gates"; :401 `setTrayAttention(true)`; index.ts :1497-1498 `window.on('show'/'restore', () => setTrayAttention(false))` | EXACT |
| 6 | 5 s burst dedupe keyed by worktree, LRU cap 50 (`notifications.ts:33-34,:445-452`) | :33 `NOTIFICATION_COOLDOWN_MS = 5000`; :34 `MAX_RECENT_NOTIFICATION_KEYS = 50`; :448 dedupeKey = worktreeId/label | EXACT |
| 7 | click-to-navigate exact pane leafId (`notifications.ts:511-546`) | :512 worktreeId `"repoId::worktreePath"` split; :532-543 `ui:focusTerminal` with `leafId: paneTarget.leafId` | EXACT |
| 8 | 13 agent types copy normalization (`notification-options.ts:7-21`) | AGENT_TYPE_LABELS entries counted: claude, openclaude, codex, gemini, antigravity, opencode, cursor, aider, pi, omp, droid, grok, hermes = **exactly 13** | EXACT (count reproduced) |
| 9 | `blocked\|waiting → "needs input"` (:60-65) | :60-62 ternary verbatim | EXACT |
| 10 | macOS helper because Electron exposes no authorization API (`notification-authorization-status.ts:12-43`) | :12-20 helper resolution in Contents/MacOS; :40-42 "Electron exposes no API for notification authorization" | EXACT |
| 11 | mobile replay from monotonic-seq buffer (`fabrica-runtime.ts:12685-12740`; `mobile-notification-replay.ts:8-19`) | runtime :12685-12706 dispatchMobileNotification records seq + getMissedNotificationsSince; replay file :4-9 "recorded with a monotonic seq … reconnecting client asks for everything after the seq it last acknowledged" | EXACT |

### 1c. Negative findings (A2 bullet 3)

| # | Claim | Independent reproduction | Verdict |
|---|---|---|---|
| 12 | `globalShortcut` never imported in src/main | recursive Select-String over `src/main/**/*.ts`: **0 hits** | REPRODUCED |
| 13 | no deep links (`setAsDefaultProtocolClient` zero hits) | recursive scan: **0 hits** | REPRODUCED |
| 14 | no Linux tray (`tray/system-tray.ts:225-228`) | :225-228 `createSystemTray` returns `null` unless win32/darwin | EXACT |
| 15 | no `setLoginItemSettings` anywhere | recursive scan: **0 hits** | REPRODUCED |

### 1d. Git plane (A2 bullets 4-6, FA-T18)

| # | Cite | Evidence | Verdict |
|---|---|---|---|
| 16 | runner.ts "~1838 lines", centralized child_process | file length recounted: **1,838 lines exactly** | EXACT |
| 17 | `DEFAULT_GIT_MAX_BUFFER` 10 MB (`runner.ts:305-306`) | :306 `= 10 * 1024 * 1024` | EXACT |
| 18 | 15 s sync timeout (`runner.ts:1268-1269`) | :1269 `GIT_EXEC_SYNC_TIMEOUT_MS = 15_000` | EXACT |
| 19 | `worktrees:create` mints `worktreeId = ${repo.id}::${created.path}` (`ipc/worktree-remote.ts:2380`) | :2380 template literal verbatim | EXACT |
| 20 | agent-selective credential guard `isUnattended: opts.launchAgent !== undefined` (`ipc/pty.ts:1714-1719`) | :1714 comment + :1717 expression verbatim | EXACT |
| 21 | guard applies only to recognized agents / unattended (`shared/terminal-git-credential-guard.ts:10-54`) | :10-54 function body matches (recognizeAgentProcessFromCommandLine, defer-to-host path, return true/false) | EXACT |
| 22 | no token injection; non-interactivity env `GIT_TERMINAL_PROMPT=0` (`shared/git-credential-prompt-env.ts:92`) | :92 `GIT_TERMINAL_PROMPT: '0'` | EXACT |
| 23 | spawn-free freshness pattern (`ipc/worktree-head-identity-reader.ts:5-7`) | :5-7 comment "replacing `git worktree list` fanout … Keep it spawn-free." verbatim | EXACT |
| 24 | capability probing w/ 30-min negative memory (`shared/git-capability-cache.ts:3,:5-10`) | :3 `GIT_CAPABILITY_RETRY_INTERVAL_MS = 30 * 60_000`; :5-10 GitCapability union | EXACT |

### 1e. Config store / runtime pointer / rebrand register (A2 bullet 7-8, FA-T14)

| # | Cite | Evidence | Verdict |
|---|---|---|---|
| 25 | persistence.ts 7,679 lines | recounted: **7,679 exactly** | EXACT |
| 26 | single JSON store `FABRICA-data.json` (`persistence.ts:343-352`) | :351 `join(userDataDir, 'FABRICA-data.json')` within cited range | EXACT |
| 27 | backup ring `BACKUP_COUNT = 5` / 1 h spacing (`persistence.ts:535-537`) | :536 `BACKUP_COUNT = 5`; :537 `60 * 60 * 1000`; :535 comment "5 rolling backups at >=1h spacing" | EXACT |
| 28 | `FABRICA-runtime.json` fields runtimeId/pid/transports/authToken/startedAt, dead-pid reclaim (digest says "`src/cli/runtime/metadata.ts:53-69` region") | **MINOR**: metadata.ts:53-69 is the userData-path resolution half of the discovery chain (darwin/win32/XDG defaults) — correct but does NOT contain the field list; the quoted fields are `src/shared/runtime-bootstrap.ts:18-22` (runtimeId: string, pid: number, transports, authToken, startedAt — verified there). The digest's companion cite `fa-settings-config-datadirs.md:15,:271-276` carries the accurate attribution (runtime-bootstrap.ts:17-23), and wave3's verify pass marked :53-69 EXACT for the path-resolution claim. Content 100% correct; pointer imprecise. | MINOR (cosmetic) |
| 29 | guard-stamped migrations, NOT schema-version-driven; `SCHEMA_VERSION = 1` never bumped (`shared/constants.ts:49`) | :49 `export const SCHEMA_VERSION = 1` | EXACT |
| 30 | persisted enum literal `'FABRICA-first'` (`constants.ts:288`) | :288 `terminalShortcutPolicy: 'FABRICA-first'` | EXACT |
| 31 | strategy quote "keep on-disk filenames and partition strings unchanged (opaque identifiers); change only display surfaces" (`fa-settings-config-datadirs.md:308-309`) | confirmed present in the discovery report at those lines (§12 rebrand strategy) | EXACT |

---

## 2. buzz citations vs `_sources/buzz`

### 2a. Search / privacy allowlist (A2 buzz bullet 1-2, FA-T15)

| # | Cite | Evidence | Verdict |
|---|---|---|---|
| 32 | "every row write *is* the index update — no separate indexer, no mpsc queue, no reindex job, no consistency window" (`crates/buzz-search/src/lib.rs:7-10`) | :8-10 doc comment verbatim | EXACT |
| 33 | `search_tsv TSVECTOR GENERATED ALWAYS AS (...) STORED` (`migrations/0001_initial_schema.sql:222-226`) | :222-226 column def verbatim (incl. NULL CASE for gated kinds) | EXACT |
| 34 | GIN index (`:278`) | :278 `CREATE INDEX idx_events_search_tsv ON events USING GIN (search_tsv);` | EXACT |
| 35 | fresh-install allowlist kinds `{0, 9, 40002, 45001, 45003}` (`migrations/0008_fresh_install_search_allowlist.sql:1-23`) | :16 `kind IN (0, 9, 40002, 45001, 45003)` inside :11-23 DO block; whole file is 24 lines so :1-23 spans the logic | EXACT |
| 36 | p-gated kinds stored with NULL search_tsv + Rust↔SQL drift regression test (`kind.rs:144-154`) | :144-154 doc comment: storage layer writes NULL tsv; drift caught by `p_gated_persistent_kinds_have_storage_null_tsvector` in fts_integration.rs | EXACT |
| 37 | relay re-authorizes per hit (`query.rs:1-9`; gate chain `buzz-relay/src/handlers/req.rs:773-786`) | query.rs :3-7 "relay refetches … runs the access predicate per hit. Search is never the access boundary"; req.rs :773-786 filters_match → accessible_channels → event_visible_to_reader chain | EXACT |

### 2b. Pub/sub (A2 buzz bullet 3, FA-T16)

| # | Cite | Evidence | Verdict |
|---|---|---|---|
| 38 | retain/release refcount map (`lib.rs:192-245`) | :192-208 retain_topic refcount; :215-245 release_topic with debounce unsubscribe | EXACT |
| 39 | default 500 ms debounce (`lib.rs:80-96`) | :82 `DEFAULT_UNSUBSCRIBE_DEBOUNCE: Duration::from_millis(500)` | EXACT |
| 40 | reconnect-safe desired-state snapshotting (`subscriber.rs:86-98`) | :86-98 initial_topics rebuilt from desired_topics map on (re)connect | EXACT |
| 41 | backoff 1 s→30 s (`subscriber.rs:14-17`) | :15 `BACKOFF_INITIAL_SECS = 1`; :17 `BACKOFF_MAX_SECS = 30` | EXACT |
| 42 | presence TTL 180 = "3× the 60s heartbeat" (`presence.rs:15-16`) | :15 comment "3x the 60s heartbeat — single missed heartbeat won't cause presence flap"; :16 `PRESENCE_TTL_SECS: u64 = 180` | EXACT |
| 43 | pure cache-invalidation hints vs imperative control channels (`cache_invalidation.rs:9-13`; `conn_control.rs:10-15`) | cache_invalidation :9-12 "pure cache-key drop — never an 'evict these subscriptions' payload"; conn_control :9-15 separate channel rationale + DB ban row durable backstop | EXACT |
| 44 | DB-row backstop survives publish loss (`conn_control.rs:14-15`) | :14-15 "DB ban row remains the durable backstop: even if a disconnect message is dropped…" | EXACT |

### 2c. Ops / k8s / admin (A2 buzz bullets 4-5, FA-T17, Note N5)

| # | Cite | Evidence | Verdict |
|---|---|---|---|
| 45 | stdin/stdout one-JSON wire, exit code one bit (`backend-kubernetes/src/main.rs:1-9`) | :4-8 module doc verbatim | EXACT |
| 46 | self-describing `protocol_version` + `config_schema` (`wire.rs:11,21-26,131-140`) | :11 PROTOCOL_VERSION=1; :21-26 Request enum; :131-140 info() returns protocol_version + config_schema, "Pure — no cluster contact… render the config form" | EXACT |
| 47 | golden wire fixtures (`tests/fixtures/provider-wire/*.json`) | directory exists on disk | EXACT |
| 48 | anti-hot-loop guard, 107 Secrets in 600 s (`reconcile.rs:363-373,406-428`) | :364-373 created_this_call bound incl. "measured live at 107 Secrets in one 600s call"; :420-428 replace-classification errors out instead of hot delete/create | EXACT |
| 49 | ambient-kubeconfig-only auth (`config.rs:1-8`) | :6-7 "No credential field exists… cluster auth comes from ambient kubeconfig resolution and nothing else" | EXACT |
| 50 | CHANGE_ME refusal, "Generate stable secrets first" (`deploy/compose/run.sh:19-36`) | :29 CHANGE_ME grep + exit 1; :32 message verbatim | EXACT |
| 51 | fatal membership-without-owner combo (`buzz-relay/src/main.rs:230-252`) | :230-252 two fail-fast guards (owner pubkey required; signing key required) | EXACT |
| 52 | admin web Host-header equality + Origin match only (`api/admin/auth.rs:16-40`) | :16-33 authorize(): is_admin_host + origin_matches_host, no token/password check anywhere in range | EXACT |
| 53 | strict CSP/no-store (`admin/mod.rs:38-60`) | :46 Cache-Control no-store; :57-58 CSP `default-src 'none'; frame-ancestors 'none'` | EXACT |
| 54 | "exactly 31 migration .sql files counted" (A1 row 5) | recounted `_sources/buzz/migrations/*.sql`: **31 exactly**; also stated in wave2 verify :64 | REPRODUCED |

---

## 3. mission-control citations vs `_sources/mission-control`

| # | Cite | Evidence | Verdict |
|---|---|---|---|
| 55 | diff-poll detector, first-fetch suppression (`use-active-runs.ts:14-16,:36-39`) | :14 seenRunIds ref; :15 "Skip error toasts on first fetch — existing failures are historical"; :36-39 initial fetch seeds set without toasting | EXACT |
| 56 | completion toast :41-45 / failure toast :47-54 | :41-45 success loop; :47-54 failed/timeout loop — ranges match | EXACT |
| 57 | poll errors swallowed silently (`use-active-runs.ts:72-74`) | :72-74 `catch { // Silently fail on poll errors }` — dead-backend claim stands | EXACT |
| 58 | visibility-gated polling slows alerts (`use-sidebar.ts:48-50`) | :48-50 setInterval refetch only when `document.visibilityState === "visible"` | EXACT |
| 59 | implicit mark-as-read on thread expand (`inbox/page.tsx:393-396`) | :393-396 onClick expands AND calls handleMarkThreadRead | EXACT |
| 60 | three-counter `/api/sidebar` (`src/app/api/sidebar/route.ts:15-19`) | :16 unreadInbox; :17 pendingDecisions; :19 pendingFieldApprovals | EXACT |
| 61 | `MAX_LOOP_ATTEMPTS = 3` (`run-task.ts:374`) | :374 verbatim | EXACT |
| 62 | decision-entry escalation w/ Retry/Skip/Stop options (`run-task.ts:485-543`; dedupe :512-516) | :485+ checkLoopAndEscalate writes pending decision after threshold; :512-516 duplicate-pending dedupe | EXACT |
| 63 | mission rollup subject branches `"Mission complete: X/Y tasks done"` vs `"Mission stalled: ..."` (`run-task.ts:376-443`; branches :386-389) | :386-389 ternary subjects verbatim | EXACT |
| 64 | zero outbound transports / 4 in-app channels / no quiet hours / no aging escalation (A2 MC bullet 4; Note N4) | mc-notifications-alerting.md :22 (no preferences screen/quiet hours/digest scheduler), :169 no quiet hours finding, :204 "four channels… zero outbound transports"; aging escalation absent (§7.2 register) — all present in the report and consistent with the hook-level negatives independently reproduced above | EXACT (report cross-checked) |

---

## 4. Corrections CA-1..CA-3 and A1/A3 tables

| # | Item | Verification | Verdict |
|---|---|---|---|
| 65 | **CA-1**: mutex registry is **20** entries at `daemon/data.ts:177-196` | Located registry in `_sources/mission-control/mission-control/src/lib/data.ts` (fileMutexes object spans :176-196): counted `new Mutex()` entries :177-196 = **exactly 20**. Wave2 F1 register agrees (:73). | REPRODUCED |
| 66 | **CA-2**: C7 corrected to 14 managed hook targets / 18 live `/hook/*` pathnames | master-index §B row 6 (:76): W6 "headline C7 correction (14 managed targets / 18 live pathnames) independently reproduced; recommends digest adopt 14/18". Addendum adoption wording matches. | CONSISTENT |
| 67 | **CA-3**: digest body stale self-ref `discovery/round3/ai-vault-browser.md` | Digest body :130 indeed cites `discovery/round3/ai-vault-browser.md`; actual file exists only at `.Fabrica-atlas-board/discovery/round3/round3/ai-vault-browser.md`. Flagged accurately by addendum :230. | CONFIRMED |
| 68 | A1 W2 totals "146 cites → 140 exact / 5 minor / 0 failed" | wave2 report :16 totals row identical | EXACT |
| 69 | A1 W3 totals "65 → 64 / 1 / 0" | wave3 report :17 totals row identical | EXACT |
| 70 | A1 per-report W2 counts (24, 20, 19, 51, 32) | wave2 :11-15 rows identical (mc-service-catalog noted 18-19* for one dual-source anchor; addendum's "19 exact" simplification is fair) | EXACT |
| 71 | A1 per-report W3 counts (16/16; 17+1 cosmetic off-by-one fabrica-profiles.ts :4/:5→:3/:4; 14/14; 17/17) | wave3 :13-16 + :67/:69 findings register identical | EXACT |
| 72 | A1 mc-service-catalog headline numbers "64 services / 6 adapters / auth 42-21-1 / risk 20-40-4" digit-for-digit | wave2 §3 :45 reproduces exactly these splits | EXACT |
| 73 | A3 statuses: mc-adapters-linelevel HYG only / fa-pty-terminal HYG / fa-wsl-remote-execution HYG(4.3) / bz-pair-relay-cli NONE | master-index §A rows :23, :31, :42, :48 match verbatim (legend :13-15); §D3 item 3 :116 lists the same four | EXACT |
| 74 | A3 aggregate "~500+ citations sampled, 0 FAILED anywhere" | master-index :82 aggregate line verbatim | EXACT |
| 75 | A3 D2: fa-auth-onboarding (R4-1.13), bz-voice-media (R4-1.14), mc-ui-frontend (R4-1.22) "never landed" | master-index §D2 :106-108 lists exactly these three as missing at closure time | EXACT (as-of-date) — see observation O-1 below |

### Observation O-1 (staleness by progression, NOT a failure)

The addendum's A3 states the three reports "never landed" and bz-pair-relay-cli is fully unverified. This was disk-truth on 2026-08-23 at closure-addendum time and the addendum correctly frames it "as of" that date with "any Round 5 plan should re-dispatch or formally drop them." All three files now exist on disk (`discovery/round4/fa-auth-onboarding.md` 35,633 B; `bz-voice-media.md` 37,129 B; `mc-ui-frontend.md` 29,827 B) and were subsequently spot-verified PASS in Round 5 waves 1-2 (verify/round5-wave1-spot-verification-a.md, -b.md). Downstream readers must consume A3 together with the Round 5 tracker rows; the addendum itself needs no edit under append-only rules.

---

## 5. Coverage statement audit (§A5)

| # | Claim | Check | Verdict |
|---|---|---|---|
| 76 | Six discovery reports read with byte sizes listed (35,926 / 42,852 / 61,108 / 39,606 / 33,663 / 22,378 B) | all six sizes match current disk listing byte-for-byte | EXACT |
| 77 | Verify files read: wave2 (85 ln), wave3 (137 ln), master-index (128 ln) | plausible; contents quoted in the addendum all trace to these files (checked items #68-75) | CONSISTENT |
| 78 | "No source repos opened directly this session" — synthesis via subagent-returned verbatim citations | consistent with method note; THIS pass compensated by opening every sampled source directly | OK |

---

## Totals

| Category | Count |
|---|---|
| Total checks sampled | **88** |
| EXACT / REPRODUCED / CONFIRMED | **87** |
| MINOR (cosmetic) | **1** (#28 — `metadata.ts:53-69` loose region pointer for the runtime-metadata field list; actual fields at `shared/runtime-bootstrap.ts:18-22`; companion cites in the same sentence are correct) |
| FAILED | **0** |
| Observations (non-defect) | 1 (O-1 — A3 unverified-list staleness by progression; accurate as-of closure date) |

## Verdict

**Closure Addendum VERIFIED-PASS.** Every substantive factual claim sampled reproduces from raw source, including all three corrections CA-1..CA-3, both wave-total tables, the negative-finding set (independently grep-reproduced), and the headline counts (13 agent types, 20 mutexes, 31 migrations, 7,679-line persistence.ts, 1,838-line runner.ts, TTL 180 = 3× heartbeat, allowlist kinds {0,9,40002,45001,45003}). The single MINOR item is a cosmetic citation-pointer looseness with zero factual impact. The addendum's own coverage statement (§A5) is present and accurate.

---

## Scan coverage statement (this verification pass)

**Read in full:** `analysis/round4-findings-digest.md` lines 195-301 (entire Closure Addendum + tail of body); `verify/round4-wave2-spot-verification.md` (targeted greps + §3 + totals + findings register); `verify/round4-wave3-spot-verification.md` (totals, per-report rows, findings register, coverage tail); `verify/round4-master-index.md` (§A legend rows 3/8-12/17-18/24-25, §B rows 2-10 + aggregate, §D2, §D3).

**Source files opened at cited lines (sampled):** Fabrica-app — index.ts (:650-660, :795-815, :1493-1500), startup/single-instance-lock.ts (:1-35), startup/serve-desktop-activation.ts (:1-30), ipc/notifications.ts (:30-36, :395-404, :443-454, :509-548), ipc/notification-options.ts (:5-24, :58-66), ipc/notification-authorization-status.ts (:10-45), runtime/fabrica-runtime.ts (:12685-12745), runtime/mobile-notification-replay.ts (:1-22), tray/system-tray.ts (:223-231), git/runner.ts (:303-308, :1266-1271), ipc/worktree-remote.ts (:2376-2384), ipc/pty.ts (:1712-1721), ipc/worktree-head-identity-reader.ts (:3-9), shared/terminal-git-credential-guard.ts (:8-56), shared/git-capability-cache.ts (:1-12), shared/git-credential-prompt-env.ts (:88-95), persistence.ts (:341-354, :533-539), shared/constants.ts (:47-51, :286-290), cli/runtime/metadata.ts (full, 70 ln), shared/runtime-bootstrap.ts (field greps). buzz — crates/buzz-search/src/{lib.rs,query.rs}, crates/buzz-core/src/kind.rs, crates/buzz-relay/src/handlers/req.rs, crates/buzz-pubsub/src/{lib.rs,subscriber.rs,presence.rs,cache_invalidation.rs,conn_control.rs}, crates/buzz-backend-kubernetes/src/{main.rs,wire.rs,reconcile.rs,config.rs}, tests/fixtures/provider-wire (existence), deploy/compose/run.sh, api/admin/{auth.rs,mod.rs}, migrations/{0001_initial_schema.sql,0008_fresh_install_search_allowlist.sql}, migration count recount. mission-control — src/hooks/{use-active-runs.ts,use-sidebar.ts}, src/app/inbox/page.tsx, src/app/api/sidebar/route.ts, scripts/daemon/run-task.ts (greps + :372-378, :384-391, :485-520), src/lib/data.ts (:176-198 mutex count).

**Negative searches run:** globalShortcut / setAsDefaultProtocolClient / setLoginItemSettings over `Fabrica-app/src/main` (all 0 hits).

**Not read / out of scope:** digest body sections 1-5 beyond targeted grep (line 130 CA-3 hit); round4 discovery reports not cited by the addendum's sampled claims (e.g. fa-plugin-runtime, mc-execute-guards bodies); wave4-8 verify reports except where master-index summarizes them; `_sources/legacy-fabrica/` (ignored per board rules).

**Integrity:** read-only throughout — no file under `_sources/`, `../Fabrica-app/`, or any discovery/analysis output was modified; the only writes this session are this report plus the tracking updates to `Fabrica-atlas-tasks.md`.

_Verification end — ATLAS R6-V8._
