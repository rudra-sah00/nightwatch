'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSeasonSelector } from '../hooks/use-season-selector';
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
  const { dropdownRef } = useSeasonSelector(isOpen, onToggle);

  if (seasons.length === 0) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="season-selector-menu"
        className={cn(
          'flex items-center gap-3 px-6 py-3 border-[3px] border-border  bg-background hover:bg-neo-yellow transition-colors duration-200',
          'text-foreground font-headline font-black uppercase tracking-widest text-sm sm:text-base',
        )}
      >
        {selectedSeason
          ? `SEASON ${selectedSeason.seasonNumber}`
          : 'SELECT SEASON'}
        <ChevronDown
          className={cn(
            'w-5 h-5 transition-transform duration-200 stroke-[3px]',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen ? (
        <div
          id="season-selector-menu"
          role="menu"
          className="absolute top-full right-0 mt-4 w-56 bg-white border-[3px] border-border -yellow overflow-hidden z-50 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200 motion-reduce:animate-none"
        >
          {seasons.map((season) => (
            <button
              type="button"
              key={season.seasonId}
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(season);
              }}
              className={cn(
                'w-full px-6 py-4 text-left transition-colors duration-150 border-b-[3px] last:border-b-0 border-border',
                'font-headline font-bold uppercase tracking-wider text-sm',
                selectedSeason?.seasonId === season.seasonId
                  ? 'bg-neo-blue text-white'
                  : 'bg-white text-foreground hover:bg-neo-yellow',
              )}
            >
              SEASON {season.seasonNumber}
              {season.episodeCount ? (
                <span
                  className={cn(
                    'ml-2 text-[10px] font-black',
                    selectedSeason?.seasonId === season.seasonId
                      ? 'text-white/70'
                      : 'text-[#4a4a4a]',
                  )}
                >
                  ({season.episodeCount} EP)
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
