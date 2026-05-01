import { usePlayerContext } from '../../context/PlayerContext';
import { formatTime } from '../../utils/format-time';

/**
 * Displays the current playback time and total duration in the player
 * controls bar. Hidden for livestream content.
 */
export function PlayerTimeDisplay() {
  const { state, metadata } = usePlayerContext();

  if (metadata.type === 'livestream') return null;

  return (
    <div className="bg-background border-[3px] border-border px-3 py-1.5 text-foreground text-xs md:text-sm lg:text-base 2xl:text-lg font-black font-headline uppercase tracking-widest ml-2 md:ml-3 lg:ml-4 2xl:ml-5 tabular-nums flex-shrink-0 ">
      <span>{formatTime(state.currentTime)}</span>
      <span className="text-foreground/50 mx-2 md:mx-3">/</span>
      <span className="text-foreground/80">{formatTime(state.duration)}</span>
    </div>
  );
}
