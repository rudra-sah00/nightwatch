# Architecture Overview

How the Nightwatch frontend is structured: one Next.js application that ships to the web, an Electron desktop shell, Capacitor mobile apps, and Android TV, sharing a single `src/` tree.

**Source:** `src/app/`, `src/features/`, `src/platforms/`, `src/lib/`, `src/proxy.ts`

Nightwatch is a **single package**, not a multi-package monorepo. A `pnpm-workspace.yaml` exists (`packages: [.]`) but only to carry dependency `overrides`, `patchedDependencies`, and build-script allowlists, which pnpm 10 no longer reads from `package.json`. Platform variation is handled inside `src/platforms/`, not by separate workspace packages.

## High-Level Tech Stack

*   **Framework**: Next.js 16 (App Router, React Server Components). **No Server Actions** — every mutation goes through `apiFetch` against the Node.js backend. See [API_LAYER.md](./API_LAYER.md).
*   **Language**: TypeScript in strict mode (typed IPC channels, API responses, and React props).
*   **Styling**: Tailwind CSS v4, CSS-native `@theme` configuration, softened neo-brutalist theme. See [UI_GUIDELINES.md](./UI_GUIDELINES.md).
*   **Server State**: TanStack Query (client-side caching, background revalidation, optimistic updates).
*   **Client State**: Zustand — two persisted stores (`src/store/use-auth-store.ts`, `src/features/music/store/use-music-store.ts`) plus a small non-persisted theatre view-mode store. The video player uses `useReducer`, not Zustand.
*   **Real-time Infrastructure**: Agora RTM (watch-party signalling and chat), Agora RTC (WebRTC video/voice), and Socket.IO (`src/lib/socket.ts`) — actively used for presence, friends, voice-call signalling, music device sync, remote control, watch progress, and as the watch party's backup transport (`watch-party:relay`) when Agora RTM is down.
*   **Video Engine**: `hls.js` and `dash.js` behind a shared engine abstraction, with dynamic manifest swapping.
*   **Native Bridges**: `desktopBridge` (`src/lib/electron-bridge.ts`) and `mobileBridge` (`src/lib/mobile-bridge.ts`), both no-ops off-platform.
*   **Quality Config**: `biome.json` (lint + format, replacing ESLint/Prettier), Vitest (unit/component), Playwright (E2E).

---

## 0. Route Guard (`src/proxy.ts`)

Next.js 16 renamed the `middleware` convention to `proxy`, so the server-side guard lives in `src/proxy.ts` and exports a default `proxy` function.

It performs an **optimistic** check only: it reads the durable `refreshToken` cookie and never calls the backend, because the guard runs on every matched request including prefetches. Real authorization stays in the backend, which validates every `/api` call.

*   **Deny by default.** Everything is protected unless listed in `PUBLIC_PATHS` (`/`, `/continue`, `/privacy`, `/terms`) or matched by `PUBLIC_PREFIXES` (`/auth/`, `/clip/share/`, `/user/`, `/watch-party/`). A newly added route is guarded automatically.
*   **Destination preservation.** Unauthenticated requests redirect to `/continue?from=<path>`; `ContinueClient` re-validates that value before navigating.
*   **Signed-in users** hitting `/continue` are redirected to `/home` — unless the URL carries `signedOut`, which the sign-out path appends. The session cookie is HttpOnly, so only the backend can clear it; if that request fails the cookie outlives the sign-out and this redirect would otherwise make the login page unreachable.
*   **Matcher** `['/((?!api|_next|.*\\.[\\w]+$).*)']` skips `/api`, Next internals, and any path with a file extension, which keeps `sw.js`, `firebase-messaging-sw.js`, `manifest.json`, and `public/` assets reachable while signed out — both the service worker and PWA install require this.

`accessToken` is deliberately not the signal: it expires every 15 minutes, so its absence does not mean the user is signed out.

---

## 1. The Route Grouping Paradigm

The entry point of the app lives in `src/app/`, where React Server Components determine authentication layouts gracefully before reaching the client boundaries.

We strategically compartmentalize routes using parenthesis:
*   `app/(public)/`: Landing pages, SEO-focused indexing maps, and unauthenticated feature showcases. No auth middleware blocking occurs here.
*   `app/(protected)/`: The core dashboard, Discover maps, user profiles, and VOD watch streams (`/watch/:id`). This enforces the user has hit the `AuthProvider`.
*   `app/(party)/`: The extremely complex layout dedicated solely to real-time WebRTC connections, bypassing generic navigation sidebars to prevent accidental unmounts of the Agora connection container (`src/features/watch-party/`).

---

## 2. Feature-Sliced Design (`src/features/`)

Generic primitives live in `src/components/ui/`; business logic lives in `src/features/<domain>/`. Each feature owns its own `api.ts`, `hooks/`, `components/`, and `types.ts`.

**`docs/features/<name>/` mirrors `src/features/<name>/` one-for-one.** The 16 features are:

| Feature | Documentation | Notes |
|---------|---------------|-------|
| `ask-ai/` | [../features/ask-ai/README.md](../features/ask-ai/README.md) | Voice-to-voice assistant, audio capture/playback pipeline |
| `auth/` | [../features/auth/README.md](../features/auth/README.md) | Sign-in/up, OTP, QR login, Google OAuth |
| `clips/` | [../features/clips/README.md](../features/clips/README.md) | Server-side clip recording |
| `friends/` | [../features/friends/README.md](../features/friends/README.md) | Presence, friend graph, Agora RTC voice calls |
| `games/` | [../features/games/README.md](../features/games/README.md) | Embedded HTML5 games |
| `hub/` | [../features/hub/README.md](../features/hub/README.md) | Destination grid / landing surface |
| `livestream/` | [../features/livestream/README.md](../features/livestream/README.md) | IPTV channel browse and resolve |
| `manga/` | [../features/manga/README.md](../features/manga/README.md) | Reader, favourites, progress |
| `music/` | [../features/music/README.md](../features/music/README.md) | AudioEngine, queue, lyrics, device transfer |
| `music-discover/` | [../features/music-discover/README.md](../features/music-discover/README.md) | Swipe discovery feed |
| `profile/` | [../features/profile/README.md](../features/profile/README.md) | Profile, security, devices, preferences |
| `remote-control/` | [../features/remote-control/README.md](../features/remote-control/README.md) | Mobile-to-desktop playback control |
| `search/` | [../features/search/README.md](../features/search/README.md) | URL-param driven search and facets |
| `watch/` | [../features/watch/README.md](../features/watch/README.md) | VOD engine and the player compound components |
| `watch-party/` | [../features/watch-party/README.md](../features/watch-party/README.md) | Largest domain; see breakdown below |
| `watchlist/` | [../features/watchlist/README.md](../features/watchlist/README.md) | Optimistic add/remove |

There is no `src/features/explore/` — the hub feature replaced it, and `ExploreHub` now lives in `src/features/hub/components/`.

`watch-party/` is the largest domain and is internally sliced further:

*   **`chat/`**: Messaging hooks and overlays over the party transport (Agora RTM, with the Socket.IO relay as backup).
*   **`components/`**: Room UI, participant tiles, overlays.
*   **`hooks/`**: Shared UI state — fullscreen detection, media controls, floating tiles.
*   **`interactions/`**: `useGestureDetection.ts` (camera hand tracking), `useSoundboard.ts`, `SketchContext.tsx` (drawing over the video).
*   **`media/`**: `useAgora.ts` / `useAgoraRtm.ts` — React hooks wrapping the SDK connection lifecycles, plus audio ducking and presence.
*   **`room/`**: Member tracking, permission sync (`useWatchPartyMembers.ts`, `usePredictiveSync.ts`, `useWatchPartySync.ts`), lobby approvals.
*   **`theatre/`**: Opt-in 3D auditorium (React Three Fiber + Rapier) — see [../features/watch-party/THEATRE_3D.md](../features/watch-party/THEATRE_3D.md).

---

## 3. The `src/lib/` Utilities Layer

*   **`fetch.ts`:** The `apiFetch` wrapper with proactive token refresh, CSRF header injection, a refresh mutex, configurable retries, and abort handling that distinguishes user aborts from timeouts. See [API_LAYER.md](./API_LAYER.md).
*   **`env.ts`:** Validated environment configuration. Throws at startup if `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_WS_URL`, or `NEXT_PUBLIC_AGORA_APP_ID` are missing. Values are read as literal property lookups because Next.js cannot inline `process.env[key]`.
*   **`socket.ts`:** Singleton Socket.IO client. Tracks force logouts and active connections.
*   **`electron-bridge.ts` / `mobile-bridge.ts`:** Native bridges (see §5 and §6).
*   **`storage-cache.ts`:** In-memory cache over `localStorage` reads, initialized lazily via `initStorageCache()` to avoid SSR side effects.
*   **`linkify.ts`:** URL parsing for chat messages. Uses separate global/non-global regexes to avoid `lastIndex` mutation bugs.
*   **`analytics.ts` / `analytics-events.ts` / `analytics-consent.ts`:** Firebase Analytics wrapper, typed event catalogue, and consent gating.
*   **`firebase.ts`:** Firebase app init for **Analytics and Cloud Messaging only**. There is no Firestore usage anywhere in this codebase.
*   **`haptics.ts`, `device-id.ts`, `cookies.ts`, `auth.ts`, `music-presence-lock.ts`, `crash-context.ts`, `constants.ts`, `utils.ts`:** Small focused helpers.

Provider components are not in `src/lib/` — they live in `src/providers/` (`query-provider.tsx`, `auth-provider.tsx`, `socket-provider.tsx`, `theme-provider.tsx`, `intl-provider.tsx`). `QueryProvider` initializes TanStack Query's `QueryClient` with a 5-minute `staleTime`; see [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md).

---

## 4. Desktop Detection (`src/platforms/desktop/use-desktop-app.ts`)

Rather than scattering `typeof window !== 'undefined' && window.electronAPI` checks through the UI, OS detection funnels through `useDesktopApp()`.

The web build also contains fallbacks for the `nightwatch://` custom protocol: when a deep link is attempted and `document.hidden` never flips, a timeout concludes the desktop app is not installed and surfaces a toast offering the download instead. The desktop-exclusive capabilities themselves are reached through `src/lib/electron-bridge.ts`.

---

## 5. Desktop Platform Layer (Electron)

The desktop app wraps the Next.js frontend in an Electron shell with a preload script that exposes `window.electronAPI`. The frontend communicates with the main process exclusively through `src/lib/electron-bridge.ts`, which provides a safe no-op fallback when running outside Electron.

### Bridge Pattern

```ts
import { desktopBridge, checkIsDesktop } from '@/lib/electron-bridge';

if (checkIsDesktop()) {
  desktopBridge.updateDiscordPresence(activity);
}
```

### Desktop-Exclusive Features

| Feature | Bridge Method | Description |
|---------|--------------|-------------|
| Discord Rich Presence | `updateDiscordPresence()` / `clearDiscordPresence()` | Shows current activity in Discord |
| System Tray | (main process) | Background presence with unread badge |
| Media Keys | `onMediaCommand(cb)` | Play/pause/next/prev from keyboard |
| Window Controls | `windowMinimize()` / `windowMaximize()` / `windowClose()` | Frameless window management |
| Native Theme | `setNativeTheme(theme)` | Sync OS dark/light mode |
| Notifications | `showNotification({ title, body })` | OS-native notifications |
| Fullscreen | `toggleFullscreen()` / `onFullscreenChanged(cb)` | Native fullscreen toggle |
| Keep Awake | `setKeepAwake(keep)` | Prevent sleep during playback |
| Unread Badge | `setUnreadBadge(count)` | macOS Dock badge |
| Run on Boot | `setRunOnBoot(enabled)` | Auto-start on login |
| Key-Value Store | `storeGet()` / `storeSet()` / `storeDelete()` | Persistent preferences |
| Call State | `setCallActive(active)` | OS-level audio ducking during calls |

### Detection

```ts
// Module-level constant (evaluated once)
export const isDesktop = typeof window !== 'undefined' && 'electronAPI' in window;

// Runtime check (re-evaluates each call)
export function checkIsDesktop(): boolean { ... }
```

---

## 6. Mobile Platform Layer (Capacitor)

The mobile app wraps the deployed Next.js app in a native WebView via Capacitor, with 21 native plugins providing device API access (24 `@capacitor*`/vendor packages in `package.json`, of which `@capacitor/core`, `@capacitor/ios` and `@capacitor/android` are the runtime, not plugins). The frontend communicates through `src/lib/mobile-bridge.ts`, which mirrors the `desktopBridge` pattern.

### Bridge Pattern

```ts
import { mobileBridge, isMobileNative } from '@/lib/mobile-bridge';

if (isMobileNative) {
  mobileBridge.hapticImpact('medium');
}
```

### Mobile-Exclusive Features

| Feature | Plugin | Description |
|---------|--------|-------------|
| Haptic Feedback | `@capacitor/haptics` | Impact, notification, vibration |
| Status Bar | `@capacitor/status-bar` | Theme-synced dark/light style |
| CallKit (iOS) | `@capgo/capacitor-incoming-call-kit` | Native incoming call UI |
| Phone Notification (Android) | `@anuradev/capacitor-phone-call-notification` | Call-in-progress notification |
| Native Share | `@capacitor/share` | OS share sheet |
| Screen Orientation | `@capacitor/screen-orientation` | Lock landscape for video |
| Keep Awake | `@capacitor-community/keep-awake` | Prevent sleep during playback |
| Network Detection | `@capacitor/network` | Online/offline toast notifications |
| App Badge | `@capawesome/capacitor-badge` | Unread count on app icon |

### Global Lifecycle

`MobileShell` (mounted once in root layout) handles status bar theming, Android back button, network detection, and keyboard management. See [../platforms/MOBILE.md](../platforms/MOBILE.md) for full details.

### Detection

```ts
// Module-level constant
export const isMobile = window.Capacitor?.isNativePlatform?.() === true;

// Runtime check
export function checkIsMobile(): boolean { ... }

// React hook (viewport OR native)
const isMobile = useIsMobile(); // true if <768px OR Capacitor native
```

---

## 7. Player Compound Component Pattern

The video player uses a **compound component** architecture where a root provider exposes shared state to composable child components via React Context.

### Structure

```
src/features/watch/player/ui/compound/
├── PlayerRoot.tsx                  # Provider + engine init + state management
├── PlayerVideo.tsx                 # <video> element with event bindings
├── PlayerControls.tsx              # Bottom control bar container
├── PlayerHeader.tsx                # Top bar (title, back button, right slot)
├── PlayerPlayPause.tsx             # Central play/pause button
├── PlayerSeekBar.tsx               # Desktop seek bar with sprite thumbnails
├── PlayerMobileSeekBar.tsx         # Mobile-optimized seek bar
├── PlayerVolume.tsx                # Volume slider (desktop)
├── PlayerTimeDisplay.tsx           # Current time / duration
├── PlayerSkipButtons.tsx           # ±10s skip buttons
├── PlayerFullscreen.tsx            # Fullscreen toggle
├── PlayerCastButton.tsx            # Chromecast sender (see useChromecast)
├── PlayerLiveBadge.tsx             # "LIVE" indicator with edge-to-live seek
├── PlayerSettingsMenu.tsx          # Quality, speed, subtitle settings
├── PlayerAudioSubtitleSelectors.tsx # Audio track + subtitle track pickers
├── PlayerEpisodePanel.tsx          # Series episode list panel
├── SubtitleOverlay.tsx             # WebVTT subtitle renderer
└── hooks/
    ├── use-player-root.ts          # Core hook: engine init, state machine, progress
    ├── use-subtitle-overlay.ts     # WebVTT parsing + cue timing
    ├── use-player-audio-subtitle-selectors.ts # Track enumeration
    └── use-player-live-badge.ts    # Live edge detection
```

Sibling directories under `src/features/watch/player/` hold the rest of the engine: `context/` (`PlayerContext.tsx` and its reducer types), `hooks/` (`useHls.ts`, `useDash.ts`, `usePlayerEngine.ts`, `useChromecast.ts`, speed-boost hooks), `ui/controls/`, `ui/overlays/` (`DebugOverlay.tsx`, `SpeedBoostIndicator.tsx`), `services/`, and `utils/format-time.ts`.

### Composition Pattern

```tsx
<PlayerRoot streamUrl={url} metadata={metadata} subtitleTracks={tracks}>
  <PlayerVideo />
  <SubtitleOverlay />
  <PlayerHeader title={title}>
    <RecordButton />  {/* Right slot — clips integration */}
  </PlayerHeader>
  <PlayerControls>
    <PlayerPlayPause />
    <PlayerSkipButtons />
    <PlayerSeekBar />
    <PlayerVolume />
    <PlayerTimeDisplay />
    <PlayerFullscreen />
  </PlayerControls>
  <PlayerEpisodePanel episodes={episodes} />
</PlayerRoot>
```

### PlayerRoot Responsibilities

`PlayerRoot` is the compound root that:

1. Initializes the streaming engine (`hls.js` or `dash.js` via `usePlayerEngine`) and attaches it to the `<video>` element
2. Manages the player state machine (loading, playing, paused, buffering, error)
3. Tracks playback progress and reports to the backend history API
4. Handles quality switching, subtitle track selection, and audio track selection
5. Provides mobile detection and orientation locking
6. Exposes all state and controls via `PlayerContext`

### Key Props

| Prop | Type | Description |
|------|------|-------------|
| `streamUrl` | `string \| null` | HLS or MP4 URL (`null` while resolving) |
| `metadata` | `VideoMetadata` | Title, type, IDs for progress tracking |
| `subtitleTracks` | `SubtitleTrack[]` | Selectable subtitle tracks |
| `qualities` | `Quality[]` | Manual quality selection options |
| `spriteVtt` / `spriteSheet` | `string` / `object` | Seekbar thumbnail previews |
| `interactionMode` | `'interactive' \| 'read-only'` | Controls visibility |
| `streamMode` | `'vod' \| 'live'` | Playback mode |
| `skipProgressHistory` | `boolean` | Skip backend progress writes |

### Consumer Components

Each child component consumes `PlayerContext` and renders a single concern:

- `PlayerVideo` — renders `<video>` with event bindings
- `PlayerControls` — auto-hiding control bar with idle detection
- `PlayerSeekBar` — draggable seek with sprite thumbnail preview on hover
- `PlayerMobileSeekBar` — swipe-based seek optimized for touch
- `SubtitleOverlay` — parses WebVTT and renders cues positioned over the video

This pattern allows `WatchVODPlayer` and `WatchLivePlayer` to compose different control layouts from the same building blocks while sharing all core player logic.

---

## 8. Service Worker (Workbox)

The app uses a runtime-caching service worker (`public/sw.js`) powered by **Google Workbox via CDN** (`importScripts`). No build step or npm dependency is required for the SW itself — modules are loaded on-demand from Google's CDN.

### Purpose

Prevents full page hard reloads during client-side navigations under memory pressure. Without the SW, the browser can garbage-collect cached JS chunks from memory during long sessions (e.g., music playback), causing Next.js App Router to fall back to MPA navigation which destroys the AudioContext.

### Caching Strategies

| Cache Name | Strategy | What |
|------------|----------|------|
| `nw-next-static` | CacheFirst | `/_next/static/` JS/CSS chunks (immutable, content-hashed) |
| `nw-static-assets` | CacheFirst (30d, 100 max) | Images and `.woff2` fonts |
| `google-fonts-stylesheets` | StaleWhileRevalidate | Google Fonts CSS |
| `google-fonts-webfonts` | CacheFirst (1yr, 30 max) | Google Fonts `.woff2` files |
| `nw-pages` | NetworkFirst (3s timeout) | HTML navigation requests |
| `nw-retry-queue` | BackgroundSync | Failed mutations to safe endpoints |

### Background Sync (Retry Queue)

Safe-to-retry mutations are queued when offline and replayed when connectivity returns:
- `/api/user/watchlist` (add/remove)
- `/api/video/play`, `/api/video/stop`
- `/api/notifications/register`, `/api/notifications/unregister`
- `/api/manga/progress`
- `/api/music/discover/listen`
- `/api/music/queue`, `/api/music/languages`

### Registration

Client-side registration via `workbox-window` in `src/components/layout/sw-register.tsx`. Disabled on staging (`dev.nightwatch.in`). Update detection shows a sonner toast prompting refresh when a new SW version is waiting.

### Key Files

- `public/sw.js` — Workbox service worker (CDN importScripts, ~100 lines)
- `src/components/layout/sw-register.tsx` — Registration + update toast
- `public/firebase-messaging-sw.js` — Separate SW for push notifications (different scope)
