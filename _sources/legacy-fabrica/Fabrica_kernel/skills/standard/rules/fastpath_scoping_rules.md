# Standard Rules: Fast-Path Scoping Rules

## Overview
Fast-path scoping allows standard missions to skip complex multi-stage research and architectural blueprints when tasks are straightforward and low-risk.

## 1. Eligibility Checklist
Before applying fast-path scoping, verify that:
1. **No Core Schema Impact**: The change does not modify shared database tables, migration scripts, or core data models.
2. **No Breaking API Changes**: Existing API route contracts, request payloads, and response interfaces remain intact.
3. **Clear Requirements**: The task scope is well-understood without requiring open-ended research or external competitor benchmarking.

## 2. Prohibited Shortcuts
Even under fast-path scoping, the agent MUST NOT:
- Skip reading files (`view_file`) before editing them.
- Apply unchecked edits without running linter or compilation checks afterwards.
- Delete user-created files without explicit confirmation.

## 3. Escalation Trigger
If during fast-path scoping it becomes clear that the change touches architectural boundaries or requires multi-table database refactoring, the agent must immediately promote the mission to a formal **4-Stage Looped Pipeline** (`Drafting -> Planning -> Execution -> Delivering`).
