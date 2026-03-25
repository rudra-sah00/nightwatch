'use client';

import { Check, Languages, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioSelector } from './use-audio-selector';

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
          'p-2.5 md:p-3 transition-all duration-200',
          'bg-white border-[3px] border-[#1a1a1a] text-[#1a1a1a] neo-shadow-sm',
          'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-[#f5f0e8]',
          'active:bg-[#e0e0e0]',
          'flex items-center justify-center',
          isOpen &&
            'bg-[#f5f0e8] translate-x-[2px] translate-y-[2px] shadow-none',
        )}
        title="Audio Language"
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
            'bg-white border-[4px] border-[#1a1a1a]',
            'neo-shadow',
            'animate-in fade-in slide-in-from-bottom-3 zoom-in-95 duration-200',
            'flex flex-col',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b-[3px] border-[#1a1a1a] bg-[#f5f0e8]">
            <span className="text-[#1a1a1a] font-black font-headline uppercase tracking-widest text-sm flex items-center gap-2">
              <Languages className="w-5 h-5 stroke-[3px]" />
              Audio
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 border-[3px] border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#e63b2e] hover:text-white transition-all neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
            >
              <X className="w-4 h-4 stroke-[3.5px]" />
            </button>
          </div>

          {/* Scrollable Track List */}
          <div className="overflow-y-auto max-h-56 overscroll-contain no-scrollbar bg-white">
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
                    ? 'bg-[#ffcc00]'
                    : 'bg-white hover:bg-[#ffe066]',
                  index !== tracks.length - 1 &&
                    'border-b-[3px] border-[#1a1a1a]',
                )}
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-black font-headline uppercase tracking-tighter text-[#1a1a1a]">
                    {track.label}
                  </span>
                  {track.language && track.language !== track.label ? (
                    <span className="text-[10px] font-bold font-headline uppercase text-[#4a4a4a] tracking-widest mt-0.5">
                      {track.language}
                    </span>
                  ) : null}
                </div>
                {currentTrack === track.id ? (
                  <Check className="w-5 h-5 text-[#1a1a1a] stroke-[3.5px]" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
