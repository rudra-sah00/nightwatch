'use client';

import { Loader2, X } from 'lucide-react';
// import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
// Hook for data management
import { useContentDetail } from '../hooks/use-content-detail';
// Types
import { ContentType } from '../types';
// Extracted components
import { ContentInfo } from './content-info';
import { EpisodeList } from './episode-list';
import { SeasonSelector } from './season-selector';

interface ContentDetailModalProps {
  contentId: string;
  fromContinueWatching?: boolean;
  onClose: () => void;
}

export function ContentDetailModal({
  contentId,
  fromContinueWatching = false,
  onClose,
}: ContentDetailModalProps) {
  // State from custom hook
  const {
    show,
    episodes,
    isLoading,
    isLoadingEpisodes,
    isPlaying,
    playingEpisodeId,
    selectedSeason,
    hasWatchProgress,
    watchProgress,
    handleSeasonSelect,
    handlePlay,
    handleResume,
  } = useContentDetail({ contentId, fromContinueWatching });

  // Local UI state
  const [imageError, setImageError] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);

  // Block body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (!show) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
        <p className="text-white text-lg">Failed to load content</p>
        <Button variant="ghost" className="mt-4 text-white" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  const isSeries = show.contentType === ContentType.Series;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-xl">
      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-black/50 backdrop-blur-md hover:bg-white/10 transition-colors border border-white/10"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Hero Section */}
      <div className="relative w-full h-[50vh] md:h-[60vh] lg:h-[70vh]">
        {/* Background Image */}
        <div className="absolute inset-0">
          {!imageError ? (
            <Image
              src={show.posterHdUrl || show.posterUrl || ''}
              alt={show.title}
              fill
              className="object-cover"
              priority
              unoptimized
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
          )}
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
        </div>

        {/* Content Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 lg:p-16">
          <ContentInfo
            show={show}
            isPlaying={isPlaying}
            hasWatchProgress={hasWatchProgress}
            watchProgress={watchProgress}
            onPlay={() => handlePlay()}
            onResume={handleResume}
          />
        </div>
      </div>

      {/* Details Section (Description & Metadata) - Below Hero for all screens */}
      <div className="px-6 md:px-10 lg:px-16 py-8 bg-black">
        <div className="max-w-4xl space-y-6">
          {/* Description */}
          {show.description && (
            <p className="text-white/80 text-sm md:text-lg leading-relaxed font-light">
              {show.description}
            </p>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
            {/* Genres */}
            {show.genre && (
              <div>
                <span className="block text-white/40 text-xs uppercase tracking-wider mb-2">
                  Genres
                </span>
                <div className="flex flex-wrap gap-2">
                  {show.genre
                    .split(',')
                    .map((g) => g.trim())
                    .filter(Boolean)
                    .map((genre) => (
                      <span
                        key={genre}
                        className="px-2.5 py-1 rounded-md text-sm bg-white/10 text-white/90 border border-white/5"
                      >
                        {genre}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Additional Details (Series specific or other metadata) */}
            {isSeries && show.seasons && (
              <div>
                <span className="block text-white/40 text-xs uppercase tracking-wider mb-2">
                  Series Info
                </span>
                <div className="flex flex-wrap gap-3 text-white/80 text-sm">
                  <span>
                    {show.seasons.length} Season
                    {show.seasons.length > 1 ? 's' : ''}
                  </span>
                  {show.year && <span>• {show.year}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Series Episodes Listing */}
      {isSeries && (
        <div className="px-6 md:px-10 lg:px-16 py-8 bg-gradient-to-b from-black to-background border-t border-white/5">
          {/* Season Selector */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground">
              Episodes
            </h2>
            <SeasonSelector
              seasons={show.seasons || []}
              selectedSeason={selectedSeason}
              isOpen={seasonDropdownOpen}
              onToggle={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
              onSelect={(season) => {
                handleSeasonSelect(season);
                setSeasonDropdownOpen(false);
              }}
            />
          </div>

          {/* Episodes List */}
          <EpisodeList
            episodes={episodes}
            isLoading={isLoadingEpisodes}
            playingEpisodeId={playingEpisodeId}
            onPlayEpisode={(episode) => handlePlay(episode)}
          />
        </div>
      )}
    </div>
  );
}
