'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchContentProgress, getCachedProgress } from '@/features/watch/api';
import type { ContentProgress } from '@/types/content';
import { ContentType, type Season, type ShowDetails } from '../types';

interface UseContentProgressReturn {
  watchProgress: ContentProgress | null;
  hasWatchProgress: boolean;
  isLoadingProgress: boolean;
  progressCheckedRef: React.MutableRefObject<boolean>;
}

interface UseContentProgressProps {
  contentId: string;
  show: ShowDetails | null;
  fromContinueWatching: boolean;
  loadSeasonEpisodesInternal: (
    showData: ShowDetails,
    season: Season,
  ) => Promise<void>;
  setSelectedSeason: (season: Season | null) => void;
  // We need to know if auto-play is pending to avoid overriding season selection
  autoPlaySeasonSelectedRef: React.MutableRefObject<boolean>;
}

export function useContentProgress({
  contentId,
  show,
  fromContinueWatching: _fromContinueWatching,
  loadSeasonEpisodesInternal,
  setSelectedSeason,
  autoPlaySeasonSelectedRef,
}: UseContentProgressProps): UseContentProgressReturn {
  const [hasWatchProgress, setHasWatchProgress] = useState(false);
  const [watchProgress, setWatchProgress] = useState<ContentProgress | null>(
    null,
  );
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const progressCheckedRef = useRef(false);
  const hasSetSeasonRef = useRef(false);

  // 1. Fetching Logic - API-only (no socket dependency)
  useEffect(() => {
    if (progressCheckedRef.current) return;

    // Helper to process progress response
    const processProgress = (
      hasProgress: boolean,
      progress: ContentProgress | null,
    ) => {
      progressCheckedRef.current = true;
      setIsLoadingProgress(false);

      if (hasProgress && progress && progress.progressSeconds > 0) {
        setHasWatchProgress(true);
        setWatchProgress(progress);
      }
    };

    // Check cache first
    const cached = getCachedProgress(contentId);
    if (cached) {
      processProgress(cached.hasProgress, cached.progress);
      return;
    }

    // Keep UI responsive while still allowing late HTTP responses to update Resume state.
    const timer = setTimeout(() => {
      if (!progressCheckedRef.current) {
        setIsLoadingProgress(false);
      }
    }, 5000);

    fetchContentProgress(contentId, (progress, hasProgress) => {
      if (progressCheckedRef.current) return;
      clearTimeout(timer);
      processProgress(hasProgress, progress);
    });

    return () => clearTimeout(timer);
  }, [contentId]);

  // 2. Season Matching Logic - Runs once we have BOTH show details AND progress
  useEffect(() => {
    if (!show || hasSetSeasonRef.current || isLoadingProgress) return;

    const isSeries = show.contentType === ContentType.Series;
    if (!isSeries) {
      hasSetSeasonRef.current = true;
      return;
    }

    // Mark as checked so we don't repeat this logic
    hasSetSeasonRef.current = true;

    if (watchProgress && watchProgress.progressSeconds > 0) {
      // ONLY if auto-play hasn't already selected a season
      if (
        show.seasons &&
        show.seasons.length > 0 &&
        !autoPlaySeasonSelectedRef.current
      ) {
        const progressSeason = show.seasons.find(
          (s) => s.seasonNumber === watchProgress?.seasonNumber,
        );
        if (progressSeason) {
          setSelectedSeason(progressSeason);
          loadSeasonEpisodesInternal(show, progressSeason);
          return;
        }
      }
    }

    // No progress or no matching season - default to LATEST season
    // ONLY if auto-play hasn't selected a season
    if (
      show.seasons &&
      show.seasons.length > 0 &&
      !autoPlaySeasonSelectedRef.current
    ) {
      const sortedSeasons = show.seasons.toSorted(
        (a, b) => (a.seasonNumber || 0) - (b.seasonNumber || 0),
      );
      const latestSeason = sortedSeasons[sortedSeasons.length - 1];
      setSelectedSeason(latestSeason);
      loadSeasonEpisodesInternal(show, latestSeason);
    }
  }, [
    show,
    watchProgress,
    isLoadingProgress,
    loadSeasonEpisodesInternal,
    setSelectedSeason,
    autoPlaySeasonSelectedRef,
  ]);

  return {
    watchProgress,
    hasWatchProgress,
    isLoadingProgress,
    progressCheckedRef,
  };
}
