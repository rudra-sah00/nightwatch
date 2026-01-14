'use client';

import React from 'react';
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ForwardIcon,
  BackwardIcon,
} from '@heroicons/react/24/solid';
import { formatTime } from '@/lib/utils/video-utils';
import { SKIP_SECONDS } from '@/lib/constants';

interface ControlButtonsProps {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  showVolumeSlider: boolean;
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
  onTogglePlay,
  onSkip,
  onToggleMute,
  onVolumeChange,
  onVolumeSliderEnter,
  onVolumeSliderLeave,
}: ControlButtonsProps) {
  return (
    <div className="flex items-center gap-2 md:gap-4">
      {/* Play/Pause */}
      <button
        onClick={onTogglePlay}
        className="w-10 h-10 flex items-center justify-center text-white hover:text-zinc-300 transition-colors"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <PauseIcon className="w-7 h-7" />
        ) : (
          <PlayIcon className="w-7 h-7" />
        )}
      </button>

      {/* Skip Backward */}
      <button
        onClick={() => onSkip(-SKIP_SECONDS)}
        className="w-10 h-10 flex items-center justify-center text-white hover:text-zinc-300 transition-colors"
        aria-label={`Rewind ${SKIP_SECONDS} seconds`}
      >
        <BackwardIcon className="w-6 h-6" />
      </button>

      {/* Skip Forward */}
      <button
        onClick={() => onSkip(SKIP_SECONDS)}
        className="w-10 h-10 flex items-center justify-center text-white hover:text-zinc-300 transition-colors"
        aria-label={`Forward ${SKIP_SECONDS} seconds`}
      >
        <ForwardIcon className="w-6 h-6" />
      </button>

      {/* Volume */}
      <div
        className="flex items-center gap-2 relative"
        onMouseEnter={onVolumeSliderEnter}
        onMouseLeave={onVolumeSliderLeave}
      >
        <button
          onClick={onToggleMute}
          className="w-10 h-10 flex items-center justify-center text-white hover:text-zinc-300 transition-colors"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? (
            <SpeakerXMarkIcon className="w-6 h-6" />
          ) : (
            <SpeakerWaveIcon className="w-6 h-6" />
          )}
        </button>
        <div
          className={`overflow-hidden transition-all duration-200 ${
            showVolumeSlider ? 'w-24 opacity-100' : 'w-0 opacity-0'
          }`}
        >
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={onVolumeChange}
            className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
      </div>

      {/* Time Display */}
      <div className="text-white text-sm font-medium ml-2 hidden sm:block">
        <span>{formatTime(currentTime)}</span>
        <span className="text-white/50 mx-1">/</span>
        <span className="text-white/70">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
