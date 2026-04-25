'use client';

import type HlsType from 'hls.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { finalizeClip, pushSegment, startClip } from '../api';

const MAX_DURATION = 300; // 5 minutes
const MIN_DURATION = 5;

interface UseClipRecorderOptions {
  hlsRef: React.RefObject<HlsType | null>;
  matchId: string;
  title: string;
  streamUrl: string | null;
}

export function useClipRecorder({
  hlsRef,
  matchId,
  title,
  streamUrl,
}: UseClipRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [clipId, setClipId] = useState<string | null>(null);

  const clipIdRef = useRef<string | null>(null);
  const seenUrls = useRef(new Set<string>());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  // biome-ignore lint/suspicious/noExplicitAny: hls.js event handler type varies across versions
  const fragHandlerRef = useRef<((...args: any[]) => void) | null>(null);

  const stop = useCallback(async () => {
    const hls = hlsRef.current;
    if (fragHandlerRef.current && hls) {
      const Hls = (await import('hls.js')).default;
      hls.off(Hls.Events.FRAG_LOADED, fragHandlerRef.current);
      fragHandlerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const id = clipIdRef.current;
    setIsRecording(false);
    setDuration(0);
    clipIdRef.current = null;
    seenUrls.current.clear();

    if (id && (Date.now() - startTimeRef.current) / 1000 >= MIN_DURATION) {
      try {
        await finalizeClip(id);
      } catch {
        /* toast handled by caller */
      }
    }
    setClipId(null);
  }, [hlsRef]);

  const start = useCallback(async () => {
    if (!streamUrl || !hlsRef.current) return;

    try {
      const { clipId: id } = await startClip(matchId, title, streamUrl);
      clipIdRef.current = id;
      setClipId(id);
      seenUrls.current.clear();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
        if (elapsed >= MAX_DURATION) stop();
      }, 1000);

      const hls = hlsRef.current;
      const Hls = (await import('hls.js')).default;

      // biome-ignore lint/suspicious/noExplicitAny: hls.js FRAG_LOADED data shape
      const handler = (_event: any, data: any) => {
        const frag = data?.frag;
        if (!frag?.url || !clipIdRef.current) return;
        if (seenUrls.current.has(frag.url)) return;
        seenUrls.current.add(frag.url);

        pushSegment(clipIdRef.current, {
          url: frag.url,
          startTime: frag.start ?? 0,
          duration: frag.duration ?? 0,
        }).catch(() => {});
      };

      fragHandlerRef.current = handler;
      hls.on(Hls.Events.FRAG_LOADED, handler);
    } catch {
      setIsRecording(false);
    }
  }, [hlsRef, matchId, title, streamUrl, stop]);

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
    start,
    stop,
  };
}
