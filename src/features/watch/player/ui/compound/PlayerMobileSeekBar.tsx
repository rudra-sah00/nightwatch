import { usePlayerContext } from '../../context/PlayerContext';

/** YouTube-style thin seekbar for mobile — a slim 3px line pinned to the bottom. */
export function PlayerMobileSeekBar() {
  const { state, playerHandlers, readOnly } = usePlayerContext();
  const progress = state.duration
    ? (state.currentTime / state.duration) * 100
    : 0;
  const buffered = state.duration ? (state.buffered / state.duration) * 100 : 0;

  const handleSeek = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    if (readOnly) return;
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    playerHandlers.seek(pct * state.duration);
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-valuemin={0}
      aria-valuemax={state.duration}
      aria-valuenow={state.currentTime}
      className="w-full h-[3px] bg-white/20 pointer-events-auto relative"
      onClick={handleSeek}
      onKeyDown={(e) => {
        if (readOnly) return;
        if (e.key === 'ArrowRight')
          playerHandlers.seek(Math.min(state.duration, state.currentTime + 10));
        if (e.key === 'ArrowLeft')
          playerHandlers.seek(Math.max(0, state.currentTime - 10));
      }}
      onTouchMove={handleSeek}
    >
      {/* Buffered */}
      <div
        className="absolute inset-y-0 left-0 bg-white/40"
        style={{ width: `${buffered}%` }}
      />
      {/* Progress */}
      <div
        className="absolute inset-y-0 left-0 bg-red-600"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
