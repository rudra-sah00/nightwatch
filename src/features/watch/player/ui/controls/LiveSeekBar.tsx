'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePlayerContext } from '../../context/PlayerContext';

// Pure formatter — hoisted to module level (rule 6.3, no hook deps)
function formatBehind(s: number): string {
  if (s < 5) return 'LIVE';
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `-${h}:${String(m).padStart(2, '0')}h`;
  }
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `-${m}:${String(sec).padStart(2, '0')}`;
  }
  return `-${Math.floor(s)}s`;
}

/**
 * YouTube-style DVR seek bar for live streams.
 *
 * - The bar represents the DVR buffer window (`video.seekable`).
 * - Right edge = live edge (100 %). Left edge = oldest seekable start.
 * - Red progress fills from left up to current position.
 * - Light gray region shows the buffered range within the DVR window.
 * - Pulsing red dot at the right edge indicates "LIVE".
 * - Hover shows how far behind live the cursor would land (e.g. "-45 s").
 * - Click **or drag** to seek within the DVR window (touch supported).
 */
export function LiveSeekBar({ compact = false }: { compact?: boolean }) {
  const { videoRef, playerHandlers, readOnly } = usePlayerContext();
  const t = useTranslations('watch.player');
  const barRef = useRef<HTMLDivElement>(null);

  /** Absolute time (s) of the DVR window start and live edge */
  const [dvr, setDvr] = useState({ start: 0, end: 0 });
  /** Buffered range as fraction of the DVR window (0–1) */
  const [bufferedFraction, setBufferedFraction] = useState(0);
  /** Cursor hover fraction (0–1) within the bar — null when not hovering */
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);
  /** Whether the user is currently dragging the scrubber */
  const [isDragging, setIsDragging] = useState(false);
  /** Fraction the user has dragged to — used for visual feedback during drag */
  const [dragFraction, setDragFraction] = useState<number | null>(null);
  /** Whether the video was playing before the drag started (to resume after) */
  const wasPlayingRef = useRef(false);

  /**
   * Local currentTime tracked from the same timeupdate handler that updates
   * dvr — ensures they're always in sync and avoids the initial flash where
   * a `progress` event updates dvr before the first `timeupdate` fires,
   * causing the bar to briefly snap to 0 % (left edge).
   */
  const [localCurrentTime, setLocalCurrentTime] = useState(0);

  // rAF-based polling at 60 fps — eliminates choppy 4-fps timeupdate steps
  // and ensures dvr/currentTime/buffered are always read atomically in the
  // same frame so bars never drift apart.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rafId: number;

    const tick = () => {
      const seekSrc =
        video.seekable.length > 0 ? video.seekable : video.buffered;
      if (seekSrc.length > 0) {
        const start = seekSrc.start(0);
        const end = seekSrc.end(seekSrc.length - 1);
        // Skip setState if nothing changed to avoid unnecessary re-renders
        setDvr((prev) =>
          prev.start === start && prev.end === end ? prev : { start, end },
        );

        if (video.buffered.length > 0) {
          const bEnd = video.buffered.end(video.buffered.length - 1);
          const dur = Math.max(end - start, 1);
          setBufferedFraction(Math.min(1, Math.max(0, (bEnd - start) / dur)));
        }
      }
      setLocalCurrentTime(video.currentTime);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [videoRef]);

  const dvrDuration = Math.max(dvr.end - dvr.start, 1);
  const currentTime = localCurrentTime;

  /**
   * Are we within 45 s of the live edge?  Computed first so the progress
   * bar can be pinned to 100 % when the viewer is "at live".  Without this
   * pin, every time a new HLS segment lands `dvr.end` jumps forward by the
   * segment duration (typically 6-10 s). If the threshold is too small the
   * viewer briefly appears behind live and the red bar snaps backward,
   * showing a gray gap.  45 s covers segments up to ~10 s with up to 4 in
   * the manifest before HLS.js designates them as "near live".
   */
  const isAtLiveEdge = dvr.end - currentTime <= 45;

  /** 0–100: how far through the DVR window the current position is */
  const displayFraction =
    dragFraction !== null
      ? dragFraction
      : isAtLiveEdge
        ? 1 // pin to right edge — no jitter
        : Math.min(1, Math.max(0, (currentTime - dvr.start) / dvrDuration));
  const progress = displayFraction * 100;

  /** Seconds behind the live edge at the hover position */
  const hoverBehind =
    hoverFraction !== null
      ? Math.max(0, dvr.end - (dvr.start + hoverFraction * dvrDuration))
      : null;

  // Read seekable directly from the video element (always fresh, no stale state).
  // Using stale dvr.start could seek to a position that has already slid out of
  // the DVR window, causing HLS to snap the bar to an unexpected location.
  const getTimeFromFraction = useCallback(
    (fraction: number) => {
      const video = videoRef.current;
      const seekSrc =
        video && video.seekable.length > 0 ? video.seekable : null;
      const start = seekSrc ? seekSrc.start(0) : dvr.start;
      const end = seekSrc ? seekSrc.end(seekSrc.length - 1) : dvr.end;
      const dur = Math.max(end - start, 1);
      return start + Math.min(1, Math.max(0, fraction)) * dur;
    },
    [videoRef, dvr.start, dvr.end],
  );

  const getFractionFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!barRef.current) return 0;
      const rect = barRef.current.getBoundingClientRect();
      return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    },
    [],
  );

  const getFractionFromTouch = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
      if (!barRef.current || !e.touches.length) return 0;
      const rect = barRef.current.getBoundingClientRect();
      return Math.min(
        1,
        Math.max(0, (e.touches[0].clientX - rect.left) / rect.width),
      );
    },
    [],
  );

  // ── Click to seek ──────────────────────────────────────────────
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly || isDragging) return;
      const t = getTimeFromFraction(getFractionFromEvent(e));
      playerHandlers.seek(t);
    },
    [
      readOnly,
      isDragging,
      getTimeFromFraction,
      getFractionFromEvent,
      playerHandlers,
    ],
  );

  // ── Hover ──────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      setHoverFraction(getFractionFromEvent(e));
    },
    [getFractionFromEvent],
  );

  // ── Drag (mouse) ──────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly || e.button !== 0) return;
      e.preventDefault();
      const video = videoRef.current;
      wasPlayingRef.current = !!video && !video.paused;
      if (video && !video.paused) video.pause();
      setIsDragging(true);
      const frac = getFractionFromEvent(e);
      setDragFraction(frac);
      setHoverFraction(frac);

      const onMove = (me: MouseEvent) => {
        const f = getFractionFromEvent(me);
        setDragFraction(f);
        setHoverFraction(f);
      };

      const onUp = (me: MouseEvent) => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        const f = getFractionFromEvent(me);
        const t = getTimeFromFraction(f);
        playerHandlers.seek(t);
        setIsDragging(false);
        setDragFraction(null);
        if (wasPlayingRef.current) videoRef.current?.play().catch(() => {});
      };

      window.addEventListener('mousemove', onMove, { passive: true });
      window.addEventListener('mouseup', onUp);
    },
    [
      readOnly,
      videoRef,
      getFractionFromEvent,
      getTimeFromFraction,
      playerHandlers,
    ],
  );

  // ── Drag (touch) ──────────────────────────────────────────────
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (readOnly) return;
      const video = videoRef.current;
      wasPlayingRef.current = !!video && !video.paused;
      if (video && !video.paused) video.pause();
      setIsDragging(true);
      const frac = getFractionFromTouch(e);
      setDragFraction(frac);
      setHoverFraction(frac);

      const onMove = (te: TouchEvent) => {
        te.preventDefault(); // prevent scroll while scrubbing
        const f = getFractionFromTouch(te);
        setDragFraction(f);
        setHoverFraction(f);
      };

      const onEnd = (te: TouchEvent) => {
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onEnd);
        window.removeEventListener('touchcancel', onEnd);
        // Use the last drag fraction for the final seek
        const lastTouch = te.changedTouches[0];
        if (lastTouch && barRef.current) {
          const rect = barRef.current.getBoundingClientRect();
          const f = Math.min(
            1,
            Math.max(0, (lastTouch.clientX - rect.left) / rect.width),
          );
          playerHandlers.seek(getTimeFromFraction(f));
        }
        setIsDragging(false);
        setDragFraction(null);
        if (wasPlayingRef.current) videoRef.current?.play().catch(() => {});
      };

      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);
      window.addEventListener('touchcancel', onEnd);
    },
    [
      readOnly,
      videoRef,
      getFractionFromTouch,
      getTimeFromFraction,
      playerHandlers,
    ],
  );

  if (dvr.end === 0) return null; // Not loaded yet

  return (
    <div
      className={`${compact ? 'px-2.5 md:px-6 lg:px-8 2xl:px-10' : 'px-4 md:px-6 lg:px-8 2xl:px-10'} pointer-events-auto`}
    >
      <div
        className={cn(
          'relative group select-none',
          compact ? 'py-1.5 lg:py-2' : 'py-3 lg:py-4',
          readOnly ? 'cursor-default' : 'cursor-pointer',
        )}
      >
        {/* Hover time tooltip */}
        {hoverFraction !== null && hoverBehind !== null ? (
          <div
            className="absolute bottom-full mb-4 -translate-x-1/2 pointer-events-none z-50"
            style={{
              left: `${Math.min(95, Math.max(5, hoverFraction * 100))}%`,
            }}
          >
            <div className="px-3 py-1 bg-background border-[3px] border-border text-[11px] lg:text-xs font-black font-headline uppercase tracking-widest text-foreground whitespace-nowrap ">
              {formatBehind(hoverBehind)}
            </div>
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-primary mx-auto drop-shadow-sm" />
          </div>
        ) : null}

        {/* Track */}
        <div
          ref={barRef}
          className={cn(
            'relative bg-background border-[3px] border-border overflow-visible',
            compact ? 'h-2 lg:h-2.5' : 'h-2.5 lg:h-3 2xl:h-4',
            isDragging
              ? compact
                ? 'h-2.5 lg:h-3'
                : 'h-3.5 lg:h-4 2xl:h-5'
              : compact
                ? 'group-hover:h-2.5 lg:group-hover:h-3'
                : 'group-hover:h-3.5 lg:group-hover:h-4 2xl:group-hover:h-5',
          )}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            if (!isDragging) setHoverFraction(null);
          }}
          onTouchStart={handleTouchStart}
          role="slider"
          tabIndex={readOnly ? -1 : 0}
          aria-label={t('liveStreamSeekBar')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-valuetext={
            isAtLiveEdge
              ? t('atLiveEdge')
              : t('behindLive', { seconds: Math.round(dvr.end - currentTime) })
          }
          onKeyDown={(e) => {
            if (readOnly) return;
            const step = 10; // fixed 10 s steps like YouTube
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              playerHandlers.seek(Math.min(dvr.end, currentTime + step));
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              playerHandlers.seek(Math.max(dvr.start, currentTime - step));
            } else if (e.key === 'End') {
              e.preventDefault();
              playerHandlers.seek(dvr.end);
            }
          }}
        >
          {/* Buffered region within DVR window */}
          <div
            className="absolute h-full top-[-3px] bottom-[-3px] bg-background border-[3px] border-border"
            style={{ width: `${Math.max(0, bufferedFraction * 100 - 0.5)}%` }}
          />

          {/* Hover ghost position */}
          {hoverFraction !== null ? (
            <div
              className="absolute h-full top-[-3px] bottom-[-3px] bg-primary/10 border-r-[3px] border-border"
              style={{ width: `${Math.max(0, hoverFraction * 100 - 0.5)}%` }}
            />
          ) : null}

          {/* DVR progress fill — no CSS transition; rAF gives 60 fps smoothness */}
          <div
            className="absolute h-full top-[-3px] bottom-[-3px] bg-neo-red border-y-[3px] border-border border-l-[1.5px] border-r-[3px]"
            style={{ width: `${Math.max(0, progress - 0.5)}%` }}
          />

          {/* Scrubber knob — always visible while dragging */}
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 bg-background border-border shadow-none pointer-events-none rounded-none',
              compact
                ? 'w-3 h-3 lg:w-3.5 lg:h-3.5 border-[3px]'
                : 'w-4 lg:w-5 2xl:w-6 h-4 lg:h-5 2xl:h-6 border-[4px]',
              isDragging
                ? 'scale-125'
                : 'scale-0 group-hover:scale-100 hover:scale-125',
            )}
            style={{ left: `calc(${progress}% - 8px)` }}
          />

          {/* LIVE edge dot — always at 100 % right */}
          <div
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-[4px] ${compact ? 'w-2 h-2 border' : 'w-2.5 h-2.5 border-[2px]'} border-border pointer-events-none z-10 ${isAtLiveEdge ? 'bg-background animate-pulse' : 'bg-neo-red'}`}
          />
        </div>

        {/* LIVE label pinned to the right edge */}
        <div className="absolute right-0 top-full mt-2 font-black font-headline tracking-widest text-foreground text-[10px] uppercase pointer-events-none">
          {t('liveBadge')}
        </div>
      </div>
    </div>
  );
}
