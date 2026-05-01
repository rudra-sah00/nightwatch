'use client';

import { useCallback, useState, useTransition } from 'react';
import { toast } from 'sonner';
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
 *
 * Uses locally embedded episode data when the full set is available;
 * otherwise fetches episodes from the API via `getSeriesEpisodes`.
 * Falls back to cached show data on network errors.
 *
 * @returns {@link UseSeasonEpisodesReturn}
 */
export function useSeasonEpisodes(): UseSeasonEpisodesReturn {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [isLoadingEpisodes, startEpisodesTransition] = useTransition();

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

  const handleSeasonSelect = useCallback(
    (showData: ShowDetails, season: Season) => {
      setSelectedSeason(season);
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
