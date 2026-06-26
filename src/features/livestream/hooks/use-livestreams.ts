import { useQuery } from '@tanstack/react-query';
import { fetchLiveMatchDetail, fetchLivestreamSchedule } from '../api';

/**
 * Fetches and manages the livestream schedule for a given sport type.
 * Uses TanStack Query for caching.
 */
export function useLivestreams(sportType = 'basketball') {
  const {
    data: schedule = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['live', 'channels', sportType],
    queryFn: async () => {
      const data = await fetchLivestreamSchedule(sportType, 0, 3);
      const unique = Array.from(
        new Map(data.map((item) => [item.id, item])).values(),
      );
      return unique.toSorted((a, b) => a.startTime - b.startTime);
    },
  });

  return {
    schedule,
    isLoading,
    error: error as Error | null,
    refresh: refetch,
  };
}

/**
 * Fetches and polls a single live match by ID.
 * Uses TanStack Query with a conditional refetchInterval for live matches.
 */
export function useLiveMatch(id: string | null) {
  const {
    data: match = null,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['live', 'match', id],
    queryFn: () => fetchLiveMatchDetail(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (
        data &&
        !data.playPath &&
        (data.status === 'MatchIng' || data.status === 'MatchNotStart')
      ) {
        return 15_000;
      }
      return false;
    },
  });

  return {
    match,
    isLoading,
    error: error as Error | null,
  };
}
