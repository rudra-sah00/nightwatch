'use client';

import { Loader2, Users, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PlaybackCountdown } from '@/features/watch/components/PlaybackCountdown';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn, getOptimizedImageUrl } from '@/lib/utils';
import { useContentDetailModal } from '../hooks/use-content-detail-modal';
import { ContentType } from '../types';
import { ContentActions, ContentInfo } from './content-info';
import { DownloadMenu } from './download-menu';
import { EpisodeList } from './episode-list';
import { SeasonSelector } from './season-selector';

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
  const episodesSectionRef = useRef<HTMLDivElement>(null);

  // Scroll to episodes when party mode activates
  useEffect(() => {
    if (isSetupOpen && episodesSectionRef.current) {
      episodesSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [isSetupOpen]);

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
        <p className="text-[#1a1a1a] text-lg font-headline font-black uppercase tracking-widest">
          Failed to load content
        </p>
        <Button
          variant="outline"
          className="mt-6 border-[3px] border-[#1a1a1a] font-black uppercase neo-shadow-sm"
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
        <div className="bg-white p-12 border-[4px] border-[#1a1a1a] neo-shadow-yellow animate-pulse">
          <Loader2 className="w-16 h-16 animate-spin text-[#1a1a1a] stroke-[3px]" />
        </div>
      </div>
    );
  }

  if (!show) return null;

  const isSeries = show?.contentType === ContentType.Series;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 md:p-12 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-6xl h-full sm:h-[90vh] flex flex-col bg-white sm:border-[4px] border-[#1a1a1a] sm:neo-shadow overflow-hidden">
        {/* Fixed Header */}
        <div className="border-b-[4px] border-[#1a1a1a] bg-[#f5f0e8] flex justify-between items-center px-4 sm:px-6 py-4 flex-shrink-0 z-20 sticky top-0">
          <span className="font-headline font-black uppercase tracking-widest text-[#1a1a1a] text-lg sm:text-xl truncate flex-1 pr-4">
            {show.title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border-[3px] border-[#1a1a1a] bg-[#e63b2e] text-white hover:bg-[#1a1a1a] hover:text-white transition-all neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 stroke-[3px]" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col bg-white">
          {/* Hero Media Container */}
          <div className="w-full aspect-video md:h-[45vh] md:aspect-auto bg-[#1a1a1a] border-b-[4px] border-[#1a1a1a] relative flex-shrink-0">
            {showTrailer && show.trailers && show.trailers.length > 0 ? (
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
                  className="absolute top-4 left-4 z-10 px-4 py-2 bg-white text-[#1a1a1a] border-[3px] border-[#1a1a1a] font-black font-headline uppercase tracking-widest text-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-[#ffcc00]"
                  onClick={() => setShowTrailer(false)}
                >
                  Close Preview
                </button>
              </div>
            ) : !imageError ? (
              <div className="relative w-full h-full bg-[#f5f0e8]">
                <Image
                  src={getOptimizedImageUrl(
                    show.posterHdUrl || show.posterUrl || '',
                  )}
                  alt={show.title}
                  fill
                  className="object-cover md:object-contain object-top"
                  priority
                  unoptimized={(
                    show.posterHdUrl ||
                    show.posterUrl ||
                    ''
                  ).includes('/api/stream/')}
                  sizes="100vw"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="w-full h-full bg-[#f5f0e8] flex items-center justify-center">
                <span className="text-[#1a1a1a] font-black font-headline uppercase tracking-widest">
                  No Image Available
                </span>
              </div>
            )}
          </div>

          {/* Content Info Area */}
          <div className="p-6 md:p-10 lg:p-16 bg-[#f5f0e8] flex-shrink-0">
            <ContentInfo
              show={show}
              hasWatchProgress={hasWatchProgress}
              watchProgress={watchProgress}
            />
          </div>

          {/* Action Bar — Sticky on mobile, relative on desktop */}
          <div className="sticky bottom-0 sm:relative z-30 px-6 pb-6 md:px-10 md:pb-10 lg:px-16 lg:pb-16 bg-[#f5f0e8] border-b-[4px] border-[#1a1a1a] sm:border-b-0 flex-shrink-0">
            <ContentActions
              isPlaying={isPlaying}
              isCreatingParty={isCreatingParty}
              isLoadingProgress={isLoadingProgress}
              hasWatchProgress={hasWatchProgress}
              watchProgress={watchProgress}
              selectedSeason={selectedSeason}
              isSeries={isSeries}
              onPlay={() => {
                setShowTrailer(false);
                handlePlay();
              }}
              onResume={async () => {
                setShowTrailer(false);
                await handleResume();
              }}
              onWatchParty={() => {
                setShowTrailer(false);
                handleWatchParty();
              }}
              isWatchPartyDisabled={isMobile}
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

          {/* Series Episodes Listing */}
          {isSeries ? (
            <div
              ref={episodesSectionRef}
              className={cn(
                'p-6 md:p-10 lg:p-16 min-h-[40vh] transition-colors duration-300',
                isSetupOpen ? 'bg-[#ffe066]' : 'bg-white',
              )}
            >
              {/* Party Mode Banner */}
              {isSetupOpen ? (
                <div className="flex items-center justify-between gap-4 mb-8 p-6 bg-white border-[4px] border-[#1a1a1a] neo-shadow flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#0055ff] border-[3px] border-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-lg md:text-xl font-black font-headline uppercase tracking-widest text-[#1a1a1a] leading-tight">
                        Watch Party — Pick an episode
                      </p>
                      <p className="text-sm font-bold font-headline uppercase tracking-widest text-[#4a4a4a] mt-1">
                        Everyone joins once you select
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSetupOpen(false)}
                    className="p-3 bg-[#e63b2e] border-[3px] border-[#1a1a1a] hover:bg-[#1a1a1a] text-white transition-all neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] flex-shrink-0"
                    aria-label="Cancel watch party"
                  >
                    <X className="w-6 h-6 stroke-[3px]" />
                  </button>
                </div>
              ) : null}

              {/* Season Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 md:mb-12">
                <h2
                  className={cn(
                    'text-3xl md:text-5xl font-black font-headline uppercase tracking-tighter transition-colors',
                    isSetupOpen ? 'text-[#1a1a1a]' : 'text-[#1a1a1a]',
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

              {/* Episodes List — doubles as party episode picker when isSetupOpen */}
              <EpisodeList
                episodes={episodes}
                isLoading={isLoadingEpisodes}
                playingEpisodeId={
                  isSetupOpen ? creatingEpisodeId : playingEpisodeId
                }
                onPlayEpisode={(episode) => {
                  if (isSetupOpen) {
                    handleWatchParty(episode);
                  } else {
                    setShowTrailer(false);
                    handlePlay(episode);
                  }
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
