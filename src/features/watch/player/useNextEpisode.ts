'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSeriesEpisodes,
  getShowDetails,
  playVideo,
} from '@/features/search/api';
import type { Episode, ShowDetails } from '@/features/search/types';
import type { NextEpisodeInfo } from '../overlays/NextEpisodeOverlay';
import type { VideoMetadata } from './types';

// Storage key for caching series data
const SERIES_CACHE_KEY = 'watch_series_cache';

interface CachedSeriesData {
  seriesId: string;
  showDetails: ShowDetails;
  loadedSeasons: Record<number, Episode[]>; // seasonNumber -> episodes
  timestamp: number;
  expiryMs: number; // Dynamic expiry based on episode length
}

// Minimum cache duration: 2 hours
const MIN_CACHE_EXPIRY_MS = 2 * 60 * 60 * 1000;
// Buffer time to add to episode duration: 30 minutes
const CACHE_BUFFER_MS = 30 * 60 * 1000;

/**
 * Calculate smart cache expiry based on episode duration
 * Uses episode duration + 30min buffer, with 2 hour minimum
 */
function calculateCacheExpiry(episodeDurationSeconds?: number): number {
  if (!episodeDurationSeconds || episodeDurationSeconds <= 0) {
    return MIN_CACHE_EXPIRY_MS;
  }

  // Convert to ms and add buffer
  const durationBasedExpiry = episodeDurationSeconds * 1000 + CACHE_BUFFER_MS;

  // Return the larger of duration-based or minimum expiry
  return Math.max(durationBasedExpiry, MIN_CACHE_EXPIRY_MS);
}

/**
 * Get cached series data from sessionStorage
 */
export function getCachedSeriesData(seriesId: string): CachedSeriesData | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(SERIES_CACHE_KEY);
    if (!cached) return null;

    const data: CachedSeriesData = JSON.parse(cached);

    // Check if it's for the same series and not expired
    const expiryMs = data.expiryMs || MIN_CACHE_EXPIRY_MS;
    if (data.seriesId === seriesId && Date.now() - data.timestamp < expiryMs) {
      return data;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Cache series data to sessionStorage (called from content modal when playing)
 * @param episodeDurationSeconds - Current episode duration for smart cache expiry
 */
export function cacheSeriesData(
  seriesId: string,
  showDetails: ShowDetails,
  currentSeasonNumber: number,
  currentSeasonEpisodes: Episode[],
  episodeDurationSeconds?: number,
): void {
  if (typeof window === 'undefined') return;

  try {
    const existingCache = getCachedSeriesData(seriesId);

    // Calculate smart expiry based on episode duration
    const newExpiry = calculateCacheExpiry(episodeDurationSeconds);
    // Keep the longer expiry if existing cache has more time
    const expiryMs = existingCache
      ? Math.max(existingCache.expiryMs, newExpiry)
      : newExpiry;

    const cacheData: CachedSeriesData = {
      seriesId,
      showDetails,
      loadedSeasons: existingCache?.loadedSeasons || {},
      timestamp: Date.now(),
      expiryMs,
    };

    // Add/update the current season's episodes
    cacheData.loadedSeasons[currentSeasonNumber] = currentSeasonEpisodes;

    sessionStorage.setItem(SERIES_CACHE_KEY, JSON.stringify(cacheData));
  } catch {
    // Storage quota exceeded or other error - ignore
  }
}

/**
 * Clear series cache
 */
export function clearSeriesCache(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SERIES_CACHE_KEY);
}

interface UseNextEpisodeOptions {
  metadata: VideoMetadata;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onNavigate: (url: string) => void;
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

  // Fetch next episode info ONLY when near end of video (not on mount)
  useEffect(() => {
    // Only fetch when: series, has seriesId, not already fetched, and near the end
    if (
      metadata.type !== 'series' ||
      !metadata.seriesId ||
      fetchedRef.current ||
      !isNearEnd // KEY CHANGE: Only fetch when near end
    ) {
      return;
    }

    const fetchNextEpisode = async () => {
      try {
        fetchedRef.current = true;

        const currentSeason = metadata.season || 1;
        const currentEpisode = metadata.episode || 1;
        const seriesId = metadata.seriesId;
        if (!seriesId) return;

        // Try to get cached data first
        const cachedData = getCachedSeriesData(seriesId);

        let showDetails: ShowDetails;
        let currentSeasonEpisodes: Episode[];

        if (cachedData) {
          // Use cached show details
          showDetails = cachedData.showDetails;

          // Check if we have cached episodes for current season
          if (cachedData.loadedSeasons[currentSeason]) {
            currentSeasonEpisodes = cachedData.loadedSeasons[currentSeason];
          } else {
            // Need to fetch episodes for this season
            const currentSeasonData = showDetails.seasons?.find(
              (s) => s.seasonNumber === currentSeason,
            );
            if (!currentSeasonData) return;

            const { episodes } = await getSeriesEpisodes(
              seriesId,
              currentSeasonData.seasonId,
            );
            currentSeasonEpisodes = episodes;

            // Update cache with new season data
            cacheSeriesData(
              seriesId,
              showDetails,
              currentSeason,
              currentSeasonEpisodes,
            );
          }
        } else {
          // No cache - fetch fresh data
          showDetails = await getShowDetails(seriesId);
          if (!showDetails.seasons || showDetails.seasons.length === 0) return;

          const currentSeasonData = showDetails.seasons.find(
            (s) => s.seasonNumber === currentSeason,
          );
          if (!currentSeasonData) return;

          const { episodes } = await getSeriesEpisodes(
            seriesId,
            currentSeasonData.seasonId,
          );
          currentSeasonEpisodes = episodes;

          // Cache the data for future use
          cacheSeriesData(
            seriesId,
            showDetails,
            currentSeason,
            currentSeasonEpisodes,
          );
        }

        if (!showDetails.seasons || showDetails.seasons.length === 0) return;

        // Find next episode in current season
        const nextEpisodeInSeason = currentSeasonEpisodes.find(
          (ep) => ep.episodeNumber === currentEpisode + 1,
        );

        if (nextEpisodeInSeason) {
          // Next episode exists in current season
          setNextEpisodeInfo({
            title:
              nextEpisodeInSeason.title ||
              `Episode ${nextEpisodeInSeason.episodeNumber}`,
            seriesTitle: metadata.title,
            seasonNumber: currentSeason,
            episodeNumber: nextEpisodeInSeason.episodeNumber,
            thumbnailUrl: nextEpisodeInSeason.thumbnailUrl,
            duration: nextEpisodeInSeason.duration,
          });
        } else {
          // Current season ended - check for next season
          const nextSeasonData = showDetails.seasons.find(
            (s) => s.seasonNumber === currentSeason + 1,
          );

          if (nextSeasonData) {
            // Check cache for next season episodes
            let nextSeasonEpisodes: Episode[];

            if (cachedData?.loadedSeasons[currentSeason + 1]) {
              nextSeasonEpisodes = cachedData.loadedSeasons[currentSeason + 1];
            } else {
              // Fetch first episode of next season
              const { episodes } = await getSeriesEpisodes(
                seriesId,
                nextSeasonData.seasonId,
              );
              nextSeasonEpisodes = episodes;

              // Update cache with next season data
              cacheSeriesData(
                seriesId,
                showDetails,
                currentSeason + 1,
                nextSeasonEpisodes,
              );
            }

            const firstEpisodeNextSeason = nextSeasonEpisodes.find(
              (ep) => ep.episodeNumber === 1,
            );

            if (firstEpisodeNextSeason) {
              setNextEpisodeInfo({
                title: firstEpisodeNextSeason.title || 'Episode 1',
                seriesTitle: metadata.title,
                seasonNumber: currentSeason + 1,
                episodeNumber: 1,
                thumbnailUrl: firstEpisodeNextSeason.thumbnailUrl,
                duration: firstEpisodeNextSeason.duration,
              });
            }
          }
          // If no next season, nextEpisodeInfo stays null (series finished)
        }
      } catch (_error) {
        // Silent fail - don't show next episode overlay
        fetchedRef.current = false;
      }
    };

    fetchNextEpisode();
  }, [
    metadata.type,
    metadata.seriesId,
    metadata.season,
    metadata.episode,
    metadata.title,
    isNearEnd, // Trigger fetch when user is near end
  ]);

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
      // Hide if user seeks back
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
      const response = await playVideo({
        type: 'series',
        title: metadata.title,
        season: nextEpisodeInfo.seasonNumber,
        episode: nextEpisodeInfo.episodeNumber,
      });

      if (response.success && response.movieId && response.masterPlaylistUrl) {
        const streamUrl = encodeURIComponent(response.masterPlaylistUrl);
        const captionUrl = response.captionSrt
          ? encodeURIComponent(response.captionSrt)
          : '';
        const description = metadata.description
          ? encodeURIComponent(metadata.description)
          : '';
        const year = metadata.year ? encodeURIComponent(metadata.year) : '';
        const posterUrl = metadata.posterUrl
          ? encodeURIComponent(metadata.posterUrl)
          : '';

        let url = `/watch/${response.movieId}?type=series&title=${encodeURIComponent(metadata.title)}&season=${nextEpisodeInfo.seasonNumber}&episode=${nextEpisodeInfo.episodeNumber}&seriesId=${metadata.seriesId}&stream=${streamUrl}`;
        if (captionUrl) url += `&caption=${captionUrl}`;
        if (response.spriteVtt)
          url += `&sprite=${encodeURIComponent(response.spriteVtt)}`;
        if (description) url += `&description=${description}`;
        if (year) url += `&year=${year}`;
        if (posterUrl) url += `&poster=${posterUrl}`;

        onNavigate(url);
      }
    } catch (_error) {
      // Failed to load next episode
      setIsLoadingNext(false);
    }
  }, [nextEpisodeInfo, metadata, isLoadingNext, onNavigate]);

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
