# Contributing to Mission Control

Thanks for your interest in contributing! Mission Control is an open-source task management system designed for solo entrepreneurs supervising AI agents.

## Getting Started

### Prerequisites
- Node.js v20+ (LTS recommended)
- pnpm v9+ (`npm install -g pnpm`)
- Git

### Setup
```bash
git clone https://github.com/MeisnerDan/mission-control.git
cd mission-control/mission-control   # repo folder → app folder (where package.json lives)
pnpm install
pnpm dev
```

The app runs at `http://localhost:3000`.

### Load Demo Data
```bash
pnpm seed:demo
```

## Development

### Commands
```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm tsc --noEmit # Type check
pnpm lint         # ESLint
pnpm test         # Run all 193 tests (Vitest)
pnpm check        # Typecheck + lint
pnpm verify       # Full verification: typecheck + lint + build + test
pnpm gen:context  # Regenerate AI context snapshot
```

### Code Conventions
- **TypeScript strict mode** — no `any` types
- **Functional components** with hooks
- **`"use client"`** only when needed (interactive pages, hooks)
- **Named exports** preferred
- **pnpm** only (not npm or yarn)
- **Tailwind CSS v4** for styling
- **shadcn/ui** for UI components

### File Structure
```
src/
  app/           Pages (Next.js App Router)
  app/api/       API routes (JSON file CRUD)
  components/    React components
  hooks/         Custom hooks (data fetching)
  lib/           Utilities, types, validation schemas
data/            JSON data files (source of truth)
scripts/         Build/utility scripts
```

### Data Architecture
All data lives in `data/` as plain JSON files. The web UI accesses them through API routes. AI agents can also read/write these files directly.

When modifying API routes:
- All POST/PUT endpoints must use Zod validation (see `src/lib/validations.ts`)
- All write operations must use file locking (see `src/lib/data.ts` mutex pattern)
- Run `pnpm gen:context` after data file changes

## Pull Requests

1. Fork the repo and create a feature branch
2. Make your changes
3. Run `pnpm verify` — typecheck, lint, build, and all tests must pass with 0 errors
4. Write a clear PR description explaining what and why
5. Submit the PR

### What We're Looking For
- Bug fixes
- UX improvements
- New agent integrations (Cursor, OpenClaw, etc.)
- Performance optimizations
- Accessibility improvements
- Documentation improvements

### What to Avoid
- Breaking changes to the JSON data schema without migration
- Adding heavy dependencies (keep it lightweight)
- Changes that break the local-first architecture

## Reporting Issues

Open a GitHub issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS/Node version

## License

By contributing, you agree that your contributions will be licensed under the GNU AGPL v3 License.
