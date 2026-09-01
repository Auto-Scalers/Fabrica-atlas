# R5-3.1 — FA Agent-Platform Integration Map (how the five subsystems compose)

> Task: ATLAS R5-3.1 (Group 3 synthesis; claimed IN_PROGRESS in `.Fabrica-atlas-board/Fabrica-atlas-tasks.md`; task `task_d7b7e871fbb7`).
> Input basis (all READ-ONLY, verified on disk 2026-08-23):
>
> - `discovery/fabrica-app/fa-ipc-watchers.md` (IPC surface + file watchers)
> - `discovery/fabrica-app/fa-plugin-runtime.md` (plugin host runtime)
> - `discovery/fabrica-app/fa-agent-hooks-probes.md` (agent-hooks / CLI probes)
> - `discovery/fabrica-app/fa-pty-terminal.md` (PTY/terminal subsystem)
> - `discovery/fabrica-app/fa-command-palette-search.md` (command palette / search / keybindings)
>
> Cross-referenced: `analysis/findings-and-recommendations.md`, `analysis/task-notes.md`, `analysis/cross-repo-analysis.md`, `analysis/production-architecture.md`.
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

## 5. Verification Notes

- All five source reports were read from disk in full (or, for `fa-ipc-watchers.md` and `fa-command-palette-search.md`, in full across two reads each); their internal citations were themselves spot-verified by R4 verification passes: fa-plugin-runtime (wave-5 PASS), fa-agent-hooks-probes (wave-6 PASS incl. C7 count correction), fa-command-palette-search (wave-4 PASS), fa-ipc-watchers (round4 base PASS), fa-pty-terminal (hygiene-only — content treated as high-confidence but factually unverified by a second worker; flagged for verification).
- Verification statuses for all reports: see `analysis/findings-and-recommendations.md` §1.

## 6. Scan-Coverage Statement

**Read (this session):** `discovery/fabrica-app/fa-ipc-watchers.md` (lines 1-425, complete), `discovery/fabrica-app/fa-plugin-runtime.md` (226 lines, complete), `discovery/fabrica-app/fa-pty-terminal.md` (405 lines, complete), `discovery/fabrica-app/fa-command-palette-search.md` (788 lines, complete across offsets), `discovery/fabrica-app/fa-agent-hooks-probes.md` (241 lines, complete), `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` (checkpoint + group tables + session ledger), grep survey of `analysis/` for cross-references.

**Not re-read (relied on cited reports + verification passes):** primary sources under `../Fabrica-app/src` and `_sources/` (synthesis task; no direct source scan performed this session — all file:line anchors are second-hand from the five verified reports, per the verification notes in §5); `mc-workflow-engine.md`, `mc-decision-gates.md`, `bz-db-schema.md`, `bz-search-pubsub.md` bodies (consumed only via digest/cross-project-notes citations).

**Written:** this file only, inside `.Fabrica-atlas-board/analysis/`. No file outside `.Fabrica-atlas-board/` created or modified.
