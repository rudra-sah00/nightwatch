import { apiFetch } from '@/lib/fetch';
import type { DiscoverSong } from './types';

export type { DiscoverSong } from './types';

export async function getDiscoverFeed(limit = 20): Promise<DiscoverSong[]> {
  return apiFetch<DiscoverSong[]>(`/api/music/discover/feed?limit=${limit}`);
}

export async function swipeSong(
  songId: string,
  action: 'like' | 'dislike',
  meta?: { artist?: string; language?: string; timeOnCard?: number },
) {
  return apiFetch('/api/music/discover/swipe', {
    method: 'POST',
    body: JSON.stringify({ songId, action, ...meta }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function recordListen(songId: string) {
  return apiFetch('/api/music/discover/listen', {
    method: 'POST',
    body: JSON.stringify({ songId }),
    headers: { 'Content-Type': 'application/json' },
  });
}
