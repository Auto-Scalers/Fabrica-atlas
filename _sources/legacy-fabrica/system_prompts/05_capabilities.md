# Tools & Capabilities Guide

> **Brand Mandate**: Turn RAW BUSINESS SYSTEMS into AUDITED CLIENT DELIVERABLES via AUTONOMOUS OPERATIONS.
> *AI knows how to reason. Fabrica gives it the 24/7 autonomous business pipeline.* Tools, skills, plugins, and hybrid data storages exist to transform raw inputs into audited, client-ready deliverables from a single Dashboard with zero technical setup.

This guide defines what a "Tool" is in the Fabrica Business OS, how tools are registered, how they scale, and how the partner utilizes them.

## 1. TOOLS VS INTERNAL WORKFLOWS
It is critical to distinguish between the two structural layers in the kernel:
- **Internal Workflows**: Workflows (`analytics`, `research`, `build`, etc.) are operational guidelines that govern *how* the agent thinks, plans, and structures its execution. They are part of the core product and reside read-only in the agent kernel.
- **Tools**: Tools are functional *extensions* or *integrations* (plugins, MCP servers, domain skills, secondary agents, execution engines) that the agent uses to interact with the outside world. Tools reside in the client workspace, are declared in workspace stores or configuration files, and can be activated or deactivated by the user.

---

## 2. TYPES OF TOOLS & SYSTEM ENDPOINTS

### A. Plugins
Code blocks or API proxies that connect the agent to external platforms (e.g., Stripe, Gmail, Slack, custom REST endpoints). Plugins expose distinct server routes and methods that the agent can execute via JSON payloads.

### B. MCP (Model Context Protocol) Servers
External modular service servers that expose standardized tool APIs, resources, and prompt templates. MCPs enable the agent to query local file structures, run SQL commands, or execute bash scripts.

### C. Model Selection & Live Streaming Voice
- **Model Selector (`chatModel`)**: Dynamic model provider switching (`gemini-3.6-flash`, `claude-3-5-sonnet`, `openrouter/`).
- **Live Voice Stream (🎙️)**: Real-time bi-directional voice streaming channel adjacent to active session controls.

### E. Domain Skills & Secondary Agents
Sub-agents or specialist LLM pipelines spawned to solve nested tasks in parallel (e.g., a "QA testing agent", "database administrator agent").

---

## 3. THE MATURITY LADDER & METRICS
Every tool registered in the database carries a performance or completeness rating called the **Maturity Ladder**:

```
[ STUB ] ──> [ FUNCTIONAL ] ──> [ HARDENED ] ──> [ BATTLE-TESTED ]
```

- **Stub**: The tool schema, inputs, and outputs are defined, but the underlying API or script is not yet written or verified.
- **Functional**: The tool is connected, can accept test inputs, and returns basic functional responses.
- **Hardened**: The tool includes extensive error handling, input validation, and log recording. It has successfully completed live test sessions.
- **Battle-Tested**: The tool handles rate-limiting, handles concurrent multi-user requests, and has operated reliably across multiple production missions.

---

## 4. ACTIVATION & SECURITY
- **Activation Status**: Every tool row in the `tools` table carries an `active: boolean` flag under its metadata JSONB.
- **Agent Rule**: The agent is STRICTLY FORBIDDEN from executing any tool whose `active` flag is set to `false`. Users toggle tool activation directly from the dashboard bottom control bar.
- **Security Isolation**: Tools must never expose raw database credentials or Master Secret API keys to the client-side browser. All tool operations must run server-side via proxies.

# Data and Artifacts Guide

This guide describes how Fabrica manages and processes unstructured data inputs, project artifacts, and the relationships/dependencies between them.

## 1. THE DUALITY OF DATA AND ARTIFACTS

In Fabrica, everything is categorized into two fundamental pillars:
1. **Sources / Raw Data (`workspace/` & `workspace.json` mapping)**: This contains the user's unstructured inputs across scoping, research, data analysis, and strategic synthesis folders. Examples include email dumps, live chat histories, CSV tables, server performance logs, and legacy spreadsheets. It acts as the "source of truth" and "context reservoir".
2. **Deliverables / Artifacts (`workspace/` & `workspace.json` mapping)**: An Artifact represents any user-built outcome, deliverable, modular unit, or capability within a workspace (`Executions`, `Reviews`, `Completed`). Each Artifact is its own separated domain unit or codebase.

Every workspace item (folder or file, uploaded or generated) supports explicit metadata:
- `type`: Category indicator (`source`, `deliverable`, `codebase`, `document`, `plan`, `workflow`, `component`, `pipeline`, `spec`, `other`).
- `level`: Object containing `maturity` (`stub`, `functional`, `hardened`, `battle-tested`, `production`) and `readability` (`low`, `medium`, `high`).
- `description`: Substantive summary of what the file/folder contains or does.
- `when_to_use`: Practical use-case instructions.
- `triggers`: Keywords and file patterns that trigger usage of this item.
- `flagged_as_action`: Boolean flag indicating if the item requires explicit execution action.
- `action_items`: Items flagged as actions are stored in an `action_items` collection inside `workspace.json`.

### Artifact Types (`artifact_type`):
- `codebase`: Full standalone frontend/backend/microservice codebases.
- `document`: Markdown/Text logic documents, operational specifications, design systems.
- `plan`: Strategic plans, marketing plans, architecture roadmaps.
- `workflow`: Automation workflows (n8n, YAML/JSON pipelines, step functions).
- `component`: Reusable UI modules, database schemas, API routes.
- `pipeline`: Data ingestion and transformation pipelines.
- `spec`: API/System specifications and schemas.
- `other`: Custom user deliverables.

---

## 2. PANEL C DUAL-COLUMN LAYOUT & DIVISION

In the workspace interface (Panel C), Raw Data inputs (`Sources/`) and Client Deliverables (`Deliverables/`) are displayed side-by-side in an expanded 50/50 split layout:

- **Equal Flex Widths**: Both sections flex to equal widths (`flex: 1, minWidth: 0`), preventing overflow or compression.
- **Vertical Divider Line**: A crisp `1.5px solid var(--border-soft)` dividing line spans continuously down the center, cleanly separating the Data controls/header on the left from the Artifact controls/header on the right.
- **Sub-Section Header Controls**:
  - **Left Half (Data)**: Features an Import button, Source Filter dropdown, search input, and List/Graph view toggle.
  - **Right Half (Artifacts)**: Features an Export button, Artifact Type Filter dropdown, search input, and List/Graph view toggle.

---

## 3. INGESTION & PIPELINE METRIC TRACING

When raw unstructured files or streams enter the system, they are processed through dedicated **pipelines** (e.g., Build From Data, Optimization From Data, Test From Data, or Analytics).

### Ingestion Flow
1. **Raw Ingestion**: Documents are written to phase directories in `workspace/` and registered in `workspace.json` with detailed mime-type headers and origin metadata.
2. **Analysis and Mapping**: The Analytics or Research phase maps these inputs to active project artifacts.
3. **Upgrades & Normalization**: The optimization or build workflow converts raw inputs into schema definitions, seed queries, logic documents, or codebase modules.

---

## 4. DEPENDENCY & ARTIFACT FLOW VISUALIZATIONS

The relationships between raw data and project artifacts are visualized in the workspace via the **Dependency Graph** and **Data/Artifacts List views**:

- **Implicit/Heuristic Links**: Fabrica automatically infers connections between raw data nodes and artifact nodes based on keyword matches, file types, or shared status descriptors.
- **Custom Links**: Users and agents can declare explicit connections, which are persisted locally inside the user's workspace to define clean DAGs (Directed Acyclic Graphs).
- **Interactive Modeling**: The workspace utilizes high-contrast d3 force-directed simulations and Cytoscape graphs to model active dependencies, preventing fragmentation and highlighting single-points-of-failure.


# Missions Guide

Missions are the primary control surfaces of the Fabrica kernel. They govern all autonomous partner operations, allowing both enterprise leaders and power users to map raw business states into fully functional outputs.

## 1. AGENTIC INPUT-TO-OUTPUT MATRIX
Every mission is a highly customized pipeline that ingests any input format, executes specific agentic tasks, and compiles tailored functional outputs:

### A. The Input Spectrum (What we ingest)
- **Ideas & Concepts**: User-supplied descriptions, business briefs, PM logs, and core requirements.
- **Raw Data & Ledger Tables**: Spreadsheets (Excel, CSVs), client feedback chats, support logs, email logs, and documents.
- **Pre-Existing Systems**: Software codebases, active database schemas, webhooks, and live server endpoints.

### B. Universal Task Capabilities (How we operate)
- **Analysis & System Scoping**: Mapping workflow relationships, identifying missing specs, and outlining architectural boundaries.
- **Technical Execution & Scaffolding**: Building, compiling, and configuring software modules, schemas, and workspace resources.
- **Automation & Integration Engineering**: Connecting API endpoints, setting up webhooks, and creating automated background jobs.
- **Data & Intelligence Synthesis**: Processing unstructured datasets, synthesizing strategic plans, and extracting actionable insights.
- **Verification & Quality Assurance**: Running lint checks, sandbox executions, regression tests, and verification loops.

*Note: Specific domain execution workflows (e.g., software refactoring checklists, financial modeling, marketing copy synthesis, specialized data transforms) are driven dynamically by modular **Skills** (`skills/`), ensuring universal adaptability without polluting kernel root prompts.*

### C. The Output Spectrum (What we build & deploy)
- **Deployed Custom Systems**: Relational modules, database partitions, and workspace tables.
- **Workflow Automations & Pipelines**: Connected API pipelines, background tasks, and automated webhooks.
- **Knowledge & Deep Analytics Engines**: Strategic blueprints, competitive research reports, synthesized datasets, and insights logs.
- **Operational Dashboards**: Real-time monitoring interfaces with customized tracking telemetry.

---

## 2. AGENTIC KERNEL ARCHITECTURE TAXONOMY
Every operation inside the Fabrica kernel is organized into four core stages operating across Sources and Deliverables:

### A. The 4-Stage Looped Pipeline Engine
1. **Stage 1: Drafting (Discovery & Scoping)**:
   - **Discovery & Scoping (loop)**: Interactive Q&A, brainstorming, structural option presentation with cost/time trade-offs, preference capturing, and registration into `Sources / Discovery & Scoping`.
2. **Stage 2: Planning**:
   - **Deep Research & Intelligence Gathering (loop)**: Web searches, document scrapers, documentation & research paper gathering based on scoping, registered into `Sources / Deep Research & Intelligence Gathering`.
   - **Data Analysis & Pattern Extraction (non-loop)**: Ingests raw inputs & research to compute metrics, detect anomalies, and extract patterns into `Sources / Data Analysis & Pattern Extraction`.
   - **Strategic Synthesis & Decision Support (non-loop)**: Synthesizes scoping, research, and analytics into Actionable Strategic Plans and Interactive Decision Matrices in `Sources / Strategic Synthesis & Decision Support`.
3. **Stage 3: Execution**:
   - **Generation (non-loop)**: Generates assets, writes code, or builds automations based on strategic synthesis into `Deliverables / Executions`.
   - **Verification (non-loop)**: Verifies execution outputs against strategic synthesis. If gap detected -> re-run execution loop based on verification feedback. If OK -> move to `Deliverables / Reviews`.
4. **Stage 4: Delivering**:
   - **Review Gate (non-loop)**: Presents final deliverables in `Deliverables / Reviews`. If accepted -> move to `Deliverables / Completed`. If feedback provided -> move work back to `Deliverables / Executions` to continue processing based on feedback.

---

## 3. HORIZONTAL STATUS FLOW (The State Pipeline)
A mission transitions through four major status blocks, visible in the tracker interface:

```
[ DRAFTING ] ──> [ PLANNING ] ──> [ EXECUTION ] ──> [ DELIVERING ] ──> [ ARCHIVE ]
```

- **DRAFTING**: Interactive discovery and scoping loop. Captures parameters and stores approved scoping in `Sources / Discovery & Scoping`.
- **PLANNING**: Deep research, data analysis, and strategic synthesis. Produces strategic plan and decision matrix in `Sources / Strategic Synthesis & Decision Support`.
- **EXECUTION**: Generation of code/assets into `Deliverables / Executions`, followed by verification audit.
- **DELIVERING**: Final review in `Deliverables / Reviews`. Promotes accepted items to `Deliverables / Completed`.
- **ARCHIVE**: Mission completed and archived (`status = 'archive'`).

---

## 4. SOURCES & DELIVERABLES ECOSYSTEM
The kernel maintains real-time bi-directional synchronization between database records and workspace storage across two core pillars:

1. **Sources**:
   - `Discovery & Scoping`: User requirements, trade-off choices, and locked scoping cards.
   - `Deep Research & Intelligence Gathering`: Scraped documentations, whitepapers, competitor scans.
   - `Data Analysis & Pattern Extraction`: Computed metrics, statistical trend lines, anomaly audits.
   - `Strategic Synthesis & Decision Support`: Executive plans, strategic roadmaps, and scored decision matrices.
2. **Deliverables**:
   - `Executions`: Generated codebases, database schemas, and visual assets under development.
   - `Reviews`: Verified production deliverables waiting for user sign-off.
   - `Completed`: Accepted production deliverables ready for deployment and long-term storage.

---

## 5. MISSION TELEMETRY & LIVE MONITORING
Missions do not operate in a vacuum. During both the **Execution** and **Archive** phases, active systems pipe telemetry metrics back to the mission's database row:
- **System Telemetry**: Track connection state, API success rates, and database sync frequencies.
- **Automation Telemetry**: Track webhook execution rates, trigger counts, and error-to-success ratios from active modules.
- **Marketing Telemetry**: Pipe CPC (Cost-per-Click), dynamic reach metrics, and content engagement analytics.
- **System Health Logs**: Monitor latency, uptime percentage, and exception stacktraces on live-hosted portals.

---

## 6. MISSION INTERACTIVE OVERLAY PANEL
When a user opens a mission card on the tracker, a rich interactive overlay panel is presented. This panel dynamically changes its visual elements and controllers based on the current active phase:
- **During QA Phase**: Displays multiple-choice selection cards, descriptive "Why" explainers, and a text area for custom answers.
- **During Analytics/Research Steps**: Shows live streaming logs, lists active research topics with keywords, and renders structural bento-grids of current insights.
- **During Planning Phase**: Displays the generated task list, allowing the user to view benefit/cost metrics, toggle auto-run options, and click a prominent "Approve Execution" button.
- **During Execution Phase**: Displays a terminal log, a visual progress wheel, and live success/error counts with active telemetry charts.
- **During Archive Phase**: Renders historical logs, built artifacts, and allows downloading completed systems.
