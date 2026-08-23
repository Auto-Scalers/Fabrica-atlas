# Snippet Extraction

## What
Extracts typed, production-ready code snippets from verified documentation. Includes correct import statements, lazy initialization patterns (no client-load-time crashes on missing keys), and inline type annotations.

## When
After API verification produces verified specs; produces the actionable code artifacts that build and optimization modes consume directly.

## Why
Bridges research output to implementation. Without typed snippets, the build agent must re-derive correct patterns from prose documentation â€” reintroducing the hallucination risk this mode was designed to eliminate.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Verified API specs | JSON | Agent: `api_verification.md` | â€” |
| Retrieved documentation | Array of doc excerpts | Agent: `official_source_query.md` | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Code snippets | Array of `{ description, language, code, imports[], lazy_init: boolean }` | Agent: Calling pipeline step (included in research reference sheet) | â€” |


## Guidelines
1. Pull copy-paste-ready database client queries.
2. Clean unused variables from code templates.
3. Wrap integration routines in lazy-loading handlers.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Zero Hallucination**: Do not write placeholders or dummy imports in snippets.
2. **Comment Retention**: Retain all comments explaining complex logic.
1. **Adhere to Scope**: Perform only operations defined in the snippet extraction specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

## Handoffs
- **Flows from**: api_verification.md
- **Flows to**: blocker_detection.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the deep_research loop

