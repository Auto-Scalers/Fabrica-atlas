# User Workspace Mount Structure (`/mnt`)

This document details the complete directory structure and file layout of a tenant's persistent workspace mounted at `/mnt` inside their dedicated Cloud Run runner container.

The `/mnt` directory uses Cloud Run FUSE to mount two Google Cloud Storage (GCS) buckets:
1. **Tenant R/W Bucket** (`fabrica-tenant-<tenant_id>`): Mounted at `/mnt` (Read/Write) for user files, agent configuration, local skills, mission logs, and workspace pipeline folders.
2. **Global Kernel R/O Bucket** (`SHARED_KERNEL_GCS_BUCKET` / `fabrica-global-kernel-prod`): Mounted at `/mnt/Fabrica_kernel` (Read-Only) containing the platform's immutable agent skills and integrations.

*(Note: Base system prompts live directly on the server filesystem at `/system_prompts/`, not inside GCS or `Fabrica_kernel/`)*

---

## Workspace Directory Layout (`/mnt`)

```text
/mnt/                                   # TENANT WORKSPACE MOUNT ROOT (GCS Bucket: R/W)
├── AGENTS.md                           # User runtime agent instructions & project-level rules
├── runtime-board.json                  # Combined tenant configuration, model settings, autonomy, & runtime board state
├── missions-graph.json                 # Top-level missions graph index mapping all tenant missions
├── workspace-graph.json                # Workspace catalog index mapping artifacts to stages
│
├── .pi/                                # TENANT AGENT LOCAL EXTENSIONS & SKILLS (R/W)
│   ├── skills/                         # Custom tenant-created skills (loaded via --skill)
│   │   └── <custom-skill-name>/
│   │       └── SKILL.md
│   └── extensions/                     # Custom tenant extensions (.js / .ts loaded via --extension)
│
├── workspace/                          # TENANT ARTIFACT & DOCUMENT PIPELINE DIRECTORIES (R/W)
│   ├── Discovery & Scoping/            # Initial requirements, briefs, & scoping documents
│   ├── Deep Research & Intelligence Gathering/ # Research notes, benchmarks, & web intelligence
│   ├── Data Analysis & Pattern Extraction/     # Raw datasets, analytics outputs, & metrics
│   ├── Strategic Synthesis & Decision Support/ # Strategic plans, architecture proposals, & memos
│   ├── Executions/                     # In-progress deliverables, code outputs, & scripts
│   ├── Reviews/                        # Pending user/agent review artifacts
│   └── Completed/                      # Final approved deliverables & mission outputs
│
├── missions/                           # MISSION DIRECTORY (R/W)
│   └── <mission_id>.json               # Full individual mission definition file
│
└── Fabrica_kernel/                     # GLOBAL PLATFORM KERNEL MOUNT (GCS Bucket: Read-Only)
    ├── skills/                         # Shared platform agent skills & workflows
    └── integrations/                   # Integration bridges & tool manifests
```

---

## File & Directory Specifications

### 1. Root Configuration & Index Files (Tenant R/W)

| File | Purpose & Contents |
| :--- | :--- |
| `AGENTS.md` | User-defined persistent instructions and behavioral rules injected into the agent prompt on every turn. |
| `runtime-board.json` | Single source of truth for tenant configuration, model selection, autonomy settings, enabled skills/integrations, and runtime action queues. |
| `missions-graph.json` | Top-level graph index storing light metadata (`id`, `title`, `phase`, `status`) for all tenant missions. |
| `workspace-graph.json` | Single JSON catalog mapping all files in `workspace/` subfolders (`Discovery & Scoping`, `Executions`, `Completed`, etc.) with usage notes and timestamps. |

---

### 2. `.pi/` Custom Extensions & Skills Directory (Tenant R/W)

The `.pi/` folder allows tenants to define custom skills and JS/TS runtime extensions specifically for their workspace:
- **`.pi/skills/`**: Each subdirectory with a valid `SKILL.md` file is automatically detected by `src/core/harness.ts` and passed to the agent CLI via `--skill /mnt/.pi/skills/<skill_name>`.
- **`.pi/extensions/`**: Any custom extension scripts (`.js` or `.ts`) placed here are automatically loaded via `--extension /mnt/.pi/extensions/<filename>`.

---

### 3. `workspace/` Artifact Pipeline (Tenant R/W)

The `workspace/` folder houses tenant documents, research, and project outputs organized into 7 standardized pipeline stages:
1. `Discovery & Scoping/`
2. `Deep Research & Intelligence Gathering/`
3. `Data Analysis & Pattern Extraction/`
4. `Strategic Synthesis & Decision Support/`
5. `Executions/`
6. `Reviews/`
7. `Completed/`

Files placed here are indexed by `src/core/workspace.ts` and mapped inside `workspace-graph.json`.

---

### 4. `missions/` Mission Storage (Tenant R/W)

- **`missions/<mission_id>.json`**: Individual JSON files containing full mission details, metadata, task breakdowns, workflow histories, and dynamically scanned workspace artifacts.

---

### 5. `Fabrica_kernel/` Read-Only Kernel Mount (Platform R/O)

- **`Fabrica_kernel/skills/`**: Standard platform skills available to all tenants.
- **`Fabrica_kernel/integrations/`**: Configurable integration toolboxes (Slack, GitHub, Jira, etc.).

---

## Detailed File Schemas & Specifications

The complete schemas and specifications for core workspace files are stored in individual schema files under `/Docs/Users GCS/schemas/`:

1. **`AGENTS.md`**: [`/Docs/Users GCS/schemas/AGENTS.schema.md`](/Docs/Users%20GCS/schemas/AGENTS.schema.md)
2. **`runtime-board.json`**: [`/Docs/Users GCS/schemas/runtime-board.schema.json`](/Docs/Users%20GCS/schemas/runtime-board.schema.json)
3. **`missions-graph.json`**: [`/Docs/Users GCS/schemas/missions-graph.schema.json`](/Docs/Users%20GCS/schemas/missions-graph.schema.json)
4. **`workspace-graph.json`**: [`/Docs/Users GCS/schemas/workspace-graph.schema.json`](/Docs/Users%20GCS/schemas/workspace-graph.schema.json)
5. **`missions/<mission_id>.json`**: [`/Docs/Users GCS/schemas/mission.schema.json`](/Docs/Users%20GCS/schemas/mission.schema.json)

---

## GCS Persistence & Isolation Mechanics

1. **Dedicated Tenant GCS Bucket (R/W)**: Each tenant gets a dedicated GCS bucket (`fabrica-tenant-<tenant_id>`) mounted at `/mnt`.
2. **Shared Kernel GCS Bucket (R/O)**: The global kernel bucket (`fabrica-global-kernel-prod`) is mounted at `/mnt/Fabrica_kernel` with `readOnly: true`.
3. **Server-Side System Prompts**: Base agent system directives (`01_identity.md` through `07_app_guide.md`) reside directly on the server filesystem at `/system_prompts/`, not inside GCS.
4. **Cloud Run FUSE Volume Mounts**: Configured in `src/services/cloudrun.orchestrator.ts` during container provisioning.
5. **Agent Working Directory**: The `@earendil-works/pi-coding-agent` CLI runs with `--cwd /mnt`.

