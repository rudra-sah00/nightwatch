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
  const barRef = useRef<HTMLDivElement>(null);

  // VTT Logic
  const [vttSprites, setVttSprites] = useState<SpriteCue[]>([]);

  useEffect(() => {
    if (!spriteVtt) return;

    const parseVttTime = (timestamp: string) => {
      if (!timestamp) return 0;
      const parts = timestamp.split(':');
      if (parts.length === 3) {
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
      }
      if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
      }
      return parseFloat(parts[0]);
    };

    fetch(spriteVtt)
      .then((res) => {
        if (!res.ok) throw new Error('Status ' + res.status);
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

  // Calculate sprite background position for the given time
  const getSpriteStyle = useMemo(() => {
    if (hoverTime === null) return null;

    // VTT based sprites
    if (vttSprites.length > 0) {
      const cue = vttSprites.find((s) => hoverTime >= s.start && hoverTime < s.end);
      if (cue) {
        return {
          backgroundImage: `url(${cue.url})`,
          backgroundPosition: `-${cue.x}px -${cue.y}px`,
          width: `${cue.w}px`,
          height: `${cue.h}px`,
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
      backgroundImage: `url(${imageUrl})`,
      backgroundPosition: `-${col * width}px -${row * height}px`,
      backgroundSize: `${columns * width}px ${rows * height}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  }, [spriteSheet, hoverTime, vttSprites]);

  return (
    <div className="relative group py-2">
      {/* Time preview tooltip */}
      {hoverTime !== null && (
        <div
          className="absolute bottom-full mb-4 transform -translate-x-1/2 flex flex-col items-center pointer-events-none z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ left: hoverPosition }}
        >
          <div className="relative bg-zinc-900/90 backdrop-blur-xl p-1.5 rounded-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.6)] ring-1 ring-white/5">
            <div className="relative overflow-hidden rounded-lg bg-black/50 aspect-video min-w-[170px] min-h-[96px]">
              {/* Sprite thumbnail preview */}
              {(spriteSheet || vttSprites.length > 0) && getSpriteStyle ? (
                <div className="bg-black" style={getSpriteStyle} />
              ) : (
                // Placeholder when no sprite sheet
                <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                  <div className="text-xs text-white/30">Preview</div>
                </div>
              )}
            </div>
            {/* Time display pill */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-md border border-white/10 text-[11px] font-medium text-white/90 shadow-sm tabular-nums tracking-wide">
              {formatTime(hoverTime)}
            </div>
          </div>
          {/* Tooltip Arrow */}
          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-zinc-900/90 -mt-[1px] drop-shadow-sm" />
        </div>
      )}

      {/* Seek bar */}
      <div
        ref={barRef}
        className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group-hover:h-2.5 transition-all duration-200"
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
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform duration-200 hover:scale-125"
          style={{ left: `calc(${progress}% - 8px)` }}
        />
      </div>
    </div>
  );
}
