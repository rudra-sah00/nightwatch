'use client';

import { Loader2, X } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  ContentActions,
  ContentInfo,
} from '@/features/search/components/content-info';
import { EpisodeList } from '@/features/search/components/episode-list';
import { SeasonSelector } from '@/features/search/components/season-selector';
import { ContentType } from '@/features/search/types';
import { PlaybackCountdown } from '@/features/watch/components/PlaybackCountdown';
import { cn, getOptimizedImageUrl } from '@/lib/utils';
import { useOfflineContentDetailModal } from '../hooks/use-offline-content-detail-modal';

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
  onWatchlistChange?: (contentId: string, inWatchlist: boolean) => void;
  autoPlay?: boolean;
  isOfflineMode?: boolean;
}

export function OfflineContentDetailModal({
  contentId,
  initialContext,
  fromContinueWatching = false,
  onClose,
  onWatchlistChange,
  autoPlay = false,
  isOfflineMode = true,
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
    handleWatchlistToggle,
    imageError,
    setImageError,
    seasonDropdownOpen,
    setSeasonDropdownOpen,
    showCountdown,
    setShowCountdown,
    countdownTarget,
    showTrailer,
    setShowTrailer,
  } = useOfflineContentDetailModal({
    contentId,
    initialContext,
    fromContinueWatching,
    autoPlay,
    onClose,
  });

  const episodesSectionRef = useRef<HTMLDivElement>(null);

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
        <p className="text-foreground text-lg font-headline font-black uppercase tracking-widest">
          Failed to load content
        </p>
        <Button
          variant="neo-outline"
          className="mt-6 border-[3px] border-border font-black uppercase "
          onClick={onClose}
        >
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
        <div className="bg-white p-12 border-[4px] border-border border-neo-yellow animate-pulse motion-reduce:animate-none">
          <Loader2 className="w-16 h-16 animate-spin motion-reduce:animate-none text-foreground stroke-[3px]" />
        </div>
      </div>
    );
  }

  if (!show) return null;

  const isSeries = show?.contentType === ContentType.Series;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-0 bg-black/80 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 motion-reduce:animate-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full h-full flex flex-col bg-card overflow-hidden">
        {/* Fixed Header */}
        <div className="border-b-[4px] border-border bg-background text-foreground flex justify-between items-center pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-4 sm:py-4 flex-shrink-0 z-20 sticky top-0 [-webkit-app-region:drag]">
          <span
            id="modal-title"
            className="font-headline font-black uppercase tracking-widest text-foreground text-lg sm:text-xl truncate flex-1 min-w-0 pr-4"
          >
            {show.title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border-[3px] border-border bg-neo-red text-white hover:bg-primary hover:text-primary-foreground transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0055ff] focus-visible:ring-offset-2 [-webkit-app-region:no-drag]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 stroke-[3px]" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col bg-card">
          {/* Hero Media Container */}
          <div className="w-full aspect-video md:h-[45vh] md:aspect-auto bg-primary border-b-[4px] border-border relative flex-shrink-0">
            {showTrailer &&
            show.trailers &&
            show.trailers.length > 0 &&
            show.trailers[0].url ? (
              <div className="relative w-full h-full group bg-black">
                <video
                  src={show.trailers[0].url}
                  className="w-full h-full object-contain md:object-cover pointer-events-none select-none"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                <button
                  type="button"
                  className="absolute top-4 left-4 z-10 px-4 py-2 bg-card text-foreground border-[3px] border-border font-black font-headline uppercase tracking-widest text-sm opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-[opacity,background-color] hover:bg-neo-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0055ff] focus-visible:ring-offset-2"
                  onClick={() => setShowTrailer(false)}
                >
                  Close Preview
                </button>
              </div>
            ) : !imageError ? (
              <div className="relative w-full h-full bg-background">
                <img
                  src={
                    (show.trailers &&
                    show.trailers.length > 0 &&
                    show.trailers[0].thumbnail?.startsWith('offline-media://')
                      ? show.trailers[0].thumbnail
                      : show.posterHdUrl?.startsWith('offline-media://') ||
                          show.posterUrl?.startsWith('offline-media://')
                        ? show.posterHdUrl || show.posterUrl
                        : getOptimizedImageUrl(
                            show.posterHdUrl || show.posterUrl || '',
                          )) || ''
                  }
                  alt={show.title}
                  className="w-full h-full object-cover md:object-contain object-top"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="w-full h-full bg-background flex items-center justify-center">
                <span className="text-foreground font-black font-headline uppercase tracking-widest">
                  No Image Available
                </span>
              </div>
            )}
          </div>

          {/* Content Info Area */}
          <div className="p-6 md:p-10 lg:p-16 bg-background flex-shrink-0">
            <ContentInfo
              show={show}
              hasWatchProgress={hasWatchProgress}
              watchProgress={watchProgress}
            />
          </div>

          {/* Action Bar — Sticky on mobile, relative on desktop */}
          <div className="sticky bottom-0 sm:relative z-30 px-6 pb-6 md:px-10 md:pb-10 lg:px-16 lg:pb-16 bg-background border-b-[4px] border-border sm:border-b-0 flex-shrink-0">
            <ContentActions
              isOfflineMode={isOfflineMode}
              isPlaying={isPlaying}
              isCreatingParty={false}
              isLoadingProgress={isLoadingProgress}
              hasWatchProgress={hasWatchProgress}
              watchProgress={watchProgress}
              selectedSeason={selectedSeason}
              isSeries={isSeries}
              onPlay={() => {
                handlePlay();
              }}
              onResume={async () => {
                await handleResume();
              }}
              onWatchParty={() => {
                // watch party disabled in offline
              }}
              isWatchPartyDisabled={true}
              onWatchlistToggle={async () => {
                const nextState = !inWatchlist;
                await handleWatchlistToggle();
                onWatchlistChange?.(contentId, nextState);
              }}
              isInWatchlist={inWatchlist}
              isWatchlistLoading={isWatchlistLoading}
            />
          </div>

          {/* Series Episodes Listing */}
          {isSeries ? (
            <div
              ref={episodesSectionRef}
              className={cn(
                'p-6 md:p-10 lg:p-16 min-h-[40vh] transition-colors duration-300 bg-card',
              )}
            >
              {/* Season Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 md:mb-12">
                <h2
                  className={cn(
                    'text-3xl md:text-5xl font-black font-headline uppercase tracking-tighter transition-colors text-foreground',
                  )}
                >
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
                  handlePlay(episode);
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
