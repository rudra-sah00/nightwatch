'use client';

import { useCallback, useEffect } from 'react';
import { SKIP_SECONDS, VOLUME_STEP } from '@/lib/constants';

interface UseKeyboardControlsOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  togglePlay: () => void;
  skip: (seconds: number) => void;
  setVolume: (volume: number) => void;
  volume: number;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  closeMenus: () => void;
}

export function useKeyboardControls({
  containerRef,
  togglePlay,
  skip,
  setVolume,
  volume,
  toggleMute,
  toggleFullscreen,
  closeMenus,
}: UseKeyboardControlsOptions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Only handle if focus is within container or on body
      if (
        !containerRef.current?.contains(document.activeElement) &&
        document.activeElement !== document.body
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          skip(-SKIP_SECONDS);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          skip(SKIP_SECONDS);
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(volume + VOLUME_STEP);
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(volume - VOLUME_STEP);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'escape':
          closeMenus();
          break;
      }
    },
    [containerRef, togglePlay, skip, setVolume, volume, toggleMute, toggleFullscreen, closeMenus]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
