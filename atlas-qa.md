# Atlas QA — Fabrica-App Complete Component Inventory

> _Source: `Fabrica-app/src/` — ~3,500+ TypeScript/TSX source files_
> _This file documents every UI component, backend service, shared module, and renderer runtime module in Fabrica-app._
> _Use this as reference for Step 2: Mapping similar features from MC and buzz._

---

## A. UI Components (~350+ React Components)

### A1. App Shell & Layout (9 components)
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
| TerminalPaneOverlayLayer | `terminal-pane/TerminalPaneOverlayLayer.tsx` | Overlay layer stack |
| TerminalContextMenu | `terminal-pane/TerminalContextMenu.tsx` | Right-click menu |
| TerminalSearch | `TerminalSearch.tsx` | Search bar |
| TerminalErrorToast | `terminal-pane/TerminalErrorToast.tsx` | Error notification |
| TerminalQuickCommandsSubmenu | `terminal-pane/TerminalQuickCommandsSubmenu.tsx` | Quick commands |
| TerminalAgentSessionForkDialog | `terminal-pane/TerminalAgentSessionForkDialog.tsx` | Fork session dialog |
| TerminalLinkActionPopover | `terminal-pane/TerminalLinkActionPopover.tsx` | Link action popover |
| TerminalRemoteRuntimeReconnectBanner | `terminal-pane/TerminalRemoteRuntimeReconnectBanner.tsx` | Reconnect banner |
| TerminalSessionStateSaveFailureDialog | `terminal-pane/TerminalSessionStateSaveFailureDialog.tsx` | Session save failure |
| TerminalSshReconnectOverlay | `terminal-pane/TerminalSshReconnectOverlay.tsx` | SSH reconnect |
| CloseTerminalDialog | `terminal-pane/CloseTerminalDialog.tsx` | Close terminal confirmation |
| RunningTerminalCloseDialog | `terminal-pane/RunningTerminalCloseDialog.tsx` | Running terminal close |
| PinnedTabCloseDialog | `terminal-pane/PinnedTabCloseDialog.tsx` | Pinned tab close |
| SessionRestoredBanner | `terminal-pane/SessionRestoredBanner.tsx` | Session restored |
| MobileDriverOverlay | `terminal-pane/MobileDriverOverlay.tsx` | Mobile driver overlay |
| TerminalOverlaySlot | `terminal-pane/TerminalOverlaySlot.tsx` | Overlay slot |

### A3. Native Chat / AI Chat (15+ components)
| Component | Path | Description |
|-----------|------|-------------|
| NativeChatView | `native-chat/NativeChatView.tsx` | Main chat view |
| NativeChatComposer | `native-chat/NativeChatComposer.tsx` | Message composer |
| NativeChatComposerField | `native-chat/NativeChatComposerField.tsx` | Composer text field |
| NativeChatComposerActions | `native-chat/NativeChatComposerActions.tsx` | Composer action buttons |
| NativeChatMessageList | `native-chat/NativeChatMessageList.tsx` | Message list |
| NativeChatSessionGate | `native-chat/NativeChatSessionGate.tsx` | Session state gate |
| NativeChatSessionOptionPickers | `native-chat/NativeChatSessionOptionPickers.tsx` | Session option selection |
| NativeChatApprovalCard | `native-chat/NativeChatApprovalCard.tsx` | Tool approval card |
| NativeChatQuestionCard | `native-chat/NativeChatQuestionCard.tsx` | Agent question card |
| NativeChatInteractiveCard | `native-chat/NativeChatInteractiveCard.tsx` | Interactive prompt card |
| NativeChatToolRun | `native-chat/NativeChatToolRun.tsx` | Tool execution display |
| NativeChatEmptyState | `native-chat/NativeChatEmptyState.tsx` | Empty chat state |
| NativeChatCopyButton | `native-chat/NativeChatCopyButton.tsx` | Copy message button |
| NativeChatDiffView | `native-chat/NativeChatDiffView.tsx` | Inline diff view |
| NativeChatAutocompleteMenus | `native-chat/NativeChatAutocompleteMenus.tsx` | Autocomplete menus |

### A4. Editor (40+ components)
| Component | Path | Description |
|-----------|------|-------------|
| EditorPanel | `editor/EditorPanel.tsx` | Main editor panel |
| EditorPanelHeader | `editor/EditorPanelHeader.tsx` | Editor header bar |
| EditorContent | `editor/EditorContent.tsx` | Monaco editor content area |
| MonacoEditor | `editor/MonacoEditor.tsx` | Monaco editor wrapper |
| MonacoCodeExcerpt | `editor/MonacoCodeExcerpt.tsx` | Code excerpt display |
| MonacoGutterContextMenu | `editor/MonacoGutterContextMenu.tsx` | Gutter context menu |
| EditorViewToggle | `editor/EditorViewToggle.tsx` | View mode toggle |
| EditorAutosaveController | `editor/EditorAutosaveController.tsx` | Autosave controller |
| DiffViewer | `editor/DiffViewer.tsx` | Diff viewer |
| CombinedDiffViewer | `editor/CombinedDiffViewer.tsx` | Combined diff viewer |
| CombinedDiffFileTree | `editor/CombinedDiffFileTree.tsx` | Diff file tree |
| DiffSectionBody | `editor/DiffSectionBody.tsx` | Diff section body |
| DiffSectionHeader | `editor/DiffSectionHeader.tsx` | Diff section header |
| DiffSectionItem | `editor/DiffSectionItem.tsx` | Diff section item |
| MarkdownPreview | `editor/MarkdownPreview.tsx` | Markdown preview |
| MarkdownTableOfContentsPanel | `editor/MarkdownTableOfContentsPanel.tsx` | Markdown TOC |
| MarkdownTemplatePicker | `editor/MarkdownTemplatePicker.tsx` | Template picker |
| RichMarkdownEditor | `editor/RichMarkdownEditor.tsx` | Rich markdown (TipTap) |
| RichMarkdownToolbar | `editor/RichMarkdownToolbar.tsx` | Markdown toolbar |
| RichMarkdownSearchBar | `editor/RichMarkdownSearchBar.tsx` | Markdown search |
| RichMarkdownSlashMenu | `editor/RichMarkdownSlashMenu.tsx` | Slash command menu |
| RichMarkdownTableControls | `editor/RichMarkdownTableControls.tsx` | Table controls |
| RichMarkdownEmojiMenu | `editor/RichMarkdownEmojiMenu.tsx` | Emoji picker |
| RichMarkdownDocLinkMenu | `editor/RichMarkdownDocLinkMenu.tsx` | Document link menu |
| RichMarkdownLinkBubble | `editor/RichMarkdownLinkBubble.tsx` | Link editing bubble |
| RichMarkdownAnnotationOverlay | `editor/RichMarkdownAnnotationOverlay.tsx` | Review annotation |
| RichMarkdownReviewNoteLayer | `editor/RichMarkdownReviewNoteLayer.tsx` | Review note layer |
| RichMarkdownReviewRailActions | `editor/RichMarkdownReviewRailActions.tsx` | Review rail actions |
| RichMarkdownErrorBoundary | `editor/RichMarkdownErrorBoundary.tsx` | Error boundary |
| ImageViewer | `editor/ImageViewer.tsx` | Image viewer |
| ImageViewerPopup | `editor/ImageViewerPopup.tsx` | Image popup |
| ImageDiffViewer | `editor/ImageDiffViewer.tsx` | Image diff viewer |
| PdfViewer | `editor/PdfViewer.tsx` | PDF viewer |
| PdfFind | `editor/PdfFind.tsx` | PDF search |
| CsvViewer | `editor/CsvViewer.tsx` | CSV viewer |
| IpynbViewer | `editor/IpynbViewer.tsx` | Jupyter notebook viewer |
| MermaidViewer | `editor/MermaidViewer.tsx` | Mermaid diagrams |
| MermaidBlock | `editor/MermaidBlock.tsx` | Mermaid block renderer |
| CodeBlockCopyButton | `editor/CodeBlockCopyButton.tsx` | Code block copy |
| CheckRunAnnotations | `editor/CheckRunAnnotations.tsx` | Check run annotations |
| CheckRunDetailsPanel | `editor/CheckRunDetailsPanel.tsx` | Check run details |
| CheckRunJobs | `editor/CheckRunJobs.tsx` | Check run jobs |
| LargeDiffFallback | `editor/LargeDiffFallback.tsx` | Large diff fallback |
| UntitledFileRenameDialog | `editor/UntitledFileRenameDialog.tsx` | Untitled file rename |
| ChangesModeView | `editor/ChangesModeView.tsx` | Changes mode view |
| ConflictComponents | `editor/ConflictComponents.tsx` | Merge conflict UI |
| ConflictReviewFileTree | `editor/ConflictReviewFileTree.tsx` | Conflict file tree |
| ExternalFileChangeBanner | `editor/ExternalFileChangeBanner.tsx` | External change notification |
| ExternalFileChangeCompareDialog | `editor/ExternalFileChangeCompareDialog.tsx` | External change compare |
| NotesSendMenu | `editor/NotesSendMenu.tsx` | Notes send menu |
| DiffNotesSendMenu | `editor/DiffNotesSendMenu.tsx` | Diff notes send menu |
| ReviewNotesSendMenuContent | `editor/ReviewNotesSendMenuContent.tsx` | Review notes content |

### A5. Sidebar / Source Control (30+ components)
| Component | Path | Description |
|-----------|------|-------------|
| SourceControl | `right-sidebar/SourceControl.tsx` | Source control panel |
| SourceControlAgentActionDialog | `right-sidebar/SourceControlAgentActionDialog.tsx` | AI action dialog |
| SourceControlTextGenerationDialog | `right-sidebar/SourceControlTextGenerationDialog.tsx` | AI text generation |
| SourceControlActionVariableChips | `source-control/SourceControlActionVariableChips.tsx` | Action variable chips |
| CommitArea | `right-sidebar/CommitArea.*.tsx` | Commit message area |
| ChecksPanel | `right-sidebar/ChecksPanel.tsx` | PR checks panel |
| FileExplorer | `right-sidebar/FileExplorer.tsx` | File explorer |
| FileExplorerToolbar | `right-sidebar/FileExplorerToolbar.tsx` | File explorer toolbar |
| FileExplorerRow | `right-sidebar/FileExplorerRow.tsx` | File explorer row |
| FileExplorerNameFilter | `right-sidebar/FileExplorerNameFilter.tsx` | File name filter |
| FileExplorerVirtualRows | `right-sidebar/FileExplorerVirtualRows.tsx` | Virtual scrolling rows |
| GitHistoryPanel | `right-sidebar/GitHistoryPanel.tsx` | Git history panel |
| GitHistoryRow | `right-sidebar/GitHistoryRow.tsx` | Git history row |
| GitHistoryCommitFiles | `right-sidebar/GitHistoryCommitFiles.tsx` | Commit file list |
| GitHistoryGraphSvg | `right-sidebar/GitHistoryGraphSvg.tsx` | Commit graph |
| GitHistoryCommitContextMenu | `right-sidebar/GitHistoryCommitContextMenu.tsx` | Commit context menu |
| SearchResultsPane | `right-sidebar/SearchResultsPane.tsx` | Search results |
| SearchResultItems | `right-sidebar/SearchResultItems.tsx` | Search result items |
| SearchFilters | `right-sidebar/SearchFilters.tsx` | Search filters |
| SearchQueryRow | `right-sidebar/SearchQueryRow.tsx` | Search query row |
| PluginPanel | `right-sidebar/PluginPanel.tsx` | Plugin panel |
| PortsPanel | `right-sidebar/PortsPanel.tsx` | Ports panel |
| AiVaultPanel | `right-sidebar/AiVaultPanel.tsx` | AI vault (session history) |
| AiVaultPanelControls | `right-sidebar/AiVaultPanelControls.tsx` | AI vault controls |
| AiVaultPanelHeader | `right-sidebar/AiVaultPanelHeader.tsx` | AI vault header |
| AiVaultSessionRow | `right-sidebar/AiVaultSessionRow.tsx` | AI vault session row |
| AiVaultSessionDetails | `right-sidebar/AiVaultSessionDetails.tsx` | Session details |
| AiVaultSessionVirtualList | `right-sidebar/AiVaultSessionVirtualList.tsx` | Virtual session list |
| AiVaultSessionSubagents | `right-sidebar/AiVaultSessionSubagents.tsx` | Sub-agent display |
| AiVaultScanIssueBanners | `right-sidebar/AiVaultScanIssueBanners.tsx` | Scan issue banners |
| BulkActionBar | `right-sidebar/BulkActionBar.tsx` | Bulk action bar |
| CreateHostedReviewComposer | `right-sidebar/CreateHostedReviewComposer.tsx` | PR/review composer |
| HostedReviewActions | `right-sidebar/HostedReviewActions.tsx` | Review action buttons |
| HostedReviewStateActions | `right-sidebar/HostedReviewStateActions.tsx` | Review state actions |
| GitHubPRStackMap | `right-sidebar/GitHubPRStackMap.tsx` | PR stack visualization |
| FolderWorkspacePrChecksPanel | `right-sidebar/FolderWorkspacePrChecksPanel.tsx` | Folder workspace checks |
| FolderWorkspaceWorktreesPanel | `right-sidebar/FolderWorkspaceWorktreesPanel.tsx` | Folder workspace worktrees |

### A6. Worktree Cards (25+ components)
| Component | Path | Description |
|-----------|------|-------------|
| WorktreeCard | `sidebar/WorktreeCard.tsx` | Worktree card |
| WorktreeCardAgents | `sidebar/WorktreeCardAgents.tsx` | Agent rows on card |
| WorktreeCardMeta | `sidebar/WorktreeCardMeta.tsx` | Card metadata |
| WorktreeCardMetaBadges | `sidebar/WorktreeCardMetaBadges.tsx` | Metadata badges |
| WorktreeCardPorts | `sidebar/WorktreeCardPorts.tsx` | Port display |
| WorktreeCardDetailSection | `sidebar/WorktreeCardDetailSection.tsx` | Card detail section |
| WorktreeCardStatusSlot | `sidebar/WorktreeCardStatusSlot.tsx` | Status slot |
| WorktreeContextMenu | `sidebar/WorktreeContextMenu.tsx` | Worktree context menu |
| WorktreeList | `sidebar/WorktreeList.tsx` | Worktree list |
| WorktreeTitleInlineRename | `sidebar/WorktreeTitleInlineRename.tsx` | Inline rename |
| WorktreeDisplayNameField | `sidebar/WorktreeDisplayNameField.tsx` | Display name field |
| WorktreeIssueLinkField | `sidebar/WorktreeIssueLinkField.tsx` | Issue link field |
| WorktreeMetaDialog | `sidebar/WorktreeMetaDialog.tsx` | Worktree metadata dialog |
| WorktreeOpenInMenu | `sidebar/WorktreeOpenInMenu.tsx` | Open in menu |
| WorktreeParentPickerPopover | `sidebar/WorktreeParentPickerPopover.tsx` | Parent worktree picker |
| WorktreeVisibilityDialog | `sidebar/WorktreeVisibilityDialog.tsx` | Visibility dialog |
| WorktreeDeveloperMenu | `sidebar/WorktreeDeveloperMenu.tsx` | Developer menu |
| WorkspaceKanbanDrawer | `sidebar/WorkspaceKanbanDrawer.tsx` | Kanban board drawer |
| WorkspaceKanbanCard | `sidebar/WorkspaceKanbanCard.tsx` | Kanban card |
| WorkspaceKanbanLaneGrid | `sidebar/WorkspaceKanbanLaneGrid.tsx` | Kanban lane grid |
| WorkspaceKanbanStatusLane | `sidebar/WorkspaceKanbanStatusLane.tsx` | Status lane |
| WorkspaceKanbanSearchField | `sidebar/WorkspaceKanbanSearchField.tsx` | Kanban search |
| WorkspaceKanbanSettingsMenu | `sidebar/WorkspaceKanbanSettingsMenu.tsx` | Kanban settings |
| DeleteWorktreeDialog | `sidebar/DeleteWorktreeDialog.tsx` | Delete worktree dialog |
| AddRepoDialog | `sidebar/AddRepoDialog.tsx` | Add repository dialog |
| AddRemoteHostDialog | `sidebar/AddRemoteHostDialog.tsx` | Add remote host dialog |
| AddProjectFromFolderDialog | `sidebar/AddProjectFromFolderDialog.tsx` | Add project dialog |
| ProjectAddedDialog | `sidebar/ProjectAddedDialog.tsx` | Project added dialog |
| HostRenameDialog | `sidebar/HostRenameDialog.tsx` | Host rename dialog |
| HostRemoveDialog | `sidebar/HostRemoveDialog.tsx` | Host remove dialog |
| FabricaYamlTrustDialog | `sidebar/FabricaYamlTrustDialog.tsx` | YAML trust dialog |
| CommentMarkdown | `sidebar/CommentMarkdown.tsx` | Comment markdown renderer |
| StatusIndicator | `sidebar/StatusIndicator.tsx` | Status indicator |
| SetupGuideSidebarEntry | `sidebar/SetupGuideSidebarEntry.tsx` | Setup guide entry |
| SetupScriptPromptCard | `sidebar/SetupScriptPromptCard.tsx` | Setup script prompt |
| LinearAgentSkillSetupDialog | `sidebar/LinearAgentSkillSetupDialog.tsx` | Linear skill setup |
| PreservedBranchBatchReviewDialog | `sidebar/PreservedBranchBatchReviewDialog.tsx` | Branch batch review |
| NonGitFolderDialog | `sidebar/NonGitFolderDialog.tsx` | Non-git folder dialog |
| RemoteFileBrowser | `sidebar/RemoteFileBrowser.tsx` | Remote file browser |
| SidebarFeedbackDialog | `sidebar/SidebarFeedbackDialog.tsx` | Feedback dialog |

### A7. Dashboard (8 components)
| Component | Path | Description |
|-----------|------|-------------|
| AgentDashboardDrawer | `dashboard/AgentDashboardDrawer.tsx` | Agent dashboard drawer |
| AgentDashboardSettingsMenu | `dashboard/AgentDashboardSettingsMenu.tsx` | Dashboard settings |
| DashboardAgentRow | `dashboard/DashboardAgentRow.tsx` | Agent row |
| DashboardAgentRowMessage | `dashboard/DashboardAgentRowMessage.tsx` | Agent message display |
| DashboardAgentRowToolStep | `dashboard/DashboardAgentRowToolStep.tsx` | Tool step display |
| DashboardAgentRowTrailingControls | `dashboard/DashboardAgentRowTrailingControls.tsx` | Row trailing controls |
| DashboardAgentChildDisclosure | `dashboard/DashboardAgentChildDisclosure.tsx` | Child agent disclosure |
| DashboardPopoutBridge | `dashboard/DashboardPopoutBridge.tsx` | Popout bridge |
| RetainedAgentsSyncGate | `dashboard/RetainedAgentsSyncGate.tsx` | Retained agents sync |

### A8. Tasks / Work Items (10+ components)
| Component | Path | Description |
|-----------|------|-------------|
| TaskPage | `TaskPage.tsx` | Main task page |
| JiraIssueWorkspace | `JiraIssueWorkspace.tsx` | Jira issue workspace |
| LinearIssueWorkspace | `LinearIssueWorkspace.tsx` | Linear issue workspace |
| LinearItemDrawer | `LinearItemDrawer.tsx` | Linear item drawer |
| LinearProjectViewSurfaces | `linear-project-view-surfaces.tsx` | Linear project views |
| PullRequestPage | `PullRequestPage.tsx` | Pull request page |
| GitHubItemDialog | `GitHubItemDialog.tsx` | GitHub item dialog |
| GitLabItemDialog | `GitLabItemDialog.tsx` | GitLab item dialog |
| JiraConnectDialog | `jira-connect-dialog.tsx` | Jira connection dialog |
| LinearApiKeyDialog | `linear-api-key-dialog.tsx` | Linear API key dialog |
| TaskProjectSourceCombobox | `task-project-source-combobox.tsx` | Project source combobox |

### A9. Settings (50+ components)
| Component | Path | Description |
|-----------|------|-------------|
| Settings | `settings/Settings.tsx` | Main settings dialog |
| SettingsSidebar | `settings/SettingsSidebar.tsx` | Settings sidebar nav |
| SettingsSection | `settings/SettingsSection.tsx` | Settings section wrapper |
| SettingsFormControls | `settings/SettingsFormControls.tsx` | Form controls |
| GeneralPane | `settings/GeneralPane.tsx` | General settings |
| AppearancePane | `settings/AppearancePane.tsx` | Appearance settings |
| TerminalPane | `settings/TerminalPane.tsx` | Terminal settings |
| TerminalThemePicker | `settings/TerminalThemePicker.tsx` | Theme picker |
| TerminalThemeSections | `settings/TerminalThemeSections.tsx` | Theme sections |
| TerminalSettingsPreview | `settings/TerminalSettingsPreview.tsx` | Terminal preview |
| TerminalAppearanceSection | `settings/TerminalAppearanceSection.tsx` | Terminal appearance |
| TerminalCursorAppearanceSection | `settings/TerminalCursorAppearanceSection.tsx` | Cursor settings |
| TerminalAdvancedSection | `settings/TerminalAdvancedSection.tsx` | Advanced terminal |
| TerminalFontSizeSetting | `settings/TerminalFontSizeSetting.tsx` | Font size |
| GitPane | `settings/GitPane.tsx` | Git settings |
| RepositoryPane | `settings/RepositoryPane.tsx` | Repository settings |
| BrowserPane | `settings/BrowserPane.tsx` | Browser settings |
| BrowserUsePane | `settings/BrowserUsePane.tsx` | Browser Use settings |
| MobilePane | `settings/MobilePane.tsx` | Mobile settings |
| MobileSettingsPane | `settings/MobileSettingsPane.tsx` | Mobile settings pane |
| MobileEmulatorSettingsPane | `settings/MobileEmulatorSettingsPane.tsx` | Emulator settings |
| IntegrationsPane | `settings/IntegrationsPane.tsx` | Integrations settings |
| TasksPane | `settings/TasksPane.tsx` | Tasks settings |
| PluginsSettingsSection | `settings/PluginsSettingsSection.tsx` | Plugin settings |
| PluginMarketplaceBrowser | `settings/PluginMarketplaceBrowser.tsx` | Plugin marketplace |
| PluginMarketplaceListingRow | `settings/PluginMarketplaceListingRow.tsx` | Marketplace listing |
| PluginInstallDialog | `settings/PluginInstallDialog.tsx` | Plugin install dialog |
| PluginConsentDialog | `settings/PluginConsentDialog.tsx` | Plugin consent dialog |
| PluginRemoveDialog | `settings/PluginRemoveDialog.tsx` | Plugin remove dialog |
| SshPane | `settings/SshPane.tsx` | SSH settings |
| SshTargetForm | `settings/SshTargetForm.tsx` | SSH target form |
| SshTargetCard | `settings/SshTargetCard.tsx` | SSH target card |
| SshPassphraseDialog | `settings/SshPassphraseDialog.tsx` | SSH passphrase dialog |
| AgentsPane | `settings/AgentsPane.tsx` | Agents settings |
| AgentAwakeSetting | `settings/AgentAwakeSetting.tsx` | Agent awake setting |
| AgentRuntimeSetting | `settings/AgentRuntimeSetting.tsx` | Agent runtime setting |
| AgentSkillSetupPanel | `settings/AgentSkillSetupPanel.tsx` | Agent skill setup |
| AccountsPane | `settings/AccountsPane.tsx` | Account settings |
| NotificationsPane | `settings/NotificationsPane.tsx` | Notification settings |
| PrivacyPane | `settings/PrivacyPane.tsx` | Privacy settings |
| ShortcutsPane | `settings/ShortcutsPane.tsx` | Keyboard shortcuts |
| ShortcutRecorderButton | `settings/ShortcutRecorderButton.tsx` | Shortcut recorder |
| AdvancedPane | `settings/AdvancedPane.tsx` | Advanced settings |
| DevToolsPane | `settings/DevToolsPane.tsx` | Developer tools |
| VoicePane | `settings/VoicePane.tsx` | Voice/dictation settings |
| OrchestrationPane | `settings/OrchestrationPane.tsx` | Orchestration settings |
| EphemeralVmsPane | `settings/EphemeralVmsPane.tsx` | Ephemeral VM settings |
| ArtifactsSettingsPane | `settings/ArtifactsSettingsPane.tsx` | Artifacts settings |
| AutomationsSettingsPane | `settings/AutomationsSettingsPane.tsx` | Automations settings |
| RuntimeEnvironmentsPane | `settings/RuntimeEnvironmentsPane.tsx` | Runtime environments |
| FloatingWorkspacePane | `settings/FloatingWorkspacePane.tsx` | Floating workspace settings |
| DeveloperPermissionsPane | `settings/DeveloperPermissionsPane.tsx` | Developer permissions |
| QuickCommandsPane | `settings/QuickCommandsPane.tsx` | Quick commands settings |
| CliSection | `settings/CliSection.tsx` | CLI settings section |
| FabricaAccountSettingsPane | `settings/FabricaAccountSettingsPane.tsx` | Fabrica account settings |
| AppIconSelector | `settings/AppIconSelector.tsx` | App icon picker |
| BaseRefPicker | `settings/BaseRefPicker.tsx` | Base ref picker |
| SetupGuideModal | `setup-guide/SetupGuideModal.tsx` | Setup guide modal |
| SetupGuideProgressRing | `setup-guide/SetupGuideProgressRing.tsx` | Setup progress ring |

### A10. Automations (15+ components)
| Component | Path | Description |
|-----------|------|-------------|
| AutomationsPage | `automations/AutomationsPage.tsx` | Automations page |
| AutomationsListPanel | `automations/AutomationsListPanel.tsx` | Automation list |
| AutomationsDetailPane | `automations/AutomationsDetailPane.tsx` | Automation detail |
| AutomationDetail | `automations/AutomationDetail.tsx` | Automation detail view |
| AutomationEditorDialog | `automations/AutomationEditorDialog.tsx` | Automation editor |
| AutomationEditorPromptSection | `automations/AutomationEditorPromptSection.tsx` | Prompt editor |
| AutomationRunHistory | `automations/AutomationRunHistory.tsx` | Run history |
| AutomationRunPageFrame | `automations/AutomationRunPageFrame.tsx` | Run page frame |
| AutomationSchedulePicker | `automations/AutomationSchedulePicker.tsx` | Schedule picker |
| AutomationCustomCronPanel | `automations/AutomationCustomCronPanel.tsx` | Custom cron panel |
| AutomationDeleteDialogs | `automations/AutomationDeleteDialogs.tsx` | Delete dialogs |
| AutomationListSearchField | `automations/AutomationListSearchField.tsx` | List search |
| AutomationListLocalRows | `automations/AutomationListLocalRows.tsx` | Local automation rows |
| AutomationListExternalRows | `automations/AutomationListExternalRows.tsx` | External automation rows |
| ExternalAutomationManagers | `automations/ExternalAutomationManagers.tsx` | External managers |
| ExternalAutomationRunTable | `automations/ExternalAutomationRunTable.tsx` | External run table |
| HermesCronOutputView | `automations/HermesCronOutputView.tsx` | Hermes cron output |
| CreateFromPicker | `automations/CreateFromPicker.tsx` | Create from picker |

### A11. Artifacts (7 components)
| Component | Path | Description |
|-----------|------|-------------|
| ArtifactsPage | `artifacts/ArtifactsPage.tsx` | Artifacts page |
| ArtifactListPane | `artifacts/ArtifactListPane.tsx` | Artifact list |
| ArtifactCollection | `artifacts/ArtifactCollection.tsx` | Artifact collection |
| ArtifactPreview | `artifacts/ArtifactPreview.tsx` | Artifact preview |
| ArtifactDetailHeader | `artifacts/ArtifactDetailHeader.tsx` | Detail header |
| ArtifactActions | `artifacts/ArtifactActions.tsx` | Artifact actions |
| ArtifactPublishButton | `artifacts/ArtifactPublishButton.tsx` | Publish button |
| ArtifactPublishedLinkPanel | `artifacts/ArtifactPublishedLinkPanel.tsx` | Published link |

### A12. Skills (5 components)
| Component | Path | Description |
|-----------|------|-------------|
| SkillsPage | `skills/SkillsPage.tsx` | Skills page |
| SkillCard | `skills/SkillCard.tsx` | Skill card |
| SkillUpdateRow | `skills/SkillUpdateRow.tsx` | Update row |
| SkillFreshnessNudge | `skills/SkillFreshnessNudge.tsx` | Freshness nudge |
| SkillFreshnessStatusPill | `skills/SkillFreshnessStatusPill.tsx` | Status pill |
| SkillFreshnessUpdateDialog | `skills/SkillFreshnessUpdateDialog.tsx` | Update dialog |

### A13. Usage / Stats (15+ components)
| Component | Path | Description |
|-----------|------|-------------|
| StatsPane | `stats/StatsPane.tsx` | Stats pane |
| UsageOverviewPane | `stats/UsageOverviewPane.tsx` | Usage overview |
| UsageBreakdownSection | `stats/UsageBreakdownSection.tsx` | Usage breakdown |
| UsageRecentSessionsTable | `stats/UsageRecentSessionsTable.tsx` | Recent sessions |
| UsageTrackingPaneShell | `stats/UsageTrackingPaneShell.tsx` | Tracking pane shell |
| ClaudeUsagePane | `stats/ClaudeUsagePane.tsx` | Claude usage |
| ClaudeUsageDailyChart | `stats/ClaudeUsageDailyChart.tsx` | Daily usage chart |
| ClaudeUsageDetails | `stats/ClaudeUsageDetails.tsx` | Usage details |
| CodexUsagePane | `stats/CodexUsagePane.tsx` | Codex usage |
| CodexUsageDailyChart | `stats/CodexUsageDailyChart.tsx` | Daily chart |
| CodexUsageDetails | `stats/CodexUsageDetails.tsx` | Usage details |
| GrokUsagePane | `stats/GrokUsagePane.tsx` | Grok usage |
| OpenCodeUsagePane | `stats/OpenCodeUsagePane.tsx` | OpenCode usage |
| StatCard | `stats/StatCard.tsx` | Stat card |
| ShareUsageCard | `stats/ShareUsageCard.tsx` | Share card |
| ShareUsageButton | `stats/ShareUsageButton.tsx` | Share button |

### A14. Feature Wall / Onboarding (10+ components)
| Component | Path | Description |
|-----------|------|-------------|
| FeatureWallModal | `feature-wall/FeatureWallModal.tsx` | Feature wall modal |
| FeatureWallBody | `feature-wall/FeatureWallBody.tsx` | Feature wall body |
| FeatureWallRail | `feature-wall/FeatureWallRail.tsx` | Feature wall rail |
| FeatureWallTourPanel | `feature-wall/FeatureWallTourPanel.tsx` | Tour panel |
| FeatureWallTourSurface | `feature-wall/FeatureWallTourSurface.tsx` | Tour surface |
| FeatureWallPreview | `feature-wall/FeatureWallPreview.tsx` | Feature preview |
| FeatureWallSetupChecklist | `feature-wall/FeatureWallSetupChecklist.tsx` | Setup checklist |
| FeatureWallContinueButton | `feature-wall/FeatureWallContinueButton.tsx` | Continue button |
| OnboardingFlow | `onboarding/OnboardingFlow.tsx` | Onboarding flow |
| AgentStep | `onboarding/AgentStep.tsx` | Agent selection step |
| ThemeStep | `onboarding/ThemeStep.tsx` | Theme selection step |
| IntegrationsStep | `onboarding/IntegrationsStep.tsx` | Integrations step |
| NotificationStep | `onboarding/NotificationStep.tsx` | Notification step |
| WindowsTerminalStep | `onboarding/WindowsTerminalStep.tsx` | Windows terminal step |
| OnboardingFooter | `onboarding/OnboardingFooter.tsx` | Onboarding footer |
| OnboardingInlineCommandTerminal | `onboarding/OnboardingInlineCommandTerminal.tsx` | Inline terminal |
| FeatureSetupInlineTerminal | `onboarding/FeatureSetupInlineTerminal.tsx` | Feature setup terminal |
| OnboardingSkipConfirmationDialog | `onboarding/OnboardingSkipConfirmationDialog.tsx` | Skip confirmation |

### A15. Browser Pane (10+ components)
| Component | Path | Description |
|-----------|------|-------------|
| BrowserPane | `browser-pane/BrowserPane.tsx` | Browser pane |
| BrowserAddressBar | `browser-pane/BrowserAddressBar.tsx` | Address bar |
| BrowserAddressBarSuggestionList | `browser-pane/BrowserAddressBarSuggestionList.tsx` | URL suggestions |
| BrowserToolbarMenu | `browser-pane/BrowserToolbarMenu.tsx` | Toolbar menu |
| BrowserFind | `browser-pane/BrowserFind.tsx` | Browser find-in-page |
| BrowserImportHintButton | `browser-pane/BrowserImportHintButton.tsx` | Cookie import hint |
| BrowserMobileDriverOverlay | `browser-pane/BrowserMobileDriverOverlay.tsx` | Mobile driver overlay |
| BrowserPaneOverlayLayer | `browser-pane/BrowserPaneOverlayLayer.tsx` | Browser overlay layer |
| BrowserAnnotationSendMenuContent | `browser-pane/BrowserAnnotationSendMenuContent.tsx` | Annotation send menu |
| GrabConfirmationSheet | `browser-pane/GrabConfirmationSheet.tsx` | Screen grab confirmation |

### A16. Emulator Pane (4 components)
| Component | Path | Description |
|-----------|------|-------------|
| EmulatorPane | `emulator-pane/EmulatorPane.tsx` | Emulator pane |
| EmulatorPaneOverlayLayer | `emulator-pane/EmulatorPaneOverlayLayer.tsx` | Emulator overlay layer |
| MobileEmulatorAgentSetupGuide | `emulator-pane/MobileEmulatorAgentSetupGuide.tsx` | Agent setup guide |
| MobileEmulatorTabIntroCallout | `emulator-pane/MobileEmulatorTabIntroCallout.tsx` | Tab intro callout |

### A17. GitHub / GitLab (15+ components)
| Component | Path | Description |
|-----------|------|-------------|
| GitHubMarkdownComposer | `github/GitHubMarkdownComposer.tsx` | GitHub markdown composer |
| GitHubMarkdownComposerEditorPane | `github/GitHubMarkdownComposerEditorPane.tsx` | Composer editor |
| CommentCodeContext | `github/CommentCodeContext.tsx` | Code context for comments |
| CommentReactions | `github/CommentReactions.tsx` | Comment reactions |
| PRAssigneesPanel | `github/PRAssigneesPanel.tsx` | PR assignees |
| PRFilterDropdowns | `github/PRFilterDropdowns.tsx` | PR filter dropdowns |
| PRFilterPickers | `github/PRFilterPickers.tsx` | PR filter pickers |
| PRFilterSections | `github/PRFilterSections.tsx` | PR filter sections |
| PRViewedCheckbox | `github/PRViewedCheckbox.tsx` | PR file viewed checkbox |
| ProjectPicker | `github-project/ProjectPicker.tsx` | GitHub project picker |
| ProjectViewList | `github-project/ProjectViewList.tsx` | Project view list |
| ProjectViewWrapper | `github-project/ProjectViewWrapper.tsx` | Project view wrapper |
| ProjectRow | `github-project/ProjectRow.tsx` | Project row |
| ProjectCell | `github-project/ProjectCell.tsx` | Project cell |
| ProjectGroupHeader | `github-project/ProjectGroupHeader.tsx` | Project group header |
| ProjectItemSlugDialog | `github-project/ProjectItemSlugDialog.tsx` | Item slug dialog |
| GitLabRateLimitDisplay | `gitlab/gitlab-rate-limit-display.tsx` | GitLab rate limit |

### A18. Other UI (20+ components)
| Component | Path | Description |
|-----------|------|-------------|
| PetOverlay | `pet/PetOverlay.tsx` | Pet mascot overlay |
| ActivityPrototypePage | `activity/ActivityPrototypePage.tsx` | Activity page |
| ActivityTitlebarControls | `activity/ActivityTitlebarControls.tsx` | Activity titlebar |
| MobilePage | `mobile/MobilePage.tsx` | Mobile page |
| MobileHero | `mobile/MobileHero.tsx` | Mobile hero section |
| MobileHeroIntro | `mobile/MobileHeroIntro.tsx` | Mobile intro |
| MobileHeroPairedDevices | `mobile/MobileHeroPairedDevices.tsx` | Paired devices |
| MobileHeroPairingStep | `mobile/MobileHeroPairingStep.tsx` | Pairing step |
| PhoneCarousel | `mobile/PhoneCarousel.tsx` | Phone carousel |
| NetworkInterfacePicker | `mobile/NetworkInterfacePicker.tsx` | Network interface picker |
| WindowsFirewallNotice | `mobile/WindowsFirewallNotice.tsx` | Firewall notice |
| NewWorkspaceComposerCard | `NewWorkspaceComposerCard.tsx` | Workspace composer card |
| NewWorkspaceComposerModal | `NewWorkspaceComposerModal.tsx` | Workspace composer modal |
| QuickOpen | `QuickOpen.tsx` | Quick open palette |
| WorktreeJumpPalette | `WorktreeJumpPalette.tsx` | Worktree jump palette |
| WorktreeBaseFallbackDialog | `WorktreeBaseFallbackDialog.tsx` | Base fallback dialog |
| UpdateCard | `UpdateCard.tsx` | Update notification card |
| UpdateErrorCardContent | `UpdateErrorCardContent.tsx` | Update error content |
| TelemetryFirstLaunchSurface | `TelemetryFirstLaunchSurface.tsx` | Telemetry consent |
| FirstLaunchBanner | `FirstLaunchBanner.tsx` | First launch banner |
| DetachedHeadBadge | `DetachedHeadBadge.tsx` | Detached head badge |
| LinuxPackageInstallRecoveryCard | `LinuxPackageInstallRecoveryCard.tsx` | Package install recovery |
| StarNagCard | `StarNagCard.tsx` | Star nag card |
| SelectedTextCopyMenu | `SelectedTextCopyMenu.tsx` | Selected text copy |
| ShortcutKeyCombo | `ShortcutKeyCombo.tsx` | Keyboard shortcut display |
| IntegrationStatusPill | `integration-status-pill.tsx` | Integration status |
| CodexRestartChip | `CodexRestartChip.tsx` | Codex restart chip |
| AgentStateDot | `AgentStateDot.tsx` | Agent state indicator |
| AgentWorkingSpinner | `AgentWorkingSpinner.tsx` | Working spinner |
| ConfirmationDialog | `confirmation-dialog.tsx` | Confirmation dialog |
| LinkRoutingPreferenceDialog | `link-routing-preference-dialog.tsx` | Link routing |
| DictationController | `dictation/DictationController.tsx` | Dictation controller |
| DictationIndicator | `dictation/DictationIndicator.tsx` | Dictation indicator |
| PluginCatalogLayout | `plugin-catalog/PluginCatalogLayout.tsx` | Plugin catalog layout |
| PluginCatalogAvatar | `plugin-catalog/PluginCatalogAvatar.tsx` | Plugin avatar |
| PluginCatalogEmptyState | `plugin-catalog/PluginCatalogEmptyState.tsx` | Empty state |
| WorkspacePortScanner | `ports/WorkspacePortScanner.tsx` | Port scanner |

### A19. Status Bar Segments (10+ components)
| Component | Path | Description |
|-----------|------|-------------|
| UsageRosterPanel | `status-bar/UsageRosterPanel.tsx` | Usage roster |
| ResourceUsageStatusSegment | `status-bar/ResourceUsageStatusSegment.tsx` | Resource usage |
| PortsStatusSegment | `status-bar/PortsStatusSegment.tsx` | Ports status |
| SshStatusSegment | `status-bar/SshStatusSegment.tsx` | SSH status |
| RuntimeHostStatusRow | `status-bar/RuntimeHostStatusRow.tsx` | Runtime host status |
| UpdateStatusSegment | `status-bar/UpdateStatusSegment.tsx` | Update status |
| SkillUpdateStatusSegment | `status-bar/SkillUpdateStatusSegment.tsx` | Skill update |
| RemoteServerUpdateStatusSegment | `status-bar/RemoteServerUpdateStatusSegment.tsx` | Remote server update |
| CaffeinateStatusSegment | `status-bar/CaffeinateStatusSegment.tsx` | Caffeinate status |
| PetStatusSegment | `status-bar/PetStatusSegment.tsx` | Pet status |
| WorkspaceSpaceCompactPanel | `status-bar/WorkspaceSpaceCompactPanel.tsx` | Workspace space compact |
| WorkspaceSpaceManagerPanel | `status-bar/WorkspaceSpaceManagerPanel.tsx` | Workspace space manager |

### A20. UI Primitives (25 components)
| Component | Path | Description |
|-----------|------|-------------|
| accordion | `ui/accordion.tsx` | Accordion |
| badge | `ui/badge.tsx` | Badge |
| button | `ui/button.tsx` | Button |
| button-group | `ui/button-group.tsx` | Button group |
| card | `ui/card.tsx` | Card |
| checkbox | `ui/checkbox.tsx` | Checkbox |
| collapsible | `ui/collapsible.tsx` | Collapsible |
| color-picker | `ui/color-picker.tsx` | Color picker |
| command | `ui/command.tsx` | Command palette |
| context-menu | `ui/context-menu.tsx` | Context menu |
| dialog | `ui/dialog.tsx` | Dialog |
| dropdown-menu | `ui/dropdown-menu.tsx` | Dropdown menu |
| hover-card | `ui/hover-card.tsx` | Hover card |
| input | `ui/input.tsx` | Input |
| label | `ui/label.tsx` | Label |
| popover | `ui/popover.tsx` | Popover |
| progress | `ui/progress.tsx` | Progress bar |
| repo-multi-combobox | `ui/repo-multi-combobox.tsx` | Repo combobox |
| scroll-area | `ui/scroll-area.tsx` | Scroll area |
| select | `ui/select.tsx` | Select |
| separator | `ui/separator.tsx` | Separator |
| sheet | `ui/sheet.tsx` | Sheet/slide-out |
| slider | `ui/slider.tsx` | Slider |
| sonner | `ui/sonner.tsx` | Toast notifications |
| switch | `ui/switch.tsx` | Toggle switch |
| tabs | `ui/tabs.tsx` | Tabs |
| toggle | `ui/toggle.tsx` | Toggle |
| toggle-group | `ui/toggle-group.tsx` | Toggle group |
| tooltip | `ui/tooltip.tsx` | Tooltip |

---

## B. Backend Services (~250+ Main Process Modules)

### B1. Core Application (6 modules)
| Service | Path | Description |
|---------|------|-------------|
| Main Entry | `main/index.ts` | App lifecycle, service wiring |
| Persistence (Store) | `main/persistence.ts` | Central state persistence |
| Protected Secret Persistence | `main/protected-secret-persistence.ts` | Protected secrets |
| Hooks | `main/hooks.ts` | Git hooks runner |
| Pty | `main/pty/` | Shell environment, terminal spawning |
| Updater | `main/updater.ts` | Auto-update system |
| App Icon | `main/app-icon.ts` | App icon management |
| App Relaunch | `main/app-relaunch.ts` | App restart/relaunch |
| System Fonts | `main/system-fonts.ts` | System font detection |

### B2. IPC Handlers (40+ handlers)
| Service | Path | Description |
|---------|------|-------------|
| Register Core Handlers | `main/ipc/register-core-handlers.ts` | Core IPC registration |
| App IPC | `main/ipc/app.ts` | App-level IPC |
| Settings IPC | `main/ipc/settings.ts` | Settings IPC |
| Shell IPC | `main/ipc/shell.ts` | Shell commands IPC |
| Repos IPC | `main/ipc/repos.ts` | Repository management IPC |
| Git IPC | `main/ipc/github.ts`, `gitlab.ts` | Git provider IPC |
| Pty IPC | `main/ipc/pty.ts` | PTY management IPC |
| Terminal IPC | `main/ipc/terminal-preview.ts` | Terminal preview IPC |
| Filesystem IPC | `main/ipc/filesystem.ts` | Filesystem operations IPC |
| Filesystem Watcher | `main/ipc/filesystem-watcher.ts` | File system watcher |
| Filesystem Mutations | `main/ipc/filesystem-mutations.ts` | File mutation operations |
| Browser IPC | `main/ipc/browser.ts` | Browser management IPC |
| Mobile IPC | `main/ipc/mobile.ts` | Mobile integration IPC |
| Native Chat IPC | `main/ipc/native-chat.ts` | Chat IPC |
| Notifications IPC | `main/ipc/notifications.ts` | Notification IPC |
| Telemetry IPC | `main/ipc/telemetry.ts` | Telemetry IPC |
| Stats IPC | `main/ipc/stats.ts` | Stats IPC |
| Crash Reporting IPC | `main/ipc/crash-reporting.ts` | Crash reporting IPC |
| Diagnostics IPC | `main/ipc/diagnostics.ts` | Diagnostics IPC |
| Speech IPC | `main/ipc/speech.ts` | Speech/voice IPC |
| Skills IPC | `main/ipc/skills.ts` | Skills management IPC |
| Plugins IPC | `main/ipc/plugins.ts` | Plugin management IPC |
| Plugin Marketplaces | `main/ipc/plugin-marketplaces.ts` | Plugin marketplace IPC |
| Automations IPC | `main/ipc/automations.ts` | Automations IPC |
| Jira IPC | `main/ipc/jira.ts` | Jira integration IPC |
| Linear IPC | `main/ipc/linear.ts` | Linear integration IPC |
| GitHub IPC | `main/ipc/github.ts` | GitHub integration IPC |
| GitLab IPC | `main/ipc/gitlab.ts` | GitLab integration IPC |
| Fabrica Profiles | `main/ipc/fabrica-profiles.ts` | Profile management IPC |
| Claude Accounts | `main/ipc/claude-accounts.ts` | Claude account IPC |
| Codex Accounts | `main/ipc/codex-accounts.ts` | Codex account IPC |
| Codex Config Sync | `main/ipc/codex-config-sync.ts` | Codex config sync IPC |
| Grok Accounts | `main/ipc/grok-accounts.ts` | Grok account IPC |
| Keybindings IPC | `main/ipc/keybindings.ts` | Keybinding management |
| SSH Browse | `main/ipc/ssh-browse.ts` | SSH file browsing IPC |
| SSH | `main/ipc/ssh.ts` | SSH management IPC |
| Runtime Environments | `main/ipc/runtime-environments.ts` | Runtime environments IPC |
| Runtime | `main/ipc/runtime.ts` | Runtime management IPC |
| Developer Permissions | `main/ipc/developer-permissions.ts` | Dev permissions IPC |
| Dashboard Popout | `main/ipc/dashboard-popout.ts` | Dashboard popout IPC |
| Rate Limits | `main/ipc/rate-limits.ts` | Rate limit IPC |
| Workspace Ports | `main/ipc/workspace-ports.ts` | Workspace ports IPC |
| Workspace Cleanup | `main/ipc/workspace-cleanup.ts` | Workspace cleanup IPC |
| Markdown Documents | `main/ipc/markdown-documents.ts` | Markdown document IPC |
| Notebook | `main/ipc/notebook.ts` | Notebook IPC |
| Ephemeral VM | `main/ipc/ephemeral-vm.ts` | Ephemeral VM IPC |
| Memory | `main/ipc/memory.ts` | Memory metrics IPC |
| Usage Provider | `main/ipc/usage-provider-handlers.ts` | Usage provider IPC |
| Hosted Review | `main/ipc/hosted-review.ts` | Hosted review IPC |
| Export | `main/ipc/export.ts` | Export IPC |
| Feedback | `main/ipc/feedback.ts` | Feedback IPC |
| Computer Use Permissions | `main/ipc/computer-use-permissions.ts` | Computer use IPC |
| Preflight | `main/ipc/preflight.ts` | Preflight checks IPC |
| Pet | `main/ipc/pet.ts` | Pet mascot IPC |
| Source Control AI | `main/ipc/source-control-ai-linked-issue.ts` | Source control AI IPC |
| Session | `main/ipc/session.ts` | Session management IPC |
| Remote Workspace | `main/ipc/remote-workspace.ts` | Remote workspace IPC |

### B3. Runtime Services (40+ services)
| Service | Path | Description |
|---------|------|-------------|
| FABRICARuntimeService | `main/runtime/fabrica-runtime.ts` | Core runtime |
| FABRICARuntimeRpcServer | `main/runtime/runtime-rpc.ts` | RPC server |
| Orchestration Coordinator | `main/runtime/orchestration/coordinator.ts` | Orchestration |
| Orchestration DB | `main/runtime/orchestration/db.ts` | Orchestration database |
| Orchestration Formatter | `main/runtime/orchestration/formatter.ts` | Message formatting |
| Orchestration Preamble | `main/runtime/orchestration/preamble.ts` | Dispatch preamble |
| Orchestration Groups | `main/runtime/orchestration/groups.ts` | Agent groups |
| Orchestration CLI Command | `main/runtime/orchestration/cli-command.ts` | CLI command bridge |
| Runtime RPC Dispatcher | `main/runtime/rpc/dispatcher.ts` | RPC dispatcher |
| Runtime RPC Schemas | `main/runtime/rpc/schemas.ts` | RPC method schemas |
| Runtime RPC Errors | `main/runtime/rpc/errors.ts` | RPC error types |
| E2EE Channel | `main/runtime/rpc/e2ee-channel.ts` | E2EE channel |
| E2EE Crypto | `main/runtime/rpc/e2ee-crypto.ts` | E2EE crypto operations |
| WS Transport | `main/runtime/rpc/ws-transport.ts` | WebSocket transport |
| Unix Socket Transport | `main/runtime/rpc/unix-socket-transport.ts` | Unix socket transport |
| Relay Transport | `main/runtime/rpc/relay-transport.ts` | Relay transport |
| Mobile E2EE | `main/runtime/rpc/mobile-e2ee-*.ts` | Mobile E2EE operations |
| Mobile Socket Wiring | `main/runtime/rpc/mobile-socket-wiring.ts` | Mobile socket wiring |
| Terminal Multiplex | `main/runtime/rpc/terminal-multiplex*.ts` | Terminal multiplexing |
| Terminal Send | `main/runtime/rpc/terminal-send.ts` | Terminal send operations |
| Static Web Client Handler | `main/runtime/rpc/static-web-client-handler.ts` | Static web client |
| Device Registry | `main/runtime/device-registry.ts` | Device registry |
| E2EE Keypair | `main/runtime/e2ee-keypair.ts` | E2EE keypair management |
| TLS Certificate | `main/runtime/tls-certificate.ts` | TLS certificate |
| Runtime Metadata | `main/runtime/runtime-metadata.ts` | Runtime metadata |
| File Watcher Host | `main/runtime/file-watcher-host.ts` | File watcher host |
| Terminal Query Authority | `main/runtime/terminal-model-query-authority.ts` | Terminal query authority |
| Pairing Endpoint | `main/runtime/pairing-endpoint.ts` | Pairing endpoint |
| Pairing Network Interfaces | `main/runtime/pairing-network-interfaces.ts` | Network interfaces |
| Pairing QR | `main/runtime/mobile-pairing-qr.ts` | QR code generation |
| Pairing Files | `main/runtime/mobile-pairing-files.ts` | Mobile pairing files |
| Mobile Presence Lock | `main/runtime/mobile-presence-lock.ts` | Mobile presence lock |
| Mobile Notification Replay | `main/runtime/mobile-notification-replay.ts` | Notification replay |
| Mobile Subscribe Integration | `main/runtime/mobile-subscribe-integration.ts` | Mobile subscriptions |
| Mobile Session Tabs | `main/runtime/mobile-session-tabs-*.ts` | Mobile session tabs |
| Mobile File Path Search | `main/runtime/runtime-mobile-file-path-search.ts` | Mobile file search |
| Selected Review Branch | `main/runtime/selected-review-branch.ts` | Review branch selection |
| Scrollback Limits | `main/runtime/scrollback-limits.ts` | Scrollback configuration |
| Recent PTY Output Buffer | `main/runtime/recent-pty-output-buffer.ts` | PTY output buffer |
| Terminal View Attribute Store | `main/runtime/terminal-view-attribute-store.ts` | View attributes |
| Runtime Folder Workspace | `main/runtime/runtime-folder-workspace.ts` | Folder workspace |
| Claude Agent Teams Service | `main/runtime/claude-agent-teams-service.ts` | Claude teams |
| Headless Tab Group Split | `main/runtime/headless-tab-group-split-layout.ts` | Headless split layout |
| Headless Terminal Split | `main/runtime/headless-terminal-split-layout.ts` | Headless terminal split |

### B4. Daemon Service (20+ services)
| Service | Path | Description |
|---------|------|-------------|
| Daemon Init | `main/daemon/daemon-init.ts` | Daemon initialization |
| Daemon Main | `main/daemon/daemon-main.ts` | Daemon main process |
| Daemon Server | `main/daemon/daemon-server.ts` | Daemon server |
| Daemon Client | `main/daemon/client.ts` | Daemon client |
| Daemon Spawner | `main/daemon/daemon-spawner.ts` | Daemon process spawner |
| Daemon Health | `main/daemon/daemon-health.ts` | Health check |
| Daemon PTY Adapter | `main/daemon/daemon-pty-adapter.ts` | PTY adapter |
| Daemon PTY Router | `main/daemon/daemon-pty-router.ts` | PTY routing |
| Session | `main/daemon/session.ts` | Session management |
| History Manager | `main/daemon/history-manager.ts` | History management |
| History Reader | `main/daemon/history-reader.ts` | History reader |
| Terminal Host | `main/daemon/terminal-host.ts` | Terminal host management |
| Terminal Snapshot | `main/daemon/terminal-snapshot.ts` | Terminal snapshots |
| Terminal History Log | `main/daemon/terminal-history-log.ts` | History logging |
| Terminal History Session Writer | `main/daemon/terminal-history-session-writer.ts` | Session writer |
| Terminal History Seed | `main/daemon/terminal-history-seed-*.ts` | History seed/transfer |
| Terminal Checkpoint Serializer | `main/daemon/terminal-checkpoint-serializer.ts` | Checkpoint serialization |
| Headless Emulator | `main/daemon/headless-emulator.ts` | Headless terminal emulator |
| NDJSON | `main/daemon/ndjson.ts` | NDJSON transport |
| Degraded Daemon | `main/daemon/degraded-daemon-*.ts` | Degraded daemon fallback |
| Priority Semaphore | `main/daemon/priority-semaphore.ts` | Priority semaphore |
| Stream Data Batcher | `main/daemon/daemon-stream-data-batcher.ts` | Stream data batching |

### B5. Relay Server (15+ services)
| Service | Path | Description |
|---------|------|-------------|
| Desktop Relay Service | `main/runtime/relay/desktop-relay-service.ts` | Desktop relay |
| Relay Session Broker | `main/runtime/relay/relay-session-broker.ts` | Session broker |
| Relay Auth Coordinator | `main/runtime/relay/relay-auth-coordinator.ts` | Auth coordination |
| Relay Control Client | `main/runtime/relay/relay-control-client.ts` | Control client |
| Relay Control Protocol | `main/runtime/relay/relay-control-protocol.ts` | Control protocol |
| Relay HTTP Client | `main/runtime/relay/relay-http-client.ts` | HTTP client |
| Relay Demand Ledger | `main/runtime/relay/relay-demand-ledger.ts` | Demand tracking |
| Relay Host Proof | `main/runtime/relay/relay-host-proof.ts` | Host proof |
| Relay Origin Pool | `main/runtime/relay/relay-origin-pool.ts` | Origin pool |
| Relay Revoke Outbox | `main/runtime/relay/relay-revoke-outbox.ts` | Revoke outbox |
| Supabase Session | `main/runtime/relay/supabase-session.ts` | Supabase session |
| E2EE Desktop Sessions | `main/runtime/relay/mobile-relay-e2ee*.ts` | Mobile E2EE sessions |

### B6. Relay Process (30+ handlers)
| Service | Path | Description |
|---------|------|-------------|
| Relay Entry | `relay/relay.ts` | Relay process entry |
| Relay Dispatcher | `relay/dispatcher.ts` | Message dispatcher |
| Relay Protocol | `relay/protocol.ts` | Relay protocol |
| Relay Handshake | `relay/relay-handshake.ts` | Handshake |
| Relay Frame Decoder | `relay/relay-frame-decoder.ts` | Frame decoder |
| FS Handler | `relay/fs-handler.ts` | Filesystem handler |
| Git Handler | `relay/git-handler.ts` | Git handler |
| PTY Handler | `relay/pty-handler.ts` | PTY handler |
| Workspace Session Handler | `relay/workspace-session-handler.ts` | Session handler |
| AI Vault Handler | `relay/ai-vault-handler.ts` | AI vault handler |
| Agent Exec Handler | `relay/agent-exec-handler.ts` | Agent exec handler |
| Agent Hook Server | `relay/agent-hook-server.ts` | Hook server |
| Port Scan Handler | `relay/port-scan-handler.ts` | Port scan handler |
| Preflight Handler | `relay/preflight-handler.ts` | Preflight handler |
| External Automations Handler | `relay/external-automations-handler.ts` | External automations |
| Plugin Host Call Handler | `relay/plugin-host-call-handler.ts` | Plugin host calls |
| Plugin Overlay | `relay/plugin-overlay.ts` | Plugin overlay |
| Managed Hook Installer | `relay/managed-hook-installer.ts` | Hook installer |
| Relay Diagnostic Log | `relay/relay-diagnostic-log.ts` | Diagnostic logging |
| Rotating Log Writer | `relay/rotating-log-writer.ts` | Rotating log writer |
| Relay Watcher | `relay/relay-watcher-*.ts` | File system watchers |
| SSH PTY Consumer Session | `relay/ssh-pty-consumer-session-adapter.ts` | SSH PTY consumer |
| Subprocess Tree Termination | `relay/subprocess-tree-termination.ts` | Process tree cleanup |
| Remote CLI | `relay/remote-cli-*.ts` | Remote CLI handling |
| Remote Artifact CLI | `relay/remote-artifact-cli-*.ts` | Remote artifact CLI |
| FS Stream Registry | `relay/fs-stream-registry.ts` | FS stream registry |
| Relay Filesystem Watch Registry | `relay/relay-filesystem-watch-registry.ts` | Watch registry |
| Workspace Space Scan | `relay/workspace-space-scan.ts` | Workspace space scan |
| WSL Agent Hook Relay | `relay/wsl-agent-hook-relay.ts` | WSL hook relay |
| WSL Hook FS Bridge | `relay/wsl-hook-fs-bridge.ts` | WSL filesystem bridge |
| WSL Install Plugins Handler | `relay/wsl-install-plugins-handler.ts` | WSL plugin installer |

### B7. Agent Hook Services (15+ agents)
| Service | Path | Description |
|---------|------|-------------|
| Claude Hook Service | `main/claude/hook-service.ts` | Claude hooks |
| Claude Statusline Script | `main/claude/statusline-script.ts` | Claude statusline |
| Codex Hook Service | `main/codex/hook-service.ts` | Codex hooks |
| Codex Config Mirror | `main/codex/codex-config-mirror.ts` | Codex config sync |
| Codex Session Bridge | `main/codex/codex-session-bridge.ts` | Codex session bridge |
| Codex State DB | `main/codex/codex-state-db.ts` | Codex state database |
| Codex App Server Client | `main/codex/codex-app-server-client.ts` | Codex app server |
| Codex Trust Grant Host | `main/codex/codex-trust-grant-host.ts` | Trust grants |
| Codex Trust Config | `main/codex/config-toml-trust.ts` | Config trust |
| Gemini Hook Service | `main/gemini/hook-service.ts` | Gemini hooks |
| Grok Hook Service | `main/grok/hook-service.ts` | Grok hooks |
| OpenCode Hook Service | `main/opencode/hook-service.ts` | OpenCode hooks |
| OpenCode Data Directory | `main/opencode/opencode-data-directory.ts` | OpenCode data dir |
| Hermes Hook Service | `main/hermes/hook-service.ts` | Hermes hooks |
| Copilot Hook Service | `main/copilot/hook-service.ts` | Copilot hooks |
| Devin Hook Service | `main/devin/hook-service.ts` | Devin hooks |
| Kimi Hook Service | `main/kimi/hook-service.ts` | Kimi hooks |
| Mimo Hook Service | `main/mimo/hook-service.ts` | Mimo hooks |
| MiniMax Hook Service | `main/minimax/minimax-cookie-store.ts` | MiniMax cookie store |
| Antigravity Hook Service | `main/antigravity/hook-service.ts` | Antigravity hooks |
| Droid Hook Service | `main/droid/hook-service.ts` | Droid hooks |
| Cursor Hook Service | `main/cursor/hook-service.ts` | Cursor hooks |
| Amp Hook Service | `main/amp/hook-service.ts` | Amp hooks |
| OpenClaude Hook Service | `main/openclaude/hook-service.ts` | OpenClaude hooks |
| Pi Titlebar Extension | `main/pi/titlebar-extension-service.ts` | Pi titlebar extension |

### B8. Skills Service (10+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Skills Discovery | `main/skills/discovery.ts` | Skill discovery engine |
| Skill Bundle Artifacts | `main/skills/skill-bundle-artifacts.ts` | Skill bundle artifacts |
| Skill Freshness Inventory | `main/skills/skill-freshness-inventory.ts` | Freshness tracking |
| Skill Freshness Eligibility | `main/skills/skill-freshness-eligibility.ts` | Eligibility checks |
| Skill Git Tree Identity | `main/skills/skill-git-tree-identity.ts` | Git tree identity |
| Skill Package Identity | `main/skills/skill-package-identity.ts` | Package identity |
| Skill Plugin Cache | `main/skills/skill-plugin-cache-scan.ts` | Plugin cache |
| Skill Update Run | `main/skills/skill-update-run.ts` | Update runner |
| Skill Update Convergence | `main/skills/skill-update-convergence.ts` | Update convergence |
| Skill Installation Topology | `main/skills/skill-installation-topology.ts` | Installation topology |
| Claude Plugin Skill Sources | `main/skills/claude-plugin-skill-sources.ts` | Claude plugin sources |
| Skill Discovery WSL | `main/skills/skill-discovery-wsl.ts` | WSL skill discovery |

### B9. Plugin System (30+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Plugin Service | `main/plugins/plugin-service.ts` | Core plugin service |
| Plugin Supervisor | `main/plugins/plugin-supervisor.ts` | Plugin supervisor |
| Plugin Discovery | `main/plugins/plugin-discovery.ts` | Plugin discovery |
| Plugin Install | `main/plugins/plugin-install.ts` | Plugin installation |
| Plugin Enablement | `main/plugins/plugin-enablement.ts` | Plugin enable/disable |
| Plugin Host Runtime | `main/plugins/plugin-host-runtime.ts` | Host runtime |
| Plugin Host Process | `main/plugins/plugin-host-process.ts` | Host process |
| Plugin Host Methods | `main/plugins/plugin-host-methods.ts` | Host methods |
| Plugin Worker Controller | `main/plugins/plugin-worker-controller.ts` | Worker controller |
| Plugin Worker Manager | `main/plugins/plugin-worker-manager.ts` | Worker manager |
| Plugin Worker Spawn | `main/plugins/plugin-worker-spawn-spec.ts` | Worker spawn spec |
| Plugin Panel Controller | `main/plugins/plugin-panel-controller.ts` | Panel controller |
| Plugin Panel Sessions | `main/plugins/plugin-panel-sessions.ts` | Panel sessions |
| Plugin Command Registry | `main/plugins/plugin-command-registry.ts` | Command registry |
| Plugin Event Bus | `main/plugins/plugin-event-bus.ts` | Event bus |
| Plugin Marketplace Service | `main/plugins/plugin-marketplace-service.ts` | Marketplace service |
| Plugin Marketplace Fetch | `main/plugins/plugin-marketplace-fetch.ts` | Marketplace fetch |
| Plugin Marketplace Installer | `main/plugins/plugin-marketplace-installer.ts` | Marketplace installer |
| Plugin Marketplace Store | `main/plugins/plugin-marketplace-store.ts` | Marketplace store |
| Plugin Content Pack Registry | `main/plugins/plugin-content-pack-registry.ts` | Content pack registry |
| Plugin Language Pack Registry | `main/plugins/plugin-language-pack-registry.ts` | Language pack registry |
| Plugin VM Recipe Registry | `main/plugins/plugin-vm-recipe-registry.ts` | VM recipe registry |
| Plugin Secrets Store | `main/plugins/plugin-secrets-store.ts` | Plugin secrets |
| Plugin Storage Store | `main/plugins/plugin-storage-store.ts` | Plugin storage |
| Plugin Log Buffer | `main/plugins/plugin-log-buffer.ts` | Log buffer |
| Plugin Audit Log | `main/plugins/plugin-audit-log.ts` | Audit logging |
| Plugin Kill List Service | `main/plugins/plugin-kill-list-service.ts` | Kill list service |
| Plugin Content Safety | `main/plugins/plugin-content-safety.ts` | Content safety |
| Plugin Content Integrity | `main/plugins/plugin-content-integrity.ts` | Content integrity |
| Plugin Install Trust | `main/plugins/plugin-install-trust.ts` | Install trust |
| Plugin Dev Watcher | `main/plugins/plugin-dev-watcher.ts` | Dev watcher |
| Plugin Bundled Bootstrap | `main/plugins/plugin-bundled-bootstrap.ts` | Bundled bootstrap |
| Plugin Service Housekeeping | `main/plugins/plugin-service-housekeeping.ts` | Housekeeping |
| Plugin Service Reconciliation | `main/plugins/plugin-service-reconciliation.ts` | Reconciliation |
| Plugin Refresh Settlement | `main/plugins/plugin-refresh-settlement.ts` | Refresh settlement |
| Plugin Startup Budget | `main/plugins/plugin-startup-budget.ts` | Startup budget |

### B10. Git Provider Clients (15+ clients)
| Service | Path | Description |
|---------|------|-------------|
| GitHub Client | `main/github/client.ts` | GitHub API client |
| GitHub Issues | `main/github/issues.ts` | GitHub issues |
| GitHub PR Stack | `main/github/github-pr-stack.ts` | PR stack management |
| GitHub PR Refresh | `main/github/pr-refresh-coordinator.ts` | PR refresh |
| GitHub Conflict Summary | `main/github/conflict-summary.ts` | Conflict detection |
| GitHub Rate Limit | `main/github/rate-limit.ts` | Rate limit management |
| GitHub Project View | `main/github/project-view.ts` | Project view |
| GitLab Client | `main/gitlab/client.ts` | GitLab API client |
| GitLab Issues | `main/gitlab/issues.ts` | GitLab issues |
| GitLab MR Creation | `main/gitlab/merge-request-creation.ts` | MR creation |
| GitLab MR Head Tracking | `main/gitlab/mr-head-tracking-ref.ts` | MR head tracking |
| Linear Client | `main/linear/client.ts` | Linear API client |
| Linear Issues | `main/linear/issues.ts` | Linear issues |
| Linear Issue Context | `main/linear/issue-context.ts` | Issue context |
| Linear Issue Relation Write | `main/linear/issue-relation-write.ts` | Relation mutations |
| Linear MCP Issue List | `main/linear/mcp-issue-list.ts` | MCP issue list |
| Linear Teams | `main/linear/teams.ts` | Linear teams |
| Linear Projects | `main/linear/projects.ts` | Linear projects |
| Jira Client | `main/jira/client.ts` | Jira API client |
| Jira Issues | `main/jira/issues.ts` | Jira issues |
| Jira ADF Markdown | `main/jira/adf-markdown.ts` | ADF/Markdown conversion |
| Jira Attachment Images | `main/jira/attachment-images.ts` | Attachment images |
| Bitbucket Client | `main/bitbucket/client.ts` | Bitbucket API client |
| Azure DevOps Client | `main/azure-devops/client.ts` | Azure DevOps client |
| Azure DevOps PR Creation | `main/azure-devops/pull-request-creation.ts` | PR creation |
| Gitea Client | `main/gitea/client.ts` | Gitea API client |
| Gitea PR Creation | `main/gitea/pull-request-creation.ts` | PR creation |

### B11. Source Control Services (6 modules)
| Service | Path | Description |
|---------|------|-------------|
| Forge Provider | `main/source-control/forge-provider.ts` | Forge provider abstraction |
| Hosted Review | `main/source-control/hosted-review.ts` | Hosted review management |
| Hosted Review Creation | `main/source-control/hosted-review-creation.ts` | Review creation |
| Hosted Review Branch Cache | `main/source-control/hosted-review-branch-cache.ts` | Branch cache |
| Pull Request Linked Issue | `main/source-control/pull-request-linked-issue.ts` | PR linked issues |
| Pull Request Template | `main/source-control/pull-request-template.ts` | PR templates |
| Repo Default Branch | `main/source-control/repo-default-branch.ts` | Default branch detection |

### B12. Git Core Services (15+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Git Runner | `main/git/runner.ts` | Git command runner |
| Git Repo | `main/git/repo.ts` | Repository operations |
| Git Remote | `main/git/remote.ts` | Remote operations |
| Git Status | `main/git/status.ts` | Git status parsing |
| Git History | `main/git/history.ts` | Git history |
| Git Branch Rename | `main/git/branch-rename.ts` | Branch rename |
| Git Worktree | `main/git/worktree.ts` | Worktree operations |
| Git Worktree Shared | `main/git/worktree-shared-directories.ts` | Shared directories |
| Git Worktree Sparse | `main/git/worktree-sparse-checkout.ts` | Sparse checkout |
| Git Checkout | `main/git/checkout.ts` | Checkout operations |
| Git Coalesced Probe | `main/git/coalesced-probe.ts` | Coalesced probes |
| Git Fork Sync | `main/git/fork-sync.ts` | Fork synchronization |
| Git Capability State | `main/git/git-capability-state.ts` | Git capability detection |
| Git Huge Folder Ignore | `main/git/huge-folder-ignore.ts` | Large folder handling |
| Git Porcelain V1 Records | `main/git/porcelain-v1-records.ts` | Porcelain v1 parser |
| Git Remote Ref Probe | `main/git/remote-ref-probe-cache.ts` | Remote ref probe |
| Git Username | `main/git/git-username.ts` | Git username detection |
| Git Fetch Error Classification | `main/git/fetch-error-classification.ts` | Fetch error classification |
| Git Upstream | `main/git/upstream.ts` | Upstream management |

### B13. Computer Use Service (5+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Computer Provider Lifecycle | `main/computer/computer-provider-lifecycle.ts` | Provider lifecycle |
| Desktop Script Provider Bridge | `main/computer/desktop-script-provider-bridge.ts` | Desktop script bridge |
| Desktop Script Provider Client | `main/computer/desktop-script-provider-client.ts` | Provider client |
| Desktop Script Snapshot | `main/computer/desktop-script-snapshot-*.ts` | Desktop snapshots |
| macOS Native Provider | `main/computer/macos-native-provider-*.ts` | macOS provider |
| Sidecar Client | `main/computer/sidecar-client.ts` | Sidecar client |
| Sidecar Entry | `main/computer/sidecar-entry.ts` | Sidecar entry |

### B14. Emulator Services (8+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Emulator Bridge | `main/emulator/emulator-bridge.ts` | Emulator bridge |
| Emulator Session Registry | `main/emulator/emulator-session-registry.ts` | Session registry |
| Emulator Availability | `main/emulator/emulator-availability.ts` | Availability detection |
| Emulator Gesture Sender | `main/emulator/emulator-gesture-sender.ts` | Gesture sending |
| Emulator Probe | `main/emulator/emulator-probe.ts` | Emulator probing |
| MJPEG Frame Parser | `main/emulator/mjpeg-frame-parser.ts` | MJPEG parsing |
| MJPEG Frame Stream | `main/emulator/mjpeg-frame-stream.ts` | MJPEG streaming |
| Scrcpy Video Registry | `main/emulator/scrcpy-video-registry.ts` | Scrcpy video |
| Simctl Simulator Devices | `main/emulator/simctl-simulator-devices.ts` | iOS simulator |
| Serve Sim Execution | `main/emulator/serve-sim-execution.ts` | iOS execution |
| Serve Sim Accessibility Tree | `main/emulator/serve-sim-accessibility-tree.ts` | iOS accessibility |

### B15. SSH Services (25+ modules)
| Service | Path | Description |
|---------|------|-------------|
| SSH Connection Manager | `main/ssh/ssh-connection-manager.ts` | Connection manager |
| SSH Connection Store | `main/ssh/ssh-connection-store.ts` | Connection store |
| SSH Connection | `main/ssh/ssh-connection.ts` | Individual connection |
| SSH Channel Multiplexer | `main/ssh/ssh-channel-multiplexer.ts` | Channel multiplexer |
| SSH Config Parser | `main/ssh/ssh-config-parser.ts` | SSH config parser |
| SSH Config Host Picker | `main/ssh/ssh-config-host-picker.ts` | Host picker |
| SSH Control Socket | `main/ssh/ssh-control-socket.ts` | Control socket |
| SSH Port Forward | `main/ssh/ssh-port-forward.ts` | Port forwarding |
| SSH Port Scanner | `main/ssh/ssh-port-scanner.ts` | Port scanning |
| SSH PTY Consumer Session | `main/ssh/ssh-pty-consumer-session.ts` | PTY consumer |
| SSH Relay Session | `main/ssh/ssh-relay-session.ts` | Relay session |
| SSH Relay Deploy | `main/ssh/ssh-relay-deploy.ts` | Relay deployment |
| SSH Relay Versioned Install | `main/ssh/ssh-relay-versioned-install.ts` | Versioned install |
| SSH Remote Commands | `main/ssh/ssh-remote-commands.ts` | Remote commands |
| SSH Remote Platform Detection | `main/ssh/ssh-remote-platform-detection.ts` | Platform detection |
| SSH Remote Node Resolution | `main/ssh/ssh-remote-node-resolution.ts` | Node resolution |
| SSH Remote Linear CLI | `main/ssh/ssh-remote-linear-cli.ts` | Remote Linear CLI |
| SSH Remote Orchestration | `main/ssh/ssh-remote-orchestration-*.ts` | Remote orchestration |
| SSH Provider Authority | `main/ssh/ssh-provider-authority.ts` | Provider authority |
| SSH Reconnect Ladder | `main/ssh/ssh-reconnect-ladder.ts` | Reconnect logic |
| SSH Reconnect Error Classification | `main/ssh/ssh-reconnect-error-classification.ts` | Error classification |
| SSH SFTP Upload | `main/ssh/sftp-upload.ts` | SFTP upload |
| SSH File Transfer | `main/ssh/system-ssh-file-transfer.ts` | File transfer |
| SSH System Binary | `main/ssh/system-ssh-binary.ts` | System SSH binary |
| SSH System Fallback | `main/ssh/ssh-system-fallback.ts` | System fallback |
| VSCode SSH Authority | `main/ssh/vscode-ssh-authority.ts` | VSCode SSH |

### B16. Browser Services (20+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Browser Manager | `main/browser/browser-manager.ts` | Browser manager |
| Browser Session Registry | `main/browser/browser-session-registry.ts` | Session registry |
| Browser Session Startup | `main/browser/browser-session-startup.ts` | Session startup |
| Browser Backend | `main/browser/browser-backend.ts` | Browser backend |
| Offscreen Browser Backend | `main/browser/offscreen-browser-backend.ts` | Offscreen backend |
| Browser CDP Bridge | `main/browser/cdp-bridge.ts` | CDP bridge |
| Browser CDP WS Proxy | `main/browser/cdp-ws-proxy.ts` | WebSocket proxy |
| Browser CDP Screenshot | `main/browser/cdp-screenshot.ts` | CDP screenshot |
| Browser CDP Print to PDF | `main/browser/cdp-print-to-pdf.ts` | CDP print to PDF |
| Browser Screencast Stream | `main/browser/browser-screencast-stream.ts` | Screencast stream |
| Browser Snapshot Engine | `main/browser/snapshot-engine.ts` | Snapshot engine |
| Browser Grab Payload | `main/browser/browser-grab-payload.ts` | Grab payload |
| Browser Grab Session Controller | `main/browser/browser-grab-session-controller.ts` | Grab controller |
| Browser Cookie Import | `main/browser/browser-cookie-import.ts` | Cookie import |
| Browser Anti Detection | `main/browser/anti-detection.ts` | Anti-detection |
| Browser Certificate Trust | `main/browser/browser-certificate-trust-controller.ts` | Certificate trust |
| Browser Clicked Link Routing | `main/browser/browser-clicked-link-routing.ts` | Link routing |
| Browser Download Destination | `main/browser/browser-download-destination.ts` | Download handling |
| Agent Browser Bridge | `main/browser/agent-browser-bridge.ts` | Agent browser bridge |
| Popup Origin Bar Window | `main/browser/popup-origin-bar-window.ts` | Origin bar popup |
| Chromium Cookie Snapshot | `main/browser/chromium-cookie-snapshot.ts` | Cookie snapshot |
| Electron Debugger Lease | `main/browser/electron-debugger-lease.ts` | Debugger lease |

### B17. Window Management (15+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Create Main Window | `main/window/createMainWindow.ts` | Main window creation |
| Main Window Visibility | `main/window/main-window-visibility.ts` | Window visibility |
| Dashboard Popout Window | `main/window/dashboard-popout-window.ts` | Dashboard popout |
| Focus Existing Window | `main/window/focus-existing-window.ts` | Window focus |
| Window Close Decision | `main/window/window-close-decision.ts` | Close decision |
| Window Bounds Validation | `main/window/window-bounds-validation.ts` | Bounds validation |
| Clipboard IPC Handlers | `main/window/clipboard-ipc-handlers.ts` | Clipboard handlers |
| Clipboard File Copy | `main/window/clipboard-file-copy.ts` | File copy |
| Clipboard Remote File Copy | `main/window/clipboard-remote-file-copy.ts` | Remote file copy |
| Clipboard Runtime Image Upload | `main/window/clipboard-runtime-image-upload.ts` | Image upload |
| Clipboard Windows Image File | `main/window/clipboard-windows-image-file.ts` | Windows image file |
| Editable Context Menu | `main/window/editable-context-menu.ts` | Editable context menu |
| Attach Main Window Services | `main/window/attach-main-window-services.ts` | Service attachment |
| Mobile Markdown Request Relay | `main/window/mobile-markdown-request-relay.ts` | Mobile markdown relay |
| Terminal Tab Close Request Relay | `main/window/terminal-tab-close-request-relay.ts` | Tab close relay |
| Renderer Publication Throttle | `main/window/renderer-publication-throttle.ts` | Publication throttle |
| Privileged Window Navigation | `main/window/privileged-window-navigation.ts` | Privileged navigation |
| History GC Worktree IDs | `main/window/history-gc-worktree-ids.ts` | History GC |
| macOS App Activation | `main/window/macos-app-activation.ts` | macOS activation |
| macOS Tahoe Release | `main/window/macos-tahoe-release.ts` | macOS Tahoe |

### B18. Telemetry & Observability (10+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Telemetry Client | `main/telemetry/client.ts` | Telemetry client |
| Telemetry Consent | `main/telemetry/consent.ts` | Consent management |
| Telemetry Install ID | `main/telemetry/install-id.ts` | Install ID |
| Telemetry Cohort Classifier | `main/telemetry/cohort-classifier.ts` | Cohort classification |
| Telemetry Validator | `main/telemetry/validator.ts` | Telemetry validation |
| Telemetry Burst Cap | `main/telemetry/burst-cap.ts` | Burst cap |
| Telemetry Error Classifier | `main/telemetry/classify-error.ts` | Error classification |
| Observability Index | `main/observability/index.ts` | Observability entry |
| Observability Instrumentation | `main/observability/instrumentation.ts` | OpenTelemetry |
| Observability Bundle | `main/observability/bundle.ts` | Diagnostic bundle |
| Observability Tracer | `main/observability/tracer.ts` | Tracer |
| Observability Local File Sink | `main/observability/local-file-sink.ts` | Local file sink |
| Observability Redactor | `main/observability/redactor.ts` | Data redaction |
| Observability Diagnostic Upload | `main/observability/diagnostic-upload-http.ts` | Diagnostic upload |

### B19. Crash Reporting (6 modules)
| Service | Path | Description |
|---------|------|-------------|
| Crash Report Store | `main/crash-reporting/crash-report-store.ts` | Crash report storage |
| Crash Breadcrumb Store | `main/crash-reporting/crash-breadcrumb-store.ts` | Breadcrumb storage |
| Crash Report Copy Text | `main/crash-reporting/crash-report-copy-text.ts` | Report text export |
| GPU Crash Fallback | `main/crash-reporting/gpu-crash-fallback-decision.ts` | GPU fallback |
| Process Gone Classification | `main/crash-reporting/process-gone-classification.ts` | Process gone |
| Renderer Recovery Circuit Breaker | `main/crash-reporting/renderer-recovery-circuit-breaker.ts` | Recovery circuit breaker |

### B20. Usage Tracking (10+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Claude Usage Store | `main/claude-usage/store.ts` | Claude usage storage |
| Codex Usage Store | `main/codex-usage/store.ts` | Codex usage storage |
| OpenCode Usage Store | `main/opencode-usage/store.ts` | OpenCode usage storage |
| Rate Limits Service | `main/rate-limits/service.ts` | Rate limits service |
| Claude Fetcher | `main/rate-limits/claude-fetcher.ts` | Claude usage fetcher |
| Codex Fetcher | `main/rate-limits/codex-fetcher.ts` | Codex usage fetcher |
| Gemini Usage Fetcher | `main/rate-limits/gemini-usage-fetcher.ts` | Gemini usage fetcher |
| Grok Fetcher | `main/rate-limits/grok-fetcher.ts` | Grok usage fetcher |
| Kimi Fetcher | `main/rate-limits/kimi-fetcher.ts` | Kimi usage fetcher |
| MiniMax Fetcher | `main/rate-limits/minimax-fetcher.ts` | MiniMax usage fetcher |
| OpenCode Go Usage Fetcher | `main/rate-limits/opencode-go-usage-fetcher.ts` | OpenCode usage |
| Stats Collector | `main/stats/collector.ts` | Stats collection |
| Agent Detector | `main/stats/agent-detector.ts` | Agent detection |
| Stats Snapshot Writer | `main/stats/stats-snapshot-writer.ts` | Snapshot writer |

### B21. Memory & Diagnostics (5 modules)
| Service | Path | Description |
|---------|------|-------------|
| Memory Collector | `main/memory/collector.ts` | Memory metrics collection |
| Host Memory | `main/memory/host-memory.ts` | Host memory monitoring |
| Process Memory Metric | `main/memory/process-memory-metric.ts` | Process memory |
| PTY Registry | `main/memory/pty-registry.ts` | PTY registry |
| Main Thread Churn Probe | `main/diagnostics/main-thread-churn-probe.ts` | Thread churn probe |

### B22. SQLite (1 module)
| Service | Path | Description |
|---------|------|-------------|
| Sync Database | `main/sqlite/sync-database.ts` | SQLite sync database |

### B23. Artifacts Cloud (3 modules)
| Service | Path | Description |
|---------|------|-------------|
| Artifact Cloud Service | `main/artifacts/artifact-cloud-service.ts` | Cloud artifact service |
| Artifact Publisher | `main/artifacts/artifact-publisher.ts` | Artifact publishing |
| Artifact Share Record Store | `main/artifacts/artifact-share-record-store.ts` | Share record storage |

### B24. Automations Backend (6 modules)
| Service | Path | Description |
|---------|------|-------------|
| Automation Service | `main/automations/service.ts` | Automation service |
| Automation Headless Dispatch | `main/automations/headless-dispatch.ts` | Headless dispatch |
| Automation Precheck Runner | `main/automations/precheck-runner.ts` | Precheck runner |
| Automation External Manager | `main/automations/external-manager.ts` | External manager |
| Automation Run Target Resolution | `main/automations/run-target-resolution.ts` | Target resolution |
| Hermes Cron Output | `main/automations/hermes-cron-output.ts` | Cron output parser |

### B25. Speech / Voice (8 modules)
| Service | Path | Description |
|---------|------|-------------|
| Speech Runtime Service | `main/speech/speech-runtime-service.ts` | Speech runtime |
| STT Service | `main/speech/stt-service.ts` | Speech-to-text |
| STT Worker | `main/speech/stt-worker.ts` | STT worker process |
| Model Manager | `main/speech/model-manager.ts` | Model management |
| Model Catalog | `main/speech/model-catalog.ts` | Model catalog |
| OpenAI Transcription Client | `main/speech/openai-transcription-client.ts` | OpenAI transcription |
| OpenAI API Key Store | `main/speech/openai-api-key-store.ts` | API key storage |

### B26. CLI (6 modules)
| Service | Path | Description |
|---------|------|-------------|
| CLI Index | `cli/index.ts` | CLI entry point |
| CLI Dispatch | `cli/dispatch.ts` | CLI command dispatch |
| CLI Runtime Client | `cli/runtime-client.ts` | Runtime client |
| CLI Handler Group Manifest | `cli/handler-group-manifest.ts` | Handler manifest |
| CLI Command Spec | `cli/command-spec.ts` | Command specification |
| CLI Registry Parity | `cli/registry-parity.ts` | Registry parity check |

### B27. Platform Services (20+ modules)
| Service | Path | Description |
|---------|------|-------------|
| macOS TCC Prompt Notice | `main/macos-tcc-prompt-notice.ts` | TCC permission notice |
| macOS TCC Prompt Watch | `main/macos-tcc-prompt-watch.ts` | TCC permission watch |
| macOS Full Disk Access | `main/macos-full-disk-access-status.ts` | Full disk access |
| macOS System Sleep Assertion | `main/macos-system-sleep-assertion.ts` | Sleep assertion |
| Linux Lid Sleep Assertion | `main/linux-lid-sleep-assertion.ts` | Lid sleep assertion |
| Linux Package Install | `main/linux-package-install-command.ts` | Package install |
| System Power Lifecycle | `main/system-power-lifecycle.ts` | Power lifecycle |
| System Resume Broadcast | `main/system-resume-broadcast.ts` | Resume broadcast |
| Windows Process Tree Kill | `main/windows-process-tree-kill.ts` | Process tree kill |
| Windows Native Registry | `main/windows-native-registry.ts` | Registry access |
| Windows Win32 Utils | `main/win32-utils.ts` | Win32 utilities |
| Windows PTY Root Identity | `main/windows-pty-root-identity.ts` | PTY root identity |
| WSL | `main/wsl.ts` | WSL management |
| WSL Availability | `main/wsl-availability.ts` | WSL availability |
| WSL Bash Command | `main/wsl-bash-command.ts` | WSL bash command |
| WSL UNC Delete | `main/wsl-unc-delete.ts` | WSL UNC delete |
| WSL Paths | `main/wsl-paths.ts` | WSL path handling |
| WSL Env | `main/wsl-env.ts` | WSL environment |
| Git Bash | `main/git-bash.ts` | Git Bash detection |
| PowerShell OSC133 | `main/powershell-osc133-bootstrap.ts` | PowerShell bootstrap |
| PWsh | `main/pwsh.ts` | PowerShell wrapper |

### B28. Tray & Dock (4 modules)
| Service | Path | Description |
|---------|------|-------------|
| System Tray | `main/tray/system-tray.ts` | System tray icon |
| Tray Attention Icon | `main/tray/tray-attention-icon.ts` | Attention icon |
| Tray Dev Badge | `main/tray/tray-dev-badge.ts` | Dev badge |
| Dock Unread Badge | `main/dock/unread-badge.ts` | Dock unread badge |

### B29. Menu (3 modules)
| Service | Path | Description |
|---------|------|-------------|
| Register App Menu | `main/menu/register-app-menu.ts` | Application menu |
| App Menu Selection Item | `main/menu/app-menu-selection-item.ts` | Menu selection item |
| GPU Acceleration About Panel | `main/menu/gpu-acceleration-about-panel.ts` | GPU acceleration info |

### B30. Worktree Management (8 modules)
| Service | Path | Description |
|---------|------|-------------|
| Worktree Create Base | `main/worktree-create-base.ts` | Base worktree creation |
| Worktree Create Candidates | `main/worktree-create-candidates.ts` | Creation candidates |
| Worktree Lineage Pruning | `main/worktree-lineage-pruning.ts` | Lineage pruning |
| Worktree Removal Safety | `main/worktree-removal-safety.ts` | Removal safety |
| Worktree Removal Authority | `main/worktree-removal-authority.ts` | Removal authority |
| Worktree Root Preparation | `main/worktree-root-preparation.ts` | Root preparation |
| Worktree Trash | `main/worktree-trash.ts` | Trash management |
| Repo Worktrees | `main/repo-worktrees.ts` | Repo worktree management |
| Repo Git Remote Identity | `main/repo-git-remote-identity.ts` | Remote identity |
| Repo Icon Autodetect | `main/repo-icon-autodetect.ts` | Icon detection |

### B31. Local Worktree / Build Services (5 modules)
| Service | Path | Description |
|---------|------|-------------|
| Local Worktree Filesystem | `main/local-worktree-filesystem.ts` | Local filesystem ops |
| Local Worktree Removal Recovery | `main/local-worktree-removal-recovery.ts` | Removal recovery |
| Local Downloaded Folder Promotion | `main/local-downloaded-folder-promotion.ts` | Folder promotion |
| Local Builds Feed Server | `main/local-builds/local-build-feed-server.ts` | Local build feed |
| Local Build Candidate | `main/local-builds/local-build-candidate.ts` | Build candidate |
| Serve Update Handoff | `main/serve-update-handoff.ts` | Update handoff |

### B32. Startup (10+ modules)
| Service | Path | Description |
|---------|------|-------------|
| Configure Process | `main/startup/configure-process.ts` | Process configuration |
| First Window Startup Services | `main/startup/first-window-startup-services.ts` | First window services |
| Startup Diagnostics | `main/startup/startup-diagnostics.ts` | Startup diagnostics |
| Single Instance Lock | `main/startup/single-instance-lock.ts` | Single instance |
| GPU Fallback Switches | `main/startup/gpu-fallback-switches.ts` | GPU fallback |
| Hydrate Shell Path | `main/startup/hydrate-shell-path.ts` | Shell path hydration |
| Window All Closed Quit Policy | `main/startup/window-all-closed-quit-policy.ts` | Quit policy |
| Windows User Data ACL | `main/startup/windows-user-data-acl.ts` | User data ACL |
| WSL CLI Reconciliation Startup | `main/startup/wsl-cli-reconciliation-startup-barrier.ts` | WSL CLI reconciliation |
| Dev Instance Identity | `main/startup/dev-instance-identity.ts` | Dev identity |
| Packaged CLI Entry Redirect | `main/startup/packaged-cli-entry-redirect.ts` | Packaged CLI redirect |
| Serve Desktop Activation | `main/startup/serve-desktop-activation.ts` | Desktop activation |
| Ensure Virtual Display | `main/startup/ensure-virtual-display.ts` | Virtual display |

### B33. CLI Installation (6 modules)
| Service | Path | Description |
|---------|------|-------------|
| CLI Installer | `main/cli/cli-installer.ts` | CLI installer |
| WSL CLI Installer | `main/cli/wsl-cli-installer.ts` | WSL CLI installer |
| WSL CLI Registration | `main/cli/wsl-cli-registration-*.ts` | WSL CLI registration |
| Windows User Path Registry | `main/cli/windows-user-path-registry.ts` | PATH management |
| AppImage CLI Wrapper | `main/cli/appimage-cli-wrapper.ts` | AppImage wrapper |
| Linux Bare Fabrica Dispatcher | `main/cli/linux-bare-fabrica-dispatcher.ts` | Linux dispatcher |

### B34. Fabrica Profiles / Cloud (10 modules)
| Service | Path | Description |
|---------|------|-------------|
| Profile Index Store | `main/fabrica-profiles/profile-index-store.ts` | Profile index |
| Profile Cloud Auth Config | `main/fabrica-profiles/profile-cloud-auth-config.ts` | Cloud auth config |
| Profile Cloud Client | `main/fabrica-profiles/profile-cloud-client.ts` | Cloud client |
| Profile Cloud Service | `main/fabrica-profiles/profile-cloud-service.ts` | Cloud service |
| Profile Cloud PKCE | `main/fabrica-profiles/profile-cloud-pkce.ts` | PKCE auth |
| Profile Cloud Org Members | `main/fabrica-profiles/profile-cloud-org-members-client.ts` | Org members |
| Profile Project Presence | `main/fabrica-profiles/profile-project-presence.ts` | Project presence |
| Profile Project Transfer | `main/fabrica-profiles/profile-project-transfer.ts` | Project transfer |
| Profile Project State | `main/fabrica-profiles/profile-project-state-file.ts` | Project state |
| Profile Storage Paths | `main/fabrica-profiles/profile-storage-paths.ts` | Storage paths |

### B35. Network (3 modules)
| Service | Path | Description |
|---------|------|-------------|
| Proxy Settings | `main/network/proxy-settings.ts` | Proxy configuration |
| macOS System Resolver Health | `main/network/macos-system-resolver-health.ts` | DNS health |
| macOS Tailscale DNS Diagnostic | `main/network/macos-tailscale-dns-diagnostic.ts` | Tailscale DNS |

### B36. Durable File Write (2 modules)
| Service | Path | Description |
|---------|------|-------------|
| Durable File Write | `main/durable-file-write.ts` | Atomic durable writes |
| Rolling File Backup | `main/rolling-file-backup.ts` | Rolling backup |

### B37. Workspace / Space Analysis (3 modules)
| Service | Path | Description |
|---------|------|-------------|
| Workspace Space Analysis | `main/workspace-space-analysis.ts` | Disk space analysis |
| Workspace Space Compact | `src/shared/workspace-space-compaction.ts` | Space compaction |
| Workspace Cleanup | `main/ipc/workspace-cleanup.ts` | Workspace cleanup |

---

## C. Shared Services (150+ modules in `src/shared/`)

| Category | Count | Modules |
|----------|-------|---------|
| Agent Types & Detection | 15+ | agent-detection, agent-kind, agent-session-option-catalog, agent-session-option-launch, agent-hook-listener, agent-hook-relay, agent-hook-status-cache, agent-status-types, agent-status-osc, agent-tab-title, agent-prompt-injection, agent-tui-command-typing, agent-scratch-worktrees |
| AI Vault Types | 5+ | ai-vault-types, ai-vault-resume-*.ts |
| Automation Types | 5+ | automations-types, automation-schedules, automation-run-identity, automation-run-retention |
| Browser | 3+ | browser-url, browser-cookie-import-sources, browser-viewport-presets |
| Git | 10+ | git-history, git-history-graph, git-status-porcelain-parser, git-branch-cleanup, git-branch-compare-head, git-push-target-validation |
| GitHub/GitLab | 5+ | github-pr-auto-merge-availability, github-pr-merge-methods, github-project-identity, github-repository-identity-key |
| Terminal | 10+ | terminal-bell-detector, terminal-color-scheme-protocol, terminal-custom-themes, terminal-fonts, terminal-kitty-keyboard-mode-tracker, terminal-output-side-effects, terminal-scrollback-policy, terminal-stream-protocol, terminal-view-attributes |
| Workspace | 5+ | workspace-name, workspace-statuses, workspace-session-schema, workspace-linked-item |
| Worktree | 5+ | worktree-id, worktree-ownership, worktree-card-properties |
| E2EE/Security | 5+ | e2ee-crypto, mobile-e2ee-v2-*.ts |
| Orchestration | 3+ | orchestration-rpc-contract, orchestration-task-display |
| Native Chat | 3+ | native-chat-types, native-chat-slash-commands, native-chat-session-options |
| Claude/Codex | 5+ | claude-subagent-roster, claude-model-list-probe, claude-statusline-rate-limits, codex-auth-errors, codex-pet-sprite-defaults, codex-subagent-roster |
| Computer Use | 2+ | computer-use-error-recovery, computer-use-permissions-types |
| Fabrica | 3+ | fabrica-yaml, fabrica-profiles, feature-interactions |
| Mobile | 3+ | mobile-relay-pairing-offer, mobile-relay-phone-protocol, pairing |
| Other | 30+ | types, constants, agent-detection, keybindings, mcp-config, protocol-compat, pty-consumer-session, pull-request-generation, rate-limit-types, release-channel, remote-runtime-client, relay-frame-decoder, relay-frame-buffer, relay-version-marker, review-steps, setup-script-imports, setup-script-telemetry, source-control-ai, source-control-ai-actions, source-control-ai-types, ssh-types, top-level-view, tui-agent-config, tui-agent-permissions, tui-agent-selection, tui-agent-startup, ui-language, ui-locale, ui-zoom-level, updater-renderer-events, vscode-remote-ssh-launcher |

---

## D. Renderer Runtime (60+ client modules in `src/renderer/src/runtime/`)

| Service | Path | Description |
|---------|------|-------------|
| Web Runtime Session | `runtime/web-runtime-session.ts` | Web runtime session |
| Sync Runtime Graph | `runtime/sync-runtime-graph.ts` | Runtime graph sync |
| Runtime RPC Client | `runtime/runtime-rpc-client.ts` | Renderer RPC client |
| Runtime Git Client | `runtime/runtime-git-client.ts` | Renderer git client |
| Runtime File Client | `runtime/runtime-file-client.ts` | Renderer file client |
| Runtime Hooks Client | `runtime/runtime-hooks-client.ts` | Renderer hooks client |
| Runtime Jira Client | `runtime/runtime-jira-client.ts` | Renderer Jira client |
| Runtime Linear Client | `runtime/runtime-linear-client.ts` | Renderer Linear client |
| Runtime Skills Client | `runtime/runtime-skills-client.ts` | Renderer skills client |
| Runtime Repo Client | `runtime/runtime-repo-client.ts` | Renderer repo client |
| Runtime Provider Accounts Client | `runtime/runtime-provider-accounts-client.ts` | Renderer accounts client |
| Runtime Terminal Stream | `runtime/runtime-terminal-stream.ts` | Terminal stream |
| Runtime Terminal Inspection | `runtime/runtime-terminal-inspection.ts` | Terminal inspection |
| Runtime Server Directory Browser | `runtime/runtime-server-directory-browser.ts` | Directory browser |
| Runtime Client Events | `runtime/runtime-client-events.ts` | Client events |
| Remote Server Update Coordinator | `runtime/remote-server-update-coordinator.ts` | Update coordinator |
| Mobile Markdown Bridge | `runtime/mobile-markdown-bridge.ts` | Mobile markdown bridge |
| Web Session Tabs Sync | `runtime/web-session-tabs-sync.ts` | Session tabs sync |
| Web Terminal Surface | `runtime/web-terminal-surface-id.ts` | Terminal surface |
| Worktree Create Base | `runtime/worktree-create-base.ts` | Worktree creation |

---

## E. Mobile Companion (`src/mobile/`)

| Service | Path | Description |
|---------|------|-------------|
| Mobile Relay Service | `src/mobile/` | Mobile companion app (React Native) |

---

## F. Configuration Files

| File | Path | Description |
|------|------|-------------|
| Fabrica Config | `config/` | Build configuration |
| Fabrica YAML | `fabrica.yaml` | Fabrica YAML config |
| Electron Vite Config | `electron.vite.config.ts` | Build config |
| Vite Web Config | `vite.web.config.ts` | Web build config |
| Components JSON | `components.json` | Shadcn/UI config |
| pnpm Workspaces | `pnpm-workspace.yaml` | Monorepo config |

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
| **SSH Services** | ~25+ |
| **Browser Services** | ~20+ |
| **Total estimated files** | ~3,500+ |

---

> **Next Step:** Map similar features from mission-control and buzz to each Fabrica component.
