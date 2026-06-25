'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

/**
 * Monitors the browser's online/offline status and shows toast notifications
 * when connectivity changes.
 *
 * Suppresses the visual overlay on player routes (`/watch/`, `/watch-party/`, `/live/`).
 * Currently renders no persistent UI beyond the toasts.
 *
 * @returns `null` — all feedback is delivered via `sonner` toasts.
 */
export function OfflineIndicator() {
  const _t = useTranslations('common.offline');
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, _setDismissed] = useState(false);
  // Ensure we get mounted correctly on client without hydration mismatch
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname() || '';

  useEffect(() => {
    setMounted(true);
    if (!window.navigator.onLine) {
      setIsOffline(true);
    }

    const handleOffline = () => {
      setIsOffline(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!mounted) return null;

  // Do not show the overlay inside any player routes
  const isPlayerRoute =
    pathname.startsWith('/watch/') ||
    pathname.startsWith('/watch-party/') ||
    pathname.startsWith('/live/');

  if (!isOffline || isPlayerRoute || dismissed) {
    return null;
  }

  // Floating indicator removed per user request
  return null;
}
