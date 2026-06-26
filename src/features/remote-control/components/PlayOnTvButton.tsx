'use client';

import { Monitor } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAvailableTvs } from '../hooks/use-available-tvs';

interface PlayOnTvButtonProps {
  movieId: string;
  title: string;
}

/**
 * "Play on TV" button for mobile portrait video player.
 * Only renders when a TV is available on the network.
 * Casts the content to the first available TV on tap.
 */
export function PlayOnTvButton({ movieId, title }: PlayOnTvButtonProps) {
  const { tvs, castToTv } = useAvailableTvs();
  const t = useTranslations('common');

  if (tvs.length === 0) return null;

  const handleCast = () => {
    const tv = tvs[0];
    castToTv(tv.socketId, { movieId, title });
  };

  return (
    <button
      type="button"
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-border bg-card font-bold font-headline uppercase tracking-wider text-sm text-foreground transition-colors active:bg-primary active:text-primary-foreground"
      onClick={handleCast}
    >
      <Monitor className="w-4 h-4 stroke-[2.5px]" />
      <span>{t('remote.playOnDevice', { device: tvs[0].deviceName })}</span>
    </button>
  );
}
