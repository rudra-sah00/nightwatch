'use client';

import React, { useState } from 'react';
import { formatTime } from '@/lib/utils/video-utils';
import { ThumbnailPreview } from './ThumbnailPreview';
import { SpriteSheet } from '@/types/video';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  hoverTime: number | null;
  progressBarRef: React.RefObject<HTMLDivElement | null>;
  spriteSheets?: SpriteSheet[];  // Array of sprite sheets for long movies
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
  onSeek,
  onHover,
  onLeave,
}: ProgressBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hoverPosition = hoverTime !== null && duration > 0 ? (hoverTime / duration) * 100 : 0;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    onSeek(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="px-4 mb-3 relative group/progress-container">
      {/* Progress bar wrapper with larger hit area */}
      <div
        ref={progressBarRef}
        className="relative h-2 md:h-1.5 bg-white/20 rounded-full cursor-pointer transition-all duration-200 group-hover/progress-container:h-3"
        onClick={onSeek}
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
          className="absolute h-full bg-white rounded-full transition-[width] duration-75 ease-linear"
          style={{
            width: `${progress}%`,
            boxShadow: isDragging ? '0 0 12px rgba(255, 255, 255, 0.4)' : '0 0 6px rgba(255, 255, 255, 0.2)'
          }}
        >
          {/* Scrubber handle */}
          <div
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-150 ${isDragging
              ? 'scale-125 ring-4 ring-white/30'
              : 'scale-0 opacity-0 group-hover/progress-container:scale-100 group-hover/progress-container:opacity-100'
              }`}
            style={{
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}
          />
        </div>

        {/* Hover indicator line - shows when hovering but not on current position */}
        {hoverTime !== null && Math.abs(hoverPosition - progress) > 2 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/70 pointer-events-none rounded-full transition-opacity duration-150"
            style={{ left: `${hoverPosition}%` }}
          />
        )}

        {/* Thumbnail Preview or Time Tooltip */}
        {hoverTime !== null && (
          spriteSheets && spriteSheets.length > 0 ? (
            <ThumbnailPreview
              time={hoverTime}
              duration={duration}
              spriteSheets={spriteSheets}
              position={hoverPosition}
            />
          ) : (
            <div
              className="absolute -top-14 transform -translate-x-1/2 bg-zinc-900/98 text-white text-sm px-4 py-2.5 rounded-xl pointer-events-none shadow-2xl border border-white/15 backdrop-blur-md z-50"
              style={{ left: `${Math.max(8, Math.min(92, hoverPosition))}%` }}
            >
              <span className="font-bold tracking-wider tabular-nums">{formatTime(hoverTime)}</span>
              {/* Triangle pointer */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-2">
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-zinc-900/98" />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
