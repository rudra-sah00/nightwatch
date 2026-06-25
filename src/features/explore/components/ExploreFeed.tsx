'use client';

import { Compass } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getViewCounts } from '@/features/explore/api';
import { useExploreFeed } from '@/features/explore/hooks/use-explore-feed';
import { usePostActions } from '@/features/explore/hooks/use-post-actions';
import type { ExplorePost } from '@/features/explore/types';
import { apiFetch } from '@/lib/fetch';
import { PostCard } from './PostCard';
import { PostCardErrorBoundary } from './PostCardErrorBoundary';
import { ThreadView } from './ThreadView';

export function ExploreFeed({
  onThreadOpen,
}: {
  onThreadOpen?: (open: boolean) => void;
}) {
  const {
    posts,
    isLoading,
    hasMore,
    loadMore,
    prependPost,
    removePost,
    updatePost,
  } = useExploreFeed();
  const {
    handleReact,
    handleRemoveReaction,
    handleDelete,
    handleEdit,
    handleRepost,
    handlePollVote,
  } = usePostActions({ updatePost, removePost, prependPost });
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const viewCountsRef = useRef(viewCounts);
  viewCountsRef.current = viewCounts;
  const searchParams = useSearchParams();

  // Batch fetch view counts when posts change
  useEffect(() => {
    if (!posts.length) return;
    const ids = posts
      .map((p) => p.id)
      .filter((id) => !(id in viewCountsRef.current));
    if (!ids.length) return;
    getViewCounts(ids)
      .then((counts) => {
        setViewCounts((prev) => ({ ...prev, ...counts }));
      })
      .catch(() => {});
  }, [posts]);

  // Auto-open thread from notification deep-link (?thread=postId)
  useEffect(() => {
    const threadParam = searchParams.get('thread');
    if (threadParam) {
      setOpenThread(threadParam);
    }
  }, [searchParams]);

  const handleBlock = useCallback(
    async (userId: string) => {
      // Remove all posts by this user from the feed immediately
      for (const p of posts.filter((p) => p.authorId === userId)) {
        removePost(p.id);
      }
      // Call backend to block
      apiFetch('/api/friends/block', {
        method: 'POST',
        body: JSON.stringify({ targetId: userId }),
      }).catch(() => {
        /* fire-and-forget */
      });
    },
    [posts, removePost],
  );

  useEffect(() => {
    onThreadOpen?.(!!openThread);
  }, [openThread, onThreadOpen]);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading) loadMore();
      },
      { root: feedRef.current, rootMargin: '400px' },
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoading, loadMore]);

  const _handlePostCreated = useCallback(
    (post: ExplorePost) => prependPost(post),
    [prependPost],
  );

  return (
    <div className="flex flex-col h-full relative">
      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto" data-explore-feed>
        {posts.map((post) => (
          <PostCardErrorBoundary key={post.id} postId={post.id}>
            <PostCard
              post={post}
              viewCount={viewCounts[post.id]}
              onReact={handleReact}
              onRemoveReaction={handleRemoveReaction}
              onRepost={handleRepost}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onBlock={handleBlock}
              onPollVote={handlePollVote}
              onOpen={setOpenThread}
            />
          </PostCardErrorBoundary>
        ))}

        {isLoading && posts.length === 0 && (
          <div className="space-y-4 p-4">
            {['s0', 's1', 's2', 's3'].map((key) => (
              <div
                key={key}
                className="space-y-3 pb-4 border-b border-border/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-2.5 w-16 bg-muted animate-pulse rounded" />
                  </div>
                </div>
                <div className="space-y-2 pl-[52px]">
                  <div className="h-3 w-full bg-muted animate-pulse rounded" />
                  <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                </div>
                <div className="flex gap-4 pl-[52px]">
                  <div className="h-6 w-12 bg-muted animate-pulse rounded-full" />
                  <div className="h-6 w-12 bg-muted animate-pulse rounded-full" />
                  <div className="h-6 w-12 bg-muted animate-pulse rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isLoading && posts.length > 0 && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-foreground/40">
            <Compass className="w-12 h-12 mb-3" />
            <p className="font-headline font-bold">No posts yet</p>
            <p className="text-sm mt-1">Be the first to share something!</p>
          </div>
        )}

        <div ref={sentinelRef} className="h-1" />
      </div>

      {/* Thread overlay */}
      {openThread && (
        <ThreadView postId={openThread} onBack={() => setOpenThread(null)} />
      )}
    </div>
  );
}
