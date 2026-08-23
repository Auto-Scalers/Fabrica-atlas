# Data Ingestion

## What
Parses and normalizes raw inputs into a clean, typed, structured form ready for analysis. Handles CSV rows, JSON objects, plain text blocks, code files, and mixed-format inputs. Removes noise, detects encoding issues, and maps fields to consistent types.

## When
Always the first operation in any analytics cycle â€” no analysis begins until inputs are normalized.

## Why
Inconsistent or dirty inputs produce unreliable patterns. Normalization is the prerequisite for all downstream analytical steps.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Raw input | `raw_data.content` (TEXT) or code snapshot (TEXT) or JSON | Agent: Calling pipeline step | â€” |
| Input metadata | `raw_data.mime_type`, `raw_data.metadata` (JSONB) | Agent: Calling pipeline step | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Normalized dataset | Typed JSON structure with field names, types, and row/record count | Agent: `pattern_detection.md`, `frequency_analysis.md`, `anomaly_flagging.md` | â€” |


## Guidelines
1. Parse nested JSON fields into discrete fields.
2. Detect character encoding errors (UTF-8/ASCII).
3. Flag empty columns and null rows.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Zero Mutations**: Never mutate source dataset records during parser tests.
2. **Format Conformity**: Map CSV data strictly to inferred field types.
1. **Adhere to Scope**: Perform only operations defined in the data ingestion specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

## Handoffs
- **Flows from**: Raw dataset input
- **Flows to**: pattern_detection.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the analytics loop

