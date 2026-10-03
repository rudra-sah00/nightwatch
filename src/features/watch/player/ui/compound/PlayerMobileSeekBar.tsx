'use client';

import { useTranslations } from 'next-intl';
import type React from 'react';
import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { usePlayerContext } from '../../context/PlayerContext';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';
import { formatTime } from '../../utils/format-time';
import { useSeekBar } from '../controls/hooks/use-seek-bar';

/** Width of the drag preview bubble, used to keep it inside the player. */
const BUBBLE_HALF_WIDTH = 88;

/**
 * YouTube-style touch bottom bar: `current / duration` on the left, `children`
 * (typically the fullscreen button) on the right, and a draggable seekbar under them.
 *
 * Interactive in **both** orientations. It used to be a 3px display-only line in
 * portrait, on the belief that YouTube's portrait bar is not seekable — it is: YouTube
 * shows a red thumb on the bar whenever controls are visible, and it can be tapped or
 * dragged. Ours left portrait users with no way to scrub at all, and no time readout.
 *
 * Behaviour:
 * - Touch target is taller than the visible bar (28px portrait / 44px landscape) so it
 *   can be hit with a thumb; the visible bar thickens and the thumb grows while dragging.
 * - Dragging shows a bubble above the finger with the sprite thumbnail (when the title
 *   has one) and the target time; the left-hand time readout follows the finger too.
 * - Controls auto-hide is suspended for the duration of the drag.
 * - One seek per gesture via {@link useSeekBar} → `useDragSeek` (see PLAYER_AUDIT H8).
 *
 * Read-only players (watch-party guests) and streams without a finite duration
 * (livestreams) render the bar as display-only.
 */
export function PlayerMobileSeekBar({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { state, playerHandlers, readOnly, spriteSheet, spriteVtt, metadata } =
    usePlayerContext();
  const isPortrait = useMobileOrientation();
  const t = useTranslations('watch.player');

  const hasFiniteDuration =
    Number.isFinite(state.duration) && state.duration > 0;
  const seekDisabled = readOnly || !hasFiniteDuration;
  const showTime = metadata.type !== 'livestream' && hasFiniteDuration;

  const {
    progress,
    bufferedProgress,
    hoverTime,
    previewFraction,
    isDragging,
    barRef,
    getSpriteStyle,
    pointerHandlers,
  } = useSeekBar({
    currentTime: state.currentTime,
    duration: hasFiniteDuration ? state.duration : 0,
    buffered: state.buffered,
    onSeek: playerHandlers.seek,
    spriteVtt,
    spriteSheet,
    disabled: seekDisabled,
    allowPreview: !seekDisabled,
  });

  // Keep the controls on screen while the finger is on the bar; otherwise the 3s
  // auto-hide fades the bar out from under a slow scrub.
  const interactingRef = useRef(false);
  const endInteraction = useCallback(() => {
    if (!interactingRef.current) return;
    interactingRef.current = false;
    playerHandlers.handleInteraction(false);
  }, [playerHandlers]);

  const handlers = {
    ...pointerHandlers,
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!seekDisabled && !interactingRef.current) {
        interactingRef.current = true;
        playerHandlers.handleInteraction(true);
      }
      pointerHandlers.onPointerDown(e);
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      pointerHandlers.onPointerUp(e);
      endInteraction();
    },
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => {
      pointerHandlers.onPointerCancel(e);
      endInteraction();
    },
  };

  const displayTime =
    isDragging && hoverTime !== null ? hoverTime : state.currentTime;

  // Bubble x-position in px, clamped so it never spills off either edge.
  const barWidth = barRef.current?.offsetWidth ?? 0;
  const bubbleLeft =
    previewFraction === null
      ? 0
      : Math.max(
          BUBBLE_HALF_WIDTH,
          Math.min(previewFraction * barWidth, barWidth - BUBBLE_HALF_WIDTH),
        );

  return (
    <div
      className={cn(
        'relative w-full pointer-events-auto',
        // Clear the home indicator / rounded corners in fullscreen landscape.
        'landscape:pb-[env(safe-area-inset-bottom)] landscape:px-[max(0px,env(safe-area-inset-left))]',
      )}
    >
      {/* Time readout + trailing controls */}
      <div className="flex items-center gap-2 px-3 landscape:px-5">
        {showTime ? (
          <div
            className="text-white text-xs font-bold tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] select-none"
            aria-live="off"
          >
            <span>{formatTime(displayTime)}</span>
            <span className="text-white/60">
              {' '}
              / {formatTime(state.duration)}
            </span>
          </div>
        ) : null}
        <div className="flex-1" />
        {children}
      </div>

      {/* Drag preview bubble: thumbnail (if available) + target time */}
      {isDragging && hoverTime !== null ? (
        <div
          className="absolute bottom-full mb-2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none z-50"
          style={{ left: bubbleLeft }}
        >
          {getSpriteStyle ? (
            <div
              className="relative overflow-hidden bg-black border-2 border-white rounded-md"
              style={{ width: getSpriteStyle.w, height: getSpriteStyle.h }}
            >
              <div
                className="absolute bg-no-repeat"
                style={{
                  backgroundImage: `url(${getSpriteStyle.url})`,
                  backgroundPosition: `-${getSpriteStyle.x}px -${getSpriteStyle.y}px`,
                  backgroundSize: getSpriteStyle.totalW
                    ? `${getSpriteStyle.totalW}px ${getSpriteStyle.totalH}px`
                    : 'auto',
                  width: getSpriteStyle.w,
                  height: getSpriteStyle.h,
                }}
              />
            </div>
          ) : null}
          <div className="px-2 py-0.5 rounded bg-black/80 text-white text-sm font-bold tabular-nums">
            {formatTime(hoverTime)}
          </div>
        </div>
      ) : null}

      {/* Touch target; the visible bar is centred inside it. Horizontal inset lives on
          this wrapper, not the target, so the target's edges are the bar's edges and the
          thumb lands exactly under the finger. */}
      <div className="px-3 landscape:px-5">
        <div
          ref={barRef}
          role="slider"
          tabIndex={seekDisabled ? -1 : 0}
          data-seekbar
          aria-label={t('seekTime')}
          aria-valuemin={0}
          aria-valuemax={hasFiniteDuration ? state.duration : 0}
          aria-valuenow={state.currentTime}
          aria-valuetext={`${formatTime(state.currentTime)} of ${formatTime(state.duration)}`}
          aria-disabled={seekDisabled}
          className={cn(
            'relative w-full flex items-center select-none',
            // Thumb-sized hit area, more generous in landscape where the bar is longer.
            isPortrait ? 'h-7' : 'h-11',
          )}
          // touch-action: none lets pointer events report a horizontal drag instead of
          // the browser claiming it for scrolling.
          style={{ touchAction: 'none' }}
          {...handlers}
          onKeyDown={(e) => {
            if (seekDisabled) return;
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              playerHandlers.seek(
                Math.min(state.duration, state.currentTime + 10),
              );
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              playerHandlers.seek(Math.max(0, state.currentTime - 10));
            }
          }}
        >
          <div
            className={cn(
              'relative w-full rounded-full bg-white/30 transition-[height] duration-150',
              isDragging ? 'h-[5px]' : 'h-[3px]',
            )}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/50"
              style={{ width: `${bufferedProgress}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-red-600"
              style={{ width: `${progress}%` }}
            />
            {/* Thumb — the visual cue that the bar can be grabbed */}
            {!seekDisabled ? (
              <div
                className={cn(
                  'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600 shadow transition-[width,height] duration-150',
                  isDragging ? 'w-4 h-4' : 'w-3 h-3',
                )}
                style={{ left: `${progress}%` }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Thin progress line shown along the bottom edge of the inline touch player while
 * the controls are hidden, so playback position is always glanceable (YouTube does
 * the same). Render it **outside** `Player.Controls`, whose opacity would hide it.
 */
export function PlayerMobileProgressLine() {
  const { state } = usePlayerContext();
  const visible =
    !state.showControls && !state.isLoading && !state.isFullscreen;
  if (!visible || !Number.isFinite(state.duration) || state.duration <= 0)
    return null;
  const progress = (state.currentTime / state.duration) * 100;
  return (
    <div className="hidden touch-ui:block absolute inset-x-0 bottom-0 z-20 h-[2px] bg-white/20 pointer-events-none">
      <div className="h-full bg-red-600" style={{ width: `${progress}%` }} />
    </div>
  );
}
