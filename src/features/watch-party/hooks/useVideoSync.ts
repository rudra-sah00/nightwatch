import { useCallback, useMemo, useRef } from 'react';
import type { PartyStateUpdate } from '@/features/watch-party/types';

interface VideoSyncOptions {
  timeDiffThreshold?: number;
  metadataTimeout?: number;
  minPlaybackRate?: number;
  maxPlaybackRate?: number;
  maxRetries?: number;
  retryDelay?: number;
}

const DEFAULT_OPTIONS: Required<VideoSyncOptions> = {
  timeDiffThreshold: 0.5,
  metadataTimeout: 5000,
  minPlaybackRate: 0.25,
  maxPlaybackRate: 2.0,
  maxRetries: 3,
  retryDelay: 100,
};

/**
 * Hook to handle video synchronization for watch party guests.
 * Manages time sync, play/pause state, and playback rate with robust retry logic.
 */
export function useVideoSync(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: VideoSyncOptions = {},
) {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  const cleanupRef = useRef<(() => void) | null>(null);
  const lastAppliedStateRef = useRef<PartyStateUpdate | null>(null);
  const retryCountRef = useRef(0);
  const pendingRetryRef = useRef<NodeJS.Timeout | null>(null);

  const syncVideo = useCallback(
    (state: PartyStateUpdate) => {
      const video = videoRef.current;
      if (!video) return;

      // Clear any previous pending sync/retry
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      if (pendingRetryRef.current) {
        clearTimeout(pendingRetryRef.current);
        pendingRetryRef.current = null;
      }

      // Store latest state for verification
      lastAppliedStateRef.current = state;
      retryCountRef.current = 0;

      // Handle case where video metadata is not yet loaded
      if (!video.duration || Number.isNaN(video.duration)) {
        cleanupRef.current = handleMetadataNotLoaded(video, state, opts);
        return;
      }

      // Perform sync with retry capability
      performSyncWithRetry(video, state, opts, retryCountRef, pendingRetryRef);
    },
    [videoRef, opts],
  );

  // Verify sync was applied correctly (for external checking)
  const verifySyncState = useCallback(() => {
    const video = videoRef.current;
    const lastState = lastAppliedStateRef.current;
    if (!video || !lastState) return true; // Nothing to verify

    const timeDiff = Math.abs(video.currentTime - lastState.currentTime);
    const playStateMatch = lastState.isPlaying === !video.paused;
    const rateMatch =
      lastState.playbackRate === undefined ||
      video.playbackRate === lastState.playbackRate;

    return timeDiff < opts.timeDiffThreshold && playStateMatch && rateMatch;
  }, [videoRef, opts.timeDiffThreshold]);

  // Force re-apply last known state
  const forceResync = useCallback(() => {
    const video = videoRef.current;
    const lastState = lastAppliedStateRef.current;
    if (!video || !lastState) return;

    retryCountRef.current = 0;
    performSyncWithRetry(
      video,
      lastState,
      opts,
      retryCountRef,
      pendingRetryRef,
    );
  }, [videoRef, opts]);

  return { syncVideo, verifySyncState, forceResync, lastAppliedStateRef };
}

/**
 * Handles sync when video metadata is not yet loaded.
 * Sets up event listeners and timeout fallback.
 */
function handleMetadataNotLoaded(
  video: HTMLVideoElement,
  state: PartyStateUpdate,
  opts: Required<VideoSyncOptions>,
): () => void {
  let applied = false;

  const applySeek = () => {
    if (applied) return;
    applied = true;

    video.currentTime = state.currentTime;

    if (state.isPlaying) {
      playWithRetry(video, opts.maxRetries);
    } else {
      video.pause();
    }

    if (state.playbackRate !== undefined) {
      setPlaybackRate(video, state.playbackRate, opts);
    }
  };

  video.addEventListener('loadedmetadata', applySeek, { once: true });
  video.addEventListener('canplay', applySeek, { once: true });

  const timeoutId = setTimeout(() => {
    if (!applied) {
      applySeek();
    }
  }, opts.metadataTimeout);

  return () => {
    video.removeEventListener('loadedmetadata', applySeek);
    video.removeEventListener('canplay', applySeek);
    clearTimeout(timeoutId);
  };
}

/**
 * Performs immediate video synchronization with retry support.
 */
function performSyncWithRetry(
  video: HTMLVideoElement,
  state: PartyStateUpdate,
  opts: Required<VideoSyncOptions>,
  retryCountRef: React.MutableRefObject<number>,
  pendingRetryRef: React.MutableRefObject<NodeJS.Timeout | null>,
): void {
  // Sync time if difference exceeds threshold
  const timeDiff = Math.abs(video.currentTime - state.currentTime);
  if (timeDiff > opts.timeDiffThreshold) {
    video.currentTime = state.currentTime;
  }

  // Sync play/pause state with verification
  if (state.isPlaying && video.paused) {
    playWithRetry(video, opts.maxRetries - retryCountRef.current);
  } else if (!state.isPlaying && !video.paused) {
    video.pause();
  }

  // Sync playback rate
  if (
    state.playbackRate !== undefined &&
    video.playbackRate !== state.playbackRate
  ) {
    setPlaybackRate(video, state.playbackRate, opts);
  }

  // Verify sync after a short delay and retry if needed
  pendingRetryRef.current = setTimeout(() => {
    const playStateMatch = state.isPlaying === !video.paused;
    if (!playStateMatch && retryCountRef.current < opts.maxRetries) {
      retryCountRef.current++;
      performSyncWithRetry(video, state, opts, retryCountRef, pendingRetryRef);
    }
  }, opts.retryDelay);
}

/**
 * Attempts to play video with retry logic for autoplay restrictions.
 */
function playWithRetry(video: HTMLVideoElement, retriesLeft: number): void {
  video.play().catch((error) => {
    // Handle autoplay restrictions - try muted playback as fallback
    if (error.name === 'NotAllowedError' && retriesLeft > 0) {
      // Try muted first, then unmute after playing
      const wasMuted = video.muted;
      video.muted = true;
      video
        .play()
        .then(() => {
          // Successfully started muted, gradually restore audio
          if (!wasMuted) {
            setTimeout(() => {
              video.muted = false;
            }, 100);
          }
        })
        .catch(() => {
          // Complete failure - video cannot autoplay
          video.muted = wasMuted;
        });
    }
    // AbortError means another play/pause interrupted - ignore
  });
}

/**
 * Safely sets playback rate with validation.
 */
function setPlaybackRate(
  video: HTMLVideoElement,
  rate: number,
  opts: Required<VideoSyncOptions>,
): void {
  if (rate < opts.minPlaybackRate || rate > opts.maxPlaybackRate) {
    return;
  }

  try {
    video.playbackRate = rate;
  } catch {
    // Silently handle invalid playback rate errors
  }
}
