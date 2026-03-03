import { usePlayerContext } from '../../context/PlayerContext';
import { AudioSelector } from '../controls/AudioSelector';
import { SubtitleSelector } from '../controls/SubtitleSelector';
import { usePlayerAudioSubtitleSelectors } from './use-player-audio-subtitle-selectors';

export function PlayerAudioSubtitleSelectors() {
  const {
    subtitleSettings,
    handleSubtitleSettingsChange,
    audioTracksForMenu,
    subtitleTracksForMenu,
  } = usePlayerAudioSubtitleSelectors();
  const { state, playerHandlers } = usePlayerContext();

  return (
    <>
      <SubtitleSelector
        tracks={subtitleTracksForMenu}
        currentTrack={state.currentSubtitleTrack}
        onTrackChange={playerHandlers.setSubtitleTrack}
        subtitleSettings={subtitleSettings}
        onSubtitleSettingsChange={handleSubtitleSettingsChange}
      />

      <AudioSelector
        tracks={audioTracksForMenu}
        currentTrack={state.currentAudioTrack || undefined}
        onTrackChange={playerHandlers.setAudioTrack}
      />
    </>
  );
}
