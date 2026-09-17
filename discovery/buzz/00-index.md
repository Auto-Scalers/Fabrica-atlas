# Buzz — Subsystem Reports

> Full discovery scan of `_sources/buzz/` regenerated from fresh sources (commit `8868787`, 2026-09-03).
> Each report lists features, architecture, and source-file references.

## Report Index

| # | Report | Subsystem |
|---|--------|-----------|
| 1 | [01-relay-core.md](01-relay-core.md) | buzz-core + buzz-relay (protocol, event pipeline) |
| 2 | [02-services.md](02-services.md) | buzz-db, buzz-auth, buzz-pubsub, buzz-search, buzz-audit, buzz-workflow, buzz-media, buzz-deletion, buzz-conformance |
| 3 | [03-agent-surface.md](03-agent-surface.md) | buzz-acp, buzz-agent, buzz-cli, buzz-dev-mcp, buzz-persona, sprig |
| 4 | [04-git-pairing.md](04-git-pairing.md) | git-sign-nostr, git-credential-nostr, buzz-pair-relay, buzz-pairing-cli |
| 5 | [05-mesh-networking.md](05-mesh-networking.md) | buzz-relay-mesh, buzz-ws-client, buzz-push-gateway, buzz-backend-kubernetes |
| 6 | [06-desktop.md](06-desktop.md) | Tauri 2 + React 19 desktop app |
| 7 | [07-mobile-web.md](07-mobile-web.md) | Flutter mobile, React web, React admin-web |
| 8 | [08-infra.md](08-infra.md) | Schema, migrations, deploy (compose + Helm), scripts, CI/CD |

## Scan Coverage

- **Root files:** all 60+ top-level files read (configs, vision docs, README, ARCHITECTURE, etc.)
- **`crates/`:** all 30 member crates explored (key files in each)
- **`desktop/`:** `package.json`, `src/main.tsx`, `src-tauri/Cargo.toml` read; `src/features/` and `src-tauri/src/` enumerated
- **`mobile/`:** `pubspec.yaml`, `lib/main.dart`, `lib/features/` enumerated
- **`web/`, `admin-web/`:** `package.json`, `src/main.tsx` / `src/App.tsx` read; feature dirs enumerated
- **`schema/`:** `schema.sql` (1895 lines) read
- **`migrations/`:** 44 files enumerated; representative ones read
- **`scripts/`:** 82 files enumerated by category
- **`bin/`:** Hermit-managed tools enumerated
- **`docs/`:** 24 doc files enumerated
- **`.github/`:** 26 workflow files enumerated
- **`deploy/`:** compose + Helm charts enumerated

**Source commit:** `88687876f7808a2fd742b7eb2e4b9f87d999ad8d`
**Total files catalogued:** ~3,000+ (approx, excl. `node_modules`, `.git`, `target`)
