# Mission Control

**The command center for humans supervising AI agents.** Task management, agent orchestration, and external action execution (Field Ops). See the [main README](../README.md) for full documentation, features, and architecture.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Click **"Load Demo Data"** on the welcome screen to try it with sample tasks, agents, and messages.

### Platform-Specific Scripts

| Platform | Start | Stop |
|----------|-------|------|
| Windows | `start-mission-control.bat` | `stop-mission-control.bat` or Ctrl+C |
| Linux/macOS | `./start-mission-control.sh` | `./stop-mission-control.sh` or Ctrl+C |
| Any | `pnpm dev` | Ctrl+C |

### Troubleshooting

If port 3000 is stuck after a crash:
- **Windows:** Run `stop-mission-control.bat` (kills orphaned Node processes)
- **Linux/Mac:** Run `./stop-mission-control.sh` or `lsof -ti:3000 | xargs kill -9`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm lint` | Run ESLint |
| `pnpm tsc --noEmit` | TypeScript type check |
| `pnpm seed:demo` | Load sample demo data |
| `pnpm gen:context` | Generate AI context snapshot |

## Project Structure

```
src/
  app/             Pages and API routes (Next.js App Router)
    field-ops/     Field Ops views (dashboard, missions, services, vault, safety, activity)
    guide/         In-app reference guide
    autopilot/     Autopilot dashboard
  components/      React components (shadcn/ui + custom)
    field-ops/     Field Ops components (task cards, service cards, wallet, safety controls)
  hooks/           Custom hooks (SWR-based data fetching, wallet integration)
  lib/             Types, utilities, validation schemas, data access
    adapters/      Service adapters (Twitter, Ethereum, Reddit) + registry
data/              JSON data files (source of truth for both UI and agents)
  field-ops/       External action execution data (tasks, services, vault, safety limits)
scripts/           Build and utility scripts
```

## Claude Code Integration

Mission Control is designed to work with [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Agents operate by reading and writing the JSON data files. See [CLAUDE.md](../CLAUDE.md) for the full agent operations manual, including data schemas, communication protocols, and slash commands.

## License

[MIT](../LICENSE)
