'use client';

import { useMemo } from 'react';
import { usePlayerContext } from '../player/context/PlayerContext';

/**
 * Convenience hook that extracts commonly-needed VOD player values from
 * the player context, including a memoised `pauseOverlayMetadata` object.
 *
 * @returns Player state, metadata, handlers, next episode info, and pause overlay metadata.
 */
export function useVODPlayerState() {
  const { state, metadata, playerHandlers, nextEpisode } = usePlayerContext();

  const pauseOverlayMetadata = useMemo(
    () => ({
      title: metadata.title,
      type: metadata.type,
      season: metadata.season,
      episode: metadata.episode,
      description: metadata.description,
      year: metadata.year,
      posterUrl: metadata.posterUrl,
    }),
    [metadata],
  );

  return { state, metadata, playerHandlers, nextEpisode, pauseOverlayMetadata };
}
