# Fabrica Transformation Roadmap

> **First batch = the rebrand look + unfair-advantage features.** Detailed plans for each item live in its own folder under `plans/`.
> Lower-level reference (what Fabrica already has, MC/buzz parallels, new ideas) lives in `baseline/` and `proposals/` — the roadmap does not repeat those details.


## Batch 1 — Settings Consolidation (Sidebar Reorganization)

> Move settings panels directly into the main left sidebar. Eliminate the separate settings sidebar. No functionality is lost — panels are merged/relocated, not removed.

| # | Source | Target | Notes |
|---|--------|--------|-------|
| 1 | **Onboarding checklist** | Left sidebar | Promote to top-level sidebar item |
| 2 | **Fabrica Account** | Left sidebar | Promote to top-level sidebar item |
| 3 | **Stats & Usage + AI Provider Accounts** | Left sidebar | Merge into single sidebar item |
| 4 | **Orchestration + Computer Use + Fabrica CLI + Browser + Mobile Emulator** | Left sidebar → "Skills" tab | Merge all into a tab named "Skills". Fabrica CLI is a section within other tabs, not its own tab. |
| 5 | **Mobile settings tab** | Left sidebar | Merge with existing non-settings Mobile tab |
| 6 | **Automations settings tab** | Left sidebar | Merge with existing non-settings Automations tab |
| 7 | **Artifacts settings tab** | Left sidebar | Merge with existing non-settings Artifacts tab |
| 8 | **Plugins** | Left sidebar | Promote to top-level sidebar item |
| 9 | **Integrations** | Left sidebar | Promote to top-level sidebar item |

**Principle:** Every current settings window gets relocated to the left sidebar — either as its own item or merged into an existing sidebar tab. The settings sidebar is eliminated entirely.

## Batch 2 — Core Platform + Infrastructure

*Terminology:* **Orcastration Workspace** = the top-level default project (`AGENTS.md` + `README`) that hosts the `meta-orch` and orcastrators — mirrors the current `Fabrica-development_environment` + its sub-projects. **Orcastration crew** = the orcastrators the `meta-orch` controls/monitors (live in the Workspace). **Workers crew** = the workers an orcastrator controls/monitors (live inside the orcastrator's sub-project).

| # | Feature | Details |
|---|---|---|
| 1 | **Role + type assignment (agent personas)** | Terminals get a **type** (`meta-orch`, `orch`, or `worker`); **roles/personas** are assigned only to **workers** (the `meta-orch` and orcastrators are typed only — no role). |
| 2 | **Unified chat UI (top layer)** | A unified chat layer that sits above the terminal, across all agents. |
| 3 | **Orcastration Workspace + Crew model** | A **Workspace** (default project with its own `AGENTS.md` and `README`, mirroring the current `Fabrica-development_environment` + its sub-projects) hosting the `meta-orch` and the orcastrators. Sub-projects (each with their own `AGENTS.md`) live inside it; adding a sub-project **auto-creates its orcastrator terminal**. The `meta-orch` monitors the **orcastration crew**; each orcastrator monitors a **workers crew** launched inside its sub-project. User controls: **on/off for the `meta-orch`** and **on/off per orcastrator**; **launch mode** (orcastrators launch workers on the **main branch** or in **worktrees**); linking, per-orcastrator **roles allowlist**, **alone** terminals. |
| 4 | **Enhance orchestration system** | Improvements to the orchestration engine. |
| 5 | **Enhance communications system** | Improvements to communications. |
| 6 | **Enhance tasks system** | Improvements to the tasks system. |
| 7 | **Centralized Board & Task System** | Boards for each sub-project inside a default `BOARD` project at `Fabrica\workspaces\BOARD`. Each project (Fabrica-app, Fabrica-web, etc.) gets its own board container. Unified task tracking, status management, and cross-project visibility. |
| 8 | **Orchestration DB (`orchestration.db`)** | Persistent SQLite database for orchestration state: dispatches, worker sessions, task assignments, run history, and decision logs. Replaces in-memory + JSON tracking with durable, queryable storage. |
| 9 | **Orchestration Skills & Logic Layer** | Modular skill definitions (current: `orchestration`, `fabrica-cli`, `orca-cli`, `computer-use`). Extendable skill registry — agents discover, load, and compose skills dynamically. Logic layer governs dispatch rules, escalation flows, and worker lifecycle. |
| 10 | **Install Agents Feature** | User-facing capability to browse, install, and configure agents (skills/plugins) from a marketplace. Agent packages include skill definitions, personas, and configuration. Install flow: discover → preview → install → activate in workspace. |
