import { registerPlugin } from '@capacitor/core';

interface NWMusicServicePlugin {
  start(options: {
    title: string;
    artist: string;
    imageUrl: string;
    isPlaying: boolean;
    duration: number;
    position: number;
  }): Promise<void>;
  update(options: {
    title: string;
    artist: string;
    imageUrl: string;
    isPlaying: boolean;
    duration: number;
    position: number;
  }): Promise<void>;
  stop(): Promise<void>;
  addListener(
    event: 'musicCommand',
    cb: (data: { command: string; value?: number }) => void,
  ): Promise<{ remove: () => void }>;
}

export const NWMusicService =
  registerPlugin<NWMusicServicePlugin>('NWMusicService');
