# Friends & Voice Calls

The friends system provides social features: friend requests, online presence tracking, activity status, and 1-on-1 voice calls via Agora RTC. The right sidebar displays the friends list with real-time online/offline status and activity tracking.

**Source:** `src/features/friends/`, `src/providers/socket-provider.tsx`, `src/lib/socket.ts`

---

## Architecture

```
src/features/friends/
├── api.ts                          # API layer (friends CRUD, search, block)
├── types.ts                        # TypeScript interfaces (FriendProfile, FriendActivity, etc.)
├── format-activity.ts              # Utility to format activity into display string
├── hooks/
│   ├── use-friends.ts              # Friends list, requests, accept/reject/cancel, activity
│   ├── use-call.tsx                # CallProvider context, Agora RTC, call state machine
│   └── use-friend-notifications.ts # Real-time friend event notifications (toasts)
├── call/
│   ├── call-media.ts               # Ringtone preload/playback, media ducking, dm-call events
│   ├── call.service.ts             # Agora RTC connect, token fetch, video track creation
│   ├── call-native.ts              # Native CallKit (iOS) / PhoneCallNotification (Android) integration
│   ├── call.utils.ts               # duckMediaElements(), formatDuration()
│   ├── call.config.ts              # Agora RTC audio/video encoding presets
│   ├── InviteSpotlight.tsx         # Call invite spotlight overlay (add friends to active call)
│   └── PeerAvatar.tsx              # Remote peer avatar during calls
└── components/
    ├── CallOverlay.tsx             # Global floating call card (top-right corner)
    ├── FriendRow.tsx               # Individual friend row in sidebar
    ├── Avatar.tsx                  # Friend avatar with online indicator
    └── FriendSearchSpotlight.tsx   # Username search overlay for adding friends
```

### Integration Points

- **Right Sidebar** (`src/components/layout/right-sidebar.tsx`): Friends list with online/offline sections, pending/sent requests, call button per friend, Spotlight search for adding friends by username.
- **Main Layout** (`src/app/(protected)/(main)/layout.tsx`): `CallProvider` wraps all routes, `CallOverlay` renders globally.

## Friend System

### Request Flow

1. User opens Spotlight search (+ icon in sidebar header)
2. Types a username → debounced search (300ms) queries `GET /api/friends/search?q=`
3. Results show status badges: "Friends" / "Sent" / "Incoming" / "Add Friend" button
4. Backend resolves username → userId, creates pending friendship
5. Receiver gets real-time `friend:request_received` socket event
6. Receiver sees the request instantly in the sidebar (no manual refresh needed) and accepts/rejects from the "Requests" section
7. Sender can cancel from the "Sent" section

### States in Sidebar

| Section | Description |
|---------|-------------|
| **Requests** | Incoming friend requests with Accept ✓ / Reject ✗ buttons |
| **Sent** | Outgoing requests with Cancel button |
| **Online** | Accepted friends currently online (green dot) — call + message buttons |
| **Offline** | Accepted friends currently offline — call + message buttons |
| **Blocked** | Blocked users with Unblock button (strikethrough name) |

The sidebar also includes:
- **Search filter** input to filter friends by name
- **Spotlight search** (+ icon) — full-screen overlay with debounced username search, shows status badges (Friends / Sent / Incoming / Add Friend)

### API Endpoints (Backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/friends` | List accepted friends with online status |
| `GET` | `/api/friends/search?q=` | Search users by name or username (min 2 chars, max 10 results) |
| `GET` | `/api/friends/requests/pending` | Incoming requests |
| `GET` | `/api/friends/requests/sent` | Outgoing requests |
| `GET` | `/api/friends/blocked` | List blocked users |
| `POST` | `/api/friends/request` | Send request `{ username }` |
| `POST` | `/api/friends/accept` | Accept `{ friendshipId }` |
| `POST` | `/api/friends/reject` | Reject `{ friendshipId }` |
| `POST` | `/api/friends/cancel` | Cancel sent request `{ friendshipId }` |
| `DELETE` | `/api/friends/remove` | Unfriend `{ userId }` |
| `POST` | `/api/friends/block` | Block `{ userId }` |
| `POST` | `/api/friends/unblock` | Unblock `{ userId }` |

### Rate Limits

- Friend requests / block: **20 per 15 minutes**
- General API limiter on all other endpoints

## Online Presence

### How It Works

1. **Connect**: Socket.IO connection → `FriendsHandler.handleConnect()` sets Redis key `online:{userId}` with 5-minute TTL
2. **Heartbeat**: Every 2 minutes, the TTL is refreshed via `FriendsService.refreshOnline()`
3. **Broadcast**: On connect/disconnect, `friend:status` event sent to all accepted friends
4. **Multi-tab**: Only goes offline when ALL sockets for a user disconnect (checks room size)
5. **Crash recovery**: If browser crashes (no disconnect event), the Redis TTL expires after 5 minutes

### Redis Keys

| Key | TTL | Description |
|-----|-----|-------------|
| `online:{userId}` | 300s (refreshed every 120s) | User is online |
| `call:busy:{userId}` | 120s (ringing) / 3600s (active) | User is in a call |

## Activity Status

### How It Works

1. **Frontend emits** `watch:set_activity` once when playback starts (both VOD and live)
2. **Frontend emits** `watch:clear_activity` on component unmount (navigation away)
3. **Backend broadcasts** `friend:activity` to all online friends on set/clear
4. **Right sidebar** shows activity text below the friend's name (e.g., "Watching Breaking Bad S2E3")
5. **Chat header** shows activity instead of "online" when available (priority: typing > activity > online > offline)
6. **Broadcast only on change** — deduplication built in. Same activity re-emitted only refreshes TTL

### Data Structure

```ts
interface FriendActivity {
  type: string;              // 'movie' | 'series' | 'live' | 'music' | 'game' | 'reading'
  title: string;             // Content title
  artist: string | null;     // Artist name (music)
  season: number | null;     // Series season (null for movies/live)
  episode: number | null;    // Series episode (null for movies/live)
  episodeTitle: string | null;
  posterUrl: string | null;
  secondaryPosterUrl: string | null; // Second poster (e.g. team2 in a live match)
}
```

### Socket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `watch:set_activity` | Client → Server | `{ type, title, season?, episode?, episodeTitle?, posterUrl? }` |
| `watch:clear_activity` | Client → Server | (none) |
| `friend:activity` | Server → Client | `{ userId, activity }` (activity is null on clear) |

### Backend Requirements

| Action | Redis | Socket Broadcast |
|--------|-------|-----------------|
| User starts watching | `SET user:activity:{userId}` (300s TTL) | `friend:activity { userId, activity }` to online friends |
| Content changes | Update Redis key + refresh TTL | Broadcast only if activity differs from current |
| User stops watching | `DEL user:activity:{userId}` | `friend:activity { userId, activity: null }` |
| Stream ends (stream:stop) | `DEL user:activity:{userId}` | `friend:activity { userId, activity: null }` |
| Socket disconnect | `DEL user:activity:{userId}` (via friends handler) | Offline broadcast |
| `GET /api/friends` | `MGET user:activity:{friendId}` | Include `activity` field in response |

### Display Format

- Movie: "Watching Inception"
- Series: "Watching Breaking Bad S2E3"
- Live: "Watching Live: IPL 2026"
- Music: "Listening to Shape of You — Ed Sheeran" (with artist) or "Listening to Shape of You" (without)
- Game: "Playing Tetris"
- Reading: "Reading One Piece"

Formatted by `formatActivity()` utility in `src/features/friends/format-activity.ts`.

## Voice Calls

### Call State Machine

```
idle → outgoing (caller) / incoming (receiver)
  ↓
outgoing → active (callee accepted) / idle (rejected/cancelled)
incoming → active (accepted) / idle (rejected)
  ↓
active → idle (ended by either party)
```

### Flow

1. Caller clicks phone icon → `call:initiate` socket event with `{ receiverId }`
2. Backend validates friendship + checks Redis busy state for both users
3. If both free: sets `call:busy:{userId}` keys, notifies receiver via `call:incoming`
4. Receiver sees `CallOverlay` with Accept/Decline buttons
5. On accept: both users get Agora RTC token via `GET /api/agora/call-token?channelName=...`
6. Both join Agora RTC channel with audio tracks
7. On end/disconnect: Redis busy keys cleared, peer notified

### Agora RTC Integration

Voice calls use `agora-rtc-sdk-ng` with the following configuration:

- **Client mode**: `rtc` with `vp8` codec
- **Audio encoder**: `music_standard` (48kHz, mono, with AEC/ANS/AGC)
- **Video encoder** (optional): 480×360 @ 15fps, 200–600 kbps
- **Video optimization**: `motion` (smooth over sharpness)

The `connectToAgoraCall()` function in `call.service.ts` creates the client, joins the channel, creates and publishes a microphone audio track, and subscribes to remote user events.

### Video Calls

Voice calls can be upgraded to video mid-call via `toggleVideo()`. The `createCallVideoTrack()` function creates and publishes a camera video track. Both local and remote video tracks are played into ref-attached DOM elements. Camera permission is pre-checked on web (skipped on Capacitor to avoid double-acquire issues on iOS WKWebView).

### CallOverlay UI

- Fixed position top-right corner, visible on **all routes**
- Transparent glass design (`bg-black/30 backdrop-blur-2xl`)
- Shows peer name, photo, and status (Incoming/Calling/duration)
- Controls: Mute (outgoing + active), End/Decline (all states), Accept (incoming)
- Video toggle and speaker toggle when active

### Busy State Prevention

- Redis `call:busy:{userId}` prevents a user from receiving calls while already in one
- `call:initiate` returns `{ success: false }` when busy
- Call button disabled in UI when `callState !== 'idle'`

### Group Call Support

Active calls support inviting additional friends via `call:invite` socket event. The `InviteSpotlight` component provides a friend picker during active calls. `call:participant_left` events remove disconnected participants from the list.

## Socket.IO Events

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `friend:status` | `{ userId, isOnline, activity? }` | Friend online/offline (activity piggybacked on online) |
| `friend:activity` | `{ userId, activity }` | Friend activity changed (watching content or null) |
| `friend:request_received` | (triggers full refetch) | New incoming request |
| `friend:request_accepted` | (triggers full refetch) | Request accepted |
| `call:incoming` | `{ callerId, callerName, callerPhoto }` | Incoming call |
| `call:accepted` | `{ channelName }` | Call accepted by receiver |
| `call:rejected` | (no payload) | Call rejected |
| `call:ended` | (no payload) | Call ended |
| `call:participant_left` | `{ userId }` | Participant left group call |

### Client → Server

| Event | Payload | Callback | Description |
|-------|---------|----------|-------------|
| `call:initiate` | `{ receiverId }` | `{ success }` | Start call |
| `call:accept` | `{ callerId }` | `{ success, channelName?, token?, appId?, uid? }` | Accept call (token returned inline) |
| `call:reject` | `{ callerId }` | — | Reject call |
| `call:end` | `{ peerId }` | — | End call |
| `call:save-history` | `{ peerId, type, duration? }` | — | Save call history (declined/ended) |
| `call:invite` | `{ inviteeId }` | `{ success }` | Invite friend to active call |

## Media Ducking & Music Pause on Calls

### How it works

Media ducking is managed in `call-media.ts` via the `startMediaDucking()` function, which is called from `CallProvider` (in `use-call.tsx`) when `callState` transitions to `incoming` or `active`.

```ts
// call-media.ts — startMediaDucking()
export function startMediaDucking(): () => void {
  const restore = duckMediaElements(0.2);  // Duck all <video>/<audio> to 20% volume
  window.dispatchEvent(new CustomEvent('dm-call:start'));
  desktopBridge.setCallActive(true);
  return () => {
    restore();
    window.dispatchEvent(new CustomEvent('dm-call:end'));
    desktopBridge.setCallActive(false);
  };
}
```

### `dm-call:start` / `dm-call:end` Custom Events

These events allow the music player to react without direct coupling.

`MusicEngineInit.tsx` listens for these events:
- `dm-call:start` → pauses music playback
- `dm-call:end` → allows music to resume

### Media Ducking (All Audio/Video Elements)

`duckMediaElements(0.2)` from `call.utils.ts` iterates all `<audio>` and `<video>` elements on the page. Video elements are **paused entirely** during calls (not just ducked). Audio elements are set to 20% of their original volume. The returned cleanup function restores all original volumes and resumes paused videos.

### Ducking Triggers on Incoming Calls (Not Just Active)

Media ducking activates on **both** `incoming` and `active` call states. This means:
- When a call **rings** (incoming), media is immediately ducked so the ringtone is audible
- When a call is **active**, ducking continues so the voice call audio is clear
- When the call **ends** or is **rejected**, volume is restored and `dm-call:end` fires

### Desktop Integration

`desktopBridge.setCallActive(true/false)` notifies the Electron main process of call state, enabling OS-level audio ducking and preventing the app from being suspended.

### Native Call UI

On iOS, `NWCallKit` plugin (custom CXCallController wrapper) handles:
- Outgoing call UI (`startOutgoingCall`, `reportOutgoingCallConnected`)
- Incoming call UI via `@capgo/capacitor-incoming-call-kit`
- Call end via `endCall()`

On Android, `@anuradev/capacitor-phone-call-notification` provides:
- Incoming call notification with Answer/Decline buttons
- "Call in progress" notification with End Call button
- Listener for `response` events (answer/decline/terminate)

## Security

- Message content sanitized via `sanitizeChatMessage()` before storage (stored XSS prevention)
- Typing events validate friendship status + UUID format (blocked user bypass prevention)
- `blockUser` uses database transaction (atomic delete + insert, race condition prevention)
- `sendRequest` handles unique constraint violations (duplicate request prevention)
- `acceptRequest` uses atomic `UPDATE WHERE status='pending' RETURNING` (double-accept prevention)
- Online status only visible to accepted friends
- Call tokens validate user is a participant in the channel name
- Redis busy state prevents concurrent calls to the same user

## i18n

All UI strings are translated across 14 languages under the `common.friends` namespace:

`title`, `messagesTitle`, `conversations`, `selectConversation`, `noConversations`, `noMessages`, `noFriends`, `online`, `offline`, `typing`, `watching`, `watchingSeries`, `typeMessage`, `send`, `back`, `accept`, `reject`, `pendingRequests`, `openMessages`, `addFriend`, `addFriendPlaceholder`, `requestSent`, `requestFailed`, `unfriend`, `block`, `unfriended`, `blocked`, `actionFailed`, `noUsersFound`, `sentRequests`, `cancelRequest`, `alreadyFriends`, `requestSentLabel`, `requestReceived`

## Testing

| Test File | Tests | Coverage |
|-----------|-------|---------|
| `format-activity.test.ts` | 7 | Movie, series, livestream, music, game, reading, fallback formatting |
| `types.test.ts` | 3 | FriendProfile, FriendRequest, SentRequest interfaces |
| `call/call.utils.test.ts` | 9 | duckMediaElements, formatDuration |
| `call/call.config.test.ts` | 5 | Audio/video encoder presets |
| `call/call.service.test.ts` | 3 | Token fetch, Agora connect |
| **Total** | **27** | |

## Related Docs

- [Authentication](../auth/README.md)
- [Watch Party](../watch-party/README.md)
- [Music](../music/README.md)
- [API Layer](../../architecture/API_LAYER.md)
- [Desktop Application](../../platforms/DESKTOP.md)
- [Mobile Application](../../platforms/MOBILE.md)
