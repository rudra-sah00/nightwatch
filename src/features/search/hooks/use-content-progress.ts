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
  const hasSetSeasonRef = useRef(false);

  // Re-runs reactively when socket connects
  const { isConnected } = useSocket();

  // 1. Fetching Logic - Start as soon as contentId/socket is ready
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

    // Check if there's watch progress via socket
    if (isConnected) {
      fetchContentProgress(contentId, (progress, hasProgress) => {
        processProgress(hasProgress, progress);
      });
    } else {
      // Fallback: if the socket hasn't connected within 5 seconds, unblock the UI
      // so the content detail page doesn't spin forever on WebSocket delays.
      const timer = setTimeout(() => {
        if (!progressCheckedRef.current) {
          progressCheckedRef.current = true;
          setIsLoadingProgress(false);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [contentId, isConnected]);

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
