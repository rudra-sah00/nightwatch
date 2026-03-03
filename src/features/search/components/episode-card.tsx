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
        'group flex gap-4 p-3 rounded-xl cursor-pointer transition-[colors,opacity] duration-300 w-full text-left',
        'hover:bg-muted/50 border border-transparent hover:border-border',
        isPlaying && 'bg-primary/10 border-primary/30 pointer-events-none',
        isAnyLoading && !isPlaying && 'opacity-50 cursor-not-allowed',
      )}
      onClick={handleClick}
      disabled={isPlaying}
    >
      {/* Episode Thumbnail */}
      <div className="relative w-40 md:w-48 aspect-video rounded-lg overflow-hidden bg-muted flex-shrink-0">
        {!imageError && episode.thumbnailUrl ? (
          <Image
            src={getOptimizedImageUrl(episode.thumbnailUrl)}
            alt={episode.title || `Episode ${episode.episodeNumber}`}
            fill
            className={cn('object-cover', isPlaying && 'opacity-70')}
            unoptimized={episode.thumbnailUrl.includes('/api/stream/')}
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
            'absolute inset-0 flex items-center justify-center bg-black/40',
            isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            'transition-opacity',
          )}
        >
          {isPlaying ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
              <span className="text-xs text-white font-medium">Loading...</span>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <Play className="w-5 h-5 text-black fill-current ml-0.5" />
            </div>
          )}
        </div>
      </div>

      {/* Episode Info */}
      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            E{episode.episodeNumber}
          </span>
          <h4 className="font-semibold text-foreground truncate">
            {episode.title || `Episode ${episode.episodeNumber}`}
          </h4>
        </div>

        {episode.description ? (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
            {episode.description}
          </p>
        ) : null}

        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {episode.duration ? (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {episode.duration}m
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
