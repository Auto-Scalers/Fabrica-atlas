> **PATH MIGRATION NOTICE (2026-08-21):** This project moved from the environment root into `Fabrica-atlas/`. All `_sources/...` paths in this document now resolve to `Fabrica-atlas/_sources/...`. `Fabrica-app/` remains at the environment root.
# Buzz Desktop App Internals — Discovery Report (Round 3, P4-bzdesk)

Root: `_sources/buzz/desktop` (Tauri 2 + React 19). All paths relative to that root unless noted. Read-only mission; no files modified.

---

## 1. Agents Feature (`src/features/agents/`) + Managed-Agent Runtime (`src-tauri/src/managed_agents/`)

### 1.1 Nostr kinds used (canonical table: `src/shared/constants/kinds.ts`)
| Kind | Constant | Use | Line |
|---|---|---|---|
| **24200** | `KIND_AGENT_OBSERVER_FRAME` | Relay-ephemeral encrypted observer telemetry frames harness→owner (`#p`-addressed) | kinds.ts:59 |
| 44200 | `KIND_AGENT_TURN_METRIC` | Turn metrics archive | kinds.ts:60 |
| **30175 / 30176 / 30177** | `KIND_PERSONA` / `KIND_TEAM` / `KIND_MANAGED_AGENT` | NIP-33 parameterized-replaceable projections of persona/team/managed-agent definitions, published secrets-stripped by backend | kinds.ts:52–57 |
| 10100 | relay agent profile | Seeds channel lists — `ui/useManagedAgentActions.ts:105` |
| 39002 | channel membership | Fallback agent→channel mapping — `useManagedAgentActions.ts:118` |
| 13535 | identity-archive snapshot (Rust) | Archived-agent roster for nest rendering — `managed_agents/nest.rs:531,805` |
| 20002 | typing indicator | Bot typing fallback — `agentWorkingSignal.ts:22` |
| 31990 / 24010 | — | **Not present anywhere in the desktop app** (grep over all of `src/`). Agent-definition sharing is kind 30175 persona, not NIP-87-style 31990. |

### 1.2 Agent creation/edit events + management-op buffering
- **`agentManagement.ts`**: `AGENT_MANAGEMENT_REQUEST = "agent_management_request"` (line 7) is the *in-band* management contract carried inside decrypted kind-24200 payloads (not a Nostr kind). Types `AgentManagementCreateRequest` (:9–18: channelId/displayName/systemPrompt only) and `AgentManagementUpdateRequest` (:20–34: + runtime/provider/model/respondTo). `parseAgentManagementRequest()` (:56–135): strict key allowlists via `hasOnlyKeys` (:48), no-secret parser, update requires ≥1 change (:124). `requestTargetsEditablePersona()` (:137): only non-team personas editable.
- **`agentManagementBuffer.ts`**: `classifyAgentManagementOrigin()` (:8–29) trust gate → `"buffer" | "accept" | "reject"`. Accept only when sender pubkey is a locally-owned managed agent AND member of the claimed originating channel; buffer while ownership/channel queries are `undefined`.
- **`useAgentManagement.ts`**: subscribes to `subscribeAgentManagementRequests` (:117–141); buffers up to **100** requests until both queries initialize, then replays (:106–115, cap :133–135); dedups by `requestId`; one pending at a time. Re-verifies membership at submit via `assertAgentCanActFromOrigin()` (:160–176). `submitCreate` (:178–238): runtime availability check → avatar resolve → `createPersonaMutation` (kind 30175 path) → optional spawn → channel attachment → invalidates `personasQueryKey` + `managedAgentsQueryKey`. `submitUpdate` (:240–260).
- **`agentReuse.ts`**: reuse-vs-create guardrail. `commandsMatch()` (:22) folds claude-code-acp/claude-agent-acp → `"claude-acp"` (:14–19); `pickPreferredManagedAgent()` (:35) prefers running/deployed then newest `updatedAt`; `findReusablePersonaAgent` (:49), `findReusableGenericAgent` (:62), umbrella `findReusableAgent` (:81).
- **`useCreatedAgentChannelAttachment.ts`**: `presentCreatedAgent()` (:55–73) attaches new agent to target channel as role `bot`, `ensureRunning: true` (:12–17); failure keeps creation successful with retry toast (:20–52).
- **`useGlobalAgentConfig.ts`**: query key `["globalAgentConfig"]` (:24), `staleTime: Infinity` (:35); mutated only via `set_global_agent_config`.
- **Persona catalog** (`lib/personaCatalogRelay.ts`): parses shared kind-30175 heads (:341); signature verify via fresh `verifyEvent` (:151–168); NIP-33 coordinate collapse keeping only exact `["shared","true"]` heads (:322–362); hardening — prohibited chars (zero-width/bidi/control :50–86), name ≤128, prompt ≤64 KiB (:44–45), avatar allowlist https/http ≤2048 or SVG-emoji data URL ≤8 KiB (:220–221), base64 raster ≤256 KiB (:229–231); paged fetch `CATALOG_PAGE_SIZE=500` (:371), `MAX_CATALOG_PAGES=40` (:377), backward `until` walk with dedupe (:393–423).
- **Runtime resolution** (`lib/resolvePersonaRuntime.ts`): preference order preferred-id → `buzz-agent` → `goose` → first available → null (:13–27); full resolution + warnings (:59–144).

### 1.3 Observer relay ingestion (kind 24200)
- **Subscription** — `src/shared/api/observerRelay.ts`: filter `{kinds:[24200], "#p":[owner], limit:1000, since: now-300}` (:18–30); `OBSERVER_LIVE_LOOKBACK_SECS=300` (:12); control frames out-of-band via `sendAgentObserverControl` (:35).
- **Store** — `observerRelayStore.ts` (961 lines, module singleton): caps `MAX_OBSERVER_EVENTS=3000` (:29) with low-water eviction to 0.9×cap (:38), `MAX_PENDING_UNKNOWN_AGENT_FRAMES=100` (:39). Trust model: `knownAgentPubkeys` = union across subscribers (:146–147); requires `agent` tag + `frame=telemetry` (:532–578); verifies `event.pubkey == agent tag` (defense-in-depth vs compromised relay, :557–559); decrypts via Tauri `decryptObserverEvent` (:562). Dedup key `len(timestamp):timestamp:seq`; fast-path concat when batch lands after tail (:253–278); per-agent eviction floor prevents re-admission of evicted frames on replay (:77–80, :240–294). Batch envelope `OBSERVER_BATCH_KIND="batch"` (:444), `unwrapObserverBatch` (:450–459).
- **Side effects** in `processLiveObserverEvents` (:463–530), dispatched only over newly accepted events so reconnect replays cannot double-fire: latest-live session tracking per (agent,channel) (:487–501); `agent_management_request` → listeners consumed by `useAgentManagement` (:503–507); `session_config_captured` → `putAgentSessionConfig` IPC + invalidation callback (:509–511, wired :792–801); `control_result` → per-agent listener dispatch.

### 1.4 Managed-agent runtime reconciliation
- **`useManagedAgentRuntimeReconciliation.ts`** (135 lines): bootstraps a lazy harness pair for every auto-start local agent in every configured community. Per canonical-relay-URL refs: `reconciledRef` (:35), `inFlightRef` (:37), `failuresRef` (:39) for backoff. Effect on `[communities, queryClient]` (:134); adding a community mid-session spawns pairs there without switching. Calls Tauri `reconcileManagedAgentRuntimes(targets)` (:109); result cached via `cacheReconciledManagedAgentRuntimes` (:111), classified by `classifyReconcileResult` (:112). Retry backoff 5s/30s/2m capped (:62); one shared timer, all failing relays retried together (idempotent reconcile, :54–73); after cap relay abandoned until next trigger.
- Rust gate: fan-out eligibility = `start_on_app_launch && backend == Local` (`runtime_commands.rs:471`); bounded 10s authenticated relay probe before spawning (:398–420), concurrency 6 (:490); failed probe degrades to per-community Failed row rather than aborting batch (:534–562).

### 1.5 Active-turn store
- **`activeAgentTurnsStore.ts`** (839 lines): module-level external store keyed `agentPubkey → turnId → ActiveTurn` (:77). ActiveTurn = `{turnId, channelId, startedAt, lastActivityAt}` (:54–59) driving "working" badges with elapsed-time anchors.
- Ingestion from observer events via `syncAgentTurnsFromEvents` (:583) → `processEvent` (:364): `turn_started` → start (:404); `turn_completed/turn_error/agent_panic` → end (:416–426); `acp_read/acp_write/turn_liveness` → refresh activity or resurrect pruned-but-alive turns (:427–441).
- Ordering/idempotency: per-(agent,channel) composite watermark `lastProcessed` (:127) — only strictly newer `(timestamp, seq)` processed, so full-buffer replays are no-ops. Null-channel events gated by dedicated bucket (:117–119, `NULL_CHANNEL_KEY` :126).
- Clock skew: per-agent offset estimated as running minimum of `Date.now() − event.timestamp` (:162); anchors derived at read time (:508–524).
- Pruning every 5s while visible (`PRUNE_INTERVAL_MS` :52); removal after 25s inactivity (`REMOVE_AFTER_MS` :23); "frame-gap pause": if ALL of an agent's turns silent >20s, pruning pauses up to 3-min backstop (:319, `PRUNE_PAUSE_MAX_MS` :30). Terminal tombstones `terminalAtByAgent` (:139) prevent late liveness reviving completed turns; capped `MAX_TERMINAL_TOMBSTONES` (:50).
- Lifecycle APIs: `clearActiveTurnsForAgent` (:687) on desktop-initiated stop/restart (tombstones but preserves watermarks); `resetActiveAgentTurnsStore` (:707); community-switch save/restore snapshots (:740/:794). Subscribers via `useSyncExternalStore`: `useActiveAgentTurns` (:597), `useActiveAgentTurnsByChannel` (:612), bridge (:661).

### 1.6 Card minting
- **`cardMintStore.ts`** (236 lines): "card minting" = generating an agent card image ("MintedAgentCard") via stateless ~2–3 min Rust call `mint_agent_card` (import :5). Store owns the in-flight promise so the mint dialog can dispatch-and-close; composer activity rail shows live chip; completion lands as toast + persistent "card ready" chip (:11–20). Flow: `startCardMint(input)` (:144) fire-and-forget → `runCardMintJob` (:81) appends `CardMintJob {phase: minting|done|error}` (:32), awaits mint, toasts with error rewriting for missing/invalid OpenAI keys (:119–139). Viewers: `viewMintedCardJob` (:149)/`openCardViewer` (:171) with monotonic `viewerSeq` remount key; hooks (:214–235); `resetCardMintStore` (:190) wired into community reset.

### 1.7 Control actions / policies
- **`lib/managedAgentControlActions.ts`**: `isManagedAgentActive` = status ∈ {running, deployed} (:34); provider backend labels "Shutdown"/"Deploy", local "Stop"/"Start agent" (:38). `startManagedAgentWithRules` (:78) just starts (relay-mesh preflight lives in Rust `ensure_relay_mesh_for_record`). `respawnManagedAgentWithRules` (:91) = stop-then-start with `onStopped` boundary for clearing stale badges. `stopManagedAgentWithRules` (:112): provider agents get channel message `"!shutdown"` mentioning the agent (:132, needs resolvable channelId else throws); local agents use stop mutation. `deleteManagedAgentWithRules` (:144): confirm dialogs about orphaning remote deployments (:157–203), `forceRemoteDelete` for deployed remote (:205–210).
- **`lib/autoRestartPolicy.ts`**: decision `"fire"|"arm"|"hold"` (:23). Safety-critical: stop = SIGTERM→1s→SIGKILL, so this predicate is the only guard against killing a mid-turn agent (:6–9). Pair-scoped to viewed community (:12–15). Never-fire gates (:55–83): disabled, no drift, non-local backend, not running, observer not connected, any working signal, edge already consumed. Continuity window `AUTO_RESTART_QUIESCENCE_MS=3min` (:53) (18× the 10s liveness cadence); below that = "arm". One attempt per rising edge (`nextEdgeState` :99).
- **`lib/liveSwitchOutcome.ts`**: resolves live `switch_model` across channels; fires one control frame per active channel, learns results over observer relay. `awaitLiveSwitchOutcome({requestId, channelIds, subscribe, sendSwitches, scheduleTimeout})` (:65) → `"ok"|"unsupported"|"failed"|"not_delivered"|"pending"`. Fail-fast negatives: `unsupported_model` (:115), `failure` (:120), `turn_ending`/`no_active_turn` (:126). Success only via `switched` counted once per distinct expected channel (:142–148); timeout resolves `"pending"` never "ok" (:97–99). Identity guards: exact requestId + expected-channel match before handling (:101–114) — protects against 5-min reconnect replay.
- **`ui/useManagedAgentActions.ts`**: `handleStart` (:159), `handleRestart` (:175, serialized by `restartingAgentPubkey`, clears active turns at stopped boundary :188), `handleStop` (:260, clears turn store for local backends :272), `handleDelete` (:301, removes agent from all channels :293), `handleToggleStartOnAppLaunch` (:326), `handleStartPersona` (:210 — creates instance from persona definition resolving runtime via catalog + global preferred runtime), bulk stop (:390). Sorted list active-first (:77–87); channels-by-pubkey map seeded from kind:10100 profiles + kind:39002 membership (:103–134).

### 1.8 Rust managed_agents storage & keys (`storage.rs`)
- Store file `<app_data_dir>/agents/managed-agents.json` (`managed_agents_base_dir` :35, `managed_agents_store_path` :46). Unified store holds keyed instances AND key-less definitions/personas; readers filter (`load_managed_agents` :262 vs `load_agent_definitions` :272).
- Keys: each record carries `private_key_nsec`. Preferred storage = OS keyring under name `agent:{pubkey}` (`agent_keyring_name` :18). Keyringless builds keep nsecs inline in JSON written owner-only `0o600` unconditionally via `atomic_write_json_restricted` (:616). Migration `migrate_inline_key` (:197) lifts inline keys into keyring with write-and-read-back verify. `hydrate_keys_with` (:320) fills keys at load; a keyring read **error** ≠ absence — key stays empty and spawn refused (`spawn_key_refusal` :227 fails closed rather than injecting empty `BUZZ_PRIVATE_KEY`). Malformed stores preserved as `.json.invalid` (:284). Logs dir + rotation `MAX_LOG_FILE_SIZE` 10MB (:638).
- Runtime receipts: `agent-pids/` dir (:725); `write_agent_runtime_receipt` :734, removal/read :744/:754 — carry pair key, pid, desktop instance id, start time.

### 1.9 Spawn lifecycle (`runtime.rs`)
- Child = ACP harness command resolved from `record.acp_command` (`resolved_acp_command` :478, spawned :522/:884); actual agent CLI passed via env `BUZZ_ACP_AGENT_COMMAND` (:537, resolved to full path :497) + `BUZZ_ACP_AGENT_ARGS` (:538) + `BUZZ_ACP_MCP_COMMAND` (:539). Harness descriptor `resolve_effective_harness_descriptor` (:451) — persona edits propagate on next spawn.
- Env contract: `BUZZ_PRIVATE_KEY` (:533), `BUZZ_RELAY_URL` = canonical pair relay (:534), lazy-pool flags (:535–536), model/provider/prompt from single effective-config resolve (:439, :706–756), respond-to author gate (:771), observer mode `BUZZ_ACP_RELAY_OBSERVER=true` (:779), git credential helper NIP-98 (:783–805), effort env (:819), Claude `ANTHROPIC_MODEL` authority (:824), ownership markers `BUZZ_MANAGED_AGENT=<instance_id>` + `BUZZ_MANAGED_AGENT_START_NONCE` uuid (:845–848).
- Process group: Unix `process_group(0)` (:869–873) so whole tree dies together; Windows `CREATE_NO_WINDOW` (:877–882) + Job Object via `process_lifecycle::finish_spawn` (:910–919).
- Readiness: computed *before spawn* from effective env via `agent_readiness` (`readiness.rs:402`); if NotReady, setup payload JSON injected as `BUZZ_ACP_SETUP_PAYLOAD` (:554–668) and buzz-acp starts in minimal setup-listener mode instead of the agent pool — readiness enforced by desktop, transported by harness. Requirement kinds per runtime (`readiness.rs:414–446`): buzz-agent needs GitBash (Windows), provider, model (provider-specific fallback keys :478–495), creds (ANTHROPIC_API_KEY etc. :502–537); goose mirrors plus file-config tier (:553); claude/codex need CLI login probes (`readiness/cli_login.rs` via `claude auth status` / `codex login status`); unknown/custom commands need resolvable binary (`MissingBinary`).
- Registration: `start_managed_agent_process` (:945) binds expected relay scope, skips if already running (:953), writes runtime receipt atomically (kills child on receipt-write failure :978–982), inserts `ManagedAgentPairRuntime::starting`.

### 1.10 Supervision / restart / retention
- `runtime/lifecycle.rs`: `kill_stale_tracked_processes` (:6) kills PIDs from prior sessions whose marker matches this instance but aren't tracked now; `sync_managed_agent_processes` (:54) polls `try_wait`, extracts exit errors from logs (`meaningful_agent_error_from_log` :95), removes exited runtimes.
- `runtime/orphan_sweep.rs`: `sweep_orphaned_agent_processes` (:10) reads legacy PID files + receipts, verifies ownership via `BUZZ_MANAGED_AGENT` marker (sole authority, no binary-name gating :110–119), signals whole process groups, cleans receipts.
- `runtime/process.rs`: `terminate_process` (:245/:264) SIGTERM→≤1s→SIGKILL group kill (`sigterm_then_sigkill` :281); `valid_agent_runtime_receipt` (:382); `terminate_untracked_pair_runtime` (:448).
- `runtime/instance_reaper.rs`: reaps harnesses whose owning desktop instance died, matching desktop binary names (:5–12) and reading `BUZZ_MANAGED_AGENT=` out of process environments (macOS procargs2 FFI :47).
- Lifecycle states come from the harness itself over observer relay (`put_managed_agent_runtime_lifecycle`) — Starting/Ready/Failed/Stopped with nonce + signer validation (`observer_lifecycle_key` runtime_commands.rs:80).
- Retention: no time-based retention window for agent records found. Cleanup paths: explicit `delete_managed_agent` (commands/agents.rs:1093), `.invalid` backups, receipt/PID sweeps, log rotation. Archived identities: relay archives agent pubkeys in kind:13535 snapshot; nest roster filters archived agents (`nest.rs:531`, fail-open on unreachable relay :800–808).
- Event retention — `retention.rs`: SQLite DB per (relay_url, owner_pubkey) scope (`RetentionScope` :26; hashed path `<agents>/retention/<scope_hash>.db` :59), WAL mode + busy_timeout (:126–150). Stores persona/team/managed-agent (kind:30177) events durably for offline boot with NIP-33 latest-wins upserts (:1–6) and `pending_sync` flush queue (:359). Boot reconcile managed-agents.json → kind:30177 events: `reconcile.rs` (`reconcile_agents_to_events` :35, content-diff engine `retain_agent_record` :125 — unchanged content is true no-op; deletion reconcile deliberately absent :14–16 so truncated files never tombstone).

### 1.11 Nest directories (`~/.buzz`) — `nest.rs`
- Root `~/.buzz` prod / `~/.buzz-dev` dev (:64–70), initialized once at boot (`init_nest_dir` :90). Symlink roots rejected (:140–151). Owner-only 0o700 dirs (Unix, :226–282).
- Subdirs (`NEST_DIRS` :31–38): `GUIDES`, `RESEARCH`, `PLANS`, `WORK_LOGS`, `OUTBOX`, `.scratch`. `REPOS` provisioned separately by `repos::ensure_repos_setup_default` (:165) because it may be a symlink to user-configured repos dir.
- Files: `AGENTS.md` static template `NEST_AGENTS_VERSION=4` (:51), refreshed above `<!-- BEGIN BUZZ MANAGED -->` markers preserving user content (:394–444); skill `.agents/skills/buzz-cli/SKILL.md` (`NEST_SKILL_VERSION=5` :55, migrated from old `.claude/skills/buzz-cli` :456–516) with per-harness symlinks for known providers (:291–306).
- Dynamic roster section: `render_dynamic_section` (:535) renders Active Agents table + workspace relay footer, excluding identity-archived agents; written through `NestRegenGate` (:691–778) — generation-numbered ordered writes so stale regens never overwrite newer ones; triggered fire-and-forget by `try_regenerate_nest` (:828).
- CLI symlink: `~/.local/bin/buzz` (or `buzz-dev`) → bundled CLI (:341–373).

### 1.12 Tauri commands (managed agents)
- Runtime pairs (`managed_agents/runtime_commands.rs`): `put_managed_agent_runtime_lifecycle` :102, `list_managed_agent_runtimes` :140, `start_managed_agent_runtime` :230, `stop_managed_agent_runtime` :312, `restart_managed_agent_runtime` :379 (stop then lazy start), `reconcile_managed_agent_runtimes` :459.
- Core (`commands/agents.rs`): `list_managed_agents` :333, `create_managed_agent` :382, `start_managed_agent` :861, `stop_managed_agent` :1040, `delete_managed_agent` :1093.
- Related: `set_managed_agent_start_on_app_launch` (commands/agent_settings.rs:21), `set_managed_agent_auto_restart` (agent_settings.rs:65), `update_managed_agent` (commands/agent_models_update.rs:61), `get_managed_agent_log` (commands/agent_logs.rs:12), `discover_managed_agent_prereqs` (commands/agent_discovery.rs:1007), `list_relay_agents` (commands/agent_discovery/relay_directory.rs:233), `send_managed_agent_channel_message` (commands/messages.rs:715).

---

## 2. Projects + Git Subsystem

### 2.0 Architecture summary
- **No git library.** The shell shells out to system `git` CLI (`std::process::Command`). No git2/gix/openssh/sequoia in `src-tauri/Cargo.toml`. Signing uses `nostr = "0.44"` + `ed25519-dalek`.
- Git push/fetch auth delegated to external credential helper `git-credential-nostr` (separate crate); identity nsec passed via env var only.
- PRs/Issues are NIP-34-style Nostr events over WebSocket; git data comes from relay's git smart-HTTP endpoint (`…/git/<owner-pubkey>/<repo-id>`).

### 2.1 TS API layer (`src/shared/api/projectGit.ts`, 659 lines)
Key wrappers (function → command): `getGitIdentity()` :156 → `get_git_identity`; `getProjectRepoSnapshot()` :160 → `get_project_repo_snapshot`; `getProjectRepoDiff()` :180; `getProjectLocalRepoDiff()` :208; `getProjectLocalRepoSnapshot()` :244; `listProjectLocalRepositories()` :268; `getProjectRepoSyncStatus()` :307; `openProjectTerminal()` :332; `openProjectMergeRecoveryTerminal()` :353; `pushProjectLocalRepository()` :381; `pullProjectLocalRepository()` :407; `cloneProjectRepository()` :428; `createProjectRemoteBranch()` :442; `deleteProjectRemoteBranch()` :459; `mergeProjectPullRequest()` :559; `signProjectPullRequestReviewRequest()` :590; `publishProjectOwnerAnnouncement()` :602; `signProjectIssueAssignment()` :619; `signProjectIssueUnassignment()` :630; `signProjectPullRequestStatus()` :641; `publishProjectPullRequestMergedStatus()` :652.
- `ProjectPullRequestMergeError` class + `parseProjectPullRequestMergeError()` :488–557 — parses structured `{code, message, recovery:{action:"open_terminal", targetBranch, sourceBranch}}`.
- Types in `projectGitTypes.ts`: `ProjectRepoCommit` :1, `ProjectRepoDiffFile` (with `truncated`) :33, `ProjectRepoSyncStatus` (ahead/behind/canPush/canPull + block reasons) :59, `ProjectRepoMergeResult` (incl. `statusEvent`, `statusPublicationError`) :104.

### 2.2 Repo management UI flows
- Adding repos: `features/projects/useAddProjectRepository.ts` — fetches live kind:30621 project head (:73), partial-publish heal for dangling members (:86–102, :153–166), cross-project d-tag clobber guard (:112–121), dominated-write guard (:128), idempotent retry with lost-ACK detection by event-id query (:252–292). Publishes via `publishProjectOwnerAnnouncement` (native signed) or `publishOwnedAgentProjectAnnouncements` (managed-agent key).
- Attaching existing repo: `useAttachProjectRepository.ts` (:21–105) appends repo address via `buildProjectPatchTemplate`.
- Channel binding repair: `useBindProjectRepositoryChannel.ts` (:20–48).
- Branches list from **kind:30618 repo-state events**, not git: `hooks.ts:eventToRepoState()` :183–207 parses `refs/heads/*`, `refs/tags/*`, `HEAD` tags; `fetchRepoState()` :209 queries kind 30618 from owner+relay-self authors; `useRepoStateQuery` :659.
- Optimistic branches: `useOptimisticProjectBranches.ts` :5–88 — `rememberBranch`/`forgetBranch` reconcile locally-created branches until observed in 30618 events.
- Status refresh: `repoSyncHooks.ts:useProjectRepoSyncStatusQuery` :21–57 polls every 60s while focused; each poll runs a real `git fetch` backend-side; only enabled when host is `"buzz"` (`useProjectHost.ts` gates local clone/push/pull to buzz remotes + public GitHub).
- Push/pull/clone mutations: `repoSyncHooks.ts` :60 (push, auto-publishes kind:1619 PR update after push :79–106), :118 (clone), :150 (pull).

### 2.3 Diff viewing
- PR diff: `hooks.ts:fetchProjectRepoDiff` :467 (remote temp clone) and `fetchProjectLocalRepoDiff` :484 (local checkout, base = `initialCommit` when different from head). Queries `useProjectRepoDiffQuery` :706, `useProjectLocalRepoDiffQuery` :733.
- Single-commit diff: `useProjectCommitDiff.ts` :10–68 — prefers local checkout, falls back remote; passes only `targetCommit` so backend diffs commit-vs-parent; `staleTime: Infinity`.
- Panels: `ui/ProjectPullRequestFilesChangedPanel.tsx`, `ui/ProjectCommitDetailPanel.tsx`.

### 2.4 Pull requests flow
- Listing: `hooks.ts:fetchProjectPullRequests` :270–308 — parallel relay queries kinds 1618 (PRs, limit 200), 1619 (updates, 500), kind:1 comments (500), 1630/1631/1632/1633 statuses (500); reduced by `projectPullRequestEventsToPullRequests`. Query hook :813.
- Creating: `pullRequestMutations.ts:publishProjectPullRequest` :109–136 signs **kind:1618** via `signRelayEvent` with tags built by `projectPullRequestTags` :33–51: `a` (repo address `30617:<owner>:<dtag>`), `p` (owner+reviewers), `subject`, `c` (commit), `clone`, `branch-name`, `target-branch`, optional `merge-base`. Dialog: `ui/CreatePullRequestDialog.tsx`.
- Updates: `publishProjectPullRequestUpdate` :138–173 publishes **kind:1619** with tags `E` (root PR id), `P` (author), `c`, `clone`, `merge-base`; restricted to author/owner (`canPublishProjectPullRequestUpdate` :97); monotonic createdAt.
- Reviewing (`pullRequestReviews.ts`): review request = labeled kind:1 note, `t: review-request` + `p` reviewer tags (:97–142); managed-agent path routed through native `signProjectPullRequestReviewRequest`. Approve/request-changes: kind:1 notes with `t: approval` / `t: changes-requested` + `c <commit>` pinning reviewed commit (:169–231); permission gate `canReviewProjectPullRequest` :147 (not author; owner or requested reviewer; needs commit; Open/Draft only). Lifecycle open/draft/closed = kinds 1630/1633/1632 via `updateProjectPullRequestStatus` :44–90 (merged excluded — merges happen through git).

### 2.5 Issues flow
- Creation: `issueMutations.ts:publishProjectIssue` :16–36 signs **kind:1621** with repo address, owner, title as `subject`, label/category.
- Tracking: `hooks.ts:fetchProjectIssues` :228–268 — kind 1621 issues + statuses 1630–1633 + kind:1 comments + assignment ops fetched separately by issue id to avoid LIMIT truncation (:254–260). Query hook :801.
- Comments: kind:1 notes rooted on issue (`e <issueId> root`, `a` repo address, `p` recipients); monotonic per-author createdAt via `nextProjectIssueCommentCreatedAt` (:395–443).
- Assign/unassign: `issueAssignments.ts:writeProjectIssueAssignment` :50–119 — labeled kind:1 notes (`t: assignment`/`t: unassignment`), `prior` tag chaining for self-assignment LWW; managed-owner path → native `sign_project_issue_assignment`/`unassignment`.
- Sync: all reads via `relayClient.fetchEvents`; realtime invalidation classified in `relayQueryInvalidation.ts` — relay-dependent scopes `issues|pull-requests|activity-summaries` invalidated on inbound events; local-git scopes explicitly excluded (:44–53).

### 2.6 Merge flow (frontend)
- Mutation: `pullRequestMutations.ts:useMergeProjectPullRequestMutation` :224–257 → native `mergeProjectPullRequest` with target/source clone URLs, PR id/author, `statusCreatedAt`, branches, `expectedCommit`.
- UI: `ui/MergePullRequestButton.tsx` — confirm dialog :201–228; on success with `statusPublicationError` stores unpublished kind:1631 event and offers "Publish merged status" retry (:82–93, :161–176); on `merge_conflict` shows conflict-recovery panel :230–287 → "Resolve in Terminal" → `openProjectMergeRecoveryTerminal` + copyable commands from `projectPullRequestConflictCommands`.

### 2.7 Rust backend (`src-tauri/src/commands/`)
All git work through `run_git` — system git CLI subprocess.
- **`project_git_exec.rs`** — plumbing/security: `LOCAL_GIT_TIMEOUT` 60s / `REMOTE_GIT_TIMEOUT` 300s (:17–18); `run_git()` :63–129 (drains pipes on threads, kill-on-timeout); `configure_git_auth()` :131–183 scrubs env (`GIT_DIR`, `GIT_SSH_COMMAND`…), `GIT_CONFIG_GLOBAL=/dev/null`, disables hooks (`core.hooksPath=/dev/null`), protocol allowlist (http/https always, ext never, file gated), injects `NOSTR_PRIVATE_KEY` + `credential.helper=git-credential-nostr` + `credential.useHttpPath=true` only for remote subcommands (`git_needs_credentials` :40: clone/fetch/push/pull/ls-remote/merge). Validation: `clean_branch` :249 (allowlist `[A-Za-z0-9/_.-]`, rejects `-` prefix flags, `..`), `clean_target_ref` :268 (only `refs/tags/`, `refs/nostr/`), `validate_clone_url` :279 (must be `…/git/<64-hex-owner>/<repo>`), `validate_github_clone_url` :307 (public github.com only), `validate_workspace_clone_url` :367.
- **`project_git.rs`** — snapshots/status: parsers `parse_latest_commit` :91 (NUL-separated `%H%h%an%ae%at%s`), commits cap 50 :161, contributors cap 50 :169, tree/worktree files cap 250 :312/:246, preview content cap 64KB with path-traversal canonicalization check :137–159. `snapshot_from_repo` :346 (bare/temp clone) and `snapshot_from_worktree` :416; branch activity range `origin/<base>..HEAD` :285–310. `compare_local_remote_status` :498–684: current branch, up-to-200 local branches, origin URL rewrite only when differing (:536–545), shallow `fetch --depth=100 --end-of-options` (:548), ahead/behind via `rev-list --count`, push/pull block reasons (:628–663). Commands: `get_git_identity` :690, `get_project_repo_snapshot` :709 (temp clone `--filter=blob:none --no-checkout`, expected-commit verification :752–763), `get_project_local_repo_snapshot` :795, `list_project_local_repositories` :825, `get_project_repo_sync_status` :865, `push_project_local_repository` :916, `pull_project_local_repository` :948 (**ff-only**, refuses unless clean).
- **`project_git_workflow.rs`** — clone/merge/signing. `merge_project_pull_request` :493–669 native merge flow: (1) validates both clone URLs against workspace relay, owner hex, `clone_url_owner == target_owner` (:510–520); (2) resolves signer via `project_owner_identity` :116–153 — viewer keys if owner, else a managed agent record's private key (with `spawn_key_refusal` guard); (3) temp clone target branch (`--filter=blob:none --no-tags --single-branch`), fetch source, verify `FETCH_HEAD == expected_commit` else `branch_changed` error (:576–586); (4) `merge --no-edit` as `Buzz User <pubkey@users.noreply.buzz>` (:588–602); conflicts via `diff --name-only --diff-filter=U` → `classify_merge_error` (:603–616); (5) `push origin HEAD:<target_branch>` (:621–630); (6) builds + signs **kind:1631 merged-status event** (`build_merged_status_event` :238–276: tags `e <prId> "" root`, `a <30617 addr>`, `p` owner (+author), `merge-commit`, `r`) and publishes via `submit_signed_event_with_keys`; publication failure returned non-fatally (:645–668). Also: `build_pull_request_status_event` :278–314 (kinds 1630 open / 1632 closed / 1633 draft; merged alias rejected, test :884); `sign_project_pull_request_status` :444; `publish_project_pull_request_merged_status` :469 (re-publishes previously signed 1631 after verifying kind/pubkey/signature :480–485); `publish_project_owner_announcement` :190–222 (kinds 30617/30621 only, non-empty `d` tag, rejects created_at > now+300s :163–186); `clone_project_repository` :421 (skips if cloned, aligns unborn HEAD :343).
- **`project_git_branches.rs`**: `normalize_branch` :19 (no `.lock`, no `//`, no dot-leading components), `normalize_commit` :38 (40/64 hex). `create_remote_branch_blocking` :51: bare temp repo, shallow fetch depth=1, verify expected commit, push with lease `--force-with-lease=refs/heads/<new>:` and refspec `<commit>:refs/heads/<new>` (:93–105) — CAS-safe creation. Delete :114/:199: refuses default branch (via `ls-remote --symref` HEAD parse :43), delete via `--force-with-lease=refs/heads/<b>:<expected_commit>`.
- **`project_git_diff.rs`**: `MAX_PATCH_LINES=2000` per file (:12) with `truncated` flag (:329); three-dot vs two-dot based on merge-base availability (`diff_range` :174); empty-tree base for initial commits (:165); commit-vs-parent for detail view (:196); patches `diff --no-ext-diff --find-renames --find-copies --unified=80` (:367–380); numstat capped 250 files (:151–163). Commands: `get_project_repo_diff` :403, `get_project_local_repo_diff` :466.
- **`project_git_push.rs`**: `push_project_local_repository_blocking` :4–56 — gate on can_push, first-publish renames legacy `master`→target branch (`branch -M` :31–37), push origin HEAD:<branch>.
- **`project_git_recipient_notes.rs`**: shared builder `build_labeled_recipient_note_event` :75–127 — kind:1 note, tags `e <root> "" root`, `a <repo addr>`, one `p` per recipient (1–50, deduped/sorted), `t <label>`; signed with owner keys. `sign_project_pull_request_review_request` :225, `sign_project_issue_assignment` :249 / unassignment :258.
- **`project_git_merge_error.rs`**: `ProjectPullRequestMergeError {code, message, recovery}` :17; codes `merge_conflict` (with `open_terminal` recovery :32–42), `branch_changed`, `merge_task_failed`, `merge_failed`, and relay token `GIT_NO_CHANNEL_BINDING_TOKEN` mapped from push stderr with remediation hint `buzz repos bind --id <repo> --channel <channel-uuid>` (:45–62).
- **`project_repo_paths.rs` & `project_terminal.rs`**: repo discovery candidate names `owner--repo`, project dtag, url tail (:101); verified by reading `.git/config` origin URL inside repos root (`checkout_origin_matches` :72, worktree `.git` pointer support :48). Default roots `<nest_dir>/REPOS` and `~/.buzz/REPOS` (:147–156). `open_project_terminal` :108 finds-or-clones then launches OS terminal (macOS `open -a Terminal` :59, Linux emulator candidates :73, Windows `cmd /C start` :95). `open_project_merge_recovery_terminal` :169 authenticates, fetches exact source commit (verifies expected_commit :243), pins refs `refs/buzz/merge-recovery/<commit>` and `refs/buzz/merge-recovery-target/<head>` via `update-ref` (:50–56, :220–255), opens terminal without touching checked-out branch.

### 2.8 Signing model takeaways
PR ops are signed **Nostr events**, not git signatures. Merge commits themselves are unsigned git commits authored as `<merger-pubkey>@users.noreply.buzz`; authorization comes from (a) relay-side push policy keyed to the Nostr identity via credential helper, and (b) owner-signed lifecycle events (1630–1633). Managed agents can act as owner using their stored nsec (`project_owner_identity`). Safety posture: everything relay-supplied validated (branch allowlists, clone-URL shape pinned to active relay, expected-commit CAS checks, `--force-with-lease` pushes, `--end-of-options`, hooks disabled, env scrubbed). Conflict handling deliberately out-of-band: native merge aborts with structured `merge_conflict`; recovery happens in a user terminal prepared by `open_project_merge_recovery_terminal` with namespaced backup refs.

### 2.9 Event-kind registry (frontend mirror)
`src/shared/constants/kinds.ts`: `KIND_REPO_ANNOUNCEMENT=30617` :62, `KIND_REPO_STATE=30618` :63, `KIND_PROJECT_ANNOUNCEMENT=30621` :65, `KIND_GIT_PATCH=1617` :66, `KIND_GIT_PULL_REQUEST=1618` :67, `KIND_GIT_PR_UPDATE=1619` :68, `KIND_GIT_ISSUE=1621` :69, `KIND_GIT_STATUS_OPEN/MERGED/CLOSED/DRAFT = 1630/1631/1632/1633` :70–73.

---

## 3. Huddle Voice Subsystem (`src/features/huddle/` + `src-tauri/src/huddle/`)

### 3.0 Architecture overview
```
MIC CAPTURE (main window webview)
  getUserMedia(48kHz, echoCancellation, noiseSuppression)
    -> GainNode -> AudioWorkletNode "stt-tap-processor" (public/worklet.js)
    -> 960-sample (20ms) f32 batches, zero-copy transfer
    -> raw binary Tauri invoke("push_audio_pcm")            [mod.rs:742]
    -> fan-out: STT pipeline + audio relay encoder

STT PATH
  SttPipeline::push_audio -> bounded sync_channel(50)        [stt.rs:88]
  stt-worker thread: rubato 48k->16k -> earshot VAD -> sherpa-onnx Parakeet
  -> tokio mpsc<String> -> transcription task -> kind:9 Nostr event POST /events

RELAY MEDIA PATH (not WebRTC - plain WebSocket + Opus)
  pcm_tx (mpsc 50) -> send task: Opus encode 48k mono Voip @32kbps DTX
                     + v2 8-byte header -> WS binary
  recv task: WS binary -> per-peer NetEq jitter buffer -> per-peer rodio Player
             -> device Mixer; speaker events emitted to frontend

AGENT VOICE PATH
  relay live subscription (frontend) -> speak_agent_message IPC
  -> TtsPipeline text queue(8) -> tts-worker thread: Pocket TTS (24kHz)
  -> rodio Player (local playback only - agent audio NOT re-broadcast)

SIGNALING / MEMBERSHIP
  Nostr events via relay REST/WS: kind 9007 ephemeral channel, 9000 membership,
  48100 started, 48101 joined, 48102 left, 48106 voice guidelines, kind:9 transcript
```

### 3.1 Frontend session lifecycle — `HuddleContext.tsx`
- `startHuddle` (:625): `invoke("start_huddle", {parentChannelId, memberPubkeys, channelName})` → `connectAndSetupMedia` (:548) → getUserMedia `{echoCancellation:true, noiseSuppression:true, sampleRate:48000}` (:570–574) → `setupAudioWorklet` → `invoke("confirm_huddle_active")` (:609). `joinHuddle` (:705) same via `join_huddle`. `leaveHuddle` (:472) stops worklet + mic track → `invoke("leave_huddle")`. Cleanup-failed-start (:491): creator calls `end_huddle`, fallback `leave_huddle`.
- Backend state hydration: `get_huddle_state` + listen `"huddle-state-changed"` (:453–465); phase `"idle"` triggers disconnectMedia.
- Audio reconnect loop (:822–871): listens `"huddle-audio-disconnected"`, retries `reconnect_huddle_audio` with backoff `[0,100,250,500,1000,2000,2000] ms`, gives up → leave.
- Companion-window mirroring: main window owns mic; companion windows mirror via app-level events `huddle-audio-command` / `huddle-audio-state` / `huddle-audio-level` (:50–52).

### 3.2 AudioWorklet capture — `lib/audioWorklet.ts` + `public/worklet.js`
- `setupAudioWorklet` (audioWorklet.ts:51): AudioContext forced 48000 Hz; processor `stt-tap-processor`; worklet accumulates **960 samples = 20 ms**, posts Float32Array with ownership transfer. Raw binary IPC wrapper `invokeRawBinary` (:10) using `window.__TAURI_INTERNALS__.invoke` for `InvokeBody::Raw`.
- PTT gating in worklet: `{type:"ptt", active}` discards frames when closed; transmission = `manuallyUnmuted || (mode==="push_to_talk" && shortcutActive)` (:81–87). Rust→JS event `"ptt-state"` forwarded into worklet (:110).
- Mic level meter `useMicLevelAnalyser.ts`: AnalyserNode fftSize 512, ~30 Hz updates, adaptive noise floor, hysteresis gates (`MIC_VOICE_GATE_ON_RMS=0.018`, off `0.012`, attack 0.58) (:3–11).

### 3.3 Push-to-talk frontend — `lib/useHuddlePttState.ts`
Mode fetched via `get_voice_input_mode` (:20); default `push_to_talk`. Listens `"ptt-state"` (:30); plays Web-Audio cue beeps (880 Hz press / 440 Hz release, 50 ms, gain 0.05) (:44–51).

### 3.4 Agent voice routing (frontend) — `lib/useTtsSubscription.ts` + `lib/ttsLiveMessages.ts`
- Only the audio-owning window subscribes (HuddleContext.tsx:775). Agent identity fail-closed: `get_huddle_agent_pubkeys` every 30 s (useTtsSubscription.ts:18, :192–213); until loaded nothing speaks; failure clears set.
- Live filter over relay (`buildHuddleTtsLiveFilter`) with **5 s startup replay window** (`TTS_STARTUP_REPLAY_WINDOW_SECONDS` :21) + event-ID dedup ring of 5000 (:284–299).
- Eligibility rules (ttsLiveMessages.ts:55–76): kind must be `KIND_STREAM_MESSAGE`/`_V2`, `h` tag matches ephemeral channel, author ∈ agent set, not self-authored, non-empty, not `[System]`, attachment URLs stripped.
- Ordered serialization: `createOrderedSpeaker` (:101) chains promises; generation counter drops queued items when TTS disabled. Readiness gate holds events until membership + TTS state both known (:164). Delivery: `invoke("speak_agent_message", {text, routeId, speakerPubkey})` (useTtsSubscription.ts:68).
- Hotstart poll `usePipelineHotstart.ts`: `check_pipeline_hotstart` every 15 s.

### 3.5 Speaker activity UI — `lib/useHuddleSpeakerActivity.ts`
Listens `"huddle-speaker-levels"` (remote peers), `"huddle-tts-speaker-level"` ({pubkey, level}), `"huddle-active-speakers"` (string[]); merges TTS activity into remote set (:16–38).

### 3.6 Rust state & lifecycle — `state.rs`, `mod.rs`, `pipeline.rs`
- `HuddleState` god-object (state.rs:46–144): phase enum `Idle→Creating/Connecting→Connected→Active→Leaving` (:36–43); shared atomics `tts_active`, `tts_cancel`, `tts_starting`, `stt_starting`, `ptt_active`, `manual_mic_unmuted`, `session_generation` (AtomicU64); pipeline handles `stt_pipeline`/`tts_pipeline`; `audio_ws_cancel` + `audio_relay_pcm_tx`. `VoiceInputMode::{PushToTalk (default), VoiceActivity}` (:28–32).
- Commands (mod.rs): `start_huddle` :185 — creates kind:9007 ephemeral channel (ttl 3600), posts kind:48106 guidelines, adds members role `"bot"` (kind:9000), emits kind:48100, then post_connect_setup. Max agents `MAX_HUDDLE_AGENTS=20` (relay_api.rs:23). Full rollback archives orphan channel. `join_huddle` :402, `leave_huddle` :592 (auto-end when last human; safe default assumes 2 humans remain on fetch failure), `end_huddle` :654 (creator-only unless force). `teardown_huddle` :483 bumps session_generation first, cancels token before dropping pcm_tx, shuts pipelines outside lock. `confirm_huddle_active` :689 Connected→Active after frontend mic ready. `set/get_voice_input_mode` :129/:168 — mode switch restarts STT pipeline. `push_audio_pcm` :742 raw binary, cap `MAX_AUDIO_BATCH_BYTES=100KB` (:735); fans out to STT (`try_send`) and relay encoder (`try_send`, non-blocking). `download_voice_models` :777 / `get_model_status` :787. `speak_agent_message` :805 (see 3.10).
- Pipeline lifecycle (pipeline.rs): `post_connect_setup` :178 hydrates roster → downloads models → `connect_audio_relay` (**failure fatal**) → starts TTS then STT. `maybe_start_stt_pipeline` :280 / `maybe_start_tts_pipeline` :413 use `stt_starting`/`tts_starting` sentinels against TOCTOU double-construction; construction in `spawn_blocking`. `check_pipeline_hotstart` :38 revives dead pipelines, refreshes rosters every 15 s. Transcription task `spawn_transcription_task` :613 posts kind:9 with p-tags read at post time, NIP-98 auth, rate-limit gate, egress guard (`sign_and_guard_stt_body` :593).

### 3.7 Audio transport — `relay_api.rs` (+ `wire.rs`)
**Transport is a WebSocket to the relay, not WebRTC, not Nostr-relayed media**: `WS {relay}/huddle/{channel_id}/audio` (relay_api.rs:56).
- Handshake (:68–161): server sends JSON `challenge` → client replies NIP-42-style kind:22242 event signed with `relay`+`challenge` tags plus `protocol_version: 2` and `parent_channel_id` → server responds `joined` with peer list `(peer_index u8, pubkey)`. `HANDSHAKE_TIMEOUT=5s` (:42).
- Send task (:249–328): PCM f32 LE batches → chunks of `FRAME_SAMPLES=960` (20ms @48kHz) → `opus::Encoder` (crate `opus = "0.3"`), **48000 Hz, Mono, Application::Voip, bitrate 32000 bps, DTX enabled** (:233–240); partial final frame zero-padded; per-frame v2 header prepended; DTX flagged when encoded packet ≤2 bytes (:304).
- Wire protocol v2 (wire.rs): header 8 bytes big-endian — `seq:u16`, `ts_48k:u32` (+960/frame), `level_dbov:i8` [-127,0], `flags:u8` (bit0 = FLAG_DTX). `PROTOCOL_VERSION=2` (:40), `V2_HEADER_LEN=8` (:43). `audio_level_dbov()` RMS→dBov (:133). Relay frames: `[peer_index u8][header][opus]`. Mixed-version rooms rejected `upgrade_required`.
- Downstream control messages (JSON text): `joined`, `roster`, `left` handled in playout loop. Reconnect: `reconnect_huddle_audio` command (reconnect.rs:19) re-dials only the audio WS; stale-session guard via session_generation.

### 3.8 Jitter buffer / playout — `jitter.rs`, `playout.rs`, `audio_output.rs`
- `neteq = "0.8"` crate drives a per-peer NetEq instance; custom `OpusFrameDecoder` wraps `opus::Decoder::decode_float` (no FEC) (jitter.rs:77–124). Synthetic SSRC = peer_index; payload type 111.
- Constants (jitter.rs:44–64): `SAMPLE_RATE_HZ=48000` mono, `FRAME_DURATION_MS=20`, `FRAME_TIMESTAMP_DELTA=960`, playout 10 ms = 480 samples, `MIN_DELAY_MS=40`, `MAX_DELAY_MS=200`, `MAX_PACKETS_IN_BUFFER=50`.
- Playout loop (playout.rs:165): tokio select with timers — `PLAYOUT_TICK_MS=10`: drain one NetEq frame per *active* peer into its own `rodio::Player` connected to shared `MixerDeviceSink` (per-peer players fix multi-speaker FIFO serialization, :20–24). Idle-peer grace `IDLE_PEER_GRACE=500ms` (:55). Clock-drift recovery: queue depth ≥10 → play at 1.02× until ≤4; emergency drop at 30 buffers (:76–79). `SPEAKER_TICK_MS=500`: emit `"huddle-active-speakers"` (non-DTX only); `SPEAKER_LEVEL_TICK_MS=50`: emit `"huddle-speaker-levels"` with decay ×0.55, retain >0.015.
- **Remote barge-in**: while `tts_active`, counts non-DTX frames per peer in 500 ms windows (`FRAME_WINDOW`); ≥ `REMOTE_SPEECH_THRESHOLD=5` frames (relay_api.rs:26) sets `tts_cancel` (playout.rs:350–364).
- Output device commands: `list_audio_output_devices` / `set_audio_output_device` / `get_audio_output_device`; `open_output_sink_by_name` (audio_output.rs:68) via rodio/cpal.

### 3.9 STT — `stt.rs` (+ models.rs)
Pipeline (doc stt.rs:5–16): worklet → `push_audio_pcm` → sync_channel(50) (`AUDIO_QUEUE_DEPTH`, ≈5 s backlog) → dedicated std thread `stt-worker`:
1. Resample 48k→16k mono with **rubato FFT resampler**, chunk 1024, 2 ops, FixedSync::Input (:227).
2. VAD: **earshot** `Detector<DefaultPredictor>`, exactly 256-sample frames @16 kHz, threshold `VAD_THRESHOLD=0.5` (:170–174); min voiced `MIN_VOICED_FRAMES=12` (~192 ms) to reject blips (:180).
3. Recognizer: **sherpa-onnx OfflineRecognizer**, NeMo CTC config loading `model.int8.onnx` + `tokens.txt` — NVIDIA **Parakeet TDT-CTC 110M en int8** (:247–275; download URL models.rs:119). `num_threads=1` default (env override `BUZZ_STT_THREADS`), debug=false.
4. Flush: after `SILENCE_FLUSH_FRAMES=19` (~300 ms) silence; OOM cap `MAX_SPEECH_SAMPLES=30s@16k`; PTT-held never silence-flushes (`vad_flush_allowed` :551); transmit-edge flush on key release (:313–326). Experimental speculative decode `BUZZ_STT_SPECULATIVE=1` (:212).
- Not streaming recognition — offline decode per utterance (`decode_speech` :521: create_stream → accept_waveform(16000) → decode). Mic stays open during local TTS playback (headphone assumption; no echo-gating of local mic) (:63–68, :398–403).
- Model management (models.rs): dirs `~/.buzz/models/parakeet-tdt-ctc-110m-en` and `pocket-tts`; SHA-256 pinned archive (`STT_ARCHIVE_SHA256` :47), manifest versioning `.buzz-model-manifest` ("2" STT / "5" TTS), atomic install with backup/recovery, legacy Moonshine cleanup, CC-BY-4.0 attribution sidecar.

### 3.10 TTS — `tts.rs` + submodules + `buzz-voice` crate
Engine: **Pocket TTS** (Kyutai-derived, ONNX; "April INT8 bundle" from HF `KevinAHM/pocket-tts-onnx` rev 58a6d00, bundle `english_2026-04` — crates/buzz-voice/src/pocket_models.rs:4–10). One-step consistency model, `SYNTH_STEPS=1`. **Output sample rate 24 kHz** (crates/buzz-voice/src/pocket.rs:33). Files: `flow_lm_main_int8.onnx`, `flow_lm_flow_int8.onnx`, `mimi_decoder_int8.onnx`, `mimi_encoder.onnx`, `text_conditioner.onnx`, `tokenizer.model`, `bundle.json`, voice WAVs (models.rs:168–191).
- Worker thread `tts-worker` (tts.rs:260): loads engine, default voice style, warmup inference (:324), opens persistent rodio Player, primes with 100 ms silence (macOS CoreAudio lazy init :374–394), spawns barge-in monitor thread. Text queue `TEXT_QUEUE_DEPTH=8`; cross-item lookahead pipelining keeps speech gapless (:28–32).
- Text prep: `preprocess_for_tts` (preprocessing.rs:28) strips fenced/inline code, URLs, markdown, emoji, expands numbers; tokenizer-aware splitting — first sentence isolated for time-to-first-audio, later sentences packed ≤50 tokens (`split_text_for_playback`).
- Audio decoration (tts_audio.rs): clamp ±1.0, 8 ms fade-out (`FADE_OUT_SAMPLES=192 @24kHz`), 20 ms silent lead-in cushion (`SENTENCE_LEAD_IN_SAMPLES=480`).
- Voices (tts_voice_registry.rs): 12 bundled VCTK presets — Anna, Vera, Fantine, Charles, Paul, Eponine, Azelma, George, Mary (default `reference_sample.wav`), Jane, Michael, Eve — each a reference WAV (voice cloning by style embedding, `load_voice_style`). Imported voices keyed `pocket:imported:<sha256>`. Per-agent assignment: first agent gets default voice, others distinct unused voices via FNV-hash selection (`stable_voice_index` agent_voice.rs:57); commands `ensure_huddle_agent_voice_settings`, `set_huddle_agent_tts_enabled`, `set_huddle_agent_voice` (agent_voice.rs:153–220). Style cache per worker; hot voice switch drains pre-change queue via `voice_generation` counter and separate `voice_cancel` flag.
- Streaming path experimental (`BUZZ_TTS_STREAMING=1`, delta = 12 Flow-LM frames; env `BUZZ_TTS_EMIT_FRAMES`): tts_streaming.rs:17–26.
- Caching: synthesized audio not cached; cached items are voice style embeddings per voice, warmed engine, downloaded model files.

### 3.11 Agent voice routing (Rust) — `speak_agent_message` (mod.rs:805)
Flow: normalize/truncate text to `MAX_TTS_TEXT_LEN=8096` chars (agent_tts_routing.rs:30) → no-op if `tts_enabled=false` → resolve per-agent voice (`voice_reference_for_agent` agent_voice.rs:222; disabled agent ⇒ silent no-op) → runtime gate `classify_agent_tts_runtime` (agent_tts_routing.rs:11): Disabled / Inactive(err) / NeedsPipeline(lazy-start + `await_inflight_tts_start` 15 s timeout) / Ready → verify speaker still in `agent_pubkeys` (fail-closed) → `enqueue_agent_tts_text` via spawn_blocking onto bounded queue with route_id + speaker_generation.
**Barge-in / interruption paths (four independent triggers converging on shared `tts_cancel` atomic):**
1. Remote human speech during TTS: playout frame counter sets `tts_cancel` (§3.8).
2. PTT key press: lib.rs:237–258 sets `ptt_active=true` and sets `tts_cancel` if `tts_active`; releases after 200 ms delay with press-generation guard.
3. Monitor thread `tts-barge-in-monitor` (tts_speaker_cancellation.rs:16): 10 ms tick; on cancel rising edge clears player under `player_ops` mutex, clears `tts_active` (~15 ms flag-to-silence).
4. Targeted Stop: `interrupt_huddle_speech(agent_pubkey)` (commands.rs:30) → `cancel_active_speaker`; agent removal `remove_agent_from_huddle` (commands.rs:52) bumps that speaker's generation and cancels only their audio (`SpeakerCancellation`, `ActiveSpeaker` single-owner queue).
Local mic never cancels TTS (headphone contract).

### 3.12 Push-to-talk gating (Rust side)
Global shortcut Ctrl+Space registered only while huddle Connected/Active in PTT mode (`sync_registration` ptt_shortcut.rs:22). Handler (lib.rs:214–286): press → `ptt_active=true` (+TTS cancel), emit `"ptt-state" true`; release → 200 ms delayed `ptt_active=false` (generation-guarded), emit false. Worklet-side gating + STT-side gating: speech accepted only if VAD-positive AND (`ptt_held || manual_mic_unmuted`) (stt.rs:436–444); held shortcut suppresses silence-flush. `set_huddle_manual_mic_unmuted` command (commands.rs:16) — clickable mic independent of shortcut; defaults muted so PTT truly gates.

### 3.13 Cargo deps (huddle-relevant, src-tauri/Cargo.toml)
`opus` 0.3 (:90), `neteq` 0.8 default-features off (:91), `sherpa-onnx` 1.12 (:138), `rodio` 0.22 (:142), `earshot` 1.0 (:143), `rubato` 3.0 (:144), `audioadapter-buffers` 3.0 (:145), `tokio-tungstenite` 0.29 rustls (:86), `reqwest` 0.13 (:102), `nostr` 0.44 nip44/nip49 (:96), `buzz-voice` path dep (:109), `bzip2`/`tar`/`sha2` (:122–124). **No cpal direct, no webrtc crate** (cpal transitively via rodio; WebRTC unused).

### 3.14 Tauri command/event surface (huddle)
Commands registered (src-tauri/src/lib.rs:850–887): `start_huddle`, `join_huddle`, `leave_huddle`, `end_huddle`, `get_huddle_state`, `close_huddle_companion`, `open_huddle_window`, `push_audio_pcm` (raw binary), `reconnect_huddle_audio`, `confirm_huddle_active`, `set_huddle_transcription_enabled`, `start_stt_pipeline`, `download_voice_models`, `get_model_status`, `speak_agent_message`, `interrupt_huddle_speech`, `add_agent_to_huddle`, `remove_agent_from_huddle`, `sync_agents_to_active_huddle`, `check_pipeline_hotstart`, `get_huddle_agent_pubkeys`, `set_voice_input_mode`, `get_voice_input_mode`, `set_huddle_manual_mic_unmuted`, `list_audio_output_devices`, `set_audio_output_device`, `get_audio_output_device`, `ensure_huddle_agent_voice_settings`, `set_huddle_agent_tts_enabled`, `set_huddle_agent_voice`, TTS settings: `get_tts_settings`, `list_voice_registry`, `set_pocket_voice`, `preview_pocket_voice`, `import_pocket_voice`, `delete_pocket_voice`.
Events Rust→frontend: `huddle-state-changed` (state.rs:500), `huddle-audio-disconnected` (relay_api.rs:196), `huddle-active-speakers` (500 ms), `huddle-speaker-levels` (50 ms), `huddle-tts-speaker-level`, `ptt-state`, `huddle-companion-returned`. Frontend↔frontend mirror: `huddle-audio-command`, `huddle-audio-state`, `huddle-audio-level`.

### 3.15 Key constants summary
| Constant | Value | Location |
|---|---|---|
| Opus bitrate/rate/frame | 32 kbps, 48 kHz mono Voip, 20 ms (960 smp), DTX on | relay_api.rs:233–240 |
| Wire header | 8 B: seq u16, ts_48k u32, dBov i8, flags u8; PROTOCOL_VERSION=2 | wire.rs:40–53 |
| NetEq delays | min 40 ms / max 200 ms / 50 pkt cap; 10 ms playout (480 smp) | jitter.rs:59–64 |
| Playout recovery | start 10 / end 4 / emergency 30 / speed 1.02 | playout.rs:76–79 |
| Remote barge-in | ≥5 non-DTX frames per 500 ms per peer | relay_api.rs:26 |
| STT queue/flush/VAD | depth 50 (~5 s); flush 19 frames (~300 ms); VAD thr 0.5; min voiced 12; 30 s cap | stt.rs:38–183 |
| TTS queue/fades | depth 8; fade-out 192 smp (8 ms); lead-in 480 smp (20 ms); 24 kHz output; max text 8096 chars | tts.rs:81–108, agent_tts_routing.rs:30 |
| IPC audio batch cap | 100 KB | mod.rs:735 |
| Max huddle agents | 20 | relay_api.rs:23 |
| Poll intervals | hotstart 15 s; agent refresh 15 s (Rust)/30 s (JS); handshake 5 s; PTT release delay 200 ms | pipeline.rs:120, useTtsSubscription.ts:18, relay_api.rs:42, lib.rs:269 |

Notable design points: media is WS+Opus (SFU-style relay with peer_index mixing), not WebRTC; STT is utterance-level offline Parakeet rather than streaming; TTS is local-only playback (agent audio never enters the media uplink); barge-in has four independent triggers all converging on the shared `tts_cancel` atomic.

---

## 4. Shared/API Relay Client Stack (`src/shared/api/`)

### 4.1 Overall architecture
**Not a browser WebSocket.** Client rides `tauri-plugin-websocket` via Tauri IPC (`invoke("plugin:websocket|connect")`); actual TCP/TLS socket lives in Rust; JS gets frames through a Tauri `Channel<unknown>`.
- Singleton: `src/shared/api/relayClient.ts:3` — `export const relayClient = new RelayClient()`. `setVisibleChannel(id|null)` delegates (:14–16). Real class **`RelayClient` in `relayClientSession.ts:78`** (~1084 lines); `relayClient.ts` is instantiation wrapper.
- Protocol: plain **Nostr/NIP-01 relay protocol over one WebSocket**: `["EVENT",subId,event]`, `["REQ",subId,filter]`, `["CLOSE",subId]`, `["OK",eventId,bool,msg]`, `["EOSE",subId]`, `["CLOSED",subId,msg]`, `["NOTICE",msg]`, NIP-42 `["AUTH",challenge]`. No encryption at this layer.
- Message pump (`handleWsMessage`, relayClientSession.ts:755–835): generation guard (:756); every inbound frame feeds `stallWatchdog.recordInbound()` (:757); Close/Error → `resetConnection` (:759–767), close code **1012 = service restart** resets backoff to base (:760–761, `isServiceRestartClose` relayReconnectPolicy.ts:62–72); AUTH challenge → `handleAuthChallenge` (:787–789, impl :837–853); EVENT → subscription dispatch + 16 ms batching (:791–794, :855–886); OK → auth decision or publish ack (:797–807, :897–929); CLOSED → per-subscription recovery (`relayClosedRecovery.ts`) (:814–826); NOTICE starting `"rate-limited:"` arms rate-limit gate (:828–834).
- Serialization/signing all in Rust: `signRelayEvent()` (`tauri.ts:601–609` → command `sign_event`); `createAuthEvent()` (`tauri.ts:611–617` → `create_auth_event` in `desktop/src-tauri/src/commands/identity.rs:641–666`: kind 22242 NIP-42 client auth with `relay`+`challenge` tags, app identity keys); `getRelayWsUrl()` (`tauri.ts:366–368`). Outbound: `JSON.stringify(payload)` sent as `{type:"Text"}` via `plugin:websocket|send` (relayClientSession.ts:649–661).
- Subscription modes (`relayClientShared.ts:41–90`): `history` (buffered, resolved on EOSE, sorted by `(created_at,id)` :92–103), `first` (first match or null on EOSE), `live` (persistent; reconnect cursor state `lastSeenCreatedAt`, `pendingReplaySince` pinned backfill floor :64–75, `closedRetryAttempt/Timeout`). Live subs get readiness callbacks (`"eose"|"closed"|"timeout"` :57) with default 250 ms fallback timeout (relayClientSession.ts:600–616).
- Typed subscribe helpers (relayClientSession.ts): channel :320, live-only channel incl. kind 39005 thread summaries :328–344, huddle kinds 48100–48103 :351–363, typing indicators :365–378, user status kind 30315 :397–402, global stream :404, mentions :416.
- Filter builders (`relayChannelFilters.ts`): channel live vs history filters :27–90; aux backfill by `#e` chunked at **100 ids/chunk** (`AUX_BACKFILL_CHUNK_SIZE` :19); `MAX_HISTORICAL_LIMIT=10_000` (:20); reaction vs structural-aux split :110–131; mention filter :165–177.
- Inbound live events buffered and flushed every **`EVENT_BATCH_MS=16` ms** (relayClientTimings.ts:3; flush :867–886). Subs removed mid-batch skipped.

### 4.2 Reconnect logic
Constants (`relayClientTimings.ts`): `RECONNECT_BASE_DELAY_MS=1000` (:1), `RECONNECT_MAX_DELAY_MS=30000` (:2), `BACKOFF_RESET_STABLE_MS=60000` (:16), `AUTH_TIMEOUT_MS`/`HISTORY_TIMEOUT_MS`/`PUBLISH_TIMEOUT_MS`=25000 each (:9–11), `STALL_CHECK_INTERVAL_MS=10000` (:19), `STALL_IDLE_TIMEOUT_MS=60000` (:20).
- `scheduleReconnect()` (relayClientSession.ts:955–988): exponential doubling ×2 capped 30 s with **±25 % jitter** (`0.75 + Math.random()*0.5` :970). Backoff resets only after connection stable 60 s (`stabilityTimer` connect() :575–578). Service-restart close (1012) instantly resets to base (:760–761).
- Policy gates (`relayReconnectPolicy.ts`): `shouldScheduleReconnect` :32–38, `shouldWaitForScheduledReconnect` :40–44, `shouldRefuseConnect` :47–49. Terminal latch: `this.terminal` set when auth permanently rejected (`resetConnection(...,{reconnect:false})` :1027–1029); cleared only by `disconnect()` (community switch) or explicit `preconnect()` (:426–433); `ensureConnected()` refuses while terminal (:483–490). Callers wait on scheduled reconnects instead of storming: `RelayReconnectWaiters` (`relayReconnectWaiters.ts`), used at :508.
- Environment-driven resume: `resumeReconnect()` (:441–444) bypasses pending backoff timer but preserves terminal latch + AUTH streak. `useRelayResumeTriggers` (:59–83) hooks `online`/`focus`/`visibilitychange→visible`, coalesced; gated by `shouldTriggerResumeReconnect` (`relayResumeTriggerPolicy.ts`) — only in `reconnecting`/`stalled` states, min interval **`RESUME_TRIGGER_MIN_INTERVAL_MS=5000`** (:16). Rationale: WKWebView throttles background timers (doc :41–58).
- Manual reconnect (three-phase controller, `relayReconnectController.ts`, singleton :281): (1) fast path `preconnect()` deadline **`fastPathTimeoutMs=11000`** (:39); (2) escalation optional native transport-recovery hook (`relay_reconnect_hook_configured`/`relay_reconnect_hook` Tauri commands, wired `useReconnectRelay.ts:25–26`; Rust impl `desktop/src-tauri/src/commands/relay_reconnect.rs`); (3) wait for background backoff loop; backstop **`backstopMs=120000`** (:40) shows toast. React binding `useReconnectRelay.ts` shares in-flight state across banner/sidebar instances; on success defers `queryClient.invalidateQueries({predicate: isRelayDependentQuery})` (:58–70).

### 4.3 Replay of missed events — visible-channel prioritization
`src/shared/api/relayReconnectReplay.ts`, invoked from `replayLiveSubscriptions()` (relayClientSession.ts:935–953) right after AUTH completes (:581):
- **How it knows the visible channel:** UI calls `setVisibleChannel(channelId)` from `features/messages/hooks.ts:371` (null on cleanup :373) → stored as `visibleChannelId` on singleton (relayClientSession.ts:97, setter :111–113) → passed into replay (:942).
- **Priority ordering:** replay requests stable-sorted so any subscription whose filter `#h` includes the visible channel goes first (relayReconnectReplay.ts:221–234) — "the user sees their active channel recover before others on degraded networks."
- Burst shaping: REQs in batches of **`REPLAY_BATCH_SIZE=8`** (:38) with **`REPLAY_INTER_BATCH_DELAY_MS=50`** between batches (:46); gate re-checked before every batch (:243–244).
- Missed-window cursor: since = `lastSeenCreatedAt − RECONNECT_REPLAY_SKEW_SECS (5 s)` (:12, :197–203), floored by pinned `pendingReplaySince` (:204–211).
- Paged backfill: for single-channel full-kind-set filters (`shouldPageReconnectReplay` :88–95), pages of **`RECONNECT_REPLAY_PAGE_LIMIT=500`** (:13) walked backwards via `until=oldest−1` (:107–146), concurrency **`RECONNECT_REPLAY_PAGE_CONCURRENCY=4`** (:14), max **`PAGE_REPLAY_MAX_ATTEMPTS=3`** (:30). Failures never tear down healthy socket — degrade to live-only and pin `pendingReplaySince` so next reconnect covers window (:16–29, :274–321). Stale-connection guard: `isActive()` generation checks throughout (:123, :134, :187, :244, :299–300).
- Per-subscription CLOSED recovery (`relayClosedRecovery.ts` + classifier `relayClosedPolicy.ts`): three-way classification (:17–40): `rate-limited:` → gate + retry; `restricted:/blocked:/invalid:/pow:/duplicate:/unsupported:/…` → terminal (sub deleted); everything else retryable; `auth-required:` deliberately retryable (REQ racing AUTH handshake). Live-sub retry exponential 1 s→30 s (:14–15); rate-limited closes wait `max(backoff, rateLimitRemainingMs())` (:98–108). `prepareSubscriptionEvent` (:128–146) advances `lastSeenCreatedAt`, resets retry counters on live traffic.

### 4.4 Rate-limit gate
`src/shared/api/relayRateLimitGate.ts` — module-level singleton:
- Armed from NOTICE/CLOSED `rate-limited:` messages (`activateRateLimit`, called relayClientSession.ts:832 and relayClosedRecovery.ts:45,101). `parseRateLimitHint` regex `/retry in (\d+)s/i` (:39–42). Defaults/caps: **`DEFAULT_RATE_LIMIT_SECONDS=10`** (:15), **`MAX_HINT_SECONDS=300`** (:25, mirrors Rust `relay_admission.rs:41`). Overlapping hints extend to latest expiry, never shrink (:55–88). One shared promise for all waiters (`waitForRateLimit` :101–106); `rateLimitRemainingMs()` (:115–118); `resetRateLimitGate()` on community switch (:127–137).
- Consumers: `publishEvent` awaits gate before EVENT (relayClientSession.ts:713); history/first-event REQs await gate via `requestHistoryGated`/`requestFirstEventGated` in `relayGateBoundary.ts:24–108` (op timeout starts *after* gate clears); replay waits before and between batches (relayReconnectReplay.ts:183, :243, :318).
- Rust mirror: `desktop/src-tauri/src/relay_admission.rs` — identical semantics for HTTP bridge (`DEFAULT_RATE_LIMIT_SECONDS=10` :33, `MAX_HINT_SECONDS=300` :41, `activate_rate_limit` :56–69, `wait_for_rate_limit` :75+). All HTTP relay entry points call it (`relay.rs`, `relay/submit.rs`, `relay/get.rs`, team_snapshot, snapshot import, huddle STT). Reset per workspace change (`commands/workspace.rs:220`). `relay.rs:282` clamps hints before embedding them in error strings so TS gate sees capped values.

### 4.5 Stall watchdog
`src/shared/api/relayStallWatchdog.ts` — **passive, write-free liveness detection**: deliberately does NOT send ping probes because tauri-plugin-websocket 2.4.2 holds a global connection-manager mutex during `send()`, so a probe into a half-open TCP path could block future reconnects (doc :1–9). Liveness = inbound traffic including relay heartbeat pings. Check every **10 s**, stall after **60 s** silence (relayClientSession.ts:102–109). `recordInbound()` on every frame (:57–62, called :757); `checkIdle()` fires `onStall` → state `"stalled"` then `resetConnection(error)` (:105–108). Started after successful connect + replay (:582); stopped on reset/disconnect. Connection states incl. `stalled` documented in `relayClientShared.ts:17–30` ("half-open socket / VPN split-brain").

### 4.6 React Query invalidation bridge
- Event-to-query mapping: `src/shared/api/relayQueryInvalidation.ts` — pure predicate module. `RELAY_QUERY_ROOTS` (:1–36, ~35 roots: `channel-messages`, `channels`, `home-feed`, `presence`, `relayMembers`, `workflow*`, etc.), relay-scoped project parts (`issues`, `pull-requests`, `activity-summaries` :38–42) vs local-only parts excluded (:44–53). Exports `isRelayDependentQueryKey` (:75–80) / `isRelayDependentQuery` (:82–84).
- Auto-heal bridge: `useRelayAutoHeal.ts` — `RelayAutoHealScheduler` (:26–86) watches raw connection-state transitions; on degraded→connected fires `queryClient.invalidateQueries({predicate: isRelayDependentQuery})` (:113–120), rate-limited to **`AUTO_HEAL_MIN_INTERVAL_MS=15000`** (:16) with deferred-heal semantics so last recovery always wins; additionally defers behind active rate-limit gate (:108–116). Mounted in `app/AppShell.tsx:217`; subscribes to raw emitter, not debounced hook (:129–141).
- Manual reconnect success also invalidates via same predicate (`useReconnectRelay.ts:58–70`).
- QueryClient factory `queryClient.ts`: `retry:1`, `refetchOnWindowFocus:false`, `networkMode:"always"`, `gcTime:5min` (:23–37); custom focus manager wiring app-blur as unfocused (:10–21).
- UI-facing state hook `useRelayConnection.ts`: 2 s debounce on transient degraded states (`degradedAfterMs=2000` :26); connected/idle/disconnected reported immediately.

### 4.7 Supporting modules
| Module | Role |
|---|---|
| `relayClientShared.ts` | Types (`ConnectionState`, subscription/pending types), `sortEvents`, `getTextPayload` (handles all three tauri-plugin frame shapes :105–131), `isRelayConnectionDegraded` |
| `relayInboundBuffer.ts` | Frames during connect queued; overflow beyond **`MAX_PENDING_RELAY_FRAMES=256`** (:1) rejects connection (drain/overflow raced in connect(), :571–574) |
| `relayAuthPolicy.ts` | NIP-42 OK decision table: `armRelayAuthentication` timeout wrapper, `AuthOkTracker` — "already authenticated" counts as success; `restricted:`/`blocked:` terminal; otherwise retry, terminal after **`MAX_CONSECUTIVE_AUTH_REJECTIONS=3`** (:27); streak survives resume triggers, reset only by user re-engagement |
| `relayConnectionStateEmitter.ts` | Observable state store; immediate sync emission to new subscribers |
| `relayReconnectWaiters.ts` | Promise fan-out for callers waiting on scheduled reconnect |
| `relayGateBoundary.ts` | Gate-aware history/first-event REQs + chunked aux fetch (concurrency 4, :17) |
| `relayWebSocketClose.ts` | Safe idempotent `plugin:websocket\|disconnect` / `disconnect_all` wrappers |
| `readOnlyRelayClient.ts` | Minimal second client for inactive-community observation & cross-relay publishes; explicit URL, no reconnect/backoff/watchdog, same AUTH flow; `withReadOnlyRelayClient(url, cb)` scoped helper (:320–330) |
| `presenceRelaySubscription.ts` | Author-scoped presence sub requiring EOSE within **5000 ms** (:35) else throws |
| `observerRelay.ts` / `relayMembers.ts` / `invites.ts` / `moderation.ts` / `social.ts` / `forum.ts` / `projectGit.ts` / various `tauri*.ts` | Domain API modules over Tauri commands + `signRelayEvent` (HTTP bridge/event publishing) |
| `concurrency.ts` | `collectWithConcurrency` used by gate boundary |

Each has a colocated `.test.mjs`.

### 4.8 App-wide provisioning
No React context/provider — module singleton imported directly everywhere (`@/shared/api/relayClient`). Lifecycle: community switch `features/communities/useCommunityInit.ts:52–80` — `resetCommunityState()` calls `relayClient.disconnect()` (:57) and `resetRateLimitGate()` (:59); React tree remounts via `<AppReady key={communityKey}>`. Shell effects: `app/useAppShellLifecycleEffects.ts:23` mounts `useRelayResumeTriggers()`; `AppShell.tsx:217` mounts `useRelayAutoHeal()`. Visible-channel tracking: `features/messages/hooks.ts:371–373`.

### 4.9 Rust-side involvement (summary)
Socket transport `plugin:websocket` (tauri-plugin-websocket); signing `sign_event` (`commands/identity.rs:108`) and NIP-42 kind-22242 `create_auth_event` (`identity.rs:641–666`); relay URL resolution `get_relay_ws_url`/`get_relay_http_url`/`get_default_relay_url`; HTTP-bridge admission gate `src-tauri/src/relay_admission.rs` (armed from 429s via `relay.rs:282–283`); transport-recovery hook `commands/relay_reconnect.rs` (phase 2 of manual reconnect controller).

---

## Cross-cutting observations
1. **Identity everywhere is Nostr keys**: app identity, managed-agent keys (keyring-stored), huddle WS auth (kind 22242), relay auth (NIP-42), git push auth (via `git-credential-nostr` + NSEC env), NIP-98 for transcript POSTs.
2. **Fail-closed patterns recur**: observer frames verified against agent-tag pubkey; unknown-agent frames buffered not trusted; keyring outage blocks spawn; TTS won't speak until agent set loaded; merge verifies expected commit before merging.
3. **Generation counters / watermarks everywhere** prevent stale async work: session_generation (huddle), request generations (relay), NestRegenGate (nest writes), speaker_generation (TTS), composite watermarks (active-turn store), eviction floors (observer store).
4. **Two transports**: WebSocket+Opus SFU-style relay for huddle media; Nostr-over-WebSocket (via tauri-plugin-websocket) for all events/signaling; HTTP bridge for publishing with its own mirrored rate-limit gate.

## Scan Coverage Statement

Scanned: `_sources/buzz/desktop` — `src/features/{agents,messages,communities,huddles,...}` (React/TS frontend incl. stores, hooks, relay client), `src/shared/api`, and `src-tauri/src/{huddle,managed_agents,commands}` plus supporting Rust modules (`nest.rs`, `storage.rs`, `project_git_exec.rs`, `relay_admission.rs`, `stt.rs`, `tts.rs`, `wire.rs`, `runtime_commands.rs`). Skipped: asset/binary files, auto-generated Tauri bindings, per-line enumeration of styling/layout components. Sources unmodified (read-only pass).

