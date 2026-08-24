# Round 4 Findings Digest — Cross-Project Feed

> ATLAS R4-3.2 · task_164966b0adc9 · dispatch ctx_04a3444ea66d · Group 3 synthesis · 2026-08-23
>
> Purpose: digest all nine Round 4 discovery reports plus the R4-2.3 spot-verification into a single feed the orchestrator can convert into task-ready notes for OTHER projects' boards (never worked here directly — AGENTS.md High-Level Goal 5).
>
> Inputs (all read in full this session):
>
> | # | Report | Size |
> |---|---|---|
> | 1 | `.Fabrica-atlas-board/discovery/round4/fa-ipc-watchers.md` | 425 lines / 66KB |
> | 2 | `.Fabrica-atlas-board/discovery/round4/fa-pty-terminal.md` | 405 lines / 27.5KB |
> | 3 | `.Fabrica-atlas-board/discovery/round4/fa-autoupdate-build.md` | 284 lines / 38KB |
> | 4 | `.Fabrica-atlas-board/discovery/round4/bz-db-schema.md` | 377 lines / 50KB |
> | 5 | `.Fabrica-atlas-board/discovery/round4/bz-relay-event-kinds.md` | 434 lines / 36KB |
> | 6 | `.Fabrica-atlas-board/discovery/round4/mc-adapters-linelevel.md` | 203 lines / 22KB |
> | 7 | `.Fabrica-atlas-board/discovery/round4/mc-workflow-engine.md` | 276 lines / 32.5KB |
> | 8 | `.Fabrica-atlas-board/discovery/round4/mc-service-catalog.md` | 261 lines / 26KB |
> | 9 | `.Fabrica-atlas-board/discovery/round4/mc-ai-providers.md` | 246 lines / 27KB |
> | 10 | `.Fabrica-atlas-board/verify/round4-spot-verification.md` | 168 lines / 17KB |
>
> Citation conventions: FA cites relative to `Fabrica-app/` (environment root); BZ cites relative to `_sources/buzz/`; MC bare `file:line` relative to `_sources/mission-control/mission-control/`. Per board path-migration notice, `_sources/` paths are inside `Fabrica-atlas/`.

---

## 1. Top 10 Evidence-Backed Capabilities Fabrica-app ALREADY Has for CLI-Agent Management

Ranked by direct reuse value for the CLI-agent-management transformation. Every item is sourced from a Round 4 discovery report with file:line citations.

### C1. Agent sessions as first-class PTY citizens — claim/ensure/adopt ownership registry

Spawns carry `launchAgent`, agent-kind schemas and session-resume metadata (`resumeProviderSession`, `src/main/ipc/pty.ts:5800-5803`), and an owner registry that can ADOPT a running agent CLI instead of spawning a duplicate: `args.agentSessionEnsure` routes through `agentSessionOwners = new ClaimedAgentPtyOwnerRegistry()` (`src/main/ipc/pty.ts:340`) reconciled against authoritative listings (`src/main/ipc/pty.ts:386`, `:4934-4996`). Source report states any "manage CLI agents" feature can reuse this claim/ensure/liveness layer rather than inventing process supervision (`fa-pty-terminal.md` §9 item 1, lines 353-356). This is the single most important existing substrate: Fabrica already owns an agent-session ownership model.

### C2. Three-plane terminal architecture with detach/reattach continuity

Local plane (`LocalPtyProvider` wraps node-pty, `src/main/providers/local-pty-provider.ts:523/:540`), relay plane (standalone Node subprocess on remote host owning its own node-pty via `PtyHandler`, `src/relay/pty-handler.ts:358`, disconnect-survival grace timer `startGraceTimer` `pty-handler.ts:2067-2076`), renderer plane (xterm.js panes through singleton dispatcher `pty-dispatcher.ts:85-97`). Replay ring buffers served on attach ("retain replay buffers so later restarts receive full history", `pty-handler.ts:1661-1677`); relay state survives relay restarts via `pty.serialize`/`pty.revive` (`pty-handler.ts:796-797`, revive probes live pid `process.kill(entry.pid,0)` `:1962-1988`). Verdict from report: "= agents keep running across UI/restarts, which is exactly the durability requirement for long-running CLI agent sessions" (`fa-pty-terminal.md` §5.4 lines 258-267, §9 item 6 lines 373-375).

### C3. Structured agent lifecycle signals without polling

OSC 133 prompt/command segmentation injected via PSReadLine wrapper (`powershell-osc133-bootstrap.ts:4-66`), renderer-derived command lifecycle events (`terminal-command-lifecycle.ts:2-29`), shell-ready gating via `\x1b]777;FABRICA-shell-ready` marker (`shell-ready-marker-scanner.ts:1`), OSC 7 cwd tracking (`parse-osc7.ts:1-30`). Inference helpers `agent-completion-coordinator.ts`, `pane-foreground-agent-tracker.ts`, `agent-interrupt-inference.ts`, `agent-question-answered-inference.ts` form "the substrate for detecting 'agent finished / asking question' without polling" (`fa-pty-terminal.md` §6 lines 282-307, §9 item 2 lines 357-362).

### C4. Safe process-control primitives: escalation-ladder kills + incarnation identity

Local kill escalation ladder graceful → SIGTERM → POSIX process-group SIGKILL sweep (`killLocalPtyProcess`, `local-pty-provider.ts:284-293`, backed by `forceKillPosixPtyProcessGroups`/`killWithDescendantSweep`); PID-recycle defense neutralizes `proc.kill` before `destroy()` because "node-pty SIGHUPs on socket 'close', which can race here and signal a reaped/recycled pid" (`local-pty-provider.ts:1024-1026`); Windows tree-kill classification walks ancestry before any `taskkill /T /F` (`windows-pty-root-identity.ts:18-27`). Every spawn mints `incarnationId = randomUUID()` tracked in `ptyIncarnationById` with stale exits rejected via `isCurrentPtyExit()` (`src/main/ipc/pty.ts:259`) — together giving "safe 'restart this agent pane' primitives" (`fa-pty-terminal.md` §2.3 lines 104-115, lines 370-372).

### C5. Credit-based flow control with delivery-health self-healing

Per-pty byte accounting (`sentChars`/`ackedChars`) at `sendPtyDataToRenderer` (`src/main/ipc/pty.ts:3105-3153`), cumulative ACKs via `pty:ackData` (`:7211-7229`), stuck-delivery probe `pty:requestDeliveryResync` reconciling from renderer-authoritative totals (`:3019-3043`), lost-byte write-off lane so panes repaint from snapshots (`writeOffLostRendererDelivery`, `:3046-3103`; resync lane `:7258-7285`). Deferred ACKs budget by bytes PARSED not received ("ACK fires when xterm consumes", `pty-dispatcher.ts:166-167`). Proven against the real v1.4.121-rc.0 renderer wedge (`fa-pty-terminal.md` §3.2 lines 150-166, 182-184).

### C6. Massive, centrally-audited IPC surface with trust enforcement

344 `ipcMain.handle` registrations covering **342 unique channels across 65 files**, plus 33 fire-and-forget `.on` channels; one preload bridge with **656 `ipcRenderer.invoke` sites across 76 namespaces** exposed via `contextBridge.exposeInMainWorld` (`src/preload/index.ts:4914-4915`); renderer never touches `ipcRenderer` directly. Single registration hub with register-once guard (`register-core-handlers.ts:109-234`, guard flag `:97`); per-window trusted-renderer webContents ID refresh + sender-identity enforcement (`register-core-handlers.ts:133-135`; enforced in `browser.ts:35-39`, `clipboard-ipc-handlers.ts:70-72`, `ui.ts:53`); sender-scoped request cancellation for long lookups (`sender-scoped-request-cancellation*.ts`) (`fa-ipc-watchers.md` §1 lines 11-13, §2.2 lines 29-31, §4.11 line 166). The 342-channel census was independently reproduced exactly during verification.

### C7. Per-agent status probe family across 15+ CLIs

Status probe channels `agentHooks:{claude,codex,copilot,gemini,droid,devin,grok,kimi,minimax,hermes,cursor,amp,antigravity,openClaude,commandCode}Status` in `src/main/ipc/agent-hooks.ts` (14 channels) plus trust gate `agent-trust.ts` (`markTrusted`), pane authority lifecycle `agentStatus:retirePaneAuthority/transferPaneAuthority` with ownership module `agent-pane-authority-ownership.ts` (`fa-ipc-watchers.md` §4.12 lines 172-173). Fabrica already models the fleet breadth (15 named external agent CLIs) that mission-control approaches with a single hard-coded binary.

### C8. Env-based agent identity injection at spawn

App-level env hooks via the `buildSpawnEnv` callback configured in `registerPtyHandlers` (`src/main/ipc/pty.ts:2449-2506`): Codex-home scoping, agent attribution env, `FABRICA_TERMINAL_HANDLE` pre-allocation (`:2485-2496`), WSL interop env; relay mirrors with `FABRICA_PANE_KEY/TAB_ID/WORKTREE_ID` env (`pty-handler.ts:1516-1521`, revive `:1996-2008`) — "lets any spawned CLI self-identify to the orchestration layer at startup" (`fa-pty-terminal.md` §2.1 lines 70-72, §9 item 3 lines 363-365).

### C9. Four-tier crash-isolated file-watching stack (Fabrica-exclusive among the three repos)

(1) Explorer worktree watcher with local @parcel/watcher roots + WSL in-distro pollers + SSH remote watchers; (2) crash-isolated forked child owning the native `watcher.node` handle (~30 `parcel-watcher-*` files) with a canary deadlock detector (child writes canary every 10 s, host exits child after `CANARY_MAX_MISSES=2` SLA misses, `parcel-watcher-process-entry.ts:1-6`) and crash fuse (`MAX_CRASHES_PER_WINDOW=3` within 120 s, `parcel-watcher-crash-fuse.ts:1-2`); (3) runtime watcher process pool with fault quarantine (`DEFAULT_MAX_QUARANTINE_SUPERVISORS=4`, `runtime-watcher-process-pool.ts:23-25`, permanent root fuse `supervisor_crash_fuse`, `runtime-watcher-pool-lifecycle.ts:22-30`); (4) purpose-built secondary watchers (native-chat transcript ingestion `nativeChat:subscribe/unsubscribe` with incremental offset reads `transcript-watch-engine.ts:22-23,82-93`). Remote watcher intent persists across transport loss (`reinstallRemoteWatchersForConnection`, `filesystem-watcher.ts:1796-1883`); shared batching window trailing 150 ms / max 500 ms / overflow cap 5,000 (`shared/filesystem-watch-batch-window.ts:4-5`) (`fa-ipc-watchers.md` §1 line 14, §5.1 lines 234-269, §5.3 lines 277-285, §5.7 line 308). Report warning: "highest-risk subsystem to preserve verbatim during any rebrand/framework change" (`fa-ipc-watchers.md` line 407).

### C10. Production-grade distribution: 5-channel releases, dual signing, draft-gated publishing, update-survival E2E

electron-updater ^6.8.9 (`package.json:139`) behind a pinned verified-generic-feed preflight (`pinDefaultReleaseFeed`, `src/main/updater.ts:1351-1447` probing the atom feed + HEAD-verifying manifest/assets before pinning, `updater-prerelease-feed.ts:109-150`). Channels `stable|rc|hourly|daily|adhoc` with dedicated dev repos (`release-channel.ts:3-11,24-27`); safety rails (24 h cadence, backoff to 6 h, 45 s stall timers `updater.ts:106-115`, consent-gated download `:2183`, signature-check guard `:2199`); macOS notarization + SignPath two-stage Windows signing with blockmap regeneration after signing (`release-cut.yml:1260-1274,1471-1543,1587-1610`); draft-gated publishing where every build job re-verifies the release stayed draft (`release-cut.yml:1794-1808`) and asset-presence publish gates (`verify-release-required-assets.mjs:90-126`); `win-update-e2e.yml` installs one released build, updates to another, asserting daemon survival / terminal interactivity / zero console flashes (`win-update-e2e.yml:119-133`) (`fa-autoupdate-build.md` §A1-A4 lines 13-66, §C lines 154-178, §D1/D6 lines 184-222). This is the distribution backbone an agent-management product ships on — none of it needs rebuilding, only re-pointing if branding changes.

---

## 2. Top 10 Gaps — mission-control / buzz Patterns to Adopt

Ranked by transformation impact. "Gap" = capability Fabrica-app lacks (or has only scattered/unhardened) where a source repo holds a production-tested pattern.

### G1. Provider-neutral multi-CLI runner abstraction (mission-control)

MC integrates exactly ONE provider (Claude Code CLI as local child process; grep-verified zero HTTP/SDK LLM calls, `mc-ai-providers.md` §1) but its spawn contract is implicitly generalizable: `SpawnOptions`/`SpawnResult`/`ClaudeOutputMeta` (`types.ts:104-120,162-180`) are "90% of a provider-neutral contract" (`mc-ai-providers.md` §8.1). Directly portable pieces: binary whitelist basename check at spawn time (`ALLOWED_BINARIES`, `scripts/daemon/security.ts:97,103-106`; re-validated `runner.ts:229-231`) and the Windows `.cmd` shim → node.exe resolution trick ("directly reusable for ANY npm-distributed agent CLI (codex, gemini, aider)", `runner.ts:40-63,116-127`). Fabrica has 15 per-agent probe channels (C7) and PTY spawning but no unified `Runner.spawn(SpawnSpec)` abstraction with pluggable output parsers. Recommendation source: `mc-ai-providers.md` §8.1; `mc-workflow-engine.md` §12 item 1.

### G2. Approval-gated autonomy FSM for irreversible agent actions (mission-control)

MC's Field-Ops 8-state transition table `draft → pending-approval → approved → executing|awaiting-signature → completed|failed` (+ failed/rejected → draft), enforced by `isValidTransition` at every mutating API (`src/lib/types.ts:420`; table verbatim `mc-workflow-engine.md:109-118`); risk-tiered approval computed server-side from `TASK_TYPE_RISK` (`field-ops-security.ts:22-31`) with the "iron claw" rule — high-risk requires approval even under full autonomy, `custom` always does (`:53-58`) — and bypass detection flagging direct `draft→approved` transitions (`isApprovalBypassAttempt`, `field-ops-security.ts:111-121`, enforced `field-ops/tasks/route.ts:205`). Fabrica has trust gates (`agent-trust.ts:markTrusted`) but no risk-tiered approval state machine governing what agents may DO. Verdict: "mature answer to 'how much can an agent do without asking'" (`mc-workflow-engine.md` §12 item 2).

### G3. Human-in-the-loop decision gates converting runaway loops into structured questions (mission-control)

Pending decisions in `decisions.json` freeze task dispatch at three layers (dispatcher filter `dispatcher.ts:135-138`; runner validation `run-task.ts:829-834`; manual-run API returns decision to UI `tasks/[id]/run/route.ts:96-124`); after `MAX_LOOP_ATTEMPTS=3` failures a decision is created with options Retry-different-approach / Skip-and-continue / Stop-mission (`run-task.ts:374,485-544`); answered guidance is injected into retry prompts ("You MUST take a DIFFERENT approach", `prompt-builder.ts:269-321,298-315`). Strong UX pattern for Fabrica's operations dashboard (`mc-workflow-engine.md` §12 item 3).

### G4. Fleet supervision primitives: persistent retry queue, continuation chains, concurrency slot math (mission-control)

Persistent exponential-backoff retry queue surviving daemon restarts (atomic tmp+rename, delay `retryDelayMinutes * 2^(attempt-1)` capped 60 min, `dispatcher.ts:17,23-30,54-77,83-86`); bounded auto-resume continuation sessions (`shouldContinue = (hitMaxTurns||hitTimeout) && continuationIndex < maxTaskContinuations`, `run-task.ts:963-965`; detached re-entry `--continuation N --run-id <id>` `:338-370,1017-1026`; progress handoff via CONTINUATION SESSION headers `:912-927`); global slot math `availableSlots = maxParallelAgents - health.activeCount()` guarding dispatch, scheduled commands, and project-run re-dispatch with retries-first priority (`dispatcher.ts:156-158,100-101,585,416`); kill-by-PID with process-tree teardown ("mandatory on Windows", `runner.ts:288-301,361-372`). Endorsed wholesale in `mc-ai-providers.md` §8.2 and `mc-workflow-engine.md` §12 item 4.

### G5. Guardrail stack for external actions: dry-run, spend caps, rate limits, circuit breaker, staleness revalidation (mission-control)

Layered execute pipeline before any adapter call: Zod validation → approved-status → rate limit 10/5 min → USD spend pre-check with pause-on-breach → dual adapter resolution → manual fallback → payload gate → **dry-run short-circuit** → staleness re-validation (>3 days) → vault decrypt → execute → credential zeroization → result+spend log+sanitized event → circuit breaker (3 consecutive failures pause the whole mission) → notification bridge → dependency unblocking (numbered list `mc-adapters-linelevel.md:121-142`; circuit breaker `field-ops-security.ts:161-176`, trip log `execute/route.ts:507-532`; layered budgets `spend-tracker.ts:82-132`: kill switch → per-service → per-tx cap → daily/weekly/monthly). Ethereum adapter safety rails generalize best: recipient whitelist + per-tx caps + dry-run-before-send = "best-in-repo model for ANY irreversible agent action" (`ethereum-adapter.ts:551-574,183-199,294-310`; relevance table `mc-adapters-linelevel.md` §5). Fabrica should adopt this as its agent permissioning layer.

### G6. ServiceAdapter contract + self-registering registry + healthCheck semantics (mission-control)

One stateless interface — readonly `serviceId`/`name`/`supportedOperations` + required `validatePayload`/`execute` ("Must not throw — return AdapterResult with success=false on error", `src/lib/adapters/types.ts:121`)/`healthCheck` + optional `getFinancials` (`types.ts:102-144`); everything injected via `AdapterContext` including decrypted credentials and a `dryRun?` flag ("validate everything but skip the actual external API call", `types.ts:14-23,:22`); module-level Map registry with side-effect self-registration and lookup/list/count helpers (`registry.ts:13-47`); uniform ≤5 s no-side-effects health contract returning `{ok,latencyMs,message,details}` (`types.ts:51-62,:125-128`). Rated HIGH transplantability for "Fabrica's agent action-connectors" (`mc-adapters-linelevel.md` §5); aligns with FA's existing plugin architecture (round3 plugins report).

### G7. Catalog-as-data integration surface with honest coverage accounting (mission-control)

One JSON catalog (64 services, 16 categories; auth split 42 api-key/21 oauth2/1 none; risk split 20 high/40 medium/4 low) with rich per-service metadata incl. `configFields` credential schemas and `setupGuide` steps (`data/field-ops/service-catalog.json:1-3`; schema `mc-service-catalog.md` §2); fault-tolerant loader with empty fallback (`src/lib/data.ts:635-642`); filtered/searchable HTTP endpoint (`catalog/route.ts:14-69`); graceful MANUAL fallback when no adapter exists ("No adapter available. Task moved to executing for manual completion.", `execute/route.ts:221-248`); custom-service reuse seam via dual lookup by `service.id` then `service.catalogId` (`execute/route.ts:210-218`). Lesson to port WITH the fix: only 6/64 (9.4%) automated; catalog `capabilities` and adapter `supportedOperations` share no vocabulary so "the catalog systematically over-promises" — reconcile vocabularies in any port (`mc-service-catalog.md` §4a/§6 items 2-4).

### G8. Durable SQL-backed workflow/run persistence with cryptographic approvals (buzz)

The workflow quartet `workflows/workflow_runs/workflow_approvals/scheduled_workflow_fires` is a "Direct template for Fabrica 'task/workitem' persistence: status enums already read like a work-item state machine" (`migrations/0001_initial_schema.sql:28-37,:362-382,:386-405,:411-435,:451-466`): definition JSONB + hash LWW upserts; runs with step pointer + `execution_trace JSONB` + resumable serialized trigger context; SHA-256-hashed approval tokens scoped by composite PK so tokens cannot act cross-community, TOCTOU-safe grant/deny guarded `AND status='pending'` (`crates/buzz-db/src/workflow.rs:328-376,1052-1055,1142-1148`); at-most-once cron claims via unique insert-election with DB-authoritative anchor (`workflow.rs:507-512,547-549`). Explicit buzz-report gap note: managed-agent runtime state lives only in JSON files (`managed-agents.json`, `teams.json`), so "Any Fabrica 'sessions/tasks' table would be net-new" — i.e., this pattern fills a hole neither repo currently has in durable form (`bz-db-schema.md` §E line 349).

### G9. Agent usage/cost ledger with budgets attached (buzz schema × mission-control governance)

buzz's `agent_metric_index` is a "Direct precedent for Fabrica agent-usage accounting/billing views": per-agent-turn ledger keyed `(session_id, turn_seq-as-zero-padded-sortable-TEXT)`, token counts/cost, cumulative mirrors, pricing identity, parse_status CHECK, restartable chunked backfill 500/tx, GC cascade, read-time orphan repair (`archive/store.rs:81-140`; parser/writes/backfill/GC/repair/reads `archive/metric_store.rs:28-40,75-105,125-181,293-360,374-438,446-465,472-478,485-619`) (`bz-db-schema.md` §D lines 307-313, §E line 348). MC proves cost harvesting from CLI exit JSON (`total_cost_usd`/usage parsed null-safely, `runner.ts:173-211`; cumulative persisted stats `health.ts:118-127,210-232`) but has NO budget enforcement on LLM runs — its layered `checkSpendLimits` gates field services, "NOT Claude Code runs... Daemon LLM spend has no budget cap — only observability" (`mc-ai-providers.md` §6, NOTE line). Adopt both halves into one FA billing/governance layer: harvest-from-CLI + budget-on-runs + per-agent attribution + pre-flight estimates (`mc-ai-providers.md` §8.3).

### G10. Wire-level agent control plane + privacy-gated telemetry kinds (buzz relay)

The entire buzz surface is standard NIP-01/NIP-42 Nostr over one WebSocket — reusable unchanged for agent channels: job protocol kinds 43001-43006 (`KIND_JOB_REQUEST`…`KIND_JOB_CANCEL`, `crates/buzz-core/src/kind.rs:515-528`) and observer frames 24200 "are already the agent-control plane" (`kind.rs:461-472`; freshness window `handlers/event.rs:985-988`); ready-made privacy model in five gate sets — `AUTHOR_ONLY_KINDS {30300,30350,30179}`, `RESULT_GATED_KINDS {30622,44200}`, `P_GATED_KINDS`, `SHARED_GATED_KINDS`, relay-only kinds (`kind.rs:129-169,215,232-243,258-273,830-840`); server-driven keepalive simplification (30 s ping / 3 strikes, no client heartbeat required, `connection.rs:441-459`); named parse-time limits as constants (`MAX_SUB_ID_LENGTH=256`, `MAX_FILTERS_PER_REQ=10`, `protocol.rs:9,12,74-98`) and NIP-11 self-description that cannot drift from enforcement (`max_limit = DEFAULT_MAX_PAGE_LIMIT` advertised, `nip11.rs:92-96,101-120`) (`bz-relay-event-kinds.md` §I lines 399-403, §A-II series). Also portable: hash-chained per-community audit log (`migrations/0001_initial_schema.sql:606-619`, `crates/buzz-audit/src/service.rs:100,137,179,235`) and lease/claim queues with SKIP LOCKED-style claiming + partial recovery indexes (`0012_push_leases.sql:49-52`, `0018_push_match_queue.sql:16-19`, `push.rs:851-870`) — explicitly labeled "operational-control patterns worth porting" (`bz-db-schema.md` §E line 350).

---

## 3. Actionable Recommendations — Task-Ready Notes per Target Project

Phrased so the orchestrator can paste each into a target project's board as a task note. Per AGENTS.md, cross-project work is recorded as notes in OTHER projects' task files via the orchestrator; nothing here was executed outside this board.

### 3a. Fabrica-app (primary transformation target)

- **FA-T1 (from G1)** — Introduce a provider-neutral runner abstraction `Runner.spawn(SpawnSpec)` over the existing PTY layer: SpawnSpec includes provider profile; output parsing pluggable (Claude JSON vs codex JSON vs plain text). Seed with MC's contract trio `SpawnOptions`/`SpawnResult`/`ClaudeOutputMeta` (`_sources/mission-control/mission-control/scripts/daemon/types.ts:104-120,162-180`) and its binary-resolution + whitelist + `.cmd`-shim-to-node.exe resolution (`runner.ts:65-165`, `security.ts:97-106`, `runner.ts:40-63`). Wire into FA's existing per-agent probe family (`src/main/ipc/agent-hooks.ts`) instead of parallel machinery.
- **FA-T2 (from G2+G5)** — Add an approval-gated autonomy layer for irreversible agent actions: port MC's 8-state FSM + server-side risk table + bypass detection (`src/lib/types.ts:420`; `field-ops-security.ts:22-31,53-58,111-121`) and generalize the ethereum whitelist/caps/dry-run rails to all destructive operations (`ethereum-adapter.ts:551-574,183-199`). Enforcement point: FA's audited IPC boundary (`register-core-handlers.ts:109-234`) — one guard stack at the boundary, not per-feature.
- **FA-T3 (from G3)** — Add decision-gate escalation: runaway/looping agent runs freeze dispatch and surface structured questions (Retry-different / Skip / Stop); answered guidance is injected into the retry prompt. MC reference: `decisions.json` gating at three layers (`dispatcher.ts:135-138`, `run-task.ts:829-834`) + retry-guidance injection (`prompt-builder.ts:269-321`). FA's OSC-133/interrupt/question inference helpers (`fa-pty-terminal.md` §6) are the detection substrate already in place.
- **FA-T4 (from G4)** — Port fleet-supervision primitives into the main process: persistent exponential-backoff retry queue (atomic writes), bounded continuation chains with progress handoff headers, global concurrency slot math shared by ALL entry points through ONE health monitor (`mc-workflow-engine.md` §7, §9a; `mc-ai-providers.md` §8.2). Replace MC's JSON+PID-probing persistence with FA's Electron/Rust IPC + SQLite (explicit redesign note: `mc-workflow-engine.md` §12 item 5 — "direct-write paths bypass the mutexes... Fabrica's Electron/Rust layer can replace these with real IPC + SQLite").
- **FA-T5 (from G6+G7)** — Add an adapter registry for outbound agent actions using MC's `ServiceAdapter` contract (validate → execute → healthCheck → optional financials, never throw; `adapters/types.ts:102-144`, `registry.ts:13-47`) and a catalog-as-data service list with configFields credential schemas and honest manual fallback (`mc-service-catalog.md` §2, §3). MUST reconcile capability vocabulary between catalog and adapters at design time (drift lesson: `mc-service-catalog.md` §4a, §6 item 4).
- **FA-T6 (from G8)** — Create durable SQL-backed task/run/approval persistence modeled on buzz's quartet: status enums as state machines, SHA-256 approval tokens scoped by composite keys, TOCTOU-safe guarded transitions, at-most-once scheduled-fire claims (`_sources/buzz/migrations/0001_initial_schema.sql:362-466`; `crates/buzz-db/src/workflow.rs:328-376,507-512,1052-1055,1142-1148`). Net-new table work per `bz-db-schema.md` §E line 349.
- **FA-T7 (from G9)** — Build the usage/cost ledger on buzz's `agent_metric_index` shape (`archive/store.rs:81-140`, `metric_store.rs:287-360`) fed from FA's PTY-layer cost capture, WITH budget enforcement MC lacks (`mc-ai-providers.md` §6 NOTE): budgets on agent runs, per-agent attribution, pre-flight estimates. Reconcile with FA's existing AI Vault design (round3 report `discovery/round3/ai-vault-browser.md`) before implementing (`mc-ai-providers.md` §8.3 reconciliation note).
- **FA-T8 (from G10)** — If multi-host/relay agent channels are planned, adopt buzz's transport as-is (NIP-01 frames + job kinds 43001-43006 + observer 24200) and its privacy gate sets for agent↔owner telemetry (`kind.rs:129-169,215,515-528`); add the hash-chained audit log for operator actions (`0001_initial_schema.sql:606-619`). Do NOT adopt MC's polling-over-HTTP-to-localhost transport where FA already has push IPC ("its polling-only transport should NOT be carried where Fabrica already has push IPC", `fa-ipc-watchers.md` line 406).
- **FA-T9 (rebrand guardrails, from fa-autoupdate-build.md §E)** — Before any rename/reorg: audit the three layers where GitHub repo coordinates are baked in (runtime feed URLs incl. literal atom-feed tag regex `updater-prerelease-feed.ts:13-14`, builder publish target, CI guards); decide appId (`com.autoscalers.fabrica`) deliberately — changing it "creates a parallel app that won't update over old installs"; follow `publisherName` + `CN=SignPath Foundation` verification strings together (`release-cut.yml:1429,1622,1729-1750`); plan data migration for `~/.fabrica` userData paths; new Homebrew tap or redirect story (`fa-autoupdate-build.md` lines 231-245).
- **FA-T10 (distribution greenfield, from fa-autoupdate-build.md §E line 240)** — Staged rollout does not exist anywhere (`stagingPercentage` zero matches across `src/` and `config/`); if gradual rollout is wanted, implement cohort-based `latest*.yml` routing on the generic-feed architecture — "server-side percentage routing" is straightforward there.
- **FA-T11 (preservation, from fa-ipc-watchers.md lines 407-408)** — Treat the watcher stack as load-bearing and preserve verbatim (crash isolation + canary + fuse, WSL in-distro polling, remote intent persistence, removal fencing); treat `<namespace>:<action>` channel strings as a PUBLIC CONTRACT spanning main handlers (65 files), preload bridge (656 invoke sites), ~78 renderer usages — renaming requires coordinated three-layer migration.

### 3b. Notes for other project boards (record via orchestrator)

- **Note N1 (verification debt)** — Five of nine Round 4 reports lack round-level verification (see §4). Recommend the ATLAS orchestrator dispatch an R4-2.x spot verification covering `mc-adapters-linelevel.md`, `mc-workflow-engine.md`, `mc-service-catalog.md`, `mc-ai-providers.md`, `fa-pty-terminal.md` before their findings feed external tasks unqualified.
- **Note N2 (figure correction)** — Service-catalog count discrepancy: `mc-service-catalog.md` verifies exactly **64** services (JSON-parse + id-key count, §7 discrepancy register) vs "~66"/"~67" still stated in `mc-adapters-linelevel.md` lines 39/:180. Downstream consumers should use 64 (6 native adapters = 9.4% coverage).
- **Note N3 (upstream typo flag)** — Catalog entry at `_sources/mission-control/.../service-catalog.json:1014` names package `freshdeck-mcp` — likely upstream typo worth checking before any catalog data is copied (`mc-service-catalog.md` §B4).

---

## 4. Verified vs Unverified Findings

### 4a. VERIFIED (R4-2.3 spot verification — `.Fabrica-atlas-board/verify/round4-spot-verification.md`)

Method: ≥10 file:line citations sampled per report and re-opened against sources; total **65 cites checked — 64 exact + 1 minor, 0 failed**; verdict line 20 verbatim: "Zero hard failures across 65 sampled citations."

| Report | Cites checked | Result |
|---|---|---|
| `fa-ipc-watchers.md` | 18 | PASS — 18 exact, 0 failed |
| `bz-db-schema.md` | 15 | PASS — 14 exact + 1 minor, 0 failed |
| `bz-relay-event-kinds.md` | 18 | PASS — 18 exact, 0 failed |
| `fa-autoupdate-build.md` | 14 | PASS — 14 exact, 0 failed |

Findings from this digest resting primarily on those four reports are therefore VERIFIED: C1-C10 capabilities (C1-C9 rest on fa-ipc-watchers/fa-pty-terminal/fa-autoupdate-build — see caveat below for fa-pty-terminal), G8/G10 buzz patterns, FA-T9/T10/T11.

Two MINOR caveats registered by R4-2.3:
- **V-R4-1** (`verify/round4-spot-verification.md` lines 74,81,149): bz-db-schema's push-gateway "runtime guards" cites (`postgres.rs:472,:523-532,:627-665`) sit inside `#[cfg(test)] mod tests` (starts `postgres.rs:407`), not production code; production runner is `apply_migrations_and_grants` (:19-23). Substance stands; treat those specific cites as test-module evidence.
- **V-R4-2** (lines 51,150): fa-ipc-watchers' usage-provider template-literal family labeled "×5 channels" (`usage-provider-handlers.ts:34-57`) actually registers 8 channels (`getSnapshot/getBreakdown/getRecentSessions` also present, :41-61); the five named channels were correctly cited — only the family-size label undercounts.

### 4b. UNVERIFIED at Round-4 level (no spot verification pass has sampled their cites)

| Report | Status |
|---|---|
| `mc-adapters-linelevel.md` (basis of G5, G6, parts of G7, FA-T2, FA-T5) | UNVERIFIED — self-reports full-file reads + coverage statement (lines 201-203); no independent cite check found |
| `mc-workflow-engine.md` (basis of G2, G3, G4, FA-T2, FA-T3, FA-T4) | UNVERIFIED — self-report states "All line numbers verified against the frozen sources during this session (2026-08-23)" (coverage lines 267-275) but no cross-worker pass |
| `mc-service-catalog.md` (basis of G7, N2, N3) | UNVERIFIED — structural claims self-checked via JSON parse (§7-§8); no independent pass |
| `mc-ai-providers.md` (basis of G1, G9, FA-T1, FA-T7) | UNVERIFIED — negative-result greps documented but no cross-worker cite check (coverage lines 213-245) |
| `fa-pty-terminal.md` (basis of C1-C5, C8, FA-T3 detection substrate) | UNVERIFIED — checkpoint shows R4-1.7 "awaiting orchestrator verification" (`Fabrica-atlas-tasks.md` Checkpoint, Current Task cell) |

Discrepancy warning: `verify/round4-spot-verification.md` line 164 asserts "all other Round 4 reports already covered by R4-2.1/R4-2.2" — but R4-2.1 verified the ROUND 3 reports (`Fabrica-atlas-tasks.md` row R4-2.1: "Spot verification of all 7 discovery/round3/ reports") and R4-2.2 was hygiene fixes. No round-4-level pass covers these five reports. Until one exists, downstream consumers should label their claims "unverified (self-reported coverage)".

### 4c. Verification lineage summary

- Verified this round: fa-ipc-watchers, bz-db-schema, bz-relay-event-kinds, fa-autoupdate-build (R4-2.3, 0 failed).
- Verified prior rounds only: all seven round3 reports (R4-2.1: 164 cites, 1 error found and fixed via R4-2.2 — `verify/round3-spot-verification.md`; `Fabrica-atlas-tasks.md` Verification Tracker rows 3/1 and 4/0).
- Never independently verified: the five reports listed in §4b.

---

## 5. Digest Method

1. Read `Fabrica-atlas/AGENTS.md` (board rules, write zone, anti-overlap policy) and the Checkpoint table in `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` first.
2. Read all nine Round 4 discovery reports in full via three parallel research subagents (BZ pair, MC quartet, FA trio), each instructed to return verbatim citations; read `.Fabrica-atlas-board/verify/round4-spot-verification.md` in full via a fourth.
3. Synthesized §1-§4 from the returned material; every claim above carries a citation traceable to a Round 4 report, which in turn cites sources. No source repo was re-opened for new claims in this digest — this is a synthesis-layer document.

## Scan-Coverage Statement

**Read this session:** all 9 files in `.Fabrica-atlas-board/discovery/round4/` (fa-ipc-watchers.md 425 ln, fa-pty-terminal.md 405 ln, fa-autoupdate-build.md 284 ln, bz-db-schema.md 377 ln, bz-relay-event-kinds.md 434 ln, mc-adapters-linelevel.md 203 ln, mc-workflow-engine.md 276 ln, mc-service-catalog.md 261 ln, mc-ai-providers.md 246 ln) — complete, via subagents reporting full-file reads including each report's own scan-coverage section; `.Fabrica-atlas-board/verify/round4-spot-verification.md` (168 ln) complete; `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` complete (436 ln).

**Not read this session:** the main discovery docs (`discovery/*.md` round-1), round3 reports, other verify passes, and analysis docs (`analysis/similarities-gaps.md`, `analysis/production-architecture.md`) — out of scope for this digest per task spec (Round 4 findings only); no source repos re-scanned (synthesis layer only). Prior-round context used: task file Checkpoint/Verification Tracker rows and the round3 report titles referenced by round4 reports (ai-vault-browser.md referenced by name only, not read).

**Integrity:** no file outside `.Fabrica-atlas-board/` was created or modified during this task.

_Digest end — ATLAS R4-3.2._

---

## Round 4 Closure Addendum

> ATLAS R4-3.3 · task_ce0b894a93cc · dispatch ctx_f587d4eff648 · Group 3 closure synthesis · 2026-08-23
>
> APPEND-ONLY addendum: integrates Round 4 wave-2/wave-3 material published after the digest body above (§1–§5 unchanged above this line). Sources read in full this session: `verify/round4-wave2-spot-verification.md`, `verify/round4-wave3-spot-verification.md`, `verify/round4-master-index.md`; discovery reports `fa-window-tray-notifications.md`, `bz-ops-deploy-admin.md`, `fa-git-integration.md`, `fa-settings-config-datadirs.md`, `bz-search-pubsub.md`, `mc-notifications-alerting.md` (via full-read research passes returning verbatim citations). Citation conventions as in the digest header.

### A1. Verification status of wave-2/3 findings (now VERIFIED)

The digest's §4b unverified list is now substantially retired:

| Report | Wave | Result |
|---|---|---|
| `mc-workflow-engine.md` | W2 (`round4-wave2-spot-verification.md` §1) | PASS — 24 cites: 23 exact + 1 factual nit |
| `mc-ai-providers.md` | W2 (§2) | PASS — 20 cites: 19 exact + 1 cosmetic |
| `mc-service-catalog.md` | W2 (§3) | PASS — 19 cites exact; headline numbers reproduced digit-for-digit (64 services / 6 adapters / auth 42-21-1 / risk 20-40-4) |
| `fa-window-tray-notifications.md` | W2 (§4) | PASS — 51 cites: 49 exact + 2 cosmetic |
| `bz-ops-deploy-admin.md` | W2 (§5) | PASS — 32 cites: 31 exact + 1 cosmetic; exactly 31 migration .sql files counted |
| `fa-git-integration.md` | W3 (`round4-wave3-spot-verification.md` §Report 1) | PASS — 16/16 exact |
| `fa-settings-config-datadirs.md` | W3 (§Report 2) | PASS — 17 exact + 1 cosmetic off-by-one (`shared/fabrica-profiles.ts:4/:5` → actual :3/:4) |
| `bz-search-pubsub.md` | W3 (§Report 3) | PASS — 14/14 exact |
| `mc-notifications-alerting.md` | W3 (§Report 4) | PASS — 17/17 exact |

Wave totals: W2 = 146 cites → 140 exact / 5 minor / **0 failed**; W3 = 65 cites → 64 exact / 1 minor / **0 failed**. One factual correction was applied by W2 and supersedes the digest where relevant:

- **Correction CA-1 (mutex registry size):** `mc-workflow-engine.md` claimed "17 named mutexes" at `_sources/mission-control/.../daemon/data.ts:176-195`; actual registry (`data.ts:177-196`) contains **20** entries (`round4-wave2-spot-verification.md` Findings Register F1). Downstream consumers of G4/FA-T4 should use 20.

Per the board no-content-rewrite rule, corrections to the digest body itself are recorded here rather than edited in place. Two further register items recommended by later waves for adoption at closure (from `verify/round4-master-index.md` §D3 items 4–5):

- **Correction CA-2 (C7 refinement):** W6 verified `fa-agent-hooks-probes.md` and found the digest's C7 "15+ CLIs / 14 channels" picture should read **14 managed hook targets vs 18 live `/hook/*` pathnames** (`round4-wave6-spot-verification.md`; independently reproduced). C7's substrate claim stands.
- **Note CA-3 (stale self-reference):** the digest body cites `discovery/round3/ai-vault-browser.md`; actual path is `discovery/round3/round3/ai-vault-browser.md` (flagged by `round4-consistency-audit.md`, left per no-rewrite rule).

### A2. Wave-2/3 findings integrated (post-digest discoveries)

#### Fabrica-app

- **Single-instance lock IS the CLI↔desktop contract.** Lock key = userData profile; discovery files `FABRICA-runtime.json` (RPC endpoint + authToken) and `agent-hooks/endpoint.env` are how bundled CLIs find the running app (`src/main/startup/single-instance-lock.ts:22-33`, call order `src/main/index.ts:656/:801`); stable exit code 3 = "another process owns this profile", usable by systemd `RestartPreventExitStatus=` (`single-instance-lock.ts:5-12`, `index.ts:809-814`). Headless serve mode keeps the app alive through window churn with desktop promotion gated on daemon-backed persistent PTYs ("fail-closed `'persistent PTY provider unavailable'`", `startup/serve-desktop-activation.ts:12-28`) — substrate for supervising agents without visible UI (`fa-window-tray-notifications.md` §3/§5; verified W2 §4).
- **Complete attention-signaling pipeline ready for agent alerts:** tray amber dot lit before cooldown/focus gates and cleared on reveal (`ipc/notifications.ts:397-403`; `index.ts:1497-1498`); 5 s burst dedupe keyed by worktree, LRU cap 50 (`ipc/notifications.ts:33-34,445-452`); click-to-navigate targets the exact pane leafId (`ipc/notifications.ts:511-546`); agent-state copy normalized across 13 agent types with `blocked|waiting → "needs input"` (`notification-options.ts:7-21,:60-65`); macOS permission machinery via bundled helper `FABRICA-notification-status` because Electron exposes no authorization API (`ipc/notification-authorization-status.ts:12-43`). Mobile mirror replays missed events to reconnecting clients from a monotonic-seq buffer (`runtime/fabrica-runtime.ts:12685-12740`; `runtime/mobile-notification-replay.ts:8-19`) (`fa-window-tray-notifications.md` §4-§7).
- **Negative findings (net-new surface):** `globalShortcut` never imported in src/main (nothing works system-wide when unfocused); no deep links (`setAsDefaultProtocolClient` zero hits); **no Linux tray** (`system-tray.ts:225-228`); no `setLoginItemSettings` anywhere (`fa-window-tray-notifications.md` §6 item 7, §2.7; greps confirmed W2 §4).
- **Git plane = raw child_process, fully centralized, zero git libraries** — "All git execution is raw `node:child_process` centralized in `main/git/runner.ts` (~1838 lines)" with a 10 MB default buffer (`DEFAULT_GIT_MAX_BUFFER`, `runner.ts:305-306`) and 15 s sync timeout (`runner.ts:1268-1269`) (`fa-git-integration.md:13`; verified W3 Report 1). **Worktree-per-agent is already the product substrate:** "`worktrees:create` mints `worktreeId = ${repo.id}::${created.path}` (`ipc/worktree-remote.ts:2380`) and PTY panes, runtime state, and terminal tabs are all keyed by it"; removal fences agent processes first (`fa-git-integration.md:15,:186`).
- **Agent-aware selective credential guard (unique finding):** applies only to recognized agent processes — `isUnattended: opts.launchAgent !== undefined` (`ipc/pty.ts:1714-1719`) — so "**User terminals keep normal Git behavior**" while "unattended agents must fail instead of looping on OS credential prompts" (`shared/terminal-git-credential-guard.ts:10-54`; `fa-git-integration.md:272-273`). No token injection exists anywhere (no `http.extraHeader`/embedded-token rewriting; defense = redaction + non-interactivity env `GIT_TERMINAL_PROMPT=0`, `shared/git-credential-prompt-env.ts:92`) (`fa-git-integration.md:278-279`).
- **Spawn-free freshness pattern:** `.git` metadata watched/polled directly with tiered classification, debounced 250 ms — "Keep it spawn-free" replacing `git worktree list` fanout (`ipc/worktree-head-identity-reader.ts:5-7`; `fa-git-integration.md:16,:339`); behavioral capability probing with 30-min negative-result memory keyed `'local'` vs `'wsl:<distro>'` (`shared/git-capability-cache.ts:3,:5-10`; `fa-git-integration.md:78`).
- **One canonical config store + the CLI/app runtime pointer:** single JSON document `FABRICA-data.json` managed by one `Store` class in `src/main/persistence.ts` (7,679 lines) with tmp→fsync→rename writes, hash-skip identical writes, corrupt-recovery backup ring `BACKUP_COUNT = 5` / 1 h spacing (`persistence.ts:343-352,:535-537`; `fa-settings-config-datadirs.md:11,:140-152`); bundled CLI finds the desktop runtime via `FABRICA-runtime.json` containing "runtimeId, pid, transports (unix/named-pipe/websocket), authToken, startedAt … reclaimed if publisher pid dead" (`src/cli/runtime/metadata.ts:53-69` region; `fa-settings-config-datadirs.md:15,:271-276`). Persistence is guard-stamped one-shot migrations (~28 catalogued), NOT schema-version-driven (`SCHEMA_VERSION = 1` never bumped, `shared/constants.ts:49`) (`fa-settings-config-datadirs.md:16,:190-223`).
- **Rebrand hard-break register (extends FA-T9):** renaming "'<appName> Safe Storage'" makes ALL safeStorage ciphertext undecryptable; persisted enum literal `'FABRICA-first'` (`shared/constants.ts:288`); Chromium partition `persist:FABRICA-browser` orphans browser data; ~130 `FABRICA_*` env vars recommend aliasing old names indefinitely; hook bundles named 'FABRICA-status' across claude/codex/grok/devin agent homes (`fa-settings-config-datadirs.md:286-298`). Recommended strategy: "**a. Keep on-disk filenames and partition strings unchanged (opaque identifiers); change only display surfaces**" (`fa-settings-config-datadirs.md:308-309`).

#### buzz

- **Search = Postgres FTS via generated column — index-as-side-effect-of-insert, zero consistency window:** "every row write *is* the index update — there is no separate indexer, no mpsc queue, no reindex job, no consistency window" (`crates/buzz-search/src/lib.rs:7-10`); `search_tsv TSVECTOR GENERATED ALWAYS AS (...) STORED` + GIN index (`migrations/0001_initial_schema.sql:222-226,:278`) — direct template for a searchable agent-output archive (`bz-search-pubsub.md` §2-§3; verified W3 Report 3).
- **Storage-level privacy allowlist:** fresh-install allowlist of kinds `{0, 9, 40002, 45001, 45003}` get a tsvector (`migrations/0008_fresh_install_search_allowlist.sql:1-23`); p-gated kinds stored with NULL `search_tsv` plus a Rust↔SQL drift regression test (`crates/buzz-core/src/kind.rs:144-154`); search "returns candidate hits that the relay re-authorizes per hit" (`crates/buzz-search/src/query.rs:1-9`; gate chain `crates/buzz-relay/src/handlers/req.rs:773-786`) — reusable for secrets-bearing agent output (`bz-search-pubsub.md` §4-§5).
- **Refcount + debounce pub/sub (live-tailing blueprint):** `retain_topic`/`release_topic` refcount map with 500 ms unsubscribe debounce (`crates/buzz-pubsub/src/lib.rs:192-245`, default `lib.rs:80-96`); reconnect-safe desired-state snapshotting (`subscriber.rs:86-98`); backoff 1 s→30 s (`subscriber.rs:14-17`); presence with heartbeat-scaled TTL `PRESENCE_TTL_SECS = 180` = "3× the 60s heartbeat" (`presence.rs:15-16`) — directly reusable for agent online/offline status (`bz-search-pubsub.md` §6-§8).
- **K8s agent-deployment blueprint (bz-ops-deploy-admin):** agent-to-Kubernetes provider protocol reads ONE JSON request from stdin, writes ONE response to stdout, exit code carries one bit (`src/main.rs:1-9`), with self-describing `protocol_version` + `config_schema` so UI renders config forms without cluster contact (`src/wire.rs:11,21-26,131-140`) and golden wire fixtures (`tests/fixtures/provider-wire/*.json`); intent-fingerprint reconcile loop with an anti-hot-loop guard — once THIS call created the pod, replace-classification errors out instead of hot delete/create cycling "which minted 107 Secrets in 600s in measurement" (`reconcile.rs:363-373,406-428`) (`bz-ops-deploy-admin.md` §§k8s; verified W2 §5).
- **Fail-fast operator posture:** CHANGE_ME-placeholder refusal before start ("Generate stable secrets first", `run.sh:19-36`); fatal unsafe combos like membership-without-owner (`main.rs:230-252`); admin web SPA served by the relay binary is gated purely by Host-header equality + Origin match with strict CSP/no-store (`api/admin/auth.rs:16-40`; `mod.rs:38-60`) — report flags real auth must be added on top (`bz-ops-deploy-admin.md` §admin).

#### mission-control

- **Diff-polling run detector with first-fetch suppression:** `seenRunIds` ref diffs successive 3 s polls; "the FIRST fetch seeds the set without toasting so pre-existing/historical failures never spam" (`use-active-runs.ts:14-16,:36-39`; completion toast :41-45, failure toast :47-54) — port into Electron main to drive OS notifications (`mc-notifications-alerting.md` §3; verified W3 Report 4).
- **Loop-detection escalation into a decision queue:** after `MAX_LOOP_ATTEMPTS = 3` failures, a pending decisions entry is written with options Retry/Skip/Stop-mission (`run-task.ts:374,:485-543`; dedupe :512-516); mission-level rollup reports aggregate one inbox message per cycle with subject branching `"Mission complete: X/Y tasks done"` vs `"Mission stalled: ..."` (`run-task.ts:376-443`, subject branches :386-389) (`mc-notifications-alerting.md` §3-§4).
- **Three-counter ambient-state endpoint:** one-pass `/api/sidebar` computing `unreadInbox`, `pendingDecisions`, `pendingFieldApprovals` (`src/app/api/sidebar/route.ts:15-19`) — generalizes to blocked-agents / awaiting-approval / failed-runs badges (`mc-notifications-alerting.md` §5).
- **Anti-patterns to design past (negative findings):** pull-only delivery — poll failures swallowed silently so "a dead backend produces NO operator signal at all" (`use-active-runs.ts:72-74`); visibility-gated polling slows alerts when hidden (`use-sidebar.ts:48-50`); mark-as-read implicit on thread expand can silently clear alerts (`inbox/page.tsx:393-396`); **no aging escalation exists** — pending approvals never time out (`mc-notifications-alerting.md` §§5.3a-c, 7.2). Headline negatives: exactly 4 in-app channels, **zero outbound transports**, no quiet hours/severity tiers (~90 cites + zero-hit negative searches).

### A3. Round 4 items still UNVERIFIED at closure

Per `verify/round4-master-index.md` §A legend and §D3 item 3 (as of 2026-08-23):

| Report | Status | Consequence |
|---|---|---|
| `mc-adapters-linelevel.md` (basis of G5, G6, parts of G7, FA-T2, FA-T5) | HYG only (encoding/coverage check, R4-4.2) — content NOT factually re-checked | Digest claims from it remain "unverified (self-reported coverage)" |
| `fa-pty-terminal.md` (basis of C1-C5, C8, FA-T3 detection substrate) | HYG only (BOM stripped R4-4.2) | Same caveat |
| `fa-wsl-remote-execution.md` (WSL/remote plane; ~120 cites + risk register) | HYG(4.3) only — no factual spot pass | Same caveat |
| `bz-pair-relay-cli.md` (pair-relay + pairing-cli; ~120 cites) | NONE — neither factual nor hygiene pass (written after both sweeps) | Treat all claims as unverified |

Also still open at closure (master-index §D2): three assigned discovery reports never landed — `fa-auth-onboarding.md` (R4-1.13), `bz-voice-media.md` (R4-1.14), `mc-ui-frontend.md` (R4-1.22) — any Round 5 plan should re-dispatch or formally drop them. Aggregate spot-verification record across waves W0/W2–W8: ~500+ citations sampled, **0 FAILED** anywhere (`round4-master-index.md` §B aggregate line).

### A4. New actionable recommendations (task-ready, wave-2/3 sourced)

Fabrica-app notes (extend §3a numbering):

- **FA-T12 (CLI↔desktop contract, from fa-window-tray-notifications + fa-settings-config-datadirs)** — Formalize the existing single-instance lock + discovery-file pair as THE agent-management control channel: lock keyed by userData profile with stable exit code 3 (`single-instance-lock.ts:5-12,:22-33`), `FABRICA-runtime.json` carrying runtimeId/pid/transports/authToken and pid-liveness reclaim (`fa-settings-config-datadirs.md:271-276`), headless serve mode with persistent-PTY-gated desktop promotion (`serve-desktop-activation.ts:12-28`). Do not invent a second discovery mechanism alongside these.
- **FA-T13 (operator alerting, from fa-window-tray-notifications × mc-notifications-alerting)** — Reuse FA's complete attention pipeline (tray pre-gate lighting `notifications.ts:397-403`, burst dedupe :445-452, click-to-pane :511-546, 13-agent-type copy normalization `notification-options.ts:7-21`) and port MC's diff-poll first-fetch suppression (`use-active-runs.ts:36-39`) into main-process-driven OS notifications. Fill the four gaps MC proves matter: dead-backend signal (MC swallows poll errors, `use-active-runs.ts:72-74`), explicit seen-vs-acknowledged separation (implicit mark-read `inbox/page.tsx:393-396`), aging escalation for approvals pending >N minutes (absent in MC, §7.2), and outbound transports beyond in-app channels (MC has zero).
- **FA-T14 (rebrand strategy upgrade, from fa-settings-config-datadirs §rebrand)** — Amend FA-T9/T11 with the cheaper alternative: "keep on-disk filenames and partition strings unchanged (opaque identifiers); change only display surfaces" (`fa-settings-config-datadirs.md:308-309`) — avoids the safeStorage-undecryptable break, the `persist:FABRICA-browser` orphaning, the `'FABRICA-first'` literal, and the dual-side path-mirroring hazard (:286-298) entirely.
- **FA-T15 (searchable agent archive, from bz-search-pubsub)** — For any future agent-transcript search feature, adopt the generated-tsvector pattern (index update IS the row write, `crates/buzz-search/src/lib.rs:7-10`) together with its privacy discipline: positive kind allowlist (`migrations/0008_fresh_install_search_allowlist.sql:1-23`), NULL-tsv for p-gated kinds with drift test (`kind.rs:144-154`), and mandatory per-hit re-authorization (`query.rs:1-9`). Note buzz's own flagged gap: turn-metrics ciphertext is deliberately unsearchable, so plaintext-over-agent-reasoning requires the same allowlist discipline (`migrations/0005_agent_turn_metric_fts.sql:1-4`).
- **FA-T16 (fleet live-status plumbing, from bz-search-pubsub)** — Port the refcount+debounce topic manager for pane/tab event subscriptions (`lib.rs:192-245`, 500 ms debounce) and heartbeat-scaled presence TTL (TTL = 3× heartbeat, `presence.rs:15-16`) for agent online/offline indicators; separate pure cache-invalidation hints from imperative control actions on distinct channels (`cache_invalidation.rs:9-13`; `conn_control.rs:10-15`) with DB-row backstop so a ban/disconnect survives publish loss (`conn_control.rs:14-15`).
- **FA-T17 (deploy-agents-to-cluster blueprint, from bz-ops-deploy-admin)** — If cluster deployment is scoped, start from buzz's k8s provider: stdin/stdout single-JSON wire protocol with golden fixtures (`main.rs:1-9`; `wire.rs:11,21-26`), intent-fingerprint reconcile with anti-hot-loop guard (`reconcile.rs:363-373,406-428`), ambient-kubeconfig-only auth (no credentials in provider_config, `config.rs:1-8`), and fail-fast config validation (`run.sh:19-36`).
- **FA-T18 (git-plane reuse, from fa-git-integration)** — Treat `main/git/runner.ts` as the general CLI-tool-runner precedent for FA-T1: raw execFile centralization, behavioral capability probes with negative caching (`git-capability-cache.ts:3,:5-10`), locale pinning env, and the selective agent credential guard (`pty.ts:1714-1719`) as the template for ANY unattended-vs-interactive behavior split.

Notes for other boards (extend §3b):

- **Note N4 (MC alerting gaps are upstream-fixable):** mc-notifications-alerting documents zero outbound transports, silent poll-error swallowing, implicit mark-as-read, and no approval aging escalation — worth filing upstream if MC remains maintained (`mc-notifications-alerting.md` §§5-7).
- **Note N5 (buzz admin-web needs real auth before any external exposure):** Host-header-equality gating only (`api/admin/auth.rs:16-40`); fine for localhost compose, not for shared deployments (`bz-ops-deploy-admin.md` §admin).

### A5. Addendum method & scan coverage

**Read this session (full):** `verify/round4-wave2-spot-verification.md` (85 ln), `verify/round4-wave3-spot-verification.md` (137 ln), `verify/round4-master-index.md` (128 ln); six post/pre-digest discovery reports read in full via parallel research passes instructed to return verbatim citations: `fa-window-tray-notifications.md` (35,926 B), `bz-ops-deploy-admin.md` (42,852 B), `fa-git-integration.md` (61,108 B), `fa-settings-config-datadirs.md` (39,606 B), `bz-search-pubsub.md` (33,663 B), `mc-notifications-alerting.md` (22,378 B); targeted reads of `Fabrica-atlas-tasks.md` rows for R4-3.3/R4-2.x and the Checkpoint table.

**Not read this session:** waves 4–8 discovery reports (`fa-command-palette-search.md`, `fa-telemetry-consent.md`, `fa-plugin-runtime.md`, `fa-wsl-remote-execution.md`, `fa-agent-hooks-probes.md`, `mc-execute-guards.md`, `mc-fieldtask-kanban.md`, `mc-decision-gates.md`, `bz-pair-relay-cli.md`, `fa-mobile-companion.md`) and their verify passes — covered here only via the master manifest's summaries and register entries; wave-4..8 findings integration beyond corrections CA-2/CA-3 was out of scope per the R4-3.3 spec (wave-2/3 focus). No source repos opened directly this session (synthesis over subagent-returned verbatim citations plus the two verify files' own source-checked tables).

**Integrity:** append-only — nothing above `_Digest end — ATLAS R4-3.2._` was altered; no file outside `.Fabrica-atlas-board/` touched.

_Addendum end — ATLAS R4-3.3._



