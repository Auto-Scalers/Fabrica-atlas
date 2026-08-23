# Creative Brief Template

## What
A standard template for structuring creative briefs before brainstorming begins. Ensures all critical information is captured consistently.

## When
Used by `brief_interpretation.md` to structure the raw user input into a parseable format.

## Template

```json
{
  "project_name": "",
  "primary_objective": "",
  "target_users": [],
  "core_features": [],
  "constraints": {
    "technical": [],
    "business": [],
    "timeline": ""
  },
  "success_criteria": [],
  "open_questions": [],
  "inspiration_references": [],
  "non_goals": []
}
```

## Field Guidance
- **primary_objective**: One sentence. What problem does this solve?
- **core_features**: The must-haves. Limit to 5. Anything beyond 5 goes in a "nice to have" list.
- **constraints**: Real limitations — not preferences. "We want it fast" is a preference; "Must run on Port 3000" is a constraint.
- **success_criteria**: Measurable outcomes. "Users can create a mission in under 30 seconds" — not "it should feel good."
- **non_goals**: Explicitly what this will NOT do. Critical for preventing scope creep.
