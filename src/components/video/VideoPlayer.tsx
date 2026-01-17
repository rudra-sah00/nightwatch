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
  useVideoSync,
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
  syncMode,
  externalMuted,
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

  // Video sync for watch party
  const {
    hostPlay,
    hostPause,
    hostSeek,
    controlsLocked,
  } = useVideoSync({
    videoRef,
    enabled: syncMode?.enabled ?? false,
    isHost: syncMode?.isHost ?? false,
    roomCode: syncMode?.roomCode ?? '',
  });

  // Determine if user can control playback
  const canControlPlayback = !syncMode?.enabled || syncMode?.isHost;

  // Wrapped controls that respect sync mode
  const togglePlay = useCallback(() => {
    if (!canControlPlayback) return;
    
    if (syncMode?.enabled && syncMode?.isHost) {
      // Host controls through sync
      if (isPlaying) {
        hostPause();
      } else {
        hostPlay();
      }
    } else {
      // Normal playback
      hlsTogglePlay();
    }
  }, [canControlPlayback, syncMode, isPlaying, hostPause, hostPlay, hlsTogglePlay]);

  const seek = useCallback((time: number) => {
    if (!canControlPlayback) return;
    
    if (syncMode?.enabled && syncMode?.isHost) {
      hostSeek(time);
    } else {
      hlsSeek(time);
    }
  }, [canControlPlayback, syncMode, hostSeek, hlsSeek]);

  const skip = useCallback((seconds: number) => {
    if (!canControlPlayback) return;
    
    const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
    seek(newTime);
  }, [canControlPlayback, currentTime, duration, seek]);

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

  // Handle external mute (from room audio toggle)
  useEffect(() => {
    if (videoRef.current && externalMuted !== undefined) {
      videoRef.current.muted = externalMuted;
    }
  }, [externalMuted, videoRef]);

  // Handlers
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canControlPlayback || !progressBarRef.current) return;
      const pos = getPositionFromEvent(e, progressBarRef.current);
      seek(pos * duration);
    },
    [canControlPlayback, seek, duration]
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
      // In sync mode, only host can change playback speed
      if (syncMode?.enabled && !syncMode?.isHost) {
        return;
      }
      const video = videoRef.current;
      if (video) {
        video.playbackRate = speed;
        setPlaybackSpeed(speed);
      }
      setSettingsTab('main');
    },
    [videoRef, syncMode]
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
        onClick={() => {
          // Close any open menus first, then toggle play
          if (showSettingsMenu) {
            closeMenus();
          } else if (!controlsLocked) {
            togglePlay();
          }
        }}
        playsInline
      />

      {/* Sync Mode Indicator */}
      {syncMode?.enabled && (
        <div className={`absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        } ${
          syncMode.isHost 
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        }`}>
          <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
          {syncMode.isHost ? 'Hosting' : 'Synced with host'}
        </div>
      )}

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
          locked={controlsLocked}
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
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-24">
          {/* Progress Bar */}
          <ProgressBar
            currentTime={currentTime}
            duration={duration}
            buffered={buffered}
            hoverTime={hoverTime}
            progressBarRef={progressBarRef}
            spriteSheets={spriteSheets}
            locked={controlsLocked}
            onSeek={handleSeek}
            onHover={handleProgressHover}
            onLeave={() => setHoverTime(null)}
          />

          {/* Control Buttons Row - Netflix style layout */}
          <div className="flex items-center justify-between px-4 pb-4">
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
              locked={controlsLocked}
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
              hideSpeedControl={controlsLocked}
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
