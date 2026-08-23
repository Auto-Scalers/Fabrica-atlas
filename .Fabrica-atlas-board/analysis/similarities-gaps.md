> **PATH MIGRATION NOTICE (2026-08-21):** This project moved from the environment root into `Fabrica-atlas/`. All `_sources/...` paths in this document now resolve to `Fabrica-atlas/_sources/...`. `Fabrica-app/` remains at the environment root.
# Analysis â€” Similarities, Gaps & Extensions Across mission-control, buzz, and Fabrica-app

> Task 3.1 â€” Group 3 (Synthesis & Concept Mapping), Roadmap 02, Round 1.
> Inputs: `.Fabrica-board/discovery/{mission-control,buzz,fabrica-app}-discovery.md` (verified PASS in Group 2).
> Direction context: transform Fabrica from coding-first IDE into a **desktop CLI agent management and operations platform for both business and coding builders/operators**.

Repos: **MC** = mission-control (Next.js local-first agent task manager) Â· **BZ** = buzz (Nostr relay workspace, humans+agents) Â· **FA** = Fabrica-app (Electron agentic-development IDE).

---

## 1. Similarities â€” Shared Features & Overlapping Logic

### 1.1 Identical concepts (same idea, different implementation)
| Concept | MC | BZ | FA |
|---|---|---|---|
| Agents as first-class actors with own identity | Agent roles in agents.json (persona = instructions + capabilities + skills) | Nostr keypairs per agent; agents are channel members, not bots | Per-provider accounts; managed agents w/ personas/teams as events |
| Agent â†” human messaging/inbox | inbox.json (delegation/report/question/approval) | Channels/DMs â€” same event log for humans & agents | Native chat transcripts + mobile push; orchestration inbox |
| Human decision gates blocking execution | decisions.json pending â†’ blocks task run | Workflow request_approval (suspends run; grant/deny events) | Orchestration decision gates (`ask`, `gate`) |
| Task/run state machines | kanban + field-task approval state machine | workflow run statuses (Pendingâ†’Runningâ†’WaitingApprovalâ†’â€¦) | Orchestration runs/tasks/workers lifecycle |
| Continuous/batch execution engine | daemon + continuous missions (dependency-aware auto-dispatch, concurrency slots) | buzz-acp pool (1â€“32 subprocesses, per-channel queueing) | runtime/orchestration workers + automations dispatch |
| Loop/failure handling | loop detection â†’ 3 strikes â†’ human decision | crash respawn in acp pool; conformance suites | hang-watchdog, liveness sweeps, session continuation chains |
| Cost/token accounting | costUsd + 4 token counters per session/run | turn metrics kind 44200 | usage stores per provider (Claude/Codex/OpenCode), rate-limit fetchers |
| Approval/safety layer for real actions | Field Ops: autonomy levels, spend limits, circuit breaker, vault | branch protections enforced at git transport; moderation commands | plugin consent gating, kill list, E2EE pairing trust |
| Encrypted secrets | AES-256-GCM vault + scrypt + sessions | OS keyring (desktop), ncryptsec backups | Keychain/keyring secret store, ai-vault process isolation plan |
| Audit trail | activity-log.json (+field log) | hash-chain tamper-evident audit log | activity timeline, crash breadcrumbs, telemetry |
| CLI built for agents | token-optimized REST API (~92% compression claims) | buzz-cli JSON in/out, exit codes, compact format | fabrica CLI --json everywhere, formatters |
| Scheduled automation | daemon cron schedules (daily-plan/standup/weekly-review) | workflow schedule triggers (cron ticks) | automations service (scheduled/triggered dispatch) |
| Skills/personas as data | skills-library.json injected into prompts | .persona.md packs + teams | SKILL.md discovery + bundled skills + persona packs (managed agents) |
| Memory for agents | task notes + ai-context.md snapshot | engrams (kind 30174) + mem CLI | AI Vault session history + resume |

### 1.2 Shared architectural patterns
1. **Single source of truth**: MC = JSON files Â· BZ = relay event log Â· FA = runtime live graph. All three reject distributed complexity in favor of one authoritative store.
2. **Spawn-and-track child processes** for agent execution (MC: claude -p detached self-continuing chains; BZ: ACP stdio subprocess pool; FA: PTY-resident TUI CLIs). All three do PID liveness checks and reconcile dead processes.
3. **Hooks/status reporting plane**: MC installs hooks into agent CLIs reporting to loopback server; FA does exactly the same (agent-hooks loopback); BZ gets status via the event stream itself.
4. **Provider/adapter abstraction**: MC ServiceAdapter (validateâ†’executeâ†’healthCheckâ†’financials, dry-run, never-throw); FA PTY/filesystem/git provider contracts (local/SSH/daemon); BZ transport-agnostic event kinds.
5. **Optimistic UI + polling with visibility gating** (MC hooks) vs live subscription fan-out (BZ) vs RPC streaming (FA).
6. **Zod/schema validation at boundaries** (MC Zod everywhere; FA zod contracts + admission validators; BZ Schnorr signatures as the ultimate validation).
7. **Graceful degradation everywhere** (MC daemon fallbacks; FA daemonâ†’local PTY, GPU fallback; BZ fail-closed tenancy).

---

## 2. Gaps â€” What MC/BZ Have That Fabrica-app Lacks

### 2.1 From mission-control (business/operator side)
| Gap | What it is | Value for Fabrica's transformation |
|---|---|---|
| G-MC-1 | **Eisenhower prioritization layer** (importanceÃ—urgency on all work, DO/SCHEDULE/DELEGATE/ELIMINATE) | Business builders think in priorities, not git branches. A priority/triage surface over agent work is missing in FA |
| G-MC-2 | **Goal hierarchy** (long-term goals â†’ milestones â†’ tasks with computed progress) | FA has tasks/worktrees but no objective tree linking agent work to business outcomes |
| G-MC-3 | **Brain dump â†’ auto-triage** (capture raw ideas, AI converts to structured tasks) | Zero-friction intake for non-coder operators |
| G-GC-4 | **Decision queue as first-class UI primitive** (options + custom answer, blocks dependents) | FA has orchestration gates but no dedicated human-decision inbox UX |
| G-MC-5 | **Field Ops safety stack**: autonomy levels (manual/supervised/full), per-service + global spend budgets (day/week/month), circuit breaker, approval workflows w/ risk classification, dry-run testing | The complete "let agents act in the real world safely" blueprint â€” directly reusable for business operations (payments, email, social) |
| G-MC-6 | **Service catalog + adapters** (64 services, 16 categories; Twitter/Reddit/Ethereum/Gmail/LinkedIn/Stripe adapters w/ dry-run + health checks + financials) | FA agents can code but can't post/email/pay. Adapter interface is clean and portable |
| G-MC-7 | **Encrypted credential vault w/ master password + sessions + owner-guard** ("agents cannot modify security settings") | Stronger human-authority model than FA's current keychain-only approach |
| G-MC-8 | **Token-optimized read API** (filters, sparse fields, batching, ~650-token workspace snapshot via ai-context.md) | Context economy for agents operating the platform itself |
| G-MC-9 | **Checkpoints** (save/restore/export/import whole workspace state) | Operational undo/backup for business data |
| G-MC-10 | **Checkpoints of agent communication protocol** (documented write conventions so ANY agent can participate file-based) | BYOAI openness |

### 2.2 From buzz (platform/identity/multi-agent side)
| Gap | What it is | Value |
|---|---|---|
| G-BZ-1 | **Cryptographic agent identity** (keypairs; signed events; same audit trail as humans) | Trustworthy attribution when many agents operate a business workspace |
| G-BZ-2 | **One signed event log as universal substrate** (chat+patches+approvals+workflows unified, one search index) | Unified history/search across everything agents do |
| G-BZ-3 | **Kind-integer extensibility protocol** (new feature = new kind, zero breaking changes) | Future-proof schema evolution pattern |
| G-BZ-4 | **Agent harness patterns**: @mentionâ†’queueâ†’batched promptâ†’ACP pool w/ heartbeats, respond-to allowlists, effort levels | Sophisticated prompt-farming discipline beyond FA's current per-pane model |
| G-BZ-5 | **Remote agents** (identity/history on relay, body replaceable, one-way launch handoff, control via messages, self-reaping) | FA has SSH worktrees but not "close the laptop, agent keeps working, resurrect later" |
| G-BZ-6 | **Agent memory as addressable events** (engrams + mem CLI ls/get/hash/set/patch/rm) | Durable, queryable agent memory beyond FA's session-vault |
| G-BZ-7 | **Activity feed UX theory** (sentence-per-item, outcome-first, mutate-in-place, 12 render classes, deliberate suppression) | Best-in-class design language for "what is my agent doing" â€” upgrade FA's terminal-centric view for operators |
| G-BZ-8 | **Branches-as-channels / merge archives room** (work context becomes permanent searchable record) | Work-as-conversation record; audit-friendly |
| G-BZ-9 | **Multi-tenant isolation done formally** (host-derived tenant context before any handler; TLA+/Tamarin verified) | Blueprint if Fabrica ever serves teams/orgs |
| G-BZ-10 | **Tamper-evident audit chain** + honest tombstones + moderation-as-human-workflow | Compliance-grade operations |
| G-BZ-11 | **Web-of-trust reputation** (portable signed contribution history, vouches incl. for agents) | Agent quality signals for hiring/routing work |
| G-BZ-12 | **Mesh compute** (community GPU pooling behind membership gate) | Cost-free inference option |
| G-BZ-13 | **Voice huddles with agents as peers** (+STT/TTS pipelines) | FA has dictation only; BZ has full multi-party voice |
| G-BZ-14 | **YAML workflows w/ triggers (message/reaction/schedule/webhook) + approval gates** | Declarative automation authoring for operators |

### 2.3 What Fabrica-app already has that others don't (context for gaps)
Deep IDE surface (terminals/editor/diffs), real multi-provider agent execution (17+ CLIs), SSH remote workspaces + relay daemon, embedded browser + Design Mode, emulator control, computer use, plugin marketplace, mobile E2EE companion, orchestration engine, usage/rate-limit observability. FA is the strongest **execution substrate**; MC contributes the **management/safety brain**; BZ contributes the **identity/communication/platform DNA**.

---

## 3. Extensions & Enhancements (combinations worth building)

| # | Extension | Combines | Idea |
|---|---|---|---|
| E1 | **Fabrica Operations Board** | MC Eisenhower + goals + FA worktrees/tasks | Priority matrix over ALL agent work (coding + business ops); goal trees whose leaves are FA worktree sessions or MC-style field tasks |
| E2 | **Field Ops inside Fabrica** | MC adapters/vault/spend-limits + FA plugin system + browser/computer-use | Agents execute real-world actions (post/email/pay) from the desktop app under MC's autonomy levels + circuit breaker; FA browser handles web-target adapters |
| E3 | **Decision Inbox** | MC decisions queue + FA orchestration gates + mobile push | One place where every blocked-on-human question lands (task runs, workflow approvals, spend requests), answerable from desktop or phone |
| E4 | **Brain Dump â†’ any agent** | MC brain-dump triage + FA agent fleet | Capture an idea; triage agent splits it into coding tasks (worktrees) and ops tasks (field tasks) automatically |
| E5 | **Unified Activity Feed** | BZ VISION_ACTIVITY render classes + FA activity/automations events + MC activity-log | Sentence-per-item feed across all agent actions w/ progressive disclosure; replaces raw terminal-watching for operators |
| E6 | **Agent identity & reputation** | BZ keypairs/web-of-trust + FA account services | Every agent session cryptographically attributed; reputation scores from usage/outcome data FA already collects |
| E7 | **Engram memory service** | BZ engrams + FA AI Vault | Cross-session, cross-agent memory: resume any session with full context; share memories between agents via signed events |
| E8 | **Workspace checkpoints** | MC checkpoints + FA runtime graph snapshots | Save/restore/export entire workspace state (worktrees, sessions, settings) |
| E9 | **YAML automations v2** | BZ workflow triggers/actions + FA automations + MC schedules | Declarative automations triggered by events/messages/schedules/webhooks w/ approval gates and delay steps |
| E10 | **Spend & rate-limit governor** | MC spend-tracker/safety-limits + FA rate-limits/usage | Single budget plane: API spend, action spend, per-agent/per-service caps, pause-on-breach wired into dispatch |
| E11 | **Remote/resident agents** | BZ remote-agents contract + FA SSH/relay infra | Agents that outlive the app: launched to a remote host, steered via messages, self-reaping |
| E12 | **Huddles w/ agents** | BZ voice + FA speech stack | Talk TO your agent fleet; agents join as peers w/ TTS |
| E13 | **Owner-guard security model** | MC owner-guard/vault sessions + FA keyring | "Only the owner can change safety settings" enforced uniformly across plugins, field ops, automations |
| E14 | **Context-economy APIs** | MC token-optimized endpoints + FA RPC methods | Sparse-field/filterable/batched reads everywhere agents consume the platform |

---

## 4. Relevance Map â€” what matters most for the transformation goal

Goal: *desktop CLI agent management and operations platform for business AND coding builders/operators.*

**Tier 1 (defines the new product):**
- MC Field Ops safety stack + adapters (G-MC-5/6/7) â€” the "operations" half
- MC prioritization/goals/brain-dump (G-MC-1/2/3) â€” the "management" half for non-coders
- BZ activity-feed UX (G-BZ-7) â€” makes delegation legible
- FA orchestration engine + worktrees (existing) â€” the execution backbone

**Tier 2 (differentiators):**
- Decision inbox everywhere (E3) Â· Unified activity feed (E5) Â· Spend governor (E10)
- BZ agent identity/attribution (G-BZ-1) Â· Engram memory (E7)

**Tier 3 (later/platform):**
- Remote resident agents (E11) Â· Mesh compute (G-BZ-12) Â· Voice huddles (E12) Â· Multi-tenant formal isolation (G-BZ-9) Â· Reputation/web-of-trust (G-BZ-11)

**Anti-goals detected (do NOT import):**
- BZ's Nostr-relay-as-workspace architecture (FA already has its own runtime/RPC; adopt concepts, not the relay)
- MC's JSON-file persistence at scale (fine for MC's scope; FA's stores are stronger)
- BZ multi-community tenancy (single-operator product today)

---
*Sources: three verified discovery docs. This analysis is Round 1 depth; Round 2 should deepen per-feature mapping (function-level) once direction is chosen.*

## ROUND 2 ADDENDUM â€” refinements from function-level deep dives

Deep dives on FA orchestration/RPC, buzz-relay internals, and MC test contracts refined several entries:

1. **E3 Decision Inbox is closer than assessed**: FA's orchestration already has durable DecisionGateRow + gateCreate/gateResolve RPC + human-only resolution invariant + resolved-gate context injection into worker preambles, plus `ask` (blocking question) and QuestionRow with answer threading. MC's decision-queue UX concepts map almost 1:1 onto existing FA primitives â€” Phase A/C work is mostly surface, not engine.
2. **E5 Activity Feed has a data source ready-made**: worker transcripts + output archives (transcript pins / â‰¤256KB redacted terminal tails captured before PTY close) + heartbeat phases (investigating|implementing|reviewing|waiting) give exactly the verb/object/outcome material BZ's render-class theory needs.
3. **Authority model discovered (FA)**: lifecycle settlement requires sender pane-key authority â€” payload knowledge alone never settles a dispatch. This is FA's native equivalent of MC owner-guard/BZ signed identity; production architecture should extend it rather than import MC's verbatim.
4. **Federation already exists**: FederatedDispatch + pull/ack/import relay protocol means E11 (remote resident agents) has a foundation in FA itself, not just BZ's design.
5. **Idempotency pattern worth generalizing**: mutation receipts ((callerFingerprint, requestId) â†’ canonicalized payload hash, replay returns recorded receipt) should back all new Operations Plane mutations.
6. **BZ git-on-object-storage** (content-addressed packs + single-pointer ETag CAS + startup conformance probe): relevant only if Fabrica ever hosts repos; logged as platform-tier reference, not adopted.
7. **MC tests as spec**: the 193 tests pin behavioral contracts (scrub patterns, fence escaping, config ranges, end-to-end agent flow). When porting MC subsystems, port the tests first â€” they are the precise specification.
8. **RPC capability gates** (capabilities negotiated at auth, bound to socket, never request-asserted) are the right enforcement point for agent-vs-owner distinctions in the Operations Plane (e.g., spend-limit changes gated to owner-class callers).

Round-2 verification spot checks passed: db.ts 6,495 lines exact Â· ingest.rs 4,848 lines exact Â· MessageType enum values confirmed in types.ts Â· RPC registration surface confirmed large (hundreds of name: registrations across methods/).

