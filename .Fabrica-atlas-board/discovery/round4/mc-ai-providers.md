# R4-1.9 — mission-control AI/Agent Provider Integrations (Line-Level Deep Dive)

> Task: R4-1.9 (Group 1, Round 4) · Worker session: task_c7bdf93b823f / ctx_8fbb289bd6a3 · Date: 2026-08-23
> Scope: `_sources/mission-control/mission-control` — which LLM providers/models are integrated, how agent runs invoke them, prompt construction, streaming handling, credential storage, rate limits/costs.
> READ-ONLY scan. No source file modified. Citations are `file:line` relative to `_sources/mission-control/mission-control/` unless prefixed otherwise.

---

## 0. Headline Finding (read this first)

**mission-control integrates exactly ONE "LLM provider": the Claude Code CLI binary, spawned as a local child process. There is NO HTTP/SDK integration with any LLM API anywhere in the codebase.**

- No `fetch()` to `api.anthropic.com`, `api.openai.com`, or any generative endpoint exists in any `.ts` file (grep across `src/` and `scripts/daemon/` returned zero matches for `api.openai.com|api.anthropic.com|generativelanguage`).
- Model selection does not exist as a concept: there is **no model ID, model name, temperature, or sampling parameter anywhere in the codebase**. The model is whatever the installed `claude` CLI is configured/authenticated to use (`claudeBinaryPath` config selects the *binary*, never a model — see §1).
- Two adjacent but distinct AI touchpoints exist and must not be conflated:
  1. **Claude Code CLI spawns** (the real agent-execution engine) — daemon `scripts/daemon/*`, detailed below.
  2. **Field-Ops service catalog entries** for OpenAI/DALL-E — these are *declarative catalog metadata* (MCP package references + credential schemas), executed via MCP servers or manually, NOT native code paths (see §7).

---

## 1. Provider Integration Architecture: CLI-as-Provider

### 1.1 The single allowed binary

- Binary whitelist is hardcoded: `const ALLOWED_BINARIES = ["claude", "claude.cmd", "claude.exe"]` — `scripts/daemon/security.ts:97`. `validateBinary()` basename-checks against this list at spawn time (`security.ts:103-106`), and the runner re-validates before every spawn: `scripts/daemon/runner.ts:229-231`.
- Config override path: `execution.claudeBinaryPath` in `data/daemon-config.json:43`; typed at `scripts/daemon/types.ts:26`; Zod-validated on the UI side at `src/lib/validations.ts:345`; default `null` in `scripts/daemon/config.ts:33`.
- Resolution order in `findClaudeBinary()` (`runner.ts:65-165`):
  1. Config override → used verbatim (`runner.ts:69-80`)
  2. Hardcoded install-location candidates: Windows `%APPDATA%/npm/claude.cmd`, pnpm paths, `.local/bin` (`runner.ts:90-100`); Unix `~/.local/bin/claude`, `/usr/local/bin/claude`, etc. (`runner.ts:102-109`)
  3. `where claude` / `which claude` via `execSync` (`runner.ts:134-160`)
  4. Fallback `"claude"` — lets spawn fail with a descriptive error telling the user to run `npm i -g @anthropic-ai/claude-code` (`runner.ts:162-164`; error message also built at `runner.ts:350`)
- Windows `.cmd` shim handling is notable: npm `.cmd` shims cannot be spawned with `shell:false`, so MC parses the shim file with regex `/%dp0%\\([^"]+\.js)/i` to extract the JS entry point and instead spawns `process.execPath` (node.exe) with `prefixArgs=[cli.js path]` (`runner.ts:40-63`, applied at `runner.ts:116-127` and `144-155`). Standard fallback path: `<dir>/node_modules/@anthropic-ai/claude-code/cli.js` (`runner.ts:57`).
- Resolved binary is cached module-level (`let cachedBinary` — `runner.ts:33`) and cache-invalidated only on ENOENT (`runner.ts:340-341`).

### 1.2 How agent runs are invoked

The core invocation is one spawn call in `AgentRunner.spawnAgent()` (`runner.ts:226-356`):

- Arg construction is an **array, never string interpolation** — explicitly commented as shell-injection prevention (`runner.ts:233-240`):
  - `-p <prompt>` (headless print mode)
  - `--output-format json`
  - `--max-turns <N>` (from config, default 25)
- Permission mode flags:
  - `--dangerously-skip-permissions` when `opts.skipPermissions` (logged with `[SECURITY]` tag — `runner.ts:242-244`), OR
  - `--allowedTools ...` list otherwise, default `["Edit", "Write"]` (`runner.ts:245-248`; default at `config.ts:31`)
- Spawn options: `stdio: ["ignore","pipe","pipe"]`, `windowsHide:true` (`runner.ts:256-261`); cwd defaults to workspace root (`runner.ts:12,219`).
- Environment is scrubbed via `buildSafeEnv()` (§5.3) — children get NO API keys from parent env except the OAuth token pass-through.
- Output capture capped at 10 MB (`MAX_STDOUT_SIZE` — `runner.ts:13`, enforced `runner.ts:274-285`); timeout enforced by `setTimeout` + `treeKill(pid,"SIGTERM")` process-tree kill (`runner.ts:288-301`), with SIGKILL fallback (`runner.ts:298`). Kill-by-PID API: `killSession()` (`runner.ts:361-372`).

### 1.3 Invocation entry points (who spawns agents)

| Entry point | File | Notes |
|---|---|---|
| Daemon poll dispatcher | `scripts/daemon/dispatcher.ts:220-280` | Polls tasks.json every `intervalMinutes` (default 5 — `config.ts:14`), filters dispatchable tasks (`dispatcher.ts:114-148`: skip running/in-retry-queue/dependency-blocked/pending-decision/retry-limit-exceeded), fills up to `maxParallelAgents` slots (`dispatcher.ts:156-166`) |
| Scheduled cron commands | `dispatcher.ts:579-620` | daily-plan 07:00, standup 09:00 weekdays, weekly-review Fri 17:00 (`config.ts:19-24`) |
| Standalone single-task runner | `scripts/daemon/run-task.ts:783+` | Used by manual "Run" button AND project-run chain dispatch (`dispatcher.ts:426-450` spawns `run-task.ts --source project-run-chain` detached) |
| Inbox auto-respond chains | `scripts/daemon/run-inbox-respond.ts:472+` | Agent answers inbox messages; separate continuation budget `inbox.maxContinuations` (default 2 — `config.ts:36-40`) |
| Brain-dump triage | `scripts/daemon/run-brain-dump-triage.ts:209-219` | Same runner, turns capped at 20 |

Concurrency ceiling: `maxParallelAgents` clamped 1–10 (`config.ts:65-68`), default 3 (`config.ts:17`). This is the ONLY throttle between MC and Anthropic's API — there are no per-minute request limits, no queue-rate shaping, no 429/backoff-on-API-rate-limit logic (retry backoff exists but is for *task failure*, `dispatcher.ts:83-86`: exponential `retryDelayMinutes * 2^(attempt-1)` capped at 60 min, persisted to disk `dispatcher.ts:69-77`).

---

## 2. Prompt Construction (line-level)

All prompts are assembled in `scripts/daemon/prompt-builder.ts`:

### 2.1 Task prompt anatomy — `buildTaskPrompt(agentId, task, missionId?)` (`prompt-builder.ts:471-505`)

Sections joined `\n\n` in order:

1. **Persona** — `buildAgentPersona()` (`prompt-builder.ts:83-114`): `"You are acting as a {name} — {description}."` + `## Your Instructions` (agent.instructions from agents.json) + `## Your Capabilities` bullet list + `## Your Skills` (full markdown of each linked skill from skills-library.json). Skill linkage is bidirectional: matched if `agent.skillIds` includes skill OR `skill.agentIds` includes agent (`prompt-builder.ts:61-76`).
2. **Field Ops context** (conditional) — injected only if agent has `skill_field_ops` (`prompt-builder.ts:485-489`); `buildFieldOpsContext()` (`prompt-builder.ts:368-462`) renders connected services, active missions (max 5), pending approvals, agent's own field tasks, linked field tasks w/ result snippets, recent executions.
3. **Mission restart context** (conditional) — `buildRestartContext()` (`prompt-builder.ts:217-262`): completed vs failed task history from missions.json with 150-char summary slices and run progress counts; instructs agent not to duplicate work (`prompt-builder.ts:255`).
4. **Retry context** (conditional) — `buildRetryContext()` (`prompt-builder.ts:269-321`): pulls latest *answered decision* for the task from decisions.json, injects user guidance plus directive "You MUST take a DIFFERENT approach" (`prompt-builder.ts:312`).
5. **Fenced task data** — `buildTaskInstructions()` (`prompt-builder.ts:119-162`) output passed through `fenceTaskData()` at call site (`prompt-builder.ts:479`): wrapped in `<task-context>...</task-context>` delimiters with closing-tag escaping (`</task-context>` → `<\/task-context>`, `security.ts:71-83`) — prompt-injection fencing.
6. **SOP block** — `buildSOP()` (`prompt-builder.ts:167-209`): mandates reading ai-context.md, checking own inbox, executing work; critically forbids bookkeeping writes ("Do NOT change kanban status... Do NOT write to inbox.json") because the system performs completion side-effects itself (`prompt-builder.ts:177-185`). Subtask-progress protocol appended when task has subtasks (`prompt-builder.ts:188-206`).

Hard cap: `enforcePromptLimit()` truncates at 100,000 chars with `[PROMPT TRUNCATED]` marker (`security.ts:65,88-93`; applied at `prompt-builder.ts:504`).

### 2.2 Other prompt sources

- **Scheduled commands**: `buildScheduledPrompt(command)` reads `.claude/commands/<command>/user.md` verbatim (`prompt-builder.ts:511-522`); fallback generic prompt if missing. These command files are generated FROM the agent registry by `src/lib/sync-commands.ts:83` (writes `.claude/commands/<agent.id>/user.md`) and regenerated wholesale by `POST /api/sync` (`src/app/api/sync/route.ts:7`). Persona generation mirrors `buildAgentPersona` deliberately (`prompt-builder.ts:81` comment).
- **Continuation header** (run-task.ts): resumed sessions get injected text "This is session N. Previous session(s) ran out of turns or time before finishing." (`run-task.ts:911-915` region), plus accumulated progress context between sessions (`appendTaskProgress` — `run-task.ts:308` area, called at `run-task.ts:1020`).
- **Inbox respond prompt**: `buildRespondPrompt()` (`run-inbox-respond.ts:142-150`) builds agent persona + message thread, same continuation-header pattern.

Key architectural property: **prompts carry ALL state** — there is no server-side conversation memory; each spawn is a fresh Claude session whose entire world is the prompt + files it reads.

---

## 3. Streaming Handling: NONE (batch-only)

- The runner uses `--output-format json` exclusively (`runner.ts:238`) — a **single JSON document emitted once at process exit**. There is no `stream-json`, no SSE, no incremental parsing anywhere: grep for `stream-json|text/event-stream|StreamingTextResponse|partial-json` across all `.ts/.tsx` returned zero matches.
- stdout/stderr accumulate into strings until exit (`runner.ts:268-285`); consumers only act on `close` event (`runner.ts:304`).
- Live progress during a run comes from side-channel, not stream: subtask checkboxes written by the agent directly into tasks.json, polled by UI hooks (`use-fast-task-poll.ts`); PID liveness checks (`health.cleanStaleSessions()` polls `process.kill(pid,0)` — `health.ts:196-206`).
- Consequence worth flagging for Fabrica: MC cannot show token-by-token output, cannot enforce mid-run cost aborts, and cannot know an agent's status until it exits. The only mid-run controls are kill (`runner.ts:361-372`) and the respond-run stop flag (`types.ts:195` — `stopped: boolean // stop signal — prevents next continuation`).

---

## 4. Output Parsing & Result Extraction

- `parseClaudeOutput(stdout)` (`runner.ts:173-211`) parses the exit JSON defensively (every field null-safe, non-JSON returns empty meta):
  - `total_cost_usd` → `totalCostUsd` (`runner.ts:187`)
  - `num_turns` → `numTurns` (`runner.ts:188`)
  - `subtype` → success | error_max_turns | error_timeout (`runner.ts:189`; enum documented `types.ts:176`)
  - `session_id` → `sessionId` (`runner.ts:190`)
  - `is_error` → `isError` (`runner.ts:191`)
  - nested `usage` → input/output/cache-read/cache-creation tokens (`runner.ts:196-205`; type `ClaudeUsage` at `types.ts:165-170`)
- Human summary extraction: `extractSummary()` prefers JSON `result` field (500-char slice), falls back to last 10 raw lines (`run-task.ts:114-130`).
- Continuation decision logic consumes `subtype`: `hitMaxTurns = meta.subtype === "error_max_turns"`; `hitTimeout = timedOut || subtype === "error_timeout"`; continue while `continuationIndex < maxTaskContinuations` (default 2 — `run-task.ts:963-965`, `config.ts:34`). Inbox variant uses `inbox.maxContinuations` (`run-inbox-respond.ts:593-595`). Known-error subtypes get human-readable messages (`run-inbox-respond.ts:299-305`).

---

## 5. Credential Storage & Secret Hygiene

### 5.1 Claude Code authentication (the LLM credential)

MC itself stores **nothing** for the LLM. Auth is delegated to the CLI's own mechanisms:

- The daemon forwards exactly one secret env var to children: `CLAUDE_CODE_OAUTH_TOKEN`, preserved in `buildSafeEnv()` because Claude Code v2.1.71+ keeps the active token there rather than `.credentials.json`; the daemon inherits it from the user's session (`security.ts:146-151`).
- Helper script `scripts/find-auth-env.js` probes `claude auth status` under three env permutations to locate a working auth environment (`find-auth-env.js:29,40,58`); sibling `scripts/test-restricted-auth.js:25` validates restricted-env spawning.
- Everything else is stripped from child env (§5.3).

### 5.2 Field-Ops credentials vault (AES-256-GCM, server-only)

Used for third-party service creds (Stripe keys, OpenAI keys, wallets — not for Claude auth):

- Crypto module `src/lib/vault-crypto.ts`: AES-256-GCM + scrypt KDF, Node built-ins only ("no external dependencies" — header comment `vault-crypto.ts:1-8`). Parameters: 32-byte key, 32-byte salt, N=16384/r=8/p=1 (~100ms derive — `vault-crypto.ts:24-36`), 96-bit IV (`vault-crypto.ts:39`).
- Master password hashed as self-describing `"scrypt:<salt_hex>:<hash_hex>"` (`vault-crypto.ts:66-70`) with timing-safe verify (`timingSafeEqual` — `vault-crypto.ts:81-107`); legacy raw-SHA-256 hashes supported for migration (`vault-crypto.ts:85-93`).
- Credential payloads encrypted/decrypted via `encryptCredential`/`decryptCredential` returning `{encryptedData, iv, authTag}` hex (`vault-crypto.ts:119-168`); GCM auth-tag failure throws on tamper (`vault-crypto.ts:164`). Legacy base64-placeholder credentials detected by missing `authTag` and migrated on unlock (`vault-crypto.ts:184-211`).
- Session cache `src/lib/vault-session.ts`: master password cached in Node process memory only, 30-min TTL auto-expiry via setTimeout, never persisted or sent to client (`vault-session.ts:1-19,33-46`); explicitly documented as local-first-only design that breaks under serverless (`vault-session.ts:8-11`).
- Runtime decrypt flow at execution: `src/app/api/field-ops/execute/route.ts` requires vault session OR inline masterPassword (`route.ts:335-338`), ALWAYS re-verifies password even with active session (`route.ts:345`), locates credential by `service.credentialId` (`route.ts:360-364`), decrypts and JSON-parses into adapter credentials (`route.ts:377-393`). Same pattern in wallet route (`wallet/route.ts:86-101`) and financials route (`financials/route.ts:134-149`).

### 5.3 Child-process env scrubbing & output redaction

- `buildSafeEnv()` allowlist (`security.ts:114-158`): PATH, HOME/USERPROFILE, APPDATA, LOCALAPPDATA, TEMP/TMP, Windows SystemRoot/WINDIR/COMSPEC/PATHEXT (needed for node.exe DLL resolution — comment `security.ts:135-137`), plus `CLAUDE_CODE_OAUTH_TOKEN` and optional experimental `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (`security.ts:153-156`). All other env vars (i.e., any API keys in the parent shell) never reach agent processes.
- `scrubCredentials()` regex battery applied to all captured stdout/stderr before logging/storage (`security.ts:5-34`): sk-/key-/ak- API keys, Bearer tokens, 40+ char base64, AWS AKIA, passwords, GitHub `ghp_/ghs_`, npm tokens, Slack xox*, Stripe `sk_live/test_`, **Anthropic `sk-ant-*`** (dedicated pattern `security.ts:27`), SSH private-key markers, DB connection strings, generic token=. Applied at runner exit paths (`runner.ts:325-326,351`), failure diagnostics (`runner.ts:312-315`), session history error truncation (`health.ts:106`).
- Binary whitelist closes arbitrary-execution (§1.1). Prompt fencing closes task-content injection (§2.1).

---

## 6. Rate Limits & Cost Tracking

### 6.1 What exists

**Cost per run (authoritative source: Claude Code itself):**
- Every completed session's `total_cost_usd` and token usage are parsed from exit JSON (§4) and recorded on the history entry (`types.ts:57-73`: `costUsd`, `numTurns`, `usage` fields).
- Cumulative daemon stats accumulate across restarts (persisted to `data/daemon-status.json`, atomic tmp+rename writes): `totalCostUsd`, `totalInputTokens`, `totalOutputTokens`, `totalCacheReadTokens`, `totalCacheCreationTokens` (`types.ts:79-89`; accumulation `health.ts:118-127`; persistence/load `health.ts:210-232`).
- Active-run entries also carry cost (`ActiveRunEntry.costUsd` — `run-task.ts:53`); respond-run entries likewise (`RespondRunEntry.costUsd` — `types.ts:198-200`).

**Budget enforcement (Field-Ops spend tracker — money, not tokens):**
- `src/lib/spend-tracker.ts` implements a layered limit checker `checkSpendLimits()` (`spend-tracker.ts:82-132`): global kill switch → per-service enabled → per-tx cap → service daily limit → global daily/weekly/monthly budgets (window boundaries computed `spend-tracker.ts:13-36`). Returns human-readable rejection strings.
- Spend log pruned after 31 days (`spend-tracker.ts:137-144`); summary aggregation per-service (`spend-tracker.ts:149-176`). Enforced inside the execute route before any adapter call (`execute/route.ts:174` estimates USD from payload when adapters don't report it).
- NOTE: this budget system gates *field-ops services* (Stripe/crypto/etc.), NOT Claude Code runs. Daemon LLM spend has **no budget cap** — only observability.

**Throttling:**
- Concurrency cap `maxParallelAgents` (1–10, default 3) — §1.3. Slot accounting via `health.activeCount()` (`dispatcher.ts:156-160`); stale-session reaper frees slots every minute (`health.ts:196-206`).
- Per-run ceilings: `maxTurns` (1–100, default 25 — `config.ts:86-88`), `timeoutMinutes` (1–120, default 30 — `config.ts:89-91`), retry budget `retries` (0–5, default 1) with exponential backoff capped 60 min (`dispatcher.ts:83-86`), loop detection on project runs at 3 attempts/task (`dispatcher.ts:410-411`).
- Duplicate suppression: skip if already running / already queued (`dispatcher.ts:116-125`); single-flight for scheduled commands (`dispatcher.ts:580-583`).

### 6.2 What does NOT exist (gaps)

- No model-level rate-limit handling: no 429 detection, no Retry-After parsing, no request-rate limiter, no token-bucket.
- No pre-flight cost estimation (can't know prompt token count before spawn).
- No mid-run cost abort (batch output makes this impossible — §3).
- No per-agent/per-project cost attribution beyond taskId on history entries.
- No model tiering: cheap-model-for-triage vs strong-model-for-code is impossible; every run uses whatever the single claude binary defaults to.

---

## 7. Field-Ops AI Service Catalog Entries (declarative only)

The catalog contains two OpenAI-related services, both metadata-only:

1. **`dalle-imagegen`** — "Generate images using DALL-E 3 and other AI models"; `mcpPackage: "imagegen-mcp"`; capabilities text-to-image/editing/variations/multiple-models; credential schema `{openaiApiKey, type:"password", placeholder:"sk-..."}`; pricing note "$0.040/image (1024x1024)" (`data/field-ops/service-catalog.json:387-412`).
2. **`openai`** — "Access GPT models and DALL-E image generation"; `mcpPackage: "openai-mcp"`; apiKey credential schema; pricing "GPT-4o: ~$2.50/1M input tokens" (`service-catalog.json:1173-1198`).

Execution reality check:
- The execute route resolves adapters ONLY against the 6 native adapters (twitter, ethereum, reddit, linkedin, stripe, gmail — imports at `execute/route.ts:50-56`). No OpenAI/imagegen adapter is registered.
- Services without an adapter fall back to **manual execution**: task moved to `executing` status with message "No adapter available. Task moved to executing for manual completion." (`execute/route.ts:222-246`).
- MCP packages are referenced in catalog data (and the UI hints "@anthropic/mcp-github" style input — `src/app/field-ops/services/page.tsx:507`) but no MCP client invocation code executes them in-process; they are install/config guidance. (Adapter-layer detail is R4-1.3's scope; cross-ref `.Fabrica-atlas-board/discovery/round4/mc-adapters-linelevel.md`.)

So: **OpenAI integration in MC is aspirational/config-surface only; the only live AI execution path is the Claude Code CLI.**

---

## 8. Relevance to Fabrica's CLI-Agent-Management Direction

Fabrica is transforming into a desktop CLI agent management & operations platform. mission-control is effectively a working prototype of exactly one slice of that: supervising a fleet of headless CLI coding agents. Directly reusable patterns:

### 8.1 Model abstraction — THE central gap Fabrica must solve
MC hardwires one provider binary with a whitelist (`security.ts:97`). For a general CLI-agent platform, the equivalent surface must become a **provider/binary registry**: {binary name(s), shim-resolution rules, arg dialect (`-p` vs positional), output-format flag, auth mechanism, usage-report shape}. MC already implicitly defines this interface — `SpawnOptions`/`SpawnResult`/`ClaudeOutputMeta` (`types.ts:104-120,162-180`) are 90% of a provider-neutral contract. Fabrica should generalize: `Runner.spawn(SpawnSpec)` where SpawnSpec includes provider profile; `parseOutput(stdout)` becomes provider-pluggable (Claude JSON vs codex JSON vs plain text). The `.cmd`-shim→node.exe resolution trick (`runner.ts:40-63`) is directly reusable for ANY npm-distributed agent CLI (codex, gemini, aider...).

### 8.2 Fleet supervision patterns worth porting wholesale
- Session lifecycle ledger with PID liveness checks + stale reaper (`health.ts:196-206`) — maps 1:1 onto an agent-fleet dashboard.
- Persistent retry queue with exponential backoff surviving daemon restarts (`dispatcher.ts:54-77`) and loop detection per task (`dispatcher.ts:410-411`).
- Continuation chains: bounded auto-resume sessions when agents exhaust turns/time, with progress hand-off prompts between sessions (`run-task.ts:963-1023`) — this is how you get long-running agent work out of turn-limited CLI invocations without native session resume.
- Kill-by-PID with process-tree teardown (`runner.ts:295-301,361-372`) — mandatory on Windows.
- Concurrency slot management across heterogeneous entry points (poll dispatch, cron, manual, chains) through ONE shared health monitor (`health.activeCount()` gating everywhere — `dispatcher.ts:156,199,585`).

### 8.3 Cost/governance layer
- MC proves the value of harvesting cost+usage from the CLI's own report rather than estimating (§6.1). Fabrica should keep that principle but add what MC lacks: budgets on agent runs (MC's `checkSpendLimits` is the right shape — `spend-tracker.ts:82-132` — just point it at LLM spend too), per-agent attribution, and pre-flight estimates.
- Credential hygiene patterns are directly liftable: env allowlisting for spawned agents (`security.ts:114-158`), output redaction battery incl. provider-specific key shapes (`security.ts:5-34`), OS-level vault (AES-GCM+scrypt+TTL memory cache, `vault-crypto.ts`/`vault-session.ts`) for any API keys the platform brokers to agents. Note Fabrica-app already has its own AI Vault (round3 report `ai-vault-browser.md`) — synthesis should reconcile the two designs.

### 8.4 Streaming is the differentiator opportunity
MC's batch-only design (§3) is its biggest UX ceiling: no live output, no mid-run abort-on-budget, no partial progress beyond side-channels. A Fabrica built on PTY sessions (FA already has a PTY subsystem — see companion R4-1.7 report) can offer stream-json incremental parsing, live cost meters, and soft-stop signals — a concrete superiority axis over MC's approach.

### 8.5 Prompt/state architecture caution
MC's "prompt carries all state, files carry all truth" model (§2) works because its agents share a filesystem with the orchestrator. Fabrica managing agents across arbitrary worktrees needs explicit context packaging (MC's fence + SOP + restart-context composition, `prompt-builder.ts:471-505`, is a good starting grammar) plus injection defenses equivalent to fence-escaping (`security.ts:71-83`).

---

## 9. Scan Coverage Statement

**Read in full (line-complete):**
- `scripts/daemon/runner.ts` (373/373 lines)
- `scripts/daemon/security.ts` (159/159)
- `scripts/daemon/prompt-builder.ts` (580/580)
- `scripts/daemon/dispatcher.ts` (621/621)
- `scripts/daemon/types.ts` (210/210)
- `scripts/daemon/config.ts` (172/172)
- `scripts/daemon/health.ts` (287/287)
- `run-task.ts` lines 1–150 (header, types, summary extraction, completion side-effects) + targeted grep-read of continuation logic regions (lines ~230–370, ~730–1090 hits)
- `src/lib/spend-tracker.ts` (176/176)
- `src/lib/vault-crypto.ts` (211/211)
- `src/lib/vault-session.ts` (99/99)

**Targeted reads (sections relevant to task):**
- `data/daemon-config.json:43`; `data/field-ops/service-catalog.json` (AI-relevant entries :387–412, :1105–1198)
- `src/app/api/field-ops/execute/route.ts` (credential-decrypt + adapter-resolution sections via grep, :36–393 region); `wallet/route.ts`, `financials/route.ts` (grep-level)
- `run-inbox-respond.ts`, `run-brain-dump-triage.ts`, `index.ts`, `logger.ts` (grep-level hits verified in context)
- `src/lib/sync-commands.ts:83`, `src/app/api/sync/route.ts:7`, `src/lib/validations.ts:345`, `src/hooks/use-daemon.ts:61,100`, `src/app/autopilot/page.tsx:127` (grep-level)
- `scripts/find-auth-env.js:29–58`, `scripts/test-restricted-auth.js:25`

**Repo-wide greps executed (negative results documented):**
- Provider keywords (`anthropic|openai|claude|gpt-|gemini|deepseek|groq|ollama`) across *.ts/*.tsx/*.js/*.json/*.md/*.sh — 72 hits, all accounted for above (docs/catalog/scripts; zero SDK/API-client code)
- HTTP-to-LLM probes (`api.openai.com|api.anthropic.com|fetch(openai|anthropic...)`) — zero matches
- Streaming probes (`stream-json|text/event-stream|StreamingTextResponse|partial-json`) — zero matches

**Skipped (out of scope for this task, covered elsewhere):**
- Adapter implementations' internals (R4-1.3 `mc-adapters-linelevel.md`)
- Workflow engine/approvals state machine detail (R4-1.6, parallel worker)
- Full field-ops service catalog inventory (R4-1.8, parallel worker — this report cites only its AI rows)
- Frontend component styling/UI files, test fixtures beyond cited lines, `data/*.json` content beyond config/catalog fields, workspace-level docs outside `mission-control/mission-control/` except CLAUDE.md (injected context, consistent with code findings).

Every factual claim above carries a file:line citation; negative claims ("no X exists") are backed by repo-wide greps listed here.
