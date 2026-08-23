---
name: Execution
description: Master Stage Skill for Stage 3 (Execution) in the Fabrica 4-Stage Looped Pipeline. Oversees Generation (Assets, Coding, Automations) and Verification feedback loops under Deliverables/Executions.
---

# Pipeline Stage Skill: Execution

## 1. Overview & Universal Context
The **Execution** stage is Stage 3 of the Fabrica 4-Stage Looped Pipeline (`Drafting -> Planning -> Execution -> Delivering`).
It is global, domain-agnostic, and outcome-driven. Its primary objective is to execute production building (codebases, visual design, automations) based on the Actionable Strategic Plan, verify output quality against requirements, and handle self-repair loops before promotion to review.

## 2. Stage Structure & Sub-Skills
1. **`Execution/Generation/SKILL.md`**: Master generation coordinator for:
   - `Execution/Generation/Assets Generation/SKILL.md`
   - `Execution/Generation/Coding/SKILL.md`
   - `Execution/Generation/Automations Runing/SKILL.md`
2. **`Execution/verification/SKILL.md`**: Verification loop that audits outputs in `Deliverables/Executions` against specs in `Sources/Strategic Synthesis & Decision Support`.

## 3. Operational Logic (WHAT / HOW / WHY / WHEN)
- **WHAT**: Build, compile, and verify production deliverables under `workspace/Deliverables/Executions/` and promote verified passes to `workspace/Deliverables/Reviews/`.
- **HOW**:
  1. Ingest blueprint from `workspace/Sources/Strategic Synthesis & Decision Support/`.
  2. Invoke `Execution/Generation/SKILL.md` sub-skills (`Coding`, `Assets Generation`, `Automations Runing`) to construct deliverables.
  3. Invoke `Execution/verification/SKILL.md` to audit generated files against requirements.
     - **IF FAIL**: Re-trigger generation loop with detailed failure feedback notes (up to 3 hypotheses).
     - **IF PASS**: Move deliverable to `workspace/Deliverables/Reviews/` and update `workspace.json` and `missions.json`.
- **WHY**: Guarantees production code and asset quality before presenting work to the client/user.
- **WHEN**: Initiated when Stage 2 completes or when a mission enters Stage 3 (`status = 'EXECUTION'`).
