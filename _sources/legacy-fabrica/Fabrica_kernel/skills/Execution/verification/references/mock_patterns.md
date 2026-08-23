# Mock Patterns

## What
Mocking strategies for Supabase, Express route handlers, and external APIs in test suites.

## When
Referenced by test mode's `scenario_rules.md` when writing test scenarios that must isolate the unit under test from external dependencies.

## Mock Supabase (Vitest)
```typescript
import { vi, describe, it, expect } from 'vitest'

// Per-test mock — override default setup
const mockSelect = vi.fn().mockResolvedValue({ data: [{ id: '1', title: 'Test Mission' }], error: null })
vi.mock('../components/auth/supabase', () => ({
  getSupabase: () => ({ from: () => ({ select: mockSelect, eq: vi.fn().mockReturnThis() }) })
}))

describe('getMissions', () => {
  it('returns missions for valid userId', async () => {
    const result = await getMissions('user-123')
    expect(result).toHaveLength(1)
    expect(mockSelect).toHaveBeenCalled()
  })
})
```

## Mock Express Route (Supertest)
```typescript
import request from 'supertest'
import app from '../server'

describe('GET /api/missions', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/missions')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Unauthorized')
  })

  it('returns missions with valid token', async () => {
    const res = await request(app)
      .get('/api/missions')
      .set('Authorization', 'Bearer valid-test-token')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeInstanceOf(Array)
  })
})
```

## Mock External API (fetch)
```typescript
import { vi } from 'vitest'

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ result: [{ id: 1, name: 'Test Partner' }] })
} as Response)
```
