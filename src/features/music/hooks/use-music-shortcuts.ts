'use client';

import { useEffect } from 'react';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

/**
 * Global keyboard shortcuts for music playback.
 *
 * Space — play/pause (only when no input/textarea focused)
 * ArrowLeft — previous track
 * ArrowRight — next track
 * ArrowUp — volume up 10%
 * ArrowDown — volume down 10%
 * M — mute/unmute
 * S — toggle shuffle
 * R — cycle repeat mode
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
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
        case 'm':
        case 'M':
          setVolume(volume > 0 ? 0 : 1);
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
  }, [
    currentTrack,
    togglePlay,
    next,
    prev,
    volume,
    setVolume,
    toggleShuffle,
    cycleRepeat,
  ]);
}
