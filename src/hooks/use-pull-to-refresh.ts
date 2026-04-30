'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkIsMobile } from '@/lib/electron-bridge';
import { hapticMedium } from '@/lib/haptics';

const THRESHOLD = 80;
const MAX_PULL = 120;

/**
 * Pull-to-refresh for mobile. Attach `ref` to the scrollable container.
 * Only triggers when the container is fully at rest at the top (scrollTop === 0)
 * and the user pulls down deliberately.
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const ref = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const scrollWasZero = useRef(false);
  const lastScrollTop = useRef(0);
  const scrollSettled = useRef(false);

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

    // Track scroll to know if we're settled at top (not mid-momentum)
    let scrollTimer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      lastScrollTop.current = el.scrollTop;
      scrollSettled.current = false;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        scrollSettled.current = true;
      }, 100);
    };

    const onTouchStart = (e: TouchEvent) => {
      // Must be at scrollTop 0 AND scroll must have settled (no momentum)
      const atTop = el.scrollTop <= 0;
      scrollWasZero.current =
        atTop && (scrollSettled.current || lastScrollTop.current <= 0);
      if (scrollWasZero.current && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        pulling.current = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!scrollWasZero.current || isRefreshing) return;
      // If scroll has moved away from top, cancel
      if (el.scrollTop > 0) {
        pulling.current = false;
        setPullDistance(0);
        scrollWasZero.current = false;
        return;
      }
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 8) {
        pulling.current = true;
        setPullDistance(Math.min(dy * 0.4, MAX_PULL));
        e.preventDefault();
      } else if (dy < -5) {
        pulling.current = false;
        scrollWasZero.current = false;
        setPullDistance(0);
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) {
        setPullDistance(0);
        return;
      }
      pulling.current = false;
      scrollWasZero.current = false;
      if (pullDistance >= THRESHOLD) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
    };

    // Mark as settled initially
    scrollSettled.current = el.scrollTop <= 0;

    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      clearTimeout(scrollTimer);
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [isRefreshing, pullDistance, handleRefresh]);

  return { ref, isRefreshing, pullDistance };
}
