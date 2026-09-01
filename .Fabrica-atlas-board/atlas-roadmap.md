# Fabrica Transformation Roadmap

> **First batch = the rebrand look + unfair-advantage features**.  
> **Second batch =** Lower-level reference (what Fabrica already has, MC/buzz parallels, new ideas) lives in `baseline/` and `proposals/` — the roadmap does not repeat those details.

# Batch 1 — UI/UX enhancements -  (get ready for Transformation)

## 1. Settings Consolidation (Sidebar Reorganization)

> Move settings panels directly into the main left sidebar. Eliminate the separate settings sidebar. No functionality is lost — panels are merged/relocated, not removed.


| #   | Source                                                                                                   | Target                      | Notes                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Onboarding checklist**                                                                                 | Left sidebar                | Promote to top-level sidebar item                                                                                                                                 |
| 2   | **Fabrica Account**                                                                                      | Left sidebar                | Promote to top-level sidebar item                                                                                                                                 |
| 3   | **Stats &amp; Usage + AI Provider Accounts**                                                             | Left sidebar                | Merge into single sidebar item                                                                                                                                    |
| 4   | **Orchestration + Computer Use + Fabrica CLI + Browser + Mobile Emulator**                               | Left sidebar → "Skills" tab | Merge all into a tab named "Skills". Fabrica CLI is a section within other tabs, not its own tab.                                                                 |
| 5   | **Mobile settings tab**                                                                                  | Left sidebar                | Merge with existing non-settings Mobile tab                                                                                                                       |
| 6   | **Automations settings tab**                                                                             | Left sidebar                | Merge with existing non-settings Automations tab                                                                                                                  |
| 7   | **Artifacts settings tab**                                                                               | Left sidebar                | Merge with existing non-settings Artifacts tab                                                                                                                    |
| 8   | **Plugins**                                                                                              | Left sidebar                | Promote to top-level sidebar item                                                                                                                                 |
| 9   | **Integrations**                                                                                         | Left sidebar                | Promote to top-level sidebar item                                                                                                                                 |
| 10  | **Workspace board + Agent Dashboard (Dashboard + Agent map)**                                            | Left sidebar                | Just investigation (mybe merge board + dashboard or droping the dashboard or replacing it with the board cs it have multi projects support) and enhancing the map |
| 11  | moving the **Agents tab from the right sidebar as a tab in the left sidebar just with the Projects tab** |                             |                                                                                                                                                                   |


**Principle:** Every current settings window gets relocated to the left sidebar — either as its own item or merged into an existing sidebar tab. The settings sidebar is eliminated entirely.

# Batch 2 — Production Transformation Architecture — Fabrica

> **Note:** We focus on high-level plain English descriptions of what we should build, not technical details.

> Defines the complete picture of what the production Fabrica app should be: a **desktop agent management and operations platform for business and coding builders/operators**.

---

## Product Definition

**Fabrica** is the single desktop command center where a builder (technical or not) delegates work to a fleet of AI agents — coding work in worktrees, business operations through real-world services — and supervises everything through one legible surface: priorities, activity, decisions, spend, and history.

*You decide what matters; agents do the work; Fabrica makes it safe, visible, and reversible.*

### Design Principles

- **Agents are members, not tools** — persistent identities, own credentials, own audit trail
- **Safety before autonomy** — nothing real-world happens without an approval path, spend cap, and kill switch
- **One source of truth** — every action becomes a queryable record
- **Legibility over raw access** — sentence-per-item activity, outcome-first, progressive disclosure
- **Local-first, cloud-optional** — the operator owns their data
- **The human is the owner** — security settings are owner-guarded; agents can never change them

---

## Batch 2 — Unified Table

> **Note:** We focus on high-level plain English descriptions of what we should build, not technical details.

> **Workflow logic:** The PM will constantly add things (feedback, ideas, backlogs) in the Group Notes. Each time, we immediately break down each Group Note into relevant features — extracting new items and adding them as feature rows under their group. Each filled role separation is kept intact. **After merging, the Group Note is cleared (set to empty).** The Group Note column stays for future PM input.

> Defines the complete picture of what the production Fabrica app should be: a **desktop agent management and operations platform for business and coding builders/operators**.

### Product Definition

**Fabrica** is the single desktop command center where a builder (technical or not) delegates work to a fleet of AI agents — coding work in worktrees, business operations through real-world services — and supervises everything through one legible surface: priorities, activity, decisions, spend, and history.

*You decide what matters; agents do the work; Fabrica makes it safe, visible, and reversible.*

### Design Principles

- **Agents are members, not tools** — persistent identities, own credentials, own audit trail
- **Safety before autonomy** — nothing real-world happens without an approval path, spend cap, and kill switch
- **One source of truth** — every action becomes a queryable record
- **Legibility over raw access** — sentence-per-item activity, outcome-first, progressive disclosure
- **Local-first, cloud-optional** — the operator owns their data
- **The human is the owner** — security settings are owner-guarded; agents can never change them

---

| Group | Targets | Priority | Group Note | Feature | Description | Feature Notes | Complexity |
|-------|---------|----------|------------|---------|-------------|---------------|------------|
| **Projects** | The Projects from the left sidebar | High | | Workspace + Crew Model | A project folder hosting meta-orch and orcastrators. Each sub-project gets its own folder with AGENTS.md + README.md. Adding a sub-project auto-creates its orcastrator terminal. | These folders are agent brain, not actual project dirs — new agents read them to understand the full system at a glance. User controls: on/off per orchestrator, launch mode, roles allowlist. Mirrors current Fabrica-development_environment structure. | Very High |
| **Agents Dashboard** | A unified dashboard for everything about all running agents | High | | Agent Role & Type Assignment | Terminals get a type (meta-orch, orch, worker); roles/personas assigned only to workers | Enables identity and audit trails per agent. The meta-orch and orcastrators are typed only — no role. | Medium |
| | | | | Orchestration Engine Enhancement | Improvements to the orchestration engine | Build on existing orchestration foundation | High |
| | | | | Agent Communications Enhancement | Improvements to inter-agent and agent-user communication | New capability area — agents can talk to each other and to the human through a unified channel | High |
| | | | | Orchestration Database | Persistent SQLite database for orchestration state: dispatches, worker sessions, task assignments, run history, decision logs | Replaces in-memory + JSON tracking with durable, queryable storage | High |
| | | | | Crew System | Visual representation of all agents (meta-orch, orchs, workers) and their relationships in the dashboard | Shows who reports to whom, current status, and activity at a glance | Medium |
| **Tasks Dashboard** | A unified dashboard for everything about the high-level Roadmap and project tasks | Medium | | Tasks System Enhancement | Improvements to the tasks system | Build on existing task tracking | High |
| | | | | Centralized Board & Task System | Boards for each sub-project inside a default BOARD project. Unified task tracking, status management, cross-project visibility | Single source of truth for all project tasks — each sub-project gets its own board container | High |
| **Chat** | The current terminals UI | Medium | | Unified Chat UI | A unified chat layer that sits above the terminal, across all agents | One conversation surface for all agent communication — replaces switching between individual terminal tabs | High |
| **Skills** | Skills tab from Batch 1 (Orchestration + Computer Use + CLI + Browser + Mobile Emulator) | Medium | | Skills & Logic Layer | Modular skill definitions. Extendable skill registry — agents discover, load, compose skills dynamically | Logic layer governs dispatch rules, escalation flows, and worker lifecycle. Build on existing skill system. | Very High |
| | | | | Skills Catalog & Installation | Browse, install, and manage skills from a catalog. Distinguish between built-in skills and user-installed skills | Skills are agent capabilities — each skill gives agents a new ability (orchestration, computer use, browser, etc.) | Medium |
| **Plugins** | Plugins tab | Medium | | Agent Plugin Marketplace | Browse, install, configure agents (skills/plugins) from a marketplace. Install flow: discover → preview → install → activate | User-facing marketplace experience — plugins are installable agent packages with skill definitions, personas, and configuration | High |
| **Agents (settings)** | Agents tab from settings | Low | | Agent Install & Update | Browse and install new agents or update existing ones from settings | OpenCode as first available agent option — gateway for agent discovery from settings | Medium |
| **Usage** | The merged Stats & Usage + AI Provider Accounts tab | Low | | Budget Tracking & Limits | Track spending across AI providers, set usage limits, view token analytics and subscription usage | Replaces current Stats & Usage + AI Provider Accounts — unified view of all AI spend | Medium |
| **Integrations** | Integrations tab | Low | | Extended Integrations | Add integrations for business tools (project management, communication, CRM) and coding tools (CI/CD, monitoring, deployment) | Extends current GitHub/GitLab/Linear integrations — more connectors for business and dev workflows | Medium |


