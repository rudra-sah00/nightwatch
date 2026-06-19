'use client';

import { useQuery } from '@tanstack/react-query';
import { getShowDetails } from '../api';
import type { ShowDetails } from '../types';

/** Return value of the {@link useShowDetails} hook. */
interface UseShowDetailsReturn {
  show: ShowDetails | null;
  isLoading: boolean;
  setShow: (show: ShowDetails | null) => void;
}

/**
 * Hook that fetches show/movie details by content ID using TanStack Query.
 * Data is cached so re-opening the same modal is instant.
 */
export function useShowDetails(contentId: string): UseShowDetailsReturn {
  const { data, isLoading } = useQuery({
    queryKey: ['show', contentId],
    queryFn: () => getShowDetails(contentId),
    enabled: !!contentId,
  });

  return {
    show: data ?? null,
    isLoading,
    // setShow is kept for API compatibility but is now a no-op
    // (TanStack Query owns the data lifecycle)
    setShow: () => {},
  };
}
