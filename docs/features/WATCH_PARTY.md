# Watch Party

Decentralized peer-to-peer watch party system built on Agora RTM (Real-Time Messaging) for signaling and Agora RTC for voice/video. The host's playback state is the single source of truth; guests receive state updates via RTM and apply predictive drift correction to stay in sync.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    WatchPartyClient                         │
│  (Dynamic imports: ActiveWatchParty, WatchPartyLobby)       │
│  ┌─────────────────────┐  ┌──────────────────────────────┐  │
│  │   WatchPartySidebar │  │    WatchPartyVideoArea       │  │
│  │  ┌───────────────┐  │  │  ┌────────────────────────┐  │  │
│  │  │  SidebarTabs  │  │  │  │     Player.Root        │  │  │
│  │  ├───────────────┤  │  │  │  ┌──────────────────┐  │  │  │
│  │  │ Chat / People │  │  │  │  │  Player.Video    │  │  │  │
│  │  │ Soundboard    │  │  │  │  │  FloatingEmojis  │  │  │  │
│  │  │ Sketch        │  │  │  │  │  SketchOverlay   │  │  │  │
│  │  ├───────────────┤  │  │  │  │  Player.Controls │  │  │  │
│  │  │ MediaControls │  │  │  │  └──────────────────┘  │  │  │
│  │  └───────────────┘  │  │  └────────────────────────┘  │  │
│  └─────────────────────┘  └──────────────────────────────┘  │
│                     FloatingChat (overlay)                   │
└─────────────────────────────────────────────────────────────┘
```

**Signaling layer:** All real-time events (play, pause, seek, chat, sketch, emoji, soundboard) are transmitted as JSON-encoded Agora RTM channel messages. The discriminated union type `RTMMessage` in `room/types/rtm-messages.ts` defines every possible message shape.

**Backend persistence:** State mutations that require validation (join, approve, kick, content update) use REST calls via `room/services/watch-party.api.ts`. RTM handles the real-time broadcast; REST handles the durable write.

## Directory Structure

```
src/features/watch-party/
├── components/           # UI components
│   ├── WatchPartyClient.tsx
│   ├── ActiveWatchParty.tsx
│   ├── WatchPartyVideoArea.tsx
│   ├── WatchPartySidebar.tsx
│   ├── SidebarTabs.tsx
│   ├── MediaControls.tsx
│   ├── ParticipantView.tsx
│   ├── VideoGrid.tsx
│   ├── WatchPartyLobby.tsx
│   ├── WatchPartyLoading.tsx
│   ├── WatchPartySettings.tsx
│   └── PendingRequests.tsx
├── hooks/                # Component-level hooks
├── chat/                 # Chat subsystem
│   ├── components/
│   │   ├── WatchPartyChat.tsx
│   │   └── FloatingChat.tsx
│   └── hooks/
│       ├── useWatchPartyChat.ts      # RTM chat lifecycle (send, receive, typing)
│       ├── use-watch-party-chat.ts   # Local UI state (input, emoji picker, scroll)
│       └── use-chat-scroll.ts
├── room/                 # Room lifecycle & sync
│   ├── hooks/
│   │   ├── useWatchParty.ts          # Master orchestrator
│   │   ├── useWatchPartyLifecycle.ts # Create/join/leave/cancel
│   │   ├── useWatchPartyMembers.ts   # Approve/reject/kick + presence
│   │   ├── useWatchPartySync.ts      # Host↔guest playback sync
│   │   ├── usePredictiveSync.ts      # NTP-style drift correction
│   │   ├── useWatchPartyHostSync.ts  # Host video event → RTM broadcast
│   │   ├── useClockSync.ts           # Server clock offset calibration
│   │   └── useWatchPartyFullscreen.ts
│   ├── services/
│   │   └── watch-party.api.ts        # REST API + RTM event dispatcher
│   ├── types.ts                      # Room, member, state, event types
│   ├── types/
│   │   └── rtm-messages.ts           # Full RTM message union type
│   └── utils.ts                      # Room ID generator
├── media/                # Agora RTC/RTM integration
│   ├── hooks/
│   │   ├── useAgora.ts               # RTC voice/video engine
│   │   ├── useAgoraRtm.ts           # RTM channel messaging
│   │   ├── useAgoraToken.ts         # RTC token fetcher
│   │   ├── useAgoraRtmToken.ts      # RTM token fetcher
│   │   └── useAudioDucking.ts       # Lower video volume when someone speaks
│   └── services/
│       └── agora.api.ts
└── interactions/         # Fun overlays
    ├── components/
    │   ├── EmojiReactions.tsx
    │   ├── FloatingEmojis.tsx
    │   ├── SketchOverlay.tsx
    │   ├── Soundboard.tsx
    │   └── WatchPartySketch.tsx
    ├── hooks/
    │   ├── use-emoji-reactions.ts
    │   ├── use-floating-emojis.ts
    │   ├── use-soundboard.ts
    │   ├── use-sketch-overlay.ts
    │   └── useGestureDetection.ts
    └── context/
        └── SketchContext.tsx
```

## Components

### WatchPartyClient

`components/WatchPartyClient.tsx`

Top-level client component. Dynamically imports `ActiveWatchParty` and `WatchPartyLobby` (no SSR). Manages the full lifecycle from socket connection through lobby → pending request → active party states. Wraps the active party in `<SketchProvider>`.

| Prop | Type | Description |
|------|------|-------------|
| `roomId` | `string` | Unique room identifier |
| `isNewParty` | `boolean` | Triggers auto-join and creation toast |
| `initialRoomPreview` | `RoomPreview \| null` | Server-fetched lobby data |
| `initialRoomNotFound` | `boolean` | Whether the room was not found server-side |

Delegates all room logic to `useWatchPartyClient`. Prefetches `ActiveWatchParty` while the join request is pending for instant transition on approval.

### ActiveWatchParty

`components/ActiveWatchParty.tsx`

Full-screen split layout for an active session. Composes:
- **Sidebar** (`<aside>`) — collapsible, 256–384px wide, with animated width transition.
- **Video area** (`<main>`) — fills remaining space.
- **FloatingChat** — transparent overlay when sidebar is collapsed and floating chat is enabled (persisted in `localStorage` key `wp:floatingChat`).
- **Leave confirmation dialog** — `AlertDialog` with host/guest-specific copy.

Manages fullscreen toggling, floating chat persistence, and sketch-mode state via `useActiveWatchParty`.

### WatchPartyVideoArea

`components/WatchPartyVideoArea.tsx`

The main video column. Composes `Player.Root` with:
- Blurred poster background
- `PlayerOverlays` (buffering, error, center play, next episode)
- `FloatingEmojis` overlay
- `SketchOverlay` (Konva canvas)
- `EmojiReactions` in the control bar
- `RecordButton` for clip recording (host only)
- Full `Player.*` compound component tree (header, seekbar, controls, episode panel)

Host gets `interactionMode: 'interactive'`; guests get `'read-only'`.

### WatchPartySidebar

`components/WatchPartySidebar.tsx` — `React.memo`

Four-tab sidebar with animated tab transitions (opacity + scale):

| Tab | Content | Permission Gate |
|-----|---------|-----------------|
| Participants | `VideoGrid` + `PendingRequests` (host) | Always visible |
| Chat | `WatchPartyChat` or `WatchPartyChatDisabled` | `canChat` permission |
| Soundboard | `Soundboard` or `SoundboardDisabled` | `canPlaySound` permission |
| Sketch | `WatchPartySketch` or `WatchPartySketchDisabled` | `canDraw` permission |

Footer: `MediaControls` with Agora voice/video controls.

### SidebarTabs

`components/SidebarTabs.tsx`

Horizontal icon tab bar (People, Chat, Soundboard, Sketch) using Lucide icons. Active tab gets `neo-yellow` variant styling.

### MediaControls

`components/MediaControls.tsx`

Sidebar footer with:
- **Settings panel** (`WatchPartySettings`)
- **Invite link** button (host only) with copy-to-clipboard
- **Leave/End party** button
- **User info** card with avatar initial, name, and Agora connection status indicator
- **Mic toggle** with device selection dropdown
- **Camera toggle** with device selection dropdown
- **Deafen toggle** (mute all incoming audio)

### ParticipantView

`components/ParticipantView.tsx`

Single participant tile rendering:
- Agora remote video track via `useParticipantView`
- Avatar fallback (profile photo or initial) when camera is off
- Speaking indicator (green pulsing dot)
- "You" badge for the current user
- Name tag and mic status icon
- Kick controls (host only, with confirmation)

## Chat Subsystem

### WatchPartyChat

`chat/components/WatchPartyChat.tsx` — `React.memo`

Full interactive chat panel:
- Message list with auto-scroll, system message styling, single-emoji detection (large render), clickable link parsing via `parseLinks`
- Emoji picker (dynamic import of `emoji-picker-react`) with theme-aware styling
- Typing indicators with bounce animation (supports 1, 2, 3, or "many" users)
- Text input with Enter-to-send

`WatchPartyChatDisabled` — read-only variant shown when the user lacks chat permissions.

### FloatingChat

`chat/components/FloatingChat.tsx`

Transparent overlay (no background) rendered over the video when the sidebar is collapsed. Features:
- Text-shadow for readability over video
- Max 60 visible messages for performance
- Glass-effect input bar at the bottom
- `pointer-events: auto` only on the scrollable list and input

### Chat Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useWatchPartyChat` | `chat/hooks/useWatchPartyChat.ts` | Full RTM chat lifecycle: optimistic send → backend persist → RTM broadcast. Handles incoming `CHAT`, `TYPING_START`, `TYPING_STOP` messages. Plays notification sound when chat is hidden. |
| `useWatchPartyChat` (UI) | `chat/hooks/use-watch-party-chat.ts` | Local UI state: input value, emoji picker visibility, auto-scroll on new messages, typing indicator signaling with 3s debounce, Enter-to-send. |
| `useChatScroll` | `chat/hooks/use-chat-scroll.ts` | Scrolls to bottom on initial render. |

## Room Hooks

### useWatchParty

`room/hooks/useWatchParty.ts` — Master orchestrator

Composes all sub-hooks into a single API:
1. **Agora RTM** — `useAgoraRtm` for channel messaging with `onMessage` router that dispatches to chat, members, and sync handlers.
2. **Chat** — `useWatchPartyChat` (RTM variant)
3. **Lifecycle** — `useWatchPartyLifecycle`
4. **Members** — `useWatchPartyMembers`
5. **Sync** — `useWatchPartySync`
6. **Clock** — `useClockSync`

Handles top-level RTM messages: `JOIN_APPROVED`, `JOIN_REJECTED`, `KICK`, `PARTY_CLOSED`. Sends `SYNC_REQUEST` on guest RTM connect. Fetches initial chat messages on join.

### useWatchPartyLifecycle

`room/hooks/useWatchPartyLifecycle.ts`

Manages room creation, join requests, approval polling (Socket.IO for pending state), and leaving. Key flows:
- **Pending state polling**: Opens a temporary Socket.IO connection that listens for `JOIN_RESULT` events while the request is pending.
- **`requestJoin`**: POST to `/api/rooms/:id/join`, handles `pending` (stores guest token) and `joined` (normalizes URLs, sets room state).
- **`leaveRoom`**: Broadcasts `PARTY_CLOSED` via RTM if host, then calls REST leave endpoint.

### useWatchPartyMembers

`room/hooks/useWatchPartyMembers.ts`

Manages membership: approve/reject/kick via REST + RTM broadcast. Features:
- **Auto-kick**: Host starts a 2-minute grace timer when a guest's RTM presence drops. If they don't reconnect, they're auto-kicked.
- **Socket.IO listener**: Host receives `PENDING_MEMBERS_UPDATED` events for real-time join request notifications.
- **Permission updates**: Listens for `LOCAL_PERMISSIONS_UPDATED` and `LOCAL_MEMBER_PERMISSIONS_UPDATED` CustomEvents from the settings panel.
- **RTM handler**: Processes `MEMBER_JOINED`, `MEMBER_LEFT`, `PERMISSIONS_UPDATED`, `MEMBER_PERMISSIONS_UPDATED`.

### useWatchPartySync

`room/hooks/useWatchPartySync.ts`

Host↔guest playback synchronization:
- **Host**: `emitEvent` broadcasts `PLAY_EVENT`/`PAUSE_EVENT`/`SEEK_EVENT`/`RATE_EVENT` via RTM and persists to backend via `syncPartyState`.
- **Guest**: Processes incoming events, applies state updates via `onStateUpdate` callback, handles host disconnect/reconnect with configurable grace period (30s default).
- **Content updates**: `updateContent` calls REST endpoint and broadcasts `CONTENT_UPDATED` via RTM.
- **Livestream normalization**: Seek and rate events are converted to play/pause for live streams (no time-based seeking).

### usePredictiveSync

`room/hooks/usePredictiveSync.ts`

NTP-style drift correction for guest video playback:

```
Expected position = videoTime + (serverNow - serverTime) × playbackRate
Drift = expected - actual
```

| Drift | Action |
|-------|--------|
| > 2.0s | Hard seek to expected position |
| > 0.5s | ±15% playback rate correction |
| > 0.2s | ±5% fine correction |
| ≤ 0.2s | Restore normal rate |

Runs a 2s polling interval to enforce play/pause state and correct drift. For livestreams, only syncs play/pause (no time-based seeking). Handles pending updates when the video element isn't mounted yet.

### useWatchPartyHostSync

`room/hooks/useWatchPartyHostSync.ts`

Attaches `play`, `pause`, `seeked`, and `ratechange` event listeners to the host's video element. Debounces play/pause by 100ms and seek by 50ms. No-ops for guests.

### useClockSync

`room/hooks/useClockSync.ts`

One-way clock offset calibration: `offset = serverTime - localReceiveTime`. Calibrated dynamically from RTM messages containing `serverTime`.

### useWatchPartyFullscreen

`room/hooks/useWatchPartyFullscreen.ts`

Container-level fullscreen with Safari/WebKit vendor-prefix fallbacks. In Electron, delegates to native `BrowserWindow` fullscreen via `desktopBridge`.

## Component Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useWatchPartyClient` | `hooks/use-watch-party-client.ts` | Central orchestration: auth, guest socket, join/leave flows, predictive sync, party duration limits (3h), movie end warnings (15min), auto-join for creators, clipboard invite. |
| `useActiveWatchParty` | `hooks/use-active-watch-party.ts` | Fullscreen, host sync, sketch mode, orientation detection, Agora participant tracking, audio ducking, video ref binding, host content navigation. |
| `useWatchPartyVideoArea` | `hooks/use-watch-party-video-area.ts` | Derives `VideoMetadata` from room state, manages stream URL overrides for audio dub switching, resets on content change. |
| `useWatchPartySidebar` | `hooks/use-watch-party-sidebar.ts` | Tab state, user permissions, Agora RTC init via `useAgoraToken` + `useAgora`, gesture detection on local video, desktop push-to-talk. |
| `useSidebarTabs` | `hooks/use-sidebar-tabs.ts` | Memoized tab definitions (People, Chat, Soundboard, Sketch). |
| `usePlayerOverlays` | `hooks/use-player-overlays.ts` | Player state + next episode handler (host delegates to content update; guest uses built-in). |
| `useParticipantView` | `hooks/use-participant-view.ts` | Attaches Agora video track to container div, non-mirrored style. |
| `useMediaControls` | `hooks/use-media-controls.ts` | Audio/video device dropdown visibility state. |
| `useDesktopNotifications` | `hooks/use-desktop-notifications.ts` | Discord Rich Presence, taskbar unread badge, native OS toast notifications for messages when window is blurred. |
| `useWatchPartySettings` | `hooks/use-watch-party-settings.ts` | Settings dialog open/close state. |

## Media Hooks

### useAgoraToken

`media/hooks/useAgoraToken.ts`

Fetches an Agora RTC token for the given room and user. Handles both authenticated users and approved guests (via session-stored guest token). Returns `token`, `appId`, `channel`, `uid`, `isLoading`, `error`.

### useAgora

`media/hooks/useAgora.ts`

Full Agora RTC engine: joins channel, publishes local audio/video tracks, subscribes to remote tracks, manages device selection, provides `toggleAudio`, `toggleVideo`, `toggleDeafen`, `switchAudioDevice`, `switchVideoDevice`.

### useAudioDucking

`media/hooks/useAudioDucking.ts`

Lowers the video volume by a configurable factor (default 0.25) when any participant is speaking, with a smooth transition (200ms). Restores the user's original volume when speaking stops.

## Interactions

### EmojiReactions

`interactions/components/EmojiReactions.tsx`

Quick-access emoji bar in the player controls. Shows 6 preset emojis (❤️ 😂 😠 🔥 👏 😮) plus a "+" button for the full emoji picker. Broadcasts `INTERACTION` RTM messages with `kind: 'emoji'`.

### FloatingEmojis

`interactions/components/FloatingEmojis.tsx`

Full-screen `pointer-events: none` overlay. Listens for `INTERACTION` events via `onPartyInteraction` and spawns animated emoji instances that float upward with randomized wiggle, rotation, and fade over 2–4 seconds.

### Soundboard

`interactions/components/Soundboard.tsx`

Searchable sound panel with:
- Trending sounds fetched on mount from `/api/soundboard`
- Debounced search (500ms)
- Infinite scroll via `IntersectionObserver`
- Local audio playback + RTM broadcast (`INTERACTION` with `kind: 'sound'`)
- Incoming sounds auto-play locally via `onPartyInteraction`

### WatchPartySketch / SketchOverlay

`interactions/components/WatchPartySketch.tsx` — Sidebar tool panel
`interactions/components/SketchOverlay.tsx` — Konva canvas overlay on video

14 drawing tools: select, freehand, pencil, arrow, line, rectangle, circle, triangle, star, bubble, text, sticker, laser, eraser, reaction.

Features: 19-color palette + custom color picker, stroke width slider, opacity slider, fill toggle, undo, clear (self/all), z-order controls, "Capture Scene" PNG export, remote cursor rendering, real-time sync via RTM (`SKETCH_DRAW`, `SKETCH_UNDO`, `SKETCH_CLEAR`, `SKETCH_MOVE_Z`, `SKETCH_CURSOR_MOVE`, `SKETCH_REACTION`).

### SketchContext

`interactions/context/SketchContext.tsx`

React context providing all shared sketch state: current tool, color, stroke width, opacity, fill, actions array, selected element ID, remote cursors, sticker selection, video ref, and Konva stage ref. Exposes `triggerClear`, `triggerClearSelf`, `triggerUndo` via counter-based triggers.

## RTM Message Types

Defined in `room/types/rtm-messages.ts` as a discriminated union:

| Category | Types |
|----------|-------|
| Playback | `PLAY_EVENT`, `PAUSE_EVENT`, `SEEK_EVENT`, `RATE_EVENT`, `SYNC`, `SYNC_REQUEST` |
| Members | `JOIN_APPROVED`, `JOIN_REJECTED`, `MEMBER_JOINED`, `MEMBER_LEFT`, `PARTY_CLOSED`, `KICK` |
| Host | `HOST_DISCONNECTED`, `HOST_RECONNECTED` |
| Chat | `CHAT`, `TYPING_START`, `TYPING_STOP` |
| Interactions | `INTERACTION` (emoji/sound/animation) |
| Sketch | `SKETCH_DRAW`, `SKETCH_UNDO`, `SKETCH_CLEAR`, `SKETCH_REQUEST_SYNC`, `SKETCH_SYNC_STATE`, `SKETCH_MOVE_Z`, `SKETCH_CURSOR_MOVE`, `SKETCH_REACTION` |
| Permissions | `PERMISSIONS_UPDATED`, `MEMBER_PERMISSIONS_UPDATED`, `CONTENT_UPDATED` |
| Stream | `STREAM_TOKEN` |

## REST API Endpoints

All calls go through `apiFetch` (cookie-authenticated). Defined in `room/services/watch-party.api.ts`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/rooms/:id/exists` | GET | Check room existence (lobby) |
| `/api/rooms/:id` | GET | Get room details |
| `/api/rooms/:id/create` | POST | Create room |
| `/api/rooms/:id/join` | POST | Request to join |
| `/api/rooms/:id/approve` | POST | Approve join request (host) |
| `/api/rooms/:id/reject` | POST | Reject join request (host) |
| `/api/rooms/:id/kick` | POST | Kick member (host) |
| `/api/rooms/:id/leave` | POST | Leave room |
| `/api/rooms/:id/state` | GET/POST | Get/sync playback state |
| `/api/rooms/:id/content` | POST | Update room content (host) |
| `/api/rooms/:id/stream-token` | GET | Get stream token |
| `/api/rooms/:id/pending` | GET | Fetch pending requests (host) |
| `/api/rooms/:id/permissions` | POST | Update global permissions |
| `/api/rooms/:id/members/:mid/permissions` | POST | Update member permissions |
| `/api/rooms/:id/messages` | GET/POST | Get/send chat messages |
| `/api/soundboard` | GET | Trending sounds |
| `/api/soundboard/search` | GET | Search sounds |

## Data Flow: Host Plays → Guest Syncs

1. Host clicks play → `<video>` fires `play` event
2. `useWatchPartyHostSync` debounces (100ms) → calls `onPartyEvent({ eventType: 'play', videoTime, playbackRate })`
3. `useWatchPartySync.emitEvent` broadcasts `PLAY_EVENT` via RTM + persists to backend
4. Guest's `useAgoraRtm.onMessage` receives the message → routes to `sync.handleIncomingRtmMessage`
5. `useWatchPartySync` constructs `PartyStateUpdate` → calls `onStateUpdate`
6. `usePredictiveSync.applyState` calculates expected position, applies drift correction, and calls `video.play()`
