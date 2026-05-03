'use client';
import { RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { PlayerContext } from '../../context/PlayerContext';
import type { VideoMetadata } from '../../context/types';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';
import { usePlayerRoot } from './hooks/use-player-root';

/**
 * Props for the {@link PlayerRoot} component.
 *
 * Configures the video player's stream source, metadata, interaction mode,
 * subtitle/quality options, and various legacy-compatibility flags.
 */
interface PlayerRootProps {
  /** Child elements rendered inside the player container (controls, overlays, video element). */
  children: ReactNode;
  /** HLS or MP4 stream URL. `null` while the URL is still resolving. */
  streamUrl: string | null;
  /** Video metadata used for the pause overlay, progress history, and analytics. */
  metadata: VideoMetadata;
  /** When `true`, skips writing playback progress to the backend history API. */
  skipProgressHistory?: boolean;
  /** URL to a single WebVTT caption file (legacy single-track path). */
  captionUrl?: string | null;
  /** Multiple selectable subtitle tracks displayed in the settings menu. */
  subtitleTracks?: {
    id: string;
    label: string;
    language: string;
    src: string;
  }[];
  /** Available quality levels for manual quality selection. */
  qualities?: { quality: string; url: string }[];
  /** WebVTT file describing sprite thumbnail positions for the seekbar preview. */
  spriteVtt?: string;
  /** Sprite sheet metadata for seekbar thumbnail previews. */
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
  /** Navigation callback used by internal links (e.g. "back" button). */
  onNavigate?: (url: string) => void;
  /** Override the default fullscreen toggle (used by watch-party host controls). */
  fullscreenToggleOverride?: () => void;
  /** External fullscreen state override (e.g. when the parent manages fullscreen). */
  isFullscreenOverride?: boolean;
  /** Callback fired when the stream token expires and needs re-fetching. */
  onStreamExpired?: () => void;
  /** Additional CSS classes merged onto the root container `div`. */
  className?: string;
  /** Legacy compatibility: replaced by controlsVisibility. */
  hideControls?: boolean;
  /** Exposes the underlying `<video>` element ref to the parent. */
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
  providerId?: 's1' | 's2';
  /** Initial playback speed multiplier (e.g. `1.5` for 1.5×). */
  playbackRate?: number;
}

/** Default container dimensions — fills the viewport minus the Electron title bar. */
const CONTAINER_STYLE = {
  width: '100%',
  height: 'calc(100dvh - var(--electron-titlebar-height, 0px))',
} as const;

/**
 * Root container for the video player.
 *
 * Responsibilities:
 * - Provides {@link PlayerContext} to all descendant player components.
 * - Manages YouTube-style **mobile fullscreen** by switching to a fixed-position
 *   viewport overlay (no native Fullscreen API on iOS Safari).
 * - Renders a **rotate wall** on iOS portrait when playback is active, prompting
 *   the user to physically rotate the device to landscape.
 * - Implements **tap-to-toggle controls** on mobile — tapping the container
 *   shows/hides the control bar (ignores taps on interactive children).
 * - Registers **keyboard shortcuts** on the container (`Space`/`K` play/pause,
 *   `J`/`L`/arrows seek, arrows volume, `M` mute, `F` fullscreen).
 *
 * @param props - See {@link PlayerRootProps}.
 */
export function PlayerRoot({
  children,
  streamUrl,
  metadata,
  skipProgressHistory,
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
  const t = useTranslations('watch.player');
  const tAria = useTranslations('watch.aria');
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
    skipProgressHistory,
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

  // YouTube-style mobile fullscreen: override container to fill viewport
  const mobileFullscreen = isMobile && state.isFullscreen;
  const effectiveContainerStyle = mobileFullscreen
    ? ({
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100dvh',
        zIndex: 9999,
      } as React.CSSProperties)
    : (containerStyle ?? CONTAINER_STYLE);
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

  // Mobile: tap to toggle controls (show/hide). Ignore taps on interactive
  // children (buttons, inputs) so controls buttons still work normally.
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isMobile) return;
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'button:not([data-tap-zone]), a, input, [data-seekbar], [role="slider"]',
        )
      )
        return;
      if (state.showControls) {
        contextValue.dispatch({ type: 'HIDE_CONTROLS' });
        if (controlsTimeoutRef.current)
          clearTimeout(controlsTimeoutRef.current);
      } else {
        showControls();
      }
    },
    [isMobile, state.showControls, contextValue, showControls],
  );

  return (
    <PlayerContext value={contextValue}>
      <div
        ref={containerRef}
        role="application"
        className={cn(
          'video-container relative w-full bg-black overflow-hidden flex flex-col',
          'cursor-none',
          state.showControls && !resolvedHideControls && 'cursor-auto',
          className,
        )}
        style={effectiveContainerStyle}
        onMouseMove={showControls}
        onMouseEnter={showControls}
        onClick={handleContainerClick}
        aria-label={tAria('videoPlayer')}
        tabIndex={0}
        onKeyDown={(e) => {
          // Don't capture keys when typing in an input
          if (
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement
          )
            return;

          const { togglePlay, seek, setVolume, toggleMute, toggleFullscreen } =
            contextValue.playerHandlers;
          const vol = state.volume;

          switch (e.key) {
            case ' ':
            case 'k':
            case 'K':
              e.preventDefault();
              togglePlay();
              break;
            case 'ArrowLeft':
            case 'j':
            case 'J':
              e.preventDefault();
              seek(state.currentTime - 10);
              break;
            case 'ArrowRight':
            case 'l':
            case 'L':
              e.preventDefault();
              seek(state.currentTime + 10);
              break;
            case 'ArrowUp':
              e.preventDefault();
              setVolume(Math.min(1, vol + 0.1));
              break;
            case 'ArrowDown':
              e.preventDefault();
              setVolume(Math.max(0, vol - 0.1));
              break;
            case 'm':
            case 'M':
              e.preventDefault();
              toggleMute();
              break;
            case 'f':
            case 'F':
              e.preventDefault();
              toggleFullscreen();
              break;
          }
          showControls();
        }}
      >
        {children}

        {/* iOS portrait wall: blocks playback UI until user physically rotates device */}
        {showRotateWall && (
          <div className="absolute inset-0 z-50 bg-neo-yellow flex flex-col items-center justify-center gap-8 pointer-events-auto select-none p-6 text-center">
            <div className="bg-background border-[4px] border-border p-4  rounded-none">
              <RotateCw className="w-16 h-16 text-foreground animate-spin [animation-duration:2s] stroke-[3px]" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-foreground text-2xl font-black font-headline uppercase tracking-widest">
                {t('rotateToLandscape')}
              </p>
              <p className="text-foreground text-sm font-bold font-headline uppercase tracking-widest max-w-[250px] mx-auto">
                {t('landscapeOnlyMessage')}
              </p>
            </div>
          </div>
        )}
      </div>
    </PlayerContext>
  );
}
