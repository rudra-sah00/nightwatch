'use client';

import { type MutableRefObject, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { PlayerAction } from './types';

interface UseKeyboardOptions {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  dispatch: React.Dispatch<PlayerAction>;
  isFullscreen: boolean;
  onBack: () => void;
  // Caption toggle
  currentSubtitleTrack: string | null;
  onToggleCaptions: () => void;
  // Next episode
  hasNextEpisode: boolean;
  onNextEpisode: () => void;
  disabled?: boolean; // For watch party guests (disables playback controls)
}

export function useKeyboard({
  videoRef,
  containerRef,
  dispatch,
  isFullscreen,
  onBack,
  onToggleCaptions,
  hasNextEpisode,
  onNextEpisode,
  disabled = false,
}: UseKeyboardOptions) {
  const seek = useCallback(
    (seconds: number) => {
      if (disabled) return;
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = Math.max(
        0,
        Math.min(video.duration, video.currentTime + seconds),
      );
    },
    [videoRef, disabled],
  );

  const adjustVolume = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      const newVolume = Math.max(0, Math.min(1, video.volume + delta));
      video.volume = newVolume;
      dispatch({ type: 'SET_VOLUME', volume: newVolume });
    },
    [videoRef, dispatch],
  );

  const togglePlay = useCallback(() => {
    if (disabled) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, [videoRef, disabled]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    dispatch({ type: 'TOGGLE_MUTE' });
  }, [videoRef, dispatch]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await containerRef.current.requestFullscreen();
      }
    } catch {
      toast.error('Fullscreen toggle failed');
    }
  }, [containerRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          if (disabled) break;
          e.preventDefault();
          togglePlay();
          dispatch({ type: 'SHOW_CONTROLS' });
          break;
        case 'ArrowLeft':
        case 'KeyJ':
          if (disabled) break;
          e.preventDefault();
          seek(-10);
          dispatch({ type: 'SHOW_CONTROLS' });
          break;
        case 'ArrowRight':
        case 'KeyL':
          if (disabled) break;
          e.preventDefault();
          seek(10);
          dispatch({ type: 'SHOW_CONTROLS' });
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolume(0.1);
          dispatch({ type: 'SHOW_CONTROLS' });
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(-0.1);
          dispatch({ type: 'SHOW_CONTROLS' });
          break;
        case 'KeyM':
          toggleMute();
          dispatch({ type: 'SHOW_CONTROLS' });
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
          } else {
            onBack();
          }
          break;
        case 'KeyC':
          e.preventDefault();
          onToggleCaptions();
          dispatch({ type: 'SHOW_CONTROLS' });
          break;
        case 'KeyN':
          if (hasNextEpisode && !disabled) {
            e.preventDefault();
            onNextEpisode();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    seek,
    adjustVolume,
    toggleMute,
    toggleFullscreen,
    isFullscreen,
    onBack,
    dispatch,
    onToggleCaptions,
    hasNextEpisode,
    onNextEpisode,
    disabled,
  ]);

  return { togglePlay, toggleMute, toggleFullscreen, seek, adjustVolume };
}
