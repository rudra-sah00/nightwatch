'use client';

import { cn } from '@/lib/utils';
import { useSeekBar } from './use-seek-bar';

// Sprite sheet configuration (keep interface here as it's UI-specific)
interface SpriteSheet {
  imageUrl: string;
  width: number; // Width of each thumbnail
  height: number; // Height of each thumbnail
  columns: number; // Number of columns in sprite
  rows: number; // Number of rows in sprite
  interval: number; // Seconds between each thumbnail
}

// Preview size scales for different screen sizes
const _PREVIEW_SCALES = {
  base: 1, // Mobile/default
  lg: 1.3, // Large screens
  xl: 1.5, // Extra large
  '2xl': 1.8, // 2K+
  '3xl': 2.2, // Ultrawide/4K
};

// Format time helper - hoisted to module level to avoid recreation (rule 6.3)
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
              'relative bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.6)] ring-1 ring-white/5',
              getSpriteStyle ? 'p-1.5 lg:p-2 2xl:p-2.5' : 'px-3 py-1.5',
            )}
          >
            {/* Sprite thumbnail preview container */}
            {getSpriteStyle && (
              <div
                className="relative overflow-hidden rounded-lg bg-black"
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
                'text-[11px] lg:text-xs 2xl:text-sm font-medium text-white/90 tabular-nums tracking-wide text-center',
                getSpriteStyle
                  ? 'absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 lg:px-3 2xl:px-4 py-1 lg:py-1.5 2xl:py-2 bg-black/80 backdrop-blur-md rounded-md border border-white/10 shadow-sm'
                  : '',
              )}
            >
              {formatTime(hoverTime)}
            </div>
          </div>
          {/* Tooltip Arrow */}
          <div className="w-0 h-0 border-l-[8px] lg:border-l-[10px] 2xl:border-l-[12px] border-l-transparent border-r-[8px] lg:border-r-[10px] 2xl:border-r-[12px] border-r-transparent border-t-[8px] lg:border-t-[10px] 2xl:border-t-[12px] border-t-zinc-900/95 -mt-[1px] drop-shadow-sm" />
        </div>
      ) : null}

      {/* Seek bar */}
      <div
        ref={barRef}
        className={`relative h-1.5 lg:h-2 2xl:h-3 bg-white/20 rounded-full transition-[height] duration-200 ${canPreview ? 'group-hover:h-2.5 lg:group-hover:h-3 2xl:group-hover:h-4' : ''} ${disabled ? 'cursor-not-allowed' : ''}`}
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
          className="absolute h-full bg-white/30 rounded-full transition-[width] duration-150"
          style={{ width: `${bufferedProgress}%` }}
        />

        {/* Progress */}
        <div
          className="absolute h-full bg-red-600 rounded-full transition-[width] duration-75"
          style={{ width: `${progress}%` }}
        />

        {/* Hover indicator */}
        {hoverTime !== null ? (
          <div
            className="absolute h-full bg-white/20 rounded-full"
            style={{ width: `${(hoverTime / duration) * 100}%` }}
          />
        ) : null}

        {/* Scrubber - show lock icon for disabled guests */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-4 lg:w-5 2xl:w-6 h-4 lg:h-5 2xl:h-6 rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform duration-200 ${disabled ? 'bg-zinc-500 cursor-not-allowed' : 'bg-red-600 hover:scale-125'}`}
          style={{ left: `calc(${progress}% - 8px)` }}
        />
      </div>

      {/* Guest lock indicator */}
      {disabled ? (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/80 backdrop-blur-sm rounded-full border border-zinc-700/50 text-[10px] lg:text-xs text-zinc-400">
          <svg
            className="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
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
