import { useTranslations } from 'next-intl';
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
  const t = useTranslations('watch');

  return (
    <section
      className="flex items-center gap-1"
      onMouseEnter={() => playerHandlers.handleInteraction(true)}
      onMouseLeave={() => playerHandlers.handleInteraction(false)}
      aria-label={t('aria.audioSubtitle')}
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
