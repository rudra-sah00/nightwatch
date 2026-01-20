'use client';

import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayPauseProps {
  isPlaying: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function PlayPause({ isPlaying, onToggle, size = 'md' }: PlayPauseProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'rounded-full flex items-center justify-center',
        'transition-all duration-300 ease-out',
        'bg-white/5 backdrop-blur-sm border border-white/10',
        'hover:bg-white/15 hover:border-white/20 hover:scale-105',
        'active:scale-95 active:bg-white/20',
        'shadow-lg shadow-black/20',
        sizeClasses[size],
      )}
    >
      {isPlaying ? (
        <Pause className={cn('text-white fill-white drop-shadow-sm', iconSizes[size])} />
      ) : (
        <Play className={cn('text-white fill-white ml-0.5 drop-shadow-sm', iconSizes[size])} />
      )}
    </button>
  );
}

// Netflix-style pause overlay with movie info in CENTER
interface CenterPlayButtonProps {
  isPlaying: boolean;
  onToggle: () => void;
  metadata?: {
    title: string;
    type: 'movie' | 'series';
    season?: number;
    episode?: number;
    description?: string;
    year?: string;
    posterUrl?: string;
  };
}

export function CenterPlayButton({ isPlaying, onToggle, metadata }: CenterPlayButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'absolute inset-0 transition-all duration-500 z-20 w-full text-left',
        !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
      onClick={onToggle}
    >
      {/* Dark overlay with gradients */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-500',
          !isPlaying ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
      </div>

      {/* Movie Info - CENTERED in the middle */}
      {metadata && (
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center px-6',
            'transition-all duration-500 transform',
            !isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          )}
        >
          {/* Content type badge */}
          <div
            className={cn(
              'px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-4',
              metadata.type === 'series' ? 'bg-purple-600 text-white' : 'bg-red-600 text-white',
            )}
          >
            {metadata.type === 'series' ? 'TV Series' : 'Movie'}
          </div>

          {/* Title */}
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-3 drop-shadow-2xl max-w-4xl">
            {metadata.title}
          </h2>

          {/* Episode info for series */}
          {metadata.type === 'series' && metadata.season && metadata.episode && (
            <p className="text-white/80 text-lg md:text-xl mb-3">
              Season {metadata.season} · Episode {metadata.episode}
            </p>
          )}

          {/* Year */}
          {metadata.year && <p className="text-white/50 text-sm mb-4">{metadata.year}</p>}

          {/* Description */}
          {metadata.description && (
            <p className="text-white/60 text-sm md:text-base text-center max-w-2xl line-clamp-3 leading-relaxed mb-6">
              {metadata.description}
            </p>
          )}

          {/* Paused indicator - centered below info */}
          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white/90 text-sm font-medium">
                Paused · Click anywhere to resume
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Fallback for no metadata */}
      {!metadata && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white/90 text-sm font-medium">
              Paused · Click anywhere to resume
            </span>
          </div>
        </div>
      )}
    </button>
  );
}

// Ripple effect on tap (mobile)
interface TapIndicatorProps {
  direction: 'left' | 'right';
  seconds: number;
  isVisible: boolean;
}

export function TapIndicator({ direction, seconds, isVisible }: TapIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-2',
        'animate-in fade-in zoom-in-50 duration-200',
        direction === 'left' ? 'left-1/4' : 'right-1/4',
      )}
    >
      <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
        <span className="text-white text-2xl font-bold">{seconds}s</span>
      </div>
    </div>
  );
}
