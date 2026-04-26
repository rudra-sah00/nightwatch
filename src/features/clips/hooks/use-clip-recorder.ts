'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { finalizeClip, pushSegmentData, startClip } from '../api';

const MAX_DURATION = 300;
const MIN_DURATION = 5;
const CHUNK_INTERVAL = 2000;

interface UseClipRecorderOptions {
  matchId: string;
  title: string;
  streamUrl: string | null;
}

export function useClipRecorder({
  matchId,
  title,
  streamUrl,
}: UseClipRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [clipId, setClipId] = useState<string | null>(null);

  const clipIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkIndexRef = useRef(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current = null;
    chunkIndexRef.current = 0;
    pausedAtRef.current = 0;
    setIsRecording(false);
    setDuration(0);
    clipIdRef.current = null;
  }, []);

  const stop = useCallback(async () => {
    const id = clipIdRef.current;
    const recorder = recorderRef.current;

    if (!recorder || !id) {
      cleanup();
      return;
    }

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        try {
          await finalizeClip(id);
        } catch {
          /* toast handled by caller */
        }
        cleanup();
        resolve();
      };
      recorder.stop();
    });
  }, [cleanup]);

  const start = useCallback(async () => {
    if (!streamUrl) return;

    const video = document.querySelector('video');
    if (!video) return;

    const videoEl = video as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    const stream = videoEl.captureStream?.() || videoEl.mozCaptureStream?.();
    if (!stream) return;

    try {
      const { clipId: id } = await startClip(matchId, title, streamUrl);
      clipIdRef.current = id;
      setClipId(id);
      startTimeRef.current = Date.now();
      pausedAtRef.current = 0;
      chunkIndexRef.current = 0;
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
        if (elapsed >= MAX_DURATION) stop();
      }, 1000);

      const mimeType = MediaRecorder.isTypeSupported(
        'video/webm;codecs=vp9,opus',
      )
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = async (e) => {
        if (e.data.size === 0) return;
        const currentId = clipIdRef.current;
        if (!currentId) return;

        const chunkStart = (chunkIndexRef.current * CHUNK_INTERVAL) / 1000;
        const chunkDuration = CHUNK_INTERVAL / 1000;
        chunkIndexRef.current++;

        try {
          const buf = await e.data.arrayBuffer();
          await pushSegmentData(currentId, buf, chunkStart, chunkDuration);
        } catch {
          /* non-fatal */
        }
      };

      recorder.start(CHUNK_INTERVAL);
      recorderRef.current = recorder;
    } catch {
      cleanup();
    }
  }, [matchId, title, streamUrl, stop, cleanup]);

  // Pause/resume MediaRecorder when video pauses, buffers, or resumes
  useEffect(() => {
    if (!isRecording) return;

    const video = document.querySelector('video');
    if (!video) return;

    const pauseRecorder = () => {
      const r = recorderRef.current;
      if (r?.state === 'recording') {
        r.pause();
        pausedAtRef.current = Date.now();
      }
    };

    const resumeRecorder = () => {
      const r = recorderRef.current;
      if (r?.state === 'paused') {
        // Shift start time forward so duration counter stays accurate
        if (pausedAtRef.current) {
          startTimeRef.current += Date.now() - pausedAtRef.current;
          pausedAtRef.current = 0;
        }
        r.resume();
      }
    };

    video.addEventListener('pause', pauseRecorder);
    video.addEventListener('waiting', pauseRecorder);
    video.addEventListener('playing', resumeRecorder);

    return () => {
      video.removeEventListener('pause', pauseRecorder);
      video.removeEventListener('waiting', pauseRecorder);
      video.removeEventListener('playing', resumeRecorder);
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current?.state === 'recording')
        recorderRef.current.stop();
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
