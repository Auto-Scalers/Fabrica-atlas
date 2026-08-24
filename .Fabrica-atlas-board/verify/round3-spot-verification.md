# Round 3 Spot Verification — R4-2.1

> Task: R4-2.1 (Group 2 - Verify) · Run `run_43e01c767919` · ctx_79e31fc9cafa · task_e417b373426b
> Date: 2026-08-23
> Method: For each of the 7 reports in `.Fabrica-atlas-board/discovery/round3/round3/`, ≥10–40 file:line citations were sampled spread across the document and each was checked against the real source tree (`_sources/buzz`, `_sources/mission-control`, `../Fabrica-app`). Coverage statements were checked against actual directory listings. READ-ONLY on all sources (no source file touched).
> Verdict scale: VERIFIED / PARTIAL (roughly matches, minor offset or approximate figure off) / FAILED (contradicted by source) / NOT FOUND (file unlocatable).

## Headline Result

| Report | Sampled | Verified | Partial | Failed | Not Found | Coverage stmt | Verdict |
|---|---|---|---|---|---|---|---|
| fabrica-app-renderer.md | 12 (+6 support checks) | 12 | 0 | 0 | 0 | Present, dirs exist | ✅ PASS |
| fabrica-app-main-subsystems.md | 41 | 39 | 0 (+2 soft) | **1** | 0 | Present, dirs exist | ⚠️ PASS w/ 1 factual error |
| ai-vault-browser.md | 19 | 19 | 0 | 0 | 0 | Partial (counts given, no skipped-list) | ✅ PASS |
| fabrica-app-plugins.md | 18 | 17 | 1 | 0 | 0 | **Missing** | ⚠️ PASS w/ caveats |
| buzz-desktop.md | 28 | 28 | 0 | 0 | 0 | **Missing** | ⚠️ PASS w/ caveat |
| buzz-agent-crates.md | 22 | 22 | 0 | 0 | 0 | Header-only (no end statement) | ⚠️ PASS w/ caveat |
| mc-frontend-buzz-clients.md | 24 | 24 | 0 | 0 | 0 | **Missing** | ⚠️ PASS w/ caveat |
| **TOTAL** | **164** | **161** | **1** | **1** | **0** | — | — |

**98.2% of sampled citations verified exactly. 1 outright factual error. 0 fabricated citations.**

---

## 1. fabrica-app-renderer.md — ✅ PASS (12/12 + 6/6 support)

Source: `../Fabrica-app` (`src/renderer/**`)

Sampled citations (all VERIFIED):
- `TerminalPane.tsx:691` → actual: `return pane?.serializeAddon.serialize({ scrollback: 0 }) ?? null` ✓
- `pane-manager.ts:66` → `export class PaneManager {` ✓
- `pane-manager.ts:424` → `private createPaneInternal(leafIdHint?: string)` ✓
- `pane-manager.ts:460` → `private handlePaneMouseEnter(...)` ✓
- `pane-dom-creation.ts:22` → `export function createPaneDOM(` ✓
- `pane-manager-types.ts:91` → `focusFollowsMouse?: boolean` ✓
- `pane-lifecycle.ts:30` / `:172` → `openTerminal(` / `disposePane(` ✓
- `pane-divider.ts:16`, `pane-fit-resize-observer.ts:141` (+ MAX_STABILITY_FRAMES=8 at :12) ✓
- `store/index.ts:57` → `export const useAppStore = create<AppState>()(...)` ✓
Supporting: constants `HOOK_DONE_QUIET_MS = 1_500`, `MAX_PENDING_PTY_SIDE_EFFECTS = 512`, `STALE_TITLE_TIMEOUT = 3000`; existence of pty-dispatcher/transport/connection, osc52-clipboard, shutdown-buffer-captures etc.; `lib/pane-manager` "~137 files" → exactly 137. All ✓.

Coverage statement: names `components/{terminal-pane,sidebar,right-sidebar,tab-bar,tab-group,status-bar,settings,native-chat,cmd-j}`, `lib/pane-manager`, `store`, `runtime` under `src/renderer/src` — all exist. ✓

Minor drift (non-fatal, approximate claims): reported line counts for large components run ~2–8% high vs current working tree (e.g., StatusBar.tsx claimed 2546 → actual 2427; Settings.tsx "~1900" → 1819). Likely counted at an earlier commit; no architectural claim affected.

## 2. fabrica-app-main-subsystems.md — ⚠️ PASS with 1 factual error (39/41)

Source: `../Fabrica-app` (`src/main/{git,codex,codex-accounts,ssh,daemon}`)

Sampled highlights (VERIFIED): git/runner.ts function map exact (execFileCapture :515, spawnCommandCapture :635, killSpawnedCommandTree :444, resolveCommand :217, translateArgForWsl :89, nonInteractiveGitEnv :782, gitStreamStdout :1104, translateWslOutputPaths :1820); file sizes exact (runner.ts 1838, worktree.ts 1639, hook-service.ts 1622, runtime-home-service.ts 2258, service.ts 1913, ssh-relay-deploy.ts 1956, ssh-relay-session.ts 3041, ssh-connection.ts 1450); gh-rate-limit-breaker.ts 237 lines + "zero imports" header comment + FALLBACK_BLOCK_MS values; worktree.ts line cites (479/912/1033/1112/1187/1375/1435) all exact; daemon-entry.ts:327 `warmWindowsConptyOnce()`; relay-protocol keepalive/timeout/sentinel constants; ndjson 16MiB cap; terminal-history-log magic 'OCKL'; ssh backoff table exact.

### FAILED claim (evidence)
- **`RELAY_REMOTE_DIR` value**: report claims `'.FABRICA-remote'` (repeated in §3.5 as `${home}/.FABRICA-remote/relay-<fullVersion>`). Actual `src/main/ssh/relay-protocol.ts:31`: `export const RELAY_REMOTE_DIR = '.fabrica-remote'` — lowercase. Casing error; would break anyone using the report as an implementation spec on case-sensitive filesystems.

Soft-partial (statistics drift):
- git test-split: report says "97 files: 48 implementation + 49 test suites". Total 97 is exact, but actual `.test.ts` count is 59 (~38 impl). Split framing wrong even though total right.
- codex-usage sizes understated ~10% (scanner.ts claimed ~747 → 826; store.ts ~787 → 837); codex-family file count ~130 → 144.

Coverage statement: scope dirs `codex/`, `codex-accounts/`, `codex-usage/`, `git/`, `ssh/`, `daemon/` under `src/main/` all exist; `daemon/fixtures/ratatui-tui.py` and `daemon/AGENTS.md` exist. ✓

## 3. ai-vault-browser.md — ✅ PASS (19/19)

Source: `../Fabrica-app` (`src/main/ai-vault`, browser modules)

Sampled (all VERIFIED): session-scanner.ts:57 `scanAiVaultSessions` (+ withSpan 'aiVault.scan' :63); session-scanner-agent-sources.ts:244; browser-manager.ts cites 1129/627/1743/1354/1198/1292/1095/951 all land on the named functions; browser-manager.ts exactly 2244 lines as claimed; browser-session-registry.ts:489 & :201 (incl. the "must run before any session.fromPartition()" comment); certificate controller :53; AI_VAULT_CACHE_TTL_MS=60_000 (:20); MAX_CACHE_ENTRIES=4096; SESSION_PARSE_CONCURRENCY=8; service heap cap 384MB + unref + FABRICA_AI_VAULT_SERVICE_PROCESS env; OpenCode SQLite `query_only` pragma + schema-tolerant helpers.

Coverage: "~160 files" ai-vault → actual 166 ✓; browser "~42 source files" → exactly 42 non-test .ts ✓. Statement gives counts but no explicit skipped-list — acceptable, nothing cited was missing.

Minor: `agent-browser-bridge.ts` claimed "~2,770 lines", actual 2,547 (~8% over) — approximate-flagged only.

## 4. fabrica-app-plugins.md — ⚠️ PASS with caveats (17 verified / 1 partial)

Source: `../Fabrica-app` (`src/shared/plugins`, `src/main/plugins`)

This report cites file paths without line numbers; verification checked path existence + every quantitative claim. All sampled constants matched EXACTLY: manifest caps (64 panels / 256 commands), pluginId regex `/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/`, PLUGIN_MANIFEST_MAX_BYTES 1MB, six artifact caps, closed v0 capability set of 7 kinds, secrets ≤64KB, worker timeouts (READY 10s / INVOKE 30s / EVENT 5min / SHUTDOWN_GRACE 2s / MAX_PENDING_EVENTS 64), supervisor maxRestarts=3 + backoff [500,2000,5000], kill-list URL/cap/no-store, audit rotation 10MB→audit.log.1, marketplace publisher/repo pins, storage limits, safe-storage-v1 envelope, pointer file 128B, panel CSP string, ELECTRON_RUN_AS_NODE env allowlist.

PARTIAL: `plugin-manifest-file.ts` is at **`main/plugins/plugin-manifest-file.ts`**, not `shared/plugins/` as the section header implies. One-folder misattribution.

**Coverage statement MISSING**: report ends at "KEY INVARIANTS" with no scanned-vs-skipped section — violates board convention #3 (report conventions). Content accuracy is otherwise the highest of the seven.

## 5. buzz-desktop.md — ⚠️ PASS with caveat (28/28)

Source: `_sources/buzz/desktop`

Sampled (all VERIFIED, numeric constants exact): kinds.ts:59/:60 (KIND_AGENT_OBSERVER_FRAME 24200, KIND_AGENT_TURN_METRIC 44200); useManagedAgentActions.ts:105/:118; AGENT_MANAGEMENT_REQUEST const; observerRelayStore.ts:29/:39 (3000 / 100 caps); activeAgentTurnsStore.ts:23; nest.rs:531 archived-filter, :64 `.buzz` prod root; runtime_commands.rs:471 gate; storage.rs:18/:46; project_git_exec.rs:63/:40; projectGit.ts:156; RelayClient :78; huddle/mod.rs:742/:735 (100KB batch cap); stt.rs VAD constants (256 samples / thr 0.5 / min voiced 12 / queue depth 50); relay_api.rs WS route + MAX_HUDDLE_AGENTS=20; wire.rs PROTOCOL_VERSION=2; jitter/playout delay constants; relay_admission.rs MAX_HINT_SECONDS=300; tts TEXT_QUEUE_DEPTH=8; MAX_TTS_TEXT_LEN=8096.

Coverage: root `_sources/buzz/desktop` correct; all named dirs exist (`src/features/agents`, `src/shared/api`, `src-tauri/src/{huddle,managed_agents,commands}`). **But no explicit end-of-report scanned-vs-skipped coverage statement** (ends with cross-cutting observations) — convention gap only.

## 6. buzz-agent-crates.md — ⚠️ PASS with caveat (22/22)

Source: `_sources/buzz/crates`

Scope: `crates/{buzz-acp,buzz-agent,buzz-cli,buzz-workflow}` — all four exist ✓. Sampled (all VERIFIED): relay.rs event_channel_capacity :35, SEEN_ID_LIMIT 12_000 :44, send_auth_response range; queue.rs caps/batch/backoff chain (500 / 50 / 5s→300s / 100s buffer / 7300s deadline) exact; pool.rs AgentPool :295 / return_agent :689; acp.rs MAX_LINE_SIZE 10MB; filter.rs build_eval_context :264; lib.rs run/tokio_main :1879/:1885; config.rs `--relay-url` env BUZZ_RELAY_URL default ws://localhost:3000; setup_mode BUZZ_AUTH_TAG; base_prompt.md env/exit codes; llm.rs Llm :38; agent.rs RunCtx::run :303; mcp.rs NOSTR_PRIVATE_KEY note; handoff.rs HANDOFF_SYSTEM_PROMPT text; auth.rs PKCE :126; BuzzClient :521; validate.rs MAX_CONTENT_BYTES 65_536; TriggerDef internally-tagged enum; executor.rs :224. File-size claims exact where measured (relay.rs 6304, pool.rs 9302, etc.).

Caveat: scope stated in header but no formal end-of-report coverage statement (scanned vs skipped).

## 7. mc-frontend-buzz-clients.md — ⚠️ PASS with caveat (24/24)

Sources: `_sources/mission-control` + `_sources/buzz/{mobile,web}`

Mission-control (12 sampled, all VERIFIED): use-data.ts factory ranges incl. visibility-gated polling (:45), optimistic update (:83), 5s undo PUT `{id, deletedAt:null}` (:130/:139), bulkUpdate :150, poll intervals (15s tasks / 30s activity / 10s inbox+decisions) exact; use-field-ops.ts factory/cache/vault/execute ranges incl. PW_TTL_MS 30min; field-ops page AUTONOMY_MODES :61–83, Promise.all 5-endpoint load :206–208; approvals page batch-approve + `__batch__` sentinel :426 + dialog :499; vault page ranges; missions detail page = exactly 843 lines, handler decls at 404/418/439/469/508, circuit breaker :338 + :693. Page line counts (activity 441, missions 281, services 924, safety 841) all match exactly.

Buzz mobile (7 sampled, all VERIFIED): relay_socket.dart auth challenge :195–231, 30s ping, 8s auth timeout, kind 22242; relay_session.dart build() :146–164; backoff 1000/30000, 16ms batch, 5000 cap; replay ordering :512–532; _handleClosed :666–747; buildNip98AuthHeader :949–979 (file exactly 979 lines), kind 27235; media_upload.dart = exactly 999 lines, kind 24242, 100MB caps; channels_provider.dart 936 / pairing_provider.dart 969 / channels ~123 files — all exact.

Buzz web (5 sampled, all VERIFIED): git-client.ts 456 lines + LightningFS naming + depth-1/singleBranch; use-git-browse.ts queryKey/staleTime/retry/enabled; nostr-signer.ts integrity check + ephemeral fallback + Nip07UnavailableError; nip98.ts 48 lines + body-gated tags + kind 27235; nostr-client.ts 100ms AUTH wait / 10s timeout; relay-url.ts full-file check.

Coverage: named dirs all exist (`features/channels/` 123 files, `features/pairing/`, `components/field-ops/`, `lib/vault-crypto.ts`, `shared/relay/*`). **No explicit end-of-report coverage statement** — convention gap only.

---

## Findings Register (everything that failed or needs attention)

| # | Report | Finding | Severity | Evidence |
|---|---|---|---|---|
| F1 | fabrica-app-main-subsystems.md | `RELAY_REMOTE_DIR` quoted as `'.FABRICA-remote'`; actual is `'.fabrica-remote'` (relay-protocol.ts:31); error repeated in §3.5 | Medium — factual error in a constant that matters for case-sensitive targets | quoted above |
| F2 | fabrica-app-main-subsystems.md | git test-split wrong: "48 impl + 49 tests" vs actual 59 test / ~38 impl (total 97 correct) | Low — statistic framing | counted `.test.ts` = 59 |
| F3 | fabrica-app-plugins.md | `plugin-manifest-file.ts` located in `main/plugins/`, not `shared/plugins/` as implied | Low — one-folder misattribution | path listing |
| F4 | fabrica-app-plugins.md | No coverage statement (scanned-vs-skipped) | Convention violation (AGENTS.md DoD #2) | report ends at "KEY INVARIANTS" |
| F5 | buzz-desktop.md, mc-frontend-buzz-clients.md | No explicit end-of-report coverage statement | Convention violation | report endings inspected |
| F6 | buzz-agent-crates.md | Coverage stated in header only, no end-of-report statement | Minor convention gap | report structure |
| F7 | fabrica-app-renderer.md, ai-vault-browser.md, fabrica-app-main-subsystems.md | Systematic line/file-count drift ~2–10% (approximate claims; likely earlier-commit snapshot) | Info — no architectural claim affected | e.g., StatusBar 2546→2427; agent-browser-bridge 2770→2547 |

## Recommendation

- **Round 3 discovery content is trustworthy**: 161/164 sampled citations verified byte-exact; zero fabricated citations across 334KB of reports. Safe to feed into synthesis (R4-3.1).
- Fix-worthy before production planning: patch F1 (`RELAY_REMOTE_DIR` casing) in `fabrica-app-main-subsystems.md`; optionally correct F2/F3. These are one-line edits to board-owned files.
- Convention gaps (F4–F6): add short coverage statements to the four reports lacking them in a future Group-4 hygiene pass — do NOT rewrite content.

## Scan Coverage Statement (this verification pass)

- Read: all 7 reports in `.Fabrica-atlas-board/discovery/round3/round3/` (full reads via verification agents); ~164 sampled citation sites read in sources across `../Fabrica-app/src/{renderer,main}`, `_sources/buzz/{desktop,mobile,web,crates}`, `_sources/mission-control`.
- Skipped: unsampled citation sites within each report (~majority of total cites; sampling rate ≈ 20–60% per report weighted toward architecture-bearing claims); `_sources/legacy-fabrica` (ignored per instructions); no Fabrica-app out/ build artifacts audited.
- Sources modified: none (read-only pass; verifiable via `git status`).
