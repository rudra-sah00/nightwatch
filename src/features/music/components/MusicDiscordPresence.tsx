'use client';

import { useEffect } from 'react';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { musicPresenceLock } from '@/lib/music-presence-lock';
import { useMusicStore } from '../store/use-music-store';

/**
 * Headless component that syncs the current music track to Discord Rich Presence
 * via the Electron desktop bridge.
 *
 * When a track is playing:
 * - Acquires the shared `musicPresenceLock` to prevent other features (e.g. watch party)
 *   from overwriting the presence.
 * - Sends track metadata (title, artist, album art, timestamps) to the Electron main
 *   process via `desktopBridge.updateDiscordPresence`.
 *
 * When playback stops or the component unmounts:
 * - Releases the presence lock and clears the Discord activity.
 *
 * Only active in the Electron desktop environment (`checkIsDesktop()`).
 * Renders `null` — this is a side-effect-only component.
 */
export function MusicDiscordPresence() {
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const isPlaying = useMusicStore((s) => s.isPlaying);

  useEffect(() => {
    if (!checkIsDesktop()) return;

    if (currentTrack && isPlaying) {
      musicPresenceLock.acquire();
      desktopBridge.updateDiscordPresence({
        details: currentTrack.title,
        state: `by ${currentTrack.artist}`,
        largeImageKey: currentTrack.image || 'nightwatch_logo',
        largeImageText: currentTrack.album || currentTrack.title,
        smallImageKey: 'nightwatch_logo',
        smallImageText: 'Listening on Nightwatch',
        startTimestamp: Date.now(),
      });
    } else {
      musicPresenceLock.release();
      desktopBridge.clearDiscordPresence();
    }

    return () => {
      musicPresenceLock.release();
      desktopBridge.clearDiscordPresence();
    };
  }, [currentTrack, isPlaying]);

  return null;
}
