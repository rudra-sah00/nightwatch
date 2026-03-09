'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useServer } from '@/providers/server-provider';
import { useSocket } from '@/providers/socket-provider';
import {
  fetchContinueWatching as apiFetchContinueWatching,
  deleteWatchProgress,
  getCachedContinueWatching,
  invalidateContinueWatchingCache,
} from '../api';
import type { WatchProgress } from '../types';

interface UseContinueWatchingOptions {
  onSelectContent?: (contentId: string) => void;
  onLoadComplete?: (itemCount: number) => void;
}

export function useContinueWatching({
  onSelectContent,
  onLoadComplete,
}: UseContinueWatchingOptions) {
  const { activeServer } = useServer();
  const [items, setItems] = useState<WatchProgress[]>([]);
  const [optimisticItems, addOptimisticItem] = React.useOptimistic(
    items,
    (state, idToRemove: string) =>
      state.filter((item) => item.id !== idToRemove),
  );
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchRef = useRef<{ time: number; server: string }>({
    time: 0,
    server: '',
  });
  // Track current items in a ref so fetchItems can report count without
  // needing items in its dependency array (would cause re-renders on every change).
  const itemsRef = useRef<WatchProgress[]>([]);
  const fetchingForServerRef = useRef<string>('');
  const { socket, isConnected } = useSocket();

  const fetchItems = useCallback(
    (force = false) => {
      const now = Date.now();
      const serverChanged = lastFetchRef.current.server !== activeServer;

      // Cache hit (only valid when not forced and server hasn't changed)
      if (!force && !serverChanged) {
        const cached = getCachedContinueWatching(activeServer);
        if (cached) {
          setItems(cached);
          itemsRef.current = cached;
          setIsLoading(false);
          onLoadComplete?.(cached.length);
          return;
        }
      }

      // Throttle: skip duplicate fetches within 1 second, but always notify parent
      if (!serverChanged && now - lastFetchRef.current.time < 1000) {
        setIsLoading(false);
        onLoadComplete?.(itemsRef.current.length);
        return;
      }
      lastFetchRef.current = { time: now, server: activeServer };

      if (!socket?.connected) {
        setIsLoading(false);
        onLoadComplete?.(0);
        return;
      }

      // Clear stale items and show skeleton immediately when server changes
      if (serverChanged) {
        setItems([]);
        itemsRef.current = [];
        setIsLoading(true);
      }

      const fetchingServer = activeServer;
      fetchingForServerRef.current = fetchingServer;

      apiFetchContinueWatching(10, activeServer, (fetchedItems) => {
        // Discard stale response if server changed while request was in flight
        if (fetchingForServerRef.current !== fetchingServer) return;
        setIsLoading(false);
        if (fetchedItems) {
          setItems(fetchedItems);
          itemsRef.current = fetchedItems;
          onLoadComplete?.(fetchedItems.length);
        } else {
          onLoadComplete?.(0);
        }
      });
    },
    [onLoadComplete, socket, activeServer],
  );

  // Invalidate cache on unmount so navigating away then back always triggers a fresh fetch.
  useEffect(() => {
    return () => {
      invalidateContinueWatchingCache();
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      // Force-bypass the cache on every mount so navigation-back shows fresh data.
      fetchItems(true);
    } else {
      setIsLoading(false);
      onLoadComplete?.(0);
    }
    const handleFocus = () => {
      if (socket?.connected) fetchItems(true);
    };
    window.addEventListener('focus', handleFocus, { passive: true });
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchItems, isConnected, socket, onLoadComplete]);

  const handleSelect = useCallback(
    (item: WatchProgress) => {
      if (onSelectContent) onSelectContent(item.contentId);
    },
    [onSelectContent],
  );

  const handleRemove = useCallback(
    (item: WatchProgress, e: React.MouseEvent) => {
      e.stopPropagation();
      React.startTransition(() => {
        addOptimisticItem(item.id);
        deleteWatchProgress(item.id, activeServer, (success) => {
          if (success) {
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          } else {
            toast.error('Failed to remove from list');
          }
        });
      });
    },
    [addOptimisticItem, activeServer],
  );

  return {
    items,
    optimisticItems,
    isLoading,
    handleSelect,
    handleRemove,
  };
}
