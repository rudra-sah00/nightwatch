# Remote Control

Mobile-only feature allowing Capacitor (iOS/Android) users to remotely control video playback on their desktop/laptop devices of the same account.

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
                                                                     + every 5s for time sync
UI updates (play/pause icon, progress)

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
│   └── use-remote-commander.ts                 # Mobile: send commands + receive state
├── components/
│   ├── RemoteDisc.tsx                          # Floating disc (bottom-left) + overlay trigger
│   └── RemoteControlSheet.tsx                  # Full-screen overlay with controls
└── index.ts                                    # Barrel exports
```

## Desktop Side (`use-remote-control-listener`)

Called inside `WatchVODPlayer` and `WatchLivePlayer` (guarded by `!checkIsMobile()`).

- **On mount**: Emits `remote:stream_advertise` with metadata + player state.
- **Heartbeat**: Re-emits every 60s via `setInterval` to keep Redis hash alive.
- **State updates**: Emits `remote:state_update` instantly on play/pause, throttled to 5s for time position.
- **Command handling**: Listens for `remote:command` and maps to `playerHandlers` (togglePlay, skip, seek) or `onNextEpisode`.
- **On unmount**: Emits `remote:stream_ended`.
- **Payload ref pattern**: Uses `useRef` for the advertise payload to avoid effect re-runs on state changes (which would emit `stream_ended` on every pause).

## Mobile Side

### `RemoteDisc` (floating button)

- Renders only when `checkIsMobile() && streams.length > 0`.
- Hidden on `/watch/` and `/live/` routes (user is streaming themselves).
- Same size as music FloatingDisc (`w-16 h-16`), positioned bottom-left.
- Shows the stream's poster spinning at 4s/revolution when playing.
- Tapping opens the `RemoteControlSheet` overlay.

### `RemoteControlSheet` (overlay)

- Full-screen `fixed inset-0` overlay with `slide-in-from-bottom` animation (same as music FullPlayer).
- **Device picker**: If multiple desktops streaming, shows a list to select which one to control.
- **Controls**: Poster, title/metadata, progress bar, play/pause, seek ±10s, next episode (series only).
- **Livestream handling**: Hides progress bar and seek buttons, shows "LIVE" badge.
- **Stream ended**: Shows toast "Playback ended on desktop" and auto-closes overlay.

### `use-remote-streams`

- Maintains a `Map<socketId, RemoteStreamAdvertise>` of active desktop streams.
- Emits `remote:request_advertise` on mount, socket reconnect, and app foreground resume (Capacitor).
- Provides `streams`, `activeStream`, `selectStream`.

### `use-remote-commander`

- Accepts a target stream, listens for `remote:state_update` from that socket.
- Provides `state` (isPlaying, currentTime, duration) and `sendCommand`.
- Optimistic UI updates on command send.

## Backend (`remote.handler.ts`)

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
| Multiple desktops streaming | Device picker shown in overlay |
| Watch party playback | `useRemoteControlListener` only runs in `WatchVODPlayer`/`WatchLivePlayer`, not in watch party's `Player.Root` |
| Socket reconnection | Mobile re-emits `request_advertise`; desktop re-advertises on heartbeat |
| Rapid play/pause | Optimistic UI + server state_update corrects within 5s |
| Livestream (no duration) | Progress bar and seek buttons hidden; "LIVE" badge shown |

## Integration Points

- **`WatchVODPlayer`**: Calls `useRemoteControlListener` with `onNextEpisode: nextEpisode.play` for series.
- **`WatchLivePlayer`**: Calls `useRemoteControlListener` without `onNextEpisode`.
- **Protected layout**: Renders `<RemoteDisc />` globally (only visible on mobile when streams active).
