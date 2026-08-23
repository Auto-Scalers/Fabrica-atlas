# Fabrica Atlas — Worker Instructions (AGENTS.md)

## What This Folder Is

**Fabrica Atlas** is the discovery, mapping, and transformation-planning sub-project. It exists to answer one question in extreme depth: *what should Fabrica become, and what existing material do we build it from?*

It owns:
- `_sources/` — frozen reference repos: `mission-control/`, `buzz/`, `legacy-fabrica/` (moved here from the environment root; byte-identical, never modify)
- `.Fabrica-atlas-board/` — task file + all discovery / verification / analysis outputs

The target codebase `Fabrica-app/` **stays at the environment root** (one level up). Workers read it across folders but never write to it.

## Tech Stack

- Plain Markdown reports (no build step) — discovery/, verify/, analysis/
- Read-only analysis of TypeScript/Rust/web codebases in `_sources/` and `Fabrica-app/`
- Grep/glob/read tooling for scans; chunked writes for large reports (>30KB — write in sections to avoid single-write failures)

## Commands

No build or test tooling (analysis only). Before claiming DONE:

- Every claim cites a file path (+ line where practical).
- Each report ends with an explicit scan-coverage statement (what was read vs skipped).
- Output file exists in the correct board subfolder with real content.

## Conventions

1. **READ-ONLY on sources and app**: never modify anything under `_sources/` or `../Fabrica-app/`. Scan, understand, document — nothing else.
2. **Write only inside `.Fabrica-atlas-board/`**: discovery reports go to `discovery/`, verification to `verify/`, analysis to `analysis/`.
3. **Report conventions**: every claim cites a file path (+ line where practical); state scan coverage explicitly at the end of each report (what was read vs skipped).
4. **Rounds**: Group 1 (discover) → Group 2 (verify) → Group 3 (synthesize) → repeat deeper. Track progress in `Fabrica-atlas-tasks.md` Checkpoint table after every significant action.
5. **Path migration notice**: documents written before 2026-08-21 reference `_sources/` relative to the environment root — mentally prefix with `Fabrica-atlas/`.

## Definition of Done

A task/report is DONE only when ALL of these hold:

1. **Output file exists** in `.Fabrica-atlas-board/` with substantial, cited content.
2. **Coverage stated** — files scanned vs skipped, so verification passes can audit it.
3. **Checkpoint updated** — Current Task, Last Action, Next Action, Last Checkpoint in the task file.
4. **No source file modified anywhere** (`_sources/`, `Fabrica-app/`) — this is auditable via git status.

## What You Do NOT Do

- Do NOT edit anything under `_sources/` or `../Fabrica-app/` — read-only
- Do NOT write outside `.Fabrica-atlas-board/`
- Do NOT commit or push — make changes only, orchestrator handles git
- Do NOT touch other projects' tracking files (record cross-project work as notes in THEIR task file via the orchestrator)

## Key Directories

```
_sources/                  — frozen reference repos (READ-ONLY)
  mission-control/         — reference repo 1
  buzz/                    — reference repo 2
  legacy-fabrica/          — frozen legacy copy (ignored by discovery)
.Fabrica-atlas-board/      — WRITE ZONE ONLY
  Fabrica-atlas-tasks.md   — task file (groups, checkpoint, ledger)
  discovery/               — discovery reports (+ round3/ deep dives)
  verify/                  — verification passes
  analysis/                — synthesis & production architecture
```

## Parallelism & Anti-Overlap Policy

> This project runs REAL 24/7 multi-terminal orchestration. Parallelism is the
> default: unlimited tokens, multi-terminal app, massive project, close deadline.

- **Minimum fleet:** the ATLAS orchestrator keeps AT LEAST 5 active worker
  terminals at all times (current PM mandate; policy floor is 3). Fewer than the
  minimum on resume or cycle end => launching more comes FIRST, chosen from the
  highest-priority items in the current round, focused on high-level goals,
  not micro-edits.
- **One item = one worker:** claim a task by recording your handle in the
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

## Task File

`.Fabrica-atlas-board/Fabrica-atlas-tasks.md` — single source of truth for groups, tasks, checkpoint, verification tracker, scan log, session ledger. Schema for all tracking edits: `.Fabrica-board/Fabrica-Schema.md` (Tracking Schema v1).

## Resume Protocol

On heartbeat kick or session resume:

1. Read the task file's **Checkpoint (Current State)** table FIRST.
2. Continue from the **Next Action** cell — never restart completed rounds or re-scan what's already documented; check the Verification Tracker before starting a new pass.
3. Update the Checkpoint after every significant action.

## Reporting to the Orchestrator

```bash
orca orchestration send --type worker_done --subject "<short status>" \
  --body "<summary + report file path>" --task-id <task_id> --dispatch-id <dispatch_id> \
  --outcome succeeded --json
```

Known platform note: hand-prompted workers may get `dispatch_capability_invalid` rejections on worker_done — write the report file first, then send a SHORT worker_done body (2 sentences + path); the coordinator settles tasks manually.

## Orchestration IDs

Your task file's Session Ledger tracks these IDs for every worker session:

| ID | Format | When You Get It | How to Use It |
|----|--------|-----------------|---------------|
| `task_xxx` | `task_` + hex | `task-create --json` → `result.task.id` | Resume a stuck worker: `worker-start --task <task_id> --retry-of <dispatch_id>` |
| `ctx_xxx` | `ctx_` + hex | `worker-start --json` → `result.dispatchId` | Read worker output: `worker-read --dispatch <ctx_xxx>`. Resume: `--retry-of <ctx_xxx>` |
| `term_xxx` | `term_` + uuid | `worker-start --json` → `effects[terminal].id` | Send message to worker: `terminal send --terminal <term_xxx>`. Read output: `terminal read --terminal <term_xxx>` |
