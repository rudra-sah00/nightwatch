'use client';

import { useCallback, useEffect, useRef } from 'react';
import { SPEED_BOOST_HOLD_MS } from './usePlaybackSpeedBoost';

/** Movement (px) past which a touch is a swipe/scroll, not a long press. */
const MOVE_CANCEL_PX = 12;

/** Options for {@link useLongPressSpeedBoost}. */
interface UseLongPressSpeedBoostOptions {
  /** Raise playback; reports whether the gesture counts as a hold. */
  engageSpeedBoost: () => boolean;
  /** Restore the pre-boost rate. */
  releaseSpeedBoost: () => void;
  /** Gesture is only wired up when true (mobile / touch layouts). */
  enabled: boolean;
}

/**
 * YouTube-style long-press-to-speed-up for touch devices.
 *
 * Mirrors the Space-key behaviour: press and hold anywhere on the video for
 * {@link SPEED_BOOST_HOLD_MS} to get 2x, lift to go back to the previous speed.
 *
 * Returns touch handlers rather than attaching listeners itself so the caller keeps
 * control of which element owns the gesture, and so it composes with the existing
 * tap-to-seek zones instead of competing with them.
 *
 * A press that moves more than {@link MOVE_CANCEL_PX} is abandoned, so scrolling and
 * seek-drags never trigger a boost.
 *
 * @returns Handlers to spread onto the touch surface, plus `didBoost` so the caller can
 *   suppress a tap action that would otherwise fire on release.
 */
export function useLongPressSpeedBoost({
  engageSpeedBoost,
  releaseSpeedBoost,
  enabled,
}: UseLongPressSpeedBoostOptions) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  /** The press became a hold, so the caller must not treat its release as a tap. */
  const didBoostRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const end = useCallback(() => {
    clearTimer();
    startRef.current = null;
    releaseSpeedBoost();
  }, [clearTimer, releaseSpeedBoost]);

  // A touch that never reports an end (interrupted by a call, app backgrounding, or
  // unmount mid-press) must not leave playback pinned at 2x.
  const endRef = useRef(end);
  endRef.current = end;
  useEffect(() => {
    if (!enabled) return;
    const onInterrupt = () => endRef.current();
    window.addEventListener('blur', onInterrupt);
    document.addEventListener('visibilitychange', onInterrupt);
    return () => {
      window.removeEventListener('blur', onInterrupt);
      document.removeEventListener('visibilitychange', onInterrupt);
      endRef.current();
    };
  }, [enabled]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      // Multi-touch is a pinch/zoom, not a long press.
      if (e.touches.length !== 1) {
        end();
        return;
      }
      const touch = e.touches[0];
      startRef.current = { x: touch.clientX, y: touch.clientY };
      didBoostRef.current = false;
      clearTimer();
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        didBoostRef.current = engageSpeedBoost();
      }, SPEED_BOOST_HOLD_MS);
    },
    [enabled, clearTimer, engageSpeedBoost, end],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const start = startRef.current;
      if (!start || !holdTimerRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const moved =
        Math.abs(touch.clientX - start.x) > MOVE_CANCEL_PX ||
        Math.abs(touch.clientY - start.y) > MOVE_CANCEL_PX;
      // Became a swipe before the threshold — abandon, do not boost.
      if (moved) clearTimer();
    },
    [clearTimer],
  );

  const onTouchEnd = useCallback(() => {
    end();
  }, [end]);

  return {
    longPressHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
    /** Whether the press that just ended had engaged a boost. */
    didBoost: () => didBoostRef.current,
  };
}
