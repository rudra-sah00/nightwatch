'use client';

import { Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Navbar } from '@/components/layout/navbar';
import { searchContent } from '@/features/search/api';
import { SearchResults } from '@/features/search/components/search-results';
import type { SearchResult } from '@/features/search/types';
import { ContinueWatching } from '@/features/watch/components/ContinueWatching';

// Dynamic import for heavy modal component
const ContentDetailModal = dynamic(
  () =>
    import('@/features/search/components/content-detail-modal').then(
      (m) => m.ContentDetailModal,
    ),
  { ssr: false },
);

const EmptySearchPrompt = () => (
  <div className="flex items-center justify-center min-h-[70vh] text-center">
    <div>
      <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
      <p className="text-muted-foreground">
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
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || initialQuery;

  const [results, setResults] = useState<SearchResult[]>(initialResults);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(!!initialQuery);
  const [selectedContent, setSelectedContent] = useState<SearchResult | null>(
    null,
  );
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null,
  );
  const [fromContinueWatching, setFromContinueWatching] = useState(false);
  const [continueWatchingCount, setContinueWatchingCount] = useState(0);

  useEffect(() => {
    // Skip initial fetch if we already have results from server or no query
    if (!query.trim()) {
      startTransition(() => {
        setResults([]);
        setHasSearched(false);
      });
      return;
    }

    // If query matches initialQuery and we have initialResults, skip first fetch
    if (query === initialQuery && initialResults.length > 0) {
      return;
    }

    // INSTANT FEEDBACK: Immediately show loading state when query changes and we need to fetch
    setIsLoading(true);

    const controller = new AbortController();
    const fetchResults = async () => {
      setHasSearched(true);

      try {
        const data = await searchContent(query, { signal: controller.signal });
        if (!controller.signal.aborted) {
          startTransition(() => {
            setResults(data);
          });
        }
      } catch (_error: unknown) {
        if (!controller.signal.aborted) {
          toast.error('Search failed');
          startTransition(() => setResults([]));
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchResults();
    return () => controller.abort();
  }, [query, initialQuery, initialResults]);

  const handleSelectContent = useCallback((result: SearchResult) => {
    setSelectedContent(result);
    setSelectedContentId(null);
    setFromContinueWatching(false);
  }, []);

  const handleContinueWatchingSelect = useCallback((contentId: string) => {
    setSelectedContent(null);
    setSelectedContentId(contentId);
    setFromContinueWatching(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedContent(null);
    setSelectedContentId(null);
    setFromContinueWatching(false);
  }, []);

  const handleContinueWatchingLoad = useCallback((count: number) => {
    setContinueWatchingCount(count);
  }, []);

  const isTransitioning = isLoading || isSearching;

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {query.trim() ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-muted-foreground" />
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {isTransitioning ? 'Searching...' : `Results for "${query}"`}
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
            {continueWatchingCount === 0 && !isLoading ? (
              <EmptySearchPrompt />
            ) : null}
          </div>
        )}
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
