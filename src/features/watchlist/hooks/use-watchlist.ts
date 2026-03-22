'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getWatchlist } from '@/features/watchlist/api';
import type { WatchlistItem } from '@/features/watchlist/types';
import { useServer } from '@/providers/server-provider';

/**
 * Hook for managing the watchlist page state.
 * Moved from app/ layer to features/ layer for better organization.
 */
export function useWatchlist() {
  const { activeServer, serverLabel } = useServer();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Cancels in-flight watchlist requests when the server changes or the
  // component unmounts (navigating away) so stale responses don't arrive
  // after the user has already moved to another page.
  const abortRef = useRef<AbortController | null>(null);

  const fetchWatchlist = useCallback(async (providerId: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const items = await getWatchlist(providerId, controller.signal);
      if (controller.signal.aborted) return;
      setWatchlist(items);
    } catch {
      // Ignore — includes AbortError from intentional cancellation
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      fetchWatchlist(activeServer);
    }
    return () => {
      abortRef.current?.abort();
    };
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
