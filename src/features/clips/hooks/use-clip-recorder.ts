'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { finalizeClip, pushSegmentData, startClip } from '../api';

const MAX_DURATION = 300;
const MIN_DURATION = 5;
const FLUSH_INTERVAL = 5000;

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
 * Uses `MediaRecorder.requestData()` every 5s to progressively upload
 * buffer flushes to the backend. Each flush is part of the same continuous
 * WebM stream (not independent files), so the server concatenates bytes
 * to produce one valid WebM. This provides crash safety without quality loss.
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
  const flushRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const segIndexRef = useRef(0);
  const uploadsRef = useRef<Promise<void>[]>([]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (flushRef.current) {
      clearInterval(flushRef.current);
      flushRef.current = null;
    }
    recorderRef.current = null;
    pausedAtRef.current = 0;
    segIndexRef.current = 0;
    uploadsRef.current = [];
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
          // Wait for all progressive uploads (including final ondataavailable)
          await Promise.all(uploadsRef.current);
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
      segIndexRef.current = 0;
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

        const idx = segIndexRef.current++;
        const upload = e.data
          .arrayBuffer()
          .then((buf) =>
            pushSegmentData(currentId, buf, idx, 0).catch(() => {}),
          );
        uploadsRef.current.push(upload);
      };

      // Start without timeslice — we control flushing via requestData()
      recorder.start();
      recorderRef.current = recorder;

      // Periodically flush buffer for crash safety
      flushRef.current = setInterval(() => {
        if (recorder.state === 'recording') {
          recorder.requestData();
        }
      }, FLUSH_INTERVAL);
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
    const onBeforeUnload = () => {
      // Flush remaining data and finalize via sendBeacon
      const recorder = recorderRef.current;
      const id = clipIdRef.current;
      if (recorder?.state === 'recording' && id) {
        recorder.stop();
        navigator.sendBeacon(
          `/api/clips/${id}/finalize`,
          JSON.stringify({ emergency: true }),
        );
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (timerRef.current) clearInterval(timerRef.current);
      if (flushRef.current) clearInterval(flushRef.current);
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
