# Plugins — Existing System Reference

> **Focus system #9.** Describes what Fabrica ALREADY has for the plugin system / marketplace. Companion ideas live in `ideas.md` (section: Plugins).
> Sources: `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-plugin-runtime.md`, `discovery/fabrica-app/fa-ipc-watchers.md`, `fabrica-app-discovery.md`.

---

## 1. Purpose & Scope

The Plugin system lets third parties extend Fabrica via out-of-process plugins (UI panels, commands, host-calls), distributed through a Marketplace with provenance/trust enforcement. It is the **extensibility + trust** layer.

**How it works:** Plugins are add-ons that other developers write to give Fabrica new panels, commands, or abilities. They run in a separate process (not inside Fabrica's core) and are installed from a Marketplace that checks where each plugin came from and whether it can be trusted. This is how Fabrica stays extendable while keeping the core safe.

## 2. Architecture (what exists)

- **Renderer UI**: `PluginPanel`, `PluginCatalogLayout`, `PluginCatalogAvatar`, `PluginCatalogEmptyState`, `PluginMarketplaceBrowser` (`Fabrica-features.md:410-414`).

  **How it works:** The in-app UI for plugins includes a panel that hosts a plugin's interface, a catalog layout with icons and an empty state, and a browser for the Marketplace where you discover plugins.

- **Settings**: `PluginsSettingsSection`, `PluginMarketplaceBrowser`/`ListingRow`, `PluginInstallDialog`, `PluginConsentDialog`, `PluginRemoveDialog` (`Fabrica-features.md:478-483`).

  **How it works:** In Settings you'll find a plugins section, marketplace rows, and dialogs to install, consent to (approve capabilities), and remove a plugin.

- **Backend** (`§8.6`): `PluginService`, `PluginSupervisor`, `PluginDiscovery`, `PluginHostRuntime`, `PluginWorkerController`, `PluginMarketplaceService`, `PluginAuditLog`, `PluginKillListService`, `PluginContentSafety` (`Fabrica-features.md:648-657`).

  **How it works:** Behind the scenes a set of services runs plugins: one to supervise them, one to discover installed plugins, one to host the worker process, one to run the marketplace, an append-only audit log, a "kill list" of banned plugins, and a content-safety check.

- **IPC**: `plugins:*` ×18 + marketplace family (`listMarketplaces/addMarketplace/removeMarketplace/refreshMarketplaces/installMarketplacePlugin/previewMarketplacePlugin/previewMarketplaceUpdate/rollbackMarketplacePlugin/listMarketplacePlugins`) (`fa-ipc-watchers.md:4.14`).

  **How it works:** Fabrica uses 18 internal plugin messages plus a marketplace family that lets you list, add, remove, refresh marketplaces, and install/preview/rollback plugins — including rolling back a bad update to the previous version.

- **Out-of-process worker**: `child_process.fork`, zod-validated protocol both directions, timeouts (READY 10s, INVOKE 30s, EVENT 5min), slot pool `PLUGIN_WORKER_MAX_ACTIVE_DEFAULT=5`, supervision `maxRestarts=3` backoff (`fa-plugin-runtime.md` S5).

  **How it works:** Each plugin runs in its own forked process; every message is validated (zod) in both directions, and there are strict timeouts (10s to start, 30s per call, 5min per event). Only 5 plugins run at once by default, and a crashed plugin is restarted at most 3 times with backoff — so a bad plugin can't take down Fabrica.

- **Panel bridge**: CSP-first shell + navigation guard, opaque bearer session tokens, admission budgets (64KB msg, 30 msgs/10s, 10s ping/5s pong watchdog) (`fa-plugin-runtime.md` S6).

  **How it works:** A plugin's UI panel is sandboxed (content-security policy), uses hidden session tokens, and is limited in how much it can send (64KB per message, 30 messages per 10s) with a ping/pong watchdog — containing what a plugin can do to the interface.

- **Marketplace**: `fabrica-marketplace.json` schema, official Auto-Scalers source pinning, provenance validation, installer preview/install with commit-lock (`fa-plugin-runtime.md` S9).

  **How it works:** The Marketplace is described by a JSON schema, pins the official Auto-Scalers source, validates each plugin's provenance (where it really came from), and locks installation to a specific commit so what you install can't silently change.

- **Kill list**: `plugin-kill-list.json` from `fabrica-ai.vercel.app/plugins/kill-list.json`, revocation chokepoint at every approval gate (`fa-plugin-runtime.md` S10).

  **How it works:** A centrally published "kill list" names banned plugins; it is checked at every approval step, so a revoked plugin is blocked everywhere, instantly.

- **Trust model**: bundled = official only, reserved identities (`autoscalers`/`fabrica-`), consent fingerprints bind capabilities + instructional-content hash, feature flag fails closed (`fa-plugin-runtime.md` S12).

  **How it works:** Plugins bundled with Fabrica are official-only; certain identity names are reserved, and when you consent to a plugin a fingerprint records exactly which capabilities and instructions you approved. If a feature flag is on, it fails "closed" (denies) by default — safe unless explicitly allowed.

- **Content-pack registries**: language packs, VM recipes, commands/keybindings; instructional-integrity hash re-check at every read (`fa-plugin-runtime.md` S11).

  **How it works:** Plugins can ship content packs (extra languages, VM setups, commands/keybindings); each is re-checked against an integrity hash every time it's read, so tampered content is caught.

- **Audit log** (append-only JSONL), **dev watcher** (Parcel, 300ms debounce), per-plugin KV/secrets stores (own encrypted file) (`fa-plugin-runtime.md` S8,S12; `fa-ipc-watchers.md:5.7`).

  **How it works:** Every plugin action is written to an append-only log for review; a dev mode re-bundles on change after 300ms; and each plugin gets its own encrypted key/secret store so credentials stay isolated.

- **Plugin host facade** narrowed to `resolveActiveWorktreeContext`, `listTerminals`, `sendTerminal`, `dispatchPluginNotification` (`fa-runtime-structured-read.md:7`).

  **How it works:** A plugin is intentionally given only four host abilities — find the active worktree, list terminals, send to a terminal, and dispatch a notification — limiting what it can touch in your workspace.

## 3. Reference designs (MC / buzz)

- **[MC]** (none — MC has no plugin marketplace; only a `Skills Page` with tags/agent-assignment and built-in slash commands.)

  **How it works:** Mission Control has no installable-plugin marketplace; it only has a Skills page (tagged, assignable to agents) and built-in slash commands. So there is no MC marketplace design to adopt — Fabrica's plugin system is already richer.

- **[buzz]** (none — buzz extensibility is via agent crates/recipes, not installable plugins.)

  **How it works:** buzz extends itself through "agent crates" and recipes rather than installable plugins, so there is no comparable plugin marketplace to borrow from buzz either.

## 4. Hard constraint

Preserve every existing plugin feature. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
