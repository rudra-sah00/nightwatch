/**
 * Video Player Type Definitions
 */

export interface SpriteSheet {
  spriteUrl: string;
  spriteWidth: number;
  spriteHeight: number;
  tileWidth: number;
  tileHeight: number;
  tilesPerRow: number;
  totalTiles: number;
  intervalSeconds: number;
}

export interface EpisodeInfo {
  seasonNumber: number;
  episodeNumber: number;
  title: string;
}

export interface SyncModeProps {
  enabled: boolean;
  isHost: boolean;
  roomCode: string;
  onPlaybackEvent?: (event: { type: string; isPlaying: boolean; currentTime: number; playbackRate: number }) => void;
}

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  subtitles?: PlayerSubtitleTrack[];
  spriteSheets?: SpriteSheet[];  // Multiple sprite sheets for long movies
  episodeInfo?: EpisodeInfo;
  // Sync mode for watch party
  syncMode?: SyncModeProps;
  // Mute audio (e.g., when in room and user wants to mute video audio)
  externalMuted?: boolean;
}

export interface PlayerSubtitleTrack {
  language: string;
  url: string;
}

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export interface PlayerAudioTrack {
  id: number;
  name: string;
  lang: string;
}

export interface QualityLevel {
  id: number;
  height?: number;
  bitrate?: number;
}

export interface LocalSubtitle {
  language: string;
  url: string;
}

export type SettingsTab = 'main' | 'quality' | 'subtitles' | 'audio' | 'speed';

export type QualityValue = number | 'auto';

export type PlaybackSpeed = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;

export interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  buffered: number;
  isFullscreen: boolean;
  error: string | null;
}

export interface VideoRefs {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  progressBarRef: React.RefObject<HTMLDivElement | null>;
}
