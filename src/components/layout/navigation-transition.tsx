'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useNavigationStore } from '@/store/use-navigation-store';

/**
 * Determine if a target path is considered a "Navbar Route" (shows progress bar)
 * or a "Public Route" (shows full-screen spinner).
 */
function getNavigationType(pathname: string): 'bar' | 'spinner' {
  const publicRoutes = ['/login', '/signup', '/user/'];
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));
  return isPublic ? 'spinner' : 'bar';
}

export function NavigationTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { start, complete, reset, isNavigating } = useNavigationStore();
  const lastUrlRef = useRef(pathname + searchParams.toString());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const minDisplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Complete and reset after navigation finishes (URL flips)
  useEffect(() => {
    const currentUrl = pathname + searchParams.toString();

    if (isNavigating && currentUrl !== lastUrlRef.current) {
      complete();

      // Ensure the bar is visible for at least 300ms even on instant navigations
      // (e.g. service-worker cached pages in production Electron)
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(300 - elapsed, 0);

      const timeout = setTimeout(() => {
        reset();
      }, remaining + 200);
      lastUrlRef.current = currentUrl;
      return () => clearTimeout(timeout);
    }

    // Keep the ref in sync when not navigating to ensure the next comparison is fresh
    if (!isNavigating) {
      lastUrlRef.current = currentUrl;
    }
  }, [pathname, searchParams, isNavigating, complete, reset]);

  // Handle simulated progress crawling
  useEffect(() => {
    if (isNavigating) {
      // Immediate initial jump to 10-15% for instant visual feedback
      useNavigationStore.setState((state) => ({
        ...state,
        progress: 10 + Math.random() * 5,
      }));

      intervalRef.current = setInterval(() => {
        useNavigationStore.setState((state) => {
          if (state.progress >= 95) return state;

          // Slow down progress as it gets higher (zeno's paradox style)
          const remaining = 95 - state.progress;
          const increment = Math.max(
            0.2,
            remaining * 0.05 + Math.random() * 0.5,
          );

          return { ...state, progress: state.progress + increment };
        });
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isNavigating]);

  useEffect(() => {
    const handleCaptureClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (!anchor) return;

      const href = anchor.getAttribute('href');
      const targetAttr = anchor.getAttribute('target');

      if (!href || !href.startsWith('/') || href.startsWith('//')) return;
      if (href.startsWith('#')) return;

      if (
        e.defaultPrevented ||
        targetAttr === '_blank' ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const currentUrl = new URL(window.location.href);
      const targetUrl = new URL(href, window.location.origin);
      if (
        currentUrl.pathname === targetUrl.pathname &&
        currentUrl.search === targetUrl.search
      ) {
        return;
      }

      // Determine feedback type based on destination
      const type = getNavigationType(targetUrl.pathname);
      startTimeRef.current = Date.now();
      start(type);
    };

    document.addEventListener('click', handleCaptureClick, true);
    return () =>
      document.removeEventListener('click', handleCaptureClick, true);
  }, [start]);

  return <>{children}</>;
}
