# Fabrica Universal 4-Stage Looped Pipeline & Execution Engine

> **Brand Mandate**: Turn RAW BUSINESS SYSTEMS into AUDITED CLIENT DELIVERABLES via AUTONOMOUS OPERATIONS.
> *AI knows how to reason. Fabrica gives it the 24/7 autonomous business pipeline.*
> Stop prompting. Draft, plan, execute, and verify — from a single Dashboard, with zero technical setup.

This document defines the core 4-stage looped pipeline engine, mission execution protocols, skill invocation mechanisms, and loop mechanics in Fabrica:
`Drafting ──> Planning ──> Execution ──> Delivering`

---

## 1. MISSION EXECUTION ENGINE: HOW TO HANDLE MISSION EXECUTION

Mission execution is the core operational state machine of the Fabrica kernel. Whether triggered by an explicit user prompt, an automated backlog event, or an auto-generated system mission in FULL AUTO mode, the agent MUST execute missions following this universal lifecycle:

### Step 1: Ingestion & Mission Setup
1. **Parse Intent & Scope**: Ingest user prompt, raw data uploads, or mission card parameters.
2. **Determine Target Mission & Pipeline Launcher Mode**: Map the task to a launcher mode (`standard`, `full_pipeline`, `quick_pipeline`, `custom_entry_pipeline`, `custom_selection_pipeline`).
3. **Register/Update Mission State**: Create or update the mission record in `missions.json` with status `DRAFTING` or `PLANNING`.

### Step 2: Skill Discovery & Invocation (How & When to Use Skills)
1. **When to Use Skills**: Whenever a mission phase or task requires domain-specific procedures, specialized coding frameworks, industry research protocols, or customized task rules, the agent MUST load and follow the corresponding **Skill**.
2. **Skill Resolution Hierarchy**:
   - Check workspace-level custom skills (`/mnt/.pi/skills/`).
   - Check kernel-level default skills (`Fabrica_kernel/skills/`).
3. **Skill Execution Protocol**:
   - Call `view_file` on the target skill's `SKILL.md` file before generating domain outputs.
   - Follow the step-by-step instructions, input/output schemas, and verification rules specified in `SKILL.md`.

### Step 3: Autonomy Mode & Approval Gate Check
Before advancing across major pipeline stages, check active autonomy mode (`harness.json` -> `autonomy` or `tenant.json`):
- **DIRECTOR (`director`)**: Auto-generates missions when count < 2, auto-evaluates QA gates using workspace context, automatically advances across stages (`Drafting -> Planning -> Execution -> Delivering`), and archives upon completion.
- **WORKER (`worker`)**: Auto-executes tasks within stages, but holds user-created missions (`user_created: true`) at QA gates and delivery review steps for explicit user sign-off.
- **OFF (`off`)**: Pauses at every phase transition, proposal, and QA gate until approved by the human operator.

---

## 2. PIPELINE STAGES & LOOP SYSTEMS

The Fabrica kernel organizes execution into 4 sequential stages, incorporating active loop systems and verification feedback loops:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: DRAFTING                                                                      │
│ └── Discovery & Scoping Loop (Interactive user intent alignment & scoping)             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ STAGE 2: PLANNING                                                                      │
│ ├── Deep Research & Intelligence Gathering Loop (Multi-vector web & doc research)      │
│ ├── Data Analysis & Pattern Extraction (Processing datasets & detecting anomalies)    │
│ └── Strategic Synthesis & Decision Support (Compiling Actionable Strategic Plan)       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ STAGE 3: EXECUTION                                                                     │
│ ├── Generation (Building codebases, automations, assets, systems)                      │
│ └── Verification Loop (Cross-referencing deliverables vs Strategic Plan; retry on fail)│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ STAGE 4: DELIVERING                                                                    │
│ └── Review Gate & Feedback Loop (User review; route feedback to Generation or Complete)│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Stage 1: Drafting (Discovery & Scoping Loop)
- **Primary Objective**: Clarify user goals, define scope boundaries, evaluate feasibility, and collect source parameters.
- **Discovery & Scoping Loop**: Interactive multi-turn or multi-option analysis that captures parameters into `Sources / Discovery & Scoping`.
- **Associated Skill**: `Drafting/Discovery & Scoping/SKILL.md` (or `Drafting/SKILL.md`)
- **Output**: Structured scoping card and initial mission parameters ready for Planning.

### Stage 2: Planning (Deep Research, Analysis & Strategic Synthesis)
- **Primary Objective**: Build an unambiguous, scored implementation blueprint prior to writing code or making system edits.
- **Sub-Phases**:
  1. **Deep Research & Intelligence Gathering Loop**: Conducts targeted web searches, documentation verification, and competitor scans into `Sources / Deep Research & Intelligence Gathering`.
     - *Skill*: `Planning/Deep Research & Intelligence Gathering/SKILL.md`
  2. **Data Analysis & Pattern Extraction**: Ingests raw workspace datasets, calculates metrics, and identifies anomalies into `Sources / Data Analysis & Pattern Extraction`.
     - *Skill*: `Planning/Data Analysis & Pattern Extraction/SKILL.md`
  3. **Strategic Synthesis & Decision Support**: Compiles a prioritized task list scored on `benefit` (HIGH/MED/LOW), `cost` (HIGH/MED/LOW), and `worth_it` (YES/NO) into `Sources / Strategic Synthesis & Decision Support`.
     - *Skill*: `Planning/Strategic Synthesis & Decision Support/SKILL.md`

### Stage 3: Execution (Generation & Verification Loop)
- **Primary Objective**: Sequentially execute planned tasks with transaction safety, linting, compilation, and automated validation.
- **Sub-Phases**:
  1. **Generation**: Creates or modifies codebases, database schemas, workflow automations, or content assets under `Deliverables / Executions`.
     - *Skill*: `Execution/Generation/SKILL.md` (with specialized sub-skills: `Assets Generation`, `Coding`, `Automations Runing`)
  2. **Verification Loop**: Automated quality gate that cross-references generated deliverables against `Sources / Strategic Synthesis & Decision Support`.
     - **If FAIL**: Captures specific failure logs, re-triggers the Generation loop with error feedback, and attempts self-repair (up to 3 hypotheses).
     - **If PASS**: Promotes verified deliverable to `Deliverables / Reviews`.
     - *Skill*: `Execution/verification/SKILL.md`

### Stage 4: Delivering (Review Gate & Feedback Loop)
- **Primary Objective**: Validate production readiness and obtain final user sign-off.
- **Sub-Phase**:
  1. **Review Gate**: Presents production deliverables in `Deliverables / Reviews`.
     - **If USER FEEDBACK GIVEN (Not Accepted)**: Work is **ALWAYS moved to Deliverables / Executions**. The user can select a **Custom Entry Target** (any loop or stage, e.g., Drafting, Deep Research, Strategic Synthesis, Generation, Verification) to continue processing the full loop from that entry point based on feedback; if unselected, the default is to continue processing the full **Execution loop** based on feedback.
     - **If ACCEPTED**: Promotes deliverable to `Deliverables / Completed` and archives the mission (`status = 'archive'`).
     - *Skill*: `Delivering/SKILL.md`

---

## 2.1 PIPELINE MISSION EXECUTION MODES

Fabrica supports 5 distinct Mission Execution Modes to accommodate both rapid fixes and structured multi-stage pipelines:

1. **🎯 Standard Mission (`standard`)**:
   - **Behavior**: Fast-path, goal-oriented execution bypassing multi-stage pipeline overhead. Focuses on user goal targets and autonomous task lists.

2. **🚀 Full Pipeline Mission (`full_pipeline`)**:
   - **Behavior**: Sequential end-to-end execution across all 4 stages: `Drafting (Discovery) ➔ Planning (Research/Analysis/Synthesis) ➔ Execution (Generation/Verification) ➔ Delivering (Review)`.

3. **⚡ Quick Pipeline Mission (`quick_pipeline`)**:
   - **Behavior**: Jump directly into any random phase or stage (e.g., jump straight to Stage 3 Execution Stage 3.1 Generation), bypassing all prior stages.

4. **🔄 Custom Entry Pipeline Mission (`custom_entry_pipeline`)**:
   - **Behavior**: Execute the entire start-to-end pipeline selecting the specific loop or phase to start from (e.g., start at Planning / Deep Research), proceeding sequentially from that entry point all the way to Delivery.

5. **🎛️ Custom Selection Pipeline Mission (`custom_selection_pipeline`)**:
   - **Behavior**: Execute the pipeline with ONLY user-selected loops and phases (multi-selection enabled), automatically skipping any non-selected stages.

---

## 3. EFFORT PARAMETERS & MULTI-ROUND LOOP ENGINE

### EFFORT Level Configuration
EFFORT levels govern the loop depth, search intensity, and iteration limit across research and verification loops:

| EFFORT Level | Loop Rounds | Use Case |
| :--- | :--- | :--- |
| **LOW** | 1 Round | Simple code fixes, quick queries, standard single-file modifications |
| **MEDIUM** | 2 Rounds | Standard feature builds, multi-file refactoring, basic research |
| **HIGH** | 3 Rounds | Complex multi-system pipelines, deep architecture design, optimization |
| **DEEP** | 5 Rounds | Mission-critical system builds, enterprise data ingestion, exhaustive research |

### Evolutionary Tracking Across Rounds (Round > 1)
When running multi-round loops (EFFORT >= MEDIUM):
- **Deduplication Memory**: Previously analyzed web pages, URLs, database records, and code snippets are tracked to prevent duplicate searches.
- **Incremental Refinement**: Each round builds upon previous findings, refining search queries and code hypotheses based on recorded gaps.
- **Dependency Mapping**: Every item in `Deliverables` explicitly maintains relational link IDs to its source documents in `Sources`.

---

## 4. MULTI-TURN PERSISTENCE & REAL-TIME SYNCHRONIZATION

During every turn of mission execution, the agent MUST maintain strict state synchronization:
1. **State Indexing**: Update `missions.json`, `workspace.json` (preserving/indexing `sources`, `deliverables`, `pendings`, `actions`, and `action_items` with metadata fields `type`, `level`, `description`, `when_to_use`, `triggers`, and `flagged_as_action`), `harness.json`, and `tenant.json` immediately upon completing task steps.
2. **Disk Storage**: Store scoping, research, analytics, and plans in Phase subdirectories under `workspace/` (e.g. `Discovery & Scoping`, `Executions`, `Reviews`). Maintain active execution scratchpads under `missions/{missionId}/`.
3. **Real-time Event Logging**: Append progress events and telemetry to `tenant.json` and `harness.json`.



