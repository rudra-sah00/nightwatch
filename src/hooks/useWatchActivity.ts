/**
 * Hook for tracking watch time while video is playing
 * Sends accumulated time to backend every 30 seconds
 */

import { useCallback, useEffect, useRef } from 'react';
import { recordWatchTime } from '@/services/api/user';

interface UseWatchActivityProps {
  isPlaying: boolean;
  enabled?: boolean;
}

const SYNC_INTERVAL_MS = 30000; // 30 seconds

export function useWatchActivity({ isPlaying, enabled = true }: UseWatchActivityProps) {
  const accumulatedSecondsRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync accumulated time to backend
  const syncToBackend = useCallback(async () => {
    const seconds = accumulatedSecondsRef.current;
    if (seconds > 0) {
      try {
        await recordWatchTime(seconds);
        accumulatedSecondsRef.current = 0; // Reset after successful sync
      } catch (error) {
        // Keep accumulated seconds on failure, will retry next sync
        console.warn('Failed to sync watch time:', error);
      }
    }
  }, []);

  // Track time while playing
  useEffect(() => {
    if (!enabled) return;

    if (isPlaying) {
      // Start tracking
      lastTickRef.current = Date.now();

      // Update accumulated seconds every second
      const tickInterval = setInterval(() => {
        if (lastTickRef.current) {
          const now = Date.now();
          const elapsed = Math.floor((now - lastTickRef.current) / 1000);
          accumulatedSecondsRef.current += elapsed;
          lastTickRef.current = now;
        }
      }, 1000);

      // Sync to backend periodically
      syncIntervalRef.current = setInterval(syncToBackend, SYNC_INTERVAL_MS);

      return () => {
        clearInterval(tickInterval);
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    } else {
      // Paused - sync remaining time and stop tracking
      lastTickRef.current = null;
      syncToBackend();

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    }
  }, [isPlaying, enabled, syncToBackend]);

  // Sync on unmount
  useEffect(() => {
    return () => {
      // Final sync when component unmounts
      const seconds = accumulatedSecondsRef.current;
      if (seconds > 0) {
        // Fire and forget on unmount
        recordWatchTime(seconds).catch(() => {});
      }
    };
  }, []);

  return {
    accumulatedSeconds: accumulatedSecondsRef.current,
    syncNow: syncToBackend,
  };
}
