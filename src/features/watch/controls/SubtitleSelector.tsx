'use client';

import { Check, ChevronRight, Subtitles, Type, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  applySubtitleSettings,
  BACKGROUND_COLORS,
  defaultSubtitleSettings,
  SUBTITLE_FONT_SIZES,
  SUBTITLE_FONTS,
  type SubtitleSettings,
  saveSubtitleSettings,
  TEXT_COLORS,
  TEXT_SHADOWS,
} from './subtitle-settings';

// Re-export SubtitleSettings for backwards compatibility
export type { SubtitleSettings } from './subtitle-settings';

interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
}

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
  subtitleSettings = defaultSubtitleSettings,
  onSubtitleSettingsChange,
}: SubtitleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<MenuScreen>('tracks');
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside (with passive listener for better performance)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setCurrentScreen('tracks');
      }
    };

    document.addEventListener('mousedown', handleClickOutside, {
      passive: true,
    });
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (tracks.length === 0) {
    return null;
  }

  const isActive = !!currentTrack;
  const currentLabel = tracks.find((t) => t.id === currentTrack)?.label;

  const updateSettings = (newSettings: SubtitleSettings) => {
    onSubtitleSettingsChange?.(newSettings);
    applySubtitleSettings(newSettings);
    saveSubtitleSettings(newSettings);
  };

  const handleFontSizeChange = (value: string) => {
    updateSettings({ ...subtitleSettings, fontSize: value });
  };

  const handleFontFamilyChange = (value: string) => {
    updateSettings({ ...subtitleSettings, fontFamily: value });
  };

  const handleBackgroundColorChange = (value: string) => {
    updateSettings({ ...subtitleSettings, backgroundColor: value });
  };

  const handleTextColorChange = (value: string) => {
    updateSettings({ ...subtitleSettings, textColor: value });
  };

  const handleTextShadowChange = (value: string) => {
    updateSettings({ ...subtitleSettings, textShadow: value });
  };

  const handleTrackChange = (trackId: string | null) => {
    setIsLoading(true);
    onTrackChange?.(trackId);
    setIsLoading(false);
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
          onClick={() => handleTrackChange(null)}
          disabled={isLoading}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3',
            'transition-all duration-150',
            'hover:bg-white/10',
            !currentTrack && 'bg-white/5',
            'border-b border-white/5',
            isLoading && 'opacity-50 cursor-wait',
          )}
        >
          <span
            className={cn(
              'text-sm',
              !currentTrack ? 'text-white font-medium' : 'text-white/80',
            )}
          >
            Off
          </span>
          {!currentTrack && !isLoading && (
            <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-purple-400" />
            </div>
          )}
        </button>

        {tracks.map((track, index) => (
          <button
            type="button"
            key={track.id}
            onClick={() => handleTrackChange(track.id)}
            disabled={isLoading}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3',
              'transition-all duration-150',
              'hover:bg-white/10',
              currentTrack === track.id && 'bg-white/5',
              index !== tracks.length - 1 && 'border-b border-white/5',
              isLoading && 'opacity-50 cursor-wait',
            )}
          >
            <div className="flex flex-col items-start">
              <span
                className={cn(
                  'text-sm',
                  currentTrack === track.id
                    ? 'text-white font-medium'
                    : 'text-white/80',
                )}
              >
                {track.label}
              </span>
              {track.language && track.language !== track.label && (
                <span className="text-xs text-white/40">{track.language}</span>
              )}
            </div>
            {currentTrack === track.id && !isLoading && (
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

      <div className="overflow-y-auto max-h-80 overscroll-contain styled-scrollbar">
        {/* Font Size Section */}
        <div className="px-4 py-2 bg-white/5 border-b border-white/5">
          <span className="text-white/50 text-xs uppercase tracking-wider">
            Size
          </span>
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
          <span className="text-white/50 text-xs uppercase tracking-wider">
            Font
          </span>
        </div>
        {SUBTITLE_FONTS.map((font) => (
          <button
            type="button"
            key={font.value}
            onClick={() => handleFontFamilyChange(font.value)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors"
          >
            <span
              className="text-white text-sm"
              style={{ fontFamily: font.value }}
            >
              {font.label}
            </span>
            {subtitleSettings.fontFamily === font.value && (
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-purple-400" />
              </div>
            )}
          </button>
        ))}

        {/* Background Color Section */}
        <div className="px-4 py-2 bg-white/5 border-t border-b border-white/5">
          <span className="text-white/50 text-xs uppercase tracking-wider">
            Background
          </span>
        </div>
        {BACKGROUND_COLORS.map((bg) => (
          <button
            type="button"
            key={bg.value}
            onClick={() => handleBackgroundColorChange(bg.value)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded border border-white/20"
                style={{
                  backgroundColor:
                    bg.value === 'transparent' ? 'transparent' : bg.value,
                }}
              />
              <span className="text-white text-sm">{bg.label}</span>
            </div>
            {subtitleSettings.backgroundColor === bg.value && (
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-purple-400" />
              </div>
            )}
          </button>
        ))}

        {/* Text Color Section */}
        <div className="px-4 py-2 bg-white/5 border-t border-b border-white/5">
          <span className="text-white/50 text-xs uppercase tracking-wider">
            Text Color
          </span>
        </div>
        {TEXT_COLORS.map((color) => (
          <button
            type="button"
            key={color.value}
            onClick={() => handleTextColorChange(color.value)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded border border-white/20"
                style={{ backgroundColor: color.value }}
              />
              <span className="text-white text-sm">{color.label}</span>
            </div>
            {subtitleSettings.textColor === color.value && (
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-purple-400" />
              </div>
            )}
          </button>
        ))}

        {/* Text Shadow Section */}
        <div className="px-4 py-2 bg-white/5 border-t border-b border-white/5">
          <span className="text-white/50 text-xs uppercase tracking-wider">
            Text Effect
          </span>
        </div>
        {TEXT_SHADOWS.map((shadow) => (
          <button
            type="button"
            key={shadow.value}
            onClick={() => handleTextShadowChange(shadow.value)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition-colors"
          >
            <span
              className="text-white text-sm"
              style={{
                textShadow: shadow.value !== 'none' ? shadow.value : undefined,
              }}
            >
              {shadow.label}
            </span>
            {subtitleSettings.textShadow === shadow.value && (
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
            'w-64 overflow-hidden',
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
