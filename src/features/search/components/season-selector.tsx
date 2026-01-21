'use client';

import { ChevronDown } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import type { Season } from '../types';

interface SeasonSelectorProps {
  seasons: Season[];
  selectedSeason: Season | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (season: Season) => void;
}

export function SeasonSelector({
  seasons,
  selectedSeason,
  isOpen,
  onToggle,
  onSelect,
}: SeasonSelectorProps) {
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (isOpen) {
        onToggle();
      }
    };

    if (isOpen) {
      // Delay to prevent immediate close on the same click
      const timeout = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timeout);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isOpen, onToggle]);

  if (seasons.length === 0) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg',
          'bg-white/5 hover:bg-white/10 border border-white/10',
          'text-white font-medium transition-colors',
        )}
      >
        {selectedSeason
          ? `Season ${selectedSeason.seasonNumber}`
          : 'Select Season'}
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900/95 backdrop-blur-xl rounded-lg border border-white/10 shadow-2xl overflow-hidden z-50">
          {seasons.map((season) => (
            <button
              type="button"
              key={season.seasonId}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(season);
              }}
              className={cn(
                'w-full px-4 py-3 text-left text-sm transition-colors',
                'hover:bg-white/10',
                selectedSeason?.seasonId === season.seasonId
                  ? 'text-primary bg-primary/10'
                  : 'text-white',
              )}
            >
              Season {season.seasonNumber}
              {season.episodeCount && (
                <span className="text-muted-foreground ml-2">
                  ({season.episodeCount} episodes)
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
