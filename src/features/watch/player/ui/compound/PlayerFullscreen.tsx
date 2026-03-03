import { usePlayerContext } from '../../context/PlayerContext';
import { Fullscreen } from '../controls/Fullscreen';

export function PlayerFullscreen({ label }: { label?: string }) {
  const { state, playerHandlers } = usePlayerContext();

  return (
    <Fullscreen
      isFullscreen={state.isFullscreen}
      onToggle={playerHandlers.toggleFullscreen}
      label={label}
    />
  );
}
