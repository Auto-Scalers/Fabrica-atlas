# Orchestration — Ideas by Sub-System

> **Scratch space.** Lists the orchestration **sub-system titles** (mirroring the index in `orchestration-system.md`). Under each, ideas/features pulled from the discovery + analysis files: `[Fabrica]` = what already exists (baseline to preserve), `[MC]`/`[buzz]` = adoptable reference designs. Nothing here is validated.
> When an idea is **validated**, move it into `orchestration-system.md` and log it in §Promotion Log.
> _Detailed extract: `analysis/orchestration-ideas.md`._

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
- **[Fabrica]** `run-create` = `BEGIN IMMEDIATE` tx → unbind other runs on same pane → insert `run_<hex>` (`generation=1`); legacy-authority proof path. — `fabrica-app-discovery.md:236`
- **[Fabrica]** `RunRow` durable schema: `id, objective, home_database, coordinator_handle, coordinator_pane_key, consumer_generation, legacy`. — `fabrica-app-discovery.md:233`
- **[Fabrica]** Run ends when all tasks `completed|failed`; logs "Stuck" if no active tasks but some `blocked`. — `coordinator.ts:541`
- **[MC]** Four run engines on one JSON store (single-task / daemon poll / mission chain / field-ops 8-state FSM); no generic DSL. Adopt formal run "kinds" (mission / venture). — `mc-workflow-engine.md:11-18`
- **[MC]** Single-flight guard: HTTP 409 if a mission already `running`. Adopt as run-create duplicate guard. — `mc-workflow-engine.md:90`
- **[MC]** Loop detection per task: `attempts>=3` → auto-creates a decision (human gate) Retry-different/Skip/Stop. Adopt escalation→decision for runs. — `mc-chainedispatch-reconciler.md:87`
- **[buzz]** Runs carry `run_status`, `execution_trace`, `error_code`, and **resume** via `start_index` + `initial_outputs`. Adopt resumable, trace-bearing runs. — `bz-db-schema.md:90`

### 2. Task (task-create)
- **[Fabrica]** `task-create` validates same-run `parentId`/`deps` → `pending` if deps unmet else `ready`; DAG via `parent`/`deps`. Keep. — `fabrica-app-discovery.md:237`
- **[MC]** `blockedBy` exists but NOT enforced on field-ops tasks. Adopt enforce `blockedBy` on all task kinds. — `mc-fieldtask-kanban.md:198`
- **[MC]** Eisenhower priority + kanban + agent lead; priority sort in daemon poll only. Adopt priority queue into coordinator. — `mc-workflow-engine.md:104`
- **[MC]** Typed task payloads with `{{variable}}` templates. Adopt templated task specs. — `mission-control-discovery.md:352`
- **[MC]** Risk-tiered approval `requiresApproval(type, serviceRisk, autonomyMode)` computed **server-side**; high-risk always needs approval. Adopt task-level approval gating. — `mc-workflow-engine.md:128-136`
- **[buzz]** Steps run sequentially with optional `if:`, **per-step `timeout_secs`**, `StepTimeout` errors. Adopt step-level timeouts. — `buzz-workflow/executor.rs:1120`
- **[buzz]** Git branch protections (`push-allowed`/`require-approval`/`no-force-push`) make tasks approval-gated at git layer. Adopt for git ops. — `buzz-features.md:156`

### 3. Coordinator (auto-dispatch)
- **[Fabrica]** Tick 2000ms: `MAX_CONCURRENT=4`, `HUNG_THRESHOLD=10min`, `DISPATCH_STALE_THRESHOLD=20`; `tick()` order processMessages→escalations→gates→staleWarn→dispatch→convergence. — `coordinator.ts:106`
- **[Fabrica]** `decompose()` **NOT implemented** — tasks must be pre-created. (Gap → adopt AI decomposition.) — `coordinator.ts:196`
- **[Fabrica]** At most one terminal spawned per tick; reused if writable+connected. — `coordinator.ts:373`
- **[Fabrica]** Drift probe once per tick; refuses if `behind>20` unless `allow-stale-base:true` (silent return). — `coordinator.ts:387,425`
- **[MC]** Daemon poll: Eisenhower-sorted, health-monitored slots, **durable retry queue** (exp backoff capped 60min, survives restarts), due-retries first. Adopt priority + durable retry budget. — `mc-workflow-engine.md:173-179`
- **[MC]** Anti-pattern: same dispatchability predicate reimplemented in 4 places. Adopt a **centralized** predicate. — `mc-chainedispatch-reconciler.md:31,197`
- **[MC]** Opt-in `fieldOps.autoExecute` with vault-session check + `maxConcurrentExecutions` cap. Adopt capability-gated auto-dispatch. — `mc-workflow-engine.md:179`
- **[buzz]** No central coordinator — harnesses **self-claim** agents from a pool (`AgentPool.try_claim` affinity). Adopt worker-affinity dispatch. — `buzz-agent-crates.md:34`
- **[Idea]** Keep Fabrica's in-process coordinator; port MC priority sort + durable retry budget + centralized predicate + capability gating.

### 4. Worker-start (explicit)
- **[Fabrica]** `worker-start`: dedupe by `(callerFingerprint, requestId)`; retry requires prior `failed|stopped|abandoned`; setup via stdout marker `__FABRICA_SETUP_COMPLETE__`. — `fabrica-app-discovery.md:238`
- **[Fabrica]** `WorkerDispatchRow` FSM: `starting→ready→succeeded|failed|stopping|stopped|start_unknown|stop_unknown|abandoned`. — `fabrica-app-discovery.md:233`
- **[MC]** Spawns detached Claude CLI child; validation gate `process.exit(1)` *before* any state write. Adopt pre-state-write validation gate. — `mc-workflow-engine.md:75`
- **[buzz]** `spawn()`: piped stdio, `kill_on_drop`, Unix process group; env layering (runtime → persona `extra_env` → CODEX_CONFIG deep-merge LAST). Adopt subprocess sandboxing + env precedence. — `buzz-agent-crates.md:44`
- **[buzz]** **Pre-spawn readiness gate** `agent_readiness`; if `NotReady`, inject setup payload + minimal listener mode. Adopt readiness gating. — `buzz-desktop.md:67`
- **[buzz]** `AgentPool.try_claim` session-affinity then first idle slot. Adopt worker affinity/reuse. — `buzz-agent-crates.md:34`
- **[buzz]** Crash recovery `recover_panicked_agent` + `SlotCircuit` + respawn task. Adopt automatic worker respawn. — `buzz-agent-crates.md:60`

### 5. worker_done settlement (lifecycle-reconciliation)
- **[Fabrica]** `hasLifecycleAuthority` = sender `pane_key` must match assignee (leaf-id equivalence); payload knowledge alone is NEVER authority. 11 rejection codes. — `lifecycle-reconciliation.ts:26`
- **[Fabrica]** `worker_done` = JSON `{taskId, dispatchId, outcome}`; `settleWorkerReport` idempotency + staleness; `_FABRICALifecycleRejection` guard; `suppressEarlierHeartbeats`. — `orchestration-system.md §5.5`
- **[Fabrica]** On success: atomic task+dispatch update, question cleanup, **dependency promotion**. — `fabrica-app-discovery.md:240`
- **[MC]** `handleTaskCompletion` = idempotent mark-done + inbox report + activity event + regenerate `ai-context.md`. Adopt regen-context-on-complete. — `mc-workflow-engine.md:233`
- **[buzz]** Usage/turn metric emitted **BEFORE** prompt response (in-flight). Adopt emit-before-settle ordering. — `buzz-agent-crates.md:88`
- **[buzz]** Owner-signed lifecycle events + **orphan sweeps** (`instance_reaper`). Adopt orphan reaping for `worker_terminal_resources`. — `buzz-desktop.md:74-75`
- **[Idea]** Keep Fabrica authority + rejection model; port buzz orphan-reaping + emit-before-settle.

### 6. Decision gates
- **[Fabrica]** Created via `gateCreate`/`decision_gate`; **humans resolve via `gateResolve`**; coordinator never auto-resolves; resolved context injected as `--- DECISION GATE RESOLVED ---`. — `coordinator.ts:347,473`
- **[Fabrica]** `DecisionGateRow` + `QuestionRow`; `gateCreate`/`gateResolve` RPC. — `fabrica-app-discovery.md:233,241`
- **[MC]** `decisions.json` hard-blocks a task at **six enforcement points**. Adopt multi-point enforcement. — `mc-decision-gates.md:12,86`
- **[MC]** **Retry-prompt injection**: answered decision injected as "Retry Instructions" into next prompt (permanent until deleted). Adopt answered-gate→next-prompt injection. — `mc-decision-gates.md:173-175`
- **[MC]** Loop-escalation auto-creates decision at `attempts>=3` with error-history context. Adopt. — `mc-decision-gates.md:87`
- **[buzz]** `request_approval` suspends run with UUID token; resolved via `grant`/`deny` events. Adopt suspend-token + explicit grant/deny. — `buzz-features.md:66,72`
- **[buzz]** Workflow approvals suspend for human approval (resume replays from `start_index`). Adopt resumable approval suspension. — `buzz-features.md:66`
- **[Idea]** Keep gateCreate/gateResolve; add MC loop-decision injection + buzz suspend-token grant/deny.

### 7. Federation sync (cross-environment)
- **[Fabrica]** `federation-sync.ts`: **peer-fingerprint guard**, **contiguity** (`sequence===cursor+1`), lifecycle mapping, **ack lease**, reverse push, priority normalization. — `orchestration-system.md §5.7`
- **[Fabrica]** `FederatedDispatchRow`/`RemoteDispatchAttachmentRow`/`FederationRelayItemRow`; `federationPull`/`Ack`/`Import`. — `fabrica-app-discovery.md:242`
- **[buzz]** Relay = **single source of truth**; dispatch/lifecycle are signed Nostr events; **community is the tenant**; inter-relay **mesh**. Adopt relay-as-truth + signed events + community-tenant. — `buzz-features.md`; `bz-ops-deploy-admin.md`
- **[buzz]** Ownership attestation: NIP-42 auth, NIP-43 membership, NIP-OA `auth_tag`. Adopt ownership attestation (generalize peer-fingerprint). — `buzz-agent-crates.md:19,58`
- **[buzz]** `push_leases` table: `active` XOR CHECK, endpoint uniqueness, claim queues with SKIP-LOCKED recovery. Adopt for ack-lease durability. — `bz-db-schema.md:137,350`
- **[Idea]** Keep contiguity + peer-fingerprint; port buzz signed-event + community-tenant + mesh + NIP-OA ownership.

### 8. Drift-guarded dispatch (git layer)
- **[Fabrica]** Pre-dispatch `getRemoteDrift` = `rev-list --left-right --count`; drift subjects injected into preamble; `>20` behind refuses unless `allow-stale-base:true`. — `repo.ts:540-562`; `orchestration-system.md §5.8`
- **[Fabrica]** Coordinator drift probe once per tick, shared base snapshot, silent return on refusal. — `coordinator.ts:387,425`
- **[buzz]** Branch protections `push-allowed`/`require-approval`/`no-force-push` via `buzz-protect` tags; PRs signed Nostr events; **expected-commit CAS**, `--force-with-lease`, hooks disabled, env scrubbed. Adopt branch-protection + CAS. — `buzz-features.md:156`; `buzz-desktop.md:149`
- **[Idea]** Keep behind-count refusal; add buzz `require-approval` tags + expected-commit CAS + force-with-lease.

### 9. Preamble system (operational prompt + persona / system prompt)
- **[Fabrica]** `preamble.ts` = operational-only brief: Header → `CLI COMMANDS` (`worker_done` once / `heartbeat` 5min / `ask` never `AskUserQuestion` / escalation / `check`) → after-worker_done → `BASE DRIFT` → `TASK`. **Not** a model system prompt. — `orchestration-system.md §6`
- **[Fabrica]** GAP: no model-level system prompt per agent today. — `orchestration-system.md §6`
- **[MC]** `buildAgentPersona` = `"You are acting as <name> — <description>"` + Instructions + Capabilities + Skills (true agent identity). — `prompt-builder.ts:83`
- **[MC]** `buildTaskPrompt` = persona + skills + **fenced task data** (`<task-context>`, closing-tag escaped) + SOP + retry context, then `enforcePromptLimit`; `scrubCredentials` redacts secrets. Adopt as the missing system-prompt layer. — `prompt-builder.ts:471`; `security.ts`
- **[buzz]** `.persona.md` = YAML + markdown system prompt, **publishable as Nostr `kind:30175`**; personas `30175`, teams `30176`, managed-agent `30177`. Adopt publishable portable personas. — `buzz-discovery.md:229,305`
- **[buzz]** `framed_system_prompt`: workspace / team / huddle / canvas sections. Adopt structured framing. — `buzz-agent-crates.md:39`
- **[Idea]** Fabrica preamble (operational) + MC persona builder (system prompt) + buzz `.persona.md` (publishable). Port `fence`/`escape`/`limit`/`scrub` into `preamble.ts`.

### 10. RPC surface
- **[Fabrica]** ~35 orchestration RPC; envelope w/ `orchestrationContractVersion`; **contract fence** → `orchestration_migration_required` (zero effects) on mismatch; capabilities negotiated at auth; durable idempotency per `(callerFingerprint, orchestrationRequestId)`; transports socket / LAN WS / cloud relay / MobileSocketWiring. — `orchestration-system.md §7`
- **[Fabrica]** `runtime-rpc.ts` = single security boundary; ~120 method modules. — `fabrica-app-discovery.md:75,182`
- **[MC]** REST JSON APIs with **owner-guard** (`actor!=="me"` rejected) + Zod validation. Adopt owner-guard on mutations. — `mission-control-discovery.md:266`
- **[buzz]** ACP JSON-RPC 2.0: `MAX_LINE_SIZE=10MB` (OOM guard), monotonic id, **pending-permission double-response guard**. Adopt line-size bound + double-response guard. — `buzz-agent-crates.md:43`
- **[buzz]** HTTP-bridge **rate-limit gate** `DEFAULT_RATE_LIMIT_SECONDS=10` (max 300s). Adopt RPC rate limiting. — `buzz-desktop.md:319`
- **[Idea]** Keep contract-fence + idempotency; port buzz line-size + double-response + rate-limit, and MC owner-guard.

### 11. Integration points (skills, hooks, plugins, IPC, agent-hooks, terminals)
- **[Fabrica]** Wired at `index.ts:2486`; IPC `runtime/pty/worktrees/ssh`; `FABRICARuntimeRpcServer`; plugin host narrowed facade; PTY plane; agent-hooks `onTerminalAgentStatus`; SSH relay; renderer `syncWindowGraph`; daemon headless. — `orchestration-system.md §8`
- **[Fabrica]** **15+ agent-hook services** (claude/codex/gemini/grok/opencode/hermes/copilot/devin/kimi/cursor/amp/openclaude/mimo/antigravity/droid). — `Fabrica-features.md §8.5`
- **[Fabrica]** Plugin system: `PluginService`/`Supervisor`/`Discovery`/`HostRuntime`/`WorkerController`/`Marketplace`/`AuditLog`/`KillList`/`ContentSafety`. — `Fabrica-features.md §8.6`
- **[Fabrica]** Skills page + 8 bundled skills (`skills/`). — `Fabrica-features.md §4.2`
- **[Fabrica]** `grantManagedCodexHookTrust(plan)`: never throws; rpc lane or fallback; 5-min per-host cooldown; restores pre-session bytes on failure. Keep as safe hook-trust pattern. — `fabrica-app-main-subsystems.md:89`
- **[MC]** Auto-generated `skills/<id>/SKILL.md` + `.claude/commands/<agent>/user.md` (persona+instructions+skills+SOP). Adopt auto-generated agent/skill files. — `mc-features.md:114`
- **[MC]** **Adapter pattern** `validate→execute→healthCheck→optional dry-run`; MCP packages as scale-out. Adopt for plugin external actions. — `mc-adapters-linelevel.md:188`
- **[buzz]** ACP harness: **1–32 agent subprocess pool** + crash recovery; MCP under `env_clear()` + **PASSTHROUGH_ENV allowlist**. Adopt pool + MCP sandbox allowlist. — `buzz-agent-crates.md:17,84`
- **[buzz]** Agent hooks over SSH relay; versioned `AGENTS.md` template (`NEST_AGENTS_VERSION=4`); skill symlinks. Adopt versioned template + skill symlinks. — `buzz-desktop.md:82`
- **[Idea]** Keep IPC + plugin + hook + terminal; port MC adapter validate/dry-run + buzz MCP sandbox allowlist + ACP pool.

### 12. Reference designs (MC + buzz)
- **[MC]** JSON-as-IPC shared-file truth; 4 run engines; decisions.json 6-point block + retry-prompt injection; field-ops 8-state FSM + "iron claw" risk-tiered approval + circuit breaker (3 fails → pause); persona + fenced task + `scrubCredentials`; adapters validate/dry-run; owner-guard; auto-generated skill/persona files. — `mc-workflow-engine.md`, `mc-decision-gates.md`, `prompt-builder.ts`, `mc-adapters-linelevel.md`
- **[buzz]** Relay = truth; secp256k1 identity + NIP-05; community-as-tenant; publishable personas `kind:30175/30176/30177`; ACP pool (1–32) + crash recovery + `MAX_LINE_SIZE` + MCP `PASSTHROUGH_ENV`; lifecycle `spawn/start/stop/restart/reconcile` + orphan sweeps; `request_approval` suspend + grant/deny; NIP-42/43/OA auth; `push_leases` claim queues; inter-relay mesh. — `buzz-features.md`, `buzz-agent-crates.md`, `bz-ops-deploy-admin.md`
- **[Fabrica]** Baseline to preserve: run/task/worker lifecycle, `preamble.ts`, `coordinator.ts`, `lifecycle-reconciliation.ts`, decision gates, `federation-sync.ts`, drift guard, RPC surface, plugin/hook/skill/terminal integration, 15+ agent-hook services. — `orchestration-system.md`, `Fabrica-features.md`
- **[Idea — 3-tier converge]** 1) Add system-prompt layer (MC persona + buzz `.persona.md`); 2) Keep Fabrica authority/rejection/contiguity/contract-fence; 3) Port buzz signed-event + community-tenant + mesh federation + NIP-OA ownership; 4) Port MC adapter dry-run + risk-tiered approval + buzz MCP sandbox + ACP pool; 5) Port MC priority sort + durable retry + centralized predicate + buzz orphan-reaping.

---

## Promotion Log (validated → `orchestration-system.md`)

| Date | Item | What moved to `orchestration-system.md` |
|---|---|---|
| — | — | (empty — nothing validated yet) |

---

_Last updated: 2026-08-28_
