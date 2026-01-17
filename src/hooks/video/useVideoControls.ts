'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CONTROLS_HIDE_DELAY } from '@/lib/constants';

interface UseVideoControlsOptions {
  isPlaying: boolean;
  showSettingsMenu: boolean;
}

interface UseVideoControlsReturn {
  showControls: boolean;
  handleMouseMove: () => void;
  handleMouseLeave: () => void;
}

export function useVideoControls({
  isPlaying,
  showSettingsMenu,
}: UseVideoControlsOptions): UseVideoControlsReturn {
  const [showControls, setShowControls] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    clearHideTimeout();

    timeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettingsMenu) {
        setShowControls(false);
      }
    }, CONTROLS_HIDE_DELAY);
  }, [isPlaying, showSettingsMenu, clearHideTimeout]);

  const handleMouseLeave = useCallback(() => {
    if (isPlaying && !showSettingsMenu) {
      setShowControls(false);
    }
  }, [isPlaying, showSettingsMenu]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearHideTimeout();
  }, [clearHideTimeout]);

  return {
    showControls,
    handleMouseMove,
    handleMouseLeave,
  };
}
