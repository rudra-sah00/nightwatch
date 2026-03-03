import { usePlayerContext } from '../../context/PlayerContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { Volume } from '../controls/Volume';

export function PlayerVolume() {
  const { state, playerHandlers } = usePlayerContext();
  const isMobile = useMobileDetection();

  if (isMobile) return null;

  return (
    <div className="hidden md:block">
      <Volume
        volume={state.volume}
        isMuted={state.isMuted}
        onVolumeChange={playerHandlers.setVolume}
        onMuteToggle={playerHandlers.toggleMute}
      />
    </div>
  );
}
