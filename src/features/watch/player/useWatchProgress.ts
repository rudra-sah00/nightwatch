import { useCallback, useEffect, useRef } from 'react';
import { invalidateWatchActivityCache } from '@/features/profile/api';
import { invalidateContinueWatchingCache, invalidateProgressCache } from '@/features/watch/api';
import { getSocket } from '@/lib/ws';
import type { VideoMetadata } from './types';

// How often to sync progress to backend (in ms)
const PROGRESS_SYNC_INTERVAL = 10000;
// How often to record accumulated watch time (in ms) - for activity graph
const ACTIVITY_SYNC_INTERVAL = 5000;

interface UseWatchProgressProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  metadata: VideoMetadata;
  isPlaying: boolean;
  onProgressLoaded?: (seconds: number) => void;
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
}: UseWatchProgressProps) {
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulateSecondsRef = useRef(0);
  const lastTimeRef = useRef(0);
  const wasPlayingRef = useRef(false);

  // Helper to flush activity time
  const flushActivity = useCallback((forceFlush: boolean = false) => {
    const seconds = Math.floor(accumulateSecondsRef.current);
    if (seconds < 1 && !forceFlush) return;

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit(
        'watch:record_time',
        {
          seconds: Math.max(seconds, 0),
          forceFlush,
        },
        (res: SocketResponse) => {
          if (res?.success) {
            // Reset accumulated seconds on success
            accumulateSecondsRef.current = Math.max(0, accumulateSecondsRef.current - seconds);
            // Invalidate watch activity cache for real-time updates
            if (forceFlush) {
              invalidateWatchActivityCache();
            }
          }
        },
      );
    }
  }, []);

  // Helper to update progress
  const updateProgress = useCallback(() => {
    if (!videoRef.current || !metadata.movieId) return;

    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;

    if (!duration || Number.isNaN(duration) || currentTime === 0) return;

    const socket = getSocket();
    if (socket?.connected) {
      // CRITICAL: For series, use seriesId as contentId to ensure single entry per series
      // For movies, use movieId
      const contentId =
        metadata.type === 'series' && metadata.seriesId ? metadata.seriesId : metadata.movieId;

      const payload = {
        contentId,
        contentType: metadata.type === 'series' ? 'Series' : 'Movie',
        title: metadata.title,
        posterUrl: metadata.posterUrl,

        // Episode info for series
        seasonNumber: metadata.season,
        episodeNumber: metadata.episode,
        episodeId:
          metadata.type === 'series' && metadata.season && metadata.episode
            ? `${metadata.season}-${metadata.episode}`
            : undefined,

        progressSeconds: Math.floor(currentTime),
        durationSeconds: Math.floor(duration),
      };

      socket.emit('watch:update_progress', payload, (res: SocketResponse) => {
        if (res?.success) {
          // Invalidate caches for real-time updates when user returns to home
          invalidateProgressCache(contentId);
          invalidateContinueWatchingCache();
        }
      });
    }
  }, [metadata, videoRef]);

  // Initial load: Get previous progress
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !metadata.movieId) return;

    // Use seriesId for series, movieId for movies
    const contentId =
      metadata.type === 'series' && metadata.seriesId ? metadata.seriesId : metadata.movieId;

    // Wait for socket to be connected
    const loadProgress = () => {
      socket.emit(
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
    };

    if (socket.connected) {
      loadProgress();
    } else {
      socket.once('connect', loadProgress);
    }

    return () => {
      socket.off('connect', loadProgress);
    };
  }, [
    metadata.movieId,
    metadata.seriesId,
    metadata.season,
    metadata.episode,
    metadata.type,
    onProgressLoaded,
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
      // Sanity check: ignore large jumps (>5s means tab was hidden/system sleep)
      if (delta > 0 && delta < 5) {
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

    progressIntervalRef.current = setInterval(updateProgress, PROGRESS_SYNC_INTERVAL);

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
