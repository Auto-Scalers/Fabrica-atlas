# Fabrica Atlas — Worker Instructions (AGENTS.md)

## What This Folder Is

**Fabrica Atlas** is the discovery, mapping, and transformation-planning sub-project. It exists to answer one question in extreme depth: *what should Fabrica become, and what existing material do we build it from?*

It owns:
- `_sources/` — frozen reference repos: `mission-control/`, `buzz/`, `legacy-fabrica/` (moved here from the environment root; byte-identical, never modify)
- `.Fabrica-atlas-board/` — task file + all discovery / verification / analysis outputs

The target codebase `Fabrica-app/` **stays at the environment root** (one level up). Workers read it across folders but never write to it.

## Worker Rules

1. **READ-ONLY on sources and app**: never modify anything under `_sources/` or `../Fabrica-app/`. Scan, understand, document — nothing else.
2. **Write only inside `.Fabrica-atlas-board/`**: discovery reports go to `discovery/`, verification to `verify/`, analysis to `analysis/`.
3. **Report conventions**: every claim cites a file path (+ line where practical); state scan coverage explicitly at the end of each report (what was read vs skipped).
4. **Rounds**: Group 1 (discover) → Group 2 (verify) → Group 3 (synthesize) → repeat deeper. Track progress in `Fabrica-atlas-tasks.md` Checkpoint table after every significant action.
5. **Path migration notice**: documents written before 2026-08-21 reference `_sources/` relative to the environment root — mentally prefix with `Fabrica-atlas/`.

## Task File

`.Fabrica-atlas-board/Fabrica-atlas-tasks.md` — single source of truth for groups, tasks, checkpoint, verification tracker, scan log, session ledger.

## Reporting to the Orchestrator

```bash
orca orchestration send --type worker_done --subject "<short status>" \
  --body "<summary + report file path>" --task-id <task_id> --dispatch-id <dispatch_id> \
  --outcome succeeded --json
```

Known platform note: hand-prompted workers may get `dispatch_capability_invalid` rejections on worker_done — write the report file first, then send a SHORT worker_done body (2 sentences + path); the coordinator settles tasks manually.
