'use client';

import { useState, useEffect, useCallback } from 'react';
import { workspaceApi } from '../../components/api';

export interface WorkspaceStateResponse {
  ok: boolean;
  map?: any;
  error?: string;
}

export interface UseWorkspaceOptions {
  tenantId?: string;
  autoRefreshMs?: number;
}

export function useWorkspace({ tenantId = 'usr-123', autoRefreshMs }: UseWorkspaceOptions = {}) {
  const [workspaceState, setWorkspaceState] = useState<WorkspaceStateResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<string>('src/server.ts');

  const refreshWorkspace = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await workspaceApi.getWorkspaceMap();
      if (res && res.ok) {
        setWorkspaceState(res);
        setError(null);
      } else {
        setError('Failed to fetch workspace state');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error fetching workspace state');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshWorkspace();

    if (autoRefreshMs && autoRefreshMs > 0) {
      const interval = setInterval(refreshWorkspace, autoRefreshMs);
      return () => clearInterval(interval);
    }
  }, [refreshWorkspace, autoRefreshMs]);

  return {
    workspaceState,
    isLoading,
    error,
    activeFile,
    setActiveFile,
    refreshWorkspace
  };
}

export default useWorkspace;
