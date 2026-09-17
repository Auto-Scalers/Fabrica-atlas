# Mission Control — App Architecture

> Source: `_sources/mission-control/mission-control/`
> Commit: `2b8c402`

## Overview

Mission Control is a **Next.js 15** web application that serves as an open-source command center for solo entrepreneurs who delegate work to AI agents (primarily Claude Code). It provides an Eisenhower matrix for prioritization, Kanban board, goal hierarchy, Field Ops for real-world service execution, and an autonomous daemon for background task processing.

## Project Identity

| Field | Value |
|-------|-------|
| **Repo** | `mission-control` (forked from `MeisnerDan/mission-control`) |
| **Version** | 0.9.0 / 0.10 (README badge) |
| **Purpose** | Open-source command center for solo entrepreneurs delegating to AI agents |
| **License** | AGPL-3.0 |
| **Tagline** | "Tame the swarm. Ship what matters." |

## Tech Stack

### Core Framework
- **Next.js 15.3.3** (App Router)
- **React 19.1**
- **TypeScript 5.8** (strict mode)
- **pnpm** package manager

### Styling
- **Tailwind CSS v3.4** with CSS variables for design tokens
- **shadcn/ui** (Radix UI primitives)
- **next-themes** (dark/light mode)

### Functionality
- **Drag & Drop:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- **Search:** `cmdk` (Cmd+K)
- **Validation:** `zod` v4.3
- **Crypto:** Node.js built-in `crypto` (AES-256-GCM, scrypt)
- **Web3:** `ethers` v6.16 (Ethereum/Base/USDC adapter)
- **Scheduling:** `node-cron` (daemon cron jobs)
- **State:** Local JSON files + `async-mutex` for concurrent write safety
- **Process control:** `tree-kill` (cross-platform process tree killing)
- **ID generation:** `nanoid` v5
- **Toasts:** `sonner`
- **UI icons:** `lucide-react`

### Testing & Process Management
- **Vitest** v4 (193 tests)
- **PM2** (via `ecosystem.config.js`) for 24/7 always-on mode

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Next.js 15, React 19, scripts: dev, build, test, gen:context, daemon:start/stop/status, seed:demo, verify |
| `next.config.ts` | `allowedDevOrigins`, `devIndicators: false`, `experimental.optimizePackageImports: ["lucide-react"]` |
| `tsconfig.json` | TypeScript strict mode; target ES2017; `@/*` path alias → `./src/*` |
| `tailwind.config.ts` | Tailwind v3.4; dark mode `class`; extensive CSS variable color system |
| `postcss.config.mjs` | PostCSS for Tailwind/Autoprefixer |
| `eslint.config.mjs` | ESLint flat config with Next.js preset |
| `vitest.config.ts` | Vitest config: `environment: "node"`, `globals: true`, `include: ["__tests__/**/*.test.ts"]` |
| `ecosystem.config.js` | **PM2 config** for 24/7 always-on mode — auto-restart on crash, max_memory_restart: 512M |
| `.env.example` | Optional `MC_API_TOKEN` for API authentication |
| `start-mission-control.bat` | Windows launch script (kills orphaned Node processes on port 3000) |
| `start-mission-control.sh` | Unix launch script |
| `stop-mission-control.bat` | Windows stop script |
| `stop-mission-control.sh` | Unix stop script |

## Source Structure

```
mission-control/
├── src/
│   ├── middleware.ts          # API auth + CSRF protection
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Command Center dashboard (868 lines)
│   │   ├── autopilot/         # Daemon runtime dashboard
│   │   ├── guide/             # In-app reference
│   │   ├── activity/          # Full activity log
│   │   ├── brain-dump/        # Brain dump entries + triage
│   │   ├── inbox/             # Full inbox
│   │   ├── decisions/         # Pending decisions queue
│   │   ├── crew/              # Agent registry
│   │   ├── projects/          # All projects
│   │   ├── ventures/          # Ventures (alias for projects)
│   │   ├── objectives/        # Long-term goals
│   │   ├── status-board/      # Kanban view
│   │   ├── priority-matrix/   # Eisenhower matrix
│   │   ├── skills/            # Skills library
│   │   ├── checkpoints/       # Workspace snapshots
│   │   ├── field-ops/         # Field Ops (services, missions, vault, etc.)
│   │   ├── team/[role]/       # Single-agent workspace
│   │   ├── api/               # 47 API route files
│   │   ├── not-found.tsx      # 404
│   │   ├── error.tsx          # Error boundary
│   │   ├── global-error.tsx   # Global error boundary
│   │   └── loading.tsx        # Loading skeletons
│   ├── components/
│   │   ├── ui/                # 17 shadcn/ui primitives
│   │   ├── layout-shell.tsx   # App sidebar + main content
│   │   ├── app-sidebar.tsx    # Navigation
│   │   ├── command-bar.tsx    # Cmd+K global search
│   │   ├── task-card.tsx      # Task display
│   │   ├── board-view.tsx     # Kanban board
│   │   ├── eisenhower-summary.tsx
│   │   ├── run-button.tsx     # Launch task button
│   │   ├── onboarding-dialog.tsx
│   │   ├── vault-setup-wizard.tsx
│   │   └── field-ops/         # 17 Field Ops components
│   ├── hooks/                 # 11 custom React hooks
│   ├── providers/             # active-runs-provider.tsx
│   └── lib/                   # Core library layer (see 02-data-layer.md)
├── scripts/
│   ├── daemon/                # 12 daemon files
│   ├── seed-demo.ts
│   ├── seed-brewster.ts
│   ├── seed-dads-day-out.ts
│   ├── seed-infant-feeding.ts
│   ├── seed-vte-project.mjs
│   ├── generate-context.ts    # AI context snapshot
│   ├── create-launch-project.js
│   ├── find-auth-env.js
│   ├── test-restricted-auth.js
│   ├── verify-ifa.js
│   └── fix-stuck-tasks.js
├── __tests__/                 # 5 test files, 193 tests
├── data/                      # Local JSON state (source of truth)
└── docs/                      # Additional documentation
```

## Layout (`src/app/layout.tsx`)

- Inter font
- ThemeProvider (next-themes)
- LayoutShell (sidebar + main)
- Sonner Toaster (bottom-right)
- `suppressHydrationWarning`

## Routing Strategy

Next.js App Router with:
- **Page components** in `src/app/<route>/page.tsx`
- **API routes** in `src/app/api/<endpoint>/route.ts`
- **Layouts** for nested route groups
- **Loading states** via `loading.tsx`
- **Error boundaries** via `error.tsx`

## Notable Architectural Patterns

### 1. JSON-as-IPC
All data lives in `mission-control/data/*.json` — humans (UI) and agents (Claude Code reading files or calling API) share the same source of truth. No sync layer.

### 2. Mutex-Protected Atomic Mutations
Per-file `async-mutex` ensures concurrent writes from multiple agents queue safely (see 02-data-layer.md).

### 3. Self-Registering Adapters
Each adapter calls `registerAdapter()` on import; `api/field-ops/execute/route.ts` triggers all adapter imports (L51-57) so they self-register before `getAdapter()` lookup.

### 4. Schema-First Validation
Zod schemas in `validations.ts` are the single source of truth for all API request shapes. Frontend mirrors schemas (e.g., `LIMITS` constants).

### 5. Background Daemon
Polls `tasks.json` every N minutes, spawns Claude Code subprocesses with concurrency limits, retries with exponential backoff persisted to disk, scheduled commands via `node-cron` (see 05-daemon.md).

### 6. Bidirectional Agent↔Skill Sync
`sync-commands.ts` regenerates `.claude/commands/<id>/user.md` from `agents.json` (with skills resolved from `agent.skillIds` ∪ `skill.agentIds`).

### 7. Local-First
No database, no cloud, no API keys leaked — data lives in plain JSON on the user's machine.

## Scan Coverage

- `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `ecosystem.config.js`, `.env.example` read
- `src/app/layout.tsx` read
- `src/app/page.tsx` (868 lines) read
- All page files enumerated (30+ pages)
- All API route files enumerated (47 routes)
- `src/middleware.ts` (86 lines) read
- **Not deeply read:** individual page implementations beyond the home dashboard
