# Atlas Roadmap — After-Rebrand Transformation

> **Workflow:** This file is the **draft / likes scratch space**. We drop ideas and things we like from MC/buzz here while discussing. Nothing here is validated or committed. When an idea is **validated**, it is moved into `system.md` (the authoritative reference for the orchestration system) — and removed from this draft list. `system.md` must NEVER contain unvalidated intents.
> _Source of truth for feature inventory: `discovery/Fabrica-features.md`, `discovery/mc-features.md`, `discovery/buzz-features.md`._

---

## 0. Guiding Constraint

**Strictly preserve every existing Fabrica feature.** We enhance and extend — never remove. Any MC/buzz capability we adopt must be a strict superset of what Fabrica already does. The Fabrica-App Transformation Rule (in `AGENTS.md`) is the hard line.

---

## 1. PM Vision (Direction)

Fabrica should become an **agentic orchestration platform**: not just a terminal/IDE that *hosts* AI agents, but a system that *directs* them — with first-class control over agent identity, system prompts, skills, and multi-tier coordination. Starting point: the orchestration engine that already exists in the app, rebuilt into a clean 3-tier hierarchy, plus a skills system upgraded to MC/buzz standard.

---

## 2. Draft Ideas & Likes (working scratch — NOT validated)

> _Everything below is under discussion. Items move to `system.md` only when validated._

### Draft A — Orchestration System (3-tier)
Adopt a clean hierarchy on top of the existing `runtime/orchestration/` engine:
- **Meta-Orchestrator** — top-level director. Owns program/run strategy, spawns and supervises Orchestrators, resolves cross-cutting decisions. (Fabrica today has `coordinator.ts` but no explicit meta tier — this is the new layer.)
- **Orchestrator** — per-run/per-domain coordinator. Owns task DAGs, dispatch preambles, worker lifecycle, decision gates. Maps to Fabrica's existing coordinator + MC's mission/ProjectRun model.
- **Worker** — atomic execution unit. Runs one task inside a worktree, streams output, reports `worker_done`. Fabrica already has worker terminals + dispatch; align with MC's file-persisted run ledger and buzz's relay-owned agent identity.

Reference: `fabrica-app-discovery.md:230`, `mc-chainedispatch-reconciler.md:197`, `buzz-discovery.md:84`.

### Draft B — System Prompt & Agent Control  _[under discussion]_
- Agent registry with editable `instructions` (= system prompt), capabilities, skill bindings — modeled on MC `agents.json` + `/crew/new` (`mc-ui-frontend.md:182`).
- Persona packs (`.persona.md`: YAML + markdown system prompt), publishable/sharable — modeled on buzz (`buzz-discovery.md:229`).
- Compose system prompt into the dispatch preamble (prepend to terminal text via `sendTerminalAgentPrompt`); use MC fence + SOP + restart-context grammar (`prompt-builder.ts:471-505`) + injection defense (`security.ts:71-83`).
- _Note: Fabrica's current `preamble.ts` is a dispatch/operational prompt, NOT a model system prompt. How to add a true system-prompt layer is still being discussed._

### Draft C — Skills System Upgrade
- Skills as versioned, installable artifacts with tags, agent assignments, example outputs (MC `skills/` + `mc-features.md:116`).
- Built-in slash-command library extended (`/standup`, `/daily-plan`, `/orchestrate`, …) and user-creatable.
- Skill ↔ agent binding so an agent auto-loads its skills on spawn.
- Adopt buzz's skill-as-shareable-artifact + Nostr publish model where it strengthens portability.

### Draft D — Cross-Cutting (deferred)
- Unified agent identity across Fabrica worktrees, MC file-coordinated daemon, and buzz relay-owned identity (`fa-ipc-watchers.md:393`).
- Federation/relay sync for orchestration already partly present in Fabrica (`fa-runtime-structured-read.md:59`) — keep and extend.

### Likes from MC/buzz (captured, not yet drafted as intents)
- MC: drift-guarded dispatch, event-sourced dispatch predicate, decision gates, auto-generated agent/skill files, AI-context generator.
- buzz: persona packs, relay-owned agent identity, ACP harness pool, huddle voice, mesh compute, Nostr event-kind registry.

---

## 3. Validated → system.md (promotion log)

| Date | Item | What moved to `system.md` |
|---|---|---|
| — | — | (empty — nothing validated yet) |

---

_Last updated: 2026-08-28_
