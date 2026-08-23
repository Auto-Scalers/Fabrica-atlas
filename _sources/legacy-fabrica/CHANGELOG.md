# Changelog

All notable changes to Fabrica are documented here. Format: newest first.

## 2026-08-06 09:40 — Sub-System Filtered Editor, Collapsible Section Panels with Metrics & System Prompts Audit
- **Sub-System Filtered Editor Dropdown:** Updated the code editor files/folders dropdown to dynamically scope items to the currently active sub-system folder (e.g. `workspace/Data Analysis & Pattern Extraction/`).
- **Clean Editor Top Bar:** Removed the "⚡ Live Sync" text label from the editor top bar for a cleaner developer surface.
- **Section Minimizing Controls & Metrics:** Added interactive minimizing icons to:
  - Missions HQ top bar (collapses section into a top bar displaying live metrics: total missions count, stage breakdown across Drafting/Planning/Execution/Delivery, and high priority count).
  - Workspace Subsystem top bar (collapses section into a right sidebar displaying live metrics: total subsystems count, document count).
  - Preview & Editor top bar (collapses both sections into a bottom bar displaying live status indicators: Preview status, active file path).
- **System Prompts & Kernel Audit:** Audited all 7 system prompts (`01_identity.md` through `07_app_guide.md`), `README.md`, and skills against the current Node.js / Express 4 / Next.js 16 modular architecture. Synchronized layout specs, data structures, and pipeline definitions.

## 2026-07-10 01:37 — Seed EXECUTE-phase pillars + evolution_objectives (AUTO-MODE #13)
- Inbox INGEST+SEED confirmed DRAINED & correctly reconciled: 3 raw dirs on disk
  (best uses=9f, capabilities=687f, complex systems=758f — no raw shrinkage), 0 phantoms,
  0 needs_semantics:true; gateway = 1451 files minus root .gitkeep = 1450 == YAML gateway:
  block == metric gateway_items:1450 (pillars=3, FGs=50). Corrected a prior sibling
  1451 over-count (raw-dir count, not gateway count).
- Seed EXECUTE phase: `os-runtime.yaml -> pillars.suggestions` = 3 (agent_operating_conventions,
  capability_and_skill_library, engineering_methodologies) and `evolution_objectives.suggestions`
  = 4 (adopt_prp_workflow, adopt_gsd_process, adopt_instinct_lifecycle, adopt_hookify_conversation_hooks),
  all status:false (user validates). Drawn directly from the 3 drained gateway pillars.
- Toolboxes: 48/48 `role` fields filled (0 empty); 5 domain keys intact.
- Discrepancies reported, not force-fixed (daemon-owned): os-runtime.fill_queue.inbox=3 vs 0;
  review_queue GAP-3 open (needs user project details).

## 2026-07-09 11:50 — Fix: inspector newline rendering in All-Fields view
- Bug caught by verification: list-of-scalars in the runtime inspector was joined with
  an escaped `\\n` (literal backslash-n text) instead of a real newline, so multi-item
  lists (e.g. the 48 `fill_queue.toolboxes` gaps) rendered as one wrapped line. Switched
  to `obj.join(String.fromCharCode(10))` so each item is a true line (confirmed: 48 lines
  in the live DOM). Bumped asset cache-bust to `?v=8`.
- Note: a `replace_all` during the fix transiently clobbered the `count` and `scalar`
  branches; restored both to `[${len} items]` and `String(obj)` respectively.

## 2026-07-09 11:45 — Dashboard refinements (per user feedback)
- **Layout confirmed:** right = runtime + board switcher; borders draggable on BOTH
  sides (persist across restart); center = missions. (These were already in place;
  re-confirmed against the request.)
- **Ecosystem bar:** now shows 9 inline metric chips before the popover — Missions,
  Toolboxes, Pillars, Evolution, Review Q, Backlog, Inbox, Gateway, Prompts — so the
  workspace state is visible at a glance; click opens the full popover.
- **Ecosystem popover:** Totals grid (10 tiles) + per-entity breakdown (Missions /
  Toolboxes active/total / Pillars / Evolution / Review Q / Backlog / Inbox / Gateway /
  Prompts) — shows everything.
- **All-fields inspector:** new runtime panel section ("All Fields (raw read-only)")
  recursively renders EVERY key from the runtime YAML — freshness, metrics, review_queue,
  backlog, pillars, evolution_objectives, fill_queue (incl. the 48 toolbox gaps as a
  joined list), recent_events. Nothing is hidden. Interactive chips (pillars/evolution
  add-remove) kept alongside.
- **Left Sources & Flow graph:** one 2D cytoscape view linking Inbox → Gateway →
  OS Prompts/Data, with actual items nested under each hub, so relations are visual.
- **Center mission graph:** missions clustered by tag hub + amber `depends_on` edges
  (reads `depends_on` from each mission's raw block) for cross-mission relations.
- Verified live: dashboard renders, no JS errors, inspector surfaces 43 field rows,
  eco bar/popover + graphs all populated.

## 2026-07-09 11:00 — Dashboard rebuild (blueprint UX, no raw YAML)
- Full front-end rebuild per the user's UX spec, themed from the brand slide deck.
- **Backend (`.infra/backend/daemon.py`):** added `prompts` to the `/api/entity/{name}`
  payload (left panel now shows OS Prompts / project Data); added a generic guarded
  `POST /api/entity/{name}/patch` (deep-set one key path; refuses `metrics`/`fill_queue`
  and whole-file overwrite so UI edits never fight the 5s sync); added
  `GET /api/ecosystem` (aggregate workspace metrics for the ecosystem bar/popover).
- **Layout:** 3 columns — LEFT merged Sources & Flow (os_prompts/data + inbox +
  gateway with a live inbox→gateway→data relationship graph); CENTER missions
  (Planning/Execution/All, filter, priority sort) with a mission-relationship graph
  below; RIGHT = Runtime alone with a RUNTIME/BOARD switcher tab. Draggable column
  borders persist across restart (localStorage).
- **Runtime panel is pure UI (no raw YAML):** review_queue/backlog counts, pillars &
  evolution_objectives as add/remove chips with validated/suggestion counts, fill_queue
  collapsed (engine-managed, read-only), recent_events list, board as a markdown editor.
- **Toolboxes:** bottom bar opens a full popup showing every domain + toolbox with
  on/off switches (write-back via `/toolboxes`).
- **Ecosystem bar:** richer KPIs + a clean click-to-open popover (per-entity breakdown).
- **Style:** blueprint/draftsman theme — cream `#f5f2eb`, charcoal `#1a1a1a`, amber
  `#f2a93b`, teal `#1a8c7b`, neo-brutalist thick borders, drafting-grid background,
  monospace technical labels, + a dark variant (theme toggle). Source palette extracted
  from the brand slides via NotebookLM.
- Verified: dashboard serves, no JS errors, pillar add/remove write-back persists the
  daemon sync; ecosystem + toolboxes + board all functional.

## 2026-07-09 10:30 — Metrics: Option 4, flat direct counts, no sidecar
- Removed B1 move-based auto-tracking and the `_os/.os-seen-cache.yaml` sidecar entirely.
- `compute_metrics` now emits a pure snapshot (Option 4): `metrics.review_queue:` and
  `metrics.backlog:` are **direct integers** = the live length of the queue list. No
  `total`/`resolved`/`open`/`done`/`pending` breakdown, no persistent counter, so a
  counter can never go stale again. The queue LISTS remain the source of truth.
- Schema `runtime-schema.yaml` updated to match (`review_queue: integer`, `backlog: integer`).
- Daemon restarted on `:8000` with the new code; sidecar confirmed gone and stays gone.


- **Hybrid `os_prompts/data` key:** audited the whole workspace. Code already uses
  the correct split — `detect_fill_gaps` writes `os_prompts` for the OS entity and
  `data` for projects (never the hybrid). The only `os_prompts/data` strings left
  are in CHANGELOG.md as *documentation* of what must not be written — correct.
- **Stuck B1 counter:** OS runtime showed `review_queue.resolved: 1` while GAP-3
  was still present in `review_queue` — a ghost from an earlier remove/restore test
  (B1 only ever increments, never un-counts). Reset `_os/.os-seen-cache.yaml` so the
  seen-set matches current reality; daemon's next sync recomputed to
  `resolved: 0, open: 1` (correct). No other stuck counters found across runtimes.
- **Empty `project_name` stub:** runtime is a 0-byte leftover (not in config/index).
  Daemon doesn't sync it (correct). Left alone (legacy test artifact).


- Added a CHANGELOG pointer link near the top of `README.md` (after the hero
  image, before "The problem"): `📝 Changelog: see CHANGELOG.md ...`.

## 2026-07-09 10:15 — recent_events: flat strings (not split time/event)
- `daemon.py` normaliser now writes `recent_events` as flat strings
  `'DD-MM-YYYY HH:MM "event"'` (newest-first, cap 10), matching the existing
  `os_prompts` docs convention `[DATE] TYPE: desc`. Legacy `{time, event}` dicts
  are migrated to this string form on next sync (ISO timestamp -> `DD-MM-YYYY HH:MM`).
- `runtime-schema.yaml`: `recent_events` example updated to the string format.
- CHANGELOG corrected (the earlier "now `{time, event}` dicts" line was wrong).

## 2026-07-09 10:05 — Schema cleanup (vars removal follow-up)
- Removed stale `vars` from `runtime-schema.yaml` (both the `metrics.fill_queue.vars`
  entry and the `fill_queue.vars` list). Aligns schema with daemon (vars was already
  removed from code + runtime). Now schema, daemon, and runtime all agree: no `vars`.
- Confirmed `pillars` / `evolution_objectives` (the data blocks, not the metrics
  rollup) conform to the schema: `{actives: [string], validated: {total, active,
  <name>: {...}}, suggestions: {total, <name>: {...}}}`. Metrics rollup reads them
  correctly (actives=len, validated/suggestions=total). No change needed there.

## 2026-07-09 10:00 — Daemon hardening + runtime restructure

### Daemon (`.infra/backend/daemon.py`)
- **Port-guard (single-instance):** daemon probes `127.0.0.1:8000` at startup;
  if taken, prints `ABORT ... Exiting to avoid conflict.` and exits (`SystemExit(1)`).
  Prevents ghost daemons fighting over the same YAML files. Verified: a 2nd launch
  self-aborts.
- **Atomic writes:** `write_yaml` now uses a `ruamel.yaml.YAML()` instance (no
  PyYAML `allow_unicode` kwarg) + temp-file + `os.replace`. Stops torn reads.
- **`reconcile_toolboxes` bug fix:** declared `flagged = []` (was undefined → every
  sync crashed). Self-heals by dropping any non-domain key.
- **Runtime restructure:** `sync_entity` writes canonical key order
  `freshness → metrics → review_queue → backlog → pillars → evolution_objectives →
  fill_queue → recent_events`.
- **Metrics (B1, move-based):** `review_queue.resolved` / `backlog.done` auto-bump
  when items leave those lists (external removals caught; counters survive restarts).
  Seen-set + counters persisted in hidden sidecar `.<prefix>-seen-cache.yaml` (NOT
  inside the runtime YAML, keeping `metrics` clean).
- **`detect_fill_gaps`:** per-entity data key — OS uses `os_prompts`, projects use
  `data`. Hybrid `os_prompts/data` never written. Added `gateway` category.
- **`scaffold_all_gaps`:** no longer scaffolds `toolboxes` (reconciled from disk);
  iterates `os_prompts`/`data` (not the removed hybrid key).
- **`vars` removed** from `fill_queue` — dead placeholder (always `[]`, never
  populated). KISS cleanup.

### Runtime (`_os/os-runtime.yaml`)
- New `metrics` block below `freshness` (review_queue, backlog, pillars
  [actives/validated/suggestions], evolution_objectives [same], fill_queue).
- `recent_events` are now flat strings `'DD-MM-YYYY HH:MM "event"'`, newest-first, capped at 10.
  (Legacy `{time, event}` dicts are migrated to this form on next sync.)
- `fill_queue` uses `os_prompts` key (no hybrid); `vars` removed.

### Docs (surgical, no behavior change)
- `README.md`: `python` daemon start → `py -3` (was contradicting Law 11).
- `02_laws-Hard_Laws.md` + `AGENTS.md`: Law 4 now lists new flag types (empty
  pillars/evolution, toolbox metadata gaps).
- `06_toolboxes-Toolboxes.md`: daemon auto-builds registry from disk.
- `07_inbox-Inbox_and_Gateway.md`: daemon scaffolds missing gateway folders.

### Schema (`.infra/schemas/runtime-schema.yaml`)
- Updated to new key order, `metrics` block, timestamped `recent_events`,
  `os_prompts`/`data` keys (comment: never the hybrid `os_prompts/data`).

## 2026-07-09 (earlier) — Initial sync engine
- Daemon scaffolds every fill_queue category, detects empty pillars/evolution,
  trims recent_events to 10, auto-applies backlog GAP-1, reconciles toolboxes from
  disk, applies Law 11 daemon-state reconciliation.
