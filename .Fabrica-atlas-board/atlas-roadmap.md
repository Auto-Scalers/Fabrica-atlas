# Fabrica Transformation Roadmap

> Master plan for Fabrica's evolution. This file defines WHAT we're building and WHY.
> Implementation details live in batch files (`atlas-roadmap-Batch-1-extended.md`, etc.)
> and in sub-project task files.

---

## The Problem

Fabrica is a fork of Orca (`stablyai/orca`). Orca keeps updating — many times a week. Every time we sync upstream changes, we risk breaking our customizations. The more features we build directly on the fork, the harder syncing becomes.

**Current state:**
- Fabrica-update pipeline works (v3, 89% done) — we CAN sync Orca changes
- Atlas Batch 2 envisions massive features built directly on the fork
- Those features on a moving fork = constant breakage

**The conflict:** We need business features Orca doesn't provide. Building them on a fork we don't control means every upstream sync threatens our work.

---

## The New Vision

We build the ERP first. We forget Fabrica for now (integrations and human users come last).

**What we're building:**

1. **Self-hosted Odoo ERP** — real human users manage business operations. Not AI agents as users. Standard Odoo users.
2. **n8n automations** — workflows for business automation. n8n AI nodes used when a workflow needs an LLM call (scoring, drafting, extracting). Not autonomous agents.
3. **Fabrica-Crew skills** — skills read by real humans. One unified skill explains the entire system. One skill per user explains their role, what they do, why they do it, and how to use the ERP and automations.
4. **Future phase:** We see how we turn those human users into agents — gradual transition from human work to agent work.

---

## The Solution

**Stop building business logic on the fork.**

Instead, build three independent systems connected through clean boundaries:

- **Fabrica-ERP** (self-hosted Odoo) — the business operations platform
- **Fabrica-n8n** (self-hosted n8n) — the automation engine
- **Fabrica-Crew** (skills) — what humans read to understand their work

Fabrica (the app) stays separate. We keep its integrations for the last phase.

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE NEW ARCHITECTURE                         │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐   │
│  │  FABRICA-ERP    │    │  FABRICA-N8N    │    │ FABRICA-   │   │
│  │  (Self-hosted   │    │  (Self-hosted  │    │ CREW       │   │
│  │   Odoo ERP)     │    │   n8n Engine)   │    │ (Skills)   │   │
│  │                 │    │                 │    │             │   │
│  │  Real humans    │    │  Workflows      │    │  Humans     │   │
│  │  manage work    │    │  + AI nodes     │    │  read skills│   │
│  │                 │    │  (LLM calls)    │    │             │   │
│  │                 │    │                 │    │  • Unified  │   │
│  │                 │    │                 │    │  • Per-role │   │
│  └────────┬────────┘    └────────┬────────┘    └──────┬──────┘   │
│           │                      │                     │         │
│           └──────────────────────┼─────────────────────┘         │
│                                  │                              │
│                     ┌────────────▼─────────────┐               │
│                     │   INTEGRATIONS (LATER)   │               │
│                     │  • Fabrica connections   │               │
│                     │  • Human review loops    │               │
│                     └───────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Principles

### Independence

Each system runs independently. Each can be edited, updated, or replaced without consequences on the others:

- **Fabrica-ERP** (Odoo): Can be updated, modules added, users changed — no effect on n8n or skills
- **Fabrica-n8n** (n8n): Workflows can be created, modified, deleted — no effect on ERP or skills
- **Fabrica-Crew** (skills): Skills can be edited, roles added, descriptions changed — no effect on ERP or n8n
- **Fabrica (app)**: Can sync Orca updates freely — business logic is not in the fork

### Implement, Don't Customize

We do NOT develop custom Odoo modules from scratch. We:
- Install existing Odoo modules (CRM, invoicing, inventory, accounting, project, etc.)
- Configure them for our use case
- Connect them to n8n through standard APIs and webhooks

n8n workflows compose existing nodes (400+ integrations). AI nodes call LLMs when needed. No custom code for the core.

---

## The Three Repos

### Repo 1: Fabrica-ERP (Self-Hosted Odoo)

**What it is:** A self-hosted Odoo instance configured for our use case.

**What it has:**
- Real human users (`res.users`) — employees, managers, reviewers
- Standard Odoo modules installed and configured (see module list below)
- Database, admin UI, API endpoints
- Human review and approval workflows

**What it does NOT have (yet):**
- AI agents as users (future phase)
- Custom code modules (we implement, we don't develop)
- Fabrica app integration (last phase)

**Modules installed:**

| Function | Module | What It Does |
|----------|--------|-------------|
| CRM | `crm` | Lead management, pipeline |
| Sales | `sale` | Orders, quotations |
| Accounting | `account` | Invoicing, payments |
| Inventory | `stock` | Products, warehouses |
| Project | `project` | Tasks, timelines |
| Helpdesk | `helpdesk` | Support tickets |
| Manufacturing | `mrp` | Production |
| Purchase | `purchase` | Vendors, POs |
| HR | `hr` | Employees |
| Email | `mail` | Email templates |
| Website | `website` | Online presence |

---

### Repo 2: Fabrica-n8n (Self-Hosted n8n)

**What it is:** A self-hosted n8n instance with our automation workflows.

**What it has:**
- Workflow definitions (exported JSON or version-controlled)
- Trigger configurations (cron, webhook, event)
- AI node configurations (LLM calls for scoring, drafting, extraction)
- Integration connections to Odoo (Odoo node) and external services

**What n8n does:**
- Automates business processes (email sequences, reporting, data sync)
- Uses AI nodes for intelligent decisions (scoring leads, drafting replies, extracting data from documents)
- Connects Odoo to external tools (Gmail, Sheets, APIs, etc.)
- Logs everything for audit

**What n8n does NOT do:**
- Run autonomous agents (nodes are workflow steps, not agents)
- Replace human judgment (approval steps stay in Odoo for humans)
- Store business data (Odoo is the database; n8n passes data through)

---

### Repo 3: Fabrica-Crew (Skills for Humans)

**What it is:** The documentation and skill files that real humans read.

**What it has:**

**Skill 1 — Unified Skill (`SKILL.md` or similar):**
- What the entire system is (ERP + n8n + skills)
- How the parts connect
- What humans can do in Odoo
- What automations exist in n8n
- Where to find help
- Safety rules
- Future: how humans may become agents

**Skill 2 — Per-Role Skills (one per user/role):**
Each real human user has a skill file that explains:
- Their role title and purpose
- What they do (tasks, decisions, approvals)
- Why they do it (how their work connects to business outcomes)
- How to use the ERP (which modules, which actions)
- How to use the automations (which n8n workflows they can trigger or review)
- When to escalate (approval rules, red/yellow/green actions)
- How this role may transition to agent work in the future

**Example roles (each gets their own skill file):**
- Sales Manager (reviews leads, approves discounts, monitors pipeline)
- Operations Manager (monitors inventory, approves orders, reviews reports)
- Customer Support (responds to tickets, uses helpdesk, approves escalations)
- Finance Manager (reviews invoices, approves payments, monitors budgets)
- Human Reviewer (monitors automations, approves AI outputs, audits logs)

**What skills are NOT:**
- Not instructions for autonomous agents (agents don't exist yet)
- Not code or configuration files
- Not embedded in any system (they're standalone markdown files humans read)

---

## The Human User Model

**Real humans are the users of the ERP.** Not AI agents.

```
Odoo User = Real Human
├── Has login credentials
├── Has role (sales, ops, support, manager, reviewer)
├── Has permission level (read, write, approve)
├── Reads their role skill (SKILL.md)
├── Uses Odoo modules (CRM, sales, inventory, etc.)
├── Triggers/reviews n8n workflows
└── Approves/rejects automated actions
```

**The transition to agents (future phase):**
- We observe which tasks humans do routinely
- We see which approvals are standard (not exceptions)
- We design automation workflows (n8n) to handle routine tasks
- We design agent behaviors for autonomous work
- We gradually replace or augment human work with agent work
- Human users become supervisors/reviewers of agent work

---

## n8n AI Nodes — When and How

n8n AI nodes are used ONLY when a workflow needs an LLM call. They are NOT agents.

**When we use AI nodes:**
- Lead scoring (LLM reads lead info → outputs score → n8n updates Odoo)
- Email drafting (LLM reads context → drafts reply → n8n sends for approval)
- Document extraction (LLM reads PDF/invoice → extracts data → n8n pushes to Odoo)
- Content generation (LLM reads brief → generates text → n8n saves to record)

**When we DON'T use AI nodes:**
- Routine data sync (use standard nodes)
- Scheduled reports (use query nodes)
- Approval steps (use human review in Odoo)
- Workflow logic (use conditions, loops, switches)

**AI node pattern:**
```
Trigger → Data Fetch → [AI Node: LLM call] → Data Transform → [Human Approval in Odoo] → Action
```

---

## Integration with Fabrica (Last Phase)

Fabrica stays separate. Its integrations come at the end.

**When we connect Fabrica:**
- Fabrica agents can trigger n8n workflows
- Fabrica agents can read/write Odoo data via API
- Fabrica's integration skill explains the connection
- Human users in Odoo can still review/approve anything Fabrica triggers

**But for now:** No Fabrica connection. We build the ERP, the automations, and the skills first.

---

## File Structure (New Repos)

```
Fabrica-ERP/
├── README.md                  # Self-hosted Odoo setup, modules, users
├── config/
│   └── odoo.conf              # Odoo configuration
├── modules/
│   └── [installed module refs]  # References to standard Odoo modules
└── users/
    └── [user accounts config]  # Human user setup

Fabrica-n8n/
├── README.md                  # Self-hosted n8n setup, workflow list
├── workflows/
│   ├── lead-qualification.json
│   ├── weekly-reporting.json
│   ├── invoice-processing.json
│   └── ...
├── nodes/
│   └── ai-node-configs.md     # When and how AI nodes are used
└── integrations/
    └── odoo-webhook.md        # How n8n connects to Odoo

Fabrica-Crew/
├── SKILL.md                   # Unified system skill (for all humans)
├── roles/
│   ├── sales-manager.md
│   ├── operations-manager.md
│   ├── customer-support.md
│   ├── finance-manager.md
│   ├── human-reviewer.md
│   └── [other roles].md
└── future/
    └── agent-transition.md    # How humans may become agents
```

---

## How It All Works (Human-First Flow)

```
Real Human User
    ↓
Reads Role Skill (SKILL.md in Fabrica-Crew)
    ↓
Logs into Odoo (Fabrica-ERP)
    ↓
Uses Odoo modules (CRM, sales, inventory...)
    ↓
Triggers/Reviews n8n Workflows (Fabrica-n8n)
    ↓
AI Nodes call LLM when needed (scoring, drafting, extracting)
    ↓
Results saved back to Odoo
    ↓
Human approves/rejects (approval rules in Odoo)
    ↓
Audit logs in Odoo + n8n execution history
```

---

## Target Use Cases (Human-First)

> Source: `atlas-roadmap-Batch-3-extended.md` — n8n business automation adapted for human users

### Tier 1 — High ROI, Start Here (Humans + n8n)

| # | Use Case | What Human Does | What n8n Does | LLM Used? |
|---|----------|----------------|---------------|-----------|
| 1 | Lead Qualification | Reviews score | Form → CRM → score → assign | Yes (scoring) |
| 2 | Automated Sales Follow-up | Approves sequences | Behavior tracking → sequences | Yes (drafting) |
| 3 | Weekly Reporting | Reviews report | Consolidate KPIs → generate report | Yes (summary) |
| 4 | Email Triage | Approves routing | Classify → route → queue | Yes (classification) |
| 5 | Customer Onboarding | Reviews welcome docs | Welcome sequences → access setup | No |

### Tier 2 — Medium ROI (Humans Review Automation)

| # | Use Case | Human Role | n8n Role | LLM Used? |
|---|----------|-----------|----------|-----------|
| 6 | Invoice Processing | Approves final invoice | PDF → extract → ERP entry | Yes (extraction) |
| 7 | CRM-Billing Sync | Reviews sync errors | Connect → sync data | No |
| 8 | Overdue Payment Alerts | Reviews escalations | Monitor → alert → remind | No |
| 9 | Support Reply Drafts | Approves reply before send | Read → draft → queue for approval | Yes (drafting) |
| 10 | Meeting Notes → Tasks | Reviews tasks created | Transcript → extract actions → create tasks | Yes (extraction) |

### Tier 3 — Advanced, Future Phase (Agent Transition)

| # | Use Case | Human → Agent Path | Current State |
|---|----------|-------------------|---------------|
| 11 | Intelligent Lead Assignment | Human approves → agent assigns | Human only |
| 12 | Content Brief → Draft | Human reviews → agent writes | Human + n8n AI node |
| 13 | Competitor Monitoring | Human reviews alerts → agent tracks | Human + n8n AI node |
| 14 | AI Customer Service | Human escalates → agent handles common | Human only |
| 15 | Proposal Generation | Human approves → agent builds proposal | Human + n8n AI node |

---

## The Future: From Humans to Agents

**Phase 1 (Now):** Real humans use Odoo + read skills + trigger/review n8n workflows.

**Phase 2 (Observe):** We see which tasks humans do routinely. Which approvals are standard. Which decisions follow patterns.

**Phase 3 (Automate):** n8n workflows handle routine tasks. AI nodes make standard decisions. Humans review exceptions.

**Phase 4 (Agent):** CLI agents (or equivalent) take over routine autonomous work. They read the same skills humans read. They use the same ERP (Odoo). They trigger/review the same automations (n8n). Human users become supervisors.

**The skills stay the same.** The ERP stays the same. The automations stay the same. Only the actor changes: from human → to agent. The system is designed for this transition.

---

## How Parts Connect (Not Embedded)

```
Fabrica-ERP (Odoo)  ◄─────API/Webhook─────►  Fabrica-n8n (n8n)
     │                                                  │
     │                                                  │
     │                                                  │
     └──────────────────────────────────┐               │
                                        │               │
                              Fabrica-Crew (Skills)      │
                              Humans read these           │
                                        │               │
                              Future: Fabrica (app)       │
                              Agents use these            │
```

**Fabrica-ERP ↔ Fabrica-n8n:** Odoo API (JSON-RPC) + webhooks. Standard connections.
**Fabrica-Crew ↔ Everything:** Humans read skills to understand how to use ERP and automations.
**Fabrica (app) ↔ Everything:** Deferred. Will connect through integration layer when needed.

---

## File Structure (Updated)

```
Fabrica-ERP/
├── README.md
├── config/
│   └── odoo.conf
├── modules/          # References to standard modules
└── users/            # Human user accounts

Fabrica-n8n/
├── README.md
├── workflows/        # Workflow definitions
├── nodes/            # AI node configurations
└── integrations/     # Odoo webhook setup

Fabrica-Crew/
├── SKILL.md              # Unified system skill
├── roles/
│   ├── sales-manager.md
│   ├── operations-manager.md
│   ├── customer-support.md
│   ├── finance-manager.md
│   ├── human-reviewer.md
│   └── ...                 # Per-user role skills
└── future/
    └── agent-transition.md  # Path from humans to agents

Fabrica-atlas/
├── atlas-roadmap            ← this file (master plan, updated)
├── atlas-roadmap-Batch-1-extended.md    # UI/UX (Fabrica-only, deferred)
├── atlas-roadmap-Batch-2-extended.md    # Altari insights (reference)
├── atlas-roadmap-Batch-3-extended.md    # n8n automation details
├── Fabrica-atlas-tasks.md               # Task tracking
└── .Fabrica-atlas-board/                # Planning files
```

---

## Summary (Updated Vision)

| Question | Answer |
|----------|--------|
| What are we building? | Self-hosted Odoo ERP + n8n automations + skills for humans |
| Who uses the ERP? | Real humans (not AI agents yet) |
| What do skills explain? | System overview + per-role instructions (read by humans) |
| When are AI agents used? | Later (future phase). For now: n8n AI nodes for automation only |
| Where does Fabrica fit? | Last phase — integrations and agent transition |
| Can ERP run independently? | Yes — self-hosted Odoo |
| Can n8n run independently? | Yes — self-hosted n8n |
| Do skills work independently? | Yes — markdown files |
| Is Odoo customized from scratch? | No — standard modules, implemented/configured |
| Are n8n nodes autonomous agents? | No — workflow steps, not agents |
| What happens when humans become agents? | Skills stay. ERP stays. Automations stay. Only actor changes. |

---

*Created: 2026-09-08*
*Updated: 2026-09-08 — New vision: Humans first, skills for humans, n8n nodes for automation, agents later*
*Status: Planning — self-hosted Odoo + n8n + skills*
