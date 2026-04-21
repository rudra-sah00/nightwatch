import { useTranslations } from 'next-intl';
import { usePlayerContext } from '../../context/PlayerContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';
import { Fullscreen } from '../controls/Fullscreen';

export function PlayerFullscreen({ label }: { label?: string }) {
  const { state, playerHandlers } = usePlayerContext();
  const t = useTranslations('watch');
  const isMobile = useMobileDetection();
  const isPortrait = useMobileOrientation();
  const compact = isMobile && isPortrait;

  return (
    <section
      onMouseEnter={() => playerHandlers.handleInteraction(true)}
      onMouseLeave={() => playerHandlers.handleInteraction(false)}
      aria-label={t('aria.fullscreen')}
    >
      <Fullscreen
        isFullscreen={state.isFullscreen}
        onToggle={playerHandlers.toggleFullscreen}
        label={label}
        compact={compact}
      />
    </section>
  );
}
