import { cn } from '@/lib/utils';
import { usePlayerLiveBadge } from './use-player-live-badge';

/**
 * How many seconds behind the buffered live edge counts as "you are live".
 * Most real live players use 10–30 s; 15 s is a comfortable middle ground.
 */
const _LIVE_EDGE_THRESHOLD_S = 15;

export function PlayerLiveBadge() {
  const { isAtLiveEdge, handleGoLive, metadata } = usePlayerLiveBadge();

  if (metadata.type !== 'livestream') return null;

  return (
    <button
      type="button"
      onClick={isAtLiveEdge ? undefined : handleGoLive}
      title={isAtLiveEdge ? 'You are watching live' : 'Jump to live'}
      className={cn(
        'flex items-center gap-1.5 ml-2 md:ml-3 px-3 py-1.5 rounded-full text-white text-xs font-bold uppercase tracking-widest flex-shrink-0 transition-colors duration-300 select-none',
        isAtLiveEdge
          ? 'bg-red-600 cursor-default'
          : 'bg-zinc-800/80 border border-red-500 cursor-pointer hover:bg-red-600/30 hover:border-red-400',
      )}
    >
      {/* Dot indicator: pulses when live, static grey dot when behind */}
      <span
        className={cn(
          'inline-block w-2 h-2 rounded-full flex-shrink-0',
          isAtLiveEdge ? 'bg-white animate-pulse' : 'bg-red-500',
        )}
      />
      LIVE
    </button>
  );
}
