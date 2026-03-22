'use client';

import { Film } from 'lucide-react';
import Image from 'next/image';
import React from 'react';
import { SearchSkeleton } from '@/components/ui/skeletons';
import { getOptimizedImageUrl } from '@/lib/utils';
import {
  useSearchResultItem,
  useSearchResults,
} from '../hooks/use-search-results';
import type { SearchResult } from '../types';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  onSelect: (result: SearchResult) => void;
}

export const SearchResults = React.memo(function SearchResults({
  results,
  isLoading,
  onSelect,
}: SearchResultsProps) {
  // Deduplicate results by id (API can return duplicates from different sources)
  // Must be called before any early returns to satisfy rules of hooks.
  const { uniqueResults } = useSearchResults(results);

  if (isLoading) {
    return (
      <output
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
        aria-busy="true"
        aria-label="Searching..."
      >
        {['res-sk-1', 'res-sk-2', 'res-sk-3', 'res-sk-4'].map((id) => (
          <SearchSkeleton key={id} />
        ))}
      </output>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
          <Film className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-medium text-muted-foreground">
          No results found
        </h3>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Try searching for something else
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

  return (
    <div className="group relative bg-white border-4 border-[#1a1a1a] neo-shadow p-2 transition-all hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_rgba(26,26,26,1)] flex flex-col h-full">
      {/* Target Poster Container */}
      <button
        type="button"
        className="aspect-[2/3] border-2 border-[#1a1a1a] overflow-hidden relative mb-4 flex-shrink-0 cursor-pointer w-full p-0"
        onClick={() => onSelect(result)}
        aria-label={`View details for ${result.title}`}
      >
        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f5f0e8]">
            <Film className="w-12 h-12 text-[#1a1a1a]/20" />
          </div>
        ) : (
          <Image
            src={getOptimizedImageUrl(result.poster)}
            alt={result.title}
            fill
            className="object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-300"
            onError={() => setImageError(true)}
            unoptimized={result.poster?.includes('/api/stream/')}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading={index < 4 ? 'eager' : 'lazy'}
            priority={index === 0}
          />
        )}

        {/* Release Year Badge */}
        {result.year ? (
          <div className="absolute top-4 right-4 bg-[#ffcc00] border-2 border-[#1a1a1a] px-3 py-1 font-headline font-black uppercase text-sm text-[#1a1a1a]">
            {result.year}
          </div>
        ) : null}
      </button>

      <div className="px-2 pb-2 flex flex-col flex-1">
        {/* Title */}
        <button
          type="button"
          className="font-headline text-2xl md:text-3xl font-black uppercase tracking-tighter leading-tight mt-auto cursor-pointer hover:text-[#0055ff] text-[#1a1a1a] outline-none focus:text-[#0055ff] text-left w-full p-0 bg-transparent border-none appearance-none"
          title={result.title}
          onClick={() => onSelect(result)}
        >
          {result.title}
        </button>
      </div>
    </div>
  );
});
