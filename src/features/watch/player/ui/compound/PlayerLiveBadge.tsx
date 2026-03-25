import { cn } from '@/lib/utils';
import { usePlayerLiveBadge } from './hooks/use-player-live-badge';

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
        'flex items-center gap-2 ml-2 md:ml-3 px-3 py-1 border-[3px] border-[#1a1a1a] text-xs font-black font-headline uppercase tracking-widest flex-shrink-0 transition-all duration-200 select-none neo-shadow-sm',
        isAtLiveEdge
          ? 'bg-[#e63b2e] text-white cursor-default'
          : 'bg-white text-[#1a1a1a] cursor-pointer hover:bg-[#ffe066] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
      )}
    >
      {/* Dot indicator: pulses when live, static grey dot when behind */}
      <span
        className={cn(
          'inline-block w-2.5 h-2.5 border-[2px] border-[#1a1a1a] flex-shrink-0',
          isAtLiveEdge ? 'bg-white animate-pulse' : 'bg-[#e63b2e]',
        )}
      />
      LIVE
    </button>
  );
}
