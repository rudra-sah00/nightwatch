'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayerContext } from '../../context/PlayerContext';

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
export function LiveSeekBar() {
  const { videoRef, state, playerHandlers, readOnly } = usePlayerContext();
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

  // Track DVR range + buffered from video.seekable / video.buffered
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const update = () => {
      // Prefer seekable (more accurate for HLS DVR) over buffered
      const seekSrc =
        video.seekable.length > 0 ? video.seekable : video.buffered;
      if (seekSrc.length > 0) {
        const start = seekSrc.start(0);
        const end = seekSrc.end(seekSrc.length - 1);
        setDvr({ start, end });

        // Buffered fraction relative to the DVR window
        if (video.buffered.length > 0) {
          const bEnd = video.buffered.end(video.buffered.length - 1);
          const dur = Math.max(end - start, 1);
          setBufferedFraction(Math.min(1, Math.max(0, (bEnd - start) / dur)));
        }
      }
    };

    video.addEventListener('timeupdate', update);
    video.addEventListener('progress', update);
    update();
    return () => {
      video.removeEventListener('timeupdate', update);
      video.removeEventListener('progress', update);
    };
  }, [videoRef]);

  const dvrDuration = Math.max(dvr.end - dvr.start, 1);
  const currentTime = state.currentTime;

  /** 0–100: how far through the DVR window the current position is */
  const displayFraction =
    dragFraction !== null
      ? dragFraction
      : Math.min(1, Math.max(0, (currentTime - dvr.start) / dvrDuration));
  const progress = displayFraction * 100;

  /** Seconds behind the live edge at the hover position */
  const hoverBehind =
    hoverFraction !== null
      ? Math.max(0, dvr.end - (dvr.start + hoverFraction * dvrDuration))
      : null;

  const formatBehind = (s: number) => {
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
  };

  const getTimeFromFraction = useCallback(
    (fraction: number) =>
      dvr.start + Math.min(1, Math.max(0, fraction)) * dvrDuration,
    [dvr.start, dvrDuration],
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

      window.addEventListener('mousemove', onMove);
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

  const isAtLiveEdge = dvr.end - currentTime <= 15;

  return (
    <div className="px-4 md:px-6 lg:px-8 2xl:px-10 pointer-events-auto">
      <div
        className={`relative group py-2 lg:py-3 select-none ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
      >
        {/* Hover time tooltip */}
        {hoverFraction !== null && hoverBehind !== null ? (
          <div
            className="absolute bottom-full mb-3 -translate-x-1/2 pointer-events-none z-50"
            style={{
              left: `${Math.min(95, Math.max(5, hoverFraction * 100))}%`,
            }}
          >
            <div className="px-2.5 py-1 bg-zinc-900/95 backdrop-blur-xl rounded-lg border border-white/10 text-[11px] lg:text-xs font-medium text-white/90 whitespace-nowrap shadow-lg">
              {formatBehind(hoverBehind)}
            </div>
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-zinc-900/95 mx-auto -mt-px" />
          </div>
        ) : null}

        {/* Track */}
        <div
          ref={barRef}
          className={`relative h-1.5 lg:h-2 2xl:h-3 bg-white/20 rounded-full transition-[height] duration-200 group-hover:h-2.5 lg:group-hover:h-3 2xl:group-hover:h-4 ${isDragging ? 'h-2.5 lg:h-3 2xl:h-4' : ''}`}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            if (!isDragging) setHoverFraction(null);
          }}
          onTouchStart={handleTouchStart}
          role="slider"
          tabIndex={readOnly ? -1 : 0}
          aria-label="Live stream seek bar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-valuetext={
            isAtLiveEdge
              ? 'At live edge'
              : `${Math.round(dvr.end - currentTime)}s behind live`
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
            className="absolute h-full bg-white/30 rounded-full transition-[width] duration-150"
            style={{ width: `${bufferedFraction * 100}%` }}
          />

          {/* Hover ghost position */}
          {hoverFraction !== null ? (
            <div
              className="absolute h-full bg-white/15 rounded-full"
              style={{ width: `${hoverFraction * 100}%` }}
            />
          ) : null}

          {/* DVR progress fill */}
          <div
            className="absolute h-full bg-red-600 rounded-full transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />

          {/* Scrubber knob — always visible while dragging */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 lg:w-5 2xl:w-6 h-4 lg:h-5 2xl:h-6 rounded-full bg-red-600 shadow-lg transition-transform duration-200 pointer-events-none ${isDragging ? 'scale-125' : 'scale-0 group-hover:scale-100 hover:scale-125'}`}
            style={{ left: `calc(${progress}% - 8px)` }}
          />

          {/* LIVE edge dot — always at 100 % right */}
          <div
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 rounded-full pointer-events-none z-10 ${isAtLiveEdge ? 'bg-red-500 animate-pulse' : 'bg-red-500/40'}`}
          />
        </div>

        {/* LIVE label pinned to the right edge */}
        <div className="absolute right-0 top-full mt-1 text-[10px] font-bold text-red-500/70 tabular-nums pointer-events-none">
          LIVE
        </div>
      </div>
    </div>
  );
}
