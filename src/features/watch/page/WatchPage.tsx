'use client';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ControlBar } from '../controls/ControlBar';
import { CenterPlayButton } from '../controls/PlayPause';
import {
  applySubtitleSettings,
  defaultSubtitleSettings,
  loadSubtitleSettings,
  type SubtitleSettings,
} from '../controls/SubtitleSelector';
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
  onSidebarToggle?: () => void;
  onNavigate?: (url: string) => void;
  hideBackButton?: boolean;
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
  onSidebarToggle,
  onNavigate,
  hideBackButton = false,
}: WatchPageProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);

  // Expose video ref to parent (for Watch Party)
  useEffect(() => {
    if (videoRef.current && onVideoRef) {
      onVideoRef(videoRef.current);
    }
  }, [onVideoRef]);

  // Subtitle settings state - load from localStorage
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>(
    defaultSubtitleSettings,
  );

  // Load and apply saved subtitle settings on mount
  useEffect(() => {
    const savedSettings = loadSubtitleSettings();
    setSubtitleSettings(savedSettings);
    applySubtitleSettings(savedSettings);
  }, []);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth < 768 ||
          'ontouchstart' in window ||
          navigator.maxTouchPoints > 0,
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize HLS
  const { setQuality, setAudioTrack } = useHls({
    videoRef,
    streamUrl,
    dispatch,
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

  // Handle resume progress
  const handleProgressLoaded = useCallback((seconds: number) => {
    if (seconds > 0 && videoRef.current) {
      videoRef.current.currentTime = seconds;
    }
  }, []);

  // Track watch progress
  // For watch party guests (isHost=false): track activity time but skip saving progress/history
  useWatchProgress({
    videoRef,
    metadata,
    isPlaying: state.isPlaying && !state.isPaused && !state.isBuffering,
    onProgressLoaded: isHost ? handleProgressLoaded : undefined,
    skipProgressHistory: !isHost, // Guests don't save progress
    enableProgressLoad: isHost, // Only host loads previous progress
  });

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

  // Next episode for series
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
  const { toggleFullscreen } = useFullscreen({
    containerRef,
    videoRef,
    dispatch,
  });

  // Auto-hide controls
  const showControls = useCallback(() => {
    dispatch({ type: 'SHOW_CONTROLS' });

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      if (state.isPlaying && !state.isPaused) {
        dispatch({ type: 'HIDE_CONTROLS' });
      }
    }, 3000);
  }, [state.isPlaying, state.isPaused]);

  // Show controls on pause
  useEffect(() => {
    if (state.isPaused) {
      dispatch({ type: 'SHOW_CONTROLS' });
    }
  }, [state.isPaused]);

  // Control handlers
  const handleSeek = useCallback(
    (time: number) => {
      if (readOnly) return; // Prevent seek when readOnly
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
      showControls();
    },
    [showControls, readOnly],
  );

  const handleSkip = useCallback(
    (seconds: number) => {
      if (readOnly) return; // Prevent skip when readOnly
      seek(seconds);
      showControls();
    },
    [seek, showControls, readOnly],
  );

  const handleVolumeChange = useCallback(
    (volume: number) => {
      if (videoRef.current) {
        videoRef.current.volume = volume;
        videoRef.current.muted = volume === 0;
      }
      dispatch({ type: 'SET_VOLUME', volume });
      showControls();
    },
    [showControls],
  );

  const handleMuteToggle = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
    toggleMute();
    showControls();
  }, [toggleMute, showControls]);

  const handleTogglePlay = useCallback(() => {
    if (readOnly) return; // Prevent toggle play when readOnly
    togglePlay();
    showControls();
  }, [togglePlay, showControls, readOnly]);

  const handleRetry = useCallback(() => {
    dispatch({ type: 'SET_ERROR', error: null });
    dispatch({ type: 'SET_LOADING', isLoading: true });
  }, []);

  const handleVideoClick = useCallback(() => {
    if (readOnly) return; // Prevent click toggle when readOnly
    handleTogglePlay();
  }, [handleTogglePlay, readOnly]);

  // Quality change handler
  const handleQualityChange = useCallback(
    (quality: string) => {
      if (quality === 'auto') {
        setQuality(-1); // Auto quality
      } else {
        // Find quality level index
        const levelIndex = state.qualities.findIndex(
          (q) => q.label === quality,
        );
        if (levelIndex !== -1) {
          setQuality(levelIndex);
        }
      }
      dispatch({ type: 'SET_CURRENT_QUALITY', quality });
      showControls();
    },
    [setQuality, state.qualities, showControls],
  );

  // Playback rate handler
  const handlePlaybackRateChange = useCallback(
    (rate: number) => {
      if (readOnly) return; // Prevent speed change when readOnly
      if (videoRef.current) {
        videoRef.current.playbackRate = rate;
      }
      dispatch({ type: 'SET_PLAYBACK_RATE', rate });
      showControls();
    },
    [showControls, readOnly],
  );

  // Audio track change handler
  const handleAudioChange = useCallback(
    (trackId: string) => {
      setAudioTrack(trackId);
      dispatch({ type: 'SET_CURRENT_AUDIO_TRACK', trackId });
      showControls();
    },
    [setAudioTrack, showControls],
  );

  // Subtitle track change handler
  const handleSubtitleChange = useCallback(
    (trackId: string | null) => {
      if (videoRef.current?.textTracks) {
        const textTracks = videoRef.current.textTracks;

        // TextTrackList is not an array, use for loop
        for (let i = 0; i < textTracks.length; i++) {
          const track = textTracks[i];

          if (trackId === null || trackId === 'off') {
            // Turn off all subtitles
            track.mode = 'disabled';
          } else {
            // Enable if matches - check various conditions
            const matches =
              track.language === trackId ||
              track.label?.toLowerCase().includes(trackId.toLowerCase()) ||
              trackId === 'en'; // Default English

            if (matches) {
              track.mode = 'showing';
            } else {
              track.mode = 'disabled';
            }
          }
        }
      }
      dispatch({ type: 'SET_CURRENT_SUBTITLE_TRACK', trackId });
      showControls();
    },
    [showControls],
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Extended metadata for pause overlay
  const pauseOverlayMetadata = {
    title: metadata.title,
    type: metadata.type,
    season: metadata.season,
    episode: metadata.episode,
    description: description || metadata.description,
    year: metadata.year,
    posterUrl: metadata.posterUrl,
  };

  return (
    <section
      ref={containerRef}
      className={cn(
        'video-container relative w-full h-full bg-black overflow-hidden select-none flex flex-col',
        'cursor-none',
        state.showControls && 'cursor-auto',
      )}
      style={{
        width: '100%',
        height: '100%', // Allow parent to control height
      }}
      onMouseMove={showControls}
      onMouseEnter={showControls}
      aria-label="Video Player"
    >
      {/* Mobile Header - Solid Top Bar, pushes video down */}
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
          {metadata.season && metadata.episode && (
            <p className="text-xs text-white/70 truncate">
              S{metadata.season}:E{metadata.episode}
            </p>
          )}
        </div>
        {mobileHeaderContent}
      </div>

      {/* Main Player Area - Takes remaining space */}
      <div className="flex-1 relative w-full overflow-hidden bg-black flex items-center justify-center">
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

        {/* Loading Overlay */}
        <LoadingOverlay isVisible={state.isLoading} />

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
        />
      </div>
    </section>
  );
}
