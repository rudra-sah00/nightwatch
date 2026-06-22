'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Tracks user inactivity on TV. Returns `isIdle` flag.
 * Resets on any keydown event.
 */
export function useTvIdle() {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const reset = useCallback(() => {
    setIsIdle(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsIdle(true), IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    reset();
    document.addEventListener('keydown', reset);
    return () => {
      clearTimeout(timerRef.current);
      document.removeEventListener('keydown', reset);
    };
  }, [reset]);

  return isIdle;
}
