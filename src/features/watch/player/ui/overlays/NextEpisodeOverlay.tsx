'use client';

import { Loader2, Play, SkipForward } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
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
  autoPlayDelay?: number; // Seconds before auto-play (0 to disable)
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

  if (!isVisible || !nextEpisode) return null;

  const isNextSeason = nextEpisode.episodeNumber === 1;

  return (
    <section
      className="absolute bottom-36 md:bottom-48 right-6 z-50 motion-safe:animate-in motion-safe:slide-in-from-right-4 motion-safe:fade-in motion-safe:duration-300 motion-reduce:animate-none"
      aria-label={isNextSeason ? t('nextSeason') : t('nextEpisode')}
    >
      <div className="w-80 bg-background border-[4px] border-border  flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="px-4 py-3 bg-neo-yellow border-b-[4px] border-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <SkipForward className="w-5 h-5 text-foreground stroke-[3px]" />
            <span className="text-foreground font-black font-headline uppercase tracking-widest text-sm">
              {isNextSeason ? t('nextSeason') : t('nextEpisode')}
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

        {/* Episode Preview */}
        <div className="p-4 flex flex-col gap-4">
          <div className="flex gap-4">
            {/* Thumbnail */}
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
                    E{nextEpisode.episodeNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-foreground font-bold font-headline uppercase tracking-widest text-[10px] mb-1">
                S{nextEpisode.seasonNumber} • E{nextEpisode.episodeNumber}
              </p>
              <h4 className="text-foreground font-black font-headline uppercase tracking-tighter text-sm line-clamp-2 leading-tight">
                {nextEpisode.title || `Episode ${nextEpisode.episodeNumber}`}
              </h4>
              {nextEpisode.duration ? (
                <p className="text-foreground/70 font-bold font-headline uppercase tracking-widest text-[10px] mt-1">
                  {tEp('min', { duration: nextEpisode.duration })}
                </p>
              ) : null}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onPlayNext}
              disabled={isLoading}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2 border-[3px] border-border bg-neo-red text-primary-foreground',
                'font-black font-headline uppercase tracking-widest text-xs ',
                'hover:bg-neo-red/80',
                'active:bg-neo-red/60 transition-[background-color,opacity] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0055ff] focus-visible:ring-offset-2',
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
                'font-black font-headline uppercase tracking-widest text-xs ',
                'hover:bg-background',
                'active:bg-muted/80 transition-[background-color,opacity] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0055ff] focus-visible:ring-offset-2',
              )}
            >
              {t('cancel')}
            </button>
          </div>

          {/* Progress bar for countdown */}
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
