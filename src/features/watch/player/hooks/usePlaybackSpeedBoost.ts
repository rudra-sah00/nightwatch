'use client';

import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type { PlayerAction } from '../context/types';

/** Rate applied while a speed-boost gesture is held. */
export const SPEED_BOOST_RATE = 2;

/**
 * How long a gesture must be held before it counts as a hold rather than a tap.
 *
 * Shared by the Space key and the mobile long-press so both feel the same.
 */
export const SPEED_BOOST_HOLD_MS = 250;

/** Options for {@link usePlaybackSpeedBoost}. */
interface UsePlaybackSpeedBoostOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  dispatch: React.Dispatch<PlayerAction>;
  /** Read-only viewers (watch party guests) cannot change playback. */
  disabled?: boolean;
  /** Live streams drive their own catch-up rate, which a manual 2x would fight. */
  isLive?: boolean;
  /** Feature switch — watch parties broadcast every `ratechange` to the room. */
  allowSpeedBoost?: boolean;
}

/**
 * Transient hold-to-speed-up, shared by every input that can trigger it.
 *
 * Owns the rules in one place so the Space key and the mobile long-press cannot drift:
 * never boost a paused video, never touch a rate that is already at or above
 * {@link SPEED_BOOST_RATE}, and always restore exactly the rate the user had.
 *
 * The rate is written straight to the media element and deliberately **not** dispatched
 * as `SET_PLAYBACK_RATE`. The boost is temporary, so the settings menu keeps showing the
 * speed the user actually chose — which is what they get back on release.
 *
 * @returns `engageSpeedBoost` (reports whether the gesture counts as a hold) and
 *   `releaseSpeedBoost` (safe to call when nothing is engaged).
 */
export function usePlaybackSpeedBoost({
  videoRef,
  dispatch,
  disabled = false,
  isLive = false,
  allowSpeedBoost = true,
}: UsePlaybackSpeedBoostOptions) {
  /** Rate to restore; non-null only while we are actually holding the rate up. */
  const restoreRateRef = useRef<number | null>(null);

  /**
   * Try to raise playback to the boost rate.
   *
   * @returns `true` when the gesture should be treated as a hold — meaning the caller
   *   must NOT also fire its tap action (play/pause) on release. Returns `false` when
   *   boosting is impossible, so a hold degrades gracefully into a tap: holding on a
   *   paused video should still start playback rather than doing nothing.
   */
  const engageSpeedBoost = useCallback((): boolean => {
    if (disabled || isLive || !allowSpeedBoost) return false;

    const video = videoRef.current;
    if (!video || video.paused) return false;

    // Already fast enough — treat it as a hold (so release does not pause) but leave
    // the user's chosen speed untouched.
    if (video.playbackRate >= SPEED_BOOST_RATE) return true;

    // Guard against a second engage before release, which would record 2 as the
    // "previous" rate and strand playback at 2x.
    if (restoreRateRef.current === null) {
      restoreRateRef.current = video.playbackRate;
    }
    video.playbackRate = SPEED_BOOST_RATE;
    dispatch({ type: 'SET_SPEED_BOOST', isSpeedBoosted: true });
    return true;
  }, [videoRef, dispatch, disabled, isLive, allowSpeedBoost]);

  /** Restore the pre-boost rate. No-op when no boost is active. */
  const releaseSpeedBoost = useCallback(() => {
    const restore = restoreRateRef.current;
    if (restore === null) return;
    restoreRateRef.current = null;
    const video = videoRef.current;
    if (video) video.playbackRate = restore;
    dispatch({ type: 'SET_SPEED_BOOST', isSpeedBoosted: false });
  }, [videoRef, dispatch]);

  // Unmounting mid-hold must not leave a shared media element pinned at 2x.
  const releaseRef = useRef(releaseSpeedBoost);
  releaseRef.current = releaseSpeedBoost;
  useEffect(() => {
    return () => releaseRef.current();
  }, []);

  return { engageSpeedBoost, releaseSpeedBoost };
}
