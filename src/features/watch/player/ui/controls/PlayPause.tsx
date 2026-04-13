'use client';

import { Lock, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';

// Static size configurations to avoid recreation
const SIZE_CLASSES = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
} as const;

const ICON_SIZES = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
} as const;

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
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center justify-center transition-[background-color,color,border-color,opacity,transform] duration-200',
        'border-[3px] border-border bg-neo-yellow text-foreground ',
        'hover:bg-neo-yellow/80',
        'active:bg-neo-yellow/80',
        SIZE_CLASSES[size],
      )}
    >
      {isPlaying ? (
        <Pause
          className={cn('text-foreground fill-current', ICON_SIZES[size])}
        />
      ) : (
        <Play
          className={cn('text-foreground fill-current ml-1', ICON_SIZES[size])}
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
    type: 'movie' | 'series' | 'livestream';
    season?: number;
    episode?: number;
    description?: string;
    year?: string;
    posterUrl?: string;
  };
  disabled?: boolean;
}

export function CenterPlayButton({
  isPlaying,
  onToggle,
  metadata,
  disabled = false,
  isLoading = false,
}: CenterPlayButtonProps & { isLoading?: boolean }) {
  const isMobile = useMobileDetection();
  const isPortrait = useMobileOrientation();
  const useCompactOverlay = isMobile && isPortrait;

  const handleClick = (e: React.MouseEvent) => {
    // Don't propagate clicks to video element
    e.stopPropagation();
    // Prevent toggle if disabled or still loading
    if (!disabled && !isLoading) {
      onToggle();
    }
  };

  return (
    <button
      type="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!disabled && !isLoading) onToggle();
        }
      }}
      className={cn(
        'absolute inset-0 transition-opacity duration-500 z-20 w-full cursor-pointer border-none bg-transparent p-0 m-0',
        !isPlaying && !isLoading
          ? 'opacity-100'
          : 'opacity-0 pointer-events-none',
        (disabled || isLoading) && 'cursor-default',
      )}
      style={{ pointerEvents: isPlaying || isLoading ? 'none' : 'auto' }}
      onClick={handleClick}
    >
      {/* Dark overlay with gradients */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-500',
          !isPlaying ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div
          className={cn(
            'absolute inset-0',
            useCompactOverlay ? 'bg-black/40' : 'bg-black/70',
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
      </div>

      {useCompactOverlay ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none px-4">
          <div className="w-16 h-16 rounded-full bg-background/15 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <Play className="w-7 h-7 text-primary-foreground fill-white ml-0.5" />
          </div>
          {disabled ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 border border-white/20 rounded-full">
              <Lock className="w-3.5 h-3.5 text-primary-foreground" />
              <span className="text-[10px] text-primary-foreground font-black font-headline uppercase tracking-widest">
                Host Controls Playback
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-primary-foreground font-black font-headline uppercase tracking-widest">
              Tap to resume
            </span>
          )}
        </div>
      ) : null}

      {/* Movie Info - CENTERED in the middle with mobile-optimized layout */}
      {!useCompactOverlay && metadata ? (
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center pointer-events-none',
            'px-4 py-8 sm:px-6 sm:py-10',
            'transition-[opacity,transform] duration-500 overflow-hidden',
            !isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          )}
        >
          {/* Scrollable content wrapper for small screens */}
          <div className="flex flex-col items-center justify-center w-full max-h-full overflow-y-auto no-scrollbar">
            {/* Content type badge */}
            <div
              className={cn(
                'px-3 py-1 text-[10px] sm:text-xs font-black font-headline uppercase tracking-widest mb-3 sm:mb-5 flex-shrink-0 border-[3px] border-border ',
                metadata.type === 'series'
                  ? 'bg-neo-blue text-primary-foreground'
                  : 'bg-neo-red text-primary-foreground',
              )}
            >
              {metadata.type === 'series'
                ? 'TV Series'
                : metadata.type === 'livestream'
                  ? 'Live'
                  : 'Movie'}
            </div>

            {/* Title - responsive sizing */}
            <h2
              className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-black font-headline uppercase tracking-wider text-primary-foreground text-center mb-2 sm:mb-4 px-2 line-clamp-2 sm:line-clamp-none flex-shrink-0"
              style={{ textShadow: '4px 4px 0px #1a1a1a' }}
            >
              {metadata.title}
            </h2>

            {/* Episode info for series */}
            {metadata.type === 'series' &&
            metadata.season &&
            metadata.episode ? (
              <p
                className="text-neo-yellow font-black font-headline uppercase text-sm sm:text-lg md:text-2xl mb-2 sm:mb-4 flex-shrink-0"
                style={{ textShadow: '2px 2px 0px #1a1a1a' }}
              >
                S{metadata.season} · E{metadata.episode}
              </p>
            ) : null}

            {/* Year - hidden on very small mobile portrait */}
            {metadata.year ? (
              <p
                className="text-primary-foreground font-bold font-headline text-xs sm:text-sm mb-2 sm:mb-4 hidden portrait:sm:block landscape:block flex-shrink-0"
                style={{ textShadow: '1px 1px 0px #1a1a1a' }}
              >
                {metadata.year}
              </p>
            ) : null}

            {/* Description - hidden on mobile portrait, shown on landscape/larger */}
            {metadata.description ? (
              <p
                className="text-primary-foreground text-xs sm:text-sm md:text-base font-bold text-center max-w-2xl line-clamp-2 sm:line-clamp-3 leading-relaxed mb-4 sm:mb-8 px-2 hidden landscape:block sm:block flex-shrink-0"
                style={{ textShadow: '1px 1px 0px #1a1a1a' }}
              >
                {metadata.description}
              </p>
            ) : null}

            {/* Paused indicator - enhanced for guests */}
            <div className="flex items-center gap-2 mt-2 sm:mt-4 flex-shrink-0">
              {disabled ? (
                /* Guest locked view - premium aesthetic */
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-background border-[3px] border-border ">
                    <div className="relative">
                      <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-foreground stroke-[3px]" />
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-neo-red border-[2px] border-border animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-foreground text-xs sm:text-sm font-black font-headline uppercase tracking-widest leading-none">
                        Host Controls Playback
                      </span>
                      <span className="text-[#4a4a4a] text-[10px] sm:text-xs font-bold font-headline uppercase mt-1">
                        Sit back and enjoy the show
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Normal paused state for host */
                <div className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-background border-[3px] border-border ">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-neo-red border-[2px] border-border animate-pulse" />
                  <span className="text-foreground text-xs sm:text-sm font-black font-headline uppercase tracking-widest">
                    Tap to resume
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Fallback for no metadata - enhanced for guests */}
      {!useCompactOverlay && !metadata ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 pointer-events-none">
          {disabled ? (
            /* Guest locked view */
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-background border-[3px] border-border ">
                <div className="relative">
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-foreground stroke-[3px]" />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-neo-red border-[2px] border-border animate-pulse" />
                </div>
                <span className="text-foreground text-xs sm:text-sm font-black font-headline uppercase tracking-widest leading-none">
                  Host Controls Playback
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-background border-[3px] border-border ">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-neo-red border-[2px] border-border animate-pulse" />
              <span className="text-foreground text-xs sm:text-sm font-black font-headline uppercase tracking-widest">
                Tap to resume
              </span>
            </div>
          )}
        </div>
      ) : null}
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
        'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-50 motion-safe:duration-200 motion-reduce:animate-none',
        direction === 'left' ? 'left-1/4' : 'right-1/4',
      )}
    >
      <div className="w-20 h-20 rounded-full bg-background/10 backdrop-blur-sm flex items-center justify-center">
        <span className="text-primary-foreground text-2xl font-bold">
          {seconds}s
        </span>
      </div>
    </div>
  );
}
