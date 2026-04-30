'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';
import { hapticMedium } from '@/lib/haptics';

const THRESHOLD = 80;
const MAX_PULL = 120;

/**
 * Pull-to-refresh for mobile.
 * Only activates when:
 * 1. The container scrollTop is 0
 * 2. The user is pulling DOWN (not scrolling up to reach top)
 * 3. No scroll happened in the last 200ms (no momentum)
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const ref = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pulling = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);
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
    };

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;
      startY.current = e.touches[0].clientY;
      startScrollTop.current = el.scrollTop;
      pulling.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isRefreshing) return;

      const currentScrollTop = el.scrollTop;
      const dy = e.touches[0].clientY - startY.current;

      // If the container is not at the top, let normal scroll happen
      if (currentScrollTop > 0) {
        if (pulling.current) {
          pulling.current = false;
          setPullDistance(0);
        }
        return;
      }

      // Container is at top. But did we ARRIVE here by scrolling up?
      // If touch started when scrollTop > 0, user was scrolling up — don't pull
      if (startScrollTop.current > 5) {
        return;
      }

      // If there was a scroll event in the last 200ms, momentum is still going
      if (
        Date.now() - lastScrollTime.current < 200 &&
        startScrollTop.current > 0
      ) {
        return;
      }

      // Only pull if finger is moving DOWN
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
