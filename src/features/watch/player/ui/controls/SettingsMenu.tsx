'use client';

import { Check, ChevronRight, Gauge, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { Quality } from '../../context/types';
import { useSettingsMenu } from './hooks/use-settings-menu';

/**
 * Props for the {@link SettingsMenu} component.
 */
interface SettingsMenuProps {
  /** Available quality levels (e.g. 1080p, 720p). Empty array hides the quality sub-menu. */
  qualities: Quality[];
  /** Currently active quality label (or `"auto"`). */
  currentQuality: string;
  /** Current playback speed multiplier (1 = normal). */
  playbackRate: number;
  /** Callback when the user selects a quality level. */
  onQualityChange: (quality: string) => void;
  /** Callback when the user selects a playback speed. */
  onPlaybackRateChange: (rate: number) => void;
  /** Disables the speed sub-menu (e.g. for watch-party guests). Shows a lock icon. */
  disabled?: boolean;
  /** Notifies the parent when the menu is opened/closed so controls auto-hide can pause. */
  onInteraction?: (isActive: boolean) => void;
  /**
   * When `true`, renders the open menu as a **bottom sheet portal** (`createPortal` to `document.body`)
   * with a backdrop overlay — used on mobile. When `false`, renders an absolutely-positioned
   * dropdown anchored above the settings button — used on desktop.
   */
  compact?: boolean;
}

/** Available playback speed options shown in the speed sub-menu. */
const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * Player settings menu with quality and playback speed sub-menus.
 *
 * Renders a gear icon toggle button. When opened:
 * - **Mobile (`compact=true`):** A full-width bottom sheet is portalled to `document.body`
 *   with a dark backdrop. Animates in from the bottom.
 * - **Desktop (`compact=false`):** An absolutely-positioned dropdown appears above the button
 *   with a max height of 70vh and scroll overflow.
 *
 * The menu has three screens navigated via internal state:
 * 1. **Main menu** — lists Quality and Speed rows with current values.
 * 2. **Quality sub-menu** — lists all available quality levels plus "Auto", with a checkmark
 *    on the active selection. Selecting a quality closes the menu.
 * 3. **Speed sub-menu** — lists predefined speeds (0.25×–2×) with a checkmark on the active
 *    selection. Disabled when `disabled` is `true` (shows a lock icon).
 *
 * @param props - See {@link SettingsMenuProps}.
 */
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
  const t = useTranslations('watch.settings');

  const renderMainMenu = () => (
    <div className="flex flex-col">
      {/* Quality */}
      {!qualities || qualities.length === 0 ? null : (
        <button
          type="button"
          onClick={() => setCurrentScreen('quality')}
          className="w-full flex items-center justify-between p-4 hover:bg-neo-yellow/80 transition-colors border-b-[3px] border-border text-foreground"
        >
          <div className="flex items-center gap-3">
            <Gauge className="w-5 h-5 stroke-[3px]" />
            <span className="font-black font-headline uppercase tracking-widest text-sm">
              {t('quality')}
            </span>
          </div>
          <div className="flex items-center gap-2 font-bold font-headline uppercase tracking-widest text-xs">
            <span>{currentQuality}</span>
            <ChevronRight className="w-4 h-4 stroke-[3px]" />
          </div>
        </button>
      )}

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
            {t('speed')}
          </span>
        </div>
        <div className="flex items-center gap-2 font-bold font-headline uppercase tracking-widest text-xs">
          <span>{playbackRate === 1 ? t('normal') : `${playbackRate}x`}</span>
          {disabled ? (
            <svg
              className="w-4 h-4 stroke-[3px]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              role="img"
              aria-label={t('locked')}
            >
              <title>{t('locked')}</title>
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
          {t('quality')}
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
          {t('auto')}
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
          {t('speed')}
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
            {speed === 1 ? t('normal') : `${speed}x`}
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

      {/* Menu dropdown — bottom sheet on mobile, dropdown on desktop */}
      {isOpen ? (
        compact ? (
          createPortal(
            <>
              {/* Backdrop */}
              <button
                type="button"
                className="fixed inset-0 z-[99] bg-black/60"
                onClick={() => {
                  setIsOpen(false);
                  setCurrentScreen('main');
                }}
                aria-label="Close settings"
              />
              {/* Bottom sheet */}
              <div className="fixed bottom-0 left-0 right-0 z-[100] bg-background border-t-[4px] border-border max-h-[60vh] overflow-y-auto no-scrollbar pb-[env(safe-area-inset-bottom)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom motion-safe:duration-200 motion-reduce:animate-none">
                {currentScreen === 'main' && renderMainMenu()}
                {currentScreen === 'quality' && renderQualityMenu()}
                {currentScreen === 'speed' && renderSpeedMenu()}
              </div>
            </>,
            document.body,
          )
        ) : (
          <div className="absolute bottom-full right-0 mb-3 w-64 max-h-[70vh] overflow-y-auto no-scrollbar bg-background border-[4px] border-border  flex flex-col z-[100] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-reduce:animate-none">
            {currentScreen === 'main' && renderMainMenu()}
            {currentScreen === 'quality' && renderQualityMenu()}
            {currentScreen === 'speed' && renderSpeedMenu()}
          </div>
        )
      ) : null}
    </div>
  );
}
