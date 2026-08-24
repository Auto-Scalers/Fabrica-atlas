# R4-4.2 - Board-Wide Consistency Audit of Round 4 Outputs

> Task: ATLAS R4-4.2 · task_83158152af25 · dispatch ctx_7bfe57be8650
> Scope: READ-ONLY audit + mechanical fixes only (encoding chars, missing coverage-stmt headers). No content rewritten.
> Date: 2026-08-23

## Audit Dimensions

1. UTF-8 encoding cleanliness (mojibake / double-encoding / stray BOM / U+FFFD)
2. Scan-coverage statement present in every report
3. Naming/ID consistency vs the task tables in `.Fabrica-atlas-board/Fabrica-atlas-tasks.md`
4. Cross-references between board docs resolve to real files
5. No placeholder/stub text left

## Per-File Verdicts (24 files)

### discovery/round4/ (19 files)

| File | Encoding | Coverage stmt | Task ID match | Notes |
|---|---|---|---|---|
| bz-db-schema.md | PASS | PASS (end) | R4-1.2 OK | ends `*Report end - ATLAS R4-1.2.*` |
| bz-ops-deploy-admin.md | PASS | PASS | R4-1.10 OK | |
| bz-relay-event-kinds.md | PASS | PASS | R4-1.5 OK | |
| bz-search-pubsub.md | PASS | PASS | R4-1.17 OK | |
| fa-autoupdate-build.md | PASS | PASS | R4-1.4 OK | coverage stmt is final section |
| fa-command-palette-search.md | PASS | PASS | R4-1.16 OK | |
| fa-git-integration.md | **FAIL → FIXED** | PASS | R4-1.12 OK | double-encoded (cp1252), 2 corruption layers; ~250 sequences repaired byte-exactly (see Fixes) |
| fa-ipc-watchers.md | PASS | PASS | R4-1.1 OK | |
| fa-mobile-companion.md | PASS | PASS | R4-1.19 OK | |
| fa-pty-terminal.md | MINOR → FIXED | PASS | R4-1.7 OK | leading UTF-8 BOM stripped |
| fa-settings-config-datadirs.md | **FAIL → FIXED** | PASS | R4-1.15 OK | double-encoded em-dashes; leading converted-BOM `?` stripped |
| fa-telemetry-consent.md | PASS | PASS (§ line 351/384, closing region) | R4-1.20 OK | |
| fa-window-tray-notifications.md | PASS | PASS | R4-1.11 OK | coverage stmt is final section |
| fa-wsl-remote-execution.md | PASS | PASS | R4-1.23 OK | residual-gaps list is intentional, final section |
| mc-adapters-linelevel.md | PASS | PASS | R4-1.3 OK | coverage stmt is final section |
| mc-ai-providers.md | PASS | PASS | R4-1.9 OK | |
| mc-notifications-alerting.md | PASS | PASS | R4-1.18 OK | |
| mc-service-catalog.md | MINOR → FIXED | PASS (§8, line 244/262) | R4-1.8 OK | leading UTF-8 BOM stripped |
| mc-workflow-engine.md | PASS | PASS | R4-1.6 OK | citation-convention note is final section |

### verify/round4* (4 files)

| File | Encoding | Coverage stmt | Task ID match | Notes |
|---|---|---|---|---|
| round4-spot-verification.md | PASS | PASS | R4-2.3 OK | |
| round4-wave2-spot-verification.md | PASS | PASS | R4-2.4 OK | |
| round4-wave3-spot-verification.md | PASS | PASS | R4-2.5 OK | |
| round4-wave4-spot-verification.md | PASS | PASS (§ line 117/136) | R4-2.6 OK | |

### analysis/ (1 file)

| File | Encoding | Coverage stmt | Task ID match | Notes |
|---|---|---|---|---|
| round4-findings-digest.md | PASS | PASS | R4-3.2 OK (in header block; H1 omits ID - cosmetic only) | |

## Fixes Applied (mechanical, content preserved verbatim)

1. **fa-git-integration.md** - two-layer cp1252 double-encoding repaired:
   - Layer 2 (full-file round-trip through cp1252 → strict UTF-8 re-decode).
   - Layer 1 residuals replaced byte-exactly: `Â§`→`§` ×4, `â†'`→`→` ×32, `â†"`→`↔` ×3, `â‡'`→`⇒` ×3, `â€"`→`—` ×18. Final char inventory contains only legitimate symbols (`§ · — … → ↔ ⇒ ∈ ≠`). Leading BOM-artifact `?` removed.
2. **fa-settings-config-datadirs.md** - same double-encoding repair (em-dash family); leading BOM-artifact `?` removed.
3. **fa-pty-terminal.md**, **mc-service-catalog.md** - leading UTF-8 BOM (U+FEFF before the `#` heading, which broke markdown rendering) stripped.
- Backups of both round-trip-repaired files kept at `%TEMP%\opencode\*.bak`.
- Post-fix verification on disk: strict UTF-8 decode clean, mojibake-signature scan = 0 hits across all 24 files.

## Findings Recorded (NOT fixed - would require content edits)

1. **Stale cross-reference**: `analysis/round4-findings-digest.md` cites `discovery/round3/ai-vault-browser.md`; actual location after the R4-2.2 in-place hygiene fix is `discovery/round3/round3/ai-vault-browser.md`. Left as-is per the no-content-rewrite rule; flagging for the coordinator.
2. **Board table duplication (pre-existing)**: task table has two R4-1.20 rows and two R4-1.12 ledger entries pointing at the same outputs. Cosmetic bookkeeping issue in `Fabrica-atlas-tasks.md`, outside this audit's fix scope.
3. Source-code citations (`package.json`, `data/*.json`, buzz docs, etc.) were excluded from resolution checks - they reference source repos, not board docs.

## Cross-Reference Resolution Summary

- 39 explicit board-doc references across the 24 audited files: **38/39 resolve** under the AGENTS.md path-migration convention (paths written relative to the environment root, mentally prefixed `Fabrica-atlas/`); 1 stale (finding #1 above).

## Placeholder Scan

- No TODO/TBD/PLACEHOLDER/Lorem/FIXME stub text in any of the 24 files. The one literal `TODO` hit (fa-wsl-remote-execution.md:99 region) is a quotation of a TODO comment inside `git/runner.ts` source - legitimate report content.

## Scan Coverage Statement

- **Read/checked in full:** all 19 files in `.Fabrica-atlas-board/discovery/round4/`, all 4 files matching `verify/round4*.md`, `analysis/round4-findings-digest.md` (24/24) - byte-level encoding scan, coverage-statement presence, header/task-ID extraction, board-doc cross-reference extraction, stub-pattern scan.
- **Read:** Checkpoint + Group 1/2/3/4 tables + Session Ledger of `Fabrica-atlas-tasks.md`; `AGENTS.md` conventions.
- **Skipped:** all other board docs (round1-3 reports, main discovery docs, verify non-round4, analysis similarities-gaps/production-architecture - out of task scope); source repos (`_sources/`, `Fabrica-app/`) except path-existence checks.
- **No file modified** outside `.Fabrica-atlas-board/` (auditable via `git status`).

*Report end - ATLAS R4-4.2.*
