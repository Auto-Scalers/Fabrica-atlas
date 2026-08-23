---
name: Discovery & Scoping
description: Discovery & Scoping Loop skill for interactive user brainstorming, option presentation, cost/trade-off debate, and capturing approved scoping parameters into Sources/Discovery & Scoping.
---

# Pipeline Sub-Skill: Discovery & Scoping Loop (Drafting Stage)

## 1. Overview & Universal Context
This skill operates inside the **Drafting** stage of the Fabrica 4-Stage Looped Pipeline (`Drafting -> Planning -> Execution -> Delivering`).
It is global, domain-agnostic, and outcome-driven. Its primary objective is to engage in interactive discovery, clarify operational goals, debate strategic trade-offs, and produce an unambiguous, structured scoping manifest in **Sources / Discovery & Scoping**.

## 2. Phase Operational Rules
- **Stage Classification**: Stage 1: Drafting (Non-loop stage with active Discovery & Scoping loop).
- **Loop System**: Active interactive loop until User Approval Gate is passed or scoping preferences are finalized.
- **Effort Setting**: Low (1 round), Medium (2 rounds), High (3 rounds), Deep (5 rounds).
- **Inputs**: User prompt, raw concept brief, attached files/datasets.
- **Outputs**: Formatted Scoping Document registered directly in **Sources / Discovery & Scoping**.

## 3. Step-by-Step Workflow
1. **Interactive Q&A & Brainstorming**: AI Agent engages in interactive brainstorming and Q&A with the user to clarify goals, functional boundaries, constraints, and success criteria.
2. **Present Structural Options**: Presents multiple strategic options complete with concrete suggestions, cost/time trade-offs, and pros & cons for each path.
3. **Debate Strategy & Capture Preferences**: Debates strategy, resolves ambiguities, captures user preferences, and locks in agreed constraints.
4. **Register Source Item**: Formats and stores approved scoping parameters as a structured resource in **Sources / Discovery & Scoping**.

## 4. Dynamic Skill Routing & Domain Mappings
During execution, the AI Agent dynamically routes task subroutines to domain-specific modules based on active user context:

- **Software Engineering**: `./domains/software_engineering.md` (System architecture, tech stack selection, API boundaries)
- **Data Analytics & Engineering**: `./domains/data_analytics.md` (Data schemas, ingestion pipelines, metrics definitions)
- **Product Design & UX**: `./domains/product_design.md` (User journeys, feature hierarchy, interface wireframes)
- **System Automation & Integration**: `./domains/system_automation.md` (Webhook triggers, n8n workflows, third-party APIs)
