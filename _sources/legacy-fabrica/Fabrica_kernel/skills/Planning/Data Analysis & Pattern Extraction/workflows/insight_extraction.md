# Insight Extraction

## What
Surfaces key factual insights â€” notable findings, significant values, critical structural observations â€” directly from patterns and raw data. Strictly descriptive: no interpretation, no judgment, no prescriptive language.

## When
After pattern detection; extracts the highlighted, notable findings for inclusion in the final report.

## Why
Condenses large data into the most important factual signals. Calling pipeline steps need a short, high-signal insight list â€” not a wall of raw pattern data.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Pattern map | JSON | Agent: `pattern_detection.md` | â€” |
| Normalized dataset | Typed JSON | Agent: `data_ingestion.md` | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Insights list | Array of `{ insight, supporting_data, magnitude }` â€” purely factual | Agent: `report_compilation.md` | â€” |


## Guidelines
1. Highlight highest frequency items.
2. Describe distribution density patterns.
3. Pinpoint key metric changes.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Descriptive Only**: List only factual patterns; do not suggest next steps.
2. **Factual Grounding**: Every insight must cite specific dataset rows.
1. **Adhere to Scope**: Perform only operations defined in the insight extraction specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

## Handoffs
- **Flows from**: pattern_detection.md
- **Flows to**: report_compilation.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the analytics loop

