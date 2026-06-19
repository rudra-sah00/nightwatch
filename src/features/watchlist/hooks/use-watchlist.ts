'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getWatchlist, removeFromWatchlist } from '@/features/watchlist/api';
import type { WatchlistItem } from '@/features/watchlist/types';

/**
 * Hook for managing the watchlist page state.
 * Uses TanStack Query for caching + optimistic removal via useMutation.
 */
export function useWatchlist() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: watchlist = [], isLoading: loading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => getWatchlist(),
  });

  const removeMutation = useMutation({
    mutationFn: removeFromWatchlist,
    onMutate: async (contentId) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist'] });
      const previous = queryClient.getQueryData<WatchlistItem[]>(['watchlist']);
      queryClient.setQueryData<WatchlistItem[]>(['watchlist'], (old) =>
        old?.filter((item) => item.contentId !== contentId),
      );
      return { previous };
    },
    onError: (_err, _contentId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['watchlist'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const removeItem = (contentId: string) => {
    removeMutation.mutate(contentId);
  };

  const isEmpty = !loading && watchlist.length === 0;

  return {
    watchlist,
    loading,
    selectedId,
    setSelectedId,
    isEmpty,
    removeItem,
  };
}
