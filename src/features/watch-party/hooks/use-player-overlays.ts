'use client';

import { useCallback } from 'react';
import { usePlayerContext } from '@/features/watch/player/context/PlayerContext';

/**
 * Hook providing player overlay state and a "play next" handler for watch parties.
 *
 * When the current user is the host and a next episode callback is provided,
 * `handlePlayNext` delegates episode advancement to the host's content update
 * logic. Otherwise, it falls back to the player's built-in next episode playback.
 *
 * @param isHost - Whether the current user is the party host.
 * @param onNextEpisode - Optional host callback to advance to the next episode by season and episode number.
 * @returns Player state, next episode info, and the `handlePlayNext` handler.
 */
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
