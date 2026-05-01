'use client';

import { Loader2, Play, SkipForward } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useMobileOrientation } from '../../hooks/useMobileOrientation';
import { useNextEpisodeOverlay } from './use-next-episode-overlay';

export interface NextEpisodeInfo {
  title: string;
  seriesTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  thumbnailUrl?: string;
  duration?: number;
}

interface NextEpisodeOverlayProps {
  isVisible: boolean;
  nextEpisode: NextEpisodeInfo | null;
  onPlayNext: () => void;
  onCancel: () => void;
  autoPlayDelay?: number;
  isLoading?: boolean;
}

export function NextEpisodeOverlay({
  isVisible,
  nextEpisode,
  onPlayNext,
  onCancel,
  autoPlayDelay = 0,
  isLoading = false,
}: NextEpisodeOverlayProps) {
  const { countdown, cancelled, handleCancel } = useNextEpisodeOverlay({
    isVisible,
    nextEpisode,
    autoPlayDelay,
    isLoading,
    onPlayNext,
    onCancel,
  });
  const t = useTranslations('watch.nextEpisode');
  const tEp = useTranslations('watch.episodes');
  const isMobile = useMobileDetection();
  const isPortrait = useMobileOrientation();
  const compact = isMobile && isPortrait;

  if (!isVisible || !nextEpisode) return null;

  const isNextSeason = nextEpisode.episodeNumber === 1;
  const label = isNextSeason ? t('nextSeason') : t('nextEpisode');

  // Mobile portrait: compact button at bottom-center
  if (compact) {
    return (
      <section
        className="absolute bottom-14 left-0 right-0 z-50 flex justify-center px-4 motion-safe:animate-in motion-safe:slide-in-from-bottom-2 motion-safe:fade-in motion-safe:duration-300 motion-reduce:animate-none"
        aria-label={label}
      >
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={onPlayNext}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-neo-red border-[3px] border-border text-primary-foreground font-black font-headline uppercase tracking-widest text-[10px] hover:bg-neo-red/80 active:bg-neo-red/60 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[3px]" />
            ) : (
              <SkipForward className="w-3.5 h-3.5 stroke-[3px]" />
            )}
            <span>
              S{nextEpisode.seasonNumber} E{nextEpisode.episodeNumber}
            </span>
            {!cancelled && autoPlayDelay > 0 && !isLoading ? (
              <span className="opacity-60">{countdown}s</span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="p-2.5 bg-background border-[3px] border-border text-foreground font-black font-headline uppercase tracking-widest text-[10px] hover:bg-muted transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      </section>
    );
  }

  // Desktop / landscape: full card
  return (
    <section
      className="absolute bottom-36 md:bottom-48 right-6 z-50 motion-safe:animate-in motion-safe:slide-in-from-right-4 motion-safe:fade-in motion-safe:duration-300 motion-reduce:animate-none"
      aria-label={label}
    >
      <div className="w-80 bg-background border-[4px] border-border flex flex-col pointer-events-auto">
        <div className="px-4 py-3 bg-neo-yellow border-b-[4px] border-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <SkipForward className="w-5 h-5 text-foreground stroke-[3px]" />
            <span className="text-foreground font-black font-headline uppercase tracking-widest text-sm">
              {label}
            </span>
          </div>
          {!cancelled && autoPlayDelay > 0 && !isLoading ? (
            <span
              className="text-foreground font-bold font-headline uppercase tracking-widest text-[10px]"
              aria-live="polite"
            >
              {t('inCountdown', { seconds: countdown })}
            </span>
          ) : null}
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="relative w-28 aspect-video border-[3px] border-border flex-shrink-0 bg-background">
              {nextEpisode.thumbnailUrl ? (
                <Image
                  src={nextEpisode.thumbnailUrl}
                  alt={nextEpisode.title}
                  fill
                  className="object-cover grayscale contrast-125"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-background">
                  <span className="text-foreground font-black font-headline uppercase text-xl">
                    {t('episodeShort', { number: nextEpisode.episodeNumber })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-foreground font-bold font-headline uppercase tracking-widest text-[10px] mb-1">
                {t('seasonEpisodeLabel', {
                  season: nextEpisode.seasonNumber,
                  episode: nextEpisode.episodeNumber,
                })}
              </p>
              <h4 className="text-foreground font-black font-headline uppercase tracking-tighter text-sm line-clamp-2 leading-tight">
                {nextEpisode.title ||
                  tEp('episode', { number: nextEpisode.episodeNumber })}
              </h4>
              {nextEpisode.duration ? (
                <p className="text-foreground/70 font-bold font-headline uppercase tracking-widest text-[10px] mt-1">
                  {tEp('min', { duration: nextEpisode.duration })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onPlayNext}
              disabled={isLoading}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2 border-[3px] border-border bg-neo-red text-primary-foreground',
                'font-black font-headline uppercase tracking-widest text-xs',
                'hover:bg-neo-red/80 active:bg-neo-red/60 transition-[background-color,opacity] disabled:opacity-50 disabled:pointer-events-none',
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[3px]" />
                  {t('loading')}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white stroke-[3px]" />
                  {t('play')}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className={cn(
                'px-4 py-2 border-[3px] border-border bg-background text-foreground',
                'font-black font-headline uppercase tracking-widest text-xs',
                'hover:bg-muted active:bg-muted/80 transition-[background-color,opacity] disabled:opacity-50 disabled:pointer-events-none',
              )}
            >
              {t('cancel')}
            </button>
          </div>

          {!cancelled && autoPlayDelay > 0 && !isLoading ? (
            <div className="h-2 bg-background border-[2px] border-border">
              <div
                className="h-full bg-primary transition-[width] duration-1000 ease-linear"
                style={{ width: `${(countdown / autoPlayDelay) * 100}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
