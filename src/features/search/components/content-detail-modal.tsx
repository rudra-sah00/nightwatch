'use client';

import { Loader2, Users, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PlaybackCountdown } from '@/features/watch/components/PlaybackCountdown';
import { useDesktopApp } from '@/hooks/use-desktop-app';
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
  onWatchlistChange?: (contentId: string, inWatchlist: boolean) => void;
  autoPlay?: boolean;
  isOfflineMode?: boolean;
}

export function ContentDetailModal({
  contentId,
  initialContext,
  fromContinueWatching = false,
  onClose,
  onWatchlistChange,
  autoPlay = false,
  isOfflineMode = false,
}: ContentDetailModalProps) {
  const { isDesktopApp } = useDesktopApp();
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
  const t = useTranslations('search');

  // Scroll to episodes when party mode activates
  useEffect(() => {
    if (isSetupOpen && episodesSectionRef.current) {
      episodesSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [isSetupOpen]);

  // Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
          {t('contentDetail.failedToLoad')}
        </p>
        <Button
          variant="neo-outline"
          className="mt-6 border-[3px] border-border font-black uppercase "
          onClick={onClose}
        >
          {t('contentDetail.close')}
        </Button>
      </div>
    );
  }

  // Headless mode for AI Auto-play
  if (autoPlay && showCountdown) {
    return (
      <PlaybackCountdown
        title={t('contentDetail.experienceStarting')}
        subtitle={t('contentDetail.preparingContent', { title: show.title })}
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
        <div className="bg-white p-12 border-[4px] border-border -yellow animate-pulse motion-reduce:animate-none">
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
                  {t('contentDetail.closePreview')}
                </button>
              </div>
            ) : !imageError ? (
              <div className="relative w-full h-full bg-background">
                <Image
                  src={getOptimizedImageUrl(
                    show.trailers &&
                      show.trailers.length > 0 &&
                      show.trailers[0].thumbnail
                      ? show.trailers[0].thumbnail
                      : show.posterHdUrl || show.posterUrl || '',
                  )}
                  alt={show.title}
                  fill
                  className="object-cover md:object-contain object-top"
                  priority
                  unoptimized={(show.trailers &&
                  show.trailers.length > 0 &&
                  show.trailers[0].thumbnail
                    ? show.trailers[0].thumbnail
                    : show.posterHdUrl || show.posterUrl || ''
                  ).includes('/api/stream/')}
                  sizes="100vw"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="w-full h-full bg-background flex items-center justify-center">
                <span className="text-foreground font-black font-headline uppercase tracking-widest">
                  {t('contentDetail.noImageAvailable')}
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
              isCreatingParty={isCreatingParty}
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
                handleWatchParty();
              }}
              isWatchPartyDisabled={isMobile}
              onWatchlistToggle={async () => {
                const nextState = !inWatchlist;
                await handleWatchlistToggle();
                onWatchlistChange?.(contentId, nextState);
              }}
              isInWatchlist={inWatchlist}
              isWatchlistLoading={isWatchlistLoading}
              extraActions={
                isDesktopApp ? (
                  <DownloadMenu
                    show={show}
                    selectedSeason={selectedSeason}
                    episodes={episodes}
                  />
                ) : undefined
              }
            />
          </div>

          {/* Series Episodes Listing */}
          {isSeries ? (
            <div
              ref={episodesSectionRef}
              className={cn(
                'p-6 md:p-10 lg:p-16 min-h-[40vh] transition-colors duration-300',
                isSetupOpen ? 'bg-neo-yellow/80' : 'bg-card',
              )}
            >
              {/* Party Mode Banner */}
              {isSetupOpen ? (
                <div className="flex items-center justify-between gap-4 mb-8 p-6 bg-card border-[4px] border-border  flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-neo-blue border-[3px] border-border flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-lg md:text-xl font-black font-headline uppercase tracking-widest text-foreground leading-tight">
                        {t('contentDetail.watchPartyPick')}
                      </p>
                      <p className="text-sm font-bold font-headline uppercase tracking-widest text-foreground/70 mt-1">
                        {t('contentDetail.watchPartyHint')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSetupOpen(false)}
                    className="p-3 bg-neo-red border-[3px] border-border hover:bg-primary text-white hover:text-primary-foreground transition-colors flex-shrink-0"
                    aria-label={t('contentDetail.cancelWatchParty')}
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
                    isSetupOpen ? 'text-foreground' : 'text-foreground',
                  )}
                >
                  {t('contentDetail.episodes')}
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
