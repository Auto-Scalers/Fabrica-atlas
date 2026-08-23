# TypeScript Patterns

## What
TypeScript interface, type, and configuration patterns specific to the Fabrica stack (Express + Next.js + Supabase).

## When
Referenced by build mode's `type_design_rules.md` during code generation when TypeScript-specific implementation decisions are needed.

## Core Patterns

### Supabase Type Generation
```typescript
// Generate types from your Supabase schema
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types' // generated via: supabase gen types typescript

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)
```

### Shared Mission Type
```typescript
export type MissionStatus = 'drafting' | 'planning' | 'execution' | 'archive'
export type MissionPhase = 'analytics_1' | 'research_1' | 'analytics_2' | 'qa' | 'analytics_3' | 'research_2' | 'analytics_4' | 'planning' | 'execution'
export type MissionType = 'standard' | 'system_build' | 'system_build_from_data' | 'system_optimization' | 'system_optimization_from_data' | 'system_test' | 'system_test_from_data'

export interface Mission {
  readonly id: string
  readonly user_id: string
  type: MissionType
  status: MissionStatus
  phase: MissionPhase
  title: string
  objective: string
  input_data_ids: string[]
  system_ids: string[]
  qa_state: QAState | null
  workflow_history: WorkflowHistory | null
  created_at: string
  updated_at: string
}
```

### API Response Shape
```typescript
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// Usage in route:
res.json({ data: result, error: null })
res.status(400).json({ data: null, error: 'Validation failed' })
```

### Environment Variable Guard
```typescript
function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}
```
