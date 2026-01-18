/**
 * Hook for tracking watch progress for Continue Watching feature
 * Periodically saves progress to backend while video is playing
 */

import { useCallback, useEffect, useRef } from 'react';
import { type UpdateWatchProgressRequest, updateWatchProgress } from '@/services/api/watchProgress';

interface UseWatchProgressProps {
  contentId: string;
  contentType: 'Movie' | 'Series';
  title: string;
  posterUrl?: string;
  episodeId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  enabled?: boolean;
}

// Save progress every 10 seconds while playing
const SAVE_INTERVAL_MS = 10000;

// Minimum progress before saving (5 seconds)
const MIN_PROGRESS_SECONDS = 5;

export function useWatchProgress({
  contentId,
  contentType,
  title,
  posterUrl,
  episodeId,
  seasonNumber,
  episodeNumber,
  episodeTitle,
  currentTime,
  duration,
  isPlaying,
  enabled = true,
}: UseWatchProgressProps) {
  const lastSavedTimeRef = useRef<number>(0);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<UpdateWatchProgressRequest | null>(null);

  // Build request data
  const buildRequestData = useCallback((): UpdateWatchProgressRequest | null => {
    if (!contentId || !title || duration <= 0) {
      return null;
    }

    return {
      content_id: contentId,
      content_type: contentType,
      title,
      poster_url: posterUrl,
      episode_id: episodeId,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      episode_title: episodeTitle,
      progress_seconds: Math.floor(currentTime),
      duration_seconds: Math.floor(duration),
    };
  }, [
    contentId,
    contentType,
    title,
    posterUrl,
    episodeId,
    seasonNumber,
    episodeNumber,
    episodeTitle,
    currentTime,
    duration,
  ]);

  // Save progress to backend
  const saveProgress = useCallback(
    async (force = false) => {
      const data = buildRequestData();
      if (!data) return;

      // Don't save if less than minimum progress
      if (data.progress_seconds < MIN_PROGRESS_SECONDS && !force) {
        return;
      }

      // Don't save if we just saved recently (within 5 seconds)
      const now = Date.now();
      if (!force && now - lastSavedTimeRef.current < 5000) {
        return;
      }

      try {
        await updateWatchProgress(data);
        lastSavedTimeRef.current = now;
        pendingSaveRef.current = null;
      } catch (error) {
        // Store for retry on unmount
        pendingSaveRef.current = data;
        console.warn('Failed to save watch progress:', error);
      }
    },
    [buildRequestData]
  );

  // Save periodically while playing
  useEffect(() => {
    if (!enabled) return;

    if (isPlaying && duration > 0) {
      // Save immediately when starting to play (after min progress)
      if (currentTime >= MIN_PROGRESS_SECONDS) {
        saveProgress();
      }

      // Set up periodic saves
      saveIntervalRef.current = setInterval(() => {
        saveProgress();
      }, SAVE_INTERVAL_MS);

      return () => {
        if (saveIntervalRef.current) {
          clearInterval(saveIntervalRef.current);
          saveIntervalRef.current = null;
        }
      };
    }
  }, [isPlaying, enabled, duration, saveProgress, currentTime]);

  // Save on pause
  useEffect(() => {
    if (!enabled) return;

    if (!isPlaying && currentTime > MIN_PROGRESS_SECONDS && duration > 0) {
      saveProgress(true);
    }
  }, [isPlaying, currentTime, duration, enabled, saveProgress]);

  // Save on unmount
  useEffect(() => {
    return () => {
      // Try to save any pending progress
      const data = pendingSaveRef.current || buildRequestData();
      if (data && data.progress_seconds >= MIN_PROGRESS_SECONDS) {
        // Fire and forget on unmount
        updateWatchProgress(data).catch(() => {});
      }
    };
  }, [buildRequestData]);

  return {
    saveProgress: () => saveProgress(true),
  };
}
