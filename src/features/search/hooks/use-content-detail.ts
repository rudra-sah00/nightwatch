'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ContentProgress } from '@/features/watch/api';
import {
  addToWatchlist,
  checkInWatchlist,
  removeFromWatchlist,
} from '@/features/watchlist/api';
import {
  ContentType,
  type Episode,
  type Season,
  type ShowDetails,
} from '../types';
import { useAutoPlay } from './use-auto-play';
import { useContentProgress } from './use-content-progress';
import { usePlaybackActions } from './use-playback-actions';
import { useSeasonEpisodes } from './use-season-episodes';
import { useShowDetails } from './use-show-details';

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
  inWatchlist: boolean;
  isWatchlistLoading: boolean;

  // Actions
  handleSeasonSelect: (season: Season) => void;
  handlePlay: (episode?: Episode) => Promise<void>;
  handleResume: () => Promise<void>;
  toggleWatchlist: () => Promise<void>;
}

export function useContentDetail({
  contentId,
  initialContext,
  fromContinueWatching = false,
}: UseContentDetailOptions): UseContentDetailReturn {
  // 1. Fetch Show Details
  const { show, isLoading } = useShowDetails(contentId);

  // 1.1 Parallel Watchlist Check
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(true);

  // Optimistic state for immediate UI feedback
  const [optimisticInWatchlist, addOptimisticWatchlist] = React.useOptimistic(
    inWatchlist,
    (_state, newState: boolean) => newState,
  );

  // Start parallel fetch for isMounted tracking (standard pattern)
  useEffect(() => {
    let isMounted = true;

    const providerId = (contentId.split(':')[0] || 's1') as 's1' | 's2' | 's3';

    // Start fetching watchlist status immediately, don't wait for 'show'
    const checkStatus = async () => {
      try {
        setIsWatchlistLoading(true);
        const inList = await checkInWatchlist(contentId, providerId);
        if (isMounted) setInWatchlist(inList);
      } catch {
        // ignore
      } finally {
        if (isMounted) setIsWatchlistLoading(false);
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [contentId]);

  const toggleWatchlist = async () => {
    if (!show) return;

    const providerId = (show.id.split(':')[0] || 's1') as 's1' | 's2' | 's3';

    // Use transition for optimistic update
    React.startTransition(async () => {
      const nextState = !inWatchlist;
      addOptimisticWatchlist(nextState);

      try {
        if (inWatchlist) {
          await removeFromWatchlist(show.id, providerId);
          setInWatchlist(false);
          toast.success('Removed from watchlist');
        } else {
          await addToWatchlist({
            contentId: show.id,
            contentType:
              show.contentType === ContentType.Movie ? 'Movie' : 'Series',
            title: show.title,
            posterUrl: show.posterUrl,
            providerId,
          });
          setInWatchlist(true);
          toast.success('Added to watchlist');
        }
      } catch (_error) {
        toast.error('Failed to update watchlist');
        // State will automatically roll back on failure due to useOptimistic
      }
    });
  };

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
    contentId,
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
    inWatchlist: optimisticInWatchlist,
    isWatchlistLoading,
    toggleWatchlist,
  };
}
