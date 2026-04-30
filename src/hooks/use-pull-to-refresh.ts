'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';
import { hapticMedium } from '@/lib/haptics';

const THRESHOLD = 80;
const MAX_PULL = 120;

/**
 * Pull-to-refresh for mobile. Attach `ref` to the scrollable container.
 * Only triggers when the container is scrolled to the very top.
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const ref = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const wasAtTop = useRef(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    hapticMedium();
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!checkIsMobile()) return;
    const el = ref.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only allow pull if already at the very top when touch begins
      wasAtTop.current = el.scrollTop <= 0;
      if (wasAtTop.current && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        pulling.current = false; // Don't start pulling yet
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!wasAtTop.current || isRefreshing) return;
      // Re-check scrollTop — if user scrolled down since touchstart, abort
      if (el.scrollTop > 0) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 5) {
        // Only start pulling after a clear downward gesture from the top
        pulling.current = true;
        setPullDistance(Math.min(dy * 0.4, MAX_PULL));
        e.preventDefault();
      } else if (dy < -5) {
        // Scrolling up — cancel
        pulling.current = false;
        wasAtTop.current = false;
        setPullDistance(0);
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) {
        setPullDistance(0);
        return;
      }
      pulling.current = false;
      wasAtTop.current = false;
      if (pullDistance >= THRESHOLD) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [isRefreshing, pullDistance, handleRefresh]);

  return { ref, isRefreshing, pullDistance };
}
