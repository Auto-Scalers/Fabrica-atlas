"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Task, Goal, Project, BrainDumpEntry, ActivityEvent, InboxMessage, DecisionItem, AgentDefinition, SkillDefinition } from "@/lib/types";
import { showSuccess, showError } from "@/lib/toast";
import { apiFetch } from "@/lib/api-client";

// Generic hook factory for CRUD operations
// pollInterval: optional polling interval in ms (e.g. 10_000 for 10s)
function useDataResource<T extends { id: string }>(
  endpoint: string,
  dataKey: string,
  label: string,
  pollInterval?: number,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const refetch = useCallback(async () => {
    try {
      // Only show loading spinner on initial fetch, not on background polls
      if (!initialLoadDone.current) setLoading(true);
      const res = await apiFetch(`/api/${endpoint}`);
      if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
      const json = await res.json();
      // Support both new envelope { data: [...] } and legacy { [dataKey]: [...] }
      setItems(json.data ?? json[dataKey] ?? []);
      setError(null);
      initialLoadDone.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [endpoint, dataKey]);

  // Initial fetch + optional polling
  useEffect(() => {
    refetch();
    if (!pollInterval) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refetch();
    }, pollInterval);

    // Immediately refetch when tab becomes visible again
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refetch, pollInterval]);

  const create = useCallback(
    async (item: Partial<T>) => {
      try {
        const res = await apiFetch(`/api/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (!res.ok) throw new Error(`Failed to create ${endpoint}`);
        const created = await res.json();
        setItems((prev) => [...prev, created]);
        showSuccess(`${label} created`);
        return created as T;
      } catch (err) {
        showError(`Failed to create ${label.toLowerCase()}`);
        throw err;
      }
    },
    [endpoint, label]
  );

  const update = useCallback(
    async (id: string, updates: Partial<T>) => {
      // Optimistic update
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
      try {
        const res = await apiFetch(`/api/${endpoint}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...updates }),
        });
        if (!res.ok) {
          await refetch(); // Revert on failure
          throw new Error(`Failed to update ${endpoint}`);
        }
        return (await res.json()) as T;
      } catch (err) {
        showError(`Failed to update ${label.toLowerCase()}`);
        await refetch();
        throw err;
      }
    },
    [endpoint, refetch, label]
  );

  const remove = useCallback(
    async (id: string) => {
      // Capture the item before deleting (for undo)
      const deletedItem = items.find((item) => item.id === id);
      // Optimistic delete
      setItems((prev) => prev.filter((item) => item.id !== id));
      try {
        const res = await apiFetch(`/api/${endpoint}?id=${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          await refetch(); // Revert on failure
          throw new Error(`Failed to delete ${endpoint}`);
        }
        // Show undo toast with 5-second window (uses PUT to restore soft-deleted item)
        showSuccess(`${label} deleted`, deletedItem ? {
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                await apiFetch(`/api/${endpoint}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: deletedItem.id, deletedAt: null }),
                });
                await refetch();
                showSuccess(`${label} restored`);
              } catch {
                showError(`Failed to restore ${label.toLowerCase()}`);
              }
            },
          },
          duration: 5000,
        } : undefined);
      } catch (err) {
        showError(`Failed to delete ${label.toLowerCase()}`);
        await refetch();
        throw err;
      }
    },
    [endpoint, refetch, label, items]
  );

  const bulkUpdate = useCallback(
    async (ids: string[], updates: Partial<T>) => {
      // Optimistic update
      setItems((prev) =>
        prev.map((item) => (ids.includes(item.id) ? { ...item, ...updates } : item))
      );
      try {
        if (endpoint === "tasks") {
          // Single atomic bulk request
          await apiFetch(`/api/tasks/bulk`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updates: ids.map((id) => ({ id, ...updates })) }),
          });
        } else {
          // Fallback: parallel individual calls for non-task entities
          await Promise.all(
            ids.map((id) =>
              apiFetch(`/api/${endpoint}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, ...updates }),
              })
            )
          );
        }
        showSuccess(`${ids.length} ${label.toLowerCase()}${ids.length > 1 ? "s" : ""} updated`);
      } catch (err) {
        showError(`Failed to bulk update ${label.toLowerCase()}s`);
        await refetch();
        throw err;
      }
    },
    [endpoint, refetch, label]
  );

  const bulkRemove = useCallback(
    async (ids: string[]) => {
      // Optimistic delete
      setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
      try {
        if (endpoint === "tasks") {
          // Single atomic bulk request
          await apiFetch(`/api/tasks/bulk`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
          });
        } else {
          // Fallback: parallel individual calls
          await Promise.all(
            ids.map((id) =>
              apiFetch(`/api/${endpoint}?id=${id}`, { method: "DELETE" })
            )
          );
        }
        showSuccess(`${ids.length} ${label.toLowerCase()}${ids.length > 1 ? "s" : ""} deleted`);
      } catch (err) {
        showError(`Failed to bulk delete ${label.toLowerCase()}s`);
        await refetch();
        throw err;
      }
    },
    [endpoint, refetch, label]
  );

  return { items, loading, error, create, update, remove, bulkUpdate, bulkRemove, refetch };
}

export function useTasks() {
  const { items: tasks, ...rest } = useDataResource<Task>("tasks", "tasks", "Task", 15_000);
  return { tasks, ...rest };
}

export function useGoals() {
  const { items: goals, ...rest } = useDataResource<Goal>("goals", "goals", "Goal");
  return { goals, ...rest };
}

export function useProjects() {
  const { items: projects, ...rest } = useDataResource<Project>("ventures", "projects", "Project");
  return { projects, ...rest };
}

export function useBrainDump() {
  const { items: entries, ...rest } = useDataResource<BrainDumpEntry>("brain-dump", "entries", "Entry");
  return { entries, ...rest };
}

export function useActivityLog() {
  const { items: events, ...rest } = useDataResource<ActivityEvent>("activity-log", "events", "Event", 30_000);
  return { events, ...rest };
}

export function useInbox() {
  const { items: messages, ...rest } = useDataResource<InboxMessage>("inbox", "messages", "Message", 10_000);
  return { messages, ...rest };
}

export function useDecisions() {
  const { items: decisions, ...rest } = useDataResource<DecisionItem>("decisions", "decisions", "Decision", 10_000);
  return { decisions, ...rest };
}

export function useAgents() {
  const { items: agents, ...rest } = useDataResource<AgentDefinition>("agents", "agents", "Agent");
  return { agents, ...rest };
}

export function useSkills() {
  const { items: skills, ...rest } = useDataResource<SkillDefinition>("skills", "skills", "Skill");
  return { skills, ...rest };
}
