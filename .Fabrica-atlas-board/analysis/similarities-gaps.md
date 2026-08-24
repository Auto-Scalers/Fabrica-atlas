> **PATH MIGRATION NOTICE (2026-08-21):** This project moved from the environment root into `Fabrica-atlas/`. All `_sources/...` paths in this document now resolve to `Fabrica-atlas/_sources/...`. `Fabrica-app/` remains at the environment root.
# Analysis — Similarities, Gaps & Extensions Across mission-control, buzz, and Fabrica-app

> Task 3.1 — Group 3 (Synthesis & Concept Mapping), Roadmap 02, Round 1.
> Inputs: `.Fabrica-board/discovery/{mission-control,buzz,fabrica-app}-discovery.md` (verified PASS in Group 2).
> Direction context: transform Fabrica from coding-first IDE into a **desktop CLI agent management and operations platform for both business and coding builders/operators**.

Repos: **MC** = mission-control (Next.js local-first agent task manager) · **BZ** = buzz (Nostr relay workspace, humans+agents) · **FA** = Fabrica-app (Electron agentic-development IDE).

---

## 1. Similarities — Shared Features & Overlapping Logic

### 1.1 Identical concepts (same idea, different implementation)
| Concept | MC | BZ | FA |
|---|---|---|---|
| Agents as first-class actors with own identity | Agent roles in agents.json (persona = instructions + capabilities + skills) | Nostr keypairs per agent; agents are channel members, not bots | Per-provider accounts; managed agents w/ personas/teams as events |
| Agent ↔ human messaging/inbox | inbox.json (delegation/report/question/approval) | Channels/DMs — same event log for humans & agents | Native chat transcripts + mobile push; orchestration inbox |
| Human decision gates blocking execution | decisions.json pending → blocks task run | Workflow request_approval (suspends run; grant/deny events) | Orchestration decision gates (`ask`, `gate`) |
| Task/run state machines | kanban + field-task approval state machine | workflow run statuses (Pending→Running→WaitingApproval→…) | Orchestration runs/tasks/workers lifecycle |
| Continuous/batch execution engine | daemon + continuous missions (dependency-aware auto-dispatch, concurrency slots) | buzz-acp pool (1–32 subprocesses, per-channel queueing) | runtime/orchestration workers + automations dispatch |
| Loop/failure handling | loop detection → 3 strikes → human decision | crash respawn in acp pool; conformance suites | hang-watchdog, liveness sweeps, session continuation chains |
| Cost/token accounting | costUsd + 4 token counters per session/run | turn metrics kind 44200 | usage stores per provider (Claude/Codex/OpenCode), rate-limit fetchers |
| Approval/safety layer for real actions | Field Ops: autonomy levels, spend limits, circuit breaker, vault | branch protections enforced at git transport; moderation commands | plugin consent gating, kill list, E2EE pairing trust |
| Encrypted secrets | AES-256-GCM vault + scrypt + sessions | OS keyring (desktop), ncryptsec backups | Keychain/keyring secret store, ai-vault process isolation plan |
| Audit trail | activity-log.json (+field log) | hash-chain tamper-evident audit log | activity timeline, crash breadcrumbs, telemetry |
| CLI built for agents | token-optimized REST API (~92% compression claims) | buzz-cli JSON in/out, exit codes, compact format | fabrica CLI --json everywhere, formatters |
| Scheduled automation | daemon cron schedules (daily-plan/standup/weekly-review) | workflow schedule triggers (cron ticks) | automations service (scheduled/triggered dispatch) |
| Skills/personas as data | skills-library.json injected into prompts | .persona.md packs + teams | SKILL.md discovery + bundled skills + persona packs (managed agents) |
| Memory for agents | task notes + ai-context.md snapshot | engrams (kind 30174) + mem CLI | AI Vault session history + resume |

### 1.2 Shared architectural patterns
1. **Single source of truth**: MC = JSON files · BZ = relay event log · FA = runtime live graph. All three reject distributed complexity in favor of one authoritative store.
2. **Spawn-and-track child processes** for agent execution (MC: claude -p detached self-continuing chains; BZ: ACP stdio subprocess pool; FA: PTY-resident TUI CLIs). All three do PID liveness checks and reconcile dead processes.
3. **Hooks/status reporting plane**: MC installs hooks into agent CLIs reporting to loopback server; FA does exactly the same (agent-hooks loopback); BZ gets status via the event stream itself.
4. **Provider/adapter abstraction**: MC ServiceAdapter (validate→execute→healthCheck→financials, dry-run, never-throw); FA PTY/filesystem/git provider contracts (local/SSH/daemon); BZ transport-agnostic event kinds.
5. **Optimistic UI + polling with visibility gating** (MC hooks) vs live subscription fan-out (BZ) vs RPC streaming (FA).
6. **Zod/schema validation at boundaries** (MC Zod everywhere; FA zod contracts + admission validators; BZ Schnorr signatures as the ultimate validation).
7. **Graceful degradation everywhere** (MC daemon fallbacks; FA daemon→local PTY, GPU fallback; BZ fail-closed tenancy).

---

## 2. Gaps — What MC/BZ Have That Fabrica-app Lacks

### 2.1 From mission-control (business/operator side)
| Gap | What it is | Value for Fabrica's transformation |
|---|---|---|
| G-MC-1 | **Eisenhower prioritization layer** (importance×urgency on all work, DO/SCHEDULE/DELEGATE/ELIMINATE) | Business builders think in priorities, not git branches. A priority/triage surface over agent work is missing in FA |
| G-MC-2 | **Goal hierarchy** (long-term goals → milestones → tasks with computed progress) | FA has tasks/worktrees but no objective tree linking agent work to business outcomes |
| G-MC-3 | **Brain dump → auto-triage** (capture raw ideas, AI converts to structured tasks) | Zero-friction intake for non-coder operators |
| G-GC-4 | **Decision queue as first-class UI primitive** (options + custom answer, blocks dependents) | FA has orchestration gates but no dedicated human-decision inbox UX |
| G-MC-5 | **Field Ops safety stack**: autonomy levels (manual/supervised/full), per-service + global spend budgets (day/week/month), circuit breaker, approval workflows w/ risk classification, dry-run testing | The complete "let agents act in the real world safely" blueprint — directly reusable for business operations (payments, email, social) |
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
| G-BZ-4 | **Agent harness patterns**: @mention→queue→batched prompt→ACP pool w/ heartbeats, respond-to allowlists, effort levels | Sophisticated prompt-farming discipline beyond FA's current per-pane model |
| G-BZ-5 | **Remote agents** (identity/history on relay, body replaceable, one-way launch handoff, control via messages, self-reaping) | FA has SSH worktrees but not "close the laptop, agent keeps working, resurrect later" |
| G-BZ-6 | **Agent memory as addressable events** (engrams + mem CLI ls/get/hash/set/patch/rm) | Durable, queryable agent memory beyond FA's session-vault |
| G-BZ-7 | **Activity feed UX theory** (sentence-per-item, outcome-first, mutate-in-place, 12 render classes, deliberate suppression) | Best-in-class design language for "what is my agent doing" — upgrade FA's terminal-centric view for operators |
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
| E4 | **Brain Dump → any agent** | MC brain-dump triage + FA agent fleet | Capture an idea; triage agent splits it into coding tasks (worktrees) and ops tasks (field tasks) automatically |
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

## 4. Relevance Map — what matters most for the transformation goal

Goal: *desktop CLI agent management and operations platform for business AND coding builders/operators.*

**Tier 1 (defines the new product):**
- MC Field Ops safety stack + adapters (G-MC-5/6/7) — the "operations" half
- MC prioritization/goals/brain-dump (G-MC-1/2/3) — the "management" half for non-coders
- BZ activity-feed UX (G-BZ-7) — makes delegation legible
- FA orchestration engine + worktrees (existing) — the execution backbone

**Tier 2 (differentiators):**
- Decision inbox everywhere (E3) · Unified activity feed (E5) · Spend governor (E10)
- BZ agent identity/attribution (G-BZ-1) · Engram memory (E7)

**Tier 3 (later/platform):**
- Remote resident agents (E11) · Mesh compute (G-BZ-12) · Voice huddles (E12) · Multi-tenant formal isolation (G-BZ-9) · Reputation/web-of-trust (G-BZ-11)

**Anti-goals detected (do NOT import):**
- BZ's Nostr-relay-as-workspace architecture (FA already has its own runtime/RPC; adopt concepts, not the relay)
- MC's JSON-file persistence at scale (fine for MC's scope; FA's stores are stronger)
- BZ multi-community tenancy (single-operator product today)

---
*Sources: three verified discovery docs. This analysis is Round 1 depth; Round 2 should deepen per-feature mapping (function-level) once direction is chosen.*

## ROUND 2 ADDENDUM — refinements from function-level deep dives

Deep dives on FA orchestration/RPC, buzz-relay internals, and MC test contracts refined several entries:

1. **E3 Decision Inbox is closer than assessed**: FA's orchestration already has durable DecisionGateRow + gateCreate/gateResolve RPC + human-only resolution invariant + resolved-gate context injection into worker preambles, plus `ask` (blocking question) and QuestionRow with answer threading. MC's decision-queue UX concepts map almost 1:1 onto existing FA primitives — Phase A/C work is mostly surface, not engine.
2. **E5 Activity Feed has a data source ready-made**: worker transcripts + output archives (transcript pins / ≤256KB redacted terminal tails captured before PTY close) + heartbeat phases (investigating|implementing|reviewing|waiting) give exactly the verb/object/outcome material BZ's render-class theory needs.
3. **Authority model discovered (FA)**: lifecycle settlement requires sender pane-key authority — payload knowledge alone never settles a dispatch. This is FA's native equivalent of MC owner-guard/BZ signed identity; production architecture should extend it rather than import MC's verbatim.
4. **Federation already exists**: FederatedDispatch + pull/ack/import relay protocol means E11 (remote resident agents) has a foundation in FA itself, not just BZ's design.
5. **Idempotency pattern worth generalizing**: mutation receipts ((callerFingerprint, requestId) → canonicalized payload hash, replay returns recorded receipt) should back all new Operations Plane mutations.
6. **BZ git-on-object-storage** (content-addressed packs + single-pointer ETag CAS + startup conformance probe): relevant only if Fabrica ever hosts repos; logged as platform-tier reference, not adopted.
7. **MC tests as spec**: the 193 tests pin behavioral contracts (scrub patterns, fence escaping, config ranges, end-to-end agent flow). When porting MC subsystems, port the tests first — they are the precise specification.
8. **RPC capability gates** (capabilities negotiated at auth, bound to socket, never request-asserted) are the right enforcement point for agent-vs-owner distinctions in the Operations Plane (e.g., spend-limit changes gated to owner-class callers).

Round-2 verification spot checks passed: db.ts 6,495 lines exact · ingest.rs 4,848 lines exact · MessageType enum values confirmed in types.ts · RPC registration surface confirmed large (hundreds of name: registrations across methods/).

## Round 4 Addendum — merging Round 2+3 findings into the cross-repo picture

> Inputs: all 7 reports in `.Fabrica-atlas-board/discovery/round3/round3/` (ai-vault-browser.md · fabrica-app-plugins.md · fabrica-app-renderer.md · fabrica-app-main-subsystems.md · buzz-desktop.md · buzz-agent-crates.md · mc-frontend-buzz-clients.md) + the ROUND 2/3 ADDENDUM sections at the end of `discovery/mission-control-discovery.md`, `discovery/buzz-discovery.md`, `discovery/fabrica-app-discovery.md`. Underlying source path:line cites are quoted from those reports. Append-only refresh; §1–4 above stand unchanged except where explicitly refined below.

### R4.1 Newly confirmed Fabrica-app capabilities (upgrade several earlier assessments)

| # | Capability (confirmed R2/R3) | Evidence | Effect on earlier rows |
|---|---|---|---|
| C1 | **Agent memory/resume is far stronger than §2.3 implied**: AI Vault parses sessions of 16 named CLI agents off a single source-of-truth agent-source table driving BOTH discovery and delete validation (`src/main/ai-vault/session-scanner-agent-sources.ts`, per round3/ai-vault-browser.md:25-26); byte-offset incremental parse cache (LRU 4096 entries, valid on platform+mtime+size) makes rescans O(append) not O(gigabytes) (round3/ai-vault-browser.md:70-74); persisted cache written debounced 1500ms temp+atomic-rename, corrupt file discarded whole (round3/ai-vault-browser.md:77); resume prep incl. Codex home substitution (round3/ai-vault-browser.md:116-117); relay-first SSH remote scan with honest-error semantics — broken relay ≠ empty host (round3/ai-vault-browser.md:121-123) | **E7 Engram memory service** has a production-grade base already covering 17+ CLIs; only cross-agent sharing/addressability is missing |
| C2 | **Plugin system is a ready adapter extension point for the Operations Plane**: CLOSED capability set + consent fingerprint sha256 binding capabilities+trusted-tier+content identity (round3/fabrica-app-plugins.md:11-12); out-of-process worker lifecycle — READY 10s / INVOKE 30s / EVENT 5min timeouts, supervisor backoff [500,2000,5000]ms max 3 restarts, idle reap 5min, slot pool default 5 (round3/fabrica-app-plugins.md:20-27); single chokepoint `executeHostCall` with audit-record AWAITED BEFORE handler (audit unavailable ⇒ refused) (round3/fabrica-app-plugins.md:35-39); marketplace provenance + kill list consulted twice (at approval AND after awaited verifications) (round3/fabrica-app-plugins.md:45-60) | **E2 Field Ops inside Fabrica** should ship MC-style adapters AS plugins, inheriting consent/audit/revocation instead of rebuilding them |
| C3 | **Browser is a vetted headless adapter-executor**: `agent-browser-bridge.ts` (~2,770 ln) wraps a platform binary consuming screenshot/click/fill/pdf/cookies/intercept over CDP WS proxy with refcounted debugger leases (round3/ai-vault-browser.md:164-165); offscreen backend proves headless `FABRICA serve` works without UI (1280×800 never-shown windows, sandboxed) (round3/ai-vault-browser.md:169); deny-by-default permissions + fail-closed cert trust controller (round3/ai-vault-browser.md:144-149) | Web-target Operations Plane actions (post/publish/pay flows) have an existing programmatic surface — E2 confirmed feasible end-to-end |
| C4 | **Fleet-status data source exists**: renderer agent-completion coordinator fuses hook states + title transitions + process-exit inspection into per-pane working/waiting/done with cadence tiers (active 750ms / idle 2000ms / hidden 3000ms / none 15000ms) and dedup keys (round3/fabrica-app-renderer.md §1.2); OSC 9999 agent-status stream parsed out-of-band before xterm (round3/fabrica-app-renderer.md §1); `store/slices/agent-status.ts` keys live status per tabId:leafId incl. sleeping-agent capture for one-click resume (round3/fabrica-app-renderer.md §7) | **E5 Unified Activity Feed** needs no new telemetry plumbing — promote these renderer-internal signals to first-class RPC events |
| C5 | **Cross-cutting reliability grammar confirmed app-wide** (round3/fabrica-app-main-subsystems.md closing summary): every execution subsystem built on generation counters, fail-closed liveness proofs, atomic claim-rename-restore file protocols, and single-flight marker-gated background jobs (also stated in discovery/fabrica-app-discovery.md ROUND 3 ADDENDUM, cross-cutting finding) | Validates Round-2 refinement #5 (idempotency receipts) as a house style — new Operations Plane code must follow it |

### R4.2 New gaps identified by Round 3 (additions to §2)

From buzz (round3/buzz-desktop.md + round3/buzz-agent-crates.md):
| Gap | What it is | Value |
|---|---|---|
| G-BZ-15 | **Managed-agent spawn/readiness/supervision lifecycle**: readiness computed BEFORE spawn from effective env (`readiness.rs:402`), setup payload injected as fallback boot mode; atomic runtime receipt with child killed on receipt-write failure (`runtime.rs:978-982`); `BUZZ_MANAGED_AGENT=<instance_id>` env marker is sole ownership proof for orphan sweeps (`orphan_sweep.rs:110-119`); SIGTERM→≤1s→SIGKILL whole-process-group termination (`process.rs:281`); auto-restart policy with 3-min quiescence window is the only guard against killing mid-turn agents (`autoRestartPolicy.ts:6-9`) | The precise local fleet-supervisor blueprint FA lacks; complements G-BZ-5 (remote resident agents) |
| G-BZ-16 | **ACP subprocess-pool discipline** (~40K lines, crates report :11): slot-preserving pool with compile-enforced claim/return ownership (non-Clone clients, `pool.rs:34`); session affinity on try_claim; single in-flight batch per channel with FIFO fairness by oldest received_at; batches stable-sorted by created_at to fix newest-first relay replay ordering (`queue.rs:346-350`); hard deadline SHARED between prompt and cancel-drain ("prevents double-jeopardy", acp.rs); 10MB stdout line bound vs rogue agents | Directly transferable numbers/mechanics for any multi-agent subprocess pool in FA |
| G-BZ-17 | **Client reconnect/replay resilience**: visible-channel prioritized replay, pinned replay cursors, burst shaping (batches of 8 @50ms), degrade-to-live-only instead of tearing down healthy sockets, PASSIVE stall watchdog (deliberately no ping probes — documented rationale), rate-limit gates mirrored TS/Rust with identical semantics (round3/buzz-desktop.md A6) | Template for FA mobile/web surfaces watching long-running agents over flaky links |
| G-BZ-18 | **Workflow approval-suspension token design** — engine returns `StepResult::Suspended{approval_token}` and caller persists state, BUT resume is plumbed-yet-unwired ("WF-08") (round3/buzz-agent-crates.md:138-139) | Blueprint for E9 Automations v2 approval steps AND a cautionary seam: finish the resume path FA-side |
| G-BZ-19 | **Voice stack concretes**: plain WS+Opus 32kbps transport (not WebRTC), per-peer NetEq jitter buffers, four independent barge-in triggers converging on one shared cancel atomic, offline Parakeet STT + Pocket TTS (round3/buzz-desktop.md A5) | Upgrades E12 from concept to implementable spec if pursued |

From mission-control (round3/mc-frontend-buzz-clients.md):
| Gap | What it is | Value |
|---|---|---|
| G-MC-11 | **Field-Ops frontend UX primitives, component-level confirmed**: autonomy selector requiring master-password dialog for changes, full-autonomy tier red + pulsing (:47-48); approvals page with client-side risk classification doubling stat-cards-as-filters + Set-based multi-select + ONE batch endpoint + succeeded/failed toast, reject reusing one dialog via `{id:"__batch__"}` sentinel (:55-58); vault-unlock pending-action stash-and-replay pattern on mission detail page (843 ln) (:76-84); circuit-breaker red card + Pause button at ≥3 consecutive failures (:85); safety page spend bars (>80% red, >50% amber) with owner-only "agents cannot change safety limits" banner (:96) | The exact operator-cockpit UX for Decision Inbox (E3) and Spend Governor (E10) — engine work in FA is done (Round-2 ref #1); this is the surface spec |
| G-MC-12 | **Generic optimistic-CRUD hook factories**: `useDataResource` (use-data.ts:10-217) — visibility-gated polling, optimistic update with refetch-revert, 5s undo-toast soft-delete, bulk atomic ops; poll cadences tasks 15s / decisions 10s / activity 30s (mc-frontend-buzz-clients.md:17-24) | Interaction contract for all new Management Plane pages |

### R4.3 Refinements to extensions (§3)

1. **E2 (Field Ops)**: implementation route now concrete — MC adapter interface (validate→execute→healthCheck→financials, never-throw, dry-run) executed inside FA plugin workers (C2 time-outs/backoff/consent/audit inherited), with web-target services driven through the browser bridge (C3) and credentials via electron safeStorage with NO plaintext fallback (round3/fabrica-app-plugins.md:41-43). MC's own frontend confirms the control surface (G-MC-11).
2. **E3 (Decision Inbox)**: MC approvals page IS the spec — risk-classified filters, batch approve/reject, mandatory rejection feedback (G-MC-11); FA side already has durable gates + human-only resolution (Round-2 ref #1). Add buzz's management-op buffering pattern (buffer ≤100 requests while ownership unknown, replay+dedupe later, re-verify at submit — round3/buzz-desktop.md A3) for race-safe intake.
3. **E5 (Activity Feed)**: three confirmed data layers compose it: FA completion-coordinator events (C4) + native-chat transcript pipeline (windowed seed 300 turns, live tail, epoch fencing, oracle-tested incremental assembler — round3/fabrica-app-renderer.md §5) + MC's typed-event presentation (21 event-type label/color maps, ~28 labeled metadata keys, expandable rows, category prefixes, relative-time ladder — round3/mc-frontend-buzz-clients.md:50,90).
4. **E7 (Memory)**: rebase on AI Vault (C1) rather than building engram storage from scratch; borrow buzz's watermark/composite-cursor trick making replays no-ops (per-(agent,channel) `lastProcessed` watermark — round3/buzz-desktop.md A2) for consistency.
5. **E9 (Automations v2)**: trigger set confirmed in code — message_posted(evalexpr filter), reaction_added, schedule(cron XOR ≥60s interval), webhook, DiffPosted; authority derived from signature pubkey never actor tags; webhook SSRF check + 1MB response cap; condition eval 100ms hard timeout, fail-closed (round3/buzz-agent-crates.md:124-140). Wire the approval-resume FA-side (G-BZ-18).
6. **E11 (Remote resident agents)**: FA SSH infra is deeper than Round-1 knew — versioned immutable `.FABRICA-remote/relay-<fullVersion>` deploy dirs, SFTP staging slots 0..7, readiness polled by net.connect proving accept, install locks with remote-clock staleness, GC tombstones (round3/fabrica-app-main-subsystems.md §3); combine with BZ spawn/receipt/supervision lifecycle (G-BZ-15).
7. **New E15 — Fleet Supervisor Service**: FA daemon PTY resilience (framed OCKL output logs torn-append-safe, checkpoint.json ≤200MB cold restore preferring byte-exact log replay, tombstones blocking reattach to killed sessions, incarnationIds discarding stale generations, ConPTY warmup paying ~2.7s at boot, macOS login-death retirement — round3/fabrica-app-main-subsystems.md §4) + detached Codex pane restart sweeps running while unmounted (round3/fabrica-app-renderer.md §1.3) + BZ G-BZ-15 lifecycle = a unified local/remote agent supervisor neither repo has alone.

### R4.4 New cross-cutting similarity (extends §1.2)

8. **Deny-by-default security posture is common to all three repos**: FA env allowlists that NEVER spread process.env (round3/ai-vault-browser.md:88; round3/fabrica-app-plugins.md:21), realpath containment + symlink refusal (both reports), host-derived trust never self-awarded (round3/fabrica-app-plugins.md:50,74); buzz env_clear()+allowlist MCP sandboxing and fail-closed evalexpr filter evaluation (round3/buzz-agent-crates.md:83,53); MC buildSafeEnv allowlist + strict schema rejection pinned by tests (discovery/mission-control-discovery.md ROUND 2 ADDENDUM R2.1). Production rule: every new boundary copies this posture.

### R4.5 Scan coverage for this addendum

Read fully: all 7 round3 reports (via structured digestion of each complete file) + ROUND 2/3 ADDENDUM sections of the three main discovery docs (buzz-discovery.md:316-323, fabrica-app-discovery.md:213-225, mission-control-discovery.md:376-381). Not re-read: Round-1 bodies of the discovery docs (unchanged, verified in Rounds 1-2), verify/ outputs, `_sources/` directly (all cites taken from the round3 reports' recorded path:line evidence; spot verification of those cites is R4-2.1's task, separate worker).

