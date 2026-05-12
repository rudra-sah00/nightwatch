/**
 * useS2AudioTracks
 *
 * S2 Provider (MovieBox) — Audio dub discovery hook.
 *
 * Why a separate hook?
 * -------------------
 * MovieBox stores every language dub as an independent content entry that shares
 * the same display title. When the watch page first loads with an S2 stream URL,
 * we need to fetch the full play response (which carries the `audioTracks` list)
 * WITHOUT touching `streamUrl` — changing streamUrl would restart the video and
 * wipe the resume position that useWatchProgress already loaded.
 *
 * This hook fires once on mount and calls playVideo() directly so it can read
 * `response.audioTracks` and expose them to the player WITHOUT side effects on
 * the stream state managed by the parent page.
 *
 * Usage
 * -----
 * ```tsx
 * const { audioTracks, handleAudioTrackChange } = useS2AudioTracks({
 *   server,
 *   type,
 *   title,
 *   movieId,
 *   seriesId,
 *   season,
 *   episode,
 *   onStreamChange: (url) => setStreamUrl(url),
 * });
 * ```
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { playVideo } from '@/features/watch/api';
import type { PlayResponse } from '@/types/content';

export interface S2AudioTrack {
  id: string;
  label: string;
  language: string;
  /** Raw value from the API — either a direct MP4 URL or a `s2:…` content ID */
  streamUrl: string;
}

interface UseS2AudioTracksProps {
  /** Current server. Hook is a no-op when this is not 's1'. */
  server: string;
  type: 'movie' | 'series';
  /** Encoded title from URL params (raw — will be decoded internally). */
  title: string;
  movieId?: string;
  seriesId?: string;
  season?: string | null;
  episode?: string | null;
  /**
   * Called when the user selects a language dub that requires swapping the
   * stream URL (direct MP4 legacy path).  For `s2:…` content IDs the caller
   * should trigger a full refetch instead.
   */
  onStreamChange: (url: string) => void;
  /**
   * Called when the user selects a language dub that is a full content entry
   * (carries a `s2:…` ID), requiring a fresh play session.
   */
  onRefetch: (overrideMovieId: string) => void;
  /**
   * Called once after the discovery play request completes, with the full
   * PlayResponse.  Use this to apply subtitle tracks and caption URLs that
   * are not passed as URL params (S2 always serves them via the /play API).
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
  initialTracks?: S2AudioTrack[];
  /**
   * When true, the internal discovery playVideo() call is skipped entirely.
   * Set this when the parent is already calling playVideo() on mount (i.e.
   * refetchStream will fire) so a second concurrent call doesn't create a new
   * session that revokes the active stream via stream:revoked.
   * Use initialTracks to feed the tracks back once refetchStream completes.
   */
  skipDiscovery?: boolean;
}

interface UseS2AudioTracksResult {
  /** Available language dubs for this S2 content.  Empty for S1 or before discovery. */
  audioTracks: S2AudioTrack[];
  /**
   * Call when the user picks a language in the player's audio selector.
   * Internally decides whether to swap the URL directly or trigger a full refetch.
   */
  handleAudioTrackChange: (trackId: string) => void;
}

export function useS2AudioTracks({
  server,
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
}: UseS2AudioTracksProps): UseS2AudioTracksResult {
  const [audioTracks, setAudioTracks] = useState<S2AudioTrack[]>(
    () => initialTracks ?? [],
  );

  // Sync initialTracks into state when they arrive after an async refetchStream.
  // initialTracks starts as [] on mount; this effect fires once they're populated.
  useEffect(() => {
    if (initialTracks && initialTracks.length > 0) {
      setAudioTracks(initialTracks);
    }
  }, [initialTracks]);

  // ── Discover audio dubs on mount (S2 only) ───────────────────────────────
  // We call playVideo() directly — NOT the parent's refetchStream() — so we
  // can read audioTracks without touching streamUrl and restarting the video.
  // SKIP when skipDiscovery=true: the parent is already calling playVideo() on
  // mount (refetchStream), so a second call would create a new session and
  // immediately trigger invalidateUserStream → stream:revoked on the active one.
  // Tracks will be fed back via initialTracks once refetchStream completes.
  useEffect(() => {
    if (server !== 's1') return;
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
            server: 's1',
          });
        } else {
          response = await playVideo({
            type: 'movie',
            title: decodedTitle,
            movieId: movieId || undefined,
            server: 's1',
          });
        }

        if (!cancelled) {
          if (response.audioTracks && response.audioTracks.length > 0) {
            setAudioTracks(
              response.audioTracks.map((t) => ({
                // Use streamUrl as id — language codes are not unique when the
                // same language has multiple dubs (e.g. two "ru" entries).
                id: t.streamUrl,
                label: t.label,
                language: t.language,
                streamUrl: t.streamUrl,
              })),
            );
          }
          // Propagate subtitle tracks / caption URL back to the parent page so
          // they are displayed even when the page loaded with a stream URL param
          // (in which case refetchStream does not fire on mount).
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    episode,
    movieId, // Propagate subtitle tracks / caption URL back to the parent page so
    // they are displayed even when the page loaded with a stream URL param
    // (in which case refetchStream does not fire on mount).
    onBeforeDiscovery,
    onDiscovered,
    season,
    seriesId,
    server,
    title,
    type,
    skipDiscovery,
  ]); // Once on mount — server/params don't change mid-session.

  // ── Track selection ──────────────────────────────────────────────────────
  const handleAudioTrackChange = useCallback(
    (trackId: string) => {
      const track = audioTracks.find((t) => t.id === trackId);
      if (!track) return;

      if (track.streamUrl.startsWith('s2:')) {
        // Dub stored as a separate S2 content entry → full refetch needed.
        onRefetch(track.streamUrl);
      } else {
        // Legacy direct MP4 URL → swap in place.
        onStreamChange(track.streamUrl);
      }
    },
    [audioTracks, onRefetch, onStreamChange],
  );

  return { audioTracks, handleAudioTrackChange };
}
