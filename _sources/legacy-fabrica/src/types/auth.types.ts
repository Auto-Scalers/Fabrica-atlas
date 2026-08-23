export interface SupabaseApiProvider {
  id: string;
  name: string;
  default_model: string;
  allowed_models: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface KeyPoolItem {
  id: string;
  key?: string;
  keyHash?: string;
  encryptedKey?: string;
  maskedKey?: string;
  provider: 'gemini' | 'openrouter' | 'anthropic' | 'openai';
  modelTarget?: string;
  label?: string;
  isActive: boolean;
  isByok?: boolean;
  rateLimitedUntil?: number; // Epoch time ms
  usageCount: number;
  errorCount: number;
  lastUsedAt?: string;
  createdAt: string;
}

export interface FreeModelInfo {
  provider: string;
  model: string;
  displayName: string;
  contextWindow: string;
  rateLimitNote: string;
}

export interface UserTierInfo {
  tenantId: string;
  plan: 'free' | 'pro' | 'enterprise';
  hasVerifiedCard: boolean;
  cardVerified?: boolean;
  paymentVerified?: boolean;
  cardLast4?: string;
  monthlyTokenQuota: number;
  usedTokensThisMonth: number;
  remainingTokensThisMonth: number;
  byokEnabled: boolean;
  customApiKey?: string;
  customProvider?: string;
  billingCycleResetDate: string;
}

export interface LlmCreditsInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costEstimateUsd: number;
}

export interface TokenQuotaSummary {
  tenantId: string;
  plan: string;
  monthlyQuota: number;
  usedTokens: number;
  remainingTokens: number;
  usagePercentage: number;
  isQuotaExceeded: boolean;
  requiresCardVerification: boolean;
}

export interface AuthStoreData {
  key_pools: KeyPoolItem[];
  providers?: SupabaseApiProvider[];
  tiers: Record<string, Partial<UserTierInfo>>;
  users: Record<string, any>;
}
