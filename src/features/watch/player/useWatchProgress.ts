import { useCallback, useEffect, useRef } from 'react';

import {
  invalidateContinueWatchingCache,
  invalidateProgressCache,
} from '@/features/watch/api';
import { useSocket } from '@/providers/socket-provider';
import type { VideoMetadata } from './types';

// Helper to get local date string in YYYY-MM-DD format
function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// How often to sync progress to backend (in ms)
const PROGRESS_SYNC_INTERVAL = 10000;
// How often to record accumulated watch time (in ms) - for activity graph
const ACTIVITY_SYNC_INTERVAL = 5000;

interface UseWatchProgressProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  metadata: VideoMetadata;
  isPlaying: boolean;
  onProgressLoaded?: (seconds: number) => void;
  /** Skip saving watch progress/history (for watch party non-host members) */
  skipProgressHistory?: boolean;
  /** Enable loading previous progress (only for host/normal playback) */
  enableProgressLoad?: boolean;
  /** Skip activity time tracking (for unauthenticated guests only) */
  skipActivityTracking?: boolean;
  /** For series: whether there's a next episode available */
  hasMoreEpisodes?: boolean;
}

interface SocketResponse {
  success: boolean;
  error?: string;
  progress?: {
    progressSeconds: number;
    isCompleted: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function useWatchProgress({
  videoRef,
  metadata,
  isPlaying,
  onProgressLoaded,
  skipProgressHistory = false,
  enableProgressLoad = true,
  skipActivityTracking = false,
  hasMoreEpisodes,
}: UseWatchProgressProps) {
  const { socket: contextSocket, isConnected } = useSocket();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulateSecondsRef = useRef(0);
  const lastTimeRef = useRef(0);
  const wasPlayingRef = useRef(false);

  // Helper to flush activity time
  const flushActivity = useCallback(
    (forceFlush: boolean = false) => {
      // Skip activity tracking for unauthenticated guests
      if (skipActivityTracking) return;

      const seconds = Math.floor(accumulateSecondsRef.current);
      if (seconds < 1 && !forceFlush) return;

      if (contextSocket?.connected) {
        // Optimistically decrement to prevent double-sending if interval fires fast
        const sentSeconds = Math.max(seconds, 0);
        accumulateSecondsRef.current = Math.max(
          0,
          accumulateSecondsRef.current - sentSeconds,
        );

        if (sentSeconds === 0) return;

        const localDate = getLocalDateString();

        contextSocket.emit(
          'watch:record_time',
          {
            seconds: sentSeconds,
            forceFlush,
            date: localDate,
          },
          (res: SocketResponse) => {
            if (res?.success) {
              // Function removed as it's no longer needed (profile fetches fresh data)
            } else {
              // On failure, add time back to retry later
              accumulateSecondsRef.current += sentSeconds;
              // Fail silently or maybe toast debug in dev?
            }
          },
        );
      }
    },
    [skipActivityTracking, contextSocket],
  );

  // Helper to update progress (skip if skipProgressHistory is true)
  const updateProgress = useCallback(() => {
    // Skip progress saving for watch party guests
    if (skipProgressHistory) return;

    if (!videoRef.current || !metadata.movieId) return;

    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;

    if (!duration || Number.isNaN(duration) || currentTime === 0) return;

    if (contextSocket?.connected) {
      // CRITICAL: For series, use seriesId as contentId to ensure single entry per series
      // For movies, use movieId
      const contentId =
        metadata.type === 'series' && metadata.seriesId
          ? metadata.seriesId
          : metadata.movieId;

      const payload = {
        contentId,
        contentType: metadata.type === 'series' ? 'Series' : 'Movie',
        title: metadata.title,
        posterUrl: metadata.posterUrl,

        // Episode info for series
        seasonNumber: metadata.season,
        episodeNumber: metadata.episode,
        episodeTitle: metadata.episodeTitle,
        episodeId:
          metadata.type === 'series' && metadata.season && metadata.episode
            ? `${metadata.season}-${metadata.episode}`
            : undefined,

        progressSeconds: Math.floor(currentTime),
        durationSeconds: Math.floor(duration),

        // For series: tell backend if there are more episodes
        // This prevents removing from continue watching until series is fully completed
        hasMoreEpisodes:
          metadata.type === 'series' ? (hasMoreEpisodes ?? true) : undefined,
      };

      contextSocket.emit(
        'watch:update_progress',
        payload,
        (res: SocketResponse) => {
          if (res?.success) {
            // Invalidate caches for real-time updates when user returns to home
            invalidateProgressCache(contentId);
            invalidateContinueWatchingCache();
          }
        },
      );
    }
  }, [metadata, videoRef, skipProgressHistory, hasMoreEpisodes, contextSocket]);

  // Initial load: Get previous progress (only if enableProgressLoad is true)
  // Reactively runs when socket connects (no polling needed)
  useEffect(() => {
    // Skip loading progress for watch party guests
    if (!enableProgressLoad) return;
    if (!isConnected || !contextSocket) return;
    if (!metadata.movieId) return;

    // Use seriesId for series, movieId for movies
    const contentId =
      metadata.type === 'series' && metadata.seriesId
        ? metadata.seriesId
        : metadata.movieId;

    contextSocket.emit(
      'watch:get_progress',
      {
        contentId,
        episodeId:
          metadata.type === 'series' && metadata.season && metadata.episode
            ? `${metadata.season}-${metadata.episode}`
            : undefined,
      },
      (response: SocketResponse) => {
        if (response?.success && response.progress) {
          const { progressSeconds, isCompleted } = response.progress;
          if (progressSeconds > 0 && !isCompleted) {
            onProgressLoaded?.(progressSeconds);
          }
        }
      },
    );
  }, [
    metadata.movieId,
    metadata.seriesId,
    metadata.season,
    metadata.episode,
    metadata.type,
    onProgressLoaded,
    enableProgressLoad,
    isConnected,
    contextSocket,
  ]);

  // Monitor playback to accumulate "watch time"
  useEffect(() => {
    if (!isPlaying || !videoRef.current) {
      // When pausing, flush accumulated time with forceFlush
      if (wasPlayingRef.current && !isPlaying) {
        flushActivity(true);
        updateProgress(); // Also save current position
      }
      wasPlayingRef.current = isPlaying;
      return;
    }

    wasPlayingRef.current = true;

    // Reset accumulation logic when Play starts/Resumes
    lastTimeRef.current = Date.now();

    const updateAccumulation = () => {
      const now = Date.now();
      const delta = (now - lastTimeRef.current) / 1000;
      // Sanity check: ignore large jumps (>30s means tab was hidden/system sleep or resumed)
      if (delta > 0 && delta < 30) {
        accumulateSecondsRef.current += delta;
      }
      lastTimeRef.current = now;
    };

    const interval = setInterval(updateAccumulation, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, flushActivity, updateProgress, videoRef]);

  // Periodically flush accumulated activity time (only when playing)
  useEffect(() => {
    if (!isPlaying) return;

    activityIntervalRef.current = setInterval(() => {
      flushActivity(false);
    }, ACTIVITY_SYNC_INTERVAL);

    return () => {
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
    };
  }, [isPlaying, flushActivity]);

  // Periodically update playback progress (only when playing)
  useEffect(() => {
    if (!isPlaying) return;

    progressIntervalRef.current = setInterval(
      updateProgress,
      PROGRESS_SYNC_INTERVAL,
    );

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, updateProgress]);

  // Cleanup on unmount - flush everything
  useEffect(() => {
    return () => {
      flushActivity(true);
      updateProgress();
    };
  }, [flushActivity, updateProgress]);
}
