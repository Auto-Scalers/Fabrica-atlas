# Standard Rules: Safety & Backup Rules

## Overview
Standard tasks often perform direct modifications on existing configuration files, environment settings, and code components. Safety rules guarantee that any change can be safely inspected and reverted if regressions occur.

## 1. Pre-Modification Inspection
- Always invoke `view_file` on target files before making edits.
- Ensure the exact context of the edit is confirmed (avoiding stale file assumptions).

## 2. Configuration & State Backups
- Before modifying critical configuration files (e.g., `package.json`, `tsconfig.json`, `tailwind.config.ts`, or environment templates), verify that changes are non-destructive and backward-compatible.
- When applying experimental patch adjustments, preserve fallback values or document rollback instructions in the task log.

## 3. Post-Modification Verification
- After applying code edits, immediately verify code integrity using linter checks (`npm run lint`) and compiler checks (`compile_applet`).
- If an automated check fails, apply corrective fixes immediately before signaling task completion.
