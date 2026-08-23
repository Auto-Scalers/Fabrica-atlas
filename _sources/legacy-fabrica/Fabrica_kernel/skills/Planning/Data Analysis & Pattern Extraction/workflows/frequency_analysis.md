# Frequency Analysis

## What
Computes precise counts, rates, distributions, and trend metrics from the normalized input. Produces exact numbers â€” not approximations or ranges unless the data itself is ranges.

## When
When the input contains measurable, countable elements: log events, data rows, error occurrences, keyword frequencies, API call rates, transaction volumes.

## Why
Quantitative precision gives downstream pipeline steps the hard data needed to prioritize and score decisions. "Many errors" is useless; "437 errors in 1,200 events (36.4%)" is actionable.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Normalized dataset | Typed JSON | Agent: `data_ingestion.md` | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Frequency metrics | JSON `{ metric_name, count, rate, distribution, trend }[]` | Agent: `report_compilation.md` | â€” |


## Guidelines
1. Compute data ingestion rates.
2. Count error rates across server log files.
3. Chart category distribution curves.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Exact Precision**: Always report absolute counts, not estimations.
2. **Rate Computation**: Provide exact percentages for occurrences.
1. **Adhere to Scope**: Perform only operations defined in the frequency analysis specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

## Handoffs
- **Flows from**: data_ingestion.md
- **Flows to**: report_compilation.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the analytics loop

