# Fabrica Atlas — Worker Instructions

## What This Folder Is

**Fabrica Atlas** is the discovery, mapping, and transformation-planning sub-project. It answers: *what should Fabrica become, and what existing material do we build it from?*

It owns:
- `_sources/` — frozen reference repos: `mission-control/`, `buzz/`, `legacy-fabrica/` (never modify)
- `.Fabrica-atlas-board/` — proposals + planning
- `analysis/` — synthesis outputs (8 files)
- `discovery/` — source repo reports (41 + 6 top-level)

The target codebase `Fabrica-app/` stays at the environment root (one level up). Workers read it but never write to it.

## Tech Stack

- Plain Markdown reports — no build step
- Read-only analysis of TypeScript/Rust/web codebases in `_sources/` and `Fabrica-app/`
- Grep/glob/read tooling for scans

## Conventions

1. **READ-ONLY on sources and app**: never modify `_sources/` or `../Fabrica-app/`.
2. **Write only inside `.Fabrica-atlas-board/`**, `analysis/`, or `discovery/`.
3. **Every claim cites a file path** (+ line where practical).
4. **Each report ends with a scan-coverage statement** (what was read vs skipped).

## Key Directories

```
_sources/                  — frozen reference repos (READ-ONLY)
  mission-control/
  buzz/
  legacy-fabrica/
analysis/                  — synthesis outputs (8 files)
discovery/                 — source repo reports
  mission-control/         — 12 MC reports
  buzz/                    — 8 BZ reports
  fabrica-app/             — 21 FA reports
.Fabrica-atlas-board/      — proposals + planning
  proposals/               — baseline + proposal per system
  atlas-roadmap.md         — implementation batches
  atlas-tasks.md           — task tracking
```

## What You Do NOT Do

- Do NOT edit `_sources/` or `../Fabrica-app/`
- Do NOT commit or push
- Do NOT touch other projects' tracking files
