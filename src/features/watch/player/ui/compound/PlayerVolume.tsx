import { useTranslations } from 'next-intl';
import { usePlayerContext } from '../../context/PlayerContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { Volume } from '../controls/Volume';

/**
 * Compound volume control for the player controls bar.
 *
 * Hidden on mobile devices. Wraps the low-level {@link Volume} component
 * with player context bindings.
 */
export function PlayerVolume() {
  const { state, playerHandlers } = usePlayerContext();
  const t = useTranslations('watch');
  const isMobile = useMobileDetection();

  if (isMobile) return null;

  return (
    <section
      className="hidden md:block"
      onMouseEnter={() => playerHandlers.handleInteraction(true)}
      onMouseLeave={() => playerHandlers.handleInteraction(false)}
      aria-label={t('aria.volume')}
    >
      <Volume
        volume={state.volume}
        isMuted={state.isMuted}
        onVolumeChange={playerHandlers.setVolume}
        onMuteToggle={playerHandlers.toggleMute}
      />
    </section>
  );
}
