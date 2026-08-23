#!/usr/bin/env bash
# run-task-team.sh — Launch a multi-agent team for a specific task
#
# Usage: bash scripts/run-task-team.sh <task-id>
#
# Spawns a tmux session with one pane per team member (lead + collaborators).
# Each agent runs Claude Code with their persona, focused on the specific task.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: bash scripts/run-task-team.sh <task-id>"
  echo "Example: bash scripts/run-task-team.sh task_1708500000000"
  exit 1
fi

TASK_ID="$1"
WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TASKS_FILE="$WORKSPACE_ROOT/mission-control/data/tasks.json"
AGENTS_FILE="$WORKSPACE_ROOT/mission-control/data/agents.json"
COMMANDS_DIR="$WORKSPACE_ROOT/.claude/commands"

if [ ! -f "$TASKS_FILE" ]; then
  echo "Error: tasks.json not found at $TASKS_FILE"
  exit 1
fi

# Parse the task to get team members
TASK_INFO=$(node -e "
  const tasks = require('$TASKS_FILE');
  const task = tasks.tasks.find(t => t.id === '$TASK_ID');
  if (!task) { console.error('Task not found: $TASK_ID'); process.exit(1); }
  const team = [task.assignedTo, ...(task.collaborators || [])].filter(Boolean);
  console.log(JSON.stringify({ title: task.title, team, assignedTo: task.assignedTo }));
")

TASK_TITLE=$(echo "$TASK_INFO" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.parse(d).title)")
TASK_TEAM=$(echo "$TASK_INFO" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');JSON.parse(d).team.forEach(t=>console.log(t))")
LEAD=$(echo "$TASK_INFO" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.parse(d).assignedTo||'')")

if [ -z "$TASK_TEAM" ]; then
  echo "Error: No team members assigned to task '$TASK_TITLE'"
  exit 1
fi

TEAM_COUNT=$(echo "$TASK_TEAM" | wc -l | tr -d ' ')
SESSION_NAME="mc-task-${TASK_ID##*_}"

echo "=== Task Team Launcher ==="
echo "Task:    $TASK_TITLE"
echo "Lead:    $LEAD"
echo "Team:    $TEAM_COUNT member(s)"
echo "Session: $SESSION_NAME"
echo ""

# Kill existing session if running
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# Create session with first team member
FIRST_MEMBER=$(echo "$TASK_TEAM" | head -1)
REMAINING=$(echo "$TASK_TEAM" | tail -n +2)

CMD_FILE="$COMMANDS_DIR/$FIRST_MEMBER/user.md"
ROLE_DESC="lead"
if [ "$FIRST_MEMBER" != "$LEAD" ]; then
  ROLE_DESC="collaborator"
fi

TASK_PROMPT="You are working on task '$TASK_TITLE' (ID: $TASK_ID) as the $ROLE_DESC. Read mission-control/data/ai-context.md first, then find this task in tasks.json and execute it. Post updates via inbox messages."

if [ -f "$CMD_FILE" ]; then
  tmux new-session -d -s "$SESSION_NAME" -n "$FIRST_MEMBER" \
    "cd '$WORKSPACE_ROOT' && claude --print \"\$(cat '$CMD_FILE')\" '$TASK_PROMPT' ; read -p 'Press Enter to close...'"
else
  tmux new-session -d -s "$SESSION_NAME" -n "$FIRST_MEMBER" \
    "cd '$WORKSPACE_ROOT' && claude --print '$TASK_PROMPT' ; read -p 'Press Enter to close...'"
fi

# Add remaining team members
for MEMBER in $REMAINING; do
  CMD_FILE="$COMMANDS_DIR/$MEMBER/user.md"
  ROLE_DESC="collaborator"

  if [ -f "$CMD_FILE" ]; then
    tmux split-window -t "$SESSION_NAME" \
      "cd '$WORKSPACE_ROOT' && claude --print \"\$(cat '$CMD_FILE')\" '$TASK_PROMPT' ; read -p 'Press Enter to close...'"
  else
    tmux split-window -t "$SESSION_NAME" \
      "cd '$WORKSPACE_ROOT' && claude --print '$TASK_PROMPT' ; read -p 'Press Enter to close...'"
  fi
  tmux select-layout -t "$SESSION_NAME" tiled
done

echo "All team members launched in tmux session '$SESSION_NAME'"
echo ""
echo "  Watch:   tmux attach -t $SESSION_NAME"
echo "  Kill:    tmux kill-session -t $SESSION_NAME"
echo ""
