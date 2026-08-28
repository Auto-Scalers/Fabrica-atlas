# Fabrica-app WSL / Remote-Execution Plane — Round 4 Deep Dive (R4-1.23)

Task: R4-1.23 · dispatch ctx_bb6a4f2088dc · task task_1f059ab00bd9
Scope: READ-ONLY scan of `Fabrica-app/src/main` (+ shared modules imported by it), excluding `node_modules`, `.next`, `dist`, `out`.
All paths relative to `Fabrica-app/src/main` unless prefixed `shared/` (= `Fabrica-app/src/shared`).

---

## 0. Executive summary for a Windows-primary user running CLI agents

Fabrica-app treats Windows as a *split-brain* host: the Electron main process always runs as win32, but any project, account, terminal, hook, watcher, or CLI registration can be silently re-routed through `wsl.exe -d <distro>` into a Linux guest. There are four cooperating planes:

1. **Runtime selection** — a pure-function state machine (`shared/project-execution-runtime.ts`) decides per project between `windows-host` and `wsl:<distro>`, and emits typed repair states instead of failing at spawn time.
2. **WSL interop** — availability probing, distro listing, `$HOME` resolution, UNC<->Linux path translation, WSLENV env plumbing, and a hardened in-guest deletion engine.
3. **SSH remote-execution** — a VS Code-style persistent relay (`.fabrica-remote`) deployed over SSH to Linux/macOS/Windows remotes, exposing PTY, filesystem, git, and agent-hook RPC to the desktop app; plus an ephemeral-VM runtime built on top of it.
4. **Execution-host identity** — every repo/worktree carries a host id (`local` | `ssh:<target>` | `runtime:<env>`); WSL is deliberately NOT a separate host — it is a runtime flavor of `local`.

Key Windows-primary risks are consolidated in section 12 (risk register).

---

## 1. WSL availability & distro-discovery plane

### 1.1 Availability probe (`wsl-availability.ts`, 213 lines)

- Single module-scoped tri-state cache: `{available:true}` | `{available:false, unsupported}` | `{available:false, cachedAt, retryable, failures}` (wsl-availability.ts:3-9).
- Probe = `execFile('wsl.exe', ['--status'])` with a **5 s timeout**, `windowsHide: true` (wsl-availability.ts:13, :95-98). Sync twin uses `execFileSync` with the same timeout (wsl-availability.ts:130-133).
- Negative caching is deliberately staggered against the renderer's 30 s capability TTL so repeated refreshes never land on the probe boundary (wsl-availability.ts:14-17): retryable failures wait 45 s, "definitive" answers (non-zero exit, ENOENT) wait **10 minutes**, exponential backoff capped at **30 min** (wsl-availability.ts:21-22, :31-36).
- Nothing latches forever: even a definitive-looking failure is re-probed because wsl.exe reports non-zero exits while LxssManager is still starting (comment wsl-availability.ts:18-20). The off-Windows "unsupported" verdict IS permanent, but `isPermanentWslAvailabilityCache` re-checks `process.platform !== 'win32'` before honoring it so a cache seeded off-Windows cannot suppress a later real probe (wsl-availability.ts:24-27).
- Platform guards: both `isWslAvailable()` and `isWslAvailableAsync()` short-circuit `process.platform !== 'win32'` -> `{available:false, unsupported}` (wsl-availability.ts:124-127, :153-156).
- Async twin exists specifically because the sync probe blocks the Electron main thread "for up to 5s on a wedged wsl.exe" — every PTY message, window IPC and watchdog beat would stall; concurrent callers share one in-flight spawn promise (wsl-availability.ts:140-170).
- Staleness policy: `getCachedWslAvailability()` returns the last observed answer rather than null-on-stale, otherwise the renderer's `wsl-unavailable` repair prompt would vanish while git/PTY silently resolved to an unresponsive WSL (wsl-availability.ts:176-182). A non-empty distro listing drops stale availability failures (`dropStaleWslAvailabilityFailure`, wsl-availability.ts:189-194).

### 1.2 Distro enumeration & `$HOME` resolution (`wsl.ts`, 374 lines)

- Distros: `execFileSync('wsl.exe', ['--list','--quiet'])` / async `execFileUtf8`, 5 s timeouts (wsl.ts:221-225, :249, :359-374).
- Output parser strips NUL bytes (wsl.exe UTF-16 artifacts), CR/LF splits, trims default-distro `*` markers (wsl-distro-list-output.ts:5-11). `docker-desktop*` distros are filtered out of user-facing lists (wsl-distro-list-output.ts:1-3).
- Empty-list handling is heavily defended: `wsl --install` reports zero distros while one is still provisioning, so empty results stay retryable with backoff `min(15 s * 2^streak, 5 min)` (wsl.ts:149-166; wsl-distro-retry.ts:1-4). Out-of-order probes are sequence-guarded so a slow late-empty answer cannot erase a fast positive list (wsl.ts:172-196), and a positive result also clears stale availability failures (wsl.ts:187-189).
- Default distro = first user distro (wsl.ts:270-272).
- Per-distro `$HOME`: `wsl.exe -d <distro> -- bash -c 'echo $HOME'` (5 s timeout), result must start with `/`, converted to a Windows UNC path and cached per distro for the process lifetime (wsl.ts:276-304; async twin :306-326). Documented purpose: WSL worktrees are created under `~/FABRICA/workspaces` inside the distro, mirroring the Windows layout (wsl.ts:274-280).
- Guest directory existence probe: instead of Win32 `fs.stat` on the 9P filesystem (which "can report ENOENT for directories that exist" — the cause of "Working directory ... does not exist" errors opening WSL worktrees), Fabrica asks the distro itself: `wsl.exe -d <distro> -- sh -c 'if [ -d "$1" ]...'` with `__FABRICA_DIRECTORY_EXISTS__`/`__MISSING__` markers; returns `null` (not false) when undeterminable so callers fall back to fs checks without false-rejecting valid dirs (wsl.ts:24-49, :72-118).

### 1.3 Renderer/IPC surface

- `ipcMain.handle('wsl:isAvailable')` and `'wsl:listDistros'` are wired exclusively to the ASYNC variants, with a comment that the sync variants "would block the main event loop" (ipc/app.ts:261-264; test proof ipc/app.test.ts:410-422).
- Dashboard cards carry a host-kind enum including `'wsl'` alongside `'local' | 'ssh' | 'remote'` (shared/dashboard-snapshot.ts:57; validated set ipc/dashboard-payload-validation.ts:39).

---

## 2. Path translation layer (Windows <-> WSL)

### 2.1 Canonical parser/converter (`shared/wsl-paths.ts`, 47 lines)

- Recognizes BOTH `\\wsl.localhost\<Distro>\...` (modern) and `\\wsl$\<Distro>\...` (legacy), case-insensitive share name, via `//wsl\.localhost|wsl\$\/([^/]+)(/.*)?` after backslash normalization (shared/wsl-paths.ts:6-17). Missing tail maps to `/`.
- `toWindowsWslPath(linuxPath, distro)`: `/mnt/<drive>/...` tails convert to real drive paths (`X:\...`); everything else becomes `\\wsl.localhost\<distro><path>` (shared/wsl-paths.ts:24-32).
- Case-folding helper `foldWslUncPathCaseInsensitiveParts`: Windows folds the share, the distro name, AND drvfs `/mnt/<drive>` tails case-insensitively, but the rest of the Linux path is case-sensitive — so only those three parts are lowercased; `/MNT` (uppercase) is treated as an ordinary case-sensitive Linux dir and left alone (shared/wsl-paths.ts:34-46).
- This parser is consumed far beyond the WSL modules: Claude account auth storage validation (claude-accounts/service.ts:34, :958-964), AI Vault session filters (shared/ai-vault-session-filters.ts:11), resume-path resolution (shared/ai-vault-resume-path.ts:1), git capability caches (git/git-capability-state.ts:2).

### 2.2 Windows->Linux direction (`wsl.ts toLinuxPath`)

- UNC paths become their native Linux form; drive paths `C:\...` become `/mnt/c/...`; anything already POSIX passes through unchanged (wsl.ts:129-143). Used by hook environments so scripts reading `FABRICA_ROOT_PATH` inside WSL don't break on raw `C:\` values (comment wsl.ts:120-128; applied in hooks.ts:700-704).

### 2.3 Cross-platform canonicalization

- `shared/cross-platform-path.ts` folds WSL UNCs to `//wsl/<lowercased-distro><tail>` for runtime-root-insensitive comparison (cross-platform-path.ts:50-54, :94). Clone destination dedup does the same fold while preserving Linux-path casing (git/repo-clone-path.ts:62-67; tests repo-clone-path.test.ts:47-60 prove `\\wsl$\ubuntu` == `\\wsl.localhost\Ubuntu` but != lowercase username).

---

## 3. wsl.exe invocation patterns & command-escaping discipline

Every wsl.exe spawn in the codebase uses one of five shapes; each exists because of a documented interop failure:

### 3.1 Base64-wrapped bash payloads (`wsl-bash-command.ts`)

- `buildEncodedWslBashCommand(command)`: base64-encodes the whole script, then runs `set -o pipefail; printf %s '<b64>' | base64 -d | bash`. Rationale: "wsl.exe preprocesses `$local_shell_vars` in command arguments before Bash sees them" (wsl-bash-command.ts:6-11). Used by Claude managed-auth validation scripts (claude-accounts/service.ts:36, :976-979).

### 3.2 Dollar-escaped `sh -c` payloads (`shared/wsl-login-shell-command.ts`)

- `escapeWslShCommandForWindows` walks the string and backslash-escapes every unescaped `$` because "WSL preprocesses unescaped $ in Windows argv before the WSL-side shell sees it" (shared/wsl-login-shell-command.ts:5-18).
- `buildWslLoginShellCommand(command)` detects the user's real login shell via `getent passwd "$(id -un)"`, falls back `$SHELL` -> `/bin/sh`, and dispatches `-ilc` for bash/zsh/ksh/mksh/ash, `-lc` for sh/dash, `/bin/sh -lc` otherwise (shared/wsl-login-shell-command.ts:20-37).
- Interactive variant additionally injects Fabrica's "shell-ready" wrappers: bash gets `--rcfile <userData>/shell-ready/bash/rcfile`, zsh gets `ZDOTDIR=<userData>/shell-ready/zsh`, then `exec "$SHELL" -l` (shared/wsl-login-shell-command.ts:39-67).

### 3.3 Git runner's three WSL modes (`git/runner.ts`, central router)

The runner's header states its reason to exist: "when a repo lives on a WSL filesystem, native Windows binaries (git.exe, gh.exe, rg.exe) are absent or slow, so this routes execution through `wsl.exe -d <distro>` with translated Linux paths" (git/runner.ts:2-8).

- `resolveCommand` returns a `ResolvedCommand` with `wslMode: 'direct-git' | 'login-shell' | 'non-login-shell' | null` (git/runner.ts:70-77, :217-301).
- Routing decision: a UNC cwd OR an explicit distro override selects WSL; non-win32 platforms pass through untouched (git/runner.ts:228-239).
- All string args are path-translated (`translateArgsForWsl`: UNC -> Linux, drives -> `/mnt/x/...`; git/runner.ts:85-105) and each arg is POSIX single-quoted to prevent word-splitting/globbing inside the `bash -c` string (git/runner.ts:245-246).
- Env vars do NOT cross wsl.exe ("env on wsl.exe stays Windows-side; WSLENV forwards only named vars"), so the git output locale rides the command-string prefix — issue #7808 (git/runner.ts:62-68, :242-243).
- Mode `direct-git` (fastest, read-oriented): `wsl.exe -d <distro> --exec /usr/bin/env PATH=... HOME=... <locale vars> [GIT_OPTIONAL_LOCKS=...] <guestGitPath> -C <linuxCwd> <translated args>` — no shell at all (git/runner.ts:253-274). Enabled only when `preferWslDirectGit` is set, no caller-supplied `GIT_*` env deltas exist, no configured SSH command for network ops, and a distro is known (git/runner.ts:347-374). The guest PATH/HOME/git path come from `wsl-git-read-environment` probing (imported git/runner.ts:44-50; probe builds `sh -lc` login-shell script at git/wsl-git-read-environment.ts:51-55). Exit 127/"not found" invalidates the cached environment and falls back; a successful fallback DISABLES direct-git for that distro (git/runner.ts:382-414).
- Mode `login-shell`: `wsl.exe -d <distro> -- sh -lc '<escaped login-shell wrapper>'` (git/runner.ts:276-291) — used whenever a caller passed a `wslDistro` explicitly (git/runner.ts:376-380), so credential helpers and user profiles load like a real login.
- Mode `non-login-shell` (default): `wsl.exe -d <distro> -- bash -c 'cd <linuxCwd> && ...'`. Deliberately NOT `wsl.exe --cd`, which "fails with ERROR_PATH_NOT_FOUND under Node's execFile/spawn in some configs"; and Node-side `cwd:` is left undefined because "a UNC cwd on the Node process is redundant and can break Node internals" (git/runner.ts:211-216, :293-300).
- Host-side hard kills go through `taskkill /t /f` because "Windows shims/wsl.exe own descendants" (git/runner.ts:442-492).

### 3.4 gh/glab CLI fallbacks

- When WSL-routed `gh` fails with "command not found", Fabrica retries on the Windows host — but ONLY for commands that carry their own context (`api`, `auth`, explicit `-R/--repo`, `repo view owner/repo`), because "host gh can't use a WSL UNC cwd" (git/runner.ts:153-182).
- Reverse fallback: host ENOENT for gh/glab routes through the pinned/default distro (`setDefaultWslDistroOverride`, git/runner.ts:184-209) — with an open TODO that there is no default-distro setting yet, so override-less global gh callers on WSL-only installs still fall to host gh.exe and fail (git/runner.ts:232-233).
- Rate-limit circuit breaker scope keys distinguish runtimes: `wsl:<distro>:<host>` vs plain host (git/gh-rate-limit-breaker.ts:36-54; tests confirm GHES ports survive, gh-rate-limit-breaker.test.ts:65-89) so a WSL-side GitHub primary-rate-limit block never freezes host-side gh calls.

---

## 4. Runtime selection state machine (host vs WSL)

### 4.1 Types & decision function (`shared/project-execution-runtime.ts`, 294 lines)

- Preferences: project-level `LocalWindowsRuntimePreference = inherit-global | windows-host | {kind:'wsl', distro}` and global `GlobalWindowsRuntimeDefault = windows-host | {kind:'wsl', distro|null}` (project-execution-runtime.ts:1-8).
- Resolution is total: non-win32 resolves to `local-host` immediately (project-execution-runtime.ts:148-159); otherwise project override wins, then global default, then windows-host (project-execution-runtime.ts:160-176).
- WSL requests produce either a resolved runtime (`kind:'wsl'`, `hostPlatform:'wsl'`, cacheKey `<projectId>:wsl:<distro>`) or a typed repair state with reasons `wsl-unavailable | wsl-distro-required | wsl-distro-missing` derived from the cached availability/distro lists (project-execution-runtime.ts:31-51, :178-225, :256-274). "Missing distro" is only claimed when a non-empty distro list proves absence (project-execution-runtime.ts:269-274) — matching the staleness policies of section 1.
- Legacy settings migration: old `localAgentRuntime`/`terminalWindowsShell=wsl.exe` settings derive the new global default, falling back to windows-host when WSL was unavailable or the recorded distro is gone (project-execution-runtime.ts:122-143, :243-254). Shell-name sniffing accepts `wsl.exe` or `wsl` basename (project-execution-runtime.ts:288-294).
- Main-process wiring reads ONLY the cached probe state (never spawns): `resolveLocalProjectRuntime` feeds `getCachedWslAvailability()/getCachedWslDistros()` plus per-project `localWindowsRuntimePreference` and settings `localWindowsRuntimeDefault` into the resolver (local-project-runtime-resolution.ts:24-41), exposed per-repo/per-worktree for mobile polls too (local-project-runtime-resolution.ts:43-106).

### 4.2 Account-level runtime selection

- Codex/Claude account targets carry `runtime: 'host' | 'wsl'` + `wslDistro` with normalized selection keys `host` / `wsl:<distro-or-__default__>` (shared/codex-selection-lane.ts:1-34). Zod schemas pin the exact target shapes (shared/codex-reset-credit-attempt-ledger.ts:6-7). Local account runtime preference resolves from settings `localAccountRuntime`/`localAccountWslDistro` falling back to the global default (shared/local-account-runtime.ts:20-34).

---

## 5. PTY / terminal plane (WSL shells)

### 5.1 Shell selection

- `isWslShellName` treats basename `wsl.exe`/`wsl` as WSL (shared/local-windows-terminal-runtime.ts:13-16).
- When a project's resolved runtime is `wsl`, terminal spawn is FORCED to `shellOverride: 'wsl.exe'` + the runtime distro, overriding any user shell preference; a `repair-required` runtime throws before spawn (`Project runtime requires repair before terminal spawn: <reason>`) (shared/local-windows-terminal-runtime.ts:46-57). Repair-required tabs still advertise `wsl.exe` "instead of falling back to host metadata" (shared/local-windows-terminal-runtime.ts:76-80); WSL-UNC worktrees default to wsl.exe even without a project runtime (shared/local-windows-terminal-runtime.ts:97-99).
- Host fallback shell is `powershell.exe` when the requested/settings shell was wsl.exe but no WSL runtime applies (shared/local-windows-terminal-runtime.ts:18-28).

### 5.2 Launch argv construction (`providers/windows-shell-args.ts`, 234 lines)

- Single shared decision point so in-process LocalPtyProvider and daemon-subprocess spawner produce IDENTICAL args — prior drift made the daemon always spawn PowerShell (windows-shell-args.ts:28-35).
- The wsl.exe branch (windows-shell-args.ts:204-227):
  - UNC cwd -> `buildWslShellArgs(linuxPath, distro)`; effectiveCwd becomes the user home because **"WSL cannot cd into a Windows path"** — node-pty spawns from `$HOME` while a `cd '<linux path>'` inside the shell does the real work; validation stays on the Windows cwd (windows-shell-args.ts:41-48 doc, :205-211).
  - Posix cwd with `treatPosixCwdAsWsl` (daemon/WSL-originated sessions) enters that path directly and validates via `toWindowsWslPath` (windows-shell-args.ts:213-218).
  - Plain drive cwd -> translated to `/mnt/<drive>/...`; non-drive cwd falls back to `/mnt/c` (windows-shell-args.ts:220-225).
- `buildWslShellArgs` emits `wsl.exe [-d <distro>] -- sh -c '<cd && export PATH="$HOME/.local/bin:$PATH" && interactive-login-wrapper>'`, launching the distro login shell "so terminal PATH matches the environment FABRICA detects" for users who customize zsh (windows-shell-args.ts:118-132).
- Non-WSL branches set UTF-8 code pages (`chcp 65001`) because Git-Bash ConPTY inherits OEM CP437 and TUI agents writing raw UTF-8 render mojibake (windows-shell-args.ts:20-26), plus OSC-133 bootstraps for PowerShell foreground detection (windows-shell-args.ts:92-116) — relevant context for why Windows-host agent terminals need their own bootstrap path.

### 5.3 WSLENV environment bridge (`pty/wsl-fabrica-env.ts`, 122 lines)

- wsl.exe imports ONLY Windows env vars named in `WSLENV`; Fabrica maintains an explicit allowlist with per-variable flags:
  - `/u` = cross untranslated (already POSIX or non-path values): terminal handle, CLI command, pane key, tab id, worktree id, agent launch token, hook port/token/env/version, orchestration-compatibility host evidence, setup-agent sequencing vars (wsl-fabrica-env.ts:76-96).
  - `/p` = let WSLENV path-translate Windows->Linux: `FABRICA_USER_DATA_PATH`, OMP status extension paths, Prime agent status extension path (wsl-fabrica-env.ts:97-99).
  - Conditional flags: `FABRICA_AGENT_HOOK_ENDPOINT` uses `/p` while it is still a Windows path (guest reads it via /mnt/c) and `/u` once the hook relay has reported a guest-side POSIX endpoint (wsl-fabrica-env.ts:63-67). Worktree root-path vars pick `/u` vs `/p` by inspecting whether the value already starts with `/` — pre-translated hooks values must NOT be double-translated (#9206) (wsl-fabrica-env.ts:42-54).
  - OpenCode overlay dirs (`OPENCODE_CONFIG_DIR`, `FABRICA_OPENCODE_CONFIG_DIR`) may cross ONLY as guest-side POSIX (`/u`); "/p would path-translate a Windows value into /mnt/c and let in-guest OpenCode adopt it as its config root" via the relay spawn env (wsl-fabrica-env.ts:68-74).
- `addWorktreeSetupWslInteropEnv` mirrors the same registration for direct `runHook` wsl.exe spawns (archive hooks, windowless setup) (wsl-fabrica-env.ts:56-61).
- `stampWslOrchestrationCompatibilityHost` overwrites inherited host evidence with native WSL authority (`host kind 'wsl'`, incarnation = distro), deleting stale attachment/id/incarnation keys first (wsl-fabrica-env.ts:105-122).
- Generic helper `addWslEnvKeys` dedups bare WSLENV entries for credential-prompt guard env (shared/wsl-env.ts:1-17; consumer shared/git-credential-prompt-env.ts:106 notes "wsl.exe imports only variables registered in WSLENV").

### 5.4 Hooks execution across the boundary (`hooks.ts`)

- WSL worktrees are detected as `isWslPath(worktreePath) || runtimeTarget?.wslDistro`; on win32 without WSL they use `.cmd` runners, with WSL they use posix-family runners executed via `wsl.exe` ("WSL worktrees are Linux fs even though process.platform is 'win32'" — hooks.ts:561-580).
- Git inside WSL returns Linux paths, converted back to UNCs for Windows fs calls; chmod over the UNC sets the execute bit correctly inside the distro (hooks.ts:587-607).
- Hook environments get every `FABRICA_*` path value translated via `toLinuxPath` before spawn, then WSLENV-registered via `addWorktreeSetupWslInteropEnv` (hooks.ts:698-707).
- The unattended-git guard (blocking GCM popup, issue #7652) is applied to the WSL branch too — "WSL repos are the likeliest to hit the GCM popup" — with its own WSLENV registration carrying it across the boundary (hooks.ts:748-753).
- Project-runtime repair states are respected here as well: repair-required runtimes yield `{wslDistro: preferredRuntime.distro}` (hooks.ts:371-382).

---

## 6. Destructive filesystem operations on WSL (delete safety)

- Electron `shell.trashItem()` cannot recycle WSL UNC items ("the WSL virtual volume has none"), so deletes of WSL-hosted worktrees run real `rm` INSIDE the distro via `wsl.exe -d <distro> --exec rm ...` (30 s timeout), issue #6415; non-WSL paths return false to keep Recycle-Bin semantics (wsl-unc-delete.ts:19-63, :65-82).
- Containment engine (`wsl-contained-delete.ts`): when approved roots are supplied, the target must resolve under an approved root IN THE SAME DISTRO (longest-match), never `/`; the guest script re-verifies every component with `stat` device:inode checks against symlink/race/TOCTOU attacks, walks only through `/proc/self/fd` handles, verifies the physical pwd stays under the approved root, and exits 65 with `FABRICA_WSL_DELETE_REJECT:<reason>` markers that map to typed errors `path-outside-known-roots | unexpected-target-kind` (wsl-contained-delete.ts:4-120; wsl-unc-delete.ts:9-17, :43-56, :84-94). Race tests exist at the .wsl.test.ts level (wsl-approved-root-race.wsl.test.ts, wsl-unc-delete.wsl.test.ts).

## 7. Worktree placement & lifecycle on WSL

- Worktree roots mirror the desktop layout INSIDE the distro: for WSL repos with absolute Windows workspaceDir settings, the root becomes `<wslHome>/FABRICA/workspaces` (e.g. `\\wsl.localhost\Ubuntu\home\user\FABRICA\workspaces\repo\feature`). Rationale: creating worktrees on `/mnt/c` would be extremely slow cross-filesystem I/O and terminals would open the wrong shell (ipc/worktree-logic.ts:90-128).
- Remote (SSH) worktrees deliberately do NOT honor absolute desktop workspaceDir — they fall back to repo-sibling directories so origin/main isn't shared (ipc/worktree-logic.ts:130-147).
- Linked-worktree git routing: a Windows-drive checkout whose `.git` FILE points into a WSL repo is ambiguous — WSL git resolves Windows-authored pointers relative to cwd. Fabrica walks parents looking for a `.git` file containing a drive-letter gitdir (`parseWindowsLinkedGitdir`) and routes such checkouts through HOST git, cached with a 30 s TTL, bounded probe concurrency (2/cwd, 32 total), and transient-failure backoff (git/wsl-linked-worktree-git-routing.ts:8-15, :25-52, :71-99, :242-288). Capability caches are keyed per distro (`wsl:<distro>` vs `local`) so native state doesn't bleed across distros (git/git-capability-state.ts:20-53).
- `remove-worktree` deletes WSL-hosted checkouts in place inside the distro and refuses rename-style removal for WSL checkouts configured on a native-Windows repo (tests remove-worktree.test.ts:465-495).

## 8. Filesystem watching, search, listing over WSL

- File watchers: Win32 native watchers can't see 9P changes reliably, so WSL roots get a dedicated watcher child: `spawn('wsl.exe', ['-d', distro, '--', 'sh', '-s', '--', linuxPath])` streaming framed directory snapshots; events are produced by snapshot DIFFING (create/update/delete/type-change), with overflow handling that marks overflow rather than lying, capacity reservations for watcher children, and physical-exit ownership releasing the reservation (ipc/filesystem-watcher-wsl.ts:116-151, :153-259; ipc/filesystem-watcher.ts:12-13, :696 dispatches to createWslWatcher for WSL roots).
- Search/listing: ripgrep availability is checked per-distro; when rg must run inside WSL, `wslAwareSpawn('rg', ...)` routes through the git runner and raw `/...` output lines are converted back to UNC paths via `toWindowsWslPath` before reaching the renderer (ipc/filesystem-list-files.ts:6-7, :100-101, :124-126).
- AI Vault / native-chat transcript scanning enumerates EVERY distro's `$HOME` (`listWslDistrosAsync` + `getWslHomeAsync` fan-out) to find Claude/Codex session stores (ai-vault/cached-session-list.ts:124; native-chat/host-readable-transcript-path.ts:61-75; kimi runtime homes likewise kimi/kimi-runtime-home.ts:53).

## 9. Agent accounts / auth inside WSL

### 9.1 Claude managed auth (claude-accounts/service.ts)

- Account targets carry `managedAuthRuntime: 'host' | 'wsl'` + `wslDistro` + `wslLinuxAuthPath` (claude-accounts/service.ts:85-87, :337-338).
- Managed WSL auth dir creation (win32+wsl target only, guard at service.ts:907-911): resolves `$WSL_DISTRO_NAME` and `$HOME` via `wsl.exe -d <distro> -- bash -lc 'printf "%s\n%s\n" "$WSL_DISTRO_NAME" "$HOME"'` (service.ts:913-914), then `mkdir -p ~/.local/share/fabrica/claude-accounts/<id>/auth` plus a `.fabrica-managed-claude-auth` marker via a single quoted shell command through wsl.exe (service.ts:927-937). The Windows-side handle to that dir is `toWindowsWslPath(...)` (service.ts:942).
- Containment validation on every read: the stored path is parsed as WSL UNC and must live under `/.local/share/fabrica/claude-accounts/<id>/auth`; canonicalization re-checks inode identity INSIDE the guest using the base64-script pattern before trusting it; violations raise "Managed WSL Claude auth storage is outside Fabrica account storage." (service.ts:956-998).
- Login flows create temp config dirs inside the distro (`mktemp -d`) when the account targets WSL, cleaned up through wsl.exe afterwards (service.ts:649-696).
- Selection integrity: switching accounts validates that requested runtime/distro matches the stored target (service.ts:472-473); restart preservation runs host Codex -> Claude -> **WSL Codex** steps in order, continuing if the WSL step throws so one broken distro cannot block app restart (agent-auth-restart-preservation.ts:69-73; order asserted in agent-auth-restart-preservation.test.ts:79).

### 9.2 Codex in WSL (codex-accounts/*, codex/*)

- All WSL codex invocations are built centrally: availability probe, machine identity, app-server launch, login — each becomes `buildWslLoginShellCommand(...)` escaped with `escapeWslShCommandForWindows` and run via wsl.exe (codex-accounts/wsl-codex-command.ts:11-68).
- Availability probing uses blocking `execFileSync('wsl.exe', buildWslCodexAvailabilityArgs(distro))` (codex-accounts/service.ts:1778) — note this is a main-thread sync spawn (contrast section 1.1's async policy).
- Guest-managed CODEX_HOME layout is pinned by `WSL_CODEX_RUNTIME_HOME_SEGMENTS` under the guest home ("Must stay in sync" comment) (pty/codex-home-wsl-env.ts:1-14); Windows paths are rejected as CODEX_HOME for WSL runs (codex-home-wsl-env.test.ts:5). Trust-grant stamping captures the guest binary identity via wsl.exe execFileSync (codex/codex-trust-grant-host.ts:81-85) and state-db backfill recovery relaunches the app-server through the same builder (codex/codex-state-db-backfill-recovery.ts:93).
- Commit-message text generation spawns its WSL launcher with a dedicated env builder that forwards only explicit deltas (text-generation/commit-message-text-generation.ts:353, :610; rationale echoed in codex-cli/codex-home-process-lock.ts:23).

## 10. Fabrica CLI inside WSL (cli/wsl-cli-*)

- A managed bash launcher installed into the distro (`~/.local/bin`) locates Windows PowerShell interop (PATH `powershell.exe`, else hardcoded `/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`), hard-fails without interop, repairs an outlived-cwd, converts paths with `wslpath -w`, and `exec`s a PowerShell bridge script that pushes the original WSL cwd as `FABRICA_CLI_CWD` and invokes the WINDOWS Fabrica launcher with forwarded args (cli/wsl-cli-scripts.ts:4-72). So the "Linux CLI" in WSL is actually a round-trip back to the Windows binary.
- Safety machinery: base64-encoded target embedded as a marker comment for self-repair (`FABRICA_WIN_LAUNCHER_B64=`, cli/wsl-cli-scripts.ts:12, parse at :126-138); managed-marker grep guards prevent clobbering user-owned commands (:80-92); per-distro `flock` serializes stable+nightly installers against the same bridge files (:94-104); legacy pre-rename wrappers removed only if Fabrica-managed (:106-110); safe-remove keeps user-owned `fabrica` intact (:112-124).
- IPC wiring registers installs per distro using `getDefaultWslDistro()` fallback (ipc/cli.ts:7-12).

## 11. SSH remote-execution plane (~200 files in src/main/ssh/)

### 11.1 Transport selection (ssh2 library vs system OpenSSH binary)

- System ssh discovery: `%SystemRoot%\System32\OpenSSH\ssh.exe` on win32, standard POSIX paths elsewhere; PATH scan honors quoting; `FABRICA_SYSTEM_SSH_PATH` env override wins (ssh/system-ssh-binary.ts:4-53).
- The ssh2 (library) transport is default; SYSTEM ssh transport is required when ProxyCommand/ProxyJump/fdpass proxies are configured or `FABRICA_SSH_FORCE_SYSTEM_TRANSPORT=1` (ssh/ssh-transport-selection.ts:71-91). Security keys (sk-) detectable from bounded key-file reads also force system transport, but only if the binary exists — otherwise ssh2 agent/password auth still gets a chance rather than hard-failing (ssh/ssh-transport-selection.ts:60-113; non-win32 opens key files O_NONBLOCK while win32 can't, :21-22).
- Connection lifecycle files: ssh-connection.ts (53 KB core), ssh-connection-manager/store/generation/utils, ssh-control-socket, ssh-config-parser/loader/include-expander/host-picker/path-expansion/resolver (full ~/.ssh/config semantics incl. Include expansion and host-pattern matching), ssh-proxy-command, ssh-auth-resolution, ssh-private-key/security-key/agent-identity-filter authentication modules, vscode-ssh-authority (VS Code config coexistence), ssh-target-id-migration/readoption.

### 11.2 Relay protocol (VS Code-derived)

- 13-byte framing header matching VS Code's PersistentProtocol wire format; JSON-RPC over framed messages with Regular/KeepAlive types, 5 s keepalive, 20 s timeout (ssh/relay-protocol.ts:1-41).
- Versioned handshake: `RELAY_VERSION = '0.1.0'`, sentinel line `FABRICA-RELAY v0.1.0 READY` awaited up to 10 s; remote install root `.fabrica-remote` (relay-protocol.ts:28-31). Typed error codes (-33001 CommandNotFound ... -33007 StreamProtocolError) (relay-protocol.ts:45-53). 256 KB streaming chunks for file reads; git responses stream via a `__FABRICAGitResponseStream` marker absent on old relays so new clients fall back gracefully (relay-protocol.ts:61-92).

### 11.3 Platform detection & remote dialects

- Two-probe detection over one connection: POSIX `uname -sm` behind a `__FABRICA_REMOTE_PLATFORM__` marker; if unmappable/failed, a PowerShell probe (`$env:PROCESSOR_ARCHITECTURE` / RuntimeInformation) settles Windows remotes incl. Cygwin-shaped unames; unsupported platforms warn and return null; transport-shaped errors (session-limit, unconfirmed termination, exec timeout) take precedence in error reporting because "an unconfirmed close still holds the sshd session slot" (ssh/ssh-remote-platform-detection.ts:13-17, :25-62, :126-164).
- Detected platforms map onto a 6-entry table (linux/darwin/win32 x x64/arm64) that drives EVERYTHING downstream: path flavor posix|windows, command dialect posix|powershell, separators, PATH delimiters (ssh/ssh-remote-platform.ts:18-77).
- Remote-path safety: segments rejected for traversal/NUL; windows flavor additionally rejects device names (CON/PRN/NUL/COM1-9/LPT1-9 incl. superscripts), trailing dots/spaces, control chars and `<>:"|?*` because "Win32 canonicalizes names and exposes devices/NTFS streams through otherwise ordinary-looking path segments, bypassing no-clobber checks" (ssh/ssh-remote-platform.ts:87-123). Home validation requires drive-absolute or UNC on windows flavor (ssh/ssh-remote-platform.ts:140-148).

### 11.4 Relay deploy pipeline (ssh-relay-deploy.ts, 1956 lines)

- One cohesive contract: version detect, install-locked deploy, native-deps probe, launch, GC (header ssh-relay-deploy.ts:2). Components visible from imports: versioned install dirs computed remotely with install markers, install locks + repair locks + GC claims (fencing against two desktop instances deploying simultaneously), staged upload pool with reserve/promote/recover-stale commands (crash-safe uploads), SFTP namespace mappings, endpoint credential writing, remote Node.js resolution, native-deps installation with build-toolchain probing (node-gyp style) and node-pty warnings (ssh-relay-deploy.ts:13-90). Windows remotes get named-pipe endpoint handling (`isWindowsRelayPipePath`, active-pipe markers, fallback socket names, ssh-relay-endpoints.ts imports :81-88).
- Remote Node resolution has its own module plus toolchain problem reporting and node-install guidance surfaces (ssh/ssh-remote-node-resolution.ts, ssh-remote-node-toolchain-probe*, ssh-remote-node-install-guidance*).

### 11.5 Relay session authority (ssh-relay-session.ts, 3041 lines)

- Single authority for all relay lifecycle state per SSH target (comment :1-2). It wires the relay into the app as first-class providers: SshPtyProvider registered into ipc/pty (remote PTYs become ordinary terminals with attach/reattach, incarnation tracking, output intake checkpoints, recovery retention budgets), SshFilesystemProvider + SshGitProvider dispatched per target, port-forward managers, and — critically for CLI agents — AGENT HOOKS delivered OVER THE RELAY: managed hook detection/install RPC methods and notification/request-replay methods so status-line hooks of remote agents report back to the desktop app (ssh-relay-session.ts:10-70).
- Reconnect ladder, error classification, PTY consumer recovery/targeted reattach queues, session incarnation/recovery race fencing, relay-loss and terminal-error tests form the resilience layer (ssh-reconnect-ladder.ts, ssh-pty-consumer-*, ssh-relay-session-* test family).

### 11.6 Fabrica CLI bridged onto remotes (ssh-remote-cli-launcher.ts)

- Installs a `fabrica` launcher INTO the remote that connects to the deployed relay's Unix socket: POSIX variant = tiny sh script exec-ing relay.js with `--sock-path/--credential-file/--fabrica-cli` args, chmod'd loudly (ssh-remote-cli-launcher.ts:222-247).
- Windows remotes: a C# launcher source is UPLOADED AND COMPILED ON-TARGET with the .NET Framework `csc.exe` — "compiling on the Windows target avoids shipping an unsigned cross-host binary while ensuring argv never crosses cmd.exe's parser"; legacy .cmd shim removed only after successful compile (ssh-remote-cli-launcher.ts:25-151, :196-220; space-in-path csc.exe workaround :157-194).
- Companion remote CLI suite: ssh-remote-linear-* implements read/write Linear issue CLIs runnable remotely (list/save/relation-write/output formatting/help), ssh-remote-orchestration-* provides ask/check/send orchestration commands remotely, ssh-remote-host-passthrough and in-process resume support round out agent operability over SSH.

### 11.7 Ephemeral VM runtimes (built ON the SSH plane)

- Recipes define VMs; the runtime service provisions/cleans/suspends/resumes them and persists EphemeralVmRuntimeRecord entries keyed by userDataPath (ephemeral-vm-runtime-service.ts:19-120+).
- Recipe connections of type 'ssh' register RUNTIME-OWNED targets through the normal SSH handlers: target persisted at upsert, connect must reach `connected`, then both git and filesystem providers must appear within a 10 s ready window; failure removes the orphaned target idempotently (ephemeral-vm-runtime-ssh.ts:12, :20-71).
- Runtime-owned ids use the reserved prefix `runtime-ssh-` so the renderer can hide them from user-facing SSH surfaces (shared/execution-host.ts:59-67).

### 11.8 Execution-host identity model (shared/execution-host.ts)

- Host ids: `local` | `ssh:<encodedTargetId>` | `runtime:<environmentId>`; repo.connectionId legacy-maps to an ssh host; worktrees carry hostId taking precedence over repo inference (execution-host.ts:3-14, :51-57, :142-164). This is the join key between the local/WSL world (section 4) and the SSH/VM world (this section).

---

## 12. Windows-primary risk register (what matters for THIS user)

Numbered flags, each tied to evidence above:

1. **Sync wsl.exe probes on the main thread still exist.** Availability/distro probes are async-first (ipc/app.ts:261-264), but `getWslHome`, `wslUncDirectoryExists` (worktree open path), `listWslDistros` (sync callers), and the Codex availability probe (`execFileSync`, codex-accounts/service.ts:1778) block up to 5 s each on a wedged wsl.exe. On a laptop where WSL cold-starts slowly, worktree creation and account switching can visibly stall.
2. **Repair states gate terminals, not just UI.** A project pinned to a missing distro throws before terminal spawn and hooks derive distro from repair state; a Windows user who uninstalls a distro gets hard failures in exactly the surfaces (terminal, hooks) they use most (shared/local-windows-terminal-runtime.ts:46-50; hooks.ts:371-382).
3. **Two escaping layers guard every command crossing.** `$`-preprocessing by wsl.exe argv is defended twice (base64 wrapping for scripts, backslash-escaping for sh -c). Any After-Rebrand code that builds its own `wsl.exe ... bash -c ...` strings without these helpers will break on paths/commands containing `$` — this is the single easiest regression to introduce (wsl-bash-command.ts:6-11; shared/wsl-login-shell-command.ts:5-18).
4. **WSLENV allowlist is load-bearing.** Env vars silently do not cross into WSL unless registered (hooks.ts:705-707); new FABRICA_* vars intended for guest agents MUST be added to pty/wsl-fabrica-env.ts with the correct /u vs /p flag, or they will be empty inside WSL while working on host.
5. **Deletes on WSL are true deletes, not Recycle-Bin.** shell.trashItem cannot recycle UNC items (#6415); with approvedRoots supplied there is strong containment/race protection, but any caller that omits approvedRoots gets an unrestricted in-guest `rm -rf -- <linuxPath>` (wsl-unc-delete.ts:43-61).
6. **WSL worktrees are placed INSIDE the distro filesystem** (`~/FABRICA/workspaces`) for performance; users expecting worktrees next to their Windows repos will find them only via UNC paths, and backup tools scanning C:\ won't see them at all (ipc/worktree-logic.ts:90-128).
7. **9P is treated as hostile.** Directory-existence checks, file watching, rg availability, and git capability caches all have WSL-specific fallbacks because Win32 stat/watch over `\\wsl.localhost` lies or stalls (wsl.ts:72-102; ipc/filesystem-watcher-wsl.ts; ipc/filesystem-list-files.ts:46-66). Any feature doing plain fs calls against WSL UNCs inherits those failure modes.
8. **Linked worktrees spanning filesystems route to host git** with a 30 s TTL cache; deleting/recreating such checkouts has a bounded staleness window where git ops may take the wrong side (git/wsl-linked-worktree-git-routing.ts:8-15).
9. **gh/glab asymmetry:** WSL-only installs (no host gh) lose global gh calls until a default-distro override exists — explicitly a TODO in code (git/runner.ts:232-233). Conversely WSL-side rate-limit blocks are isolated per distro+host scope.
10. **Claude/Codex auth state lives per-runtime AND per-distro.** Account selection keys include runtime+distro (shared/codex-selection-lane.ts), managed Claude auth is stored inside the target distro under Fabrica's path with inode-verified containment (claude-accounts/service.ts:927-998). Deleting/reinstalling a distro silently invalidates accounts whose auth lived there.
11. **SSH plane is mature and Windows-remote aware** but Windows REMOTES pay a compile tax (csc.exe must exist on the remote for the CLI launcher; ssh-remote-cli-launcher.ts:182-184) and need named-pipe endpoint handling. ProxyJump/ProxyCommand/security-key users are forced onto system ssh.exe — Windows' OpenSSH must be present (ssh-transport-selection.ts:71-113; system-ssh-binary.ts:8-9).
12. **Ephemeral VMs ride the SSH store with reserved ids** (`runtime-ssh-`); tooling that enumerates SSH targets must keep filtering them or VM targets leak into user UIs (shared/execution-host.ts:59-67).

## 13. Cross-references to prior rounds

- Git subsystem depth (runner call sites, credential handling): discovery/round4/fa-git-integration.md
- PTY lifecycle detail: discovery/round4/fa-pty-terminal.md
- IPC channel surface incl. `wsl:*` handlers: discovery/round4/fa-ipc-watchers.md
- Settings/data-dir layout (`FABRICA_USER_DATA_PATH` used as shell-ready root + WSLENV /p translation source): discovery/round4/fa-settings-config-datadirs.md

## 14. Scan coverage statement

**Read in full (line-level):**
src/main: wsl.ts (374 L), wsl-availability.ts (213 L), wsl-bash-command.ts (11 L), wsl-contained-delete.ts (130 L), wsl-distro-list-output.ts (11 L), wsl-distro-retry.ts (4 L), wsl-env.ts (1 L), wsl-unc-delete.ts (94 L), local-project-runtime-resolution.ts (106 L), providers/windows-shell-args.ts (234 L), shared/wsl-paths.ts (47 L), shared/wsl-login-shell-command.ts (67 L), shared/wsl-env.ts (17 L), shared/project-execution-runtime.ts (294 L), shared/local-windows-terminal-runtime.ts (101 L), shared/execution-host.ts (191 L), pty/wsl-fabrica-env.ts (122 L), cli/wsl-cli-scripts.ts (154 L), git/wsl-linked-worktree-git-routing.ts (306 L), git/runner.ts lines 1-599 (of 1838; core resolution/exec sections), ssh/relay-protocol.ts lines 1-120 (of 222), ssh/ssh-remote-platform.ts (185 L), ssh/ssh-remote-platform-detection.ts (188 L), ssh/system-ssh-binary.ts (53 L), ssh/ssh-transport-selection.ts (113 L), ssh/ssh-remote-cli-launcher.ts (247 L), ephemeral-vm-runtime-ssh.ts (71 L), ephemeral-vm-runtime-service.ts lines 1-120 (of 268), ipc/filesystem-watcher-wsl.ts lines 100-259 (of 358), ipc/worktree-logic.ts lines 90-149 (of 307), worktree-root-preparation.ts (35 L).

**Read via targeted grep with line context (key claims verified in situ):**
claude-accounts/service.ts (~40 WSL sites), codex-accounts/{service,wsl-codex-command}.ts, codex/{codex-trust-grant-host,codex-state-db-backfill-recovery}.ts, agent-auth-restart-preservation.ts, hooks.ts (51 WSL sites), pty/{codex-home-wsl-env,prime-agent-shell-wrapper}.ts, skills/{skill-discovery-wsl,claude-plugin-skill-sources-wsl}.ts, text-generation/commit-message-text-generation.ts, daemon/wsl-session-context.ts, ipc/{app,cli,filesystem-list-files,filesystem-list-files-git-fallback,dashboard-payload-validation,dropped-path-resolution,ai-vault*}.ts, ai-vault/cached-session-list.ts, kimi/kimi-runtime-home.ts, native-chat/host-readable-transcript-path.ts, git/{git-capability-state,gh-rate-limit-breaker,repo-clone-path,wsl-git-read-environment,remote-ref-probe-cache,remote-url-probe}.ts, shared/{cross-platform-path,codex-selection-lane,local-account-runtime,dashboard-snapshot,ai-vault-session-filters,git-credential-prompt-env}.ts, ssh/ssh-relay-deploy.ts (imports/head, 1956 L total), ssh/ssh-relay-session.ts (imports/head, 3041 L total), runtime/fabrica-runtime.ts (CLI-managed WSL worktree comment site).

**Directory inventory (listed, not line-read):** src/main/ssh/ full listing (~200 files; every filename reviewed for plane mapping; per-file internals covered only for modules cited above — the relay session/deploy/multiplexer/config-parser/auth families were mapped structurally from imports, heads, and test names rather than line-by-line, consistent with R4-1.1/R4-1.12 already covering IPC/watcher and git-runner depth).

**Deliberately skipped:** all *.test.ts files except where cited as behavioral proof (wsl.test.ts 33 KB, ssh-relay-* test fixtures); _sources/ and legacy-fabrica (out of scope per AGENTS.md); renderer process code (src/renderer) — the renderer-facing contract was documented only through its main-process boundary (IPC channels, payload validation); docs/design-ssh-support.md referenced by relay-protocol.ts:3 was not read.

**Known residual gaps for a future pass:** ssh-channel-multiplexer.ts internals (22 KB transport writer lanes), ssh-config-parser.ts full option matrix, sftp-upload/namespace internals, vscode-ssh-authority semantics, ephemeral-vm-recipe-runner.ts recipe DSL, agent-hooks/wsl-hook-relay-launch.ts spawn mechanics (documented here only via consumers).



