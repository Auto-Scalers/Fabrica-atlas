---
name: Delivering
description: Master Stage Skill for Stage 4 (Delivering) in the Fabrica 4-Stage Looped Pipeline. Oversees user review gates, release presentation, and final promotion to Deliverables/Completed.
---

# Pipeline Stage Skill: Delivering

## 1. Overview & Universal Context
The **Delivering** stage is Stage 4 of the Fabrica 4-Stage Looped Pipeline (`Drafting -> Planning -> Execution -> Delivering`).
It is global, domain-agnostic, and outcome-driven. Its primary objective is to present verified production deliverables from **Deliverables / Reviews** to the human operator, manage user approval/feedback loops, and promote accepted assets to **Deliverables / Completed**.

## 2. Stage Structure & Sub-Skills
- **`Delivering/pipeline_Delivering_Review/SKILL.md`**: Present production deliverables for user review, handle feedback loops, and promote accepted items to `Deliverables/Completed`.

## 3. Operational Logic (WHAT / HOW / WHY / WHEN)
- **WHAT**: Present verified production deliverables to the human operator for review, process approval or feedback, and promote accepted items to `workspace/Deliverables/Completed/`.
- **HOW**:
  1. Ingest verified deliverable items sitting in `workspace/Deliverables/Reviews/`.
  2. Present release notes, test results, and deliverable summaries to the user.
  3. Process user gate response:
     - **IF APPROVED**: Relocate item to `workspace/Deliverables/Completed/`, update `workspace.json`, and set mission `status = 'archive'`.
     - **IF REJECTED / FEEDBACK**: Relocate item back to `workspace/Deliverables/Executions/` and route feedback to the designated target loop (or default to Execution loop).
- **WHY**: Ensures human sign-off before archiving production work and closing the mission lifecycle.
- **WHEN**: Initiated when Stage 3 completes or when a mission enters Stage 4 (`status = 'DELIVERING'`).
