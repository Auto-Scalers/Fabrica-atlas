# Search Bar / Command Palette — Existing System Reference

> **Focus system #5.** Describes what Fabrica ALREADY has for the command palette / global search (Cmd+J). Companion ideas live in `ideas.md` (section: Search bar).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-command-palette-search.md`, `fa-search-indexing.md`.

---

## 1. Purpose & Scope

The unified command palette (Worktree Jump Palette, Cmd+J) is the global entry point for jumping to worktrees/tabs, running commands, and searching. It also backs right-sidebar text/code search. It is **stateless, fuzzy, and index-free** today.

**How it works:** Press Cmd+J (or Mod+Shift+J) and a single search box appears where you can jump to any working copy or tab, run a command, or search text — all from one place. Today it works by scanning on demand rather than keeping a pre-built index, and it matches loosely (fuzzy) so small typos still find what you want.

## 2. Architecture (what exists)

- **Unified palette**: Worktree Jump Palette (Cmd+J) merges 7 result families (`WorktreeJumpPalette.tsx:258-266`); binding `worktree.palette` = Mod+J / Mod+Shift+J (`keybindings.ts:231-241`) (`fa-command-palette-search.md`).

  **How it works:** The palette blends seven kinds of results (worktrees, tabs, commands, etc.) into one list, and the keyboard shortcut Mod+J opens it while Mod+Shift+J opens the variant.

- **`cmd-j`** (32 components): main palette with fuzzy match, host badges, live status (`fabrica-app-discovery.md:143`).

  **How it works:** About 32 interface pieces make up the palette; it fuzzy-matches your typing, shows a badge for which machine/host a result is on, and displays live status (e.g., is that worktree active).

- **No fuzzy library** (no fuzzysort/fuse.js); bespoke greedy-subsequence fuzzy scorers per surface (`fa-command-palette-search.md:3`).

  **How it works:** Instead of using a ready-made search library, Fabrica wrote its own lightweight "does this string contain these letters in order" matcher for each surface — less dependency, but custom-built.

- **Cross-section relevance** scale (`cmd-j-match-relevance.ts`) for interleaving worktree/tab sections (`fa-command-palette-search.md:5.6`).

  **How it works:** A scoring rule decides how to mix worktree results and tab results together in the list so the most relevant items rise to the top regardless of which section they came from.

- **Code/text search**: stateless per-query via `rg --json` (fallback `git grep`, then budgeted `readdir`); **no persistent index** (`fa-search-indexing.md:0.1`).

  **How it works:** When you search inside files, Fabrica runs the search tool `rg` fresh each time (falling back to `git grep`, then a limited folder scan). It does not keep a standing index, so the first search after a change is always accurate but can be slower on huge repos.

- **Search caps**: `MAX_MATCHES_PER_FILE=100`, total clamp [1,2000], 15s hard timeout → `truncated`, max file 5 MB (`fa-search-indexing.md:1.1,6`).

  **How it works:** To stay responsive, Fabrica limits each file to 100 matches, the whole result to between 1 and 2,000 matches, enforces a 15-second cutoff (after which it reports "truncated"), and skips files larger than 5 MB.

- **Quick Open**: file switcher via `rg --files` two-pass (source then ignored files) (`fa-search-indexing.md:1.2`).

  **How it works:** The "quick open" file finder lists files in two passes — first your real source files, then the normally-ignored ones — so you can jump straight to any file by name.

- **Right-sidebar search UI**: `SearchResultsPane`, `SearchFilters`, `SearchQueryRow`, `RichMarkdownSearchBar`, `BrowserFind` (`Fabrica-features.md:95,276-280`).

  **How it works:** A search panel lives in the right sidebar with results, filter controls, a query row, a rich markdown-aware search bar, and an in-browser find tool.

- **AI Vault session-metadata index**: persisted parse cache, 60s TTL, mtime-driven incremental (`fa-search-indexing.md:1.3,2.2,3.5`).

  **How it works:** For AI Vault sessions, Fabrica keeps a cached, parsed index of metadata that refreshes at most every 60 seconds and only re-parses files whose modification time changed — a small exception to the "no index" rule.

- **No embeddings/vectors/LLM-assisted search** exist (`fa-search-indexing.md:8`).

  **How it works:** Today's search is plain text matching; it does not use AI embeddings or language models to understand meaning, so a search finds words, not concepts.

## 3. Reference designs (MC / buzz)

- **[MC]** Search Dialog = global search across tasks/projects/goals, Ctrl+K palette (`mc-features.md`; `mc-ui-frontend.md:73`).

  **How it works:** Mission Control has a Ctrl+K search box that looks across tasks, projects, and goals at once — a comparable global-palette pattern Fabrica could align with.

- **[buzz]** NIP-50 / Postgres FTS full-text search (tsvector + GIN index, privacy-sensitive kinds excluded, community-scoped) (`buzz-features.md`, `buzz-discovery.md`).

  **How it works:** buzz searches using a database full-text engine (Postgres) with a special index, excluding private content and scoping results to a community. This is a more powerful, index-backed search Fabrica could borrow for relay content.

## 4. Hard constraint

Preserve every existing search path. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
