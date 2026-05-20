'use client';

import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  fetchContinueWatching as apiFetchContinueWatching,
  deleteWatchProgress,
  getCachedContinueWatching,
} from '../api';
import type { WatchProgress } from '../types';

/** Options for {@link useContinueWatching}. */
interface UseContinueWatchingOptions {
  onSelectContent?: (contentId: string) => void;
  onLoadComplete?: (itemCount: number) => void;
}

/**
 * Fetches and manages the user's "continue watching" progress list.
 *
 * Handles caching, optimistic removal via `useOptimistic`,
 * window-focus refetching, and cache invalidation on unmount.
 *
 * @returns Items, optimistic items, loading state, select and remove handlers.
 */
export function useContinueWatching({
  onSelectContent,
  onLoadComplete,
}: UseContinueWatchingOptions) {
  const t = useTranslations('watch.continueWatching');
  const [items, setItems] = useState<WatchProgress[]>([]);
  const [optimisticItems, addOptimisticItem] = React.useOptimistic(
    items,
    (state, idToRemove: string) =>
      state.filter((item) => item.id !== idToRemove),
  );
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchRef = useRef<{ time: number }>({
    time: 0,
  });
  // Track current items in a ref so fetchItems can report count without
  // needing items in its dependency array.
  const itemsRef = useRef<WatchProgress[]>([]);

  const fetchItems = useCallback(
    async (force = false) => {
      const now = Date.now();

      // Cache hit (only valid when not forced)
      if (!force) {
        const cached = getCachedContinueWatching();
        if (cached) {
          setItems(cached);
          itemsRef.current = cached;
          setIsLoading(false);
          onLoadComplete?.(cached.length);
          return;
        }
      }

      // Throttle: skip duplicate fetches within 1 second
      if (now - lastFetchRef.current.time < 1000) {
        setIsLoading(false);
        onLoadComplete?.(itemsRef.current.length);
        return;
      }
      lastFetchRef.current = { time: now };

      try {
        const fetchedItems = await apiFetchContinueWatching(10);
        setIsLoading(false);
        if (fetchedItems) {
          setItems(fetchedItems);
          itemsRef.current = fetchedItems;
          onLoadComplete?.(fetchedItems.length);
        } else {
          onLoadComplete?.(0);
        }
      } catch (_err) {
        setIsLoading(false);
        onLoadComplete?.(0);
      }
    },
    [onLoadComplete],
  );

  // Let the 30s TTL handle cache staleness — no need to invalidate on unmount.
  // This prevents redundant re-fetches when navigating away briefly (e.g. /live → /home).

  useEffect(() => {
    fetchItems(true);

    const handleFocus = () => {
      fetchItems(true);
    };
    window.addEventListener('focus', handleFocus, { passive: true });
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchItems]);

  const handleSelect = useCallback(
    (item: WatchProgress) => {
      if (onSelectContent) onSelectContent(item.contentId);
    },
    [onSelectContent],
  );

  const handleRemove = useCallback(
    (item: WatchProgress, e: React.BaseSyntheticEvent) => {
      e.stopPropagation();
      React.startTransition(async () => {
        addOptimisticItem(item.id);
        const success = await deleteWatchProgress(item.id);
        if (success) {
          setItems((prev) => prev.filter((i) => i.id !== item.id));
        } else {
          toast.error(t('failedToRemove'));
        }
      });
    },
    [addOptimisticItem, t],
  );

  return {
    items,
    optimisticItems,
    isLoading,
    handleSelect,
    handleRemove,
  };
}
