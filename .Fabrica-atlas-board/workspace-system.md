# Project / Workspace Model — Existing System Reference

> **Focus system #2** (after Orchestration). This document describes what Fabrica ALREADY has for projects, project groups, folder-workspaces, worktrees, and the sidebar/kanban UI. Companion ideas live in `ideas.md` (section: Project / Workspace model).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/*.md`.

---

## 1. Purpose & Scope

The Project / Workspace model is the **container layer above orchestration**. Orchestration sub-systems (Run/Task/Coordinator/Worker) are *worktree-scoped*; the workspace model owns the repos/projects that contain those worktrees. It is what the user sees in the **left sidebar**: repos → project groups → worktrees → workspaces.

**How it works:** Think of Fabrica's workspace model as the filing system for all your code. Before any AI agent starts working, the folders and repositories it will work inside must already be organized here. The sidebar is the map you use to find and open any project.

---

## 2. Architecture (what exists)

- **Left sidebar tree** (`fabrica-app-discovery.md:140`): `repos → project groups → worktrees/"workspaces"` with filters (sleeping, default-branch, automation-generated, CLI-created, detached-head) and sort/group controls.

  **How it works:** The left sidebar shows a nested list — repositories at the top, then groups you've organized them into, then individual working copies ("worktrees"). You can filter this list to show only, say, sleeping projects or ones created by automations, and sort or group them to stay organized.

- **`Sidebar.tsx`** renders projects, worktrees, and kanban (`Fabrica-features.md:17`).

  **How it works:** This is the screen component that draws the sidebar you see, including the project list, the working-copy cards, and the kanban (card-board) view described below.

- **`project-groups/` module** = nested-repo discovery / import (`fabrica-app-discovery.md:125`).

  **How it works:** When you add a folder that contains other repositories inside it, this module automatically finds and registers those nested repos so they all appear in the sidebar without you adding each one by hand.

- **Entity triad**: `repo` / `folder-workspace` / `worktree` are distinct but linked (`fabrica-app-discovery.md:146,252`).

  **How it works:** Fabrica tracks three related things separately: the repository (the remote source of truth), the folder-workspace (a local folder you opened), and the worktree (an isolated working copy where changes happen). Keeping them distinct lets one repo support many parallel working copies.

- **Worktree CRUD**: create/set/rm/ps, sleep/activate, lineage, PR/MR base resolution, `forceDeleteBranch` (`fabrica-app-discovery.md:252`).

  **How it works:** You can create, switch, rename, delete, or pause/resume any working copy. "Lineage" records where a copy came from, and the system can resolve which branch a pull/merge request should target. `forceDeleteBranch` lets you remove a branch even when it has unmerged changes.

- **Kanban**: `WorkspaceKanbanDrawer` on the sidebar (`Fabrica-features.md:197`).

  **How it works:** A kanban is a drag-and-drop card board (like "To do / Doing / Done"). This drawer lets you see and organize work items for a workspace directly from the sidebar.

- **Dialogs**: `AddProjectFromFolderDialog`, `ProjectAddedDialog`, `AddRepoDialog`, `AddRemoteHostDialog` (`Fabrica-features.md:181-186`).

  **How it works:** These are the pop-up windows that guide you through adding an existing folder as a project, adding a repository by URL, or connecting a remote server — each step confirms the choice before it is saved.

- **~20 `WorktreeCard*` components**: agent rows, ports, status, metadata, context menus, inline rename, visibility, developer menu, delete (`Fabrica-features.md:163-197`).

  **How it works:** Each working copy is shown as a card in the sidebar. The card displays which agents are running on it, its network ports, its current status, and gives you right-click menus to rename, hide, open a developer menu, or delete it — all without leaving the sidebar.

## 3. Persistence / state

- Store slices: `repos/project-groups/folder-workspace`, `worktrees/worktree-nav-history/worktree-catalog-*`, `ui (sidebars, activeView)` (`fabrica-app-discovery.md:146`).

  **How it works:** Fabrica saves your project layout, working-copy history, and which view is open so that when you reopen the app everything looks the way you left it.

- Cross-window/mobile sync via `runtime/sync-runtime-graph.ts`.

  **How it works:** If you have Fabrica open on your desktop and your phone, this sync keeps the project list and status consistent between them so you see the same state on both.

## 4. Important distinctions

- **Sidebar "project" ≠ GitHub project board.** Fabrica also has a `github-project` pane and `github.* project.*` board ops (`fabrica-app-discovery.md:143,255`) — that is GitHub Projects integration, separate from the repo-container "project" in the sidebar.

  **How it works:** The "project" you see in Fabrica's sidebar is just a local container for your code. Separately, Fabrica can also connect to GitHub's own project boards; the two are different features and shouldn't be confused.

- **Project/Workspace ≠ orchestration Run.** A project holds many worktrees; each worktree can host dispatched tasks/runs. They are different layers.

  **How it works:** A project is the folder; a run is a specific job an agent does inside a working copy of that folder. One project can host many jobs over time — they are different levels of the same hierarchy.

## 5. Reference designs (MC / buzz)

- **MC**: `projects.json` — `{id, name, description, status, color, teamMembers, tags}`; projects group tasks/goals/milestones (`mission-control/CLAUDE.md` data schema). MC projects are pure JSON state, no git/repo binding.

  **How it works:** Mission Control represents a project as a simple labeled record (name, color, members, tags) that groups tasks and goals. It is not tied to a real code repository — it is a planning-only object, whereas Fabrica's projects are tied to actual folders.

- **buzz**: Nostr-native forge — `kind:30621` project (multi-repo grouping, NIP-MP), `kind:30617` repo announcement, branches-as-channels; owner attestation via NIP-OA (`buzz-discovery.md:94,122`; `buzz-desktop.md:100`). buzz projects are git/relay-native and identity-scoped.

  **How it works:** buzz builds projects on a decentralized social network (Nostr). A project can group several repositories, each branch is treated like a chat channel, and the owner proves they control it through a cryptographic signature. This is a more open, identity-based way to organize code than Fabrica's local folders.

## 6. Hard constraint

Preserve every existing workspace feature. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
