Check for new work assignments and pick up the highest-priority task:

1. Read mission-control/data/ai-context.md for current state
2. Read mission-control/data/inbox.json — filter for messages where:
   - `to` matches your current agent role
   - `status` is "unread"
   - `type` is "delegation" (new assignments)
3. Read mission-control/data/tasks.json — find tasks assigned to your role that are:
   - kanban "not-started" (ready to work on)
   - Not blocked (no incomplete dependencies in blockedBy)
4. Read mission-control/data/decisions.json — check for any pending decisions that might affect your work

Present findings as:

## New Delegations
[List any new delegation messages from the inbox — show subject, from, and task details]

## Available Tasks (assigned to you, not blocked)
[List tasks sorted by: important+urgent first, then important+not-urgent]
[Show subtasks, acceptance criteria, and estimated time for each]

## Blocked Tasks
[Tasks assigned to you that are blocked — show what they're waiting on]

## Recommendation
[Which task to work on next and why — consider urgency, importance, and dependencies]

After presenting, ask: "Should I start working on [recommended task]?"

When starting work:
1. Update the task's kanban to "in-progress" in tasks.json
2. Mark any delegation messages as "read" in inbox.json
3. Log an "agent_checkin" event in activity-log.json
