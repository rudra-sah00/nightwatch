'use client';

import { Film } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import React from 'react';
import { SearchSkeleton } from '@/components/ui/skeletons';
import { getOptimizedImageUrl } from '@/lib/utils';
import {
  useSearchResultItem,
  useSearchResults,
} from '../hooks/use-search-results';
import type { SearchResult } from '../types';

/** Props for {@link SearchResults}. */
interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  onSelect: (result: SearchResult) => void;
}

/**
 * Displays a responsive grid of search-result cards. Deduplicates results
 * by ID, shows skeleton placeholders while loading, and renders an
 * empty-state illustration when no results match.
 *
 * @param props - {@link SearchResultsProps}
 * @returns The search results grid element.
 */
export const SearchResults = React.memo(function SearchResults({
  results,
  isLoading,
  onSelect,
}: SearchResultsProps) {
  // Deduplicate results by id (API can return duplicates from different sources)
  const { uniqueResults } = useSearchResults(results);
  const t = useTranslations('search');

  if (isLoading) {
    return (
      <output
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
        aria-busy="true"
        aria-label={t('results.searchingAriaLabel')}
      >
        {[
          'res-sk-1',
          'res-sk-2',
          'res-sk-3',
          'res-sk-4',
          'res-sk-5',
          'res-sk-6',
        ].map((id) => (
          <SearchSkeleton key={id} />
        ))}
      </output>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-card border-[4px] border-border  text-center max-w-2xl mx-auto w-full">
        <Film className="w-20 h-20 text-neo-blue mb-6 stroke-[3px]" />
        <h3 className="text-4xl font-black font-headline uppercase tracking-tighter text-foreground mb-4">
          {t('results.noResultsArchive')}
        </h3>
        <p className="font-headline font-bold uppercase tracking-widest text-foreground/70 max-w-sm px-6">
          {t('results.noResultsArchiveHint')}
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
      style={{ contentVisibility: 'auto' }}
    >
      {uniqueResults.map((result, index) => (
        <SearchResultItem
          key={result.id}
          result={result}
          onSelect={onSelect}
          index={index}
        />
      ))}
    </div>
  );
});

/** Props for the internal {@link SearchResultItem} card. */
interface SearchResultItemProps {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
  index: number;
}

const SearchResultItem = React.memo(function SearchResultItem({
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
      </div>

      {/* Title */}
      <p className="font-headline text-xs sm:text-sm font-black uppercase tracking-tight leading-tight mt-2 line-clamp-2 group-hover:text-neo-blue transition-colors">
        {result.title}
      </p>
    </button>
  );
});
