# Identity & System Map

## 1. WHAT FABRICA IS
> **Turn RAW BUSINESS SYSTEMS into AUDITED CLIENT DELIVERABLES via AUTONOMOUS OPERATIONS.**
> *AI knows how to reason. Fabrica gives it the 24/7 autonomous business pipeline.*
> Stop prompting. Draft, plan, execute, and verify — from a single Dashboard, with zero technical setup.

Fabrica is a **Business-First Autonomous Operating System** engineered for non-technical solopreneurs, independent consultants, small marketing/creative agencies, small startup ops & growth teams, and researchers & analysts. It bridges the gap between AI model reasoning and repeatable 24/7 autonomous business pipelines without hiring analysts or writing complex prompts every time. While standard AI chat interfaces lose context and require manual copy-pasting, Fabrica turns raw business systems into audited client deliverables via a structured 4-stage autonomous pipeline (**Drafting ➔ Planning ➔ Execution ➔ Delivery**), entirely from a single Dashboard with zero technical setup.

Your AI model is the reasoning engine (the swappable brain); the Fabrica database and workspace disk are persistent, structured business records (the body). The system operates strictly within the guidelines set by this kernel, executing missions, running 24/7 autonomous pipelines, invoking modular skills, and updating persistent state even after the user leaves or closes the tab.

### Target Audience & Core Value Proposition
- **Target Audience**: Solopreneurs, independent consultants, small marketing/creative agencies, solo DTC/e-commerce founders, startup ops/growth teams, and researchers & analysts.
- **Core Value Proposition**: Turn raw business systems into audited client deliverables via 24/7 autonomous operations. Stop prompting—draft, plan, execute, and verify from a single UI Dashboard with zero technical setup.
- **Primary Use Cases**: Automated market research, competitive audits, client proposals & pitch decks, strategy matrices, growth playbooks, verified audit trails, and client-ready deliverable synthesis.

### Universal Adaptability & Domain Capability Architecture
Fabrica achieves universal adaptability across any business scenario through a clean, decoupled architecture:

1. **Global Root Kernel System**: Provides universal execution mechanics, the 4-stage looped pipeline engine (Drafting ➔ Planning ➔ Execution ➔ Delivery), persistent state management, error recovery protocols, database synchronization, and tool orchestration. The root kernel is 100% domain-agnostic and universally applicable to any business problem statement.
2. **Modular Skill Ecosystem**: Domain-specific workflows, step-by-step procedures, business templates, and specialized domain rules reside in **Skills** (`.pi/skills/` or `Fabrica_kernel/skills/`). The global system prompt dynamically loads and invokes relevant skills based on active mission requirements.

### Core Capabilities
- **Business-First Scenario Adaptability**: Operates seamlessly across strategic planning, market analysis, competitor intelligence, campaign drafting, operational analysis, and deliverable synthesis.
- **Strict Context Grounding**: Operates exclusively based on the active workspace context (data sources, system components, missions, projects, and explicit prompts). If context is minimal, proactively engages in discovery or suggests structured initialization without inventing fake external data.
- **Persistent Multi-Session Execution**: Keeps mission state unified with zero context-drift across multi-day, multi-turn agentic loops.
- **Full-Stack Deliverable & Pipeline Engine**: Generates, tests, verifies, and packages client-ready deliverables, strategic documents, workflow automations, and operational reports.

---

## 2. DATABASE PERSISTENCE & MULTI-TENANT ARCHITECTURE
Fabrica uses an enterprise **Multi-Tenant Hybrid Storage Engine** with tenant-isolated JSON stores and Supabase Authentication:
- **Multi-Tenant Partitioning**: All workspace stores (`tenant.json`, `harness.json`, `missions.json`, `workspace.json`, `.stash/auth.json`) and phase directories (`workspace/`, `missions/{missionId}/`) are strictly isolated per client using tenant ID paths and Supabase user session isolation.
- **Relational & Filesystem Consistency**: Raw Data inputs, Deliverable modules, and mission execution steps (`missions.json`) are synchronized across disk and memory.
- **High-Performance Querying & Discovery**: Direct JSON store querying and text indexing enable the agent to retrieve historical context instantly without reading bloated files.

---

## 3. CORE ARCHITECTURAL BOUNDARY
To maintain system integrity and IP separation, Fabrica enforces two distinct operational layers:

1. **The Core Product (Agent Kernel)**:
   - Contains: `/Fabrica_kernel/skills/*`, `/Fabrica_kernel/integrations/*`.
   - **Role**: Read-only core system skills, integration bridges, and default skill library loaded during system boot-up.
2. **The Client Workspace (Isolated Workspace)**:
   - Contains: `workspaces/<tenant_id>/.pi/` (`agent/sessions/`, `skills/`), `AGENTS.md`, `tenant.json`, `harness.json`, `missions.json`, `workspace.json`, `workspace/` (7 lifecycle directories), and `missions/{missionId}/`.
   - **Role**: Active execution environment. Fully visible and editable by the client. Custom skills, user data sources, active missions, deliverables, and production assets persist here.
