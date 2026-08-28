# Orchestration — Ideas by Sub-System

> **Scratch space.** Lists the orchestration **sub-system titles** (mirroring the index in `orchestration-system.md`). Under each, ideas/features pulled from the discovery + analysis files: `[Fabrica]` = what already exists (baseline to preserve), `[MC]`/`[buzz]` = adoptable reference designs. Nothing here is validated.
> When an idea is **validated**, move it into `orchestration-system.md` and log it in §Promotion Log.

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
- **[Fabrica]** `RunRow` durable schema: `id, objective, home_database, coordinator_handle, coordinator_pane_key, consumer_generation, legacy`. (`fabrica-app-discovery.md:233`)
- **[Fabrica]** Coordinator ends a run when all tasks are `completed|failed`; logs `"Stuck"` if no active tasks but some `blocked`. (`coordinator.ts:541` per `orchestration-system.md §5.3`)
- **[MC]** Four distinct run engines layered on one shared JSON store (single-task run, daemon poll, mission/project chain-dispatch, field-ops 8-state FSM); workflows are *implicit* (cron `blockedBy`, `decisions.json`) — no generic DSL. Adopt: Fabrica could formalize multiple **run "kinds"** (mission / venture) instead of one generic run. (`mc-workflow-engine.md:11-18`)
- **[MC]** Single-flight guard: HTTP 409 if a mission for the project is already `running`. Adopt as a run-create duplicate guard *beyond* pane-unbind. (`mc-workflow-engine.md:90`, `projects/[id]/run/route.ts:83-93`)
- **[MC]** Loop detection per task: `attempts>=3` → auto-creates a decision (human gate) with options Retry-different / Skip / Stop-mission. Adopt escalation→decision for Fabrica runs. (`mc-chainedispatch-reconciler.md:87`, `RUNTASK:505-538`)
- **[buzz]** Workflow runs carry `run_status` (pending/running/…), `execution_trace JSONB`, `error_code`, and **resume** via `start_index` + `initial_outputs` (approval-resume replays). Adopt resumable, trace-bearing runs. (`bz-db-schema.md:90`; `buzz-workflow/executor.rs:1055`)
- **(none found)** for a buzz-native `run-create` RPC — buzz models runs as workflow-execution rows, not a CLI run-create.

### 2. Task (task-create)

- **[Fabrica]** `task-create` validates same-run `parentId`/`deps` → `pending` if deps unmet else `ready`; `TaskRow.status` DAG via `parent`/`deps(JSON)`. (`fabrica-app-discovery.md:237,233`)
- **[Fabrica]** `deps` are enforced (contrast MC gap below). Keep. (`orchestration-system.md §5.2`)
- **[MC]** `blockedBy` dependency lists exist but are **NOT enforced** by the field-ops run gate (only regular tasks check them). Adopt: enforce `blockedBy` on *all* task kinds (fix the MC gap). (`mc-fieldtask-kanban.md:198,254`)
- **[MC]** Eisenhower priority + kanban status + agent lead; priority sort used by the *non-mission* daemon poll only. Adopt a **priority queue** into Fabrica's coordinator (today it orders by DAG only — `mc-chainedispatch-reconciler.md:89`). (`mc-fieldtask-kanban.md`; `mc-workflow-engine.md:104`)
- **[MC]** Typed task payloads with `{{variable}}` templates. Adopt typed/templated task specs. (`mission-control-discovery.md:352`)
- **[MC]** Risk-tiered approval `requiresApproval(type, serviceRisk, autonomyMode)` computed **server-side** (never trust client); "iron claw" = high-risk always needs approval. Adopt task-level approval gating for high-risk agent actions. (`mc-workflow-engine.md:128-136`)
- **[buzz]** Workflow steps run sequentially with optional `if:` conditions, **per-step `timeout_secs`**, and structured `StepTimeout` errors. Adopt step-level timeouts. (`buzz-workflow/executor.rs:1120-1250`)
- **[buzz]** Git branch protections (`push-allowed` / `require-approval` / `no-force-push` via `buzz-protect` tags) make some tasks approval-gated at the git layer. Adopt approval-gated tasks for git ops. (`buzz-features.md:156`)

### 3. Coordinator (auto-dispatch)

- **[Fabrica]** `coordinator` tick (default 2000ms): `MAX_CONCURRENT_DEFAULT=4`, `HUNG_THRESHOLD_MS=10min`, `DISPATCH_STALE_THRESHOLD=20` commits; `tick()` = processMessages→escalations→decisionGates→staleWarn→dispatchReadyTasks→convergence. (`coordinator.ts:106-115`; `orchestration-system.md §5.3`)
- **[Fabrica]** `decompose()` **NOT implemented** — tasks must be pre-created via `taskCreate`; coordinator runs on an existing DAG only. (`coordinator.ts:196`)
- **[Fabrica]** At most **one terminal spawned per tick**; reused if a writable+connected terminal exists. (`coordinator.ts:373`)
- **[Fabrica]** Drift probe once per tick vs tracking remote; refuses dispatch if `behind>20` unless `allow-stale-base:true` (silent return, never burns circuit-breaker). (`coordinator.ts:387,425`)
- **[MC]** Daemon poll dispatcher: Eisenhower-sorted, health-monitored slots, **persistent retry queue** (exp backoff `retryDelay×2^(n-1)` capped 60min, survives restarts), due-retries processed first. Adopt priority sort + durable retry budget + due-retry priority. (`mc-workflow-engine.md:173-179`; `dispatcher.ts:95-215`)
- **[MC]** Anti-pattern to avoid: the *same dispatchability predicate* is reimplemented in 4 places (RUNTASK/MISSIONS-API/DISPATCHER/PROJECT-RUN). Adopt a **centralized** predicate (the chainedispatch report itself recommends this). (`mc-chainedispatch-reconciler.md:31,197`)
- **[MC]** Opt-in `fieldOps.autoExecute` with vault-session check + `maxConcurrentExecutions` cap. Adopt capability-gated auto-dispatch. (`mc-workflow-engine.md:179`)
- **[buzz]** No central coordinator — harnesses **self-claim** agents from a pool (`AgentPool.try_claim` affinity). Adopt worker-affinity dispatch (see §4). (`buzz-agent-crates.md:34`)
- **Idea (converge):** keep Fabrica's in-process coordinator; port MC's priority sort + durable retry budget + centralized predicate + capability gating.

### 4. Worker-start (explicit)

- **[Fabrica]** `worker-start`: mutation-receipt dedupe by `(callerFingerprint, requestId)`; retry requires prior `failed|stopped|abandoned`; inserts `dispatch_contexts(pending)` + `worker_dispatches(starting)`; setup completion via stdout marker `__FABRICA_SETUP_COMPLETE__:<token>:<exitCode>`. (`fabrica-app-discovery.md:238`; `orchestration-system.md §5.4`)
- **[Fabrica]** `WorkerDispatchRow` FSM: `starting→ready→succeeded|failed|stopping|stopped|start_unknown|stop_unknown|abandoned`. (`fabrica-app-discovery.md:233`)
- **[MC]** `run-task.ts` spawns a **detached Claude Code CLI child**; validation gate calls `process.exit(1)` *before any state is written*. Adopt pre-state-write validation gate. (`mc-workflow-engine.md:75`; `run-task.ts:789-834`)
- **[buzz]** `spawn()`: piped stdin/stdout, `kill_on_drop(true)`, Unix `process_group(0)` (SIGKILL can't hit harness group); env layering order (1 runtime defaults → 2 persona `extra_env` operator-wins → 3 CODEX_CONFIG deep-merge forcing `sandbox_workspace_write.network_access=true` LAST). Adopt subprocess sandboxing + env precedence. (`buzz-agent-crates.md:44`)
- **[buzz]** **Pre-spawn readiness gate**: `agent_readiness` computed from effective env; if `NotReady`, inject `BUZZ_ACP_SETUP_PAYLOAD` and start harness in minimal setup-listener mode. Adopt readiness gating before worker-start. (`buzz-desktop.md:67`)
- **[buzz]** `AgentPool.try_claim` = Pass 1 session-affinity (idle agent already has an ACP session for the channel), Pass 2 first idle slot. Adopt worker affinity / reuse. (`buzz-agent-crates.md:34`)
- **[buzz]** Crash recovery: `recover_panicked_agent` + `SlotCircuit` crash history + `spawn_respawn_task`. Adopt automatic worker respawn. (`buzz-agent-crates.md:60`)

### 5. worker_done settlement (lifecycle-reconciliation)

- **[Fabrica]** `lifecycle-reconciliation.ts`: `hasLifecycleAuthority` = sender `pane_key` must match assignee (leaf-id equivalence); **payload knowledge alone is NEVER authority**. 11 rejection codes (`sender_not_assignee`, `dispatch_capability_invalid`, `invalid_payload`, `missing_task_id`, `missing_dispatch_id`, `invalid_outcome`, `unknown_task`, `unknown_dispatch`, `task_dispatch_mismatch`, `inactive_dispatch`, `stale_dispatch`). (`lifecycle-reconciliation.ts:26`; `orchestration-system.md §5.5`)
- **[Fabrica]** `worker_done` contract = JSON `{taskId, dispatchId, outcome}`; `settleWorkerReport` does idempotency + staleness checks; idempotency guard `_FABRICALifecycleRejection` (caller-supplied markers can't fake success); post-settle `suppressEarlierHeartbeats`. (`orchestration-system.md §5.5`)
- **[Fabrica]** On success: atomic task+dispatch update, question cleanup, **dependency promotion**. (`fabrica-app-discovery.md:240`)
- **[MC]** `handleTaskCompletion` = 4 best-effort steps (idempotent mark-done, inbox report, activity event, regenerate `ai-context.md`). Adopt regen-context-on-complete (Fabrica already does dependency promotion). (`mc-workflow-engine.md:233`)
- **[buzz]** Usage/turn metric `kind:44200` is emitted **BEFORE** the prompt response so the upstream UsageTracker sees it in-flight. Adopt emit-before-settle ordering. (`buzz-agent-crates.md:88`)
- **[buzz]** Owner-signed lifecycle events (1630-1633) + **orphan sweeps** (`instance_reaper` reaps harnesses whose owning desktop died). Adopt orphan reaping for Fabrica `worker_terminal_resources`. (`buzz-desktop.md:74-75`)
- **Idea (converge):** keep Fabrica's authority + rejection model; port buzz orphan-reaping + emit-before-settle.

### 6. Decision gates

- **[Fabrica]** Created via `gateCreate` / `decision_gate` messages; **humans resolve via `gateResolve`**; coordinator never auto-resolves; resolved context injected as `--- DECISION GATE RESOLVED ---` into later preambles. (`orchestration-system.md §5.6`; `coordinator.ts:347,473`)
- **[Fabrica]** `DecisionGateRow` + `QuestionRow`; `gateCreate`/`gateResolve` RPC. (`fabrica-app-discovery.md:233,241`)
- **[MC]** File-based `decisions.json` hard-blocks a task at **six independent enforcement points** (manual run API, daemon dispatcher, run-task pre-exec, mission chain-dispatch, project-run launch, reconciler). Adopt multi-point enforcement. (`mc-decision-gates.md:12,86-117`)
- **[MC]** **Retry-prompt injection**: an answered decision is injected verbatim as "Retry Instructions" into the *next* prompt built for that task (permanent context until deleted). Adopt answered-gate → next-prompt injection (Fabrica does this for gates; MC does it for loop decisions). (`mc-decision-gates.md:173-175`; `prompt-builder.ts:497-499`)
- **[MC]** Loop-escalation auto-creates a decision at `attempts>=3` with a fixed option trio + error-history context. Adopt. (`mc-decision-gates.md:87`)
- **[buzz]** `request_approval` **action suspends a run with a UUID token**; resolved via `grant`/`deny` events. Adopt suspend-with-token + explicit grant/deny events (more structured than Fabrica's gateResolve). (`buzz-features.md:66,72`)
- **[buzz]** Workflow approvals suspend for human approval (resume replays from `start_index`). Adopt resumable approval suspension. (`buzz-features.md:66`; `buzz-workflow/executor.rs:1055`)
- **Idea (converge):** keep Fabrica's gateCreate/gateResolve; add MC's loop-decision injection + buzz's suspend-token grant/deny.

### 7. Federation sync (cross-environment)

- **[Fabrica]** `federation-sync.ts`: **peer-fingerprint guard** (`peer_changed` on mismatch), **contiguity** (`sequence===cursor+1` else `operation_unknown`), lifecycle mapping (`heartbeat`→recorded, `worker_done`→validated+stored), **ack lease** (`relay_ack_<dispatchId>_<cursor>`), reverse push, priority normalization. (`orchestration-system.md §5.7`)
- **[Fabrica]** `FederatedDispatchRow` / `RemoteDispatchAttachmentRow` / `FederationRelayItemRow`; `federationPull` / `Ack` / `Import`. (`fabrica-app-discovery.md:242,246`)
- **[buzz]** Relay is the **single source of truth**; dispatch/lifecycle are signed Nostr events; **community is the tenant**; inter-relay **mesh** (`mesh_boot.rs`). Adopt relay-as-truth + signed dispatch events + community-tenant federation. (`buzz-features.md`; `bz-ops-deploy-admin.md:mesh_boot.rs`)
- **[buzz]** Ownership attestation: NIP-42 auth (`kind:22242`), NIP-43 membership, NIP-OA `auth_tag` (verified owner attestation). Adopt ownership attestation for federation identity (Fabrica's peer-fingerprint is the analog — generalize it). (`buzz-agent-crates.md:19,58`; `buzz-desktop.md`)
- **[buzz]** `push_leases` table: `active` XOR CHECK, endpoint uniqueness partial index, claim queues with SKIP-LOCKED-style recovery. Adopt for federation ack-lease durability. (`bz-db-schema.md:137,350`)
- **[MC]** (none found — MC is single-environment JSON; no cross-environment federation).
- **Idea (converge):** keep Fabrica's contiguity + peer-fingerprint; port buzz signed-event + community-tenant + mesh + NIP-OA ownership.

### 8. Drift-guarded dispatch (git layer)

- **[Fabrica]** Pre-dispatch `getRemoteDrift` = `rev-list --left-right --count local...remote` (`repo.ts:540-562`); drift subjects injected into worker preamble (`log --format=%s -n limit local..remote`, `:568-587`); `>20` behind refuses unless `allow-stale-base:true`. (`orchestration-system.md §5.8`; `fa-git-integration.md:142,369`)
- **[Fabrica]** Coordinator drift probe once per tick, shared base snapshot, silent return on refusal. (`coordinator.ts:387,425`)
- **[buzz]** Git branch protections: `push-allowed` / `require-approval` / `no-force-push` via `buzz-protect` tags; PRs are signed Nostr events (not git signatures); authorization via relay push-policy keyed to Nostr identity + owner-signed lifecycle; **expected-commit CAS checks**, `--force-with-lease`, `--end-of-options`, hooks disabled, env scrubbed. Adopt branch-protection + CAS into Fabrica's drift guard. (`buzz-features.md:156`; `buzz-desktop.md:149`)
- **[MC]** (none found — MC uses per-agent git worktrees but no explicit drift guard).
- **Idea (converge):** keep Fabrica's behind-count refusal; add buzz `require-approval` branch tags + expected-commit CAS + force-with-lease.

### 9. Preamble system (operational prompt + persona / system prompt)

- **[Fabrica]** `preamble.ts` builds an **operational-only harness brief**: Header ("You are a dispatched worker…") → `CLI COMMANDS` (`send --type worker_done` exactly once w/ 3-sentence summary + files-modified; `heartbeat` every 5min w/ phase; `ask` for durable questions — **NEVER `AskUserQuestion`**; escalation; `check --terminal`) → after-worker_done by `workerKind` → `BASE DRIFT` → `TASK` block + resolved-gate. It is **not** a model `system` prompt. (`orchestration-system.md §6`)
- **[Fabrica]** GAP: Fabrica today sets **no model-level system prompt** per agent. (`orchestration-system.md §6`)
- **[MC]** `buildAgentPersona` = `"You are acting as <name> — <description>"` + `## Your Instructions` + `## Your Capabilities` + `## Your Skills` (true agent identity/behavior). (`prompt-builder.ts:83`)
- **[MC]** `buildTaskPrompt` composes persona + linked skills + **fenced task data** (`<task-context>…</task-context>` w/ closing-tag escaping) + SOP + Field-Ops context + retry context, then `enforcePromptLimit`. Injection defense: `fenceTaskData` / `escapeFenceContent` / `enforcePromptLimit` / `scrubCredentials`. Adopt as the missing system-prompt layer. (`prompt-builder.ts:471,119-162,497-499`; `mc-ai-providers.md:76,209`)
- **[MC]** SOP forbids bookkeeping writes ("Do NOT change kanban status…"); personas are **data** (instructions+capabilities+skills) with auto-generated CLI integration files. (`prompt-builder.ts:177-185`; `mission-control-discovery.md:293,346,363-364`)
- **[buzz]** `.persona.md` = YAML frontmatter + markdown system prompt, **publishable as Nostr `kind:30175`**; personas `30175`, teams `30176`, managed-agent `30177`. Adopt publishable, portable personas. (`buzz-discovery.md:229,305`; `buzz-features.md:13,14,31`)
- **[buzz]** `framed_system_prompt` sections: workspace / team / huddle / canvas. Adopt structured system-prompt framing. (`buzz-agent-crates.md:39`)
- **Idea (Intent B — converge):** Fabrica preamble (operational) + MC persona builder (system prompt) + buzz `.persona.md` publishable personas. Port `fence`/`escape`/`limit`/`scrub` into `preamble.ts`.

### 10. RPC surface

- **[Fabrica]** ~35 orchestration RPC methods; envelope `{id, authToken, method, params?, orchestrationCapability?, orchestrationContractVersion?, orchestrationRequestId?}`; **contract fence** → `orchestration_migration_required` (zero effects) on missing/mismatched version; capabilities negotiated at auth (never request-asserted); durable mutations idempotent per `(callerFingerprint, orchestrationRequestId)` w/ canonicalized-payload SHA-256; transports Unix socket / LAN WS(S) / cloud relay (desktop dials OUT) / MobileSocketWiring (E2EE + revocation). (`orchestration-system.md §7`; `fabrica-app-discovery.md:257,262`)
- **[Fabrica]** `runtime-rpc.ts` is the declared single security boundary; ~120 method modules under `rpc/methods/`. (`fabrica-app-discovery.md:75,182`)
- **[MC]** REST JSON APIs with **owner-guard** (`actor!=="me"` rejected) + Zod validation. Adopt owner-guard on Fabrica orchestration mutations. (`mission-control-discovery.md:266`; `mc-workflow-engine.md`)
- **[buzz]** ACP JSON-RPC 2.0 bridge: `MAX_LINE_SIZE=10MB` bound (OOM guard), monotonic id, **pending-permission double-response guard**. Adopt line-size bound + double-response protection. (`buzz-agent-crates.md:43`)
- **[buzz]** HTTP-bridge **rate-limit gate** `DEFAULT_RATE_LIMIT_SECONDS=10`, max 300s, mirrored in Rust `relay_admission.rs`. Adopt RPC rate limiting. (`buzz-desktop.md:319`)
- **Idea (converge):** keep Fabrica's contract-fence + idempotency; port buzz line-size bound + double-response guard + rate-limit gate, and MC owner-guard.

### 11. Integration points (skills, hooks, plugins, IPC, agent-hooks, terminals)

- **[Fabrica]** Wired at `index.ts:2486`; IPC handlers `ipc/runtime.ts`, `ipc/pty.ts`, `ipc/worktrees.ts`, `ipc/ssh.ts`; `FABRICARuntimeRpcServer`; plugin host narrowed facade (`resolveActiveWorktreeContext`, `listTerminals` capped, `sendTerminal`, `dispatchPluginNotification`); PTY plane (bidirectional, provider-injected); agent-hooks `onTerminalAgentStatus`; SSH relay; window/renderer `syncWindowGraph`; daemon headless. (`orchestration-system.md §8`)
- **[Fabrica]** **15+ agent-hook services** (claude/codex/gemini/grok/opencode/hermes/copilot/devin/kimi/cursor/amp/openclaude/mimo/antigravity/droid). (`Fabrica-features.md §8.5`)
- **[Fabrica]** Plugin system: `PluginService` / `Supervisor` / `Discovery` / `HostRuntime` / `WorkerController` / `MarketplaceService` / `AuditLog` / `KillListService` / `ContentSafety`. (`Fabrica-features.md §8.6`; `fa-plugin-runtime.md`)
- **[Fabrica]** Skills page + freshness nudge; 8 bundled skills (`skills/`). (`Fabrica-features.md §4.2`; `fabrica-app-discovery.md:50,176`)
- **[Fabrica]** `grantManagedCodexHookTrust(plan)`: never throws; returns `{lane:'rpc', entries}` or fallback; env kill-switch → fallback; ledger hit → skip RPC; 5-min per-host cooldown; restores exact pre-session bytes on failure. Keep as the safe hook-trust pattern. (`orchestration-system.md §8`; `fabrica-app-main-subsystems.md:89`)
- **[MC]** Auto-generated `skills/<id>/SKILL.md` on save; `sync-commands.ts` regenerates `.claude/commands/<agent>/user.md` (persona+instructions+skills+SOP). Adopt auto-generated agent/skill files. (`mc-features.md:114`; `mission-control-discovery.md:293`)
- **[MC]** **Adapter pattern**: `validate → execute → healthCheck → optional dry-run`; MCP packages as scale-out mechanism. Adopt for Fabrica plugin external actions (managed, auditable, dry-run-able). (`mc-adapters-linelevel.md:188,181`)
- **[buzz]** ACP harness bridges relay→agent via JSON-RPC with a **1–32 agent subprocess pool** + crash recovery; MCP servers run under `env_clear()` + explicit **PASSTHROUGH_ENV allowlist** (core + SSH + TLS + Buzz identity vars only). Adopt agent-subprocess pool + MCP sandbox allowlist. (`buzz-agent-crates.md:17,84`)
- **[buzz]** Agent hooks over SSH relay; `AGENTS.md` template (`NEST_AGENTS_VERSION=4`); skill `.agents/skills/buzz-cli/SKILL.md` with per-harness symlinks. Adopt versioned agent-template + skill symlinks. (`buzz-desktop.md:82`)
- **Idea (converge):** keep Fabrica's IPC + plugin + hook + terminal integration; port MC adapter validate/dry-run + buzz MCP sandbox allowlist + ACP pool.

### 12. Reference designs (MC + buzz)

**Mission Control (file-JSON, single-environment, autonomy-heavy):**
- JSON-as-IPC shared-file source of truth between humans/UI/agents. (`mission-control-discovery.md:23,363`)
- 4 run engines; decisions.json hard-block w/ 6 enforcement points + retry-prompt injection; loop-escalation→decision. (`mc-workflow-engine.md`, `mc-decision-gates.md`)
- Field-ops 8-state FSM + "iron claw" risk-tiered approval + spend limits + circuit breaker (3 consecutive failures → pause). (`mc-workflow-engine.md §4e/§5a`; `mc-execute-guards.md`)
- `prompt-builder` persona + fenced task data + SOP + `scrubCredentials` (injection defense). (`prompt-builder.ts`)
- Adapters `validate→execute→healthCheck→dry-run`; owner-guard; auto-generated skill/persona files. (`mc-adapters-linelevel.md`, `mc-features.md:114`)

**buzz (relay-native, multi-tenant, identity-first):**
- Relay = single source of truth; **secp256k1 agent identity + NIP-05**; community-as-tenant. (`buzz-features.md:12,205`)
- Publishable personas `kind:30175`, teams `30176`, managed-agent `30177`; `.persona.md` system prompts. (`buzz-discovery.md:229,305`)
- ACP harness: JSON-RPC bridge, **1–32 pool w/ crash recovery**, `MAX_LINE_SIZE` bound, MCP `PASSTHROUGH_ENV` allowlist. (`buzz-agent-crates.md`)
- Agent lifecycle `spawn/start/stop/restart/reconcile` + **orphan sweeps**; `request_approval` suspend w/ UUID token + grant/deny; owner-signed lifecycle events. (`buzz-features.md:24,66`; `buzz-desktop.md:74-75`)
- Auth: NIP-42 (`kind:22242`) + NIP-43 membership + NIP-OA `auth_tag`; `push_leases` claim queues; inter-relay mesh. (`buzz-agent-crates.md:19`; `bz-db-schema.md:137`; `bz-ops-deploy-admin.md:mesh_boot.rs`)

**Fabrica (already has — baseline to preserve):**
- run/task/worker lifecycle, `preamble.ts`, `coordinator.ts`, `lifecycle-reconciliation.ts`, decision gates, `federation-sync.ts`, drift guard (`repo.ts`), RPC surface (`runtime-rpc.ts`), plugin/hook/skill/terminal integration, 15+ agent-hook services. (`orchestration-system.md`; `Fabrica-features.md`)

**Convergent recommendation (3-tier vision: Meta-Orch → Orchestrator → Worker):**
1. Add the **system-prompt layer** Fabrica lacks — MC `buildAgentPersona` + buzz publishable `.persona.md` (Intent B).
2. Keep Fabrica's **authority + rejection + contiguity + contract-fence** models (best-in-class).
3. Port **buzz signed-event + community-tenant + mesh federation** and **NIP-OA ownership** onto Fabrica's peer-fingerprint.
4. Port **MC adapter validate/dry-run + risk-tiered approval** and **buzz MCP sandbox allowlist + ACP pool** into Fabrica's integration points.
5. Port **MC priority sort + durable retry budget + centralized dispatch predicate** and **buzz orphan-reaping + emit-before-settle** into the coordinator/settlement.

---

## Scan coverage

**Read in full / verified:** `orchestration-system.md`, `fabrica-app-discovery.md`, `Fabrica-features.md`, `mc-features.md`, `buzz-features.md`, `mission-control-discovery.md`, `buzz-discovery.md`, `mc-decision-gates.md`, `mc-workflow-engine.md`, `mc-execute-guards.md`, `mc-chainedispatch-reconciler.md`, `mc-fieldtask-kanban.md`, `mc-adapters-linelevel.md`, `mc-ai-providers.md`, `mc-frontend-buzz-clients.md`, `buzz-agent-crates.md`, `buzz-desktop.md`, `bz-relay-event-kinds.md`, `bz-db-schema.md`, `bz-ops-deploy-admin.md`, `bz-search-pubsub.md`, `bz-voice-media.md`, `bz-pair-relay-cli.md`, `fa-agent-hooks-probes.md`, `fa-plugin-runtime.md`, `analysis/production-architecture.md`, `analysis/r5-agent-platform-integration-map.md`, `analysis/r5-convergence-memo.md`, `analysis/similarities-gaps.md`, `analysis/round4-findings-digest.md`.

**Skipped (cited via section/grep only):** remaining `mission-control/*.md` not opened, remaining `buzz/*.md` deep internals, remaining `fabrica-app/*.md`, `analysis/atlas-*.md`, `cross-project-notes-*.md`, `digest-v2-refresh.md`. All secondary to the 12 sub-systems.

**No source files modified** (`_sources/`, `../Fabrica-app/`) — read-only pass.

---

## Promotion Log (validated → `orchestration-system.md`)

| Date | Item | What moved to `orchestration-system.md` |
|---|---|---|
| — | — | (empty — nothing validated yet) |

---

_Last updated: 2026-08-28_
