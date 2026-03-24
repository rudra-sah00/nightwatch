'use client';

import { useCallback } from 'react';
import { usePlayerContext } from '@/features/watch/player/context/PlayerContext';

export function usePlayerOverlays(
  isHost: boolean,
  onNextEpisode?: (season: number, episode: number) => void,
) {
  const { state, nextEpisode } = usePlayerContext();

  const handlePlayNext = useCallback(async () => {
    if (isHost && onNextEpisode && nextEpisode.info) {
      onNextEpisode(
        nextEpisode.info.seasonNumber,
        nextEpisode.info.episodeNumber,
      );
    } else {
      nextEpisode.play().catch(() => {});
    }
  }, [isHost, onNextEpisode, nextEpisode]);

  return { state, nextEpisode, handlePlayNext };
}
