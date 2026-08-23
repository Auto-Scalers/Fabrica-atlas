---
name: Deep Research & Intelligence Gathering
description: Deep Research & Intelligence Gathering skill for multi-vector web scrapers, paper/PDF research, competitor scans, and registering assets directly into Sources/Deep Research & Intelligence Gathering.
---

# Pipeline Sub-Skill: Deep Research & Intelligence Gathering (Planning Stage)

## 1. Overview & Universal Context
This skill operates inside the **Planning** stage of the Fabrica 4-Stage Looped Pipeline (`Drafting -> Planning -> Execution -> Delivering`).
It is global, domain-agnostic, and outcome-driven. Its primary objective is to execute deep multi-vector intelligence gathering based on approved parameters in **Sources / Discovery & Scoping**, outputting rich research assets directly into **Sources / Deep Research & Intelligence Gathering**.

## 2. Phase Operational Rules
- **Stage Classification**: Stage 2: Planning (Loop stage).
- **Loop Status**: Active research loop governed by EFFORT depth setting and User Approval Gate.
- **Evolutionary Tracking (Round > 1)**: De-duplicates previously scraped URLs, PDFs, and repos across multi-round searches.
- **Inputs**: Approved scoping parameters from **Sources / Discovery & Scoping**.
- **Outputs**: Structured research reports, scraped documentations, industry segmentations, and competitor benchmarks registered in **Sources / Deep Research & Intelligence Gathering**.

## 3. Step-by-Step Workflow
1. **Scope Ingestion**: Ingest parameters and target domains from **Sources / Discovery & Scoping**.
2. **Deep Research Execution**: Execute targeted web searches and scrapers for research papers, official API documentation, industry reports, market segmentations, and competitor breakdowns.
3. **Intelligence Extraction & De-duplication**: Extract relevant code patterns, architectural benchmarks, and data schemas while de-duplicating previously indexed sources.
4. **Register Source Item**: Index discovered research assets directly into **Sources / Deep Research & Intelligence Gathering** for downstream analysis.

## 4. Dynamic Skill Routing & Domain Mappings
During research execution, the AI Agent dynamically routes subroutines based on task context:

- **Technical Spec & API Docs**: `./domains/technical_spec_research.md` (SDK documentations, GitHub repos, API schemas)
- **Market & Competitor Scans**: `./domains/competitor_analysis.md` (Competitor feature matrices, market pricing, industry reports)
- **Academic & Scientific Literature**: `./domains/academic_pdf_research.md` (Research papers, technical whitepapers, PDFs)
