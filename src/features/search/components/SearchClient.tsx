'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { SearchResults } from '@/features/search/components/search-results';
import type { SearchResult } from '@/features/search/types';
import { useHomeClient } from '../hooks/use-home-client';
import { useSearchInput } from '../hooks/use-search-input';

const ContentDetailModal = dynamic(
  () =>
    import('@/features/search/components/content-detail-modal').then(
      (m) => m.ContentDetailModal,
    ),
  { ssr: false },
);

import { GlobalLoading } from '@/components/ui/global-loading';
import { useAuth } from '@/providers/auth-provider';

/** Props for the {@link SearchClient} component. */
interface SearchClientProps {
  /** Server-rendered initial search results. */
  initialResults: SearchResult[];
  /** The initial search query from URL parameters. */
  initialQuery: string;
  /** Whether the server-side search request failed. */
  serverError?: boolean;
}

/**
 * Client-side search results page with an inline-editable query input.
 *
 * Renders search results in a grid, handles loading/error/empty states, and
 * opens a {@link ContentDetailModal} when a result is selected. The search
 * input triggers a router transition on Enter for URL-driven search.
 */
export function SearchClient({
  initialResults,
  initialQuery,
  serverError,
}: SearchClientProps) {
  const {
    results,
    isTransitioning,
    hasSearched,
    selectedContent,
    selectedContentId,
    fromContinueWatching,
    handleSelectContent,
    handleCloseModal,
  } = useHomeClient({ initialResults, initialQuery });

  const {
    query: searchInputQuery,
    setQuery: setSearchInputQuery,
    handleSearch,
    isPending,
  } = useSearchInput();

  const { isLoading } = useAuth();

  const t = useTranslations('search');

  if (isLoading) {
    return <GlobalLoading />;
  }

  // isPending goes true the instant the user presses Enter (router transition
  // fires) and stays true until the new page renders — giving immediate
  // skeleton feedback without reacting to every character typed.

  return (
    <div className="w-full">
      <main className="container mx-auto px-4 sm:px-6 py-6 md:py-10 md:px-10 min-h-[calc(100vh-80px)] animate-in fade-in overflow-x-clip">
        <div className="w-full">
          {/* Compact search header */}
          <div className="mb-6 md:mb-10">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-headline text-lg sm:text-xl md:text-2xl font-black uppercase tracking-widest text-foreground/50 shrink-0">
                {isTransitioning || isPending
                  ? t('results.searching')
                  : t('results.resultsLabel')}
              </span>
              <input
                value={searchInputQuery}
                onChange={(e) => setSearchInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  handleSearch(e);
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="search"
                className="font-headline text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tighter text-neo-blue underline decoration-2 underline-offset-4 outline-none caret-neo-blue bg-transparent border-none p-0 focus:bg-neo-yellow focus:text-foreground focus:no-underline transition-colors focus:px-2 rounded-sm min-w-[3ch]"
                style={{
                  width: `${Math.max(searchInputQuery.length + 1, 3)}ch`,
                }}
                aria-label={t('results.editQueryAriaLabel')}
              />
            </div>
            <p className="font-headline font-bold text-xs uppercase tracking-widest text-foreground/40">
              {t('results.filmsFound', { count: results.length })}
            </p>
          </div>

          <div className="space-y-6">
            {serverError &&
            !isTransitioning &&
            hasSearched &&
            results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-neo-surface border-[4px] border-border text-center">
                <span className="text-5xl mb-4">⚠️</span>
                <p className="font-headline font-black uppercase tracking-widest text-foreground mb-2">
                  {t('results.searchFailed')}
                </p>
                <p className="font-headline font-bold uppercase tracking-widest text-neo-muted text-sm max-w-sm">
                  {t('results.searchFailedHint')}
                </p>
              </div>
            ) : !isTransitioning &&
              !isPending &&
              hasSearched &&
              results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-neo-surface border-[4px] border-border text-center">
                <span className="text-5xl mb-4">🔍</span>
                <p className="font-headline font-black uppercase tracking-widest text-foreground mb-2">
                  {t('results.noResults')}
                </p>
                <p className="font-headline font-bold uppercase tracking-widest text-neo-muted text-sm max-w-sm">
                  {t('results.noResultsHint')}
                </p>
              </div>
            ) : (
              <SearchResults
                results={results}
                isLoading={isTransitioning || isPending}
                onSelect={handleSelectContent}
              />
            )}
          </div>
        </div>
      </main>

      {selectedContent || selectedContentId ? (
        <ContentDetailModal
          contentId={selectedContent?.id || selectedContentId || ''}
          fromContinueWatching={fromContinueWatching}
          onClose={handleCloseModal}
        />
      ) : null}
    </div>
  );
}
