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
 */
export function MusicMediaSession() {
  const { currentTrack, isPlaying, togglePlay, next, prev } =
    useMusicPlayerContext();
  const { progress, duration } = useMusicPlaybackProgress();

  // Sync metadata when track changes
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork: currentTrack.image
        ? [
            { src: currentTrack.image, sizes: '96x96', type: 'image/jpeg' },
            { src: currentTrack.image, sizes: '256x256', type: 'image/jpeg' },
            { src: currentTrack.image, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [],
    });
  }, [currentTrack]);

  // Sync playback state
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying, currentTrack]);

  // Sync position state for the progress bar on lock screen
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: (progress / 100) * duration,
        playbackRate: 1,
      });
    } catch {
      // Some browsers don't support setPositionState
    }
  }, [progress, duration, currentTrack]);

  // Register action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const handlers: [MediaSessionAction, () => void][] = [
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
  }, [togglePlay, next, prev]);

  return null;
}
