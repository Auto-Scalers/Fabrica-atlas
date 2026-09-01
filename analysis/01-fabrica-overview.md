# Fabrica-App Platform Overview — How Five Subsystems Work Together

## Executive Summary

Fabrica-app is a **single-host agent desktop** built from five tightly integrated subsystems. Each subsystem does one job well, and they share real contracts — not just coexist. Together, they let you launch agents, observe what they're doing, extend them with plugins, and control everything from a keyboard-driven palette.

The five subsystems are:

1. **IPC Surface** — The nervous system. Every message between the app's main process and the user interface flows through a single, audited hub. Nothing talks around it.
2. **PTY Plane** — The execution engine. Every agent CLI runs here. It handles spawning, identity, flow control, and clean shutdown.
3. **Agent-Hooks** — The observation layer. Agent status updates arrive in real time with zero polling — the agent pushes them when something changes.
4. **Plugin Runtime** — The extension layer. Third-party code runs in isolated child processes, behind consent gates, with a strict slot limit.
5. **Command Palette** — The operator interface. One unified palette (Cmd+J) gives humans access to everything — launching agents, running commands, triggering plugins.

**The honest verdict:** This is a best-in-class agent desktop. It is NOT yet a fleet-management platform. It lacks durable persistence, approval gates, spend limits, orphan cleanup, and restart policies — the layers a production fleet would need.

---

## The Five Subsystems

| # | Subsystem | What it does |
|---|---|---|
| 1 | **IPC Surface** | Transport backbone — every subsystem exposes itself through one audited channel hub |
| 2 | **PTY Plane** | Where agent CLIs execute — handles identity, spawning, flow control, and kill semantics |
| 3 | **Agent-Hooks** | Turn-state ingestion from inside agent CLIs — agents push status updates, no polling |
| 4 | **Plugin Runtime** | Third-party code execution with consent gates, capability checks, and a slot pool (max 5) |
| 5 | **Palette / Keybindings** | Human entry point — one palette and keybinding registry that wires into all other subsystems |

---

## Four Integration Flows

### Flow A — Launch: From keystroke to running agent

1. You press Cmd+J (or a keybinding) and select an agent.
2. The palette builds a startup plan using the shared agent config table.
3. The plan tells the PTY system to spawn the agent process.
4. The PTY system injects environment variables so the agent knows how to report status back.
5. The agent starts, self-identified, and immediately ready to push status updates.

**Key insight:** One shared config table drives the palette validation, keybinding generation, hook installation, and PTY launch. One table, four consumers.

### Flow B — Observe: Real-time status without polling

1. The agent's CLI fires a hook script when its state changes.
2. The script POSTs to a local loopback server inside the main process.
3. The server validates the token, enriches the event with pane/worktree context, and persists it.
4. The status is pushed to the UI — the dashboard, notifications, and palette status dots all update instantly.

**Key insight:** The PTY system and the hook system share the same composite identity (pane key), so status always maps back to the right terminal pane.

### Flow C — Extend: Third-party plugins under consent

1. A plugin declares commands and events in its manifest.
2. The plugin runtime forks an isolated Node child process for it.
3. The plugin activates, registers its commands, and subscribes to events.
4. When the plugin wants to call a host capability, it goes through one chokepoint chain that checks policy, consent, and capability before executing.
5. Plugin commands surface automatically in the command palette.

**Key insight:** Agent status changes become plugin triggers — Flow B's output becomes Flow C's input.

### Flow D — Watch & Sync: Filesystem truth keeps everything coherent

1. Crash-isolated watcher processes monitor the filesystem, git state, and worktrees.
2. Changes are broadcast as events — worktree created/removed, git status changed, editor content updated.
3. Plugins consume these events. The palette uses them for worktree search results.
4. Everything stays in sync without manual refresh.

---

## Shared Contracts (the glue between subsystems)

| Contract | What it is (plain English) |
|---|---|
| **Channel strings** (`namespace:action`) | Every IPC message follows a naming pattern — subsystems register handlers, the renderer calls them by name |
| **Agent config table** (~31 entries) | One shared table that defines every agent — its name, how it launches, how it reports status, and what keybindings it gets |
| **Agent status types** | A shared data shape for agent status — used by hooks, UI panes, dashboard, and notifications |
| **Pane key** (`tabId:leafId`) | A composite ID that links a terminal pane to its status updates — PTY and hooks both use it |
| **Environment variables** (`FABRICA_*`) | A set of env vars injected at spawn time — tells the agent how to connect back to the app |
| **Plugin manifests** | Declarative files where plugins register their commands, events, and agent reservations |
| **Keybinding grammar** | A shared action-id system — the palette, menu, and plugins all speak the same language |
| **Hook wire contract** | The protocol version and endpoint format that hook scripts use to talk to the main process |
| **Plugin protocol** | Timeout and lifecycle constants shared between the parent process and plugin child processes |

**Design note:** Every cross-subsystem connection is either a named channel, a shared config module, or a typed schema. There is no hidden ad-hoc coupling — which is why changes to these contracts ripple predictably (and why renames are multi-layer migrations).
