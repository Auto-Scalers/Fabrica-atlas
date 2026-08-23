Plan the following feature: $ARGUMENTS

## Setup

1. Read `mission-control/data/ai-context.md` for current state snapshot
2. Read `mission-control/data/goals.json` to identify which goal this feature supports
3. Read `mission-control/data/projects.json` to find the relevant project
4. Read `mission-control/data/tasks.json` to understand existing workload and avoid duplicates
5. If a project codebase exists, read its `CLAUDE.md` and review the directory structure

## Phase 1: Problem Definition

Before planning tasks, clearly define:

- **Problem Statement:** What user problem or business need does this feature solve?
- **Success Criteria:** How will we know this feature is done and working?
- **Scope:** What is explicitly in-scope and out-of-scope?
- **Dependencies:** Does this depend on other features, tasks, or external services?

Ask me clarifying questions if the feature description is ambiguous or missing critical details. Do NOT proceed until the scope is clear.

## Phase 2: Technical Approach

Outline the implementation approach:

- **Architecture:** How does this fit into the existing codebase?
- **Key decisions:** Any build-vs-buy, library choices, or pattern decisions?
- **Data model changes:** New types, schema updates, API endpoints needed?
- **UI changes:** New pages, components, or modifications to existing views?
- **Risk areas:** What parts are most complex or uncertain?

## Phase 3: Task Breakdown

Break the feature into **5-15 implementation tasks**. For each task, define:

```
### Task N: <Action-oriented title>
**Description:** What needs to be done (2-3 sentences)
**Assigned to:** <agent role — developer, researcher, marketer, etc.>
**Importance:** important | not-important
**Urgency:** urgent | not-urgent
**Estimated time:** <minutes>
**Blocked by:** [Task IDs this depends on, if any]
**Acceptance criteria:**
- [ ] <specific, testable criterion>
- [ ] <specific, testable criterion>
**Subtasks:**
- [ ] <concrete sub-step>
- [ ] <concrete sub-step>
```

### Estimation Guidance
- **Small task** (30-60 min): Single file change, config update, simple UI tweak
- **Medium task** (60-180 min): New component, API endpoint, or integration
- **Large task** (180-480 min): Multi-file feature, complex logic, full page build
- If a task exceeds 480 minutes, break it into smaller tasks

### Task Ordering
- Order tasks by dependency chain (blocked tasks come after their blockers)
- Group related tasks together (e.g., all API tasks, then all UI tasks)
- Put research/design tasks before implementation tasks

## Phase 4: Milestone Creation

Present the full plan as a summary table before saving:

| # | Task | Assigned To | Est. (min) | Blocked By |
|---|------|-------------|------------|------------|
| 1 | ... | ... | ... | — |
| 2 | ... | ... | ... | Task 1 |

Ask me to confirm the plan before creating anything.

## Phase 5: Save to Mission Control

After confirmation, create all resources via API:

1. **Create the milestone** via `POST /api/goals`:
   ```json
   {
     "title": "Feature: <feature name>",
     "type": "medium-term",
     "timeframe": "<target date or sprint>",
     "parentGoalId": "<linked long-term goal ID or null>",
     "projectId": "<project ID>",
     "status": "not-started",
     "milestones": [],
     "tasks": ["<task IDs will be added>"]
   }
   ```

2. **Create each task** via `POST /api/tasks`:
   ```json
   {
     "title": "<action-oriented title>",
     "description": "<what needs to be done>",
     "importance": "<importance>",
     "urgency": "<urgency>",
     "kanban": "not-started",
     "projectId": "<project ID>",
     "milestoneId": "<milestone ID from step 1>",
     "assignedTo": "<agent role>",
     "collaborators": [],
     "subtasks": [{ "id": "sub_1", "title": "...", "done": false }],
     "blockedBy": ["<task IDs>"],
     "estimatedMinutes": <number>,
     "acceptanceCriteria": ["criterion 1", "criterion 2"],
     "tags": ["<feature-tag>"]
   }
   ```

3. **Update the milestone** with the created task IDs via `PUT /api/goals`.

4. **Log activity** via `POST /api/activity-log`:
   ```json
   {
     "type": "task_created",
     "actor": "developer",
     "summary": "Planned feature: <feature name> — <N> tasks created",
     "details": "Milestone: <milestone ID>. Tasks: <task IDs>"
   }
   ```

5. Run `pnpm gen:context` after all data modifications.

## Output Summary

After saving, present:
- Total tasks created and total estimated time
- The milestone ID and link to view it
- Suggested first task to start working on
- Any open questions or risks to watch
