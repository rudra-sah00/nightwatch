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
  onPlay?: () => void;
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
  hasWatchProgress,
  watchProgress,
}: Pick<ContentInfoProps, 'show' | 'hasWatchProgress' | 'watchProgress'>) {
  const isSeries = show.contentType === ContentType.Series;

  return (
    <div className="space-y-6">
      {/* Content Type Badge */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'px-3 py-1 bg-card border-2 border-border text-xs font-black font-headline uppercase tracking-widest text-foreground',
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
        className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black font-headline uppercase tracking-tighter text-foreground leading-tight"
      >
        {show.title}
      </h1>

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm font-black font-headline uppercase tracking-widest text-foreground">
        {show.year ? (
          <span className="flex items-center gap-1.5 bg-background border-[3px] border-border px-3 py-1">
            <Calendar className="w-4 h-4 stroke-[3px]" />
            {show.year}
          </span>
        ) : null}
        {show.runtime ? (
          <span className="flex items-center gap-1.5 bg-background border-[3px] border-border px-3 py-1">
            <Clock className="w-4 h-4 stroke-[3px]" />
            {show.runtime} M
          </span>
        ) : null}
        {isSeries && show.seasons && show.seasons.length > 0 ? (
          <span className="hidden md:inline bg-neo-yellow border-[3px] border-border px-3 py-1">
            {show.seasons.length} Season{show.seasons.length > 1 ? 's' : ''}
          </span>
        ) : null}
        {show.genre ? (
          <span className="hidden md:inline bg-card border-[3px] border-border px-3 py-1">
            {show.genre}
          </span>
        ) : null}
      </div>

      {/* Description */}
      {show.description ? (
        <p className="text-foreground/70 text-sm md:text-base leading-relaxed max-w-2xl border-l-[4px] border-border pl-4 my-6">
          {show.description}
        </p>
      ) : null}

      {/* Progress Indicator */}
      {hasWatchProgress &&
      watchProgress &&
      watchProgress.progressPercent > 0 ? (
        <div className="space-y-3 max-w-xl bg-card border-[4px] border-border p-4 ">
          <div className="flex items-center justify-between text-xs font-black font-headline tracking-widest uppercase text-foreground">
            <span>
              {isSeries &&
              watchProgress?.seasonNumber != null &&
              watchProgress?.episodeNumber != null
                ? `S${watchProgress.seasonNumber}:E${watchProgress.episodeNumber}`
                : 'Continue'}
            </span>
            <span>{Math.round(watchProgress?.progressPercent || 0)}%</span>
          </div>
          <div className="h-3 bg-background border-2 border-border overflow-hidden">
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${watchProgress?.progressPercent || 0}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
});

export const ContentActions = memo(function ContentActions({
  isPlaying,
  isLoadingProgress = false,
  hasWatchProgress,
  watchProgress,
  isSeries,
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
  isOfflineMode = false,
}: Omit<ContentInfoProps, 'show'> & {
  isSeries: boolean;
  isOfflineMode?: boolean;
}) {
  const handleButtonClick = () => {
    if (hasWatchProgress && onResume) {
      onResume();
    } else if (onPlay) {
      onPlay();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-4 mt-6">
      <button
        type="button"
        className={cn(
          'w-full sm:w-auto sm:min-w-[220px] flex-1',
          'flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 border-[4px] border-border font-black font-headline uppercase tracking-widest text-base md:text-lg transition-[background-color,color,border-color,opacity,transform] duration-200 whitespace-nowrap',
          isPlaying ||
            isCreatingParty ||
            (hasWatchProgress && isLoadingProgress)
            ? 'bg-background text-foreground/50 cursor-not-allowed opacity-70'
            : 'bg-neo-yellow text-foreground hover:bg-neo-yellow/80',
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
        <span className="truncate">
          {isPlaying
            ? 'Loading'
            : isLoadingProgress && hasWatchProgress
              ? 'Loading'
              : hasWatchProgress &&
                  isSeries &&
                  watchProgress?.seasonNumber != null &&
                  watchProgress?.episodeNumber != null
                ? `Resume S${watchProgress.seasonNumber}:E${watchProgress.episodeNumber}`
                : hasWatchProgress && !isSeries
                  ? `Resume`
                  : isSeries && selectedSeason
                    ? `Play S${selectedSeason.seasonNumber}:E1`
                    : 'Watch Solo'}
        </span>
      </button>

      {/* Watch Together Button */}
      {!isOfflineMode && onWatchParty && !isWatchPartyDisabled && (
        <button
          type="button"
          className={cn(
            'w-full sm:w-auto sm:min-w-[220px] flex-1',
            'flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 border-[4px] border-border font-black font-headline uppercase tracking-widest text-base md:text-lg transition-[background-color,color,border-color,opacity,transform] duration-200 whitespace-nowrap',
            isCreatingParty || isPlaying
              ? 'bg-background text-foreground/50 cursor-not-allowed opacity-70'
              : 'bg-primary text-primary-foreground hover:bg-neo-blue hover:text-white',
          )}
          onClick={isCreatingParty ? undefined : onWatchParty}
          disabled={isCreatingParty || isPlaying}
        >
          {isCreatingParty ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Users className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
          )}
          <span className="truncate">
            {isCreatingParty ? 'Creating' : 'Watch Together'}
          </span>
        </button>
      )}

      {/* Watchlist Action Button */}
      {!isOfflineMode && onWatchlistToggle && (
        <button
          type="button"
          className={cn(
            'w-full sm:w-auto sm:min-w-[220px] flex-1',
            'flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 border-[4px] border-border font-black font-headline uppercase tracking-widest text-base md:text-lg transition-[background-color,color,border-color,opacity,transform] duration-200 group whitespace-nowrap',
            isWatchlistLoading
              ? 'bg-background text-foreground/50 cursor-not-allowed opacity-70'
              : isInWatchlist
                ? 'bg-neo-red text-white hover:bg-primary hover:text-primary-foreground'
                : 'bg-card text-foreground hover:bg-primary hover:text-primary-foreground',
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
          <span className="truncate">
            {isInWatchlist ? 'Remove from List' : 'To Watchlist'}
          </span>
        </button>
      )}

      {/* Extra Actions Container (Download) */}
      {!isOfflineMode && extraActions && extraActions}
    </div>
  );
});
