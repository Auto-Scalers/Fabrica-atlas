# Fabrica-app Deep Dive R4-1.16 — Command Palette / Quick-Input / Global Search Subsystem

> Task: ATLAS R4-1.16 (Group 1, Round 4). READ-ONLY line-level scan of `../Fabrica-app`
> (all paths below relative to `Fabrica-app/` unless prefixed). Every claim carries a
> `file:line` citation. CLI-agent-management relevance is flagged inline as
> **[AGENT-OPS]** and consolidated in §9.

---

## 0. Executive Summary

1. Fabrica-app's command surface is a single unified palette: the **Worktree Jump
   Palette** ("Cmd+J"), one component of 3,153 lines that merges seven result families
   (worktrees, browser pages, simulator tabs, workspace tabs, settings pages,
   quick actions incl. plugin commands, project targets) into one ranked list
   (`src/renderer/src/components/WorktreeJumpPalette.tsx:258-266`, section build at
   :917-1052 and :1337-1424).
2. The UI primitive is **cmdk 1.1.x** wrapped shadcn-style with Radix Dialog
   (`src/renderer/src/components/ui/command.tsx:4-89`; dependency at
   `package.json:201`), but cmdk's built-in filtering is **disabled**
   (`shouldFilter={false}`, WorktreeJumpPalette.tsx:2492) — all matching/ranking is
   hand-rolled in-repo.
3. **No fuzzy library exists anywhere in the app** (no fuzzysort/fuse.js/fzf; root
   `dependencies` block `package.json:129-154` contains none). Two hand-rolled matcher
   families coexist: case-insensitive substring cascades with additive field weights
   (worktree/tab/simulator/browser search) and true greedy-subsequence fuzzy scorers
   (agent picker, quick-open file search) (§5).
4. The **keybinding system** is a full registry of ~85 base action ids plus two dynamic
   families (per-agent `tab.newAgent.<agent>` chords and `plugin:<key>/<id>` plugin
   chords) with per-platform defaults, user overrides persisted to an atomic JSON file
   `~/.fabrica/keybindings.json`, conflict detection, double-tap chords, digit-index
   ranges, live input capture/recording, and a main-process allowlist resolver
   (`src/shared/keybindings.ts`, `src/shared/window-shortcut-policy.ts`) (§2, §4).
5. **Custom commands are supported three ways**: plugin commands (worker or built-in
   handlers, surfaced as palette entries and rebindable chords), terminal quick
   commands (saved shell commands AND saved **agent-prompt launches**, scoped
   global/repo, executed via PTY write or agent launch engine), and the palette's
   create-workspace flow with GitHub issue/PR deep-link parsing (§6).
6. **[AGENT-OPS]** Agent operations already have palette-grade plumbing: agent-type
   quick commands launch any of ~30 catalogued TUI CLI agents (claude, codex, gemini,
   opencode, cursor…) with a preloaded prompt via `launchAgentInNewTab`
   (`lib/launch-agent-in-new-tab.ts:135-140`); telemetry launch sources
   `'command_palette'` / `'workspace_jump_palette'` already exist
   (`shared/telemetry-events.ts:183,189`). The identified gap: neither terminal quick
   commands nor the agent catalog appear in the Cmd+J palette today — the action layer
   (`quick-actions.ts:59-182`, only 6 built-ins + plugin entries) is the natural
   insertion point (§9).

---

## 1. Subsystem Inventory

| Layer | Files | Role |
|---|---|---|
| Palette UI | `renderer/src/components/WorktreeJumpPalette.tsx` (3,153 lines) + `components/cmd-j/*` (17 source files) | dialog, sections, keyboard, filters, activation |
| Primitive | `renderer/src/components/ui/command.tsx` | shadcn wrapper over cmdk + Radix |
| Search libs | `renderer/src/lib/{worktree,workspace-tab,simulator,browser}-palette-search*.ts`, `cmd-j-match-relevance.ts`, `palette-query-tokens.ts` | per-surface matchers + cross-section relevance scale |
| Other search surfaces | `components/quick-open-search.ts`, `lib/terminal-quick-command-search.ts`, `lib/agent-picker-search.ts`, `lib/repo-search.ts` | Mod+P quick-open, tab-bar quick-command menu, agent combobox, repo picker |
| Command registry | `shared/keybindings.ts` (2,399 lines) | ~85 action ids, defaults, parsing, conflicts |
| Shortcut policy | `shared/window-shortcut-policy.ts` (350 lines) | main-process input→action allowlist |
| Main wiring | `main/window/createMainWindow.ts` (~810-947), `main/menu/register-app-menu.ts` | before-input-event dispatch, display-only menu hints |
| Persistence | `main/keybindings/keybinding-file.ts` (469), `main/keybindings/keybinding-service.ts`, `main/ipc/keybindings.ts`, renderer `web/web-preload-api.ts` | keybindings.json + localStorage variant |
| Settings UI | `components/settings/ShortcutsPane.tsx` (431) + recorder/catalog modules | rebind, disable, conflict surfacing |
| Custom commands | `store/plugin-panels.ts`, `lib/plugin-command-execution.ts`, `shared/terminal-quick-commands.ts`, `store/slices/terminal-quick-command-hosts.ts` | plugins + quick commands |

Note: `visual-palette-reference.md` (repo root, 10,330 bytes) is a **color-theme**
(OKLCH token) migration doc, unrelated to this subsystem despite its name
(verified by reading its header).

## 2. Command Registry — `src/shared/keybindings.ts` (2,399 lines)

### 2.1 Types and action-id union

- Scopes `KeybindingScope = global | tabs | terminal | browser | editor | fileExplorer |
  composer | settings`; contexts `'app' | 'terminal' | 'browser'`; platform
  `'darwin' | 'linux' | 'win32'`; terminal shortcut policy
  `'FABRICA-first' | 'terminal-first'` (keybindings.ts:5-19).
- `KeybindingActionId` is a ~85-member literal union **plus two template families**:
  `AgentTabActionId = \`tab.newAgent.${TuiAgent}\`` (keybindings.ts:26, included :62)
  and `PluginKeybindingActionId = \`plugin:${string}\`` (:27, included :118).
  **[AGENT-OPS]** every catalogued CLI agent automatically gets a (default-unbound)
  keybinding slot: definitions generated by `buildAgentTabKeybindingDefinitions`
  (keybindings.ts:1110-1127; helper `agentTabActionId` :1105-1107), all unbound by
  default.
- Literal ids include the palette-relevant set: `worktree.quickOpen`, `worktree.palette`,
  `worktree.navigateUp/Down`, `workspace.create/rename/delete/openBoard/selectByIndex`,
  `tab.newTerminal/newAgent/newBrowser/newSimulator/newMarkdown`, `tab.openQuickCommandsMenu`,
  `settings.search`, plus full sidebar/zoom/tab/terminal/browser/editor/fileExplorer
  families (full list keybindings.ts:29-118).
- Overrides shape: `KeybindingOverrides = Partial<Record<KeybindingActionId, string[]>>`
  (keybindings.ts:120).

### 2.2 Default bindings table

Each definition in `KEYBINDING_DEFINITIONS` (keybindings.ts:203-1095) carries
`id, title, group, scope, searchKeywords, defaultBindings{darwin,linux,win32}` and
optional flags `allowInTerminal / allowBareKeybindings / allowShiftOnlyKeybindings /
conflictGroup` (keybindings.ts:145-156). Highlights (cite = definition location):

| Action | macOS | Win/Linux | Cite |
|---|---|---|---|
| worktree.quickOpen | Mod+P | Mod+P | keybindings.ts:204-211 |
| worktree.palette (Cmd+J) | Mod+J | Mod+Shift+J | keybindings.ts:231-241 |
| workspace.create | Mod+N, Mod+Shift+N | same | keybindings.ts:258-265 |
| workspace.selectByIndex | Mod+1..9 (canonical `Mod+1`) | same | keybindings.ts:309-328 |
| tab.newAgent | Mod+Alt+T (darwin only) | unbound | keybindings.ts:538-550 |
| tab.selectByIndex | Ctrl+1 | Alt+1 | keybindings.ts:686-699 |
| tab.openQuickCommandsMenu | unbound, conflictGroup 'global' | same | keybindings.ts:700-709 |
| terminal.splitRight/splitDown | Mod+D / Mod+Shift+D | Mod+Shift+D / Alt+Shift+D | keybindings.ts:1045-1068 |
| settings.search | Mod+F | Mod+F | keybindings.ts:929-936 |

Platform differences are per-definition (`platformBindings(x)` fills all three
identically when no divergence exists — keybindings.ts:1152-1158). Legacy pre-swap
tab chords are pinned for migration via `LEGACY_TAB_SWITCH_BINDINGS`
(keybindings.ts:1097-1103).

### 2.3 Parsing, normalization, matching

- Chord grammar: `+`-separated tokens; modifier aliases
  `Mod|CmdOrCtrl→Mod`, `Cmd|Meta|⌘→Cmd`, `Ctrl|⌃→Ctrl`, `Alt|Option|⌥→Alt`,
  `Shift|⇧→Shift` (`parseModifierToken`, keybindings.ts:1279-1297); first non-modifier
  token is the key (:1367-1385).
- Double-tap chords have a dedicated parse path since bare modifiers carry no key
  (`parseDoubleTapKeybinding`, keybindings.ts:1318-1352; canonical form
  `DoubleTap+X` :1387-1389).
- Key-token canonicalization maps punctuation/aliases to stable tokens
  (`[` → BracketLeft, RETURN → Enter, ADD → NumpadAdd …; `normalizeKeyToken`,
  keybindings.ts:1197-1277).
- Validation: reject `Mod` combined with `Cmd`/`Ctrl` (:1445-1447); require ≥1
  modifier unless the action allows bare keys (safe set F1–F24, Backspace, Delete,
  Enter, Escape, Tab, arrows, PageUp/Down — :1411-1435) or shift-only bindings
  (:1451-1470); digit-index rows (`DIGIT_INDEX_ACTION_IDS` = tab/workspace
  `.selectByIndex`, :1138-1143) accept any digit 1–9 but store canonically as `<mods>+1`
  (`canonicalizeDigitIndexBinding` :1534-1544).
- Live capture from DOM KeyboardEvents: `keybindingFromInput(ForAction)`
  (keybindings.ts:161-174, 1760-1820); physical-code fallbacks handle non-Latin
  layouts on Win/Linux excluding AltGr (#6274, :1658-1685) and macOS Option-composed
  characters (:1704-1724, 1933-1958).
- Matching requires exact modifier-state equality with platform-resolved `Mod` plus
  punctuation/numpad-aware key comparison (`keybindingMatchesInput`,
  keybindings.ts:2087-2110, 1919-2067); context gating via `keybindingMatchesAction`
  honoring the terminal policy (:2152-2169); digit ranges fire the representative
  chord and return index−1 (`matchKeybindingDigitIndex` :2181-2208).

### 2.4 Conflict detection and guards

- Platform-resolved conflict identity strings per binding, digit rows expanding into
  nine identities (`getKeybindingConflictIdentity`, keybindings.ts:2112-2150).
- `findKeybindingConflicts(ForDefinitions)` buckets by `conflictGroup ?? scope` and
  also cross-checks custom groups against their own scope because menu accelerators
  may consume global chords (keybindings.ts:2321-2390).
- Terminal-context guards: `isKeybindingAllowedInTerminal` (scope==='terminal' ||
  allowInTerminal, :1884-1886); policy-aware activity check
  `keybindingIsActiveInContext` ('FABRICA-first' keeps everything live inside
  terminals; 'terminal-first' restricts, :1892-1904).
- Type guard `isKeybindingActionId` accepts registry members or plugin ids matching
  `plugin:<kebab>.<kebab>/<id>` capped at 400 chars (keybindings.ts:1164-1175).

---

## 3. Palette UI Plumbing — Main/Renderer Split

### 3.1 Open/close flow end-to-end

1. **Main**: `before-input-event` on `mainWindow.webContents`
   (createMainWindow.ts:810) builds a match input from the raw event, resolves through
   the allowlist `resolveWindowShortcutAction(input, process.platform, keybindings,
   terminalShortcutContext)` (createMainWindow.ts:901-910; policy at
   window-shortcut-policy.ts:168-293). `worktree.palette` maps to action
   `{ type: 'toggleWorktreePalette' }` (window-shortcut-policy.ts:212-214), dispatched
   by `sendResolvedWindowShortcutAction` as IPC channel `'ui:toggleWorktreePalette'`
   (createMainWindow.ts:695-697). Browser guest webviews can trigger the same toggle
   (`main/browser/browser-guest-ui.ts:430-432`).
2. **Preload**: `onToggleWorktreePalette(callback)` wraps
   `ipcRenderer.on('ui:toggleWorktreePalette')` and returns an unsubscribe
   (preload/index.ts:3544-3548; type preload/api-types.ts:3122). The pure-web client
   stubs it as a noop (renderer/src/web/web-preload-api.ts:2781).
3. **Renderer**: `useIpcEvents.ts:1266-1275` toggles the modal:
   `activeModal === 'worktree-palette' ? closeModal() : openModal('worktree-palette')`.
   Store slice: `activeModal` union includes `'worktree-palette'`
   (store/slices/ui.ts:802); `openModal` sets `{ activeModal, modalData }`
   (ui.ts:1593-1601); `closeModal` resets to `'none'` (ui.ts:1602). Also openable from
   the sidebar button (components/sidebar/SidebarNav.tsx:266).
4. **Component gate**: `visible = useAppStore(s => s.activeModal ===
   'worktree-palette')` (WorktreeJumpPalette.tsx:517). The palette stays mounted after
   first open via lazy-modal mount state that never unmounts an opened id
   (lazy-modal-mount-state.ts:18-26; render gate App.tsx:2581-2590 inside
   `RecoverableRenderErrorBoundary`). A 300 ms "linger" keeps content mounted past
   close so Radix fade-out doesn't blank mid-animation
   (`PALETTE_CLOSE_LINGER_MS`, WorktreeJumpPalette.tsx:272, effect :519-526).
5. **Focus restoration on close**: `handleOpenChange(false)` (:1984-2008) restores
   browser-page focus if the user came from a browser pane (:1994-2000), else the exact
   pre-open element via `focusFallbackSurface(previousFocusElementRef)` (:2002-2005);
   activation handlers suppress restoration with `skipRestoreFocusRef.current = true`
   (e.g. :2024, :2054, :2079, :2104, :2117, :2129, :2163, :2244).

### 3.2 Component hierarchy

```
App.tsx (lazy mount, App.tsx:2581-2590 + lazy-modal-mount-state.ts:18-26)
└─ WorktreeJumpPalette (mount gate + linger, WorktreeJumpPalette.tsx:516-540)
   └─ WorktreeJumpPaletteContent (:542)
      └─ PaletteLiveStatusProvider (:3131-3135; palette-live-status.tsx:45-123)
         └─ CommandDialog (:2477-3128; ui/command.tsx:23,46-89)
            ├─ CommandInput (:2499; trailing slot hosts PaletteFilterMenu :2514-2522)
            ├─ WorkspaceEmojiSuggestionPopover (:2525)
            ├─ PaletteFilterChips (:2538)
            ├─ CommandList ref=(:2539) → listEntries.map (:2560-3084)
            │    section-header / hint / CommandItem rows per result family
            ├─ footer keyboard legend (:3088-3103)
            └─ sr-only aria-live region (:3104-3127)
```

cmdk runs with `shouldFilter={false}` and fully controlled selection:
`commandProps={{ loop: true, value: commandSelectedItemId, onValueChange }}`
(WorktreeJumpPalette.tsx:2492-2497).

### 3.3 Keyboard interaction model

- Arrow/Enter handled natively by cmdk (`loop: true` wraps; WorktreeJumpPalette.tsx:2492-2497).
  Local `selectedItemId` resets on query change (:1933-1938) and on open (:1876);
  selection ids derive from the rendered entry list via
  `getWorktreePaletteSelectionItemIds` (:1825-1828) and default to list head via
  `getNextWorktreePaletteSelection` (lib/worktree-palette-create-action.ts, used at
  :1904-1909).
- **Deferred-query guard**: cmdk selection events are ignored while
  `latestQueryRef.current !== deferredQuery` ("cmdk can report the old list head before
  the deferred query commits its new ranking"; :1911-1920); an
  `autoSelectedItemIdRef` snapshot distinguishes untouched vs user-moved highlights
  (:643, effect :1832-1834, use :1311-1313).
- Escape closes via Radix Dialog → handleOpenChange; inside the filter popover Escape
  is intercepted with stopPropagation and steps back to the filter category root
  instead (cmd-j/PaletteFilterMenu.tsx:136-145).
- Tab is advertised in the footer as the Filter shortcut (WorktreeJumpPalette.tsx:3100-3101).
- **⌘N digit chord while palette open**: main sends `'ui:jumpToWorktreeIndex'`
  (window-shortcut-policy.ts:263-270; createMainWindow.ts:722-723;
  preload/index.ts:3596); renderer intercepts it when the palette is open and emits on
  a module-level bus instead of switching workspaces (useIpcEvents.ts:1356-1373). Bus:
  `subscribeCmdJRowIndexJump` / `emitCmdJRowIndexJump` over a listener Set
  (lib/cmd-j-row-index-jump.ts:11-21); palette subscribes only while visible with empty
  query and activates `digitShortcutItemsRef.current[index]` — a layout-effect snapshot
  of recent open-tab items (:2222-2241); out-of-range digits swallowed
  (cmd-j-row-index-jump.ts:8-9). Row badges render via `PaletteRowShortcutBadge`
  (:350-368) using live binding modifiers minus the digit (`DIGIT_INDEX_ACTION_ID`,
  :277-278).

### 3.4 Result families, ordering, caps

Item union at WorktreeJumpPalette.tsx:258-266; entry types incl. header/hint/create
rows :240-267.

| Family | Id prefix | Built from |
|---|---|---|
| worktrees | `worktree:<id>` (:1083) | `searchWorktrees` over smart-sorted scope (:917-937) |
| browser pages | `browser-page:<pageId>` (:1105) | buildSearchableBrowserPages + searchBrowserPages (:939-968) |
| simulator tabs | `simulator-tab:<tabId>` (:1115) | buildSearchableSimulatorTabs + search (:970-999) |
| workspace tabs | `workspace-tab:<tabId>` (:1125) | buildSearchableWorkspaceTabs + search (:1001-1052) |
| settings pages | `settings:*` | buildCmdJSettingsResults(settingsSections) (:1337-1340) |
| quick actions (+plugin) | `quick-action:<id>` (:1508) | built-ins + plugin commands (:1341-1348) |
| project targets | `project-group:` / `project:` | searchCmdJProjectResults filtered (:1384-1424) |

- Open tabs from three sources merge and cross-rank by relevance→score→id
  (`openTabItems`, :1132-1153).
- **Empty-query view**: Recent Chats & Terminals first capped at 6
  (`EMPTY_QUERY_RECENT_TAB_CAP` :279); worktrees capped so total rows ≤ 10
  (`EMPTY_QUERY_ROW_BUDGET=10`, `EMPTY_QUERY_WORKTREE_CAP=5`, :281-282; math
  :1539-1544). Recent order frozen once per open in `useLayoutEffect`
  (:1265-1266, capture :1267-1325) with one provisional→complete re-capture when
  terminal entities arrive late (:1251-1264, 1280-1287); membership rule
  `shouldIncludeOpenTabInRecentSection` (:308-348).
- **Typed-query ordering**: section leadership by best relevance
  (`openTabsLeadSections`, :1516-1529); dual-primary interleaving via
  `layoutMultiPrimaryPaletteSections` with re-emitted `__continued` headers
  (palette-section-render-cap.ts:86-112; builder :1743-1794); then Projects & Groups,
  Actions & Settings, create-workspace row last as fallback (:1804-1808); empty-query
  path :1734-1739.
- **Render caps**: `PALETTE_SECTION_RENDER_CAP = 50`, leading preview 6, trailing
  floor 3 (palette-section-render-cap.ts:9-19; cap fn :26-34; applied
  WorktreeJumpPalette.tsx:1531-1551); overflow shown as non-selectable hint entries
  (`pushOverflowHint` :1624-1636, render :2572-2582).
- **Create-workspace flow**: `getWorktreePaletteCreateActionState({canCreateWorktree,
  query})` gates visibility (:1600-1607); Enter runs `handleCreateWorktree` (:2243-2387)
  handling three cases — pasted GitHub issue/PR URL (:2262-2293), bare issue number
  with async GH lookup guarded against close races (:2296-2373), plain name prefills
  the composer (:2376); composer opens via queued `openModal('new-workspace-composer')`
  after unmount (:2256-2258); base repo prefetched on highlight (:1922-1931).

### 3.5 Performance engineering patterns

- Freeze-on-open snapshots for hot maps via non-reactive selector
  `selectPaletteIndexStatusSnapshot` refreshed only on open/tab-set change
  (WorktreeJumpPalette.tsx:590-608; worktree-jump-palette-status-inputs.ts:41-54);
  live status subscriptions isolated behind gated selectors (:571-576;
  worktree-palette-cache-inputs.ts:15-29 returns frozen empties when inactive).
- `PaletteLiveStatusProvider` owns the only agent/unread subscriptions so status-dot
  ticks never re-render the palette body (palette-live-status.tsx:45-123;
  WorktreeJumpPalette.tsx:2472-2475, 3131-3135).
- `deferredQuery = useDeferredValue(query)` (:638) keys every search (:921,:966,:997,:1050).
- Filter option list virtualized with @tanstack/react-virtual, fixed 32 px rows,
  selected pinned (cmd-j/PaletteFilterFieldOptions.tsx:117-123;
  palette-filter-option-list.ts:4,13,79-81). Filter predicate applied to worktrees
  (:774,:849) and project results (:1395-1405); stale filter selections pruned via
  `reconcilePaletteFilter` (:715-724).
- `appendPaletteListEntries` avoids `push(...)` argument limits (:382-390); query size
  guard 2 KiB before middle-band ranking (cmd-j/palette-results.ts:52-59, applied :207).

### 3.6 Activation flows

Dispatch hub `handleSelectItem` (:2191-2218):

| Type | Cite | Behavior summary |
|---|---|---|
| worktree | :2010-2034 | liveness recheck + toast, `activateAndRevealWorktree`, telemetry `cmd-j-workspace-open`, terminal-focus queueing |
| browser-page | :2036-2060 | activateBrowserPagePaletteResult + custom-event focus request (:1972-1982) |
| simulator-tab | :2062-2084 | activateSimulatorTabPaletteResult; failure toast |
| workspace-tab | :2086-2109 | activateWorkspaceTabPaletteResult; missing tab/worktree toasts |
| settings | :2111-2125 | getSettingsTargetFromSectionId (:505-514) + openSettingsTarget/Page; telemetry `cmd-j-settings-open` |
| quick-action | :2127-2159 | fresh context, `action.run(ctx)`; unavailable/plugin-failure toasts (:2146-2156) |
| project-target | :2161-2189 | revealSidebarRow smooth-scroll highlight, no workspace switch |

---

## 4. Keybinding System — Persistence, Menu, Settings UI

### 4.1 File persistence (desktop)

- Overrides live in `~/.fabrica/keybindings.json`
  (`getUserKeybindingsPath`, main/keybindings/keybinding-file.ts:25-27) with shape
  `{version:1, keybindings:{}, platforms:{darwin,linux,win32}}` (:33-43).
- Read path merges common overrides over all platforms then active-platform section on
  top: `{...commonOverrides, ...platformOverrides[platform]}` (keybinding-file.ts:273-282);
  conflicting custom bindings pruned iteratively with diagnostics
  (`removeConflictingOverrides`, :212-246). Atomic temp-file+rename writes (:68-84).
- Writes go only to the active-platform section (`writeKeybindingOverride`,
  keybinding-file.ts:426-469); reset deletes the platform mask so a hand-authored
  common binding survives (:459-464). Migrations seed legacy settings-store overrides
  (:302-319; fed from `store.getSettings().keybindings`, main/index.ts:2424-2426) and
  the tab-chord swap (:335-381).
- `KeybindingService` caches the snapshot (main/keybindings/keybinding-service.ts:29-91);
  IPC handlers `keybindings:get/ensureFile/setAction/reload/openFile/revealFile`
  broadcast `'keybindings:changed'` to all windows and rebuild the app menu
  (main/ipc/keybindings.ts:16-64, broadcast :7-14). Renderer syncs into a zustand
  slice via `window.api.keybindings.onChanged` (useIpcEvents.ts:1242-1248;
  store/slices/keybindings.ts:25-38; set/reset/disable map to `setAction` with
  array/null/[] — slices/keybindings.ts:66-94).
- Effective resolution prefers overrides over defaults and canonicalizes digit-index
  entries (`getEffectiveKeybindingsForAction`, keybindings.ts:1832-1872).

### 4.2 Web variant

Same document shape persisted in localStorage under `'FABRICA.web.keybindings.v1'`
(web-preload-api.ts:163); mirrored conflict pruning (:1071-1107), snapshot assembly
reporting `path: 'Browser local storage'` (:1122-1150), write path with identical
validation/conflict text (:1152-1204), cross-tab sync via `storage` events (:1212-1229).

### 4.3 App-menu relationship

Menu items show **display-only** shortcut hints — label text embeds
`formatKeybindingList(getEffectiveKeybindingsForAction(id,...))` and no Electron
accelerator is set (register-app-menu.ts:66-73 builder; palette item :299-304;
explicit no-accelerator comments :224-229; tests assert accelerator undefined,
register-app-menu.test.ts:106,:232,:556-557). Rationale: accelerators would intercept
keys in main before renderer overlay logic. Only real accelerators are Edit-menu roles
(Paste rerouted to `ui:appMenuPaste` :186-204; undo/redo `registerAccelerator:false`
off-Mac :170-178). Any keybinding change triggers `rebuildAppMenu()` so hints refresh
(ipc/keybindings.ts:13; register-app-menu.ts:358-362).

### 4.4 Main-process dispatch details

- Focus mirrors gate interception: markdown-editor focused (Cmd/Ctrl+B carve-out,
  createMainWindow.ts:494,:502), terminal-input focused (:511-512), floating-focus
  atomic payload (:520-521), **shortcut-recorder focused → main skips all
  interception** (:534-535, :810-813). Dead-renderer resets default-deny these flags
  (:569-583, :651-664, :1134-1139).
- Double-tap gestures detected from the raw keyDown/keyUp stream
  (`doubleTapDetector.process`, :845-878) and resolved in app context (:860-865).
- Dispatch (`dispatchResolvedWindowShortcutAction`, createMainWindow.ts:733-808):
  sidebar toggles yielded while floating input focused (:742-747); auto-repeat-prone
  actions (index jumps, dictation, menu toggles) contained in main via
  preventDefault-without-send (:749-755,:780-783,:794-797); FABRICA-first-in-terminal
  emits `ui:terminalShortcutCaptured {actionId}` alongside the action (:763-768,
  :785-789,:800-804) which the renderer surfaces as a capture notification
  (useIpcEvents.ts:1283-1293).
- Channel fan-out (createMainWindow.ts:672-731): one `ui:*` channel per action —
  e.g. `ui:openQuickOpen` (:702), `ui:toggleQuickCommandsMenu` (:705),
  `ui:jumpToWorktreeIndex <n>` (:722-724), `ui:jumpToTabIndex <n>` (:725-727),
  `ui:worktreeHistoryNavigate` (:728-729); forceReload fully handled in main
  (:685-688). Native-zoom fallback validates Electron's zoom command against live
  bindings (:925-947).

### 4.5 Renderer label helpers + settings pane

- `useShortcutLabel(actionId)` formats effective bindings via shared helpers
  (hooks/useShortcutLabel.ts:39-42; platform derived at :12); variant returning null
  instead of 'Unassigned' sentinel (:44-62); per-binding chip data via
  `useShortcutKeyComboDetails` (:64-80). `ShortcutKeyCombo.tsx` renders key-cap chips
  with Mac glyph vs "+" separator styles and double-tap titles (:18-60).
- **ShortcutsPane** (components/settings/ShortcutsPane.tsx, 431 lines): pulls
  overrides + snapshot from store (:62-63); plugin chords included even for errored
  plugins so conflicts stay editable (:70; store/plugin-panels.ts:182-194,216-223);
  catalog built by `buildShortcutDefinitionCatalog` merging plugin definitions and
  computing conflict warnings (:93-103; settings/shortcut-definition-catalog.ts:21-60);
  recording suspends main dispatch via `ui.setShortcutRecorderFocused` (:88-91);
  save normalizes, removes override when equal to defaults, pre-checks conflicts
  locally (:164-207), persists via IPC `keybindings:setAction` (:229-250;
  store/slices/keybindings.ts:66-94). Reset semantics preserve cross-platform common
  overrides by writing platform-effective bindings instead of deleting
  (:258-272; keybinding-override-edits.ts:30-37). Disable writes `[]` with one-click
  re-enable remembering prior bindings (:274-286, :79-81, :413-425).
- Plugin command chord ids: ``plugin:<pluginKey>.<commandId>`` built by
  `pluginCommandKeybindingActionId` (lib/plugin-command-keybindings.ts:13-17);
  synthetic definitions use declared defaults with global scope
  (:19-42); runtime firing matches inputs with a worktree-context gate
  (`findPluginCommandForKeybinding`, :56-75).

---

## 5. Fuzzy Search / Filtering Implementations

### 5.0 Library landscape

**All matchers are hand-rolled.** No fuzzysort/fuse.js/fzf anywhere: root dependencies
(package.json:129-154) contain none; grep across all package.json files returns zero
fuzzy-library hits. A uniform DoS guard caps every query at 2 KiB UTF-8 via
`isClipboardTextByteLengthOverLimit` (shared/clipboard-text.ts:70-75).

### 5.1 Worktree search — `lib/worktree-palette-search.ts` (303 lines)

- Types: `MatchRange {start,end}` half-open over original-case display string (:12);
  matched-field enum displayName|branch|repo|comment|pr|issue|port (:14-22).
- Scope: empty query → shallow copy of the sidebar's `emptyQueryWorktrees` (:43-44);
  non-empty query searches ALL unarchived worktrees as an explicit recovery path past
  sidebar filters (:47-50).
- Algorithm (searchWorktrees, :71-303): trim-only normalization (:83-88); leading `#`
  stripped for numeric alias matching against ports/PRs/issues (:89); composite
  `repo/branch` queries split on the first slash requiring both sides to substring-match
  (:98-116) with fall-through so slashed branch names still match single-token
  (:119-120); then a first-match-wins field cascade — displayName (:123-131), branch
  (:133-142), repo (:144-153), comment with snippet extraction (:155-174), ports via
  numericQuery (:176-205), PR/MR review via provider-aware sigils `#`=GitHub / `!`=GitLab
  (matchWorktreePaletteReview, lib/worktree-palette-review-match.ts:11-49; call site
  :207-230) with bare linkedPR fallback (:231-249), issue number then issue-title
  (:251-271, 288-299).
- **No scores, no sort inside the search**: results keep input order (:302); ranking is
  the UI layer's job via the relevance model (§5.6).

### 5.2 Tab/simulator/browser substring cascades

Shared shape: lowercase full-string `indexOf` (`findRange`) returning highlight ranges;
additive score = fieldWeight + matchIndex + positional indices − context bonuses;
first-hit-wins cascade; deterministic tie-breaks.

- Workspace tabs: entry builder carries precomputed title/secondary texts, terminal
  type aliases `['terminal tab','terminal']` (lib/workspace-tab-palette-search.ts:49,
  buildSearchableWorkspaceTabs :144-267 incl. agent metadata snippets :245 and
  worktree/group/tab sort indices :212-213); scorer weights title 0 / paths 20 /
  type alias 25 / agent snippet 30 / worktree 40 / repo 60 with
  `worktreeSortIndex*100 + groupSortIndex*10 + tabSortIndex` positional term and
  −40/−10 current-tab/current-worktree bonuses (workspace-tab-palette-results.ts:65-88,
  cascade :113-268, comparator :45-63,259-267).
- Simulator tabs: aliases 'mobile emulator tab', 'ios simulator', 'emulator'
  (simulator-palette-search.ts:45-50); weights title 0 / alias 20 / worktree 40 /
  repo 60 (:105-121, cascade :190-294); 2 KiB cap (:40,:190-192).
- Browser pages: title 0 / formatted URL 20 / raw URL 24 / workspace label 32 /
  worktree 40 / repo 60 (browser-palette-search.ts:97-113, cascade :115-277); URL
  formatting renders blank as "New Tab" (:51-64); pure flattener
  browser-palette-page-entries.ts:30-42.
- Type-alias selection picks earliest match start, not declaration order, keeping
  longest phrasing as label on ties (lib/palette-type-alias-match.ts:5-28).
- Repo picker: display-name substring beats path via +1000 path offset
  (lib/repo-search.ts:8,24-59).

### 5.3 True fuzzy scorers

- **Agent picker** (lib/agent-picker-search.ts, 238 lines) — richest scorer:
  tiered candidate scoring exact=base / prefix=base+10 / substring=base+100+i /
  acronym=base+220+x / greedy subsequence=base+400+x (scoreCandidate :94-123); field
  bases label 0 / id 600 / cmd 650, final=min across fields (:86-92); acronym builds
  camelCase/separator initials incl. hump detection (:125-160); subsequence adds gap
  penalties with −4 boundary bonus after space/hyphen/underscore (:162-197);
  whitespace-collapsing Unicode normalization (:199-237); synthetic "Blank Terminal"
  row matches 'terminal'/'shell' queries (:70-84); selection resolver :20-44.
  **[AGENT-OPS]** this powers AgentCombobox used in the workspace composer, session
  continuation, automation editor, and AI commit flows (§7.3).
- **Quick-open file search** (components/quick-open-search.ts): per-path precomputed
  lowerPath/lowerFilename (:19-30); greedy subsequence with gap cost (first match free,
  :75-108), −5 separator bonus after `/ . -` (:87-93), filename-substring bonus −100
  (:103-105) so filename hits always beat path hits; top-K kept in a bounded binary
  heap of size `QUICK_OPEN_RESULT_LIMIT=50` (:4, retainTopResult :114-131) before a
  final sort — O(N + K log K) not O(N log N); natural-order tie-breaks via memoized
  Intl.Collator(numeric:true) (shared/file-name-sort.ts:8-18); Windows backslash
  normalized for search only (:51-53).

### 5.4 Terminal quick-command search

lib/terminal-quick-command-search.ts: label base 0 / body base 400 / agent name base
200 for agent-type commands (:75-104); tiers exact / word-prefix(+100+wordIndex) /
substring(+200+index) — deliberately stricter than agent-picker (no subsequence);
empty query keeps input order (:33-35); 2 KiB cap (:15,28-30); picker-value resolver
honors preferred id when still filtered (:49-73).

### 5.5 Cmd+J query tokens & middle-band ranking

- cmd-j/palette-query-tokens.ts: surrogate-safe normalization (:22-37); Unicode-aware
  tokenization `\p{L}\p{N}` keeping CJK (:43-49); navigation-verb filler set excluded
  from coverage ('open', 'go', 'show', 'the' …, :53-78); token scoring exact=3 /
  prefix=2 / contains=1 with a >50% meaningful-token coverage gate returning 0
  otherwise (:80-116). No `is:`-style filter prefixes exist in the tokenizer.
- cmd-j/palette-results.ts middle band: rules exact verb keyword → exact config keyword
  → verb+config combos with settings-before-actions tie-break (:124-196, rank entry
  :198-226); project band analog in cmd-j/palette-project-results.ts:132-165.

### 5.6 Cross-section relevance scale — lib/cmd-j-match-relevance.ts

Single shared scale lets worktree and open-tab sections interleave despite
incomparable per-surface scores: tiers primary 0 / secondary 1 / ambient 2 (:13-20);
position ranks whole-match 0 / prefix 1 / word-start 2 / mid-word 3 with Unicode-aware
boundary regex (:22-34); relevance = min(tier*4 + positionRank) → 0..15 plus
NO_MATCH=MAX_SAFE_INTEGER (:11,36-45); consumers getWorktreeMatchRelevance :47-70 and
getOpenTabMatchRelevance :92-109 (type-alias hits count as matched, :84-88); used for
stable sorts preserving smart-sort ties (WorktreeJumpPalette.tsx:1093-1099,1140-1152)
and leadership decision (:1516-1529).

---

## 6. Custom Commands Support

### 6.1 Plugin commands (palette + keybindings)

- Wire shape: each plugin exposes `commands[]` with
  `{ id, title, context: 'global'|'worktree', handler: {type:'built-in'; action} | {type:'worker'}, keybindings }`
  (preload/api-types.ts:1010-1051, command fields :1025-1031); plugin lifecycle status
  running|restarting|idle|errored|invalid (api-types.ts:1005-1006).
- Renderer store (store/plugin-panels.ts, 224 lines): zustand list + fetch via IPC
  `'plugins:list'` (preload/index.ts:599) with fail-soft for older paired web clients
  (:53-64) and bounded retry (:28-47); live refresh on main pushes via
  `plugins:onChanged`/`'plugins:refresh'` (plugin-panels.ts:122-137;
  preload/index.ts:638). `collectActivePluginCommands` filters to
  running/restarting/idle and flattens with pluginKey/pluginName (:165-180);
  `usePluginCommands()` memoizes (:208-214).
- Palette entries: `buildPluginQuickActions` maps each active command to the same
  `CmdJQuickAction` shape as built-ins, id-namespaced `plugin:<pluginKey>/<id>` so
  collisions are impossible; availability gates worktree-scoped commands behind an
  active workspace with reason 'no-active-workspace'
  (cmd-j/plugin-quick-actions.ts:7-34; context gating shared with built-ins via
  quick-action-context.ts:92-126). Merged into the palette action list at
  WorktreeJumpPalette.tsx:1341-1348 (`pluginCommands = usePluginCommands()` :567) and
  availability-filtered per render (:1481-1497).
- Execution: `{type:'built-in'}` handlers re-run an existing keybinding action id
  through `dispatchAppCommand(action, source)` — source is
  `'plugin-keybinding' | 'plugin-palette'` — validated against `isKeybindingActionId`
  (lib/plugin-command-execution.ts:8-12; lib/app-command-dispatch.ts:3,:11-24);
  worker handlers invoke the plugin host over `window.api.plugins.invokeCommand`
  (plugin-command-execution.ts:14-17).
  **[AGENT-OPS]** this indirection is a ready-made seam: any new keybinding action id
  becomes palette-dispatchable through it automatically.

### 6.2 Terminal quick commands (shell + agent launches)

- Data model (shared/types.ts): scope `{type:'global'} | {type:'repo',repoId}`
  (:2713-2720); action union **`'terminal-command' | 'agent-prompt'`** (:2722);
  terminal variant carries `{command, appendEnter}` (:2730-2734); agent variant
  carries `{agent: TuiAgent, prompt}` (:2736-2740). Persisted under
  `GlobalSettings.terminalQuickCommands` (types.ts:2872).
- Shared logic (shared/terminal-quick-commands.ts, 272 lines): caps max 40 commands,
  label ≤80 chars, terminal text ≤4,000, agent prompt ≤6,000 (Windows argv safety)
  (:10-17); scope normalization/matching (:30-57); **agent support rule**
  `supportsTerminalAgentQuickCommand` requires a TUI agent whose
  `promptInjectionMode !== 'stdin-after-start'` (:71-75; mode map in
  shared/tui-agent-config.ts:49+ — claude/codex/gemini use 'argv'); unsupported agent
  rows are dropped during normalization (:112-115,:133-136); incomplete rows preserved
  while editing (:107-111); concurrency-safe mutation application for paired clients
  (:236-248) with strict round-trip validation (:218-232); PTY input building appends
  `\r` when appendEnter and flattens multi-line commands to one `; `-joined line so
  later lines cannot be consumed as stdin by foreground programs (:250-271).
- Persistence & CRUD: local host mutates GlobalSettings through
  `updateSettingsOrThrow` (store/slices/terminal-quick-command-hosts.ts:64-84);
  remote runtime hosts route over RPC `settings.updateTerminalQuickCommands` /
  `settings.getTerminalQuickCommands` serialized per-environment with
  connection-generation guards and capability gate (:86-145,:155-250,:186-190);
  RPC schema at main/runtime/rpc/methods/terminal-quick-command-rpc-schema.ts:59.
- CRUD UI: settings QuickCommandsPane add/edit/delete state machine with host selector
  and delete confirmation (settings/QuickCommandsPane.tsx:34-47,:98-124), opened with
  an "add intent" signal (:49-54,:127); dialog drafts in
  components/terminal-quick-commands/* with the agent dropdown pinning
  claude/codex/gemini/copilot/opencode/pi/omp/cursor/droid/command-code/openclaude to
  the top of options (terminal-quick-command-agent-options.ts:6-45).
  Other entry surfaces: terminal context menu
  (use-terminal-pane-context-menu.ts:462-478), tab-bar quick-command menu with inline
  search (tab-bar/use-tab-bar-quick-command-search-input.ts:15-83), hosted flattening
  across local+remote hosts (tab-bar/hosted-terminal-quick-command-search.ts:4-13),
  menu toggle custom event (lib/quick-commands-menu-events.ts:1), unbound keybinding
  `tab.openQuickCommandsMenu` (keybindings.ts:700-709).
- Execution paths:
  - Focused pane: `sendTerminalQuickCommandToPane` **refuses agent commands**
    (components/terminal-pane/terminal-quick-command-dispatch.ts:31-33) and otherwise
    writes `buildTerminalQuickCommandInput` through `transport.sendInput` (PTY data
    path; channel `pty:writeAccepted`, preload/index.ts:989).
  - New tab: lib/run-quick-command-in-new-tab.ts — **agent commands call
    `launchAgentInNewTab({agent, prompt, worktreeId, groupId,
    launchSource:'quick_command', quickCommandLabel})`** after validating non-empty
    prompt + supported injection mode (:55-77); shell commands create the tab then
    queue a startup command written once the shell is ready (:80-97, doc :36-47)
    plus per-group recent-command bookkeeping (:68-72,:116-119).

### 6.3 The palette's own "Add Quick Command" action

Built-in quick action `add-quick-command` (title "Add Quick Command", always
available; cmd-j/quick-actions.ts:163-181) runs `ctx.openAddQuickCommand()`
(quick-action-context.ts:21-35,128-170) which opens Settings → Quick Commands pane
with add intent (WorktreeJumpPalette.tsx:1451-1454 wired at :1466; consumed by
QuickCommandsPane.tsx:29-54).

---

## 7. Agent Integration Points [AGENT-OPS]

### 7.1 Agent catalog & launch engine

- Hardcoded renderer catalog of ~30 TUI CLI agents with labels/binaries/icons:
  claude (lib/agent-catalog.tsx:47-52), claude-agent-teams (:53-58), openclaude
  (:60-67), codex (:68-73), grok (:74-80), copilot (:81-86), opencode (:87-92),
  gemini (:138-143), aider (:151-156), cursor, droid, kimi, qwen-code, devin, etc.
  Canonical config in shared/tui-agent-config.ts (`TUI_AGENT_CONFIG` incl.
  `promptInjectionMode`; guard `isTuiAgent` :333); per-user overrides
  `agentCmdOverrides/agentDefaultArgs/agentDefaultEnv` folded in at launch
  (launch-agent-in-new-tab.ts:104-109).
- Launch engine builds an `AgentStartupPlan` honoring injection modes — argv/flag
  agents fold the prompt into the launch command; stdin-after-start agents get a
  post-ready draft paste (lib/launch-agent-in-new-tab.ts:135-140 plan builder; doc
  :62-71); platform/shell/env resolution :89-134; telemetry
  `{agent_kind, launch_source ?? 'tab_bar_quick_launch', request_kind:'new'}`
  (:188-206); web-runtime paired tabs handled (:147-174).

### 7.2 Where agents are picked today

`AgentCombobox` (components/agent/AgentCombobox.tsx) filters via
`searchAgentPickerEntries` (:179) and resolves via `getAgentPickerCommandValue`
(:184), supporting default-agent starring and a blank-terminal option (:33-56).
Consumers: session continuation/resume dialog
(agent-session-continuation/AgentSessionContinuationDialog.tsx:200), automation
editor footer (automations/AutomationEditorDialogFooter.tsx:227), workspace composer
(NewWorkspaceComposerCard.tsx:898 — itself reachable from the palette's Create
Worktree action, WorktreeJumpPalette.tsx:1435-1440), AI commit/source-control dialogs
(right-sidebar/SourceControlAgentActionDialogForm.tsx:158), and native-chat session
options that open the picker mid-session (native-chat/native-chat-pty-session-options.ts:194-196;
NativeChatSessionOptionPickers.tsx:134).

### 7.3 Existing seams for exposing agent actions as palette commands

1. **Plugin built-in handler → dispatchAppCommand**: define agent ops as keybinding
   actions and they inherit keybindings + palette dispatch with zero new UI plumbing
   (plugin-command-execution.ts:8-12; app-command-dispatch.ts:20-24).
2. **CmdJQuickAction shape reuse**: buildPluginQuickActions demonstrates minting
   dynamic palette entries with availability rules; an "agents" provider would merge
   identically at WorktreeJumpPalette.tsx:1341-1348 (plugin-quick-actions.ts:7-34).
3. **Agent quick commands already exist end-to-end** (saved agent+prompt → launched
   tab): types.ts:2736-2740 + run-quick-command-in-new-tab.ts:55-77 +
   launch-agent-in-new-tab.ts — but they have **no presence in the Cmd+J palette**
   today (verified: WorktreeJumpPalette imports neither
   searchTerminalQuickCommands nor the agent catalog).
4. **Telemetry is palette-ready**: `launchSourceSchema` already contains
   `'command_palette'` (:183) and `'workspace_jump_palette'` (:189), consumed by
   `agentStartedSchema.launch_source` / `agentPromptSentSchema`
   (telemetry-events.ts:350-365) — palette-launched agents need no schema change.
   `'command_palette'` is also the first `WORKSPACE_SOURCE_VALUES` entry
   (shared/workspace-source.ts:2), validated strictly on `workspace_created`.
5. **Main-process agent-control IPC surface** (candidates for palette actions):
   ai-vault session channels `aiVault:listSessions/prepareSessionResume/deleteSession/
   getFirstUserPrompt` + subagent listing (main/ipc/ai-vault*.ts:275,18,24,313);
   live status/interrupt/question channels `agentStatus:getSnapshot/inferInterrupt/
   inferQuestionAnswered` + per-agent hook install status (main/ipc/agent-hooks.ts:112-315);
   account channels `claudeAccounts:*` / `codexAccounts:*` (main/ipc/claude-accounts.ts:6-17;
   codex-accounts.ts:12-47); PTY control backing all launches `pty:spawn /
   pty:writeAccepted / pty:kill / pty:listSessions / pty:management:*`
   (preload/index.ts:983,:989,:1072,:1074,:1277-1281); automations CRUD pairing
   agents with prompts (main/ipc/automations.ts:27-88); skills IPC (main/ipc/skills.ts).
6. **Slash commands exist only in native chat**, not the palette:
   `/model <id>`, `/effort low`, and an agent-picker-opening command parsed from
   outgoing messages (shared/native-chat-session-option-commands.ts:18-45, caveat :88-97;
   dispatch native-chat-pty-session-options.ts:183-197); telemetry classifies leading
   `/` as prefix kind 'slash' (lib/native-chat-telemetry.ts:68). The rich-markdown
   slash menu is editor-formatting-only (components/editor/rich-markdown-slash-commands).

---

## 8. Telemetry & Onboarding Around the Palette

- Feature tip: id `'cmd-j-palette'`, action `'learn-cmd-j-palette'`, passive
  acknowledgement (shared/feature-tips.ts:42-54,77-87); interaction-catalog entry
  `{id:'cmd-j', interaction:'Cmd+J palette opened'}`
  (shared/feature-interaction-catalog.ts:74); tip dialog renders the live binding as
  a key-cap chip with rebind link (components/feature-tips/CmdJPaletteTipDialog.tsx:36-104).
- Dedicated events exist only for the tip:
  `cmd_j_palette_feature_tip_shown/acknowledged` strict schemas
  (telemetry-events.ts:563-574; registered :1472-1473; name union :1576-1577).
  **There is no generic "palette opened / item executed" analytics event** — usage is
  attributable only indirectly through launch/workspace sources (§7.3 item 4) and
  per-item events like `cmd-j-workspace-open` / `cmd-j-settings-open`
  (WorktreeJumpPalette.tsx:2010-2034,2111-2125).

---

## 9. Synthesis — Relevance to CLI-Agent-Management Transformation

The command surface is precisely "how operators drive agents," so this subsystem is
high-leverage for the post-rebrand direction:

| # | Finding | Transformation relevance |
|---|---|---|
| 1 | Palette action layer is tiny (6 built-ins + plugin entries; quick-actions.ts:59-182) and extensible via the exact `CmdJQuickAction` shape | Adding an "Agents" section (launch agent, resume session, send prompt, switch account) is additive, not architectural |
| 2 | Agent quick commands (agent+prompt saved launches) exist with full validation, persistence, RPC sync, and telemetry, but are invisible in the palette | Cheapest high-value win: surface them as palette results; all plumbing verified present (§6.2) |
| 3 | Per-agent keybinding slots auto-generated for every catalogued agent (keybindings.ts:1105-1127), unbound by default | An agent-management platform inherits a rebindable hotkey per agent for free |
| 4 | Plugin `built-in` handler indirection (`dispatchAppCommand`) makes any new KeybindingActionId palette-dispatchable (plugin-command-execution.ts:8-12) | Define agent ops as first-class actions once → palette + keybindings + plugins all dispatch them |
| 5 | Telemetry launch sources already include 'command_palette'/'workspace_jump_palette' (telemetry-events.ts:183,:189) | Operator-behavior analytics for agent launching need no schema migration |
| 6 | Availability model distinguishes global vs worktree-scoped commands with reason codes (plugin-quick-actions.ts:25-28; quick-action-context.ts:92-126) | Maps directly onto agent ops that require an active workspace/session vs app-level ops |
| 7 | Gaps identified: no generic palette-open/execute analytics event (§8); no quick-command or agent-catalog presence in the palette (§7.3.3); slash-command control confined to native chat (§7.3.6); main-process agent-control channels (ai-vault, agentStatus interrupt/question, accounts) have no palette exposure (§7.3.5) | These are the concrete insertion points for Round 5 synthesis and cross-project task feeds |

---

## 10. Scan-Coverage Statement

**Scope**: read-only scan of `../Fabrica-app` (node_modules/.next/dist/out excluded).
No file outside `.Fabrica-atlas-board/` was modified.

**Read in full** (source files):
- `renderer/src/components/WorktreeJumpPalette.tsx` (all 3,153 lines)
- All 17 non-test files in `renderer/src/components/cmd-j/` (PaletteFilterMenu,
  PaletteFilterFieldOptions, PaletteFilterChips, palette-section-render-cap,
  palette-results, palette-query-tokens, palette-project-results, palette-live-status,
  palette-host-badge, palette-focus-restore-target, palette-filter, palette-filter-options,
  palette-filter-option-list, plugin-quick-actions, quick-action-context, quick-actions,
  worktree-palette-cache-inputs) + `worktree-checks-review-index.ts`
- `components/ui/command.tsx`, `worktree-jump-palette-status-inputs.ts`,
  `lib/cmd-j-match-relevance.ts`, `lib/cmd-j-row-index-jump.ts`, `lazy-modal-mount-state.ts`
- Search libs: worktree-palette-search.ts, worktree-palette-review-match.ts,
  worktree-palette-query-bounds.ts, workspace-tab-palette-search.ts,
  workspace-tab-palette-results.ts, simulator-palette-search.ts,
  browser-palette-search.ts, browser-palette-page-entries.ts, palette-type-alias-match.ts,
  agent-picker-search.ts, terminal-quick-command-search.ts, repo-search.ts,
  locale-text-collators.ts, quick-open-search.ts
- Keybinding system: shared/keybindings.ts (2,399 lines), shared/window-shortcut-policy.ts
  (350), main/keybindings/keybinding-file.ts, keybinding-service.ts, main/ipc/keybindings.ts,
  main/menu/register-app-menu.ts, hooks/useShortcutLabel.ts, ShortcutKeyCombo.tsx,
  settings/ShortcutsPane.tsx, settings/keybinding-override-edits.ts,
  store/slices/keybindings.ts, lib/plugin-command-keybindings.ts
- Custom commands: store/plugin-panels.ts, lib/plugin-command-execution.ts,
  lib/app-command-dispatch.rs-equivalent app-command-dispatch.ts,
  shared/terminal-quick-commands.ts, store/slices/terminal-quick-command-hosts.ts,
  hooks/use-terminal-quick-command-hosts.ts, lib/run-quick-command-in-new-tab.ts,
  lib/launch-agent-in-new-tab.ts, terminal-pane/terminal-quick-command-dispatch.ts,
  settings/quick-commands-search.ts, terminal-quick-command-agent-options.ts,
  tab-bar/hosted-terminal-quick-command-search.ts, lib/quick-commands-menu-events.ts,
  shared/workspace-source.ts, shared/feature-tips.ts, feature-tips/CmdJPaletteTipDialog.tsx
- Supporting: shared/text-search.ts (confirmed NOT a fuzzy util — ripgrep/git-grep arg
  builder), shared/clipboard-text.ts bounds mechanism, shared/file-name-sort.ts,
  lib/agent-catalog.tsx, package.json dependencies block

**Read partially (targeted ranges)**: main/window/createMainWindow.ts (~490-1167 of
~1,900+), renderer/hooks/useIpcEvents.ts (shortcut-relevant ~1,140-1,500 of 3,866),
web/web-preload-api.ts (keybinding + stub sections), preload/index.ts +
preload/api-types.ts (channel/type excerpts), shared/types.ts (2,700-2,899),
shared/telemetry-events.ts (targeted ranges), shared/tui-agent-config.ts (sampled via
grep), native-chat session-option modules (targeted), WorktreeJumpPalette consumer
wiring regions in App.tsx / SidebarNav.tsx / NewWorkspaceComposerCard.tsx /
AgentCombobox.tsx, QuickCommandsPane.tsx (first ~160 lines).

**Skipped**: all `*.test.ts(x)` files (titles/greps only), mobile/* implementations
(out of scope: desktop Electron), full bodies of TerminalQuickCommandDialog.tsx /
QuickCommandsList internals / ShortcutRecorderButton / ShortcutRowsList /
KeybindingsFileActions / ShortcutTerminalPolicyControl / shortcut-groups /
shortcuts-search / shortcut-recording-state, main-process plugin host internals
(main/plugins/* body), ai-vault.ts / automations.ts / session.ts bodies beyond channel
names, dashboard-popout-window.ts before-input-event handling, i18n locale JSON bodies.
Root `visual-palette-reference.md` inspected and classified out-of-scope (color theme).

Coverage judgment: every production file participating in the palette/search/keybinding/
custom-command pipeline was either fully read or read at the specific ranges cited;
the skipped set contains no undiscovered palette-plumbing code paths (cross-checked by
glob sweeps over *palette*, *fuzzy*, *search*, *match*, *relevance* filename patterns
and grep sweeps for `palette|quickInput|QuickInput|command-palette|CommandPalette`).

_Report end._





