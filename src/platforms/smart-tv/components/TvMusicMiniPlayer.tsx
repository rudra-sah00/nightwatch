'use client';

import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import Image from 'next/image';
import { useMusicStore } from '@/features/music/store/use-music-store';

/**
 * Persistent mini music player bar for TV.
 * Shows at the bottom of the screen when a track is playing/paused.
 * Press Enter to expand to full player.
 */
export function TvMusicMiniPlayer() {
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const progress = useMusicStore((s) => s.progress);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const next = useMusicStore((s) => s.next);
  const setExpanded = useMusicStore((s) => s.setExpanded);

  const { ref, focused } = useFocusable({
    focusKey: 'TV_MINI_PLAYER',
    onEnterPress: () => setExpanded(true),
  });

  if (!currentTrack) return null;

  return (
    <div
      ref={ref}
      className={`fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border transition-all ${
        focused ? 'ring-2 ring-tv-focus ring-inset' : ''
      }`}
    >
      {/* Progress bar */}
      <div className="h-1 w-full bg-border/50">
        <div
          className="h-full bg-tv-focus transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-4 px-6 py-3">
        {/* Album art */}
        <Image
          src={currentTrack.image}
          alt={currentTrack.title}
          className="w-12 h-12 rounded-lg object-cover shrink-0"
          width={48}
          height={48}
          unoptimized
        />

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-foreground">
            {currentTrack.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {currentTrack.artist}
          </p>
        </div>

        {/* Inline controls (not focusable separately — Enter on the bar opens full player) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-2 rounded-full text-foreground hover:bg-secondary"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            tabIndex={-1}
          >
            <span className="material-symbols-outlined text-2xl">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button
            type="button"
            className="p-2 rounded-full text-muted-foreground hover:bg-secondary"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            tabIndex={-1}
          >
            <span className="material-symbols-outlined text-xl">skip_next</span>
          </button>
        </div>

        {/* Expand hint */}
        {focused && (
          <span className="text-xs text-muted-foreground ml-2">
            Press Enter for full player
          </span>
        )}
      </div>
    </div>
  );
}
