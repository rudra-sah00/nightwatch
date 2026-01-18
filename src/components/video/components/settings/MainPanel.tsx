/**
 * Main Settings Panel
 */

import { getQualityLabel } from '@/lib/utils/video-utils';
import type { LocalSubtitle, PlayerAudioTrack, QualityLevel, SettingsTab } from '@/types/video';
import { AudioIcon, MenuRow, QualityIcon, SpeedIcon, SubtitleIcon } from './shared';

interface MainPanelProps {
  hasQualityLevels: boolean;
  currentQualityLabel: string;
  audioTracks: PlayerAudioTrack[];
  localSubtitles: LocalSubtitle[];
  currentSubtitleIndex: number;
  isAutoQuality?: boolean;
  actualQualityLevel?: number;
  qualityLevels: QualityLevel[];
  playbackSpeed: number;
  hasSpeedControl: boolean;
  isMobile?: boolean;
  onTabChange: (tab: SettingsTab) => void;
  getSubtitleLabel: (index: number) => string;
  getCurrentAudioLabel: () => string;
}

export function MainPanel({
  hasQualityLevels,
  currentQualityLabel,
  audioTracks,
  localSubtitles,
  currentSubtitleIndex,
  isAutoQuality,
  actualQualityLevel,
  qualityLevels,
  playbackSpeed,
  hasSpeedControl,
  isMobile = false,
  onTabChange,
  getSubtitleLabel,
  getCurrentAudioLabel,
}: MainPanelProps) {
  // Get actual quality label when in auto mode
  const getAutoQualityDisplay = () => {
    if (isAutoQuality && actualQualityLevel !== undefined && actualQualityLevel >= 0) {
      const level = qualityLevels.find((l) => l.id === actualQualityLevel);
      if (level) {
        return `Auto (${getQualityLabel(level)})`;
      }
    }
    return currentQualityLabel;
  };

  const getSpeedLabel = (speed: number) => {
    if (speed === 1) return 'Normal';
    return `${speed}x`;
  };

  return (
    <div className="py-1">
      {/* Header */}
      <div className={`px-3 sm:px-4 ${isMobile ? 'py-2' : 'py-3'} border-b border-white/10`}>
        <span className="text-white/60 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
          Settings
        </span>
      </div>

      {/* Quality */}
      {hasQualityLevels && (
        <MenuRow
          icon={<QualityIcon />}
          label="Quality"
          value={getAutoQualityDisplay()}
          badge={isAutoQuality ? 'AUTO' : undefined}
          badgeColor="blue"
          isMobile={isMobile}
          onClick={() => onTabChange('quality')}
        />
      )}

      {/* Playback Speed */}
      {hasSpeedControl && (
        <MenuRow
          icon={<SpeedIcon />}
          label="Playback Speed"
          value={getSpeedLabel(playbackSpeed)}
          badge={playbackSpeed !== 1 ? `${playbackSpeed}x` : undefined}
          badgeColor="purple"
          isMobile={isMobile}
          onClick={() => onTabChange('speed')}
        />
      )}

      {/* Subtitles */}
      {localSubtitles.length > 0 && (
        <MenuRow
          icon={<SubtitleIcon />}
          label="Subtitles"
          value={getSubtitleLabel(currentSubtitleIndex)}
          badge={currentSubtitleIndex >= 0 ? 'ON' : undefined}
          isMobile={isMobile}
          badgeColor="red"
          onClick={() => onTabChange('subtitles')}
        />
      )}

      {/* Audio */}
      {audioTracks.length > 1 && (
        <MenuRow
          icon={<AudioIcon />}
          label="Audio"
          value={getCurrentAudioLabel()}
          isMobile={isMobile}
          onClick={() => onTabChange('audio')}
        />
      )}
    </div>
  );
}
