'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSeriesEpisodes, getShowDetails } from '@/features/search/api';
import type { Episode, Season, ShowDetails } from '@/features/search/types';
import { cacheSeriesData, getCachedSeriesData } from '../../hooks/series-cache';

interface UseEpisodePanelOptions {
  seriesId?: string;
  currentSeason?: number;
  currentEpisode?: number;
  isSeriesContent: boolean;
  /** Passed through from player to keep controls visible */
  onInteraction?: (isActive: boolean) => void;
}

interface UseEpisodePanelReturn {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  episodes: Episode[];
  seasons: Season[];
  selectedSeason: number;
  isLoading: boolean;
  onSeasonChange: (seasonNumber: number) => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
}

export function useEpisodePanel({
  seriesId,
  currentSeason = 1,
  currentEpisode: _currentEpisode = 1,
  isSeriesContent,
  onInteraction,
}: UseEpisodePanelOptions): UseEpisodePanelReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(currentSeason);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const fetchedSeasonsRef = useRef<Set<number>>(new Set());

  // Sync selected season with current playing season
  useEffect(() => {
    setSelectedSeason(currentSeason);
  }, [currentSeason]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onInteraction?.(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        onInteraction?.(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onInteraction]);

  // Fetch show details + first season episodes when panel first opens
  const fetchShowData = useCallback(
    async (seasonToFetch: number) => {
      if (!seriesId || !isSeriesContent) return;
      if (fetchedSeasonsRef.current.has(seasonToFetch) && seasons.length > 0) {
        return; // Already fetched
      }

      setIsLoading(true);

      try {
        // Check sessionStorage cache first
        const cached = getCachedSeriesData(seriesId);
        let showDetails: ShowDetails | null = null;

        if (cached) {
          showDetails = cached.showDetails;
          if (seasons.length === 0 && showDetails.seasons?.length) {
            setSeasons(showDetails.seasons);
          }

          // Check if we have episodes for this season in cache
          if (cached.loadedSeasons[seasonToFetch]) {
            setEpisodes(cached.loadedSeasons[seasonToFetch]);
            fetchedSeasonsRef.current.add(seasonToFetch);
            setIsLoading(false);
            return;
          }
        }

        // Fetch show details if we don't have seasons yet
        if (!showDetails || seasons.length === 0) {
          showDetails = await getShowDetails(seriesId);
          if (showDetails.seasons?.length) {
            setSeasons(showDetails.seasons);
          }
        }

        // Find the season ID for the requested season
        const seasonData = showDetails.seasons?.find(
          (s) => s.seasonNumber === seasonToFetch,
        );

        if (seasonData) {
          const { episodes: fetchedEpisodes } = await getSeriesEpisodes(
            seriesId,
            seasonData.seasonId,
          );
          setEpisodes(fetchedEpisodes);
          fetchedSeasonsRef.current.add(seasonToFetch);

          // Update cache
          cacheSeriesData(
            seriesId,
            showDetails,
            seasonToFetch,
            fetchedEpisodes,
          );
        }
      } catch {
        // Silently fail — panel stays open with empty state
      } finally {
        setIsLoading(false);
      }
    },
    [seriesId, isSeriesContent, seasons.length],
  );

  const toggle = useCallback(() => {
    const next = !isOpen;
    setIsOpen(next);
    onInteraction?.(next);

    if (next) {
      fetchShowData(selectedSeason);
    }
  }, [isOpen, onInteraction, fetchShowData, selectedSeason]);

  const close = useCallback(() => {
    setIsOpen(false);
    onInteraction?.(false);
  }, [onInteraction]);

  const onSeasonChange = useCallback(
    (seasonNumber: number) => {
      setSelectedSeason(seasonNumber);
      fetchShowData(seasonNumber);
    },
    [fetchShowData],
  );

  return {
    isOpen,
    toggle,
    close,
    episodes,
    seasons,
    selectedSeason,
    isLoading,
    onSeasonChange,
    panelRef,
  };
}
