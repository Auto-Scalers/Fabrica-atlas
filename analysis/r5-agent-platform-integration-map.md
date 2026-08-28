# R5-3.1 — FA Agent-Platform Integration Map (how the five subsystems compose)

> Task: ATLAS R5-3.1 (Group 3 synthesis; claimed IN_PROGRESS in `.Fabrica-atlas-board/Fabrica-atlas-tasks.md`; task `task_d7b7e871fbb7`).
> Input basis (all READ-ONLY, verified on disk 2026-08-23):
>
> - `discovery/round4/fa-ipc-watchers.md` (IPC surface + file watchers)
> - `discovery/round4/fa-plugin-runtime.md` (plugin host runtime)
> - `discovery/round4/fa-agent-hooks-probes.md` (agent-hooks / CLI probes)
> - `discovery/round4/fa-pty-terminal.md` (PTY/terminal subsystem)
> - `discovery/round4/fa-command-palette-search.md` (command palette / search / keybindings)
>
> Cross-referenced: `analysis/round4-findings-digest.md`, `analysis/cross-project-notes-r4.md`, `analysis/similarities-gaps.md`, `analysis/production-architecture.md`.
> All `src/...` paths are relative to `../Fabrica-app/` unless prefixed `_sources/`. Every claim cites the discovery report section that carries the underlying `file:line` evidence. Nothing outside `.Fabrica-atlas-board/` was written.

---

## 1. Executive Summary

Fabrica-app already contains a coherent **agent-capability platform**, assembled from five independently deep subsystems that share real contracts rather than merely coexisting:

1. **IPC surface** — the nervous system: 344 `ipcMain.handle` registrations / 342 unique channels across 65 files, funneled through ONE preload bridge (656 invoke sites, 76 namespaces) behind an audited registration hub (`fa-ipc-watchers.md` §1, §2.2).
2. **PTY plane** — the execution substrate where every agent actually runs: three-plane system (local node-pty / SSH relay / xterm.js renderer) behind one deliberately monolithic audited broker (`ipc/pty.ts`, 7,745 lines) with agent-first primitives: `launchAgent` spawns, owner-adoption registry, OSC-133 lifecycle signals, incarnation-id kill semantics (`fa-pty-terminal.md` §1, §2.1, §6, §9).
3. **Agent-hooks plane** — the observation substrate: a loopback HTTP receiver inside main that 18 `/hook/<source>` pathnames feed turn-state events into; normalized, persisted, pushed to UI with zero polling (`fa-agent-hooks-probes.md` §1, §2, §7).
4. **Plugin host runtime** — the extension substrate: one forked Node child per plugin, zod-walled protocol both directions, consent-gated host calls through ONE chokepoint chain, supervised FSM with backoff, FIFO slot pool capped at 5 (`fa-plugin-runtime.md` S1–S9).
5. **Command palette / keyboard layer** — the operator control surface: one unified Cmd+J palette over seven result families, an ~85-action keybinding registry with auto-generated per-agent and plugin chord families, and saved agent-prompt quick commands wired end-to-end to the launch engine (`fa-command-palette-search.md` §0, §2.1, §7).

The platform composes along four verified flows (**§3**: launch, observe, extend, command). Its contracts (**§4**) — `<namespace>:<action>` channels, `TUI_AGENT_CONFIG` profile table, `paneKey` composite identity, `FABRICA_*` env vars, plugin manifest contributions — are shared by two or more subsystems each, meaning changes propagate predictably but also that renames are three-layer migrations (digest FA-T11, `round4-findings-digest.md:134`).

The honest verdict: this is a best-in-class **single-host agent desktop** substrate. It is NOT yet a fleet-supervision platform: it lacks durable run/task persistence, approval/decision gates, spend enforcement, readiness-gated spawn, orphan sweeps, and restart-policy supervision — precisely the layers mission-control (workflow engine, guards, decision gates) and buzz (SQL quartet, managed-agent supervisor lifecycle) provide, mapped in **§7**.

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

## 3. Composition Map — Four Verified Integration Flows

### 3.1 Flow A — LAUNCH: operator input becomes a running, identified agent process

```
Operator                     Renderer                        Main                              OS
────────                     ────────                        ────                              ──
Cmd+J palette item      ──▶  WorktreeJumpPalette        ──▶  (renderer-local dispatch)
  OR keybinding chord        handleSelectItem                lib/run-quick-command-in-new-tab.ts
  (tab.newAgent.<agent>)     (:2191-2218)                    :55-77  [palette §6.2]
                                   │
                                   ▼
                             launchAgentInNewTab({agent,prompt,...})   [palette §7.1]
                             builds AgentStartupPlan honoring
                             TUI_AGENT_CONFIG promptInjectionMode
                             (lib/launch-agent-in-new-tab.ts:135-140)
                                   │
                                   ▼ window.api.pty.spawn → 'pty:spawn'   [ipc §4.1]
                             ipcMain.handle('pty:spawn') ipc/pty.ts:5786-5825
                             ├─ reservePaneSpawn dedup (paneKey composite)  [pty §2.1]
                             ├─ ClaimedAgentPtyOwnerRegistry adoption       [pty §2.1]
                             ├─ beginPtyRegistration BEFORE provider.spawn  [pty §2.1]
                             ▼
                             LocalPtyProvider.spawn() local-pty-provider.ts:540
                             ├─ buildSpawnEnv injects FABRICA_AGENT_HOOK_PORT/
                             │  TOKEN/ENV/VERSION/ENDPOINT + FABRICA_TERMINAL_HANDLE
                             │  (ipc/pty.ts:2485-2496; hooks §2 diagram, server.ts:2542-2558)
                             ├─ worktree-scoped HISTFILE injection [pty §5.2]
                             ▼
                             Agent CLI process starts, self-identified via env
```

**Why this is a composition, not a stack of features:** the same `TUI_AGENT_CONFIG` entry drives (a) palette/quick-command validation (`promptInjectionMode !== 'stdin-after-start'`, palette §6.2), (b) keybinding slot generation (`buildAgentTabKeybindingDefinitions`, palette §2.1), (c) hook-install presence probing (`managed-agent-hook-targets.ts:11-17`, hooks §3.3), and (d) PTY launch command construction (`getTuiAgentLaunchCommand`, hooks §9.1). One table, four consumers — the platform's single most load-bearing data contract.

### 3.2 Flow B — OBSERVE: agent turn-state reaches UI without polling

```
Agent CLI lifecycle event (inside its PTY)
   │ managed hook script/plugin fires
   │ env coords sourced from endpoint.env (survives app restart, hooks §4.3)
   ▼
curl POST http://127.0.0.1:<port>/hook/<source>          [hooks §2]
   │ X-FABRICA-Agent-Hook-Token header (403 on mismatch; slowloris guard)
   ▼
AgentHookServer (main)  server.ts:2175-2199
   ├─ resolveHookSource → 1 of 18 pathnames              [hooks §3.2]
   ├─ parseAgentStatusPayload: hard field caps,
   │   malformed ⇒ null never throw                      [hooks §5.2]
   ├─ disposition gate (launch-token authority;
   │   anti-spoofing vs stale scripts)                   [hooks §6]
   ├─ enrich: paneKey/tabId/worktreeId/connectionId/
   │   orchestration parent-child/providerSession        [hooks §5.2]
   ├─ last-status.json atomic persist + startup hydrate  [hooks §4.3]
   ▼
webContents.send('agentStatus:set') main+dashboard-popout [hooks §7]
   │                                                     [ipc §4.12]
   ├─ renderer panes (pty-connection, use-terminal-pane-lifecycle)
   ├─ notifications + completion notifications           [hooks §8]
   ├─ palette live-status dots WITHOUT re-rendering body [palette §3.5]
   └─ pull lane: agentStatus:getSnapshot startup replay  [hooks §7]
```

Cross-links that make this a platform property:

- **PTY ⇄ hooks identity:** the hook payload's `paneKey` (`${tabId}:${leafId}`, hooks §5.2) is the SAME composite identity minted by `makePaneKey(tabId, leafId)` at PTY spawn (pty §4). Pane authority arbitration between local PTY ids and runtime terminal handles closes the loop (`agent-pane-authority-ownership.ts`, hooks §6; ipc §4.12).
- **PTY ⇄ hooks signals:** when hooks miss events, PTY-side OSC-133 scanning provides the fallback lifecycle substrate — `terminal-command-lifecycle.ts:2-29`, `agent-completion-coordinator.ts`, `agent-interrupt-inference.ts`, `agent-question-answered-inference.ts` (pty §6, §9.2), mirrored by hook-server `inferInterrupt` synthesizing final `done` states (hooks §6).
- **Headless/mobile reuse:** the runtime tail buffer fed from provider `onData` means external consumers read agent output through `pty:getMainBufferSnapshot` without owning the xterm pane (pty §3.1, §9.4) — the same stream, one more consumer class.

### 3.3 Flow C — EXTEND: third-party code participates under consent

```
Plugin manifest (contributes.commands/events)
   │ approval double-check + content-hash verify         [plugin S7 L1]
   ▼ fork(plugin-host-entry.js)                          [plugin S1]
zod-walled fork IPC (init/invokeCommand/deliverEvent/hostResult)
   │                                                     [plugin S3]
   ├─ activate(FABRICA) → ready{commands[]} → post-ready
   │    validation vs manifest; undeclared ⇒ deactivate  [plugin S7]
   ├─ commands registered under PLUGIN_COMMAND_EXTENSION_POINT
   │    → lazily activated on first call                 [plugin S11]
   │         │
   │         ▼ surfaced as palette quick-action entries
   │    WorktreeJumpPalette quick-action family merges
   │    plugin commands (:1341-1348) + rebindable
   │    plugin:<key>/<id> chords                         [palette §0.4, §3.4]
   │
   ├─ events: CLOSED set v0 = worktree.created /
   │    worktree.removed / agent.status.changed          [plugin S10]
   │    manifest-subscribed arrival ACTIVATES worker     [plugin S10]
   │    ⚠ agent.status.changed is the hooks→plugins bridge
   │      (Flow B output becomes plugin trigger input)
   │
   └─ host.call → ONE chokepoint chain:
      executeHostCall → resolvePolicy host-side → gate order
      unknown_method→panel_forbidden→consent_required→capability_denied
      → audit-intent-before-handler → result-schema validate
      → terminal.sendText anti-redirect (re-lists actives first) [plugin S9]
            │
            ▼ terminal.sendText lands on the PTY plane
      (provider-owned handles; anti-redirect invariant = multi-pane
       agent-write safety rule, transferable per plugin S12.2)
```

Relay parity: headless callers hit the identical gate chain via `relay/plugin-host-call-handler.ts` with the viaPanel bit fixed by method name (plugin S9) — the extension substrate is already multi-transport.

### 3.4 Flow D — WATCH & SYNC: filesystem/git truth keeps all surfaces coherent

The fourth flow is the watcher stack (`fa-ipc-watchers.md` §5), which no reference repo possesses (§7 there): crash-isolated forked watcher children (canary deadlock detector, crash fuse 3-per-120s), WSL in-distro pollers, SSH remote intent persistence with reconnect ladders, worktree base-dir/git-common polling services feeding `worktrees:changed` / `worktrees:gitStatusMetadataChanged` / `worktrees:headIdentitiesChanged` pushes (ipc §5.5). In the platform picture it plays supplier: worktree.created/removed plugin events (plugin S10) and palette worktree results both consume state this layer maintains; `fs:changed` pushes drive editor liveness (ipc §4.3). It is also the highest preservation risk during any rebrand (ipc §8.3; digest FA-T11 `round4-findings-digest.md:134`).

### 3.5 Composition diagram (all flows superimposed)

```
                        ┌──────────────────────────── OPERATOR ────────────────────────────┐
                        │  Cmd+J palette · ~85-action keybinding registry · quick commands │
                        │  (palette report)                                                │
                        └──────────────┬──────────────────────────────▲────────────────────┘
                                       │ Flow A: launch               │ Flow B: status push
                                       ▼                              │ (agentStatus:set)
                    ┌──────────── MAIN PROCESS (audited IPC hub, ipc §2.2) ─────────────┐
                    │  pty.ts broker ◀── FLOW C host-call chokepoint (terminal.sendText)│
                    │     │  ▲                                                          │
                    │     │  └── ClaimedAgentPtyOwnerRegistry adoption                  │
                    │  AgentHookServer (loopback, token auth, fail-open)  ◀── hooks     │
                    │  PluginService (fork children, gate, audit, slot pool ≤5)         │
                    │  Watcher stack (crash-isolated children, WSL pollers, SSH intent) │
                    └───────┬───────────────┬───────────────────────┬───────────────────┘
                            │               │                       │
                     agent CLIs         plugins (forked        remote hosts: SSH relay
                     (local/WSL/SSH     Node children,         plane: relay PTY handler +
                     PTYs) post hooks   zod-walled)            relay agent-hook-server +
                     to 127.0.0.1       subscribe to           wsl-hook-relay (hooks §4.4)
                     (Flow B origin)    agent.status.changed   (Flows A/B/C all multi-host)
```

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

## 5. Extension Points for the Atlas Project (After-Rebrand insertion seams)

Ranked by leverage-to-effort, each verified present in source:

1. **Palette "Agents" section via `CmdJQuickAction` shape** — the action layer is only 6 built-ins + plugin entries (`cmd-j/quick-actions.ts:59-182`); agent catalog and agent quick commands are fully plumbed but absent from the palette today (verified non-import, palette §7.3.3, §9 rows 1-2). Cheapest high-value win; telemetry sources `'command_palette'/'workspace_jump_palette'` already exist so no schema migration (palette §7.3.4).
2. **Promote `TuiAgentConfig` → explicit `Runner.spawn(SpawnSpec)`** (digest FA-T1, `round4-findings-digest.md:124`; fit verdict HIGH/LOW-risk, hooks §9): collapse 14 copy-paste `agentHooks:*Status` handlers into one dispatcher; move per-provider parsers/interrupt quirks out of the 2,907-line `server.ts` into profile-owned modules (hooks §9 friction items 1-3).
3. **One guard stack at the IPC boundary** — `register-core-handlers.ts:109-234` is THE single enforcement point where MC's ordered guard stack should land (digest FA-T2 `round4-findings-digest.md:125`; notes-r4 FA-N7 line 195-208 including spend-ladder fleet brake).
4. **Decision-gate escalation on existing detection** — OSC-133 + interrupt/question inference helpers (pty §9.2; hooks §6) are the substrate MC's decision gates freeze/dispatch against (digest FA-T3, `:126`). No new detection engineering needed — only a decision queue consuming signals that already flow.
5. **Plugin event-set growth** — the closed enum + per-event payload-schema pattern extends cleanly; adding `run.started/finished/token.spend` domain events is additive (plugin S12.3c). This turns plugins into first-class fleet observers.
6. **Agent-capability packages on the existing SDK shape** — `commands ≈ tools, events.on ≈ triggers, host.call ≈ gated side-effect API, grantedCapabilities ≈ permissions`; `agents` manifests already reserved in contributions (`plugin-manifest.ts:116-119`) — adoptable "nearly verbatim" (plugin S12.1).
7. **Supervision reader without pane ownership** — `pty:getMainBufferSnapshot` + serializer registry + runtime tail buffers let an external manager/fleet view read agent output safely (pty §9.4); combine with `agentStatus:getSnapshot` pull lane (hooks §7) for a supervision snapshot API.
8. **Multi-host by construction** — Flows A/B/C all have relay/WSL twins (relay PTY handler pty §8; `relay/agent-hook-server.ts` + `wsl-hook-relay-*` hooks §4.4; relay plugin host-call parity plugin S9), so fleet scope does not require re-architecting any flow — only the missing supervision layers of §7.

---

## 6. Integration Risks & Gaps (within the current composition)

**R1 — Contract-rename blast radius.** Channel strings appear simultaneously in 65 main files, 656 preload sites, ~78 renderer namespaces (ipc §8.4); renaming any namespace is a coordinated three-layer migration (digest FA-T11). Same pattern for `agentHooks:*Status` collapse (hooks §9 friction 1: preload + web stub must move together).

**R2 — Single-file concentration at two chokepoints.** `ipc/pty.ts` (7,745 lines, deliberate, pty §1) and `main/agent-hooks/server.ts` (2,907 lines, header documents why unsplit, hooks §10.3): every new provider behavior lands in these files; both are the exact places fleet features will want to modify.

**R3 — Provider-addition boilerplate ≥6 files** (types union, TUI config row, service dir, 4 registry arrays, IPC handlers, preload, web stub) — measured, hooks §10.2. Unscaled, this is the growth ceiling of the observe plane.

**R4 — Plugin sandbox honesty vs autonomous agents.** Post-`activate()` plugin code holds raw Node power inside its own process; the sandbox constrains only host-mediated access (plugin S1 honesty note, S4.7). Least-privilege agent packages need a restricted runtime mode (plugin S12.5a). Relatedly the host API has **no exec/spawn/fs method** — agent packages will demand one, forcing the audited-execution primitive `terminal.sendText` only gestures at (plugin S12.5b).

**R5 — Token-in-child-env inheritance.** `FABRICA_AGENT_HOOK_TOKEN` is readable by anything spawned in the pane; mitigated by loopback bind but not secret from the agent itself (hooks §10.4). An agent can therefore impersonate its own pane's feed — acceptable today because disposition gates on launch tokens (hooks §6), but a spoofing surface once spend/actions hang off status.

**R6 — Passive staleness + fail-open posture.** 30-min lazy TTL decay (hooks §5.2, §7) and fail-open 204 responses (hooks §6) are right for never-blocking-the-CLI, wrong for supervision semantics: a supervisor needs positive liveness (heartbeat/TTL enforcement), not lazy decay — cf. buzz's TTL=3×heartbeat pattern (notes FA-T16, `cross-project-notes-r4.md` area; digest `:281`).

**R7 — Dead surface.** `agentHooks:*Status` channels have no desktop-renderer consumer — CLI/diagnostics-only today (hooks §10.1). Any fleet UI wiring them inherits a channel family nobody exercises end-to-end.

**R8 — Palette blind spot.** No generic palette-open/execute analytics event; agent catalog + quick commands absent from palette; slash-command control confined to native chat (palette §9 row 7). Operators cannot currently discover the agent fleet from the primary control surface.

**R9 — Load-bearing exclusivity of the watcher stack.** Fabrica-exclusive among the three repos; crash isolation, canary, fuses, removal fencing, remote intent persistence are all load-bearing and must be preserved verbatim through any framework change (ipc §8.3; digest FA-T11).

**R10 — Pane-authority evolution.** Ownership arbitration between local PTY ids and runtime terminal handles (`agent-pane-authority-ownership.ts`, retire/transfer channels ipc §4.12) is recent machinery; multi-writer agent orchestration will stress it (the anti-redirect invariant of plugin S9.terminal.sendText shows the failure mode is already known).

---

## 7. What Is Missing to Reach MC/buzz-Level Fleet Supervision

Framing: FA's substrate exceeds both references at transport and observation (push IPC everywhere vs MC's zero-WebSockets polling — ipc §7.1; 18-source hook fleet vs MC's single hard-coded binary — digest `:56`; the watcher stack absent in both — ipc §7.2). What FA lacks is the **supervision layer above the substrate**. Gap-by-gap:

| # | Missing capability | Reference blueprint | Evidence / anchor |
|---|---|---|---|
| M1 | **Approval-gated autonomy for irreversible actions** (risk table, bypass detection, dry-run rails) | MC 8-state FSM + execute-route guard stack | digest FA-T2 `round4-findings-digest.md:125`; mc-execute-guards 13-layer order-of-eval (per `analysis/cross-project-notes-r4.md` FA-N7) |
| M2 | **Decision-gate escalation** (runaway/looping runs freeze; structured Retry/Skip/Stop questions injected into retry prompts) | MC decisions.json 3-layer gating + retry-guidance injection | digest FA-T3 `:126`; detection substrate already present (pty §9.2, hooks §6) |
| M3 | **Durable run/task/approval persistence** — FA supervises via memory + JSON snapshots (last-status.json, hooks §4.3) with no run history model | buzz SQL quartet (status enums as FSMs, SHA-256 scoped approval tokens, TOCTOU-safe transitions, at-most-once claims) | digest FA-T6 `:129`; redesign note digest FA-T4 `:127` ("replace MC's JSON+PID-probing with FA IPC+SQLite") |
| M4 | **Persistent retry queue + bounded continuation chains + global concurrency slots** shared by ALL entry points through one health monitor | MC workflow engine §7/§9a | digest FA-T4 `:127` |
| M5 | **Readiness-gated spawn + orphan sweep + restart policy for long-running agents** — FA has adoption (pty §2.1) and continuity (grace timers, serialize/revive, replay buffers, stable panes — pty §9.6) but no pre-spawn readiness computation, no `BUZZ_MANAGED_AGENT`-style ownership marker, no quiescence-window auto-restart | buzz managed-agent lifecycle (readiness before spawn `readiness.rs:402`; receipt atomicity `runtime.rs:978-982`; orphan proof env `orphan_sweep.rs:110-119`; SIGTERM→SIGKILL groups `process.rs:281`; 3-min quiescence `autoRestartPolicy.ts:6-9`) | `similarities-gaps.md:162` (G-BZ-15, "the precise local fleet-supervisor blueprint FA lacks") |
| M6 | **Usage/cost ledger WITH budget enforcement** — FA captures per-provider usage channels (`${prefix}:getSummary/getDaily`, ipc §4.12) but no budgets, attribution, or pre-flight estimates on runs | buzz `agent_metric_index` shape + MC-sourced budget requirement | digest FA-T7 `:130` |
| M7 | **Operator alerting depth** — FA has the full attention pipeline (tray pre-gate, burst dedupe, click-to-pane, 13-agent copy normalization) but MC proves four gaps matter: dead-backend signal, seen-vs-acknowledged separation, aging escalation, outbound transports | FA pipeline × MC notification lessons | digest FA-T13 `:278` |
| M8 | **Searchable agent-output archive with privacy discipline** (generated-tsv indexing, kind allowlists, per-hit re-auth) | buzz search crate patterns | digest FA-T15 `:281` |
| M9 | **Fleet live-presence plumbing** (refcount+debounce topic manager, heartbeat-scaled TTL) replacing passive 30-min decay (R6) | buzz pubsub presence | digest FA-T16 `:281` |

Sequencing note (from `cross-project-notes-r4.md` FA-N10): task model (M3/M4) → guard stack (M1) → decision queue (M2) is the dependency order. [Correction 2026-08-23, R6-F1FIX per verify/r6-v7-synthesis-consistency.md F-1: this line previously listed guard stack → decision queue → task model, reversing the FA-N10 source order (task model first FA-N9, guard stack second FA-N7, decision queue third FA-N8 — cross-project-notes-r4.md:290-294).] M5/M6/M9 harden the local single-host fleet before any multi-host expansion, which the relay twins of §5.8 make cheap afterwards.

---

## 8. Verification Notes

- All five source reports were read from disk in full (or, for `fa-ipc-watchers.md` and `fa-command-palette-search.md`, in full across two reads each); their internal citations were themselves spot-verified by R4 verification passes: fa-plugin-runtime (wave-5 PASS, `verify/round4-wave5-spot-verification.md`), fa-agent-hooks-probes (wave-6 PASS incl. C7 count correction, ledger line 1 of this task file + `verify/round4-wave6-spot-verification.md`), fa-command-palette-search (wave-4 PASS, `verify/round4-wave4-spot-verification.md`), fa-ipc-watchers (round4 base pass, `verify/round4-spot-verification.md`), fa-pty-terminal (hygiene-only per digest closure addendum caveat `round4-findings-digest.md:267` — content treated as high-confidence but factually unverified by a second worker; flagged here for Round-5 verification planning).
- Digest numbers used: FA-T1..T18 locations cited inline from `analysis/round4-findings-digest.md`.

## 9. Scan-Coverage Statement

**Read (this session):** `discovery/round4/fa-ipc-watchers.md` (lines 1-425, complete), `fa-plugin-runtime.md` (226 lines, complete), `fa-pty-terminal.md` (405 lines, complete), `fa-command-palette-search.md` (788 lines, complete across offsets), `fa-agent-hooks-probes.md` (241 lines, complete), `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` (checkpoint + group tables + session ledger), grep survey of `analysis/` (round4-findings-digest.md FA-T block + caveats read via targeted matches; cross-project-notes-r4.md FA-N1/N7/N10 areas; similarities-gaps.md G-BZ-15 region).

**Not re-read (relied on cited reports + verification passes):** primary sources under `../Fabrica-app/src` and `_sources/` (synthesis task; no direct source scan performed this session — all file:line anchors are second-hand from the five verified reports, per the verification notes in §8); `mc-workflow-engine.md`, `mc-decision-gates.md`, `bz-db-schema.md`, `bz-search-pubsub.md` bodies (consumed only via digest/cross-project-notes citations).

**Written:** this file only, inside `.Fabrica-atlas-board/analysis/`. No file outside `.Fabrica-atlas-board/` created or modified.
