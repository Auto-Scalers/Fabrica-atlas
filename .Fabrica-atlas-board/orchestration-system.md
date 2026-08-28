# Fabrica Orchestration System — Reference & Study Doc (Focus system #1)

> *Primary transformation target. This document is the living reference for the orchestration system we are building on. It documents what Fabrica ALREADY has, the reference designs from MC/buzz, and the gaps toward our 3-tier vision (Meta-Orch → Orchestrator → Worker).*
> *Sources: `discovery/fabrica-app-discovery.md`, `discovery/fabrica-app/*.md`, `discovery/mission-control/*.md`, `discovery/buzz-discovery.md`.*

---

## 1. Purpose & Scope

Fabrica's orchestration system is the engine that **directs AI agents** (Claude Code, Codex, OpenCode, Pi, ~15 more) running side-by-side in isolated git worktrees. It is the first and most heavily invested area of the After-Rebrand transformation.

It already provides: run/task/worker lifecycle, dispatch preambles , decision gates, federation sync, and an RPC surface. Our job is to  upgrade the model using MC + buzz as references.

**Hard constraint:** preserve every existing feature. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

**How it works (plain English):** The orchestration system is Fabrica's "manager of managers." You give Fabrica a goal; it breaks that into tasks, spins up isolated working copies, and dispatches AI agents (different models/tools) to each task. It keeps track of who is doing what, collects their results, and handles human checkpoints. Right now it already does all of this — our job is to make it richer using two reference designs (Mission Control and buzz), without removing anything that works today.

---

## 1.1 Sub-Systems Covered (index)

Each sub-system below is described in its own section. `ideas.md` (Focus system #1) lists these same titles with idea buckets underneath.


| #   | Sub-System                                        | Section |
| --- | ------------------------------------------------- | ------- |
| 1   | Run (run-create)                                  | §5.1    |
| 2   | Task (task-create)                                | §5.2    |
| 3   | Coordinator (auto-dispatch)                       | §5.3    |
| 4   | Worker-start (explicit)                           | §5.4    |
| 5   | worker_done settlement (lifecycle-reconciliation) | §5.5    |
| 6   | Decision gates                                    | §5.6    |
| 7   | Federation sync (cross-environment)               | §5.7    |
| 8   | Drift-guarded dispatch (git layer)                | §5.8    |
| 9   | Preamble system                                   | §6      |
| 10  | RPC surface                                       | §7      |
| 11  | Integration points                                | §8      |
| 12  | Reference designs (MC + buzz)                     | §9      |


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

**How it works (plain English):** All this logic lives inside Fabrica's main desktop process (Electron), not as a separate server. Data is stored in a single local SQLite database file. About 60 source files implement it, and ~35 functions are exposed so other parts of the app (and remote connections) can drive it. It can also run "headless" — without a visible window — for background/daemon use.

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

**How it works (plain English):** Everything orchestration tracks — runs, tasks, messages, worker sessions, cross-machine dispatches, and a receipt ledger to prevent duplicate actions — is stored in one local database file with strict file permissions so only your user can read it. A version-skew defense stops an old app version from corrupting a newer database. Roughly 30 test files lock in the exact behavior so changes don't break contracts.

---

## 4. Data Model (durable rows)


| Row                                                                             | Key fields                                                                                                                                                                                                             | Notes                       |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **RunRow**                                                                      | id, objective, home_database, coordinator_handle, coordinator_pane_key, consumer_generation, legacy                                                                                                                    | program/objective container |
| **TaskRow**                                                                     | id, run_id, parent_id, created_by_*, task_title, display_name, spec, status(pending|ready|dispatched|completed|failed|blocked), deps(JSON), result                                                                     | DAG via parent/deps         |
| **DispatchContextRow**                                                          | id, run_id, task_id, contract_version, launch_token_hash, assignee_handle/pane_key, capability_hash, process_incarnation, status(pending|dispatched|completed|failed|circuit_broken), failure_count, last_heartbeat_at | binds task↔worker           |
| **MessageRow**                                                                  | type: status|dispatch|worker_done|merge_ready|escalation|handoff|decision_gate|question|heartbeat; priority normal|high|urgent                                                                                         | typed stream                |
| **DecisionGateRow**                                                             | —                                                                                                                                                                                                                      | human-in-the-loop block     |
| **QuestionRow**                                                                 | —                                                                                                                                                                                                                      | durable blocking question   |
| **WorkerDispatchRow**                                                           | state: starting→ready→succeeded/failed/stopping/stopped/start_unknown/stop_unknown/abandoned                                                                                                                           | worker lifecycle FSM        |
| **WorkerTerminalResourceRow**                                                   | ownership_state owned|transferred|user_owned|external|released; release_state machine                                                                                                                                  | terminal ownership          |
| **FederatedDispatchRow / RemoteDispatchAttachmentRow / FederationRelayItemRow** | —                                                                                                                                                                                                                      | cross-environment dispatch  |
| **MutationReceiptRow**                                                          | (callerFingerprint, requestId) ledger                                                                                                                                                                                  | idempotency                 |

**How it works (plain English):** These rows are the records behind the scenes. A *Run* is one overall job with an objective. A *Task* is one step in that job, with a status (pending/ready/dispatched/done/failed/blocked) and optional dependencies on other tasks — forming a graph. A *DispatchContext* ties a task to the specific agent worker doing it. *Messages* are the typed notes agents and the coordinator exchange. *Decision gates* and *questions* are the human-checkpoint records. A *WorkerDispatch* tracks an agent's lifecycle (starting → ready → succeeded/failed…). The *mutation receipt* ledger prevents the same action from being applied twice.

---

## 5. Lifecycle Flows

### 5.1 run-create

`BEGIN IMMEDIATE` tx → unbind other runs on same pane → insert `run_<hex>`, `generation=1`. `bindRun` supports a legacy-authority proof path (`fabrica-app-discovery.md:236`).

**How it works:** When you start a new run (a tracked job), Fabrica writes it in one protected database transaction, first disabling any other runs attached to the same window so two runs don't fight over it, then creates a uniquely identified run. A "legacy-authority proof path" exists so older-style runs can still bind correctly.

### 5.2 task-create

Validates same-run `parentId`/deps → `pending` if deps unmet, else `ready` (`:237`).

**How it works:** Creating a task checks that its parent task and any dependencies belong to the same run; if a required dependency isn't finished yet the task waits as `pending`, otherwise it becomes `ready` to be worked on. This enforces the correct order of work.

### 5.3 coordinator auto-dispatch (tick, default 2000ms)

Source: `coordinator.ts` (555 ln). Verified constants: `DEFAULT_POLL_MS = 2000`, `MAX_CONCURRENT_DEFAULT = 4`, `HUNG_THRESHOLD_MS = 10 min` (2× heartbeat cadence), `DISPATCH_STALE_THRESHOLD = 20` commits behind.

`tick()` order (`:209`): `processMessages` → `processEscalations` → `processDecisionGates` → `warnStaleDispatches` → `dispatchReadyTasks` → `checkConvergence`.

- **decompose() is NOT implemented** (`:196`): tasks must be pre-created via `taskCreate` before `run()`; AI-driven decomposition is a stated future phase. The coordinator operates on an existing DAG only.

  **How it works:** The coordinator does not yet break a goal into tasks by itself — you (or a setup step) must create the tasks first. It only manages the tasks that already exist.

- **Terminal creation:** at most **one** terminal spawned per tick (`:373`); reused if an available writable+connected terminal exists.

  **How it works:** Every 2 seconds the coordinator checks for ready work, but it opens at most one new agent terminal per check, reusing an existing one when possible — this paces resource use and avoids spawning too many agents at once.

- **Drift probe:** `probeWorktreeDrift` runs once per tick against the worktree's tracking remote (`:387`); same base snapshot shared by all dispatches that tick. Refuses dispatch if `behind > 20` commits unless `allow-stale-base: true` appears in the spec (`:425`). Refusal is a **silent return** (task stays `ready`, retries next tick) — it does NOT call `failDispatch`, so it never burns the circuit-breaker budget.

  **How it works:** Before dispatching, the coordinator checks whether your working copy has fallen more than 20 commits behind the shared remote. If so, it holds off (silently) and retries next tick rather than risk an agent working on stale code — and this hold does not count as a failure. You can override with an explicit `allow-stale-base` flag.

- **Dispatch** = `createDispatchContext(handle, paneKey, launchTokenHash, processIncarnation)` (`:444`) → `buildDispatchPreamble(...)` → `sendTerminalAgentPrompt(handle, preamble + gateContext)` (`:477`).

  **How it works:** To actually start an agent, the coordinator creates a dispatch record, builds the instruction brief (the "preamble"), and sends it as the agent's opening prompt into the terminal.

- **Escalation** → `failDispatch`; at `circuit_broken` the task is marked `failed`; otherwise it returns to `pending` for retry (failure_count/3, `:306`).

  **How it works:** If an agent escalates a problem, the dispatch is failed. After enough repeated failures (circuit broken) the task is marked failed; otherwise it goes back to `pending` to be retried, up to 3 times.

- **Decision gates:** coordinator **never auto-resolves** (`:347`) — `processDecisionGates` re-blocks any task whose gate exists but isn't blocked, restoring the invariant. A resolved gate's outcome is injected into the preamble as `--- DECISION GATE RESOLVED ---` (`:473`).

  **How it works:** When a task needs a human decision, the coordinator will never decide for you; it keeps the task blocked until you resolve the gate, then feeds your decision into the agent's brief.

- **Convergence:** run ends when all tasks `completed|failed`; early `stop()` → run marked `failed`. Stuck detection: no active tasks but some `blocked` → logs "Stuck" (`:541`).

  **How it works:** A run finishes when every task is done or failed (or when you stop it early, which marks it failed). If there are no active tasks but some remain blocked, the coordinator logs "Stuck" so you know a run is waiting on something.

### 5.4 worker-start (explicit)

Mutation-receipt dedupe by `(callerFingerprint, requestId)`; retry requires prior dispatch `failed/stopped/abandoned`; inserts `dispatch_contexts(pending)` + `worker_dispatches(starting)`. Setup completion detected via stdout marker `__FABRICA_SETUP_COMPLETE__:<token>:<exitCode>` (`:238`).

**How it works:** You can also start a worker directly (not via the auto-coordinator). Each start is de-duplicated by a receipt so repeating the same request can't double-launch, and you can only retry after a prior attempt failed/stopped. The system inserts the dispatch and worker records, and knows setup finished when the agent prints a special completion marker with its exit code.

### 5.5 worker_done settlement (`lifecycle-reconciliation.ts`)

Source: `lifecycle-reconciliation.ts` (347 ln). Verified behavior:

- **Authority (`hasLifecycleAuthority`):** if the dispatch row has an `assignee_pane_key`, the sender's `sender_pane_key` must match (leaf-id equivalence via `parsePaneKey`; tab half may change on break-out). Legacy rows with no pane key fall back to exact `assignee_handle` equality. **Payload knowledge alone is NEVER authority** (`:26`).

  **How it works:** When an agent reports it's done, Fabrica first proves the report came from the *correct* agent for that task — matching the pane/window identity — not just anyone who knows the task ID. Knowing the task details is never enough to be trusted.

- **Rejection codes:** `sender_not_assignee`, `dispatch_capability_invalid`, `invalid_payload`, `missing_task_id`, `missing_dispatch_id`, `invalid_outcome`, `unknown_task`, `unknown_dispatch`, `task_dispatch_mismatch`, `inactive_dispatch`, `stale_dispatch`.

  **How it works:** If something is wrong (wrong sender, missing IDs, unknown task, inactive/stale dispatch, etc.) the report is rejected with a specific reason code, so bad or late reports are caught rather than mistakenly marking work complete.

- **worker_done contract:** requires a JSON object payload with `taskId` + `dispatchId` + `outcome`. Settlement delegates to `db.settleWorkerReport(...)`, which performs idempotency + staleness checks; on `rejected` the message is converted to a persisted rejection.

  **How it works:** A valid "done" report must include the task ID, dispatch ID, and outcome (succeeded/failed). The database settles it only after checking it isn't a duplicate or stale; a rejected report is saved as a persistent rejection record.

- **Idempotency guard:** a `_FABRICALifecycleRejection` marker inside the payload is reserved persistence state — caller-supplied markers can't turn a lifecycle send into a success (`:95`).

  **How it works:** A special internal marker is reserved by the system; an agent cannot forge that marker to trick the system into counting a failed send as success.

- **Heartbeat reconciliation:** wrong-pane heartbeats are **rejected** (`sender_not_assignee`) so they can't refresh liveness of a hung assignee (`:159`). In-flight heartbeats for an already-inactive dispatch are `suppressed` (kept for audit, not surfaced).

  **How it works:** "Heartbeats" are periodic "I'm still alive" signals. A heartbeat from the wrong pane is rejected so it can't keep a hung agent looking alive, and heartbeats for an already-finished dispatch are suppressed (kept for records only, not shown).

- **Post-settlement:** `suppressEarlierHeartbeats` marks earlier heartbeats for the same `dispatchId` as read+delivered so they don't mask a newer dispatch.

  **How it works:** After a task settles, older heartbeats for that dispatch are marked read so they don't confuse the view of a newer dispatch using the same ID.

### 5.6 decision gates

Created via `gateCreate` or `decision_gate` messages; **humans resolve via `gateResolve`** — coordinator never auto-resolves. Resolved-gate context injected into later preambles (`--- DECISION GATE RESOLVED ---`) (`:241`).

**How it works:** A decision gate is a deliberate pause point where the coordinator asks a human to decide. Only a human can resolve it (the coordinator won't decide on its own), and once resolved the answer is injected into the agent's brief so the work continues with your decision applied.

### 5.7 federation sync (cross-environment dispatch)

Source: `federation-sync.ts` (268 ln). Verified behavior (`syncFederatedDispatch`):

- **Peer-fingerprint guard:** resolves the worker server for `environment_id` and throws `peer_changed` if `peerFingerprint` no longer matches the saved `peer_fingerprint` (`:54`). This is the cross-environment trust anchor.

  **How it works:** When dispatching across two separate Fabrica environments (e.g., desktop ↔ another machine), the system checks a stored "fingerprint" of the other side. If it changed, the sync is refused — this is the trust anchor that stops a spoofed environment from receiving work.

- **Contiguity:** `federationPull` returns items after `to_home_imported_sequence`; each item must have `sequence === cursor + 1` else `operation_unknown` (`:75`). Non-contiguous relay is rejected, not best-effort.

  **How it works:** Messages relayed between environments must arrive in strict order (each one right after the previous). A gap is rejected rather than guessed at, so nothing is silently lost or reordered.

- **Import + lifecycle mapping:** each relayed message is parsed (`parseRelayedMessage`) and stored via `importFederatedRelayItem`. Lifecycle is mapped by `parseFederatedLifecycle`: `heartbeat` → recorded; `worker_done` → validated (`taskId`/`dispatchId` match, `outcome` ∈ succeeded|failed) then stored as `worker_report`; mismatches → `rejected` (`task_dispatch_mismatch` / `invalid_payload`).

  **How it works:** Each relayed message is parsed and stored; heartbeats are recorded and "done" reports are validated (correct task/dispatch, valid outcome) before being saved as a worker report — mismatches are rejected.

- **Ack lease:** `acquireFederationAckLease` gates acknowledgement; after import, `orchestration.federationAck` acks `throughSequence` with idempotent `orchestrationRequestId` `relay_ack_<dispatchId>_<cursor>`, and `recordFederationAckCheckpoint` persists the checkpoint.

  **How it works:** Before acknowledging received messages, the system takes a short "lease" so the same batch isn't acknowledged twice; it then sends an idempotent acknowledgment and records a checkpoint of how far it has imported.

- **Reverse push:** when the local `WorkerDispatch` state is `ready`, pending `to_worker` relay items are pushed via `orchestration.federationImport` (idempotent `relay_import_...`), then `acknowledgeFederationRelay`.

  **How it works:** In the other direction, when a local worker is ready, any pending outbound relay items are pushed (idempotently) and then acknowledged.

- **Priority normalization:** relayed priority coerced to `high|urgent|normal` (`:171`).

  **How it works:** Priorities from the other environment are normalized to Fabrica's three levels (high/urgent/normal) so they behave consistently.

### 5.8 drift-guarded dispatch (git layer)

Before every dispatch the runtime checks ahead/behind drift vs remote (`getRemoteDrift` = `rev-list --left-right --count local...remote`, `repo.ts:540-562`) and injects drift subjects into worker preambles (`log --format=%s -n limit local..remote`, `:568-587`) (`fa-git-integration.md:142`, `:369`).

**How it works:** Right before sending an agent to work, Fabrica compares your local branch against the shared remote to see how far ahead or behind you are, and it tells the agent the recent commit subjects it's missing — so the agent starts aware of what changed upstream (the "drift") instead of working blind.

---

## 6. Preamble System (worker dispatch/operational prompt — NOT a model system prompt)

`preamble.ts` (`fabrica-app-discovery.md:244`) builds the **dispatch/operational prompt** injected into each worker at dispatch time. Important distinction:

- This is a **harness brief** (CLI contract + task/drift/gate context), **not** a model *system prompt* (agent identity/behavior/persona). It tells the worker *how to operate the Fabrica CLI*, not *who it is*.
- Fabrica today does **not** set a model-level system prompt per agent. That layer is what MC (`agents.json` → `instructions`) and buzz (`.persona.md`) provide, and what Intent B adds on top.

Preamble contents, in order (verified from `preamble.ts`):

1. **Header** — opens: *"You are working inside FABRICA, a multi-agent IDE. You are a dispatched worker."* States coordinator handle + task ID, and that the worker talks to the coordinator **only** through the CLI commands below (not Slack/GitHub/etc.).
2. **CLI COMMANDS block** (`=== CLI COMMANDS ===`) — the `fabrica` (or `FABRICA-dev` in dev mode) CLI contract:
   - `send --type worker_done` **exactly once** with `--body` = 3-sentence executive summary + `--files-modified` + optional `--report-path`. Must include BOTH `taskId` and `dispatchId`.
   - `heartbeat` every **5 min** (`HEARTBEAT_INTERVAL_MIN`) with `--phase investigating|implementing|reviewing|waiting`. Must include `taskId` + `dispatchId` (attributes liveness to the specific dispatch, not just the task).
   - `ask` for durable blocking questions — **NEVER `AskUserQuestion`** (opens a local TUI the coordinator can't see → session hangs). `ask` durably records the question and blocks until reply.
   - `escalation` for pre-completion blockers.
   - `check --terminal` to read coordinator messages.
3. **After-worker_done behavior** by `workerKind` — `bare-shell` exits; `prompt-returning-agent` returns to idle prompt (stays available for re-dispatch with a fresh preamble+TASK block).
4. **BASE DRIFT section** (`--- BASE DRIFT ---`) — emitted only when `baseDrift.behind > 0`; lists the N most recent commit subjects on the base NOT in the worktree. Defense-in-depth so the worker sees staleness up front.
5. **TASK block** (`=== TASK ===`) — the `taskSpec` (with `allow-stale-base: true` stripped so the worker can't read it as instruction). Resolved decision-gate context is appended here.

**Key fact:** the entire preamble is a single string written into the terminal as the worker's opening input. It is harness/operational protocol (how to use the FABRICA CLI), **not** a model `system` role. There is no separate system-prompt channel in this code path.

**How it works (plain English):** The preamble is the instruction brief automatically handed to each agent when it starts. It is *operating instructions*, not the agent's personality. It tells the agent: "You're a worker in Fabrica; here is your task; here are the exact commands to report progress every 5 minutes, to declare done exactly once, to ask a durable question, or to escalate." It also strips the `allow-stale-base` override so the agent can't treat it as an instruction, and it shows the agent any commits it's missing. Important gap: today Fabrica does NOT give each agent a separate "who you are / how to behave" system prompt — that's what the MC and buzz references (and a planned "Intent B") would add.

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

**How it works (plain English):** RPC is the remote-control interface — about 35 commands (send a message, create a task, start a worker, resolve a gate, federate, etc.) that other parts of Fabrica or remote clients call. Every call carries an auth token and a contract version; if the version is wrong the call is rejected with zero effect (so an old client can't corrupt a new server). Actions that change state are de-duplicated by a receipt, and connections travel over a local socket, your LAN, a cloud relay (your desktop calls out, never opened from outside), or an end-to-end-encrypted mobile link.

---

## 8. Integration Points (`fa-runtime-structured-read.md:131`)


| Subsystem          | Relationship                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| App bootstrap      | instantiated once at `index.ts:2486`                                                                                          |
| IPC handlers       | `ipc/runtime.ts`, `ipc/pty.ts`, `ipc/worktrees.ts`, `ipc/ssh.ts`… all receive the service                                     |
| Runtime RPC        | `FABRICARuntimeRpcServer` holds it; methods in `runtime/rpc/methods/orchestration*`                                           |
| Plugin host        | narrowed facade — only `resolveActiveWorktreeContext`, `listTerminals` (capped), `sendTerminal`, `dispatchPluginNotification` |
| PTY plane          | bidirectional; provider injected at constructor; data via `onPtyData`/`acceptPtyDataBounded`                                  |
| Agent-hooks server | `onTerminalAgentStatus` → `agentHookServer.ingestTerminalStatus`; hook env keys injected into spawned agents                  |
| SSH relay / remote | consumed by + notifies; SSH attachment authority                                                                              |
| Window / renderer  | pushes graphs via `syncWindowGraph`, `pty:sideEffect`                                                                         |
| Daemon headless    | supported throughout (headless emulation, orphan adoption, restore tails)                                                     |

**How it works (plain English):** This table shows everywhere the orchestration engine plugs into the rest of Fabrica: it's created at app start, wired into the internal messaging (IPC) handlers, hosted by the RPC server, given only a narrow set of abilities inside plugins, connected to the terminal layer, fed agent-status hooks, tied into SSH remotes, and able to push live graphs to the UI — and it works headless too.

**Trust-grant orchestration** (`fabrica-app-main-subsystems.md:89`): `grantManagedCodexHookTrust(plan)` — never throws; returns `{lane:'rpc', entries}` or fallback. Env kill-switch → fallback; ledger hit → skip RPC; 5-min per-host cooldown; restores exact pre-session bytes on failure. This is the pattern for safe agent-hook trust we keep.

**How it works (plain English):** Before Fabrica lets an agent's "hook" (status reporter) be trusted, it grants that trust safely: it never errors out, falls back if an environment kill-switch is set, skips RPC if already recorded, cools down per host for 5 minutes, and restores the exact pre-session state on failure. This is the safe pattern we keep for trusting agent hooks.

---

*Last updated: 2026-08-28 (session 2 — verified coordinator.ts, preamble.ts, lifecycle-reconciliation.ts, federation-sync.ts, MC prompt-builder.ts + security.ts from source)*
