'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { VideoMetadata } from '@/features/watch/player/context/types';
import {
  type S2AudioTrack,
  useS2AudioTracks,
} from '@/features/watch/player/hooks/s2/useS2AudioTracks';
import type { WatchPartyRoom } from '../room/types';

export function useWatchPartyVideoArea(room: WatchPartyRoom) {
  const server = room.providerId ?? 's1';

  // Local stream URL override — when the host switches to a direct-URL audio
  // dub, we update this so the player reloads the stream without touching the
  // room state (which would affect all members).
  const [streamUrlOverride, setStreamUrlOverride] = useState<string | null>(
    null,
  );

  // Reset the URL override whenever the room content changes (host changed
  // content mid-party). Without this, the old language-dub URL would persist
  // and the player would play the wrong stream after a content switch.
  // "setState during render" pattern: React re-renders immediately, no effect needed.
  const prevContentIdRef = useRef(room.contentId);
  if (prevContentIdRef.current !== room.contentId) {
    prevContentIdRef.current = room.contentId;
    setStreamUrlOverride(null);
  }

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
      // For all other content, propagate the room's server so useWatchProgress
      // records progress with the correct providerId and useNextEpisode fetches
      // from the right API.
      providerId:
        room.type === 'livestream' ? ('s1' as const) : room.providerId,
    }),
    [
      room.title,
      room.type,
      room.season,
      room.episode,
      room.contentId,
      room.posterUrl,
      room.providerId,
    ],
  );

  const handleStreamChange = useCallback((url: string) => {
    setStreamUrlOverride(url);
  }, []);

  // onRefetch (s2: content ID dubs) — not yet supported in watch party.
  // The host's stream won't change for this case. A future backend event
  // (party:update_stream) would propagate the new URL to all members.
  const handleRefetch = useCallback((_overrideId: string) => {}, []);

  const { audioTracks, handleAudioTrackChange } = useS2AudioTracks({
    server,
    type: room.type === 'series' ? 'series' : 'movie',
    title: room.title,
    movieId: room.type !== 'series' ? room.contentId : undefined,
    seriesId: room.type === 'series' ? room.contentId : undefined,
    season: room.season?.toString() ?? null,
    episode: room.episode?.toString() ?? null,
    onStreamChange: handleStreamChange,
    onRefetch: handleRefetch,
    // Skip if not S2 — useS2AudioTracks already guards internally but this
    // avoids the unnecessary playVideo() call on S1/livestream rooms.
    skipDiscovery: server !== 's2' || room.type === 'livestream',
  });

  // Cast to the shape Player.Root expects
  const initialAudioTracks: S2AudioTrack[] = audioTracks;

  return {
    metadata,
    streamUrlOverride,
    initialAudioTracks,
    handleAudioTrackChange,
  };
}
