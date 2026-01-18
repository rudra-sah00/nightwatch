/**
 * Hook for managing skip indicator animation state
 */

import { useCallback, useRef, useState } from 'react';

export interface SkipIndicatorState {
  direction: 'forward' | 'backward';
  isActive: boolean;
}

interface UseSkipIndicatorReturn {
  skipIndicator: SkipIndicatorState | null;
  showSkipIndicator: (direction: 'forward' | 'backward') => void;
}

const ANIMATION_DURATION_MS = 600;

export function useSkipIndicator(): UseSkipIndicatorReturn {
  const [skipIndicator, setSkipIndicator] = useState<SkipIndicatorState | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showSkipIndicator = useCallback((direction: 'forward' | 'backward') => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Show indicator
    setSkipIndicator({ direction, isActive: true });

    // Hide after animation completes
    timeoutRef.current = setTimeout(() => {
      setSkipIndicator({ direction, isActive: false });
      timeoutRef.current = null;
    }, ANIMATION_DURATION_MS);
  }, []);

  return {
    skipIndicator,
    showSkipIndicator,
  };
}
