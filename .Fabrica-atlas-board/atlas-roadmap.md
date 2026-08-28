# Atlas Roadmap — After-Rebrand Transformation

> _High-level intents only. Task breakdown lives in `atlas-tasks.md` (not yet populated)._
> _Source of truth for feature inventory: `discovery/Fabrica-features.md`, `discovery/mc-features.md`, `discovery/buzz-features.md`._

---

## 0. Guiding Constraint

**Strictly preserve every existing Fabrica feature.** We enhance and extend — never remove. Any MC/buzz capability we adopt must be a strict superset of what Fabrica already does. The Fabrica-App Transformation Rule (in `AGENTS.md`) is the hard line.

---

## 1. PM Vision (Direction)

Fabrica should become an **agentic orchestration platform**: not just a terminal/IDE that *hosts* AI agents, but a system that *directs* them — with first-class control over agent identity, system prompts, skills, and multi-tier coordination. Starting point: the orchestration engine that already exists in the app, rebuilt into a clean 3-tier hierarchy, plus a skills system upgraded to MC/buzz standard.

---

## 2. High-Level Intents

### Intent A — Orchestration System (3-tier)
Adopt a clean hierarchy on top of the existing `runtime/orchestration/` engine:
- **Meta-Orchestrator** — top-level director. Owns program/run strategy, spawns and supervises Orchestrators, resolves cross-cutting decisions. (Fabrica today has `coordinator.ts` but no explicit meta tier — this is the new layer.)
- **Orchestrator** — per-run/per-domain coordinator. Owns task DAGs, dispatch preambles, worker lifecycle, decision gates. Maps to Fabrica's existing coordinator + MC's mission/ProjectRun model.
- **Worker** — atomic execution unit. Runs one task inside a worktree, streams output, reports `worker_done`. Fabrica already has worker terminals + dispatch; align with MC's file-persisted run ledger and buzz's relay-owned agent identity.

Reference material: `fabrica-app-discovery.md:230` (orchestration engine), `mc-chainedispatch-reconciler.md:197` (event-sourced dispatch recommendation), `buzz-discovery.md:84` (relay as single orchestrator).

### Intent B — System Prompt & Agent Control
Make system-prompt control a first-class, UI-facing feature:
- Agent registry with editable `instructions` (= system prompt), capabilities, skill bindings — modeled on MC `agents.json` + `/crew/new` (`mc-ui-frontend.md:182`).
- Persona packs (`.persona.md`: YAML + markdown system prompt), publishable/sharable — modeled on buzz (`buzz-discovery.md:229`).
- Dispatch preamble builder that composes system prompt + context (drift guards, fence + SOP + restart-context grammar from MC `prompt-builder.ts:471-505`).
- Injection defenses against fence-escaping (MC `security.ts:71-83`).

### Intent C — Skills System Upgrade
Enhance the skills layer to MC/buzz standard:
- Skills as versioned, installable artifacts with tags, agent assignments, example outputs (MC `skills/` + `mc-features.md:116`).
- Built-in slash-command library extended (`/standup`, `/daily-plan`, `/orchestrate`, …) and user-creatable.
- Skill ↔ agent binding so an agent auto-loads its skills on spawn.
- Adopt buzz's skill-as-shareable-artifact + Nostr publish model where it strengthens portability.

### Intent D — Cross-Cutting (deferred detail)
- Unified agent identity across Fabrica worktrees, MC file-coordinated daemon, and buzz relay-owned identity (`fa-ipc-watchers.md:393`).
- Federation/relay sync for orchestration already partly present in Fabrica (`fa-runtime-structured-read.md:59`) — keep and extend.

---

## 3. Sequencing (intent order, not tasks)
1. Intent A (orchestration 3-tier) — foundation everything else hangs off.
2. Intent B (system prompt / agent control) — depends on A's worker/dispatch model.
3. Intent C (skills) — depends on B's agent↔skill binding.
4. Intent D — integration/portability, after A–C stable.

---

_Last updated: 2026-08-28_
