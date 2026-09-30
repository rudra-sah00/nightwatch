'use client';

import { type RefObject, useCallback, useEffect, useRef } from 'react';

/** Options for {@link useSeekController}. */
interface UseSeekControllerOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Clamp against the DVR window rather than `duration`. */
  isLive?: boolean;
  /** When true, every seek is a no-op (watch-party guests, read-only players). */
  disabled?: boolean;
}

/**
 * How long to wait for a `seeked` event before assuming it will never arrive.
 *
 * The serialisation below is gated on `seeked`, so a seek that never completes would
 * strand every later one. A stalled seek on a slow network can legitimately take a couple
 * of seconds, and the browser drops `seeked` altogether if the source is replaced
 * mid-seek, which the engine's quality switches and reload recovery both do.
 */
const SEEK_SETTLE_TIMEOUT_MS = 3000;

/**
 * The single owner of "move the playhead".
 *
 * Eight sites used to assign `video.currentTime`, under two incompatible conventions —
 * `playerHandlers.seek` absolute, `playerHandlers.skip` and `useKeyboard.seek` relative —
 * so every new control reinvented seeking and inherited whichever bug its author did not
 * know about. Fixing one call site fixed one control and left the others.
 *
 * Three rules, applied once here instead of being re-derived per control:
 *
 * **Relative offsets come off the live element, never React state.** `SET_TIME` is
 * dispatched from `timeupdate`, which fires about every 250 ms, so three taps inside one
 * window all read the same base and all target `+10`: the user travelled 10 s instead of
 * 30 s while paying for three seeks. Reading `video.currentTime` makes skips accumulate.
 *
 * **Targets are clamped against the live bounds.** VOD against `duration`; live against
 * `seekable` — the DVR window slides as segments land, so a target computed from a stale
 * copy of it can land outside and make hls.js snap the playhead somewhere unexpected.
 *
 * **One seek in flight, chasing the latest target.** Nothing previously waited for
 * `seeked` before issuing the next seek. That contradicts HTML5 semantics and every
 * platform's guidance — Apple's QA1820 is explicit that seeks in rapid succession cancel
 * each other, "resulting in a lot of seeking and not a lot of displaying of the target
 * frames" — and on MSE intermediate `seeked` events are coalesced anyway, so the work done
 * for every seek but the last is wasted while still aborting fragments in flight and
 * re-priming the buffer. Requests arriving during a seek therefore overwrite a single
 * pending target rather than queueing: the user wants the newest position, not a tour of
 * the ones they passed through.
 *
 * @returns `seekTo` (absolute) and `seekBy` (relative). Both clamp, both serialise.
 */
export function useSeekController({
  videoRef,
  isLive = false,
  disabled = false,
}: UseSeekControllerOptions) {
  /** A seek has been issued and its `seeked` has not arrived yet. */
  const inFlightRef = useRef(false);
  /** Newest target requested while a seek was in flight, or null. */
  const pendingTargetRef = useRef<number | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Clamps a target into the range the element can actually seek within.
   *
   * @returns The clamped time, or null when the range is not known yet — seeking into an
   *   unloaded element silently fails, so callers should do nothing rather than guess.
   */
  const clamp = useCallback(
    (video: HTMLVideoElement, target: number): number | null => {
      if (!Number.isFinite(target)) return null;

      if (isLive) {
        // The DVR window, read fresh: it slides forward as segments land.
        const src = video.seekable.length > 0 ? video.seekable : video.buffered;
        if (!src.length) return null;
        const start = src.start(0);
        const end = src.end(src.length - 1);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
        return Math.max(start, Math.min(end, target));
      }

      if (!Number.isFinite(video.duration)) return null;
      return Math.max(0, Math.min(video.duration, target));
    },
    [isLive],
  );

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  /** Assigns `currentTime` and opens the in-flight window. */
  const commit = useCallback(
    (video: HTMLVideoElement, target: number) => {
      inFlightRef.current = true;
      clearSettleTimer();
      settleTimerRef.current = setTimeout(() => {
        // `seeked` never came. Release the gate so later seeks are not stranded.
        settleTimerRef.current = null;
        inFlightRef.current = false;
        const pending = pendingTargetRef.current;
        pendingTargetRef.current = null;
        if (pending !== null) {
          const v = videoRef.current;
          if (v) commit(v, pending);
        }
      }, SEEK_SETTLE_TIMEOUT_MS);
      video.currentTime = target;
    },
    [videoRef, clearSettleTimer],
  );

  /** Seek to an absolute time, in seconds. */
  const seekTo = useCallback(
    (time: number) => {
      if (disabled) return;
      const video = videoRef.current;
      if (!video) return;

      const target = clamp(video, time);
      if (target === null) return;

      if (inFlightRef.current) {
        // Chase the latest: overwrite rather than queue.
        pendingTargetRef.current = target;
        return;
      }
      commit(video, target);
    },
    [disabled, videoRef, clamp, commit],
  );

  /**
   * Seek by an offset in seconds, positive or negative.
   *
   * The base is the pending target when one exists, so rapid presses accumulate instead of
   * all measuring from the same position — three quick taps of +10 travel 30 s.
   */
  const seekBy = useCallback(
    (seconds: number) => {
      if (disabled) return;
      const video = videoRef.current;
      if (!video) return;
      if (!Number.isFinite(seconds)) return;

      const base =
        pendingTargetRef.current ??
        (Number.isFinite(video.currentTime) ? video.currentTime : null);
      if (base === null) return;

      seekTo(base + seconds);
    },
    [disabled, videoRef, seekTo],
  );

  // Close the in-flight window when the element reports the seek finished, and release any
  // target that arrived while it was open.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onSeeked = () => {
      clearSettleTimer();
      inFlightRef.current = false;
      const pending = pendingTargetRef.current;
      pendingTargetRef.current = null;
      if (pending === null) return;
      // Already where the pending target asked for; nothing to do.
      if (Math.abs(video.currentTime - pending) < 0.01) return;
      const target = clamp(video, pending);
      if (target === null) return;
      commit(video, target);
    };

    video.addEventListener('seeked', onSeeked);
    return () => {
      video.removeEventListener('seeked', onSeeked);
      clearSettleTimer();
    };
  }, [videoRef, clamp, commit, clearSettleTimer]);

  return { seekTo, seekBy };
}
