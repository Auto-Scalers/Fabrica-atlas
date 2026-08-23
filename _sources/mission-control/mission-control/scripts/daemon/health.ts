import { readFileSync, writeFileSync, existsSync, renameSync } from "fs";
import path from "path";
import { logger } from "./logger";
import { scrubCredentials } from "./security";
import type { AgentSession, SessionHistoryEntry, DaemonStatus, DaemonStats, ClaudeUsage } from "./types";

const DATA_DIR = path.resolve(__dirname, "../../data");
const STATUS_FILE = path.join(DATA_DIR, "daemon-status.json");
const MAX_HISTORY = 50;

/**
 * Check if a process is still running by sending signal 0.
 */
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export class HealthMonitor {
  private activeSessions: Map<string, AgentSession> = new Map();
  private history: SessionHistoryEntry[] = [];
  private stats: DaemonStats = {
    tasksDispatched: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    uptimeMinutes: 0,
    totalCostUsd: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheReadTokens: 0,
    totalCacheCreationTokens: 0,
  };
  private startedAt: string;
  private lastPollAt: string | null = null;
  private nextScheduledRuns: Record<string, string> = {};

  constructor() {
    this.startedAt = new Date().toISOString();
    this.loadPersistedStats();
  }

  // ─── Session Management ──────────────────────────────────────────────────

  startSession(agentId: string, taskId: string | null, command: string, pid: number): string {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const session: AgentSession = {
      id,
      agentId,
      taskId,
      command,
      pid,
      startedAt: new Date().toISOString(),
      status: "running",
      retryCount: 0,
    };
    this.activeSessions.set(id, session);
    this.stats.tasksDispatched++;
    logger.info("health", `Session started: ${id} (agent=${agentId}, task=${taskId || "scheduled"}, pid=${pid})`);
    this.flush();
    return id;
  }

  /**
   * Update the PID of an active session (set after spawn resolves).
   */
  updateSessionPid(sessionId: string, pid: number): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.pid = pid;
      logger.debug("health", `Session ${sessionId} PID updated to ${pid}`);
    }
  }

  endSession(
    sessionId: string,
    exitCode: number | null,
    error: string | null,
    timedOut: boolean,
    costUsd?: number | null,
    numTurns?: number | null,
    usage?: ClaudeUsage | null,
  ): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      logger.warn("health", `Attempted to end unknown session: ${sessionId}`);
      return;
    }

    this.activeSessions.delete(sessionId);

    const completedAt = new Date().toISOString();
    const startTime = new Date(session.startedAt).getTime();
    const durationMinutes = Math.round((Date.now() - startTime) / 60_000 * 100) / 100;

    const status = timedOut ? "timeout" : (exitCode === 0 ? "completed" : "failed");

    const historyEntry: SessionHistoryEntry = {
      ...session,
      completedAt,
      status,
      exitCode,
      error: error ? scrubCredentials(error).slice(0, 500) : null,
      durationMinutes,
      costUsd: costUsd ?? null,
      numTurns: numTurns ?? null,
      usage: usage ?? null,
    };

    this.history.unshift(historyEntry);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(0, MAX_HISTORY);
    }

    // Accumulate cost and usage stats
    if (costUsd != null && costUsd > 0) {
      this.stats.totalCostUsd += costUsd;
    }
    if (usage) {
      this.stats.totalInputTokens += usage.inputTokens || 0;
      this.stats.totalOutputTokens += usage.outputTokens || 0;
      this.stats.totalCacheReadTokens += usage.cacheReadInputTokens || 0;
      this.stats.totalCacheCreationTokens += usage.cacheCreationInputTokens || 0;
    }

    if (status === "completed") {
      this.stats.tasksCompleted++;
      const costStr = costUsd != null ? ` · $${costUsd.toFixed(4)}` : "";
      logger.info("health", `Session completed: ${sessionId} (${durationMinutes}min${costStr})`);
    } else {
      this.stats.tasksFailed++;
      logger.error("health", `Session ${status}: ${sessionId} (exit=${exitCode}, error=${error?.slice(0, 100) || "none"})`);
    }

    this.flush();
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  activeCount(): number {
    return this.activeSessions.size;
  }

  isTaskRunning(taskId: string): boolean {
    for (const session of this.activeSessions.values()) {
      if (session.taskId === taskId) return true;
    }
    return false;
  }

  isCommandRunning(command: string): boolean {
    for (const session of this.activeSessions.values()) {
      if (session.command === command) return true;
    }
    return false;
  }

  getSession(sessionId: string): AgentSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  getActiveSessions(): AgentSession[] {
    return Array.from(this.activeSessions.values());
  }

  getRetryCount(taskId: string): number {
    // Count how many times this task has been attempted in recent history
    return this.history.filter(h => h.taskId === taskId && h.status !== "completed").length;
  }

  // ─── Status Updates ────────────────────────────────────────────────────────

  setLastPollAt(timestamp: string): void {
    this.lastPollAt = timestamp;
  }

  setNextScheduledRun(command: string, nextRun: string): void {
    this.nextScheduledRuns[command] = nextRun;
  }

  updateUptime(): void {
    const startTime = new Date(this.startedAt).getTime();
    this.stats.uptimeMinutes = Math.round((Date.now() - startTime) / 60_000);
  }

  // ─── Stale Session Cleanup ─────────────────────────────────────────────────

  /**
   * Check all active sessions and mark any with dead PIDs as failed.
   * Called periodically (every minute) to proactively free up concurrency slots
   * instead of waiting for a GET request to /api/runs.
   */
  cleanStaleSessions(): void {
    for (const [id, session] of this.activeSessions) {
      // Skip sessions with PID 0 (just started, PID not yet assigned)
      if (session.pid <= 0) continue;

      if (!isProcessRunning(session.pid)) {
        logger.warn("health", `Stale session detected: ${id} (PID ${session.pid} is dead) — marking as failed`);
        this.endSession(id, 1, "Process died unexpectedly (detected by health check)", false);
      }
    }
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  private loadPersistedStats(): void {
    try {
      if (!existsSync(STATUS_FILE)) return;
      const raw = readFileSync(STATUS_FILE, "utf-8");
      const data = JSON.parse(raw) as DaemonStatus;
      // Carry over cumulative stats from previous run
      if (data.stats) {
        this.stats.tasksDispatched = data.stats.tasksDispatched || 0;
        this.stats.tasksCompleted = data.stats.tasksCompleted || 0;
        this.stats.tasksFailed = data.stats.tasksFailed || 0;
        this.stats.totalCostUsd = data.stats.totalCostUsd || 0;
        this.stats.totalInputTokens = data.stats.totalInputTokens || 0;
        this.stats.totalOutputTokens = data.stats.totalOutputTokens || 0;
        this.stats.totalCacheReadTokens = data.stats.totalCacheReadTokens || 0;
        this.stats.totalCacheCreationTokens = data.stats.totalCacheCreationTokens || 0;
      }
      if (data.history) {
        this.history = data.history.slice(0, MAX_HISTORY);
      }
    } catch {
      // Fresh start if status file is corrupted
    }
  }

  getStatus(): DaemonStatus {
    this.updateUptime();
    return {
      status: "running",
      pid: process.pid,
      startedAt: this.startedAt,
      activeSessions: this.getActiveSessions(),
      history: this.history,
      stats: { ...this.stats },
      lastPollAt: this.lastPollAt,
      nextScheduledRuns: { ...this.nextScheduledRuns },
    };
  }

  /**
   * Persist status to disk using atomic write (write tmp → rename).
   * This prevents corruption if the daemon is killed mid-write.
   */
  flush(): void {
    try {
      const status = this.getStatus();
      const tmp = STATUS_FILE + ".tmp";
      writeFileSync(tmp, JSON.stringify(status, null, 2), "utf-8");
      renameSync(tmp, STATUS_FILE);
    } catch (err) {
      logger.error("health", `Failed to write status file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Write a stopped status when the daemon shuts down.
   * Uses atomic write (write tmp → rename).
   */
  writeStoppedStatus(): void {
    this.updateUptime();
    const status: DaemonStatus = {
      status: "stopped",
      pid: null,
      startedAt: null,
      activeSessions: [],
      history: this.history,
      stats: { ...this.stats },
      lastPollAt: this.lastPollAt,
      nextScheduledRuns: {},
    };
    try {
      const tmp = STATUS_FILE + ".tmp";
      writeFileSync(tmp, JSON.stringify(status, null, 2), "utf-8");
      renameSync(tmp, STATUS_FILE);
    } catch {
      // Best effort
    }
  }
}
