import { readFileSync, writeFileSync, renameSync, existsSync } from "fs";
import { spawn } from "child_process";
import path from "path";
import { logger } from "./logger";
import { AgentRunner, parseClaudeOutput } from "./runner";
import { HealthMonitor } from "./health";
import { buildTaskPrompt, buildScheduledPrompt, getPendingTasks, isTaskUnblocked, hasPendingDecision } from "./prompt-builder";
import type { DaemonConfig, ProjectRunsFile } from "./types";

const DATA_DIR = path.resolve(__dirname, "../../data");
const FIELD_OPS_DIR = path.join(DATA_DIR, "field-ops");
const MISSIONS_FILE = path.join(DATA_DIR, "missions.json");
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");
const ACTIVE_RUNS_FILE = path.join(DATA_DIR, "active-runs.json");
const DECISIONS_FILE = path.join(DATA_DIR, "decisions.json");
const WORKSPACE_ROOT = path.resolve(__dirname, "../../..");
const RETRY_QUEUE_FILE = path.join(DATA_DIR, "daemon-retry-queue.json");
const MAX_RETRY_DELAY_MINUTES = 60;
const FIELD_OPS_EXECUTE_URL = "http://localhost:3000/api/field-ops/execute";

// ─── Retry Queue ────────────────────────────────────────────────────────────

interface RetryEntry {
  taskId: string;
  agentId: string;
  retryAt: string;    // ISO timestamp — when this retry becomes eligible
  attempt: number;    // 1-based attempt number (1 = first retry)
  failedAt: string;   // ISO timestamp — when the failure occurred
  error: string | null;
}

// ─── Task Dispatcher ─────────────────────────────────────────────────────────

export class Dispatcher {
  private config: DaemonConfig;
  private runner: AgentRunner;
  private health: HealthMonitor;
  private retryQueue: RetryEntry[] = [];
  private fieldOpsInFlight: Set<string> = new Set();

  constructor(config: DaemonConfig, runner: AgentRunner, health: HealthMonitor) {
    this.config = config;
    this.runner = runner;
    this.health = health;
    this.loadRetryQueue();
  }

  updateConfig(config: DaemonConfig): void {
    this.config = config;
  }

  // ─── Retry Queue Persistence ────────────────────────────────────────────

  private loadRetryQueue(): void {
    try {
      if (!existsSync(RETRY_QUEUE_FILE)) return;
      const raw = readFileSync(RETRY_QUEUE_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        this.retryQueue = data;
        logger.info("dispatcher", `Loaded ${data.length} pending retry(ies) from disk`);
      }
    } catch {
      logger.warn("dispatcher", "Failed to load retry queue — starting fresh");
      this.retryQueue = [];
    }
  }

  private saveRetryQueue(): void {
    try {
      const tmp = RETRY_QUEUE_FILE + ".tmp";
      writeFileSync(tmp, JSON.stringify(this.retryQueue, null, 2), "utf-8");
      renameSync(tmp, RETRY_QUEUE_FILE);
    } catch (err) {
      logger.error("dispatcher", `Failed to persist retry queue: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Calculate retry delay with exponential backoff.
   * delay = retryDelayMinutes * 2^(attempt-1), capped at MAX_RETRY_DELAY_MINUTES
   */
  private getRetryDelayMinutes(attempt: number): number {
    const base = this.config.execution.retryDelayMinutes;
    return Math.min(base * Math.pow(2, attempt - 1), MAX_RETRY_DELAY_MINUTES);
  }

  // ─── Polling ────────────────────────────────────────────────────────────

  /**
   * Poll for pending tasks and dispatch them to agents.
   * Also processes due retries from the persistent queue.
   * Called on each polling interval.
   */
  async pollAndDispatch(): Promise<void> {
    logger.info("dispatcher", "Polling for pending tasks...");
    this.health.setLastPollAt(new Date().toISOString());

    try {
      // 1. Process due retries first (they have higher priority — already started once)
      await this.processDueRetries();

      // 2. Get pending tasks sorted by Eisenhower priority
      const pendingTasks = getPendingTasks();

      if (pendingTasks.length === 0) {
        logger.debug("dispatcher", "No pending tasks to dispatch");
        return;
      }

      logger.info("dispatcher", `Found ${pendingTasks.length} pending task(s)`);

      // 3. Filter to dispatchable tasks
      const dispatchable = pendingTasks.filter(task => {
        // Already running?
        if (this.health.isTaskRunning(task.id)) {
          logger.debug("dispatcher", `Skipping ${task.id} — already running`);
          return false;
        }

        // Already in retry queue?
        if (this.retryQueue.some(r => r.taskId === task.id)) {
          logger.debug("dispatcher", `Skipping ${task.id} — in retry queue`);
          return false;
        }

        // Blocked by dependencies?
        const taskWithBlockedBy = task as typeof task & { blockedBy: string[] };
        if (!isTaskUnblocked(taskWithBlockedBy)) {
          logger.debug("dispatcher", `Skipping ${task.id} — blocked by dependencies`);
          return false;
        }

        // Has pending decision?
        if (hasPendingDecision(task.id)) {
          logger.debug("dispatcher", `Skipping ${task.id} — waiting for decision`);
          return false;
        }

        // Exceeded retry limit?
        const retryCount = this.health.getRetryCount(task.id);
        if (retryCount >= this.config.execution.retries + 1) {
          logger.warn("dispatcher", `Skipping ${task.id} — exceeded retry limit (${retryCount} attempts)`);
          return false;
        }

        return true;
      });

      if (dispatchable.length === 0) {
        logger.debug("dispatcher", "No dispatchable tasks (all blocked, running, or at retry limit)");
        return;
      }

      // 4. Dispatch up to concurrency limit
      const availableSlots = this.config.concurrency.maxParallelAgents - this.health.activeCount();
      if (availableSlots <= 0) {
        logger.info("dispatcher", `No available slots (${this.health.activeCount()}/${this.config.concurrency.maxParallelAgents} agents running)`);
        return;
      }

      const toDispatch = dispatchable.slice(0, availableSlots);

      for (const task of toDispatch) {
        this.dispatchTask(task.id, task.assignedTo!);
      }
    } catch (err) {
      logger.error("dispatcher", `Poll error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Also check for running/stalled project runs that need continuation
    this.pollProjectRuns();

    // Auto-execute approved field ops tasks
    this.pollFieldOps();
  }

  /**
   * Process retry entries that are due (retryAt <= now).
   */
  private async processDueRetries(): Promise<void> {
    if (this.retryQueue.length === 0) return;

    const now = new Date();
    const dueRetries: RetryEntry[] = [];
    const remaining: RetryEntry[] = [];

    for (const entry of this.retryQueue) {
      if (new Date(entry.retryAt) <= now) {
        dueRetries.push(entry);
      } else {
        remaining.push(entry);
      }
    }

    if (dueRetries.length === 0) return;

    // Check available concurrency slots
    const availableSlots = this.config.concurrency.maxParallelAgents - this.health.activeCount();
    const toRetry = dueRetries.slice(0, Math.max(0, availableSlots));
    const deferred = dueRetries.slice(Math.max(0, availableSlots));

    // Update queue: remove retries we're about to dispatch
    this.retryQueue = [...remaining, ...deferred];
    this.saveRetryQueue();

    for (const entry of toRetry) {
      logger.info("dispatcher", `Retrying task ${entry.taskId} (attempt ${entry.attempt + 1}, agent=${entry.agentId})`);
      this.dispatchTask(entry.taskId, entry.agentId);
    }

    if (deferred.length > 0) {
      logger.info("dispatcher", `${deferred.length} due retry(ies) deferred — no concurrency slots available`);
    }
  }

  /**
   * Dispatch a single task to its assigned agent.
   */
  private async dispatchTask(taskId: string, agentId: string): Promise<void> {
    try {
      logger.info("dispatcher", `Dispatching task ${taskId} to agent "${agentId}"`);

      // Build task data for prompt (re-read to get fresh state)
      const { getTask } = await import("./prompt-builder");
      const task = getTask(taskId);
      if (!task) {
        logger.error("dispatcher", `Task ${taskId} not found`);
        return;
      }

      const prompt = buildTaskPrompt(agentId, task);

      // Start tracking the session
      const sessionId = this.health.startSession(agentId, taskId, "task", 0);

      // Spawn the Claude Code process
      const spawnPromise = this.runner.spawnAgent({
        prompt,
        maxTurns: this.config.execution.maxTurns,
        timeoutMinutes: this.config.execution.timeoutMinutes,
        skipPermissions: this.config.execution.skipPermissions,
        allowedTools: this.config.execution.allowedTools,
        cwd: "", // Uses runner default (workspace root)
      });

      // Handle completion asynchronously
      spawnPromise.then(result => {
        // Update session PID if we got one
        if (result.pid > 0) {
          this.health.updateSessionPid(sessionId, result.pid);
        }

        // Parse cost/usage from Claude Code output
        const meta = parseClaudeOutput(result.stdout);

        this.health.endSession(
          sessionId,
          result.exitCode,
          result.stderr || null,
          result.timedOut,
          meta.totalCostUsd,
          meta.numTurns,
          meta.usage,
        );

        if (result.exitCode === 0 && !result.timedOut) {
          logger.info("dispatcher", `Task ${taskId} completed successfully by ${agentId}`);
        } else {
          this.handleFailure(taskId, agentId, result);
        }
      }).catch(err => {
        this.health.endSession(sessionId, 1, err instanceof Error ? err.message : String(err), false);
        logger.error("dispatcher", `Dispatch error for ${taskId}: ${err instanceof Error ? err.message : String(err)}`);
      });

    } catch (err) {
      logger.error("dispatcher", `Failed to dispatch task ${taskId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Handle a failed task execution.
   * Pushes to the persistent retry queue with exponential backoff instead of setTimeout.
   */
  private handleFailure(
    taskId: string,
    agentId: string,
    result: { exitCode: number | null; stderr: string; timedOut: boolean }
  ): void {
    const retryCount = this.health.getRetryCount(taskId);

    if (retryCount < this.config.execution.retries) {
      const attempt = retryCount + 1;
      const delayMinutes = this.getRetryDelayMinutes(attempt);
      const retryAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

      logger.warn("dispatcher", `Task ${taskId} failed (attempt ${attempt}/${this.config.execution.retries + 1}), scheduling retry at ${retryAt} (${delayMinutes} min delay)`);

      // Remove any existing entry for this task (shouldn't happen, but be safe)
      this.retryQueue = this.retryQueue.filter(r => r.taskId !== taskId);

      this.retryQueue.push({
        taskId,
        agentId,
        retryAt,
        attempt,
        failedAt: new Date().toISOString(),
        error: result.stderr?.slice(0, 500) || null,
      });

      this.saveRetryQueue();
    } else {
      logger.error("dispatcher", `Task ${taskId} permanently failed after ${retryCount + 1} attempts`);

      // Clean up any stale retry entries for this task
      const hadEntry = this.retryQueue.some(r => r.taskId === taskId);
      if (hadEntry) {
        this.retryQueue = this.retryQueue.filter(r => r.taskId !== taskId);
        this.saveRetryQueue();
      }
    }
  }

  // ─── Project Run Continuation ───────────────────────────────────────────

  /**
   * Poll for running/stalled project runs that have dispatchable tasks but no
   * live processes. Acts as a daemon-level safety net for chain dispatch.
   */
  private pollProjectRuns(): void {
    try {
      if (!existsSync(MISSIONS_FILE)) return;
      const runsFileData: ProjectRunsFile = JSON.parse(readFileSync(MISSIONS_FILE, "utf-8"));

      const activeRuns = runsFileData.missions.filter(
        (m) => m.status === "running" || m.status === "stalled"
      );
      if (activeRuns.length === 0) return;

      // Read state
      const tasksRaw = existsSync(TASKS_FILE) ? readFileSync(TASKS_FILE, "utf-8") : '{"tasks":[]}';
      const tasksData = JSON.parse(tasksRaw) as { tasks: Array<Record<string, unknown>> };
      const runsRaw = existsSync(ACTIVE_RUNS_FILE) ? readFileSync(ACTIVE_RUNS_FILE, "utf-8") : '{"runs":[]}';
      const runsData = JSON.parse(runsRaw) as { runs: Array<{ taskId: string; missionId: string | null; pid: number; status: string }> };
      const decisionsRaw = existsSync(DECISIONS_FILE) ? readFileSync(DECISIONS_FILE, "utf-8") : '{"decisions":[]}';
      const decisionsData = JSON.parse(decisionsRaw) as { decisions: Array<{ taskId: string | null; status: string }> };

      const pendingDecisionTaskIds = new Set(
        decisionsData.decisions
          .filter((d) => d.status === "pending" && d.taskId)
          .map((d) => d.taskId as string)
      );

      // Check which runs are actually alive
      const liveRunningTaskIds = new Set<string>();
      let liveRunningCount = 0;
      for (const run of runsData.runs) {
        if (run.status === "running") {
          let alive = run.pid <= 0;
          if (!alive) {
            try { process.kill(run.pid, 0); alive = true; } catch { alive = false; }
          }
          if (alive) {
            liveRunningTaskIds.add(run.taskId);
            liveRunningCount++;
          }
        }
      }

      let changed = false;

      for (const projectRun of activeRuns) {
        // Check if this project run has live processes
        const projectRunProcesses = runsData.runs.filter(
          (r) => r.missionId === projectRun.id && r.status === "running"
        );
        const hasLiveProcesses = projectRunProcesses.some((r) => {
          if (r.pid <= 0) return true;
          try { process.kill(r.pid, 0); return true; } catch { return false; }
        });

        if (hasLiveProcesses) continue;

        // No live processes — find dispatchable tasks
        const projectTasks = tasksData.tasks.filter((t) => t.projectId === projectRun.projectId);
        const remaining = projectTasks.filter(
          (t) => t.kanban !== "done" && t.assignedTo && t.assignedTo !== "me" && !t.deletedAt
        );

        if (remaining.length === 0) {
          projectRun.status = "completed";
          projectRun.completedAt = new Date().toISOString();
          changed = true;
          continue;
        }

        const dispatchable = remaining.filter((t) => {
          const tid = t.id as string;
          if (liveRunningTaskIds.has(tid)) return false;
          const blocked = (t.blockedBy as string[] | undefined) ?? [];
          if (blocked.length > 0) {
            const allDone = blocked.every((depId) => {
              const dep = tasksData.tasks.find((d) => d.id === depId);
              return (dep as Record<string, unknown> | undefined)?.kanban === "done";
            });
            if (!allDone) return false;
          }
          if (pendingDecisionTaskIds.has(tid)) return false;
          const attempts = projectRun.loopDetection?.taskAttempts?.[tid] ?? 0;
          if (attempts >= 3) return false;
          return true;
        });

        if (dispatchable.length > 0) {
          const slotsAvailable = Math.max(0, this.config.concurrency.maxParallelAgents - liveRunningCount);
          const toSpawn = dispatchable.slice(0, slotsAvailable);

          if (toSpawn.length > 0) {
            // Revive stalled project runs
            if (projectRun.status === "stalled") {
              projectRun.status = "running";
              changed = true;
            }

            const scriptPath = path.resolve(__dirname, "run-task.ts");
            for (const task of toSpawn) {
              const args = [
                "--import", "tsx",
                scriptPath,
                task.id as string,
                "--source", "project-run-chain",
                "--mission", projectRun.id,
              ];
              if (this.config.execution.agentTeams) {
                args.push("--agent-teams");
              }
              try {
                const child = spawn(process.execPath, args, {
                  cwd: WORKSPACE_ROOT,
                  detached: true,
                  stdio: "ignore",
                  shell: false,
                });
                child.unref();
                logger.info("dispatcher", `ProjectRun ${projectRun.id}: re-dispatched task ${task.id} (pid: ${child.pid})`);
              } catch (err) {
                logger.error("dispatcher", `ProjectRun ${projectRun.id}: failed to re-dispatch task ${task.id}: ${err instanceof Error ? err.message : String(err)}`);
              }
            }
          }
        }
      }

      if (changed) {
        writeFileSync(MISSIONS_FILE, JSON.stringify(runsFileData, null, 2), "utf-8");
      }
    } catch (err) {
      logger.error("dispatcher", `Project run poll error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ─── Field Ops Auto-Execution ─────────────────────────────────────────

  /**
   * Poll for approved field ops tasks and auto-execute them via the HTTP API.
   *
   * Safety constraints:
   * - Only runs if fieldOps.autoExecute is true (opt-in)
   * - Respects maxConcurrentExecutions limit
   * - If requireVaultSession is true, checks vault is unlocked first
   * - Calls the existing execute API (preserves all security: mutex, state machine, circuit breaker)
   */
  private async pollFieldOps(): Promise<void> {
    const fieldOpsConfig = this.config.fieldOps;
    if (!fieldOpsConfig?.autoExecute) return;

    try {
      // Read field tasks
      const tasksFile = path.join(FIELD_OPS_DIR, "tasks.json");
      if (!existsSync(tasksFile)) return;

      interface FieldTaskEntry {
        id: string;
        title: string;
        status: string;
        scheduledFor?: string;
      }

      const raw = readFileSync(tasksFile, "utf-8");
      const data = JSON.parse(raw) as { tasks: FieldTaskEntry[] };

      // Filter for approved tasks that aren't already in-flight
      const now = new Date();
      const approved = data.tasks.filter(t => {
        if (t.status !== "approved") return false;
        if (this.fieldOpsInFlight.has(t.id)) return false;
        // Phase 5d: respect scheduledFor
        if (t.scheduledFor && new Date(t.scheduledFor) > now) return false;
        return true;
      });

      if (approved.length === 0) return;

      // Check vault session if required
      if (fieldOpsConfig.requireVaultSession) {
        try {
          const vaultRes = await fetch("http://localhost:3000/api/field-ops/vault/session");
          if (!vaultRes.ok) {
            logger.debug("dispatcher", "Field Ops: vault session check failed, skipping auto-execution");
            return;
          }
          const vaultData = await vaultRes.json() as { active: boolean };
          if (!vaultData.active) {
            logger.debug("dispatcher", "Field Ops: vault locked, skipping auto-execution");
            return;
          }
        } catch {
          logger.debug("dispatcher", "Field Ops: cannot reach server for vault check, skipping");
          return;
        }
      }

      // Respect concurrency limit
      const availableSlots = fieldOpsConfig.maxConcurrentExecutions - this.fieldOpsInFlight.size;
      if (availableSlots <= 0) {
        logger.debug("dispatcher", `Field Ops: no execution slots (${this.fieldOpsInFlight.size}/${fieldOpsConfig.maxConcurrentExecutions} in-flight)`);
        return;
      }

      const toExecute = approved.slice(0, availableSlots);
      logger.info("dispatcher", `Field Ops: auto-executing ${toExecute.length} approved task(s)`);

      for (const task of toExecute) {
        this.executeFieldTask(task.id, task.title);
      }
    } catch (err) {
      logger.error("dispatcher", `Field Ops poll error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Execute a single field task via the HTTP API.
   * Tracks in-flight state and logs results.
   */
  private async executeFieldTask(taskId: string, title: string): Promise<void> {
    this.fieldOpsInFlight.add(taskId);

    try {
      logger.info("dispatcher", `Field Ops: executing "${title}" (${taskId})`);

      const res = await fetch(FIELD_OPS_EXECUTE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, actor: "daemon" }),
      });

      const result = await res.json() as { status?: string; error?: string };

      if (res.ok && result.status === "completed") {
        logger.info("dispatcher", `Field Ops: "${title}" completed successfully`);
      } else if (res.ok && result.status === "executing") {
        logger.info("dispatcher", `Field Ops: "${title}" moved to manual execution (no adapter)`);
      } else {
        logger.warn("dispatcher", `Field Ops: "${title}" failed — ${result.error ?? `HTTP ${res.status}`}`);
      }
    } catch (err) {
      logger.error("dispatcher", `Field Ops: execute error for "${title}": ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.fieldOpsInFlight.delete(taskId);
    }
  }

  // ─── Scheduled Commands ─────────────────────────────────────────────────

  /**
   * Run a scheduled command (daily-plan, standup, etc.)
   */
  async runScheduledCommand(command: string): Promise<void> {
    if (this.health.isCommandRunning(command)) {
      logger.info("dispatcher", `Scheduled command "/${command}" already running, skipping`);
      return;
    }

    const availableSlots = this.config.concurrency.maxParallelAgents - this.health.activeCount();
    if (availableSlots <= 0) {
      logger.info("dispatcher", `No slots available for scheduled command "/${command}"`);
      return;
    }

    logger.info("dispatcher", `Running scheduled command: /${command}`);

    const prompt = buildScheduledPrompt(command);

    const sessionId = this.health.startSession("system", null, command, 0);

    try {
      const result = await this.runner.spawnAgent({
        prompt,
        maxTurns: this.config.execution.maxTurns,
        timeoutMinutes: this.config.execution.timeoutMinutes,
        skipPermissions: this.config.execution.skipPermissions,
        allowedTools: this.config.execution.allowedTools,
        cwd: "",
      });

      // Parse cost/usage from Claude Code output
      const meta = parseClaudeOutput(result.stdout);
      this.health.endSession(sessionId, result.exitCode, result.stderr || null, result.timedOut, meta.totalCostUsd, meta.numTurns, meta.usage);

      if (result.exitCode === 0) {
        logger.info("dispatcher", `Scheduled command "/${command}" completed successfully`);
      } else {
        logger.error("dispatcher", `Scheduled command "/${command}" failed (exit=${result.exitCode})`);
      }
    } catch (err) {
      this.health.endSession(sessionId, 1, err instanceof Error ? err.message : String(err), false);
      logger.error("dispatcher", `Scheduled command "/${command}" error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
