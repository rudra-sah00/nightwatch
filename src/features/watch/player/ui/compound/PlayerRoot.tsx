'use client';
import { RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PlayerContext } from '../../context/PlayerContext';
import type { VideoMetadata } from '../../context/types';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';
import { usePlayerRoot } from './use-player-root';

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
  readOnly?: boolean;
  isHost?: boolean;
  isAuthenticated?: boolean;
  onNavigate?: (url: string) => void;
  fullscreenToggleOverride?: () => void;
  isFullscreenOverride?: boolean;
  onStreamExpired?: () => void;
  className?: string;
  hideControls?: boolean;
  onVideoRef?: (ref: HTMLVideoElement | null) => void;
  /** Server 2 language dubs pre-populated from the /play response */
  initialAudioTracks?: {
    id: string;
    label: string;
    language: string;
    streamUrl: string;
  }[];
  /** Callback fired when the user picks a dub; parent swaps streamUrl */
  onAudioTrackChange?: (trackId: string) => void;
  /** Override the back button destination (defaults to /home) */
  onBack?: () => void;
  /** Pass true for live streams — uses a low-latency HLS config that stays at the live edge */
  isLive?: boolean;
  /** Override the default 100dvh container sizing (e.g. for YouTube-style embedded layout) */
  containerStyle?: React.CSSProperties;
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
  onAudioTrackChange,
  onBack: onBackProp,
  isLive = false,
  containerStyle,
}: PlayerRootProps) {
  const { state, containerRef, contextValue, showControls } = usePlayerRoot({
    streamUrl,
    metadata,
    captionUrl,
    subtitleTracks,
    qualities,
    spriteVtt,
    spriteSheet,
    readOnly,
    isHost,
    isAuthenticated,
    onNavigate,
    fullscreenToggleOverride,
    isFullscreenOverride,
    onStreamExpired,
    onVideoRef,
    initialAudioTracks,
    onAudioTrackChange,
    onBack: onBackProp,
    isLive,
  });

  const isMobile = useMobileDetection();
  const isPortrait = useMobileOrientation();
  // Android: orientation lock + real fullscreen kick in automatically so this
  // only triggers on iOS Safari where the OS won't rotate programmatically.
  const showRotateWall =
    isMobile && isPortrait && state.isPlaying && !isFullscreenOverride;

  return (
    <PlayerContext value={contextValue}>
      <section
        ref={containerRef}
        className={cn(
          'video-container relative w-full h-[100dvh] bg-black overflow-hidden flex flex-col',
          'cursor-none',
          state.showControls && !hideControls && 'cursor-auto',
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
          <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center gap-6 pointer-events-auto select-none">
            <RotateCw className="w-16 h-16 text-white animate-spin [animation-duration:2s]" />
            <p className="text-white text-lg font-semibold tracking-wide">
              Rotate to landscape
            </p>
            <p className="text-white/50 text-sm text-center px-8">
              This player is only available in landscape mode
            </p>
          </div>
        )}
      </section>
    </PlayerContext>
  );
}
