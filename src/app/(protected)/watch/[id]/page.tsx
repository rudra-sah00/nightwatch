'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { playVideo } from '@/features/search/api';
import type { PlayResponse } from '@/features/search/types';
import { WatchPage } from '@/features/watch/page/WatchPage';
import type { VideoMetadata } from '@/features/watch/player/types';
import { getProxyUrl } from '@/lib/proxy';

function WatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const _router = useRouter();

  const movieId = params.id as string;
  const type = (searchParams.get('type') || 'movie') as 'movie' | 'series';
  const title = searchParams.get('title') || 'Unknown';
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');
  const description = searchParams.get('description');
  const year = searchParams.get('year');
  const poster = searchParams.get('poster');
  const seriesId = searchParams.get('seriesId');

  // Get the stream URL from query params (passed from play response)
  const streamParam = searchParams.get('stream');
  const initialStreamUrl = streamParam ? decodeURIComponent(streamParam) : null;

  // Get the caption URL from query params
  const captionParam = searchParams.get('caption');
  const initialCaptionUrl = captionParam
    ? decodeURIComponent(captionParam)
    : null;

  // Get the sprite URL from query params
  const spriteParam = searchParams.get('sprite');
  const initialSpriteVtt = spriteParam
    ? decodeURIComponent(spriteParam)
    : undefined;

  // Decode and proxy poster URL
  const posterUrl = poster
    ? getProxyUrl(decodeURIComponent(poster))
    : undefined;

  // State for dynamically fetched stream (on page reload)
  // CRITICAL: We don't proxy initial params here because they might already be proxied or raw?
  // Actually, if we navigated from standard page, they are likely raw. We should proxy them too?
  // Let's assume passed params are raw and we proxy them when setting state.
  // But wait, the state setters in useEffect below invoke this.
  const [streamUrl, setStreamUrl] = useState<string | null>(
    initialStreamUrl ? getProxyUrl(initialStreamUrl) || null : null,
  );
  const [captionUrl, setCaptionUrl] = useState<string | null>(
    initialCaptionUrl ? getProxyUrl(initialCaptionUrl) || null : null,
  );
  const [spriteVtt, setSpriteVtt] = useState<string | undefined>(
    initialSpriteVtt ? getProxyUrl(initialSpriteVtt) : undefined,
  );
  const [subtitleTracks, setSubtitleTracks] = useState<
    { id: string; label: string; language: string; src: string }[] | undefined
  >(undefined);
  const [isRefetching, setIsRefetching] = useState(false);
  const [refetchError, setRefetchError] = useState<string | null>(null);

  // CRITICAL: Sync state when URL params change (soft navigation for next episode)
  useEffect(() => {
    // Only update if the INITIAL (raw) values changed.
    // React bails out automatically if set state is same as current.
    setStreamUrl(getProxyUrl(initialStreamUrl) || null);
    setCaptionUrl(getProxyUrl(initialCaptionUrl) || null);
    setSpriteVtt(getProxyUrl(initialSpriteVtt));

    // Reset error state on navigation
    setRefetchError(null);
  }, [initialStreamUrl, initialCaptionUrl, initialSpriteVtt]);

  const metadata: VideoMetadata = {
    title: decodeURIComponent(title),
    type,
    season: season ? parseInt(season, 10) : undefined,
    episode: episode ? parseInt(episode, 10) : undefined,
    movieId,
    seriesId: seriesId || undefined,
    description: description ? decodeURIComponent(description) : undefined,
    year: year ? decodeURIComponent(year) : undefined,
    posterUrl,
  };

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
          season: parseInt(season, 10),
          episode: parseInt(episode, 10),
        });
      } else {
        response = await playVideo({
          type: 'movie',
          title: decodedTitle,
        });
      }

      if (response.success && response.masterPlaylistUrl) {
        setStreamUrl(getProxyUrl(response.masterPlaylistUrl) || null);
        if (response.captionSrt)
          setCaptionUrl(getProxyUrl(response.captionSrt) || null);
        if (response.spriteVtt) setSpriteVtt(getProxyUrl(response.spriteVtt));
        if (response.subtitleTracks && response.subtitleTracks.length > 0) {
          setSubtitleTracks(
            response.subtitleTracks.map((t, index) => ({
              id: t.language ? `${t.language}-${index}` : `track-${index}`,
              ...t,
              src: getProxyUrl(t.url) || '',
            })),
          );
        } else {
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
  }, [title, type, season, episode]);

  // Auto-refetch if no stream URL on mount (page reload scenario)
  useEffect(() => {
    if (!initialStreamUrl && title) {
      refetchStream();
    }
  }, [initialStreamUrl, title, refetchStream]);

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
      externalLoading={isRefetching}
      error={refetchError}
      onRetry={refetchStream}
    />
  );
}

export default function WatchRoutePage() {
  return <WatchContent />;
}
