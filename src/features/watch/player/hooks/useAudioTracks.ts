/**
 * useAudioTracks — Audio dub discovery hook.
 *
 * Why a separate hook?
 * -------------------
 * The provider stores every language dub as an independent content entry that
 * shares the same display title. When the watch page first loads with a stream
 * URL, we need to fetch the full play response (which carries the `audioTracks`
 * list) WITHOUT touching `streamUrl` — changing streamUrl would restart the
 * video and wipe the resume position that useWatchProgress already loaded.
 *
 * This hook fires once on mount and calls playVideo() directly so it can read
 * `response.audioTracks` and expose them to the player WITHOUT side effects on
 * the stream state managed by the parent page.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { playVideo } from '@/features/watch/api';
import type { PlayResponse } from '@/types/content';

export interface AudioTrack {
  id: string;
  label: string;
  language: string;
  /** Raw value from the API — either a direct MP4 URL or a prefixed content ID */
  streamUrl: string;
}

interface UseAudioTracksProps {
  type: 'movie' | 'series';
  /** Encoded title from URL params (raw — will be decoded internally). */
  title: string;
  movieId?: string;
  seriesId?: string;
  season?: string | null;
  episode?: string | null;
  /**
   * Called when the user selects a language dub that requires swapping the
   * stream URL (direct MP4 path).
   */
  onStreamChange: (url: string) => void;
  /**
   * Called when the user selects a language dub that is a full content entry
   * (carries a prefixed content ID), requiring a fresh play session.
   */
  onRefetch: (overrideMovieId: string) => void;
  /**
   * Called once after the discovery play request completes, with the full
   * PlayResponse.  Use this to apply subtitle tracks and caption URLs that
   * are not passed as URL params (always served via the /play API).
   */
  onDiscovered?: (response: PlayResponse) => void;
  /**
   * Called just before the discovery playVideo() request is sent.
   * Use this to suppress stream:revoked events that would otherwise incorrectly
   * stop playback — the revocation is caused by our own session swap, not
   * another device stealing the stream.
   */
  onBeforeDiscovery?: () => void;
  /**
   * Pre-populated audio tracks from a prior playVideo() call (e.g. refetchStream).
   * When provided, the internal discovery playVideo() call is skipped entirely —
   * preventing a second session creation that would revoke the active stream.
   */
  initialTracks?: AudioTrack[];
  /**
   * When true, the internal discovery playVideo() call is skipped entirely.
   * Set this when the parent is already calling playVideo() on mount (i.e.
   * refetchStream will fire) so a second concurrent call doesn't create a new
   * session that revokes the active stream via stream:revoked.
   * Use initialTracks to feed the tracks back once refetchStream completes.
   */
  skipDiscovery?: boolean;
}

interface UseAudioTracksResult {
  /** Available language dubs. Empty before discovery completes. */
  audioTracks: AudioTrack[];
  /**
   * Call when the user picks a language in the player's audio selector.
   * Internally decides whether to swap the URL directly or trigger a full refetch.
   */
  handleAudioTrackChange: (trackId: string) => void;
}

export function useAudioTracks({
  type,
  title,
  movieId,
  seriesId,
  season,
  episode,
  onStreamChange,
  onRefetch,
  onDiscovered,
  onBeforeDiscovery,
  initialTracks,
  skipDiscovery,
}: UseAudioTracksProps): UseAudioTracksResult {
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(
    () => initialTracks ?? [],
  );

  // Sync initialTracks into state when they arrive after an async refetchStream.
  useEffect(() => {
    if (initialTracks && initialTracks.length > 0) {
      setAudioTracks(initialTracks);
    }
  }, [initialTracks]);

  // ── Discover audio dubs on mount ─────────────────────────────────────────
  useEffect(() => {
    if (skipDiscovery) return;

    let cancelled = false;

    const discover = async () => {
      onBeforeDiscovery?.();
      try {
        const decodedTitle = decodeURIComponent(title);
        let response: PlayResponse;

        if (type === 'series' && season && episode) {
          response = await playVideo({
            type: 'series',
            title: decodedTitle,
            seriesId: seriesId || movieId || undefined,
            season: parseInt(season, 10),
            episode: parseInt(episode, 10),
          });
        } else {
          response = await playVideo({
            type: 'movie',
            title: decodedTitle,
            movieId: movieId || undefined,
          });
        }

        if (!cancelled) {
          if (response.audioTracks && response.audioTracks.length > 0) {
            setAudioTracks(
              response.audioTracks.map((t) => ({
                id: t.streamUrl,
                label: t.label,
                language: t.language,
                streamUrl: t.streamUrl,
              })),
            );
          }
          onDiscovered?.(response);
        }
      } catch {
        // Audio tracks are non-critical — player works fine without them.
      }
    };

    discover();
    return () => {
      cancelled = true;
    };
  }, [
    episode,
    movieId,
    onBeforeDiscovery,
    onDiscovered,
    season,
    seriesId,
    title,
    type,
    skipDiscovery,
  ]);

  // ── Track selection ──────────────────────────────────────────────────────
  const handleAudioTrackChange = useCallback(
    (trackId: string) => {
      const track = audioTracks.find((t) => t.id === trackId);
      if (!track) return;

      if (track.streamUrl.startsWith('s1:')) {
        // Dub stored as a separate content entry → full refetch needed.
        onRefetch(track.streamUrl);
      } else {
        // Direct MP4 URL → swap in place.
        onStreamChange(track.streamUrl);
      }
    },
    [audioTracks, onRefetch, onStreamChange],
  );

  return { audioTracks, handleAudioTrackChange };
}
