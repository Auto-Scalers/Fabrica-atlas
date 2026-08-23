# Validation Rules

## What
Rules for logging and reporting validation results â€” the format for pass/fail matrices, how to write error details, success percentage thresholds, and how results are stored in `missions.workflow_history`.

## When
After all test scenarios, compiler checks, and RLS verifications have been executed â€” produces the final validation report for the current task.

## Why
Consistent, structured validation reports give the execution phase a clear pass/fail decision and provide the user with a readable, complete audit trail.

## Guidelines
1. Format test summaries for mission overlays.
2. Include full stack traces for failures.
3. Write validation logs to history.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Matrix Compilation**: Report outputs must follow structured pass/fail matrices.
2. **Fail Block**: Block execution if any security check fails.
1. **Structured Matrix**: Every validation report is a JSON array of scenario results â€” not free text, not a summary paragraph.
2. **Include All Runs**: The report includes every scenario run â€” passed, failed, and skipped (with skip reason).
3. **Success Threshold**: A task passes validation only if 100% of critical scenarios (auth, RLS, positive cases) pass. Non-critical edge case failures are flagged as warnings, not blockers.
4. **Error Detail Level**: Failed scenarios include: the exact input used, the expected output, the actual output, and the error message or stack trace.
5. **Store in workflow_history**: The complete validation matrix is written to `missions.workflow_history` under the current task ID â€” not just a pass/fail summary.
6. **Surface Failures to User**: If any critical scenario fails, the failure is surfaced to the user via the Mission Overlay Panel before execution is marked failed.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Compiler result | JSON | Agent: `compiler_rules.md` | â€” |
| RLS verification result | JSON | Agent: `rls_rules.md` | â€” |
| Scenario results | Array of test outputs | Agent: phase-execution.md (from running test scenarios) | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Validation matrix | Structured JSON â†’ stored in `missions.workflow_history` | Agent: phase-execution.md | **UI: Critical failures are shown in the Mission Overlay Panel as error cards with the scenario name and failure reason.** |


## Handoffs
- **Flows from**: rls_rules.md
- **Flows to**: Final test validation report
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the test loop

