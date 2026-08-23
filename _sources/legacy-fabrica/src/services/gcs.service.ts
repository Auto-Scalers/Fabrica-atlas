import { StorageObject, SyncResult } from '../types/workspace.types.js';
import { getWorkspaceMap, syncWorkspaceJson } from '../core/workspace/file.manager.js';
import { appendTenantAuditLog } from '../core/tenant/tenant.manager.js';

export function listCloudStorageObjects(tenantId: string = 'default_user', folderPrefix: string = ''): StorageObject[] {
  const map = getWorkspaceMap(tenantId);
  const allFiles = map.all || [];

  return allFiles
    .filter(f => !folderPrefix || f.path.startsWith(folderPrefix))
    .map(f => ({
      name: f.name,
      bucket: `fabrica-tenant-${tenantId}`,
      size: f.size,
      contentType: f.name.endsWith('.json') ? 'application/json' : f.name.endsWith('.md') ? 'text/markdown' : 'text/plain',
      updated: f.modified_at
    }));
}

export function syncTenantWorkspace(tenantId: string = 'default_user'): SyncResult {
  const map = syncWorkspaceJson(tenantId);
  const syncedFilesCount = map ? (map.all ? map.all.length : 0) : 0;

  appendTenantAuditLog(tenantId, {
    type: 'system',
    event: 'Workspace Synced',
    details: { syncedFilesCount }
  });

  return {
    tenantId,
    syncedFilesCount,
    newGapsFilled: 0,
    timestamp: new Date().toISOString()
  };
}

export function detectFillGaps(tenantId: string = 'default_user'): { gapsFound: number; fixed: boolean } {
  syncWorkspaceJson(tenantId);
  return { gapsFound: 0, fixed: true };
}
