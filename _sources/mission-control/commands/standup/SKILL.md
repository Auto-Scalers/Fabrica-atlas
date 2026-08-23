---
name: standup
description: Generate daily standup summary with in-progress tasks, git activity, and goal progress
disable-model-invocation: true
---

Generate my daily standup by doing the following:

1. Read `mission-control/data/ai-context.md` for a quick snapshot of current state
2. Read `mission-control/data/tasks.json` and find tasks with kanban `"in-progress"`
3. Run `git log --oneline --since="yesterday" --all` across all project directories
4. Read `mission-control/data/goals.json` to check milestone progress

Format the output as:

## Yesterday
- [List completed work from git commits]

## Today
- [List in-progress tasks and their next daily actions]

## Blockers
- [Any tasks marked important+urgent that have been in-progress for more than 3 days]

## Goal Progress
- [Summary of milestone completion percentages]
