export interface KeyPoolItem {
  id: string;
  key: string;
  provider: string;
  label?: string;
  status: 'active' | 'quota_exceeded' | 'invalid';
  addedAt: string;
}

export interface AuthTier {
  id: 'free' | 'power' | 'enterprise' | 'paug';
  name: string;
  byokActive: boolean;
  cardVerified: boolean;
  customApiKey?: string;
  customProvider?: string;
}

export interface AuthQuota {
  tenantId: string;
  tier: string;
  requestsUsed: number;
  requestsLimit: number;
  tokensUsed: number;
  tokensLimit: number;
  resetAt: string;
}
