import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchSpriteVtt, type SpriteCue } from '../../../../api';

interface SpriteSheet {
  imageUrl: string;
  width: number;
  height: number;
  columns: number;
  rows: number;
  interval: number;
}

interface SpriteData {
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
  totalW?: number;
  totalH?: number;
}

const PREVIEW_SCALES = {
  base: 1,
  lg: 1.3,
  xl: 1.5,
  '2xl': 1.8,
  '3xl': 2.2,
};

interface UseSeekBarOptions {
  currentTime: number;
  duration: number;
  buffered: number;
  onSeek: (time: number) => void;
  spriteVtt?: string;
  spriteSheet?: SpriteSheet;
  disabled?: boolean;
  allowPreview?: boolean;
}

export function useSeekBar({
  currentTime,
  duration,
  buffered,
  onSeek,
  spriteVtt,
  spriteSheet,
  disabled = false,
  allowPreview = false,
}: UseSeekBarOptions) {
  const canPreview = (!disabled || allowPreview) && allowPreview;
  const progress = duration ? (currentTime / duration) * 100 : 0;
  const bufferedProgress = duration ? (buffered / duration) * 100 : 0;

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [previewScale, setPreviewScale] = useState(() => {
    if (typeof window === 'undefined') return PREVIEW_SCALES.base;
    const width = window.innerWidth;
    if (width >= 3440) return PREVIEW_SCALES['3xl'];
    if (width >= 2560) return PREVIEW_SCALES['2xl'];
    if (width >= 1920) return PREVIEW_SCALES.xl;
    if (width >= 1280) return PREVIEW_SCALES.lg;
    return PREVIEW_SCALES.base;
  });
  const barRef = useRef<HTMLDivElement>(null);
  const [vttSprites, setVttSprites] = useState<SpriteCue[]>([]);

  useEffect(() => {
    const updateScale = () => {
      const width = window.innerWidth;
      if (width >= 3440) setPreviewScale(PREVIEW_SCALES['3xl']);
      else if (width >= 2560) setPreviewScale(PREVIEW_SCALES['2xl']);
      else if (width >= 1920) setPreviewScale(PREVIEW_SCALES.xl);
      else if (width >= 1280) setPreviewScale(PREVIEW_SCALES.lg);
      else setPreviewScale(PREVIEW_SCALES.base);
    };
    window.addEventListener('resize', updateScale, { passive: true });
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    if (!spriteVtt) return;
    let cancelled = false;
    fetchSpriteVtt(spriteVtt)
      .then((sprites) => {
        if (!cancelled) setVttSprites(sprites);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [spriteVtt]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canPreview || !barRef.current || !duration) return;
      const rect = barRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const time = Math.max(0, Math.min(duration, percent * duration));
      setHoverTime(time);
      setHoverPosition(e.clientX - rect.left);
    },
    [duration, canPreview],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverTime(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !barRef.current || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const time = Math.max(0, Math.min(duration, percent * duration));
      onSeek(time);
    },
    [duration, onSeek, disabled],
  );

  const handleDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || e.buttons !== 1) return;
      handleClick(e);
    },
    [handleClick, disabled],
  );

  const getSpriteStyle = useMemo((): SpriteData | null => {
    if (hoverTime === null) return null;

    if (vttSprites.length > 0) {
      const cue = vttSprites.find(
        (s) => hoverTime >= s.start && hoverTime < s.end,
      );
      if (cue) {
        return { url: cue.url, x: cue.x, y: cue.y, w: cue.w, h: cue.h };
      }
    }

    if (!spriteSheet) return null;

    const { imageUrl, width, height, columns, rows, interval } = spriteSheet;
    const totalThumbnails = columns * rows;
    const thumbnailIndex = Math.min(
      Math.floor(hoverTime / interval),
      totalThumbnails - 1,
    );
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

  return {
    canPreview,
    progress,
    bufferedProgress,
    hoverTime,
    hoverPosition,
    previewScale,
    barRef,
    vttSprites,
    getSpriteStyle,
    handleMouseMove,
    handleMouseLeave,
    handleClick,
    handleDrag,
  };
}
