import fs from 'fs';
import path from 'path';
import {
  UserFileItem,
  WorkspaceItemLevel,
  WorkspaceItem,
  WorkspaceMap,
  StorageObject,
  SyncResult
} from '../../types/workspace.types.js';
import { getTenantRoot, appendTenantAuditLog } from '../tenant/tenant.manager.js';
import { ensureUserHarness } from '../harness/harness.engine.js';

export function syncWorkspaceJson(tenantId: string = 'default_user'): WorkspaceMap | null {
  const userRoot = getTenantRoot(tenantId);
  const workspaceGraphJsonPath = path.join(userRoot, 'workspace-graph.json');
  const workspaceDir = path.join(userRoot, 'workspace');

  const workspaceDirs = [
    'Discovery & Scoping',
    'Deep Research & Intelligence Gathering',
    'Data Analysis & Pattern Extraction',
    'Strategic Synthesis & Decision Support',
    'Executions',
    'Reviews',
    'Completed'
  ];

  for (const d of workspaceDirs) {
    fs.mkdirSync(path.join(workspaceDir, d), { recursive: true });
  }

  const oldSourcesDir = path.join(workspaceDir, 'Sources');
  const oldDeliverablesDir = path.join(workspaceDir, 'Deliverables');

  const moveLegacyFolderContents = (parentOldDir: string, folderName: string) => {
    const srcPath = path.join(parentOldDir, folderName);
    const destPath = path.join(workspaceDir, folderName);
    if (fs.existsSync(srcPath)) {
      try {
        fs.mkdirSync(destPath, { recursive: true });
        const files = fs.readdirSync(srcPath);
        for (const f of files) {
          try {
            fs.renameSync(path.join(srcPath, f), path.join(destPath, f));
          } catch (_) {}
        }
        try { fs.rmdirSync(srcPath); } catch (_) {}
      } catch (_) {}
    }
  };

  if (fs.existsSync(oldSourcesDir)) {
    for (const d of ['Discovery & Scoping', 'Deep Research & Intelligence Gathering', 'Data Analysis & Pattern Extraction', 'Strategic Synthesis & Decision Support']) {
      moveLegacyFolderContents(oldSourcesDir, d);
    }
    try { fs.rmdirSync(oldSourcesDir); } catch (_) {}
  }

  if (fs.existsSync(oldDeliverablesDir)) {
    for (const d of ['Executions', 'Reviews', 'Completed']) {
      moveLegacyFolderContents(oldDeliverablesDir, d);
    }
    try { fs.rmdirSync(oldDeliverablesDir); } catch (_) {}
  }

  const existingMetadataMap = new Map<string, Partial<WorkspaceItem>>();

  if (fs.existsSync(workspaceGraphJsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(workspaceGraphJsonPath, 'utf8'));

      const collectMetadata = (list: any[]) => {
        if (!Array.isArray(list)) return;
        for (const item of list) {
          if (item && item.path) {
            existingMetadataMap.set(item.path, item);
          }
        }
      };

      if (parsed.discovery_and_scoping) collectMetadata(parsed.discovery_and_scoping);
      if (parsed.deep_research) collectMetadata(parsed.deep_research);
      if (parsed.data_analysis) collectMetadata(parsed.data_analysis);
      if (parsed.strategic_synthesis) collectMetadata(parsed.strategic_synthesis);
      if (parsed.executions) collectMetadata(parsed.executions);
      if (parsed.reviews) collectMetadata(parsed.reviews);
      if (parsed.completed) collectMetadata(parsed.completed);
      if (parsed.all) collectMetadata(parsed.all);
      if (parsed.sources) collectMetadata(parsed.sources.all);
      if (parsed.deliverables) collectMetadata(parsed.deliverables.all);
    } catch (_) {}
  }

  const scanDir = (dir: string): WorkspaceItem[] => {
    if (!fs.existsSync(dir)) return [];
    const results: WorkspaceItem[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(userRoot, fullPath);
        const isDir = entry.isDirectory();

        let size = 0;
        let modifiedAt = new Date().toISOString();
        try {
          const st = fs.statSync(fullPath);
          size = st.size;
          modifiedAt = st.mtime.toISOString();
        } catch (_) {}

        const existing = existingMetadataMap.get(relPath);

        let sourceType: 'Generated' | 'Imported' = 'Generated';
        if (existing?.source_type === 'Imported' || existing?.source_type === 'Generated') {
          sourceType = existing.source_type;
        } else if (existing?.type === 'imported' || (existing as any)?.isImport) {
          sourceType = 'Imported';
        } else {
          sourceType = 'Generated';
        }

        const item: WorkspaceItem = {
          name: entry.name,
          path: relPath,
          isDirectory: isDir,
          type: existing?.type || (isDir ? 'directory' : 'file'),
          source_type: sourceType,
          level: existing?.level || { maturity: 'production', readability: 'high' },
          description: existing?.description || `Workspace ${isDir ? 'directory' : 'file'}: ${entry.name}`,
          when_to_use: existing?.when_to_use || `Referenced when processing ${entry.name} in mission or workspace tasks`,
          triggers: existing?.triggers || [entry.name, isDir ? 'folder' : 'file'],
          size,
          modified_at: modifiedAt
        };

        results.push(item);

        if (isDir) {
          results.push(...scanDir(fullPath));
        }
      }
    } catch (_) {}
    return results;
  };

  const discoveryAndScoping = scanDir(path.join(workspaceDir, 'Discovery & Scoping'));
  const deepResearch = scanDir(path.join(workspaceDir, 'Deep Research & Intelligence Gathering'));
  const dataAnalysis = scanDir(path.join(workspaceDir, 'Data Analysis & Pattern Extraction'));
  const strategicSynthesis = scanDir(path.join(workspaceDir, 'Strategic Synthesis & Decision Support'));
  const executions = scanDir(path.join(workspaceDir, 'Executions'));
  const reviews = scanDir(path.join(workspaceDir, 'Reviews'));
  const completed = scanDir(path.join(workspaceDir, 'Completed'));

  const allScannedItems = scanDir(workspaceDir);

  const workspaceMap: WorkspaceMap = {
    discovery_and_scoping: discoveryAndScoping,
    deep_research: deepResearch,
    data_analysis: dataAnalysis,
    strategic_synthesis: strategicSynthesis,
    executions: executions,
    reviews: reviews,
    completed: completed,
    all: allScannedItems,
    updated_at: new Date().toISOString()
  };

  try {
    fs.writeFileSync(workspaceGraphJsonPath, JSON.stringify(workspaceMap, null, 2), 'utf8');
  } catch (err) {
    console.warn(`[WorkspaceCore] Failed writing workspace-graph.json for ${tenantId}:`, err);
  }

  return workspaceMap;
}

export function getWorkspaceMap(tenantId: string = 'default_user'): WorkspaceMap {
  const userRoot = getTenantRoot(tenantId);
  const workspaceGraphJsonPath = path.join(userRoot, 'workspace-graph.json');

  if (fs.existsSync(workspaceGraphJsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(workspaceGraphJsonPath, 'utf8'));
      let needsResync = false;
      const checkItems = (list: any[]) => {
        if (!Array.isArray(list)) return;
        for (const item of list) {
          if (item && item.path && !item.source_type) {
            needsResync = true;
            break;
          }
        }
      };
      if (!parsed.all || !Array.isArray(parsed.all)) {
        needsResync = true;
      }
      if (parsed.discovery_and_scoping) checkItems(parsed.discovery_and_scoping);
      if (parsed.deep_research) checkItems(parsed.deep_research);
      if (parsed.data_analysis) checkItems(parsed.data_analysis);
      if (parsed.strategic_synthesis) checkItems(parsed.strategic_synthesis);
      if (parsed.executions) checkItems(parsed.executions);
      if (parsed.reviews) checkItems(parsed.reviews);
      if (parsed.completed) checkItems(parsed.completed);
      if (parsed.all) checkItems(parsed.all);

      if (!needsResync) {
        return parsed;
      }
    } catch (_) {}
  }
  return syncWorkspaceJson(tenantId)!;
}

export function listWorkspaceItemsFromJson(tenantId: string = 'default_user', subDir: string = ''): WorkspaceItem[] {
  let targetPath = subDir.trim();
  if (targetPath.includes('..')) {
    throw new Error('Security Violation: Path traversal attempt blocked.');
  }

  if (targetPath) {
    resolveUserPath(tenantId, targetPath);
  }

  const map = getWorkspaceMap(tenantId);
  const pathMap = new Map<string, WorkspaceItem>();

  const addItems = (list?: WorkspaceItem[]) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (item && item.path && !pathMap.has(item.path)) {
        pathMap.set(item.path, item);
      }
    }
  };

  if (map.discovery_and_scoping) addItems(map.discovery_and_scoping);
  if (map.deep_research) addItems(map.deep_research);
  if (map.data_analysis) addItems(map.data_analysis);
  if (map.strategic_synthesis) addItems(map.strategic_synthesis);
  if (map.executions) addItems(map.executions);
  if (map.reviews) addItems(map.reviews);
  if (map.completed) addItems(map.completed);
  if (map.all) addItems(map.all);
  if ((map as any).sources) addItems((map as any).sources.all);
  if ((map as any).deliverables) addItems((map as any).deliverables.all);

  const items = Array.from(pathMap.values());

  if (!targetPath || targetPath === 'workspace' || targetPath === '/') {
    return items;
  }

  const normSubDir = targetPath.replace(/\\/g, '/').replace(/\/$/, '');

  return items.filter(item => {
    const normItemPath = item.path.replace(/\\/g, '/');
    return normItemPath === normSubDir || normItemPath.startsWith(normSubDir + '/');
  });
}

export function createWorkspaceItem(
  tenantId: string = 'default_user',
  params: {
    path: string;
    content?: string;
    type?: string;
    source_type?: 'Generated' | 'Imported';
    level?: WorkspaceItemLevel;
    description?: string;
    when_to_use?: string;
    triggers?: string[];
    isImport?: boolean;
  }
): { path: string; size: number; item: WorkspaceItem } {
  const { path: relPath, content = '', type, source_type, level, description, when_to_use, triggers, isImport = false } = params;

  const resolvedSourceType: 'Generated' | 'Imported' = source_type || (isImport || type === 'imported' ? 'Imported' : 'Generated');

  const writeRes = writeUserFile(tenantId, relPath, content, isImport, {
    type,
    source_type: resolvedSourceType,
    level,
    description,
    when_to_use,
    triggers
  });

  const filename = path.basename(relPath);

  const item: WorkspaceItem = {
    name: filename,
    path: relPath,
    isDirectory: false,
    type: type || (isImport ? 'imported' : 'file'),
    source_type: resolvedSourceType,
    level: level || { maturity: isImport ? 'draft' : 'production', readability: 'high' },
    description: description || `Workspace file: ${filename}`,
    when_to_use: when_to_use || `Referenced when processing ${filename} in mission or workspace tasks`,
    triggers: triggers || [filename, isImport ? 'import' : 'file'],
    size: writeRes.size,
    modified_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  syncWorkspaceJson(tenantId);

  return {
    path: writeRes.path,
    size: writeRes.size,
    item
  };
}

export function getWorkspaceArtifactsFromIndex(
  tenantId: string = 'default_user',
  existingMission?: { sources?: Array<{ path: string; processed?: boolean }>; deliverables?: Array<{ path: string; processed?: boolean }>; workspace_files?: Array<{ path: string; processed?: boolean; name?: string }> } | any
) {
  const map = getWorkspaceMap(tenantId);
  const processedMap = new Map<string, boolean>();
  if (existingMission) {
    (existingMission.sources || []).forEach((s: any) => processedMap.set(s.path, s.processed));
    (existingMission.deliverables || []).forEach((d: any) => processedMap.set(d.path, d.processed));
    (existingMission.workspace_files || []).forEach((w: any) => processedMap.set(w.path, (w as any).processed || false));
  }

  const allItems = map.all || [];
  const workspaceFiles = allItems.map(item => ({
    name: item.name,
    path: item.path,
    isDirectory: item.isDirectory,
    type: item.type,
    source_type: item.source_type,
    level: item.level,
    description: item.description,
    when_to_use: item.when_to_use,
    triggers: item.triggers,
    processed: processedMap.get(item.path) || false,
    size: item.size,
    modified_at: item.modified_at
  }));

  return { workspaceFiles, sources: workspaceFiles, deliverables: workspaceFiles };
}

const PROTECTED_SECURITY_FILES = ['keys.json', 'auth.json', 'key_pools.json', '.env', '.env.local', '.env.production', 'secrets.json'];

export function isProtectedSecurityPath(filePath: string): boolean {
  const norm = filePath.replace(/\\/g, '/').toLowerCase();
  const baseName = path.basename(norm);
  return (
    PROTECTED_SECURITY_FILES.includes(baseName) ||
    norm.includes('.stash') ||
    norm.includes('/.stash/') ||
    baseName.startsWith('.env')
  );
}

export function resolveUserPath(tenantId: string, relativePath: string = ''): string {
  const userRoot = getTenantRoot(tenantId);
  const resolved = path.resolve(userRoot, relativePath);

  if (!resolved.startsWith(userRoot)) {
    throw new Error(`Security Violation: Access denied outside tenant workspace boundary (${userRoot}).`);
  }

  const relFromRoot = path.relative(userRoot, resolved);
  if (isProtectedSecurityPath(relFromRoot)) {
    throw new Error(`Security Violation: Access denied to protected server security/key store file (${path.basename(resolved)}). Server keys and key pools are strictly isolated.`);
  }

  return resolved;
}

export function listUserFiles(tenantId: string = 'default_user', subDir: string = ''): UserFileItem[] {
  ensureUserHarness(tenantId);
  const targetDir = resolveUserPath(tenantId, subDir);
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) return [];

  const userRoot = getTenantRoot(tenantId);
  const entries = fs.readdirSync(targetDir, { withFileTypes: true });

  return entries
    .filter(entry => {
      const relPath = path.relative(userRoot, path.join(targetDir, entry.name));
      return !isProtectedSecurityPath(relPath) && !entry.name.startsWith('.');
    })
    .map(entry => {
      const fullPath = path.join(targetDir, entry.name);
      const relPath = path.relative(userRoot, fullPath);
      let size = 0;
      let updatedAt = new Date().toISOString();
      try {
        const stats = fs.statSync(fullPath);
        size = stats.size;
        updatedAt = stats.mtime.toISOString();
      } catch (_) {}

      return {
        name: entry.name,
        relativePath: relPath,
        isDirectory: entry.isDirectory(),
        size,
        updatedAt
      };
    });
}

export function readUserFile(tenantId: string, relativePath: string): { content: string; path: string; size: number } {
  const targetPath = resolveUserPath(tenantId, relativePath);
  if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
    throw new Error(`File not found or is a directory: ${relativePath}`);
  }
  const content = fs.readFileSync(targetPath, 'utf8');
  const userRoot = getTenantRoot(tenantId);
  return {
    content,
    path: path.relative(userRoot, targetPath),
    size: Buffer.byteLength(content, 'utf8')
  };
}

export function writeUserFile(
  tenantId: string,
  relativePath: string,
  content: string,
  _isImport: boolean = false,
  _options?: {
    type?: string;
    source_type?: 'Generated' | 'Imported';
    level?: WorkspaceItemLevel;
    description?: string;
    when_to_use?: string;
    triggers?: string[];
  }
): { path: string; size: number } {
  const targetPath = resolveUserPath(tenantId, relativePath);
  const parentDir = path.dirname(targetPath);
  fs.mkdirSync(parentDir, { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf8');

  const userRoot = getTenantRoot(tenantId);
  const normPath = path.relative(userRoot, targetPath);
  const size = Buffer.byteLength(content, 'utf8');

  appendTenantAuditLog(tenantId, {
    type: 'user',
    event: 'File Written',
    details: { path: normPath, size }
  });

  return {
    path: normPath,
    size
  };
}

export function moveUserFile(tenantId: string, srcRelativePath: string, destRelativePath: string): { src: string; dest: string; size: number } {
  const srcPath = resolveUserPath(tenantId, srcRelativePath);
  const destPath = resolveUserPath(tenantId, destRelativePath);

  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source file or folder does not exist: ${srcRelativePath}`);
  }

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.renameSync(srcPath, destPath);

  const userRoot = getTenantRoot(tenantId);
  const normSrc = path.relative(userRoot, srcPath);
  const normDest = path.relative(userRoot, destPath);

  let size = 0;
  try { size = fs.statSync(destPath).size; } catch (_) {}

  return { src: normSrc, dest: normDest, size };
}

export function deleteUserFile(tenantId: string, relativePath: string): boolean {
  const targetPath = resolveUserPath(tenantId, relativePath);
  if (!fs.existsSync(targetPath)) return false;

  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(targetPath);
  }

  return true;
}
