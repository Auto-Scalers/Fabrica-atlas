# Anomaly Flagging

## What
Detects and flags outliers, inconsistencies, errors, missing data points, security issues, and structural mismatches in the normalized input. Describes the anomaly factually â€” does not prescribe what to do about it.

## When
Runs in parallel with or after pattern detection; always included in the final analytics report regardless of findings.

## Why
Anomalies are often the most actionable signals â€” they reveal what is broken, risky, or incomplete. Flagging them descriptively gives downstream pipeline steps the data to decide what to do.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Normalized dataset | Typed JSON | Agent: `data_ingestion.md` | â€” |
| Pattern map | JSON | Agent: `pattern_detection.md` | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Anomaly flags | Array of `{ type, location, description, severity: 'low'|'medium'|'high' }` | Agent: `report_compilation.md` | â€” |


## Guidelines
1. Look for missing foreign keys in CSV relations.
2. Detect value range outliers and data format mismatches.
3. Scan for credentials or sensitive tokens leaked in the input data.

## Rules
1. **Format Validation**: Flag structural database mismatches without mutating the input data.
2. **Severity Standard**: Assign clear severity levels (high/medium/low) and provide a descriptive fact-based reason.

## Handoffs
- **Flows from**: pattern_detection.md
- **Flows to**: report_compilation.md

