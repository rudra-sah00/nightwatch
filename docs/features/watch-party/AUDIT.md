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

**WP-H2 is also fixed.** The same receive path validated *who sent* a message and never *whether it
was well-formed*. A malformed `SKETCH_SYNC_STATE` silently replaced every recipient's sketch state
with a non-array — no throw, nothing logged — and the canvas then broke on the next legitimate
stroke, far from the cause.

**What is left is four MEDIUM items and one LOW** (WP-M1 through WP-M4, WP-L1), none of which has
been driven through a mount yet. The larger outstanding risk is not a finding but a gap — see
[§ Coverage honesty](#coverage-honesty).

**A pattern worth noting across three fixed findings.** Every one was wrong in some part until it
was executed: WP-C1's claim that playback was filtered downstream, WP-H2's claim that a bad payload
throws, WP-H1's claim that repeated taps flood. In two of the three the reality was *worse* than
written. Nothing in the remaining list should be trusted until it is run.

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

### WP-H2 — A malformed `SKETCH_SYNC_STATE` corrupts or crashes the shared sketch state on every recipient

**✅ FIXED — `rtm-events.ts` `onSketchSyncState` + `SketchContext` setter.** Two layers: the
boundary drops a payload whose `elements` is not an array, and the setter refuses to store a
non-array whoever calls it. Neither coerces to `[]`, because an empty canvas is a legitimate state
and coercing would silently wipe the receiver's work. Regression test
`tests/features/watch-party/wp-h2-sketch-sync-payload.test.tsx` — 8 of its 10 cases fail against
the unfixed tree.

**🔶 THE ORIGINAL REASONING WAS PARTLY WRONG, and the correction is the useful part.** The finding
below claimed a non-array throws at the cap check. Driving all five shapes through the real
dispatch path in a real mount showed otherwise:

| `elements` | Observed before the fix |
|---|---|
| `undefined` | `TypeError` from inside the state updater — as predicted |
| `null` | `TypeError` — as predicted |
| a string | **stored verbatim, no throw** — a string has a numeric `length`, so `> 200` is simply false |
| a number | **stored verbatim, no throw** — `(42).length` is `undefined`, and `undefined > 200` is false |
| a plain object | **stored verbatim, no throw** — same as above |

So three of the five shapes did not crash: they silently replaced the sketch state with something
that is not an array, tree still mounted, nothing logged. **That is the worse case**, and the audit
missed it by reasoning about the throw instead of running it. The canvas stayed poisoned until the
next legitimate stroke called `prev.findIndex` and threw — far from the message that caused it, and
after the sync that did it had already scrolled out of view. Confirmed by a test that poisons the
state and then dispatches a valid `SKETCH_DRAW`.

This also answers the open question the finding recorded. There was no error boundary to identify,
because in the common case there was no error — which is why nobody had reported it.

---

The finding as originally written, retained for the reasoning:

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

**How I could be wrong — answered.** The question recorded here was which error boundary catches
the throw and what the user sees. Both were the wrong question: in three of five shapes there is no
throw at all. See the correction above.

**Still unverified:** that a real peer on a different build actually emits one of these shapes.
The mechanism is proven; the claim that it happens in the wild without hostile intent remains
reasoning, and would need two clients on different versions to demonstrate.

---

### WP-H1 — The floating-emoji list has no cap

**✅ FIXED — `MAX_ACTIVE_EMOJIS` + payload shape check in `use-floating-emojis.ts`.** Regression
test `tests/features/watch-party/wp-h1-emoji-bounds.test.ts` — 8 of its 12 cases fail against the
unfixed hook.

**🔶 PARTLY WRONG AS WRITTEN.** The claim that "a held-down or scripted send produces unbounded
simultaneous animations" is false for the honest case. The receive path de-duplicates on
`messageId || `${emoji}-${userName}-${bucket500ms}`` and the sender never sets `messageId`, so the
fallback is always active and repeated taps of one emoji by one user collapse to roughly two per
second. Measured:

| Dispatched | Entries before the fix |
|---|---|
| 50× same emoji, same sender, same 500 ms bucket | **1** — dedup works |
| 500× distinct emoji strings | **500** |
| 200× same emoji, distinct senders | **200** |
| a 100,000-character string as `emoji` | **accepted and stored verbatim** |
| any of the above, after 4.5 s | **0** |

So the defect is narrower and sharper than written: the dedup constrains neither axis of its own
key, and the many-senders case is the one a real party reaches without anyone trying. The last row
matters too — entries do expire, so this was a burst ceiling problem rather than the permanent leak
the original wording implied.

**Also found while measuring, and not in the original finding:** `emoji` was rendered straight off
the wire with no `typeof` and no length check. That is now validated.

**Deliberately not done: no send-side throttle.** `use-emoji-reactions.ts:29` has no rate limit, but
adding one changes what a rapid tapper experiences, which is a UX decision rather than a defect fix.
The receive-side cap bounds the damage without changing how the picker feels. Flagged rather than
assumed.

**How I could be wrong.** The cap of 40 is judgement, not measurement — I have not profiled the
frame cost of 40 concurrent animations versus 200, which needs a real browser and is **not
verifiable in happy-dom**. If 40 turns out to be visibly restrictive in a large party, it is one
constant.

---

## MEDIUM

### WP-M2 — `SKETCH_SYNC_STATE` carries a `targetId` that no receiver ever reads

**✅ FIXED.** `rtm-events.ts` forwards the field (normalising a non-string or empty value to
`undefined`); the overlay hook compares it against its own id. Accepted when absent or when this
client has no id yet. 3 of 5 new cases fail against the old behaviour. An earlier draft asserted
the guard by re-implementing its predicate inline, which passes whatever the source does, and was
replaced with a real mount of `SketchOverlay`. The existing `watch-party.api.test.ts` assertion
pinned `{ elements: [] }` exactly — the field being dropped, i.e. the defect as contract — and was
corrected in place.

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

**✅ FIXED.** The `canDraw` guard moved above the broadcast, since nothing further down
`handleMouseMove` means anything without it. Measured five wasted broadcasts across five pointer
moves before the fix, zero after. `isDrawing` is deliberately not part of the guard — hovering must
still broadcast for someone who can draw — and there is a test pinning that so the two conditions
cannot later be folded together.

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

**✅ FIXED.** `socketCleaned` is re-checked after each await. Confirmed by parking the first request
on a suspended promise, unmounting, then resolving it approved — the only interleaving that
reproduces it. A positive control asserts a poll completing while mounted still announces approval.
The audit's reasoning held here: React 19 makes the setState calls no-ops and the toast was indeed
the visible symptom.

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

**🔶 QUANTIFIED, NOT FIXED — needs a decision.** Driven through `useClockSync` with host and guest
clocks set exactly equal and one-way latencies of 40/90/60/150/70 ms, the computed `clockOffset` came
out at **−70 ms, exactly the median latency**. The mechanism is confirmed precisely:

```
offset = trueOffset − medianOneWayLatency
```

A guest therefore runs behind the host by its own median one-way latency. The median filter removes
jitter, as its docstring says, but every sample carries the same sign of error, so it cannot remove
the bias — it only picks the middle one.

**Why it is mild.** `usePredictiveSync`'s soft-correction threshold is 500 ms, so a 70 ms bias is
absorbed silently rather than causing churn, and even a 300 ms one-way link stays inside it. Every
guest is behind by *its own* latency, so what a user might actually notice is guests differing from
each other by their latency *differences*, not the absolute lag.

**Two ways to fix it, neither free:**

1. **Take the maximum sample instead of the median.** Since `offset_i = trueOffset − latency_i`, the
   largest offset is the sample that travelled fastest — NTP's min-delay filter. No protocol change,
   costs nothing, but trades the median's robustness: one spuriously large offset (a host clock step,
   a `Date.now()` jump) would be latched and held. Reduces the bias from median latency to minimum
   latency — in the measured case, 70 ms to 40 ms.
2. **Measure round-trip properly** with a ping/pong exchange over RTM and halve it. Correct, and what
   real clock sync does. It is a new message pair and a protocol change.

**Deliberately not done.** Option 1 buys ~30 ms in the measured case for a real loss of outlier
robustness in a sync-critical path, and that trade cannot be justified without knowing actual RTM
latency — which needs live Agora and a second participant. Option 2 is a protocol change. Both want
a decision rather than an assumption.

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

**✅ FIXED.** Registered in `timeoutsRef` alongside `spawnEmoji`'s removal timer, so the unmount
effect clears it too. Five arrivals left five timers alive past unmount before the fix, zero after.
Asserted on the pending-timer count, which is the only observable difference, with a second test
confirming dedup keys still expire while mounted.

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
- **Phase 5 — WP-H2. ✅ DONE.** Fixed at the `rtm-events.ts` boundary plus the `SketchContext`
  invariant. **Deliberately scoped to `elements`:** every other accessor in `rtm-events.ts` is
  still an unchecked `as` cast. `SKETCH_SYNC_STATE` was the one that could poison state, because it
  is the only sketch message that replaces the action list rather than appending to or filtering it
  — the others leave `actions` a valid array even when the individual action is junk. A malformed
  *action* can still reach Konva and is not covered here; that is a separate finding nobody has
  written yet.
- **Phase 6 — WP-H1. ✅ DONE.** Cap plus payload shape check. No send-side throttle — that is a UX
  decision, flagged in the finding rather than assumed.
- **Phase 7 — WP-M2 / WP-M3 / WP-M4. ✅ DONE**, one commit each.
- **Phase 8 — WP-L1 ✅ DONE. WP-M1 quantified and left open** pending a decision between a
  robustness trade and a protocol change — see the finding.
- **Phase 9 — finish discovery**: the two sketch components, membership races, `useAgora` beyond
  listener balance, and the theatre seat-claim rule. Given that Phase 5's central claim was wrong
  until it was executed, the remaining findings should be treated as unproven until each is driven
  through a mount the same way.
