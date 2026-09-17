# Fabrica Atlas — Tasks

> Discovery, analysis, and transformation planning for Fabrica. Read-only on all source repos.

## What We Have

### Discovery (source repo reports) — buzz + mission-control complete; fabrica-app deferred


| Repo            | Folder                       | Reports | Status                                    |
| --------------- | ---------------------------- | ------- | ----------------------------------------- |
| mission-control | `discovery/mission-control/` | 9 (index + 8 subsystem) + 1 overview | ✅ Fresh (2026-09-03, commit `2b8c402`) |
| buzz            | `discovery/buzz/`            | 9 (index + 8 subsystem) + 1 overview | ✅ Fresh (2026-09-03, commit `8868787`) |
| Fabrica         | `discovery/fabrica-app/`     | 0 | ⏸️ Deferred per PM (T-B.5/B.6 not executed) |


Top-level discovery docs: `buzz-discovery.md`, `fabrica-app-discovery.md`, `mission-control-discovery.md`

**Note:** Both Fabrica and upstream sources (buzz, mission-control) have changed significantly. Full regeneration from fresh sources is the plan. Sources refreshed on 2026-09-03.

### Planning


| File               | What it tracks                                                  |
| ------------------ | --------------------------------------------------------------- |
| `atlas-roadmap.md` | Implementation batches (Settings consolidation + Core Platform) |


---

## Checkpoint


| Field           | Value                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------- |
| **Status**      | T-B.1–B.4 done: buzz + mission-control discovery regenerated. T-B.5/B.6 (fabrica-app) deferred per PM |
| **Last Action** | Wrote 20 discovery files: 9 buzz + 9 mission-control subsystem reports + 2 overview docs |
| **Next Action** | PM review of buzz + mission-control reports, then decide on T-B.5/T-B.6 (Fabrica) and T-B.7 (rollup) |


---

## Next Steps

### 0. Source Refresh — Update _sources/ from Upstream

- [x] **T-A.1** Delete stale `discovery/` folder (3 top-level docs + 3 subfolders, 41+ reports)
- [x] **T-A.2** Refresh `_sources/buzz/` — clone latest `main` from `https://github.com/block/buzz`, replace contents, record upstream commit hash — **commit: `88687876f7808a2fd742b7eb2e4b9f87d999ad8d`**
- [x] **T-A.3** Refresh `_sources/mission-control/` — clone latest `main` from `https://github.com/MeisnerDan/mission-control`, replace contents, record upstream commit hash — **commit: `2b8c402bb4ab04f6c2a3291f832e25a7482ab472`**
- [x] **T-A.4** Note: `_sources/legacy-fabrica/` stays frozen — do not touch

### 1. Discovery Regeneration — From Fresh Sources

- [x] **T-B.1** Regenerate `discovery/buzz/` reports from fresh `_sources/buzz/` — **9 files written** (index + 8 subsystem reports)
- [x] **T-B.2** Regenerate `discovery/buzz-discovery.md` overview — **written** (full architecture map, commit hash, Fabrica adoption notes)
- [x] **T-B.3** Regenerate `discovery/mission-control/` reports from fresh `_sources/mission-control/` — **9 files written** (index + 8 subsystem reports)
- [x] **T-B.4** Regenerate `discovery/mission-control-discovery.md` overview — **written** (full architecture map, commit hash, Fabrica adoption notes)
- [ ] **T-B.5** Regenerate `discovery/fabrica-app/` reports from current `Fabrica/` *(deferred per PM — NOT done)*
- [ ] **T-B.6** Regenerate `discovery/fabrica-app-discovery.md` overview *(deferred per PM — NOT done)*
- [ ] **T-B.7** Update Rollup table with new report counts

### 2. stop there — PM Review those reports

### 3. Baseline &amp; Proposals

- [ ] Pull relevant items from `discovery/` Fabrica files into '.Fabrica-atlas-board/proposals/baseline' (how everything already works in Fabrica)
- [ ] Draft proposals into '.Fabrica-atlas-board/proposals' from buzz, mission-control discoveries based on the [atlas-roadmap.md](http://atlas-roadmap.md) file (how the final version should be)
- [ ] Ensure each roadmap group have it own folder and each feature item has: current state (baseline) + proposed state + source references

### 4. Implementation

- [ ] Begin implementing batched items in Fabrica
- [ ] Track progress 
- [ ] Review and iterate

---

*Last updated: 2026-09-03 (T-B.1–B.4 complete: 20 discovery files written)*