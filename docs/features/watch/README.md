# Watch Content

VOD and live video playback system built on a compound component player architecture. Supports HLS, DASH, and direct MP4 streams via a unified backend CDN proxy, with mobile-specific inline PiP, swipe-to-dismiss, portrait seekbar, and fullscreen orientation locking.

**Source:** `src/features/watch/`, `src/app/(protected)/watch/[id]/`

## Directory Structure

```
src/features/watch/
├── api.ts                    # getStreamUrl, getContinueWatching, playVideo, stopVideo, fetchContentProgress, etc.
├── utils.ts                  # URL normalization, token extraction, proxy wrapping
├── types.ts                  # Re-exports from @/types/content + player context types + PlayParams
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
    │   ├── useDash.ts        # DASH (dash.js) integration
    │   ├── useMp4.ts         # Direct MP4 source management
    │   ├── usePlayerEngine.ts # Orchestrator: picks HLS vs DASH vs MP4
    │   ├── useFullscreen.ts  # Cross-platform fullscreen
    │   ├── usePlayerHandlers.ts # Centralized control handlers
    │   ├── useKeyboard.ts    # Keyboard shortcuts
    │   ├── usePlaybackSpeedBoost.ts # Transient hold-to-speed-up logic
    │   ├── useLongPressSpeedBoost.ts # Touch long-press speed boost
    │   ├── useWatchProgress.ts
    │   ├── useNextEpisode.ts
    │   ├── useStreamUrls.ts
    │   ├── useAudioTracks.ts
    │   ├── useChromecast.ts  # Chrome Cast integration
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
    │   │   ├── PlayerCastButton.tsx
    │   │   ├── PlayerEpisodePanel.tsx
    │   │   ├── PlayerLiveBadge.tsx
    │   │   ├── SubtitleOverlay.tsx
    │   │   └── hooks/
    │   │       ├── use-player-root.ts
    │   │       ├── use-subtitle-overlay.ts
    │   │       ├── use-player-audio-subtitle-selectors.ts
    │   │       └── use-player-live-badge.ts
    │   ├── controls/          # Low-level control primitives
    │   │   ├── PlayPause.tsx (+ CenterPlayButton)
    │   │   ├── SeekBar.tsx
    │   │   ├── LiveSeekBar.tsx
    │   │   ├── Volume.tsx
    │   │   ├── Fullscreen.tsx
    │   │   ├── SkipButtons.tsx
    │   │   ├── SettingsMenu.tsx
    │   │   ├── AudioSelector.tsx
    │   │   ├── SubtitleSelector.tsx
    │   │   └── EpisodePanel.tsx
    │   └── overlays/
    │       ├── NextEpisodeOverlay.tsx
    │       ├── LoadingOverlay.tsx
    │       ├── ErrorOverlay.tsx
    │       ├── BufferingOverlay.tsx
    │       ├── DebugOverlay.tsx
    │       ├── SpeedBoostIndicator.tsx
    │       └── use-next-episode-overlay.ts
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
      <Player.CastButton />
      <Player.SettingsMenu />
      <Player.Fullscreen />
    </Player.ControlRow>
  </Player.Controls>
</Player.Root>
```

Full component list: `Root`, `Video`, `Controls`, `ControlRow`, `MobileTopBar`, `MobileCenterControls`, `MobileBottomRight`, `Spacer`, `PlayPause`, `SeekBar`, `MobileSeekBar`, `Volume`, `TimeDisplay`, `Fullscreen`, `SettingsMenu`, `AudioSubtitleSelectors`, `CastButton`, `LiveBadge`, `Header`, `SkipButtons`, `EpisodePanel`, `EpisodePanelOverlay`, `EpisodePanelTrigger`.

### PlayerContext

`player/context/PlayerContext.tsx`

React context providing:
- `state: PlayerState` — play/pause, volume, time, buffered, qualities, tracks, error, loading, speed boost
- `dispatch: React.Dispatch<PlayerAction>` — reducer actions
- `metadata: VideoMetadata` — title, type, season, episode, poster, provider
- `videoRef`, `hlsRef`, `videoCallbackRef`, `containerRef` — element refs
- `streamUrl` — current stream URL
- `spriteSheet`, `spriteVtt` — seekbar thumbnail preview data
- `readOnly`, `isHost`, `isAuthenticated` — permission flags
- `qualities`, `captionUrl`, `subtitleTracks` — media options
- `playerHandlers` — centralized control functions (see below)
- `nextEpisode` — show/info/isLoading/play/cancel for auto-play overlay
- `onNavigate`, `onStreamExpired` — callbacks

`playerHandlers` exposes: `togglePlay`, `toggleMute`, `seek`, `skip`, `setVolume`, `toggleFullscreen`, `goBack`, `setQuality`, `setPlaybackRate`, `setAudioTrack`, `setSubtitleTrack`, `handleInteraction`, `engageSpeedBoost`, `releaseSpeedBoost`.

### PlayerState

`player/context/types.ts`

```typescript
interface PlayerState {
  isPlaying, isPaused, isMuted, isFullscreen, isBuffering, isLoading: boolean;
  isSpeedBoosted: boolean;       // Transient hold-to-speed-up active
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

### PlayerAction types

```
PLAY | PAUSE | TOGGLE_PLAY | MUTE | UNMUTE | TOGGLE_MUTE |
SET_VOLUME | SET_TIME | SET_DURATION | SET_BUFFERED |
SET_LOADING | SET_BUFFERING | SET_ERROR | SET_FULLSCREEN |
SHOW_CONTROLS | HIDE_CONTROLS | SET_PLAYBACK_RATE | SET_SPEED_BOOST |
SET_QUALITIES | SET_CURRENT_QUALITY |
SET_AUDIO_TRACKS | SET_SUBTITLE_TRACKS |
SET_CURRENT_AUDIO_TRACK | SET_CURRENT_SUBTITLE_TRACK
```

### VideoMetadata

```typescript
interface VideoMetadata {
  title: string;
  type: 'movie' | 'series' | 'livestream';
  season?: number;
  episode?: number;
  episodeTitle?: string;
  movieId: string;
  seriesId?: string;
  posterUrl?: string;
  description?: string;
  year?: string;
  apiDurationSeconds?: number;
  secondaryPosterUrl?: string;
}
```

### PlayerRoot

`player/ui/compound/PlayerRoot.tsx`

Top-level compound component that:
1. Delegates to the `use-player-root` hook (in `compound/hooks/`)
2. Initializes `usePlayerEngine` which selects `useHls`, `useDash`, or `useMp4` based on `streamFormat` hint or URL
3. Runs `usePlayerHandlers`, `useKeyboard`, `useFullscreen`, `useWatchProgress`, `useNextEpisode`
4. Provides `PlayerContext` to all children
5. Accepts `interactionMode` (`'interactive'` | `'read-only'`), `streamMode` (`'vod'` | `'live'`), `layout` (`'fill'` | `'immersive'`), `containerStyle`, `holdToSpeedUp`, `streamFormat`, and fullscreen override props

## Player Hooks

### usePlayerEngine

`player/hooks/usePlayerEngine.ts`

Orchestrator that picks the playback engine:

| Priority | Signal | Engine |
|----------|--------|--------|
| 1 | `streamFormat` prop from backend | `hls`, `dash`, or `mp4` |
| 2 | URL contains `.mpd` | `dash` |
| 3 | URL contains `.m3u8` | `hls` |
| 4 | `isLive` flag | `hls` |
| 5 | URL contains `.mp4` or fallback | `mp4` |

Returns a unified `setQuality` and `setAudioTrack` that delegate to the active engine's implementation, plus `hlsRef`.

### useHls

`player/hooks/useHls.ts`

HLS.js integration with separate configs for VOD and live:

| Config | VOD | Live |
|--------|-----|------|
| `maxBufferLength` | 60s | 15s |
| `maxMaxBufferLength` | 180s | 30s |
| `liveSyncDurationCount` | — | 3 |
| `maxLiveSyncPlaybackRate` | — | 1.15 |
| `startFragPrefetch` | true | true |
| `maxBufferHole` | 0.5 | 0.5 |

Features:
- Dynamic `import('hls.js')` (code-split)
- Capacitor iOS detection → falls back to native HLS for VOD (WKWebView MediaSource is unreliable); live stays on hls.js even on Capacitor
- `toAbsoluteStreamUrl` resolves root-relative playlist URLs against the correct origin (backend URL on Capacitor, `location.origin` in browser)
- 401 error handling → calls `onStreamExpired` for token refresh
- Manual quality options from backend merged with HLS manifest levels
- Native `audioTracks` fallback for Safari
- Bounded recovery: `MAX_MEDIA_RECOVERY_ATTEMPTS` (2) for fatal MEDIA_ERRORs, `LEVEL_PARSE_MAX_RETRIES` (3) for unparseable variant playlists
- bfcache restoration detection to distinguish codec faults from WebKit page-restore artifacts
- Seek-reprime: when a seek triggers an unrecoverable decode error (non-IDR-aligned segments), subsequent seeks reload the fragment to re-prime the decoder

### useDash

`player/hooks/useDash.ts`

DASH (MPEG-DASH) playback via dash.js v5:
- Dynamic `import('dashjs')` (code-split, avoids SSR)
- Adaptive bitrate via `autoSwitchBitrate`
- Extracts quality representations from the DASH manifest
- Reports quality changes via `QUALITY_CHANGE_RENDERED` events
- Download error codes 27/28 trigger `onStreamExpired` (expired URLs)

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

Centralizes all player control handlers with a 3-second auto-hide timer (5 seconds while interacting):
- `showControls` — dispatches `SHOW_CONTROLS`, resets auto-hide timer
- `handleInteraction(isInteracting)` — suspends timer while menus are open
- `handleVideoClick` — guarded play/pause toggle
- `handleSeek`, `handleSkip`, `handleVolumeChange`, `handleMuteToggle`
- `handleQualityChange` — resolves label to HLS level index
- `handlePlaybackRateChange` — sets `video.playbackRate`
- `handleAudioChange` — switches track + notifies parent via `onExternalAudioChange` for language dub URL swaps
- `handleSubtitleChange`, `handleRetry`

### usePlaybackSpeedBoost

`player/hooks/usePlaybackSpeedBoost.ts`

Transient hold-to-speed-up shared by keyboard and touch inputs:
- Raises playback to 2× (`SPEED_BOOST_RATE`) while held, restores the previous rate on release
- Hold threshold: 250ms (`SPEED_BOOST_HOLD_MS`)
- Disabled for read-only viewers, live streams, and when `allowSpeedBoost` is false (watch parties)
- Writes directly to the media element — does **not** dispatch `SET_PLAYBACK_RATE`, so the settings menu still shows the user's chosen speed
- Dispatches `SET_SPEED_BOOST` for the `SpeedBoostIndicator` overlay

### useLongPressSpeedBoost

`player/hooks/useLongPressSpeedBoost.ts`

Touch-specific long-press adapter for speed boost:
- Returns `onTouchStart`/`onTouchMove`/`onTouchEnd`/`onTouchCancel` handlers
- Movement beyond 12px cancels the press (swipe/scroll, not a hold)
- `didBoost()` reports whether the press engaged a boost, so the caller can suppress the tap action
- Releases on `blur` and `visibilitychange` to prevent stuck 2× on app backgrounding

### useKeyboard

`player/hooks/useKeyboard.ts`

Global keyboard shortcuts registered once via `useLatest` ref pattern:

| Key | Action |
|-----|--------|
| Space / K | Play/Pause (resolved on keyup, not keydown — hold triggers speed boost) |
| J / ← | Seek -10s / -5s |
| L / → | Seek +10s / +5s |
| ↑ / ↓ | Volume ±10% |
| M | Mute toggle |
| F | Fullscreen toggle |
| C | Captions toggle |
| N | Next episode |
| Esc | Exit fullscreen |

Space uses a 70ms settle window (`SPACE_RELEASE_SETTLE_MS`) to distinguish real releases from auto-repeat `keyup`/`keydown` pairs on platforms that send discrete pairs per tick (X11, some Electron setups).

Also listens for Electron desktop media key commands (`MediaPlayPause`, `MediaNextTrack`, `MediaPreviousTrack`). Respects `disabled` flag for watch party guests and `isLive` flag for DVR seek clamping.

### useChromecast

`player/hooks/useChromecast.ts`

Chrome Cast integration (desktop Chrome only):
- Renders nothing when Cast is unavailable (non-Chrome, Capacitor, Electron)
- States: `unavailable`, `not_connected`, `connecting`, `connected`
- `startCast` / `stopCast` for session management
- `PlayerCastButton` compound component wraps this hook

## Services

### WatchProgressService

`player/services/WatchProgressService.ts`

Socket-based progress syncing:
- `prepareProgressPayload` — builds the progress update payload with `apiDurationSeconds` fallback, progress delta calculation
- `syncProgress` — emits `watch:update_progress` via socket, invalidates caches on success
- `syncActivity` — emits `watch:record_time` for the activity heatmap

### useWatchProgress

`player/hooks/useWatchProgress.ts`

Manages progress syncing and activity tracking intervals:
- **Progress sync**: every 10 seconds (`PROGRESS_SYNC_INTERVAL = 10000`)
- **Activity sync**: every 5 seconds (`ACTIVITY_SYNC_INTERVAL = 5000`)
- Initial progress load via `watch:get_progress` socket event
- Splits elapsed time by local date boundaries for accurate per-day activity tracking
- Ignores elapsed jumps > 30s (sleep/wake, tab freeze) to avoid inflated watch time
- Flushes on pause, unmount, and video ended
- `skipProgressHistory` disables saving (watch party non-host members)
- `skipActivityTracking` disables activity tracking (unauthenticated guests)

### StreamUrlService

`player/services/StreamUrlService.ts`

URL normalization and response processing:
- `normalizeRawUrls` — wraps URLs through proxy with token injection
- `processResponse(response)` — unified processor for play responses
- `processSubtitles` — extracts only subtitle tracks from a response
- Returns normalized `streamUrl`, `captionUrl`, `spriteVtt`, `subtitleTracks`, `qualities`, `apiDurationSeconds`

### NextEpisodeService

`player/services/NextEpisodeService.ts`

Next episode discovery:
1. Checks series cache (`getCachedSeriesData`) for current season episodes
2. Falls back to API fetch (`getSeriesEpisodes`)
3. Looks for `currentEpisode + 1` in current season
4. If not found, checks first episode of next season
5. `prepareNextEpisodeCommand` — calls `playVideo` for the next episode and constructs the full navigation URL with all query params

## Mobile-Specific Features

### Device detection

The touch skin is selected in **CSS**, not React. A blocking script in the
document head (`@/platforms/mobile/touch-ui-script`) resolves the input mode
before the first paint and writes `data-touch-ui="touch" | "pointer"` on `<html>`;
control components then key off the `touch-ui:` / `pointer-ui:` Tailwind variants
declared in `globals.css`. Doing it pre-paint means a phone never paints the
pointer control row for a frame first.

`useIsTouchUi` (`@/platforms/mobile/use-touch-ui`, also re-exported as the
deprecated `useMobileDetection`) re-runs the same rules after mount, corrects the
attribute if the script guessed wrong, and drives player *behaviour* — tap zones,
tap-to-toggle, the fullscreen strategy. Layout is CSS, behaviour is React.

`pointer-ui` deliberately also matches when the attribute is **missing**, so a
blocked or failed script degrades to the desktop arrangement rather than
rendering no controls at all.

Detection keys off device capability only, never viewport width:

| Signal | Result |
|--------|--------|
| Electron / Android TV | pointer (desktop control row) |
| Capacitor native shell | touch |
| Phone UA (`iPhone`, `Android … Mobile`, …) | touch |
| Desktop OS UA (`Windows NT`, `X11`, `Linux x86_64`, `CrOS`) | pointer, even with a touchscreen |
| macOS UA | touch only when `maxTouchPoints > 0` (iPadOS reports a macOS UA) |
| Anything else | touch when touch API **and** `pointer: coarse` **and** `hover: none` |

Viewport width is not a signal. A narrow desktop window — split screen, 175%
zoom — keeps the full pointer control row, desktop container sizing and the native
Fullscreen API, because it is still mouse-driven. Width-based `md:` / `lg:`
classes survive only *inside* an arrangement, to scale padding and gaps.
Pointer/hover changes (plugging a mouse into a tablet) are picked up via
`matchMedia` `change` listeners.

Container sizing follows the same split: `Player.Root` takes `layout="fill"`
(default — viewport height minus the Electron title bar) or `layout="immersive"`
(fixed overlay pinned below the title bar), each expressed as `touch-ui:` /
`pointer-ui:` classes so the right box is in the first paint. Touch devices get an
inline 16:9 box in either preset. The `containerStyle` prop remains as an inline
escape hatch and overrides both.

Escape hatch for hardware that reports misleading pointer media queries:
`localStorage.setItem('nightwatch:touch-ui', 'pointer' | 'touch')`, or
`removeItem` to return to auto-detection.

| Feature | Implementation |
|---------|---------------|
| **Tap-to-toggle** | `handleVideoClick` in `usePlayerHandlers` toggles play/pause |
| **Portrait seekbar** | `Player.MobileSeekBar` — pinned to bottom, full-width, larger touch target |
| **Fullscreen orientation lock** | `useFullscreen` locks to landscape via `screen.orientation.lock` or Capacitor plugin |
| **Mobile center controls** | `Player.MobileCenterControls` — skip back / play / skip forward (YouTube-style) |
| **Mobile top bar** | `Player.MobileTopBar` — settings in top-right corner |
| **Swipe-to-dismiss PiP** | Touch gesture tracking with 80px threshold in `WatchVODPlayer`/`WatchLivePlayer` |
| **Long-press speed boost** | `useLongPressSpeedBoost` — hold anywhere on the video for 250ms to get 2× playback |

## Data Flow: VOD Playback

1. `/watch/:id` page fetches stream URL via `playVideo` API
2. `WatchVODPlayer` passes URL to `Player.Root`
3. `PlayerRoot` delegates to `usePlayerEngine` which selects `useHls` (`.m3u8`), `useDash` (`.mpd`), or `useMp4` based on `streamFormat` hint or URL
4. HLS.js/dash.js loads manifest, dispatches `SET_QUALITIES` with available levels
5. `useWatchProgress` restores last position from socket (`watch:get_progress`)
6. `usePlayerHandlers` manages all user interactions
7. `WatchProgressService.syncProgress` sends updates every 10s via socket (`watch:update_progress`)
8. Near end of episode → `useNextEpisode` fetches next episode info → shows `NextEpisodeOverlay`

## Playback Routing

All platforms — browser, Electron desktop, iOS, Android, and Android TV — stream VOD content through the backend CDN proxy (Cloudflare Worker). The proxy injects the upstream CDN's required `Referer` header server-side, so no client ever receives raw upstream CDN URLs or needs to manipulate request headers. This means browsers can play movies and series directly without requiring the desktop or mobile app.

Previously, media segments were proxied through each end user's device, which browsers could not do because `Referer` is a forbidden header in the Fetch spec. The Cloudflare Workers now handle this centrally, eliminating the per-platform playback restrictions.
