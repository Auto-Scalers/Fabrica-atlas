Generate my daily standup by doing the following:

1. Read mission-control/data/ai-context.md for a quick snapshot of current state
2. Read mission-control/data/tasks.json and find tasks with kanban "in-progress"
3. Read mission-control/data/inbox.json for any unread messages
4. Read mission-control/data/activity-log.json for recent events (last 24 hours)
5. Read mission-control/data/decisions.json for any pending decisions
6. Run `git log --oneline --since="yesterday" --all` across all project directories
7. Read mission-control/data/goals.json to check milestone progress

Format the output as:

## Yesterday
- [List completed work from git commits and activity log events]

## Today
- [List in-progress tasks and their next subtasks/daily actions]

## Inbox
- [Unread messages summary: who sent what, any delegations or questions needing response]

## Pending Decisions
- [Any decisions waiting for answers — show the question and options]

## Blockers
- [Any tasks marked important+urgent that have been in-progress for more than 3 days]
- [Any tasks that are blocked by incomplete dependencies]

## Goal Progress
- [Summary of milestone completion percentages]
