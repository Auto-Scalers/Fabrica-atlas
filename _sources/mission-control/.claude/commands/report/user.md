Post a status update or completion report: $ARGUMENTS

1. Read mission-control/data/tasks.json to find the relevant task
2. Determine the report type:
   - If task is being completed: type is "report", update task kanban to "done"
   - If task is in progress: type is "update", keep task as "in-progress"

3. Write a message to mission-control/data/inbox.json:
   ```json
   {
     "id": "msg_{timestamp}",
     "from": "<your-agent-role>",
     "to": "me",
     "type": "report",
     "taskId": "<task-id>",
     "subject": "<Completed|Progress>: <task-title>",
     "body": "<summary of work done, results, blockers, or follow-up needed>",
     "status": "unread",
     "createdAt": "<ISO timestamp>",
     "readAt": null
   }
   ```

4. Log the activity in mission-control/data/activity-log.json:
   ```json
   {
     "id": "evt_{timestamp}",
     "type": "<task_completed or task_updated>",
     "actor": "<your-agent-role>",
     "taskId": "<task-id>",
     "summary": "<what happened>",
     "details": "<extended details>",
     "timestamp": "<ISO timestamp>"
   }
   ```

5. If completing a task:
   - Set task kanban to "done", completedAt to current timestamp
   - Set actualMinutes if you tracked the time
   - Check for downstream dependencies (tasks with this task's ID in blockedBy)
   - Update subtask progress if applicable

6. Run `pnpm gen:context` in mission-control/ to regenerate AI context

7. Confirm: "Report posted to inbox and activity logged."
