---
name: plan-feature
description: Break a feature into implementation tasks with milestone and Eisenhower classification
disable-model-invocation: true
---

Plan the following feature: $ARGUMENTS

1. Read `mission-control/data/ai-context.md` for a quick snapshot of current state
2. Read the relevant project's CLAUDE.md and codebase structure
3. Read `mission-control/data/goals.json` to understand which goal this supports
4. Break the feature into implementation tasks (5-15 tasks)
5. For each task, determine importance and urgency
6. Create a new milestone in `goals.json` linked to the appropriate goal
7. Add all tasks to `tasks.json` with:
   - Proper importance/urgency classification
   - kanban: `"not-started"`
   - Link to the new milestone and project
   - Appropriate `assignedTo` agent role
   - 2-4 daily actions per task
8. Present the plan as a summary before saving
9. After saving, run `pnpm gen:context` in `mission-control/` to update the AI context

Ask me clarifying questions before starting if the feature description is ambiguous.
