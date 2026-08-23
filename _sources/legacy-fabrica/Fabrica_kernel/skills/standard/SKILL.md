---
name: standard
description: Standard Mission skill for general-purpose tasks, one-off updates, recurring maintenance routines, and flexible pipeline launchers (Full, Quick Jump, Custom Entry, Custom Selection).
---

# Mission Workflow: Standard & Flexible Pipeline Launchers

## Metadata
- **What**: Standard mission workflow for processing general work tasks, one-off updates, configuration patches, recurring maintenance routines, and targeted pipeline launchers.
- **When**: Invoked when handling standard general-purpose tasks or launching customized multi-mode pipelines.
- **Why**: Provides a fast, flexible execution path for direct tasks, recurring maintenance rounds, and configurable pipeline entries (Quick Jump, Custom Entry, Custom Selection) without unnecessary overhead.
- **Triggers**: Mission creation via UI modal (`standard`, `full_pipeline`, `quick_pipeline`, `custom_entry_pipeline`, `custom_selection_pipeline`).
- **Inputs**: User brief, optional raw data IDs, target stack specs, target file paths, selected pipeline phases.
- **Outputs**: Code/configuration changes, execution reports, updated mission state.

This workflow governs how the agent handles custom Standard and flexible pipeline missions, processing inputs to produce business outputs across 5 launcher modes:
1. **🎯 Standard Mission (`standard`)**: Direct goal targets & autonomous task execution.
2. **🚀 Full Pipeline Mission (`full_pipeline`)**: End-to-end sequential execution across Stage 1 Drafting ➔ Stage 4 Delivering.
3. **⚡ Quick Pipeline Mission (`quick_pipeline`)**: Direct phase jump into any specific stage (e.g. Stage 3 Execution), bypassing prior phases.
4. **🔄 Custom Entry Pipeline Mission (`custom_entry_pipeline`)**: Executes the entire start-to-end pipeline starting from a selected entry phase and running sequentially through downstream stages.
5. **🎛️ Custom Selection Pipeline Mission (`custom_selection_pipeline`)**: Executes ONLY selected loops and phases, skipping unselected ones.

---

## 1. PURPOSE & INSTRUCTIONS
Standard missions are the default vehicle for general work tasks. Unlike specialized pipelines (which require a strict 7-step drafting sequence or a full 4-stage looped pipeline), a Standard mission can bypass deep analytics/research steps to perform quick, direct tasks like updating a visual card, correcting a typo, running a health check, or writing a custom database query.

Use standard missions for:
- One-off visual corrections, text updates, or configuration patches.
- Periodic, recurring maintenance tasks (such as checking database backup states or refreshing API tokens).
- Fast prototyping of simple client tools or utility scripts.

---

## 2. STRUCTURAL CHARACTERISTICS

### Recurring Rounds
A Standard mission can be configured to repeat automatically using two parameters under its database metadata:
- `rounds.status` (Boolean): If set to `true`, the mission restarts in PLANNING/EXECUTION status after completion.
- `rounds.persistent` (Boolean): If `true`, the mission repeats indefinitely. If `false`, it repeats up to a maximum round limit (`rounds.max`).

### Arbitrary Data Inputs
A Standard mission can link to any combination of `raw_data` or `system_components` records without requiring a strict schema structure.

---

## 3. OPERATIONAL LOGIC (WHAT / HOW / WHY / WHEN)
- **WHAT**: Fast-path task execution, one-off fixes, visual updates, configuration patches, or recurring maintenance rounds without mandatory 4-stage pipeline overhead.
- **HOW**:
  1. Parse brief and target files/assets.
  2. Formulate quick plan directly without deep research unless modifying core database schemas.
  3. Execute task changes and run build/lint verification.
  4. Record updates in `workspace/Deliverables/Executions/` and update `missions.json` and `workspace.json`.
  5. Check `rounds.status` and `rounds.persistent` to handle recurring maintenance iterations.
- **WHY**: Provides maximum execution speed for simple, non-architectural tasks while keeping workspace stores synchronized.
- **WHEN**: Initiated for standard missions (`type = 'standard'`), quick pipeline jumps, or recurring maintenance schedules.

---

## 4. RULES
1. **Direct Drafting**: Only bypass deep analytical phases if the task is a simple fix and does not modify shared database schemas or core architectural boundaries.
2. **No Unapproved Writes**: Code edits must be defined in planning task lists and approved before execution unless operating in authorized fast-path or autonomy mode.
3. **Safety Fallbacks**: Save existing configurations and create file backups before applying updates.
4. **Round Governance**: For recurring missions, verify `rounds.max` and `rounds.status` before initiating a new round to prevent infinite unintended loops.

---

## 5. HANDOFFS
- **Receives from**: User creation interface, user brief, or direct integration trigger.
- **Delivers to**: Fast-path execution runner or stage verification report.

---

## 6. INDEXER
Below is the directory index of all supporting files organized across `workflows/`, `rules/`, and `references/`:

### Workflows
- **`workflows/direct_execution.md`**:
  - **What**: Shorthand scoping, direct task execution, and fast-path delivery for one-off tasks.
  - **When**: Executed when handling standard one-off bug fixes, text updates, or configuration adjustments.
  - **Why**: Eliminates unnecessary multi-stage overhead while maintaining quality control.
  - **Triggers**: Initiation of a single-shot Standard mission.

- **`workflows/recurring_maintenance.md`**:
  - **What**: Periodic execution, state persistence, backup verification, and round management (`rounds.status`, `rounds.persistent`, `rounds.max`).
  - **When**: Executed during automated recurring maintenance cycles.
  - **Why**: Ensures reliable background execution of system checks, cleanup jobs, and token refreshes.
  - **Triggers**: Scheduled interval or recurring round restart.

- **`workflows/prototyping_flow.md`**:
  - **What**: Fast interactive prototyping of simple client tools and lightweight scripts.
  - **When**: Executed when testing simple hypotheses or building proof-of-concept components.
  - **Why**: Encourages rapid iteration with immediate feedback loops.
  - **Triggers**: Prototyping brief or exploration task.

### Rules
- **`rules/fastpath_scoping_rules.md`**:
  - **What**: Criteria and guardrails for when a mission can safely bypass multi-stage drafting.
  - **When**: Checked before selecting the fast-path execution workflow.
  - **Why**: Prevents complex architectural changes from skipping necessary planning and verification.
  - **Triggers**: Mission scoping evaluation.

- **`rules/safety_and_backup_rules.md`**:
  - **What**: Rules for backing up config files, preserving rollback states, and preventing unintended data loss during standard edits.
  - **When**: Enforced before modifying existing code, configs, or database records.
  - **Why**: Guarantees recovery capability if a quick patch introduces regression.
  - **Triggers**: Pre-execution safety check.

- **`rules/recurring_round_rules.md`**:
  - **What**: Operational rules for recurring missions, round counter increments, and termination conditions.
  - **When**: Applied at the completion of each recurring round.
  - **Why**: Controls loop lifecycle and prevents runaway automated execution.
  - **Triggers**: Mission round transition.

### References
- **`references/maintenance_checklist.md`**:
  - **What**: Checklist for standard system maintenance routines (database backups, token refreshes, health checks).
  - **When**: Consulted during recurring maintenance workflows.
  - **Why**: Ensures standard maintenance procedures follow consistent operational standards.
  - **Triggers**: Maintenance mission execution.

- **`references/patch_application_patterns.md`**:
  - **What**: Reference patterns for safe configuration patches, environment updates, and surgical text edits.
  - **When**: Referenced when applying quick patches to codebase or system settings.
  - **Why**: Standardizes surgical patch application across standard tasks.
  - **Triggers**: Patch implementation step.
