# Digest v2 Refresh — Validation of Round 4 Recommendations & Notes Against the Full Evidence Base

> ATLAS R5-3.2 RETRY (retry of dead ctx_20b4e367bb18) · Group 3 synthesis · 2026-08-23
>
> Purpose: validate every recommendation in `analysis/round4-findings-digest.md` (body FA-T1..FA-T11 + Closure Addendum FA-T12..FA-T18) and every note in `analysis/cross-project-notes-r4.md` (FA-N1..FA-N10) against the full Round 4 evidence base as it stands at Round 5 closure. Each item is marked CONFIRMED / REVISED / SUPERSEDED with citations. Contradictions are consolidated in §3; a priority-ordered Atlas-project recommendation list is in §5.
>
> Scope note: the dispatch text says "FA-T1..T4"; the digest series actually runs FA-T1..FA-T18. To leave no recommendation unvalidated, this refresh covers the FULL FA-T series (superset of the dispatch reading) plus all ten FA-N notes.

## 0. Inputs read in full this session

| File | Role |
|---|---|
| `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` (549 ln, complete) | Checkpoint, group tables, Verification Tracker, Session Ledger |
| `analysis/round4-findings-digest.md` (301 ln incl. Closure Addendum) | Validation target: FA-T1..T11, C1..C10/G1..G10 context, Notes N1-N3, A1-A5 addendum |
| `analysis/cross-project-notes-r4.md` (316 ln) | Validation target: FA-N1..N10 |
| AGENTS.md | Board rules (system-injected) |

Verification statuses were taken from the Verification Tracker + Session Ledger rows (which record each wave's totals verbatim) and from digest A1/A3. Three headline figures were INDEPENDENTLY REPRODUCED FROM SOURCE this session (not transcribed):

1. **64 services** in `_sources/mission-control/mission-control/data/field-ops/service-catalog.json` (JSON parse, `services` array count = 64) — confirms N2/CA-2 lineage.
2. **20 mutex entries** at `_sources/mission-control/mission-control/src/lib/data.ts:177-196` (registry declared :176-197) — independently confirms correction CA-1 (17 -> 20).
3. **14 managed hook targets** (`src/shared/agent-hook-types.ts`, `AGENT_HOOK_TARGETS` = 14 quoted entries) vs **18 live `/hook/<source>` pathnames** (`src/shared/agent-hook-listener.ts`: 18 unique `/hook/...` strings enumerated: amp, antigravity, claude, codex, command-code, copilot, cursor, devin, droid, gemini, grok, hermes, kimi, mimo-code, omp, opencode, pi, prime-agent) — independently confirms correction CA-2.
4. Bonus check: `freshdeck-mcp` present at `service-catalog.json:1018` (digest N3 said :1014 — minor line drift, substance confirmed).

---

## 1. Verification-status refresh (evidence base as of 2026-08-23)

The digest's §4b unverified list and Closure Addendum §A3 are both substantially stale after Rounds 4 waves 4-8 and Round 5. Current truth:

| Report backing digest items | Status at R4-3.2 time | Status NOW | Evidence |
|---|---|---|---|
| fa-ipc-watchers.md | VERIFIED (R4-2.3, 18 exact / 0 failed) | VERIFIED | verify/round4-spot-verification.md |
| bz-db-schema.md | VERIFIED (15 cites, V-R4-1 caveat) | VERIFIED | same |
| bz-relay-event-kinds.md | VERIFIED (18 exact) | VERIFIED | same |
| fa-autoupdate-build.md | VERIFIED (14 exact) | VERIFIED | same |
| mc-workflow-engine.md | UNVERIFIED | **VERIFIED-PASS** (24 cites: 23 exact + 1 factual nit -> CA-1 fix) | verify/round4-wave2-spot-verification.md |
| mc-ai-providers.md | UNVERIFIED | **VERIFIED-PASS** (20 cites: 19 exact + 1 cosmetic) | same |
| mc-service-catalog.md | UNVERIFIED | **VERIFIED-PASS** (19 exact; headline numbers digit-for-digit) | same |
| fa-window-tray-notifications.md | n/a | VERIFIED-PASS (51 cites) | same |
| bz-ops-deploy-admin.md | n/a | VERIFIED-PASS (32 cites) | same |
| fa-git-integration.md | n/a | VERIFIED-PASS (16/16) | verify/round4-wave3-spot-verification.md |
| fa-settings-config-datadirs.md | n/a | VERIFIED-PASS (17 exact + 1 cosmetic) | same |
| bz-search-pubsub.md | n/a | VERIFIED-PASS (14/14) | same |
| mc-notifications-alerting.md | n/a | VERIFIED-PASS (17/17) | same |
| fa-telemetry-consent.md | n/a | VERIFIED-PASS (wave-4 pair: 36 exact / 1 minor) | verify/round4-wave4-spot-verification.md |
| fa-command-palette-search.md | n/a | VERIFIED-PASS (same pass) | same |
| mc-execute-guards.md | n/a | VERIFIED-PASS (~75 cites: 73 exact / 2 cosmetic / 0 failed) | verify/round4-wave5-spot-verification.md |
| fa-plugin-runtime.md | n/a | VERIFIED-PASS (same pass) | same |
| fa-agent-hooks-probes.md | n/a | VERIFIED-PASS (44 cites: 41 exact / 3 minor / 0 failed; 14/18 counts reproduced from source) | verify/round4-wave6-spot-verification.md |
| mc-fieldtask-kanban.md | n/a | VERIFIED-PASS (~115+ cites: 0 failed) | verify/round4-wave7-spot-verification.md |
| mc-decision-gates.md | n/a | VERIFIED-PASS (same pass; finding F3 noted below) | same |
| fa-mobile-companion.md | n/a | VERIFIED-PASS (wave-8: 29 exact / 3 cosmetic / 0 failed) | verify/round4-wave8-spot-verification.md |
| **mc-adapters-linelevel.md** | UNVERIFIED | **STILL HYG-ONLY** (encoding/coverage only; content never factually re-checked) | round4-consistency-audit.md; master-index A3 |
| **fa-pty-terminal.md** | UNVERIFIED | **STILL HYG-ONLY** (BOM stripped only) | same |
| **fa-wsl-remote-execution.md** | HYG only | **STILL HYG-ONLY** (no factual spot pass ever ran; planned wave-8 slot went to fa-mobile-companion instead) | cross-project-notes-r4 status table; tracker |
| bz-pair-relay-cli.md | NONE | **VERIFIED-PASS** (R5 wave1-b: 33 exact / 1 minor cosmetic / 0 failed) | verify/round5-wave1-spot-verification-b.md |

Also resolved since the Addendum: the three "never landed" reports listed in A3 (`fa-auth-onboarding.md`, `bz-voice-media.md`, `mc-ui-frontend.md`) ALL landed and were spot-verified PASS in Round 5 wave 1 (verify/round5-wave1-spot-verification-a.md and -b.md). The A3 re-dispatch-or-drop question is closed: landed + verified.

Aggregate citation record across all passes W0/W2-W8 + R5 waves: ~850+ cites sampled, **0 conclusion-affecting failures anywhere** (per r5-convergence-memo.md and the tracker rows above).

---

## 2a. Verdicts — digest recommendations FA-T1..T11 (body)

| ID | Recommendation (one-line) | Verdict | Basis |
|---|---|---|---|
| **FA-T1** | Provider-neutral runner abstraction over PTY seeded with MC's Spawn trio | **CONFIRMED - STRENGTHENED** | Core donor report mc-ai-providers.md now VERIFIED-PASS (W2). Substrate side upgraded decisively: fa-agent-hooks-probes.md VERIFIED-PASS (W6) calls TuiAgentConfig "a SpawnSpec-in-waiting" with HIGH fit / LOW parallel-machinery risk, and names the concrete deliverables (cross-project-notes-r4.md FA-N1: derive SpawnSpec from `src/shared/tui-agent-config.ts:20-47`; collapse 14 copy-paste `agentHooks:<agent>Status` channels `src/main/ipc/agent-hooks.ts:142-323`; extract per-provider parsing from server.ts). fa-git-integration.md (W3 PASS) adds main/git/runner.ts raw-execFile centralization as a second in-repo precedent (digest FA-T18). Only revision: fleet-count figure inside C7 (see contradiction K1). |
| **FA-T2** | Approval-gated autonomy layer for irreversible actions; one guard stack at the IPC boundary | **CONFIRMED - STRENGTHENED** | mc-execute-guards.md (W5 VERIFIED-PASS, ~120 cites) independently mapped the full 13-layer ordered guard stack and produced the 12-item weakness register + 8-item port map that became notes-r4 FA-N7's 7-item FIX-BEFORE-PORT list (creation-path approval hole, batch bypass, no owner check on execute route, dead SOFT_LIMIT config - negative claim independently reproduced during verification). Enforcement point register-core-handlers.ts:109-234 unchanged (fa-ipc-watchers.md, R4-2.3 PASS). Residual caveat: G5/G6 halves resting on mc-adapters-linelevel.md remain factually unverified (HYG-only), but every load-bearing pattern of FA-T2 is double-covered by the verified execute-guards report. |
| **FA-T3** | Decision-gate escalation: runaway loops freeze dispatch into structured questions | **CONFIRMED** | mc-decision-gates.md now VERIFIED-PASS (W7): DecisionItem schema, Zod limits (QUESTION 500 / ANSWER 500 / CONTEXT 5000 / MAX_OPTIONS 20), six independent run-blocking enforcement points, answer injection via buildRetryContext latest-answer-only - all reproduced by verifiers. Wave-7 finding F3 (report sec 2.3 mischaracterizes `withDecisions` as write-back; it is a read-only-in-lock helper) does NOT touch any mechanic FA-T3 relies on. Fix-before-port items carried forward intact into FA-N8 (no consumption marker, mutex-vs-raw-fs race, no auth on endpoints, unbounded duplicate churn, no TTL). Caveat: the detection-substrate half citing fa-pty-terminal.md (OSC-133 / inference helpers) rests on a report that is STILL HYG-ONLY - see residual debt D2. |
| **FA-T4** | Fleet supervision: persistent retry queue, continuation chains, global slot math; replace MC JSON+mutex persistence with real IPC+SQLite | **CONFIRMED - ONE FIGURE REVISED** | mc-workflow-engine.md now VERIFIED-PASS (W2); mc-ai-providers.md VERIFIED-PASS (W2). Correction CA-1 applies everywhere downstream: the per-file mutex registry holds **20** entries, not 17 - independently reproduced THIS SESSION at `src/lib/data.ts:177-196`. The persistence-redesign recommendation itself ("direct-write paths bypass the mutexes... Fabrica's Electron/Rust layer can replace these with real IPC + SQLite", mc-workflow-engine.md sec 12 item 5) is unaffected and remains CONFIRMED. |
| **FA-T5** | Adapter registry (ServiceAdapter contract) + catalog-as-data with honest manual fallback; reconcile vocabularies | **CONFIRMED (split evidence quality)** | Catalog half fully verified: mc-service-catalog.md W2 PASS with headline numbers reproduced digit-for-digit (64 services / 6 native adapters / auth 42-21-1 / risk 20-40-4; 64 re-confirmed by JSON parse this session). Adapter-contract half (types.ts:102-144, registry.ts:13-47) still rests on mc-adapters-linelevel.md which is HYG-ONLY - keep the "unverified (self-reported coverage)" label on those specific cites until a pass runs (residual debt D1). |
| **FA-T6** | Durable SQL-backed task/run/approval persistence on buzz's workflow quartet | **CONFIRMED** | bz-db-schema.md VERIFIED (R4-2.3, 14 exact + 1 minor). Minor caveat V-R4-1 (push-gateway cites sit inside `#[cfg(test)] mod tests`) touches the push-lease/queue portion only; the workflow quartet cites (0001_initial_schema.sql:362-466, workflow.rs:328-376 etc.) were verified exact. Net-new-table note (bz-db-schema.md sec E) unchanged. |
| **FA-T7** | Usage/cost ledger from agent_metric_index shape + budget enforcement MC lacks | **CONFIRMED** | Both donors now verified: bz-db-schema.md (R4-2.3 PASS) and mc-ai-providers.md (W2 PASS, including the "daemon LLM spend has no budget cap - only observability" NOTE). Stale-path nit CA-3: the reconciliation reference should read `discovery/round3/round3/ai-vault-browser.md` (double round3 dir), flagged by consistency audit; path only, content unaffected. |
| **FA-T8** | Adopt buzz transport as-is if multi-host agent channels planned; do NOT carry MC polling where push IPC exists | **CONFIRMED** | bz-relay-event-kinds.md VERIFIED (18/18 exact, R4-2.3). The anti-recommendation (polling-over-HTTP rejection, fa-ipc-watchers.md:406) sits on an R4-2.3-PASS report. Post-digest reinforcement: notes-r5 (cross-project-notes-r5.md) adds chain-dispatch/reconciler patterns on top without contradicting anything here. |
| **FA-T9** | Rebrand guardrails: audit feed URLs, appId decision, publisher/SignPath strings, userData migration | **REVISED - STRATEGY SUPERSEDED BY FA-T14** | Baseline facts all VERIFIED (fa-autoupdate-build.md, 14/14 exact, R4-2.3). But the Closure Addendum's FA-T14 (from fa-settings-config-datadirs.md, W3 PASS) supersedes the expensive parts of the strategy: "keep on-disk filenames and partition strings unchanged (opaque identifiers); change only display surfaces" (`fa-settings-config-datadirs.md:308-309`) avoids the safeStorage-undecryptable break ('<appName> Safe Storage' rename), the `persist:FABRICA-browser` orphaning, the `'FABRICA-first'` literal, and ~130 FABRICA_* env-var mirroring (:286-298) entirely. Treat FA-T9 as the audit checklist; FA-T14 as the chosen strategy. |
| **FA-T10** | Staged rollout greenfield (cohort-based latest*.yml routing) | **CONFIRMED** | fa-autoupdate-build.md VERIFIED (R4-2.3): stagingPercentage zero-match negative claim stands; generic-feed architecture makes server-side percentage routing straightforward (report sec E). |
| **FA-T11** | Watcher stack preservation + `<namespace>:<action>` channel strings as three-layer public contract | **CONFIRMED** | fa-ipc-watchers.md VERIFIED (18/18 exact incl. canary/fuse/quarantine cites; "highest-risk subsystem to preserve verbatim" warning at :407). Minor label fix V-R4-2 (usage-provider family is 8 channels, not 5) does not affect the contract claim; if anything a LARGER preload surface strengthens it. |

## 2b. Verdicts — Closure Addendum recommendations FA-T12..T18

| ID | Recommendation | Verdict | Basis |
|---|---|---|---|
| **FA-T12** | Formalize single-instance lock + discovery files as THE CLI<->desktop control channel | **CONFIRMED - STRENGTHENED** | Both source reports VERIFIED-PASS (fa-window-tray-notifications W2 51 cites; fa-settings-config-datadirs W3 17+1). Since the Addendum, R5 deep dive fa-multi-instance.md (discovery/round4/fa-multi-instance.md, 36.5KB, ~90 cites: lock key = userData profile, exit-code-3 supervisor contract, FABRICA_USER_DATA_PATH targeting, hook receiver port-0 loopback + endpointNamespace seam, L1-L10 leak register) maps exactly this surface in greater depth. Its own factual spot pass is assigned but IN_PROGRESS (R5-2.12) - treat its extra detail as strong-pending. Nothing contradicts the recommendation; "do not invent a second discovery mechanism" stands. |
| **FA-T13** | Operator alerting: reuse FA attention pipeline + port MC diff-poll first-fetch suppression; fill 4 proven gaps | **CONFIRMED** | fa-window-tray-notifications.md W2 PASS (tray pre-gate :397-403, burst dedupe, click-to-pane, 13-type copy normalization) + mc-notifications-alerting.md W3 PASS (first-fetch suppression use-active-runs.ts:36-39; zero outbound transports; silent poll-error swallowing; implicit mark-read; no aging escalation). All four gap-fills remain valid. |
| **FA-T14** | Rebrand strategy upgrade: opaque on-disk identifiers, change display surfaces only | **CONFIRMED - now the governing strategy** | fa-settings-config-datadirs.md W3 PASS (:308-309 quote verified region). Supersedes the strategy portions of FA-T9/T11 as described in verdict FA-T9. Also adopted by downstream syntheses: atlas-risk-register.md P0/P1 rows and atlas-executive-summary.md adoptions already assume it - consistent, no conflict. |
| **FA-T15** | Searchable agent archive via generated-tsvector + privacy allowlist discipline | **CONFIRMED** | bz-search-pubsub.md W3 PASS 14/14 exact (index-update-is-the-row-write lib.rs:7-10; fresh-install allowlist migrations/0008; NULL-tsv p-gating + drift test kind.rs:144-154; per-hit re-auth query.rs:1-9). |
| **FA-T16** | Fleet live-status plumbing: refcount+debounce topics, heartbeat-scaled presence TTL | **CONFIRMED** | Same W3 PASS report (lib.rs:192-245, presence.rs:15-16, conn_control/cache_invalidation channel split). |
| **FA-T17** | Deploy-agents-to-cluster blueprint from buzz k8s provider wire protocol | **CONFIRMED** | bz-ops-deploy-admin.md W2 PASS 31/32 exact (stdin/stdout single-JSON wire.rs; anti-hot-loop reconcile.rs:363-373,406-428 incl. the 107-Secrets-in-600s measurement; fail-fast run.sh:19-36). |
| **FA-T18** | Git plane as general CLI-tool-runner precedent feeding FA-T1 | **CONFIRMED** | fa-git-integration.md W3 PASS 16/16 exact (runner.ts centralization, git-capability-cache negative caching, selective agent credential guard pty.ts:1714-1719 "user terminals keep normal Git behavior"). |

## 2c. Verdicts — digest Notes N1-N5

| ID | Note | Verdict | Basis |
|---|---|---|---|
| **N1** | Verification debt: five reports lack verification before feeding external tasks | **SUPERSEDED (3 of 5) / PARTIALLY OPEN (2 of 5)** | mc-workflow-engine, mc-service-catalog, mc-ai-providers: all VERIFIED-PASS in wave-2 (see sec 1). Remaining open: mc-adapters-linelevel.md and fa-pty-terminal.md (both HYG-only). The note's intent is absorbed by residual-debt items D1/D2 in sec 4. |
| **N2** | Use 64 services (not ~66/~67); 6 native adapters = 9.4% coverage | **CONFIRMED - REPRODUCED** | JSON-parse count = 64 again this session. Upstream mc-adapters-linelevel.md still carries "~66" at its lines 39/:180 per the no-content-rewrite rule - downstream consumers MUST keep using 64. No contradiction with W2's digit-for-digit service-catalog reproduction. |
| **N3** | `freshdeck-mcp` likely upstream typo worth checking before copying catalog data | **CONFIRMED - STILL OPEN** | String present today at `service-catalog.json:1018` (digest said :1014 - cosmetic drift, same entry). Never resolved upstream; flag survives into any catalog-as-data port (FA-T5). |
| **N4** | MC alerting gaps upstream-fixable (zero outbound transports etc.) | **CONFIRMED** | All four negatives stand on mc-notifications-alerting.md W3 PASS + negative-search evidence; unchanged since. |
| **N5** | buzz admin-web needs real auth before external exposure | **CONFIRMED** | Host-header-equality-only gating (bz-ops-deploy-admin.md W2 PASS); carried as P1 row into atlas-risk-register.md - consistent. |

## 2d. Verdicts — notes-r4 FA-N1..N10

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
| **FA-N10** | Sequencing: task model -> guard stack -> decision queue | **CONFIRMED** | Synthesis judgment over three now-VERIFIED-PASS reports; later syntheses (atlas-phased-roadmap.md phases, r5-agent-platform-integration-map.md composition picture) adopted the same ordering - no contradiction anywhere in the evidence base. |

---

## 3. Contradictions & corrections register (consolidated)

Every known inconsistency between digest v1 (+Addendum), notes-r4, and the current evidence base:

| # | Contradiction / correction | Resolution for downstream consumers |
|---|---|---|
| K1 | Digest C7 says "15+ CLIs / 14 channels"; W6 verified 14 managed hook targets vs 18 live `/hook/*` pathnames (CA-2) | Use 14 managed / 18 live everywhere. Reproduced from source this session (sec 0 item 3). Older "15 named CLIs" figures are wrong. |
| K2 | Digest G4/FA-T4 inherits "17 named mutexes" from mc-workflow-engine; actual registry has 20 (CA-1) | Use 20 (`src/lib/data.ts:177-196`). Reproduced from source this session. |
| K3 | "~66"/"~67" services in mc-adapters-linelevel.md (:39/:180) vs 64 verified in service-catalog | Always 64 (JSON parse reproduced twice: W2 + this session). Upstream report left uncorrected per no-rewrite rule. |
| K4 | Wave-7 F3: mc-decision-gates.md sec 2.3 mischaracterizes `withDecisions` as write-back | It is a read-only-in-lock helper. No effect on FA-T3/FA-N8 mechanics; do not cite sec 2.3 for write semantics. |
| K5 | V-R4-1: bz-db-schema push-gateway "runtime guards" cites sit inside `#[cfg(test)] mod tests` | Substance stands; treat those specific cites as test-module evidence, production runner is apply_migrations_and_grants (:19-23). |
| K6 | V-R4-2: usage-provider template-literal family labeled x5 actually registers 8 channels | Label undercount only; strengthens FA-T11's public-contract claim if corrected upward. |
| K7 | CA-3: digest cites `discovery/round3/ai-vault-browser.md`; real path is `discovery/round3/round3/ai-vault-browser.md` | Path-only fix for consumers; no content impact. |
| K8 | verify/round4-spot-verification.md:164 claims all other Round 4 reports covered by R4-2.1/R4-2.2 | False at the time (R4-2.1 covered ROUND 3 reports; R4-2.2 was hygiene). Mooted by later waves W2-W8 which did cover them; retained here so the false assurance is never reused. |
| K9 | Addendum A3 lists fa-auth-onboarding / bz-voice-media / mc-ui-frontend as "never landed" | SUPERSEDED: all three landed and passed spot verification in R5 wave 1 (verify/round5-wave1-spot-verification-a.md, -b.md). |
| K10 | Addendum A3 says treat bz-pair-relay-cli claims as unverified | SUPERSEDED: VERIFIED-PASS via R5 wave1-b (33 exact / 1 cosmetic / 0 failed). Its SAS-verified-bootstrap input to the deviceToken recommendation (digest FA-N-lineage in bz-pair-relay-cli.md relevance section) is now citable as verified. |
| K11 | N3 cite drift: freshdeck-mcp at catalog :1014 (digest) vs :1018 (current file) | Cosmetic line drift; entry exists, flag stays open. |
| K12 | F-1 phantom liveness-probe cite in mc-chainedispatch-reconciler.md sec 7.3 | Fixed in place by R5-4.3 (real probe sites substituted; RUNTASK:360-363 was a spawn-options object). Post-digest report, affects cross-project-notes-r5 consumers only - recorded here for register completeness. |

No CONTRADICTING RECOMMENDATION was found: no FA-T or FA-N item is invalidated by any other part of the evidence base; the only supersession is strategic (FA-T9/T11 rebrand handling -> FA-T14), which the Addendum itself introduced.

---

## 4. Residual verification debt (the only open items)

- **D1:** mc-adapters-linelevel.md - content never factually spot-checked (HYG-only). Affects G5/G6/FA-T5 adapter-half cites only; guard-stack overlap is independently verified via mc-execute-guards.md.
- **D2:** fa-pty-terminal.md - content never factually spot-checked (HYG-only). Underpins C1-C5/C8 capability claims and FA-T3's detection-substrate half.
- **D3:** fa-wsl-remote-execution.md - content never factually spot-checked (HYG-only). Gate on FA-N5 numbers; P0 risk row (WSL rm -rf trap) deserves the pass most.
- **D4:** fa-multi-instance.md + fa-search-indexing.md - spot verification assigned (R5-2.12) but IN_PROGRESS at writing.

Everything else in the Round 4/5 evidence base is citation-verified with 0 failed cites.

---

## 5. Consolidated priority-ordered recommendation list (Atlas-project view)

Merged from validated FA-T1..T18 + FA-N1..N10, aligned with atlas-risk-register.md priorities and atlas-phased-roadmap.md phases. Every entry carries a validated verdict from sec 2.

### P0 - safety / irreversibility / rebrand hard-breaks

1. **Rebrand strategy: opaque identifiers, display-surface-only changes** (FA-T14 governing; FA-T9 as audit checklist; FA-T11 contract caution). First concrete act: kill/redirect the old-brand feedback endpoint leak (FA-N6 item 1; risk-register P0).
2. **Approval-gated autonomy + single ordered guard stack at the IPC boundary** (FA-T2 via FA-N7), WITH the 7 fix-before-port defects - never port MC's creation-path approval hole or batch bypass.
3. **WSL destructive-op containment preserved** (FA-N5 items 3/1; risk-register P0): approvedRoots required, TOCTOU re-verification intact - pending only the D3 spot pass for line-number citations.

### P1 - core architecture spine (build order per FA-N10)

4. **Dual task-domain model skeleton** (FA-N9): two domains, ONE enum source of truth, registry-resolved assignment, no dead fields.
5. **Provider-neutral runner abstraction** (FA-T1 via FA-N1): SpawnSpec from TuiAgentConfig, collapse 14 channels to one parameterized dispatcher, extract per-provider parsing; keep zero-polling architecture (FA-N2) and loopback hardening non-negotiable.
6. **Decision queue / operator intervention** (FA-T3 via FA-N8): block-with-payload IPC, intercept-and-rerun, consumption markers on answers, transactional store replacing mutex+raw-fs.
7. **CLI<->desktop contract formalization** (FA-T12): lock-key=profile + exit code 3 + FABRICA-runtime.json as THE discovery mechanism; no second mechanism.

### P2 - capability completion

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

---

## Scan-Coverage Statement

**Read in full this session:** `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` (549 ln, complete incl. Checkpoint/Tracker/Ledger); `analysis/round4-findings-digest.md` (301 ln complete, body + Closure Addendum); `analysis/cross-project-notes-r4.md` (316 ln complete); AGENTS.md.

**Verification statuses:** taken from the task-file Verification Tracker + Session Ledger rows (which record each wave's sampled totals verbatim) and from digest sections A1/A3; per-report statuses cross-checked against the ledger entries quoted in the digest and notes files themselves.

**Independent source reproductions performed this session (read-only):** service-catalog.json services count (=64, JSON parse); src/lib/data.ts mutex registry lines 165-205 (=20 entries at :177-196); Fabrica-app/src/shared/agent-hook-types.ts AGENT_HOOK_TARGETS count (=14) + agent-hook-listener.ts unique `/hook/<source>` enumeration (=18); freshdeck-mcp presence (catalog :1018). No other source files opened.

**Not read this session:** full bodies of individual discovery reports and verify-wave files (statuses taken from tracker/ledger/digest-quoted material - this is a synthesis-layer validation, consistent with the digest-v1 method); other analysis docs (risk register, roadmap, exec-summary, integration map, notes-r5, convergence memo) except as referenced by name from the files read; anything under `_sources/` beyond the four reproduction reads listed above; `../Fabrica-app/` beyond the two hook-count reads.

**Integrity:** no file outside `.Fabrica-atlas-board/` was created or modified; sources touched read-only.

_Report end - ATLAS R5-3.2 RETRY._
