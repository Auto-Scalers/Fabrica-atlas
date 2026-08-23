# Keyword Generation

## What
Generates precise, targeted search keyword sets and boolean phrase combinations tuned specifically to the research subject. Avoids generic broad terms that return noisy, irrelevant results.

## When
Always runs first in a deep research cycle â€” every other research operation is guided by the keywords produced here.

## Why
The quality of search keywords is the single largest determinant of research quality. Imprecise keywords waste time and produce hallucination-prone results.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Research topic list | Array of strings | Agent: Calling pipeline step | â€” |
| Target domain / technology stack | String | Agent: Calling pipeline step | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Keyword sets | JSON `{ topic, keywords[], boolean_phrases[], source_hints[] }` per topic | Agent: `official_source_query.md`, `youtube_research.md` | â€” |


## Guidelines
1. Use boolean search operators (AND/OR/NOT).
2. Include specific framework names (Express, Next.js).
3. Refine keywords based on previous search volumes.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Scope Precision**: Query parameters must pin specific library major versions.
2. **No Broad Queries**: Avoid general queries that return noisy results.
1. **Adhere to Scope**: Perform only operations defined in the keyword generation specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

## Handoffs
- **Flows from**: Pipeline Research trigger
- **Flows to**: official_source_query.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the deep_research loop

