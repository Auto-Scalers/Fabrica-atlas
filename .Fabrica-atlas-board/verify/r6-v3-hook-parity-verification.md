# R6-V3 — Spot Verification of fa-hook-parity.md vs Sources

> Task: R6-V3 spot verification of `.Fabrica-atlas-board/discovery/round4/fa-hook-parity.md` against per-agent hook-service directories under `../Fabrica-app/src/main/` (task task_0248d0c14804 / dispatch ctx_42613b5743a1).
> Method: independent re-read of source files (full reads + Select-String line-exact sampling). READ-ONLY on sources.
> Target report: discovery/round4/fa-hook-parity.md (315 lines).

---

## Verdict

**PASS with minor citation-anchor drift — 0 FAILED, 0 factual errors, 7 MINOR (cosmetic line-cite drift), ~95+ anchors sampled.**

Every substantive claim in the parity table reproduces from source: the 16-file inventory with byte sizes is exact to the byte; every class/singleton/install/remove/getStatus/refresh line cite in §3a verifies exactly across all 16 agents; the canonical-claude contract block, both registry wiring files, the remote plane, and all event catalogs verify. The 7 findings below are off-by-one/few line-anchor drifts where the cited content exists nearby but not at the cited lines. No phantom citations found.

---

## 1. Inventory check (§1 scope table) — EXACT PASS

All 16 hook-service.ts files confirmed present under `src/main/<agent>/` with byte sizes identical to the report's table: amp 13,896 · antigravity 17,369 · claude 13,102 · codex 64,976 · command-code 7,731 · copilot 15,663 · cursor 11,846 · devin 9,233 · droid 12,542 · gemini 11,936 · grok 12,213 · hermes 18,360 · kimi 9,321 · mimo 3,055 · openclaude 288 · opencode 54,142. **16/16 exact (recursive Get-ChildItem count = 16, no extras).**

## 2. Canonical contract (§2) — PASS

| Claim | Report cite | Actual | Result |
|---|---|---|---|
| `ClaudeHookService` class | claude/hook-service.ts:121 | :121 | ✅ |
| `install()` | :187 | :187 | ✅ |
| `refreshManagedScripts()` | :175 | :175 | ✅ |
| `remove()` | :296 | :296 | ✅ |
| `getStatus()` | :128 | :128 | ✅ |
| 4-state model | :162-171 | :162-171 (installed/not_installed/partial branches) | ✅ |
| `installRemote(sftp, remoteHome)` | :244 | :244 | ✅ |
| exported singleton | :331 | :331 | ✅ |
| options-parametrized constructor | :45-49, :124-126 | :45-49 type, :124-126 ctor | ✅ |
| Windows endpoint sourcing | :66 | :66 `call "%FABRICA_AGENT_HOOK_ENDPOINT%"` verbatim | ✅ |
| POSIX endpoint sourcing | :97-99 | :97-99 verbatim | ✅ |
| dual-script generator | :57-119 | :57-119 `getManagedScript` | ✅ |
| stdin-contract imports | :17-22 | :17-22 | ✅ |
| script-before-settings ordering | :266-276 | :266 comment verbatim + writes through :276 | ✅ |
| Contract types | managed-agent-hook-registry.ts:18-21 | :18-21 | ✅ |
| Remote contract type | remote-managed-hook-installers.ts:33-40 | :33-40 | ✅ |

One MINOR: report §3b cites "POSIX-only-by-design remote (:245 comment)" — the explicit "POSIX-only by design" wording is at **:243**; :245 carries the related "remote Windows is unsupported" comment (substantively supports the claim). Cosmetic off-by-two.

## 3. Registry wiring (§3a registration columns) — PASS except one drift cluster

Full read of managed-agent-hook-registry.ts (93 lines — matches coverage claim).
- Installers array :23-38, removers array :61-76: **every per-agent line cite in the report matches exactly** (claude :24/:62 … kimi :37/:75).
- Refresher array :46-59 + amp/hermes deliberate-absence comment :40-45 (incl. coverage-test enforcement sentence) — **verbatim match**.
- Status-readers array :78-93: rows claude→droid (:79-:86) match exactly; **drift from grok onward** (see F-1).

## 4. Per-agent method-line cites (§3a + §4) — PASS

Independently re-extracted via pattern scan of all 15 non-claude services. Every class/singleton/method cite matched:

| Agent | Class | Singleton | install | remove | getStatus | refresh | installRemote |
|---|---|---|---|---|---|---|---|
| codex | :1024 ✅ | :1614 ✅ | :1264 ✅ | :1569 ✅ | :1117 (param'd) ✅ | :1025 ✅ | :1401 ✅ |
| gemini | :100 ✅ | :308 ✅ | :149 ✅ | :274 ✅ | :105 ✅ | :101 ✅ | :204 ✅ |
| antigravity | :299 ✅ | :464 ✅ | :368 ✅ | :445 ✅ | :312 ✅ | :300 ✅ | :402 ✅ |
| amp | :330 ✅ | :383 ✅ | :336 ✅ | :372 ✅ | :331 ✅ | absent ✅ (deliberate) | :346 ✅ |
| cursor | :104 ✅ | :311 ✅ | :156 ✅ | :277 ✅ | :109 ✅ | :105 ✅ | :220 ✅ |
| droid | :162 ✅ | :328 ✅ | :230 ✅ | :295 ✅ | :167 ✅ | :163 ✅ | :255 ✅ |
| command-code | :91 ✅ | :234 ✅ | :143 ✅ | :201 ✅ | :96 ✅ | :92 ✅ | :163 ✅ |
| grok | :185 ✅ | :334 ✅ | :237 ✅ | :301 ✅ | :190 ✅ | :186 ✅ | :257 ✅ |
| copilot | :186 ✅ | :416 ✅ | :258 ✅ | :376 ✅ | :191 ✅ | :187 ✅ | :305 ✅ |
| hermes | :449 ✅ | :541 ✅ | :465 ✅ | :520 ✅ | :450 ✅ | absent ✅ (deliberate) | :483 ✅ |
| devin | :82 ✅ | :233 ✅ | :140 ✅ | :210 ✅ | :87 ✅ | :83 ✅ | :162 ✅ |
| kimi | :158 ✅ | :255 ✅ | :179 ✅ | :235 ✅ | :163 ✅ | :159 ✅ | :202 ✅ |
| mimo | :50 ✅ | :80 ✅ | none ✅ | none ✅ | none ✅ | none ✅ | none ✅ |
| opencode | :1002 ✅ | :1166 ✅ | none ✅ | none ✅ | none ✅ | none ✅ | none ✅ |

openclaude full-file re-read (8 lines) confirms pure re-parametrization over ClaudeHookService with OPENCLAUDE_HOOK_SETTINGS (:1-8) — D-5 inheritance claim correct.

Partial-state emissions verified: amp :79/:87 ✅; cursor :150 ✅; droid :206/:214/:221 ✅; command-code :137 ✅; copilot three branches :240/:243/:252 ✅; hermes buildStatus partial :258 ✅; kimi :152 ✅; codex :1243 ✅.

## 5. Codex superset claims (§4/D-4) — PASS

WSL install fn :850 ✅; reconciliation :990 ✅ + key fn :1020 ✅; trust-sweep suppression gate :181 ✅; legacy profile-block cleanup fn :671-716 ✅; mirrored-user-hook trust rebasing region :451-558 ✅; trust-grant ledger imports :75-83 ✅; canonical cross-references "(see claude/hook-service.ts)" at :772 and :785 — **verbatim** ✅.

## 6. Event catalogs (§3c) — PASS

| Agent | Report count/names | Actual | Result |
|---|---|---|---|
| claude | 11 named events, hook-settings.ts:33-62 | CLAUDE_EVENTS :30-64, 11 eventName entries, names match exactly | ✅ |
| codex | 8, hook-service.ts:87-97 | CODEX_EVENTS :87-96, names/order match | ✅ |
| antigravity | 4, :38-53 | :38-53+, PreInvocation/PostInvocation/Stop/PostToolUse | ✅ |
| command-code | 3, :25-35 | :25-35 exact | ✅ |
| copilot | 13, :31-47 incl. subagentStart + normalization note :38-40 | :31-47, note verbatim :38-40 | ✅ |
| cursor | 8 camelCase, :32-42 | CURSOR_EVENTS :32-41, names match | ✅ |
| droid | 8, :35-56, SubagentStop-ignore comment :39-40 | :35-56, comment verbatim ("sub-droid completion is mission progress…") | ✅ |
| gemini | 4, :33 | GEMINI_EVENTS :33, BeforeAgent/AfterAgent/AfterTool/BeforeTool | ✅ |
| grok | 9, :35-55 | :35-55 incl. StopFailure w/ Claude-rationale comment :39-40 | ✅ |
| hermes | 10 snake_case, :27+ | on_session_start :28 … on_session_reset :37 (+payload map :303-312) | ✅ |
| kimi | textual matching via readManagedKimiHookEvents | function exists; **line cite drifted** (F-2) | ⚠️ content ✅ |
| amp/devin/mimo/opencode/openclaude | n/a entries | consistent with sources | ✅ |

## 7. Remote plane (§3b) — PASS

Full read of remote-managed-hook-installers.ts (119 lines — matches coverage claim): loop array :42-71 ✅; runner fn :79-119 ✅; abort-signal :92 (`throwIfAborted`) ✅; error-degrade catch :103-115 ✅; allow-list :85-89 ✅; invariant export + historical-bug comment :73-77 ("the omission that hid Droid/Copilot status over SSH" verbatim) ✅; extended-opts types :18-31 (codexHomeDir :19-23, grokHomeDir :24-25) ✅; codex wiring :45-55 ✅; grok wiring :62-66 ✅; openclaude :44 ✅; all other per-agent wiring lines match ✅. mimo/opencode correctly absent ✅.

## 8. Remaining per-agent detail cites (§4) — PASS except listed drifts

- **amp**: plugin file :17 ✅, marker :18 ✅, getPluginPath :26 ✅, atomic write :103-105 ✅, fs imports :6 ✅, completeness fn :35+ ✅, plugin-source builder :131 ✅.
- **grok**: resolveGrokHomeDir import :4 ✅, getRemoteGrokHome :72 ✅, control-char validation :89 ✅, matcher `'.*'` :33 ✅, test export :59 ✅.
- **copilot**: getCopilotHome :50 ✅.
- **command-code**: delegated-script import :23 ✅.
- **antigravity**: wrapper-path :81 ✅, wrapper-body :154 ✅, post-command builder :177 ✅, stale-bundle detection :208-238 ✅.
- **hermes**: yaml import :16 ✅, plugin name/marker :24-25 ✅, enable/disable transforms :104-135 ✅ (enablePlugin :104), embedded Python `import json/os/urllib...` :288-291 verbatim ✅.
- **mimo**: clearPty :51 ✅, buildPtyEnv :53 ✅, mirrorConfigDir :27 ✅, plugin file const :8 ✅ — but overlay-mirror import cite :5 is actually **:6** (F-7).
- **opencode**: clearPty :1003 ✅, buildPtyEnv :1007 ✅, manifest read/write :1053/:1067 ✅, mirrorUserConfig :1089 ✅, plugin injection :1140 ✅, shared config :1152 ✅, exports :38/:42 ✅.
- **wiring**: ipc/pty.ts :1737 (opencode spawn env) / :1750 (mimo) / :2066 (opencode cleanup) — all exact ✅; agent-hooks/wsl-hook-relay-deps.ts:11 imports getOpenCodePluginSource ✅.

---

## 9. Findings Register

| ID | Finding | Severity | Evidence |
|---|---|---|---|
| F-1 | §3a status-reader registry column drifted for the last 5 rows: grok cited reg :89 (actual :87), copilot :90 (actual :89), hermes :91 (actual :90), devin :92 (actual :91), kimi :93 (actual :92; :93 is the array's closing bracket) | MINOR cosmetic — registration content itself correct, all 14 present in MANAGED_AGENT_HOOK_STATUS_READERS | managed-agent-hook-registry.ts:78-93 |
| F-2 | kimi `readManagedKimiHookEvents(text, isManagedCommand)` cite :170-172 → actual call at **:176**; :170-172 is inside buildStatus's unreadable-config error return | MINOR cosmetic | kimi/hook-service.ts:170-172 vs :176 |
| F-3 | kimi apply/remove helper usage cite ":187/:246" → actual applyManagedKimiHooks at **:195** (local) and **:216** (remote); removeManagedKimiHooks at **:247** | MINOR cosmetic | kimi/hook-service.ts:195/:216/:247 |
| F-4 | D-10 kimi write-ordering comments cited ":184/:198" → actual comments at **:193** and **:214** ("Write the script first so config.toml never points at a missing script." — invariant itself real, D-10 conclusion stands) | MINOR cosmetic | kimi/hook-service.ts:193/:214 |
| F-5 | gemini dual-platform script cite ":43-45 win32 .cmd else .sh" → :43-45 is getManagedScriptPath; the .cmd/.sh platform selection is at **:40** (filename) and **:48/:54** (body) | MINOR cosmetic | gemini/hook-service.ts:40/:48/:54 |
| F-6 | claude installRemote "POSIX-only by design (:245 comment)" → explicit wording at **:243**; :245 is the supporting "remote Windows is unsupported" comment | MINOR cosmetic | claude/hook-service.ts:243/:245 |
| F-7 | mimo "mirrorEntry/safeRemoveTree from pty overlay-mirror :5" → that import is at **:6** (:5 is the getOpenCodeFamilyPluginSource import) | MINOR cosmetic | mimo/hook-service.ts:5/:6 |

Non-findings checked and accepted as accurate: codex "~1,616 lines" vs measured 1,622 (within "~"); §3c claude catalog cite :33-62 vs actual span :30-64 (events proper occupy :33-63 — acceptable range cite).

---

## 10. Coverage Statement Check — PRESENT and ACCURATE

Report §6 states what was fully read (claude 331 ✅ verified, registry 93 ✅, remote-managed 119 ✅, openclaude 8 ✅, kimi core :159-255 ✅), what was signature-extracted (14 files), targeted greps performed, and explicitly lists NOT-read regions (codex internals beyond structure, opencode :43-1001 bodies, script-body strings, test files, hook-settings beyond :30-62). All stated line counts reproduced by this verification. The statement honestly scopes the work; nothing material was hidden. No `_sources/` reads claimed — consistent with FA-only scope (confirmed: no _sources cites appear anywhere in the report).

---

## Totals

- Anchors sampled/re-opened vs sources: **~100** (inventory 16 + registry 30+ + remote plane 20+ + canonical claude 15 + per-agent methods ~60 + catalogs 11 + detail cites 20+)
- Exact PASS: **~93**
- MINOR (cosmetic line-anchor drift, content correct): **7** (F-1..F-7; F-1 covers 5 rows counted as 1 systematic finding)
- FAILED (phantom/wrong content): **0**
- Factual errors: **0**
- Coverage statement: present + accurate
- **VERDICT: fa-hook-parity.md PASSES spot verification.** Bottom-line claim ("zero unexplained gaps; 14 managed agents satisfy the canonical contract; absences carry in-repo rationale") independently reproduced. Optional hygiene: correct F-1..F-7 line anchors in a follow-up mechanical pass.

## Scan Coverage (this verification)

Read in full: claude/hook-service.ts (331 ln), managed-agent-hook-registry.ts (93 ln), remote-managed-hook-installers.ts (119 ln), openclaude/hook-service.ts (8 ln). Pattern-scanned with line output: all 15 remaining hook-service.ts files; targeted line reads: kimi (~20 lines), codex (~15), gemini (~7), amp (~12), copilot (~20), cursor (~12), droid (~24), grok (~23), command-code (~13), antigravity (~20), hermes (~15), mimo (9+3), opencode (9), ipc/pty.ts (3), claude/hook-settings.ts (:30-64), wsl-hook-relay-deps.ts (:1-15), plus inventory listing. Skipped: script-body string internals, test files, _sources/ (out of scope). No source file modified.
