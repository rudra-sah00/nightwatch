'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';
import { hapticMedium } from '@/lib/haptics';

const THRESHOLD = 80; // px to pull before triggering refresh
const MAX_PULL = 120;

/**
 * Pull-to-refresh for mobile. Attach `ref` to the scrollable container.
 * Returns `{ ref, isRefreshing, pullDistance }`.
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const ref = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

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
      if (el.scrollTop <= 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || isRefreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        setPullDistance(Math.min(dy * 0.5, MAX_PULL));
        if (dy > 10) e.preventDefault();
      } else {
        pulling.current = false;
        setPullDistance(0);
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
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
