import { useQuery } from '@tanstack/react-query';
import { fetchSports } from '../api';

/** A sport category available for livestream filtering. */
export interface Sport {
  /** Unique sport identifier (e.g. `"basketball"`, `"all_channels"`). */
  id: string;
  /** Human-readable display label. */
  label: string;
}

/**
 * Fetches the list of available sport categories from the API.
 *
 * Always includes a hardcoded "All Channels" entry as the first item.
 *
 * @returns Array of sports and a loading flag.
 */
export function useSports() {
  const {
    data: sports = [{ id: 'all_channels', label: 'All Channels' }],
    isLoading,
  } = useQuery({
    queryKey: ['live', 'sports'],
    queryFn: async () => {
      const dynamic = await fetchSports();
      return dynamic.length > 0
        ? [{ id: 'all_channels', label: 'All Channels' }, ...dynamic]
        : [{ id: 'all_channels', label: 'All Channels' }];
    },
  });
  return { sports, isLoading };
}
