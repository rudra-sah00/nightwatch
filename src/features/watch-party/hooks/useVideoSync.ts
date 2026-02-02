import { useCallback, useMemo, useRef } from 'react';
import type { PartyStateUpdate } from '@/features/watch-party/types';

interface VideoSyncOptions {
  timeDiffThreshold?: number;
  metadataTimeout?: number;
  minPlaybackRate?: number;
  maxPlaybackRate?: number;
}

const DEFAULT_OPTIONS: Required<VideoSyncOptions> = {
  timeDiffThreshold: 0.5,
  metadataTimeout: 5000,
  minPlaybackRate: 0.25,
  maxPlaybackRate: 2.0,
};

/**
 * Hook to handle video synchronization for watch party guests.
 * Manages time sync, play/pause state, and playback rate.
 */
export function useVideoSync(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: VideoSyncOptions = {},
) {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  const cleanupRef = useRef<(() => void) | null>(null);

  const syncVideo = useCallback(
    (state: PartyStateUpdate) => {
      const video = videoRef.current;
      if (!video) return;

      // Clear any previous pending sync
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      // Handle case where video metadata is not yet loaded
      if (!video.duration || Number.isNaN(video.duration)) {
        cleanupRef.current = handleMetadataNotLoaded(video, state, opts);
        return;
      }

      // Perform immediate sync
      performSync(video, state, opts);
    },
    [videoRef, opts],
  );

  return { syncVideo };
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
      video.play().catch(() => {
        // Silently handle autoplay restrictions
      });
    }

    if (state.playbackRate !== undefined) {
      setPlaybackRate(video, state.playbackRate, opts);
    }
  };

  video.addEventListener('loadedmetadata', applySeek, { once: true });

  const timeoutId = setTimeout(() => {
    if (!applied) {
      applySeek();
    }
  }, opts.metadataTimeout);

  return () => {
    video.removeEventListener('loadedmetadata', applySeek);
    clearTimeout(timeoutId);
  };
}

/**
 * Performs immediate video synchronization.
 */
function performSync(
  video: HTMLVideoElement,
  state: PartyStateUpdate,
  opts: Required<VideoSyncOptions>,
): void {
  // Sync time if difference exceeds threshold
  const timeDiff = Math.abs(video.currentTime - state.currentTime);
  if (timeDiff > opts.timeDiffThreshold) {
    video.currentTime = state.currentTime;
  }

  // Sync play/pause state
  if (state.isPlaying && video.paused) {
    video.play().catch(() => {
      // Silently handle autoplay restrictions
    });
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
