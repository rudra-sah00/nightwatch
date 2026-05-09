import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchIptvCategories,
  fetchIptvChannels,
  type IptvChannelsResponse,
} from '../api';

export function useIptvChannels(
  page = 1,
  limit = 30,
  search = '',
  category = '',
) {
  const [data, setData] = useState<IptvChannelsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (!hasDataRef.current) setIsLoading(true);
      setError(null);
      const res = await fetchIptvChannels(
        page,
        limit,
        search,
        category,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setData(res);
      hasDataRef.current = true;
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [page, limit, search, category]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  return {
    channels: data?.channels || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
    page,
    isLoading,
    error,
    refresh: load,
  };
}

export function useIptvCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchIptvCategories(controller.signal)
      .then((cats) => {
        if (!controller.signal.aborted) setCategories(cats);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  return { categories, isLoading };
}
