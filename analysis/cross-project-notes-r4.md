# Cross-Project Feed Notes v2 — Round 4 Waves 4–7

> **Task:** ATLAS R4-3.4 (task_ba095fb07ee0 / dispatch ctx_290fa1c78d61)
> **Purpose:** Paste-ready task notes distilled from eight Round 4 discovery reports (waves 4–7), formatted so an orchestrator can drop each note directly into a target project's board WITHOUT reading the source reports. Every note is self-contained: context, the ask, citations, verification status.
> **Distinct from R4-3.3:** this file does NOT modify `round4-findings-digest.md` or any digest content — it produces standalone NOTES only.
> **Primary target:** `Fabrica-app/` (the After-Rebrand codebase). Source repos (`_sources/mission-control`, `_sources/buzz`) appear only as donor patterns.
>
> Citation paths are relative to the repo named in each note's Source line. Documents written before 2026-08-21 may omit the `Fabrica-atlas/` prefix (see AGENTS.md path-migration notice).

---

## Verification Status Legend & Summary

| Status | Meaning |
|---|---|
| VERIFIED-PASS | Dedicated spot-verification pass vs sources found 0 failed citations |
| HYGIENE-ONLY | Encoding + coverage-statement hygiene passed (R4-4.3); NO dedicated content spot-verification yet |

| Source report | Verify pass | Status |
|---|---|---|
| `discovery/round4/mc-execute-guards.md` | `verify/round4-wave5-spot-verification.md` | VERIFIED-PASS (~75 cites: 73 exact / 2 cosmetic / 0 failed; dead-SOFT_LIMIT negative claim independently reproduced) |
| `discovery/round4/fa-plugin-runtime.md` | `verify/round4-wave5-spot-verification.md` | VERIFIED-PASS (same pass; both reports PASS) |
| `discovery/round4/fa-agent-hooks-probes.md` | `verify/round4-wave6-spot-verification.md` | VERIFIED-PASS (44 cites: 41 exact / 3 minor / 0 failed; headline 14-managed / 18-live counts independently reproduced from source) |
| `discovery/round4/fa-telemetry-consent.md` | `verify/round4-wave4-spot-verification.md` | VERIFIED-PASS (37 cites sampled across wave-4 pair: 36 exact / 1 minor / 0 failed) |
| `discovery/round4/fa-command-palette-search.md` | `verify/round4-wave4-spot-verification.md` | VERIFIED-PASS (same pass; known minor cite drift: `shouldFilter` cited at WorktreeJumpPalette.tsx:2492, actual :2480 — content correct) |
| `discovery/round4/mc-fieldtask-kanban.md` | `verify/round4-wave7-spot-verification.md` | VERIFIED-PASS (64 sample groups / ~115+ cites: 61 EXACT / 2 MINOR / 1 COSMETIC / 0 FAILED; headline findings incl. kanban no-FSM, awaiting-signature enum drift validations.ts:365 vs types.ts:420, dead scheduledFor all independently reproduced) |
| `discovery/round4/mc-decision-gates.md` | `verify/round4-wave7-spot-verification.md` | VERIFIED-PASS (same pass; finding F3: report §2.3 mischaracterizes `withDecisions` as write-back — it is a read-only-in-lock helper. Does not affect blocking/injection mechanics used below) |
| `discovery/round4/fa-wsl-remote-execution.md` | none (only `verify/round4-post-audit-hygiene.md`: strict UTF-8 clean + coverage stmt present) | HYGIENE-ONLY |

---

## How To Use These Notes

Each note below has:

- **Target board** — which project's task file it belongs in.
- **Source** — the Atlas discovery report(s) backing it (with verification status).
- **Paste-ready body** — a fenced block an orchestrator can copy verbatim into a target board task or note.
- **Key citations** — file:line evidence, already embedded inside the paste-ready bodies too.

Notes are numbered FA-N1…FA-N10 (Fabrica-app targets). MC/BZ repos are read-only donors; no notes propose modifying them.

---

# SECTION A — Notes targeting Fabrica-app (from Fabrica-app discovery)

## FA-N1 — Promote `TuiAgentConfig` into the provider-neutral runner contract (FA-T1 substrate already exists)

**Target board:** Fabrica-app
**Source:** `discovery/round4/fa-agent-hooks-probes.md` — VERIFIED-PASS

```
TASK: Provider-neutral agent runner — promote TuiAgentConfig to SpawnSpec, collapse 14 IPC channels, extract per-provider parsing.

CONTEXT: Fabrica-app already contains a ~31-agent launcher catalog (`src/shared/tui-agent-config.ts:20-47`, table body :49-331) that carries detectCmd / aliases / required commands / unsupported runtimes / launchCmd with per-platform overrides / prompt-injection modes / trust presets / binary-name mappings (e.g. antigravity→`agy` :165-170, cursor→`cursor-agent` :243-250, continue detects `cn` because `continue` is a shell builtin :236-242). The agent-hooks report calls it "a SpawnSpec-in-waiting" and assesses FA-T1 fit as HIGH with LOW risk of parallel machinery: MC's provider trio adds nothing beyond naming.

DELIVERABLES:
1. Define an explicit `SpawnSpec` contract derived from `TuiAgentConfig` fields (do not invent new shapes).
2. Replace the 14 copy-paste `agentHooks:<agent>Status` IPC handlers (`src/main/ipc/agent-hooks.ts:142-323`; channel list :55-68) with one dispatcher registered behind a single parameterized channel; mirror in preload (`src/preload/index.ts:2159-2185`) and web stub (`web-preload-api.ts:2986+`) — this avoids the three-layer rename migration risk flagged as FA-T11 friction.
3. Move per-provider status parsing + interrupt-inference quirks out of `src/main/agent-hooks/server.ts` (2,907 L single-file concentration risk) into profile-owned modules. Quirk examples to relocate verbatim: Droid Ctrl+C exits CLI (:799-801); opencode/copilot need double-Escape (:803-810); Claude AskUserQuestion Escape routes to inferQuestionAnswered (:811-818).

COUNT CORRECTION (adopt everywhere): 14 managed install targets (`src/shared/agent-hook-types.ts:6-21`) vs **18** live `/hook/<source>` pathnames (`src/shared/agent-hook-listener.ts:4418-4437`). Delta = opencode, mimo-code, pi, omp, prime-agent (live via plugins, not managed installers). Older "15 named CLIs" figures are wrong.

EVIDENCE: discovery/round4/fa-agent-hooks-probes.md §3, §9, §10 (44-cite spot verification PASS, verify/round4-wave6-spot-verification.md).
STATUS: verified finding.
```

## FA-N2 — Keep the zero-polling agent-status event-push architecture; do not regress to polling when refactoring

**Target board:** Fabrica-app
**Source:** `discovery/round4/fa-agent-hooks-probes.md` — VERIFIED-PASS

```
NOTE (constraint for any runner/status refactor): Fabrica-app's live agent-status refresh is fully event-push with NO polling anywhere: accepted hook POST → `webContents.send('agentStatus:set')` (`src/main/index.ts:1546-1564`); startup replay via one-shot `agentStatus:getSnapshot` pull (`src/main/ipc/agent-hooks.ts:112-119`); freshness is passive 30-min TTL evaluated lazily (`AGENT_STATUS_STALE_AFTER_MS`, src/shared/agent-status-types.ts:268).

Loopback receiver hardening to preserve in any rewrite: per-start random UUID token checked on every POST (`server.ts:2101, :2116-2120`); slowloris guard destroying stalled sockets (:2122-2125); fail-open 204 for malformed bodies so a broken hook never blocks an agent CLI (:2168-2172); launch-token disposition gate as anti-spoofing layer (:2149-2159); loopback bind `listen(0,'127.0.0.1')` (:2197-2198).

KNOWN TRADE-OFF: `FABRICA_AGENT_HOOK_TOKEN` sits in child env, readable by any pane-spawned process (`server.ts:2547-2552`) — inherent to the loopback-token model, mitigated by 127.0.0.1 bind only. Accept or redesign consciously; do not accidentally widen it.

EVIDENCE: discovery/round4/fa-agent-hooks-probes.md §5-§7.
STATUS: verified finding.
```

## FA-N3 — Plugin host runtime is the ready-made base for an agent-capability package model; four gaps must close first

**Target board:** Fabrica-app
**Source:** `discovery/round4/fa-plugin-runtime.md` — VERIFIED-PASS

```
TASK: Adopt the plugin host runtime as the substrate for installable agent-capability packages; close the four gaps below before promising third-party agent packages.

WHAT ALREADY EXISTS (reuse, don't rebuild):
- One forked Node child per plugin w/ `main` field, stdio ['ignore','pipe','pipe','ipc'] + serialization 'advanced' + execArgv [] flag-scrub (`src/main/plugins/plugin-host-process.ts:88-99`).
- Minimal SDK surface — exactly five members: commands.register, events.on, host.call, grantedCapabilities (advisory), log (8192-char cap) (`src/main/plugins/plugin-host-runtime.ts:18-36`).
- Zod-walled wire protocol both directions (`src/shared/plugins/plugin-host-protocol.ts:5-9, :95-102`); constants READY_TIMEOUT 10s / INVOKE_TIMEOUT 30s / IDLE_REAP 5min / MAX_ACTIVE_DEFAULT 5 (:108-114).
- Capability gate with indistinguishable denial codes (unknown_method → panel_forbidden → consent_required → capability_denied) preventing consent-state oracles (`src/shared/plugins/plugin-capability-gate.ts:34-63, :46-54`); audit-intent-before-handler, audit outage blocks writes (`plugin-host-methods.ts:72-91`).
- Supervision FSM: startup-fail SIGKILL (:151-154), invoke-timeout rejects only that call (:269-272), event flood kill (:281-292), shutdown grace 2s→SIGKILL (:306-319), restart backoff [500,2000,5000] maxRestarts 3 (`plugin-supervisor.ts:31-34, :84-92`).
- Slot pool cap 5 FIFO fairness — template for bounding concurrent agent sandboxes per machine (`plugin-worker-slot-pool.ts:36-39`).
- Three load-compat gates: engine range (`plugin-manifest.ts:175-194`), pluginApi literal pin (:96), exact manifestRevision equality for worker reuse (`plugin-worker-spawn-spec.ts:12-21`).

GAPS TO CLOSE (from report S12.5):
a. Post-activate() plugin code has RAW Node power inside its own process (OS-process isolation only) — needs a restricted runtime mode (interpreter/injection SDK or per-plugin OS sandbox profiles) before autonomous agents get this surface (`plugin-host-runtime.ts:20-36` context).
b. Host API has NO exec/spawn/fs method today; agent packages will demand one — design an audited execution primitive deliberately, don't let `terminal.sendText` become the de-facto one.
c. Closed event set lacks agent-domain events (run started/finished/token spend); closed-enum + payload-schema pattern extends cleanly (`plugin-manifest.ts:63-70`).
d. No version negotiation beyond literal pluginApi pin — add a real handshake in the init message (`plugin-host-protocol.ts:11-20`).

EVIDENCE: discovery/round4/fa-plugin-runtime.md §1-§12 (~110 cites; wave-5 spot verification PASS).
STATUS: verified finding.
```

## FA-N4 — Add an "Agents" section to the Cmd+J palette: plumbing is verified present, insertion point is tiny

**Target board:** Fabrica-app
**Source:** `discovery/round4/fa-command-palette-search.md` — VERIFIED-PASS (one cosmetic cite drift noted above)

```
TASK (cheap, high-value): surface agent operations in the Cmd+J WorktreeJumpPalette.

CONTEXT: The palette already merges seven result families into one ranked list (`WorktreeJumpPalette.tsx:258-266`; section build :917-1052, :1337-1424) but imports NEITHER searchTerminalQuickCommands NOR the ~30-agent catalog — quick commands can launch any catalogued TUI CLI agent with a preloaded prompt via `launchAgentInNewTab({agent, prompt, launchSource:'quick_command', ...})` (`lib/run-quick-command-in-new-tab.ts:55-77`; `launch-agent-in-new-tab.ts:135-140`), yet are invisible in Cmd+J today. Verified gap, not speculation.

WHY IT IS CHEAP:
- Palette action layer is tiny and extensible: 6 built-ins + plugin entries (`quick-actions.ts:59-182`) — natural insertion point.
- Telemetry is palette-ready with zero schema migration: 'command_palette' / 'workspace_jump_palette' already exist in launchSourceSchema (`shared/telemetry-events.ts:183, :189`, consumed by agentStartedSchema/agentPromptSentSchema :350-365); 'command_palette' is first WORKSPACE_SOURCE_VALUES entry (`shared/workspace-source.ts:2`).
- Free rebindable hotkey per agent: `tab.newAgent.<agent>` chord family exists unbound by default (`keybindings.ts:26, :1105-1127`).
- Define agent ops once as first-class actions → palette + keybindings + plugins all dispatch them (`lib/plugin-command-execution.ts:8-12`, `app-command-dispatch.ts:20-24`).
- Availability model global-vs-worktree-scoped with reason codes maps onto ops needing an active workspace/session vs app-level (`plugin-quick-actions.ts:25-28`; `quick-action-context.ts:92-126`).

SCOPE SUGGESTION: launch / resume / send prompt / switch account as the first four actions; keep matching hand-rolled (no fuzzy lib exists in-tree — two matcher families live in `lib/agent-picker-search.ts:94-123` and `components/quick-open-search.ts:75-108`; preserve the uniform 2 KiB DoS query guard `shared/clipboard-text.ts:70-75`).

EVIDENCE: discovery/round4/fa-command-palette-search.md §6-§9.
STATUS: verified finding.
```

## FA-N5 — WSL plane: mandatory-helper guardrails + risk register items that any After-Rebrand code must respect

**Target board:** Fabrica-app
**Source:** `discovery/round4/fa-wsl-remote-execution.md` — HYGIENE-ONLY (no content spot-verification yet; treat numbers as strong-but-unverified)

```
NOTE (guardrails for all WSL-touching work; several are regression traps):
1. NEVER hand-build `wsl.exe ... bash -c ...` strings. Two escaping layers defend `$`-preprocessing by wsl.exe argv (base64 wrap; backslash escaping) — "Any After-Rebrand code that builds its own wsl.exe bash -c strings without these helpers will break on paths/commands containing $" (`wsl-bash-command.ts:6-11`; `shared/wsl-login-shell-command.ts:5-18`). Use the helpers or extend them.
2. New FABRICA_* guest env vars MUST be registered in the WSLENV allowlist (`pty/wsl-fabrica-env.ts:76-99`) or they silently arrive empty inside WSL. Per-variable flags matter: `/u` cross-untranslated vs `/p` path-translated; e.g. OpenCode overlay dirs cross only as guest-side POSIX to avoid config-root hijack (:68-74).
3. WSL deletes are true in-guest `rm` (shell.trashItem cannot recycle WSL UNC items, #6415): omitting approvedRoots yields unrestricted in-guest rm -rf — keep containment mode's stat device:inode TOCTOU re-verification intact (`wsl-unc-delete.ts:43-61`; `wsl-contained-delete.ts:4-120`, exit code 65 FABRICA_WSL_DELETE_REJECT:<reason>).
4. Treat 9P (`\\wsl.localhost`) as hostile for stat/watch — plain Win32 calls "lie or stall"; fallbacks exist (`wsl.ts:72-102`; ipc/filesystem-watcher-wsl.ts). Do not add direct Win32 stat over UNC paths.
5. Avoid sync wsl.exe probes on the main thread (up-to-5s stalls each; async twin w/ staggered negative caching exists: retryable 45s / definitive 10min / backoff cap 30min — `wsl-availability.ts:13-17, :31-36, :95-98, :140-170`).
6. Auth state is per-runtime AND per-distro: deleting/reinstalling a distro silently invalidates Claude/Codex accounts (`claude-accounts/service.ts:927-998`) — surface this in UI before destructive distro ops.
7. Worktrees inside distro fs (`~/FABRICA/workspaces`) are invisible to backup tools scanning C:\ (`ipc/worktree-logic.ts:90-128`) — document or relocate consciously.
8. Execution-host identity model `local | ssh:<targetId> | runtime:<environmentId>` with worktree hostId precedence over repo inference is the join key between local/WSL and SSH/VM worlds (`shared/execution-host.ts:3-14, :51-57, :142-164`) — reuse it as THE host identifier in new features instead of inventing parallel enums. Ephemeral VMs ride reserved `runtime-ssh-` ids and must be filtered by enumerating tooling (:59-67).

EVIDENCE: discovery/round4/fa-wsl-remote-execution.md §12 risk register (items renumbered above), §0/§11.
STATUS: hygiene-passed only (R4-4.3); recommend a wave-8 spot verification before hard commitments cite line numbers.
```

## FA-N6 — Telemetry/diagnostics: privacy posture is keep-as-is; the real task is the 11-item rebrand leak register

**Target board:** Fabrica-app
**Source:** `discovery/round4/fa-telemetry-consent.md` — VERIFIED-PASS

```
TASK: During After-Rebrand, treat telemetry as a naming/migration problem, NOT an architecture problem — then clear every leak surface below.

KEEP (posture is already strong; do not redesign):
- Two isolated lanes ("nothing in src/main/telemetry/ imports from src/main/observability/ and vice versa" — observability/index.ts:6-11; wired at index.ts:2305, :2330-2331).
- Transmission requires BOTH compile-time constants (TELEMETRY_ENABLED true literal — client.ts:20-21; CI-injected FABRICA_BUILD_IDENTITY + FABRICA_POSTHOG_WRITE_KEY — electron.vite.config.ts:31-59, :274-282); no runtime env override can enable it; packed-app verify script config/scripts/verify-telemetry-constants.mjs:1-27.
- Consent resolver precedence incl. DO_NOT_TRACK, fail-closed pending_banner (`telemetry/consent.ts:76-109`; missing block fails closed :97-99). Keep DO_NOT_TRACK untouched during rename (consent.ts:77-80).
- Zod `.strict()` event schemas (~80 events) blocking raw error_message/error_stack off the wire (`shared/telemetry-events.ts:4, :367-374`; sole exception capped at 200 chars :773-778); burst caps 30/min per event (20/min agent_error), 1,000/session (`burst-cap.ts:1-16`).
- Diagnostics triple redaction + server-side install_id dropping + join-incompatible random submission IDs (`redactor.ts:17-42, :65-71`; bundle.ts:177-185; index.ts:193-197).
- Crash reporting fully custom, zero crashReporter usage, user-initiated only (`feedback.ts:17`; crash-reporting.ts:192-205).

CLEAR (11 leak surfaces — highest risk first):
1. Hardcoded endpoint https://www.onfabrica.dev/v1/feedback (feedback.ts:17)
2. Privacy doc URL https://www.onfabrica.dev/docs/telemetry (renderer lib/telemetry.ts:11)
3. Brand-prefixed event names app_starred_FABRICA etc. — renaming breaks PostHog funnels; use NEW event names per breaking-change convention (telemetry-events.ts:1424, :1427, :1469-1471)
4. Common prop FABRICA_channel on EVERY event+bundle (client.ts:62; telemetry-events.ts:1647; bundle.ts:48, :84)
5. Build-constant names + CI secrets + verify-script regexes must sync atomically (electron.vite.config.ts:45-59, :274-282; build-constants.d.ts:12-22; verify-telemetry-constants.mjs:1-27)
6. Env kill-switch renames cascade into docs/settings search/i18n across ≥5 locales (consent.ts:82-84; diagnostics.ts paths; en.json:8951-8955)
7. Consent reason literals crossing IPC ('FABRICA_disabled') need atomic rename main/renderer/i18n/tests (telemetry-consent-types.ts:15; api-types.ts:797; renderer lib/telemetry.ts:24)
8. On-disk artifacts %TEMP%/FABRICA-diagnostic-bundle-previews, FABRICA-diagnostics-*.ndjson (diagnostics.ts:167, :173; feedback.ts:174)
9. PostHog project continuity vs new project → historical funnel loss decision (electron.vite.config.ts:41; client.ts:29-36)
10. Locale search keyword "posthog" exposed in Settings search (en.json:8968; privacy-search.ts:23)
11. Diagnostics dialog copy "going to FABRICA support" (diagnostic-upload-endpoint.ts:24-25)

Items 5-8 merge into R4-1.15's broader FABRICA_* env-var/data-dir register (per report lines 345-347).

EVIDENCE: discovery/round4/fa-telemetry-consent.md §3-§11 (~60 cites; wave-4 spot verification PASS).
STATUS: verified finding.
```

---

# SECTION B — Notes targeting Fabrica-app (donor patterns from _sources/mission-control)

> Donor citations below are relative to `_sources/mission-control/mission-control/` (frozen reference repo — READ-ONLY; port patterns, not code).

## FA-N7 — Port the MC execute-guard stack as ONE ordered boundary layer (FA-T2); fix 7 known defects while porting

**Target board:** Fabrica-app
**Source:** `discovery/round4/mc-execute-guards.md` — VERIFIED-PASS

```
TASK: Implement the single composed guard stack at the IPC boundary (digest FA-T2, enforcement point register-core-handlers.ts:109-234) using mission-control's execute route as the reference for LAYER ORDER, not implementation style.

PORT AS-IS (patterns with donor cites):
1. Server-side risk table + "iron claw" — HIGH risk always requires approval even at full autonomy; `custom` always requires approval (`field-ops-security.ts:22-68`, esp. :53-55). Generalize to a destructive-agent-action taxonomy computed server-side at action-creation time.
2. Bypass detection as a named audited predicate invoked inside EVERY state-mutating handler (`field-ops-security.ts:104-126`; tasks/route.ts:204-220).
3. FSM-enforced status enums — map to typed Rust enums where applicable (`field-ops-security.ts:73-90`).
4. Sliding-window rate limiters made ATOMIC and persisted to SQLite (MC's is in-memory w/ check-then-act race — fix while porting) (`field-ops-security.ts` §5 of report).
5. Spend-limit ladder + pauseOnBreach fleet-wide brake as runaway-cost control (FA-T7 pairing) (`spend-tracker.ts:70-132`; breach pauses EVERY active mission in one mutexed mutation — execute/route.ts:190-200).
6. Circuit breaker dual placement (pre-check 409 + post-failure re-eval; trip = 3 consecutive failures, reset on any completed) around every agent-run dispatch loop (`tasks/route.ts:222-255`; execute/route.ts:507-532; field-ops-security.ts:158-176).
7. Decrypt-at-use / verify-always / zeroize-after / sanitized logging into the FA AI Vault (`route.ts:334-358, :375-396, :432-438`; vault-crypto.ts:29-39, :146-168).
8. Owner guard as structural role check rejecting agent-originated calls (`owner-guard.ts:23-30`).

FIX-BEFORE-PORT (do NOT replicate these MC defects):
a. Execute route has NO owner/agent check — services without credentialId run with zero auth beyond middleware (route.ts:101-208 vs owner-guard.ts:20-63). Put the owner check ON the execute-equivalent handler.
b. Creation-path approval hole: tasks can be BORN approved via POST accepting status verbatim (validations.ts:400; tasks/route.ts:109). Forbid creating actions already past their approval gate.
c. Batch approve bypasses bypass-detection (field-ops-security.ts:74) — identical transition+bypass gates on every mutation path incl. bulk.
d. Expired credentials still execute — enforce expiry at point of use.
e. Unlimited wrong-password retries on the password path (no rate limiter; scrypt ~100ms is the only throttle, vault-crypto.ts:30) — wire rate limiting onto it.
f. Dead config SOFT_LIMIT / DELAY_PER_ATTEMPT_MS declared but never referenced (independently reproduced during verification) — delete or implement dead config; don't ship decorative knobs.
g. Ad-hoc adapter invocation outside the guard stack (/wallet synthesizes an approved task and calls adapter.execute directly — wallet/route.ts:115-142): restrict ad-hoc capability probes to read-only/dry-run.

EVIDENCE: discovery/round4/mc-execute-guards.md §14 weakness register, §15 port map (~120 cites; wave-5 spot verification PASS).
STATUS: verified finding.
```

## FA-N8 — Adopt MC's human-decision queue interaction pattern for operator intervention; fix W1/W2/W5-class defects in the port

**Target board:** Fabrica-app
**Source:** `discovery/round4/mc-decision-gates.md` — VERIFIED-PASS (with finding F3 noted in the status table; does not affect the mechanics below)

```
TASK: Build Fabrica's operator-intervention layer on mission-control's decision-queue SHAPE — verdict from source report: "HIGH fit as the interaction pattern."

PORT THESE PATTERNS:
1. Block-with-payload error responses: MC's manual-run API returns 400 embedding the FULL oldest pending DecisionItem so the UI modal renders without an extra fetch (`api/tasks/[id]/run/route.ts:96-124`). IPC equivalent: main replies { blockedByDecision } with the whole intervention object attached.
2. Intercept-and-rerun loop: failed run w/ pendingDecision payload opens dialog instead of error toast; on answer, dialog closes and re-invokes run automatically (`use-active-runs.ts:116-144, :146-155`; decision-dialog.tsx:77-78). Maps 1:1 onto Fabrica's run-start button flow.
3. Multi-surface ambient awareness without new infra: sidebar badge (10s poll), dashboard widget, derived "awaiting-decision" agent-status (`page.tsx:100-127`) — portable trick: derive state from the set of blocked ids.
4. Structured escalation questions with fixed option trio (Retry-with-different-approach / Skip-task / Stop-mission) + error forensics injected into context, auto-created after MAX_LOOP_ATTEMPTS=3 daemon loop failures (`scripts/daemon/run-task.ts:485-544`, constant :374).
5. Answers-as-prompt-context: operator answer injected verbatim into every future prompt of that task wrapped in imperative do-not-repeat fencing ("Retry Instructions - Read Carefully") (`prompt-builder.ts:264-321`; appended :497-499).

SCHEMA REFERENCE: DecisionItem = id/requestedBy/taskId/question/options/context/status(pending|answered)/answer/answeredAt/createdAt (`types.ts:304-318`); Zod limits CONTEXT 5000 / QUESTION 500 / ANSWER 500 / MAX_OPTIONS 20 (`validations.ts:47-62`).

FIX-BEFORE-PORT:
a. No consumption marker exists — answered decisions re-inject FOREVER and only the LATEST answer is used (W4/W5, prompt-builder.ts:287-297, :497-499). Add applied-after-first-injection semantics + inject the full ordered answer chain.
b. File+mutex storage races cross-process with raw fs daemon writes (W2, run-task.ts:538 vs data.ts:353-356/:184) — use a transactional store keeping the JSON schema shape; make resumption event-driven, not 300ms-delay + polling (W6).
c. No auth on decisions endpoints (W1), silent unaudited DELETE (W3, route.ts:129-141), duplicate-guard checks pending-only so failures churn unbounded duplicates (W7, run-task.ts:512-516), no TTL on pending decisions (W9), script drift writes invalid status:"dismissed" that vanishes from all views (W8, fix-stuck-tasks.js:26-34) — enumerate real dismissed/expired statuses, audit deletes, dedupe across full history.
d. Design note: keep BOTH intervention tiers sharing ONE UI surface — generic decision queue (task-progress level, freeform) vs risk-tiered execution approvals (FA-N7); MC splits them across two UIs, fragmenting operator attention.

EVIDENCE: discovery/round4/mc-decision-gates.md §4-§10 (six blocking enforcement points mapped; wave-7 spot verification PASS).
STATUS: verified finding.
```

## FA-N9 — Use MC's dual task domain as the skeleton of Fabrica's core task model (human kanban + agent-action FSM)

**Target board:** Fabrica-app
**Source:** `discovery/round4/mc-fieldtask-kanban.md` — VERIFIED-PASS

```
TASK: Adopt mission-control's two-domain task split as the skeleton of Fabrica's core task model — verdict from source report: "HIGH fit as the SKELETON of Fabrica's core task model."

MODEL TO ADOPT:
- Domain 1 — human planning: regular Task + kanban (exactly three states, free any-to-any dnd, no FSM; only derived rule = completedAt stamping) + Eisenhower priority quadrants (`status-board/page.tsx:74-82`; `api/tasks/route.ts:329`; quadrant helpers types.ts:387-414). This is the "user gives goals" surface.
- Domain 2 — machine execution: FieldTask with an 8-state allow-list FSM (draft/pending-approval/approved/executing/awaiting-signature/completed/failed/rejected; transitions field-ops-security.ts:73-82) + risk-tiered approvals + owner-only approve/reject + bypass detector (draft→approved = 403) + circuit-breaker pre-check (`api/field-ops/tasks/route.ts:170-257`). This is the agent-action execution contract.
- Bridge between domains: FieldTask.linkedTaskId → Task.id (`types.ts:464`) and reverse Task.fieldTaskIds (`types.ts:176`), auto-maintained on creation (`api/field-ops/tasks/route.ts:147-165`).
- Coordination without transport infra: delegation-as-inbox-message — assignment side effect posts a "delegation" InboxMessage + ActivityEvent; completion triggers an agent completion-report message back to "me"; dependency-unblock notifications close the loop (`api/tasks/route.ts:39-59, :302-307, :104-128, :130-162`). blockedBy lists + unblock notification are sufficient for DAG-ish flows.
- Persistence pattern worth keeping: per-file mutex lock-read-mutate-write (`data.ts:458-471`).
- Pre-flight gating precedent: regular-task run route performs 7 ordered checks incl. "no pending DecisionItem for this taskId", returning 400 with the oldest pending decision embedded (`api/tasks/[id]/run/route.ts:97-124`) — pairs with FA-N8.

FIX-BEFORE-PORT:
1. No assignment integrity — AgentRole accepts any string, no FK validation against agents.json (validations.ts:13); typo'd assignee silently accepted. Replace string-role assignment with registry-resolved agent references (Fabrica has the registry: TUI agent catalog, see FA-N1).
2. Kanban has no guardrails — risky if agents ever write kanban directly; decide agent-write policy explicitly.
3. FieldTask.blockedBy never enforced by any run gate — add the gate if porting blockedBy.
4. scheduledFor is dead (declared, zero consumers repo-wide) — wire a scheduler or drop it; do not port dead fields.
5. Zod/type enum drift on awaiting-signature: create/update schema omits it (validations.ts:365 vs types.ts:420 — independently reproduced during verification). Have ONE source of truth for state enums.
6. No numeric priority or due-date enforcement on the field side — Fabrica's multi-agent scheduling likely needs priority/queue fields; add them deliberately.
7. Approval identity hardcodes actor === "me" (`owner-guard.ts:23-30`) — no delegation-of-approval or approver roles; design multi-operator approval consciously.
8. Two activity logs + two inboxes bridged ad hoc by field-ops-notify.ts — consolidate rather than re-port the bridge.
9. ID generation via Date.now() risks collision under burst writes — use uuid/cuid.

EVIDENCE: discovery/round4/mc-fieldtask-kanban.md §10 (~120 cites across 20 files; wave-7 spot verification PASS).
STATUS: verified finding.
```

## FA-N10 — Sequencing note tying FA-T2/T7/T8 together (guard stack + decision queue + task model)

**Target board:** Fabrica-app
**Sources:** `discovery/round4/mc-execute-guards.md`, `mc-decision-gates.md`, `mc-fieldtask-kanban.md` — all VERIFIED-PASS

```
NOTE (for whoever sequences the MC-pattern ports): the three donor systems interlock and should land in a deliberate order:

1. Task model first (FA-N9): define the two-domain skeleton + ONE source of truth for state enums. Everything else hangs off these states.
2. Guard stack second (FA-N7): the ordered boundary layers operate ON the FieldTask-style FSM states (transitions, approvals, bypass detection, circuit breaker). Porting guards before the FSM exists invites hand-inlined per-route guard copies — exactly the MC implementation flaw the report warns against ("MC's middleware→per-route→hand-inlined split produced the §14 inconsistencies; use it as reference for layer ORDER not style").
3. Decision queue third (FA-N8): its blocking enforcement points hook into run entry points that only exist once the task/run model lands; its escalation option trio and answer-injection feed the same prompts the runner (FA-N1) executes.

Cross-cutting acceptance criteria: every state-mutating handler carries the named bypass predicate; no action can be created past its approval gate; one enum definition per state machine; operator answers have consumption semantics; rate limiters atomic+persisted.

EVIDENCE: synthesis of the three wave-5/7 reports above.
STATUS: verified findings, sequencing judgment by Atlas R4-3.4.
```

---

## Coverage Statement (this file)

- **Read in full:** `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` (508 lines — Checkpoint, Group tables, Session Ledger); `verify/round4-wave6-spot-verification.md` (112 lines, complete); `verify/round4-post-audit-hygiene.md` (54 lines, complete); AGENTS.md (system-injected).
- **Read via parallel extraction subagents (full-report reads, structured returns transcribed into notes above):** all 8 target discovery reports — mc-execute-guards.md, fa-plugin-runtime.md, fa-wsl-remote-execution.md, fa-agent-hooks-probes.md, fa-telemetry-consent.md, fa-command-palette-search.md, mc-fieldtask-kanban.md, mc-decision-gates.md. Citations in the notes were transcribed from the reports' own text (extractors instructed not to invent cites); verification statuses taken directly from the verify passes + ledger rows.
- **Verified on disk:** verify/ directory listing confirmed (13 files incl. round4-wave4/5/6/7-spot-verification.md and round4-post-audit-hygiene.md); analysis/ directory listing confirmed (no pre-existing cross-project-notes-r4.md — new file).
- **Not read:** full bodies of verify/round4-wave4/wave5/wave7 reports (statuses taken from the Verification Tracker table + Session Ledger rows 437/441/446, which record their totals verbatim); round4-findings-digest.md (owned by R4-3.3, deliberately untouched); anything under `_sources/` or `../Fabrica-app/`.
- **Files modified this session:** this report (`analysis/cross-project-notes-r4.md`, written in 5 chunks due to single-write size limits) + status/checkpoint updates in `Fabrica-atlas-tasks.md`. No source files touched anywhere.

*Report end - ATLAS R4-3.4.*




