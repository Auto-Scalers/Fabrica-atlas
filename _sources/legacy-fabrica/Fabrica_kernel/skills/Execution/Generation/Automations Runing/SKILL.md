---
name: Automations Runing
description: Sub-skill for building, configuring, testing, and deploying workflow automations, n8n pipelines, and scheduled sync jobs under Deliverables/Executions.
---

# Sub-Skill: Automations Running

## 1. Overview & Universal Context
This sub-skill operates under **Execution/Generation**. It handles automated workflow construction, webhook triggers, n8n pipeline graphs, third-party API integrations, and background scheduled sync jobs under **Deliverables / Executions**.

## 2. Operational Rules & Subroutines
1. **Spec Ingestion**: Ingest trigger conditions, payload mapping, and integration endpoints.
2. **Workflow Assembly**: Configure JSON graph pipelines, webhook receivers, payload transforms, and retry handlers.
3. **Registration**: Save runnable workflow definitions into **Deliverables / Executions**.

## 3. Sub-Domain Modules
- `./domains/workflow_automation.md` (n8n JSON nodes, webhook handlers, cron schedulers)


## 5. Workflows, Rules & References
### References
- **`./references/n8n_workflow_patterns.md`**: Standard n8n node topologies, error handling, and webhook integration patterns.
