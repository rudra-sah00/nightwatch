'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { trackScreen } from '@/lib/analytics';

/**
 * Maps pathnames to readable screen names for Firebase Analytics.
 * Dynamic segments are normalized to stable names.
 */
function pathToScreenName(path: string): string {
  // Remove leading slash and locale prefix (e.g. /en/home -> home)
  const clean = path.replace(/^\/([a-z]{2}(-[A-Z]{2})?\/)?/, '');

  // Dynamic route normalization
  if (/^watch\//.test(clean)) return 'watch_video';
  if (/^live\//.test(clean)) return 'watch_live';
  if (/^clip\//.test(clean)) return 'view_clip';
  if (/^watch-party\//.test(clean)) return 'watch_party';
  if (/^music\/playlist\//.test(clean)) return 'music_playlist';
  if (/^music\/album\//.test(clean)) return 'music_album';
  if (/^music\/artist\//.test(clean)) return 'music_artist';
  if (/^music\/radio\//.test(clean)) return 'music_radio';
  if (/^manga\/chapter\//.test(clean)) return 'manga_reader';
  if (/^manga\/title\//.test(clean)) return 'manga_title';
  if (/^games\//.test(clean)) return 'game';
  if (/^profile\/security/.test(clean)) return 'profile_security';
  if (/^profile\/preferences/.test(clean)) return 'profile_preferences';
  if (/^profile\/devices/.test(clean)) return 'profile_devices';

  // Static routes
  const map: Record<string, string> = {
    home: 'home',
    search: 'search',
    music: 'music',
    live: 'live',
    profile: 'profile',
    watchlist: 'watchlist',
    downloads: 'downloads',
    library: 'library',
    'ask-ai': 'ask_ai',
    manga: 'manga',
    games: 'games',
    'continue-watching': 'continue_watching',
    login: 'login',
    signup: 'signup',
  };

  return map[clean] || clean.replace(/\//g, '_') || 'home';
}

/** Headless component that tracks screen views via pathname changes. */
export function ScreenTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;
    trackScreen(pathToScreenName(pathname));
  }, [pathname]);

  return null;
}
