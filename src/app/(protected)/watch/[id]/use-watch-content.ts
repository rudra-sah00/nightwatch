'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { playVideo, stopVideo } from '@/features/search/api';
import type { PlayResponse } from '@/features/search/types';
import type { VideoMetadata } from '@/features/watch/player/context/types';
import { useS1StreamUrls } from '@/features/watch/player/hooks/s1/useS1StreamUrls';
import {
  type S2AudioTrack,
  useS2AudioTracks,
} from '@/features/watch/player/hooks/s2/useS2AudioTracks';
import { WS_EVENTS } from '@/lib/constants';
import { useServer } from '@/providers/server-provider';
import { useSocket } from '@/providers/socket-provider';

const MAX_STREAM_RETRIES = 2;
// S2 streams require a browser-service session. On cold starts the first
// request may fail with 500/503 while the session is being initialised.
// Silently retry once after a short pause before surfacing an error.
const S2_COLD_START_RETRY_DELAY_MS = 3000;

export function useWatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { socket } = useSocket();

  // Decode the ID — Next.js may leave %3A-encoded colons in dynamic segments
  // (e.g. 's2%3Aslug::id' instead of 's2:slug::id'). Normalise here so that
  // all downstream code and the DB always receive the plain decoded form.
  const movieId = decodeURIComponent(params.id as string);
  const type = (searchParams.get('type') || 'movie') as 'movie' | 'series';
  const server = (searchParams.get('server') ||
    movieId.split(':')[0] ||
    's1') as 's1' | 's2';
  const { setActiveServer } = useServer();

  useEffect(() => {
    setActiveServer(server);
  }, [server, setActiveServer]);

  const title = searchParams.get('title') || 'Unknown';
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');
  const episodeTitle = searchParams.get('episodeTitle');
  const description = searchParams.get('description');
  const year = searchParams.get('year');
  const poster = searchParams.get('poster');
  const seriesId = searchParams.get('seriesId');

  const streamParam = searchParams.get('stream');
  const initialStreamUrlRaw = streamParam
    ? decodeURIComponent(streamParam)
    : null;

  const captionParam = searchParams.get('caption');
  const spriteParam = searchParams.get('sprite');

  const posterUrl = poster ? decodeURIComponent(poster) : undefined;

  const qParam = searchParams.get('qualities');
  const initialQualitiesRaw = useMemo(() => {
    if (!qParam) return undefined;
    try {
      return JSON.parse(decodeURIComponent(qParam));
    } catch {
      return undefined;
    }
  }, [qParam]);

  const {
    streamUrl,
    setStreamUrl,
    captionUrl,
    spriteVtt,
    qualities,
    subtitleTracks,
    apiDurationSeconds,
    applyResponse: applyS1Response,
    applyS2Response,
    applyS2Subtitles,
  } = useS1StreamUrls({
    initialStreamUrlRaw: streamParam ? decodeURIComponent(streamParam) : null,
    initialCaptionUrlRaw: captionParam
      ? decodeURIComponent(captionParam)
      : null,
    initialSpriteVttRaw: spriteParam
      ? decodeURIComponent(spriteParam)
      : undefined,
    initialQualitiesRaw,
  });

  // Start in loading state when there's no stream param — we'll immediately
  // call refetchStream() from the mount effect, so skip the error-UI flash
  // that would otherwise appear on the first render before the effect fires.
  const [isRefetching, setIsRefetching] = useState(() => !streamParam);
  const [refetchError, setRefetchError] = useState<string | null>(null);
  // Tracks whether we've already done one silent cold-start retry for S2.
  const s2ColdStartRetried = useRef(false);
  // Set to true for the duration of an active playVideo() call plus a short
  // grace window afterwards.  Any stream:revoked event arriving while this is
  // true was caused by OUR OWN new session displacing the old one in Redis —
  // it is NOT another tab stealing the stream and must be silently ignored.
  const replacingSessionRef = useRef(false);
  const replacingSessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // Audio tracks extracted from the initial S2 refetchStream response.
  // Passed to useS2AudioTracks so it can skip its own playVideo() call,
  // which would otherwise create a second session and revoke the first.
  const [s2InitialAudioTracks, setS2InitialAudioTracks] = useState<
    S2AudioTrack[]
  >([]);
  // The currently-active S2 dub ID — used to pre-highlight the matching entry
  // in the AudioSelector on initial load (before the user has picked anything).
  const [s2ActiveTrackId, setS2ActiveTrackId] = useState<string | null>(() =>
    server === 's2' ? movieId : null,
  );

  const refetchStream = useCallback(
    async (overrideMovieId?: string) => {
      setIsRefetching(true);
      setRefetchError(null);

      // Any stream:revoked that arrives while we are calling playVideo() is
      // our OLD session being evicted by the new one on the SAME device.
      // Mark the suppression window before the request goes out.
      if (replacingSessionTimerRef.current) {
        clearTimeout(replacingSessionTimerRef.current);
      }
      replacingSessionRef.current = true;

      try {
        const decodedTitle = decodeURIComponent(title);
        let response: PlayResponse;

        if (type === 'series' && season && episode) {
          response = await playVideo({
            type: 'series',
            title: decodedTitle,
            seriesId: overrideMovieId || seriesId || movieId || undefined,
            season: parseInt(season, 10),
            episode: parseInt(episode, 10),
            server,
          });
        } else {
          response = await playVideo({
            type: 'movie',
            title: decodedTitle,
            movieId: overrideMovieId || movieId || undefined,
            server,
          });
        }

        if (response.success && response.masterPlaylistUrl) {
          if (server === 's1') {
            applyS1Response(response);
          } else {
            applyS2Response(response);
            // Propagate audio tracks so useS2AudioTracks skips its own playVideo() call.
            if (response.audioTracks && response.audioTracks.length > 0) {
              setS2InitialAudioTracks(
                response.audioTracks.map((t) => ({
                  id: t.streamUrl,
                  label: t.label,
                  language: t.language,
                  streamUrl: t.streamUrl,
                })),
              );
            }
            // Track the currently-playing dub so AudioSelector can highlight it.
            setS2ActiveTrackId(overrideMovieId || movieId || null);
          }
        } else {
          setRefetchError('Failed to load stream');
        }
      } catch (err) {
        const httpStatus = (err as { status?: number })?.status;
        // S2 cold-start: browser service session may not be ready on the first
        // play call. Retry silently once after a short delay instead of
        // immediately surfacing an error to the user.
        if (
          server === 's2' &&
          (httpStatus === 500 || httpStatus === 503) &&
          !s2ColdStartRetried.current
        ) {
          s2ColdStartRetried.current = true;
          // Schedule the retry — finally will briefly clear isRefetching, then
          // refetchStream() will set it true again.
          setTimeout(
            () => refetchStream(overrideMovieId),
            S2_COLD_START_RETRY_DELAY_MS,
          );
        } else {
          setRefetchError(
            err instanceof Error ? err.message : 'Failed to load stream',
          );
        }
      } finally {
        setIsRefetching(false);
        // Keep the suppression window open for a short grace period so that
        // a stream:revoked event that arrives slightly after the API response
        // (network reorder) is still swallowed correctly.
        replacingSessionTimerRef.current = setTimeout(() => {
          replacingSessionRef.current = false;
          replacingSessionTimerRef.current = null;
        }, 2000);
      }
    },
    [
      title,
      type,
      season,
      episode,
      movieId,
      seriesId,
      server,
      applyS1Response,
      applyS2Response,
    ],
  );

  const {
    audioTracks: s2AudioTracks,
    handleAudioTrackChange: handleS2AudioTrackChange,
  } = useS2AudioTracks({
    server,
    type,
    title,
    movieId,
    seriesId: seriesId ?? undefined,
    season,
    episode,
    onStreamChange: setStreamUrl,
    onRefetch: (overrideMovieId) => refetchStream(overrideMovieId),
    onDiscovered: applyS2Subtitles,
    initialTracks: s2InitialAudioTracks,
    // Skip the discovery playVideo() call when refetchStream() is already being
    // called on mount (no stream param). Both would create sessions; the second
    // would revoke the first via stream:revoked. Tracks come back via initialTracks.
    skipDiscovery: !streamParam,
  });

  const metadata: VideoMetadata = useMemo(
    () => ({
      title: decodeURIComponent(title),
      type,
      season: season ? parseInt(season, 10) : undefined,
      episode: episode ? parseInt(episode, 10) : undefined,
      episodeTitle: episodeTitle ? decodeURIComponent(episodeTitle) : undefined,
      movieId,
      seriesId: seriesId || undefined,
      description: description ? decodeURIComponent(description) : undefined,
      year: year ? decodeURIComponent(year) : undefined,
      posterUrl,
      providerId: server,
      // Provider-sourced duration for S2 MP4 streams (video.duration reports Infinity
      // because the CDN omits Content-Length). useWatchProgress uses this as fallback.
      apiDurationSeconds: apiDurationSeconds ?? undefined,
    }),
    [
      title,
      type,
      season,
      episode,
      episodeTitle,
      movieId,
      seriesId,
      description,
      year,
      posterUrl,
      server,
      apiDurationSeconds,
    ],
  );

  const streamRetryCount = useRef(0);

  const handleStreamExpired = useCallback(() => {
    if (streamRetryCount.current >= MAX_STREAM_RETRIES) {
      setStreamUrl(null);
      setRefetchError('Stream session expired. Please start playback again.');
      return;
    }
    streamRetryCount.current += 1;
    refetchStream();
  }, [refetchStream, setStreamUrl]);

  useEffect(() => {
    if (streamUrl) {
      streamRetryCount.current = 0;
      s2ColdStartRetried.current = false;
    }
  }, [streamUrl]);

  useEffect(() => {
    if (!socket) return;

    const handleStreamRevoked = () => {
      // Swallow revocations that were triggered by our own playVideo() call
      // replacing the previous Redis session.  These are NOT another device
      // stealing the stream — showing the error would be a false positive.
      if (replacingSessionRef.current) return;

      setStreamUrl(null);
      setRefetchError(
        'Playback stopped — you started playing on another tab or device.',
      );
    };

    socket.on(WS_EVENTS.STREAM_REVOKED, handleStreamRevoked);
    return () => {
      socket.off(WS_EVENTS.STREAM_REVOKED, handleStreamRevoked);
    };
  }, [socket, setStreamUrl]);

  // Tell the backend to clear the Redis stream session when the user leaves
  // the watch page.  This prevents stale sessions that would later cause
  // the false "playing in another tab" revocation on reconnect.
  useEffect(() => {
    const handleUnload = () => stopVideo();
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('pagehide', handleUnload);
      // Clear any pending suppression timer to avoid memory leaks.
      if (replacingSessionTimerRef.current) {
        clearTimeout(replacingSessionTimerRef.current);
      }
      // Emit a clean stop over the socket so the backend clears Redis
      // immediately (covers SPA navigation where pagehide doesn't fire).
      if (socket?.connected) {
        socket.emit(WS_EVENTS.STREAM_STOP);
      }
      // Best-effort HTTP beacon as a fallback for tab close.
      stopVideo();
    };
  }, [socket]);

  // Guard against React 18 Strict Mode double-invocation of the mount effect.
  // Without this, two concurrent playVideo() calls are made: the second one
  // calls invalidateUserStream() which revokes the first session, causing the
  // video element to get a 502 from the worker (session not found in Redis).
  const mountFetchedRef = useRef(false);

  useEffect(() => {
    if (!initialStreamUrlRaw && title) {
      if (mountFetchedRef.current) return;
      mountFetchedRef.current = true;
      refetchStream();
    }
  }, [initialStreamUrlRaw, title, refetchStream]);

  return {
    router,
    movieId,
    season,
    episode,
    description,
    posterUrl,
    isRefetching,
    refetchError,
    streamUrl,
    metadata,
    captionUrl,
    subtitleTracks,
    spriteVtt,
    qualities,
    s2AudioTracks,
    handleS2AudioTrackChange,
    s2ActiveTrackId,
    handleStreamExpired,
    refetchStream,
  };
}
