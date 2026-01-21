'use client';
import { ArrowLeft, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlayerState } from '../player/types';
import { AudioSelector } from './AudioSelector';
import { Fullscreen } from './Fullscreen';
import { PlayPause } from './PlayPause';
import { SeekBar } from './SeekBar';
import { SettingsMenu } from './SettingsMenu';
import type { SubtitleSettings } from './SubtitleSelector';
import { SubtitleSelector } from './SubtitleSelector';
import { Volume } from './Volume';

interface ControlBarProps {
  state: PlayerState;
  metadata: {
    title: string;
    type: 'movie' | 'series';
    season?: number;
    episode?: number;
  };
  spriteSheet?: {
    imageUrl: string;
    width: number;
    height: number;
    columns: number;
    rows: number;
    interval: number;
  };
  spriteVtt?: string;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onFullscreenToggle: () => void;
  onBack: () => void;
  onQualityChange?: (quality: string) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onAudioChange?: (trackId: string) => void;
  onSubtitleChange?: (trackId: string | null) => void;
  subtitleSettings?: SubtitleSettings;
  onSubtitleSettingsChange?: (settings: SubtitleSettings) => void;
  isMobile?: boolean;
}

// Format time helper
const formatTime = (seconds: number) => {
  if (Number.isNaN(seconds) || !Number.isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export function ControlBar({
  state,
  metadata,
  spriteSheet,
  spriteVtt,
  onTogglePlay,
  onSeek,
  onSkip,
  onVolumeChange,
  onMuteToggle,
  onFullscreenToggle,
  onBack,
  onQualityChange,
  onPlaybackRateChange,
  onAudioChange,
  onSubtitleChange,
  subtitleSettings,
  onSubtitleSettingsChange,
  isMobile = false,
}: ControlBarProps) {
  // Convert audio tracks for selectors
  const audioTracksForMenu = state.audioTracks.map((track) => ({
    id: track.id,
    label: track.label,
    language: track.language,
  }));

  // Convert subtitle tracks for selectors
  const subtitleTracksForMenu = state.subtitleTracks.map((track) => ({
    id: track.id,
    label: track.label,
    language: track.language,
  }));

  // Get current track IDs
  const currentAudioId = state.currentAudioTrack;
  const currentSubtitleId = state.currentSubtitleTrack;

  return (
    <div
      className={cn(
        'control-bar absolute inset-0 z-10 flex flex-col justify-between pointer-events-none transition-opacity duration-300',
        state.showControls ? 'opacity-100' : 'opacity-0',
      )}
    >
      {/* Top Gradient */}
      <div className="absolute top-0 left-0 right-0 h-36 md:h-48 lg:h-56 2xl:h-64 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none" />

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-48 md:h-56 lg:h-64 2xl:h-72 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

      {/* Top Bar */}
      <div className="relative p-4 md:p-6 lg:p-8 2xl:p-10 flex items-center gap-4 lg:gap-6 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={onBack}
          className="p-3 lg:p-4 2xl:p-5 rounded-full bg-white/5 hover:bg-white/20 transition-all duration-200 active:scale-95 backdrop-blur-sm border border-white/10 flex-shrink-0"
        >
          <ArrowLeft className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-semibold text-lg md:text-2xl lg:text-3xl 2xl:text-4xl truncate drop-shadow-lg">
            {metadata.title}
          </h1>
          {metadata.type === 'series' &&
            metadata.season &&
            metadata.episode && (
              <p className="text-white/60 text-sm md:text-base lg:text-lg 2xl:text-xl">
                Season {metadata.season} · Episode {metadata.episode}
              </p>
            )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="relative p-4 md:p-6 lg:p-8 2xl:p-10 space-y-2 md:space-y-3 lg:space-y-4 pointer-events-auto">
        {/* Progress Bar */}
        <SeekBar
          currentTime={state.currentTime}
          duration={state.duration}
          buffered={state.buffered}
          onSeek={onSeek}
          spriteSheet={spriteSheet}
          spriteVtt={spriteVtt}
        />

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-1 md:gap-2 lg:gap-3 2xl:gap-4">
            {/* Play/Pause */}
            <PlayPause
              isPlaying={state.isPlaying}
              onToggle={onTogglePlay}
              size="lg"
            />

            {/* Skip buttons - Desktop only */}
            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              <button
                type="button"
                onClick={() => onSkip(-10)}
                className="p-3 lg:p-4 2xl:p-5 rounded-full hover:bg-white/20 transition-all duration-200 active:scale-95 group"
              >
                <SkipBack className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 text-white group-hover:text-white/90" />
              </button>
              <button
                type="button"
                onClick={() => onSkip(10)}
                className="p-3 lg:p-4 2xl:p-5 rounded-full hover:bg-white/20 transition-all duration-200 active:scale-95 group"
              >
                <SkipForward className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 text-white group-hover:text-white/90" />
              </button>
            </div>

            {/* Volume - Desktop only */}
            <div className="hidden md:block">
              <Volume
                volume={state.volume}
                isMuted={state.isMuted}
                onVolumeChange={onVolumeChange}
                onMuteToggle={onMuteToggle}
              />
            </div>

            {/* Time Display */}
            <div className="text-white text-sm md:text-base lg:text-lg 2xl:text-xl font-medium ml-2 md:ml-3 lg:ml-4 2xl:ml-5 tabular-nums">
              <span>{formatTime(state.currentTime)}</span>
              <span className="text-white/50 mx-1 md:mx-2 lg:mx-3 2xl:mx-4">
                /
              </span>
              <span className="text-white/70">
                {formatTime(state.duration)}
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 md:gap-2 lg:gap-3 2xl:gap-4">
            {/* Subtitle Selector (always visible) */}
            <SubtitleSelector
              tracks={subtitleTracksForMenu}
              currentTrack={currentSubtitleId}
              onTrackChange={onSubtitleChange}
              subtitleSettings={subtitleSettings}
              onSubtitleSettingsChange={onSubtitleSettingsChange}
            />

            {/* Audio Selector (desktop only - hidden on mobile via component) */}
            <AudioSelector
              tracks={audioTracksForMenu}
              currentTrack={currentAudioId || undefined}
              onTrackChange={onAudioChange}
              disabled={isMobile}
            />

            {/* Settings (Quality & Speed) */}
            <SettingsMenu
              qualities={state.qualities}
              currentQuality={state.currentQuality}
              playbackRate={state.playbackRate}
              onQualityChange={onQualityChange || (() => {})}
              onPlaybackRateChange={onPlaybackRateChange || (() => {})}
            />

            {/* Fullscreen */}
            <Fullscreen
              isFullscreen={state.isFullscreen}
              onToggle={onFullscreenToggle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
