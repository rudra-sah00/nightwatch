'use client';

import { Check, ChevronRight, Subtitles, Type, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadSubtitleFonts } from './load-subtitle-fonts';
import {
  BACKGROUND_COLORS,
  defaultSubtitleSettings,
  SUBTITLE_FONT_SIZES,
  SUBTITLE_FONTS,
  type SubtitleSettings,
  TEXT_COLORS,
  TEXT_SHADOWS,
} from './subtitle-settings';
import { useSubtitleSelector } from './use-subtitle-selector';

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

export function SubtitleSelector({
  tracks,
  currentTrack,
  onTrackChange,
  subtitleSettings = defaultSubtitleSettings,
  onSubtitleSettingsChange,
}: SubtitleSelectorProps) {
  const {
    menuRef,
    isOpen,
    setIsOpen,
    currentScreen,
    setCurrentScreen,
    isLoading,
    isActive,
    currentLabel,
    toggleMenu,
    handleFontSizeChange,
    handleFontFamilyChange,
    handleBackgroundColorChange,
    handleTextColorChange,
    handleTextShadowChange,
    handleTrackChange,
  } = useSubtitleSelector({
    tracks,
    currentTrack,
    onTrackChange,
    subtitleSettings,
    onSubtitleSettingsChange,
  });

  if (tracks.length === 0) {
    return null;
  }

  const renderTracksScreen = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-[3px] border-[#1a1a1a] bg-[#f5f0e8]">
        <span className="text-[#1a1a1a] font-black font-headline uppercase tracking-widest text-sm flex items-center gap-2">
          <Subtitles className="w-5 h-5 stroke-[3px]" />
          Subtitles
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1.5 border-[3px] border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#e63b2e] hover:text-white transition-all neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
        >
          <X className="w-4 h-4 stroke-[3px]" />
        </button>
      </div>

      {/* Scrollable Track List */}
      <div className="overflow-y-auto max-h-48 overscroll-contain no-scrollbar">
        {/* Off option */}
        <button
          type="button"
          onClick={() => handleTrackChange(null)}
          disabled={isLoading}
          className={cn(
            'w-full flex items-center justify-between p-4',
            'transition-colors duration-150',
            'border-b-[3px] border-[#1a1a1a]',
            isLoading ? 'opacity-50 cursor-wait' : 'hover:bg-[#ffe066]',
            !currentTrack ? 'bg-[#ffcc00]' : 'bg-white',
          )}
        >
          <span
            className={cn(
              'text-sm font-bold font-headline uppercase tracking-widest text-[#1a1a1a]',
            )}
          >
            Off
          </span>
          {!currentTrack && !isLoading ? (
            <Check className="w-5 h-5 stroke-[3px] text-[#1a1a1a]" />
          ) : null}
        </button>

        {tracks.map((track, index) => (
          <button
            type="button"
            key={track.id}
            onClick={() => handleTrackChange(track.id)}
            disabled={isLoading}
            className={cn(
              'w-full flex items-center justify-between p-4',
              'transition-colors duration-150',
              isLoading ? 'opacity-50 cursor-wait' : 'hover:bg-[#ffe066]',
              currentTrack === track.id ? 'bg-[#ffcc00]' : 'bg-white',
              index !== tracks.length - 1 && 'border-b-[3px] border-[#1a1a1a]',
            )}
          >
            <div className="flex flex-col items-start">
              <span
                className={cn(
                  'text-sm font-bold font-headline uppercase tracking-widest text-[#1a1a1a]',
                )}
              >
                {track.label}
              </span>
              {track.language && track.language !== track.label ? (
                <span className="text-xs text-[#4a4a4a] font-bold font-headline uppercase">
                  {track.language}
                </span>
              ) : null}
            </div>
            {currentTrack === track.id && !isLoading ? (
              <Check className="w-5 h-5 stroke-[3px] text-[#1a1a1a]" />
            ) : null}
          </button>
        ))}
      </div>

      {/* Style Settings Button */}
      <button
        type="button"
        onClick={() => {
          loadSubtitleFonts();
          setCurrentScreen('style');
        }}
        className="w-full flex items-center justify-between p-4 border-t-[3px] border-[#1a1a1a] bg-[#f5f0e8] hover:bg-[#ffe066] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Type className="w-5 h-5 stroke-[3px] text-[#1a1a1a]" />
          <span className="text-sm font-black font-headline uppercase tracking-widest text-[#1a1a1a]">
            Subtitle Style
          </span>
        </div>
        <ChevronRight className="w-5 h-5 stroke-[3px] text-[#1a1a1a]" />
      </button>
    </>
  );

  const renderStyleScreen = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-[3px] border-[#1a1a1a] bg-[#f5f0e8]">
        <button
          type="button"
          onClick={() => setCurrentScreen('tracks')}
          className="p-1.5 border-[3px] border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#ffcc00] transition-all neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
        >
          <ChevronRight className="w-4 h-4 stroke-[3px] rotate-180" />
        </button>
        <span className="text-[#1a1a1a] font-black font-headline uppercase tracking-widest text-sm">
          Subtitle Style
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1.5 border-[3px] border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#e63b2e] hover:text-white transition-all neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
        >
          <X className="w-4 h-4 stroke-[3px]" />
        </button>
      </div>

      <div className="overflow-y-auto max-h-[300px] overscroll-contain no-scrollbar bg-white">
        {/* Font Size Section */}
        <div className="px-4 py-2 bg-[#f5f0e8] border-b-[3px] border-[#1a1a1a]">
          <span className="text-[#1a1a1a]/50 text-[10px] font-black font-headline uppercase tracking-widest">
            Size
          </span>
        </div>
        {SUBTITLE_FONT_SIZES.map((size) => (
          <button
            type="button"
            key={size.value}
            onClick={() => handleFontSizeChange(size.value)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 border-b-[2px] border-[#1a1a1a]/10 hover:bg-[#ffe066] transition-colors',
              subtitleSettings.fontSize === size.value
                ? 'bg-[#ffcc00]/30'
                : 'bg-white',
            )}
          >
            <span className="text-[#1a1a1a] text-xs font-bold font-headline uppercase tracking-widest">
              {size.label}
            </span>
            {subtitleSettings.fontSize === size.value ? (
              <Check className="w-4 h-4 text-[#1a1a1a] stroke-[3px]" />
            ) : null}
          </button>
        ))}

        {/* Font Family Section */}
        <div className="px-4 py-2 bg-[#f5f0e8] border-y-[3px] border-[#1a1a1a]">
          <span className="text-[#1a1a1a]/50 text-[10px] font-black font-headline uppercase tracking-widest">
            Font
          </span>
        </div>
        {SUBTITLE_FONTS.map((font) => (
          <button
            type="button"
            key={font.value}
            onClick={() => handleFontFamilyChange(font.value)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 border-b-[2px] border-[#1a1a1a]/10 hover:bg-[#ffe066] transition-colors',
              subtitleSettings.fontFamily === font.value
                ? 'bg-[#ffcc00]/30'
                : 'bg-white',
            )}
          >
            <span
              className="text-[#1a1a1a] text-xs font-bold uppercase tracking-widest"
              style={{ fontFamily: font.value }}
            >
              {font.label}
            </span>
            {subtitleSettings.fontFamily === font.value ? (
              <Check className="w-4 h-4 text-[#1a1a1a] stroke-[3px]" />
            ) : null}
          </button>
        ))}

        {/* Background Color Section */}
        <div className="px-4 py-2 bg-[#f5f0e8] border-y-[3px] border-[#1a1a1a]">
          <span className="text-[#1a1a1a]/50 text-[10px] font-black font-headline uppercase tracking-widest">
            Background
          </span>
        </div>
        {BACKGROUND_COLORS.map((bg) => (
          <button
            type="button"
            key={bg.value}
            onClick={() => handleBackgroundColorChange(bg.value)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 border-b-[2px] border-[#1a1a1a]/10 hover:bg-[#ffe066] transition-colors',
              subtitleSettings.backgroundColor === bg.value
                ? 'bg-[#ffcc00]/30'
                : 'bg-white',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-5 h-5 border-[2px] border-[#1a1a1a] neo-shadow-sm"
                style={{
                  backgroundColor:
                    bg.value === 'transparent' ? 'transparent' : bg.value,
                }}
              />
              <span className="text-[#1a1a1a] text-xs font-bold font-headline uppercase tracking-widest">
                {bg.label}
              </span>
            </div>
            {subtitleSettings.backgroundColor === bg.value ? (
              <Check className="w-4 h-4 text-[#1a1a1a] stroke-[3px]" />
            ) : null}
          </button>
        ))}

        {/* Text Color Section */}
        <div className="px-4 py-2 bg-[#f5f0e8] border-y-[3px] border-[#1a1a1a]">
          <span className="text-[#1a1a1a]/50 text-[10px] font-black font-headline uppercase tracking-widest">
            Text Color
          </span>
        </div>
        {TEXT_COLORS.map((color) => (
          <button
            type="button"
            key={color.value}
            onClick={() => handleTextColorChange(color.value)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 border-b-[2px] border-[#1a1a1a]/10 hover:bg-[#ffe066] transition-colors',
              subtitleSettings.textColor === color.value
                ? 'bg-[#ffcc00]/30'
                : 'bg-white',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-5 h-5 border-[2px] border-[#1a1a1a] neo-shadow-sm"
                style={{ backgroundColor: color.value }}
              />
              <span className="text-[#1a1a1a] text-xs font-bold font-headline uppercase tracking-widest">
                {color.label}
              </span>
            </div>
            {subtitleSettings.textColor === color.value ? (
              <Check className="w-4 h-4 text-[#1a1a1a] stroke-[3px]" />
            ) : null}
          </button>
        ))}

        {/* Text Shadow Section */}
        <div className="px-4 py-2 bg-[#f5f0e8] border-y-[3px] border-[#1a1a1a]">
          <span className="text-[#1a1a1a]/50 text-[10px] font-black font-headline uppercase tracking-widest">
            Text Effect
          </span>
        </div>
        {TEXT_SHADOWS.map((shadow) => (
          <button
            type="button"
            key={shadow.value}
            onClick={() => handleTextShadowChange(shadow.value)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 border-b-[2px] border-[#1a1a1a]/10 hover:bg-[#ffe066] transition-colors',
              subtitleSettings.textShadow === shadow.value
                ? 'bg-[#ffcc00]/30'
                : 'bg-white',
            )}
          >
            <span
              className="text-[#1a1a1a] text-xs font-bold font-headline uppercase tracking-widest"
              style={{
                textShadow: shadow.value !== 'none' ? shadow.value : undefined,
              }}
            >
              {shadow.label}
            </span>
            {subtitleSettings.textShadow === shadow.value ? (
              <Check className="w-4 h-4 text-[#1a1a1a] stroke-[3px]" />
            ) : null}
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
        onClick={toggleMenu}
        className={cn(
          'p-2.5 md:p-3 transition-all duration-200',
          'bg-white border-[3px] border-[#1a1a1a] text-[#1a1a1a] neo-shadow-sm',
          'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-[#f5f0e8]',
          'active:bg-[#e0e0e0]',
          isOpen &&
            'bg-[#f5f0e8] translate-x-[2px] translate-y-[2px] shadow-none',
          isActive && !isOpen && 'bg-[#ffcc00]',
        )}
        title={currentLabel ? `Subtitles: ${currentLabel}` : 'Subtitles Off'}
      >
        <Subtitles
          className={cn(
            'w-5 h-5 md:w-6 md:h-6 stroke-[3px] transition-transform duration-200',
            isOpen && 'scale-110',
          )}
        />
      </button>

      {/* Dropdown Card */}
      {isOpen ? (
        <div
          className={cn(
            'absolute bottom-full right-0 mb-3',
            'w-64 overflow-hidden',
            'bg-white border-[4px] border-[#1a1a1a] flex flex-col',
            'neo-shadow',
            'animate-in fade-in slide-in-from-bottom-3 duration-200',
          )}
        >
          {currentScreen === 'tracks' ? renderTracksScreen() : null}
          {currentScreen === 'style' ? renderStyleScreen() : null}
        </div>
      ) : null}
    </div>
  );
}
