# Automations — Existing System Reference

> **Focus system #7.** Describes what Fabrica ALREADY has for scheduled/triggered agent-task dispatch. Companion ideas live in `ideas.md` (section: Automations).
> Sources: `discovery/fabrica-app-discovery.md`, `discovery/Fabrica-features.md`, `discovery/fabrica-app/fa-runtime-structured-read.md`, `fa-ipc-watchers.md`.

---

## 1. Purpose & Scope

Automations let users define rules that **dispatch agent tasks on a schedule or trigger**, headlessly, capturing output into snapshot buffers. It is the user-facing scheduling layer that feeds the orchestration engine.

## 2. Architecture (what exists)

- **Main view**: `automations` activeView (`fabrica-app-discovery.md:140`).
- **Module**: "scheduled/triggered dispatch of agent tasks, headless dispatch w/ output snapshot buffers" (`fabrica-app-discovery.md:128`).
- **Components**: `AutomationsPage`, `AutomationsListPanel`, `AutomationsDetailPane`, `AutomationDetail`, `AutomationEditorDialog`, `AutomationEditorPromptSection`, `AutomationRunHistory`, `AutomationSchedulePicker`, `AutomationCustomCronPanel`, `AutomationDeleteDialogs`, `CreateFromPicker` (`Fabrica-features.md:230-241`).
- **External managers**: `External automation managers` + `HermesCronOutputView` (`Fabrica-features.md:245-246`).
- **Runtime CRUD/run-now**: `listAutomations`, `runAutomationNow` (`fa-runtime-structured-read.md` S3).
- **IPC**: `automations:list/create/runNow/delete/update/listExternalManagers/listRuns/listExternalRuns/runExternalAction/markDispatchResult` (`fa-ipc-watchers.md:4.14`).
- **Cron primitive** already exists inside app runtime (`fabrica-app-discovery.md:208`).

## 3. Reference designs (MC / buzz)

- **[MC]** Workflow Engine: four run engines + `node-cron` scheduler (`dailyPlan` `0 7 * * *`, `standup`, `brainDumpTriage`, `weeklyReview`), approval gates via `decisions.json`, `maxParallelAgents` concurrency, `accumulateRunCost` (`mc-workflow-engine.md`).
- **[buzz]** YAML-as-Code Workflow Engine: channel-scoped automation, 4 triggers, 7 actions, template variables, `evalexpr` conditions (100ms timeout), workflow approvals with UUID tokens, signed step traces (`buzz-features.md`).

## 4. Hard constraint

Preserve every existing automation. Enhance/extend only (Fabrica-App Transformation Rule in `AGENTS.md`).

---

_Last updated: 2026-08-28_
