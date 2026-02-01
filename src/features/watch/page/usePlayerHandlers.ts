import type { Dispatch } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { PlayerAction } from '../player/types';

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
}: UsePlayerHandlersProps) {
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls after 3 seconds of inactivity
  const showControls = useCallback(() => {
    dispatch({ type: 'SHOW_CONTROLS' });

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isPaused) {
        dispatch({ type: 'HIDE_CONTROLS' });
      }
    }, 3000);
  }, [dispatch, isPlaying, isPaused]);

  // Show controls when paused
  useEffect(() => {
    if (isPaused) {
      dispatch({ type: 'SHOW_CONTROLS' });
    }
  }, [isPaused, dispatch]);

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
      showControls();
    },
    [setAudioTrack, dispatch, showControls],
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
