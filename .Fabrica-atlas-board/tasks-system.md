# Tasks Panel (GitHub/Jira) + Task Sources — Existing System Reference

> **Focus system #3.** Describes what Fabrica ALREADY has for the in-app task/issue board, GitHub/Jira/Linear integrations, and task-source ingestion. Companion ideas live in `ideas.md` (section: Tasks panel).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-runtime-structured-read.md`, `fa-ipc-watchers.md`, `fa-auth-onboarding.md`, `fa-mobile-companion.md`.

---

## 1. Purpose & Scope

The Tasks surface lets users view and act on issues/tasks from external trackers (GitHub, GitLab, Linear, Jira, Bitbucket, Azure DevOps, Gitea) inside Fabrica, plus ingest "task sources" during onboarding/mobile. It is a **read+write bridge to external trackers**, not an internal task DAG (that is orchestration's `Task`).

**How it works:** The Tasks panel is Fabrica's window into the issue trackers your team already uses (like Jira or GitHub Issues). You can read and update those tickets from inside Fabrica without opening a browser, and during setup or on your phone you can pull in tasks from those services as sources to work on.

## 2. Architecture (what exists)

- **Main view**: `task page` activeView; `TaskPage.tsx` is the main task page (`fabrica-app-discovery.md:140`; `Fabrica-features.md:213`).

  **How it works:** Selecting the Tasks view opens a dedicated page that lists and displays the issues/tasks pulled from your connected trackers.

- **Per-provider issue workspaces**: `JiraIssueWorkspace`, `LinearIssueWorkspace`, `LinearItemDrawer`, `LinearProjectViewSurfaces`, `GitHubItemDialog`, `GitLabItemDialog` (`Fabrica-features.md:214-217,221`).

  **How it works:** Each connected service (Jira, Linear, GitHub, GitLab) gets its own tailored workspace with the right fields and dialogs, so a Jira ticket looks and behaves like a Jira ticket and a Linear issue like a Linear issue.

- **Connection UIs**: `JiraConnectDialog`, `LinearApiKeyDialog`, `TaskProjectSourceCombobox` (`Fabrica-features.md:221-223`).

  **How it works:** These are the screens where you paste an API key or pick which project to connect, so Fabrica can authenticate and start pulling in that service's tasks.

- **GitHub Projects V2 board**: `github-project/` ~29 board-table components (ProjectPicker, ProjectViewList, ProjectRow, ProjectCell…) (`Fabrica-features.md:304-310`; `fabrica-app-discovery.md:143`).

  **How it works:** Fabrica renders GitHub's newer "Projects V2" boards natively, with about 29 small components that together draw the picker, the table rows, and each cell so you can work a GitHub project board inside Fabrica.

- **Deep Linear integration** (~2,200 LOC): `linearConnect`, `linearSaveIssue`, `linearResolveCurrentIssue`, MCP issue-list, custom views, teams/states/labels (`fa-runtime-structured-read.md:86`).

  **How it works:** Fabrica has a large, detailed connection to Linear — you can connect, save/edit issues, mark the current issue resolved, list issues through an agent tool, and see custom views with teams, states, and labels.

- **Deep Jira integration** (~470 LOC): `jiraConnect`, sites/search/create/update/comments/transitions/priorities (`fa-runtime-structured-read.md:87`).

  **How it works:** Similarly, the Jira connection lets you connect a site, search, create or update tickets, add comments, move them through workflow states, and set priorities.

- **GitHub + GitLab hosted-review & issue surfaces** (~1,475 LOC): `createRepoIssue`, `listGitHubProjects`, PR/MR checks/comments/merge/projects (`fa-runtime-structured-read.md` S20).

  **How it works:** For GitHub and GitLab, Fabrica can create repo issues, list projects, and check/comment/merge pull requests and merge requests — all from inside the app.

- **Client roster**: GitHub, GitLab (glab), Linear, Jira, Bitbucket, Azure DevOps, Gitea (`Fabrica-features.md:715-727`; `fabrica-app-discovery.md:13,131`).

  **How it works:** These seven are the trackers Fabrica already knows how to talk to, so you can connect any of them without extra setup.

- **IPC**: `gh` = 28 channels (PR lifecycle, work items, projects, rate-limit/diagnoseAuth); `gitlab:*` 7; `jira:*` ~14; `linear:*` 6+24 preload sites (`fa-ipc-watchers.md:163-167`). Sender-scoped cancellation for long lookups.

  **How it works:** Behind the scenes Fabrica opens many internal communication channels to each service (GitHub alone has 28) to fetch pull requests, issues, projects, and diagnose auth problems. Long lookups can be cancelled so the UI never hangs.

- **Task-source ingestion**: onboarding `IntegrationsStep` derives GitHub/Linear task-source statuses from preflight store (`fa-auth-onboarding.md:228`); mobile "smart source modes" (GitHub/Linear/GitLab/hosted repos) (`fa-mobile-companion.md:88`).

  **How it works:** During first-time setup, Fabrica reads which GitHub/Linear sources you already connected and shows their status; on mobile you can pick "smart source modes" to pull in tasks from GitHub, Linear, GitLab, or hosted repos.

- **`hosted-review` creation** via forge-provider abstraction (backoff/pacing, PR templates, linked issues) (`fabrica-app-discovery.md:128`).

  **How it works:** When Fabrica opens a pull/merge request on your behalf, it uses a unified "forge" layer that paces the requests, fills in a template, and links the related issue, so reviews are created cleanly across providers.

## 3. Reference designs (MC / buzz)

- **[MC]** Status Board Kanban (Not Started / In Progress / Done), `Task Card` (importance/urgency, subtasks, assignment), `Task Detail Panel`, `Task Form`, `blockedBy[]` dependency model; Ventures grid + Goals with linked tasks + Brain-Dump triage (`mc-features.md`).

  **How it works:** Mission Control shows tasks on a simple three-column board with cards that carry importance/urgency, subtasks, and an assignee; a task can be marked `blockedBy` others. It also groups tasks under "Ventures" and "Goals" and has a "Brain-Dump" inbox to triage raw ideas. This is a planning board pattern Fabrica could adopt.

- **[buzz]** (none — buzz has no issue/task board; only nostr "projects" as repo groupings and managed-agent task records.)

  **How it works:** buzz does not have a task/issue board like Jira or GitHub; it only tracks projects as repo groupings and records tasks an agent was given. So there is no comparable board design to borrow from buzz here.

## 4. Hard constraint

Preserve every existing tracker integration. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
