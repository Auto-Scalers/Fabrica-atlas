# Atlas Phased Roadmap — Foundation → Capability Adoption → Launch Readiness

> **Task:** ATLAS R5-3.4 (Group 3 synthesis, Round 5) · claimed IN_PROGRESS in `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` Group 3 table.
> **Deliverable:** `analysis/atlas-phased-roadmap.md` (this file) — phased implementation proposal for the Fabrica-app build-out.
> **Inputs (all READ-ONLY, verified on disk 2026-08-23):**
> - `analysis/atlas-executive-summary.md` (R5-3.5) — verified-capability inventory §1, adoption priorities §2, phase-plan summary §4, open PM questions §5
> - `analysis/cross-project-notes-r4.md` (R4-3.4) — paste-ready notes FA-N1…FA-N10
> - `analysis/cross-project-notes-r5.md` (R5-3.6) — paste-ready notes FA-N11…FA-N17
> - `analysis/r5-agent-platform-integration-map.md` (R5-3.1, verified 45/45 by `verify/round5-wave2-spot-verification.md`) — composition flows §3, shared contracts §4, extension seams §5, gaps M1–M9 §7
> **Companion docs:** `analysis/atlas-risk-register.md` (R5-3.3, in flight), `analysis/digest-v2-refresh.md` (R5-3.2, in flight).
>
> Path conventions follow `atlas-executive-summary.md`: `src/...` = `../Fabrica-app/src/...`; donor paths under `_sources/`; discovery-report paths relative to `.Fabrica-atlas-board/`. All file:line anchors are second-hand from the cited VERIFIED-PASS reports (their citation accuracy is covered by named verify passes).

---

## 0. Roadmap Model at a Glance

The Round-1 build sequence (`production-architecture.md` §7), refined by Round-4 adjustments (`production-architecture.md` R4-C) and the dependency order established in FA-N10 (`cross-project-notes-r4.md:284-299`, restated in `r5-agent-platform-integration-map.md` §7 sequencing note), compresses into three delivery phases:

| Phase | Theme | One-line scope | Exit criterion |
|---|---|---|---|
| **A — Foundation & Preservation** | Protect what is load-bearing; land the cheap wins | Freeze the two irreplaceable assets (watcher stack, channel contract); adopt keep-on-disk-identifiers rebrand strategy; ship palette Agents section | Rebrand strategy signed off; preservation fences in CI/review policy; B5 shipped |
| **B — Capability Adoption** (from MC/buzz) | Supervision-on-top-of-substrate, in dependency order | Two-domain task model → guard stack → decision queue → durable persistence → fleet hardening (runner, readiness-gated spawn, cost ledger, alerting, reconciler) → expansion (capability packages, archive, presence, multi-host) | All P0/P1 adopted; P2 per scoping decisions |
| **C — Launch Readiness** | Make it shippable and safe | Telemetry leak register cleared; update/distribution surfaces confirmed; verification debt closed; risk-register sign-off; staged-rollout decision executed | Zero open red risks; all HYG-ONLY/UNVERIFIED inputs either verified or de-scoped |

Two standing rules govern every phase (both VERIFIED-PASS findings):

1. **Preserve verbatim:** the crash-isolated watcher stack (`fa-ipc-watchers.md:407`; FA-T11 `round4-findings-digest.md:134`; integration-map risk R9) and the `<namespace>:<action>` IPC channel contract (`fa-ipc-watchers.md` §8.4; integration-map risk R1).
2. **Keep on-disk identifiers unchanged** through any rebrand — display surfaces only (`fa-settings-config-datadirs.md:286-309`; FA-T14). Renaming safeStorage keys orphans ALL stored ciphertext; Chromium partition strings orphan data; ~130 `FABRICA_*` env vars cascade.
3. **House reliability grammar everywhere** (R4-C item 5, via `production-architecture.md:208`): generation counters, fail-closed liveness proofs, atomic claim-rename protocols, env allowlists, idempotency ledgers — copy this grammar into every new subsystem (`round3/fabrica-app-main-subsystems.md` closing summary).

---

## 1. PHASE A — Foundation & Preservation

### 1.1 What Exists to Build On (the foundation inventory)

All five subsystems below were mapped end-to-end and are VERIFIED-PASS (`r5-agent-platform-integration-map.md` §1–§3; capability detail in `atlas-executive-summary.md` §1):

| # | Asset | Anchor evidence |
|---|---|---|
| A-a | **Agent sessions as PTY citizens**: `launchAgent/resumeProviderSession/worktreeId/tabId/leafId` spawn args (`src/main/ipc/pty.ts:5790-5825`); owner-adoption registry (`pty.ts:340`, :4934-4996); incarnation-id kill semantics (`local-pty-provider.ts:284-293`, :1024-1026); serialize/revive restart survival | `fa-pty-terminal.md` §§2.1, 2.3, 5.4, 9 |
| A-b | **Zero-polling status pipeline**: loopback hook receiver, 18 live `/hook/<source>` pathnames, `agentStatus:set` push + startup replay; ~31-entry `TUI_AGENT_CONFIG` driving four consumers (`src/shared/tui-agent-config.ts:49-331`) | `fa-agent-hooks-probes.md` §§2,4,7; wave-6 PASS |
| A-c | **Centrally-audited IPC hub**: 344 handles / 342 channels / 65 files behind ONE preload bridge (656 sites); register-once hub at `register-core-handlers.ts:109-234` — the designated guard-stack landing zone | `fa-ipc-watchers.md` §§1-2; round4 base PASS |
| A-d | **Consent-gated plugin runtime**: forked Node child per plugin, zod-walled protocol, ordered denial-code gate, audit-intent-before-handler, supervised FSM backoff [500,2000,5000]ms, FIFO slot pool ≤5; `agents` manifest contributions already reserved (`plugin-manifest.ts:116-119`) | `fa-plugin-runtime.md` S1-S9, S12.1; wave-5 PASS |
| A-e | **Operator control surface**: Cmd+J palette (7 result families), ~85-action keybinding registry with dynamic chord families, saved quick commands wired end-to-end | `fa-command-palette-search.md` §0,§2,§6-7; wave-4 PASS |
| A-f | **Fabrica-exclusive extras**: crash-isolated watcher stack (no MC/buzz equivalent — `fa-ipc-watchers.md` §7); production distribution backbone (`fa-autoupdate-build.md` §A-D, PASS 14/14); attention pipeline (`fa-window-tray-notifications.md` §§4-7); worktree-per-agent git plane (`fa-git-integration.md`:13,:272-279); privacy-strong telemetry posture (`fa-telemetry-consent.md` §3-§4) | respective reports, all PASS |
| A-g | **Detection substrate for supervision**: OSC-133 lifecycle signals + interrupt/question inference already flow (`fa-pty-terminal.md` §6, §9.2; hooks §6) — MC's decision gates need only a queue consuming these existing signals (integration-map seam 4) | `fa-pty-terminal.md`; `fa-agent-hooks-probes.md` §6 |

Honest verdict (integration-map §1): best-in-class **single-host agent desktop substrate**; NOT yet a fleet-supervision platform. Phase A protects the former; Phase B supplies the latter.

### 1.2 Phase A Scope

1. **Preservation fences (pre-work, cheap, do first)** — declare the watcher stack and channel contract as frozen public API: no renames without a coordinated three-layer migration plan (65 main files / 656 preload sites / ~78 renderer namespaces per `fa-ipc-watchers.md` §8.4); reviewer checklist against the watcher stack's load-bearing behaviors (canary deadlock detector, crash fuse 3-per-120s, WSL pollers, SSH intent persistence, removal fencing).
   *Evidence:* FA-T11 (`round4-findings-digest.md:134`); integration-map risks R1, R9.
2. **Rebrand strategy adoption** — keep on-disk filenames/partition strings/env-var names unchanged; change display surfaces only (FA-T14). This avoids the safeStorage/Chromium-partition breakage class entirely.
   *Evidence:* `fa-settings-config-datadirs.md:286-309`; exec-summary §3 risk R-Rename.
3. **Palette "Agents" section (= B5 / FA-N4)** — insert agent catalog + quick commands into Cmd+J via the tiny `CmdJQuickAction` action layer (`quick-actions.ts:59-182`). Plumbing verified present; telemetry schema needs zero migration (`shared/telemetry-events.ts:183,:189`; `workspace-source.ts:2`). Cheapest high-value win; early visible proof the Atlas direction ships.
   *Evidence:* `cross-project-notes-r4.md` FA-N4 (lines 111-132); integration-map seam 1; wave-4 PASS.
4. **Chokepoint awareness protocol** — `ipc/pty.ts` (7,745 lines) and `agent-hooks/server.ts` (2,907 lines) concentrate all future work (integration-map risk R2); establish contribution guidelines before Phase B features start landing inside them.

### 1.3 Dependencies

- None external — everything in Phase A operates on verified existing code.
- Phase A item 3 (B5) must precede any Phase B operator-facing work so agents become discoverable from the primary control surface before the fleet grows.
- Blocks Phase C item on telemetry only insofar as event names chosen here persist (new brand-prefixed events per breaking-change convention — FA-N6 item 3, `telemetry-events.ts:1424,:1427,:1469-1471`).

### 1.4 Open PM Questions (Phase A)

1. Accept the keep-on-disk-identifiers rebrand strategy formally (exec-summary Q1)? Leaving legacy names in artifacts vs breaking safeStorage/partitions.
2. Confirm appId stays unchanged, or fund a parallel-install migration story (exec-summary Q2; FA-T9, `fa-autoupdate-build.md:231-245`).
3. Do-not-regress rule for push IPC (FA-N2): ratify as an architecture invariant so no future feature reintroduces polling (`cross-project-notes-r4.md:68-82`).

---

## 2. PHASE B — Capability Adoption from mission-control / buzz

> Donor repos are READ-ONLY references; patterns port, code does not. Every adoption item below maps to a paste-ready note (FA-N1…N17) whose fix-before-port register MUST be applied during the port — porting verbatim imports documented defects (exec-summary risk 8).

### 2.1 Ordering Rule (FA-N10)

Task model → guard stack → decision queue; then hardening; then expansion (`cross-project-notes-r4.md:284-299`). Guards before FSM invites hand-inlined per-route copies — exactly MC's implementation flaw. The R5 chain-dispatch material (FA-N11/N12/N13) slots into hardening after the task/persistence layer exists, since its ledger shapes presuppose a durable task store.

### 2.2 B-Stage 1 — Task Model + Guards (P0)

| Item | Adopt | From | Note | Key evidence |
|---|---|---|---|---|
| B1.1 | Two-domain task model: human kanban (3 states, no FSM) + machine FieldTask w/ 8-state approval FSM; `linkedTaskId` bridge | MC | FA-N9 / FA-N14 + fix-before-port FA-N15 (registry-resolved assignment, ONE enum source-of-truth, drop dead `scheduledFor`, add numeric priority, uuid ids) | `mc-fieldtask-kanban.md` (wave-7 PASS); `field-ops-security.ts:73-82`; `types.ts:420,:451-474` |
| B1.2 | Ordered execute-guard stack at ONE boundary (`register-core-handlers.ts:109-234`): server-side risk table w/ iron claw, bypass predicate on every mutating handler, atomic persisted rate limiters, spend-ladder fleet brake, circuit breaker, owner guard | MC | FA-N7; port LAYER ORDER not style; fix 7 known defects while porting (owner check on execute path, creation-path approval hole, batch bypass, expired credentials, password rate limit, dead SOFT_LIMIT knobs, ad-hoc adapter invocation) | `mc-execute-guards.md` §14-§15 (wave-5 PASS); FA-N7 `cross-project-notes-r4.md:195-224` |

**Dependencies:** B1.1 strictly before B1.2 (guard layers operate ON the FSM states). Both before anything else in Phase B.

### 2.3 B-Stage 2 — Decision Queue + Durable Persistence (P0)

| Item | Adopt | From | Note | Key evidence |
|---|---|---|---|---|
| B2.1 | Decision-gate escalation: pending decisions freeze dispatch; after N failures inject structured Retry/Skip/Stop trio; answers become prompt-context | MC | FA-N8 / FA-N16 + fix-before-port FA-N17 (consumption semantics W4/W5, transactional main-process-owned store W2, event-driven unblock W6, real dismissed/expired statuses W8/W9, audited deletes W3, full-history dedupe W7, auth on endpoints W1, options-enforcement decision W11). Detection substrate already exists (A-g above) — only the queue is new | `mc-decision-gates.md` (wave-7 PASS); `run-task.ts:485-544`; `prompt-builder.ts:264-321` |
| B2.2 | Durable SQL run/task/approval persistence replacing memory+JSON supervision: buzz workflow-quartet shape — status enums as FSMs, SHA-256 scoped approval tokens, TOCTOU-safe guarded transitions, at-most-once scheduled-fire claims | buzz | Exec-summary A4; FA-T6 (`round4-findings-digest.md:129`); redesign note FA-T4 ("replace MC's JSON+PID-probing with FA IPC+SQLite") | `bz-db-schema.md` §E (R4-2.3 PASS) |

**Dependencies:** B2.1 hooks into run entry points created by B1.1; B2.2 gives B2.1 its transactional store (fixing W2 structurally rather than patching it). Design note from FA-N17: keep BOTH intervention tiers but share ONE UI surface (MC fragments them across two UIs).

### 2.4 B-Stage 3 — Fleet Hardening (P1)

| Item | Adopt | From | Note | Key evidence |
|---|---|---|---|---|
| B3.1 | Provider-neutral runner: promote `TuiAgentConfig` → explicit `Runner.spawn(SpawnSpec)`; collapse 14 copy-paste `agentHooks:<agent>Status` handlers into one dispatcher; extract per-provider parsing quirks out of the 2,907-line `server.ts` | FA-native refactor seeded by MC SpawnOptions/SpawnResult trio | FA-N1 (count correction: 14 managed targets vs **18** live pathnames — adopt everywhere); removes three-layer rename friction + chokepoint pressure | `tui-agent-config.ts:49-331`; `agent-hooks.ts:142-323`; hooks report §9 (wave-6 PASS) |
| B3.2 | Readiness-gated spawn + orphan sweep + quiescence-window restart policy for long-running agents | buzz managed-agent lifecycle | Exec-summary B2; M5 — "the precise local fleet-supervisor blueprint FA lacks"; composes with FA's existing adoption/continuity machinery (pty §2.1, §9.6) | `readiness.rs:402`; `orphan_sweep.rs:110-119`; 3-min quiescence (`similarities-gaps.md:162` G-BZ-15) |
| B3.3 | Usage/cost ledger WITH budget enforcement: buzz `agent_metric_index` ledger shape × MC layered spend limits applied to agent runs (MC itself never budgets LLM spend) | buzz + MC | Exec-summary B3; pairs with B1.2's spend-ladder brake | FA-T7 (`round4-findings-digest.md:130`); R4-2.3 + W2 PASS |
| B3.4 | Fleet wave orchestration: durable mission ledger + ephemeral process registry + relay-race handoff; save-plan-before-spawn discipline; stop semantics reverting in-flight work cleanly | MC chain-dispatch/reconciler | FA-N11 — centralize dispatch predicate into ONE module (MC tripled it and it drifted: stalled-revival present in daemon but not API reconciler; dep-wait ALL-vs-SOME divergence); atomic writes mandatory everywhere | `mc-chainedispatch-reconciler.md` §9 (R5-2.9 PASS, 47 clusters; F-1 caveat) |
| B3.5 | Dual-trigger reconciler w/ grace period as fleet self-healing | MC | FA-N12 — adopt 30s grace anti-thrash as-is; FIX: signal-0-only liveness breaks under Windows PID recycling (use PID+start-time identity); add zombie-row reaper; persist explicit wave records; unify liveness surface | `api/missions/route.ts:114-207`; `dispatcher.ts:331-461` |
| B3.6 | Two-tier retry ladder ending in human gate + restart-context injection into prompts | MC | FA-N13 — continuations carry context forward; forensics embedded in escalation; CAVEAT: consolidate MC's THREE independent attempt counters into ONE attempt ledger | `run-task.ts:310-332,:485-544,:963-965`; `prompt-builder.ts:217-262` |
| B3.7 | Operator alerting depth: diff-poll first-fetch suppression, dead-backend signal, seen-vs-acknowledged separation, aging escalation onto FA's existing attention pipeline | MC lessons onto FA | Exec-summary B4; FA has delivery; MC proves which four semantics gaps matter (and has zero outbound transports — don't copy that) | FA-T13 (Closure Addendum `round4-findings-digest.md:278`); W2+W3 PASS |

**Dependencies:** all of Stage 3 requires Stage 1-2 stores (retry ladders and reconcilers need the durable run/task model of B2.2; budget enforcement needs the guard boundary of B1.2). B3.1 is independent enough to run early/parallel — highest-leverage internal cleanup.

### 2.5 B-Stage 4 — Capability Expansion (P2, after Stages 1-3 land)

| Item | Adopt | From | Note | Key evidence |
|---|---|---|---|---|
| B4.1 | Agent-capability packages on the plugin SDK shape (`commands≈tools, events.on≈triggers, host.call≈gated API`); add agent-domain events (`run.started/finished/token.spend`) | FA plugin runtime extension | Exec-summary C1; close the 4 documented gaps FIRST (restricted runtime mode, audited exec primitive, event-set growth, version handshake — FA-N3 a-d) | `plugin-manifest.ts:116-119`; S12 (wave-5 PASS) |
| B4.2 | Searchable agent-output archive: generated-tsvector index-as-side-effect-of-insert + privacy allowlist + per-hit re-auth | buzz search crate | Exec-summary C2; zero consistency window; secrets-bearing output handled by design | FA-T15 (`round4-findings-digest.md:280`); W3 PASS |
| B4.3 | Fleet live-presence plumbing: refcount+debounce topic manager, heartbeat-scaled TTL (= 3× heartbeat) replacing passive 30-min decay | buzz pubsub | Exec-summary C3; fixes integration-map risk R6 (supervision needs positive liveness, not lazy decay) | FA-T16 (`:281`); W3 PASS |
| B4.4 | Multi-host transport + hash-chained audit: buzz NIP job kinds 43001-43006 + observer frames + gate sets IF multi-host scoped; audit chain for operator actions | buzz relay | Exec-summary C4; relay twins already exist for Flows A/B/C (integration-map seam 8) making this cheap AFTER the supervision layers land; do NOT regress push IPC to MC-style polling either way | `bz-relay-event-kinds.md`; FA-T8 (`:131`); R4-2.3 PASS |

### 2.6 Deliberately NOT Adopted (standing exclusions)

Per `production-architecture.md` §§8, R4-D: MC's JSON-file persistence and polling-over-HTTP transport; buzz Nostr multi-community tenancy concepts-as-code; buzz-workflow's unwired approval resume as-is (WF-08). Also excluded by note-level caveats: MC's triple-duplicated dispatch predicate, unlocked cross-process JSON RMW, non-atomic chain-critical writes (FA-N11 anti-patterns).

### 2.7 Open PM Questions (Phase B)

1. Kanban agent-write policy — may agents write the human planning kanban directly, or owner-only? Must be decided BEFORE B1.1 ports (FA-N15 item 2; exec-summary Q5).
2. Multi-operator approvals — MC hardcodes actor === "me"; does v1 need delegation-of-approval/approver roles? (FA-N15 item 7; exec-summary Q6.)
3. Plugin execution primitive — approve designing a deliberate audited exec/spawn primitive NOW, before `terminal.sendText` fossilizes as the de-facto one? Gates B4.1 (FA-N3 gap b; exec-summary Q4).
4. Token-in-env acceptance — is the loopback hook-token model acceptable long-term given agents can read their own token (risk R5)? Accept consciously or budget a redesign when spend/actions hang off status (FA-N2 trade-off; exec-summary Q3).
5. Single UI surface mandate — confirm both intervention tiers (decision queue + execution approvals) share one operator surface despite different backends (FA-N17 architecture note).
6. Attempt-ledger consolidation — confirm ONE attempt ledger across continuation/retry/escalation mechanisms (FA-N13 caveat) as an acceptance criterion for Stage 3.

---

## 3. PHASE C — Launch Readiness

### 3.1 Scope

1. **Telemetry leak register cleared (11 items)** — posture stays as-is (two isolated lanes, compile-time transmission constants, fail-closed consent incl. DO_NOT_TRACK, `.strict()` zod schemas, triple-redaction diagnostics — all VERIFIED-PASS, `fa-telemetry-consent.md` §3-§4); the launch work is clearing every brand-leak surface: hardcoded endpoint (`feedback.ts:17`), privacy doc URL, brand-prefixed event names (PostHog funnel breakage), common prop on EVERY event, build-constant/CI-secret sync, env kill-switch rename cascades across ≥5 locales, consent reason literals crossing IPC, on-disk artifact names, PostHog project continuity decision, locale search keyword, dialog copy (FA-N6 items 1-11, ordered by risk there).
2. **Distribution/update surfaces confirmed** — electron-updater backbone needs NO rebuilding (PASS 14/14, `fa-autoupdate-build.md` §A-D); verify channels stable|rc|hourly|daily|adhoc still function under final branding; update-survival E2E green on release candidate.
3. **Verification debt closure** — authorize spot passes for the two HYG-ONLY inputs (`mc-adapters-linelevel.md`, `fa-wsl-remote-execution.md`) before their findings back committed tasks; resolve `bz-pair-relay-cli.md` (fully UNVERIFIED); settle the three never-landed Round 4 reports via the in-flight R4-1.13/14/22 rewrites (exec-summary §3 risk 7; Q9/Q10).
4. **Risk-register sign-off** — merged register from `analysis/atlas-risk-register.md` (R5-3.3): zero open red risks at launch; headline set = R1 rename blast radius, R-Rename rebrand breaks, R9 watcher fragility, R2 chokepoint concentration, R4 plugin sandbox honesty, R5/R6 token/fail-open posture (exec-summary §3 items 1-6).
5. **Staged rollout decision executed** — no staged-rollout mechanism exists anywhere today (`stagingPercentage` zero matches, FA-T10); if wanted, build cohort-based routing on the generic feed BEFORE public launch (exec-summary Q8).
6. **Acceptance-criteria sweep (FA-N10 cross-cutting)** — final audit confirms: every state-mutating handler carries the named bypass predicate; no action can be created past its approval gate; one enum definition per state machine; operator answers have consumption semantics; rate limiters atomic+persisted (`cross-project-notes-r4.md:296`).

### 3.2 Dependencies

- Items C-1/C-2 depend on Phase A rebrand decisions being final (display-surface changes happen once, late).
- Item C-3 gates Phase B commitments resting on HYG-ONLY/UNVERIFIED reports (notably FA-N5's WSL guardrails — strong but unverified numbers; recommend a dedicated spot pass before hard WSL-touching Phase B work cites line numbers).
- Item C-6 runs only after Phase B Stages 1-2 land.

### 3.3 Open PM Questions (Phase C)

1. Verification closure funding — approve the spot passes now? (exec-summary Q9.)
2. Never-landed discovery — formally drop or accept the rewrites as replacement? (exec-summary Q10.)
3. Staged rollout — cohort-based routing before public launch, yes/no? (exec-summary Q8.)
4. PostHog continuity vs new project — historical funnel loss accepted? (FA-N6 item 9.)

---

## 4. Cross-Phase Dependency Summary

```
Phase A ──┬── rebrand strategy ──────────────► Phase C (C-1, C-2)
          └── palette Agents (B5) ──► operator visibility for all later phases

Phase B Stage 1 (task model B1.1) ──► Stage 1 (guards B1.2)
        ──► Stage 2 (decision queue B2.1 ← detection substrate from A-g;
                          durable store B2.2)
        ──► Stage 3 (runner B3.1 may parallel; reconciler/retry/ledger/alerts need Stage 1-2)
        ──► Stage 4 (expansion; B4.1 additionally gated on plugin-gap closures; B4.4 gated on multi-host PM scoping)

Phase B Stages 1-2 ──► Phase C acceptance sweep (C-6)
Phase B (any HYG-ONLY-backed item) ◄── gate: Phase C verification closure (C-3)
```

Sequencing judgment (FA-N10 ordering + R5 additions) is Atlas synthesis; every underlying finding carries its own VERIFIED-PASS status per the tables above.

---

## Scan-Coverage Statement

**Read in full this session:** `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` Checkpoint table + autonomous-work section (lines 240-379) + Group 3 row for R5-3.4 (line 206, via grep); `analysis/atlas-executive-summary.md` (148 lines, complete); `analysis/cross-project-notes-r4.md` (316 lines, complete); `analysis/cross-project-notes-r5.md` (446 lines, complete); `analysis/r5-agent-platform-integration-map.md` (269 lines, complete). AGENTS.md system-provided and followed.

**Not read this session (relied on cited statuses):** discovery-report bodies (`discovery/round4/*` — all file:line anchors transcribed from the four analysis inputs above, whose own citation accuracy is covered by the named verify passes: waves 4/5/6/7, round4 base, R5-2.3, R5-2.9); `analysis/round4-findings-digest.md`, `production-architecture.md`, `similarities-gaps.md` bodies (quoted via the four inputs); `analysis/atlas-risk-register.md` + `digest-v2-refresh.md` (in flight by other workers — referenced, not consumed); anything under `_sources/` or `../Fabrica-app/` (synthesis layer; no direct source scan performed — consistent with the input documents' own second-hand-anchor discipline, flagged inline where a claim rests solely on HYG-ONLY or UNVERIFIED inputs).

**Written:** this file only, inside `.Fabrica-atlas-board/analysis/`. No file outside `.Fabrica-atlas-board/` created or modified (Checkpoint/task-table update in `Fabrica-atlas-tasks.md` excepted per board convention).

_Report end — ATLAS R5-3.4._
