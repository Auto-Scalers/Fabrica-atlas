# Enterprise Architecture & Refactor Plan: Desktop IDE via Code - OSS (VS Code Fork)

## Executive Summary
To eliminate cloud compute costs (Cloud Run containers, GCS storage, backend orchestration overhead) while providing a **Full IDE Experience** with the exact custom UI design of our web platform, we will migrate to a **custom desktop IDE architecture based on `Code - OSS` (VS Code)** — the exact enterprise pattern utilized by **Cursor, Windsurf, Antigravity, Void IDE, and PearAI**.

By shifting from a hosted remote-container model to a client-side desktop environment, the user's local machine handles code execution, terminal commands, file I/O, and the `pi` CLI runner. Cloud dependencies are reduced to zero for compute/storage, while retaining Supabase strictly for user authentication, telemetry, and optional cloud settings sync.

---

## 1. Enterprise Benchmarks: How Industry Leaders Build VS Code Forks

| Platform | Architectural Approach | UI Integration Model | Agent & Runner Execution |
| :--- | :--- | :--- | :--- |
| **Cursor** | Native `Code - OSS` Fork (C++ & TS) | Directly patches `src/vs/workbench`, custom editor widgets for inline diffs/ghost text, native sidebar | Local C++/Rust binary & custom IPC bridge to local language servers and cloud LLM endpoints |
| **Windsurf (Codeium)** | Native `Code - OSS` Fork | Custom workbench panels, Cascade AI sidebar embedded into core layout, Monaco extensions | Local engine process talking over gRPC to Cascade backend/local tools |
| **PearAI / Void** | VSCodium Fork + Custom Extensions | VS Code Webview Views + Workbench CSS overrides for customized branding | Extension Host daemon launching local CLI tools (`aider`, `pi`, custom LLMs) |
| **Our Target Architecture** | **Custom `Code - OSS` Fork with Integrated React Workbench Shell** | Native Workbench patch integrating our exact React design system into the activity bar, primary sidebar, and agent panel | **Local `pi` CLI + Node.js Agent Harness (`src/core/harness`) running natively as a sub-process via Electron IPC** |

---

## 2. Target Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      DESKTOP APPLICATION (ELECTRON)                      │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    Electron Main Process (Node.js)                 │  │
│  │ - Window Management & OS Native Integration                       │  │
│  │ - Direct File System (`fs`) Access for Workspace                  │  │
│  │ - Process Manager: Launches `pi` CLI & `agent-runner.ts` daemon    │  │
│  └─────────────────────────────────┬──────────────────────────────────┘  │
│                                    │ IPC / WebSocket                     │
│  ┌─────────────────────────────────┴──────────────────────────────────┐  │
│  │                 Renderer Process (Custom Workbench)                │  │
│  │                                                                    │  │
│  │  ┌───────────────────────────┬──────────────────────────────────┐  │  │
│  │  │   Custom Agent UI Pane    │     VS Code Code Editor Panel    │  │  │
│  │  │   (React / Next UI)       │     (Monaco / Textmate LSPs)     │  │  │
│  │  │                           │                                  │  │  │
│  │  │ - Agent Chat & Stream     │ - Full File Tree & Tabs          │  │  │
│  │  │ - Tool Execution Log      │ - Multi-file Diff Editor         │  │  │
│  │  │ - Prompt Engineering      │ - Native Integrated Terminal     │  │  │
│  │  │ - System Prompts Sync     │ - Language Extensions & LSPs     │  │  │
│  │  └─────────────┬─────────────┴──────────────────────────────────┘  │  │
│  └────────────────┼───────────────────────────────────────────────────┘  │
└───────────────────┼──────────────────────────────────────────────────────┘
                    │ HTTPS / WSS (Auth & Sync Only)
                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   SUPABASE (Authentication & Cloud Database)              │
│ - User Auth & JWT Token Validation                                       │
│ - User Settings, Usage Analytics, & Agent Prompts Repository              │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack Specification

| Component | Technology / Framework | Function in Refactored Application |
| :--- | :--- | :--- |
| **Base Engine** | `microsoft/vscode` (`Code - OSS`) | Core IDE engine: Monaco editor, TextMate grammars, LSP language servers, git integration, native terminal |
| **Shell Environment** | `Electron` | Cross-platform desktop runtime (Windows, macOS, Linux) wrapping main & renderer processes |
| **Frontend UI** | React 18, Tailwind CSS, Lucide Icons | Exact replica of our current UI (Agent Chat, Prompt History, Tool Execution Badges) embedded directly into the workbench sidebar/panels |
| **Agent CLI & Engine** | `pi` CLI binary + `src/core/harness` | Embedded Node.js agent runner executing tool calls, file edits, and bash commands directly on the user's local disk |
| **IPC Bridge** | Electron `ipcRenderer` / `ipcMain` + WebSocket | Low-latency local communication stream between Agent Runner and React Frontend |
| **Auth & Sync** | Supabase JS Client (`@supabase/supabase-js`) | User sign-in, API key management, settings persistence, and prompt template sync |

---

## 4. Current Codebase Mapping & Refactoring Plan

### A. What We Keep & Refactor
1. **`src/core/harness/harness.engine.ts`**:
   - **Current:** Orchestrates agent execution and expects remote container/Cloud Run environments.
   - **Refactored:** Modified to execute tools directly on local OS paths using Node.js `fs`, `child_process`, and local terminal instances.
2. **`src/runner/agent-runner.ts`**:
   - **Current:** Executed inside `Dockerfile.runner` on Cloud Run.
   - **Refactored:** Runs as a background service/worker thread inside the Electron main process, listening to IPC calls from the UI.
3. **`pi` CLI Integration**:
   - `pi` binary bundled directly inside the desktop app assets (`resources/bin/pi.exe` on Windows).
   - Called directly via local `child_process.spawn("pi", args)` without network proxies or container wrappers.
4. **`frontend-next` / React UI Components**:
   - Extracted into a reusable React Webview Panel / Workbench Contribution component (`src/vs/workbench/contrib/fabrica`).

### B. What We Eliminate
- ❌ **`Dockerfile.runner`**: No remote container building.
- ❌ **`src/services/cloudrun.orchestrator.ts` & `cloudrun.service.ts`**: Container orchestration is replaced by local `child_process` spawning.
- ❌ **`src/services/gcs.service.ts`**: File workspace storage is handled directly on local disk folders (`C:\Users\...` or `~/projects/...`).
- ❌ **Heavy GCP Cloud Billing**: Replaced by 100% free local client compute.

---

## 5. Step-by-Step Refactoring & Migration Roadmap

### Phase 1: Local Runner Decoupling (2 Weeks)
- Modify `src/core/harness/harness.engine.ts` to operate against local directory paths rather than GCS mounted volumes.
- Create `src/runner/local-runner.ts` as a stand-alone Node.js service that spawns `pi` CLI locally and streams JSON-RPC events.
- Test `pi` execution natively on Windows/macOS with direct file read/write permissions.

### Phase 2: Code - OSS (VS Code) Setup & Workspace Integration (3 Weeks)
- Clone and initialize `microsoft/vscode` repository.
- Configure build scripts using `@vscode/gulp-electron` for Windows packaging (`.exe` / `.msi`).
- Register a custom Extension Host provider / IPC channel for the `Fabrica` Agent Engine.

### Phase 3: UI Porting into VS Code Workbench (2 Weeks)
- Create Workbench Contribution: `vs/workbench/contrib/fabricaAgent`.
- Port our React frontend components into the VS Code workbench activity bar (left/right primary panel).
- Connect state management (chat stream, tool execution status, prompt input) directly to local runner IPC events.

### Phase 4: Full IDE Features Integration (2 Weeks)
- Connect Agent file edits directly to VS Code's native `IFileService` and `IDiffEditor`.
- Automatically open agent-generated/modified files in VS Code tabs with inline diff preview.
- Integrate terminal tool execution with VS Code's native Integrated Terminal (`ITerminalService`).

### Phase 5: Build, Packaging & Auto-Update (1 Week)
- Set up GitHub Actions workflow for cross-platform desktop builds using `electron-builder`.
- Integrate auto-updater capabilities using GitHub Releases or free S3-compatible bucket (e.g. Cloudflare R2 free tier).
- Package Windows installer (`.exe` setup) bundled with Supabase Auth & local `pi` CLI binary.

---

## 6. Key Advantages of This Desktop VS Code Fork Strategy

1. **Zero Compute & Storage Operational Costs**: 100% of code execution, storage, and agent compute run on the user's own computer.
2. **Native Performance**: Instant file saving, immediate terminal command execution, no network latency when reading large codebases.
3. **Enterprise Developer Experience**: Users get complete language support (LSPs, IntelliSense, Git history, Extensions Marketplace) combined with our customized AI Agent interface.
4. **Full Control over UI & Branding**: By modifying the VS Code workbench source code, we control the exact visual theme, sidebar layout, and agent interaction model.
