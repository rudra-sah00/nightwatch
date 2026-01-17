'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { SpriteSheet } from '@/types/video';
import { formatTime } from '@/lib/utils/video-utils';

interface ThumbnailPreviewProps {
  time: number;
  duration: number;
  spriteSheets: SpriteSheet[];  // Array of sprite sheets for long movies
  position: number;
}

export function ThumbnailPreview({ time, duration, spriteSheets, position }: ThumbnailPreviewProps) {
  const [imageError, setImageError] = useState(false);
  // Track loaded URLs in state to safely access during render
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const loadingUrlsRef = useRef<Set<string>>(new Set());

  // Determine which sprite sheet and tile to use based on time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spriteInfo = useMemo(() => {
    if (!spriteSheets || spriteSheets.length === 0 || duration <= 0) return null;

    // Calculate cumulative tiles to find which sprite sheet contains this time
    let cumulativeTime = 0;

    for (let i = 0; i < spriteSheets.length; i++) {
      const sheet = spriteSheets[i];
      const sheetDuration = sheet.totalTiles * sheet.intervalSeconds;

      if (time < cumulativeTime + sheetDuration || i === spriteSheets.length - 1) {
        // This sprite sheet contains the requested time
        const timeInSheet = time - cumulativeTime;
        const tileIndex = Math.min(
          Math.max(0, Math.floor(timeInSheet / sheet.intervalSeconds)),
          sheet.totalTiles - 1
        );

        const row = Math.floor(tileIndex / sheet.tilesPerRow);
        const col = tileIndex % sheet.tilesPerRow;

        return {
          spriteSheet: sheet,
          tileIndex,
          sourceX: col * sheet.tileWidth,
          sourceY: row * sheet.tileHeight,
          tileWidth: sheet.tileWidth,
          tileHeight: sheet.tileHeight,
        };
      }

      cumulativeTime += sheetDuration;
    }

    return null;
  }, [time, duration, spriteSheets]);

  // Load sprite images
  useEffect(() => {
    if (!spriteSheets || spriteSheets.length === 0) return;

    spriteSheets.forEach(sheet => {
      const url = sheet.spriteUrl;

      // Skip if already loaded or currently loading
      if (loadedImagesRef.current.has(url) || loadingUrlsRef.current.has(url)) return;

      loadingUrlsRef.current.add(url);

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        loadedImagesRef.current.set(url, img);
        loadingUrlsRef.current.delete(url);

        // Update state to trigger re-render safely
        setLoadedUrls(prev => {
          const next = new Set(prev);
          next.add(url);
          return next;
        });
      };

      img.onerror = () => {
        loadingUrlsRef.current.delete(url);
        if (!imageError) setImageError(true);
      };

      img.src = url;
    });
  }, [spriteSheets, imageError]);

  // Draw thumbnail using canvas for better sprite handling
  useEffect(() => {
    if (!spriteInfo || !canvasRef.current) return;

    const img = loadedImagesRef.current.get(spriteInfo.spriteSheet.spriteUrl);
    if (!img) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const { sourceX: rawX, sourceY: rawY, tileWidth, tileHeight } = spriteInfo;

    // Clamp coordinates to valid bounds (VTT may have invalid coords beyond image size)
    const maxX = Math.max(0, img.naturalWidth - tileWidth);
    const maxY = Math.max(0, img.naturalHeight - tileHeight);
    const sourceX = Math.min(rawX, maxX);
    const sourceY = Math.min(rawY, maxY);

    // Set canvas size to match display size with aspect ratio
    const displayWidth = 200;
    const aspectRatio = tileHeight / tileWidth;
    const displayHeight = Math.round(displayWidth * aspectRatio);

    // Only resize canvas if dimensions changed
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear canvas with black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Draw the specific tile from sprite sheet
    try {
      if (imageError) return;

      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        tileWidth,
        tileHeight,
        0,
        0,
        displayWidth,
        displayHeight
      );
    } catch {
      if (!imageError) setImageError(true);
    }
  }, [spriteInfo, loadedUrls, imageError]);

  // Calculate safe position to keep preview within bounds
  const safePosition = useMemo(() => {
    const padding = 6; // percentage from edges
    return Math.max(padding, Math.min(100 - padding, position));
  }, [position]);

  // Check if current sprite image is loaded
  const currentImageLoaded = spriteInfo && loadedUrls.has(spriteInfo.spriteSheet.spriteUrl);

  // Time-only fallback when no sprite available or error
  if (!spriteInfo || imageError) {
    return (
      <div
        className="absolute bottom-full mb-4 transform -translate-x-1/2 z-50 pointer-events-none"
        style={{ left: `${safePosition}%` }}
      >
        <div className="bg-gradient-to-b from-zinc-900/98 to-black/98 rounded-xl overflow-hidden shadow-2xl border border-white/15 backdrop-blur-md">
          <div className="px-6 py-3 text-center">
            <span className="text-white text-base font-bold tracking-wider tabular-nums">
              {formatTime(time)}
            </span>
          </div>
        </div>
        {/* Triangle pointer */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-2">
          <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-zinc-900/98" />
        </div>
      </div>
    );
  }

  const displayWidth = 200;
  const aspectRatio = spriteInfo.tileHeight / spriteInfo.tileWidth;
  const displayHeight = Math.round(displayWidth * aspectRatio);

  return (
    <div
      className="absolute bottom-full mb-4 transform -translate-x-1/2 z-50 pointer-events-none"
      style={{ left: `${safePosition}%` }}
    >
      <div className="bg-gradient-to-b from-zinc-900/98 to-black/98 rounded-xl overflow-hidden shadow-2xl border border-white/15 backdrop-blur-md">
        {/* Thumbnail using Canvas */}
        <div
          className="relative overflow-hidden rounded-t-lg"
          style={{
            width: displayWidth,
            height: displayHeight,
          }}
        >
          {currentImageLoaded ? (
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover"
              style={{
                width: displayWidth,
                height: displayHeight,
              }}
            />
          ) : (
            <div
              className="w-full h-full bg-zinc-800/90 flex items-center justify-center"
              style={{ width: displayWidth, height: displayHeight }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="text-white/50 text-xs">Loading...</span>
              </div>
            </div>
          )}
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Time label */}
        <div className="px-4 py-2.5 text-center bg-black/60">
          <span className="text-white text-sm font-bold tracking-wider tabular-nums">
            {formatTime(time)}
          </span>
        </div>
      </div>
      {/* Triangle pointer */}
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-2">
        <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-black/98" />
      </div>
    </div>
  );
}
