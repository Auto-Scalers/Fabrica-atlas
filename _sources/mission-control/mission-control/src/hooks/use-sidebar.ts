"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Task, AgentDefinition } from "@/lib/types";
import { apiFetch } from "@/lib/api-client";

interface SidebarData {
  tasks: Task[];
  unreadInbox: number;
  pendingDecisions: number;
  pendingFieldApprovals: number;
  agents: AgentDefinition[];
}

const POLL_INTERVAL = 10_000; // 10s — matches inbox/decisions frequency

export function useSidebar() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [unreadInbox, setUnreadInbox] = useState(0);
  const [pendingDecisions, setPendingDecisions] = useState(0);
  const [pendingFieldApprovals, setPendingFieldApprovals] = useState(0);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  const refetch = useCallback(async () => {
    try {
      if (!initialLoadDone.current) setLoading(true);
      const res = await apiFetch("/api/sidebar");
      if (!res.ok) throw new Error("Failed to fetch sidebar data");
      const json: SidebarData = await res.json();
      setTasks(json.tasks);
      setAgents(json.agents);
      setUnreadInbox(json.unreadInbox);
      setPendingDecisions(json.pendingDecisions);
      setPendingFieldApprovals(json.pendingFieldApprovals ?? 0);
      initialLoadDone.current = true;
    } catch {
      // Silently fail on polls — sidebar badges are non-critical
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

  return { tasks, agents, unreadInbox, pendingDecisions, pendingFieldApprovals, loading, refetch };
}
