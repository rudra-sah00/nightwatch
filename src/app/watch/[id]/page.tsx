'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { EpisodesList, VideoMetadata } from '@/components/content';
import VideoPlayer from '@/components/video/VideoPlayer';
import { useSeriesData } from '@/hooks';
import { getEpisodeData, getVideoData } from '@/services/api/media';
import type { CompleteVideoData } from '@/types/content';

function WatchPageContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [videoData, setVideoData] = useState<CompleteVideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get episode from query params if present
  const episodeId = searchParams.get('episode');

  // Use custom hook for series data
  const { showDetails, selectedSeason, setSelectedSeason, seasonEpisodes } = useSeriesData({
    contentId: resolvedParams.id,
    episodeId,
    contentType: videoData?.metadata.content_type,
  });

  useEffect(() => {
    // Robust cancellation handling with AbortController
    const controller = new AbortController();

    const loadVideo = async () => {
      setLoading(true);
      setError(null);

      // Everyone fetches their own video data (own CDN token)
      try {
        let response:
          | Awaited<ReturnType<typeof getEpisodeData>>
          | Awaited<ReturnType<typeof getVideoData>>;
        if (episodeId) {
          response = await getEpisodeData(resolvedParams.id, episodeId, {
            signal: controller.signal,
          });
        } else {
          response = await getVideoData(resolvedParams.id, { signal: controller.signal });
        }

        if (controller.signal.aborted) return;

        if (!response.data?.video) {
          setError('Failed to load video');
          return;
        }

        setVideoData(response.data.video);
      } catch {
        if (!controller.signal.aborted) {
          setError('An error occurred while loading the video');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadVideo();

    return () => {
      controller.abort();
    };
  }, [resolvedParams.id, episodeId]);

  // Dynamic document title based on content
  useEffect(() => {
    if (videoData?.metadata) {
      const meta = videoData.metadata;
      const contentType = meta.content_type === 'Series' ? 'TV Series' : 'Movie';
      document.title = `${meta.title} (${contentType}) | Watch Rudra`;
    }

    // Cleanup: Reset title when leaving
    return () => {
      document.title = 'Watch Rudra - Stream Movies & TV Shows';
    };
  }, [videoData]);

  // Get current episode info
  const currentEpisode = episodeId
    ? showDetails?.episodes?.find((ep) => ep.episode_id === episodeId)
    : undefined;

  // Display title - use video metadata which has all the data
  const metadata = videoData?.metadata;
  const displayTitle = metadata?.title || showDetails?.title || 'Loading...';
  const displayYear = metadata?.year || showDetails?.year;
  const displayDescription = currentEpisode?.description || showDetails?.description;
  const displayGenre = metadata?.genre?.join(', ') || showDetails?.genre;
  const displayCast = metadata?.cast || showDetails?.cast;
  const displayRating = metadata?.rating || showDetails?.rating;
  const displayQuality = showDetails?.quality;
  const displayDuration = metadata?.duration; // in minutes

  // Parse episode info from title if it's a series
  const parseEpisodeTitle = (title: string) => {
    // Format: "Series Name - S5E7: Episode Title"
    const match = title.match(/^(.+?)\s*-\s*S(\d+)E(\d+):\s*(.+)$/);
    if (match) {
      return {
        seriesName: match[1],
        season: parseInt(match[2], 10),
        episode: parseInt(match[3], 10),
        episodeTitle: match[4],
      };
    }
    return null;
  };

  const episodeInfo =
    episodeId && metadata?.content_type === 'Series' ? parseEpisodeTitle(displayTitle) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
        <div className="container mx-auto px-4 pt-6">
          <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="w-full max-w-7xl mx-auto px-4 py-6">
          {/* Video player loading skeleton with beautiful animation */}
          <div className="relative aspect-video w-full rounded-2xl bg-zinc-900 overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />

            {/* Center loading animation */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
              {/* Animated loader */}
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" />
                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-white/20 to-white/5 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white/80 animate-pulse"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-label="Play icon"
                  >
                    <title>Play icon</title>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <p className="text-lg font-medium text-white/90 animate-pulse">
                  Preparing your video...
                </p>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>

              {/* Progress bar shimmer */}
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="h-10 w-2/3 bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-4 w-1/4 bg-zinc-800 rounded animate-pulse" />
            <div className="h-20 w-full bg-zinc-800 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Add shimmer keyframe styles */}
        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
          }
          .animate-shimmer {
            animation: shimmer 2s infinite;
          }
        `}</style>
      </div>
    );
  }

  if (error || !videoData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-label="Warning icon"
                >
                  <title>Warning</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <p className="text-zinc-300 text-xl font-medium">{error || 'Video not found'}</p>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-8 py-3 bg-white text-black font-semibold hover:bg-zinc-200 rounded-full transition-all hover:scale-105 shadow-lg"
              >
                Go Back Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      {/* Video Player - Full Width */}
      <div className="w-full max-w-7xl mx-auto px-4 pt-6 pb-6">
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">
          <VideoPlayer
            src={videoData.master_playlist_url}
            poster={videoData.metadata.poster_url}
            title={displayTitle}
            onBack={() => router.push('/')}
            subtitles={videoData.subtitles?.map((s) => ({
              language: s.language_name || s.language,
              url: s.vtt_url,
            }))}
            spriteSheets={videoData.sprite_sheets?.map((s) => ({
              spriteUrl: s.sprite_url,
              spriteWidth: s.sprite_width,
              spriteHeight: s.sprite_height,
              tileWidth: s.tile_width,
              tileHeight: s.tile_height,
              tilesPerRow: s.tiles_per_row,
              totalTiles: s.total_tiles,
              intervalSeconds: s.interval_seconds,
            }))}
          />
        </div>

        {/* Video Metadata */}
        <VideoMetadata
          title={displayTitle}
          year={displayYear}
          rating={displayRating}
          duration={displayDuration}
          quality={displayQuality}
          runtime={showDetails?.runtime}
          genre={displayGenre}
          description={displayDescription}
          cast={displayCast}
          contentType={metadata?.content_type}
          episodeInfo={episodeInfo}
          showDetails={showDetails}
        />

        {/* Episodes List - Only for Series */}
        {(showDetails?.content_type === 'Series' || metadata?.content_type === 'Series') &&
          showDetails?.seasons &&
          showDetails.seasons.length > 0 && (
            <EpisodesList
              showDetails={showDetails}
              currentEpisodeId={episodeId}
              selectedSeason={selectedSeason}
              seasonEpisodes={seasonEpisodes}
              contentId={resolvedParams.id}
              onSeasonChange={setSelectedSeason}
              onEpisodeClick={(episodeId) => {
                router.push(`/watch/${resolvedParams.id}?episode=${episodeId}`);
              }}
            />
          )}
      </div>
    </div>
  );
}

// Route protected by middleware
export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  return <WatchPageContent params={params} />;
}
