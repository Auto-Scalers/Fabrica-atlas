# R5-1.3 — Fabrica-app Search/Indexing Internals (Beyond the Palette UI)

**Task:** R5-1.3 (Group 1 deep dive) - task `task_6050465ea7d0` - dispatch `ctx_4a90e48955d4`
**Scope guard:** R4-1.16 (`fa-command-palette-search.md`) owns command-palette UX, command registry, keybindings, and palette matchers. This report covers ONLY the indexing/search MACHINERY underneath: what is indexed, where results come from, storage, reindex triggers, watcher coupling, query execution, memory/perf bounds. Palette UI is cited only where it is the direct consumer of this machinery.
**Target:** `Fabrica-app/src` (READ-ONLY; node_modules/.next/dist/out excluded). Paths below are relative to `Fabrica-app/`.
**Date:** 2026-08-23

---

## 0. Executive Summary

1. **There is no persistent code/content search index anywhere in Fabrica-app.** Every text search and every file listing is executed statelessly per query by spawning an external process: `rg` (ripgrep) primarily, `git grep` / `git ls-files` as fallbacks, and a budgeted Node `readdir` walk as the last resort (`src/main/ipc/filesystem.ts:970-1109`, `src/main/ipc/filesystem-list-files.ts:27-63`).
2. **The only true "indexes" in the app are agent-session metadata indexes**: a persisted AI Vault parse cache (JSON under userData), a Codex `session_index.jsonl` title-map cache (reading Codex's own external index), Codex backfill/heal ledgers with version markers, and a 60s-TTL in-memory session-list cache (`src/main/ai-vault/*`, `src/main/codex/codex-session-index-heal-state.ts:12-15`). These are the natural substrate for semantic agent-output search.
3. **Incrementality exists only in session parsing** (mtime-sorted candidates + parse-cache reuse), not in code search. Code search has no invalidation problem because nothing is cached.
4. **File watchers are fully decoupled from search.** `@parcel/watcher` subscriptions broadcast change events to renderer windows for file-tree/UI refresh; no search structure is invalidated or maintained by watcher events (`src/main/ipc/filesystem-watcher.ts:1,48`; event payloads at `:292,:335,:926,:1083,:1320,:1444,:1531`).
5. **No embeddings, vectors, or LLM-assisted search exist** — grep across all of `src/` for `embedding|vector|semantic search` returns zero relevant hits (only unrelated words like "semantics" in comments); see section 8.
6. Extension assessment (section 10): adding buzz-style FTS over agent transcripts is straightforward because the AI Vault scanner already produces parsed, deduped session records with a persistence seam; the code-search plane needs no index at all.

---

## 1. What Content Is "Indexed" (i.e., searchable material)

### 1.1 File contents (text search)
Searched live on disk per query via `rg --json`:
- Query options: case sensitivity, whole-word, regex vs fixed-strings, include/exclude glob patterns (`src/shared/text-search.ts:188-220`, `buildRgArgs`).
- rg baseline flags: `--json --hidden --glob !.git --max-count 100 --max-filesize 5M` (`src/shared/text-search.ts:189-198`; constants `MAX_MATCHES_PER_FILE=100` at `:55`, `SEARCH_MAX_FILE_SIZE = 5*1024*1024` at `:64`).
- Files larger than 5 MB are skipped entirely ("keep search cheaper than opening a file", `src/shared/text-search.ts:63-64`).

### 1.2 File paths (Quick Open / file switcher)
Full-tree path listings fetched on demand:
- Primary pass: `rg --files` with hidden-dir exclude globs; second pass lists ignored files only if the primary pass did not fill the result budget (`src/shared/quick-open-filter.ts:220-250`, `buildRgArgsForQuickOpen` returns `{primary, ignoredPass}`).
- Two-pass consumption order: source files claim the bounded autocomplete budget first; ignored files fill the remainder (`src/main/ipc/filesystem-list-files.ts:260-273`).

### 1.3 Agent-session metadata (AI Vault)
Parsed per scan from many stores: Claude JSONL, Codex rollouts, Gemini, Copilot, Cursor, Devin, Droid, Grok, Kimi, Hermes, OpenCode SQLite, Antigravity history (`src/main/ai-vault/session-scanner.ts:48-56` docstring; parser family `session-scanner-*-parser.ts`). Extracted fields are session id, title, sort time, preview text, cwd, execution host — NOT full transcript content (preview windows truncated: `session-scanner-preview-window-truncation.test.ts`).

### 1.4 Symbol indexes
None. There is no symbol/class/function index, no LSP-style document-symbol store, no tree-sitter/AST indexing anywhere in `src/`. The only symbol-adjacent machinery is renderer-side fuzzy scoring over strings already in memory (`src/renderer/src/lib/agent-picker-search.ts:117-119`), which belongs to palette UX (R4-1.16) but is listed here to close the question.

### 1.5 Open-editor state
In-memory only: `OpenFileIndexes` maps of open editor tabs keyed by worktree/id inside the renderer sync graph (`src/renderer/src/runtime/sync-runtime-graph.ts:56,90,1555-1581`). Never persisted, never searched.

---

## 2. Index Storage Format and Location

### 2.1 Code/content search: NO storage
Nothing is written to disk. Each `fs:search` invocation creates a fresh accumulator (`createAccumulator()` at `src/shared/text-search.ts:25-27`) holding a `Map<absPath, SearchFileResult>` in main-process memory for the lifetime of one query.

### 2.2 AI Vault parse cache (the one persistent index-like store)
- One JSON file under userData, written atomically (temp+rename), seeded before any parse so cold scans reuse prior work (`src/main/ai-vault/session-parse-cache-persistence.ts:1-5`, motivation: issue #9210 "6.7 GB / 109 s cold scans").
- `SCHEMA_VERSION = 1`; a mismatched file is discarded whole (`:15-16`).
- Debounced save 1500 ms so desktop IPC + runtime RPC scans collapse into one write (`:17-18`).
- Written user-only: mode 0o700 dir / 0o600 file, noted as inert on Windows where the userData ACL is the boundary (`:19-22`).
- Disabled until the composition root calls `initSessionParseCachePersistence`; every failure degrades to cold-scan behavior (`:34-37`).

### 2.3 External indexes read (not owned) by Fabrica
- Codex's own `<CODEX_HOME>/session_index.jsonl`: lazily-named threads looked up by session id into a title map (`src/main/ai-vault/session-scanner-codex-title-index.ts:7-13`).
- OpenCode 1.17.x SQLite store read through a forked worker process (`src/main/ai-vault/session-scanner-opencode-sqlite.ts`; worker client/spawn/protocol files same directory).

### 2.4 Generic SQLite adapter (not a search index)
`src/main/sqlite/sync-database.ts` is a thin `node:sqlite` wrapper with an LRU-ish statement cache capped at 256 statements (`:18-19`) and DDL-driven cache invalidation (`:59-65`). It backs app state, not search. No FTS tables exist anywhere in the app's own databases.

---

## 3. Query Execution Path

### 3.1 Text search IPC (`fs:search`)
Handler chain at `src/main/ipc/filesystem.ts:970-1109`:
1. SSH connection present -> forwarded whole to the SSH filesystem provider (`:973-976`).
2. Root authorized via `resolveAuthorizedPath` and mapped to registered-worktree git options incl. WSL distro (`:977-989`).
3. `maxResults` clamped to [1, 2000] (`DEFAULT_SEARCH_MAX_RESULTS`, `:983-986`; constant `src/shared/text-search.ts:56`).
4. Per-sender+root key `${sender.id}:${rootPath}` (`:987`): a new search KILLS the previous rg child for the same key so a stale scan can't peg CPU after the UI moved on ("large-repo freeze", `:998-1002`).
5. WSL root without rg -> straight to git-grep fallback (`:991-993`).
6. Otherwise spawn `rg` through `wslAwareSpawn` with argv from `buildRgArgs` (`:996,1049-1053`), stream stdout line-by-line into `ingestRgJsonLine` (`:1042-1047`), kill child when `maxResults` reached.
7. rg missing/broken mid-flight (spawn error, abnormal exit classified by `isRipgrepUnavailableExit`) -> transparent retry with `searchWithGitGrep` (`:1068-1085`).
8. Hard timeout 15 s (`SEARCH_TIMEOUT_MS`, `src/shared/text-search.ts:57`) kills rg and marks results `truncated` (`filesystem.ts:1099-1106`).
9. Result finalized through `normalizeSearchResult` (`src/shared/text-search.ts:457-463`).

Availability probe: `checkRgAvailable` runs `rg --version` (5 s timeout) and deliberately does NOT cache the answer — a negative cache would persist across installs forcing an app restart; a positive cache could mask a broken rg (`src/main/ipc/rg-availability.ts:3-17` comment block).

### 3.2 Git-grep fallback engine
`src/main/ipc/filesystem-search-git.ts:23-103`: `gitSpawn` with args from `buildGitGrepArgs` (`src/shared/text-search.ts:303-348`): `-n -I --null --no-color --untracked --no-recurse-submodules`, ERE for regex mode, `:(glob)` pathspecs rewritten to be recursive-by-default (`toGitGlobPathspec`, `:297-301`). Because git reports only the first hit per line, a JS-side regex re-finds submatch columns; if the query is valid ERE but invalid JS RegExp, whole-line highlight fallback keeps hits navigable (`buildSubmatchRegex` `:357-370`; ingest logic `:372-453`).

### 3.3 Quick Open file listing (`fs:listFiles`)
`src/main/ipc/filesystem.ts:1111-1148`:
- Token-keyed cancellation (`createSenderScopedRequestCancellations`, `:1113`) so a workspace switch aborts the prior full-tree scan (#7721; SSH otherwise stacks scans past the 30 s timeout).
- Local path -> `listQuickOpenFiles` (`:1139`) in `src/main/ipc/filesystem-list-files.ts:27-282`:
  - Nested linked worktrees excluded via normalized absolute-path prefixes (`:41-45`).
  - rg run cwd-relative (`searchRoot: '.'`) so root-relative exclude globs actually prune traversal, not just filter output (`:79-88` comment).
  - Streaming line parser with early stop at `maxResults` (`:117-121`); 10 s timeout discards the buffer rather than emitting a truncated mid-path entry (`:223-229`).
  - Exit-code tolerance: rg exit 2 with parseable output still yields partial results (unreadable subdirs) (`:183-188`).
  - Sibling-pass killing on failure or budget completion (`killSurvivors` / `finishAtLimit`, `:233-258`).
  - Fallback ladder: rg unavailable -> `listFilesWithGit` (`git ls-files` two-pass, `src/main/ipc/filesystem-list-files-git-fallback.ts`) -> budgeted readdir walk (`src/shared/quick-open-readdir-walk.ts:82-193`) which enforces depth/directory/path/deadline budgets (`quick-open-readdir-budget` imports at `:20,38`).
- SSH path -> provider.listFiles with excludePaths + signal (`:1127-1137`); missing provider returns [] instead of erroring so Quick Open shows "No matching files" (`:1129-1132`).

### 3.4 Renderer consumers (thin, uncached)
- `useRuntimeFileListForWorktree` fetches the full list whenever its request key changes and clears it while switching; unmount cancels the host-side scan (#7721) (`src/renderer/src/components/quick-open-file-list.ts:161-237`, cancel at `:218-225`). There is NO persistent or cross-mount cache of file lists.
- Right-sidebar content search debounces 300 ms and caps 2000 results, with monotonic search ids so out-of-order responses cannot overwrite newer state (`src/renderer/src/components/right-sidebar/useFileSearchRunner.ts:14-16,31-35`).
- Transport selection: local/SSH go through `window.api.fs.*`; managed environment runtimes route to runtime RPC `files.search` / `files.listAll` with their own 15 s timeouts (`src/renderer/src/runtime/runtime-file-client.ts:930-975`), best-effort cancellation `cancelRuntimeFileList` `:982-993`.
- Preload surface: `ipcRenderer.invoke('fs:listFiles', ...)` (`src/preload/index.ts:3205-3210`).

### 3.5 AI Vault scan-as-query
`scanAiVaultSessions` (`src/main/ai-vault/session-scanner.ts:57-157`):
1. Load persisted parse cache BEFORE any candidate parse (`:75-78`, "#9210 seeding" comment).
2. Discover sources across all agent homes; dedupe Codex rollout aliases (incl. hardlink identity) (`:79-110`).
3. Sort candidates by mtime DESC (`:103`) and parse top `limit * 2` (`SESSION_PARSE_CANDIDATE_MULTIPLIER`, `:46`; slice at `:113`).
4. Parse in batches of 8 (`SESSION_PARSE_CONCURRENCY`, `:45`) via `parseAgentSessionFileCached` (`:287`).
5. Early-stop when the next candidate's mtime is older than the current visible cutoff — older files cannot displace the set (`canStopParsingSessions`, `:330-346`).
6. Dedupe by session id, merge scope-guaranteed sessions, cap to limit (`:123-137,159-177`).
7. Persist stats via `scheduleSessionParseCachePersist` (`:149`) and emit span attributes reused/incremental/fullParses/bytesRead for CPU forensics (`:142-147`).
A shared 60 s TTL cache sits above this so the desktop panel and mobile RPC share ONE scan instance, with a generation counter preventing stale in-flight scans from repopulating a just-invalidated cache (`src/main/ai-vault/cached-session-list.ts:13-15,40-45`).

## 4. Incremental vs Full Reindex Triggers

### 4.1 Code search: neither — stateless
No index means no reindex triggers. Every keystroke-driven query (after 300 ms debounce) re-scans the tree. The "incrementality" is process-level: killing the previous query's rg child per `sender:root` key (`filesystem.ts:998-1002`) and early-terminating at the result cap (`text-search.ts:237-239`).

### 4.2 AI Vault sessions: mtime-driven incremental parse
- Candidates sorted by mtime DESC; parsing stops once the visible top-N cannot be displaced (`session-scanner.ts:103,330-346`).
- Parse cache entries keyed by file identity + size/mtime so unchanged transcripts are reused, partially-read files get incremental tail parses, and only new/changed files get full parses (stats counters `reused|incremental|fullParses` at `session-scanner.ts:143-145`; cache engine `src/main/ai-vault/session-scanner-parse-cache.ts`).
- Persisted cache invalidated whole-file on `SCHEMA_VERSION` mismatch or appVersion change (`session-parse-cache-persistence.ts:15-16`, option field `appVersion` at `:26`).

### 4.3 Codex session-index heal / backfill: version-marker rebuilds
- Heal ledger version constant: "Bump to re-drive the heal for every host after a semantics change" — `CODEX_SESSION_INDEX_HEAL_VERSION = 3` (`src/main/codex/codex-session-index-heal-state.ts:12-15`). Completion marker makes steady-state startups a two-stat no-op (`:7-8` comment); unsupported CLI retried daily (`:18-20`).
- Backfill marker likewise versioned (`CODEX_SESSION_BACKFILL_MARKER_VERSION = 3`) with skip-existing semantics so re-runs never overwrite (`src/main/codex/codex-session-backfill-marker.ts:5-8`), plus generation capture to invalidate markers in-flight (`:10-13`).

### 4.4 External index freshness
Codex title map cached per codex-home under a `${size}:${mtimeMs}` signature of `session_index.jsonl`; any external change to the file busts the cache automatically (`session-scanner-codex-title-index.ts:76-97`). LRU cap 64 homes (`:12-13,120-132`).

---

## 5. File-Watcher Coupling

**Verdict: zero coupling to search/index machinery.**

- The watcher subsystem exists for live UI refresh: it keeps `watchedRoots` keyed by path (`filesystem-watcher.ts:48`), batches events (`MAX_BATCHED_WATCHER_EVENTS` import `:18`; batch window constants from `shared/filesystem-watch-batch-window` `:23-26`), suppresses high-churn dirs at watcher level (`WATCHER_IGNORE_DIRS`, `:40-41`), and delivers `FsChangedPayload` objects to renderer WebContents (send sites at `:292,:335,:926,:1083,:1320,:1444,:1531`).
- Local watching runs @parcel/watcher inside crash-isolated forked children with a canary self-check against silent wedging (`src/main/ipc/parcel-watcher-process-entry.ts:1,26`; host API `parcel-watcher-process.ts:1`), with an in-process fallback (`parcel-watcher-in-process-fallback.ts`). Windows recreation is expensive (~500 ms+ under AV), so torn-down roots get a 30 s grace for reuse (`filesystem-watcher.ts:70-72`).
- WSL roots use an in-distro snapshot subprocess instead so `wsl --shutdown` can kill it (`:694`); SSH/remote watchers are separate subscriptions that must be unwatched on shutdown or the relay polls forever (`:1951`).
- Nothing in this pipeline feeds, invalidates, or updates any search structure: since code search has no persistent structure, there is nothing to invalidate. Quick Open refetches lists on demand; the watcher's only relationship to search is indirect (renderer may choose to refresh UI when events arrive).
- Shutdown invariant: will-quit awaits native unsubscribe because Electron teardown can race @parcel/watcher's async native work (`src/main/index.ts:1765`; also `filesystem-watcher.ts:73-74`).

---

## 6. Memory / Performance Constraints (catalog)

| Constraint | Value | Where |
|---|---|---|
| Max matches per file | 100 | `src/shared/text-search.ts:55` |
| Default/max total matches | 2000 (clamped both ends) | `text-search.ts:56`; `filesystem.ts:983-986` |
| Search hard timeout | 15 000 ms -> truncated=true | `text-search.ts:57`; `filesystem.ts:1099-1106` |
| Max searched file size | 5 MB (rg --max-filesize) | `text-search.ts:64,196-197` |
| Match line context clamp | 500 chars w/ ellipsis windows; pathological multi-MB regex hits clamped first | `text-search.ts:63-108` |
| rg JSON structural limits | 32k tokens, depth 16 (anti-bomb guard before JSON.parse) | `text-search.ts:58-61,252-257` |
| SSH relay message safety | line clamp exists because megabyte lines x 2000 caps blow past relay MAX_MESSAGE_SIZE | `text-search.ts:66-67` |
| Quick Open result ceiling | 20 001 paths | `src/shared/quick-open-listing-limits.ts:3` |
| Retained-path budget | 100 000 paths / 32 MB total / 64 KB per path — exceeding THROWS (fail-closed) | `quick-open-listing-limits.ts:4-6,53-77` |
| Subprocess path accumulator | byte-buffer streaming, single-byte delimiters, copy-on-residual to avoid retaining whole read buffers | `quick-open-listing-limits.ts:81-142` |
| Quick Open list timeout | 10 s, buffer discarded on timeout/signal kill (never emit truncated mid-path entry) | `filesystem-list-files.ts:170-176,223-229` |
| rg availability probe | 5 s timeout, deliberately uncached | `rg-availability.ts:3,17` |
| Prior-query suppression | previous rg child killed per sender+root (anti-freeze #large-repo) | `filesystem.ts:998-1002` |
| Session parse concurrency | 8 parallel parses, candidate window = 2x limit | `session-scanner.ts:45-46,113` |
| Parse-cache save debounce | 1500 ms | `session-parse-cache-persistence.ts:17-18` |
| Session list TTL cache | 60 s, shared desktop+RPC, generation-guarded | `cached-session-list.ts:15,40-45` |
| Codex home title caches | max 64 concurrent homes | `session-scanner-codex-title-index.ts:12-13` |
| Watcher teardown grace | 30 s root reuse on Windows | `filesystem-watcher.ts:70-72` |
| Statement cache (sqlite adapter) | 256 entries, DDL-invalidated | `sync-database.ts:18-19,59-65` |

Cross-cutting patterns worth noting for transformation planning:
- **Fail-closed truncation**: every bounded surface marks results truncated rather than silently dropping (search timeout `filesystem.ts:1100-1101`; git-grep timeout `filesystem-search-git.ts:98-102`; signal-kill discards buffers `filesystem-list-files.ts:170-176`).
- **Advisory-kill hygiene**: every spawned child detaches listeners after kill so ignored kills don't leak closures across repeated searches (`filesystem.ts:1025-1035`; `filesystem-search-git.ts:52-58`; `filesystem-list-files.ts:199-208`).

---

## 7. Storage Locations Summary

| Artifact | Format | Location | Owner |
|---|---|---|---|
| Text-search results | in-memory Map | main process, per-query | none |
| Quick Open listings | in-memory Set | renderer component state per mount | none |
| AI Vault parsed sessions | persisted JSON snapshot (schema v1, atomic rename) | userData dir (path injected via `initSessionParseCachePersistence`) | Fabrica-app |
| Session-list cache | in-memory, 60 s TTL | main process singleton | Fabrica-app |
| Codex thread titles | JSONL read-through cache (signature-keyed) | reads `<CODEX_HOME>/session_index.jsonl` | Codex CLI |
| OpenCode sessions | SQLite via forked worker | OpenCode's own store | OpenCode |
| Codex heal/backfill ledgers + markers | append-ledger files + JSON markers, versioned | system-sessions root (paths struct at `codex-session-index-heal-state.ts:24-30`) | Fabrica-app |
| Code index | NONE | - | - |

---

## 8. Embeddings / Vector / LLM-Assisted Search

**Negative result, high confidence.** A grep of all of `Fabrica-app/src` for `embedding`, `vectorSearch`, and semantic-search terms returned zero relevant engineering hits; every match was unrelated prose ("semantics" in comments, SVG vector graphics note at `src/main/ipc/pet.ts:133`, SSRF-vector wording at `localhost-worktree-labels.ts:23`, browser "semantic locators" for DOM automation at `browser/agent-browser-bridge.ts:1198` which is element finding, not corpus search). There is no local model runtime, no ONNX/transformers dependency, no vector store, and no LLM call anywhere in the query paths documented in section 3.

---

## 9. Comparison: buzz FTS vs Fabrica-app Search

Reference: Atlas report `.Fabrica-atlas-board/discovery/round4/bz-search-pubsub.md` (buzz-search crate: SQLite FTS5 with `search_tsv` migrations, NIP-50 relay search, pubsub event flow). Fabrica-app by contrast:

| Dimension | buzz (FTS) | Fabrica-app |
|---|---|---|
| Engine | Embedded SQLite FTS5, inverted index maintained by triggers/migrations | External processes (rg/git-grep) invoked per query; zero embedded index |
| Write cost | Index updated on write | None |
| Query cost | O(index lookup), scales with corpus not disk speed | Full tree scan each time; bounded by caps/timeouts |
| Ranking | FTS ranking available | None — raw ordered matches, no relevance scoring |
| Persistence | DB file | Only session parse cache JSON |
| Incremental maintenance | Trigger-based | n/a (code) / mtime+cache (AI Vault) |
| Offline robustness | Index can go stale vs source | Impossible to go stale (always reads disk) |

Fabrica's design is the correct choice for its actual use case (interactive editor-style search over worktrees where ripgrep is faster than any maintainable JS-side index and correctness-under-mutation matters). It is the WRONG substrate for agent-output semantic search, where the corpus is large (6.7 GB transcripts observed in #9210), queries are recall-oriented ("which session discussed X"), and scoring/ranking matters.

## 10. Extension Potential: Semantic Agent-Output Search in the Atlas-project

Assessment against the machinery documented above:

1. **The ingestion pipeline already exists end-to-end.** The AI Vault scanner normalizes 12+ agent transcript formats into unified session records with dedupe, scope guarantees, and cancellation (`section 3.5`); a semantic indexer would hang off exactly this point — post-parse, pre-cache — rather than building format parsers from scratch.
2. **A persistence seam already exists.** `initSessionParseCachePersistence(filePath, appVersion)` with schema-version discard and debounced atomic writes is a template for a chunked vector-store or FTS DB living beside it in userData; bump-the-version wholesale invalidation is already the established invalidation idiom (`section 4.2-4.3`).
3. **Incremental indexing is solved**: mtime-sorted candidates + reuse/incremental/full-parse stats give the exact trigger discipline a semantic index needs (index only changed files); the heal/backfill marker pattern (versioned one-shot backfills, daily retry ladders, two-stat steady-state startup) transfers directly to "embed everything once, then follow mtimes".
4. **Recommended engine**: buzz-style SQLite FTS5 (via the existing `node:sqlite` adapter, `section 2.4`) for lexical recall over transcripts/messages, optionally plus embeddings later. FTS5 needs no native deps, works over SSH-relay constraints better than a binary vector index, and matches the existing statement-caching adapter.
5. **What is missing (gaps to feed as tasks)**: no message-level segmentation in the unified record (records are session-granular with truncated previews — full-content extraction would extend `session-scanner-*-parser.ts`); no ranking/scoring layer anywhere in the app; no cross-host union beyond executionHostId namespacing (`session-scanner.ts:316-328`); remote/SSH hosts scan via separate scanners (`ssh-session-list.ts`, `remote-session-*` family) so a shared index service would need the same "ONE module owns the cache" treatment as `cached-session-list.ts:13`.
6. **Do NOT extend the code-search plane**: rg-per-query is optimal there; bolting an index onto worktrees would create exactly the staleness/invalidation burden Fabrica's current design avoids. Semantic search belongs on the agent-output corpus only.

---

## 11. Scan Coverage Statement

**Read in full (line-by-line):**
- `src/shared/text-search.ts` (463 lines) — rg/git-grep arg construction, ingest, finalize, all constants
- `src/main/ipc/filesystem-list-files.ts` (298 lines) — Quick Open listing engine
- `src/main/ipc/filesystem-search-git.ts` (104 lines) — git-grep fallback
- `src/shared/quick-open-listing-limits.ts` (142 lines) — budgets/accumulator
- `src/main/sqlite/sync-database.ts` (111 lines) — sqlite adapter
- `src/main/ai-vault/session-scanner.ts` (346 lines) — scan pipeline
- `src/main/ai-vault/session-scanner-codex-title-index.ts` (158 lines)
- `src/renderer/src/components/quick-open-file-list.ts` (245 lines)
- `src/renderer/src/runtime/runtime-file-client.ts` lines 880-1019 (search/list RPC surface)

**Read in targeted sections:**
- `src/main/ipc/filesystem.ts` lines 930-1149 (fs:search, fs:listFiles handlers; remainder of the 2350-line file is non-search IPC: stat/read/write/mutations/import-ssh — out of scope)
- `src/main/ipc/filesystem-watcher.ts` lines 1-120 + grep of all send sites and grace constants (1961-line file; deep watcher internals already owned by R4-1.1 fa-ipc-watchers.md)
- `src/main/ai-vault/session-parse-cache-persistence.ts` lines 1-80
- `src/renderer/src/components/right-sidebar/useFileSearchRunner.ts` lines 1-90
- `src/main/codex/codex-session-index-heal-state.ts` lines 1-40; `codex-session-backfill-marker.ts` lines 1-30; `cached-session-list.ts` lines 1-45; `rg-availability.ts` lines 1-60

**Grep-level verification only:**
- Embedding/vector/semantic negative result across all of `src/` (section 8); symbol-index negative; `fs:listFiles` preload wiring; `listRuntimeFiles|searchRuntimeFiles` consumer census; quick-open-filter.ts / quick-open-readdir-walk.ts export signatures; parcel-watcher process family headers; ai-vault + codex directory inventories (file lists with sizes).

**Skipped (with reason):**
- `filesystem.test.ts` (116 KB), `filesystem-watcher*.test.ts` family, other test files — tests read only where they document a production constant (#7721, #9210, #7547).
- SSH relay search implementation on the remote side (`relay/`, ssh-relay native-deps install machinery) — transport/deploy plane covered by R4-1.23/R5 reports; this report covers the shared query layer (`text-search.ts` explicitly shared by both callers per its header).
- Palette/keybinding matcher internals — owned by R4-1.16.
- `_sources/` repos — out of scope for this task.

**Coverage verdict:** every production module that participates in indexing/search/query execution in `Fabrica-app/src` has been read or section-read as listed above; no known gap remains within this task's scope guard.


