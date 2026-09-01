# 05 — Implementation Plan

> Phased build plan, dependencies, PM questions, and worker-ready task notes.

---

## TL;DR

Fabrica-app already has a best-in-class foundation for single-host agent management. What's missing is fleet-level supervision: durable task persistence, approval gates, spend enforcement, and operator escalation queues. The build adds supervision on top of the existing foundation, in phases.

**Two hard rules throughout:**
1. Preserve the watcher stack and IPC channel contract verbatim.
2. Keep on-disk identifiers unchanged through any rebrand (display surfaces only).

---

## Roadmap at a Glance

| Phase | Theme | Done When |
|-------|-------|-----------|
| **A — Foundation & Preservation** | Protect what's working; ship quick wins | Rebrand signed off; preservation rules in place; Agents shipped |
| **B — Capability Adoption** | Add supervision features in dependency order | All priority features adopted |
| **C — Launch Readiness** | Make it shippable and safe | Zero open red risks; all inputs verified or de-scoped |

---

## Phase A — Foundation & Preservation

### Scope

1. **Preservation fences** — Freeze watcher stack and channel contract as public API. No renames without coordinated migration plan.
2. **Rebrand strategy** — Keep on-disk filenames/partitions/env vars unchanged. Display surfaces only.
3. **Palette "Agents" section** — Insert agent catalog into Cmd+J. Cheapest high-value win.
4. **Chokepoint awareness** — Two files concentrate all future work. Establish contribution guidelines.

### Dependencies

- None external. Everything uses existing code.
- Agents section must ship before Phase B operator-facing work.

### PM Questions

1. Accept the keep-on-disk-identifiers rebrand strategy formally?
2. Confirm appId stays unchanged, or fund parallel-install migration?
3. Ratify the do-not-regress rule for push IPC as an architecture invariant?

---

## Phase B — Capability Adoption

**Ordering rule:** Task model → guard stack → decision queue → hardening → expansion.

### B-Stage 1 — Task Model + Guards (P0)

- **Two-domain task model** — Human kanban (3 states, simple) + machine task with 8-state approval FSM. Linked by bridge field.
- **Ordered execute-guard stack** — Single boundary with risk table, bypass predicates, rate limiters, spend brakes, circuit breakers, owner guards. Seven defects fixed during port.

**Dependencies:** Task model before guards. Both before anything else in Phase B.

### B-Stage 2 — Decision Queue + Durable Persistence (P0)

- **Decision-gate escalation** — Pending decisions freeze dispatch. After failures, inject retry/skip/stop options. Answers become prompt context.
- **Durable SQL persistence** — Replace memory+JSON with database-backed run/task/approval storage.

**Dependencies:** Decision queue hooks into task model. Durable store gives transactional backbone.

### B-Stage 3 — Fleet Hardening (P1)

- **Provider-neutral runner** — Consolidate 14 handlers into one dispatcher.
- **Readiness-gated spawn** — Verify readiness, sweep orphans, restart with quiescence windows.
- **Usage/cost ledger** — Track spending per run with layered spend limits.
- **Fleet wave orchestration** — Durable mission ledger, process registry, relay-race handoff.
- **Dual-trigger reconciler** — Self-healing with grace period, zombie reaper, unified liveness.
- **Two-tier retry ladder** — Retries escalate to human gate with context injection.
- **Operator alerting** — First-fetch suppression, dead-backend signals, aging escalation.

**Dependencies:** All require Stages 1-2 stores. Runner refactor can parallel.

### B-Stage 4 — Capability Expansion (P2)

- **Agent-capability packages** — Extend plugin SDK with agent-domain events.
- **Searchable agent-output archive** — Full-text index with privacy allowlist.
- **Fleet live-presence** — Heartbeat-based TTL instead of passive decay.
- **Multi-host transport** — Job kinds, observer frames, audit chain.

### Deliberately NOT Adopted

- MC's JSON-file persistence and polling-over-HTTP
- Buzz's multi-community tenancy as-code
- Buzz-workflow's unwired approval resume
- MC's triple-duplicated dispatch predicate and non-atomic writes

### PM Questions

1. Kanban agent-write policy — may agents write human kanban, or owner-only?
2. Multi-operator approvals — does v1 need delegation-of-approval roles?
3. Plugin execution primitive — design audited exec/spawn now before terminal.sendText fossilizes?
4. Token-in-env acceptance — is the hook-token model acceptable long-term?
5. Single UI surface mandate — confirm both intervention tiers share one operator surface?
6. Attempt-ledger consolidation — confirm one ledger across all retry mechanisms?

---

## Phase C — Launch Readiness

### Scope

1. **Telemetry leak register cleared** — Fix 11 brand-leak surfaces.
2. **Distribution/update confirmed** — Verify channels under final branding.
3. **Verification debt closure** — Resolve unverified inputs.
4. **Risk-register sign-off** — Zero open red risks at launch.
5. **Staged rollout decision** — Build cohort routing if wanted.
6. **Acceptance-criteria sweep** — Every handler has bypass predicate; no approval bypasses.

### Dependencies

- Items 1-2 depend on Phase A rebrand decisions.
- Item 3 gates Phase B commitments on unverified reports.
- Item 6 runs after Phase B Stages 1-2.

### PM Questions

1. Verification closure funding — approve spot passes now?
2. Never-landed discovery — formally drop or accept rewrites?
3. Staged rollout — cohort routing before public launch?
4. PostHog continuity vs new project — historical funnel loss accepted?

### Additional

1. **Multi-host scope** — cluster/multi-host in first release cycle?

---

## Cross-Phase Dependencies

```
Phase A ──┬── rebrand strategy ──────────────► Phase C
          └── palette Agents ────────────────► operator visibility for all later phases

Phase B Stage 1 (task model) ──► Stage 1 (guards)
        ──► Stage 2 (decision queue + durable store)
        ──► Stage 3 (runner may parallel; reconciler/retry/ledger/alerts need Stage 1-2)
        ──► Stage 4 (expansion; some items gated on plugin fixes or multi-host scoping)

Phase B Stages 1-2 ──► Phase C acceptance sweep
Phase B (unverified items) ◄── gate: Phase C verification closure
```

---

## Top Risks

1. **Contract-rename blast radius** — Channel strings in 65 main files, 656 preload sites, ~78 renderer namespaces.
2. **Rebrand hard-break surfaces** — safeStorage keys, Chromium partitions, ~130 env vars.
3. **Watcher-stack fragility** — Crash isolation, canary, fuses, removal fencing all load-bearing.
4. **Two chokepoint files** — Concentrate all future work.
5. **Plugin sandbox vs agents** — Raw Node power; no audited exec/spawn/fs.
6. **Token-in-child-env** — Pane-readable; wrong semantics once spend hangs off status.
7. **Verification debt** — Two key inputs unverified; one fully unverified.
8. **MC defect trap** — Guard/task/decision systems carry 7-9 defects each.

---
---

# Worker Tasks

> Paste-ready task notes for the Fabrica-app board. Each note: what, why, what to do, what NOT to do.

---

## Fleet Orchestration

### FA-N11 — Fleet wave execution architecture

**What:** Build fleet on durable mission ledger + ephemeral process registry + relay-race handoff.

**Why:** Worker processes outlive supervisors. Without a ledger, crashed chains can't recover.

**Do:**
- Separate durable plan (mission file) from ephemeral process registry (active runs)
- Save plan before spawning workers
- Kill process trees on stop; revert to clean pre-state

**Don't:**
- Copy triple-duplicated dispatch logic — extract one shared module
- Use unlocked read-modify-write across processes
- Use non-atomic writes on chain-critical files

### FA-N12 — Fleet crash recovery (dual-trigger reconciler)

**What:** Any poll of mission state (UI refresh or daemon tick) runs the same heal pass.

**Why:** Daemon crashes mid-chain would stall missions forever without a safety net.

**Do:**
- If any running process alive → skip
- 30-second grace period to avoid thrashing
- No eligible tasks → mark completed
- Dispatchable tasks exist → re-dispatch up to slot budget
- Otherwise → mark stalled with operator report

**Fix before porting:**
- Windows PID recycling breaks signal-0 checks — use PID+start-time
- Dead rows linger forever — add reaper
- Queued-but-unpersisted tasks need explicit wave records

### FA-N13 — Retry ladder + restart context injection

**What:** Layered retry ladder ending in human gate; feed chain history into prompts.

**Why:** Agents that don't know what was tried waste time repeating failures.

**Do:**
- Retry layers: session continuation → daemon queue → chain re-execution → human gate
- Feed task history into prompts ("avoid duplicating work done")
- At 3+ failures, escalate with retry differently/skip/stop

**Caveat:** MC has 3 separate attempt counters — consolidate into one ledger.

---

## Core Task Model

### FA-N14 — Two parallel task domains

**What:** Human planning tasks (kanban) vs machine-executed agent actions (field task FSM). Never merge.

**Why:** Humans and machines think about tasks differently.

**Do:**
- Human: kanban + Eisenhower priority quadrants
- Machine: 8-state FSM with risk-tiered approvals
- Bridge via linked-task IDs
- Coordinate via inbox messages

**Safety to port:**
- Financial/high-impact always require approval
- Bypass detector: skip approval = rejected
- Circuit breaker: 3 failures = auto-pause
- Owner-only approvals

### FA-N15 — Fix-before-port register (9 gaps)

**What:** Nine gaps that must close before porting dual-task domain.

**Key fixes:**
- Agent assignment accepts any string — validate against registry
- Kanban has no transition guards — add if agents write directly
- blockedBy never enforced — wire or drop
- scheduledFor dead — wire scheduler or remove
- Two enum definitions — one source of truth
- No numeric priority — add for multi-agent scheduling
- Single-owner approval — design multi-operator
- Two activity logs — consolidate
- Date.now() IDs risk collision — use uuid/cuid

---

## Operator UX

### FA-N16 — Decision queue for operator intervention

**What:** File-backed decision queue so operators intervene during autonomous runs.

**Why:** Autonomous agents need human judgment for risky decisions.

**Do:**
- Return pending decision in error response (renders without extra fetches)
- On failure with pending decision, open dialog; on answer, re-invoke run
- Show on sidebar badge, dashboard, agent status
- Structured escalation: retry differently / skip / stop
- Operator answers injected into next prompt

**Keep:**
- Append-mostly audit trail
- Activity events for requested/answered

### FA-N17 — Fix-before-port register (8 gaps)

**Key fixes:**
- Cross-process file races — single-writer store
- Answers re-inject forever — add consumption marker
- 300ms delay polling — event-driven
- No TTL on pending — add aging
- DELETE is silent — log audit event
- Duplicate-guard only pending — dedupe full history
- No auth on endpoints — add enforcement
- Options not enforced — optional strict mode

**Architecture:** Keep both tiers (decision queue + approvals) sharing one UI surface.

---

## Provider-Neutral Runner & Agent Hooks

### FA-N1 — Provider-neutral agent runner

**What:** Promote config into SpawnSpec contract; collapse 14 IPC handlers into one.

**Why:** 31-agent catalog already exists. Formal contract avoids rewrite risk.

**Do:**
- Define SpawnSpec from existing config
- One parameterized channel replaces 14 handlers
- Extract per-provider parsing into profile modules

**Fact:** 14 managed targets, 18 live paths (5 via plugins).

### FA-N2 — Keep zero-polling event-push architecture

**What:** Status refresh is fully event-driven. Preserve in any refactor.

**Preserve:** UUID token, slowloris guard, fail-open for malformed bodies, loopback-only.

### FA-N3 — Plugin host as agent-capability substrate

**What:** Reuse plugin runtime for agent packages. Close 4 gaps first.

**Existing (reuse):** Forked child, minimal SDK, zod protocol, capability gate, supervision FSM, slot pool.

**Gaps to close:**
- Raw Node power → restricted runtime
- No exec/spawn/fs → design audited primitive
- Closed event set → add agent-domain events
- No version handshake → add negotiation

### FA-N4 — Add "Agents" to Cmd+J palette

**What:** Surface agent operations in palette. Cheap, high-value.

**Do:** Launch/resume/send prompt/switch account as first actions. Reuse telemetry schema.

### FA-N5 — WSL guardrails

**Key rules:**
- Never hand-build `wsl.exe bash -c` strings — use helpers
- New env vars must register in WSLENV allowlist
- WSL deletes are true `rm` — keep containment intact
- 9P is hostile for stat/watch — use async fallbacks
- Avoid sync probes on main thread
- Auth per-runtime AND per-distro

### FA-N6 — Telemetry rebrand

**Keep:** Two isolated lanes, compile-time constants, consent resolver, strict schemas, burst caps, triple redaction, custom crash reporting.

**Clear 11 leaks:** feedback endpoint, privacy URL, event names, channel property, build constants, env renames, IPC literals, artifact names, PostHog decision, search keyword, dialog copy.

---

## Execute Guard Stack & Task Model Sequencing

### FA-N7 — Execute guard stack as one ordered layer

**Port:** Risk table, bypass predicate, FSM enums, atomic rate limiters, spend ladder, circuit breaker, decrypt-at-use, owner guard.

**Fix before porting:** No owner check on execute, creation-path approval hole, batch bypass, expired credentials, unlimited retries, dead config, ad-hoc adapter invocation.

### FA-N8 — Decision queue interaction pattern

**Port:** Block-with-payload, intercept-and-rerun, ambient badges, structured escalation, answers-as-context.

**Fix before porting:** No consumption marker, file races, no auth, silent DELETE, no TTL, invalid status values.

### FA-N9 — Dual task domain as core model

**Adopt:** Human kanban + machine FSM + bridge + inbox coordination + mutex persistence + pre-flight gating.

**Fix before porting:** Same as FA-N15.

### FA-N10 — Sequencing rule

**Order:** Task model → guard stack → decision queue.

**Acceptance criteria:**
- Every mutating handler has bypass predicate
- No action bypasses approval gate
- One enum per state machine
- Operator answers have consumption semantics
- Rate limiters atomic and persisted

---

*Last updated: 2026-09-01*
