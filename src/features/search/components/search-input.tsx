'use client';

import { Clock, Search, Sparkles, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSearchInput } from '../hooks/use-search-input';

interface SearchInputProps {
  isLoading?: boolean;
}

export function SearchInput({ isLoading = false }: SearchInputProps) {
  const {
    containerRef,
    query,
    setQuery,
    history,
    suggestions,
    isFetchingSuggestions,
    isPending,
    showSuggestions,
    showHistory,
    hasSuggestions,
    handleFocus,
    handleDeleteItem,
    handleClearHistory,
    handleSelect,
    handleSearch,
    handleClear,
  } = useSearchInput();

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className="relative w-full"
        role="combobox"
        tabIndex={0}
        aria-expanded={showSuggestions || showHistory}
        aria-haspopup="listbox"
        aria-controls="search-dropdown-listbox"
      >
        {isPending || isLoading || isFetchingSuggestions ? (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Search
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors text-muted-foreground',
            )}
          />
        )}
        <Input
          placeholder="Search for movies, shows..."
          className="pl-10 pr-10 bg-secondary border-border focus-visible:ring-primary/50 h-10 w-full"
          onFocus={handleFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearch}
          aria-autocomplete="list"
          aria-label="Search content"
        />
        {/* Clear button */}
        {query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
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

      {/* Suggestions dropdown (when user is typing) */}
      {showSuggestions && hasSuggestions ? (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          id="search-dropdown-listbox"
          role="listbox"
          aria-label="Search suggestions"
        >
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>Suggestions</span>
            </div>
            <div className="max-h-[280px] overflow-y-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  role="option"
                  aria-selected="false"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  onClick={() => handleSelect(suggestion)}
                >
                  <Search className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                  <span className="truncate">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* History dropdown (when input is empty/focused) */}
      {showHistory ? (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
              <span>Recent Searches</span>
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-xs hover:text-foreground transition-colors"
              >
                Clear All
              </button>
            </div>

            <div
              className="max-h-[300px] overflow-y-auto"
              id="search-history-listbox"
              role="listbox"
              aria-label="Recent searches"
            >
              {history.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center pr-2 hover:bg-muted/50 transition-colors rounded-lg"
                  role="option"
                  aria-selected="false"
                  tabIndex={0}
                >
                  <button
                    type="button"
                    className="flex-1 flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground group-hover:text-foreground truncate text-left bg-transparent border-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-l-lg"
                    onClick={() => handleSelect(item.query)}
                  >
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{item.query}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(e, item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-destructive transition-opacity flex-shrink-0 focus:opacity-100 focus-visible:opacity-100"
                    aria-label="Remove from history"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
