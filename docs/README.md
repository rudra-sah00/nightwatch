# Nightwatch Frontend Documentation

Technical documentation for the Nightwatch frontend: one Next.js 16 application shipping to web, Electron desktop, Capacitor iOS/Android, and Android TV.

## How this folder is organized

The layout mirrors `src/`, so the docs for a piece of code are where you would expect that code to be:

| Docs path | Mirrors | Contains |
|-----------|---------|----------|
| `docs/architecture/` | cross-cutting `src/` concerns | Layering, API layer, state, styling, i18n, testing |
| `docs/platforms/` | `src/platforms/` | Desktop, mobile, and TV shells |
| `docs/features/<name>/` | `src/features/<name>/` | One folder per feature, same name |
| `docs/SETUP.md`, `docs/CONTRIBUTING.md` | repo root | Getting started and conventions |

Every doc opens with a one-line summary and a **`Source:`** line naming the code it documents. If you change that code, update the doc in the same PR.

## Start here

- [SETUP.md](./SETUP.md) — prerequisites, environment variables, running locally
- [CONTRIBUTING.md](./CONTRIBUTING.md) — lint rules, state-management conventions, commit format, release process
- [architecture/OVERVIEW.md](./architecture/OVERVIEW.md) — route guard, route groups, feature slicing, native bridges, player compound components, service worker

## Architecture

| Doc | Covers |
|-----|--------|
| [architecture/OVERVIEW.md](./architecture/OVERVIEW.md) | Application layering end to end, including `src/proxy.ts` and the platform layers |
| [architecture/API_LAYER.md](./architecture/API_LAYER.md) | `apiFetch`, proactive token refresh, CSRF, the transports in use, and why there are no Server Actions |
| [architecture/STATE_MANAGEMENT.md](./architecture/STATE_MANAGEMENT.md) | TanStack Query vs Zustand vs Context vs `useReducer`, and the ref pattern for real-time listeners |
| [architecture/UI_GUIDELINES.md](./architecture/UI_GUIDELINES.md) | Tailwind v4 CSS-native theme, `neo-*` tokens, dark-mode palette remap, `cva` variants |
| [architecture/GLOBAL_UI.md](./architecture/GLOBAL_UI.md) | Root layout composition, app chrome, shared hooks, onboarding tour, error boundaries, SEO surface |
| [architecture/ANALYTICS.md](./architecture/ANALYTICS.md) | Firebase Analytics, Crashlytics, consent gating, event catalogue, push notifications |
| [architecture/I18N.md](./architecture/I18N.md) | 14 locales, 8 namespaces, cookie detection, RTL, adding a language |
| [architecture/TESTING.md](./architecture/TESTING.md) | Vitest and Playwright layout, coverage thresholds, the shared CI quality gate |

## Platforms

| Doc | Covers |
|-----|--------|
| [platforms/DESKTOP.md](./platforms/DESKTOP.md) | Electron shell, preload bridge, tray, Discord Rich Presence, media keys, auto-update |
| [platforms/MOBILE.md](./platforms/MOBILE.md) | Capacitor setup, 21 native plugins, `mobileBridge`, `MobileShell`, dev workflow |
| [platforms/SMART_TV.md](./platforms/SMART_TV.md) | Android TV build, spatial navigation, D-pad player, QR login, overscan |

## Features

Each folder documents the `src/features/` directory of the same name.

### Playback

| Doc | Covers |
|-----|--------|
| [features/watch/](./features/watch/README.md) | VOD engine, `hls.js`/`dash.js`, compound player components, progress sync |
| [features/watch-party/](./features/watch-party/README.md) | Synchronized playback over Agora RTM, lobby, chat, interactions |
| [features/watch-party/LIVE_TV.md](./features/watch-party/LIVE_TV.md) | Watching a live channel together, and blocked-autoplay recovery |
| [features/watch-party/THEATRE_3D.md](./features/watch-party/THEATRE_3D.md) | Opt-in 3D auditorium — R3F scene, Rapier movement, avatar sync |
| [features/livestream/](./features/livestream/README.md) | IPTV channel browse, categories, and stream resolution |
| [features/clips/](./features/clips/README.md) | Server-side clip recording, sharing, and the Library page |

### Discovery

| Doc | Covers |
|-----|--------|
| [features/hub/](./features/hub/README.md) | Destination grid and landing surface (replaces the old explore feature) |
| [features/search/](./features/search/README.md) | URL-param driven search, facets, infinite scroll |
| [features/watchlist/](./features/watchlist/README.md) | Optimistic add/remove with TanStack Query |

### Media libraries

| Doc | Covers |
|-----|--------|
| [features/music/](./features/music/README.md) | AudioEngine, queue, synced lyrics, crossfade, equalizer, device transfer |
| [features/music-discover/](./features/music-discover/README.md) | Swipe discovery feed with audio previews |
| [features/manga/](./features/manga/README.md) | Reader, favourites, reading progress, TV support |
| [features/games/](./features/games/README.md) | Embedded HTML5 game catalogue and in-app player |
| [features/games/PATCHING.md](./features/games/PATCHING.md) | Patching third-party game bundles for embedded use |
| [features/games/DEPLOYMENT.md](./features/games/DEPLOYMENT.md) | Building and shipping game assets |

### Account and social

| Doc | Covers |
|-----|--------|
| [features/auth/](./features/auth/README.md) | Cookie sessions, OTP, QR login, anti-bot, route protection |
| [features/auth/GOOGLE_OAUTH.md](./features/auth/GOOGLE_OAUTH.md) | Google Sign-In for web redirect and native iOS/Android |
| [features/profile/](./features/profile/README.md) | Profile edits, security, active devices, preferences |
| [features/friends/](./features/friends/README.md) | Friend graph, presence, Agora RTC voice calls, media ducking |

### Other

| Doc | Covers |
|-----|--------|
| [features/ask-ai/](./features/ask-ai/README.md) | Voice-to-voice assistant, audio pipeline, barge-in, music ducking |
| [features/remote-control/](./features/remote-control/README.md) | Mobile-to-desktop playback control over Socket.IO |

---

Backend services and database administration live in the separate `nightwatch-backend` and `admin-nightwatch` repositories.
