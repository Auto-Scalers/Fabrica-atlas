# 03 — How We Get There

> Phased build plan, priorities, dependencies, worker tasks, and PM decisions.

---

## TL;DR

Fabrica-app already has a best-in-class foundation. What's missing is fleet supervision: durable persistence, approval gates, spend limits, escalation queues. We add supervision on top, in phases.

**Two hard rules:**
1. Preserve watcher stack and IPC channel contract verbatim.
2. Keep on-disk identifiers unchanged — display surfaces only.

---

## Priorities

### P0 — Safety / Irreversibility / Rebrand Hard-Breaks

1. **Rebrand: opaque identifiers, display-only** (FA-T14). First act: kill/redirect old feedback endpoint.
2. **Approval-gated autonomy + single guard stack** (FA-T2 + FA-N7). Never port MC's approval hole.
3. **WSL destructive-op containment** (FA-N5). approvedRoots required.

### P1 — Core Architecture Spine

4. **Dual task-domain model** (FA-N9) — two domains, one enum, no dead fields.
5. **Provider-neutral runner** (FA-T1 + FA-N1) — collapse 14 channels to one dispatcher.
6. **Decision queue** (FA-T3 + FA-N8) — block-with-payload IPC, transactional store.
7. **CLI-to-desktop contract** (FA-T12) — lock-key + exit code 3 + runtime.json.

### P2 — Capability Completion

8. Operator alerting gaps (FA-T13)
9. Usage/cost ledger (FA-T7)
10. SQL persistence (FA-T6) + adapter registry (FA-T5)
11. Fleet live-status (FA-T16) + searchable archive (FA-T15)
12. Staged rollout (FA-T10) + cluster deploy (FA-T17)

### Standing Constraints

- Preserve watcher stack verbatim (FA-T11)
- Git-plane patterns for new tool-runners (FA-T18)
- Plugin gaps closed before third-party agent packages (FA-N3)

---

## Roadmap

| Phase | Theme | Done When |
|-------|-------|-----------|
| **A — Foundation & Preservation** | Protect what's working; ship quick wins | Rebrand signed off; preservation rules in place; Agents shipped |
| **B — Capability Adoption** | Add supervision in dependency order | All priority features adopted |
| **C — Launch Readiness** | Make it shippable and safe | Zero open red risks; all inputs verified or de-scoped |

---

## Phase A — Foundation & Preservation

### Scope

1. **Preservation fences** — Freeze watcher stack and channel contract as public API.
2. **Rebrand strategy** — Keep on-disk filenames/partitions/env vars unchanged. Display surfaces only.
3. **Palette "Agents" section** — Insert agent catalog into Cmd+J. Cheapest high-value win.
4. **Chokepoint awareness** — Two files concentrate all future work. Contribution guidelines before Phase B.

### Dependencies

- None external. Everything uses existing code.
- Agents section ships before Phase B operator-facing work.

---

## Phase B — Capability Adoption

**Order:** Task model → guard stack → decision queue → hardening → expansion.

### B-Stage 1 — Task Model + Guards (P0)

- **Two-domain task model** — Human kanban (3 states) + machine task (8-state approval FSM). Linked by bridge field.
- **Ordered execute-guard stack** — Risk table, bypass predicates, rate limiters, spend brakes, circuit breakers, owner guards. Seven defects fixed during port.

**Dependencies:** Task model before guards. Both before anything else in Phase B.

### B-Stage 2 — Decision Queue + Durable Persistence (P0)

- **Decision-gate escalation** — Pending decisions freeze dispatch. After failures, retry/skip/stop. Answers become prompt context.
- **Durable SQL persistence** — Replace memory+JSON with database-backed storage.

**Dependencies:** Decision queue hooks into task model. Durable store gives transactional backbone.

### B-Stage 3 — Fleet Hardening (P1)

- Provider-neutral runner — 14 handlers → one dispatcher
- Readiness-gated spawn — verify, sweep orphans, quiescence restart
- Usage/cost ledger — spending per run with spend limits
- Fleet wave orchestration — mission ledger, process registry, relay-race handoff
- Dual-trigger reconciler — self-healing, grace period, zombie reaper
- Two-tier retry ladder — escalate to human gate with context
- Operator alerting — first-fetch suppression, dead-backend, aging escalation

**Dependencies:** All require Stages 1-2. Runner refactor can parallel.

### B-Stage 4 — Capability Expansion (P2)

- Agent-capability packages (extend plugin SDK)
- Searchable agent-output archive
- Fleet live-presence (heartbeat TTL)
- Multi-host transport

### Deliberately NOT Adopted

- MC's JSON-file persistence and polling-over-HTTP
- Buzz's multi-community tenancy as-code
- Buzz-workflow's unwired approval resume
- MC's triple-duplicated dispatch predicate and non-atomic writes

---

## Phase C — Launch Readiness

### Scope

1. **Telemetry leaks cleared** — Fix 11 brand-leak surfaces.
2. **Distribution confirmed** — Verify channels under final branding.
3. **Verification debt closed** — Resolve unverified inputs.
4. **Risk-register sign-off** — Zero open red risks at launch.
5. **Staged rollout** — Build cohort routing if wanted.
6. **Acceptance sweep** — Every handler has bypass predicate; no approval bypasses.

### Dependencies

- Items 1-2 depend on Phase A rebrand decisions.
- Item 3 gates Phase B commitments on unverified reports.
- Item 6 runs after Phase B Stages 1-2.

---

## Cross-Phase Dependencies

```
Phase A ──┬── rebrand strategy ──────────────► Phase C
          └── palette Agents ────────────────► operator visibility for all later phases

Phase B Stage 1 (task model) ──► Stage 1 (guards)
        ──► Stage 2 (decision queue + durable store)
        ──► Stage 3 (runner may parallel; rest need Stage 1-2)
        ──► Stage 4 (expansion; some gated on plugin fixes)

Phase B Stages 1-2 ──► Phase C acceptance sweep
Phase B (unverified) ◄── gate: Phase C verification closure
```

---

# Worker Tasks

> Paste-ready task notes for the Fabrica-app board.

---

## Fleet Orchestration

### FA-N11 — Fleet wave execution

**What:** Durable mission ledger + ephemeral process registry + relay-race handoff.

**Do:** Separate plan from registry. Save before spawning. Kill trees on stop; revert to clean state.

**Don't:** Copy triple-duplicated dispatch. Use unlocked read-modify-write. Use non-atomic writes.

### FA-N12 — Crash recovery (dual-trigger reconciler)

**What:** Any poll runs the same heal pass. No startup hooks needed.

**Do:** Alive → skip. 30s grace. No tasks → completed. Dispatchable → re-dispatch. Otherwise → stalled report.

**Fix first:** Windows PID recycling, dead row reaper, explicit wave records.

### FA-N13 — Retry ladder + context injection

**What:** Layered retry ending in human gate; feed history into prompts.

**Do:** Continuation → daemon queue → chain re-execute → human gate. Feed task history. 3+ failures → escalate.

**Caveat:** MC has 3 separate counters — consolidate into one ledger.

---

## Core Task Model

### FA-N14 — Two parallel task domains

**What:** Human kanban vs machine FSM. Never merge.

**Do:** Human: kanban + Eisenhower. Machine: 8-state FSM + risk-tiered approvals. Bridge via linked IDs. Coordinate via inbox.

**Safety:** Financial always approve. Bypass = rejected. 3 failures = circuit breaker. Owner-only approve.

### FA-N15 — Fix-before-port (9 gaps)

Agent assignment validation, kanban guards, blockedBy enforcement, scheduledFor decision, one enum source, numeric priority, multi-operator approval, consolidate activity logs, uuid/cuid IDs.

---

## Operator UX

### FA-N16 — Decision queue

**What:** File-backed queue for operator intervention during autonomous runs.

**Do:** Return pending in error response. Dialog on failure. Sidebar/dashboard badges. Structured escalation. Answers into prompts.

**Keep:** Append-mostly audit trail. Activity events.

### FA-N17 — Fix-before-port (8 gaps)

Single-writer store, consumption markers, event-driven unblock, TTL on pending, audit deletes, full-history dedupe, auth on endpoints, optional strict mode.

**Architecture:** Both tiers (decision queue + approvals) share one UI surface.

---

## Provider-Neutral Runner & Hooks

### FA-N1 — Runner contract

**What:** SpawnSpec from config; one channel replaces 14 handlers.

**Fact:** 14 managed targets, 18 live paths (5 via plugins).

### FA-N2 — Zero-polling

**Preserve:** UUID token, slowloris guard, fail-open, loopback-only.

### FA-N3 — Plugin = agent substrate

**Close gaps:** Restricted runtime, audited exec primitive, agent-domain events, version handshake.

### FA-N4 — Agents in Cmd+J

**Do:** Launch/resume/send/switch as first actions. Reuse telemetry schema.

### FA-N5 — WSL guardrails

No raw `wsl.exe bash -c`. Register env vars in WSLENV. Keep containment on deletes. 9P is hostile. Async probes. Auth per-distro.

### FA-N6 — Telemetry rebrand

**Keep posture.** Clear 11 leaks: endpoint, URL, event names, channel property, build constants, env renames, IPC literals, artifacts, PostHog, search keyword, dialog copy.

---

## Guard Stack & Sequencing

### FA-N7 — Execute guard stack

**Port:** Risk table, bypass predicate, FSM enums, rate limiters, spend ladder, circuit breaker, decrypt-at-use, owner guard.

**Fix:** No owner check, creation-path hole, batch bypass, expired credentials, unlimited retries, dead config, ad-hoc invocation.

### FA-N8 — Decision queue pattern

**Port:** Block-with-payload, intercept-rerun, ambient badges, structured escalation, answers-as-context.

**Fix:** Consumption marker, file races, auth, audit, TTL, status values.

### FA-N9 — Dual task domain

**Adopt:** Kanban + FSM + bridge + inbox + mutex + pre-flight gating. Fix same as FA-N15.

### FA-N10 — Sequencing

**Order:** Task model → guard stack → decision queue.

**Acceptance:** Bypass predicate everywhere, no approval bypasses, one enum per FSM, consumption semantics, atomic rate limiters.

---

*Last updated: 2026-09-01*
