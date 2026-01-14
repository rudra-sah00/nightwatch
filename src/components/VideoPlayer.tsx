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
} from './video-player';

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
  const player = useHlsPlayer({
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
    currentTime: player.currentTime,
  });

  const { showControls, handleMouseMove, handleMouseLeave } = useVideoControls({
    isPlaying: player.isPlaying,
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
    togglePlay: player.togglePlay,
    skip: player.skip,
    setVolume: player.setVolume,
    volume: player.volume,
    toggleMute: player.toggleMute,
    toggleFullscreen,
    closeMenus,
  });

  // Handlers
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current) return;
      const pos = getPositionFromEvent(e, progressBarRef.current);
      player.seek(pos * player.duration);
    },
    [player]
  );

  const handleProgressHover = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current) return;
      const pos = getPositionFromEvent(e, progressBarRef.current);
      setHoverTime(pos * player.duration);
    },
    [player.duration]
  );

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      player.setVolume(parseFloat(e.target.value));
    },
    [player]
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
      player.changeQuality(level);
      setSettingsTab('main');
    },
    [player]
  );

  const handleAudioChange = useCallback(
    (trackId: number) => {
      player.changeAudioTrack(trackId);
      setSettingsTab('main');
    },
    [player]
  );

  // Computed values
  const currentQualityLabel = useMemo(() => {
    if (player.currentQuality === 'auto') return 'Auto';
    const level = player.qualityLevels.find((l) => l.id === player.currentQuality);
    return level ? getQualityLabel(level) : 'Auto';
  }, [player.currentQuality, player.qualityLevels]);

  const getCurrentAudioLabel = useCallback(() => {
    const track = player.audioTracks.find((t) => t.id === player.currentAudioTrack);
    return track
      ? `${track.name}${track.lang !== 'unknown' ? ` (${track.lang})` : ''}`
      : 'Default';
  }, [player.audioTracks, player.currentAudioTrack]);

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
        ref={player.videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
        onClick={player.togglePlay}
        playsInline
      />

      {/* Subtitle Overlay */}
      <SubtitleOverlay text={currentSubtitleText} isFullscreen={isFullscreen} />

      {/* Center Play Button */}
      <PlayButtonOverlay isPlaying={player.isPlaying} onTogglePlay={player.togglePlay} />

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
            currentTime={player.currentTime}
            duration={player.duration}
            buffered={player.buffered}
            hoverTime={hoverTime}
            progressBarRef={progressBarRef}
            onSeek={handleSeek}
            onHover={handleProgressHover}
            onLeave={() => setHoverTime(null)}
          />

          {/* Control Buttons */}
          <div className="flex items-center justify-between px-4 pb-4">
            <ControlButtons
              isPlaying={player.isPlaying}
              volume={player.volume}
              isMuted={player.isMuted}
              currentTime={player.currentTime}
              duration={player.duration}
              showVolumeSlider={showVolumeSlider}
              onTogglePlay={player.togglePlay}
              onSkip={player.skip}
              onToggleMute={player.toggleMute}
              onVolumeChange={handleVolumeChange}
              onVolumeSliderEnter={() => setShowVolumeSlider(true)}
              onVolumeSliderLeave={() => setShowVolumeSlider(false)}
            />

            <SettingsMenu
              isOpen={showSettingsMenu}
              tab={settingsTab}
              isFullscreen={isFullscreen}
              qualityLevels={player.qualityLevels}
              currentQuality={player.currentQuality}
              currentQualityLabel={currentQualityLabel}
              audioTracks={player.audioTracks}
              currentAudioTrack={player.currentAudioTrack}
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
