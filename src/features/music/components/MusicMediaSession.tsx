'use client';

import { useEffect } from 'react';
import {
  useMusicPlaybackProgress,
  useMusicPlayerContext,
} from '../context/MusicPlayerContext';

/**
 * Syncs music metadata and playback controls to the OS Media Session.
 * Shows track info + play/pause/next/prev on the lock screen and notification shade
 * on both iOS and Android (via the standard Media Session API in the WebView).
 *
 * When remote-controlling another device, shows the remote track info and forwards
 * media key actions as remote commands.
 */
export function MusicMediaSession() {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    next,
    prev,
    isRemoteControlling,
    remoteTrack,
    remoteIsPlaying,
    remoteProgress,
    remoteDuration,
  } = useMusicPlayerContext();
  const { progress, duration } = useMusicPlaybackProgress();

  const displayTrack = isRemoteControlling ? remoteTrack : currentTrack;
  const displayPlaying = isRemoteControlling ? remoteIsPlaying : isPlaying;
  const displayProgress = isRemoteControlling ? remoteProgress : progress;
  const displayDuration = isRemoteControlling ? remoteDuration : duration;

  // Sync metadata when track changes
  useEffect(() => {
    if (!('mediaSession' in navigator) || !displayTrack) {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: displayTrack.title,
      artist: displayTrack.artist,
      album: displayTrack.album,
      artwork: displayTrack.image
        ? [
            { src: displayTrack.image, sizes: '96x96', type: 'image/jpeg' },
            { src: displayTrack.image, sizes: '256x256', type: 'image/jpeg' },
            { src: displayTrack.image, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [],
    });
  }, [displayTrack]);

  // Sync playback state
  useEffect(() => {
    if (!('mediaSession' in navigator) || !displayTrack) return;
    navigator.mediaSession.playbackState = displayPlaying
      ? 'playing'
      : 'paused';
  }, [displayPlaying, displayTrack]);

  // Sync position state for the progress bar on lock screen
  useEffect(() => {
    if (!('mediaSession' in navigator) || !displayTrack || !displayDuration)
      return;
    try {
      navigator.mediaSession.setPositionState({
        duration: displayDuration,
        position: (displayProgress / 100) * displayDuration,
        playbackRate: 1,
      });
    } catch {
      // Some browsers don't support setPositionState
    }
  }, [displayProgress, displayDuration, displayTrack]);

  // Register action handlers — forward to remote when remote controlling
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const dispatchRemote = (command: string) => {
      window.dispatchEvent(
        new CustomEvent('music:remote-command', { detail: command }),
      );
    };

    const handlers: [MediaSessionAction, () => void][] = isRemoteControlling
      ? [
          ['play', () => dispatchRemote('toggle_play')],
          ['pause', () => dispatchRemote('toggle_play')],
          ['nexttrack', () => dispatchRemote('next')],
          ['previoustrack', () => dispatchRemote('prev')],
        ]
      : [
          ['play', togglePlay],
          ['pause', togglePlay],
          ['nexttrack', next],
          ['previoustrack', prev],
        ];

    for (const [action, handler] of handlers) {
      navigator.mediaSession.setActionHandler(action, handler);
    }

    return () => {
      for (const [action] of handlers) {
        navigator.mediaSession.setActionHandler(action, null);
      }
    };
  }, [isRemoteControlling, togglePlay, next, prev]);

  return null;
}
