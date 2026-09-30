'use client';

import { useCallback } from 'react';
import { usePlayerContext } from '../../context/PlayerContext';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';
import { useDragSeek } from '../controls/hooks/use-drag-seek';

/**
 * YouTube-style thin seekbar for mobile with dual behavior based on device orientation.
 *
 * **Portrait mode (non-interactive):** Renders a 3px progress-only bar at the bottom
 * of the player. Touch events are disabled (`pointer-events-none`) so the user cannot
 * seek — this matches YouTube's mobile portrait UX where the seekbar is purely visual.
 *
 * **Landscape mode (interactive):** Renders a taller touch target (40px) with the same
 * 3px visible bar at the bottom. Supports drag-to-seek, tap-to-seek, and keyboard
 * arrow-key seeking (±10s). The bar shows both buffered (white/40%) and played (red)
 * progress.
 *
 * The drag gesture is {@link useDragSeek}, shared with the desktop `SeekBar`: it previews
 * while moving and commits one seek on release. It previously seeked on every `touchmove`
 * — roughly 60 `currentTime` writes per second of drag, each emitting `seeking` and so
 * making hls.js abort the fragments in flight, which is what produced stutter, garbage
 * frames and decode errors while scrubbing.
 *
 * Read-only players (e.g. watch-party guests) disable all seek interactions regardless
 * of orientation.
 */
export function PlayerMobileSeekBar() {
  const { state, playerHandlers, readOnly } = usePlayerContext();
  const isPortrait = useMobileOrientation();

  // Portrait is display-only, so a drag must not seek even before the early return below.
  const seekDisabled = readOnly || isPortrait || !state.duration;

  const getTimeFromFraction = useCallback(
    (fraction: number) =>
      Math.max(0, Math.min(state.duration, fraction * state.duration)),
    [state.duration],
  );

  const { barRef, dragFraction, pointerHandlers } = useDragSeek({
    getTimeFromFraction,
    onSeek: playerHandlers.seek,
    disabled: seekDisabled,
  });

  const buffered = state.duration ? (state.buffered / state.duration) * 100 : 0;
  /**
   * Follows the finger during a drag: the seek is not committed until release, so
   * `currentTime` has not moved yet and the bar would otherwise sit still under it.
   */
  const progress =
    dragFraction !== null
      ? dragFraction * 100
      : state.duration
        ? (state.currentTime / state.duration) * 100
        : 0;

  /** The 3px bar itself, identical in both orientations. */
  const bar = (
    <div className="w-full h-[3px] bg-white/20 relative">
      <div
        className="absolute inset-y-0 left-0 bg-white/40"
        style={{ width: `${buffered}%` }}
      />
      <div
        className="absolute inset-y-0 left-0 bg-red-600"
        style={{ width: `${progress}%` }}
      />
    </div>
  );

  // Portrait: thin non-interactive progress bar at the very bottom
  if (isPortrait) {
    return <div className="w-full pointer-events-none">{bar}</div>;
  }

  return (
    <div
      ref={barRef}
      role="slider"
      tabIndex={0}
      aria-valuemin={0}
      aria-valuemax={state.duration}
      aria-valuenow={state.currentTime}
      className="w-full pointer-events-auto relative flex items-end"
      // touchAction: none is required for pointer events to report a horizontal drag
      // rather than the browser claiming it for scrolling.
      style={{ height: 40, touchAction: 'none' }}
      {...pointerHandlers}
      onKeyDown={(e) => {
        if (readOnly) return;
        if (e.key === 'ArrowRight')
          playerHandlers.seek(Math.min(state.duration, state.currentTime + 10));
        if (e.key === 'ArrowLeft')
          playerHandlers.seek(Math.max(0, state.currentTime - 10));
      }}
    >
      {/* Thin visible bar at the bottom of the touch target */}
      {bar}
    </div>
  );
}
