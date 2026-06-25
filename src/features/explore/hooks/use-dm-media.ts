'use client';

import { useCallback, useRef, useState } from 'react';
import { uploadExploreMedia } from '@/features/explore/api';
import { hapticLight } from '@/lib/haptics';

interface MediaAttachment {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  duration?: number;
  thumbnailUrl?: string;
  filename?: string;
}

/**
 * Hook managing media attachments in DM chat:
 * - Image picker
 * - Video capture
 * - Voice recording via MediaRecorder
 */
export function useDmMedia() {
  const [attachment, setAttachment] = useState<MediaAttachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  const handleMediaSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';
      const isDoc = /\.(pdf|docx?|pptx?)$/i.test(file.name);
      const type = isDoc
        ? 'document'
        : file.type.startsWith('video/')
          ? 'video'
          : file.type.startsWith('audio/')
            ? 'audio'
            : 'image';
      // Generate thumbnail for image/video
      let thumbnailUrl: string | undefined;
      if (type === 'image') thumbnailUrl = URL.createObjectURL(file);
      else if (type === 'video') {
        thumbnailUrl = await new Promise<string | undefined>((resolve) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.muted = true;
          video.src = URL.createObjectURL(file);
          video.onloadeddata = () => {
            video.currentTime = 0.5;
            video.onseeked = () => {
              const canvas = document.createElement('canvas');
              canvas.width = 80;
              canvas.height = 80;
              canvas.getContext('2d')?.drawImage(video, 0, 0, 80, 80);
              resolve(canvas.toDataURL('image/jpeg', 0.6));
              URL.revokeObjectURL(video.src);
            };
          };
          video.onerror = () => resolve(undefined);
        });
      }
      setIsUploading(true);
      try {
        const [url] = await uploadExploreMedia([file]);
        setAttachment({
          url,
          type,
          thumbnailUrl,
          filename: isDoc ? file.name : undefined,
        });
        hapticLight();
      } catch {
        /* upload failed */
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create analyser for waveform visualization
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => {
          t.stop();
        });
        streamRef.current = null;
        analyserRef.current = null;
        audioCtx.close().catch(() => {});
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size === 0) return;
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: 'audio/webm',
        });
        setIsUploading(true);
        try {
          const [url] = await uploadExploreMedia([file]);
          setAttachment({ url, type: 'audio', duration: durationRef.current });
        } catch {
          /* upload failed */
        } finally {
          setIsUploading(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);
      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => {
          const next = d + 1;
          durationRef.current = next;
          // Auto-stop at 2 minutes (keeps file under 5MB upload limit)
          if (next >= 120) {
            recorderRef.current?.stop();
            recorderRef.current = null;
            setIsRecording(false);
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
          }
          return next;
        });
      }, 1000);
      hapticLight();
    } catch {
      /* mic permission denied */
    }
  }, []);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    hapticLight();
  }, []);

  const clearAttachment = useCallback(() => setAttachment(null), []);

  return {
    attachment,
    isRecording,
    isUploading,
    recordingDuration,
    imageInputRef,
    videoInputRef,
    analyserRef,
    handleMediaSelect,
    startRecording,
    stopRecording,
    clearAttachment,
  };
}
