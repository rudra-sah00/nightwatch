import { useEffect, useMemo, useState } from 'react';
import { usePlayerContext } from '../../context/PlayerContext';
import {
  applySubtitleSettings,
  loadSubtitleSettings,
  type SubtitleSettings,
  saveSubtitleSettings,
} from '../controls/subtitle-settings';

export function usePlayerAudioSubtitleSelectors() {
  const { state, playerHandlers } = usePlayerContext();
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>(
    () => loadSubtitleSettings(),
  );

  // Apply saved settings on mount
  useEffect(() => {
    applySubtitleSettings(subtitleSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtitleSettings]);

  const handleSubtitleSettingsChange = (newSettings: SubtitleSettings) => {
    setSubtitleSettings(newSettings);
    applySubtitleSettings(newSettings);
    saveSubtitleSettings(newSettings);
  };

  const audioTracksForMenu = useMemo(
    () =>
      state.audioTracks.map((track) => ({
        id: track.id,
        label: track.label,
        language: track.language,
      })),
    [state.audioTracks],
  );

  const subtitleTracksForMenu = useMemo(
    () =>
      state.subtitleTracks.map((track) => ({
        id: track.id,
        label: track.label,
        language: track.language,
      })),
    [state.subtitleTracks],
  );

  return {
    state,
    playerHandlers,
    subtitleSettings,
    handleSubtitleSettingsChange,
    audioTracksForMenu,
    subtitleTracksForMenu,
  };
}
