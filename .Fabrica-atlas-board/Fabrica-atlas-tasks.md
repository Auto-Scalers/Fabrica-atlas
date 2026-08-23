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
| Total tasks | 9 |
| ✅ DONE | 8 |
| 🔶 IN_PROGRESS | 0 |
| 👀 VERIFY | 0 |
| ⬜ TODO | 1 |
| 🚫 BLOCKED | 0 |
| ❌ CANCELLED | 0 |
| Completion | 89% |

_Last recount: 2026-08-23 (encoding repaired; statuses normalized; R2-4.1 added)_

---

## Dashboard

> Counts copied from the Rollup above (which is recounted from the group tables). Never recomputed here.

| Metric       | Value |
| ------------ | ----- |
| Total tasks  | 9     |
| ✅ DONE      | 8     |
| 🔶 IN_PROGRESS | 0   |
| 👀 VERIFY    | 0     |
| ⬜ TODO      | 1     |
| 🚫 BLOCKED   | 0     |
| ❌ CANCELLED | 0     |
| Completion   | 89%   |

### Phase Progress

```
Fabrica Transformation

Group 1 — Discovery & Analysis                       ✅  [████████████████████] 100% (3 tasks)
Group 2 - Verify                                     ✅  [████████████████████] 100% (3 tasks)
Group 3 - Synthesis & Concept Mapping                ✅  [████████████████████] 100% (2 tasks)
Round 1 COMPLETE — verification Pass 1 & 2 clean → Round 2 next
```

---

## Right Now

> What's actively being tracked. Update this section as work progresses.

| What                                             | Status | Owner        | Notes                                                                                                                                    |
| ------------------------------------------------ | ------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Round 1 — Discovery → Verify → Synthesis         | DONE   | Orchestrator | All 8 tasks complete; 2 clean verification passes; outputs in discovery/, verify/, analysis/                                              |
| Round 2 — Deep pass (parallel sub-agents)        | DONE   | Orchestrator | 4 parallel deep dives (FA orchestration+RPC, BZ relay, MC tests) merged into docs; verification clean; analysis addendum w/ 8 refinements   |
| Round 3 — Orchestrated worker wave               | DONE   | Orchestrator | run_ebde8b42551c: 7/7 deep reports captured in discovery/round3/ (334KB); addenda merged into all 3 main discovery docs; renderer recovered after chunked-write issue |

---

## Fabrica Transformation

> In order to Plan for Transforming Fabrica from coding-first to a desktop CLI agent management and operations platform for both bussines and coding builders and operators.

---

### Group 1 — Discovery & Analysis
>
> **WHAT THIS GROUP DOES:**
>
> - Scan `_sources/mission-control` and `_sources/buzz` and `Fabrica-app/`
> - Scan every file. If 50 files with 10,000 lines each — ALL must be scanned, understood, and documented.
> - List EVERY feature, module, service, API, UI component, logic, architectural pattern. Do NOT extract code. Map features to original source only. Extract architecture & specs in extreme detail.
> - Understand how each repo is structured and what it does
> - Categorize everything (features by type, architecture by layer, logic by domain)
> - Document as plain text — every file, every function, every relation, architecture, idea, every concept documented
>
>
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

### Group 2 - Verify

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
| R2-4.1 | Repair UTF-8 mojibake across discovery/, verify/, analysis/ outputs (em-dash, arrows, §, ×, emoji corrupted) — encoding-only fix, preserve all content verbatim | ⬜ TODO   | all existing output docs (in place)                  |


---

## Parallelism & Anti-Overlap Policy

> Real 24/7 multi-terminal orchestration. Canonical text: `Fabrica-Schema.md` §9;
> operational checks: `Heartbeat.md` §3b.

- Keep **at least 5 active analysis/discovery workers** running at all times
  (current operational mandate for the ATLAS slot; policy floor is 3); fewer than
  the minimum => dispatch more FIRST from the current round's group tasks.
- One item = one worker (claim it in the Checkpoint table + task tables before
  dispatching). One file = one writer. Never duplicate claimed/completed items.
- Quality bar unchanged: outputs verified before marked done; Checkpoint updated
  after every significant action.

---

## Autonomous Work System

> Enable hours of autonomous execution without breaking. Agent reads this section to know what to do, where it stopped, and how to verify.
>
> **CORE PRINCIPLE: Scan and understand all 3 repos. Do NOT modify any source files.**
>
> **HOW ROUNDS WORK:**
> - One **Round** = full execution of Group 1 → Group 2 → Group 3
> - Each round, the agent discovers more, understands more, links features more
> - When verification finds gaps, new tasks are added to the existing task tables
> - The roadmap supports **infinite rounds** — each round goes deeper than the last
> - The agent stops only when the user says stop, or when all source files are fully accounted for across multiple rounds

### Checkpoint (Current State)

> Updated after every significant action. Agent reads this FIRST on resume.


| Field                  | Value                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| **Current Round**      | 3 — COMPLETE (Group 1: 7/7 deep dives; Group 2: integration done; renderer report 73KB captured)           |
| **Current Task**       | R2-4.1 — encoding repair of board outputs, THEN Round 4 (candidates below)                                                    |
| **Current Group**      | All groups closed for Round 3                                                                            |
| **Phase**              | Group 1 → 2 → 3 (repeat)                                                                                |
| **Last Checkpoint**    | `2026-08-21T17:35:00Z`                                                                                  |
| **Last Action**        | ROUND 3 CLOSED — final worker (renderer, ctx_4f6cb5d7f68f) delivered 73KB report after chunked-write recovery; task settled manually; all 7 reports in discovery/round3/ (334KB total); ROUND 3 ADDENDUM sections added to all 3 main discovery docs indexing the round3 files |
| **Next Action**        | FIRST: execute R2-4.1 (repair UTF-8 mojibake in discovery/, verify/, analysis/ — encoding only, content preserved). THEN Round 4 options: (a) R3-report spot verification pass, (b) synthesis refresh w/ Round-3 findings (similarities-gaps + production-architecture updates), (c) new discovery areas (FA ipc/watchers, BZ db schema detail, MC adapters line-level), (d) stop on user command |
| **Blockers**           | none                                                                                                     |
| **Verification Pass**  | R2: 1 clean · R3: integration complete, spot-checks pending                                               |
| **Hours Elapsed**      | ~6.5                                                                                                     |
| **Files Modified**     | discovery/×3 (addenda), discovery/round3/×7 (334KB), Fabrica-Roadmap-02.md                                |
| **Verification Pass (within current round)** | 0                                                                                   |
| **Hours Elapsed (since last checkpoint)**    | 0.5                                                                                 |
| **Files Modified (this checkpoint)**         | `Fabrica-Roadmap-02.md`, `.Fabrica-board/discovery/mission-control-discovery.md`    |


### Autonomous Execution Rules

> Agent MUST follow these rules when running autonomously.

**WHAT YOU ARE DOING (READ THIS):**

- You are doing DISCOVERY and ANALYSIS of mission-control and buzz and Fabrica-app
- You scan repos, list features, understand architecture, categorize everything
- You analyze similarities, gaps, extensions, relations across repos
- You audit `.Fabrica-board/` files only (NOT DNA, NOT Roadmap 01, NOT others that dont belongs to you)
- You do NOT modify Fabrica-app source files — scan and understand only

**STARTUP SEQUENCE (every resume):**

1. Read this `Fabrica-Roadmap-02.md` file
2. Read the **Checkpoint** table above
3. Read the **Current Task** details from the task table
4. Read the **Current Group** description and critical rules
5. Resume from **Next Action**

**WORK SEQUENCE (DISCOVERY MODE):**

1. Scan the source repo directory for the current task
2. List EVERY: file, function, module, service, API, UI component, logic, concept
3. Categorize: group by type (features, architecture, logic, domain)
4. Document as plain text — every relation, every concept, nothing skipped
5. Write output to the specified file in `.Fabrica-board/discovery/`
6. After completing a task:
   - Update the task status to DONE
   - Update the Checkpoint table (Current Task, Last Checkpoint, Last Action, Next Action)
   - Move to the next task
7. After completing a group:
   - Update Phase Progress bar
   - Verify the group is complete (count tasks, check output files exist)
   - Move to the next group

**WORK SEQUENCE (ANALYSIS MODE):**

1. Read all discovery output files from `.Fabrica-board/discovery/`
2. Analyze: what features overlap across repos? what's unique? what's missing?
3. Identify: gaps (what exists but Fabrica doesn't have), extensions (what can be enhanced)
4. Map: which buzz/mission-control features are relevant to Fabrica's direction
5. Define: final production Fabrica architecture — the complete picture
6. Audit: `.Fabrica-board/` files only — verify discovery/analysis is complete

**VERIFICATION LOOP (CRITICAL):**

> When all tasks show DONE, the agent does NOT stop. It enters verification, then starts a new round.

**Within a round — verification passes:**

1. **Pass 1:**
   - Re-read every output file in `.Fabrica-board/discovery/` and `.Fabrica-board/analysis/`
   - Cross-reference: did we miss entire directories or files in the source repos?
   - Count: source repo file count vs documented file count
   - If gaps found: add new tasks to the appropriate group table, mark them ⬜ TODO, and execute them within this same round
   - Update Verification Pass counter

2. **Pass 2 (if Pass 1 found gaps):**
   - Re-scan source repos for anything not documented
   - Compare: are all features, modules, services accounted for?
   - If gaps found: execute more discovery tasks
   - Update Verification Pass counter

3. **Pass N:**
   - Continue until two consecutive passes find ZERO gaps
   - Mark the current round as complete

**Between rounds — the full cycle repeats:**

1. Current round completes (all tasks DONE, verification passes clean)
2. Increment Round counter
3. Reset to Group 1 — start a new round with fresh eyes
4. Each round goes deeper: more features discovered, better understanding, more relations found
5. Repeat until user says stop, or source repos are fully accounted for across multiple rounds

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

### Verification Tracker

> Track rounds and verification passes within each round.


| Round | Pass | Tasks Done | Output Files | Source Files Scanned | Gaps Found | Status    |
| ----- | ---- | ---------- | ------------ | -------------------- | ---------- | --------- |
| 1     | 0    | 8          | 8            | ~18,800 (all 3 repos) | —          | Complete |
| 1     | 1    | 8          | 8            | spot re-checks       | 0 open (7 minor patched) | Clean |
| 1     | 2    | 8          | 8            | structural counts (81/81, 55/55, 30/30, 29/29) | 0 | Clean — round closed |
| 2     | 0    | 3          | 3 (enriched) | FA orchestration+RPC, BZ relay, MC tests (4 parallel deep dives) | —          | Done |
| 2     | 1    | 3          | 8            | spot-checks (line-exact, enums) | 0          | Clean — Round 2 closed |
| 3     | 0    | 7/7        | 7 new (334KB) | orchestrated wave run_ebde8b42551c (opencode workers) | 0 open — renderer recovered via chunked write | Round 3 closed; addenda merged into main docs |


### Source Repo Scan Log

> Track which source directories have been fully scanned and documented.


| Source Repo     | Directory           | Files Counted | Files Documented | Status        |
| --------------- | ------------------- | ------------- | ---------------- | ------------- |
| mission-control | `/`                 | 492 (excl. .git; ~180 source) | ~180 | Scanned |
| buzz            | `/`                 | 4,121 (excl. .git/node_modules) | ~4,100 | Scanned |
| Fabrica-app     | `/src/`             | 15,563 (excl. node_modules/.git; incl. out/ build) | ~10,900 src + mobile/tests | Scanned |



---

## Session Ledger

> Roadmap 2 sessions. Canonical column set per `.Fabrica-board/Fabrica-Schema.md` §6.

**Run: `run_ebde8b42551c` — Round 3 deep-discovery wave (coordinator: term_470af25d-4bc5-47df-94b9-f1006a633582)**

| Handle | Type | Task ID | Orchestration IDs | Status | Created | Branch | Merged |
| --- | --- | --- | --- | --- | --- | --- | --- |
| term_470af25d-4bc5-47df-94b9-f1006a633582 | orchestrator | — | run_ebde8b42551c | IN_PROGRESS | Aug 2026 | main | — |
| term_1eec31e4-d1bd-4a9e-8e1d-2dd0fc39f2e8 | worker | task_1548de5511b0 (FA plugins) | run_ebde8b42551c / ctx_e85075846c47 | RELEASED | Aug 2026 | — | — |
| term_3116fc7a-a45f-4d4b-a09d-5ad2039c96ba | worker | task_d3bcae3d8a71 (FA AI Vault + browser) | run_ebde8b42551c / ctx_9b70a1d1626d | DONE | Aug 2026 | — | — |
| term_371423dc-2782-409e-8ba0-43025c739ce0 | worker | task_31f81d787e0a (FA renderer; was ctx_e07b56ed725a) | run_ebde8b42551c / ctx_4f6cb5d7f68f | DONE | Aug 2026 | — | — |
| term_eef7b82f-c36b-48e5-a406-d309b0796b33 | worker | task_16a099d604d2 (BZ desktop) | run_ebde8b42551c / ctx_f83fbee5962e | DONE | Aug 2026 | — | — |
| term_f0a7de78-900a-4aa5-bfef-a15fc666af41 | worker | task_08de805f101c (BZ crates) | run_ebde8b42551c / ctx_29df8157b992 | DONE | Aug 2026 | — | — |
| term_998dcd19-366b-46d5-8963-f569aeaf3383 | worker | task_7ed39d28e039 (FA main subsystems) | run_ebde8b42551c / ctx_dd26f12b4af6 | RELEASED | Aug 2026 | — | — |
| term_adc33c3f-573d-45a1-ba0b-a4ea9c3542b4 | worker | task_b1957c7492d3 (MC frontend + BZ mobile/web) | run_ebde8b42551c / ctx_df87c62c67ff | DONE | Aug 2026 | — | — |
| — | worker | — (superseded launch, codex) | ctx_17777bfa7f57 | CANCELLED | Aug 2026 | — | — |
| — | worker | — (superseded launch, claude, exited) | ctx_60a9a823c9e4 | CANCELLED | Aug 2026 | — | — |
| — | worker | — (superseded launch, codex reuse) | ctx_3bde05ece125 | CANCELLED | Aug 2026 | — | — |

**Worker report outputs (preserved from pre-migration ledger):**

- FA plugins → `discovery/round3/fabrica-app-plugins.md` (29KB); task completed manually
- FA AI Vault + browser → `discovery/round3/ai-vault-browser.md` (33KB); task completed; release returned False
- FA renderer → `discovery/round3/fabrica-app-renderer.md` (73KB); recovered from single-write limit via chunked writes; task completed manually
- BZ desktop → `discovery/round3/buzz-desktop.md` (68KB, file:line citations)
- BZ crates → `discovery/round3/buzz-agent-crates.md` (31KB)
- FA main subsystems → 75KB report rescued from temp → `discovery/round3/fabrica-app-main-subsystems.md`
- MC frontend + BZ mobile/web → `discovery/round3/mc-frontend-buzz-clients.md` (26KB)

Run: `run_ebde8b42551c` · coordinator: term_470af25d-4bc5-47df-94b9-f1006a633582 · Round 3 wave paused by PM with 6/7 reports captured.
**Known issue:** hand-prompted workers cannot send valid worker_done (dispatch_capability_invalid — capability rides only on injected preambles). Workaround: extract report content from rejected messages / report files, then settle via `task-update --status completed`.
Superseded launches (stopped): ctx_17777bfa7f57 (codex), ctx_60a9a823c9e4 (claude, exited), ctx_3bde05ece125 (codex reuse).



---

_Migration note: migrated from `Fabrica-Roadmap-02.md` per `.Fabrica-board/Fabrica-Schema.md`. Original left unmodified._

---

## Migration verification

| Check | Old (Fabrica-Roadmap-02.md) | New (Fabrica-Roadmap-02.v2.md) | Match |
|---|---|---|---|
| Total task rows | 8 (3 + 3 + 2 across Groups 1–3) | 8 (R2-1.1…R2-1.3, R2-2.1…R2-2.3, R2-3.1…R2-3.2) | ✅ |
| DONE-status tasks | 8 × ✅ | 8 × DONE | ✅ |
| Non-DONE tasks | 0 | 0 | ✅ |
| Output-file paths preserved | 8 distinct paths (.Fabrica-board/discovery/×3, verify/×3, analysis/×2) | 8/8 verbatim | ✅ |
| Rollup recount from group tables | — (no Rollup existed) | 8 total / 8 DONE / 0 else / 100% | ✅ consistent |
| Dashboard totals | 8 / 8 done / 100% | 8 / 8 DONE / 100% (copied from Rollup) | ✅ |
| Session Ledger entries | 7 workers + coordinator + 3 superseded launches | 7 workers + 1 orchestrator + 3 CANCELLED = 11 rows | ✅ |
| Worker report output paths in ledger | 7 (round3/*.md with sizes) | 7/7 preserved verbatim in "Worker report outputs" | ✅ |
| Groups structure (DOES / DOES NOT DO) | 3 groups | 3 groups, prose verbatim | ✅ |
| Checkpoint fields | present (with duplicated keys) | all values preserved; duplicate keys disambiguated with "(within current round)" / "(since last checkpoint)" / "(this checkpoint)" suffixes; `Blockers: none` added per schema §5 | ✅ |
| Autonomous Work System | present | preserved verbatim (status words normalized to enum) | ✅ |
| Sections intentionally NOT added | — | Dependencies & Coordination Rules, What Needs Verification (not present in original; out of migration scope) | noted |

_Encoding repair note (2026-08-23): this file suffered UTF-8 mojibake (em-dashes, arrows, §, ×, emoji corrupted). All content was restored byte-for-byte in meaning with clean UTF-8; statuses normalized to the schema emoji enum; a High-Level Goals section was added per PM instruction. No task, status, or output path changed._

_Last updated: 2026-08-23_
