# Fabrica Transformation Roadmap

> **First batch = the rebrand look + unfair-advantage features.** Detailed plans for each item live in its own folder under `plans/`.
> Lower-level reference (what Fabrica already has, MC/buzz parallels, new ideas) lives in `systems.md` and `ideas.md` — the roadmap does not repeat those details.

## Batch 1 — Rebrand Look + Unfair Advantage

*Terminology:* **Orcastration Workspace** = the top-level default project (`AGENTS.md` + `README`) that hosts the `meta-orch` and orcastrators — mirrors the current `Fabrica-development_environment` + its sub-projects. **Orcastration crew** = the orcastrators the `meta-orch` controls/monitors (live in the Workspace). **Workers crew** = the workers an orcastrator controls/monitors (live inside the orcastrator's sub-project).

| # | Feature | Plan folder |
|---|---|---|
| 1 | **Role + type assignment (agent personas)** — terminals get a **type** (`meta-orch`, `orch`, or `worker`); **roles/personas** are assigned only to **workers** (the `meta-orch` and orcastrators are typed only — no role). | `plans/01-role-persona-and-type-assignment/` |
| 2 | **Unified chat UI (top layer)** — a unified chat layer that sits above the terminal, across all agents. | `plans/02-unified-chat-ui-layer/` |
| 3 | **Orcastration Workspace + Crew model** — a **Workspace** (default project with its own `AGENTS.md` and `README`, mirroring the current `Fabrica-development_environment` + its sub-projects) hosting the `meta-orch` and the orcastrators. Sub-projects (each with their own `AGENTS.md`) live inside it; adding a sub-project **auto-creates its orcastrator terminal**. The `meta-orch` monitors the **orcastration crew**; each orcastrator monitors a **workers crew** launched inside its sub-project. User controls: linking, per-orcastrator **roles allowlist**, **alone** terminals. | `plans/03-orcastration-workspace-and-crew-model/` |
| 4 | **Enhance orchestration system** — improvements to the orchestration engine. | `plans/04-enhance-orchestration-system/` |
| 5 | **Enhance communications system** — improvements to communications. | `plans/05-enhance-communications-system/` |
| 6 | **Enhance tasks system** — improvements to the tasks system. | `plans/06-enhance-tasks-system/` |

## Batch 2+
_To be added._
