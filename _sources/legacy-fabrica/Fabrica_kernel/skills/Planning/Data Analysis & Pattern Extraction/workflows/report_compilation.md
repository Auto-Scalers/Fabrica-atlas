# Report Compilation

## What
Assembles all descriptive findings â€” patterns, insights, anomaly flags, frequency metrics â€” into a single structured, typed JSON report matching the schema in `mode_shared_lib/analytics_lib/output_schema_templates.md`. This is the sole output of the analytics mode that calling pipeline steps consume.

## When
Final step â€” runs after all analytical sub-steps (data_ingestion, pattern_detection, insight_extraction, anomaly_flagging, frequency_analysis) have completed.

## Why
Consistent schema ensures calling pipeline steps never fail to parse analytics output. A single clean report is better than multiple partial outputs that require assembly.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Pattern map | JSON | Agent: `pattern_detection.md` | â€” |
| Insights list | JSON | Agent: `insight_extraction.md` | â€” |
| Anomaly flags | JSON | Agent: `anomaly_flagging.md` | â€” |
| Frequency metrics | JSON | Agent: `frequency_analysis.md` | â€” |
| Output schema template | Markdown | Agent: Self-retrieved from `mode_shared_lib/analytics_lib/output_schema_templates.md` | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Analytics report | Structured JSON (schema-compliant) | Agent: Calling pipeline step â€” stored in `missions.workflow_history` | â€” |


## Guidelines
1. Compile findings into a single structured report.
2. Validate JSON structure before returning.
3. Format number metrics consistently.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Template Matching**: Output must strictly match standard schema templates.
2. **Parseable Output**: Deliver clean JSON, not free markdown blocks.
1. **Adhere to Scope**: Perform only operations defined in the report compilation specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

## Handoffs
- **Flows from**: pattern_detection.md
- **Flows to**: Pipeline calling step
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the analytics loop

