# FA Multi-Instance / Dev-Instance-Identity / Environment-Separation — Line-Level Deep Dive (R5-1.1)

> Task: ATLAS R5-1.1 (Group 1 Round 5). READ-ONLY deep dive of `Fabrica-app/` multi-instance
> architecture: single-instance locks, dev-vs-prod identity, per-instance data-dir/profile
> separation, port/IPC namespace isolation, and what breaks or leaks between instances.
> Scope discipline: goes DEEPER on instance isolation only; does NOT repeat the userData-chain
> inventory already documented in `discovery/round4/fa-settings-config-datadirs.md` §2–§3 or the
> auth planes in `fa-auth-onboarding.md` — those are cited where relevant, not restated.

---

## 1. Executive Summary

Fabrica-app supports **exactly one packaged desktop instance per OS user**, enforced by an
Electron `requestSingleInstanceLock` whose lock identity is **derived from the `userData`
path** (`src/main/startup/single-instance-lock.ts:36-38`). That single design decision is the
root of the entire isolation model:

1. **Namespace unit = userData directory.** Everything instance-scoped hangs off it: the RPC
   bootstrap file `FABRICA-runtime.json` (`src/shared/runtime-bootstrap.ts:45-48`), the Unix
   socket `o-<pid>-<suffix>.sock` (`src/main/runtime/runtime-rpc.ts:1800-1803`), the PTY daemon
   directory `<userData>/daemon` (`src/main/daemon/daemon-init.ts:104-108`), the agent-hook
   endpoint dir `<userData>/agent-hooks[/<namespace>]`
   (`src/main/agent-hooks/server.ts:2093-2100`), the mobile WS fallback-port file
   (`src/main/runtime/rpc/ws-fallback-port-store.ts:12,20`), the profile store
   (`src/main/fabrica-profiles/profile-storage-paths.ts:26-46`), and the main settings store
   (`src/main/persistence.ts:343-352`).
2. **Dev deliberately breaks the lock.** `shouldSkipSingleInstanceLock` returns true whenever
   `isDev && !isServeMode` and `FABRICA_E2E_ENFORCE_SINGLE_INSTANCE_LOCK !== '1'`
   (`single-instance-lock.ts:67-74`); the reason given at `src/main/index.ts:784` is that
   parallel `pnpm dev` runs from multiple worktrees would make the second launch exit silently.
   Consequence: **all parallel dev instances share ONE userData** (`<appData>/fabrica-dev`,
   `src/main/startup/configure-process.ts:170`) and rely on narrower seams — chiefly the
   per-repo-root `appUserModelId` hash used to namespace agent-hook endpoint files
   (`index.ts:631-634`, `dev-instance-identity.ts:43-49`, `server.ts:2095-2097`).
3. **Discovery metadata is single-pointer-per-profile.** The CLI finds the app through one file;
   a dead-pid record is reclaimed by a 10 s ownership watch
   (`src/main/runtime/runtime-metadata-ownership-watch.ts:17,55-88`), and two live runtimes on
   one profile would "ping-pong the file forever", which is why reclaim only fires for dead pids
   (`runtime-metadata-ownership-watch.ts:13-15`).
4. **Port namespace is mostly collision-proof**: the CLI RPC transport uses a per-pid named pipe
   on Windows / per-pid socket file on POSIX (`runtime-rpc.ts:1786-1804`), the agent-hook HTTP
   receiver binds port 0 on loopback (`server.ts:2198`). Two fixed-port exceptions exist: dev WS
   listener pins **6769** (`index.ts:2929`) and `FABRICA serve --port` pins its argument
   (`index.ts:2950-2956`, `1805-1822`).
5. For the Atlas goal of running **multiple agent fleets side-by-side**, the in-tree evidence
   shows the mechanism exists (per-instance `userData` redirection + env-based CLI targeting)
   but is only wired for dev/E2E today — packaged builds have no per-instance profile flag
   (§8, §9).

---

## 2. Single-Instance Lock Subsystem (`startup/single-instance-lock.ts`, full 82 lines)

### 2.1 Contract constants

| Constant | Value / meaning | Cite |
|---|---|---|
| `SINGLE_INSTANCE_LOCK_FAILURE_MESSAGE` | "[single-instance] Another Fabrica instance is already running for this userData profile…" | src/main/startup/single-instance-lock.ts:5-6 |
| `SINGLE_INSTANCE_LOCK_BYPASS_ENV` | `FABRICA_BYPASS_SINGLE_INSTANCE_LOCK` | single-instance-lock.ts:7 |
| `SINGLE_INSTANCE_LOCK_E2E_ENFORCE_ENV` | `FABRICA_E2E_ENFORCE_SINGLE_INSTANCE_LOCK` | single-instance-lock.ts:8 |
| `SINGLE_INSTANCE_ALREADY_RUNNING_EXIT_CODE` | `3` — stable supervisor contract; changing it "silently un-fixes #11935" (systemd `RestartPreventExitStatus=` keys off it) | single-instance-lock.ts:11-12 |

Note the failure message says "**for this userData profile**" — the lock scope is explicitly
profile-relative, not machine-relative (single-instance-lock.ts:6).

### 2.2 Second-instance argv policy

```ts
// single-instance-lock.ts:14-20
export function shouldActivateDesktopForSecondInstance(argv): boolean {
  return !argvRequestsServeMode(argv)
}
```

- A duplicate `FABRICA serve` must NOT drag a headless server into opening a desktop window
  (#11935); the comment block at :14-17 explains that a systemd duplicate start hands the
  handler raw CLI-form argv (`serve --port …`) that the CLI redirect never rewrote (#12677),
  so matching only the flag form avoids promoting the live headless server.
- Consumed at `index.ts:687-693`: `requestDesktopActivation` early-returns unless
  `shouldActivateDesktopForSecondInstance(argv)` passes, then asks the desktop activation gate.

### 2.3 Acquire path and ordering constraint

```ts
// single-instance-lock.ts:40-49
export function acquireSingleInstanceLock(app, onSecondInstance): boolean {
  if (!app.requestSingleInstanceLock()) return false
  app.on('second-instance', (_event, argv) => onSecondInstance(argv))
  return true
}
```

The doc comment :22-38 states the two reasons this helper exists:

1. **Clobber protection**: FABRICA writes two canonical discovery files into `<userData>/` —
   `FABRICA-runtime.json` (RPC endpoint + authToken for the bundled CLI) and
   `agent-hooks/endpoint.env` (hook port + token for cursor-agent/claude/codex scripts). Without
   a lock, every AppImage/.app double-click boots a fresh Electron main that clobbers both;
   when the newest instance quits, the metadata points at a dead pid and `FABRICA status`
   reports `stale_bootstrap` even though the original process still runs
   (single-instance-lock.ts:23-29).
2. **Ordering**: Electron derives the lock identity from the current `userData` path, so the
   caller MUST invoke this AFTER `configureDevUserDataPath(is.dev)` — then dev
   (`FABRICA-dev` userData) and packaged (`FABRICA` userData) runs "lock in separate namespaces
   instead of serialising against each other" (single-instance-lock.ts:35-38).

Call-site compliance: `index.ts:783` repeats the invariant ("acquire AFTER
configureDevUserDataPath"); actual order is `configureDevUserDataPath(is.dev)` at
`index.ts:656` → lock decision at `index.ts:785-801`.

### 2.4 Skip / bypass matrix

| Condition | Env | Effect | Cite |
|---|---|---|---|
| darwin, packaged, not serve | `FABRICA_BYPASS_SINGLE_INSTANCE_LOCK=1` | Bypass lock for diagnostics; logs warning "Do not use this with another Fabrica instance running for the same profile" (:9-10) | :51-65 |
| dev, not serve, E2E-enforce unset | — | Lock skipped entirely (parallel dev allowed) | :67-74 |
| dev + serve, or `FABRICA_E2E_ENFORCE_SINGLE_INSTANCE_LOCK=1` | — | Lock taken even in dev | :73 |

Wiring at `index.ts:785-814`: computes `bypassSingleInstanceLock` and `skipSingleInstanceLock`,
logs both when startup diagnostics are on (:802-808), and if no lock was acquired logs the
failure line and calls `app.exit(3)` — deferred pre-ready because a graceful quit at that point
"would still walk into Linux display init and SIGSEGV (#11935)" (:812-813).

Guarded side-effects: everything that touches userData (data path init, session parse cache,
profile paths, stats/usage paths, crash reports, GPU config, virtual display) is inside
`if (hasSingleInstanceLock)` (`index.ts:816-850`), so a losing transient process never writes
to the profile (:816 comment).

### 2.5 What the lock does and does not protect

- Protected: the two discovery files (:23-29), and implicitly the whole userData tree because
  only one packaged writer exists per profile.
- Not protected: dev (lock skipped, §2.4), macOS false lock-loss where
  `SingletonSocket`/`SingletonCookie` vanish — Chromium's lock socket lives under `$TMPDIR`
  which macOS purges after 3 days; this is the motivation for the metadata ownership watch
  (§6) and the bypass env (runtime-metadata-ownership-watch.ts:8-15;
  single-instance-lock.ts:793-796 comment "false lock loss before any app logs exist").

---

## 3. Dev vs Prod Instance Identity (`startup/dev-instance-identity.ts`, full 92 lines)

### 3.1 Identity fields

`getDevInstanceIdentity(isDev, env)` returns a `DevInstanceIdentity` (extends shared
`AppIdentity`) with `appUserModelId` and `appName` added (dev-instance-identity.ts:9-16).

**Packaged branch (:55-67)**: everything collapses to the base identity — `name = 'Fabrica'`
(`BASE_APP_NAME`, :5), `appName = 'Fabrica'`, `isDev: false`, all dev labels null,
`appUserModelId = 'com.autoscalers.fabrica'` (`BASE_APP_USER_MODEL_ID`, :6).

**Dev branch (:69-91)** — env-driven:

| Field | Source env | Fallback | Cite |
|---|---|---|---|
| `devRepoRoot` | `FABRICA_DEV_REPO_ROOT` | null | :69 |
| `devBranch` | `FABRICA_DEV_BRANCH` | null | :70 |
| `devWorktreeName` | `FABRICA_DEV_WORKTREE_NAME` | basename(repoRoot) else basename(cwd) | :71-73 |
| `devLabel` | `FABRICA_DEV_INSTANCE_LABEL` | `"worktree @ branch"` / worktree / branch (`formatLabel`, :33-41) | :74 |
| dock title → `name` | `FABRICA_DEV_DOCK_TITLE` | `"Fabrica: <branch or label or 'dev'>"`, trimmed/capped at 80 chars (`cleanEnvValue`, :18-26, MAX_LABEL_LENGTH :7) | :75-76 |
| `appName` | — (always) | `'Fabrica Dev'` | :83 |
| `appUserModelId` | derived | `com.autoscalers.fabrica.dev.<sha1(repoRoot)[:10]>`; plain base id when no repoRoot | :90, :43-49 |

All values are whitespace-normalised and length-capped so a hostile/long env value cannot
distort titles or AUMIDs (:18-31).

### 3.2 Why `appName` is deliberately NOT per-branch

The type comment at :11-15 and the return comment at :80-83 explain the coupling: `appName`
drives `app.setName` → the **macOS safeStorage Keychain item name**
("`<appName> Safe Storage`"). Keeping `'Fabrica Dev'` stable across dev branches means every
dev instance shares ONE Keychain key instead of creating a new one per branch and re-prompting.
It is "Distinct from prod's 'Fabrica'" — i.e. dev secrets are isolated from packaged secrets,
but **deliberately shared across all dev instances** (see leak register L2, §7).

### 3.3 Why `appUserModelId` IS per-repo-root

`createDevAppUserModelId` hashes the identity key (repoRoot ?? devLabel) with sha1 truncated to
10 hex chars into a `.dev.<hash>` suffix (:43-49). On Windows this is the AUMID that controls
taskbar grouping/notification identity; per-worktree hashing gives each parallel dev instance
its own taskbar group. The same value is reused as the agent-hook endpoint namespace
(§5.2).

### 3.4 Consumption points

- Main-process capture at module scope: `const devInstanceIdentity = getDevInstanceIdentity(is.dev)`
  then `devAgentHookEndpointNamespace = devInstanceIdentity.isDev ?
  devInstanceIdentity.appUserModelId : undefined` (`index.ts:631-634`).
- Renderer-facing IPC: `app:getIdentity` re-derives the identity and returns name/isDev/devLabel/
  devBranch/devWorktreeName/devRepoRoot/dockBadgeLabel (`src/main/ipc/app.ts:248-259`).
- The settings/data-dirs report already documents `app.setName(devInstanceIdentity.appName)` at
  ready and the userData consequences — see `fa-settings-config-datadirs.md` §2.1 table
  (rows citing dev-instance-identity.ts:5/:6/:43-49/:56-66/:80-83) and §10 (env-var list
  including the five `FABRICA_DEV_*` vars). Not restated here.

---

## 4. Per-Instance Data-Dir Separation Chain

### 4.1 Redirection decision tree (`configure-process.ts:139-171`)

Evaluated in order at startup (`index.ts:656`):

1. **E2E**: if `getMainE2EConfig().userDataDir` is set — sourced from
   `process.env.FABRICA_E2E_USER_DATA_DIR` (`src/main/e2e-config.ts:6`) — startup switches to a
   disposable profile:
   - computes `e2eHomeDir = $FABRICA_E2E_HOME_DIR ?? <userDataDir>/home` (:146);
   - **refuses to start** unless `homedir()` already equals that disposable home ("Refusing to
     start E2E outside its disposable home boundary", :147-151) — because E2E imports may have
     resolved `os.homedir()` before Electron was ready;
   - creates it mode `0o700`, sets both `app.setPath('home', …)` and
     `app.setPath('userData', e2eConfig.userDataDir)` (:154-156).
   - Stated purpose (:142-145): each E2E spec launches a fresh Electron app; the dedicated
     userData prevents persisted repos/worktrees/session state leaking between tests through
     the shared dev profile while leaving the real packaged profile untouched.
2. **Packaged**: `if (!isDev) return` — no redirection; default Electron userData from app name
   (per-OS table in `fa-settings-config-datadirs.md` §2.2–2.3).
3. **Dev override**: `$FABRICA_DEV_USER_DATA_PATH` wins — "automated repros need an isolated
   profile so the dev's persisted tabs/worktrees don't skew startup and hide window bugs"
   (:163-168).
4. **Dev default**: `<appData>/fabrica-dev` (:170). Comment :169: without a dev-only path,
   `pnpm dev` overwrites the packaged app's runtime pointer under userData and breaks the
   FABRICA CLI.

### 4.2 Canonicalisation for child processes

`configureFABRICAUserDataPathEnv()` sets
`process.env.FABRICA_USER_DATA_PATH = app.getPath('userData')` (:181-184), run immediately
after redirection (`index.ts:657`). Comment :182: relaunches can inherit a stale env var;
canonicalising "before CLI-shared modules build runtime-home paths" keeps every spawn in this
instance pointing at ITS profile.

On the consumer side, the bundled CLI resolves its target instance via the same variable FIRST:

```ts
// src/cli/runtime/metadata.ts:46-52
// Why: in dev mode (and for parallel FABRICA instances), the Electron app writes
// runtime metadata to a separate userData directory (e.g. `FABRICA-dev`) ...
if (process.env.FABRICA_USER_DATA_PATH) return process.env.FABRICA_USER_DATA_PATH
```

then falls back to the packaged per-OS defaults (`~/Library/Application Support/Fabrica`,
`%APPDATA%\Fabrica`, `$XDG_CONFIG_HOME/Fabrica`) (:53-69). This env override is the ONLY
in-tree mechanism letting an out-of-process client target a *specific* instance among several
running ones.

### 4.3 Path-capture timing discipline (multi-instance relevant)

Three subsystems capture the redirected path once, at a mandated moment, because late calls
resolve differently:

- Persistence store: comment block + `initDataPath()` — "a const resolves before
  configureDevUserDataPath() redirects userData (**dev/prod collide**); per-call resolves after
  app.setName('Fabrica') flips path case and loses data on case-sensitive FS"
  (`src/main/persistence.ts:343-352`).
- Stats collector: same constraint verbatim (`src/main/stats/collector.ts:18-25`,
  file `<userData>/FABRICA-stats.json`).
- Claude usage store: same pattern (`src/main/claude-usage/store.ts:27`).

The RPC server likewise pins the STABLE pre-setName path: `getCanonicalUserDataPath()` rather
than a late `app.getPath('userData')`, "which drops paired devices across restarts"
(`index.ts:2940-2943`). For multi-instance purposes: any code resolving userData lazily after
`setName` risks landing in a DIFFERENT directory than the lock was taken on — i.e. escaping the
instance namespace.

### 4.4 Profiles subsystem: separation INSIDE one instance namespace

Profiles are not instances. All profiles live under the single instance userData:
`<userData>/profiles/<profileId>/FABRICA-data.json` (+ browser-session meta), with a
`FABRICA-profile-index.json` at the root and legacy root-level files as migration sources
(`profile-storage-paths.ts:4-9,26-46`; paths captured once via `initFABRICAProfilePaths()` at
`index.ts:830`, defined `profile-storage-paths.ts:15-24`). Layout detail belongs to
`fa-settings-config-datadirs.md` §7 — the point here: two running app instances do NOT get
separate profile indexes; two processes writing one index would be a cross-instance hazard,
which is exactly why dev's shared-profile situation matters (§7 L1).

### 4.5 Windows ACL hardening of the instance tree

`windows-user-data-acl.ts:6-36`: Chromium's BrowserWindow constructor resets the userData DACL
to a Protected DACL whose child ACEs are Inherit-Only, so writes into pre-existing
subdirectories (`codex-runtime-home`, `agent-hooks`, …) fail EPERM. Fix: explicit ACEs on
userData root + immediate children via one async `icacls` pass, gated by a marker file
`windows-acl-grant.json` recording scheme version + identity (:23-35). Multi-instance note:
the marker is per-identity inside the profile, so a SECOND instance on the same profile gets a
marker hit and performs zero spawns (:24-26) — co-operating, not racing; but two instances
first-creating different subdirectories concurrently rely on the per-write EPERM retry backstop
(:27-30).

---

## 5. Port & IPC Namespace Isolation

### 5.1 Runtime RPC transport naming (CLI plane)

`createRuntimeTransportMetadata(userDataPath, pid, platform, runtimeId)`
(`runtime-rpc.ts:1786-1804`):

| Platform | Endpoint | Uniqueness mechanism | Cite |
|---|---|---|---|
| win32 | `\\.\pipe\FABRICA-<pid>-<suffix>` | pid + 4-char runtime-id suffix; comment :1796 — named pipes lack Unix-socket chmod hardening, so "a per-runtime suffix avoids a stable, guessable endpoint name" | :1793-1798 |
| POSIX | `<userData>/o-<pid>-<suffix>.sock` | lives INSIDE the instance userData; pid-scoped name | :1800-1803 |

Because the socket path embeds userData, **two instances with different profiles can never
collide** even with recycled pids; the suffix sanitises runtimeId to `[A-Za-z0-9_-]{0,4}` with
`'rt'` fallback (:1792).

Orphan hygiene: `sweepOrphanedRuntimeSockets` deletes stale `o-<pid>-*.sock` entries whose pid
no longer exists — signal-0 probe where only `ESRCH` proves death, `EPERM` = foreign owner left
alone, own pid skipped (`runtime-rpc.ts:1747-1784`; regex :1748 kept in lockstep with the name
shape by unit test). Swept only when `platform !== 'win32'` since named pipes leave no
filesystem entries (:1125-1128).

### 5.2 Agent-hook loopback receiver (agent-status plane)

- Bind: `this.server!.listen(0, '127.0.0.1', onListening)` — ephemeral port, loopback-only,
  per process (`server.ts:2198`); resolved port stored from `address().port` (:2190-2193). Two
  instances therefore never contend for a hook port.
- Auth: fresh `randomUUID()` token per start (:2101); every POST must carry matching
  `x-fabrica-agent-hook-token` header or gets 403 (:2116-2120); slowloris request timeout
  (:2122-2125).
- Discovery file: endpoint dir defaults to `<userData>/agent-hooks[/<endpointNamespace>]`
  with `endpoint.cmd` (win32) / `n` (POSIX) written by the listener
  (`server.ts:2093-2100`; filename constants `src/shared/agent-hook-endpoint-file.ts:1` +
  `src/shared/agent-hook-listener.ts` `getEndpointFileName`). File contents carry
  `FABRICA_AGENT_HOOK_PORT/TOKEN/ENV/VERSION` (`agent-hook-endpoint-file.ts:28-41`).
- **Dev namespacing seam**: `endpointNamespace` is set to the dev `appUserModelId` hash —
  comment at the call site: "hooks source this endpoint file at invocation time so old PTY env
  reaches the current process after restart; **dev namespaces it (worktrees share
  `FABRICA-dev`)**" (`index.ts:962-967`), and at the implementation: "dev builds share one
  userData path; namespace per instance while packaged keeps the stable path for PTY reconnect"
  (`server.ts:2094`). So within the shared `fabrica-dev` profile, hook discovery is partitioned
  per repo-root hash — the narrowest per-instance isolation Fabrica currently has in dev.
- Stop semantics: `stop()` does NOT unlink the endpoint file — "a stale file matches fail-open
  and avoids a TOCTOU race with a concurrent FABRICA" (:2202-2221, comment :2220). Cross-instance
  consequence: a leftover file from instance A remains readable by hook scripts while B also
  runs; correctness rests on token auth (403) rather than file exclusivity.
- Hook install ownership (cross-machine/process-safe): managed-hook ownership binds installs to
  host identity — durable `/var/tmp/FABRICA-managed-hooks-<uid>/host-id` token published
  atomically via hard-link (`managed-hook-owner-identity.ts:68-106`), win32 MachineGuid
  (:118-127), darwin IOPlatformUUID (:131-147), plus per-pid+start-time process identity probes
  (:202-276). This is scoped per HOST, not per app instance — two instances on one machine
  share the same managed-hook host identity (see §7 L6).

### 5.3 Mobile/WebSocket plane

- Port policy (`runtime-rpc.ts:1183-1203`, `1256-1291`): preferred port = pinned serve port or
  dev fixed 6769 (`index.ts:2929`, threaded :2948-2956) or E2E harness port; otherwise OS-random.
- STA-1511 fallback persistence: when the preferred port was taken ("second FABRICA instance" is
  literally the motivating case, `ws-fallback-port-store.ts:4`), the OS-assigned port is
  persisted to `<userData>/mobile-ws-fallback-port.json` and bound BEFORE the preferred port on
  next launch so paired mobile endpoints keep working (:4-10; read/write :18-44). Per-instance
  storage ⇒ no cross-instance collision on the FILE — but see §7 L3 for the shared-dev-profile
  ping-pong.
- Bind-host policy (STA-2370): desktop stays on loopback until a paired network device exists;
  `FABRICA serve` and E2E bind all interfaces from startup
  (`runtime-rpc.ts:1239-1252`, wiring `index.ts:2944-2947`).
- Failure isolation: WS transport failure (e.g. port in use) degrades to Unix-socket-only
  operation, logged, non-fatal (:1197-1201).

### 5.4 PTY daemon plane

- Daemon runtime dir = `<userData>/daemon` created on demand (`daemon-init.ts:104-108`);
  canonical names `daemon-v<N>.sock` / `.token` / `.pid` versioned by protocol
  (`daemon-spawner.ts:109-117`). Same-profile instances therefore share ONE canonical daemon
  endpoint.
- Contention protocol instead of locks: publisher binds a unique temp name then claims the
  canonical name via rename; an occupied-but-live endpoint makes the launcher ADOPT
  (`{status:'occupied'}` → adoption client connect, `daemon-endpoint-ownership.ts:140-141`,
  `daemon-init.ts:466-482`); replacement requires a probe-proven-dead entry re-verified against
  dev+ino identity before and after probing ("rename, not unlink-then-link… every concurrent
  observer can land in that gap and conclude something false",
  `daemon-endpoint-ownership.ts:125-167`; loser-must-not-serve confirmation :192-209).
- Multi-instance effect: second dev/desktop instance on the same profile adopts the first
  instance's daemon rather than spawning a rival; terminals persist beyond either GUI quitting
  (persistent provider rationale at `index.ts:929-936`).

### 5.5 Serve-mode port surface

`getServeOptions` parses `--serve-port <n>` (validated integer 0..65535, throws on bad values)
plus pairing/project flags (`index.ts:1805-1832`); the CLI-form argv arrives pre-translated by
`serve-mode-argv.ts` (flag aliases `['--port','--serve-port']`, `=`-form splitting,
`serve-mode-argv.ts:19,113,137-138`). Pinned ports get `preferPinnedWsPort: true` so bind order
prefers them over a stale fallback (#8535, `index.ts:2950-2956`;
`ws-fallback-port-store.ts` header :70 in runtime-rpc context).

---

## 6. Discovery-File Ownership: `FABRICA-runtime.json` Reclaim Engine

File format (`src/shared/runtime-bootstrap.ts`): `RuntimeMetadata { runtimeId, pid,
transports[unix|named-pipe|websocket], authToken, startedAt }` (:17-23) at
`<userData>/FABRICA-runtime.json` (:45-48); `findTransport` tolerates legacy singular
`transport` files (:25-43).

Publication is atomic-with-fallback in `FABRICARuntimeRpcServer.start()`
(`runtime-rpc.ts:1120-1237`): transports bound first, metadata written second; a metadata write
failure closes all transports rather than running undiscoverable (:1209-1217 comment "invisible
to the CLI").

The ownership watch (`runtime-metadata-ownership-watch.ts`, full file):

- Motivation (#7848): "a second instance that slipped past the single-instance lock publishes
  its own pid and then exits, leaving the CLI on a dead pid (`stale_bootstrap`) against a
  healthy app"; macOS defeats Chromium's lock whenever `SingletonSocket`/`SingletonCookie` go
  missing and the socket lives under `$TMPDIR` which macOS purges after 3 days (:5-15).
- Poll every 10 s (`RUNTIME_METADATA_OWNERSHIP_POLL_MS`, :17), timer unref'd so bookkeeping
  never keeps the process alive (:81-83).
- Reclaim predicate (:35-53): missing/unreadable record → reclaim (unreadable treated as
  reclaimable, :90-101); own pid+runtimeId → no-op; **own pid with foreign runtimeId →
  reclaim** ("only this process can legitimately claim this pid… leftover from a recycled pid",
  :47-51); foreign pid → reclaim only if `!isProcessRunning(pid)` where EPERM counts as running
  (:103-114).
- Deliberate limitation: "two live runtimes sharing a profile would otherwise ping-pong the
  file forever. Reclaiming only a dead pid" (:13-15).
- Republish guard: never advertises endpoints already torn down
  (`runtime-rpc.ts:1224-1230`); reclaims log the previous dead pid (:1231-1236).

---

## 7. What Breaks or Leaks Between Instances — Evidence Register

| # | Severity | Finding | Evidence |
|---|---|---|---|
| L1 | HIGH (dev fleets) | **All parallel dev instances share one userData** (`<appData>/fabrica-dev`). The lock is skipped in dev precisely to allow this (single-instance-lock.ts:67-74; index.ts:784), yet the settings Store (`<userData>/FABRICA-data.json`, persistence.ts:348-352), profile index (profile-storage-paths.ts:26-32), stats file (stats/collector.ts:24), session-parse cache (index.ts:826-829), crash reports (index.ts:836) and pairing/E2EE identity (runtime-rpc.ts:1093-1117, both keyed on userDataPath) are all shared. Two dev instances are concurrent last-write-wins writers to one Store — there is no per-process file locking documented anywhere in the persistence engine (fa-settings-config-datadirs.md §5). | configure-process.ts:160-171 |
| L2 | MEDIUM (by design) | **All dev instances share ONE Keychain/safeStorage item** `'Fabrica Dev Safe Storage'` because `appName` is pinned stable across branches (dev-instance-identity.ts:9-16,80-83). Convenience (no per-branch re-prompt) = leak surface (any dev branch can decrypt every other dev branch's stored secrets). Dev↔prod remain isolated ('Fabrica' vs 'Fabrica Dev'). | dev-instance-identity.ts:11-15 |
| L3 | MEDIUM | **Dev WS port pin 6769 + shared fallback-port file**: second dev instance fails the 6769 bind (supplementary transport degrades, runtime-rpc.ts:1197-1201) and then persists its random fallback into the SAME `<fabrica-dev>/mobile-ws-fallback-port.json`; two instances alternate overwrites, so each restart re-binds the OTHER's last port — paired-device endpoint churn STA-1511 describes, multiplied by instance count. | index.ts:2929,2948-2949; ws-fallback-port-store.ts:35-44 |
| L4 | LOW/MEDIUM | **Shared daemon under one profile**: instances adopt one `daemon-v<N>.sock`; version skew between two dev branches (different `daemon-v<N>`) yields coexisting daemons only if protocol versions differ — same-version runs share live PTY sessions and PID/token files; a restart storm exercises the probe-proven-dead rename path (daemon-endpoint-ownership.ts:125-167) where mis-timed adoption kills sessions. | daemon-init.ts:104-108; daemon-spawner.ts:109-117 |
| L5 | LOW (macOS) | Chromium single-instance lock silently disappears when `$TMPDIR` SingletonSocket/SingletonCookie are purged (~3 days); a subsequent launch believes it is first, publishes its own FABRICA-runtime.json then exits → `stale_bootstrap`. Mitigated by ownership-watch reclaim (§6) + diagnostic bypass env. | runtime-metadata-ownership-watch.ts:8-15 |
| L6 | LOW | **Managed-hook host identity is machine-scoped, not instance-scoped**: `/var/tmp/FABRICA-managed-hooks-<uid>/host-id`, MachineGuid, IOPlatformUUID (managed-hook-owner-identity.ts:68-147). Hook installs/residue claims cannot distinguish two instances on one machine; residue from a killed instance is stealable only via process-identity probes (pid+starttime :202-276), which do disambiguate processes but not profiles. | managed-hook-owner-identity.ts:73-76,118-127 |
| L7 | MEDIUM (packaged) | Packaged allows exactly one instance per OS-user profile; second launch exits code 3 (single-instance-lock.ts:12; index.ts:813). Running packaged prod side-by-side with ANY second prod profile requires OS-level tricks — no product flag exists for an alternate packaged userData (contrast dev's `FABRICA_DEV_USER_DATA_PATH`, configure-process.ts:163-168). | index.ts:797-814 |
| L8 | DIAGNOSTIC | `FABRICA_BYPASS_SINGLE_INSTANCE_LOCK=1` (darwin+packaged only) permits two live instances on one profile; the code itself warns "Do not use this with another Fabrica instance running for the same profile" — doing so recreates exactly the discovery-file clobber the lock exists for (single-instance-lock.ts:23-29). Ownership watch will then refuse to ping-pong and only the survivor-of-pid-liveness keeps the pointer (runtime-metadata-ownership-watch.ts:49-53). | single-instance-lock.ts:51-65 |
| L9 | LOW | Workspace dev-server port kill path re-scans ports as the SIGTERM authorization check and distrusts caller-supplied pids (workspace-port-ownership.ts:85-107). Scan targets derive from the LOCAL store's repos/worktrees (getStoreWorkspacePortProbes :17-56) — with dev-shared stores (L1) either instance may enumerate and terminate the same worktree servers; with distinct packaged profiles the enumeration is naturally partitioned. | workspace-port-ownership.ts:85-107 |
| L10 | CONTAINED | E2E fleet launches are isolated by disposable home boundary enforcement — startup aborts unless `homedir()` is already the spec-private home, preventing a mis-launched test instance from touching the user's real profile or another spec's state. | configure-process.ts:141-158 |

---

## 8. Atlas Use Case: Running Multiple Agent Fleets Side-by-Side

What the architecture gives a "several Fabrica instances managing several agent fleets on one
machine" deployment today:

1. **The isolation unit already exists and is total**: userData-scoped RPC sockets
   (runtime-rpc.ts:1800-1803), scoped hook dirs (server.ts:2093-2100), scoped daemon dir
   (daemon-init.ts:104-108), scoped CLI discovery (runtime-bootstrap.ts:45-48). Two instances
   with different userData values share NOTHING except machine-level identities (L2/L6).
2. **The supported way to get N instances is dev-mode mechanics**: `FABRICA_DEV_USER_DATA_PATH`
   (configure-process.ts:163-168) plus the five `FABRICA_DEV_*` identity vars
   (dev-instance-identity.ts:69-76) give distinct taskbar groups, dock titles, and hook
   namespaces per worktree — this is how the Fabrica team itself runs parallel worktree dev
   instances (index.ts:784 rationale; server.ts:2094 "worktrees share FABRICA-dev").
3. **CLI/fleet tooling can target a specific instance** through `FABRICA_USER_DATA_PATH`
   resolution precedence (metadata.ts:50-52) — each fleet supervisor sets the env per spawn and
   talks to that instance's pipe/socket/authToken exclusively.
4. **Ports need zero coordination** except the two pins: dev WS 6769 (collides across >1 dev
   instance; degradation is graceful but pairing churn follows, L3) and explicit serve pins.
   Everything else binds ephemeral/pid-scoped endpoints.
5. **Gaps to close for a production multi-fleet story** (task-ready):
   - a packaged-side per-instance profile flag equivalent to `FABRICA_DEV_USER_DATA_PATH`
     (nothing today; §7 L7);
   - extending the `endpointNamespace` precedent (appUserModelId-hash subdir,
     server.ts:2095-2097) to the OTHER shared-profile artifacts — Store file, stats, daemon dir
     — if shared-profile multi-instance is ever desired instead of separate profiles;
   - per-instance WS port env override (or always-ephemeral + published endpoint via
     FABRICA-runtime.json transports, which already carries the websocket kind,
     runtime-bootstrap.ts:17-23);
   - instance-scoped managed-hook host identity suffix if two fleets must not share hook
     installs (managed-hook-owner-identity.ts:68-106).

---

## 9. After-Rebrand Notes (instance-identity-specific)

Complements the 13-item register in fa-settings-config-datadirs.md §12; items unique to this
scan:

1. Pipe prefix literal `\\.\pipe\FABRICA-<pid>-<suffix>` (runtime-rpc.ts:1797), socket name
   shape `o-<pid>-*.sock` (:1802) + enforcing regex RUNTIME_SOCKET_NAME_REGEX (:1748), daemon
   names `daemon-v<N>.*` (daemon-spawner.ts:109-117), discovery filename `FABRICA-runtime.json`
   (runtime-bootstrap.ts:45), endpoint-file field names `FABRICA_AGENT_HOOK_*`
   (agent-hook-endpoint-file.ts:28-41), env vars in §2–§4, AUMID base `com.autoscalers.fabrica`
   (dev-instance-identity.ts:6) — ALL are brand-carrying identifiers with cross-process
   contracts; renaming any half breaks lockstep tests or CLI compat (the regex comment at
   :1747 says the shape MUST stay in step).
2. `'Fabrica Dev'` safeStorage key (dev-instance-identity.ts:83) renames with brand → same
   ciphertext-loss class as the prod keychain issue (fa-settings-config-datadirs.md §12.1 item
   2).

---

## 10. Scan Coverage Statement

**Read fully (line-by-line):**
- src/main/startup/single-instance-lock.ts (82/82)
- src/main/startup/dev-instance-identity.ts (92/92)
- src/main/startup/configure-process.ts (310/310)
- src/shared/runtime-bootstrap.ts (49/49)
- src/runtime/runtime-metadata-ownership-watch.ts → src/main/runtime/runtime-metadata-ownership-watch.ts (114/114)
- src/cli/runtime/metadata.ts (70/70)
- src/shared/agent-hook-endpoint-file.ts (42/42)
- src/main/fabrica-profiles/profile-storage-paths.ts (72/72)

**Read targeted regions (grep-located sections read in context):**
- src/main/index.ts: lines 600-879 (startup ordering/lock gate/guarded init), 928-984
  (agent-hook start call site), 1805-1859 (getServeOptions), 2929-2974 (RPC server wiring);
  grep hits at 120/163/167/171-172/631-634/656-657/783-801 verified in context
- src/main/runtime/runtime-rpc.ts: 1050-1309 (start(), transports, bind-host policy),
  1740-1804 (metadata write, sweep, transport naming), header comments + grep hits
  (:58-83, :1786 region)
- src/main/agent-hooks/server.ts: 2040-2304 (start(), endpoint dir, listen, token auth, stop())
- src/main/startup/windows-user-data-acl.ts: 1-60 (+ strategy docblock)
- src/main/ports/workspace-port-ownership.ts: 1-60 + grep hits 85-107
- src/main/daemon/daemon-endpoint-ownership.ts: 90-209 + header
- src/main/daemon/daemon-init.ts: 95-124 (getRuntimeDir/getHistoryDir/getDaemonEntryPath) +
  grep hits (adoption 255-351, 466-482, runtimeDir uses)
- src/main/agent-hooks/managed-hook-owner-identity.ts (276/276 — full)
- src/main/ipc/app.ts: 235-284 (app:getIdentity handler)
- src/main/stats/collector.ts: 1-30; src/main/persistence.ts: 330-359
- src/main/e2e-config.ts (env var line); src/main/startup/serve-mode-argv.ts (grep hits 19/
  113/137-138); src/main/runtime/rpc/ws-fallback-port-store.ts (45/45 full)

**Skipped:** tests (`*.test.ts` everywhere, including single-instance-lock.test.ts,
dev-instance-identity.test.ts, ws-fallback-port-store.test.ts), startup/__fixtures__/,
`runtime/fabrica-runtime-files.ts` body beyond imports (file-command plane out of scope;
watcher lease machinery belongs to fa-ipc-watchers.md), daemon health/relocation internals
beyond cited lines, mobile pairing internals (covered by fa-mobile-companion.md), WSL hook
relay files (covered by fa-wsl-remote-execution.md / fa-agent-hooks-probes.md), renderer-side
identity consumption beyond ipc/app.ts, and `_sources/` repos (out of scope for FA-only dive).

**Duplication discipline vs prior reports:** identity constants, userData per-OS table, Store
engine internals, migration catalog and env-var inventory were NOT restated from
fa-settings-config-datadirs.md (§2, §5, §7, §10, §12) nor OAuth/provider auth planes from
fa-auth-onboarding.md; they are cross-referenced where the multi-instance analysis depends on
them.

*Report ends.* ~31KB expected; written in 3 chunks due to size policy.


