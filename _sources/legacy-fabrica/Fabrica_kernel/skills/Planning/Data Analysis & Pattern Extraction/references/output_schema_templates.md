# Output Schema Templates

## What
Standard JSON output schemas for all analytics report types produced by `report_compilation.md`. Every analytics output must conform to one of these schemas.

## When
Referenced by `report_compilation.md` at the end of every analytics cycle to validate and structure the final output.

## Why
Consistent schemas guarantee that calling pipeline steps never fail to parse analytics output. A pipeline step that receives unpredictable JSON structure cannot reliably extract meaning.

## Schema 1: Standard Analytics Report
Used for: idea analysis, code audits, research synthesis, selection analysis.

```json
{
  "schema_version": "1.0",
  "input_summary": "string — what was analyzed",
  "patterns": [
    { "name": "string", "description": "string", "occurrences": "number", "examples": ["string"] }
  ],
  "insights": [
    { "insight": "string", "supporting_data": "string", "magnitude": "high|medium|low" }
  ],
  "anomalies": [
    { "type": "string", "location": "string", "description": "string", "severity": "high|medium|low" }
  ],
  "frequency_metrics": [
    { "metric_name": "string", "count": "number", "rate": "string", "trend": "string" }
  ]
}
```

## Schema 2: Dataset Shape Report
Used for: dataset discovery (system_build_from_data pipeline).

```json
{
  "schema_version": "1.0",
  "dataset_name": "string",
  "row_count": "number",
  "column_count": "number",
  "columns": [
    { "name": "string", "inferred_type": "string", "null_count": "number", "sample_values": ["string"] }
  ],
  "anomalies": [],
  "frequency_metrics": []
}
```

## Schema 3: Code Health Report
Used for: code audit steps (system_optimization, system_test pipelines).

```json
{
  "schema_version": "1.0",
  "module_name": "string",
  "file_count": "number",
  "export_surfaces": ["string"],
  "patterns": [],
  "anomalies": [],
  "complexity_metrics": [
    { "file": "string", "lines": "number", "dependencies": ["string"] }
  ]
}
```
