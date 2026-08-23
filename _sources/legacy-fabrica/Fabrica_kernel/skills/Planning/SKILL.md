---
name: Planning
description: Master Stage Skill for Stage 2 (Planning) in the Fabrica 4-Stage Looped Pipeline. Oversees Deep Research, Data Analysis, and Strategic Synthesis to generate an Actionable Strategic Plan and Decision Matrix in Sources.
---

# Pipeline Stage Skill: Planning

## 1. Overview & Universal Context
The **Planning** stage is Stage 2 of the Fabrica 4-Stage Looped Pipeline (`Drafting -> Planning -> Execution -> Delivering`).
It is global, domain-agnostic, and outcome-driven. Its primary objective is to take approved parameters from **Sources / Discovery & Scoping**, execute deep intelligence gathering, analyze raw data patterns, and formulate an Actionable Strategic Plan and Decision Matrix before any building commences.

## 2. Stage Structure & Sub-Skills
1. **`Planning/Deep Research & Intelligence Gathering/SKILL.md`** (Loop phase): Multi-vector web scraping, paper research, competitor scans into `Sources/Deep Research & Intelligence Gathering`.
2. **`Planning/Data Analysis & Pattern Extraction/SKILL.md`** (Non-loop phase): Ingesting datasets, calculating metrics, detecting anomalies into `Sources/Data Analysis & Pattern Extraction`.
3. **`Planning/Strategic Synthesis & Decision Support/SKILL.md`** (Non-loop phase): Compiling executive strategic roadmap and interactive scored decision matrix into `Sources/Strategic Synthesis & Decision Support`.

## 3. Operational Logic (WHAT / HOW / WHY / WHEN)
- **WHAT**: Build an Actionable Strategic Plan, Scored Decision Matrix, and prioritized task list stored under `workspace/Sources/Strategic Synthesis & Decision Support/`.
- **HOW**:
  1. Read input manifest from `workspace/Sources/Discovery & Scoping/`.
  2. Invoke `Planning/Deep Research & Intelligence Gathering/SKILL.md` for multi-vector research.
  3. Invoke `Planning/Data Analysis & Pattern Extraction/SKILL.md` to extract metrics and detect dataset anomalies.
  4. Invoke `Planning/Strategic Synthesis & Decision Support/SKILL.md` to compile task lists scored on `benefit`, `cost`, and `worth_it`.
  5. Save strategic plan to `workspace/Sources/Strategic Synthesis & Decision Support/<plan_id>.md` and update `workspace.json` and `missions.json`.
- **WHY**: Provides a verified, quantitative blueprint that eliminates trial-and-error building.
- **WHEN**: Initiated when Stage 1 completes or when a mission enters Stage 2 (`status = 'PLANNING'`).
