'use client';

import { Clock, Film, Tv, X } from 'lucide-react';
import Image from 'next/image';
import React from 'react';
import { EmptyState } from '@/components/ui/empty-state';
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
        <EmptyState
          icon={Clock}
          title="Your watch history is empty"
          description="Start watching something and it will appear here"
        />
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
    <button
      type="button"
      title={`Continue watching ${item.title}`}
      onClick={() => onSelect(item)}
      className="flex flex-col w-full sm:flex-row bg-card border-[3px] border-border overflow-hidden group hover:border-foreground/30 transition-colors cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {/* Poster */}
      <div className="w-24 sm:w-28 shrink-0 bg-secondary relative border-r-[3px] border-border hidden sm:block">
        {item.posterUrl ? (
          <Image
            src={getOptimizedImageUrl(item.posterUrl)}
            alt={item.title}
            fill
            sizes="112px"
            className="object-cover"
            unoptimized={item.posterUrl.includes('/api/stream/')}
            loading={index < 4 ? 'eager' : 'lazy'}
            priority={index === 0}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/20">
            {item.contentType === 'Series' ? (
              <Tv className="w-8 h-8 stroke-[2px]" />
            ) : (
              <Film className="w-8 h-8 stroke-[2px]" />
            )}
          </div>
        )}
      </div>

      {/* Detail Content */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        {/* Top Section */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 pr-4">
            <h3 className="font-headline font-black uppercase tracking-wide text-base sm:text-xl leading-tight line-clamp-1">
              {item.title}
            </h3>

            {/* Status Text & Speed */}
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase font-bold text-foreground/60 tracking-wider">
              <span className="text-foreground/80 font-black">
                {item.contentType}
              </span>

              {item.contentType === 'Series' && item.seasonNumber != null ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
                  <span className="text-foreground/60">
                    S{item.seasonNumber}:E{item.episodeNumber}
                    {item.episodeTitle ? ` - ${item.episodeTitle}` : ''}
                  </span>
                </>
              ) : null}

              <span className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
              <span className="text-neo-blue">
                {formatRemainingTime(item.remainingMinutes)}
              </span>
            </div>
          </div>

          {/* Actions Column */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item, e);
              }}
              className="p-3 border-[3px] border-border bg-background hover:bg-neo-red hover:text-white transition-colors z-20"
              title="Remove from list"
            >
              <X className="w-4 h-4 stroke-[3px]" />
            </button>
          </div>
        </div>

        {/* Progress Bar Bottom Row */}
        <div className="mt-8 flex items-center gap-4">
          <div className="flex-1 h-3 bg-secondary border-[2px] border-border overflow-hidden">
            <div
              className="h-full bg-neo-yellow transition-[width] duration-500 ease-out"
              style={{ width: `${item.progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
});
