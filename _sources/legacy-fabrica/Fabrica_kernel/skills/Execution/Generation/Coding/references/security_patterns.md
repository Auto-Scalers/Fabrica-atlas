# Security Patterns

## What
Input validation, environment key encapsulation, RLS hardening, and injection prevention patterns for the Fabrica stack.

## When
Referenced by optimization mode's `security_rules.md` when hardening any route, service, or database interaction.

## Input Validation (Zod)
```typescript
import { z } from 'zod'

const CreateMissionSchema = z.object({
  title: z.string().min(1).max(200),
  objective: z.string().max(2000).optional(),
  type: z.enum(['standard', 'system_build', 'system_build_from_data', 'system_optimization', 'system_optimization_from_data', 'system_test', 'system_test_from_data'])
})

// In route handler
const parsed = CreateMissionSchema.safeParse(req.body)
if (!parsed.success) {
  return res.status(400).json({ data: null, error: parsed.error.flatten() })
}
const { title, objective, type } = parsed.data
```

## Environment Key Guard
```typescript
// Never initialize with missing keys — log warn and skip
function initExternalClient(name: string, urlKey: string, tokenKey: string) {
  const url = process.env[urlKey]
  const token = process.env[tokenKey]
  if (!url || !token) {
    console.warn(`[WARN] ${name} disabled: missing ${!url ? urlKey : tokenKey}`)
    return null
  }
  return createClient(url, token)
}
```

## RLS Policy (PostgreSQL)
```sql
-- Ensure users only see their own data
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own missions" ON missions
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- For service role background processes (bypasses RLS — must filter manually)
-- Always add: .eq('user_id', targetUserId) even when using service role
```

## SQL Injection Prevention
```typescript
// NEVER do this:
const query = `SELECT * FROM missions WHERE title = '${userInput}'` // Injection risk

// ALWAYS use parameterized Supabase methods:
const { data } = await getSupabase()
  .from('missions')
  .select('*')
  .eq('title', userInput) // Safe — parameterized internally
```
