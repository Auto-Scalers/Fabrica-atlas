# R4-1.25 — Fabrica-app agent-hooks / CLI-probe subsystem deep dive

> Task: ATLAS R4-1.25 (claimed IN_PROGRESS in `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` Group 1 table).
> Substrate for Round-4 findings-digest recommendation **FA-T1** (provider-neutral runner, `analysis/round4-findings-digest.md` §FA-T1 line 124) and capability **C7** (per-agent status probe family, same file lines 54-56).
> READ-ONLY scan of `../Fabrica-app/` — nothing outside `.Fabrica-atlas-board/` was written.
> All paths relative to `../Fabrica-app/` unless prefixed otherwise. All line numbers verified against working tree on 2026-08-23.

---

## 1. Executive summary

The subsystem has **two distinct "probe" meanings that must not be conflated**:

1. **Install-state probes** (`agentHooks:<agent>Status` IPC channels): synchronous reads of each agent's *own config files* to determine whether Fabrica's managed status hooks are registered. 14 channels, one per managed target (`src/main/ipc/agent-hooks.ts:55-68`, handlers at `:142-323`).
2. **Live runtime-status ingestion** (the hook receiver): a loopback HTTP server inside the Electron main process that agent CLIs POST turn-state events to via installed managed scripts/plugins; events are normalized, cached, persisted, and pushed to the renderer (`src/main/agent-hooks/server.ts`).

Detection of *which CLIs exist* is a third mechanism again: a pure-PATH filesystem probe (`src/main/agent-hooks/local-agent-cli-presence.ts`) used only to gate installs, plus a much larger `TUI_AGENT_CONFIG` catalog (~30 agents) that drives launcher detection independent of hooks (`src/shared/tui-agent-config.ts:49-331`).

Key numbers (all verified below):

| Metric | Value | Anchor |
|---|---|---|
| Managed hook install targets | 14 | `src/shared/agent-hook-types.ts:6-21` |
| Loopback hook pathnames accepted | 18 | `src/shared/agent-hook-listener.ts:4418-4437` |
| TUI agent catalog entries | 31 keys | `src/shared/tui-agent-config.ts:49-331` |
| Status states | `working/blocking…` → `working, blocked, waiting, done` | `src/shared/agent-status-types.ts:16` |
| Freshness TTL | 30 min | `src/shared/agent-status-types.ts:268` |
| Refresh cadence | event-push (hooks), zero polling loops | §7 |

**Correction to digest C7**: the digest's "15 named external agent CLIs" (line 56) undercounts the real surface — 14 *managed-install* targets, but **18** distinct `/hook/<source>` pathnames are accepted live (adds `opencode`, `mimo-code`, `pi`, `omp`, `prime-agent`, which are hooked via plugins/extensions rather than the managed config-file installers, see §4.4).

---

## 2. Architecture map (planes and files)

```
Agent CLI process (in FABRICA PTY)
   │  env: FABRICA_AGENT_HOOK_PORT/TOKEN/ENV/VERSION/ENDPOINT   (server.ts:2542-2558)
   │  managed hook fires on lifecycle event
   ▼
curl POST http://127.0.0.1:<port>/hook/<source>                 (claude/hook-service.ts:105-115)
   │  X-FABRICA-Agent-Hook-Token header                         (server.ts:2116)
   ▼
AgentHookServer (main process, ephemeral port listen(0,'127.0.0.1'))   (server.ts:2175-2199)
   │  resolveHookSource(pathname)                               (server.ts:2139 → agent-hook-listener.ts:4439-4441)
   │  normalize → disposition → applyNormalizedStatus           (server.ts:2147-2164)
   ├─▶ last-status.json persistence (userData/agent-hooks/)     (server.ts:159, 2093-2099, 2849-2865)
   ├─▶ listener push: webContents.send('agentStatus:set')       (src/main/index.ts:1499-1576)
   └─▶ renderer pull: ipcMain.handle('agentStatus:getSnapshot') (ipc/agent-hooks.ts:112-119)

Installer plane (startup/settings/CLI):
   applyAgentStatusHooksEnabled                                 (managed-agent-hook-controls.ts:191-213)
     ├─ refreshExistingManagedScripts (unconditional)           (:95-107)
     ├─ detectLocalManagedAgentCliPresence (PATH probe)         (local-agent-cli-presence.ts:149-199)
     └─ per-agent install()/remove()/getStatus()                (managed-agent-hook-registry.ts:23-93)
```

---

## 3. Which CLI agents are probed

### 3.1 Managed hook targets — the canonical 14

`AGENT_HOOK_TARGETS` (`src/shared/agent-hook-types.ts:6-21`):

`claude, openclaude, codex, gemini, antigravity, amp, cursor, droid, command-code, grok, copilot, hermes, devin, kimi`.

Each maps 1:1 to an `agentHooks:<camelCase>Status` IPC channel (`src/main/ipc/agent-hooks.ts:55-68`: `claudeStatus`, `openClaudeStatus`, `codexStatus`, `geminiStatus`, `antigravityStatus`, `ampStatus`, `cursorStatus`, `droidStatus`, `commandCodeStatus`, `grokStatus`, `copilotStatus`, `hermesStatus`, `devinStatus`, `kimiStatus`) and to a per-provider hook service singleton imported at `src/main/ipc/agent-hooks.ts:10-28` (`../claude/hook-service`, `../codex/hook-service`, … one directory per agent under `src/main/<agent>/`).

### 3.2 Live hook sources — the wider 18

`HOOK_SOURCE_BY_PATHNAME` (`src/shared/agent-hook-listener.ts:4418-4437`) accepts POSTs on:

```
/hook/claude  /hook/codex  /hook/gemini  /hook/antigravity  /hook/amp
/hook/opencode  /hook/mimo-code  /hook/cursor  /hook/pi  /hook/omp
/hook/prime-agent  /hook/droid  /hook/command-code  /hook/grok
/hook/copilot  /hook/hermes  /hook/devin  /hook/kimi
```

Unknown pathnames → HTTP 404 (`server.ts:2139-2144`). Note the delta set vs §3.1: `opencode`, `mimo-code`, `pi`, `omp`, `prime-agent` receive events but have no entry in `AGENT_HOOK_TARGETS`; conversely `openclaude` has an installer but shares Claude-family plumbing (its service is literally the Claude service parameterized with `configDirName: '.openclaude'`, `src/main/claude/hook-settings.ts:16-26`).

### 3.3 Launcher-detection catalog — the widest ~31

`TUI_AGENT_CONFIG` (`src/shared/tui-agent-config.ts:49-331`) is the de-facto provider profile table used for *launching* agents (and reused by the hook-presence probe via `managed-agent-hook-targets.ts:11-17`). Entries beyond the hook fleet include: `claude-agent-teams` (`:58-73`, detectCmd `fabrica` + required `claude`), `autohand` (`:89-94`), `ante` (`:95-101`), `trae` (detects `traecli` alias only, `:102-113`), `opencode` (`:114-121`), `mimo-code` (detectCmd `mimo`, `:122-129`), `pi` (`:130-139`), `omp` (`:140-146`), `prime-agent` (`:147-158`), `aider` (`:171-176`), `goose` (`:177-182`), `kilo` (`:189-194`), `kiro` (detects `kiro-cli`, `:195-202`), `crush` (`:203-208`), `aug` (detects `auggie`, `:209-215`), `cline` (`:216-221`), `codebuff` (`:222-227`), `continue` (detects `cn` because `continue` is a shell builtin, `:236-242`), `mistral-vibe` (detectCmd `vibe`, `:266-273`), `qwen-code` (detectCmd `qwen`, `:274-280`), `rovo` (`:281-286`), `openclaw` (`:295-300`). This confirms the well-known-type union in `WellKnownAgentType` (`src/shared/agent-status-types.ts:20-43`) which also accepts any non-empty string as `AgentType` (`:43`) — custom agents are first-class.

Binary-name mapping highlights (evidence the profile table already solves the "npm binary ≠ package name" problem FA-T1 cares about): antigravity→`agy` (`:165-170`), cursor→`cursor-agent` (`:243-250`), command-code deliberately not its `cmd` alias to avoid Windows cmd.exe collision (`:228-235`), kiro-cli (`:196-197`), auggie (`:210-211`), vibe (`:267-268`), qwen (`:275-276`), cn (`:237-238`).

---

## 4. How detection works

### 4.1 CLI binary presence (install gating)

`detectLocalManagedAgentCliPresence(targets, settings, options)` (`local-agent-cli-presence.ts:149-199`):

- Splits `PATH` on the platform delimiter after optionally hydrating it from the user's login shell (`maybeHydrateShellPath`, `:134-147`, calling `../startup/hydrate-shell-path`; failure is logged and detection proceeds with inherited PATH so *"Detection failure must never permit config mutation"* `:144`).
- Collects candidate basenames from each target's `executableCandidates` (= `[detectCmd, ...detectCmdAliases]`, `shared/managed-agent-hook-targets.ts:15` + `tui-agent-config.ts:337-339`) plus the executable token of the user's `agentCmdOverrides[target]` setting (`:163-173`, override extraction at `:92-98`).
- Probes candidates by `stat` + (POSIX) `access(X_OK)` (`isExecutableFile`, `:47-61`); Windows skips the exec bit (`:53-55`) and expands extension-less names over `%PATHEXT%` with default `.COM/.EXE/.BAT/.CMD` (`DEFAULT_WINDOWS_EXTENSIONS :41`, `candidateFileNames :81-90`, `windowsPathExts :67-79`).
- Overrides containing a path separator are resolved directly (absolute required, `~` expanded, else state `'unknown'`) at `:180-193`; plain names count as found if *any* PATH dir match exists (`:194-197`).
- Result shape: `{ [agent]: { state: 'found'|'missing'|'unknown' } }` (`LocalCliPresenceState`, `:15-18`).

This probe runs only inside `installManagedAgentHooks` (`managed-agent-hook-controls.ts:117-133`); a non-`found` result produces a `skipped` status with `skipReason: 'cli_not_found' | 'cli_presence_unknown'` (`:152-162`), never a config write. Disabled agents short-circuit earlier with `skipReason: 'agent_disabled'` (`:138-141`), and a mid-flight master-switch flip aborts via `shouldContinue` with `skipReason: 'hooks_disabled'` (`:142-151`).

### 4.2 Config-file probes (install-state)

Each hook service's `getStatus()` re-reads the agent's own settings file and checks whether the managed script command is still registered:

- **Claude/OpenClaude**: config = `~/.claude/settings.json` / `~/.openclaude/settings.json` (`getConfigPath`, `claude/hook-settings.ts:67-68`; dir names `:21,:26`). `ClaudeHookService.getStatus()` parses the file (unparseable ⇒ `state:'error'`, `claude/hook-service.ts:131-140`), then walks `CLAUDE_EVENTS` (`hook-settings.ts:30-62`: SessionStart, UserPromptSubmit, Stop, StopFailure, SubagentStart, SubagentStop, TeammateIdle, PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest) counting definitions whose `hooks[].command === managedCommand` (`hook-service.ts:143-158`). All present ⇒ `installed`; none ⇒ `not_installed`; subset ⇒ `partial` with detail listing missing events (`:160-172`).
- **Codex/Gemini/Amp/Cursor/Droid/CommandCode/Grok/Copilot/Hermes/Devin/Kimi**: same contract, each with its own native config format under `src/main/<agent>/` (e.g. Amp and Hermes embed provider-native plugin code in their own config dirs instead of shared launchers — called out at `managed-agent-hook-registry.ts:40-45`).
- Error containment: every IPC channel wraps `getStatus()` in try/catch and returns a structured `{state:'error', detail}` row rather than rejecting, so the sidebar can render a coherent error row (`ipc/agent-hooks.ts:137-154`, pattern repeated for all 14 channels through `:311-323`).

### 4.3 Session dirs / state files (runtime plane)

Not config probing but the third detection substrate — the hook server persists per-pane state itself:

- Endpoint files `<userData>/agent-hooks/endpoint.env` (+ `.cmd` variant; names at `shared/agent-hook-endpoint-file.ts:1`) carry port/token so hooks survive app restarts (`server.ts:2093-2098`, `maybeWriteEndpointFile :2569-2579`; deliberately not unlinked at stop to avoid TOCTOU, `:2220`).
- `<userData>/agent-hooks[/namespace]/last-status.json` hydrates the cache before the listener binds ("hydrate before binding… so an early hook POST runs against a populated map", `server.ts:2104-2107`; file-name constant `:159`; versioned/sanitized load `:2597-2708`; atomic tmp+rename write `:2849-2865`; flush-before-quit `:2203-2204`).

### 4.4 Per-agent ingestion mechanisms (how events actually reach /hook/*)

Three distinct transports, all converging on the same receiver:

1. **Shell-script managed hooks** (Claude family pattern): POSIX script pipes stdin payload to curl with form fields `paneKey/tabId/launchToken/worktreeId/env/version/payload` against `http://127.0.0.1:${FABRICA_AGENT_HOOK_PORT}/hook/claude` with 0.5s connect / 1.5s max timeout (`claude/hook-service.ts:105-115`); Windows variant uses `curl.exe` inside a `.cmd` with env guards and a stdin-drain epilogue (`:61-82`). Scripts source `$FABRICA_AGENT_HOOK_ENDPOINT` at invocation time so post-restart PTYs find the new port/token (`:66, 97-99`).
2. **JS plugin injected into the agent's Node process** (OpenCode family): `FABRICA-opencode-status.js` written into OpenCode config overlays (`opencode/hook-service.ts:17-21`), posting to `/hook/opencode` (`getOpenCodeFamilyPluginSource(hookPathname)` parameterization `:38-42`). The plugin caches the endpoint file by `mtime:size:ino` because `message.part.updated` can fire many times per second (`:52-100`) and prefers the on-disk endpoint file over frozen fork-time env (`:115-120`).
3. **Relay ingest** for SSH/WSL panes: the same listener pipeline is hosted relay-side without Electron (`server.ts:1-2` header comment; relay copies at `src/relay/agent-hook-server.ts`, `src/relay/wsl-agent-hook-relay.ts`; guest install machinery under `src/main/agent-hooks/wsl-hook-relay-*.ts`), stamping `connectionId` per docs/design/agent-status-over-ssh.md §5 (referenced `shared/agent-status-types.ts:228-230`).

---

## 5. Output shapes

### 5.1 Install-probe result (14 channels + CLI)

`AgentHookInstallStatus` (`shared/agent-hook-types.ts:32-39`):

```ts
{ agent: AgentHookTarget            // one of the 14 (:6-21)
  state: 'installed'|'not_installed'|'partial'|'error'|'skipped'   // (:24)
  configPath: string                // probed file, '' when skipped/error
  managedHooksPresent: boolean
  detail: string|null
  skipReason?: 'agent_disabled'|'cli_not_found'|'cli_presence_unknown'|'hooks_disabled' }  // (:26-30)
```

Wire version constant `FABRICA_HOOK_PROTOCOL_VERSION = '1'` guards the managed-script request shape (`:51`); the receiver warns on foreign versions instead of silently producing partial payloads (`:42-50`).

### 5.2 Live status event → cached entry → IPC payload

Hook POST body normalizes into `ParsedAgentStatusPayload` (`shared/agent-status-types.ts:164-190`): `state` ∈ `working|blocked|waiting|done` (`:16`), `prompt` (always string), optional `agentType/model/toolName/toolInput/interactivePrompt/lastAssistantMessage/interrupted/sessionBoundary/subagents`. Hard field caps: toolName 60 (`:255`), toolInput 160 (`:257`), assistant message 8000 (`:260`), interactivePrompt 16000 (`:263`), agentType 40 / model 120 (`:287-288`), ≤32 subagents (`:292`), JSON structure limits 4096 tokens / depth 16 (`:293-296`). Malformed payloads return null, never throw (`parseAgentStatusPayload :432-439`); `interrupted/sessionBoundary` are coerced off anything but `done` (`:411-413`).

Server-side enrichment adds pane/routing metadata into `AgentStatusIpcPayload` (`:222-243`): `paneKey` (`${tabId}:${leafId}`, `:103-104`), `launchToken`, `terminalHandle`, `tabId`, `worktreeId`, `connectionId` (SSH vs local authority, `:228-230`), `receivedAt`, `stateStartedAt` (separate from updatedAt so tool pings don't move state start, `:96-99`), `orchestration` context (`:61-72`), `providerSession` resume identity (`:138-140`), `providerSessionOnly` (`:237-238`), `restoredUnconfirmed` (`:143-146`).

History/bounds: rolling per-pane history capped at `AGENT_STATE_HISTORY_MAX = 20` (`:59`).

---

## 6. Runtime pipeline details (server.ts)

- **Auth**: every POST must carry header `x-fabrica-agent-hook-token === this.token` (random UUID per start, `server.ts:2101`, checked `:2116-2120`); wrong token ⇒ 403. Slowloris guard destroys stalled request sockets after `HOOK_REQUEST_SLOWLORIS_MS` (`:2122-2125`).
- **Fail-open**: malformed bodies still answer 204 so a broken hook never blocks the agent CLI (`:2168-2172`).
- **Special routes**: `/statusline/claude` (CLAUDE_STATUSLINE_PATHNAME) feeds usage/rate-limit data separately (`:2130-2138`).
- **Disposition gate**: each incoming event is classified accept/restart/suppress per pane (launch-token authority, `getAgentStatusDisposition` call `:2149-2154`; restart strips the launchToken `:2156-2159`) — this is the anti-spoofing layer that keeps a stale script from clobbering a live pane's authority.
- **Post-accept side effects**: assistant-message retry scheduling and Codex subagent transcript polling are scheduled off accepted events (`:2162-2163`).
- **Interrupt inference fallback**: `inferInterrupt` (`:777-850+`) synthesizes a final `done` when an agent misses its cancellation hook, with strict baseline matching (same prompt, same receivedAt/stateStartedAt, within the 30-min staleness window, `:820-828`) and per-agent quirks: Droid Ctrl+C exits the CLI (`:799-801`); opencode/copilot need double-Escape (`:803-810`); Escape on Claude's AskUserQuestion waiting state routes to `inferQuestionAnswered` (`:811-818`); child-driven panes are protected (`:830-833`).
- **Pane lifecycle**: user dismissal drops only the status row while preserving prompt/tool caches and pane authority (`dropStatusEntry`, `:2241-2249` + comment `:84-88` in `ipc/agent-hooks.ts`); tab-prefix mass-drop at `ipc/agent-hooks.ts:94-104`.
- **Pane authority**: ownership arbitration between local PTY ids and runtime terminal handles is wired via `registerAgentPaneAuthorityIpcHandlers` + `createAgentPaneAuthorityOwnership` (`ipc/agent-hooks.ts:105-111`, modules `ipc/agent-pane-authority-ipc.ts`, `ipc/agent-pane-authority-ownership.ts`).

---

## 7. Refresh cadence (who calls what, when)

There is **no polling loop anywhere in this subsystem**. Cadence by surface:

| Surface | Trigger | Evidence |
|---|---|---|
| Live status rows | **Event-push**: each accepted hook POST → `webContents.send('agentStatus:set', …)` to main window + dashboard popout | `src/main/index.ts:1546-1564` |
| Startup replay of live rows | Renderer pull `agentStatus:getSnapshot` once after workspace hydration ("startup cannot lose replayed statuses while its local store is still empty") | `ipc/agent-hooks.ts:112-119`; preload `src/preload/index.ts:4776-4778` |
| Hook-server start | Once per app launch, before PTY env is built; skipped entirely if master switch off (`isAgentStatusHooksEnabled`) | `index.ts:957-969` |
| Managed-hook install/reinstall | App startup auto-install (packaged builds hydrate shell PATH first) — guarded by persisted off-switch so removed hooks don't silently reappear | `index.ts:2804-2821` |
| Managed-hook reinstall on settings change | Only when `agentStatusHooksEnabled` or `disabledTuiAgents` actually changed | `ipc/settings.ts:204-225` |
| Managed-script refresh (stale launcher rewrite) | Every install pass, *unconditionally before* presence gating, so a CLI that fell off PATH still gets current scripts (#11549 fix) | `managed-agent-hook-controls.ts:91-113` |
| Install-status channels (`agentHooks:*Status`) | On demand only — no desktop-renderer caller exists; consumed by the Fabrica CLI (`fabrica agent hooks status/on/off`) and stubbed for the web client | `cli/handlers/agent-hooks.ts:159-177`; web stub `renderer/src/web/web-preload-api.ts:2986-2992`; absence of desktop callers verified by grep (§10) |
| Row freshness decay | Passive 30-min TTL (`AGENT_STATUS_STALE_AFTER_MS`) evaluated lazily by consumers, plus `restoredUnconfirmed` hydration gate | `shared/agent-status-types.ts:268-282` |

The only timer-driven activity is micro-scheduling inside the server (assistant-message retry, codex subagent poll timers created per accepted event and cleared at stop, `server.ts:2212-2218`), not periodic re-probing.

---

## 8. How results feed the UI

1. **Push lane**: main-process listener registered in `createMainWindow` forwards every enriched event as `agentStatus:set`, with runtime enrichment merged in first (orchestration parent/child context, terminal handle, synthetic-title suppression rules for Codex auto-approval frames) — `index.ts:1499-1576`; dashboard popout receives the same event except suppressed Codex titles unless an AskUserQuestion card is present (`:1562-1564`). Crash breadcrumbs are recorded per agentType/state transition (`:1565`) and hook-derived synthetic terminal titles keep the renderer title tracker in sync where native OSC titles miss idle/permission frames (`:1566-1574`). Pane clears broadcast `agentStatus:clear` to both windows (`:1577-1583`); legacy-pane migration notices use `agentStatus:migrationUnsupported[Clear]` (`:1584-1595`). Listener is detached on window close so replay never fires into destroyed webContents (`:1481-1484`).
2. **Pull lane**: preload exposes `window.api.agentStatus.{onSet,onClear,getSnapshot,inferInterrupt,inferQuestionAnswered,onMigrationUnsupported,onMigrationUnsupportedClear,drop,…}` (`preload/index.ts:4762-4819+`); renderer consumers include `pty-connection.ts`, `use-terminal-pane-lifecycle.ts`, notification dispatch, completion notifications, and the automation session observer (files listed §10 coverage).
3. **Trust pre-seeding lane** (adjacent): `agentTrust:markTrusted` writes the same trust artifacts cursor/copilot/codex would write after user acceptance so their first-launch trust menu doesn't swallow draft pastes; SSH connections route through `markRemoteAgentWorkspaceTrusted` (`ipc/agent-trust.ts:10-53`; presets declared in `TUI_AGENT_CONFIG.preflightTrust`, `tui-agent-config.ts:40,86,249,308`).
4. **CLI lane**: `fabrica agent hooks status|on|off` reports all 14 install statuses (`{enabled, settingsPath, appliedBy: 'runtime'|'offline', statuses[]}`), flipping the master switch through the running runtime's `settings.update` RPC or offline `FABRICA-data.json` edit + local apply (`cli/handlers/agent-hooks.ts:141-177`).

---

## 9. FA-T1 fit assessment (provider-neutral runner)

Digest FA-T1 proposes `Runner.spawn(SpawnSpec)` over the existing PTY layer with pluggable output parsers, seeded from MC's contract trio, wired into FA's per-agent probe family instead of parallel machinery (`analysis/round4-findings-digest.md` line 124). Verdict against the evidence:

**Favorable substrate**

1. **A de-facto provider profile table already exists.** `TuiAgentConfig` (`tui-agent-config.ts:20-47`) is exactly a SpawnSpec-in-waiting: `detectCmd`(+aliases+required commands+unsupported runtimes), `launchCmd`(+per-platform overrides), `expectedProcess`, prompt-injection mode (`argv | flag-prompt | flag-prompt-interactive | flag-interactive | hermes-query | stdin-after-start`, `:4-9`), argv separator, draft-prompt flags/env vars, paste-ready signals, trust presets, key encodings. A `Runner.spawn(SpawnSpec)` can be projected almost mechanically from it (`getTuiAgentLaunchCommand` already centralizes platform/remote selection, `:341-351`).
2. **Registry pattern is uniform and table-driven.** All four installer/remover/refresher/status-reader families are plain `[HookInstallAgent, fn]` arrays over the same 14 services (`managed-agent-hook-registry.ts:23-93`); adding provider #15 today means one service file + four registry rows + one IPC channel + preload entry — the exact boilerplate a neutral runner collapses.
3. **The wire side is already source-parameterized.** `getOpenCodeFamilyPluginSource(hookPathname)` (`opencode/hook-service.ts:42`) and the Claude service's option-object design (`claude/hook-service.ts:45-55`, reused for openclaude via `configDirName`, `claude/hook-settings.ts:16-26`) show per-provider logic is already mostly data + one template, not bespoke plumbing.
4. **Normalization layer is provider-agnostic already.** `normalizeAgentStatusPayload` / `parseAgentStatusPayload` accept any `agentType` string (`agent-status-types.ts:43, 376-425`); the 18-pathname receiver doesn't branch per provider at admission (`server.ts:2139-2164`).

**Friction / gaps FA-T1 must absorb**

1. **The 14 IPC handlers are copy-paste**, differing only in agent id and service singleton (`ipc/agent-hooks.ts:142-323`) — safe to collapse, but the digest's "wire into the probe family" must also cover preload (`preload/index.ts:2159-2185`) and the web stub (`web-preload-api.ts:2986+`), or the channel rename becomes the three-layer contract migration FA-T11 warns about.
2. **Per-provider output parsing lives in shared listener code**, not in services: e.g. Claude subagent rosters, TeammateIdle handling, Codex subagent transcript polls, grok discovery tests (`server.test.ts` is 279KB; targeted modules `server-codex-subagent-transcript.test.ts`, `server-claude-statusline.test.ts`, `server-grok-discovery.test.ts`). "Output parsing pluggable" therefore means extracting parser hooks out of `AgentHookServer`'s normalize path (`server.ts:2147-2163`), which is a refactor of a 2,907-line deliberately-unsplit file (its own header explains why, `server.ts:1`).
3. **Interrupt inference is per-provider policy** embedded in the server (`inferInterrupt` quirks, `server.ts:797-836`) — a neutral runner needs this table moved into the provider profile too.
4. **Spawn itself is not here.** PTY spawn env injection happens in `ipc/pty.ts:1737,1750` (OpenCode/mimo overlay homes) and `index.ts:2531` (`buildPtyEnv()` merge); WSL relay pulls hook coords via `wsl-hook-relay-deps.ts:84`. FA-T1's SpawnSpec must thread through those existing call sites rather than beside them.

**Fit verdict**: HIGH fit, LOW risk of parallel machinery. The subsystem is already profile-driven end-to-end (detect → install → transport → normalize → display); FA-T1 reduces to (a) promoting `TuiAgentConfig` into an explicit `SpawnSpec`/provider-profile contract, (b) registering the 14 services behind one dispatcher instead of 14 IPC channels, (c) extracting per-provider parsers/inference into profile-owned modules. MC's trio adds little beyond naming here — Fabrica's own tables are richer than `SpawnOptions`/`SpawnResult` (`mc-ai-providers.md` basis noted in digest line 124).

---

## 10. Weakness register

1. **Dead-on-desktop channels**: no desktop-renderer consumer of `agentHooks:*Status` was found (grep across `src/renderer/src` returns only the web stub); the 14 channels + preload bindings are effectively CLI/diagnostics-only surface today (`cli/handlers/agent-hooks.ts:160-168`).
2. **Boilerplate multiplication**: adding one provider touches ≥6 files (types union, TUI config, service dir, registry ×4 arrays, ipc handlers, preload, web stub) — measured across §3-§4 cites.
3. **Single-file concentration risk**: `server.ts` at 2,907 lines / 113KB self-documents why it resists splitting (`server.ts:1`); every new provider behavior lands there.
4. **Token in child env**: `FABRICA_AGENT_HOOK_TOKEN` is readable by any process spawned in the pane (inherent to the loopback-token model, `server.ts:2547-2552`); mitigated by 127.0.0.1 bind (`:2198`) but not secret from the agent itself.

---

## 11. Scan-coverage statement

**Read in full (line-by-line)**: `src/main/ipc/agent-hooks.ts` (324 L); `src/main/ipc/agent-trust.ts` (53 L); `src/shared/agent-hook-types.ts` (51 L); `src/shared/agent-status-types.ts` (439 L); `src/main/agent-hooks/local-agent-cli-presence.ts` (200 L); `src/main/agent-hooks/managed-agent-hook-registry.ts` (93 L); `src/main/agent-hooks/managed-agent-hook-controls.ts` (213 L); `src/shared/managed-agent-hook-targets.ts` (32 L); `src/shared/tui-agent-config.ts` (351 L); `src/main/claude/hook-service.ts` (331 L); `src/cli/handlers/agent-hooks.ts` (177 L).

**Read in targeted sections**: `src/main/agent-hooks/server.ts` (2,907 L total; read startup/listen/auth/pipeline `:2090-2249`, inferInterrupt `:777-836`, buildPtyEnv/endpoint `:2500-2579`, header `:1-3`; remaining regions covered by symbol-targeted greps cited inline); `src/shared/agent-hook-listener.ts` (pathname map region `:4418-4441`); `src/main/index.ts` (`:940-999`, `:1470-1599`, `:2780-2829`); `src/main/ipc/settings.ts` (`:195-234`); `src/preload/index.ts` (`:2159-2185`, `:4760-4819`); `src/main/opencode/hook-service.ts` (`:1-120` of 1,171); `src/main/claude/hook-settings.ts` (symbol greps: CLAUDE_EVENTS/config paths); `src/renderer/src/web/web-preload-api.ts` (`:2986-2992`).

**Directory inventories listed**: `src/main/ipc/` (full listing), `src/main/` top level, `src/main/agent-hooks/` (all 78 files enumerated with sizes), `src/main/opencode/`.

**Grep-only sweeps (no full read)**: `agentHooks:`/`agentStatus:` channel usage across `src/{main,preload,renderer}` excluding tests; `getManagedAgentHookStatuses` call sites; `buildPtyEnv` consumers; `resolveHookSource` definition; endpoint-file name constants.

**Skipped**: `node_modules/`, `.next/`, `dist/`, `out/` (per task brief); sibling per-agent service bodies other than claude/opencode (codex/gemini/amp/cursor/droid/command-code/grok/copilot/hermes/devin/kimi/antigravity `hook-service.ts` files — contract assumed identical to the Claude parameterization based on registry uniformity, flagged unverified); `*.test.ts` bodies (only sizes/names inventoried); `src/relay/agent-hook-server.ts` and `wsl-hook-relay-*` internals (transport plane documented from main-side call sites + header comments; deep-dive overlap exists with fa-wsl-remote-execution.md); `hook-stdin-contract.ts`/`installer-utils*.ts` internals (referenced via their import sites only).

No files under `_sources/` or `../Fabrica-app/` were modified (read-only session).
