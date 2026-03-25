'use client';

import { Clock, Loader2, Play } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { cn, getOptimizedImageUrl } from '@/lib/utils';
import { useEpisodeCard } from '../hooks/use-episode-card';
import type { Episode } from '../types';

interface EpisodeCardProps {
  episode: Episode;
  onPlay: () => void;
  isPlaying: boolean;
  isAnyLoading?: boolean;
}

export function EpisodeCard({
  episode,
  onPlay,
  isPlaying,
  isAnyLoading = false,
}: EpisodeCardProps) {
  const { imageError, setImageError } = useEpisodeCard();
  const thumbnailSrc = getOptimizedImageUrl(episode.thumbnailUrl);

  const handleClick = () => {
    if (isAnyLoading && !isPlaying) {
      toast.error('Please wait for the current episode to load');
      return;
    }
    onPlay();
  };

  return (
    <button
      type="button"
      className={cn(
        'group flex gap-4 p-4 cursor-pointer transition-all duration-200 w-full text-left border-[3px] border-[#1a1a1a] neo-shadow-sm',
        'bg-white hover:bg-[#f5f0e8] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:neo-shadow',
        isPlaying &&
          'bg-[#ffe066] border-[#1a1a1a] neo-shadow pointer-events-none translate-x-[-4px] translate-y-[-4px]',
        isAnyLoading && !isPlaying && 'opacity-50 cursor-not-allowed',
      )}
      onClick={handleClick}
      disabled={isPlaying}
    >
      {/* Episode Thumbnail */}
      <div className="relative w-40 md:w-56 aspect-video bg-[#1a1a1a] flex-shrink-0 border-r-[3px] border-[#1a1a1a] -m-4 mr-0">
        {!imageError && episode.thumbnailUrl ? (
          <Image
            src={thumbnailSrc}
            alt={episode.title || `Episode ${episode.episodeNumber}`}
            fill
            className={cn(
              'object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-500',
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
            'absolute inset-0 flex items-center justify-center bg-[#0055ff]/40',
            isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            'transition-opacity duration-200',
          )}
        >
          {isPlaying ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-10 h-10 text-white animate-spin stroke-[3px]" />
              <span className="text-[10px] text-white font-black font-headline uppercase tracking-widest">
                LOADING...
              </span>
            </div>
          ) : (
            <div className="w-12 h-12 bg-white border-[3px] border-[#1a1a1a] flex items-center justify-center neo-shadow-sm group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 text-[#1a1a1a] fill-[#1a1a1a] ml-1" />
            </div>
          )}
        </div>
      </div>

      {/* Episode Info */}
      <div className="flex-1 min-w-0 py-1 pr-2">
        <div className="flex items-center gap-3 mb-1">
          <span className="px-2 py-0.5 bg-[#1a1a1a] text-white text-[10px] font-black font-headline uppercase tracking-tighter shrink-0">
            EP {episode.episodeNumber}
          </span>
          <h4 className="font-headline font-black text-lg md:text-xl uppercase tracking-tighter text-[#1a1a1a] truncate leading-none">
            {episode.title || `EPISODE ${episode.episodeNumber}`}
          </h4>
        </div>

        {episode.description ? (
          <p className="text-sm font-medium text-[#4a4a4a] line-clamp-2 mt-2 leading-tight uppercase font-headline tracking-tight opacity-80">
            {episode.description}
          </p>
        ) : null}

        <div className="flex items-center gap-4 mt-3">
          {episode.duration ? (
            <span className="flex items-center gap-1.5 text-[10px] font-black font-headline uppercase tracking-widest text-[#1a1a1a]/60">
              <Clock className="w-3.5 h-3.5 stroke-[3px]" />
              {episode.duration} MIN
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
