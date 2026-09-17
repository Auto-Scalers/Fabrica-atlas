# Buzz — Mobile, Web, Admin (Flutter + React clients)

> Source: `_sources/buzz/mobile/`, `_sources/buzz/web/`, `_sources/buzz/admin-web/`
> Commit: `8868787`

## Overview

Buzz ships three client applications in addition to the desktop app:
- **Mobile** (Flutter) — iOS + Android
- **Web** (React) — browser-based invite/repo browser
- **Admin** (React) — moderation dashboard

---

## mobile/ — Flutter Mobile App

**Location:** `_sources/buzz/mobile/`

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Flutter (Dart SDK ^3.11.4) |
| **State** | Riverpod + flutter_hooks (HookConsumerWidget) |
| **Networking** | web_socket_channel, http, nostr package |
| **Storage** | flutter_secure_storage, shared_preferences |
| **Media** | camera, image_picker, video_player, just_audio, record |
| **UI** | lucide_icons_flutter, gpt_markdown, flutter_svg |
| **Auth** | local_auth, mobile_scanner (QR codes) |

### Key Files

| File | Purpose |
|------|---------|
| `pubspec.yaml` (80 lines) | Dependencies, assets, fonts |
| `lib/main.dart` | App entry point |
| `lib/app.dart` | App widget |
| `lib/features/` | 10 feature modules |
| `lib/shared/` | Shared code, Nostr models, theme |
| `README.md` | Mobile setup guide |
| `HUDDLES.md` | Voice huddle documentation |
| `ios/` | iOS platform code |
| `android/` | Android platform code |

### Features (10 modules in `lib/features/`)

| Feature | Purpose |
|---------|---------|
| `activity/` | Activity feed |
| `channels/` | Channel list and chat |
| `forum/` | Forum threads |
| `home/` | Home screen |
| `invites/` | Invite system |
| `pairing/` | Device pairing (NIP-AB) |
| `profile/` | User profile |
| `pulse/` | Activity pulse |
| `search/` | Search |
| `settings/` | Settings |

### Capabilities
- Real-time channel chat
- Voice huddle (Opus, see HUDDLES.md)
- QR code pairing (NIP-AB device pairing)
- Push notifications (NIP-PL)
- Local auth (biometric)
- Camera + image picker
- Video player
- Audio recording
- Secure storage for Nostr keys

---

## web/ — Browser Web Client

**Location:** `_sources/buzz/web/`

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 |
| **Build** | Vite 8 |
| **Language** | TypeScript 6 |
| **Styling** | Tailwind CSS 4 |
| **Git** | isomorphic-git + lightning-fs (in-browser git) |
| **Nostr** | nostr-tools |
| **Testing** | Playwright |

### Key Files

| File | Purpose |
|------|---------|
| `package.json` (54 lines) | Version 0.1.0 |
| `src/main.tsx` | Entry point |
| `src/app/` | App shell |
| `src/features/invite/` | Invite landing page |
| `src/features/repos/` | Repository browser |
| `src/shared/` | Shared components |
| `vite.config.ts` | Vite config |

### Features
- **Invite landing page** — accept community invites via URL
- **Repository browser** — view git repos hosted on Buzz relays
- **In-browser git** — clone, browse, read files without server-side git

### Use Case
A lightweight client for users who don't want to install the desktop app. Can view repos and accept invites, but full chat/huddle features require the desktop app.

---

## admin-web/ — Admin Dashboard

**Location:** `_sources/buzz/admin-web/`

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 |
| **Build** | Vite 8 |
| **Language** | TypeScript 6 |
| **Testing** | Vitest, Playwright |
| **Styling** | Minimal (no Radix, no Tailwind) |

### Key Files

| File | Purpose |
|------|---------|
| `package.json` (32 lines) | Version 0.1.0 |
| `src/App.tsx` | Main app component |
| `src/api.ts` | API client |
| `src/types.ts` | TypeScript types |
| `src/useResource.ts` | Resource hook |

### Purpose
Moderation surface — allows relay operators to:
- View flagged content
- Ban users
- Delete messages/channels
- Manage operator roster
- Review audit log

### Auth
NIP-98 HTTP auth (signed request). Only operators with the `admin` scope can access.

---

## Cross-Client Patterns

All three clients share:
- **Nostr identity model** — same keypair works across all clients
- **Event-driven sync** — clients connect to relay via WebSocket, sync events
- **NIP-42 auth** — challenge-response on connect
- **Offline-first** — local event archive (`local-archive/` on desktop, `flutter_secure_storage` on mobile)

---

## Scan Coverage

- `mobile/pubspec.yaml` (80 lines) read
- `mobile/lib/main.dart` read
- `mobile/lib/features/` 10 directories enumerated
- `web/package.json` (54 lines) read
- `web/src/features/` 2 directories enumerated
- `admin-web/package.json` (32 lines) read
- `admin-web/src/` enumerated
- **Not deeply read:** individual feature implementations, mobile platform-specific code, admin moderation UI
