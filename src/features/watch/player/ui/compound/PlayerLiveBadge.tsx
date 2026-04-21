import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { usePlayerLiveBadge } from './hooks/use-player-live-badge';

/**
 * How many seconds behind the buffered live edge counts as "you are live".
 * Most real live players use 10–30 s; 15 s is a comfortable middle ground.
 */
const _LIVE_EDGE_THRESHOLD_S = 15;

export function PlayerLiveBadge() {
  const { isAtLiveEdge, handleGoLive, metadata } = usePlayerLiveBadge();
  const t = useTranslations('watch.player');

  if (metadata.type !== 'livestream') return null;

  return (
    <button
      type="button"
      onClick={isAtLiveEdge ? undefined : handleGoLive}
      title={isAtLiveEdge ? t('watchingLive') : t('jumpToLive')}
      className={cn(
        'flex items-center gap-2 ml-2 md:ml-3 px-3 py-1 border-[3px] border-border text-xs font-black font-headline uppercase tracking-widest flex-shrink-0 transition-colors duration-200 select-none ',
        isAtLiveEdge
          ? 'bg-neo-red text-primary-foreground cursor-default'
          : 'bg-background text-foreground cursor-pointer hover:bg-neo-yellow/80',
      )}
    >
      {/* Dot indicator: pulses when live, static grey dot when behind */}
      <span
        className={cn(
          'inline-block w-2.5 h-2.5 border-[2px] border-border flex-shrink-0',
          isAtLiveEdge ? 'bg-background animate-pulse' : 'bg-neo-red',
        )}
      />
      {t('liveBadge')}
    </button>
  );
}
