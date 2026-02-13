'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Episode, Season, ShowDetails } from '../types';
import { EpisodeList } from './episode-list';
import { SeasonSelector } from './season-selector';

interface WatchPartySetupProps {
  isOpen: boolean;
  show: ShowDetails;
  seasons: Season[];
  selectedSeason: Season | null;
  episodes: Episode[];
  isLoadingEpisodes: boolean;
  onClose: () => void;
  onSelectSeason: (season: Season) => void;
  onSelectEpisode: (episode: Episode) => void;
  isCreating: boolean;
  creatingEpisodeId: string | number | null;
}

export function WatchPartySetup({
  isOpen,
  seasons,
  selectedSeason,
  episodes,
  isLoadingEpisodes,
  onClose,
  onSelectSeason,
  onSelectEpisode,
  creatingEpisodeId,
}: WatchPartySetupProps) {
  const [isSeasonOpen, setIsSeasonOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Start Watch Party
            </h3>
            <p className="text-sm text-white/60">Select an episode to begin</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!!creatingEpisodeId}
            className={cn(
              'p-2 rounded-full transition-colors',
              creatingEpisodeId
                ? 'opacity-50 cursor-not-allowed bg-white/5'
                : 'hover:bg-white/10',
            )}
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-white/5 bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/80">Season</span>
            <SeasonSelector
              seasons={seasons}
              selectedSeason={selectedSeason}
              onSelect={(s) => {
                onSelectSeason(s);
                setIsSeasonOpen(false);
              }}
              isOpen={isSeasonOpen}
              onToggle={() => setIsSeasonOpen(!isSeasonOpen)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 bg-black/20">
          <EpisodeList
            episodes={episodes}
            isLoading={isLoadingEpisodes}
            playingEpisodeId={creatingEpisodeId}
            onPlayEpisode={onSelectEpisode}
          />
        </div>
      </div>
    </div>
  );
}
