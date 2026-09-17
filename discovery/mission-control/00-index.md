# Mission Control — Subsystem Reports

> Full discovery scan of `_sources/mission-control/` regenerated from fresh sources (commit `2b8c402`, 2026-09-03).
> Each report lists features, architecture, and source-file references.

## Report Index

| # | Report | Subsystem |
|---|--------|-----------|
| 1 | [01-app-architecture.md](01-app-architecture.md) | Next.js 15 app shell, routing, layout, tech stack |
| 2 | [02-data-layer.md](02-data-layer.md) | JSON-as-IPC, mutex-protected data layer, types, validations |
| 3 | [03-api-routes.md](03-api-routes.md) | 47 API routes (core + Field Ops) |
| 4 | [04-field-ops.md](04-field-ops.md) | Service catalog, adapters, vault, spend limits, approvals |
| 5 | [05-daemon.md](05-daemon.md) | Background daemon, dispatcher, runner, scheduler |
| 6 | [06-ui-pages.md](06-ui-pages.md) | Pages, components, hooks, providers |
| 7 | [07-skills-commands.md](07-skills-commands.md) | Skills library, commands, agent↔skill sync |
| 8 | [08-security-testing.md](08-security-testing.md) | Security model, middleware, tests, CI/CD |

## Scan Coverage

- **Root files:** `README.md`, `CLAUDE.md`, `LICENSE`, `CONTRIBUTING.md`, `.gitignore` read
- **`mission-control/` (Next.js app):** `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `ecosystem.config.js`, `.env.example` read
- **`src/lib/`:** `types.ts` (675 lines), `validations.ts` (571 lines), `data.ts` (855 lines), `vault-crypto.ts` (211 lines), `owner-guard.ts`, `sync-commands.ts`, `api-client.ts` read; remaining lib files enumerated
- **`src/lib/adapters/`:** `types.ts` (144 lines), `registry.ts`, `ethereum-adapter.ts` (747 lines) read; other adapters enumerated
- **`src/app/`:** layout, home page (868 lines), all page files enumerated (30+ pages)
- **`src/app/api/`:** 47 route files enumerated; key ones (tasks, agents, dashboard, field-ops/execute) read
- **`src/components/`:** all core components enumerated; Field Ops components enumerated
- **`src/hooks/`:** 11 hooks enumerated
- **`src/providers/`:** `active-runs-provider.tsx` (33 lines) read
- **`scripts/daemon/`:** 12 daemon files; `index.ts` (228 lines), `config.ts` (172 lines), `dispatcher.ts` (621 lines), `runner.ts` (373 lines), `security.ts` (159 lines) read
- **`__tests__/`:** 5 test files enumerated (193 tests total)
- **`skills/`:** 3 skill files enumerated
- **`commands/`:** 11 command SKILL.md files enumerated
- **`.claude/commands/`:** 14 user.md command files enumerated
- **`.github/workflows/`:** `ci.yml` (42 lines) read

**Source commit:** `2b8c402bb4ab04f6c2a3291f832e25a7482ab472`
**Total files catalogued:** ~180 source files (Next.js app)
