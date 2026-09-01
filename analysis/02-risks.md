# 02 — What Could Go Wrong

> Risks, verification status, recommendation verdicts, and technical debt.

---

## Verification Status

**25 reports verified. 3 still unverified. ~850+ citations checked, zero conclusion-affecting failures.**

### Verified

| Report | Covers |
|--------|--------|
| fa-ipc-watchers | IPC watcher stack |
| bz-db-schema | Database schema |
| bz-relay-event-kinds | Relay event system |
| fa-autoupdate-build | Auto-update pipeline |
| mc-workflow-engine | Workflow engine |
| mc-ai-providers | AI provider integrations |
| mc-service-catalog | Service catalog (64 confirmed) |
| fa-window-tray-notifications | Window, tray, notifications |
| bz-ops-deploy-admin | K8s deploy/admin |
| fa-git-integration | Git plane |
| fa-settings-config-datadirs | Settings, config, data dirs |
| bz-search-pubsub | Search & pub/sub |
| mc-notifications-alerting | Notification patterns |
| fa-telemetry-consent | Telemetry consent |
| fa-command-palette-search | Command palette |
| mc-execute-guards | Execute guard stack |
| fa-plugin-runtime | Plugin runtime |
| fa-agent-hooks-probes | Agent hooks & probes |
| mc-fieldtask-kanban | Kanban task model |
| mc-decision-gates | Decision gates |
| fa-mobile-companion | Mobile companion |
| bz-pair-relay-cli | Pair relay + CLI |
| fa-auth-onboarding | Auth/onboarding |
| bz-voice-media | Voice/media |
| mc-ui-frontend | UI/frontend |

### Unverified

| Report | What It Affects |
|--------|-----------------|
| mc-adapters-linelevel | Adapter registry claims |
| fa-pty-terminal | Terminal detection claims |
| fa-wsl-remote-execution | WSL remote-execution claims |

---

## Recommendation Verdicts

### Fabrica-App (FA-T1–T18)

| ID | What | Verdict |
|----|------|---------|
| FA-T1 | Provider-neutral runner | **CONFIRMED-STRENGTHENED** |
| FA-T2 | Approval-gated guard stack | **CONFIRMED-STRENGTHENED** |
| FA-T3 | Decision-gate escalation | **CONFIRMED** |
| FA-T4 | Fleet supervision with persistence | **CONFIRMED** (20 mutexes, not 17) |
| FA-T5 | Adapter registry + catalog | **CONFIRMED** (adapter half unverified) |
| FA-T6 | SQL-backed persistence | **CONFIRMED** |
| FA-T7 | Usage/cost ledger | **CONFIRMED** |
| FA-T8 | Buzz transport for multi-host | **CONFIRMED** |
| FA-T9 | Rebrand guardrails | **REVISED** — FA-T14 supersedes expensive parts |
| FA-T10 | Staged rollout | **CONFIRMED** |
| FA-T11 | Watcher stack preservation | **CONFIRMED** |
| FA-T12 | CLI-to-desktop contract | **CONFIRMED-STRENGTHENED** |
| FA-T13 | Operator alerting | **CONFIRMED** |
| FA-T14 | Rebrand: opaque IDs, display-only | **CONFIRMED — governing strategy** |
| FA-T15 | Searchable agent archive | **CONFIRMED** |
| FA-T16 | Fleet live-status | **CONFIRMED** |
| FA-T17 | Cluster deploy blueprint | **CONFIRMED** |
| FA-T18 | Git plane as CLI-runner precedent | **CONFIRMED** |

### Notes (N1–N5)

| ID | What | Verdict |
|----|------|---------|
| N1 | Five reports need verification | **PARTIALLY RESOLVED** — 3 of 5 verified |
| N2 | Use 64 services, not ~66 | **CONFIRMED** |
| N3 | Check freshdeck-mcp typo | **STILL OPEN** |
| N4 | MC alerting gaps upstream-fixable | **CONFIRMED** |
| N5 | buzz admin-web needs real auth | **CONFIRMED** |

### Cross-Project (FA-N1–N10)

| ID | What | Verdict |
|----|------|---------|
| FA-N1 | Provider-neutral runner contract | **CONFIRMED** |
| FA-N2 | Zero-polling event-push | **CONFIRMED** |
| FA-N3 | Plugin = agent-capability substrate | **CONFIRMED** (4 gaps) |
| FA-N4 | Agents in Cmd+J | **CONFIRMED** |
| FA-N5 | WSL guardrails | **CONFIRMED** (unverified caveat) |
| FA-N6 | Telemetry keep-as-is | **CONFIRMED** |
| FA-N7 | Execute-guard as one layer | **CONFIRMED** |
| FA-N8 | Decision-queue pattern | **CONFIRMED** |
| FA-N9 | Dual task domain | **CONFIRMED** |
| FA-N10 | Sequencing: task → guards → decisions | **CONFIRMED** |

**No recommendation was invalidated.** Only strategic supersession (FA-T9 → FA-T14).

---

## Contradictions & Corrections

| # | Wrong | Use Instead |
|---|-------|-------------|
| K1 | CLI count 15+ | 14 managed / 18 live |
| K2 | Mutex count 17 | 20 |
| K3 | Service count ~66 | 64 |
| K4 | withDecisions = write-back | Read-only-in-lock |
| K5 | Push-gateway cites in test code | Substance stands |
| K6 | Usage-provider 5 channels | Actually 8 |
| K7 | Stale file path | Cosmetic |
| K8 | Verification falsely claimed coverage | Later waves corrected |
| K9 | Three reports "never landed" | All landed + verified |
| K10 | pair-relay unverified | Now verified |
| K11 | Catalog line drifted | Cosmetic |
| K12 | Phantom liveness-probe cite | Fixed |

---

## Risk Register

### P0 — Foundation-Phase Blockers (5)

| ID | Risk | Mitigation |
|----|------|------------|
| AR-P0-1 | Crash reports POST to old brand domain — leaks user data post-rebrand | Repoint endpoint or add redirect |
| AR-P0-2 | Renaming "Safe Storage" makes credentials undecryptable; ~130 env vars break | Keep on-disk filenames unchanged; display only |
| AR-P0-3 | WSL deletes are true `rm -rf` — safety guard only if callers opt in | Make guard compile-time required |
| AR-P0-4 | Decision endpoints have zero auth — any process can steer/erase agent flow | Bind to audited IPC boundary |
| AR-P0-5 | Decision writes have cross-process race — records silently lost | Replace with transactional store |

### P1 — Capability-Phase Material Risks (17)

| ID | Risk | Mitigation |
|----|------|------------|
| AR-P1-1 | Channel strings span 6 layers — renames are multi-layer migrations | Alias/version instead of rename |
| AR-P1-2 | Watcher stack is load-bearing and Fabrica-exclusive | Fence out of refactor scopes |
| AR-P1-3 | Passive TTL + fail-open = wrong for supervision | Port heartbeat presence from Buzz |
| AR-P1-4 | Plugin raw Node power; no audited exec/spawn/fs | Close plugin gaps first |
| AR-P1-5 | Hook tokens readable by spawned processes | Rotate per-pane; bind to process |
| AR-P1-6 | Two files (7,745 + 2,907 lines) absorb all work | Refactor into profile modules |
| AR-P1-7 | Nine missing supervision layers | Implement in dependency order |
| AR-P1-8 | WSL command escaping — raw strings break on `$` | Mandate existing helpers |
| AR-P1-9 | WSLENV unregistered vars arrive empty | Register at definition time |
| AR-P1-10 | 9P lies/stalls — plain Win32 calls fail | Reuse fallback layer |
| AR-P1-11 | Repair states gate terminals — distro uninstall breaks surfaces | Graceful degradation path |
| AR-P1-12 | Agent auth per-distro — distro delete invalidates accounts | Detect recreation; prompt re-auth |
| AR-P1-13 | Answered decisions re-inject forever | Add consumption semantics |
| AR-P1-14 | Duplicate-guard only checks pending | Dedupe across full history |
| AR-P1-15 | Pending decisions have no TTL | Add dismissed/expired + aging |
| AR-P1-16 | Some reports only hygiene-reviewed | Authorize spot passes |
| AR-P1-17 | Telemetry CI constants must sync | Single source-of-truth module |

### P2 — Hygiene, Edge Cases, Process Debt (19)

| ID | Risk | Mitigation |
|----|------|------------|
| AR-P2-1 | Adding provider touches 6+ files | Catalog-row-only change |
| AR-P2-2 | Hook channels have no renderer consumer | E2E test before UI ships |
| AR-P2-3 | Palette has no agent catalog | Wire agents into palette |
| AR-P2-4 | Pane-authority stressed by multi-writer | Stress test first |
| AR-P2-5 | Sync WSL probes block main thread 5s | Convert to async |
| AR-P2-6 | WSL worktrees invisible to backups | Document placement |
| AR-P2-7 | Linked worktrees 30s TTL staleness | Invalidate cache on events |
| AR-P2-8 | gh/glab lose calls without host CLI | Default-distro override |
| AR-P2-9 | SSH prerequisites not surfaced | Pre-flight checks |
| AR-P2-10 | Ephemeral VMs share SSH store | Centralize filter |
| AR-P2-11 | DELETE of decisions silent | Log activity event |
| AR-P2-12 | 300ms delay can re-run early | Event-driven unblock |
| AR-P2-13 | Invalid status from maintenance script | Real enum values |
| AR-P2-14 | taskId:null decisions dead-end | Reject at creation |
| AR-P2-15 | Answer options not enforced | Optional strict mode |
| AR-P2-16 | Brand telemetry events break funnels | Decide continuity strategy |
| AR-P2-17 | Cosmetic brand surfaces | Batch into migration |
| AR-P2-18 | Correction propagation debt | Add errata block |
| AR-P2-19 | buzz admin-web needs auth | Add token layer |

### Retired

| Risk | Resolution |
|------|------------|
| Three Round 4 reports never landed | All landed + verified Round 5 |

---

## Residual Debt

- **mc-adapters-linelevel** — adapter claims (FA-T5)
- **fa-pty-terminal** — terminal detection claims (FA-T3)
- **fa-wsl-remote-execution** — WSL claims (FA-N5); P0 risk deserves pass most
- **fa-multi-instance + fa-search-indexing** — verification incomplete

---

*Last updated: 2026-09-01*
