#!/usr/bin/env bash
# run-team.sh — Launch all active agents in parallel tmux panes
#
# Usage: bash scripts/run-team.sh
#
# Each agent gets its own tmux pane running Claude Code with that agent's persona.
# All agents read/write the same JSON files (safe via async-mutex locking in the API).
# Watch all agents work: tmux attach -t mc-agents

set -euo pipefail

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS_FILE="$WORKSPACE_ROOT/mission-control/data/agents.json"
COMMANDS_DIR="$WORKSPACE_ROOT/.claude/commands"

if [ ! -f "$AGENTS_FILE" ]; then
  echo "Error: agents.json not found at $AGENTS_FILE"
  exit 1
fi

# Kill existing session if running
tmux kill-session -t mc-agents 2>/dev/null || true

echo "=== Mission Control Agent Orchestrator ==="
echo "Reading agent registry..."

# Parse active agents (excluding "me") using node for JSON parsing
AGENT_IDS=$(node -e "
  const data = require('$AGENTS_FILE');
  const active = data.agents.filter(a => a.status === 'active' && a.id !== 'me');
  active.forEach(a => console.log(a.id));
")

if [ -z "$AGENT_IDS" ]; then
  echo "No active agents found (excluding 'me')."
  exit 0
fi

# Count agents
AGENT_COUNT=$(echo "$AGENT_IDS" | wc -l | tr -d ' ')
echo "Found $AGENT_COUNT active agents"

# Create tmux session with the first agent
FIRST_AGENT=$(echo "$AGENT_IDS" | head -1)
REMAINING=$(echo "$AGENT_IDS" | tail -n +2)

echo "Starting tmux session: mc-agents"

CMD_FILE="$COMMANDS_DIR/$FIRST_AGENT/user.md"
if [ -f "$CMD_FILE" ]; then
  PROMPT="$(cat "$CMD_FILE")"
else
  PROMPT="You are the $FIRST_AGENT agent. Check mission-control/data/ai-context.md for context, then pick up your highest priority task and execute it."
fi

tmux new-session -d -s mc-agents -n "$FIRST_AGENT" \
  "cd '$WORKSPACE_ROOT' && claude --print \"\$(cat '$CMD_FILE')\" 'Pick up your highest priority task and execute it. Read mission-control/data/ai-context.md first for context.' ; read -p 'Press Enter to close...'"

# Add remaining agents as split panes
for AGENT_ID in $REMAINING; do
  CMD_FILE="$COMMANDS_DIR/$AGENT_ID/user.md"
  if [ -f "$CMD_FILE" ]; then
    tmux split-window -t mc-agents \
      "cd '$WORKSPACE_ROOT' && claude --print \"\$(cat '$CMD_FILE')\" 'Pick up your highest priority task and execute it. Read mission-control/data/ai-context.md first for context.' ; read -p 'Press Enter to close...'"
  fi
  # Rebalance panes after each split
  tmux select-layout -t mc-agents tiled
done

echo ""
echo "All agents launched in tmux session 'mc-agents'"
echo ""
echo "  Watch:   tmux attach -t mc-agents"
echo "  Kill:    tmux kill-session -t mc-agents"
echo ""
