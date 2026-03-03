import { createContext, use } from 'react';
import type { PlayerAction, PlayerState, VideoMetadata } from './types';

export interface PlayerContextValue {
  state: PlayerState;
  dispatch: React.Dispatch<PlayerAction>;
  metadata: VideoMetadata;
  streamUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Callback ref for the DOM <video> element — use this on the <video> tag, not videoRef */
  videoCallbackRef: (el: HTMLVideoElement | null) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  spriteSheet?: {
    imageUrl: string;
    width: number;
    height: number;
    columns: number;
    rows: number;
    interval: number;
  };
  spriteVtt?: string;
  readOnly?: boolean;
  isHost?: boolean;
  isAuthenticated?: boolean;
  onNavigate?: (url: string) => void;
  onStreamExpired?: () => void;
  qualities?: { quality: string; url: string }[];
  captionUrl?: string | null;
  subtitleTracks?: {
    id: string;
    label: string;
    language: string;
    src: string;
  }[];
  // Internal player handlers provided by context
  playerHandlers: {
    togglePlay: () => void;
    toggleMute: () => void;
    seek: (time: number) => void;
    skip: (seconds: number) => void;
    setVolume: (volume: number) => void;
    toggleFullscreen: () => void;
    goBack: () => void;
    setQuality: (quality: string) => void;
    setPlaybackRate: (rate: number) => void;
    setAudioTrack: (trackId: string) => void;
    setSubtitleTrack: (trackId: string | null) => void;
    handleInteraction: (isActive: boolean) => void;
  };
  // Next episode state (only relevant for series)
  nextEpisode: {
    show: boolean;
    info: import('../ui/overlays/NextEpisodeOverlay').NextEpisodeInfo | null;
    isLoading: boolean;
    play: () => Promise<void>;
    cancel: () => void;
  };
}

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayerContext() {
  const context = use(PlayerContext);
  if (!context) {
    throw new Error('Player components must be used within a Player.Root');
  }
  return context;
}
