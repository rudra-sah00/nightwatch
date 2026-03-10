'use client';

import { Clock, Loader2, Play, Users, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { cn, getOptimizedImageUrl } from '@/lib/utils';
import type { Episode, Season, ShowDetails } from '../types';

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
  show,
  seasons,
  selectedSeason,
  episodes,
  isLoadingEpisodes,
  onClose,
  onSelectSeason,
  onSelectEpisode,
  creatingEpisodeId,
}: WatchPartySetupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl bg-zinc-950 border border-white/[0.08] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[82vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950/90 via-indigo-950/70 to-zinc-950" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.18),transparent_65%)]" />
          <div className="relative flex items-start justify-between gap-4 p-5 sm:p-6">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.15em] mb-0.5">
                  Watch Party
                </p>
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                  {show.title}
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  Pick an episode — everyone joins once you start
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={!!creatingEpisodeId}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40 flex-shrink-0 -mt-0.5"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white/50" />
            </button>
          </div>
        </div>

        {/* Season Tabs */}
        {seasons.length > 0 && (
          <div className="flex-shrink-0 border-b border-white/[0.06] bg-zinc-950/80">
            <div className="flex gap-1 px-4 sm:px-5 py-2.5 overflow-x-auto scrollbar-hide">
              {seasons.map((season) => {
                const isActive = selectedSeason?.seasonId === season.seasonId;
                return (
                  <button
                    key={season.seasonId}
                    type="button"
                    onClick={() => onSelectSeason(season)}
                    className={cn(
                      'flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border whitespace-nowrap',
                      isActive
                        ? 'bg-violet-500/15 text-violet-300 border-violet-500/25'
                        : 'text-white/35 hover:text-white/65 hover:bg-white/[0.05] border-transparent',
                    )}
                  >
                    Season {season.seasonNumber}
                    {season.episodeCount ? (
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full',
                          isActive
                            ? 'bg-violet-500/20 text-violet-400'
                            : 'bg-white/[0.06] text-white/25',
                        )}
                      >
                        {season.episodeCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Episode Grid */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 bg-black/30">
          {isLoadingEpisodes ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5', 'sk-6'].map((id) => (
                <div
                  key={id}
                  className="h-[84px] rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.04]"
                />
              ))}
            </div>
          ) : episodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/25 gap-3">
              <Users className="w-8 h-8 opacity-40" />
              <p className="text-sm">No episodes available for this season</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {episodes.map((episode) => {
                const isThisCreating =
                  creatingEpisodeId === episode.episodeId ||
                  creatingEpisodeId === episode.episodeNumber;
                return (
                  <PartyEpisodeCard
                    key={episode.episodeId || episode.episodeNumber}
                    episode={episode}
                    isCreating={isThisCreating}
                    isDisabled={!!creatingEpisodeId && !isThisCreating}
                    onSelect={() => onSelectEpisode(episode)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-white/[0.05] bg-zinc-950 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0 animate-pulse" />
          <p className="text-[11px] text-white/25">
            The room opens the moment you select an episode
          </p>
        </div>
      </div>
    </div>
  );
}

interface PartyEpisodeCardProps {
  episode: Episode;
  isCreating: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}

function PartyEpisodeCard({
  episode,
  isCreating,
  isDisabled,
  onSelect,
}: PartyEpisodeCardProps) {
  const [imgError, setImgError] = useState(false);
  const thumbnail = getOptimizedImageUrl(episode.thumbnailUrl);
  const durationMins = episode.duration
    ? Math.round(episode.duration / 60)
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isCreating || isDisabled}
      className={cn(
        'group flex items-center gap-3 p-2.5 rounded-xl text-left w-full transition-all duration-200 border',
        isCreating
          ? 'bg-violet-500/10 border-violet-500/25 cursor-default'
          : isDisabled
            ? 'bg-white/[0.02] border-white/[0.04] opacity-30 cursor-not-allowed'
            : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07] hover:border-violet-500/20 cursor-pointer',
      )}
    >
      {/* Thumbnail */}
      <div className="relative w-[88px] aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.04]">
        {!imgError && episode.thumbnailUrl ? (
          <Image
            src={thumbnail}
            alt={episode.title || `Episode ${episode.episodeNumber}`}
            fill
            className="object-cover"
            unoptimized={thumbnail.startsWith('/api/stream/')}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xl font-bold text-white/8">
              {episode.episodeNumber}
            </span>
          </div>
        )}

        {/* Hover / loading overlay */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-opacity',
            isCreating
              ? 'bg-black/50 opacity-100'
              : 'bg-black/40 opacity-0 group-hover:opacity-100',
          )}
        >
          {isCreating ? (
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-900/50">
              <Play className="w-3.5 h-3.5 text-white fill-current ml-0.5" />
            </div>
          )}
        </div>

        {/* Episode badge */}
        {!isCreating && (
          <div className="absolute bottom-1 left-1 px-1.5 py-px rounded bg-black/70 backdrop-blur-sm text-[9px] font-bold text-white/70 leading-4">
            E{String(episode.episodeNumber).padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {isCreating ? (
          <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-wide mb-1">
            Starting party…
          </p>
        ) : (
          <p className="text-[11px] font-medium text-white/30 mb-0.5">
            Episode {episode.episodeNumber}
          </p>
        )}
        <p
          className={cn(
            'text-sm font-semibold leading-tight line-clamp-2',
            isCreating
              ? 'text-violet-200'
              : 'text-white/75 group-hover:text-white transition-colors',
          )}
        >
          {episode.title || `Episode ${episode.episodeNumber}`}
        </p>
        {durationMins ? (
          <div className="flex items-center gap-1 mt-1.5">
            <Clock className="w-3 h-3 text-white/20" />
            <span className="text-[11px] text-white/25">{durationMins}m</span>
          </div>
        ) : null}
      </div>
    </button>
  );
}
