'use client';

import {
  FaceLandmarker,
  FilesetResolver,
  GestureRecognizer,
} from '@mediapipe/tasks-vision';
import type { ICameraVideoTrack } from 'agora-rtc-sdk-ng';
import { useCallback, useEffect, useRef } from 'react';
import { emitPartyInteraction } from '../api';

// Singleton resolver promise to prevent redundant worker creation
let visionResolver: ReturnType<typeof FilesetResolver.forVisionTasks> | null =
  null;

let consoleIntercepted = false;

/**
 * Emscripten (MediaPipe WASM) prints raw C++ logs to the browser console.
 * We intercept console.log and console.info to suppress these noisy logs
 * related to GL Context and missing custom gesture classifiers.
 */
function interceptMediaPipeLogs() {
  if (consoleIntercepted || typeof window === 'undefined') return;
  consoleIntercepted = true;

  // biome-ignore lint/suspicious/noConsole: Override for WASM logs
  const originalLog = console.log;
  // biome-ignore lint/suspicious/noConsole: Override for WASM logs
  const originalInfo = console.info;

  const isMediaPipeWasmLog = (args: unknown[]) => {
    if (args.length > 0 && typeof args[0] === 'string') {
      const msg = args[0];
      if (
        msg.includes('Custom gesture classifier is not defined') ||
        msg.includes('GL version:') ||
        msg.includes('renderer: WebKit WebGL') ||
        msg.includes('hand_gesture_recognizer_graph.cc') ||
        msg.includes('gl_context.cc')
      ) {
        return true;
      }
    }
    return false;
  };

  console.log = (...args) => {
    if (isMediaPipeWasmLog(args)) return;
    originalLog.apply(console, args);
  };

  console.info = (...args) => {
    if (isMediaPipeWasmLog(args)) return;
    originalInfo.apply(console, args);
  };
}

function getVisionResolver() {
  if (!visionResolver) {
    interceptMediaPipeLogs();
    visionResolver = FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm',
    );
  }
  return visionResolver;
}

export function useGestureDetection(videoTrack: ICameraVideoTrack | null) {
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const initMediaPipe = useCallback(async (onInitialized?: () => void) => {
    if (gestureRecognizerRef.current && faceLandmarkerRef.current) {
      onInitialized?.();
      return;
    }

    try {
      const vision = await getVisionResolver();

      const [gestureRecognizer, faceLandmarker] = await Promise.all([
        GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        }),
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        }),
      ]);

      gestureRecognizerRef.current = gestureRecognizer;
      faceLandmarkerRef.current = faceLandmarker;
      onInitialized?.();
    } catch (_err) {}
  }, []);

  const lastTriggerRef = useRef<number>(0);

  const triggerReaction = useCallback(
    (type: 'gesture' | 'smile', value: string) => {
      const now = Date.now();
      // 2-second cooldown to prevent spamming from held gestures/smiles
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

      let emoji = '';
      if (type === 'gesture') {
        emoji = GESTURE_TO_EMOJI[value];
      } else if (type === 'smile') {
        emoji = '😊';
      }

      if (emoji) {
        lastTriggerRef.current = now;
        emitPartyInteraction({ type: 'emoji', value: emoji });
      }
    },
    [],
  );

  const GESTURE_SCORE_THRESHOLD = 0.8;
  const SMILE_SCORE_THRESHOLD = 0.6; // Tune this: 0.0 to 1.0 depending on smile intensity

  const lastGestureVideoTimeRef = useRef(-1);
  const lastFaceVideoTimeRef = useRef(-1);

  const predict = useCallback(async () => {
    if (
      !gestureRecognizerRef.current ||
      !faceLandmarkerRef.current ||
      !videoTrack
    ) {
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
        video.playsInline = true;
        await video.play();
        videoElementRef.current = video;
      }

      const videoElement = videoElementRef.current;
      const nowInMs = Date.now();

      // Ensure timestamp is monotonically increasing and unique for each task
      const gestureTimeMs = Math.max(
        nowInMs,
        lastGestureVideoTimeRef.current + 1,
      );
      lastGestureVideoTimeRef.current = gestureTimeMs;

      const faceTimeMs = Math.max(
        gestureTimeMs + 1,
        lastFaceVideoTimeRef.current + 1,
      );
      lastFaceVideoTimeRef.current = faceTimeMs;

      // We can run these in parallel or sequentially. Sequential is safer for the single video element.
      const gestureResults = gestureRecognizerRef.current.recognizeForVideo(
        videoElement,
        gestureTimeMs,
      );

      const faceResults = faceLandmarkerRef.current.detectForVideo(
        videoElement,
        faceTimeMs,
      );

      let triggered = false;

      // Check Hand Gestures
      if (gestureResults.gestures.length > 0) {
        const gestureData = gestureResults.gestures[0][0];
        const gesture = gestureData.categoryName;
        const score = gestureData.score;

        if (gesture !== 'None') {
          if (score >= GESTURE_SCORE_THRESHOLD) {
            triggerReaction('gesture', gesture);
            triggered = true;
          }
        }
      }

      // Check Facial Expressions (Smile) if no gesture just triggered
      // This prevents firing both simultaneously and hitting the cooldown oddly, though cooldown handles it mostly.
      if (
        !triggered &&
        faceResults.faceBlendshapes &&
        faceResults.faceBlendshapes.length > 0
      ) {
        const blendshapes = faceResults.faceBlendshapes[0].categories;

        // Find mouthSmileLeft and mouthSmileRight
        const smileLeft = blendshapes.find(
          (b) => b.categoryName === 'mouthSmileLeft',
        );
        const smileRight = blendshapes.find(
          (b) => b.categoryName === 'mouthSmileRight',
        );

        if (smileLeft && smileRight) {
          const avgSmileScore = (smileLeft.score + smileRight.score) / 2;

          if (avgSmileScore >= SMILE_SCORE_THRESHOLD) {
            triggerReaction('smile', 'smile');
          }
        }
      }
    } catch (_err) {}

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
      if (gestureRecognizerRef.current) {
        gestureRecognizerRef.current.close();
        gestureRecognizerRef.current = null;
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
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
