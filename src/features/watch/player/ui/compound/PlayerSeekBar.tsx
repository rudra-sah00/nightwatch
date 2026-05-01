import { useTranslations } from 'next-intl';
import { usePlayerContext } from '../../context/PlayerContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';
import { LiveSeekBar } from '../controls/LiveSeekBar';
import { SeekBar } from '../controls/SeekBar';

/**
 * Compound seek bar for the player controls.
 *
 * Renders a {@link LiveSeekBar} for livestreams or a standard {@link SeekBar}
 * for VOD content, with sprite thumbnail previews and mobile-aware compact mode.
 */
export function PlayerSeekBar() {
  const { state, spriteSheet, spriteVtt, readOnly, playerHandlers, metadata } =
    usePlayerContext();
  const t = useTranslations('watch');
  const isMobile = useMobileDetection();
  const isPortrait = useMobileOrientation();
  const compact = isMobile && isPortrait;

  if (metadata.type === 'livestream') return <LiveSeekBar compact={compact} />;

  return (
    <section
      className="px-4 md:px-6 lg:px-8 2xl:px-10 pointer-events-auto"
      onMouseEnter={() => playerHandlers.handleInteraction(true)}
      onMouseLeave={() => playerHandlers.handleInteraction(false)}
      aria-label={t('aria.seekBar')}
    >
      <SeekBar
        currentTime={state.currentTime}
        duration={state.duration}
        buffered={state.buffered}
        onSeek={playerHandlers.seek}
        spriteSheet={spriteSheet}
        spriteVtt={spriteVtt}
        disabled={readOnly}
        allowPreview={true}
        compact={compact}
      />
    </section>
  );
}
