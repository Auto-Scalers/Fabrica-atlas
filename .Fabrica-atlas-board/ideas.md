# Fabrica Transformation — Ideas by Focus System

> **Scratch space.** This file holds ONLY the MC/buzz parallels and new `[Idea]` proposals for the After-Rebrand transformation's **9 systems**. The as-is Fabrica baseline for each system lives in `systems.md` — do not duplicate it here. Each section lists `[MC]`/`[buzz]` = adoptable reference designs and `[Idea]` = new proposals, with plain-English "What this means" notes. Nothing here is validated.
> When an idea is **validated**, move it into the corresponding `systems.md` and log it in §Promotion Log.

## Focus Systems Index
| # | System | Baseline reference |
|---|---|---|
| 1 | Orchestration | `systems.md` |
| 2 | Project / Workspace model | `systems.md` |
| 3 | Tasks panel (GitHub/Jira) + Task Sources | `systems.md` |
| 4 | Agent Dashboard + map | `systems.md` |
| 5 | Search bar | `systems.md` |
| 6 | Integrations | `systems.md` |
| 7 | Automations | `systems.md` |
| 8 | Stats & Usage | `systems.md` |
| 9 | Plugins | `systems.md` |

---

## 0. Guiding Constraint

**Strictly preserve every existing Fabrica feature.** Enhance/extend only — never remove. Any MC/buzz capability adopted must be a strict superset. (Fabrica-App Transformation Rule in `AGENTS.md`.)

## PM Vision (direction)

Fabrica → an **agentic orchestration platform**: directs agents, with first-class control over agent identity, system prompts, skills, and multi-tier coordination. Build on the engine that already exists; add a clean tier hierarchy + MC/buzz-grade agent/skill/persona model.

---

## 1. Orchestration (MC/buzz parallels + new ideas)

_Baseline of what exists today: see `systems.md`._

### 1. Run (run-create)

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

- **[MC]** Daemon poll dispatcher: Eisenhower-sorted, health-monitored slots, **persistent retry queue** (exp backoff `retryDelay×2^(n-1)` capped 60min, survives restarts), due-retries processed first. Adopt priority sort + durable retry budget + due-retry priority. (`mc-workflow-engine.md:173-179`; `dispatcher.ts:95-215`)
  - **What this means:** Mission Control's poller sorts by urgency, watches slot health, and keeps a retry queue that survives restarts with exponential backoff (capped at 60 min), doing overdue retries first. We could add priority sorting and a durable retry budget to Fabrica's coordinator so failed tasks recover gracefully.

- **[MC]** Anti-pattern to avoid: the *same dispatchability predicate* is reimplemented in 4 places (RUNTASK/MISSIONS-API/DISPATCHER/PROJECT-RUN). Adopt a **centralized** predicate (the chainedispatch report itself recommends this). (`mc-chainedispatch-reconciler.md:31,197`)
  - **What this means:** Mission Control repeats the "can this be dispatched?" logic in four spots, which is error-prone. We should put that logic in one place in Fabrica so it stays consistent — a cleanup lesson from MC.

- **[MC]** Opt-in `fieldOps.autoExecute` with vault-session check + `maxConcurrentExecutions` cap. Adopt capability-gated auto-dispatch. (`mc-workflow-engine.md:179`)
  - **What this means:** Mission Control only auto-executes field ops when you opt in, after checking a vault session, and caps concurrent runs. We could gate Fabrica's auto-dispatch behind a capability check so it only runs when allowed.

- **[buzz]** No central coordinator — harnesses **self-claim** agents from a pool (`AgentPool.try_claim` affinity). Adopt worker-affinity dispatch (see §4). (`buzz-agent-crates.md:34`)
  - **What this means:** buzz has no central dispatcher; agents grab work from a pool with affinity to a session. We could let Fabrica reuse the same worker for related tasks (affinity), reducing startup cost.

- **[Idea (converge):]** keep Fabrica's in-process coordinator; port MC's priority sort + durable retry budget + centralized predicate + capability gating.
  - **What this means:** The plan: keep Fabrica's working coordinator, but borrow Mission Control's better priority sorting, restart-safe retries, single source of dispatch truth, and opt-in gating — improvements without replacing what works.

### 4. Worker-start (explicit)

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

- **[MC]** `handleTaskCompletion` = 4 best-effort steps (idempotent mark-done, inbox report, activity event, regenerate `ai-context.md`). Adopt regen-context-on-complete (Fabrica already does dependency promotion). (`mc-workflow-engine.md:233`)
  - **What this means:** Mission Control, on completion, marks done, reports to inbox, logs an event, and regenerates a context file. We could add context regeneration on completion; Fabrica already does the dependency-promotion part.

- **[buzz]** Usage/turn metric `kind:44200` is emitted **BEFORE** the prompt response so the upstream UsageTracker sees it in-flight. Adopt emit-before-settle ordering. (`buzz-agent-crates.md:88`)
  - **What this means:** buzz records per-turn usage *before* finishing, so metering is never missed. We could settle usage before marking a task done, ensuring cost tracking is complete.

- **[buzz]** Owner-signed lifecycle events (1630-1633) + **orphan sweeps** (`instance_reaper` reaps harnesses whose owning desktop died). Adopt orphan reaping for Fabrica `worker_terminal_resources`. (`buzz-desktop.md:74-75`)
  - **What this means:** buzz signs lifecycle events and runs a sweep that kills agents whose owner desktop crashed. We could add orphan reaping so Fabrica cleans up terminal resources left by dead sessions.

- **[Idea (converge):]** keep Fabrica's authority + rejection model; port buzz orphan-reaping + emit-before-settle.
  - **What this means:** Keep Fabrica's trusted settlement and rejection model, and borrow buzz's cleanup of orphaned agents and pre-settle usage emission — small, safe hardening.

### 6. Decision gates

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

- **[Idea (converge):]** keep Fabrica's gateCreate/gateResolve; add MC's loop-decision injection + buzz's suspend-token grant/deny.
  - **What this means:** Keep Fabrica's gate commands, but add Mission Control's loop-decision escalation and buzz's token-based suspend/grant/deny for a more structured human checkpoint.

### 7. Federation sync (cross-environment)

- **[buzz]** Relay is the **single source of truth**; dispatch/lifecycle are signed Nostr events; **community is the tenant**; inter-relay **mesh** (`mesh_boot.rs`). Adopt relay-as-truth + signed dispatch events + community-tenant federation. (`buzz-features.md`; `bz-ops-deploy-admin.md:mesh_boot.rs`)
  - **What this means:** buzz treats a relay (decentralized server) as the one true record, signs every dispatch event, and organizes by community with a relay mesh. We could make Fabrica's federation treat a relay as truth and sign events, with community tenancy.

- **[buzz]** Ownership attestation: NIP-42 auth (`kind:22242`), NIP-43 membership, NIP-OA `auth_tag` (verified owner attestation). Adopt ownership attestation for federation identity (Fabrica's peer-fingerprint is the analog — generalize it). (`buzz-agent-crates.md:19,58`; `buzz-desktop.md`)
  - **What this means:** buzz proves who owns a connection via signed attestations. Fabrica's peer-fingerprint is the analog; we could generalize it into a full ownership-attestation scheme for federation identity.

- **[buzz]** `push_leases` table: `active` XOR CHECK, endpoint uniqueness partial index, claim queues with SKIP-LOCKED-style recovery. Adopt for federation ack-lease durability. (`bz-db-schema.md:137,350`)
  - **What this means:** buzz uses a lease table so only one active push claim exists per endpoint, with recovery queues. We could use the same pattern to make Fabrica's federation ack-leases more durable.

- **[MC]** (none found — MC is single-environment JSON; no cross-environment federation).
  - **What this means:** Mission Control runs in a single environment with a local JSON file and has no cross-machine federation, so there's nothing from MC to adopt here.

- **[Idea (converge):]** keep Fabrica's contiguity + peer-fingerprint; port buzz signed-event + community-tenant + mesh + NIP-OA ownership.
  - **What this means:** Keep Fabrica's ordered, fingerprint-trusted sync, and add buzz's signed events, community tenancy, relay mesh, and ownership attestation for a more robust multi-environment federation.

### 8. Drift-guarded dispatch (git layer)

- **[buzz]** Git branch protections: `push-allowed` / `require-approval` / `no-force-push` via `buzz-protect` tags; PRs are signed Nostr events (not git signatures); authorization via relay push-policy keyed to Nostr identity + owner-signed lifecycle; **expected-commit CAS checks**, `--force-with-lease`, `--end-of-options`, hooks disabled, env scrubbed. Adopt branch-protection + CAS into Fabrica's drift guard. (`buzz-features.md:156`; `buzz-desktop.md:149`)
  - **What this means:** buzz tags branches with push rules (allowed / needs approval / no force-push), signs PRs, and uses commit-expectation checks plus safe push flags. We could fold branch-protection and commit-expectation checks into Fabrica's drift guard.

- **[MC]** (none found — MC uses per-agent git worktrees but no explicit drift guard).
  - **What this means:** Mission Control gives each agent a git worktree but has no explicit drift guard, so there's nothing MC-specific to copy here.

- **[Idea (converge):]** keep Fabrica's behind-count refusal; add buzz `require-approval` branch tags + expected-commit CAS + force-with-lease.
  - **What this means:** Keep Fabrica's "refuse if too far behind" rule, and add buzz's approval-tagged branches and commit-expectation/safe-force-push checks for stronger git safety.

### 9. Preamble system (operational prompt + persona / system prompt)

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

- **[Idea (Intent B — converge):]** Fabrica preamble (operational) + MC persona builder (system prompt) + buzz `.persona.md` publishable personas. Port `fence`/`escape`/`limit`/`scrub` into `preamble.ts`.
  - **What this means:** The plan (Intent B): keep Fabrica's operational preamble, add Mission Control's persona builder as the system-prompt layer, and adopt buzz's publishable personas — porting the fence/escape/limit/scrub safety into `preamble.ts`. This gives agents identity + safe task data.

### 10. RPC surface

- **[MC]** REST JSON APIs with **owner-guard** (`actor!=="me"` rejected) + Zod validation. Adopt owner-guard on Fabrica orchestration mutations. (`mission-control-discovery.md:266`; `mc-workflow-engine.md`)
  - **What this means:** Mission Control rejects any API call whose actor isn't the owner and validates inputs. We could add the same owner-guard to Fabrica's orchestration mutations so only the right owner can act.

- **[buzz]** ACP JSON-RPC 2.0 bridge: `MAX_LINE_SIZE=10MB` bound (OOM guard), monotonic id, **pending-permission double-response guard**. Adopt line-size bound + double-response protection. (`buzz-agent-crates.md:43`)
  - **What this means:** buzz bounds message size (to avoid out-of-memory) and guards against a permission request getting two responses. We could add the same size bound and double-response protection to Fabrica's RPC.

- **[buzz]** HTTP-bridge **rate-limit gate** `DEFAULT_RATE_LIMIT_SECONDS=10`, max 300s, mirrored in Rust `relay_admission.rs`. Adopt RPC rate limiting. (`buzz-desktop.md:319`)
  - **What this means:** buzz rate-limits its HTTP bridge (default 10s, up to 300s). We could add rate limiting to Fabrica's RPC so it can't be overwhelmed.

- **[Idea (converge):]** keep Fabrica's contract-fence + idempotency; port buzz line-size bound + double-response guard + rate-limit gate, and MC owner-guard.
  - **What this means:** Keep Fabrica's version fence and de-dup, and add buzz's size/double-response/rate-limit guards plus Mission Control's owner-guard — tightening the security boundary.

### 11. Integration points (skills, hooks, plugins, IPC, agent-hooks, terminals)

- **[MC]** Auto-generated `skills/<id>/SKILL.md` on save; `sync-commands.ts` regenerates `.claude/commands/<agent>/user.md` (persona+instructions+skills+SOP). Adopt auto-generated agent/skill files. (`mc-features.md:114`; `mission-control-discovery.md:293`)
  - **What this means:** Mission Control auto-generates a skill file and a per-agent commands file (persona+instructions+skills+SOP) on save. We could auto-generate Fabrica's agent/skill files the same way.

- **[MC]** **Adapter pattern**: `validate → execute → healthCheck → optional dry-run`; MCP packages as scale-out mechanism. Adopt for Fabrica plugin external actions (managed, auditable, dry-run-able). (`mc-adapters-linelevel.md:188,181`)
  - **What this means:** Mission Control runs external actions through validate → execute → health-check → optional dry-run, and uses MCP packages to scale out. We could use the same adapter pattern for Fabrica plugin actions so they're managed, auditable, and dry-runnable.

- **[buzz]** ACP harness bridges relay→agent via JSON-RPC with a **1–32 agent subprocess pool** + crash recovery; MCP servers run under `env_clear()` + explicit **PASSTHROUGH_ENV allowlist** (core + SSH + TLS + Buzz identity vars only). Adopt agent-subprocess pool + MCP sandbox allowlist. (`buzz-agent-crates.md:17,84`)
  - **What this means:** buzz runs 1–32 agent subprocesses with crash recovery and runs MCP servers in a cleaned environment with only an explicit allowlist of variables. We could adopt the subprocess pool and MCP sandbox allowlist for safer integration.

- **[buzz]** Agent hooks over SSH relay; `AGENTS.md` template (`NEST_AGENTS_VERSION=4`); skill `.agents/skills/buzz-cli/SKILL.md` with per-harness symlinks. Adopt versioned agent-template + skill symlinks. (`buzz-desktop.md:82`)
  - **What this means:** buzz uses a versioned `AGENTS.md` template and per-harness skill symlinks. We could adopt versioned agent templates and skill symlinks so setup is consistent across harnesses.

- **[Idea (converge):]** keep Fabrica's IPC + plugin + hook + terminal integration; port MC adapter validate/dry-run + buzz MCP sandbox allowlist + ACP pool.
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

## 2. Project / Workspace model (MC/buzz parallels + new ideas)

_Baseline of what exists today: see `systems.md`._

- **[MC]** `projects.json` groups tasks/goals/milestones — pure JSON state, no git/repo binding. — `mc-features.md`
  - **What this means:** Mission Control represents a project as a simple JSON planning object (tasks/goals/milestones) with no real repo attached. A lighter, planning-only model we could blend in.
- **[buzz]** Nostr `kind:30621` project (multi-repo grouping, NIP-MP), `kind:30617` repo announcement, branches-as-channels, NIP-OA owner attestation. — `buzz-discovery.md:94,122`
  - **What this means:** buzz projects group multiple repos on a decentralized network, treat branches as channels, and prove ownership cryptographically. A more open, identity-scoped way to organize code.
- **[Idea]** Converge: keep Fabrica's nested-repo discovery; adopt buzz's identity-scoped, git/relay-native project model so projects carry owner attestation.
  - **What this means:** Keep Fabrica's auto repo discovery, but let projects carry a verifiable owner identity (like buzz) so sharing/organizing across environments is trustworthy.

### Reference designs (MC / buzz)

- **MC**: `projects.json` — `{id, name, description, status, color, teamMembers, tags}`; projects group tasks/goals/milestones (`mission-control/CLAUDE.md` data schema). MC projects are pure JSON state, no git/repo binding.

  **How it works:** Mission Control represents a project as a simple labeled record (name, color, members, tags) that groups tasks and goals. It is not tied to a real code repository — it is a planning-only object, whereas Fabrica's projects are tied to actual folders.

- **buzz**: Nostr-native forge — `kind:30621` project (multi-repo grouping, NIP-MP), `kind:30617` repo announcement, branches-as-channels; owner attestation via NIP-OA (`buzz-discovery.md:94,122`; `buzz-desktop.md:100`). buzz projects are git/relay-native and identity-scoped.

  **How it works:** buzz builds projects on a decentralized social network (Nostr). A project can group several repositories, each branch is treated like a chat channel, and the owner proves they control it through a cryptographic signature. This is a more open, identity-based way to organize code than Fabrica's local folders.

---

## 3. Tasks panel (GitHub/Jira) + Task Sources (MC/buzz parallels + new ideas)

_Baseline of what exists today: see `systems.md`._

- **[MC]** Status Board Kanban (Not Started / In Progress / Done), Task Card w/ subtasks + `blockedBy[]`, Ventures/Goals/Brain-Dump triage. — `mc-features.md`
  - **What this means:** Mission Control's board has three columns, cards with subtasks and blockedBy, and Ventures/Goals/Brain-Dump triage — a planning model to port into Fabrica's board.
- **[Idea]** Converge: port MC's Kanban + `blockedBy` dependency model and Ventures/Goals linking into Fabrica's board.
  - **What this means:** Add Mission Control's simple kanban, dependency links, and goal/venture grouping on top of Fabrica's existing tracker integrations.

### Reference designs (MC / buzz)

- **[MC]** Status Board Kanban (Not Started / In Progress / Done), `Task Card` (importance/urgency, subtasks, assignment), `Task Detail Panel`, `Task Form`, `blockedBy[]` dependency model; Ventures grid + Goals with linked tasks + Brain-Dump triage (`mc-features.md`).

  **How it works:** Mission Control shows tasks on a simple three-column board with cards that carry importance/urgency, subtasks, and an assignee; a task can be marked `blockedBy` others. It also groups tasks under "Ventures" and "Goals" and has a "Brain-Dump" inbox to triage raw ideas. This is a planning board pattern Fabrica could adopt.

- **[buzz]** (none — buzz has no issue/task board; only nostr "projects" as repo groupings and managed-agent task records.)

  **How it works:** buzz does not have a task/issue board like Jira or GitHub; it only tracks projects as repo groupings and records tasks an agent was given. So there is no comparable board design to borrow from buzz here.

---

## 4. Agent Dashboard + map (MC/buzz parallels + new ideas)

_Baseline of what exists today: see `systems.md`._

- **[MC]** Command Center Dashboard crew-status 5-state pills (idle/on-track/dependencies/awaiting-decision/overloaded); Crew/Team workload pages. — `mc-features.md`
  - **What this means:** Mission Control shows each agent as a colored pill in one of five states plus crew/team workload pages — a clear health view to adopt.
- **[buzz]** Agent "card minting" (`MintedAgentCard`); `AgentPool` fixed slots + per-agent status. — `buzz-desktop.md`, `buzz-agent-crates.md`
  - **What this means:** buzz gives each agent a visual "minted" card and a fixed pool of slots with status — a tangible identity model to bring into the map.
- **[Idea]** Converge: adopt MC 5-state workload pills + buzz card-mint/agent-pool visualization into the map canvas.
  - **What this means:** Enrich Fabrica's map with Mission Control's five-state health pills and buzz's card-mint/agent-pool visuals so agent health is obvious at a glance.

### Reference designs (MC / buzz)

- **[MC]** Command Center Dashboard with Crew Status workload list + per-agent pills (5-state: idle / on-track / dependencies / awaiting-decision / overloaded) (`mc-features.md`, `mc-ui-frontend.md:103-132`); Crew Page (browse agents), Team Page (per-agent workload) (`mc-features.md`).

  **How it works:** Mission Control's dashboard shows a crew-status list and a colored "pill" per agent in one of five states (idle, on-track, waiting on dependencies, awaiting a decision, or overloaded). It also has pages to browse agents and see each one's workload — a clear at-a-glance health model Fabrica could mirror.

- **[buzz]** Agent "card minting" → `MintedAgentCard` via `mint_agent_card`; `AgentPool` with fixed slots + per-agent status (`buzz-desktop.md:50`; `buzz-agent-crates.md:33`).

  **How it works:** buzz creates a visual "card" for each agent (like minting a collectible) and keeps a fixed pool of agent slots, each showing its status. This gives every agent a tangible identity and a capped, manageable number of running agents.

---

## 5. Search bar (MC/buzz parallels + new ideas)

_Baseline of what exists today: see `systems.md`._

- **[MC]** Ctrl+K global search dialog across tasks/projects/goals. — `mc-features.md`
  - **What this means:** Mission Control's Ctrl+K searches tasks/projects/goals at once — a comparable global palette pattern to align with.
- **[buzz]** NIP-50 / Postgres FTS (tsvector + GIN, community-scoped). — `buzz-features.md`
  - **What this means:** buzz uses a database full-text index (community-scoped, privacy-aware) — a more powerful indexed search we could borrow for relay content.
- **[Idea]** Converge: add a persistent index + semantic/LLM search; port buzz FTS for relay content.
  - **What this means:** Add a standing search index and optional AI/meaning-based search on top of Fabrica's current text matching, and use buzz's full-text approach for relay content.

### Reference designs (MC / buzz)

- **[MC]** Search Dialog = global search across tasks/projects/goals, Ctrl+K palette (`mc-features.md`; `mc-ui-frontend.md:73`).

  **How it works:** Mission Control has a Ctrl+K search box that looks across tasks, projects, and goals at once — a comparable global-palette pattern Fabrica could align with.

- **[buzz]** NIP-50 / Postgres FTS full-text search (tsvector + GIN index, privacy-sensitive kinds excluded, community-scoped) (`buzz-features.md`, `buzz-discovery.md`).

  **How it works:** buzz searches using a database full-text engine (Postgres) with a special index, excluding private content and scoping results to a community. This is a more powerful, index-backed search Fabrica could borrow for relay content.

---

## 6. Integrations (MC/buzz parallels + new ideas)

_Baseline of what exists today: see `systems.md`._

- **[MC]** Service Catalog (64 services, 16 categories), AES-256-GCM credential vault, adapter layer for provider sync. — `mc-service-catalog.md`, `mc-adapters-linelevel.md`
  - **What this means:** Mission Control lists 64 services, stores credentials in a strongly encrypted vault, and uses adapters to sync providers — a cleaner, more secure connector model to adopt.
- **[Idea]** Converge: port MC adapter pattern + encrypted vault; de-sprawl connectors behind a uniform provider interface.
  - **What this means:** Hide Fabrica's many separate connectors behind one uniform interface with Mission Control's adapter pattern and encrypted vault, reducing sprawl and improving security.

### Reference designs (MC / buzz)

- **[MC]** Service Catalog: 64 services across 16 categories, `authType` oauth2/api-key/none, encrypted credential vault (AES-256-GCM), connect/test, financial safety budgets (`mc-service-catalog.md`; `mission-control-discovery.md:352`). Adapter layer for provider-specific sync (cleaner than Fabrica's connector sprawl) (`fa-runtime-structured-read.md:8`, `mc-adapters-linelevel.md`).

  **How it works:** Mission Control lists 64 services in 16 categories, each tagged with how it authenticates, and stores credentials in a strongly encrypted vault (AES-256-GCM). It also enforces "financial safety budgets" so an agent can't overspend on a paid API. An adapter layer normalizes each provider's sync — a cleaner pattern than Fabrica's many separate connectors, and a candidate to adopt.

- **[buzz]** (none — buzz "integrations" are nostr relays/communities, not SaaS connectors.)

  **How it works:** buzz's notion of "integration" is connecting to decentralized Nostr relays and communities, not SaaS apps like Jira, so there is no SaaS connector design to borrow from buzz here.

---

## 7. Automations (MC/buzz parallels + new ideas)

_Baseline of what exists today: see `systems.md`._

- **[MC]** Workflow Engine: 4 run engines + `node-cron` scheduler, `decisions.json` approval gates, `maxParallelAgents`. — `mc-workflow-engine.md`
  - **What this means:** Mission Control's engine has multiple run styles, a cron scheduler, approval gates, and a concurrency cap — a mature scheduling model to learn from.
- **[buzz]** YAML-as-Code Workflow: 4 triggers/7 actions, `evalexpr` conditions (100ms), UUID-token approvals, signed step traces. — `buzz-features.md`
  - **What this means:** buzz lets you write automations as YAML with triggers/actions, fast conditions, and token approvals with signed traces — a "workflow as code" pattern to port.
- **[Idea]** Converge: port MC scheduling + buzz YAML workflows + approval tokens into Fabrica automations.
  - **What this means:** Combine Mission Control's scheduling and buzz's YAML workflows + approval tokens into Fabrica's automation editor for more powerful, reviewable automations.

### Reference designs (MC / buzz)

- **[MC]** Workflow Engine: four run engines + `node-cron` scheduler (`dailyPlan` `0 7 * * *`, `standup`, `brainDumpTriage`, `weeklyReview`), approval gates via `decisions.json`, `maxParallelAgents` concurrency, `accumulateRunCost` (`mc-workflow-engine.md`).

  **How it works:** Mission Control's engine has four ways to run work plus a cron scheduler that fires daily plans, standups, brain-dump triage, and weekly reviews. It gates approvals through a decisions file and caps how many agents run at once, tracking cost — a mature scheduling model Fabrica could learn from.

- **[buzz]** YAML-as-Code Workflow Engine: channel-scoped automation, 4 triggers, 7 actions, template variables, `evalexpr` conditions (100ms timeout), workflow approvals with UUID tokens, signed step traces (`buzz-features.md`).

  **How it works:** buzz lets you write automations as YAML text: pick from 4 triggers and 7 actions, use variables and simple conditions (evaluated within 100ms), and require approval via a UUID token, with each step cryptographically signed. This "workflow as code" pattern is a candidate to bring into Fabrica's automations.

---

## 8. Stats & Usage (MC/buzz parallels + new ideas)

_Baseline of what exists today: see `systems.md`._

- **[buzz]** Agent Turn Metrics `kind:44200` durable per-turn token usage; storage sweep; owner-scoped encrypted telemetry. — `buzz-features.md`
  - **What this means:** buzz records token usage per agent turn durably and scopes encrypted telemetry to the owner — a per-turn accounting model to add.
- **[Idea]** Converge: add buzz per-turn metric durability + owner-scoped telemetry export to Fabrica's usage contract.
  - **What this means:** Make Fabrica's usage records durable per turn and exportable as owner-scoped telemetry, matching buzz's finer-grained metering.

### Reference designs (MC / buzz)

- **[buzz]** Agent Turn Metrics `kind:44200` durable per-turn token-usage; `storage_sweep.rs` hourly S3 usage sweep; owner-scoped encrypted telemetry frames (`buzz-features.md`).

  **How it works:** buzz records token usage for every single agent turn in a durable, per-turn record, sweeps usage data to storage hourly, and scopes encrypted telemetry to the owner. This durable, per-turn accounting is a pattern Fabrica could add to its usage contract.

- **[MC]** (none comparable — MC integrates only the Claude CLI with NO per-provider token/cost accounting, no 429/backoff enforcement; explicit gap vs Fabrica.)

  **How it works:** Mission Control only connects to the Claude CLI and does not track per-provider token cost or enforce rate-limit backoffs — so Fabrica is actually ahead of MC here, and there is nothing from MC to adopt.

---

## 9. Plugins (MC/buzz parallels + new ideas)

_Baseline of what exists today: see `systems.md`._

- **[MC]** (none — Skills Page only.) **[buzz]** (none — agent crates only.)
  - **What this means:** Neither MC (skills page only) nor buzz (agent crates only) has a plugin marketplace, so there's no external marketplace design to copy — Fabrica's is the baseline.
- **[Idea]** Keep Fabrica's model as best-in-class; optionally port MC skills-as-artifacts + buzz agent-crate distribution into the marketplace.
  - **What this means:** Keep Fabrica's plugin model as the standard, and optionally borrow MC's skills-as-artifacts and buzz's agent-crate distribution to enrich the marketplace.

### Reference designs (MC / buzz)

- **[MC]** (none — MC has no plugin marketplace; only a `Skills Page` with tags/agent-assignment and built-in slash commands.)

  **How it works:** Mission Control has no installable-plugin marketplace; it only has a Skills page (tagged, assignable to agents) and built-in slash commands. So there is no MC marketplace design to adopt — Fabrica's plugin system is already richer.

- **[buzz]** (none — buzz extensibility is via agent crates/recipes, not installable plugins.)

  **How it works:** buzz extends itself through "agent crates" and recipes rather than installable plugins, so there is no comparable plugin marketplace to borrow from buzz either.

---

## Scan coverage

**Read in full / verified:** `systems.md`, `fabrica-app-discovery.md`, `Fabrica-features.md`, `mc-features.md`, `buzz-features.md`, `mission-control-discovery.md`, `buzz-discovery.md`, `mc-decision-gates.md`, `mc-workflow-engine.md`, `mc-execute-guards.md`, `mc-chainedispatch-reconciler.md`, `mc-fieldtask-kanban.md`, `mc-adapters-linelevel.md`, `mc-ai-providers.md`, `mc-frontend-buzz-clients.md`, `buzz-agent-crates.md`, `buzz-desktop.md`, `bz-relay-event-kinds.md`, `bz-db-schema.md`, `bz-ops-deploy-admin.md`, `bz-search-pubsub.md`, `bz-voice-media.md`, `bz-pair-relay-cli.md`, `fa-agent-hooks-probes.md`, `fa-plugin-runtime.md`, `analysis/production-architecture.md`, `analysis/r5-agent-platform-integration-map.md`, `analysis/r5-convergence-memo.md`, `analysis/similarities-gaps.md`, `analysis/round4-findings-digest.md`.

**Skipped (cited via section/grep only):** remaining `mission-control/*.md` not opened, remaining `buzz/*.md` deep internals, remaining `fabrica-app/*.md`, `analysis/atlas-*.md`, `cross-project-notes-*.md`, `digest-v2-refresh.md`. All secondary to the 12 sub-systems.

**No source files modified** (`_sources/`, `../Fabrica-app/`) — read-only pass.

---

## Promotion Log (validated → corresponding `systems.md`)

| Date | Item | What moved to |
|---|---|---|
| — | — | (empty — nothing validated yet) |

---

_Last updated: 2026-08-28_
