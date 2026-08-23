# Official Source Query

## What
Retrieves content exclusively from authoritative, official documentation sources. Never uses forums, blog posts, Stack Overflow, or LLM training memory as a source. Uses `mode_shared_lib/deep_research_lib/source_registry.md` to identify the correct official source per domain.

## When
For every technology, API, or library in the research list after keywords are generated.

## Why
Forums and blogs frequently contain outdated, incorrect, or version-mismatched information. Official sources are the only reliable defense against hallucinated APIs and broken signatures.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Keyword sets | JSON | Agent: `keyword_generation.md` | â€” |
| Source registry | Markdown content | Agent: Self-retrieved from `mode_shared_lib/deep_research_lib/source_registry.md` | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Retrieved documentation | Array of `{ topic, source_url, content_excerpt, version }` | Agent: `api_verification.md`, `snippet_extraction.md` | â€” |


## Guidelines
1. Scope queries using the site: operator.
2. Target changelogs and migration guides.
3. Confirm library version constraints.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Registry Verification**: Source domains must match the official registry.
2. **No Forums**: Stack Overflow and blogs are strictly prohibited.
1. **Adhere to Scope**: Perform only operations defined in the official source query specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

## Handoffs
- **Flows from**: keyword_generation.md
- **Flows to**: api_verification.md
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the deep_research loop

