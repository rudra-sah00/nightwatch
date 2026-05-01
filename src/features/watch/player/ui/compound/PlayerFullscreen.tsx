import { useTranslations } from 'next-intl';
import { usePlayerContext } from '../../context/PlayerContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';
import { Fullscreen } from '../controls/Fullscreen';

/**
 * Fullscreen toggle button wrapper that reads player state from context.
 *
 * Delegates rendering to the presentational `Fullscreen` control component.
 * Automatically switches to compact sizing on mobile portrait. Pauses the
 * controls auto-hide timer while the user hovers over the button (desktop).
 *
 * @param props.label - Optional accessible label override for the button.
 */
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
