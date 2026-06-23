'use client';

import { useEffect } from 'react';
import { useMusicDevices } from '@/features/music/hooks/use-music-devices';
import { useMusicStore } from '@/features/music/store/use-music-store';

/**
 * Headless component that registers the music remote command handler on TV.
 *
 * On web/mobile, `MusicDevicePicker` → `useMusicDeviceSync` handles this.
 * TV doesn't mount that picker, so commands from phone would be silently dropped.
 * This component fills that gap.
 */
export function TvMusicCommandHandler() {
  const currentTrack = useMusicStore((s) => s.currentTrack);
  const queue = useMusicStore((s) => s.queue);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const progress = useMusicStore((s) => s.progress);
  const duration = useMusicStore((s) => s.duration);
  const play = useMusicStore((s) => s.play);
  const stop = useMusicStore((s) => s.stop);
  const next = useMusicStore((s) => s.next);
  const prev = useMusicStore((s) => s.prev);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const seek = useMusicStore((s) => s.seek);
  const setVolume = useMusicStore((s) => s.setVolume);
  const toggleShuffle = useMusicStore((s) => s.toggleShuffle);
  const cycleRepeat = useMusicStore((s) => s.cycleRepeat);

  const { setOnCommand } = useMusicDevices(
    currentTrack,
    isPlaying,
    progress,
    duration,
  );

  useEffect(() => {
    setOnCommand((cmd, value) => {
      switch (cmd) {
        case 'toggle_play':
          togglePlay();
          break;
        case 'next':
          next();
          break;
        case 'prev':
          prev();
          break;
        case 'seek':
          if (typeof value === 'number') seek(value);
          break;
        case 'volume':
          if (typeof value === 'number') setVolume(value);
          break;
        case 'play_track':
          if (value) play(value as Parameters<typeof play>[0], queue);
          break;
        case 'stop':
          stop();
          break;
        case 'toggle_shuffle':
          toggleShuffle();
          break;
        case 'cycle_repeat':
          cycleRepeat();
          break;
      }
    });
  }, [
    setOnCommand,
    togglePlay,
    next,
    prev,
    seek,
    stop,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    play,
    queue,
  ]);

  return null;
}
