import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { logger } from "./logger";
import type { DaemonConfig } from "./types";

const DATA_DIR = path.resolve(__dirname, "../../data");
const CONFIG_FILE = path.join(DATA_DIR, "daemon-config.json");

// ─── Default Configuration ───────────────────────────────────────────────────

const DEFAULT_CONFIG: DaemonConfig = {
  polling: {
    enabled: true,
    intervalMinutes: 5,
  },
  concurrency: {
    maxParallelAgents: 3,
  },
  schedule: {
    dailyPlan: { enabled: true, cron: "0 7 * * *", command: "daily-plan" },
    standup: { enabled: true, cron: "0 9 * * 1-5", command: "standup" },
    brainDumpTriage: { enabled: false, cron: "0 12 * * *", command: "daily-plan" },
    weeklyReview: { enabled: true, cron: "0 17 * * 5", command: "weekly-review" },
  },
  execution: {
    maxTurns: 25,
    timeoutMinutes: 30,
    retries: 1,
    retryDelayMinutes: 5,
    skipPermissions: false,
    allowedTools: ["Edit", "Write"],
    agentTeams: false,
    claudeBinaryPath: null,
    maxTaskContinuations: 2,
  },
  inbox: {
    maxContinuations: 2,
    maxTurnsPerSession: 25,
    timeoutPerSessionMinutes: 15,
  },
};

// ─── Validation ──────────────────────────────────────────────────────────────

function validateConfig(config: unknown): DaemonConfig {
  if (typeof config !== "object" || config === null) {
    throw new Error("Config must be an object");
  }

  const c = config as Record<string, unknown>;
  const result = { ...DEFAULT_CONFIG };

  // Merge polling
  if (c.polling && typeof c.polling === "object") {
    const p = c.polling as Record<string, unknown>;
    if (typeof p.enabled === "boolean") result.polling.enabled = p.enabled;
    if (typeof p.intervalMinutes === "number" && p.intervalMinutes >= 1 && p.intervalMinutes <= 60) {
      result.polling.intervalMinutes = p.intervalMinutes;
    }
  }

  // Merge concurrency
  if (c.concurrency && typeof c.concurrency === "object") {
    const con = c.concurrency as Record<string, unknown>;
    if (typeof con.maxParallelAgents === "number" && con.maxParallelAgents >= 1 && con.maxParallelAgents <= 10) {
      result.concurrency.maxParallelAgents = con.maxParallelAgents;
    }
  }

  // Merge schedule
  if (c.schedule && typeof c.schedule === "object") {
    const s = c.schedule as Record<string, unknown>;
    for (const [key, entry] of Object.entries(s)) {
      if (entry && typeof entry === "object") {
        const e = entry as Record<string, unknown>;
        if (typeof e.enabled === "boolean" && typeof e.cron === "string" && typeof e.command === "string") {
          result.schedule[key] = { enabled: e.enabled, cron: e.cron, command: e.command };
        }
      }
    }
  }

  // Merge execution
  if (c.execution && typeof c.execution === "object") {
    const ex = c.execution as Record<string, unknown>;
    if (typeof ex.maxTurns === "number" && ex.maxTurns >= 1 && ex.maxTurns <= 100) {
      result.execution.maxTurns = ex.maxTurns;
    }
    if (typeof ex.timeoutMinutes === "number" && ex.timeoutMinutes >= 1 && ex.timeoutMinutes <= 120) {
      result.execution.timeoutMinutes = ex.timeoutMinutes;
    }
    if (typeof ex.retries === "number" && ex.retries >= 0 && ex.retries <= 5) {
      result.execution.retries = ex.retries;
    }
    if (typeof ex.retryDelayMinutes === "number" && ex.retryDelayMinutes >= 1 && ex.retryDelayMinutes <= 30) {
      result.execution.retryDelayMinutes = ex.retryDelayMinutes;
    }
    if (typeof ex.skipPermissions === "boolean") {
      result.execution.skipPermissions = ex.skipPermissions;
    }
    if (Array.isArray(ex.allowedTools)) {
      const validTools = (ex.allowedTools as unknown[])
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .map(t => t.trim());
      result.execution.allowedTools = validTools;
    }
    if (typeof ex.agentTeams === "boolean") {
      result.execution.agentTeams = ex.agentTeams;
    }
    if (typeof ex.claudeBinaryPath === "string") {
      result.execution.claudeBinaryPath = ex.claudeBinaryPath;
    } else if (ex.claudeBinaryPath === null) {
      result.execution.claudeBinaryPath = null;
    }
    if (typeof ex.maxTaskContinuations === "number" && ex.maxTaskContinuations >= 0 && ex.maxTaskContinuations <= 5) {
      result.execution.maxTaskContinuations = ex.maxTaskContinuations;
    }
  }

  // Merge inbox
  if (c.inbox && typeof c.inbox === "object") {
    const inbox = c.inbox as Record<string, unknown>;
    if (typeof inbox.maxContinuations === "number" && inbox.maxContinuations >= 0 && inbox.maxContinuations <= 5) {
      result.inbox.maxContinuations = inbox.maxContinuations;
    }
    if (typeof inbox.maxTurnsPerSession === "number" && inbox.maxTurnsPerSession >= 5 && inbox.maxTurnsPerSession <= 100) {
      result.inbox.maxTurnsPerSession = inbox.maxTurnsPerSession;
    }
    if (typeof inbox.timeoutPerSessionMinutes === "number" && inbox.timeoutPerSessionMinutes >= 5 && inbox.timeoutPerSessionMinutes <= 60) {
      result.inbox.timeoutPerSessionMinutes = inbox.timeoutPerSessionMinutes;
    }
  }

  return result;
}

// ─── Load / Save ─────────────────────────────────────────────────────────────

export function loadConfig(): DaemonConfig {
  try {
    if (!existsSync(CONFIG_FILE)) {
      logger.info("config", "No config file found, creating with defaults");
      saveConfig(DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG };
    }

    const raw = readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const config = validateConfig(parsed);

    // Security warning for skipPermissions
    if (config.execution.skipPermissions) {
      logger.security("config", "⚠ skipPermissions is ENABLED — Claude Code will bypass all permission prompts");
    } else if (config.execution.allowedTools.length > 0) {
      logger.info("config", `Allowed tools: ${config.execution.allowedTools.join(", ")}`);
    }

    return config;
  } catch (err) {
    logger.error("config", `Failed to load config: ${err instanceof Error ? err.message : String(err)}`);
    logger.info("config", "Using default configuration");
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: DaemonConfig): void {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
