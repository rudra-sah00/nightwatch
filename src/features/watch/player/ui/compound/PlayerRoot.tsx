'use client';
import { RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PlayerContext } from '../../context/PlayerContext';
import type { VideoMetadata } from '../../context/types';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';
import { usePlayerRoot } from './hooks/use-player-root';

interface PlayerRootProps {
  children: ReactNode;
  streamUrl: string | null;
  metadata: VideoMetadata;
  captionUrl?: string | null;
  subtitleTracks?: {
    id: string;
    label: string;
    language: string;
    src: string;
  }[];
  qualities?: { quality: string; url: string }[];
  spriteVtt?: string;
  spriteSheet?: {
    imageUrl: string;
    width: number;
    height: number;
    columns: number;
    rows: number;
    interval: number;
  };
  /** Preferred explicit interaction variant. */
  interactionMode?: 'interactive' | 'read-only';
  /** Preferred explicit controls visibility variant. */
  controlsVisibility?: 'visible' | 'hidden';
  /** Preferred explicit stream variant. */
  streamMode?: 'vod' | 'live';
  /** Legacy compatibility: replaced by interactionMode. */
  readOnly?: boolean;
  /** Legacy compatibility: use role semantics in parent flows. */
  isHost?: boolean;
  /** Legacy compatibility: pass auth state from parent. */
  isAuthenticated?: boolean;
  onNavigate?: (url: string) => void;
  fullscreenToggleOverride?: () => void;
  isFullscreenOverride?: boolean;
  onStreamExpired?: () => void;
  className?: string;
  /** Legacy compatibility: replaced by controlsVisibility. */
  hideControls?: boolean;
  onVideoRef?: (ref: HTMLVideoElement | null) => void;
  /** Server 2 language dubs pre-populated from the /play response */
  initialAudioTracks?: {
    id: string;
    label: string;
    language: string;
    streamUrl: string;
  }[];
  /** Pre-selected track ID — highlights the currently-playing dub in the AudioSelector on load */
  initialAudioTrackId?: string;
  /** Callback fired when the user picks a dub; parent swaps streamUrl */
  onAudioTrackChange?: (trackId: string) => void;
  /** Override the back button destination (defaults to /home) */
  onBack?: () => void;
  /** Legacy compatibility: replaced by streamMode. */
  isLive?: boolean;
  /** Override the default 100dvh container sizing (e.g. for YouTube-style embedded layout) */
  containerStyle?: React.CSSProperties;
  /** Allow portrait playback on mobile (disables rotate wall) for inline layouts. */
  allowPortraitPlayback?: boolean;
  /** Pass the explicit provider ID to resolve the appropriate engine (hls vs mp4) if URL has no extension */
  providerId?: 's1' | 's2' | 's3';
  playbackRate?: number;
}

const CONTAINER_STYLE = { width: '100%', height: '100dvh' } as const;

export function PlayerRoot({
  children,
  streamUrl,
  metadata,
  captionUrl,
  subtitleTracks,
  qualities,
  spriteVtt,
  spriteSheet,
  interactionMode,
  controlsVisibility,
  streamMode,
  readOnly = false,
  isHost = true,
  isAuthenticated = true,
  onNavigate,
  fullscreenToggleOverride,
  isFullscreenOverride,
  onStreamExpired,
  className,
  hideControls = false,
  onVideoRef,
  initialAudioTracks,
  initialAudioTrackId,
  onAudioTrackChange,
  onBack: onBackProp,
  isLive = false,
  containerStyle,
  allowPortraitPlayback = false,
  providerId,
  playbackRate,
}: PlayerRootProps) {
  const resolvedReadOnly =
    interactionMode === 'read-only'
      ? true
      : interactionMode === 'interactive'
        ? false
        : readOnly;

  const resolvedHideControls =
    controlsVisibility === 'hidden'
      ? true
      : controlsVisibility === 'visible'
        ? false
        : hideControls;

  const resolvedIsLive =
    streamMode === 'live' ? true : streamMode === 'vod' ? false : isLive;

  const { state, containerRef, contextValue, showControls } = usePlayerRoot({
    streamUrl,
    metadata,
    captionUrl,
    subtitleTracks,
    qualities,
    spriteVtt,
    spriteSheet,
    readOnly: resolvedReadOnly,
    isHost,
    isAuthenticated,
    onNavigate,
    fullscreenToggleOverride,
    isFullscreenOverride,
    onStreamExpired,
    onVideoRef,
    initialAudioTracks,
    onAudioTrackChange,
    initialAudioTrackId,
    onBack: onBackProp,
    isLive: resolvedIsLive,
    providerId,
    playbackRate,
  });

  const isMobile = useMobileDetection();
  const isPortrait = useMobileOrientation();
  // Android: orientation lock + real fullscreen kick in automatically so this
  // only triggers on iOS Safari where the OS won't rotate programmatically.
  // Also suppress the wall when the player is already in fullscreen (either
  // real browser fullscreen on Android, or the manual iOS state) — in that
  // case the video IS covering the screen and the wall just blocks content.
  const showRotateWall =
    isMobile &&
    isPortrait &&
    state.isPlaying &&
    !allowPortraitPlayback &&
    !isFullscreenOverride &&
    !state.isFullscreen;

  return (
    <PlayerContext value={contextValue}>
      <section
        ref={containerRef}
        className={cn(
          'video-container relative w-full h-[100dvh] bg-black overflow-hidden flex flex-col',
          'cursor-none',
          state.showControls && !resolvedHideControls && 'cursor-auto',
          className,
        )}
        style={containerStyle ?? CONTAINER_STYLE}
        onMouseMove={showControls}
        onMouseEnter={showControls}
        aria-label="Video Player"
      >
        {children}

        {/* iOS portrait wall: blocks playback UI until user physically rotates device */}
        {showRotateWall && (
          <div className="absolute inset-0 z-50 bg-[#ffcc00] flex flex-col items-center justify-center gap-8 pointer-events-auto select-none p-6 text-center">
            <div className="bg-white border-[4px] border-border p-4  rounded-none">
              <RotateCw className="w-16 h-16 text-foreground animate-spin [animation-duration:2s] stroke-[3px]" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-foreground text-2xl font-black font-headline uppercase tracking-widest">
                Rotate to landscape
              </p>
              <p className="text-foreground text-sm font-bold font-headline uppercase tracking-widest max-w-[250px] mx-auto">
                This player is only available in landscape mode
              </p>
            </div>
          </div>
        )}
      </section>
    </PlayerContext>
  );
}
