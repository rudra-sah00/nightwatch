'use client';

import { Calendar, Clock, Film, Loader2, Play, RotateCcw, Tv } from 'lucide-react';
import React from 'react';
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

  // Build resume text for series
  const getResumeLabel = () => {
    if (!hasWatchProgress) return 'Play';

    if (isSeries && watchProgress?.seasonNumber && watchProgress?.episodeNumber) {
      return `Resume S${watchProgress.seasonNumber} E${watchProgress.episodeNumber}`;
    }
    return 'Resume';
  };

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
            isSeries ? 'bg-purple-600/80 text-white' : 'bg-blue-600/80 text-white',
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
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg">
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
          <span>
            {show.seasons.length} Season{show.seasons.length > 1 ? 's' : ''}
          </span>
        )}
        {show.genre && <span>{show.genre}</span>}
      </div>

      {/* Description */}
      {show.description && (
        <p className="text-white/80 text-sm md:text-base leading-relaxed max-w-2xl line-clamp-4">
          {show.description}
        </p>
      )}

      {/* Play/Resume Button - Now for both Movies AND Series */}
      <div className="flex items-center gap-3">
        <Button
          size="lg"
          className={cn(
            'gap-2 px-8 py-6 text-lg font-semibold shadow-lg',
            'bg-white text-black hover:bg-white/90',
            hasWatchProgress && 'bg-primary text-white hover:bg-primary/90',
          )}
          onClick={handleButtonClick}
          disabled={isPlaying}
        >
          {isPlaying ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : hasWatchProgress ? (
            <RotateCcw className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 fill-current" />
          )}
          {isPlaying ? 'Loading...' : getResumeLabel()}
        </Button>

        {/* If series has progress, also show "Play from Start" option */}
        {isSeries && hasWatchProgress && !isPlaying && (
          <Button
            size="lg"
            variant="outline"
            className="gap-2 px-6 py-6 text-lg font-semibold border-white/20 text-white hover:bg-white/10"
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
