# Regression Rules

## What
Rules for auditing regressions after any optimization edit â€” verifying that existing routes, API contracts, UI layouts, and database behaviors remain intact.

## When
Applied after every significant code change, before marking any optimization task complete.

## Why
A "fixed" system that breaks existing features is a failed optimization. Regression auditing is the final gate before any change is promoted.

## Guidelines
1. Run tests on parent components.
2. Measure latency before and after refactoring.
3. Verify data payload structures.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Route Testing**: Verify all dependent endpoints respond with valid keys.
2. **Rollback Priority**: Revert code immediately if compiler tests fail.
1. **Test the Neighbors**: After changing a function, run its direct callers manually or via test suite to confirm they still behave correctly.
2. **Response Shape Verification**: If a route's response shape changed, every frontend component consuming it must be checked for compatibility.
3. **Schema Backward Compatibility**: Adding a column to a database table is safe. Removing, renaming, or changing the type of an existing column requires migration planning and backward compatibility checks.
4. **RLS After Schema Changes**: After any table change, re-run the RLS verification to confirm tenant isolation is still enforced.
5. **Compare Before/After**: For performance-critical changes, measure the key metric before and after the optimization. If no improvement is measurable, the change is not worth keeping.
6. **Rollback on Regression**: If a regression is detected, immediately revert the change, document the failure in `missions.workflow_history`, and formulate an alternative approach.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Modified code | File contents post-edit | Agent: phase-execution.md | â€” |
| Original code | Backup file contents | Agent: Self-retrieved from backup | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Regression audit report | JSON `{ checks[], status: 'pass'|'fail', regressions[] }` | Agent: phase-execution.md â†’ `missions.workflow_history` | â€” |


## Handoffs
- **Flows from**: performance_rules.md
- **Flows to**: phase-execution.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the optimization loop

