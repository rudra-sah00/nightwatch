'use client';

import React from 'react';
import { formatTime } from '@/lib/utils/video-utils';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  hoverTime: number | null;
  progressBarRef: React.RefObject<HTMLDivElement | null>;
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
  onSeek,
  onHover,
  onLeave,
}: ProgressBarProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hoverPosition = hoverTime !== null && duration > 0 ? (hoverTime / duration) * 100 : 0;

  return (
    <div className="px-4 mb-2">
      <div
        ref={progressBarRef}
        className="relative h-1 bg-white/20 rounded-full cursor-pointer group/progress hover:h-1.5 transition-all"
        onClick={onSeek}
        onMouseMove={onHover}
        onMouseLeave={onLeave}
      >
        {/* Buffered */}
        <div
          className="absolute h-full bg-white/30 rounded-full"
          style={{ width: `${buffered}%` }}
        />
        
        {/* Progress */}
        <div
          className="absolute h-full bg-white rounded-full"
          style={{ width: `${progress}%` }}
        >
          {/* Scrubber */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 scale-0 group-hover/progress:scale-100 transition-all shadow-lg" />
        </div>

        {/* Hover Time Tooltip */}
        {hoverTime !== null && (
          <div
            className="absolute -top-8 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none"
            style={{ left: `${hoverPosition}%` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>
    </div>
  );
}
