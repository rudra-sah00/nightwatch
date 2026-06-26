'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExplorePost } from '@/features/explore/types';
import { env } from '@/lib/env';
import { PublicPostCard } from './PublicPostCard';

interface PublicExploreClientProps {
  initialPosts: ExplorePost[];
}

export function PublicExploreClient({
  initialPosts,
}: PublicExploreClientProps) {
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(
    initialPosts[initialPosts.length - 1]?.id,
  );
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || done || !cursor) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab: 'trending',
        limit: '20',
        cursor,
      });
      const res = await fetch(`${env.BACKEND_URL}/api/explore/feed?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.posts.length === 0) {
        setDone(true);
      } else {
        setPosts((prev) => [...prev, ...data.posts]);
        setCursor(data.nextCursor || undefined);
        if (!data.nextCursor) setDone(true);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, done, cursor]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <>
      <div className="space-y-4 mt-4">
        {posts.map((post) => (
          <PublicPostCard key={post.id} post={post} />
        ))}
      </div>
      {!done && (
        <div ref={sentinelRef} className="py-8 flex justify-center">
          {loading && (
            <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          )}
        </div>
      )}
    </>
  );
}
