# Fabrica-app — Git Integration Subsystem (Round 4 Deep Dive, R4-1.12)

> Task: ATLAS R4-1.12 · task_231c0952a403 · dispatch ctx_a8bde56ced96
> Scope: READ-ONLY deep dive of `Fabrica-app/` git integration — git operations surface (status/diff/commit/branch/remotes), how git is executed, worktree support, file-watch integration with git state, git-related IPC channels, credential handling. Every claim carries a file:line citation into `Fabrica-app/` unless prefixed otherwise.
> All paths relative to `src/` of Fabrica-app unless noted.

---

## 0. Executive Summary

Fabrica-app has one of the deepest git integrations of the three Atlas repos — deeper than mission-control and buzz combined in this domain:

1. **No git library.** All git execution is raw `node:child_process` (`execFile`, `execFileSync`, `spawn`) centralized in `main/git/runner.ts` (~1838 lines). `package.json` dependencies contain zero git libraries; the only process-related deps are `ssh2@^1.17.0` and `node-pty@^1.1.0` (package.json deps block: `"ssh2": "^1.17.0"`, `"node-pty": "^1.1.0"`; no `simple-git`/`isomorphic-git`/`dugite`/`nodegit` anywhere).
2. **Three execution planes for identical git semantics**: local Windows/host git, WSL-routed git (three invocation modes incl. a direct-`--exec` fast path), and SSH-relay-host git via `SshGitProvider` JSON-RPC mux requests (`git.status`, `git.commit`, `git.exec`, …). Capability caches are keyed per execution host.
3. **Worktrees are the core product primitive**: one worktree = one agent workspace. `worktrees:create` mints `worktreeId = ${repo.id}::${created.path}` (ipc/worktree-remote.ts:2380) and PTY panes, runtime state, and terminal tabs are all keyed by it.
4. **File-watch ↔ git is deliberately spawn-free**: `.git` metadata files (HEAD, index, packed-refs, logs/HEAD) are watched/polled directly with stat-signature gating, classified into structural / gitStatus / headIdentity tiers by an event filter, debounced 250 ms, and pushed to the renderer as `worktrees:*` events — replacing `git worktree list` fanout ("Keep it spawn-free", ipc/worktree-head-identity-reader.ts:5-7).
5. **Credentials are never injected** — there is no token rewriting, no `http.extraHeader`, no credential-helper installation. Auth relies on the user's ambient setup (GCM/OS store, SSH keys); the app instead enforces non-interactivity guards (`GIT_TERMINAL_PROMPT=0`, askpass emptying, `GCM_INTERACTIVE=never`, indexed `credential.interactive=false` config) and scrubs credentials from every surfaced git error message.

Scale inventory: `src/main/git/` = 97 files (largest: status.ts 78.7KB, runner.ts 63.5KB, worktree.ts 59.3KB, repo.ts 35.9KB); `src/shared/git-*` + related = 67 files; git/worktree-heavy IPC modules include ipc/repos.ts (101KB), ipc/worktrees.ts (135KB, 3,479 lines), ipc/worktree-remote.ts (95KB, 2,572 lines).

---

## 1. Architecture Overview — Where Git Lives

| Layer | Location | Role |
|---|---|---|
| Execution primitives | `main/git/runner.ts` | execFile/spawn wrappers, timeouts, tree-kill, locale pinning, non-interactive env, WSL routing, gh/glab runners |
| Domain ops | `main/git/{status,repo,remote,worktree,upstream,checkout,branch-rename,history}.ts` | porcelain status, diff blobs, commit/stage/discard, branch ops, history log, remote fetch/push/pull |
| Parsers & policy (shared) | `shared/git-*.ts` (67 files) | pure parsers/caches/classifiers reused main+renderer+relay |
| Remote-host execution | `main/providers/ssh-git-provider.ts`, `main/providers/ssh-git-dispatch.ts` | same operations over relay JSON-RPC |
| IPC surface | `main/ipc/repos.ts`, `main/ipc/worktrees.ts`, `main/ipc/filesystem.ts`, `main/ipc/git-status-upstream-ref-watch-request.ts` | channel handlers |
| Watch integration | `main/ipc/worktree-base-directory-*.ts`, `worktree-git-common-*.ts`, `worktree-head-identity-reader.ts` | FS-watch → git-state invalidation → renderer push |

Renderer never spawns git; it goes through IPC channels or `RuntimeGitContext { settings, worktreeId, worktreePath, connectionId }` where `connectionId` flips a call from local spawn to SSH-provider RPC (renderer/src/runtime/runtime-git-client.ts:70-75).

---

## 2. How Git Is Executed (runner layer)

### 2.1 Primitives

- Imports `execFile, execFileSync, spawn` from `node:child_process` + `StringDecoder` (runner.ts:9-17).
- Core async wrapper `execFileCapture()` at runner.ts:515-633 (callback invocation runner.ts:576-595). Deliberately avoids Node's built-in timeout/signal options: "our abort listener owns tree cleanup; Node's signal handler could kill wsl.exe before taskkill sees its children" (runner.ts:575).
- Streaming variant `spawnCommandCapture()` wraps `spawn()` with manual stdout/stderr byte accounting (runner.ts:635-727).
- Sync path `gitExecFileSync` hard-capped at 15 s because "sync git blocks the main thread" (`GIT_EXEC_SYNC_TIMEOUT_MS = 15_000`, runner.ts:1268-1269).
- Custom deadline timers kill the whole process tree then reject `` `${command} timed out.` `` — "Node's timeout waits forever on signal-ignoring CLIs" (runner.ts:612-630).
- Windows tree-kill: `taskkill /pid <pid> /t /f` as a spawned child, 2 s wait budget (`WINDOWS_TREE_KILL_WAIT_MS = 2000`, runner.ts:442-492; rationale "Windows shims/wsl.exe own descendants" runner.ts:453).
- Abort support: AbortSignal listener triggers tree-kill + synthetic `AbortError`; pre-aborted calls reject immediately (runner.ts:556-571, :631, :521-524).
- maxBuffer: `DEFAULT_GIT_MAX_BUFFER = 10 * 1024 * 1024` "to prevent an uncatchable V8 string overflow; match relay MAX_GIT_BUFFER" (runner.ts:305-306). Streaming runner enforces byte backstops on both pipes and kills on overflow (runner.ts:1184-1218). Overflow classifier checks ENOBUFS / `/maxBuffer/i` (max-buffer-overflow.ts:1-22).
- Encoding: default `'utf-8'`; binary mode via `encoding: 'buffer'` for `git show` blobs (runner.ts:984, :1036, :1062-1077, :1291).
- Locale pinning is NOT `LC_ALL=C`: `UNTRANSLATED_GIT_OUTPUT_ENV = { LANGUAGE:'en', LC_ALL:'en_US.UTF-8', LANG:'en_US.UTF-8' }` so gettext doesn't translate `fatal:` prefixes that parsers match, while keeping UTF-8 LC_CTYPE for hooks (shared/git-output-locale.ts:1-16; issue #7808). Applied into every sync/spawn/buffer read (runner.ts:1074, :1142, :1292, :1319). For WSL shell routing, env can't cross `wsl.exe`, so the locale rides the command string via `--exec /usr/bin/env` args (runner.ts:62-68, :243, :264).
- Timeouts: caller-passed per-call `timeout` (GitExecOptions.timeout, runner.ts:313); gh default 30 s env-overridable via `FABRICA_GH_EXEC_TIMEOUT_MS` (`DEFAULT_GH_EXEC_TIMEOUT_MS = 30_000`, runner.ts:1455-1484); WSL env probe 10 s (wsl-git-read-environment.ts:10).

### 2.2 Run-options types

- `GitExecOptions` (runner.ts:308-319): `{ cwd, encoding?, maxBuffer?, timeout?, stdin?, env?, signal?, wslDistro?, preferWslDirectGit?, useConfiguredSshCommandForNetwork? }`.
- Worktree-level: `GitRuntimeOptions = { wslDistro?: string; signal?: AbortSignal }` with builders `gitOptionsForWorktree` and `gitStatusReadOptionsForWorktree` which forces `preferWslDirectGit: true` for hot status polling (git-runtime-options.ts:1-27).
- Public runners: `gitExecFileAsync` (runner.ts:962-1012), `commandExecFileAsync` (:1018-1056), `gitExecFileAsyncBuffer` (:1062-1077), `gitStreamStdout` (:1104-1266), `gitSpawn` (:1306-1324), `wslAwareSpawn` (:1796-1812), `ghExecFileAsync` (:1622-1697), glab runner (:1732-1788).

### 2.3 WSL routing

- Routing decision: native unless win32 AND cwd parses as WSL UNC OR explicit distro override (runner.ts:217-239, :331-336). Three modes: `'direct-git' | 'login-shell' | 'non-login-shell'` (runner.ts:76).
- Default form: `wsl.exe -d <distro> -- bash -c 'cd <linuxCwd> && <locale-prefix> git <shell-escaped args>'` — NOT `wsl.exe --cd`, which fails ERROR_PATH_NOT_FOUND under Node's execFile/spawn in some configs (runner.ts:214-216, :293-300). Args POSIX-shell-escaped individually (runner.ts:245-246).
- Direct-git fast path skips bash entirely: `wsl.exe -d <distro> --exec /usr/bin/env PATH=<probed> HOME=<probed> <locale vars> git -C <linuxCwd> <args>` (runner.ts:253-273); PATH/HOME come from a 10 s probe (wsl-git-read-environment.ts:10). Gated by `preferWslDirectGit` and refuses when caller-supplied `GIT_*` env differs from process.env (runner.ts:363-374).
- Fallback ladder: direct-git failure retries via login-shell; exit 127 invalidates the probed environment; a successful retry disables the direct path for that distro (runner.ts:382-414, :994-1002, :1247-1263).
- Path translation: `\wsl.localhost\…` UNCs → Linux paths and `C:\…` → `/mnt/c/…` per arg (translateArgForWsl, runner.ts:85-105); output paths after `worktree` markers translated back (translateWslOutputPaths, runner.ts:1820-1835).
- Linked-worktree Windows-gitdir hazard: when a drive-path repo is a linked worktree whose `.git` file points at a Windows gitdir, WSL git resolves it wrong → host git forced. Detection walks parents for `/^gitdir:\s*([A-Za-z]:[/\\].*)$/i` (parseWindowsLinkedGitdir, wsl-linked-worktree-git-routing.ts:49-52, walk :71-99); cached route TTL 30 s, bounded probes, exponential retry 1 s→30 s (constants :9-16, cache :101-151); wired before every routed call (runner.ts:970-974, :1066-1068, :1110-1114) and short-circuits resolution at :343-346.

### 2.4 SSH provider plane (remote repos)

- Registry `registerSshGitProvider/unregisterSshGitProvider` keyed by `connectionId` with a monotonic generation counter bumped on register/unregister (providers/ssh-git-dispatch.ts:3-26); `requireSshGitProvider` throws 'Remote connection dropped. Click Reconnect...' (:28-34).
- `SshGitProvider implements IGitProvider` (~16 methods mirroring every local op): `mux.request('git.status')` (ssh-git-provider.ts:123-147), `git.commit` (:193-204), `git.push/pull/fetch` (:527-568), `git.clone` with progress notifications (:858-902). Raw argv escape hatch `provider.exec(args,cwd)` → `'git.exec'` RPC (:840-856); mutating argvs clear the diff dedupe around the exec (:849-851).
- Old-relay compat: JSON-RPC `-32601` converted into "Reconnect to deploy the latest relay" (:46-51, :163-173, :891-898).
- Cache keys embed `connectionId` + generation so stale post-reconnect answers die: `${connectionId}:${getSshGitProviderGeneration(connectionId)}` (remote-ref-probe-cache.ts:117-120).

### 2.5 Capability detection (no version probing)

No `git --version` probe exists; gating is behavioral probe-and-fallback over five capabilities: `'for-each-ref-exclude' | 'merge-tree-merge-base' | 'merge-tree-write-tree' | 'rev-parse-path-format' | 'worktree-list-z'` (shared/git-capability-cache.ts:5-10). `runWithFallback` runs preferred optimistically, remembers unsupported results with a 30-min negative retry (`GIT_CAPABILITY_RETRY_INTERVAL_MS = 30 * 60_000`, git-capability-cache.ts:3, verified), dedupes concurrent probes, and catches old-gits that echo unknown options but exit 0 (:96-104). Classifiers: exit code 129 as locale-independent unsupported signal for `worktree list -z` (git-worktree-command-capabilities.ts:17-24); merge-tree regexes incl. legacy 3-arg usage output (git-merge-tree-capability.ts:11-27); for-each-ref exclude (git-ref-command-capabilities.ts:11-14). Cache scoping: local caches keyed `'local'` vs `'wsl:<distro>'` (git-capability-state.ts:14-23); SSH caches in a WeakMap keyed by provider object so reconnects get fresh capabilities (:15-17, :59-66).

### 2.6 Read-cache invalidation & coalescing

- `invalidateGitReadCaches()` clears diff-read dedupe, status lease owner, branch-line-total in-flight, line-stats cache, submodule cache, upstream-name cache (status.ts:107-114).
- `runWithGitReadCacheInvalidation(run)` invalidates BEFORE and AFTER every mutation — "a read that started mid-mutation can be stale too" (status.ts:116-124); callers wrap mutations in worktree.ts:922/:1101/:1120, remote.ts:260/:270/:280, checkout.ts:31, ipc/repos.ts:1132, fabrica-runtime.ts:18890.
- Mutation marking for remote exec: `gitExecMutatesRepository(args)` iff `args[0] ∈ {'clone','commit','init'}` (shared/git-exec-mutation.ts:1-7).
- Coalesced probes: `runCoalescedProbe` joins an identical in-flight probe only while young (<60 s `PROBE_COALESCE_STALE_MS`); late probes can't publish over fresher successors (coalesced-probe.ts:15, :22-51).
- Config snapshot runner: `createGitConfigSnapshotRunner(runGit)` answers N `config --get` calls from ONE `config --list -z` snapshot with faithful exit-1-on-absent-key rejection semantics; interception disabled if the snapshot fails (git-config-snapshot-runner.ts:47-103); used once in `probeEffectiveUpstreamStatus` (status.ts:905-913).

### 2.7 Error normalization at this layer

- `extractExecError(err)` prefers explicit `.stderr`/`.stdout` off execFile rejections over `.message` (which truncates/omits stderr depending on Node version/maxBuffer) (exec-error.ts:12-41).
- `parseRetryAfterMs(stderr)` scans case-insensitive `retry-after:` values for gh/glab retry loops (exec-error.ts:53-92; used runner.ts:1684-1689, :1776-1781); transient classification retries HTTP 500/502/503/504/ECONNRESET/ETIMEDOUT/socket hang up, 429 only without Retry-After (runner.ts:1430-1448).

---

## 3. Status / Diff / Commit / Branch Surface

### 3.1 Status pipeline

- Entry `getStatus()` runs under a read LEASE so concurrent identical status reads share one underlying git run (lease created status.ts:103; class shared/git-status-read-lease-owner.ts:17-101; entry status.ts:227-237). Lease key = worktreePath + wslDistro + includeIgnored + reuseLineStats + branchLineTotalMergeBase + bypassEffectiveUpstreamNegativeCache + limit + sharedLinkPaths (status.ts:239-255).
- Exact command: `-c core.quotePath=false status --porcelain=v2 --branch --untracked-files=all`, plus `--ignored=matching` when requested (status.ts:303-313, verified). Streamed via `gitStreamStdout` feeding an incremental parser with early stop at the entry limit; `preferWslDirectGit: true` and `env: gitOptionalLocksDisabledEnv()` ("disable optional locks to avoid racing terminal Git on index.lock") (status.ts:315-335; locks helper runner.ts:729-736).
- Parsing: incremental streaming parser handles CRLF, branch headers `# branch.oid/head/upstream/ab`, records `1 `/`2 `/`? `/`! `, defers `u ` unmerged lines while counting them toward the limit; rename records split on tab with path = fields 9+ joined to preserve spaces (shared/git-status-porcelain-parser.ts:30-198). Submodule flags `S<C/M/U>` parsed at :217-229.
- Conflict machinery: unmerged entries resolved post-stream with kinds UU/AA/DD/AU/UA/DU/UD (status.ts:949-1003); conflict-operation detection reads gitdir marker files MERGE_HEAD / CHERRY_PICK_HEAD / rebase-merge / rebase-apply concurrently with the status stream (status.ts:301, :1030-1059); gitdir resolution handles worktree `.git` files via regex (:1079-1093).
- Limits: `DEFAULT_GIT_STATUS_LIMIT = 1_000`; 0 disables; capped results set `didHitLimit`/`statusLength`; contract states `branchLineTotal` optional "omitted — never zeroed" (shared/git-status-limit.ts:6-28; shared/git-status-types.ts:68-88).
- Huge-folder ignore: known names node_modules/.next/dist/build/target/vendor checked for existence and not-already-ignored, then appended to .gitignore with injection-safe allowlist (huge-folder-ignore.ts:11-78); batched existence via `check-ignore --stdin` (check-ignored-paths.ts:14-50).
- Shared-symlink phantom rows dropped from untracked entries (status.ts:216-221, :267-287).
- Line stats (+/- counts): staged+unstaged numstat `-z --numstat -M` under `core.quotePath=false` (runNumstat status.ts:616-646); failures return null so an incomplete pass is never cached; skipped entirely when the entry limit was hit (:399-421). Untracked additions counted by reading file content directly (concurrency 8, 2 MB cap, newline counting matching git semantics, symlink counts as 1 added line) (shared/git-uncommitted-line-stats.ts:139-150, :187-211, :16, :126-128).
- Line-stats cache: TTL 2 min, max 128 entries, identity JSON of head + per-entry shape, failed recomputes never cached (shared/git-status-line-stats-cache.ts:47-48, :54-70, :203-283); write-token generations retire pre-mutation scans (git-status-line-stats-write-token.ts:36-69).
- Upstream folding: porcelain v2 already carries ahead/behind (parser :101-113); probing only when no upstream or origin-same-name mismatch (shouldProbeEffectiveUpstreamStatus status.ts:917-930) through resolved-upstream-name cache TTL 60 s (status.ts:89-96), negative-status cache 5 min/512 entries (:74-80), in-flight coalescing (:717-853); positives deliberately not cached (:769-783).

### 3.2 Diff model — blob reads, not patch transport

- Main supplies BOTH blob contents; the renderer performs the textual diff client-side. Staged = concurrent `show HEAD:<path>` + `show :<path>` (loadDiff status.ts:1300-1397, staged reads :1357-1360); unstaged left side = index blob falling back to HEAD (:1844-1855), right side = plain fs read (:1905-1931); submodule routing first (:1308-1345).
- Caps: `MAX_GIT_SHOW_BYTES = 10 MB` (status.ts:71, applied :1867/:1892); fs reads >10 MB treated binary (:1920-1923); max-buffer overflow degrades to binary marker; base64 preview for image/PDF MIME types (bufferToBlob :1933-1948, MIME map :2000-2010). Oversized text diffs return metadata-only results via getLargeDiffRenderLimit (:1950-1992).
- Dedupe: `InFlightPromiseDedupe` around getDiff (status.ts:101, :1279-1298); SSH provider keeps its own dedupe cleared around EVERY mutation — stage/unstage/bulk :416-468, commit :193-204, checkout :488+ — key `stableInFlightKey(['diff', worktreePath, filePath, staged, compareAgainstHead])` (ssh-git-provider.ts:88, :398-414).
- Compare surfaces: `getBranchCompare` merge-base + ahead count `rev-list --count base..head` (status.ts:1820-1842); changed-file lists via parallel `diff --name-status -M -C` + `-z --numstat -M -C` (loadBranchChanges :1674-1710); root-commit handling via `diff-tree --root --no-commit-id` (:1712-1770); commit diff = two concurrent `show <oid>:<path>` spawns (:1611-1672).

### 3.3 Commit flow (+ AI message generation)

- IPC `git:commit` rejects empty messages, routes SSH→provider.commit, local→`commitChanges(worktreePath, message, gitOptions)` (filesystem.ts:1411-1436).
- `commitChanges` runs plain `['commit','-m',message]` — NO `--no-verify`, so repo hooks run normally; author comes from repo/git config (Fabrica sets none); stderr preferred for hook/GPG failure surfacing (status.ts:2095-2123).
- AI commit-message pipeline: context extraction `getStagedCommitContext` gathers `branch --show-current` + `diff --cached --name-status` summary plus optional full staged patch `diff --cached --patch --minimal --no-color --no-ext-diff` capped at `MAX_STAGED_COMMIT_CONTEXT_BYTES = 10 MB` with max-buffer degrade-to-summary (status.ts:72, :2049-2093). Handler `git:generateCommitMessage` injects linked-issue context (filesystem.ts:1438-1543, issue injection :1494-1497/:1525-1528). Prompt template renders `{branch}/{stagedFiles}/{stagedPatch}/{linkedIssue}` tokens; 60 s timeout, 4 MB output cap (text-generation/commit-message-text-generation.ts:1085-1118, :67-68, :589-609). Model discovery channel `git:discoverCommitMessageModels` (filesystem.ts:1561-1619).
- Stage/unstage: `add -- :(literal)<path>` / `restore --staged --` (status.ts:2015-2047); bulk variants chunked at `BULK_CHUNK_SIZE = 100` to avoid E2BIG (status.ts:73, :2306-2358); WSL gets POSIX backslash conversion inside literal pathspecs (:2176-2180). IPC handlers git:stage/unstage/bulkStage/bulkUnstage (filesystem.ts:2166-2308).
- Discard: containment check, tracked probe `ls-files --error-unmatch`, tracked→`restore --worktree --source=HEAD --`, untracked→safe `clean -ffdx -- :(literal)...` (status.ts:2128-2170, bulk :2236-2287); symlink safety lstat leaf-vs-parents with double-validate-before-mutate (shared/git-discard-path-safety.ts:74-129).

### 3.4 Branch operations

- Rename `['branch','-m',newBranch]` with upstream guard refusing published branches (probe-failed outcome kept retryable, issue #7808) and collision-safe `-2`,`-3` suffixing up to 100 attempts (branch-rename.ts:24-40, :57-83).
- Checkout: `assertValidBranchName` rejects `-`-prefixed names; `checkout <branch> --` under cache invalidation; listing via `for-each-ref --format=%(HEAD)%09%(refname:short) refs/heads/` current-first (checkout.ts:11-15, :25-34, :41-76); SSH parity mux requests (ssh-git-provider.ts:488-501).
- Agent-hook auto-rename: on first live agent `working` event, replaces FABRICA-generated creature branches (`you/Nautilus` style) with names generated from `{firstPrompt, assistantMessage}` — gated to auto-generated leaves only, never published branches, only Fabrica-created worktrees; display name + folder rename follow (agent-hooks/first-work-branch-rename.ts:71-132, :186-207, :225-303; generator commit-message-text-generation.ts:1210).

### 3.5 History / log

- Command: `log --format=<fmt> -z --topo-order --decorate=full -n<limit+1> <headOid>` (shared/git-history.ts:209-220); format `%H%n%aN%n%aE%n%at%n%ct%n%P%n%(decorate:prefix=,suffix=,separator=%x1f)%n%B` — unit separator \x1f between decorations because Git allows commas in ref names (shared/git-history-log-parser.ts:6-27).
- Parser: NUL-record iteration, SHA-1/SHA-256 hash regex, subject = first message line or "(no commit message)" (log-parser:100-134); decoration classification branches/remote/tags + HEAD aliasing (:18-77); remote-pill dedupe when local == remote commit (git-history-ref-display.ts:12-42).
- Graph: swimlane builder with first-parent lane color inheritance, rotating palette (shared/git-history-graph.ts:94-198); default limit 50, max 200 (git-history-types.ts:11-24). Boundary pseudo-commits "Incoming Changes"/"Outgoing Changes" synthesized between merge-base and refs (git-history-boundary-rows.ts:38-90, ids :5-6).

### 3.6 Repo detection & search

- Authoritative tri-state probe `rev-parse --is-inside-work-tree/--is-bare-repository` with fallback to a validated filesystem `.git` marker walk-up (warns once per session): real dir, `gitdir:` file, or bare shape HEAD+objects+refs (repo.ts:63-92, :218-294, :308-457).
- Repo root `rev-parse --show-toplevel` with marker fallback; linked-worktree detection via `--git-dir` ≠ `--git-common-dir` (repo.ts:134-202).
- Default base ref: verified `refs/remotes/origin/HEAD` symbolic-ref then ordered probe list (repo.ts:40, :496-526); base-ref search argv builder with legacy-exclude capability headroom (repo.ts:667-800); conflict kinds for create-time UX (:992-1022).
- Drift guard used before every orchestration dispatch: `getRemoteDrift` = `rev-list --left-right --count local...remote` returning `{ahead, behind}` or null (repo.ts:540-562); drift subjects feed worker preambles (`log --format=%s -n limit local..remote`, :568-587).

---


---

## 4. Worktree Support (the product primitive)

### 4.1 Creation flow end-to-end

- IPC entry `worktrees:create` (ipc/worktrees.ts:2186-2187, verified) → normalize linked-work-item fields (:2189), trace span `{stage:'create'}` (:2191), repo resolution (:2192-2195), dispatch by repo kind: folder→createFolderWorkspace / `repo.connectionId` set→SSH createRemoteWorktree / else createLocalWorktree (:2214-2218); telemetry + lifecycle event `onWorktreeLifecycle kind:'created'` with `{worktreeId, path, branch}` (:2231, :2244-2249). Optimistic warm-up `worktrees:prefetchCreateBase` (:2171-2179).
- Local creation (`createLocalWorktree`, ipc/worktree-remote.ts:1895): sanitized name + workspace root mirroring into `~/FABRICA/workspaces` inside WSL with traversal guard (ipc/worktree-logic.ts:24, :78, :100, :115-126; applied worktree-remote.ts:2183-2186).
- Base-ref selection: `resolveWorktreeCreateBase` (worktree-remote.ts:1929-1959) validates candidates via remote-tracking resolution + local existence probe `rev-parse --verify --quiet <ref>^{commit}` (git/worktree-base-ref-probe.ts:33-39); hard failure if nothing resolvable (worktree-remote.ts:1960-1965).
- Branch-name conflict loop with suffix attempts up to WORKTREE_CREATE_MAX_SUFFIX_ATTEMPTS; PR-conflict probing deferred to suffix > 1 to skip the ~1-3 s `gh pr list` (worktree-remote.ts:2093, :2100-2122, :2165-2181).
- Push-target pre-validation BEFORE add so failure can't leave a half-created worktree (worktree-remote.ts:2247-2257): reuse-or-add fork remote, unique remote names, fetch `+refs/heads/<b>:refs/remotes/<r>/<b>` (ipc/worktree-push-target-setup.ts:11-105); post-add upstream wiring `branch --set-upstream-to` (:113-124, called worktree-remote.ts:2360-2365).
- The actual `git worktree add`: existing branch mode `worktree add <path> <branch>`; new branch mode `worktree add --no-track -b <branch> <path> [<base>]` — `--no-track` prevents fake "behind by N" pre-publish status (git/worktree.ts:954-983, comment :958). Base ref qualified as refs/remotes/<n> then refs/heads/<n> (shared/worktree-base-ref.ts:3-25). Timeout `WORKTREE_ADD_TIMEOUT_MS = 180_000` bounds OneDrive cloud-placeholder stalls (worktree.ts:94-95, :985-989).
- Post-add side effects: persists lineage as git config `branch.<branch>.base` (worktree.ts:320-345, :995-997); sets `push.autoSetupRemote=true` in shared config when unset anywhere, SSH-parity noted (:999-1026). Optional local base refresh via CAS-style `update-ref <ref> <remoteOid> <localOid>` or `reset --hard` on owner worktree (:883-894).
- Sparse checkout (`addSparseWorktree`, worktree.ts:1033-1087): `add --no-checkout` → `sparse-checkout init --cone` → `sparse-checkout set -- <dirs>` → `checkout <branch>`; failure rolls back via removeWorktree(force, deleteBranch) with "(cleanup also failed...)" escalation (:1069-1083). Directory validation rejects absolute/`..` paths (ipc/sparse-checkout-directories.ts:7-29).
- `.worktreeinclude` copying: literal paths only (globs/negation skipped with warnings), bounds 256KB/1000 entries; only entries that exist in primary AND are gitignored get copied (git/worktree-include-file.ts:8-44, :128-129; invocation worktree-remote.ts:2474-2488).
- Shared directories & symlinks: per-user `repo.symlinkPaths` linked BEFORE setup scripts run so they see them (worktree-remote.ts:2453-2459); `FABRICA.yaml` `worktree.sharedDirectories` must exist in primary and be gitignored, merged additively with per-user setting (git/worktree-shared-directories.ts:53-110). Materialization engine modes `'link' | 'copy' | 'share'`, Windows junction-first candidates `['junction','dir']`, per-path failure isolation (ipc/worktree-symlinks.ts:36, :47-55, :349-350).
- APFS clone optimization (macOS same-volume): `/bin/df -P` + `diskutil info -plist` probes cached per volume; clone via `/bin/cp -c` (clonefile) with atomic publish for files, mkdir-reserve + `cp -n -c -R` for dirs; EEXIST → typed error; never used for `share` mode (ipc/worktree-apfs-clone.ts:15-96, :133-199; call sites worktree-symlinks.ts:31-35, :110-120); copy-budget guard blocks fallback full-copies escaping budget (`WorktreeCopyBudgetFallbackError`, worktree-symlinks.ts:90-97).
- Post-create reconciliation: re-list, find created row by path or exact `refs/heads/<branch>` match — handles Git canonicalizing symlinked paths (ipc/created-worktree-reconciliation.ts:3-17; worktree-remote.ts:2369-2377). **worktreeId minted**: `` `${repo.id}::${created.path}` `` (worktree-remote.ts:2380, verified). Fresh `instanceId = randomUUID()` defeats id-reuse lineage attachment (:2385-2443). Filesystem-auth roots registered eagerly to avoid macOS privacy prompts (:2447-2451). Setup hook prep reads the CREATED worktree's own FABRICA.yaml as authoritative (:2492-2533); startup/setup terminals spawned (:2535-2545).
- SSH variant dedupes base fetches with a 30 s freshness window and serial queues (worktree-remote.ts:139, :449-518); SSH root registration via multiplexer RPC `session.registerRoot` with request→notify fallback (ipc/ssh-worktree-create-root-registration.ts:11-49).

### 4.2 Removal flow

- `worktrees:remove` spans ipc/worktrees.ts:2359-2984: in-flight de-dup map shares identical removals (:2357, :2371-2377); folder repos do a PTY sweep then metadata purge (:2390-2421); git repos re-derive canonical path from git listing before destructive action (:2429-2446); orphaned/Fabrica-leftover/manually-deleted paths handled through three safety gates, else refuse (:2447-2629).
- Gates: lock assertion pre-mutation, re-checked after archive hooks (:2634-2641, :2797-2804); archive hook runs while directory intact (:2685-2712); cleanliness preflight tolerates Fabrica-created shared-link symlinks by filtering `?? <tolerated>` entries from `-z` porcelain parse (worktrees.ts:2809-2825; git/worktree.ts:1435-1495); strict PTY teardown `requirePhysicalStop: true` before any destructive FS action, `allowUnverifiedStop` reserved for explicit Force Delete (#11960) (worktrees.ts:163-195, :156-157/:182-185); linked-path unlink removes only symlinks, never user files (worktree-symlinks.ts:363-384, :396-399).
- Core `removeWorktree` (git/worktree.ts:1112-1180): **deferred removal for large trees** renames the checkout into sibling trash dir `.fabrica-worktree-trash/wt-<ts>-<hex>` (worktree-trash.ts:14-47), clears Git registration for the now-missing path (`worktree remove --force` accepting missing dirs back to Git 2.25 baseline, falling back to `worktree prune` + verification the row is gone, worktree.ts:1225-1256), restores from trash if deregistration fails (:1214-1220), then schedules bounded background multi-GB deletion (`TRASH_SWEEP_MAX_CONTAINERS = 200`) (worktree-trash.ts:20, :78-86). Inline fallback plain `worktree remove [--force]`; submodule refusal re-proven clean then forced (:1148-1164). Windows transient-failure recovery path re-runs recursive delete after deregistration (worktrees.ts:2872-2886); orphaned-error path does safe dir cleanup + explicit prune (:2887-2934).
- Branch cleanup: `-d` default, `-D` only for failed-creation rollback; "checked out" error prunes stale registrations once and retries; squash-merge recovery proves no unmerged tree changes before force delete; CAS force-delete via `update-ref -d refs/heads/<b> <expectedHead>` guards stale-toast races; unmerged branches preserved and reported as `preservedBranch` (worktree.ts:1177-1179, :1298-1419).

### 4.3 Listing & metadata

- Porcelain parser handles bare/sparse/locked(+reason)/prunable(+reason), NUL-delimited split (worktree.ts:479-575). z-format gated behind capability `worktree-list-z`; Git < 2.36 falls back to line format with concurrent ENOENT stat backstop for `prunable`, concurrency cap 92 (:577-659).
- Main-worktree path normalization under WSL/separate-git-dir via `rev-parse --path-format=absolute --show-toplevel --git-common-dir` with old-git echo fallback (:408-474).
- Scan coalescing keyed `repoPath\0wslDistro\0timeout\0generation`; mutations bump generation so listings never join stale scans (:712-770).
- Sparse detection filesystem-only: stats `<gitdir>/info/sparse-checkout` (no subprocess), then confirms `core.sparseCheckout` enabled in shared `config` + worktree-scoped `config.worktree` gated on `extensions.worktreeConfig`, in-house flag parser (:1507-1576).
- Renderer-facing merge `mergeWorktree(repoId, git, meta)` builds id `${repoId}::${path}`, display-name precedence meta.displayName > short branch > default > basename(path) (ipc/worktree-metadata-merge.ts:10-76).

### 4.4 Worktree ↔ agent-session coupling

- PTY panes scoped by `(connectionId, worktreeId, paneKey)` composite keys; stable-pane ownership resolved against runtime + persisted state; per-worktree terminal tabs `session.tabsByWorktree[worktreeId]` (pty.ts:564-568, :683-758, :663-664).
- Runtime service keys agent/terminal state by worktreeId (runtime/fabrica-runtime.ts:1291, :1627-1665, :1849-1865).
- Removal fences agent processes first: killAllProcessesForWorktree sweeps runtime/provider/registry terminals before any destructive FS action; host-fenced ids prevent cross-host collateral (worktrees.ts:173-187, comments :175-179/:2390-2394).

### 4.5 Worktree IPC inventory (ipc/worktrees.ts)

| Channel | Line |
|---|---|
| worktrees:listAll | 1837 |
| worktrees:list | 1900 |
| worktrees:listKnownForExecutionHost | 1962 |
| worktrees:forgetRemovedForExecutionHost | 2025 |
| worktrees:listDetected | 2067 |
| worktrees:cancelListDetected | 2164-2165 |
| worktrees:prefetchCreateBase | 2171-2172 |
| worktrees:create | 2186-2187 |
| worktrees:resolvePrBase | 2256-2257 |
| worktrees:resolveMrBase | 2332-2333 |
| worktrees:remove | 2359-2360 |
| worktrees:forgetLocal | 2989-2990 |
| worktrees:forceDeletePreservedBranch | 3083-3084 |
| worktrees:updateMeta | 3154-3155 |
| worktrees:listLineage | 3176 |
| worktrees:listLineageForHost | 3184-3185 |
| worktrees:updateLineage | 3190-3191 |
| worktrees:persistSortOrder | 3207 |
| worktrees:getBranchRenameFailureOutput | 3222-3223 |

(Same file also registers hooks:* handlers at :3233-3436.)

---

## 5. Remotes, Fetch/Push, Upstream

### 5.1 Remote URL probing & classification

- Primitive `readRemoteUrl(context, remoteName)` (git/remote-url-probe.ts:28-48): routes through an SSH provider when `context.connectionId` set (:32-41), otherwise `git remote get-url` via gitExecFileAsync (:42-47). Hard deadline `REMOTE_URL_PROBE_TIMEOUT_MS = 30_000` (:19, verified) — a local config read; only a wedged host/WSL interop can outlast it.
- Transient classification `isTransientGitProbeError` (:63-91): AbortError by name, else pattern match on message+stderr+code against timeouts/ECONNRESET/EPIPE/etc. (:50-56); a transient failure "says nothing about the remote" and must NOT be cached (:58-62). `assertRemoteUrlReadable` rethrows only transient errors so callers distinguish cacheable "no such remote" from "never got to ask" (:99-113).
- Probe cache factory `createRemoteRefProbeCache<Ref>(parseRemoteUrl)` (remote-ref-probe-cache.ts:41-143): positives cached forever; negatives expire after 5 min (`NEGATIVE_ENTRY_TTL_MS`, :22, :47-51) so a remote added mid-session is picked up; bounded 512 entries (:12); in-flight dedupe via runCoalescedProbe (:131-133); stale probes can't publish (`ownsKey()`, :69-76); stable-missing detection matches `/no such remote/i` (stable-missing-git-remote-error.ts:1-16). Per-forge instances: bitbucket/repository-ref.ts:1,12; azure-devops/repository-ref.ts:1,16.
- Provider classification: `parseHostedRemote` (hosted-remote-url.ts:60-89) is a scoped local fork of hosted-git-info@9.0.3 (:1-3) handling shorthand `github:`/`gitlab:`/`bitbucket:` (:17-21), scp-like `git@host:path` (:69-76), protocols (:78-88); host normalization maps `ssh.github.com`→github.com (:25-29). Azure DevOps has its own `_git` path parser (azure-devops/repository-ref.ts:3-60).
- Canonical identity: `normalizeGitRemoteUrl` yields host/path key rejecting local filesystem remotes (shared/git-remote-identity.ts:24-52); primary remote priority upstream > origin > others, alphabetical tiebreak (:74-82). Persisted identities enriched lazily with settled-null markers and 5-min retry TTL (main/repo-git-remote-identity-enrichment.ts:4, :54-59, :87-94, :111-118).

### 5.2 Preferred remote selection

- Strict picker prefers origin, then a lone remote; throws on zero; refuses to guess among multiples — fork PR/MR heads live on the hosting remote (shared/preferred-git-remote.ts:1-16).
- gh-login gate candidate order: current branch's configured remote → default branch's remote → default-base remote → origin → lone remote; each must parse as provider github; a GitLab-primary repo with GitHub mirror must not adopt the GitHub account name (git/git-username.ts:254-260, :261-292).
- Fork push safety: gitPush uses the branch's CONFIGURED push target instead of hardcoding origin (PR-created worktrees may track contributor forks) — resolution order `branch.<n>.pushRemote` > `remote.pushDefault` > `branch.<n>.remote`, URL-valued remotes normalized back to names, inheriting origin/main merge targets through pushDefault forks blocked (git/remote.ts:71-73, :80-111, :124-143, :159-173, :189-207).
- Fork sync: requires both origin and upstream; verifies upstream matches expected owner/repo; resolves upstream default branch via `ls-remote --symref` with main/master fallbacks; refuses if diverged; else fast-forwards origin by pushing upstream OID (shared/git-fork-sync.ts:238-304, blocked-reasons enum :5-11); main wrapper adds 60 s timeout + cancel composition (git/fork-sync.ts:11-34).

### 5.3 Fetch / push flows & throttling

- `gitFetch` = `fetch --prune [remote]` with validated push target (remote.ts:296-314); `gitPush` validates target, always `--set-upstream`, optional `--force-with-lease` (:179-212); pull follows effective upstream with divergence fallback `runPullWithDivergenceFallback` (:232-294).
- Auto-maintenance suppression at network gates: inline `-c maintenance.auto=false -c maintenance.commit-graph.auto=0 -c gc.auto=0` because Git 2.29 could auto-run commit-graph work before maintenance.auto gated it (shared/git-fetch-auto-maintenance.ts:1-10); used at exact-base fetch gate fabrica-runtime.ts:23276-23292.
- Fetch freshness/throttle machinery (fabrica-runtime.ts): `FETCH_FRESHNESS_MS = 30_000`, `REMOTE_FETCH_TIMEOUT_MS = 60_000` (:35388-35390); canonical fetch key resolves to the repo's git COMMON dir so worktree polls share one cache with creates (:23126-23163); per-remote serial queue (:23165-23178); in-flight promise sharing (:23197-23246); success-only timestamping; inflight evicted on both success and rejection to avoid wedging creates (F2 bug fix :23238-23243); GCM-first-auth hang bounded by timeout (STA-1292, :23221-23223).
- gh rate-limit breaker: global circuit keyed `scope\0bucket` (scope = `${runtime}:${host}`, buckets core/search/graphql); fallback blocks search 70 s / core+graphql 5 min refined by an exempt reset probe; bucket classified from argv; bounded 1024 entries (git/gh-rate-limit-breaker.ts:15-32, :22-26, :102-132, :143-205). Runner integration: pre-spawn check fails fast while blocked with crafted rate_limited classification (:1595-1613, breaker :219-231), notify-on-403 (:1653-1655).
- Fetch error classification: missing remote ref is authoritative-negative (fetch-error-classification.ts:3-10); transient allowlist covers transport death only — auth failures/deleted heads must surface (:12-43).

### 5.4 Error normalization (user-facing)

- Credential scrubbing FIRST: strips user:password@ on any scheme and lone token user@ on HTTP(S) only; SSH git@host preserved (shared/git-remote-error.ts:3-5, :21-23).
- Classification table normalizeGitErrorMessage (:119-178): submodule push failures (:127-129); non-fast-forward → actionable guidance (:133-138); pre-push hook output surfaced verbatim (:140-143); auth errors → "Authentication failed. Check your remote credentials." (:145-147); network errors → "Network error..." (:149-151); divergent-pull policy guidance (:157-163); fallthrough = last non-empty stderr line only to avoid leaking paths/env (:45-54, :176-177).
- Clone failure mapping scrubs credentials first (clone errors echo the typed URL — likeliest place for a live token), takes bottom-most fatal:/error: line, special-cases destination-exists into actionable advice (shared/git-clone-failure-message.ts:3-68); call sites ipc/repos.ts:546/:2441, relay git-handler.ts:1312, fabrica-runtime.ts:18976.

### 5.5 Upstream tracking

- Effective-upstream chain (shared/git-effective-upstream.ts:118-183): configured HEAD@{u} (with ambiguous origin/* re-split longest-match against known remotes :124-135); legacy-Fabrica fix where branch tracks origin/main but pushes origin/<current> (:141-155); URL-valued branch remotes with merge targets Git cannot resolve (:160-171); fallback origin/<current-branch>; else null.
- Status assembly reports hasConfiguredPushTarget even with no upstream (git-effective-upstream.ts:191-214; shared/git-configured-branch-target.ts:85-121); ahead/behind via single rev-list left-right count (:227-247).
- Publish-target status verifies refs/remotes/<remote>/<branch>, discriminating missing-ref (empty stderr + exit 1) from real failures (shared/git-publish-target-status.ts:11-70); patch-equivalence probe `log --cherry-mark --right-only HEAD...<upstream>` (git/upstream.ts:20-36; parser shared/git-upstream-status.ts:3-16); derived predicates: diverged-but-patch-equivalent ⇒ force-push-with-lease (:39-48); behind-only ⇒ auto-prepare eligibility (:50-55).

---



---

## 6. Credential Handling

### 6.1 Non-interactivity guard env

- `gitCredentialPromptGuardEnv(env, platform)` (shared/git-credential-prompt-env.ts:85-115): sets `GIT_TERMINAL_PROMPT: '0'` (:92); empties `GIT_ASKPASS`/`SSH_ASKPASS` ONLY when unset so caller-provided askpass programs are preserved (:93-94); sets `GCM_INTERACTIVE: 'never'` because GCM can ignore terminal/askpass guards and open its own GUI (:95-96); appends Git indexed-config entries `credential.interactive=false`, `credential.guiPrompt=false` via the GIT_CONFIG_COUNT/KEY_n/VALUE_n protocol (:100-103) — credential helper kept INTACT so cached credentials keep working (:98-99); win32 forwards all of it into WSL via WSLENV (:105-113). Indexed-config protocol helpers do atomic merge with count/index consistency validation and non-clobbering append (:7-79).

### 6.2 Runner-level env composition

- `promptGuardGitEnv` = guard + untranslated-English locale pins for parsers (runner.ts:752-757); `promptGuardShellEnv` without locale pins for PTY/hook shells (:760-769).
- `nonInteractiveGitEnv` adds `GIT_SSH_COMMAND='ssh -o BatchMode=yes'` (SSH fails instead of prompting, doesn't change host trust) only when the caller hasn't set its own; forwarded into WSL only when Fabrica set it itself so Windows-specific values never leak into Linux git (runner.ts:771-795; applied :978, :1132). Documented contract cites issue #5308 headless wedge.

### 6.3 Terminal/PTY credential guard — selective by process identity

- Shared policy `applyTerminalGitCredentialPromptGuard` (shared/terminal-git-credential-guard.ts:10-54): applies ONLY to recognized agent processes (`includeHeadlessOneShot:true`) or unattended launches, or when policy env var `FABRICA_INTERNAL_TERMINAL_GIT_CREDENTIAL_GUARD_POLICY === 'guard'` is inherited (:6-7, :20-28). **User terminals keep normal Git behavior.**
- Main-process PTY spawn calls it with launchCommand hint + `isUnattended: opts.launchAgent !== undefined`; comment: "unattended agents must fail instead of looping on OS credential prompts" (pty.ts:1714-1719, verified).
- Relay PTY handler (SSH PTYs bypass main's env builder) applies the guard after relay merges its authoritative env (relay/pty-handler.ts:1464-1470); relay agent-exec handler likewise (relay/agent-exec-handler.ts:157). Deferred mode writes only scalar/non-GIT_CONFIG keys, skipping WSLENV and askpass keys not already present (guard file :38-53).

### 6.4 No token injection exists

- Grep across src/main found NO `http.extraHeader`, no embedded-token rewriting, no credential-helper installation. Auth relies entirely on ambient setup: OS credential store/GCM (kept functional but non-interactive), SSH keys/agents, or tokens already embedded in remote URLs.
- Defensive layer is error redaction instead: stripCredentialsFromMessage (git-remote-error.ts:21-23), clone-failure scrubbing (git-clone-failure-message.ts:9-13), branch-rename probe messages (git/branch-rename.ts:34).
- SSH username resolution can't rely on local gh for remote-host repos (git-username.ts:89-103). gh login probing: explicit config first, then `gh api user -q .login` / `gh auth status` fallback with 2.5 s exec timeout under 10 s wall clock, per-process login cache + 5-min retry cooldown after timeouts, multi-account ACTIVE-account parsing (git-username.ts:8, :17, :108-124, :126-220, :301-324).
- gh CLI fallbacks: WSL→host when missing in distro (runner.ts:159-182), host→default-distro WSL when gh.exe ENOENT (:1656-1673).

---

## 7. Git-Related IPC Channels (inventory)

Beyond the worktree table (§4.5):

| Channel | Handler location | Purpose |
|---|---|---|
| git:commit | filesystem.ts:1411-1436 | commit staged changes (local or SSH provider) |
| git:generateCommitMessage | filesystem.ts:1438-1543 | AI commit message from staged context |
| git:discoverCommitMessageModels | filesystem.ts:1561-1619 | model discovery for commit messages |
| git:stage / git:unstage | filesystem.ts:2166-2188 / :2190-2212 | index mutations |
| git:bulkStage / git:bulkUnstage | filesystem.ts:2262-2284 / :2286-2308 | chunked bulk ops |
| git:discard / git:bulkDiscard | filesystem.ts:2214-2236 / :2238-2260 | restore/clean based discard |
| git:setStatusUpstreamRefWatch | filesystem.ts:1208-1212 (via preload/index.ts:3316-3323) | bind/unbind upstream-ref watch binding |
| git status/upstream reads | filesystem.ts ~1150-1240 region (getStatus etc.) | status pipeline entry |
| repos:* (add/create/clone/detect/search...) | ipc/repos.ts (101KB; handlers registered ~1312-2730) | repo registration, clone, remote ops |
| worktrees:* (19 channels) | ipc/worktrees.ts (§4.5) | full worktree lifecycle |
| github:* / gitlab:* | ipc/github.ts (40KB) / ipc/gitlab.ts (18KB) | forge API integration (PR/MR, checks) |
| source-control-ai-linked-issue | ipc/source-control-ai-linked-issue.ts | linked-issue context for commits |
| workspace-cleanup-git-evidence | ipc/workspace-cleanup-git-evidence.ts | cleanup safety evidence |

Renderer-side push events (main → renderer): `worktrees:changed`, `worktrees:gitStatusMetadataChanged`, `worktrees:headIdentitiesChanged` emitted from the debounced notification scheduler (worktree-base-directory-notifications.ts:32-77; emitters at :65-76). Renderer consumption: components subscribe via window.api.worktrees.onGitStatusMetadataChanged / onChanged to trigger immediate fetchStatus() for visible repos only; app-level listeners feed a serialized per-repo refresh queue (git-status-push-signal-refresh.ts:36-57; useIpcEvents.ts:1086-1119; queue semantics ipc/worktree-change-refresh-queue.ts:46-114).

---

## 8. File-Watch ↔ Git State Integration

### 8.1 Watch architecture

- Two watch targets per repo: the workspace BASE directory (detecting new/deleted repos+worktrees) and the shared `.git` directory (git-common target) (ipc/worktree-base-directory-watch-targets.ts; watcher assembly ipc/worktree-base-directory-watcher.ts).
- `@parcel/watcher@^2.5.6` IS a dependency (package.json, verified) but for these paths native recursive watching is deliberately avoided:
  - Local base target = PURE POLLER, no native watcher at all: "recursive FSEvents over the whole workspace root forced fseventsd to deliver everything just to observe shallow paths" (worktree-base-directory-poller.ts:74-81, :164-167 comment refs, poll loop startBasePoller :203-353). Cadence 2 s (`WORKTREE_BASE_POLL_INTERVAL_MS`, :82) with dir stat-signature gating (mtimeMs:ctimeMs:ino, :95-97) sampled BEFORE listing; ungated backstop scan every 15 ticks (~30 s, :87, :276-278); pending-marker probes for new dirs awaiting `.git` up to 300 ticks (:93, :252-272).
  - git-common target: macOS runs a NARROW @parcel/watcher stream rooted at `<common>/.git/worktrees` INSIDE a crash-isolated watcher child process ("watcher.node teardown races heap-corrupt the hosting process", issue #8732) PLUS a primary-metadata stat poll of HEAD/packed-refs/index/config/config.worktree/logs/HEAD (ipc/worktree-git-common-watch.ts:24-27, :29-252, :168-216; polling lists worktree-git-common-polling.ts:18-25, :75-148). Other platforms = pure snapshot-diff polling because "an open directory handle on worktrees/ could interfere with git worktree prune" on Windows (watch comments :21-23; polling :221-320). The worktrees dir is readdir'd EVERY tick because signature gating misses same-granule add+remove (#9882, :85-89).
  - Remote (SSH): provider.watch subscription; overflow events collapse to full structural refresh (watcher :105-108, :143-162; collector :85-104).

### 8.2 Event classification (what maps to which tier)

(ipc/worktree-base-directory-event-filter.ts)
- Base target: only `<wt>/.git` completion markers (:62-72) and worktree-root deletes (:49-58) are structural; deeper churn ignored (:217-222).
- git-common target (:170-215):
  - Top-level `worktrees` dir or HEAD/packed-refs/config.worktree writes → STRUCTURAL (:103, :179-185).
  - Top-level index/config writes → gitStatus tier (:107, :186-188).
  - Linked-entry files HEAD/gitdir/locked/config.worktree → structural; index → status (:108-109).
  - Any logs/HEAD write → headIdentity tier ONLY — "an index rewrite cannot move HEAD" (:14-17, :111-117, :192-193).
  - Only the BOUND active upstream ref crosses the refs/** cutoff, matched against `target.gitStatusRefPaths` (:119-132).

### 8.3 Invalidation & notification flow

FS event → classifyWorktreeBaseChange → collectLocalWorktreeBaseChanges (worktree-base-directory-change-collector.ts:74-83) → hasCollectedWorktreeBaseChanges → scheduleWorktreeBaseNotification (watcher :84-87) → notifications debounce 250 ms (`WATCH_DEBOUNCE_MS`, worktree-base-directory-notifications.ts:20, verified) merging buckets; structural wins suppress redundant status/head pushes for the same repo (:56-63) → emit `worktrees:changed` / `worktrees:gitStatusMetadataChanged` / `worktrees:headIdentitiesChanged` (:65-76).
- Index/status churn does NOT directly invalidate caches — it emits gitStatusMetadataChanged as a freshness hint for the renderer to re-fetch git:status (worktree-remote.ts:1456 comment).
- A `config` write aborts and clears active upstream-ref resolution for re-resolution (ipc/worktree-git-status-ref-watch.ts:164-192).
- Watcher failure/remote overflow ⇒ full structural fanout per watch, throttled by a 60 s cooldown per watch (worktree-watcher-failure-refresh-cooldown.ts:1-16; used watcher :70-78).

### 8.4 HEAD identity reader (spawn-free)

`readGitCommonHeadIdentities` (ipc/worktree-head-identity-reader.ts:108-161) reads `.git` metadata files DIRECTLY — no git subprocess, no mtime probing: "the whole point of this reader is replacing `git worktree list` fanout ... Keep it spawn-free" (:5-7, verified). Primary checkout reads `<common>/HEAD` (:118-127); linked worktrees enumerate `<common>/worktrees/*/` reading each `gitdir` file to map back to checkout paths (:130-158); HEAD parse follows symref chains (max depth 5) through loose refs falling back to packed-refs, else detached OID (:20-55, :81-102); ref-name safety validation rejects `\`,`:`,`..` (:42-47); OIDs must be SHA-1/SHA-256 hex (:51-55); partial reads never overwrite store state (:94-107). mtime signatures are only the TRIGGER; actual head contents are diffed against a subscribe-time baseline so only true moves emit (watcher :191-196; ipc/worktree-head-identity-refresh.ts:41-77 single-flight with queued follow-up + baseline diffing).

### 8.5 Upstream-ref watch binding lifecycle

1. Source Control hook publishes after each successful status fetch → `window.api.git.setStatusUpstreamRefWatch({worktreeId, worktreePath, executionHostId, connectionId?, branch?, upstreamName?})` (renderer use-git-status-upstream-ref-watch.ts:22-43; runtime-git-client.ts:191-207; local targets only, web build no-op :196-198/:2081).
2. Main resolves the tracking ref (15 s timeout) into the singleton `activeBinding`; matching watches gain the exact ref path in their `gitStatusRefPaths` set (ipc/git-status-upstream-ref-watch-request.ts:35-77; watcher :55-60; worktree-git-status-ref-watch.ts:70-162; one binding process-wide, new request aborts prior resolution :124-126; failed resolutions retried after 5 min :43, :155-159).
3. Unbind = same API invoked WITHOUT branch/upstreamName → clearResolutionForWorktree aborts controller and re-applies empty ref paths (use-git-status-upstream-ref-watch.ts:54-71; worktree-git-status-ref-watch.ts:83-116).
4. Teardown on window close clears all watches + binding (watcher :280-286, :312-322).

### 8.6 Efficiency measures

- Window-hidden parking: pollers stop ticking while main window hidden and force full-scan diff on reveal; never-shown windows stay live for headless/E2E (poller.ts:34-55, :300-339; same pattern git-common-polling.ts:248-306, git-common-watch.ts:106-136).
- Wall-clock jump clamps on tick scheduling (NTP) (poller.ts:319-327).
- Watch-target sync rebuilds debounced 100 ms with generation counter against stale async syncs; triggered at startup (attach-main-window-services.ts:118), after repo mutations (repos.ts:2725) and settings changes (settings.ts:235) (watcher :52-53, :214-270, :289-303).
- Renderer dedupes identical adjacent repo scans while keeping host-routing variants separate (worktree-change-refresh-queue.ts:92-108).

---

## 9. Forge Integration Context (adjacent, not core git)

- GitHub/GitLab/Azure/Bitbucket clients exist as separate IPC surfaces (ipc/github.ts 40KB, ipc/gitlab.ts 18KB, azure-devops/client.ts, bitbucket/client.ts) plus shared link detection (terminal-github-pr-link-detector.ts) and PR-for-branch outcome logic (shared/github-pr-for-branch-outcome.ts). These consume git remote identity (§5) rather than executing git themselves. Documented here as boundary context only; deep scan out of R4-1.12 scope.

---

## 10. Relevance to CLI-Agent Management Transformation

Fabrica's stated direction is a desktop CLI-agent management & operations platform. This subsystem is arguably its most transferable asset:

1. **Worktree-per-agent is already the substrate.** One worktree = one agent workspace with minted IDs (`${repo.id}::${path}`, worktree-remote.ts:2380), PTY pane scoping by `(connectionId, worktreeId, paneKey)` (pty.ts:564-568), runtime state keyed by worktreeId (fabrica-runtime.ts:1291), and removal fenced by agent-process sweeps (worktrees.ts:173-187). A multi-agent product needs exactly this isolation primitive; the create flow (base-ref resolution, fork push targets, sparse checkout, include-file secrets copying, setup-script terminals) is production-hardened around agent workflows.
2. **Agent-aware credential guarding** is unique among the three repos: interactive git prompts are blocked selectively for recognized AGENT processes while user terminals keep normal behavior (shared/terminal-git-credential-guard.ts:10-54; pty.ts:1714-1719). This solves the classic unattended-agent-hangs-on-auth-prompt problem (#5308) — directly reusable for any managed CLI-agent fleet.
3. **Drift-guarded orchestration dispatch**: before every dispatch the runtime checks ahead/behind drift vs remote and injects drift subjects into worker preambles (repo.ts:540-587) — an agent-coordination feature living inside the git layer.
4. **Agent-driven branch naming**: first-work auto-rename converts creature branches into prompt-derived names gated on unpublished/auto-generated state (first-work-branch-rename.ts) — a UX pattern for agent-workspace naming at scale.
5. **Spawn-free git-state watching** (HEAD/index file readers + tiered classification + 250 ms coalesced pushes) is what keeps UI fresh while dozens of agent PTYs hammer the same repos without process-storm collapse — the exact scaling problem of a fleet manager.
6. **Non-interactive execution discipline** (locale pinning for parser stability, tree-kill ownership over wsl.exe, maxBuffer parity with relay, capability fallback ladders) is a reusable contract for any tool-execution plane, not just git.

---

## 11. Scan-Coverage Statement

**Scanned (fully read):**
- main/git/runner.ts (~1838 lines), exec-error.ts, max-buffer-overflow.ts, git-runtime-options.ts, git-capability-state.ts, coalesced-probe.ts, remote-ref-probe-cache.ts, remote-url-probe.ts, hosted-remote-url.ts, stable-missing-git-remote-error.ts, fetch-error-classification.ts, fork-sync.ts, push-target-validation.ts, upstream.ts, git-username.ts, gh-rate-limit-breaker.ts, review-head-remote-identity.ts, branch-rename.ts, checkout.ts, commit-object-ref.ts, compare-base-ref-fetch.ts, history.ts, huge-folder-ignore.ts, porcelain-v1-records.ts, check-ignored-paths.ts, status-upstream-ref.ts, wsl-git-read-environment.ts, wsl-linked-worktree-git-routing.ts
- main/git/status.ts (structure via export grep + key bodies verbatim: lease/cache section 1-300, numstat/line-stats 455-680, upstream probe 700-930, diff/compare family 1279-1990, stage/discard/commit 2000-2400)
- main/git/repo.ts (structure grep + detection/default-base/drift sections 63-211, 408-604, 667-800)
- main/git/worktree.ts (all 1639 lines)
- shared/: preferred-git-remote, git-remote-identity, git-remote-error, git-remote-branch-name, git-push-target-validation, git-publish-target-status, git-fork-sync, git-upstream-status, git-effective-upstream, git-configured-branch-target, git-credential-prompt-env, terminal-git-credential-guard, git-clone-failure-message, git-check-ignore-stdio, git-config-snapshot-runner, git-fetch-auto-maintenance, git-output-locale, git-exec-mutation, git-capability-cache, git-ref-command-capabilities, git-worktree-command-capabilities, git-merge-tree-capability, git-status-types, git-status-porcelain-parser, git-status-limit, git-uncommitted-line-stats, git-status-line-stats-cache, git-status-line-stats-write-token, git-status-read-lease-owner, git-status-upstream-ref, git-rev-list-output, git-cquoted-path, git-discard-path-safety, git-history, git-history-types, git-history-log-parser, git-history-graph, git-history-boundary-rows, git-history-ref-display, quick-open-git-entry-classification, worktree-base-ref
- main/providers/: ssh-git-dispatch.ts, ssh-git-provider.ts (dedupe/diff/commit/stage/env sections)
- main/ipc/: worktrees.ts (handler inventory + create/remove bodies 163-195, 2160-2984; listAll/list bodies not read in detail), worktree-remote.ts (createLocalWorktree 1895-2572 fully; createRemoteWorktree structure only), worktree-base-directory-{watcher,poller,watch-targets,event-filter,notifications,change-collector}.ts (full), worktree-change-invalidators.ts, worktree-watcher-failure-refresh-cooldown.ts, worktree-git-common-{watch,polling,primary-polling}.ts (full), worktree-git-status-ref-watch.ts, worktree-head-identity-{reader,refresh}.ts, worktree-{logic,common-git-directory,metadata-merge,symlinks(1-120+306-405),apfs-clone,push-target-setup,push-target-cleanup,created-worktree-reconciliation,ssh-worktree-create-root-registration,local-worktree-runtime-options,workspace-cleanup-git-evidence,sparse-checkout-directories}.ts, git-status-upstream-ref-watch-request.ts, filesystem-search-git.ts, filesystem-list-files-git-fallback.ts, filesystem.ts (git/stage/discard/commit/generate-message handlers), register-core-handlers.ts, terminal-git-credential-guard.ts
- renderer/src/runtime/runtime-git-client.ts (context type 1-140), use-git-status-upstream-ref-watch.ts, git-status-push-signal-refresh.ts, worktree-change-refresh-queue.ts, useIpcEvents.ts:1060-1140
- relay/pty-handler.ts:1455-1484, relay/agent-exec-handler.ts:157 (guard call sites)
- text-generation/commit-message-text-generation.ts (structure + generateCommitMessageFromContext + branch-name generator)
- package.json (dependencies section — git-library absence verified)

**Scanned (targeted/partial):** fabrica-runtime.ts (fetch-throttle 23126-23294, 35388-35390; worktreeId keying greps; clone call site), pty.ts (guard call site 1690-1739; pane-scoping lines), ipc/repos.ts + ipc/worktrees.ts remaining bulk (handler names via regex extraction, bodies skipped), worktree-remote.ts SSH-create body, preload/index.ts (worktrees/git sections), web-preload-api.ts stub line.

**Skipped:** all *.test.ts (incl. worktrees.test.ts 364KB, status.test.ts 93KB, remove-worktree.test.ts 54KB — consulted only for import evidence), ipc/github.ts + ipc/gitlab.ts bodies (boundary context §9), forge API clients' internals (azure-devops/bitbucket beyond repository-ref), parcel-watcher supervisor internals beyond call sites, mobile/, out/ build output, node_modules. Remaining ~1900 lines of status.ts tail and small test-hook getters; runner.ts SSH-policy internals partially covered.

**Citation verification:** 12 spot-checked cites returned exact matches during authoring (worktrees.ts:2186-2187; worktree-head-identity-reader.ts:5-7; worktree-base-directory-notifications.ts:20/:65-70; pty.ts:1714-1719; runner.ts:305-306/:1269; status.ts:303-313; remote-url-probe.ts:19; worktree-remote.ts:2380; git-capability-cache.ts:3/:5-10; package.json deps).

No source files were modified anywhere in Fabrica-app or _sources/.

