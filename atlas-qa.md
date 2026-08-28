# Atlas QA — Fabrica-App Component Inventory

> _Source: `Fabrica-app/src/` — ~3,500+ TypeScript/TSX source files_
> _Organized by functional groups for decision-making._
> _For each group: decide KEEP / ENHANCE / REPLACE / SKIP_

---

## Group 1: Core Experience

> _The main things you see and interact with every day._

### 1.1 App Shell & Layout
| Component | Path | What It Does |
|-----------|------|-------------|
| App | `renderer/src/App.tsx` | Root component, app shell |
| Sidebar | `renderer/src/components/Sidebar.tsx` | Left sidebar (projects, worktrees, kanban) |
| RightSidebar | `renderer/src/components/right-sidebar/` | Right sidebar (source control, checks, file explorer) |
| StatusBar | `renderer/src/components/status-bar/StatusBar.tsx` | Bottom status bar |
| TabBar | `renderer/src/components/tab-bar/TabBar.tsx` | Tab strip |
| TabGroupSplitLayout | `renderer/src/components/tab-group/TabGroupSplitLayout.tsx` | Split-pane layout |
| TabGroupPanel | `renderer/src/components/tab-group/TabGroupPanel.tsx` | Individual panel |
| Landing | `renderer/src/components/Landing.tsx` | Landing/startup page |
| ZoomOverlay | `renderer/src/components/ZoomOverlay.tsx` | Zoom indicator |

**Decision:** _pending_

### 1.2 Terminal (20+ components)
| Component | Path | What It Does |
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

**Decision:** _pending_

### 1.3 Native Chat / AI Chat (15+ components)
| Component | Path | What It Does |
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

**Decision:** _pending_

### 1.4 Editor (40+ components)
| Component | Path | What It Does |
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

**Decision:** _pending_

### 1.5 Dashboard (8 components)
| Component | Path | What It Does |
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

**Decision:** _pending_

### 1.6 Activity / History
| Component | Path | What It Does |
|-----------|------|-------------|
| ActivityPrototypePage | `activity/ActivityPrototypePage.tsx` | Activity page |
| ActivityTitlebarControls | `activity/ActivityTitlebarControls.tsx` | Activity titlebar |

**Decision:** _pending_

---

## Group 2: Project Management

> _Managing work, tasks, and progress._

### 2.1 Worktrees / Code Workspaces (25+ components)
| Component | Path | What It Does |
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
| WorkspaceKanbanDrawer | `sidebar/WorkspaceKanbanDrawer.tsx` | Kanban board drawer |
| WorkspaceKanbanCard | `sidebar/WorkspaceKanbanCard.tsx` | Kanban card |
| WorkspaceKanbanLaneGrid | `sidebar/WorkspaceKanbanLaneGrid.tsx` | Kanban lane grid |
| WorkspaceKanbanStatusLane | `sidebar/WorkspaceKanbanStatusLane.tsx` | Status lane |
| WorkspaceKanbanSearchField | `sidebar/WorkspaceKanbanSearchField.tsx` | Kanban search |
| WorkspaceKanbanSettingsMenu | `sidebar/WorkspaceKanbanSettingsMenu.tsx` | Kanban settings |
| NewWorkspaceComposerCard | `NewWorkspaceComposerCard.tsx` | Workspace composer card |
| NewWorkspaceComposerModal | `NewWorkspaceComposerModal.tsx` | Workspace composer modal |
| WorktreeJumpPalette | `WorktreeJumpPalette.tsx` | Worktree jump palette |
| WorktreeBaseFallbackDialog | `WorktreeBaseFallbackDialog.tsx` | Base fallback dialog |

**Decision:** _pending_

### 2.2 Tasks / Work Items (10+ components)
| Component | Path | What It Does |
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

**Decision:** _pending_

### 2.3 Automations (15+ components)
| Component | Path | What It Does |
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

**Decision:** _pending_

---

## Group 3: Source Control

> _Git operations, PRs, reviews, file management._

### 3.1 Source Control Sidebar (30+ components)
| Component | Path | What It Does |
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
| BulkActionBar | `right-sidebar/BulkActionBar.tsx` | Bulk action bar |
| CreateHostedReviewComposer | `right-sidebar/CreateHostedReviewComposer.tsx` | PR/review composer |
| HostedReviewActions | `right-sidebar/HostedReviewActions.tsx` | Review action buttons |
| HostedReviewStateActions | `right-sidebar/HostedReviewStateActions.tsx` | Review state actions |
| GitHubPRStackMap | `right-sidebar/GitHubPRStackMap.tsx` | PR stack visualization |
| FolderWorkspacePrChecksPanel | `right-sidebar/FolderWorkspacePrChecksPanel.tsx` | Folder workspace checks |
| FolderWorkspaceWorktreesPanel | `right-sidebar/FolderWorkspaceWorktreesPanel.tsx` | Folder workspace worktrees |

**Decision:** _pending_

### 3.2 GitHub / GitLab (15+ components)
| Component | Path | What It Does |
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

**Decision:** _pending_

---

## Group 4: Agent Operations

> _Running, monitoring, and controlling AI agents._

### 4.1 AI Vault / Session History (8 components)
| Component | Path | What It Does |
|-----------|------|-------------|
| AiVaultPanel | `right-sidebar/AiVaultPanel.tsx` | AI vault (session history) |
| AiVaultPanelControls | `right-sidebar/AiVaultPanelControls.tsx` | AI vault controls |
| AiVaultPanelHeader | `right-sidebar/AiVaultPanelHeader.tsx` | AI vault header |
| AiVaultSessionRow | `right-sidebar/AiVaultSessionRow.tsx` | AI vault session row |
| AiVaultSessionDetails | `right-sidebar/AiVaultSessionDetails.tsx` | Session details |
| AiVaultSessionVirtualList | `right-sidebar/AiVaultSessionVirtualList.tsx` | Virtual session list |
| AiVaultSessionSubagents | `right-sidebar/AiVaultSessionSubagents.tsx` | Sub-agent display |
| AiVaultScanIssueBanners | `right-sidebar/AiVaultScanIssueBanners.tsx` | Scan issue banners |

**Decision:** _pending_

### 4.2 Skills (5 components)
| Component | Path | What It Does |
|-----------|------|-------------|
| SkillsPage | `skills/SkillsPage.tsx` | Skills page |
| SkillCard | `skills/SkillCard.tsx` | Skill card |
| SkillUpdateRow | `skills/SkillUpdateRow.tsx` | Update row |
| SkillFreshnessNudge | `skills/SkillFreshnessNudge.tsx` | Freshness nudge |
| SkillFreshnessStatusPill | `skills/SkillFreshnessStatusPill.tsx` | Status pill |
| SkillFreshnessUpdateDialog | `skills/SkillFreshnessUpdateDialog.tsx` | Update dialog |

**Decision:** _pending_

### 4.3 Artifacts (7 components)
| Component | Path | What It Does |
|-----------|------|-------------|
| ArtifactsPage | `artifacts/ArtifactsPage.tsx` | Artifacts page |
| ArtifactListPane | `artifacts/ArtifactListPane.tsx` | Artifact list |
| ArtifactCollection | `artifacts/ArtifactCollection.tsx` | Artifact collection |
| ArtifactPreview | `artifacts/ArtifactPreview.tsx` | Artifact preview |
| ArtifactDetailHeader | `artifacts/ArtifactDetailHeader.tsx` | Detail header |
| ArtifactActions | `artifacts/ArtifactActions.tsx` | Artifact actions |
| ArtifactPublishButton | `artifacts/ArtifactPublishButton.tsx` | Publish button |
| ArtifactPublishedLinkPanel | `artifacts/ArtifactPublishedLinkPanel.tsx` | Published link |

**Decision:** _pending_

---

## Group 5: External Integrations

> _Connecting to the outside world: browser, mobile, SSH, emulators._

### 5.1 Browser Pane (10+ components)
| Component | Path | What It Does |
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

**Decision:** _pending_

### 5.2 Emulator Pane (4 components)
| Component | Path | What It Does |
|-----------|------|-------------|
| EmulatorPane | `emulator-pane/EmulatorPane.tsx` | Emulator pane |
| EmulatorPaneOverlayLayer | `emulator-pane/EmulatorPaneOverlayLayer.tsx` | Emulator overlay layer |
| MobileEmulatorAgentSetupGuide | `emulator-pane/MobileEmulatorAgentSetupGuide.tsx` | Agent setup guide |
| MobileEmulatorTabIntroCallout | `emulator-pane/MobileEmulatorTabIntroCallout.tsx` | Tab intro callout |

**Decision:** _pending_

### 5.3 Mobile (10+ components)
| Component | Path | What It Does |
|-----------|------|-------------|
| MobilePage | `mobile/MobilePage.tsx` | Mobile page |
| MobileHero | `mobile/MobileHero.tsx` | Mobile hero section |
| MobileHeroIntro | `mobile/MobileHeroIntro.tsx` | Mobile intro |
| MobileHeroPairedDevices | `mobile/MobileHeroPairedDevices.tsx` | Paired devices |
| MobileHeroPairingStep | `mobile/MobileHeroPairingStep.tsx` | Pairing step |
| PhoneCarousel | `mobile/PhoneCarousel.tsx` | Phone carousel |
| NetworkInterfacePicker | `mobile/NetworkInterfacePicker.tsx` | Network interface picker |
| WindowsFirewallNotice | `mobile/WindowsFirewallNotice.tsx` | Firewall notice |

**Decision:** _pending_

### 5.4 Plugin System (5 components)
| Component | Path | What It Does |
|-----------|------|-------------|
| PluginPanel | `right-sidebar/PluginPanel.tsx` | Plugin panel |
| PluginCatalogLayout | `plugin-catalog/PluginCatalogLayout.tsx` | Plugin catalog layout |
| PluginCatalogAvatar | `plugin-catalog/PluginCatalogAvatar.tsx` | Plugin avatar |
| PluginCatalogEmptyState | `plugin-catalog/PluginCatalogEmptyState.tsx` | Empty state |
| PluginMarketplaceBrowser | `settings/PluginMarketplaceBrowser.tsx` | Plugin marketplace |

**Decision:** _pending_

---

## Group 6: Usage & Stats

> _Tracking usage, costs, and performance._

### 6.1 Usage / Stats (15+ components)
| Component | Path | What It Does |
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

**Decision:** _pending_

---

## Group 7: Settings

> _App configuration and preferences._

### 7.1 Settings Dialog (50+ components)
| Component | Path | What It Does |
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

**Decision:** _pending_

### 7.2 Onboarding / Feature Wall (15+ components)
| Component | Path | What It Does |
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
| SetupGuideModal | `setup-guide/SetupGuideModal.tsx` | Setup guide modal |
| SetupGuideProgressRing | `setup-guide/SetupGuideProgressRing.tsx` | Setup progress ring |

**Decision:** _pending_

### 7.3 Status Bar Segments (12 components)
| Component | Path | What It Does |
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

**Decision:** _pending_

### 7.4 Other UI (20+ components)
| Component | Path | What It Does |
|-----------|------|-------------|
| PetOverlay | `pet/PetOverlay.tsx` | Pet mascot overlay |
| QuickOpen | `QuickOpen.tsx` | Quick open palette |
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
| WorkspacePortScanner | `ports/WorkspacePortScanner.tsx` | Port scanner |

**Decision:** _pending_

---

## Group 8: Backend Infrastructure

> _What runs under the hood: runtime, daemon, relay, orchestration._

### 8.1 Core Runtime (40+ modules)
| Service | Path | What It Does |
|---------|------|-------------|
| FABRICARuntimeService | `main/runtime/fabrica-runtime.ts` | Core runtime |
| FABRICARuntimeRpcServer | `main/runtime/runtime-rpc.ts` | RPC server |
| Orchestration Coordinator | `main/runtime/orchestration/coordinator.ts` | Orchestration |
| Orchestration DB | `main/runtime/orchestration/db.ts` | Orchestration database |
| Orchestration Formatter | `main/runtime/orchestration/formatter.ts` | Message formatting |
| Orchestration Preamble | `main/runtime/orchestration/preamble.ts` | Dispatch preamble |
| Orchestration Groups | `main/runtime/orchestration/groups.ts` | Agent groups |
| Runtime RPC Dispatcher | `main/runtime/rpc/dispatcher.ts` | RPC dispatcher |
| Runtime RPC Schemas | `main/runtime/rpc/schemas.ts` | RPC method schemas |
| E2EE Channel | `main/runtime/rpc/e2ee-channel.ts` | E2EE channel |
| WS Transport | `main/runtime/rpc/ws-transport.ts` | WebSocket transport |
| Terminal Multiplex | `main/runtime/rpc/terminal-multiplex*.ts` | Terminal multiplexing |
| Device Registry | `main/runtime/device-registry.ts` | Device registry |
| Runtime Folder Workspace | `main/runtime/runtime-folder-workspace.ts` | Folder workspace |

**Decision:** _pending_

### 8.2 Daemon Service (20+ modules)
| Service | Path | What It Does |
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

**Decision:** _pending_

### 8.3 Relay Server (15+ modules)
| Service | Path | What It Does |
|---------|------|-------------|
| Desktop Relay Service | `main/runtime/relay/desktop-relay-service.ts` | Desktop relay |
| Relay Session Broker | `main/runtime/relay/relay-session-broker.ts` | Session broker |
| Relay Auth Coordinator | `main/runtime/relay/relay-auth-coordinator.ts` | Auth coordination |
| Relay Control Client | `main/runtime/relay/relay-control-client.ts` | Control client |
| Supabase Session | `main/runtime/relay/supabase-session.ts` | Supabase session |

**Decision:** _pending_

### 8.4 Relay Process (30+ handlers)
| Service | Path | What It Does |
|---------|------|-------------|
| Relay Entry | `relay/relay.ts` | Relay process entry |
| Relay Dispatcher | `relay/dispatcher.ts` | Message dispatcher |
| FS Handler | `relay/fs-handler.ts` | Filesystem handler |
| Git Handler | `relay/git-handler.ts` | Git handler |
| PTY Handler | `relay/pty-handler.ts` | PTY handler |
| AI Vault Handler | `relay/ai-vault-handler.ts` | AI vault handler |
| Agent Exec Handler | `relay/agent-exec-handler.ts` | Agent exec handler |
| Plugin Host Call Handler | `relay/plugin-host-call-handler.ts` | Plugin host calls |

**Decision:** _pending_

### 8.5 Agent Hook Services (15+ agents)
| Service | Path | What It Does |
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
| OpenClaude Hook Service | `main/openclaude/hook-service.ts` | OpenClaude hooks |
| Mimo Hook Service | `main/mimo/hook-service.ts` | Mimo hooks |
| Antigravity Hook Service | `main/antigravity/hook-service.ts` | Antigravity hooks |
| Droid Hook Service | `main/droid/hook-service.ts` | Droid hooks |

**Decision:** _pending_

### 8.6 Plugin System Backend (30+ modules)
| Service | Path | What It Does |
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

**Decision:** _pending_

### 8.7 SSH Backend (25+ modules)
| Service | Path | What It Does |
|---------|------|-------------|
| SSH Connection Manager | `main/ssh/ssh-connection-manager.ts` | Connection manager |
| SSH Channel Multiplexer | `main/ssh/ssh-channel-multiplexer.ts` | Channel multiplexer |
| SSH Config Parser | `main/ssh/ssh-config-parser.ts` | SSH config parser |
| SSH Port Forward | `main/ssh/ssh-port-forward.ts` | Port forwarding |
| SSH Relay Deploy | `main/ssh/ssh-relay-deploy.ts` | Relay deployment |
| SSH Reconnect Ladder | `main/ssh/ssh-reconnect-ladder.ts` | Reconnect logic |

**Decision:** _pending_

### 8.8 Browser Backend (20+ modules)
| Service | Path | What It Does |
|---------|------|-------------|
| Browser Manager | `main/browser/browser-manager.ts` | Browser manager |
| Browser Session Registry | `main/browser/browser-session-registry.ts` | Session registry |
| Browser CDP Bridge | `main/browser/cdp-bridge.ts` | CDP bridge |
| Browser CDP WS Proxy | `main/browser/cdp-ws-proxy.ts` | WebSocket proxy |
| Browser Snapshot Engine | `main/browser/snapshot-engine.ts` | Snapshot engine |
| Browser Cookie Import | `main/browser/browser-cookie-import.ts` | Cookie import |
| Browser Anti Detection | `main/browser/anti-detection.ts` | Anti-detection |

**Decision:** _pending_

### 8.9 Git Provider Clients (15+ modules)
| Service | Path | What It Does |
|---------|------|-------------|
| GitHub Client | `main/github/client.ts` | GitHub API client |
| GitHub Issues | `main/github/issues.ts` | GitHub issues |
| GitHub PR Stack | `main/github/github-pr-stack.ts` | PR stack management |
| GitLab Client | `main/gitlab/client.ts` | GitLab API client |
| Linear Client | `main/linear/client.ts` | Linear API client |
| Jira Client | `main/jira/client.ts` | Jira API client |
| Bitbucket Client | `main/bitbucket/client.ts` | Bitbucket API client |
| Azure DevOps Client | `main/azure-devops/client.ts` | Azure DevOps client |

**Decision:** _pending_

### 8.10 Git Core (15+ modules)
| Service | Path | What It Does |
|---------|------|-------------|
| Git Runner | `main/git/runner.ts` | Git command runner |
| Git Repo | `main/git/repo.ts` | Repository operations |
| Git Status | `main/git/status.ts` | Git status parsing |
| Git History | `main/git/history.ts` | Git history |
| Git Worktree | `main/git/worktree.ts` | Worktree operations |

**Decision:** _pending_

---

## Group 9: Platform Services

> _Cross-cutting concerns: persistence, telemetry, updates, platform-specific._

### 9.1 Core App Services (6 modules)
| Service | Path | What It Does |
|---------|------|-------------|
| Main Entry | `main/index.ts` | App lifecycle, service wiring |
| Persistence (Store) | `main/persistence.ts` | Central state persistence |
| Protected Secret Persistence | `main/protected-secret-persistence.ts` | Protected secrets |
| Hooks | `main/hooks.ts` | Git hooks runner |
| Pty | `main/pty/` | Shell environment, terminal spawning |
| Updater | `main/updater.ts` | Auto-update system |

**Decision:** _pending_

### 9.2 IPC Handlers (40+ modules)
| Service | Path | What It Does |
|---------|------|-------------|
| App IPC | `main/ipc/app.ts` | App-level IPC |
| Settings IPC | `main/ipc/settings.ts` | Settings IPC |
| Shell IPC | `main/ipc/shell.ts` | Shell commands IPC |
| Repos IPC | `main/ipc/repos.ts` | Repository management IPC |
| Pty IPC | `main/ipc/pty.ts` | PTY management IPC |
| Filesystem IPC | `main/ipc/filesystem.ts` | Filesystem operations IPC |
| Browser IPC | `main/ipc/browser.ts` | Browser management IPC |
| Mobile IPC | `main/ipc/mobile.ts` | Mobile integration IPC |
| Native Chat IPC | `main/ipc/native-chat.ts` | Chat IPC |
| Skills IPC | `main/ipc/skills.ts` | Skills management IPC |
| Plugins IPC | `main/ipc/plugins.ts` | Plugin management IPC |
| Automations IPC | `main/ipc/automations.ts` | Automations IPC |
| SSH IPC | `main/ipc/ssh.ts` | SSH management IPC |
| Runtime IPC | `main/ipc/runtime.ts` | Runtime management IPC |
| Session IPC | `main/ipc/session.ts` | Session management IPC |

**Decision:** _pending_

### 9.3 Telemetry & Observability (10+ modules)
| Service | Path | What It Does |
|---------|------|-------------|
| Telemetry Client | `main/telemetry/client.ts` | Telemetry client |
| Telemetry Consent | `main/telemetry/consent.ts` | Consent management |
| Observability Instrumentation | `main/observability/instrumentation.ts` | OpenTelemetry |
| Observability Bundle | `main/observability/bundle.ts` | Diagnostic bundle |

**Decision:** _pending_

### 9.4 Usage Tracking Backend (10+ modules)
| Service | Path | What It Does |
|---------|------|-------------|
| Claude Usage Store | `main/claude-usage/store.ts` | Claude usage storage |
| Codex Usage Store | `main/codex-usage/store.ts` | Codex usage storage |
| Rate Limits Service | `main/rate-limits/service.ts` | Rate limits service |
| Stats Collector | `main/stats/collector.ts` | Stats collection |

**Decision:** _pending_

### 9.5 Platform Services (20+ modules)
| Service | Path | What It Does |
|---------|------|-------------|
| System Tray | `main/tray/system-tray.ts` | System tray icon |
| Dock Unread Badge | `main/dock/unread-badge.ts` | Dock unread badge |
| Register App Menu | `main/menu/register-app-menu.ts` | Application menu |
| WSL | `main/wsl.ts` | WSL management |
| Windows Process Tree Kill | `main/windows-process-tree-kill.ts` | Process tree kill |
| macOS System Sleep Assertion | `main/macos-system-sleep-assertion.ts` | Sleep assertion |

**Decision:** _pending_

### 9.6 Shared Types (150+ modules)
| Category | What It Does |
|----------|-------------|
| Agent Types & Detection | Agent detection, status, hooks, relay |
| AI Vault Types | Vault types and resume logic |
| Automation Types | Automation types, schedules, retention |
| Git | History, graph, status parsing |
| GitHub/GitLab | PR merge, project identity |
| Terminal | Fonts, themes, stream protocol, scrollback |
| Workspace | Names, statuses, session schema |
| Worktree | IDs, ownership, card properties |
| E2EE/Security | Crypto, mobile E2EE |
| Orchestration | RPC contract, task display |
| Native Chat | Types, slash commands, session options |

**Decision:** _pending_

### 9.7 Renderer Runtime (60+ modules)
| Service | Path | What It Does |
|---------|------|-------------|
| Runtime RPC Client | `runtime/runtime-rpc-client.ts` | Renderer RPC client |
| Runtime Git Client | `runtime/runtime-git-client.ts` | Renderer git client |
| Runtime File Client | `runtime/runtime-file-client.ts` | Renderer file client |
| Runtime Hooks Client | `runtime/runtime-hooks-client.ts` | Renderer hooks client |
| Runtime Terminal Stream | `runtime/runtime-terminal-stream.ts` | Terminal stream |
| Runtime Client Events | `runtime/runtime-client-events.ts` | Client events |

**Decision:** _pending_

---

## Summary

| Group | Components | Decision |
|-------|-----------|----------|
| 1. Core Experience | ~90+ | _pending_ |
| 2. Project Management | ~50+ | _pending_ |
| 3. Source Control | ~50+ | _pending_ |
| 4. Agent Operations | ~20+ | _pending_ |
| 5. External Integrations | ~30+ | _pending_ |
| 6. Usage & Stats | ~15+ | _pending_ |
| 7. Settings | ~80+ | _pending_ |
| 8. Backend Infrastructure | ~200+ | _pending_ |
| 9. Platform Services | ~250+ | _pending_ |
| **Total** | **~3,500+** | |

---

> **Next Step:** For each group, decide KEEP / ENHANCE / REPLACE / SKIP. Then map MC/buzz features.
