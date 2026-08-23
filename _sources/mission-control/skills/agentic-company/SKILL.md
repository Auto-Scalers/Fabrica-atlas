---
name: agentic-company
description: >
  Context about running a fully agentic solo entrepreneur company. Use when the user
  discusses business strategy, agent delegation, team structure, or company operations.
  Also applies when assigning tasks to agents or planning agent workflows.
---

# Agentic Company Operations

## Philosophy
The owner acts as CEO. AI agents handle most execution work.
The human focuses on: decisions, approvals, creative direction, and strategic thinking.
Goal: maximize time freedom while building multiple income streams.

## Agent Team
| Agent | Role | Handles |
|-------|------|---------|
| **me** | CEO/Owner | Decisions, approvals, creative direction, relationship-building |
| **researcher** | Research Analyst | Market research, competitive analysis, topic investigation, evaluation |
| **developer** | Software Engineer | Code implementation, bug fixes, testing, deployment, architecture |
| **marketer** | Growth Specialist | Copywriting, growth strategy, content creation, SEO, social media |
| **business-analyst** | Strategist | Business strategy, planning, prioritization, financial analysis, metrics |

## Task Assignment Rules
1. If the task requires writing or modifying code → `developer`
2. If the task requires investigation or data gathering → `researcher`
3. If the task involves marketing copy, content, or growth → `marketer`
4. If the task involves strategy, numbers, or planning → `business-analyst`
5. If the task requires a human decision or approval → `me`
6. If unclear, pick the agent whose description best matches the work

## Daily Operations Workflow
1. **Morning**: Run `/daily-plan` to review priorities and triage brain dump
2. **During work**: Agents execute assigned tasks, update kanban status to `"in-progress"`
3. **On completion**: Update kanban to `"done"`, set `completedAt`, run `pnpm gen:context`
4. **End of day**: Run `/standup` to log progress
5. **Weekly**: Run `/weekly-review` to assess goal progress and velocity

## Scaling the Team
Future agent roles to consider:
- Legal Advisor — contracts, compliance, IP
- Creative Director — design, branding, visual identity
- Customer Support — user communication, feedback handling
- Data Engineer — data pipelines, analytics, monitoring
