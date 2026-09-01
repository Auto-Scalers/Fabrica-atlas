# Cross-Repo Analysis — PM Summary

This document compares three codebases — mission-control (MC), buzz (BZ), and Fabrica-app (FA) — to understand what they share, what's unique, and what Fabrica needs to become.

---

# Part I — Similarity & Relevance Analysis

## 1. Shared Features Across All Three Codebases

All three platforms independently built the same core concepts:

| Concept | What It Means |
|---|---|
| Agents as first-class actors | Each system treats AI agents as independent entities with their own identity and capabilities |
| Agent ↔ human messaging | All three have an inbox or chat system for agents and humans to communicate |
| Decision gates | Humans can block agent execution pending approval |
| Task/run state machines | All three track agent work through defined states (pending → running → done) |
| Execution engine | All three spawn and manage agent processes (continuous or batch) |
| Failure handling | All three detect crashes, restart agents, and escalate to humans after repeated failures |
| Cost/token tracking | All three track how much each agent session costs |
| Safety/approval layer | All three have controls for what agents are allowed to do (spend limits, permissions) |
| Encrypted secrets | All three store credentials and API keys encrypted at rest |
| Audit trail | All three log what agents did for accountability |
| CLI for agents | All three expose command-line interfaces optimized for agent use |
| Scheduled automation | All three support cron-like scheduling of agent tasks |
| Skills/personas as data | All three inject personality and capability configs into agents at runtime |
| Agent memory | All three persist session history so agents can resume past work |

**Shared architectural patterns:**
- All three use a single authoritative data store (not distributed)
- All three spawn child processes and monitor them for liveness
- All three have a hooks/events system for reporting status
- All three abstract over multiple AI providers (Claude, Codex, OpenCode, etc.)
- All three validate inputs at boundaries
- All three degrade gracefully when things fail

---

## 2. What Matters Most — Relevance Map

Ranked by importance to making Fabrica a desktop agent management platform for business and coding users:

### Tier 1 — Defines the new product
- **MC's safety/approval system** — spend limits, autonomy levels, circuit breakers (the "operations" half)
- **MC's prioritization/goals/brain-dump** — task management for non-coders (the "management" half)
- **BZ's activity feed UX** — makes agent delegation visible and legible
- **FA's orchestration engine + worktrees** — the existing execution backbone

### Tier 2 — Differentiators
- Decision inbox (unified place for all agent requests needing human input)
- Unified activity feed across all agents
- Spend governor (automatic budget enforcement)
- Agent identity and attribution
- Agent memory and session history

### Tier 3 — Later / platform-level
- Remote resident agents
- Mesh compute distribution
- Voice huddles
- Multi-tenant isolation
- Reputation / web-of-trust

### Anti-goals (do NOT import)
- BZ's Nostr relay as workspace architecture — FA already has its own runtime
- MC's JSON-file persistence at scale — FA's data stores are already stronger
- BZ multi-community tenancy — Fabrica is single-operator today

---

# Part II — Fabrica-app's Agent Platform

Fabrica-app already has five deep subsystems that work together:

## 3. The Five Subsystems

| # | Subsystem | What It Does | Key Facts |
|---|---|---|---|
| 1 | **IPC Surface** | Transport backbone — every other subsystem communicates through it | 344 registered handlers across 65 files; one preload bridge with 656 invoke sites; 76 namespaces |
| 2 | **PTY Plane** | Where agent CLIs actually execute — handles identity, flow control, persistence, and kill semantics | Three execution modes: local, SSH relay, and xterm renderer; each spawn gets a unique incarnation ID |
| 3 | **Agent Hooks** | Real-time turn-state ingestion from inside agent CLIs — zero polling | Loopback HTTP receiver; 18 hook endpoints; states: working/blocked/waiting/done; auto-expires stale data after 30 minutes |
| 4 | **Plugin Runtime** | Third-party code execution with capability-gated host services | One Node child process per plugin; validated both directions; max 5 concurrent plugins with FIFO queue |
| 5 | **Command Palette / Keybindings** | Operator control surface — how humans invoke everything | One palette merging 7 result types; ~85 base actions plus dynamic per-agent and per-plugin families; saved quick commands |

## 4. How the Subsystems Compose — Four Flows

**Launch flow (how an agent starts):**
Human triggers via palette → launcher reads agent config → spawns agent process in PTY → injects environment variables → hooks start reporting status → UI updates in real time.

**Observe flow (how we know what agents are doing):**
Agent process emits hook events → loopback receiver normalizes them → status pushed to renderer panes → staleness auto-detected after 30 minutes of silence.

**Extend flow (how plugins add capabilities):**
Plugin activated → forked child process spawned → zod-validated handshake → host calls go through one chokepoint → consent and audit logged → plugin can register commands, events, and agents.

**Command flow (how humans invoke things):**
Human presses Cmd+J → palette searches across 7 result families → dispatches to the right handler → keyboard shortcuts work everywhere.

## 5. Shared Contracts — The Glue

These are the agreements between subsystems that keep everything connected:

| Contract | What It Is |
|---|---|
| `<namespace>:<action>` channels | The naming convention for all IPC messages |
| `TUI_AGENT_CONFIG` table | Master config listing all agents with their names, capabilities, and settings |
| Agent status payloads | Typed data structures for hook events that drive the UI |
| Composite pane identity (`paneKey`) | Unique identifier for each agent pane (tab + leaf combination) |
| `FABRICA_*` environment variables | Variables injected into every agent process at spawn time |
| Plugin manifest contributions | What plugins declare they can add (commands, events, agents) |
| Keybinding action IDs | The grammar for all keyboard shortcuts and palette actions |
| Hook protocol version | Shared contract between hook emitters and receivers |

**Key design insight:** Every connection between subsystems is either a string-based channel contract, a shared config table, or a typed schema module. There's no hidden ad-hoc coupling — which means changes propagate predictably.

---

## 6. Honest Assessment

Fabrica-app is a **best-in-class single-host agent desktop**. It handles spawning, executing, observing, and extending agents locally.

What it still needs (what MC and buzz provide):
- Durable run/task persistence
- Approval/decision gates
- Spend enforcement
- Readiness-gated agent spawning
- Orphan process sweeps
- Restart-policy supervision

These are the exact layers mission-control (workflow engine, guards, decision gates) and buzz (managed-agent supervisor lifecycle) provide, and they're the core of Fabrica's transformation roadmap.
