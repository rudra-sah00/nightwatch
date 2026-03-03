'use client';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PlayerContext } from '../../context/PlayerContext';
import type { VideoMetadata } from '../../context/types';
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
        style={CONTAINER_STYLE}
        onMouseMove={showControls}
        onMouseEnter={showControls}
        aria-label="Video Player"
      >
        {children}
      </section>
    </PlayerContext>
  );
}
