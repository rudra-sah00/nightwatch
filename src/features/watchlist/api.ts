import { trackEvent } from '@/lib/analytics';
import { apiFetch } from '@/lib/fetch';
import type { WatchlistItem } from './types';

/**
 * Fetch the user's watchlist.
 */
export async function getWatchlist(
  _providerId?: string,
  signal?: AbortSignal,
): Promise<WatchlistItem[]> {
  const data = await apiFetch<{ items: WatchlistItem[] }>(
    '/api/user/watchlist',
    { signal },
  );
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
}): Promise<void> {
  await apiFetch('/api/user/watchlist', {
    method: 'POST',
    body: JSON.stringify(item),
  });
  trackEvent('watchlist_add', {
    content_id: item.contentId,
    title: item.title,
  });
}

/**
 * Remove an item from the watchlist.
 */
export async function removeFromWatchlist(contentId: string): Promise<void> {
  const params = new URLSearchParams({ id: contentId });
  await apiFetch(`/api/user/watchlist?${params}`, {
    method: 'DELETE',
  });
  trackEvent('watchlist_remove', { content_id: contentId });
}

/**
 * Check if an item is in the watchlist.
 */
export async function checkInWatchlist(contentId: string): Promise<boolean> {
  const params = new URLSearchParams({ id: contentId });
  const { inWatchlist } = await apiFetch<{ inWatchlist: boolean }>(
    `/api/user/watchlist/status?${params}`,
  );
  return inWatchlist;
}
