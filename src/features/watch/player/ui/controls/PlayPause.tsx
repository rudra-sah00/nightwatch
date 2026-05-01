'use client';

import { Lock, Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useMobileDetection } from '../../hooks/useMobileDetection';

// Static size configurations to avoid recreation
const SIZE_CLASSES = {
  sm: 'w-8 h-8 md:w-10 md:h-10',
  md: 'w-9 h-9 md:w-12 md:h-12',
  lg: 'w-10 h-10 md:w-14 md:h-14',
} as const;

const ICON_SIZES = {
  sm: 'w-3.5 h-3.5 md:w-5 md:h-5',
  md: 'w-4 h-4 md:w-6 md:h-6',
  lg: 'w-5 h-5 md:w-7 md:h-7',
} as const;

/**
 * Props for the {@link PlayPause} button.
 */
interface PlayPauseProps {
  /** Whether the video is currently playing. */
  isPlaying: boolean;
  /** Callback to toggle play/pause state. */
  onToggle: () => void;
  /** Button size variant. Affects both the outer button and inner icon dimensions. */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Play/pause toggle button used in both desktop and mobile control rows.
 *
 * Renders a filled Play or Pause icon inside a neo-brutalist styled button.
 * On mobile the border is removed; on desktop a 3px border is applied.
 *
 * @param props - See {@link PlayPauseProps}.
 */
export function PlayPause({
  isPlaying,
  onToggle,
  size = 'md',
}: PlayPauseProps) {
  const t = useTranslations('watch.player');

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isPlaying ? t('pause') : t('play')}
      className={cn(
        'flex items-center justify-center transition-[background-color,color,border-color,opacity,transform] duration-200',
        'border-none md:border-[3px] md:border-border bg-neo-yellow text-foreground ',
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

/**
 * Props for the {@link CenterPlayButton} Netflix-style pause overlay.
 */
interface CenterPlayButtonProps {
  /** Whether the video is currently playing. The overlay is only visible when paused. */
  isPlaying: boolean;
  /** Callback to resume playback. */
  onToggle: () => void;
  /** Video metadata displayed in the overlay (title, type badge, episode info, description). */
  metadata?: {
    title: string;
    type: 'movie' | 'series' | 'livestream';
    season?: number;
    episode?: number;
    description?: string;
    year?: string;
    posterUrl?: string;
  };
  /** When `true`, shows a "Host controls playback" lock badge instead of the resume prompt (watch-party guest). */
  disabled?: boolean;
}

/**
 * Netflix-style full-screen pause overlay displayed in the center of the player.
 *
 * When the video is paused, this overlay fades in with a dark gradient background
 * and shows the video's metadata (title, type badge, season/episode, year, description)
 * along with a "Tap to resume" or "Host controls playback" indicator.
 *
 * **Mobile:** Returns `null` — mobile uses the dedicated center controls instead.
 * **Desktop:** Covers the entire player area as a clickable button to resume playback.
 *
 * @param props - See {@link CenterPlayButtonProps}.
 */
export function CenterPlayButton({
  isPlaying,
  onToggle,
  metadata,
  disabled = false,
  isLoading = false,
}: CenterPlayButtonProps & { isLoading?: boolean }) {
  const t = useTranslations('watch.player');
  const isMobile = useMobileDetection();

  // On mobile, don't show the pause overlay — controls handle play/pause
  if (isMobile) return null;

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
        <div className={cn('absolute inset-0', 'bg-black/70')} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
      </div>

      {/* Movie Info - CENTERED in the middle */}
      {metadata ? (
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
                ? t('tvSeries')
                : metadata.type === 'livestream'
                  ? t('live')
                  : t('movie')}
            </div>

            {/* Title - responsive sizing */}
            <h2 className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-black font-headline uppercase tracking-wider text-white text-center mb-2 sm:mb-4 px-2 line-clamp-2 sm:line-clamp-none flex-shrink-0 drop-shadow-md">
              {metadata.title}
            </h2>

            {/* Episode info for series */}
            {metadata.type === 'series' &&
            metadata.season &&
            metadata.episode ? (
              <p className="text-neo-yellow font-black font-headline uppercase text-sm sm:text-lg md:text-2xl mb-2 sm:mb-4 flex-shrink-0 drop-shadow-md">
                S{metadata.season} · E{metadata.episode}
              </p>
            ) : null}

            {/* Year - hidden on very small mobile portrait */}
            {metadata.year ? (
              <p className="text-white/90 font-bold font-headline text-xs sm:text-sm mb-2 sm:mb-4 hidden portrait:sm:block landscape:block flex-shrink-0 drop-shadow-md">
                {metadata.year}
              </p>
            ) : null}

            {/* Description - hidden on mobile portrait, shown on landscape/larger */}
            {metadata.description ? (
              <p className="text-white/80 text-xs sm:text-sm md:text-base font-bold text-center max-w-2xl line-clamp-2 sm:line-clamp-3 leading-relaxed mb-4 sm:mb-8 px-2 hidden landscape:block sm:block flex-shrink-0 drop-shadow-md">
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
                        {t('hostControlsPlayback')}
                      </span>
                      <span className="text-foreground/70 text-[10px] sm:text-xs font-bold font-headline uppercase mt-1">
                        {t('sitBackAndEnjoy')}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Normal paused state for host */
                <div className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-background border-[3px] border-border ">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-neo-red border-[2px] border-border animate-pulse" />
                  <span className="text-foreground text-xs sm:text-sm font-black font-headline uppercase tracking-widest">
                    {t('tapToResume')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Fallback for no metadata */}
      {!metadata ? (
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
                  {t('hostControlsPlayback')}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-background border-[3px] border-border ">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-neo-red border-[2px] border-border animate-pulse" />
              <span className="text-foreground text-xs sm:text-sm font-black font-headline uppercase tracking-widest">
                {t('tapToResume')}
              </span>
            </div>
          )}
        </div>
      ) : null}
    </button>
  );
}

/**
 * Props for the {@link TapIndicator} seek ripple overlay.
 */
interface TapIndicatorProps {
  /** Which side of the player the ripple appears on. */
  direction: 'left' | 'right';
  /** Number of seconds being skipped (displayed inside the ripple circle). */
  seconds: number;
  /** Controls visibility — when `false`, the component returns `null`. */
  isVisible: boolean;
}

/**
 * Animated ripple indicator shown on mobile when the user double-taps to seek.
 *
 * Appears at 25% from the left or right edge of the player, displaying the
 * number of seconds skipped inside a translucent circle with a zoom-in animation.
 *
 * @param props - See {@link TapIndicatorProps}.
 */
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
