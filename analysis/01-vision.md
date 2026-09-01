# 01 — What We're Building

> The target: a desktop command center where you delegate work to AI agents and supervise everything through one surface.

---

## Product Definition

**Fabrica** is the single desktop command center where a builder (technical or not) delegates work to a fleet of AI agents — coding work in worktrees, business operations through real-world services — and supervises everything through one legible surface: priorities, activity, decisions, spend, and history.

*You decide what matters; agents do the work; Fabrica makes it safe, visible, and reversible.*

### Design Principles

1. **Agents are members, not tools** — persistent identities, own credentials, own audit trail
2. **Safety before autonomy** — nothing real-world happens without an approval path, spend cap, and kill switch
3. **One source of truth** — every action becomes a queryable record
4. **Legibility over raw access** — sentence-per-item activity, outcome-first, progressive disclosure
5. **Local-first, cloud-optional** — the operator owns their data
6. **The human is the owner** — security settings are owner-guarded; agents can never change them

---

## Layered Architecture

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

## Subsystems

### Management Plane (the operator's cockpit)

- **Priorities Board**: importance × urgency quadrants (Do/Schedule/Delegate/Eliminate); drag to re-prioritize
- **Goal Tree**: objectives → milestones → tasks with computed progress
- **Brain Dump**: one-key capture; triage agent converts to structured tasks
- **Decision Inbox**: every blocked-on-human question lands here; answerable from desktop, CLI, or phone; answering unblocks the waiting run
- **Activity Feed**: unified sentence-per-item stream across all agents; failures rise, reads recede
- **Checkpoints**: save/restore/export/import full workspace state

### Operations Plane (real-world actions, safely)

- **Service Catalog**: curated services (social, email, payments, publishing, ads, CRM, analytics) with risk level, auth type, config fields
- **Adapters**: validate → execute → health-check → report; dry-run everywhere; secrets decrypted only inside execution; plugin-contributable
- **Approval Workflow**: risk classification per task type; autonomy levels per mission; server-side enforcement; batch approve/reject with mandatory rejection feedback
- **Spend Governor**: global budgets + per-service limits; USD estimation; pause-on-breach pauses all missions
- **Circuit Breaker**: 3 consecutive failures → auto-pause + escalation to Decision Inbox
- **Vault**: AES-256-GCM + master password; 30-min sessions; brute-force lockout; owner-guard on safety settings
- **Emergency Stop**: one action halts dispatch, pauses missions, locks vault, logs everywhere

### Orchestration Engine (extended)

- Dependency-aware auto-dispatch with concurrency slots and stall detection
- Loop detection: N failures → escalate with options
- Continuation chains: timed-out sessions re-spawn with progress notes
- Automations v2: triggers (schedule, event, webhook, message) + actions (dispatch, send, call, approve, delay)

### Agent Runtime (extended)

- Agent Memory (engrams): durable, addressable records per agent; injectable into prompts
- Agent Identity & Attribution: stable identity per agent; every action attributable
- Token-economy APIs: filtered/sparse/batched reads for agent-facing methods

### Platform Services

- Event Log & Audit: append-only log with hash-chained entries
- Plugin System: out-of-process hosts, consent gating, marketplace — also the adapter extension point
- Terminal Daemon: PTYs survive restarts; scrollback persistence
- Relay + Mobile: E2EE pairing; mobile gets Decision Inbox push + approve/deny + spend alerts
- CLI: new command groups mirroring the new planes — all `--json`

---

## Data Model

- **WorkItem** (polymorphic): id, title, priority, goal, milestones, tags, blocked-by
  - **CodeTask**: worktree, agent session, kanban, subtasks, criteria
  - **FieldTask**: type, service, payload, approval FSM, result, spend
  - **Automation**: trigger, steps, schedule
- **Goal**: title, type (long/medium), parent, milestones, progress
- **Decision**: requested-by, question, options, context, status, answer
- **Agent Profile**: name, persona, identity key, memory refs, status
- **Service Connection**: catalog id, auth type, risk level, credential, allowed agents, spend limits
- **Mission**: autonomy level, field task ids, circuit breaker state
- **Activity Event**: actor, verb, object, outcome, refs, timestamp
- **Audit Entry**: hash-chained (prev hash, action, actor, target, metadata)

Storage: local JSON/SQLite per domain, encrypted vault file, audit chain, all under userData.

---

## Security Model

Owner-guard on safety mutations · vault sessions with lockout · risk-based approval enforcement (server-side) · rate limiters · SSRF guards · secret scrubbing in logs · compile-time-gated telemetry · E2EE mobile · plugin consent + kill list · emergency stop

---

## Surfaces

Dashboard · Priorities · Goals · Brain Dump · Decisions · Workspaces · Operations · Agents · Activity · History/Vault · Settings (+ Safety pane)

---

## What We Deliberately Do NOT Adopt

- Nostr relay / multi-community tenancy (concepts only)
- JSON-file persistence as-is (adopt schemas, use Fabrica stores)
- Blockchain/crypto beyond optional wallet adapter
- Shadow bans / silent enforcement (honest tombstones only)
