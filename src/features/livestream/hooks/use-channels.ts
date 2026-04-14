import { useCallback, useEffect, useRef, useState } from 'react';
import { type ChannelsResponse, fetchChannels } from '../api';

export function useChannels(page = 1, limit = 30, search = '') {
  const [data, setData] = useState<ChannelsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasDataRef = useRef(false);

  const loadChannels = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Don't flash a loading skeleton if we just changed page/search slightly
      if (!hasDataRef.current) setIsLoading(true);
      setError(null);

      const res = await fetchChannels(page, limit, search, controller.signal);

      if (controller.signal.aborted) return;
      setData(res);
      hasDataRef.current = true;
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    loadChannels();
    return () => abortRef.current?.abort();
  }, [loadChannels]);

  return {
    channels: data?.channels || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
    page,
    isLoading,
    error,
    refresh: loadChannels,
  };
}
