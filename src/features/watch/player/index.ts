export * from './context/PlayerContext';
export * from './ui/compound/PlayerAudioSubtitleSelectors';
export * from './ui/compound/PlayerCastButton';
export * from './ui/compound/PlayerControls';
export * from './ui/compound/PlayerEpisodePanel';
export * from './ui/compound/PlayerFullscreen';
export * from './ui/compound/PlayerHeader';
export * from './ui/compound/PlayerLiveBadge';
export * from './ui/compound/PlayerMobileSeekBar';
export * from './ui/compound/PlayerPlayPause';
export * from './ui/compound/PlayerRoot';
export * from './ui/compound/PlayerSeekBar';
export * from './ui/compound/PlayerSettingsMenu';
export * from './ui/compound/PlayerSkipButtons';
export * from './ui/compound/PlayerTimeDisplay';
export * from './ui/compound/PlayerVideo';
export * from './ui/compound/PlayerVolume';
export * from './ui/controls/PipButton';

import { PlayerAudioSubtitleSelectors } from './ui/compound/PlayerAudioSubtitleSelectors';
import { PlayerCastButton } from './ui/compound/PlayerCastButton';
import {
  PlayerControlRow,
  PlayerControls,
  PlayerMobileBottomRight,
  PlayerMobileCenterControls,
  PlayerMobileTopBar,
  PlayerSpacer,
} from './ui/compound/PlayerControls';
import {
  PlayerEpisodePanel,
  PlayerEpisodePanelOverlay,
  PlayerEpisodePanelTrigger,
} from './ui/compound/PlayerEpisodePanel';
import { PlayerFullscreen } from './ui/compound/PlayerFullscreen';
import { PlayerHeader } from './ui/compound/PlayerHeader';
import { PlayerLiveBadge } from './ui/compound/PlayerLiveBadge';
import { PlayerMobileSeekBar } from './ui/compound/PlayerMobileSeekBar';
import { PlayerPlayPause } from './ui/compound/PlayerPlayPause';
import { PlayerRoot } from './ui/compound/PlayerRoot';
import { PlayerSeekBar } from './ui/compound/PlayerSeekBar';
import { PlayerSettingsMenu } from './ui/compound/PlayerSettingsMenu';
import { PlayerSkipButtons } from './ui/compound/PlayerSkipButtons';
import { PlayerTimeDisplay } from './ui/compound/PlayerTimeDisplay';
import { PlayerVideo } from './ui/compound/PlayerVideo';
import { PlayerVolume } from './ui/compound/PlayerVolume';
import { PlayerPipButton } from './ui/controls/PipButton';

/**
 * Namespace object that groups all compound player components for clean
 * `<Player.Root>`, `<Player.Controls>`, etc. usage in consuming components.
 */
export const Player = {
  Root: PlayerRoot,
  Video: PlayerVideo,
  Controls: PlayerControls,
  ControlRow: PlayerControlRow,
  MobileTopBar: PlayerMobileTopBar,
  MobileCenterControls: PlayerMobileCenterControls,
  MobileBottomRight: PlayerMobileBottomRight,
  Spacer: PlayerSpacer,
  PipButton: PlayerPipButton,
  PlayPause: PlayerPlayPause,
  SeekBar: PlayerSeekBar,
  MobileSeekBar: PlayerMobileSeekBar,
  Volume: PlayerVolume,
  TimeDisplay: PlayerTimeDisplay,
  Fullscreen: PlayerFullscreen,
  SettingsMenu: PlayerSettingsMenu,
  AudioSubtitleSelectors: PlayerAudioSubtitleSelectors,
  CastButton: PlayerCastButton,
  LiveBadge: PlayerLiveBadge,
  Header: PlayerHeader,
  SkipButtons: PlayerSkipButtons,
  EpisodePanel: PlayerEpisodePanel,
  EpisodePanelOverlay: PlayerEpisodePanelOverlay,
  EpisodePanelTrigger: PlayerEpisodePanelTrigger,
};
