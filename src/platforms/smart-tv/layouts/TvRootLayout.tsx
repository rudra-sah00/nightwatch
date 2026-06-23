'use client';

import {
  FocusContext,
  setFocus,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useEffect } from 'react';
import { useMusicStore } from '@/features/music/store/use-music-store';
import { TvCallOverlay } from '../components/TvCallOverlay';
import { TvErrorBoundary } from '../components/TvErrorBoundary';
import { TvMusicCommandHandler } from '../components/TvMusicCommandHandler';
import { TvMusicFullPlayer } from '../components/TvMusicFullPlayer';
import { TvMusicMiniPlayer } from '../components/TvMusicMiniPlayer';
import { TvScreensaver } from '../components/TvScreensaver';
import { useTvBack } from '../hooks/use-tv-back';
import { useTvVideoPresence } from '../hooks/use-tv-video-presence';
import { FOCUS_KEYS } from '../lib/focus-keys';
import { initSpatialNavigation } from '../lib/spatial-navigation';
import { TvNavbar } from './TvNavbar';

// Must init before any useFocusable() hook runs
if (typeof window !== 'undefined') {
  initSpatialNavigation();
}

export function TvRootLayout({ children }: { children: React.ReactNode }) {
  const expanded = useMusicStore((s) => s.expanded);
  const hasTrack = useMusicStore((s) => !!s.currentTrack);

  const { ref, focusKey } = useFocusable({
    focusKey: 'TV_ROOT',
    trackChildren: true,
  });

  useTvBack();
  useTvVideoPresence();

  useEffect(() => {
    document.documentElement.classList.add('tv');
    setFocus(FOCUS_KEYS.SIDEBAR);
    return () => {
      document.documentElement.classList.remove('tv');
    };
  }, []);

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className="tv-safe-area flex h-screen w-screen bg-background text-foreground overflow-hidden"
      >
        <TvScreensaver />
        <TvNavbar />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden scroll-smooth">
          <TvErrorBoundary>{children}</TvErrorBoundary>
        </main>

        {/* Persistent mini player (bottom bar) — only mount when track exists */}
        {hasTrack && <TvMusicMiniPlayer />}

        {/* Music remote command handler (phone → TV control) */}
        <TvMusicCommandHandler />

        {/* Voice call overlay (top-right, always visible) */}
        <TvCallOverlay />

        {/* Full screen music player overlay */}
        {expanded && <TvMusicFullPlayer />}
      </div>
    </FocusContext.Provider>
  );
}
