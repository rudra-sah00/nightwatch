'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { deleteWatchProgress, getContinueWatching } from '../api';
import type { WatchProgress } from '../types';

/** Options for {@link useContinueWatching}. */
interface UseContinueWatchingOptions {
  onSelectContent?: (contentId: string) => void;
  onLoadComplete?: (itemCount: number) => void;
}

/**
 * Fetches and manages the user's "continue watching" progress list.
 * Uses TanStack Query for caching and useMutation for optimistic removal.
 */
export function useContinueWatching({
  onSelectContent,
  onLoadComplete,
}: UseContinueWatchingOptions) {
  const t = useTranslations('watch.continueWatching');
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['continue-watching'],
    queryFn: () => getContinueWatching(10),
    staleTime: 30 * 1000, // 30s — matches old TTL behavior
  });

  const [optimisticItems, addOptimisticItem] = React.useOptimistic(
    items,
    (state, idToRemove: string) =>
      state.filter((item) => item.id !== idToRemove),
  );

  // Report item count when data loads
  useEffect(() => {
    if (!isLoading) {
      onLoadComplete?.(items.length);
    }
  }, [isLoading, items.length, onLoadComplete]);

  const removeMutation = useMutation({
    mutationFn: deleteWatchProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['continue-watching'] });
    },
  });

  const handleSelect = useCallback(
    (item: WatchProgress) => {
      if (onSelectContent) onSelectContent(item.contentId);
    },
    [onSelectContent],
  );

  const handleRemove = useCallback(
    (item: WatchProgress, e: React.BaseSyntheticEvent) => {
      e.stopPropagation();
      React.startTransition(() => {
        addOptimisticItem(item.id);
        removeMutation.mutate(item.id, {
          onError: () => toast.error(t('failedToRemove')),
        });
      });
    },
    [addOptimisticItem, removeMutation, t],
  );

  return {
    items,
    optimisticItems,
    isLoading,
    handleSelect,
    handleRemove,
  };
}
