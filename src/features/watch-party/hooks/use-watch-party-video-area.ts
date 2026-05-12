'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { VideoMetadata } from '@/features/watch/player/context/types';
import type { S2AudioTrack } from '@/features/watch/player/hooks/useS2AudioTracks';
import type { WatchPartyRoom } from '../room/types';

/**
 * Hook managing the video area state for a watch party room.
 *
 * Derives video metadata from the room state, handles local stream URL overrides
 * for audio dub switching, resets overrides on content changes, and provides
 * audio track selection logic. Avoids calling `playVideo()` to prevent session
 * token conflicts that would revoke the party stream for all members.
 *
 * @param room - The current watch party room state.
 * @returns Video metadata, stream URL override, audio tracks, and track change handler.
 */
export function useWatchPartyVideoArea(room: WatchPartyRoom) {
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
      // the user's activeServer preference ('s1'/MP4) and shows a blank screen.
      // For all other content, propagate the room's server so useWatchProgress
      // records progress with the correct providerId and useNextEpisode fetches
      // from the right API.
      providerId:
        room.type === 'livestream'
          ? ('s1' as const)
          : room.providerId || (room.contentId.startsWith('s2:') ? 's1' : 's1'),
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

  // Audio tracks come from the room object (stored by the backend when the
  // host created/updated the room). We never call playVideo() here — doing so
  // would trigger createSessionWithToken → GETSET → replace the party sentinel
  // → emit stream:revoked → kill the party stream for everyone.
  const initialAudioTracks: S2AudioTrack[] = useMemo(
    () => room.audioTracks ?? [],
    [room.audioTracks],
  );

  // The active track is the current content ID — one of the audio track IDs
  // will equal room.contentId when it's an S2 dub room.
  const initialAudioTrackId =
    room.providerId === 's1' && initialAudioTracks.length > 1
      ? room.contentId
      : undefined;

  // For direct-URL (non-s2:) dub tracks, allow local stream swaps.
  const handleAudioTrackChange = useCallback(
    (trackId: string) => {
      const track = initialAudioTracks.find((t) => t.id === trackId);
      if (!track) return;
      if (track.streamUrl.startsWith('s2:')) {
        handleRefetch(track.streamUrl);
      } else {
        handleStreamChange(track.streamUrl);
      }
    },
    [initialAudioTracks, handleRefetch, handleStreamChange],
  );

  return {
    metadata,
    streamUrlOverride,
    initialAudioTracks,
    initialAudioTrackId,
    handleAudioTrackChange,
  };
}
