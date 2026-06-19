import { useQuery } from '@tanstack/react-query';
import { fetchIptvCategories, fetchIptvChannels } from '../api';

export function useIptvChannels(
  page = 1,
  limit = 30,
  search = '',
  category = '',
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['iptv', 'channels', page, limit, search, category],
    queryFn: () => fetchIptvChannels(page, limit, search, category),
  });

  return {
    channels: data?.channels || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
    page,
    isLoading,
    error,
    refresh: refetch,
  };
}

export function useIptvCategories() {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['iptv', 'categories'],
    queryFn: () => fetchIptvCategories(),
  });

  return { categories, isLoading };
}
