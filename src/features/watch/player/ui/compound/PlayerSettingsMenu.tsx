import { usePlayerContext } from '../../context/PlayerContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';
import { SettingsMenu } from '../controls/SettingsMenu';

export function PlayerSettingsMenu() {
  const { state, playerHandlers, readOnly } = usePlayerContext();
  const isMobile = useMobileDetection();
  const isPortrait = useMobileOrientation();
  const compact = isMobile && isPortrait;

  return (
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
  );
}
