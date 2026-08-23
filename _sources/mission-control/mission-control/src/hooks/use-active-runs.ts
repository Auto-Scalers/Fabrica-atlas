"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ActiveRun, DecisionItem, ProjectRun } from "@/lib/types";
import { showSuccess, showError } from "@/lib/toast";
import { apiFetch } from "@/lib/api-client";

const POLL_INTERVAL = 3000; // 3 seconds

export function useActiveRuns() {
  const [runs, setRuns] = useState<ActiveRun[]>([]);
  const [activeProjectRuns, setActiveProjectRuns] = useState<Record<string, ProjectRun>>({});
  // Track previously-seen run IDs to detect new failures
  const seenRunIds = useRef<Set<string>>(new Set());
  // Skip error toasts on first fetch — existing failures are historical
  const isInitialFetch = useRef(true);

  // Decision dialog state
  const [pendingDecision, setPendingDecision] = useState<DecisionItem | null>(null);
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const pendingTaskIdRef = useRef<string | null>(null);

  // Poll for active runs + missions
  const fetchRuns = useCallback(async () => {
    try {
      const [runsRes, missionsRes] = await Promise.all([
        apiFetch("/api/runs"),
        apiFetch("/api/missions"),
      ]);

      // Process runs
      if (runsRes.ok) {
        const data = await runsRes.json();
        const newRuns: ActiveRun[] = data.runs ?? [];

        if (isInitialFetch.current) {
          isInitialFetch.current = false;
          seenRunIds.current = new Set(newRuns.map((r) => r.id));
        } else {
          // Surface newly-completed runs as success toasts
          for (const run of newRuns) {
            if (run.status === "completed" && !seenRunIds.current.has(run.id)) {
              showSuccess(`Task completed by ${run.agentId}`);
            }
          }
          // Surface newly-failed runs as error toasts
          for (const run of newRuns) {
            if (
              (run.status === "failed" || run.status === "timeout") &&
              !seenRunIds.current.has(run.id)
            ) {
              showError(run.error ?? "Task execution failed");
            }
          }
          seenRunIds.current = new Set(newRuns.map((r) => r.id));
        }

        setRuns(newRuns);
      }

      // Process project runs
      if (missionsRes.ok) {
        const missionsData = await missionsRes.json();
        const active: Record<string, ProjectRun> = {};
        for (const m of (missionsData.missions ?? []) as ProjectRun[]) {
          if (m.status === "running" || m.status === "stalled") {
            active[m.projectId] = m;
          }
        }
        setActiveProjectRuns(active);
      }
    } catch {
      // Silently fail on poll errors
    }
  }, []);

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  // Derived state
  const runningTaskIds = useMemo(
    () => new Set(runs.filter((r) => r.status === "running").map((r) => r.taskId)),
    [runs]
  );

  const runningProjectIds = useMemo(() => {
    const ids = new Set<string>();
    for (const run of runs) {
      if (run.status === "running" && run.projectId) {
        ids.add(run.projectId);
      }
    }
    return ids;
  }, [runs]);

  // A project has an active run if there's an active project run OR running tasks
  const isProjectRunActive = useCallback(
    (projectId: string) => projectId in activeProjectRuns,
    [activeProjectRuns]
  );

  const isTaskRunning = useCallback(
    (taskId: string) => runningTaskIds.has(taskId),
    [runningTaskIds]
  );

  const isProjectRunning = useCallback(
    (projectId: string) => runningProjectIds.has(projectId),
    [runningProjectIds]
  );

  // Actions
  const runTask = useCallback(
    async (taskId: string) => {
      try {
        const res = await apiFetch(`/api/tasks/${taskId}/run`, {
          method: "POST",
        });
        if (!res.ok) {
          const data = await res.json();

          // Intercept pending decision — open dialog instead of error toast
          if (data.pendingDecision) {
            setPendingDecision(data.pendingDecision as DecisionItem);
            pendingTaskIdRef.current = taskId;
            setShowDecisionDialog(true);
            return;
          }

          showError(data.error ?? "Failed to start task");
          return;
        }
        showSuccess("Task execution started");
        // Immediately refetch to show running state
        await fetchRuns();
      } catch {
        showError("Failed to start task");
      }
    },
    [fetchRuns]
  );

  // After a decision is answered, re-run the task
  const handleDecisionAnswered = useCallback(() => {
    setShowDecisionDialog(false);
    setPendingDecision(null);
    const taskToRun = pendingTaskIdRef.current;
    pendingTaskIdRef.current = null;
    if (taskToRun) {
      runTask(taskToRun);
    }
  }, [runTask]);

  const runProject = useCallback(
    async (projectId: string) => {
      try {
        const res = await apiFetch(`/api/ventures/${projectId}/run`, {
          method: "POST",
        });
        if (!res.ok) {
          const data = await res.json();
          showError(data.error ?? "Failed to start project run");
          return;
        }
        const result = await res.json();
        const launchedCount = result.launched?.length ?? 0;
        const totalCount = result.total ?? 0;
        const remaining = totalCount - launchedCount;

        if (launchedCount > 0) {
          let msg = `Project run started: ${launchedCount} task${launchedCount !== 1 ? "s" : ""} running`;
          if (remaining > 0) {
            msg += `, ${remaining} queued`;
          }
          showSuccess(msg);
        } else {
          showError("No tasks could be launched");
        }
        await fetchRuns();
      } catch {
        showError("Failed to start project run");
      }
    },
    [fetchRuns]
  );

  const stopProject = useCallback(
    async (projectId: string) => {
      try {
        const res = await apiFetch(`/api/ventures/${projectId}/stop`, {
          method: "POST",
        });
        if (!res.ok) {
          const data = await res.json();
          showError(data.error ?? "Failed to stop project run");
          return;
        }
        const result = await res.json();
        showSuccess(`Project run stopped. ${result.tasksStopped} task${result.tasksStopped !== 1 ? "s" : ""} terminated.`);
        await fetchRuns();
      } catch {
        showError("Failed to stop project run");
      }
    },
    [fetchRuns]
  );

  const stopTask = useCallback(
    async (taskId: string) => {
      try {
        const res = await apiFetch(`/api/tasks/${taskId}/stop`, {
          method: "POST",
        });
        if (!res.ok) {
          const data = await res.json();
          showError(data.error ?? "Failed to stop task");
          return;
        }
        showSuccess("Task stopped");
        await fetchRuns();
      } catch {
        showError("Failed to stop task");
      }
    },
    [fetchRuns]
  );

  const getProjectRun = useCallback(
    (projectId: string): ProjectRun | null => activeProjectRuns[projectId] ?? null,
    [activeProjectRuns]
  );

  return {
    runs,
    runningTaskIds,
    runningProjectIds,
    activeProjectRuns,
    isTaskRunning,
    isProjectRunning,
    isProjectRunActive,
    getProjectRun,
    runTask,
    runProject,
    stopProject,
    stopTask,
    // Decision dialog state
    pendingDecision,
    showDecisionDialog,
    setShowDecisionDialog,
    handleDecisionAnswered,
  };
}
