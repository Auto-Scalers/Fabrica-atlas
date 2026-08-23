# Standard Workflow: Direct Execution

## Overview
The Direct Execution workflow provides a streamlined, fast-path execution model for simple, well-defined tasks. It compresses standard multi-stage planning into a concise shorthand scoping cycle, enabling rapid delivery of one-off updates, bug fixes, and configuration adjustments.

## 1. Eligibility Criteria
A task is eligible for Direct Execution if ALL of the following apply:
- **No Schema Changes**: The task does not add, drop, or alter database schemas or shared data contracts.
- **Localized Impact**: The change affects only isolated UI components, configuration files, or individual helper scripts.
- **Unambiguous Scope**: The user request provides clear functional requirements without requiring external research or open-ended exploration.

## 2. Step-by-Step Execution Sequence
1. **Shorthand Scoping**:
   - Parse user brief and identify target files (`system_components`).
   - Define a 3-point bullet checklist of specific edits to be performed.
2. **Pre-Flight Safety Check**:
   - Verify file existence and read current content.
   - Confirm that no destructive operations will occur.
3. **Surgical Application**:
   - Apply targeted edits using exact string matching or modular file updates.
   - Keep modifications minimal and focused strictly on the requested task.
4. **Verification & Sign-off**:
   - Run linter/compiler verification if code files were modified.
   - Summarize applied changes and output completion status.
