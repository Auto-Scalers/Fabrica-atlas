# Blocker Detection

## What
Surfaces all integration blockers discovered during research: required billing or subscription setup, missing API keys, restricted OAuth scopes, rate limits, IP whitelisting requirements, regional availability restrictions, or mandatory onboarding steps.

## When
Runs as a final pass after all other research operations complete. Always appended to the reference sheet before delivery to the calling pipeline step.

## Why
A pipeline that hits a billing wall or a missing-key error mid-execution loses all progress. Surfacing blockers before execution begins allows the user to resolve them or choose an alternative approach.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Retrieved documentation | Array of doc excerpts | Agent: `official_source_query.md` | â€” |
| Verified API specs | JSON | Agent: `api_verification.md` | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Blocker list | Array of `{ type, description, resolution_path }` | Agent: Calling pipeline step (appended to research reference sheet) | **UI: If critical blockers found, they are surfaced in the Mission Overlay Panel as a warning card before execution begins.** |


## Guidelines
1. Look for rate limitations on third-party endpoints.
2. Check for regional IP restrictions.
3. Review token expiration flows.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Blocker Flagging**: Mark any mandatory subscription or credential requirement.
2. **Explicit Risk Level**: Highlight limits as blocker risks.
1. **Adhere to Scope**: Perform only operations defined in the blocker detection specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

## Handoffs
- **Flows from**: snippet_extraction.md
- **Flows to**: Research reference sheet
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the deep_research loop

