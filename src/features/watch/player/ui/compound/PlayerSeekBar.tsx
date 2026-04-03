import { usePlayerContext } from '../../context/PlayerContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';
import { LiveSeekBar } from '../controls/LiveSeekBar';
import { SeekBar } from '../controls/SeekBar';

export function PlayerSeekBar() {
  const { state, spriteSheet, spriteVtt, readOnly, playerHandlers, metadata } =
    usePlayerContext();
  const isMobile = useMobileDetection();
  const isPortrait = useMobileOrientation();
  const compact = isMobile && isPortrait;

  if (metadata.type === 'livestream') return <LiveSeekBar compact={compact} />;

  return (
    <div className="px-4 md:px-6 lg:px-8 2xl:px-10 pointer-events-auto">
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
    </div>
  );
}
