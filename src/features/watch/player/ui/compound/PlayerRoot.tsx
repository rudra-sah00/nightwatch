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
  /** Pre-selected track ID — highlights the currently-playing dub in the AudioSelector on load */
  initialAudioTrackId?: string;
  /** Callback fired when the user picks a dub; parent swaps streamUrl */
  onAudioTrackChange?: (trackId: string) => void;
  /** Override the back button destination (defaults to /home) */
  onBack?: () => void;
  /** Pass true for live streams — uses a low-latency HLS config that stays at the live edge */
  isLive?: boolean;
  /** Override the default 100dvh container sizing (e.g. for YouTube-style embedded layout) */
  containerStyle?: React.CSSProperties;
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
  providerId,
  playbackRate,
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
    initialAudioTrackId,
    onBack: onBackProp,
    isLive,
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
    !isFullscreenOverride &&
    !state.isFullscreen;

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
          <div className="absolute inset-0 z-50 bg-[#ffcc00] flex flex-col items-center justify-center gap-8 pointer-events-auto select-none p-6 text-center">
            <div className="bg-white border-[4px] border-[#1a1a1a] p-4 neo-shadow rounded-none">
              <RotateCw className="w-16 h-16 text-[#1a1a1a] animate-spin [animation-duration:2s] stroke-[3px]" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[#1a1a1a] text-2xl font-black font-headline uppercase tracking-widest">
                Rotate to landscape
              </p>
              <p className="text-[#1a1a1a] text-sm font-bold font-headline uppercase tracking-widest max-w-[250px] mx-auto">
                This player is only available in landscape mode
              </p>
            </div>
          </div>
        )}
      </section>
    </PlayerContext>
  );
}
