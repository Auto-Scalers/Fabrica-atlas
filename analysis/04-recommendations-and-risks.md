# 04 — Recommendations & Risks

> Verification status, recommendation verdicts, contradictions, and the consolidated risk register.

---

## Verification Status

### Reports Verified (25)

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

### Reports Still Unverified (3)

| Report | What It Affects |
|--------|-----------------|
| mc-adapters-linelevel | Adapter registry claims |
| fa-pty-terminal | Terminal detection claims |
| fa-wsl-remote-execution | WSL remote-execution claims |

**Overall:** ~850+ citations checked, zero conclusion-affecting failures.

---

## Verdicts: Fabrica-App Recommendations (FA-T1–T18)

| ID | What | Verdict |
|----|------|---------|
| FA-T1 | Provider-neutral runner abstraction | **CONFIRMED-STRENGTHENED** |
| FA-T2 | Approval-gated guard stack | **CONFIRMED-STRENGTHENED** |
| FA-T3 | Decision-gate escalation | **CONFIRMED** |
| FA-T4 | Fleet supervision with real persistence | **CONFIRMED** (one number revised: 20 mutexes, not 17) |
| FA-T5 | Adapter registry + catalog-as-data | **CONFIRMED** (catalog verified; adapter half unverified) |
| FA-T6 | SQL-backed task/run persistence | **CONFIRMED** |
| FA-T7 | Usage/cost ledger with budgets | **CONFIRMED** |
| FA-T8 | Adopt buzz transport for multi-host | **CONFIRMED** |
| FA-T9 | Rebrand guardrails checklist | **REVISED** — FA-T14 supersedes the expensive parts |
| FA-T10 | Staged rollout via greenfield | **CONFIRMED** |
| FA-T11 | Watcher stack preservation | **CONFIRMED** |
| FA-T12 | CLI-to-desktop control channel | **CONFIRMED-STRENGTHENED** |
| FA-T13 | Operator alerting pipeline | **CONFIRMED** |
| FA-T14 | Rebrand strategy: opaque IDs, display-only | **CONFIRMED — governing strategy** |
| FA-T15 | Searchable agent archive | **CONFIRMED** |
| FA-T16 | Fleet live-status plumbing | **CONFIRMED** |
| FA-T17 | Deploy agents to cluster blueprint | **CONFIRMED** |
| FA-T18 | Git plane as CLI-runner precedent | **CONFIRMED** |

## Verdicts: Notes (N1–N5)

| ID | What | Verdict |
|----|------|---------|
| N1 | Five reports need verification | **PARTIALLY RESOLVED** — 3 of 5 now verified |
| N2 | Use 64 services, not ~66 | **CONFIRMED** |
| N3 | Check freshdeck-mcp typo | **STILL OPEN** |
| N4 | MC alerting gaps upstream-fixable | **CONFIRMED** |
| N5 | buzz admin-web needs real auth | **CONFIRMED** |

## Verdicts: Cross-Project Notes (FA-N1–N10)

| ID | What | Verdict |
|----|------|---------|
| FA-N1 | Promote TuiAgentConfig into runner contract | **CONFIRMED** |
| FA-N2 | Keep zero-polling event-push architecture | **CONFIRMED** |
| FA-N3 | Plugin host = agent-capability substrate | **CONFIRMED** (4 gaps documented) |
| FA-N4 | Add "Agents" to command palette | **CONFIRMED** |
| FA-N5 | WSL guardrails + risk register | **CONFIRMED** (unverified caveat stays) |
| FA-N6 | Telemetry posture keep-as-is | **CONFIRMED** |
| FA-N7 | Port execute-guard stack as one layer | **CONFIRMED** |
| FA-N8 | Adopt decision-queue pattern | **CONFIRMED** |
| FA-N9 | Dual task domain as core model | **CONFIRMED** |
| FA-N10 | Sequencing: task → guards → decision queue | **CONFIRMED** |

---

## Contradictions & Corrections

| # | What Went Wrong | Use This Instead |
|---|-----------------|------------------|
| K1 | CLI count was 15+ | 14 managed / 18 live |
| K2 | Mutex count was 17 | 20 |
| K3 | Service count was ~66 | 64 |
| K4 | withDecisions called write-back | Read-only-in-lock helper |
| K5 | Push-gateway cites in test code | Substance stands |
| K6 | Usage-provider labeled 5 channels | Actually 8 |
| K7 | Stale file path | Cosmetic |
| K8 | Spot verification falsely claimed coverage | Later waves corrected |
| K9 | Three reports "never landed" | All landed + verified |
| K10 | pair-relay listed unverified | Now verified |
| K11 | Catalog line drifted | Cosmetic |
| K12 | Phantom liveness-probe cite | Fixed in place |

**Key finding:** No recommendation was invalidated. Only strategic supersession (FA-T9 → FA-T14).

---

## Residual Debt

- **mc-adapters-linelevel** — affects adapter claims (FA-T5)
- **fa-pty-terminal** — affects terminal detection claims (FA-T3)
- **fa-wsl-remote-execution** — affects WSL claims (FA-N5); P0 risk deserves the pass most
- **fa-multi-instance + fa-search-indexing** — verification assigned but incomplete

---

## Prioritized Recommendations

### P0 — Safety / Irreversibility / Rebrand Hard-Breaks

1. **Rebrand: opaque identifiers, display-only** (FA-T14). First act: kill/redirect old feedback endpoint leak.
2. **Approval-gated autonomy + single guard stack** (FA-T2 + FA-N7). Never port MC's approval hole or batch bypass.
3. **WSL destructive-op containment** (FA-N5). approvedRoots required, TOCTOU re-verification intact.

### P1 — Core Architecture Spine

4. **Dual task-domain model** (FA-N9) — two domains, one enum, no dead fields.
5. **Provider-neutral runner** (FA-T1 + FA-N1) — collapse 14 channels to one dispatcher.
6. **Decision queue** (FA-T3 + FA-N8) — block-with-payload IPC, transactional store.
7. **CLI-to-desktop contract** (FA-T12) — lock-key + exit code 3 + runtime.json.

### P2 — Capability Completion

8. **Operator alerting gaps** (FA-T13)
9. **Usage/cost ledger** (FA-T7)
10. **SQL persistence** (FA-T6) + **adapter registry** (FA-T5)
11. **Fleet live-status** (FA-T16) + **searchable archive** (FA-T15)
12. **Staged rollout** (FA-T10) + **cluster deploy** (FA-T17)

### Standing Constraints

- Preserve watcher stack verbatim (FA-T11)
- Git-plane patterns for new tool-runners (FA-T18)
- Plugin gaps closed before third-party agent packages (FA-N3)

---

# Risk Register

## P0 — Foundation-Phase Blockers (5)

| ID | Risk | Mitigation |
|----|------|------------|
| AR-P0-1 | Crash reports POST to old brand domain — leaks user data post-rebrand | Repoint endpoint or add server-side redirect |
| AR-P0-2 | Renaming "Safe Storage" makes all stored credentials undecryptable; ~130 env vars break | Keep on-disk filenames unchanged; display surfaces only |
| AR-P0-3 | WSL deletes are true `rm -rf` — safety guard only enforced if callers opt in | Make guard compile-time required; add lint/test coverage |
| AR-P0-4 | Decision-gate endpoints have zero auth — any local process can steer/erase agent flow | Bind to audited IPC boundary instead of open HTTP |
| AR-P0-5 | Decision-gate writes have cross-process race — records silently lost | Replace file storage with transactional store |

## P1 — Capability-Phase Material Risks (17)

| ID | Risk | Mitigation |
|----|------|------------|
| AR-P1-1 | Channel/consent strings span hundreds of files in 6 layers — renames are multi-layer migrations | Never rename live channels; alias/version instead |
| AR-P1-2 | Watcher stack is load-bearing and Fabrica-exclusive — highest preservation risk | Fence out of refactor scopes; treat as frozen |
| AR-P1-3 | Passive TTL decay + fail-open = wrong semantics for supervision | Port heartbeat-scaled presence from Buzz |
| AR-P1-4 | Plugin code has raw Node power; no audited exec/spawn/fs method exists | Close plugin gaps before accepting agent packages |
| AR-P1-5 | Hook tokens readable by spawned processes — spoofing vector when spend hangs off status | Rotate per-pane tokens; bind to process identity |
| AR-P1-6 | Two files (7,745 + 2,907 lines) absorb all new provider/fleet work | Refactor into profile-owned modules |
| AR-P1-7 | Nine missing supervision layers block fleet features | Implement in dependency order |
| AR-P1-8 | WSL command escaping — any raw `wsl.exe` string breaks on `$` paths | Mandate existing helpers; add lint rule |
| AR-P1-9 | WSLENV allowlist is load-bearing — unregistered vars arrive empty | Register at definition time |
| AR-P1-10 | 9P (\\wsl.localhost) lies/stalls — plain Win32 calls fail | Reuse existing fallback layer |
| AR-P1-11 | Repair states gate terminals — uninstalling distro breaks surfaces | Add graceful degradation path |
| AR-P1-12 | Agent auth per-runtime AND per-distro — distro delete invalidates accounts | Detect recreation; prompt re-auth |
| AR-P1-13 | Answered decisions re-inject forever — stale guidance poisons retries | Add consumption semantics |
| AR-P1-14 | Duplicate-guard only checks pending — queue floods under looping agents | Dedupe across full history |
| AR-P1-15 | Pending decisions have no TTL — tasks block indefinitely | Add dismissed/expired statuses + aging timer |
| AR-P1-16 | Some source reports only hygiene-reviewed, not factually verified | Authorize spot passes before commitments |
| AR-P1-17 | Telemetry CI constants must move in lockstep — drift breaks CI | Single source-of-truth module |

## P2 — Hygiene, Edge Cases, Process Debt (19)

| ID | Risk | Mitigation |
|----|------|------------|
| AR-P2-1 | Adding provider touches 6+ files | Catalog-row-only change |
| AR-P2-2 | Hook channels have no renderer consumer | E2E test before UI ships |
| AR-P2-3 | Palette has no agent catalog access | Wire agents into palette |
| AR-P2-4 | Pane-authority arbitration stressed by multi-writer | Stress test before orchestration |
| AR-P2-5 | Sync WSL probes block main thread up to 5s | Convert to async with timeouts |
| AR-P2-6 | WSL worktrees invisible to Windows backups | Document placement |
| AR-P2-7 | Linked worktrees have 30s TTL staleness | Invalidate cache on delete/recreate |
| AR-P2-8 | gh/glab lose calls without host CLI | Implement default-distro override |
| AR-P2-9 | SSH prerequisites not surfaced before connect | Add pre-flight checks |
| AR-P2-10 | Ephemeral VMs share SSH store | Centralize filter |
| AR-P2-11 | DELETE of decisions is silent | Log activity event on delete |
| AR-P2-12 | 300ms delay can re-run before gate clears | Event-driven unblock |
| AR-P2-13 | Invalid status written by maintenance script | Real enum values |
| AR-P2-14 | taskId:null decisions are dead-end data | Reject at creation |
| AR-P2-15 | Answer options not enforced | Optional strict mode |
| AR-P2-16 | Brand-prefixed telemetry events break funnels | Decide continuity strategy |
| AR-P2-17 | Cosmetic brand surfaces (URLs, i18n, artifacts) | Batch into migration inventory |
| AR-P2-18 | Correction propagation debt | Add errata block |
| AR-P2-19 | buzz admin-web needs real auth | Add token/session layer |

## Retired Risks

| Risk | Resolution |
|------|------------|
| Three Round 4 reports never landed | All landed + verified in Round 5 |

---

*Last updated: 2026-09-01*
