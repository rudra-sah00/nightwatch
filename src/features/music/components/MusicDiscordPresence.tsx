'use client';

import { useEffect } from 'react';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { musicPresenceLock } from '@/lib/music-presence-lock';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

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
