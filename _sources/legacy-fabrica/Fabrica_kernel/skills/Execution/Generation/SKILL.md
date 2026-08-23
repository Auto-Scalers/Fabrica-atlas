---
name: Generation
description: Master Generation skill inside Execution stage for coordinating Assets Generation, Coding, and Automations Running under Deliverables/Executions.
---

# Pipeline Sub-Skill: Generation (Execution Stage)

## 1. Overview & Universal Context
This skill governs the **Generation** phase of the **Execution** stage in the Fabrica 4-Stage Looped Pipeline (`Drafting -> Planning -> Execution -> Delivering`).
It coordinates building activities across design assets, software code, and workflow automations based on Strategic Synthesis or feedback loops, outputting into **Deliverables / Executions**.

## 2. Sub-Skills & Routing
- **`Execution/Generation/Assets Generation/SKILL.md`**: Visual design, UI graphics, brand templates.
- **`Execution/Generation/Coding/SKILL.md`**: Full-stack software engineering, Next.js components, Express APIs, database schemas.
- **`Execution/Generation/Automations Runing/SKILL.md`**: Workflow automations, webhooks, n8n graphs, cron triggers.

## 3. Workflow Execution
1. Receive input specs from Strategic Synthesis or feedback notes from Verification/Review.
2. Delegate building tasks to target sub-skills.
3. Ensure compiled, linted, and verified build output in **Deliverables / Executions**.
