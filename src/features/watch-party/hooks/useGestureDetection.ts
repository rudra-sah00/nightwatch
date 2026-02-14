'use client';

import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import type { ICameraVideoTrack } from 'agora-rtc-sdk-ng';
import { useCallback, useEffect, useRef } from 'react';
import { emitPartyInteraction } from '../api';

// Singleton resolver promise to prevent redundant worker creation
let visionResolver: ReturnType<typeof FilesetResolver.forVisionTasks> | null =
  null;

function getVisionResolver() {
  if (!visionResolver) {
    visionResolver = FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm',
    );
  }
  return visionResolver;
}

export function useGestureDetection(videoTrack: ICameraVideoTrack | null) {
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const requestRef = useRef<number>(0);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const initMediaPipe = useCallback(async (onInitialized?: () => void) => {
    if (recognizerRef.current) {
      onInitialized?.();
      return;
    }

    try {
      const vision = await getVisionResolver();
      const gestureRecognizer = await GestureRecognizer.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        },
      );
      recognizerRef.current = gestureRecognizer;
      onInitialized?.();
    } catch (_err) {
      // Failed to initialize MediaPipe silently
    }
  }, []);

  const lastTriggerRef = useRef<number>(0);

  const triggerReaction = useCallback((gesture: string) => {
    const now = Date.now();
    // 2-second cooldown to prevent spamming from held gestures
    if (now - lastTriggerRef.current < 2000) return;

    const GESTURE_TO_EMOJI: Record<string, string> = {
      Thumb_Up: '👍',
      Thumb_Down: '👎',
      Victory: '✌️',
      Pointing_Up: '☝️',
      Open_Palm: '👋',
      Closed_Fist: '👊',
      ILoveYou: '🤟',
    };

    const emoji = GESTURE_TO_EMOJI[gesture];
    if (emoji) {
      lastTriggerRef.current = now;
      emitPartyInteraction({ type: 'emoji', value: emoji });
    }
  }, []);

  const GESTURE_SCORE_THRESHOLD = 0.8;

  const predict = useCallback(async () => {
    if (!recognizerRef.current || !videoTrack) {
      requestRef.current = requestAnimationFrame(predict);
      return;
    }

    try {
      if (!videoElementRef.current) {
        const mediaStreamTrack = videoTrack.getMediaStreamTrack();
        const settings = mediaStreamTrack.getSettings() as MediaTrackSettings;

        const video = document.createElement('video');
        video.width = settings.width || 640;
        video.height = settings.height || 480;
        video.srcObject = new MediaStream([mediaStreamTrack]);
        video.muted = true;
        await video.play();
        videoElementRef.current = video;
      }

      const nowInMs = Date.now();
      const results = recognizerRef.current.recognizeForVideo(
        videoElementRef.current,
        nowInMs,
      );

      if (results.gestures.length > 0) {
        const gestureData = results.gestures[0][0];
        const gesture = gestureData.categoryName;
        const score = gestureData.score;

        if (gesture !== 'None' && score >= GESTURE_SCORE_THRESHOLD) {
          triggerReaction(gesture);
        }
      }
    } catch (_err) {
      // Prediction error silently ignored
    }

    requestRef.current = requestAnimationFrame(predict);
  }, [videoTrack, triggerReaction]);

  useEffect(() => {
    let cleaned = false;

    if (videoTrack) {
      initMediaPipe(() => {
        if (cleaned) return;
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(predict);
      });
    }
    return () => {
      cleaned = true;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (recognizerRef.current) {
        recognizerRef.current.close();
        recognizerRef.current = null;
      }
      if (videoElementRef.current) {
        videoElementRef.current.pause();
        videoElementRef.current.srcObject = null;
        videoElementRef.current = null;
      }
    };
  }, [videoTrack, initMediaPipe, predict]);

  return { isSupported: true };
}
