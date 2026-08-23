# Fabrica Next.js Client Application

> ### **Turn RAW BUSINESS SYSTEMS into AUDITED CLIENT DELIVERABLES via AUTONOMOUS OPERATIONS.**
> #### *AI knows how to reason. Fabrica gives it the 24/7 autonomous business pipeline.*
> **Stop prompting. Draft, plan, execute, and verify — from a single Dashboard, with zero technical setup.**

This directory contains the Next.js static client frontend for **Fabrica — The Business-First Autonomous Operating System**.

## Architectural Highlights

- **Business-First Positioning**: Built specifically for **Independent Consultants, Small Marketing Agencies, Solopreneurs, Startup Ops & Growth Teams, and Researchers & Analysts**.
- **3-Panel Dashboard (`app/dashboard/page.tsx`)**:
  - **Panel A (Mission Control & Skills)**: System Maps, 3-level Autonomy Selector (`FULL AUTO`, `SEMI-AUTO`, `SUPERVISED`), micro-events timeline, and custom workspace skills.
  - **Panel B (4-Stage Mission Pipeline)**: Horizontal Missions Board tracking work across **Drafting ➔ Planning ➔ Execution ➔ Delivery** with automated QA Gates and strategic option trade-offs.
  - **Panel C (Structured Storage Layer)**: 50/50 Split view for **Research & Sources** (`raw_data`: client briefs, CSVs, notes) and **Client Deliverables** (`system_components`: proposals, strategy decks, audit trails) divided by a crisp vertical separator line.
- **Agent Kernel & Prompt Files**: The core agent system instructions and persona prompts are located in `/system_prompts/` (`01_identity.md` to `07_app_guide.md`).
- **Persistent Chat Sessions & Modular API Integration**: Bidirectional sync between local storage (`pboot_chat_sessions_${tenantKey}`) and backend API routes (`/api/auth`, `/api/tenant`, `/api/workspace`, `/api/missions`, `/api/harness`).
- **Live 5s Polling**: Auto-refreshes mission board, runtime logs, and deliverable progress when `FULL AUTO` mode is active.
- **Static Export**: Built via `npm run build:frontend` into `frontend-next/out/` and served directly on Port 3000 by Express in production.

## Development Commands

```bash
# Build static frontend output to frontend-next/out/
npm run build

# Run Next.js standalone dev server
npm run dev
```

