'use client';

import { useEffect, useState } from 'react';

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
