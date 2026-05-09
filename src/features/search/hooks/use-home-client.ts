'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { searchContent } from '@/features/search/api';
import { searchQuerySchema } from '@/features/search/schema';
import type { SearchResult } from '@/features/search/types';
import { useAuth } from '@/providers/auth-provider';
import { useServer } from '@/providers/server-provider';

/** Options for the {@link useHomeClient} hook. */
interface UseHomeClientOptions {
  initialResults: SearchResult[];
  initialQuery: string;
}

/**
 * Client-side hook for the home/search page.
 *
 * Reacts to the `q` URL search-param, validates it against
 * {@link searchQuerySchema}, fetches results via `searchContent`, and
 * manages content-detail modal selection (including continue-watching
 * entries). Lazily preloads the content-detail modal chunk when results
 * or continue-watching items are present.
 *
 * @param options - {@link UseHomeClientOptions}
 * @returns Query string, results, loading/transition flags, modal state,
 *          and selection handlers.
 */
export function useHomeClient({
  initialResults,
  initialQuery,
}: UseHomeClientOptions) {
  const t = useTranslations('common.toasts');
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || initialQuery;

  const [results, setResults] = useState<SearchResult[]>(initialResults);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(!!initialQuery);

  // When server provides fresh results (page navigation), use them immediately
  useEffect(() => {
    setResults(initialResults);
    setIsLoading(false);
  }, [initialResults]);
  const [selectedContent, setSelectedContent] = useState<SearchResult | null>(
    null,
  );
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null,
  );
  const [fromContinueWatching, setFromContinueWatching] = useState(false);
  const [continueWatchingCount, setContinueWatchingCount] = useState(0);
  const [isContinueWatchingLoading, setIsContinueWatchingLoading] =
    useState(true);

  const { user } = useAuth();
  const { activeServer } = useServer();

  useEffect(() => {
    if (!query.trim()) {
      startTransition(() => {
        setResults([]);
        setHasSearched(false);
      });
      return;
    }

    const validation = searchQuerySchema.safeParse({ q: query.trim() });
    if (!validation.success) {
      startTransition(() => setResults([]));
      return;
    }
    if (query === initialQuery && initialResults.length > 0) {
      return;
    }

    setIsLoading(true);

    const controller = new AbortController();
    const fetchResults = async () => {
      setHasSearched(true);
      try {
        const data = await searchContent(query, activeServer, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          startTransition(() => setResults(data));
        }
      } catch (_error: unknown) {
        if (!controller.signal.aborted) {
          toast.error(t('searchFailed'));
          startTransition(() => setResults([]));
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchResults();
    return () => controller.abort();
  }, [query, initialQuery, initialResults, activeServer, t]);

  useEffect(() => {
    setIsContinueWatchingLoading(true);
    setContinueWatchingCount(0);
  }, []);

  useEffect(() => {
    if (results.length > 0 || continueWatchingCount > 0) {
      void import('@/features/search/components/content-detail-modal');
    }
  }, [results.length, continueWatchingCount]);

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
    setIsContinueWatchingLoading(false);
  }, []);

  return {
    query,
    user,
    results,
    isTransitioning: isLoading || isSearching,
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
  };
}
