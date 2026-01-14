'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { VideoPlayerProps, SettingsTab } from '@/types/video';
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
  TitleOverlay,
} from './components';

export default function VideoPlayer({ src, poster, title, subtitles }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Player state
  const [error, setError] = useState<string | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('main');
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

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
    audioTracks,
    currentAudioTrack,
    togglePlay,
    seek,
    skip,
    setVolume: setPlayerVolume,
    toggleMute,
    changeQuality,
    changeAudioTrack,
  } = useHlsPlayer({
    src,
    onError: setError,
  });

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
      className="relative w-full bg-black rounded-2xl overflow-hidden shadow-2xl aspect-video group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        handleMouseLeave();
        setHoverTime(null);
      }}
      tabIndex={0}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
        onClick={togglePlay}
        playsInline
      />

      {/* Subtitle Overlay */}
      <SubtitleOverlay text={currentSubtitleText} isFullscreen={isFullscreen} />

      {/* Center Play Button */}
      <PlayButtonOverlay isPlaying={isPlaying} onTogglePlay={togglePlay} />

      {/* Error Message */}
      <ErrorOverlay error={error} />

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Title */}
        <TitleOverlay title={title} showControls={showControls} />

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-20">
          {/* Progress Bar */}
          <ProgressBar
            currentTime={currentTime}
            duration={duration}
            buffered={buffered}
            hoverTime={hoverTime}
            progressBarRef={progressBarRef}
            onSeek={handleSeek}
            onHover={handleProgressHover}
            onLeave={() => setHoverTime(null)}
          />

          {/* Control Buttons */}
          <div className="flex items-center justify-between px-4 pb-4">
            <ControlButtons
              isPlaying={isPlaying}
              volume={volume}
              isMuted={playerIsMuted}
              currentTime={currentTime}
              duration={duration}
              showVolumeSlider={showVolumeSlider}
              onTogglePlay={togglePlay}
              onSkip={skip}
              onToggleMute={toggleMute}
              onVolumeChange={handleVolumeChange}
              onVolumeSliderEnter={() => setShowVolumeSlider(true)}
              onVolumeSliderLeave={() => setShowVolumeSlider(false)}
            />

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
              onToggleMenu={handleToggleSettings}
              onTabChange={setSettingsTab}
              onQualityChange={handleQualityChange}
              onAudioChange={handleAudioChange}
              onSubtitleChange={handleSubtitleChange}
              onToggleFullscreen={toggleFullscreen}
              getSubtitleLabel={getSubtitleLabel}
              getCurrentAudioLabel={getCurrentAudioLabel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
