'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { SearchResult } from '@/features/search/types';
import { useAuth } from '@/providers/auth-provider';
import type { User } from '@/types';
import { type CatalogSection, useCatalogSearch } from './use-catalog-search';

/** Return value of the {@link useHomeClient} hook. */
interface UseHomeClientReturn {
  query: string;
  user: User | null;
  /** One entry per catalogue, each resolving independently. */
  sections: CatalogSection[];
  totalCount: number;
  isAnyPending: boolean;
  isSettled: boolean;
  isAllFailed: boolean;
  hasSearched: boolean;
  selectedContent: SearchResult | null;
  selectedContentId: string | null;
  fromContinueWatching: boolean;
  continueWatchingCount: number;
  isContinueWatchingLoading: boolean;
  handleSelectContent: (result: SearchResult) => void;
  handleContinueWatchingSelect: (contentId: string) => void;
  handleCloseModal: () => void;
  handleContinueWatchingLoad: (count: number) => void;
}

/**
 * Client-side hook for the search page.
 *
 * Search state comes from {@link useCatalogSearch}, which runs one query per catalogue so
 * each section of the grid can render as soon as its own upstream answers. There is no
 * server-rendered seed: the merged search took as long as the slowest of three upstreams,
 * and awaiting it in the server component held the whole route behind that worst case.
 */
export function useHomeClient(): UseHomeClientReturn {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const { sections, totalCount, isAnyPending, isSettled, isAllFailed } =
    useCatalogSearch(query);

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

  // Warm the detail modal's chunk once there is something to open.
  useEffect(() => {
    if (totalCount > 0 || continueWatchingCount > 0) {
      void import('@/features/search/components/content-detail-modal');
    }
  }, [totalCount, continueWatchingCount]);

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
    sections,
    totalCount,
    isAnyPending,
    isSettled,
    isAllFailed,
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
