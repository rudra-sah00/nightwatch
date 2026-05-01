'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cacheSeriesData } from '@/features/watch/player/hooks/useNextEpisode';
import type { ContentProgress } from '@/types/content';
import { ContentType, type Episode, type ShowDetails } from '../types';

/** Props for the {@link usePlaybackActions} hook. */
interface UsePlaybackActionsProps {
  show: ShowDetails | null;
  episodes: Episode[];
  watchProgress: ContentProgress | null;
  fromContinueWatching: boolean;
}

/** Return value of the {@link usePlaybackActions} hook. */
interface UsePlaybackActionsReturn {
  isPlaying: boolean;
  playingEpisodeId: string | number | null;
  handlePlay: (episode?: Episode) => Promise<void>;
  handleResume: () => Promise<void>;
}

/**
 * Hook that builds the play and resume navigation URLs and handles
 * router transitions to the `/watch` page.
 *
 * For movies it constructs a single URL; for series it resolves the
 * target episode (explicit, first-of-season, or from watch-progress),
 * caches series metadata for the next-episode feature, and navigates.
 * Includes an 8-second timeout guard that resets loading state if
 * navigation stalls.
 *
 * @param props - {@link UsePlaybackActionsProps}
 * @returns {@link UsePlaybackActionsReturn}
 */
export function usePlaybackActions({
  show,
  episodes,
  watchProgress,
  fromContinueWatching,
}: UsePlaybackActionsProps): UsePlaybackActionsReturn {
  const t = useTranslations('common.toasts');
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
          let url = `/watch/${encodeURIComponent(showData.id)}?type=movie&title=${encodeURIComponent(showData.title)}&server=${providerId}`;
          if (description) url += `&description=${description}`;
          if (year) url += `&year=${year}`;
          if (posterUrl) url += `&poster=${posterUrl}`;

          // Navigate to watch page with timeout protection
          const navigationPromise = router.push(url);

          // Set 8-second timeout to reset loading state if navigation fails
          const timeoutId = setTimeout(() => {
            toast.error(t('playbackFailed'));
            setIsPlaying(false);
            setPlayingEpisodeId(null);
          }, 8000);

          // Clear timeout when navigation completes
          Promise.resolve(navigationPromise).finally(() => {
            clearTimeout(timeoutId);
          });
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
            toast.error(t('noEpisodes'));
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
          let url = `/watch/${encodeURIComponent(showData.id)}?type=series&title=${encodeURIComponent(showData.title)}&season=${seasonNumber}&episode=${episodeToPlay.episodeNumber}&seriesId=${encodeURIComponent(showData.id)}&server=${providerId}`;
          if (description) url += `&description=${description}`;
          if (year) url += `&year=${year}`;
          if (posterUrl) url += `&poster=${posterUrl}`;
          if (episodeTitle) url += `&episodeTitle=${episodeTitle}`;

          // Navigate to watch page with timeout protection
          const navigationPromise = router.push(url);

          // Set 8-second timeout to reset loading state if navigation fails
          const timeoutId = setTimeout(() => {
            toast.error(t('playbackFailed'));
            setIsPlaying(false);
            setPlayingEpisodeId(null);
          }, 8000);

          // Clear timeout when navigation completes
          Promise.resolve(navigationPromise).finally(() => {
            clearTimeout(timeoutId);
          });
        }
      } catch {
        // Navigation error
        toast.error(t('startFailed'));
        setIsPlaying(false);
        setPlayingEpisodeId(null);
      }
    },
    [router, t],
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
      toast.error(t('resumeUnavailable'));
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
      toast.error(t('loadingProgress'));
      return;
    }

    if (!watchProgress) {
      toast.error(t('progressUnavailable'));
      return;
    }

    if (!watchProgress.seasonNumber || !watchProgress.episodeNumber) {
      toast.error(t('episodeMissing'));
      return;
    }

    const resumeEpisode: Episode = {
      episodeId: `resume-${show.id}-S${watchProgress.seasonNumber}E${watchProgress.episodeNumber}`,
      seriesId: show.id,
      episodeNumber: watchProgress.episodeNumber,
      seasonNumber: watchProgress.seasonNumber,
      title:
        watchProgress.episodeTitle ||
        t('actions.episodeFallbackTitle', {
          number: watchProgress.episodeNumber,
        }),
      thumbnailUrl: show.posterUrl || '',
      duration: 0,
    };
    await handlePlayInternal(show, episodes, resumeEpisode);
  }, [
    show,
    watchProgress,
    episodes,
    handlePlayInternal,
    fromContinueWatching,
    t,
  ]);

  return { isPlaying, playingEpisodeId, handlePlay, handleResume };
}
