'use client';

import {
  Check,
  ChevronRight,
  Gauge,
  Settings,
  Subtitles,
  Volume2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Quality } from '../player/types';

interface SettingsMenuProps {
  qualities: Quality[];
  currentQuality: string;
  playbackRate: number;
  onQualityChange: (quality: string) => void;
  onPlaybackRateChange: (rate: number) => void;
  subtitleTracks?: { id: string; label: string; language: string }[];
  audioTracks?: { id: string; label: string; language: string }[];
  currentSubtitle?: string;
  currentAudio?: string;
  onSubtitleChange?: (id: string | null) => void;
  onAudioChange?: (id: string) => void;
  disabled?: boolean;
}

type MenuScreen = 'main' | 'quality' | 'speed' | 'subtitles' | 'audio';

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function SettingsMenu({
  qualities,
  currentQuality,
  playbackRate,
  onQualityChange,
  onPlaybackRateChange,
  subtitleTracks = [],
  audioTracks = [],
  currentSubtitle,
  currentAudio,
  onSubtitleChange,
  onAudioChange,
  disabled = false,
}: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<MenuScreen>('main');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setCurrentScreen('main');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setCurrentScreen('main');
    }
  };

  const handleBack = () => {
    setCurrentScreen('main');
  };

  const renderMainMenu = () => (
    <div className="py-1">
      {/* Quality */}
      <button
        type="button"
        onClick={() => setCurrentScreen('quality')}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Gauge className="w-5 h-5 text-white/70" />
          <span className="text-white text-sm">Quality</span>
        </div>
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <span>{currentQuality}</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </button>

      {/* Playback Speed */}
      <button
        type="button"
        onClick={() => !disabled && setCurrentScreen('speed')}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 transition-colors',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-white/10',
        )}
      >
        <div className="flex items-center gap-3">
          <Gauge className="w-5 h-5 text-white/70" />
          <span className="text-white text-sm">Playback Speed</span>
        </div>
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <span>{playbackRate === 1 ? 'Normal' : `${playbackRate}x`}</span>
          {disabled ? (
            <svg
              className="w-4 h-4 text-white/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Locked"
            >
              <title>Locked</title>
              <rect
                x="5"
                y="11"
                width="14"
                height="10"
                rx="2"
                strokeWidth="2"
              />
              <path
                d="M7 11V7a5 5 0 0110 0v4"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Subtitles */}
      {subtitleTracks.length > 0 && (
        <button
          type="button"
          onClick={() => setCurrentScreen('subtitles')}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Subtitles className="w-5 h-5 text-white/70" />
            <span className="text-white text-sm">Subtitles</span>
          </div>
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <span>{currentSubtitle || 'Off'}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      )}

      {/* Audio */}
      {audioTracks.length > 1 && (
        <button
          type="button"
          onClick={() => setCurrentScreen('audio')}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-white/70" />
            <span className="text-white text-sm">Audio</span>
          </div>
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <span>{currentAudio || 'Default'}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      )}
    </div>
  );

  const renderQualityMenu = () => (
    <div className="py-1">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <button
          type="button"
          onClick={handleBack}
          className="text-white/70 hover:text-white"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <span className="text-white font-medium text-sm">Quality</span>
        <div className="w-5" />
      </div>

      {/* Auto option */}
      <button
        type="button"
        onClick={() => {
          onQualityChange('auto');
          setIsOpen(false);
        }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
      >
        <span className="text-white text-sm">Auto</span>
        {currentQuality === 'auto' && <Check className="w-4 h-4 text-white" />}
      </button>

      {qualities.map((quality) => (
        <button
          type="button"
          key={quality.label}
          onClick={() => {
            onQualityChange(quality.label);
            setIsOpen(false);
          }}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
        >
          <span className="text-white text-sm">{quality.label}</span>
          {currentQuality === quality.label && (
            <Check className="w-4 h-4 text-white" />
          )}
        </button>
      ))}
    </div>
  );

  const renderSpeedMenu = () => (
    <div className="py-1">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <button
          type="button"
          onClick={handleBack}
          className="text-white/70 hover:text-white"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <span className="text-white font-medium text-sm">Playback Speed</span>
        <div className="w-5" />
      </div>

      {PLAYBACK_SPEEDS.map((speed) => (
        <button
          type="button"
          key={speed}
          onClick={() => {
            onPlaybackRateChange(speed);
            setIsOpen(false);
          }}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
        >
          <span className="text-white text-sm">
            {speed === 1 ? 'Normal' : `${speed}x`}
          </span>
          {playbackRate === speed && <Check className="w-4 h-4 text-white" />}
        </button>
      ))}
    </div>
  );

  const renderSubtitlesMenu = () => (
    <div className="py-1">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <button
          type="button"
          onClick={handleBack}
          className="text-white/70 hover:text-white"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <span className="text-white font-medium text-sm">Subtitles</span>
        <div className="w-5" />
      </div>

      <button
        type="button"
        onClick={() => {
          onSubtitleChange?.(null);
          setIsOpen(false);
        }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
      >
        <span className="text-white text-sm">Off</span>
        {!currentSubtitle && <Check className="w-4 h-4 text-white" />}
      </button>

      {subtitleTracks.map((track) => (
        <button
          type="button"
          key={track.id}
          onClick={() => {
            onSubtitleChange?.(track.id);
            setIsOpen(false);
          }}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
        >
          <span className="text-white text-sm">{track.label}</span>
          {currentSubtitle === track.id && (
            <Check className="w-4 h-4 text-white" />
          )}
        </button>
      ))}
    </div>
  );

  const renderAudioMenu = () => (
    <div className="py-1">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <button
          type="button"
          onClick={handleBack}
          className="text-white/70 hover:text-white"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <span className="text-white font-medium text-sm">Audio</span>
        <div className="w-5" />
      </div>

      {audioTracks.map((track) => (
        <button
          type="button"
          key={track.id}
          onClick={() => {
            onAudioChange?.(track.id);
            setIsOpen(false);
          }}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
        >
          <span className="text-white text-sm">{track.label}</span>
          {currentAudio === track.id && (
            <Check className="w-4 h-4 text-white" />
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative" ref={menuRef}>
      {/* Settings button */}
      <button
        type="button"
        onClick={toggleMenu}
        className={cn(
          'p-3 rounded-full',
          'transition-all duration-300 ease-out',
          'bg-white/5 backdrop-blur-sm border border-white/10',
          'hover:bg-white/15 hover:border-white/20 hover:scale-105',
          'active:scale-95 active:bg-white/20',
          'shadow-lg shadow-black/20',
          isOpen && 'bg-white/15 border-white/20',
        )}
      >
        <Settings
          className={cn(
            'w-5 h-5 text-white drop-shadow-sm transition-transform duration-300',
            isOpen && 'rotate-45',
          )}
        />
      </button>

      {/* Menu dropdown */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-3 w-64 max-h-[70vh] overflow-y-auto styled-scrollbar bg-zinc-900/98 backdrop-blur-2xl rounded-xl shadow-2xl shadow-black/40 border border-white/15 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {currentScreen === 'main' && renderMainMenu()}
          {currentScreen === 'quality' && renderQualityMenu()}
          {currentScreen === 'speed' && renderSpeedMenu()}
          {currentScreen === 'subtitles' && renderSubtitlesMenu()}
          {currentScreen === 'audio' && renderAudioMenu()}
        </div>
      )}
    </div>
  );
}
