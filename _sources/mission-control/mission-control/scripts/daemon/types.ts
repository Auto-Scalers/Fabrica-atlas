// ─── Daemon Configuration ────────────────────────────────────────────────────

export interface ScheduleEntry {
  enabled: boolean;
  cron: string;
  command: string;
}

export interface DaemonConfig {
  polling: {
    enabled: boolean;
    intervalMinutes: number;
  };
  concurrency: {
    maxParallelAgents: number;
  };
  schedule: Record<string, ScheduleEntry>;
  execution: {
    maxTurns: number;
    timeoutMinutes: number;
    retries: number;
    retryDelayMinutes: number;
    skipPermissions: boolean;
    allowedTools: string[];
    agentTeams: boolean;
    claudeBinaryPath: string | null;
    maxTaskContinuations: number;
  };
  inbox: {
    maxContinuations: number;
    maxTurnsPerSession: number;
    timeoutPerSessionMinutes: number;
  };
  fieldOps?: {
    autoExecute: boolean;
    pollIntervalMinutes: number;
    maxConcurrentExecutions: number;
    requireVaultSession: boolean;
  };
}

// ─── Agent Sessions ──────────────────────────────────────────────────────────

export type SessionStatus = "running" | "completed" | "failed" | "timeout";

export interface AgentSession {
  id: string;
  agentId: string;
  taskId: string | null;
  command: string;
  pid: number;
  startedAt: string;
  status: SessionStatus;
  retryCount: number;
}

export interface SessionHistoryEntry {
  id: string;
  agentId: string;
  taskId: string | null;
  command: string;
  pid: number;
  startedAt: string;
  completedAt: string;
  status: SessionStatus;
  exitCode: number | null;
  error: string | null;
  durationMinutes: number;
  retryCount: number;
  costUsd: number | null;
  numTurns: number | null;
  usage: ClaudeUsage | null;
}

// ─── Daemon Status ───────────────────────────────────────────────────────────

export type DaemonRunStatus = "running" | "stopped" | "starting";

export interface DaemonStats {
  tasksDispatched: number;
  tasksCompleted: number;
  tasksFailed: number;
  uptimeMinutes: number;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
}

export interface DaemonStatus {
  status: DaemonRunStatus;
  pid: number | null;
  startedAt: string | null;
  activeSessions: AgentSession[];
  history: SessionHistoryEntry[];
  stats: DaemonStats;
  lastPollAt: string | null;
  nextScheduledRuns: Record<string, string>;
}

// ─── Runner Types ────────────────────────────────────────────────────────────

export interface SpawnOptions {
  prompt: string;
  maxTurns: number;
  timeoutMinutes: number;
  skipPermissions: boolean;
  allowedTools?: string[];
  agentTeams?: boolean;
  cwd: string;
  onSpawned?: (pid: number) => void;
}

export interface SpawnResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

// ─── Project Runs (continuous project execution) ────────────────────────────

export type ProjectRunStatus = "running" | "completed" | "stopped" | "stalled";

export interface ProjectRunTaskEntry {
  taskId: string;
  taskTitle: string;
  agentId: string;
  status: "completed" | "failed" | "timeout" | "stopped";
  startedAt: string;
  completedAt: string;
  summary: string;
  attempt: number;
}

export interface LoopDetectionState {
  taskAttempts: Record<string, number>;
  taskErrors: Record<string, string[]>;
}

export interface ProjectRun {
  id: string;
  projectId: string;
  status: ProjectRunStatus;
  startedAt: string;
  stoppedAt: string | null;
  completedAt: string | null;
  lastTaskCompletedAt: string | null;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  skippedTasks: number;
  taskHistory: ProjectRunTaskEntry[];
  loopDetection: LoopDetectionState;
}

export interface ProjectRunsFile {
  missions: ProjectRun[];
}

// ─── Claude Code Output Metadata ────────────────────────────────────────────

/** Token usage breakdown from Claude Code JSON output */
export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

/** Parsed metadata from Claude Code's --output-format json stdout */
export interface ClaudeOutputMeta {
  totalCostUsd: number | null;
  numTurns: number | null;
  subtype: string | null;    // "success" | "error_max_turns" | "error_timeout"
  sessionId: string | null;
  isError: boolean;
  usage: ClaudeUsage | null;
}

// ─── Respond Run Tracking (inbox auto-respond chains) ───────────────────────

export type RespondRunStatus = "running" | "completed" | "failed" | "stopped";

export interface RespondRunEntry {
  id: string;
  messageId: string;
  agentId: string;
  threadSubject: string;
  pid: number;
  status: RespondRunStatus;
  continuationIndex: number;
  maxContinuations: number;
  stopped: boolean;          // stop signal — prevents next continuation
  startedAt: string;
  completedAt: string | null;
  costUsd: number | null;
  numTurns: number | null;
  usage: ClaudeUsage | null;
  error: string | null;
}

export interface RespondRunsFile {
  runs: RespondRunEntry[];
}

// ─── Log Levels ──────────────────────────────────────────────────────────────

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "SECURITY";
