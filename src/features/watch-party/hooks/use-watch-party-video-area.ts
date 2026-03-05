'use client';

import { useMemo } from 'react';
import type { VideoMetadata } from '@/features/watch/player/context/types';
import type { WatchPartyRoom } from '../room/types';

export function useWatchPartyVideoArea(room: WatchPartyRoom) {
  const metadata: VideoMetadata = useMemo(
    () => ({
      title: room.title,
      type: room.type,
      season: room.season,
      episode: room.episode,
      movieId: room.contentId,
      seriesId: room.type === 'series' ? room.contentId : undefined,
      posterUrl: room.posterUrl || '',
      // Livestreams are always HLS — force 's1' so the player never falls back to
      // the user's activeServer preference ('s2'/MP4) and shows a blank screen.
      providerId: room.type === 'livestream' ? ('s1' as const) : undefined,
    }),
    [
      room.title,
      room.type,
      room.season,
      room.episode,
      room.contentId,
      room.posterUrl,
    ],
  );

  return { metadata };
}
