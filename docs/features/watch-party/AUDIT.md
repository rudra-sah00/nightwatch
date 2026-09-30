# Watch party audit — Phase 0 discovery

**Status:** analysis only. No code changed.

**Method.** Unlike the player pass there was no prior finding list to re-verify, so this is
original discovery. Every finding below was read at the cited line in the current tree and the
line numbers re-checked after writing. A subagent fan-out was attempted and aborted on a
dispatch failure, so all of this is first-hand reading rather than delegated leads.

**Deliberately short.** Twelve real defects beat forty guesses, and the bulk of the value here is
one root cause with a wide blast radius. Areas where I found nothing are recorded as
*shallow pass* rather than as a clean bill of health — see [§ Coverage honesty](#coverage-honesty).

| Severity | Meaning |
|---|---|
| CRITICAL | Data loss, a security hole, or an unrecoverable session |
| HIGH | Reliably reproducible and user-visible |
| MEDIUM | Real, narrower blast radius or cosmetic-but-wrong |
| LOW | Correct to fix, no user-visible consequence today |

---

## The short list

**WP-C1 was the finding that mattered, and is now fixed.** The watch-party RTM control plane was
unauthenticated except for three message kinds: any approved member could seize playback, evict the
host, end the party, repoint everyone's player at arbitrary content, or grant themselves the
permissions the one existing gate was built to enforce.

**WP-H2 is what is left worth fixing.** The same receive path validates *who sent* a message and
never *whether it is well-formed*, and one malformed `SKETCH_SYNC_STATE` throws inside a React state
updater on every recipient at once. It needs no hostile intent — a client on a different build does
it by accident, during join.

Everything else here is ordinary bug work.

---

## CRITICAL

### WP-C1 — The inbound RTM gate covers three message kinds out of thirty-one; the rest are applied without checking who sent them

**✅ FIXED — see `HOST_ONLY` in `room/permissions.ts`.** A `HOST_ONLY` set is now checked before
anything else in `isRtmMessageAllowed`, and it fails *closed* rather than open: every message in
it is meaningless to a client with no room, so refusing when no verdict is possible costs nothing
and removes the join-window gap entirely. The fail-open rule still applies to the sketch traffic it
was written for. Regression test `tests/features/watch-party/rtm-host-authority.test.ts` — 19 of
its 30 cases fail against the unfixed module, and the existing
`room-permissions.test.ts` assertion that playback was "never gated" was this defect written down
as intended behaviour and has been corrected in place.

**⚠️ ONE ROW REMAINS OPEN — `JOIN_APPROVED` / `JOIN_REJECTED`.** These are deliberately excluded.
They legitimately arrive while the recipient's `room` is still `null` — that is the join handshake
— so there is no `room.hostId` to compare against, and gating them the same way would break
joining outright. Closing them needs the expected host id threaded from the lobby into the join
window, which is a data-flow change rather than a gate change. **Still exploitable against a user
who is mid-join.**

One root cause, so it is one finding. The blast radius is enumerated below because each message
type is a separately exploitable action and each will need its own regression test.

`src/features/watch-party/room/hooks/useWatchParty.ts:151` is the only place an inbound RTM
message is checked against its sender:

```ts
if (!isRtmMessageAllowed(room, senderId, msg)) return;

// Route messages to sub-hooks
chat.handleIncomingRtmMessage(msg);
members.handleIncomingRtmMessage(msg);
sync.handleIncomingRtmMessage(msg);
```

`senderId` is consumed by that one call and then dropped. Every downstream handler takes the
message alone — `useWatchPartySync.ts:220` and `useWatchPartyMembers.ts:451` are both
`(msg: RTMMessage) => {`, with no sender parameter to check even if they wanted to.

And the gate itself only claims three kinds. `room/permissions.ts:180`:

```ts
const isSoundInteraction =
  message.type === 'INTERACTION' && message.kind === 'sound';

if (!(DRAW_GATED.has(type) || type === 'CHAT' || isSoundInteraction)) {
  return true;
}
```

Everything not draw-gated, not `CHAT`, and not a sound interaction returns `true` unconditionally.

This is not an oversight in the sense of nobody having thought about it. `room/permissions.ts`
is a careful, well-reasoned module and its argument for receiver-side enforcement of ephemeral
data is correct. The defect is that its scope was set by *which permissions the host UI can
toggle* (`canChat`, `canDraw`, `canPlaySound`) rather than by *which messages assert authority*.
Host authority is not a togglable permission, so it fell outside the model entirely.

**The load-bearing documentation claim is false.** `room/permissions.ts:161-165`:

```
 * ## What is not gated
 *
 * Emoji reactions, playback events, membership and theatre traffic. Emoji have no
 * permission to consult. Playback events are already ignored from non-hosts
 * downstream. Membership and 3D presence are not capabilities the host can revoke.
```

"Playback events are already ignored from non-hosts downstream" is not true. There is no such
filter. The only field that could support one is `RtmSyncState.fromHost`, and it is written at
`useWatchPartySync.ts:84` and `:363` and **never read anywhere in the feature** — grep for
`fromHost` returns four hits: the two type declarations and those two writes. Being a payload
field it would be forgeable anyway; the trustworthy identity is `senderId`, which is the Agora
publisher id rather than message content.

"Membership ... not capabilities the host can revoke" mislabels the problem. Kicking a member and
closing the party are exactly host powers — they are just not *permission flags*.

#### Blast radius

Each row is a message any approved member can publish to the channel and have every other client
act on. Severity is per action; the finding as a whole is CRITICAL.

| Message | Handler | Effect when sent by a non-host | Severity |
|---|---|---|---|
| `PERMISSIONS_UPDATED` | `useWatchPartyMembers.ts:507` | Sender grants itself `canDraw`/`canChat`/`canPlaySound` on every client, **defeating the WP-C1 gate itself** | CRITICAL |
| `MEMBER_PERMISSIONS_UPDATED` | `useWatchPartyMembers.ts:521` | Same, per-member, including muting any other member | CRITICAL |
| `PARTY_CLOSED` | `useWatchParty.ts:235` | `closeParty()` on every client — session over for everyone | CRITICAL |
| `KICK` | `useWatchParty.ts:222` | Evicts any member including the host; also clears their `guest_token` | CRITICAL |
| `CONTENT_UPDATED` | `useWatchPartySync.ts:298` | Repoints every member's player at an attacker-supplied room object | CRITICAL |
| `PLAY_EVENT` / `PAUSE_EVENT` / `SEEK_EVENT` / `RATE_EVENT` / `SYNC` | `useWatchPartySync.ts:223-227` | Seizes playback control of the party; also poisons clock calibration via `useWatchParty.ts:160` | HIGH |
| `STREAM_TOKEN` | `useWatchPartySync.ts:333` | Rewrites every member's stream URLs through `normalizeRoomUrls` | HIGH |
| `HOST_DISCONNECTED` / `HOST_RECONNECTED` | `useWatchPartySync.ts:318,327` | Fabricates the host-connectivity banner | MEDIUM |
| `JOIN_APPROVED` / `JOIN_REJECTED` | `useWatchParty.ts:167,212` | Answers a pending join on the host's behalf with an arbitrary room payload | HIGH |

All rows above are now gated **except the last**, which remains open — see the FIXED note at the
top of this finding. A detail found while fixing: `HOST_DISCONNECTED` and `HOST_RECONNECTED` are
handled by `useWatchPartySync` but published nowhere in the client — host connectivity is inferred
from RTM presence instead. They were gated anyway, since nothing legitimate is lost by requiring
the host of a message the host never sends.

Note the ordering dependency: `PERMISSIONS_UPDATED` is the one to fix first, because while it is
open the existing draw/chat/sound gate is bypassable and therefore not actually providing the
property it was written for.

**What is NOT vulnerable — the HTTP surface, which I expected to be the problem and is not.**
Every host-only REST endpoint enforces host identity server-side, in the service layer rather
than the controller. `watch-party.routes.ts` applies `authMiddleware` plus
`requireGuestRoomScope`, and the services check ownership directly:
`playback.service.ts:30` (`if (r.hostId !== hostId)`), `room.service.ts:175,224,248`,
`membership.service.ts:113,168,213`. `ChatService` resolves full permissions via
`lib/permissions.ts`. A guest cannot call a host-only endpoint. The hole is specifically that RTM
is peer-to-peer and never transits the backend, so none of that enforcement is in the path.

**Consequence.** Any user who has been admitted to a party — including an admitted guest with no
account — can take over or destroy it, using nothing but the RTM channel they are legitimately
connected to. No special tooling beyond a console call to the send path.

**How I could be wrong.**
- ~~If Agora RTM were configured so that only the host holds publish permission on the channel,
  the client-side hole would be unreachable.~~ **Checked and disproved.**
  `nightwatch-backend/src/utils/agoraToken.ts:18` mints RTM tokens with
  `RtmTokenBuilder.buildToken(appId, appCert, userId, privilegeExpiredTs)`. RTM tokens carry a
  login privilege for a user id and nothing else — there is no publisher/subscriber role in the
  RTM builder the way there is in RTC's `RtcRole`, and the token is not even scoped to a channel
  (`generateRtmToken(userId)` takes no room). So every member holds full publish rights on the
  channel and the hole is reachable by any of them. This was the one check that could have
  downgraded the finding; it raises confidence instead.
- If some wrapper I did not find re-checks the sender before these handlers run. I traced the one
  call site at `useWatchParty.ts:151` and grepped `senderId` across the feature — it appears only
  in `useAgoraRtm.ts` (which supplies it) and `useWatchParty.ts` (which spends it on the gate).
- Exploiting it for real needs a second participant and live Agora credentials, so the end-to-end
  demonstration is **not verifiable locally**. The gate's coverage, however, is a pure function
  and fully testable — see Phase 0.5.

---

## HIGH

### WP-H2 — A malformed `SKETCH_SYNC_STATE` throws inside a React state updater on every recipient

Found in the Phase 4 pass over `interactions/`.

Nothing on the RTM receive path validates payload *shape*. Every accessor in
`room/services/rtm-events.ts` is an `as` cast, and the WP-C1 gate that now sits in front of them
checks *who sent* a message, never *whether the message is well-formed*. `rtm-events.ts:202-204`:

```ts
subscribe('SKETCH_SYNC_STATE', (msg) =>
  callback({ elements: msg.elements as T }),
),
```

`use-sketch-overlay.ts:259-263` hands that straight to the setter:

```ts
const cleanupSyncState = onSketchSyncState<SketchAction[]>(
  ({ elements }) => {
    setActions(elements);
  },
);
```

And the setter dereferences it unconditionally — `SketchContext.tsx:133-141`:

```ts
_setActions((prev) => {
  const next = typeof update === 'function' ? update(prev) : update;
  return next.length > MAX_SKETCH_ACTIONS
    ? next.slice(next.length - MAX_SKETCH_ACTIONS)
    : next;
});
```

A message whose `elements` is absent, `null`, or not an array reaches `next.length` as a non-array.
`update` is not a function, so `next` is that value verbatim, and `undefined.length` throws
`TypeError` from inside the updater rather than at the call site.

**Consequence.** One malformed message takes out the sketch overlay — and, depending on where the
nearest error boundary sits, potentially the party view — for **every** recipient at once, not just
the sender. It needs no hostile intent: a client on an older or newer build that shapes `elements`
differently does it by accident, and `SKETCH_SYNC_STATE` is sent automatically to every joining
guest, so the blast lands during join.

**Precondition.** The sender needs `canDraw`, since `SKETCH_SYNC_STATE` is draw-gated.
`canGuestsDraw` defaults to `false`, so a guest needs the host to have enabled drawing; the host
always holds it.

**How I could be wrong.** If an error boundary above the overlay catches this and re-renders
cleanly, the severity drops from "party view dies" to "canvas resets". I have **not** verified
which boundary catches it or what the user actually sees — that needs the throw driven through a
real mount, which is the first thing the fix phase should do. The throw itself is certain;
`next.length` on `undefined` has one outcome.

---

### WP-H1 — The floating-emoji list has no cap and emission has no rate limit

`src/features/watch-party/interactions/hooks/use-floating-emojis.ts:51`:

```ts
setActiveEmojis((current) => [
  ...current,
  { id, emoji, userName, left, duration, rotation, wiggleOffsets },
]);
```

Entries leave only on their own 4.5 s timer. There is no `slice`, no maximum, and no throttle:
grep for `slice|MAX|length >|throttle|rateLimit|lastSent` across both
`use-floating-emojis.ts` and `use-emoji-reactions.ts` returns nothing.

The deduplication at `:80-84` is not a rate limit — it collapses *identical* messages within
500 ms buckets, so distinct emoji, or any sender varying `messageId`, passes straight through.

**Consequence.** Every concurrent emoji is a live animated DOM node. A held-down or scripted
send produces unbounded simultaneous animations for all members, not just the sender; emoji is
one of the ungated types in WP-C1, so there is no permission to revoke to stop it either.

Worth contrasting with the sketch canvas, which **is** capped at 200 actions
(`SketchContext.tsx:130-142`). The same class of growth was considered in one interaction surface
and not the other.

**How I could be wrong.** If the emitting UI debounces at the button. I have not yet read
`use-emoji-reactions.ts` in full or the button component, so the practical ceiling for an
*honest* client is unmeasured — but a hostile or scripted one has no ceiling at all. The visible
frame-rate consequence needs a real browser and is **not verifiable in happy-dom**.

---

## MEDIUM

### WP-M2 — `SKETCH_SYNC_STATE` carries a `targetId` that no receiver ever reads

`use-sketch-overlay.ts:250-256` addresses the sync response to one requester:

```ts
rtmSendMessageToPeer?.(requesterId, {
  type: 'SKETCH_SYNC_STATE',
  elements: actionsRef.current,
  targetId: requesterId,
});
```

`targetId` is declared on `RtmSketchSyncState`, set here, and read **nowhere** in `src/` — grep
returns this line plus two test fixtures. The receive handler discards it and applies `elements`
regardless of who the message was addressed to.

**Consequence.** Latent today, because delivery is peer-to-peer via `rtmSendMessageToPeer` and only
the addressed guest receives it. The field is doing no work, so the correctness of the whole
mechanism rests on the transport call being the peer variant — any future change to a broadcast
send, or any client that broadcasts it, replaces every member's canvas with state intended for one
joiner. A member holding `canDraw` can do that deliberately, though `SKETCH_CLEAR mode:'all'` is
already available to them, so this is not a meaningful privilege gain.

**How I could be wrong.** If the intent was for `targetId` to be advisory only, this is dead weight
rather than a defect. Either way it should not remain a field that looks like an access check and
is not one.

### WP-M3 — Members who cannot draw still broadcast cursor positions ten times a second, and every receiver discards them

`use-sketch-overlay.ts:523-535` broadcasts the cursor, and the `canDraw` check does not arrive
until `:537`:

```ts
const now = Date.now();
if (now - lastCursorBroadcast.current > 100) {
  rtmSendMessage?.({
    type: 'SKETCH_CURSOR_MOVE',
    ...
  });
  lastCursorBroadcast.current = now;
}

if (!isDrawing.current || !canDraw) return;
```

`SKETCH_CURSOR_MOVE` is in `DRAW_GATED`, so a sender without `canDraw` has every one of these
messages dropped by every recipient.

**Consequence.** Not a correctness bug — the gate does its job. It is pure waste: 10 messages per
second per non-drawing member with a pointer over the video, on a transport that bills and
rate-limits per message, all of it guaranteed to be discarded on arrival. With drawing off by
default this is the common case, not the rare one.

**How I could be wrong.** If Agora's per-channel rate limit is high enough that this never
approaches it, the only cost is billing. Measuring either needs live Agora — **not verifiable
locally**.

### WP-M4 — The join-approval poll writes state and fires a toast after unmount

`useWatchPartyLifecycle.ts:181-201`. The 10-second REST fallback checks the cleanup flag on entry
and then awaits twice without rechecking it:

```ts
const pollTimer = setInterval(async () => {
  if (socketCleaned) return;
  ...
    const roomData = await getRoomDetails(targetRoomId);
    if (roomData?.members.some((m) => m.id === activeUserId)) {
      const streamRes = await getPartyStreamToken(targetRoomId);
      ...
      setRequestStatus('joined');
      toast.success(t('requestApproved'));
```

The cleanup at `:206-210` sets `socketCleaned = true` and clears the timer, but an iteration already
suspended at either `await` resumes and runs to completion.

**Consequence.** Under React 19 the `setRoom` / `setIsConnected` / `setRequestStatus` calls are
silent no-ops on an unmounted tree, so the visible symptom is the toast: a user who gives up and
navigates away from the lobby can get "request approved" up to ten seconds later, on whatever page
they moved to, because `sonner` is mounted globally rather than inside the party subtree.

**How I could be wrong.** If something above this unmounts the toaster too, nothing is shown. The
missing recheck after the awaits is unambiguous; the user-visible tail is what I have reasoned
about rather than observed.

---

### WP-M1 — Clock offset carries no round-trip compensation, so every guest sits systematically behind the host

`src/features/watch-party/room/hooks/useClockSync.ts:23`:

```ts
const offset = serverTime - localTime;
```

`serverTime` is the *sender's* `Date.now()` at send — `rtm-messages.ts:11-13` says so explicitly
and `useWatchPartySync.ts:83,169,362` set it that way. `localTime` defaults to `Date.now()` at
**receive**. So the sample is `trueOffset − oneWayLatency`, and `getServerTime()` returns a party
time biased early by one network hop on every guest.

The 5-sample median at `:36-40` removes jitter, which is what its docstring claims, but a median
cannot remove a systematic bias — every sample carries the same sign of error.

**Consequence.** Guests compute expected party time consistently behind the host by roughly the
one-way RTM latency. Under the 0.5 s soft-correction threshold in `usePredictiveSync` this is
absorbed rather than oscillating, so it presents as a small constant lag, not as churn. This is
the mildest finding here and arguably an accepted tradeoff — it is listed because the file
documents jitter handling and is silent about the bias, so the omission reads as unintentional.

**How I could be wrong.** If RTM delivery latency is small enough relative to the 0.5 s threshold
to be irrelevant in practice, this is noise. Measuring it needs live Agora and a second
participant — **not verifiable locally**.

---

## LOW

### WP-L1 — The emoji dedup timers are untracked and outlive unmount

`use-floating-emojis.ts:84`:

```ts
setTimeout(() => recentEmojiIds.current.delete(dedupKey), 2000);
```

`spawnEmoji`'s own timer is registered in `timeoutsRef` and cleared by the unmount effect at
`:30-34`; this one is not. Harmless in effect — the callback only mutates a ref that is itself
about to be collected — but it is the same class of leak the sibling timer was deliberately
tracked to avoid, so the inconsistency is more likely an oversight than a decision.

---

## Coverage honesty

Audited to depth: host authority and the RTM message surface (areas 3 and 4), clock sync, the
emoji interaction path, and — added in the Phase 4 pass — the sketch overlay hook and the
join/approval lifecycle.

**Disproved in the Phase 4 pass.** Recorded because they were live hypotheses, and three of them
were mine:

- **The sketch action list is not unbounded.** `SketchContext.tsx:130-142` caps it at
  `MAX_SKETCH_ACTIONS = 200` inside the setter, so every writer inherits the cap. My
  unbounded-growth hypothesis for sketch was wrong — though the same setter is where WP-H2 lands.
- **`useAgora` does not leak RTC listeners.** Every `client.on` at `:380,451-453,520-526` has a
  matching `client.off` in the same cleanup, plus `client.removeAllListeners()` at `:576`, and
  the `devicechange` listener at `:205` is removed at `:207`. No finding.
- **`use-sketch-overlay.ts` is not the weak spot it looked like.** Five defects of exactly the
  class this audit hunts have already been found and fixed there, each with the reasoning left in
  place: the laser-fade effect re-running per pointer-move, a single shared laser timer extending
  every earlier laser's life, mid-drag strokes overwriting remote ones by array position, undo
  reaching into unauthored strokes on mixed-version parties, and the stage not resizing when the
  sidebar collapsed. Its remaining defects (WP-M2, WP-M3) are minor by comparison.
- **Chat needs nothing.** Messages are capped via a `capRef` wrapper at
  `useWatchPartyChat.ts:85-90`, and scroll anchoring is conditional at `WatchPartyChat.tsx:136`
  and `use-watch-party-chat.ts:46-49`.
- **Theatre disposal holds up.** Deliberate disposal at `geometry/materials.ts:202`,
  `geometry/batch.ts:156,171`, `geometry/starfield.ts:148-150`, `avatar-instance.ts:166`,
  `use-video-texture.ts:83`, and the geometry modules construct no raw `new THREE.*` outside
  R3F's own lifecycle.

**Still shallow — absence of findings here is not evidence of absence:**

- **`SketchOverlay.tsx` (764 lines) and `WatchPartySketch.tsx` (463).** The *hook* was read in
  full; the two components were not. Konva node lifecycle and the transformer are unexamined.
- **Room membership races (area 1).** `useWatchPartyMembers.ts` (553) was read along the WP-C1 and
  WP-M4 traces only. The per-member disconnect timers at `:256-295` look like the right shape for
  a join/leave race and were **not** chased down.
- **`useAgora.ts` (794).** Checked for listener balance only. Track publication, device switching
  and token renewal are unexamined.
- **Theatre seat-claim races, Rapier cleanup, network tick rate.** Untouched. The claim-resolution
  rule is documented as "earliest wins, ties break on lower userId, no referee", which is exactly
  the kind of rule that is either provably sound or subtly not, and I have not tested it.
- **`WatchPartySettings.tsx` (534), `WatchPartyVideoArea.tsx` (484), `MediaControls.tsx` (402).**
  Not read.

**Blocked outright:** Postgres was not listening on 5432 this session (`nc -z localhost 5432`
closed), so no backend test has been executed here and no backend claim in this document is
test-verified — the backend statements under WP-C1 come from reading the source only.

---

## Proposed phase order

- **Phase 1 — WP-C1. ✅ DONE** (`e1f2f577`), except the `JOIN_APPROVED` / `JOIN_REJECTED` row,
  which needs a data-flow change and an explicit decision.
- **Phase 4 — discovery on the unread feature. ✅ DONE for `interactions/` and the join
  lifecycle**, producing WP-H2 and WP-M2 through WP-M4. The surfaces listed as still shallow above
  remain unread.
- **Phase 5 — WP-H2**, the highest-value remaining fix: validate inbound RTM payload shape, not
  just sender. Worth doing as one guard at the `rtm-events.ts` boundary rather than per consumer,
  since every accessor there is an unchecked `as` cast and `SKETCH_SYNC_STATE` is only the instance
  that happens to crash. First step is to drive the throw through a real mount and find out what
  the user actually sees.
- **Phase 6 — WP-H1**, emoji cap and send throttle. Independent of everything else.
- **Phase 7 — WP-M2 / WP-M3 / WP-M4**, small and independent of each other.
- **Phase 8 — WP-M1 / WP-L1**, if judged worth the change.
- **Phase 9 — finish discovery**: the two sketch components, membership races, `useAgora` beyond
  listener balance, and the theatre seat-claim rule.
