"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FieldMission, FieldTask, FieldOpsService } from "@/lib/types";
import { showSuccess, showError } from "@/lib/toast";
import { apiFetch } from "@/lib/api-client";

// ─── Generic field-ops hook (mirrors useDataResource pattern) ───────────────

function useFieldOpsResource<T extends { id: string }>(
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
      if (!initialLoadDone.current) setLoading(true);
      const res = await apiFetch(`/api/${endpoint}`);
      if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
      const json = await res.json();
      setItems(json.data ?? json[dataKey] ?? []);
      setError(null);
      initialLoadDone.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [endpoint, dataKey]);

  useEffect(() => {
    refetch();
    if (!pollInterval) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refetch();
    }, pollInterval);

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
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `Failed to create ${endpoint}` }));
          throw new Error(errData.error ?? `Failed to create ${endpoint}`);
        }
        const created = await res.json();
        setItems((prev) => [...prev, created]);
        showSuccess(`${label} created`);
        return created as T;
      } catch (err) {
        showError(err instanceof Error ? err.message : `Failed to create ${label.toLowerCase()}`);
        throw err;
      }
    },
    [endpoint, label],
  );

  const update = useCallback(
    async (id: string, updates: Partial<T>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
      );
      try {
        const res = await apiFetch(`/api/${endpoint}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...updates }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `Failed to update ${endpoint}` }));
          await refetch();
          throw new Error(errData.error ?? `Failed to update ${endpoint}`);
        }
        return (await res.json()) as T;
      } catch (err) {
        showError(err instanceof Error ? err.message : `Failed to update ${label.toLowerCase()}`);
        await refetch();
        throw err;
      }
    },
    [endpoint, refetch, label],
  );

  const remove = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      try {
        const res = await apiFetch(`/api/${endpoint}?id=${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          await refetch();
          throw new Error(`Failed to delete ${endpoint}`);
        }
        showSuccess(`${label} deleted`);
      } catch (err) {
        showError(`Failed to delete ${label.toLowerCase()}`);
        await refetch();
        throw err;
      }
    },
    [endpoint, refetch, label],
  );

  return { items, loading, error, create, update, remove, refetch };
}

// ─── Client-Side Password Cache (module-level singleton) ─────────────────────
//
// Mirrors the server-side vault-session.ts pattern but in browser memory.
// Survives server restarts / HMR — the password is always available to send
// in execute request bodies, even if the server lost its in-memory cache.
//
// Security posture: same as server-side — volatile, in-memory, auto-clears
// after 30 minutes. Never persisted to disk, localStorage, or cookies.

const PW_TTL_MS = 30 * 60 * 1000; // 30 minutes — matches server TTL
let _cachedPw: string | null = null;
let _pwTimer: ReturnType<typeof setTimeout> | null = null;

function cachePw(pw: string): void {
  _cachedPw = pw;
  if (_pwTimer) clearTimeout(_pwTimer);
  _pwTimer = setTimeout(() => {
    _cachedPw = null;
    _pwTimer = null;
  }, PW_TTL_MS);
}

function clearPw(): void {
  _cachedPw = null;
  if (_pwTimer) {
    clearTimeout(_pwTimer);
    _pwTimer = null;
  }
}

/** Retrieve the client-side cached master password (or null if expired/absent). */
export function getCachedVaultPassword(): string | null {
  return _cachedPw;
}

// ─── Vault Session Hook ─────────────────────────────────────────────────────

interface VaultSessionState {
  active: boolean;
  remainingMs: number;
  ttlMs: number;
}

export function useVaultSession() {
  const [session, setSession] = useState<VaultSessionState>({
    active: false,
    remainingMs: 0,
    ttlMs: 0,
  });
  const [loading, setLoading] = useState(false);

  const checkSession = useCallback(async () => {
    try {
      const res = await apiFetch("/api/field-ops/vault/session");
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      }
    } catch {
      // Silently fail — vault session check is non-critical
    }
  }, []);

  useEffect(() => {
    checkSession();
    // Poll every 60s to track remaining time
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") checkSession();
    }, 60_000);
    return () => clearInterval(interval);
  }, [checkSession]);

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/field-ops/vault/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterPassword: password }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data);
        // Cache password client-side — resilient to server restarts
        cachePw(password);
        return true;
      }
      const err = await res.json().catch(() => ({}));
      if (err.error) {
        throw new Error(err.error);
      }
      return false;
    } catch (err) {
      if (err instanceof Error) throw err;
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const lock = useCallback(async () => {
    try {
      await apiFetch("/api/field-ops/vault/session", { method: "DELETE" });
      setSession({ active: false, remainingMs: 0, ttlMs: 0 });
      clearPw();
    } catch {
      // Silently fail
    }
  }, []);

  return {
    active: session.active,
    remainingMs: session.remainingMs,
    loading,
    unlock,
    lock,
    checkSession,
    /** Get the client-side cached password for use in execute requests. */
    getCachedPassword: getCachedVaultPassword,
  };
}

// ─── Execute Task Hook ──────────────────────────────────────────────────────

export function useExecuteTask() {
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
  const [dryRunTaskId, setDryRunTaskId] = useState<string | null>(null);

  const execute = useCallback(
    async (
      taskId: string,
      masterPassword?: string,
      dryRun?: boolean,
    ): Promise<{
      success: boolean;
      isDryRun?: boolean;
      stalenessCheck?: boolean;
      error?: string;
      result?: Record<string, unknown>;
    }> => {
      if (dryRun) {
        setDryRunTaskId(taskId);
      } else {
        setExecutingTaskId(taskId);
      }
      try {
        const res = await apiFetch("/api/field-ops/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId,
            masterPassword,
            actor: "me",
            dryRun: dryRun ?? false,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          if (dryRun) {
            showSuccess("Dry run passed — payload is valid");
            return { success: true, isDryRun: true };
          }
          if (data.status === "completed") {
            if (data.stalenessCheck) {
              showSuccess("Task executed successfully (stale service pre-checked ✓)");
            } else {
              showSuccess("Task executed successfully");
            }
          } else if (data.mode === "manual") {
            showSuccess("Task started (manual execution)");
          } else {
            showError(`Task failed: ${data.error ?? "Unknown error"}`);
          }
          return {
            success: data.status === "completed" || data.mode === "manual",
            stalenessCheck: data.stalenessCheck ?? false,
            error: data.error,
            result: data.result,
          };
        }
        const errMsg = data.error ?? (dryRun ? "Dry run failed" : "Execution failed");
        showError(errMsg);
        return { success: false, isDryRun: dryRun, error: errMsg };
      } catch (err) {
        const msg = err instanceof Error ? err.message : (dryRun ? "Dry run failed" : "Execution failed");
        showError(msg);
        return { success: false, isDryRun: dryRun, error: msg };
      } finally {
        setExecutingTaskId(null);
        setDryRunTaskId(null);
      }
    },
    [],
  );

  return { execute, executingTaskId, dryRunTaskId };
}

// ─── Exported hooks ─────────────────────────────────────────────────────────

export function useFieldMissions() {
  const { items: missions, ...rest } = useFieldOpsResource<FieldMission>(
    "field-ops/missions",
    "missions",
    "Mission",
    15_000,
  );
  return { missions, ...rest };
}

export function useFieldTasks() {
  const { items: tasks, ...rest } = useFieldOpsResource<FieldTask>(
    "field-ops/tasks",
    "tasks",
    "Field Task",
    10_000,
  );
  return { tasks, ...rest };
}

export function useFieldServices() {
  const { items: services, ...rest } = useFieldOpsResource<FieldOpsService>(
    "field-ops/services",
    "services",
    "Service",
  );
  return { services, ...rest };
}
