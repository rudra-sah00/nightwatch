'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { playVideo, stopVideo } from '@/features/watch/api';
import type { VideoMetadata } from '@/features/watch/player/context/types';
import {
  type S2AudioTrack,
  useS2AudioTracks,
} from '@/features/watch/player/hooks/useS2AudioTracks';
import { useStreamUrls } from '@/features/watch/player/hooks/useStreamUrls';
import { WS_EVENTS } from '@/lib/constants';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { useServer } from '@/providers/server-provider';
import { useSocket } from '@/providers/socket-provider';
import type { PlayResponse } from '@/types/content';

/**
 * Core hook for VOD playback page logic.
 * Handles metadata derivation and stream fetching.
 */
const MAX_STREAM_RETRIES = 2;
const S2_COLD_START_RETRY_DELAY_MS = 3000;

export function useWatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { socket } = useSocket();

  const movieId = decodeURIComponent(params.id as string);
  const t = useTranslations('watch');
  const type = (searchParams.get('type') || 'movie') as 'movie' | 'series';
  const server = (searchParams.get('server') ||
    movieId.split(':')[0] ||
    's1') as 's1' | 's2' | 's3';
  const { setActiveServer } = useServer();

  useEffect(() => {
    setActiveServer(server);
  }, [server, setActiveServer]);

  const title = searchParams.get('title') || t('page.unknownTitle');
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
    applyResponse,
    applyS2Subtitles,
  } = useStreamUrls({
    initialStreamUrlRaw: streamParam ? decodeURIComponent(streamParam) : null,
    initialCaptionUrlRaw: captionParam
      ? decodeURIComponent(captionParam)
      : null,
    initialSpriteVttRaw: spriteParam
      ? decodeURIComponent(spriteParam)
      : undefined,
    initialQualitiesRaw,
  });

  const [isRefetching, setIsRefetching] = useState(() => !streamParam);
  const [refetchError, setRefetchError] = useState<string | null>(null);
  const s2ColdStartRetried = useRef(false);
  const [_isReplacingSession, setIsReplacingSession] = useState(false);
  const replacingSessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [s2InitialAudioTracks, setS2InitialAudioTracks] = useState<
    S2AudioTrack[]
  >([]);
  const [s2ActiveTrackId, setS2ActiveTrackId] = useState<string | null>(() =>
    server === 's2' ? movieId : null,
  );

  const refetchStream = useCallback(
    async (overrideMovieId?: string) => {
      setIsRefetching(true);
      setRefetchError(null);

      if (replacingSessionTimerRef.current) {
        clearTimeout(replacingSessionTimerRef.current);
      }
      setIsReplacingSession(true);

      try {
        const decodedTitle = decodeURIComponent(title);

        if (checkIsDesktop()) {
          const fetchedDownloads = await desktopBridge.getDownloads();
          // 1. Resolve base ID by stripping any existing episode suffixes or provider prefixes
          const rawId = overrideMovieId || movieId || '';
          const baseIdFromRaw = rawId.replace(/(_S\d+E\d+|-ep\d+)$/, '');
          const currentSeriesId = overrideMovieId || seriesId || baseIdFromRaw;
          const cleanSeriesId = currentSeriesId.replace(/^(s1|s2|s3):/, '');

          let offlineContentId1 = rawId;
          let offlineContentId2 = rawId;

          if (type === 'series' && (season || episode)) {
            // Re-construct IDs from clean base to avoid double-suffixing (e.g. _S1E1_S1E1)
            offlineContentId1 = `${currentSeriesId}_S${season || 1}E${episode || 1}`;
            offlineContentId2 = `${currentSeriesId}-ep${episode || 1}`;
          }

          // 2. Build a comprehensive search set. We check:
          // - The raw ID from the URL
          // - The reconstructed standard IDs (with and without server prefixes)
          // - The base series ID (in case the download was stored at the series level)
          const searchIds = new Set([
            rawId,
            offlineContentId1,
            offlineContentId2,
            `${cleanSeriesId}_S${season || 1}E${episode || 1}`,
            `${cleanSeriesId}-ep${episode || 1}`,
            `s1:${offlineContentId1.replace(/^(s1|s2|s3):/, '')}`,
            `s1:${offlineContentId2.replace(/^(s1|s2|s3):/, '')}`,
            `s2:${offlineContentId1.replace(/^(s1|s2|s3):/, '')}`,
            `s2:${offlineContentId2.replace(/^(s1|s2|s3):/, '')}`,
            `s3:${offlineContentId1.replace(/^(s1|s2|s3):/, '')}`,
            `s3:${offlineContentId2.replace(/^(s1|s2|s3):/, '')}`,
          ]);

          const downloadedItem = fetchedDownloads.find(
            (d) => searchIds.has(d.contentId) && d.status === 'COMPLETED',
          );

          if (downloadedItem?.localPlaylistPath) {
            applyResponse(server, {
              success: true,
              masterPlaylistUrl: downloadedItem.localPlaylistPath,
              title: decodedTitle,
              type,
              movieId: overrideMovieId || movieId || '',
              subtitleTracks: downloadedItem.subtitleTracks?.map((t) => ({
                label: t.label,
                language: t.language,
                url: t.localPath || t.url,
              })),
              ...(type === 'series' && season && episode
                ? {
                    season: parseInt(season, 10),
                    episode: parseInt(episode, 10),
                  }
                : {}),
            });
            setIsRefetching(false);
            if (replacingSessionTimerRef.current) {
              clearTimeout(replacingSessionTimerRef.current);
            }
            replacingSessionTimerRef.current = setTimeout(() => {
              setIsReplacingSession(false);
              replacingSessionTimerRef.current = null;
            }, 2000);
            return;
          }
        }

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
          // Unified response handling via StreamUrlService (called within useStreamUrls)
          applyResponse(server, response);

          // Server 2 specific audio track handling
          if (server === 's2') {
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
            setS2ActiveTrackId(overrideMovieId || movieId || null);
          }
        } else {
          setRefetchError('Failed to load stream');
        }
      } catch (err) {
        const httpStatus = (err as { status?: number })?.status;
        if (
          server === 's2' &&
          (httpStatus === 500 || httpStatus === 503) &&
          !s2ColdStartRetried.current
        ) {
          s2ColdStartRetried.current = true;
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
        replacingSessionTimerRef.current = setTimeout(() => {
          setIsReplacingSession(false);
          replacingSessionTimerRef.current = null;
        }, 2000);
      }
    },
    [title, type, season, episode, movieId, seriesId, server, applyResponse],
  );

  const handleBeforeS2Discovery = useCallback(() => {
    if (replacingSessionTimerRef.current)
      clearTimeout(replacingSessionTimerRef.current);
    setIsReplacingSession(true);
    replacingSessionTimerRef.current = setTimeout(() => {
      setIsReplacingSession(false);
      replacingSessionTimerRef.current = null;
    }, 90_000);
  }, []);

  const handleS2Discovered = useCallback(
    (response: PlayResponse) => {
      applyS2Subtitles(response);
      if (replacingSessionTimerRef.current)
        clearTimeout(replacingSessionTimerRef.current);
      replacingSessionTimerRef.current = setTimeout(() => {
        setIsReplacingSession(false);
        replacingSessionTimerRef.current = null;
      }, 2000);
    },
    [applyS2Subtitles],
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
    onDiscovered: handleS2Discovered,
    onBeforeDiscovery: handleBeforeS2Discovery,
    initialTracks: s2InitialAudioTracks,
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
    const handleUnload = () => stopVideo();
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('pagehide', handleUnload);
      if (replacingSessionTimerRef.current) {
        clearTimeout(replacingSessionTimerRef.current);
      }
      if (socket?.connected) {
        socket.emit(WS_EVENTS.STREAM_STOP);
      }
      stopVideo();
    };
  }, [socket]);

  const mountFetchedRef = useRef(false);
  // Handle initial fetch and subsequent navigation (switching episodes/seasons)
  const prevParamsRef = useRef<{
    movieId?: string;
    season?: string | null;
    episode?: string | null;
    server?: string;
  }>(undefined);

  useEffect(() => {
    // 1. If we have an initial stream URL (e.g. passed from Search page),
    // skip the first fetch to avoid redundant API calls.
    if (initialStreamUrlRaw && !mountFetchedRef.current) {
      mountFetchedRef.current = true;
      prevParamsRef.current = { movieId, season, episode, server };
      return;
    }

    // 2. Detect if identifying parameters have changed
    const paramsChanged =
      prevParamsRef.current?.movieId !== movieId ||
      prevParamsRef.current?.season !== season ||
      prevParamsRef.current?.episode !== episode ||
      prevParamsRef.current?.server !== server;

    if ((!mountFetchedRef.current || paramsChanged) && title) {
      mountFetchedRef.current = true;
      prevParamsRef.current = { movieId, season, episode, server };
      refetchStream();
    }
  }, [
    movieId,
    season,
    episode,
    server,
    title,
    refetchStream,
    initialStreamUrlRaw,
  ]);

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
