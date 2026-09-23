# Live TV in a Watch Party

Watching a live TV channel together is the only watch-party mode where the media
URL is not ours, the timeline is not shared, and the host never touches the
controls. Almost every bug in party playback has come from treating it like VOD.

This document is the end-to-end picture across both repos, because the failure this
was written for spanned them: **a guest saw the "HOST CONTROLS PLAYBACK" lock badge
over a black frame while the host watched the channel normally.**

## Reading the symptom

The lock badge is not an error state. `CenterPlayButton` renders it when
`!isPlaying && !isLoading` and the viewer is a guest (`disabled`). The `isLoading`
half matters for diagnosis:

| Guest sees | `isLoading` | `isPlaying` | Means |
|------------|-------------|-------------|-------|
| Spinner / nothing | `true` | `false` | The stream is still loading — a URL or network problem |
| **Lock badge** | `false` | `false` | **The stream loaded fine. The video is paused.** |
| Video | `false` | `true` | Working |

So "guest stream not loading, locked showing" was never a URL problem on the web.
The manifest had parsed (that is what clears `isLoading`); the element was simply
never playing, and the overlay a guest could have tapped is inert by design.

## The five independent causes

Each one alone was enough to leave a live-TV guest stuck. All are fixed.

### 1. The guest was briefly mistaken for the host

`use-watch-party-client.ts` computed `user?.id === room?.hostId`. Before the room
loads both sides are `undefined`, so `undefined === undefined` reported **every**
viewer as host — including a guest, who has no `user` at all.

That window is exactly when a guest receives its first party state. `onStateUpdate`
is gated on `if (isHostRef.current) return`, because the host must not apply its own
broadcasts. So the update was dropped, and `usePredictiveSync` skipped registering
its apply and enforce effects for the same reason.

Fixed by `isPartyHost(room, userId)` in `room/utils.ts`: a missing id on either side
means "not the host", never "maybe".

### 2. A held state update expired after 10 seconds

`usePredictiveSync` cannot act on an update until the element reports
`readyState >= 1`, so it holds one. That holding used to poll every 250 ms and give
up after 10 s.

On expiry `stateRef` was still null — which **also** disables the 2 s enforcement
loop, since it returns early without state. The guest was left with a paused video,
no state, and nothing that would ever set either.

A live channel served through the backend playlist proxy (resolve upstream, fetch,
rewrite, then fetch a segment) routinely misses a 10 s window on a cold cache.

Now event-driven — `loadedmetadata`, `loadeddata`, `canplay`, `durationchange` — with
no deadline, and a 500 ms poll only to bind an element that has not mounted yet.

### 3. Refused autoplay was unrecoverable

`play()` rejects with `NotAllowedError` when the document has no user activation —
the normal state for someone who opened an invite link and was auto-approved. Every
call site swallowed it, and the guest's overlay is `disabled`, so nothing could ever
start the video.

Now the refusal is retried muted, and `PARTY_PLAYBACK_BLOCKED_EVENT` tells the UI to
either offer "Enable Audio" (picture running, sound withheld) or make the overlay
tappable (nothing playing). See
[WATCH_PARTY.md → Blocked autoplay](./WATCH_PARTY.md#blocked-autoplay).

### 4. `SYNC_REQUEST` was sent once, with no retry

A guest's playback state comes from the host's `SYNC` reply to its `SYNC_REQUEST`.
`JOIN_APPROVED` also carries `initialState`, but it is a *peer* RTM message and a
pending guest is not on the channel yet (its RTM token derives from `room.id`, which
it does not have until approved), so it is admitted over Socket.IO `JOIN_RESULT` and
never sees it.

RTM channel messages are fire and forget. One sent a second after connect can be
dropped, as can the host's reply, and a lost packet left the guest with no state at
all. On VOD that self-heals the moment the host touches the scrubber. On live TV
nobody ever touches anything.

Now retried up to 5 times, 3 s apart, stopping as soon as any state update lands.

### 5. The backend stored live rooms as paused

`state.isPlaying` was initialised `false` for every room type. It is both the value
a host publishes when its own `<video>` is not readable yet, and the value each
guest's `usePredictiveSync` enforces every 2 s — **including by pausing a guest whose
player had already autoplayed**.

A live channel is playing the moment the room exists and its host never touches the
controls, so `false` was a claim nothing ever corrected. Guests were actively held
paused.

`RoomService` now initialises `isPlaying: type === 'livestream'`, in both
`createRoom` and `updateContent`.

## The URL path

Live TV also has a genuine URL problem, which is what breaks it on **mobile**.

```
  Channel list  ─ raw stream_url ──▶  POST /api/rooms/:id/create
                                            │
                                            ▼
                              IptvService.resolveStreamUrl(contentId)
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
        proxy-only source                               everything else
   /api/livestream/iptv/proxy-playlist/<id>        redirect resolved server-side
        (RELATIVE, on purpose)                      (absolute upstream URL)
                    │                                               │
                    └───────────────────┬───────────────────────────┘
                                        ▼
                          stored on the room, replayed
                            to every member verbatim
```

Two rules follow from that stored URL, and both had holes:

**The relative path must be absolutised per client.** It is relative precisely so
each member resolves it against their own origin. `toAbsoluteStreamUrl` in
`useHls.ts` does that — against `NEXT_PUBLIC_BACKEND_URL` on Capacitor, where the
frontend domain sits behind CF Access. It previously existed only in the native-HLS
branch, a branch live streams never take: live is deliberately kept on hls.js **even
on Capacitor**, because AVPlayer cannot follow this playlist's rewritten paths. So
the one case needing it was the one case that never got it, and live TV in a party
failed to load on iOS and Android while VOD was fine.

**No member token may be injected.** `normalizeRoomUrls` skips `streamUrl` entirely
when `room.type === 'livestream'`. `injectTokenIntoUrl` overwrites the path segment
following any `hls` or `cdn` one, which mangles upstream IPTV URLs:

| Upstream URL | After injection | Lost |
|--------------|-----------------|------|
| `…/v1/stitch/embed/hls/channel/<id>/master.m3u8` | `…/v1/stitch/embed/hls/TOKEN/<id>/master.m3u8` | `channel` |
| `…/hls/<id>/index.m3u8` | `…/hls/TOKEN/index.m3u8` | `<id>` |

Either shape 404s — a channel that plays fine solo and buffers forever in a party.
Live TV has no per-member token anyway; the backend marks these rooms with the
`LIVESTREAM` sentinel.

## What the party does differently for live rooms

| Concern | VOD | Live |
|---------|-----|------|
| `Player.Root streamMode` | `vod` | `live` (live-tuned hls.js config, no seek UI) |
| Predictive sync | Position + rate correction | Play/pause only, never seeks |
| `SEEK_EVENT` / `RATE_EVENT` | Applied | Dropped in `useWatchPartySync` |
| Host `seeked` / `ratechange` listeners | Attached | Not attached (`useWatchPartyHostSync`) |
| Persisted `currentTime` | Real position | Always `0` |
| Initial `state.isPlaying` | `false` | `true` |
| `streamToken` | Real stream session token | `LIVESTREAM` sentinel |
| Stream-token auto-renewal | Yes, at 3.5 h | Skipped — there is no session |
| Clip recording | Not offered | Host-only `RecordButton` |

## Test coverage

| What | Where |
|------|-------|
| Host derivation, incl. the `undefined === undefined` case | `tests/features/watch-party/room-utils.test.ts` |
| Token never injected into a live URL | `tests/features/watch-party/room-utils.test.ts` |
| Held updates, seek clamping, blocked autoplay, enforcement | `tests/features/watch-party/hooks/usePredictiveSync.test.ts` |
| Relative URL absolutisation, web + Capacitor | `tests/features/watch/player/useHls-url.test.ts` |
| Live resolution, sentinel, no VOD fallthrough | backend `tests/modules/watch-party/unit/watch-party.live-tv.test.ts` |
| Live rooms start playing, content switches | backend `tests/modules/watch-party/unit/watch-party.room-live.test.ts` |
| Controller-level live paths | backend `tests/modules/watch-party/unit/watch-party.live-controllers.test.ts` |

## See also

- [WATCH_PARTY.md](./WATCH_PARTY.md) — the party as a whole
- [LIVESTREAM.md](./LIVESTREAM.md) — the livestream framework
- Backend: `docs/architecture/watch-party.md` → Live TV in a Party
- Backend: `docs/architecture/livestream.md` → Shared resolution
