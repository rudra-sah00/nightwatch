'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  type ContentProgress,
  fetchContentProgress,
  getCachedProgress,
} from '@/features/watch/api';
import { cacheSeriesData } from '@/features/watch/player/useNextEpisode';
import { getSocket } from '@/lib/ws';
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

// Use ContentProgress from watch/api.ts
type WatchProgress = ContentProgress;

interface UseContentDetailReturn {
  // State
  show: ShowDetails | null;
  episodes: Episode[];
  isLoading: boolean;
  isLoadingEpisodes: boolean;
  isPlaying: boolean;
  playingEpisodeId: string | number | null;
  selectedSeason: Season | null;
  hasWatchProgress: boolean;
  watchProgress: WatchProgress | null;

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
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingEpisodeId, setPlayingEpisodeId] = useState<
    string | number | null
  >(null);
  // Initialize hasWatchProgress to true if coming from Continue Watching
  const [hasWatchProgress, setHasWatchProgress] =
    useState(fromContinueWatching);
  const [watchProgress, setWatchProgress] = useState<WatchProgress | null>(
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

      setIsLoadingEpisodes(true);
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
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingEpisodes(false);
        }
      }
    },
    [],
  );

  // Check for existing watch progress and set default season
  useEffect(() => {
    if (!show || progressCheckedRef.current) return;

    const socket = getSocket();
    const isSeries = show.contentType === ContentType.Series;

    // Helper to process progress response (used for both cache hit and socket response)
    const processProgress = (
      hasProgress: boolean,
      progress: WatchProgress | null,
    ) => {
      progressCheckedRef.current = true;

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

      // No progress or no matching season - default to LAST season (highest number)
      if (isSeries && show.seasons && show.seasons.length > 0) {
        const sortedSeasons = [...show.seasons].sort(
          (a, b) => (b.seasonNumber || 0) - (a.seasonNumber || 0),
        );
        const lastSeason = sortedSeasons[0];
        setSelectedSeason(lastSeason);
        loadSeasonEpisodesInternal(show, lastSeason);
      }
    };

    // Check cache first
    const cached = getCachedProgress(show.id);
    if (cached) {
      processProgress(cached.hasProgress, cached.progress);
      return;
    }

    // Check if there's watch progress for this content via socket
    if (socket?.connected) {
      fetchContentProgress(show.id, (progress, hasProgress) => {
        processProgress(hasProgress, progress);
      });
    } else {
      // No socket - just set default season
      progressCheckedRef.current = true;
      if (isSeries && show.seasons && show.seasons.length > 0) {
        const sortedSeasons = [...show.seasons].sort(
          (a, b) => (b.seasonNumber || 0) - (a.seasonNumber || 0),
        );
        const lastSeason = sortedSeasons[0];
        setSelectedSeason(lastSeason);
        loadSeasonEpisodesInternal(show, lastSeason);
      }
    }
  }, [show, loadSeasonEpisodesInternal]);

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
        } else if (episode) {
          // Cache series data before playing (for next episode feature)
          const seasonNumber = episode.seasonNumber || 1;
          cacheSeriesData(
            showData.id,
            showData,
            seasonNumber,
            currentEpisodes,
            episode.duration,
          );

          const description = showData.description
            ? encodeURIComponent(showData.description)
            : '';
          const year = showData.year ? encodeURIComponent(showData.year) : '';
          const posterUrl = showData.posterUrl
            ? encodeURIComponent(showData.posterUrl)
            : '';

          let url = `/watch/${showData.id}?type=series&title=${encodeURIComponent(showData.title)}&season=${seasonNumber}&episode=${episode.episodeNumber}&seriesId=${showData.id}`;
          if (description) url += `&description=${description}`;
          if (year) url += `&year=${year}`;
          if (posterUrl) url += `&poster=${posterUrl}`;

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
    if (!show || !watchProgress) {
      toast.error('Unable to resume - progress data not available.');
      return;
    }

    if (show.contentType === ContentType.Movie) {
      // Movie resume
      await handlePlayInternal(show, [], undefined);
    } else {
      // Series resume - create episode object for playback
      if (!watchProgress.seasonNumber || !watchProgress.episodeNumber) {
        toast.error('Unable to resume - episode information missing.');
        return;
      }

      const resumeEpisode: Episode = {
        episodeId: `resume-${show.id}-S${watchProgress.seasonNumber}E${watchProgress.episodeNumber}`,
        seriesId: show.id,
        episodeNumber: watchProgress.episodeNumber,
        seasonNumber: watchProgress.seasonNumber,
        title: `Season ${watchProgress.seasonNumber} Episode ${watchProgress.episodeNumber}`,
        thumbnailUrl: show.posterUrl || '',
        duration: 0,
      };
      await handlePlayInternal(show, episodes, resumeEpisode);
    }
  }, [show, watchProgress, episodes, handlePlayInternal]);

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
