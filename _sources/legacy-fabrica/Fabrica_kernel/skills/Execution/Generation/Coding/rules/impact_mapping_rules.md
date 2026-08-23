# Impact Mapping Rules

## What
Rules for identifying which modules, functions, routes, and database tables will be affected by an optimization change, and mapping their downstream dependencies before touching anything.

## When
Always the first step in any optimization execution â€” no code is touched until the impact zone is fully mapped.

## Why
Unscoped changes cause cascading failures. A change to a shared utility function can silently break 15 callers. Impact mapping ensures every dependency is accounted for before any edit begins.

## Guidelines
1. Search for callers using grep utilities.
2. Map foreign key cascades.
3. Group target dependencies by risk levels.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Dependency Analysis**: Identify all import statements referencing the target.
2. **Schema Audit**: List all database tables mapped to the target.
1. **Read All Callers**: Before modifying any function, identify every place it is called. Tools: grep, static analysis, import graph.
2. **Map DB Deps**: For any table schema change, map every query, insert, and RLS policy that touches that table.
3. **List Side Effects**: Document what changes when the target changes â€” response shapes, timing, error codes.
4. **Score Risk**: Rate each dependency as Low/Medium/High risk before starting edits.
5. **Get Confirmation on High-Risk**: If a dependency is rated High risk, document it explicitly in the task log before proceeding.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Target module / function | File path + function name | Agent: phase-execution.md | â€” |
| Existing codebase | File contents (TEXT) | Agent: Self-retrieved from `system_components` | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Impact zone map | JSON `{ target, callers[], db_deps[], side_effects[], risk_scores[] }` | Agent: phase-execution.md â†’ `refactoring_rules.md` | â€” |


## Handoffs
- **Flows from**: Optimization trigger
- **Flows to**: refactoring_rules.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the optimization loop

