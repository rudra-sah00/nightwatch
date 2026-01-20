'use client';

import { Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Navbar } from '@/components/layout/navbar';
import { searchContent } from '@/features/search/api';
import { ContentDetailModal } from '@/features/search/components/content-detail-modal';
import { SearchResults } from '@/features/search/components/search-results';
import type { SearchResult } from '@/features/search/types';
import { ContinueWatching } from '@/features/watch/components/ContinueWatching';

function HomeContent() {
  const searchParams = useSearchParams();
  // const router = useRouter();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedContent, setSelectedContent] = useState<SearchResult | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [continueWatchingCount, setContinueWatchingCount] = useState(0);

  // Fetch search results when query changes
  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setHasSearched(true);

      try {
        const data = await searchContent(query);
        setResults(data);
      } catch {
        toast.error('Search failed');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const handleSelectContent = useCallback((result: SearchResult) => {
    setSelectedContent(result);
    setSelectedContentId(null);
  }, []);

  // Handler for continue watching selection - by contentId
  const handleContinueWatchingSelect = useCallback((contentId: string) => {
    setSelectedContent(null);
    setSelectedContentId(contentId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedContent(null);
    setSelectedContentId(null);
  }, []);

  // Handle continue watching load
  const handleContinueWatchingLoad = useCallback((count: number) => {
    setContinueWatchingCount(count);
  }, []);

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Show search results if there's a query */}
        {query.trim() ? (
          <div className="space-y-6">
            {/* Search Header */}
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-muted-foreground" />
              <div>
                <h1 className="text-lg md:text-xl font-semibold text-foreground">
                  {isLoading ? 'Searching...' : `Results for "${query}"`}
                </h1>
                {!isLoading && hasSearched && (
                  <p className="text-sm text-muted-foreground">
                    {results.length} {results.length === 1 ? 'result' : 'results'} found
                  </p>
                )}
              </div>
            </div>

            {/* Results Grid */}
            <SearchResults results={results} isLoading={isLoading} onSelect={handleSelectContent} />
          </div>
        ) : (
          /* Home state - show Continue Watching and recommendation sections */
          <div className="space-y-8">
            {/* Continue Watching Section */}
            <ContinueWatching
              onSelectContent={handleContinueWatchingSelect}
              onLoadComplete={handleContinueWatchingLoad}
            />

            {/* Prompt to search - only show when no continue watching items */}
            {continueWatchingCount === 0 && (
              <div className="flex items-center justify-center min-h-[30vh] text-center">
                <div>
                  <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Search for movies and TV shows to start watching
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Content Detail Modal */}
      {(selectedContent || selectedContentId) && (
        <ContentDetailModal
          contentId={selectedContent?.id || selectedContentId || ''}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

// Main export with Suspense boundary
export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
