# Mission Control — Daemon (Background Task Processor)

> Source: `_sources/mission-control/mission-control/scripts/daemon/`
> Commit: `2b8c402`

## Overview

The Mission Control daemon is an autonomous background Node.js process that:
1. Polls `tasks.json` for pending tasks
2. Spawns Claude Code (`claude -p`) subprocesses
3. Enforces concurrency limits
4. Retries failures with exponential backoff
5. Runs scheduled cron jobs
6. Auto-executes approved Field Ops tasks

It's the "24/7 always-on" layer that makes Mission Control autonomous.

## Architecture

```
Daemons (spawned via `pnpm daemon:start`)
  ↓
index.ts (main loop, 60s maintenance interval)
  ├─ Dispatcher (polls tasks.json, spawns agents)
  ├─ Runner (spawns Claude Code subprocesses)
  ├─ Scheduler (node-cron scheduled commands)
  └─ HealthMonitor (session tracking, cleanup)
  ↓
Claude Code subprocesses (one per task)
  ↓
Update tasks.json + activity-log.json + active-runs.json
```

## Files (12)

| File | Purpose |
|------|---------|
| `index.ts` (228 lines) | **Daemon entry point** — CLI for `start`/`stop`/`status`. PID file (`data/daemon.pid`), status file (`data/daemon-status.json`). Initializes HealthMonitor + AgentRunner + Dispatcher + Scheduler. Graceful shutdown on SIGINT/SIGTERM. 60s maintenance interval for stale session cleanup + uptime tracking |
| `config.ts` (172 lines) | **Default config + validation** — DEFAULT_CONFIG with polling (5min interval), concurrency (3 parallel), schedule (daily-plan 7am, standup 9am Mon-Fri, brainDumpTriage 12pm, weekly-review 5pm Fri), execution (25 maxTurns, 30min timeout, 1 retry, skipPermissions=false, allowedTools=[Edit,Write], maxTaskContinuations=2), inbox config. `validateConfig()` enforces strict ranges |
| `dispatcher.ts` (621 lines) | **Task dispatch engine** — `pollAndDispatch()`: process due retries (persisted to `daemon-retry-queue.json` with exponential backoff up to 60min), filter pending tasks (skip already running, in retry queue, blocked by dependencies, has pending decision, exceeded retry limit), dispatch up to concurrency limit. `dispatchTask()` builds prompt via `buildTaskPrompt()` and spawns via `runner.spawnAgent()`. Tracks failure → push to retry queue. **`pollProjectRuns()`** — revives stalled continuous project runs by re-spawning chain tasks. **`pollFieldOps()`** — auto-executes approved field tasks via HTTP API (if `fieldOps.autoExecute` enabled) |
| `runner.ts` (373 lines) | **Claude Code subprocess launcher** — `findClaudeBinary()` resolves npm `claude.cmd` shim on Windows (extracts JS entry from `%dp0%\node_modules\@anthropic-ai\claude-code\cli.js` and spawns via `node.exe`); checks npm/pnpm install locations. `AgentRunner.spawnAgent()` builds args as array (NOT shell string — prevents injection), spawns with safe env. Timeout enforced via `treeKill` for cross-platform process tree termination. **`parseClaudeOutput()`** (L173-211) extracts `totalCostUsd`, `numTurns`, `subtype`, `sessionId`, `usage` (input/output/cache tokens) from Claude Code's JSON stdout |
| `security.ts` (159 lines) | **Security primitives** — `scrubCredentials()` (15 regex patterns: sk-, Bearer, AKIA AWS, GitHub tokens `gh[pousr]_`, npm, Slack `xox[bpsa]-`, Stripe `sk_(live\|test)_`, Anthropic `sk-ant-`, SSH private keys, database URLs). `validatePathWithinWorkspace()` (path traversal guard). `fenceTaskData()` wraps user data in `<task-context>` XML tags with escape to prevent fence-breakout injection. `enforcePromptLimit()` truncates to 100KB. `validateBinary()` whitelists only `claude`/`claude.cmd`/`claude.exe`. `buildSafeEnv()` strips all env vars except PATH, HOME, USERPROFILE, APPDATA, TEMP, Windows system vars (SystemRoot required for node.exe), and `CLAUDE_CODE_OAUTH_TOKEN` (Claude Code v2.1.71+ auth token) |
| `health.ts` | Session tracking, cost/usage stats, uptime counter, `cleanStaleSessions()` (PID liveness), `writeStoppedStatus()` |
| `scheduler.ts` | node-cron scheduled commands (calls `dispatcher.runScheduledCommand()`) |
| `prompt-builder.ts` | `buildTaskPrompt(agentId, task)` constructs the full prompt with agent persona + skills + task-context fence. `buildScheduledPrompt(command)` for cron jobs. `getPendingTasks()`, `isTaskUnblocked()`, `hasPendingDecision()` |
| `types.ts` | `DaemonConfig`, `ProjectRunsFile`, `SpawnOptions`, `SpawnResult`, `ClaudeOutputMeta`, `ClaudeUsage` |
| `logger.ts` | `[INFO]`, `[WARN]`, `[ERROR]`, `[SECURITY]` prefixed logger |
| `run-task.ts` | Standalone script to run a single task (used by `pollProjectRuns` chain dispatch via detached spawn) |
| `run-inbox-respond.ts` | Run an inbox auto-respond chain |
| `run-brain-dump-triage.ts` | Daily brain dump triage |
| `respond-runs.ts` | Tracks `respond-runs.json` chain status |

## Default Configuration (`config.ts`)

```typescript
DEFAULT_CONFIG = {
  polling: {
    intervalMs: 300_000,  // 5 minutes
  },
  concurrency: {
    maxParallel: 3,
  },
  schedule: {
    dailyPlan: "0 7 * * *",           // 7am daily
    standup: "0 9 * * 1-5",           // 9am Mon-Fri
    brainDumpTriage: "0 12 * * *",    // 12pm daily
    weeklyReview: "0 17 * * 5",       // 5pm Friday
  },
  execution: {
    maxTurns: 25,
    timeoutMs: 1_800_000,             // 30 minutes
    maxRetries: 1,
    skipPermissions: false,
    allowedTools: ["Edit", "Write"],
    maxTaskContinuations: 2,
  },
  inbox: {
    autoRespond: false,
    respondIntervalMs: 60_000,
  },
}
```

## Dispatch Flow

```
Dispatcher.pollAndDispatch() (every 5 min)
  ↓
Load tasks.json, filter:
  - status: "pending" or "in_progress"
  - not already running
  - not in retry queue
  - not blocked by dependencies
  - no pending decision
  - retry count < maxRetries
  ↓
Sort by priority (Eisenhower quadrant + kanban order)
  ↓
Dispatch up to maxParallel (3 concurrent)
  ↓
For each task:
  1. buildTaskPrompt(agentId, task) → full prompt
  2. runner.spawnAgent() → Claude Code subprocess
  3. Track in active-runs.json
  4. On exit: parseClaudeOutput() → update task + activity
  5. On failure: push to retry queue with exponential backoff
```

## Retry Strategy

- Failures persisted to `daemon-retry-queue.json`
- Exponential backoff: 1min, 2min, 4min, 8min, ... up to 60min
- After max retries → task marked as `failed` + activity log entry

## Security Primitives (`security.ts`)

### `scrubCredentials()` — 15 Regex Patterns
- `sk-` (Anthropic, OpenAI)
- `Bearer`
- `AKIA` (AWS)
- `gh[pousr]_` (GitHub tokens)
- npm tokens
- `xox[bpsa]-` (Slack)
- `sk_(live|test)_` (Stripe)
- `sk-ant-` (Anthropic)
- SSH private keys
- Database URLs

### `validatePathWithinWorkspace()`
Path traversal guard — rejects paths outside workspace.

### `fenceTaskData()`
Wraps user data in `<task-context>` XML tags with escape to prevent fence-breakout injection.

### `enforcePromptLimit()`
Truncates to 100KB.

### `validateBinary()`
Whitelists only `claude`/`claude.cmd`/`claude.exe`.

### `buildSafeEnv()`
Strips all env vars except:
- PATH, HOME, USERPROFILE, APPDATA, TEMP
- Windows system vars (SystemRoot required for node.exe)
- `CLAUDE_CODE_OAUTH_TOKEN` (Claude Code v2.1.71+ auth token)

## Scheduled Commands

Via `node-cron`:
- **daily-plan** (7am) — Top priorities + inbox check + decisions + brain dump triage
- **standup** (9am Mon-Fri) — Daily standup from git + tasks + inbox + activity
- **brainDumpTriage** (12pm) — Convert brain dump to structured tasks
- **weekly-review** (5pm Fri) — Accomplishments + goal progress + stale items

## Project Runs (Continuous Missions)

`pollProjectRuns()` revives stalled continuous project runs:
- Re-spawns chain tasks as previous tasks complete
- Tracks state in `data/missions.json` and `data/respond-runs.json`
- Loop detection: 3 failures → escalate to user decision

## Field Ops Auto-Execution

`pollFieldOps()` auto-executes approved field tasks via HTTP API:
- Only if `fieldOps.autoExecute` enabled in config
- Calls `/api/field-ops/execute` for each approved task
- Respects rate limits, spend limits, circuit breaker

## Security Model (per CLAUDE.md L441-446)

- **No network listener** — pure local process
- **Credential scrubbing** before logging
- **Prompt fencing** with `<task-context>` delimiters
- **Binary whitelist** (`claude` only)
- **Safe env** (only PATH/HOME/USERPROFILE/APPDATA/TEMP + Windows system vars + OAuth token)
- **`skipPermissions` defaults `false`** — `[SECURITY]` warning when enabled

## Scan Coverage

- `scripts/daemon/index.ts` (228 lines) read
- `scripts/daemon/config.ts` (172 lines) read
- `scripts/daemon/dispatcher.ts` (621 lines) read
- `scripts/daemon/runner.ts` (373 lines) read
- `scripts/daemon/security.ts` (159 lines) read
- All 12 daemon files enumerated
- **Not deeply read:** health.ts, scheduler.ts, prompt-builder.ts internals
