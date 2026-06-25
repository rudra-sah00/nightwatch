import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExplorePost } from '@/features/explore/types';

const mockFetchPublicPosts = vi.fn();
const mockSubscribeToNewPosts = vi.fn((_cb?: unknown) => vi.fn());

vi.mock('@/features/explore/firestore', () => ({
  fetchPublicPosts: (...args: unknown[]) => mockFetchPublicPosts(...args),
  subscribeToNewPosts: (cb: unknown, _cb2?: unknown) =>
    mockSubscribeToNewPosts(cb),
}));

import { useExploreFeed } from '@/features/explore/hooks/use-explore-feed';

const makePost = (id: string): ExplorePost => ({
  id,
  authorId: 'u1',
  authorName: 'User',
  authorUsername: 'user',
  authorPhoto: '',
  content: `Post ${id}`,
  type: 'text',
  tags: [],
  parentId: null,
  threadRootId: null,
  stats: { replies: 0, reposts: 0, reactions: 0 },
  reactionsMap: {},
  visibility: 'public',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('useExploreFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPublicPosts.mockResolvedValue({
      posts: [makePost('1'), makePost('2')],
      lastDoc: null,
    });
  });

  it('loads initial posts', async () => {
    const { result } = renderHook(() => useExploreFeed());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.posts).toHaveLength(2);
    expect(mockFetchPublicPosts).toHaveBeenCalledWith(20);
  });

  it('loadMore appends posts', async () => {
    mockFetchPublicPosts.mockResolvedValueOnce({
      posts: Array.from({ length: 20 }, (_, i) => makePost(`i${i}`)),
      lastDoc: 'doc',
    });
    const { result } = renderHook(() => useExploreFeed());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockFetchPublicPosts.mockResolvedValueOnce({
      posts: [makePost('next1')],
      lastDoc: null,
    });
    await act(async () => {
      await result.current.loadMore();
    });
    expect(result.current.posts).toHaveLength(21);
    expect(result.current.hasMore).toBe(false);
  });

  it('prependPost adds to front without duplicates', async () => {
    const { result } = renderHook(() => useExploreFeed());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.prependPost(makePost('new'));
    });
    expect(result.current.posts[0].id).toBe('new');

    act(() => {
      result.current.prependPost(makePost('new'));
    });
    expect(result.current.posts.filter((p) => p.id === 'new')).toHaveLength(1);
  });

  it('removePost removes by id', async () => {
    const { result } = renderHook(() => useExploreFeed());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.removePost('1');
    });
    expect(result.current.posts.find((p) => p.id === '1')).toBeUndefined();
  });

  it('updatePost transforms matching post', async () => {
    const { result } = renderHook(() => useExploreFeed());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.updatePost('1', (p) => ({ ...p, content: 'updated' }));
    });
    expect(result.current.posts.find((p) => p.id === '1')?.content).toBe(
      'updated',
    );
  });
});
