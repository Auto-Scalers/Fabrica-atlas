# Fabrica Transformation Roadmap

> **First batch = the rebrand look + unfair-advantage features.** Detailed plans for each item live in its own folder under `plans/`.
> Lower-level reference (what Fabrica already has, MC/buzz parallels, new ideas) lives in `systems.md` and `ideas.md` — the roadmap does not repeat those details.

## Batch 1 — Rebrand Look + Unfair Advantage

*Terminology:* **orcastration crew** = the orcastrators the `meta-orch` controls/monitors. **Workers crew** = the workers an orcastrator controls/monitors.

| # | Feature | Plan folder |
|---|---|---|
| 1 | **Role + type assignment (agent personas)** — terminals get a **type** (`meta-orch`, `orch`, or `worker`); **roles/personas** are assigned only to **workers** (the `meta-orch` and orcastrators are typed only — no role). | `plans/01-role-persona-and-type-assignment/` |
| 2 | **Unified chat UI (top layer)** — a unified chat layer that sits above the terminal, across all agents. | `plans/02-unified-chat-ui-layer/` |
| 3 | **Default Orcastration project + Crew model** — ships with a single default `meta-orch` terminal (non-removable; user can start new sessions in it), an **orcastration crew** of orcastrators (one per project) that the `meta-orch` controls/monitors, and **workers crews** that each orcastrator controls/monitors. User controls: which terminals link to which orcastrator, per-orcastrator **roles allowlist** (e.g., Researcher, Marketer) for its workers, and **alone** terminals (neither control nor get controlled). | `plans/03-orcastration-project-and-crew-model/` |
| 4 | **Enhance orchestration system** — improvements to the orchestration engine. | `plans/04-enhance-orchestration-system/` |
| 5 | **Enhance communications system** — improvements to communications. | `plans/05-enhance-communications-system/` |
| 6 | **Enhance tasks system** — improvements to the tasks system. | `plans/06-enhance-tasks-system/` |

## Batch 2+
_To be added._
