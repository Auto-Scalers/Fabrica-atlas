# Pattern Detection

## What
Identifies recurring patterns, structural regularities, correlations, and behavioral trends across the normalized input. Groups data by shared characteristics and surfaces what clusters, repeats, or co-occurs.

## When
After data ingestion normalizes the input; runs on the clean structured dataset to surface structural signals.

## Why
Patterns are the primary signal in any data. They reveal structure that is invisible in raw form and give downstream steps a factual basis for judgment.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Normalized dataset | Typed JSON | Agent: `data_ingestion.md` | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Pattern map | JSON `{ pattern_name, description, occurrences, examples[], confidence }[]` | Agent: `insight_extraction.md`, `report_compilation.md` | â€” |


## Guidelines
1. Find trends over time-series coordinates.
2. Map relationships between tables.
3. Group records by shared attributes.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Frequency Mapping**: Group variables by correlation coefficients.
2. **Cluster Validation**: Identify repeated structural clusters.
1. **Adhere to Scope**: Perform only operations defined in the pattern detection specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

## Handoffs
- **Flows from**: data_ingestion.md
- **Flows to**: insight_extraction.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the analytics loop

