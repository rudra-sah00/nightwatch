'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { ContentProgress } from '@/features/watch/api';
import { cacheSeriesData } from '@/features/watch/player/hooks/useNextEpisode';
import { ContentType, type Episode, type ShowDetails } from '../types';

interface UsePlaybackActionsProps {
  show: ShowDetails | null;
  episodes: Episode[];
  watchProgress: ContentProgress | null;
  fromContinueWatching: boolean;
}

interface UsePlaybackActionsReturn {
  isPlaying: boolean;
  playingEpisodeId: string | number | null;
  handlePlay: (episode?: Episode) => Promise<void>;
  handleResume: () => Promise<void>;
}

export function usePlaybackActions({
  show,
  episodes,
  watchProgress,
  fromContinueWatching,
}: UsePlaybackActionsProps): UsePlaybackActionsReturn {
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingEpisodeId, setPlayingEpisodeId] = useState<
    string | number | null
  >(null);

  // Reset loading state on mount (important for when returning from video player)
  useEffect(() => {
    setIsPlaying(false);
    setPlayingEpisodeId(null);
  }, []);

  // Internal play function
  const handlePlayInternal = useCallback(
    async (
      showData: ShowDetails,
      currentEpisodes: Episode[],
      episode?: Episode,
    ) => {
      setIsPlaying(true);
      // Track which episode is being played for UI feedback
      if (episode) {
        setPlayingEpisodeId(episode.episodeId || episode.episodeNumber);
      }

      try {
        if (showData.contentType === ContentType.Movie) {
          const description = showData.description
            ? encodeURIComponent(showData.description)
            : '';
          const year = showData.year ? encodeURIComponent(showData.year) : '';
          const posterUrl = showData.posterUrl
            ? encodeURIComponent(showData.posterUrl)
            : '';

          const providerId = showData.id.split(':')[0] || 's1';
          let url = `/watch/${showData.id}?type=movie&title=${encodeURIComponent(showData.title)}&server=${providerId}`;
          if (description) url += `&description=${description}`;
          if (year) url += `&year=${year}`;
          if (posterUrl) url += `&poster=${posterUrl}`;

          router.push(url);
          // Playing state will be reset when component unmounts or navigation completes
        } else {
          // Series playback
          let episodeToPlay = episode;

          // If no episode provided, play first episode of selected/current season
          // Note: episodes passed here should be for the current season
          if (!episodeToPlay && currentEpisodes.length > 0) {
            // Sort by episode number and get first
            const sortedEpisodes = currentEpisodes.toSorted(
              (a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0),
            );
            episodeToPlay = sortedEpisodes[0];
            setPlayingEpisodeId(
              episodeToPlay.episodeId || episodeToPlay.episodeNumber,
            );
          }

          if (!episodeToPlay) {
            toast.error('No episodes available to play.');
            setIsPlaying(false);
            setPlayingEpisodeId(null);
            return;
          }

          // Cache series data before playing (for next episode feature)
          const seasonNumber = episodeToPlay.seasonNumber || 1;
          cacheSeriesData(
            showData.id,
            showData,
            seasonNumber,
            currentEpisodes,
            episodeToPlay.duration,
          );

          const description = showData.description
            ? encodeURIComponent(showData.description)
            : '';
          const year = showData.year ? encodeURIComponent(showData.year) : '';
          const posterUrl = showData.posterUrl
            ? encodeURIComponent(showData.posterUrl)
            : '';
          const episodeTitle = episodeToPlay.title
            ? encodeURIComponent(episodeToPlay.title)
            : '';

          const providerId = showData.id.split(':')[0] || 's1';
          let url = `/watch/${showData.id}?type=series&title=${encodeURIComponent(showData.title)}&season=${seasonNumber}&episode=${episodeToPlay.episodeNumber}&seriesId=${showData.id}&server=${providerId}`;
          if (description) url += `&description=${description}`;
          if (year) url += `&year=${year}`;
          if (posterUrl) url += `&poster=${posterUrl}`;
          if (episodeTitle) url += `&episodeTitle=${episodeTitle}`;

          router.push(url);
        }
      } catch {
        // Navigation error
        toast.error('Failed to start playback');
        setIsPlaying(false);
        setPlayingEpisodeId(null);
      }
    },
    [router],
  );

  const handlePlay = useCallback(
    async (episode?: Episode) => {
      if (!show) return;
      await handlePlayInternal(show, episodes, episode);
    },
    [show, episodes, handlePlayInternal],
  );

  const handleResume = useCallback(async () => {
    if (!show) {
      toast.error('Unable to resume - content data not available.');
      return;
    }

    if (show.contentType === ContentType.Movie) {
      // Movie resume - doesn't require episode info
      await handlePlayInternal(show, [], undefined);
      return;
    }

    // Series resume - requires watchProgress with episode information
    // If watchProgress is not loaded yet but we're from continue watching, wait briefly
    if (!watchProgress && fromContinueWatching) {
      toast.error('Loading progress data, please wait...');
      return;
    }

    if (!watchProgress) {
      toast.error('Unable to resume - progress data not available.');
      return;
    }

    if (!watchProgress.seasonNumber || !watchProgress.episodeNumber) {
      toast.error('Unable to resume - episode information missing.');
      return;
    }

    const resumeEpisode: Episode = {
      episodeId: `resume-${show.id}-S${watchProgress.seasonNumber}E${watchProgress.episodeNumber}`,
      seriesId: show.id,
      episodeNumber: watchProgress.episodeNumber,
      seasonNumber: watchProgress.seasonNumber,
      title:
        watchProgress.episodeTitle || `Episode ${watchProgress.episodeNumber}`,
      thumbnailUrl: show.posterUrl || '',
      duration: 0,
    };
    await handlePlayInternal(show, episodes, resumeEpisode);
  }, [show, watchProgress, episodes, handlePlayInternal, fromContinueWatching]);

  return { isPlaying, playingEpisodeId, handlePlay, handleResume };
}
