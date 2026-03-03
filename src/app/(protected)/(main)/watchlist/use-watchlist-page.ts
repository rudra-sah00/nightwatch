'use client';

import { useCallback, useEffect, useState } from 'react';
import { getWatchlist } from '@/features/watchlist/api';
import type { WatchlistItem } from '@/features/watchlist/types';
import { useServer } from '@/providers/server-provider';

export function useWatchlistPage() {
  const { activeServer, serverLabel } = useServer();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchWatchlist = useCallback(
    async (providerId: typeof activeServer) => {
      setLoading(true);
      try {
        const items = await getWatchlist(providerId);
        setWatchlist(items);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedId) {
      fetchWatchlist(activeServer);
    }
  }, [selectedId, activeServer, fetchWatchlist]);

  const isEmpty = !loading && watchlist.length === 0;

  return {
    activeServer,
    serverLabel,
    watchlist,
    loading,
    selectedId,
    setSelectedId,
    isEmpty,
  };
}
