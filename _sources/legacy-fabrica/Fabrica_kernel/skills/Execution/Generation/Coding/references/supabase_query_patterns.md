# Supabase Query Patterns

## What
RLS-safe Supabase client query patterns for SELECT, INSERT, UPDATE, DELETE, and JSONB field patching on the Fabrica database.

## When
Referenced by build mode's `api_route_rules.md` and `type_design_rules.md` when writing any database interaction code.

## Client Initialization (Lazy, Server-Side Only)
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Initialized lazily — only when first called, not at module load
let _supabase: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE
    if (!url || !key) throw new Error('Missing Supabase credentials')
    _supabase = createClient(url, key)
  }
  return _supabase
}
```

## SELECT with user_id Filter
```typescript
const { data, error } = await getSupabase()
  .from('missions')
  .select('id, title, status, phase, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
```

## INSERT with user_id
```typescript
const { data, error } = await getSupabase()
  .from('missions')
  .insert({ user_id: userId, title, objective, type, status: 'drafting', phase: 'analytics_1' })
  .select()
  .single()
```

## PATCH Specific JSONB Field (Write-Safe)
```typescript
// Update only qa_state — never overwrite the entire row
const { error } = await getSupabase()
  .from('missions')
  .update({ qa_state: newQaState, updated_at: new Date().toISOString() })
  .eq('id', missionId)
  .eq('user_id', userId) // Always include user_id in updates
```

## Text Search on raw_data
```typescript
const { data, error } = await getSupabase()
  .from('raw_data')
  .select('id, name, metadata')
  .eq('user_id', userId)
  .ilike('name', `%${searchTerm}%`)
```
