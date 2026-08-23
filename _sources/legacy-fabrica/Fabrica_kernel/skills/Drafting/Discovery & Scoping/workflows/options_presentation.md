# Options Presentation

## What
Formats creative directions into structured QA selection cards with a clear "Why this option?" rationale for each. Writes the formatted options to `missions.qa_state` and triggers the QA user gate.

## When
After creative ideation produces raw direction objects; this is the last step before the user is presented with choices.

## Why
Users cannot make informed decisions from raw agent text. Structured cards with explicit rationale make each option comparable, scannable, and actionable.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Raw creative directions | Array of direction objects | Agent: `creative_ideation.md` | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| QA options | JSON written to `missions.qa_state` | User | **UI: Rendered as selectable option cards in the Mission Overlay QA Panel. Each card shows: option title, description, why statement, and a select button. User must select before execution continues.** |

## Handoffs
- **Flows from**: creative_ideation.md
- **Flows to**: QA User Gate
- **Delivers to**: User (Mission Overlay QA Panel) â€” execution is frozen until user submits their selection.


## Guidelines
1. Write options clearly in user-facing language.
2. Avoid developer jargon in QA card descriptions.
3. Highlight critical integration needs.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Direct UI Injection**: Write the options directly to missions.qa_state.
2. **Card Structure**: Use structured title, cost, risk, and benefit parameters.
1. **Adhere to Scope**: Perform only operations defined in the options presentation specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

