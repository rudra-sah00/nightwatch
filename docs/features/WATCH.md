# Watch Content

VOD and live video playback system built on a compound component player architecture. Supports HLS (Server 1/3) and direct MP4 (Server 1) streams, with mobile-specific inline PiP, swipe-to-dismiss, portrait seekbar, and fullscreen orientation locking.

## Directory Structure

```
src/features/watch/
├── api.ts                    # playVideo, stopVideo, fetchContentProgress
├── utils.ts                  # URL normalization, token injection, proxy wrapping
├── types.ts                  # WatchProgress type
├── components/
│   ├── WatchVODPlayer.tsx    # VOD player with inline mobile PiP
│   ├── WatchLivePlayer.tsx   # Live player with clip recording
│   ├── ContinueWatching.tsx  # Resume-watching list
│   └── PlaybackCountdown.tsx # 3-2-1 countdown overlay
├── hooks/
│   ├── use-vod-player-state.ts
│   ├── use-playback-countdown.ts
│   ├── use-continue-watching.ts
│   └── use-watch-content.ts
└── player/
    ├── index.ts              # Player namespace + compound exports
    ├── context/
    │   ├── PlayerContext.tsx  # React context + usePlayerContext
    │   └── types.ts          # PlayerState, PlayerAction, VideoMetadata
    ├── hooks/
    │   ├── useHls.ts         # HLS.js integration
    │   ├── useMp4.ts         # Direct MP4 source management
    │   ├── useFullscreen.ts  # Cross-platform fullscreen
    │   ├── usePlayerHandlers.ts # Centralized control handlers
    │   ├── useKeyboard.ts    # Keyboard shortcuts
    │   ├── useWatchProgress.ts
    │   ├── useNextEpisode.ts
    │   ├── useStreamUrls.ts
    │   ├── usePlayerEngine.ts
    │   ├── useS2AudioTracks.ts
    │   ├── useMobileDetection.ts
    │   ├── useMobileOrientation.ts
    │   └── series-cache.ts
    ├── services/
    │   ├── WatchProgressService.ts
    │   ├── StreamUrlService.ts
    │   ├── NextEpisodeService.ts
    │   └── SpriteService.ts
    ├── ui/
    │   ├── VideoElement.tsx
    │   ├── use-video-element.ts
    │   ├── compound/          # Player.* compound components
    │   │   ├── PlayerRoot.tsx
    │   │   ├── PlayerVideo.tsx
    │   │   ├── PlayerControls.tsx
    │   │   ├── PlayerHeader.tsx
    │   │   ├── PlayerPlayPause.tsx
    │   │   ├── PlayerSeekBar.tsx
    │   │   ├── PlayerMobileSeekBar.tsx
    │   │   ├── PlayerVolume.tsx
    │   │   ├── PlayerTimeDisplay.tsx
    │   │   ├── PlayerFullscreen.tsx
    │   │   ├── PlayerSettingsMenu.tsx
    │   │   ├── PlayerSkipButtons.tsx
    │   │   ├── PlayerAudioSubtitleSelectors.tsx
    │   │   ├── PlayerEpisodePanel.tsx
    │   │   ├── PlayerLiveBadge.tsx
    │   │   └── SubtitleOverlay.tsx
    │   ├── controls/          # Low-level control primitives
    │   │   ├── PlayPause.tsx (+ CenterPlayButton)
    │   │   ├── SeekBar.tsx
    │   │   ├── LiveSeekBar.tsx
    │   │   ├── Volume.tsx
    │   │   ├── Fullscreen.tsx
    │   │   ├── PipButton.tsx
    │   │   ├── SkipButtons.tsx
    │   │   ├── SettingsMenu.tsx
    │   │   ├── AudioSelector.tsx
    │   │   ├── SubtitleSelector.tsx
    │   │   └── EpisodePanel.tsx
    │   ├── overlays/
    │   │   ├── NextEpisodeOverlay.tsx
    │   │   ├── PipOverlay.tsx
    │   │   ├── LoadingOverlay.tsx
    │   │   ├── ErrorOverlay.tsx
    │   │   └── BufferingOverlay.tsx
    │   └── utils/
    │       └── format-time.ts
    └── utils/
        └── format-time.ts
```

## Components

### WatchVODPlayer

`components/WatchVODPlayer.tsx` — `React.memo`

VOD player with two layout strategies:

**Desktop / immersive mobile** — fixed full-viewport player.

**Inline mobile** — player sits in a 16:9 sentinel `<div>`. An `IntersectionObserver` watches the sentinel; when it scrolls out of view (< 50% visible), the player transitions to a fixed mini-player (PiP) in the bottom-right corner.

Mini-player features:
- **Tap to dismiss** — scrolls back to top and restores inline mode
- **Swipe-to-dismiss** — horizontal touch gestures beyond 80px trigger a slide-out animation (opacity fade + translateX) then navigate back
- Smooth `cubic-bezier(0.4, 0, 0.2, 1)` CSS transition

Also:
- Updates Discord Rich Presence via `desktopBridge`
- Broadcasts `watch:set_activity` socket event for friend activity feeds (cleared on unmount)
- Registers with global `PipProvider` for cross-route PiP

Internal `VODPlayerState` renders: loading poster overlay, buffering spinner, error overlay, center play button, mobile-specific controls layout, episode panel, and next-episode auto-play overlay.

### WatchLivePlayer

`components/WatchLivePlayer.tsx` — `React.memo`

Live-stream player with the same dual-layout PiP system as `WatchVODPlayer`. Additional features:
- **Clip recording** — `RecordButton` in the header powered by `useClipRecorder`
- **Debounced buffering** — `LiveBufferingOverlay` delays the spinner by 500ms to prevent flicker on brief HLS stalls
- **Live badge** and DVR seek bar in controls
- Broadcasts `watch:set_activity` with `type: 'live'`

### ContinueWatching

`components/ContinueWatching.tsx`

Displays in-progress content the user can resume. Features:
- Search filtering via `searchQuery` prop
- Loading skeletons, empty state with icon
- Optimistic removal via `handleRemove`
- Progress bar with percentage
- Remaining time display (minutes/hours)
- `contentVisibility: 'auto'` for virtualization

### PlaybackCountdown

`components/PlaybackCountdown.tsx`

Full-screen 3-2-1 countdown overlay with:
- Animated circular SVG progress ring
- Large animated digit with zoom-in transition
- Step indicators (3 dots)
- Background glow effects
- Calls `onComplete` after countdown reaches zero

## Player System

### Player Namespace

`player/index.ts`

Exports a `Player` namespace object grouping all compound components:

```tsx
<Player.Root streamUrl={url} metadata={meta}>
  <Player.Video />
  <Player.Controls>
    <Player.Header />
    <Player.SeekBar />
    <Player.ControlRow>
      <Player.PlayPause />
      <Player.Volume />
      <Player.TimeDisplay />
      <Player.Spacer />
      <Player.SettingsMenu />
      <Player.Fullscreen />
    </Player.ControlRow>
  </Player.Controls>
</Player.Root>
```

Full component list: `Root`, `Video`, `Controls`, `ControlRow`, `MobileTopBar`, `MobileCenterControls`, `MobileBottomRight`, `Spacer`, `PipButton`, `PlayPause`, `SeekBar`, `MobileSeekBar`, `Volume`, `TimeDisplay`, `Fullscreen`, `SettingsMenu`, `AudioSubtitleSelectors`, `LiveBadge`, `Header`, `SkipButtons`, `EpisodePanel`, `EpisodePanelOverlay`, `EpisodePanelTrigger`.

### PlayerContext

`player/context/PlayerContext.tsx`

React context providing:
- `state: PlayerState` — play/pause, volume, time, buffered, qualities, tracks, error, loading
- `dispatch: React.Dispatch<PlayerAction>` — reducer actions
- `metadata: VideoMetadata` — title, type, season, episode, poster, provider
- `videoRef`, `hlsRef`, `containerRef` — element refs
- `playerHandlers` — centralized control functions
- `nextEpisode` — show/info/play/cancel for auto-play overlay

### PlayerState

`player/context/types.ts`

```typescript
interface PlayerState {
  isPlaying, isPaused, isMuted, isFullscreen, isBuffering, isLoading: boolean;
  currentTime, duration, buffered, volume, playbackRate: number;
  error: string | null;
  showControls: boolean;
  qualities: Quality[];
  currentQuality: string;
  audioTracks: AudioTrack[];
  subtitleTracks: SubtitleTrack[];
  currentAudioTrack: string | null;
  currentSubtitleTrack: string | null;
}
```

### PlayerRoot

`player/ui/compound/PlayerRoot.tsx`

Top-level compound component that:
1. Creates the `useReducer` for `PlayerState`
2. Initializes `useHls` or `useMp4` based on stream URL
3. Runs `usePlayerHandlers`, `useKeyboard`, `useFullscreen`, `useWatchProgress`, `useNextEpisode`
4. Provides `PlayerContext` to all children
5. Accepts `interactionMode` (`'interactive'` | `'read-only'`), `streamMode` (`'vod'` | `'live'`), `containerStyle`, and fullscreen override props

## Player Hooks

### useHls

`player/hooks/useHls.ts`

HLS.js integration with separate configs for VOD and live:

| Config | VOD | Live |
|--------|-----|------|
| `maxBufferLength` | 120s | 15s |
| `maxMaxBufferLength` | 300s | 30s |
| `liveSyncDurationCount` | — | 3 |
| `maxLiveSyncPlaybackRate` | — | 1.15 |
| `startFragPrefetch` | — | true |
| `maxBufferHole` | — | 0.5 |

Features:
- Dynamic `import('hls.js')` (code-split)
- Capacitor iOS detection → falls back to native HLS (WKWebView MediaSource is unreliable)
- `xhrSetup` with `withCredentials` for authenticated streams
- `fetchSetup` with `offline-media://` protocol support for Electron offline playback
- 401 error handling → calls `onStreamExpired` for token refresh
- Manual quality options from backend merged with HLS manifest levels
- Native `audioTracks` fallback for Safari

### useMp4

`player/hooks/useMp4.ts`

Direct MP4 source management:
- Sets `video.src` and handles `loadedmetadata`/`error` events
- Syncs manual quality options to player state
- `setQuality` callback preserves `currentTime` and play state across quality switches
- Ignores `MEDIA_ERR_SRC_NOT_SUPPORTED` and `MEDIA_ERR_ABORTED` on unmount

### useFullscreen

`player/hooks/useFullscreen.ts`

Cross-platform fullscreen with four strategies:

| Platform | Strategy |
|----------|----------|
| **Mobile** | YouTube-style: orientation lock to landscape + fixed viewport overlay + scroll lock. No native Fullscreen API. |
| **Desktop browser** | Container-level `requestFullscreen` with WebKit vendor prefixes |
| **Electron** | `window.electronAPI.toggleFullscreen()` for native BrowserWindow |
| **Capacitor** | `@capacitor/screen-orientation` plugin for reliable native orientation lock |

**Delayed unlock fix:** When exiting mobile fullscreen, locks to portrait first, then unlocks after 500ms to prevent a "rotate wall flash."

Manages mobile status bar visibility via `mobileBridge` — hidden in fullscreen, shown when exiting.

### usePlayerHandlers

`player/hooks/usePlayerHandlers.ts`

Centralizes all player control handlers with a 3-second auto-hide timer:
- `showControls` — dispatches `SHOW_CONTROLS`, resets 3s timer
- `handleInteraction(isInteracting)` — suspends timer while menus are open
- `handleVideoClick` — guarded play/pause toggle
- `handleSeek`, `handleSkip`, `handleVolumeChange`, `handleMuteToggle`
- `handleQualityChange` — resolves label to HLS level index
- `handlePlaybackRateChange` — sets `video.playbackRate`
- `handleAudioChange` — switches track + notifies parent for S2 URL swaps
- `handleSubtitleChange`, `handleRetry`

### useKeyboard

`player/hooks/useKeyboard.ts`

Global keyboard shortcuts registered once via `useLatest` ref pattern:

| Key | Action |
|-----|--------|
| Space / K | Play/Pause |
| J / ← | Seek -10s / -5s |
| L / → | Seek +10s / +5s |
| ↑ / ↓ | Volume ±10% |
| M | Mute toggle |
| F | Fullscreen toggle |
| C | Captions toggle |
| N | Next episode |
| Esc | Exit fullscreen |

Also listens for Electron desktop media key commands (`MediaPlayPause`, `MediaNextTrack`, `MediaPreviousTrack`). Respects `disabled` flag for watch party guests and `isLive` flag for DVR seek clamping.

## Services

### WatchProgressService

`player/services/WatchProgressService.ts`

Socket-based progress syncing:
- `prepareProgressPayload` — builds the progress update payload with S2 duration fallback, progress delta calculation
- `syncProgress` — emits `watch:update_progress` via socket, invalidates caches on success
- `syncActivity` — emits `watch:record_time` for the activity heatmap

### StreamUrlService

`player/services/StreamUrlService.ts`

URL normalization and response processing:
- `normalizeRawUrls` — wraps URLs through proxy with token injection
- `processResponse(server, response)` — unified processor for S1/S2/S3 responses
- S1/S3: HLS token extraction + proxy wrapping for captions, sprites, subtitles
- S2: Direct MP4 URLs with optional `apiDurationSeconds` fallback

### NextEpisodeService

`player/services/NextEpisodeService.ts`

Next episode discovery:
1. Checks series cache (`getCachedSeriesData`) for current season episodes
2. Falls back to API fetch (`getSeriesEpisodes`)
3. Looks for `currentEpisode + 1` in current season
4. If not found, checks first episode of next season
5. `prepareNextEpisodeCommand` — calls `playVideo` for the next episode and constructs the full navigation URL with all query params

## Mobile-Specific Features

| Feature | Implementation |
|---------|---------------|
| **Tap-to-toggle** | `handleVideoClick` in `usePlayerHandlers` toggles play/pause |
| **Portrait seekbar** | `Player.MobileSeekBar` — pinned to bottom, full-width, larger touch target |
| **PiP button** | `Player.PipButton` — triggers `onPip` callback for inline→mini transition |
| **Fullscreen orientation lock** | `useFullscreen` locks to landscape via `screen.orientation.lock` or Capacitor plugin |
| **Mobile center controls** | `Player.MobileCenterControls` — skip back / play / skip forward (YouTube-style) |
| **Mobile top bar** | `Player.MobileTopBar` — PiP + settings in top-right corner |
| **Swipe-to-dismiss PiP** | Touch gesture tracking with 80px threshold in `WatchVODPlayer`/`WatchLivePlayer` |

## Data Flow: VOD Playback

1. `/watch/:id` page fetches stream URL via `playVideo` API
2. `WatchVODPlayer` passes URL to `Player.Root`
3. `PlayerRoot` detects `.m3u8` → initializes `useHls`, or `.mp4` → `useMp4`
4. HLS.js loads manifest, dispatches `SET_QUALITIES` with available levels
5. `useWatchProgress` restores last position from cache/API
6. `usePlayerHandlers` manages all user interactions
7. `WatchProgressService.syncProgress` sends updates every 15s via socket
8. Near end of episode → `useNextEpisode` fetches next episode info → shows `NextEpisodeOverlay`
