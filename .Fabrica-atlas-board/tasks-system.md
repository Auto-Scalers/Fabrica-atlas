# Tasks Panel (GitHub/Jira) + Task Sources — Existing System Reference

> **Focus system #3.** Describes what Fabrica ALREADY has for the in-app task/issue board, GitHub/Jira/Linear integrations, and task-source ingestion. Companion ideas live in `ideas.md` (section: Tasks panel).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-runtime-structured-read.md`, `fa-ipc-watchers.md`, `fa-auth-onboarding.md`, `fa-mobile-companion.md`.

---

## 1. Purpose & Scope

The Tasks surface lets users view and act on issues/tasks from external trackers (GitHub, GitLab, Linear, Jira, Bitbucket, Azure DevOps, Gitea) inside Fabrica, plus ingest "task sources" during onboarding/mobile. It is a **read+write bridge to external trackers**, not an internal task DAG (that is orchestration's `Task`).

## 2. Architecture (what exists)

- **Main view**: `task page` activeView; `TaskPage.tsx` is the main task page (`fabrica-app-discovery.md:140`; `Fabrica-features.md:213`).
- **Per-provider issue workspaces**: `JiraIssueWorkspace`, `LinearIssueWorkspace`, `LinearItemDrawer`, `LinearProjectViewSurfaces`, `GitHubItemDialog`, `GitLabItemDialog` (`Fabrica-features.md:214-217,221`).
- **Connection UIs**: `JiraConnectDialog`, `LinearApiKeyDialog`, `TaskProjectSourceCombobox` (`Fabrica-features.md:221-223`).
- **GitHub Projects V2 board**: `github-project/` ~29 board-table components (ProjectPicker, ProjectViewList, ProjectRow, ProjectCell…) (`Fabrica-features.md:304-310`; `fabrica-app-discovery.md:143`).
- **Deep Linear integration** (~2,200 LOC): `linearConnect`, `linearSaveIssue`, `linearResolveCurrentIssue`, MCP issue-list, custom views, teams/states/labels (`fa-runtime-structured-read.md:86`).
- **Deep Jira integration** (~470 LOC): `jiraConnect`, sites/search/create/update/comments/transitions/priorities (`fa-runtime-structured-read.md:87`).
- **GitHub + GitLab hosted-review & issue surfaces** (~1,475 LOC): `createRepoIssue`, `listGitHubProjects`, PR/MR checks/comments/merge/projects (`fa-runtime-structured-read.md` S20).
- **Client roster**: GitHub, GitLab (glab), Linear, Jira, Bitbucket, Azure DevOps, Gitea (`Fabrica-features.md:715-727`; `fabrica-app-discovery.md:13,131`).
- **IPC**: `gh` = 28 channels (PR lifecycle, work items, projects, rate-limit/diagnoseAuth); `gitlab:*` 7; `jira:*` ~14; `linear:*` 6+24 preload sites (`fa-ipc-watchers.md:163-167`). Sender-scoped cancellation for long lookups.
- **Task-source ingestion**: onboarding `IntegrationsStep` derives GitHub/Linear task-source statuses from preflight store (`fa-auth-onboarding.md:228`); mobile "smart source modes" (GitHub/Linear/GitLab/hosted repos) (`fa-mobile-companion.md:88`).
- **`hosted-review` creation** via forge-provider abstraction (backoff/pacing, PR templates, linked issues) (`fabrica-app-discovery.md:128`).

## 3. Reference designs (MC / buzz)

- **[MC]** Status Board Kanban (Not Started / In Progress / Done), `Task Card` (importance/urgency, subtasks, assignment), `Task Detail Panel`, `Task Form`, `blockedBy[]` dependency model; Ventures grid + Goals with linked tasks + Brain-Dump triage (`mc-features.md`).
- **[buzz]** (none — buzz has no issue/task board; only nostr "projects" as repo groupings and managed-agent task records.)

## 4. Hard constraint

Preserve every existing tracker integration. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
