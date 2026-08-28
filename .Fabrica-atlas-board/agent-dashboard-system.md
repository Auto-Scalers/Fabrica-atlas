# Agent Dashboard + Map — Existing System Reference

> **Focus system #4.** Describes what Fabrica ALREADY has for the agent board / dashboard, session map, and live agent status. Companion ideas live in `ideas.md` (section: Agent Dashboard).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-agent-hooks-probes.md`, `fa-ipc-watchers.md`, `fabrica-app-renderer.md`.

---

## 1. Purpose & Scope

The Agent Dashboard is the real-time surface for monitoring running agents: a board of agent rows (status, tool steps, messages) plus a popout "map canvas" for spatial agent/session visualization. It consumes live hook status pushed from every agent CLI.

## 2. Architecture (what exists)

- **Popout windows**: `dashboard-popout agent board/map canvas` (`fabrica-app-discovery.md:140`).
- **Components**: `dashboard` (49) + `dashboard-popout` (92) (`fabrica-app-discovery.md:143`); `AgentDashboardDrawer`, `AgentDashboardSettingsMenu`, `DashboardAgentRow` (+`Message`/`ToolStep`/`TrailingControls`), `DashboardAgentChildDisclosure`, `DashboardPopoutBridge`, `RetainedAgentsSyncGate` (`Fabrica-features.md:134-142`).
- **Live status push**: every accepted hook POST → `agentStatus:set` to main window + dashboard popout (`index.ts:1546-1564`) (`fa-agent-hooks-probes.md:176`).
- **Startup replay**: live rows replayed via `agentStatus:getSnapshot` (`ipc/agent-hooks.ts:112-119`).
- **Snapshot IPC**: `dashboard:requestSnapshot` (`preload/index.ts:2376`); popout consume/ack/release/dismiss; `AgentKanbanBoard.tsx:40-59` (`fa-ipc-watchers.md:161,346`).
- **Store slices**: `agent-status` / `detected-agents` / `runtime-detected-agents` / `pane-foreground-agent` (`fabrica-app-discovery.md:146`).
- **Detection**: `detected-agents.ts` / `runtime-detected-agents.ts` — TUI-agent PATH detection scoped by SSH connection or runtime env (`fabrica-app-renderer.md`).
- **Host**: `AgentDashboardSidebarHost` mounted in sidebar composition (`fabrica-app-renderer.md`); experimental feature flags "agents view" / "agent dashboard" (`fabrica-app-renderer.md:255`).

## 3. Reference designs (MC / buzz)

- **[MC]** Command Center Dashboard with Crew Status workload list + per-agent pills (5-state: idle / on-track / dependencies / awaiting-decision / overloaded) (`mc-features.md`, `mc-ui-frontend.md:103-132`); Crew Page (browse agents), Team Page (per-agent workload) (`mc-features.md`).
- **[buzz]** Agent "card minting" → `MintedAgentCard` via `mint_agent_card`; `AgentPool` with fixed slots + per-agent status (`buzz-desktop.md:50`; `buzz-agent-crates.md:33`).

## 4. Hard constraint

Preserve every existing dashboard feature. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
