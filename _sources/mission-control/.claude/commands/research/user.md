Research the following topic thoroughly: $ARGUMENTS

## Setup

1. Read `mission-control/data/ai-context.md` for current project context and priorities
2. Read `mission-control/data/projects.json` to understand active projects
3. Read `mission-control/data/goals.json` to understand strategic goals
4. Check the `research/` folder for any existing research on this or related topics

## Research Framework

### 1. Problem Statement
Before researching, clearly define:
- **What** specific question(s) are we trying to answer?
- **Why** does this matter for the business?
- **Scope** — what is in/out of scope for this research?

### 2. Methodology
Use these research methods as applicable:
- **Web search** — search for current, authoritative sources (prioritize recent data)
- **Competitive analysis** — identify what competitors/alternatives do
- **Data gathering** — collect relevant statistics, benchmarks, pricing data
- **Expert opinions** — find credible expert takes and industry analysis
- Cross-reference **at least 3 sources** for key claims

### 3. Output Structure
Write findings as a structured markdown document with this format:

```markdown
# Research: <Topic Title>
_Date: YYYY-MM-DD | Researcher: AI Research Agent_

## Executive Summary
3-5 sentences summarizing the most important findings and recommendation.

## Problem Statement
What we set out to answer and why it matters.

## Key Findings
- **Finding 1:** [detail with supporting evidence]
- **Finding 2:** [detail with supporting evidence]
- (continue as needed)

## Competitive Landscape
| Competitor/Alternative | Approach | Strengths | Weaknesses |
|----------------------|----------|-----------|------------|
| ... | ... | ... | ... |

## Opportunities
- [Actionable opportunity with rationale]

## Risks & Concerns
- [Risk with mitigation strategy]

## Recommendations
1. **[Action item]** — why and expected impact
2. **[Action item]** — why and expected impact

## Sources
- [Source title](URL) — what was used from this source
```

### 4. Save Output
- Save the markdown file to `research/<descriptive-filename>.md`
- Use kebab-case filenames: e.g., `research/ai-pricing-models-2026.md`
- Do NOT overwrite existing research files — create new ones

## Post-Research Actions

1. **Post a completion report** to inbox using `POST /api/inbox`:
   ```json
   {
     "from": "researcher",
     "to": "me",
     "type": "report",
     "subject": "Research Complete: <topic>",
     "body": "<executive summary + file location + key recommendation>",
     "status": "unread"
   }
   ```

2. **Log activity** using `POST /api/activity-log`:
   ```json
   {
     "type": "task_completed",
     "actor": "researcher",
     "summary": "Completed research on <topic>",
     "details": "Saved to research/<filename>.md"
   }
   ```

3. If this research was for a specific task, update the task's notes field with a link to the research file.

4. Run `pnpm gen:context` after any data modifications.

## Quality Checklist
Before finishing, verify:
- [ ] At least 3 independent sources referenced
- [ ] Recommendations are specific and actionable (not generic advice)
- [ ] Solo entrepreneur context considered (limited time, budget, need for leverage)
- [ ] Competitive landscape included where relevant
- [ ] File saved to research/ folder
- [ ] Completion report posted to inbox
