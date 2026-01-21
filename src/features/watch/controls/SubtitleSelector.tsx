'use client';

import { Check, ChevronRight, Subtitles, Type, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
}

export interface SubtitleSettings {
  fontSize: string;
  fontFamily: string;
}

const SUBTITLE_FONT_SIZES = [
  { label: 'Small', value: '1rem' },
  { label: 'Medium', value: '1.25rem' },
  { label: 'Large', value: '1.5rem' },
  { label: 'Extra Large', value: '2rem' },
];

const SUBTITLE_FONTS = [
  { label: 'System Default', value: 'system-ui, -apple-system, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Courier', value: 'Courier New, monospace' },
];

interface SubtitleSelectorProps {
  tracks: SubtitleTrack[];
  currentTrack?: string | null;
  onTrackChange?: (id: string | null) => void;
  subtitleSettings?: SubtitleSettings;
  onSubtitleSettingsChange?: (settings: SubtitleSettings) => void;
}

type MenuScreen = 'tracks' | 'style';

export function SubtitleSelector({
  tracks,
  currentTrack,
  onTrackChange,
  subtitleSettings = {
    fontSize: '1.25rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  onSubtitleSettingsChange,
}: SubtitleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<MenuScreen>('tracks');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setCurrentScreen('tracks');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (tracks.length === 0) {
    return null;
  }

  const isActive = !!currentTrack;
  const currentLabel = tracks.find((t) => t.id === currentTrack)?.label;

  const handleFontSizeChange = (value: string) => {
    const newSettings = { ...subtitleSettings, fontSize: value };
    onSubtitleSettingsChange?.(newSettings);
    // Apply immediately to CSS
    document.documentElement.style.setProperty('--subtitle-font-size', value);
  };

  const handleFontFamilyChange = (value: string) => {
    const newSettings = { ...subtitleSettings, fontFamily: value };
    onSubtitleSettingsChange?.(newSettings);
    // Apply immediately to CSS
    document.documentElement.style.setProperty('--subtitle-font-family', value);
  };

  const renderTracksScreen = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <span className="text-white font-medium text-sm flex items-center gap-2">
          <Subtitles className="w-4 h-4 text-white/70" />
          Subtitles
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* Scrollable Track List */}
      <div className="overflow-y-auto max-h-48 overscroll-contain styled-scrollbar">
        {/* Off option */}
        <button
          type="button"
          onClick={() => {
            onTrackChange?.(null);
          }}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3',
            'transition-all duration-150',
            'hover:bg-white/10',
            !currentTrack && 'bg-white/5',
            'border-b border-white/5',
          )}
        >
          <span
            className={cn('text-sm', !currentTrack ? 'text-white font-medium' : 'text-white/80')}
          >
            Off
          </span>
          {!currentTrack && (
            <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-purple-400" />
            </div>
          )}
        </button>

        {tracks.map((track, index) => (
          <button
            type="button"
            key={track.id}
            onClick={() => {
              onTrackChange?.(track.id);
            }}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3',
              'transition-all duration-150',
              'hover:bg-white/10',
              currentTrack === track.id && 'bg-white/5',
              index !== tracks.length - 1 && 'border-b border-white/5',
            )}
          >
            <div className="flex flex-col items-start">
              <span
                className={cn(
                  'text-sm',
                  currentTrack === track.id ? 'text-white font-medium' : 'text-white/80',
                )}
              >
                {track.label}
              </span>
              {track.language && track.language !== track.label && (
                <span className="text-xs text-white/40">{track.language}</span>
              )}
            </div>
            {currentTrack === track.id && (
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-purple-400" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Style Settings Button */}
      <button
        type="button"
        onClick={() => setCurrentScreen('style')}
        className="w-full flex items-center justify-between px-4 py-3 border-t border-white/10 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-white/70" />
          <span className="text-sm text-white/80">Subtitle Style</span>
        </div>
        <ChevronRight className="w-4 h-4 text-white/50" />
      </button>
    </>
  );

  const renderStyleScreen = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <button
          type="button"
          onClick={() => setCurrentScreen('tracks')}
          className="p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-white/60 rotate-180" />
        </button>
        <span className="text-white font-medium text-sm">Subtitle Style</span>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      <div className="overflow-y-auto max-h-64 overscroll-contain styled-scrollbar">
        {/* Font Size Section */}
        <div className="px-4 py-2 bg-white/5 border-b border-white/5">
          <span className="text-white/50 text-xs uppercase tracking-wider">Size</span>
        </div>
        {SUBTITLE_FONT_SIZES.map((size) => (
          <button
            type="button"
            key={size.value}
            onClick={() => handleFontSizeChange(size.value)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors"
          >
            <span className="text-white text-sm">{size.label}</span>
            {subtitleSettings.fontSize === size.value && (
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-purple-400" />
              </div>
            )}
          </button>
        ))}

        {/* Font Family Section */}
        <div className="px-4 py-2 bg-white/5 border-t border-b border-white/5">
          <span className="text-white/50 text-xs uppercase tracking-wider">Font</span>
        </div>
        {SUBTITLE_FONTS.map((font) => (
          <button
            type="button"
            key={font.value}
            onClick={() => handleFontFamilyChange(font.value)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors"
          >
            <span className="text-white text-sm" style={{ fontFamily: font.value }}>
              {font.label}
            </span>
            {subtitleSettings.fontFamily === font.value && (
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-purple-400" />
              </div>
            )}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="relative" ref={menuRef}>
      {/* Subtitle button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setCurrentScreen('tracks');
        }}
        className={cn(
          'p-2.5 md:p-3 rounded-full',
          'transition-all duration-300 ease-out',
          'bg-white/5 backdrop-blur-sm border border-white/10',
          'hover:bg-white/15 hover:border-white/20 hover:scale-105',
          'active:scale-95 active:bg-white/20',
          'shadow-lg shadow-black/20',
          isOpen && 'bg-white/15 border-white/20',
          isActive && 'border-purple-500/40 bg-purple-500/10',
        )}
        title={currentLabel ? `Subtitles: ${currentLabel}` : 'Subtitles Off'}
      >
        <Subtitles
          className={cn(
            'w-5 h-5 drop-shadow-sm transition-all duration-200',
            isActive ? 'text-purple-400' : 'text-white',
            isOpen && 'scale-110',
          )}
        />
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div
          className={cn(
            'absolute bottom-full right-0 mb-3',
            'w-56 overflow-hidden',
            'bg-zinc-900/98 backdrop-blur-2xl rounded-xl',
            'shadow-2xl shadow-black/40 border border-white/15',
            'animate-in fade-in slide-in-from-bottom-3 zoom-in-95 duration-200',
          )}
        >
          {currentScreen === 'tracks' && renderTracksScreen()}
          {currentScreen === 'style' && renderStyleScreen()}
        </div>
      )}
    </div>
  );
}
