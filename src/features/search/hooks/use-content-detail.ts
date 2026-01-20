'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getSocket } from '@/lib/ws';
import { getSeriesEpisodes, getShowDetails, playVideo } from '../api';
import { ContentType, type Episode, type Season, type ShowDetails } from '../types';

interface UseContentDetailOptions {
  contentId: string;
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

export function useContentDetail({ contentId }: UseContentDetailOptions): UseContentDetailReturn {
  const router = useRouter();
  const [show, setShow] = useState<ShowDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasWatchProgress, setHasWatchProgress] = useState(false);
  const [watchProgress, setWatchProgress] = useState<WatchProgress | null>(null);
  const progressCheckedRef = useRef(false);

  // Fetch show details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        progressCheckedRef.current = false;
        const details = await getShowDetails(contentId);
        setShow(details);

        // For series, we'll wait for progress check before selecting season
        // For movies, nothing to do here
      } catch {
        toast.error('Failed to fetch show details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [contentId]);

  // Internal function to load episodes (to avoid dependency issues)
  const loadSeasonEpisodesInternal = useCallback(async (showData: ShowDetails, season: Season) => {
    setIsLoadingEpisodes(true);
    try {
      const { episodes: seasonEpisodes } = await getSeriesEpisodes(showData.id, season.seasonId);
      setEpisodes(seasonEpisodes);
    } catch {
      toast.error('Failed to load episodes');
      if (showData.episodes) {
        setEpisodes(showData.episodes.filter((ep) => ep.seasonNumber === season.seasonNumber));
      }
    } finally {
      setIsLoadingEpisodes(false);
    }
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

  // Internal play function
  const handlePlayInternal = useCallback(
    async (showData: ShowDetails, episode?: Episode) => {
      setIsPlaying(true);
      try {
        if (showData.contentType === ContentType.Movie) {
          const response = await playVideo({
            type: 'movie',
            title: showData.title,
          });

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
          const response = await playVideo({
            type: 'series',
            title: showData.title,
            season: episode.seasonNumber || 1,
            episode: episode.episodeNumber,
          });

          if (response.success && response.movieId && response.masterPlaylistUrl) {
            const streamUrl = encodeURIComponent(response.masterPlaylistUrl);
            const captionUrl = response.captionSrt ? encodeURIComponent(response.captionSrt) : '';
            const description = showData.description
              ? encodeURIComponent(showData.description)
              : '';
            const year = showData.year ? encodeURIComponent(showData.year) : '';
            const posterUrl = showData.posterUrl ? encodeURIComponent(showData.posterUrl) : '';

            let url = `/watch/${response.movieId}?type=series&title=${encodeURIComponent(showData.title)}&season=${episode.seasonNumber}&episode=${episode.episodeNumber}&seriesId=${showData.id}&stream=${streamUrl}`;
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast.error(`Playback failed: ${errorMessage}`);
      } finally {
        setIsPlaying(false);
      }
    },
    [router],
  );

  // Resume from continue watching
  const handleResume = useCallback(async () => {
    if (!show || !watchProgress) return;

    if (show.contentType === ContentType.Movie) {
      // Movie resume
      await handlePlayInternal(show, undefined);
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
      await handlePlayInternal(show, resumeEpisode);
    }
  }, [show, watchProgress, handlePlayInternal]);

  const handlePlay = useCallback(
    async (episode?: Episode) => {
      if (!show) return;
      await handlePlayInternal(show, episode);
    },
    [show, handlePlayInternal],
  );

  return {
    show,
    episodes,
    isLoading,
    isLoadingEpisodes,
    isPlaying,
    selectedSeason,
    hasWatchProgress,
    watchProgress,
    handleSeasonSelect,
    handlePlay,
    handleResume,
  };
}
