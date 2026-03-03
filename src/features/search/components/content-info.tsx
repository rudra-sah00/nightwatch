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
import { Button } from '@/components/ui/button';
import type { ContentProgress } from '@/features/watch/api';
import { cn } from '@/lib/utils';
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
  watchPartyDisabledReason,
  isCreatingParty = false,
  onWatchlistToggle,
  isInWatchlist = false,
  isWatchlistLoading = false,
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
            'px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider',
            isSeries
              ? 'bg-purple-600/80 text-white'
              : 'bg-blue-600/80 text-white',
          )}
        >
          {isSeries ? (
            <span className="flex items-center gap-1.5">
              <Tv className="w-3 h-3" />
              TV Series
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Film className="w-3 h-3" />
              Movie
            </span>
          )}
        </span>
      </div>

      {/* Title */}
      <h1
        id="modal-title"
        className="text-2xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg"
      >
        {show.title}
      </h1>

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
        {show.year ? (
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {show.year}
          </span>
        ) : null}
        {show.runtime ? (
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {show.runtime} min
          </span>
        ) : null}
        {isSeries && show.seasons && show.seasons.length > 0 ? (
          <span className="hidden md:inline">
            {show.seasons.length} Season{show.seasons.length > 1 ? 's' : ''}
          </span>
        ) : null}
        {show.genre ? (
          <span className="hidden md:inline">{show.genre}</span>
        ) : null}
      </div>

      {/* Description - Hidden in Hero for cleaner look (moved to body) */}
      {show.description ? (
        <p className="hidden text-white/80 text-sm md:text-base leading-relaxed max-w-2xl line-clamp-4">
          {show.description}
        </p>
      ) : null}

      {/* Progress Indicator - Netflix style */}
      {hasWatchProgress &&
      watchProgress &&
      watchProgress.progressPercent > 0 ? (
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>
              {isSeries &&
              watchProgress.seasonNumber != null &&
              watchProgress.episodeNumber != null
                ? `Continue watching S${watchProgress.seasonNumber}:E${watchProgress.episodeNumber}`
                : 'Continue watching'}
            </span>
            <span>{Math.round(watchProgress.progressPercent)}% watched</span>
          </div>
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-[width] duration-300"
              style={{ width: `${watchProgress.progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Play/Resume Button - Now for both Movies AND Series */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          className={cn(
            'gap-2.5 px-6 py-4 md:px-8 md:py-6 text-base md:text-lg font-semibold shadow-xl transition-[colors,shadow] duration-200',
            'bg-white text-black hover:bg-white/90',
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
            <Play className="w-5 h-5 fill-current" />
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
                    : isSeries
                      ? 'Play'
                      : 'Play'}
        </Button>

        {/* Watch Together Button */}
        {onWatchParty ? (
          <Button
            size="lg"
            variant="secondary"
            className={cn(
              'gap-2.5 px-6 py-4 md:px-8 md:py-6 text-base md:text-lg font-semibold shadow-lg border-0',
              isWatchPartyDisabled || isCreatingParty
                ? 'bg-gray-500/50 cursor-not-allowed opacity-80'
                : 'bg-teal-500 hover:bg-teal-600 text-white',
            )}
            onClick={
              isWatchPartyDisabled || isCreatingParty ? undefined : onWatchParty
            }
            disabled={isWatchPartyDisabled || isCreatingParty}
          >
            {isCreatingParty ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Users className="w-5 h-5" />
            )}
            {isCreatingParty
              ? 'Creating...'
              : isWatchPartyDisabled && watchPartyDisabledReason
                ? watchPartyDisabledReason
                : 'Watch Together'}
          </Button>
        ) : null}

        {/* Watchlist Action Button (Add or Remove) */}
        {onWatchlistToggle ? (
          <Button
            size="lg"
            variant={isInWatchlist ? 'destructive' : 'outline'}
            className={cn(
              'gap-2.5 px-6 py-4 md:px-8 md:py-6 text-base md:text-lg font-semibold shadow-lg transition-[colors,shadow] duration-200',
              isInWatchlist
                ? 'bg-red-500 hover:bg-red-600 text-white border-0'
                : 'border-white/20 hover:bg-white/10 text-white',
            )}
            onClick={onWatchlistToggle}
            disabled={isWatchlistLoading}
          >
            {isWatchlistLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isInWatchlist ? (
              <Trash2 className="w-5 h-5" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
          </Button>
        ) : null}
      </div>
    </div>
  );
});
