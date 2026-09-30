# Seeking — root cause analysis and improvement plan

Why playback throws a decode error after a seek but plays cleanly when left alone, what the
mature players do differently, and the ordered list of things to fix.

**Status:** analysis only. No code has been changed.
**Scope:** the seek path across `src/features/watch/player/` plus the watch-party sync that
drives it. See [§9 Coverage](#9-coverage-what-is-and-is-not-analysed) for what remains
unexamined — this is **not** a full audit of the player.

**Re-verified 2026-09-30 (Phase 0).** Every defect below was re-opened at its cited line and
re-traced against the current tree. Each carries a status:

| Status | Meaning |
|---|---|
| ✅ CONFIRMED | Evidence matches the tree and the consequence follows |
| ❌ WRONG | The reasoning does not hold — corrected or deleted in place |
| 🔶 STALE | Code moved; the corrected location is given |
| ❓ UNPROVABLE | Code confirmed, but the runtime consequence needs a repro not available locally |

**Result: 12 of 12 defects survived.** D4's file path was stale and its trigger condition was
understated; one row of D6's table was wrong. Nothing was deleted. Details in
[§10 Verification log](#10-verification-log).

---

## 1. Summary

The decode error is not one bug. It is a fragile content property that our own code amplifies
into a near-guaranteed failure.

The content is genuinely hostile, and `useHls.ts` already diagnoses this correctly: segments are
open-GOP and do not begin on an IDR frame, and the H.264 parameter sets (SPS/PPS) are carried
in-band rather than in the fMP4 `avcC` box. Chrome promotes a non-IDR frame to a keyframe for
MSE random access, so a seek can hand the decoder a non-keyframe with no parameter sets.

What turns that fragility into "every time I seek" is ours. Six independent multipliers, in
rough order of impact:

1. **One arrow press issues two seeks.** `PlayerRoot.tsx` has its own arrow handler and
   `useKeyboard` has a window-level one; both fire. The auto-repeat guard shipped in `312a84df`
   only covers one of them — which is why that fix did not close the issue.
2. **Resuming a partly-watched episode seeks immediately on load**, which on affected content is
   the *first* seek and therefore the one deliberately designed to fail (see D5). This is the
   most common way users start playback.
3. **Dragging the scrub bar issues a seek per `mousemove`** — 60–120+ per second, unthrottled.
4. **Watch-party drift correction hard-seeks every 2 s**, and the re-prime that follows stalls
   playback, which increases drift, which triggers another hard seek. A positive feedback loop.
5. **Relative skips are computed from React state**, which lags the real playhead by up to
   250 ms, so rapid presses compute off a stale base and lose distance.
6. **Nothing serialises seeks.** Each aborts the fragments in flight; a burst exhausts
   `fragLoadingMaxRetry` and escalates to fatal.

And the error the user sees is probably reported by the *wrong owner*: `use-video-element.ts:111`
starts a 1200 ms timer on any `MEDIA_ERR_DECODE` and dispatches "Video playback error", while
`useHls.ts` concurrently runs a recovery that needs a network round-trip and so usually takes
longer than 1200 ms. The recovery may succeed — after the error UI has already appeared.

The highest-value change is not more recovery logic. It is to stop emitting seek storms: one seek
controller, one seek in flight, commit on release.

---

## 2. What the error actually is

Three distinct user-visible strings from two different owners:

| String | Owner | Trigger |
|---|---|---|
| `Playback error occurred` | `useHls.ts` `default:` branch | fatal hls.js error, neither network nor media |
| `Playback failed — the media could not be decoded.` | `useHls.ts` MEDIA_ERROR branch | recovery budget exhausted |
| `Video playback error` | `use-video-element.ts:113` | any `MEDIA_ERR_DECODE`, 1200 ms later |

The underlying Chrome-side failure:

```
Failed to send video packet for decoding:
  {timestamp=… duration=40000 size=26271 is_key_frame=0 encrypted=0}
```

`is_key_frame=0` is the whole story — a non-keyframe offered as a random-access point, with no
parameter sets to configure the decoder from.

---

## 3. Root cause, layer by layer

### Layer 1 — the content (we can only cope)

- 10 s segments, 2 s GOPs — ~5 IDRs per segment, but the segment does not *start* on one.
- Chrome logs `Promoting non-IDR frame with SEI recovery point to keyframe for MSE random access`.
- `has extra data: false` — SPS/PPS in-band, not in `avcC`.

This violates the Apple HLS Authoring Specification, which requires each segment to begin with an
IDR. No client-side trick makes open-GOP content *correctly* seekable; it can only be made to work
by forcing a fresh init segment at the seek target.

Worth knowing: there is a **Chromium bug with the same signature** —
[issue 492063439](https://issues.chromium.org/issues/492063439), "Playback fails to start
correctly after seeking in specific AVC videos due to incorrect keyframe detection":

> During seeking, the first "bare" IDR frame was incorrectly promoted to keyframe. In this
> stream, SPS/PPS were provided only every second IDR frame, so decoder had a ~50% chance of
> startup failure depending on which IDR was selected.

A ~50% per-seek failure rate driven by which frame got promoted matches our field behaviour
closely. **Action: establish which Chrome versions are affected and whether a fix has shipped,
before investing further in client-side workarounds.** If this is largely a browser bug, the
cost/benefit of the whole re-prime mechanism changes.

### Layer 2 — our code

Layer 1 makes a seek risky. Layer 2 makes one user gesture fire several risky seeks, and in one
case makes them fire forever.

---

## 4. Defect inventory

Ranked by contribution to the reported symptom. All line numbers verified against the current tree.

### D1 — One arrow press fires two seeks, only one repeat-guarded ⚠️ critical

**✅ FIXED — `a4a8fba6`.** The arrow and `j`/`l` cases are gone from `PlayerRoot`'s
`onKeyDown`, leaving `useKeyboard` as the single owner exactly as Space already was.
Regression test: `tests/features/watch/player/seek-keys-single-owner.test.tsx`, which
counts `currentTime` writes per gesture.

**Measured before the fix** (this is also the Phase 0.5 §7 gate result): one `ArrowLeft`
press wrote `currentTime` **twice** — `[60, 50]`. The two handlers did not race, they
**compounded**: `PlayerRoot` wrote 60 (absolute, from React state pinned at 70), and
`useKeyboard` then applied its −10 to the 60 that had just been written, landing at 50.
A single 10 s press travelled 20 s. The original text said "final position whichever
landed last", which was wrong — they stack.

A held key was worse: **14 writes for 13 ticks.** `useKeyboard`'s guard correctly
suppressed 12 of its own repeats, contributing 1; `PlayerRoot`'s unguarded copy fired
all 13.

Verified previously: both handlers exist, neither stops propagation, and `312a84df`
touched only `useKeyboard.ts` (+ its test). The two switch on *different* properties —
`PlayerRoot` on `e.key`, `useKeyboard` on `e.code` — and the window handler's only target
filter is `HTMLInputElement`/`HTMLTextAreaElement`, which a focused `tabIndex={0}` div
passes.

`useKeyboard` binds `keydown` at **window** level (`useKeyboard.ts:447`). `PlayerRoot` renders a
`tabIndex={0}` container with its own `onKeyDown` (`PlayerRoot.tsx:289-290`). When the container
has focus — normal after clicking the video — both run for one keypress:

```
PlayerRoot.tsx:312   seek(state.currentTime - 10)   // absolute, from stale React state
useKeyboard.ts:384   h.seek(-10)                    // relative, from live video.currentTime
```

(The arrow `case` lines are 312 and 317; the doc's original 315/321 were off by three.)

Two `currentTime` assignments, two `seeking` events, two re-primes, final position whichever
landed last. `PlayerRoot`'s handler has **no `e.repeat` check and no settle window**, so holding
the key bypasses the `312a84df` guard entirely.

`PlayerRoot.tsx:302-308` already documents this exact hazard — for Space only:

> Handled by the window-level listener in `useKeyboard` … Toggling here as well would fire twice
> (cancelling out)

The same reasoning was never applied to the arrows.

### D2 — Resume-on-load is an unguarded seek at the worst possible moment ⚠️ critical

**✅ CONFIRMED** — line numbers exact. `handleProgressLoaded` is wired as `onProgressLoaded` into
`useWatchProgress` (`use-player-root.ts:308`) and called from the `watch:get_progress` socket
callback, so it fires after the engine has already begun loading at 0.

```ts
// use-player-root.ts:298-300
const handleProgressLoaded = useCallback((seconds: number) => {
  if (Number.isFinite(seconds) && seconds > 0 && videoRef.current) {
    videoRef.current.currentTime = seconds;   // fires right after load
  }
}, []);
```

Every continue-watching resume assigns `currentTime` immediately after load. On affected content
this is the **first seek of the session**, which by D5's design is the one guaranteed to fail:
fatal decode error → full stream refetch → engine remount → position restore.

Resuming a partly-watched episode is the single most common entry point into the player, so the
most common path is also the one wired to fail once, every time.

### D3 — Scrubbing fires a seek per mousemove ⚠️ critical

**✅ FIXED — `0f95a6d6`.** Movement now updates a fraction used only for rendering, and
exactly one seek is issued on `pointerup`. The gesture lives in a new shared
`useDragSeek` primitive (`ui/controls/hooks/use-drag-seek.ts`) that both scrub bars
consume, so there is one implementation rather than two. Pointer Events replace the
mouse/touch pairs, `setPointerCapture` keeps the drag alive once the pointer leaves the
bar, and the trailing `onClick` seek is gone — a tap is `pointerdown` + `pointerup` at one
place, which the release commit already covers. Regression test:
`tests/features/watch/controls/seek-bar-drag.test.tsx` (6 of 11 fail against the old code).

Verified during Phase 0: `handleDrag` was at `use-seek-bar.ts:131-135` (doc said 132) and
the `SeekBar` bindings at `:150-153`.

```ts
// use-seek-bar.ts:132
const handleDrag = useCallback((e) => {
  if (disabled || e.buttons !== 1) return;
  handleClick(e);            // → onSeek(time) → video.currentTime = time
}, [handleClick, disabled]);
```

```tsx
// SeekBar.tsx:151
onMouseMove={(e) => { handleMouseMove(e); if (!disabled) handleDrag(e); }}
```

Every `mousemove` with the button held commits a real seek — 60–120+ per second of drag. No
throttle, no debounce, no commit-on-release, no seek-in-flight check. Same class as the keyboard
storm, on a control that generates an order of magnitude more events.

Same file, same area:
- `onClick` is also bound (`SeekBar.tsx:150`), so a drag ends with an extra redundant seek.
- Mouse events only — no Pointer Events, no `setPointerCapture`. The drag dies if the cursor
  leaves the bar, and `mouseleave` kills the preview mid-gesture.

### D4 — Watch-party drift correction feeds a re-prime loop ⚠️ high

**✅ CONFIRMED (code)** 🔶 **/ ❓ UNPROVABLE (that the loop is entered)** — the file is
`src/features/watch-party/room/hooks/usePredictiveSync.ts`, not `src/features/watch-party/`.
Lines 372-420 are exact. Verified absent from the whole file: any `isSeeking`, `readyState`,
`paused`, buffering, cooldown or consecutive-failure check gating the drift branch. The only
guard is `if (!state.isPlaying || !isCalibrated || isLive) return` — a **stalled** video is not
detected, which is precisely the state the re-prime creates.

**Correction to the original text:** the loop requires `needsSeekReprimeRef` to already be `true`
(see D5), i.e. this session has already taken one decode error. On unaffected content the hard
seek is ordinary and no loop exists. The original wording implied it was unconditional.

Confirming the loop is actually *entered* needs a two-guest watch party on affected content;
`tests/features/watch-party/hooks/usePredictiveSync.test.ts` covers the play/pause enforcement
loop but has **no** coverage of the drift-correction branches at all.

`usePredictiveSync.ts:372-420` runs every 2 s for non-hosts. The design is sound in isolation —
`playbackRate` nudging for drift under 2 s, hard seek only beyond it:

```ts
if (Math.abs(drift) > 2.0) {
  const safe = clampToSeekable(video, expected);
  if (safe !== null) video.currentTime = safe;   // hard seek
}
```

The problem is the interaction with the re-prime. On affected content a hard seek triggers
`stopLoad()` + `startLoad(t)`, which **discards the buffer and refetches** — a stall of its own.
The stall increases drift. Two seconds later drift is still over threshold, so it hard-seeks
again. Each iteration is another fragment abort storm, and the loop has no convergence condition.

A guest who once drifts past 2 s on affected content can be stuck in seek → re-prime → stall →
drift → seek indefinitely. This is invisible in the single-viewer case, which is probably why it
has not been isolated before.

### D5 — The re-prime learns by failing, so every session eats one guaranteed error ⚠️ high

**✅ CONFIRMED** — `needsSeekReprimeRef` has exactly three references in `useHls.ts`: declared
`useRef(false)` at `:157`, read as an early-return at `:422-423`, and written `true` at `:805`
inside the `isUnrecoverableDecode` branch of the fatal `MEDIA_ERROR` handler. There is no other
writer and no persistence, so the first seek on affected content must fail before the mechanism
that would have prevented the failure switches on.

```ts
// useHls.ts — needsSeekReprimeRef
// Off until proven necessary. … So the first seek runs native; if it produces the
// unrecoverable decode signature, the reload path recovers position and every later
// seek in this playback re-primes.
```

`needsSeekReprimeRef` starts `false` and is deliberately not persisted. On affected content the
first seek of every playback is *designed* to fail. The stated reasoning — a stored flag would
outlive an upstream re-encode — is sound, but the conclusion does not follow: the cost is not "a
single ~1 s recovery" but a fatal error, a stream refetch, an engine remount and a visible error
toast, once per playback. Combined with D2, that first seek usually happens before the user has
touched anything.

Cheaper options: cache per content id with a TTL, or detect alignment up front from the init
segment instead of from a failure.

### D6 — Relative skips computed from stale React state ⚠️ high

**✅ CONFIRMED for three of the four sites. ❌ The `LiveSeekBar` row was WRONG** and has been
corrected below.

`SET_TIME` is dispatched from `timeupdate` (`use-video-element.ts:66,124`), which fires roughly
every 250 ms. These callers all derive a new absolute target from that lagging value:

| Site | Code | Status |
|---|---|---|
| `PlayerRoot.tsx:312,317` | `seek(state.currentTime ± 10)` | ✅ stale by ~250 ms |
| `PlayerMobileSeekBar.tsx:97,99` | `playerHandlers.seek(… state.currentTime ± 10)` | ✅ stale by ~250 ms |
| `SeekBar.tsx:168,171` | `onSeek(… currentTime ± 10)` | ✅ stale by ~250 ms (prop from state) |
| `LiveSeekBar.tsx:343,346` | `playerHandlers.seek(… currentTime ± step)` | ❌ **not stale** |

`LiveSeekBar` does **not** read React reducer state. `LiveSeekBar.tsx:86` does
`setLocalCurrentTime(video.currentTime)` inside a `requestAnimationFrame` loop, and `:96` aliases
`const currentTime = localCurrentTime`. Its base is therefore at most one frame (~16 ms) behind the
element, not 250 ms. It still computes an absolute target from a read value, so it is in scope for
D7's ownership problem, but it does not exhibit the "three taps travel 10 s" defect. Remove it from
the P0 blast radius.

Three taps inside one 250 ms window all read the same base and all target `+10`, so the user
travels 10 s instead of 30 s while paying for three seeks. Skips do not accumulate, which is
indistinguishable from a broken player.

`useKeyboard`'s own `seek` (`useKeyboard.ts:114-147`) is the **only fully correct
implementation**: relative, live `video.currentTime`, clamped against live `duration`/`seekable`.
The mobile double-tap path (`PlayerVideo.tsx:97-105`) is also correct — it routes through
`playerHandlers.skip`, the relative path, and requires two taps within 280 ms so it emits one
seek per gesture.

### D7 — Eight places assign `video.currentTime`, with two incompatible semantics ⚠️ high

**✅ CONFIRMED** — all eight sites verified at the exact cited lines (ten assignment statements
across seven files). An exhaustive grep of `src/` for `currentTime =` found **three further sites
outside this document's scope**, all replicating the same pattern on the TV platform:
`TvPlayer.tsx:229,233,307,310`, `TvWatchTogether.tsx:85,95`, `use-tv-remote-receiver.ts:87`. They
are not part of P0 but a `useSeekController` should eventually own them too.

| Site | Semantics | Purpose |
|---|---|---|
| `useKeyboard.ts:132,142` | relative, live | keyboard — correct |
| `usePlayerHandlers.ts:173` | absolute | `handleSeek`, exposed as `playerHandlers.seek` |
| `use-player-root.ts:300` | absolute | resume-on-load (D2) |
| `use-player-live-badge.ts:42` | absolute | jump to live edge |
| `useHls.ts:461` | absolute | restore after self-triggered reload |
| `useHls.ts:1126` | absolute | restore after quality switch |
| `useMp4.ts:157` | absolute | restore after quality switch |
| `usePredictiveSync.ts:195,402` | absolute | party sync + drift correction (D4) |

`playerHandlers.seek` is absolute; `playerHandlers.skip`/`handleSkip` is relative
(`usePlayerHandlers.ts:185`); `useKeyboard.seek` is relative. Call sites mix them freely.

Nothing owns "move the playhead", so every new control reinvents it and inherits whichever bug
its author did not know about. Any fix applied at a call site fixes one control and leaves seven.
D1, D2, D3 and D6 are all symptoms of this.

### D8 — No seek-in-flight serialisation ⚠️ medium-high

**✅ CONFIRMED** — an absence finding, verified by grep. `seeked` appears only in `useHls.ts`
(`:232,447,451,1053,1054`), all of it serving the re-prime recovery rather than gating user seeks.
`seekController`, `seekLock`, `seekQueue`, `seekPending`, `waitForSeek` and `awaitSeek` have zero
matches anywhere in `src/`.

Nothing waits for `seeked` before issuing the next seek. This contradicts both HTML5 semantics
and every platform's guidance. Apple's QA1820 is explicit:

> Avoid making calls to AVPlayer `seekToTime:` in rapid succession. This will cancel the seeks in
> progress, resulting in a lot of seeking and not a lot of displaying of the target frames.
> Instead … wait for a seek in progress to complete first before issuing another.

The same holds for MSE: intermediate `seeked` events are coalesced, so the work done for every
seek but the last is wasted — while still aborting fragments and re-priming.

### D9 — Two independent error owners race ⚠️ medium-high

**✅ CONFIRMED** 🔶 — the handler is `use-video-element.ts:106-115`; the decode-code check is at
`:108` and the 1200 ms timer at `:114` (doc said 108-114). `clearPendingError()` genuinely runs on
both `playing` and `canplay`, so a *fast* recovery does cancel the toast. But `hls.recoverMediaError()`
rebuilds the MediaSource and needs at least one fragment fetch, and the `onStreamExpired()` path
makes a full backend round-trip — both routinely exceed 1200 ms. The race is real in the direction
the doc claims.

`use-video-element.ts:108-114` starts a 1200 ms timer on any `MEDIA_ERR_DECODE` and dispatches
`SET_ERROR: 'Video playback error'`. `useHls.ts` independently handles the same failure with a
recovery that involves a network round-trip and routinely exceeds 1200 ms.

`clearPendingError()` runs on `playing`/`canplay`, so a fast recovery cancels the toast — but a
reload-based recovery cannot finish that fast. So the user likely sees an error for a failure the
player then silently recovers from. There should be exactly one component deciding that playback
has failed.

### D10 — `stopLoad()` + `startLoad(t)` inside the `seeking` handler ⚠️ medium

**✅ CONFIRMED** — `stopLoad()` + `startLoad(target, true)` are at `useHls.ts:440-443`, inside the
`onSeeking` handler registered at `:452`. Grep confirms `BUFFER_FLUSHING` has **zero** occurrences
in `src/`, and the event *is* available in the installed hls.js, so P1 #6 is implementable as
written with no dependency change.

- It runs **synchronously inside `seeking`**, which is also when hls.js's `StreamController`
  reacts. We mutate loader state underneath it. hls.js
  [#5349](https://github.com/video-dev/hls.js/issues/5349) ("Scrubbing current position causes
  fragments to stuck between loading and buffered state") is the documented failure mode for
  fighting the loader during seeks.
- It **does not flush the buffer**. `stopLoad()` stops loading; it does not remove buffered
  ranges. Ranges appended with a promoted non-IDR keyframe stay in the SourceBuffer and can still
  reach the decoder. Shaka and dash.js both explicitly clear the buffer on a seek outside the
  buffered range; hls.js exposes `BUFFER_FLUSHING` for this and we never use it.

### D11 — `maxBufferHole: 0.5` is 5× the hls.js default ⚠️ low, but a symptom marker

**✅ CONFIRMED** — `useHls.ts:288` (live) and `:332` (VOD). The VOD site carries a comment stating
the hls.js default is 0.1, so 5× is exact.

Raised on both paths to paper over sub-frame holes at fragment joins. It helps, but 500 ms is
long enough to skip real content and let audio and video drift. With correct init-segment
handling the holes should not need this much tolerance.

### D12 — Scrub bar is desktop-mouse-only, and duplicated for mobile

**✅ FIXED (the duplication) — `0f95a6d6`. Presentation deliberately left alone.**

The duplicated *gesture* is gone: both bars now share `useDragSeek`, which handles mouse,
touch and pen through Pointer Events with capture. `SeekBar` is no longer mouse-only.

Their *visuals* are intentionally not merged, and the original finding was slightly wrong
to imply they should be. The two never render together — `WatchVODPlayer` gates them
`hidden pointer-ui:contents` and `hidden touch-ui:block` — and they are different
affordances on purpose: `SeekBar` is the neo-brutalist control-bar scrubber with sprite
previews, `PlayerMobileSeekBar` the thin YouTube-style bar pinned to the bottom of the
player, non-interactive in portrait. Collapsing them into one component would be a UI
redesign, not a defect fix.

Verified during Phase 0: `SeekBar.tsx` and `use-seek-bar.ts` contained zero
`touch`/`pointer` handlers, and `use-seek-bar.ts` typed every parameter as
`React.MouseEvent<HTMLDivElement>`.

---

## 5. How the mature players do it

| Concern | Shaka Player | hls.js (intended use) | dash.js | Us today |
|---|---|---|---|---|
| Seek during scrub | UI commits on release; preview visual only | — (UI's job) | commits on release | **seek per mousemove** (D3) |
| Seeks in flight | one, queued | one | one | **unbounded** (D8) |
| Relative skip base | live `currentTime` | live | live | **React state, 250 ms stale** (D6) |
| Buffer on out-of-range seek | explicitly cleared, `appendWindow` trimmed | flushed internally | `replace` + clear | **not flushed** (D10) |
| Init segment on discontinuous append | **always re-appended** (`InitSegmentReference`) | re-appended on level/discontinuity change | re-appended | only via `stopLoad`/`startLoad` (D10) |
| Gap handling | `smallGapLimit` + gap-jump controller | `maxBufferHole` + nudge | gap controller | `maxBufferHole` 5× default (D11) |
| Seek ownership | one `StreamingEngine` | one `StreamController` | one `PlaybackController` | **8 sites, 2 semantics** (D7) |
| Error ownership | one `Player` error path | one `ERROR` event | one | **2 racing owners** (D9) |

Two structural lessons:

**Shaka re-appends the init segment on every discontinuous append**, tracked via
`InitSegmentReference`, rather than assuming the SourceBuffer still holds a valid configuration.
That is exactly the guarantee our content needs, and there it is a normal operation rather than
an emergency re-prime. Our `stopLoad`/`startLoad` reaches for the same outcome far more bluntly.

**All of them funnel seeking through a single controller.** Our eight sites with two semantics is
the root architectural problem.

Also standard everywhere and absent here: clearing the buffer when seeking outside the buffered
range — "most adaptive streaming players clear the entire buffer whenever you seek to a time
that's not buffered", including YouTube.

---

## 6. Improvement plan

### P0 — stop the storms (fixes the symptom, low risk)

1. ~~**Delete the arrow/`j`/`l` cases from `PlayerRoot.tsx`'s `onKeyDown`**~~ — **DONE,
   `a4a8fba6`.** `useKeyboard` now owns them, exactly as Space already did.
2. ~~**Make scrubbing commit on release.**~~ — **DONE, `0f95a6d6`.** Preview during drag,
   seek on `pointerup`, Pointer Events with `setPointerCapture`, trailing `onClick` dropped.
   Shared by both scrub bars via the new `useDragSeek` primitive.
3. **Introduce one `useSeekController`** owning relative and absolute seek, clamping against live
   `duration`/`seekable`, one seek in flight with chase-the-latest-target coalescing, and a single
   `seeking`/`seeked` lifecycle. Every control calls it. `useKeyboard`'s implementation is the
   right starting point. Retire the other seven sites.
4. **Resolve the error-owner race (D9).** `useHls` owns playback failure; `use-video-element`
   reports the element-level decode error to it instead of dispatching `SET_ERROR` on a timer.

### P1 — make seeking correct rather than survivable

5. **Fix resume-on-load (D2).** Prefer starting the load at the resume position — hls.js accepts
   a start position — over loading at 0 and then seeking. That removes the first-seek failure for
   the most common entry point.
6. **Flush the buffer on a discontinuous seek** via `BUFFER_FLUSHING` before re-priming, so stale
   promoted-keyframe ranges cannot reach the decoder.
7. **Move the re-prime off the `seeking` event**, so we are not mutating loader state while
   `StreamController` reacts to the same event.
8. **Stop learning by failing (D5).** Detect non-IDR alignment up front from the init segment, or
   cache the per-content flag with a TTL.
9. **Break the watch-party loop (D4).** Suppress drift hard-seeks while a re-prime is in flight,
   and widen the threshold or back off exponentially when consecutive corrections fail to
   converge.
10. **Verify the Chromium bug (§3).** Could retire much of the above.

### P2 — structural

11. ~~Unify `SeekBar` and `PlayerMobileSeekBar` onto one pointer-driven component.~~ —
    **Gesture unified in `0f95a6d6`** via the shared `useDragSeek` primitive. Their
    presentation is deliberately left separate; see D12 for why merging it would be a
    redesign rather than a fix.
12. Revisit `maxBufferHole` once init-segment handling is correct.
13. Ask whether the backend can re-segment on IDR boundaries for affected titles — the only real
    fix for Layer 1.

---

## 7. How we will know it worked

`video_error` already carries `mediaErrorCode`, `currentTime`, `buffered` and `currentLevel`
(`useHls.ts` `reportPlaybackError`). Add:

- **`seeksInLastSecond` at failure time** — should be 1 after P0. This is the direct test of the
  storm hypothesis.
- `secondsSincePlaybackStart`, and whether the failure followed a seek, to separate seek-induced
  decode errors from the backgrounded-tab decoder rebuild already documented in `useHls`.
- `reload-decoder` recoveries per playback — should approach 0 once D5 is addressed.
- Whether the session was a watch-party guest, to confirm or rule out D4.

**Instrument before fixing.** If seeks per gesture are already 1, the storm hypothesis is wrong
and the Chromium bug becomes the primary suspect.

### Gate result — settled 2026-09-30, by test rather than by field telemetry

`tests/features/watch/player/seek-keys-single-owner.test.tsx` mounts the real `PlayerRoot`
beside the real window-level `useKeyboard` and counts `currentTime` writes per gesture.
Against the unfixed tree:

| Gesture | Writes |
|---|---|
| one `ArrowLeft` press | **2** — `[60, 50]` |
| `ArrowLeft` held, 13 ticks | **14** |

**Seeks per gesture was 2, not 1, so the storm hypothesis holds and P0–P2 stand as
written.** A local test is stronger evidence than the proposed telemetry here: it is
deterministic and it isolates the gesture, where `seeksInLastSecond` would have mixed in
drift correction and re-prime seeks.

The field telemetry in the list above is still worth adding — it is the only way to
measure the *scrub* path and the watch-party guest case (D4) against real content — but it
is no longer the gate.

---

## 8. Open questions

**Partially answered 2026-09-30.**

- **Which Chrome versions carry issue 492063439, and is it fixed?** ⚠️ **Partially
  answered.** The issue's own description is a direct match for our content, and names the
  mechanism precisely:

  > In MP4 AVC MSE playback, IDR frames can be misclassified as keyframes for tracks that
  > use **in-band parameter sets (avc3)**. Currently, the analyzer considers any IDR slice
  > as a keyframe (`AVC::AnalyzeAnnexB`) even when neither the access unit nor the initial
  > avc config provides SPS/PPS. Starting decode at such AUs may fail, and the resulting
  > behaviour depends on the decoder.

  `avc3` is exactly our `has extra data: false` — SPS/PPS in-band rather than in `avcC` —
  and the surface is MSE, which is our path. The related issue
  [424836493](https://issues.chromium.org/issues/424836493) notes that "CL 7257198 and CL
  7735146 cover the case where there's an explicit SEI recovery point NAL preceding the
  slice", which is the promotion our Chrome logs name verbatim.

  **Status and fix milestone could not be read** — `issues.chromium.org` requires sign-in
  and `web_fetch` gets the login page. Someone with an account should check whether a fix
  has shipped and in which milestone.

  **What this changes:** both layers are real. It does *not* retire the P0 work, because
  D1/D3/D6 are our bugs on any browser — and D1 was measured at two seeks per keypress
  independently of any decoder behaviour. It does argue for keeping the re-prime rather
  than removing it, since forcing a fresh init segment at the seek target is precisely
  what supplies the missing parameter sets, and it raises the priority of P1 #8 (stop
  learning by failing).

- Does the failure reproduce in Firefox, and on Safari/native HLS? **Not attempted** — needs
  a sample of affected content, which is not available locally.
- Does it reproduce on a known-good IDR-aligned stream with the same UI? **Not attempted**,
  same reason. Still the single most informative experiment available, and now cheaper to
  interpret: with D1 fixed, a re-test separates residual Layer 1 from the remaining
  Layer 2 defects.
- Does the MP4 engine show the same symptom? It is a different mechanism entirely —
  progressive MP4 seeking depends on HTTP Range support through the CF Worker and backend
  proxy, not on MSE append behaviour. Untested.

---

## 9. Coverage

This document covers the **seek path** only. Twelve of the 73 files in
`src/features/watch/player/` were read closely for it, plus `usePredictiveSync.ts` from
`src/features/watch-party/`.

The remaining files have since been audited separately — see
**[PLAYER_AUDIT.md](./PLAYER_AUDIT.md)**, which covers the engines (`useDash`, `useMp4`,
Chromecast), progress and episode lifecycle, the control surfaces, subtitles and audio tracks,
state/overlays, and the gesture and fullscreen hooks. Between the two documents the player is
fully covered.

Two findings there bear directly on this analysis and should be read alongside it:

- **C1** — `SET_ERROR` does not clear `isBuffering`, and the ErrorOverlay is gated on
  `!isBuffering`. So the decode errors described here can produce an infinite spinner with no
  message rather than the error UI, which changes what users actually report. *(Re-verified
  CONFIRMED, and it affects `WatchLivePlayer` identically.)*
- **H8** — `PlayerMobileSeekBar` seeks on every `touchmove`, the mobile twin of D3. Fix both
  together as one pointer-driven seek bar. *(Re-verified CONFIRMED.)*

---

## 10. Verification log

Phase 0 re-verification, 2026-09-30. Every defect was re-opened at its cited line, the quoted
evidence compared against the tree, and the runtime consequence re-traced adversarially — that is,
looking for anything upstream or downstream that already prevents the described failure.

| Defect | Status | Change made to this document |
|---|---|---|
| D1 | ✅ CONFIRMED | Arrow `case` lines corrected 315/321 → 312/317; added the `e.key` vs `e.code` and target-filter findings |
| D2 | ✅ CONFIRMED | Added the call path proving it fires after load begins |
| D3 | ✅ CONFIRMED 🔶 | `use-seek-bar.ts:132` → `:131-135`; `SeekBar.tsx:150,151` → `:150-153` |
| D4 | ✅ CONFIRMED (code) ❓ (loop entry) | Path corrected to `watch-party/room/hooks/`; **trigger condition corrected** — requires `needsSeekReprimeRef` already true |
| D5 | ✅ CONFIRMED | Added the three-reference proof (`:157`, `:422-423`, `:805`) |
| D6 | ✅ CONFIRMED (3 of 4) | **`LiveSeekBar` row deleted as WRONG** — its base is rAF-polled from the element, ~16 ms not 250 ms |
| D7 | ✅ CONFIRMED | Count of 8 verified exactly; recorded 3 further out-of-scope TV sites |
| D8 | ✅ CONFIRMED | Added the grep evidence for the absence |
| D9 | ✅ CONFIRMED 🔶 | `:108-114` → `:106-115`; confirmed `clearPendingError` does fire, and why it still loses |
| D10 | ✅ CONFIRMED | Located at `:440-443` inside the handler bound at `:452`; confirmed `BUFFER_FLUSHING` is available and unused |
| D11 | ✅ CONFIRMED | Located at `:288` and `:332` |
| D12 | ✅ CONFIRMED | Added the grep evidence |

**Nothing was deleted.** The two substantive corrections are D6's `LiveSeekBar` row and D4's
trigger condition. Neither changes the P0 plan: D6 loses one of four call sites, and D4 was
already P1.

The `video_error` instrumentation in §7 remains the gate on all of it. D1, D3 and D6 are
confirmed as *code*; that seek storms are what produces the field decode errors is still a
hypothesis, and §7 is the experiment that tests it.
