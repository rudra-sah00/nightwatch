'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchInput } from '../hooks/use-search-input';

interface SearchInputProps {
  isLoading?: boolean;
}

export function SearchInput({ isLoading = false }: SearchInputProps) {
  const {
    containerRef,
    query,
    setQuery,
    isFetchingSuggestions,
    isPending,
    handleFocus,
    handleBlur,
    suggestion,
    handleSearch,
    handleClear,
  } = useSearchInput();

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className="relative w-full"
        role="combobox"
        tabIndex={0}
        aria-expanded={false}
        aria-haspopup="listbox"
      >
        {isPending || isLoading || isFetchingSuggestions ? (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center z-20">
            <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors text-muted-foreground z-20" />
        )}

        <div className="flex-grow relative h-10 flex items-center overflow-hidden">
          {/* Ghost Text Layer (Lower) */}
          {query &&
          suggestion &&
          suggestion.toLowerCase().startsWith(query.toLowerCase()) ? (
            <div className="absolute inset-0 pointer-events-none flex items-center select-none z-0 pl-10 pr-10 text-sm font-sans">
              <span className="text-transparent whitespace-pre leading-none">
                {query}
              </span>
              <span className="text-muted-foreground/30 whitespace-pre leading-none">
                {suggestion.slice(query.length)}
              </span>
            </div>
          ) : null}

          {/* Real Input Layer (Upper) */}
          <Input
            placeholder="Search for movies, shows..."
            className="pl-10 pr-10 bg-secondary border-border focus-visible:ring-primary/50 h-full w-full relative z-10 bg-transparent"
            onFocus={handleFocus}
            onBlur={handleBlur}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearch}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-label="Search content"
          />
        </div>

        {/* Clear button */}
        {query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-20"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* ARIA Live region for search status */}
      <div className="sr-only" aria-live="polite">
        {isPending || isLoading ? 'Searching...' : ''}
      </div>
    </div>
  );
}
