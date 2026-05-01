# Real-World Codebase Architecture

Nightwatch is not a simple Next.js boilerplate; it's a massive, multi-environment monorepo architecture bridging browser clients explicitly with native Electron (OS) hooks, complex HLS streaming, and real-time P2P networking protocols.

## High-Level Tech Stack

*   **Framework**: Next.js 15 (App Router fully utilizing RSC / Server Actions).
*   **Language**: TypeScript (Strict typing for RPC channels, APIs, and React props).
*   **Styling**: Tailwind CSS (Custom Neo-Brutalist Theme with variables in `tailwind.config`).
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
*   **`cache.ts`:** Shared `createTTLCache<T>()` utility used by search, profile, and watch APIs. All caches auto-register for bulk invalidation via `clearAllCaches()` on logout.
*   **`errors.ts`:** Centralized error handling — `isApiError()` type guard, `handleApiError()` with toast, `mapErrorCode()` for user-friendly messages.
*   **`socket.ts`:** A global singleton initialization for the Socket.io server connection. Keeps track of force logouts and active connections.
*   **`storage-cache.ts`:** In-memory cache for `localStorage` reads. Event listeners initialized lazily via `initStorageCache()` to avoid SSR side effects.
*   **`linkify.ts`:** URL parsing for chat messages. Uses separate global/non-global regex to avoid `lastIndex` mutation bugs.
*   **`constants.ts`:** Strongly typed enumerations for system-wide behaviors.
*   **`env.ts`:** Validated environment configuration at runtime.

---

## 4. The Edge Proxy & Custom Matchers

Inside Next.js `src/proxy.ts` (mapped in Edge infrastructure), our frontend intercepts direct CDN manifest requests (`.m3u8` or chunk `.ts` files) dynamically. This forces CDN edge servers to believe the VOD stream is being requested by the authorized Host Platform, mitigating hard CORS rules and Hotlink protections designed to crash third-party React players.

*   **The Regex Matcher Strategy:** A heavily tested Regex pattern `/((?!api/|_next/static).*)` ensures internal documentation links like `/API_LAYER` aren't automatically redirected into 404 Vercel Edge endpoints.

---

## 5. The Electron Sandbox (`src/hooks/use-desktop-app.ts`)

Instead of rendering a normal web app in a system webview, the Nightwatch standard browser experience contains fallback abstractions checking for custom protocol handlers (`nightwatch://`).
If the system timeout detects `document.hidden` failing to trigger after 2000 milliseconds, it visually outputs a Sonner Toast asking the user to manually install the desktop shell to enjoy Frameless borders, system hardware rendering, and Discord Rich Presence integrations linked explicitly inside `src/lib/electron-bridge.ts`.

---

## 6. Desktop Platform Layer (Electron)

The desktop app wraps the Next.js frontend in an Electron shell with a preload script that exposes `window.electronAPI`. The frontend communicates with the main process exclusively through `src/lib/electron-bridge.ts`, which provides a safe no-op fallback when running outside Electron.

### Bridge Pattern

```ts
import { desktopBridge, checkIsDesktop } from '@/lib/electron-bridge';

if (checkIsDesktop()) {
  desktopBridge.setPictureInPicture(true);
}
```

### Desktop-Exclusive Features

| Feature | Bridge Method | Description |
|---------|--------------|-------------|
| Discord Rich Presence | `updateDiscordPresence()` / `clearDiscordPresence()` | Shows current activity in Discord |
| Picture-in-Picture | `setPictureInPicture(enabled, opacity)` | OS-level always-on-top mini player |
| System Tray | (main process) | Background presence with unread badge |
| Media Keys | `onMediaCommand(cb)` | Play/pause/next/prev from keyboard |
| Window Controls | `windowMinimize()` / `windowMaximize()` / `windowClose()` | Frameless window management |
| Native Theme | `setNativeTheme(theme)` | Sync OS dark/light mode |
| Notifications | `showNotification({ title, body })` | OS-native notifications |
| Fullscreen | `toggleFullscreen()` / `onFullscreenChanged(cb)` | Native fullscreen toggle |
| Keep Awake | `setKeepAwake(keep)` | Prevent sleep during playback |
| Unread Badge | `setUnreadBadge(count)` | macOS Dock badge |
| Run on Boot | `setRunOnBoot(enabled)` | Auto-start on login |
| Offline Downloads | `startDownload()` / `getDownloads()` / `onDownloadProgress()` | Full HLS/MP4 download manager |
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

## 7. Mobile Platform Layer (Capacitor)

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
| Offline Downloads | `@capacitor/filesystem` + `@capacitor/preferences` | HLS/MP4 download to device |
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

## 8. Picture-in-Picture System

Nightwatch implements a multi-layer PiP system that works across routes and platforms.

### Global PipProvider (`src/providers/pip-provider.tsx`)

The `PipProvider` wraps the entire protected layout and manages cross-route video continuity on mobile:

```
PlayerRoot (watch page)
  → register(streamUrl, title, watchUrl, videoEl)
  → user navigates away from /watch/, /live/, /clip/
  → PipProvider captures currentTime + streamUrl
  → renders floating PipPlayer mini-player (bottom-right, 45vw)
  → user taps mini-player → navigates back to watchUrl
  → user navigates to another video route → PiP closes
```

### Route-Change Detection

The provider watches `pathname` via `usePathname()`:

- **Navigating AWAY from a video route** with a registered, playing video → activate PiP
- **Navigating TO a video route** → close any existing PiP (avoid conflicts)

Video routes: `/watch/`, `/live/`, `/clip/`

### Music Conflict Resolution

If music starts playing while PiP is active, PiP is automatically closed so audio streams don't overlap:

```ts
const { isPlaying: musicPlaying } = useMusicPlayerContext();
useEffect(() => {
  if (musicPlaying && pip) close();
}, [musicPlaying, pip, close]);
```

### Native Background PiP (Capacitor)

When the app goes to background on mobile, the provider uses the native `requestPictureInPicture()` API:

```ts
mobileBridge.onAppStateChange(({ isActive }) => {
  if (!isActive) {
    videoEl.requestPictureInPicture?.();  // Enter native PiP
  } else {
    document.exitPictureInPicture();      // Return to app
  }
});
```

### Desktop PiP (Electron)

On desktop, PiP uses the Electron main process for an always-on-top mini window:

```ts
desktopBridge.setPictureInPicture(enabled, opacity);
desktopBridge.onPipModeChanged((isPip) => { ... });
```

### PipPlayer Component

The floating mini-player renders when PiP is active on mobile:

- Fixed position: `bottom: calc(1rem + env(safe-area-inset-bottom))`, `right: 0.75rem`
- Size: `45vw` with `16:9` aspect ratio
- Seeks to saved `currentTime` on `loadedmetadata`
- Tap overlay → navigate back to original watch route
- Close button (X) → dismiss PiP
- Title bar with gradient overlay

### Local IntersectionObserver PiP

Individual player components (e.g., `PipOverlay`) use `IntersectionObserver` to detect when the video element scrolls out of view within a page, triggering an in-page mini-player overlay without the global PiP system.

---

## 9. Player Compound Component Pattern

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

- `PlayerVideo` — renders `<video>` with event bindings, registers with PipProvider
- `PlayerControls` — auto-hiding control bar with idle detection
- `PlayerSeekBar` — draggable seek with sprite thumbnail preview on hover
- `PlayerMobileSeekBar` — swipe-based seek optimized for touch
- `SubtitleOverlay` — parses WebVTT and renders cues positioned over the video

This pattern allows `WatchVODPlayer` and `WatchLivePlayer` to compose different control layouts from the same building blocks while sharing all core player logic.
