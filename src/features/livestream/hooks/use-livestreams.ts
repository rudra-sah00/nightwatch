import { useQuery } from '@tanstack/react-query';
import { fetchLiveMatchDetail } from '../api';

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
