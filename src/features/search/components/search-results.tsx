'use client';

import { Film } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
        aria-busy="true"
        aria-label={t('results.searchingAriaLabel')}
      >
        {['res-sk-1', 'res-sk-2', 'res-sk-3', 'res-sk-4'].map((id) => (
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
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
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
    <Card className="p-2">
      {/* Target Poster Container */}
      <button
        type="button"
        className="group aspect-[2/3] border-[3px] border-border overflow-hidden relative mb-4 flex-shrink-0 cursor-pointer w-full p-0 bg-background"
        onClick={() => onSelect(result)}
        aria-label={t('results.viewDetailsFor', { title: result.title })}
      >
        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <Film className="w-12 h-12 text-foreground/20 stroke-[3px]" />
          </div>
        ) : (
          <Image
            src={getOptimizedImageUrl(result.poster)}
            alt={result.title}
            fill
            className="object-cover grayscale contrast-125 group-hover:grayscale-0 transition-[filter] duration-300"
            onError={() => setImageError(true)}
            unoptimized={result.poster?.includes('/api/stream/')}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading={index < 4 ? 'eager' : 'lazy'}
            priority={index === 0}
          />
        )}

        {/* Release Year Badge */}
        {result.year ? (
          <div className="absolute top-4 right-4 bg-neo-yellow border-[2px] border-border px-3 py-1 font-headline font-black uppercase text-sm text-foreground ">
            {result.year}
          </div>
        ) : null}

        {/* Provider Badge */}
        {result.provider === 'pv' ? (
          <div className="absolute bottom-3 left-3 bg-[#00a8e1] border-[2px] border-border px-2 py-0.5 font-headline font-black uppercase text-xs text-white tracking-wide">
            Prime Video
          </div>
        ) : result.provider === 's1' ? (
          <div className="absolute bottom-3 left-3 bg-[#e50914] border-[2px] border-border px-2 py-0.5 font-headline font-black uppercase text-xs text-white tracking-wide">
            Netflix
          </div>
        ) : null}
      </button>

      <CardContent className="px-2 pb-2">
        {/* Title */}
        <button
          type="button"
          className="font-headline text-2xl md:text-3xl font-black uppercase tracking-tighter leading-tight mt-auto cursor-pointer hover:text-neo-blue text-foreground outline-none focus:text-neo-blue text-left w-full p-0 bg-transparent border-none appearance-none line-clamp-2"
          title={result.title}
          onClick={() => onSelect(result)}
        >
          {result.title}
        </button>
      </CardContent>
    </Card>
  );
});
