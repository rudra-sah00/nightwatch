import { useCallback, useEffect, useRef } from 'react';

import { useSocket } from '@/providers/socket-provider';
import type { VideoMetadata } from '../context/types';
import { WatchProgressService } from '../services/WatchProgressService';

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
  const accumulateSecondsRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastDateRef = useRef<string>(getLocalDateString());
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

      const seconds = Math.floor(accumulateSecondsRef.current);
      if (seconds < 1 && !forceFlush) return;

      const localDate = dateOverride ?? getLocalDateString();
      WatchProgressService.syncActivity(
        socketRef.current,
        seconds,
        localDate,
        forceFlush,
        (sent) => {
          accumulateSecondsRef.current = Math.max(
            0,
            accumulateSecondsRef.current - sent,
          );
        },
      );
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
    lastDateRef.current = getLocalDateString();

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (delta > 0 && delta < 30) {
        const currentDate = getLocalDateString();
        if (currentDate !== lastDateRef.current) {
          flushActivity(true, lastDateRef.current);
          lastDateRef.current = currentDate;
          return;
        }
        accumulateSecondsRef.current += delta;
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
