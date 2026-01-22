'use client';

import { Loader2 } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { playVideo } from '@/features/search/api';
import type { PlayResponse } from '@/features/search/types';
import { WatchPage } from '@/features/watch/page/WatchPage';
import type { VideoMetadata } from '@/features/watch/player/types';

function WatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

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

  // Decode poster URL
  const posterUrl = poster ? decodeURIComponent(poster) : undefined;

  // State for dynamically fetched stream (on page reload)
  const [streamUrl, setStreamUrl] = useState<string | null>(initialStreamUrl);
  const [captionUrl, setCaptionUrl] = useState<string | null>(
    initialCaptionUrl,
  );
  const [spriteVtt, setSpriteVtt] = useState<string | undefined>(
    initialSpriteVtt,
  );
  const [isRefetching, setIsRefetching] = useState(false);
  const [refetchError, setRefetchError] = useState<string | null>(null);

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
        setStreamUrl(response.masterPlaylistUrl);
        if (response.captionSrt) setCaptionUrl(response.captionSrt);
        if (response.spriteVtt) setSpriteVtt(response.spriteVtt);
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

  // Loading state while refetching
  if (isRefetching) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
        <Loader2 className="w-16 h-16 text-white animate-spin" />
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
          {refetchError && (
            <button
              type="button"
              onClick={refetchStream}
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          )}
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

  return (
    <WatchPage
      streamUrl={streamUrl}
      metadata={metadata}
      captionUrl={captionUrl}
      spriteVtt={spriteVtt}
      description={description ? decodeURIComponent(description) : undefined}
    />
  );
}

export default function WatchRoutePage() {
  return <WatchContent />;
}
