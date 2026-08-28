# Orchestration — Ideas by Sub-System

> **Scratch space.** This file lists the orchestration **sub-system titles only** (mirroring the index in `orchestration-system.md`). Ideas/likes go under the relevant sub-system. Nothing here is validated.
> When an idea is **validated**, move it into `orchestration-system.md` (the existing-system reference) and log it in §Promotion Log below.
> _Feature inventory source: `discovery/Fabrica-features.md`, `discovery/mc-features.md`, `discovery/buzz-features.md`._

---

## 0. Guiding Constraint

**Strictly preserve every existing Fabrica feature.** Enhance/extend only — never remove. Any MC/buzz capability adopted must be a strict superset. (Fabrica-App Transformation Rule in `AGENTS.md`.)

## PM Vision (direction)

Fabrica → an **agentic orchestration platform**: directs agents, with first-class control over agent identity, system prompts, skills, and multi-tier coordination. Build on the engine that already exists; add a clean tier hierarchy + MC/buzz-grade agent/skill/persona model.

---

## Sub-System Titles (details live in `orchestration-system.md`)

1. Run (run-create)
2. Task (task-create)
3. Coordinator (auto-dispatch)
4. Worker-start (explicit)
5. worker_done settlement (lifecycle-reconciliation)
6. Decision gates
7. Federation sync (cross-environment)
8. Drift-guarded dispatch (git layer)
9. Preamble system
10. RPC surface
11. Integration points
12. Reference designs (MC + buzz)

---

## Ideas (by sub-system)

### 1. Run (run-create)
- [Idea] Add a **Meta-Orchestrator** tier: a Run should be owned by a program-level director that spawns/supervises Orchestrators (Draft A). Fabrica today has `coordinator.ts` but no explicit meta tier.

### 2. Task (task-create)
- [Idea] Implement AI-driven **decomposition** — `coordinator.decompose()` is currently a stub; tasks must be pre-created. Let the meta/orchestrator decompose a goal into a task DAG (Draft A).

### 3. Coordinator (auto-dispatch)
- [Idea] Split into **Meta-Orchestrator** (program director) + **Orchestrator** (per-run). Keep the 2s poll / max-4 / stale-guard behavior (Draft A).
- [Like] Centralize the dispatch predicate; make state transitions **event-sourced** (from MC fix list).

### 4. Worker-start (explicit)
- (empty — add ideas)

### 5. worker_done settlement (lifecycle-reconciliation)
- (empty — add ideas)

### 6. Decision gates
- (empty — add ideas)

### 7. Federation sync (cross-environment)
- [Idea] Extend federation for **unified cross-cutting agent identity** across Fabrica worktrees / MC daemon / buzz relay (Draft D).

### 8. Drift-guarded dispatch (git layer)
- [Like] Keep drift-guarded dispatch; extend where it strengthens portability.

### 9. Preamble system
- [Idea] Add a true **model system-prompt layer** (agent persona/instructions) — port MC `buildTaskPrompt` + `fenceTaskData`/`escapeFenceContent`/`enforcePromptLimit`/`scrubCredentials` into the preamble builder (Draft B).
- [Idea] **Persona packs** (`.persona.md`: YAML + markdown system prompt), publishable/sharable — modeled on buzz (Draft B).
- [Idea] Auto-load an agent's **skills** into the preamble on spawn (Draft C).

### 10. RPC surface
- (empty — add ideas)

### 11. Integration points
- [Idea] **Skills system upgrade**: versioned, installable artifacts with tags + agent assignments + example outputs; extended slash-command library (`/standup`, `/daily-plan`, `/orchestrate`, …); skill↔agent binding (Draft C). Adopt buzz's skill-as-shareable-artifact + publish model where it helps portability.

### 12. Reference designs (MC + buzz)
- [Like] MC: event-sourced dispatch predicate, decision gates, auto-generated agent/skill files, AI-context generator.
- [Like] buzz: persona packs, relay-owned agent identity, ACP harness pool, huddle voice, mesh compute, Nostr event-kind registry.

---

## Promotion Log (validated → `orchestration-system.md`)

| Date | Item | What moved to `orchestration-system.md` |
|---|---|---|
| — | — | (empty — nothing validated yet) |

---

_Last updated: 2026-08-28_
