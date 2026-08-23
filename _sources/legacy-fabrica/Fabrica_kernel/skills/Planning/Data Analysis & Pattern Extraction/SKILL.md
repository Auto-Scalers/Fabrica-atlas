---
name: Data Analysis & Pattern Extraction
description: Data Analysis & Pattern Extraction skill for ingesting raw datasets, computing key metrics, detecting anomalies, and storing findings in Sources/Data Analysis & Pattern Extraction.
---

# Pipeline Sub-Skill: Data Analysis & Pattern Extraction (Planning Stage)

## 1. Overview & Universal Context
This skill operates inside the **Planning** stage of the Fabrica 4-Stage Looped Pipeline (`Drafting -> Planning -> Execution -> Delivering`).
It is global, domain-agnostic, and outcome-driven. Its primary objective is to ingest raw datasets, research documents, and system telemetry to compute core metrics, detect statistical anomalies, and extract actionable insights into **Sources / Data Analysis & Pattern Extraction**.

## 2. Phase Operational Rules
- **Stage Classification**: Stage 2: Planning (Non-loop phase inside Planning).
- **Inputs**: **Sources / Discovery & Scoping** + **Sources / Deep Research & Intelligence Gathering** + raw user datasets.
- **Outputs**: Computed metrics, anomaly reports, trend lines, and pattern extraction manifests registered in **Sources / Data Analysis & Pattern Extraction**.

## 3. Step-by-Step Workflow
1. **Multi-Source Ingestion**: Ingest scoping parameters from **Sources / Discovery & Scoping** and research findings from **Sources / Deep Research & Intelligence Gathering**.
2. **Metric Computation**: Calculate quantitative ratios, throughput metrics, conversion rates, and financial projections.
3. **Anomaly & Outlier Detection**: Scan data for statistical anomalies, system bottlenecks, cost spikes, or structural edge cases.
4. **Pattern Extraction & Storage**: Extract actionable insights and register structured analytical reports directly into **Sources / Data Analysis & Pattern Extraction**.

## 4. Dynamic Skill Routing & Domain Mappings
During analysis execution, the AI Agent dynamically routes subroutines based on data context:

- **Metric Computation & Ratios**: `./domains/metric_computation.md` (Quantitative formulas, statistical aggregations)
- **Anomaly & Edge-Case Detection**: `./domains/anomaly_detection.md` (Outlier algorithms, system error logs, bottleneck identification)
