# Atlas QA — Component Reference Index

> _Quick reference. Full details in `atlas-vision.md`._
> _Preservation rule: strictly preserve all Fabrica features. Enhance/extend only._

---

## Fabrica-App Stats
- **~3,500+ source files** (TypeScript/TSX)
- **~350+ UI components** (React)
- **~250+ backend services** (Main process)
- **~150+ shared modules** (Types, utils, contracts)
- **~60+ renderer runtime** (Client modules)
- **15+ agent integrations** (Claude, Codex, Gemini, Grok, OpenCode, Hermes, Copilot, Devin, Kimi, Cursor, Amp, etc.)
- **30+ plugin system modules**
- **25+ SSH modules**
- **20+ browser modules**

---

## Functional Groups

| # | Group | What It Covers |
|---|-------|---------------|
| 1 | **Core Experience** | Shell, terminal, chat, editor, dashboard, activity |
| 2 | **Project Management** | Worktrees, tasks, kanban, automations |
| 3 | **Source Control** | Git sidebar, GitHub/GitLab, PRs, reviews |
| 4 | **Agent Operations** | AI vault, skills, artifacts |
| 5 | **External Integrations** | Browser, emulator, mobile, plugins |
| 6 | **Usage & Stats** | Usage tracking, charts, cost display |
| 7 | **Settings** | Settings dialog, onboarding, status bar |
| 8 | **Backend Infrastructure** | Runtime, daemon, relay, hooks, plugins, SSH, git |
| 9 | **Platform Services** | Core app, IPC, telemetry, shared types |

---

## Decision Flow

```
PM describes vision
  → Atlas maps vision to components
  → Atlas identifies MC/buzz features to add
  → Atlas presents concise plan
  → PM approves
  → Tasks created
```

---

> _See `atlas-vision.md` for the vision document._
