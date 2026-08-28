# R4-2.6 — Round 4 Wave-4 Spot Verification (fa-telemetry-consent.md + fa-command-palette-search.md)

> Task ATLAS R4-2.6 (task_b99598179df7 / dispatch ctx_78a8ab31ddd5). Spot verification of two
> Round 4 wave-4 discovery reports against actual source files in `Fabrica-app/`.
> Method: sample file:line citations from each report, re-read the cited lines at the cited
> paths, compare claim vs source text; check scan-coverage statements; record failures with evidence.
> READ-ONLY on `_sources/` and `../Fabrica-app/`. All source paths below relative to `Fabrica-app/`.

---

## Report 1 — `.Fabrica-atlas-board/discovery/round4/fa-telemetry-consent.md`

### Sampled citations (18)

| # | Report claim | Source evidence found | Verdict |
|---|---|---|---|
| 1 | `posthog-node ^5.33.3` at package.json:143 | package.json:143 = `"posthog-node": "^5.33.3",` exact | EXACT |
| 2 | PostHog host `https://us.i.posthog.com` at client.ts:104 | src/main/telemetry/client.ts:104 = `host: 'https://us.i.posthog.com',` exact | EXACT |
| 3 | flushAt 20 / flushInterval 10_000 at client.ts:105-106 | client.ts:105-106 exact match | EXACT |
| 4 | `const TELEMETRY_ENABLED = true` at client.ts:21 + verify-script grep comment at :20 | client.ts:20-21 both exact | EXACT |
| 5 | FABRICA_BUILD_IDENTITY / WRITE_KEY fold to null; IS_OFFICIAL_BUILD false without them, client.ts:25-36 | client.ts:25-36 matches exactly (globalThis fallbacks + IS_OFFICIAL_BUILD conjunction) | EXACT |
| 6 | Client singleton `let posthog: PostHog \| null = null` at client.ts:39 | client.ts:39 exact | EXACT |
| 7 | Consent resolver precedence DNT > FABRICA_TELEMETRY_DISABLED > CI > optedIn, consent.ts:76-109 | resolveConsent at :76-109; precedence order and reason literals (`do_not_track`, `FABRICA_disabled`, `ci`, `user_opt_out`, `pending_banner`) all match exactly | EXACT |
| 8 | 8 CI env vars incl. CI/GITHUB_ACTIONS/GITLAB_CI/CIRCLECI/TRAVIS/BUILDKITE/JENKINS_URL/TEAMCITY_VERSION, consent.ts:26-35,88-90 | :26-35 lists exactly those 8; :88-90 is the presence-check returning `ci` | EXACT |
| 9 | Only `1`/`true` truthy; else warn once to stderr, consent.ts:57-68 | isEnvVarTruthy :57-68 exact (`warnOnceMisconfigured(name, v)` at :66) | EXACT |
| 10 | Hardcoded `FEEDBACK_API_URL = 'https://www.onfabrica.dev/v1/feedback'` at feedback.ts:17 | src/main/ipc/feedback.ts:17 exact | EXACT |
| 11 | Server-mode redaction drops install_id/installid/distinct_id/distinctid, redactor.ts:65-71 (checkpoint said :66-71) | src/main/observability/redactor.ts:66-71 block; comment line :65 explains identity-key stripping. Both cites land on target | EXACT |
| 12 | eventSchemas registry at telemetry-events.ts:1425; app_opened :1426; app_starred_FABRICA :1427; repo_added :1431; telemetry_opted_in/out :1466-1467; FABRICA_cli_feature_tip_* :1469-1471 | All verified line-exact in src/shared/telemetry-events.ts (file total 1650 lines as claimed) | EXACT |
| 13 | MAIN_OWNED_TELEMETRY_EVENTS = {app_starred_FABRICA, daemon_audit_eligibility, star_nag_outcome, feature_interaction_usage_bucket_reached} at ipc/telemetry.ts:25-30, enforced :65-68 | Both exact (Set contents identical; renderer-emitted main-owned events dropped at :66-68) | EXACT |
| 14 | Web preload stubs all four telemetry bridges no-op, web-preload-api.ts:931-935 | :931-935 = telemetryTrack / telemetrySetOptIn / telemetryGetConsentState / telemetryAcknowledgeBanner all Promise.resolve stubs | EXACT |
| 15 | install_id randomUUID generator install-id.ts:10-12; sole read path :19-21 | src/main/telemetry/install-id.ts:10-12 generateInstallId→randomUUID; :19-21 readInstallId reads settings only. File is 21 lines as structure implies | EXACT |
| 16 | Bundle submission id: 128-bit random base64url, not persisted, bundle.ts:177-185; header has FABRICA_channel but NO install_id, bundle.ts:42-51 | bundle.ts:177-185 generateBundleSubmissionId = randomBytes(16).toString('base64') url-safe; BundleHeader type :42-51 contains FABRICA_channel, no install_id field | EXACT |
| 17 | Ambient build constants + "no runtime env-var fallback" build-constants.d.ts:8-22 | src/types/build-constants.d.ts:8-10 states no runtime fallback; :12-13, :22 declare FABRICA_BUILD_IDENTITY / FABRICA_POSTHOG_WRITE_KEY / FABRICA_DIAGNOSTICS_TOKEN_URL | EXACT |
| 18 | Renderer bundles no PostHog SDK invariant lib/telemetry.ts:1-2; PRIVACY_URL onfabrica.dev/docs/telemetry :11 | src/renderer/src/lib/telemetry.ts:2 security-invariant comment verbatim; :11 PRIVACY_URL constant exact | EXACT |

### Negative claims re-tested

- `crashReporter|minidump|submitURL` grep over `src/` → **0 hits** (report claims zero; confirmed).
- No fuzzy-lib analog needed here; SDK absence claims consistent with package.json dependencies block.

### Coverage statement

Present and substantive ("Scan coverage statement" section: read-in-full list, grep-scanned list,
skipped/out-of-scope list incl. node_modules/dist/out/.next, updater lane deferred to R4-1.4,
plan docs noted as not found in tree). Meets board convention.

### Verdict — Report 1

**PASS.** 18/18 sampled citations verified exact (0 failed, 0 minor). Headline architecture
(two-lane isolation, CI-gated transmission, consent precedence, onfabrica.dev crash endpoint)
independently reproduced from source.

---

## Report 2 — `.Fabrica-atlas-board/discovery/round4/fa-command-palette-search.md`

### Sampled citations (19)

| # | Report claim | Source evidence found | Verdict |
|---|---|---|---|
| 1 | cmdk 1.1.x dependency at package.json:201 | package.json:201 = `"cmdk": "^1.1.1",` exact | EXACT |
| 2 | No fuzzysort/fuse.js/fzf anywhere; deps block package.json:129-154 | Deps block spans :129-154 exactly as claimed; repo-wide grep for fuzzysort/fuse.js/fzf → 0 hits | EXACT |
| 3 | WorktreeJumpPalette.tsx is 3,153 lines | Actual total: 3,153 lines | EXACT |
| 4 | Item union merges seven families at WorktreeJumpPalette.tsx:258-266 | :258-266 = PaletteItem union with exactly 7 members (worktree, project-target, settings, quick-action, browser, simulator, workspace-tab) | EXACT |
| 5 | cmdk filtering disabled `shouldFilter={false}` cited at :2492; commandProps loop:true at :2492-2497 | commandProps block IS at :2492-2497 ✓, but `shouldFilter={false}` is actually at **WorktreeJumpPalette.tsx:2480** (inside the same CommandDialog element starting :2477). Claim correct, cite off by 12 lines | MINOR (line drift) |
| 6 | Component gate `visible = useAppStore(s => s.activeModal === 'worktree-palette')` at :517 | :517 exact | EXACT |
| 7 | Scopes/context/platform/policy types keybindings.ts:5-19 | src/shared/keybindings.ts:5-19 exact (KeybindingScope union :5-13, context :15, platform :17, policy :19); file total 2,399 lines as claimed | EXACT |
| 8 | worktree.quickOpen Mod+P definition keybindings.ts:204-211 | :204-211 = definition with platformBindings(['Mod+P']) | EXACT |
| 9 | worktree.palette Mod+J darwin / Mod+Shift+J linux+win32 at keybindings.ts:231-241 | :231-241 exact bindings | EXACT |
| 10 | LEGACY_TAB_SWITCH_BINDINGS pinned for migration keybindings.ts:1097-1103 | :1097-1103 exact | EXACT |
| 11 | Per-agent keybinding defs generated unbound, agentTabActionId :1105-1107, builder :1110-1127 | :1105-1107 helper exact; :1110-1127 builder with platformBindings([]) (= unbound) exact | EXACT |
| 12 | settings.search Mod+F at keybindings.ts:929-936 | :929-936 exact | EXACT |
| 13 | worktree.palette → `{type:'toggleWorktreePalette'}` window-shortcut-policy.ts:212-214 (350 lines) | window-shortcut-policy.ts total 350 lines; :212-214 exact mapping | EXACT |
| 14 | before-input-event at createMainWindow.ts:810; toggleWorktreePalette IPC send at :695-697 | :810 handler registration exact; :695-697 case sends 'ui:toggleWorktreePalette' exact | EXACT |
| 15 | Preload onToggleWorktreePalette wraps ipcRenderer.on('ui:toggleWorktreePalette'), preload/index.ts:3544-3548 | :3544-3548 exact | EXACT |
| 16 | Renderer toggles modal useIpcEvents.ts:1266-1275; activeModal union includes 'worktree-palette' ui.ts:802 | useIpcEvents :1266-1275 exact open/close logic; store/slices/ui.ts:802 = `'worktree-palette'` in union | EXACT |
| 17 | getUserKeybindingsPath ~/.fabrica/keybindings.json keybinding-file.ts:25-27; doc shape version/keybindings/platforms :33-43 (469 lines) | keybinding-file.ts total 469 lines; :25-27 exact; createEmptyDocument :33-43 exact shape | EXACT |
| 18 | 'keybindings:changed' broadcast to all windows + rebuildAppMenu main/ipc/keybindings.ts:7-14 | :7-14 broadcastKeybindingsChanged loops BrowserWindow.getAllWindows() sending 'keybindings:changed' then rebuildAppMenu() | EXACT |
| 19 | Agent-picker scorer tiers exact/prefix(+10)/substring(+100+i)/acronym(+220+x)/subsequence(+400+x) scoreCandidate :94-123 (238-line file); QUICK_OPEN_RESULT_LIMIT=50 quick-open-search.ts:4; filename −100 bonus :103-105; plugin palette entries plugin:<key>/<id> with 'no-active-workspace' reason cmd-j/plugin-quick-actions.ts:7-34; 'command_palette' first WORKSPACE_SOURCE_VALUES entry shared/workspace-source.ts:2; launchSourceSchema includes 'command_palette':183 and 'workspace_jump_palette':189; focused-pane dispatch refuses agent commands terminal-quick-command-dispatch.ts:31-33; action union 'terminal-command'\|'agent-prompt' types.ts:2722 | All verified: agent-picker-search.ts = 238 lines, scoreCandidate tiers exact at :94-123; src/renderer/src/components/quick-open-search.ts:4 limit=50, :103-105 −100 filename bonus; plugin-quick-actions.ts:7-34 exact (id template :11, availability reason :27); workspace-source.ts:2 first entry 'command_palette'; telemetry-events.ts launchSourceSchema :182-190 contains both values at :183/:189; terminal-quick-command-dispatch.ts:31-33 returns false for agent commands; types.ts:2722 union exact | EXACT |

Note on #19 path shorthand: report §5.3 cites `components/quick-open-search.ts` without the
`src/renderer/src/` prefix (its stated convention is Fabrica-app-root-relative). The file exists
at `src/renderer/src/components/quick-open-search.ts`; content matches every line cite.
Counted as cosmetic shorthand, not a failure.

### Coverage statement

Present and detailed ("Scan-Coverage Statement" §10: read-in-full file list, partially-read
ranges, skipped set with rationale, glob/grep sweep cross-check, out-of-scope classification of
visual-palette-reference.md). Meets board convention.

### Verdict — Report 2

**PASS** (1 minor). 19 sampled citations: 18 exact, 1 MINOR line-drift (`shouldFilter={false}`
cited at WorktreeJumpPalette.tsx:2492, actual :2480 — same JSX element, claim itself correct),
0 failed.

---

## Totals

| Metric | Value |
|---|---|
| Reports spot-verified | 2 |
| Citations sampled | 37 |
| EXACT | 36 |
| MINOR (cosmetic line drift / shorthand) | 1 |
| FAILED | 0 |
| Coverage statements present | 2/2 |
| Overall verdict | **Both reports PASS** — cleared for synthesis use |

## Findings register (optional hygiene, non-blocking)

1. fa-command-palette-search.md §0 item 2: `shouldFilter={false}` cite should read
   WorktreeJumpPalette.tsx:2480 (not :2492); the adjacent commandProps cite :2492-2497 is correct.

## Scan coverage of THIS verification pass

Read in full: both target reports (788 + 383 lines), task-file Checkpoint. Read at cited ranges:
package.json, src/main/telemetry/{client.ts, consent.ts, install-id.ts},
src/shared/telemetry-events.ts, src/main/ipc/{feedback.ts, telemetry.ts, keybindings.ts},
src/main/observability/{redactor.ts, bundle.ts}, src/types/build-constants.d.ts,
src/renderer/src/lib/telemetry.ts, src/renderer/src/web/web-preload-api.ts (stub region),
electron.vite.config.ts (define block), src/shared/keybindings.ts (5 regions),
src/shared/window-shortcut-policy.ts, src/main/window/createMainWindow.ts (2 regions),
src/preload/index.ts (:3542-3550), src/renderer/src/hooks/useIpcEvents.ts (:1264-1276),
src/renderer/src/store/slices/ui.ts (:800-804), src/main/keybindings/keybinding-file.ts
(:24-44), src/renderer/src/lib/agent-picker-search.ts (:94-124), quick-open-search.ts,
cmd-j/plugin-quick-actions.ts, cmd-j/quick-actions.ts (partial),
terminal-pane/terminal-quick-command-dispatch.ts, shared/types.ts (:2720-2740),
shared/workspace-source.ts. Greps run: fuzzy-lib names (0 hits), crashReporter family (0 hits),
shouldFilter location. Not read: remainder of the two large files (WorktreeJumpPalette.tsx,
useIpcEvents.ts bodies beyond cited ranges) — out of scope for a spot pass.

No source files modified anywhere (read-only session; auditable via git status).
