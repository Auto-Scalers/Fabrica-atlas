import { request } from './client';

export const authApi = {
  getTier: (tenantId: string = 'default_user') => request<{ ok: boolean; tier: any }>(`/api/auth/tier?tenantId=${encodeURIComponent(tenantId)}`),
  getQuota: (tenantId: string = 'default_user') => request<{ ok: boolean; quota: any }>(`/api/auth/quota?tenantId=${encodeURIComponent(tenantId)}`),
  verifyCard: (cardLast4?: string, provider?: string) => request<{ ok: boolean; tier: any }>('/api/auth/verify-card', { method: 'POST', body: JSON.stringify({ cardLast4, provider }) }),
  updateByok: (customApiKey: string, customProvider?: string) => request<{ ok: boolean; tier: any }>('/api/auth/byok', { method: 'POST', body: JSON.stringify({ customApiKey, customProvider }) }),
  getKeyPool: () => request<{ ok: boolean; status: any; keys: any[]; freeModels: any[] }>('/api/auth/key-pool'),
  addKeyPoolItem: (key: string, provider: string, label?: string) => request<{ ok: boolean; keyItem: any }>('/api/auth/key-pool/add', { method: 'POST', body: JSON.stringify({ key, provider, label }) }),
  removeKeyPoolItem: (id: string) => request<{ ok: boolean }>('/api/auth/key-pool/remove', { method: 'POST', body: JSON.stringify({ id }) }),
  getProvidersConfig: () => request<{ ok: boolean; status?: any; keys?: any[]; freeModels?: any[] }>('/api/auth/key-pool').then(res => ({ ok: true, providers: {}, keys: res.keys || [] })),
  getProviders: () => request<{ ok: boolean; status?: any; keys?: any[]; freeModels?: any[] }>('/api/auth/key-pool').then(res => ({ ok: true, providers: {} })),
};
