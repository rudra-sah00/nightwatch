'use client';

import { Check, ChevronRight, Gauge, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Quality } from '../../context/types';
import { useSettingsMenu } from './hooks/use-settings-menu';

interface SettingsMenuProps {
  qualities: Quality[];
  currentQuality: string;
  playbackRate: number;
  onQualityChange: (quality: string) => void;
  onPlaybackRateChange: (rate: number) => void;
  disabled?: boolean;
  onInteraction?: (isActive: boolean) => void;
  compact?: boolean;
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
  compact = false,
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
        className="w-full flex items-center justify-between p-4 hover:bg-neo-yellow/80 transition-colors border-b-[3px] border-border text-foreground"
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
          'w-full flex items-center justify-between p-4 transition-colors text-foreground',
          disabled
            ? 'cursor-not-allowed bg-background text-foreground/70'
            : 'hover:bg-neo-yellow/80',
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
      <div className="flex items-center justify-between p-4 border-b-[3px] border-border bg-background">
        <button
          type="button"
          onClick={handleBack}
          className="text-foreground hover:bg-primary hover:text-primary-foreground transition-colors border-[2px] border-border p-1"
        >
          <ChevronRight className="w-5 h-5 rotate-180 stroke-[3px]" />
        </button>
        <span className="text-foreground font-black font-headline uppercase tracking-widest text-sm">
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
        className="w-full flex items-center justify-between p-4 hover:bg-neo-yellow/80 transition-colors border-b-[3px] border-border text-foreground"
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
          className="w-full flex items-center justify-between p-4 hover:bg-neo-yellow/80 transition-colors border-b-[3px] border-border last:border-b-0 text-foreground"
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
      <div className="flex items-center justify-between p-4 border-b-[3px] border-border bg-background">
        <button
          type="button"
          onClick={handleBack}
          className="text-foreground hover:bg-primary hover:text-primary-foreground transition-colors border-[2px] border-border p-1"
        >
          <ChevronRight className="w-5 h-5 rotate-180 stroke-[3px]" />
        </button>
        <span className="text-foreground font-black font-headline uppercase tracking-widest text-sm">
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
          className="w-full flex items-center justify-between p-4 hover:bg-neo-yellow/80 transition-colors border-b-[3px] border-border last:border-b-0 text-foreground"
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
          compact
            ? 'p-1.5 transition-colors duration-200'
            : 'p-2.5 transition-colors duration-200',
          'bg-background border-[3px] border-border text-foreground ',
          'hover:bg-neo-yellow/80',
          'active:bg-neo-yellow',
          isOpen && 'bg-background shadow-none',
        )}
      >
        <Settings
          className={cn(
            compact
              ? 'w-4 h-4 stroke-[3px] transition-transform duration-300'
              : 'w-5 h-5 md:w-6 md:h-6 stroke-[3px] transition-transform duration-300',
            isOpen && 'rotate-45',
          )}
        />
      </button>

      {/* Menu dropdown */}
      {isOpen ? (
        <div className="absolute bottom-full right-0 mb-3 w-64 max-h-[70vh] overflow-y-auto no-scrollbar bg-background border-[4px] border-border  flex flex-col z-[100] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-reduce:animate-none">
          {currentScreen === 'main' && renderMainMenu()}
          {currentScreen === 'quality' && renderQualityMenu()}
          {currentScreen === 'speed' && renderSpeedMenu()}
        </div>
      ) : null}
    </div>
  );
}
