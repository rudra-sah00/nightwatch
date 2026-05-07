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
│   └── audio-engine.ts             # AudioEngine class (playback, queue, gapless, crossfade, EQ, sleep)
├── context/
│   └── MusicPlayerContext.tsx       # React Context wrapping AudioEngine
├── hooks/
│   ├── use-music-shortcuts.ts       # Global keyboard shortcuts (Space, ←→, ↑↓, M, S, R)
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
    └── FloatingDisc.tsx            # Animated floating disc
```

## AudioEngine

Singleton class managing all playback state via a single `HTMLAudioElement`.

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
- **Equalizer**: 5-band parametric EQ using Web Audio API `BiquadFilterNode` chain (60Hz lowshelf, 230Hz peaking, 910Hz peaking, 3.6kHz peaking, 14kHz highshelf). Initialized on first user gesture (AudioContext requirement). 6 presets: flat, bass, treble, vocal, rock, electronic. Custom per-band gain (-12dB to +12dB). Settings persisted in `localStorage`.
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

                              ←── music:state_update ←────────────  Broadcasts state every render
MiniPlayer shows remote state                                       (track, isPlaying, progress, duration)

User taps play/pause ────────→     music:command ─────────────────→ Executes togglePlay/next/prev/seek
```

### Socket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `music:device_online` | All → All | `{ socketId, deviceName, isPlaying, available }` |
| `music:device_offline` | All → All | `{ socketId }` |
| `music:transfer_playback` | Source → Target | `{ targetSocketId, track, queue, progress, isPlaying }` |
| `music:state_update` | Player → All | `{ socketId, track, isPlaying, progress, duration }` |
| `music:command` | Controller → Player | `{ targetSocketId, command, value? }` |
| `music:request_devices` | Any → All | `{}` (triggers re-advertise) |

### Components

- **`MusicDeviceSync`** (headless, in layout): Advertises this device globally on every page. Heartbeats every 60s. Emits `device_offline` on unmount/disconnect.
- **`MusicDevicePicker`** (in MiniPlayer): Center modal showing all online devices. Handles transfer, remote state display, and remote controls (play/pause/next/prev).
- **Availability**: Devices on `/watch/`, `/live/`, or `/watch-party/` routes advertise `available: false`. Transfer buttons are disabled for unavailable devices. Incoming transfers are silently rejected.
- **Remote state in MiniPlayer**: When controlling a remote device, the MiniPlayer shows the remote track's title, artist, cover, and play state via `isRemoteControlling` / `remoteTrack` / `remoteIsPlaying` context fields.

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
| POST | `/queue` | Append track to queue |

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
