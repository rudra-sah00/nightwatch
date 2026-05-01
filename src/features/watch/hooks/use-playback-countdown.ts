'use client';

import { useEffect, useState } from 'react';

/**
 * Drives a 3-2-1 countdown timer for the playback countdown overlay.
 *
 * Locks body scroll during the countdown and calls `onComplete` 500 ms
 * after the counter reaches zero.
 *
 * @param onComplete - Callback invoked when the countdown finishes.
 * @returns Current count (3→0) and progress percentage (100→0).
 */
export function usePlaybackCountdown(onComplete: () => void) {
  const [count, setCount] = useState(3);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    if (count <= 0) {
      const finalTimeout = setTimeout(() => {
        document.body.style.overflow = originalStyle;
        onComplete();
      }, 500);
      return () => clearTimeout(finalTimeout);
    }

    const timer = setInterval(() => {
      setCount((prev) => prev - 1);
    }, 1000);

    const progressTimer = setInterval(() => {
      setProgress((p) => Math.max(0, p - 100 / 30));
    }, 100);

    return () => {
      clearInterval(timer);
      clearInterval(progressTimer);
      document.body.style.overflow = originalStyle;
    };
  }, [count, onComplete]);

  return { count, progress };
}
