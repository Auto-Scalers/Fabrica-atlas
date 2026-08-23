"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";

interface AgentSession {
  id: string;
  agentId: string;
  taskId: string | null;
  command: string;
  pid: number;
  startedAt: string;
  status: string;
}

interface SessionHistoryEntry extends AgentSession {
  completedAt: string;
  exitCode: number | null;
  error: string | null;
  durationMinutes: number;
  costUsd: number | null;
  numTurns: number | null;
  usage: { inputTokens: number; outputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number } | null;
}

interface DaemonStats {
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

interface DaemonStatus {
  status: "running" | "stopped" | "starting";
  pid: number | null;
  startedAt: string | null;
  activeSessions: AgentSession[];
  history: SessionHistoryEntry[];
  stats: DaemonStats;
  lastPollAt: string | null;
  nextScheduledRuns: Record<string, string>;
}

interface DaemonConfig {
  polling: { enabled: boolean; intervalMinutes: number };
  concurrency: { maxParallelAgents: number };
  schedule: Record<string, { enabled: boolean; cron: string; command: string }>;
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
}

interface DaemonData {
  status: DaemonStatus;
  config: DaemonConfig;
  isRunning: boolean;
  isLoading: boolean;
  error: string | null;
  start: (masterPassword?: string) => Promise<void>;
  stop: () => Promise<void>;
  updateConfig: (updates: Partial<DaemonConfig>) => Promise<void>;
  refetch: () => Promise<void>;
}

const POLL_INTERVAL = 5000; // 5 seconds

export function useDaemon(): DaemonData {
  const [status, setStatus] = useState<DaemonStatus>({
    status: "stopped",
    pid: null,
    startedAt: null,
    activeSessions: [],
    history: [],
    stats: { tasksDispatched: 0, tasksCompleted: 0, tasksFailed: 0, uptimeMinutes: 0, totalCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCacheReadTokens: 0, totalCacheCreationTokens: 0 },
    lastPollAt: null,
    nextScheduledRuns: {},
  });
  const [config, setConfig] = useState<DaemonConfig>({
    polling: { enabled: true, intervalMinutes: 5 },
    concurrency: { maxParallelAgents: 3 },
    schedule: {},
    execution: { maxTurns: 25, timeoutMinutes: 30, retries: 1, retryDelayMinutes: 5, skipPermissions: false, allowedTools: ["Edit", "Write"], agentTeams: false, claudeBinaryPath: null, maxTaskContinuations: 2 },
    inbox: { maxContinuations: 2, maxTurnsPerSession: 25, timeoutPerSessionMinutes: 15 },
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await apiFetch("/api/daemon");
      if (!res.ok) throw new Error("Failed to fetch daemon status");
      const data = await res.json();
      setStatus(data.status);
      setConfig(data.config);
      setIsRunning(data.isRunning);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll every 5 seconds
  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [refetch]);

  const start = useCallback(async (masterPassword?: string) => {
    try {
      const payload: Record<string, unknown> = { action: "start" };
      if (masterPassword) payload.masterPassword = masterPassword;
      const res = await apiFetch("/api/daemon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start daemon");
      }
      // Refetch after a short delay to pick up the new status
      setTimeout(refetch, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start daemon");
      throw err; // Re-throw so the caller can handle it
    }
  }, [refetch]);

  const stop = useCallback(async () => {
    try {
      const res = await apiFetch("/api/daemon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to stop daemon");
      }
      setTimeout(refetch, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop daemon");
    }
  }, [refetch]);

  const updateConfig = useCallback(async (updates: Partial<DaemonConfig>) => {
    try {
      const res = await apiFetch("/api/daemon", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update config");
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update config");
    }
  }, [refetch]);

  return { status, config, isRunning, isLoading, error, start, stop, updateConfig, refetch };
}
