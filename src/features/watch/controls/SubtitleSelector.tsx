'use client';

import { Check, Subtitles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
}

interface SubtitleSelectorProps {
  tracks: SubtitleTrack[];
  currentTrack?: string | null;
  onTrackChange?: (id: string | null) => void;
}

export function SubtitleSelector({ tracks, currentTrack, onTrackChange }: SubtitleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
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

  return (
    <div className="relative" ref={menuRef}>
      {/* Subtitle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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
            'w-56 max-h-72 overflow-hidden',
            'bg-zinc-900/98 backdrop-blur-2xl rounded-xl',
            'shadow-2xl shadow-black/40 border border-white/15',
            'animate-in fade-in slide-in-from-bottom-3 zoom-in-95 duration-200',
          )}
        >
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
          <div className="overflow-y-auto max-h-56 overscroll-contain styled-scrollbar">
            {/* Off option */}
            <button
              type="button"
              onClick={() => {
                onTrackChange?.(null);
                setIsOpen(false);
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
                className={cn(
                  'text-sm',
                  !currentTrack ? 'text-white font-medium' : 'text-white/80',
                )}
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
                  setIsOpen(false);
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
        </div>
      )}
    </div>
  );
}
