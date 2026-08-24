# FA Hook-Service Per-Agent Parity Check (R6-T4)

> Task: R6-T4 — convergence-memo authorized targeted task (task_bb8361bd4f3c / ctx_1232dc503bee).
> READ-ONLY mechanical diff of every per-agent hook-service under `../Fabrica-app/src/main/<agent>/hook-service.ts`
> against the canonical contract embodied in `claude/hook-service.ts`.
> All paths relative to `../Fabrica-app/` unless prefixed. Every claim carries file:line.

---

## 1. Scope and Method

16 non-test `hook-service.ts` files exist under `src/main/`:

| # | Agent dir | Bytes |
|---|---|---|
| 1 | amp | 13,896 |
| 2 | antigravity | 17,369 |
| 3 | claude | 13,102 |
| 4 | codex | 64,976 |
| 5 | command-code | 7,731 |
| 6 | copilot | 15,663 |
| 7 | cursor | 11,846 |
| 8 | devin | 9,233 |
| 9 | droid | 12,542 |
| 10 | gemini | 11,936 |
| 11 | grok | 12,213 |
| 12 | hermes | 18,360 |
| 13 | kimi | 9,321 |
| 14 | mimo | 3,055 |
| 15 | openclaude | 288 |
| 16 | opencode | 54,142 |

Method: full read of the reference (`claude/hook-service.ts`, 331 lines) + both registry
wiring files; signature-level extraction (`class`/method/export lines with line numbers)
for the other 15; targeted body reads where a deviation needed confirmation (kimi install/
remove core, openclaude whole file, opencode class methods).

---

## 2. The Canonical Contract

The reference implementation is **`ClaudeHookService`** (`src/main/claude/hook-service.ts:121`),
explicitly treated as canonical by other services ("see claude/hook-service.ts" at
`src/main/codex/hook-service.ts:772` and `:785`, and `src/main/gemini/hook-service.ts:60` and `:75`).
The consumer-facing surface is defined by the four registry arrays:

- Contract types: `ManagedAgentHookInstaller/ScriptRefresher/Remover/StatusReader`
  (`src/main/agent-hooks/managed-agent-hook-registry.ts:18-21`)
- Remote plane contract: `(sftp, remoteHome) => Promise<AgentHookInstallStatus>`
  (`src/main/agent-hooks/remote-managed-hook-installers.ts:33-40`)

Canonical members (from `ClaudeHookService`):

| Member | Reference cite | Signature |
|---|---|---|
| `install()` | claude/hook-service.ts:187 | `() => AgentHookInstallStatus` |
| `refreshManagedScripts()` | claude/hook-service.ts:175 | `() => Promise<void>` |
| `remove()` | claude/hook-service.ts:296 | `() => AgentHookInstallStatus` |
| `getStatus()` | claude/hook-service.ts:128 | `() => AgentHookInstallStatus` (4-state: installed / partial / not_installed / error, :162-171) |
| `installRemote(sftp, remoteHome)` | claude/hook-service.ts:244 | `(SFTPWrapper, string) => Promise<AgentHookInstallStatus>` |
| exported singleton | claude/hook-service.ts:331 | `export const claudeHookService = new ClaudeHookService()` |
| options-parametrized constructor | claude/hook-service.ts:45-49, :124-126 | `{agent, displayName, settings}` — this is what makes OpenClaude a 8-line re-use (:4-8) |

Reference behaviors that define "full parity":

1. **Partial-state reporting**: getStatus counts present vs missing events and returns
   `state: 'partial'` instead of false 'installed' (claude/hook-service.ts:143-171).
2. **Script-before-settings write ordering** on remote installs
   (claude/hook-service.ts:266-276 comment "write scripts before settings").
3. **Endpoint-refresh sourcing** so PTYs surviving an FABRICA restart keep reporting:
   Windows `call "%FABRICA_AGENT_HOOK_ENDPOINT%"` (:66), POSIX `. "$FABRICA_AGENT_HOOK_ENDPOINT"` (:97-99).
4. **Windows .cmd + POSIX .sh dual script bodies** via `getManagedScript(target)`
   (claude/hook-service.ts:57-119).
5. **stdin-drain / env-guard epilogue** from shared `hook-stdin-contract` imports
   (claude/hook-service.ts:17-22).

---

## 3. Parity Table

Legend: ✅ implemented · ➖ deliberately absent (documented rationale exists) · ❌ absent ·
`inherited` = provided by reuse of ClaudeHookService.

### 3a. Local-plane contract (registry: managed-agent-hook-registry.ts)

| Agent | Class (cite) | Singleton | install | remove | getStatus | partial state | refreshManagedScripts | Registered installer/remover/status |
|---|---|---|---|---|---|---|---|---|
| claude | ClaudeHookService :121 | :331 | ✅ :187 | ✅ :296 | ✅ :128 | ✅ :169 | ✅ :175 | ✅ reg :24/:62/:79 |
| openclaude | reuses ClaudeHookService | openclaude/hook-service.ts:4 | inherited | inherited | inherited | inherited | inherited | ✅ reg :25/:63/:80 |
| codex | CodexHookService :1024 | :1614 | ✅ :1264 | ✅ :1569 | ✅ :1117 (param'd) | ✅ :1243 | ✅ :1025 | ✅ reg :26/:64/:81 |
| gemini | GeminiHookService :100 | :308 | ✅ :149 | ✅ :274 | ✅ :105 | ✅ :143 | ✅ :101 | ✅ reg :27/:65/:82 |
| antigravity | AntigravityHookService :299 | :464 | ✅ :368 | ✅ :445 | ✅ :312 | ✅ :359 | ✅ :300 | ✅ reg :28/:66/:83 |
| amp | AmpHookService :330 | :383 | ✅ :336 | ✅ :372 | ✅ :331 | ✅ :79,:87 | ➖ ABSENT (deliberate) | ✅ reg :29/:67/:84 |
| cursor | CursorHookService :104 | :311 | ✅ :156 | ✅ :277 | ✅ :109 | ✅ :150 | ✅ :105 | ✅ reg :30/:68/:85 |
| droid | DroidHookService :162 | :328 | ✅ :230 | ✅ :295 | ✅ :167 | ✅ :206,:214,:221 | ✅ :163 | ✅ reg :31/:69/:86 |
| command-code | CommandCodeHookService :91 | :234 | ✅ :143 | ✅ :201 | ✅ :96 | ✅ :137 | ✅ :92 | ✅ reg :32/:70/:88 |
| grok | GrokHookService :185 | :334 | ✅ :237 | ✅ :301 | ✅ :190 | ✅ :231 | ✅ :186 | ✅ reg :33/:71/:89 |
| copilot | CopilotHookService :186 | :416 | ✅ :258 | ✅ :376 | ✅ :191 | ✅ :240,:243,:252 | ✅ :187 | ✅ reg :34/:72/:90 |
| hermes | HermesHookService :449 | :541 | ✅ :465 | ✅ :520 | ✅ :450 | ✅ :258 (buildStatus) | ➖ ABSENT (deliberate) | ✅ reg :35/:73/:91 |
| devin | DevinHookService :82 | :233 | ✅ :140 | ✅ :210 | ✅ :87 | ✅ :128 | ✅ :83 | ✅ reg :36/:74/:92 |
| kimi | KimiHookService :158 | :255 | ✅ :179 | ✅ :235 | ✅ :163 | ✅ :152 (buildStatus) | ✅ :159 | ✅ reg :37/:75/:93 |
| mimo | MimoCodeHookService :50 | :80 | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | ❌ NOT registered |
| opencode | OpenCodeHookService :1002 | :1166 | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | ❌ NOT registered |

Registry wiring cites: installers array reg :23-38; refreshers array reg :46-59;
removers array reg :61-76; status readers array reg :78-93.

The amp/hermes refresher omission is deliberate and test-enforced: registry comment
reg :40-45 — "Amp and Hermes write provider-native plugin code into their own config dirs
with their own install lifecycles, not shared launchers ... Enforced by the coverage test in
managed-hook-script-refresh.test.ts".

### 3b. Remote plane (registry: remote-managed-hook-installers.ts)

All 14 managed agents are wired into the SSH/SFTP installer loop
(remote-managed-hook-installers.ts:42-71); loop runner :79-119 with abort-signal (:92),
error-degrade (:103-115), and per-agent allow-list (:85-89). The exported invariant list
`REMOTE_MANAGED_HOOK_INSTALLER_AGENTS` (:76-77) documents the historical bug class this
prevents: "the omission that hid Droid/Copilot status over SSH" (:73-75).

| Agent | installRemote cite | Notes vs canonical signature |
|---|---|---|
| claude | hook-service.ts:244 | canonical POSIX-only-by-design remote (:245 comment) |
| openclaude | remote-managed-hook-installers.ts:44 | inherited from ClaudeHookService |
| codex | hook-service.ts:1401; wired :45-55 | extended opts `{codexHomeDir, deferTrustUntilConfigToml}` (remote-managed :19-23) |
| gemini | hook-service.ts:204 | canonical shape |
| antigravity | hook-service.ts:402 | canonical shape |
| amp | hook-service.ts:346 | canonical shape |
| cursor | hook-service.ts:220 | canonical shape |
| command-code | hook-service.ts:163 | canonical shape |
| copilot | hook-service.ts:305 | canonical shape |
| grok | hook-service.ts:257; wired :62-66 | extended opts `grokHomeDir` (remote-managed :24-25) |
| droid | hook-service.ts:255 | canonical shape |
| hermes | hook-service.ts:483 | canonical shape |
| devin | hook-service.ts:162 | canonical shape |
| kimi | hook-service.ts:202 | canonical shape; POSIX-only by design (:200-201 comment) |
| mimo | — | no remote plane (not an installer) |
| opencode | — | no remote plane (not an installer) |

### 3c. Event catalogs per agent

| Agent | Events (count) | Cite |
|---|---|---|
| claude | 11: SessionStart, UserPromptSubmit, Stop, StopFailure, SubagentStart, SubagentStop, TeammateIdle, PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest | src/main/claude/hook-settings.ts:33-62 |
| codex | 8: SessionStart, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, SubagentStart, SubagentStop, Stop | src/main/codex/hook-service.ts:87-97 |
| antigravity | 4: PreInvocation, PostInvocation, Stop, PostToolUse | src/main/antigravity/hook-service.ts:38-53 |
| command-code | 3: PreToolUse, PostToolUse, Stop | src/main/command-code/hook-service.ts:25-35 |
| copilot | 13: SessionStart, SessionEnd, UserPromptSubmit, PreToolUse, PostToolUse, PostToolUseFailure, subagentStart (camelCase normalization note :38-40), SubagentStop, PreCompact, Stop, ErrorOccurred, PermissionRequest, Notification | src/main/copilot/hook-service.ts:31-47 |
| cursor | 8 camelCase: beforeSubmitPrompt, stop, preToolUse, postToolUse, postToolUseFailure, beforeShellExecution, beforeMCPExecution, afterAgentResponse | src/main/cursor/hook-service.ts:32-42 |
| droid | 8: SessionStart, UserPromptSubmit, Stop, SubagentStop (listener ignores for notify, :39-40 comment), PreToolUse, PostToolUse, PermissionRequest, Notification | src/main/droid/hook-service.ts:35-56 |
| gemini | 4: BeforeAgent, AfterAgent, AfterTool, BeforeTool | src/main/gemini/hook-service.ts:33 |
| grok | 9: SessionStart, UserPromptSubmit, Stop, StopFailure, SessionEnd, PreToolUse, PostToolUse, PostToolUseFailure, Notification | src/main/grok/hook-service.ts:35-55 |
| hermes | 10 snake_case: on_session_start, pre_llm_call, post_llm_call, pre_tool_call, post_tool_call, pre_approval_request, post_approval_response, on_session_end, on_session_finalize, on_session_reset | src/main/hermes/hook-service.ts:27+ |
| kimi | events matched textually against config.toml via `readManagedKimiHookEvents(text, isManagedCommand)` — no const event array in the service | src/main/kimi/hook-service.ts:170-172 |
| amp | n/a — plugin-based, no event registration table in service | src/main/amp/hook-service.ts:131 (plugin source builder) |
| devin | n/a locally — imports .claude hooks; skip-guards live in claude's script | see D-6 below |
| mimo/opencode/openclaude | n/a (see notes) | — |

---

## 4. Per-Agent Notes

**claude** — The reference itself. Parametrizable constructor (:45-55) is the mechanism
OpenClaude exploits. Claude-only extras: statusline install gated on `agent === 'claude'`
(:211-214) with opt-out marker file (:219-241) and marker reset on remove (:319-326);
Devin-import skip guards embedded in its script generator (:70-75, :87-94). Statusline
deliberately NOT installed remotely (:273-275 comment: relay doesn't route /statusline/claude;
SSH account may differ from local selection).

**openclaude** — Pure re-parametrization, 8 lines total: singleton over `ClaudeHookService`
with `OPENCLAUDE_HOOK_SETTINGS` (openclaude/hook-service.ts:1-8). Full parity by inheritance.
Consequence of the agent gate: it never gets the statusline installed or removed (D-5).

**codex** — Largest superset (64,976 bytes, ~1,616 lines). Beyond the canonical four +
remote: parameterized runtime home (`getStatus(runtimeHomePath)` :1117, `install(runtimeHomePath)`
:1264), WSL-runtime hook installation (:850) and reconciliation (:990, :1020), system-home
trust sweep suppression gate (:181), legacy profile-block cleanup (:671-716), mirrored-user-hook
trust rebasing (:451-558), trust-grant ledger integration (:75-83). Endpoint-refresh comments
cross-reference claude as canonical (:772, :785). Emits partial (:1243).

**gemini** — Closest small clone of the reference shape: same method order
(refresh :101, getStatus :105, install :149, installRemote :204, remove :274), dual-platform
script (:43-45 win32 `.cmd` else `.sh`), endpoint-sourcing comments citing claude (:60, :75).
4-event catalog (:33). No deviations found.

**antigravity** — Canonical four + remote, plus a per-event Windows wrapper-script layer
(`getWindowsWrapperScriptPath` :81, `getWindowsWrapperScript` :154,
`buildWindowsAntigravityHookPostCommand` :177) and stale-command bundle detection
(:208-238). Events use a schema/wrapper-file record shape rather than plain definitions
(:38-59). No gaps vs contract.

**amp** — Plugin-based architecture instead of launcher scripts: writes a TypeScript
provider-native plugin `FABRICA-agent-status.ts` (:17) with management marker (:18) into
Amp's config dir (`getPluginPath` :26). Atomic text write via temp-file + rename (:103-105
mkdirSync, renameSync imported :6). Completeness check distinguishes partial vs full plugin
content (:35-50 → statusFromState :66, partial emitted at :79/:87). Has installRemote (:346)
and is wired remotely (remote-managed :58). Deliberately lacks refreshManagedScripts
(registry :40-45 rationale: provider-native plugin lifecycle, not shared launchers).

**cursor** — Canonical clone: refresh :105, getStatus :109 (partial :150), install :156,
installRemote :220, remove :277. 8 camelCase events (:32-42) — Cursor's native naming.
No deviations.

**droid** — Canonical clone: refresh :163, getStatus :167 (partial :206/:214/:221),
install :230, installRemote :255, remove :295. Notable semantic choice: SubagentStop is
installed but the listener ignores it for notification because "sub-droid completion is
mission progress, not parent Droid completion" (:39-40). Was historically the hidden-missing
remote agent (fixed; remote-managed :73-75 comment).

**command-code** — Smallest full-contract implementation (7,731 bytes): refresh :92,
getStatus :96 (partial :137), install :143, installRemote :163, remove :201. Script body
delegated to sibling module `buildCommandCodeManagedScript` (:23 import). Minimal 3-event
catalog (:25-35). No deviations.

**grok** — Canonical clone plus config redirection: `resolveGrokHomeDir` from shared paths
(:4), `getRemoteGrokHome` (:72) and control-character validation (:89) supporting the
extended remote signature `(sftp, remoteHome, options?)` (:257) wired with `grokHomeDir`
(remote-managed :24-25, :62-66). Tool-event matcher constant `'.*'` exposed for tests (:33, :59).
StopFailure mirrors Claude's API-error rationale (:39-40 comment).

**copilot** — Largest event catalog (13, :31-47) including camelCase `subagentStart` with
an explicit normalization note (:37-40). Three distinct partial-emission branches (:240,
:243, :252) — finer-grained than the reference's single missing-events detail. Own home
resolution `getCopilotHome` (:50). Canonical otherwise.

**hermes** — Most foreign config model among the managed agents: YAML manifest-based plugin
(`parse/stringify` yaml :16; plugin name/marker :24-25; enable/disable config transforms
:104-135). Plugin init source is **embedded Python** (`import json/os/urllib...` :288-291)
— the only Python emitter in the fleet. buildStatus composes enablement + files state
(:214-267, partial at :258). Has installRemote (:483, wired remote-managed :68). Deliberately
lacks refreshManagedScripts (same registry :40-45 rationale as Amp).

**devin** — Thinnest JSON-config service besides command-code: refresh :83, getStatus :87
(partial :128), install :140, installRemote :162, remove :210. Its distinctive logic lives
outside its own file: because Devin auto-imports `.claude` hooks, the attribution skip
(`DEVIN_PROJECT_DIR` guards) is baked into claude's script generator
(claude/hook-service.ts:70-75 Windows, :87-94 POSIX; env-guard outranking rationale :67-68).

**kimi** — TOML-config service: reads/writes `~/.kimi-code/config.toml` textually
(readConfigToml :98, writeConfigToml :111, apply/remove helpers used at :187/:246).
Canonical four + remote all present (:159/:163/:179/:202/:235). **Deviation:** the managed
script is always POSIX `.sh` — `MANAGED_SCRIPT_FILE_NAME = 'kimi-hook.sh'` (:49) with the
rationale that "Kimi runs hook commands through its shell ... single curl-based script body
works on every platform" (:46-48), and win32 only normalizes backslashes to forward slashes
in the command path (:57). No `.cmd` variant, unlike claude/gemini/etc. Remote install is
POSIX-only by design (:200-201 comment).

**mimo** — NOT a hook installer at all. `MimoCodeHookService` exposes only
`clearPty(_ptyId)` (:51) and `buildPtyEnv(_ptyId, existingMimocodeHome?)` (:53); its job is
mirroring a mimocode config dir into an overlay (`mirrorConfigDir` :27, `mirrorEntry`/
`safeRemoveTree` from pty overlay-mirror :5) and injecting the shared opencode-family plugin
source `FABRICA-mimocode-status.js` (:8, `getOpenCodeFamilyPluginSource` import :5). Wired
into the PTY spawn path at `src/main/ipc/pty.ts:1750`; no registry membership anywhere.
This is a different subsystem sharing the filename, not a parity failure.

**opencode** — Same PTY-overlay pattern as mimo, much larger (54,142 bytes):
`clearPty` (:1003) / `buildPtyEnv(ptyId, existingConfigDir?)` (:1007) plus private overlay
machinery — manifest read/write (:1053, :1067), user-config mirroring (:1089), plugin
injection into overlay (:1140), shared plugin config (:1152). Exports the family plugin
sources consumed by mimo (`getOpenCodePluginSource` :38, `getOpenCodeFamilyPluginSource` :42;
imported by mimo :5 and by agent-hooks/wsl-hook-relay-deps.ts:11). Wired at
ipc/pty.ts:1737 (spawn) and :2066 (cleanup). Like mimo: intentionally outside the
managed-installer registries.

---

## 5. Drift & Deviation Register

| ID | Finding | Severity | Evidence |
|---|---|---|---|
| D-1 | mimo + opencode implement none of the contract and are absent from all 4 local arrays and the remote array — by design (PTY-env overlay subsystem, different mechanism) | INFO (by-design) | mimo :50-80; opencode :1002-1166; ipc/pty.ts:1737,:1750,:2066; registry arrays reg :23-93 contain neither |
| D-2 | amp + hermes omit `refreshManagedScripts` — deliberate, test-enforced | INFO (by-design) | reg :40-45 |
| D-3 | kimi uses a single POSIX `.sh` script even on local Windows (no `.cmd` twin) unlike the reference's dual-target generator | MINOR deviation (documented in-file) | kimi :46-49, :57 vs claude :57-119 |
| D-4 | codex is a structural superset (~1,616 lines): WSL-runtime installs/reconciliation, trust-grant ledger, legacy cleanup, parameterized homes — no other service approaches this surface | INFO (superset) | codex :850, :990, :1041, :1108, :1515; size delta codex 64,976 B vs command-code 7,731 B |
| D-5 | openclaude inherits everything except the Claude-gated statusline path — statusline install (:212) and marker cleanup (:319) both check `agent === 'claude'`, so OpenClaude never touches the statusline | INFO (attribution guard, documented) | claude :211-214, :219, :319-326; openclaude :4-8 |
| D-6 | Cross-agent coupling: Devin's skip logic lives inside claude's script generator, not devin's own service | INFO (documented coupling) | claude :57-59 option flag, :70-75, :87-94 |
| D-7 | Signature drift on two remote installers: codex `(sftp, home, options?)` with `{codexHomeDir, deferTrustUntilConfigToml}` and grok `(sftp, home, grokHomeDir?)`; all others match canonical 2-arg form | MINOR (typed, wired explicitly) | remote-managed :18-31, :45-55, :62-66; codex :1401; grok :257 |
| D-8 | Status-model parity is complete: all 13 real installer services emit the 4-state model incl. `partial` (no false-positive 'installed') | PASS | partial cites in §3a column; claude :162-171 reference |
| D-9 | hermes uniquely embeds Python plugin code and depends on the yaml package — highest per-agent dependency divergence | INFO | hermes :16, :288-291 |
| D-10 | Write-ordering invariant ("script first, then settings") is replicated consistently across services (claude :266 comment; kimi :184/:198 comments) | PASS | claude :266-276; kimi :184, :198 |

**Bottom line:** zero unexplained gaps. All 14 managed agents satisfy the canonical contract
surface; every absence (refreshManagedScripts ×2, mimo/opencode entirely) carries an explicit
in-repo rationale, and the two signature extensions (codex, grok remote) are typed options
consumed by the remote dispatcher. The only mechanical drift candidates for future hygiene
are D-3 (kimi Windows story) and the D-7 optional-parameter asymmetry — both already
documented at their sites.

---

## 6. Scan-Coverage Statement

**Read in full (line-by-line):**
- `src/main/claude/hook-service.ts` (331 lines — complete)
- `src/main/agent-hooks/managed-agent-hook-registry.ts` (93 lines — complete)
- `src/main/agent-hooks/remote-managed-hook-installers.ts` (119 lines — complete)
- `src/main/openclaude/hook-service.ts` (8 lines — complete)
- `src/main/kimi/hook-service.ts` (lines 159-255 core: refresh/getStatus/install/installRemote/remove/singleton)

**Signature-extracted with Select-String (every export/class/method line captured with line numbers; targeted greps for events, partial-states, platform handling):**
- amp, antigravity, codex, command-code, copilot, cursor, devin, droid, gemini, grok, hermes, kimi (structure), mimo, opencode

**Targeted greps performed:** `_EVENTS` catalogs (10 files), `'partial'` emissions (13 files),
win32/platform handling (kimi), `buildPtyEnv`/singleton consumers (rg over src/main, pty plane),
hook-service cross-references (rg "hook-service" over src/main).

**NOT read line-by-line (skipped bodies, structure verified only):**
- `codex/hook-service.ts` lines beyond structure map (WSL/trust internals cited from signatures only)
- `opencode/hook-service.ts` lines 43-1001 (plugin-source builder internals) and 1002-1167 bodies beyond method signatures
- Full script-body strings of amp (:131-328), antigravity (:92-298), copilot (:117-185), cursor (:61-103), droid (:80-161), gemini (:53-99), grok (:110-184), hermes (:270-448), devin (:38-81), command-code (delegated to `command-code-managed-script.ts`, not read)
- All `*.test.ts` files (test parity out of scope for this pass; coverage test referenced via registry comment reg :44)
- `claude/hook-settings.ts` beyond the CLAUDE_EVENTS block (:30-62)

No files under `_sources/` were read for this task (out of scope — FA-only parity check).
No source file was modified.
