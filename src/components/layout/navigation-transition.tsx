'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useNavigationStore } from '@/store/use-navigation-store';

export function NavigationTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { complete, reset, isNavigating } = useNavigationStore();
  const lastUrlRef = useRef(pathname + searchParams.toString());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Complete and reset after navigation finishes (URL changes)
  useEffect(() => {
    const currentUrl = pathname + searchParams.toString();

    if (isNavigating && currentUrl !== lastUrlRef.current) {
      complete();

      // Ensure the bar is visible for at least 300ms even on instant navigations
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(300 - elapsed, 0);

      const timeout = setTimeout(() => {
        reset();
      }, remaining + 200);
      lastUrlRef.current = currentUrl;
      return () => clearTimeout(timeout);
    }

    if (!isNavigating) {
      lastUrlRef.current = currentUrl;
    }
  }, [pathname, searchParams, isNavigating, complete, reset]);

  // Simulated progress crawling while navigating
  useEffect(() => {
    if (isNavigating) {
      startTimeRef.current = Date.now();

      useNavigationStore.setState((state) => ({
        ...state,
        progress: 10 + Math.random() * 5,
      }));

      intervalRef.current = setInterval(() => {
        useNavigationStore.setState((state) => {
          if (state.progress >= 95) return state;
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

  return <>{children}</>;
}
