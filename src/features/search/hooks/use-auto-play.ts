'use client';

import { useEffect, useRef } from 'react';
import {
  ContentType,
  type Episode,
  type Season,
  type ShowDetails,
} from '../types';

interface UseAutoPlayProps {
  initialContext?: {
    season?: number;
    episode?: number;
    episodeId?: string;
  };
  show: ShowDetails | null;
  episodes: Episode[];
  selectedSeason: Season | null;
  setSelectedSeason: (season: Season | null) => void;
  loadSeasonEpisodesInternal: (
    showData: ShowDetails,
    season: Season,
  ) => Promise<void>;
  handlePlay: (episode?: Episode) => Promise<void>;
  progressCheckedRef: React.MutableRefObject<boolean>;
  setIsLoadingProgress: (isLoading: boolean) => void;
  autoPlaySeasonSelectedRef: React.MutableRefObject<boolean>;
  autoPlayEpisodeStartedRef: React.MutableRefObject<boolean>;
}

export function useAutoPlay({
  initialContext,
  show,
  episodes,
  selectedSeason,
  setSelectedSeason,
  loadSeasonEpisodesInternal,
  handlePlay,
  progressCheckedRef,
  setIsLoadingProgress,
  autoPlaySeasonSelectedRef,
  autoPlayEpisodeStartedRef,
}: UseAutoPlayProps): void {
  const initialContextRef = useRef(initialContext);

  // 1. Handle Season Selection from Context
  useEffect(() => {
    // Only run if we have initial context and show data is loaded
    if (
      !initialContextRef.current ||
      !show ||
      autoPlaySeasonSelectedRef.current
    )
      return;

    const { season } = initialContextRef.current;

    // Series Logic
    if (show.contentType === ContentType.Series && show.seasons && season) {
      const targetSeason = show.seasons.find((s) => s.seasonNumber === season);
      if (targetSeason) {
        // Select season and fetch episodes
        if (selectedSeason?.seasonNumber !== season) {
          setSelectedSeason(targetSeason);
          loadSeasonEpisodesInternal(show, targetSeason);
        }

        // Mark season selection as handled
        autoPlaySeasonSelectedRef.current = true;
        // Also mark progress as checked so we don't override
        progressCheckedRef.current = true;
        setIsLoadingProgress(false);
      }
    }
  }, [
    show,
    selectedSeason,
    loadSeasonEpisodesInternal,
    setSelectedSeason,
    progressCheckedRef,
    setIsLoadingProgress,
    autoPlaySeasonSelectedRef,
  ]);

  // 2. Play Episode once loaded
  useEffect(() => {
    if (
      !initialContextRef.current ||
      !autoPlaySeasonSelectedRef.current ||
      autoPlayEpisodeStartedRef.current
    )
      return;
    if (episodes.length === 0) return;

    const { episode, season } = initialContextRef.current;

    // Ensure we are in the right season
    if (selectedSeason?.seasonNumber !== season) return;

    const targetEpisode = episodes.find((e) => e.episodeNumber === episode);

    if (targetEpisode) {
      autoPlayEpisodeStartedRef.current = true;
      handlePlay(targetEpisode);
    }
  }, [
    episodes,
    selectedSeason,
    handlePlay,
    autoPlaySeasonSelectedRef,
    autoPlayEpisodeStartedRef,
  ]);
}
