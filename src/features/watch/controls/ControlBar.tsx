'use client';
import { ArrowLeft, SkipBack, SkipForward, Users } from 'lucide-react';
import { useMemo } from 'react';
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

// Format time helper - hoisted to module level to avoid recreation
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
  onSidebarToggle?: () => void;
  onQualityChange?: (quality: string) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onAudioChange?: (trackId: string) => void;
  onSubtitleChange?: (trackId: string | null) => void;
  subtitleSettings?: SubtitleSettings;
  onSubtitleSettingsChange?: (settings: SubtitleSettings) => void;
  isMobile?: boolean;
  readOnly?: boolean; // For watch party guests
  hideBackButton?: boolean;
  onInteraction?: (isActive: boolean) => void;
}

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
  onSidebarToggle,
  onQualityChange,
  onPlaybackRateChange,
  onAudioChange,
  onSubtitleChange,
  subtitleSettings,
  onSubtitleSettingsChange,
  isMobile = false,
  readOnly = false,
  hideBackButton = false,
  onInteraction,
}: ControlBarProps) {
  // Memoize track transforms to avoid re-creation on every render
  // Per AGENTS.md 5.5: transforms like .map() should be memoized when passed to child components
  const audioTracksForMenu = useMemo(
    () =>
      state.audioTracks.map((track) => ({
        id: track.id,
        label: track.label,
        language: track.language,
      })),
    [state.audioTracks],
  );

  // Memoize subtitle tracks transform
  const subtitleTracksForMenu = useMemo(
    () =>
      state.subtitleTracks.map((track) => ({
        id: track.id,
        label: track.label,
        language: track.language,
      })),
    [state.subtitleTracks],
  );

  // Get current track IDs
  const currentAudioId = state.currentAudioTrack;
  const currentSubtitleId = state.currentSubtitleTrack;

  return (
    <div
      className={cn(
        'control-bar absolute inset-0 z-30 flex flex-col justify-end md:justify-between pointer-events-none transition-opacity duration-300',
        state.showControls || state.isLoading ? 'opacity-100' : 'opacity-0',
      )}
    >
      {/* Top Gradient */}
      <div className="absolute top-0 left-0 right-0 h-36 md:h-48 lg:h-56 2xl:h-64 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none" />

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-48 md:h-56 lg:h-64 2xl:h-72 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

      {/* Top Bar - Hidden on mobile portrait, shown on landscape/desktop */}
      <div
        className={cn(
          'relative p-4 sm:p-6 lg:p-8 2xl:p-10 hidden sm:flex items-center gap-4 lg:gap-6 z-20 pointer-events-auto transition-opacity duration-300',
          state.isLoading ? 'opacity-0 pointer-events-none' : 'opacity-100',
        )}
      >
        {!hideBackButton && (
          <button
            type="button"
            onClick={onBack}
            onMouseDown={(e) => e.preventDefault()}
            className="p-3 lg:p-4 2xl:p-5 rounded-full bg-white/5 hover:bg-white/20 transition-all duration-200 active:scale-95 backdrop-blur-sm border border-white/10 flex-shrink-0"
          >
            <ArrowLeft className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 text-white" />
          </button>
        )}

        {onSidebarToggle && (
          <button
            type="button"
            onClick={onSidebarToggle}
            onMouseDown={(e) => e.preventDefault()}
            className="group flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 2xl:px-5 2xl:py-3 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 transition-all duration-300 active:scale-95 backdrop-blur-sm border border-indigo-500/30 hover:border-indigo-400/50 flex-shrink-0 shadow-lg shadow-indigo-500/10"
            title="Toggle Watch Party sidebar"
          >
            <Users className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 text-indigo-300 group-hover:text-indigo-200 transition-colors duration-300" />
            <span className="hidden lg:inline text-sm 2xl:text-base font-medium text-indigo-200 group-hover:text-white transition-colors duration-300">
              Party
            </span>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50" />
          </button>
        )}

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
      <div className="relative p-4 md:p-6 lg:p-8 2xl:p-10 space-y-2 md:space-y-3 lg:space-y-4 pointer-events-auto pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Progress Bar - guests can preview on hover but not seek */}
        <SeekBar
          currentTime={state.currentTime}
          duration={state.duration}
          buffered={state.buffered}
          onSeek={onSeek}
          spriteSheet={spriteSheet}
          spriteVtt={spriteVtt}
          disabled={readOnly}
          allowPreview={true}
        />

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-1 md:gap-2 lg:gap-3 2xl:gap-4">
            {/* Play/Pause - Show lock for guests, normal for host */}
            {readOnly ? (
              <div className="relative group/lock">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-zinc-800/60 backdrop-blur-sm border border-zinc-700/50 cursor-not-allowed">
                  <svg
                    className="w-6 h-6 text-zinc-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-label="Locked - Host controls playback"
                    role="img"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900/95 rounded text-xs text-zinc-300 whitespace-nowrap opacity-0 group-hover/lock:opacity-100 transition-opacity pointer-events-none border border-zinc-700/50">
                  Host controls playback
                </div>
              </div>
            ) : (
              <PlayPause
                isPlaying={state.isPlaying}
                onToggle={onTogglePlay}
                size="lg"
              />
            )}

            {/* Skip buttons - Desktop only */}
            {!readOnly && (
              <div className="hidden md:flex items-center gap-1 lg:gap-2">
                <button
                  type="button"
                  onClick={() => onSkip(-10)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="p-3 lg:p-4 2xl:p-5 rounded-full hover:bg-white/20 transition-all duration-200 active:scale-95 group"
                >
                  <SkipBack className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 text-white group-hover:text-white/90" />
                </button>
                <button
                  type="button"
                  onClick={() => onSkip(10)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="p-3 lg:p-4 2xl:p-5 rounded-full hover:bg-white/20 transition-all duration-200 active:scale-95 group"
                >
                  <SkipForward className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 text-white group-hover:text-white/90" />
                </button>
              </div>
            )}

            {/* Volume - Desktop only (Hidden on Mobile) */}
            {!isMobile && (
              <div className="hidden md:block">
                <Volume
                  volume={state.volume}
                  isMuted={state.isMuted}
                  onVolumeChange={onVolumeChange}
                  onMuteToggle={onMuteToggle}
                />
              </div>
            )}

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

            {/* Audio Selector (always visible if available) */}
            <AudioSelector
              tracks={audioTracksForMenu}
              currentTrack={currentAudioId || undefined}
              onTrackChange={onAudioChange}
            />

            {/* Settings (Quality & Speed) */}
            <SettingsMenu
              qualities={state.qualities}
              currentQuality={state.currentQuality}
              playbackRate={state.playbackRate}
              onQualityChange={onQualityChange || (() => {})}
              onPlaybackRateChange={onPlaybackRateChange || (() => {})}
              disabled={readOnly}
              onInteraction={onInteraction}
            />

            {/* Fullscreen - Hidden on mobile if in Watch Party (sidebar exists), shown otherwise */}
            {(!isMobile || !onSidebarToggle) && (
              <Fullscreen
                isFullscreen={state.isFullscreen}
                onToggle={onFullscreenToggle}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
