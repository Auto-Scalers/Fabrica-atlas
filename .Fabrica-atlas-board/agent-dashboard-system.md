# Agent Dashboard + Map — Existing System Reference

> **Focus system #4.** Describes what Fabrica ALREADY has for the agent board / dashboard, session map, and live agent status. Companion ideas live in `ideas.md` (section: Agent Dashboard).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-agent-hooks-probes.md`, `fa-ipc-watchers.md`, `fabrica-app-renderer.md`.

---

## 1. Purpose & Scope

The Agent Dashboard is the real-time surface for monitoring running agents: a board of agent rows (status, tool steps, messages) plus a popout "map canvas" for spatial agent/session visualization. It consumes live hook status pushed from every agent CLI.

**How it works:** The Agent Dashboard is your live "control room." It shows every AI agent currently running, what each is doing step by step, and any messages they've sent. A separate pop-out "map" view lets you see agents and sessions laid out spatially, like a floor plan of activity.

## 2. Architecture (what exists)

- **Popout windows**: `dashboard-popout agent board/map canvas` (`fabrica-app-discovery.md:140`).

  **How it works:** You can detach the agent board or the map into its own floating window so you can keep watching your agents while you work elsewhere in Fabrica.

- **Components**: `dashboard` (49) + `dashboard-popout` (92) (`fabrica-app-discovery.md:143`); `AgentDashboardDrawer`, `AgentDashboardSettingsMenu`, `DashboardAgentRow` (+`Message`/`ToolStep`/`TrailingControls`), `DashboardAgentChildDisclosure`, `DashboardPopoutBridge`, `RetainedAgentsSyncGate` (`Fabrica-features.md:134-142`).

  **How it works:** The dashboard is built from about 140 small screen pieces — a drawer that slides in, a settings menu, a row per agent showing its messages and tool steps, a disclosure to expand sub-agents, a bridge to the pop-out window, and a gate that keeps retained agents in sync.

- **Live status push**: every accepted hook POST → `agentStatus:set` to main window + dashboard popout (`index.ts:1546-1564`) (`fa-agent-hooks-probes.md:176`).

  **How it works:** Each time an agent reports an update through its "hook" (a status-reporting mechanism), Fabrica pushes that status to both the main window and the pop-out dashboard instantly, so the board is always current.

- **Startup replay**: live rows replayed via `agentStatus:getSnapshot` (`ipc/agent-hooks.ts:112-119`).

  **How it works:** When you open the dashboard, Fabrica asks for a snapshot of currently-running agents and replays it, so you immediately see what's already running rather than starting blank.

- **Snapshot IPC**: `dashboard:requestSnapshot` (`preload/index.ts:2376`); popout consume/ack/release/dismiss; `AgentKanbanBoard.tsx:40-59` (`fa-ipc-watchers.md:161,346`).

  **How it works:** The pop-out and the main app exchange snapshot messages (request / receive / acknowledge / release / dismiss) so they don't both try to control the same agent row, and a kanban-style board component can display agents.

- **Store slices**: `agent-status` / `detected-agents` / `runtime-detected-agents` / `pane-foreground-agent` (`fabrica-app-discovery.md:146`).

  **How it works:** Fabrica keeps four pieces of saved state: the latest status of each agent, the agents it has detected, the agents detected at runtime, and which agent is in the foreground pane — so the dashboard can rebuild itself after a restart.

- **Detection**: `detected-agents.ts` / `runtime-detected-agents.ts` — TUI-agent PATH detection scoped by SSH connection or runtime env (`fabrica-app-renderer.md`).

  **How it works:** Fabrica figures out which agents are running by looking for their command-line tools on the system path, limited to the current SSH connection or runtime environment, so it doesn't accidentally pick up agents from elsewhere.

- **Host**: `AgentDashboardSidebarHost` mounted in sidebar composition (`fabrica-app-renderer.md`); experimental feature flags "agents view" / "agent dashboard" (`fabrica-app-renderer.md:255`).

  **How it works:** The dashboard can also be hosted inside the sidebar, and it is gated behind experimental on/off switches ("agents view" / "agent dashboard") so you can enable it when ready.

## 3. Reference designs (MC / buzz)

- **[MC]** Command Center Dashboard with Crew Status workload list + per-agent pills (5-state: idle / on-track / dependencies / awaiting-decision / overloaded) (`mc-features.md`, `mc-ui-frontend.md:103-132`); Crew Page (browse agents), Team Page (per-agent workload) (`mc-features.md`).

  **How it works:** Mission Control's dashboard shows a crew-status list and a colored "pill" per agent in one of five states (idle, on-track, waiting on dependencies, awaiting a decision, or overloaded). It also has pages to browse agents and see each one's workload — a clear at-a-glance health model Fabrica could mirror.

- **[buzz]** Agent "card minting" → `MintedAgentCard` via `mint_agent_card`; `AgentPool` with fixed slots + per-agent status (`buzz-desktop.md:50`; `buzz-agent-crates.md:33`).

  **How it works:** buzz creates a visual "card" for each agent (like minting a collectible) and keeps a fixed pool of agent slots, each showing its status. This gives every agent a tangible identity and a capped, manageable number of running agents.

## 4. Hard constraint

Preserve every existing dashboard feature. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
