'use client';

import { useEffect, useRef, useState } from 'react';
import {
  type ContentProgress,
  fetchContentProgress,
  getCachedProgress,
} from '@/features/watch/api';
import { useSocket } from '@/providers/socket-provider';
import { ContentType, type Season, type ShowDetails } from '../types';

interface UseContentProgressReturn {
  watchProgress: ContentProgress | null;
  hasWatchProgress: boolean;
  isLoadingProgress: boolean;
  progressCheckedRef: React.MutableRefObject<boolean>;
}

interface UseContentProgressProps {
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
  show,
  fromContinueWatching,
  loadSeasonEpisodesInternal,
  setSelectedSeason,
  autoPlaySeasonSelectedRef,
}: UseContentProgressProps): UseContentProgressReturn {
  const [hasWatchProgress, setHasWatchProgress] =
    useState(fromContinueWatching);
  const [watchProgress, setWatchProgress] = useState<ContentProgress | null>(
    null,
  );
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const progressCheckedRef = useRef(false);

  // Re-runs reactively when socket connects
  const { isConnected } = useSocket();

  useEffect(() => {
    if (!show || progressCheckedRef.current) return;

    // Check if auto-play context is present - if so, we might want to skip progress checking
    // or let it run but NOT override season selection if auto-play handled it.
    // However, the auto-play hook runs separately. Here we just respect the ref.

    const isSeries = show.contentType === ContentType.Series;

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

        // For series: Set season to the one from progress
        // ONLY if auto-play hasn't already selected a season
        if (
          isSeries &&
          show.seasons &&
          show.seasons.length > 0 &&
          !autoPlaySeasonSelectedRef.current
        ) {
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

      // No progress or no matching season - default to LATEST season
      // ONLY if auto-play hasn't selected a season
      if (
        isSeries &&
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
    };

    // Check cache first
    const cached = getCachedProgress(show.id);
    if (cached) {
      processProgress(cached.hasProgress, cached.progress);
      return;
    }

    // Check if there's watch progress for this content via socket
    if (isConnected) {
      fetchContentProgress(show.id, (progress, hasProgress) => {
        processProgress(hasProgress, progress);
      });
    } else {
      // No socket - just set default season logic inside processProgress (with false/null)
      // or duplicate the default logic here.
      // Reuse processProgress for consistency
      processProgress(false, null);
    }
  }, [
    show,
    loadSeasonEpisodesInternal,
    isConnected,
    setSelectedSeason,
    autoPlaySeasonSelectedRef,
  ]); // Added dependencies

  return {
    watchProgress,
    hasWatchProgress,
    isLoadingProgress,
    progressCheckedRef,
  };
}
