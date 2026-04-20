import { usePlayerContext } from '../../context/PlayerContext';
import { AudioSelector } from '../controls/AudioSelector';
import { SubtitleSelector } from '../controls/SubtitleSelector';
import { usePlayerAudioSubtitleSelectors } from './hooks/use-player-audio-subtitle-selectors';

export function PlayerAudioSubtitleSelectors() {
  const {
    subtitleSettings,
    handleSubtitleSettingsChange,
    audioTracksForMenu,
    subtitleTracksForMenu,
  } = usePlayerAudioSubtitleSelectors();
  const { state, playerHandlers } = usePlayerContext();

  return (
    <section
      className="flex items-center gap-1"
      onMouseEnter={() => playerHandlers.handleInteraction(true)}
      onMouseLeave={() => playerHandlers.handleInteraction(false)}
      aria-label="Audio and Subtitle Selectors Interaction"
    >
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
    </section>
  );
}
