'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { finalizeClip, pushSegmentData, startClip } from '../api';

const MAX_DURATION = 300;
const MIN_DURATION = 5;
const CHUNK_INTERVAL = 2000;

/** Options for the {@link useClipRecorder} hook. */
interface UseClipRecorderOptions {
  /** ID of the livestream match being recorded. */
  matchId: string;
  /** Default title for the new clip. */
  title: string;
  /** HLS stream URL of the active livestream, or `null` if unavailable. */
  streamUrl: string | null;
}

/**
 * Manages the full lifecycle of recording a livestream clip.
 *
 * Captures the `<video>` element's MediaStream via `captureStream()`, records
 * chunks at a fixed interval, uploads each chunk to the backend, and finalizes
 * the clip on stop. Automatically pauses/resumes recording when the video
 * element pauses or buffers. Enforces a maximum duration of 300 seconds and a
 * minimum of 5 seconds before allowing stop.
 *
 * @param options - Recording configuration (match ID, title, stream URL).
 * @returns Recording state and control functions (`start`, `stop`, `isRecording`, etc.).
 */
export function useClipRecorder({
  matchId,
  title,
  streamUrl,
}: UseClipRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [clipId, setClipId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const clipIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkIndexRef = useRef(0);
  const pendingUploadsRef = useRef<Promise<void>[]>([]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current = null;
    chunkIndexRef.current = 0;
    pausedAtRef.current = 0;
    pendingUploadsRef.current = [];
    setIsRecording(false);
    setDuration(0);
    setIsStarting(false);
    setIsStopping(false);
    clipIdRef.current = null;
  }, []);

  const stop = useCallback(async () => {
    const id = clipIdRef.current;
    const recorder = recorderRef.current;

    if (!recorder || !id) {
      cleanup();
      return;
    }

    setIsStopping(true);

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        try {
          // Wait for all chunk uploads to complete (including the final one)
          await Promise.all(pendingUploadsRef.current);
          pendingUploadsRef.current = [];
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

    setIsStarting(true);

    const videoEl = video as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    const stream = videoEl.captureStream?.() || videoEl.mozCaptureStream?.();
    if (!stream) {
      cleanup();
      return;
    }

    try {
      const { clipId: id } = await startClip(matchId, title, streamUrl);
      clipIdRef.current = id;
      setClipId(id);
      startTimeRef.current = Date.now();
      pausedAtRef.current = 0;
      chunkIndexRef.current = 0;
      setIsRecording(true);
      setDuration(0);
      setIsStarting(false);

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

      recorder.ondataavailable = (e) => {
        if (e.data.size === 0) return;
        const currentId = clipIdRef.current;
        if (!currentId) return;

        const chunkStart = (chunkIndexRef.current * CHUNK_INTERVAL) / 1000;
        const chunkDuration = CHUNK_INTERVAL / 1000;
        chunkIndexRef.current++;

        const upload = e.data.arrayBuffer().then((buf) =>
          pushSegmentData(currentId, buf, chunkStart, chunkDuration).catch(
            () => {
              /* non-fatal */
            },
          ),
        );
        pendingUploadsRef.current.push(upload);
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
    isStarting,
    isStopping,
    start,
    stop,
  };
}
