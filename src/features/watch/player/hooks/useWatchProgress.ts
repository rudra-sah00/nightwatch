import { useCallback, useEffect, useRef } from 'react';

import { useSocket } from '@/providers/socket-provider';
import type { VideoMetadata } from '../context/types';
import { WatchProgressService } from '../services/WatchProgressService';

function getLocalDateStringFromTimestamp(ts: number): string {
  const now = new Date(ts);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function splitElapsedByLocalDate(
  startMs: number,
  endMs: number,
): Array<{ date: string; seconds: number }> {
  if (endMs <= startMs) return [];

  const segments = new Map<string, number>();
  let cursor = startMs;

  while (cursor < endMs) {
    const local = new Date(cursor);
    const nextMidnight = new Date(
      local.getFullYear(),
      local.getMonth(),
      local.getDate() + 1,
    ).getTime();

    const segmentEnd = Math.min(endMs, nextMidnight);
    const date = getLocalDateStringFromTimestamp(cursor);
    const seconds = (segmentEnd - cursor) / 1000;

    segments.set(date, (segments.get(date) ?? 0) + seconds);
    cursor = segmentEnd;
  }

  return Array.from(segments.entries()).map(([date, seconds]) => ({
    date,
    seconds,
  }));
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
  const pendingActivityByDateRef = useRef<Map<string, number>>(new Map());
  const lastTimeRef = useRef(0);
  const lastProgressRef = useRef<number | null>(null);
  const wasPlayingRef = useRef(false);

  // Store volatile values in refs so callbacks don't need them as deps
  const metadataRef = useRef(metadata);
  const socketRef = useRef(contextSocket);
  const skipProgressHistoryRef = useRef(skipProgressHistory);
  const skipActivityTrackingRef = useRef(skipActivityTracking);
  const hasMoreEpisodesRef = useRef(hasMoreEpisodes);

  useEffect(() => {
    metadataRef.current = metadata;
    socketRef.current = contextSocket;
    skipProgressHistoryRef.current = skipProgressHistory;
    skipActivityTrackingRef.current = skipActivityTracking;
    hasMoreEpisodesRef.current = hasMoreEpisodes;
  });

  // Helper to flush activity time
  const flushActivity = useCallback(
    (forceFlush = false, dateOverride?: string) => {
      if (skipActivityTrackingRef.current) return;

      const pending = pendingActivityByDateRef.current;
      const datesToFlush = dateOverride
        ? [dateOverride]
        : Array.from(pending.keys()).sort();

      for (const localDate of datesToFlush) {
        const buffered = pending.get(localDate) ?? 0;
        const seconds = Math.floor(buffered);
        if (seconds < 1) continue;

        WatchProgressService.syncActivity(
          socketRef.current,
          seconds,
          localDate,
          forceFlush,
          (sent) => {
            const current =
              pendingActivityByDateRef.current.get(localDate) ?? 0;
            const remaining = Math.max(0, current - sent);
            if (remaining > 0) {
              pendingActivityByDateRef.current.set(localDate, remaining);
            } else {
              pendingActivityByDateRef.current.delete(localDate);
            }
          },
        );
      }
    },
    [],
  );

  // Helper to update progress
  const updateProgress = useCallback(() => {
    if (skipProgressHistoryRef.current) return;
    if (!videoRef.current) return;

    const payload = WatchProgressService.prepareProgressPayload(
      videoRef.current,
      metadataRef.current,
      lastProgressRef.current,
      hasMoreEpisodesRef.current,
    );

    if (payload) {
      WatchProgressService.syncProgress(
        socketRef.current,
        payload,
        (rounded) => {
          lastProgressRef.current = rounded;
        },
      );
    }
  }, [videoRef]);

  // Initial load: Get previous progress
  useEffect(() => {
    if (
      !enableProgressLoad ||
      !isConnected ||
      !contextSocket ||
      !metadata.movieId
    )
      return;
    if (metadata.type === 'livestream') return;

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
    metadata,
    onProgressLoaded,
    enableProgressLoad,
    isConnected,
    contextSocket,
  ]);

  // Monitor playback to accumulate "watch time"
  useEffect(() => {
    if (!isPlaying || !videoRef.current) {
      if (wasPlayingRef.current && !isPlaying) {
        flushActivity(true);
        updateProgress();
      }
      wasPlayingRef.current = isPlaying;
      return;
    }

    wasPlayingRef.current = true;
    lastTimeRef.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Ignore extreme jumps (sleep/wake, tab freeze) to avoid inflated watch time.
      if (elapsedMs > 0 && elapsedMs < 30000) {
        const segments = splitElapsedByLocalDate(now - elapsedMs, now);
        for (const segment of segments) {
          pendingActivityByDateRef.current.set(
            segment.date,
            (pendingActivityByDateRef.current.get(segment.date) ?? 0) +
              segment.seconds,
          );
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, flushActivity, updateProgress, videoRef]);

  // Periodically flush tracking
  useEffect(() => {
    if (!isPlaying) return;

    const activityInterval = setInterval(
      () => flushActivity(false),
      ACTIVITY_SYNC_INTERVAL,
    );
    const progressInterval = setInterval(
      updateProgress,
      PROGRESS_SYNC_INTERVAL,
    );

    return () => {
      clearInterval(activityInterval);
      clearInterval(progressInterval);
    };
  }, [isPlaying, flushActivity, updateProgress]);

  // Final flush on end/unmount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnded = () => {
      flushActivity(true);
      updateProgress();
    };
    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('ended', handleEnded);
      flushActivity(true);
      updateProgress();
    };
  }, [videoRef, flushActivity, updateProgress]);
}
