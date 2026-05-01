import { useCallback, useRef } from 'react';
import { usePlayerContext } from '../../context/PlayerContext';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';

/**
 * YouTube-style thin seekbar for mobile with dual behavior based on device orientation.
 *
 * **Portrait mode (non-interactive):** Renders a 3px progress-only bar at the bottom
 * of the player. Touch events are disabled (`pointer-events-none`) so the user cannot
 * seek — this matches YouTube's mobile portrait UX where the seekbar is purely visual.
 *
 * **Landscape mode (interactive):** Renders a taller touch target (40px) with the same
 * 3px visible bar at the bottom. Supports touch-drag seeking, tap-to-seek, and
 * keyboard arrow-key seeking (±10s). The bar shows both buffered (white/40%) and
 * played (red) progress.
 *
 * Read-only players (e.g. watch-party guests) disable all seek interactions regardless
 * of orientation.
 */
export function PlayerMobileSeekBar() {
  const { state, playerHandlers, readOnly } = usePlayerContext();
  const isPortrait = useMobileOrientation();
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const progress = state.duration
    ? (state.currentTime / state.duration) * 100
    : 0;
  const buffered = state.duration ? (state.buffered / state.duration) * 100 : 0;

  const seekFromTouch = useCallback(
    (clientX: number) => {
      if (readOnly || isPortrait || !barRef.current || !state.duration) return;
      const rect = barRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      playerHandlers.seek(pct * state.duration);
    },
    [readOnly, isPortrait, state.duration, playerHandlers],
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isPortrait) return;
      dragging.current = true;
      seekFromTouch(e.touches[0].clientX);
    },
    [isPortrait, seekFromTouch],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      seekFromTouch(e.touches[0].clientX);
    },
    [seekFromTouch],
  );

  const onTouchEnd = useCallback(() => {
    dragging.current = false;
  }, []);

  // Portrait: thin non-interactive progress bar at the very bottom
  if (isPortrait) {
    return (
      <div className="w-full pointer-events-none">
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
      </div>
    );
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
      style={{ height: 40, touchAction: 'none' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={(e) => seekFromTouch(e.clientX)}
      onKeyDown={(e) => {
        if (readOnly) return;
        if (e.key === 'ArrowRight')
          playerHandlers.seek(Math.min(state.duration, state.currentTime + 10));
        if (e.key === 'ArrowLeft')
          playerHandlers.seek(Math.max(0, state.currentTime - 10));
      }}
    >
      {/* Thin visible bar at the bottom of the touch target */}
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
    </div>
  );
}
