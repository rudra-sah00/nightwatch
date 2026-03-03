import { usePlayerContext } from '../../context/PlayerContext';
import { SettingsMenu } from '../controls/SettingsMenu';

export function PlayerSettingsMenu() {
  const { state, playerHandlers, readOnly, metadata } = usePlayerContext();

  if (metadata.type === 'livestream') return null;

  return (
    <SettingsMenu
      qualities={state.qualities}
      currentQuality={state.currentQuality}
      playbackRate={state.playbackRate}
      onQualityChange={playerHandlers.setQuality}
      onPlaybackRateChange={playerHandlers.setPlaybackRate}
      disabled={readOnly}
      onInteraction={playerHandlers.handleInteraction}
    />
  );
}
