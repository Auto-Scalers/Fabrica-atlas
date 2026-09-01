# Production Architecture — Fabrica

> Defines the complete picture of what the production Fabrica app should be: a **desktop agent management and operations platform for business and coding builders/operators**.

---

## 1. Layered Architecture

```
┌──────────────────────────────────────────────────────────┐
│  SURFACES                                                │
│  Desktop App · CLI · Mobile Companion · Web View         │
├──────────────────────────────────────────────────────────┤
│  MANAGEMENT PLANE          (new — from Mission Control)  │
│  Priorities · Goals · Brain Dump · Decision Inbox        │
│  Activity Feed · Checkpoints · Dashboards                │
├──────────────────────────────────────────────────────────┤
│  OPERATIONS PLANE          (new — from Mission Control)  │
│  Service Catalog · Adapters · Approval Workflows         │
│  Spend Governor · Vault · Circuit Breaker · Emergency Stop│
├──────────────────────────────────────────────────────────┤
│  ORCHESTRATION ENGINE      (existing Fabrica, extended)  │
│  Runs · Tasks · Workers · Dispatch · Gates · Automations │
│  Loop Detection · Continuation Chains · Concurrency      │
├──────────────────────────────────────────────────────────┤
│  AGENT RUNTIME             (existing Fabrica, extended)  │
│  Provider integrations · Hooks · Accounts · Rate-limits  │
│  AI Vault · Worktrees · Execution providers              │
├──────────────────────────────────────────────────────────┤
│  PLATFORM SERVICES                                       │
│  Agent Identity · Event Log/Audit · Plugin System        │
│  Terminal Daemon · Relay (desktop↔mobile, E2EE)          │
├──────────────────────────────────────────────────────────┤
│  STORAGE                                                 │
│  Local stores (JSON/SQLite) + Keychain + file system     │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Subsystem Descriptions

### 3.1 Management Plane (the operator's cockpit)

- **Priorities Board**: every unit of work carries importance × urgency. Four quadrants (Do / Schedule / Delegate / Eliminate); drag to re-prioritize; delegation routes to the orchestration engine.
- **Goal Tree**: long-term objectives → milestones → tasks with computed progress from linked agent work.
- **Brain Dump**: one-key capture; triage agent (or manual) converts entries into structured tasks assigned to the right agent or the owner.
- **Decision Inbox**: every blocked-on-human question lands here — approvals, spend requests, loop-detection escalations. Answerable from desktop, CLI, or phone; answering unblocks the waiting run automatically.
- **Activity Feed**: unified, sentence-per-item stream across all agents and actions. Failures rise, reads recede; raw detail one click away.
- **Checkpoints**: save / restore / export / import full workspace state.

### 3.2 Operations Plane (real-world actions, safely)

- **Service Catalog**: curated services across categories (social, email, payments, publishing, ads, CRM, analytics…), each with setup guide, risk level, auth type, and config fields.
- **Adapters**: stateless modules that validate → execute → health-check → report financials; dry-run everywhere; secrets decrypted only inside adapter execution. Plugin-contributable.
- **Approval Workflow**: risk classification per task type (high = payments/crypto/ads; medium = email/social/publish; low = design); autonomy levels per mission (Manual / Supervised / Full Autonomy); server-side enforcement, never client-trusted; batch approve/reject with mandatory rejection feedback.
- **Spend Governor**: global budgets (day/week/month) + per-service limits (per-tx, daily, approved recipients); USD estimation heuristics; pause-on-breach pauses all active missions; spend log with summaries.
- **Circuit Breaker**: 3 consecutive failures in a mission → auto-pause + escalation to Decision Inbox.
- **Vault**: AES-256-GCM encryption with master password, 30-minute unlock sessions, brute-force lockout. Secrets decrypted only inside adapter execution. Owner-guard: only the owner can change safety settings.
- **Emergency Stop**: one action halts dispatch, pauses missions, locks vault, logs everywhere.

### 3.3 Orchestration Engine (extended)

- **Dependency-aware auto-dispatch** with concurrency slots and stall detection
- **Loop detection**: N failed attempts → escalate with options instead of retrying forever
- **Continuation chains**: timed-out sessions re-spawn with progress notes, bounded per task
- **Automations v2**: declarative automations with triggers (schedule, event, webhook, message) and actions (dispatch task, send message, call webhook, request approval, delay), conditions sandboxed, capacity-bounded

### 3.4 Agent Runtime (existing, extended)

- **Agent Memory (engrams)**: durable, addressable memory records per agent (create / read / update / delete, content-hash dedup); surfaced in AI Vault; injectable into prompts at dispatch.
- **Agent Identity & Attribution**: every agent gets a stable identity; every action is attributable; reputation signals derived from outcomes over time.
- **Token-economy APIs**: filtered / sparse / batched reads for agent-facing methods; generated workspace-context snapshots for cheap situational awareness.

### 3.5 Platform Services

- **Event Log & Audit**: one append-only local log with hash-chained audit entries for security-relevant actions; honest tombstones for deletions.
- **Plugin System**: out-of-process hosts, consent gating, marketplace with integrity checks and kill list — also the adapter extension point.
- **Terminal Daemon**: PTYs survive restarts; scrollback persistence.
- **Relay + Mobile**: E2EE pairing; mobile gains Decision Inbox push + approve/deny + spend alerts.
- **CLI**: new command groups mirroring the new planes — all `--json`, agent-consumable.

---

## 3. Data Model (core entities)

- **WorkItem**: id, title, priority (importance × urgency), goal, milestones, tags, blocked-by, timestamps
  - **CodeTask**: worktree, agent session, kanban status, subtasks, criteria
  - **FieldTask**: type (social post, email, payment, publish, crypto, custom), service, payload, approval state, result, spend in USD
  - **Automation**: trigger, steps, schedule
- **Goal**: id, title, type (long / medium), parent goal, milestones, progress
- **Brain Dump Entry**: content, processed status, converted-to
- **Decision**: requested-by, question, options, context, status, answer
- **Agent Profile**: id, name, persona (instructions / capabilities / skills), identity key, memory references, status
- **Service Connection**: catalog id, auth type, risk level, credential (vault reference), allowed agents, spend limits
- **Mission**: autonomy level, field task ids, circuit breaker state
- **Activity Event**: actor (agent / owner / system), verb, object, outcome, references, timestamp
- **Audit Entry**: hash-chained (previous hash, action, actor, target, metadata)
- **Spend Entry**: service, amount USD, window, task
- **Checkpoint**: full-state snapshot + stats
- **Memory Record (engram)**: agent, kind, content, hash, references

Storage: local JSON/SQLite stores per domain, vault file encrypted, audit chain file, all under userData; checkpoints exportable.

---

## 4. Security Model (summary)

- Owner-guard on all safety mutations
- Vault sessions with lockout
- Risk-based approval enforcement (server-side)
- Rate limiters (vault unlock, executions)
- SSRF guards on outbound webhooks/adapters
- Secret scrubbing in logs
- Compile-time-gated telemetry
- E2EE mobile channel
- Plugin consent + kill list
- Emergency stop

---

## 5. Surfaces & UX Map

- **Dashboard**: attention panel (decisions, approvals, breaches, priority quadrant), agent fleet status, spend summary, recent activity feed
- **Priorities** (Eisenhower board)
- **Goals** (tree view)
- **Brain Dump**
- **Decisions** (inbox)
- **Workspaces** (worktree workbench — unchanged core for coding)
- **Operations** (missions, field tasks, approvals queue, services, safety)
- **Agents** (fleet, personas, memory, usage, reputation)
- **Activity** (unified feed)
- **History / Vault** (sessions + resume)
- **Settings** (including Safety pane)

---

## 6. What We Deliberately Do NOT Adopt

- Nostr relay / multi-community tenancy (concepts only; Fabrica keeps its own runtime / RPC / storage)
- JSON-file persistence as-is for Fabrica's scale (adopt schemas, use Fabrica-native stores)
- Blockchain / crypto beyond optional wallet adapter
- Shadow bans / silent enforcement (honest tombstones only)

---

*This is the production picture, refined by Round 2–4 evidence. The detailed phased build sequence lives in `analysis/implementation-plan.md`.*
