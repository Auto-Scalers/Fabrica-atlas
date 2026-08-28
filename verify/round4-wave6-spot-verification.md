# R4-2.8 — Spot verification: `discovery/round4/fa-agent-hooks-probes.md` vs sources

> Task: ATLAS R4-2.8 (claimed IN_PROGRESS in `.Fabrica-atlas-board/Fabrica-atlas-tasks.md` Group 2 table).
> Target report: `Fabrica-atlas/.Fabrica-atlas-board/discovery/round4/fa-agent-hooks-probes.md` (241 lines).
> Source tree: `Fabrica-app/` (READ-ONLY session — nothing under `_sources/` or `../Fabrica-app/` was modified; verified by git status discipline of this worker).
> Method: read the target report in full, then re-opened each cited file at/near the cited line ranges and compared content. Sample size far exceeds the 12-citation minimum.

---

## 1. Headline check — digest C7 correction (14 managed targets vs 18 live pathnames)

**VERDICT: CORRECTION CONFIRMED.**

| Claim | Evidence checked | Result |
|---|---|---|
| `AGENT_HOOK_TARGETS` = 14 managed install targets (`src/shared/agent-hook-types.ts:6-21`) | Read full file (51 L): array spans exactly lines 6–21 with exactly 14 entries: claude, openclaude, codex, gemini, antigravity, amp, cursor, droid, command-code, grok, copilot, hermes, devin, kimi | ✅ PASS |
| `HOOK_SOURCE_BY_PATHNAME` = 18 live pathnames (`src/shared/agent-hook-listener.ts:4418-4437`) | Read lines 4405–4449: map spans exactly lines 4418–4437 with exactly **18** entries. Counted one-by-one: claude, codex, gemini, antigravity, amp, opencode, mimo-code, cursor, pi, omp, prime-agent, droid, command-code, grok, copilot, hermes, devin, kimi = 18 | ✅ PASS |
| Delta set: opencode/mimo-code/pi/omp/prime-agent live but not managed; openclaude managed but no dedicated pathname | Both lists above confirm: the 5 extra pathnames are absent from `AGENT_HOOK_TARGETS`; openclaude appears in targets but not in pathname map | ✅ PASS |
| Digest C7 original text ("15 named external agent CLIs", `analysis/round4-findings-digest.md` line 56) | Re-read digest lines 54–56: heading says "15+ CLIs"; body enumerates 15 channel names including **`minimax`**, which does NOT exist in `agent-hooks.ts:55-68`, while claiming "(14 channels)" internally — the digest is self-inconsistent and its channel enumeration is wrong (minimax fabricated, real list has commandCode). The report's correction (14 managed / 18 live) is accurate against source | ✅ PASS — correction justified |
| FA-T1 anchor = digest line 124 | Re-read digest line 124: FA-T1 provider-neutral runner `Runner.spawn(SpawnSpec)` present exactly there | ✅ PASS |

## 2. Citation-by-citation verdicts (26 samples across 9 source files)

Legend: ✅ = file exists + cited range matches claim; ~ = minor range imprecision, content correct.

### `src/shared/agent-hook-types.ts` (read in full, 51 L)
1. ✅ `:6-21` — `AGENT_HOOK_TARGETS`, exactly 14 entries as listed in report §3.1.
2. ✅ `:24` — state union `'installed'|'not_installed'|'partial'|'error'|'skipped'`.
3. ✅ `:26-30` — skip reasons incl. `'cli_not_found' | 'cli_presence_unknown'`.
4. ✅ `:32-39` — `AgentHookInstallStatus` shape matches §5.1 field-for-field.
5. ✅ `:51` — `FABRICA_HOOK_PROTOCOL_VERSION = '1'`.

### `src/main/ipc/agent-hooks.ts` (read in full, 324 L — matches coverage-statement count)
6. ✅ `:55-68` — 14 `ipcMain.removeHandler('agentHooks:<X>Status')` lines, camelCase names match §3.1 list exactly.
7. ✅ `:10-28` — service-singleton imports, one directory per agent.
8. ✅ `:112-119` — `agentStatus:getSnapshot` handler with hydration comment.
9. ✅ `:137-154` — error-containment comment + first try/catch returning structured `{state:'error', detail}`.
10. ✅ `:142-323` — the 14 copy-paste handlers span exactly these lines (claude at 142 → kimi ends 323), confirming §9 friction point 1.
11. ✅ `:84-88` — dropStatusEntry-vs-clearPaneState comment as quoted in §6.
12. ✅ `:94-104` — tab-prefix mass-drop handler.
13. ✅ `:105-111` — pane-authority wiring (`registerAgentPaneAuthorityIpcHandlers`).

### `src/shared/agent-hook-listener.ts` (:4405-4449)
14. ✅ `:4418-4437` — 18-entry pathname map (see §1 above). **The load-bearing C7 citation holds.**
15. ✅ `:4439-4441` — `resolveHookSource` returns null on unknown pathname (server turns that into 404).

### `src/main/agent-hooks/server.ts` (:2095-2249 window; total lines confirmed 2907)
16. ✅ `:2101` — `this.token = randomUUID()` per start.
17. ✅ `:2116-2120` — token header check ⇒ 403.
18. ✅ `:2122-2125` — slowloris guard destroys stalled socket.
19. ✅ `:2130-2138` — `/statusline/claude` special route.
20. ✅ `:2139-2144` — unknown pathname ⇒ HTTP 404 (§3.2 claim).
21. ✅ `:2147-2163` — normalize → disposition gate (call `:2149-2154`) → restart strips launchToken (`:2156-2159`) → retry/codex scheduling (`:2162-2163`).
22. ✅ `:2168-2172` — fail-open catch answers 204.
23. ✅ `:2197-2198` — `listen(0, '127.0.0.1')` loopback bind.
24. ✅ `:2203-2204` — flush-before-quit comment+call in `stop()`.
25. ✅ `:2220` — endpoint-file deliberately not unlinked, TOCTOU comment verbatim.
26. ✅ `:2241-2249` — `dropStatusEntry` preserves prompt/tool caches + authority.

### `src/shared/agent-status-types.ts` (:10-299 of 439)
27. ✅ `:16` — states `working/blocked/waiting/done`.
28. ✅ `:20-43` — `WellKnownAgentType` union; `AgentType` accepts any non-empty string at `:43`.
29. ✅ `:59` — `AGENT_STATE_HISTORY_MAX = 20`.
30. ✅ `:164-190` — payload fields + `ParsedAgentStatusPayload` prompt-always-string contract.
31. ✅ `:222-243` — `AgentStatusIpcPayload` incl. connectionId doc `:228-230` (SSH-only stamping, references docs/design/agent-status-over-ssh.md §5), providerSessionOnly `:237-238`, restoredUnconfirmed `:242`.
32. ✅ Field caps: toolName 60 `:255`, toolInput 160 `:257`, assistant 8000 `:260`, interactivePrompt 16000 `:263`, agentType/model 40/120 `:287-288`, subagents ≤32 `:292`, JSON limits 4096 tokens / depth 16 `:293-296`.
33. ✅ `:268` — `AGENT_STATUS_STALE_AFTER_MS = 30 * 60 * 1000` (30-min TTL).

### `src/main/agent-hooks/managed-agent-hook-controls.ts` (read :85-213; total 213 L — matches coverage statement)
34. ✅ `:91-107` — #11549 refresh-before-gating comment + `refreshExistingManagedScripts` unconditional call site at `installManagedAgentHooks:113`.
35. ✅ `:117-133` — presence probe runs inside install only; failure ⇒ `cli_presence_unknown` skips, never config write.
36. ✅ `:138-141` / `:142-151` / `:152-162` — `agent_disabled` / `hooks_disabled` (shouldContinue) / `cli_not_found|cli_presence_unknown` skip paths exactly as claimed.
37. ✅ `:191-213` — `applyAgentStatusHooksEnabled` semantics (remove when off; install + disabled-removal reconciliation when on).

### `src/main/claude/hook-settings.ts` (read in full, 220 L)
38. ✅ `:16-28` — `configDirName: '.claude' | '.openclaude'`; dir names at `:21` (.claude) and `:26` (.openclaude) — confirms "openclaude is literally the Claude service parameterized".
39. ✅ `:30-65` — `CLAUDE_EVENTS` contains exactly the 11 events listed in §4.2 (SessionStart … PermissionRequest). ~ Report's range ":30-62" slightly short (list actually ends :64/65); content fully correct.
40. ✅ `:67-68` — `getConfigPath` = homedir/configDirName/settings.json.

### `src/cli/handlers/agent-hooks.ts` (read :135-177; total 177 L — matches coverage statement)
41. ✅ `:141-157` — runtime-RPC-or-offline-edit dual path; `{enabled, settingsPath, appliedBy:'runtime'|'offline', statuses}` shape matches §8 item 4.
42. ✅ `:159-177` — `agent hooks status/on/off` handler table; status handler `:160-168` supports the "CLI/diagnostics-only surface" weakness claim.

### `src/main/agent-hooks/local-agent-cli-presence.ts` (read :134-200; total 200 L — matches coverage statement)
43. ✅ `:134-147` — `maybeHydrateShellPath`; exact quote *"Detection failure must never permit config mutation"* found verbatim at `:144`.
44. ✅ `:149-199` — `detectLocalManagedAgentCliPresence` signature/body; override-with-separator resolution `:180-193` with `'unknown'` fallback `:186`; plain-name any-PATH-dir match `:194-197`.

## 3. Failures

**None blocking. Zero failed citations out of 44 sampled.** Minor notes (non-failures):

- N1 (~): `hook-settings.ts` CLAUDE_EVENTS cited as ":30-62", actual span `:30-65`. Content correct.
- N2 (~): §6 cites disposition-gate region as `:2147-2164`; actual pipeline statements run `:2146-2163` (the specific sub-cites `:2149-2154`, `:2156-2159`, `:2162-2163` are all exact). Content correct.
- N3 (observation): digest C7's own channel list (line 56) names a nonexistent `minimaxStatus` channel and contradicts itself ("15 named… (14 channels)"). The report's correction understates how wrong the digest was — correction is conservative and safe to adopt.

## 4. Coverage-statement audit (report §11)

Present and specific: full-read list with line counts (all four spot-checked files matched their stated totals exactly: agent-hooks.ts 324, hook-controls 213, cli/handlers/agent-hooks.ts 177, local-agent-cli-presence.ts 200); targeted-region list for server.ts/listener/index/preload/settings/web-preload-api; skipped-list explicitly flags unverified per-agent service bodies (codex/gemini/amp/cursor/droid/command-code/grok/copilot/hermes/devin/kimi/antigravity assumed identical via registry uniformity — honestly flagged, consistent with registry table structure seen at managed-agent-hook-controls.ts). Coverage statement meets board convention. No hidden gaps discovered during sampling: every file I opened existed where cited with the stated shape.

## 5. Totals & verdict

| Metric | Value |
|---|---|
| Citations sampled | 44 (+3 meta-checks against the digest itself) |
| Verified exact | 41 |
| Verified with minor range imprecision | 3 (~ items N1-N2 + CLAUDE_EVENTS span) |
| Failed | **0** |
| Files opened from source tree | 9 (all READ-ONLY) |

**FINAL VERDICT: PASS.** `fa-agent-hooks-probes.md` is accurate at spot-check depth, including the headline C7 correction (**14 managed targets / 18 live pathnames** — both counts independently reproduced from source). Recommend settling R4-1.25 as verified and adopting the 14/18 numbers into the digest C7 entry.

Scan coverage of THIS verification: read target report in full (241 L); read digest round4-findings-digest.md lines 52-61 + 121-126; read/verified the 9 source files at the ranges listed in §2. Not read: remaining server.ts regions outside :2095-2249, preload/index.ts, index.ts, settings.ts, web-preload-api.ts, tui-agent-config.ts entries (cited ranges accepted on the strength of surrounding verified material; flagged for any future deep pass). No files modified outside `.Fabrica-atlas-board/`.
