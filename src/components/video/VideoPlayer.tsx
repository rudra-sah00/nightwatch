'use client';

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useDoubleTap,
  useFullscreen,
  useHlsPlayer,
  useKeyboardControls,
  useSkipIndicator,
  useSubtitles,
  useVideoControls,
  useWatchProgress,
} from '@/hooks';
import { useWatchActivity } from '@/hooks/useWatchActivity';
import { SKIP_SECONDS } from '@/lib/constants';
import { getPositionFromEvent, getQualityLabel } from '@/lib/utils/video-utils';
import type { PlaybackSpeed, SettingsTab, VideoPlayerProps } from '@/types/video';
import {
  ControlButtons,
  ErrorOverlay,
  LoadingOverlay,
  PlayButtonOverlay,
  ProgressBar,
  SettingsMenu,
  SkipIndicator,
  SubtitleOverlay,
} from './components';

export default function VideoPlayer({
  src,
  poster,
  title,
  subtitles,
  spriteSheets,
  episodeInfo,
  trackingInfo,
  initialTime,
  onBack,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hasSetInitialTime = useRef(false);

  // Player state
  const [error, setError] = useState<string | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('main');
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [resumeToast, setResumeToast] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);

  // Skip indicator hook
  const { skipIndicator, showSkipIndicator } = useSkipIndicator();

  // Custom hooks
  const {
    videoRef,
    isPlaying,
    currentTime,
    duration,
    buffered,
    volume,
    isMuted: playerIsMuted,
    qualityLevels,
    currentQuality,
    actualQualityLevel,
    isAutoQuality,
    audioTracks,
    currentAudioTrack,
    isBuffering,
    togglePlay: hlsTogglePlay,
    seek: hlsSeek,

    setVolume: setPlayerVolume,
    toggleMute,
    changeQuality,
    changeAudioTrack,
  } = useHlsPlayer({
    src,
    onError: setError,
  });

  // Track watch activity (daily stats for profile)
  useWatchActivity({ isPlaying });

  // Track watch progress (continue watching feature)
  useWatchProgress({
    contentId: trackingInfo?.contentId || '',
    contentType: trackingInfo?.contentType || 'Movie',
    title: trackingInfo?.title || title || '',
    posterUrl: trackingInfo?.posterUrl,
    episodeId: trackingInfo?.episodeId,
    seasonNumber: trackingInfo?.seasonNumber,
    episodeNumber: trackingInfo?.episodeNumber,
    episodeTitle: trackingInfo?.episodeTitle,
    currentTime,
    duration,
    isPlaying,
    enabled: !!trackingInfo?.contentId,
  });

  // Seek to initial time when video is ready (resume functionality)
  useEffect(() => {
    if (initialTime && duration > 0 && !hasSetInitialTime.current) {
      hlsSeek(initialTime);
      hasSetInitialTime.current = true;

      // Show resume toast notification
      const mins = Math.floor(initialTime / 60);
      const secs = Math.floor(initialTime % 60);
      const timeStr = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
      setResumeToast(`Resuming from ${timeStr}`);

      // Hide toast after 3 seconds
      setTimeout(() => setResumeToast(null), 3000);
    }
  }, [initialTime, duration, hlsSeek]);

  // Close menus helper (defined early for use in handlers)
  const closeMenus = useCallback(() => {
    setShowSettingsMenu(false);
    setSettingsTab('main');
  }, []);

  // Standard controls
  const togglePlay = useCallback(() => {
    hlsTogglePlay();
  }, [hlsTogglePlay]);

  const seek = useCallback(
    (time: number) => {
      hlsSeek(time);
    },
    [hlsSeek]
  );

  const skip = useCallback(
    (seconds: number) => {
      const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
      seek(newTime);

      // Show skip indicator using hook
      const direction = seconds > 0 ? 'forward' : 'backward';
      showSkipIndicator(direction);
    },
    [currentTime, duration, seek, showSkipIndicator]
  );

  // Double-tap detection using hook
  const { handleTap } = useDoubleTap({
    onSingleTap: () => {
      // Single tap - toggle play/pause (if menu not open)
      if (!showSettingsMenu) {
        togglePlay();
      } else {
        closeMenus();
      }
    },
    onDoubleTapLeft: () => skip(-SKIP_SECONDS),
    onDoubleTapRight: () => skip(SKIP_SECONDS),
    onDoubleTapCenter: () => togglePlay(),
  });

  // Handle video click/tap
  const handleVideoInteraction = useCallback(
    (e: React.MouseEvent<HTMLVideoElement> | React.TouchEvent<HTMLVideoElement>) => {
      // Close menus first if open
      if (showSettingsMenu) {
        closeMenus();
        return;
      }
      handleTap(e);
    },
    [showSettingsMenu, closeMenus, handleTap]
  );

  // Show loading when buffering or when video hasn't started yet
  const isLoading = isBuffering || (duration === 0 && !error);

  const {
    localSubtitles,
    currentSubtitleIndex,
    currentSubtitleText,
    setCurrentSubtitle,
    getSubtitleLabel,
  } = useSubtitles({
    subtitles,
    currentTime,
  });

  const { showControls, handleMouseMove, handleMouseLeave } = useVideoControls({
    isPlaying,
    showSettingsMenu,
  });

  const { isFullscreen, toggleFullscreen, isMobile } = useFullscreen({
    containerRef,
    videoRef,
  });

  useKeyboardControls({
    containerRef,
    togglePlay,
    skip,
    setVolume: setPlayerVolume,
    volume,
    toggleMute,
    toggleFullscreen,
    closeMenus,
  });

  // Handlers
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current) return;
      const pos = getPositionFromEvent(e, progressBarRef.current);
      seek(pos * duration);
    },
    [seek, duration]
  );

  const handleProgressHover = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current) return;
      const pos = getPositionFromEvent(e, progressBarRef.current);
      setHoverTime(pos * duration);
    },
    [duration]
  );

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPlayerVolume(parseFloat(e.target.value));
    },
    [setPlayerVolume]
  );

  const handleToggleSettings = useCallback(() => {
    setShowSettingsMenu((prev) => !prev);
    setSettingsTab('main');
  }, []);

  const handleSubtitleChange = useCallback(
    (index: number) => {
      setCurrentSubtitle(index);
      setSettingsTab('main');
    },
    [setCurrentSubtitle]
  );

  const handleQualityChange = useCallback(
    (level: number | 'auto') => {
      changeQuality(level);
      setSettingsTab('main');
    },
    [changeQuality]
  );

  const handleAudioChange = useCallback(
    (trackId: number) => {
      changeAudioTrack(trackId);
      setSettingsTab('main');
    },
    [changeAudioTrack]
  );

  const handlePlaybackSpeedChange = useCallback(
    (speed: PlaybackSpeed) => {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = speed;
        setPlaybackSpeed(speed);
      }
      setSettingsTab('main');
    },
    [videoRef]
  );

  // Computed values
  const currentQualityLabel = useMemo(() => {
    if (currentQuality === 'auto') return 'Auto';
    const level = qualityLevels.find((l) => l.id === currentQuality);
    return level ? getQualityLabel(level) : 'Auto';
  }, [currentQuality, qualityLevels]);

  const getCurrentAudioLabel = useCallback(() => {
    const track = audioTracks.find((t) => t.id === currentAudioTrack);
    return track ? `${track.name}${track.lang !== 'unknown' ? ` (${track.lang})` : ''}` : 'Default';
  }, [audioTracks, currentAudioTrack]);

  return (
    <section
      ref={containerRef}
      aria-label="Video Player"
      className="relative w-full bg-black rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden shadow-2xl aspect-video group touch-manipulation"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        handleMouseLeave();
        setHoverTime(null);
      }}
      onTouchStart={handleMouseMove}
    >
      {/* Video Element - Click/Tap to play/pause, Double-tap sides to seek */}
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain cursor-pointer"
        crossOrigin="anonymous"
        onClick={handleVideoInteraction}
        onTouchEnd={handleVideoInteraction}
        playsInline
        webkit-playsinline="true"
      >
        <track kind="captions" />
      </video>

      {/* Subtitle Overlay */}
      <SubtitleOverlay text={currentSubtitleText} isFullscreen={isFullscreen} />

      {/* Skip Indicator */}
      {skipIndicator && (
        <SkipIndicator
          direction={skipIndicator.direction}
          isActive={skipIndicator.isActive}
          skipSeconds={SKIP_SECONDS}
        />
      )}

      {/* Resume Toast Notification */}
      {resumeToast && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="px-4 py-2 bg-black/80 backdrop-blur-md rounded-full border border-white/20 shadow-lg">
            <span className="text-white text-sm font-medium">{resumeToast}</span>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      <LoadingOverlay
        isLoading={isLoading}
        message={duration === 0 ? 'Preparing your video...' : 'Buffering...'}
      />

      {/* Center Play Button - hidden when loading */}
      {!isLoading && (
        <PlayButtonOverlay isPlaying={isPlaying} locked={false} onTogglePlay={togglePlay} />
      )}

      {/* Error Message */}
      <ErrorOverlay error={error} />

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Back Button - Top Left */}
        {onBack && (
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-6 md:left-6 z-10">
            <button
              type="button"
              onClick={onBack}
              className="group flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 hover:bg-black/80 hover:border-white/30 transition-all duration-200 shadow-lg"
              aria-label="Go back to home"
            >
              <svg
                aria-hidden="true"
                className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 group-hover:text-white transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span className="text-white/90 group-hover:text-white text-xs sm:text-sm font-medium transition-colors hidden sm:inline">
                Home
              </span>
            </button>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 sm:pt-20 md:pt-24">
          {/* Progress Bar */}
          <ProgressBar
            currentTime={currentTime}
            duration={duration}
            buffered={buffered}
            hoverTime={hoverTime}
            progressBarRef={progressBarRef}
            spriteSheets={spriteSheets}
            locked={false}
            onSeek={handleSeek}
            onHover={handleProgressHover}
            onLeave={() => setHoverTime(null)}
          />

          {/* Control Buttons Row - Netflix style layout */}
          <div className="flex items-center justify-between px-2 sm:px-3 md:px-4 lg:px-6 pb-2 sm:pb-3 md:pb-4 lg:pb-5">
            {/* Left: Play controls + Volume + Time */}
            <ControlButtons
              isPlaying={isPlaying}
              volume={volume}
              isMuted={playerIsMuted}
              currentTime={currentTime}
              duration={duration}
              showVolumeSlider={showVolumeSlider}
              title={title}
              episodeInfo={episodeInfo}
              locked={false}
              isMobile={isMobile}
              onTogglePlay={togglePlay}
              onSkip={skip}
              onToggleMute={toggleMute}
              onVolumeChange={handleVolumeChange}
              onVolumeSliderEnter={() => setShowVolumeSlider(true)}
              onVolumeSliderLeave={() => setShowVolumeSlider(false)}
            />

            {/* Right: Episodes, Subtitles, Settings, Fullscreen */}
            <SettingsMenu
              isOpen={showSettingsMenu}
              tab={settingsTab}
              isFullscreen={isFullscreen}
              qualityLevels={qualityLevels}
              currentQuality={currentQuality}
              currentQualityLabel={currentQualityLabel}
              audioTracks={audioTracks}
              currentAudioTrack={currentAudioTrack}
              localSubtitles={localSubtitles}
              currentSubtitleIndex={currentSubtitleIndex}
              isAutoQuality={isAutoQuality}
              actualQualityLevel={actualQualityLevel}
              playbackSpeed={playbackSpeed}
              hideSpeedControl={false}
              isMobile={isMobile}
              onToggleMenu={handleToggleSettings}
              onCloseMenu={closeMenus}
              onTabChange={setSettingsTab}
              onQualityChange={handleQualityChange}
              onAudioChange={handleAudioChange}
              onSubtitleChange={handleSubtitleChange}
              onToggleFullscreen={toggleFullscreen}
              onPlaybackSpeedChange={handlePlaybackSpeedChange}
              getSubtitleLabel={getSubtitleLabel}
              getCurrentAudioLabel={getCurrentAudioLabel}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
