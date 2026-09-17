# Buzz — Desktop App (Tauri 2 + React 19)

> Source: `_sources/buzz/desktop/`
> Commit: `8868787`

## Overview

The Buzz desktop app is built with Tauri 2 (Rust + webview) and React 19. It's the primary end-user interface for Buzz — a native-feeling chat/agent client that runs on macOS, Linux, and Windows.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Shell** | Tauri 2 (Rust + WebView2/wkwebview/WebKitGTK) |
| **Frontend** | React 19, Vite 8, TypeScript 6, Tailwind CSS 4 |
| **State** | TanStack React Query, TanStack React Router |
| **UI** | Radix UI primitives, Lucide icons, TipTap editor, emoji-mart |
| **Testing** | Playwright (smoke + integration), Vitest, node:test |
| **Linting** | Biome |

## Version
`0.5.20` (per `package.json`)

## Dependencies (40+)
- `@tanstack/react-query`, `@tanstack/react-router`
- `@radix-ui/*` (dialog, dropdown-menu, popover, tooltip, etc.)
- `lucide-react`, `emoji-mart`, `@tiptap/react`
- `nostr-tools`, `nostr-fetch`
- `clsx`, `tailwind-merge`, `class-variance-authority`
- `react-hook-form`, `zod`

## Key Files

| File | Purpose |
|------|---------|
| `package.json` (111 lines) | Version 0.5.20, deps, scripts |
| `src/main.tsx` | App entry point, provider hierarchy |
| `src/app/` | App shell, community key, zoom shortcuts |
| `src/features/` | 30 feature modules |
| `src/shared/` | Shared hooks, components, constants |
| `src-tauri/Cargo.toml` (159 lines) | Tauri Rust crate (buzz-desktop), 70+ deps |
| `src-tauri/src/` (78 files) | Native backend |
| `src-tauri/crates/buzz-terminal/` | Native terminal implementation |
| `playwright.config.ts` | E2E test config |
| `tailwind.config.js` | Custom Tailwind tokens |
| `biome.json` | Desktop-specific lint config |

## Feature Modules (30)

Located in `desktop/src/features/`:

| Feature | Purpose |
|---------|---------|
| `agent-memory/` | Agent memory/context |
| `agents/` | Agent directory and management |
| `channel-templates/` | Channel template system |
| `channels/` | Channel list, creation, management |
| `chat/` | Message composition, display |
| `communities/` | Community switching, init |
| `community-members/` | Member list, roles |
| `custom-emoji/` | Custom emoji support |
| `forum/` | Forum thread UI |
| `gifs/` | GIF search and display |
| `home/` | Home feed |
| `huddle/` | Voice huddle (Opus audio) |
| `identity-archive/` | Key backup/restore |
| `local-archive/` | Local event archive |
| `mesh-compute/` | Shared compute features |
| `messages/` | Message rendering, threading |
| `moderation/` | Moderation tools |
| `notifications/` | Push notifications |
| `onboarding/` | First-run onboarding |
| `presence/` | Online/away status |
| `profile/` | User profile |
| `projects/` | Project management |
| `pulse/` | Activity pulse |
| `reminders/` | Reminder system |
| `search/` | Full-text search |
| `settings/` | App settings |
| `sidebar/` | Sidebar navigation |
| `terminal/` | Integrated terminal |
| `user-status/` | User status |
| `workflows/` | Workflow management |

## Tauri Backend (78 source files in `src-tauri/src/`)

Key native modules:
- `relay.rs` — relay WebSocket client
- `native_relay_client.rs` — native implementation
- `event_sync.rs` — event sync from relay
- `identity_storage.rs` — key storage
- `key_backup.rs` — key backup/restore
- `huddle/` — voice huddle (Opus encode/decode)
- `managed_agents/` — local agent management
- `migration.rs` — data migration
- `mesh_llm/` — mesh LLM (shared compute)
- `terminal_runtime.rs` — integrated terminal
- `deep_link.rs` — `nostr:` URI handler
- `tray_menu.rs` — system tray
- `secret_store.rs` — OS keyring integration
- `app_state.rs` — app state management
- `commands/` — IPC command handlers

## Tauri Plugins Used

- `tauri-plugin-deep-link` — `nostr:` URI handling
- `tauri-plugin-notification` — OS notifications
- `tauri-plugin-updater` — auto-updates
- `tauri-plugin-process` — process management
- `tauri-plugin-dialog` — native dialogs
- `tauri-plugin-global-shortcut` — keyboard shortcuts
- `tauri-plugin-window-state` — window state persistence

## Native Crates

- `keyring` — OS keyring (macOS Keychain, Windows Credential Vault, Linux Secret Service)
- `opus` — Opus audio codec
- `neteq` — NetEQ jitter buffer
- `sherpa-onnx` — on-device ML
- `arboard` — clipboard (Wayland support)
- `iroh` — P2P transport (mesh)
- `portable-pty` — terminal (PTY allocation)

## Architecture Pattern

```
┌─────────────────────────────────────────┐
│  React 19 (webview)                     │
│  ┌─────────────────────────────────┐    │
│  │ Features (channels, chat, etc.) │    │
│  └─────────────────────────────────┘    │
│  TanStack Query ↕ Tauri IPC             │
└────────────┬────────────────────────────┘
             │ Tauri commands
┌────────────▼────────────────────────────┐
│  Rust backend (Tauri)                   │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Relay    │ │ Identity │ │ Huddle  │ │
│  │ client   │ │ storage  │ │ (Opus)  │ │
│  └──────────┘ └──────────┘ └─────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Keyring  │ │ Terminal │ │ Migrate │ │
│  └──────────┘ └──────────┘ └─────────┘ │
└─────────────────────────────────────────┘
```

## Notable Capabilities

1. **Multi-community** — switch between Buzz communities without re-auth
2. **Voice huddles** — in-app voice chat with Opus codec, no external SFU
3. **Integrated terminal** — PTY-backed terminal in the app
4. **Mesh compute** — optional iroh-based shared compute
5. **Auto-updates** — Tauri updater with signed releases
6. **OS keyring** — secrets stored in OS keychain
7. **Deep links** — `nostr:` URI handler for cross-app navigation
8. **Tray menu** — system tray with quick actions
9. **Onboarding** — first-run flow with identity creation
10. **Identity archive** — backup/restore Nostr identity

## Scan Coverage

- `package.json` (111 lines) read
- `src/main.tsx` read
- `src/features/` 30 directories enumerated
- `src-tauri/Cargo.toml` (159 lines) read
- `src-tauri/src/` 78 files enumerated by module
- `playwright.config.ts` read
- `tailwind.config.js` read
- `biome.json` read
- **Not deeply read:** individual feature implementations, Tauri command handlers
