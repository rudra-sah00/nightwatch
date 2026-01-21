'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cacheSeriesData } from '@/features/watch/player/useNextEpisode';
import { getSocket } from '@/lib/ws';
import { getSeriesEpisodes, getShowDetails, playVideo } from '../api';
import { ContentType, type Episode, type Season, type ShowDetails } from '../types';

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
      return parseInt(colonMatch[1], 10) * 3600 + parseInt(colonMatch[2], 10) * 60 + parseInt(colonMatch[3], 10);
    }
    // MM:SS
    return parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
  }

  // Try plain number (assume minutes)
  const plainNum = parseInt(runtime, 10);
  if (!isNaN(plainNum)) {
    return plainNum * 60;
  }

  return undefined;
}

interface UseContentDetailOptions {
  contentId: string;
  fromContinueWatching?: boolean;
}

interface WatchProgress {
  seasonNumber?: number;
  episodeNumber?: number;
  progressSeconds: number;
  progressPercent: number;
}

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

interface SocketResponse {
  success: boolean;
  progress?: {
    progressSeconds: number;
    seasonNumber?: number;
    episodeNumber?: number;
    progressPercent: number;
  };
}

export function useContentDetail({ contentId, fromContinueWatching = false }: UseContentDetailOptions): UseContentDetailReturn {
  const router = useRouter();
  const [show, setShow] = useState<ShowDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingEpisodeId, setPlayingEpisodeId] = useState<string | number | null>(null);
  // Initialize hasWatchProgress to true if coming from Continue Watching
  const [hasWatchProgress, setHasWatchProgress] = useState(fromContinueWatching);
  const [watchProgress, setWatchProgress] = useState<WatchProgress | null>(null);
  const progressCheckedRef = useRef(false);

  // Fetch show details
  useEffect(() => {
    const controller = new AbortController();

    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        progressCheckedRef.current = false;
        const details = await getShowDetails(contentId, { signal: controller.signal });

        if (!controller.signal.aborted) {
          setShow(details);
        }

        // For series, we'll wait for progress check before selecting season
        // For movies, nothing to do here
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        toast.error('Failed to fetch show details');
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
  const loadSeasonEpisodesInternal = useCallback(async (showData: ShowDetails, season: Season) => {
    const controller = new AbortController();

    setIsLoadingEpisodes(true);
    try {
      const { episodes: seasonEpisodes } = await getSeriesEpisodes(showData.id, season.seasonId, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setEpisodes(seasonEpisodes);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      toast.error('Failed to load episodes');
      if (showData.episodes && !controller.signal.aborted) {
        setEpisodes(showData.episodes.filter((ep) => ep.seasonNumber === season.seasonNumber));
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingEpisodes(false);
      }
    }

    // Cleanup/Cancel previous request if needed? 
    // This function is called by effects/handlers - tricky to return cleanup.
    // Instead we rely on the fact it's async and we check aborted status.
    // But we need to store the controller to abort it if the hook unmounts or if it's called again?
    // For simplicity in this structure: we just ensure we don't set state if aborted.
    // Ideally we should track the active request to cancel it on next call.
  }, []);

  // Check for existing watch progress and set default season
  useEffect(() => {
    if (!show || progressCheckedRef.current) return;

    const socket = getSocket();
    const isSeries = show.contentType === ContentType.Series;

    // Check if there's watch progress for this content
    if (socket?.connected) {
      socket.emit(
        'watch:get_progress',
        { contentId: show.id },
        async (response: SocketResponse) => {
          progressCheckedRef.current = true;

          if (response?.success && response.progress && response.progress.progressSeconds > 0) {
            setHasWatchProgress(true);
            setWatchProgress({
              seasonNumber: response.progress.seasonNumber,
              episodeNumber: response.progress.episodeNumber,
              progressSeconds: response.progress.progressSeconds,
              progressPercent: response.progress.progressPercent,
            });

            // For series: Set season to the one from progress
            if (isSeries && show.seasons && show.seasons.length > 0) {
              const progressSeason = show.seasons.find(
                (s) => s.seasonNumber === response.progress?.seasonNumber,
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
            // Sort seasons by seasonNumber descending and take first (highest)
            const sortedSeasons = [...show.seasons].sort(
              (a, b) => (b.seasonNumber || 0) - (a.seasonNumber || 0),
            );
            const lastSeason = sortedSeasons[0];
            setSelectedSeason(lastSeason);
            loadSeasonEpisodesInternal(show, lastSeason);
          }
        },
      );
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
    async (showData: ShowDetails, currentEpisodes: Episode[], episode?: Episode) => {
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
          const movieDuration = showData.runtime ? parseRuntimeToSeconds(showData.runtime) : undefined;
          
          const response = await playVideo({
            type: 'movie',
            title: showData.title,
            duration: movieDuration,
          }, { signal: controller.signal });

          if (controller.signal.aborted) return;

          if (response.success && response.movieId && response.masterPlaylistUrl) {
            const streamUrl = encodeURIComponent(response.masterPlaylistUrl);
            const captionUrl = response.captionSrt ? encodeURIComponent(response.captionSrt) : '';
            const description = showData.description
              ? encodeURIComponent(showData.description)
              : '';
            const year = showData.year ? encodeURIComponent(showData.year) : '';
            const posterUrl = showData.posterUrl ? encodeURIComponent(showData.posterUrl) : '';

            let url = `/watch/${response.movieId}?type=movie&title=${encodeURIComponent(showData.title)}&stream=${streamUrl}`;
            if (captionUrl) url += `&caption=${captionUrl}`;
            if (response.spriteVtt) url += `&sprite=${encodeURIComponent(response.spriteVtt)}`;
            if (description) url += `&description=${description}`;
            if (year) url += `&year=${year}`;
            if (posterUrl) url += `&poster=${posterUrl}`;

            router.push(url);
          } else {
            toast.error('Movie playback failed - please try again');
          }
        } else if (episode) {
          // Cache series data before playing (for next episode feature)
          // Pass episode duration for smart cache expiry
          const seasonNumber = episode.seasonNumber || 1;
          cacheSeriesData(showData.id, showData, seasonNumber, currentEpisodes, episode.duration);
          
          const response = await playVideo({
            type: 'series',
            title: showData.title,
            season: seasonNumber,
            episode: episode.episodeNumber,
            duration: episode.duration, // Pass episode duration for smart cache TTL
          }, { signal: controller.signal });

          if (controller.signal.aborted) return;

          if (response.success && response.movieId && response.masterPlaylistUrl) {
            const streamUrl = encodeURIComponent(response.masterPlaylistUrl);
            const captionUrl = response.captionSrt ? encodeURIComponent(response.captionSrt) : '';
            const description = showData.description
              ? encodeURIComponent(showData.description)
              : '';
            const year = showData.year ? encodeURIComponent(showData.year) : '';
            const posterUrl = showData.posterUrl ? encodeURIComponent(showData.posterUrl) : '';

            let url = `/watch/${response.movieId}?type=series&title=${encodeURIComponent(showData.title)}&season=${seasonNumber}&episode=${episode.episodeNumber}&seriesId=${showData.id}&stream=${streamUrl}`;
            if (captionUrl) url += `&caption=${captionUrl}`;
            if (response.spriteVtt) url += `&sprite=${encodeURIComponent(response.spriteVtt)}`;
            if (description) url += `&description=${description}`;
            if (year) url += `&year=${year}`;
            if (posterUrl) url += `&poster=${posterUrl}`;

            router.push(url);
          } else {
            toast.error('Series playback failed - please try again');
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast.error(`Playback failed: ${errorMessage}`);
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
    if (!show || !watchProgress) return;

    if (show.contentType === ContentType.Movie) {
      // Movie resume
      await handlePlayInternal(show, [], undefined);
    } else {
      // Series resume - create minimal episode object for playback
      const resumeEpisode: Episode = {
        episodeId: `resume-${watchProgress.seasonNumber}-${watchProgress.episodeNumber}`,
        seriesId: show.id,
        episodeNumber: watchProgress.episodeNumber || 1,
        seasonNumber: watchProgress.seasonNumber || 1,
        title: '',
        thumbnailUrl: '',
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
