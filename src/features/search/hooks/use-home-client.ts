'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { searchContent } from '@/features/search/api';
import type { SearchResult } from '@/features/search/types';
import { useAuth } from '@/providers/auth-provider';

/** Options for the {@link useHomeClient} hook. */
interface UseHomeClientOptions {
  initialResults: SearchResult[];
  initialQuery: string;
}

/**
 * Client-side hook for the home/search page.
 * Uses TanStack Query for search caching — results persist when navigating away and back.
 */
export function useHomeClient({
  initialResults,
  initialQuery,
}: UseHomeClientOptions) {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || initialQuery;

  const { data: results = initialResults } = useQuery({
    queryKey: ['search', query],
    queryFn: () => searchContent(query),
    enabled: !!query.trim(),
    initialData: initialResults.length > 0 ? initialResults : undefined,
    placeholderData: (prev) => prev,
  });

  const hasSearched = !!query.trim();

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
    isTransitioning: false,
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
