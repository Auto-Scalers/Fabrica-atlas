# Atlas Roadmap — First Batch Feature Details

> **Purpose:** detailed, actionable roadmap for the first batch of After-Rebrand Fabrica. Each feature has scope, acceptance criteria, source patterns, and dependencies.
>
> **Companion:** `atlas-dna.md` (what Fabrica IS — read this first)
> **Source:** Atlas corpus (91 tasks, 34 discovery reports, 30+ verification passes)
>
> **How to read:** Features are ordered by dependency. Do not skip ahead. Each feature lists what to build, what to NOT build, and how to know it's done.

---

## Batch 0 — Foundation (do first, do cheap)

> These are pre-work items that protect what exists and set up the rebrand. They're cheap, high-value, and block everything else.

### F0.1 — Watcher Stack Freeze

**What:** Declare the crash-isolated watcher stack as frozen public API. Add a reviewer checklist: no renames, no refactors, no "improvements" without a coordinated three-layer migration plan.

**Acceptance criteria:**
- [ ] `AGENTS.md` or equivalent documents the freeze
- [ ] Reviewer checklist added to PR template
- [ ] Every watch-related handler tagged with "DO NOT RENAME" comment

**What NOT to do:**
- Do not refactor the watcher stack
- Do not rename any watcher-related channels
- Do not "improve" the canary/fuse logic

**Evidence:** `fa-ipc-watchers.md:407`, FA-T11, integration-map risk R9

---

### F0.2 — IPC Channel Contract Freeze

**What:** Declare the `<namespace>:<action>` channel naming convention as frozen. 342 channels across 65 files — no renames without a coordinated migration plan.

**Acceptance criteria:**
- [ ] Channel contract documented as public API
- [ ] Any new channel must follow `<namespace>:<action>` convention
- [ ] No existing channels renamed

**What NOT to do:**
- Do not rename any of the 342 existing channels
- Do not consolidate channels
- Do not change the namespace convention

**Evidence:** `fa-ipc-watchers.md` §8.4, FA-T11, integration-map risk R1

---

### F0.3 — Rebrand Strategy Adoption

**What:** Keep on-disk filenames, Chromium partition strings, `FABRICA_*` env vars, and safeStorage key names unchanged. Change display surfaces only.

**Acceptance criteria:**
- [ ] PM formally approves the strategy
- [ ] `FABRICA_*` env vars stay as-is (don't rename to new brand)
- [ ] SafeStorage key names stay as-is
- [ ] Chromium partition strings stay as-is
- [ ] Only display-facing strings change (UI labels, window titles, about dialog)

**What NOT to do:**
- Do NOT rename safeStorage keys (orphans all stored ciphertext)
- Do NOT rename Chromium partition strings (orphans data)
- Do NOT rename `FABRICA_*` env vars (~130 variables cascade)

**Evidence:** `fa-settings-config-datadirs.md:286-309`, FA-T14

---

### F0.4 — Palette "Agents" Section

**What:** Insert agent catalog + quick commands into the Cmd+J palette. The plumbing is already there — this is wiring, not building.

**Acceptance criteria:**
- [ ] Agent catalog appears in Cmd+J palette
- [ ] Quick commands for each agent are callable from palette
- [ ] Telemetry schema needs zero migration

**What NOT to do:**
- Do not rebuild the palette
- Do not change the keybinding registry
- Do not modify the telemetry schema

**Effort:** small — plumbing verified present

**Evidence:** FA-N4, `quick-actions.ts:59-182`, wave-4 PASS

---

## Batch 1 — Task Model + Guards (the foundation of supervision)

> Everything else hangs off this. Do not skip. Do not parallelize with Batch 0.

### F1.1 — Two-Domain Task Model

**What:** Port MC's dual task domain: human kanban (3 states, no FSM) + machine FieldTask (8-state approval FSM) with `linkedTaskId` bridge.

**Acceptance criteria:**
- [ ] One enum source-of-truth for all task states
- [ ] Human kanban: 3 states (todo, in_progress, done) — no FSM
- [ ] Machine FieldTask: 8-state approval FSM with VALID_TRANSITIONS graph
- [ ] `linkedTaskId` bridges human kanban ↔ machine FieldTask
- [ ] Dead `scheduledFor` field removed
- [ ] Numeric priority field added
- [ ] UUID-based task IDs (not string concatenation)
- [ ] Registry-resolved assignment (no string-role hardcoding)

**What NOT to port:**
- MC's string-role assignment pattern
- MC's dead `scheduledFor` field
- MC's non-UUID task IDs
- MC's dual-enum confusion (keep ONE enum)

**Source:** `mc-fieldtask-kanban.md` (wave-7 PASS), FA-N9, FA-N14, FA-N15

---

### F1.2 — Ordered Execute-Guard Stack

**What:** Port MC's 13-layer guard stack to ONE boundary at `register-core-handlers.ts:109-234`. Fix the 7 known defects while porting.

**Acceptance criteria:**
- [ ] One guard stack at ONE IPC boundary
- [ ] All 13 layers in canonical order (risk table → bypass detection → rate limiter → spend ladder → circuit breaker → owner guard → ...)
- [ ] Every state-mutating handler carries the bypass predicate
- [ ] Fix-before-port items applied:
  - [ ] Owner check on execute route
  - [ ] Creation-path approval hole closed
  - [ ] Batch bypass blocked
  - [ ] Expired credentials rejected
  - [ ] Password rate limiter persisted atomically
  - [ ] Dead `SOFT_LIMIT` config removed
  - [ ] Ad-hoc adapter invocation removed

**What NOT to port:**
- MC's implementation style (port the LAYER ORDER, not the code)
- MC's ad-hoc adapter invocation pattern
- MC's dead `SOFT_LIMIT` knobs

**Source:** `mc-execute-guards.md` §14-§15 (wave-5 PASS), FA-N7

---

## Batch 2 — Decision Queue + Persistence

> Depends on Batch 1. The task model exists; now give it durability and decision-making.

### F2.1 — Decision-Gate Escalation

**What:** Port MC's decision-gate system. Pending decisions freeze dispatch. After N failures, inject structured Retry/Skip/Stop questions. Answers become prompt context.

**Acceptance criteria:**
- [ ] Pending decisions freeze dispatch (no new runs until resolved)
- [ ] After N failures, inject Retry/Skip/Stop question
- [ ] Answers captured and injected into prompt context
- [ ] Consumption semantics: each decision consumed once (MC defect W4/W5)
- [ ] Transactional main-process-owned store (MC defect W2)
- [ ] Event-driven unblock (MC defect W6)
- [ ] Real dismissed/expired statuses (MC defects W8/W9)
- [ ] Audited deletes (MC defect W3)
- [ ] Full-history dedupe (MC defect W7)
- [ ] Auth on endpoints (MC defect W1)
- [ ] Options-enforcement decision (MC defect W11)

**What NOT to port:**
- MC's TWO separate UI surfaces for intervention (use ONE)
- MC's non-transactional persistence

**Source:** `mc-decision-gates.md` (wave-7 PASS), FA-N8, FA-N16, FA-N17

---

### F2.2 — SQLite Durable Persistence

**What:** Replace memory+JSON supervision with SQLite-backed durable runs, tasks, and approvals. Buzz workflow quartet shape.

**Acceptance criteria:**
- [ ] SQLite database for runs, tasks, approvals
- [ ] Status enums as FSMs with TOCTOU-safe guarded transitions
- [ ] SHA-256 scoped approval tokens
- [ ] At-most-once scheduled-fire claims
- [ ] Atomic writes everywhere (no unlocked cross-process JSON RMW)
- [ ] Generation counters for stale state detection

**What NOT to build:**
- MC's JSON-file persistence pattern
- MC's polling-over-HTTP transport
- MC's triple-duplicated dispatch predicate

**Source:** `bz-db-schema.md` §E (R4-2.3 PASS), FA-T6, FA-T4

---

## Batch 3 — Fleet Hardening

> Depends on Batch 1-2. The supervision foundation exists; now make it production-ready.

### F3.1 — Provider-Neutral Runner

**What:** Promote `TuiAgentConfig` to explicit `Runner.spawn(SpawnSpec)`. Collapse 14 copy-paste `agentHooks:<agent>Status` handlers into one dispatcher.

**Acceptance criteria:**
- [ ] `Runner.spawn(SpawnSpec)` replaces scattered spawn logic
- [ ] One dispatcher replaces 14 copy-paste status handlers
- [ ] Per-provider parsing quirks extracted from `server.ts` (2,907 lines)
- [ ] 18 live pathnames (not 14 managed targets — adopt the corrected count)

**Effort:** medium — highest-leverage internal cleanup

**Source:** `tui-agent-config.ts:49-331`, `agent-hooks.ts:142-323`, FA-N1, wave-6 PASS

---

### F3.2 — Readiness-Gated Spawn + Orphan Sweep

**What:** Port buzz's managed-agent lifecycle: readiness check before considering an agent "live", orphan sweep for dead processes, quiescence-window restart policy.

**Acceptance criteria:**
- [ ] Readiness gate: agent must pass readiness check before supervision
- [ ] Orphan sweep: dead processes detected and cleaned up
- [ ] Quiescence window: 3-minute grace period before restart
- [ ] Composes with FA's existing adoption/continuity machinery

**Source:** `readiness.rs:402`, `orphan_sweep.rs:110-119`, 3-min quiescence

---

### F3.3 — Cost Ledger with Budget Enforcement

**What:** Port buzz's `agent_metric_index` ledger shape with MC's layered spend limits. Actually enforce budgets (MC never does).

**Acceptance criteria:**
- [ ] Usage/cost ledger per agent run
- [ ] Budget limits enforced (not just observed)
- [ ] Pre-flight estimates before run starts
- [ ] Spend-ladder brake integrated with guard stack (F1.2)

**Source:** FA-T7, buzz `agent_metric_index` + MC spend limits

---

### F3.4 — Operator Alerting Depth

**What:** Port MC's alerting semantics onto FA's existing attention pipeline. Four gaps to fill: first-fetch suppression, dead-backend signal, seen-vs-acknowledged separation, aging escalation.

**Acceptance criteria:**
- [ ] First-fetch suppression (don't alert on initial load)
- [ ] Dead-backend signal (alert when agent process dies)
- [ ] Seen-vs-acknowledged separation (two states, not one)
- [ ] Aging escalation (unacknowledged alerts escalate over time)
- [ ] DO NOT port MC's zero outbound transports (FA's pipeline is better)

**Source:** FA-T13, `mc-notifications-alerting.md`

---

## Batch 4 — Polish + Launch Readiness

> Final pass before shipping.

### F4.1 — Telemetry Leak Register Cleared

**What:** Clear the 11-item telemetry leak register. Brand-prefixed event names, common props, consent reason literals, on-disk artifact names.

**Acceptance criteria:**
- [ ] All 11 leak items addressed
- [ ] Brand-prefixed event names (PostHog funnel breakage risk)
- [ ] Common prop on every event
- [ ] Consent reason literals updated
- [ ] On-disk artifact names updated
- [ ] PostHog continuity decision made

**Source:** `fa-telemetry-consent.md` §11, FA-N6

---

### F4.2 — Verification Debt Closure

**What:** Spot-verify the two HYG-ONLY reports and resolve the never-landed reports.

**Acceptance criteria:**
- [ ] `mc-adapters-linelevel.md` factually verified
- [ ] `fa-wsl-remote-execution.md` factually verified
- [ ] `bz-pair-relay-cli.md` verified or de-scoped
- [ ] Three never-landed reports (auth-onboarding, voice-media, UI-frontend) resolved

**Source:** exec-summary risk 7, Q9/Q10

---

### F4.3 — Risk Register Sign-Off

**What:** All red risks resolved or accepted.

**Acceptance criteria:**
- [ ] R1 (rename blast radius) — mitigated by F0.2
- [ ] R-Rename (rebrand breaks) — mitigated by F0.3
- [ ] R9 (watcher fragility) — mitigated by F0.1
- [ ] R2 (chokepoint concentration) — acknowledged, contribution guidelines in place
- [ ] R4 (plugin sandbox honesty) — mitigated by F3.1
- [ ] R5/R6 (token/fail-open) — accepted consciously or redesigned

**Source:** `atlas-risk-register.md`, exec-summary §3

---

## Dependency Graph

```
F0.1 (watcher freeze) ─────────────────────────────► Batch 1
F0.2 (channel freeze) ─────────────────────────────► Batch 1
F0.3 (rebrand strategy) ────────────────────────────► Batch 4 (F4.1)
F0.4 (palette agents) ──────────────────────────────► Batch 1 (operator visibility)

F1.1 (task model) ──────────► F1.2 (guards) ──► Batch 2
F1.2 (guards) ──────────────► Batch 3 (F3.3 spend-ladder)

F2.1 (decision gates) ◄──── F2.2 (SQLite persistence)
F2.2 (SQLite) ──────────────► Batch 3

F3.1 (runner) ─── can run parallel with F3.2/F3.3/F3.4
F3.2 (spawn/orphan) ◄────── F2.2 (needs durable task model)
F3.3 (cost ledger) ◄─────── F1.2 (needs guard stack)
F3.4 (alerting) ◄────────── F2.2 (needs durable task model)

F4.1 (telemetry) ◄───────── F0.3 (needs rebrand strategy final)
F4.2 (verification) ◄────── independent
F4.3 (risk sign-off) ◄───── all of Batch 1-3
```

---

## Effort Estimates (rough)

| Batch | Features | Estimated effort |
|-------|----------|-----------------|
| Batch 0 | F0.1–F0.4 | 1-2 days |
| Batch 1 | F1.1–F1.2 | 1-2 weeks |
| Batch 2 | F2.1–F2.2 | 1-2 weeks |
| Batch 3 | F3.1–F3.4 | 2-3 weeks |
| Batch 4 | F4.1–F4.3 | 1 week |
| **Total** | | **5-8 weeks** |

---

## What "Done" Looks Like

When all 4 batches ship, Fabrica is:

1. **Rebranded** — display surfaces changed, on-disk identifiers preserved
2. **Supervised** — durable task model, guard stack, decision gates
3. **Fleet-ready** — provider-neutral runner, readiness-gated spawn, cost enforcement
4. **Launch-ready** — telemetry clean, verification complete, zero red risks

The App orchestrator executes these batches. The Atlas package hands them everything they need — every feature has source patterns, acceptance criteria, and fix-before-port lists.

---

_Last updated: 2026-08-23_
_Source: Atlas corpus (91 tasks, 34 discovery reports, 30+ verification passes)_
