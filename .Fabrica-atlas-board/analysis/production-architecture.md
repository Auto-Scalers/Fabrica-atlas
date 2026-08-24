> **PATH MIGRATION NOTICE (2026-08-21):** This project moved from the environment root into `Fabrica-atlas/`. All `_sources/...` paths in this document now resolve to `Fabrica-atlas/_sources/...`. `Fabrica-app/` remains at the environment root.
# Production Architecture — Fabrica, the Agent Operations Platform

> Task 3.2 — Group 3 (Synthesis & Concept Mapping), Roadmap 02, Round 1.
> Defines the complete picture of what the production Fabrica app should be: a **desktop CLI agent management and operations platform for business and coding builders/operators**.
> Built from: verified discoveries (MC/BZ/FA) + similarities-gaps analysis + existing FA strengths.

---

## 1. Product Definition

**Fabrica** is the single desktop command center where a builder (technical or not) delegates work to a fleet of AI agents — coding work in worktrees, business operations through real-world services — and supervises everything through one legible surface: priorities, activity, decisions, spend, and history.

One sentence: *You decide what matters; agents do the work; Fabrica makes it safe, visible, and reversible.*

### Design principles (inherited from the three sources)
1. **Agents are members, not tools** — persistent identities, own credentials, own audit trail (BZ).
2. **Safety before autonomy** — nothing real-world happens without an approval path, spend cap, and kill switch (MC).
3. **One source of truth** — every action becomes a queryable record (BZ/MC).
4. **Legibility over raw access** — sentence-per-item activity, outcome-first, progressive disclosure (BZ VISION_ACTIVITY).
5. **Local-first, cloud-optional** — the operator owns their data (MC/BZ).
6. **The human is the owner** — security settings are owner-guarded; agents can never change them (MC).

---

## 2. Layered Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  SURFACES                                                          │
│  Desktop (Electron) · CLI (fabrica) · Mobile companion · Web view  │
├────────────────────────────────────────────────────────────────────┤
│  MANAGEMENT PLANE            (new — from MC)                       │
│  Priorities (Eisenhower) · Goals→Milestones→Tasks · Brain Dump    │
│  Decision Inbox · Activity Feed · Checkpoints · Dashboards        │
├────────────────────────────────────────────────────────────────────┤
│  OPERATIONS PLANE            (new — from MC Field Ops)             │
│  Service Catalog · Adapters · Approval Workflows · Spend Governor │
│  Encrypted Vault · Circuit Breaker · Emergency Stop               │
├────────────────────────────────────────────────────────────────────┤
│  ORCHESTRATION ENGINE        (existing FA, extended)               │
│  Runs · Tasks · Workers · Dispatch · Gates · Schedules/Automations│
│  Loop Detection · Continuation Chains · Concurrency Slots         │
├────────────────────────────────────────────────────────────────────┤
│  AGENT RUNTIME               (existing FA, extended)               │
│  Provider integrations (17+ CLIs) · Hooks/status plane · Accounts│
│  Usage/rate-limits · AI Vault (sessions+memory) · Worktrees       │
│  Execution providers: Local / SSH / Daemon / (Remote resident*)   │
├────────────────────────────────────────────────────────────────────┤
│  PLATFORM SERVICES                                                 │
│  Identity & Attribution* · Event Log/Audit · Plugin System        │
│  Terminal Daemon · Relay (desktop↔mobile, E2EE) · Telemetry       │
├────────────────────────────────────────────────────────────────────┤
│  STORAGE                                                           │
│  Local stores (JSON/SQLite) + Keychain/keyring + file system      │
└────────────────────────────────────────────────────────────────────┘
(* = new capability)
```

---

## 3. Subsystem Specifications

### 3.1 Management Plane (the operator's cockpit)
- **Priorities Board**: every unit of work (coding task, field task, automation) carries importance×urgency. Four quadrants (Do/Schedule/Delegate/Eliminate); drag to re-prioritize; delegation routes to the orchestration engine. *(MC pattern; FA surfaces)*
- **Goal Tree**: long-term objectives → milestones → tasks with computed progress from linked agent work. Coding tasks link via repo/worktree; ops tasks link via field tasks. *(MC)*
- **Brain Dump**: one-key capture; triage agent (or manual) converts entries into structured tasks assigned to the right agent or the owner. *(MC)*
- **Decision Inbox**: every blocked-on-human question lands here — orchestration gates, workflow approvals, spend requests, loop-detection escalations (retry differently/skip/stop). Answerable from desktop, CLI, or phone; answering unblocks the waiting run automatically. *(MC decisions + FA gates + mobile push)*
- **Activity Feed**: unified, sentence-per-item stream ("Edited runtime.rs (+12/−3)", "Posted tweet → url", "Ran tests → 1248 passed") across all agents and actions; 12 render classes; mutate-in-place rows; failures rise, reads recede; raw detail one click away. *(BZ design applied to FA events)*
- **Checkpoints**: save/restore/export/import full workspace state (worktrees metadata, sessions, settings, management data). *(MC)*

### 3.2 Operations Plane (real-world actions, safely)
- **Service Catalog**: curated services across categories (social, email, payments, publishing, ads, CRM, analytics…), each with setup guide, risk level, auth type, config fields. *(MC 64-service model)*
- **Adapters**: stateless `validatePayload → execute(ctx) → healthCheck → getFinancials?` contract; dry-run everywhere; never-throw results; credential decryption last. First-class adapters: X/Twitter, Reddit, Gmail, LinkedIn, Stripe, Ethereum/wallet; plugin-contributable adapters via the FA plugin host. *(MC interface + FA plugin platform)*
- **Approval Workflow**: risk classification per task type/service (high=payments/crypto/ads; medium=email/social/publish; low=design); autonomy levels per mission (Manual Approval / Supervised / Full Autonomy); server-side enforcement, never client-trusted; batch approve/reject with mandatory rejection feedback. *(MC)*
- **Spend Governor**: global budgets (day/week/month) + per-service limits (per-tx, daily, approved recipients); USD estimation heuristics; pause-on-breach pauses all active missions; spend log w/ summaries. Merged with FA's existing API rate-limit/usage data into one budget plane. *(MC + FA)*
- **Circuit Breaker**: 3 consecutive failures in a mission → auto-pause + escalation to Decision Inbox. *(MC)*
- **Vault**: AES-256-GCM + scrypt master password, 30-min unlock sessions, brute-force lockout, legacy migration, reset-with-confirmation; secrets decrypted only inside adapter execution; plaintext secret detection on service config. Owner-guard: only the owner (actor check / vault session / master password) can change safety settings. *(MC)*
- **Emergency Stop**: one action halts dispatch, pauses missions, locks vault, logs everywhere. *(MC)*

### 3.3 Orchestration Engine (extended FA)
Existing FA runs/tasks/workers/dispatch/gates gain:
- **Dependency-aware auto-dispatch** with concurrency slots and stall detection (MC continuous-mission semantics).
- **Loop detection**: N failed attempts → escalate with options instead of retrying forever (MC).
- **Continuation chains**: timed-out/max-turns sessions re-spawn with progress notes, bounded per task (MC run-task pattern; FA already has session continuation UI).
- **Automations v2**: declarative YAML automations with triggers (schedule | event | webhook | message) and actions (dispatch task | send message | call webhook | request approval | delay), conditions sandboxed, capacity-bounded. *(BZ workflow engine shape, FA runtime as executor)*

### 3.4 Agent Runtime (existing FA, extended)
- Keep: PTY-resident TUI agents, provider integrations, hooks status plane, accounts, usage/rate-limits, AI Vault, worktrees, execution providers (local/SSH/daemon).
- Add **Agent Memory (engrams)**: durable, addressable memory records per agent (create/read/patch/delete, content-hash dedup); surfaced in AI Vault; injectable into prompts at dispatch. *(BZ)*
- Add **Agent Identity & Attribution**: every agent gets a stable identity (keypair-backed); every action row is attributable; reputation signals derived from outcomes over time. *(BZ concept, local-first implementation)*
- Add **Token-economy APIs**: filtered/sparse/batched reads for agent-facing RPC methods; generated workspace-context snapshot for cheap situational awareness. *(MC)*

### 3.5 Platform Services
- **Event Log & Audit**: unify FA's activity events + MC-style domain logs into one append-only local log with hash-chained audit entries for security-relevant actions; honest tombstones for deletions. *(BZ integrity + MC simplicity)*
- **Plugin System** (existing FA): out-of-process hosts, consent gating, marketplace w/ integrity hashes + kill list — now also the adapter extension point (3.2).
- **Terminal Daemon** (existing FA): PTYs survive restarts; scrollback persistence.
- **Relay + Mobile** (existing FA): E2EE pairing; mobile gains Decision Inbox push + approve/deny + spend alerts.
- **CLI** (existing fabrica): new command groups mirroring the new planes: `fabrica priorities|goals|braindump|decisions|field-ops|vault|spend` — all `--json`, agent-consumable.

---

## 4. Data Model (core entities)

```
WorkItem (polymorphic base): id, title, priority(importance×urgency), goalId?,
  milestoneId?, tags[], blockedBy[], timestamps
├── CodeTask   → worktreeId, agentSessionRef, kanban, subtasks, criteria
├── FieldTask  → type(social-post|email|payment|publish|crypto|custom),
│                serviceId, payload, approvalState machine, result, spendUsd
└── Automation → trigger, steps[], schedule?

Goal: id, title, type(long|medium), parentGoalId?, milestones[], progress
BrainDumpEntry: content, processed, convertedTo?
Decision: requestedBy, question, options[], context, status, answer
AgentProfile: id, name, persona(instructions/capabilities/skills), identityKey,
  memoryRefs[], status
ServiceConnection: catalogId, authType, riskLevel, credentialId→vault,
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
Owner-guard on all safety mutations · vault sessions w/ lockout · risk-based approval enforcement server-side · rate limiters (vault unlock, executions) · SSRF guards on outbound webhooks/adapters · secret scrubbing in logs · compile-time-gated telemetry · E2EE mobile channel · plugin consent + kill list · emergency stop.

## 6. Surfaces & UX Map
- **Dashboard**: attention panel (decisions, approvals, breaches, DO-quadrant), agent fleet status, spend summary, recent activity feed.
- **Priorities** (Eisenhower board) · **Goals** (tree) · **Brain Dump** · **Decisions** (inbox)
- **Workspaces** (FA worktree workbench — unchanged core for coding)
- **Operations** (missions, field tasks, approvals queue, services, safety)
- **Agents** (fleet, personas, memory, usage, reputation)
- **Activity** (unified feed) · **History/Vault** (sessions + resume) · **Settings** (+ Safety pane)

## 7. Build Sequence (recommended order)
1. **Phase A — Management plane on FA rails**: priorities/goals/brain-dump/decision-inbox data model + UI over existing orchestration; activity feed v1 (render classes) over existing events.
2. **Phase B — Operations plane**: port MC's field-task state machine, approval workflow, vault, spend governor, circuit breaker, emergency stop; wire 3 first adapters (X, Gmail, Stripe read-only) using FA plugin host.
3. **Phase C — Engine upgrades**: dependency auto-dispatch + loop detection + automations v2 in the orchestration engine; decision gates bridged to Decision Inbox + mobile push.
4. **Phase D — Identity/memory/attribution**: agent identities, engram memory in AI Vault, attribution columns in the event log; hash-chain audit for security actions.
5. **Phase E — Polish**: checkpoints, token-economy RPC, CLI command groups, reputation signals.

## 8. What We Deliberately Do NOT Adopt
- BZ Nostr relay/multi-community tenancy (concepts only; FA keeps its own runtime/RPC/storage).
- MC JSON-file persistence as-is for FA scale (adopt schemas, use FA stores).
- Blockchain/crypto beyond optional wallet adapter.
- Shadow bans / silent enforcement (honest tombstones only).

---
*This is the Round-1 production picture. Round 2 should decompose each subsystem into function-level specs against actual FA code paths (runtime/orchestration, rpc/methods, renderer features).*

## Round 4 Addendum — architecture refined by Round 2+3 evidence

> Inputs: all 7 reports in `.Fabrica-atlas-board/discovery/round3/round3/` + ROUND 2/3 ADDENDUM sections of `discovery/fabrica-app-discovery.md` (:213-225), `discovery/buzz-discovery.md` (:316-323), `discovery/mission-control-discovery.md` (:376-381). Underlying source path:line cites quoted from those reports. Sections 1–8 above stand; this addendum grounds them in confirmed code and refines the picture for the desktop CLI-agent-management platform.

### R4-A. Confirmed substrate map — most of the stack already exists in FA

| Architecture layer (§2) | Already built (evidence) | Remaining build |
|---|---|---|
| Agent Runtime / memory | AI Vault: 16-agent source-of-truth table driving discovery+delete (`src/main/ai-vault/session-scanner-agent-sources.ts`, round3/ai-vault-browser.md:25-26); byte-offset incremental parse cache LRU 4096 (round3/ai-vault-browser.md:70-74); forked scanner process, heap cap 384MB, env allowlist never spreading process.env, two serialized lanes, bounded-respawn restart policy (round3/ai-vault-browser.md:82-88); resume prep w/ Codex-home substitution (round3/ai-vault-browser.md:116-117) | Cross-agent shared/engram-style addressability on top |
| Orchestration Engine | Durable SQLite Run/Task/Dispatch/Gate stores, authority-checked settlement (pane-key only), mutation-receipt idempotency, federation pull/ack/import (fabrica-app-discovery.md ROUND 2 ADDENDUM R2.1-R2.2) | Management Plane data model above it |
| Long-lived agent execution (daemon) | Framed OCKL output logs (magic header, torn-append detectable) + checkpoint.json ≤200MB cold restore preferring byte-exact log replay under PrioritySemaphore(1); corrupt generations quarantined `.unreadable-recovery`, never overwritten; tombstones (≤1000) block reattach to killed sessions; per-session incarnationIds discard cross-generation noise; ConPTY warmup at boot (~2.7s→~70ms); macOS login-death retirement; WSL CWD restore ladder (round3/fabrica-app-main-subsystems.md §4) | Nothing material — this is the "agents outlive the UI" foundation |
| Plugin extension point | CLOSED capability set + consent fingerprint; worker lifecycle READY 10s / INVOKE 30s / EVENT 5min / shutdown-grace 2s, backoff [500,2000,5000]ms max 3, slot pool 5 (round3/fabrica-app-plugins.md:20-27); audit-intent-before-handler single chokepoint `executeHostCall` (round3/fabrica-app-plugins.md:35-39); marketplace TOCTOU guard + kill list double-check (round3/fabrica-app-plugins.md:45-60) | Adapter contribution kind for Operations Plane services |
| Web-action executor | browser-manager 2,244 ln security boundary (round3/ai-vault-browser.md:135); cdp-ws-proxy lease-based debugger sharing masquerading as generic Chrome; offscreen headless-serve backend proving UI-less operation (round3/ai-vault-browser.md:165,169); deny-by-default permissions + fail-closed cert trust (round3/ai-vault-browser.md:144-149) | Adapter wrappers over the existing command surface |
| Operator cockpit substrate | DOM-as-layout-tree pane manager (splits are divs, ratios in flex style — no layout engine to extend, round3/fabrica-app-renderer.md §2.3); agent-completion coordinator fusing hook/title/process-exit with cadence tiers 750ms–15s (round3/fabrica-app-renderer.md §1.2); status-bar usage-roster pill aggregating multi-provider accounts/rate-limits (round3/fabrica-app-renderer.md §3); right-sidebar vault tab w/ session resume + AiVaultSessionDropLayer (drop a session → new terminal tab); 37 settings panes incl. AgentsPane (1078 ln agent catalog w/ permission modes); Cmd-J action registry with availability ctx (round3/fabrica-app-renderer.md §3,§4,§6) | Priorities/Goals/Decisions/Activity surfaces as new panes/tabs using these primitives |
| Fleet credential isolation | Codex 4-lane CODEX_HOME routing (per-distro WSL / per-account homes / real home / shared mirror), per-pane account registry (cap 2000 panes, atomic 0600 writes), stale-pane detection, credential hot-swap w/ provenance ledger (round3/fabrica-app-main-subsystems.md §1) | Extend pattern beyond Codex if other CLIs need it |
| Remote fleet transport | SSH generation counters (13-bit stride in 53-bit space), reconnect ladder [1s..30s] with flap-aware cap protecting remote PTY lifetimes, 13-byte frame multiplexer with 3-lane scheduling guaranteeing bulk PTY output never starves control traffic, versioned relay deploy pipeline w/ install locks + GC tombstones (round3/fabrica-app-main-subsystems.md §3) | BZ supervision lifecycle (R4-C below) |

### R4-B. Subsystem spec refinements (against §3)

**3.1 Management Plane**
- Activity Feed v1 needs NO new telemetry: compose completion-coordinator events (hook states 'working'/'waiting'/'done' with 1500ms quiet windows, dedup keyed `state:agentType:stateStartedAt` — round3/fabrica-app-renderer.md §1.2) + native-chat transcript pipeline (seed 300 turns, live tail, epoch fencing, incremental assembler oracle-tested deep-equal to full rebuild — §5) + MC's presentation layer (21 typed-event color maps, ~28 labeled metadata keys, expandable rows, relative-time ladder — round3/mc-frontend-buzz-clients.md:50,90).
- Decision Inbox UX = MC approvals page verbatim as spec: risk-classified stat cards doubling as filters, Set-based multiselect, one batch endpoint, mandatory rejection feedback via sentinel-task dialog reuse (round3/mc-frontend-buzz-clients.md:55-58); race-safe intake via buzz's buffer-while-ownership-unknown pattern (buffer ≤100, dedupe by requestId, membership re-verified at submit — round3/buzz-desktop.md A3). FA gates/gateResolve remain the engine (Round-2 ref #1).
- Optimistic-interaction contract for all new pages: MC's `useDataResource` factory semantics — visibility-gated polling, refetch-revert on failure, 5s undo-toast soft-delete (round3/mc-frontend-buzz-clients.md:17-24).

**3.2 Operations Plane**
- Adapters ship as plugins: inherit consent fingerprints, worker timeouts/supervision, awaited-audit chokepoint, marketplace revocation (round3/fabrica-app-plugins.md S2/S5/S7/S9-S10). MC's validate→execute→healthCheck→financials contract stays the adapter interface.
- Secrets precedent: electron safeStorage envelope with NO plaintext fallback — OS encryption unavailable fails loudly (round3/fabrica-app-plugins.md:41-43); vault sessions follow MC's client cache discipline (30-min TTL, volatile memory, never persisted — round3/mc-frontend-buzz-clients.md:31-37) plus its pending-action stash-and-replay unlock gating (round3/mc-frontend-buzz-clients.md:76-84).
- Spend Governor surface: tiered USD budgets with >80% red / >50% amber bars, autoPauseOnBreach, owner-only banner "agents cannot change safety limits" enforced by master-password dialog on save (round3/mc-frontend-buzz-clients.md:96).

**3.3 Orchestration Engine**
- Adopt buzz-acp pool mechanics for any subprocess pool: slot-preserving Vec with compile-enforced claim/return ownership, session affinity, single in-flight batch per channel FIFO-fair, created_at stable-sort against newest-first replay ordering, hard deadline shared between prompt and cancel-drain, 10MB stdout line bound vs rogue agents (round3/buzz-agent-crates.md A7, :34-46).
- Before auto-restarting agents, adopt BZ's quiescence-window policy (3-min window, one attempt per rising edge — the ONLY guard against SIGKILLing mid-turn agents; round3/buzz-desktop.md A3) layered on FA's detached-pane restart sweeps that already run while unmounted (round3/fabrica-app-renderer.md §1.3).
- Automations v2 triggers confirmed implementable per buzz-workflow: message/reaction/cron-XOR-interval(≥60s)/webhook/diff; authority from signature pubkey never actor tags; webhook SSRF private-IP blocking + 1MB response cap; condition eval 100ms hard timeout fail-closed; approval suspension returns a caller-persisted token — FA must WIRE the resume step buzz left unwired ("WF-08", round3/buzz-agent-crates.md:124-140).
- New **E15 Fleet Supervisor Service**: unify daemon PTY lifecycle (tombstones/incarnations/checkpoints — round3/fabrica-app-main-subsystems.md §4) + BZ managed-agent lifecycle (readiness computed pre-spawn w/ setup-payload fallback mode `readiness.rs:402`; atomic runtime receipt, child killed on receipt-write failure `runtime.rs:978-982`; env-marker ownership proof for orphan sweeps `orphan_sweep.rs:110-119`; SIGTERM→1s→SIGKILL group kill `process.rs:281`) into one local+remote supervisor exposed over RPC.

**3.4 Agent Runtime**
- Memory (engrams) extends AI Vault rather than replacing it: keep the source-of-truth-table + delete-validator-cannot-drift-from-discoverable invariant (round3/ai-vault-browser.md:25-26); add cross-agent addressable records; reuse execution-host stamping `${executionHostId}:${agent}:${sessionId}:${filePath}` with boundary restamping (round3/ai-vault-browser.md:17,116) as the attribution primitive.
- Fleet status becomes first-class RPC events: promote completion-coordinator dispatches (source ∈ hook|title|process-exit) out of renderer internals; OSC 9999 stream already parsed main-side before xterm (round3/fabrica-app-renderer.md §1).
- Context-economy reads (MC pattern) target the ~350-method RPC manifest (fabrica-app-discovery.md ROUND 2 ADDENDUM R2.2): sparse-field variants for agent callers, capabilities still negotiated-at-auth bound-to-socket.

**Platform Services**
- Audit chain: generalize the plugin audit JSONL rotation pattern (10MB rotation, content-free summaries, awaited-before-handler; honest residual-risk disclosure — round3/fabrica-app-plugins.md:69-74) app-wide, hash-chained per §3.5.
- Mobile resilience copies buzz's mirrored-gate design: rate-limit gates implemented identically TS+native, pinned replay cursors, degrade-to-live-only, passive write-free stall watchdog (documented why not ping — plugin mutex; round3/buzz-desktop.md A6).
- Voice huddles stay deferred (Tier 3) but are now specced: WS+Opus 32kbps non-WebRTC transport, per-peer NetEq jitter buffers, four barge-in triggers converging on one cancel atomic (round3/buzz-desktop.md A5).

### R4-C. Build sequence adjustments (refines §7)

1. **Phase A unchanged in scope, de-risked**: every Management Plane surface has both an engine (FA orchestration/AI Vault/RPC) and a UX reference implementation (MC frontend) already mapped.
2. **Phase B gains a concrete carrier**: adapters-as-plugins through the existing worker host; web-target adapters through the browser bridge; no new process model needed.
3. **Phase C adds E15 Fleet Supervisor** ahead of automations v2 — it is the piece neither source repo has whole, and everything else (restarts, remote agents, spend pause) hangs off it.
4. **Phase D attribution rides existing primitives**: host-stamping, pane-key authority, mutation receipts — identity layer is composition, not invention.
5. **New standing rule**: all new subsystems copy the house reliability grammar confirmed app-wide — generation counters, fail-closed liveness proofs, atomic claim-rename-restore protocols, single-flight marker-gated jobs, env allowlists never spreading process.env, idempotency ledgers (round3/fabrica-app-main-subsystems.md closing summary; discovery/fabrica-app-discovery.md ROUND 3 ADDENDUM cross-cutting finding).

### R4-D. What we deliberately do NOT adopt (extends §8)

- buzz Nostr git-on-relay specifics (kinds 1618-1633 signed PR events, CAS pointer objects): concepts only — FA's native git layer is deeper (CAS update-ref invariants, read leases, gh circuit breaker; round3/fabrica-app-main-subsystems.md §2).
- buzz-workflow's unwired approval resume as-is (WF-08) — take the suspension-token DESIGN, implement resume properly.
- buzz voice WebRTC-free transport unless voice ships; complexity sits in barge-in/jitter, not transport choice.
- MC JSON-file persistence and direct-file recovery scripts (fix-stuck-tasks.js bypasses API mutexes — mission-control-discovery.md ROUND 2 ADDENDUM R2.3): patterns documented, storage stays FA-native.

### R4-E. Scan coverage for this addendum

Inputs fully digested: 7/7 round3 reports + 3 ROUND 2/3 ADDENDUM sections. All path:line cites transcribed from those reports' recorded evidence; independent spot re-verification against `_sources/` and `Fabrica-app/` is task R4-2.1 (separate worker, pending). Not covered here: Round-1 bodies of the discovery docs (stand as previously verified); legacy-fabrica (ignored per AGENTS.md).

