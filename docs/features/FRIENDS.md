# Friends & Voice Calls

## Overview

The friends system provides social features: friend requests, online presence tracking, and 1-on-1 voice calls via Agora RTC. The right sidebar displays the friends list with real-time online/offline status and activity tracking.

## Architecture

```
src/features/friends/
├── api.ts                          # API layer with TTL caching
├── types.ts                        # TypeScript interfaces (FriendProfile, FriendActivity, etc.)
├── format-activity.ts              # Utility to format activity into display string
├── hooks/
│   ├── use-friends.ts              # Friends list, requests, accept/reject/cancel, activity
│   └── use-call.tsx                # CallProvider context, Agora RTC, call state machine
└── components/
    └── CallOverlay.tsx             # Global floating call card (top-right corner)
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
6. Receiver accepts/rejects from the sidebar "Requests" section
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
| `GET` | `/api/friends/search?q=` | Search users by username (max 10) |
| `GET` | `/api/friends/requests/pending` | Incoming requests (max 100) |
| `GET` | `/api/friends/requests/sent` | Outgoing requests (max 100) |
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
  type: string;          // 'movie' | 'series' | 'live'
  title: string;         // Content title
  season: number | null; // Series season (null for movies/live)
  episode: number | null;// Series episode (null for movies/live)
  episodeTitle: string | null;
  posterUrl: string | null;
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

1. Caller clicks phone icon → `call:initiate` socket event
2. Backend validates friendship + checks Redis busy state for both users
3. If both free: sets `call:busy:{userId}` keys, notifies receiver via `call:incoming`
4. Receiver sees `CallOverlay` with Accept/Decline buttons
5. On accept: both users get Agora RTC token via `GET /api/agora/call-token?channelName=dm-{sorted-ids}`
6. Both join Agora RTC channel with audio tracks
7. On end/disconnect: Redis busy keys cleared, peer notified

### CallOverlay UI

- Fixed position top-right corner, visible on **all routes**
- Transparent glass design (`bg-black/30 backdrop-blur-2xl`)
- Shows peer name, photo, and status (Incoming/Calling/duration)
- Controls: Mute (outgoing + active), End/Decline (all states), Accept (incoming)

### Busy State Prevention

- Redis `call:busy:{userId}` prevents a user from receiving calls while already in one
- `call:initiate` returns `CALLER_BUSY` or `RECEIVER_BUSY` error
- Call button disabled in UI when `callState !== 'idle'`

## Socket.IO Events

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `friend:status` | `{ userId, isOnline }` | Friend online/offline |
| `friend:activity` | `{ userId, activity }` | Friend activity changed (watching content or null) |
| `friend:request_received` | `{ id, senderId }` | New incoming request |
| `friend:request_accepted` | `{ id, acceptedBy }` | Request accepted |
| `call:incoming` | `{ callerId, callerName, callerPhoto, channelName }` | Incoming call |
| `call:accepted` | `{ acceptedBy, channelName }` | Call accepted |
| `call:rejected` | `{ rejectedBy }` | Call rejected |
| `call:ended` | `{ endedBy }` | Call ended |

### Client → Server

| Event | Payload | Callback | Description |
|-------|---------|----------|-------------|
| `call:initiate` | `{ receiverId }` | `{ success, channelName?, error? }` | Start call |
| `call:accept` | `{ callerId }` | `{ success, channelName? }` | Accept call |
| `call:reject` | `{ callerId }` | — | Reject call |
| `call:end` | `{ peerId }` | — | End call |

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
| `api.test.ts` | 27 | All endpoints, cache invalidation, edge cases |
| `types.test.ts` | 7 | All interfaces |
| `format-activity.test.ts` | 4 | Movie, series, livestream, fallback formatting |
| `hooks/use-friends.test.ts` | 12 | Mount, online/offline, accept/reject/cancel, socket events, activity |
| **Total** | **67** | |
