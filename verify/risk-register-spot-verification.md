# Risk Register Spot Verification (R5-2.11)

> ATLAS R5-2.11 | Group 2 verify | 2026-08-23 | task task_36df52155afc / dispatch ctx_9563b8845eb1
>
> Target: `.Fabrica-atlas-board/analysis/atlas-risk-register.md` (158 lines, 41 rows + retired section)
> Sources verified against: integration-map §6, digest Closure Addendum, fa-wsl-remote-execution §12,
> fa-telemetry-consent §11, mc-decision-gates §9 (W1-W11).

## Method

Every one of the 41 register rows was traced back through its "Merged from" lineage to its
source-register item; each source item's evidence anchors and inline `file:line` cites were
re-opened against the actual source-register text on disk. Dedupe-map decisions were checked
for correctness (nothing lost, nothing double-counted). Secondary citation anchors (digest C9/N1,
mc-decision-gates :39/:139, exec-summary :106, cross-project-notes-r4 :59/:60/:119) were opened
directly. Row totals were mechanically recounted by grep. READ-ONLY throughout — no file outside
`.Fabrica-atlas-board/verify/` written except the mandated task-file checkpoint update.

## Verdict summary

| Source register | Items | Rows produced | Trace verdict |
|---|---|---|---|
| integration-map §6 R1-R10 (`r5-agent-platform-integration-map.md:214-234`) | 10 | 10 (+R6 cross-link into AR-P1-7) | PASS — all 10 mapped, all §7 M1-M9 gap-table cites (:242-254) exact |
| digest Closure Addendum (`round4-findings-digest.md:201-298`) | A3 table, rebrand register :243, FA-T14 :279, Note N5 :288, CA-1..CA-3 :225/:229/:230, A3-D2 retired trio :271 | AR-P0-2, AR-P1-16, AR-P2-18, AR-P2-19, retired row | PASS — every anchor line-exact; retirement evidence confirmed |
| WSL Windows-primary register (`fa-wsl-remote-execution.md:251-262`, items 1-12) | 12 | 12 rows (AR-P0-3, P1-8/9/10/11/12, P2-5..P2-10) | PASS — 12/12 items mapped 1:1, all file:line cites match register text verbatim |
| Telemetry identity-leak register (`fa-telemetry-consent.md:333-343`, items 1-11) | 11 | distributed across 6 rows (AR-P0-1, P0-2, P1-1, P1-17, P2-16, P2-17) | PASS — 11/11 accounted for incl. both dedupe merges (T-7→AR-P1-1, T-4→AR-P0-2) with full evidence retention |
| Decision-gate fix register (`mc-decision-gates.md:218-228`, W1-W11) | 11 | 10 rows (W4+W5 merged → AR-P1-13) | PASS — 11/11 mapped; escalation of W1/W2 to P0 port-blocker is consistent with source verdict "fix W1/W2/W5-class issues before porting" (:234) |

**Totals: 41/41 rows traced successfully. Citation trail: ~60 anchors re-opened — 59 exact /
1 cosmetic-class note (below) / 0 FAILED. Dedupe map: 8/8 decisions correct. Verdict: PASS.**

## Per-row verification detail

### P0 rows (5/5 PASS)

| ID | Source trace | Anchor check |
|---|---|---|
| AR-P0-1 | telemetry S11 #1 (`fa-telemetry-consent.md:333`) | feedback.ts:17 + comment :332-333 sibling host — matches register verbatim. PASS |
| AR-P0-2 | digest rebrand register :243 + telemetry T-4 (:336) | safeStorage rename / `'FABRICA-first'` constants.ts:288 / `persist:FABRICA-browser` / ~130 env vars / 'FABRICA-status' bundles all at digest :243 exactly; T-4 evidence client.ts:62, bundle.ts:48,84, telemetry-events.ts:1647 exact at telemetry :336; FA-T14 mitigation cite digest :279 correct (FA-T14 is at that line). PASS |
| AR-P0-3 | WSL #5 (`fa-wsl-remote-execution.md:255`) | wsl-unc-delete.ts:43-61 + trashItem/UNC + approvedRoots containment wording matches register verbatim. PASS |
| AR-P0-4 | W1 (`mc-decision-gates.md:218`) | route.ts:7-141 no-auth claim exact; mitigation verdict quote ":234" verified ("port the shape, fix W1/W2/W5-class issues before porting"). PASS |
| AR-P0-5 | W2 (`mc-decision-gates.md:219`) | run-task.ts:538 vs data.ts:353-356/:184 + CLAUDE.md mutex-bypass warning — exact. PASS |

### P1 rows (17/17 PASS)

- **AR-P1-1** ← R1 (`r5-map:216`: 65 main files / 656 preload sites / ~78 renderer namespaces — exact) + T-7 (`telemetry:339`: telemetry-consent-types.ts:15, index.ts:72, api-types.ts:797 — exact). Mitigation cites cross-project-notes-r4.md:59 — verified (14 copy-paste agentHooks:*Status handler collapse is at that area). PASS.
- **AR-P1-2** ← R9 (`r5-map:232` watcher-stack exclusivity — exact) + digest C9 warning — C9 exists at `round4-findings-digest.md:62` ("Four-tier crash-isolated file-watching stack (Fabrica-exclusive)"). Evidence parcel-watcher cites via r5-map:232. PASS.
- **AR-P1-3** ← R6 (`r5-map:226` passive TTL decay + fail-open 204 — exact); buzz presence.rs:15-16 TTL=3x heartbeat confirmed at digest :249/:281. PASS.
- **AR-P1-4** ← R4 (`r5-map:222` sandbox honesty, no exec/spawn/fs method — exact); FA-N3 four gaps confirmed at cross-project-notes-r4.md:84,:102-103. PASS.
- **AR-P1-5** ← R5 (`r5-map:224` token-in-child-env — exact). PASS.
- **AR-P1-6** ← R2 (`r5-map:218` pty.ts 7,745 L + server.ts 2,907 L — exact); notes-r4 :60 (per-provider parser relocation) verified. PASS.
- **AR-P1-7** ← integration-map §7 M1-M9 table cited as `:242-252` + sequencing `:254` — table header at :242, rows M1-M9 end :252, sequencing note at :254. Line-exact. PASS.
- **AR-P1-8..P1-12** ← WSL #3/#4/#7/#2/#10 respectively (`fa-wsl-remote-execution.md:253/:254/:257/:252/:260`) — every file:line pair in each row matches the register text verbatim (wsl-bash-command.ts:6-11, hooks.ts:705-707, wsl.ts:72-102, local-windows-terminal-runtime.ts:46-50, claude-accounts/service.ts:927-998, etc.). 5/5 PASS.
- **AR-P1-13** ← W4+W5 merge (`mc-decision-gates.md:221-222`; prompt-builder.ts:287-297 + :497-499 — exact). Merge is sound: both are consumption-semantics defects sharing one mitigation family (fix list :247 covers both). PASS.
- **AR-P1-14** ← W7 (:225; run-task.ts:512-516 + :504-505 — exact). PASS.
- **AR-P1-15** ← W9 (:226; prompt-builder.ts:579 — exact); digest A2 negatives pairing accurate. PASS.
- **AR-P1-16** ← digest A3 table cited `:264-269` — four HYG/NONE rows land exactly there; aggregate "~500+ cites, 0 FAILED" at :271 exact; Note N1 pattern at :138 exact; exec-summary risk 7 caveat at `atlas-executive-summary.md:106` exact. PASS.
- **AR-P1-17** ← telemetry T-5 (`telemetry:337`; electron.vite.config.ts:45-59,274-282, build-constants.d.ts:12-22, verify-telemetry-constants.mjs:1-27 — exact). PASS.

### P2 rows (19/19 PASS)

- **AR-P2-1..P2-4** ← R3/R7/R8/R10 (`r5-map:220/:228/:230/:234` — all exact); palette verified-gap cite cross-project-notes-r4.md:119 verified ("Verified gap, not speculation"). 4/4 PASS.
- **AR-P2-5..P2-10** ← WSL #1/#6/#8/#9/#11/#12 (`fa-wsl-remote-execution.md:251/:256/:258/:259/:261/:262`) — all cites exact (ipc/app.ts:261-264 async-first contrast, worktree-logic.ts:90-128, git-routing 30 s TTL, runner.ts:232-233 TODO, ssh launcher/transport/system-ssh triples, execution-host.ts:59-67 reserved-id filter). 6/6 PASS.
- **AR-P2-11..P2-15** ← W3/W6/W8/W10/W11 (`mc-decision-gates.md:220/:223/:225/:227/:228`). Supporting cites :139 (§5.3 DELETE hard-delete-no-audit heading) and :39 (fix-stuck-tasks.js dismissed schema-drift note) both verified line-exact. 5/5 PASS.
- **AR-P2-16** ← telemetry T-3+T-9+T-10 (`telemetry:335,:341,:342`; registry breaking-change rule telemetry-events.ts:1424, install_id install-id.ts:4-8, en.json:8968 "posthog" keyword — all exact). PASS.
- **AR-P2-17** ← telemetry T-2+T-6+T-8+T-11 (`telemetry:334,:338,:340,:343`; lib/telemetry.ts:11, consent.ts:82-84, diagnostics.ts:167,173,198-202, en.json:8951-8955 + zh/ja/ko/es lines — exact; DO_NOT_TRACK carve-out preserved from source). PASS.
- **AR-P2-18** ← CA-1/CA-2/CA-3 (`round4-findings-digest.md:225/:229/:230`): mutex registry 20-not-17, C7 = 14 targets vs 18 pathnames, stale round3/round3/ self-reference — all three corrections verified verbatim; cite range :223-230 covers them. PASS.
- **AR-P2-19** ← Note N5 (`round4-findings-digest.md:288`; Host-header-equality auth.rs:16-40 / mod.rs:38-60 also present at :251 — both cited lines correct). PASS.

### Retired-risk row (1/1 PASS)

Digest A3-D2 (:271) listed fa-auth-onboarding / bz-voice-media / mc-ui-frontend as never-landed.
Resolution evidence checked: `verify/round5-wave1-spot-verification-a.md` (14,282 B, covers
auth-onboarding + voice-media) and `verify/round5-wave1-spot-verification-b.md` (15,146 B, covers
ui-frontend rewrite) both exist on disk with real content; Group 2 table records both passes DONE.
Retirement is justified. PASS.

## Dedupe-correctness audit (dedupe map items 1-8)

1. R1 + T-7 merge → AR-P1-1: same failure class (brand strings synchronized across shared type /
   producers / validators / i18n / tests vs channel strings across 3 layers); BOTH sides' evidence
   retained in the row. No loss. CORRECT.
2. T-4 folded into rebrand hard-break cluster → AR-P0-2: both are brand-string-in-wire/persisted-
   format class; client.ts:62/bundle.ts:48,84/telemetry-events.ts:1647 preserved in key-evidence
   cell. No loss. CORRECT.
3. R6 cross-link to M5/M9 kept as one risk row (AR-P1-3) + gap rows inside AR-P1-7 (M5 and M9
   explicitly listed there). No duplication, no loss. CORRECT.
4. T-1 standalone P0: distinct consequence class (external POST of user content to uncontrolled
   domain) — keeping it separate from the cosmetic rebrand cluster is defensible. CORRECT.
5. WSL #5 standalone P0: destructive-delete class, not a rename/rebrand class. CORRECT.
6. A3 never-landed-reports retirement: verified above. CORRECT.
7. FA-N15 not duplicated: scoped note only; no fieldtask-domain rows imported. CORRECT.
8. CA-1..CA-3 consolidated to one hygiene row (AR-P2-18) with all three correction values
   preserved verbatim. CORRECT.

## Count integrity

Mechanical recount of the register tables: `^| AR-P0-` = 5, `^| AR-P1-` = 17, `^| AR-P2-` = 19
→ 41 total, matching the register's stated "41 rows - 5 x P0, 17 x P1, 19 x P2" and the Priority
Summary bullets. Item arithmetic also closes: 10 (integration) + 11 (telemetry) + 12 (WSL) +
11 (W-register) + digest items, minus the two documented merges (T-7→R1, W4+W5) and folds =
41 unique rows + 1 retired entry.

## Findings register

No FAILED citations. One MINOR observational note:

- **F-1 (MINOR, cosmetic, no action required):** AR-P1-2 attributes a "digest C9 warning"
  alongside R9; C9 in the digest body (:62) is framed as a capability finding rather than an
  explicit warning — but its Fabrica-exclusivity framing is exactly what R9 turns into a
  preservation warning, so the lineage label is fair. Content fully accurate.

Severity assignments (e.g. W1/W2 → P0) are disclosed in the register itself as Atlas-program
judgments (Known limitations (b)) and are consistent with the source registers' own
fix-before-port verdicts — not treated as defects.

## Scan coverage statement

**Read in full:** `analysis/atlas-risk-register.md` (158 lines, complete);
`analysis/r5-agent-platform-integration-map.md` :205-269 (§6 risks, §7 gap table, §8 verification
notes, §9 coverage statement);
`analysis/round4-findings-digest.md` :200-299 (Closure Addendum A1-A5 complete);
`discovery/round4/fa-wsl-remote-execution.md` :243-286 (§12 register complete + §13/§14);
`discovery/round4/fa-telemetry-consent.md` :325-383 (§11 identity-leak register complete +
coverage statement);
`discovery/round4/mc-decision-gates.md` :205-259 (§9 W1-W11 register complete, §10 fit assessment,
coverage statement start).

**Targeted reads (grep + line extraction):** round4-findings-digest.md :3/:62/:136-138/:157
(C9, Note N1 anchors); mc-decision-gates.md :37-40/:137-140 (dismissed note, DELETE section);
atlas-executive-summary.md :105-107 (risk 6/7/8); cross-project-notes-r4.md :58-60/:119/:84/:102-103
(FA-T1 friction, palette verified gap, FA-N3).

**File-existence checks:** verify/round5-wave1-spot-verification-{a,b}.md, round4-wave2/wave4/
wave7 spot-verification files, round5-wave2-spot-verification.md — all present on disk with real
content (sizes recorded above).

**Not read / out of scope:** digest body §1-§5 beyond targeted anchors (not required for row
tracing); `_sources/` and `Fabrica-app/` primary sources (per register design, all evidence
anchors are inherited from previously verified board reports — this pass verifies register-vs-
source-register fidelity, not re-verification of the underlying code claims, which their own
spot-verification PASSes cover); other analysis/ outputs (phased-roadmap, digest-v2-refresh —
in flight by other workers).

**Integrity:** write-only inside `.Fabrica-atlas-board/verify/` + task-file checkpoint update;
no `_sources/` or `Fabrica-app/` file touched (auditable via git status).
