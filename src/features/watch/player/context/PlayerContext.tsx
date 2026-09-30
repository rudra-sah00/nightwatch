import type HlsType from 'hls.js';
import { createContext, use } from 'react';
import type { PlayerAction, PlayerState, VideoMetadata } from './types';

/**
 * Everything about the player that does not change four times a second.
 *
 * Split from the playhead because `SET_TIME` is dispatched from `timeupdate` at ~4Hz, and a
 * single context meant each of those woke every consumer — including the majority that read only
 * handlers, refs and metadata. Keeping them apart means a component that never asks for the
 * playhead is never re-rendered by it.
 */
interface PlayerStableValue {
  dispatch: React.Dispatch<PlayerAction>;
  metadata: VideoMetadata;
  streamUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** HLS.js instance ref — used by clip recorder to tap into fragment events */
  hlsRef: React.RefObject<HlsType | null>;
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
    /**
     * Raise playback to 2x for the duration of a hold gesture.
     *
     * @returns `true` if the gesture counts as a hold, so the caller must not also fire
     *   its tap action. `false` when boosting is impossible (paused, live, read-only).
     */
    engageSpeedBoost: () => boolean;
    /** Restore the pre-boost rate. Safe to call when nothing is engaged. */
    releaseSpeedBoost: () => void;
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

/** The volatile half: the reducer state, which changes at ~4Hz during playback. */
interface PlayerStateValue {
  state: PlayerState;
}

/** The full shape, for consumers that genuinely need both halves. */
export type PlayerContextValue = PlayerStableValue & PlayerStateValue;

export const PlayerStableContext = createContext<PlayerStableValue | null>(
  null,
);
export const PlayerContext = createContext<PlayerStateValue | null>(null);

/**
 * Handlers, refs, metadata and config — everything except the playhead.
 *
 * Prefer this over {@link usePlayerContext} wherever `state` is not read. A component
 * subscribing only here is not re-rendered by a time update, which is the whole point of the
 * split: 18 of the player's consumers read no state at all and were being woken 4 times a second.
 */
export function usePlayerControls(): PlayerStableValue {
  const stable = use(PlayerStableContext);
  if (!stable) {
    throw new Error('Player components must be used within a Player.Root');
  }
  return stable;
}

/**
 * The player state plus everything {@link usePlayerControls} provides.
 *
 * Subscribes to both contexts, so a consumer of this re-renders on every `SET_TIME`. That is
 * correct for anything displaying the playhead, and wrong for anything that is not — use
 * `usePlayerControls` there instead.
 */
export function usePlayerContext(): PlayerContextValue {
  const stable = usePlayerControls();
  const volatile = use(PlayerContext);
  if (!volatile) {
    throw new Error('Player components must be used within a Player.Root');
  }
  // A new object per render is free here: subscribing to the state context already guarantees
  // this component re-renders whenever the state changes.
  return { ...stable, ...volatile };
}
