# Data Format Guide

## What
Guidelines for how analytics outputs should be structured so that downstream pipeline steps can reliably extract prescriptive meaning (gaps, opportunities, recommendations, next moves) from purely descriptive data.

## When
Referenced by `report_compilation.md` when finalizing any analytics report to ensure the output is maximally useful to the calling pipeline step.

## Why
Analytics mode produces only descriptive outputs, but those outputs must be structured such that the next layer (pipeline step logic) can derive prescriptive meaning without ambiguity or guesswork.

## Formatting Principles

### 1. Explicit Severity on Anomalies
Every anomaly must carry a `severity` field (`high/medium/low`). This allows pipeline steps to immediately prioritize what to address without re-analyzing the data.

### 2. Magnitude on Insights
Every insight must carry a `magnitude` field. High-magnitude insights are the ones most likely to drive decisions; low-magnitude are noted but not prioritized.

### 3. Frequency Metrics Must Be Exact
Never use relative terms ("many", "few", "some") in frequency fields. Always use exact numbers or percentages. `"error_rate": "36.4% (437/1200)"` — not `"frequent errors"`.

### 4. Location-Pinned Anomalies
Anomalies must include a `location` field pointing to the exact file, function, table, or column where the issue was detected. Unlocated anomalies cannot be acted upon.

### 5. Examples Arrays
Pattern entries must include at least 2 concrete examples from the actual data. Abstract pattern names without examples are unverifiable.

### 6. input_summary Field
Every report must begin with a 1–2 sentence `input_summary` describing what was analyzed. This prevents context loss when the report is read by a step that did not generate it.
