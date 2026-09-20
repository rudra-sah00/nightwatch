'use client';

import { ChevronsRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePlayerContext } from '../../context/PlayerContext';

/**
 * Pill shown while Space is held to temporarily raise playback to 2x.
 *
 * Mirrors YouTube's hold-to-speed affordance: it appears only for the duration of the
 * hold and says nothing about the speed chosen in the settings menu, which is
 * unchanged and restored on release.
 *
 * Rendered by `PlayerRoot` for every player, so no composition site has to opt in.
 */
export function SpeedBoostIndicator() {
  const { state } = usePlayerContext();
  const t = useTranslations('watch.player');

  if (!state.isSpeedBoosted) return null;

  return (
    <div
      // Above the control bar (z-30) but below dialogs; never intercepts pointer
      // events because the gesture driving it is the keyboard.
      className="absolute top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-150 motion-reduce:animate-none"
      // The pill is the only cue that speed changed, so announce it.
      role="status"
      aria-live="polite"
      aria-label={t('speedBoostActive')}
    >
      <div className="flex items-center gap-2 bg-black/80 text-white border-[3px] border-white/20 px-4 py-2">
        <span className="font-headline font-black text-sm uppercase tracking-widest tabular-nums">
          2×
        </span>
        <ChevronsRight className="w-4 h-4 stroke-[3px]" aria-hidden="true" />
      </div>
    </div>
  );
}
