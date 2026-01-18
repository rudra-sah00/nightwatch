/**
 * Hook for detecting double-tap gestures (YouTube-style)
 * Used for seek on sides, play/pause in center
 */

import type React from 'react';
import { useCallback, useRef } from 'react';

export interface TapPosition {
  relativeX: number; // 0-1 position from left
}

export interface DoubleTapHandlers {
  onSingleTap?: (position: TapPosition) => void;
  onDoubleTapLeft?: () => void;
  onDoubleTapCenter?: () => void;
  onDoubleTapRight?: () => void;
}

interface UseDoubleTapReturn {
  handleTap: (e: React.MouseEvent | React.TouchEvent) => void;
}

// Threshold for left/right zones (33% from each edge)
const LEFT_ZONE = 0.33;
const RIGHT_ZONE = 0.67;

// Delay for double-tap detection
const DOUBLE_TAP_DELAY_MS = 300;

export function useDoubleTap(handlers: DoubleTapHandlers): UseDoubleTapReturn {
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const now = Date.now();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const clientX = 'touches' in e ? e.changedTouches[0].clientX : e.clientX;
      const relativeX = (clientX - rect.left) / rect.width;

      // Check for double tap
      if (lastTapRef.current && now - lastTapRef.current.time < DOUBLE_TAP_DELAY_MS) {
        // Double tap detected - clear pending single tap
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }

        // Determine zone and call appropriate handler
        if (relativeX < LEFT_ZONE) {
          handlers.onDoubleTapLeft?.();
        } else if (relativeX > RIGHT_ZONE) {
          handlers.onDoubleTapRight?.();
        } else {
          handlers.onDoubleTapCenter?.();
        }

        lastTapRef.current = null;
      } else {
        // First tap - wait to see if it's a double tap
        lastTapRef.current = { time: now, x: relativeX };

        tapTimeoutRef.current = setTimeout(() => {
          // Single tap - call handler with position
          handlers.onSingleTap?.({ relativeX });
          lastTapRef.current = null;
        }, DOUBLE_TAP_DELAY_MS);
      }
    },
    [handlers]
  );

  return { handleTap };
}
