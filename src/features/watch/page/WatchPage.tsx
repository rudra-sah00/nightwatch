'use client';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import { ControlBar } from '../controls/ControlBar';
import { CenterPlayButton } from '../controls/PlayPause';
import {
  applySubtitleSettings,
  loadSubtitleSettings,
  type SubtitleSettings,
} from '../controls/subtitle-settings';
import { BufferingOverlay } from '../overlays/BufferingOverlay';
import { ErrorOverlay } from '../overlays/ErrorOverlay';
import { LoadingOverlay } from '../overlays/LoadingOverlay';
import { NextEpisodeOverlay } from '../overlays/NextEpisodeOverlay';
import {
  initialPlayerState,
  playerReducer,
  type SubtitleTrack,
  type VideoMetadata,
} from '../player/types';
import { useFullscreen } from '../player/useFullscreen';
import { useHls } from '../player/useHls';
import { useKeyboard } from '../player/useKeyboard';
import { useNextEpisode } from '../player/useNextEpisode';
import { useWatchProgress } from '../player/useWatchProgress';
// Player components
import { VideoElement } from '../player/VideoElement';
// Extracted hooks for better code organization
import { useMobileDetection } from './useMobileDetection';
import { usePlayerHandlers } from './usePlayerHandlers';

// Hoisted to module level to prevent recreation on each render (rule 5.4)
const CONTAINER_STYLE = { width: '100%', height: '100dvh' } as const;

interface WatchPageProps {
  streamUrl: string | null;
  metadata: VideoMetadata;
  captionUrl?: string | null;
  subtitleTracks?: {
    id: string;
    label: string;
    language: string;
    src: string;
  }[];
  spriteVtt?: string;
  description?: string;
  onVideoRef?: (ref: HTMLVideoElement) => void;
  mobileHeaderContent?: React.ReactNode;
  readOnly?: boolean; // For watch party guests (controls disabled)
  isHost?: boolean; // For watch party - controls watch history tracking
  isAuthenticated?: boolean; // Whether user is authenticated (vs unauthenticated guest)
  onSidebarToggle?: () => void;
  onNavigate?: (url: string) => void;
  hideBackButton?: boolean;
  /** Override default fullscreen toggle (e.g. for watch party theater mode) */
  fullscreenToggleOverride?: () => void;
  /** Override fullscreen state (for theater mode) */
  isFullscreenOverride?: boolean;
  /** Called when HLS gets a 401 (stream token expired). Parent can refetch a fresh stream URL. */
  onStreamExpired?: () => void;
}

export function WatchPage({
  streamUrl,
  metadata,
  captionUrl,
  subtitleTracks,
  spriteVtt,
  description,
  onVideoRef,
  mobileHeaderContent,
  readOnly = false,
  isHost = true, // Default true for normal playback
  isAuthenticated = true, // Default true for normal playback
  onSidebarToggle,
  onNavigate,
  hideBackButton = false,
  fullscreenToggleOverride,
  isFullscreenOverride,
  onStreamExpired,
}: WatchPageProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);

  // Expose video ref to parent (for Watch Party)
  useEffect(() => {
    if (videoRef.current && onVideoRef) {
      onVideoRef(videoRef.current);
    }
  }, [onVideoRef]);

  // Subtitle settings state - lazy initialization from localStorage (rule 5.1)
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>(
    () => {
      const saved = loadSubtitleSettings();
      // Apply settings on initial load (client-side only)
      if (typeof window !== 'undefined') {
        applySubtitleSettings(saved);
      }
      return saved;
    },
  );

  // Mobile detection - extracted to custom hook
  const isMobile = useMobileDetection();

  // Initialize HLS
  const { setQuality, setAudioTrack } = useHls({
    videoRef,
    streamUrl,
    dispatch,
    onStreamExpired,
  });

  // Load subtitle tracks
  useEffect(() => {
    if (subtitleTracks && subtitleTracks.length > 0) {
      const tracks: SubtitleTrack[] = subtitleTracks.map((t, index) => ({
        id: t.id || `${t.language}-${index}`,
        label: t.label,
        language: t.language,
        src: t.src,
      }));
      dispatch({ type: 'SET_SUBTITLE_TRACKS', subtitleTracks: tracks });
    } else if (captionUrl) {
      // Fallback to single caption
      const subtitleTrack: SubtitleTrack = {
        id: 'en',
        label: 'English',
        language: 'en',
        src: captionUrl,
      };
      dispatch({
        type: 'SET_SUBTITLE_TRACKS',
        subtitleTracks: [subtitleTrack],
      });
    }
  }, [captionUrl, subtitleTracks]);

  // Handle navigating to next episode
  const handleNavigate = useCallback(
    (url: string) => {
      if (onNavigate) {
        onNavigate(url);
      } else {
        router.push(url);
      }
    },
    [router, onNavigate],
  );

  // Next episode for series - must be before useWatchProgress to determine hasMoreEpisodes
  const {
    showNextEpisode,
    nextEpisodeInfo,
    isLoadingNext,
    playNextEpisode,
    cancelNextEpisode,
  } = useNextEpisode({
    metadata,
    currentTime: state.currentTime,
    duration: state.duration,
    isPlaying: state.isPlaying && !state.isPaused,
    onNavigate: handleNavigate,
  });

  // Handle resume progress
  const handleProgressLoaded = useCallback((seconds: number) => {
    if (seconds > 0 && videoRef.current) {
      videoRef.current.currentTime = seconds;
    }
  }, []);

  // Track watch progress
  // For watch party:
  // - Host: tracks activity + saves progress/history
  // - Authenticated members: track activity but skip progress/history
  // - Unauthenticated guests: skip both activity and progress
  useWatchProgress({
    videoRef,
    metadata,
    isPlaying: state.isPlaying && !state.isPaused && !state.isBuffering,
    onProgressLoaded: isHost ? handleProgressLoaded : undefined,
    skipProgressHistory: !isHost, // Non-host members/guests don't save progress
    enableProgressLoad: isHost, // Only host loads previous progress
    skipActivityTracking: !isAuthenticated, // Only unauthenticated guests skip activity
    // For series: nextEpisodeInfo being non-null means there are more episodes
    hasMoreEpisodes:
      metadata.type === 'series' ? nextEpisodeInfo !== null : undefined,
  });

  // Handle going back - always go to home (not browser history)
  const handleBack = useCallback(() => {
    router.push('/home');
  }, [router]);

  // Toggle captions on/off
  const toggleCaptions = useCallback(() => {
    if (state.currentSubtitleTrack) {
      // Turn off captions
      dispatch({ type: 'SET_CURRENT_SUBTITLE_TRACK', trackId: null });
    } else if (state.subtitleTracks.length > 0) {
      // Turn on first available caption track
      dispatch({
        type: 'SET_CURRENT_SUBTITLE_TRACK',
        trackId: state.subtitleTracks[0].id,
      });
    }
  }, [state.currentSubtitleTrack, state.subtitleTracks]);

  // Keyboard controls
  const { togglePlay, toggleMute, seek } = useKeyboard({
    videoRef,
    containerRef,
    dispatch,
    isFullscreen: state.isFullscreen,
    onBack: handleBack,
    currentSubtitleTrack: state.currentSubtitleTrack,
    onToggleCaptions: toggleCaptions,
    hasNextEpisode: !!nextEpisodeInfo,
    onNextEpisode: playNextEpisode,
    disabled: readOnly, // Disable keyboard shortcuts if readOnly
  });

  // Fullscreen (with mobile native video support)
  const { toggleFullscreen: nativeToggleFullscreen } = useFullscreen({
    containerRef,
    videoRef,
    dispatch,
  });

  // Use override if provided (watch party theater mode), otherwise native
  const toggleFullscreen = fullscreenToggleOverride || nativeToggleFullscreen;

  // Sync fullscreen override state into player state
  useEffect(() => {
    if (isFullscreenOverride !== undefined) {
      dispatch({ type: 'SET_FULLSCREEN', isFullscreen: isFullscreenOverride });
    }
  }, [isFullscreenOverride]);

  // Player handlers - extracted to custom hook for better organization
  const {
    showControls,
    handleSeek,
    handleSkip,
    handleVolumeChange,
    handleMuteToggle,
    handleTogglePlay,
    handleVideoClick,
    handleQualityChange,
    handlePlaybackRateChange,
    handleAudioChange,
    handleSubtitleChange,
    handleRetry,
    handleInteraction,
  } = usePlayerHandlers({
    videoRef,
    dispatch,
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    readOnly,
    isLoading: state.isLoading,
    togglePlay,
    toggleMute,
    seek,
    setQuality,
    setAudioTrack,
    qualities: state.qualities,
  });

  // Extended metadata for pause overlay
  const pauseOverlayMetadata = useMemo(
    () => ({
      title: metadata.title,
      type: metadata.type,
      season: metadata.season,
      episode: metadata.episode,
      description: description || metadata.description,
      year: metadata.year,
      posterUrl: metadata.posterUrl,
    }),
    [metadata, description],
  );

  return (
    <section
      ref={containerRef}
      className={cn(
        'video-container relative w-full h-[100dvh] bg-black overflow-hidden select-none flex flex-col',
        'cursor-none',
        state.showControls && 'cursor-auto',
      )}
      style={CONTAINER_STYLE}
      onMouseMove={showControls}
      onMouseEnter={showControls}
      aria-label="Video Player"
    >
      {/* Mobile Header - Solid Top Bar */}
      <div className="relative z-50 p-4 flex md:hidden items-center gap-4 bg-black pointer-events-auto border-b border-white/5">
        {!hideBackButton && (
          <button
            type="button"
            onClick={handleBack}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-white truncate">
            {metadata.title}
          </h1>
          {metadata.season != null && metadata.episode != null && (
            <p className="text-xs text-white/70 truncate">
              S{metadata.season}:E{metadata.episode}
            </p>
          )}
        </div>
        {mobileHeaderContent}
      </div>

      {/* Main Player Area - Takes remaining space */}
      <div className="flex-1 relative w-full overflow-hidden bg-black flex items-center justify-center">
        {/* Aesthetic Loading Layer - Absolutely centered in player area */}
        {state.isLoading && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center overflow-hidden pointer-events-none transition-opacity duration-1000">
            {/* Poster Background with Drop Filter (Blur) */}
            {metadata.posterUrl && (
              <div className="absolute inset-0 z-0">
                <div
                  className="absolute inset-0 bg-cover bg-center blur-3xl scale-110 opacity-40"
                  style={{ backgroundImage: `url(${metadata.posterUrl})` }}
                />
                {/* Drop filter effect */}
                <div className="absolute inset-0 backdrop-blur-[40px] bg-black/40" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60" />
              </div>
            )}

            <LoadingOverlay isVisible={true} />
          </div>
        )}
        {/* Video Element */}
        <VideoElement
          ref={videoRef}
          dispatch={dispatch}
          onClick={handleVideoClick}
          captionUrl={captionUrl}
          subtitleTracks={state.subtitleTracks} // Use state tracks which have IDs matching selection
          currentTrackId={state.currentSubtitleTrack}
          controls={isMobile}
        />

        {/* Buffering Overlay */}
        <BufferingOverlay isVisible={state.isBuffering && !state.isLoading} />

        {/* Error Overlay */}
        <ErrorOverlay
          isVisible={!!state.error}
          message={state.error || 'An error occurred'}
          onRetry={handleRetry}
          onBack={handleBack}
        />

        {/* Next Episode Overlay - Netflix style */}
        {nextEpisodeInfo && (
          <NextEpisodeOverlay
            key={showNextEpisode ? nextEpisodeInfo.episodeNumber : 'hidden'}
            isVisible={showNextEpisode}
            nextEpisode={nextEpisodeInfo}
            onPlayNext={playNextEpisode}
            onCancel={cancelNextEpisode}
            isLoading={isLoadingNext}
          />
        )}

        {/* Center Play Button - Netflix style pause overlay with movie info */}
        <CenterPlayButton
          isPlaying={state.isPlaying}
          onToggle={handleTogglePlay}
          metadata={pauseOverlayMetadata}
          disabled={readOnly}
          isLoading={state.isLoading}
        />

        {/* Control Bar */}
        <ControlBar
          state={state}
          metadata={metadata}
          spriteVtt={spriteVtt}
          onTogglePlay={handleTogglePlay}
          onSeek={handleSeek}
          onSkip={handleSkip}
          onVolumeChange={handleVolumeChange}
          onMuteToggle={handleMuteToggle}
          onFullscreenToggle={toggleFullscreen}
          onBack={handleBack}
          onQualityChange={handleQualityChange}
          onPlaybackRateChange={handlePlaybackRateChange}
          onAudioChange={handleAudioChange}
          onSubtitleChange={handleSubtitleChange}
          subtitleSettings={subtitleSettings}
          onSubtitleSettingsChange={setSubtitleSettings}
          isMobile={isMobile}
          readOnly={readOnly}
          onSidebarToggle={onSidebarToggle}
          hideBackButton={hideBackButton}
          onInteraction={handleInteraction}
        />
      </div>
    </section>
  );
}
