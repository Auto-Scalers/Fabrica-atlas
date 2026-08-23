# Caching Patterns

## What
Server-side caching strategies for the Express/Supabase stack — in-memory caching, cache invalidation triggers, and TTL management.

## When
Referenced by optimization mode's `performance_rules.md` when a frequently read value has high query cost and low mutation frequency.

## In-Memory Cache (Simple, Single-Instance)
```typescript
// src/lib/cache.ts
const cache = new Map<string, { value: any; expiresAt: number }>()

export function setCache(key: string, value: any, ttlMs: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.value as T
}

export function invalidateCache(keyPrefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) cache.delete(key)
  }
}
```

## Cache Usage Pattern
```typescript
// In a service function
export async function getMissions(userId: string) {
  const cacheKey = `missions:${userId}`
  const cached = getCache<Mission[]>(cacheKey)
  if (cached) return cached

  const { data } = await getSupabase()
    .from('missions').select('*').eq('user_id', userId)

  setCache(cacheKey, data, 30_000) // 30 second TTL
  return data
}

// Invalidate on write
export async function updateMission(userId: string, id: string, updates: Partial<Mission>) {
  await getSupabase().from('missions').update(updates).eq('id', id).eq('user_id', userId)
  invalidateCache(`missions:${userId}`) // Clear user's mission cache
}
```

## What NOT to Cache
- Authentication tokens (always re-validate from Supabase)
- Raw user data that changes frequently
- Database records that require real-time accuracy for business decisions
