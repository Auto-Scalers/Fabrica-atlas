#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import path from "path";
import { logger } from "./logger";
import { loadConfig } from "./config";
import { HealthMonitor } from "./health";
import { AgentRunner } from "./runner";
import { Dispatcher } from "./dispatcher";
import { Scheduler } from "./scheduler";

// ─── Constants ───────────────────────────────────────────────────────────────

const DATA_DIR = path.resolve(__dirname, "../../data");
const PID_FILE = path.join(DATA_DIR, "daemon.pid");
const STATUS_FILE = path.join(DATA_DIR, "daemon-status.json");

// ─── PID File Management ─────────────────────────────────────────────────────

function writePidFile(): void {
  writeFileSync(PID_FILE, String(process.pid), "utf-8");
}

function readPidFile(): number | null {
  try {
    if (!existsSync(PID_FILE)) return null;
    const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim());
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

function removePidFile(): void {
  try {
    if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
  } catch {
    // Best effort
  }
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0); // Signal 0 = check if process exists
    return true;
  } catch {
    return false;
  }
}

// ─── Commands ────────────────────────────────────────────────────────────────

function handleStatus(): void {
  const pid = readPidFile();
  if (pid && isProcessRunning(pid)) {
    try {
      const status = JSON.parse(readFileSync(STATUS_FILE, "utf-8"));
      console.log("\n=== Mission Control Agent Daemon ===");
      console.log(`Status:  \x1b[32mRunning\x1b[0m`);
      console.log(`PID:     ${pid}`);
      console.log(`Started: ${status.startedAt || "unknown"}`);
      console.log(`Uptime:  ${status.stats?.uptimeMinutes || 0} minutes`);
      console.log(`Active:  ${status.activeSessions?.length || 0} session(s)`);
      console.log(`Stats:   ${status.stats?.tasksCompleted || 0} completed, ${status.stats?.tasksFailed || 0} failed`);
      console.log(`Last:    ${status.lastPollAt || "never polled"}`);
      console.log("");
    } catch {
      console.log(`\nDaemon is running (PID: ${pid}) but status file is unreadable.\n`);
    }
  } else {
    if (pid) removePidFile(); // Clean stale PID file
    console.log("\n=== Mission Control Agent Daemon ===");
    console.log(`Status:  \x1b[31mStopped\x1b[0m`);
    console.log("");
  }
}

function handleStop(): void {
  const pid = readPidFile();
  if (!pid) {
    console.log("Daemon is not running (no PID file).");
    return;
  }

  if (!isProcessRunning(pid)) {
    console.log("Daemon is not running (stale PID file). Cleaning up.");
    removePidFile();
    return;
  }

  console.log(`Stopping daemon (PID: ${pid})...`);
  try {
    process.kill(pid, "SIGTERM");
    console.log("Stop signal sent. Daemon will shut down gracefully.");
  } catch (err) {
    console.error(`Failed to stop daemon: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function handleStart(): Promise<void> {
  // Check for existing instance
  const existingPid = readPidFile();
  if (existingPid && isProcessRunning(existingPid)) {
    console.error(`Daemon is already running (PID: ${existingPid}). Use "stop" first.`);
    process.exit(1);
  }

  // Clean stale PID file
  if (existingPid) removePidFile();

  console.log("\n=== Mission Control Agent Daemon ===\n");

  // Load configuration
  const config = loadConfig();

  // Security warnings
  if (config.execution.skipPermissions) {
    logger.security("daemon", "============================================================");
    logger.security("daemon", "⚠  skipPermissions is ENABLED");
    logger.security("daemon", "   Claude Code will bypass ALL permission prompts.");
    logger.security("daemon", "   Only use this in trusted, isolated environments.");
    logger.security("daemon", "============================================================");
  } else if (config.execution.allowedTools.length > 0) {
    logger.info("daemon", `Allowed tools: ${config.execution.allowedTools.join(", ")}`);
  }

  // Initialize components
  const health = new HealthMonitor();
  const runner = new AgentRunner();
  const dispatcher = new Dispatcher(config, runner, health);
  const scheduler = new Scheduler(config, dispatcher, health);

  // Write PID file
  writePidFile();
  logger.info("daemon", `Daemon started (PID: ${process.pid})`);

  // Start scheduler
  scheduler.start();

  // Run initial poll immediately
  if (config.polling.enabled) {
    logger.info("daemon", "Running initial task poll...");
    await dispatcher.pollAndDispatch();
  }

  // Flush status
  health.flush();

  logger.info("daemon", "Daemon is running. Press Ctrl+C to stop.");
  logger.info("daemon", `Config: polling=${config.polling.enabled} (every ${config.polling.intervalMinutes}min), concurrency=${config.concurrency.maxParallelAgents}, maxTurns=${config.execution.maxTurns}, timeout=${config.execution.timeoutMinutes}min, allowedTools=[${config.execution.allowedTools.join(",")}]`);

  // ─── Graceful Shutdown ──────────────────────────────────────────────────

  let shuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info("daemon", `Received ${signal} — shutting down gracefully...`);

    // Stop scheduler (no new dispatches)
    scheduler.stop();

    // Kill active sessions
    const activeSessions = health.getActiveSessions();
    if (activeSessions.length > 0) {
      logger.info("daemon", `Killing ${activeSessions.length} active session(s)...`);
      for (const session of activeSessions) {
        if (session.pid > 0) {
          await runner.killSession(session.pid);
        }
        health.endSession(session.id, null, "Daemon shutdown", false);
      }
    }

    // Write stopped status
    health.writeStoppedStatus();

    // Remove PID file
    removePidFile();

    logger.info("daemon", "Daemon stopped.");
    process.exit(0);
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Keep process alive + periodic maintenance
  // The scheduler's cron jobs keep the event loop active,
  // but we add a safety interval for uptime tracking + stale session cleanup
  setInterval(() => {
    health.cleanStaleSessions(); // Proactively detect dead PIDs
    health.updateUptime();
    health.flush();
  }, 60_000); // Every minute
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────

const command = process.argv[2] || "start";

switch (command) {
  case "start":
    handleStart().catch(err => {
      logger.error("daemon", `Fatal error: ${err instanceof Error ? err.message : String(err)}`);
      removePidFile();
      process.exit(1);
    });
    break;

  case "stop":
    handleStop();
    break;

  case "status":
    handleStatus();
    break;

  default:
    console.log("Usage: npx tsx scripts/daemon/index.ts [start|stop|status]");
    console.log("");
    console.log("Commands:");
    console.log("  start   Start the daemon (default)");
    console.log("  stop    Stop a running daemon");
    console.log("  status  Show daemon status");
    process.exit(1);
}
