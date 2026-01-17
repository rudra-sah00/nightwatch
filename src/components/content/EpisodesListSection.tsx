'use client';

import { CheckIcon, PlayIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { DropdownSelector } from '@/components/ui/dropdown-selector';
import type { Episode, ShowDetails } from '@/types/content';

interface EpisodesListProps {
  showDetails: ShowDetails;
  currentEpisodeId?: string | null;
  selectedSeason: number;
  seasonEpisodes: Episode[];
  contentId: string;
  onSeasonChange: (season: number) => void;
  onEpisodeClick: (episodeId: string) => void;
}

export function EpisodesList({
  showDetails,
  currentEpisodeId,
  selectedSeason,
  seasonEpisodes,
  onSeasonChange,
  onEpisodeClick,
}: EpisodesListProps) {
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);

  // Prepare grouped seasons for dropdown
  const groupedSeasons: [number, Episode[]][] = (() => {
    if (!showDetails?.episodes || !showDetails?.seasons) {
      return [];
    }

    const groups = new Map<number, Episode[]>();

    // Initialize all seasons from API
    for (const season of showDetails.seasons) {
      const seasonNum = season.season_number || 1;
      groups.set(seasonNum, []);
    }

    // Add episodes to their respective seasons
    for (const ep of showDetails.episodes) {
      const season = ep.season_number || 1;
      if (!groups.has(season)) {
        groups.set(season, []);
      }
      groups.get(season)?.push(ep);
    }

    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  })();

  return (
    <div className="mt-12 border-t border-zinc-800 pt-8">
      {/* Season Selector */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Episodes</h2>
        <DropdownSelector
          options={groupedSeasons.map(([seasonNum, eps]) => {
            const seasonInfo = showDetails.seasons?.find((s) => s.season_number === seasonNum);
            return {
              value: seasonNum,
              label: `Season ${seasonNum}`,
              count: seasonInfo?.episode_count ?? eps.length,
            };
          })}
          selectedValue={selectedSeason}
          isOpen={showSeasonDropdown}
          onToggle={() => setShowSeasonDropdown(!showSeasonDropdown)}
          onSelect={(season) => {
            onSeasonChange(season);
            setShowSeasonDropdown(false);
          }}
        />
      </div>

      {/* Episodes Grid */}
      <div className="grid grid-cols-1 gap-3">
        {seasonEpisodes.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            No episodes available for this season
          </div>
        ) : (
          seasonEpisodes.map((episode) => {
            const isCurrentEpisode = episode.episode_id === currentEpisodeId;
            return (
              <button
                type="button"
                key={episode.episode_id}
                onClick={() => {
                  if (!isCurrentEpisode) {
                    onEpisodeClick(episode.episode_id);
                  }
                }}
                className={`group flex gap-4 p-4 rounded-lg transition-all ${
                  isCurrentEpisode
                    ? 'bg-zinc-800 border-2 border-white'
                    : 'bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Episode Thumbnail */}
                <div className="relative flex-shrink-0 w-40 h-24 bg-zinc-800 rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={episode.thumbnail_url}
                    alt={episode.title || `Episode ${episode.episode_number}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"%3E%3Crect fill="%2327272a" width="160" height="90"/%3E%3C/svg%3E';
                    }}
                  />
                  {isCurrentEpisode ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <CheckIcon className="w-8 h-8 text-white" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayIcon className="w-8 h-8 text-white" />
                    </div>
                  )}
                  {episode.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs text-white">
                      {episode.duration}m
                    </div>
                  )}
                </div>

                {/* Episode Info */}
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span
                          className={`text-sm font-semibold ${
                            isCurrentEpisode ? 'text-white' : 'text-zinc-400'
                          }`}
                        >
                          {episode.episode_number}
                        </span>
                        <h3
                          className={`text-lg font-semibold truncate ${
                            isCurrentEpisode ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                          }`}
                        >
                          {episode.title || `Episode ${episode.episode_number}`}
                        </h3>
                      </div>
                      {episode.description && (
                        <p className="text-sm text-zinc-400 line-clamp-2 mt-1">
                          {episode.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
