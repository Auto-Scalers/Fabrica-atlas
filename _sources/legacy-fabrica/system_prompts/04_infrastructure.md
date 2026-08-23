# Infrastructure & Systems Guide

> **Brand Mandate**: Turn RAW BUSINESS SYSTEMS into AUDITED CLIENT DELIVERABLES via AUTONOMOUS OPERATIONS.
> All infrastructure services (multi-tenant database partitioning, hybrid storage, search engines, and agent daemons) are engineered to support the 24/7 autonomous business pipeline without requiring any technical setup from the user.

This guide describes the physical and logical layout of the Fabrica application, including database clients, isolated container runtime execution, daemon processes, hybrid storage, search engines, and multi-user scaling.

## 1. RUNTIME & NETWORK CONSTRAINTS
- **The Port 3000 Rule**: The application runs behind an Nginx reverse proxy routing external web traffic exclusively on **Port 3000**. All development and production web servers MUST run on port 3000. Other ports are inaccessible from outside the sandboxed container.
- **HMR Disabled**: Hot Module Replacement (HMR) is disabled in our environment. The client UI is refreshed after an agent turn is completed.

---

## 2. CLIENT/SERVER FULL-STACK ARCHITECTURE
The system operates as a full-stack Node.js application:
- **Production Entrypoint**: `dist/server.cjs` (compiled via Esbuild from `server.ts`).
- **Static Frontend Hosting**: The Next.js web application is built into `frontend-next/out/`. The Express backend `server.ts` serves these static assets using `express.static('frontend-next/out')` on Port 3000, and exposes backend API endpoints on `/api/*`.

### Development and Build Scripts (`package.json`)
- `npm run dev`: Boots the development server with `tsx server.ts`.
- `npm run build:frontend`: Compiles Next.js into static HTML/CSS files under `frontend-next/out/`.
- `npm run build`: Bundles the Express server and copies assets.
- `npm run start`: Boots the production bundled server using `node dist/server.cjs`.

---

## 3. CONTAINER RUNTIME EXECUTION
Each tenant executes within their own dedicated, isolated container runtime environment. User workspace commands and agent executions run natively inside the tenant's container boundaries.

---

## 4. AGENT DAEMON & PROCESS ISOLATION (`/src/core/harness.ts`)
To handle autonomous background tasks and agentic mission execution:
- **Interactive Daemon Session & Single Daemon Policy**: All agent executions run via persistent interactive daemon sessions (`PiDaemonProcess`). Enforces a strict 1:1 binding per tenant ID with zero concurrent daemon threads per tenant.
- **Workspace CWD & Native Session Isolation**: Process CWD is explicitly set to `/mnt/`. Uses `PI_CODING_AGENT_DIR=/mnt/.pi/` with native session management inside `.pi/agent/sessions/`.
- **Path Traversal Protection**: Target path resolving is validated with absolute boundary checks (`path.resolve` verifying target paths start with `/mnt`).

---

## 5. HYBRID STORAGE & VERTEX AI SEARCH (`/src/core/workspace.ts`, `/src/utils.ts`)
- **Tenant-Isolated Object Storage**: Documents and binaries are saved to tenant-scoped Google Cloud Storage buckets (`gs://fabrica-tenant-[id]-bucket`) with CMEK encryption and local fallback buffers.
- **Multi-Tenant RAG Search**: Uses Vertex AI Search Discovery Engine (`searchTenantDocuments`) to query isolated tenant datastores (`tenant-[id]-datastore`) with local search fallback and TTL caching.

---

## 6. SUPABASE AUTHENTICATION & SESSION MANAGEMENT
Supabase is integrated strictly for user authentication, session verification, and OAuth provider management.

### Authentication Rules
1. **User Auth & Identity**: User logins, OAuth tokens, and password reset flows are handled via `@supabase/supabase-js` or `@supabase/auth-ui-react`.
2. **Session Verification**: Authenticated user sessions map directly to tenant isolation boundaries (`user_id` / `tenantId`).
3. **Client Initialization**: The `@supabase/supabase-js` client initializes using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables.

---

## 7. TARGET WORKSPACE DIRECTORY HIERARCHY & STATE PERSISTENCE
Every tenant operates within an isolated workspace root mounted at `/mnt/` structured as follows:

```
/mnt/ (User Tenant Root Mount)
├── .pi/                            # Hidden Pi Agent Runtime Folder
│   ├── agent/sessions/             # Native Pi agent session history (.jsonl files)
│   └── skills/                     # User-defined custom skills
│
├── Fabrica_kernel/                 # Read-Only Platform Kernel Mount
│   ├── skills/                     # Global platform skills & workflows
│   └── integrations/               # Shared integrations & tool manifests
│
├── AGENTS.md                       # User context file (business context, domain rules, goals - kept empty by default)
├── tenant.json                     # Tenant profile, user preferences, telemetry metrics, & audit logs
├── harness.json                    # Live daemon state, selected model, suggestions, autonomy, & harness options
├── missions.json                   # Single mission states & pipeline execution blueprints file
├── workspace.json                  # Single index map for Sources, Deliverables, Pendings, Actions, and Action Items storage
│
├── missions/{missionId}/           # Ephemeral scratchpad space (code runs, temp files, draft steps) - working area of active mission executions
└── workspace/                      # Central storage of all 7 lifecycle phase directories
    ├── Discovery & Scoping/        # Scoping documentations, interactive Q&A briefs, cost/time trade-off options
    ├── Deep Research & Intelligence Gathering/ # Scraped docs, research papers, competitor scans, API references
    ├── Data Analysis & Pattern Extraction/ # Processed datasets, computed metrics, anomaly reports, trend insights
    ├── Strategic Synthesis & Decision Support/ # Executive strategic plans, risk audits, roadmaps, decision matrices
    ├── Executions/                 # Generated codebases, database schemas, workflow automations, assets
    ├── Reviews/                    # Verified production deliverables waiting for human sign-off
    └── Completed/                  # Accepted production deliverables & archived release artifacts
```

### Protection of Mission Schemas & Phase Schemas
Mission schemas reside securely inside `src/core/missions.ts`:
- `standard`: Full master multi-phase pipeline schema.
- `drafting`: Drafting and discovery phase schema.
- `planning`: Planning and architecture phase schema.
- `delivery`: Delivery, core implementation, and QA verification phase schema.

When adding new missions via the UI or updating `missions.json`:
1. The server dynamically loads mission pipeline blueprints in `src/core/missions.ts`.
2. Each schema specifies its own metadata, rules, and sub-schema / sub-stage breakdown.
3. `missions.json` tracks active execution scratchpads inside `missions/{missionId}/` for working steps, draft files, and ephemeral runs.
4. Proprietary prompt schema source files or system instruction templates are **never** dropped into the user's workspace. Users can only see their active mission state in `missions.json` and outputs in `workspace/`—never proprietary system prompt schemas.

### System Autonomy Levels
1. **DIRECTOR (`director`)**:
   - **Auto-Mission Generation**: System automatically synthesizes and creates new contextual missions whenever active drafting/planning mission count drops below 2.
   - **Auto-QA Gatekeeping**: Agent automatically answers and approves QA gates for agent/system-created missions using workspace context.
   - **Full Lifecycle Execution**: Moves missions through pipeline stages, sequentially finishes tasks, compiles and hot-swaps new system components, and archives completed missions (`status = 'archive'`).
2. **WORKER (`worker`)**:
   - System automatically executes planning and task steps once a mission enters Planning, but requires explicit user action at QA gates for user-created missions (`user_created: true`).
3. **OFF (`off`)**:
   - System pauses at QA gates and planning proposals, requiring manual user approval before advancing phases.

### App Configuration & State Mirroring API
User configuration and state persist across sign-out and re-login sessions and mirror automatically into `tenant.json`, `harness.json`, `missions.json`, `workspace.json`, and global `.stash/auth.json`:

- **Agent rules and kernel knowledge** are injected via server system prompts (`/system_prompts/`) and customizable per tenant via `AGENTS.md` (`/mnt/AGENTS.md`). Users can inspect, edit, and save runtime directives dynamically via `GET /api/harness/agents-md` and `POST /api/harness/agents-md`.
- **Tenant-Isolated API Routes**:
  - `GET /api/auth/*` & `POST /api/auth/*` — auth, BYOK keys, LLM key pool rotation, and pricing tier endpoints
  - `GET /api/tenant/*` & `POST /api/tenant/*` — tenant profile, user preferences, usage metrics, telemetry, and audit logs
  - `GET /api/harness/*` & `POST /api/harness/*` — daemon controls, chat sessions, model selection, SSE streaming, and suggestion cards
  - `GET /api/missions/*` & `POST /api/missions/*` — missions CRUD, pipeline execution, and step blueprints
  - `GET /api/workspace/*` & `POST /api/workspace/*` — workspace files, phase storage (`Sources/` & `Deliverables/`), and file upload pipelines
- **Persisted State Object (`settings` & `runtime`)**:
  - `autonomy`: `'director'` | `'worker'` | `'off'`
  - `chat_sessions`: Full list of ChatSession objects with conversation histories
  - `active_session_id`: Active chat session identifier
  - `tools_enabled`: Global tools toggle state
  - `theme`: `'light'` | `'dark'`
  - `ui_lang`: `'EN'` | `'FR'` | `'AR'`
- **Fallback Hierarchy**: Dual local caching (`localStorage`) + backend storage guarantees instant loading with zero history loss.

---

## 8. AGENT OPERATING RULES: `workspace/` Storage vs `missions/` Scratchpad

### `workspace/` Storage Repository
- `workspace/` is the **permanent repository for all workspace directories** directly containing the 7 lifecycle folders:
  1. `Discovery & Scoping`
  2. `Deep Research & Intelligence Gathering`
  3. `Data Analysis & Pattern Extraction`
  4. `Strategic Synthesis & Decision Support`
  5. `Executions`
  6. `Reviews`
  7. `Completed`
- **STRICT RULE**: The Agent reads inputs from scoping and research folders and generates working code, assets, or scripts into `Executions/`.
- **Single Mapping Index**: `/mnt/workspace.json` indexes and maps all items in `workspace/`, along with `pendings`, `actions`, and `action_items` (items flagged as requiring execution action, with attributes `type`, `level`, `description`, `when_to_use`, `triggers`, and `flagged_as_action`).
- **Permitted Operations**:
  1. `READ` / `VIEW`: Inspecting workspace files.
  2. `LIST`: Listing directory contents.
  3. `REGISTER`: Adding validated items.
  4. `RELOCATE`: Promoting items (e.g., from `Executions` -> `Reviews` upon verification success, or `Reviews` -> `Completed` upon user acceptance, or `Reviews` -> `Executions` upon review feedback).

### `missions/` Directory
- `missions/` holds individual mission files (`missions/<mission_id>.json`).
- **Workflow**:
  1. Individual mission data and task breakdowns reside in `missions/<mission_id>.json`.
  2. All phase artifacts (inputs, blueprints, execution outputs, assets) generated by the agent reside inside `workspace/` across the 7 phase directories.
  3. `missions-graph.json` automatically indexes top-level mission metadata, while scanning files across `workspace/` into mission deliverables.

---

## 9. 3-WAY REAL-TIME BI-DIRECTIONAL SYNCHRONIZATION PROTOCOL

The application enforces strict **3-way real-time bi-directional state synchronization** across **User UI ↔ Single State Mappings (`missions-graph.json`, `workspace-graph.json`, `runtime-board.json`) ↔ Disk Storage (`workspace/` & `missions/`)**:

1. **User UI → Index Files → Disk**:
   - When a user adds, edits, or deletes a file or parameter in the UI, the backend updates `workspace-graph.json` or `missions-graph.json` instantly and automatically reflects changes in the physical folders and files.
2. **Agent → Index Files → Disk & UI**:
   - When the agent adds, edits, or deletes something in `missions/<mission_id>.json`, `workspace-graph.json`, or disk storage, the physical files update instantly and the dashboard UI updates in real time.
3. **Disk → Index Files → UI**:
   - When files or folders inside `workspace/` or `missions/` are added, modified, or removed, `syncWorkspaceJson()` and `syncMissionsJson()` immediately re-index the changes into `workspace-graph.json` and `missions-graph.json`, broadcasting live updates to the UI.

### `workspace/` ↔ `workspace-graph.json`
- Every file and record in `workspace/` is strictly mapped to `workspace-graph.json` in real time.

### `missions/` ↔ `missions-graph.json` & `missions/<mission_id>.json`
- Every mission's top-level status is mapped to `missions-graph.json` while full details live in `missions/<mission_id>.json`.
