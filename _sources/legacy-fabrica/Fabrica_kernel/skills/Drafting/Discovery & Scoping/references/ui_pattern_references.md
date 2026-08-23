# UI Pattern References

## What
Curated references to modern SaaS and web application UI/UX design patterns — layout systems, data-dense dashboards, kanban boards, overlay panels, card systems, and navigation patterns used by leading products.

## When
Referenced by `precedents_research.md` during brainstorming cycles to ground creative ideation in proven, real-world design patterns.

## Why
Good design does not start from scratch. Real-world SaaS patterns are battle-tested against user behavior and conversion. Referencing them prevents reinventing established solutions.

## Pattern Categories

### Dashboard Layouts
- **Sidebar + Main Content**: Fixed left navigation, scrollable main area. Used by: Linear, Notion, Vercel.
- **Three-Panel Grid**: Left config panel, center main board, right detail/output panel. Used by: Fabrica, Trello, Figma.
- **Full-Width Data Grid**: Maximum screen real estate for tables and analytics. Used by: Airtable, Google Sheets.

### Mission / Project Tracking
- **Horizontal Status Board (Kanban)**: Columns = statuses, rows = categories. Cards move left to right. Used by: Linear, Jira, Fabrica Missions Board.
- **Timeline / Gantt**: Task dependencies shown as horizontal time bars. Used by: Asana, Notion.

### Overlay & Detail Panels
- **Side Drawer**: Slides in from the right, overlays main content without navigating away.
- **Modal Overlay**: Full-focus panel for complex interactions (QA gates, form submissions).
- **Inline Expansion**: Card expands in-place to reveal detail.

### Data Visualization
- **Bento Grid**: Unequal-sized cards in a grid, each showing a single metric or chart.
- **Force-Directed Graph**: Node-link visualization for dependency mapping (D3).
- **Line/Area Charts**: Time-series trends. Used for telemetry dashboards.

### Interaction Patterns
- **Skeleton Loading**: `animate-pulse` grey blocks while data loads.
- **Optimistic UI**: Update the UI immediately on action, rollback if the server fails.
- **Micro-animations**: `transition-all duration-200` on hover/active states for every interactive element.
