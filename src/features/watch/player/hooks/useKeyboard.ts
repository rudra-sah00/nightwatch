'use client';

import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { PlayerAction } from '../context/types';

interface UseKeyboardOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
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
  isLive?: boolean; // Disables seek/skip shortcuts for live streams
  onInteraction?: () => void;
  onToggleFullscreen?: () => void;
}

export function useKeyboard({
  videoRef,
  containerRef,
  dispatch,
  isFullscreen,
  onToggleCaptions,
  hasNextEpisode,
  onNextEpisode,
  disabled = false,
  isLive = false,
  onInteraction,
  onToggleFullscreen,
}: UseKeyboardOptions) {
  const seek = useCallback(
    (seconds: number) => {
      if (disabled) return;
      const video = videoRef.current;
      if (!video) return;
      if (!Number.isFinite(seconds) || !Number.isFinite(video.currentTime))
        return;

      if (isLive) {
        // DVR seek: clamp within the seekable/buffered range
        const src = video.seekable.length > 0 ? video.seekable : video.buffered;
        if (!src.length) return;
        const start = src.start(0);
        const end = src.end(src.length - 1);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return;
        const currentTime = Number.isFinite(video.currentTime)
          ? video.currentTime
          : start;
        video.currentTime = Math.max(
          start,
          Math.min(end, currentTime + seconds),
        );
      } else {
        if (!Number.isFinite(video.duration)) return;
        const currentTime = Number.isFinite(video.currentTime)
          ? video.currentTime
          : 0;
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        video.currentTime = Math.max(
          0,
          Math.min(duration, currentTime + seconds),
        );
      }
    },
    [videoRef, disabled, isLive],
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
      video.play().catch(() => {});
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
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }

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
  }, [containerRef, onToggleFullscreen]);

  // ── useLatest pattern (rule: advanced-use-latest) ──────────────────────────
  // Store all handler callbacks in a stable ref so the effect only registers
  // once. Each keystroke reads from the ref — always current values, never
  // stale closures. Prevents listener re-registration on every state change.
  const handlersRef = useRef({
    togglePlay,
    seek,
    adjustVolume,
    toggleMute,
    toggleFullscreen,
    onToggleCaptions,
    onNextEpisode,
    dispatch,
    isFullscreen,
    hasNextEpisode,
    disabled,
    isLive,
    onInteraction,
    onToggleFullscreen,
  });
  useEffect(() => {
    handlersRef.current = {
      togglePlay,
      seek,
      adjustVolume,
      toggleMute,
      toggleFullscreen,
      onToggleCaptions,
      onNextEpisode,
      dispatch,
      isFullscreen,
      hasNextEpisode,
      disabled,
      isLive,
      onInteraction,
      onToggleFullscreen,
    };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const h = handlersRef.current;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          if (h.disabled) break;
          e.preventDefault();
          h.togglePlay();
          h.onInteraction?.();
          break;
        case 'ArrowLeft':
          if (h.disabled) break;
          e.preventDefault();
          h.seek(-5);
          h.onInteraction?.();
          break;
        case 'KeyJ':
          if (h.disabled) break;
          e.preventDefault();
          h.seek(-10);
          h.onInteraction?.();
          break;
        case 'ArrowRight':
          if (h.disabled) break;
          e.preventDefault();
          h.seek(5);
          h.onInteraction?.();
          break;
        case 'KeyL':
          if (h.disabled) break;
          e.preventDefault();
          h.seek(10);
          h.onInteraction?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          h.adjustVolume(0.1);
          h.onInteraction?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          h.adjustVolume(-0.1);
          h.onInteraction?.();
          break;
        case 'KeyM':
          h.toggleMute();
          h.onInteraction?.();
          break;
        case 'KeyF':
          h.toggleFullscreen();
          break;
        case 'Escape':
          if (h.isFullscreen) {
            document.exitFullscreen();
          }
          break;
        case 'KeyC':
          e.preventDefault();
          h.onToggleCaptions();
          h.onInteraction?.();
          break;
        case 'KeyN':
          if (h.hasNextEpisode && !h.disabled) {
            e.preventDefault();
            h.onNextEpisode();
          }
          break;
      }
    };

    // Register once — no dependencies, reads via ref
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { togglePlay, toggleMute, toggleFullscreen, seek, adjustVolume };
}
