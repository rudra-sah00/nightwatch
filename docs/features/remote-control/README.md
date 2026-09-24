# Remote Control

Mobile-only feature allowing Capacitor (iOS/Android) users to remotely control video playback on their desktop/laptop devices of the same account.

**Source:** `src/features/remote-control/`

## Overview

When a user is watching a movie, series, or livestream on their desktop, a floating disc appears on their mobile device. Tapping it opens a full-screen overlay with playback controls — play/pause, seek ±10s, and next episode (for series).

This feature is **one-directional**: mobile controls desktop. Desktop cannot control mobile. Watch party playback is excluded — only solo playback is controllable.

## Architecture

```
Mobile (Capacitor)                 Server (Socket.IO)              Desktop (Electron/Browser)
──────────────────                 ────────────────                ──────────────────────────
                                                                   Player mounts →
                                                                   useRemoteControlListener
                                                                   emit remote:stream_advertise
                                   ← broadcast to user room ←

RemoteDisc appears (stream detected)
useRemoteStreams listens

User taps disc → overlay opens
RemoteControlSheet renders

User taps Play/Pause ──────────→   remote:command ────────────────→ playerHandlers.togglePlay()
User taps Seek +10s ───────────→   remote:command ────────────────→ playerHandlers.skip(10)
User taps Next Episode ────────→   remote:command ────────────────→ nextEpisode.play()

                                ←── remote:state_update ←────────── Emits on play/pause (instant)
                                                                     + throttled 5s for time sync
Player unmounts ──────────────────────────────────────────────────→ emit remote:stream_ended
                                ← broadcast to user room ←
RemoteDisc disappears
```

## Socket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `remote:stream_advertise` | Desktop → Mobile | `{ socketId, deviceName, type, title, posterUrl, movieId, seriesId?, season?, episode?, episodeTitle?, isPlaying, currentTime, duration }` |
| `remote:stream_ended` | Desktop → Mobile | `{ socketId }` |
| `remote:command` | Mobile → Desktop | `{ targetSocketId, command, seekSeconds?, seekTo? }` |
| `remote:state_update` | Desktop → Mobile | `{ socketId, isPlaying, currentTime, duration }` |
| `remote:request_advertise` | Mobile → Desktop | `{}` (signal for desktops to re-advertise) |
| `remote:tv_available` | TV → Phone/Desktop | `{ socketId, deviceName }` |
| `remote:cast_content` | Phone/Desktop → TV | `{ targetSocketId, movieId, streamUrl?, title }` |

All event names are defined as constants in `types.ts` (`REMOTE_EVENTS`).

### Commands

| Command | Effect |
|---------|--------|
| `play` | Resume if paused |
| `pause` | Pause if playing |
| `toggle_play` | Toggle play/pause |
| `seek_forward` | Skip forward by `seekSeconds` (default 10) |
| `seek_backward` | Skip backward by `seekSeconds` (default 10) |
| `seek_to` | Seek to absolute `seekTo` seconds |
| `next_episode` | Trigger next episode (series only) |

## Frontend Structure

```
src/features/remote-control/
├── types.ts                                    # Shared types + REMOTE_EVENTS constants
├── hooks/
│   ├── use-remote-control-listener.ts          # Desktop: advertise + respond to commands
│   ├── use-remote-streams.ts                   # Mobile: track active desktop streams
│   ├── use-remote-commander.ts                 # Mobile: send commands + receive state
│   └── use-available-tvs.ts                    # Mobile/Desktop: discover available TVs for video cast
└── components/
    ├── RemoteDisc.tsx                          # Floating disc (bottom-left) + overlay trigger
    ├── RemoteControlSheet.tsx                  # Full-screen overlay with controls
    └── PlayOnTvButton.tsx                      # "Play on TV" button (mobile portrait player only)
```

## Desktop Side (`use-remote-control-listener`)

Called inside `WatchVODPlayer` and `WatchLivePlayer` (guarded by `!checkIsMobile()`).

- **On mount**: Emits `remote:stream_advertise` with metadata + player state. Device name is `'Desktop App'` when Electron is detected, `'Browser'` otherwise.
- **Heartbeat**: Re-emits every **30 seconds** via `setInterval` to keep Redis hash alive.
- **State updates**: Emits `remote:state_update` instantly on play/pause or seek (>2s jump detected), throttled to 5s for normal time position changes.
- **Command handling**: Listens for `remote:command` and maps to `playerHandlers` (togglePlay, skip, seek) or `onNextEpisode`. Emits a state update 150ms after each command to give the player time to update.
- **Reconnect**: Re-advertises immediately on socket `connect` event (new `socketId`, mobile needs fresh data).
- **On unmount**: Emits `remote:stream_ended`.
- **Payload ref pattern**: Uses `useRef` for the advertise payload to avoid effect re-runs on state changes (which would emit `stream_ended` + re-`stream_advertise` on every pause).

## Mobile Side

### `RemoteDisc` (floating button)

`components/RemoteDisc.tsx`

- Renders only when `checkIsMobile() && streams.length > 0`.
- Hidden on `/watch/` and `/live/` routes (user is streaming themselves).
- Same size as music FloatingDisc (`w-16 h-16`), positioned bottom-left with `z-[201]`.
- Shows the stream's poster spinning at 4s/revolution when playing. Falls back to a `Cast` icon.
- Green pulse dot indicates active connection.
- Tapping opens the `RemoteControlSheet` overlay.

### `RemoteControlSheet` (overlay)

`components/RemoteControlSheet.tsx`

- Full-screen `fixed inset-0` overlay with `slide-in-from-bottom` animation (same as music FullPlayer).
- Respects safe area insets via `env(safe-area-inset-top/bottom)`.
- **Device picker**: If multiple desktops streaming, shows a list to select which one to control.
- **Controls**: Poster, title/metadata, progress bar, play/pause, seek ±10s, next episode (series only).
- **Livestream handling**: Hides progress bar and seek buttons, shows "LIVE" badge with pulsing red dot.
- **Stream ended**: Shows toast "Playback ended on desktop" and auto-closes overlay.
- Uses `formatTime` from `src/features/music/utils` for progress display.

### `use-remote-streams`

- Maintains a `Map<socketId, RemoteStreamAdvertise>` of active desktop streams.
- Emits `remote:request_advertise` on mount with retry (immediate + 1s + 3s backoff).
- Re-requests on socket reconnect (clears stale streams, retries at 0 + 1.5s).
- Re-requests on Capacitor app foreground resume via `mobileBridge.onAppStateChange`.
- Deduplicates by device name (reconnect produces new `socketId`).
- Provides `streams`, `activeStream`, `selectStream`.

### `use-remote-commander`

- Accepts a target stream, listens for `remote:state_update` and `remote:stream_advertise` from that socket.
- Ignores server state updates for 2 seconds after sending a command (prevents stale updates overwriting optimistic UI).
- **Local interpolation**: increments `currentTime` every second while playing, so the progress bar moves smoothly between server updates.
- Provides `state` (isPlaying, currentTime, duration) and `sendCommand`.
- Optimistic UI updates on every command.

## Video Cast (Phone → TV)

Separate from the remote control feature (which controls desktop from mobile), Video Cast sends content to the TV:

- **`use-tv-video-presence`** (`src/platforms/smart-tv/hooks/use-tv-video-presence.ts`, TV side): Broadcasts `remote:tv_available` every 60s with `{ socketId, deviceName: 'Android TV' }`. Listens for `remote:cast_content` → navigates to `/watch/{movieId}`.
- **`use-available-tvs`** (Mobile side): Tracks available TVs via `Map<socketId, TvAvailablePayload>`. Clears stale entries every 90s. Provides `tvs` array and `castToTv(socketId, { movieId, title })`.
- **`PlayOnTvButton`**: Only renders in mobile portrait video player when a TV is online. Tapping sends `remote:cast_content` to the first available TV. Hidden completely when no TVs are available.

## Backend (`remote.handler.ts`)

> The following describes the backend; it is not part of the frontend codebase.

Registered in `websocket/index.ts`. Handles all remote events for both video and music.

### Redis Storage

| Key | Type | TTL | Purpose |
|-----|------|-----|---------|
| `remote_streams:{userId}` | Hash (socketId → JSON) | 300s | Active video streams per user |
| `music_devices:{userId}` | Hash (socketId → JSON) | 300s | Active music devices per user |

### Disconnect Cleanup

On socket disconnect, the handler:
1. Removes the socket from `remote_streams:{userId}` hash.
2. Broadcasts `remote:stream_ended` to the user room.
3. Removes the socket from `music_devices:{userId}` hash.
4. Broadcasts `music:device_offline` to the user room.

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Desktop crashes (no cleanup) | Redis 300s TTL auto-expires the hash entry |
| Mobile app backgrounds | On foreground resume, re-emits `request_advertise` via `mobileBridge.onAppStateChange` |
| Desktop navigates away | `useEffect` cleanup emits `stream_ended`; overlay shows toast and closes |
| Multiple desktops streaming | Device picker shown in overlay; deduplication by device name |
| Watch party playback | `useRemoteControlListener` only runs in `WatchVODPlayer`/`WatchLivePlayer`, not in watch party |
| Socket reconnection | Mobile re-requests + retries; desktop re-advertises on `connect` event |
| Rapid play/pause | Optimistic UI + 2s ignore window for stale server updates |
| Livestream (no duration) | Progress bar and seek buttons hidden; "LIVE" badge shown |

## Integration Points

- **`WatchVODPlayer`**: Calls `useRemoteControlListener` with `onNextEpisode` for series.
- **`WatchLivePlayer`**: Calls `useRemoteControlListener` without `onNextEpisode`.
- **Protected layout**: Renders `<RemoteDisc />` globally (only visible on mobile when streams active).
- **Watch page** (`/watch/[id]`): Renders `<PlayOnTvButton />` in mobile portrait section (under video).
- **`TvRootLayout`** (`src/platforms/smart-tv/layouts/`): Mounts `useTvVideoPresence()` globally for TV cast availability.

## Related Docs

- [Watch](../watch/README.md) — VOD player integration
- [Livestream](../livestream/README.md) — live player integration
- [Smart TV](../../platforms/SMART_TV.md) — TV cast target
- [Friends](../friends/README.md) — uses the same Socket.IO connection
- [Mobile](../../platforms/MOBILE.md) — Capacitor platform
