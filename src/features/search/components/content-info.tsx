'use client';

import {
  Calendar,
  Clock,
  Film,
  Loader2,
  Play,
  Plus,
  Trash2,
  Tv,
  Users,
} from 'lucide-react';
import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { ContentProgress } from '@/types/content';
import { ContentType, type ShowDetails } from '../types';

interface ContentInfoProps {
  show: ShowDetails;
  isPlaying: boolean;
  isLoadingProgress?: boolean;
  hasWatchProgress?: boolean;
  watchProgress?: ContentProgress | null;
  selectedSeason?: { seasonNumber: number } | null;
  onPlay: () => void;
  onResume?: () => void;
  onWatchParty?: () => void;
  isWatchPartyDisabled?: boolean;
  watchPartyDisabledReason?: string;
  isCreatingParty?: boolean;
  onWatchlistToggle?: () => void;
  isInWatchlist?: boolean;
  isWatchlistLoading?: boolean;
  /** Additional action buttons rendered inside the main action row */
  extraActions?: React.ReactNode;
}

export const ContentInfo = memo(function ContentInfo({
  show,
  isPlaying,
  isLoadingProgress = false,
  hasWatchProgress,
  watchProgress,
  selectedSeason,
  onPlay,
  onResume,
  onWatchParty,
  isWatchPartyDisabled,
  isCreatingParty = false,
  onWatchlistToggle,
  isInWatchlist = false,
  isWatchlistLoading = false,
  extraActions,
}: ContentInfoProps) {
  const isSeries = show.contentType === ContentType.Series;

  const handleButtonClick = () => {
    if (hasWatchProgress && onResume) {
      onResume();
    } else {
      onPlay();
    }
  };

  return (
    <div className="space-y-6">
      {/* Content Type Badge */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'px-3 py-1 bg-white border-2 border-[#1a1a1a] text-xs font-black font-headline uppercase tracking-widest text-[#1a1a1a]',
            isSeries ? '' : '',
          )}
        >
          {isSeries ? (
            <span className="flex items-center gap-2">
              <Tv className="w-4 h-4 stroke-[3px]" />
              Series
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Film className="w-4 h-4 stroke-[3px]" />
              Movie
            </span>
          )}
        </span>
      </div>

      {/* Title */}
      <h1
        id="modal-title"
        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black font-headline uppercase tracking-tighter text-[#1a1a1a] leading-tight"
      >
        {show.title}
      </h1>

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm font-black font-headline uppercase tracking-widest text-[#1a1a1a]">
        {show.year ? (
          <span className="flex items-center gap-1.5 bg-[#f5f0e8] border-[3px] border-[#1a1a1a] px-3 py-1">
            <Calendar className="w-4 h-4 stroke-[3px]" />
            {show.year}
          </span>
        ) : null}
        {show.runtime ? (
          <span className="flex items-center gap-1.5 bg-[#f5f0e8] border-[3px] border-[#1a1a1a] px-3 py-1">
            <Clock className="w-4 h-4 stroke-[3px]" />
            {show.runtime} M
          </span>
        ) : null}
        {isSeries && show.seasons && show.seasons.length > 0 ? (
          <span className="hidden md:inline bg-[#ffcc00] border-[3px] border-[#1a1a1a] px-3 py-1">
            {show.seasons.length} Season{show.seasons.length > 1 ? 's' : ''}
          </span>
        ) : null}
        {show.genre ? (
          <span className="hidden md:inline bg-white border-[3px] border-[#1a1a1a] px-3 py-1">
            {show.genre}
          </span>
        ) : null}
      </div>

      {/* Description */}
      {show.description ? (
        <p className="text-[#4a4a4a] text-sm md:text-base leading-relaxed max-w-2xl border-l-[4px] border-[#1a1a1a] pl-4 my-6">
          {show.description}
        </p>
      ) : null}

      {/* Progress Indicator */}
      {hasWatchProgress &&
      watchProgress &&
      watchProgress.progressPercent > 0 ? (
        <div className="space-y-3 max-w-xl bg-white border-[4px] border-[#1a1a1a] p-4 neo-shadow-sm">
          <div className="flex items-center justify-between text-xs font-black font-headline tracking-widest uppercase text-[#1a1a1a]">
            <span>
              {isSeries &&
              watchProgress?.seasonNumber != null &&
              watchProgress?.episodeNumber != null
                ? `S${watchProgress.seasonNumber}:E${watchProgress.episodeNumber}`
                : 'Continue'}
            </span>
            <span>{Math.round(watchProgress?.progressPercent || 0)}%</span>
          </div>
          <div className="h-3 bg-[#f5f0e8] border-2 border-[#1a1a1a] overflow-hidden">
            <div
              className="h-full bg-[#1a1a1a] transition-[width] duration-300"
              style={{ width: `${watchProgress?.progressPercent || 0}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Play/Resume Button */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 md:gap-4 mt-6">
        <button
          type="button"
          className={cn(
            'flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 border-[4px] border-[#1a1a1a] font-black font-headline uppercase tracking-widest text-base md:text-lg transition-all duration-200',
            isPlaying ||
              isCreatingParty ||
              (hasWatchProgress && isLoadingProgress)
              ? 'bg-[#f5f0e8] text-[#4a4a4a] cursor-not-allowed opacity-70'
              : 'bg-[#ffcc00] text-[#1a1a1a] neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-[#ffe066]',
          )}
          onClick={handleButtonClick}
          disabled={
            isPlaying ||
            isCreatingParty ||
            (hasWatchProgress && isLoadingProgress)
          }
        >
          {isPlaying ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isLoadingProgress && hasWatchProgress ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5 md:w-6 md:h-6 fill-current stroke-[3px]" />
          )}
          {isPlaying
            ? 'Loading...'
            : isLoadingProgress && hasWatchProgress
              ? 'Loading...'
              : hasWatchProgress &&
                  isSeries &&
                  watchProgress?.seasonNumber != null &&
                  watchProgress?.episodeNumber != null
                ? `Resume S${watchProgress.seasonNumber}:E${watchProgress.episodeNumber}`
                : hasWatchProgress && !isSeries
                  ? `Resume (${Math.round(watchProgress?.progressPercent || 0)}%)`
                  : isSeries && selectedSeason
                    ? `Play S${selectedSeason.seasonNumber}:E1`
                    : 'Watch Solo'}
        </button>

        {/* Watch Together Button */}
        {onWatchParty && !isWatchPartyDisabled ? (
          <button
            type="button"
            className={cn(
              'flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 border-[4px] border-[#1a1a1a] font-black font-headline uppercase tracking-widest text-base md:text-lg transition-all duration-200',
              isCreatingParty
                ? 'bg-[#f5f0e8] text-[#4a4a4a] cursor-not-allowed opacity-70'
                : 'bg-[#1a1a1a] text-white neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-[#0055ff]',
            )}
            onClick={isCreatingParty ? undefined : onWatchParty}
            disabled={isCreatingParty}
          >
            {isCreatingParty ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Users className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
            )}
            {isCreatingParty ? 'Creating...' : 'Start Party'}
          </button>
        ) : null}

        {/* Watchlist Action Button */}
        {onWatchlistToggle ? (
          <button
            type="button"
            className={cn(
              'flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 border-[4px] border-[#1a1a1a] font-black font-headline uppercase tracking-widest text-base md:text-lg transition-all duration-200 group',
              isWatchlistLoading
                ? 'bg-[#f5f0e8] text-[#4a4a4a] cursor-not-allowed opacity-70'
                : isInWatchlist
                  ? 'bg-[#e63b2e] text-white neo-shadow-sm hover:bg-[#1a1a1a]'
                  : 'bg-white text-[#1a1a1a] neo-shadow-sm hover:bg-[#1a1a1a] hover:text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
            )}
            onClick={onWatchlistToggle}
            disabled={isWatchlistLoading}
          >
            {isWatchlistLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isInWatchlist ? (
              <Trash2 className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
            ) : (
              <Plus className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
            )}
            <span className="hidden sm:inline">
              {isInWatchlist ? 'Remove' : 'Watchlist'}
            </span>
          </button>
        ) : null}

        {extraActions}
      </div>
    </div>
  );
});
