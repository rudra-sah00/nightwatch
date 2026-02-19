'use client';

import { useRef } from 'react';
import type { ContentProgress } from '@/features/watch/api';
import type { Episode, Season, ShowDetails } from '../types';
import { useAutoPlay } from './use-auto-play';
import { useContentProgress } from './use-content-progress';
import { usePlaybackActions } from './use-playback-actions';
import { useSeasonEpisodes } from './use-season-episodes';
import { useShowDetails } from './use-show-details';

// Re-export for backwards compatibility
export { invalidateProgressCache } from '@/features/watch/api';

interface UseContentDetailOptions {
  contentId: string;
  initialContext?: {
    season?: number; // 1-based index
    episode?: number; // 1-based index
    episodeId?: string;
  };
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
  initialContext,
  fromContinueWatching = false,
}: UseContentDetailOptions): UseContentDetailReturn {
  // 1. Fetch Show Details
  const { show, isLoading } = useShowDetails(contentId);

  // 2. Manage Episodes & Season Selection
  const {
    episodes,
    isLoadingEpisodes,
    selectedSeason,
    setSelectedSeason,
    loadSeasonEpisodesInternal,
    handleSeasonSelect: handleSeasonSelectInternal,
  } = useSeasonEpisodes();

  // 3. Manage Playback Actions (needed for AutoPlay)
  // We need to create the Ref here in useContentDetail and pass it to both useAutoPlay and useContentProgress.
  const autoPlaySeasonSelectedRef = useRef(false);
  const autoPlayEpisodeStartedRef = useRef(false);

  // Now instantiate Progress
  const {
    watchProgress,
    hasWatchProgress,
    isLoadingProgress,
    progressCheckedRef,
  } = useContentProgress({
    show,
    fromContinueWatching,
    loadSeasonEpisodesInternal,
    setSelectedSeason,
    autoPlaySeasonSelectedRef,
  });

  // Now Playback Actions
  const { isPlaying, playingEpisodeId, handlePlay, handleResume } =
    usePlaybackActions({
      show,
      episodes,
      watchProgress,
      fromContinueWatching,
    });

  // Now AutoPlay
  useAutoPlay({
    initialContext,
    show,
    episodes,
    selectedSeason,
    setSelectedSeason,
    loadSeasonEpisodesInternal,
    handlePlay,
    progressCheckedRef,
    setIsLoadingProgress: () => {}, // We don't have direct setter for isLoadingProgress from hook.
    autoPlaySeasonSelectedRef,
    autoPlayEpisodeStartedRef,
  });

  const handleSeasonSelect = (season: Season) => {
    if (show) {
      handleSeasonSelectInternal(show, season);
    }
  };

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
