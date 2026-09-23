import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type { PartyStateUpdate } from '../types';

interface PartyPlaybackState {
  isPlaying: boolean;
  videoTime: number; // Position at last event
  serverTime: number; // Server timestamp of last event
  playbackRate: number;
}

/**
 * Window, in seconds, kept clear of the ends of the seekable range.
 *
 * A live HLS playlist slides: the segment that was the live edge a moment ago is
 * dropped from the manifest, so `seekable.end` is a moving target. Landing
 * exactly on it stalls, because there is nothing after it to buffer.
 */
const SEEKABLE_MARGIN_S = 1.5;

/**
 * Event that fires on the DOM CustomEvent bus when the browser refuses playback.
 *
 * Refusal is a local browser policy decision, not party state, and the component
 * that needs to react to it (`PlayerOverlays`, which owns the guest's centre
 * overlay) is neither a parent nor a child of the hook that discovers it. A
 * window event keeps the two from having to be threaded together through
 * `useWatchPartyClient`, `ActiveWatchParty` and `WatchPartyVideoArea`.
 *
 * `detail.muted` reports whether the muted retry succeeded, so the UI can ask
 * for a tap to unmute rather than a tap to play.
 */
export const PARTY_PLAYBACK_BLOCKED_EVENT = 'party:playback-blocked';

/** Payload of {@link PARTY_PLAYBACK_BLOCKED_EVENT}. */
export interface PartyPlaybackBlockedDetail {
  /** True when playback did start, but only because we muted it. */
  muted: boolean;
}

/**
 * Element events that mean "you can act on the playhead now".
 *
 * All four, because they do not fire in a fixed order or a fixed set across
 * engines: hls.js appends a buffer and the element raises `loadedmetadata` then
 * `canplay`, native HLS on Safari can reach `canplay` without a useful
 * `durationchange`, and a live stream's duration keeps moving. Subscribing to all
 * of them and re-checking `readyState` is cheaper than reasoning about which one
 * a given platform will send.
 */
const READINESS_EVENTS = [
  'loadedmetadata',
  'loadeddata',
  'canplay',
  'durationchange',
] as const;

/**
 * Clamp a target position into the range the element can actually seek to.
 *
 * Assigning `currentTime` outside `video.seekable` does not throw — it silently
 * stalls, which is the worst possible failure for a party because nothing
 * downstream can tell the difference between "waiting to buffer" and "asked for
 * a position that does not exist". Live streams make this routine: each client
 * holds its own sliding window, so the host's position is frequently outside the
 * guest's.
 *
 * Three outcomes, and the distinction between the last two matters:
 * - a usable range: the target, clamped into it;
 * - no range REPORTED (`seekable` absent, as in a non-browser environment): the
 *   target unchanged, because an unknown window is not a reason to refuse a seek;
 * - a range reported as EMPTY: `null`, meaning do not seek — the element is
 *   telling us there is nowhere to seek to.
 *
 * @param video - The element being corrected.
 * @param target - Desired position in seconds.
 */
function clampToSeekable(
  video: HTMLVideoElement,
  target: number,
): number | null {
  const ranges = video.seekable;
  if (!ranges || typeof ranges.length !== 'number') return target;
  if (ranges.length === 0) return null;

  const start = ranges.start(0);
  const end = ranges.end(ranges.length - 1);
  if (!(Number.isFinite(start) && Number.isFinite(end)) || end <= start) {
    return null;
  }

  const margin = Math.min(SEEKABLE_MARGIN_S, (end - start) / 2);
  return Math.min(Math.max(target, start), end - margin);
}

/**
 * Start playback, recovering from the browser refusing it.
 *
 * `video.play()` rejects with `NotAllowedError` whenever the document has no
 * user activation — which is the normal state for someone who opened an invite
 * link and was approved without ever clicking inside the page. Every call site
 * in the party used to swallow that rejection, and because the guest's centre
 * overlay is deliberately inert (`disabled`, so a guest cannot drive the party),
 * there was then no way — automatic or manual — to ever start the video. The
 * guest saw the "Host controls playback" lock over a black frame for the rest of
 * the session.
 *
 * Muted playback is exempt from the policy in every browser that implements it,
 * so the refusal is retried muted. That trades silence for a picture, and the UI
 * is told so it can offer one tap to restore sound.
 *
 * @param video - Element to start.
 */
function playWithAutoplayRecovery(video: HTMLVideoElement): void {
  video.play().catch((err: unknown) => {
    const name = (err as { name?: string } | null)?.name;
    if (name !== 'NotAllowedError') return;

    // `muted` is independent of `volume`, so clearing it later restores the
    // viewer's own level without us having to remember it.
    video.muted = true;
    video
      .play()
      .then(() => {
        notifyPlaybackBlocked(true);
      })
      .catch(() => {
        // Even muted playback was refused. Nothing left but to ask for a tap.
        video.muted = false;
        notifyPlaybackBlocked(false);
      });
  });
}

/** Announce a refusal on the window bus. See {@link PARTY_PLAYBACK_BLOCKED_EVENT}. */
function notifyPlaybackBlocked(muted: boolean): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<PartyPlaybackBlockedDetail>(PARTY_PLAYBACK_BLOCKED_EVENT, {
      detail: { muted },
    }),
  );
}

/**
 * Predictive synchronisation hook for watch party video playback.
 *
 * Uses NTP-style clock offset to calculate the expected video position
 * based on the host's authoritative state, then applies graduated drift
 * correction (hard seek > ±15% rate > ±5% rate > normal) to keep all
 * participants in sync. Enforces play/pause state every 2 s.
 *
 * @param videoRef - Ref to the `<video>` element.
 * @param clockOffset - Millisecond offset between local clock and server.
 * @param isCalibrated - Whether the clock offset has been calibrated.
 * @param isLive - When `true`, skips time-based seeking (HLS live).
 * @param isHost - Host is the source of truth and is never corrected.
 * @returns `applyState` to process incoming state updates and `getExpectedTime`.
 */
export function usePredictiveSync(
  videoRef: RefObject<HTMLVideoElement | null>,
  clockOffset: number,
  isCalibrated: boolean,
  isLive = false,
  isHost = false,
) {
  const stateRef = useRef<PartyPlaybackState | null>(null);
  /**
   * The last state update that could not be applied because the element was not
   * ready. Held until it IS applied — see the effect that listens for readiness.
   */
  const pendingUpdateRef = useRef<PartyStateUpdate | null>(null);
  const clockOffsetRef = useRef(clockOffset);
  clockOffsetRef.current = clockOffset;

  // Calculate expected video position based on server time
  const getExpectedTime = useCallback(() => {
    const state = stateRef.current;
    if (!state) return 0;
    if (!state.isPlaying) return state.videoTime;

    // serverNow = localNow + offset
    const serverNow = Date.now() + clockOffsetRef.current;
    const elapsed = (serverNow - state.serverTime) / 1000;
    return state.videoTime + elapsed * state.playbackRate;
  }, []);

  /**
   * Move the playhead, but only somewhere it can actually go.
   *
   * See {@link clampToSeekable} — an out-of-range assignment stalls silently.
   */
  const seekTo = useCallback((video: HTMLVideoElement, target: number) => {
    const safe = clampToSeekable(video, target);
    if (safe === null) return;
    video.currentTime = safe;
  }, []);

  // Apply state update from server
  const applyState = useCallback(
    (update: PartyStateUpdate) => {
      const video = videoRef.current;
      if (!video || video.readyState < 1) {
        // Element not mounted, or mounted with no metadata yet. Keep the update;
        // the readiness effect below applies it as soon as the element can take
        // it. Deliberately NOT discarded on a timer: a live channel served
        // through the playlist proxy can take longer to produce its first frame
        // than any deadline worth setting, and the state this carries may be the
        // only one a guest ever receives.
        pendingUpdateRef.current = update;
        return;
      }
      pendingUpdateRef.current = null;

      // Construct authoritative state
      // Use serverTime provided in update, or fallback to timestamp
      // If update comes from host event, it should have accurate videoTime and serverTime
      const newState: PartyPlaybackState = {
        isPlaying: update.isPlaying,
        videoTime: update.videoTime ?? update.currentTime,
        serverTime: update.serverTime ?? update.timestamp,
        playbackRate: update.playbackRate ?? 1,
      };

      stateRef.current = newState;

      // Livestreams: never seek — HLS live buffer is per-client and seeking
      // to a remote currentTime causes stalls/buffering. Only sync play/pause.
      if (isLive) {
        if (newState.isPlaying && video.paused) {
          playWithAutoplayRecovery(video);
        }
        if (newState.isPlaying === false && !video.paused) video.pause();
        return;
      }

      // If clock not calibrated yet, we can't use NTP-style offset, but we can
      // still compensate for elapsed playback time using serverTime vs timestamp.
      // serverTime = when the server sent this response (Date.now() on server)
      // timestamp  = when the state was last updated (lastUpdated in Redis)
      // The video has been playing for (serverTime - timestamp) ms since the last event.
      if (!isCalibrated) {
        let targetTime = newState.videoTime;
        if (newState.isPlaying && update.serverTime && update.timestamp) {
          const elapsed = (update.serverTime - update.timestamp) / 1000;
          if (elapsed > 0 && elapsed < 7200) {
            // Sanity: max 2 hours
            targetTime += elapsed * newState.playbackRate;
          }
        }
        if (Math.abs(video.currentTime - targetTime) > 0.5) {
          seekTo(video, targetTime);
        }
        if (newState.isPlaying && video.paused) {
          playWithAutoplayRecovery(video);
        }
        if (newState.isPlaying === false && !video.paused) video.pause();
        video.playbackRate = newState.playbackRate;
        return;
      }

      const expectedTime = getExpectedTime();
      const drift = expectedTime - video.currentTime;

      // Handle Play/Pause State Sync immediately
      if (newState.isPlaying && video.paused) {
        playWithAutoplayRecovery(video);
      } else if (newState.isPlaying === false && !video.paused) {
        video.pause();
      }

      // Handle Seek / Drift
      // If drift is huge (> 2s), it's likely a seek or user fell way behind
      if (Math.abs(drift) > 2.0) {
        seekTo(video, expectedTime);
        video.playbackRate = newState.playbackRate;
      } else if (Math.abs(drift) > 0.5) {
        // Large soft drift: ±15% correction — closes 1.5s gap in ~10 seconds
        // Old ±5% took 36 seconds which almost never converges before next event
        const correctionRate =
          drift > 0
            ? newState.playbackRate * 1.15 // +15% to catch up
            : newState.playbackRate * 0.85; // -15% to slow down
        video.playbackRate = correctionRate;
      } else if (Math.abs(drift) > 0.2) {
        // Fine drift: ±5% for smooth finish
        const correctionRate =
          drift > 0
            ? newState.playbackRate * 1.05
            : newState.playbackRate * 0.95;
        video.playbackRate = correctionRate;
      } else {
        // Within tolerance: restore normal rate
        if (video.playbackRate !== newState.playbackRate) {
          video.playbackRate = newState.playbackRate;
        }
      }
    },
    [videoRef, getExpectedTime, isCalibrated, isLive, seekTo],
  );

  /*
    Apply a held update as soon as the element can take it.

    Driven by the element's own readiness events rather than a polling window.
    The previous version polled every 250 ms and gave up after 10 s, on the
    reasoning that "reconnection sync timers will handle it by then" — but there
    are none for a guest that has never had state. When the deadline passed,
    `stateRef` was still null, which also disables the enforcement interval
    below (it returns early without state), so the guest was left with a paused
    video, no state, and nothing that would ever set either. A live channel going
    through the backend playlist proxy — resolve upstream, fetch, rewrite, then
    fetch a segment — routinely misses a 10 s window on a cold cache.

    The poll is kept as a slow backstop for the case where the ELEMENT is not
    mounted yet, since an element that does not exist cannot emit events.
  */
  useEffect(() => {
    if (isHost) return; // Host doesn't receive state updates

    let bound: HTMLVideoElement | null = null;

    const flush = () => {
      const update = pendingUpdateRef.current;
      const video = videoRef.current;
      if (!update || !video || video.readyState < 1) return;
      applyState(update);
    };

    const bind = (video: HTMLVideoElement) => {
      if (bound === video) return;
      unbind();
      // Flush once regardless — an element that cannot be subscribed to (a
      // non-DOM stand-in) must still get any held update applied.
      if (typeof video.addEventListener !== 'function') {
        flush();
        return;
      }
      bound = video;
      for (const type of READINESS_EVENTS) {
        video.addEventListener(type, flush);
      }
      flush();
    };

    const unbind = () => {
      if (!bound) return;
      if (typeof bound.removeEventListener === 'function') {
        for (const type of READINESS_EVENTS) {
          bound.removeEventListener(type, flush);
        }
      }
      bound = null;
    };

    // The player mounts and remounts its <video> independently of this hook
    // (episode changes, engine rebuilds after a decode error), so rebind rather
    // than resolving the element once.
    const rebind = setInterval(() => {
      const video = videoRef.current;
      if (video) bind(video);
      else unbind();
    }, 500);

    const initial = videoRef.current;
    if (initial) bind(initial);

    return () => {
      clearInterval(rebind);
      unbind();
    };
  }, [applyState, videoRef, isHost]);

  // Periodic state enforcement & drift check (every 2s)
  useEffect(() => {
    if (isHost) return; // Host is the source of truth, no drift correction needed
    const interval = setInterval(() => {
      const video = videoRef.current;
      const state = stateRef.current;
      if (!video || !state) return;

      // If user's browser auto-paused (e.g. background tab / lost focus on dual monitor)
      // but the party is officially playing, fiercely force it back to play.
      if (state.isPlaying && video.paused) {
        playWithAutoplayRecovery(video);
      }

      // Conversely, enforce pause state
      if (!state.isPlaying && !video.paused) {
        video.pause();
      }

      // Skip actual time-drift correction for livestreams or uncalibrated VOD or if paused
      if (!state.isPlaying || !isCalibrated || isLive) return;

      const expected = getExpectedTime();
      const actual = video.currentTime;
      const drift = expected - actual;

      if (Math.abs(drift) > 2.0) {
        // Hard seek if way off
        const safe = clampToSeekable(video, expected);
        if (safe !== null) video.currentTime = safe;
        video.playbackRate = state.playbackRate;
      } else if (Math.abs(drift) > 0.5) {
        // Large soft drift: ±15% — converges in ~10s
        const correctionRate =
          drift > 0 ? state.playbackRate * 1.15 : state.playbackRate * 0.85;
        video.playbackRate = correctionRate;
      } else if (Math.abs(drift) > 0.2) {
        // Fine drift: ±5% smooth finish
        const correctionRate =
          drift > 0 ? state.playbackRate * 1.05 : state.playbackRate * 0.95;
        video.playbackRate = correctionRate;
      } else {
        // Drift resolved: restore normal rate
        if (Math.abs(video.playbackRate - state.playbackRate) > 0.01) {
          video.playbackRate = state.playbackRate;
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [videoRef, getExpectedTime, isCalibrated, isLive, isHost]);

  return { applyState, getExpectedTime };
}
