# Fabrica-app Plugin HOST RUNTIME — Round 4 Deep Dive (R4-1.21)

> READ-ONLY discovery of `Fabrica-app/src/`. All paths relative to `Fabrica-app/src/` unless noted.
> **Scope boundary vs round3:** `discovery/round3/fabrica-app-plugins.md` covered manifest schema, capability/consent model, discovery, install pipeline, marketplace, kill list, content packs, panels, trust model. This report goes DEEPER on the **runtime only**: how plugin code is loaded/executed in a live process, the host↔plugin wire protocol and IPC chokepoint, lifecycle hooks, supervision/failure handling, timeout budget, version-compatibility checks at load time, and the exact API surface handed to running plugin code. Manifest/install facts are cited ONLY where they gate runtime behavior.
>
> Task: R4-1.21 · task task_2569011133c9 · dispatch ctx_5215b5726aa7 · 2026-08-23.

---

## S1. PROCESS MODEL — ONE FORKED NODE CHILD PER PLUGIN WITH A `main`

The unit of plugin execution is `child_process.fork(entryPath)` where `entryPath` is FABRICA's own compiled child bootstrap (`plugin-host-entry.js`), NOT the plugin's entry directly:

- `startPluginWorker` forks with `stdio: ['ignore','pipe','pipe','ipc']` and `serialization: 'advanced'` — stdin is deliberately dead to the child; stdout/stderr are piped through a bounded splitter; IPC uses V8 structured clone so BigInt/Map/TypedArray/cyclic values can cross, which Node's default JSON fork serialization would reject (`main/plugins/plugin-host-process.ts:88-99`, rationale comment :96-98).
- `execArgv: []` — inspector/loader flags from FABRICA's own launch must never execute inside third-party plugin workers (`plugin-host-process.ts:93-95`). A leaked `--inspect-brk` or custom loader would be both a debug backdoor and an injection vector; emptying closes both.
- The child binary is still Electron forced into plain-Node mode via `ELECTRON_RUN_AS_NODE=1` injected by the env builder (`main/plugins/plugin-worker-env.ts:50`; rationale at `plugin-host-process.ts:89-91`).
- Entry resolution mirrors the daemon precedent: packaged apps must fork the `app.asar.unpacked` copy because fork() cannot execute scripts from inside `app.asar`; fallback is `<base>/out/main/plugin-host-entry.js` (`resolvePluginHostEntryPath`, `plugin-host-process.ts:59-71`).
- One worker per plugin key, lazily created — no eager spawn at app start. Workers appear when a command invokes (`plugin-service.ts:274-285`), a manifest-subscribed event fires (`plugin-event-delivery.ts:30-39`), or reconciliation starts them.

**Isolation honesty (documented limit):** the child is OS-process isolation only. Once `activate()` runs, plugin code has raw Node access *inside its own process* — it can read files, open sockets, spawn processes. The consent copy itself acknowledges that worker raw Node access bypasses host-side gating/audit (round3 S12, audit scope note). The sandbox boundary enforced here is: env scrub + flag scrub + protocol-level zod walls + capability-gated host services + SIGKILL supervision — it constrains what the child can do THROUGH THE HOST, not what Node can do natively. This is the single most important fact for any security-relevant reuse of this runtime.

## S2. CHILD-SIDE BOOTSTRAP + PLUGIN SDK SURFACE

Child entry `main/plugins/plugin-host-entry.ts` (41 lines total) is deliberately minimal wiring:

- Must stay plain Node — no electron imports directly or transitively (`plugin-host-entry.ts:1-6`).
- Registers exactly three process handlers:
  - `uncaughtException` / `unhandledRejection` → send `{type:'fatal', error}` then `process.exit(1)`; channel-closed during the fatal send is swallowed (:20-35). Comment: an escaped rejection must not leave a zombie worker; report so the parent can supervise/restart.
  - `disconnect` → `process.exit(0)` — if the parent dies without shutdown, exit instead of lingering as an orphaned Node process (:37-41).
- All logic lives in `createPluginWorkerRuntime` from `plugin-host-runtime.ts`; the entry only bridges fork IPC (`process.on('message') → runtime.handleMessage`) (:7-18).

### S2.1 The FABRICA API object (the entire SDK)

`PluginWorkerFABRICAApi` is the complete surface handed to a plugin's default-exported `activate(FABRICA)` (`main/plugins/plugin-host-runtime.ts:18-36`). Exactly five members:

| Member | Type | Behavior | Cite |
|---|---|---|---|
| `commands.register(commandId, handler)` | sync registration into a Map | one handler per command id; later registrations overwrite | :22-24, :93-97 |
| `events.on(event, handler)` | multi-handler list per event name | handlers run sequentially; handler errors logged not fatal | :26-27, :98-103 |
| `host.call(method, params?)` | Promise-based RPC to host | allocates monotonic callId, stores pending resolver, sends `{type:'hostCall'}` | :29-32, :105-112 |
| `grantedCapabilities` | readonly string[] | informational copy so the SDK can fail fast client-side; the host re-gates every call regardless | :33-34, :114 |
| `log(message)` | string sliced to 8192 chars, sent as `{type:'log', level:'info'}` | bounded to keep log traffic honest | :35, :115-117 |

Header comment marks everything EXPERIMENTAL until pluginApi v1 freezes (`plugin-host-runtime.ts:18-19`).

### S2.2 Plugin loading mechanics

- Entry import uses `pathToFileURL(join(pluginRoot, ...mainEntry.split(/[\\/]/)))` — dual purpose: ESM plugins work on Windows paths (file URL), and manifest paths authored with either separator split explicitly so a Windows-authored plugin also imports on macOS/Linux and vice versa (`plugin-host-runtime.ts:79-82`).
- Module contract validation: `default` export must be a function else fatal `no default-exported activate function` (:84-87); `deactivate` if present must be a function else fatal (:88-91).
- Duplicate `init` messages are ignored with a warn log — idempotent init guard (:74-77).
- After `await activate(FABRICA)` completes, child sends `ready {commands: [...commandHandlers.keys()]}` (:119-120). Registration AFTER activate still works locally but is invisible to the parent's ready snapshot (the ready payload was already sent) — see S7 for how undeclared/post-ready commands are handled.
- Malformed parent messages are zod-parsed first; failures produce only a warn log, no crash (`plugin-host-runtime.ts:124-129`).
- Init/activation errors inside handleMessage trigger `fatal` + `exit(1)` so the parent surfaces the error instead of hanging on the ready timeout (:201-207).

## S3. WIRE PROTOCOL — ZOD-VALIDATED IN BOTH DIRECTIONS

`shared/plugins/plugin-host-protocol.ts` defines two discriminated unions, validated on BOTH sides because the child runs third-party code — nothing it sends is trusted structurally (`plugin-host-protocol.ts:5-9`).

Parent→child (`pluginWorkerParentMessageSchema`, :47-53):
- `init {pluginId, pluginRoot, mainEntry, grantedCapabilities[]}` — capabilities enum-validated against `PLUGIN_CAPABILITY_KINDS` so the child SDK gets a typed allowlist (:11-20). Comment: grantedCapabilities exist for client-side fail-fast; the host re-gates anyway (:17-19).
- `invokeCommand {callId≥0 int, commandId min1, args?}` (:22-27)
- `deliverEvent {eventId≥0 int, event ∈ PLUGIN_EVENT_NAMES, payload unknown}` (:29-34)
- `hostResult {callId, ok bool, value?, errorCode?, error?}` (:36-43)
- `shutdown {}` (:45)

Child→parent (`pluginWorkerChildMessageSchema`, :95-102):
- `ready {commands[] ≤ PLUGIN_COMMAND_LIMIT(256)}` — ids validated against the portable `pluginCommandIdSchema`, so even the ready announcement cannot smuggle malformed ids (:55-59)
- `commandResult {callId, ok, value?, error? max 8192}` (:61-69) — value is `z.unknown()`: structured-clone data by construction, treated as opaque, callers re-validate shape (:65-67)
- `eventAck {eventId}` (:71-74)
- `hostCall {callId, method min1, params?}` (:76-82)
- `log {level ∈ info|warn|error, message max 8192}` (:84-88)
- `fatal {error max 8192}` (:90-93)

Protocol constants live beside the schemas: READY_TIMEOUT 10s, INVOKE_TIMEOUT 30s, IDLE_REAP 5min, MAX_ACTIVE_DEFAULT 5 (:108-114).

Note the asymmetry design: `commandResult.value` / `hostCall.params` / `deliverEvent.payload` are all `unknown` at the transport layer — schema enforcement happens at the semantic layer instead (result-schema validation inside `executePluginHostCall`, event payload projection in `projectPayload`). The transport trusts nothing structurally but validates only what it can know generically.

## S4. SANDBOX / ISOLATION MODEL (LAYERED)

1. **Process isolation**: one fork per plugin key; a plugin crash cannot take down main or other plugins (supervision in S8).
2. **Environment allowlist**: `buildPluginWorkerEnv` constructs env from scratch — NEVER spreads `process.env` — copying only PATH/HOME/USERPROFILE/LANG/LC_ALL/LC_CTYPE/TZ/TMPDIR/TEMP/TMP plus Windows SystemRoot/SYSTEMDRIVE/WINDIR/COMSPEC/PATHEXT/PROCESSOR_ARCHITECTURE/NUMBER_OF_PROCESSORS (`plugin-worker-env.ts:8-27`). Header comment: the app env can carry secrets (tokens exported in user shell, CI credentials); deliberately diverges from the sidecar precedent which spreads full process.env (:1-6).
   - Windows case-folding subtlety: win32 builds a case-folded lookup map because Windows env keys are case-insensitive while POSIX keys are not; folding on every platform could promote an attacker-set lowercase `path` over `PATH` (:34-47).
3. **Flag scrub**: empty execArgv (S1).
4. **Structured-clone-only channel**: no stdin, stdout/stderr piped through a line-bounded buffer (`plugin-worker-output-buffer.ts`: lines capped at 8192 chars `PLUGIN_WORKER_OUTPUT_LINE_LIMIT` :5, unterminated output still flushed/truncated with a suffix marker, oversized segments discarded to next newline :32-63).
5. **Structural distrust**: zod both directions (S3); malformed messages ignored, never crash either side (`plugin-host-process.ts:177-182`, `plugin-host-runtime.ts:124-129`).
6. **Authority re-resolution host-side**: grantedCapabilities sent to child are advisory; every hostCall is re-gated against fresh host-side state (`plugin-service.ts:240-272`, gate at `shared/plugins/plugin-capability-gate.ts:34-63`).
7. **What is NOT isolated**: no seccomp/AppContainer/sandbox profile; native Node power remains post-activate (S1 honesty note). Panels get a much harder CSP/document sandbox but that is round3 coverage (S6 there).

## S5. VERSION COMPATIBILITY CHECKS AT LOAD TIME

Three independent compatibility gates run before/independent of plugin code executing:

1. **Engine range gate (host version)**: manifest requires `engines.fabrica` matching closed grammar `>=x.y.z` (`shared/plugins/plugin-manifest.ts:94`, grammar enforced by `FABRICAEngineRangeSchema`). `satisfiesFabricaEngineRange(hostVersion, range)` does numeric component compare ignoring prerelease/build suffixes — slices after `>=`, splits off `-`/`+` suffixes, parses 3 components defaulting to 0, lexicographic-numeric ordering (`plugin-manifest.ts:175-194`). Discovery refuses the plugin when the host is older than the minimum (round3 S3 engine gate; consumed in `discoverPlugins({pluginsDir, devPluginPaths, hostVersion})`, wired from options at `plugin-service.ts:153-158`).
2. **API major pin**: `pluginApi: z.literal(1)` — a manifest targeting any other major fails schema parse outright (`plugin-manifest.ts:96`). Within major 1, each host-API method carries `since` ('1.0' today) and `stability: 'experimental'` (`shared/plugins/plugin-host-api.ts:100-104`, factory forcing stability :115-120) — additive-only evolution promised once frozen, none before (`plugin-host-api.ts:16-18`).
3. **Manifest revision equality at activation**: worker reuse requires exact spec equality including `manifestRevision = JSON.stringify(parsed manifest)` so dev hot reload can never reuse a worker with stale contributions (`main/plugins/plugin-worker-spawn-spec.ts:12-21`, comparator :23-41 comparing pluginKey/rootDir/mainEntry/manifestRevision + SORTED capability lists).

## S6. LIFECYCLE HOOKS AND STATE TRANSITIONS

Plugin-visible lifecycle is exactly: `activate(FABRICA)` → (command invocations / event deliveries / host calls) → `deactivate()` → process exit.

- **activate**: awaited during init; ready sent only after it resolves (`plugin-host-runtime.ts:119-120`).
- **deactivate**: optional export, validated as function at load (:88-91); invoked exactly once on `shutdown` message, guarded by a `shuttingDown` latch so duplicate shutdown messages are ignored (:188-198); deactivate errors are logged (sliced 8192) but do NOT prevent exit(0) (:193-197).
- **Host-side lifecycle states** (`PluginRunState`): inactive | running | restarting | errored (`main/plugins/plugin-supervisor.ts:11`).

Full transition map (host side):

| Trigger | Transition | Cite |
|---|---|---|
| ensureActive begins fresh | markRunning(resetRestarts:true) — fresh activation gives flaky plugin a clean slate | `plugin-worker-manager.ts:102`, `plugin-supervisor.ts:62-70` |
| unexpected exit, restarts < max | restarting, attempt N scheduled after backoff[attempt-1] | `plugin-worker-manager.ts:170-185`, `plugin-supervisor.ts:84-92` |
| restarts ≥ maxRestarts (default 3) | errored — blocks future ensure until a fresh activation resets counter | `plugin-supervisor.ts:84-87`; block at `plugin-worker-manager.ts:79-81` |
| host-initiated deactivate or idle reap | inactive + history cleared (crashed:false path) | `plugin-supervisor.ts:73-78`; reap at `plugin-worker-manager.ts:250` |
| exit of untracked plugin | ignored (inactive) | `plugin-supervisor.ts:80-83` |
| supervisor reset on deactivate | entries deleted | `plugin-worker-manager.ts:229`, `plugin-supervisor.ts:94-97` |

Backoff schedule default `[500, 2000, 5000]` ms, last entry reused past end; misconfig guarded (maxRestarts<0 or empty backoff throws at construction) (`plugin-supervisor.ts:31-34, 42-52`).

## S7. ACTIVATION ORCHESTRATION — CONTROLLER → MANAGER → STARTUP → SLOT POOL

Four layers, each with a single responsibility:

**Layer 1 — PluginWorkerController** (`plugin-worker-controller.ts`): the approval-and-registration wrapper.
- `ensure(plugin)` re-checks approval TWICE around async work: assertCurrentApproved before content verify (:74), again after spec build (:84-87) so a plugin disabled mid-activation is deactivated and errored rather than left running. Between checks it runs `contentVerifier.verify` (instructional-content hash vs consent-bound identity) and `resolveContainedPluginArtifact(main)` (worker entry realpath containment + size cap) (:75-76).
- Post-ready validation: every command id reported by the child must exist in `manifest.contributes.commands` minus declarative aliases; an undeclared registration DEACTIVATES the plugin (:88-99). This closes the ready-payload trust gap from S2.2 — the parent treats the child's claimed commands as unverified claims checked against the reviewed manifest.
- Successful activation registers each command into the extension registry as a `PluginWorkerCommand {commandId, invoke}` under `PLUGIN_COMMAND_EXTENSION_POINT`, then records the spawn spec (:101, :152-170).
- `reconcile(nextSpecs)`: any tracked/registered plugin whose spec changed or vanished gets registry.clearPlugin + deactivate (:119-131).

**Layer 2 — PluginWorkerManager** (`plugin-worker-manager.ts`): lazy activation, bounded capacity, restart policy, cancellation, idle reap (header :46).
- `ensureActive(spec)` loop: if a live worker or pending activation with an EQUAL spec exists, join it (existing handle or pending task promise); if specs differ, deactivate first and re-check — comment: refresh/trigger races can present a new dev manifest while the old revision is still starting; callers must never join a stale activation by key alone (:82-99).
- Generation counters: every deactivate/reap/dispose bumps `generations[pluginKey]`; activations capture their generation and abort via `isCancelled` when it moves (:100, :288-304). Stale restart completions are dropped in handleUnexpectedExit via detach+cancel check (:175-180).
- Early-exit detection: `completeStart()` flips startCompleted AFTER the factory resolves; an exit arriving before that is recorded and thrown as `worker exited immediately after ready` instead of entering the crash-restart path (`plugin-worker-manager.ts:152-157`; flag mechanics `plugin-worker-startup.ts:66-86`). This distinguishes a binary/entry that dies instantly (config error class) from a later crash (transient class).
- Idle reap: workers with 0 in-flight calls AND lastActivity older than idleReapMs (default 5 min) are disposed, marked inactive (crashed:false), lease released; reap loop scheduled by housekeeping every 60s unref'd timer (`plugin-service-housekeeping.ts`, wired `plugin-service.ts:178-183`; reap body `plugin-worker-manager.ts:238-260`).
- `deactivate`: bumps generation → aborts pending activation controller → disposes handle (shutdown message + grace) → releases lease; all awaited concurrently (:220-236).
- `disposeAll`: marks disposed, aborts everything, disposes slot pool, awaits all stopping tasks (:262-286).

**Layer 3 — startPluginWorkerAttempt** (`plugin-worker-startup.ts`): slot acquisition wraps the factory call; on failure the half-started handle is disposed and the lease released in finally (:49-98). Lease release discipline is deterministic across startup failure, detach, reap, dispose.

**Layer 4 — PluginWorkerSlotPool** (`plugin-worker-slot-pool.ts`): FIFO waiter queue with capacity `maxActive ?? 5` (`plugin-host-protocol.ts:113-114`). Immediate grant ONLY if free slots AND empty queue (:36-39) — this preserves FIFO fairness against barging callers. Abort-aware waiters clean themselves up and drain (:40-63). Dispose rejects all waiters (:65-74). Capacity must be a positive integer else constructor throws (:23-27).

## S8. FAILURE HANDLING & SUPERVISION (FULL CATALOG)

Timeout/kill budget (`main/plugins/plugin-host-process.ts`):

| Budget | Value | On miss | Cite |
|---|---|---|---|
| READY_TIMEOUT | 10s (`PLUGIN_WORKER_READY_TIMEOUT_MS`, protocol :108) | fail startup + SIGKILL | :151-154 |
| INVOKE_TIMEOUT | 30s (:109) | reject that call only (pending entry removed, worker kept) | :269-272 |
| EVENT_TIMEOUT | 5 min per delivered event (:19) | log error + SIGKILL whole worker | :288-292 |
| MAX_PENDING_EVENTS | 64 concurrent unacked events (:20) | log error + SIGKILL (backpressure-by-execution: a stalled event pump kills the worker) | :281-285 |
| SHUTDOWN_GRACE | 2s between shutdown message and SIGKILL (:16-18) | force kill; long enough for cleanup, short enough that disable/quit never feels stuck | :306-319 |
| Output line cap | 8192 chars/line | truncation suffix appended; unterminated streams bounded | `plugin-worker-output-buffer.ts:5-6, 44-51` |

Crash/fault paths:

1. Child fatal message → startup fail + reject ALL pending calls + SIGKILL (`plugin-host-process.ts:242-247`). Parent-side `fatal` handler ensures even post-ready channel faults reject in-flight calls instead of letting each hit its own timeout (:168-175).
2. Unexpected exit → all pending rejected (`rejectAllPending`, :120-130, wired at exit :132-139) → supervisor decision → restart with backoff or errored (`plugin-worker-manager.ts:170-185`).
3. Disconnect while alive → SIGKILL so the ensuing exit enters NORMAL supervision/backoff instead of a zombie-without-channel state (`plugin-host-process.ts:140-147`; child-side counterpart exits 0 at `plugin-host-entry.ts:37-41`).
4. Restart loop mechanics (`plugin-worker-restart-loop.ts`): await backoff abortably (timer unref'd, abort listener races the timer :7-23) → assertActive (generation/abort check BETWEEN attempts :38, :42) → start → on failure record decision; non-restart throws the caller-supplied erroredError (:39-48).
5. Errored state surfaces to UI through `PluginService.activationError`: kill-list block reason takes precedence, then content-pack registry error, then worker activation error (`plugin-service.ts:229-236`).
6. Event delivery failures never throw into emitters: manifest-subscribed delivery logs a warn and drops (`plugin-event-delivery.ts:34-39`); dynamic-subscription delivery is fire-and-forget onto running workers only (:40-45).
7. Host-call errors become outcomes, never exceptions, at the process relay (`void options.executeHostCall(...).then(...)` — no catch needed because executePluginHostCall always resolves an outcome; `plugin-host-process.ts:218-235`).
8. Log ring per plugin capped at 200 lines in-memory (`plugin-log-buffer.ts:3, 12-18`) — a chatty plugin cannot grow main memory via logs.

## S9. HOST↔PLUGIN IPC — THE ONE CHOKEPOINT

Every host-API call from ANY transport converges on one chain:

```
child hostCall ──fork IPC──▶ startPluginWorker message switch (viaPanel:false)
panel postMessage ──────────▶ PluginPanelController.execute (viaPanel:true)
relay RPC plugins.hostCall.worker/.panel ─▶ registerRelayPluginHostCallHandlers
        │
        ▼
PluginService.executeHostCall(pluginKey, method, params, {viaPanel})   [plugin-service.ts:250-272]
        ▼
executePluginHostCallRequest: envelope zod strict {method ≤128 chars} + identity check
  + resolvePolicy(pluginKey) host-side                                    [plugin-host-call-adapter.ts:30-57]
        ▼
executePluginHostCall: gate → binding lookup → params schema → services null-check
  → mutation audit-intent BEFORE handler → handler → RESULT schema validate → audit ok/error [plugin-host-methods.ts:31-118]
```

Key runtime facts per stage:

- **Authority resolved host-side only**: resolvePolicy returns grantedCapabilities from `getGrantedCapabilities` (null unless valid + contentPacksReady + consent-approved + not kill-listed — `plugin-service.ts:216-246`), fresh bound services, and the audit log. The child's copy of capabilities is never consulted for decisions.
- **Gate order matters**: unknown_method → panel_forbidden (viaPanel && !panel-action) → consent_required (grantedCapabilities === null) → capability_denied (`shared/plugins/plugin-capability-gate.ts:34-63`). Comment at :46-48: a disabled/unknown/stale-consent plugin fails EXACTLY like an ungranted capability — no probe-able distinction for plugin code (prevents consent-state oracles).
- **Audit-intent-before-handler**: mutations require an audit record AWAITED before the handler runs; audit unavailable ⇒ refused (`unavailable`); intent-write failure ⇒ action_failed, mutation never attempted (`plugin-host-methods.ts:72-91`). Audit summaries are bounded and content-free per method (terminal=ID bytes=N enter=bool; titleChars=N; key=name) — user text never lands in the audit log (:120-144).
- **Result-schema enforcement**: handler results failing the spec result schema return internal action_failed rather than leaking unvalidated shapes into plugin-facing transports (:97-107).
- **Binding completeness invariant**: module load throws if HANDLERS.size !== PLUGIN_HOST_API_V0.length — a facade schema without a binding fails at import time, before any plugin observes transport-specific behavior (`plugin-host-method-bindings.ts:173-177`).
- **terminal.sendText anti-redirect**: handler re-lists the active worktree terminals IMMEDIATELY before routing and refuses terminals outside it — terminal handles are provider-owned and can outlive focus changes; a delayed plugin write must not be redirected into another pane (`plugin-host-method-bindings.ts:92-110`; design rule also encoded in API docs `plugin-host-api.ts:45-51`). workspace.readContext deliberately projects out provider-path-bearing worktreeId and clamps label/id lengths (:72-90, service projection `plugin-host-service-bindings.ts:38-60`).
- **Per-call fresh stores**: storage/secrets/settings construct a new per-plugin store object PER CALL bound to `<publisher>.<id>` own files — one plugin path cannot resolve into another (`plugin-host-service-bindings.ts:66-83`).
- **Relay parity**: the headless relay registers two RPC methods whose viaPanel bit is fixed BY THE REGISTERED METHOD NAME, so remote callers cannot promote a panel call to the wider worker set via params (`relay/plugin-host-call-handler.ts:13-14, 64-68`); identity comes from a connection-keyed resolver, admission budgets applied for panel lane (:32-53). Conformance tests run identical cases against desktop and relay enforcement (`plugin-capability-gate.ts:5-12` header).

## S10. EVENT PLANE AT RUNTIME

- Closed event set v0: worktree.created / worktree.removed / agent.status.changed (`shared/plugins/plugin-manifest.ts:63-70`).
- Two subscription classes (`plugin-event-bus.ts` header): manifest `contributes.events` = durable activation triggers; dynamic `events.subscribe` calls = die with the worker that made them (`clear` invoked from manager onWorkerGone wiring `plugin-service.ts:96`).
- Payload projection validates/bounds payloads against per-event schemas BEFORE any plugin sees them; malformed payloads silently dropped (`plugin-event-bus.ts:33-41`, `plugin-event-delivery.ts:19-22`).
- Delivery rule: manifest-subscribed + has main ⇒ ensure(worker) THEN deliver — event arrival ACTIVATES the subscribed worker; dynamic-only ⇒ deliverEventIfRunning, never activates (`plugin-event-delivery.ts:27-46`).

## S11. EXTENSION REGISTRY (RUNTIME REGISTRATION SURFACE)

Phantom-typed extension points; P0 points experimental, excluded from compatibility guarantees (`shared/plugins/plugin-extension-registry.ts:1-8, 21-38`). Currently one point exists: `PLUGIN_COMMAND_EXTENSION_POINT('command')` holding `PluginWorkerCommand {commandId, invoke}` where invoke lazily activates the worker on first call (:28-38; lazy proxy semantics enforced upstream in `invokeCommand` at `plugin-service.ts:280`). Registry operations: register returns an unsubscribe closure; resolve without providerId takes FIRST registration (safe only for single-provider plugins — documented caveat :80-82); clearPlugin wipes all points for a key (used on deactivate/reconcile, `plugin-worker-controller.ts:126, 134, 157`).

## S12. CLI-AGENT-MANAGEMENT RELEVANCE (plugins as agent-capability packages)

Direct seams for the After-Rebrand direction (desktop CLI-agent management platform):

1. **The FABRICA api object is already shaped like an agent tool surface** (`plugin-host-runtime.ts:20-36`): commands ≈ tools, events.on ≈ triggers, host.call ≈ gated side-effect API, grantedCapabilities ≈ declared permissions. An agent-capability package model could adopt this contract nearly verbatim, with `agents` manifests already reserved in contributions (round3 S1; `plugin-manifest.ts:116-119`).
2. **Capability gate maps to agent-permission UX**: deny-by-default, closed kind set, consent fingerprinting, indistinguishable denial codes (`plugin-capability-gate.ts:46-54`) is exactly the permission model needed when agents gain terminal.sendText-grade powers. The explicit-terminal anti-redirect rule (`plugin-host-method-bindings.ts:102-107`) is a transferable invariant for multi-pane agent orchestration (never let a queued write follow focus).
3. **Supervision IS agent-run supervision**: runState FSM + maxRestarts/backoff + early-exit classification + idle reap (`plugin-supervisor.ts`, `plugin-worker-manager.ts:238-260`) solve the same lifecycle problem as long-running agent processes; errored-state surfacing via activationError (`plugin-service.ts:229-236`) is the UI hook for broken agents.
4. **Slot pool = concurrency governor**: cap of 5 active workers with FIFO fairness (`plugin-worker-slot-pool.ts:36-39`) is a template for bounding concurrent agent sandboxes per machine.
5. **Gaps to close for agent packages**: (a) raw Node power post-activate contradicts least-privilege for autonomous agents — would need a restricted runtime mode (e.g., interpreter/injection-based SDK without native modules, or per-plugin OS sandbox profiles); (b) host API has NO exec/spawn/fs method today — agent packages will demand one, which forces building the audited execution primitive that terminal.sendText only gestures at; (c) event set lacks agent-domain events (run started/finished/token spend) — the closed enum plus payload-schema pattern extends cleanly (`plugin-events.ts` schemas); (d) `since`/stability fields exist but no runtime negotiation beyond literal pluginApi pin — multi-version agent SDK support needs a real handshake (init message is the natural place, `plugin-host-protocol.ts:11-20`).

## S13. KEY INVARIANTS (RUNTIME SLICE)

- Nothing executes during install; execution begins only at fork+activate of an approved, hash-consistent tree (controller double-approval + content verify, S7).
- Both protocol directions zod-walled; unknown messages ignored, never crash (S3).
- Authority is recomputed host-side per call; child-held capability copies are advisory only (S9).
- Mutations are audit-intent-before-handler; audit outage blocks writes (S9).
- Every timeout ends in either a targeted rejection (invoke) or a supervised SIGKILL (ready/event/pending-cap/disconnect/shutdown-grace) — no unbounded waits anywhere (S8).
- Worker reuse requires full spec equality incl. manifestRevision and sorted capabilities — stale-contribution reuse impossible even under dev hot reload (S5/S7).

## SCAN COVERAGE STATEMENT

Scanned line-by-line (full reads): `src/main/plugins/plugin-host-entry.ts` (41 lines, complete), `plugin-host-runtime.ts` (210, complete), `plugin-host-process.ts` (332, complete), `plugin-worker-controller.ts` (171, complete), `plugin-worker-manager.ts` (309, complete), `plugin-supervisor.ts` (98, complete), `plugin-worker-startup.ts` (99, complete), `plugin-worker-spawn-spec.ts` (41, complete), `plugin-worker-restart-loop.ts` (50, complete), `plugin-worker-slot-pool.ts` (102, complete), `plugin-worker-env.ts` (52, complete), `plugin-worker-output-buffer.ts` (70, complete), `plugin-worker-reconciliation.ts` (22, complete), `plugin-event-bus.ts` (42, complete), `plugin-event-delivery.ts` (48, complete), `plugin-log-buffer.ts` (20, complete), `plugin-command-invocation.ts` (13, complete), `plugin-host-methods.ts` (144, complete), `plugin-host-method-bindings.ts` (181, complete), `plugin-host-service-bindings.ts` (86, complete), `plugin-host-call-adapter.ts` (57, complete), `plugin-service.ts` (338, complete), `src/shared/plugins/plugin-host-protocol.ts` (114, complete), `plugin-host-api.ts` (269, complete), `plugin-capability-gate.ts` (63, complete), `plugin-extension-registry.ts` (98, complete), `plugin-manifest.ts` (lines 60-214 read; lines 1-59 schema preamble covered by round3 S1), `src/relay/plugin-host-call-handler.ts` (69, complete). Grep-assisted cross-checks: plugin-service wiring sites, engine-range usages, executeHostCall call graph across main/shared/relay. Skipped (deliberate): test files (`*.test.ts`, integration/conformance suites), renderer-side panel mount internals (round3 + fabrica-app-renderer.md coverage), install/marketplace/kill-list/content-pack internals (round3 coverage — cited here only at their runtime chokepoints). Sources unmodified (read-only pass).
