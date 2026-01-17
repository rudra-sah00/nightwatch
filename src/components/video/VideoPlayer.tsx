'use client';

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { VideoPlayerProps, SettingsTab, PlaybackSpeed } from '@/types/video';
import { getQualityLabel, getPositionFromEvent } from '@/lib/utils/video-utils';
import {
  useHlsPlayer,
  useSubtitles,
  useVideoControls,
  useFullscreen,
  useKeyboardControls,

} from '@/hooks';
import {
  ProgressBar,
  SubtitleOverlay,
  ControlButtons,
  SettingsMenu,
  PlayButtonOverlay,
  ErrorOverlay,
  LoadingOverlay,
} from './components';

export default function VideoPlayer({
  src,
  poster,
  title,
  subtitles,
  spriteSheets,
  episodeInfo,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Player state
  const [error, setError] = useState<string | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('main');
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);

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
    skip: hlsSkip,
    setVolume: setPlayerVolume,
    toggleMute,
    changeQuality,
    changeAudioTrack,
  } = useHlsPlayer({
    src,
    onError: setError,
  });



  // Standard controls
  const togglePlay = useCallback(() => {
    hlsTogglePlay();
  }, [hlsTogglePlay]);

  const seek = useCallback((time: number) => {
    hlsSeek(time);
  }, [hlsSeek]);

  const skip = useCallback((seconds: number) => {
    const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
    seek(newTime);
  }, [currentTime, duration, seek]);

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

  const { isFullscreen, toggleFullscreen } = useFullscreen({
    containerRef,
  });

  const closeMenus = useCallback(() => {
    setShowSettingsMenu(false);
    setSettingsTab('main');
  }, []);

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
    return track
      ? `${track.name}${track.lang !== 'unknown' ? ` (${track.lang})` : ''}`
      : 'Default';
  }, [audioTracks, currentAudioTrack]);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden shadow-2xl aspect-video group touch-manipulation"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        handleMouseLeave();
        setHoverTime(null);
      }}
      onTouchStart={handleMouseMove}
      tabIndex={0}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
        onClick={() => {
          // Close any open menus first, then toggle play
          if (showSettingsMenu) {
            closeMenus();
          } else {
            togglePlay();
          }
        }}
        playsInline
        webkit-playsinline="true"
      />



      {/* Subtitle Overlay */}
      <SubtitleOverlay text={currentSubtitleText} isFullscreen={isFullscreen} />

      {/* Loading Overlay */}
      <LoadingOverlay
        isLoading={isLoading}
        message={duration === 0 ? 'Preparing your video...' : 'Buffering...'}
      />

      {/* Center Play Button - hidden when loading */}
      {!isLoading && (
        <PlayButtonOverlay
          isPlaying={isPlaying}
          locked={false}
          onTogglePlay={togglePlay}
        />
      )}

      {/* Error Message */}
      <ErrorOverlay error={error} />

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
      >
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
    </div>
  );
}
