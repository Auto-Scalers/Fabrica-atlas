import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import {
  keyPoolManager,
  getKeyPoolStatus,
  getUserTier,
  updateUserTier,
  getTokenQuotaSummary,
  verifyUserCard,
  FREE_MODELS,
  getSupabaseApiProviders,
  updateSupabaseApiProvider
} from '../core/auth.js';

const router = Router();

// GET /api/auth/providers — Get admin-configured API providers with default and allowed models
router.get('/providers', (req: AuthenticatedRequest, res: Response) => {
  const providers = getSupabaseApiProviders();
  res.json({ ok: true, providers });
});

// POST /api/auth/providers/update — Admin update of provider default_model or allowed_models
router.post('/providers/update', (req: AuthenticatedRequest, res: Response) => {
  const { providerId, default_model, allowed_models, name, is_active } = req.body || {};
  if (!providerId) {
    res.status(400).json({ ok: false, error: 'providerId is required.' });
    return;
  }
  const updatedProviders = updateSupabaseApiProvider(providerId, {
    default_model,
    allowed_models,
    name,
    is_active
  });
  res.json({ ok: true, providers: updatedProviders });
});

// GET /api/auth/tier — Get user tier and token quota summary
router.get('/tier', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const tier = getUserTier(tenantId);
  res.json({ ok: true, tier });
});

// GET /api/auth/quota — Get token quota summary
router.get('/quota', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const quota = getTokenQuotaSummary(tenantId);
  res.json({ ok: true, quota });
});

// POST /api/auth/verify-card — Verify payment card for free tier complimentary access
router.post('/verify-card', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { cardLast4, provider } = req.body || {};
  const updatedTier = verifyUserCard(tenantId, { cardLast4, provider });
  res.json({ ok: true, message: 'Card verified successfully.', tier: updatedTier });
});

// POST /api/auth/byok — Update custom BYOK API key
router.post('/byok', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { customApiKey, customProvider } = req.body || {};
  const updated = updateUserTier(tenantId, {
    customApiKey,
    customProvider: customProvider || 'gemini',
    byokEnabled: Boolean(customApiKey)
  });
  res.json({ ok: true, tier: updated });
});

// GET /api/auth/key-pool — Get key pool status (masked keys)
router.get('/key-pool', (req: AuthenticatedRequest, res: Response) => {
  const keys = keyPoolManager.getAllKeys();
  const status = getKeyPoolStatus();
  const providers = getSupabaseApiProviders();
  res.json({ ok: true, status, keys, freeModels: FREE_MODELS, providers });
});

// POST /api/auth/key-pool/add — Add new BYOK API key to rotation pool
router.post('/key-pool/add', (req: AuthenticatedRequest, res: Response) => {
  const { key, provider, label, isByok } = req.body || {};
  if (!key || !provider) {
    res.status(400).json({ ok: false, error: 'Key and provider are required.' });
    return;
  }
  const added = keyPoolManager.addKey({
    key,
    provider,
    label: label || 'BYOK User Key',
    isActive: true,
    isByok: isByok !== undefined ? Boolean(isByok) : true
  });
  const { encryptedKey, ...safeKeyItem } = added;
  res.json({ ok: true, keyItem: { ...safeKeyItem, key: safeKeyItem.maskedKey || '****' } });
});

// POST /api/auth/key-pool/remove — Remove key from pool
router.post('/key-pool/remove', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.body || {};
  if (!id) {
    res.status(400).json({ ok: false, error: 'Key ID is required.' });
    return;
  }
  const removed = keyPoolManager.removeKey(id);
  res.json({ ok: removed });
});

export default router;
