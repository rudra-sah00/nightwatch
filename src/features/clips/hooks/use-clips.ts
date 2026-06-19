'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { reportError, trackEvent } from '@/lib/analytics';
import { type ClipFilters, deleteClip, getClips, renameClip } from '../api';

/**
 * Manages fetching, pagination, filtering, deletion, and renaming of user clips.
 * Uses TanStack Query infinite queries for pagination.
 */
export function useClips(filters?: ClipFilters) {
  const queryClient = useQueryClient();
  const filterKey = `${filters?.search}|${filters?.sort}|${filters?.dateFrom}|${filters?.dateTo}`;

  const {
    data,
    isLoading,
    isFetchingNextPage: isLoadingMore,
    hasNextPage: hasMore,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['clips', filterKey],
    queryFn: ({ pageParam = 1 }) => getClips(pageParam, 12, filters),
    getNextPageParam: (lastPage, allPages) =>
      allPages.length < lastPage.totalPages ? allPages.length + 1 : undefined,
    initialPageParam: 1,
  });

  const clips = useMemo(
    () => data?.pages.flatMap((p) => p.clips) ?? [],
    [data],
  );

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) fetchNextPage();
  }, [isLoadingMore, hasMore, fetchNextPage]);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['clips', filterKey] });
  }, [queryClient, filterKey]);

  const removeMutation = useMutation({
    mutationFn: deleteClip,
    onSuccess: (_, clipId) => {
      trackEvent('clip_delete', { clip_id: clipId });
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
    onError: () => reportError('[Clips] Operation failed'),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      renameClip(id, title),
    onSuccess: (_, { id }) => {
      trackEvent('clip_rename', { clip_id: id });
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
    onError: () => reportError('[Clips] Operation failed'),
  });

  const remove = useCallback(
    (id: string) => removeMutation.mutate(id),
    [removeMutation],
  );

  const rename = useCallback(
    (id: string, title: string) => renameMutation.mutate({ id, title }),
    [renameMutation],
  );

  return {
    clips,
    isLoading,
    isLoadingMore,
    hasMore: hasMore ?? false,
    loadMore,
    refetch,
    remove,
    rename,
  };
}
