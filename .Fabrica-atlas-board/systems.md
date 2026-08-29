# Fabrica Systems - Existing System Reference

> Reference for what Fabrica ALREADY has across the 9 focus systems, written in plain English. Each system below mirrors a section in ideas.md (where the adopt/improve ideas live).

---


## Fabrica Orchestration System — Reference & Study Doc (Focus system #1)

> *Primary transformation target. This document is the living reference for the orchestration system we are building on. It documents what Fabrica ALREADY has.*
> *Sources: `discovery/fabrica-app-discovery.md`, `discovery/fabrica-app/*.md`.*

---

## 1. Purpose & Scope

Fabrica's orchestration system is the engine that **directs AI agents** (Claude Code, Codex, OpenCode, Pi, ~15 more) running side-by-side in isolated git worktrees. It is the first and most heavily invested area of the After-Rebrand transformation.

It already provides: run/task/worker lifecycle, dispatch preambles , decision gates, federation sync, and an RPC surface. Our job is to upgrade the model.

**Hard constraint:** preserve every existing feature. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

**How it works (plain English):** The orchestration system is Fabrica's "manager of managers." You give Fabrica a goal; it breaks that into tasks, spins up isolated working copies, and dispatches AI agents (different models/tools) to each task. It keeps track of who is doing what, collects their results, and handles human checkpoints. Right now it already does all of this — our job is to make it richer, without removing anything that works today.

---

## 1.1 Sub-Systems Covered (index)

Each sub-system below is described in its own section. The matching system section in `ideas.md` holds the parallel reference designs and new proposals.


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
- Fabrica today does **not** set a model-level system prompt per agent. That layer is a planned enhancement.

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

**How it works (plain English):** The preamble is the instruction brief automatically handed to each agent when it starts. It is *operating instructions*, not the agent's personality. It tells the agent: "You're a worker in Fabrica; here is your task; here are the exact commands to report progress every 5 minutes, to declare done exactly once, to ask a durable question, or to escalate." It also strips the `allow-stale-base` override so the agent can't treat it as an instruction, and it shows the agent any commits it's missing. Important gap: today Fabrica does NOT give each agent a separate "who you are / how to behave" system prompt — that is a planned enhancement.

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

## Project / Workspace Model — Existing System Reference

> **Focus system #2** (after Orchestration). This document describes what Fabrica ALREADY has for projects, project groups, folder-workspaces, worktrees, and the sidebar/kanban UI. Companion ideas live in `ideas.md` (section: Project / Workspace model).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/*.md`.

---

## 1. Purpose & Scope

The Project / Workspace model is the **container layer above orchestration**. Orchestration sub-systems (Run/Task/Coordinator/Worker) are *worktree-scoped*; the workspace model owns the repos/projects that contain those worktrees. It is what the user sees in the **left sidebar**: repos → project groups → worktrees → workspaces.

**How it works:** Think of Fabrica's workspace model as the filing system for all your code. Before any AI agent starts working, the folders and repositories it will work inside must already be organized here. The sidebar is the map you use to find and open any project.

---

## 2. Architecture (what exists)

- **Left sidebar tree** (`fabrica-app-discovery.md:140`): `repos → project groups → worktrees/"workspaces"` with filters (sleeping, default-branch, automation-generated, CLI-created, detached-head) and sort/group controls.

  **How it works:** The left sidebar shows a nested list — repositories at the top, then groups you've organized them into, then individual working copies ("worktrees"). You can filter this list to show only, say, sleeping projects or ones created by automations, and sort or group them to stay organized.

- **`Sidebar.tsx`** renders projects, worktrees, and kanban (`Fabrica-features.md:17`).

  **How it works:** This is the screen component that draws the sidebar you see, including the project list, the working-copy cards, and the kanban (card-board) view described below.

- **`project-groups/` module** = nested-repo discovery / import (`fabrica-app-discovery.md:125`).

  **How it works:** When you add a folder that contains other repositories inside it, this module automatically finds and registers those nested repos so they all appear in the sidebar without you adding each one by hand.

- **Entity triad**: `repo` / `folder-workspace` / `worktree` are distinct but linked (`fabrica-app-discovery.md:146,252`).

  **How it works:** Fabrica tracks three related things separately: the repository (the remote source of truth), the folder-workspace (a local folder you opened), and the worktree (an isolated working copy where changes happen). Keeping them distinct lets one repo support many parallel working copies.

- **Worktree CRUD**: create/set/rm/ps, sleep/activate, lineage, PR/MR base resolution, `forceDeleteBranch` (`fabrica-app-discovery.md:252`).

  **How it works:** You can create, switch, rename, delete, or pause/resume any working copy. "Lineage" records where a copy came from, and the system can resolve which branch a pull/merge request should target. `forceDeleteBranch` lets you remove a branch even when it has unmerged changes.

- **Kanban**: `WorkspaceKanbanDrawer` on the sidebar (`Fabrica-features.md:197`).

  **How it works:** A kanban is a drag-and-drop card board (like "To do / Doing / Done"). This drawer lets you see and organize work items for a workspace directly from the sidebar.

- **Dialogs**: `AddProjectFromFolderDialog`, `ProjectAddedDialog`, `AddRepoDialog`, `AddRemoteHostDialog` (`Fabrica-features.md:181-186`).

  **How it works:** These are the pop-up windows that guide you through adding an existing folder as a project, adding a repository by URL, or connecting a remote server — each step confirms the choice before it is saved.

- **~20 `WorktreeCard*` components**: agent rows, ports, status, metadata, context menus, inline rename, visibility, developer menu, delete (`Fabrica-features.md:163-197`).

  **How it works:** Each working copy is shown as a card in the sidebar. The card displays which agents are running on it, its network ports, its current status, and gives you right-click menus to rename, hide, open a developer menu, or delete it — all without leaving the sidebar.

- **Favorites / quick-open**: starred repos/projects and a quick-open switcher for jumping to any project/worktree, persisted in the `repos`/`ui` store slices (`Fabrica-features.md`).

  **How it works:** You can star frequently used projects as favorites and jump to them from a quick-open list, so your most important working copies are always one keystroke away. This state is saved in the same store slices as the rest of your layout.

- **Multi-folder workspaces**: a single workspace can aggregate several folders/repos opened together, so one window spans multiple projects at once (`Fabrica-features.md`).

  **How it works:** Rather than one folder per window, Fabrica lets a workspace hold several folders, letting you work across related repositories in the same view.

## 3. Persistence / state

- Store slices: `repos/project-groups/folder-workspace`, `worktrees/worktree-nav-history/worktree-catalog-*`, `ui (sidebars, activeView)` (`fabrica-app-discovery.md:146`).

  **How it works:** Fabrica saves your project layout, working-copy history, and which view is open so that when you reopen the app everything looks the way you left it.

- Cross-window/mobile sync via `runtime/sync-runtime-graph.ts`.

  **How it works:** If you have Fabrica open on your desktop and your phone, this sync keeps the project list and status consistent between them so you see the same state on both.

## 4. Important distinctions

- **Sidebar "project" ≠ GitHub project board.** Fabrica also has a `github-project` pane and `github.* project.*` board ops (`fabrica-app-discovery.md:143,255`) — that is GitHub Projects integration, separate from the repo-container "project" in the sidebar.

  **How it works:** The "project" you see in Fabrica's sidebar is just a local container for your code. Separately, Fabrica can also connect to GitHub's own project boards; the two are different features and shouldn't be confused.

- **Project/Workspace ≠ orchestration Run.** A project holds many worktrees; each worktree can host dispatched tasks/runs. They are different layers.

  **How it works:** A project is the folder; a run is a specific job an agent does inside a working copy of that folder. One project can host many jobs over time — they are different levels of the same hierarchy.

## 6. Hard constraint

Preserve every existing workspace feature. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_

## Tasks Panel (GitHub/Jira) + Task Sources — Existing System Reference

> **Focus system #3.** Describes what Fabrica ALREADY has for the in-app task/issue board, GitHub/Jira/Linear integrations, and task-source ingestion. Companion ideas live in `ideas.md` (section: Tasks panel).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-runtime-structured-read.md`, `fa-ipc-watchers.md`, `fa-auth-onboarding.md`, `fa-mobile-companion.md`.

---

## 1. Purpose & Scope

The Tasks surface lets users view and act on issues/tasks from external trackers (GitHub, GitLab, Linear, Jira, Bitbucket, Azure DevOps, Gitea) inside Fabrica, plus ingest "task sources" during onboarding/mobile. It is a **read+write bridge to external trackers**, not an internal task DAG (that is orchestration's `Task`).

**How it works:** The Tasks panel is Fabrica's window into the issue trackers your team already uses (like Jira or GitHub Issues). You can read and update those tickets from inside Fabrica without opening a browser, and during setup or on your phone you can pull in tasks from those services as sources to work on.

## 2. Architecture (what exists)

- **Main view**: `task page` activeView; `TaskPage.tsx` is the main task page (`fabrica-app-discovery.md:140`; `Fabrica-features.md:213`).

  **How it works:** Selecting the Tasks view opens a dedicated page that lists and displays the issues/tasks pulled from your connected trackers.

- **Per-provider issue workspaces**: `JiraIssueWorkspace`, `LinearIssueWorkspace`, `LinearItemDrawer`, `LinearProjectViewSurfaces`, `GitHubItemDialog`, `GitLabItemDialog` (`Fabrica-features.md:214-217,221`).

  **How it works:** Each connected service (Jira, Linear, GitHub, GitLab) gets its own tailored workspace with the right fields and dialogs, so a Jira ticket looks and behaves like a Jira ticket and a Linear issue like a Linear issue.

- **Connection UIs**: `JiraConnectDialog`, `LinearApiKeyDialog`, `TaskProjectSourceCombobox` (`Fabrica-features.md:221-223`).

  **How it works:** These are the screens where you paste an API key or pick which project to connect, so Fabrica can authenticate and start pulling in that service's tasks.

- **GitHub Projects V2 board**: `github-project/` ~29 board-table components (ProjectPicker, ProjectViewList, ProjectRow, ProjectCell…) (`Fabrica-features.md:304-310`; `fabrica-app-discovery.md:143`).

  **How it works:** Fabrica renders GitHub's newer "Projects V2" boards natively, with about 29 small components that together draw the picker, the table rows, and each cell so you can work a GitHub project board inside Fabrica.

- **Deep Linear integration** (~2,200 LOC): `linearConnect`, `linearSaveIssue`, `linearResolveCurrentIssue`, MCP issue-list, custom views, teams/states/labels (`fa-runtime-structured-read.md:86`).

  **How it works:** Fabrica has a large, detailed connection to Linear — you can connect, save/edit issues, mark the current issue resolved, list issues through an agent tool, and see custom views with teams, states, and labels.

- **Deep Jira integration** (~470 LOC): `jiraConnect`, sites/search/create/update/comments/transitions/priorities (`fa-runtime-structured-read.md:87`).

  **How it works:** Similarly, the Jira connection lets you connect a site, search, create or update tickets, add comments, move them through workflow states, and set priorities.

- **GitHub + GitLab hosted-review & issue surfaces** (~1,475 LOC): `createRepoIssue`, `listGitHubProjects`, PR/MR checks/comments/merge/projects (`fa-runtime-structured-read.md` S20).

  **How it works:** For GitHub and GitLab, Fabrica can create repo issues, list projects, and check/comment/merge pull requests and merge requests — all from inside the app.

- **Client roster**: GitHub, GitLab (glab), Linear, Jira, Bitbucket, Azure DevOps, Gitea (`Fabrica-features.md:715-727`; `fabrica-app-discovery.md:13,131`).

  **How it works:** These seven are the trackers Fabrica already knows how to talk to, so you can connect any of them without extra setup.

- **IPC**: `gh` = 28 channels (PR lifecycle, work items, projects, rate-limit/diagnoseAuth); `gitlab:*` 7; `jira:*` ~14; `linear:*` 6+24 preload sites (`fa-ipc-watchers.md:163-167`). Sender-scoped cancellation for long lookups.

  **How it works:** Behind the scenes Fabrica opens many internal communication channels to each service (GitHub alone has 28) to fetch pull requests, issues, projects, and diagnose auth problems. Long lookups can be cancelled so the UI never hangs.

- **Task-source ingestion**: onboarding `IntegrationsStep` derives GitHub/Linear task-source statuses from preflight store (`fa-auth-onboarding.md:228`); mobile "smart source modes" (GitHub/Linear/GitLab/hosted repos) (`fa-mobile-companion.md:88`).

  **How it works:** During first-time setup, Fabrica reads which GitHub/Linear sources you already connected and shows their status; on mobile you can pick "smart source modes" to pull in tasks from GitHub, Linear, GitLab, or hosted repos.

- **`hosted-review` creation** via forge-provider abstraction (backoff/pacing, PR templates, linked issues) (`fabrica-app-discovery.md:128`).

  **How it works:** When Fabrica opens a pull/merge request on your behalf, it uses a unified "forge" layer that paces the requests, fills in a template, and links the related issue, so reviews are created cleanly across providers.

## 4. Hard constraint

Preserve every existing tracker integration. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_

## Agent Dashboard + Map — Existing System Reference

> **Focus system #4.** Describes what Fabrica ALREADY has for the agent board / dashboard, session map, and live agent status. Companion ideas live in `ideas.md` (section: Agent Dashboard).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-agent-hooks-probes.md`, `fa-ipc-watchers.md`, `fabrica-app-renderer.md`.

---

## 1. Purpose & Scope

The Agent Dashboard is the real-time surface for monitoring running agents: a board of agent rows (status, tool steps, messages) plus a popout "map canvas" for spatial agent/session visualization. It consumes live hook status pushed from every agent CLI.

**How it works:** The Agent Dashboard is your live "control room." It shows every AI agent currently running, what each is doing step by step, and any messages they've sent. A separate pop-out "map" view lets you see agents and sessions laid out spatially, like a floor plan of activity.

## 2. Architecture (what exists)

- **Popout windows**: `dashboard-popout agent board/map canvas` (`fabrica-app-discovery.md:140`).

  **How it works:** You can detach the agent board or the map into its own floating window so you can keep watching your agents while you work elsewhere in Fabrica.

- **Components**: `dashboard` (49) + `dashboard-popout` (92) (`fabrica-app-discovery.md:143`); `AgentDashboardDrawer`, `AgentDashboardSettingsMenu`, `DashboardAgentRow` (+`Message`/`ToolStep`/`TrailingControls`), `DashboardAgentChildDisclosure`, `DashboardPopoutBridge`, `RetainedAgentsSyncGate` (`Fabrica-features.md:134-142`).

  **How it works:** The dashboard is built from about 140 small screen pieces — a drawer that slides in, a settings menu, a row per agent showing its messages and tool steps, a disclosure to expand sub-agents, a bridge to the pop-out window, and a gate that keeps retained agents in sync.

- **Live status push**: every accepted hook POST → `agentStatus:set` to main window + dashboard popout (`index.ts:1546-1564`) (`fa-agent-hooks-probes.md:176`).

  **How it works:** Each time an agent reports an update through its "hook" (a status-reporting mechanism), Fabrica pushes that status to both the main window and the pop-out dashboard instantly, so the board is always current.

- **Startup replay**: live rows replayed via `agentStatus:getSnapshot` (`ipc/agent-hooks.ts:112-119`).

  **How it works:** When you open the dashboard, Fabrica asks for a snapshot of currently-running agents and replays it, so you immediately see what's already running rather than starting blank.

- **Snapshot IPC**: `dashboard:requestSnapshot` (`preload/index.ts:2376`); popout consume/ack/release/dismiss; `AgentKanbanBoard.tsx:40-59` (`fa-ipc-watchers.md:161,346`).

  **How it works:** The pop-out and the main app exchange snapshot messages (request / receive / acknowledge / release / dismiss) so they don't both try to control the same agent row, and a kanban-style board component can display agents.

- **Store slices**: `agent-status` / `detected-agents` / `runtime-detected-agents` / `pane-foreground-agent` (`fabrica-app-discovery.md:146`).

  **How it works:** Fabrica keeps four pieces of saved state: the latest status of each agent, the agents it has detected, the agents detected at runtime, and which agent is in the foreground pane — so the dashboard can rebuild itself after a restart.

- **Detection**: `detected-agents.ts` / `runtime-detected-agents.ts` — TUI-agent PATH detection scoped by SSH connection or runtime env (`fabrica-app-renderer.md`).

  **How it works:** Fabrica figures out which agents are running by looking for their command-line tools on the system path, limited to the current SSH connection or runtime environment, so it doesn't accidentally pick up agents from elsewhere.

- **Agent roster (supported hook services)**: Fabrica ships a roster of built-in agent-hook integrations (Claude Code, Codex, OpenCode, Gemini, Grok, and others) registered as hook services, each with its own status, and a per-agent enable/disable toggle (`Fabrica-features.md §8.5`).

  **How it works:** Fabrica maintains a catalog — the "roster" — of the agent tools it can dispatch and monitor, each registered as a hook service so the dashboard can show and drive any of them; individual agents can be paused or disabled without affecting the rest of the roster.

- **Host**: `AgentDashboardSidebarHost` mounted in sidebar composition (`fabrica-app-renderer.md`); experimental feature flags "agents view" / "agent dashboard" (`fabrica-app-renderer.md:255`).

  **How it works:** The dashboard can also be hosted inside the sidebar, and it is gated behind experimental on/off switches ("agents view" / "agent dashboard") so you can enable it when ready.

## 4. Hard constraint

Preserve every existing dashboard feature. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_

## Search Bar / Command Palette — Existing System Reference

> **Focus system #5.** Describes what Fabrica ALREADY has for the command palette / global search (Cmd+J). Companion ideas live in `ideas.md` (section: Search bar).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-command-palette-search.md`, `fa-search-indexing.md`.

---

## 1. Purpose & Scope

The unified command palette (Worktree Jump Palette, Cmd+J) is the global entry point for jumping to worktrees/tabs, running commands, and searching. It also backs right-sidebar text/code search. It is **stateless, fuzzy, and index-free** today.

**How it works:** Press Cmd+J (or Mod+Shift+J) and a single search box appears where you can jump to any working copy or tab, run a command, or search text — all from one place. Today it works by scanning on demand rather than keeping a pre-built index, and it matches loosely (fuzzy) so small typos still find what you want.

## 2. Architecture (what exists)

- **Unified palette**: Worktree Jump Palette (Cmd+J) merges 7 result families (`WorktreeJumpPalette.tsx:258-266`); binding `worktree.palette` = Mod+J / Mod+Shift+J (`keybindings.ts:231-241`) (`fa-command-palette-search.md`).

  **How it works:** The palette blends seven kinds of results (worktrees, tabs, commands, etc.) into one list, and the keyboard shortcut Mod+J opens it while Mod+Shift+J opens the variant.

- **`cmd-j`** (32 components): main palette with fuzzy match, host badges, live status (`fabrica-app-discovery.md:143`).

  **How it works:** About 32 interface pieces make up the palette; it fuzzy-matches your typing, shows a badge for which machine/host a result is on, and displays live status (e.g., is that worktree active).

- **No fuzzy library** (no fuzzysort/fuse.js); bespoke greedy-subsequence fuzzy scorers per surface (`fa-command-palette-search.md:3`).

  **How it works:** Instead of using a ready-made search library, Fabrica wrote its own lightweight "does this string contain these letters in order" matcher for each surface — less dependency, but custom-built.

- **Cross-section relevance** scale (`cmd-j-match-relevance.ts`) for interleaving worktree/tab sections (`fa-command-palette-search.md:5.6`).

  **How it works:** A scoring rule decides how to mix worktree results and tab results together in the list so the most relevant items rise to the top regardless of which section they came from.

- **Code/text search**: stateless per-query via `rg --json` (fallback `git grep`, then budgeted `readdir`); **no persistent index** (`fa-search-indexing.md:0.1`).

  **How it works:** When you search inside files, Fabrica runs the search tool `rg` fresh each time (falling back to `git grep`, then a limited folder scan). It does not keep a standing index, so the first search after a change is always accurate but can be slower on huge repos.

- **Search caps**: `MAX_MATCHES_PER_FILE=100`, total clamp [1,2000], 15s hard timeout → `truncated`, max file 5 MB (`fa-search-indexing.md:1.1,6`).

  **How it works:** To stay responsive, Fabrica limits each file to 100 matches, the whole result to between 1 and 2,000 matches, enforces a 15-second cutoff (after which it reports "truncated"), and skips files larger than 5 MB.

- **Quick Open**: file switcher via `rg --files` two-pass (source then ignored files) (`fa-search-indexing.md:1.2`).

  **How it works:** The "quick open" file finder lists files in two passes — first your real source files, then the normally-ignored ones — so you can jump straight to any file by name.

- **Right-sidebar search UI**: `SearchResultsPane`, `SearchFilters`, `SearchQueryRow`, `RichMarkdownSearchBar`, `BrowserFind` (`Fabrica-features.md:95,276-280`).

  **How it works:** A search panel lives in the right sidebar with results, filter controls, a query row, a rich markdown-aware search bar, and an in-browser find tool.

- **AI Vault session-metadata index**: persisted parse cache, 60s TTL, mtime-driven incremental (`fa-search-indexing.md:1.3,2.2,3.5`).

  **How it works:** For AI Vault sessions, Fabrica keeps a cached, parsed index of metadata that refreshes at most every 60 seconds and only re-parses files whose modification time changed — a small exception to the "no index" rule.

- **No embeddings/vectors/LLM-assisted search** exist (`fa-search-indexing.md:8`).

  **How it works:** Today's search is plain text matching; it does not use AI embeddings or language models to understand meaning, so a search finds words, not concepts.

## 4. Hard constraint

Preserve every existing search path. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_

## Integrations — Existing System Reference

> **Focus system #6.** Describes what Fabrica ALREADY has for SaaS connector management (GitHub, GitLab, Linear, Jira, etc.). Companion ideas live in `ideas.md` (section: Integrations).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-auth-onboarding.md`, `fa-ipc-watchers.md`.

---

## 1. Purpose & Scope

The Integrations surface manages connections to external SaaS providers used by the Tasks panel, source-control, and automations. It is the **connection-management + credential layer** for all external trackers/CRMs.

**How it works:** The Integrations area is where you connect Fabrica to outside services (GitHub, Jira, etc.) and where it safely stores the login credentials for those connections. The Tasks panel, source control, and automations all rely on these connections, so this is the central "wiring closet" for everything external.

## 2. Architecture (what exists)

- **UI**: `IntegrationsPane`; onboarding `IntegrationsStep`; `IntegrationStatusPill` (`Fabrica-features.md:476,529,573`).

  **How it works:** There is a settings pane for integrations, a step during first-time setup to connect them, and a small status pill that shows at a glance whether each connection is working.

- **`IntegrationsStep`** derives GitHub/Linear task-source statuses from preflight store (`fa-auth-onboarding.md:228`).

  **How it works:** During onboarding, this step reads what you already connected and shows the status of your GitHub/Linear task sources before you finish setup.

- **Integrated providers**: GitHub, GitLab, Jira, Linear, Azure DevOps, Bitbucket, Gitea (`fabrica-app-discovery.md:13,131`; `Fabrica-features.md:715-727`).

  **How it works:** These seven services are the ones Fabrica can already connect to; each gets its own client code and credential handling.

- **`linear/`**: SDK client + keychain tokens + issue-context fanout + relations + MCP issue list (`fabrica-app-discovery.md:128`).

  **How it works:** The Linear connection uses an official SDK, stores its token in the system keychain (the OS credential store), broadcasts issue context where needed, tracks relations between issues, and exposes an issue list to agents through MCP.

- **`jira/`**: REST client, ADF→markdown, attachment caching; `azure-devops/` PR/status; `bitbucket/`/`gitea/` PR mapping (`fabrica-app-discovery.md:131`).

  **How it works:** The Jira connection speaks Jira's REST API, converts its rich document format to markdown, and caches attachments. Separate small modules handle Azure DevOps pull-request status and Bitbucket/Gitea pull-request mapping.

- **IPC volume**: `gh` 28 channels, `gitlab` 7, `jira` ~14, `linear` 6+24 preload sites; preload usage `gh`×56, `linear`×24, `jira`×23 (`fa-ipc-watchers.md:90,163-167`).

  **How it works:** Fabrica opens many internal channels to each provider (GitHub 28, GitLab 7, Jira ~14, Linear 6 plus 24 preloaded sites) and preloads data aggressively (GitHub called 56 times, Linear 24, Jira 23) so the UI feels populated immediately.

- **`source-control/` forge-provider abstraction** with `hosted-review` creation (backoff/pacing, PR templates, linked issues) (`fabrica-app-discovery.md:128`).

  **How it works:** A unified "forge" layer wraps the different git hosts so that opening a pull/merge request uses the same code path everywhere, with polite pacing and linked issues.

- **Credential vault**: provider tokens are stored in the OS keychain (e.g., the `linear/` SDK keychain tokens) and surfaced via the `IntegrationsPane`/status pill; secrets are isolated per integration (`Fabrica-features.md`, `fabrica-app-discovery.md:128`).

  **How it works:** Login tokens for each connected service are kept in the operating system's secure credential store rather than plaintext, and each integration's secrets stay isolated so a leak in one can't expose another.

- **OAuth / API-key auth**: connectors authenticate via OAuth2 flows (e.g., Jira/GitHub) or API keys (Linear), handled through the connect dialogs; the `linear/` SDK performs token exchange and refresh (`Fabrica-features.md:476,529`; `fabrica-app-discovery.md:128`).

  **How it works:** When you connect a service, Fabrica walks you through an OAuth login or asks for an API key, then stores the resulting token and refreshes it as needed so the connection stays live without re-logging in.

## 4. Hard constraint

Preserve every existing integration. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_

## Automations — Existing System Reference

> **Focus system #7.** Describes what Fabrica ALREADY has for scheduled/triggered agent-task dispatch. Companion ideas live in `ideas.md` (section: Automations).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-runtime-structured-read.md`, `fa-ipc-watchers.md`.

---

## 1. Purpose & Scope

Automations let users define rules that **dispatch agent tasks on a schedule or trigger**, headlessly, capturing output into snapshot buffers. It is the user-facing scheduling layer that feeds the orchestration engine.

**How it works:** Automations are like saved recipes: "every day at 7am, have an agent do X" or "when Y happens, run Z." They run without you watching (headless), and the agent's output is captured so you can review it later. This is the scheduling front-door that hands work to the orchestration engine.

## 2. Architecture (what exists)

- **Main view**: `automations` activeView (`fabrica-app-discovery.md:140`).

  **How it works:** Selecting the Automations view opens the page where you see and manage all your saved automation rules.

- **Module**: "scheduled/triggered dispatch of agent tasks, headless dispatch w/ output snapshot buffers" (`fabrica-app-discovery.md:128`).

  **How it works:** Under the hood, the module's job is exactly that sentence: take a schedule or trigger, launch an agent task in the background, and record its output into a snapshot buffer you can replay.

- **Components**: `AutomationsPage`, `AutomationsListPanel`, `AutomationsDetailPane`, `AutomationDetail`, `AutomationEditorDialog`, `AutomationEditorPromptSection`, `AutomationRunHistory`, `AutomationSchedulePicker`, `AutomationCustomCronPanel`, `AutomationDeleteDialogs`, `CreateFromPicker` (`Fabrica-features.md:230-241`).

  **How it works:** The UI is built from a page, a list panel, a detail pane, an editor dialog (where you write the prompt), a run-history viewer, a schedule picker (including a custom cron panel for advanced timing), delete confirmations, and a "create from" picker.

- **External managers**: `External automation managers` + `HermesCronOutputView` (`Fabrica-features.md:245-246`).

  **How it works:** Besides Fabrica's own automations, it can surface automations managed by external systems, and `HermesCronOutputView` shows the output of cron-style runs from those external managers.

- **Runtime CRUD/run-now**: `listAutomations`, `runAutomationNow` (`fa-runtime-structured-read.md` S3).

  **How it works:** The engine exposes commands to list your automations and to trigger one immediately ("run now") without waiting for its schedule.

- **IPC**: `automations:list/create/runNow/delete/update/listExternalManagers/listRuns/listExternalRuns/runExternalAction/markDispatchResult` (`fa-ipc-watchers.md:4.14`).

  **How it works:** These are the internal messages used to list, create, run, delete, and update automations, plus to talk to external managers and record a dispatch's result.

- **Cron primitive** already exists inside app runtime (`fabrica-app-discovery.md:208`).

  **How it works:** Fabrica already has a built-in "cron" timer (the standard way to say "run this on a schedule"), so time-based automations don't need an external scheduler.

## 4. Hard constraint

Preserve every existing automation. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_

## Stats & Usage — Existing System Reference

> **Focus system #8.** Describes what Fabrica ALREADY has for usage tracking, per-provider stats, and rate-limit monitoring. Companion ideas live in `ideas.md` (section: Stats & Usage).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-ipc-watchers.md`.

---

## 1. Purpose & Scope

Stats & Usage is the observability surface for token/cost consumption per AI provider, with live usage bars and per-provider rate-limit polling. It is the **metering + guardrail** layer across all agent runs.

**How it works:** The Stats & Usage area shows you how much each AI provider (Claude, Codex, etc.) is being used — tokens consumed and cost — with live bars, and it watches each provider's rate limits so you don't get cut off. It is both your dashboard for spend and a guardrail that warns before you hit a provider's ceiling.

## 2. Architecture (what exists)

- **Status bar usage bars** (`fabrica-app-discovery.md:140`); `stats` (27 usage charts per provider) (`fabrica-app-discovery.md:143`).

  **How it works:** A small usage bar lives in the status bar for a constant at-a-glance read, and there are 27 detailed charts breaking down usage for each provider.

- **Components**: `StatsPane`, `UsageOverviewPane`, `UsageBreakdownSection`, `UsageRecentSessionsTable`, `UsageTrackingPaneShell`, `ClaudeUsagePane`/`CodexUsagePane`/`GrokUsagePane`/`OpenCodeUsagePane` (+DailyChart/Details), `StatCard`, `ShareUsageCard`/`ShareUsageButton` (`Fabrica-features.md:427-442`).

  **How it works:** The screen is composed of a stats pane, an overview, a breakdown section, a table of recent sessions, and provider-specific panes (Claude, Codex, Grok, OpenCode) each with a daily chart and details. `StatCard` shows a single metric, and `ShareUsageCard`/`ShareUsageButton` let you share a usage report.

- **Store slices**: `store/slices/stats.ts:15`, `usage-provider-slices.ts:275-297`; IPC `stats:summary`, `${prefix}:getSummary/getDaily` (`fa-ipc-watchers.md:6.2,4.12`).

  **How it works:** Fabrica keeps usage state in dedicated store slices and answers internal requests for a summary or daily breakdown per provider.

- **Rate limits**: `rateLimits` namespace ×10 (`rate-limits.ts`); `rate-limits/` ~33 files — central `RateLimitService` polling per-provider (Claude/Codex/Gemini/Grok/Kimi/MiniMax/OpenCode) (`fa-ipc-watchers.md:163,4.12`).

  **How it works:** A central service continuously polls ten rate-limit namespaces across seven providers to know how close you are to each provider's usage cap, so it can warn or throttle before you're blocked.

- **`usage/`**: provider-agnostic usage record contract (plugin-contributable); `stats/`: local collector, PRs created, 10k event cap (`fabrica-app-discovery.md:128`).

  **How it works:** Usage is recorded in a provider-neutral format that plugins can also contribute to, and the local collector tracks things like pull requests created, capping stored events at 10,000 to bound growth.

- **Slices**: `claude/codex/opencode usage`; `star-nag` gated by stats (`fabrica-app-discovery.md:146,128`).

  **How it works:** Saved state includes per-provider usage (Claude/Codex/OpenCode) and a "star-nag" prompt (a gentle ask to star the project) whose display is decided by your usage stats.

## 4. Hard constraint

Preserve every existing stats/usage feature. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_

## Plugins — Existing System Reference

> **Focus system #9.** Describes what Fabrica ALREADY has for the plugin system / marketplace. Companion ideas live in `ideas.md` (section: Plugins).
> Sources: `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-plugin-runtime.md`, `discovery/fabrica-app/fa-ipc-watchers.md`, `fabrica-app-discovery.md`.

---

## 1. Purpose & Scope

The Plugin system lets third parties extend Fabrica via out-of-process plugins (UI panels, commands, host-calls), distributed through a Marketplace with provenance/trust enforcement. It is the **extensibility + trust** layer.

**How it works:** Plugins are add-ons that other developers write to give Fabrica new panels, commands, or abilities. They run in a separate process (not inside Fabrica's core) and are installed from a Marketplace that checks where each plugin came from and whether it can be trusted. This is how Fabrica stays extendable while keeping the core safe.

## 2. Architecture (what exists)

- **Renderer UI**: `PluginPanel`, `PluginCatalogLayout`, `PluginCatalogAvatar`, `PluginCatalogEmptyState`, `PluginMarketplaceBrowser` (`Fabrica-features.md:410-414`).

  **How it works:** The in-app UI for plugins includes a panel that hosts a plugin's interface, a catalog layout with icons and an empty state, and a browser for the Marketplace where you discover plugins.

- **Settings**: `PluginsSettingsSection`, `PluginMarketplaceBrowser`/`ListingRow`, `PluginInstallDialog`, `PluginConsentDialog`, `PluginRemoveDialog` (`Fabrica-features.md:478-483`).

  **How it works:** In Settings you'll find a plugins section, marketplace rows, and dialogs to install, consent to (approve capabilities), and remove a plugin.

- **Backend** (`§8.6`): `PluginService`, `PluginSupervisor`, `PluginDiscovery`, `PluginHostRuntime`, `PluginWorkerController`, `PluginMarketplaceService`, `PluginAuditLog`, `PluginKillListService`, `PluginContentSafety` (`Fabrica-features.md:648-657`).

  **How it works:** Behind the scenes a set of services runs plugins: one to supervise them, one to discover installed plugins, one to host the worker process, one to run the marketplace, an append-only audit log, a "kill list" of banned plugins, and a content-safety check.

- **IPC**: `plugins:*` ×18 + marketplace family (`listMarketplaces/addMarketplace/removeMarketplace/refreshMarketplaces/installMarketplacePlugin/previewMarketplacePlugin/previewMarketplaceUpdate/rollbackMarketplacePlugin/listMarketplacePlugins`) (`fa-ipc-watchers.md:4.14`).

  **How it works:** Fabrica uses 18 internal plugin messages plus a marketplace family that lets you list, add, remove, refresh marketplaces, and install/preview/rollback plugins — including rolling back a bad update to the previous version.

- **Out-of-process worker**: `child_process.fork`, zod-validated protocol both directions, timeouts (READY 10s, INVOKE 30s, EVENT 5min), slot pool `PLUGIN_WORKER_MAX_ACTIVE_DEFAULT=5`, supervision `maxRestarts=3` backoff (`fa-plugin-runtime.md` S5).

  **How it works:** Each plugin runs in its own forked process; every message is validated (zod) in both directions, and there are strict timeouts (10s to start, 30s per call, 5min per event). Only 5 plugins run at once by default, and a crashed plugin is restarted at most 3 times with backoff — so a bad plugin can't take down Fabrica.

- **Panel bridge**: CSP-first shell + navigation guard, opaque bearer session tokens, admission budgets (64KB msg, 30 msgs/10s, 10s ping/5s pong watchdog) (`fa-plugin-runtime.md` S6).

  **How it works:** A plugin's UI panel is sandboxed (content-security policy), uses hidden session tokens, and is limited in how much it can send (64KB per message, 30 messages per 10s) with a ping/pong watchdog — containing what a plugin can do to the interface.

- **Marketplace**: `fabrica-marketplace.json` schema, official Auto-Scalers source pinning, provenance validation, installer preview/install with commit-lock (`fa-plugin-runtime.md` S9).

  **How it works:** The Marketplace is described by a JSON schema, pins the official Auto-Scalers source, validates each plugin's provenance (where it really came from), and locks installation to a specific commit so what you install can't silently change.

- **Kill list**: `plugin-kill-list.json` from `fabrica-ai.vercel.app/plugins/kill-list.json`, revocation chokepoint at every approval gate (`fa-plugin-runtime.md` S10).

  **How it works:** A centrally published "kill list" names banned plugins; it is checked at every approval step, so a revoked plugin is blocked everywhere, instantly.

- **Trust model**: bundled = official only, reserved identities (`autoscalers`/`fabrica-`), consent fingerprints bind capabilities + instructional-content hash, feature flag fails closed (`fa-plugin-runtime.md` S12).

  **How it works:** Plugins bundled with Fabrica are official-only; certain identity names are reserved, and when you consent to a plugin a fingerprint records exactly which capabilities and instructions you approved. If a feature flag is on, it fails "closed" (denies) by default — safe unless explicitly allowed.

- **Content-pack registries**: language packs, VM recipes, commands/keybindings; instructional-integrity hash re-check at every read (`fa-plugin-runtime.md` S11).

  **How it works:** Plugins can ship content packs (extra languages, VM setups, commands/keybindings); each is re-checked against an integrity hash every time it's read, so tampered content is caught.

- **Audit log** (append-only JSONL), **dev watcher** (Parcel, 300ms debounce), per-plugin KV/secrets stores (own encrypted file) (`fa-plugin-runtime.md` S8,S12; `fa-ipc-watchers.md:5.7`).

  **How it works:** Every plugin action is written to an append-only log for review; a dev mode re-bundles on change after 300ms; and each plugin gets its own encrypted key/secret store so credentials stay isolated.

- **Plugin host facade** narrowed to `resolveActiveWorktreeContext`, `listTerminals`, `sendTerminal`, `dispatchPluginNotification` (`fa-runtime-structured-read.md:7`).

  **How it works:** A plugin is intentionally given only four host abilities — find the active worktree, list terminals, send to a terminal, and dispatch a notification — limiting what it can touch in your workspace.

## 4. Hard constraint

Preserve every existing plugin feature. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
