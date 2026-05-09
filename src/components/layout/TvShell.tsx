'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { checkIsTV } from '@/lib/electron-bridge';
import { disableSpatialNav, enableSpatialNav } from '@/lib/tv-spatial-nav';

/**
 * TvShell — mounted once in root layout.
 * Handles: D-pad back button (browser history), TV class on <html>,
 * and spatial navigation for remote control.
 */
export function TvShell() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!checkIsTV()) return;

    // Add TV class to <html> for CSS targeting
    document.documentElement.classList.add('tv');

    // Enable D-pad spatial navigation
    enableSpatialNav();

    // Back button via keyboard (Android TV remote sends Escape/Backspace)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'GoBack') {
        e.preventDefault();
        if (pathnameRef.current === '/home' || pathnameRef.current === '/') {
          // Let the native back handler exit the app
          return;
        }
        router.back();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.documentElement.classList.remove('tv');
      disableSpatialNav();
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);

  return null;
}
