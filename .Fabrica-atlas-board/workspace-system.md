# Project / Workspace Model — Existing System Reference

> **Focus system #2** (after Orchestration). This document describes what Fabrica ALREADY has for projects, project groups, folder-workspaces, worktrees, and the sidebar/kanban UI. Companion ideas live in `ideas.md` (section: Project / Workspace model).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/*.md`.

---

## 1. Purpose & Scope

The Project / Workspace model is the **container layer above orchestration**. Orchestration sub-systems (Run/Task/Coordinator/Worker) are *worktree-scoped*; the workspace model owns the repos/projects that contain those worktrees. It is what the user sees in the **left sidebar**: repos → project groups → worktrees → workspaces.

---

## 2. Architecture (what exists)

- **Left sidebar tree** (`fabrica-app-discovery.md:140`): `repos → project groups → worktrees/"workspaces"` with filters (sleeping, default-branch, automation-generated, CLI-created, detached-head) and sort/group controls.
- **`Sidebar.tsx`** renders projects, worktrees, and kanban (`Fabrica-features.md:17`).
- **`project-groups/` module** = nested-repo discovery / import (`fabrica-app-discovery.md:125`).
- **Entity triad**: `repo` / `folder-workspace` / `worktree` are distinct but linked (`fabrica-app-discovery.md:146,252`).
- **Worktree CRUD**: create/set/rm/ps, sleep/activate, lineage, PR/MR base resolution, `forceDeleteBranch` (`fabrica-app-discovery.md:252`).
- **Kanban**: `WorkspaceKanbanDrawer` on the sidebar (`Fabrica-features.md:197`).
- **Dialogs**: `AddProjectFromFolderDialog`, `ProjectAddedDialog`, `AddRepoDialog`, `AddRemoteHostDialog` (`Fabrica-features.md:181-186`).
- **~20 `WorktreeCard*` components**: agent rows, ports, status, metadata, context menus, inline rename, visibility, developer menu, delete (`Fabrica-features.md:163-197`).

## 3. Persistence / state

- Store slices: `repos/project-groups/folder-workspace`, `worktrees/worktree-nav-history/worktree-catalog-*`, `ui (sidebars, activeView)` (`fabrica-app-discovery.md:146`).
- Cross-window/mobile sync via `runtime/sync-runtime-graph.ts`.

## 4. Important distinctions

- **Sidebar "project" ≠ GitHub project board.** Fabrica also has a `github-project` pane and `github.* project.*` board ops (`fabrica-app-discovery.md:143,255`) — that is GitHub Projects integration, separate from the repo-container "project" in the sidebar.
- **Project/Workspace ≠ orchestration Run.** A project holds many worktrees; each worktree can host dispatched tasks/runs. They are different layers.

## 5. Reference designs (MC / buzz)

- **MC**: `projects.json` — `{id, name, description, status, color, teamMembers, tags}`; projects group tasks/goals/milestones (`mission-control/CLAUDE.md` data schema). MC projects are pure JSON state, no git/repo binding.
- **buzz**: Nostr-native forge — `kind:30621` project (multi-repo grouping, NIP-MP), `kind:30617` repo announcement, branches-as-channels; owner attestation via NIP-OA (`buzz-discovery.md:94,122`; `buzz-desktop.md:100`). buzz projects are git/relay-native and identity-scoped.

## 6. Hard constraint

Preserve every existing workspace feature. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
