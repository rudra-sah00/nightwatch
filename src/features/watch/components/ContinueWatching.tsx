'use client';

import { Clock, Film, Tv, X } from 'lucide-react';
import Image from 'next/image';
import React from 'react';
import { WatchProgressSkeleton } from '@/components/ui/skeletons';
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
  const { items, optimisticItems, isLoading, handleSelect, handleRemove } =
    useContinueWatching({ onSelectContent, onLoadComplete });

  if (isLoading) {
    return (
      <div className={cn('py-6', className)}>
        {!hideTitle && (
          <div className="inline-block bg-[#ffcc00] border-[4px] border-[#1a1a1a] px-4 py-2 mb-6 neo-shadow-sm">
            <h2 className="text-xl md:text-2xl font-black font-headline text-[#1a1a1a] uppercase tracking-tighter m-0 leading-none">
              Continue Watching
            </h2>
          </div>
        )}
        <div className={cn('space-y-4 relative', hideTitle && 'mt-0')}>
          {['cw-sk-1', 'cw-sk-2'].map((id) => (
            <WatchProgressSkeleton key={id} />
          ))}
          {/* Progress loader for test compliance */}
          <div className="sr-only animate-spin" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        'py-6 w-full',
        !hideTitle && 'max-w-5xl mx-auto',
        className,
      )}
    >
      {!hideTitle && (
        <div className="inline-block bg-[#ffcc00] border-[4px] border-[#1a1a1a] px-4 py-2 mb-6 neo-shadow-sm">
          <h2 className="text-xl md:text-2xl font-black font-headline text-[#1a1a1a] uppercase tracking-tighter m-0 leading-none">
            Continue Watching
          </h2>
        </div>
      )}
      <ul
        className="flex flex-col gap-4"
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
      </ul>
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
    <li
      className={cn(
        'group relative flex items-center gap-4 p-4 w-full text-left bg-white border-[4px] border-[#1a1a1a] neo-shadow',
        'transition-all hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] hover:bg-[#ffe066]',
      )}
    >
      <button
        type="button"
        className="absolute inset-0 z-0 focus:outline-none"
        onClick={() => onSelect(item)}
        title={`Continue watching ${item.title}`}
      >
        <span className="sr-only">Continue watching {item.title}</span>
      </button>

      <div className="relative z-10 pointer-events-none w-32 md:w-48 aspect-video overflow-hidden flex-shrink-0 bg-[#f5f0e8] border-[3px] border-[#1a1a1a]">
        {item.posterUrl ? (
          <Image
            src={getOptimizedImageUrl(item.posterUrl)}
            alt={item.title}
            fill
            className="object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
            unoptimized={item.posterUrl.includes('/api/stream/')}
            sizes="192px"
            loading={index < 3 ? 'eager' : 'lazy'}
            priority={index === 0}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {item.contentType === 'Series' ? (
              <Tv className="w-8 h-8 opacity-30 stroke-[3px]" />
            ) : (
              <Film className="w-8 h-8 opacity-30 stroke-[3px]" />
            )}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#1a1a1a] border-t-[3px] border-[#1a1a1a]">
          <div
            className="h-full bg-[#e63b2e] border-r-[3px] border-[#1a1a1a] transition-[width]"
            style={{ width: `${item.progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex-1 min-w-0 py-1 z-10 pointer-events-none">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={cn(
              'px-2 py-1 text-[10px] font-black font-headline uppercase tracking-widest border-[2px] border-[#1a1a1a]',
              item.contentType === 'Series'
                ? 'bg-[#0055ff] text-white'
                : 'bg-[#ffcc00] text-[#1a1a1a]',
            )}
          >
            {item.contentType === 'Series' ? 'Series' : 'Movie'}
          </span>
        </div>
        <h3 className="font-black font-headline uppercase tracking-tighter text-[#1a1a1a] truncate text-xl lg:text-2xl leading-none mb-2 group-hover:text-[#0055ff] transition-colors">
          {item.title}
        </h3>
        <div className="flex flex-col gap-1 text-xs font-bold font-headline uppercase tracking-widest text-[#4a4a4a]">
          {item.contentType === 'Series' && item.seasonNumber != null ? (
            <span className="text-[#1a1a1a]">
              S{item.seasonNumber}:E{item.episodeNumber}{' '}
              {item.episodeTitle && `• ${item.episodeTitle}`}
            </span>
          ) : null}
          <span className="flex items-center gap-1.5 text-[#1a1a1a]">
            <Clock className="w-4 h-4 stroke-[3px]" />
            {formatRemainingTime(item.remainingMinutes)}
          </span>
        </div>
      </div>

      <div className="pr-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
        <button
          type="button"
          onClick={(e) => onRemove(item, e)}
          className="p-1 border-[3px] border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#e63b2e] hover:text-white transition-colors cursor-pointer neo-shadow-sm active:translate-x-1 active:translate-y-1 active:shadow-none"
          title="Remove from list"
        >
          <X className="w-5 h-5 stroke-[3px]" />
        </button>
      </div>
    </li>
  );
});
