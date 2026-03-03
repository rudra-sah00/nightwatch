import type { Dispatch } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { PlayerAction } from '../context/types';

interface UsePlayerHandlersProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  dispatch: Dispatch<PlayerAction>;
  isPlaying: boolean;
  isPaused: boolean;
  readOnly?: boolean;
  isLoading?: boolean;
  togglePlay: () => void;
  toggleMute: () => void;
  seek: (seconds: number) => void;
  setQuality: (level: number) => void;
  setAudioTrack: (trackId: string) => void;
  qualities: { label: string; height: number }[];
  /** For server 2: called after local state update so the parent can swap the MP4 URL */
  onExternalAudioChange?: (trackId: string) => void;
}

/**
 * Custom hook to manage all player control handlers
 * Extracted from WatchPage to reduce complexity
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

    if (isInteractingRef.current) return;

    controlsTimeoutRef.current = setTimeout(() => {
      // Read from refs — always current even after 3s delay
      if (isPlayingRef.current && !isPausedRef.current) {
        dispatch({ type: 'HIDE_CONTROLS' });
      }
    }, 3000);
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
      if (videoRef.current) {
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
