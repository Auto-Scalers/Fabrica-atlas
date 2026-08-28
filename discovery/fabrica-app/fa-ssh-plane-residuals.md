# FA SSH Plane Residuals — Targeted Deep Dive (R6-T3)

> Round 6 targeted task (convergence-memo authorized). READ-ONLY deep dive of five
> Fabrica-app SSH-plane components that prior rounds left under-documented, with
> per-component **Windows-primary risk** flags (Fabrica's positioning is
> Windows-first; several of these modules carry explicit `win32` branches or
> POSIX-only assumptions).
>
> All paths relative to `../Fabrica-app/src/` (i.e. `Fabrica-app/src/...` from the
> environment root). Line numbers verified against on-disk files at scan time.

---

## 1. SSH Channel Multiplexer

Files: `main/ssh/ssh-channel-multiplexer.ts`, `main/ssh/ssh-multiplexer-transport-writer.ts`,
`main/ssh/ssh-multiplexer-writer-lane-scheduler.ts`, `main/ssh/relay-protocol.ts` (imported),
`main/ssh/ssh-control-socket.ts` (OpenSSH ControlMaster sibling).

### 1.1 Architecture

- `SshChannelMultiplexer` (`ssh-channel-multiplexer.ts:84`) is a JSON-RPC-over-framed-stream
  state machine layered on a pluggable `MultiplexerTransport`
  (`ssh-multiplexer-transport-writer.ts:6-15`: `write`/`onData`/`onClose`/`onDrain`,
  optional `supportsWriteSettlement`/`pauseReads`/`resumeReads`/`close`).
- Wire framing comes from `relay-protocol` (`ssh-channel-multiplexer.ts:3-16`):
  `FrameDecoder`, `MessageType`, `encodeJsonRpcFrame`, `encodeKeepAliveFrame`,
  `KEEPALIVE_SEND_MS`, `TIMEOUT_MS`.
- Writes are delegated to `SshMultiplexerTransportWriter`
  (`ssh-channel-multiplexer.ts:116-120`), which owns three priority lanes —
  `'ordinary' | 'control' | 'liveness'` (`ssh-multiplexer-transport-writer.ts:17`) — via
  `SshMultiplexerWriterLaneScheduler` (`ssh-multiplexer-writer-lane-scheduler.ts:38-73`).
  Lane selection: liveness first (:49-52), then control but at most
  `CONTROL_WRITES_BEFORE_ORDINARY = 4` control writes before an ordinary write is
  interleaved (:53-60) — anti-starvation for bulk `pty.data`.
- Lane assignment is method-based: only `pty.data` rides `ordinary`; everything else
  is `control` (`ssh-channel-multiplexer.ts:667-669`).
- Bounded queues: ordinary max 2 MiB / 2048 frames; control reserve
  `MAX_MESSAGE_SIZE + HEADER_LENGTH` / 512 frames
  (`ssh-multiplexer-transport-writer.ts:26-29`). Exceeding the bound fails the writer
  and tears the mux down (`admissionError` :118-128 -> `fail` :86-89 -> `dispose`+`onFailure` :263-269).
- Sequence + ACK tracking: outgoing seq (`nextOutgoingSeq`), highest received seq,
  header ACK carries cumulative ack; unacked timestamps bounded at 4095 ordinary (+1 liveness)
  (`ssh-channel-multiplexer.ts:60-61`, ack handling :440-454, tracking :617-622).

### 1.2 Entry points & data flow

- Inbound: `transport.onData` feeds the decoder; any decoded frame resolves pending
  liveness probes before dispatch (`ssh-channel-multiplexer.ts:131-137`, :432-437).
  Regular frames parse as JSON-RPC and route by shape: response/request/notification
  (:470-478); unknown methods answer `-32601` (:483-488).
- Outbound: `request()` mints id + timeout timer (default `REQUEST_TIMEOUT_MS = 30_000`,
  :59, :241-275); abort and timeout both send `rpc.cancel` notifications so relay-side
  work stops (:258-274). `notify`/`notifyWithSettlement` (:294-325).
- Health: one 5s interval sends keepalive then checks dead-link
  (`noDataReceived && oldestUnackedStale` -> protocol error)
  (:572-609). Sleep/wake guard: tick gap > `WAKE_GAP_MS = KEEPALIVE_SEND_MS * 3`
  rebases clocks instead of killing a healthy link (#7773 comment :62-64, :580-586).
- `probeLiveness(timeoutMs)` (:332-350) resolves true on the first frame of any kind —
  used after system resume to distinguish survived-sleep from dead link.
- Disposal: `createSshDisposalError` mints coded errors `CONNECTION_LOST` vs `DISPOSED`;
  the renderer branches reconnection-overlay vs error-toast on this code
  (:46-57). Late `onDispose` subscribers still get the cached reason (:198-215).
- Consumers: the SSH relay session layer subscribes to `onDispose` to auto-reconnect
  (comment :193-197); streaming fs notifications use per-method dispatch
  `fs.streamChunk/fs.streamEnd/fs.streamError` (:96-99, :162-182).

### 1.3 Failure modes (as designed)

- Writer transport `write(false)` without drain support throws (:166-168); settlement
  is exactly-once via `onceSettlement` (:31-42) and `entry.settled` (:191-195).
- Protocol error anywhere -> `dispose('connection_lost')` (:612-615).
- Handler exceptions in notification listeners are contained (warn, keep mux alive)
  (:536-569); disposal-handler exceptions contained (:389-395).
- Debug hook: `FABRICA_SSH_MUX_DEBUG=1` logs dispose stacks (:356-361).

### 1.4 Config surface

- Env: `FABRIC_SSH_MUX_DEBUG` variant is the literal string `FABRICA_SSH_MUX_DEBUG` (:356).
- Constants: request timeout 30s (:59), queue caps (:26-29), lane interleave 4 (:3 scheduler).
- Sibling OpenSSH ControlMaster path: `getControlSocketPath` returns **`null` on win32**
  (`ssh-control-socket.ts:34-36`) and requires `process.getuid` (:37-40) — i.e. the entire
  hashed ControlPersist master machinery (:29-68, XDG_RUNTIME_DIR / tmpdir candidates :89-97,
  0o700 owner-checked dir :99-108) is macOS/Linux-only by design.

### 1.5 Windows-primary risks

- **No ControlMaster reuse on Windows** (`ssh-control-socket.ts:34-36`): every connection
  pays full handshake/auth cost; Windows hosts get no connection multiplexing benefit.
  The app-level channel multiplexer partially compensates, but process-level ssh
  ControlPersist acceleration is structurally unavailable.
- Wake-gap heuristic assumes timer throttling semantics (`WAKE_GAP_MS`,
  `ssh-channel-multiplexer.ts:62-64`); Windows Modern Standby can pause timers for long
  windows — behavior matches intent (rebase, don't kill), but the 3x constant was tuned
  against App Nap (#7773), not Windows sleep states.
- `detached: process.platform !== 'win32'` pattern appears in adjacent spawn code
  (`ephemeral-vm-recipe-process.ts:44`), showing the plane generally special-cases win32;
  the mux itself is platform-neutral (pure Node streams) — low direct risk.

---

## 2. SSH Config Parser family

Files: `main/ssh/ssh-config-parser.ts`, `ssh-config-include-expander.ts`,
`ssh-config-path-expansion.ts`, `ssh-g-config-resolution.ts`, `ssh-config-host-picker.ts`.

### 2.1 Architecture

Two complementary resolution strategies:

1. **Own parser** (`parseSshConfig`, `ssh-config-parser.ts:28-138`): line-based OpenSSH
   config tokenizer producing `SshConfigHost[]` (:9-21). Handles multi-pattern Host lines
   (:50-60), drops wildcard/negated patterns (:51-54), stops at `Match` blocks (:63-69),
   first-value-wins semantics per OpenSSH (:77-131), quote/comment-aware argument splitter
   (`splitOpenSshArguments` :170-214, inline-comment cut :193-196).
2. **Delegated resolver** (`resolveWithSshG`, `ssh-g-config-resolution.ts:57-98`): shells
   out to real `ssh -G <host>` for effective-config resolution including Include/Match/
   wildcard inheritance ("without reimplementing OpenSSH matching" :55-56), 5s timeout
   (:28, :61-68), `--` guard so host labels starting with `-` are not flags (:79-84).

### 2.2 Entry points & data flow

- `loadUserSshConfig()` reads `~/.ssh/config`, expands `Include` directives, parses;
  missing file -> `[]`; read error -> warn + `[]` (`ssh-config-parser.ts:217-230`).
- `expandSshConfigIncludes` (`ssh-config-include-expander.ts:20-38`): recursive expansion
  with cycle guard via canonical-path stack (:45-48), per-file cache (:83-100),
  glob patterns capped at `MAX_INCLUDE_GLOB_MATCHES = 256` (:17, :172-178),
  file size capped at 1 MiB (:18, :303-308), `%` tokens expanded (%d/%u/%i/%l/%L;
  target-dependent %h/%n/%p/%r/%j/%k/%C rejected as null :19, :202-266),
  `${ENV}` expansion fails closed when var missing (:188-200).
- `sshConfigHostsToTargets` converts parsed hosts into importable `SshTarget`s with
  generated ids and label dedup (`ssh-config-parser.ts:233-266`).
- `parseSshGOutput` builds `SshResolvedConfig` incl. ControlMaster fields and
  `proxycommand none`/`proxyjump none` sentinel filtering
  (`ssh-g-config-resolution.ts:100-155`).
- Consumers: connection store import (`ssh-connection-store.ts:5`), host picker UI
  (`ssh-config-host-picker.ts:9`), `ssh -G` resolution wired into connection setup
  (`ssh-connection.ts:20`).

### 2.3 Failure modes

- Parse failures degrade silently to empty lists (warn-and-return-[] paths:
  `ssh-config-parser.ts:226-229`; include unreadable/unregular/too-big files skipped:
  `ssh-config-include-expander.ts:89-99`, :296-313).
- `ssh -G` failure/timeout resolves `null` and callers fall back
  (`ssh-g-config-resolution.ts:61-67`, :87-95).
- HOME-vs-passwd divergence: when `$HOME/.ssh/config` exists and differs from
  passwd home, `-F` is passed so resolve sees the picker-listed file; side effect
  documented: `-F` suppresses `/etc/ssh/ssh_config` system defaults
  (`ssh-g-config-resolution.ts:38-52`).

### 2.4 Windows-primary risks

- **HOME/getpwuid divergence is sharpest on Windows**: OpenSSH for Windows resolves the
  user config from the Windows profile dir while Node `homedir()` follows `HOME`/`USERPROFILE`
  ordering; the `-F` workaround exists precisely because these diverge
  (`ssh-g-config-resolution.ts:39-47`) but its documented cost — losing
  `/etc/ssh/ssh_config` equivalents (`ProgramData/ssh/ssh_config`) — applies whenever the
  branch fires (:44-45).
- Path-style duality handled ad hoc: `~\` backslash form supported
  (`ssh-config-path-expansion.ts:8-16`); include-expander picks posix vs win32 path API by
  drive-letter/UNC sniffing (`ssh-config-include-expander.ts:349-351`). Risk: mixed-separator
  configs (`~/config.d/*.conf` authored POSIX-style on Windows) depend on the sniff being right.
- `%d/%u` token expansion uses `userInfo()` with `USER`/`USERNAME` env fallback
  (:315-347) — on Windows `userInfo().uid` is negative/-absent, so `%i` includes fail
  closed (:240-246, uid check :318-333). Correct-but-lossy: Windows-authored includes
  using `%i` silently drop.
- Glob cap (256) and size cap (1 MiB) protect against pathological user configs
  regardless of platform (:172-178, :303-308).

---

## 3. SFTP Support

Files: `main/ssh/sftp-upload.ts`, `sftp-namespace-resolution.ts`,
`providers/ssh-filesystem-provider-sftp.ts`, plus system-SSH fallback
`system-ssh-file-transfer.ts` and consumers `ssh-relay-install-transfers.ts`,
`ssh-relay-deploy-helpers.ts`, `ssh-connection.ts:60`.

### 3.1 Architecture

- `sftp-upload.ts` is the ssh2-SFTPWrapper primitive library: `mkdirSftp` (:8-26,
  accepts ambiguous SSH_FX_FAILURE=4 as "exists" :15-24), `uploadFile` (:28-107,
  O_NOFOLLOW open + pre/post stat identity check to detect mid-flight mutation :43-65,
  abort wiring :71-83), `uploadBuffer` (:109-141), `writeStringViaSftp` (:143-178,
  prepends a session-error listener so a dying session settles the promise :172-175),
  `uploadDirectory` recursion (:180-212), `removeDirectorySftp` (:214-227).
- Security posture: symlinks/special files skipped during directory upload to prevent
  symlink-follow exfiltration, explicitly closing the TOCTOU gap between caller
  pre-scan and upload (:197-203); every candidate path is realpath-checked to stay
  inside the upload root (`assertLocalUploadPathInsideRoot` :272-284).
- `sftp-namespace-resolution.ts` solves shell-home != SFTP-start-dir namespaces
  (motivating case Synology DSM `/var/services/homes/alice` vs `/homes/alice`,
  header :1-6). `resolveSftpTransferPath` (:155-211) redirects the transfer path only
  when the marker is absent at the shell path AND present under the SFTP start dir;
  any inconclusive probe (non-2 status) degrades to the shell path (:119-140,
  three-state `MarkerProbe` :23-27).
- `resolveSftpTransferPathIfMapped` skips namespace logic entirely for Windows remote
  hosts whose `/C:/Users/...` drive paths break the POSIX prefix contract
  (:218-245, regex set :239-245).
- `providers/ssh-filesystem-provider-sftp.ts`: thin promise wrappers (lstat/fastGet/
  readdir/stat) with abort semantics that wait up to 5s for the folder owner's callback
  so Windows local handles quiesce before temp-tree removal (:41-49,
  `ABORTED_SFTP_OPERATION_GRACE_MS = 5_000` :4).
- Fallback transport: `system-ssh-file-transfer.ts` uploads directories via
  `tar | ssh` pipe on POSIX remotes (:32-80) and has a dedicated Windows-remote branch
  `uploadDirectoryViaSystemSshWindows` (:39-41).

### 3.2 Data flow

Relay install pipeline: deploy helpers re-export upload primitives
(`ssh-relay-deploy-helpers.ts:7`); install transfers use `writeStringViaSftp` +
namespace resolution (`ssh-relay-install-transfers.ts:8-14`); install namespace module
carries the mapping type (`ssh-relay-install-namespace.ts:10`); live session consumes it
via `ssh-connection.ts:60`. Marker filenames embed install tokens which are redacted
from all log lines (`redactRelayInstallMarkerTokens` used at
`sftp-namespace-resolution.ts:35`, :50, :136, :144, :203).

### 3.3 Failure modes

- Ambiguous mkdir code-4 accepted deliberately; next op surfaces the real error
  (`sftp-upload.ts:15-24`).
- File-changed-underneath detection aborts rather than shipping torn content
  (:58-65).
- Namespace discovery never invents a redirect on inconclusive evidence — falls back
  to shell path with a warning (:142-146, :189-210).
- Abort grace-timer fallback ensures promises settle even if the owner callback never
  arrives (`ssh-filesystem-provider-sftp.ts:47`).

### 3.4 Config surface

- Mapping structure `SftpNamespacePathMapping`
  (`sftp-namespace-resolution.ts:12-17`); strict segment hygiene
  (`assertSafeRemotePathSegment` calls :43, :54; NUL/CRLF rejection :28-30).
- Status constants: `SFTP_STATUS_NO_SUCH_FILE = 2` (:21).

### 3.5 Windows-primary risks

- **Windows REMOTE hosts are special-cased twice**: namespace resolution is bypassed
  for recognized Windows absolute paths and declared-Windows platforms
  (`sftp-namespace-resolution.ts:228-235`) — correct, but means Synology-style aliasing
  bugs on a Windows-targeted OpenSSH server would go undetected rather than resolved.
- Local-side Windows handles: the 5s abort grace exists specifically because "the
  folder owner closes SFTP on abort... Windows local handles quiesce before the
  temporary tree is removed" (`ssh-filesystem-provider-sftp.ts:46-47`) — a known
  Windows file-locking constraint baked into timing, not correctness; slow AV/indexer
  handle release could exceed the grace.
- System-ssh fallback needs `tar.exe` locally on Windows (spawned at
  `system-ssh-file-transfer.ts:49`); Windows ships bsdtar since Win10 1803, but PATH
  ordering (e.g. WSL `tar` earlier) could route through a GNU tar with different flag
  behavior — no explicit binary pin visible in the read portion.
- Remote Windows staging has a dedicated command builder
  (`ssh-relay-upload-stage-windows-commands.ts`, 15 KB on disk) — flagged as scanned
  by listing only (see coverage).

---

## 4. vscode-ssh-authority

File: `main/ssh/vscode-ssh-authority.ts` (42 lines); consumer `main/ipc/shell.ts:18,93-104`;
tests `vscode-ssh-authority.test.ts`, `ipc/shell.test.ts:586,613`.

### 4.1 Architecture & entry point

Single pure function `resolveVsCodeSshAuthority(target)` (`vscode-ssh-authority.ts:19-42`)
that produces the VS Code Remote-SSH authority string:

- Config-backed targets (OpenSSH-config aliases, via `isOpenSshConfigBackedTarget`
  from `system-ssh-args.ts`): authority = `configHost` verbatim-trimmed (:20-25);
  invalid/empty -> `ssh-target-invalid`.
- Direct targets: validate host/username for C0-control/DEL characters
  (`isValidAuthorityPart` :9-17) and port range 1-65535 (:29-37); **port != 22 is
  rejected with `ssh-alias-required`** (:38-40) because VS Code's authority grammar
  cannot carry an inline port — such targets must be imported into `~/.ssh/config`
  under an alias first; port-22 passes as `[user@]host` (:41).

Data flow: renderer requests "open in editor" -> `ipc/shell.ts:openInExternalEditor`
(:73-123) looks up the target, blocks runtime-owned/on-demand targets
(:87-89), requires absolute path in either POSIX or win32 form (:90-92),
resolves authority (:93-96), then builds the launch spec and spawns
(:97-110). Result union doubles as the IPC error vocabulary
(:4-7; reasons also returned directly at `ipc/shell.ts:94-96`).

### 4.2 Failure modes

- Three failure shapes only: invalid target, alias-required (host+port echoed for the
  caller to create a config entry), and upstream launch failure
  (`vscode-ssh-authority.ts:4-7`; `ipc/shell.ts:102-110`).
- Editor launch failures are swallowed to `{ ok:false, reason:'launch-failed' }` —
  no stderr surfaced (`ipc/shell.ts:105-110`).

### 4.3 Windows-primary risks

- **This component exists because of the Windows-primary story** (open remote repo in
  local VS Code), yet it hard-requires port-22 for non-config targets
  (`vscode-ssh-authority.ts:38-40`). On Windows where users commonly hit dev boxes on
  custom ports, every non-22 target degrades to a two-step flow (import to
  `~/.ssh/config` first). UX risk, not correctness.
- Path validation accepts either separator style (:90-92 `posix.isAbsolute ||
  win32.isAbsolute`), consistent with Windows-first; test coverage confirms
  Windows-form SSH paths preserved (`shell.test.ts:586`).
- No `code` binary discovery logic lives here — launch-spec resolution is upstream
  (`resolveVsCodeRemoteSshLaunchSpec`, `ipc/shell.ts:97`); if VS Code CLI isn't on PATH
  on a fresh Windows box the user gets an opaque `launch-failed`.

---

## 5. Ephemeral VM Recipe DSL

Files: `shared/types.ts:2197-2206` (`FABRICAVmRecipe`),
`shared/ephemeral-vm-recipes.ts` (result contract),
`shared/ephemeral-vm-recipe-runner.ts` (lifecycle executor),
`shared/ephemeral-vm-recipe-process.ts` (spawn/kill/env),
`shared/ephemeral-vm-recipe-doctor.ts` + `ephemeral-vm-recipe-diagnostics.ts`,
`shared/ephemeral-vm-runtime-store.ts` + `ephemeral-vm-runtimes.ts` (persistence),
`main/ipc/ephemeral-vm.ts` (IPC handlers), `main/ipc/ephemeral-vm-runtime-handlers.ts`,
`main/ephemeral-vm-runtime-service.ts`, `main/ephemeral-vm-runtime-ssh.ts`,
CLI surfaces `cli/handlers/vm.ts` + `cli/runtime/launch.ts`.

### 5.1 Architecture

The DSL is **command-string recipes, not declarative infra**: a recipe is
`{ id, name, create, suspend?, resume?, destroy?, destroyDisabled? }`
(`shared/types.ts:2197-2206`). Fabrica executes these as shell commands inside the
user's repo and expects the recipe to print one JSON result object on stdout.

Contract layers:

- Result schema (zod, strict): legacy `{schemaVersion:1, pairingCode, projectRoot}`
  or current `{schemaVersion:1, connection:{type:'FABRICA-server'|'ssh', ...}}`
  (`ephemeral-vm-recipes.ts:82-111`). SSH connections embed a full `SshTarget`
  schema incl. relay grace-period bounds and optional saved port-forwards
  (:39-64). Structural DoS limits: 256k structural tokens / depth 64 (:25-28).
- Parsing validates pairing-code format for server connections and demands an
  **absolute runtime projectRoot** accepting POSIX, drive-letter, and UNC forms
  (`parseEphemeralVmRecipeResult` :133-157; `isAbsoluteRuntimePath` :183-190).
- Lifecycle runner (`ephemeral-vm-recipe-runner.ts`): start (:101-145, exit-code gate
  :119-126, stdout-parse gate :128-136), cleanup (:147-180, destroy payload piped via
  **stdin** JSON :161), suspend (:182-215), resume (:217-275, re-parses result).
  Skipped lifecycle stages return `skipped:true` when commands absent/disabled
  (:151-153, :186-188, :221-229).
- Process execution (`ephemeral-vm-recipe-process.ts`): `spawn(command, {shell:true,
  cwd:repoPath, windowsHide:true})` (:42-48); env injection is the DSL's parameter
  passing — `FABRICA_VM_MODE/_INSTANCE_ID`, `FABRICA_RECIPE_ID`, `_PROJECT_ID`,
  `_WORKSPACE_ID/_NAME`, `_REPO_PATH/_URL/_BRANCH/_REF`, `_VERSION`
  (:123-143). Output capture bounded (default 1 MiB, UTF-8-safe tail trimming
  :36, :145-166).

### 5.2 Entry points & data flow

- IPC (`main/ipc/ephemeral-vm.ts`): handlers `listRecipes`, `listRecipeCatalog`,
  `doctor`, `provision`, `cancelProvision` (:64-257), re-registration guarded by
  removeHandler (:65-69). Provision flow: resolve recipe (incl. approved plugin
  recipes :120-127) -> run create with streamed redacted stdout/stderr events
  (:132-158) -> on `ssh` connection, connect a runtime-owned SSH target and persist
  `sshTargetId` (:168-204) -> on `FABRICA-server`, register environment from pairing
  code (:206-229). Any post-create failure triggers best-effort cleanup
  (:191-196, :214-219). Cancel keeps the controller registered across both the recipe
  AND the SSH-connect window (:142-146, :246-257).
- Runtime-owned SSH bridge (`ephemeral-vm-runtime-ssh.ts`): upsert target -> connect ->
  wait (poll 100ms, timeout 10s) until git+filesystem providers exist (:12-13, :59-71);
  failed connects remove the orphaned persisted target (:36-41).
- Persistence: `FABRICA-ephemeral-vm-runtimes.json` store, zod-parsed reads with
  per-entry salvage, capacity-capped writes
  (`ephemeral-vm-runtime-store.ts:16`, :136-183; record schema
  `ephemeral-vm-runtimes.ts:28-66` incl. status/cleanupStatus enums :4-26).
- Doctor: static recipe diagnostics without execution (`doctorEphemeralVmRecipe`
  invoked at `ipc/ephemeral-vm.ts:94-99`; browser-bundle isolation note :12-14).
- Renderer consumption: worktrees slice cancels provisions and cleans runtimes on
  tab/worktree removal (`renderer/src/store/slices/worktrees.ts:42,4147-4160`);
  settings section renders runtime list (`EphemeralVmRuntimesSection.tsx:6`).

### 5.3 Failure modes

- Non-zero exit, unparseable stdout, schema violation, bad pairing code, relative
  projectRoot all produce structured failures carrying captured output
  (`ephemeral-vm-recipe-runner.ts:119-136`; `ephemeral-vm-recipes.ts:133-157`).
- Provider-not-ready within 10s fails provision with cleanup
  (`ephemeral-vm-runtime-ssh.ts:59-71` + `ipc/ephemeral-vm.ts:190-203`).
- Store corruption: whole-file zod failure raises typed
  `EphemeralVmRuntimeStoreError('runtime_error')`; over-capacity write refuses durably
  (`ephemeral-vm-runtime-store.ts:154-160`, :174-177).
- Diagnostics redaction applied to every streamed/logged chunk
  (`redactEphemeralVmRecipeDiagnosticText` at `ipc/ephemeral-vm.ts:139,163-164,187,201,235`).

### 5.4 Config surface

- Recipe authorship: repo-provided recipe files discovered per-repo
  (`getRecipeRepo/listRecipes/listRecipeCatalog/resolveRecipeForRepo`,
  `ipc/ephemeral-vm.ts:28-33`) plus plugin-approved catalog
  (:36, :73, :79, :93, :123).
- Environment-variable contract above; stdin JSON payloads for destroy/suspend/resume
  (`ephemeral-vm-recipe-lifecycle-payload.ts` imports at runner :7-10).
- CLI mirrors: `cli/handlers/vm.ts:10` and `cli/runtime/launch.ts:11` import the same
  recipe types.

### 5.5 Windows-primary risks

- **Kill semantics are cmd.exe-aware** — the single most load-bearing Windows branch:
  recipes run via `cmd.exe /c` (shell:true), so plain kill would orphan the actual
  provisioning subprocess; abort uses `taskkill /pid <pid> /t /f` tree-walk with a
  child.kill() fallback if taskkill itself fails
  (`ephemeral-vm-recipe-process.ts:95-109`). POSIX kills the detached process group
  (:111-120). Risk: taskkill failure fallback kills only the wrapper — the exact
  orphan scenario the branch exists to prevent (:105).
- Shell quoting for displayed cleanup tokens differs per platform — cmd.exe doubling
  rules vs POSIX single-quote escaping (`quoteShellToken` :13-21); display-only, but
  wrong-platform quoting makes manual cleanup instructions unusable.
- `detached` asymmetry: POSIX gets process-group detachment; Windows does not
  (:44) — deliberate (job objects behave differently) but means a Fabrica crash on
  Windows leaves running recipe children unreaped except via cancel/taskkill path.
- Absolute-path validation already accepts drive-letter and UNC roots
  (`ephemeral-vm-recipes.ts:183-190`) — Windows-ready by construction.
- Recipe commands themselves are raw shell strings (`types.ts:2200-2204`): authors
  targeting Windows must write cmd-compatible one-liners; nothing in the schema marks
  the intended interpreter, so a bash-flavored recipe silently mis-executes under
  cmd.exe (shell:true picks the platform default).

---

## Cross-component observations

1. **Windows gaps cluster around OpenSSH-native accelerators**: ControlMaster
   (`ssh-control-socket.ts:34-36`) and vscode-authority non-22 ports
   (`vscode-ssh-authority.ts:38-40`) are the two features that silently no-op or
   degrade for the Windows-primary audience. Both have app-level compensations
   (channel multiplexer; config-import flow) worth calling out in product copy.
2. **Fail-degrade philosophy is consistent**: parser -> [], ssh -G -> null,
   namespace probe -> shell path, doctor checks -> structured statuses. Nothing in
   the plane throws on ambiguous evidence except bounded-capacity violations
   (writer queues, runtime store).
3. **Secret hygiene**: install-marker token redaction threads through namespace
   logging (`sftp-namespace-resolution.ts:35,50,136,144,203`); recipe diagnostic
   redaction wraps all IPC streams (`ipc/ephemeral-vm.ts:139,163-164`).
4. **Cancellation is end-to-end**: mux `rpc.cancel` propagates to relay-side work
   (`ssh-channel-multiplexer.ts:258-274`), SFTP ops settle within 5s grace
   (`ssh-filesystem-provider-sftp.ts:41-49`), recipe processes get tree-killed
   (`ephemeral-vm-recipe-process.ts:95-109`).

---

## Scan Coverage Statement

**Read in full (source, line-level):**

- `main/ssh/ssh-channel-multiplexer.ts` (669/669 lines)
- `main/ssh/ssh-multiplexer-transport-writer.ts` (270/270)
- `main/ssh/ssh-multiplexer-writer-lane-scheduler.ts` (73/73)
- `main/ssh/ssh-control-socket.ts` (132/132)
- `main/ssh/ssh-config-parser.ts` (266/266)
- `main/ssh/ssh-config-include-expander.ts` (351/351)
- `main/ssh/ssh-config-path-expansion.ts` (18/18)
- `main/ssh/ssh-g-config-resolution.ts` (155/155)
- `main/ssh/sftp-upload.ts` (284/284)
- `main/ssh/sftp-namespace-resolution.ts` (246/246)
- `main/providers/ssh-filesystem-provider-sftp.ts` (115/115)
- `main/ssh/system-ssh-file-transfer.ts` (first 80 of 221 lines — POSIX branch; Windows
  branch body and download helpers not line-read)
- `main/ssh/vscode-ssh-authority.ts` (42/42)
- `main/ipc/shell.ts` (lines 70-129 of 314 — the SSH-editor slice; remainder not read)
- `shared/ephemeral-vm-recipes.ts` (190/190)
- `shared/ephemeral-vm-recipe-runner.ts` (295/295)
- `shared/ephemeral-vm-recipe-process.ts` (166/166)
- `main/ipc/ephemeral-vm.ts` (262/262)
- `main/ephemeral-vm-runtime-ssh.ts` (71/71)
- `shared/types.ts` (lines 2190-2229 only — `FABRICAVmRecipe` block)

**Listed/scanned-by-size-or-grep but NOT line-read** (flagged for future rounds):

- `main/ssh/ssh-config-loader-regression.test.ts`, `ssh-config-host-picker.ts` (consumers cited via grep only)
- `main/ssh/ssh-relay-deploy.ts` (71 KB), `ssh-relay-session.ts` (117 KB), `ssh-relay-deploy-helpers.ts`,
  `ssh-relay-install-transfers.ts`, `ssh-relay-install-namespace.ts`,
  `ssh-relay-upload-stage-windows-commands.ts` (15 KB) — consumers of SFTP primitives,
  covered here only at their import/export sites
- `main/ssh/ssh-relay-build-toolchain.ts`, `ssh-relay-versioned-install.ts`,
  `system-ssh-forward-process.ts`, `system-ssh-port-forward-provider.ts`,
  `ssh-port-forward.ts`, `ssh-auth-resolution.ts`, `ssh-proxy-command.ts`,
  `ssh-transport-selection.ts`, `ssh-owner-*`, `ssh-pty-*`, `ssh-reconnect-*`,
  `ssh-remote-*` families — adjacent SSH plane, outside this task's five scopes
- `shared/ephemeral-vm-recipe-doctor.ts`, `-diagnostics.ts`, `-lifecycle-payload.ts`
  (read at call sites only), `ephemeral-vm-runtime-service.ts` (8 KB, call-site level),
  `main/ipc/ephemeral-vm-runtime-handlers.ts`, `main/ipc/ephemeral-vm-recipe-context.ts`,
  `cli/handlers/vm.ts`, `cli/runtime/launch.ts` — recipe DSL satellites, cited via
  grep/import evidence only
- All `*.test.ts` companions except where grep output quoted them
  (`vscode-ssh-authority.test.ts`, `shell.test.ts:586/613`, `worktrees.ts:4147-4160`)

**Skipped entirely:** renderer recipe UI internals beyond the two cited slices,
plugin recipe approval mechanics (`plugin-approved-vm-recipes.ts`), docs/
(`docs/ssh-relay-sftp-namespace.md` referenced at `sftp-namespace-resolution.ts:5`
but not read), and the frozen `_sources/` repos (out of scope for this targeted task).
