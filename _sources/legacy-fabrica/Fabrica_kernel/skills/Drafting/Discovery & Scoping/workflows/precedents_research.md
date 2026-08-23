# Precedents Research

## What
Queries known SaaS/UI/UX design patterns, market benchmarks, and established references from `mode_shared_lib/brainstorming_lib/` to ground creative ideation in real-world precedents.

## When
Runs in parallel with or before creative ideation. Optional but recommended when the brief involves a domain with well-established design patterns.

## Why
Ideas built on proven precedents are more credible and lower-risk than ideas invented from scratch. Referencing real patterns prevents reinventing the wheel and grounds the options in achievable designs.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Research domain / industry | String | Agent: `brief_interpretation.md` (extracted from objectives) | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Precedents reference | JSON `{ patterns[], references[], visual_benchmarks[] }` | Agent: `creative_ideation.md` | â€” |


## Guidelines
1. Check standard sidebar, navigation, and modal layouts.
2. Align visual components with Tailwind CSS paradigms.
3. Reference competitor weak points.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Precedent Validation**: Reference only verified UI patterns from the shared library.
2. **No Hallucinated Benchmarks**: Benchmark only active SaaS competitors.
1. **Adhere to Scope**: Perform only operations defined in the precedents research specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

## Handoffs
- **Flows from**: brief_interpretation.md
- **Flows to**: creative_ideation.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the brainstorming loop

