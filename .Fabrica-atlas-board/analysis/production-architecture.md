> **PATH MIGRATION NOTICE (2026-08-21):** This project moved from the environment root into `Fabrica-atlas/`. All `_sources/...` paths in this document now resolve to `Fabrica-atlas/_sources/...`. `Fabrica-app/` remains at the environment root.
# Production Architecture â€” Fabrica, the Agent Operations Platform

> Task 3.2 â€” Group 3 (Synthesis & Concept Mapping), Roadmap 02, Round 1.
> Defines the complete picture of what the production Fabrica app should be: a **desktop CLI agent management and operations platform for business and coding builders/operators**.
> Built from: verified discoveries (MC/BZ/FA) + similarities-gaps analysis + existing FA strengths.

---

## 1. Product Definition

**Fabrica** is the single desktop command center where a builder (technical or not) delegates work to a fleet of AI agents â€” coding work in worktrees, business operations through real-world services â€” and supervises everything through one legible surface: priorities, activity, decisions, spend, and history.

One sentence: *You decide what matters; agents do the work; Fabrica makes it safe, visible, and reversible.*

### Design principles (inherited from the three sources)
1. **Agents are members, not tools** â€” persistent identities, own credentials, own audit trail (BZ).
2. **Safety before autonomy** â€” nothing real-world happens without an approval path, spend cap, and kill switch (MC).
3. **One source of truth** â€” every action becomes a queryable record (BZ/MC).
4. **Legibility over raw access** â€” sentence-per-item activity, outcome-first, progressive disclosure (BZ VISION_ACTIVITY).
5. **Local-first, cloud-optional** â€” the operator owns their data (MC/BZ).
6. **The human is the owner** â€” security settings are owner-guarded; agents can never change them (MC).

---

## 2. Layered Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  SURFACES                                                          â”‚
â”‚  Desktop (Electron) Â· CLI (fabrica) Â· Mobile companion Â· Web view  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  MANAGEMENT PLANE            (new â€” from MC)                       â”‚
â”‚  Priorities (Eisenhower) Â· Goalsâ†’Milestonesâ†’Tasks Â· Brain Dump    â”‚
â”‚  Decision Inbox Â· Activity Feed Â· Checkpoints Â· Dashboards        â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  OPERATIONS PLANE            (new â€” from MC Field Ops)             â”‚
â”‚  Service Catalog Â· Adapters Â· Approval Workflows Â· Spend Governor â”‚
â”‚  Encrypted Vault Â· Circuit Breaker Â· Emergency Stop               â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  ORCHESTRATION ENGINE        (existing FA, extended)               â”‚
â”‚  Runs Â· Tasks Â· Workers Â· Dispatch Â· Gates Â· Schedules/Automationsâ”‚
â”‚  Loop Detection Â· Continuation Chains Â· Concurrency Slots         â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  AGENT RUNTIME               (existing FA, extended)               â”‚
â”‚  Provider integrations (17+ CLIs) Â· Hooks/status plane Â· Accountsâ”‚
â”‚  Usage/rate-limits Â· AI Vault (sessions+memory) Â· Worktrees       â”‚
â”‚  Execution providers: Local / SSH / Daemon / (Remote resident*)   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  PLATFORM SERVICES                                                 â”‚
â”‚  Identity & Attribution* Â· Event Log/Audit Â· Plugin System        â”‚
â”‚  Terminal Daemon Â· Relay (desktopâ†”mobile, E2EE) Â· Telemetry       â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  STORAGE                                                           â”‚
â”‚  Local stores (JSON/SQLite) + Keychain/keyring + file system      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
(* = new capability)
```

---

## 3. Subsystem Specifications

### 3.1 Management Plane (the operator's cockpit)
- **Priorities Board**: every unit of work (coding task, field task, automation) carries importanceÃ—urgency. Four quadrants (Do/Schedule/Delegate/Eliminate); drag to re-prioritize; delegation routes to the orchestration engine. *(MC pattern; FA surfaces)*
- **Goal Tree**: long-term objectives â†’ milestones â†’ tasks with computed progress from linked agent work. Coding tasks link via repo/worktree; ops tasks link via field tasks. *(MC)*
- **Brain Dump**: one-key capture; triage agent (or manual) converts entries into structured tasks assigned to the right agent or the owner. *(MC)*
- **Decision Inbox**: every blocked-on-human question lands here â€” orchestration gates, workflow approvals, spend requests, loop-detection escalations (retry differently/skip/stop). Answerable from desktop, CLI, or phone; answering unblocks the waiting run automatically. *(MC decisions + FA gates + mobile push)*
- **Activity Feed**: unified, sentence-per-item stream ("Edited runtime.rs (+12/âˆ’3)", "Posted tweet â†’ url", "Ran tests â†’ 1248 passed") across all agents and actions; 12 render classes; mutate-in-place rows; failures rise, reads recede; raw detail one click away. *(BZ design applied to FA events)*
- **Checkpoints**: save/restore/export/import full workspace state (worktrees metadata, sessions, settings, management data). *(MC)*

### 3.2 Operations Plane (real-world actions, safely)
- **Service Catalog**: curated services across categories (social, email, payments, publishing, ads, CRM, analyticsâ€¦), each with setup guide, risk level, auth type, config fields. *(MC 64-service model)*
- **Adapters**: stateless `validatePayload â†’ execute(ctx) â†’ healthCheck â†’ getFinancials?` contract; dry-run everywhere; never-throw results; credential decryption last. First-class adapters: X/Twitter, Reddit, Gmail, LinkedIn, Stripe, Ethereum/wallet; plugin-contributable adapters via the FA plugin host. *(MC interface + FA plugin platform)*
- **Approval Workflow**: risk classification per task type/service (high=payments/crypto/ads; medium=email/social/publish; low=design); autonomy levels per mission (Manual Approval / Supervised / Full Autonomy); server-side enforcement, never client-trusted; batch approve/reject with mandatory rejection feedback. *(MC)*
- **Spend Governor**: global budgets (day/week/month) + per-service limits (per-tx, daily, approved recipients); USD estimation heuristics; pause-on-breach pauses all active missions; spend log w/ summaries. Merged with FA's existing API rate-limit/usage data into one budget plane. *(MC + FA)*
- **Circuit Breaker**: 3 consecutive failures in a mission â†’ auto-pause + escalation to Decision Inbox. *(MC)*
- **Vault**: AES-256-GCM + scrypt master password, 30-min unlock sessions, brute-force lockout, legacy migration, reset-with-confirmation; secrets decrypted only inside adapter execution; plaintext secret detection on service config. Owner-guard: only the owner (actor check / vault session / master password) can change safety settings. *(MC)*
- **Emergency Stop**: one action halts dispatch, pauses missions, locks vault, logs everywhere. *(MC)*

### 3.3 Orchestration Engine (extended FA)
Existing FA runs/tasks/workers/dispatch/gates gain:
- **Dependency-aware auto-dispatch** with concurrency slots and stall detection (MC continuous-mission semantics).
- **Loop detection**: N failed attempts â†’ escalate with options instead of retrying forever (MC).
- **Continuation chains**: timed-out/max-turns sessions re-spawn with progress notes, bounded per task (MC run-task pattern; FA already has session continuation UI).
- **Automations v2**: declarative YAML automations with triggers (schedule | event | webhook | message) and actions (dispatch task | send message | call webhook | request approval | delay), conditions sandboxed, capacity-bounded. *(BZ workflow engine shape, FA runtime as executor)*

### 3.4 Agent Runtime (existing FA, extended)
- Keep: PTY-resident TUI agents, provider integrations, hooks status plane, accounts, usage/rate-limits, AI Vault, worktrees, execution providers (local/SSH/daemon).
- Add **Agent Memory (engrams)**: durable, addressable memory records per agent (create/read/patch/delete, content-hash dedup); surfaced in AI Vault; injectable into prompts at dispatch. *(BZ)*
- Add **Agent Identity & Attribution**: every agent gets a stable identity (keypair-backed); every action row is attributable; reputation signals derived from outcomes over time. *(BZ concept, local-first implementation)*
- Add **Token-economy APIs**: filtered/sparse/batched reads for agent-facing RPC methods; generated workspace-context snapshot for cheap situational awareness. *(MC)*

### 3.5 Platform Services
- **Event Log & Audit**: unify FA's activity events + MC-style domain logs into one append-only local log with hash-chained audit entries for security-relevant actions; honest tombstones for deletions. *(BZ integrity + MC simplicity)*
- **Plugin System** (existing FA): out-of-process hosts, consent gating, marketplace w/ integrity hashes + kill list â€” now also the adapter extension point (3.2).
- **Terminal Daemon** (existing FA): PTYs survive restarts; scrollback persistence.
- **Relay + Mobile** (existing FA): E2EE pairing; mobile gains Decision Inbox push + approve/deny + spend alerts.
- **CLI** (existing fabrica): new command groups mirroring the new planes: `fabrica priorities|goals|braindump|decisions|field-ops|vault|spend` â€” all `--json`, agent-consumable.

---

## 4. Data Model (core entities)

```
WorkItem (polymorphic base): id, title, priority(importanceÃ—urgency), goalId?,
  milestoneId?, tags[], blockedBy[], timestamps
â”œâ”€â”€ CodeTask   â†’ worktreeId, agentSessionRef, kanban, subtasks, criteria
â”œâ”€â”€ FieldTask  â†’ type(social-post|email|payment|publish|crypto|custom),
â”‚                serviceId, payload, approvalState machine, result, spendUsd
â””â”€â”€ Automation â†’ trigger, steps[], schedule?

Goal: id, title, type(long|medium), parentGoalId?, milestones[], progress
BrainDumpEntry: content, processed, convertedTo?
Decision: requestedBy, question, options[], context, status, answer
AgentProfile: id, name, persona(instructions/capabilities/skills), identityKey,
  memoryRefs[], status
ServiceConnection: catalogId, authType, riskLevel, credentialIdâ†’vault,
  allowedAgents[], spendLimits
Mission (ops): autonomyLevel, fieldTaskIds[], circuitBreakerState
ActivityEvent: actor(agent|owner|system), verb, object, outcome, refs, timestamp
AuditEntry: hashChain(prevHash, action, actor, target, metadata)
SpendEntry: serviceId, amountUsd, window, taskId
Checkpoint: full-state snapshot + stats
MemoryRecord (engram): agentId, kind, content, hash, refs[]
```

Storage: local JSON/SQLite stores per domain (FA patterns), vault file encrypted, audit chain file, all under userData; checkpoints exportable.

## 5. Security Model (summary)
Owner-guard on all safety mutations Â· vault sessions w/ lockout Â· risk-based approval enforcement server-side Â· rate limiters (vault unlock, executions) Â· SSRF guards on outbound webhooks/adapters Â· secret scrubbing in logs Â· compile-time-gated telemetry Â· E2EE mobile channel Â· plugin consent + kill list Â· emergency stop.

## 6. Surfaces & UX Map
- **Dashboard**: attention panel (decisions, approvals, breaches, DO-quadrant), agent fleet status, spend summary, recent activity feed.
- **Priorities** (Eisenhower board) Â· **Goals** (tree) Â· **Brain Dump** Â· **Decisions** (inbox)
- **Workspaces** (FA worktree workbench â€” unchanged core for coding)
- **Operations** (missions, field tasks, approvals queue, services, safety)
- **Agents** (fleet, personas, memory, usage, reputation)
- **Activity** (unified feed) Â· **History/Vault** (sessions + resume) Â· **Settings** (+ Safety pane)

## 7. Build Sequence (recommended order)
1. **Phase A â€” Management plane on FA rails**: priorities/goals/brain-dump/decision-inbox data model + UI over existing orchestration; activity feed v1 (render classes) over existing events.
2. **Phase B â€” Operations plane**: port MC's field-task state machine, approval workflow, vault, spend governor, circuit breaker, emergency stop; wire 3 first adapters (X, Gmail, Stripe read-only) using FA plugin host.
3. **Phase C â€” Engine upgrades**: dependency auto-dispatch + loop detection + automations v2 in the orchestration engine; decision gates bridged to Decision Inbox + mobile push.
4. **Phase D â€” Identity/memory/attribution**: agent identities, engram memory in AI Vault, attribution columns in the event log; hash-chain audit for security actions.
5. **Phase E â€” Polish**: checkpoints, token-economy RPC, CLI command groups, reputation signals.

## 8. What We Deliberately Do NOT Adopt
- BZ Nostr relay/multi-community tenancy (concepts only; FA keeps its own runtime/RPC/storage).
- MC JSON-file persistence as-is for FA scale (adopt schemas, use FA stores).
- Blockchain/crypto beyond optional wallet adapter.
- Shadow bans / silent enforcement (honest tombstones only).

---
*This is the Round-1 production picture. Round 2 should decompose each subsystem into function-level specs against actual FA code paths (runtime/orchestration, rpc/methods, renderer features).*

