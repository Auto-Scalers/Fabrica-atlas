# Fabrica Orchestration System — Reference & Study Doc

> _Primary transformation target. This document is the living reference for the orchestration system we are building on. It documents what Fabrica ALREADY has, the reference designs from MC/buzz, and the gaps toward our 3-tier vision (Meta-Orch → Orchestrator → Worker)._
> _Sources: `discovery/fabrica-app-discovery.md`, `discovery/fabrica-app/*.md`, `discovery/mission-control/*.md`, `discovery/buzz-discovery.md`._

---

## 1. Purpose & Scope

Fabrica's orchestration system is the engine that **directs AI agents** (Claude Code, Codex, OpenCode, Pi, ~15 more) running side-by-side in isolated git worktrees. It is the first and most heavily invested area of the After-Rebrand transformation.

It already provides: run/task/worker lifecycle, dispatch preambles (system-prompt control), decision gates, federation sync, and an RPC surface. Our job is to (a) keep all of it, (b) add the **Meta-Orchestrator** tier, and (c) upgrade the agent/skill/persona model using MC + buzz as references.

**Hard constraint:** preserve every existing feature. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

## 2. Architecture Location

- Code: `src/main/runtime/orchestration/` — **60 files** (`fabrica-app-discovery.md:230`).
- Storage: `src/main/runtime/orchestration/db.ts` (6,495 ln) — SQLite.
- Coordinator loop: `src/main/runtime/orchestration/coordinator.ts` (555 ln).
- Preamble builder: `src/main/runtime/orchestration/preamble.ts`.
- Reconciliation: `src/main/runtime/orchestration/lifecycle-reconciliation.ts`.
- Groups: `groups.ts`; Formatter: `formatter.ts`.
- Exposed to clients via RPC domain `orchestration` (~35 methods) in `src/main/runtime/rpc/methods/orchestration*`.

It is **in-process** (Electron main), not a separate daemon — but it already supports headless/daemon-first operation (`fa-runtime-structured-read.md:153`).

---

## 3. Storage Layer

Single SQLite file, hardened perms `0o600`, WAL + shm, `PRAGMA user_version` migrations with **version-skew defense**.

Tables (`fabrica-app-discovery.md:246`):
- `runs`, `tasks`, `dispatch_contexts`, `messages`, `deliveries`
- `question_threads`, `decision_gates`
- `coordinator_runs`
- `worker_dispatches`, `worker_terminal_resources`, `worker_terminal_archives`
- `federated_dispatches`, `remote_dispatch_attachments`, `federation_relay_items`, `remote_questions`
- `mutation_receipts` (+ ledger trigger, ≤10k rows) — idempotency
- `legacy_*` compat tables

ID conventions: `run_` / `task_` / `ctx_` + hex; `owr1_` output cursors; `dcap_` dispatch capabilities (32 random bytes, stored hashed).

~30 colocated test files (~7,000 ln) pin all contracts.

---

## 4. Data Model (durable rows)

| Row | Key fields | Notes |
|---|---|---|
| **RunRow** | id, objective, home_database, coordinator_handle, coordinator_pane_key, consumer_generation, legacy | program/objective container |
| **TaskRow** | id, run_id, parent_id, created_by_*, task_title, display_name, spec, status(pending\|ready\|dispatched\|completed\|failed\|blocked), deps(JSON), result | DAG via parent/deps |
| **DispatchContextRow** | id, run_id, task_id, contract_version, launch_token_hash, assignee_handle/pane_key, capability_hash, process_incarnation, status(pending\|dispatched\|completed\|failed\|circuit_broken), failure_count, last_heartbeat_at | binds task↔worker |
| **MessageRow** | type: status\|dispatch\|worker_done\|merge_ready\|escalation\|handoff\|decision_gate\|question\|heartbeat; priority normal\|high\|urgent | typed stream |
| **DecisionGateRow** | — | human-in-the-loop block |
| **QuestionRow** | — | durable blocking question |
| **WorkerDispatchRow** | state: starting→ready→succeeded/failed/stopping/stopped/start_unknown/stop_unknown/abandoned | worker lifecycle FSM |
| **WorkerTerminalResourceRow** | ownership_state owned\|transferred\|user_owned\|external\|released; release_state machine | terminal ownership |
| **FederatedDispatchRow / RemoteDispatchAttachmentRow / FederationRelayItemRow** | — | cross-environment dispatch |
| **MutationReceiptRow** | (callerFingerprint, requestId) ledger | idempotency |

---

## 5. Lifecycle Flows

### 5.1 run-create
`BEGIN IMMEDIATE` tx → unbind other runs on same pane → insert `run_<hex>`, `generation=1`. `bindRun` supports a legacy-authority proof path (`fabrica-app-discovery.md:236`).

### 5.2 task-create
Validates same-run `parentId`/deps → `pending` if deps unmet, else `ready` (`:237`).

### 5.3 coordinator auto-dispatch (tick, default 2000ms)
`processMessages` → decision-gate invariant → stale-dispatch warnings (10-min heartbeat threshold) → `dispatchReadyTasks` where `slots = maxConcurrent − dispatched` (default **4**) (`:239`):
- **Worktree drift probe:** refuses dispatch if worktree is >20 commits behind remote unless `allow-stale-base` is in spec.
- Dispatch = `createDispatchContext` (handle **AND** pane-key locks; circuit-breaker budget from prior failures) → preamble sent via `sendTerminalAgentPrompt`.
- Failures increment `failure_count` → `circuit_broken` at threshold.

### 5.4 worker-start (explicit)
Mutation-receipt dedupe by `(callerFingerprint, requestId)`; retry requires prior dispatch `failed/stopped/abandoned`; inserts `dispatch_contexts(pending)` + `worker_dispatches(starting)`. Setup completion detected via stdout marker `__FABRICA_SETUP_COMPLETE__:<token>:<exitCode>` (`:238`).

### 5.5 worker_done settlement (`lifecycle-reconciliation.ts`)
- **Authority check:** only the assigned pane-key (leaf-id equivalence) may settle. Payload knowledge alone is never authority.
- `settleWorkerReport`: idempotent duplicate detection, staleness checks (must be latest dispatch for task), atomic task+dispatch update, question cleanup, dependency promotion on success.
- Heartbeats only extend liveness of active dispatches; wrong-sender heartbeats become persisted rejections (`_FABRICALifecycleRejection`) (`:240`).

### 5.6 decision gates
Created via `gateCreate` or `decision_gate` messages; **humans resolve via `gateResolve`** — coordinator never auto-resolves. Resolved-gate context injected into later preambles (`--- DECISION GATE RESOLVED ---`) (`:241`).

### 5.7 federation sync
Pull contiguous relay items (`orchestration.federationPull`, sequence must be `cursor+1`), parse + import with lifecycle effects, ack through checkpoints; push pending `to_worker` items when dispatch ready; peer-fingerprint change → `peer_changed` error (`:242`).

### 5.8 drift-guarded dispatch (git layer)
Before every dispatch the runtime checks ahead/behind drift vs remote (`getRemoteDrift` = `rev-list --left-right --count local...remote`, `repo.ts:540-562`) and injects drift subjects into worker preambles (`log --format=%s -n limit local..remote`, `:568-587`) (`fa-git-integration.md:142`, `:369`).

---

## 6. Preamble System (system-prompt control)

This is Fabrica's existing **system-prompt control** plane — `preamble.ts` (`fabrica-app-discovery.md:244`).

Preamble contents, in order:
1. **Header** — "You are a dispatched worker…"
2. **CLI COMMANDS block** — `fabrica` CLI contract:
   - `send --type worker_done` **exactly once** with 3-sentence executive summary + files-modified
   - `heartbeat` every 5 min with phase `investigating|implementing|reviewing|waiting`
   - `ask` for durable blocking questions (`AskUserQuestion` forbidden)
   - `escalation`
   - `check --terminal`
3. **After-worker_done behavior** by `workerKind` — bare-shell exits; prompt-returning agents idle for possible re-dispatch.
4. **BASE DRIFT section** — git drift context.
5. **TASK block** + resolved-gate context.

**Enhancement target (Intent B):** adopt MC's preamble composition grammar — fence + SOP + restart-context (`mc-ai-providers.md:209`, `prompt-builder.ts:471-505`) and injection defenses against fence-escaping (`security.ts:71-83`).

---

## 7. RPC Surface

~35 orchestration RPC methods (`fabrica-app-discovery.md:257`):
`send / check / reply / inbox / task* / dispatch* / ask / reset / runCreate / runUse / gateCreate / gateResolve / workerStart / Show / Read / Stop / Release / Abandon / federationAttachStart / federationPull / Ack / Import / Show / Read / Stop`

**Plumbing/envelope** (`fabrica-app-discovery.md:262`):
- Envelope `{id, authToken, method, params?, orchestrationCapability?, orchestrationContractVersion?, orchestrationRequestId?}`.
- **Contract fence** before every orchestration mutation: missing/mismatched `orchestrationContractVersion` or retired method → `orchestration_migration_required`, **zero effects**.
- Capabilities negotiated at auth, bound to socket (never request-asserted).
- Durable mutations idempotent per `(callerFingerprint, orchestrationRequestId)` with canonicalized-payload SHA-256.
- Transports: Unix socket/named pipe (1MB cap, 32 conns) · LAN WS(S) (128 conns) · cloud relay (desktop dials OUT) · MobileSocketWiring (E2EE + revocation fan-out).

---

## 8. Integration Points (`fa-runtime-structured-read.md:131`)

| Subsystem | Relationship |
|---|---|
| App bootstrap | instantiated once at `index.ts:2486` |
| IPC handlers | `ipc/runtime.ts`, `ipc/pty.ts`, `ipc/worktrees.ts`, `ipc/ssh.ts`… all receive the service |
| Runtime RPC | `FABRICARuntimeRpcServer` holds it; methods in `runtime/rpc/methods/orchestration*` |
| Plugin host | narrowed facade — only `resolveActiveWorktreeContext`, `listTerminals` (capped), `sendTerminal`, `dispatchPluginNotification` |
| PTY plane | bidirectional; provider injected at constructor; data via `onPtyData`/`acceptPtyDataBounded` |
| Agent-hooks server | `onTerminalAgentStatus` → `agentHookServer.ingestTerminalStatus`; hook env keys injected into spawned agents |
| SSH relay / remote | consumed by + notifies; SSH attachment authority |
| Window / renderer | pushes graphs via `syncWindowGraph`, `pty:sideEffect` |
| Daemon headless | supported throughout (headless emulation, orphan adoption, restore tails) |

**Trust-grant orchestration** (`fabrica-app-main-subsystems.md:89`): `grantManagedCodexHookTrust(plan)` — never throws; returns `{lane:'rpc', entries}` or fallback. Env kill-switch → fallback; ledger hit → skip RPC; 5-min per-host cooldown; restores exact pre-session bytes on failure. This is the pattern for safe agent-hook trust we keep.

---

## 9. Reference Designs (MC + buzz)

### 9.1 Mission Control — `mc-chainedispatch-reconciler.md`
- A "mission" (`ProjectRun`) is a **file-persisted batch execution context**; **no central orchestrator process** — three actors cooperate through shared JSON (`missions.json`, `active-runs.json`, `tasks.json`, `decisions.json`).
- **Recommendation (`:197`):** the durable-ledger + relay-handoff + poll-driven-reconciler + layered-retry architecture is a strong skeleton; biggest upgrade = **centralize the dispatch predicate and make state transitions event-sourced** so the three roles become views over one log.
- Fix list (`:190-196`): extract ONE shared scheduler; single-writer discipline / append-only event log; PID+start-time liveness; atomic tmp+rename writes; reaper for zombie `running` rows; persisted overflow queue.

### 9.2 Buzz — `buzz-discovery.md:84`
- `buzz-relay` is "the only orchestrator; subsystems never call each other" (crate dependency principle).
- Agent identity/persona is **relay-owned**; same idea as Fabrica's dispatch authority but portable across environments.

### 9.3 Agent / system-prompt models to adopt
- **MC:** `agents.json` stores `instructions` (= system prompt) per agent; `/crew/new` builds agents with a system-prompt editor + capabilities + skillIds (`mc-ui-frontend.md:182`, `mc-features.md:126`).
- **buzz:** `.persona.md` = YAML frontmatter + markdown system prompt, publishable as Nostr kind:30175 (`buzz-discovery.md:229`, `:305`).

---

## 10. Gaps vs Our 3-Tier Vision

| Tier | Exists today | Gap |
|---|---|---|
| **Worker** | `worker-start`, preamble, `worker_done`, lifecycle FSM, terminal archival | Most complete tier — keep |
| **Orchestrator** | `coordinator.ts` tick loop, DAG dispatch, decision gates, federation | Single in-process loop; no per-domain separation |
| **Meta-Orchestrator** | ❌ none | **NEW** — owns program strategy across runs; reference = MC event-sourced dispatch (§9.1) |

---

## 11. Risks (`fa-runtime-structured-read.md:156`)

1. **God-object** — 32.6K-line `fabrica-runtime.ts` holds live graph + PTY + waiters + floor state + worktree reconciliation; lifecycle changes risk cross-domain regressions.
2. **Connector sprawl** — ~4,900 ln GitHub/GitLab/Linear/Jira inlined (not adapter-separated like MC).
3. **Electron coupling in hot path** — `BrowserWindow` accessed for authoritative-window decisions inside the same object serving headless clients.
4. **Bespoke concurrency fences** — 11 ad-hoc FSMs, no shared framework.
5. **Single-instance coupling** — construction needs store + stats + signer triplet; profile-scoped userData.

---

## 12. Open Study Questions (next reads)
- [ ] `coordinator.ts` tick internals — exact slot/drift/circuit-breaker math.
- [ ] `preamble.ts` — full template + how drift/gate context is injected.
- [ ] `lifecycle-reconciliation.ts` — authority + idempotency edge cases.
- [ ] Federation: `federationPull`/import effects mapping.
- [ ] MC `prompt-builder.ts` + `security.ts` — preamble grammar + injection defense to port.

---

_Last updated: 2026-08-28_
