'use client';

import { Clock, Loader2, Play } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { memo } from 'react';
import { toast } from 'sonner';
import { cn, getOptimizedImageUrl } from '@/lib/utils';
import { useEpisodeCard } from '../hooks/use-episode-card';
import type { Episode } from '../types';

/** Props for {@link EpisodeCard}. */
interface EpisodeCardProps {
  episode: Episode;
  onPlay: () => void;
  isPlaying: boolean;
  isAnyLoading?: boolean;
}

/**
 * Renders a single episode row with thumbnail, title, description, and
 * duration. Shows a loading spinner when the episode is actively being
 * played and a play overlay on hover.
 *
 * @param props - {@link EpisodeCardProps}
 * @returns The episode card button element.
 */
export const EpisodeCard = memo(function EpisodeCard({
  episode,
  onPlay,
  isPlaying,
  isAnyLoading = false,
}: EpisodeCardProps) {
  const t = useTranslations('common.toasts');
  const ts = useTranslations('search');
  const { imageError, setImageError } = useEpisodeCard();
  const thumbnailSrc = getOptimizedImageUrl(episode.thumbnailUrl);

  const handleClick = () => {
    if (isAnyLoading && !isPlaying) {
      toast.error(t('episodeLoading'));
      return;
    }
    onPlay();
  };

  return (
    <button
      type="button"
      className={cn(
        'group flex gap-4 p-4 enabled:cursor-pointer transition-[background-color,border-color,box-shadow,opacity,transform,backdrop-filter] duration-300 w-full text-left border border-gray-100 rounded-xl overflow-hidden relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        'bg-background/40 hover:bg-background/60 hover:backdrop-blur-xl hover:shadow-md',
        isPlaying &&
          'bg-background/80 backdrop-blur-xl ring-2 ring-primary/20 scale-[0.98]',
        isAnyLoading && !isPlaying && 'opacity-50 cursor-not-allowed',
      )}
      onClick={handleClick}
      disabled={isPlaying}
    >
      {/* Blurred background element for glass effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/10 to-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Episode Thumbnail */}
      <div className="relative w-40 md:w-56 aspect-video bg-gray-100 flex-shrink-0 rounded-lg overflow-hidden my-auto mr-0">
        {!imageError && episode.thumbnailUrl ? (
          <Image
            src={thumbnailSrc}
            alt={
              episode.title ||
              ts('episodeCard.episodeFallback', {
                number: episode.episodeNumber,
              })
            }
            fill
            className={cn(
              'object-cover transition-[transform,opacity] duration-700 select-none group-hover:scale-105',
              isPlaying && 'opacity-70',
            )}
            unoptimized={thumbnailSrc.startsWith('/api/stream/')}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-muted-foreground/30">
              {episode.episodeNumber}
            </span>
          </div>
        )}

        {/* Play/Loading Overlay */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-neo-blue/40',
            isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            'transition-opacity duration-200',
          )}
        >
          {isPlaying ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
              <span className="text-[10px] text-white font-semibold font-headline uppercase tracking-widest drop-shadow-md">
                {ts('episodeCard.loading')}
              </span>
            </div>
          ) : (
            <div className="w-12 h-12 bg-foreground/20 backdrop-blur-md rounded-full border border-foreground/40 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              <Play className="w-5 h-5 text-white fill-white ml-1" />
            </div>
          )}
        </div>
      </div>

      {/* Episode Info */}
      <div className="flex-1 min-w-0 py-2 pl-2">
        <div className="flex items-center gap-3 mb-1.5">
          <span className="px-2.5 py-1 bg-card/50 backdrop-blur-sm border border-border text-foreground rounded-md text-[10px] font-bold font-headline uppercase tracking-tighter shrink-0 shadow-sm">
            {ts('episodeCard.epPrefix')} {episode.episodeNumber}
          </span>
          <h4 className="font-headline font-black text-lg md:text-xl uppercase tracking-tighter text-foreground truncate leading-none">
            {episode.title ||
              ts('episodeCard.episodeFallback', {
                number: episode.episodeNumber,
              })}
          </h4>
        </div>

        {episode.description ? (
          <p className="text-sm font-medium text-foreground/70 line-clamp-2 mt-2 leading-tight uppercase font-headline tracking-tight opacity-80">
            {episode.description}
          </p>
        ) : null}

        <div className="flex items-center gap-4 mt-3">
          {episode.duration ? (
            <span className="flex items-center gap-1.5 text-[10px] font-black font-headline uppercase tracking-widest text-foreground/60">
              <Clock className="w-3.5 h-3.5 stroke-[3px]" />
              {episode.duration} {ts('episodeCard.minSuffix')}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
});
