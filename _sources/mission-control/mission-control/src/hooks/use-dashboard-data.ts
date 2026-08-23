"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Task, Goal, Project, BrainDumpEntry, InboxMessage, DecisionItem, ActivityEvent } from "@/lib/types";
import { apiFetch } from "@/lib/api-client";

export interface DashboardStats {
  totalTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  totalGoals: number;
  completedMilestones: number;
  totalMilestones: number;
  activeProjects: number;
  unprocessedBrainDump: number;
}

export interface DashboardAttention {
  pendingDecisions: number;
  unreadReports: number;
  doQuadrantNotStarted: number;
}

export interface DashboardEisenhowerCounts {
  do: number;
  schedule: number;
  delegate: number;
  eliminate: number;
}

export interface DashboardData {
  stats: DashboardStats;
  attention: DashboardAttention;
  eisenhowerCounts: DashboardEisenhowerCounts;
  unreadMessages: InboxMessage[];
  pendingDecisionsList: DecisionItem[];
  recentActivity: ActivityEvent[];
  tasks: Task[];
  goals: Goal[];
  projects: Project[];
  entries: BrainDumpEntry[];
  messages: InboxMessage[];
  decisions: DecisionItem[];
}

const POLL_INTERVAL = 15_000; // 15s — matches tasks polling frequency

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const refetch = useCallback(async () => {
    try {
      if (!initialLoadDone.current) setLoading(true);
      const res = await apiFetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const json: DashboardData = await res.json();
      setData(json);
      setError(null);
      initialLoadDone.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refetch();
    }, POLL_INTERVAL);

    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refetch]);

  return { data, loading, error, refetch };
}
