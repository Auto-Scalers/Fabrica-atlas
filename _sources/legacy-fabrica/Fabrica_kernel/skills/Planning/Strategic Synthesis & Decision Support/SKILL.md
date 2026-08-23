---
name: Strategic Synthesis & Decision Support
description: Strategic Synthesis & Decision Support skill for synthesizing scoping, research, and analysis into Actionable Strategic Plans and Interactive Decision Matrices in Sources/Strategic Synthesis & Decision Support.
---

# Pipeline Sub-Skill: Strategic Synthesis & Decision Support (Planning Stage)

## 1. Overview & Universal Context
This skill completes the **Planning** stage of the Fabrica 4-Stage Looped Pipeline (`Drafting -> Planning -> Execution -> Delivering`).
It is global, domain-agnostic, and outcome-driven. Its primary objective is to combine all prior scoping, research, and analytical inputs into an executive Strategic Plan, risk audit, implementation roadmap, and scored Decision Matrix, outputting directly into **Sources / Strategic Synthesis & Decision Support**.

## 2. Phase Operational Rules
- **Stage Classification**: Stage 2: Planning (Non-loop final phase of Planning).
- **Inputs**: **Sources / Discovery & Scoping** + **Sources / Deep Research & Intelligence Gathering** + **Sources / Data Analysis & Pattern Extraction**.
- **Outputs**: Actionable Strategic Plan and Interactive Decision Matrix registered in **Sources / Strategic Synthesis & Decision Support**.

## 3. Step-by-Step Workflow
1. **Multi-Source Synthesis**: Ingest scoping parameters, deep research findings, and computed metrics from all `Sources` sub-sections.
2. **Synthesize Executive Plan & Risk Audit**: Formulate an executive summary, strategic roadmap, technical specs, and risk mitigation matrix.
3. **Build Interactive Decision Matrix**: Construct a scored task/option matrix evaluating benefit (HIGH/MED/LOW), cost/effort (HIGH/MED/LOW), and worth_it decision (YES/NO).
4. **Register Source Item**: Register the finalized Actionable Strategic Plan and Decision Matrix in **Sources / Strategic Synthesis & Decision Support**.

## 4. Dynamic Skill Routing & Domain Mappings
During synthesis execution, the AI Agent dynamically routes subroutines based on task scope:

- **Strategic Roadmapping**: `./domains/strategic_roadmap.md` (Timeline phases, task dependencies, milestone gates)
- **Interactive Decision Matrix**: `./domains/decision_matrix.md` (Trade-off scoring, ROI evaluation, task prioritization)
