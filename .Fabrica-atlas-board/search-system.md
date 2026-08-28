# Search Bar / Command Palette — Existing System Reference

> **Focus system #5.** Describes what Fabrica ALREADY has for the command palette / global search (Cmd+J). Companion ideas live in `ideas.md` (section: Search bar).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-command-palette-search.md`, `fa-search-indexing.md`.

---

## 1. Purpose & Scope

The unified command palette (Worktree Jump Palette, Cmd+J) is the global entry point for jumping to worktrees/tabs, running commands, and searching. It also backs right-sidebar text/code search. It is **stateless, fuzzy, and index-free** today.

## 2. Architecture (what exists)

- **Unified palette**: Worktree Jump Palette (Cmd+J) merges 7 result families (`WorktreeJumpPalette.tsx:258-266`); binding `worktree.palette` = Mod+J / Mod+Shift+J (`keybindings.ts:231-241`) (`fa-command-palette-search.md`).
- **`cmd-j`** (32 components): main palette with fuzzy match, host badges, live status (`fabrica-app-discovery.md:143`).
- **No fuzzy library** (no fuzzysort/fuse.js); bespoke greedy-subsequence fuzzy scorers per surface (`fa-command-palette-search.md:3`).
- **Cross-section relevance** scale (`cmd-j-match-relevance.ts`) for interleaving worktree/tab sections (`fa-command-palette-search.md:5.6`).
- **Code/text search**: stateless per-query via `rg --json` (fallback `git grep`, then budgeted `readdir`); **no persistent index** (`fa-search-indexing.md:0.1`).
- **Search caps**: `MAX_MATCHES_PER_FILE=100`, total clamp [1,2000], 15s hard timeout → `truncated`, max file 5 MB (`fa-search-indexing.md:1.1,6`).
- **Quick Open**: file switcher via `rg --files` two-pass (source then ignored files) (`fa-search-indexing.md:1.2`).
- **Right-sidebar search UI**: `SearchResultsPane`, `SearchFilters`, `SearchQueryRow`, `RichMarkdownSearchBar`, `BrowserFind` (`Fabrica-features.md:95,276-280`).
- **AI Vault session-metadata index**: persisted parse cache, 60s TTL, mtime-driven incremental (`fa-search-indexing.md:1.3,2.2,3.5`).
- **No embeddings/vectors/LLM-assisted search** exist (`fa-search-indexing.md:8`).

## 3. Reference designs (MC / buzz)

- **[MC]** Search Dialog = global search across tasks/projects/goals, Ctrl+K palette (`mc-features.md`; `mc-ui-frontend.md:73`).
- **[buzz]** NIP-50 / Postgres FTS full-text search (tsvector + GIN index, privacy-sensitive kinds excluded, community-scoped) (`buzz-features.md`, `buzz-discovery.md`).

## 4. Hard constraint

Preserve every existing search path. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
