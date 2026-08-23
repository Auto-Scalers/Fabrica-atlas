import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { getTenantRoot } from '../core/tenant.js';
import {
  getOrCreateTenantRunnerUrl,
  proxyTurnToRunnerStream,
  proxyTurnToRunner
} from '../services/cloudrun.orchestrator.js';
import {
  stopPiAgent,
  listPiDaemons,
  listPiSessions,
  createPiSession,
  deletePiSession,
  listPiModels,
  getPiProcessLogs,
  ensureUserHarness,
  getHarnessState,
  updateHarnessState,
  appendUserAction,
  removeReviewItem,
  setReviewItemFeedback
} from '../core/harness.js';

const router = Router();

// POST /api/harness/run-stream — Stream prompt execution via SSE strictly via dedicated runner container
router.post('/run-stream', async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { prompt, sessionId, model, customKey, agentLang, webSearchEnabled, thinkingLevel } = req.body || {};

  if (!prompt) {
    res.status(400).json({ ok: false, error: 'Prompt is required.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  try {
    const runnerUrl = await getOrCreateTenantRunnerUrl(tenantId);
    if (!runnerUrl) {
      throw new Error(`Dedicated tenant runner container is unavailable for tenant ${tenantId}.`);
    }

    await proxyTurnToRunnerStream(runnerUrl, {
      prompt,
      tenantId,
      sessionId,
      model,
      customKey,
      agentLang,
      webSearchEnabled,
      thinkingLevel
    }, (chunkData: string) => {
      res.write(chunkData);
    });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ ok: false, error: err.message, text: err.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// POST /api/harness/run — Run prompt with Pi agent strictly via dedicated runner container
router.post('/run', async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { prompt, sessionId, model, customKey, agentLang, webSearchEnabled, thinkingLevel } = req.body || {};

  if (!prompt) {
    res.status(400).json({ ok: false, error: 'Prompt is required.' });
    return;
  }

  try {
    const runnerUrl = await getOrCreateTenantRunnerUrl(tenantId);
    if (!runnerUrl) {
      throw new Error(`Dedicated tenant runner container is unavailable for tenant ${tenantId}.`);
    }

    const response = await proxyTurnToRunner(runnerUrl, {
      prompt,
      tenantId,
      sessionId,
      model,
      customKey,
      agentLang,
      webSearchEnabled,
      thinkingLevel
    });
    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      text: `Execution failed: ${err.message}`,
      error: err.message
    });
  }
});

// GET /api/harness/daemons — List active daemon process(es)
router.get('/daemons', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const daemons = listPiDaemons(tenantId);
  res.json({ ok: true, daemons });
});

// POST /api/harness/stop — Stop active agent process
router.post('/stop', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { sessionId } = req.body || {};
  const stopped = stopPiAgent(tenantId, sessionId);
  res.json({ ok: stopped });
});

// GET /api/harness/sessions — List sessions
router.get('/sessions', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const sessions = listPiSessions(tenantId);
  res.json({ ok: true, sessions });
});

// POST /api/harness/sessions/create — Create new session
router.post('/sessions/create', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { name } = req.body || {};
  const session = createPiSession(tenantId, name);
  res.json({ ok: true, session });
});

// POST /api/harness/sessions/delete — Delete session
router.post('/sessions/delete', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { sessionId } = req.body || {};
  if (!sessionId) {
    res.status(400).json({ ok: false, error: 'sessionId is required.' });
    return;
  }
  const deleted = deletePiSession(tenantId, sessionId);
  res.json({ ok: deleted });
});

// GET /api/harness/models — List available LLM models
router.get('/models', (req: AuthenticatedRequest, res: Response) => {
  const models = listPiModels();
  res.json({ ok: true, models });
});

// GET /api/harness/logs — Get process execution logs
router.get('/logs', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const logs = getPiProcessLogs(tenantId);
  res.json({ ok: true, logs });
});

// GET /api/harness/skills — List built-in kernel skills AND workspace user skills
router.get('/skills', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId || 'default_user';
  try {
    const userRoot = getTenantRoot(tenantId);
    const candidateKernelSkillsDirs = [
      path.join(userRoot, 'Fabrica_kernel', 'skills'),
      '/mnt/Fabrica_kernel/skills',
      '/Fabrica_kernel/skills',
      path.join(process.cwd(), 'Fabrica_kernel', 'skills')
    ];
    const kernelSkillsDir = candidateKernelSkillsDirs.find(d => fs.existsSync(d)) || candidateKernelSkillsDirs[candidateKernelSkillsDirs.length - 1];
    const userSkillsDir = path.join(userRoot, '.pi', 'skills');

    const skills: {
      name: string;
      path: string;
      category: string;
      isMain: boolean;
      metadata: Record<string, string>;
    }[] = [];

    const parseYamlOrMd = (content: string): { what: string; when: string; why: string; triggers: string; inputs: string; outputs: string } => {
      const meta = {
        what: '', when: '', why: '', triggers: '', inputs: '', outputs: ''
      };
      if (!content) return meta;
      if (content.trim().startsWith('---')) {
        const endYaml = content.indexOf('---', 3);
        if (endYaml !== -1) {
          const yamlStr = content.slice(3, endYaml);
          for (const line of yamlStr.split('\n')) {
            const idx = line.indexOf(':');
            if (idx !== -1) {
              const key = line.slice(0, idx).trim().toLowerCase();
              const val = line.slice(idx + 1).trim();
              if ((key === 'what' || key === 'description' || key === 'name') && !meta.what) meta.what = val;
              if ((key === 'when' || key === 'when_to_use') && !meta.when) meta.when = val;
              if ((key === 'why' || key === 'rationale' || key === 'purpose') && !meta.why) meta.why = val;
              if ((key === 'triggers' || key === 'trigger_keywords' || key === 'keywords') && !meta.triggers) meta.triggers = val;
              if ((key === 'inputs' || key === 'input' || key === 'params') && !meta.inputs) meta.inputs = val;
              if ((key === 'outputs' || key === 'output' || key === 'results') && !meta.outputs) meta.outputs = val;
            }
          }
        }
      }
      return meta;
    };

    const scanSkillsDir = (dir: string, baseDir: string, defaultCategory: string) => {
      if (!fs.existsSync(dir)) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const skillMdPath = path.join(fullPath, 'SKILL.md');
            if (fs.existsSync(skillMdPath)) {
              const relPath = path.relative(baseDir, fullPath);
              const pathParts = relPath.split(path.sep);
              const category = pathParts.length > 1 ? pathParts[0] : defaultCategory;
              const isMain = pathParts.length === 1;
              let metadata = { what: '', when: '', why: '', triggers: '', inputs: '', outputs: '' };
              try {
                const content = fs.readFileSync(skillMdPath, 'utf-8');
                metadata = parseYamlOrMd(content);
              } catch (e) {}

              skills.push({
                name: entry.name,
                path: relPath,
                category,
                isMain,
                metadata
              });
            }
            scanSkillsDir(fullPath, baseDir, defaultCategory);
          }
        }
      } catch (_) {}
    };

    scanSkillsDir(kernelSkillsDir, kernelSkillsDir, 'kernel');
    scanSkillsDir(userSkillsDir, userSkillsDir, 'workspace');

    res.json({ ok: true, skills });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message, skills: [] });
  }
});

// POST /api/harness/skills — Create or update user skill in .pi/skills/
router.post('/skills', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId || 'default_user';
  const { name, content, metadata } = req.body || {};
  if (!name) {
    res.status(400).json({ ok: false, error: 'Skill name is required.' });
    return;
  }
  try {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9_\-]/g, '_');
    const userRoot = getTenantRoot(tenantId);
    const skillDir = path.join(userRoot, '.pi', 'skills', cleanName);
    fs.mkdirSync(skillDir, { recursive: true });

    const skillMdPath = path.join(skillDir, 'SKILL.md');
    const initialContent = content || `---
name: ${cleanName}
description: ${metadata?.what || 'Custom workspace skill'}
when_to_use: ${metadata?.when || 'When requested by user'}
triggers: ${metadata?.triggers || cleanName}
---

# ${cleanName}
${metadata?.why || 'Created via Fabrica UI.'}
`;
    fs.writeFileSync(skillMdPath, initialContent, 'utf8');
    res.json({ ok: true, name: cleanName, path: `.pi/skills/${cleanName}` });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/harness/config — Get harness config
router.get('/config', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const info = ensureUserHarness(tenantId);
  res.json({ ok: true, config: info.config });
});

// GET /api/harness/state — Get harness realtime json state
router.get('/state', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const state = getHarnessState(tenantId);
  res.json({ ok: true, harness: state });
});

// POST /api/harness/state — Update harness realtime json state
router.post('/state', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const updates = req.body || {};
  const updated = updateHarnessState(tenantId, updates);
  res.json({ ok: true, harness: updated });
});

// POST /api/harness/user-action — Append a user action to new_user_actions in harness.json
router.post('/user-action', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { category, action } = req.body || {};
  if (!category || !action) {
    res.status(400).json({ ok: false, error: 'category and action are required.' });
    return;
  }
  appendUserAction(tenantId, category, action);
  res.json({ ok: true });
});

// POST /api/harness/reviews/ignore — Remove a pending review item
router.post('/reviews/ignore', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { itemId } = req.body || {};
  if (!itemId) { res.status(400).json({ ok: false, error: 'itemId is required.' }); return; }
  removeReviewItem(tenantId, itemId);
  res.json({ ok: true });
});

// POST /api/harness/reviews/feedback — Set feedback on review item (marks as reviewed)
router.post('/reviews/feedback', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { itemId, feedback } = req.body || {};
  if (!itemId) { res.status(400).json({ ok: false, error: 'itemId is required.' }); return; }
  setReviewItemFeedback(tenantId, itemId, feedback || '');
  res.json({ ok: true });
});

export default router;
