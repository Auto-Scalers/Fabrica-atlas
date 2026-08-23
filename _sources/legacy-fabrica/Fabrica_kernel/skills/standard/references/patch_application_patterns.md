# Reference: Patch Application Patterns

## Overview
This reference provides standardized patterns for applying surgical code patches, configuration adjustments, and text updates safely in standard missions.

## 1. Surgical String Replacement
- Always match a logically complete syntactic statement (complete line, complete function signature, or complete JSON block).
- Ensure leading whitespace matches exactly to prevent matching errors.

## 2. Safe Configuration Updating
- When editing JSON files (`package.json`, `metadata.json`, etc.), ensure valid syntax and trailing comma rules are respected.
- When updating UI text or copy, maintain responsive layout bounds and prevent label overflow.

## 3. Verification Post-Patch
- Always verify that the patched file compiles and lints cleanly without introducing unexpected side effects.
