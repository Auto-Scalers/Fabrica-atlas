# Scope Rules

## What
Rules for defining what gets tested in a given validation cycle â€” which modules, API endpoints, database tables, RLS policies, and UI components are in scope.

## When
Always the first operation in any test cycle â€” no test is written or run until the scope is explicitly defined.

## Why
Untargeted testing wastes cycles and produces noisy results. Over-scoped testing misses actual failure boundaries. Explicit, declared scope makes results meaningful and repeatable.

## Guidelines
1. List out-of-scope targets explicitly.
2. Group scope targets by module levels.
3. Audit test files placement.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Boundary Limits**: Scope test plans only to modified modules.
2. **RLS Mandatory**: Always include table RLS in the scope check.
1. **Declare Scope Explicitly**: Write the scope as a list before any test code is touched. "Everything" is not a valid scope.
2. **Derive From Blueprint**: Test scope is derived directly from the execution blueprint â€” only what was built or changed is in scope.
3. **Include RLS Always**: Multi-tenant RLS verification is always in scope for any database-touching change.
4. **Exclude Untouched Code**: Code that was not changed in the current task is out of scope unless it is a direct dependency of what changed.
5. **Document What is Out of Scope**: Explicitly list what is not being tested in this cycle and why â€” so there are no false assumptions about coverage.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Testing blueprint | Structured JSON | Agent: phase-execution.md | â€” |
| Execution summary | List of changed files | Agent: phase-execution.md | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Test scope declaration | JSON `{ in_scope[], out_of_scope[], rls_tables[] }` | Agent: `scenario_rules.md` | â€” |


## Handoffs
- **Flows from**: Test initiation
- **Flows to**: scenario_rules.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the test loop

