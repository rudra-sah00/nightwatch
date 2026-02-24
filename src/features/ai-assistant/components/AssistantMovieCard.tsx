'use client';

import { Film, Play, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { cn, getOptimizedImageUrl } from '@/lib/utils';
import styles from '../styles/AIAssistant.module.css';

interface AssistantMovieCardProps {
  id: string;
  type: string;
  title: string;
  posterUrl?: string;
  poster?: string;
  thumbnail?: string;
  image?: string;
  img?: string;
  imdbRating?: string;
  awards?: string;
  subtitle?: string;
  season?: number;
  episode?: number;
  onSelect?: (
    id: string,
    context?: Record<string, unknown>,
    autoPlay?: boolean,
  ) => void;
  className?: string;
  variant?: 'portrait' | 'landscape';
  videoUrl?: string; // For trailers
}

export function AssistantMovieCard({
  id,
  type,
  title,
  poster,
  posterUrl,
  thumbnail,
  image,
  img,
  imdbRating,
  awards,
  subtitle,
  season,
  episode,
  onSelect,
  className,
  variant = 'portrait',
  videoUrl,
}: AssistantMovieCardProps) {
  const displayPoster = poster || posterUrl || thumbnail || image || img;
  const isLandscape =
    variant === 'landscape' || type === 'Trailer' || type === 'Photo';

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(id, { season, episode, videoUrl }, true);
  };

  return (
    <div
      data-testid="assistant-movie-card"
      className={cn(
        styles.glassCard,
        'w-full overflow-hidden flex text-left relative group',
        isLandscape ? 'flex-col' : 'flex-row',
        className,
      )}
    >
      {/* Main card click action - strictly an overlay button */}
      <button
        type="button"
        className="absolute inset-0 z-10 w-full h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
        onClick={(e) => {
          e.preventDefault();
          onSelect?.(id, { videoUrl });
        }}
        aria-label={`Select ${title}`}
      />
      <div
        className={cn(
          'relative flex-shrink-0 bg-zinc-900 shadow-inner',
          isLandscape ? 'aspect-video w-full' : 'aspect-[2/3] w-20 sm:w-28',
        )}
      >
        {displayPoster ? (
          <Image
            src={getOptimizedImageUrl(displayPoster)}
            alt={title}
            fill
            sizes={isLandscape ? '100vw' : '(max-width: 640px) 80px, 112px'}
            className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:-translate-y-2"
            unoptimized={true}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[8px] text-center p-1 text-white/20">
            <Film className="w-4 h-4 opacity-20" />
            <span>No Image</span>
          </div>
        )}

        {/* Overlay for Landscape (Title at bottom) */}
        {isLandscape ? (
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[8px] font-black text-primary uppercase tracking-widest">
                {type}
              </span>
            </div>
            <p
              className="text-sm font-bold truncate text-white group-hover:text-primary transition-colors leading-tight"
              title={title}
            >
              {title}
            </p>
          </div>
        ) : null}

        {imdbRating && !isLandscape ? (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-zinc-900/90 text-zinc-300 text-[10px] font-black rounded-sm flex items-center gap-0.5 shadow-lg border border-zinc-700/50 backdrop-blur-sm">
            <Sparkles className="w-2.5 h-2.5 text-zinc-500" />
            {imdbRating}
          </div>
        ) : null}

        {type === 'Trailer' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
            <div className="w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
      </div>

      {!isLandscape ? (
        <>
          <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                {type}
              </span>
              {type !== 'Photo' && type !== 'Trailer' ? (
                <>
                  <div className="w-1 h-1 rounded-full bg-white/10" />
                  <span className="text-[9px] text-white/40 font-medium">
                    Available
                  </span>
                </>
              ) : null}
              {season || episode ? (
                <>
                  <div className="w-1 h-1 rounded-full bg-white/10" />
                  <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[8px] px-1 py-0 h-3.5">
                    {episode ? `S${season} E${episode}` : `Season ${season}`}
                  </Badge>
                </>
              ) : null}
            </div>

            <p
              className="text-sm sm:text-base font-bold truncate text-white/90 group-hover:text-primary transition-colors leading-tight mb-0.5"
              title={title}
            >
              {title}
            </p>

            {subtitle ? (
              <p className="text-zinc-500 text-[10px] font-medium truncate mb-1">
                {subtitle}
              </p>
            ) : null}

            {awards ? (
              <p className="text-[10px] text-zinc-400 italic mb-2 flex items-center gap-1.5 bg-white/5 py-1 px-2 rounded-md border border-white/5 line-clamp-1">
                <Sparkles className="w-3 h-3 text-zinc-500 shrink-0" />
                {awards}
              </p>
            ) : null}

            {/* Watch Now Button - z-10 to be clickable above the main overlay */}
            <button
              type="button"
              data-testid="watch-now-button"
              onClick={handlePlay}
              className="relative z-10 px-3 py-1 bg-primary/10 rounded-lg border border-primary/20 text-[10px] font-bold text-primary hover:bg-primary hover:text-black transition-all cursor-pointer mt-2 inline-block w-fit"
            >
              WATCH NOW
            </button>
          </div>

          <div className="flex items-center pr-4">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Play className="w-3 h-3 text-white/40 group-hover:text-primary fill-current" />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
