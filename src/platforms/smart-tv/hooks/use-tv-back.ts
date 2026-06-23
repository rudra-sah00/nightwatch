'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Handles Android TV back button (Escape/GoBack key).
 * On home page → does nothing (lets native handle app exit).
 * On any other page → goes back in browser history.
 * Does NOT fire if the event was already handled (stopPropagation from player/fullscreen).
 */
export function useTvBack() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'GoBack' && e.keyCode !== 461) return;
      // If a higher-priority handler already consumed this event, skip
      if (e.defaultPrevented) return;
      e.preventDefault();
      if (pathnameRef.current === '/home' || pathnameRef.current === '/')
        return;
      router.back();
    };
    // Use bubble phase (default) — capture-phase handlers (player, music) fire first
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [router]);
}
