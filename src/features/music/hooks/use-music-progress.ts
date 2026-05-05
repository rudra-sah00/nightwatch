import { useCallback, useEffect, useRef } from 'react';
import { useSocket } from '@/providers/socket-provider';

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

const ACTIVITY_SYNC_INTERVAL = 5000; // Flush every 5 seconds

interface UseMusicProgressProps {
  isPlaying: boolean;
  skipActivityTracking?: boolean;
}

export function useMusicProgress({
  isPlaying,
  skipActivityTracking = false,
}: UseMusicProgressProps) {
  const { socket: contextSocket, isConnected } = useSocket();
  const pendingActivityByDateRef = useRef<Map<string, number>>(new Map());
  const lastTimeRef = useRef(0);
  const wasPlayingRef = useRef(false);

  const socketRef = useRef(contextSocket);
  const skipActivityTrackingRef = useRef(skipActivityTracking);

  useEffect(() => {
    socketRef.current = contextSocket;
    skipActivityTrackingRef.current = skipActivityTracking;
  });

  const flushActivity = useCallback(
    (forceFlush = false, dateOverride?: string) => {
      if (skipActivityTrackingRef.current) return;
      const socket = socketRef.current;
      if (!socket?.connected) return;

      const pending = pendingActivityByDateRef.current;
      const datesToFlush = dateOverride
        ? [dateOverride]
        : Array.from(pending.keys()).sort();

      for (const localDate of datesToFlush) {
        const buffered = pending.get(localDate) ?? 0;
        const seconds = Math.floor(buffered);
        if (seconds < 1) continue;

        socket.emit(
          'music:record_time',
          {
            seconds,
            forceFlush,
            date: localDate,
          },
          (res: { success: boolean }) => {
            if (res?.success) {
              const current =
                pendingActivityByDateRef.current.get(localDate) ?? 0;
              const remaining = Math.max(0, current - seconds);
              if (remaining > 0) {
                pendingActivityByDateRef.current.set(localDate, remaining);
              } else {
                pendingActivityByDateRef.current.delete(localDate);
              }
            }
          },
        );
      }
    },
    [],
  );

  // Flush immediately upon reconnection if there is pending data
  useEffect(() => {
    if (isConnected) {
      flushActivity(true);
    }
  }, [isConnected, flushActivity]);

  // Monitor playback to accumulate "listen time"
  useEffect(() => {
    if (!isPlaying) {
      if (wasPlayingRef.current && !isPlaying) {
        flushActivity(true);
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
  }, [isPlaying, flushActivity]);

  // Periodically flush tracking
  useEffect(() => {
    if (!isPlaying) return;

    const activityInterval = setInterval(
      () => flushActivity(false),
      ACTIVITY_SYNC_INTERVAL,
    );
    return () => clearInterval(activityInterval);
  }, [isPlaying, flushActivity]);

  // Final flush on unmount
  useEffect(() => {
    return () => flushActivity(true);
  }, [flushActivity]);
}
