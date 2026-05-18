'use client';

import { Check, ChevronRight, Subtitles, Type, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useSubtitleSelector } from './hooks/use-subtitle-selector';
import { loadSubtitleFonts } from './utils/load-subtitle-fonts';
import {
  BACKGROUND_COLORS,
  defaultSubtitleSettings,
  SUBTITLE_FONT_SIZES,
  SUBTITLE_FONTS,
  type SubtitleSettings,
  TEXT_COLORS,
  TEXT_SHADOWS,
} from './utils/subtitle-settings';

// Re-export SubtitleSettings for backwards compatibility

interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
}

/** Props for the {@link SubtitleSelector} component. */
interface SubtitleSelectorProps {
  tracks: SubtitleTrack[];
  currentTrack?: string | null;
  onTrackChange?: (id: string | null) => void;
  subtitleSettings?: SubtitleSettings;
  onSubtitleSettingsChange?: (settings: SubtitleSettings) => void;
}

/**
 * Dropdown selector for subtitle tracks with a nested style-settings screen.
 *
 * Allows the user to pick a subtitle language (or turn subtitles off) and
 * customise font size, font family, background colour, text colour, and
 * text shadow. Hidden when no tracks are available.
 */
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
  const t = useTranslations('watch.subtitles');

  if (tracks.length === 0) {
    return null;
  }

  const renderTracksScreen = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <span className="text-white font-black font-headline uppercase tracking-widest text-sm flex items-center gap-2">
          <Subtitles className="w-5 h-5 stroke-[3px]" />
          {t('title')}
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1.5 text-white/60 hover:text-white transition-colors"
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
            'border-b border-white/10',
            isLoading ? 'opacity-50 cursor-wait' : 'hover:bg-white/10',
            !currentTrack ? 'bg-white/20 text-white' : 'text-white/80',
          )}
        >
          <span
            className={cn(
              'text-sm font-bold font-headline uppercase tracking-widest',
            )}
          >
            {t('off')}
          </span>
          {!currentTrack && !isLoading ? (
            <Check className="w-5 h-5 stroke-[3px] text-white" />
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
              isLoading ? 'opacity-50 cursor-wait' : 'hover:bg-white/10',
              currentTrack === track.id
                ? 'bg-white/20 text-white'
                : 'text-white/80',
              index !== tracks.length - 1 && 'border-b border-white/10',
            )}
          >
            <div className="flex flex-col items-start">
              <span
                className={cn(
                  'text-sm font-bold font-headline uppercase tracking-widest',
                )}
              >
                {track.label}
              </span>
              {track.language && track.language !== track.label ? (
                <span className="text-xs text-white/50 font-bold font-headline uppercase">
                  {track.language}
                </span>
              ) : null}
            </div>
            {currentTrack === track.id && !isLoading ? (
              <Check className="w-5 h-5 stroke-[3px] text-white" />
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
        className="w-full flex items-center justify-between p-4 border-t border-white/10 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Type className="w-5 h-5 stroke-[3px] text-white" />
          <span className="text-sm font-black font-headline uppercase tracking-widest text-white">
            {t('subtitleStyle')}
          </span>
        </div>
        <ChevronRight className="w-5 h-5 stroke-[3px] text-white" />
      </button>
    </>
  );

  const renderStyleScreen = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button
          type="button"
          onClick={() => setCurrentScreen('tracks')}
          className="p-1.5 text-white/60 hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4 stroke-[3px] rotate-180" />
        </button>
        <span className="text-white font-black font-headline uppercase tracking-widest text-sm">
          {t('subtitleStyle')}
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1.5 text-white/60 hover:text-white transition-colors"
        >
          <X className="w-4 h-4 stroke-[3px]" />
        </button>
      </div>

      <div className="overflow-y-auto max-h-[300px] overscroll-contain no-scrollbar">
        {/* Font Size Section */}
        <div className="px-4 py-2 border-b border-white/10">
          <span className="text-white/50 text-[10px] font-black font-headline uppercase tracking-widest">
            {t('size')}
          </span>
        </div>
        {SUBTITLE_FONT_SIZES.map((size) => (
          <button
            type="button"
            key={size.value}
            onClick={() => handleFontSizeChange(size.value)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/10 transition-colors',
              subtitleSettings.fontSize === size.value ? 'bg-white/20' : '',
            )}
          >
            <span className="text-white text-xs font-bold font-headline uppercase tracking-widest">
              {t(
                size.label.replace('subtitles.', '') as
                  | 'sizeSmall'
                  | 'sizeMedium'
                  | 'sizeLarge'
                  | 'sizeExtraLarge',
              )}
            </span>
            {subtitleSettings.fontSize === size.value ? (
              <Check className="w-4 h-4 text-white stroke-[3px]" />
            ) : null}
          </button>
        ))}

        {/* Font Family Section */}
        <div className="px-4 py-2 border-t border-white/10">
          <span className="text-white/50 text-[10px] font-black font-headline uppercase tracking-widest">
            {t('font')}
          </span>
        </div>
        {SUBTITLE_FONTS.map((font) => (
          <button
            type="button"
            key={font.value}
            onClick={() => handleFontFamilyChange(font.value)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/10 transition-colors',
              subtitleSettings.fontFamily === font.value ? 'bg-white/20' : '',
            )}
          >
            <span
              className="text-white text-xs font-bold uppercase tracking-widest"
              style={{ fontFamily: font.value }}
            >
              {font.label}
            </span>
            {subtitleSettings.fontFamily === font.value ? (
              <Check className="w-4 h-4 text-white stroke-[3px]" />
            ) : null}
          </button>
        ))}

        {/* Background Color Section */}
        <div className="px-4 py-2 border-t border-white/10">
          <span className="text-white/50 text-[10px] font-black font-headline uppercase tracking-widest">
            {t('background')}
          </span>
        </div>
        {BACKGROUND_COLORS.map((bg) => (
          <button
            type="button"
            key={bg.value}
            onClick={() => handleBackgroundColorChange(bg.value)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/10 transition-colors',
              subtitleSettings.backgroundColor === bg.value
                ? 'bg-white/20'
                : '',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-5 h-5 border border-white/20 rounded-sm"
                style={{
                  backgroundColor:
                    bg.value === 'transparent' ? 'transparent' : bg.value,
                }}
              />
              <span className="text-white text-xs font-bold font-headline uppercase tracking-widest">
                {t(bg.label.replace('subtitles.', ''))}
              </span>
            </div>
            {subtitleSettings.backgroundColor === bg.value ? (
              <Check className="w-4 h-4 text-white stroke-[3px]" />
            ) : null}
          </button>
        ))}

        {/* Text Color Section */}
        <div className="px-4 py-2 border-t border-white/10">
          <span className="text-white/50 text-[10px] font-black font-headline uppercase tracking-widest">
            {t('textColor')}
          </span>
        </div>
        {TEXT_COLORS.map((color) => (
          <button
            type="button"
            key={color.value}
            onClick={() => handleTextColorChange(color.value)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/10 transition-colors',
              subtitleSettings.textColor === color.value ? 'bg-white/20' : '',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-5 h-5 border border-white/20 rounded-sm"
                style={{ backgroundColor: color.value }}
              />
              <span className="text-white text-xs font-bold font-headline uppercase tracking-widest">
                {t(color.label.replace('subtitles.', ''))}
              </span>
            </div>
            {subtitleSettings.textColor === color.value ? (
              <Check className="w-4 h-4 text-white stroke-[3px]" />
            ) : null}
          </button>
        ))}

        {/* Text Shadow Section */}
        <div className="px-4 py-2 border-t border-white/10">
          <span className="text-white/50 text-[10px] font-black font-headline uppercase tracking-widest">
            {t('textEffect')}
          </span>
        </div>
        {TEXT_SHADOWS.map((shadow) => (
          <button
            type="button"
            key={shadow.value}
            onClick={() => handleTextShadowChange(shadow.value)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/10 transition-colors',
              subtitleSettings.textShadow === shadow.value ? 'bg-white/20' : '',
            )}
          >
            <span
              className="text-white text-xs font-bold font-headline uppercase tracking-widest"
              style={{
                textShadow: shadow.value !== 'none' ? shadow.value : undefined,
              }}
            >
              {t(shadow.label.replace('subtitles.', ''))}
            </span>
            {subtitleSettings.textShadow === shadow.value ? (
              <Check className="w-4 h-4 text-white stroke-[3px]" />
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
          'p-1 md:p-1.5 transition-colors duration-200',
          'text-white/80 hover:text-white',
          isActive && 'text-neo-yellow',
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
            'bg-black/80 backdrop-blur-xl rounded-lg flex flex-col',
            'z-[100]',
            'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-200 motion-reduce:animate-none',
          )}
        >
          {currentScreen === 'tracks' ? renderTracksScreen() : null}
          {currentScreen === 'style' ? renderStyleScreen() : null}
        </div>
      ) : null}
    </div>
  );
}
