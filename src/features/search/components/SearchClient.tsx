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
      <main className="container mx-auto px-6 py-12 md:px-10 min-h-[calc(100vh-80px)] animate-in fade-in overflow-x-clip">
        <div className="w-full">
          <div className="mb-12">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-4 mb-4">
              <h1 className="font-headline text-5xl sm:text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none text-foreground flex flex-wrap gap-x-4 items-baseline overflow-visible">
                <span className="shrink-0">
                  {isTransitioning || isPending
                    ? t('results.searching')
                    : t('results.resultsLabel')}
                </span>
                {/* Real Input Layer */}
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
                  className="text-neo-blue underline decoration-4 md:decoration-8 underline-offset-8 outline-none caret-[#0055ff] min-w-[2ch] inline-block bg-transparent border-none p-0 focus:bg-neo-yellow focus:text-foreground focus:no-underline transition-colors focus:px-2 rounded-sm font-black font-headline uppercase leading-none tracking-tighter relative z-10 text-inherit overflow-visible"
                  style={{
                    // +2ch buffer: uppercase condensed glyphs are wider than 1ch at large sizes
                    width: `${Math.max(searchInputQuery.length + 1, 2)}ch`,
                  }}
                  aria-label={t('results.editQueryAriaLabel')}
                />
              </h1>
            </div>
            <p className="font-headline font-bold text-xl uppercase tracking-widest text-foreground/70">
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
