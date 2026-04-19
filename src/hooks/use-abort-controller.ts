'use client';

import { useCallback, useRef } from 'react';

/**
 * Shared hook that manages an AbortController for request cancellation.
 * Automatically aborts on unmount. Call `abort()` to cancel manually,
 * or `getSignal()` to get a fresh signal for a new request.
 */
export function useAbortController() {
  const ref = useRef<AbortController | null>(null);

  const getSignal = useCallback(() => {
    // Abort any in-flight request before starting a new one
    ref.current?.abort();
    ref.current = new AbortController();
    return ref.current.signal;
  }, []);

  const abort = useCallback(() => {
    ref.current?.abort();
    ref.current = null;
  }, []);

  return { getSignal, abort };
}
