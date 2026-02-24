'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { playVideo } from '@/features/search/api';
import type { PlayResponse } from '@/features/search/types';
import { LoadingOverlay } from '@/features/watch/overlays/LoadingOverlay';
import { WatchPage } from '@/features/watch/page/WatchPage';
import type { VideoMetadata } from '@/features/watch/player/types';
import {
  extractTokenFromUrl,
  normalizeWatchUrls,
} from '@/features/watch/utils';
import { WS_EVENTS } from '@/lib/constants';
import { useSocket } from '@/providers/socket-provider';

function WatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { socket } = useSocket();

  const movieId = params.id as string;
  const type = (searchParams.get('type') || 'movie') as 'movie' | 'series';
  const title = searchParams.get('title') || 'Unknown';
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');
  const episodeTitle = searchParams.get('episodeTitle');
  const description = searchParams.get('description');
  const year = searchParams.get('year');
  const poster = searchParams.get('poster');
  const seriesId = searchParams.get('seriesId');

  // 1. Extract and normalize initial URLs
  const streamParam = searchParams.get('stream');
  const initialStreamUrlRaw = streamParam
    ? decodeURIComponent(streamParam)
    : null;

  const captionParam = searchParams.get('caption');
  const initialCaptionUrlRaw = captionParam
    ? decodeURIComponent(captionParam)
    : null;

  const spriteParam = searchParams.get('sprite');
  const initialSpriteVttRaw = spriteParam
    ? decodeURIComponent(spriteParam)
    : undefined;

  // Decode poster URL
  const posterUrl = poster ? decodeURIComponent(poster) : undefined;

  // 2. Extract token to normalize everything synchronously
  const streamToken = useMemo(
    () => extractTokenFromUrl(initialStreamUrlRaw),
    [initialStreamUrlRaw],
  );

  // 3. Initialize state with normalized (path-based) URLs if possible
  const [streamUrl, setStreamUrl] = useState<string | null>(() => {
    if (!initialStreamUrlRaw || !streamToken) return initialStreamUrlRaw;
    return normalizeWatchUrls({ streamUrl: initialStreamUrlRaw }, streamToken)
      .streamUrl;
  });

  const [captionUrl, setCaptionUrl] = useState<string | null>(() => {
    if (!initialCaptionUrlRaw || !streamToken) return initialCaptionUrlRaw;
    return (
      normalizeWatchUrls(
        { streamUrl: null, captionUrl: initialCaptionUrlRaw },
        streamToken,
      ).captionUrl ?? null
    );
  });

  const [spriteVtt, setSpriteVtt] = useState<string | undefined>(() => {
    if (!initialSpriteVttRaw || !streamToken) return initialSpriteVttRaw;
    return normalizeWatchUrls(
      { streamUrl: null, spriteVtt: initialSpriteVttRaw },
      streamToken,
    ).spriteVtt;
  });

  const [subtitleTracks, setSubtitleTracks] = useState<
    { id: string; label: string; language: string; src: string }[] | undefined
  >(undefined);
  const [isRefetching, setIsRefetching] = useState(false);
  const [refetchError, setRefetchError] = useState<string | null>(null);

  // CRITICAL: Sync state when URL params change (soft navigation for next episode)
  useEffect(() => {
    const s = initialStreamUrlRaw;
    const c = initialCaptionUrlRaw;
    const v = initialSpriteVttRaw;

    // We only need to sync if the raw values changed (ignoring our path-based transformation)
    // But since we want to keep them normalized, we apply injection here too
    const token = extractTokenFromUrl(s);

    if (s) {
      const normalized = normalizeWatchUrls(
        { streamUrl: s, captionUrl: c, spriteVtt: v, subtitleTracks },
        token || '',
      );
      setStreamUrl(normalized.streamUrl);
      if (c) setCaptionUrl(normalized.captionUrl ?? null);
      if (v) setSpriteVtt(normalized.spriteVtt);
      if (subtitleTracks) setSubtitleTracks(normalized.subtitleTracks);
    }

    setRefetchError(null);
  }, [
    initialStreamUrlRaw,
    initialCaptionUrlRaw,
    initialSpriteVttRaw,
    subtitleTracks,
  ]);

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
    ],
  );

  // Refetch stream URL from backend (uses Redis cache for fast response)
  const refetchStream = useCallback(async () => {
    setIsRefetching(true);
    setRefetchError(null);

    try {
      const decodedTitle = decodeURIComponent(title);
      let response: PlayResponse;

      if (type === 'series' && season && episode) {
        response = await playVideo({
          type: 'series',
          title: decodedTitle,
          seriesId: seriesId || movieId || undefined, // Use available ID
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

      if (response.success && response.masterPlaylistUrl) {
        const token = extractTokenFromUrl(response.masterPlaylistUrl) || '';

        const normalized = normalizeWatchUrls(
          {
            streamUrl: response.masterPlaylistUrl,
            captionUrl: response.captionSrt,
            spriteVtt: response.spriteVtt,
            subtitleTracks: response.subtitleTracks?.map((t, index) => ({
              id: t.language ? `${t.language}-${index}` : `track-${index}`,
              label: t.label,
              language: t.language,
              src: t.url,
            })),
          },
          token,
        );

        setStreamUrl(normalized.streamUrl);
        if (response.captionSrt) setCaptionUrl(normalized.captionUrl ?? null);
        if (response.spriteVtt) setSpriteVtt(normalized.spriteVtt);
        if (normalized.subtitleTracks && normalized.subtitleTracks.length > 0) {
          setSubtitleTracks(normalized.subtitleTracks);
        }
      } else {
        setRefetchError('Failed to load stream');
      }
    } catch (err) {
      setRefetchError(
        err instanceof Error ? err.message : 'Failed to load stream',
      );
    } finally {
      setIsRefetching(false);
    }
  }, [title, type, season, episode, movieId, seriesId]);

  // Retry counter to prevent infinite refetch loops on persistent 401s
  const streamRetryCount = useRef(0);
  const MAX_STREAM_RETRIES = 2;

  // Called by WatchPage when HLS gets a 401 (stale token after page reload)
  const handleStreamExpired = useCallback(() => {
    if (streamRetryCount.current >= MAX_STREAM_RETRIES) {
      // Exhausted retries — let the error surface normally
      setStreamUrl(null);
      setRefetchError('Stream session expired. Please start playback again.');
      return;
    }
    streamRetryCount.current += 1;
    refetchStream();
  }, [refetchStream]);

  // Reset retry counter when stream URL changes (successful refetch)
  useEffect(() => {
    if (streamUrl) {
      streamRetryCount.current = 0;
    }
  }, [streamUrl]);

  // Listen for stream revocation (another tab started a new stream)
  // Re-runs when 'socket' changes (SocketProvider guarantees reactivity)
  useEffect(() => {
    if (!socket) return;

    const handleStreamRevoked = () => {
      setStreamUrl(null);
      setRefetchError(
        'Playback stopped — you started playing on another tab or device.',
      );
    };

    socket.on(WS_EVENTS.STREAM_REVOKED, handleStreamRevoked);
    return () => {
      socket.off(WS_EVENTS.STREAM_REVOKED, handleStreamRevoked);
    };
  }, [socket]);

  // Auto-refetch if no stream URL on mount (page reload scenario)
  useEffect(() => {
    if (!initialStreamUrlRaw && title) {
      refetchStream();
    }
  }, [initialStreamUrlRaw, title, refetchStream]);

  // Loading state while refetching
  if (isRefetching) {
    return (
      <div className="relative w-full h-[100dvh] bg-black overflow-hidden flex flex-col items-center justify-center">
        {/* Aesthetic Background - Match WatchPage */}
        {posterUrl ? (
          <div className="absolute inset-0 z-0">
            <div
              className="absolute inset-0 bg-cover bg-center blur-3xl scale-110 opacity-30 animate-pulse"
              style={{ backgroundImage: `url(${posterUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60" />
          </div>
        ) : null}

        {/* Reuse the LoadingOverlay for consistency */}
        <LoadingOverlay isVisible={true} />
      </div>
    );
  }

  // No stream URL and error
  if (!streamUrl) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
          <span className="text-4xl">⚠️</span>
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">
          {refetchError || 'No Stream Available'}
        </h2>
        <p className="text-white/60 mb-6">
          {refetchError
            ? 'There was an error loading the stream'
            : 'Please start playback from the content page'}
        </p>
        <div className="flex gap-3">
          {refetchError ? (
            <button
              type="button"
              onClick={refetchStream}
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Create a unique key that changes when episode changes to force WatchPage remount
  const watchKey = `${movieId}-${season || 0}-${episode || 0}`;

  return (
    <WatchPage
      key={watchKey}
      streamUrl={streamUrl}
      metadata={metadata}
      captionUrl={captionUrl}
      subtitleTracks={subtitleTracks}
      spriteVtt={spriteVtt}
      description={description ? decodeURIComponent(description) : undefined}
      onStreamExpired={handleStreamExpired}
    />
  );
}

export default function WatchRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center w-full h-[100dvh] bg-black">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      }
    >
      <WatchContent />
    </Suspense>
  );
}
