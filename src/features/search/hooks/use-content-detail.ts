'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  type ContentProgress,
  fetchContentProgress,
  getCachedProgress,
} from '@/features/watch/api';
import { cacheSeriesData } from '@/features/watch/player/useNextEpisode';
import { useSocket } from '@/providers/socket-provider';
import { getSeriesEpisodes, getShowDetails } from '../api';
import {
  ContentType,
  type Episode,
  type Season,
  type ShowDetails,
} from '../types';

// Re-export for backwards compatibility
export { invalidateProgressCache } from '@/features/watch/api';

interface UseContentDetailOptions {
  contentId: string;
  fromContinueWatching?: boolean;
}

interface UseContentDetailReturn {
  // State
  show: ShowDetails | null;
  episodes: Episode[];
  isLoading: boolean;
  isLoadingEpisodes: boolean;
  isLoadingProgress: boolean;
  isPlaying: boolean;
  playingEpisodeId: string | number | null;
  selectedSeason: Season | null;
  hasWatchProgress: boolean;
  watchProgress: ContentProgress | null;

  // Actions
  handleSeasonSelect: (season: Season) => void;
  handlePlay: (episode?: Episode) => Promise<void>;
  handleResume: () => Promise<void>;
}

export function useContentDetail({
  contentId,
  fromContinueWatching = false,
}: UseContentDetailOptions): UseContentDetailReturn {
  const router = useRouter();
  const [show, setShow] = useState<ShowDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEpisodes, startEpisodesTransition] = useTransition();
  // Always start with loading progress state to check if user has watch history
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingEpisodeId, setPlayingEpisodeId] = useState<
    string | number | null
  >(null);
  // Initialize hasWatchProgress to true if coming from Continue Watching (optimistic UI)
  const [hasWatchProgress, setHasWatchProgress] =
    useState(fromContinueWatching);
  const [watchProgress, setWatchProgress] = useState<ContentProgress | null>(
    null,
  );
  const progressCheckedRef = useRef(false);

  // Fetch show details
  useEffect(() => {
    const controller = new AbortController();

    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        progressCheckedRef.current = false;
        const details = await getShowDetails(contentId, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setShow(details);
        }

        // For series, we'll wait for progress check before selecting season
        // For movies, nothing to do here
      } catch (error: unknown) {
        // Check for abort in multiple ways - error name, or signal aborted
        const isAborted =
          (error instanceof Error && error.name === 'AbortError') ||
          controller.signal.aborted;

        if (isAborted) return; // Silent return for aborted requests

        toast.error(
          'Failed to load show details. Please check your connection and try again.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      controller.abort();
    };
  }, [contentId]);

  // Internal function to load episodes (to avoid dependency issues)
  const loadSeasonEpisodesInternal = useCallback(
    async (showData: ShowDetails, season: Season) => {
      // Check if we already have ALL episodes for this season in showData
      const localEpisodes = showData.episodes?.filter(
        (ep) => ep.seasonNumber === season.seasonNumber,
      );

      // Only use local episodes if we have ALL of them (compare with season.episodeCount)
      // If episodeCount is unknown (0), always fetch to be safe
      const hasAllEpisodes =
        localEpisodes &&
        localEpisodes.length > 0 &&
        season.episodeCount > 0 &&
        localEpisodes.length >= season.episodeCount;

      if (hasAllEpisodes) {
        // Use locally available episodes - no API call needed
        setEpisodes(localEpisodes);
        return;
      }

      // Need to fetch from API
      const controller = new AbortController();

      startEpisodesTransition(async () => {
        try {
          const { episodes: seasonEpisodes } = await getSeriesEpisodes(
            showData.id,
            season.seasonId,
            {
              signal: controller.signal,
            },
          );
          if (!controller.signal.aborted) {
            setEpisodes(seasonEpisodes);
          }
        } catch (error: unknown) {
          // Check for abort in multiple ways
          const isAborted =
            (error instanceof Error && error.name === 'AbortError') ||
            controller.signal.aborted;

          if (isAborted) return; // Silent return for aborted requests

          toast.error(
            'Failed to load episode list. Using cached data if available.',
          );
          if (showData.episodes && !controller.signal.aborted) {
            setEpisodes(
              showData.episodes.filter(
                (ep) => ep.seasonNumber === season.seasonNumber,
              ),
            );
          }
        }
      });
    },
    [],
  );

  // Check for existing watch progress and set default season
  // Re-runs reactively when socket connects (via isConnected from provider)
  const { isConnected } = useSocket();

  useEffect(() => {
    if (!show || progressCheckedRef.current) return;

    const isSeries = show.contentType === ContentType.Series;

    // Helper to process progress response (used for both cache hit and socket response)
    const processProgress = (
      hasProgress: boolean,
      progress: ContentProgress | null,
    ) => {
      progressCheckedRef.current = true;
      setIsLoadingProgress(false);

      if (hasProgress && progress && progress.progressSeconds > 0) {
        setHasWatchProgress(true);
        setWatchProgress(progress);

        // For series: Set season to the one from progress
        if (isSeries && show.seasons && show.seasons.length > 0) {
          const progressSeason = show.seasons.find(
            (s) => s.seasonNumber === progress?.seasonNumber,
          );
          if (progressSeason) {
            setSelectedSeason(progressSeason);
            loadSeasonEpisodesInternal(show, progressSeason);
            return;
          }
        }
      }

      // No progress or no matching season - default to LATEST season
      if (isSeries && show.seasons && show.seasons.length > 0) {
        const sortedSeasons = show.seasons.toSorted(
          (a, b) => (a.seasonNumber || 0) - (b.seasonNumber || 0),
        );
        const latestSeason = sortedSeasons[sortedSeasons.length - 1];
        setSelectedSeason(latestSeason);
        loadSeasonEpisodesInternal(show, latestSeason);
      }
    };

    // Check cache first
    const cached = getCachedProgress(show.id);
    if (cached) {
      processProgress(cached.hasProgress, cached.progress);
      return;
    }

    // Check if there's watch progress for this content via socket
    if (isConnected) {
      fetchContentProgress(show.id, (progress, hasProgress) => {
        processProgress(hasProgress, progress);
      });
    } else {
      // No socket - just set default season (latest season)
      progressCheckedRef.current = true;
      setIsLoadingProgress(false);
      if (isSeries && show.seasons && show.seasons.length > 0) {
        const sortedSeasons = show.seasons.toSorted(
          (a, b) => (a.seasonNumber || 0) - (b.seasonNumber || 0),
        );
        const latestSeason = sortedSeasons[sortedSeasons.length - 1];
        setSelectedSeason(latestSeason);
        loadSeasonEpisodesInternal(show, latestSeason);
      }
    }
  }, [show, loadSeasonEpisodesInternal, isConnected]);

  // Load episodes when season changes (user-triggered)
  const loadSeasonEpisodes = useCallback(
    async (season: Season) => {
      if (!show) return;
      await loadSeasonEpisodesInternal(show, season);
    },
    [show, loadSeasonEpisodesInternal],
  );

  const handleSeasonSelect = useCallback(
    (season: Season) => {
      setSelectedSeason(season);
      loadSeasonEpisodes(season);
    },
    [loadSeasonEpisodes],
  );

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

          let url = `/watch/${showData.id}?type=movie&title=${encodeURIComponent(showData.title)}`;
          if (description) url += `&description=${description}`;
          if (year) url += `&year=${year}`;
          if (posterUrl) url += `&poster=${posterUrl}`;

          router.push(url);
          // Playing state will be reset when component unmounts or navigation completes
        } else {
          // Series playback
          let episodeToPlay = episode;

          // If no episode provided, play first episode of selected/current season
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

          let url = `/watch/${showData.id}?type=series&title=${encodeURIComponent(showData.title)}&season=${seasonNumber}&episode=${episodeToPlay.episodeNumber}&seriesId=${showData.id}`;
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

  // Resume from continue watching
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

  const handlePlay = useCallback(
    async (episode?: Episode) => {
      if (!show) return;
      await handlePlayInternal(show, episodes, episode);
    },
    [show, episodes, handlePlayInternal],
  );

  return {
    show,
    episodes,
    isLoading,
    isLoadingEpisodes,
    isLoadingProgress,
    isPlaying,
    playingEpisodeId,
    selectedSeason,
    hasWatchProgress,
    watchProgress,
    handleSeasonSelect,
    handlePlay,
    handleResume,
  };
}
