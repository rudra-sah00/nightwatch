'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Press-and-hold gesture for a button.
 *
 * Uses Pointer Events so mouse, touch and pen all take the same path — the
 * older touch-only variant in the navbar does nothing on a laptop.
 *
 * Exposes `isPressing` rather than a per-frame progress value so callers can
 * drive hold feedback with a CSS animation instead of re-rendering ~60x/second.
 */

export const DEFAULT_LONG_PRESS_MS = 600;

interface UseLongPressOptions {
  /** Fired once the hold threshold is reached. */
  onLongPress: () => void;
  /** Fired on a normal short press. Suppressed when a long press fired. */
  onClick?: () => void;
  delay?: number;
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = DEFAULT_LONG_PRESS_MS,
}: UseLongPressOptions) {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set when the threshold fires, so the click that follows a hold is ignored.
  const firedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // A hold that outlives the component must not fire into a unmounted tree.
  useEffect(() => clearTimer, [clearTimer]);

  const start = useCallback(() => {
    firedRef.current = false;
    setIsPressing(true);
    clearTimer();
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      setIsPressing(false);
      timerRef.current = null;
      onLongPress();
    }, delay);
  }, [clearTimer, delay, onLongPress]);

  const cancel = useCallback(() => {
    clearTimer();
    setIsPressing(false);
  }, [clearTimer]);

  const handleClick = useCallback(() => {
    if (firedRef.current) {
      // Swallow the click synthesised after a completed hold.
      firedRef.current = false;
      return;
    }
    onClick?.();
  }, [onClick]);

  return {
    isPressing,
    handlers: {
      onPointerDown: start,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onClick: handleClick,
    },
  };
}
