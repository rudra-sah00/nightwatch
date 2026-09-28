'use client';

import { Film } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import React from 'react';
import { cn, getOptimizedImageUrl } from '@/lib/utils';
import { useSearchResultItem } from '../hooks/use-search-results';
import { catalogBadgeClass } from '../lib/catalog-badge';
import type { SearchResult } from '../types';

/** Props for {@link SearchResultItem}. */
export interface SearchResultItemProps {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
  /** Position within its own grid, used only to decide eager vs lazy image loading. */
  index: number;
}

/**
 * One search-result poster card.
 *
 * Extracted from the results grid so both the merged grid and the per-catalogue sections
 * render an identical card.
 */
export const SearchResultItem = React.memo(function SearchResultItem({
  result,
  onSelect,
  index,
}: SearchResultItemProps) {
  const { imageError, setImageError } = useSearchResultItem();
  const t = useTranslations('search');

  return (
    <button
      type="button"
      className="group flex flex-col text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neo-blue rounded-lg overflow-hidden"
      onClick={() => onSelect(result)}
      aria-label={t('results.viewDetailsFor', { title: result.title })}
    >
      {/* Poster */}
      <div className="aspect-[2/3] border-[2px] border-border overflow-hidden relative w-full bg-background rounded-lg">
        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <Film className="w-8 h-8 text-foreground/20 stroke-[3px]" />
          </div>
        ) : (
          <Image
            src={getOptimizedImageUrl(result.poster)}
            alt={result.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
            unoptimized={result.poster?.includes('/api/stream/')}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            loading={index < 6 ? 'eager' : 'lazy'}
            priority={index === 0}
          />
        )}

        {/* Year badge */}
        {result.year ? (
          <div className="absolute top-2 right-2 bg-neo-yellow border-[2px] border-border px-1.5 py-0.5 font-headline font-black text-[10px] text-foreground">
            {result.year}
          </div>
        ) : null}

        {/* Catalogue badge — which service the title came from. Bottom-left so it never
            collides with the year badge, and colour-coded per catalogue so the origin is
            recognisable at a glance across a dense grid. */}
        {result.sourceLabel ? (
          <div
            className={cn(
              'absolute bottom-2 left-2 right-2 border-[2px] border-border px-1.5 py-0.5 font-headline font-black text-[9px] sm:text-[10px] uppercase tracking-wider text-foreground truncate',
              catalogBadgeClass(result.source),
            )}
          >
            {result.sourceLabel}
          </div>
        ) : null}
      </div>

      {/* Title */}
      <p className="font-headline text-xs sm:text-sm font-black uppercase tracking-tight leading-tight mt-2 line-clamp-2 group-hover:text-neo-blue transition-colors">
        {result.title}
      </p>
    </button>
  );
});
