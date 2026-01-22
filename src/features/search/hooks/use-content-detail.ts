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
import { getSeriesEpisodes, getShowDetails, playVideo } from '../api';
import {
  ContentType,
  type Episode,
  type Season,
  type ShowDetails,
} from '../types';

// Re-export for backwards compatibility
export { invalidateProgressCache } from '@/features/watch/api';

/**
 * Parse runtime string to seconds
 * Supports formats like: "2h 30m", "1h 45m", "90m", "2h", "1:30:00", "90"
 */
function parseRuntimeToSeconds(runtime: string): number | undefined {
  if (!runtime) return undefined;

  // Try "Xh Ym" or "Xh" or "Ym" format
  const hMatch = runtime.match(/(\d+)\s*h/i);
  const mMatch = runtime.match(/(\d+)\s*m/i);

  if (hMatch || mMatch) {
    const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
    const minutes = mMatch ? parseInt(mMatch[1], 10) : 0;
    return hours * 3600 + minutes * 60;
  }

  // Try "H:MM:SS" or "MM:SS" format
  const colonMatch = runtime.match(/^(\d+):(\d+)(?::(\d+))?$/);
  if (colonMatch) {
    if (colonMatch[3]) {
      // H:MM:SS
      return (
        parseInt(colonMatch[1], 10) * 3600 +
        parseInt(colonMatch[2], 10) * 60 +
        parseInt(colonMatch[3], 10)
      );
    }
    // MM:SS
    return parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
  }

  // Try plain number (assume minutes)
  const plainNum = parseInt(runtime, 10);
  if (!Number.isNaN(plainNum)) {
    return plainNum * 60;
  }

  return undefined;
}

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

  const activePlayControllerRef = useRef<AbortController | null>(null);

  // Internal play function
  const handlePlayInternal = useCallback(
    async (
      showData: ShowDetails,
      currentEpisodes: Episode[],
      episode?: Episode,
    ) => {
      // Cancel previous play request if any
      if (activePlayControllerRef.current) {
        activePlayControllerRef.current.abort();
      }
      const controller = new AbortController();
      activePlayControllerRef.current = controller;

      setIsPlaying(true);
      // Track which episode is being played for UI feedback
      if (episode) {
        setPlayingEpisodeId(episode.episodeId || episode.episodeNumber);
      }
      try {
        if (showData.contentType === ContentType.Movie) {
          // Parse runtime string to seconds (e.g., "2h 30m" -> 9000)
          const movieDuration = showData.runtime
            ? parseRuntimeToSeconds(showData.runtime)
            : undefined;

          const response = await playVideo(
            {
              type: 'movie',
              title: showData.title,
              duration: movieDuration,
            },
            { signal: controller.signal },
          );

          if (controller.signal.aborted) return;

          if (
            response.success &&
            response.movieId &&
            response.masterPlaylistUrl
          ) {
            const streamUrl = encodeURIComponent(response.masterPlaylistUrl);
            const captionUrl = response.captionSrt
              ? encodeURIComponent(response.captionSrt)
              : '';
            const description = showData.description
              ? encodeURIComponent(showData.description)
              : '';
            const year = showData.year ? encodeURIComponent(showData.year) : '';
            const posterUrl = showData.posterUrl
              ? encodeURIComponent(showData.posterUrl)
              : '';

            let url = `/watch/${response.movieId}?type=movie&title=${encodeURIComponent(showData.title)}&stream=${streamUrl}`;
            if (captionUrl) url += `&caption=${captionUrl}`;
            if (response.spriteVtt)
              url += `&sprite=${encodeURIComponent(response.spriteVtt)}`;
            if (description) url += `&description=${description}`;
            if (year) url += `&year=${year}`;
            if (posterUrl) url += `&poster=${posterUrl}`;

            router.push(url);
            // Reset playing state immediately after navigation starts
            setIsPlaying(false);
            setPlayingEpisodeId(null);
          } else {
            toast.error(
              'Unable to start movie playback. The stream may be temporarily unavailable.',
            );
            setIsPlaying(false);
            setPlayingEpisodeId(null);
          }
        } else if (episode) {
          // Cache series data before playing (for next episode feature)
          // Pass episode duration for smart cache expiry
          const seasonNumber = episode.seasonNumber || 1;
          cacheSeriesData(
            showData.id,
            showData,
            seasonNumber,
            currentEpisodes,
            episode.duration,
          );

          const response = await playVideo(
            {
              type: 'series',
              title: showData.title,
              season: seasonNumber,
              episode: episode.episodeNumber,
              duration: episode.duration, // Pass episode duration for smart cache TTL
            },
            { signal: controller.signal },
          );

          if (controller.signal.aborted) return;

          if (
            response.success &&
            response.movieId &&
            response.masterPlaylistUrl
          ) {
            const streamUrl = encodeURIComponent(response.masterPlaylistUrl);
            const captionUrl = response.captionSrt
              ? encodeURIComponent(response.captionSrt)
              : '';
            const description = showData.description
              ? encodeURIComponent(showData.description)
              : '';
            const year = showData.year ? encodeURIComponent(showData.year) : '';
            const posterUrl = showData.posterUrl
              ? encodeURIComponent(showData.posterUrl)
              : '';

            let url = `/watch/${response.movieId}?type=series&title=${encodeURIComponent(showData.title)}&season=${seasonNumber}&episode=${episode.episodeNumber}&seriesId=${showData.id}&stream=${streamUrl}`;
            if (captionUrl) url += `&caption=${captionUrl}`;
            if (response.spriteVtt)
              url += `&sprite=${encodeURIComponent(response.spriteVtt)}`;
            if (description) url += `&description=${description}`;
            if (year) url += `&year=${year}`;
            if (posterUrl) url += `&poster=${posterUrl}`;

            router.push(url);
            // Reset playing state immediately after navigation starts
            setIsPlaying(false);
            setPlayingEpisodeId(null);
          } else {
            toast.error(
              'Unable to start episode playback. The stream may be temporarily unavailable.',
            );
            setIsPlaying(false);
            setPlayingEpisodeId(null);
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred';

        // Provide more specific error messages based on error type
        if (
          errorMessage.includes('timeout') ||
          errorMessage.includes('network')
        ) {
          toast.error(
            'Connection timed out. Please check your internet and try again.',
          );
        } else if (errorMessage.includes('stream')) {
          toast.error('Stream unavailable. Please try again in a moment.');
        } else {
          toast.error(`Playback failed: ${errorMessage}`);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsPlaying(false);
          setPlayingEpisodeId(null);
          // If this was the active controller, clear it
          if (activePlayControllerRef.current === controller) {
            activePlayControllerRef.current = null;
          }
        }
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
