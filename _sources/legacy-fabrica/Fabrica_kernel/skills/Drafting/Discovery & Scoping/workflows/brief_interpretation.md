# Brief Interpretation

## What
Parses the user's raw brief, goals, and stated or unstated ambiguities into a clean, structured problem map: core objectives, constraints, success criteria, and open questions.

## When
Always the first operation in a brainstorming cycle â€” nothing proceeds until the brief is fully structured and ambiguities are surfaced.

## Why
Working from a vague or misunderstood brief produces misaligned options. Structuring the brief first ensures every subsequent creative step targets the actual problem.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Raw user brief | Free text | User | Captured via mission `title` and `objective` fields in mission creation form |
| Reference files (optional) | `raw_data` content (TEXT) | Agent: Calling pipeline step | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Structured problem map | JSON `{ objectives[], constraints[], success_criteria[], open_questions[] }` | Agent: `creative_ideation.md` | â€” |


## Guidelines
1. Identify missing configuration parameters early.
2. Avoid assuming technology choices not mentioned in the brief.
3. Parse raw customer text into key metrics.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Objective Mapping**: Map project objectives directly to database models.
2. **Scope Boundaries**: Explicitly list non-goals in the initial brief summary.
1. **Adhere to Scope**: Perform only operations defined in the brief interpretation specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

## Handoffs
- **Flows from**: Mission objective input
- **Flows to**: creative_ideation.md step
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the brainstorming loop

