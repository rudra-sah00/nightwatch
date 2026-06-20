import { registerPlugin } from '@capacitor/core';

interface NWMusicServicePlugin {
  start(options: {
    title: string;
    artist: string;
    imageUrl: string;
    isPlaying: boolean;
  }): Promise<void>;
  update(options: {
    title: string;
    artist: string;
    imageUrl: string;
    isPlaying: boolean;
  }): Promise<void>;
  stop(): Promise<void>;
  addListener(
    event: 'musicCommand',
    cb: (data: { command: string }) => void,
  ): Promise<{ remove: () => void }>;
}

export const NWMusicService =
  registerPlugin<NWMusicServicePlugin>('NWMusicService');
