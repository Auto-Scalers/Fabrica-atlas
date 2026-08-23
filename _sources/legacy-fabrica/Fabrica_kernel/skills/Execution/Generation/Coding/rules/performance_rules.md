# Performance Rules

## What
Rules for performance tuning â€” query optimization strategy, caching layer insertion, lazy initialization patterns, database index usage, and latency reduction techniques.

## When
Applied when analytics or audit findings reveal performance bottlenecks, high-latency query paths, or excessive re-computation.

## Why
Performance degrades non-linearly under load. A query that takes 50ms with 100 rows takes 5,000ms with 100,000 rows if not indexed. Tuning at the right layer prevents expensive rewrites later.

## Guidelines
1. Optimize slow query paths via compound indexes.
2. Limit result arrays to 100 entries max.
3. Implement caching for static variables.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Index Prioritization**: Ensure index mappings are added before caching layers.
2. **Loop Separation**: Do not execute query requests inside loops.
1. **Index First**: Before adding caching, confirm that relevant database columns are indexed. A missing index is the most common cause of slow queries.
2. **Cache at the Right Layer**: Cache computed aggregates server-side, not raw database records. Cache invalidation must be explicit and triggered by write events.
3. **Lazy Initialization**: External clients (Supabase, Stripe, etc.) are initialized inside functions, not at module-load time. Missing env keys disable the integration gracefully.
4. **Avoid N+1 Queries**: Never execute a database query inside a loop. Batch queries or use joins.
5. **Measure Before Optimizing**: Do not optimize something that is not a measured bottleneck. Analytics findings are the source of optimization targets â€” not assumptions.
6. **Paginate Large Results**: Any query that could return more than 100 rows uses pagination (`limit` + `offset` or cursor-based). Never fetch unbounded result sets.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Analytics bottleneck report | Structured JSON | Agent: phase-execution.md (from analytics mode) | â€” |
| Code under review | File contents | Agent: Self-retrieved | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Optimized code | Modified file contents | Agent: phase-execution.md | â€” |


## Handoffs
- **Flows from**: security_rules.md
- **Flows to**: regression_rules.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the optimization loop

