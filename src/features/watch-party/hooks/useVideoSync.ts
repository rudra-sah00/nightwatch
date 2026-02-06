import { useCallback, useMemo, useRef } from 'react';
import type { PartyStateUpdate } from '@/features/watch-party/types';

interface VideoSyncOptions {
  /**
   * Hard seek threshold - if drift exceeds this, do a hard seek
   * Default: 2.0 seconds
   */
  hardSeekThreshold?: number;
  /**
   * Soft correction zone - below this, no correction needed
   * Default: 0.3 seconds
   */
  softCorrectionThreshold?: number;
  /**
   * Rate to use when catching up (slightly faster)
   * Default: 1.03 (3% faster)
   */
  catchUpRate?: number;
  /**
   * Rate to use when slowing down (slightly slower)
   * Default: 0.97 (3% slower)
   */
  slowDownRate?: number;
  metadataTimeout?: number;
  minPlaybackRate?: number;
  maxPlaybackRate?: number;
  maxRetries?: number;
  retryDelay?: number;
}

const DEFAULT_OPTIONS: Required<VideoSyncOptions> = {
  hardSeekThreshold: 2.0, // Only hard seek if >2s drift
  softCorrectionThreshold: 0.3, // No correction below 0.3s
  catchUpRate: 1.03, // 3% faster to catch up
  slowDownRate: 0.97, // 3% slower if ahead
  metadataTimeout: 5000,
  minPlaybackRate: 0.25,
  maxPlaybackRate: 2.0,
  maxRetries: 3,
  retryDelay: 100,
};

/**
 * Hook to handle video synchronization for watch party guests.
 * Uses gradual playback rate adjustment instead of hard seeks to avoid audio cutting.
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
  const hostPlaybackRateRef = useRef<number>(1); // Track host's intended rate
  const correctionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      // Track host's intended playback rate
      if (state.playbackRate !== undefined) {
        hostPlaybackRateRef.current = state.playbackRate;
      }

      // Handle case where video metadata is not yet loaded
      if (!video.duration || Number.isNaN(video.duration)) {
        cleanupRef.current = handleMetadataNotLoaded(
          video,
          state,
          opts,
          hostPlaybackRateRef,
          correctionTimeoutRef,
        );
        return;
      }

      // Perform sync with drift correction
      performDriftCorrection(
        video,
        state,
        opts,
        retryCountRef,
        pendingRetryRef,
        hostPlaybackRateRef,
        correctionTimeoutRef,
      );
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

    // Use hard seek threshold for verification (more lenient)
    return timeDiff < opts.hardSeekThreshold && playStateMatch;
  }, [videoRef, opts.hardSeekThreshold]);

  // Force re-apply last known state
  const forceResync = useCallback(() => {
    const video = videoRef.current;
    const lastState = lastAppliedStateRef.current;
    if (!video || !lastState) return;

    retryCountRef.current = 0;
    performDriftCorrection(
      video,
      lastState,
      opts,
      retryCountRef,
      pendingRetryRef,
      hostPlaybackRateRef,
      correctionTimeoutRef,
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
  hostPlaybackRateRef: React.MutableRefObject<number>,
  correctionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
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
      hostPlaybackRateRef.current = state.playbackRate;
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
    if (correctionTimeoutRef.current) {
      clearTimeout(correctionTimeoutRef.current);
    }
  };
}

/**
 * Performs drift correction using gradual playback rate adjustment.
 * Only does hard seek for large drifts or state changes.
 */
function performDriftCorrection(
  video: HTMLVideoElement,
  state: PartyStateUpdate,
  opts: Required<VideoSyncOptions>,
  retryCountRef: React.MutableRefObject<number>,
  pendingRetryRef: React.MutableRefObject<NodeJS.Timeout | null>,
  hostPlaybackRateRef: React.MutableRefObject<number>,
  correctionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
): void {
  // Calculate drift (positive = guest is behind, negative = guest is ahead)
  const drift = state.currentTime - video.currentTime;
  const absDrift = Math.abs(drift);

  // Sync play/pause state immediately (this is critical)
  if (state.isPlaying && video.paused) {
    playWithRetry(video, opts.maxRetries - retryCountRef.current);
  } else if (!state.isPlaying && !video.paused) {
    video.pause();
    // When paused, also sync exact position
    if (absDrift > opts.softCorrectionThreshold) {
      video.currentTime = state.currentTime;
    }
  }

  // If paused, no need for drift correction - just sync position
  if (!state.isPlaying) {
    if (absDrift > opts.softCorrectionThreshold) {
      video.currentTime = state.currentTime;
    }
    // Reset to host rate when paused
    setPlaybackRate(video, hostPlaybackRateRef.current, opts);
    return;
  }

  // Large drift: hard seek (user probably scrubbed or just joined)
  if (absDrift > opts.hardSeekThreshold) {
    video.currentTime = state.currentTime;
    setPlaybackRate(video, hostPlaybackRateRef.current, opts);
    return;
  }

  // Clear any existing correction timeout
  if (correctionTimeoutRef.current) {
    clearTimeout(correctionTimeoutRef.current);
    correctionTimeoutRef.current = null;
  }

  // Small drift: no correction needed
  if (absDrift <= opts.softCorrectionThreshold) {
    // Ensure we're at host's intended rate
    if (video.playbackRate !== hostPlaybackRateRef.current) {
      setPlaybackRate(video, hostPlaybackRateRef.current, opts);
    }
    return;
  }

  // Medium drift: gradual correction via playback rate adjustment
  // Guest is behind (positive drift) -> speed up
  // Guest is ahead (negative drift) -> slow down
  const correctionRate =
    drift > 0
      ? hostPlaybackRateRef.current * opts.catchUpRate
      : hostPlaybackRateRef.current * opts.slowDownRate;

  setPlaybackRate(video, correctionRate, opts);

  // Calculate how long to apply the correction rate
  // At 3% speed difference, we correct ~0.03s per second
  // To correct 'absDrift' seconds, we need: absDrift / 0.03 seconds
  const correctionDuration = Math.min(
    (absDrift / Math.abs(1 - opts.catchUpRate)) * 1000,
    5000, // Cap at 5 seconds of correction
  );

  // After correction period, return to normal rate
  correctionTimeoutRef.current = setTimeout(() => {
    if (video && !video.paused) {
      setPlaybackRate(video, hostPlaybackRateRef.current, opts);
    }
  }, correctionDuration);

  // Verify sync after a short delay and retry if needed
  pendingRetryRef.current = setTimeout(() => {
    const playStateMatch = state.isPlaying === !video.paused;
    if (!playStateMatch && retryCountRef.current < opts.maxRetries) {
      retryCountRef.current++;
      performDriftCorrection(
        video,
        state,
        opts,
        retryCountRef,
        pendingRetryRef,
        hostPlaybackRateRef,
        correctionTimeoutRef,
      );
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
