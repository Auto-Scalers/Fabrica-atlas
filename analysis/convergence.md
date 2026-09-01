# ATLAS R5-3.7 — Round 1–5 Convergence Evidence Memo

> **Purpose:** evidence base for the PM's round-closure decision (close discovery rounds / continue / targeted-only).
> **Task:** R5-3.7 · task_f80d51ee02cf · dispatch ctx_c6030a657c3b · Group 3 (Synthesis) · Date 2026-08-23.
> **Method:** full read of all verification passes (round3/round4/round5 wave spot-verifications, master index, closure gate, consistency audit); all 9 `analysis/*.md` synthesis docs; scan-coverage statements of all 41 discovery reports across `discovery/mission-control/`, `discovery/buzz/`, and `discovery/fabrica-app/` + 3 main discovery docs; live disk listings of `../Fabrica-app/src/main`, `_sources/buzz/crates`, and `.Fabrica-atlas-board/`. Every claim below cites a path; line numbers given where practical. This memo is honest, not optimistic — §4.1 lists what a further round would NOT fix.

---

## 1. Evidence that findings are diminishing

### 1.1 New-fact yield per discovery wave (breadth → depth → recombination)

| Wave | Output volume | Nature of new knowledge | Evidence |
|---|---|---|---|
| Round 1 | 3 repo-wide maps (~18,800 files scanned) | Entire repos first mapped: features, architecture, logic at survey depth | Verification Tracker R1 rows, `.Fabrica-atlas-board/Fabrica-atlas-tasks.md:388-390`; outputs `discovery/mission-control-discovery.md`, `discovery/buzz-discovery.md`, `discovery/fabrica-app-discovery.md` |
| Round 2 | 4 deep dives merged as addenda | First depth pass: FA orchestration+RPC, BZ relay, MC tests | tasks.md:65 ("4 parallel deep dives … verification clean") |
| Round 3 | 7 reports / ~334KB (now in `discovery/fabrica-app/`, `discovery/buzz/`, `discovery/mission-control/`) | Genuinely NEW areas opened: renderer (74KB), main subsystems/codex (75KB), plugins, AI Vault+browser, buzz desktop, buzz agent crates, MC frontend+buzz clients | ledger "Worker report outputs", Fabrica-atlas-tasks.md:505-513 |
| Round 4 | 25 reports (now in `discovery/mission-control/`, `discovery/buzz/`, `discovery/fabrica-app/`, 22–66KB each) | Mostly LINE-LEVEL DEPTH on already-mapped subsystems, plus a minority of genuinely new surfaces (agent-hooks/probes, multi-instance, search-indexing internals, decision-gates, execute-guard stack). Notable new facts are mostly NEGATIVE findings: "zero outbound transports" in MC notifications (`mc-notifications-alerting.md`), no persistent code index + embeddings-negative (`fa-search-indexing.md`), dead `scheduledFor` field & enum drift (`mc-fieldtask-kanban.md`) | per-report coverage statements; digest Closure Addendum A2, `analysis/round4-findings-digest.md:232-258` |
| Round 5 | 3 deep dives (`mc-chainedispatch-reconciler.md`, `fa-multi-instance.md`, `fa-search-indexing.md`) | All three inside ALREADY-MAPPED subsystems — refinement, not new territory. The rest of Round 5 output is synthesis recombination (integration map, risk register, roadmap, exec summary, notes v3) that performed NO new source scanning by its own admission: "no direct source scan; all anchors second-hand" (`analysis/agent-platform-integration-map.md:267`) | coverage statements of each report; §G–§H of R4 master index |

**Trend:** each round since 3 has produced fewer genuinely new *areas* (R3: 7 new areas → R4: ~5 partially-new surfaces inside known areas → R5: 0 new areas, 3 refinements) while synthesis docs increasingly recombine prior findings rather than discover (`agent-platform-integration-map.md:263-269`; risk-register verification :138-141 "no primary sources opened"; roadmap verification :172 "no direct source scan performed").

### 1.2 Verification yield is collapsing (the strongest convergence signal)

Cumulative sampled citations across all spot passes ≈ **1,020+** (R3:164 + R4:"~500+" + R5:~357). Defect trend:

| Pass | Citations sampled | FAILED | MINOR/cosmetic | Conclusion-affecting? | Source |
|---|---|---|---|---|---|
| R3 spot (R4-2.1) | 164 | **1** (casing error F-1) | 1 partial + drift register F1–F7 | Yes — 1 factual error found+fixed via R4-2.2 | R3 spot verification |
| R4 waves W0–W8 | "~500+" | **0** | ~10 MINOR (e.g., mutex count 17→20, usage-provider 5→8 channels) | No | R4 master index; R4 spot verification; R4 wave-2 |
| R5 waves 1–3 + exec-summary | ~357 | **1** (F-1 phantom cite, low-impact, fixed in place via R5-4.3) | ~15 minor/cosmetic/stale | No — "0 conclusion-affecting failures anywhere" | R5 wave-3; R4 master index |
| Synthesis-fidelity passes (risk-register, roadmap) | ~123 checks/rows | **0** | 5 editorial/stale-by-progression | No | risk-register verification; roadmap verification |

Two independent readings of this table:

1. **Error rate fell from 0.6% (R3) to <0.3% (R5)**, and the only two factual defects ever found were mechanical (a directory-name casing error; a phantom citation range) and both were corrected in place (`Fabrica-atlas-tasks.md` Group 4 rows R4-2.2 and R5-4.3).
2. **Late-round verification finds almost nothing new about the sources.** Per the R5 suite audit: only the passes touching raw code surfaced source facts, and those were confirmations or single-line corrections; the pure second-hand passes surfaced only editorial defects (R5 wave verification passes). When verification stops producing corrections, the underlying discovery has converged.

### 1.3 Synthesis-layer deltas are shrinking to refinements

- similarities-gaps Round 4 Addendum = refinements of existing rows + 5 new buzz gaps + 2 MC gaps + ONE new extension (E15 Fleet Supervisor) + one cross-cutting similarity; body explicitly unchanged ("Append-only refresh; §1–4 above stand unchanged except where explicitly refined below", `analysis/similarities-gaps.md:145,151-186`).
- production-architecture Round 4 Addendum = grounding/de-risking, not redesign ("Sections 1–8 above stand; this addendum grounds them in confirmed code", `analysis/production-architecture.md:159-215`).
- The integration map's novelty is compositional only — five-subsystem framing and shared-contract table assembled from existing reports (`analysis/agent-platform-integration-map.md:19-29,183-195`), with zero new primary-source scanning (:263-269).

### 1.4 One caveat against over-claiming convergence

Round 5's low yield is partly because Round 4 was so deep — it does NOT prove nothing remains. Section 4 lists named areas where targeted work still has real expected value. Diminishing returns ≠ zero returns.

---

## 2. Source areas with ZERO remaining coverage gaps (with proof)

Proof standard: a dedicated line-level report exists, its own scan-coverage statement claims completeness within scope, AND an independent spot pass verified citations against source.

### 2.1 Mission-control — converged at program level

- Round 1 doc states the directory tree was "fully enumerated (492 files…)" with only CONTRIBUTING.md and shadcn boilerplate unread (`discovery/mission-control-discovery.md:415`).
- 10 dedicated Round 4 reports cover every major subsystem (adapters, AI providers, workflow engine, service catalog 64/64 entries, UI frontend, notifications, execute-guards 100% of guard files, field-task/kanban core model, decision-gates, chain-dispatch/reconciler) — each with coverage statement; see per-file rows in R4 master index §A rows 18–25 and `analysis/round4-findings-digest.md` A1 (:207-231): unverified list "now substantially retired".
- Independent verification: wave-2 PASS (146 cites/0 FAILED), wave-5 (~75 cites/0 FAILED), wave-7 (~115+ cites/0 FAILED), round5-wave1-b (mc-ui-frontend 15/16 exact incl. WebSocket/SSE-zero negative reproduced). Negative findings independently reproduced (no SDK/LLM-client code in daemon — `mc-ai-providers.md` negative greps).

### 2.2 buzz — core crates converged

Zero-gap within their scope guards, all citation-verified:
- **buzz-search + buzz-pubsub** — "buzz-search (100% src) + buzz-pubsub (11/11 files, complete crate)" (`bz-search-pubsub.md` coverage stmt); verified wave-3 PASS (65 cites/0 FAILED).
- **buzz-voice (100%) + buzz-media** — except two named test/bodies (`bucket_index.rs`, one minio test) explicitly flagged in coverage (`bz-voice-media.md`); verified round5-wave1-a (20/20 groups EXACT).
- **buzz-db schema** — all 31 migrations reviewed (`bz-db-schema.md`); verified W0.
- **pairing stack** — buzz-pair-relay lib.rs/main.rs full + full buzz-core/pairing crypto/session/qr/types (`bz-pair-relay-cli.md`); verified round5-wave1-b (18/18 EXACT).
- **relay protocol surface** — kind.rs, protocol.rs, connection.rs, nip11.rs, admission.rs, ws-client full (`bz-relay-event-kinds.md`); verified W0. (Fan-out internals remain — §4.)
- **ops/deploy/admin-web** — compose/charts/admin-web/backend-k8s substantially read (`bz-ops-deploy-admin.md`); verified wave-2.

### 2.3 Fabrica-app — core platform subsystems converged

Citation-verified deep dives with in-scope-complete coverage statements:
- **IPC surface**: exhaustive census, 344 handle registrations / 342 unique channels independently reproduced twice (`fa-ipc-watchers.md`; wave-2 recount 347/344 delta attributed to regex dialect).
- **Plugin host runtime** (all plugin host/worker files full, `fa-plugin-runtime.md`); verified wave-5.
- **Telemetry/consent** (`fa-telemetry-consent.md`); verified wave-4. **Window/tray/menu/dock/notifications** incl. verified-absent negatives (globalShortcut etc., `fa-window-tray-notifications.md`); verified wave-2.
- **Settings/persistence/data-dirs**, **auth/onboarding** (verified round5-wave1-a), **git integration core** (62KB report, runner/status/worktree/credential layers; wave-3), **autoupdate/build** (W0), **command palette/keybindings** (wave-4), **PTY terminal** (first factual verification held 11/11 in round5-wave2, wave-2 PASS), **multi-instance** (`fa-multi-instance.md`), **search-indexing** ("no known gap remains within this task's scope guard", `fa-search-indexing.md` coverage stmt), **agent-hooks/probes** (wave-6, incl. C7 count corrected to 14 targets / 18 live pathnames).

---

## 3. Residual areas where deeper rounds could still add value (honest assessment)

### 3.1 Explicitly admitted gaps inside existing reports

| Area | Admission | Why it matters |
|---|---|---|
| `fabrica-runtime.ts` (37K lines, ~1.46MB on disk) | "Remaining unread" since Round 1 (`discovery/fabrica-app-discovery.md:265`) | Largest single unexamined file in the app; unknown content risk for rebrand planning |
| SSH plane details | `ssh-channel-multiplexer.ts` (22KB), `ssh-config-parser.ts` option matrix, sftp-upload internals, vscode-ssh-authority, ephemeral-vm recipe DSL listed as "known residual gaps for a future pass" (`fa-wsl-remote-execution.md` §14) | Windows-primary product → high operational value |
| Per-agent hook-service parity | ~20 sibling agent dirs' hook services "contract assumed identical… flagged unverified" (`fa-agent-hooks-probes.md` coverage stmt) | FA-T1 digest substrate correctness across agents; dirs confirmed on disk (amp, antigravity, copilot, cursor, droid, devin, gemini, hermes, kimi, mimo, minimax, openclaude, opencode, pi, ghostty, command-code, computer…) |
| Relay fan-out algorithm | `subscription.rs:121-1966` (~1,850 lines) + `push_lease.rs` unread (`bz-relay-event-kinds.md` residual list) | Core delivery semantics if buzz relay is adopted |
| Forge clients | github/gitlab/gitea/azure-devops/bitbucket/jira/linear bodies skipped (`fa-git-integration.md` coverage stmt) | Only matters if forge integrations are in-scope for the new product |
| Buzz CI workflows | `.github/workflows/*` "candidate for follow-up" (`bz-ops-deploy-admin.md`) | Low priority |

### 3.2 Areas with NO dedicated report ever (disk-truth confirmed)

- **Fabrica-app/src/main:** ~80 top-level dirs on disk; without any dedicated round3/round4 report: automations, artifacts, attribution, memory, native-chat, network, rate-limits, server, skills, source-control, speech, stats, usage, i18n, local-builds, hang-watchdog, star-nag, emulator, project-groups, text-generation, diagnostics (structure-only), plus the per-agent families above. Verified by live listing of `../Fabrica-app/src/main` this session.
- **buzz crates:** 30 crates on disk; without dedicated reports: buzz-sdk, buzz-conformance, buzz-relay-mesh, buzz-deletion, buzz-persona, buzz-dev-mcp, buzz-audit, buzz-datastore-tracing, buzz-push-gateway (only migration file read), buzz-test-client, git-credential-nostr, git-sign-nostr. Live listing of `_sources/buzz/crates` this session. Counterweight: several are small client/test/tooling crates; materiality varies.

### 3.3 Verification debt (not discovery debt)

- Two Round 5 deep dives still lack a factual spot pass: **fa-multi-instance.md** and **fa-search-indexing.md** (closure gate G-1; R4 master index §J3 :281-282). Their content should not be load-bearing until passed.
- Three reports remain HYG-only or were only recently first-verified: mc-adapters-linelevel, fa-pty-terminal (first factual pass only via round5-wave2), fa-wsl-remote-execution (`analysis/atlas-risk-register.md:96` AR-P1-16; `atlas-phased-roadmap.md:154` gates Phase B on this).
- **digest-v2-refresh.md (R5-3.2) is NOT on disk** (Test-Path = False this session; also closure gate :56). The last remaining Group 3 item.

### 3.4 What another full round would NOT fix

Another breadth-first round would mostly re-walk converged territory (§2) at growing token cost. The residual value above is concentrated in ~6 named areas — that is targeted-work shape, not new-round shape.

---

## 4. Recommendation to PM

# CLOSE open-ended discovery rounds; authorize TARGETED-ONLY follow-ups.

**Basis:**
1. New-area discovery has hit zero (R5 opened no new territory, §1.1); synthesis now recomposes rather than discovers (§1.3).
2. Verification defect rate collapsed from 0.6%→<0.3%, with 0 conclusion-affecting failures across ~500 R4 cites and ~357 R5 cites (§1.2). Two consecutive verification regimes found nothing substantive — the program's own completion criterion ("two consecutive passes find ZERO gaps", Fabrica-atlas-tasks.md Completion Criteria :369) is effectively met at the level of conclusion-affecting gaps.
3. All three repos' core surfaces have dedicated, coverage-stated, citation-verified reports (§2).

**Targeted punch-list (bounded, dispatchable as individual tasks — not a Round 6):**
- T-1: Factual spot passes for fa-multi-instance.md + fa-search-indexing.md (closes G-1; precondition for their content being load-bearing).
- T-2: fabrica-runtime.ts structured read (37K lines; last big unknown).
- T-3: SSH plane residuals (multiplexer, config-parser, sftp, vscode-ssh-authority, ephemeral-vm recipe DSL) — highest value given Windows-primary positioning.
- T-4: Per-agent hook-service parity check (~20 dirs; mechanical diff against claude/hook-service contract).
- T-5 (conditional on adoption decision): buzz relay subscription.rs fan-out + push_lease; buzz-sdk/conformance/persona quick inventories.
- T-6: Land/settle digest-v2-refresh.md (R5-3.2) — the single open Group 3 item.

Sequencing note: T-3/T-4 gate Phase B/C items already flagged in `analysis/atlas-phased-roadmap.md:154,159-160`; do them just-in-time before the corresponding implementation phase rather than as discovery-for-discovery's-sake.

---

## 5. Scan coverage of THIS memo

- **Read fully:** all verification passes (R3/R4/R5 waves, master index, closure gate, consistency audit) (via four parallel read-only subagent passes whose outputs are summarized here); all 9 analysis/*.md including round4-findings-digest.md Closure Addendum; scan-coverage statements of all 41 discovery reports across discovery/mission-control/, discovery/buzz/, discovery/fabrica-app/; tails of the 3 main discovery docs.
- **Live disk checks this session:** Get-ChildItem of `.Fabrica-atlas-board/` (all 80 files w/ sizes), `../Fabrica-app/src/main` (dir names), `_sources/buzz/crates` (dir names); Test-Path digest-v2-refresh.md (=False); size of fabrica-runtime.ts (1,464,520 B); `git status --porcelain` shows modifications ONLY under `.Fabrica-atlas-board/` (47 lines, all board files) — no `_sources/` or `../Fabrica-app/` file modified.
- **Skipped:** full bodies of most discovery reports beyond their coverage statements (their facts were delegated to the 11 citation passes on disk, which this memo aggregates rather than repeats); `_sources/legacy-fabrica/` (ignored by policy); wave-6 and wave-8 bodies (counts taken from master index §B aggregate + ledger rows); Fabrica-Roadmap/DNA files outside Atlas scope.

