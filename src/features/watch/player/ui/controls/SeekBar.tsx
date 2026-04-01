'use client';

import { cn } from '@/lib/utils';
import { formatTime } from '../../utils/format-time';
import { useSeekBar } from './hooks/use-seek-bar';

// Sprite sheet configuration (keep interface here as it's UI-specific)
interface SpriteSheet {
  imageUrl: string;
  width: number; // Width of each thumbnail
  height: number; // Height of each thumbnail
  columns: number; // Number of columns in sprite
  rows: number; // Number of rows in sprite
  interval: number; // Seconds between each thumbnail
}

interface SeekBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  onSeek: (time: number) => void;
  spriteVtt?: string;
  spriteSheet?: SpriteSheet;
  disabled?: boolean;
  /** Allow hover preview even when disabled (for guests) */
  allowPreview?: boolean;
}

export function SeekBar({
  currentTime,
  duration,
  buffered,
  onSeek,
  spriteVtt,
  spriteSheet,
  disabled = false,
  allowPreview = false,
}: SeekBarProps) {
  const {
    canPreview,
    progress,
    bufferedProgress,
    hoverTime,
    hoverPosition,
    previewScale,
    barRef,
    getSpriteStyle,
    handleMouseMove,
    handleMouseLeave,
    handleClick,
    handleDrag,
  } = useSeekBar({
    currentTime,
    duration,
    buffered,
    onSeek,
    spriteVtt,
    spriteSheet,
    disabled,
    allowPreview,
  });

  return (
    <div
      className={`relative group py-2 lg:py-3 2xl:py-4 ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
    >
      {/* Time preview tooltip - show when hovering (guests can preview but not seek) */}
      {canPreview && hoverTime !== null ? (
        <div
          className="absolute bottom-full mb-4 lg:mb-6 2xl:mb-8 transform -translate-x-1/2 flex flex-col items-center pointer-events-none z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{
            left: Math.max(
              100 * previewScale,
              Math.min(
                hoverPosition,
                barRef.current
                  ? barRef.current.offsetWidth - 100 * previewScale
                  : hoverPosition,
              ),
            ),
          }}
        >
          <div
            className={cn(
              'relative bg-white border-[3px] border-border ',
              getSpriteStyle ? 'p-2 lg:p-3 2xl:p-3' : 'px-3 py-1.5',
            )}
          >
            {/* Sprite thumbnail preview container */}
            {getSpriteStyle && (
              <div
                className="relative overflow-hidden bg-black border-[2px] border-border"
                style={{
                  width: `${getSpriteStyle.w * previewScale}px`,
                  height: `${getSpriteStyle.h * previewScale}px`,
                }}
              >
                <div
                  className="absolute bg-no-repeat"
                  style={{
                    backgroundImage: `url(${getSpriteStyle.url})`,
                    backgroundPosition: `-${getSpriteStyle.x}px -${getSpriteStyle.y}px`,
                    backgroundSize: getSpriteStyle.totalW
                      ? `${getSpriteStyle.totalW}px ${getSpriteStyle.totalH}px`
                      : 'auto',
                    width: `${getSpriteStyle.w}px`,
                    height: `${getSpriteStyle.h}px`,
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                  }}
                />
              </div>
            )}

            {/* Time display pill */}
            <div
              className={cn(
                'text-[11px] lg:text-xs 2xl:text-sm font-black font-headline uppercase tracking-widest text-foreground tabular-nums text-center',
                getSpriteStyle
                  ? 'absolute bottom-4 left-1/2 -translate-x-1/2 px-3 lg:px-4 2xl:px-5 py-1.5 bg-[#ffcc00] border-[2px] border-border '
                  : '',
              )}
            >
              {formatTime(hoverTime)}
            </div>
          </div>
          {/* Tooltip Arrow */}
          <div className="w-0 h-0 border-l-[10px] lg:border-l-[12px] 2xl:border-l-[14px] border-l-transparent border-r-[10px] lg:border-r-[12px] 2xl:border-r-[14px] border-r-transparent border-t-[10px] lg:border-t-[12px] 2xl:border-t-[14px] border-t-[#1a1a1a] drop-shadow-sm" />
        </div>
      ) : null}

      {/* Seek bar */}
      <div
        ref={barRef}
        className={`relative h-3 lg:h-4 2xl:h-5 bg-white border-[2px] border-border transition-[height] duration-200 ${canPreview ? 'group-hover:h-4 lg:group-hover:h-5 2xl:group-hover:h-6' : ''} ${disabled ? 'cursor-not-allowed bg-white/50' : ''}`}
        onClick={disabled ? undefined : handleClick}
        onMouseMove={(e) => {
          handleMouseMove(e);
          if (!disabled) handleDrag(e);
        }}
        onMouseLeave={handleMouseLeave}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        aria-label="Seek time"
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            onSeek(Math.min(duration, currentTime + 10));
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            onSeek(Math.max(0, currentTime - 10));
          } else if (e.key === 'Home') {
            e.preventDefault();
            onSeek(0);
          } else if (e.key === 'End') {
            e.preventDefault();
            onSeek(duration);
          }
        }}
      >
        {/* Buffered */}
        <div
          className="absolute h-full bg-zinc-400 border-r-[2px] border-border transition-[width] duration-150"
          style={{ width: `${bufferedProgress}%` }}
        />

        {/* Progress */}
        <div
          className="absolute h-full bg-[#ffcc00] border-r-[2px] border-border outline outline-2 outline-transparent transition-[width] duration-75"
          style={{ width: `${progress}%` }}
        />

        {/* Hover indicator */}
        {hoverTime !== null ? (
          <div
            className="absolute h-full bg-[#1a1a1a]/20 border-r-[2px] border-border"
            style={{ width: `${(hoverTime / duration) * 100}%` }}
          />
        ) : null}

        {/* Scrubber - show lock icon for disabled guests */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-4 lg:w-5 2xl:w-6 h-6 lg:h-8 2xl:h-10 border-[3px] border-border scale-0 group-hover:scale-100 transition-transform duration-200 ${disabled ? 'bg-zinc-500 cursor-not-allowed' : 'bg-[#fff] hover:scale-110'}`}
          style={{ left: `calc(${progress}% - 8px)` }}
        />
      </div>

      {/* Guest lock indicator */}
      {disabled ? (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1.5 bg-background border-[3px] border-border text-[10px] lg:text-xs text-foreground font-black font-headline uppercase tracking-widest ">
          <svg
            className="w-4 h-4 stroke-[3px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-label="Locked - Host controls"
            role="img"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="hidden sm:inline">Host controls</span>
        </div>
      ) : null}
    </div>
  );
}
