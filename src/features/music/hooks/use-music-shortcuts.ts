'use client';

import { useEffect, useRef } from 'react';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

/**
 * Registers global keyboard shortcuts for music playback controls.
 *
 * Shortcuts are only active when a track is loaded. All shortcuts are
 * suppressed when an `<input>`, `<textarea>`, or `contentEditable` element
 * is focused to avoid interfering with text entry.
 *
 * | Key          | Action                        |
 * |--------------|-------------------------------|
 * | `Space`      | Toggle play / pause           |
 * | `ArrowLeft`  | Previous track                |
 * | `ArrowRight` | Next track                    |
 * | `ArrowUp`    | Volume up 10 %                |
 * | `ArrowDown`  | Volume down 10 %              |
 * | `M`          | Mute / unmute (toggle 0 ↔ 1)  |
 * | `S`          | Toggle shuffle                |
 * | `R`          | Cycle repeat mode             |
 *
 * @example
 * ```tsx
 * // Call once at the top of the music player layout
 * useMusicShortcuts();
 * ```
 */
export function useMusicShortcuts() {
  const {
    currentTrack,
    togglePlay,
    next,
    prev,
    volume,
    setVolume,
    toggleShuffle,
    cycleRepeat,
  } = useMusicPlayerContext();

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    if (!currentTrack) return;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          next();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volumeRef.current + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volumeRef.current - 0.1));
          break;
        case 'm':
        case 'M':
          setVolume(volumeRef.current > 0 ? 0 : 1);
          break;
        case 's':
        case 'S':
          toggleShuffle();
          break;
        case 'r':
        case 'R':
          cycleRepeat();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentTrack, togglePlay, next, prev, setVolume, toggleShuffle, cycleRepeat]);
}
