'use client';

import dynamic from 'next/dynamic';
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

interface SearchClientProps {
  initialResults: SearchResult[];
  initialQuery: string;
}

export function SearchClient({
  initialResults,
  initialQuery,
}: SearchClientProps) {
  const {
    results,
    isTransitioning,
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

  // isPending goes true the instant the user presses Enter (router transition
  // fires) and stays true until the new page renders — giving immediate
  // skeleton feedback without reacting to every character typed.

  return (
    <div className="w-full">
      <main className="container mx-auto px-6 py-12 md:px-10 min-h-[calc(100vh-80px)] animate-in fade-in overflow-x-clip">
        <div className="w-full">
          <div className="mb-12">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-4 mb-4">
              <h1 className="font-headline text-5xl sm:text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none text-[#1a1a1a] flex flex-wrap gap-x-4 items-baseline overflow-visible">
                <span className="shrink-0">
                  {isTransitioning || isPending ? 'Searching:' : 'Results:'}
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
                  autoCapitalize="off"
                  spellCheck="false"
                  className="text-[#0055ff] underline decoration-4 md:decoration-8 underline-offset-8 outline-none caret-[#0055ff] min-w-[2ch] inline-block bg-transparent border-none p-0 focus:bg-[#ffcc00] focus:text-[#1a1a1a] focus:no-underline transition-colors focus:px-2 rounded-sm font-black font-headline uppercase leading-none tracking-tighter relative z-10 text-inherit overflow-visible"
                  style={{
                    // +2ch buffer: uppercase condensed glyphs are wider than 1ch at large sizes
                    width: `${Math.max(searchInputQuery.length + 1, 2)}ch`,
                  }}
                  aria-label="Edit search query"
                />
              </h1>
            </div>
            {!isTransitioning && !isPending && (
              <p className="font-headline font-bold text-xl uppercase tracking-widest text-[#4a4a4a]">
                {results.length} Films Found in the Archives
              </p>
            )}
          </div>

          <div className="space-y-6">
            <SearchResults
              results={results}
              isLoading={isTransitioning || isPending}
              onSelect={handleSelectContent}
            />
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
