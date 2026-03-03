'use client';

import { Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import { SearchResults } from '@/features/search/components/search-results';
import type { SearchResult } from '@/features/search/types';
import { ContinueWatching } from '@/features/watch/components/ContinueWatching';
import { useHomeClient } from '../hooks/use-home-client';

// Dynamic import for heavy modal component
const ContentDetailModal = dynamic(
  () =>
    import('@/features/search/components/content-detail-modal').then(
      (m) => m.ContentDetailModal,
    ),
  { ssr: false },
);

const EmptySearchPrompt = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
    <div className="bg-muted/5 p-8 rounded-full mb-6 ring-1 ring-white/5 shadow-2xl">
      <Search className="w-12 h-12 text-muted-foreground/20 mx-auto" />
    </div>
    <div className="space-y-2 max-w-[280px] mx-auto">
      <h3 className="text-lg font-medium text-foreground/80">
        Start Exploring
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Search for movies and TV shows to start watching
      </p>
    </div>
  </div>
);

interface HomeClientProps {
  initialResults: SearchResult[];
  initialQuery: string;
}

export function HomeClient({ initialResults, initialQuery }: HomeClientProps) {
  const {
    query,
    results,
    isTransitioning,
    hasSearched,
    selectedContent,
    selectedContentId,
    fromContinueWatching,
    continueWatchingCount,
    isContinueWatchingLoading,
    handleSelectContent,
    handleContinueWatchingSelect,
    handleCloseModal,
    handleContinueWatchingLoad,
  } = useHomeClient({ initialResults, initialQuery });

  return (
    <>
      <main className="container mx-auto px-4 py-8 max-w-4xl min-h-[calc(100vh-80px)] flex flex-col">
        <div className="flex-1">
          {query.trim() ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-muted-foreground" />
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    {isTransitioning
                      ? 'Searching...'
                      : `Results for "${query}"`}
                  </h1>
                  {!isTransitioning && hasSearched ? (
                    <p className="text-sm text-muted-foreground">
                      {results.length} results found
                    </p>
                  ) : null}
                </div>
              </div>

              <SearchResults
                results={results}
                isLoading={isTransitioning}
                onSelect={handleSelectContent}
              />
            </div>
          ) : (
            <div className="space-y-8">
              <ContinueWatching
                onSelectContent={handleContinueWatchingSelect}
                onLoadComplete={handleContinueWatchingLoad}
              />
              {continueWatchingCount === 0 &&
              !isTransitioning &&
              !isContinueWatchingLoading ? (
                <EmptySearchPrompt />
              ) : null}
            </div>
          )}
        </div>
      </main>

      {selectedContent || selectedContentId ? (
        <ContentDetailModal
          contentId={selectedContent?.id || selectedContentId || ''}
          fromContinueWatching={fromContinueWatching}
          onClose={handleCloseModal}
        />
      ) : null}
    </>
  );
}
