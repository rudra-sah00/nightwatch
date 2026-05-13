'use client';

import { useEffect, useRef } from 'react';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

/**
 * Registers global keyboard shortcuts for music playback controls.
 *
 * Shortcuts are only active when a track is loaded (local or remote).
 * All shortcuts are suppressed when an `<input>`, `<textarea>`, or
 * `contentEditable` element is focused to avoid interfering with text entry.
 *
 * When remote-controlling another device, commands are dispatched as
 * `music:remote-command` custom events instead of calling local engine methods.
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
    isRemoteControlling,
    remoteTrack,
  } = useMusicPlayerContext();

  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const isRemoteRef = useRef(isRemoteControlling);
  isRemoteRef.current = isRemoteControlling;

  const hasTrack = !!(currentTrack || remoteTrack);

  useEffect(() => {
    if (!hasTrack) return;

    const dispatchRemote = (command: string, value?: unknown) => {
      window.dispatchEvent(
        new CustomEvent('music:remote-command', {
          detail: value !== undefined ? { command, value } : command,
        }),
      );
    };

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const remote = isRemoteRef.current;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (remote) dispatchRemote('toggle_play');
          else togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (remote) dispatchRemote('prev');
          else prev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (remote) dispatchRemote('next');
          else next();
          break;
        case 'ArrowUp': {
          e.preventDefault();
          const v = Math.min(1, volumeRef.current + 0.1);
          setVolume(v);
          if (remote) dispatchRemote('volume', v);
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          const v = Math.max(0, volumeRef.current - 0.1);
          setVolume(v);
          if (remote) dispatchRemote('volume', v);
          break;
        }
        case 'm':
        case 'M': {
          const v = volumeRef.current > 0 ? 0 : 1;
          setVolume(v);
          if (remote) dispatchRemote('volume', v);
          break;
        }
        case 's':
        case 'S':
          if (remote) dispatchRemote('toggle_shuffle');
          else toggleShuffle();
          break;
        case 'r':
        case 'R':
          if (remote) dispatchRemote('cycle_repeat');
          else cycleRepeat();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasTrack, togglePlay, next, prev, setVolume, toggleShuffle, cycleRepeat]);
}
