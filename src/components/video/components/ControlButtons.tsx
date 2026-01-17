'use client';

import React from 'react';
import { formatTime } from '@/lib/utils/video-utils';
import { SKIP_SECONDS } from '@/lib/constants';
import { EpisodeInfo } from '@/types/video';
import { Lock } from 'lucide-react';

interface ControlButtonsProps {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  showVolumeSlider: boolean;
  title?: string;
  episodeInfo?: EpisodeInfo;
  locked?: boolean;  // When true, play/skip controls are disabled (sync mode for non-host)
  onTogglePlay: () => void;
  onSkip: (seconds: number) => void;
  onToggleMute: () => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVolumeSliderEnter: () => void;
  onVolumeSliderLeave: () => void;
}

export function ControlButtons({
  isPlaying,
  volume,
  isMuted,
  currentTime,
  duration,
  showVolumeSlider,
  title,
  episodeInfo,
  locked = false,
  onTogglePlay,
  onSkip,
  onToggleMute,
  onVolumeChange,
  onVolumeSliderEnter,
  onVolumeSliderLeave,
}: ControlButtonsProps) {
  return (
    <div className="flex items-center gap-1 md:gap-2">
      {/* Play/Pause */}
      <button
        onClick={locked ? undefined : onTogglePlay}
        className={`w-10 h-10 flex items-center justify-center transition-colors ${
          locked 
            ? 'text-white/40 cursor-not-allowed' 
            : 'text-white hover:text-zinc-300'
        }`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        title={locked ? 'Host controls playback' : undefined}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      {/* Skip Backward - Circle with 10 */}
      <button
        onClick={locked ? undefined : () => onSkip(-SKIP_SECONDS)}
        className={`w-10 h-10 flex items-center justify-center transition-colors ${
          locked 
            ? 'text-white/40 cursor-not-allowed' 
            : 'text-white hover:text-zinc-300'
        }`}
        aria-label={`Rewind ${SKIP_SECONDS} seconds`}
        title={locked ? 'Host controls playback' : undefined}
      >
        <SkipBackIcon />
      </button>

      {/* Skip Forward - Circle with 10 */}
      <button
        onClick={locked ? undefined : () => onSkip(SKIP_SECONDS)}
        className={`w-10 h-10 flex items-center justify-center transition-colors ${
          locked 
            ? 'text-white/40 cursor-not-allowed' 
            : 'text-white hover:text-zinc-300'
        }`}
        aria-label={`Forward ${SKIP_SECONDS} seconds`}
        title={locked ? 'Host controls playback' : undefined}
      >
        <SkipForwardIcon />
      </button>

      {/* Volume - always available for all users */}
      <div
        className="flex items-center relative"
        onMouseEnter={onVolumeSliderEnter}
        onMouseLeave={onVolumeSliderLeave}
      >
        <button
          onClick={onToggleMute}
          className="w-10 h-10 flex items-center justify-center text-white hover:text-zinc-300 transition-colors"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? <VolumeMuteIcon /> : <VolumeIcon />}
        </button>
        <div
          className={`flex items-center overflow-hidden transition-all duration-200 ${showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'
            }`}
        >
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={onVolumeChange}
            className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
      </div>

      {/* Time Display */}
      <div className="text-white text-sm font-medium ml-2 hidden sm:flex items-center gap-1">
        <span>{formatTime(currentTime)}</span>
        <span className="text-white/50">/</span>
        <span className="text-white/70">{formatTime(duration)}</span>
      </div>

      {/* Center Title with Episode Badge */}
      {(title || episodeInfo) && (
        <div className="flex-1 flex items-center justify-center gap-3 mx-4 overflow-hidden">
          {episodeInfo && (
            <span className="px-2.5 py-1 bg-zinc-700/80 text-white text-xs font-bold rounded border border-zinc-600 whitespace-nowrap">
              S{episodeInfo.seasonNumber} • E{episodeInfo.episodeNumber}
            </span>
          )}
          {title && (
            <span className="text-white font-medium truncate max-w-xs">
              {title}
              {episodeInfo?.title && (
                <span className="text-green-500 ml-2">— {episodeInfo.title}</span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Custom Icons matching Netflix style

function PlayIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function SkipBackIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <text x="12" y="15" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">10</text>
      <path d="M12 3C9 3 6.5 4.5 5 7" strokeLinecap="round" />
      <path d="M5 4v3h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SkipForwardIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <text x="12" y="15" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">10</text>
      <path d="M12 3c3 0 5.5 1.5 7 4" strokeLinecap="round" />
      <path d="M19 4v3h-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" strokeLinecap="round" />
    </svg>
  );
}

function VolumeMuteIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
      <line x1="23" y1="9" x2="17" y2="15" strokeLinecap="round" />
      <line x1="17" y1="9" x2="23" y2="15" strokeLinecap="round" />
    </svg>
  );
}
