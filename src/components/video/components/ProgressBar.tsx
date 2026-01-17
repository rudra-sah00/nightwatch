'use client';

import { Lock } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { formatTime } from '@/lib/utils/video-utils';
import type { SpriteSheet } from '@/types/video';
import { ThumbnailPreview } from './ThumbnailPreview';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  hoverTime: number | null;
  progressBarRef: React.RefObject<HTMLDivElement | null>;
  spriteSheets?: SpriteSheet[]; // Array of sprite sheets for long movies
  locked?: boolean; // When true, user cannot seek (sync mode for non-host)
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  onHover: (e: React.MouseEvent<HTMLDivElement>) => void;
  onLeave: () => void;
}

export function ProgressBar({
  currentTime,
  duration,
  buffered,
  hoverTime,
  progressBarRef,
  spriteSheets,
  locked = false,
  onSeek,
  onHover,
  onLeave,
}: ProgressBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hoverPosition = hoverTime !== null && duration > 0 ? (hoverTime / duration) * 100 : 0;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (locked) return;
    setIsDragging(true);
    onSeek(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (locked) return;
    onSeek(e);
  };

  return (
    <div className="px-3 sm:px-4 md:px-5 lg:px-6 mb-2 sm:mb-3 relative group/progress-container">
      {/* Locked indicator */}
      {locked && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs text-zinc-400 opacity-0 group-hover/progress-container:opacity-100 transition-opacity">
          <Lock className="w-3 h-3" />
          <span>Host controls timeline</span>
        </div>
      )}

      {/* Progress bar wrapper with larger hit area for touch */}
      <div
        ref={progressBarRef}
        role="slider"
        tabIndex={locked ? -1 : 0}
        aria-label="Video progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-valuetext={`${Math.round(progress)}% played`}
        className={`relative h-3 sm:h-2.5 md:h-2 bg-white/20 rounded-full transition-all duration-200 group-hover/progress-container:h-4 sm:group-hover/progress-container:h-3.5 md:group-hover/progress-container:h-3 ${
          locked ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (locked) return;
          // Note: Keyboard navigation is handled at the VideoPlayer level
          // This handler prevents default browser behavior for arrow keys
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
          }
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={onHover}
        onMouseLeave={() => {
          onLeave();
          setIsDragging(false);
        }}
      >
        {/* Buffered - with subtle animation */}
        <div
          className="absolute h-full bg-white/30 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${buffered}%` }}
        />

        {/* Progress - Clean white bar */}
        <div
          className={`absolute h-full rounded-full transition-[width] duration-75 ease-linear ${
            locked ? 'bg-white/70' : 'bg-white'
          }`}
          style={{
            width: `${progress}%`,
            boxShadow: isDragging
              ? '0 0 12px rgba(255, 255, 255, 0.4)'
              : '0 0 6px rgba(255, 255, 255, 0.2)',
          }}
        >
          {/* Scrubber handle - hidden when locked, larger for touch */}
          {!locked && (
            <div
              className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 bg-white rounded-full shadow-lg transition-all duration-150 touch-manipulation ${
                isDragging
                  ? 'scale-125 ring-4 ring-white/30'
                  : 'scale-100 sm:scale-0 sm:opacity-0 group-hover/progress-container:scale-100 group-hover/progress-container:opacity-100'
              }`}
              style={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            />
          )}
        </div>

        {/* Hover indicator line - shows when hovering but not on current position */}
        {hoverTime !== null && !locked && Math.abs(hoverPosition - progress) > 2 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/70 pointer-events-none rounded-full transition-opacity duration-150"
            style={{ left: `${hoverPosition}%` }}
          />
        )}

        {/* Thumbnail Preview or Time Tooltip */}
        {hoverTime !== null &&
          !locked &&
          (spriteSheets && spriteSheets.length > 0 ? (
            <ThumbnailPreview
              time={hoverTime}
              duration={duration}
              spriteSheets={spriteSheets}
              position={hoverPosition}
            />
          ) : (
            <div
              className="absolute -top-12 sm:-top-14 transform -translate-x-1/2 bg-zinc-900/98 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl pointer-events-none shadow-2xl border border-white/15 backdrop-blur-md z-50"
              style={{ left: `${Math.max(8, Math.min(92, hoverPosition))}%` }}
            >
              <span className="font-bold tracking-wider tabular-nums">{formatTime(hoverTime)}</span>
              {/* Triangle pointer */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-2">
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-zinc-900/98" />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
