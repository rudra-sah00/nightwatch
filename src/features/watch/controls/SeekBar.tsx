'use client';

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Sprite sheet configuration
interface SpriteCue {
  start: number;
  end: number;
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
interface SpriteSheet {
  imageUrl: string;
  width: number; // Width of each thumbnail
  height: number; // Height of each thumbnail
  columns: number; // Number of columns in sprite
  rows: number; // Number of rows in sprite
  interval: number; // Seconds between each thumbnail
}

// Preview size scales for different screen sizes
const PREVIEW_SCALES = {
  base: 1, // Mobile/default
  lg: 1.3, // Large screens
  xl: 1.5, // Extra large
  '2xl': 1.8, // 2K+
  '3xl': 2.2, // Ultrawide/4K
};

// Sprite data for rendering
interface SpriteData {
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
  totalW?: number; // Total sprite sheet width (for spriteSheet type)
  totalH?: number; // Total sprite sheet height
}

interface SeekBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  onSeek: (time: number) => void;
  spriteVtt?: string;
  spriteSheet?: SpriteSheet;
}

export function SeekBar({
  currentTime,
  duration,
  buffered,
  onSeek,
  spriteVtt,
  spriteSheet,
}: SeekBarProps) {
  const progress = duration ? (currentTime / duration) * 100 : 0;
  const bufferedProgress = duration ? (buffered / duration) * 100 : 0;

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [previewScale, setPreviewScale] = useState(1);
  const barRef = useRef<HTMLDivElement>(null);

  // VTT Logic
  const [vttSprites, setVttSprites] = useState<SpriteCue[]>([]);

  // Detect screen size for preview scaling
  useEffect(() => {
    const updateScale = () => {
      const width = window.innerWidth;
      if (width >= 3440) {
        setPreviewScale(PREVIEW_SCALES['3xl']);
      } else if (width >= 2560) {
        setPreviewScale(PREVIEW_SCALES['2xl']);
      } else if (width >= 1920) {
        setPreviewScale(PREVIEW_SCALES.xl);
      } else if (width >= 1280) {
        setPreviewScale(PREVIEW_SCALES.lg);
      } else {
        setPreviewScale(PREVIEW_SCALES.base);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    if (!spriteVtt) return;

    const parseVttTime = (timestamp: string) => {
      if (!timestamp) return 0;
      const parts = timestamp.split(':');
      if (parts.length === 3) {
        return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
      }
      if (parts.length === 2) {
        return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
      }
      return parseFloat(parts[0]);
    };

    fetch(spriteVtt)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const sprites: SpriteCue[] = [];
        const lines = text.split('\n');
        let currentStart = 0;
        let currentEnd = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.includes('-->')) {
            const parts = line.split('-->');
            currentStart = parseVttTime(parts[0].trim());
            currentEnd = parseVttTime(parts[1].trim());
          } else if (line.includes('#xywh=')) {
            const [url, hash] = line.split('#xywh=');
            const coords = hash.split(',').map(Number);
            if (coords.length === 4) {
              sprites.push({
                start: currentStart,
                end: currentEnd,
                url,
                x: coords[0],
                y: coords[1],
                w: coords[2],
                h: coords[3],
              });
            }
          }
        }
        setVttSprites(sprites);

        // Preload unique images for instant hover
        const uniqueUrls = new Set(sprites.map((s) => s.url));
        uniqueUrls.forEach((url) => {
          const img = new Image();
          img.src = url;
        });
      })
      .catch(() => {});
  }, [spriteVtt]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!barRef.current || !duration) return;
      const rect = barRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const time = Math.max(0, Math.min(duration, percent * duration));
      setHoverTime(time);
      setHoverPosition(e.clientX - rect.left);
    },
    [duration],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverTime(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!barRef.current || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const time = Math.max(0, Math.min(duration, percent * duration));
      onSeek(time);
    },
    [duration, onSeek],
  );

  const handleDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.buttons !== 1) return;
      handleClick(e);
    },
    [handleClick],
  );

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

  // Calculate sprite data for the given time
  const getSpriteStyle = useMemo((): SpriteData | null => {
    if (hoverTime === null) return null;

    // VTT based sprites - use original coords, scale via container
    if (vttSprites.length > 0) {
      const cue = vttSprites.find((s) => hoverTime >= s.start && hoverTime < s.end);
      if (cue) {
        // Return original dimensions - scaling handled by container
        return {
          url: cue.url,
          x: cue.x,
          y: cue.y,
          w: cue.w,
          h: cue.h,
        };
      }
    }

    if (!spriteSheet) return null;

    const { imageUrl, width, height, columns, rows, interval } = spriteSheet;
    const totalThumbnails = columns * rows;
    const thumbnailIndex = Math.min(Math.floor(hoverTime / interval), totalThumbnails - 1);

    const col = thumbnailIndex % columns;
    const row = Math.floor(thumbnailIndex / columns);

    return {
      url: imageUrl,
      x: col * width,
      y: row * height,
      w: width,
      h: height,
      totalW: columns * width,
      totalH: rows * height,
    };
  }, [spriteSheet, hoverTime, vttSprites]);

  return (
    <div className="relative group py-2 lg:py-3 2xl:py-4">
      {/* Time preview tooltip - only show when hovering */}
      {hoverTime !== null && (
        <div
          className="absolute bottom-full mb-4 lg:mb-6 2xl:mb-8 transform -translate-x-1/2 flex flex-col items-center pointer-events-none z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ left: Math.max(100 * previewScale, Math.min(hoverPosition, barRef.current ? barRef.current.offsetWidth - 100 * previewScale : hoverPosition)) }}
        >
          <div className="relative bg-zinc-900/95 backdrop-blur-xl p-1.5 lg:p-2 2xl:p-2.5 rounded-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.6)] ring-1 ring-white/5">
            {/* Sprite thumbnail preview container */}
            <div 
              className="relative overflow-hidden rounded-lg bg-black"
              style={{
                width: getSpriteStyle ? `${getSpriteStyle.w * previewScale}px` : `${160 * previewScale}px`,
                height: getSpriteStyle ? `${getSpriteStyle.h * previewScale}px` : `${90 * previewScale}px`,
              }}
            >
              {/* Sprite thumbnail preview */}
              {getSpriteStyle ? (
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
              ) : (
                // Placeholder when no sprite sheet
                <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                  <div className="text-xs lg:text-sm 2xl:text-base text-white/30">Preview</div>
                </div>
              )}
            </div>
            {/* Time display pill */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 lg:px-3 2xl:px-4 py-1 lg:py-1.5 2xl:py-2 bg-black/80 backdrop-blur-md rounded-md border border-white/10 text-[11px] lg:text-xs 2xl:text-sm font-medium text-white/90 shadow-sm tabular-nums tracking-wide">
              {formatTime(hoverTime)}
            </div>
          </div>
          {/* Tooltip Arrow */}
          <div className="w-0 h-0 border-l-[8px] lg:border-l-[10px] 2xl:border-l-[12px] border-l-transparent border-r-[8px] lg:border-r-[10px] 2xl:border-r-[12px] border-r-transparent border-t-[8px] lg:border-t-[10px] 2xl:border-t-[12px] border-t-zinc-900/95 -mt-[1px] drop-shadow-sm" />
        </div>
      )}

      {/* Seek bar */}
      <div
        ref={barRef}
        className="relative h-1.5 lg:h-2 2xl:h-3 bg-white/20 rounded-full cursor-pointer group-hover:h-2.5 lg:group-hover:h-3 2xl:group-hover:h-4 transition-all duration-200"
        onClick={handleClick}
        onMouseMove={(e) => {
          handleMouseMove(e);
          handleDrag(e);
        }}
        onMouseLeave={handleMouseLeave}
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        aria-label="Seek time"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            onSeek(Math.min(duration, currentTime + 10));
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            onSeek(Math.max(0, currentTime - 10));
          }
        }}
      >
        {/* Buffered */}
        <div
          className="absolute h-full bg-white/30 rounded-full transition-all duration-150"
          style={{ width: `${bufferedProgress}%` }}
        />

        {/* Progress */}
        <div
          className="absolute h-full bg-red-600 rounded-full transition-all duration-75"
          style={{ width: `${progress}%` }}
        />

        {/* Hover indicator */}
        {hoverTime !== null && (
          <div
            className="absolute h-full bg-white/20 rounded-full"
            style={{ width: `${(hoverTime / duration) * 100}%` }}
          />
        )}

        {/* Scrubber */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 lg:w-5 2xl:w-6 h-4 lg:h-5 2xl:h-6 bg-red-600 rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform duration-200 hover:scale-125"
          style={{ left: `calc(${progress}% - 8px)` }}
        />
      </div>
    </div>
  );
}
