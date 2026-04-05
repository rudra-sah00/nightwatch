'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * In-app "Theater Mode" fullscreen hook.
 *
 * Unlike the native Fullscreen API (which rips the element out of DOM flow
 * and hides everything else), theater mode uses CSS to expand the video
 * container to fill the viewport while keeping the rest of the page
 * (sidebar, participant audio, chat) intact.
 *
 * Think Google Meet fullscreen — the video fills the screen but the
 * sidebar stays accessible.
 *
 * @remarks
 * - Adds `theater-mode` class + fixed positioning to the container
 * - Locks body scroll while active
 * - Supports Escape key to exit
 * - Dispatches player state updates via the existing reducer
 */

interface UseTheaterModeOptions {
  /** Ref to the video container element that will be expanded */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Player state dispatch for SET_FULLSCREEN action */
  dispatch: React.Dispatch<{ type: 'SET_FULLSCREEN'; isFullscreen: boolean }>;
  /** Callback when theater mode changes (optional) */
  onToggle?: (isTheaterMode: boolean) => void;
}

interface UseTheaterModeReturn {
  /** Whether theater mode is currently active */
  isTheaterMode: boolean;
  /** Enter theater mode */
  enterTheaterMode: () => void;
  /** Exit theater mode */
  exitTheaterMode: () => void;
  /** Toggle theater mode on/off */
  toggleTheaterMode: () => void;
}

export function useTheaterMode({
  containerRef,
  dispatch,
  onToggle,
}: UseTheaterModeOptions): UseTheaterModeReturn {
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const previousOverflowRef = useRef<string>('');
  const previousPositionRef = useRef<string>('');

  const enterTheaterMode = useCallback(() => {
    const container = containerRef.current;
    if (!container || isTheaterMode) return;

    // Save current body styles
    previousOverflowRef.current = document.body.style.overflow;
    previousPositionRef.current = document.body.style.position;

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Apply theater mode styles to container
    container.classList.add('theater-mode');

    setIsTheaterMode(true);
    dispatch({ type: 'SET_FULLSCREEN', isFullscreen: true });
    onToggle?.(true);
  }, [containerRef, isTheaterMode, dispatch, onToggle]);

  const exitTheaterMode = useCallback(() => {
    const container = containerRef.current;
    if (!container || !isTheaterMode) return;

    // Restore body scroll
    document.body.style.overflow = previousOverflowRef.current;
    document.body.style.position = previousPositionRef.current;

    // Remove theater mode styles
    container.classList.remove('theater-mode');

    setIsTheaterMode(false);
    dispatch({ type: 'SET_FULLSCREEN', isFullscreen: false });
    onToggle?.(false);
  }, [containerRef, isTheaterMode, dispatch, onToggle]);

  const toggleTheaterMode = useCallback(() => {
    if (isTheaterMode) {
      exitTheaterMode();
    } else {
      enterTheaterMode();
    }
  }, [isTheaterMode, enterTheaterMode, exitTheaterMode]);

  // Handle Escape key to exit theater mode
  useEffect(() => {
    if (!isTheaterMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        exitTheaterMode();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isTheaterMode, exitTheaterMode]);

  // Cleanup on unmount — ensure we restore body state
  useEffect(() => {
    return () => {
      if (isTheaterMode) {
        document.body.style.overflow = previousOverflowRef.current;
        document.body.style.position = previousPositionRef.current;
      }
    };
  }, [isTheaterMode]);

  return {
    isTheaterMode,
    enterTheaterMode,
    exitTheaterMode,
    toggleTheaterMode,
  };
}
