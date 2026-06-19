'use client';

import { useEffect, useRef } from 'react';
import { useMusicStore } from '../store/use-music-store';

/**
 * Syncs music metadata and playback controls to the OS Media Session.
 * Shows track info + play/pause/next/prev on the lock screen and notification shade
 * on both iOS and Android (via the standard Media Session API in the WebView).
 *
 * When remote-controlling another device, shows the remote track info and forwards
 * media key actions as remote commands.
 */
export function MusicMediaSession() {
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const next = useMusicStore((s) => s.next);
  const prev = useMusicStore((s) => s.prev);
  const isRemoteControlling = useMusicStore((s) => s.isRemoteControlling);
  const remoteTrack = useMusicStore((s) => s.remoteTrack);
  const remoteIsPlaying = useMusicStore((s) => s.remoteIsPlaying);
  const remoteProgress = useMusicStore((s) => s.remoteProgress);
  const remoteDuration = useMusicStore((s) => s.remoteDuration);

  const progressRef = useRef(useMusicStore.getState().progress);
  const durationRef = useRef(useMusicStore.getState().duration);

  useEffect(
    () =>
      useMusicStore.subscribe((s) => {
        progressRef.current = s.progress;
        durationRef.current = s.duration;
      }),
    [],
  );

  const displayTrack = isRemoteControlling ? remoteTrack : currentTrack;
  const displayPlaying = isRemoteControlling ? remoteIsPlaying : isPlaying;

  // Start/stop Android foreground service for background playback
  useEffect(() => {
    const isAndroid =
      typeof window !== 'undefined' &&
      window.Capacitor?.getPlatform?.() === 'android';
    if (!isAndroid) return;
    const plugin = (
      window as {
        Capacitor?: {
          Plugins?: Record<
            string,
            {
              start?: (p: Record<string, string>) => Promise<void>;
              stop?: () => Promise<void>;
            }
          >;
        };
      }
    ).Capacitor?.Plugins?.NWMusicService;
    if (!plugin) return;

    if (displayPlaying && displayTrack) {
      plugin
        .start?.({ title: displayTrack.title, artist: displayTrack.artist })
        ?.catch(() => {});
    } else {
      plugin.stop?.()?.catch(() => {});
    }
  }, [displayPlaying, displayTrack]);

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
    if (!('mediaSession' in navigator)) return;

    const updatePosition = () => {
      const track = isRemoteControlling
        ? remoteTrack
        : useMusicStore.getState().currentTrack;
      const dur = isRemoteControlling ? remoteDuration : durationRef.current;
      const prog = isRemoteControlling ? remoteProgress : progressRef.current;
      if (!track || !dur) return;
      try {
        navigator.mediaSession.setPositionState({
          duration: dur,
          position: (prog / 100) * dur,
          playbackRate: 1,
        });
      } catch {
        // Some browsers don't support setPositionState
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 1000);
    return () => clearInterval(interval);
  }, [isRemoteControlling, remoteTrack, remoteDuration, remoteProgress]);

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
