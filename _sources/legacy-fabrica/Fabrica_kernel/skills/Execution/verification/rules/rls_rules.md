# RLS Rules

## What
Rules for verifying multi-tenant Row-Level Security â€” every query and write operation must be tested with mismatched `user_id` values to confirm tenant isolation holds, and cascading delete behavior must be verified.

## When
Applied whenever any database table, API route, or query pattern is added or modified. RLS verification is non-optional.

## Why
RLS failures are the most dangerous class of bug in a multi-tenant system â€” they expose one client's data to another. No amount of application-level logic compensates for a missing RLS policy.

## Guidelines
1. Assert service role queries filter manually.
2. Run cross-tenant query tests.
3. Check RLS policies on new tables.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Isolation Checks**: Assert that user B cannot read or write user A data.
2. **Cascade Cascade**: Confirm cascade deletes clean linked tables.
1. **Test Every Table**: Any table that stores user-scoped data must have an RLS policy and it must be tested.
2. **Cross-Tenant Read Test**: Attempt to SELECT records belonging to user A while authenticated as user B. The result must be empty (not forbidden â€” empty).
3. **Cross-Tenant Write Test**: Attempt to INSERT/UPDATE a record for user A while authenticated as user B. The operation must be blocked.
4. **Cascading Delete Test**: If a user account is deleted, verify that all associated records in all linked tables are also deleted.
5. **Service Role Bypass**: Confirm that service role queries (used in background processes) include explicit `user_id` filters even though they bypass RLS â€” server-side filtering is not optional.
6. **Document RLS Gaps**: Any table that intentionally does not have per-user RLS (e.g., a global tools registry) must have that decision documented explicitly.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Test scope (tables, routes) | JSON | Agent: `scope_rules.md` | â€” |
| Database schema | Table definitions | Agent: Self-retrieved from Supabase or schema files | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| RLS verification result | JSON `{ table, policy_exists, cross_tenant_read: 'blocked'|'leaks', cross_tenant_write: 'blocked'|'leaks', cascade_delete: 'verified'|'missing' }[]` | Agent: `validation_rules.md` | â€” |


## Handoffs
- **Flows from**: compiler_rules.md
- **Flows to**: validation_rules.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the test loop

