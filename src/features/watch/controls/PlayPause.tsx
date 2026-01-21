'use client';

import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayPauseProps {
  isPlaying: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function PlayPause({
  isPlaying,
  onToggle,
  size = 'md',
}: PlayPauseProps) {
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
        <Pause
          className={cn(
            'text-white fill-white drop-shadow-sm',
            iconSizes[size],
          )}
        />
      ) : (
        <Play
          className={cn(
            'text-white fill-white ml-0.5 drop-shadow-sm',
            iconSizes[size],
          )}
        />
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

export function CenterPlayButton({
  isPlaying,
  onToggle,
  metadata,
}: CenterPlayButtonProps) {
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

      {/* Movie Info - CENTERED in the middle with mobile-optimized layout */}
      {metadata && (
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center',
            'px-4 py-8 sm:px-6 sm:py-10',
            'transition-all duration-500 transform overflow-hidden',
            !isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          )}
        >
          {/* Scrollable content wrapper for small screens */}
          <div className="flex flex-col items-center justify-center w-full max-h-full overflow-y-auto scrollbar-hide">
            {/* Content type badge */}
            <div
              className={cn(
                'px-2.5 py-1 sm:px-3 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2 sm:mb-4 flex-shrink-0',
                metadata.type === 'series'
                  ? 'bg-purple-600 text-white'
                  : 'bg-red-600 text-white',
              )}
            >
              {metadata.type === 'series' ? 'TV Series' : 'Movie'}
            </div>

            {/* Title - responsive sizing */}
            <h2 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-1.5 sm:mb-3 drop-shadow-2xl max-w-4xl px-2 line-clamp-2 sm:line-clamp-none flex-shrink-0">
              {metadata.title}
            </h2>

            {/* Episode info for series */}
            {metadata.type === 'series' &&
              metadata.season &&
              metadata.episode && (
                <p className="text-white/80 text-sm sm:text-lg md:text-xl mb-1.5 sm:mb-3 flex-shrink-0">
                  S{metadata.season} · E{metadata.episode}
                </p>
              )}

            {/* Year - hidden on very small mobile portrait */}
            {metadata.year && (
              <p className="text-white/50 text-xs sm:text-sm mb-2 sm:mb-4 hidden portrait:sm:block landscape:block flex-shrink-0">
                {metadata.year}
              </p>
            )}

            {/* Description - hidden on mobile portrait, shown on landscape/larger */}
            {metadata.description && (
              <p className="text-white/60 text-xs sm:text-sm md:text-base text-center max-w-2xl line-clamp-2 sm:line-clamp-3 leading-relaxed mb-3 sm:mb-6 px-2 hidden landscape:block sm:block flex-shrink-0">
                {metadata.description}
              </p>
            )}

            {/* Paused indicator - compact on mobile */}
            <div className="flex items-center gap-2 mt-2 sm:mt-4 flex-shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white/90 text-xs sm:text-sm font-medium">
                  Tap to resume
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fallback for no metadata */}
      {!metadata && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white/90 text-xs sm:text-sm font-medium">
              Tap to resume
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

export function TapIndicator({
  direction,
  seconds,
  isVisible,
}: TapIndicatorProps) {
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
