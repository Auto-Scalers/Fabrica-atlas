# Scenario Rules

## What
Rules for writing test scenarios â€” every scenario must cover positive cases (expected behavior), negative cases (invalid inputs, missing auth, wrong user), and extreme edge cases (empty payloads, massive data, missing environment secrets).

## When
After scope is defined; produces the full scenario set before any test runner is executed.

## Why
Scenario quality determines coverage. Without negative and edge cases, the most dangerous failure modes go undetected â€” auth bypasses, data corruption on empty input, and crashes on missing config all hide in untested edges.

## Guidelines
1. Verify authentication failure conditions.
2. Scrape data payloads from sample templates.
3. Assert cross-tenant isolation bounds.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Boundary Cases**: Include positive, negative, and edge case assertions.
2. **Isolation Guarantee**: Run scenarios from a clean database state.
1. **Three Case Minimum**: Every endpoint or function tested must have at minimum: one positive case, one negative case, one edge case.
2. **Test the Boundary, Not the Middle**: Focus scenarios on input boundaries â€” the minimum valid input, the maximum, and values just outside the valid range.
3. **Auth Scenarios Are Mandatory**: Every route test must include a scenario where authentication is missing or invalid.
4. **Data Isolation Scenario**: Every database operation test must include a scenario where a different user_id is used to confirm data isolation.
5. **No Assumptions About State**: Every test starts from a clean, known state. Do not rely on data left by previous test runs.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Test scope declaration | JSON | Agent: `scope_rules.md` | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Scenario set | Array of `{ name, type: 'positive'|'negative'|'edge', input, expected_output }` | Agent: `compiler_rules.md`, `rls_rules.md` | â€” |


## Handoffs
- **Flows from**: scope_rules.md
- **Flows to**: compiler_rules.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the test loop

