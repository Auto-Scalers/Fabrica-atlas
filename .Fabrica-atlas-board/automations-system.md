# Automations — Existing System Reference

> **Focus system #7.** Describes what Fabrica ALREADY has for scheduled/triggered agent-task dispatch. Companion ideas live in `ideas.md` (section: Automations).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-runtime-structured-read.md`, `fa-ipc-watchers.md`.

---

## 1. Purpose & Scope

Automations let users define rules that **dispatch agent tasks on a schedule or trigger**, headlessly, capturing output into snapshot buffers. It is the user-facing scheduling layer that feeds the orchestration engine.

**How it works:** Automations are like saved recipes: "every day at 7am, have an agent do X" or "when Y happens, run Z." They run without you watching (headless), and the agent's output is captured so you can review it later. This is the scheduling front-door that hands work to the orchestration engine.

## 2. Architecture (what exists)

- **Main view**: `automations` activeView (`fabrica-app-discovery.md:140`).

  **How it works:** Selecting the Automations view opens the page where you see and manage all your saved automation rules.

- **Module**: "scheduled/triggered dispatch of agent tasks, headless dispatch w/ output snapshot buffers" (`fabrica-app-discovery.md:128`).

  **How it works:** Under the hood, the module's job is exactly that sentence: take a schedule or trigger, launch an agent task in the background, and record its output into a snapshot buffer you can replay.

- **Components**: `AutomationsPage`, `AutomationsListPanel`, `AutomationsDetailPane`, `AutomationDetail`, `AutomationEditorDialog`, `AutomationEditorPromptSection`, `AutomationRunHistory`, `AutomationSchedulePicker`, `AutomationCustomCronPanel`, `AutomationDeleteDialogs`, `CreateFromPicker` (`Fabrica-features.md:230-241`).

  **How it works:** The UI is built from a page, a list panel, a detail pane, an editor dialog (where you write the prompt), a run-history viewer, a schedule picker (including a custom cron panel for advanced timing), delete confirmations, and a "create from" picker.

- **External managers**: `External automation managers` + `HermesCronOutputView` (`Fabrica-features.md:245-246`).

  **How it works:** Besides Fabrica's own automations, it can surface automations managed by external systems, and `HermesCronOutputView` shows the output of cron-style runs from those external managers.

- **Runtime CRUD/run-now**: `listAutomations`, `runAutomationNow` (`fa-runtime-structured-read.md` S3).

  **How it works:** The engine exposes commands to list your automations and to trigger one immediately ("run now") without waiting for its schedule.

- **IPC**: `automations:list/create/runNow/delete/update/listExternalManagers/listRuns/listExternalRuns/runExternalAction/markDispatchResult` (`fa-ipc-watchers.md:4.14`).

  **How it works:** These are the internal messages used to list, create, run, delete, and update automations, plus to talk to external managers and record a dispatch's result.

- **Cron primitive** already exists inside app runtime (`fabrica-app-discovery.md:208`).

  **How it works:** Fabrica already has a built-in "cron" timer (the standard way to say "run this on a schedule"), so time-based automations don't need an external scheduler.

## 3. Reference designs (MC / buzz)

- **[MC]** Workflow Engine: four run engines + `node-cron` scheduler (`dailyPlan` `0 7 * * *`, `standup`, `brainDumpTriage`, `weeklyReview`), approval gates via `decisions.json`, `maxParallelAgents` concurrency, `accumulateRunCost` (`mc-workflow-engine.md`).

  **How it works:** Mission Control's engine has four ways to run work plus a cron scheduler that fires daily plans, standups, brain-dump triage, and weekly reviews. It gates approvals through a decisions file and caps how many agents run at once, tracking cost — a mature scheduling model Fabrica could learn from.

- **[buzz]** YAML-as-Code Workflow Engine: channel-scoped automation, 4 triggers, 7 actions, template variables, `evalexpr` conditions (100ms timeout), workflow approvals with UUID tokens, signed step traces (`buzz-features.md`).

  **How it works:** buzz lets you write automations as YAML text: pick from 4 triggers and 7 actions, use variables and simple conditions (evaluated within 100ms), and require approval via a UUID token, with each step cryptographically signed. This "workflow as code" pattern is a candidate to bring into Fabrica's automations.

## 4. Hard constraint

Preserve every existing automation. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
