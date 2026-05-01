'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';
import { hapticMedium } from '@/lib/haptics';

const THRESHOLD = 80;
const MAX_PULL = 120;
// How long after a scroll event before we consider the scroll "settled"
const SCROLL_SETTLE_MS = 300;

/**
 * Pull-to-refresh for mobile.
 *
 * Key insight: only allow refresh when the user places their finger on a
 * container that is ALREADY at rest at scrollTop 0. If any scroll event
 * fired in the last 300ms, the container has momentum and we block refresh
 * for the entire touch gesture.
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const ref = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pulling = useRef(false);
  const blocked = useRef(false);
  const startY = useRef(0);
  const lastScrollTime = useRef(0);

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

    const onScroll = () => {
      lastScrollTime.current = Date.now();
      // If scrolling happened while pulling, cancel the pull
      if (pulling.current) {
        pulling.current = false;
        blocked.current = true;
        setPullDistance(0);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;
      startY.current = e.touches[0].clientY;
      pulling.current = false;

      // Block if: not at top, or scroll momentum is still active
      const hasRecentScroll =
        Date.now() - lastScrollTime.current < SCROLL_SETTLE_MS;
      blocked.current = el.scrollTop > 0 || hasRecentScroll;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (blocked.current || isRefreshing) return;

      // Double-check: if container scrolled away from top, block
      if (el.scrollTop > 0) {
        blocked.current = true;
        pulling.current = false;
        setPullDistance(0);
        return;
      }

      const dy = e.touches[0].clientY - startY.current;
      if (dy > 10) {
        pulling.current = true;
        setPullDistance(Math.min((dy - 10) * 0.4, MAX_PULL));
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) {
        setPullDistance(0);
        return;
      }
      pulling.current = false;
      if (pullDistance >= THRESHOLD) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [isRefreshing, pullDistance, handleRefresh]);

  return { ref, isRefreshing, pullDistance };
}
