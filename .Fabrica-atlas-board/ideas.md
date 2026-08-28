# Fabrica Transformation — Ideas by Focus System

> **Scratch space.** The After-Rebrand transformation now focuses on **9 systems** (not just orchestration). Each section lists that system's **sub-system titles** (mirroring the index in its `*-system.md` reference) with ideas pulled from the discovery + analysis files: `[Fabrica]` = what already exists (baseline to preserve), `[MC]`/`[buzz]` = adoptable reference designs. Nothing here is validated.
> When an idea is **validated**, move it into the corresponding `*-system.md` and log it in §Promotion Log.

## Focus Systems Index
| # | System | Reference file |
|---|---|---|
| 1 | Orchestration | `orchestration-system.md` |
| 2 | Project / Workspace model | `workspace-system.md` |
| 3 | Tasks panel (GitHub/Jira) + Task Sources | `tasks-system.md` |
| 4 | Agent Dashboard + map | `agent-dashboard-system.md` |
| 5 | Search bar | `search-system.md` |
| 6 | Integrations | `integrations-system.md` |
| 7 | Automations | `automations-system.md` |
| 8 | Stats & Usage | `stats-usage-system.md` |
| 9 | Plugins | `plugins-system.md` |

---

## 0. Guiding Constraint

**Strictly preserve every existing Fabrica feature.** Enhance/extend only — never remove. Any MC/buzz capability adopted must be a strict superset. (Fabrica-App Transformation Rule in `AGENTS.md`.)

## PM Vision (direction)

Fabrica → an **agentic orchestration platform**: directs agents, with first-class control over agent identity, system prompts, skills, and multi-tier coordination. Build on the engine that already exists; add a clean tier hierarchy + MC/buzz-grade agent/skill/persona model.

---

## Sub-System Titles (details live in `orchestration-system.md`)

1. Run (run-create)
2. Task (task-create)
3. Coordinator (auto-dispatch)
4. Worker-start (explicit)
5. worker_done settlement (lifecycle-reconciliation)
6. Decision gates
7. Federation sync (cross-environment)
8. Drift-guarded dispatch (git layer)
9. Preamble system
10. RPC surface
11. Integration points
12. Reference designs (MC + buzz)

---

## Ideas (by sub-system)

### 1. Run (run-create)

- **[Fabrica]** `run-create` = `BEGIN IMMEDIATE` tx → unbind other runs on same pane → insert `run_<hex>` (`generation=1`); `bindRun` supports a legacy-authority proof path. (`fabrica-app-discovery.md:236`; `orchestration-system.md §5.1`)
  - **What this means:** When you start a tracked job ("run"), Fabrica records it safely and makes sure no other run is fighting over the same window. This is the basic "start a job" action that already works and must be kept.

- **[Fabrica]** `RunRow` durable schema: `id, objective, home_database, coordinator_handle, coordinator_pane_key, consumer_generation, legacy`. (`fabrica-app-discovery.md:233`)
  - **What this means:** Each run is stored with an ID, its goal, which coordinator/window owns it, and a generation counter. This is the saved record behind every job you launch.

- **[Fabrica]** Coordinator ends a run when all tasks are `completed|failed`; logs `"Stuck"` if no active tasks but some `blocked`. (`coordinator.ts:541` per `orchestration-system.md §5.3`)
  - **What this means:** A job automatically closes once all its steps are done or failed, and warns you ("Stuck") if nothing is running but some steps are still waiting on a decision — so you're never left wondering why a run never finished.

- **[MC]** Four distinct run engines layered on one shared JSON store (single-task run, daemon poll, mission/project chain-dispatch, field-ops 8-state FSM); workflows are *implicit* (cron `blockedBy`, `decisions.json`) — no generic DSL. Adopt: Fabrica could formalize multiple **run "kinds"** (mission / venture) instead of one generic run. (`mc-workflow-engine.md:11-18`)
  - **What this means:** Mission Control runs jobs in four different styles (a one-off task, a repeating poller, a chained mission, or a field-ops state machine). We could let Fabrica label runs as different "kinds" (e.g., a mission vs a venture) so each kind follows its own rules, instead of treating every run identically.

- **[MC]** Single-flight guard: HTTP 409 if a mission for the project is already `running`. Adopt as a run-create duplicate guard *beyond* pane-unbind. (`mc-workflow-engine.md:90`, `projects/[id]/run/route.ts:83-93`)
  - **What this means:** Mission Control refuses to start a second run for the same project if one is already going. We could add this extra "don't double-start" guard on top of Fabrica's existing window-unbind check, preventing accidental duplicate jobs.

- **[MC]** Loop detection per task: `attempts>=3` → auto-creates a decision (human gate) with options Retry-different / Skip / Stop-mission. Adopt escalation→decision for Fabrica runs. (`mc-chainedispatch-reconciler.md:87`, `RUNTASK:505-538`)
  - **What this means:** In Mission Control, if a task fails three times it automatically opens a human decision gate offering "retry differently / skip / stop." We could make Fabrica do the same, so repeated failures pause for your input instead of burning retries.

- **[buzz]** Workflow runs carry `run_status` (pending/running/…), `execution_trace JSONB`, `error_code`, and **resume** via `start_index` + `initial_outputs` (approval-resume replays). Adopt resumable, trace-bearing runs. (`bz-db-schema.md:90`; `buzz-workflow/executor.rs:1055`)
  - **What this means:** buzz keeps a status, a full execution trace, and an error code for each run, and can resume from where it left off using a start index and saved outputs. We could make Fabrica runs resumable and self-documenting, so a paused/approved run picks up cleanly instead of restarting.

- **(none found)** for a buzz-native `run-create` RPC — buzz models runs as workflow-execution rows, not a CLI run-create.
  - **What this means:** buzz has no direct equivalent of Fabrica's "create a run" command; it stores runs as database rows instead. So there is nothing buzz-specific to copy here — Fabrica's run-create is the baseline to keep.

### 2. Task (task-create)

- **[Fabrica]** `task-create` validates same-run `parentId`/`deps` → `pending` if deps unmet else `ready`; `TaskRow.status` DAG via `parent`/`deps(JSON)`. (`fabrica-app-discovery.md:237,233`)
  - **What this means:** Creating a task checks that its parent and dependencies belong to the same run; incomplete dependencies make it wait (`pending`), otherwise it becomes `ready`. Tasks can form a dependency graph, which Fabrica already enforces.

- **[Fabrica]** `deps` are enforced (contrast MC gap below). Keep. (`orchestration-system.md §5.2`)
  - **What this means:** Fabrica actually honors task dependencies (unlike MC, see below) — a task won't run until what it depends on is done. This is a strength to preserve.

- **[MC]** `blockedBy` dependency lists exist but are **NOT enforced** by the field-ops run gate (only regular tasks check them). Adopt: enforce `blockedBy` on *all* task kinds (fix the MC gap). (`mc-fieldtask-kanban.md:198,254`)
  - **What this means:** In Mission Control, "blockedBy" links exist but aren't always respected for field-ops tasks. We could adopt the good habit of enforcing dependencies on every task kind, fixing that gap — and Fabrica already does this for normal tasks.

- **[MC]** Eisenhower priority + kanban status + agent lead; priority sort used by the *non-mission* daemon poll only. Adopt a **priority queue** into Fabrica's coordinator (today it orders by DAG only — `mc-chainedispatch-reconciler.md:89`). (`mc-fieldtask-kanban.md`; `mc-workflow-engine.md:104`)
  - **What this means:** Mission Control tags tasks with urgency/importance and a kanban status, and sorts by priority in some dispatchers. We could add a priority queue to Fabrica's coordinator so urgent tasks get picked before less urgent ones, not just by dependency order.

- **[MC]** Typed task payloads with `{{variable}}` templates. Adopt typed/templated task specs. (`mission-control-discovery.md:352`)
  - **What this means:** Mission Control lets task descriptions use typed fields and `{{variable}}` placeholders that get filled in. We could let Fabrica task specs be templated too, so repetitive tasks are easier to write and reuse.

- **[MC]** Risk-tiered approval `requiresApproval(type, serviceRisk, autonomyMode)` computed **server-side** (never trust client); "iron claw" = high-risk always needs approval. Adopt task-level approval gating for high-risk agent actions. (`mc-workflow-engine.md:128-136`)
  - **What this means:** Mission Control decides on the server whether an action is risky enough to need human approval (high-risk actions always do). We could add per-task approval gates so dangerous agent actions pause for you, computed safely server-side.

- **[buzz]** Workflow steps run sequentially with optional `if:` conditions, **per-step `timeout_secs`**, and structured `StepTimeout` errors. Adopt step-level timeouts. (`buzz-workflow/executor.rs:1120-1250`)
  - **What this means:** buzz runs workflow steps in order, with optional conditions and a timeout per step that produces a clear "timed out" error. We could give Fabrica tasks step-level timeouts so a stuck step fails cleanly instead of hanging.

- **[buzz]** Git branch protections (`push-allowed` / `require-approval` / `no-force-push` via `buzz-protect` tags) make some tasks approval-gated at the git layer. Adopt approval-gated tasks for git ops. (`buzz-features.md:156`)
  - **What this means:** buzz marks some git branches as needing approval before push or forbidding force-push. We could make certain Fabrica tasks approval-gated at the git level, so protected branches are never changed without your sign-off.

### 3. Coordinator (auto-dispatch)

- **[Fabrica]** `coordinator` tick (default 2000ms): `MAX_CONCURRENT_DEFAULT=4`, `HUNG_THRESHOLD_MS=10min`, `DISPATCH_STALE_THRESHOLD=20` commits; `tick()` = processMessages→escalations→decisionGates→staleWarn→dispatchReadyTasks→convergence. (`coordinator.ts:106-115`; `orchestration-system.md §5.3`)
  - **What this means:** The coordinator checks for work every 2 seconds, allows up to 4 agents at once, considers an agent hung after 10 minutes, and refuses to dispatch if your code is more than 20 commits behind. It processes messages, escalations, gates, stale warnings, then dispatches ready tasks and checks if the run is done. This is the heartbeat of auto-dispatch.

- **[Fabrica]** `decompose()` **NOT implemented** — tasks must be pre-created via `taskCreate`; coordinator runs on an existing DAG only. (`coordinator.ts:196`)
  - **What this means:** Today the coordinator won't break a goal into tasks by itself; you must create the tasks first. It only manages tasks that already exist — a known limitation, not a bug.

- **[Fabrica]** At most **one terminal spawned per tick**; reused if a writable+connected terminal exists. (`coordinator.ts:373`)
  - **What this means:** The coordinator opens at most one new agent terminal per 2-second check and reuses an existing one when it can — pacing resource use so it doesn't flood your machine with agents.

- **[Fabrica]** Drift probe once per tick vs tracking remote; refuses dispatch if `behind>20` unless `allow-stale-base:true` (silent return, never burns circuit-breaker). (`coordinator.ts:387,425`)
  - **What this means:** Before dispatching, it checks if your working copy is over 20 commits behind the remote; if so it holds off silently and retries later — without counting it as a failure. You can override with an explicit flag. This protects agents from working on stale code.

- **[MC]** Daemon poll dispatcher: Eisenhower-sorted, health-monitored slots, **persistent retry queue** (exp backoff `retryDelay×2^(n-1)` capped 60min, survives restarts), due-retries processed first. Adopt priority sort + durable retry budget + due-retry priority. (`mc-workflow-engine.md:173-179`; `dispatcher.ts:95-215`)
  - **What this means:** Mission Control's poller sorts by urgency, watches slot health, and keeps a retry queue that survives restarts with exponential backoff (capped at 60 min), doing overdue retries first. We could add priority sorting and a durable retry budget to Fabrica's coordinator so failed tasks recover gracefully.

- **[MC]** Anti-pattern to avoid: the *same dispatchability predicate* is reimplemented in 4 places (RUNTASK/MISSIONS-API/DISPATCHER/PROJECT-RUN). Adopt a **centralized** predicate (the chainedispatch report itself recommends this). (`mc-chainedispatch-reconciler.md:31,197`)
  - **What this means:** Mission Control repeats the "can this be dispatched?" logic in four spots, which is error-prone. We should put that logic in one place in Fabrica so it stays consistent — a cleanup lesson from MC.

- **[MC]** Opt-in `fieldOps.autoExecute` with vault-session check + `maxConcurrentExecutions` cap. Adopt capability-gated auto-dispatch. (`mc-workflow-engine.md:179`)
  - **What this means:** Mission Control only auto-executes field ops when you opt in, after checking a vault session, and caps concurrent runs. We could gate Fabrica's auto-dispatch behind a capability check so it only runs when allowed.

- **[buzz]** No central coordinator — harnesses **self-claim** agents from a pool (`AgentPool.try_claim` affinity). Adopt worker-affinity dispatch (see §4). (`buzz-agent-crates.md:34`)
  - **What this means:** buzz has no central dispatcher; agents grab work from a pool with affinity to a session. We could let Fabrica reuse the same worker for related tasks (affinity), reducing startup cost.

- **Idea (converge):** keep Fabrica's in-process coordinator; port MC's priority sort + durable retry budget + centralized predicate + capability gating.
  - **What this means:** The plan: keep Fabrica's working coordinator, but borrow Mission Control's better priority sorting, restart-safe retries, single source of dispatch truth, and opt-in gating — improvements without replacing what works.

### 4. Worker-start (explicit)

- **[Fabrica]** `worker-start`: mutation-receipt dedupe by `(callerFingerprint, requestId)`; retry requires prior `failed|stopped|abandoned`; inserts `dispatch_contexts(pending)` + `worker_dispatches(starting)`; setup completion via stdout marker `__FABRICA_SETUP_COMPLETE__:<token>:<exitCode>`. (`fabrica-app-discovery.md:238`; `orchestration-system.md §5.4`)
  - **What this means:** Starting a worker directly is de-duplicated so the same request can't launch twice, and you can only retry after a prior attempt ended. Setup is confirmed when the agent prints a special completion marker with its exit code — Fabrica knows exactly when the worker is ready.

- **[Fabrica]** `WorkerDispatchRow` FSM: `starting→ready→succeeded|failed|stopping|stopped|start_unknown|stop_unknown|abandoned`. (`fabrica-app-discovery.md:233`)
  - **What this means:** A worker moves through a clear lifecycle (starting → ready → succeeded/failed …), with explicit "unknown" states when Fabrica can't tell what happened. This tracked state is what lets the system reason about each agent.

- **[MC]** `run-task.ts` spawns a **detached Claude Code CLI child**; validation gate calls `process.exit(1)` *before any state is written*. Adopt pre-state-write validation gate. (`mc-workflow-engine.md:75`; `run-task.ts:789-834`)
  - **What this means:** Mission Control validates everything and exits early before writing any state, so a bad launch leaves no half-records. We could add the same "validate before you write" gate to Fabrica's worker-start.

- **[buzz]** `spawn()`: piped stdin/stdout, `kill_on_drop(true)`, Unix `process_group(0)` (SIGKILL can't hit harness group); env layering order (1 runtime defaults → 2 persona `extra_env` operator-wins → 3 CODEX_CONFIG deep-merge forcing `sandbox_workspace_write.network_access=true` LAST). Adopt subprocess sandboxing + env precedence. (`buzz-agent-crates.md:44`)
  - **What this means:** buzz spawns agents in a sandboxed subprocess that cleans up on drop, and layers environment variables in a fixed order (persona overrides defaults, network access forced last). We could adopt this sandboxing and env precedence so workers are safer and config is predictable.

- **[buzz]** **Pre-spawn readiness gate**: `agent_readiness` computed from effective env; if `NotReady`, inject `BUZZ_ACP_SETUP_PAYLOAD` and start harness in minimal setup-listener mode. Adopt readiness gating before worker-start. (`buzz-desktop.md:67`)
  - **What this means:** buzz checks an agent's readiness from its environment before spawning; if not ready, it boots in a minimal setup mode. We could add a readiness check so Fabrica doesn't start a worker that isn't fully configured.

- **[buzz]** `AgentPool.try_claim` = Pass 1 session-affinity (idle agent already has an ACP session for the channel), Pass 2 first idle slot. Adopt worker affinity / reuse. (`buzz-agent-crates.md:34`)
  - **What this means:** buzz reuses an idle agent that already has a session for the channel, falling back to any idle slot. We could reuse warm workers for related tasks (affinity) to avoid repeated cold starts.

- **[buzz]** Crash recovery: `recover_panicked_agent` + `SlotCircuit` crash history + `spawn_respawn_task`. Adopt automatic worker respawn. (`buzz-agent-crates.md:60`)
  - **What this means:** buzz automatically recovers a panicked agent and respawns it, tracking crash history per slot. We could make Fabrica auto-respawn crashed workers instead of leaving them dead.

### 5. worker_done settlement (lifecycle-reconciliation)

- **[Fabrica]** `lifecycle-reconciliation.ts`: `hasLifecycleAuthority` = sender `pane_key` must match assignee (leaf-id equivalence); **payload knowledge alone is NEVER authority**. 11 rejection codes (`sender_not_assignee`, `dispatch_capability_invalid`, `invalid_payload`, `missing_task_id`, `missing_dispatch_id`, `invalid_outcome`, `unknown_task`, `unknown_dispatch`, `task_dispatch_mismatch`, `inactive_dispatch`, `stale_dispatch`). (`lifecycle-reconciliation.ts:26`; `orchestration-system.md §5.5`)
  - **What this means:** When an agent reports done, Fabrica proves it's the *right* agent (matching window identity), not just anyone who knows the task. Wrong or stale reports are rejected with a specific code. This is the security check that stops fake "done" messages.

- **[Fabrica]** `worker_done` contract = JSON `{taskId, dispatchId, outcome}`; `settleWorkerReport` does idempotency + staleness checks; idempotency guard `_FABRICALifecycleRejection` (caller-supplied markers can't fake success); post-settle `suppressEarlierHeartbeats`. (`orchestration-system.md §5.5`)
  - **What this means:** A valid done report carries task/dispatch IDs and an outcome; the system checks it isn't a duplicate or stale, blocks forged success markers, and cleans up old heartbeats after settling. This makes completion reliable and tamper-resistant.

- **[Fabrica]** On success: atomic task+dispatch update, question cleanup, **dependency promotion**. (`fabrica-app-discovery.md:240`)
  - **What this means:** When a task succeeds, Fabrica updates the task and dispatch together, clears its open questions, and promotes dependent tasks (unblocks the next steps) in one atomic move — so the DAG advances correctly.

- **[MC]** `handleTaskCompletion` = 4 best-effort steps (idempotent mark-done, inbox report, activity event, regenerate `ai-context.md`). Adopt regen-context-on-complete (Fabrica already does dependency promotion). (`mc-workflow-engine.md:233`)
  - **What this means:** Mission Control, on completion, marks done, reports to inbox, logs an event, and regenerates a context file. We could add context regeneration on completion; Fabrica already does the dependency-promotion part.

- **[buzz]** Usage/turn metric `kind:44200` is emitted **BEFORE** the prompt response so the upstream UsageTracker sees it in-flight. Adopt emit-before-settle ordering. (`buzz-agent-crates.md:88`)
  - **What this means:** buzz records per-turn usage *before* finishing, so metering is never missed. We could settle usage before marking a task done, ensuring cost tracking is complete.

- **[buzz]** Owner-signed lifecycle events (1630-1633) + **orphan sweeps** (`instance_reaper` reaps harnesses whose owning desktop died). Adopt orphan reaping for Fabrica `worker_terminal_resources`. (`buzz-desktop.md:74-75`)
  - **What this means:** buzz signs lifecycle events and runs a sweep that kills agents whose owner desktop crashed. We could add orphan reaping so Fabrica cleans up terminal resources left by dead sessions.

- **Idea (converge):** keep Fabrica's authority + rejection model; port buzz orphan-reaping + emit-before-settle.
  - **What this means:** Keep Fabrica's trusted settlement and rejection model, and borrow buzz's cleanup of orphaned agents and pre-settle usage emission — small, safe hardening.

### 6. Decision gates

- **[Fabrica]** Created via `gateCreate` / `decision_gate` messages; **humans resolve via `gateResolve`**; coordinator never auto-resolves; resolved context injected as `--- DECISION GATE RESOLVED ---` into later preambles. (`orchestration-system.md §5.6`; `coordinator.ts:347,473`)
  - **What this means:** A decision gate is a human checkpoint mid-run. Only you can resolve it; the coordinator won't decide for you, and your answer is fed into the agent's brief so work continues with your decision.

- **[Fabrica]** `DecisionGateRow` + `QuestionRow`; `gateCreate`/`gateResolve` RPC. (`fabrica-app-discovery.md:233,241`)
  - **What this means:** Gates and questions are stored as durable records and exposed via `gateCreate`/`gateResolve` commands — the machinery behind the human-checkpoint feature that already exists.

- **[MC]** File-based `decisions.json` hard-blocks a task at **six independent enforcement points** (manual run API, daemon dispatcher, run-task pre-exec, mission chain-dispatch, project-run launch, reconciler). Adopt multi-point enforcement. (`mc-decision-gates.md:12,86-117`)
  - **What this means:** Mission Control enforces a "decision needed" block in six separate places so it can't be bypassed. We could enforce Fabrica's gates at multiple points too, making human checkpoints harder to skip.

- **[MC]** **Retry-prompt injection**: an answered decision is injected verbatim as "Retry Instructions" into the *next* prompt built for that task (permanent context until deleted). Adopt answered-gate → next-prompt injection (Fabrica does this for gates; MC does it for loop decisions). (`mc-decision-gates.md:173-175`; `prompt-builder.ts:497-499`)
  - **What this means:** Mission Control injects your answered decision as "retry instructions" into the next prompt for that task, permanently, until deleted. Fabrica already does this for gates; we could extend it to loop decisions.

- **[MC]** Loop-escalation auto-creates a decision at `attempts>=3` with a fixed option trio + error-history context. Adopt. (`mc-decision-gates.md:87`)
  - **What this means:** Mission Control, after 3 failed attempts, auto-opens a decision with set options (retry-different / skip / stop) plus the error history. We could adopt the same so repeated failures escalate to you cleanly.

- **[buzz]** `request_approval` **action suspends a run with a UUID token**; resolved via `grant`/`deny` events. Adopt suspend-with-token + explicit grant/deny events (more structured than Fabrica's gateResolve). (`buzz-features.md:66,72`)
  - **What this means:** buzz pauses a run for approval using a unique token and resolves it with explicit grant/deny events. We could make Fabrica's gate resolution more structured with tokens and explicit grant/deny.

- **[buzz]** Workflow approvals suspend for human approval (resume replays from `start_index`). Adopt resumable approval suspension. (`buzz-features.md:66`; `buzz-workflow/executor.rs:1055`)
  - **What this means:** buzz's approval pause can resume from where it stopped. We could let Fabrica's gated runs resume cleanly after approval rather than restarting.

- **Idea (converge):** keep Fabrica's gateCreate/gateResolve; add MC's loop-decision injection + buzz's suspend-token grant/deny.
  - **What this means:** Keep Fabrica's gate commands, but add Mission Control's loop-decision escalation and buzz's token-based suspend/grant/deny for a more structured human checkpoint.

### 7. Federation sync (cross-environment)

- **[Fabrica]** `federation-sync.ts`: **peer-fingerprint guard** (`peer_changed` on mismatch), **contiguity** (`sequence===cursor+1` else `operation_unknown`), lifecycle mapping (`heartbeat`→recorded, `worker_done`→validated+stored), **ack lease** (`relay_ack_<dispatchId>_<cursor>`), reverse push, priority normalization. (`orchestration-system.md §5.7`)
  - **What this means:** Federation sync lets two Fabrica environments share work. It trusts the other side via a fingerprint, insists messages arrive in order, records heartbeats and validates done reports, acknowledges in idempotent batches, pushes back outbound items, and normalizes priority. This is the cross-machine bridge that already exists.

- **[Fabrica]** `FederatedDispatchRow` / `RemoteDispatchAttachmentRow` / `FederationRelayItemRow`; `federationPull` / `Ack` / `Import`. (`fabrica-app-discovery.md:242,246`)
  - **What this means:** These are the stored records and commands for federated dispatches, attachments, and relay items — the data behind cross-environment coordination.

- **[buzz]** Relay is the **single source of truth**; dispatch/lifecycle are signed Nostr events; **community is the tenant**; inter-relay **mesh** (`mesh_boot.rs`). Adopt relay-as-truth + signed dispatch events + community-tenant federation. (`buzz-features.md`; `bz-ops-deploy-admin.md:mesh_boot.rs`)
  - **What this means:** buzz treats a relay (decentralized server) as the one true record, signs every dispatch event, and organizes by community with a relay mesh. We could make Fabrica's federation treat a relay as truth and sign events, with community tenancy.

- **[buzz]** Ownership attestation: NIP-42 auth (`kind:22242`), NIP-43 membership, NIP-OA `auth_tag` (verified owner attestation). Adopt ownership attestation for federation identity (Fabrica's peer-fingerprint is the analog — generalize it). (`buzz-agent-crates.md:19,58`; `buzz-desktop.md`)
  - **What this means:** buzz proves who owns a connection via signed attestations. Fabrica's peer-fingerprint is the analog; we could generalize it into a full ownership-attestation scheme for federation identity.

- **[buzz]** `push_leases` table: `active` XOR CHECK, endpoint uniqueness partial index, claim queues with SKIP-LOCKED-style recovery. Adopt for federation ack-lease durability. (`bz-db-schema.md:137,350`)
  - **What this means:** buzz uses a lease table so only one active push claim exists per endpoint, with recovery queues. We could use the same pattern to make Fabrica's federation ack-leases more durable.

- **[MC]** (none found — MC is single-environment JSON; no cross-environment federation).
  - **What this means:** Mission Control runs in a single environment with a local JSON file and has no cross-machine federation, so there's nothing from MC to adopt here.

- **Idea (converge):** keep Fabrica's contiguity + peer-fingerprint; port buzz signed-event + community-tenant + mesh + NIP-OA ownership.
  - **What this means:** Keep Fabrica's ordered, fingerprint-trusted sync, and add buzz's signed events, community tenancy, relay mesh, and ownership attestation for a more robust multi-environment federation.

### 8. Drift-guarded dispatch (git layer)

- **[Fabrica]** Pre-dispatch `getRemoteDrift` = `rev-list --left-right --count local...remote` (`repo.ts:540-562`); drift subjects injected into worker preamble (`log --format=%s -n limit local..remote`, `:568-587`); `>20` behind refuses unless `allow-stale-base:true`. (`orchestration-system.md §5.8`; `fa-git-integration.md:142,369`)
  - **What this means:** Before dispatching, Fabrica measures how far your branch has drifted from the remote and tells the agent the missing commits; if you're over 20 commits behind it refuses (unless you override). This keeps agents from working on outdated code.

- **[Fabrica]** Coordinator drift probe once per tick, shared base snapshot, silent return on refusal. (`coordinator.ts:387,425`)
  - **What this means:** The coordinator runs this drift check each cycle using one shared snapshot and silently retries later if refused — no failure burned, no noise.

- **[buzz]** Git branch protections: `push-allowed` / `require-approval` / `no-force-push` via `buzz-protect` tags; PRs are signed Nostr events (not git signatures); authorization via relay push-policy keyed to Nostr identity + owner-signed lifecycle; **expected-commit CAS checks**, `--force-with-lease`, `--end-of-options`, hooks disabled, env scrubbed. Adopt branch-protection + CAS into Fabrica's drift guard. (`buzz-features.md:156`; `buzz-desktop.md:149`)
  - **What this means:** buzz tags branches with push rules (allowed / needs approval / no force-push), signs PRs, and uses commit-expectation checks plus safe push flags. We could fold branch-protection and commit-expectation checks into Fabrica's drift guard.

- **[MC]** (none found — MC uses per-agent git worktrees but no explicit drift guard).
  - **What this means:** Mission Control gives each agent a git worktree but has no explicit drift guard, so there's nothing MC-specific to copy here.

- **Idea (converge):** keep Fabrica's behind-count refusal; add buzz `require-approval` branch tags + expected-commit CAS + force-with-lease.
  - **What this means:** Keep Fabrica's "refuse if too far behind" rule, and add buzz's approval-tagged branches and commit-expectation/safe-force-push checks for stronger git safety.

### 9. Preamble system (operational prompt + persona / system prompt)

- **[Fabrica]** `preamble.ts` builds an **operational-only harness brief**: Header ("You are a dispatched worker…") → `CLI COMMANDS` (`send --type worker_done` exactly once w/ 3-sentence summary + files-modified; `heartbeat` every 5min w/ phase; `ask` for durable questions — **NEVER `AskUserQuestion`**; escalation; `check --terminal`) → after-worker_done by `workerKind` → `BASE DRIFT` → `TASK` block + resolved-gate. It is **not** a model `system` prompt. (`orchestration-system.md §6`)
  - **What this means:** Fabrica's preamble tells a worker *how to operate* (report done once, heartbeat every 5 min, ask durable questions, escalate, check messages) and shows drift/gate context. Crucially it is operating instructions, not the agent's identity — and Fabrica currently sets no "who you are" system prompt.

- **[Fabrica]** GAP: Fabrica today sets **no model-level system prompt** per agent. (`orchestration-system.md §6`)
  - **What this means:** Today every Fabrica agent gets the same operational brief but no tailored personality/behavior prompt. This is the key gap Intent B aims to fill by adopting MC/buzz persona models.

- **[MC]** `buildAgentPersona` = `"You are acting as <name> — <description>"` + `## Your Instructions` + `## Your Capabilities` + `## Your Skills` (true agent identity/behavior). (`prompt-builder.ts:83`)
  - **What this means:** Mission Control builds a real persona prompt ("You are acting as X") with instructions, capabilities, and skills — giving each agent a distinct identity and behavior. This is exactly the system-prompt layer Fabrica lacks.

- **[MC]** `buildTaskPrompt` composes persona + linked skills + **fenced task data** (`<task-context>…</task-context>` w/ closing-tag escaping) + SOP + Field-Ops context + retry context, then `enforcePromptLimit`. Injection defense: `fenceTaskData` / `escapeFenceContent` / `enforcePromptLimit` / `scrubCredentials`. Adopt as the missing system-prompt layer. (`prompt-builder.ts:471,119-162,497-499`; `mc-ai-providers.md:76,209`)
  - **What this means:** Mission Control wraps task data in fenced, escaped blocks, adds a standard-operating-procedure and retry context, and scrubs credentials — defending against prompt injection. We could adopt this as Fabrica's missing system-prompt layer with the same safety escapes.

- **[MC]** SOP forbids bookkeeping writes ("Do NOT change kanban status…"); personas are **data** (instructions+capabilities+skills) with auto-generated CLI integration files. (`prompt-builder.ts:177-185`; `mission-control-discovery.md:293,346,363-364`)
  - **What this means:** Mission Control's SOP tells agents not to do bookkeeping (e.g., don't change board status), and treats personas as data with auto-generated integration files. A clean pattern for Fabrica to copy.

- **[buzz]** `.persona.md` = YAML frontmatter + markdown system prompt, **publishable as Nostr `kind:30175`**; personas `30175`, teams `30176`, managed-agent `30177`. Adopt publishable, portable personas. (`buzz-discovery.md:229,305`; `buzz-features.md:13,14,31`)
  - **What this means:** buzz stores a persona as a portable markdown+YAML file that can be published to a network, with separate kinds for personas, teams, and managed agents. We could make Fabrica personas publishable and portable like this.

- **[buzz]** `framed_system_prompt` sections: workspace / team / huddle / canvas. Adopt structured system-prompt framing. (`buzz-agent-crates.md:39`)
  - **What this means:** buzz structures a system prompt into workspace/team/huddle/canvas sections. We could use the same structured framing so Fabrica's agent brief is well-organized.

- **Idea (Intent B — converge):** Fabrica preamble (operational) + MC persona builder (system prompt) + buzz `.persona.md` publishable personas. Port `fence`/`escape`/`limit`/`scrub` into `preamble.ts`.
  - **What this means:** The plan (Intent B): keep Fabrica's operational preamble, add Mission Control's persona builder as the system-prompt layer, and adopt buzz's publishable personas — porting the fence/escape/limit/scrub safety into `preamble.ts`. This gives agents identity + safe task data.

### 10. RPC surface

- **[Fabrica]** ~35 orchestration RPC methods; envelope `{id, authToken, method, params?, orchestrationCapability?, orchestrationContractVersion?, orchestrationRequestId?}`; **contract fence** → `orchestration_migration_required` (zero effects) on missing/mismatched version; capabilities negotiated at auth (never request-asserted); durable mutations idempotent per `(callerFingerprint, orchestrationRequestId)` w/ canonicalized-payload SHA-256; transports Unix socket / LAN WS(S) / cloud relay (desktop dials OUT) / MobileSocketWiring (E2EE + revocation). (`orchestration-system.md §7`; `fabrica-app-discovery.md:257,262`)
  - **What this means:** Fabrica exposes ~35 remote commands, each carrying auth + contract version; a version mismatch is rejected with zero effect, actions are de-duplicated, and connections run over local socket, LAN, outbound cloud relay, or encrypted mobile link. This is the safe remote-control surface.

- **[Fabrica]** `runtime-rpc.ts` is the declared single security boundary; ~120 method modules under `rpc/methods/`. (`fabrica-app-discovery.md:75,182`)
  - **What this means:** `runtime-rpc.ts` is the one official security boundary, with about 120 method modules behind it — the front door for all internal/external calls.

- **[MC]** REST JSON APIs with **owner-guard** (`actor!=="me"` rejected) + Zod validation. Adopt owner-guard on Fabrica orchestration mutations. (`mission-control-discovery.md:266`; `mc-workflow-engine.md`)
  - **What this means:** Mission Control rejects any API call whose actor isn't the owner and validates inputs. We could add the same owner-guard to Fabrica's orchestration mutations so only the right owner can act.

- **[buzz]** ACP JSON-RPC 2.0 bridge: `MAX_LINE_SIZE=10MB` bound (OOM guard), monotonic id, **pending-permission double-response guard**. Adopt line-size bound + double-response protection. (`buzz-agent-crates.md:43`)
  - **What this means:** buzz bounds message size (to avoid out-of-memory) and guards against a permission request getting two responses. We could add the same size bound and double-response protection to Fabrica's RPC.

- **[buzz]** HTTP-bridge **rate-limit gate** `DEFAULT_RATE_LIMIT_SECONDS=10`, max 300s, mirrored in Rust `relay_admission.rs`. Adopt RPC rate limiting. (`buzz-desktop.md:319`)
  - **What this means:** buzz rate-limits its HTTP bridge (default 10s, up to 300s). We could add rate limiting to Fabrica's RPC so it can't be overwhelmed.

- **Idea (converge):** keep Fabrica's contract-fence + idempotency; port buzz line-size bound + double-response guard + rate-limit gate, and MC owner-guard.
  - **What this means:** Keep Fabrica's version fence and de-dup, and add buzz's size/double-response/rate-limit guards plus Mission Control's owner-guard — tightening the security boundary.

### 11. Integration points (skills, hooks, plugins, IPC, agent-hooks, terminals)

- **[Fabrica]** Wired at `index.ts:2486`; IPC handlers `ipc/runtime.ts`, `ipc/pty.ts`, `ipc/worktrees.ts`, `ipc/ssh.ts`; `FABRICARuntimeRpcServer`; plugin host narrowed facade (`resolveActiveWorktreeContext`, `listTerminals` capped, `sendTerminal`, `dispatchPluginNotification`); PTY plane (bidirectional, provider-injected); agent-hooks `onTerminalAgentStatus`; SSH relay; window/renderer `syncWindowGraph`; daemon headless. (`orchestration-system.md §8`)
  - **What this means:** The orchestration engine is wired into app startup, the messaging handlers, the RPC server, a narrowly-scoped plugin host, the terminal layer, agent-status hooks, SSH, the UI, and headless mode — the full set of integration points Fabrica already has.

- **[Fabrica]** **15+ agent-hook services** (claude/codex/gemini/grok/opencode/hermes/copilot/devin/kimi/cursor/amp/openclaude/mimo/antigravity/droid). (`Fabrica-features.md §8.5`)
  - **What this means:** Fabrica already supports 15+ AI agent tools through its hook service — a wide roster of agents it can dispatch today.

- **[Fabrica]** Plugin system: `PluginService` / `Supervisor` / `Discovery` / `HostRuntime` / `WorkerController` / `MarketplaceService` / `AuditLog` / `KillListService` / `ContentSafety`. (`Fabrica-features.md §8.6`; `fa-plugin-runtime.md`)
  - **What this means:** Fabrica's plugin system already has a full set of services (supervisor, discovery, marketplace, audit log, kill list, content safety) — the extensibility backbone to preserve.

- **[Fabrica]** Skills page + freshness nudge; 8 bundled skills (`skills/`). (`Fabrica-features.md §4.2`; `fabrica-app-discovery.md:50,176`)
  - **What this means:** Fabrica ships a skills page with a freshness reminder and 8 built-in skills — a starting point for agent capabilities.

- **[Fabrica]** `grantManagedCodexHookTrust(plan)`: never throws; returns `{lane:'rpc', entries}` or fallback; env kill-switch → fallback; ledger hit → skip RPC; 5-min per-host cooldown; restores exact pre-session bytes on failure. Keep as the safe hook-trust pattern. (`orchestration-system.md §8`; `fabrica-app-main-subsystems.md:89`)
  - **What this means:** Before trusting an agent's hook, Fabrica grants trust safely (never errors, falls back, cools down per host, restores state on failure). This is the safe pattern to keep.

- **[MC]** Auto-generated `skills/<id>/SKILL.md` on save; `sync-commands.ts` regenerates `.claude/commands/<agent>/user.md` (persona+instructions+skills+SOP). Adopt auto-generated agent/skill files. (`mc-features.md:114`; `mission-control-discovery.md:293`)
  - **What this means:** Mission Control auto-generates a skill file and a per-agent commands file (persona+instructions+skills+SOP) on save. We could auto-generate Fabrica's agent/skill files the same way.

- **[MC]** **Adapter pattern**: `validate → execute → healthCheck → optional dry-run`; MCP packages as scale-out mechanism. Adopt for Fabrica plugin external actions (managed, auditable, dry-run-able). (`mc-adapters-linelevel.md:188,181`)
  - **What this means:** Mission Control runs external actions through validate → execute → health-check → optional dry-run, and uses MCP packages to scale out. We could use the same adapter pattern for Fabrica plugin actions so they're managed, auditable, and dry-runnable.

- **[buzz]** ACP harness bridges relay→agent via JSON-RPC with a **1–32 agent subprocess pool** + crash recovery; MCP servers run under `env_clear()` + explicit **PASSTHROUGH_ENV allowlist** (core + SSH + TLS + Buzz identity vars only). Adopt agent-subprocess pool + MCP sandbox allowlist. (`buzz-agent-crates.md:17,84`)
  - **What this means:** buzz runs 1–32 agent subprocesses with crash recovery and runs MCP servers in a cleaned environment with only an explicit allowlist of variables. We could adopt the subprocess pool and MCP sandbox allowlist for safer integration.

- **[buzz]** Agent hooks over SSH relay; `AGENTS.md` template (`NEST_AGENTS_VERSION=4`); skill `.agents/skills/buzz-cli/SKILL.md` with per-harness symlinks. Adopt versioned agent-template + skill symlinks. (`buzz-desktop.md:82`)
  - **What this means:** buzz uses a versioned `AGENTS.md` template and per-harness skill symlinks. We could adopt versioned agent templates and skill symlinks so setup is consistent across harnesses.

- **Idea (converge):** keep Fabrica's IPC + plugin + hook + terminal integration; port MC adapter validate/dry-run + buzz MCP sandbox allowlist + ACP pool.
  - **What this means:** Keep Fabrica's integration wiring, and add Mission Control's validate/dry-run adapters plus buzz's MCP sandbox allowlist and agent subprocess pool — safer, more auditable external actions.

### 12. Reference designs (MC + buzz)

**Mission Control (file-JSON, single-environment, autonomy-heavy):**
- JSON-as-IPC shared-file source of truth between humans/UI/agents. (`mission-control-discovery.md:23,363`)
  - **What this means:** Mission Control uses one local JSON file as the shared record between you, the UI, and agents — simple but single-environment.
- 4 run engines; decisions.json hard-block w/ 6 enforcement points + retry-prompt injection; loop-escalation→decision. (`mc-workflow-engine.md`, `mc-decision-gates.md`)
  - **What this means:** MC's four run styles, its decisions file that blocks at 6 points and injects retry instructions, and its loop-escalation-to-decision are the patterns worth borrowing.
- Field-ops 8-state FSM + "iron claw" risk-tiered approval + spend limits + circuit breaker (3 consecutive failures → pause). (`mc-workflow-engine.md §4e/§5a`; `mc-execute-guards.md`)
  - **What this means:** MC's field-ops state machine, risk-tiered "iron claw" approval, spend limits, and circuit breaker (pause after 3 failures) are safety patterns to adopt.
- `prompt-builder` persona + fenced task data + SOP + `scrubCredentials` (injection defense). (`prompt-builder.ts`)
  - **What this means:** MC's prompt builder with persona, fenced task data, SOP, and credential scrubbing is the injection-defense model for Fabrica's missing system-prompt layer.
- Adapters `validate→execute→healthCheck→dry-run`; owner-guard; auto-generated skill/persona files. (`mc-adapters-linelevel.md`, `mc-features.md:114`)
  - **What this means:** MC's adapter pattern, owner-guard, and auto-generated skill/persona files are reusable ideas for Fabrica's integrations and agent setup.

**buzz (relay-native, multi-tenant, identity-first):**
- Relay = single source of truth; **secp256k1 agent identity + NIP-05**; community-as-tenant. (`buzz-features.md:12,205`)
  - **What this means:** buzz treats a relay as the one true record, identifies agents with a cryptographic key + handle, and organizes by community — a decentralized, identity-first model to learn from.
- Publishable personas `kind:30175`, teams `30176`, managed-agent `30177`; `.persona.md` system prompts. (`buzz-discovery.md:229,305`)
  - **What this means:** buzz's portable, publishable personas/teams/managed-agent records and `.persona.md` prompts are the portable-identity model Fabrica could adopt.
- ACP harness: JSON-RPC bridge, **1–32 pool w/ crash recovery**, `MAX_LINE_SIZE` bound, MCP `PASSTHROUGH_ENV` allowlist. (`buzz-agent-crates.md`)
  - **What this means:** buzz's agent subprocess pool with crash recovery, size bound, and MCP env allowlist are the safe-harness patterns to port.
- Agent lifecycle `spawn/start/stop/restart/reconcile` + **orphan sweeps**; `request_approval` suspend w/ UUID token + grant/deny; owner-signed lifecycle events. (`buzz-features.md:24,66`; `buzz-desktop.md:74-75`)
  - **What this means:** buzz's full agent lifecycle with orphan sweeps, token-based approval suspension, and owner-signed events are the resilience + structured-approval patterns to adopt.
- Auth: NIP-42 (`kind:22242`) + NIP-43 membership + NIP-OA `auth_tag`; `push_leases` claim queues; inter-relay mesh. (`buzz-agent-crates.md:19`; `bz-db-schema.md:137`; `bz-ops-deploy-admin.md:mesh_boot.rs`)
  - **What this means:** buzz's layered auth (connection + membership + owner attestation), lease-based push queues, and relay mesh are the federation-trust patterns to port onto Fabrica's peer-fingerprint.

**Fabrica (already has — baseline to preserve):**
- run/task/worker lifecycle, `preamble.ts`, `coordinator.ts`, `lifecycle-reconciliation.ts`, decision gates, `federation-sync.ts`, drift guard (`repo.ts`), RPC surface (`runtime-rpc.ts`), plugin/hook/skill/terminal integration, 15+ agent-hook services. (`orchestration-system.md`; `Fabrica-features.md`)
  - **What this means:** This is the solid baseline Fabrica already has and must keep — the lifecycle, preamble, coordinator, settlement, gates, federation, drift guard, RPC, and plugin/hook/skill integration are all real and working.

**Convergent recommendation (3-tier vision: Meta-Orch → Orchestrator → Worker):**
1. Add the **system-prompt layer** Fabrica lacks — MC `buildAgentPersona` + buzz publishable `.persona.md` (Intent B).
   - **What this means:** Give each Fabrica agent a real identity/behavior prompt (persona) by adopting MC's builder and buzz's portable personas — closing the biggest gap.
2. Keep Fabrica's **authority + rejection + contiguity + contract-fence** models (best-in-class).
   - **What this means:** Fabrica's trust, rejection, ordered-federation, and version-fence models are already best-in-class — keep them as the security foundation.
3. Port **buzz signed-event + community-tenant + mesh federation** and **NIP-OA ownership** onto Fabrica's peer-fingerprint.
   - **What this means:** Make cross-environment federation more robust by adopting buzz's signed events, community tenancy, relay mesh, and ownership attestation on top of Fabrica's fingerprint trust.
4. Port **MC adapter validate/dry-run + risk-tiered approval** and **buzz MCP sandbox allowlist + ACP pool** into Fabrica's integration points.
   - **What this means:** Make external actions and agent harnesses safer/auditable by adopting MC's validate/dry-run adapters and risk approval plus buzz's MCP sandbox and subprocess pool.
5. Port **MC priority sort + durable retry budget + centralized dispatch predicate** and **buzz orphan-reaping + emit-before-settle** into the coordinator/settlement.
   - **What this means:** Make the coordinator smarter and more resilient by adding MC's priority sorting, restart-safe retries, and single dispatch predicate, plus buzz's orphan cleanup and pre-settle usage emission.

---

## Scan coverage

**Read in full / verified:** `orchestration-system.md`, `fabrica-app-discovery.md`, `Fabrica-features.md`, `mc-features.md`, `buzz-features.md`, `mission-control-discovery.md`, `buzz-discovery.md`, `mc-decision-gates.md`, `mc-workflow-engine.md`, `mc-execute-guards.md`, `mc-chainedispatch-reconciler.md`, `mc-fieldtask-kanban.md`, `mc-adapters-linelevel.md`, `mc-ai-providers.md`, `mc-frontend-buzz-clients.md`, `buzz-agent-crates.md`, `buzz-desktop.md`, `bz-relay-event-kinds.md`, `bz-db-schema.md`, `bz-ops-deploy-admin.md`, `bz-search-pubsub.md`, `bz-voice-media.md`, `bz-pair-relay-cli.md`, `fa-agent-hooks-probes.md`, `fa-plugin-runtime.md`, `analysis/production-architecture.md`, `analysis/r5-agent-platform-integration-map.md`, `analysis/r5-convergence-memo.md`, `analysis/similarities-gaps.md`, `analysis/round4-findings-digest.md`.

**Skipped (cited via section/grep only):** remaining `mission-control/*.md` not opened, remaining `buzz/*.md` deep internals, remaining `fabrica-app/*.md`, `analysis/atlas-*.md`, `cross-project-notes-*.md`, `digest-v2-refresh.md`. All secondary to the 12 sub-systems.

**No source files modified** (`_sources/`, `../Fabrica-app/`) — read-only pass.

---

---

## 2. Project / Workspace model (→ `workspace-system.md`)

**Sub-systems:** Projects (sidebar) · Project Groups · Folder-Workspace · Worktrees · Kanban

- **[Fabrica]** Sidebar tree `repos → project groups → worktrees/workspaces` with filters (sleeping, default-branch, automation-generated, CLI-created, detached-head); sort/group. — `fabrica-app-discovery.md:140`
  - **What this means:** The left sidebar shows repositories, groups, and working copies with filters and sorting — the basic project navigation Fabrica already has and must keep.
- **[Fabrica]** `project-groups/` nested-repo discovery/import; ~20 `WorktreeCard*` components; `WorkspaceKanbanDrawer`. — `Fabrica-features.md`
  - **What this means:** Fabrica auto-discovers nested repos, shows each working copy as a rich card, and offers a kanban drawer — the workspace UI baseline to preserve.
- **[MC]** `projects.json` groups tasks/goals/milestones — pure JSON state, no git/repo binding. — `mc-features.md`
  - **What this means:** Mission Control represents a project as a simple JSON planning object (tasks/goals/milestones) with no real repo attached. A lighter, planning-only model we could blend in.
- **[buzz]** Nostr `kind:30621` project (multi-repo grouping, NIP-MP), `kind:30617` repo announcement, branches-as-channels, NIP-OA owner attestation. — `buzz-discovery.md:94,122`
  - **What this means:** buzz projects group multiple repos on a decentralized network, treat branches as channels, and prove ownership cryptographically. A more open, identity-scoped way to organize code.
- **[Idea]** Converge: keep Fabrica's nested-repo discovery; adopt buzz's identity-scoped, git/relay-native project model so projects carry owner attestation.
  - **What this means:** Keep Fabrica's auto repo discovery, but let projects carry a verifiable owner identity (like buzz) so sharing/organizing across environments is trustworthy.

## 3. Tasks panel (GitHub/Jira) + Task Sources (→ `tasks-system.md`)

**Sub-systems:** Tasks page · Issue workspaces (Jira/Linear/GitHub/GitLab) · GitHub Projects V2 board · Task Sources · hosted-review

- **[Fabrica]** `task page`; per-provider issue workspaces (Jira/Linear/GitHub/GitLab); GitHub Projects V2 board (29 components); deep Linear (~2,200 LOC) / Jira (~470 LOC); client roster of 7 providers; `gh` 28 IPC channels; task-source ingestion from onboarding/mobile. — `Fabrica-features.md`, `fa-runtime-structured-read.md`
  - **What this means:** Fabrica already shows tasks from Jira/Linear/GitHub/GitLab in tailored workspaces, renders GitHub Projects V2 boards, connects 7 providers, and can pull task sources during setup/mobile — the bridge to external trackers to keep.
- **[MC]** Status Board Kanban (Not Started/In Progress/Done), Task Card w/ subtasks + `blockedBy[]`, Ventures/Goals/Brain-Dump triage. — `mc-features.md`
  - **What this means:** Mission Control's board has three columns, cards with subtasks and blockedBy, and Ventures/Goals/Brain-Dump triage — a planning model to port into Fabrica's board.
- **[Idea]** Converge: port MC's Kanban + `blockedBy` dependency model and Ventures/Goals linking into Fabrica's board.
  - **What this means:** Add Mission Control's simple kanban, dependency links, and goal/venture grouping on top of Fabrica's existing tracker integrations.

## 4. Agent Dashboard + map (→ `agent-dashboard-system.md`)

**Sub-systems:** Agent board · Map canvas · Agent status (hook push) · Detected agents

- **[Fabrica]** `dashboard-popout` agent board/map canvas; 49+92 components; live hook status push to main + popout; snapshot IPC; store slices `agent-status`/`detected-agents`/`runtime-detected-agents`. — `fabrica-app-discovery.md`, `fa-agent-hooks-probes.md`
  - **What this means:** Fabrica already has a live agent board and map pop-out fed by hook status, with snapshot replay and saved state — the monitoring surface to preserve.
- **[MC]** Command Center Dashboard crew-status 5-state pills (idle/on-track/dependencies/awaiting-decision/overloaded); Crew/Team workload pages. — `mc-features.md`
  - **What this means:** Mission Control shows each agent as a colored pill in one of five states plus crew/team workload pages — a clear health view to adopt.
- **[buzz]** Agent "card minting" (`MintedAgentCard`); `AgentPool` fixed slots + per-agent status. — `buzz-desktop.md`, `buzz-agent-crates.md`
  - **What this means:** buzz gives each agent a visual "minted" card and a fixed pool of slots with status — a tangible identity model to bring into the map.
- **[Idea]** Converge: adopt MC 5-state workload pills + buzz card-mint/agent-pool visualization into the map canvas.
  - **What this means:** Enrich Fabrica's map with Mission Control's five-state health pills and buzz's card-mint/agent-pool visuals so agent health is obvious at a glance.

## 5. Search bar (→ `search-system.md`)

**Sub-systems:** Command palette (Cmd+J) · Code/text search · Quick Open · Right-sidebar search · AI Vault index

- **[Fabrica]** Worktree Jump Palette (Cmd+J) merges 7 result families; bespoke fuzzy (no lib); stateless `rg --json` search (no persistent index); caps 1200/15s; Quick Open via `rg --files`; right-sidebar search UI; AI Vault parse cache. — `fa-command-palette-search.md`, `fa-search-indexing.md`
  - **What this means:** Fabrica's Cmd+J palette blends 7 result types with custom fuzzy matching and on-demand file search (no standing index), with result caps and a quick-open file finder — the search baseline to keep.
- **[MC]** Ctrl+K global search dialog across tasks/projects/goals. — `mc-features.md`
  - **What this means:** Mission Control's Ctrl+K searches tasks/projects/goals at once — a comparable global palette pattern to align with.
- **[buzz]** NIP-50 / Postgres FTS (tsvector + GIN, community-scoped). — `buzz-features.md`
  - **What this means:** buzz uses a database full-text index (community-scoped, privacy-aware) — a more powerful indexed search we could borrow for relay content.
- **[Idea]** Converge: add a persistent index + semantic/LLM search; port buzz FTS for relay content.
  - **What this means:** Add a standing search index and optional AI/meaning-based search on top of Fabrica's current text matching, and use buzz's full-text approach for relay content.

## 6. Integrations (→ `integrations-system.md`)

**Sub-systems:** Integrations pane · Provider clients · Credential vault · Forge-provider abstraction

- **[Fabrica]** `IntegrationsPane`; 7 providers (GitHub/GitLab/Jira/Linear/Azure/Bitbucket/Gitea); `linear` SDK + keychain; `jira` REST ADF; `gh` 28 channels; `source-control/` forge-provider hosted-review. — `Fabrica-features.md`, `fa-ipc-watchers.md`
  - **What this means:** Fabrica already has an integrations pane, connects 7 providers with keychain-stored tokens, and uses a unified forge layer for reviews — the connection/credential layer to preserve.
- **[MC]** Service Catalog (64 services, 16 categories), AES-256-GCM credential vault, adapter layer for provider sync. — `mc-service-catalog.md`, `mc-adapters-linelevel.md`
  - **What this means:** Mission Control lists 64 services, stores credentials in a strongly encrypted vault, and uses adapters to sync providers — a cleaner, more secure connector model to adopt.
- **[Idea]** Converge: port MC adapter pattern + encrypted vault; de-sprawl connectors behind a uniform provider interface.
  - **What this means:** Hide Fabrica's many separate connectors behind one uniform interface with Mission Control's adapter pattern and encrypted vault, reducing sprawl and improving security.

## 7. Automations (→ `automations-system.md`)

**Sub-systems:** Automations page · External managers · Cron/schedule · Headless dispatch

- **[Fabrica]** `automations` activeView; module = scheduled/triggered dispatch + headless + snapshot buffers; editor dialogs; `HermesCronOutputView`; runtime `listAutomations`/`runAutomationNow`. — `Fabrica-features.md`, `fabrica-app-discovery.md`
  - **What this means:** Fabrica already lets you define scheduled/triggered agent automations that run headless and capture output, with an editor and run-now — the scheduling layer to keep.
- **[MC]** Workflow Engine: 4 run engines + `node-cron` scheduler, `decisions.json` approval gates, `maxParallelAgents`. — `mc-workflow-engine.md`
  - **What this means:** Mission Control's engine has multiple run styles, a cron scheduler, approval gates, and a concurrency cap — a mature scheduling model to learn from.
- **[buzz]** YAML-as-Code Workflow: 4 triggers/7 actions, `evalexpr` conditions (100ms), UUID-token approvals, signed step traces. — `buzz-features.md`
  - **What this means:** buzz lets you write automations as YAML with triggers/actions, fast conditions, and token approvals with signed traces — a "workflow as code" pattern to port.
- **[Idea]** Converge: port MC scheduling + buzz YAML workflows + approval tokens into Fabrica automations.
  - **What this means:** Combine Mission Control's scheduling and buzz's YAML workflows + approval tokens into Fabrica's automation editor for more powerful, reviewable automations.

## 8. Stats & Usage (→ `stats-usage-system.md`)

**Sub-systems:** Usage charts · Rate-limit service · Usage record contract

- **[Fabrica]** Status-bar usage bars; 27 per-provider charts; `RateLimitService` polling 7 providers; provider-agnostic usage record contract (plugin-contributable). — `Fabrica-features.md`, `fa-ipc-watchers.md`
  - **What this means:** Fabrica already shows per-provider usage bars and charts, polls 7 providers' rate limits, and records usage in a plugin-contributable format — the metering/guardrail layer to keep.
- **[buzz]** Agent Turn Metrics `kind:44200` durable per-turn token usage; storage sweep; owner-scoped encrypted telemetry. — `buzz-features.md`
  - **What this means:** buzz records token usage per agent turn durably and scopes encrypted telemetry to the owner — a per-turn accounting model to add.
- **[Idea]** Converge: add buzz per-turn metric durability + owner-scoped telemetry export to Fabrica's usage contract.
  - **What this means:** Make Fabrica's usage records durable per turn and exportable as owner-scoped telemetry, matching buzz's finer-grained metering.

## 9. Plugins (→ `plugins-system.md`)

**Sub-systems:** Plugin runtime/worker · Marketplace · Kill list · Trust model · Panel bridge

- **[Fabrica]** Out-of-process `child_process.fork` workers (zod protocol, timeouts, slot pool 5, `maxRestarts=3`); CSP panel bridge + admission budgets; `fabrica-marketplace.json` provenance; kill-list chokepoint; trust model official-only; audit log; dev watcher. — `fa-plugin-runtime.md`, `Fabrica-features.md`
  - **What this means:** Fabrica's plugins run in separate sandboxed processes with timeouts, a marketplace with provenance checks, a kill list, an official-only trust model, and an audit log — the extensibility + trust layer to preserve (already best-in-class).
- **[MC]** (none — Skills Page only.) **[buzz]** (none — agent crates only.)
  - **What this means:** Neither MC (skills page only) nor buzz (agent crates only) has a plugin marketplace, so there's no external marketplace design to copy — Fabrica's is the baseline.
- **[Idea]** Keep Fabrica's model as best-in-class; optionally port MC skills-as-artifacts + buzz agent-crate distribution into the marketplace.
  - **What this means:** Keep Fabrica's plugin model as the standard, and optionally borrow MC's skills-as-artifacts and buzz's agent-crate distribution to enrich the marketplace.

---

## Promotion Log (validated → corresponding `*-system.md`)

| Date | Item | What moved to |
|---|---|---|
| — | — | (empty — nothing validated yet) |

---

_Last updated: 2026-08-28_
