import { apiFetch } from '@/lib/fetch';

export interface DiscoverSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string;
  duration: number;
  language: string;
  year: number;
  seed?: string;
  features?: {
    bpm: number;
    energy: number;
    danceability: number;
    valence: number;
  };
}

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

export async function getLikedSongs(limit = 30, cursor?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  return apiFetch<{ songs: DiscoverSong[]; nextCursor: string | null }>(
    `/api/music/discover/liked?${params}`,
  );
}

export async function recordListen(songId: string) {
  return apiFetch('/api/music/discover/listen', {
    method: 'POST',
    body: JSON.stringify({ songId }),
    headers: { 'Content-Type': 'application/json' },
  });
}
