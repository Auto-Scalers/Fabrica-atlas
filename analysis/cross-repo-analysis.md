# Cross-Repo Analysis — Similarity Analysis × Agent-Platform Integration Map

> Combines content from `similarities-gaps.md` (similarity/gap analysis across mission-control, buzz, and Fabrica-app) with `agent-platform-integration-map.md` (five-subsystem composition map of Fabrica's agent platform). This document preserves the sections most relevant to the transformation goal: what overlaps, what FA already has, what gaps matter, what the platform's internal architecture looks like, and what the shared contracts are.
>
> Excluded sections (already synthesized into roadmap/task-notes or duplicated elsewhere): `similarities-gaps.md` §2 (Gaps), §3 (Extensions); `integration-map.md` §3 (Composition Map), §5 (Extension Points), §6 (Integration Risks), §7 (What Is Missing).

---

# Part I — Similarity & Relevance Analysis

*Source: `similarities-gaps.md`*

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

---

## Round 4 Addendum — merging Round 2+3 findings into the cross-repo picture

> Inputs: all 7 reports in `discovery/` (ai-vault-browser.md · fabrica-app-plugins.md · fabrica-app-renderer.md · fabrica-app-main-subsystems.md · buzz-desktop.md · buzz-agent-crates.md · mc-frontend-buzz-clients.md) + the ROUND 2/3 ADDENDUM sections at the end of `discovery/mission-control-discovery.md`, `discovery/buzz-discovery.md`, `discovery/fabrica-app-discovery.md`. Underlying source path:line cites are quoted from those reports. Append-only refresh; §1–4 above stand unchanged except where explicitly refined below.

### R4.1 Newly confirmed Fabrica-app capabilities (upgrade several earlier assessments)

| # | Capability (confirmed R2/R3) | Evidence | Effect on earlier rows |
|---|---|---|---|
| C1 | **Agent memory/resume is far stronger than §2.3 implied**: AI Vault parses sessions of 16 named CLI agents off a single source-of-truth agent-source table driving BOTH discovery and delete validation (`src/main/ai-vault/session-scanner-agent-sources.ts`, per discovery/fabrica-app/ai-vault-browser.md:25-26); byte-offset incremental parse cache (LRU 4096 entries, valid on platform+mtime+size) makes rescans O(append) not O(gigabytes) (discovery/fabrica-app/ai-vault-browser.md:70-74); persisted cache written debounced 1500ms temp+atomic-rename, corrupt file discarded whole (discovery/fabrica-app/ai-vault-browser.md:77); resume prep incl. Codex home substitution (discovery/fabrica-app/ai-vault-browser.md:116-117); relay-first SSH remote scan with honest-error semantics — broken relay ≠ empty host (discovery/fabrica-app/ai-vault-browser.md:121-123) | **E7 Engram memory service** has a production-grade base already covering 17+ CLIs; only cross-agent sharing/addressability is missing |
| C2 | **Plugin system is a ready adapter extension point for the Operations Plane**: CLOSED capability set + consent fingerprint sha256 binding capabilities+trusted-tier+content identity (discovery/fabrica-app/fabrica-app-plugins.md:11-12); out-of-process worker lifecycle — READY 10s / INVOKE 30s / EVENT 5min timeouts, supervisor backoff [500,2000,5000]ms max 3 restarts, idle reap 5min, slot pool default 5 (discovery/fabrica-app/fabrica-app-plugins.md:20-27); single chokepoint `executeHostCall` with audit-record AWAITED BEFORE handler (audit unavailable ⇒ refused) (discovery/fabrica-app/fabrica-app-plugins.md:35-39); marketplace provenance + kill list consulted twice (at approval AND after awaited verifications) (discovery/fabrica-app/fabrica-app-plugins.md:45-60) | **E2 Field Ops inside Fabrica** should ship MC-style adapters AS plugins, inheriting consent/audit/revocation instead of rebuilding them |
| C3 | **Browser is a vetted headless adapter-executor**: `agent-browser-bridge.ts` (~2,770 ln) wraps a platform binary consuming screenshot/click/fill/pdf/cookies/intercept over CDP WS proxy with refcounted debugger leases (discovery/fabrica-app/ai-vault-browser.md:164-165); offscreen backend proves headless `FABRICA serve` works without UI (1280×800 never-shown windows, sandboxed) (discovery/fabrica-app/ai-vault-browser.md:169); deny-by-default permissions + fail-closed cert trust controller (discovery/fabrica-app/ai-vault-browser.md:144-149) | Web-target Operations Plane actions (post/publish/pay flows) have an existing programmatic surface — E2 confirmed feasible end-to-end |
| C4 | **Fleet-status data source exists**: renderer agent-completion coordinator fuses hook states + title transitions + process-exit inspection into per-pane working/waiting/done with cadence tiers (active 750ms / idle 2000ms / hidden 3000ms / none 15000ms) and dedup keys (discovery/fabrica-app/fabrica-app-renderer.md §1.2); OSC 9999 agent-status stream parsed out-of-band before xterm (discovery/fabrica-app/fabrica-app-renderer.md §1); `store/slices/agent-status.ts` keys live status per tabId:leafId incl. sleeping-agent capture for one-click resume (discovery/fabrica-app/fabrica-app-renderer.md §7) | **E5 Unified Activity Feed** needs no new telemetry plumbing — promote these renderer-internal signals to first-class RPC events |
| C5 | **Cross-cutting reliability grammar confirmed app-wide** (discovery/fabrica-app/fabrica-app-main-subsystems.md closing summary): every execution subsystem built on generation counters, fail-closed liveness proofs, atomic claim-rename-restore file protocols, and single-flight marker-gated background jobs (also stated in discovery/fabrica-app-discovery.md ROUND 3 ADDENDUM, cross-cutting finding) | Validates Round-2 refinement #5 (idempotency receipts) as a house style — new Operations Plane code must follow it |

### R4.2 New gaps identified by Round 3 (additions to §2)

From buzz (discovery/buzz/buzz-desktop.md + discovery/buzz/buzz-agent-crates.md):
| Gap | What it is | Value |
|---|---|---|
| G-BZ-15 | **Managed-agent spawn/readiness/supervision lifecycle**: readiness computed BEFORE spawn from effective env (`readiness.rs:402`), setup payload injected as fallback boot mode; atomic runtime receipt with child killed on receipt-write failure (`runtime.rs:978-982`); `BUZZ_MANAGED_AGENT=<instance_id>` env marker is sole ownership proof for orphan sweeps (`orphan_sweep.rs:110-119`); SIGTERM→≤1s→SIGKILL whole-process-group termination (`process.rs:281`); auto-restart policy with 3-min quiescence window is the only guard against killing mid-turn agents (`autoRestartPolicy.ts:6-9`) | The precise local fleet-supervisor blueprint FA lacks; complements G-BZ-5 (remote resident agents) |
| G-BZ-16 | **ACP subprocess-pool discipline** (~40K lines, crates report :11): slot-preserving pool with compile-enforced claim/return ownership (non-Clone clients, `pool.rs:34`); session affinity on try_claim; single in-flight batch per channel with FIFO fairness by oldest received_at; batches stable-sorted by created_at to fix newest-first relay replay ordering (`queue.rs:346-350`); hard deadline SHARED between prompt and cancel-drain ("prevents double-jeopardy", acp.rs); 10MB stdout line bound vs rogue agents | Directly transferable numbers/mechanics for any multi-agent subprocess pool in FA |
| G-BZ-17 | **Client reconnect/replay resilience**: visible-channel prioritized replay, pinned replay cursors, burst shaping (batches of 8 @50ms), degrade-to-live-only instead of tearing down healthy sockets, PASSIVE stall watchdog (deliberately no ping probes — documented rationale), rate-limit gates mirrored TS/Rust with identical semantics (discovery/buzz/buzz-desktop.md A6) | Template for FA mobile/web surfaces watching long-running agents over flaky links |
| G-BZ-18 | **Workflow approval-suspension token design** — engine returns `StepResult::Suspended{approval_token}` and caller persists state, BUT resume is plumbed-yet-unwired ("WF-08") (discovery/buzz/buzz-agent-crates.md:138-139) | Blueprint for E9 Automations v2 approval steps AND a cautionary seam: finish the resume path FA-side |
| G-BZ-19 | **Voice stack concretes**: plain WS+Opus 32kbps transport (not WebRTC), per-peer NetEq jitter buffers, four independent barge-in triggers converging on one shared cancel atomic, offline Parakeet STT + Pocket TTS (discovery/buzz/buzz-desktop.md A5) | Upgrades E12 from concept to implementable spec if pursued |

From mission-control (discovery/mission-control/mc-frontend-buzz-clients.md):
| Gap | What it is | Value |
|---|---|---|
| G-MC-11 | **Field-Ops frontend UX primitives, component-level confirmed**: autonomy selector requiring master-password dialog for changes, full-autonomy tier red + pulsing (:47-48); approvals page with client-side risk classification doubling stat-cards-as-filters + Set-based multi-select + ONE batch endpoint + succeeded/failed toast, reject reusing one dialog via `{id:"__batch__"}` sentinel (:55-58); vault-unlock pending-action stash-and-replay pattern on mission detail page (843 ln) (:76-84); circuit-breaker red card + Pause button at ≥3 consecutive failures (:85); safety page spend bars (>80% red, >50% amber) with owner-only "agents cannot change safety limits" banner (:96) | The exact operator-cockpit UX for Decision Inbox (E3) and Spend Governor (E10) — engine work in FA is done (Round-2 ref #1); this is the surface spec |
| G-MC-12 | **Generic optimistic-CRUD hook factories**: `useDataResource` (use-data.ts:10-217) — visibility-gated polling, optimistic update with refetch-revert, 5s undo-toast soft-delete, bulk atomic ops; poll cadences tasks 15s / decisions 10s / activity 30s (mc-frontend-buzz-clients.md:17-24) | Interaction contract for all new Management Plane pages |

### R4.3 Refinements to extensions (§3)

1. **E2 (Field Ops)**: implementation route now concrete — MC adapter interface (validate→execute→healthCheck→financials, never-throw, dry-run) executed inside FA plugin workers (C2 time-outs/backoff/consent/audit inherited), with web-target services driven through the browser bridge (C3) and credentials via electron safeStorage with NO plaintext fallback (discovery/fabrica-app/fabrica-app-plugins.md:41-43). MC's own frontend confirms the control surface (G-MC-11).
2. **E3 (Decision Inbox)**: MC approvals page IS the spec — risk-classified filters, batch approve/reject, mandatory rejection feedback (G-MC-11); FA side already has durable gates + human-only resolution (Round-2 ref #1). Add buzz's management-op buffering pattern (buffer ≤100 requests while ownership unknown, replay+dedupe later, re-verify at submit — discovery/buzz/buzz-desktop.md A3) for race-safe intake.
3. **E5 (Activity Feed)**: three confirmed data layers compose it: FA completion-coordinator events (C4) + native-chat transcript pipeline (windowed seed 300 turns, live tail, epoch fencing, oracle-tested incremental assembler — discovery/fabrica-app/fabrica-app-renderer.md §5) + MC's typed-event presentation (21 event-type label/color maps, ~28 labeled metadata keys, expandable rows, category prefixes, relative-time ladder — discovery/mission-control/mc-frontend-buzz-clients.md:50,90).
4. **E7 (Memory)**: rebase on AI Vault (C1) rather than building engram storage from scratch; borrow buzz's watermark/composite-cursor trick making replays no-ops (per-(agent,channel) `lastProcessed` watermark — discovery/buzz/buzz-desktop.md A2) for consistency.
5. **E9 (Automations v2)**: trigger set confirmed in code — message_posted(evalexpr filter), reaction_added, schedule(cron XOR ≥60s interval), webhook, DiffPosted; authority derived from signature pubkey never actor tags; webhook SSRF check + 1MB response cap; condition eval 100ms hard timeout, fail-closed (discovery/buzz/buzz-agent-crates.md:124-140). Wire the approval-resume FA-side (G-BZ-18).
6. **E11 (Remote resident agents)**: FA SSH infra is deeper than Round-1 knew — versioned immutable `.FABRICA-remote/relay-<fullVersion>` deploy dirs, SFTP staging slots 0..7, readiness polled by net.connect proving accept, install locks with remote-clock staleness, GC tombstones (discovery/fabrica-app/fabrica-app-main-subsystems.md §3); combine with BZ spawn/receipt/supervision lifecycle (G-BZ-15).
7. **New E15 — Fleet Supervisor Service**: FA daemon PTY resilience (framed OCKL output logs torn-append-safe, checkpoint.json ≤200MB cold restore preferring byte-exact log replay, tombstones blocking reattach to killed sessions, incarnationIds discarding stale generations, ConPTY warmup paying ~2.7s at boot, macOS login-death retirement — discovery/fabrica-app/fabrica-app-main-subsystems.md §4) + detached Codex pane restart sweeps running while unmounted (discovery/fabrica-app/fabrica-app-renderer.md §1.3) + BZ G-BZ-15 lifecycle = a unified local/remote agent supervisor neither repo has alone.

### R4.4 New cross-cutting similarity (extends §1.2)

8. **Deny-by-default security posture is common to all three repos**: FA env allowlists that NEVER spread process.env (discovery/fabrica-app/ai-vault-browser.md:88; discovery/fabrica-app/fabrica-app-plugins.md:21), realpath containment + symlink refusal (both reports), host-derived trust never self-awarded (discovery/fabrica-app/fabrica-app-plugins.md:50,74); buzz env_clear()+allowlist MCP sandboxing and fail-closed evalexpr filter evaluation (discovery/buzz/buzz-agent-crates.md:83,53); MC buildSafeEnv allowlist + strict schema rejection pinned by tests (discovery/mission-control-discovery.md ROUND 2 ADDENDUM R2.1). Production rule: every new boundary copies this posture.

---

# Part II — Agent-Platform Integration Map

*Source: `agent-platform-integration-map.md`*

## 1. Executive Summary

Fabrica-app already contains a coherent **agent-capability platform**, assembled from five independently deep subsystems that share real contracts rather than merely coexisting:

1. **IPC surface** — the nervous system: 344 `ipcMain.handle` registrations / 342 unique channels across 65 files, funneled through ONE preload bridge (656 invoke sites, 76 namespaces) behind an audited registration hub (`fa-ipc-watchers.md` §1, §2.2).
2. **PTY plane** — the execution substrate where every agent actually runs: three-plane system (local node-pty / SSH relay / xterm.js renderer) behind one deliberately monolithic audited broker (`ipc/pty.ts`, 7,745 lines) with agent-first primitives: `launchAgent` spawns, owner-adoption registry, OSC-133 lifecycle signals, incarnation-id kill semantics (`fa-pty-terminal.md` §1, §2.1, §6, §9).
3. **Agent-hooks plane** — the observation substrate: a loopback HTTP receiver inside main that 18 `/hook/<source>` pathnames feed turn-state events into; normalized, persisted, pushed to UI with zero polling (`fa-agent-hooks-probes.md` §1, §2, §7).
4. **Plugin host runtime** — the extension substrate: one forked Node child per plugin, zod-walled protocol both directions, consent-gated host calls through ONE chokepoint chain, supervised FSM with backoff, FIFO slot pool capped at 5 (`fa-plugin-runtime.md` S1–S9).
5. **Command palette / keyboard layer** — the operator control surface: one unified Cmd+J palette over seven result families, an ~85-action keybinding registry with auto-generated per-agent and plugin chord families, and saved agent-prompt quick commands wired end-to-end to the launch engine (`fa-command-palette-search.md` §0, §2.1, §7).

The platform composes along four verified flows (§3: launch, observe, extend, command). Its contracts (§4) — `<namespace>:<action>` channels, `TUI_AGENT_CONFIG` profile table, `paneKey` composite identity, `FABRICA_*` env vars, plugin manifest contributions — are shared by two or more subsystems each, meaning changes propagate predictably but also that renames are three-layer migrations (digest FA-T11, `round4-findings-digest.md:134`).

The honest verdict: this is a best-in-class **single-host agent desktop** substrate. It is NOT yet a fleet-supervision platform: it lacks durable run/task persistence, approval/decision gates, spend enforcement, readiness-gated spawn, orphan sweeps, and restart-policy supervision — precisely the layers mission-control (workflow engine, guards, decision gates) and buzz (SQL quartet, managed-agent supervisor lifecycle) provide, mapped in §7.

---

## 2. The Five Subsystems at a Glance (role + anchor facts)

| # | Subsystem | Role in the platform | Anchor facts | Report |
|---|---|---|---|---|
| 1 | IPC surface | Transport backbone; every other subsystem exposes itself through it | 344 handle registrations / 342 unique channels / 65 files; 33 `.on` fire-and-forget channels; 656 preload invoke sites / 76 namespaces; register-once hub `register-core-handlers.ts:109-234` | `fa-ipc-watchers.md` §1, §3 |
| 2 | PTY plane | Where agent CLIs execute; identity, flow control, persistence, kill semantics | Broker `registerPtyHandlers()` at `src/main/ipc/pty.ts:2370`; spawn args carry `launchAgent/resumeProviderSession/connectionId/worktreeId/tabId/leafId` (:5790-5825); `incarnationId = randomUUID()` per spawn | `fa-pty-terminal.md` §1, §2.1 |
| 3 | Agent-hooks | Turn-state ingestion from inside agent CLIs; zero polling | Loopback `AgentHookServer` on ephemeral 127.0.0.1 port; 14 managed install targets vs 18 live `/hook/*` pathnames; states `working/blocked/waiting/done`; 30-min staleness TTL | `fa-agent-hooks-probes.md` §1, §3 |
| 4 | Plugin runtime | Third-party code execution + capability-gated host services + event triggers | Fork per plugin key (`ELECTRON_RUN_AS_NODE=1`, empty execArgv, env allowlist); zod both directions; host-call chokepoint `plugin-service.ts:250-272` → `plugin-host-methods.ts:31-118`; slot pool max 5 FIFO | `fa-plugin-runtime.md` S1, S3, S7, S9 |
| 5 | Palette/keybindings | Operator entry point; how humans invoke everything above | One palette component (3,153 lines) merging 7 result families; ~85 base action ids + `tab.newAgent.<agent>` + `plugin:<key>/<id>` dynamic families; agent quick commands persist + RPC-sync + launch | `fa-command-palette-search.md` §0, §1, §6.2 |

---

## 4. Shared Contracts (the glue — who owns what)

| Contract | Defined at | Consumed by | Evidence |
|---|---|---|---|
| `<namespace>:<action>` channel strings | main handlers (65 files) + preload bridge | renderer (~78 namespaces), web stub proxy (`web-preload-api.ts:509-514`) | ipc §1, §3, §6.1, §8.4 ("PUBLIC CONTRACT") |
| `TUI_AGENT_CONFIG` (~31 entries) | `shared/tui-agent-config.ts:49-331` | launcher engine, hook presence probe, palette quick-command support rule, per-agent keybinding family, agent picker | hooks §3.3, §9.1; palette §6.2, §2.1, §7.1 |
| `ParsedAgentStatusPayload` / `AgentStatusIpcPayload` | `shared/agent-status-types.ts:164-190,222-243` | hook server enrichment, renderer panes, dashboard popout, notifications | hooks §5.2, §8 |
| Composite pane identity `paneKey = tabId:leafId` | PTY `makePaneKey` (pty §4) | hooks routing/enrichment, pane-authority ownership modules | hooks §5.2, §6; pty §2.1 |
| `FABRICA_*` env vars | spawn-env builders (`ipc/pty.ts:2485-2496`, `server.ts:2542-2558`) + relay revive (`pty-handler.ts:1516-1521,1996-2008`) | agent CLIs (hook coords, terminal handle), relay panes | pty §2.1, §9.3; hooks §2 |
| Plugin manifest `contributes.{commands,events}` + `agents` reservation | `shared/plugins/plugin-manifest.ts:63-70,116-119` | controller ready-validation (plugin S7), event bus (S10), palette quick-actions, extension registry (S11) | plugin S10, S11; palette §3.4 |
| Keybinding action-id grammar incl. dynamic families | `shared/keybindings.ts:26-27,1105-1127,1164-1175` | menu accelerators, palette dispatch, plugin built-in indirection (`dispatchAppCommand`) | palette §2.1, §7.3 |
| Hook wire contract `FABRICA_HOOK_PROTOCOL_VERSION='1'` + endpoint.env files | `shared/agent-hook-types.ts:51`; `shared/agent-hook-endpoint-file.ts:1` | managed scripts/plugins, relay ingest copies, restart survival | hooks §4.3, §4.4, §5.1 |
| zod plugin wire unions + protocol constants (READY 10s/INVOKE 30s/IDLE 5min/MAX 5) | `shared/plugins/plugin-host-protocol.ts:47-114` | parent switch + child runtime, relay host-call methods | plugin S3 |

**Design observation:** every cross-subsystem seam is either (a) a string contract with three synchronized layers (channels), (b) a shared table/config module (`TUI_AGENT_CONFIG`, manifests, keybindings), or (c) a typed shared schema module (`agent-status-types`, `plugin-host-protocol`). There is NO hidden ad-hoc coupling — which is why the risks in §6 are concentrated in exactly these contract files.

---

## 8. Verification Notes

- All five source reports were read from disk in full (or, for `fa-ipc-watchers.md` and `fa-command-palette-search.md`, in full across two reads each); their internal citations were themselves spot-verified by R4 verification passes: fa-plugin-runtime (wave-5 PASS), fa-agent-hooks-probes (wave-6 PASS incl. C7 count correction), fa-command-palette-search (wave-4 PASS), fa-ipc-watchers (round4 base PASS), fa-pty-terminal (hygiene-only — content treated as high-confidence but factually unverified by a second worker; flagged for verification).
- Digest numbers used: FA-T1..T18 locations cited inline from `analysis/round4-findings-digest.md`.
