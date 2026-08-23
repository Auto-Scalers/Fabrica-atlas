"use client";

import { useState, useEffect, useCallback } from "react";
import type { Task, Goal, Project, BrainDumpEntry, InboxMessage, DecisionItem, ActivityEvent } from "@/lib/types";
import { apiFetch } from "@/lib/api-client";

interface DashboardStats {
  totalTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  totalGoals: number;
  completedMilestones: number;
  totalMilestones: number;
  activeProjects: number;
  unprocessedBrainDump: number;
}

interface DashboardAttention {
  pendingDecisions: number;
  unreadReports: number;
  doQuadrantNotStarted: number;
}

interface EisenhowerCounts {
  do: number;
  schedule: number;
  delegate: number;
  eliminate: number;
}

export interface DashboardData {
  stats: DashboardStats;
  attention: DashboardAttention;
  eisenhowerCounts: EisenhowerCounts;
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

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
