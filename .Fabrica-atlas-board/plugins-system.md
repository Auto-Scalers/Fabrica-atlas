# Plugins — Existing System Reference

> **Focus system #9.** Describes what Fabrica ALREADY has for the plugin system / marketplace. Companion ideas live in `ideas.md` (section: Plugins).
> Sources: `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-plugin-runtime.md`, `discovery/fabrica-app/fa-ipc-watchers.md`, `fabrica-app-discovery.md`.

---

## 1. Purpose & Scope

The Plugin system lets third parties extend Fabrica via out-of-process plugins (UI panels, commands, host-calls), distributed through a Marketplace with provenance/trust enforcement. It is the **extensibility + trust** layer.

## 2. Architecture (what exists)

- **Renderer UI**: `PluginPanel`, `PluginCatalogLayout`, `PluginCatalogAvatar`, `PluginCatalogEmptyState`, `PluginMarketplaceBrowser` (`Fabrica-features.md:410-414`).
- **Settings**: `PluginsSettingsSection`, `PluginMarketplaceBrowser`/`ListingRow`, `PluginInstallDialog`, `PluginConsentDialog`, `PluginRemoveDialog` (`Fabrica-features.md:478-483`).
- **Backend** (`§8.6`): `PluginService`, `PluginSupervisor`, `PluginDiscovery`, `PluginHostRuntime`, `PluginWorkerController`, `PluginMarketplaceService`, `PluginAuditLog`, `PluginKillListService`, `PluginContentSafety` (`Fabrica-features.md:648-657`).
- **IPC**: `plugins:*` ×18 + marketplace family (`listMarketplaces/addMarketplace/removeMarketplace/refreshMarketplaces/installMarketplacePlugin/previewMarketplacePlugin/previewMarketplaceUpdate/rollbackMarketplacePlugin/listMarketplacePlugins`) (`fa-ipc-watchers.md:4.14`).
- **Out-of-process worker**: `child_process.fork`, zod-validated protocol both directions, timeouts (READY 10s, INVOKE 30s, EVENT 5min), slot pool `PLUGIN_WORKER_MAX_ACTIVE_DEFAULT=5`, supervision `maxRestarts=3` backoff (`fa-plugin-runtime.md` S5).
- **Panel bridge**: CSP-first shell + navigation guard, opaque bearer session tokens, admission budgets (64KB msg, 30 msgs/10s, 10s ping/5s pong watchdog) (`fa-plugin-runtime.md` S6).
- **Marketplace**: `fabrica-marketplace.json` schema, official Auto-Scalers source pinning, provenance validation, installer preview/install with commit-lock (`fa-plugin-runtime.md` S9).
- **Kill list**: `plugin-kill-list.json` from `fabrica-ai.vercel.app/plugins/kill-list.json`, revocation chokepoint at every approval gate (`fa-plugin-runtime.md` S10).
- **Trust model**: bundled = official only, reserved identities (`autoscalers`/`fabrica-`), consent fingerprints bind capabilities + instructional-content hash, feature flag fails closed (`fa-plugin-runtime.md` S12).
- **Content-pack registries**: language packs, VM recipes, commands/keybindings; instructional-integrity hash re-check at every read (`fa-plugin-runtime.md` S11).
- **Audit log** (append-only JSONL), **dev watcher** (Parcel, 300ms debounce), per-plugin KV/secrets stores (own encrypted file) (`fa-plugin-runtime.md` S8,S12; `fa-ipc-watchers.md:5.7`).
- **Plugin host facade** narrowed to `resolveActiveWorktreeContext`, `listTerminals`, `sendTerminal`, `dispatchPluginNotification` (`fa-runtime-structured-read.md:7`).

## 3. Reference designs (MC / buzz)

- **[MC]** (none — MC has no plugin marketplace; only a `Skills Page` with tags/agent-assignment and built-in slash commands.)
- **[buzz]** (none — buzz extensibility is via agent crates/recipes, not installable plugins.)

## 4. Hard constraint

Preserve every existing plugin feature. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
