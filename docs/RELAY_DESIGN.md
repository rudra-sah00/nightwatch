# Watch-party relay — design

> **Status: DESIGN ONLY. No code written.** Revised 2026-09-24 after measurement.
> Supersedes the hosting comparison in earlier drafts, which is now Appendix A.
>
> **Decided:** one relay process on the Talcher box, reached through the existing
> Cloudflare Tunnel, speaking Socket.IO. **Agora RTM is removed entirely** — from
> `package.json`, from both codebases, and from the backend's token endpoints.
> **Agora RTC stays** — voice and video are untouched.
>
> Not in scope: no SFU work, no authoritative game server, no server simulation, no
> client prediction. Movement stays client-authoritative and seat claims keep the
> no-arbiter deterministic rule in `theatre/lib/seat-claims.ts`.

---

## 1. The decision, and what it costs

| | Agora RTM today | This relay |
|---|---|---|
| Signalling bill | $2.76–28 per party, suspension on free-tier overage | **₹0** |
| Interpolation | **broken** for clock-skewed peers — they step at 8 Hz | **works** — one server timeline |
| Departure | 3 signals reconciled + `mergeMembers` | **1 signal** — the socket closes |
| Avatar lag (Mumbai user) | 237 ms | ~287 ms |
| Send rate ceiling | 20/s, SDK-enforced | ours |
| New infrastructure | — | none |

**The cost is ~50 ms of avatar lag.** That is the entire downside, and it is likely
invisible next to fixing the clock bug — today any peer whose wall clock is more than
`INTERP_DELAY_MS` off is not interpolated at all, so their avatar steps at the send
rate rather than moving.

Measured 2026-09-24, from a dev machine in India, and this is what sets the 287 ms:

| Measurement | p50 | p99 | n |
|---|---|---|---|
| Socket.IO ack RTT through the tunnel | **169.1 ms** | 208.8 ms | 150 |
| TCP connect RTT to the Cloudflare edge | 80.7 ms | 104.1 ms | 20 |
| **Derived: edge → tunnel → origin → back** | **88.4 ms** | — | — |
| Packet loss over a 34 s held connection | 0% | | |

The 88.4 ms leg is independent of the measuring machine's last mile — it is a
subtraction of two RTTs to the same edge IP at the same moment — so it is a property
of the tunnel and of Talcher's position. A pose crosses it twice, inbound and
outbound. It is better than the ~130 ms previously on record.

For a Mumbai fibre user: `7 + 44 + 44 + 7 = 102 ms` one-way, so
`25 sampling + 102 network + 160 buffer ≈ 287 ms`.

Appendix A records the options rejected and why.

---

## 2. Architecture

```
browser ──── Socket.IO / WebSocket ────▶ Cloudflare edge
                                              │ tunnel 7c6cdb71-…
                                              ▼
                                   relay.nightwatch.in → :8100
                              ┌───────────────────────────────┐
                              │  relay   ONE process, ONE     │
                              │  replica, 20 Hz tick          │
                              └───────────┬───────────────────┘
                                          │ shared Redis
              ┌───────────────────────────┴───────────────────┐
              │  backend-1 / -2 / -3 :4000  ← nginx :5000     │
              │  REST + existing Socket.IO                    │
              └───────────────────────────────────────────────┘

Agora RTC ──▶ voice and video only. Untouched.
```

### A separate process, one replica, same repo

`docker-compose.prod.yml` runs **three** backend replicas behind nginx with
`@socket.io/redis-adapter`. Adding relay handlers to that Socket.IO server breaks a
tick-based relay three ways:

1. **Room members land on different containers**, so fan-out needs a Redis pub/sub
   hop per message.
2. **Three tick loops.** Each replica would run its own 20 Hz timer with its own
   clock and counter — three competing timelines for one room. Not slow, wrong.
3. **The API process is hostile to a 50 ms budget.** Redis round trips, external HLS
   playlist fetches and FFmpeg clip work all live there; one slow call or GC pause
   becomes visible avatar stutter.

`package.json`'s `start:cluster` has the same problem — forking is free for a
stateless API and fatal for a room relay, because rooms need process affinity.

So: **new entrypoint, same repo, same Docker image, own container, one replica.**

```
src/relay/          room.ts  connection.ts  tick.ts  auth.ts  presence.ts  codec.ts
src/relay.ts        entrypoint
```

Imports and shares directly — no network call — `JwtUtils`, the Redis client,
`logger`, `config`, the watch-party types, and `room.store.ts` for membership reads.
Does not share the Express app, the existing Socket.IO server, or the cluster fork.

A separate *repo* was rejected: it would duplicate `JwtUtils` and the room types,
need a second deploy pipeline, and allow version skew in the wire format — which
presents as "avatars are occasionally in the wrong place" and is miserable to debug.

**Accepted risk:** one replica is a single point of failure affecting every party at
once. That is inherent to room affinity. Mitigated by `restart: unless-stopped`, the
drain-on-deploy in §7, and state recovery rather than a second transport. Sharding
whole rooms by code is the escape hatch; Talcher's 6 idle cores are far from needing
it.

---

## 3. Wire protocol

Socket.IO, forced to `transports: ['websocket']` so the connection never rides
HTTP long-polling. Socket.IO carries binary event arguments as separate frames, so
the compact pose format works without a custom framing layer.

### 3a. Events

| Event | Direction | Payload | Delivery |
|---|---|---|---|
| `hello` | relay → client | JSON — `{ selfSlot, rosterGen, roster, tickHz, interpDelayMs, roomEpoch, serverTime, seats }` | once, on join |
| `roster` | relay → client | JSON — `{ rosterGen, roster: [{ slot, userId, userName, character, seatId }] }` | on every change |
| `p` | client → relay | **binary**, 10 bytes | 20 Hz cap |
| `P` | relay → client | **binary**, 7 + 8n bytes | every tick |
| `m` | both | JSON — the existing `RTMMessage` union | rare |
| `d` | client → relay | JSON — `{ toSlot, inner: RTMMessage }` | rare, directed |
| `ts` | client ↔ relay | JSON — `{ id, clientMono }` → `{ id, clientMono, serverTime }` | clock probe |
| `renew` | client → relay | JSON — `{ token }` | every ~13 min |
| `goaway` | relay → client | JSON — `{ reason, reconnectAfterMs }` | on drain |
| `err` | relay → client | JSON — `{ code, message }` | rate limits, rejects |

Keeping `m`'s payload as the existing `RTMMessage` union is deliberate: `rtm-events.ts`
and every `on*` subscriber then work unchanged. Rare messages stay JSON because a
binary schema buys nothing and costs churn on every field added.

### 3b. Pose record — validated against `theatre/lib/layout.ts`

| Field | Type | Range needed | Verdict |
|---|---|---|---|
| `slot` | `uint8` | 0–9 (max 10 members) | ample |
| `x` | `int16` cm | `ROOM.minX..maxX` = −480..480 | ample; `POSITION_EPSILON` is 2 cm, so 1 cm is finer than the dead band |
| `z` | `int16` cm | `ROOM.minZ..maxZ` = 0..850 | ample |
| `y` | **`uint8` cm** | `FLOORS.front` 0, `stairTreads()` 15 and 30, `FLOORS.rearPlatform` 45, + `SEATED_AVATAR_LIFT` 0.199 → **max 65 cm** | narrowed from the sketched `int16`; 4× headroom, and there is no jump in `use-avatar-controls` |
| `yaw` | `uint8` | 0–360° → **1.40625°/step** | finer than `ROTATION_EPSILON` (2°), so quantisation cannot produce a step the dead band would not already swallow |
| `state` | `uint8` | 6 `AvatarState` + 5 `DANCE_CLIPS` → `sssdddxx` | fits, 2 bits spare |

**`y` stays on the wire**, contradicting THEATRE_3D §6. The code wins: `Snapshot` has
`y`, `use-theatre-network` sends it, `SnapshotBuffer` lerps it. Deriving it locally is
a separate change with its own risk on the stair treads.

**`c` (character) comes off the pose.** It is static per session and currently rides
every 8 Hz message. It moves to `roster`. Same for `userName` and `color` on
`SKETCH_CURSOR_MOVE`.

```
uplink  `p`   0 type u8 (0x01 pose / 0x02 cursor)
              1 seq  u16 LE, per-connection, wraps
              3 x    i16 │ 5 z i16 │ 7 y u8 │ 8 yaw u8 │ 9 state u8      = 10 B

downlink `P`  0 type u8 0x81
              1 tick u32 LE, ms since roomEpoch
              5 rosterGen u8
              6 count u8
              7 records, count × 8 B (slot, x, z, y, yaw, state)
```

Seven movers: **63 bytes in one event**, against ~840 across 7 JSON messages today.

### 3c. Why still batch, with no per-message billing

Three reasons survive the removal of the cost argument:

1. **The tick stamp is the shared timeline** — one server timestamp for every pose in
   the batch. This is what fixes §6 by construction rather than by correction.
2. **7× fewer events** means 7× less Socket.IO envelope, parse and dispatch work on
   both ends, next to HLS decode and WebGL.
3. It bounds server work per room to one write per client per tick, regardless of how
   many people are moving.

### 3d. `rosterGen`, and why slots need a generation counter

A slot index is meaningless without a roster. `P` and `roster` are separate events, so
a batch can arrive before the roster defining its slots, and a freed slot could be
reused while a client still maps it to the previous occupant — drawing a newcomer's
pose onto someone who left.

The relay bumps `rosterGen` on every roster change and echoes it in every batch. A
client whose generation differs **discards the batch**. At 20 Hz, dropping a tick or
two while the roster catches up is invisible.

This is also what retires `peersToDrop`'s `acknowledged` set, which exists only
because poses (Agora) and the roster (Redis/Socket.IO) are today different systems
that race.

### 3e. Stale discard — UDP semantics over a reliable transport

- **Uplink**: the relay keeps `lastSeq` per connection. Accept when
  `((seq - lastSeq) & 0xFFFF) < 0x8000`, else discard. Wraparound-safe.
- **Downlink**: the client keeps `lastTick`. Discard any batch with
  `tick <= lastTick`.

This matters *because* the transport is TCP. A batch delayed behind a retransmission
arrives stale; discarding it is what stops an avatar being dragged backwards. It is
the cheapest available substitute for datagrams.

### 3f. Rates

| Knob | Value |
|---|---|
| Server tick | **20 Hz**, 50 ms budget |
| `THEATRE_NET.SEND_HZ` | 8 → **20** (sampling delay 62 ms → 25 ms) |
| `INTERP_DELAY_MS` | **delivered in `hello`**, not compiled in. 160 initially; retune from measured jitter without a client release |
| `POSITION_EPSILON`, `ROTATION_EPSILON`, `quantise`, `exceedsDeadBand` | unchanged — the dead band is why a seated room sends almost nothing, and it is correct |
| Pose rate limit | 25/s per connection, token bucket |
| Control limit | 20/s; chat 5/s. Reject with `err`, never close |

### 3g. Sketch cursors

`use-sketch-overlay.ts:527` sends **raw Konva stage pixel coordinates**. That is
already a bug: two clients with different window sizes draw each other's cursors in
the wrong place. Normalise to 0..1 at the send boundary and pack as `uint16` fixed
point. Fixing it here is free; leaving it encodes a resolution-dependent value into a
binary format.

---

## 4. Auth and session

No new token type. Socket.IO handshake carries what `session.handler.ts` already
expects, and the relay verifies it the same way.

### 4a. Connect

1. Client connects to `relay.nightwatch.in`, `transports: ['websocket']`, with the
   token in the **auth payload**, not the query string — query strings are logged by
   every hop, and a JWT in cloudflared access logs is a credential leak. (Note the
   existing backend puts `guestToken` in `handshake.query`; do not copy that here.)
2. Verify with `JwtUtils.verify` — same `jose` secret, issuer and audience.
   `UserTokenPayload` for members, `GuestTokenPayload` for guests.
3. **Guest room scope**: reject unless `payload.roomId.toUpperCase()` equals the
   requested room. This is `requireGuestRoomScope` enforced at the relay door, for
   the reason that middleware exists — a guest identity is scoped to one party by
   construction.
4. **Revocation**: `AuthService.isGuestRevoked(payload.sub)`.
5. **Membership**: read `watch-party:room:<ROOM>` and require
   `members.some(m => m.id === userId)`. A pending member gets
   `err{code:'PENDING'}` and retries after `JOIN_RESULT` arrives on the existing
   Socket.IO.
6. Allocate a slot, bump `rosterGen`, emit `hello`, broadcast `roster`.

`userName` comes from the room document, never from the client — mirroring the
SECURITY note in `session.handler.ts`. A client that could set its own relay roster
name could impersonate a member in chat and in avatar labels.

### 4b. Renewal mid-party, without dropping

`signGuest` and `signAccess` both expire in **15 minutes**; `signGuestRefresh` in 4
hours. A 2-hour party outlives its access token eight times, so this is mandatory.

```
relay tracks authExpiresAt per connection
  expiry − 120 s : emit err{code:'AUTH_EXPIRING'}
  client         : refresh via the existing endpoint, emit renew{token}
  relay          : verify, re-check revocation, re-check membership,
                   rebind authExpiresAt
  expiry + 60 s  : goaway, then close
```

Three properties, each a bug if missed:

- **Never tear down the connection to renew.** The credential is rebound in place.
  Renewal must not cost a reconnect, a roster bump, or a seat.
- **Re-checking membership on renewal is the backstop for a kick**, not the mechanism.
- **A failed renewal must not silently leave the client connected.** Close after
  grace and let §7 recover.

### 4c. Immediate eviction

`MembershipService.kickMember` and `leaveRoom` already write Redis and emit over
Socket.IO. Add a Redis publish on `party:evict` with `{ roomId, userId, reason }`.
The relay subscribes and closes that connection at once, rather than waiting up to
15 minutes for the renewal re-check.

### 4d. Server-side authorisation — a real security fix

Today `JOIN_APPROVED`, `JOIN_REJECTED`, `KICK` and `STREAM_TOKEN` travel on a per-user
Agora channel (`user:<id>`) gated **only** by `isRtmMessageAllowed` on the receiver.
Any party member can publish a `KICK` at another member, and it is the receiver's own
check that saves us.

The relay routes `d` events, so it can check the sender for the first time:

| Message | Sender must be |
|---|---|
| `KICK`, `JOIN_APPROVED`, `JOIN_REJECTED`, `PARTY_CLOSED`, `PERMISSIONS_UPDATED`, `MEMBER_PERMISSIONS_UPDATED`, `CONTENT_UPDATED` | `room.hostId` |
| `PLAY_EVENT`, `PAUSE_EVENT`, `SEEK_EVENT`, `RATE_EVENT`, `SYNC` | `room.hostId` |
| `STREAM_TOKEN` | **relay only** — never accepted from a client |
| everything else | any member, subject to `room.permissions` |

**Keep `isRtmMessageAllowed` on the receiver too.** Defence in depth, and it is
already the enforcement point for locally-held permissions.

---

## 5. Room lifecycle and presence

Rooms live **in memory**, keyed by room code, created on the first authenticated
connection and destroyed when the last closes. No persistence — Redis already holds
party state and the chat backlog. State per room: `Map<slot, Connection>`,
`rosterGen`, `roomEpoch`, `lastSeq` per connection, and a `pending` pose map cleared
each tick.

### 5a. Presence replaces three signals

**Connection open (post-auth, post-membership) = present. Close = gone.**

| Signal today | Replaced by |
|---|---|
| RTM `MEMBER_LEFT`, fire-and-forget from `useWatchPartyLifecycle.leaveRoom` while navigating away | the socket closing |
| Socket.IO `MEMBERS_UPDATED` / `MEMBER_LEFT` — never reaches guests, whose sockets are not in `room:<id>` | `roster`, which every connected member receives by construction |
| Agora presence `REMOTE_LEAVE` / `REMOTE_TIMEOUT` / `INTERVAL` / `SNAPSHOT` (`media/lib/presence.ts`) | deleted outright |

The relay mirrors its roster into Redis at `watch-party:presence:<ROOM>` — a hash of
`userId → { slot, connectedAt, lastSeen }`, 30 s TTL refreshed every second — so REST,
the 2D sidebar and Smart TV clients read one roster instead of inferring one.

**`disconnected` survives with a narrowed job.** It stays a *UI* state: the sidebar
greys a member out during the existing grace period so a blip does not erase someone
mid-film. It stops being an input to avatars and seats — which is the distinction
`theatre/lib/roster.ts` already draws in `presentMemberIds`. Relay presence drives
avatars and seat reconciliation; `room.members` plus `disconnected` drives the sidebar.

### 5b. Seat claims keep their design

The relay does **not** arbitrate. Party admission is still the permission boundary,
the rule in `seat-claims.ts` is order-independent, and a referee would add a round
trip and a single point of failure. Two changes only:

- The relay replays the observed claim set in `hello` (`seats`), retiring the
  "each seated client re-asserts its own claim on `MEMBER_JOINED`" mechanism — which
  exists only because a late joiner never heard the claims that already fired. This
  is **not** electing an authority: the relay reports what it saw, every client still
  runs `applyClaim`, and a relayed claim can still lose to an earlier one.
- `at` becomes server time (§6), so ties break on one clock instead of ten.

Ghost claims become impossible: a claim is vacated when its holder's connection
closes, in the same tick, before anyone can lose a contest to it.

### 5c. Host connectivity

`HOST_DISCONNECTED` / `HOST_RECONNECTED` become derived facts — the relay knows
whether `room.hostId`'s connection is open and broadcasts the transition with the
existing 60 s grace. No client sends them.

---

## 6. Clock and timeline

### 6a. The bug

`SnapshotBuffer` compares wall clocks from two machines. Senders stamp
`t = Date.now()` (`use-theatre-network.ts:131,149`); receivers sample with their own
`Date.now()` (`:345`). So `INTERP_DELAY_MS` is `160 ms ± skew`.

The failure is not graceful. For a peer whose clock is more than ~160 ms behind,
`target >= newest.t` holds every call, the hold-at-newest branch runs, and **there is
no interpolation at all** — that avatar steps at the send rate. Consumer clocks drift
by seconds.

`useClockSync` does not fix it, and it is worth knowing why: it estimates
`serverTime - Date.now()` from a one-way message, which is `offset + one-way latency`,
not `offset`. There is no RTT probe to separate them.

### 6b. The fix, by construction

1. Every `P` batch carries `tick` — **one server timestamp for every pose in it**.
   Senders stop stamping. `Snapshot.t` becomes the relay's tick, identical on every
   receiver.
2. The client estimates `serverOffset` from the `ts` probe:
   `offset = serverTime - (clientMonoSent + rtt/2)`, median of 5, resampled every 30 s.
   This separates offset from latency.
3. `SnapshotBuffer.sample()` takes `serverNow() = performance.now() + serverOffset`.
   **`performance.now()` as the monotonic base**, so an NTP step or a user changing the
   clock mid-party does not jump every avatar.

Both sides of the comparison are now in server time, so `INTERP_DELAY_MS` is exactly
what it says. The hold-at-newest pathology becomes unreachable: a tick cannot be ahead
of `serverNow()` by more than the one-way network time, a fraction of the buffer.

`SEAT_CLAIM.at` is stamped the same way. The `at` field, earliest-wins, and the
lower-`userId` tiebreak are all unchanged.

---

## 7. Resilience without an Agora fallback

Removing RTM removes the fallback transport. **The relay becomes a hard dependency
for avatars, seats, chat delivery and playback sync.** That is a real increase in
blast radius and the design has to answer for it.

The answer is **state recovery, not a second transport.** Everything the relay
carries is already durable somewhere else:

| State | Durable home | Recovery on reconnect |
|---|---|---|
| Room, members, permissions, host | Redis `watch-party:room:<ROOM>` | `GET /api/rooms/:id` |
| Chat backlog | Redis `watch-party:chat:<ROOM>` | `getPartyMessages` — already used on join |
| Playback position | Redis, via `playback.service.ts` | `SYNC` from the host, or the REST state |
| Seat claims | relay memory + each client's own claim | `hello.seats`, plus every client re-applies |
| Avatar poses | nothing — ephemeral by design | next tick |

So the ladder is:

```
1. connected                       normal
2. reconnecting (jittered backoff 250 ms → 8 s)
     avatars freeze at their last pose; chat and playback continue locally;
     the film does not stop
3. reconnected                     hello + roster + REST refetch; state rebuilt
4. relay down > 60 s               banner: "Live sync unavailable — reconnecting".
                                   Playback continues from local state
```

What must be true for this to be acceptable, and each is a requirement:

- **The video never pauses because the relay dropped.** Playback is local; the relay
  only carries *changes* to it.
- **`goaway` drains deploys.** Stop accepting, tell clients to reconnect after a
  jittered delay, let rooms rebuild from Redis and `hello`. A restart costs one
  reconnect, not a broken party.
- **Reconnect must reclaim the same slot and seat.** The relay recognises the same
  `userId` within a grace window and restores its slot, so the roster does not churn
  and the seat is not released.

### 7a. On removing RTM in one step — a recommendation you can override

You asked for RTM gone entirely, and §8 specifies that as the end state. My advice on
sequencing, which does end there:

**Keep the RTM path behind `NEXT_PUBLIC_RELAY_ENABLED` for exactly one release**, then
delete it in Stage 4. The reason is not caution about the relay — it is that stages 2
and 3 change presence and playback sync, and playback sync *is* the product. A flag
lets you roll back in one deploy instead of reverting a 26-file removal under
pressure.

If you would rather cut over in one step, the rollback plan must be "redeploy the
previous frontend and backend build", and Stage 3 should not ship on a day when a
party matters.

---

## 8. Removing Agora RTM — the exact surface

66 references across 26 frontend files, plus five backend files. **`agora-rtc-sdk-ng`
and all RTC token code stay.**

### 8a. Frontend — delete

| File | Note |
|---|---|
| `media/hooks/useAgoraRtm.ts` | 14 refs. The whole hook, including `mapLinkStateToConnectionState` and its test |
| `media/hooks/useAgoraRtmToken.ts` | 8 refs |
| `media/lib/presence.ts` | the presence mapping and its test — replaced by connection state (§5a) |
| `package.json` | `agora-rtm-sdk` dependency |

### 8b. Frontend — modify

| File | Change |
|---|---|
| `room/hooks/useWatchParty.ts` | 11 refs. `useAgoraRtm` → `useRelay`. Keep `isRtmMessageAllowed` and `dispatchRtmMessage` exactly as they are. Delete `onPresence`, both `handlePresenceEvent` calls, and the `agoraRtmToken` state |
| `room/hooks/useWatchPartyLifecycle.ts` | 7 refs. Delete the `MEMBER_LEFT` broadcast in `leaveRoom` — the socket closing is the departure now |
| `media/services/agora.api.ts` | 5 refs. Remove `getAgoraRtmToken`; keep the RTC token call |
| `media/lib/agora-sdk.ts` | remove the RTM lazy-load; keep RTC |
| `lib/env.ts` | remove RTM-only vars; keep RTC app id |
| `room/hooks/useWatchPartyMembers.ts`, `useWatchPartySync.ts`, `chat/hooks/useWatchPartyChat.ts` | swap the `rtmSendMessage` prop for `sendMessage` |
| `interactions/` — `use-sketch-overlay.ts`, `use-emoji-reactions.ts`, `use-soundboard.ts`, `useGestureDetection.ts`, `SketchOverlay.tsx`, `WatchPartySketch.tsx`, `EmojiReactions.tsx`, `Soundboard.tsx` | one ref each — the `rtmSendMessage` prop or the `RTMMessage` type. Mechanical rename |
| `components/` — `WatchPartyVideoArea.tsx`, `ActiveWatchParty.tsx`, `WatchPartySidebar.tsx`, `WatchPartySettings.tsx`, `MediaControls.tsx`, `hooks/use-watch-party-sidebar.ts` | same, one ref each |
| `room/services/rtm-events.ts` | **logic unchanged.** Only its doc comment mentions RTM. This is the payoff for keeping `m` as the existing union |

**Type and file names**: `rtm-messages.ts`, `RTMMessage`, `rtm-events.ts` keep their
names for this migration and get renamed in a separate mechanical pass. Renaming a
union referenced by 20+ files at the same time as changing the transport means a
failure could be either, and you would not know which.

### 8c. Backend

| File | Change |
|---|---|
| `utils/agoraToken.ts` | delete `generateRtmToken`; keep the RTC builder |
| `modules/agora/agora.service.ts` | delete the `generateRtmToken` method; keep `RtcTokenBuilder` |
| `modules/agora/agora.controller.ts` | delete `getRtmToken` |
| `modules/agora/agora.routes.ts` | delete `GET /api/agora/rtm-token` |
| `modules/watch-party/services/membership.service.ts` | delete the `generateRtmToken` import and **`agoraRtmToken` from the `JOIN_RESULT` payload** |
| `package.json` | keep `agora-token` — RTC still needs it |

### 8d. One ordering trap

Removing `agoraRtmToken` from `JOIN_RESULT` (`membership.service.ts:150`) is a **wire
contract change**. An old frontend that receives the event without it will try to
connect to RTM with `undefined` and fail to join a party at all.

**Deploy the frontend first**, so no client is asking for the field, then the backend.
Or leave the field in place, unread, for one release and remove it in Stage 4. The
second is safer and costs nothing.

---

## 9. Client integration

### 9a. New

| File | Responsibility |
|---|---|
| `features/watch-party/relay/lib/codec.ts` | encode/decode `p` and `P`. **Pure, no DOM, no transport** — where the unit tests live |
| `features/watch-party/relay/hooks/use-relay.ts` | one Socket.IO connection per party. Auth, `hello`, `renew`, `ts`, `serverNow()`, roster state, `goaway`, reconnect |
| `features/watch-party/relay/lib/clock.ts` | the `serverOffset` estimator (§6b). Pure, testable |
| `features/watch-party/relay/lib/slots.ts` | slot ↔ userId binding, `rosterGen` gating |

### 9b. What `use-theatre-network.ts` becomes

A thin adapter. It keeps its entire public surface — `publishPose`, `samplePeer`,
`peerIds`, `peerCharacter` — so `TheatreScene`, `RemoteAvatar` and `LocalPlayer` are
untouched.

**Loses**: the `onMemberJoined`/`onMemberLeft` subscriptions, the roster reconcile
effect, `acknowledged`, the `STALE_MS` sweep, `peerCharacters` state (now from
`roster`), the character re-announce effect (a roster field cannot be swallowed by a
dead band), and the 150 ms entry announce (`hello` replaces it).

**Keeps**: the rate cap, `exceedsDeadBand`, `quantise`. `send()` calls
`relay.sendPose(encodePose(q))` instead of `rtmSendMessage`.

Roughly 340 lines → ~120.

### 9c. Other changed files

| File | Change |
|---|---|
| `theatre/lib/interpolation.ts` | `push` and `sample` take **server** time. `INTERP_DELAY_MS` becomes a default overridden by `hello`. `SEND_HZ` 8 → 20. Delete `STALE_MS`. `quantise` and `exceedsDeadBand` unchanged |
| `theatre/hooks/use-seat-occupancy.ts` | `rtmSendMessage` → `sendMessage`; `onSeatClaim` → relay handler; `onMemberLeft` → `roster` handler; `at` from `serverNow()`. Delete the `onMemberJoined` re-assert effect and the ghost-claim reconcile pass |
| `room/utils.ts` | `mergeMembers` loses its disconnected-preservation branch (§5a) |
| `room/hooks/useClockSync.ts` | superseded by `relay/lib/clock.ts`. Delete with RTM |

### 9d. Backend new

| Path | Note |
|---|---|
| `src/relay/` | `room.ts`, `connection.ts`, `tick.ts`, `auth.ts`, `presence.ts`, `codec.ts`, `metrics.ts` |
| `src/relay.ts` | entrypoint |
| `src/relay/codec.ts` | must be byte-identical to the frontend's. One file, copied in CI with a checksum test in both repos — do not maintain two implementations |
| `modules/watch-party/services/membership.service.ts` | publish `party:evict` on kick and leave (§4c) |
| `modules/watch-party/lib/room.store.ts` | add `presenceKey(roomId)` |

---

## 10. Deployment

### 10a. Compose

```yaml
  relay:
    image: nightwatch-backend:latest
    container_name: nightwatch-relay
    command: ["node", "dist/relay.js"]
    restart: unless-stopped
    env_file: [../.env]
    environment:
      - NODE_ENV=production
      - RELAY_PORT=4100
      - REDIS_URL=redis://nightwatch_redis_prod:6379
    ports: ["8100:4100"]
    networks: [nightwatch]
```

**No `replicas`. No cluster.** One process, for the reasons in §2.

### 10b. Tunnel

Add to tunnel `7c6cdb71-265b-43bd-9516-f30839b3afb1`:

```
relay.nightwatch.in  →  http://localhost:8100
```

A dedicated hostname rather than a path on `api.nightwatch.in`, so the relay's health,
restarts and metrics are separable from the API's. **No certificate work** — Cloudflare
terminates TLS. Restarting the relay does not touch the API, which is the point.

### 10c. Monitoring

| Signal | Why |
|---|---|
| **`relay_tick_overrun_total`** | **the one that predicts user-visible stutter.** Alert on any sustained non-zero rate |
| `relay_tick_duration_seconds` p50/p99 | headroom against 50 ms |
| `relay_connections`, `relay_rooms` | capacity |
| `relay_stale_discard_total` | rising = real reordering, which is what §3e exists for |
| `relay_reconnects_total` | the §7 ladder firing — the health signal now there is no fallback |
| `relay_auth_renew_failures_total` | a rising count is a party about to drop |
| `relay_fanout_latency_seconds` p50/p99 | pose arrival → included in a batch |

Prometheus text endpoint on a private port, scraped by the path
`middlewares/metrics.middleware.ts` already uses.

---

## 11. Test plan

### 11a. Unit — Vitest, pure, no network, no GL

- **Codec round trip**, both frame types.
- **Bounds, asserted against `layout.ts` rather than against the format**: the four
  `ROOM` corners survive to ±1 cm; every walkable `y` (`FLOORS.front`,
  `FLOORS.rearPlatform`, both `stairTreads()` tops, each plus `SEATED_AVATAR_LIFT`)
  fits `uint8`; yaw round-trip error < `ROTATION_EPSILON`; all six `AvatarState` ×
  five `DANCE_CLIPS` survive the packed byte. These catch a sixth seat or a taller
  platform breaking the wire format, the way `geometry.test.ts` catches a bad chair.
- **Sequence comparison** across `uint16` wraparound — back by 1, forward by 40000.
- **Stale discard**: `tick <= lastTick` dropped; mismatched `rosterGen` dropped.
- **The clock regression test**: with server-stamped ticks, `SnapshotBuffer` returns
  an identical pose at `serverOffset` of 0, +5000 and −5000 ms. *This test fails
  against today's code*, which is the point of writing it.
- **Slot binding**: a pose whose slot has no roster entry is buffered and bound when
  `roster` arrives; never rendered onto the slot's previous occupant.
- **Room model**: slot allocation; a slot is reused only after the `roster` that
  vacated it; `rosterGen` bumps on every change; a batch contains only movers since
  the last tick; a fully seated room produces empty ticks.
- **Auth**: valid / invalid / expired; guest `roomId` out of scope rejected; revoked
  guest rejected; pending rejected; `renew` extends without changing slot, roster or
  seat; expiry + grace closes.
- **Directed authorisation**: non-host `KICK`, `SYNC`, `PERMISSIONS_UPDATED` rejected
  server-side; `STREAM_TOKEN` from a client rejected.
- **`seat-claims.test.ts` unchanged** — order-independence must still hold, because
  the relay is not an arbiter.

### 11b. Integration — real relay on an ephemeral port, `socket.io-client`

- Two clients: pose round trip; `roster` on join and on close.
- Kill a socket → its seat frees and its avatar despawns within one tick, with no
  `disconnected` grace ambiguity. This is the Stage 2 gate as a test.
- **Reconnect reclaims the same slot and seat** within the grace window (§7).
- `goaway` → client reconnects after the jittered delay.
- 10 clients: slot exhaustion rejected cleanly rather than allocating slot 10.

### 11c. Not unit-testable — per `docs/TESTING.md`

- **Anything needing a GL context**: whether motion *looks* smooth, the character
  controller, animation blending. Manual and Playwright only. **Do not mock a GL
  context.**
- **Anything needing a real network**: p99 jitter, the tunnel's behaviour under load,
  recovery from a genuine 60-second outage. A loopback test proves the protocol, never
  the transport. Two devices on two real networks, or it is not measured.
- **The tunnel and the drain-on-deploy**: staging only.

### 11d. Load

Synthetic harness against the Talcher box (6 cores, idle over Tailscale): 50 rooms ×
8 clients at 20 Hz = 400 connections, 8,000 poses/s in, 8,000 batches/s out.
**Gate: `relay_tick_overrun_total` stays 0.** Record tick p99 and client frame time at
every stage gate, per THEATRE_3D §13.

---

## 12. Staged rollout

| Stage | Moves | Gate |
|---|---|---|
| **0** | Clock fix (§6a), stop seated pose heartbeats, jitter instrumentation. **All three on Agora, before the relay exists** | Offset near zero against an RTT-measured offset; p50/p99 jitter recorded for ≥20 real sessions; seated pose traffic measured at zero |
| **1** | Relay process, auth, tick, `AVATAR_TRANSFORM`. Behind `NEXT_PUBLIC_RELAY_ENABLED` | Two clients, smooth motion. Relay latency and p99 jitter recorded in the same session as Agora's. Relay killed mid-party → avatars freeze, **film keeps playing**, reconnect restores slot and seat |
| **2** | Presence from connection state, `SEAT_CLAIM`; delete the three-signal reconciliation | A killed tab frees its seat within one tick. `media/lib/presence.ts` deleted, `mergeMembers` simplified, `STALE_MS` gone, suite green |
| **3** | The other 28 types: chat, playback, sketch, interactions, permissions, directed | Playback drift no worse than today, measured against `usePredictiveSync`'s numbers. Chat backlog intact after a forced reconnect. Non-host `KICK` rejected server-side |
| **4** | **Remove Agora RTM** — §8 in full. Drop the flag, the SDK, the token endpoint, `agoraRtmToken` from `JOIN_RESULT` | Nothing imports `agora-rtm-sdk`. **RTC untouched: voice and video still work.** Bundle size drop recorded. Frontend deployed before backend (§8d) |

Order is deliberate: **poses first** because the failure mode is cosmetic, **playback
last** because that *is* the product. Stage 4 is the removal you asked for, and it
comes after the relay has carried everything in production for a while.

---

## Appendix A — hosting options rejected, with measurements

Recorded so they are not relitigated.

| Option | Mumbai user | Cost | Why not |
|---|---|---|---|
| **Talcher + Tunnel + Socket.IO** | ~287 ms | ₹0 | **chosen** |
| Mumbai VPS + WebTransport datagrams | ~99 ms | ₹400–800/mo | the only way to reach ~99 ms, because it is the only way to own a UDP/443 endpoint. Rejected on cost. Also makes Tailscale a production dependency for joins, since Talcher's Redis is not publicly reachable |
| Durable Objects | ~199 ms | ₹0–450/mo | beats Agora and removes the 88 ms origin hop, but needs a Workers-runtime rewrite. **Free-tier eligibility unverified** — historically Workers Paid only |
| Cloudflare Realtime SFU DataChannels | ~90–110 ms | ₹0 within 1,000 GB | real unreliable delivery (`ordered:false, maxRetransmits:0`, documented). But **no tick server**, so no server-stamped timeline and no presence from connection state; presence would still need Socket.IO, so two transports forever. N² control plane: 8 publications + 56 subscriptions, `N+1` authenticated API calls per join |
| Direct to Talcher, no Cloudflare | ~175 ms best case | ₹0 | **measured impossible.** `117.199.185.185:443/5000/80` all time out. `tailscale ping` × 20: `direct connection not established`, every packet via `DERP(blr)` — if WireGuard's traversal stack cannot get in, a browser cannot. An `AAAA`-only relay is unreachable from any IPv4-only client, including the dev Mac, which has **no global IPv6 address** (`nc -6` and `curl -6` both fail) |
| Browser-to-browser mesh for poses | ~115 ms | ₹0 | genuine datagrams with no server in the data path. Deferred, not rejected — it is an optional later stage on top of this relay, and it depends on NAT hole-punch success on Indian mobile, which is unmeasured. The Tailscale result suggests at least some home networks will fall back to TURN |
| WebTransport through the Tunnel | — | — | cloudflared speaks QUIC to the edge, but it proxies HTTP semantics only. Cloudflare does not terminate or proxy WebTransport to any origin; `WebTransport` is absent from the Workers protocols table entirely. The browser→edge leg fails before the tunnel is reached |

**One correction on record.** REALTIME_MIGRATION.md §2 said the rotating IPv6 prefixes
mean the box "cannot hold a DNS name or a TLS certificate". The certificate half was
wrong — a certificate binds to a **name**, not an address, and DNS-01 ACME validation
needs no inbound connectivity. Daily DNS updates plus DNS-01 would solve certificates
completely. The real blockers are NAT traversal and IPv4-only clients, above.
