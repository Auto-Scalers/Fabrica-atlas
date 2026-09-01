# 00 — What Exists Today

> Three codebases compared. What they share, what's unique, and what Fabrica already has.

---

## Part I — Cross-Repo Similarity

### Shared Features (All Three Codebases Built the Same Things)

| Concept | What It Means |
|---|---|
| Agents as first-class actors | Each system treats AI agents as independent entities with their own identity |
| Agent ↔ human messaging | Inbox/chat systems for agents and humans to communicate |
| Decision gates | Humans can block agent execution pending approval |
| Task/run state machines | All three track agent work through defined states |
| Execution engine | All three spawn and manage agent processes |
| Failure handling | Crash detection, restart, escalation to humans after repeated failures |
| Cost/token tracking | Per-session cost tracking |
| Safety/approval layer | Spend limits, permissions, controls for what agents can do |
| Encrypted secrets | Credentials encrypted at rest |
| Audit trail | Activity logging for accountability |
| CLI for agents | Command-line interfaces optimized for agent use |
| Scheduled automation | Cron-like scheduling of agent tasks |
| Skills/personas as data | Personality and capability configs injected at runtime |
| Agent memory | Session history persistence for resuming past work |

**Shared patterns:** single authoritative store, child process monitoring, hooks/events for status, multi-provider abstraction, boundary validation, graceful degradation.

### Relevance Map — What Matters for Fabrica

**Tier 1 — Defines the new product:**
- MC's safety/approval system (operations half)
- MC's prioritization/goals/brain-dump (management half)
- BZ's activity feed UX (makes delegation legible)
- FA's orchestration engine + worktrees (execution backbone)

**Tier 2 — Differentiators:**
- Decision inbox, unified activity feed, spend governor, agent identity, agent memory

**Tier 3 — Later:** remote agents, mesh compute, voice, multi-tenant, reputation

**Anti-goals (do NOT import):**
- BZ's Nostr relay as workspace architecture
- MC's JSON-file persistence at scale
- BZ multi-community tenancy

---

## Part II — Fabrica's Agent Platform

Fabrica-app is a **single-host agent desktop** built from five tightly integrated subsystems. Best-in-class for single-host. NOT yet a fleet-management platform.

### The Five Subsystems

| # | Subsystem | What It Does | Key Facts |
|---|---|---|---|
| 1 | **IPC Surface** | Transport backbone — every message between main process and UI flows through one audited hub | 344 handlers, 65 files, one preload bridge, 656 invoke sites |
| 2 | **PTY Plane** | Where agent CLIs execute — identity, flow control, persistence, kill semantics | Local/SSH/renderer modes; unique incarnation ID per spawn |
| 3 | **Agent Hooks** | Real-time turn-state from inside agents — zero polling | Loopback HTTP; 18 endpoints; working/blocked/waiting/done; 30min staleness |
| 4 | **Plugin Runtime** | Third-party code with capability-gated host services | One Node child per plugin; zod-validated; max 5 concurrent with FIFO |
| 5 | **Command Palette** | Operator control surface — how humans invoke everything | 7 result families; ~85 actions; saved quick commands; per-agent keybindings |

### How They Compose — Four Flows

**Launch:** Cmd+J → config table → PTY spawn → env vars injected → agent starts → hooks report status.

**Observe:** Agent fires hook → POST to loopback → token validated → enriched with pane context → pushed to UI (dashboard, notifications, palette dots).

**Extend:** Plugin manifest → forked child → zod handshake → host calls through one chokepoint → consent + audit → commands appear in palette.

**Watch:** Crash-isolated watchers monitor filesystem/git/worktrees → broadcast events → plugins consume → palette search updates.

### Shared Contracts

| Contract | What It Is |
|---|---|
| Channel strings (`namespace:action`) | Naming convention for all IPC messages |
| Agent config table (~31 entries) | Master config — name, launch, status reporting, keybindings |
| Agent status types | Shared data shape for hook events |
| Pane key (`tabId:leafId`) | Links terminal pane to status updates |
| `FABRICA_*` env vars | Injected at spawn — tells agents how to connect back |
| Plugin manifests | Commands, events, and agent reservations |
| Keybinding grammar | Shared action-id system across palette, menu, plugins |
| Hook wire contract | Protocol version + endpoint format for hook scripts |
| Plugin protocol | Timeout/lifecycle constants between parent and child |

**Design insight:** Every cross-subsystem connection is a named channel, shared config module, or typed schema. No hidden ad-hoc coupling — changes propagate predictably.

### What It Still Needs

- Durable run/task persistence
- Approval/decision gates
- Spend enforcement
- Readiness-gated agent spawning
- Orphan process sweeps
- Restart-policy supervision

These are the layers MC (workflow engine, guards, decision gates) and buzz (managed-agent supervisor) provide — the core of Fabrica's transformation.
