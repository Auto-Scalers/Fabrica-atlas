# Application & User Interface Guide

> **Brand Mandate**: Turn RAW BUSINESS SYSTEMS into AUDITED CLIENT DELIVERABLES via AUTONOMOUS OPERATIONS.
> *AI knows how to reason. Fabrica gives it the 24/7 autonomous business pipeline.*
> The 3-panel UI layout empowers operators to stop prompting and instead draft, plan, execute, and verify from a single Dashboard with zero technical setup.

This guide describes the physical layout of the Fabrica web application interface. It ensures that the agent understands how users interact with the app, how data binds to the screen, and how to maintain visual consistency when implementing front-end updates.

## 1. THE THREE-PANEL GRID LAYOUT
The application utilizes a classic three-panel responsive layout with a compact global header bar. **You are STRICTLY FORBIDDEN from altering the layout grid, columns, or panel positions.** All code changes must live within the existing visual boundaries.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR: Model Selector | Active Session Badge & Switcher | Live Voice (🎙️)          │
├─────────────────┬───────────────────────────────────┬──────────────────────────────────┤
│                 │                                   │             PANEL C              │
│     PANEL A     │              PANEL B              │         (Right Section)        │
│  (Left Section) │         (Middle Section)          │  Raw Data (50%) | Artifacts (50%)│
│                 │                                   │   [Divided by 1.5px Vertical]    │
│   System Maps   │          Missions Board           │   [Line across header & body]    │
│    & Configs    │        (Horizontal status)        │                                  │
│                 │                                   │  Quick Injections (2 Cards)      │
└─────────────────┴───────────────────────────────────┴──────────────────────────────────┘
```

---

## 2. DETAIL SPECIFICATIONS OF THE DASHBOARD LAYOUT & COMPONENTS

### GLOBAL HEADER CONTROLS
- **Model Selector**: Compact dropdown selector (`chatModel`) permitting instant switching between AI providers (`gemini-3.6-flash`, `claude-3-5-sonnet`, `openrouter/`, etc.) with automatic key mapping and free-tier fallbacks.
- **Active Session Switcher**: Minimized active session badge (`Session 1`, etc.) with a trigger button that toggles the Chat Sessions dropdown menu. Supports creating, renaming, and deleting chat sessions. Full conversation histories are saved instantly to tenant-isolated `harness.json` and local storage, ensuring full chat recovery on logout and re-login.
- **Live Voice Stream Trigger (🎙️)**: Located immediately adjacent to the active session indicator. Toggles real-time streaming audio connection with visual active state styling.

### PANEL A: Left Section (Maps & Global Configuration)
- **Purpose**: Exposes global configuration controls, client settings, active domains, and system-wide performance indices.
- **Components**:
  - **Autonomy Mode Selector**: Interactive dropdown binding to `harness.json` (`autonomy`) supporting three modes:
    - **DIRECTOR**: Auto-generates new contextual missions, answers agent QA gates, executes development tasks, and hot-swaps compiled components.
    - **WORKER**: Auto-executes planned tasks while holding user-created missions at QA gates for explicit user review.
    - **OFF**: Manual control requiring user approval for all phase transitions and QA gates.
  - **5s Real-Time Workspace Polling**: When DIRECTOR is active, the dashboard polls backend state every 5 seconds to reflect background mission creation, task completions, and component deployments live.
  - **Recent Events Feed**: A micro-event timeline rendering the last 5 logs from `tenant.json` audit event stream.
  - **System Directories & Sources Flow**: Interactive Cytoscape dependency graph linking Inbox → Gateway → OS Prompts & Data.

### PANEL B: Middle Section (The Missions Board Tracker & Chat)
- **Purpose**: The primary project management board where the user tracks work progression, communicates with the agent, and executes workflows.
- **Top-Bar Minimizing Control**: Features a minimizing toggle icon on the right of the Missions HQ header. When minimized, collapses the Missions board into a top bar displaying live relevant metrics (total mission count, stage breakdown across Drafting/Planning/Execution/Delivery, high-priority count).
- **Vertical Rows (The 5 Types)**:
  - `Standard`
  - `Build Idea`
  - `Build Data`
  - `Enhance System`
  - `Hybrid Enhance Sys/Data`
- **Horizontal Columns (The 4 Statuses)**:
  - `Drafting`
  - `Planning`
  - `Execution`
  - `Archive`
- **Quick Injections Panel**: High-density 2-card prompt suggestion panel rendered under chat controls. Uses a compact 2-column grid (`gridTemplateColumns: 'repeat(2, 1fr)'`) with stacked title and description text, truncation, and zero horizontal overflow.

### PANEL C: Right Section (Sources & Deliverables Management - 50/50 Split)
- **Purpose**: Explicitly designed to manage data inputs, scoping parameters, research, strategic plans, execution outputs, reviews, completed release deliverables, and flagged action items with full metadata support (`type`, `level`, `description`, `when_to_use`, `triggers`, `flagged_as_action`).
- **Top-Bar Minimizing Control**: Features a minimizing toggle icon on the left of the Workspace top-bar. When minimized, collapses the workspace section into a right sidebar displaying live relevant metrics (total subsystem count, total document/artifact count).
- **Dual Section Layout**:
  - Fully expanded flex-stretch container dividing **Sources** (`Discovery & Scoping`, `Deep Research`, `Data Analysis`, `Strategic Synthesis`) and **Deliverables** (`Executions`, `Reviews`, `Completed`) into equal 50% width columns.
  - **Action Items Tracking**: Dedicated `action_items` index collection in `workspace.json` tracks items requiring execution action.
  - **Vertical Divider Line**: A crisp `1.5px solid var(--border-soft)` vertical separator line spans continuously between the left (Sources) and right (Deliverables) sub-sections in both the top action header and the main body list container.
  - **Sub-section Controls**:
    - **Sources (Left 50%)**: Contains source sub-section filter, semantic search input, import button, and list/graph view toggles.
    - **Deliverables (Right 50%)**: Contains deliverable stage filter, search input, export button, and deployment/approval controls.

### LIVE APP PREVIEW & EDITOR SECTION
- **Purpose**: Live application code preview and interactive code editor for inspecting and editing workspace deliverables and scripts.
- **Top-Bar Minimizing Control**: Features a minimizing toggle icon on the right of the Editor top-bar. When minimized, collapses both the Preview and Editor sections into a bottom bar displaying live metrics (Preview status indicator, active file path).
- **Sub-System Filtered Dropdown**: The files and folders dropdown in the Editor top-bar filters dynamically to display ONLY the files and folders inside the currently selected sub-system (e.g., if editing a file from Data Analysis & Pattern Extraction, the dropdown shows only items inside `workspace/Data Analysis & Pattern Extraction/`).
- **Clean Editor Top Bar**: Cleaned top-bar layout with the removal of "⚡ Live Sync" text label for a uncluttered developer interface.

### CONSOLIDATED 2-SECTION ACCOUNT & API CREDENTIALS MODAL
- **Structure**: All account, workspace, billing, BYOK credentials, model routing, load balancer, and PAUG features are consolidated into **EXACTLY TWO (2)** top-level sections:
  1. **👤 Section 1: Account & Workspace**:
     - **Workspace Identity & Security**: Renders active tenant email, username, company name, entity path, tenant space ID, and current subscription plan badge with session termination controls.
     - **Usage Quota & Token Alerts**: Visual meter rendering monthly LLM token allowance, percentage used, remaining tokens, and status alert banners.
     - **Subscription Plans & Enterprise Tiers**: Interactive 3-card pricing grid (Starter, Professional, Enterprise) managed via Stripe Gateway.
     - **Payment Method (Stripe Billing)**: 256-bit encrypted card input fields (Card Number with auto brand detection, Expiry, CVC) with $0 verification trigger.
  2. **🔑 Section 2: Tokens & API Credentials**:
     - **BYOK Multi-Provider Credentials**: Encrypted inputs for Google AI Studio, OpenRouter, and Anthropic Claude keys with live validity verification badges (`✓ VERIFIED` / `✕ INVALID KEY`).
     - **User Harness Engine & Model Intelligence**: Active harness engine indicator, model routing selector (`chatModel`), free-only filter, auto-free fallback toggle, and active model rate limits and cost intel.
     - **Free Tokens Pool & Key Load Balancer**: Multi-key system load balancer metrics (active keys count and lock isolation states) with inline form to register new keys into the system pool.
     - **Managed LLM Credits & PAUG Infrastructure**: Managed token balance, usage history log, and top-up refill controls ($10, $25, $50).

---

## 3. DESIGN POLISHING CONSTRAINTS
- **Theme**: Clean, off-white background with high-contrast charcoal typography, accented by thin dark-gray borders (`var(--border-soft)`). Use deep indigo or emerald colors for action items. Avoid glowing gradient backgrounds or tech-larping console screens unless explicitly requested.
- **Interaction Feedback**: Every card selection, file upload, or button click must have smooth, visual hover and active states (using Tailwind transitions: `transition-all duration-200 hover:scale-[1.01] hover:shadow-sm`).
- **Data Load Skeletons**: Show subtle, quiet skeleton load screens (`animate-pulse`) when fetching raw file contents or compiling system outputs, rather than freezing the screen.
