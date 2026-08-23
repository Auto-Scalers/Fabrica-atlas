# Layout Synthesis

## What
Translates the user's confirmed option selection into a final, concrete architectural or visual blueprint: folder structures, component maps, data flow relationships, and key design decisions.

## When
After the user submits their QA selection from the options presentation panel. This is the final output of the brainstorming mode cycle.

## Why
User selections are abstract preferences â€” "I like option B" is not actionable. Layout synthesis converts that preference into a concrete blueprint that the next pipeline step or planning phase can use directly.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| User's selected option | JSON (from `missions.qa_state.user_selections`) | User | **UI: User selects option via Mission Overlay QA Panel and submits.** |
| Structured problem map | JSON | Agent: `brief_interpretation.md` (retained in session context) | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Architecture / layout blueprint | Structured JSON `{ structure, components[], data_flows[], key_decisions[] }` | Agent: Calling pipeline step (step_3 or as final output for step_7) | â€” |


## Guidelines
1. Draft the route architecture before visual layouts.
2. Keep nested component levels shallow.
3. Ensure layout files expose barrel exports.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Clean Scaffolding**: Output a structured file tree detailing all target folders.
2. **Interface Binding**: Explicitly bind components to Supabase tables.
1. **Adhere to Scope**: Perform only operations defined in the layout synthesis specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

## Handoffs
- **Flows from**: QA selection confirmation
- **Flows to**: Pipeline Step 5 (Selection Analysis)
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the brainstorming loop

