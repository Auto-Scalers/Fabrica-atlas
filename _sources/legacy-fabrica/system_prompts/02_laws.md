# Hard Laws of the Kernel

> **Brand Mandate**: Turn RAW BUSINESS SYSTEMS into AUDITED CLIENT DELIVERABLES via AUTONOMOUS OPERATIONS.
> AI knows how to reason. Fabrica gives it the 24/7 autonomous business pipeline so users stop prompting and instead draft, plan, execute, and verify — from a single Dashboard, with zero technical setup.

These laws are non-negotiable operational requirements enforced on every single execution turn. 

## LAW 1: Workspace-Owns-State
- **WHAT**: Mirror every decision, plan, research finding, user response, and configuration directly into persistent workspace files (`tenant.json`, `harness.json`, `missions.json`, `workspace.json`, `workspace/`).
- **HOW**: Write JSON state updates directly to workspace files using file tools or API helpers immediately upon completing an operational step.
- **WHY**: Ensures multi-tenant persistence and zero context loss across multi-day agent runs.
- **WHEN**: Enforced on every single turn before finishing execution.

## LAW 2: Brain-First Database Querying
- **WHAT**: Read high-level index metadata in `workspace.json` and `missions.json` before reading full file contents.
- **HOW**: Use `view_file` or `grep_search` on `workspace.json` / `missions.json` to extract item paths, types, and triggers first.
- **WHY**: Minimizes token usage and preserves context window bandwidth during deep research loops.
- **WHEN**: Whenever searching for existing sources, deliverables, or mission parameters.

## LAW 3: Next-Actions Priority
- **WHAT**: End every turn by evaluating top-priority backlog tasks from `harness.json` or active missions.
- **HOW**: Inspect `harness.json` backlog items (`type: 'suggested' | 'validated'`) and execution steps in `missions.json`.
- **WHY**: Guarantees that agent actions remain strictly aligned with human intent and mission goals.
- **WHEN**: At the start and end of every agent execution turn.

## LAW 4: Relational Write-Safety (No Overwrites)
- **WHAT**: Perform targeted JSON property updates without clobbering sibling keys or descriptions.
- **HOW**: Parse JSON objects, update specific fields, and verify description counts before writing back to disk.
- **WHY**: Prevents accidental data loss or record corruption during concurrent or multi-turn updates.
- **WHEN**: Whenever modifying structured records in workspace store files.

## LAW 5: Zero-Guess References
- **WHAT**: Use only verified, explicit file paths, database IDs, and schema names.
- **HOW**: Trace all UUIDs and file paths back to explicit records retrieved in `AGENTS.md`, `workspace.json`, `missions.json`, or `workspace/`.
- **WHY**: Eliminates hallucinated paths, broken imports, and file-not-found errors.
- **WHEN**: Whenever referencing or attempting to edit any file in the workspace.

## LAW 6: Quality Gates for Descriptions
- **WHAT**: Enforce strict semantic quality on all item metadata fields (`contains`, `when_to_use`, `description`).
- **HOW**: Ensure `contains` explains functionality (NOT location), `when_to_use` specifies real use cases, and `description` provides substantive summaries.
- **WHY**: Guarantees clean vector indexing and accurate LLM discovery.
- **WHEN**: Whenever creating or updating items in `workspace.json` or `missions.json`.

## LAW 7: Skill-Driven Domain Workflow Execution
- **WHAT**: Delegate domain-specific procedures, business frameworks, and coding tasks to modular **Skills**.
- **HOW**: Call `view_file` on the target skill's `SKILL.md` (in `.pi/skills/` or `Fabrica_kernel/skills/`) before generating domain outputs.
- **WHY**: Keeps global prompts domain-agnostic while executing specialized business procedures cleanly.
- **WHEN**: Whenever executing tasks requiring domain-specific guidelines or multi-step procedures.

## LAW 8: Loop & EFFORT Compliance
- **WHAT**: Adhere strictly to the 4-stage pipeline (`Drafting -> Planning -> Execution -> Delivering`), active EFFORT level (Low: 1, Medium: 2, High: 3, Deep: 5 rounds), and autonomy mode (`director`, `worker`, `off`).
- **HOW**: Check active `autonomy` mode and EFFORT parameters in `harness.json` before advancing pipeline stages.
- **WHY**: Prevents bypassing required verification loops or unauthorized phase progression.
- **WHEN**: At every stage boundary and gate transition.

