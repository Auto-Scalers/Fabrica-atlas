# Fabrica Atlas — Tasks

> Discovery, analysis, and transformation planning for Fabrica. Read-only on all source repos.

## What We Have

### Analysis (synthesis outputs)

| File | What it covers |
|---|---|
| `analysis/task-notes.md` | Paste-ready task notes FA-N1–N17 for the Fabrica-app board |
| `analysis/implementation-plan.md` | Phased build plan (A→B→C), TL;DR, risks, PM questions |
| `analysis/cross-repo-analysis.md` | Similarity analysis + agent-platform integration picture |
| `analysis/findings-and-recommendations.md` | Verification status, verdicts, contradictions, residual debt |
| `analysis/production-architecture.md` | Layered architecture, subsystem specs, data model, security |
| `analysis/agent-platform-integration-map.md` | 5-subsystem composition, shared contracts, verification notes |
| `analysis/risks.md` | 41-row risk register (5×P0, 17×P1, 19×P2) |
| `analysis/convergence.md` | Diminishing-findings evidence, program closure recommendation |

### Discovery (source repo reports)

| Repo | Folder | Reports |
|---|---|---|
| mission-control | `discovery/mission-control/` | 12 reports (adapters, AI providers, chain-dispatch, decision gates, execute guards, fieldtask/kanban, frontend, notifications, service catalog, UI, workflow engine, AI vault) |
| buzz | `discovery/buzz/` | 8 reports (agent crates, desktop, DB schema, ops/deploy, pair-relay, relay event kinds, search/pubsub, voice/media) |
| fabrica-app | `discovery/fabrica-app/` | 21 reports (agent hooks, auth/onboarding, autoupdate, command palette, git, hook parity, IPC watchers, mobile, multi-instance, plugin runtime, PTY, runtime read, search indexing, settings, SSH plane, telemetry, window/tray, WSL, main subsystems, plugins, renderer) |

Top-level discovery docs: `buzz-discovery.md`, `fabrica-app-discovery.md`, `mission-control-discovery.md`

### Planning

| File | What it tracks |
|---|---|
| `atlas-roadmap.md` | Implementation batches (Settings consolidation + Core Platform) |

---

## Rollup

| Metric | Value |
|---|---|
| Analysis files | 8 |
| Discovery reports | 41 + 3 top-level |
| Verification | Complete — ~850+ citations sampled, 0 FAILED |

---

## Checkpoint

| Field | Value |
|---|---|
| **Status** | All discovery, verification, and synthesis complete |
| **Last Action** | Analysis folder restructured (12→8 files, merged duplicates) |
| **Next Action** | PM decision: go/no-go on implementation |

---

## Next Steps

### 1. Atlas Roadmap — First Batch Selection ✅
- [x] PM works on `atlas-roadmap.md` to define the first batch of features to build in Fabrica
- [x] Identify priority items from existing analysis files
- [x] Group into implementable batches

### 2. Analytics Review
- [ ] PM reviews analytics/analysis files for a broader picture
- [ ] Identify gaps and new items to add to the roadmap
- [ ] Update roadmap with newly discovered priorities

### 3. Baseline & Proposals
- [ ] Pull relevant items from `discovery/` files into baseline (how everything already works in Fabrica)
- [ ] Draft proposals from buzz, mission-control discoveries (how the final version should be)
- [ ] Ensure each roadmap item has: current state (baseline) + proposed state + source references

### 4. Implementation
- [ ] Begin implementing batched items in Fabrica-app
- [ ] Track progress against roadmap
- [ ] Review and iterate

---

_Last updated: 2026-09-01_
