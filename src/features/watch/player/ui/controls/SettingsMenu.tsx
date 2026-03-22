'use client';

import { Check, ChevronRight, Gauge, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Quality } from '../../context/types';
import { useSettingsMenu } from './use-settings-menu';

interface SettingsMenuProps {
  qualities: Quality[];
  currentQuality: string;
  playbackRate: number;
  onQualityChange: (quality: string) => void;
  onPlaybackRateChange: (rate: number) => void;
  disabled?: boolean;
  onInteraction?: (isActive: boolean) => void;
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function SettingsMenu({
  qualities,
  currentQuality,
  playbackRate,
  onQualityChange,
  onPlaybackRateChange,
  disabled = false,
  onInteraction,
}: SettingsMenuProps) {
  const {
    isOpen,
    setIsOpen,
    currentScreen,
    setCurrentScreen,
    menuRef,
    toggleMenu,
    handleBack,
  } = useSettingsMenu({ onInteraction });

  const renderMainMenu = () => (
    <div className="flex flex-col">
      {/* Quality */}
      <button
        type="button"
        onClick={() => setCurrentScreen('quality')}
        className="w-full flex items-center justify-between p-4 hover:bg-[#ffe066] transition-colors border-b-[3px] border-[#1a1a1a] text-[#1a1a1a]"
      >
        <div className="flex items-center gap-3">
          <Gauge className="w-5 h-5 stroke-[3px]" />
          <span className="font-black font-headline uppercase tracking-widest text-sm">
            Quality
          </span>
        </div>
        <div className="flex items-center gap-2 font-bold font-headline uppercase tracking-widest text-xs">
          <span>{currentQuality}</span>
          <ChevronRight className="w-4 h-4 stroke-[3px]" />
        </div>
      </button>

      {/* Playback Speed */}
      <button
        type="button"
        onClick={() => !disabled && setCurrentScreen('speed')}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between p-4 transition-colors text-[#1a1a1a]',
          disabled
            ? 'cursor-not-allowed bg-[#f5f0e8] text-[#4a4a4a]'
            : 'hover:bg-[#ffe066]',
        )}
      >
        <div className="flex items-center gap-3">
          <Gauge className="w-5 h-5 stroke-[3px]" />
          <span className="font-black font-headline uppercase tracking-widest text-sm">
            Speed
          </span>
        </div>
        <div className="flex items-center gap-2 font-bold font-headline uppercase tracking-widest text-xs">
          <span>{playbackRate === 1 ? 'Normal' : `${playbackRate}x`}</span>
          {disabled ? (
            <svg
              className="w-4 h-4 stroke-[3px]"
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
            <ChevronRight className="w-4 h-4 stroke-[3px]" />
          )}
        </div>
      </button>
    </div>
  );

  const renderQualityMenu = () => (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 border-b-[3px] border-[#1a1a1a] bg-[#f5f0e8]">
        <button
          type="button"
          onClick={handleBack}
          className="text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors border-[2px] border-[#1a1a1a] p-1"
        >
          <ChevronRight className="w-5 h-5 rotate-180 stroke-[3px]" />
        </button>
        <span className="text-[#1a1a1a] font-black font-headline uppercase tracking-widest text-sm">
          Quality
        </span>
        <div className="w-8" />
      </div>

      {/* Auto option */}
      <button
        type="button"
        onClick={() => {
          onQualityChange('auto');
          setIsOpen(false);
        }}
        className="w-full flex items-center justify-between p-4 hover:bg-[#ffe066] transition-colors border-b-[3px] border-[#1a1a1a] text-[#1a1a1a]"
      >
        <span className="font-bold font-headline uppercase tracking-widest text-sm">
          Auto
        </span>
        {currentQuality === 'auto' ? (
          <Check className="w-5 h-5 stroke-[3px]" />
        ) : null}
      </button>

      {qualities.map((quality) => (
        <button
          type="button"
          key={quality.label}
          onClick={() => {
            onQualityChange(quality.label);
            setIsOpen(false);
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-[#ffe066] transition-colors border-b-[3px] border-[#1a1a1a] last:border-b-0 text-[#1a1a1a]"
        >
          <span className="font-bold font-headline uppercase tracking-widest text-sm">
            {quality.label}
          </span>
          {currentQuality === quality.label ? (
            <Check className="w-5 h-5 stroke-[3px]" />
          ) : null}
        </button>
      ))}
    </div>
  );

  const renderSpeedMenu = () => (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 border-b-[3px] border-[#1a1a1a] bg-[#f5f0e8]">
        <button
          type="button"
          onClick={handleBack}
          className="text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors border-[2px] border-[#1a1a1a] p-1"
        >
          <ChevronRight className="w-5 h-5 rotate-180 stroke-[3px]" />
        </button>
        <span className="text-[#1a1a1a] font-black font-headline uppercase tracking-widest text-sm">
          Speed
        </span>
        <div className="w-8" />
      </div>

      {PLAYBACK_SPEEDS.map((speed) => (
        <button
          type="button"
          key={speed}
          onClick={() => {
            onPlaybackRateChange(speed);
            setIsOpen(false);
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-[#ffe066] transition-colors border-b-[3px] border-[#1a1a1a] last:border-b-0 text-[#1a1a1a]"
        >
          <span className="font-bold font-headline uppercase tracking-widest text-sm">
            {speed === 1 ? 'Normal' : `${speed}x`}
          </span>
          {playbackRate === speed ? (
            <Check className="w-5 h-5 stroke-[3px]" />
          ) : null}
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
        onMouseDown={(e) => e.preventDefault()}
        className={cn(
          'p-2.5 transition-all duration-200',
          'bg-white border-[3px] border-[#1a1a1a] text-[#1a1a1a] neo-shadow-sm',
          'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-[#f5f0e8]',
          'active:bg-[#e0e0e0]',
          isOpen &&
            'bg-[#f5f0e8] shadow-none translate-x-[2px] translate-y-[2px]',
        )}
      >
        <Settings
          className={cn(
            'w-5 h-5 md:w-6 md:h-6 stroke-[3px] transition-transform duration-300',
            isOpen && 'rotate-45',
          )}
        />
      </button>

      {/* Menu dropdown */}
      {isOpen ? (
        <div className="absolute bottom-full right-0 mb-3 w-64 max-h-[70vh] overflow-y-auto no-scrollbar bg-white border-[4px] border-[#1a1a1a] neo-shadow flex flex-col z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
          {currentScreen === 'main' && renderMainMenu()}
          {currentScreen === 'quality' && renderQualityMenu()}
          {currentScreen === 'speed' && renderSpeedMenu()}
        </div>
      ) : null}
    </div>
  );
}
