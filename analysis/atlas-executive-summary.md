# Atlas Executive Summary — the 10-Minute PM Brief

> ATLAS R5-3.5 · task `task_370ea2e8ba10` · dispatch `ctx_9f3bbff59728` · Group 3 synthesis · 2026-08-23
> Companion documents (in flight by other workers): `analysis/atlas-risk-register.md` (R5-3.3), `analysis/atlas-phased-roadmap.md` (R5-3.4), `analysis/digest-v2-refresh.md` (R5-3.2). This summary stands alone from the already-verified corpus.
>
> **Verification status legend** (statuses come from the board's Verification Tracker + spot-verification passes):
> - **VERIFIED-PASS** — an independent worker re-opened cited file:line anchors vs source; 0 failures recorded.
> - **HYG-ONLY** — encoding/coverage hygiene checked only; content NOT factually re-checked by a second worker.
> - **UNVERIFIED** — no independent check at all.
> Aggregate record to date: ~500+ citations sampled across Round 4 waves W0–W8 with **0 failed** (`verify/round4-master-index.md` §B aggregate line), plus R5-2.3: 45/45 pass on the R5 integration map incl. first-ever factual check of `fa-pty-terminal.md` anchors (`verify/round5-wave2-spot-verification.md`; `Fabrica-atlas-tasks.md` Checkpoint "Last Action", line 269).
>
> Path conventions: `src/...` = `../Fabrica-app/src/...`; `_sources/mission-control|buzz/...` = frozen donor repos inside this folder. Discovery-report paths are relative to `.Fabrica-atlas-board/`.

---

## TL;DR (30 seconds)

Fabrica-app is already a best-in-class **single-host agent desktop substrate** — transport, execution, observation, extension, and operator-control layers all exist and compose via verified shared contracts. What it is NOT yet is a **fleet-supervision platform**: it lacks durable run/task persistence, approval gates on irreversible actions, spend enforcement, readiness-gated spawn/restart, and operator escalation queues. Mission-control supplies the supervision *patterns* (guards, decision gates, task FSM); buzz supplies the durability *patterns* (SQL state machines, cost ledger, presence, search). The recommended build is supervision-on-top-of-substrate in phases, with two hard rules: preserve the watcher stack and IPC channel contract verbatim, and keep on-disk identifiers unchanged through any rebrand.

---

## 1. What Fabrica-app ALREADY Has (verified capabilities)

The five subsystems below were mapped end-to-end in `analysis/r5-agent-platform-integration-map.md` (itself verified 45/45 by `verify/round5-wave2-spot-verification.md`) from five Round 4 discovery reports. Every capability carries its report + verification status.

### 1.1 Agent sessions as first-class PTY citizens — VERIFIED-PASS
Spawns carry `launchAgent/resumeProviderSession/worktreeId/tabId/leafId` (`src/main/ipc/pty.ts:5790-5825`, per `discovery/round4/fa-pty-terminal.md` §2.1); a `ClaimedAgentPtyOwnerRegistry` can ADOPT a running agent CLI instead of spawning a duplicate (`pty.ts:340`, :4934-4996 — `fa-pty-terminal.md` §9 item 1). Kill semantics are production-hardened: graceful→SIGTERM→process-group SIGKILL ladders, PID-recycle defense, per-spawn `incarnationId = randomUUID()` with stale-exit rejection (`local-pty-provider.ts:284-293`, :1024-1026; `pty.ts:259` — `fa-pty-terminal.md` §2.3). Agents survive UI restarts via serialize/revive + replay buffers (`fa-pty-terminal.md` §5.4). *Verification:* `fa-pty-terminal.md` anchors factually checked for the first time by R5-2.3 (`verify/round5-wave2-spot-verification.md` PASS).

### 1.2 Zero-polling agent-status pipeline across a wide CLI fleet — VERIFIED-PASS
A loopback HTTP receiver in main ingests turn-state hooks from **18 live `/hook/<source>` pathnames** (14 managed install targets; count corrected by W6 — Correction CA-2 in `analysis/round4-findings-digest.md:229`), normalizes/persists/pushes via `agentStatus:set` with startup replay (`discovery/round4/fa-agent-hooks-probes.md` §§2,4,7; VERIFIED-PASS, `verify/round4-wave6-spot-verification.md`). The ~31-entry `TUI_AGENT_CONFIG` table (`src/shared/tui-agent-config.ts:49-331`) drives four consumers at once: launch commands, hook-presence probing, palette quick-command rules, and auto-generated keybinding families (`analysis/r5-agent-platform-integration-map.md` §3.1).

### 1.3 Massive, centrally-audited IPC surface — VERIFIED-PASS
344 `ipcMain.handle` registrations / 342 unique channels / 65 files behind ONE preload bridge (656 invoke sites, 76 namespaces); register-once hub with trusted-renderer enforcement at `register-core-handlers.ts:109-234` (`discovery/round4/fa-ipc-watchers.md` §§1-2; PASS 18/18 cites, `verify/round4-spot-verification.md`). This hub is the designated single enforcement point where any new guard stack should land (FA-N7, `analysis/cross-project-notes-r4.md:201`).

### 1.4 Consent-gated plugin runtime — VERIFIED-PASS
One forked Node child per plugin, zod-walled protocol both directions, ordered denial-code gate (unknown_method→panel_forbidden→consent_required→capability_denied), audit-intent-before-handler, supervised FSM with backoff [500,2000,5000]ms max 3 restarts, FIFO slot pool capped at 5 (`discovery/round4/fa-plugin-runtime.md` S1-S9; VERIFIED-PASS, `verify/round4-wave5-spot-verification.md`). Assessed as adoptable nearly verbatim as the base for installable agent-capability packages (S12.1).

### 1.5 Operator control surface (palette/keybindings) — VERIFIED-PASS
One Cmd+J palette merging 7 result families (~3,153-line component), ~85-action keybinding registry with dynamic per-agent/plugin chord families, saved agent-prompt quick commands wired end-to-end to the launcher (`discovery/round4/fa-command-palette-search.md` §0,§2,§6-7; VERIFIED-PASS with 1 cosmetic cite drift, `verify/round4-wave4-spot-verification.md`). Known blind spot: agent catalog + quick commands are plumbed but absent from the palette itself (report §9 row 7; FA-N4).

### 1.6 Crash-isolated watcher stack (Fabrica-exclusive among the three repos) — VERIFIED-PASS
Four-tier stack: forked watcher children with canary deadlock detector + crash fuse (3 crashes/120 s), WSL in-distro pollers, SSH remote intent persistence with reconnect ladders, batching windows (`fa-ipc-watchers.md` §5). Neither MC nor buzz has anything comparable (`fa-ipc-watchers.md` §7). Flagged load-bearing: must be preserved verbatim through any framework change (`fa-ipc-watchers.md`:407; FA-T11, `round4-findings-digest.md:134`).

### 1.7 Production distribution backbone — VERIFIED-PASS
electron-updater with pinned verified-generic-feed preflight, channels stable|rc|hourly|daily|adhoc, dual signing (macOS notarization + SignPath Windows), draft-gated publishing, update-survival E2E workflow (`discovery/round4/fa-autoupdate-build.md` §A-D; PASS 14/14, `verify/round4-spot-verification.md`). None of it needs rebuilding; only re-pointing if branding changes (FA-T9/T10 caveats, §3 risk R-Rename below).

### 1.8 Attention/alerting pipeline + headless operation — VERIFIED-PASS
Tray pre-gate lit before cooldown/focus gates, burst dedupe, click-to-pane navigation, copy normalization across 13 agent types, mobile replay buffer (`discovery/round4/fa-window-tray-notifications.md` §§4-7; VERIFIED-PASS, `verify/round4-wave2-spot-verification.md` §4). Single-instance lock + `FABRICA-runtime.json` discovery files ARE the CLI↔desktop contract, with headless serve mode gated on persistent PTYs (same report §3/§5 + `fa-settings-config-datadirs.md`:271-276; VERIFIED-PASS W3).

### 1.9 Worktree-per-agent git plane + agent credential guard — VERIFIED-PASS
All git execution centralized raw-child_process in `main/git/runner.ts` (~1,838 lines); worktrees mint `worktreeId` keys used by panes/runtime/tabs alike; removal fences agent processes first; unattended agents get a selective credential guard (`isUnattended = opts.launchAgent !== undefined`, `ipc/pty.ts:1714-1719`) while user terminals keep normal behavior (`discovery/round4/fa-git-integration.md`:13,:15,:272-279; VERIFIED-PASS 16/16, `verify/round4-wave3-spot-verification.md` Report 1).

### 1.10 Privacy-strong telemetry posture — VERIFIED-PASS
Two isolated lanes, compile-time-only transmission constants (no runtime env can enable), fail-closed consent incl. DO_NOT_TRACK, `.strict()` zod schemas blocking error stacks off the wire, triple-redaction diagnostics (`discovery/round4/fa-telemetry-consent.md` §3-§4; VERIFIED-PASS, wave-4). Real task during rebrand = clear the 11-item leak register (same report §11; FA-N6).

**Honest verdict** (from `r5-agent-platform-integration-map.md` §1): best-in-class single-host agent desktop; NOT yet a fleet-supervision platform.

---

## 2. What to Adopt from mission-control / buzz (prioritized)

Donor repos are READ-ONLY references; patterns port, code does not. Priorities follow the dependency order established in FA-N10 (`cross-project-notes-r4.md:284-299`): task model → guard stack → decision queue; then hardening; then expansion.

### P0 — Supervision foundation (blocks everything else)

| # | Adopt | From | Why | Status |
|---|---|---|---|---|
| A1 | **Two-domain task model**: human kanban (3 states, no FSM) + machine FieldTask with 8-state approval FSM, linkedTaskId bridge | MC (`mc-fieldtask-kanban.md`; FA-N9 `cross-project-notes-r4.md:256-282`) | Skeleton everything else hangs off; fix-before-port list included (no string-role assignment, one enum source-of-truth, drop dead fields) | VERIFIED-PASS (W7) |
| A2 | **Ordered execute-guard stack** at ONE boundary (`register-core-handlers.ts:109-234`): server-side risk table w/ "iron claw", bypass-detection predicate on every mutating handler, atomic persisted rate limiters, spend-ladder fleet brake, circuit breaker, owner guard | MC (`mc-execute-guards.md`; FA-N7 `cross-project-notes-r4.md:195-224`) | MC's implementation flaws are documented — port the LAYER ORDER, fix its 7 known defects while porting | VERIFIED-PASS (W5) |
| A3 | **Decision-gate escalation**: pending decisions freeze dispatch; after N failures inject structured Retry/Skip/Stop questions; answers become prompt-context | MC (`mc-decision-gates.md`; FA-N8 `cross-project-notes-r4.md:226-251`) | Detection substrate already exists in FA (OSC-133 + interrupt/question inference — `fa-pty-terminal.md` §6, VERIFIED via R5-2.3); only the queue is new. Fix MC's W1-W9 defects (no consumption marker, storage races, no auth) | VERIFIED-PASS (W7) |
| A4 | **Durable SQL run/task/approval persistence**: buzz's workflow quartet shape — status enums as FSMs, SHA-256 scoped approval tokens, TOCTOU-safe guarded transitions, at-most-once scheduled-fire claims | buzz (`discovery/round4/bz-db-schema.md` §E; FA-T6 `round4-findings-digest.md:129`) | FA supervises via memory + JSON snapshots today; net-new table work explicitly flagged by buzz report itself | VERIFIED-PASS (R4-2.3) |

### P1 — Fleet hardening

| # | Adopt | From | Why | Status |
|---|---|---|---|---|
| B1 | **Provider-neutral runner** — promote `TuiAgentConfig` to explicit `Runner.spawn(SpawnSpec)`; collapse 14 copy-paste `agentHooks:<agent>Status` handlers into one dispatcher; extract per-provider parsing quirks out of the 2,907-line `server.ts` | FA-native refactor seeded by MC's SpawnOptions/SpawnResult trio (`mc-ai-providers.md` §8.1; FA-T1/FA-N1) | Highest-leverage internal cleanup; removes three-layer rename friction and single-file concentration | VERIFIED-PASS (W2+W6) |
| B2 | **Readiness-gated spawn + orphan sweep + quiescence-window restart policy** for long-running agents | buzz managed-agent lifecycle (`readiness.rs:402`, `orphan_sweep.rs:110-119`, 3-min quiescence — `similarities-gaps.md:162` G-BZ-15; M5 in `r5-agent-platform-integration-map.md` §7) | "The precise local fleet-supervisor blueprint FA lacks"; composes with FA's existing adoption/continuity machinery | VERIFIED-PASS (R2/R3 rounds + W2) |
| B3 | **Usage/cost ledger WITH budget enforcement** — buzz `agent_metric_index` ledger shape × MC layered spend limits, applied to agent runs (MC itself never budgets LLM spend) | buzz + MC (FA-T7, `round4-findings-digest.md:130`) | FA captures usage channels but has zero budgets/attribution/pre-flight estimates | VERIFIED-PASS (R4-2.3, W2) |
| B4 | **Operator alerting depth**: diff-poll first-fetch suppression into main-process notifications + dead-backend signal + seen-vs-acknowledged separation + aging escalation | MC lessons onto FA's existing attention pipeline (FA-T13, Closure Addendum `round4-findings-digest.md:278`) | FA has the delivery pipeline; MC proves which four semantics gaps matter (and has zero outbound transports itself — don't copy that) | VERIFIED-PASS (W2+W3) |
| B5 | **Palette "Agents" section** — insert agent catalog + quick commands into Cmd+J via the tiny `CmdJQuickAction` action layer | FA-native (plumbing verified present, FA-N4) | Cheapest high-value win; telemetry schema needs no migration | VERIFIED-PASS (W4) |

### P2 — Capability expansion (after P0-P1 land)

| # | Adopt | From | Why | Status |
|---|---|---|---|---|
| C1 | **Agent-capability packages** on the plugin SDK shape (`commands≈tools, events.on≈triggers, host.call≈gated API`); add agent-domain events (`run.started/finished/token.spend`) | FA plugin runtime extension (FA-N3, S12) | `agents` manifest contributions already reserved (`plugin-manifest.ts:116-119`) — but close the 4 documented gaps first (restricted runtime mode, audited exec primitive, event-set growth, version handshake) | VERIFIED-PASS (W5) |
| C2 | **Searchable agent-output archive** — generated-tsvector index-as-side-effect-of-insert + privacy allowlist + per-hit re-auth | buzz search crate (FA-T15, `round4-findings-digest.md:280`) | Zero consistency window; secrets-bearing output handled by design | VERIFIED-PASS (W3) |
| C3 | **Fleet live-presence plumbing** — refcount+debounce topic manager, heartbeat-scaled TTL (= 3× heartbeat) replacing passive 30-min staleness decay | buzz pubsub (FA-T16, `:281`) | Supervision needs positive liveness, not lazy decay (risk R6, `r5-agent-platform-integration-map.md` §6) | VERIFIED-PASS (W3) |
| C4 | **Multi-host transport + hash-chained audit** — buzz NIP job kinds 43001-43006 + observer frames + gate sets IF multi-host is scoped; audit chain for operator actions | buzz relay (`bz-relay-event-kinds.md`; FA-T8, `round4-findings-digest.md:131`) | Do NOT regress FA's push IPC to MC-style polling either way | VERIFIED-PASS (R4-2.3) |

**Deliberately do NOT adopt** (per `production-architecture.md` §§8, R4-D): MC's JSON-file persistence and polling-over-HTTP transport; buzz Nostr multi-community tenancy concepts-as-code; buzz-workflow's unwired approval resume as-is (WF-08).

---

## 3. Top Risks

Full merged register lands in `analysis/atlas-risk-register.md` (R5-3.3, in flight). The headline set, from `r5-agent-platform-integration-map.md` §6 + digest:

1. **Contract-rename blast radius (R1)** — `<namespace>:<action>` channel strings live simultaneously in 65 main files, 656 preload sites, ~78 renderer namespaces; every rename is a coordinated three-layer migration (FA-T11; `fa-ipc-watchers.md` §8.4). VERIFIED-PASS.
2. **Rebrand hard-break surfaces (extends R1)** — renaming the safeStorage key name makes ALL stored ciphertext undecryptable; Chromium partition strings orphan data; ~130 `FABRICA_*` env vars. Recommended mitigation adopted by Atlas: keep on-disk filenames/partition strings unchanged, change display surfaces only (`fa-settings-config-datadirs.md:286-309`; FA-T14). VERIFIED-PASS (W3).
3. **Watcher-stack fragility under change (R9)** — Fabrica-exclusive, crash isolation/canary/fuses/removal fencing all load-bearing; highest preservation risk of any subsystem (`fa-ipc-watchers.md`:407). VERIFIED-PASS.
4. **Two chokepoint files concentrate all future work (R2)** — `ipc/pty.ts` (7,745 lines) and `agent-hooks/server.ts` (2,907 lines); both deliberate, both exactly where fleet features will want to modify (`fa-pty-terminal.md` §1; `fa-agent-hooks-probes.md` §10.3). VERIFIED-PASS.
5. **Plugin sandbox honesty vs autonomous agents (R4)** — post-activate() plugin code holds raw Node power; host API has no exec/spawn/fs method, so `terminal.sendText` could become a de-facto unaudited execution primitive (`fa-plugin-runtime.md` S1 honesty note, S12.5). VERIFIED-PASS.
6. **Token-in-child-env + fail-open posture (R5/R6)** — `FABRICA_AGENT_HOOK_TOKEN` is pane-readable (loopback-mitigated, not secret from the agent); 30-min lazy TTL decay + fail-open 204s are wrong semantics once spend/actions hang off status (`fa-agent-hooks-probes.md` §10.4; `cross-project-notes-r4.md` FA-N2). VERIFIED-PASS.
7. **Verification debt on two inputs (process risk)** — `mc-adapters-linelevel.md` (basis of G5/G6, parts of G7, FA-T2/FA-T5) and `fa-wsl-remote-execution.md` are HYG-ONLY; `bz-pair-relay-cli.md` fully UNVERIFIED (`round4-findings-digest.md` §A3 table). Claims resting solely on these carry the caveat inline above. Also: 3 assigned Round 4 reports never landed (auth-onboarding, voice-media, UI-frontend — master-index §D2), though the in-flight R4-1.13/14/22 rewrites address them (`tasks.md` Checkpoint Next Action).
8. **MC defect porting trap** — MC's guard/task/decision systems each carry 7-9 documented defects (approval holes, batch bypasses, races, dead knobs); porting verbatim would import them. All fix-before-port lists are embedded in FA-N7/N8/N9 (`cross-project-notes-r4.md`). VERIFIED-PASS (W5/W7).

---

## 4. Proposed Phase Plan (summary)

Refines the Round-1 build sequence (`production-architecture.md` §7) with Round-4 adjustments (`production-architecture.md` R4-C) and the FA-N10 ordering. Full draft lands in `analysis/atlas-phased-roadmap.md` (R5-3.4, in flight).

- **Phase 0 — Preservation & hygiene** (pre-work, cheap, do first): freeze watcher stack + channel contract as public API; adopt keep-on-disk-identifiers rebrand strategy (FA-T11/T14); palette Agents section (B5) as an early visible win.
- **Phase A — Task model + guards** (A1 → A2): two-domain task skeleton with one enum source-of-truth; then ONE ordered guard stack at the IPC hub. Order matters: guards before FSM invites hand-inlined copies (FA-N10).
- **Phase B — Decision queue + durable persistence** (A3 + A4): decision-gate escalation consuming FA's existing OSC-133/inference signals; SQLite run/task/approval stores replacing memory+JSON supervision.
- **Phase C — Fleet hardening** (B1-B4): runner abstraction (B1), readiness-gated spawn/orphan sweep/restart policy (B2), cost ledger with budgets (B3), alerting depth (B4).
- **Phase D — Expansion** (C1-C4): agent-capability packages, searchable archive, live presence, multi-host transport if scoped.

Standing rule throughout (R4-C item 5): all new subsystems copy the house reliability grammar already confirmed app-wide — generation counters, fail-closed liveness proofs, atomic claim-rename protocols, env allowlists, idempotency ledgers (`round3/fabrica-app-main-subsystems.md` closing summary, via `production-architecture.md:208`).

---

## 5. Open Questions for PM Decision

1. **Rebrand strategy** — accept the Atlas recommendation to keep on-disk filenames/partition strings/env-var names unchanged (opaque identifiers) and change only display surfaces (FA-T14)? This avoids safeStorage/Chromium-partition breakage entirely but leaves legacy names in artifacts. (`fa-settings-config-datadirs.md:308-309`)
2. **App identity** — changing appId creates a parallel app that won't update over old installs; confirm appId stays or plan a migration story. (FA-T9, `fa-autoupdate-build.md` lines 231-245)
3. **Token-in-env acceptance** — is the loopback hook-token model acceptable long-term given agents can read their own token (R5)? Accept consciously or budget a redesign when spend/actions hang off status. (FA-N2 trade-off note)
4. **Plugin execution primitive** — approve designing a deliberate audited exec/spawn primitive for plugins/agent packages NOW, before `terminal.sendText` fossilizes as the de-facto one? (FA-N3 gap b; risk 5)
5. **Kanban agent-write policy** — may agents write the human planning kanban directly, or owner-only? Must be decided before the task model ports (FA-N9 fix item 2).
6. **Multi-operator approvals** — MC hardcodes actor === "me"; does Fabrica need delegation-of-approval/approver roles at v1? (FA-N9 fix item 7)
7. **Multi-host scope** — is cluster/multi-host deployment in scope for the first release cycle? Determines whether C4 (buzz transport) and FA-T17 (k8s provider blueprint) enter Phase D or get dropped. (FA-T17, `bz-ops-deploy-admin.md`)
8. **Staged rollout** — no staged-rollout mechanism exists anywhere in the app (`stagingPercentage` zero matches, FA-T10); want cohort-based routing built on the generic feed before public launch?
9. **Verification closure** — authorize spot passes for the two HYG-ONLY reports (`mc-adapters-linelevel.md`, `fa-wsl-remote-execution.md`) before their findings back committed roadmap tasks? (Risk 7; Note N1 pattern, `round4-findings-digest.md:138`)
10. **Never-landed discovery** — formally drop or re-dispatch the three missing Round 4 reports (now covered by in-flight R4-1.13/14/22 rewrites)? (`round4-findings-digest.md:271`; tasks.md Checkpoint)

---

## Scan-Coverage Statement

**Read in full this session:** `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` Checkpoint table + Group 3 task table (lines 177-208, 250-369); `analysis/r5-agent-platform-integration-map.md` (269 ln, complete); `analysis/cross-project-notes-r4.md` (316 ln, complete); `analysis/round4-findings-digest.md` (301 ln, complete including Closure Addendum); `analysis/production-architecture.md` (220 ln, complete incl. Round 4 Addendum). AGENTS.md system-provided.

**Not read this session (relied on cited statuses):** verify-pass bodies (`verify/round4-wave2..7`, `verify/round5-wave2-spot-verification.md`, `verify/round4-master-index.md`, `verify/round4-spot-verification.md`) — verification statuses transcribed from the tracker rows quoted inside the four analysis docs above; round1-3 discovery bodies except as quoted; anything under `_sources/` or `../Fabrica-app/` (synthesis layer — no direct source scan; all file:line anchors are second-hand from the cited reports, whose own citation accuracy is covered by the named verify passes).

**Written:** this file only, inside `.Fabrica-atlas-board/analysis/`. No file outside `.Fabrica-atlas-board/` created or modified.

_Report end — ATLAS R5-3.5._
