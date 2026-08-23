# Fabrica — The Business-First Autonomous Operating System

> ### **Turn RAW BUSINESS SYSTEMS into AUDITED CLIENT DELIVERABLES via AUTONOMOUS OPERATIONS.**
> #### *AI knows how to reason. Fabrica gives it the 24/7 autonomous business pipeline.*
> **Stop prompting. Draft, plan, execute, and verify — from a single Dashboard, with zero technical setup.**

---

<img width="1200" height="896" alt="_Fabrica Banner" src="https://github.com/user-attachments/assets/35242a46-86ef-4ace-ad7f-e67856f92b8d" />

---

Fabrica is a Business-First autonomous operating system engineered for **non-technical solopreneurs, independent consultants, small marketing/creative agencies, small startup ops & growth teams, and researchers & analysts**. While standard AI chat interfaces execute transient single-turn queries and quickly lose context, Fabrica provides full control over a structured, repeatable 24/7 autonomous 4-stage business pipeline (**Drafting ➔ Planning ➔ Execution ➔ Delivery**), entirely from the UI, with **zero technical setup**.

---

## 🌟 The Core Value Proposition

### The Problem
Traditional AI chat interfaces suffer from severe context loss and lack business structure. Every new chat session forces non-technical founders, consultants, and agency teams to re-explain client context, re-upload background materials, and manually copy-paste AI responses into proposals, decks, or spreadsheets.

### The Fabrica Solution
Fabrica organizes all your research sources, client briefs, strategic plans, and execution deliverables into a single **persistent business operating system**:
* **Zero Technical Setup**: 100% UI-controlled workspace. Select your preferred model brain (Google Gemini, Anthropic Claude, or OpenRouter), click to execute, and monitor progress without writing code or managing developer environments.
* **Structured 4-Stage Mission Pipeline**: Every mission flows through **Drafting ➔ Planning ➔ Execution ➔ Delivery** with dedicated sub-phases, automated QA gates, and 3-choice strategic option trade-offs before final delivery.
* **Persistent Business Memory**: Your strategic briefs, research sources, audit trails, and client deliverables reside in a secure, multi-tenant relational database engine. Resume any project with zero context drift.
* **24/7 Autonomy Mode**: Set your autonomy preferences (DIRECTOR, WORKER, OFF) and let Fabrica run background research rounds, market tracking, and pipeline tasks even after you close the browser tab.
* **Structured Workspace & Storage Layer**: Separate dedicated folders per phase (`Sources/` for scoping, research, and synthesis inputs; `Deliverables/` for execution outputs and client reviews) with full audit capabilities.

---

## 🎯 Target Audience & Core Use Cases

Fabrica is built specifically for operators who need repeatable research ➔ analysis ➔ deliverable pipelines without hiring analysts or writing prompts every time:

1. **Independent Consultants**: Automate market research, competitor audits, and client strategy briefs so you sell high-value judgment, not billable research hours.
2. **Small Marketing & Creative Agencies**: Standardize output quality across all accounts with repeatable autonomous pipelines and custom agency skills.
3. **Solopreneurs & DTC Founders**: Run an autonomous research, market intelligence, and operations team without hiring staff or needing technical dev skills.
4. **Startup Ops & Growth Teams**: Generate data-backed growth playbooks, competitive tracking matrices, and strategic proposals fast without waiting on engineering capacity.
5. **Researchers & Analysts**: Build defensible audit trails with verified citations and automatic fact-checking before final report delivery.

---

## 🚀 Key Platform Features & Workspace Experience

### 1. Modern 3-Panel Workspace
* **Global Header Controls**:
  * **Model Selector & Thinking Level**: Switch seamlessly between AI model brains (`gemini-3.6-flash`, `claude-3-5-sonnet`, `openrouter/`, etc.) and set reasoning depth (`off, minimal, low, medium, high, xhigh, max`) via `--thinking`.
  * **Active Session Switcher**: Minimized session badge (`Session 1`) with a dropdown switcher to manage, create, rename, or delete chat sessions. Full conversation histories persist per tenant with active-turn protection and `.jsonl` disk cleanup.
  * **`+` Context Picker Modal & Dismissible Chips**: Attach file drops, active missions, and workspace data assets directly to the prompt payload with visual chip management.
  * **Live UI Streaming & Context Progress Bar**: Real-time SSE streaming (`POST /api/harness/run-stream`) text output with a live context window usage bar (`piContext` percentage meter).
  * **Live Voice Trigger (🎙️)**: Streaming voice channel button providing real-time audio interaction.
* **Consolidated 2-Section Account & API Modal**:
  * **Section 1 (👤 Account & Workspace)**: Workspace Identity, Token Usage Quota Meters, Subscription Plans, and Support Email (`fabrica.studio.contact@gmail.com`).
  * **Section 2 (🔑 Tokens & API Credentials)**: Tier-gated Method Selector (`FREE | Credit | PAUS | BYOK`) with provider-specific key fields, BYOK key persistence, and quota alerts.
* **Unified Skills & Integrations Modal (`🛠️ Integrations`)**:
  * **Preset Integrations Grid**: Platform-native integrations and server-side modules (`Fabrica_kernel/integrations/`).
  * **Workspace Skills Editor**: Per-skill toggle for custom workspace skills (`.pi/skills/`) with structured YAML frontmatter parsing (`What`, `When`, `Why`, `Triggers`, `Inputs`, `Outputs`).
* **Panel A (System Maps & Configs)**:
  * **3-Level Autonomy Selector**: Switch between **DIRECTOR** (auto-synthesizes contextual missions and executes pipeline tasks), **WORKER** (auto-executes planned tasks while holding at QA gates), and **OFF** (manual approval at every gate).
  * **Real-time 5s Polling**: Automatically streams background mission creation and deliverable progress to the screen.
* **Panel B (Missions Board & Chat)**:
  * Horizontal project board managing work across 4 status stages (**Drafting**, **Planning**, **Execution**, **Delivery**).
  * **Top-Bar Minimizing Toggle**: Collapses section into a top bar displaying live metrics (total missions, stage breakdown, high-priority count).
  * High-density **Quick Injections Panel**: 2-card prompt suggestions grid directly under chat controls.
* **Panel C (50/50 Split Storage & Artifacts View)**:
  * Expanded dual-column layout providing equal 50% width columns for **Sources** (`raw_data`) and **Deliverables** (`system_components`).
  * **Top-Bar Minimizing Toggle**: Collapses section into a right sidebar displaying live metrics (total subsystems count, document count).
  * Sub-section search filters, import/export triggers, and D3 force-directed dependency visualization toggles.
* **Live App Preview & Code Editor**:
  * **Top-Bar Minimizing Toggle**: Collapses both Preview and Editor into a bottom bar displaying live metrics (Preview status indicator, active file path).
  * **Sub-System Filtered Dropdown**: Editor dropdown filters dynamically to show only files and folders inside the currently selected sub-system (e.g. `workspace/Data Analysis & Pattern Extraction/`).
  * Cleaned top-bar layout with removal of "⚡ Live Sync" text label.

### 2. Enterprise Modular Backend Engine & Interactive Daemon Architecture
* **Interactive Daemon Session & Strict Single Daemon Policy (`src/core/harness.ts`)**: Migrated all execution pathways from static `pi -p --mode json` commands to persistent interactive daemon sessions (`PiDaemonProcess`). Enforces a strict 1:1 binding per tenant ID with zero concurrent daemon threads per tenant.
* **Workspace CWD & Native Session Isolation**: Working directory is explicitly bound to `/workspaces/<tenantId>/`. Utilizes `PI_CODING_AGENT_DIR=/workspaces/<tenantId>/.pi/` with native `pi` CLI session management inside `.pi/agent/sessions/`.
* **Path Traversal Security (`src/core/tenant.ts`)**: Path resolving is protected by absolute boundary verification (`path.resolve` verifying target paths start with `/workspaces/<tenantId>`).
* **Environment & API Key Hygiene (`src/core/auth.ts`)**: Managed LLM key pool rotation (`.stash/auth.json`) and BYOK keys are strictly scoped by model strategy. Tenant processes never inherit server master secrets unexpectedly.
* **Domain Engine & Modular API Routes (`src/core/` & `src/api/routes/`)**: Clear separation across 5 core domains: `auth` (`auth.ts`), `tenant` (`tenant.ts`), `harness` (`harness.ts`), `missions` (`missions.ts`), and `workspace` (`workspace.ts`).

---

## 🏛️ Inside the Agent Kernel & Workspace Architecture

Fabrica isolates its core intelligence into a read-only **Agent Kernel** (`/Fabrica_kernel/`), separating kernel laws and workflows from tenant workspace data:

```
Fabrica/
├── .stash/                            # Global Shared Storage
│   └── auth.json                      # Shared auth state, master credentials, managed LLM key pools, & BYOK configs
├── Fabrica_kernel/                    # Read-only System Kernel Instructions
│   ├── integrations/                  # Server-side integration modules & skill bridges
│   ├── system_prompts/                # Kernel System Laws & Operational Guides (01_identity.md .. 07_app_guide.md)
│   └── skills/                        # Read-only Built-in Kernel System Skills
├── workspaces/<tenant_id>/            # Clean Isolated User Workspace
│   ├── .pi/                           # Hidden Pi Agent Runtime Folder
│   │   ├── agent/sessions/            # Native Pi agent session history (.jsonl files)
│   │   └── skills/                    # Custom AI skills created for this tenant
│   ├── workspace/                     # File & Project Storage
│   │   ├── Sources/                   # Uploaded documents, data sources, & reference files
│   │   └── Deliverables/              # AI-generated artifacts, reports, & code deliverables
│   ├── missions/                      # Active Mission Working Folders (<missionId>/)
│   ├── AGENTS.md                      # Persistent instruction guidelines for the AI agent
│   ├── tenant.json                    # Tenant profile, user preferences, telemetry metrics, & audit logs
│   ├── harness.json                   # Live daemon state, selected model, suggestions, autonomy, & harness options
│   ├── missions.json                  # Light JSON database tracking all active & past missions
│   └── workspace.json                 # Single index mapping Sources, Deliverables, Pendings, Actions, & Action Items (items flagged as actions with type, level, description, when_to_use, triggers, & flagged_as_action attributes)
├── src/                               # Enterprise Core Domain Engines & API Routes
│   ├── api/
│   │   ├── middlewares/               # Express auth & error middlewares
│   │   └── routes/                    # Domain API Routers (auth, tenant, workspace, missions, harness)
│   ├── core/                          # Domain Core Engines & Co-located Types
│   │   ├── auth.ts                    # Auth, BYOK keys, managed LLM key pool rotation, pricing tiers
│   │   ├── tenant.ts                  # Tenant lifecycle, database persistence, profile, telemetry, audit logs
│   │   ├── harness.ts                 # Pi CLI background daemon, interactive session manager, prompt loader
│   │   ├── missions.ts                # Workflow pipeline orchestrator, step blueprints, mission state machine
│   │   └── workspace.ts               # Multi-tenant hybrid filesystem, phase storage, cloud sync
│   └── utils.ts                       # Vertex AI Search & system utilities
├── server.ts                          # Express 4 API server entrypoint
└── frontend-next/                     # Next.js 16 App Router Client Application
    ├── app/                           # App pages (Main Workspace page.tsx & Dashboard page.tsx)
    └── components/                    # Domain modular UI & state modules (auth, tenant, harness, missions, workspace, api.ts)
```

---

## 🛠️ Technology Stack

* **Frontend Framework**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide React
* **Graph & Data Visualization**: Cytoscape.js, D3.js, Recharts
* **Backend Server**: Node.js 22, Express 4, `tsx` / Esbuild
* **Authentication & Persistence**: Supabase Auth, Tenant-Isolated JSON Storage & Local Schema Fallbacks
* **Storage & RAG Search**: Google Cloud Storage (CMEK), Vertex AI Search Discovery Engine
* **Code Execution**: Node.js `vm` (Isolated Virtual Machine Context)

---

## ⚙️ Quick Start & Development

### Environment Requirements
* Node.js >= 20.x or Bun >= 1.1
* Nginx or Port 3000 accessibility

### Installation & Startup

```bash
# 1. Install dependencies
npm install

# 2. Build static frontend assets
npm run build:frontend

# 3. Start development server on Port 3000
npm run dev

# 4. Production build & bundle start
npm run build
npm run start
```

---

## 📬 Contact & Support

For inquiries, enterprise deployments, and feedback, contact the team at:
* **Official Email**: `fabrica.studio.contact@gmail.com`


## 🛡️ License & Copyright

© 2026 Fabrica. AI knows how to build, we show it what. All rights reserved.
