export interface RemoteStreamAdvertise {
  socketId: string;
  deviceName: string;
  type: 'movie' | 'series' | 'livestream';
  title: string;
  posterUrl: string | null;
  movieId: string;
  seriesId?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface RemoteStreamEnded {
  socketId: string;
}

export interface RemoteStateUpdate {
  socketId: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  title?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
}

export type RemoteCommandType =
  | 'play'
  | 'pause'
  | 'toggle_play'
  | 'seek_forward'
  | 'seek_backward'
  | 'seek_to'
  | 'next_episode';

export interface RemoteCommandPayload {
  targetSocketId: string;
  command: RemoteCommandType;
  seekSeconds?: number;
  seekTo?: number;
}

export const REMOTE_EVENTS = {
  STREAM_ADVERTISE: 'remote:stream_advertise',
  STREAM_ENDED: 'remote:stream_ended',
  COMMAND: 'remote:command',
  STATE_UPDATE: 'remote:state_update',
  REQUEST_ADVERTISE: 'remote:request_advertise',
} as const;
