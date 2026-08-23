---
name: eisenhower-triage
description: >
  Applies Eisenhower matrix logic to prioritize work. Use when the user asks about
  priorities, what to work on next, or when triaging tasks and brain dump items.
---

# Eisenhower Matrix Triage

## Quadrant Definitions
| Quadrant | Criteria | Action |
|----------|----------|--------|
| **DO** | important + urgent | Work on immediately |
| **SCHEDULE** | important + not-urgent | Block time, protect from neglect |
| **DELEGATE** | not-important + urgent | Assign to an AI agent |
| **ELIMINATE** | not-important + not-urgent | Drop or defer |

## Triage Rules
1. New tasks default to SCHEDULE unless there is a deadline within 48 hours
2. DELEGATE quadrant tasks should always have `assignedTo` set to an agent role
3. Never let SCHEDULE accumulate >10 unstarted tasks without review
4. Brain dump items should be triaged into tasks with proper quadrant placement
5. Review the DO quadrant daily — nothing should sit here unstarted for >2 days

## Priority Order Within Quadrants
1. DO → by urgency deadline, then by creation date
2. SCHEDULE → by importance to long-term goals, then by milestone deadline
3. DELEGATE → by agent availability, then by urgency
4. ELIMINATE → review weekly, remove or reclassify

## Brain Dump Triage Flow
1. Read each unprocessed entry
2. Decide: Is this actionable? → If yes, create a task with importance/urgency
3. Set `processed: true` on the brain dump entry
4. Set `convertedTo: "task_{id}"` if converted, or `null` if archived
