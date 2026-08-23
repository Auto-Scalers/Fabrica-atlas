# Compiler Rules

## What
Rules for running linting and compilation â€” enforcing a zero-error policy, defining the order of operations, handling missing imports, and blocking promotion of code with active warnings.

## When
Immediately after any source file is written or modified during execution. Never deferred.

## Why
Compilation errors accumulate silently. Running the compiler after every write keeps the codebase in a known-good state at every point and ensures errors are caught at their source, not three files later.

## Guidelines
1. Fix missing types in source declarations, not inline.
2. Avoid suppressing compiler messages.
3. Verify TS build outputs.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Zero Warnings**: Treat compiler and linter warnings as blocking errors.
2. **Order Hierarchy**: Run lint_applet before running compile_applet.
1. **Lint First, Compile Second**: Always run `lint_applet` before `compile_applet`. Linting catches style and logic issues; compilation catches type errors and missing imports.
2. **Zero Warning Threshold**: Warnings are treated as errors. A warning that is accepted today is a bug tomorrow.
3. **Fix At Source**: If a compilation error is caused by a missing type or import, fix it in the file that owns the type â€” not with a workaround cast.
4. **Never Suppress Errors**: Do not use `// @ts-ignore` or `// eslint-disable` to suppress errors. Suppressed errors are hidden bugs.
5. **Report Full Output**: The complete stdout of every lint and compile run is logged to `missions.workflow_history`. Partial logs are not acceptable.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Modified source files | File paths | Agent: phase-execution.md | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Lint + compile result | `{ lint: 'pass'|'fail', compile: 'pass'|'fail', errors[], warnings[] }` | Agent: phase-execution.md â†’ `validation_rules.md` | â€” |


## Handoffs
- **Flows from**: scenario_rules.md
- **Flows to**: rls_rules.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the test loop

