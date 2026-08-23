# Creative Ideation

## What
Generates diverse, genuinely distinct creative directions from the structured problem map. Each direction must differ meaningfully in approach, architecture, or visual philosophy â€” not just cosmetically. Minimum three directions.

## When
After `brief_interpretation.md` produces the problem map; before options are formatted for user presentation.

## Why
Options that are variations of the same idea do not give the user a real choice. True creative divergence at this step prevents lock-in to a single framing.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Structured problem map | JSON | Agent: `brief_interpretation.md` | â€” |
| Precedents / reference patterns (optional) | Markdown content | Agent: `precedents_research.md` or `mode_shared_lib/brainstorming_lib/` | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Raw creative directions | Array of direction objects `{ name, concept, approach, visual_tone, key_benefits }` | Agent: `options_presentation.md` | â€” |


## Guidelines
1. Look for modern SaaS layout precedents (notion-style, grid layouts).
2. Think of UX micro-animations early.
3. Emphasize responsive layouts.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Option Divergence**: Generate exactly 3 distinct conceptual directions.
2. **Tradeoff Analysis**: Formulate explicit pros/cons for each option.
1. **Adhere to Scope**: Perform only operations defined in the creative ideation specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

## Handoffs
- **Flows from**: brief_interpretation.md
- **Flows to**: options_presentation.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the brainstorming loop

