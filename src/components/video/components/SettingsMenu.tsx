'use client';

import React from 'react';
import { ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/solid';
import { QualityLevel, AudioTrack, LocalSubtitle, SettingsTab, QualityValue } from '@/types/video';
import { getQualityLabel } from '@/lib/utils/video-utils';

interface SettingsMenuProps {
  isOpen: boolean;
  tab: SettingsTab;
  isFullscreen: boolean;
  qualityLevels: QualityLevel[];
  currentQuality: QualityValue;
  currentQualityLabel: string;
  audioTracks: AudioTrack[];
  currentAudioTrack: number;
  localSubtitles: LocalSubtitle[];
  currentSubtitleIndex: number;
  onToggleMenu: () => void;
  onTabChange: (tab: SettingsTab) => void;
  onQualityChange: (level: QualityValue) => void;
  onAudioChange: (trackId: number) => void;
  onSubtitleChange: (index: number) => void;
  onToggleFullscreen: () => void;
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
  onToggleMenu,
  onTabChange,
  onQualityChange,
  onAudioChange,
  onSubtitleChange,
  onToggleFullscreen,
  getSubtitleLabel,
  getCurrentAudioLabel,
}: SettingsMenuProps) {
  const sortedQualityLevels = [...qualityLevels].sort((a, b) => (b.height || 0) - (a.height || 0));

  return (
    <div className="flex items-center gap-2">
      {/* Settings Button */}
      <div className="relative">
        <button
          onClick={onToggleMenu}
          className={`w-10 h-10 flex items-center justify-center transition-all duration-200 ${
            isOpen ? 'text-white rotate-45' : 'text-white hover:text-zinc-300'
          }`}
          aria-label="Settings"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Menu Panel */}
        {isOpen && (
          <div className="absolute bottom-full right-0 mb-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[240px] animate-in slide-in-from-bottom-2 duration-200">
            {tab === 'main' && (
              <MainMenu
                hasQualityLevels={qualityLevels.length > 0}
                currentQualityLabel={currentQualityLabel}
                audioTracks={audioTracks}
                localSubtitles={localSubtitles}
                currentSubtitleIndex={currentSubtitleIndex}
                onTabChange={onTabChange}
                getSubtitleLabel={getSubtitleLabel}
                getCurrentAudioLabel={getCurrentAudioLabel}
              />
            )}
            {tab === 'quality' && (
              <QualityMenu
                levels={sortedQualityLevels}
                currentQuality={currentQuality}
                onBack={() => onTabChange('main')}
                onSelect={onQualityChange}
              />
            )}
            {tab === 'subtitles' && (
              <SubtitlesMenu
                subtitles={localSubtitles}
                currentIndex={currentSubtitleIndex}
                onBack={() => onTabChange('main')}
                onSelect={onSubtitleChange}
              />
            )}
            {tab === 'audio' && (
              <AudioMenu
                tracks={audioTracks}
                currentTrack={currentAudioTrack}
                onBack={() => onTabChange('main')}
                onSelect={onAudioChange}
              />
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Button */}
      <button
        onClick={onToggleFullscreen}
        className="w-10 h-10 flex items-center justify-center text-white hover:text-zinc-300 transition-colors"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? (
          <ArrowsPointingInIcon className="w-6 h-6" />
        ) : (
          <ArrowsPointingOutIcon className="w-6 h-6" />
        )}
      </button>
    </div>
  );
}

// Sub-components

interface MainMenuProps {
  hasQualityLevels: boolean;
  currentQualityLabel: string;
  audioTracks: AudioTrack[];
  localSubtitles: LocalSubtitle[];
  currentSubtitleIndex: number;
  onTabChange: (tab: SettingsTab) => void;
  getSubtitleLabel: (index: number) => string;
  getCurrentAudioLabel: () => string;
}

function MainMenu({
  hasQualityLevels,
  currentQualityLabel,
  audioTracks,
  localSubtitles,
  currentSubtitleIndex,
  onTabChange,
  getSubtitleLabel,
  getCurrentAudioLabel,
}: MainMenuProps) {
  return (
    <div className="py-2">
      {/* Quality */}
      {hasQualityLevels && (
        <MenuRow
          icon={<QualityIcon />}
          label="Quality"
          value={currentQualityLabel}
          onClick={() => onTabChange('quality')}
        />
      )}

      {/* Subtitles */}
      {localSubtitles.length > 0 && (
        <MenuRow
          icon={<SubtitleIcon />}
          label="Subtitles"
          value={getSubtitleLabel(currentSubtitleIndex)}
          onClick={() => onTabChange('subtitles')}
        />
      )}

      {/* Audio */}
      {audioTracks.length > 1 && (
        <MenuRow
          icon={<AudioIcon />}
          label="Audio"
          value={getCurrentAudioLabel()}
          onClick={() => onTabChange('audio')}
        />
      )}
    </div>
  );
}

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: () => void;
}

function MenuRow({ icon, label, value, onClick }: MenuRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-white">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white/60 text-sm truncate max-w-[100px]">{value}</span>
        <ChevronRightIcon />
      </div>
    </button>
  );
}

interface QualityMenuProps {
  levels: QualityLevel[];
  currentQuality: QualityValue;
  onBack: () => void;
  onSelect: (level: QualityValue) => void;
}

function QualityMenu({ levels, currentQuality, onBack, onSelect }: QualityMenuProps) {
  return (
    <div>
      <SubMenuHeader title="Quality" onBack={onBack} />
      <div className="py-2 max-h-[300px] overflow-y-auto">
        <SelectableItem
          label="Auto"
          isSelected={currentQuality === 'auto'}
          onClick={() => onSelect('auto')}
        />
        {levels.map((lvl) => (
          <SelectableItem
            key={lvl.id}
            label={getQualityLabel(lvl)}
            isSelected={currentQuality === lvl.id}
            onClick={() => onSelect(lvl.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface SubtitlesMenuProps {
  subtitles: LocalSubtitle[];
  currentIndex: number;
  onBack: () => void;
  onSelect: (index: number) => void;
}

function SubtitlesMenu({ subtitles, currentIndex, onBack, onSelect }: SubtitlesMenuProps) {
  return (
    <div>
      <SubMenuHeader title="Subtitles" onBack={onBack} />
      <div className="py-2 max-h-[300px] overflow-y-auto">
        <SelectableItem
          label="Off"
          isSelected={currentIndex === -1}
          onClick={() => onSelect(-1)}
        />
        {subtitles.map((sub, index) => (
          <SelectableItem
            key={index}
            label={sub.language}
            isSelected={currentIndex === index}
            onClick={() => onSelect(index)}
          />
        ))}
      </div>
    </div>
  );
}

interface AudioMenuProps {
  tracks: AudioTrack[];
  currentTrack: number;
  onBack: () => void;
  onSelect: (trackId: number) => void;
}

function AudioMenu({ tracks, currentTrack, onBack, onSelect }: AudioMenuProps) {
  return (
    <div>
      <SubMenuHeader title="Audio Track" onBack={onBack} />
      <div className="py-2 max-h-[300px] overflow-y-auto">
        {tracks.map((track) => (
          <SelectableItem
            key={track.id}
            label={`${track.name}${track.lang !== 'unknown' ? ` (${track.lang})` : ''}`}
            isSelected={currentTrack === track.id}
            onClick={() => onSelect(track.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface SubMenuHeaderProps {
  title: string;
  onBack: () => void;
}

function SubMenuHeader({ title, onBack }: SubMenuHeaderProps) {
  return (
    <button
      onClick={onBack}
      className="w-full flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10 hover:bg-white/10 transition-colors"
    >
      <ChevronLeftIcon />
      <span className="text-white font-medium">{title}</span>
    </button>
  );
}

interface SelectableItemProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

function SelectableItem({ label, isSelected, onClick }: SelectableItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors ${
        isSelected ? 'text-white font-medium' : 'text-white/70'
      }`}
    >
      <span>{label}</span>
      {isSelected && <CheckIcon />}
    </button>
  );
}

// Icons
function QualityIcon() {
  return (
    <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2m0 2v2m0-2h10m0 0V2m0 2v2m0-2h3a1 1 0 011 1v3M4 8h16M4 8a1 1 0 00-1 1v3m1-4v10a1 1 0 001 1h14a1 1 0 001-1V9" />
    </svg>
  );
}

function SubtitleIcon() {
  return (
    <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
  );
}

function AudioIcon() {
  return (
    <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}
