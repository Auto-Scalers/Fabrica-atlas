# R6-V7 — Cross-Consistency Check of the Four Atlas Synthesis Documents

> ATLAS R6-V7 · Group 2 verify · task `task_2a567de9dbeb` · dispatch `ctx_59742f97a42c` · 2026-08-23
>
> **Documents compared (all read in full this session):**
> 1. `analysis/atlas-executive-summary.md` (148 ln) — "EXEC"
> 2. `analysis/r5-agent-platform-integration-map.md` (269 ln) — "INTMAP"
> 3. `analysis/atlas-risk-register.md` (158 ln) — "REG"
> 4. `analysis/atlas-phased-roadmap.md` (194 ln) — "ROAD"
>
> **Corroborating reads:** `analysis/cross-project-notes-r4.md` lines 284-303 (FA-N10, full), targeted greps of `analysis/round4-findings-digest.md` (fa-pty-terminal status rows :171/:267) and `discovery/round4/mc-decision-gates.md` (§9 weakness register headings + W10/W11 rows :227-228), `verify/round5-wave2-spot-verification.md` line 11 (45/45 PASS), `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` (Checkpoint + trackers).
> READ-ONLY on `_sources/`, `../Fabrica-app/`, and all four compared documents. Written: this file only.

---

## Totals

| Category | Findings | Severity split |
|---|---|---|
| (1) Contradictory claims between documents | **F-1 … F-5** (5) | 1 HIGH · 2 MEDIUM · 2 LOW |
| (2) Risk/adoption present in one, absent where it should appear | **G-1 … G-5** (5) | 2 MEDIUM · 3 LOW |
| (3) Recommendation-priority mismatches EXEC ↔ ROAD | **M-1 … M-4** (4) | 2 MEDIUM · 2 LOW |
| (4) Citation inconsistencies / drifts | **C-1 … C-4** (4) | all MINOR/cosmetic |
| Anchor families cross-checked and CONFIRMED consistent | ~25 | see §5 |

**Overall verdict:** the four documents are substantively aligned (no fabricated claims, no fabricated citations found; every sampled shared number reproduces across documents). One genuine HIGH-severity contradiction exists (sequencing order reversed in INTMAP §7), plus a cluster of staleness artifacts caused by the four documents being written concurrently without reading each other (REG and ROAD each explicitly declare the other "in flight, not consumed" — REG coverage stmt line 154, ROAD coverage stmt line 190). All findings are fixable by annotation/refresh; none invalidate a verification PASS.

---

## 1. Contradictory claims between documents

### F-1 — HIGH: Sequencing order reversed in INTMAP §7 vs EXEC/ROAD/FA-N10 source
- **INTMAP** `r5-agent-platform-integration-map.md:254`: *"Sequencing note (from `cross-project-notes-r4.md` FA-N10): guard stack (M1) → decision queue (M2) → task model (M3/M4) is the dependency order."*
- **EXEC** `atlas-executive-summary.md:62`: *"Priorities follow the dependency order established in FA-N10 (`cross-project-notes-r4.md:284-299`): task model → guard stack → decision queue."*
- **ROAD** `atlas-phased-roadmap.md:82` (§2.1 Ordering Rule): *"Task model → guard stack → decision queue"* and `:91`: *"B1.1 strictly before B1.2."*
- **Source of truth re-opened directly:** `cross-project-notes-r4.md:290-294` — FA-N10 orders: **1. Task model first (FA-N9) … 2. Guard stack second (FA-N7) … 3. Decision queue third (FA-N8)**, with the explicit rationale that "porting guards before the FSM exists invites hand-inlined per-route guard copies."
- **Impact:** INTMAP attributes the *opposite* order to FA-N10. Any implementer following INTMAP §7 alone would port guards first — precisely the failure mode FA-N10 warns against. REG inherits the dependency chain neutrally (AR-P1-7 mitigation: "Implement in dependency order per FA-N10" without restating it), so the error does not propagate further.
- **Fix suggestion:** mechanical correction at INTMAP :254 (swap to task model → guards → decision queue) or an inline correction note per board convention.

### F-2 — MEDIUM: `fa-pty-terminal.md` verification status stated two different ways
- **REG** `atlas-risk-register.md:96` (AR-P1-16): `fa-pty-terminal.md` listed among inputs that "are HYG-ONLY", i.e. factually unverified.
- **EXEC** `atlas-executive-summary.md:27` (§1.1) and `:10`: fa-pty-terminal was "factually checked for the first time by R5-2.3 (`verify/round5-wave2-spot-verification.md` PASS)".
- **Corroborated:** `verify/round5-wave2-spot-verification.md:11` — "**PASS — 45/45** sampled citations verified (44 exact, 1 minor variance, 0 failures)", covering the integration map built on fa-pty-terminal anchors. INTMAP `:260` still carries the older caveat ("hygiene-only … flagged here for Round-5 verification planning") because it predates R5-2.3.
- **Impact:** REG's verification-debt row overstates debt by one input; EXEC's risk 7 (`:106`) correctly omits fa-pty-terminal from the HYG-ONLY set while REG includes it. The two registers of "what is unverified" disagree.
- **Fix suggestion:** refresh AR-P1-16 to drop fa-pty-terminal (keep mc-adapters-linelevel + fa-wsl-remote-execution HYG-ONLY; bz-pair-relay-cli UNVERIFIED), or annotate it as resolved-by-R5-2.3.

### F-3 — MEDIUM: ROAD repeats the "three never-landed Round 4 reports" work item that REG formally RETIRED
- **REG** `atlas-risk-register.md:51-54` (dedupe map item 6) and Retired table `:130`: the never-landed-reports risk is "RETIRED as of 2026-08-23 — ALL THREE landed and verified PASS by Round 5 wave-1."
- **ROAD** `atlas-phased-roadmap.md:146` (Phase C item 3) and `:160` (open question C-2): still instructs to "settle the three never-landed Round 4 reports via the in-flight R4-1.13/14/22 rewrites (exec-summary §3 risk 7; Q9/Q10)" — treating an open process question as launch-gate work.
- **EXEC** `:106` risk 7 and `:136` Q10 carry the same pre-retirement framing (EXEC predates the retirement).
- **Impact:** a PM reading ROAD Phase C would fund/delay for work that REG says is done. Direct contradiction between REG (resolved) and ROAD (pending).
- **Fix suggestion:** ROAD C-3/C-2 should reference REG's Retired section instead of EXEC risk 7.

### F-4 — LOW (internal to ROAD): "Two standing rules" introduces three
- ROAD `:26-30`: *"Two standing rules govern every phase (both VERIFIED-PASS findings):"* then enumerates **three** numbered rules (preserve verbatim; keep on-disk identifiers unchanged; house reliability grammar). Count/label error only; content matches EXEC §4 standing rule (`:121`). Cosmetic but worth fixing since ROAD is the PM-facing sequencing doc.

### F-5 — MEDIUM: Decision-gate defect scope inconsistent (W1–W9 vs W1–W11 vs omission of W10)
- **EXEC** `:70` (adoption A3): *"Fix MC's W1-W9 defects (no consumption marker, storage races, no auth)"* — stops at W9.
- **Source register** `mc-decision-gates.md:214-228`: the weakness register contains **eleven** items, W1–W11 (W10 `taskId:null` dead-end data at `:227`; W11 options-not-enforced at `:228`) — REG ingests all 11 (`atlas-risk-register.md:22`, rows AR-P2-11…AR-P2-15 cover W3/W6/W8/W10/W11).
- **ROAD** `:97` (B2.1 FA-N17 fix list) enumerates W4/W5/W2/W6/W8/W9/W3/W7/W1/W11 — includes W11 but **omits W10**.
- Relatedly, EXEC `:107` (risk 8) generalizes that MC systems carry "7-9 documented defects each" — true for guards (7, confirmed at `cross-project-notes-r4.md:195` heading "fix 7 known defects") and field-task (FA-N15's 9 gaps), but understated for decision gates (11).
- **Fix suggestion:** normalize on "W1–W11 (11 defects)" everywhere; add W10 to ROAD B2.1's fix-before-port enumeration.

---

## 2. Risks/adoption items present in one document, absent where they should appear

### G-1 — MEDIUM: None of REG's five P0 risks appear in EXEC §3 "Top Risks"
- REG P0 set (`:65-74`, summary `:136`): old-brand feedback-endpoint leak (AR-P0-1), safeStorage/brand-literal hard-break cluster (AR-P0-2), unrestricted WSL delete without `approvedRoots` (AR-P0-3), decision-endpoint no-authz port-blocker (AR-P0-4), decisions.json cross-process write-race port-blocker (AR-P0-5).
- EXEC §3 (`:98-108`) headlines eight risks sourced from INTMAP §6 + digest only; its header (`:98`) even says "Full merged register lands in analysis/atlas-risk-register.md (R5-3.3, in flight)" — so EXEC was written before REG existed and could not ingest it.
- Impact: EXEC risk 2 (rebrand breaks) overlaps AR-P0-2, but the other four P0s — including two PORT-BLOCKERS that REG says "MUST be fixed while porting" — are invisible at the 10-minute-brief level. Since EXEC is the PM entry document, the P0 set should surface there.
- Root cause (structural, not negligence): REG coverage stmt `:154` explicitly did not read ROAD/digest-v2; EXEC header `:4` declares REG in flight.

### G-2 — MEDIUM: WSL risk family (12 items, incl. one P0) absent from EXEC entirely
- REG ingests the 12-item WSL Windows-primary register (`:20`, rows AR-P0-3, AR-P1-8…AR-P1-12, AR-P2-5…AR-P2-10). EXEC contains zero WSL-specific risks in §3 (only a glancing mention inside risk 7's verification-debt list, `:106`). ROAD mentions WSL only via Phase C verification closure (`:154`). Given REG rates one WSL item P0 (unrestricted in-guest `rm -rf`, AR-P0-3) and five more P1, the EXEC headline under-represents a whole risk domain. Same root cause as G-1.

### G-3 — LOW: Three fleet-hardening adoptions (FA-N11/N12/N13) absent from EXEC's adoption tables
- ROAD B-Stage 3 adds B3.4 (mission-ledger wave orchestration), B3.5 (dual-trigger reconciler), B3.6 (two-tier retry ladder) from `cross-project-notes-r5.md` FA-N11–N13 (`atlas-phased-roadmap.md:109-111`), and ROAD §0 Phase-B theme names "reconciler" explicitly (`:23`).
- EXEC §2 P1 table (`:76-81`) contains only B1–B5; FA-N11–N17 appear nowhere in EXEC (notes-r5 postdates it — EXEC header `:4` doesn't list notes-r5 at all). Not a contradiction, but EXEC's "prioritized adopt list" is missing three items its companion roadmap commits to Phase B Stage 3.

### G-4 — LOW: EXEC open question Q7 (multi-host scope / FA-T17 k8s blueprint) has no home in ROAD
- EXEC `:133` Q7 asks whether multi-host scope determines whether "C4 (buzz transport) and FA-T17 (k8s provider blueprint) enter Phase D or get dropped." ROAD gates B4.4 on "multi-host PM scoping" (`:123`, `:176`) but its open-question lists (§1.4: 3 items; §2.7: 6 items; §3.3: 4 items) never restate Q7, and **FA-T17 appears nowhere in ROAD**. The question most likely to change Phase-4 scope is the one ROAD failed to carry forward.

### G-5 — LOW: W10 omitted from ROAD's fix-before-port enumeration
- Covered in F-5 above; listed here because it is simultaneously an absence finding: REG tracks W10 as AR-P2-14 (`atlas-risk-register.md:117`) but ROAD B2.1's fix list (`:97`) skips it.

---

## 3. Recommendation-priority mismatches between EXEC and ROAD phases

### M-1 — MEDIUM: Phase-naming collision — EXEC's five-phase plan vs ROAD's three-phase plan use overlapping labels for different content
- EXEC §4 (`:115-119`): Phase 0 (preservation/hygiene) → Phase A (task model + guards) → Phase B (decision queue + persistence) → Phase C (**fleet hardening**) → Phase D (expansion).
- ROAD (`:20-24`): Phase A (**Foundation & Preservation** ≈ EXEC Phase 0) → Phase B (all adoption, Stages 1-4 ≈ EXEC Phases A-D) → Phase C (**Launch Readiness**, which has no EXEC phase at all).
- Concretely hazardous: "Phase C" means *cost ledger/alerting hardening* in EXEC but *telemetry clearing/sign-off/staged rollout* in ROAD; "Phase A" means *task-model+guards* in EXEC but *preservation fences + palette Agents* in ROAD. Both documents are current companions and neither flags the relabeling (ROAD `:113`-equivalent header just says it follows EXEC conventions). Any cross-document reference to a bare phase letter is ambiguous today.

### M-2 — LOW→MEDIUM: Palette Agents (B5) priority tension between EXEC and REG, inherited into ROAD
- EXEC rates B5 a P1 adoption and "Cheapest high-value win" scheduled in pre-work Phase 0 (`:81`, `:115`); ROAD ships it in Phase A as "early visible proof" (`:58`).
- REG rates the enabling gap — palette blind spot (R8) — **P2**: "hygiene … must not gate anything" (`atlas-risk-register.md:106`, AR-P2-3; P2 definition `:31`).
- Tension: an item promoted to earliest-delivery flagship by EXEC/ROAD sits behind a gap its own register classifies as must-not-gate hygiene. Defensible (the *adoption* is trivial; the *risk* is the residual blind spot), but the severity vocabulary is being used with two different meanings (adoption priority vs risk severity) — same ambiguity flagged in ROAD's own Phase B exit criterion "All P0/P1 adopted; P2 per scoping decisions" (`:23`), which silently mixes REG severities with EXEC adoption tiers.

### M-3 — LOW: Headline-risk #1 in EXEC is P1 (not P0) in REG
- EXEC risk 1 (rename blast radius, R1) leads the headline list (`:100`); REG files it as AR-P1-1, P1 (`:81`). Internally coherent — the mitigation is "never rename live strings," so nothing breaks if followed — but a PM triaging by EXEC order would assume the register's top severity matches. Worth one clarifying sentence in either doc.

### M-4 — MEDIUM: ROAD's launch sign-off criterion references EXEC's stale six-item headline set, not REG's P0 rows
- ROAD Phase C item 4 (`:147`): "zero open red risks at launch; **headline set = … (exec-summary §3 items 1-6)**". EXEC items 1-6 are the INTMAP-derived risks only (see G-1/G-2); the register's five P0 rows — including both decision-gate PORT-BLOCKERS that REG's own P0 definition says are unacceptable to ship-as-is — are not part of the referenced sign-off set. Substantively the port-blockers ARE handled by ROAD B2.1's FA-N17 fixes, but the formal launch gate cites the wrong (older) list.
- What IS consistent (verified): the intra-Phase-B ordering matches across all documents — A1 before A2 (EXEC `:116`, ROAD `:91`), Stage 1→2→3→4 dependencies (`:114`, `:172-176`), B5 early (EXEC `:115`, ROAD `:65`), expansion last gated on multi-host scoping (EXEC `:90`, ROAD `:123`). No ordering contradiction besides F-1.

---

## 4. Citation consistency (category 4)

### Confirmed consistent across documents (sampled anchor families)
- IPC surface figures: 344 handles / 342 unique channels / 65 files / 656 invoke sites / 76 namespaces — identical in EXEC `:33`, INTMAP `:21,:37`, ROAD `:44`.
- Hook-fleet counts: 18 live `/hook/<source>` pathnames vs 14 managed install targets (post-CA-2 corrected value) — EXEC `:30`, INTMAP `:39`, REG AR-P2-18 (`:121`), ROAD `:43,:106`. No document carries the stale "15+/14" figure.
- Chokepoint sizes: `ipc/pty.ts` 7,745 ln / `agent-hooks/server.ts` 2,907 ln — EXEC `:103`, INTMAP `:218`, REG AR-P1-6 (`:86`), ROAD `:60`.
- Plugin constants: fork-per-plugin, zod both directions, denial-code gate order, backoff [500,2000,5000]ms max 3, FIFO ≤5 — EXEC `:36`, INTMAP `:24,:40`, ROAD `:45`.
- Digest anchors: FA-T11→`round4-findings-digest.md:134` (EXEC `:42,:100`; INTMAP `:27,:216,:232`; ROAD `:28,:55`); FA-T6→`:129`; FA-T7→`:130`; FA-T13→`:278` (EXEC `:80`; INTMAP `:250`; REG `:95`; ROAD `:112`); FA-T14→`fa-settings-config-datadirs.md:286-309`/`:308-309` (EXEC `:101,:127`; REG AR-P0-2 `:70`; ROAD `:29,:57`).
- `similarities-gaps.md:162` (G-BZ-15 quiescence blueprint) — EXEC `:78`, INTMAP `:248`, ROAD `:107`.
- REG internal arithmetic: 41 rows = 5×P0 (rows AR-P0-1..5 ✓) + 17×P1 (AR-P1-1..17 ✓) + 19×P2 (AR-P2-1..19 ✓) — totals table `:61` and priority summary `:136-138` reproduce exactly.
- REG back-cites into EXEC verified accurate: `atlas-executive-summary.md:106` really is risk 7 (verification debt / never-landed reports).
- EXEC's "45/45 pass" claim (`:10`) corroborated against `verify/round5-wave2-spot-verification.md:11`.

### Inconsistencies / drifts found

- **C-1 — FA-T15 digest line drift (MINOR).** EXEC `:88` and ROAD `:121` cite FA-T15 at `round4-findings-digest.md:280`; INTMAP `:251` (gap M8) cites it at `:281`, the same line it gives FA-T16 (`:252`). Adjacent-line off-by-one; one of the two anchors is imprecise.
- **C-2 — Known cosmetic drift propagated into INTMAP M5 (MINOR, inherited).** INTMAP `:248` cites `autoRestartPolicy.ts:6-9` for the 3-min quiescence window; the exec-summary spot verification already recorded this anchor as drifted (actual constant at `:53` — Verification Tracker row 5/3, `Fabrica-atlas-tasks.md:413`, finding M-2). The drift now lives in a second synthesis layer without a caveat.
- **C-3 — EXEC self-reference to task-file line number stale (MINOR).** EXEC `:10` cites the aggregate record at "`Fabrica-atlas-tasks.md` Checkpoint 'Last Action', line 269"; the Checkpoint's Last Action cell currently sits at ~line 288 of the task file (line 269 falls in the completion-criteria prose). Content findable, anchor wrong.
- **C-4 — ROAD B3.4 evidence carries an unverifiable-in-place count (NOTE, not an error).** ROAD `:109` cites "mc-chainedispatch-reconciler.md §9 (R5-2.9 PASS, 47 clusters; F-1 caveat)". The 47-cluster figure and F-1-fix status trace to the task tracker, not to anything re-opened this session; flagging as uncorroborated-here rather than wrong.

---

## 5. Scan-Coverage Statement

**Read in full this session:** the four compared documents — `analysis/atlas-executive-summary.md` (148 ln), `analysis/r5-agent-platform-integration-map.md` (269 ln), `analysis/atlas-risk-register.md` (158 ln), `analysis/atlas-phased-roadmap.md` (194 ln); `analysis/cross-project-notes-r4.md` lines 284-303 (FA-N10, complete note); `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` (Checkpoint, group tables, Verification Tracker — first 450 lines; remainder is Session Ledger history not needed for this comparison). AGENTS.md system-provided.

**Read via targeted extraction (grep + line reads):** `analysis/round4-findings-digest.md` (fa-pty-terminal status rows :171, :267); `discovery/round4/mc-decision-gates.md` (section headings, W-register rows :227-228); `verify/round5-wave2-spot-verification.md` (:11).

**Not read:** discovery-report bodies beyond the two extractions above; `_sources/**` and `../Fabrica-app/**` (this is a synthesis-layer consistency check — every file:line anchor in the four documents is second-hand and was audited for INTER-document agreement, not re-verified against primary sources; primary-anchor accuracy is covered by the named verification passes in each document's header); `analysis/digest-v2-refresh.md`, `analysis/production-architecture.md`, `similarities-gaps.md` bodies (quoted only through the four compared docs).

**Integrity:** written inside `.Fabrica-atlas-board/verify/` only; no file under `_sources/`, `../Fabrica-app/`, or the four analyzed documents was modified (auditable via git status).

_Report end — ATLAS R6-V7._
