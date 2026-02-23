import { apiFetch } from '@/lib/fetch';
import type { WatchlistItem } from './types';

/**
 * Fetch the user's watchlist.
 */
export async function getWatchlist(): Promise<WatchlistItem[]> {
  const data = await apiFetch<{ items: WatchlistItem[] }>(
    '/api/user/watchlist',
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
}

/**
 * Remove an item from the watchlist.
 */
export async function removeFromWatchlist(contentId: string): Promise<void> {
  await apiFetch(`/api/user/watchlist/${contentId}`, {
    method: 'DELETE',
  });
}

/**
 * Check if an item is in the watchlist.
 */
export async function checkInWatchlist(contentId: string): Promise<boolean> {
  // Since there is no specific "check" endpoint, we fetch the watchlist and check
  // In a real app, you might have an optimize endpoint, but for now this works safely
  const items = await getWatchlist();
  return items.some((item) => item.contentId === contentId);
}
