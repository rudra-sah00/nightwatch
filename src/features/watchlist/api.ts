import { createTTLCache } from '@/lib/cache';
import { apiFetch } from '@/lib/fetch';
import type { WatchlistItem } from './types';

// Cache watchlist status checks (2 min TTL) to avoid redundant API calls
// when opening the same content detail modal multiple times.
const watchlistStatusCache = createTTLCache<boolean>(2 * 60 * 1000, 50);

/**
 * Fetch the user's watchlist.
 */
export async function getWatchlist(
  providerId?: string,
  signal?: AbortSignal,
): Promise<WatchlistItem[]> {
  const url = providerId
    ? `/api/user/watchlist?providerId=${providerId}`
    : '/api/user/watchlist';
  const data = await apiFetch<{ items: WatchlistItem[] }>(url, { signal });
  return data.items || [];
}

/**
 * Add an item to the watchlist.
 */
export async function addToWatchlist(item: {
  contentId: string;
  contentType: 'Movie' | 'Series';
  title: string;
  posterUrl?: string;
  providerId?: 's1' | 's1';
}): Promise<void> {
  await apiFetch('/api/user/watchlist', {
    method: 'POST',
    body: JSON.stringify(item),
  });
  watchlistStatusCache.set(item.contentId, true);
}

/**
 * Remove an item from the watchlist.
 */
export async function removeFromWatchlist(
  contentId: string,
  providerId?: string,
): Promise<void> {
  const params = new URLSearchParams({ id: contentId });
  if (providerId) params.set('providerId', providerId);
  await apiFetch(`/api/user/watchlist?${params}`, {
    method: 'DELETE',
  });
  watchlistStatusCache.set(contentId, false);
}

/**
 * Check if an item is in the watchlist.
 */
export async function checkInWatchlist(
  contentId: string,
  providerId?: string,
): Promise<boolean> {
  const cached = watchlistStatusCache.get(contentId);
  if (cached !== undefined) return cached;

  const pId = providerId || contentId.split(':')[0] || 's1';
  const params = new URLSearchParams({ id: contentId, providerId: pId });
  const { inWatchlist } = await apiFetch<{ inWatchlist: boolean }>(
    `/api/user/watchlist/status?${params}`,
  );
  watchlistStatusCache.set(contentId, inWatchlist);
  return inWatchlist;
}
