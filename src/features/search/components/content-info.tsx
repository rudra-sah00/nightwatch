'use client';

import { Calendar, Clock, Film, Loader2, Play, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ContentType, type ShowDetails } from '../types';

interface WatchProgress {
  seasonNumber?: number;
  episodeNumber?: number;
  progressSeconds: number;
  progressPercent: number;
}

interface ContentInfoProps {
  show: ShowDetails;
  isPlaying: boolean;
  hasWatchProgress?: boolean;
  watchProgress?: WatchProgress | null;
  onPlay: () => void;
  onResume?: () => void;
}

export function ContentInfo({
  show,
  isPlaying,
  hasWatchProgress,
  watchProgress,
  onPlay,
  onResume,
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
      <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg">
        {show.title}
      </h1>

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
        {show.year && (
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {show.year}
          </span>
        )}
        {show.runtime && (
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {show.runtime} min
          </span>
        )}
        {isSeries && show.seasons && show.seasons.length > 0 && (
          <span className="hidden md:inline">
            {show.seasons.length} Season{show.seasons.length > 1 ? 's' : ''}
          </span>
        )}
        {show.genre && <span className="hidden md:inline">{show.genre}</span>}
      </div>

      {/* Description - Hidden in Hero for cleaner look (moved to body) */}
      {show.description && (
        <p className="hidden text-white/80 text-sm md:text-base leading-relaxed max-w-2xl line-clamp-4">
          {show.description}
        </p>
      )}

      {/* Play/Resume Button - Now for both Movies AND Series */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          className={cn(
            'gap-2.5 px-6 py-4 md:px-8 md:py-6 text-base md:text-lg font-semibold shadow-xl transition-all duration-200',
            'bg-white text-black hover:bg-white/90',
          )}
          onClick={handleButtonClick}
          disabled={isPlaying}
        >
          {isPlaying ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5 fill-current" />
          )}
          {isPlaying
            ? 'Loading...'
            : hasWatchProgress &&
                isSeries &&
                watchProgress?.seasonNumber &&
                watchProgress?.episodeNumber
              ? `Resume S${watchProgress.seasonNumber} E${watchProgress.episodeNumber}`
              : hasWatchProgress
                ? 'Resume'
                : 'Play'}
        </Button>

        {/* If series has progress, also show "Play from Start" option */}
        {isSeries && hasWatchProgress && !isPlaying && (
          <Button
            size="lg"
            variant="outline"
            className="gap-2 px-6 py-6 text-lg font-semibold border-white/30 text-white hover:bg-white/15 hover:border-white/40 transition-all duration-200"
            onClick={onPlay}
          >
            <Play className="w-4 h-4" />
            Episodes
          </Button>
        )}
      </div>
    </div>
  );
}
