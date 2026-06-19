'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { getSeriesEpisodes } from '../api';
import type { Episode, Season, ShowDetails } from '../types';

/** Return value of the {@link useSeasonEpisodes} hook. */
interface UseSeasonEpisodesReturn {
  episodes: Episode[];
  isLoadingEpisodes: boolean;
  selectedSeason: Season | null;
  setSelectedSeason: (season: Season | null) => void;
  loadSeasonEpisodesInternal: (
    showData: ShowDetails,
    season: Season,
  ) => Promise<void>;
  handleSeasonSelect: (showData: ShowDetails, season: Season) => void;
}

/**
 * Hook that manages the currently selected season and its episode list.
 * Uses TanStack Query for caching episode data per season.
 */
export function useSeasonEpisodes(): UseSeasonEpisodesReturn {
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [showId, setShowId] = useState<string | null>(null);
  const [localEpisodes, setLocalEpisodes] = useState<Episode[] | null>(null);

  const { data, isLoading: isLoadingEpisodes } = useQuery({
    queryKey: ['episodes', showId, selectedSeason?.seasonId],
    queryFn: () => getSeriesEpisodes(showId!, selectedSeason!.seasonId),
    enabled: !!showId && !!selectedSeason && !localEpisodes,
  });

  const episodes = localEpisodes ?? data?.episodes ?? [];

  const loadSeasonEpisodesInternal = useCallback(
    async (showData: ShowDetails, season: Season) => {
      // Check if we already have ALL episodes locally
      const local = showData.episodes?.filter(
        (ep) => ep.seasonNumber === season.seasonNumber,
      );
      const hasAllEpisodes =
        local &&
        local.length > 0 &&
        season.episodeCount > 0 &&
        local.length >= season.episodeCount;

      if (hasAllEpisodes) {
        setLocalEpisodes(local);
      } else {
        setLocalEpisodes(null);
        setShowId(showData.id);
      }
      setSelectedSeason(season);
    },
    [],
  );

  const handleSeasonSelect = useCallback(
    (showData: ShowDetails, season: Season) => {
      loadSeasonEpisodesInternal(showData, season);
    },
    [loadSeasonEpisodesInternal],
  );

  return {
    episodes,
    isLoadingEpisodes,
    selectedSeason,
    setSelectedSeason,
    loadSeasonEpisodesInternal,
    handleSeasonSelect,
  };
}
