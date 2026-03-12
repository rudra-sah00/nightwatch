import { useCallback, useEffect, useRef } from 'react';

import {
  invalidateContinueWatchingCache,
  invalidateProgressCache,
} from '@/features/watch/api';
import { useSocket } from '@/providers/socket-provider';
import type { VideoMetadata } from '../context/types';

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
  const lastDateRef = useRef<string>(getLocalDateString());
  const lastProgressRef = useRef<number | null>(null);
  const wasPlayingRef = useRef(false);

  // Store volatile values in refs so callbacks don't need them as deps
  // (rule: advanced-use-latest, rerender-use-ref-transient-values)
  const metadataRef = useRef(metadata);
  const socketRef = useRef(contextSocket);
  const skipProgressHistoryRef = useRef(skipProgressHistory);
  const skipActivityTrackingRef = useRef(skipActivityTracking);
  const hasMoreEpisodesRef = useRef(hasMoreEpisodes);
  useEffect(() => {
    metadataRef.current = metadata;
  });
  useEffect(() => {
    socketRef.current = contextSocket;
  });
  useEffect(() => {
    skipProgressHistoryRef.current = skipProgressHistory;
  });
  useEffect(() => {
    skipActivityTrackingRef.current = skipActivityTracking;
  });
  useEffect(() => {
    hasMoreEpisodesRef.current = hasMoreEpisodes;
  });

  // Helper to flush activity time
  const flushActivity = useCallback(
    (forceFlush: boolean = false, dateOverride?: string) => {
      // Skip activity tracking for unauthenticated guests
      if (skipActivityTrackingRef.current) return;

      const seconds = Math.floor(accumulateSecondsRef.current);
      if (seconds < 1 && !forceFlush) return;

      const socket = socketRef.current;
      if (socket?.connected) {
        const sentSeconds = Math.max(seconds, 0);
        accumulateSecondsRef.current = Math.max(
          0,
          accumulateSecondsRef.current - sentSeconds,
        );

        if (sentSeconds === 0) return;

        const localDate = dateOverride ?? getLocalDateString();

        socket.emit(
          'watch:record_time',
          {
            seconds: sentSeconds,
            forceFlush,
            date: localDate,
          },
          (res: SocketResponse) => {
            if (!res?.success) {
              accumulateSecondsRef.current += sentSeconds;
            }
          },
        );
      }
    },
    // Stable: reads everything from refs — no deps needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Helper to update progress (skip if skipProgressHistory is true)
  const updateProgress = useCallback(() => {
    if (skipProgressHistoryRef.current) return;

    const metaSnapshot = metadataRef.current;
    const socket = socketRef.current;

    // Live streams have no meaningful resume position — duration is Infinity
    // or the tiny DVR window. Skip progress entirely; activity time still
    // accumulates via watch:record_time above.
    if (metaSnapshot.type === 'livestream') return;

    if (!videoRef.current || !metaSnapshot.movieId) return;

    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;

    if (!duration || Number.isNaN(duration) || currentTime === 0) return;

    if (socket?.connected) {
      const contentId =
        metaSnapshot.type === 'series' && metaSnapshot.seriesId
          ? metaSnapshot.seriesId
          : metaSnapshot.movieId;

      const roundedCurrentTime = Math.floor(currentTime);

      // For S2 MP4 streams the CDN omits Content-Length, so video.duration is
      // Infinity. Use the API-sourced duration from the play response as fallback.
      const apiDuration = (metaSnapshot as { apiDurationSeconds?: number })
        .apiDurationSeconds;
      const effectiveDuration = Number.isFinite(duration)
        ? duration
        : (apiDuration ?? 0);

      const progressDelta =
        lastProgressRef.current !== null
          ? Math.max(0, roundedCurrentTime - lastProgressRef.current)
          : 0;

      const payload = {
        contentId,
        contentType: metaSnapshot.type === 'series' ? 'Series' : 'Movie',
        title: metaSnapshot.title,
        posterUrl: metaSnapshot.posterUrl,
        seasonNumber: metaSnapshot.season,
        episodeNumber: metaSnapshot.episode,
        episodeTitle: metaSnapshot.episodeTitle,
        episodeId:
          metaSnapshot.type === 'series' &&
          metaSnapshot.season &&
          metaSnapshot.episode
            ? `${metaSnapshot.season}-${metaSnapshot.episode}`
            : undefined,
        progressSeconds: roundedCurrentTime,
        // S2 MP4 streams proxied without Content-Length report Infinity duration.
        // JSON.stringify(Infinity) → null which causes durationSeconds=null on
        // the backend and progressPercent=0. Clamp to 0 so the backend can
        // safely COALESCE with its stored value.
        durationSeconds: Number.isFinite(duration)
          ? Math.floor(duration)
          : Math.floor(effectiveDuration),
        playbackRate: videoRef.current.playbackRate,
        progressDelta,
        providerId: metaSnapshot.providerId,
        hasMoreEpisodes:
          metaSnapshot.type === 'series'
            ? (hasMoreEpisodesRef.current ?? true)
            : undefined,
      };

      socket.emit('watch:update_progress', payload, (res: SocketResponse) => {
        if (res?.success) {
          lastProgressRef.current = roundedCurrentTime;
          invalidateProgressCache(contentId as string);
          invalidateContinueWatchingCache();
        }
      });
    }
    // Stable: reads everything from refs — no deps needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef]);

  // Initial load: Get previous progress (only if enableProgressLoad is true)
  // Reactively runs when socket connects (no polling needed)
  useEffect(() => {
    // Skip loading progress for watch party guests
    if (!enableProgressLoad) return;
    if (!isConnected || !contextSocket) return;
    if (!metadata.movieId) return;
    // Live streams have no persisted position to resume
    if (metadata.type === 'livestream') return;

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
        providerId: metadata.providerId,
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
    metadata.providerId,
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
    lastDateRef.current = getLocalDateString();

    const updateAccumulation = () => {
      const now = Date.now();
      const delta = (now - lastTimeRef.current) / 1000;
      // Always advance the clock reference, even when we skip accumulation
      lastTimeRef.current = now;
      // Sanity check: ignore large jumps (>30s means tab was hidden/system sleep or resumed)
      if (delta > 0 && delta < 30) {
        const currentDate = getLocalDateString();
        if (currentDate !== lastDateRef.current) {
          // Midnight just crossed — flush pre-midnight seconds under the old date
          // so they aren't credited to the new calendar day.
          flushActivity(true, lastDateRef.current);
          lastDateRef.current = currentDate;
          // Skip accumulating this straddle-tick; next tick starts cleanly
          return;
        }
        accumulateSecondsRef.current += delta;
      }
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

  // Save progress immediately when the video reaches its natural end.
  // This closes the race window where the last periodic save was at < 85%
  // but the user watched the remaining clip in < 10s (one interval tick).
  // The 'ended' event fires with currentTime === duration, so the backend
  // receives 100% and marks the row as isCompleted=true, removing it from
  // the continue watching rail on the next page load.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnded = () => {
      flushActivity(true);
      updateProgress();
    };
    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [videoRef, flushActivity, updateProgress]);

  // Cleanup on unmount - flush everything
  useEffect(() => {
    return () => {
      flushActivity(true);
      updateProgress();
    };
  }, [flushActivity, updateProgress]);
}
