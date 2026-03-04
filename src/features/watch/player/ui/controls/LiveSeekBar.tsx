'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayerContext } from '../../context/PlayerContext';

/**
 * YouTube-style DVR seek bar for live streams.
 *
 * - The bar represents the DVR buffer window (`video.seekable`).
 * - Right edge = live edge (100%). Left edge = oldest seekable start.
 * - Red progress fills from left up to current position.
 * - Pulsing red dot at the right edge indicates "LIVE".
 * - Hover shows how far behind live the cursor would land (e.g. "-45s").
 * - Clicking seeks within the DVR window; live edge is clamped.
 */
export function LiveSeekBar() {
  const { videoRef, state, playerHandlers, readOnly } = usePlayerContext();
  const barRef = useRef<HTMLDivElement>(null);

  /** Absolute time (s) of the DVR window start and live edge */
  const [dvr, setDvr] = useState({ start: 0, end: 0 });
  /** Cursor hover fraction (0–1) within the bar — null when not hovering */
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);

  // Track DVR range from video.seekable (updated every timeupdate/progress)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const update = () => {
      // Prefer seekable (more accurate for HLS DVR) over buffered
      const src = video.seekable.length > 0 ? video.seekable : video.buffered;
      if (src.length > 0) {
        setDvr({
          start: src.start(0),
          end: src.end(src.length - 1),
        });
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
  const progress = Math.min(
    100,
    Math.max(0, ((currentTime - dvr.start) / dvrDuration) * 100),
  );

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

  const getFractionFromEvent = useCallback((e: React.MouseEvent) => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly) return;
      const t = getTimeFromFraction(getFractionFromEvent(e));
      playerHandlers.seek(t);
    },
    [readOnly, getTimeFromFraction, getFractionFromEvent, playerHandlers],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      setHoverFraction(getFractionFromEvent(e));
    },
    [getFractionFromEvent],
  );

  if (dvr.end === 0) return null; // Not loaded yet

  const isAtLiveEdge = dvr.end - currentTime <= 15;

  return (
    <div className="px-4 md:px-6 lg:px-8 2xl:px-10 pointer-events-auto">
      <div className="relative group py-2 lg:py-3 cursor-pointer select-none">
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
          className="relative h-1.5 lg:h-2 2xl:h-3 bg-white/20 rounded-full transition-[height] duration-200 group-hover:h-2.5 lg:group-hover:h-3 2xl:group-hover:h-4"
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverFraction(null)}
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
            const step = dvrDuration * 0.05; // 5% of DVR window per arrow
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

          {/* Scrubber knob */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 lg:w-5 2xl:w-6 h-4 lg:h-5 2xl:h-6 rounded-full bg-red-600 shadow-lg scale-0 group-hover:scale-100 transition-transform duration-200 hover:scale-125 pointer-events-none"
            style={{ left: `calc(${progress}% - 8px)` }}
          />

          {/* LIVE edge dot — always at 100% right */}
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
