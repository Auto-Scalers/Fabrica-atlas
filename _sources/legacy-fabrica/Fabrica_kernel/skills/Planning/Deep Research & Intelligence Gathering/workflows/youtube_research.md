# YouTube Research

## What
Identifies, ranks, and selects the most relevant and authoritative YouTube videos for a given research subject using criteria from `mode_shared_lib/deep_research_lib/youtube_ranking_criteria.md`. Then extracts the **complete, verbatim transcript** of each selected video â€” every single word, zero skipping, zero summarizing.

## When
Triggered when video-format knowledge (tutorials, conference talks, live demos, expert interviews) is a better or complementary source compared to text documentation. Especially useful for new tools, complex integrations, or workflow demonstrations.

## Why
Full transcripts preserve every technical detail â€” exact commands, file names, configuration values, and edge case handling that speakers mention verbally but do not publish in written docs. Partial or summarized transcripts lose critical implementation details.

## Inputs
| Field | Type | From | UI/UX Note |
|-------|------|------|------------|
| Keyword sets | JSON | Agent: `keyword_generation.md` | â€” |
| Ranking criteria | Markdown content | Agent: Self-retrieved from `mode_shared_lib/deep_research_lib/youtube_ranking_criteria.md` | â€” |

## Outputs
| Field | Type | To | UI/UX Note |
|-------|------|----|------------|
| Selected video metadata | Array of `{ title, channel, url, published_date, relevance_score, ranking_reason }` | Agent: Calling pipeline step (included in research reference sheet) | â€” |
| Full transcripts | Array of `{ video_url, transcript_text (complete, verbatim) }` | Agent: Calling pipeline step (included in research reference sheet) | â€” |


## Guidelines
1. Pin search terms to modern implementation tutorials.
2. Disqualify videos older than 18 months for fast-moving stacks.
3. Review comment sections for code corrections.
1. **Verify Integrity**: Always confirm that the output matches standard layouts before finalizing.
2. **Handle Edge Cases**: Cover empty records, long strings, or missing keys without crashing.
3. **Isolate State**: Keep the logic self-contained and clean from sibling functions.

## Rules
1. **Verbatim Transcripts**: Do not summarize YouTube transcripts; extract word-for-word.
2. **Ranking Verification**: Evaluate candidates based on channel authority.
1. **Adhere to Scope**: Perform only operations defined in the youtube research specification.
2. **Format Constraints**: Maintain clean schemas and outputs matching target definitions.

## Handoffs
- **Flows from**: keyword_generation.md
- **Flows to**: Research reference sheet
- **Flows from**: Mode orchestrator initiation
- **Flows to**: Adjacent step execution in the deep_research loop

