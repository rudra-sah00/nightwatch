# Player audit — full bug inventory

A complete correctness pass over `src/features/watch/`, covering everything the seek-path
analysis in [SEEKING.md](./SEEKING.md) left unexamined.

**Status:** analysis only. No code changed.
**Method:** every file in `player/` plus the watch components, hooks and services was read.
Findings are correctness, races, leaks, error handling and state-staleness only — no style or
naming issues.

**Re-verified 2026-09-30 (Phase 0).** All 43 findings were re-opened at their cited lines and
re-traced adversarially against the current tree. Each carries a status:

| Status | Meaning |
|---|---|
| ✅ CONFIRMED | Evidence matches the tree and the consequence follows |
| ❌ WRONG | The reasoning does not hold — corrected or deleted in place |
| 🔶 STALE | Code moved; the corrected location is given |
| ❓ UNPROVABLE | Code confirmed, but the runtime consequence needs a repro not available locally |

**Result: 39 of 43 survived. Four were WRONG and have been struck out rather than silently
dropped** — H13, M4, M10 and L1, each with the disproof recorded in place. Eighteen had stale
line numbers, now corrected. Four changed severity. See
[§ Verification log](#verification-log-phase-0).

The original caveat still explains the split: the CRITICAL and HIGH findings were confirmed
against source when first written and all but one held; the MEDIUM and LOW rows were not, and
three of the four disproofs are in that group.

Known seek-path defects (duplicate arrow handlers, scrub-per-mousemove, stale-state skips, eight
`currentTime` writers, racing error owners, watch-party drift loop) are **not** repeated here.
See SEEKING.md.

---

## The short list

If you fix five things, fix these:

1. **C1** — an error raised while buffering is invisible, and leaves an infinite spinner with no
   way out. This may well be what users report as "stuck loading".
2. **H1** — on mobile, every MP4 playback reloads the stream 20 seconds in, mid-playback.
3. **H3** — closing the tab loses up to 10 seconds of watch progress, every time.
4. **H4** — one unlucky unmount leaves the entire app unscrollable until a hard reload.
5. **H5** — the whole player subtree re-renders 4× per second during playback.

---

## CRITICAL

### C1 — An error raised while buffering is never shown, and the spinner never stops

**✅ FIXED — `5faacf78`.** `SET_ERROR` now clears `isBuffering` when the error is non-null.
Clearing is conditional because `SET_ERROR: null` is the ordinary "no error" reset
dispatched on load, `canplay` and `playing`, and clearing the flag there too would hide the
spinner during normal buffering. `isPlaying`/`isPaused` are deliberately left alone — the
element's own events own those. Regression test:
`tests/features/watch/player/set-error-clears-buffering.test.ts`, which asserts the reducer
contract *and* re-evaluates the real overlay guard expressions, so a change to either side
is caught. Three of its seven cases fail against the old reducer.

Confirmed during verification: all three cited lines were exact, and it affected
`WatchLivePlayer.tsx:202,205` identically — which the original finding did not note.

`player/context/types.ts:153-154`, `components/WatchVODPlayer.tsx:212,216`,
`components/WatchLivePlayer.tsx:202,205`

```ts
// types.ts — SET_ERROR clears isLoading but NOT isBuffering
case 'SET_ERROR':
  return { ...state, error: action.error, isLoading: false };
```

```tsx
// WatchVODPlayer.tsx
isVisible={state.isBuffering && !state.isLoading}                      // 212, BufferingOverlay
isVisible={!!state.error && !state.isLoading && !state.isBuffering}    // 216, ErrorOverlay
```

The two guards are mutually exclusive on `isBuffering`, and `SET_ERROR` never clears it. Every
error path in `useHls` that dispatches `SET_BUFFERING: true` and later gives up therefore lands in
a state where `isBuffering` is still true: the ErrorOverlay is suppressed and the BufferingOverlay
is shown.

**Reachability, traced per path (this is the part that was not in the original).** Not every
`SET_ERROR` lands in the deadlock — it needs a preceding `SET_BUFFERING: true` on the same path.
Reviewing the full reducer confirms no other action clears `isBuffering`, and no `SET_ERROR` call
site pairs itself with `SET_BUFFERING: false`. The paths that **do** deadlock:

- `levelParsingError` after the retry budget is spent — the retry dispatches `SET_BUFFERING: true`
  first.
- fatal `MEDIA_ERROR` past `MAX_MEDIA_RECOVERY_ATTEMPTS` with no `onStreamExpired` — recovery
  dispatches `SET_BUFFERING: true` first.
- the `use-video-element.ts` 1200 ms decode timer (D9) whenever `handleWaiting` has fired.

The paths that do **not**: `manifestParsingError` and the garbage-manifest branch, which fire on
first parse before any buffering dispatch.

`handlePlaying` is the only handler that clears `isBuffering`, and it requires reaching `playing` —
which is exactly what a terminal failure prevents. So the deadlock is conditional but sits on the
three most common runtime failures.

**Consequence:** infinite spinner, no message, no retry button, no back button. The only escape is
reloading the page. This is the most likely explanation for any "it just spins forever" report, and
it silently swallows every error message the recovery code carefully produces.

**Fix:** `SET_ERROR` with a non-null error should also set `isBuffering: false` (and probably
`isPlaying: false, isPaused: true`). Dropping `!state.isBuffering` from the ErrorOverlay guard
would also work but leaves the contradictory state reachable.

---

## HIGH

### H1 — Native MP4: a 20 s watchdog fires even after the video loads successfully

**✅ FIXED — `49967ea7`.** The timer handle is hoisted above `handleLoadedMetadata` so a
successful load cancels it, and the interval is named `WATCHDOG_MS`. Regression test:
`tests/features/watch/player/useMp4-load-watchdog.test.ts`, which stubs
`Capacitor.isNativePlatform` true and fails on the old behaviour for both watchdog branches
(the `onStreamExpired` one and the `SET_ERROR` fallback).

**Not verified on a device.** The code defect and its fix are proven by test; the
user-visible native consequence needs a Capacitor build to observe.

Verified during Phase 0: the watchdog is at `useMp4.ts:86-93` (doc said 82-94);
`handleLoadedMetadata` at `:46-50` exactly. The effect deps are
`[streamUrl, videoRef, dispatch]`, none of which change during normal playback, so the
cleanup — the only `clearTimeout` — did not run.

`player/hooks/useMp4.ts:86-93`, and `handleLoadedMetadata` at `:46-50`

```ts
if (isNative) {
  metadataTimeout = setTimeout(() => {
    if (onStreamExpiredRef.current) onStreamExpiredRef.current();
    else dispatch({ type: 'SET_ERROR', error: 'Video failed to load' });
  }, 20000);
}
```

```ts
const handleLoadedMetadata = () => {
  dispatch({ type: 'SET_ERROR', error: null });
  dispatch({ type: 'SET_LOADING', isLoading: false });
  video.play().catch((_err) => {});
};        // ← never clears metadataTimeout
```

The timer is only cleared in the effect cleanup, which does not run while playback continues
normally.

**Consequence:** on Capacitor (iOS/Android/TV), **every** successful MP4 playback triggers
`onStreamExpired()` 20 seconds in — a full stream refetch and engine remount while the user is
watching. Given NetMirror "server 2" serves progressive MP4, this is a large share of mobile VOD.

**Fix:** clear `metadataTimeout` inside `handleLoadedMetadata`.

### H2 — Initial subtitle tracks are discarded on every token-authenticated stream

**✅ FIXED — `597fbc84`.** `subtitleTracks: normalized.subtitleTracks`. Regression test:
`tests/features/watch/player/services/StreamUrlService-subtitles.test.ts`, which also pins
the proxied `src` and the no-token branch; three of six cases fail against the old code.

Verified during Phase 0: the line is `StreamUrlService.ts:70`, not `:65`.
**Severity HIGH → MEDIUM** — the consequence was overstated, see below.

`player/services/StreamUrlService.ts:70`

```ts
const normalized = normalizeWatchUrls({ …, subtitleTracks: raw.subtitleTracks }, token);

return {
  streamUrl: normalized.streamUrl,
  captionUrl: normalized.captionUrl ?? null,
  spriteVtt: normalized.spriteVtt,
  qualities: normalized.qualities,
  subtitleTracks: undefined,        // ← normalized.subtitleTracks thrown away
};
```

`normalizeWatchUrls` proxies each track's `src` correctly and returns them; the return statement
discards the result. The no-token branch above preserves `raw.subtitleTracks`, so only the
authenticated path — the normal one — loses them.

**Consequence (corrected).** The original claimed "users see no subtitle options on content that
has them". Tracing every writer of `subtitleTracks` shows it is recovered on both branches:

- `skipDiscovery` is `!streamParam` (`use-watch-content.ts:238`). When a stream param *is* present
  — the token path where `normalizeRawUrls` runs and drops the tracks — discovery is **not**
  skipped, so `useAudioTracks` fires `onDiscovered` → `handleDiscovered` (`:215`) →
  `applySubtitles` (`useStreamUrls.ts:137`), which repopulates them.
- With no stream param, `refetchStream` → `applyResponse` → `processResponse`, which never calls
  `normalizeRawUrls` and maps `subtitleTracks` correctly.

So the real symptom is a **transient window** — no subtitle options between mount and the
discovery response landing — not permanent loss. Still worth the one-line fix: it closes the
window and removes a branch that silently throws away correctly-proxied data.

**Fix:** `subtitleTracks: normalized.subtitleTracks`.

### H3 — Watch progress is lost whenever the tab closes or the user navigates away

**✅ CONFIRMED — ⏸ NOT FIXED, blocked on a backend decision.** The frontend half is a small
`pagehide` + `sendBeacon` handler, but there is **no REST endpoint to send it to**. Watch
progress is socket-only: `nightwatch-backend/src/modules/watch/watch.routes.ts` exposes
`GET /activity`, `GET /continue-watching`, `GET /progress/:contentId` and
`DELETE /progress/:progressId`, and writes go exclusively through the
`watch:update_progress` socket event. So the fix needs a new
`POST /api/watch/progress` — auth from the cookie session, CSRF via the `?_csrf=` query
param that `app.ts:205-208` already accepts for `sendBeacon`, plus validation and a rate
limit.

That is a new backend route rather than a frontend fix, so it is left for explicit
agreement. Everything else in Wave 1 has landed.

Verified during Phase 0 🔶 — the teardown effect is at `useWatchProgress.ts:271-284`, not
`:222-232` (code added since the audit shifted it ~50 lines). Re-grepped: no `pagehide`,
`beforeunload`, `visibilitychange` or `sendBeacon` anywhere in the hook, and no parent
supplies one for progress.

`player/hooks/useWatchProgress.ts:271-284`

The only teardown save is the React effect cleanup, and it goes over Socket.IO:

```ts
return () => {
  video.removeEventListener('ended', handleEnded);
  flushActivity(true);
  updateProgress();
};
```

`syncProgress`/`syncActivity` both check `socket?.connected` first. On tab close or address-bar
navigation the browser tears the socket down *before* React cleanup runs, so the emit is a no-op.
There is no `pagehide`, `beforeunload` or `visibilitychange` handler anywhere in the hook —
confirmed by grep. The only `pagehide` in the watch feature (`use-watch-content.ts:294`) sends
`stopVideo()`, not progress.

**Consequence:** up to 10 seconds of position is lost on every close — and if the user closes
within 10 seconds of starting, the resume point is never recorded at all. Continue-watching
silently drifts behind where people actually stopped.

**Fix:** add a `pagehide` handler that posts the payload via `navigator.sendBeacon` to a REST
endpoint, the same pattern `stopVideo()` already uses.

### H4 — A mistimed unmount leaves the whole app unscrollable

**✅ FIXED — `7ef25da6`.** The `count <= 0` branch's cleanup now restores `overflow` as well
as clearing its timeout. Regression test:
`tests/features/watch/hooks/use-playback-countdown.test.ts`, covering unmount mid-countdown,
unmount inside the final 500 ms window, the normal completion path, and the M15 re-run case.
Two of six fail against the old hook.

Verified during Phase 0: the file is `src/features/watch/hooks/use-playback-countdown.ts`
(under the watch feature, not the global `hooks/`); lines 19-29 were exact.

One correction to the original "capture the original value in a ref" advice, confirmed by
test: on the *normal* path the capture was already safe, because React runs the previous
cleanup — which restores `overflow` — before the next effect body re-captures it. The
"restores scroll on the normal completion path" case passes against the old code. The
capture only degraded to `'hidden'` when a branch skipped the restore, which is why
restoring in this one cleanup fixes both the unmount leak and the M15 compound leak without
needing a ref.

**H4 and M15 compound:** with the restore missing, an unstable `onComplete` re-running the
effect inside the 500 ms window made cleanup A skip the restore, body B capture `'hidden'`
as the original, and the timeout then "restore" `overflow: hidden` permanently — a leak on
the happy path with no unmount required. M15 itself (the countdown stutter) is still open.

`hooks/use-playback-countdown.ts:19-29`

```ts
const originalStyle = window.getComputedStyle(document.body).overflow;
document.body.style.overflow = 'hidden';

if (count <= 0) {
  const finalTimeout = setTimeout(() => {
    document.body.style.overflow = originalStyle;
    onComplete();
  }, 500);
  return () => clearTimeout(finalTimeout);   // ← does NOT restore overflow
}
```

The normal branch's cleanup does restore `overflow`; the `count <= 0` branch does not. Unmounting
inside that 500 ms window — back navigation, route change, the parent hiding the countdown —
cancels the restore and leaves `overflow: hidden` on `<body>`.

**Consequence:** every subsequent page in the SPA session is unscrollable until a full reload. A
user who backs out of a countdown finds the app apparently frozen.

**Fix:** restore `overflow` in that branch's cleanup too, and capture the original value in a ref
so repeated effect runs cannot record `'hidden'` as the original.

### H5 — The context value is rebuilt every render, re-rendering the whole player at 4 Hz

**✅ CONFIRMED** — `:477` is exact, and `useMemo` has zero occurrences in the file. The consumer
count was an **undercount**: `usePlayerContext()` has 33 call sites across 26 files, not 22.

`player/ui/compound/hooks/use-player-root.ts:477`

```ts
const contextValue = {      // ← no useMemo
  state,
  dispatch,
  metadata,
  …
};
```

`SET_TIME` is dispatched from `timeupdate` (~4 Hz). Each dispatch produces a new `state`, a new
`contextValue` identity, and invalidates all 33 `usePlayerContext()` call sites — including
components that only read stable handlers.

**Consequence:** the entire player subtree re-renders four times a second during playback. On
Android TV and older phones that shows up as dropped frames and laggy controls.

**Fix:** `useMemo` the value, or split into a stable handlers/dispatch context and a volatile state
context. Given `SET_TIME` is the hottest action, the split is the durable fix.

### H6 — Casting starts at 0:00 and leaves the local video playing

**✅ CONFIRMED (code)** **/ ❓ UNPROVABLE (needs a Cast device)** — no `request.currentTime` in
`startCast`, and `videoRef` has **zero** occurrences in the whole hook, so it structurally cannot
read the position or pause the element. Any fix has to pass the ref in.

`player/hooks/useChromecast.ts:118-152`

```ts
const request = new chrome.cast.media.LoadRequest(mediaInfo);
request.autoplay = true;
await session.loadMedia(request);
```

No `request.currentTime`, and no `videoRef.current.pause()` anywhere in the hook.

**Consequence:** casting mid-film restarts it from the beginning, and the phone or laptop keeps
playing audio alongside the TV.

**Fix:** set `request.currentTime` from the live `video.currentTime` and pause the local element on
connect; resume on disconnect.

### H7 — "Retry" reloads the whole page, and the real retry handler is dead code

**✅ FIXED — `c39b402c`, by the "delete it and document that reload is deliberate" option.**

The engine-re-init option was assessed and deferred: all three engine hooks
(`useHls`, `useMp4`, `useDash`) key their main effect on `streamUrl` and none accepts a
reload nonce, so threading one means touching the three hooks, `usePlayerEngine`,
`use-player-root`, the context type and both player components. That is a lifecycle change
rather than a small independent one, and it overlaps the error-ownership and re-prime work
still outstanding. Recorded here as the follow-up.

`handleRetry` is removed, and both `onRetry` call sites now carry a comment explaining why
the reload is deliberate. Regression test:
`tests/features/watch/player/usePlayerHandlers-surface.test.ts` pins the handler surface so
a no-op retry cannot quietly return; two of three cases fail against the old hook.

Verified during Phase 0: `handleRetry` was defined at `usePlayerHandlers.ts:282` and
returned at `:300`, with no reference anywhere in `src/features/watch/`. The one other
`handleRetry` in the tree, `TvPlayer.tsx:365`, is a separate local implementation that *is*
wired to its own `onRetry` — unrelated.

`components/WatchVODPlayer.tsx:218-220`, `components/WatchLivePlayer.tsx:207`,
`player/hooks/usePlayerHandlers.ts:282`

```tsx
onRetry={() => { window.location.reload(); }}
```

`usePlayerHandlers` defines and returns `handleRetry` (`:282`, exported at `:300`), but
`use-player-root.ts` never destructures it and it is not on `playerHandlers`. It is also
insufficient as written — it clears the error and sets loading but never re-initialises the engine,
so wiring it up as-is would swap the spinner problem for a different one.

**Consequence:** retry costs a full page reload: new stream token, new CDN negotiation, 3–5 seconds,
and all client state lost — where re-creating the engine would do.

**Fix:** either make `handleRetry` genuinely re-init the engine (bump a key that re-runs
`usePlayerEngine`) and expose it, or delete it and document that reload is deliberate.

### H8 — The mobile seek bar seeks on every `touchmove`

**✅ FIXED — `0f95a6d6`.** Rewritten onto the shared `useDragSeek` primitive, so it previews
while moving and commits one seek on release, same as the desktop bar. Regression test:
`tests/features/watch/controls/mobile-seek-bar-drag.test.tsx` (3 of 8 fail against the old
component). Portrait stays display-only.

Verified during Phase 0: lines exact; `seekFromTouch` (`:36-41`) called
`playerHandlers.seek()` directly with no throttle and no preview state.

`player/ui/compound/PlayerMobileSeekBar.tsx:49-55`

```ts
const onTouchMove = useCallback((e: React.TouchEvent) => {
  if (!dragging.current) return;
  e.preventDefault();
  seekFromTouch(e.touches[0].clientX);   // → playerHandlers.seek(...) → video.currentTime
}, [seekFromTouch]);
```

This is the exact mobile twin of the desktop scrub storm in SEEKING.md D3, and it is
decode-error-sensitive for the same reason.

Note `controls/LiveSeekBar.tsx` already does this correctly — it pauses on drag start, tracks the
fraction visually, and commits once on release. That is the pattern to copy.

**Consequence:** stutter, garbage frames and decode errors while scrubbing on mobile.

### H9 — The volume slider cannot be dragged on any touch device

**✅ FIXED — `ded3be2c`.** Converted to Pointer Events, so mouse, touch and pen share one
path, with `setPointerCapture` replacing the document-level `mousemove`/`mouseup` listeners
— which also removes a global listener that could outlive the element. Volume keeps
applying continuously during the drag, unlike the seek bar's commit-on-release: there is no
expensive commit to defer, and hearing the level change is the point of the control.
Regression test: the two existing mouse-only drag cases in
`tests/features/watch/controls/volume.test.tsx` are migrated and now assert the resulting
value, plus four new touch/capture cases. Five of 26 fail against the old implementation.

Verified during Phase 0: the only `pointer` match in either file was the `cursor-pointer`
CSS class.

`player/ui/controls/hooks/use-volume.ts`, `player/ui/controls/Volume.tsx` — zero occurrences of
`touch` in either file (verified by grep).

Drag is implemented purely with `mousedown` → `document.mousemove`/`mouseup`.

**Consequence:** on phones, tablets and touchscreen laptops the volume slider only responds to a
tap, which jumps the volume abruptly. Fine-grained adjustment is impossible.

### H10 — Rapid season switching shows the wrong episode list

**✅ FIXED — `53638e08`.** Every state write, including the `finally` that clears the spinner, is
gated on the fetch still being the latest. A guard rather than an `AbortController`: the function
makes two API calls with a cache hit in between, so cancelling properly would mean threading a
signal through both helpers.

Verified during Phase 0 🔶 — `fetchShowData` spans `:79-148` (doc said 80-141). `setEpisodes` at `:126`,
unconditional `setIsLoading(false)` in the `finally` at `:139`. Verified there is no
`AbortController` and no stale guard; the `fetchedSeasonsRef.current.has(...)` early return at
`:82` only suppresses *redundant* refetches of an already-loaded season and does nothing about
out-of-order resolution.

`player/ui/controls/hooks/use-episode-panel.ts:79-148`

`fetchShowData` has no `AbortController` and no stale-response guard; it calls `setEpisodes(...)`
and `setIsLoading(false)` unconditionally. Switching S1 → S2 → S3 quickly launches three
overlapping fetches and the last to *resolve* wins.

**Consequence:** the dropdown says S3 while the list shows S1's episodes. Clicking an episode plays
the wrong one.

**Fix:** guard on a `latestSeasonRef`, or abort in-flight requests.

### H11 — Two Escape handlers close the episode panel, firing the close path twice

**✅ FIXED — `97228794`**, by keeping the hook's handler as the audit recommended — it also owns the
outside-click listener, so both dismissals live together. `EpisodePanel` is only ever rendered by
`PlayerEpisodePanel`, which uses the hook, so no caller loses the behaviour.

Verified during Phase 0 🔶 — `EpisodePanel.tsx:75-86` (doc said 78-83) and `use-episode-panel.ts:62-66`
(doc said 63-67). Both are gated on `isOpen`, neither stops propagation, and the component's
`onClose` **is** the hook's `close`, so `setIsOpen(false)` and `onInteraction?.(false)` both run
twice.

`player/ui/controls/EpisodePanel.tsx:75-86` (window) and
`player/ui/controls/hooks/use-episode-panel.ts:62-66` (document)

Both are active while open, neither stops propagation, and both run the same close logic, so
`onInteraction?.(false)` fires twice in one tick — cancelling and restarting the controls
auto-hide timer.

**Fix:** keep the hook's handler (it also owns the outside-click listener) and delete the
component's.

### H12 — Rapid quality switching on MP4 orphans `loadedmetadata` listeners

**✅ FIXED — `3553a595`.** The pending listener is tracked at hook scope and dropped before a new
one is added, so the last switch wins. The main effect's cleanup detaches it too, so an unmount
mid-switch cannot restore a position into a torn-down player.

Verified during Phase 0 🔶 — `setQuality` spans `:141-169` (doc said 145-163); `onMetadata` is declared at
`:154` and registered at `:163`. Confirmed it uses plain `addEventListener` with **no**
`{ once: true }`, and that assigning `video.src` does not detach existing listeners. The effect
cleanup at `:97` holds no reference to these closures.

`player/hooks/useMp4.ts:141-169`

Each `setQuality` adds a fresh `loadedmetadata` listener and only removes it from inside itself.
Switching twice before the first fires leaves both attached; both then run, and the first restores
a stale `currentTime`.

**Consequence:** a visible seek flash to the wrong position, and a decode-error risk on open-GOP
content. The main effect's cleanup cannot help — it has no reference to these listeners.

### ~~H13 — `useDash` cleanup can race the dynamic import and leak a live player~~

**❌ WRONG — disproved, not dropped.** `player/hooks/useDash.ts:141-151`.

Both `player` and `destroyed` are declared in the effect body (`:34-35`: `let player: any = null;
let destroyed = false;`), so the cleanup and the `.then()` callback close over the **same**
`player` binding. Every execution order is therefore safe:

1. `.then()` resolves first → `player` is assigned → cleanup later sees a truthy `player` and calls
   `player.destroy()`.
2. Cleanup runs first → `destroyed = true` → the `.then()` early-return at `:48`
   (`if (destroyed || !videoRef.current) return;`) fires **before** `MediaPlayer().create()`, so no
   instance is ever built.

There is no third ordering: the `.then()` body runs from the `destroyed` check through
`create()`/`initialize()` with no intervening `await`, so it cannot be interrupted. The finding's
premise — "if `create()`/`initialize()` already ran … with no `destroy()` ever called" — cannot
occur, because the same assignment that runs `create()` is what makes the cleanup's `if (player)`
true. Strict Mode double-mount is also safe: each mount has its own `destroyed`/`player` pair.

No fix required. Retained here so the claim is not re-raised.

### H14 — TextTrack activation indexes by array position, which HLS-injected tracks break

**✅ FIXED — `db5b7de8`.** Matching is by id across the whole list, then by label for tracks the
browser or hls.js created with an empty id. Two passes, because an exact id match anywhere beats a
label that merely coincides earlier — a case the new tests turned up. The matcher is extracted to
`ui/resolve-text-track.ts` so it can be tested at all: happy-dom returns a fresh `TextTrackList`
and fresh `TextTrack` objects on every property access, so a `mode` written in one read is
invisible in the next.

Verified during Phase 0: `:172-176` exact. The mismatch is not hypothetical: `use-video-element.ts`
builds its `tracks` array by appending a `fallback-captions` entry when `captionUrl` is set and not
already present, and `VideoElement.tsx:102` renders a further hardcoded
`<track kind="captions">`. Neither is in the `subtitleTracks` prop the index is derived from, so
`video.textTracks` is reliably longer whenever `captionUrl` is non-null. The `id`/`label` fallback
loop below is correct; the positional path runs first and wins.

`player/ui/use-video-element.ts:172-176`

```ts
const targetIndex = subtitleTracks.findIndex((t) => t.id === trackId);
if (targetIndex !== -1 && targetIndex < textTracks.length) {
  textTracks[targetIndex].mode = 'showing';
```

The index comes from our `subtitleTracks` prop; it is applied to `video.textTracks`, which also
contains the hardcoded `<track>` from `VideoElement.tsx:103`, the `fallback-captions` entry, and any
tracks hls.js injects for in-manifest WebVTT. The 1:1 correspondence is an assumption, not a
guarantee.

**Consequence:** selecting one subtitle language displays another, or none.

**Fix:** drop the positional path; always match by `id`/`label` (the fallback loop already does).

### H15 — Subtitles freeze after a level switch replaces the TextTrack

**✅ FIXED — `45b35894`.** Binding is a function now, re-run on the `TextTrackList`'s own
`addtrack`/`removetrack`/`change` events, releasing the previous listeners first so an orphan
cannot fire into a stale closure. Tested against a hand-rolled element for the same happy-dom
reason as H14. **That hls.js replaces the track for our manifests is still unproven** — it needs
multi-variant content with in-manifest WebVTT.

Verified during Phase 0 🔶 — the listener loop
is at `:136-149` with `addEventListener('cuechange', …)` on `:139`, and the deps are at `:160`, not
`:134-140`. The snapshot-vs-deps mismatch is confirmed, as is that the safety poll only covers the
first 2 s after mount. Whether hls.js actually swaps the underlying `TextTrack` on a level switch
for our manifests needs a repro on multi-variant content with in-manifest WebVTT.

`player/ui/compound/hooks/use-subtitle-overlay.ts:136-149`, deps at `:160`

`cuechange` listeners are attached to a snapshot of `video.textTracks` taken when the effect runs,
with deps `[videoRef, currentTrackId]`. hls.js can replace the underlying `TextTrack` on a level
switch without `currentTrackId` changing, leaving the listener on an orphaned track.

**Consequence:** subtitles stop updating mid-playback until the user toggles them off and on.

**Fix:** react to `video.textTracks`'s `addtrack`/`change` events rather than snapshotting.

---

## MEDIUM

Locations below are the **verified** ones; where they differ from the original audit the old value
is given in brackets.

| # | Finding | Location | Status |
|---|---|---|---|
| M1 | The controls-safety effect has **no dependency array**, so its 5 s timer is destroyed and recreated ~4×/s during playback and can never fire. If `isInteracting` sticks true, controls stay visible forever. | `usePlayerHandlers.ts:135-147` *(was :136)* | ✅ **FIXED `1626d26a`** — the timer never once fired; `dispatch` listed, which is stable |
| M2 | `applyResponse` wraps everything in `try { … } catch (_e) {}`. A `{success:false}` or empty `masterPlaylistUrl` is swallowed — no error, no log — leaving the player loading forever. | `useStreamUrls.ts:125-134` *(was :112-120)* | ✅ CONFIRMED 🔶 — `processResponse` throws `Invalid play response` on exactly that input |
| M3 | The soft-navigation sync effect never resets `subtitleTracks` or `apiDurationSeconds`, and guards the others with `if (…)`, so the previous video's captions/sprites/duration persist into the next. | `useStreamUrls.ts:100-122` *(was :96-111)* | ✅ CONFIRMED 🔶 |
| ~~M4~~ | ~~`stopVideo()` sends CSRF as a `_csrf` query param via `sendBeacon`, while `apiFetch` uses the `x-csrf-token` header.~~ | `api.ts:167-179` | ❌ **WRONG** — see disproof below |
| M5 | The Cast `CAST_STATE_CHANGED` listener is never removed, and `CastContext` is a singleton, so `setCastState` closures survive unmount. | `useChromecast.ts:85-89` *(was :80-85)* | ✅ CONFIRMED 🔶 — effect has no cleanup `return` at all |
| M6 | Next-episode lookup uses `=== current + 1` for both episode and season. Any gap, special, or season 0 breaks autoplay and shows "no more episodes" while episodes remain. | `NextEpisodeService.ts:76,93` | ✅ CONFIRMED — next-season's first episode is also hardcoded `=== 1` |
| M7 | The first progress save always sends `progressDelta: 0`, so the first ~10 s of every session is uncounted in watch-time aggregates. | `WatchProgressService.ts:57-59` | ✅ CONFIRMED — `lastProgressRef` starts `null` |
| M8 | `currentTime === 0` short-circuits the save, so deliberately rewinding to the start is never persisted. | `WatchProgressService.ts:41` | ✅ CONFIRMED — **severity MEDIUM → LOW**: the guard's real job is suppressing pre-playback saves, and rewinding to exactly 0 is rare |
| M9 | `stopVideo()` fires before the outgoing episode's unmount progress flush, so the backend sees stop → play(new) → progress(old). Can resurrect a just-closed continue-watching entry. | `NextEpisodeService.ts:145` *(was :140)* | ✅ CONFIRMED 🔶 |
| ~~M10~~ | ~~`countdown` and `cancelled` are `useState` initialisers on a hook that never unmounts, so they never reset.~~ | `use-next-episode-overlay.ts:29-30` | ❌ **WRONG** — see disproof below |
| M11 | `spriteVttCache` is a module-level unbounded `Map`; entries accumulate for the tab's lifetime across every video watched. | `SpriteService.ts:15` | ✅ CONFIRMED — ~144 KB per hour of video, never evicted |
| M12 | `use-player-root` builds a `subtitleSettings` state that nothing consumes, and its initialiser calls `applySubtitleSettings` → `loadSubtitleFonts()`, pulling ~200 KB of Google Fonts on every player mount even if the style panel is never opened. The real settings live in `use-player-audio-subtitle-selectors`. | `use-player-root.ts:117-124` *(was :116-124)* | ✅ **FIXED `e0434fa5`** — dead state and its mount-time font fetch removed; the selectors hook applies settings when it mounts |
| M13 | `applySubtitleSettings` runs twice per change — once directly in the handler, once via the effect watching the state it just set. | `use-player-audio-subtitle-selectors.ts:25-33` *(was :29-33)* | ✅ **FIXED `a1877f6d`** — effect is mount-only; the handler already applies on change |
| M14 | `onInteraction` is in the effect's deps, so an identity change while the menu is open fires `false` on the old closure then `true` on the new one, flickering the auto-hide timer. | `use-settings-menu.ts:22-47` | ✅ CONFIRMED |
| M15 | The countdown effect depends on `onComplete`, which the only caller passes as an inline arrow. Any parent re-render restarts the intervals, stuttering the countdown and re-delaying playback by 500 ms. | `use-playback-countdown.ts:42` *(was :40)*, `content-detail-modal.tsx:146` | ✅ CONFIRMED 🔶 — **and it is the trigger that turns H4 into a happy-path leak**; fix together |
| M16 | `orientationTimeoutsRef` is only drained on unmount, so every fullscreen exit pushes 1–2 more stale IDs. | `useFullscreen.ts:283,311` *(was :284)* | ✅ CONFIRMED 🔶 — hygiene only: the IDs are numbers and the stale `clearTimeout`s are no-ops |
| M17 | `addEventListener('canplaythrough', () => {})` is added with an anonymous handler and never removed; accumulates each time the effect re-runs. | `use-video-element.ts:131` *(was :133)* | ✅ **FIXED `bd670b9a`** — removed; the handler body was empty |
| M18 | Two independent `usePlaybackSpeedBoost` instances (one in `use-player-root`, one in `useKeyboard`) each own a private `restoreRateRef`, despite a comment claiming they share rules. | `use-player-root.ts:384`, `useKeyboard.ts:204` | ✅ CONFIRMED (two instances) but the **"double-dispatches `SET_SPEED_BOOST`" claim is WRONG**: `engageSpeedBoost` returns early at `if (video.playbackRate >= SPEED_BOOST_RATE) return true;` before any dispatch, so the second instance cannot dispatch. **Severity MEDIUM → LOW** — structurally untidy, functionally guarded |
| M19 | Sprite preload creates `new Image()` and drops the reference immediately, so memory-pressured mobile/TV WebViews can purge it before use, defeating the preload. | `SpriteService.ts:137-138` | ✅ CONFIRMED (code) but **severity MEDIUM → LOW**: the preload's real purpose is warming the HTTP cache, and those bytes survive GC of the `Image` object. Only the decoded bitmap is lost |

### ❌ M4 — disproved

The backend **does** accept the query param. `nightwatch-backend/src/app.ts:205-208`:

```ts
const headerToken = req.headers['x-csrf-token'] as string | undefined;
const queryToken = req.query._csrf as string | undefined;
const incomingToken = headerToken ?? queryToken;
```

The comment immediately above documents this as the deliberate `sendBeacon` fallback, and the
comparison at `:215` is timing-safe. So `stopVideo()` does not 403 and playback *is* marked
stopped. The finding's premise — "if the backend only checks the header" — is false.

What remains is the second half: `api.ts` has a local `getCookie` duplicating `lib/cookies.ts`.
That is a style nit, not a correctness defect, and does not belong in this document.

### ❌ M10 — disproved

The premise is "a hook that never unmounts". It does unmount, on every episode change.
`src/app/(protected)/watch/[id]/page.tsx:105` builds

```ts
const watchKey = `${movieId}-${season || 0}-${episode || 0}`;
```

and applies it as `key={watchKey}` to `WatchVODPlayer` at `:188`. Changing episode changes the key,
so React discards the whole player subtree and remounts it — `countdown` and `cancelled` are
re-initialised from scratch. Within a single mount the overlay cannot be re-shown either, because
`useNextEpisode` holds its own `cancelled` guard upstream of `isVisible`.

Both stated consequences — "cancelling once disables autoplay permanently" and "a re-shown overlay
can fire `onPlayNext` instantly" — are therefore unreachable.

---

## LOW

| # | Finding | Location | Status |
|---|---|---|---|
| ~~L1~~ | ~~DASH download-error detection uses magic numbers `27`/`28`, which are dash.js **v4** codes.~~ | `useDash.ts:113-117` | ❌ **WRONG** — see disproof below |
| L2 | `btoa(url)` throws on any code point > 255, so a non-ASCII subtitle or quality URL crashes proxy wrapping. The Node fallback handles UTF-8; the browser path does not. | `utils.ts:131-132` *(was :115-118)* | ✅ CONFIRMED 🔶 — reachable only for *relative* non-ASCII URLs, since `http`/`data:` return early |
| L3 | Pausing never emits `watch:clear_activity` — only unmount does — so friends see "watching X" for up to 3 minutes after a pause. | `WatchVODPlayer.tsx:170-177` | ✅ CONFIRMED — the clear lives in a separate unmount-only effect at `:181-185` |
| L4 | `Math.random()` is called in render for the now-playing equaliser bar heights, so the bars jump to new heights on every parent re-render (including scroll). | `EpisodePanel.tsx:423` | ✅ CONFIRMED |
| L5 | Seven `logEvent('…')` listeners are added with freshly-created functions and "removed" with different fresh functions, so removal is a no-op. Staging-only overlay. | `DebugOverlay.tsx:128-147` | ✅ CONFIRMED — the two named handlers (`onError`, `onStalled`) *are* removed correctly; only the seven `logEvent(...)` ones leak, and the effect early-returns unless `isStaging` |
| L6 | Electron `enterFullscreen` delegates to `electronAPI.toggleFullscreen()`, so calling it while already fullscreen exits instead of no-op. | `useFullscreen.ts:236-250` *(was :237-247)* | ✅ CONFIRMED 🔶 — wrong API contract, but no current caller reaches it on Electron (the button routes through `toggleFullscreen`, and the `enterFullscreen` path is mobile-gated) |
| L7 | If desktop `document.exitFullscreen()` rejects, the catch shows a toast but never dispatches `SET_FULLSCREEN false`, and no `fullscreenchange` fires — so the button shows the wrong state. The mobile path dispatches unconditionally. | `useFullscreen.ts:337-349` *(was :337-348)* | ✅ CONFIRMED 🔶 — mobile's unconditional dispatch confirmed at `:335` |
| L8 | The `_v` storage version marker is spread into live `SubtitleSettings` state and written back on every save, so a future field named `_v` would silently break migration. | `subtitle-settings.ts:105` *(was :103-104)* | ✅ CONFIRMED 🔶 — `saveSubtitleSettings` at `:120` always overwrites `_v`, so today the round-trip is harmless. `tests/features/watch/subtitle-settings.test.ts` already documents the leak in comments |

### ❌ L1 — disproved

The installed version is dashjs **5.2.1**, and `node_modules/dashjs/index.d.ts` declares:

```ts
DOWNLOAD_ERROR_ID_CONTENT_CODE: 27;
DOWNLOAD_ERROR_ID_INITIALIZATION_CODE: 28;
```

The numeric values did not change between v4 and v5, so `27`/`28` are the **correct** codes for the
installed version and expired DASH URLs do *not* fall through. The finding's factual premise is
wrong and its stated consequence cannot occur.

Switching to `dashjs.Errors.*` is still better style — magic numbers here are opaque and would
break silently if upstream ever renumbered — but it is a readability change with no behavioural
effect, so it does not belong in a correctness inventory.

---

## Confirmed clean

Worth recording so nobody re-audits them: `context/PlayerContext.tsx`, `ui/compound/PlayerControls.tsx`,
`ui/overlays/{LoadingOverlay,BufferingOverlay,SpeedBoostIndicator,ErrorOverlay,NextEpisodeOverlay}.tsx`,
`ui/controls/{PlayPause,Fullscreen,AudioSelector,SubtitleSelector}.tsx`,
`ui/controls/LiveSeekBar.tsx` (notably the **best-implemented** drag in the codebase — pauses on
drag, tracks visually, commits on release, handles mouse *and* touch, clamps to the DVR window),
`ui/controls/hooks/use-audio-selector.ts`, `ui/compound/{SubtitleOverlay,PlayerAudioSubtitleSelectors,PlayerHeader}.tsx`,
`ui/compound/hooks/use-player-live-badge.ts`, `ui/VideoElement.tsx`, `hooks/use-vod-player-state.ts`,
`components/{PlaybackCountdown,WatchLivePlayer}.tsx`, `player/hooks/series-cache.ts`,
`player/hooks/{usePlaybackSpeedBoost,useLongPressSpeedBoost,useMobileDetection,useMobileOrientation}.ts`,
and the ambient canvas in `PlayerVideo.tsx` (rAF correctly cancelled, 128×72 buffer, desktop-only).

---

## Suggested order of work

**Wave 1 — user-visible breakage, all small and independent.** ✅ **Landed:** C1
(`5faacf78`), H1 (`49967ea7`), H2 (`597fbc84`), H4 (`7ef25da6`), H7 (`c39b402c`), alongside
SEEKING.md P0 #1 (`a4a8fba6`). ⏸ **H3 remains** — blocked on adding
`POST /api/watch/progress` to the backend. None touched the seek path, so they landed
without conflict. Fixing H4's cleanup also resolved the **M15** compound leak; M15's own
countdown stutter is still open.

**Wave 2 — mobile and input.** ✅ **Landed:** H8 and H9 (`0f95a6d6`, `ded3be2c`). Both were
"touch was never wired up", and both are now Pointer Events with capture. H8 folded into the
SEEKING.md P0 #2 scrub rework as intended — there is now one shared drag *gesture*
(`useDragSeek`), though the two bars keep their own presentation; see D12.

This also closes cross-cutting pattern 1 below: there *is* a shared drag primitive now.
`LiveSeekBar` still has its own mouse+touch implementation and could adopt it.

**Wave 3 — correctness of the long tail.** ✅ **HIGH complete:** H10 (`53638e08`), H11
(`97228794`), H12 (`3553a595`), H14 (`db5b7de8`), H15 (`45b35894`). H13 is struck — nothing to do.
✅ **Started on MEDIUM:** M1 (`1626d26a`), M12 (`e0434fa5`), M13 (`a1877f6d`), M17 (`bd670b9a`).

⏸ **Still open in MEDIUM:** M2, M3, M5, M6, M7, M8, M9, M11, M14, M15, M16, M18, M19 — and the
whole LOW table except L1. None is user-visible breakage; they are leaks, staleness and hygiene.

**A note on testability.** H14 and H15 could not be tested through the DOM: happy-dom returns a
fresh `TextTrackList` and fresh `TextTrack` objects on every property access, so a `mode` written
in one read is invisible in the next and listeners attach to throwaway objects. Real browsers keep
those identities stable. H14's matcher was therefore extracted to a pure module and H15 tested
against a hand-rolled element — both faithful, but worth knowing before writing further
TextTrack tests here.

**Wave 4 — performance.** H5 (context split) is the biggest single win but touches every consumer,
so it wants its own change and a careful re-render measurement before and after.

LOW items are fine to batch whenever the surrounding file is being touched anyway. L1 is struck.

---

## Verification log (Phase 0)

Re-verified 2026-09-30. Every finding was re-opened at its cited line, the quoted evidence compared
against the tree, and the consequence re-traced adversarially — looking for anything already
preventing the described failure.

| Bucket | Total | ✅ CONFIRMED | ❌ WRONG | 🔶 stale location (within CONFIRMED) |
|---|---|---|---|---|
| CRITICAL | 1 | 1 | 0 | 0 |
| HIGH | 15 | 14 | 1 (H13) | 8 |
| MEDIUM | 19 | 17 | 2 (M4, M10) | 7 |
| LOW | 8 | 7 | 1 (L1) | 4 |
| **Total** | **43** | **39** | **4** | **19** |

**Deleted / struck out, with the reason recorded in place rather than removed:**

- **H13** — the `destroyed` flag and the shared `player` binding cover every execution ordering; the
  leak is unreachable.
- **M4** — the backend accepts `?_csrf=` as a documented `sendBeacon` fallback
  (`nightwatch-backend/src/app.ts:205-208`); no 403 occurs.
- **M10** — `WatchVODPlayer` is keyed `movieId-season-episode`, so it remounts every episode and the
  state does reset.
- **L1** — `27`/`28` are the correct codes in the installed dashjs 5.2.1.

**Severity changes:**

| # | Was | Now | Why |
|---|---|---|---|
| H2 | HIGH | MEDIUM | Discovery reliably repopulates `subtitleTracks`; the symptom is a transient window, not permanent loss |
| M8 | MEDIUM | LOW | The guard's real purpose is suppressing pre-playback saves; rewinding to exactly 0 is rare |
| M18 | MEDIUM | LOW | The `playbackRate >= SPEED_BOOST_RATE` early return means the second instance cannot double-dispatch |
| M19 | MEDIUM | LOW | HTTP-cache warming survives GC of the `Image`; only the decoded bitmap is lost |

**Claims inside otherwise-confirmed findings that were wrong, and are now corrected in place:**

- **M18** — "double-dispatches `SET_SPEED_BOOST`" does not happen.
- **H2** — "users see no subtitle options" overstates a transient window.
- **H4** — the suggested ref fix is aimed at a non-problem on the normal path; the real trigger is
  M15.
- **H5** — the consumer count was 22; it is 33 call sites across 26 files.

**Confirmed in code but with a runtime consequence not provable locally.** These need hardware or
affected content, and no fix for them should be reported as verified without it:

| # | What is missing |
|---|---|
| H1 | A Capacitor native build to observe the 20 s refetch |
| H6 | A Chromecast device |
| H15 | Multi-variant content with in-manifest WebVTT, to see hls.js swap the `TextTrack` |
| D4 (SEEKING) | A two-guest watch party on affected content, to see the loop entered |

**Findings that already have test coverage**, useful because the tests document current behaviour:
`WatchProgressService.test.ts` exercises M7's null case and asserts M8's `currentTime: 0 → null`;
`subtitle-settings.test.ts` documents L8's `_v` leak in comments. Nothing covers C1's overlay
deadlock, D9's timer race, H10's fetch race, H14 or H15 — `use-video-element.ts` and
`use-subtitle-overlay.ts` have no test files at all.

---

## Cross-cutting patterns

Four themes explain most of the list, and are worth fixing as patterns rather than one site at a
time:

1. **Touch was added late and unevenly.** `LiveSeekBar` handles it properly; `Volume` not at all
   (H9); `PlayerMobileSeekBar` handles it but unthrottled (H8). There is no shared drag primitive.
2. **`setTimeout` without a matching clear on the success path.** H1 is the damaging instance; M16
   and the countdown bugs are the same shape.
3. **Effects that depend on unstable callbacks.** M14 and M15 both come from putting a parent's
   inline arrow in a dependency array. The codebase already uses the latest-ref pattern elsewhere —
   it just is not applied consistently.
4. **Two owners for one piece of state.** The racing error owners in SEEKING.md, the duplicate
   Escape handlers (H11), the duplicate speed-boost instances (M18), and the dead subtitle-settings
   state (M12) are all the same mistake. Each new one is cheap to introduce because nothing marks
   which module owns what.
