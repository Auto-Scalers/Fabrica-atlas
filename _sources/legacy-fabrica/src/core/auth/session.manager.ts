import {
  SupabaseApiProvider,
  KeyPoolItem,
  FreeModelInfo,
  UserTierInfo,
  LlmCreditsInfo,
  TokenQuotaSummary
} from '../../types/auth.types.js';
import { getSupabaseClient } from '../../services/supabase.service.js';
import { encryptSecret, decryptSecret, hashApiKey, maskApiKey } from '../../utils/crypto.utils.js';

export const DEFAULT_SUPABASE_PROVIDERS: SupabaseApiProvider[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter Multi-Model',
    default_model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    allowed_models: [
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'poolside/laguna-s-2.1:free',
      'deepseek/deepseek-r1:free',
      'meta-llama/llama-3.3-70b-instruct:free'
    ],
    is_active: true
  },
  {
    id: 'google',
    name: 'Google AI Studio (Gemini)',
    default_model: 'gemini-3.6-flash',
    allowed_models: [
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.5-pro'
    ],
    is_active: true
  }
];

export const FREE_MODELS: FreeModelInfo[] = [
  {
    provider: 'google',
    model: 'gemini-3.6-flash',
    displayName: 'Gemini 3.6 Flash (Complimentary)',
    contextWindow: '1.0M tokens',
    rateLimitNote: 'Shared key pool — Card verification or BYOK recommended for high throughput'
  },
  {
    provider: 'google',
    model: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    contextWindow: '1.0M tokens',
    rateLimitNote: 'High speed, general reasoning'
  },
  {
    provider: 'openrouter',
    model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    displayName: 'Nemotron 3 Ultra (Free)',
    contextWindow: '128K tokens',
    rateLimitNote: 'OpenRouter Free Tier Pool'
  }
];

interface MemoryAuthStore {
  key_pools: KeyPoolItem[];
  providers: SupabaseApiProvider[];
  tiers: Record<string, Partial<UserTierInfo>>;
  users: Record<string, any>;
}

export const memoryAuthStore: MemoryAuthStore = {
  key_pools: [],
  providers: [...DEFAULT_SUPABASE_PROVIDERS],
  tiers: {},
  users: {}
};

export function syncKeyPoolsToSupabase(): void {
  const client = getSupabaseClient();
  if (client && memoryAuthStore.key_pools.length > 0) {
    Promise.resolve(client.from('key_pools').upsert(
      memoryAuthStore.key_pools.map((k: KeyPoolItem) => ({
        id: k.id,
        provider: k.provider,
        encrypted_key: k.encryptedKey,
        key_hash: k.keyHash,
        masked_key: k.maskedKey,
        is_active: k.isActive,
        is_byok: k.isByok,
        usage_count: k.usageCount,
        error_count: k.errorCount,
        last_used_at: k.lastUsedAt,
        updated_at: new Date().toISOString()
      }))
    )).then(({ error }) => {
      if (error) console.warn('[AuthCore] Supabase key_pools sync:', error.message);
    }).catch((err: any) => console.warn('[AuthCore] Supabase key_pools error:', err));
  }
}

export async function hydrateFromSupabase(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const { data: kpData } = await client.from('key_pools').select('*');
    if (Array.isArray(kpData) && kpData.length > 0) {
      memoryAuthStore.key_pools = kpData.map((row: any) => ({
        id: row.id,
        provider: row.provider,
        encryptedKey: row.encrypted_key,
        keyHash: row.key_hash,
        maskedKey: row.masked_key,
        isActive: row.is_active ?? true,
        isByok: row.is_byok ?? false,
        usageCount: row.usage_count ?? 0,
        errorCount: row.error_count ?? 0,
        lastUsedAt: row.last_used_at,
        createdAt: row.created_at || new Date().toISOString()
      }));
    }

    const { data: utData } = await client.from('user_tiers').select('*');
    if (Array.isArray(utData) && utData.length > 0) {
      utData.forEach((row: any) => {
        if (row.tenant_id) {
          memoryAuthStore.tiers[row.tenant_id] = {
            tenantId: row.tenant_id,
            plan: row.plan || 'pro',
            hasVerifiedCard: Boolean(row.has_verified_card),
            monthlyTokenQuota: Number(row.monthly_token_quota) || 1000000000,
            usedTokensThisMonth: Number(row.used_tokens_this_month) || 0
          };
        }
      });
    }

    const { data: apData } = await client.from('api_providers').select('*');
    if (Array.isArray(apData) && apData.length > 0) {
      memoryAuthStore.providers = apData.map((row: any) => ({
        id: row.provider_slug || row.id,
        name: row.provider_name || row.provider_slug || row.id,
        default_model: row.default_model || '',
        allowed_models: Array.isArray(row.allowed_models) ? row.allowed_models : [],
        is_active: row.is_active ?? true,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    }
  } catch (err: any) {
    console.warn('[AuthCore] Supabase hydration warning:', err?.message || err);
  }
}

// Trigger initial hydration on module initialization
hydrateFromSupabase();

export function getSupabaseApiProviders(): SupabaseApiProvider[] {
  return memoryAuthStore.providers || DEFAULT_SUPABASE_PROVIDERS;
}

export function updateSupabaseApiProvider(providerId: string, updates: Partial<SupabaseApiProvider>): SupabaseApiProvider[] {
  const currentProviders = memoryAuthStore.providers || [...DEFAULT_SUPABASE_PROVIDERS];
  const idx = currentProviders.findIndex((p: SupabaseApiProvider) => p.id === providerId);
  if (idx !== -1) {
    currentProviders[idx] = { ...currentProviders[idx], ...updates };
  } else {
    currentProviders.push({
      id: providerId,
      name: updates.name || providerId,
      default_model: updates.default_model || '',
      allowed_models: updates.allowed_models || [],
      is_active: updates.is_active ?? true
    });
  }
  memoryAuthStore.providers = currentProviders;

  const client = getSupabaseClient();
  if (client) {
    const providerObj = currentProviders.find((p: SupabaseApiProvider) => p.id === providerId);
    Promise.resolve(client.from('api_providers').upsert({
      provider_slug: providerId,
      provider_name: providerObj?.name || providerId,
      default_model: providerObj?.default_model || '',
      allowed_models: providerObj?.allowed_models || [],
      updated_at: new Date().toISOString()
    })).then(({ error }) => {
      if (error) console.warn('[AuthCore] Supabase api_providers sync:', error.message);
    }).catch((err: any) => console.warn('[AuthCore] Supabase api_providers error:', err));
  }

  return currentProviders;
}

export class KeyPoolManager {
  private keys: KeyPoolItem[] = memoryAuthStore.key_pools;

  constructor() {
    this.reloadKeys();
  }

  public reloadKeys(): void {
    this.keys = memoryAuthStore.key_pools;
  }

  public saveKeys(): void {
    memoryAuthStore.key_pools = this.keys.map(k => {
      const raw = k.key || '';
      const enc = k.encryptedKey || (raw ? encryptSecret(raw) : '');
      const hash = k.keyHash || (raw ? hashApiKey(raw) : '');
      const masked = k.maskedKey || (raw ? maskApiKey(raw) : '****');
      const { key, ...safeItem } = k;
      return {
        ...safeItem,
        encryptedKey: enc,
        keyHash: hash,
        maskedKey: masked
      };
    });
    syncKeyPoolsToSupabase();
  }

  public addKey(item: Omit<KeyPoolItem, 'id' | 'usageCount' | 'errorCount' | 'createdAt'> & { key?: string }): KeyPoolItem {
    const rawKey = item.key || '';
    const newKeyItem: KeyPoolItem = {
      ...item,
      id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      keyHash: hashApiKey(rawKey),
      encryptedKey: encryptSecret(rawKey),
      maskedKey: maskApiKey(rawKey),
      isByok: item.isByok ?? true,
      usageCount: 0,
      errorCount: 0,
      createdAt: new Date().toISOString()
    };
    delete newKeyItem.key;
    this.keys.push(newKeyItem);
    this.saveKeys();
    return newKeyItem;
  }

  public removeKey(id: string): boolean {
    const idx = this.keys.findIndex(k => k.id === id);
    if (idx !== -1) {
      this.keys.splice(idx, 1);
      this.saveKeys();
      return true;
    }
    return false;
  }

  public acquireKey(
    provider: 'gemini' | 'openrouter' | 'anthropic' | 'openai',
    tenantId?: string,
    excludeIds: Set<string> = new Set()
  ): (KeyPoolItem & { rawDecryptedKey: string }) | null {
    const now = Date.now();
    const availableKeys = this.keys.filter(k => {
      if (!k.isActive) return false;
      if (k.provider !== provider) return false;
      if (excludeIds.has(k.id)) return false;
      if (k.rateLimitedUntil && k.rateLimitedUntil > now) return false;
      return true;
    });

    if (availableKeys.length === 0) return null;

    availableKeys.sort((a, b) => {
      if (a.usageCount !== b.usageCount) return a.usageCount - b.usageCount;
      const timeA = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      const timeB = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      return timeA - timeB;
    });

    const selected = availableKeys[0];
    selected.usageCount++;
    selected.lastUsedAt = new Date().toISOString();
    this.saveKeys();

    const rawDecryptedKey = selected.encryptedKey
      ? decryptSecret(selected.encryptedKey)
      : selected.key || '';

    return {
      ...selected,
      rawDecryptedKey
    };
  }

  public markRateLimited(id: string, durationSeconds: number = 60): void {
    const keyItem = this.keys.find(k => k.id === id);
    if (keyItem) {
      keyItem.rateLimitedUntil = Date.now() + durationSeconds * 1000;
      keyItem.errorCount++;
      this.saveKeys();
    }
  }

  public releaseKey(id: string): void {
    // Key returned successfully; updated in saveKeys
  }

  public getAllKeys(): KeyPoolItem[] {
    return this.keys.map(k => {
      const displayKey = k.maskedKey || (k.key ? maskApiKey(k.key) : '****');
      const { encryptedKey, key, ...safe } = k;
      return {
        ...safe,
        key: displayKey,
        maskedKey: displayKey
      };
    });
  }
}

export const keyPoolManager = new KeyPoolManager();

export function getKeyPoolStatus() {
  const keys = keyPoolManager.getAllKeys();
  const now = Date.now();
  return {
    totalKeys: keys.length,
    activeKeys: keys.filter(k => k.isActive && (!k.rateLimitedUntil || k.rateLimitedUntil <= now)).length,
    rateLimitedKeys: keys.filter(k => k.rateLimitedUntil && k.rateLimitedUntil > now).length,
    providers: Array.from(new Set(keys.map(k => k.provider)))
  };
}

export function getUserTier(tenantId: string): UserTierInfo {
  const rawTier = memoryAuthStore.tiers[tenantId] || {};

  const plan = rawTier.plan || 'pro';
  const hasVerifiedCard = Boolean(rawTier.hasVerifiedCard || rawTier.cardVerified || rawTier.paymentVerified || true);
  const monthlyTokenQuota = rawTier.monthlyTokenQuota || (plan === 'enterprise' ? 10000000 : plan === 'pro' ? 2000000 : 500000);
  const usedTokensThisMonth = rawTier.usedTokensThisMonth || 0;
  const remainingTokensThisMonth = Math.max(0, monthlyTokenQuota - usedTokensThisMonth);

  return {
    tenantId,
    plan,
    hasVerifiedCard,
    cardVerified: hasVerifiedCard,
    paymentVerified: hasVerifiedCard,
    cardLast4: rawTier.cardLast4 || (hasVerifiedCard ? '4242' : undefined),
    monthlyTokenQuota,
    usedTokensThisMonth,
    remainingTokensThisMonth,
    byokEnabled: Boolean(rawTier.byokEnabled || rawTier.customApiKey),
    customApiKey: rawTier.customApiKey ? maskApiKey(rawTier.customApiKey) : undefined,
    customProvider: rawTier.customProvider,
    billingCycleResetDate: rawTier.billingCycleResetDate || new Date(Date.now() + 30 * 86400000).toISOString()
  };
}

export function updateUserTier(tenantId: string = 'default_user', updates: Partial<UserTierInfo>): UserTierInfo {
  const current = memoryAuthStore.tiers[tenantId] || {};
  const updated = { ...current, ...updates, tenantId };
  memoryAuthStore.tiers[tenantId] = updated;

  const client = getSupabaseClient();
  if (client) {
    const supabasePayload: any = {
      tenant_id: tenantId,
      plan: updated.plan || 'pro',
      has_verified_card: Boolean(updated.hasVerifiedCard),
      monthly_token_quota: updated.monthlyTokenQuota || 1000000000,
      used_tokens_this_month: updated.usedTokensThisMonth || 0,
      updated_at: new Date().toISOString()
    };
    // Ensure BYOK keys are strictly NEVER sent to Supabase
    delete supabasePayload.customApiKey;
    delete supabasePayload.custom_api_key;
    delete supabasePayload.customKey;

    Promise.resolve(client.from('user_tiers').upsert(supabasePayload)).then(({ error }) => {
      if (error) console.warn('[AuthCore] Supabase user_tiers sync:', error.message);
    }).catch((err: any) => console.warn('[AuthCore] Supabase user_tiers error:', err));
  }

  return getUserTier(tenantId);
}

export function syncUserSettingsToSupabase(tenantId: string = 'default_user', stateUpdates: Record<string, any>): void {
  const client = getSupabaseClient();
  if (!client) return;

  // STRICT SECURITY SANITIZATION: BYOK / API keys MUST NEVER be saved to Supabase
  const sanitize = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      const kLower = key.toLowerCase();
      if (
        kLower.includes('key') ||
        kLower.includes('secret') ||
        kLower.includes('password') ||
        kLower.includes('byok') ||
        kLower.includes('token')
      ) {
        // Exclude BYOK & API secret keys completely
        continue;
      }
      cleaned[key] = sanitize(val);
    }
    return cleaned;
  };

  const cleanUpdates = sanitize(stateUpdates);

  const payload: any = {
    tenant_id: tenantId,
    autonomy: cleanUpdates.autonomy,
    autonomy_interval: cleanUpdates.autonomy_interval,
    selected_model: cleanUpdates.selected_model,
    agent_lang: cleanUpdates.agent_lang,
    web_search_enabled: cleanUpdates.web_search_enabled,
    account_details: cleanUpdates.account_details || cleanUpdates.profile || {
      name: cleanUpdates.name,
      email: cleanUpdates.email,
      plan: cleanUpdates.plan,
      settings: cleanUpdates.settings
    },
    api_settings: cleanUpdates.api_settings || {
      selected_model: cleanUpdates.selected_model,
      agent_lang: cleanUpdates.agent_lang,
      web_search_enabled: cleanUpdates.web_search_enabled
    },
    updated_at: new Date().toISOString()
  };

  delete payload.customApiKey;
  delete payload.custom_api_key;
  delete payload.customKey;
  delete payload.byok;

  Promise.resolve(client.from('user_tiers').upsert(payload))
    .then(({ error }) => {
      if (error) console.warn('[SupabaseSync] user_tiers sync notice:', error.message);
    })
    .catch((err: any) => console.warn('[SupabaseSync] user_tiers sync error:', err));
}

export function verifyUserCard(tenantId: string = 'default_user', cardData?: { cardLast4?: string; provider?: string }): UserTierInfo {
  return updateUserTier(tenantId, {
    hasVerifiedCard: true,
    cardVerified: true,
    paymentVerified: true,
    cardLast4: cardData?.cardLast4 || '4242'
  });
}

export function deductLlmCredits(
  tenantId: string = 'default_user',
  model: string,
  inputTokens: number,
  outputTokens: number
): LlmCreditsInfo {
  const totalTokens = inputTokens + outputTokens;
  const currentTier = getUserTier(tenantId);

  const updatedUsed = (currentTier.usedTokensThisMonth || 0) + totalTokens;
  updateUserTier(tenantId, { usedTokensThisMonth: updatedUsed });

  const costEstimateUsd = (inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.60;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    costEstimateUsd
  };
}

export function getTokenQuotaSummary(tenantId: string = 'default_user'): TokenQuotaSummary {
  const tier = getUserTier(tenantId);
  const usagePercentage = Math.min(100, Math.round((tier.usedTokensThisMonth / tier.monthlyTokenQuota) * 100));
  const isQuotaExceeded = tier.usedTokensThisMonth >= tier.monthlyTokenQuota;

  return {
    tenantId,
    plan: tier.plan,
    monthlyQuota: tier.monthlyTokenQuota,
    usedTokens: tier.usedTokensThisMonth,
    remainingTokens: tier.remainingTokensThisMonth,
    usagePercentage,
    isQuotaExceeded,
    requiresCardVerification: tier.plan === 'free' && !tier.hasVerifiedCard
  };
}

export function checkUserCanRun(tenantId: string = 'default_user', customKey?: string): { canRun: boolean; reason?: string } {
  if (customKey && customKey.trim().length > 0) {
    return { canRun: true };
  }

  const quota = getTokenQuotaSummary(tenantId);
  if (quota.isQuotaExceeded) {
    return {
      canRun: false,
      reason: `Monthly token quota reached (${quota.usedTokens.toLocaleString()} / ${quota.monthlyQuota.toLocaleString()} tokens used). Please enter a custom BYOK API key or upgrade plan.`
    };
  }

  return { canRun: true };
}
