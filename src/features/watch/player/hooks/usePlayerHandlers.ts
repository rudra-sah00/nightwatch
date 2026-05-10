import type { Dispatch } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { PlayerAction } from '../context/types';

/**
 * Props for the {@link usePlayerHandlers} hook.
 */
interface UsePlayerHandlersProps {
  /** Ref to the underlying `<video>` element for direct DOM mutations (volume, currentTime, playbackRate). */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Player state dispatcher. */
  dispatch: Dispatch<PlayerAction>;
  /** Whether the video is currently playing. */
  isPlaying: boolean;
  /** Whether the video is currently paused. */
  isPaused: boolean;
  /** When `true`, all mutating handlers (seek, play, volume, speed) become no-ops. */
  readOnly?: boolean;
  /** When `true`, click-to-play is suppressed (e.g. during initial buffering). */
  isLoading?: boolean;
  /** Low-level play/pause toggle from the HLS/MP4 engine. */
  togglePlay: () => void;
  /** Low-level mute toggle from the engine. */
  toggleMute: () => void;
  /** Low-level seek to an absolute time (seconds). */
  seek: (seconds: number) => void;
  /** Low-level HLS quality level setter (-1 = auto). */
  setQuality: (level: number) => void;
  /** Low-level audio track setter (HLS multi-audio). */
  setAudioTrack: (trackId: string) => void;
  /** Available HLS quality levels for label-to-index resolution. */
  qualities: { label: string; height: number }[];
  /** For server 2: called after local state update so the parent can swap the MP4 URL */
  onExternalAudioChange?: (trackId: string) => void;
}

/**
 * Hook that centralizes all player control handlers.
 *
 * Manages the controls auto-hide timer (3s inactivity) and exposes
 * handler functions consumed by the player UI components:
 *
 * - **`showControls`** — Dispatches `SHOW_CONTROLS` and resets the 3s auto-hide
 *   timer. If the user is actively interacting (menu open), the timer is paused.
 * - **`handleInteraction(isInteracting)`** — Called when menus/sliders open/close.
 *   While `true`, the auto-hide timer is suspended and controls stay visible.
 * - **`handleVideoClick`** — Click handler for the video area. No-op when
 *   `readOnly` or `isLoading`; otherwise toggles play/pause.
 * - **`handleSeek(time)`** — Seeks to an absolute time in seconds via `videoRef.currentTime`.
 * - **`handleSkip(seconds)`** — Relative seek (delegates to the engine's `seek`).
 * - **`handleVolumeChange(volume)`** — Sets volume on the `<video>` element and dispatches state.
 * - **`handleMuteToggle`** — Toggles mute on the `<video>` element.
 * - **`handleTogglePlay`** — Guarded play/pause toggle (respects `readOnly`).
 * - **`handleQualityChange(quality)`** — Resolves a quality label to an HLS level index
 *   (`"auto"` → `-1`) and dispatches `SET_CURRENT_QUALITY`.
 * - **`handlePlaybackRateChange(rate)`** — Sets `videoRef.playbackRate` and dispatches state.
 * - **`handleAudioChange(trackId)`** — Switches audio track and optionally notifies the parent
 *   via `onExternalAudioChange` for server-2 MP4 URL swaps.
 * - **`handleSubtitleChange(trackId)`** — Dispatches `SET_CURRENT_SUBTITLE_TRACK`.
 * - **`handleRetry`** — Clears the error state and re-triggers loading.
 *
 * @param props - See {@link UsePlayerHandlersProps}.
 * @returns Object containing all handler functions listed above.
 */
export function usePlayerHandlers({
  videoRef,
  dispatch,
  isPlaying,
  isPaused,
  readOnly = false,
  isLoading = false,
  togglePlay,
  toggleMute,
  seek,
  setQuality,
  setAudioTrack,
  qualities,
  onExternalAudioChange,
}: UsePlayerHandlersProps) {
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInteractingRef = useRef(false);

  // Keep latest isPlaying/isPaused in refs so the timeout callback always
  // reads live values — not stale closure captures (rule: advanced-use-latest)
  const isPlayingRef = useRef(isPlaying);
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Auto-hide controls after 3 seconds of inactivity
  // dispatch is stable across renders — no need to list isPlaying/isPaused
  const showControls = useCallback(() => {
    dispatch({ type: 'SHOW_CONTROLS' });

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    // Always schedule hide — use longer delay when interacting with controls
    const delay = isInteractingRef.current ? 5000 : 3000;

    controlsTimeoutRef.current = setTimeout(() => {
      // Read from refs — always current even after delay
      if (isPlayingRef.current && !isPausedRef.current) {
        isInteractingRef.current = false;
        dispatch({ type: 'HIDE_CONTROLS' });
      }
    }, delay);
  }, [dispatch]);

  // Handle user interaction (e.g. menu open)
  const handleInteraction = useCallback(
    (isInteracting: boolean) => {
      isInteractingRef.current = isInteracting;
      if (isInteracting) {
        // Clear timeout and show controls
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
        dispatch({ type: 'SHOW_CONTROLS' });
      } else {
        // Restart timer
        showControls();
      }
    },
    [dispatch, showControls],
  );

  // Safety: if isInteracting gets stuck true (e.g. mouseLeave never fires on touch),
  // force-reset after 5s of no activity
  useEffect(() => {
    if (!isInteractingRef.current) return;
    const safety = setTimeout(() => {
      if (isInteractingRef.current) {
        isInteractingRef.current = false;
        if (isPlayingRef.current && !isPausedRef.current) {
          dispatch({ type: 'HIDE_CONTROLS' });
        }
      }
    }, 5000);
    return () => clearTimeout(safety);
  });

  // Show controls when paused, and sync timer when playing
  useEffect(() => {
    if (isPaused) {
      dispatch({ type: 'SHOW_CONTROLS' });
    } else if (isPlaying) {
      // When switching to playing, restart specific hide timer
      showControls();
    }
  }, [isPaused, isPlaying, dispatch, showControls]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Handle seeking to a specific time
  const handleSeek = useCallback(
    (time: number) => {
      if (readOnly) return;
      if (Number.isFinite(time) && videoRef.current) {
        videoRef.current.currentTime = time;
      }
      showControls();
    },
    [videoRef, showControls, readOnly],
  );

  // Handle skipping forward/backward
  const handleSkip = useCallback(
    (seconds: number) => {
      if (readOnly) return;
      seek(seconds);
      showControls();
    },
    [seek, showControls, readOnly],
  );

  // Handle volume changes
  const handleVolumeChange = useCallback(
    (volume: number) => {
      if (videoRef.current) {
        videoRef.current.volume = volume;
        videoRef.current.muted = volume === 0;
      }
      dispatch({ type: 'SET_VOLUME', volume });
      showControls();
    },
    [videoRef, dispatch, showControls],
  );

  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
    toggleMute();
    showControls();
  }, [videoRef, toggleMute, showControls]);

  // Handle play/pause toggle
  const handleTogglePlay = useCallback(() => {
    if (readOnly) return;
    togglePlay();
    showControls();
  }, [togglePlay, showControls, readOnly]);

  // Handle video click for play/pause
  const handleVideoClick = useCallback(() => {
    if (readOnly || isLoading) return;
    handleTogglePlay();
  }, [handleTogglePlay, readOnly, isLoading]);

  // Handle quality change
  const handleQualityChange = useCallback(
    (quality: string) => {
      if (quality === 'auto') {
        setQuality(-1); // Auto quality
      } else {
        const levelIndex = qualities.findIndex((q) => q.label === quality);
        if (levelIndex !== -1) {
          setQuality(levelIndex);
        }
      }
      dispatch({ type: 'SET_CURRENT_QUALITY', quality });
      showControls();
    },
    [setQuality, qualities, dispatch, showControls],
  );

  // Handle playback rate change
  const handlePlaybackRateChange = useCallback(
    (rate: number) => {
      if (readOnly) return;
      if (videoRef.current) {
        videoRef.current.playbackRate = rate;
      }
      dispatch({ type: 'SET_PLAYBACK_RATE', rate });
      showControls();
    },
    [videoRef, dispatch, showControls, readOnly],
  );

  // Handle audio track change
  const handleAudioChange = useCallback(
    (trackId: string) => {
      setAudioTrack(trackId);
      dispatch({ type: 'SET_CURRENT_AUDIO_TRACK', trackId });
      // For server 2 language dubs the parent swaps the top-level streamUrl
      // so useMp4 reloads video.src with the correct CDN MP4 for that language.
      onExternalAudioChange?.(trackId);
      showControls();
    },
    [setAudioTrack, dispatch, showControls, onExternalAudioChange],
  );

  // Handle subtitle track change
  const handleSubtitleChange = useCallback(
    (trackId: string | null) => {
      dispatch({ type: 'SET_CURRENT_SUBTITLE_TRACK', trackId });
      showControls();
    },
    [dispatch, showControls],
  );

  // Handle retry on error
  const handleRetry = useCallback(() => {
    dispatch({ type: 'SET_ERROR', error: null });
    dispatch({ type: 'SET_LOADING', isLoading: true });
  }, [dispatch]);

  return {
    showControls,
    handleInteraction,
    handleSeek,
    handleSkip,
    handleVolumeChange,
    handleMuteToggle,
    handleTogglePlay,
    handleVideoClick,
    handleQualityChange,
    handlePlaybackRateChange,
    handleAudioChange,
    handleSubtitleChange,
    handleRetry,
  };
}
