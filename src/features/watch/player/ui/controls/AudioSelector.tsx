'use client';

import { Check, Languages, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useAudioSelector } from './hooks/use-audio-selector';

interface AudioTrack {
  id: string;
  label: string;
  language: string;
}

interface AudioSelectorProps {
  tracks: AudioTrack[];
  currentTrack?: string;
  onTrackChange?: (id: string) => void;
  disabled?: boolean;
}

export function AudioSelector({
  tracks,
  currentTrack,
  onTrackChange,
  disabled = false,
}: AudioSelectorProps) {
  const { isOpen, setIsOpen, menuRef } = useAudioSelector();
  const t = useTranslations('watch.audio');

  if (tracks.length <= 1 || disabled) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Audio button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-2.5 md:p-3 transition-colors duration-200',
          'bg-background border-[3px] border-border text-foreground ',
          'hover:bg-muted',
          'active:bg-muted',
          'flex items-center justify-center',
          isOpen && 'bg-background shadow-none',
        )}
        title={t('audioLanguage')}
      >
        <Languages
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
            'w-64 max-h-80 overflow-hidden',
            'bg-background border-[4px] border-border',
            '',
            'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none',
            'flex flex-col z-[100]',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b-[3px] border-border bg-background">
            <span className="text-foreground font-black font-headline uppercase tracking-widest text-sm flex items-center gap-2">
              <Languages className="w-5 h-5 stroke-[3px]" />
              {t('title')}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 border-[3px] border-border bg-background text-foreground hover:bg-neo-red hover:text-primary-foreground transition-colors "
            >
              <X className="w-4 h-4 stroke-[3.5px]" />
            </button>
          </div>

          {/* Scrollable Track List */}
          <div className="overflow-y-auto max-h-56 overscroll-contain no-scrollbar bg-background">
            {tracks.map((track, index) => (
              <button
                type="button"
                key={track.id}
                onClick={() => {
                  onTrackChange?.(track.id);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-4',
                  'transition-colors duration-150',
                  currentTrack === track.id
                    ? 'bg-neo-yellow'
                    : 'bg-background hover:bg-neo-yellow/80',
                  index !== tracks.length - 1 && 'border-b-[3px] border-border',
                )}
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-black font-headline uppercase tracking-tighter text-foreground">
                    {track.label}
                  </span>
                  {track.language && track.language !== track.label ? (
                    <span className="text-[10px] font-bold font-headline uppercase text-foreground/70 tracking-widest mt-0.5">
                      {track.language}
                    </span>
                  ) : null}
                </div>
                {currentTrack === track.id ? (
                  <Check className="w-5 h-5 text-foreground stroke-[3.5px]" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
