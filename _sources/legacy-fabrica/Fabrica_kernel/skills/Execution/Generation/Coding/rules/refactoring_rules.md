# Refactoring Rules

## What
Rules for performing surgical, targeted code refactoring â€” read-modify-write workflow, DRY enforcement, target-block replacement (never full-file rewrites), and sibling function preservation.

## When
Applied to every code edit during optimization execution, after impact mapping confirms the scope.

## Why
Full-file rewrites lose context, break formatting, and introduce regressions. Surgical target-block edits are precise, reversible, and reviewable.

## Guidelines
1. Back up routers before applying changes.
2. Document code changes using clear inline comments.
3. Avoid changing signatures of sibling functions.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Surgical Patching**: Modify target blocks, not entire file modules.
2. **DRY Maintenance**: Extract duplicate structures to shared utilities.
1. **Read-Modify-Write**: Always read the existing code fully before editing. Never guess what is in a file.
2. **Target Block Only**: Replace the specific function, block, or expression being optimized. Do not rewrite the entire file.
3. **DRY Enforcement**: If the same logic exists in more than one place, extract it to a shared utility. Do not leave duplicate logic after refactoring.
4. **Preserve Sibling Code**: Never modify functions adjacent to the target unless they are explicitly in the impact zone.
5. **Comment What Changed**: Add a brief inline comment on any non-obvious optimization explaining why it was changed.
6. **One Change Per Task**: Each approved task produces one logical change. Do not bundle multiple unrelated optimizations into a single task execution.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Impact zone map | JSON | Agent: `impact_mapping_rules.md` | â€” |
| Existing code | File contents (TEXT) | Agent: Self-retrieved | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Patched code | Modified file contents | Agent: phase-execution.md (written to filesystem) | â€” |


## Handoffs
- **Flows from**: impact_mapping_rules.md
- **Flows to**: security_rules.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the optimization loop

