'use client';

import { useEffect } from 'react';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { musicPresenceLock } from '@/lib/music-presence-lock';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

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
  const { currentTrack, isPlaying } = useMusicPlayerContext();

  useEffect(() => {
    if (!checkIsDesktop()) return;

    if (currentTrack && isPlaying) {
      console.log(
        '[MusicDiscordPresence] acquiring lock, sending presence:',
        currentTrack.title,
        'by',
        currentTrack.artist,
      );
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
      console.log(
        '[MusicDiscordPresence] releasing lock — track:',
        currentTrack?.title ?? 'none',
        'isPlaying:',
        isPlaying,
      );
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
