import type { ExplorePost, FeedResponse } from '@/features/explore/types';
import { env } from '@/lib/env';

export async function getPublicFeed(
  tab: 'foryou' | 'trending' = 'trending',
  cursor?: string,
): Promise<FeedResponse> {
  const params = new URLSearchParams({ tab, limit: '20' });
  if (cursor) params.set('cursor', cursor);
  const res = await fetch(`${env.BACKEND_URL}/api/explore/feed?${params}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return { posts: [] };
  return res.json();
}

export async function getPublicPost(
  id: string,
): Promise<{ post: ExplorePost | null }> {
  const res = await fetch(`${env.BACKEND_URL}/api/explore/posts/${id}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return { post: null };
  const data = await res.json();
  return { post: data.post };
}

export async function getPublicThread(
  id: string,
): Promise<{ posts: ExplorePost[] }> {
  const res = await fetch(`${env.BACKEND_URL}/api/explore/posts/${id}/thread`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return { posts: [] };
  return res.json();
}
