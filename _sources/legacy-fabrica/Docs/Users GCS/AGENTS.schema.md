# `AGENTS.md` Specification & Schema

- **Target File Path**: `/mnt/AGENTS.md`
- **File Format**: Markdown (`text/markdown`)
- **Purpose**: User-defined persistent instructions, project-level guidelines, coding conventions, and operational preferences.
- **Agent Integration**: Automatically prepended to the agent's prompt context on every CLI turn.

## Example Specification

```markdown
# Custom Agent Operational Guidelines

## Code Style
- Use TypeScript with strict typing.
- Prefer modular functional components in React.

## Audit Directive
- Log major state transitions and execution events to runtime-board.json.
```
