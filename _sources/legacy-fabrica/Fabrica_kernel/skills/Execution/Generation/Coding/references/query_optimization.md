# Query Optimization

## What
SQL query optimization strategies, index design, and Supabase-specific query performance patterns.

## When
Referenced by optimization mode's `performance_rules.md` when query latency is identified as a bottleneck.

## Index Strategies

### Standard Index (Single Column)
```sql
-- Index the most frequently filtered column
CREATE INDEX idx_missions_user_id ON missions(user_id);
CREATE INDEX idx_raw_data_user_id ON raw_data(user_id);
CREATE INDEX idx_missions_status ON missions(status);
```

### Composite Index (Multi-Column Filter)
```sql
-- When queries always filter by both user_id and status
CREATE INDEX idx_missions_user_status ON missions(user_id, status);
```

### Text Search Index (for name ILIKE queries)
```sql
-- For partial text search on raw_data.name
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_raw_data_name_trgm ON raw_data USING gin(name gin_trgm_ops);
```

### JSONB Index (for metadata queries)
```sql
-- Index a specific key inside metadata JSONB
CREATE INDEX idx_raw_data_metadata_tags ON raw_data USING gin((metadata->'tags'));
```

## Avoiding N+1 Queries
```typescript
// BAD — N+1: fetches missions, then one query per mission for raw_data
const missions = await getMissions(userId)
for (const m of missions) {
  m.raw_data = await getRawData(m.input_data_ids) // N queries
}

// GOOD — Single query with join or batch fetch
const missionIds = missions.map(m => m.id)
const rawDataMap = await getRawDataBatch(userId, allInputIds) // 1 query
```

## Pagination Pattern
```typescript
const PAGE_SIZE = 20

const { data } = await getSupabase()
  .from('missions')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1) // Cursor-based or offset
```
