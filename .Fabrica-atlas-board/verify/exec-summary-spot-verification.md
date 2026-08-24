# Executive Summary Spot Verification — `atlas-executive-summary.md` Citation Trail

> ATLAS R5-4.2 · Group 4 · task `task_adbe14dad94c` · dispatch `ctx_79bc0fb5473c` · 2026-08-23
>
> **Target:** `.Fabrica-atlas-board/analysis/atlas-executive-summary.md` (148 lines, read in full)
> **Source reports (read in full this session):**
> - `.Fabrica-atlas-board/analysis/r5-agent-platform-integration-map.md` (269 lines, complete)
> - `.Fabrica-atlas-board/analysis/cross-project-notes-r4.md` (316 lines, complete)
> - `.Fabrica-atlas-board/analysis/round4-findings-digest.md` (301 lines, complete incl. Closure Addendum)
>
> **Underlying sources re-opened directly:** Fabrica-app (`src/main/ipc/pty.ts`, `src/main/providers/local-pty-provider.ts`, `src/shared/tui-agent-config.ts`, `src/shared/plugins/plugin-manifest.ts`, `src/main/ipc/register-core-handlers.ts`, `src/main/git/runner.ts`, `src/main/agent-hooks/server.ts`) and `_sources/buzz` (`managed_agents/readiness.rs`, `runtime/orphan_sweep.rs`, `features/agents/lib/autoRestartPolicy.ts`, `crates/buzz-pubsub/src/presence.rs`). READ-ONLY everywhere; nothing outside `.Fabrica-atlas-board/` written except nothing — only this file + task-file tracking rows.

---

## 1. Verdict Summary

| Scope | Claims audited | Verified | Minor | Failed |
|---|---|---|---|---|
| 10 capability claims (§1.1–§1.10) | 10 (+~20 embedded file:line anchors) | 10 PASS | 0 | 0 |
| Adoption recommendations (A1-A4, B1-B5, C1-C4) | 13 | 13 PASS | 1 minor | 0 |
| Risks (§3 items 1–8) | 8 | 8 PASS | 1 observation | 0 |
| Header aggregate claims (~500+ cites / 45/45 R5) | 2 | 2 PASS | 0 | 0 |
| **Total** | **33** | **33** | **2 MINOR + 1 stale-by-progression** | **0 FAILED** |

**VERDICT: PASS.** Every capability claim, adoption recommendation, and risk in `atlas-executive-summary.md` resolves to real evidence — either a verbatim-confirmed anchor in an underlying source file, or a correctly-transcribed finding in one of the three source reports whose own citation accuracy is covered by prior verify passes (W2–W8, R5-2.1/2.2/2.3). Zero unsupported claims found. Two MINOR cosmetic citation-range issues are registered below; neither changes any conclusion.

---

## 2. Capability Claims §1.1–§1.10 — Verdicts

### C-1.1 Agent sessions as PTY citizens — **PASS**
Re-opened directly against `Fabrica-app/src/main/ipc/pty.ts`:
- `:340` — `const agentSessionOwners = new ClaimedAgentPtyOwnerRegistry()` — **EXACT**.
- `:4934-4996` — adoption region opens `if (args.agentSessionEnsure && !preAdoptedStablePane)` at `:4934` — **EXACT**.
- `:5790-5825` — spawn args carry `launchAgent` (:5803), `resumeProviderSession` (:5801), `worktreeId` (:5806), `tabId` (:5817), `leafId` (:5818) — **EXACT range**.
- `:259` — `isCurrentPtyExit()` incarnation stale-exit rejection — **EXACT**.
- `local-pty-provider.ts:284-293` — `killLocalPtyProcess` graceful/SIGTERM/`forceKillPosixPtyProcessGroups` ladder — **EXACT**.
- `local-pty-provider.ts:1024-1026` — PID-recycle defense comment + kill neutralization — **EXACT**.
Trace to `fa-pty-terminal.md` §2.1/§2.3/§9 confirmed via R5-2.3 pass (`verify/round5-wave2-spot-verification.md`: fa-pty-terminal 11/11 exact, incl. broker at 7,745 lines reproduced digit-for-digit).

### C-1.2 Zero-polling agent-status pipeline — **PASS**
- 18-live /hook pathnames + CA-2 count correction: `round4-findings-digest.md:229` — **EXACT line** ("Correction CA-2 … **14 managed hook targets vs 18 live `/hook/*` pathnames**"), independently reproduced per W6 (`verify/round4-wave6-spot-verification.md`, master-index :76).
- `TUI_AGENT_CONFIG` table starts at `tui-agent-config.ts:49` — **EXACT** (`export const TUI_AGENT_CONFIG` at :49); file totals 351 lines, table body ending before the :334 guard helper — range ":49-331" consistent.
- Four-consumer claim traces to `r5-agent-platform-integration-map.md` §3.1 (:77) — present verbatim.

### C-1.3 Centrally-audited IPC surface — **PASS**
- `register-core-handlers.ts:109-234` — `export function registerCoreHandlers(` at :109; trusted-renderer refresh at :133-134; file is exactly 234 lines — **EXACT range**.
- 344/342/65 census: independently reproduced by R4-2.3 (digest §4a table row "fa-ipc-watchers 18 cites PASS"; master-index W0 row). Transcribed accurately.
- FA-N7 enforcement-point cite `cross-project-notes-r4.md:201` — **EXACT line** ("TASK: Implement the single composed guard stack at the IPC boundary (digest FA-T2, enforcement point register-core-handlers.ts:109-234)").

### C-1.4 Consent-gated plugin runtime — **PASS**
- Denial-code order, audit-before-handler, backoff [500,2000,5000] max 3, slot pool cap 5: transcribed faithfully from `fa-plugin-runtime.md` S1-S9 (W5 VERIFIED-PASS, ~75 cites, 0 failed — `verify/round4-wave5-spot-verification.md`; cross-project-notes-r4 §Verification Status table rows 21-22 record it verbatim).
- Spot-checked underlying anchor: `plugin-manifest.ts:116-119` — `agents:` reservation inside contributions schema — **EXACT** (supports S12.1/C1 "nearly verbatim" assessment).

### C-1.5 Operator control surface — **PASS**
Palette facts (7 families, ~3,153-line component, ~85-action registry, blind-spot row) match `fa-command-palette-search.md` §0/§2/§6-7 as summarized by integration map §1 item 5 and FA-N4 (cross-project-notes :111-132); wave-4 PASS with the single known cosmetic drift (`shouldFilter` :2492→:2480) which the exec summary itself discloses inline — honest reporting confirmed.

### C-1.6 Crash-isolated watcher stack — **PASS**
- `fa-ipc-watchers.md:407` — "**The watcher stack is Fabrica-exclusive** among the three repos and is the highest-risk subsystem to preserve verbatim during any rebrand/framework change" — **EXACT line** (supports both §1.6 and Risk 3).

### C-1.7 Distribution backbone — **PASS**
Channels stable|rc|hourly|daily|adhoc, dual signing, draft-gated publishing, E2E: matches digest C10 (which carries R4-2.3's 14/14 PASS on `fa-autoupdate-build.md`) and spot-confirmed below under Risk/Open-Question checks (`fa-autoupdate-build.md:231-245` region re-opened — see §4).

### C-1.8 Attention pipeline + headless operation — **PASS**
- Tray pre-gate/burst dedupe/click-to-pane/13-agent normalization/mobile replay buffer: transcribed from `fa-window-tray-notifications.md` §§4-7 (W2 PASS, 51 cites) via digest Closure Addendum A2 — faithful.
- CLI↔desktop contract cite `fa-settings-config-datadirs.md:271-276` — **EXACT**: section 11 opens at :270-272 with FABRICA-runtime.json discovery contract, ownership watchdog :274, single-instance lock :276.

### C-1.9 Worktree-per-agent git plane — **PASS**
- `runner.ts` measured **1838 lines exactly** (claim: ~1,838) — **EXACT**; `fa-git-integration.md:13` carries the same figure.
- `ipc/pty.ts:1714-1719` — `isUnattended: opts.launchAgent !== undefined` at :1717 with the verbatim "unattended agents must fail…" comment — **EXACT**.
- `fa-git-integration.md:13`, `:15` (worktreeId minting `worktrees:create`), `:272-279` (selective credential guard + no-token-injection negative) — **ALL RESOLVE EXACTLY**.

### C-1.10 Privacy-strong telemetry — **PASS**
Two lanes / compile-time constants / DO_NOT_TRACK fail-closed / .strict() schemas / triple redaction / 11-item leak register: transcribed from `fa-telemetry-consent.md` §3-§4/§11 (wave-4 VERIFIED-PASS) via FA-N6 (cross-project-notes :154-187, which lists all 11 leak surfaces individually) — faithful summary, statuses correctly attributed.

---

## 3. Adoption Recommendations §2 — Verdicts

Dependency-order frame (FA-N10): `cross-project-notes-r4.md:284-299` — heading at **:284 EXACT**, note body through :299 — **EXACT range**.

### P0
- **A1 two-domain task model — PASS.** MC fieldtask-kanban source VERIFIED-PASS (W7, 64 sample groups, kanban no-FSM independently reproduced). Cite `cross-project-notes-r4.md:256-282` for FA-N9: note actually spans **:253-282** (heading `## FA-N9` at :253). **MINOR M-1** (cosmetic range offset; all cited fix-items — string-role assignment, enum drift, dead scheduledFor — present inside the cited block).
- **A2 ordered execute-guard stack — PASS.** FA-N7 at `cross-project-notes-r4.md:195-224` — **EXACT** (heading :195; next heading :226). All 8 port-as-is patterns + 7 fix-before-port defects present verbatim (:203-220).
- **A3 decision-gate escalation — PASS.** FA-N8 at `:226-251` — **EXACT** (heading :226). OSC-133/interrupt/question-inference substrate claim backed by `fa-pty-terminal.md` §6, factually checked first time by R5-2.3 (11/11 exact).
- **A4 durable SQL persistence — PASS.** FA-T6 at `round4-findings-digest.md:129` — **EXACT line**; buzz quartet + net-new-table caveat trace to `bz-db-schema.md` §E (R4-2.3: 15 cites PASS).

### P1
- **B1 provider-neutral runner — PASS.** TUI_AGENT_CONFIG substrate `tui-agent-config.ts:49-331` verified (table at :49); 14 `agentHooks:<agent>Status` handlers + 2,907-line `server.ts` — **server.ts measured 2907 lines exactly**; MC trio SpawnOptions/SpawnResult from `mc-ai-providers.md` §8.1 (W2 VERIFIED-PASS).
- **B2 readiness-gated spawn — PASS.** Re-opened buzz sources directly:
  - `readiness.rs:402` — `pub(crate) fn agent_readiness(effective: &EffectiveAgentEnv)` — **EXACT**.
  - `orphan_sweep.rs:110-119` — `BUZZ_MANAGED_AGENT` sole-authoritative ownership-proof comment block — **EXACT**.
  - 3-min quiescence: `autoRestartPolicy.ts` contains `AUTO_RESTART_QUIESCENCE_MS = 3 * 60 * 1000` — **content TRUE**; exec summary's own cite chain (`similarities-gaps.md:162` G-BZ-15) resolves **EXACTLY** (G-BZ-15 row at :162 citing readiness.rs:402). Note: integration-map M5 additionally cites "`autoRestartPolicy.ts:6-9`" where the constant actually sits at **:53** (comment about quiescence at :18-20) — **MINOR M-2**, inherited from the integration map, not introduced by the exec summary.
- **B3 usage/cost ledger — PASS.** FA-T7 at `digest:130` — **EXACT**; MC-no-budget caveat traceable to `mc-ai-providers.md` §6 NOTE (W2 PASS).
- **B4 operator alerting depth — PASS.** FA-T13 at Closure Addendum `digest:278` — **EXACT line**; four semantics gaps (dead-backend signal, seen-vs-acknowledged, aging escalation, outbound transports) all present verbatim.
- **B5 palette Agents section — PASS.** FA-N4 plumbing-verified-present claim matches cross-project-notes :111-132 (non-import evidence, tiny action layer, zero-migration telemetry); wave-4 backing.

### P2
- **C1 agent-capability packages — PASS.** `plugin-manifest.ts:116-119` agents reservation — **EXACT**; four gaps a-d match FA-N3 (:101-105) verbatim.
- **C2 searchable archive — PASS.** FA-T15 at `digest:280` — **EXACT**; generated-tsvector pattern traceable to `bz-search-pubsub.md` (W3 PASS 14/14).
- **C3 fleet live-presence — PASS.** FA-T16 at `digest:281` — **EXACT**; re-opened `_sources/buzz/crates/buzz-pubsub/src/presence.rs:15-16` — `PRESENCE_TTL_SECS: u64 = 180` with "3x the 60s heartbeat" comment — **EXACT**.
- **C4 multi-host transport — PASS.** FA-T8 at `digest:131` — **EXACT**; job kinds 43001-43006 traceable to `bz-relay-event-kinds.md` (R4-2.3: 18 cites PASS).

"Do NOT adopt" footer: `production-architecture.md` §8:149 (BZ Nostr/multi-community tenancy concepts-only), :150 (MC JSON persistence), R4-D :213 (WF-08 unwired approval resume), :215 (MC JSON-file persistence) — **ALL RESOLVE**.

---

## 4. Risks §3 — Verdicts

| # | Risk | Verdict | Evidence re-opened |
|---|---|---|---|
| 1 | Contract-rename blast radius | **PASS** | 65 files / 656 preload sites / ~78 namespaces = digest FA-T11 `:134` EXACT + integration map R1; census independently reproduced by R4-2.3 |
| 2 | Rebrand hard-break surfaces | **PASS** | `fa-settings-config-datadirs.md`: safeStorage key rename → undecryptable (:287), `persist:FABRICA-browser` orphaning (:289), ~130 FABRICA_* env vars (:295) — ALL EXACT; strategy quote "keep on-disk filenames… change only display surfaces" at **:308 EXACT** (:309 = option b); FA-T14 at digest :279 region consistent |
| 3 | Watcher-stack fragility (R9) | **PASS** | `fa-ipc-watchers.md:407` EXACT (same anchor as C-1.6) |
| 4 | Two chokepoint files | **PASS** | Measured directly: `pty.ts` = **7745 lines** (claim 7,745), `agent-hooks/server.ts` = **2907 lines** (claim 2,907) — both EXACT |
| 5 | Plugin sandbox honesty (R4) | **PASS** | FA-N3 gaps a/b verbatim (raw Node post-activate; no exec/spawn/fs host method; terminal.sendText de-facto primitive risk); wave-5 backing |
| 6 | Token-in-child-env + fail-open (R5/R6) | **PASS** | FA-N2 KNOWN TRADE-OFF paragraph at `cross-project-notes-r4.md:78` — EXACT; fail-open 204 + lazy TTL at :74/:76 — EXACT |
| 7 | Verification debt on two inputs | **PASS w/ observation** | digest §A3 table (:264-269): mc-adapters-linelevel HYG-only, fa-wsl HYG(4.3)-only, bz-pair-relay-cli NONE, fa-pty-terminal HYG→since factually checked by R5-2.3 — exec summary states this correctly and updates the status honestly. Three never-landed reports cite `digest:271` — EXACT. **Observation O-1:** the three rewrites described as "in-flight" have since landed and been verified (fa-auth-onboarding.md, bz-voice-media.md, mc-ui-frontend.md all on disk; R5-2.1/R5-2.2 passes cover auth+voice-media, ledger rows show R4-1.13 DONE) — accurate at authoring time, superseded by board progression since. Not an error. |
| 8 | MC defect porting trap | **PASS** | Fix-before-port lists present verbatim: FA-N7 items a-g (:213-220), FA-N8 items a-c (:243-247), FA-N9 items 1-9 (:269-278); W5/W7 VERIFIED-PASS backing |

---

## 5. Header Aggregate Claims

1. "~500+ citations sampled across Round 4 waves W0-W8 with 0 failed" — **PASS**: `verify/round4-master-index.md:82` verbatim ("**Aggregate spot-verification record:** ~500+ citations sampled across waves W0/W2-W8 — **0 FAILED** anywhere").
2. "R5-2.3: 45/45 pass on the R5 integration map incl. first-ever factual check of fa-pty-terminal.md" — **PASS**: `verify/round5-wave2-spot-verification.md:11` verbatim ("**PASS - 45/45 sampled citations verified (44 exact, 1 minor variance, 0 failures)**"); fa-pty-terminal row 11/11 exact; the pass itself confirms it was the first factual check of that report.

---

## 6. Findings Register

| ID | Severity | Location | Finding |
|---|---|---|---|
| M-1 | MINOR (cosmetic range) | Exec summary §2/A1 cite `cross-project-notes-r4.md:256-282` for FA-N9 | FA-N9 heading sits at **:253**; the cited window covers the body but not the heading. Content fully supported. No correction required under the no-rewrite rule; downstream readers should treat FA-N9 as :253-282. |
| M-2 | MINOR (inherited line drift) | Integration map §7/M5 anchor "`autoRestartPolicy.ts:6-9`" (quoted in exec summary B2 chain) | The 3-min quiescence constant lives at **:53** (`AUTO_RESTART_QUIESCENCE_MS = 3*60*1000`); :6-9 holds the safety-critical doc comment. Factually true claim, wrong micro-anchor. Belongs to `r5-agent-platform-integration-map.md`, recorded here per no-rewrite rule. |
| O-1 | Observation (stale-by-progression, not error) | Exec summary Risk 7 + Open Question 10 | Describes the three R4-1.13/14/22 rewrites as in-flight. Board state has since advanced: all three reports exist on disk and R5-2.1/R5-2.2 verified two of them. Accurate when written; PM brief consumers should read those items as closed. |

No unsupported claims. No fabricated citations. No failed anchors among the ~45 directly re-opened file:line positions.

---

## 7. Scan-Coverage Statement

**Read in full this session:** `analysis/atlas-executive-summary.md` (148 ln), `analysis/r5-agent-platform-integration-map.md` (269 ln), `analysis/cross-project-notes-r4.md` (316 ln), `analysis/round4-findings-digest.md` (301 ln incl. Closure Addendum), `Fabrica-atlas-tasks.md` (Checkpoint + group tables + ledger, first 456 lines).

**Re-opened directly (targeted reads/line counts):** Fabrica-app: `src/main/ipc/pty.ts` (:255-262, :335-344, :1710-1721, :4934-4935, :5786-5825; total 7,745 ln), `src/main/providers/local-pty-provider.ts` (:282-295, :1021-1028), `src/shared/tui-agent-config.ts` (:49 anchor; 351 ln), `src/shared/plugins/plugin-manifest.ts` (:112-121), `src/main/ipc/register-core-handlers.ts` (:109/:133-134; 234 ln), `src/main/git/runner.ts` (1,838 ln), `src/main/agent-hooks/server.ts` (2,907 ln). `_sources/buzz`: `desktop/src-tauri/src/managed_agents/readiness.rs` (:400-404), `.../runtime/orphan_sweep.rs` (:108-121), `desktop/src/features/agents/lib/autoRestartPolicy.ts` (:1-12 + quiescence grep), `crates/buzz-pubsub/src/presence.rs` (:14-17).

**Checked via line-targeted extraction:** `analysis/similarities-gaps.md` (:162), `analysis/production-architecture.md` (:148-157, :205-216), `discovery/round4/fa-ipc-watchers.md` (:407), `fa-settings-config-datadirs.md` (:269-278, :283-299, :305-310), `fa-autoupdate-build.md` (:228-248), `fa-git-integration.md` (:13, :15, :272-279), `verify/round4-master-index.md` (aggregate rows :82, :99, :188), `verify/round5-wave2-spot-verification.md` (:11-22, :70-109).

**Not read:** remaining bodies of the round4 discovery reports (covered by their named verify passes); `_sources/mission-control` sources (all MC-side claims carry W5/W7 pass backing and were not re-sampled here); verify-pass bodies other than those listed above; anything outside the Atlas board except the read-only re-openings listed.

**Integrity:** READ-ONLY on `_sources/` and `../Fabrica-app/`. Files written this session: this report + tracking-row updates in `Fabrica-atlas-tasks.md`. Nothing else.

_Report end — ATLAS R5-4.2._
