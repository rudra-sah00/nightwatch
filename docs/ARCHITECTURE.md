# Real-World Codebase Architecture

Nightwatch is not a simple Next.js boilerplate; it's a massive, multi-environment monorepo architecture bridging browser clients explicitly with native Electron (OS) hooks, complex HLS streaming, and real-time P2P networking protocols.

## High-Level Tech Stack

*   **Framework**: Next.js 16 (App Router fully utilizing RSC / Server Actions).
*   **Language**: TypeScript (Strict typing for RPC channels, APIs, and React props).
*   **Styling**: Tailwind CSS v4 (Custom Neo-Brutalist Theme with CSS-native @theme configuration).
*   **Server State**: TanStack Query (client-side caching, background revalidation, optimistic updates).
*   **Client State**: Zustand (lightweight stores for player, music, UI state).
*   **Real-time Infrastructure**: Agora RTM (Signaling / UI State), Agora RTC (WebRTC Video/Audio Calls), and Socket.io (`socket.ts` legacy fallbacks).
*   **Video Engine**: Custom HLS abstractions over `hls.js` supporting dynamic manifest swapping.
*   **Native Bridge**: Electron invoke/listen via `desktopBridge` (`src/lib/electron-bridge.ts`).
*   **Quality Config**: `biome.json` (Lint/Format entirely replacing ESLint/Prettier), Vitest (Unit), Playwright (E2E).

---

## 1. The Route Grouping Paradigm

The entry point of the app lives in `src/app/`, where React Server Components determine authentication layouts gracefully before reaching the client boundaries.

We strategically compartmentalize routes using parenthesis:
*   `app/(public)/`: Landing pages, SEO-focused indexing maps, and unauthenticated feature showcases. No auth middleware blocking occurs here.
*   `app/(protected)/`: The core dashboard, Discover maps, user profiles, and VOD watch streams (`/watch/:id`). This enforces the user has hit the `AuthProvider`.
*   `app/(party)/`: The extremely complex layout dedicated solely to real-time WebRTC connections, bypassing generic navigation sidebars to prevent accidental unmounts of the Agora connection container (`src/features/watch-party/`).

---

## 2. Feature-Sliced Design (`src/features/`)

Instead of throwing every component into a global `src/components/` folder, Nightwatch embraces a deeply nested Feature-Pattern architecture. A generic `Button` lives in `src/components/ui/`, but business logic lives in `src/features/[domain]/`:

*   **`auth/`**: Sign In, Sign Up, JWT handling UI.
*   **`watch/`**: The complete VOD engine, storing `src/features/watch/player/` for parsing m3u8 manifests into `HTMLVideoElement` contexts cleanly.
*   **`watch-party/`**: The single largest domain in the project. Broken down locally into:
    *   `/chat/`: Instant messaging hooks and P2P overlays.
    *   `/hooks/`: Global UI states, full-screen detection, active media controls.
    *   `/interactions/`: The `useGestureDetection.ts` logic handling camera hand movements, `useSoundboard.ts`, and `SketchContext.tsx` for drawing on the screen.
    *   `/media/`: The exact `useAgora.ts` and `useAgoraRtm.ts` engines. Provides standard React hooks mapping perfectly to SDK connection promises.
    *   `/room/`: Member tracking, permission sync (`useWatchPartyMembers.ts`, `usePredictiveSync.ts`), and the legacy fallback lobby logic natively bridging socket approvals.

---

## 3. The `src/lib/` Utilities Layer

*   **`fetch.ts`:** The `apiFetch` wrapper with automatic token refresh, CSRF handling, configurable retries with linear backoff, and proper abort signal handling (user abort vs timeout are distinguished).
*   **`query-provider.tsx`:** Located at `src/providers/query-provider.tsx`. Initializes TanStack Query's `QueryClient` with a default `staleTime` of 5 minutes. Wraps the app to provide client-side caching, background revalidation, and automatic garbage collection of unused queries.
*   **`socket.ts`:** A global singleton initialization for the Socket.io server connection. Keeps track of force logouts and active connections.
*   **`storage-cache.ts`:** In-memory cache for `localStorage` reads. Event listeners initialized lazily via `initStorageCache()` to avoid SSR side effects.
*   **`linkify.ts`:** URL parsing for chat messages. Uses separate global/non-global regex to avoid `lastIndex` mutation bugs.
*   **`constants.ts`:** Strongly typed enumerations for system-wide behaviors.
*   **`env.ts`:** Validated environment configuration at runtime.

---

## 4. The Electron Sandbox (`src/hooks/use-desktop-app.ts`)

Instead of rendering a normal web app in a system webview, the Nightwatch standard browser experience contains fallback abstractions checking for custom protocol handlers (`nightwatch://`).
If the system timeout detects `document.hidden` failing to trigger after 2000 milliseconds, it visually outputs a Sonner Toast asking the user to manually install the desktop shell to enjoy Frameless borders, system hardware rendering, and Discord Rich Presence integrations linked explicitly inside `src/lib/electron-bridge.ts`.

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

The mobile app wraps the deployed Next.js app in a native WebView via Capacitor, with 16 native plugins providing device API access. The frontend communicates through `src/lib/mobile-bridge.ts`, which mirrors the `desktopBridge` pattern.

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

`MobileShell` (mounted once in root layout) handles status bar theming, Android back button, network detection, and keyboard management. See [MOBILE.md](./features/MOBILE.md) for full details.

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
├── PlayerRoot.tsx                  # Provider + HLS engine + state management
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
├── PlayerLiveBadge.tsx             # "LIVE" indicator with edge-to-live seek
├── PlayerSettingsMenu.tsx          # Quality, speed, subtitle settings
├── PlayerAudioSubtitleSelectors.tsx # Audio track + subtitle track pickers
├── PlayerEpisodePanel.tsx          # Series episode list panel
├── SubtitleOverlay.tsx             # WebVTT subtitle renderer
└── hooks/
    ├── use-player-root.ts          # Core hook: HLS init, state machine, progress
    ├── use-subtitle-overlay.ts     # WebVTT parsing + cue timing
    ├── use-player-audio-subtitle-selectors.ts # Track enumeration
    └── use-player-live-badge.ts    # Live edge detection
```

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

1. Initializes the HLS.js engine and attaches it to the `<video>` element
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
