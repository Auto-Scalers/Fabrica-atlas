import { request } from './client';

export const workspaceApi = {
  getWorkspaceFiles: (subDir: string = '') => request<{ ok: boolean; files: any[] }>(`/api/workspace/files?path=${encodeURIComponent(subDir)}`),
  createWorkspaceItem: (data: { path: string; content?: string; type?: string; source_type?: 'Generated' | 'Imported'; level?: any; description?: string; when_to_use?: string; triggers?: string[]; isImport?: boolean }) => request<{ ok: boolean; path: string; item: any }>('/api/workspace/create', { method: 'POST', body: JSON.stringify(data) }),
  readWorkspaceFile: (filePath: string) => request<{ ok: boolean; content: string; path: string; size: number }>(`/api/workspace/file/read?path=${encodeURIComponent(filePath)}`),
  writeWorkspaceFile: (filePath: string, content: string, options?: { isImport?: boolean; type?: string; source_type?: 'Generated' | 'Imported'; level?: any; description?: string; when_to_use?: string; triggers?: string[] }) => request<{ ok: boolean; path: string; size: number }>('/api/workspace/file/write', { method: 'POST', body: JSON.stringify({ path: filePath, content, ...options }) }),
  moveWorkspaceFile: (src: string, dest: string) => request<{ ok: boolean; src: string; dest: string; size: number }>('/api/workspace/file/move', { method: 'POST', body: JSON.stringify({ src, dest }) }),
  deleteWorkspaceFile: (filePath: string) => request<{ ok: boolean }>('/api/workspace/file/delete', { method: 'POST', body: JSON.stringify({ path: filePath }) }),
  getWorkspaceMap: () => request<{ ok: boolean; map: any }>('/api/workspace/map'),
  getAgentsMd: () => workspaceApi.readWorkspaceFile('AGENTS.md').then(res => res.content || '').catch(() => ''),
  saveAgentsMd: (content: string) => workspaceApi.writeWorkspaceFile('AGENTS.md', content).then(() => ({ ok: true })).catch(() => ({ ok: false })),
  
  getToolboxFiles: (entityName: string, kind: string, parents: string[] = [], entryName: string = '', scope: string = 'workspace') =>
    request<{ ok: boolean; files: any[] }>(`/api/workspace/files?path=${encodeURIComponent(`.pi/${kind}s/${entryName}`)}`).then(res => ({ ok: true, files: res.files || [] })).catch(() => ({ ok: false, files: [] })),
  saveToolboxFile: (entityName: string, kind: string, parents: string[] = [], folderName: string = '', relPath: string = '', content: string = '', scope: string = 'workspace') =>
    workspaceApi.writeWorkspaceFile(`.pi/${kind}s/${folderName}/${relPath}`, content).then(() => ({ ok: true })).catch(() => ({ ok: false })),
  mutateToolbox: (entityName: string, action: string, kind: string, parents: string[] = [], name: string = '', extra?: any) => {
    const basePath = `.pi/${kind}s/${name}`;
    if (action === 'delete') {
      return workspaceApi.deleteWorkspaceFile(basePath).then(() => ({ ok: true })).catch(() => ({ ok: false }));
    }
    if (action === 'create') {
      const filePath = kind === 'skill' ? `${basePath}/SKILL.md` : `${basePath}.ts`;
      return workspaceApi.writeWorkspaceFile(filePath, extra?.content || `# ${name}\n\nNew ${kind} created.`).then(() => ({ ok: true })).catch(() => ({ ok: false }));
    }
    return Promise.resolve({ ok: true });
  },
  createToolboxFolder: (entityName: string, kind: string, parents: string[] = [], folderName: string = '', relPath: string = '', scope: string = 'workspace') => {
    const targetPath = relPath ? `.pi/${kind}s/${folderName}/${relPath}/SKILL.md` : `.pi/${kind}s/${folderName}/SKILL.md`;
    return workspaceApi.writeWorkspaceFile(targetPath, `# ${folderName}\n\nSkill documentation initialized.`).then(() => ({ ok: true })).catch(() => ({ ok: false }));
  },
  renameSkillFolder: (entityName: string, kind: string, parents: string[] = [], folderName: string = '', clean: string = '', scope: string = 'workspace') =>
    workspaceApi.moveWorkspaceFile(`.pi/${kind}s/${folderName}`, `.pi/${kind}s/${clean}`).then(() => ({ ok: true })).catch(() => ({ ok: false })),
  renameToolboxFile: (entityName: string, kind: string, parents: string[] = [], folderName: string = '', oldPath: string = '', newPath: string = '', scope: string = 'workspace') =>
    workspaceApi.moveWorkspaceFile(`.pi/${kind}s/${folderName}/${oldPath}`, `.pi/${kind}s/${folderName}/${newPath}`).then(() => ({ ok: true })).catch(() => ({ ok: false })),
  deleteToolboxFile: (entityName: string, kind: string, parents: string[] = [], folderName: string = '', relPath: string = '', scope: string = 'workspace') =>
    workspaceApi.deleteWorkspaceFile(`.pi/${kind}s/${folderName}/${relPath}`).then(() => ({ ok: true })).catch(() => ({ ok: false })),
  getRawData: (tenantId?: string) => request<{ ok: boolean; data: any[] }>(`/api/workspace/files?path=raw_data`).then(res => res.data || []).catch(() => []),
  saveRawData: (data: any) => ({ ok: true }),
  getSystemComponents: (tenantId?: string) => request<{ ok: boolean; components: any[] }>(`/api/workspace/files?path=components`).then(res => res.components || []).catch(() => []),
  saveSystemComponent: (comp: any) => ({ ok: true }),
};
