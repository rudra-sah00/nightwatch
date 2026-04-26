'use client';

import type HlsType from 'hls.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { finalizeClip, pushSegment, pushSegmentData, startClip } from '../api';

const MAX_DURATION = 300;
const MIN_DURATION = 5;

interface UseClipRecorderOptions {
  hlsRef: React.RefObject<HlsType | null>;
  matchId: string;
  title: string;
  streamUrl: string | null;
  /** Server 1 streams require client-side download + binary upload */
  clientDownload?: boolean;
}

export function useClipRecorder({
  hlsRef,
  matchId,
  title,
  streamUrl,
  clientDownload = false,
}: UseClipRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [clipId, setClipId] = useState<string | null>(null);

  const clipIdRef = useRef<string | null>(null);
  const seenUrls = useRef(new Set<string>());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  // biome-ignore lint/suspicious/noExplicitAny: hls.js event handler type varies
  const fragHandlerRef = useRef<((...args: any[]) => void) | null>(null);

  /**
   * Push a segment — either URL (Server 2) or fetch + upload binary (Server 1).
   */
  const pushFrag = useCallback(
    async (
      id: string,
      url: string,
      fragStart: number,
      fragDuration: number,
    ) => {
      if (clientDownload) {
        // Server 1: fetch segment locally in the browser, upload raw bytes
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const data = await res.arrayBuffer();
          await pushSegmentData(id, data, fragStart, fragDuration);
        } catch {
          // silent — segment lost
        }
      } else {
        // Server 2: send URL, backend downloads via CF worker
        await pushSegment(id, {
          url,
          startTime: fragStart,
          duration: fragDuration,
        }).catch(() => {});
      }
    },
    [clientDownload],
  );

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

      // Capture the currently playing segment
      // biome-ignore lint/suspicious/noExplicitAny: hls.js internal types
      const levels = hls.levels as any[];
      const currentLevel = hls.currentLevel >= 0 ? hls.currentLevel : 0;
      const details = levels?.[currentLevel]?.details;
      const video = document.querySelector('video');
      const currentTime = video?.currentTime ?? 0;

      if (details?.fragments) {
        for (const frag of details.fragments) {
          if (!frag?.url) continue;
          const fragEnd = (frag.start ?? 0) + (frag.duration ?? 0);
          if (fragEnd >= currentTime && !seenUrls.current.has(frag.url)) {
            seenUrls.current.add(frag.url);
            pushFrag(id, frag.url, frag.start ?? 0, frag.duration ?? 0);
            break;
          }
        }
      }

      // Listen for new segments during recording
      // biome-ignore lint/suspicious/noExplicitAny: hls.js FRAG_LOADED data shape
      const handler = (_event: any, data: any) => {
        const frag = data?.frag;
        if (!frag?.url || !clipIdRef.current) return;
        if (seenUrls.current.has(frag.url)) return;
        seenUrls.current.add(frag.url);
        pushFrag(
          clipIdRef.current,
          frag.url,
          frag.start ?? 0,
          frag.duration ?? 0,
        );
      };

      fragHandlerRef.current = handler;
      hls.on(Hls.Events.FRAG_LOADED, handler);
    } catch {
      setIsRecording(false);
    }
  }, [hlsRef, matchId, title, streamUrl, stop, pushFrag]);

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
