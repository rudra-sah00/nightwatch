'use client';

import { ArrowsPointingInIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/solid';
import { useMemo } from 'react';
import type {
  LocalSubtitle,
  PlaybackSpeed,
  PlayerAudioTrack,
  QualityLevel,
  QualityValue,
  SettingsTab,
} from '@/types/video';
import {
  AudioIcon,
  AudioPanel,
  MainPanel,
  QualityPanel,
  SpeedPanel,
  SubtitleIcon,
  SubtitlesPanel,
} from './settings';

interface SettingsMenuProps {
  isOpen: boolean;
  tab: SettingsTab;
  isFullscreen: boolean;
  qualityLevels: QualityLevel[];
  currentQuality: QualityValue;
  currentQualityLabel: string;
  audioTracks: PlayerAudioTrack[];
  currentAudioTrack: number;
  localSubtitles: LocalSubtitle[];
  currentSubtitleIndex: number;
  isAutoQuality?: boolean;
  actualQualityLevel?: number;
  playbackSpeed?: number;
  hideSpeedControl?: boolean;
  isMobile?: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onTabChange: (tab: SettingsTab) => void;
  onQualityChange: (level: QualityValue) => void;
  onAudioChange: (trackId: number) => void;
  onSubtitleChange: (index: number) => void;
  onToggleFullscreen: () => void;
  onPlaybackSpeedChange?: (speed: PlaybackSpeed) => void;
  getSubtitleLabel: (index: number) => string;
  getCurrentAudioLabel: () => string;
}

export function SettingsMenu({
  isOpen,
  tab,
  isFullscreen,
  qualityLevels,
  currentQuality,
  currentQualityLabel,
  audioTracks,
  currentAudioTrack,
  localSubtitles,
  currentSubtitleIndex,
  isAutoQuality = false,
  actualQualityLevel,
  playbackSpeed = 1,
  hideSpeedControl = false,
  isMobile = false,
  onToggleMenu,
  onCloseMenu,
  onTabChange,
  onQualityChange,
  onAudioChange,
  onSubtitleChange,
  onToggleFullscreen,
  onPlaybackSpeedChange,
  getSubtitleLabel,
  getCurrentAudioLabel,
}: SettingsMenuProps) {
  const sortedQualityLevels = useMemo(
    () => [...qualityLevels].sort((a, b) => (b.height || 0) - (a.height || 0)),
    [qualityLevels]
  );

  // Mobile-optimized button sizes
  const buttonClass = isMobile
    ? 'w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10'
    : 'w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14';

  const iconClass = isMobile
    ? 'w-4 h-4 xs:w-5 xs:h-5'
    : 'w-5 h-5 sm:w-6 sm:h-6 md:w-6 md:h-6 lg:w-7 lg:h-7';

  return (
    <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2">
      {/* Subtitles Quick Button */}
      {localSubtitles.length > 0 && (
        <button
          type="button"
          onClick={() => {
            if (!isOpen) onToggleMenu();
            onTabChange('subtitles');
          }}
          className={`${buttonClass} flex items-center justify-center transition-all duration-200 rounded-full hover:bg-white/10 active:scale-95 touch-manipulation group ${
            currentSubtitleIndex >= 0 ? 'text-white' : 'text-white/70 hover:text-white'
          }`}
          aria-label="Subtitles"
          title="Subtitles"
        >
          <SubtitleIcon className={`${iconClass} transition-transform group-hover:scale-110`} />
        </button>
      )}

      {/* Audio Quick Button */}
      {audioTracks.length > 1 && (
        <button
          type="button"
          onClick={() => {
            if (!isOpen) onToggleMenu();
            onTabChange('audio');
          }}
          className={`${buttonClass} flex items-center justify-center text-white/70 hover:text-white transition-all duration-200 rounded-full hover:bg-white/10 active:scale-95 touch-manipulation group`}
          aria-label="Audio Track"
          title="Audio Track"
        >
          <AudioIcon className={`${iconClass} transition-transform group-hover:scale-110`} />
        </button>
      )}

      {/* Settings Button */}
      <div className="relative">
        <button
          type="button"
          onClick={onToggleMenu}
          className={`${buttonClass} flex items-center justify-center transition-all duration-300 rounded-full hover:bg-white/10 active:scale-95 touch-manipulation group ${
            isOpen ? 'text-white' : 'text-white/70 hover:text-white'
          }`}
          aria-label="Settings"
          title="Settings"
        >
          <svg
            aria-hidden="true"
            className={`${iconClass} transition-all duration-300 group-hover:scale-110 ${isOpen ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        {/* Click-outside backdrop to close menu */}
        {isOpen && <div role="none" className="fixed inset-0 z-40" onClick={onCloseMenu} />}

        {/* Menu Panel */}
        {isOpen && (
          <div
            className={`absolute bottom-full right-0 mb-2 sm:mb-3 bg-zinc-900/98 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden ${isMobile ? 'min-w-[220px] max-w-[280px]' : 'min-w-[280px] sm:min-w-[300px]'} animate-in slide-in-from-bottom-3 fade-in duration-200 z-50 max-h-[60vh] overflow-y-auto`}
          >
            {tab === 'main' && (
              <MainPanel
                hasQualityLevels={qualityLevels.length > 0}
                currentQualityLabel={currentQualityLabel}
                audioTracks={audioTracks}
                localSubtitles={localSubtitles}
                currentSubtitleIndex={currentSubtitleIndex}
                isAutoQuality={isAutoQuality}
                actualQualityLevel={actualQualityLevel}
                qualityLevels={qualityLevels}
                playbackSpeed={playbackSpeed}
                hasSpeedControl={!!onPlaybackSpeedChange && !hideSpeedControl}
                isMobile={isMobile}
                onTabChange={onTabChange}
                getSubtitleLabel={getSubtitleLabel}
                getCurrentAudioLabel={getCurrentAudioLabel}
              />
            )}
            {tab === 'quality' && (
              <QualityPanel
                levels={sortedQualityLevels}
                currentQuality={currentQuality}
                isAutoQuality={isAutoQuality}
                actualQualityLevel={actualQualityLevel}
                isMobile={isMobile}
                onBack={onCloseMenu}
                onSelect={(level) => {
                  onQualityChange(level);
                  onCloseMenu();
                }}
              />
            )}
            {tab === 'subtitles' && (
              <SubtitlesPanel
                subtitles={localSubtitles}
                currentIndex={currentSubtitleIndex}
                isMobile={isMobile}
                onBack={onCloseMenu}
                onSelect={(index) => {
                  onSubtitleChange(index);
                  onCloseMenu();
                }}
              />
            )}
            {tab === 'audio' && (
              <AudioPanel
                tracks={audioTracks}
                currentTrack={currentAudioTrack}
                isMobile={isMobile}
                onBack={onCloseMenu}
                onSelect={(trackId) => {
                  onAudioChange(trackId);
                  onCloseMenu();
                }}
              />
            )}
            {tab === 'speed' && onPlaybackSpeedChange && (
              <SpeedPanel
                currentSpeed={playbackSpeed}
                isMobile={isMobile}
                onBack={onCloseMenu}
                onSelect={(speed) => {
                  onPlaybackSpeedChange(speed);
                  onCloseMenu();
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Button */}
      <button
        type="button"
        onClick={onToggleFullscreen}
        className={`${buttonClass} flex items-center justify-center text-white/70 hover:text-white transition-all duration-200 rounded-full hover:bg-white/10 active:scale-95 touch-manipulation group`}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? (
          <ArrowsPointingInIcon
            className={`${iconClass} transition-transform group-hover:scale-110`}
          />
        ) : (
          <ArrowsPointingOutIcon
            className={`${iconClass} transition-transform group-hover:scale-110`}
          />
        )}
      </button>
    </div>
  );
}
