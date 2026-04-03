import { usePlayerContext } from '../../context/PlayerContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';
import { Fullscreen } from '../controls/Fullscreen';

export function PlayerFullscreen({ label }: { label?: string }) {
  const { state, playerHandlers } = usePlayerContext();
  const isMobile = useMobileDetection();
  const isPortrait = useMobileOrientation();
  const compact = isMobile && isPortrait;

  return (
    <Fullscreen
      isFullscreen={state.isFullscreen}
      onToggle={playerHandlers.toggleFullscreen}
      label={label}
      compact={compact}
    />
  );
}
