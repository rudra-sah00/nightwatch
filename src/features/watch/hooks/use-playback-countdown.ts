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
      /*
        The restore has to happen here as well as inside the timeout. Unmounting during
        this 500 ms window — back navigation, a route change, the parent hiding the
        countdown — cancels the timeout, and without this line `overflow: hidden` stayed
        on `<body>`, leaving every subsequent page in the SPA session unscrollable until
        a full reload.

        It also keeps `originalStyle` honest across re-runs. Each run captures
        `getComputedStyle(document.body).overflow`, and React runs the previous
        cleanup before the next effect body — so as long as every branch restores,
        the next capture sees the real original. When this branch skipped the restore,
        a re-run inside the window (see the `onComplete` dependency) captured 'hidden'
        as the original and the timeout then "restored" the lock permanently.
      */
      return () => {
        clearTimeout(finalTimeout);
        document.body.style.overflow = originalStyle;
      };
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
