'use client';

import { Clock, Film, Tv, X } from 'lucide-react';
import Image from 'next/image';
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn, getOptimizedImageUrl } from '@/lib/utils';
import { useContinueWatching } from '../hooks/use-continue-watching';
import type { WatchProgress } from '../types';

function formatRemainingTime(minutes: number) {
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`;
}

interface ContinueWatchingProps {
  className?: string;
  hideTitle?: boolean;
  onSelectContent?: (contentId: string) => void;
  onLoadComplete?: (itemCount: number) => void;
}

export function ContinueWatching({
  className,
  hideTitle = false,
  onSelectContent,
  onLoadComplete,
}: ContinueWatchingProps) {
  const { optimisticItems, isLoading, handleSelect, handleRemove } =
    useContinueWatching({ onSelectContent, onLoadComplete });

  if (isLoading) {
    return (
      <div className={cn('py-6', className)}>
        {!hideTitle && (
          <div className="inline-block bg-neo-yellow border-[4px] border-border px-4 py-2 mb-6 ">
            <h2 className="text-xl md:text-2xl font-black font-headline text-foreground uppercase tracking-tighter m-0 leading-none">
              Continue Watching
            </h2>
          </div>
        )}
        <div className="flex flex-col gap-6">
          {['cw-sk-1', 'cw-sk-2', 'cw-sk-3', 'cw-sk-4'].map((id) => (
            <div
              key={id}
              className="w-full h-32 bg-muted animate-pulse border-[4px] border-border"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!isLoading && optimisticItems.length === 0) {
    return (
      <div
        className={cn(
          'py-12 w-full',
          !hideTitle && 'max-w-5xl mx-auto',
          className,
        )}
      >
        {!hideTitle && (
          <div className="inline-block bg-neo-yellow border-[4px] border-border px-4 py-2 mb-6 ">
            <h2 className="text-xl md:text-2xl font-black font-headline text-foreground uppercase tracking-tighter m-0 leading-none">
              Continue Watching
            </h2>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-20 bg-neo-surface border-[4px] border-border  text-center">
          <Clock className="w-16 h-16 text-foreground opacity-20 mb-4 stroke-[3px]" />
          <p className="font-headline font-bold uppercase tracking-widest text-neo-muted">
            Your watch history is empty
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'py-6 w-full',
        !hideTitle && 'max-w-5xl mx-auto',
        className,
      )}
    >
      {!hideTitle && (
        <div className="inline-block bg-neo-yellow border-[4px] border-border px-4 py-2 mb-6 ">
          <h2 className="text-xl md:text-2xl font-black font-headline text-foreground uppercase tracking-tighter m-0 leading-none">
            Continue Watching
          </h2>
        </div>
      )}
      <section
        className="flex flex-col gap-6"
        style={{ contentVisibility: 'auto' }}
        aria-label="Recently viewed content"
      >
        {optimisticItems.map((item, index) => (
          <WatchProgressItem
            key={item.id}
            item={item}
            index={index}
            onSelect={handleSelect}
            onRemove={handleRemove}
          />
        ))}
      </section>
    </div>
  );
}

interface WatchProgressItemProps {
  item: WatchProgress;
  index: number;
  onSelect: (item: WatchProgress) => void;
  onRemove: (item: WatchProgress, e: React.MouseEvent) => void;
}

const WatchProgressItem = React.memo(function WatchProgressItem({
  item,
  index,
  onSelect,
  onRemove,
}: WatchProgressItemProps) {
  return (
    <div
      className={cn(
        'group relative flex flex-col sm:flex-row p-4 gap-6 w-full text-left bg-neo-surface border-[4px] border-border items-start sm:items-center',
        'transition-[background-color,color,border-color,box-shadow,transform,opacity]',
      )}
    >
      {/* Remove Button - Top Right Overlay */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          type="button"
          variant="none"
          size="none"
          onClick={(e) => onRemove(item, e)}
          className="p-1 border-[3px] border-border bg-neo-surface text-foreground hover:bg-neo-red hover:text-white transition-[background-color,color,border-color,opacity,transform]"
          title="Remove from list"
        >
          <X className="w-5 h-5 stroke-[3px]" />
        </Button>
      </div>

      <button
        type="button"
        title={`Continue watching ${item.title}`}
        className="relative z-10 w-full sm:w-40 xl:w-48 aspect-[2/3] overflow-hidden flex-shrink-0 bg-background border-[4px] border-border group/poster"
        onClick={() => onSelect(item)}
      >
        {item.posterUrl ? (
          <Image
            src={getOptimizedImageUrl(item.posterUrl)}
            alt={item.title}
            fill
            className="object-cover grayscale contrast-125 group-hover:grayscale-0 transition-[filter,transform] duration-500 group-hover:scale-105"
            unoptimized={item.posterUrl.includes('/api/stream/')}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading={index < 4 ? 'eager' : 'lazy'}
            priority={index === 0}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {item.contentType === 'Series' ? (
              <Tv className="w-12 h-12 opacity-30 stroke-[3px] text-foreground" />
            ) : (
              <Film className="w-12 h-12 opacity-30 stroke-[3px] text-foreground" />
            )}
          </div>
        )}

        {/* Floating Play Overlay on Hover */}
        <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover/poster:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-16 h-16 bg-neo-yellow border-4 border-border flex items-center justify-center  group-hover/poster:scale-110 transition-transform">
            <Clock className="w-8 h-8 text-foreground fill-current" />
          </div>
        </div>

        {/* Progress Bar at bottom of poster */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-primary border-t-[3px] border-border">
          <div
            className="h-full bg-neo-yellow border-r-[3px] border-border transition-[width] duration-1000"
            style={{ width: `${item.progressPercent}%` }}
          />
        </div>
      </button>

      <div className="flex-1 min-w-0 flex flex-col h-full justify-center">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={cn(
              'px-2 py-0.5 text-[10px] font-black font-headline uppercase tracking-widest border-[2px] border-border',
              item.contentType === 'Series'
                ? 'bg-neo-blue text-white'
                : 'bg-neo-yellow text-foreground',
            )}
          >
            {item.contentType === 'Series' ? 'Series' : 'Movie'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onSelect(item)}
          title={item.title}
          className="text-left group/title mb-auto"
        >
          <h3 className="font-black font-headline uppercase tracking-tighter text-foreground text-3xl lg:text-5xl leading-none group-hover/title:text-neo-blue transition-colors line-clamp-2 mix-blend-normal">
            {item.title}
          </h3>
        </button>

        <div className="mt-6 flex gap-4 text-xs md:text-sm font-bold font-headline uppercase tracking-widest text-neo-muted">
          {item.contentType === 'Series' && item.seasonNumber != null ? (
            <span className="text-foreground opacity-60 flex items-center">
              S{item.seasonNumber}:E{item.episodeNumber}{' '}
              {item.episodeTitle && (
                <span className="hidden sm:inline">
                  &nbsp;• {item.episodeTitle}
                </span>
              )}
            </span>
          ) : null}
          <span className="flex items-center gap-2 text-foreground bg-neo-yellow px-3 py-1 border-[3px] border-border w-fit">
            <span className="w-2.5 h-2.5 rounded-full bg-black animate-pulse" />
            {formatRemainingTime(item.remainingMinutes)}
          </span>
        </div>
      </div>
    </div>
  );
});
