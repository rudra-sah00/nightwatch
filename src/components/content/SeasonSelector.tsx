'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Episode } from '@/types/content';

interface SeasonSelectorProps {
    seasons: [number, Episode[]][];
    selectedSeason: number;
    showDropdown: boolean;
    onToggleDropdown: () => void;
    onSelectSeason: (season: number) => void;
    currentSeasonEpisodes: Episode[];
}

export default function SeasonSelector({
    seasons,
    selectedSeason,
    showDropdown,
    onToggleDropdown,
    onSelectSeason,
    currentSeasonEpisodes,
}: SeasonSelectorProps) {
    if (seasons.length === 0) return null;

    if (seasons.length === 1) {
        return (
            <span className="text-zinc-400">
                Season 1 ({currentSeasonEpisodes.length} EP)
            </span>
        );
    }

    return (
        <div className="relative">
            <button
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800/80 border border-zinc-700 rounded hover:border-zinc-600 transition-colors"
                onClick={onToggleDropdown}
            >
                <span>
                    Season {selectedSeason} ({currentSeasonEpisodes.length} EP)
                </span>
                <ChevronDown
                    className={cn(
                        "w-4 h-4 transition-transform",
                        showDropdown && "rotate-180"
                    )}
                />
            </button>

            {showDropdown && (
                <div className="absolute top-full right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded overflow-hidden shadow-xl z-10 min-w-full">
                    {seasons.map(([season, eps]) => (
                        <button
                            key={season}
                            className={cn(
                                "w-full px-4 py-3 text-left hover:bg-zinc-700 transition-colors whitespace-nowrap",
                                selectedSeason === season && "bg-zinc-700"
                            )}
                            onClick={() => onSelectSeason(season)}
                        >
                            Season {season} ({eps.length} EP)
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
