'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { SearchIdle } from '@/features/search/components/SearchIdle';
import { SearchResultsByCatalog } from '@/features/search/components/search-results-by-catalog';
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

/**
 * Client-side search results page with an inline-editable query input.
 *
 * Results render as one section per catalogue, each filling in as its own upstream answers
 * rather than all appearing at once when the slowest of three finishes. Sections still in
 * flight show skeleton tiles under their heading, so the page reads as "more is coming"
 * instead of looking complete.
 *
 * Opens a {@link ContentDetailModal} when a result is selected. The search input triggers a
 * router transition on Enter for URL-driven search.
 */
export function SearchClient() {
  const {
    sections,
    totalCount,
    isAnyPending,
    isSettled,
    isAllFailed,
    hasSearched,
    selectedContent,
    selectedContentId,
    fromContinueWatching,
    handleSelectContent,
    handleCloseModal,
  } = useHomeClient();

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

  // No query means there is nothing to report on. The results layout would render a
  // "Results:" label over an empty input, "0 Films Found" and then dead space — which
  // is what the hub's Movies & Web Series tile used to land on. Show the search
  // landing instead.
  const isIdle = !(hasSearched || isPending);

  if (isIdle) {
    return (
      <div className="w-full">
        <SearchIdle />
      </div>
    );
  }

  // isPending goes true the instant the user presses Enter (router transition fires) and
  // stays true until the new page renders — giving immediate feedback on the header label
  // without reacting to every character typed.
  const isBusy = isAnyPending || isPending;

  // Only a total failure earns the full-width panel. One dead catalogue is handled inside
  // its own section, which keeps the others' results on screen.
  const showFailurePanel = isAllFailed && !isPending;
  const showEmptyPanel =
    isSettled && !isPending && !isAllFailed && totalCount === 0;

  return (
    <div className="w-full">
      <main className="container mx-auto px-4 sm:px-6 py-6 md:py-10 md:px-10 min-h-[calc(100vh-80px)] animate-in fade-in overflow-x-clip">
        <div className="w-full">
          {/* Compact search header */}
          <div className="mb-6 md:mb-10">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-headline text-lg sm:text-xl md:text-2xl font-black uppercase tracking-widest text-foreground/50 shrink-0">
                {isBusy ? t('results.searching') : t('results.resultsLabel')}
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
            {/* Counts up as catalogues land, so it reads as progress rather than a final
                tally that keeps changing. */}
            <p
              className="font-headline font-bold text-xs uppercase tracking-widest text-foreground/40"
              aria-live="polite"
            >
              {t('results.filmsFound', { count: totalCount })}
            </p>
          </div>

          <div className="space-y-6">
            {showFailurePanel ? (
              <div className="flex flex-col items-center justify-center py-20 bg-neo-surface border-[4px] border-border text-center">
                <span className="text-5xl mb-4">⚠️</span>
                <p className="font-headline font-black uppercase tracking-widest text-foreground mb-2">
                  {t('results.searchFailed')}
                </p>
                <p className="font-headline font-bold uppercase tracking-widest text-neo-muted text-sm max-w-sm">
                  {t('results.searchFailedHint')}
                </p>
              </div>
            ) : showEmptyPanel ? (
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
              <SearchResultsByCatalog
                sections={sections}
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
