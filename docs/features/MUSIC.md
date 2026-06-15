# Music

Full-featured music streaming integrated into Nightwatch. Powered by JioSaavn on the backend with a custom `AudioEngine` on the frontend, synced lyrics, user playlists, Redis-backed queue persistence, and Discord Rich Presence on desktop.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                     │
│                                                         │
│  MusicPlayerProvider (React Context)                    │
│    └── AudioEngine (singleton HTMLAudioElement)         │
│          ├── Playback (play, pause, seek, next, prev)   │
│          ├── Queue (shuffle, repeat, Redis-synced)       │
│          ├── Gapless (pre-buffers next track 5s early)  │
│          ├── Crossfade (0–12s configurable blend)       │
│          ├── Equalizer (5-band Web Audio API)           │
│          └── Sleep Timer (auto-stop after duration)     │
│                                                         │
│  Components:                                            │
│    MusicView ─── Home page (charts, featured, artists)  │
│    FullPlayer ── Expanded view with synced lyrics        │
│    MiniPlayer ── Sticky bottom bar with controls         │
│    MusicSearchSpotlight ── Overlay search modal          │
│    SongContextMenu ── Right-click add to queue/playlist  │
│    UserPlaylists ── User-created playlist cards          │
│    MusicAutoStop ── Stops music on video route entry     │
│    MusicDeviceSync ── Global device advertising          │
│    MusicDevicePicker ── Spotify Connect-like transfer    │
│    Equalizer ── 5-band EQ with presets panel            │
│    SleepTimer ── Countdown timer panel                  │
│    MusicDiscordPresence ── Desktop Discord RPC           │
│    FloatingDisc ── Animated album art disc               │
└──────────────────────┬──────────────────────────────────┘
                       │ apiFetch (HTTP) + Socket.IO
┌──────────────────────▼──────────────────────────────────┐
│  Backend (Node.js / Express)                            │
│                                                         │
│  /api/music/* routes                                    │
│    ├── JioSaavn Provider (search, stream, metadata)     │
│    ├── LRCLIB (synced lyrics, server-side)               │
│    ├── Redis cache (music:home, music:charts, etc.)     │
│    ├── Redis queue (music:queue:{userId}, 24h TTL)      │
│    ├── PostgreSQL (user playlists + tracks)              │
│    └── CF Worker proxy (stream URL with Referer header) │
│                                                         │
│  Socket.IO (music device events)                        │
│    ├── music:device_online / music:device_offline        │
│    ├── music:transfer_playback                          │
│    ├── music:state_update                               │
│    ├── music:command                                    │
│    └── music:request_devices                            │
└─────────────────────────────────────────────────────────┘
```

## Frontend Structure

```
src/features/music/
├── api.ts                          # All backend API functions (40 endpoints)
├── utils.ts                        # formatTime helper
├── engine/
│   ├── audio-engine.ts             # Orchestrator class (public API, timer, lifecycle)
│   ├── types.ts                    # State interfaces, EQ presets, EngineContext
│   ├── playback.ts                 # Core play, fade-out, retry, autoContinue
│   ├── crossfade.ts                # Crossfade logic with pause-aware step loop
│   ├── gapless.ts                  # Pre-buffer management (preBufferNext, invalidate)
│   ├── queue.ts                    # Queue ops, shuffle order, persistence
│   ├── equalizer.ts                # Web Audio API 5-band EQ chain
│   └── sleep-timer.ts              # Timer set/clear/expiry check
├── context/
│   └── MusicPlayerContext.tsx       # React Context wrapping AudioEngine
├── hooks/
│   ├── use-music-shortcuts.ts       # Global keyboard shortcuts (Space, ←→, ↑↓, M, S, R)
│   ├── use-music-progress.ts        # Listen time tracking (accumulate + flush to backend)
│   └── use-music-devices.ts        # Device discovery + transfer + remote commands
└── components/
    ├── MusicView.tsx               # Main music home page
    ├── FullPlayer.tsx              # Expanded player with synced lyrics
    ├── MiniPlayer.tsx              # Sticky bottom mini player
    ├── MusicSearchSpotlight.tsx    # Search overlay modal
    ├── SongContextMenu.tsx         # Right-click context menu
    ├── UserPlaylists.tsx           # User playlist cards
    ├── MusicPrimitives.tsx         # Card, ScrollRow, Section primitives
    ├── MusicAutoStop.tsx           # Auto-stop on video routes
    ├── MusicDeviceSync.tsx         # Global device advertising (headless)
    ├── MusicDevicePicker.tsx       # Spotify Connect-like device picker modal
    ├── Equalizer.tsx               # 5-band EQ panel with presets
    ├── SleepTimer.tsx              # Sleep timer panel with countdown
    ├── MusicDiscordPresence.tsx    # Desktop Discord Rich Presence
    ├── MusicMediaSession.tsx       # Media Session API (lock screen controls)
    └── FloatingDisc.tsx            # Animated floating disc
```

## AudioEngine

Modular singleton managing all playback state. The `AudioEngine` class in `audio-engine.ts` is a thin orchestrator (~430 lines) that delegates to focused sub-modules via a shared `EngineContext` object:

| Module | Responsibility |
|--------|---------------|
| `types.ts` | State interfaces, EQ presets, `EngineContext` contract |
| `playback.ts` | `playTrack`, `fadeOut`, retry logic, `autoContinue` |
| `crossfade.ts` | Pause-aware crossfade loop, abort, audio swap |
| `gapless.ts` | Pre-buffer next track, invalidation |
| `queue.ts` | Add/remove/playNext, shuffle order, persistence |
| `equalizer.ts` | Web Audio API init, connect, disconnect, band control |
| `sleep-timer.ts` | Set/clear timer, frozen-tab fallback check |

The `EngineContext` provides shared mutable state and mutator functions (`update`, `setAudio`, `setNextAudio`, `incrementPlayId`) so sub-modules can operate without circular imports back to the class.

### State

| Field | Type | Description |
|-------|------|-------------|
| `currentTrack` | `MusicTrack \| null` | Currently playing track |
| `queue` | `MusicTrack[]` | Ordered track list |
| `queueIndex` | `number` | Current position in queue |
| `isPlaying` | `boolean` | Playback state |
| `progress` | `number` | 0–100 percentage |
| `duration` | `number` | Track duration in seconds |
| `shuffle` | `boolean` | Shuffle mode |
| `repeat` | `'off' \| 'all' \| 'one'` | Repeat mode |
| `volume` | `number` | 0–1 volume level |
| `crossfadeDuration` | `number` | Crossfade seconds (0 = off, max 12) |
| `gapless` | `boolean` | Gapless playback enabled |
| `sleepTimerEnd` | `number \| null` | Timestamp when sleep timer fires |

### Key Behaviors

- **Gapless Playback**: Pre-buffers the next track's audio element 5 seconds before the current track ends. On `ended` event, instantly swaps to the pre-buffered element with zero silence gap. Disabled when crossfade is active (crossfade handles transitions instead).
- **Crossfade**: Configurable 0–12 seconds. When the current track reaches `crossfadeDuration` seconds from its end, a second audio element loads the next track and begins playing at volume 0. Both tracks fade simultaneously (30 steps) — current fades out, next fades in. After completion, the old element is discarded and the new one becomes primary.
- **Equalizer**: 5-band parametric EQ using Web Audio API `BiquadFilterNode` chain (60Hz lowshelf, 230Hz peaking, 910Hz peaking, 3.6kHz peaking, 14kHz highshelf). Initialized on first user gesture (AudioContext requirement). 12 presets: flat, bass, treble, vocal, rock, electronic, pop, hiphop, jazz, classical, lofi, loudness. Custom per-band gain (-12dB to +12dB). Settings persisted in `localStorage`.
- **Sleep Timer**: Stops playback after a configured duration (15/30/45/60/120 min). Uses `setTimeout` with the engine's `stop()` method. Exposes `sleepTimerEnd` timestamp for UI countdown display.
- **Crossfade (legacy)**: 300ms fade-out of current track on manual track change (`playTrack`), then fade-in of new track (20 steps × 15ms). This is separate from the configurable crossfade which handles automatic transitions.
- **Shuffle**: Fisher-Yates shuffle of indices, current track always first.
- **Queue persistence**: Loads from backend Redis on init (`getUserQueue`), persists additions via `addToUserQueue`. Queue has 24-hour TTL.
- **Auto-continue**: When the queue ends (no repeat), fetches song recommendations via `getSongRecommendations` and continues playback. Falls back to stop if no recommendations available.
- **Progress timer**: 250ms interval updating progress percentage. Also triggers gapless pre-buffer and crossfade start checks.
- **Settings persistence**: Gapless, crossfade duration, and EQ bands are saved to `localStorage` and restored on construction.

## Device Connect (Spotify Connect-like)

Transfer music playback between devices logged into the same account.

### Architecture

```
Mobile (source)                    Server (Socket.IO)              Desktop (target)
───────────────                    ────────────────                ────────────────
MusicDeviceSync advertises ──→     Broadcasts to user room    ←── MusicDeviceSync advertises
                                   Redis hash: music_devices:{userId}

User taps device picker
Selects "Desktop App" ──────→      music:transfer_playback ──────→ Receives track + queue + position
Local stop() called                                                Calls play(track, queue) + seek(pos)

                              ←── music:state_update ←────────────  Broadcasts state every 5s
MiniPlayer shows remote state                                       (track, isPlaying, progress, duration, queue)

User taps play/pause ────────→     music:command ─────────────────→ Executes togglePlay/next/prev/seek/volume/eq
                                                               ←── Immediate state_update response
```

### Socket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `music:device_online` | All → All | `{ socketId, deviceId, deviceName, isPlaying, available }` |
| `music:device_offline` | All → All | `{ socketId }` |
| `music:transfer_playback` | Source → Target | `{ targetSocketId, track, queue, progress, isPlaying }` |
| `music:state_update` | Player → All | `{ socketId, track, isPlaying, progress, duration, queue }` |
| `music:command` | Controller → Player | `{ targetSocketId, command, value? }` |
| `music:request_devices` | Any → All | `{}` (triggers re-advertise + Redis cache response) |
| `music:request_state` | Any → All | `{}` (playing device responds with state_update) |
| `music:playback_started` | Player → All | `{ socketId, deviceId, deviceName, track, isPlaying, progress, duration }` |
| `music:record_time` | Client → Server | `{ seconds, date, forceFlush? }` (listen time tracking) |

### Commands

| Command | Value | Effect |
|---------|-------|--------|
| `toggle_play` | — | Toggle play/pause |
| `next` | — | Skip to next track |
| `prev` | — | Previous track (or restart if >3s elapsed) |
| `seek` | `number` (0–100%) | Seek to percentage position |
| `volume` | `number` (0–1) | Set volume on target device |
| `stop` | — | Stop playback on target |
| `toggle_shuffle` | — | Toggle shuffle mode |
| `cycle_repeat` | — | Cycle repeat: off → all → one → off |
| `play_track` | `MusicTrack` | Play a specific track from queue |
| `eq` | `EqualizerBand[]` | Set equalizer bands on target |

### Command Routing

All remote commands flow through a **single router** in `MusicDeviceSync` (section 7). UI components dispatch `music:remote-command` custom events; the router determines the target and forwards via socket:

```
UI (MiniPlayer, FullPlayer, Shortcuts, MediaSession)
  │
  ▼ window.dispatchEvent('music:remote-command', { command, value })
  │
MusicDeviceSync (single router)
  │ Determines target:
  │   1. Explicit target (sessionStorage 'nightwatch:music-active-target')
  │   2. Auto-synced source (remoteSourceRef from state_update)
  │
  ▼ socket.emit('music:command', { targetSocketId, command, value })
  │
Target Device (MusicDevicePicker's setOnCommand handler)
  │ Executes: togglePlay/next/prev/seek/setVolume/toggleShuffle/cycleRepeat/setEqBands
  │
  ▼ Immediate state_update broadcast (+ regular 5s interval)
```

Reclaim (bringing playback back to this device) uses a separate `music:reclaim-playback` event to avoid conflicts with the command router.

### Components

- **`MusicDeviceSync`** (headless, in layout): Advertises this device globally on every page. Heartbeats every 60s. Emits `device_offline` on unmount/disconnect. Single command router for all remote commands. Handles auto-sync, transfer reception, and reclaim guards.
- **`MusicDevicePicker`** (in MiniPlayer): Center modal showing all online devices. Handles transfer, reclaim, remote state display, and incoming command execution.
- **`MusicMediaSession`** (headless): Syncs track metadata and playback controls to the OS Media Session API. When remote controlling, shows remote track info and forwards media key actions as remote commands.
- **Availability**: Devices on `/watch/`, `/live/`, or `/watch-party/` routes advertise `available: false`. Transfer buttons are disabled for unavailable devices. Incoming transfers are silently rejected.
- **Remote state in MiniPlayer**: When controlling a remote device, the MiniPlayer shows the remote track's title, artist, cover, and play state via `isRemoteControlling` / `remoteTrack` / `remoteIsPlaying` context fields. Progress is interpolated locally (1s/s between 5s state_update intervals).

### Optimistic Updates

When sending commands to a remote device, the UI applies optimistic state changes immediately:

| Command | Optimistic Update |
|---------|-------------------|
| `toggle_play` | Invert `isPlaying` |
| `next` / `prev` | Set `isPlaying: true`, `progress: 0` |
| `seek` | Set `progress` to new value |

After every command, `music:request_state` is emitted to get immediate confirmation from the target (reduces perceived lag from 5s to network RTT).

### Reclaim Guard

When reclaiming playback (transferring back to this device), `playTrack` is async (fetches stream URL). During this window, incoming `state_update` events from the old target could re-enter remote mode. A `reclaimingRef` guard blocks auto-sync during reclaim:

1. Set `true` on `music:reclaim-started` event
2. Cleared on `music:transfer-playing` event (audio actually started)
3. Fallback: auto-cleared after 10s if playback never starts (stream error)

### Reconnection Handling

On socket reconnect:
- Remote state is NOT immediately cleared (avoids UI flash)
- `music:request_devices` and `music:request_state` are re-emitted
- If no `state_update` arrives within 10s, remote state is cleared (device gone)
- `useMusicDevices` auto-reconnects to target by stable `deviceId` when socket ID changes

## Synced Lyrics

Lyrics are fetched through the backend `GET /api/music/lyrics/:id` endpoint which:
1. Tries LRCLIB first (with `title`, `artist`, `duration` query params for accurate matching)
2. Falls back to JioSaavn plain lyrics if LRCLIB has no synced result

The frontend parses the LRC format (`[mm:ss.xx] text`) and renders lyrics in `FullPlayer` with:
- Smooth animated scroll (requestAnimationFrame lerp at 0.08 factor)
- Current line highlighted at 2rem/900 weight, surrounding lines blurred proportionally
- Click-to-seek on any lyric line
- Gradient mask at top/bottom edges

## Backend API Reference

All routes are under `/api/music/`. Authenticated routes require a valid session cookie.

### Discovery (cached in Redis)

| Method | Path | Cache TTL | Description |
|--------|------|-----------|-------------|
| GET | `/home` | 6h | Combined home data (charts, featured, artists, releases, radio) |
| GET | `/charts` | 6h | Top charts |
| GET | `/featured` | 6h | Featured playlists |
| GET | `/artists` | 6h | Top artists |
| GET | `/new-releases` | 1h | New album releases |
| GET | `/trending?type=&language=` | 1h | Trending by type and language |
| GET | `/top-searches` | 1h | Trending search terms |
| GET | `/browse` | 6h | Genre/mood modules |
| GET | `/podcasts` | 6h | Top podcasts |
| GET | `/radio?language=` | 6h | Radio stations |
| GET | `/radio/:name/songs` | 30m | Songs for a radio station |
| GET | `/artist-station?name=` | 30m | Auto-generated artist radio |

### Content

| Method | Path | Description |
|--------|------|-------------|
| GET | `/song/:id` | Single song details |
| GET | `/song/:id/recommendations?limit=` | Similar songs (reco.getreco) |
| GET | `/song/:id/radio` | Song-based radio station |
| GET | `/album/:id` | Album with tracks |
| GET | `/album/:id/recommendations` | Similar albums |
| GET | `/playlist/:id` | Playlist with tracks |
| GET | `/mix/:id` | Algorithmic mix details with tracks |
| GET | `/artist/:id` | Artist bio + top songs + albums |
| GET | `/artist/:id/albums?page=` | Paginated artist albums |
| GET | `/lyrics/:id?title=&artist=&duration=` | Synced lyrics (LRCLIB → JioSaavn fallback) |
| GET | `/stream/:id?bitrate=` | Proxied stream URL |

### Search

| Method | Path | Description |
|--------|------|-------------|
| GET | `/search?q=` | Combined search (songs, albums, playlists) |
| GET | `/search/songs?q=&page=&limit=` | Paginated song search |
| GET | `/search/albums?q=&page=&limit=` | Paginated album search |
| GET | `/search/artists?q=&page=&limit=` | Paginated artist search |
| GET | `/search/playlists?q=&page=&limit=` | Paginated playlist search |
| GET | `/search/more?q=&page=&limit=` | Load more combined results |

### Queue (Redis, per-user, 24h TTL)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/queue` | Get user's persisted queue |
| POST | `/queue` | Append track to queue (Zod-validated) |
| PUT | `/queue` | Replace entire queue (capped at 500 tracks) |

### User Preferences & Activity

| Method | Path | Description |
|--------|------|-------------|
| GET | `/languages` | Get user's preferred music languages |
| PUT | `/languages` | Set preferred languages (invalidates home cache) |
| GET | `/activity` | Get daily listen time history |

### User Playlists (PostgreSQL)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/playlists` | List user's playlists |
| POST | `/playlists` | Create playlist |
| GET | `/playlists/:id` | Playlist detail with tracks |
| PATCH | `/playlists/:id` | Update name/visibility |
| DELETE | `/playlists/:id` | Delete playlist |
| PUT | `/playlists/:id/cover` | Upload cover image (raw binary, 5MB max) |
| POST | `/playlists/:id/tracks` | Add track to playlist |
| DELETE | `/playlists/:id/tracks/:trackId` | Remove track from playlist |

## Stream Proxy

Audio streams are proxied through a Cloudflare Worker to inject the required `Referer: https://www.jiosaavn.com/` header. The CDN blocks direct browser requests without this header.

## JioSaavn API Reference

All music data is sourced from JioSaavn's internal web API (`https://www.jiosaavn.com/api.php`). The backend provider wraps 29 `__call` endpoints:

### Discovery & Browse

| `__call` Endpoint | Backend Method | Description |
|-------------------|---------------|-------------|
| `webapi.getLaunchData` | `getLaunchData()` | Home page super-endpoint (charts, featured, artists, releases, trending, radio) |
| `content.getCharts` | `getCharts()` | Top chart playlists |
| `content.getFeaturedPlaylists` | `getFeaturedPlaylists()` | Curated featured playlists |
| `social.getTopArtists` | `getTopArtists()` | Popular artists |
| `content.getAlbums` | `getNewReleases()` | New album releases |
| `content.getTrending` | `getTrending()` | Trending songs/albums/playlists by language |
| `content.getTopSearches` | `getTopSearches()` | Trending search terms |
| `content.getBrowseModules` | `getBrowseModules()` | Genre/mood browse categories |
| `content.getTopShows` | `getTopPodcasts()` | Top podcast shows |

### Content Details

| `__call` Endpoint | Backend Method | Description |
|-------------------|---------------|-------------|
| `song.getDetails` | `getSongDetails()` | Single song metadata + encrypted media URL |
| `content.getAlbumDetails` | `getAlbum()` | Album metadata + track list |
| `playlist.getDetails` | `getPlaylist()` | Playlist metadata + track list (up to 50) |
| `content.getMixDetails` | `getMixDetails()` | Algorithmic mix playlist + tracks |
| `artist.getArtistPageDetails` | `getArtist()` / `getArtistAlbums()` | Artist bio, top songs, albums (paginated) |
| `lyrics.getLyrics` | `getLyrics()` | Plain-text lyrics for a song |

### Streaming

| `__call` Endpoint | Backend Method | Description |
|-------------------|---------------|-------------|
| `song.getDetails` | `getStreamUrl()` | Fetches encrypted media URL from song details |
| `song.generateAuthToken` | `getStreamUrl()` | Generates signed streaming URL from encrypted URL |

### Search

| `__call` Endpoint | Backend Method | Description |
|-------------------|---------------|-------------|
| `search.getResults` | `search()` / `searchSongs()` | Song search results |
| `autocomplete.get` | `search()` | Supplementary album/playlist results for combined search |
| `search.getMoreResults` | `searchMore()` | Paginated load-more for song results |
| `search.getAlbumResults` | `searchAlbums()` | Album-specific search |
| `search.getArtistResults` | `searchArtists()` | Artist-specific search |
| `search.getPlaylistResults` | `searchPlaylists()` | Playlist-specific search |

### Radio & Recommendations

| `__call` Endpoint | Backend Method | Description |
|-------------------|---------------|-------------|
| `webradio.getFeaturedStations` | `getRadioStations()` | Featured radio stations by language |
| `webradio.createFeaturedStation` | `getRadioSongs()` | Create station from featured station name |
| `webradio.createArtistStation` | `createArtistStation()` | Create station from artist name |
| `webradio.createEntityStation` | `createSongRadio()` | Create station from a specific song |
| `webradio.getSong` | (used internally) | Fetch tracks from a created station (up to 20) |
| `reco.getreco` | `getSongRecommendations()` | Similar songs for a given song ID |
| `reco.getAlbumReco` | `getAlbumRecommendations()` | Similar albums for a given album ID |

## Discover / Explore Songs (Swipe-Based Recommendation Engine)

A Tinder-style song discovery system where users swipe right (like) or left (skip) on song cards. The backend builds personalized feeds using JioSaavn's radio/recommendation APIs, seeded from the user's like history.

### Frontend Structure

```
src/features/music-discover/
├── api.ts                          # API functions (feed, swipe, listen, liked)
├── hooks/
│   └── use-discover-preview.ts     # Audio preview (preload, play, fade, pause/resume)
└── components/
    ├── DiscoverView.tsx            # Orchestrator (state, swipe logic, keyboard shortcuts)
    ├── DiscoverCard.tsx            # Current song card (image, info, swipe indicators, attribution)
    ├── DiscoverCardStack.tsx       # Background cards (2nd & 3rd in stack)
    └── DiscoverActions.tsx         # 5 action buttons (dislike, undo, pause, playlist, like)
```

### UI Components

| Component | Responsibility |
|-----------|---------------|
| `DiscoverView` | State management, swipe logic, drag handlers, keyboard shortcuts, feed pagination |
| `DiscoverCard` | Visual card with song image, title, artist, language, year, seed attribution, swipe overlay |
| `DiscoverCardStack` | Stacked background cards with depth animation |
| `DiscoverActions` | 5 buttons: ✕ skip, ↺ undo, ⏸ pause/play, ＋ add-to-playlist, ♥ like |

### Action Buttons

| Button | Icon | Action | Haptic |
|--------|------|--------|--------|
| Skip | ✕ (red) | Swipe left / dislike | `hapticMedium` |
| Undo | ↺ | Revert last swipe (5s window) | `hapticLight` |
| Pause/Play | ⏸/▶ | Toggle audio preview | — |
| Add to Playlist | ＋ | Open playlist picker, add current song | `hapticLight` |
| Like | ♥ (green) | Swipe right / like | `hapticSuccess` |

### Audio Preview

- Preloads next 3 songs in the feed (`PRELOAD_AHEAD = 3`)
- Starts playback from 33% into the song duration
- 20-second preview with gradual fade-out in the last 2 seconds
- Audio unlocked on first user interaction (autoplay policy)
- Pause/resume via action button

### Swipe Mechanics

- Drag threshold: 80px triggers swipe
- Haptic feedback at threshold crossing (`hapticLight`)
- Card animates off-screen with rotation (350ms)
- Next card scales up from background stack
- Keyboard: ArrowLeft = skip, ArrowRight = like, Ctrl+Z = undo
- Client-side `swipedIds` ref prevents double-swipes and deduplicates feed

### Undo System

- 5-second window after each swipe
- Toast notification "Added to your taste ♪" with Undo action button
- Ctrl+Z keyboard shortcut
- Reverts `currentIndex` and removes song from `swipedIds`

### Seed Attribution

Cards display "Because you liked {seed song title}" when the backend provides a `seed` field, showing users why each song was recommended.

### API Endpoints (Frontend → Backend)

| Function | Method | Path | Description |
|----------|--------|------|-------------|
| `getDiscoverFeed(limit)` | GET | `/api/music/discover/feed?limit=` | Get next batch of songs |
| `swipeSong(songId, action, meta)` | POST | `/api/music/discover/swipe` | Record like/dislike with artist/language |
| `recordListen(songId)` | POST | `/api/music/discover/listen` | Record implicit listen (60%+ played) |
| `getLikedSongs(limit, cursor)` | GET | `/api/music/discover/liked?limit=&cursor=` | Paginated liked songs |

### Implicit Listen Tracking

The `MusicPlayerContext` monitors playback progress. When a song reaches 60% completion:
1. `recordListen(songId)` fires once per song per session (deduped via `useRef`)
2. Backend stores in `music_listens` collection (skips if already explicitly swiped)
3. Listen history songs are used as additional seeds in the discover feed algorithm

### Backend: Feed Algorithm

```
User opens Discover
  ├── 1. Song Radio (3 seeds: 2 rotating + 1 recent)
  │     ├── Uses ctx=android for JioSaavn webradio.createEntityStation
  │     ├── Returns 30 songs per seed, 20+ unique artists each
  │     └── Rotating seed offset stored in Redis (cycles through ALL likes)
  │
  ├── 2. Implicit Listen Seed (1 random from last 20 listens)
  │     └── Song radio from a song user played 60%+
  │
  ├── 3. Featured Radio Station (1 random, language-matched)
  │     └── ~20 songs from genre-based station
  │
  ├── 4. Trending (15 songs, language-matched)
  │
  └── 5. Featured Playlist (1 random editorial, 15 songs)

  Post-processing:
  ├── Filter: already-swiped songs excluded
  ├── Filter: artist soft-ban (3+ dislikes from same artist)
  ├── Sort: language ratio (70% preferred, 30% diverse)
  ├── Reorder: artist spacing (no same artist within 3 positions)
  └── Cache: remaining songs in Redis pool (1h TTL), serve 20
```

### Backend: Rotating Seed Offset

- Redis key: `discover:seed_offset:{userId}` (7-day TTL)
- Each feed request advances offset by 2
- Cycles through ALL liked songs over time
- User with 500 likes → 250 unique feed sessions before repeat
- Resets to 0 after full cycle

### Backend: Artist Soft-Ban

- Tracks dislike count per primary artist from swipe history
- 3+ dislikes from same artist → songs from that artist excluded from feed
- Cached in Redis: `discover:banned_artists:{userId}` (7-day TTL)

### Backend: Data Storage

| Collection | Doc ID Pattern | Fields | Cap |
|------------|---------------|--------|-----|
| `music_swipes` | `{userId}_{songId}` | userId, songId, action, artist, language, createdAt | 1000/user |
| `music_listens` | `{userId}_{songId}` | userId, songId, createdAt | 1000/user |

### Redis Keys (Discover)

| Key | TTL | Purpose |
|-----|-----|---------|
| `discover:pool:{userId}` | 1h | Cached song pool for pagination |
| `discover:seed_offset:{userId}` | 7d | Rotating seed position through likes |
| `discover:banned_artists:{userId}` | 7d | Soft-banned artist list |

## Internationalization

Music UI strings are translated across 14 languages via `next-intl`. Translation files are at `src/i18n/messages/{locale}/music.json`.

## Desktop Integration

- **Discord Rich Presence**: Shows current track title, artist, album art, and "Listening on Nightwatch" via Electron's `desktopBridge`.
- **Media Keys**: System media key controls (play/pause, next, previous) handled by Electron.
- **Auto-Stop**: Music automatically stops when navigating to video playback routes (`/watch/`, `/live/`).

## Caching Strategy

| Layer | Key Pattern | TTL | Purpose |
|-------|-------------|-----|---------|
| Redis | `music:home` | 6h | Home page data |
| Redis | `music:charts` | 6h | Charts |
| Redis | `music:featured` | 6h | Featured playlists |
| Redis | `music:artists` | 6h | Top artists |
| Redis | `music:releases` | 1h | New releases |
| Redis | `music:trending:{type}:{lang}` | 1h | Trending content |
| Redis | `music:artist:{id}` | 1h | Artist details |
| Redis | `music:reco:{songId}` | 1h | Song recommendations |
| Redis | `music:album-reco:{albumId}` | 1h | Album recommendations |
| Redis | `music:mix:{id}` | 1h | Mix details |
| Redis | `music:artist-station:{name}` | 30m | Artist radio station |
| Redis | `music:radio:songs:{name}` | 30m | Radio station songs |
| Redis | `music:queue:{userId}` | 24h | User queue |
| Redis | `music:lang:{userId}` | ∞ | User language preference |
| Redis | `music_devices:{userId}` | 5m | Device registry (refreshed by heartbeat) |
| Client | `musicHomeCache` | 10m | Home page data (avoids redundant fetches) |
| Client | `trendingCache` | 10m | Trending data |
| Client | `browseCache` | 10m | Browse modules |

## Performance Optimizations

### Split Progress Context

The `MusicPlayerContext` separates high-frequency progress updates (every 250ms) from stable state (track, queue, controls) using two React contexts:

```
MusicPlayerContext (stable)          MusicProgressContext (250ms)
├── currentTrack                     ├── progress (0–100%)
├── queue                            └── duration (seconds)
├── isPlaying
├── shuffle, repeat, volume
└── all control callbacks
```

The engine subscriber uses field-level comparison to avoid unnecessary `setState` calls for the main context. Only components that need real-time progress (MiniPlayer, FullPlayer, MusicMediaSession) subscribe to `MusicProgressContext` via `useMusicPlaybackProgress()`. All other consumers only re-render when actual state changes occur.

The main context exposes `progress` and `duration` as getters backed by a ref — they always return the latest value without being reactive dependencies.

### State Broadcast Throttling

Device state updates (`music:state_update`) are throttled to every 5 seconds rather than every 250ms progress tick. The MiniPlayer interpolates remote progress locally (incrementing 1s/s between updates) for smooth progress bar animation without network overhead.

## Device Connect — Security Model

### Authentication

All device sync events are scoped to the authenticated user's Socket.IO room (`user:{userId}`). The backend enforces:

- **`music:command`**: Verifies `targetSocket.data.userId === socket.data.userId` before forwarding. Prevents cross-user command injection.
- **`music:transfer_playback`**: Same userId ownership check. A user cannot transfer playback to another user's device.
- **`music:state_update`**: Broadcast only to `socket.to(user:{userId})` — never to other users.

Guest users (`socket.data.isGuest` or `userId.startsWith('guest:')`) are excluded from all device sync features.

### Device Name Collision Handling

When a device advertises with `music:device_online`, the backend checks existing Redis entries for the same `deviceName`. If found under a different `socketId` (e.g., page refresh creating a new socket), the stale entry is removed and a `music:device_offline` event is emitted for the old socket ID. This prevents duplicate device entries in the picker.

### Ghost Device Cleanup

On `music:request_devices`, the backend verifies each cached Redis entry's socket is still connected (`io.sockets.sockets.get(sid)`). Stale entries (from server restarts or unclean disconnects) are pruned from Redis and not returned to the requester.

### Single-Device Enforcement

When a device starts playing a new track, it emits `music:playback_started`. All other devices in the user's room receive this event and stop local playback via the `music:remote-takeover` custom event. This ensures only one device plays at a time (Spotify Connect behavior). The `prevTrackIdRef` is reset on stop so replaying the same track correctly broadcasts to other devices.

### Auto-Sync on Page Load

When a new device connects (or reconnects), it emits `music:request_state`. The currently-playing device responds with a `music:state_update` containing the full playback state (including queue). The new device enters remote-controlling mode, showing what's playing elsewhere without starting local playback.

Auto-sync is blocked when:
- The device is playing locally (`currentTrack` exists and `isPlaying` is true)
- The device is in the process of reclaiming playback (`reclaimingRef` guard active)

## Listen Time Tracking

Daily music listening time is tracked per-user for activity graphs.

### Frontend (`use-music-progress` hook)

- Accumulates seconds in a local buffer while `isPlaying` is true (1-second intervals)
- Handles midnight boundary crossing (splits elapsed time across dates)
- Ignores jumps > 30 seconds (sleep/wake, tab freeze) to prevent inflated stats
- Flushes to backend every 5 seconds via `music:record_time` socket event
- Force-flushes on pause, stop, and unmount
- Retries pending data on socket reconnection

### Backend (`music:record_time` handler)

- Zod-validated payload: `{ seconds: number, date: "YYYY-MM-DD" }`
- Rate-limited: max 1 event per second per socket
- Atomic upsert: `INSERT ... ON CONFLICT (userId, date) DO UPDATE SET listenSeconds = listenSeconds + $seconds`
- Guest users silently ignored (ack with `success: true`)

## Media Ducking

Music volume is automatically reduced during voice interactions:

### Ask AI Ducking

When the Ask AI voice assistant activates, it dispatches `ask-ai:duck` with `{ duck: true }`. The music volume is reduced to `Math.min(currentVol * 0.15, 0.1)`. When the AI finishes, `{ duck: false }` restores the original volume. On `stop()`, the volume is restored to the pre-duck level before clearing the duck state, ensuring the next track starts at the correct volume.

### DM Voice Call Ducking

When a DM voice call starts (`dm-call:start`), music is paused entirely (not just ducked). When the call ends (`dm-call:end`), playback resumes if it was playing before the call.

## Ask AI Integration

The music system responds to custom events from the Ask AI voice assistant:

| Event | Payload | Action |
|-------|---------|--------|
| `ask-ai:play-music` | `{ track }` or `{ songId }` | Play a specific track |
| `ask-ai:play-playlist` | `{ tracks: MusicTrack[] }` | Play a playlist |
| `ask-ai:music-control` | `{ action: 'pause'\|'resume'\|'next'\|'previous'\|'stop' }` | Control playback |
| `ask-ai:duck` | `{ duck: boolean }` | Duck/restore volume |

The `pause` and `resume` actions check current state before acting — `pause` only pauses if playing, `resume` only resumes if paused. This prevents state inversion from redundant AI commands.

## Equalizer — Crossfade Behavior

During an active crossfade transition, the incoming audio element connects directly to `AudioContext.destination` (bypassing the shared EQ filter chain). This prevents audio routing conflicts from two sources feeding the same `BiquadFilterNode` instances simultaneously. After the crossfade swap completes, `connectEqualizer()` properly re-routes the new primary audio through the full EQ chain.

The old audio element's `MediaElementAudioSourceNode` is explicitly disconnected before the swap to prevent memory leaks in the Web Audio API graph.

### Equalizer — Remote Control

When remote controlling another device, EQ changes are forwarded via `music:remote-command` with `{ command: 'eq', value: EqualizerBand[] }`. Remote EQ commands are throttled to 150ms during slider drag to avoid flooding the socket. The receiving device applies bands via `initEqualizer()` + `setEqBands()` and dispatches `music:eq-updated` to sync any open Equalizer panels on other controlling devices.

## Queue Validation

The `POST /queue` endpoint validates incoming track objects with a Zod schema:

```typescript
{
  id: string (max 64 chars),
  title: string (max 500 chars),
  artist: string (max 500 chars),
  album: string (max 500 chars),
  image: string (valid URL, max 2000 chars),
  duration: number (non-negative)
}
```

Additional fields (e.g., `albumId`, `language`, `year`, `hasLyrics`) are passed through. The queue is capped at 500 tracks per user.

## Mobile Integration

- **Media Session API**: Track metadata, playback state, and position are synced to the OS via `navigator.mediaSession`. Lock screen controls (play/pause/next/prev) are registered. Position state is updated reactively via the progress context. When remote controlling another device, shows the remote track info and forwards media key actions as `music:remote-command` events.
- **Background Playback**: On Capacitor (iOS/Android), the audio element continues playing when the app is backgrounded. Lock screen controls remain functional.
- **Keyboard Shortcuts**: Global shortcuts registered via `useMusicShortcuts` — Space (play/pause), ←→ (prev/next), ↑↓ (volume ±10%), M (mute), S (shuffle), R (repeat cycle). Suppressed when input/textarea is focused. When remote controlling, all shortcuts dispatch `music:remote-command` events instead of calling local engine methods.
