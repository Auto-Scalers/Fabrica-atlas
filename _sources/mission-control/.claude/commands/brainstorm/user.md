Brainstorm ideas about: $ARGUMENTS

## Setup

1. Read `mission-control/data/ai-context.md` for current state snapshot
2. Read `mission-control/data/brain-dump.json` to see existing ideas (avoid duplicates)
3. Read `mission-control/data/projects.json` to understand active projects and their context
4. Read `mission-control/data/goals.json` to understand strategic priorities

## Brainstorming Phase

Generate **at least 10 ideas** related to the topic. For each idea, provide:

```
### Idea N: <Title>
**Description:** 1-2 sentences explaining the idea
**Pros:** What makes this idea valuable
**Cons:** Risks, costs, or downsides
**Effort:** Low / Medium / High
**Impact:** Low / Medium / High
```

Think from **multiple angles**:
- **Technical** — tools, automations, architecture improvements
- **Marketing** — growth, content, positioning, distribution channels
- **User Experience** — usability, onboarding, delight factors
- **Business Model** — pricing, monetization, bundling, partnerships
- **Partnerships** — integrations, collaborations, affiliate opportunities
- **Unconventional** — contrarian approaches, blue ocean ideas, what competitors ignore

## Evaluation Phase

After presenting all ideas, rank your **top 3 picks** based on the best effort-to-impact ratio for a solo entrepreneur. Explain why each is a top pick in 1-2 sentences.

## Capture Phase

Ask me which ideas I want to keep. For each selected idea:

1. Add it to `mission-control/data/brain-dump.json` with:
   ```json
   {
     "id": "bd_{Date.now()}",
     "content": "<idea title and brief description>",
     "capturedAt": "<ISO timestamp>",
     "processed": false,
     "convertedTo": null,
     "tags": ["brainstorm", "<relevant-tag>"]
   }
   ```
2. Use the API: `POST /api/brain-dump` with the entry data

## Follow-up

After capturing ideas, ask if I want to:
- Convert any high-priority ideas directly into tasks (use `POST /api/tasks`)
- Group related ideas into a project concept
- Research any idea further (suggest running `/research`)
- Schedule a deeper brainstorm on a specific angle

Run `pnpm gen:context` after any data modifications.
