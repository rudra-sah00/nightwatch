'use client';

import { useEffect } from 'react';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { useMusicPlayerContext } from '../context/MusicPlayerContext';

export function MusicDiscordPresence() {
  const { currentTrack, isPlaying } = useMusicPlayerContext();

  useEffect(() => {
    if (!checkIsDesktop() || !currentTrack || !isPlaying) return;

    desktopBridge.updateDiscordPresence({
      details: currentTrack.title,
      state: `by ${currentTrack.artist}`,
      largeImageKey: currentTrack.image || 'nightwatch_logo',
      largeImageText: currentTrack.album || currentTrack.title,
      smallImageKey: 'nightwatch_logo',
      smallImageText: 'Listening on Nightwatch',
      startTimestamp: Date.now(),
    });
  }, [currentTrack, isPlaying]);

  return null;
}
