---
name: Drafting
description: Master Stage Skill for Stage 1 (Drafting) in the Fabrica 4-Stage Looped Pipeline. Oversees Discovery & Scoping loops to define scope, analyze options, and establish initial project parameters in Sources/Discovery & Scoping.
---

# Pipeline Stage Skill: Drafting

## 1. Overview & Universal Context
The **Drafting** stage is Stage 1 of the Fabrica 4-Stage Looped Pipeline (`Drafting -> Planning -> Execution -> Delivering`).
It is global, domain-agnostic, and outcome-driven. Its primary objective is to engage with the user in interactive discovery, clarify operational boundaries, evaluate technical/business trade-offs, and establish a clear scoping manifest in **Sources / Discovery & Scoping**.

## 2. Stage Structure & Sub-Skills
- **`Drafting/Discovery & Scoping/SKILL.md`**: Interactive brainstorming, option presentation, cost/trade-off debate, capturing preferences, and registering approved parameters into `Sources/Discovery & Scoping`.

## 3. Operational Logic (WHAT / HOW / WHY / WHEN)
- **WHAT**: Produce a locked-in scoping manifest document and register it under `workspace/Sources/Discovery & Scoping/`.
- **HOW**:
  1. Ingest raw prompt and user attached context chips (`@path` tokens).
  2. Load sub-skill `view_file` on `Drafting/Discovery & Scoping/SKILL.md`.
  3. Conduct discovery loop, outline 3 strategic option trade-offs (benefit vs cost), and lock user preferences.
  4. Save scoping file to `workspace/Sources/Discovery & Scoping/<manifest_id>.md` and register in `workspace.json` and `missions.json`.
- **WHY**: Establishes unambiguous project boundaries before any planning, research, or building occurs.
- **WHEN**: Initiated whenever a new mission starts in Stage 1 (`status = 'DRAFTING'`) or when launching a pipeline from Drafting.
