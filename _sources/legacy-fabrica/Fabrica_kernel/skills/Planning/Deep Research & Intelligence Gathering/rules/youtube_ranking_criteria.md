# YouTube Ranking Criteria

## What
Criteria for identifying, scoring, and selecting YouTube videos for research purposes. Used by `youtube_research.md` to rank candidate videos before extracting transcripts.

## When
Referenced at the start of every YouTube research operation to evaluate which videos are worth full transcript extraction.

## Ranking Criteria

### Primary Signals (High Weight)
| Criterion | Why It Matters |
|-----------|---------------|
| **Channel Authority** | Official channels (Supabase, Vercel, Odoo, n8n) > independent experts > general coding channels |
| **Recency** | Published within the last 18 months preferred; older videos flagged for version mismatch risk |
| **Title Specificity** | "Supabase RLS with Next.js App Router 2024" > "Supabase Tutorial" |
| **View Count + Engagement** | High views + high like ratio = validated by community |

### Secondary Signals (Medium Weight)
| Criterion | Why It Matters |
|-----------|---------------|
| **Runtime** | 10–45 minutes = deep technical content. <5 min = likely surface-level. >60 min = may contain the detail but costs more to process. |
| **Transcript Availability** | Auto-generated transcripts are acceptable; missing transcripts skip the video |
| **Comment Quality** | Comments mentioning specific implementation details or corrections indicate a knowledgeable audience |

### Disqualification Signals
- Title is clickbait or contains "COMPLETE COURSE" with no specific topic
- Published more than 3 years ago for fast-moving technologies (React, Supabase, Next.js)
- Channel has fewer than 1,000 subscribers with no official affiliation
- Video is a paid course preview with key content locked

## Scoring Formula
```
Score = (authority_weight × 40) + (recency_score × 30) + (specificity_score × 20) + (engagement_score × 10)
```
Select top 2–3 videos scoring above 60/100 for full transcript extraction.
