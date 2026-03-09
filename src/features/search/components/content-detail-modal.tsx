'use client';

import { Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { PlaybackCountdown } from '@/features/watch/components/PlaybackCountdown';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { getOptimizedImageUrl } from '@/lib/utils';
import { useContentDetailModal } from '../hooks/use-content-detail-modal';
import { ContentType } from '../types';
import { ContentInfo } from './content-info';
import { DownloadMenu } from './download-menu';
import { EpisodeList } from './episode-list';
import { SeasonSelector } from './season-selector';

import { WatchPartySetup } from './watch-party-setup';

interface ContentDetailModalProps {
  contentId: string;
  initialContext?: {
    season?: number;
    episode?: number;
    episodeId?: string;
    [key: string]: unknown;
  };
  fromContinueWatching?: boolean;
  onClose: () => void;
  autoPlay?: boolean;
}

export function ContentDetailModal({
  contentId,
  initialContext,
  fromContinueWatching = false,
  onClose,
  autoPlay = false,
}: ContentDetailModalProps) {
  const {
    show,
    episodes,
    isLoading,
    isLoadingEpisodes,
    isLoadingProgress,
    isPlaying,
    playingEpisodeId,
    selectedSeason,
    hasWatchProgress,
    watchProgress,
    handleSeasonSelect,
    handlePlay,
    handleResume,
    inWatchlist,
    isWatchlistLoading,
    isCreatingParty,
    handleWatchParty,
    handleWatchlistToggle,
    imageError,
    setImageError,
    seasonDropdownOpen,
    setSeasonDropdownOpen,
    isSetupOpen,
    setIsSetupOpen,
    creatingEpisodeId,
    showCountdown,
    setShowCountdown,
    countdownTarget,
    showTrailer,
    setShowTrailer,
  } = useContentDetailModal({
    contentId,
    initialContext,
    fromContinueWatching,
    autoPlay,
    onClose,
  });

  const isMobile = useIsMobile();

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (!show) {
    if (autoPlay) return null; // Silently fail if autoplay
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
        <p className="text-foreground text-lg">Failed to load content</p>
        <Button variant="ghost" className="mt-4" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  // Headless mode for AI Auto-play
  if (autoPlay && showCountdown) {
    return (
      <PlaybackCountdown
        title="Experience Starting"
        subtitle={`Preparing "${show.title}"...`}
        onComplete={() => {
          countdownTarget?.();
          setShowCountdown(false);
        }}
      />
    );
  }

  // Fallback loader if not ready
  if (autoPlay) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/10 backdrop-blur-sm">
        <div className="bg-background/40 p-10 rounded-full shadow-2xl border border-white/5 animate-pulse">
          <Loader2 className="w-12 h-12 animate-spin text-primary/60" />
        </div>
      </div>
    );
  }

  const isSeries = show.contentType === ContentType.Series;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Close Button — respects safe-area-inset on notched phones */}
      <button
        type="button"
        onClick={onClose}
        className="fixed z-[60] p-2.5 rounded-full bg-background/60 backdrop-blur-md hover:bg-muted transition-colors border border-border"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 12px)',
        }}
        aria-label="Close modal"
      >
        <X className="w-5 h-5 text-foreground" />
      </button>

      {/* Hero Section — shorter on mobile so the action buttons don't clip */}
      <div className="relative w-full h-[42vh] sm:h-[50vh] md:h-[60vh] lg:h-[70vh] bg-black">
        {/* Background Image / Trailer Player */}
        <div className="absolute inset-0">
          {showTrailer && show.trailers && show.trailers.length > 0 ? (
            <div className="relative w-full h-full group">
              <video
                src={show.trailers[0].url}
                className="w-full h-full object-contain md:object-cover"
                autoPlay
                muted
                controls
                playsInline
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 left-4 z-10 bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setShowTrailer(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Close Preview
              </Button>
            </div>
          ) : !imageError ? (
            <Image
              src={getOptimizedImageUrl(
                show.posterHdUrl || show.posterUrl || '',
              )}
              alt={show.title}
              fill
              className="object-cover"
              priority
              unoptimized={(show.posterHdUrl || show.posterUrl || '').includes(
                '/api/stream/',
              )}
              sizes="100vw"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50" />
          )}
          {/* Gradient overlays - these need to stay dark for image readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
        </div>

        {/* Content Info Overlay — tighter padding on mobile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-10 lg:p-16">
          <ContentInfo
            show={show}
            isPlaying={isPlaying}
            isCreatingParty={isCreatingParty}
            isLoadingProgress={isLoadingProgress}
            hasWatchProgress={hasWatchProgress}
            watchProgress={watchProgress}
            selectedSeason={selectedSeason}
            onPlay={() => {
              setShowTrailer(false);
              handlePlay();
              onClose();
            }}
            onResume={async () => {
              setShowTrailer(false);
              await handleResume();
              onClose();
            }}
            onWatchParty={() => {
              setShowTrailer(false);
              handleWatchParty();
            }}
            isWatchPartyDisabled={isMobile}
            watchPartyDisabledReason={undefined}
            onWatchlistToggle={handleWatchlistToggle}
            isInWatchlist={inWatchlist}
            isWatchlistLoading={isWatchlistLoading}
            extraActions={
              <DownloadMenu
                show={show}
                selectedSeason={selectedSeason}
                episodes={episodes}
              />
            }
          />
        </div>
      </div>

      {/* Details Section */}
      <div className="px-4 sm:px-6 md:px-10 lg:px-16 py-5 sm:py-6 md:py-8 bg-background">
        <div className="max-w-4xl space-y-6">
          {/* Description */}
          {show.description ? (
            <p className="text-muted-foreground text-sm md:text-base lg:text-lg leading-relaxed font-light line-clamp-4 md:line-clamp-none">
              {show.description}
            </p>
          ) : null}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
            {/* Genres */}
            {show.genre ? (
              <div>
                <span className="block text-muted-foreground text-xs uppercase tracking-wider mb-2">
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
                        className="px-2.5 py-1 rounded-md text-sm bg-secondary text-secondary-foreground border border-border"
                      >
                        {genre}
                      </span>
                    ))}
                </div>
              </div>
            ) : null}

            {/* Additional Details (Series specific or other metadata) */}
            {isSeries && show.seasons ? (
              <div>
                <span className="block text-muted-foreground text-xs uppercase tracking-wider mb-2">
                  Series Info
                </span>
                <div className="flex flex-wrap gap-3 text-muted-foreground text-sm">
                  <span>
                    {show.seasons.length} Season
                    {show.seasons.length > 1 ? 's' : ''}
                  </span>
                  {show.year ? <span>• {show.year}</span> : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Series Episodes Listing */}
      {isSeries ? (
        <div className="px-4 sm:px-6 md:px-10 lg:px-16 py-5 sm:py-6 md:py-8 bg-background border-t border-border">
          {/* Season Selector */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-2xl font-semibold text-foreground">
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
            onPlayEpisode={(episode) => {
              setShowTrailer(false);
              handlePlay(episode);
              onClose();
            }}
          />
        </div>
      ) : null}
      {/* Watch Party Setup Modal */}
      <WatchPartySetup
        isOpen={isSetupOpen}
        show={show}
        seasons={show.seasons || []}
        selectedSeason={selectedSeason}
        episodes={episodes}
        isLoadingEpisodes={isLoadingEpisodes}
        onClose={() => setIsSetupOpen(false)}
        onSelectSeason={handleSeasonSelect}
        onSelectEpisode={(episode) => handleWatchParty(episode)}
        isCreating={isCreatingParty}
        creatingEpisodeId={creatingEpisodeId}
      />
    </div>
  );
}
