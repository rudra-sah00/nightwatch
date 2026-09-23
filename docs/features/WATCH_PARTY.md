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

**Backend persistence:** State mutations that require validation (join, approve, kick, content update) use REST calls under `room/services/rest/`, re-exported from `room/services/watch-party.api.ts`. RTM handles the real-time broadcast; REST handles the durable write.

**Live TV** is the one mode that behaves differently throughout — its URL is not ours, its timeline is not shared, and its host never touches the controls. See [WATCH_PARTY_LIVE_TV.md](./WATCH_PARTY_LIVE_TV.md).

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
│   │   ├── watch-party.api.ts        # Barrel — re-exports everything below
│   │   ├── rest/
│   │   │   ├── client.ts             # Shared `{ error }` folding
│   │   │   ├── room.api.ts           # exists / detail / create
│   │   │   ├── membership.api.ts     # join, approve, reject, kick, leave, pending
│   │   │   ├── playback.api.ts       # state, content switch, stream token
│   │   │   ├── permissions.api.ts    # global + per-member permissions
│   │   │   ├── chat.api.ts           # message history
│   │   │   └── soundboard.api.ts     # sound catalogue
│   │   └── rtm-events.ts             # RTM event bus + every `on*` subscriber
│   ├── types.ts                      # Room, member, state, event types
│   ├── types/
│   │   └── rtm-messages.ts           # Full RTM message union type
│   └── utils.ts                      # Room ID generator, host check, URL normalisation
├── media/                # Agora RTC/RTM integration
│   ├── hooks/
│   │   ├── useAgora.ts               # RTC engine: connection, tracks, participants
│   │   ├── useAgoraRtm.ts           # RTM channel messaging
│   │   ├── useAgoraToken.ts         # RTC token fetcher
│   │   ├── useAgoraRtmToken.ts      # RTM token fetcher
│   │   └── useAudioDucking.ts       # Lower video volume when someone speaks
│   ├── lib/
│   │   ├── agora-sdk.ts             # Lazy SDK loader + encoder presets
│   │   ├── agora-types.ts           # Participant/device/quality types
│   │   └── agora-uid.ts             # Numeric UID hash, device error mapping
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

### WatchPartySettings

`components/WatchPartySettings.tsx`

Full-screen overlay panel for room configuration. Replaces the previous dialog-based settings with an immersive overlay that covers the entire watch party interface. Hosts can manage global permissions (chat, draw, soundboard), update member-specific overrides, and configure room settings without losing context of the active session.

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
| `useWatchPartyChat` | `chat/hooks/useWatchPartyChat.ts` | Full RTM chat lifecycle: optimistic send → backend persist → RTM broadcast. Handles incoming `CHAT`, `TYPING_START`, `TYPING_STOP` messages. Plays notification sound when chat is hidden. Supports paginated message loading for long sessions. |
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

Manages room creation, join requests, approval polling (Socket.IO for pending state with HTTP polling fallback), and leaving. Key flows:
- **Pending state polling**: Opens a temporary Socket.IO connection that listens for `JOIN_RESULT` events while the request is pending. Falls back to periodic HTTP polling if the socket connection fails, ensuring guests are never stuck in a pending state.
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
- **Content updates**: `updateContent` calls REST endpoint and broadcasts `CONTENT_UPDATED` via RTM. Includes a race condition guard to prevent stale content from overwriting newer updates when rapid switches occur.
- **Stream token auto-renewal**: Automatically refreshes the stream token before expiry via the `/api/rooms/:id/stream-token` endpoint, preventing playback interruptions during long sessions.
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

Runs a 2s interval to enforce play/pause state and correct drift. For livestreams, only syncs play/pause (no time-based seeking).

**Seeks are clamped to `video.seekable`.** Assigning a `currentTime` outside the
seekable range does not throw — it stalls silently, and nothing downstream can tell
that apart from "still buffering". Live streams make this routine, because each
client holds its own sliding window and the host's position is frequently outside
the guest's. Three outcomes: a usable range clamps the target (keeping
`SEEKABLE_MARGIN_S` clear of a live edge that is still moving); no range *reported*
assigns directly, since an unknown window is not a reason to refuse a seek; a range
reported as *empty* does not seek at all.

**Held updates are applied on element events, not on a deadline.** A state update
that arrives before the element can take it (`readyState < 1`) is kept and applied
on the next `loadedmetadata` / `loadeddata` / `canplay` / `durationchange`, with a
500 ms poll only to (re)bind when the element itself has not mounted yet.

This used to poll every 250 ms and **give up after 10 s**, on the reasoning that
"reconnection sync timers will handle it by then" — but there are none for a guest
that has never had state. When the deadline passed, `stateRef` was still null, which
also disables the 2 s enforcement loop (it returns early without state), so the guest
was left with a paused video, no state, and nothing that would ever set either. A
live channel served through the backend playlist proxy — resolve upstream, fetch,
rewrite, then fetch a segment — routinely misses a 10 s window on a cold cache.

### Blocked autoplay

`video.play()` rejects with `NotAllowedError` whenever the document has no user
activation, which is the normal state for someone who opened an invite link and was
approved without ever clicking inside the page.

Every `play()` call in the party used to swallow that rejection, and the guest's
centre overlay is deliberately inert (`disabled`, so a guest cannot drive the
party) — so the refusal was terminal. There was no way, automatic or manual, to
start the video, and the guest sat on the "Host controls playback" lock badge over a
black frame for the rest of the session.

`usePredictiveSync` now recovers it:

1. On `NotAllowedError`, retry **muted**. Muted playback is exempt from the policy
   in every browser that implements one.
2. Dispatch `PARTY_PLAYBACK_BLOCKED_EVENT` on `window`, with
   `detail.muted` reporting whether the muted retry worked.

`PlayerOverlays` in `WatchPartyVideoArea` consumes it:

| `detail.muted` | Meaning | UI |
|----------------|---------|-----|
| `true` | Picture running, sound withheld | Toast with an "Enable Audio" action that unmutes |
| `false` | Nothing is playing | The centre overlay becomes **tappable** and prompts for one gesture |

The tap is local only — it starts and unmutes *this* element and never touches
party state, so it does not hand a guest control of the room. `usePredictiveSync`
re-asserts the host's authoritative state immediately afterwards.

A window event rather than props: refusal is a local browser decision discovered
deep in a hook, and the component that must react to it is neither a parent nor a
child — threading it through `useWatchPartyClient` → `ActiveWatchParty` →
`WatchPartyVideoArea` would couple three layers to a browser policy detail.

### Guest playback: how a guest learns the party is playing

There is exactly one authoritative source, and this is the sequence that was
failing for live TV:

1. **`JOIN_APPROVED`** carries `initialState`. But this is a *peer* RTM message, and
   a pending guest is not on the RTM channel yet — its RTM token is derived from
   `room.id`, which it does not have until approved — so a guest normally never
   sees it. Admission arrives over Socket.IO `JOIN_RESULT` instead.
2. **`SYNC_REQUEST` → host `SYNC` reply.** This is the real path, and it is
   retried: up to 5 attempts, 3 s apart, stopping as soon as any state update
   lands. It used to be a single `setTimeout`. RTM channel messages are fire and
   forget, so one sent a second after connect can be dropped — as can the host's
   reply — and a lost packet left the guest with **no state at all**. On VOD that
   self-heals the moment the host touches the scrubber; on live TV nobody ever
   touches anything.
3. **The room's persisted `state`,** which the backend now initialises to
   `isPlaying: true` for live rooms. See
   [the backend's watch-party doc](../../../nightwatch-backend/docs/architecture/watch-party.md#live-rooms-start-playing).

### Host derivation

`room/utils.ts` → `isPartyHost(room, userId)`

A one-line function with its own name because the obvious inline form is wrong in a
way that is invisible on the host and breaks every guest:

```ts
const isHost = user?.id === room?.hostId; // true while room is null!
```

Before the room lands both sides are `undefined`, so `undefined === undefined`
reports the viewer as host. That window is precisely when a guest receives its first
party state, and `onStateUpdate` is gated on `if (isHostRef.current) return` because
the host must not apply its own broadcasts. So the one update telling a guest the
party was already playing got dropped, and `usePredictiveSync` skipped registering
its apply/enforce effects for the same reason.

A missing id on either side means "not the host", never "maybe".

### useWatchPartyHostSync

`room/hooks/useWatchPartyHostSync.ts`

Attaches `play`, `pause`, `seeked`, and `ratechange` event listeners to the host's video element. Debounces play/pause by 100ms and seek by 50ms. No-ops for guests.

### useClockSync

`room/hooks/useClockSync.ts`

Multi-sample clock offset calibration: collects multiple RTM message timestamps and computes a stable offset using median filtering to reduce jitter. Formula: `offset = median(serverTime - localReceiveTime)` across recent samples.

### useWatchPartyFullscreen

`room/hooks/useWatchPartyFullscreen.ts`

Container-level fullscreen with Safari/WebKit vendor-prefix fallbacks. In Electron, delegates to native `BrowserWindow` fullscreen via `desktopBridge`.

## URL Normalization

`room/utils.ts` → `normalizeRoomUrls(room, token, { injectStream })`

Every join path runs the room through this before setting state, so a member can
actually fetch the host's URLs using the shared stream token:

| Field | Treatment |
|-------|-----------|
| `streamUrl` | Token re-injected — only when `injectStream` is set, and **never for `type: 'livestream'`** |
| `captionUrl`, `spriteVtt`, `subtitleTracks[].src` | Wrapped in the CDN proxy (relative paths only; absolute URLs are already final) |
| `qualities[].url` | Passed through — already CDN proxy URLs valid for the shared token |

Livestreams are excluded from stream-token injection because their URLs are
upstream IPTV/CDN URLs, not our `/api/stream/hls/TOKEN/ID` shape.
`injectTokenIntoUrl` matches on any `hls` or `cdn` path segment and overwrites the
segment after it, which mangles upstream URLs:

| Upstream URL | After injection | Lost |
|--------------|-----------------|------|
| `…/v1/stitch/embed/hls/channel/<id>/master.m3u8` | `…/v1/stitch/embed/hls/TOKEN/<id>/master.m3u8` | `channel` |
| `…/hls/<id>/index.m3u8` | `…/hls/TOKEN/index.m3u8` | `<id>` |

Either shape 404s, and the channel then buffers forever in a party while playing
fine solo. Live TV has no per-member
token anyway; the backend marks these rooms with the `LIVESTREAM` sentinel and
resolves the playable URL server-side at room creation (see
`nightwatch-backend/docs/architecture/livestream.md` → Shared resolution).

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
| `useWatchPartySettings` | `hooks/use-watch-party-settings.ts` | Settings overlay open/close state. |

## Media Hooks

### useAgoraToken

`media/hooks/useAgoraToken.ts`

Fetches an Agora RTC token for the given room and user. Handles both authenticated users and approved guests (via session-stored guest token). Automatically renews the token before expiry to prevent mid-session disconnects. Returns `token`, `appId`, `channel`, `uid`, `isLoading`, `error`.

### useAgora

`media/hooks/useAgora.ts`

Full Agora RTC engine: joins channel, publishes local audio/video tracks, subscribes to remote tracks, manages device selection, provides `toggleAudio`, `toggleVideo`, `toggleDeafen`, `switchAudioDevice`, `switchVideoDevice`.

The stateless parts live in `media/lib/`, so a component that renders a participant
tile can name an `AgoraParticipant` without pulling in a 900-line hook that loads a
400 KB SDK:

| Module | Contents |
|--------|----------|
| `media/lib/agora-sdk.ts` | Lazy memoised SDK loader (`getAgoraRTC`), log level, audio/video encoder presets |
| `media/lib/agora-types.ts` | `AgoraParticipant`, `MediaDevice`, `NetworkQuality`, `ConnectionState`, `MemberInfo`, `UseAgoraOptions` |
| `media/lib/agora-uid.ts` | `generateNumericUid`, `buildUidToMemberMap`, `handleDeviceError` |

`useAgora` re-exports all of those, so existing imports from
`media/hooks/useAgora` are unchanged.

**`generateNumericUid` is a cross-repo contract.** Agora channels identify users by a
32-bit integer, so the backend mints a token for the uid *it* derives in
`agora.service.ts` and the client joins as the uid it derives here. If the two ever
disagree the join is rejected, which presents as "voice chat silently never
connects" with nothing visibly wrong in either repo. Both sides have vector tests
pinning the output — `tests/features/watch-party/media/agora-uid.test.ts` here and
`tests/modules/agora/agora.uid.test.ts` in the backend. Change one and the other
fails.

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

Features: conic-gradient colour wheel (native `<input type="color">` behind it), stroke width / font size slider, opacity slider, fill toggle, undo, clear (self/all), z-order controls, "Capture Scene" saves to clip library, remote cursor rendering (throttled to ~10fps), real-time sync via RTM (`SKETCH_DRAW`, `SKETCH_UNDO`, `SKETCH_CLEAR`, `SKETCH_MOVE_Z`, `SKETCH_CURSOR_MOVE`, `SKETCH_REACTION`). Lines are rendered without shadow for cleaner visuals.

Filled shapes use the selected colour with a hard `#1a1a1a` neo-brutalist border; unfilled ("outline only") shapes use the selected colour as the stroke with a transparent interior.

**Hook ownership.** `useSketchOverlay` must be mounted exactly once per party — it owns every RTM subscription and the clear/undo trigger effects. The sidebar panel only needs z-order control, so it takes `rtmSendMessage` and `userId` as props and calls the standalone `useSketchMoveZ` instead. Mounting the full hook twice double-registers each listener and each trigger effect, and (because the panel had no RTM sender) silently dropped `SKETCH_MOVE_Z` broadcasts.

**Stage sizing.** The Konva stage tracks its container with a `ResizeObserver` (rAF-coalesced, falling back to `window.resize`). A window listener alone is not sufficient: collapsing or expanding the sidebar changes the player width by ~380px without ever resizing the window, which left the stage at its old dimensions — strokes landed at the wrong coordinates and the uncovered strip of video ignored pointer input entirely.

**Action identity.** `userId`, `userName`, and `opacity` are stamped onto an action when it is created in `handleMouseDown`, not when it is broadcast on mouse-up. An anonymous local copy cannot be selected or dragged by its own author, is invisible to "clear mine", and ignores the opacity slider. In-progress strokes are updated **by id**, never by array position, so a peer's stroke arriving mid-drag is not overwritten.

### SketchContext

`interactions/context/SketchContext.tsx`

React context providing all shared sketch state: current tool, color, stroke width, opacity, fill, actions array, selected element ID, remote cursors, sticker selection, video ref, and Konva stage ref. Exposes `triggerClear`, `triggerClearSelf`, `triggerUndo` via counter-based triggers.

These triggers are monotonic counters, so `trigger > 0` stays true for the rest of the session. The effects that consume them in `use-sketch-overlay.ts` are therefore keyed on the counter **alone**, reading `canDraw` / `userId` / `selectedId` / `rtmSendMessage` through a ref. Listing those as dependencies makes any identity change re-run the effect — after a single undo press, every subsequent selection would delete another stroke and broadcast a stray `SKETCH_UNDO`.

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

All calls go through `apiFetch` (cookie-authenticated). Split by concern under
`room/services/rest/` and re-exported from `room/services/watch-party.api.ts`, which
stays the import path for the ~16 modules that already use it:

| Module | Endpoints |
|--------|-----------|
| `rest/room.api.ts` | `exists`, room detail, `create` |
| `rest/membership.api.ts` | `join`, `approve`, `reject`, `kick`, `leave`, `pending` |
| `rest/playback.api.ts` | `state`, `content`, `stream-token` |
| `rest/permissions.api.ts` | `permissions`, `members/:mid/permissions` |
| `rest/chat.api.ts` | `messages` |
| `rest/soundboard.api.ts` | `/api/soundboard`, `/api/soundboard/search` |
| `rest/client.ts` | Shared `{ error }` folding — internal, not re-exported |

None of these throw. A watch party is a live session with other people in it, so the
right response to a failed `kick` or `syncPartyState` is a toast, not an unmounted
player; failures come back as data and each caller decides what it means. That
`try/catch` was copy-pasted into all fourteen helpers and now lives once in
`rest/client.ts` (`attempt`, `postForSuccess`).

The RTM event bus moved out to `room/services/rtm-events.ts` — a module-level pub/sub
singleton and a set of stateless fetch wrappers have nothing in common but the word
"service".

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

## Performance & Reliability Guarantees

### Memory Management

| Resource | Cap/Strategy | Location |
|----------|--------------|----------|
| Sketch actions | Max 200, FIFO eviction | `SketchContext.tsx` |
| Chat messages | Max 200, FIFO eviction | `useWatchPartyChat.ts` |
| Remote cursors | Pruned every 5s (stale > 5s removed); broadcast throttled to ~10fps | `use-sketch-overlay.ts` |
| Floating emojis | Auto-remove after 4.5s animation | `use-floating-emojis.ts` |
| Soundboard audio | Dedicated ref per source (local + remote) | `use-soundboard.ts` |
| Gesture detection | Disabled by default (opt-in via `enabled` prop) | `useGestureDetection.ts` |
| Particle reactions | Self-terminating rAF loop, single instance | `SketchOverlay.tsx` |

### Render Optimization

| Optimization | Description |
|--------------|-------------|
| Speaker state via ref | Volume indicator writes to `speakerStateRef`, triggers React update at most every 500ms |
| Stable `onPartyEvent` | Uses ref pattern in `useWatchPartyHostSync` — video listeners attached once, never re-attached |
| Stable `getExpectedTime` | Uses `clockOffsetRef` — callback identity never changes |
| Cursor broadcast throttle | Batched at 10fps (100ms) instead of per-move for RTM bandwidth savings |
| Member count dep | Sync effect tracks `room.members.length` not the full array reference |
| Toggle guards | `isTogglingAudio`/`isTogglingVideo` refs prevent double-click race conditions |

### Multi-Tab Safety

`WatchPartyClient` uses `BroadcastChannel` with a timestamp-based claim protocol to prevent duplicate RTM/RTC connections:
1. New tab sends `{ type: 'CLAIM', ts: Date.now() }`
2. Existing tab responds `{ type: 'ALREADY_ACTIVE' }` if it has an older timestamp
3. Newer tab yields (blocks itself) upon receiving `ALREADY_ACTIVE`
4. Oldest tab always wins ownership

### Token Fetch Safety

Both `useAgoraToken` and `useAgoraRtmToken` use a `cancelled` flag pattern to prevent stale fetch results from overwriting fresh state when room/user changes rapidly.

## Backend Architecture

### Atomic Room Mutations

All room state mutations use Redis `WATCH`/`MULTI`/`EXEC` optimistic locking with up to 3 retries on contention:

```
1. WATCH key
2. GET key → parse room JSON
3. Apply mutation (mutator function)
4. TTL = existing TTL (preserved, NOT reset)
5. MULTI → SETEX key ttl json → EXEC
6. If EXEC returns null (contention) → retry
```

This prevents lost updates when concurrent operations hit the same room (e.g., two members joining simultaneously, host approving while someone leaves).

### Host Transfer

When the host leaves a room with remaining members:
1. Room is NOT deleted
2. Host role transfers to the longest-tenured member (`min(joinedAt)`)
3. `HOST_TRANSFERRED` event emitted via Socket.IO
4. Room continues operating normally

### Security Measures

| Measure | Description |
|---------|-------------|
| No raw `guestId` | Agora token endpoints require signed JWT (via `optionalAuthMiddleware`). Raw query param `guestId` is no longer accepted. |
| Strict DM channel validation | Regex `^dm-([a-z0-9]+)-([a-z0-9]+)$` with participant ID verification |
| Room ID normalization | All room IDs uppercased before Socket.IO `join()` — prevents case-mismatch room splitting |
| Self-kick prevention | Host cannot kick themselves (`memberId === hostId` guard) |
| Chat TTL alignment | Chat keys use same 6h TTL as room keys — no orphaned data |
| Room code collision check | `createRoom` verifies generated code doesn't collide with existing rooms |

### Socket.IO Reliability

| Feature | Implementation |
|---------|----------------|
| Redis error handlers | All pub/sub/clipSub clients have `.on('error')` handlers |
| Connection try/catch | Entire async connection handler wrapped — uncaught errors disconnect the socket cleanly |
| Named handler cleanup | Socket listeners use specific function references for targeted removal |

### RTM Message Types (Extended)

| Category | Types |
|----------|-------|
| Playback | `PLAY_EVENT`, `PAUSE_EVENT`, `SEEK_EVENT`, `RATE_EVENT`, `SYNC`, `SYNC_REQUEST` |
| Members | `JOIN_APPROVED`, `JOIN_REJECTED`, `MEMBER_JOINED`, `MEMBER_LEFT`, `PARTY_CLOSED`, `KICK` |
| Host | `HOST_DISCONNECTED`, `HOST_RECONNECTED`, `HOST_TRANSFERRED` |
| Chat | `CHAT`, `TYPING_START`, `TYPING_STOP` |
| Interactions | `INTERACTION` (emoji/sound/animation) |
| Sketch | `SKETCH_DRAW`, `SKETCH_UNDO`, `SKETCH_CLEAR`, `SKETCH_REQUEST_SYNC`, `SKETCH_SYNC_STATE`, `SKETCH_MOVE_Z`, `SKETCH_CURSOR_MOVE`, `SKETCH_REACTION` |
| Permissions | `PERMISSIONS_UPDATED`, `MEMBER_PERMISSIONS_UPDATED`, `CONTENT_UPDATED` |
| Stream | `STREAM_TOKEN` |
