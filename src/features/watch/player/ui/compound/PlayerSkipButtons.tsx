import { SkipBack, SkipForward } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePlayerContext } from '../../context/PlayerContext';

/**
 * Compound skip-back / skip-forward buttons for the player controls bar.
 *
 * Hidden on mobile, during livestreams, and in read-only (guest) mode.
 */
export function PlayerSkipButtons() {
  const { playerHandlers, metadata, readOnly } = usePlayerContext();
  const t = useTranslations('watch');

  if (metadata.type === 'livestream' || readOnly) return null;

  return (
    <section
      className="hidden md:flex items-center gap-1 lg:gap-2"
      onMouseEnter={() => playerHandlers.handleInteraction(true)}
      onMouseLeave={() => playerHandlers.handleInteraction(false)}
      aria-label={t('aria.skipControls')}
    >
      <button
        type="button"
        onClick={() => playerHandlers.skip(-10)}
        onMouseDown={(e) => e.preventDefault()}
        className="p-1 transition-transform duration-200 active:scale-75 hover:scale-110"
      >
        <SkipBack className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 text-white/80 hover:text-white" />
      </button>
      <button
        type="button"
        onClick={() => playerHandlers.skip(10)}
        onMouseDown={(e) => e.preventDefault()}
        className="p-1 transition-transform duration-200 active:scale-75 hover:scale-110"
      >
        <SkipForward className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 text-white/80 hover:text-white" />
      </button>
    </section>
  );
}
