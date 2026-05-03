import { useTranslations } from 'next-intl';
import { usePlayerContext } from '../../context/PlayerContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';
import { SettingsMenu } from '../controls/SettingsMenu';

/**
 * Compound settings menu for the player controls bar.
 *
 * Exposes quality selection and playback rate controls via a popover menu.
 * Disabled in read-only (guest) mode.
 */
export function PlayerSettingsMenu() {
  const { state, playerHandlers, readOnly } = usePlayerContext();
  const t = useTranslations('watch');
  const isMobile = useMobileDetection();
  const isPortrait = useMobileOrientation();
  const compact = isMobile && (isPortrait || state.isFullscreen);

  return (
    <section
      onMouseEnter={() => playerHandlers.handleInteraction(true)}
      onMouseLeave={() => playerHandlers.handleInteraction(false)}
      aria-label={t('aria.settings')}
    >
      <SettingsMenu
        qualities={state.qualities}
        currentQuality={state.currentQuality}
        playbackRate={state.playbackRate}
        onQualityChange={playerHandlers.setQuality}
        onPlaybackRateChange={playerHandlers.setPlaybackRate}
        disabled={readOnly}
        onInteraction={playerHandlers.handleInteraction}
        compact={compact}
      />
    </section>
  );
}
