'use client';

import { Film } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';
import { SearchSkeleton } from '@/components/ui/skeletons';
import { useSearchResults } from '../hooks/use-search-results';
import type { SearchResult } from '../types';
import { SearchResultItem } from './search-result-item';

/** Props for {@link SearchResults}. */
interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  onSelect: (result: SearchResult) => void;
}

/**
 * Displays a single flat grid of search-result cards. Deduplicates results by ID, shows
 * skeleton placeholders while loading, and renders an empty-state illustration when no
 * results match.
 *
 * Used where results arrive as one merged list. The main search page renders
 * {@link SearchResultsByCatalog} instead, which fills one section per catalogue as each
 * upstream answers rather than waiting on the slowest.
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

  if (uniqueResults.length === 0) {
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
