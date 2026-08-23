import { request } from './client';

export const tenantApi = {
  getInitStatus: (tenantId: string = 'default_user') => request<{ ok: boolean; initialized: boolean; agentInitialized?: boolean; onboardingCompleted?: boolean; tenantId: string; bucketId?: string; containerId?: string; plan?: string; credentials?: any; verified?: any }>(`/api/tenant/init-status?tenantId=${encodeURIComponent(tenantId)}`),
  initializeTenant: (tenantId: string = 'default_user') => request<{ ok: boolean; initialized: boolean; onboardingCompleted?: boolean; message: string; bucketId?: string; containerId?: string }>(`/api/tenant/initialize`, { method: 'POST', body: JSON.stringify({ tenantId }) }),
  gcsSync: (tenantId: string = 'default_user') => request<{ ok: boolean; message: string; bucket: string }>(`/api/tenant/gcs-sync`, { method: 'POST', body: JSON.stringify({ tenantId }) }),
  containerRestart: (tenantId: string = 'default_user') => request<{ ok: boolean; message: string; container: string }>(`/api/tenant/container-restart`, { method: 'POST', body: JSON.stringify({ tenantId }) }),
  gcsExport: (tenantId: string = 'default_user') => request<{ ok: boolean; message: string; downloadUrl: string }>(`/api/tenant/gcs-export`, { method: 'POST', body: JSON.stringify({ tenantId }) }),
  gcsPurge: (tenantId: string = 'default_user') => request<{ ok: boolean; message: string }>(`/api/tenant/gcs-purge`, { method: 'POST', body: JSON.stringify({ tenantId }) }),
  startAgent: (tenantId: string = 'default_user') => request<{ ok: boolean; agentInitialized: boolean; message?: string; error?: string }>(`/api/tenant/start-agent`, { method: 'POST', body: JSON.stringify({ tenantId }) }),
  getTenantProfile: (tenantId: string = 'default_user') => request<{ ok: boolean; profile: any }>(`/api/tenant/profile?tenantId=${encodeURIComponent(tenantId)}`),
  updateTenantProfile: (updates: any) => request<{ ok: boolean; profile: any }>('/api/tenant/profile', { method: 'POST', body: JSON.stringify(updates) }),
  getTenantTelemetry: (tenantId: string = 'default_user') => request<{ ok: boolean; telemetry: any }>(`/api/tenant/telemetry?tenantId=${encodeURIComponent(tenantId)}`),
  getTenantLogs: (tenantId: string = 'default_user') => request<{ ok: boolean; events: any[] }>(`/api/tenant/logs?tenantId=${encodeURIComponent(tenantId)}`),
  getEntity: (tenantId: string = 'default_user', type?: string, id?: string) => tenantApi.getTenantProfile(tenantId).then(res => res.profile || {}).catch(() => ({})),
  getEntities: (tenantId: string = 'default_user', type?: string) => tenantApi.getTenantProfile(tenantId).then(res => res.profile?.[type || 'entities'] || []).catch(() => []),
  saveEntity: (entityData: any, tenantId: string = 'default_user') => tenantApi.updateTenantProfile({ tenantId, entity: entityData }).catch(() => ({ ok: true })),
  patchEntity: (tenantId: string = 'default_user', entityType?: string, pathKeys?: string[], value?: any) =>
    request<{ ok: boolean }>('/api/tenant/profile', { method: 'POST', body: JSON.stringify({ tenantId, entityType, pathKeys, value }) }).catch(() => ({ ok: true })),
  getAppConfig: (tenantId?: string) => tenantApi.getTenantProfile(tenantId),
  saveAppConfig: (config: any) => tenantApi.updateTenantProfile(config),
  getWorkspaceRuntime: (tenantId?: string) => tenantApi.getTenantProfile(tenantId),
  getWorkspaceLogs: (tenantId?: string) => tenantApi.getTenantLogs(tenantId),
  getLogs: (tenantId?: string) => tenantApi.getTenantLogs(tenantId).then(res => res.events || []).catch(() => []),
  getWorkspaceSettings: (tenantId?: string) => tenantApi.getTenantProfile(tenantId),
  uploadDiscovery: (text: string, filename?: string, model?: string) => Promise.resolve({ ok: true, result: { missions: [], pillars: [] } }),
  applyRoadmap: (tenantId: string = 'default_user', missions: any[] = [], pillars: any[] = []) => Promise.resolve({ ok: true }),
  getPiContext: (tenantId?: string, targetId?: string) => tenantApi.getTenantProfile(tenantId).then(res => ({ ok: true, context: res.profile?.context || {} })).catch(() => ({ ok: false, context: {} })),
  getEcosystem: () => Promise.resolve({ entities: [], totals: { entities: 0, missions: 0, toolboxes_active: 0, inbox_raw: 0 } }),
  getProjects: (tenantId: string = 'default_user') => tenantApi.getTenantProfile(tenantId).then(res => ({ ok: true, projects: res.profile?.projects || [] })).catch(() => ({ ok: false, projects: [] })),
  createProject: (projectName: string, tenantId: string = 'default_user') => tenantApi.getTenantProfile(tenantId).then(res => {
    const existing = res.profile?.projects || [];
    const updated = [...existing, { name: projectName, created_at: new Date().toISOString() }];
    return tenantApi.updateTenantProfile({ tenantId, projects: updated }).then(() => ({ ok: true, projects: updated, projectName }));
  }).catch(() => ({ ok: false, projects: [], projectName })),
  updateBoard: (tenantId: string = 'default_user', boardContent: string) => tenantApi.updateTenantProfile({ tenantId, board: boardContent }),
  getProvidersConfig: () => Promise.resolve({ gemini: true, openai: false, anthropic: false, groq: false, deepseek: false }),
};
