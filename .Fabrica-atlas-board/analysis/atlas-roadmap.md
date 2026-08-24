# Atlas Roadmap — Fabrica-App Component Inventory

> **Current Phase:** Inventory & Mapping
>
> ## Step 1: Complete Fabrica-App Component Catalog
>
> Source: `Fabrica-app/src/` — ~3,500+ TypeScript/TSX source files

---

## A. UI Components (~350+ React Components)

### A1. App Shell & Layout
| Component | Path | Description |
|-----------|------|-------------|
| App | `renderer/src/App.tsx` | Root React component, app shell |
| Sidebar | `renderer/src/components/Sidebar.tsx` | Left sidebar (projects, worktrees, kanban) |
| RightSidebar | `renderer/src/components/right-sidebar/` | Right sidebar (source control, checks, file explorer) |
| StatusBar | `renderer/src/components/status-bar/StatusBar.tsx` | Bottom status bar |
| TabBar | `renderer/src/components/tab-bar/TabBar.tsx` | Tab strip |
| TabGroupSplitLayout | `renderer/src/components/tab-group/TabGroupSplitLayout.tsx` | Split-pane layout |
| TabGroupPanel | `renderer/src/components/tab-group/TabGroupPanel.tsx` | Individual panel |
| Landing | `renderer/src/components/Landing.tsx` | Landing/startup page |
| ZoomOverlay | `renderer/src/components/ZoomOverlay.tsx` | Zoom indicator |

### A2. Terminal (20+ components)
| Component | Path | Description |
|-----------|------|-------------|
| TerminalPane | `terminal-pane/TerminalPane.tsx` | Full terminal pane with PTY |
| TerminalPaneHeaderOverlay | `terminal-pane/TerminalPaneHeaderOverlay.tsx` | Header overlay |
| TerminalContextMenu | `terminal-pane/TerminalContextMenu.tsx` | Right-click menu |
| TerminalSearch | `TerminalSearch.tsx` | Search bar |
| TerminalQuickCommandsSubmenu | `terminal-pane/TerminalQuickCommandsSubmenu.tsx` | Quick commands |
| TerminalAgentSessionForkDialog | `terminal-pane/TerminalAgentSessionForkDialog.tsx` | Fork session dialog |
| TerminalRemoteRuntimeReconnectBanner | `terminal-pane/TerminalRemoteRuntimeReconnectBanner.tsx` | Reconnect banner |
| TerminalSshReconnectOverlay | `terminal-pane/TerminalSshReconnectOverlay.tsx` | SSH reconnect |
| MobileDriverOverlay | `terminal-pane/MobileDriverOverlay.tsx` | Mobile driver |

### A3. Native Chat / AI Chat (15+ components)
| Component | Path | Description |
|-----------|------|-------------|
| NativeChatView | `native-chat/NativeChatView.tsx` | Main chat view |
| NativeChatComposer | `native-chat/NativeChatComposer.tsx` | Message composer |
| NativeChatMessageList | `native-chat/NativeChatMessageList.tsx` | Message list |
| NativeChatApprovalCard | `native-chat/NativeChatApprovalCard.tsx` | Tool approval card |
| NativeChatQuestionCard | `native-chat/NativeChatQuestionCard.tsx` | Agent question card |
| NativeChatToolRun | `native-chat/NativeChatToolRun.tsx` | Tool execution display |
| NativeChatDiffView | `native-chat/NativeChatDiffView.tsx` | Inline diff view |

### A4. Editor (40+ components)
| Component | Path | Description |
|-----------|------|-------------|
| EditorPanel | `editor/EditorPanel.tsx` | Main editor panel |
| MonacoEditor | `editor/MonacoEditor.tsx` | Monaco editor wrapper |
| DiffViewer | `editor/DiffViewer.tsx` | Diff viewer |
| RichMarkdownEditor | `editor/RichMarkdownEditor.tsx` | Rich markdown (TipTap) |
| MarkdownPreview | `editor/MarkdownPreview.tsx` | Markdown preview |
| ImageViewer | `editor/ImageViewer.tsx` | Image viewer |
| PdfViewer | `editor/PdfViewer.tsx` | PDF viewer |
| CsvViewer | `editor/CsvViewer.tsx` | CSV viewer |
| IpynbViewer | `editor/IpynbViewer.tsx` | Jupyter notebook viewer |
| MermaidViewer | `editor/MermaidViewer.tsx` | Mermaid diagrams |
| CheckRunAnnotations | `editor/CheckRunAnnotations.tsx` | Check run annotations |
| ConflictComponents | `editor/ConflictComponents.tsx` | Merge conflict UI |

### A5. Sidebar / Source Control (30+ components)
| Component | Path | Description |
|-----------|------|-------------|
| SourceControl | `right-sidebar/SourceControl.tsx` | Source control panel |
| FileExplorer | `right-sidebar/FileExplorer.tsx` | File explorer |
| GitHistoryPanel | `right-sidebar/GitHistoryPanel.tsx` | Git history |
| SearchResultsPane | `right-sidebar/SearchResultsPane.tsx` | Search results |
| PluginPanel | `right-sidebar/PluginPanel.tsx` | Plugin panel |
| PortsPanel | `right-sidebar/PortsPanel.tsx` | Ports panel |
| AiVaultPanel | `right-sidebar/AiVaultPanel.tsx` | AI vault (session history) |
| CreateHostedReviewComposer | `right-sidebar/CreateHostedReviewComposer.tsx` | PR/review composer |

### A6. Worktree Cards (25+ components)
| Component | Path | Description |
|-----------|------|-------------|
| WorktreeCard | `sidebar/WorktreeCard.tsx` | Worktree card |
| WorktreeList | `sidebar/WorktreeList.tsx` | Worktree list |
| WorkspaceKanbanDrawer | `sidebar/WorkspaceKanbanDrawer.tsx` | Kanban board |
| WorkspaceKanbanCard | `sidebar/WorkspaceKanbanCard.tsx` | Kanban card |
| AddRepoDialog | `sidebar/AddRepoDialog.tsx` | Add repository dialog |
| AddRemoteHostDialog | `sidebar/AddRemoteHostDialog.tsx` | Add remote host |

### A7. Dashboard (8 components)
| Component | Path | Description |
|-----------|------|-------------|
| AgentDashboardDrawer | `dashboard/AgentDashboardDrawer.tsx` | Agent dashboard drawer |
| DashboardAgentRow | `dashboard/DashboardAgentRow.tsx` | Agent row |
| DashboardAgentChildDisclosure | `dashboard/DashboardAgentChildDisclosure.tsx` | Child agent disclosure |
| DashboardPopoutBridge | `dashboard/DashboardPopoutBridge.tsx` | Popout bridge |

### A8. Tasks / Work Items (10+ components)
| Component | Path | Description |
|-----------|------|-------------|
| TaskPage | `TaskPage.tsx` | Main task page |
| JiraIssueWorkspace | `JiraIssueWorkspace.tsx` | Jira issue workspace |
| LinearIssueWorkspace | `LinearIssueWorkspace.tsx` | Linear issue workspace |
| PullRequestPage | `PullRequestPage.tsx` | Pull request page |
| GitHubItemDialog | `GitHubItemDialog.tsx` | GitHub item dialog |

### A9. Settings (50+ components)
| Component | Path | Description |
|-----------|------|-------------|
| Settings | `settings/Settings.tsx` | Main settings dialog |
| GeneralPane | `settings/GeneralPane.tsx` | General settings |
| AppearancePane | `settings/AppearancePane.tsx` | Appearance settings |
| TerminalPane | `settings/TerminalPane.tsx` | Terminal settings |
| GitPane | `settings/GitPane.tsx` | Git settings |
| AgentsPane | `settings/AgentsPane.tsx` | Agents settings |
| AccountsPane | `settings/AccountsPane.tsx` | Account settings |
| IntegrationsPane | `settings/IntegrationsPane.tsx` | Integrations settings |
| OrchestrationPane | `settings/OrchestrationPane.tsx` | Orchestration settings |
| AutomationsSettingsPane | `settings/AutomationsSettingsPane.tsx` | Automations settings |
| PluginMarketplaceBrowser | `settings/PluginMarketplaceBrowser.tsx` | Plugin marketplace |
| SshPane | `settings/SshPane.tsx` | SSH settings |
| BrowserPane | `settings/BrowserPane.tsx` | Browser settings |
| MobilePane | `settings/MobilePane.tsx` | Mobile settings |
| PrivacyPane | `settings/PrivacyPane.tsx` | Privacy settings |
| NotificationsPane | `settings/NotificationsPane.tsx` | Notification settings |
| VoicePane | `settings/VoicePane.tsx` | Voice/dictation settings |

### A10. Automations (15+ components)
| Component | Path | Description |
|-----------|------|-------------|
| AutomationsPage | `automations/AutomationsPage.tsx` | Automations page |
| AutomationsListPanel | `automations/AutomationsListPanel.tsx` | Automation list |
| AutomationDetailPane | `automations/AutomationsDetailPane.tsx` | Automation detail |
| AutomationEditorDialog | `automations/AutomationEditorDialog.tsx` | Automation editor |
| AutomationRunHistory | `automations/AutomationRunHistory.tsx` | Run history |
| AutomationSchedulePicker | `automations/AutomationSchedulePicker.tsx` | Schedule picker |

### A11. Artifacts (7 components)
| Component | Path | Description |
|-----------|------|-------------|
| ArtifactsPage | `artifacts/ArtifactsPage.tsx` | Artifacts page |
| ArtifactListPane | `artifacts/ArtifactListPane.tsx` | Artifact list |
| ArtifactPreview | `artifacts/ArtifactPreview.tsx` | Artifact preview |
| ArtifactPublishButton | `artifacts/ArtifactPublishButton.tsx` | Publish button |

### A12. Skills (5 components)
| Component | Path | Description |
|-----------|------|-------------|
| SkillsPage | `skills/SkillsPage.tsx` | Skills page |
| SkillCard | `skills/SkillCard.tsx` | Skill card |
| SkillUpdateRow | `skills/SkillUpdateRow.tsx` | Update row |

### A13. Usage / Stats (15+ components)
| Component | Path | Description |
|-----------|------|-------------|
| StatsPane | `stats/StatsPane.tsx` | Stats pane |
| UsageOverviewPane | `stats/UsageOverviewPane.tsx` | Usage overview |
| ClaudeUsagePane | `stats/ClaudeUsagePane.tsx` | Claude usage |
| CodexUsagePane | `stats/CodexUsagePane.tsx` | Codex usage |
| StatCard | `stats/StatCard.tsx` | Stat card |

### A14. Feature Wall / Onboarding (10+ components)
| Component | Path | Description |
|-----------|------|-------------|
| FeatureWallModal | `feature-wall/FeatureWallModal.tsx` | Feature wall modal |
| OnboardingFlow | `onboarding/OnboardingFlow.tsx` | Onboarding flow |

### A15. Browser Pane (10+ components)
| Component | Path | Description |
|-----------|------|-------------|
| BrowserPane | `browser-pane/BrowserPane.tsx` | Browser pane |
| BrowserAddressBar | `browser-pane/BrowserAddressBar.tsx` | Address bar |
| BrowserToolbarMenu | `browser-pane/BrowserToolbarMenu.tsx` | Toolbar menu |

### A16. Emulator Pane (4 components)
| Component | Path | Description |
|-----------|------|-------------|
| EmulatorPane | `emulator-pane/EmulatorPane.tsx` | Emulator pane |
| MobileEmulatorAgentSetupGuide | `emulator-pane/MobileEmulatorAgentSetupGuide.tsx` | Agent setup guide |

### A17. GitHub / GitLab (15+ components)
| Component | Path | Description |
|-----------|------|-------------|
| GitHubMarkdownComposer | `github/GitHubMarkdownComposer.tsx` | GitHub markdown composer |
| PRAssigneesPanel | `github/PRAssigneesPanel.tsx` | PR assignees |
| ProjectPicker | `github-project/ProjectPicker.tsx` | GitHub project picker |

### A18. Other UI (20+ components)
| Component | Path | Description |
|-----------|------|-------------|
| PetOverlay | `pet/PetOverlay.tsx` | Pet mascot overlay |
| ActivityPrototypePage | `activity/ActivityPrototypePage.tsx` | Activity page |
| MobilePage | `mobile/MobilePage.tsx` | Mobile page |
| QuickOpen | `QuickOpen.tsx` | Quick open palette |
| WorktreeJumpPalette | `WorktreeJumpPalette.tsx` | Worktree jump palette |
| NewWorkspaceComposerModal | `NewWorkspaceComposerModal.tsx` | Workspace composer |
| DictationController | `dictation/DictationController.tsx` | Dictation controller |

### A19. UI Primitives (25 components)
| Component | Path | Description |
|-----------|------|-------------|
| accordion, badge, button, card, checkbox, collapsible, color-picker, command, context-menu, dialog, dropdown-menu, hover-card, input, label, popover, progress, scroll-area, select, separator, sheet, slider, sonner, switch, tabs, toggle, toggle-group, tooltip | `ui/` | shadcn/ui primitives |

---

## B. Backend Services (~250+ Main Process Modules)

### B1. Core Application
| Service | Path | Description |
|---------|------|-------------|
| Main Entry | `main/index.ts` | App lifecycle, service wiring |
| Persistence (Store) | `main/persistence.ts` | Central state persistence |
| Protected Secret Persistence | `main/protected-secret-persistence.ts` | Protected secrets |
| Hooks | `main/hooks.ts` | Git hooks runner |
| Pty | `main/pty/` | Shell environment, terminal spawning |
| Updater | `main/updater.ts` | Auto-update system |

### B2. IPC Handlers (40+ handlers)
| Service | Path | Description |
|---------|------|-------------|
| App IPC | `main/ipc/app.ts` | App-level IPC |
| Settings IPC | `main/ipc/settings.ts` | Settings IPC |
| Shell IPC | `main/ipc/shell.ts` | Shell commands IPC |
| Repos IPC | `main/ipc/repos.ts` | Repository management IPC |
| Git IPC | `main/ipc/github.ts`, `gitlab.ts` | Git provider IPC |
| Pty IPC | `main/ipc/pty.ts` | PTY management IPC |
| Filesystem IPC | `main/ipc/filesystem.ts` | Filesystem operations IPC |
| Browser IPC | `main/ipc/browser.ts` | Browser management IPC |
| Mobile IPC | `main/ipc/mobile.ts` | Mobile integration IPC |
| Native Chat IPC | `main/ipc/native-chat.ts` | Chat IPC |
| Notifications IPC | `main/ipc/notifications.ts` | Notification IPC |
| Skills IPC | `main/ipc/skills.ts` | Skills management IPC |
| Plugins IPC | `main/ipc/plugins.ts` | Plugin management IPC |
| Automations IPC | `main/ipc/automations.ts` | Automations IPC |
| Jira IPC | `main/ipc/jira.ts` | Jira integration IPC |
| Linear IPC | `main/ipc/linear.ts` | Linear integration IPC |
| SSH IPC | `main/ipc/ssh.ts` | SSH management IPC |
| Runtime IPC | `main/ipc/runtime.ts` | Runtime management IPC |
| Session IPC | `main/ipc/session.ts` | Session management IPC |

### B3. Runtime Services (40+ services)
| Service | Path | Description |
|---------|------|-------------|
| FABRICARuntimeService | `main/runtime/fabrica-runtime.ts` | Core runtime |
| FABRICARuntimeRpcServer | `main/runtime/runtime-rpc.ts` | RPC server |
| Orchestration Coordinator | `main/runtime/orchestration/coordinator.ts` | Orchestration |
| Orchestration DB | `main/runtime/orchestration/db.ts` | Orchestration database |
| Orchestration Preamble | `main/runtime/orchestration/preamble.ts` | Dispatch preamble |
| Runtime RPC Dispatcher | `main/runtime/rpc/dispatcher.ts` | RPC dispatcher |
| E2EE Channel | `main/runtime/rpc/e2ee-channel.ts` | E2EE channel |
| WS Transport | `main/runtime/rpc/ws-transport.ts` | WebSocket transport |
| Terminal Multiplex | `main/runtime/rpc/terminal-multiplex*.ts` | Terminal multiplexing |
| Device Registry | `main/runtime/device-registry.ts` | Device registry |
| Runtime Folder Workspace | `main/runtime/runtime-folder-workspace.ts` | Folder workspace |

### B4. Daemon Service (20+ services)
| Service | Path | Description |
|---------|------|-------------|
| Daemon Init | `main/daemon/daemon-init.ts` | Daemon initialization |
| Daemon Main | `main/daemon/daemon-main.ts` | Daemon main process |
| Daemon Server | `main/daemon/daemon-server.ts` | Daemon server |
| Daemon Client | `main/daemon/client.ts` | Daemon client |
| Session | `main/daemon/session.ts` | Session management |
| History Manager | `main/daemon/history-manager.ts` | History management |
| Terminal Host | `main/daemon/terminal-host.ts` | Terminal host management |
| Terminal Snapshot | `main/daemon/terminal-snapshot.ts` | Terminal snapshots |
| Priority Semaphore | `main/daemon/priority-semaphore.ts` | Priority semaphore |

### B5. Relay Server (15+ services)
| Service | Path | Description |
|---------|------|-------------|
| Desktop Relay Service | `main/runtime/relay/desktop-relay-service.ts` | Desktop relay |
| Relay Session Broker | `main/runtime/relay/relay-session-broker.ts` | Session broker |
| Relay Auth Coordinator | `main/runtime/relay/relay-auth-coordinator.ts` | Auth coordination |
| Relay Control Client | `main/runtime/relay/relay-control-client.ts` | Control client |
| Supabase Session | `main/runtime/relay/supabase-session.ts` | Supabase session |

### B6. Relay Process (30+ handlers)
| Service | Path | Description |
|---------|------|-------------|
| Relay Entry | `relay/relay.ts` | Relay process entry |
| Relay Dispatcher | `relay/dispatcher.ts` | Message dispatcher |
| FS Handler | `relay/fs-handler.ts` | Filesystem handler |
| Git Handler | `relay/git-handler.ts` | Git handler |
| PTY Handler | `relay/pty-handler.ts` | PTY handler |
| AI Vault Handler | `relay/ai-vault-handler.ts` | AI vault handler |
| Agent Exec Handler | `relay/agent-exec-handler.ts` | Agent exec handler |
| Plugin Host Call Handler | `relay/plugin-host-call-handler.ts` | Plugin host calls |

### B7. Agent Hook Services (15+ agents)
| Service | Path | Description |
|---------|------|-------------|
| Claude Hook Service | `main/claude/hook-service.ts` | Claude hooks |
| Codex Hook Service | `main/codex/hook-service.ts` | Codex hooks |
| Gemini Hook Service | `main/gemini/hook-service.ts` | Gemini hooks |
| Grok Hook Service | `main/grok/hook-service.ts` | Grok hooks |
| OpenCode Hook Service | `main/opencode/hook-service.ts` | OpenCode hooks |
| Hermes Hook Service | `main/hermes/hook-service.ts` | Hermes hooks |
| Copilot Hook Service | `main/copilot/hook-service.ts` | Copilot hooks |
| Devin Hook Service | `main/devin/hook-service.ts` | Devin hooks |
| Kimi Hook Service | `main/kimi/hook-service.ts` | Kimi hooks |
| Cursor Hook Service | `main/cursor/hook-service.ts` | Cursor hooks |
| Amp Hook Service | `main/amp/hook-service.ts` | Amp hooks |

### B8. Skills Service (10+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Skills Discovery | `main/skills/discovery.ts` | Skill discovery engine |
| Skill Freshness Inventory | `main/skills/skill-freshness-inventory.ts` | Freshness tracking |
| Skill Update Run | `main/skills/skill-update-run.ts` | Update runner |
| Skill Installation Topology | `main/skills/skill-installation-topology.ts` | Installation topology |

### B9. Plugin System (30+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Plugin Service | `main/plugins/plugin-service.ts` | Core plugin service |
| Plugin Supervisor | `main/plugins/plugin-supervisor.ts` | Plugin supervisor |
| Plugin Discovery | `main/plugins/plugin-discovery.ts` | Plugin discovery |
| Plugin Host Runtime | `main/plugins/plugin-host-runtime.ts` | Host runtime |
| Plugin Worker Controller | `main/plugins/plugin-worker-controller.ts` | Worker controller |
| Plugin Marketplace Service | `main/plugins/plugin-marketplace-service.ts` | Marketplace service |
| Plugin Audit Log | `main/plugins/plugin-audit-log.ts` | Audit logging |
| Plugin Kill List Service | `main/plugins/plugin-kill-list-service.ts` | Kill list service |
| Plugin Content Safety | `main/plugins/plugin-content-safety.ts` | Content safety |

### B10. Git Provider Clients (15+ clients)
| Service | Path | Description |
|---------|------|-------------|
| GitHub Client | `main/github/client.ts` | GitHub API client |
| GitHub Issues | `main/github/issues.ts` | GitHub issues |
| GitHub PR Stack | `main/github/github-pr-stack.ts` | PR stack management |
| GitLab Client | `main/gitlab/client.ts` | GitLab API client |
| Linear Client | `main/linear/client.ts` | Linear API client |
| Jira Client | `main/jira/client.ts` | Jira API client |
| Bitbucket Client | `main/bitbucket/client.ts` | Bitbucket API client |
| Azure DevOps Client | `main/azure-devops/client.ts` | Azure DevOps client |

### B11. Source Control Services (6 modules)
| Service | Path | Description |
|---------|------|-------------|
| Forge Provider | `main/source-control/forge-provider.ts` | Forge provider abstraction |
| Hosted Review | `main/source-control/hosted-review.ts` | Hosted review management |
| Pull Request Linked Issue | `main/source-control/pull-request-linked-issue.ts` | PR linked issues |
| Repo Default Branch | `main/source-control/repo-default-branch.ts` | Default branch detection |

### B12. Git Core Services (15+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Git Runner | `main/git/runner.ts` | Git command runner |
| Git Repo | `main/git/repo.ts` | Repository operations |
| Git Status | `main/git/status.ts` | Git status parsing |
| Git History | `main/git/history.ts` | Git history |
| Git Worktree | `main/git/worktree.ts` | Worktree operations |

### B13. Computer Use Service (5+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Computer Provider Lifecycle | `main/computer/computer-provider-lifecycle.ts` | Provider lifecycle |
| Desktop Script Provider Bridge | `main/computer/desktop-script-provider-bridge.ts` | Desktop script bridge |
| Sidecar Client | `main/computer/sidecar-client.ts` | Sidecar client |

### B14. Emulator Services (8+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Emulator Bridge | `main/emulator/emulator-bridge.ts` | Emulator bridge |
| Emulator Session Registry | `main/emulator/emulator-session-registry.ts` | Session registry |
| Emulator Gesture Sender | `main/emulator/emulator-gesture-sender.ts` | Gesture sending |
| Scrcpy Video Registry | `main/emulator/scrcpy-video-registry.ts` | Scrcpy video |

### B15. SSH Services (25+ modules)
| Service | Path | Description |
|---------|------|-------------|
| SSH Connection Manager | `main/ssh/ssh-connection-manager.ts` | Connection manager |
| SSH Channel Multiplexer | `main/ssh/ssh-channel-multiplexer.ts` | Channel multiplexer |
| SSH Config Parser | `main/ssh/ssh-config-parser.ts` | SSH config parser |
| SSH Port Forward | `main/ssh/ssh-port-forward.ts` | Port forwarding |
| SSH Relay Deploy | `main/ssh/ssh-relay-deploy.ts` | Relay deployment |
| SSH Reconnect Ladder | `main/ssh/ssh-reconnect-ladder.ts` | Reconnect logic |

### B16. Browser Services (20+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Browser Manager | `main/browser/browser-manager.ts` | Browser manager |
| Browser Session Registry | `main/browser/browser-session-registry.ts` | Session registry |
| Browser CDP Bridge | `main/browser/cdp-bridge.ts` | CDP bridge |
| Browser CDP WS Proxy | `main/browser/cdp-ws-proxy.ts` | WebSocket proxy |
| Browser Snapshot Engine | `main/browser/snapshot-engine.ts` | Snapshot engine |
| Browser Cookie Import | `main/browser/browser-cookie-import.ts` | Cookie import |
| Browser Anti Detection | `main/browser/anti-detection.ts` | Anti-detection |

### B17. Window Management (15+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Create Main Window | `main/window/createMainWindow.ts` | Main window creation |
| Dashboard Popout Window | `main/window/dashboard-popout-window.ts` | Dashboard popout |
| Clipboard IPC Handlers | `main/window/clipboard-ipc-handlers.ts` | Clipboard handlers |

### B18. Telemetry & Observability (10+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Telemetry Client | `main/telemetry/client.ts` | Telemetry client |
| Telemetry Consent | `main/telemetry/consent.ts` | Consent management |
| Observability Instrumentation | `main/observability/instrumentation.ts` | OpenTelemetry |
| Observability Bundle | `main/observability/bundle.ts` | Diagnostic bundle |

### B19. Usage Tracking (10+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Claude Usage Store | `main/claude-usage/store.ts` | Claude usage storage |
| Codex Usage Store | `main/codex-usage/store.ts` | Codex usage storage |
| Rate Limits Service | `main/rate-limits/service.ts` | Rate limits service |
| Stats Collector | `main/stats/collector.ts` | Stats collection |

### B20. Artifacts Cloud (3 modules)
| Service | Path | Description |
|---------|------|-------------|
| Artifact Cloud Service | `main/artifacts/artifact-cloud-service.ts` | Cloud artifact service |
| Artifact Publisher | `main/artifacts/artifact-publisher.ts` | Artifact publishing |

### B21. Automations Backend (6 modules)
| Service | Path | Description |
|---------|------|-------------|
| Automation Service | `main/automations/service.ts` | Automation service |
| Automation Headless Dispatch | `main/automations/headless-dispatch.ts` | Headless dispatch |
| Automation Precheck Runner | `main/automations/precheck-runner.ts` | Precheck runner |

### B22. Speech / Voice (8 modules)
| Service | Path | Description |
|---------|------|-------------|
| Speech Runtime Service | `main/speech/speech-runtime-service.ts` | Speech runtime |
| STT Service | `main/speech/stt-service.ts` | Speech-to-text |
| Model Manager | `main/speech/model-manager.ts` | Model management |

### B23. CLI (6 modules)
| Service | Path | Description |
|---------|------|-------------|
| CLI Index | `cli/index.ts` | CLI entry point |
| CLI Dispatch | `cli/dispatch.ts` | CLI command dispatch |
| CLI Runtime Client | `cli/runtime-client.ts` | Runtime client |

### B24. Platform Services (20+ modules)
| Service | Path | Description |
|---------|------|-------------|
| macOS TCC Prompt Notice | `main/macos-tcc-prompt-notice.ts` | TCC permission notice |
| macOS System Sleep Assertion | `main/macos-system-sleep-assertion.ts` | Sleep assertion |
| Windows Process Tree Kill | `main/windows-process-tree-kill.ts` | Process tree kill |
| WSL | `main/wsl.ts` | WSL management |
| System Tray | `main/tray/system-tray.ts` | System tray icon |
| Dock Unread Badge | `main/dock/unread-badge.ts` | Dock unread badge |
| Register App Menu | `main/menu/register-app-menu.ts` | Application menu |

### B25. Worktree Management (8 modules)
| Service | Path | Description |
|---------|------|-------------|
| Worktree Create Base | `main/worktree-create-base.ts` | Base worktree creation |
| Worktree Removal Safety | `main/worktree-removal-safety.ts` | Removal safety |
| Repo Worktrees | `main/repo-worktrees.ts` | Repo worktree management |

### B26. Startup (10+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Configure Process | `main/startup/configure-process.ts` | Process configuration |
| First Window Startup Services | `main/startup/first-window-startup-services.ts` | First window services |
| Single Instance Lock | `main/startup/single-instance-lock.ts` | Single instance |

### B27. Fabrica Profiles / Cloud (10 modules)
| Service | Path | Description |
|---------|------|-------------|
| Profile Cloud Auth Config | `main/fabrica-profiles/profile-cloud-auth-config.ts` | Cloud auth config |
| Profile Cloud Client | `main/fabrica-profiles/profile-cloud-client.ts` | Cloud client |
| Profile Project Presence | `main/fabrica-profiles/profile-project-presence.ts` | Project presence |

---

## C. Shared Services (150+ modules in `src/shared/`)

| Category | Count | Examples |
|----------|-------|---------|
| Agent Types & Detection | 15+ | agent-detection, agent-kind, agent-status-types, agent-hook-relay |
| AI Vault Types | 5+ | ai-vault-types, ai-vault-resume |
| Automation Types | 5+ | automations-types, automation-schedules |
| Browser | 3+ | browser-url, browser-cookie-import-sources, browser-viewport-presets |
| Git | 10+ | git-history, git-history-graph, git-status-porcelain-parser |
| GitHub/GitLab | 5+ | github-pr-auto-merge, github-project-identity |
| Terminal | 10+ | terminal-bell-detector, terminal-color-scheme-protocol, terminal-fonts |
| Workspace | 5+ | workspace-name, workspace-statuses, workspace-session-schema |
| Worktree | 5+ | worktree-id, worktree-ownership, worktree-card-properties |
| E2EE/Security | 5+ | e2ee-crypto, mobile-e2ee-v2 |
| Orchestration | 3+ | orchestration-rpc-contract, orchestration-task-display |
| Native Chat | 3+ | native-chat-types, native-chat-slash-commands |

---

## D. Renderer Runtime (60+ client modules in `src/renderer/src/runtime/`)

| Service | Path | Description |
|---------|------|-------------|
| Runtime RPC Client | `runtime/runtime-rpc-client.ts` | Renderer RPC client |
| Runtime Git Client | `runtime/runtime-git-client.ts` | Renderer git client |
| Runtime File Client | `runtime/runtime-file-client.ts` | Renderer file client |
| Runtime Hooks Client | `runtime/runtime-hooks-client.ts` | Renderer hooks client |
| Runtime Jira Client | `runtime/runtime-jira-client.ts` | Renderer Jira client |
| Runtime Linear Client | `runtime/runtime-linear-client.ts` | Renderer Linear client |
| Runtime Skills Client | `runtime/runtime-skills-client.ts` | Renderer skills client |
| Runtime Terminal Stream | `runtime/runtime-terminal-stream.ts` | Terminal stream |
| Runtime Client Events | `runtime/runtime-client-events.ts` | Client events |

---

## Summary

| Category | Count |
|----------|-------|
| **UI Components (React)** | ~350+ |
| **Backend Services (Main Process)** | ~250+ |
| **Agent Hook Services** | 15+ agents |
| **Shared Modules** | ~150+ |
| **Renderer Runtime** | ~60+ |
| **Plugin System** | ~30+ |
| **SSH Services** | ~30+ |
| **Browser Services** | ~20+ |
| **Total estimated files** | ~3,500+ |

---

> **Next Step:** Map similar features from mission-control and buzz to each Fabrica component.
