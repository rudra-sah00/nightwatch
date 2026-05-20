'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { startServerClip, stopServerClip } from '../api';

const MAX_DURATION = 300;
const MIN_DURATION = 5;

/** Options for the {@link useClipRecorder} hook. */
interface UseClipRecorderOptions {
  /** ID of the livestream match being recorded. */
  matchId: string;
  /** Default title for the new clip. */
  title: string;
  /** Stream session token from the active stream. */
  streamToken: string | null;
}

/**
 * Server-side clip recording hook.
 *
 * Records start/stop timestamps and delegates HLS segment extraction
 * to the backend. No browser MediaRecorder or captureStream() needed.
 */
export function useClipRecorder({
  matchId,
  title,
  streamToken,
}: UseClipRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [clipId, setClipId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const clipIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setDuration(0);
    setIsStarting(false);
    setIsStopping(false);
    clipIdRef.current = null;
  }, []);

  const stop = useCallback(async () => {
    const id = clipIdRef.current;
    if (!id) {
      cleanup();
      return;
    }

    setIsStopping(true);
    try {
      const endTime = Date.now() / 1000;
      await stopServerClip(id, endTime);
    } catch {
      /* toast handled by caller */
    }
    cleanup();
  }, [cleanup]);

  const start = useCallback(async () => {
    if (!streamToken) return;

    setIsStarting(true);
    try {
      const startTime = Date.now() / 1000;
      startTimeRef.current = Date.now();
      const { clipId: id } = await startServerClip(
        streamToken,
        matchId,
        title,
        startTime,
      );
      clipIdRef.current = id;
      setClipId(id);
      setIsRecording(true);
      setDuration(0);
      setIsStarting(false);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
        if (elapsed >= MAX_DURATION) stop();
      }, 1000);
    } catch {
      cleanup();
    }
  }, [matchId, title, streamToken, stop, cleanup]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    isRecording,
    duration,
    clipId,
    canStop: duration >= MIN_DURATION,
    isStarting,
    isStopping,
    start,
    stop,
  };
}
