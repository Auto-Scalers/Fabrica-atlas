import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import {
  readUserFile,
  writeUserFile,
  moveUserFile,
  deleteUserFile,
  getWorkspaceMap,
  syncWorkspaceJson,
  listWorkspaceItemsFromJson,
  createWorkspaceItem
} from '../core/workspace.js';

const router = Router();

// GET /api/workspace/files — List workspace files from workspace-graph.json index with path sanitization
router.get('/files', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const subDir = (req.query.path as string) || '';
  try {
    const files = listWorkspaceItemsFromJson(tenantId, subDir);
    res.json({ ok: true, files });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/workspace/create — Create/Import workspace item
router.post('/create', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { path: filePath, content, type, source_type, level, description, when_to_use, triggers, isImport } = req.body || {};
  if (!filePath) {
    res.status(400).json({ ok: false, error: 'Path is required.' });
    return;
  }
  try {
    const result = createWorkspaceItem(tenantId, {
      path: filePath,
      content: content || '',
      type,
      source_type,
      level,
      description,
      when_to_use,
      triggers,
      isImport: Boolean(isImport)
    });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// GET /api/workspace/file/read — Read file contents
router.get('/file/read', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ ok: false, error: 'File path is required.' });
    return;
  }
  try {
    const fileData = readUserFile(tenantId, filePath);
    res.json({ ok: true, ...fileData });
  } catch (err: any) {
    res.status(404).json({ ok: false, error: err.message });
  }
});

// POST /api/workspace/file/write — Write file contents
router.post('/file/write', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { path: filePath, content, isImport, type, source_type, level, description, when_to_use, triggers } = req.body || {};
  if (!filePath || content === undefined) {
    res.status(400).json({ ok: false, error: 'Path and content are required.' });
    return;
  }
  try {
    const result = writeUserFile(tenantId, filePath, content, Boolean(isImport), {
      type,
      source_type,
      level,
      description,
      when_to_use,
      triggers
    });
    syncWorkspaceJson(tenantId);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/workspace/file/move — Move file or directory
router.post('/file/move', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { src, dest } = req.body || {};
  if (!src || !dest) {
    res.status(400).json({ ok: false, error: 'src and dest paths are required.' });
    return;
  }
  try {
    const result = moveUserFile(tenantId, src, dest);
    syncWorkspaceJson(tenantId);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// POST /api/workspace/file/delete — Delete file or directory
router.post('/file/delete', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { path: filePath } = req.body || {};
  if (!filePath) {
    res.status(400).json({ ok: false, error: 'Path is required.' });
    return;
  }
  try {
    const deleted = deleteUserFile(tenantId, filePath);
    syncWorkspaceJson(tenantId);
    res.json({ ok: deleted });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// GET /api/workspace/map — Get single workspace-graph.json map
router.get('/map', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const map = getWorkspaceMap(tenantId);
  res.json({ ok: true, map });
});

export default router;
