import { useQuery } from '@tanstack/react-query';
import { fetchChannels } from '../api';

/**
 * Fetches and manages a paginated list of live TV channels.
 *
 * @param page - Page number (default `1`).
 * @param limit - Items per page (default `30`).
 * @param search - Optional search query to filter channels.
 * @returns Channel list, pagination metadata, loading/error states, and a `refresh` function.
 */
export function useChannels(page = 1, limit = 30, search = '') {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['live', 'tv-channels', page, limit, search],
    queryFn: () => fetchChannels(page, limit, search),
  });
  return {
    channels: data?.channels || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
    page,
    isLoading,
    error: error as Error | null,
    refresh: refetch,
  };
}
