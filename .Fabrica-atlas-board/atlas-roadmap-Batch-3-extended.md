# Atlas Roadmap — Batch 3 Extended: Business Features

---

## Context

The (browser automation for social media/Marketplace) approach had legal (Meta TOS), religious (halal concerns), and technical limitations. After research, we discovered n8n provides legitimate business automation through official APIs.

### New Strategy

- **Backend**: n8n (self-hosted, free, open-source)
- **Frontend**: Custom dashboard for control and monitoring (we will see how it should be Integrated into Fabrica ecosystems)
- **Focus**: Business automation that makes money or saves time

### Why n8n


| Feature                 | Benefit                     |
| ----------------------- | --------------------------- |
| Self-hosted             | Zero cost, data stays local |
| 400+ integrations       | Connect to everything       |
| Visual workflow builder | No-code automation          |
| AI nodes                | Add intelligence to flows   |
| Free tier               | No budget needed            |


---

## Business Automation Use Cases (n8n Capabilities)

### Tier 1 — High ROI, Start Here


| #   | Use Case                       | What It Does                           | Time Saved | Difficulty |
| --- | ------------------------------ | -------------------------------------- | ---------- | ---------- |
| 1   | **Lead Qualification**         | Form → CRM → scoring → assignment      | 14h/month  | Medium     |
| 2   | **Automated Sales Follow-up**  | Lead behavior → personalized sequences | 12h/month  | Low        |
| 3   | **Weekly Reporting**           | Consolidate KPIs from multiple sources | 16h/month  | Low        |
| 4   | **Email Triage &amp; Routing** | Classify emails → route to right queue | 8h/month   | Low        |
| 5   | **Customer Onboarding**        | Welcome sequences, docs, access        | 12h/month  | Low        |


### Tier 2 — Medium ROI, Build After Tier 1


| #   | Use Case                   | What It Does                      | Time Saved | Difficulty |
| --- | -------------------------- | --------------------------------- | ---------- | ---------- |
| 6   | **Invoice Processing**     | PDF → AI extraction → ERP         | 15h/week   | Medium     |
| 7   | **CRM-Billing Sync**       | HubSpot ↔ Stripe ↔ QuickBooks     | 18h/month  | Medium     |
| 8   | **Overdue Payment Alerts** | Auto-reminders, escalation        | 8h/month   | Low        |
| 9   | **Support Reply Drafts**   | AI drafts → human approval → send | 10h/month  | Medium     |
| 10  | **Meeting Notes → Tasks**  | Transcripts → action items → CRM  | 6h/month   | Medium     |


### Tier 3 — Advanced, Future Phase


| #   | Use Case                        | What It Does                            | Time Saved | Difficulty |
| --- | ------------------------------- | --------------------------------------- | ---------- | ---------- |
| 11  | **Intelligent Lead Assignment** | Match leads to salespeople by workload  | 14h/month  | Medium     |
| 12  | **Content Brief → Draft**       | AI generates content from briefs        | 8h/month   | Medium     |
| 13  | **Competitor Monitoring**       | Track changes, alert on updates         | 4h/month   | Low        |
| 14  | **AI Customer Service**         | Handle common queries, escalate complex | 20h/month  | High       |
| 15  | **Proposal Generation**         | Dynamic PDFs from templates + data      | 16h/month  | High       |


---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     DASHBOARD (Frontend)                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ Workflows│  │  Logs   │  │  Stats  │  │ Settings│       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    N8N (Backend Engine)                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ Workflow │  │  AI     │  │ Triggers│  │  Nodes  │       │
│  │ Engine   │  │  Agents │  │         │  │         │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   INTEGRATIONS (External)                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │   CRM   │  │  Email  │  │  Sheets │  │   AI    │       │
│  │ (HubSpot)│  │ (Gmail) │  │ (Google)│  │ (Claude)│       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Dashboard + n8n Relationship

```
┌──────────────────┐     ┌──────────────────┐
│     DASHBOARD    │     │       N8N        │
│                  │     │                  │
│  • View workflows│◄───►│  • Execute flows │
│  • Start/stop    │     │  • Store configs │
│  • See logs      │     │  • Run triggers  │
│  • View stats    │     │  • Connect APIs  │
│  • Manage secrets│     │  • Execute AI    │
│                  │     │                  │
│  (React/Next.js) │     │  (Self-hosted)   │
└──────────────────┘     └──────────────────┘
        │                         │
        │    ┌──────────────────┐  │
        └───►│   SHARED DATA    │◄─┘
             │                  │
             │  • Workflows     │
             │  • Credentials   │
             │  • Execution logs│
             │  • Statistics    │
             └──────────────────┘
```

---

## What We're Building

### Phase 1 — Foundation (Week 1-2)


| ID  | Task                    | Description                         | Status |
| --- | ----------------------- | ----------------------------------- | ------ |
| A1  | n8n self-hosted setup   | Install n8n locally, configure      | TODO   |
| A2  | Dashboard skeleton      | React/Next.js app with routing      | TODO   |
| A3  | n8n API connection      | Dashboard ↔ n8n communication       | TODO   |
| A4  | Workflow list view      | Show all n8n workflows in dashboard | TODO   |
| A5  | Workflow status display | Running/stopped/error states        | TODO   |


### Phase 2 — Control &amp; Monitoring (Week 3-4)


| ID  | Task              | Description                         | Status |
| --- | ----------------- | ----------------------------------- | ------ |
| B1  | Workflow control  | Start/stop/restart from dashboard   | TODO   |
| B2  | Execution logs    | View all workflow runs              | TODO   |
| B3  | Error display     | Show failed executions with details | TODO   |
| B4  | Statistics view   | Success rate, time, volume          | TODO   |
| B5  | Real-time updates | WebSocket for live status           | TODO   |


### Phase 3 — Workflow Templates (Week 5-6)


| ID  | Task                         | Description                         | Status |
| --- | ---------------------------- | ----------------------------------- | ------ |
| C1  | Lead qualification template  | Pre-built workflow for lead scoring | TODO   |
| C2  | Email triage template        | Auto-classify and route emails      | TODO   |
| C3  | Weekly report template       | Consolidate KPIs automatically      | TODO   |
| C4  | Follow-up sequence template  | Automated sales follow-up           | TODO   |
| C5  | Customer onboarding template | Welcome flow automation             | TODO   |


### Phase 4 — AI Integration (Week 7-8)


| ID  | Task                     | Description                      | Status |
| --- | ------------------------ | -------------------------------- | ------ |
| D1  | AI node configuration    | Connect Claude/GPT to n8n        | TODO   |
| D2  | Support reply drafts     | AI drafts responses for approval | TODO   |
| D3  | Meeting notes extraction | Transcripts → tasks              | TODO   |
| D4  | Content generation       | Briefs → drafts                  | TODO   |
| D5  | Data enrichment          | Auto-enrich leads with AI        | TODO   |


### Phase 5 — Dashboard Polish (Week 9-10)


| ID  | Task              | Description                     | Status |
| --- | ----------------- | ------------------------------- | ------ |
| E1  | Settings page     | Manage credentials, API keys    | TODO   |
| E2  | User preferences  | Notification settings, defaults | TODO   |
| E3  | Mobile responsive | Dashboard works on phone        | TODO   |
| E4  | Dark mode         | UI theme options                | TODO   |
| E5  | Documentation     | Setup guide, workflow templates | TODO   |


---

## Integration with Fabrica (Future)

### How This Connects

```
┌─────────────────────────────────────────────────────────────┐
│                    FABRICA ECOSYSTEM                         │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │  Fabrica     │    │  Capabilities│    │  Other      │      │
│  │  (Orchestrator)│  │  (This)     │    │  Projects   │      │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                     ┌──────▼──────┐                          │
│                     │   SHARED    │                          │
│                     │  AUTOMATION │                          │
│                     │   LAYER     │                          │
│                     └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points


| Fabrica Feature  | Capabilities Provides             |
| ---------------- | --------------------------------- |
| Lead management  | n8n workflow templates            |
| Email automation | n8n email workflows               |
| Reporting        | n8n data consolidation            |
| AI agents        | n8n AI node integration           |
| Dashboard        | Control panel for all automations |


### What Fabrica Can Use

1. **Workflow templates** — Pre-built automations for common business tasks
2. **n8n instance** — Shared automation engine
3. **Dashboard** — Central control panel
4. **AI integration** — Intelligent automation capabilities
5. **Execution logs** — Audit trail for all automations

---

## Technology Stack

### Dashboard


| Component | Technology      | Why                       |
| --------- | --------------- | ------------------------- |
| Frontend  | React + Next.js | Fast, modern, SSR         |
| Styling   | Tailwind CSS    | Rapid UI development      |
| State     | Zustand         | Simple, lightweight       |
| API       | REST (n8n API)  | Standard, well-documented |
| Real-time | WebSocket       | Live status updates       |


### Backend (n8n)


| Component    | Technology           | Why                         |
| ------------ | -------------------- | --------------------------- |
| Engine       | n8n self-hosted      | Free, open-source, powerful |
| Database     | SQLite (default)     | Zero config, local-first    |
| AI           | Claude API / OpenAI  | Intelligent automation      |
| Triggers     | Cron, webhook, email | Flexible scheduling         |
| Integrations | 400+ native nodes    | Connect to everything       |


### Infrastructure


| Component       | Technology    | Why                         |
| --------------- | ------------- | --------------------------- |
| Hosting         | Local machine | Zero cost, data stays local |
| Orchestration   | Orca          | Task management             |
| Version control | Git           | Track changes               |
| Backup          | Local files   | Simple, reliable            |


---

## Workflow Templates (Detailed)

### Template 1: Lead Qualification

```
Trigger: New form submission (Typeform/Google Forms)
    ↓
AI Node: Extract company data (industry, size, budget)
    ↓
Score Node: Calculate lead score (0-100)
    ↓
Condition: Score > 70?
    ├─ YES → Create CRM deal + Assign to sales + Send email
    └─ NO → Add to nurture sequence + Log for review
```

**Components needed:**

- Typeform/Google Forms trigger
- HTTP Request node (enrichment API)
- AI node (scoring logic)
- HubSpot/Pipedrive node (CRM)
- Gmail node (email)

### Template 2: Weekly Report

```
Trigger: Cron (Every Monday 8:00 AM)
    ↓
Fetch Data: Google Analytics API
    ↓
Fetch Data: Meta Ads API
    ↓
Fetch Data: HubSpot CRM API
    ↓
AI Node: Generate narrative summary
    ↓
Format: Create HTML report
    ↓
Send: Email to stakeholders + Save to Drive
```

**Components needed:**

- Cron trigger
- Google Analytics node
- Meta node
- HubSpot node
- AI node
- Gmail node
- Google Drive node

### Template 3: Email Triage

```
Trigger: New email (Gmail)
    ↓
AI Node: Classify email type (support/sales/billing/spam)
    ↓
Condition: Type?
    ├─ Support → Create ticket + Route to support queue
    ├─ Sales → Create lead + Assign to sales
    ├─ Billing → Forward to finance + Log
    └─ Spam → Delete + Log
```

**Components needed:**

- Gmail trigger
- AI node (classification)
- Slack node (notifications)
- CRM node (lead creation)
- Ticketing node (support)

---

## Success Metrics

### Phase 1-2 (Foundation)

- n8n running locally ✅
- Dashboard shows workflows ✅
- Can start/stop workflows from dashboard ✅
- Logs visible in dashboard ✅

### Phase 3-4 (Automation)

- 5 workflow templates working ✅
- AI integration functional ✅
- Workflows execute without errors ✅
- Time savings measurable ✅

### Phase 5 (Polish)

- Dashboard responsive ✅
- Settings configurable ✅
- Documentation complete ✅
- Ready for Fabrica integration ✅

---

## Status


| Metric      | Value |
| ----------- | ----- |
| Total Tasks | 25    |
| Done        | 0     |
| In Progress | 0     |
| Blocked     | 0     |
| Todo        | 25    |
| Completion  | 0%    |


---

## Rules

- **Self-hosted only** — no cloud services, zero budget
- **Local-first** — data stays on machine
- **Business focus** — every workflow must make money or save time
- **Measurable** — track hours saved, errors reduced
- **Template-driven** — pre-built workflows for quick start
- **AI-enhanced** — add intelligence where it helps
- **Dashboard-controlled** — all automation visible and manageable
- **Fabrica-ready** — design for future integration

---

## Notes

### Why This Approach Works

1. **Legitimate** — uses official APIs, no TOS violations
2. **Free** — n8n self-hosted is free forever
3. **Powerful** — 400+ integrations, AI nodes
4. **Measurable** — track time saved, ROI
5. **Scalable** — add more workflows as needed
6. **Integratable** — connects to Fabrica ecosystem

### Next Steps

1. Set up n8n locally
2. Build dashboard skeleton
3. Connect dashboard to n8n
4. Create first workflow template
5. Test end-to-end
6. Iterate and expand

---

*Created: 2026-09-06*
*Strategy: Dashboard + n8n for business automation*
*Status: Planning phase*