'use client';

import { ChevronRight, Film, Loader2 } from 'lucide-react';
import Image from 'next/image';
import React from 'react';
import type { SearchResult } from '../types';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  onSelect: (result: SearchResult) => void;
}

export function SearchResults({
  results,
  isLoading,
  onSelect,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
        <p className="mt-4 text-muted-foreground text-sm">Searching...</p>
      </div>
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
    <div className="space-y-2">
      {results.map((result, index) => (
        <SearchResultItem
          key={result.id}
          result={result}
          onSelect={onSelect}
          index={index}
        />
      ))}
    </div>
  );
}

interface SearchResultItemProps {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
  index: number;
}

function SearchResultItem({ result, onSelect, index }: SearchResultItemProps) {
  const [imageError, setImageError] = React.useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="group flex items-center gap-4 p-3 rounded-xl bg-card/40 hover:bg-card/80 border border-border/30 hover:border-border/60 cursor-pointer transition-all duration-200 hover:shadow-lg w-full text-left"
    >
      {/* Landscape Thumbnail */}
      <div className="relative w-24 md:w-32 aspect-video flex-shrink-0 rounded-lg overflow-hidden bg-muted/30">
        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <Film className="w-6 h-6 text-muted-foreground/50" />
          </div>
        ) : (
          <Image
            src={result.poster}
            alt={result.title}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized={result.poster.includes('/api/stream/')}
            sizes="(max-width: 768px) 96px, 128px"
            loading={index < 3 ? 'eager' : 'lazy'}
            priority={index === 0}
          />
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h3 className="text-foreground font-medium text-base group-hover:text-primary transition-colors line-clamp-2">
          {result.title}
        </h3>
        {result.year && (
          <p className="text-muted-foreground text-sm mt-0.5">{result.year}</p>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all flex-shrink-0" />
    </button>
  );
}
