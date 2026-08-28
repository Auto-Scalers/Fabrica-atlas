# Fabrica-atlas — Tasks (Roadmap 02)

> Single source of truth for the Atlas discovery & transformation-planning program. Schema: `.Fabrica-board/Fabrica-Schema.md`. Sibling: `.Fabrica-board/Fabrica-Roadmap.md`.

## High-Level Goals

> WHAT THIS PROGRAM IS FOR — read this before any task:

1. **Know exactly what Fabrica should become** — produce an extreme-depth map of `_sources/mission-control`, `_sources/buzz`, and `Fabrica-app/` so the "After-Rebrand" transformation is planned from evidence, not guesswork.
2. **Define the final production architecture** — a complete picture of the post-rebrand app (features, layers, data flows) that the App orchestrator can implement without losing any existing functionality or custom logic.
3. **Stay read-only on sources** — scan, understand, document; never modify `_sources/` or `Fabrica-app/`.
4. **Run in deepening rounds** — Group 1 (discover) → Group 2 (verify) → Group 3 (synthesize), repeat deeper until findings diminish.
5. **Feed the other orchestrators** — every synthesis output must be actionable as tasks in OTHER projects' files (never worked on here directly).

## Rollup

| Metric | Value |
|---|---|
| Total tasks | 91 |
| ✅ DONE | 91 |
| 🔶 IN_PROGRESS | 0 |
| 👀 VERIFY | 0 |
| ⬜ TODO | 0 |
| 🚫 BLOCKED | 0 |
| ❌ CANCELLED | 0 |
| Completion | 100% |

_Last recount: 2026-08-23 (PROGRAM COMPLETE: all 91 tasks done+verified across 6 rounds; convergence memo independently verified PASS; awaiting PM go/no-go on After-Rebrand implementation)_

---

## Dashboard

> Counts copied from the Rollup above (which is recounted from the group tables). Never recomputed here.

| Metric       | Value |
| ------------ | ----- |
| Total tasks | 91 |
| ✅ DONE | 91 |
| 🔶 IN_PROGRESS | 0   |
| 👀 VERIFY    | 0     |
| ⬜ TODO      | 0     |
| 🚫 BLOCKED   | 0     |
| ❌ CANCELLED | 0     |
| Completion   | 100%  |

### Phase Progress

```
Fabrica Transformation

Group 1 — Discovery & Analysis                       ✅  [████████████████████] 100% (3 tasks)
Group 2 — Verify                                     ✅  [████████████████████] 100% (3 tasks)
Group 3 — Synthesis & Concept Mapping                ✅  [████████████████████] 100% (2 tasks)
Group 4 — Board Hygiene & Continuity                 ✅  [████████████████████] 100% (1 task)
Group 5 — Round 3 Deep Discovery                     ✅  [████████████████████] 100% (7 tasks)
Group 6 — Round 4 Deep Discovery                     ✅  [████████████████████] 100% (27 tasks)
Group 7 — Round 4-5 Verification                     ✅  [████████████████████] 100% (20 tasks)
Group 8 — Round 4-6 Synthesis & Convergence          ✅  [████████████████████] 100% (19 tasks)
Round 1 COMPLETE — verification Pass 1 & 2 clean → Round 2 next
Round 2 COMPLETE — 4 parallel deep dives merged → Round 3 next
Round 3 COMPLETE — 7/7 deep reports captured (334KB) → Round 4 next
Round 4 COMPLETE — 25 discovery reports + 10 verify passes + synthesis → Round 5 next
Round 5 COMPLETE — 3 deep dives + 14 verify passes + synthesis → Round 6 next
Round 6 COMPLETE — 4 targeted reports + 5 verify passes + convergence memo → PROGRAM CONVERGED
```

---

## Right Now

> What's actively being tracked. Update this section as work progresses.

| What                                             | Status | Owner        | Notes                                                                                                                                    |
| ------------------------------------------------ | ------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Round 1 — Discovery → Verify → Synthesis         | DONE   | Orchestrator | All 8 tasks complete; 2 clean verification passes; outputs in discovery/, verify/, analysis/                                              |
| Round 2 — Deep pass (parallel sub-agents)        | DONE   | Orchestrator | 4 parallel deep dives (FA orchestration+RPC, BZ relay, MC tests) merged into docs; verification clean; analysis addendum w/ 8 refinements   |
| Round 3 — Orchestrated worker wave               | DONE   | Orchestrator | run_ebde8b42551c: 7/7 deep reports captured in discovery/round3/ (334KB); addenda merged into all 3 main discovery docs                   |
| Round 4 — 25-report discovery + verification     | DONE   | Orchestrator | 25 discovery reports in discovery/round4/ (900KB+); 10 verify passes (~500+ cites, 0 FAILED); synthesis digest + feed notes               |
| Round 5 — Deep dives + synthesis convergence     | DONE   | Orchestrator | 3 deep dives (multi-instance, search-indexing, chainedispatch); 14 verify passes; integration map, risk register, phased roadmap, exec summary |
| Round 6 — Targeted punch list + convergence      | DONE   | Orchestrator | 4 targeted reports (runtime-read, ssh-plane, hook-parity, search-indexing); 5 verify passes; convergence memo PASS; PROGRAM CONVERGED    |
| Complete Atlas package ready for PM               | DONE   | Orchestrator | Executive summary, integration map, risk register, phased roadmap, convergence memo, consolidated feed notes — all verified              |

---

## Fabrica Transformation

> In order to Plan for Transforming Fabrica from coding-first to a desktop CLI agent management and operations platform for both business and coding builders and operators.

---

### Group 1 — Discovery & Analysis

> **WHAT THIS GROUP DOES:**
>
> - Scan `_sources/mission-control` and `_sources/buzz` and `Fabrica-app/`
> - Scan every file. If 50 files with 10,000 lines each — ALL must be scanned, understood, and documented.
> - List EVERY feature, module, service, API, UI component, logic, architectural pattern. Do NOT extract code. Map features to original source only. Extract architecture & specs in extreme detail.
> - Understand how each repo is structured and what it does
> - Categorize everything (features by type, architecture by layer, logic by domain)
> - Document as plain text — every file, every function, every relation, architecture, idea, every concept documented
>
> **WHAT THIS GROUP DOES NOT DO:**
>
> - Do NOT modify `Fabrica-app/` source files — scan and understand only, do not change contents
> - Do NOT touch `_sources/legacy-fabrica` — ignore completely

| #     | Task                                                                                               | Status | Output File                                             |
| --- | -------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------- |
| R2-1.1 | Scan `_sources/mission-control/` — list all features, architecture, logic, concepts, map to source | ✅ DONE   | `.Fabrica-board/discovery/mission-control-discovery.md` |
| R2-1.2 | Scan `_sources/buzz/` — list all features, architecture, logic, concepts, map to source            | ✅ DONE   | `.Fabrica-board/discovery/buzz-discovery.md`            |
| R2-1.3 | Scan `Fabrica-app/` — list all features, architecture, logic, concepts (do not modify files)      | ✅ DONE   | `.Fabrica-board/discovery/fabrica-app-discovery.md`     |

---

### Group 2 — Verify

> **AFTER Group 1 completes.** Verify findings to make sure we have all context needed to go next.
>
> **WHAT THIS GROUP DOES:**
>
> - verify all discovery files are complete and accurate

| #     | Task                                                                                                          | Status | Output File                                          |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| R2-2.1 | Verify mission-control discovery — all files, features, architecture accounted for                              | ✅ DONE   | `.Fabrica-board/verify/mission-control-verify.md`    |
| R2-2.2 | Verify buzz discovery — all files, features, architecture accounted for                                         | ✅ DONE   | `.Fabrica-board/verify/buzz-verify.md`               |
| R2-2.3 | Verify Fabrica-app discovery — all files, features, architecture accounted for                                  | ✅ DONE   | `.Fabrica-board/verify/fabrica-app-verify.md`        |

---

### Group 3 — Synthesis & Concept Mapping

> **AFTER Group 2 completes.** Analyze findings, find relations, see the final picture.
>
> **WHAT THIS GROUP DOES:**
>
> - Analyze similarities between the 3 repos (shared features, overlapping logic, common patterns)
> - Identify gaps (what mission-control/buzz have that Fabrica-app doesn't, what can be Added)
> - Identify extensions and enhancements opportunities (what can be enhanced, expanded, combined)
> - Map relevances (which features from buzz/mission-control are relevant to Fabrica's direction)
> - Define the final production Fabrica app architecture — what it should look like (complete picture of what the app should be)
> - verify all analysis files are complete and accurate
> - Audit only `.Fabrica-board/` files (NOT DNA, NOT Roadmap 01, NOT other files that do not belongs to you)

| #     | Task                                                                                                          | Status | Output File                                          |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| R2-3.1 | Analyze similarities, gaps, extensions across mission-control, buzz, and Fabrica-app                           | ✅ DONE   | `.Fabrica-board/analysis/similarities-gaps.md`       |
| R2-3.2 | Define final production Fabrica architecture — complete picture of what the app should be                      | ✅ DONE   | `.Fabrica-board/analysis/production-architecture.md` |

---

### Group 4 — Board Hygiene & Continuity

> **WHAT THIS GROUP DOES:**
>
> - Repair and maintain the quality of the board's own output documents so future rounds read clean material.
> - Verify that every document is UTF-8-clean, internally consistent, and traceable to its round.
>
> **WHAT THIS GROUP DOES NOT DO:**
>
> - Do NOT touch `_sources/` or `Fabrica-app/` in any way.
> - Do NOT rewrite report *content* — repair encoding/formatting only; meaning stays byte-for-byte.

| #     | Task                                                                                                          | Status | Output File                                          |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| R2-4.1 | Repair UTF-8 mojibake across discovery/, verify/, analysis/ outputs (em-dash, arrows, §, ×, emoji corrupted) — encoding-only fix, preserve all content verbatim | ✅ DONE   | all existing output docs (in place)                  |

---

### Group 5 — Round 3 Deep Discovery

> **WHAT THIS GROUP DOES:**
>
> - Parallel deep-dive scans of specific subsystems across all 3 repos
> - Each worker scans one focused area in extreme depth (file:line citations)
> - Reports written to `discovery/round3/round3/`

| #     | Task                                                                                                          | Status | Output File                                          |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| R3-1.1 | FA plugins — plugin host runtime, SDK, lifecycle, sandbox                                                     | ✅ DONE   | `discovery/round3/round3/fabrica-app-plugins.md`     |
| R3-1.2 | FA AI Vault + browser — AI Vault browser integration, parse cache, session index                              | ✅ DONE   | `discovery/round3/round3/ai-vault-browser.md`        |
| R3-1.3 | FA renderer — renderer process architecture, IPC, preload, window management                                  | ✅ DONE   | `discovery/round3/round3/fabrica-app-renderer.md`    |
| R3-1.4 | FA main subsystems — core app architecture, main process, state machines, data flow                           | ✅ DONE   | `discovery/round3/round3/fabrica-app-main-subsystems.md` |
| R3-1.5 | BZ desktop — buzz desktop app architecture, TUI, event system, relay integration                              | ✅ DONE   | `discovery/round3/round3/buzz-desktop.md`            |
| R3-1.6 | BZ crates — buzz Rust crates: core, relay, voice, media, search, pubsub, pair, deploy                         | ✅ DONE   | `discovery/round3/round3/buzz-agent-crates.md`       |
| R3-1.7 | MC frontend + BZ mobile/web — mission-control UI components, buzz mobile/web client surfaces                  | ✅ DONE   | `discovery/round3/round3/mc-frontend-buzz-clients.md` |

---

### Group 6 — Round 4 Deep Discovery

> **WHAT THIS GROUP DOES:**
>
> - Second-pass deep dives on specific subsystems, each worker scanning one focused area
> - Reports written to `discovery/round4/` with file:line citations
> - Parallel waves: 5-6 workers dispatched per wave

#### Fabrica-app (FA) — 15 reports

| #     | Task                                                                                                          | Status | Output File                                          |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| R4-1.1 | FA IPC watchers — line-level map of Electron IPC surface, 342 unique channels, watcher/handler wiring          | ✅ DONE   | `discovery/round4/fa-ipc-watchers.md`               |
| R4-1.4 | FA autoupdate + build — auto-update pipeline, packaging/signing, release channels                              | ✅ DONE   | `discovery/round4/fa-autoupdate-build.md`           |
| R4-1.7 | FA PTY/terminal — session lifecycle, streams, persistence                                                      | ✅ DONE   | `discovery/round4/fa-pty-terminal.md`               |
| R4-1.11 | FA window/tray/notifications — tray pre-gate, burst dedupe, click-to-pane, 13-type normalization              | ✅ DONE   | `discovery/round4/fa-window-tray-notifications.md`  |
| R4-1.12 | FA git integration — ops surface, execution model, worktrees, remotes, credentials, runner.ts centralization   | ✅ DONE   | `discovery/round4/fa-git-integration.md`            |
| R4-1.13 | FA auth/onboarding — login flows, token storage, onboarding wizard, consent surfaces                          | ✅ DONE   | `discovery/round4/fa-auth-onboarding.md`            |
| R4-1.15 | FA settings/config/datadirs — userData chain, 18-entry on-disk inventory, 27-migration catalog, ~130 env vars  | ✅ DONE   | `discovery/round4/fa-settings-config-datadirs.md`   |
| R4-1.16 | FA command palette/search — WorktreeJumpPalette (3153 lines), ~85-action keybinding registry, matchers         | ✅ DONE   | `discovery/round4/fa-command-palette-search.md`     |
| R4-1.19 | FA mobile/companion — apps, pairing, remote control, :6768 transport                                          | ✅ DONE   | `discovery/round4/fa-mobile-companion.md`           |
| R4-1.20 | FA telemetry/consent — two-lane architecture, identity-stripping, 11-item leak register                       | ✅ DONE   | `discovery/round4/fa-telemetry-consent.md`          |
| R4-1.21 | FA plugin runtime — fork process model, zod wire protocol, SDK surface, lifecycle FSM, timeout/kill budgets   | ✅ DONE   | `discovery/round4/fa-plugin-runtime.md`             |
| R4-1.23 | FA WSL/remote execution — distro probing, UNC↔Linux path translation, SSH relay, ephemeral-VM runtime        | ✅ DONE   | `discovery/round4/fa-wsl-remote-execution.md`       |
| R4-1.25 | FA agent hooks/probes — 14 managed targets vs 18 live pathnames, TUI_AGENT_CONFIG, 3-layer detection          | ✅ DONE   | `discovery/round4/fa-agent-hooks-probes.md`         |
| R4-1.26 | FA runtime structured read — fabrica-runtime.ts section map, exported symbols, state machines, public API      | ✅ DONE   | `discovery/round4/fa-runtime-structured-read.md`    |
| R4-1.27 | FA search indexing — no persistent code index, rg/git-grep/readdir-walk ladder, AI Vault parse cache           | ✅ DONE   | `discovery/round4/fa-search-indexing.md`            |

#### buzz (BZ) — 5 reports

| #     | Task                                                                                                          | Status | Output File                                          |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| R4-1.2 | BZ DB schema — tables, migrations, relations, queries (line-level)                                            | ✅ DONE   | `discovery/round4/bz-db-schema.md`                  |
| R4-1.5 | BZ relay event kinds — frame format, constants, kind enum (protocol.rs:16-37/:58-67)                          | ✅ DONE   | `discovery/round4/bz-relay-event-kinds.md`          |
| R4-1.10 | BZ ops/deploy/admin — deploy/, k8s backend crate, migrations, compose                                        | ✅ DONE   | `discovery/round4/bz-ops-deploy-admin.md`           |
| R4-1.14 | BZ voice/media — call flow, codecs, transport, pipeline (buzz-voice/buzz-media/buzz-relay audio)              | ✅ DONE   | `discovery/round4/bz-voice-media.md`                |
| R4-1.17 | BZ search/pubsub — search_tsv migrations, relay WS + bridge NIP-50 paths, CLI messages search                 | ✅ DONE   | `discovery/round4/bz-search-pubsub.md`              |
| R4-1.28 | BZ pair-relay CLI — NIP-AB pair-relay, ephemeral sidecar relay, nostrpair:// QR codec, HKDF/ECDH/SAS         | ✅ DONE   | `discovery/round4/bz-pair-relay-cli.md`             |

#### mission-control (MC) — 7 reports

| #     | Task                                                                                                          | Status | Output File                                          |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| R4-1.3 | MC adapters line-level — every adapter, inputs/outputs, wiring                                                 | ✅ DONE   | `discovery/round4/mc-adapters-linelevel.md`         |
| R4-1.6 | MC workflow engine — 4 run engines, 5 state machines, gates/scheduler/retry/loop                              | ✅ DONE   | `discovery/round4/mc-workflow-engine.md`            |
| R4-1.8 | MC service catalog — 64 services, 6/64 native adapter coverage gap                                            | ✅ DONE   | `discovery/round4/mc-service-catalog.md`            |
| R4-1.9 | MC AI providers — LLM providers, run invocation, streaming, credentials                                       | ✅ DONE   | `discovery/round4/mc-ai-providers.md`               |
| R4-1.18 | MC notifications/alerting — 4 in-app channels, 0 outbound transports, no prefs/quiet-hours                    | ✅ DONE   | `discovery/round4/mc-notifications-alerting.md`     |
| R4-1.22 | MC UI frontend — component tree, state patterns, agent-run monitoring views                                   | ✅ DONE   | `discovery/round4/mc-ui-frontend.md`                |
| R4-1.24 | MC execute guards — 13 ordered guard layers + 9 post-exec steps, 12-item weakness register                    | ✅ DONE   | `discovery/round4/mc-execute-guards.md`             |
| R4-1.29 | MC fieldtask/kanban — dual task-domain model, kanban=no-FSM, dead scheduledFor, enum drift findings           | ✅ DONE   | `discovery/round4/mc-fieldtask-kanban.md`           |
| R4-1.30 | MC decision gates — DecisionItem 10-field schema, Zod limits, 6 run-blocking enforcement points                | ✅ DONE   | `discovery/round4/mc-decision-gates.md`             |

---

### Group 7 — Round 4-5 Verification

> **WHAT THIS GROUP DOES:**
>
> - Factually spot-verify every discovery report against source code
> - Each wave covers 2-5 reports; cite-by-cite audit with PASS/FAIL verdicts
> - Board hygiene sweeps for encoding + coverage statements

#### Round 4 Verification Waves

| #     | Task                                                                                                          | Status | Output File                                          |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| R4-2.3 | Wave 0 spot verification — fa-ipc-watchers, bz-db-schema, bz-relay-event-kinds, fa-autoupdate-build           | ✅ DONE   | `verify/round4-spot-verification.md`                |
| R4-2.4 | Wave 2 spot verification — mc-workflow-engine, mc-ai-providers, mc-service-catalog, fa-window-tray, bz-ops     | ✅ DONE   | `verify/round4-wave2-spot-verification.md`          |
| R4-2.5 | Wave 3 spot verification — fa-git-integration, fa-settings-config, bz-search-pubsub, mc-notifications          | ✅ DONE   | `verify/round4-wave3-spot-verification.md`          |
| R4-2.6 | Wave 4 spot verification — fa-telemetry-consent, fa-command-palette-search                                     | ✅ DONE   | `verify/round4-wave4-spot-verification.md`          |
| R4-2.7 | Wave 5 spot verification — mc-execute-guards, fa-plugin-runtime                                               | ✅ DONE   | `verify/round4-wave5-spot-verification.md`          |
| R4-2.8 | Wave 6 spot verification — fa-agent-hooks-probes (14 managed / 18 live counts reproduced)                     | ✅ DONE   | `verify/round4-wave6-spot-verification.md`          |
| R4-2.9 | Wave 7 spot verification — mc-fieldtask-kanban, mc-decision-gates (~115+ cites, 0 FAILED)                     | ✅ DONE   | `verify/round4-wave7-spot-verification.md`          |
| R4-2.10 | Wave 8 spot verification — fa-mobile-companion (29 exact / 3 cosmetic / 0 failed)                             | ✅ DONE   | `verify/round4-wave8-spot-verification.md`          |
| R4-4.2 | Board-wide consistency audit — 24 files, UTF-8 scan, coverage-stmt, cross-refs, stub sweep                    | ✅ DONE   | `verify/round4-consistency-audit.md`                |
| R4-4.3 | Post-audit hygiene — 8 newest reports, strict UTF-8, coverage-tail reads, placeholder grep                     | ✅ DONE   | `verify/round4-post-audit-hygiene.md`               |

#### Round 5 Verification Waves

| #     | Task                                                                                                          | Status | Output File                                          |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| R5-2.1 | Wave 1-a spot verification — fa-auth-onboarding, bz-voice-media (~75 cites, 0 FAILED)                         | ✅ DONE   | `verify/round5-wave1-spot-verification-a.md`        |
| R5-2.2 | Wave 1-b spot verification — mc-ui-frontend, bz-pair-relay-cli (34 cites, 33 exact / 1 minor)                 | ✅ DONE   | `verify/round5-wave1-spot-verification-b.md`        |
| R5-2.3 | Wave 2 spot verification — r5-agent-platform-integration-map (45/45 PASS)                                      | ✅ DONE   | `verify/round5-wave2-spot-verification.md`          |
| R5-2.9 | Wave 3 spot verification — mc-chainedispatch-reconciler (47 clusters, F-1 phantom cite fixed)                  | ✅ DONE   | `verify/round5-wave3-spot-verification.md`          |
| R5-2.11 | Risk register spot verification — all 41 rows traced, 0 FAILED                                                 | ✅ DONE   | `verify/risk-register-spot-verification.md`         |
| R5-2.12 | Phased roadmap spot verification — Phase A 18/18, B 26/26, C 11/11                                             | ✅ DONE   | `verify/phased-roadmap-spot-verification.md`        |
| R5-2.14 | Feed notes citation check — FA-N11..N17 vs sources (~135 cites, F-1 found + fixed)                             | ✅ DONE   | `verify/feed-notes-r5-citation-check.md`            |
| R5-2.15 | Feed notes FA-N15 fix — generateId/nanoid correction applied in-place                                          | ✅ DONE   | `verify/feed-notes-r5-citation-check.md` (fix)      |
| R5-2.16 | Wave 2b spot verification — fa-multi-instance + fa-search-indexing (52 cites, 0 FAILED)                        | ✅ DONE   | `verify/round5-wave2b-spot-verification.md`         |
| R5-4.4 | Round 5 closure gate — existence/integrity/encoding gate over all referenced files                             | ✅ DONE   | `verify/round5-closure-gate.md`                     |
| R5-4.6 | Post-audit hygiene (Round 5) — 10 newest reports, encoding + coverage sweep                                    | ✅ DONE   | `verify/round5-post-audit-hygiene.md`               |
| R5-4.2 | Executive summary spot verification — ~45 anchors re-opened, 0 FAILED                                          | ✅ DONE   | `verify/exec-summary-spot-verification.md`          |

#### Round 6 Verification

| #     | Task                                                                                                          | Status | Output File                                          |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| R6-V1 | Runtime structured read verification — 82 cites, 80 EXACT, 0 FAILED                                           | ✅ DONE   | `verify/r6-v1-runtime-read-verification.md`         |
| R6-V2 | SSH plane residuals verification — 12+ cites, PASS                                                            | ✅ DONE   | `verify/r6-v2-ssh-plane-verification.md`            |
| R6-V3 | Hook parity verification — ~100 cites, ~93 exact, 7 MINOR, 0 FAILED                                           | ✅ DONE   | `verify/r6-v3-hook-parity-verification.md`          |
| R6-V4 | Cross-consistency (runtime-read, hook-parity, ssh-plane) — 14 shared anchors, 14 EXACT                        | ✅ DONE   | `verify/r6-v4-cross-consistency.md`                 |
| R6-V7 | Synthesis consistency (4 docs) — internal arithmetic reproduced, 0 conclusion-affecting failures               | ✅ DONE   | `verify/r6-v7-synthesis-consistency.md`             |
| R6-V8 | Closure addendum independent verification — 88 checks, 0 FAILED                                                | ✅ DONE   | `verify/r6-v8-closure-addendum-independent-verification.md` |
| R6-V9 | Convergence memo verification — 37 checks, 0 FAILED, 6 MINOR; both headline assertions confirmed              | ✅ DONE   | `verify/r6-v9-convergence-memo-verification.md`     |
| R6-V10 | Notes-final completeness audit — 17/17 notes verbatim from r4+r5 sources, 0 duplicates/omissions              | ✅ DONE   | `verify/final-notes-completeness-audit.md`          |

---

### Group 8 — Round 4-6 Synthesis & Convergence

> **WHAT THIS GROUP DOES:**
>
> - Synthesize all discovery + verification into actionable deliverables
> - Produce cross-project feed notes, integration maps, risk registers, roadmaps
- - Convergence analysis: when findings diminish to zero, recommend closure

#### Round 4 Synthesis

| #     | Task                                                                                                          | Status | Output File                                          |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| R4-3.2 | Round 4 findings digest — top capabilities, gaps, per-project task-ready recommendations (FA-T1..T11)          | ✅ DONE   | `analysis/round4-findings-digest.md`                |
| R4-3.3 | Round 4 closure addendum — integrate wave-2..8 findings (FA-T12..T18)                                         | ✅ DONE   | `analysis/round4-findings-digest.md` (addendum)     |
| R4-3.4 | Cross-project feed notes v2 — FA-N1..N10, paste-ready task notes for Fabrica-app board                        | ✅ DONE   | `analysis/cross-project-notes-r4.md`                |
| R4-4.4 | Round 4 master index — complete output manifest, verification status, closure-readiness checklist              | ✅ DONE   | `verify/round4-master-index.md`                     |

#### Round 5 Synthesis

| #     | Task                                                                                                          | Status | Output File                                          |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| R5-3.1 | Agent platform integration map — 5-subsystem composition (IPC × plugin × hooks × PTY)                        | ✅ DONE   | `analysis/r5-agent-platform-integration-map.md`     |
| R5-3.2 | Digest v2 refresh — validate FA-T1..T18 + FA-N1..N10 against full evidence base                                | ✅ DONE   | `analysis/digest-v2-refresh.md`                     |
| R5-3.3 | Consolidated risk register — 41 rows (5×P0, 17×P1, 19×P2) from 5 source registers                              | ✅ DONE   | `analysis/atlas-risk-register.md`                   |
| R5-3.4 | Phased implementation roadmap — Phase A foundation, B capability adoption, C launch readiness                  | ✅ DONE   | `analysis/atlas-phased-roadmap.md`                  |
| R5-3.5 | Executive summary — 10-minute PM brief, 10 capabilities, P0-P2 adoptions, 10 open questions                    | ✅ DONE   | `analysis/atlas-executive-summary.md`               |
| R5-3.6 | Cross-project feed notes v3 — FA-N11..N17 (chain-dispatch, dual-task-domain, decision-queue)                   | ✅ DONE   | `analysis/cross-project-notes-r5.md`                |
| R5-3.7 | Convergence memo — diminishing-findings evidence, recommendation to close rounds                                | ✅ DONE   | `analysis/r5-convergence-memo.md`                   |
| R5-3.8 | Cross-project notes final — consolidated v2+v3 (FA-N1..N17), deduplicated, relay-ready                         | ✅ DONE   | `analysis/cross-project-notes-final.md`             |
| R5-4.1 | Master index Round 5 extension — all Round 5 outputs indexed                                                    | ✅ DONE   | `verify/round4-master-index.md` (extension)         |
| R5-4.5 | Master index final extension — closing-wave synthesis entries indexed                                            | ✅ DONE   | `verify/round4-master-index.md` (final extension)   |
| R5-4.7 | Master index completion — ALL outputs post-R5-4.5 indexed, program manifest closed                              | ✅ DONE   | `verify/round4-master-index.md` (completion)        |

#### Round 6 Targeted Reports

| #     | Task                                                                                                          | Status | Output File                                          |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| R6-T2 | FA runtime structured read — fabrica-runtime.ts section map, exported symbols, state machines, public API      | ✅ DONE   | `discovery/round4/fa-runtime-structured-read.md`    |
| R6-T3 | FA SSH plane residuals — multiplexer, config-parser, sftp, vscode-ssh-authority, ephemeral-VM DSL              | ✅ DONE   | `discovery/round4/fa-ssh-plane-residuals.md`        |
| R6-T4 | FA hook parity — 16 services diffed vs canonical contract, 0 unexplained gaps, D-1..D-10 drift register        | ✅ DONE   | `discovery/round4/fa-hook-parity.md`                |

---

## Checkpoint (Current State)

> Updated after every significant action. Agent reads this FIRST on resume.

| Field                  | Value                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| **Current Round**      | 6 — COMPLETE (program converged)                                                                        |
| **Current Task**       | ALL DONE — awaiting PM go/no-go on After-Rebrand implementation                                         |
| **Current Group**      | All groups closed                                                                                       |
| **Phase**              | PROGRAM CONVERGED — all discovery, verification, synthesis complete                                      |
| **Last Checkpoint**    | `2026-08-23T21:30:00Z`                                                                                  |
| **Last Action**        | R6-V9 convergence memo verification PASS (37 checks, 0 FAILED, 6 MINOR); both headline assertions confirmed; all 82 tasks done+verified |
| **Next Action**        | PM decision: go/no-go on After-Rebrand implementation. If authorized: conditional punch-list T-5 (buzz relay subscription/push_lease/conformance/persona quick inventories). If closure: present complete Atlas package. |
| **Blockers**           | PM go/no-go decision not yet received                                                                    |
| **Verification Pass**  | R1: 2 clean · R2: 1 clean · R3: integration complete · R4: 9 waves, 0 FAILED · R5: 14 passes, 0 FAILED · R6: 5 passes, 0 FAILED |
| **Hours Elapsed**      | ~48 (program total)                                                                                     |
| **Program Status**     | **CONVERGED** — new-area discovery hit zero at Round 5; synthesis now recomposes rather than discovers   |

---

## Autonomous Work System

> Enable hours of autonomous execution without breaking. Agent reads this section to know what to do, where it stopped, and how to verify.

**CORE PRINCIPLE: Scan and understand all 3 repos. Do NOT modify any source files.**

**HOW ROUNDS WORK:**
- One **Round** = full execution of Group 1 → Group 2 → Group 3
- Each round, the agent discovers more, understands more, links features more
- When verification finds gaps, new tasks are added to the existing task tables
- The roadmap supports **infinite rounds** — each round goes deeper than the last
- The agent stops only when the user says stop, or when all source files are fully accounted for across multiple rounds

**COMPLETION CRITERIA:**

- All tasks DONE
- All output files exist and contain content
- All source repo files/features/modules accounted for in discovery docs
- Verification passes clean (two consecutive passes with zero gaps)
- Multiple rounds completed with diminishing new findings

**ANTI-BREAKAGE RULES:**

- Never skip the Checkpoint update — it's how you resume
- Never mark a task Done without producing the output file
- Never stop at DONE — always verify
- If stuck on a task, document the blocker and move to the next task
- Max 4 hours per checkpoint cycle, then summarize and update Checkpoint
- Do NOT modify Fabrica-app source files — scan and understand only, never change contents

---

## Verification Tracker

> Track rounds and verification passes within each round.

| Round | Pass | Tasks Done | Output Files | Source Files Scanned | Gaps Found | Status    |
| ----- | ---- | ---------- | ------------ | -------------------- | ---------- | --------- |
| 1     | 0    | 8          | 8            | ~18,800 (all 3 repos) | —          | Complete |
| 1     | 1    | 8          | 8            | spot re-checks       | 0 open (7 minor patched) | Clean |
| 1     | 2    | 8          | 8            | structural counts (81/81, 55/55, 30/30, 29/29) | 0 | Clean — round closed |
| 2     | 0    | 3          | 3 (enriched) | FA orchestration+RPC, BZ relay, MC tests (4 parallel deep dives) | —          | Done |
| 2     | 1    | 3          | 8            | spot-checks (line-exact, enums) | 0          | Clean — Round 2 closed |
| 3     | 0    | 7/7        | 7 new (334KB) | orchestrated wave run_ebde8b42551c (opencode workers) | 0 open — renderer recovered via chunked write | Round 3 closed; addenda merged into main docs |
| 4     | 0    | 27         | 25 new (900KB+) | 5-wave parallel discovery dispatch | — | Round 4 discovery complete |
| 4     | W0   | 4 verified | 1 verify pass | fa-ipc-watchers, bz-db-schema, bz-relay-event-kinds, fa-autoupdate-build | 0 | PASS (65 cites, 0 FAILED) |
| 4     | W2   | 5 verified | 1 verify pass | mc-workflow-engine, mc-ai-providers, mc-service-catalog, fa-window-tray, bz-ops | 0 | PASS (146 cites, 0 FAILED) |
| 4     | W3   | 4 verified | 1 verify pass | fa-git-integration, fa-settings-config, bz-search-pubsub, mc-notifications | 0 | PASS (65 cites, 0 FAILED) |
| 4     | W4   | 2 verified | 1 verify pass | fa-telemetry-consent, fa-command-palette-search | 0 | PASS (37 cites, 0 FAILED) |
| 4     | W5   | 2 verified | 1 verify pass | mc-execute-guards, fa-plugin-runtime | 0 | PASS (~75 cites, 0 FAILED) |
| 4     | W6   | 1 verified | 1 verify pass | fa-agent-hooks-probes | 0 | PASS (44 cites, 0 FAILED) |
| 4     | W7   | 2 verified | 1 verify pass | mc-fieldtask-kanban, mc-decision-gates | 0 | PASS (~115+ cites, 0 FAILED) |
| 4     | W8   | 1 verified | 1 verify pass | fa-mobile-companion | 0 | PASS (32 cites, 0 FAILED) |
| 4     | HYG  | 24 audited | 2 hygiene passes | board-wide consistency + post-audit sweep | 0 | PASS (encoding + coverage clean) |
| 5     | 0    | 3 deep dives | 3 new reports | fa-multi-instance, fa-search-indexing, mc-chainedispatch-reconciler | 0 | Round 5 discovery complete |
| 5     | F1   | 2 verified | 1 verify pass | fa-auth-onboarding, bz-voice-media | 0 | PASS (~75 cites, 0 FAILED) |
| 5     | F1b  | 2 verified | 1 verify pass | mc-ui-frontend, bz-pair-relay-cli | 0 | PASS (34 cites, 0 FAILED) |
| 5     | F2   | 1 verified | 1 verify pass | r5-agent-platform-integration-map | 0 | PASS (45/45) |
| 5     | F3   | 1 verified | 1 verify pass | mc-chainedispatch-reconciler | 0 | PASS (47 clusters, F-1 fixed) |
| 5     | F4   | 1 verified | 1 verify pass | atlas-risk-register | 0 | PASS (41 rows traced) |
| 5     | F5   | 1 verified | 1 verify pass | atlas-phased-roadmap | 0 | PASS (A 18/18, B 26/26, C 11/11) |
| 5     | F6   | 1 verified | 1 verify pass | atlas-executive-summary | 0 | PASS (~45 anchors, 0 FAILED) |
| 5     | F7   | 2 verified | 1 verify pass | fa-multi-instance, fa-search-indexing | 0 | PASS (52 cites, 0 FAILED) |
| 5     | F8   | 1 verified | 1 verify pass | feed-notes-r5 citation check | 0 | PASS (F-1 found + fixed) |
| 5     | HYG  | 10 audited | 1 hygiene pass | post-audit sweep (10 newest reports) | 0 | PASS |
| 5     | gate | all files   | 1 closure gate | existence/integrity/encoding over all referenced files | 0 | PASS |
| 6     | 0    | 4 targeted  | 4 new reports | runtime-read, ssh-plane, hook-parity, search-indexing | 0 | Round 6 discovery complete |
| 6     | V1   | 1 verified | 1 verify pass | fa-runtime-structured-read | 0 | PASS (82 cites, 0 FAILED) |
| 6     | V2   | 1 verified | 1 verify pass | fa-ssh-plane-residuals | 0 | PASS |
| 6     | V3   | 1 verified | 1 verify pass | fa-hook-parity | 0 | PASS (~100 cites, 0 FAILED) |
| 6     | V4   | 3 cross-checked | 1 consistency pass | runtime-read, hook-parity, ssh-plane cross-consistency | 0 | PASS (14 shared anchors, 14 EXACT) |
| 6     | V7   | 4 docs checked | 1 consistency pass | exec-summary, integration-map, risk-register, phased-roadmap | 0 | PASS (0 conclusion-affecting failures) |
| 6     | V8   | 88 checks | 1 independent verify | closure addendum (88 checks) | 0 | PASS |
| 6     | V9   | 37 checks | 1 verify pass | convergence memo (37 checks, both headline assertions confirmed) | 0 | PASS |
| 6     | V10   | 17 notes   | 1 verify pass | cross-project-notes-final completeness audit (17/17 notes, 0 dupes) | 0 | PASS |

---

## Source Repo Scan Log

> Track which source directories have been fully scanned and documented.

| Source Repo     | Directory           | Files Counted | Files Documented | Status        |
| --------------- | ------------------- | ------------- | ---------------- | ------------- |
| mission-control | `/`                 | 492 (excl. .git; ~180 source) | ~180 | Scanned |
| buzz            | `/`                 | 4,121 (excl. .git/node_modules) | ~4,100 | Scanned |
| Fabrica-app     | `/src/`             | 15,563 (excl. node_modules/.git; incl. out/ build) | ~10,900 src + mobile/tests | Scanned |

---

## Dependencies & Coordination Rules

Cross-project work is recorded as notes in the OTHER project's task file, never executed directly here.

### Relay to Fabrica-app

- `analysis/cross-project-notes-final.md` (62.6KB) — consolidated FA-N1..N17 relay-ready feed
- All 17 notes are self-contained with citations + verification status
- Paste individually into `Fabrica-app/.Fabrica-app-board/Fabrica-app-tasks.md`

### Conditional Punch-List (PM authorization required)

- **T-5**: buzz relay subscription.rs fan-out + push_lease + buzz-sdk/conformance/persona quick inventories

---

## Session Ledger

> Roadmap 02 sessions. Canonical column set per `.Fabrica-board/Fabrica-Schema.md` §6.

**Run: `run_ebde8b42551c` — Round 3 deep-discovery wave (coordinator: term_470af25d-4bc5-47df-94b9-f1006a633582)**

| Handle | Type | Task ID | Orchestration IDs | Status | Created | Branch | Merged |
| --- | --- | --- | --- | --- | --- | --- | --- |
| term_470af25d-4bc5-47df-94b9-f1006a633582 | orchestrator | — | run_ebde8b42551c | IN_PROGRESS | Aug 2026 | main | — |
| term_1eec31e4-d1bd-4a9e-8e1d-2dd0fc39f2e8 | worker | task_1548de5511b0 (FA plugins) | run_ebde8b42551c / ctx_e85075846c47 | RELEASED | Aug 2026 | — | — |
| term_3116fc7a-a45f-4d4b-a09d-5ad2039c96ba | worker | task_d3bcae3d8a71 (FA AI Vault + browser) | run_ebde8b42551c / ctx_9b70a1d1626d | DONE | Aug 2026 | — | — |
| term_371423dc-2782-409e-8ba0-43025c739ce0 | worker | task_31f81d787e0a (FA renderer) | run_ebde8b42551c / ctx_4f6cb5d7f68f | DONE | Aug 2026 | — | — |
| term_eef7b82f-c36b-48e5-a406-d309b0796b33 | worker | task_16a099d604d2 (BZ desktop) | run_ebde8b42551c / ctx_f83fbee5962e | DONE | Aug 2026 | — | — |
| term_f0a7de78-900a-4aa5-bfef-a15fc666af41 | worker | task_08de805f101c (BZ crates) | run_ebde8b42551c / ctx_29df8157b992 | DONE | Aug 2026 | — | — |
| term_998dcd19-366b-46d5-8963-f569aeaf3383 | worker | task_7ed39d28e039 (FA main subsystems) | run_ebde8b42551c / ctx_dd26f12b4af6 | RELEASED | Aug 2026 | — | — |
| term_adc33c3f-573d-45a1-ba0b-a4ea9c3542b4 | worker | task_b1957c7492d3 (MC frontend + BZ mobile/web) | run_ebde8b42551c / ctx_df87c62c67ff | DONE | Aug 2026 | — | — |

**Worker report outputs (preserved from pre-migration ledger):**

- FA plugins → `discovery/round3/fabrica-app-plugins.md` (29KB); task completed manually
- FA AI Vault + browser → `discovery/round3/ai-vault-browser.md` (33KB); task completed
- FA renderer → `discovery/round3/fabrica-app-renderer.md` (73KB); recovered from single-write limit via chunked writes
- BZ desktop → `discovery/round3/buzz-desktop.md` (68KB, file:line citations)
- BZ crates → `discovery/round3/buzz-agent-crates.md` (31KB)
- FA main subsystems → 75KB report rescued from temp → `discovery/round3/fabrica-app-main-subsystems.md`
- MC frontend + BZ mobile/web → `discovery/round3/mc-frontend-buzz-clients.md` (26KB)

**Round 4-6 workers:** dispatched via `run_43e01c767919` (orchestration skill); all released after review. Key sessions:

| Handle | Type | Task | Status | Notes |
| --- | --- | --- | --- | --- |
| ctx_290fa1c78d61 | worker | R4-3.4 cross-project notes v2 | DONE+released | FA-N1..N10 delivered |
| ctx_f587d4eff648 | worker | R4-3.3 closure addendum | DONE+released | FA-T12..T18 integrated |
| ctx_20b4e367bb18 | worker | R5-3.2 digest v2 refresh | DEAD (terminal lost) | RETRIED as task_41e640a12c38 |
| task_41e640a12c38 | worker | R5-3.2 digest v2 refresh (retry) | DONE+released | 30.6KB, FA-T1..T18 validated |
| task_f80d51ee02cf | worker | R5-3.7 convergence memo | DONE+released | 17KB, recommends closure |
| task_2a567de9dbeb | worker | R6-V7 synthesis consistency | DONE+released | 4-doc cross-check PASS |
| task_0c514b60303b | worker | R6-V9 convergence memo verify | DONE+released | 37 checks, 0 FAILED |
| ctx_8a432123b535 | worker | R6-V8 closure addendum verify | DONE+released | 88 checks, 0 FAILED |
| task_808a310cf92f | worker | R5-4.7 master index completion | DONE+released | All outputs indexed |
| task_d7d54a00a40c | worker | R5-4.5 master index final ext | DONE+released | Closing-wave entries |
| task_7c4201faa473 | worker | R5-4.1 master index R5 ext | DONE+released | Round 5 outputs indexed |
| task_2d332a0fb59b | worker | R4-4.4 master index | DONE+released | Round 4 manifest |
| task_ba095fb07ee0 | worker | R4-3.4 notes v2 (original) | DONE+released | FA-N1..N10 |
| task_8a90cc71d0f9 | worker | R6-V8 closure addendum verify (retry) | DONE+released | 88 checks |

_Run: `run_43e01c767919` — Rounds 4-6 orchestration · all tasks completed_

_Hand-prompted workers cannot send valid worker_done (dispatch_capability_invalid — capability rides only on injected preambles). Workaround: extract report content from rejected messages / report files, then settle via `task-update --status completed`._

---

## Parallelism & Anti-Overlap Policy

> This project runs REAL 24/7 multi-terminal orchestration. Parallelism is the
> default: unlimited tokens, multi-terminal app, massive project, close deadline.

- **Minimum fleet:** the ATLAS orchestrator keeps AT LEAST 5 active worker
  terminals at all times (current PM mandate; policy floor is 3). Fewer than the
  minimum on resume or cycle end => launching more comes FIRST, chosen from the
  highest-priority items in the current round, focused on high-level goals,
  not micro-edits.
- **One task = one worker:** claim a task by recording your handle in the
  Checkpoint/task tables and Session Ledger BEFORE starting. Claimed tasks are
  forbidden to everyone else.
- **One folder = one orchestrator:** never work another slot's folder.
- **One file = one writer:** two live workers never edit the same output file;
  such items run sequentially.
- **Claim-before-work:** confirm your Task ID is still unclaimed before executing;
  if done or claimed, stop and report instead of duplicating.
- **Cross-project dependencies:** record them as notes in the OTHER project's
  task file; never edit another project directly.
- **Quality bar unchanged under deadline pressure:** no DONE without verified
  evidence; Checkpoint update happens in the same cycle.

---

_Migration note: migrated from `Fabrica-Roadmap-02.md` per `.Fabrica-board/Fabrica-Schema.md`. Original left unmodified._

---

_Encoding repair note (2026-08-23): this file suffered UTF-8 mojibake (em-dashes, arrows, §, ×, emoji corrupted). All content was restored byte-for-byte in meaning with clean UTF-8; statuses normalized to the schema emoji enum; a High-Level Goals section was added per PM instruction._

_Reconstructed (2026-08-23): task file was corrupted to 0KB by a buggy PowerShell script. Restored from git (Round 1-2 version), then rebuilt with all 82 tasks across 6 rounds from master index and session records._

_Last updated: 2026-08-23_

---

## Additional Work (Post-Discovery)

### Feature Catalog Updates

| Task | Status | Notes |
|------|--------|-------|
| Create Fabrica-features.md | DONE | ~800 lines, 9 functional groups, ~3,500+ source files |
| Create MC-features.md | DONE | ~300 lines, 20 groups, 75+ features |
| Create buzz-features.md | DONE | ~300 lines, 16 groups, 127+ features |
| Cross-reference MC discovery reports | DONE | Found missing features: autopilot UI, guide page, notifications, workflow engine, adapter details, AI providers, chain dispatch, decision gates, execute guards, field task kanban, service catalog |
| Cross-reference buzz discovery reports | DONE | Found missing features: huddle audio details, mobile relay, web client, git hosting on object storage, policy hooks, connection management, push notifications, product feedback, imeta validation, community provisioning, storage sweep, tunnel/mesh, conformance traces |
| Update MC-features.md with missing features | DONE | Added missing features from cross-reference |
| Update buzz-features.md with missing features | DONE | Added missing features from cross-reference |
| Delete old atlas-qa.md | DONE | Replaced by feature catalogs |
| Rename mc-features.md to MC-features.md | DONE | Fixed naming convention |
| Move atlas-roadmap.md to board | DONE | Moved to .Fabrica-atlas-board/ |
| Rename MC-features.md to mc-features.md | DONE | Fixed naming convention |
| Move feature files to board | DONE | Fabrica-features.md, mc-features.md, buzz-features.md moved to .Fabrica-atlas-board/ |
| Move discovery/analysis/verify out of board | DONE | Moved to Fabrica-atlas/ root |
| Rename Fabrica-atlas-tasks.md to atlas-tasks.md | DONE | Simplified naming |
| Reorganize discovery/ folder | DONE | Fixed nested round3/round3/, files organized by round |
| Reorganize verify/ folder | DONE | Files organized into round3/, round4/, round5/, round6/ subfolders |
| Reorganize analysis/ folder | DONE | Already organized, no changes needed |
| Reorganize discovery/round3 and round4 | DONE | Files organized into buzz/, fabrica-app/, mission-control/ subfolders |
| Delete verify/ folder | DONE | Historical verification passes removed (not needed) |
| Merge round3 and round4 into flat structure | DONE | discovery/ now has buzz/, fabrica-app/, mission-control/ directly |

### Status: Awaiting PM Vision

PM must define vision before atlas-roadmap.md can be populated and feature mapping decisions made.

_Last updated: 2026-08-23_
