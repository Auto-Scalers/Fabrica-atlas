import { describe, it, expect } from "vitest";

// ─── Security Module Tests ──────────────────────────────────────────────────

// Import security functions directly (they're pure functions, no side effects)
import {
  scrubCredentials,
  validatePathWithinWorkspace,
  fenceTaskData,
  enforcePromptLimit,
  validateBinary,
  buildSafeEnv,
} from "../scripts/daemon/security";

describe("scrubCredentials", () => {
  it("redacts sk- style API keys", () => {
    const input = "Using key sk-abc123def456ghi789jkl012mno345";
    const result = scrubCredentials(input);
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("sk-abc123def456ghi789jkl012mno345");
  });

  it("redacts Bearer tokens", () => {
    const input = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature";
    const result = scrubCredentials(input);
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
  });

  it("redacts GitHub tokens", () => {
    const input = "GITHUB_TOKEN=ghp_" + "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklm";
    const result = scrubCredentials(input);
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("ghp_");
  });

  it("redacts npm tokens", () => {
    const input = "token=npm_" + "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop";
    const result = scrubCredentials(input);
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("npm_");
  });

  it("redacts password patterns", () => {
    const input = "password: mysecretpass123";
    const result = scrubCredentials(input);
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("mysecretpass123");
  });

  it("redacts AWS-style keys", () => {
    const input = "aws_key=AKIA" + "IOSFODNN7EXAMPLE";
    const result = scrubCredentials(input);
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("AKIA" + "IOSFODNN7EXAMPLE");
  });

  it("leaves normal text unchanged", () => {
    const input = "Task completed successfully for project_123";
    const result = scrubCredentials(input);
    expect(result).toBe(input);
  });

  it("handles multiple credentials in one string", () => {
    const input = "key: sk-abcdefghijklmnopqrstuvwxyz and password: secret123";
    const result = scrubCredentials(input);
    expect(result).not.toContain("sk-abcdefghijklmnopqrstuvwxyz");
    expect(result).not.toContain("secret123");
  });
});

describe("validatePathWithinWorkspace", () => {
  it("accepts paths within workspace root", () => {
    expect(validatePathWithinWorkspace("data/tasks.json", "/workspace")).toBe(true);
  });

  it("accepts the workspace root itself", () => {
    expect(validatePathWithinWorkspace(".", "/workspace")).toBe(true);
  });

  it("rejects path traversal with ../", () => {
    expect(validatePathWithinWorkspace("../../etc/passwd", "/workspace")).toBe(false);
  });

  it("rejects absolute paths outside workspace", () => {
    expect(validatePathWithinWorkspace("/etc/passwd", "/workspace")).toBe(false);
  });

  it("accepts nested subdirectories", () => {
    expect(validatePathWithinWorkspace("data/sub/file.json", "/workspace")).toBe(true);
  });
});

describe("fenceTaskData", () => {
  it("wraps task data in <task-context> delimiters", () => {
    const data = "Task title: Build feature X";
    const result = fenceTaskData(data);
    expect(result).toBe("<task-context>\nTask title: Build feature X\n</task-context>");
  });

  it("preserves multi-line content", () => {
    const data = "Line 1\nLine 2\nLine 3";
    const result = fenceTaskData(data);
    expect(result).toContain("Line 1\nLine 2\nLine 3");
    expect(result).toMatch(/^<task-context>/);
    expect(result).toMatch(/<\/task-context>$/);
  });
});

describe("enforcePromptLimit", () => {
  it("passes through short prompts unchanged", () => {
    const prompt = "Hello, world!";
    expect(enforcePromptLimit(prompt)).toBe(prompt);
  });

  it("truncates prompts exceeding 100KB", () => {
    const longPrompt = "x".repeat(200_000);
    const result = enforcePromptLimit(longPrompt);
    expect(result.length).toBeLessThan(longPrompt.length);
    expect(result).toContain("[PROMPT TRUNCATED");
  });

  it("preserves prompts at exactly 100KB", () => {
    const exactPrompt = "x".repeat(100_000);
    const result = enforcePromptLimit(exactPrompt);
    expect(result).toBe(exactPrompt);
  });
});

describe("validateBinary", () => {
  it("allows 'claude'", () => {
    expect(validateBinary("claude")).toBe(true);
  });

  it("allows 'claude.cmd' (Windows)", () => {
    expect(validateBinary("claude.cmd")).toBe(true);
  });

  it("allows 'claude.exe' (Windows)", () => {
    expect(validateBinary("claude.exe")).toBe(true);
  });

  it("rejects arbitrary binaries", () => {
    expect(validateBinary("node")).toBe(false);
    expect(validateBinary("bash")).toBe(false);
    expect(validateBinary("rm")).toBe(false);
    expect(validateBinary("python")).toBe(false);
  });

  it("extracts basename from full paths", () => {
    expect(validateBinary("/usr/local/bin/claude")).toBe(true);
    expect(validateBinary("/some/path/to/claude.exe")).toBe(true);
    expect(validateBinary("/usr/local/bin/node")).toBe(false);
  });
});

describe("buildSafeEnv", () => {
  it("returns an object with only safe keys", () => {
    const env = buildSafeEnv();
    const keys = Object.keys(env);

    // Should only contain safe keys
    const allowedKeys = [
      "PATH", "Path", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "TEMP", "TMP",
      // Windows system vars (only present on win32)
      "SystemRoot", "SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT",
      // Agent Teams flag
      "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS",
      // OAuth token (passed through for child agent auth)
      "CLAUDE_CODE_OAUTH_TOKEN",
    ];
    for (const key of keys) {
      expect(allowedKeys).toContain(key);
    }
  });

  it("does not include sensitive env vars", () => {
    // Temporarily set a sensitive env var
    const originalApiKey = process.env.API_KEY;
    process.env.API_KEY = "secret-key";

    const env = buildSafeEnv();
    expect(env).not.toHaveProperty("API_KEY");

    // Clean up
    if (originalApiKey === undefined) {
      delete process.env.API_KEY;
    } else {
      process.env.API_KEY = originalApiKey;
    }
  });
});

// ─── Config Validation Tests ────────────────────────────────────────────────

import { loadConfig } from "../scripts/daemon/config";

describe("loadConfig", () => {
  it("returns a valid config object", () => {
    const config = loadConfig();
    expect(config).toHaveProperty("polling");
    expect(config).toHaveProperty("concurrency");
    expect(config).toHaveProperty("schedule");
    expect(config).toHaveProperty("execution");
  });

  it("has correct polling defaults", () => {
    const config = loadConfig();
    expect(config.polling.enabled).toBe(true);
    expect(config.polling.intervalMinutes).toBeGreaterThanOrEqual(1);
    expect(config.polling.intervalMinutes).toBeLessThanOrEqual(60);
  });

  it("has correct concurrency defaults", () => {
    const config = loadConfig();
    expect(config.concurrency.maxParallelAgents).toBeGreaterThanOrEqual(1);
    expect(config.concurrency.maxParallelAgents).toBeLessThanOrEqual(10);
  });

  it("has correct execution defaults", () => {
    const config = loadConfig();
    expect(config.execution.maxTurns).toBeGreaterThanOrEqual(1);
    expect(config.execution.timeoutMinutes).toBeGreaterThanOrEqual(1);
    expect(config.execution.retries).toBeGreaterThanOrEqual(0);
    expect(config.execution.skipPermissions).toBe(false);
    expect(Array.isArray(config.execution.allowedTools)).toBe(true);
    expect(config.execution.allowedTools).toEqual(["Edit", "Write", "Read", "Glob", "Grep", "Bash", "WebSearch", "WebFetch"]);
  });

  it("has at least one schedule entry", () => {
    const config = loadConfig();
    const scheduleKeys = Object.keys(config.schedule);
    expect(scheduleKeys.length).toBeGreaterThan(0);
  });

  it("schedule entries have required fields", () => {
    const config = loadConfig();
    for (const [, entry] of Object.entries(config.schedule)) {
      expect(entry).toHaveProperty("enabled");
      expect(entry).toHaveProperty("cron");
      expect(entry).toHaveProperty("command");
      expect(typeof entry.enabled).toBe("boolean");
      expect(typeof entry.cron).toBe("string");
      expect(typeof entry.command).toBe("string");
    }
  });
});

// ─── Prompt Builder Tests ───────────────────────────────────────────────────

import { getPendingTasks, isTaskUnblocked, hasPendingDecision } from "../scripts/daemon/prompt-builder";

describe("getPendingTasks", () => {
  it("returns only not-started tasks assigned to agents", () => {
    const tasks = getPendingTasks();
    for (const task of tasks) {
      expect(task.kanban).toBe("not-started");
      expect(task.assignedTo).not.toBeNull();
      expect(task.assignedTo).not.toBe("me");
    }
  });

  it("returns tasks sorted by Eisenhower priority", () => {
    const tasks = getPendingTasks();
    if (tasks.length < 2) return; // Skip if not enough tasks

    const priorityMap: Record<string, number> = {
      "important-urgent": 0,
      "important-not-urgent": 1,
      "not-important-urgent": 2,
      "not-important-not-urgent": 3,
    };

    for (let i = 0; i < tasks.length - 1; i++) {
      const pA = priorityMap[`${tasks[i].importance}-${tasks[i].urgency}`] ?? 3;
      const pB = priorityMap[`${tasks[i + 1].importance}-${tasks[i + 1].urgency}`] ?? 3;
      expect(pA).toBeLessThanOrEqual(pB);
    }
  });
});

describe("isTaskUnblocked", () => {
  it("returns true for tasks with no blockedBy", () => {
    const task = {
      id: "task_1", title: "", description: "", importance: "not-important", urgency: "not-urgent",
      kanban: "not-started", assignedTo: null, projectId: null, collaborators: [], subtasks: [],
      acceptanceCriteria: [], notes: "", estimatedMinutes: null, blockedBy: [] as string[],
    };
    expect(isTaskUnblocked(task)).toBe(true);
  });

  it("returns true for tasks with undefined blockedBy", () => {
    const task = {
      id: "task_1", title: "", description: "", importance: "not-important", urgency: "not-urgent",
      kanban: "not-started", assignedTo: null, collaborators: [], subtasks: [],
      acceptanceCriteria: [], notes: "", estimatedMinutes: null, blockedBy: undefined,
    } as unknown as Parameters<typeof isTaskUnblocked>[0];
    expect(isTaskUnblocked(task)).toBe(true);
  });
});

describe("hasPendingDecision", () => {
  it("returns false for tasks with no decisions", () => {
    // Use a very unlikely task ID
    expect(hasPendingDecision("task_nonexistent_999999999999")).toBe(false);
  });
});

// ─── Types Tests ────────────────────────────────────────────────────────────

import type {
  DaemonConfig,
  DaemonStatus,
  AgentSession,
  SessionHistoryEntry,
  SpawnOptions,
  SpawnResult,
} from "../scripts/daemon/types";

describe("daemon types", () => {
  it("DaemonConfig has all required fields", () => {
    const config: DaemonConfig = {
      polling: { enabled: true, intervalMinutes: 5 },
      concurrency: { maxParallelAgents: 3 },
      schedule: {
        test: { enabled: true, cron: "* * * * *", command: "test" },
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
    expect(config.polling.enabled).toBe(true);
    expect(config.concurrency.maxParallelAgents).toBe(3);
    expect(config.execution.skipPermissions).toBe(false);
    expect(config.execution.allowedTools).toEqual(["Edit", "Write"]);
    expect(config.inbox.maxContinuations).toBe(2);
  });

  it("DaemonStatus has all required fields", () => {
    const status: DaemonStatus = {
      status: "stopped",
      pid: null,
      startedAt: null,
      activeSessions: [],
      history: [],
      stats: { tasksDispatched: 0, tasksCompleted: 0, tasksFailed: 0, uptimeMinutes: 0, totalCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCacheReadTokens: 0, totalCacheCreationTokens: 0 },
      lastPollAt: null,
      nextScheduledRuns: {},
    };
    expect(status.status).toBe("stopped");
    expect(status.activeSessions).toEqual([]);
    expect(status.stats.tasksDispatched).toBe(0);
  });

  it("AgentSession has correct shape", () => {
    const session: AgentSession = {
      id: "session_1",
      agentId: "developer",
      taskId: "task_1",
      command: "task",
      pid: 12345,
      startedAt: new Date().toISOString(),
      status: "running",
      retryCount: 0,
    };
    expect(session.status).toBe("running");
    expect(session.pid).toBe(12345);
  });

  it("SessionHistoryEntry extends session with completion data", () => {
    const entry: SessionHistoryEntry = {
      id: "session_1",
      agentId: "developer",
      taskId: "task_1",
      command: "task",
      pid: 12345,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: "completed",
      exitCode: 0,
      error: null,
      durationMinutes: 5,
      retryCount: 0,
      costUsd: null,
      numTurns: null,
      usage: null,
    };
    expect(entry.exitCode).toBe(0);
    expect(entry.durationMinutes).toBe(5);
  });

  it("SpawnOptions has all required fields", () => {
    const opts: SpawnOptions = {
      prompt: "test prompt",
      maxTurns: 10,
      timeoutMinutes: 5,
      skipPermissions: false,
      allowedTools: ["Edit", "Write"],
      cwd: "/workspace",
    };
    expect(opts.skipPermissions).toBe(false);
    expect(opts.allowedTools).toEqual(["Edit", "Write"]);
  });

  it("SpawnResult has all required fields", () => {
    const result: SpawnResult = {
      exitCode: 0,
      stdout: "output",
      stderr: "",
      timedOut: false,
    };
    expect(result.timedOut).toBe(false);
  });
});
