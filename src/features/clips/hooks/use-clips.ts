'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { type ClipFilters, deleteClip, getClips, renameClip } from '../api';
import type { Clip } from '../types';

/**
 * Manages fetching, pagination, filtering, deletion, and renaming of user clips.
 *
 * Automatically refetches when filter values change. Supports infinite-scroll
 * pagination via `loadMore()`.
 *
 * @param filters - Optional search, sort, and date range filters.
 * @returns Clip list, loading states, and mutation helpers (`remove`, `rename`, `loadMore`, `refetch`).
 */
export function useClips(filters?: ClipFilters) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchPage = useCallback(
    async (p: number, append: boolean) => {
      if (p === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const res = await getClips(p, 12, filtersRef.current);
        setClips((prev) => (append ? [...prev, ...res.clips] : res.clips));
        setPage(p);
        setHasMore(p < res.totalPages);
      } catch {
        /* silent */
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [], // filtersRef is a ref, stable across renders
  );

  const filterKey = `${filters?.search}|${filters?.sort}|${filters?.dateFrom}|${filters?.dateTo}`;

  // Reset and fetch when filters change
  useEffect(() => {
    // filterKey triggers this effect when any filter value changes
    void filterKey;
    setClips([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1, false);
  }, [filterKey, fetchPage]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchPage(page + 1, true);
    }
  }, [isLoadingMore, hasMore, page, fetchPage]);

  const refetch = useCallback(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteClip(id);
      setClips((prev) => prev.filter((c) => c.id !== id));
    } catch {
      /* silent */
    }
  }, []);

  const rename = useCallback(async (id: string, title: string) => {
    try {
      await renameClip(id, title);
      setClips((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    } catch {
      /* silent */
    }
  }, []);

  return {
    clips,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refetch,
    remove,
    rename,
  };
}
