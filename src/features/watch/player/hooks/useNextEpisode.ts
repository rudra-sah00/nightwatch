'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VideoMetadata } from '../context/types';
import {
  fetchNextEpisodeInfo,
  prepareNextEpisodeCommand,
} from '../services/NextEpisodeService';
import type { NextEpisodeInfo } from '../ui/overlays/NextEpisodeOverlay';
import { cacheSeriesData } from './series-cache';

// Re-export cache utilities for external use
export { cacheSeriesData };

interface UseNextEpisodeOptions {
  metadata: VideoMetadata;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onNavigate: (url: string) => void;
  /** Explicit server ID — pass metadata.providerId from PlayerRoot for reliability */
  server?: 's1' | 's2' | 's3';
}

interface UseNextEpisodeReturn {
  showNextEpisode: boolean;
  nextEpisodeInfo: NextEpisodeInfo | null;
  isLoadingNext: boolean;
  playNextEpisode: () => Promise<void>;
  cancelNextEpisode: () => void;
}

// Show next episode overlay when 5 minutes or less remaining (like Netflix)
const SHOW_THRESHOLD_SECONDS = 5 * 60;

export function useNextEpisode({
  metadata,
  currentTime,
  duration,
  isPlaying,
  onNavigate,
  server: serverProp,
}: UseNextEpisodeOptions): UseNextEpisodeReturn {
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [nextEpisodeInfo, setNextEpisodeInfo] =
    useState<NextEpisodeInfo | null>(null);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  const fetchedRef = useRef(false);
  const currentEpisodeRef = useRef({
    season: metadata.season,
    episode: metadata.episode,
  });

  // Reset when episode changes
  useEffect(() => {
    if (
      currentEpisodeRef.current.season !== metadata.season ||
      currentEpisodeRef.current.episode !== metadata.episode
    ) {
      fetchedRef.current = false;
      setNextEpisodeInfo(null);
      setShowNextEpisode(false);
      setCancelled(false);
      currentEpisodeRef.current = {
        season: metadata.season,
        episode: metadata.episode,
      };
    }
  }, [metadata.season, metadata.episode]);

  // Calculate if we're near the end (7 minutes threshold to give time to fetch)
  const FETCH_THRESHOLD_SECONDS = 7 * 60;
  const isNearEnd =
    duration > 0 && duration - currentTime <= FETCH_THRESHOLD_SECONDS;

  // Fetch next episode info ONLY when near end of video
  useEffect(() => {
    if (
      metadata.type !== 'series' ||
      !metadata.seriesId ||
      fetchedRef.current ||
      !isNearEnd
    ) {
      return;
    }

    const fetchNextEpisode = async () => {
      try {
        fetchedRef.current = true;
        const info = await fetchNextEpisodeInfo(metadata);
        if (info) {
          setNextEpisodeInfo(info);
        }
      } catch (_error) {
        fetchedRef.current = false;
      }
    };

    fetchNextEpisode();
  }, [metadata, isNearEnd]);

  // Show overlay when near end of video
  useEffect(() => {
    if (
      metadata.type !== 'series' ||
      !nextEpisodeInfo ||
      !duration ||
      duration === 0 ||
      cancelled
    ) {
      return;
    }

    const remainingTime = duration - currentTime;
    const shouldShow =
      remainingTime <= SHOW_THRESHOLD_SECONDS && remainingTime > 0 && isPlaying;

    if (shouldShow && !showNextEpisode) {
      setShowNextEpisode(true);
    } else if (
      !shouldShow &&
      showNextEpisode &&
      remainingTime > SHOW_THRESHOLD_SECONDS
    ) {
      setShowNextEpisode(false);
    }
  }, [
    metadata.type,
    nextEpisodeInfo,
    currentTime,
    duration,
    isPlaying,
    cancelled,
    showNextEpisode,
  ]);

  // Play next episode
  const playNextEpisode = useCallback(async () => {
    if (!nextEpisodeInfo || !metadata.seriesId || isLoadingNext) return;

    setIsLoadingNext(true);
    try {
      const url = await prepareNextEpisodeCommand(
        nextEpisodeInfo,
        metadata,
        serverProp,
      );
      if (url) {
        onNavigate(url);
      } else {
        setIsLoadingNext(false);
      }
    } catch (_error) {
      setIsLoadingNext(false);
    }
  }, [nextEpisodeInfo, metadata, isLoadingNext, onNavigate, serverProp]);

  // Cancel auto-play
  const cancelNextEpisode = useCallback(() => {
    setCancelled(true);
    setShowNextEpisode(false);
  }, []);

  return {
    showNextEpisode,
    nextEpisodeInfo,
    isLoadingNext,
    playNextEpisode,
    cancelNextEpisode,
  };
}
