import { trackEvent } from '@/lib/analytics';
import { apiFetch } from '@/lib/fetch';
import type {
  ExplorePost,
  FeedResponse,
  FeedTab,
  PostTag,
  PostVisibility,
} from './types';

export interface CreatePostParams {
  content: string;
  type?: ExplorePost['type'];
  tags?: PostTag[];
  media?: { urls: string[]; type: 'image' | 'video' };
  poll?: { options: { text: string }[]; durationHours?: number };
  watchParty?: { roomId: string; contentTitle: string; contentImage?: string };
  clipId?: string;
  repostOf?: string;
  parentId?: string;
  visibility?: PostVisibility;
}

export async function createPost(
  params: CreatePostParams,
): Promise<ExplorePost> {
  const { post } = await apiFetch<{ post: ExplorePost }>('/api/explore/posts', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return post;
}

export async function getExploreFeed(
  tab: FeedTab,
  cursor?: string,
  limit = 20,
  options?: RequestInit,
): Promise<FeedResponse> {
  const params = new URLSearchParams({ tab, limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  return apiFetch<FeedResponse>(`/api/explore/feed?${params}`, options);
}

export async function getExplorePost(
  id: string,
  options?: RequestInit,
): Promise<{ post: ExplorePost; userReaction: string | null }> {
  return apiFetch<{ post: ExplorePost; userReaction: string | null }>(
    `/api/explore/posts/${id}`,
    options,
  );
}

export async function getPostThread(
  id: string,
  options?: RequestInit,
): Promise<ExplorePost[]> {
  const { posts } = await apiFetch<{ posts: ExplorePost[] }>(
    `/api/explore/posts/${id}/thread`,
    options,
  );
  return posts;
}

export async function deletePost(id: string): Promise<void> {
  await apiFetch(`/api/explore/posts/${id}`, { method: 'DELETE' });
  trackEvent('explore_post_delete');
}

export async function editPost(
  id: string,
  content: string,
): Promise<ExplorePost> {
  const { post } = await apiFetch<{ post: ExplorePost }>(
    `/api/explore/posts/${id}`,
    { method: 'PATCH', body: JSON.stringify({ content }) },
  );
  trackEvent('explore_post_edit');
  return post;
}

export async function reactToPost(id: string, emoji: string): Promise<void> {
  await apiFetch(`/api/explore/posts/${id}/react`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });
  trackEvent('explore_react', { emoji });
}

export async function removeReaction(id: string): Promise<void> {
  await apiFetch(`/api/explore/posts/${id}/react`, { method: 'DELETE' });
}

export async function voteOnPoll(
  postId: string,
  optionId: string,
): Promise<void> {
  await apiFetch(`/api/explore/posts/${postId}/poll/vote`, {
    method: 'POST',
    body: JSON.stringify({ optionId }),
  });
}

export async function uploadExploreMedia(files: File[]): Promise<string[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  const { urls } = await apiFetch<{ urls: string[] }>('/api/explore/upload', {
    method: 'POST',
    body: formData,
    headers: {}, // Let browser set content-type with boundary
  });
  return urls;
}

export async function repostPost(postId: string): Promise<ExplorePost> {
  return createPost({ content: '', type: 'text', repostOf: postId });
}

export interface LinkPreview {
  title: string;
  description: string;
  image: string;
  siteName: string;
  url: string;
}

export async function fetchLinkPreview(
  url: string,
): Promise<LinkPreview | null> {
  try {
    return await apiFetch<LinkPreview>(
      `/api/explore/link-preview?url=${encodeURIComponent(url)}`,
    );
  } catch {
    return null;
  }
}

export interface GifResult {
  id: string;
  title: string;
  preview: string;
  url: string;
}

export async function searchGifs(query?: string): Promise<GifResult[]> {
  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!apiKey) return [];
  const endpoint = query
    ? `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(query)}&api_key=${apiKey}&limit=20&rating=g`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=g`;
  try {
    const res = await fetch(endpoint);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map(
      (r: {
        id: string;
        title: string;
        images: {
          fixed_width_small: { url: string };
          fixed_width: { url: string };
        };
      }) => ({
        id: r.id,
        title: r.title || '',
        preview: r.images?.fixed_width_small?.url || '',
        url: r.images?.fixed_width?.url || '',
      }),
    );
  } catch {
    return [];
  }
}

export async function getPostReplies(postId: string): Promise<ExplorePost[]> {
  const { replies } = await apiFetch<{ replies: ExplorePost[] }>(
    `/api/explore/posts/${postId}/replies`,
  );
  return replies;
}

export async function recordPostView(postId: string): Promise<void> {
  await apiFetch(`/api/explore/posts/${postId}/view`, { method: 'POST' });
}

export async function getViewCounts(
  postIds: string[],
): Promise<Record<string, number>> {
  if (!postIds.length) return {};
  const { views } = await apiFetch<{ views: Record<string, number> }>(
    `/api/explore/views?ids=${postIds.join(',')}`,
  );
  return views;
}
