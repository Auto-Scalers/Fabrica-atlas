import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import {
  getMissions,
  getMission,
  createMission,
  updateMission,
  deleteMission,
  getMissionSchema,
  getMissionsData
} from '../core/missions.js';

const router = Router();

// GET /api/missions — List all missions
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const missions = getMissions(tenantId);
  res.json({ ok: true, missions });
});

// GET /api/missions/data — List missions with pendings & actions
router.get('/data', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const storeData = getMissionsData(tenantId);
  res.json({ ok: true, ...storeData });
});

// POST /api/missions/create — Create new mission
router.post('/create', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const body = req.body || {};
  const mission = createMission(tenantId, body);
  res.json({ ok: true, mission });
});

// POST /api/missions/update — Update mission
router.post('/update', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { id, ...updates } = req.body || {};
  if (!id) {
    res.status(400).json({ ok: false, error: 'Mission ID is required.' });
    return;
  }
  const updated = updateMission(tenantId, id, updates);
  if (!updated) {
    res.status(404).json({ ok: false, error: 'Mission not found.' });
    return;
  }
  res.json({ ok: true, mission: updated });
});

// POST /api/missions/delete — Delete mission
router.post('/delete', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { id } = req.body || {};
  if (!id) {
    res.status(400).json({ ok: false, error: 'Mission ID is required.' });
    return;
  }
  const deleted = deleteMission(tenantId, id);
  res.json({ ok: deleted });
});

// GET /api/missions/schema — Get mission schema definition
router.get('/schema', (req: AuthenticatedRequest, res: Response) => {
  const type = (req.query.type as string) || 'standard';
  const schema = getMissionSchema(type);
  res.json({ ok: true, schema });
});

// GET /api/missions/:id — Get details for <mission_id>.json in user GCS /missions/
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const missionId = req.params.id;
  const mission = getMission(tenantId, missionId);
  if (!mission) {
    res.status(404).json({ ok: false, error: 'Mission details file not found.' });
    return;
  }
  res.json({ ok: true, mission });
});

export default router;
