'use client';

import type { DocumentSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchPublicPosts,
  subscribeToNewPosts,
} from '@/features/explore/firestore';
import type { ExplorePost } from '@/features/explore/types';

/**
 * Real-time explore feed using Firestore directly.
 * - Initial load + pagination via fetchPublicPosts
 * - Real-time new posts via onSnapshot listener
 * - Writes still go through backend REST API
 */
export function useExploreFeed() {
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<DocumentSnapshot | null>(null);
  const loadingRef = useRef(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetchPublicPosts(20)
      .then(({ posts: initial, lastDoc }) => {
        if (cancelled) return;
        setPosts(initial);
        lastDocRef.current = lastDoc;
        setHasMore(initial.length === 20);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Real-time listener for new posts
  useEffect(() => {
    const unsubscribe = subscribeToNewPosts(
      (newPost) => {
        setPosts((prev) => {
          if (prev.some((p) => p.id === newPost.id)) return prev;
          return [newPost, ...prev];
        });
      },
      (modifiedPost) => {
        setPosts((prev) =>
          prev.map((p) => (p.id === modifiedPost.id ? modifiedPost : p)),
        );
      },
    );
    return unsubscribe;
  }, []);

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setIsLoading(true);

    try {
      const { posts: more, lastDoc } = await fetchPublicPosts(
        20,
        lastDocRef.current || undefined,
      );
      lastDocRef.current = lastDoc;
      setHasMore(more.length === 20);
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const unique = more.filter((p) => !existingIds.has(p.id));
        return [...prev, ...unique];
      });
    } catch {
      // Non-fatal
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [hasMore]);

  // Prepend a new post (after creating via REST)
  const prependPost = useCallback((post: ExplorePost) => {
    setPosts((prev) => {
      if (prev.some((p) => p.id === post.id)) return prev;
      return [post, ...prev];
    });
  }, []);

  // Remove a post
  const removePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  // Update a post
  const updatePost = useCallback(
    (postId: string, updater: (p: ExplorePost) => ExplorePost) => {
      setPosts((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)));
    },
    [],
  );

  return {
    posts,
    isLoading,
    hasMore,
    loadMore,
    prependPost,
    removePost,
    updatePost,
  };
}
